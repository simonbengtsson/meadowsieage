import Phaser from "phaser";
import { AssetBrowserScene } from "./game/scenes/AssetBrowserScene";
import { AssetGalleryScene } from "./game/scenes/AssetGalleryScene";
import { MeadowSiegeScene } from "./game/scenes/MeadowSiegeScene";
import "./style.css";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#101a20",
  pixelArt: true,
  scene: [MeadowSiegeScene, AssetGalleryScene, AssetBrowserScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
