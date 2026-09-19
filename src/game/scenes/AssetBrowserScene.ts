import Phaser from "phaser";
import { ASSET_MANIFEST, type AssetEntry } from "../assetManifest";

const WIDTH = 1280;
const HEIGHT = 720;
const PAGE_SIZE = 24;
const CATEGORIES = [
  "all",
  "buildings",
  "particle-fx",
  "terrain",
  "ui-elements",
  "units",
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  buildings: "Buildings",
  "particle-fx": "Effects",
  terrain: "Terrain",
  "ui-elements": "Interface",
  units: "Units",
};

const ASSET_INDEX: ReadonlyMap<string, number> = new Map(
  ASSET_MANIFEST.map((asset, index) => [asset.path, index]),
);

export class AssetBrowserScene extends Phaser.Scene {
  private category: Category = "all";
  private page = 0;
  private loading = false;
  private grid?: Phaser.GameObjects.Container;
  private pageLabel!: Phaser.GameObjects.Text;
  private detailLabel!: Phaser.GameObjects.Text;
  private statusLabel!: Phaser.GameObjects.Text;
  private pageTextureKeys: string[] = [];
  private readonly categoryBackgrounds = new Map<
    Category,
    Phaser.GameObjects.Rectangle
  >();

  constructor() {
    super("asset-browser");
  }

  create() {
    this.cameras.main.setBackgroundColor("#101a20");

    this.add
      .text(36, 26, "Complete asset browser", {
        color: "#f7efc3",
        fontFamily: "sans-serif",
        fontSize: "32px",
        fontStyle: "bold",
      })
      .setResolution(2);

    this.add
      .text(
        36,
        66,
        `${ASSET_MANIFEST.length} PNGs · 24 loaded per page · animation sheets appear as strips`,
        {
          color: "#9fb5ad",
          fontFamily: "sans-serif",
          fontSize: "16px",
        },
      )
      .setResolution(2);

    this.createButton(1134, 48, 220, 46, "← Curated gallery", () => {
      this.scene.start("asset-gallery");
    });

    for (const [index, category] of CATEGORIES.entries()) {
      const count =
        category === "all"
          ? ASSET_MANIFEST.length
          : ASSET_MANIFEST.filter((asset) => asset.category === category).length;
      const background = this.createButton(
        120 + index * 205,
        118,
        186,
        42,
        `${CATEGORY_LABELS[category]} · ${count}`,
        () => this.selectCategory(category),
      );
      this.categoryBackgrounds.set(category, background);
    }

    this.detailLabel = this.add
      .text(36, 158, "Hover an asset to see its full path", {
        color: "#8da69e",
        fontFamily: "monospace",
        fontSize: "13px",
      })
      .setResolution(2);

    this.pageLabel = this.add
      .text(WIDTH / 2, 680, "", {
        color: "#d9e5df",
        fontFamily: "sans-serif",
        fontSize: "16px",
      })
      .setOrigin(0.5)
      .setResolution(2);

    this.statusLabel = this.add
      .text(36, 680, "", {
        color: "#9fb5ad",
        fontFamily: "sans-serif",
        fontSize: "14px",
      })
      .setOrigin(0, 0.5)
      .setResolution(2);

    this.createButton(490, 680, 110, 38, "← Previous", () => {
      if (this.page > 0) {
        this.page -= 1;
        this.showPage();
      }
    });

    this.createButton(790, 680, 110, 38, "Next →", () => {
      if (this.page < this.getPageCount() - 1) {
        this.page += 1;
        this.showPage();
      }
    });

    this.input.keyboard?.on("keydown-LEFT", () => {
      if (this.page > 0 && !this.loading) {
        this.page -= 1;
        this.showPage();
      }
    });
    this.input.keyboard?.on("keydown-RIGHT", () => {
      if (this.page < this.getPageCount() - 1 && !this.loading) {
        this.page += 1;
        this.showPage();
      }
    });
    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("asset-gallery");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearPageTextures();
    });

    this.updateCategoryButtons();
    this.showPage();
  }

  private selectCategory(category: Category) {
    if (this.loading || category === this.category) return;

    this.category = category;
    this.page = 0;
    this.updateCategoryButtons();
    this.showPage();
  }

  private showPage() {
    if (this.loading) return;

    this.loading = true;
    this.grid?.destroy(true);
    this.clearPageTextures();

    const assets = this.getFilteredAssets();
    const start = this.page * PAGE_SIZE;
    const pageAssets = assets.slice(start, start + PAGE_SIZE);
    const textureKeys = pageAssets.map(
      (asset) => `browser-${ASSET_INDEX.get(asset.path)}`,
    );

    this.statusLabel.setText(`Loading ${pageAssets.length} assets…`);
    this.pageLabel.setText(
      `Page ${this.page + 1} of ${this.getPageCount()}`,
    );

    const failedKeys = new Set<string>();
    const onLoadError = (file: Phaser.Loader.File) => {
      failedKeys.add(file.key);
    };

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
      this.pageTextureKeys = textureKeys;
      this.renderPage(pageAssets, textureKeys, failedKeys);
      this.loading = false;
      this.statusLabel.setText(
        failedKeys.size === 0 ? `${pageAssets.length} loaded` : `${failedKeys.size} failed`,
      );
    });

    for (const [index, asset] of pageAssets.entries()) {
      this.load.image(textureKeys[index], asset.path);
    }

    this.load.start();
  }

  private renderPage(
    assets: readonly AssetEntry[],
    textureKeys: readonly string[],
    failedKeys: ReadonlySet<string>,
  ) {
    this.grid = this.add.container(0, 0);

    for (const [index, asset] of assets.entries()) {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = 120 + column * 205;
      const y = 244 + row * 105;
      const textureKey = textureKeys[index];

      const card = this.add
        .rectangle(x, y, 188, 94, 0x17272d, 0.9)
        .setStrokeStyle(1, 0x36515a)
        .setInteractive({ useHandCursor: true });

      card.on("pointerover", () => {
        card.setStrokeStyle(2, 0x9fc46b);
        this.detailLabel.setText(asset.path);
      });
      card.on("pointerout", () => {
        card.setStrokeStyle(1, 0x36515a);
      });

      const label = this.add
        .text(x, y + 35, asset.name, {
          align: "center",
          color: failedKeys.has(textureKey) ? "#e88f8f" : "#d9e5df",
          fontFamily: "sans-serif",
          fontSize: "12px",
          wordWrap: { width: 174 },
        })
        .setOrigin(0.5)
        .setResolution(2);

      this.grid.add([card, label]);

      if (!failedKeys.has(textureKey) && this.textures.exists(textureKey)) {
        const frame = this.textures.getFrame(textureKey);
        const scale = Math.min(160 / frame.realWidth, 60 / frame.realHeight, 1.5);
        const image = this.add
          .image(x, y - 10, textureKey)
          .setScale(scale)
          .setInteractive({ useHandCursor: true });

        image.on("pointerover", () => this.detailLabel.setText(asset.path));
        this.grid.add(image);
      }
    }
  }

  private getFilteredAssets(): readonly AssetEntry[] {
    if (this.category === "all") return ASSET_MANIFEST;
    return ASSET_MANIFEST.filter((asset) => asset.category === this.category);
  }

  private getPageCount() {
    return Math.max(1, Math.ceil(this.getFilteredAssets().length / PAGE_SIZE));
  }

  private clearPageTextures() {
    for (const key of this.pageTextureKeys) {
      if (this.textures.exists(key)) this.textures.remove(key);
    }
    this.pageTextureKeys = [];
  }

  private updateCategoryButtons() {
    for (const [category, background] of this.categoryBackgrounds) {
      const selected = category === this.category;
      background.setFillStyle(selected ? 0x41612f : 0x1d3037, 1);
      background.setStrokeStyle(1, selected ? 0xaed66f : 0x416069);
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ) {
    const background = this.add
      .rectangle(x, y, width, height, 0x1d3037, 1)
      .setStrokeStyle(1, 0x416069)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        color: "#e7efdb",
        fontFamily: "sans-serif",
        fontSize: "15px",
      })
      .setOrigin(0.5)
      .setResolution(2);

    background.on("pointerover", () => background.setFillStyle(0x29434b));
    background.on("pointerout", () => this.updateCategoryButtons());
    background.on("pointerdown", onClick);

    return background;
  }
}
