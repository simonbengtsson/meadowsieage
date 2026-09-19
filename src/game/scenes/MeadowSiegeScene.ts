import Phaser from "phaser";

const WIDTH = 1280;
const HEIGHT = 720;
const ASSET_ROOT = `${import.meta.env.BASE_URL}assets`;
const TOP_UI_HEIGHT = 76;
const BOTTOM_UI_Y = 650;

type Team = "blue" | "red";
type UnitKind = "pawn" | "warrior";
type ResourceKind = "wood" | "gold" | "meat";
type GatherPhase = "to-resource" | "working" | "to-castle";

interface ResourceNode {
  kind: ResourceKind;
  amount: number;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

interface GatherTask {
  node: ResourceNode;
  phase: GatherPhase;
  readyAt: number;
  carried: number;
}

interface Unit {
  id: number;
  team: Team;
  kind: UnitKind;
  sprite: Phaser.GameObjects.Sprite;
  selectionRing: Phaser.GameObjects.Ellipse;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBack: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  lastAttackAt: number;
  destination?: Phaser.Math.Vector2;
  attackTarget?: Unit;
  gatherTask?: GatherTask;
  dead: boolean;
}

const RESOURCE_COLORS: Record<ResourceKind, string> = {
  wood: "#d8a85f",
  gold: "#ffe06a",
  meat: "#f7c2b4",
};

const RESOURCE_NAMES: Record<ResourceKind, string> = {
  wood: "Wood",
  gold: "Gold",
  meat: "Meat",
};

export class MeadowSiegeScene extends Phaser.Scene {
  private units: Unit[] = [];
  private resources: ResourceNode[] = [];
  private selected = new Set<Unit>();
  private nextUnitId = 1;
  private stocks: Record<ResourceKind, number> = {
    wood: 0,
    gold: 40,
    meat: 80,
  };

  private stockText!: Phaser.GameObjects.Text;
  private selectionText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private captureFill!: Phaser.GameObjects.Rectangle;
  private captureText!: Phaser.GameObjects.Text;
  private enemyCastle!: Phaser.GameObjects.Image;
  private captureProgress = 0;
  private gameOver = false;

  private readonly blueCastlePosition = new Phaser.Math.Vector2(142, 330);
  private readonly redCastlePosition = new Phaser.Math.Vector2(1138, 330);

  constructor() {
    super("meadow-siege");
  }

  preload() {
    this.load.spritesheet(
      "terrain",
      `${ASSET_ROOT}/terrain/tileset/tilemap-color1.png`,
      { frameWidth: 192, frameHeight: 192 },
    );

    this.load.image(
      "castle-blue",
      `${ASSET_ROOT}/buildings/blue-buildings/castle.png`,
    );
    this.load.image(
      "castle-red",
      `${ASSET_ROOT}/buildings/red-buildings/castle.png`,
    );
    this.load.image(
      "gold-node",
      `${ASSET_ROOT}/terrain/resources/gold/gold-resource/gold-resource.png`,
    );

    this.load.spritesheet(
      "tree",
      `${ASSET_ROOT}/terrain/resources/wood/trees/tree1.png`,
      { frameWidth: 192, frameHeight: 256 },
    );
    this.load.spritesheet(
      "sheep",
      `${ASSET_ROOT}/terrain/resources/meat/sheep/sheep-idle.png`,
      { frameWidth: 128, frameHeight: 128 },
    );

    const pawnSheets = [
      ["idle", "pawn-idle.png", 8],
      ["run", "pawn-run.png", 6],
      ["mine", "pawn-interact-pickaxe.png", 6],
      ["chop", "pawn-interact-axe.png", 6],
      ["butcher", "pawn-interact-knife.png", 4],
      ["carry-gold", "pawn-run-gold.png", 6],
      ["carry-wood", "pawn-run-wood.png", 6],
      ["carry-meat", "pawn-run-meat.png", 6],
    ] as const;

    for (const [key, file] of pawnSheets) {
      this.load.spritesheet(
        `blue-pawn-${key}`,
        `${ASSET_ROOT}/units/blue-units/pawn/${file}`,
        { frameWidth: 192, frameHeight: 192 },
      );
    }

    for (const team of ["blue", "red"] as const) {
      const root = `${ASSET_ROOT}/units/${team}-units/warrior`;
      this.load.spritesheet(`${team}-warrior-idle`, `${root}/warrior-idle.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
      this.load.spritesheet(`${team}-warrior-run`, `${root}/warrior-run.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
      this.load.spritesheet(
        `${team}-warrior-attack`,
        `${root}/warrior-attack1.png`,
        { frameWidth: 192, frameHeight: 192 },
      );
    }
  }

  create() {
    this.createAnimations();
    this.createWorld();
    this.createCastles();
    this.createResources();
    this.createStartingUnits();
    this.createInterface();
    this.configureInput();
    this.refreshInterface();
  }

  update(time: number, delta: number) {
    if (this.gameOver) return;

    for (const unit of this.units) {
      if (unit.dead) continue;

      if (unit.team === "red") {
        this.updateDefender(unit);
      }

      const nearbyEnemy = this.findNearestEnemy(unit, 64);
      if (nearbyEnemy) {
        unit.attackTarget = nearbyEnemy;
      }

      if (unit.attackTarget && !unit.attackTarget.dead) {
        const distance = Phaser.Math.Distance.Between(
          unit.sprite.x,
          unit.sprite.y,
          unit.attackTarget.sprite.x,
          unit.attackTarget.sprite.y,
        );

        if (distance <= 66) {
          this.attack(unit, unit.attackTarget, time);
          continue;
        }

        if (unit.team === "red" || !unit.gatherTask) {
          this.moveUnitToward(
            unit,
            unit.attackTarget.sprite.x,
            unit.attackTarget.sprite.y,
            delta,
          );
          continue;
        }
      } else {
        unit.attackTarget = undefined;
      }

      if (unit.gatherTask) {
        this.updateGathering(unit, time, delta);
      } else if (unit.destination) {
        const arrived = this.moveUnitToward(
          unit,
          unit.destination.x,
          unit.destination.y,
          delta,
        );
        if (arrived) {
          unit.destination = undefined;
          this.playUnitAnimation(unit, "idle");
        }
      } else {
        this.playUnitAnimation(unit, "idle");
      }

      this.updateUnitDecorations(unit);
    }

    this.updateCapture(delta);
    this.checkForDefeat();
  }

  private createAnimations() {
    const animation = (
      key: string,
      texture: string,
      end: number,
      frameRate: number,
    ) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end }),
        frameRate,
        repeat: -1,
      });
    };

    animation("tree-sway", "tree", 7, 6);
    animation("sheep-idle-animation", "sheep", 5, 5);
    animation("blue-pawn-idle-animation", "blue-pawn-idle", 7, 7);
    animation("blue-pawn-run-animation", "blue-pawn-run", 5, 10);
    animation("blue-pawn-mine-animation", "blue-pawn-mine", 5, 9);
    animation("blue-pawn-chop-animation", "blue-pawn-chop", 5, 9);
    animation("blue-pawn-butcher-animation", "blue-pawn-butcher", 3, 8);
    animation("blue-pawn-carry-gold-animation", "blue-pawn-carry-gold", 5, 10);
    animation("blue-pawn-carry-wood-animation", "blue-pawn-carry-wood", 5, 10);
    animation("blue-pawn-carry-meat-animation", "blue-pawn-carry-meat", 5, 10);

    for (const team of ["blue", "red"] as const) {
      animation(`${team}-warrior-idle-animation`, `${team}-warrior-idle`, 7, 7);
      animation(`${team}-warrior-run-animation`, `${team}-warrior-run`, 5, 10);
      animation(
        `${team}-warrior-attack-animation`,
        `${team}-warrior-attack`,
        3,
        9,
      );
    }
  }

  private createWorld() {
    this.cameras.main.setBackgroundColor("#243f2d");

    const graphics = this.add.graphics();
    graphics.fillStyle(0x78a94f);
    graphics.fillRoundedRect(16, TOP_UI_HEIGHT + 12, WIDTH - 32, 554, 28);
    graphics.lineStyle(5, 0xb9d26a, 0.45);
    graphics.strokeRoundedRect(18, TOP_UI_HEIGHT + 14, WIDTH - 36, 550, 26);

    graphics.fillStyle(0xd8bd7d, 0.28);
    graphics.fillEllipse(640, 344, 910, 150);
    graphics.fillStyle(0x315f40, 0.18);
    graphics.fillCircle(622, 154, 58);
    graphics.fillCircle(678, 547, 74);

    for (let x = 280; x <= 1000; x += 180) {
      this.add.image(x, 172 + (x % 360 === 0 ? 18 : 0), "terrain", 1).setScale(0.48);
      this.add.image(x + 70, 560 - (x % 360 === 0 ? 18 : 0), "terrain", 1).setScale(0.4);
    }

    this.add
      .text(640, 102, "THE FIVE MEADOWS", {
        color: "#476534",
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        fontStyle: "bold",
        letterSpacing: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0.75);
  }

  private createCastles() {
    this.add
      .ellipse(
        this.redCastlePosition.x,
        this.redCastlePosition.y + 8,
        264,
        180,
        0xf4d56a,
        0.08,
      )
      .setStrokeStyle(3, 0xffdf72, 0.65)
      .setDepth(2);

    this.add
      .image(this.blueCastlePosition.x, this.blueCastlePosition.y, "castle-blue")
      .setScale(0.72)
      .setDepth(5);

    this.enemyCastle = this.add
      .image(this.redCastlePosition.x, this.redCastlePosition.y, "castle-red")
      .setScale(0.72)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    this.enemyCastle.setData("castle", "red");

    this.add
      .text(this.blueCastlePosition.x, 458, "MEADOW KEEP", {
        color: "#eaf6cf",
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(7);

    this.add
      .text(this.redCastlePosition.x, 458, "REDSTONE KEEP", {
        color: "#ffe0d7",
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(7);

    this.add
      .rectangle(this.redCastlePosition.x, 486, 204, 18, 0x17212a, 0.9)
      .setStrokeStyle(2, 0xf4d56a, 0.65)
      .setDepth(7);
    this.captureFill = this.add
      .rectangle(this.redCastlePosition.x - 98, 486, 0, 12, 0xf4d56a)
      .setOrigin(0, 0.5)
      .setDepth(8);
    this.captureText = this.add
      .text(this.redCastlePosition.x, 511, "Defeat the guards", {
        color: "#fff3b7",
        fontFamily: "sans-serif",
        fontSize: "13px",
      })
      .setOrigin(0.5)
      .setDepth(8);
  }

  private createResources() {
    this.createResourceNode("wood", 355, 188, 120);
    this.createResourceNode("wood", 440, 542, 120);
    this.createResourceNode("gold", 530, 214, 120);
    this.createResourceNode("gold", 625, 537, 120);
    this.createResourceNode("meat", 348, 496, 120);
    this.createResourceNode("meat", 610, 166, 120);
  }

  private createResourceNode(
    kind: ResourceKind,
    x: number,
    y: number,
    amount: number,
  ) {
    let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

    if (kind === "wood") {
      sprite = this.add.sprite(x, y, "tree").setScale(0.5).play("tree-sway");
    } else if (kind === "meat") {
      sprite = this.add
        .sprite(x, y, "sheep")
        .setScale(0.72)
        .play("sheep-idle-animation");
    } else {
      this.add
        .ellipse(x, y + 10, 58, 35, 0x8e6b38, 0.7)
        .setStrokeStyle(2, 0xf5ce58, 0.8)
        .setDepth(3);
      sprite = this.add.image(x, y - 3, "gold-node").setScale(1.5);
    }

    sprite
      .setDepth(4)
      .setInteractive(
        new Phaser.Geom.Circle(
          sprite.width / 2,
          sprite.height / 2,
          Math.max(sprite.width, sprite.height) * 0.42,
        ),
        Phaser.Geom.Circle.Contains,
      );

    const label = this.add
      .text(x, y + 55, `${RESOURCE_NAMES[kind]} ${amount}`, {
        color: RESOURCE_COLORS[kind],
        backgroundColor: "#203023cc",
        fontFamily: "sans-serif",
        fontSize: "12px",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(6);

    const node: ResourceNode = { kind, amount, sprite, label };
    sprite.setData("resource", node);
    this.resources.push(node);
  }

  private createStartingUnits() {
    const pawnPositions = [
      [218, 246],
      [232, 320],
      [216, 392],
      [280, 352],
    ];

    for (const [x, y] of pawnPositions) {
      this.createUnit("blue", "pawn", x, y);
    }

    const defenders = [
      [1010, 248],
      [1000, 336],
      [1025, 420],
    ];

    for (const [x, y] of defenders) {
      this.createUnit("red", "warrior", x, y);
    }
  }

  private createUnit(
    team: Team,
    kind: UnitKind,
    x: number,
    y: number,
  ): Unit {
    const texture = kind === "pawn" ? "blue-pawn-idle" : `${team}-warrior-idle`;
    const ring = this.add
      .ellipse(x, y + 30, kind === "pawn" ? 48 : 60, 24)
      .setStrokeStyle(3, team === "blue" ? 0xbbeaff : 0xff9b8e, 0.95)
      .setVisible(false)
      .setDepth(8);
    const hpBarBack = this.add
      .rectangle(x, y - 45, 54, 7, 0x1d2221, 0.92)
      .setVisible(false)
      .setDepth(10);
    const hpBar = this.add
      .rectangle(x - 25, y - 45, 50, 4, team === "blue" ? 0x73d68b : 0xef7065)
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(11);

    const sprite = this.add
      .sprite(x, y, texture)
      .setScale(kind === "pawn" ? 0.58 : 0.62)
      .setDepth(9)
      .setInteractive(
        new Phaser.Geom.Circle(96, 96, 62),
        Phaser.Geom.Circle.Contains,
      );

    const maxHp = kind === "pawn" ? 60 : team === "blue" ? 120 : 90;
    const unit: Unit = {
      id: this.nextUnitId++,
      team,
      kind,
      sprite,
      selectionRing: ring,
      hpBar,
      hpBarBack,
      hp: maxHp,
      maxHp,
      speed: kind === "pawn" ? 92 : 78,
      damage: kind === "pawn" ? 5 : team === "blue" ? 24 : 17,
      lastAttackAt: 0,
      dead: false,
    };

    sprite.setData("unit", unit);
    this.units.push(unit);
    this.playUnitAnimation(unit, "idle");
    return unit;
  }

  private createInterface() {
    this.add
      .rectangle(0, 0, WIDTH, TOP_UI_HEIGHT, 0x101b22, 0.97)
      .setOrigin(0)
      .setDepth(50);
    this.add
      .rectangle(0, BOTTOM_UI_Y, WIDTH, HEIGHT - BOTTOM_UI_Y, 0x101b22, 0.97)
      .setOrigin(0)
      .setDepth(50);

    this.add
      .text(24, 18, "MEADOW SIEGE", {
        color: "#f7efc3",
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setDepth(51);
    this.add
      .text(24, 47, "Gather · Upgrade · Capture", {
        color: "#98b88d",
        fontFamily: "sans-serif",
        fontSize: "12px",
      })
      .setDepth(51);

    this.stockText = this.add
      .text(270, 25, "", {
        color: "#e8f0df",
        fontFamily: "sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
      })
      .setDepth(51);

    this.add
      .text(760, 14, "OBJECTIVE", {
        color: "#e6d679",
        fontFamily: "sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
      })
      .setDepth(51);
    this.add
      .text(760, 33, "Defeat the guards, then hold the castle circle.", {
        color: "#f2f1dc",
        fontFamily: "sans-serif",
        fontSize: "15px",
      })
      .setDepth(51);

    this.selectionText = this.add
      .text(24, 672, "No units selected", {
        color: "#dfeadb",
        fontFamily: "sans-serif",
        fontSize: "15px",
      })
      .setDepth(51);

    this.createButton(455, 685, 210, 44, "UPGRADE PAWN  40🥩 20●", () => {
      this.upgradeSelectedPawn();
    });

    this.hintText = this.add
      .text(
        590,
        672,
        "Select units, then right-click ground, resources, or the red castle.",
        {
          color: "#9eb1a7",
          fontFamily: "sans-serif",
          fontSize: "14px",
        },
      )
      .setDepth(51);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    action: () => void,
  ) {
    const background = this.add
      .rectangle(x, y, width, height, 0x315e76)
      .setStrokeStyle(2, 0x78abc0)
      .setInteractive({ useHandCursor: true })
      .setDepth(52);
    background.setData("ui", true);

    this.add
      .text(x, y, label, {
        color: "#f1f7ed",
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(53);

    background.on("pointerover", () => background.setFillStyle(0x427997));
    background.on("pointerout", () => background.setFillStyle(0x315e76));
    background.on("pointerdown", () => background.setFillStyle(0x244b60));
    background.on("pointerup", () => {
      background.setFillStyle(0x427997);
      action();
    });
  }

  private configureInput() {
    this.input.mouse?.disableContextMenu();

    this.input.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
      ) => {
        const target = gameObjects[0] as Phaser.GameObjects.GameObject | undefined;
        if (target?.getData("ui")) return;

        const clickedUnit = target?.getData("unit") as Unit | undefined;
        const clickedResource = target?.getData("resource") as
          | ResourceNode
          | undefined;
        const clickedCastle = target?.getData("castle") as Team | undefined;

        if (pointer.rightButtonDown()) {
          if (clickedResource) {
            this.commandGather(clickedResource);
          } else if (clickedUnit?.team === "red") {
            this.commandAttack(clickedUnit);
          } else if (clickedCastle === "red") {
            this.commandCastleCapture();
          } else {
            this.commandMove(pointer.worldX, pointer.worldY);
          }
          return;
        }

        if (clickedUnit?.team === "blue") {
          const additive = Boolean(
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
              .isDown,
          );
          this.selectUnit(clickedUnit, additive);
          return;
        }

        if (clickedResource && this.selected.size > 0) {
          this.commandGather(clickedResource);
          return;
        }

        if (clickedCastle === "red" && this.selected.size > 0) {
          this.commandCastleCapture();
          return;
        }

        if (!target) {
          this.clearSelection();
        }
      },
    );

    this.input.keyboard?.on("keydown-U", () => this.upgradeSelectedPawn());
  }

  private selectUnit(unit: Unit, additive: boolean) {
    if (!additive) this.clearSelection();
    if (this.selected.has(unit)) {
      this.selected.delete(unit);
      unit.selectionRing.setVisible(false);
    } else {
      this.selected.add(unit);
      unit.selectionRing.setVisible(true);
    }
    this.refreshInterface();
  }

  private clearSelection() {
    for (const unit of this.selected) {
      unit.selectionRing.setVisible(false);
    }
    this.selected.clear();
    this.refreshInterface();
  }

  private commandMove(x: number, y: number) {
    const movable = [...this.selected].filter((unit) => !unit.dead);
    movable.forEach((unit, index) => {
      unit.gatherTask = undefined;
      unit.attackTarget = undefined;
      unit.destination = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(x + (index % 3) * 38 - 38, 44, WIDTH - 44),
        Phaser.Math.Clamp(
          y + Math.floor(index / 3) * 40,
          TOP_UI_HEIGHT + 44,
          BOTTOM_UI_Y - 38,
        ),
      );
    });
  }

  private commandAttack(target: Unit) {
    for (const unit of this.selected) {
      if (unit.dead) continue;
      unit.gatherTask = undefined;
      unit.attackTarget = target;
      unit.destination = undefined;
    }
  }

  private commandCastleCapture() {
    const warriors = [...this.selected].filter(
      (unit) => !unit.dead && unit.kind === "warrior",
    );
    if (warriors.length === 0) {
      this.setHint("Only warriors can capture a castle. Upgrade a pawn first.");
      return;
    }

    warriors.forEach((unit, index) => {
      unit.gatherTask = undefined;
      unit.attackTarget = undefined;
      unit.destination = new Phaser.Math.Vector2(
        this.redCastlePosition.x - 112 + (index % 2) * 42,
        this.redCastlePosition.y - 42 + Math.floor(index / 2) * 62,
      );
    });
    this.setHint("Warriors marching to Redstone Keep!");
  }

  private commandGather(node: ResourceNode) {
    if (node.amount <= 0) {
      this.setHint("That resource has been depleted.");
      return;
    }

    const pawns = [...this.selected].filter(
      (unit) => !unit.dead && unit.kind === "pawn",
    );
    if (pawns.length === 0) {
      this.setHint("Select a pawn to gather resources.");
      return;
    }

    for (const pawn of pawns) {
      pawn.destination = undefined;
      pawn.attackTarget = undefined;
      pawn.gatherTask = {
        node,
        phase: "to-resource",
        readyAt: 0,
        carried: 0,
      };
    }
    this.setHint(`${pawns.length} pawn${pawns.length > 1 ? "s" : ""} gathering ${node.kind}.`);
  }

  private upgradeSelectedPawn() {
    const pawn =
      [...this.selected].find(
        (unit) => !unit.dead && unit.team === "blue" && unit.kind === "pawn",
      ) ??
      this.units.find(
        (unit) => !unit.dead && unit.team === "blue" && unit.kind === "pawn",
      );

    if (!pawn) {
      this.setHint("No pawns remain to upgrade.");
      return;
    }

    if (this.stocks.meat < 40 || this.stocks.gold < 20) {
      this.setHint("Need 40 meat and 20 gold. Send pawns to sheep and gold.");
      return;
    }

    this.stocks.meat -= 40;
    this.stocks.gold -= 20;
    pawn.kind = "warrior";
    pawn.gatherTask = undefined;
    pawn.destination = undefined;
    pawn.attackTarget = undefined;
    pawn.maxHp = 120;
    pawn.hp = 120;
    pawn.speed = 78;
    pawn.damage = 24;
    pawn.sprite.setTexture("blue-warrior-idle").setScale(0.62);
    pawn.selectionRing.setSize(60, 24);
    this.playUnitAnimation(pawn, "idle");
    this.refreshInterface();
    this.setHint("Pawn upgraded! Build an army, then attack the castle.");
  }

  private updateGathering(unit: Unit, time: number, delta: number) {
    const task = unit.gatherTask;
    if (!task) return;

    if (task.node.amount <= 0 && task.phase !== "to-castle") {
      unit.gatherTask = undefined;
      this.playUnitAnimation(unit, "idle");
      return;
    }

    if (task.phase === "to-resource") {
      const arrived = this.moveUnitToward(
        unit,
        task.node.sprite.x,
        task.node.sprite.y + 20,
        delta,
        45,
      );
      if (arrived) {
        task.phase = "working";
        task.readyAt = time + 1050;
        this.playUnitAnimation(unit, this.gatherAnimation(task.node.kind));
      }
      return;
    }

    if (task.phase === "working") {
      this.playUnitAnimation(unit, this.gatherAnimation(task.node.kind));
      if (time < task.readyAt) return;

      task.carried = Math.min(10, task.node.amount);
      task.node.amount -= task.carried;
      task.node.label.setText(
        task.node.amount > 0
          ? `${RESOURCE_NAMES[task.node.kind]} ${task.node.amount}`
          : `${RESOURCE_NAMES[task.node.kind]} depleted`,
      );
      if (task.node.amount <= 0) {
        task.node.sprite.setAlpha(0.28);
      }
      task.phase = "to-castle";
      return;
    }

    const arrived = this.moveUnitToward(
      unit,
      this.blueCastlePosition.x + 75,
      this.blueCastlePosition.y + 65,
      delta,
      55,
      `carry-${task.node.kind}`,
    );
    if (!arrived) return;

    this.stocks[task.node.kind] += task.carried;
    task.carried = 0;
    this.refreshInterface();

    if (task.node.amount > 0) {
      task.phase = "to-resource";
    } else {
      unit.gatherTask = undefined;
      this.playUnitAnimation(unit, "idle");
    }
  }

  private updateDefender(unit: Unit) {
    const target = this.units
      .filter((candidate) => !candidate.dead && candidate.team === "blue")
      .map((candidate) => ({
        candidate,
        distance: Phaser.Math.Distance.Between(
          unit.sprite.x,
          unit.sprite.y,
          candidate.sprite.x,
          candidate.sprite.y,
        ),
      }))
      .filter(({ distance }) => distance < 235)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;

    if (target) {
      unit.attackTarget = target;
    }
  }

  private findNearestEnemy(unit: Unit, range: number): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDistance = range;

    for (const candidate of this.units) {
      if (candidate.dead || candidate.team === unit.team) continue;
      const distance = Phaser.Math.Distance.Between(
        unit.sprite.x,
        unit.sprite.y,
        candidate.sprite.x,
        candidate.sprite.y,
      );
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private attack(attacker: Unit, target: Unit, time: number) {
    this.playUnitAnimation(attacker, "attack");
    if (time - attacker.lastAttackAt < 700) return;

    attacker.lastAttackAt = time;
    target.hp -= attacker.damage;
    this.updateUnitDecorations(target);
    target.sprite
      .setTint(0xffffff)
      .setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => {
      if (!target.dead) target.sprite.clearTint();
    });

    if (target.hp <= 0) {
      this.killUnit(target);
      attacker.attackTarget = undefined;
    }
  }

  private killUnit(unit: Unit) {
    unit.dead = true;
    unit.hp = 0;
    unit.selectionRing.setVisible(false);
    unit.hpBar.setVisible(false);
    unit.hpBarBack.setVisible(false);
    this.selected.delete(unit);
    unit.sprite
      .setTint(0x59645f)
      .setAlpha(0.6)
      .disableInteractive();
    unit.sprite.anims.stop();
    this.tweens.add({
      targets: unit.sprite,
      alpha: 0,
      y: unit.sprite.y + 10,
      duration: 800,
      delay: 300,
    });
    this.refreshInterface();
  }

  private moveUnitToward(
    unit: Unit,
    targetX: number,
    targetY: number,
    delta: number,
    arrivalDistance = 10,
    animation = "run",
  ): boolean {
    const distance = Phaser.Math.Distance.Between(
      unit.sprite.x,
      unit.sprite.y,
      targetX,
      targetY,
    );
    if (distance <= arrivalDistance) return true;

    const angle = Phaser.Math.Angle.Between(
      unit.sprite.x,
      unit.sprite.y,
      targetX,
      targetY,
    );
    const step = Math.min(distance, (unit.speed * delta) / 1000);
    unit.sprite.x += Math.cos(angle) * step;
    unit.sprite.y += Math.sin(angle) * step;
    unit.sprite.setFlipX(targetX < unit.sprite.x);
    this.playUnitAnimation(unit, animation);
    this.updateUnitDecorations(unit);
    return distance - step <= arrivalDistance;
  }

  private updateUnitDecorations(unit: Unit) {
    unit.sprite.setDepth(8 + unit.sprite.y / 1000);
    unit.selectionRing
      .setPosition(unit.sprite.x, unit.sprite.y + 30)
      .setDepth(unit.sprite.depth - 0.2);
    unit.hpBarBack.setPosition(unit.sprite.x, unit.sprite.y - 45);
    unit.hpBar
      .setPosition(unit.sprite.x - 25, unit.sprite.y - 45)
      .setSize(50 * Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1), 4);

    const damaged = unit.hp < unit.maxHp && !unit.dead;
    unit.hpBarBack.setVisible(damaged);
    unit.hpBar.setVisible(damaged);
  }

  private updateCapture(delta: number) {
    const defendersAlive = this.units.some(
      (unit) => unit.team === "red" && !unit.dead,
    );
    const warriorsInCircle = this.units.filter(
      (unit) =>
        unit.team === "blue" &&
        unit.kind === "warrior" &&
        !unit.dead &&
        Phaser.Math.Distance.Between(
          unit.sprite.x,
          unit.sprite.y,
          this.redCastlePosition.x,
          this.redCastlePosition.y,
        ) < 150,
    ).length;

    if (!defendersAlive && warriorsInCircle > 0) {
      this.captureProgress +=
        (delta / 1000 / 10) * (1 + (warriorsInCircle - 1) * 0.35);
      this.captureText.setText(
        `Capturing… ${Math.min(100, Math.floor(this.captureProgress * 100))}%`,
      );
    } else if (defendersAlive) {
      this.captureText.setText("Defeat the guards");
    } else {
      this.captureProgress = Math.max(0, this.captureProgress - delta / 1000 / 20);
      this.captureText.setText("Move warriors into the circle");
    }

    this.captureFill.width = 196 * Phaser.Math.Clamp(this.captureProgress, 0, 1);
    if (this.captureProgress >= 1) {
      this.winGame();
    }
  }

  private checkForDefeat() {
    const playerAlive = this.units.some(
      (unit) => unit.team === "blue" && !unit.dead,
    );
    if (!playerAlive) {
      this.endGame(
        "THE MEADOW FALLS",
        "Your army was defeated. Refresh to try again.",
        0xe56f67,
      );
    }
  }

  private winGame() {
    this.enemyCastle.setTexture("castle-blue");
    this.captureFill.width = 196;
    this.captureText.setText("CASTLE CAPTURED");
    this.endGame(
      "THE MEADOW IS YOURS!",
      "Redstone Keep has joined the Five Meadows.",
      0xe9d769,
    );
  }

  private endGame(
    title: string,
    subtitle: string,
    color: number,
  ) {
    this.gameOver = true;
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x08100d, 0.68).setDepth(100);
    this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, 560, 210, 0x15241e, 0.98)
      .setStrokeStyle(4, color)
      .setDepth(101);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 42, title, {
        color: `#${color.toString(16).padStart(6, "0")}`,
        fontFamily: "Georgia, serif",
        fontSize: "36px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 + 18, subtitle, {
        color: "#edf2de",
        fontFamily: "sans-serif",
        fontSize: "17px",
      })
      .setOrigin(0.5)
      .setDepth(102);
    const retry = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 68, "PLAY AGAIN", {
        color: "#162019",
        backgroundColor: "#dce9ae",
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    retry.on("pointerup", () => this.scene.restart());
  }

  private playUnitAnimation(unit: Unit, action: string) {
    let animationKey: string;
    if (unit.kind === "pawn") {
      animationKey = `blue-pawn-${action}-animation`;
    } else {
      animationKey = `${unit.team}-warrior-${action}-animation`;
    }

    if (this.anims.exists(animationKey) && unit.sprite.anims.currentAnim?.key !== animationKey) {
      unit.sprite.play(animationKey);
    }
  }

  private gatherAnimation(kind: ResourceKind) {
    if (kind === "wood") return "chop";
    if (kind === "gold") return "mine";
    return "butcher";
  }

  private setHint(message: string) {
    this.hintText.setText(message);
    this.hintText.setColor("#f1df91");
    this.time.delayedCall(2600, () => {
      if (!this.gameOver) {
        this.hintText.setText(
          "Select units, then right-click ground, resources, or the red castle.",
        );
        this.hintText.setColor("#9eb1a7");
      }
    });
  }

  private refreshInterface() {
    if (!this.stockText || !this.selectionText) return;
    this.stockText.setText(
      `▰ ${this.stocks.wood} WOOD     ● ${this.stocks.gold} GOLD     ♥ ${this.stocks.meat} MEAT`,
    );

    const pawns = [...this.selected].filter(
      (unit) => !unit.dead && unit.kind === "pawn",
    ).length;
    const warriors = [...this.selected].filter(
      (unit) => !unit.dead && unit.kind === "warrior",
    ).length;
    const parts = [];
    if (pawns) parts.push(`${pawns} pawn${pawns > 1 ? "s" : ""}`);
    if (warriors) parts.push(`${warriors} warrior${warriors > 1 ? "s" : ""}`);
    this.selectionText.setText(
      parts.length ? `Selected: ${parts.join(", ")}` : "No units selected",
    );
  }
}
