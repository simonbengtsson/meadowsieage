import Phaser from "phaser";

const WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const CONTENT_HEIGHT = 2490;
const ASSET_ROOT = "/assets";

const FACTIONS = ["Black", "Blue", "Purple", "Red", "Yellow"] as const;

const SPRITE_SHEETS = [
  {
    key: "archer-idle",
    title: "Archer · idle",
    path: "units/blue-units/archer/archer-idle.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 6,
    frameRate: 6,
    scale: 0.72,
  },
  {
    key: "archer-run",
    title: "Archer · run",
    path: "units/blue-units/archer/archer-run.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 4,
    frameRate: 9,
    scale: 0.72,
  },
  {
    key: "archer-shoot",
    title: "Archer · shoot",
    path: "units/blue-units/archer/archer-shoot.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 8,
    frameRate: 10,
    scale: 0.72,
  },
  {
    key: "pawn-run",
    title: "Pawn · run",
    path: "units/blue-units/pawn/pawn-run.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 6,
    frameRate: 10,
    scale: 0.72,
  },
  {
    key: "warrior-attack",
    title: "Warrior · attack",
    path: "units/blue-units/warrior/warrior-attack1.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 4,
    frameRate: 8,
    scale: 0.72,
  },
  {
    key: "lancer-attack",
    title: "Lancer · attack",
    path: "units/blue-units/lancer/lancer-right-attack.png",
    frameWidth: 320,
    frameHeight: 320,
    frames: 3,
    frameRate: 7,
    scale: 0.45,
  },
  {
    key: "monk-heal",
    title: "Monk · heal",
    path: "units/blue-units/monk/heal.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 11,
    frameRate: 10,
    scale: 0.72,
  },
  {
    key: "sheep-move",
    title: "Sheep · move",
    path: "terrain/resources/meat/sheep/sheep-move.png",
    frameWidth: 128,
    frameHeight: 128,
    frames: 4,
    frameRate: 7,
    scale: 0.9,
  },
  {
    key: "tree",
    title: "Tree · sway",
    path: "terrain/resources/wood/trees/tree1.png",
    frameWidth: 192,
    frameHeight: 256,
    frames: 8,
    frameRate: 6,
    scale: 0.55,
  },
  {
    key: "explosion",
    title: "Explosion",
    path: "particle-fx/explosion-01.png",
    frameWidth: 192,
    frameHeight: 192,
    frames: 8,
    frameRate: 12,
    scale: 0.72,
  },
] as const;

const WORKER_SHEETS = [
  {
    key: "pawn-idle-pickaxe",
    title: "Miner · ready",
    path: "units/blue-units/pawn/pawn-idle-pickaxe.png",
    frames: 8,
    frameRate: 7,
  },
  {
    key: "pawn-mine",
    title: "Mining gold",
    path: "units/blue-units/pawn/pawn-interact-pickaxe.png",
    frames: 6,
    frameRate: 9,
  },
  {
    key: "pawn-run-pickaxe",
    title: "Miner · moving",
    path: "units/blue-units/pawn/pawn-run-pickaxe.png",
    frames: 6,
    frameRate: 10,
  },
  {
    key: "pawn-idle-gold",
    title: "Gold · ready",
    path: "units/blue-units/pawn/pawn-idle-gold.png",
    frames: 8,
    frameRate: 7,
  },
  {
    key: "pawn-run-gold",
    title: "Carrying gold",
    path: "units/blue-units/pawn/pawn-run-gold.png",
    frames: 6,
    frameRate: 10,
  },
  {
    key: "pawn-chop",
    title: "Chopping wood",
    path: "units/blue-units/pawn/pawn-interact-axe.png",
    frames: 6,
    frameRate: 9,
  },
  {
    key: "pawn-run-wood",
    title: "Carrying wood",
    path: "units/blue-units/pawn/pawn-run-wood.png",
    frames: 6,
    frameRate: 10,
  },
  {
    key: "pawn-butcher",
    title: "Gathering meat",
    path: "units/blue-units/pawn/pawn-interact-knife.png",
    frames: 4,
    frameRate: 8,
  },
  {
    key: "pawn-run-meat",
    title: "Carrying meat",
    path: "units/blue-units/pawn/pawn-run-meat.png",
    frames: 6,
    frameRate: 10,
  },
  {
    key: "pawn-build",
    title: "Building",
    path: "units/blue-units/pawn/pawn-interact-hammer.png",
    frames: 3,
    frameRate: 7,
  },
] as const;

export class AssetGalleryScene extends Phaser.Scene {
  constructor() {
    super("asset-gallery");
  }

  preload() {
    for (let index = 1; index <= 5; index += 1) {
      this.load.image(
        `terrain-${index}`,
        `${ASSET_ROOT}/terrain/tileset/tilemap-color${index}.png`,
      );
    }

    for (const faction of FACTIONS) {
      this.load.image(
        `castle-${faction.toLowerCase()}`,
        `${ASSET_ROOT}/buildings/${faction.toLowerCase()}-buildings/castle.png`,
      );
    }

    for (let index = 1; index <= 12; index += 1) {
      const number = String(index).padStart(2, "0");
      this.load.image(
        `icon-${number}`,
        `${ASSET_ROOT}/ui-elements/ui-elements/icons/icon-${number}.png`,
      );
    }

    this.load.image(
      "gold",
      `${ASSET_ROOT}/terrain/resources/gold/gold-resource/gold-resource.png`,
    );
    this.load.image(
      "banner",
      `${ASSET_ROOT}/ui-elements/ui-elements/banners/banner.png`,
    );
    this.load.image(
      "button-regular",
      `${ASSET_ROOT}/ui-elements/ui-elements/buttons/big-blue-button-regular.png`,
    );
    this.load.image(
      "button-pressed",
      `${ASSET_ROOT}/ui-elements/ui-elements/buttons/big-blue-button-pressed.png`,
    );

    for (const sheet of SPRITE_SHEETS) {
      this.load.spritesheet(sheet.key, `${ASSET_ROOT}/${sheet.path}`, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }

    for (const sheet of WORKER_SHEETS) {
      this.load.spritesheet(sheet.key, `${ASSET_ROOT}/${sheet.path}`, {
        frameWidth: 192,
        frameHeight: 192,
      });
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#101a20");
    this.cameras.main.setBounds(0, 0, WIDTH, CONTENT_HEIGHT);

    this.add
      .text(48, 38, "Grassy World · Asset Gallery", {
        color: "#f7efc3",
        fontFamily: "sans-serif",
        fontSize: "34px",
        fontStyle: "bold",
      })
      .setResolution(2);

    this.add
      .text(48, 84, "Scroll or use ↑ ↓ to explore the pack", {
        color: "#9fb5ad",
        fontFamily: "sans-serif",
        fontSize: "18px",
      })
      .setResolution(2);

    const browserButton = this.add
      .rectangle(1090, 58, 300, 48, 0x41612f)
      .setStrokeStyle(1, 0xaed66f)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(1090, 58, "Browse all 410 PNGs →", {
        color: "#f4f8e9",
        fontFamily: "sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setResolution(2);

    browserButton.on("pointerover", () => browserButton.setFillStyle(0x527a3b));
    browserButton.on("pointerout", () => browserButton.setFillStyle(0x41612f));
    browserButton.on("pointerdown", () => this.scene.start("asset-browser"));

    this.createTerrainSection();
    this.createAnimationSection();
    this.createWorkerSection();
    this.createInterfaceSection();
    this.configureScrolling();
  }

  private createTerrainSection() {
    this.addPanel(36, 126, 1208, 448, "Terrain and factions");

    for (let index = 0; index < 5; index += 1) {
      const x = 152 + index * 240;

      this.add.image(x, 260, `terrain-${index + 1}`).setScale(0.33);
      this.addLabel(x, 342, `Terrain ${index + 1}`);

      const faction = FACTIONS[index];
      this.add
        .image(x, 448, `castle-${faction.toLowerCase()}`)
        .setScale(0.42);
      this.addLabel(x, 530, faction);
    }
  }

  private createAnimationSection() {
    this.addPanel(36, 602, 1208, 714, "Sprite-sheet animations");

    for (const [index, sheet] of SPRITE_SHEETS.entries()) {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 148 + column * 240;
      const y = 790 + row * 292;
      const animationKey = `${sheet.key}-animation`;

      this.add
        .rectangle(x, y, 210, 236, 0x17272d, 0.8)
        .setStrokeStyle(1, 0x36515a);

      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(sheet.key, {
          start: 0,
          end: sheet.frames - 1,
        }),
        frameRate: sheet.frameRate,
        repeat: -1,
      });

      this.add
        .sprite(x, y - 12, sheet.key)
        .setScale(sheet.scale)
        .play(animationKey);
      this.addLabel(x, y + 91, sheet.title);
    }
  }

  private createInterfaceSection() {
    this.addPanel(36, 1992, 1208, 430, "Resources and interface");

    this.add.image(170, 2183, "banner").setScale(0.5);
    this.addLabel(170, 2338, "Banner");

    this.add.image(390, 2178, "gold").setScale(0.9);
    this.addLabel(390, 2258, "Gold");

    for (let index = 1; index <= 12; index += 1) {
      const number = String(index).padStart(2, "0");
      const column = (index - 1) % 6;
      const row = Math.floor((index - 1) / 6);
      this.add
        .image(535 + column * 72, 2143 + row * 76, `icon-${number}`)
        .setScale(0.82);
    }
    this.addLabel(715, 2258, "Resource and action icons");

    const button = this.add
      .image(1070, 2178, "button-regular")
      .setScale(0.55)
      .setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => button.setTexture("button-pressed"));
    button.on("pointerup", () => button.setTexture("button-regular"));
    button.on("pointerout", () => button.setTexture("button-regular"));
    this.addLabel(1070, 2288, "Interactive button");

    this.add
      .text(640, 2458, "Representative assets loaded directly from public/assets", {
        color: "#728b84",
        fontFamily: "sans-serif",
        fontSize: "16px",
      })
      .setOrigin(0.5)
      .setResolution(2);
  }

  private createWorkerSection() {
    this.addPanel(36, 1344, 1208, 620, "Pawn worker workflows");

    for (const [index, sheet] of WORKER_SHEETS.entries()) {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 148 + column * 240;
      const y = 1518 + row * 282;
      const animationKey = `${sheet.key}-animation`;

      this.add
        .rectangle(x, y, 210, 226, 0x17272d, 0.8)
        .setStrokeStyle(1, 0x36515a);

      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(sheet.key, {
          start: 0,
          end: sheet.frames - 1,
        }),
        frameRate: sheet.frameRate,
        repeat: -1,
      });

      this.add
        .sprite(x, y - 10, sheet.key)
        .setScale(0.72)
        .play(animationKey);
      this.addLabel(x, y + 86, sheet.title);
    }
  }

  private addPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
  ) {
    this.add
      .rectangle(x, y, width, height, 0x132229, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, 0x29434b);

    this.add
      .text(x + 24, y + 20, title, {
        color: "#cde1a1",
        fontFamily: "sans-serif",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setResolution(2);
  }

  private addLabel(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, {
        align: "center",
        color: "#d9e5df",
        fontFamily: "sans-serif",
        fontSize: "16px",
      })
      .setOrigin(0.5)
      .setResolution(2);
  }

  private configureScrolling() {
    const scrollBy = (amount: number) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + amount,
        0,
        CONTENT_HEIGHT - VIEWPORT_HEIGHT,
      );
    };

    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => scrollBy(deltaY),
    );

    this.input.keyboard?.on("keydown-UP", () => scrollBy(-120));
    this.input.keyboard?.on("keydown-DOWN", () => scrollBy(120));
  }
}
