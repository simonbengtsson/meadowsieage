import Phaser from "phaser";
import { AssetGalleryScene } from "./game/scenes/AssetGalleryScene";
import "./style.css";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#101a20",
  pixelArt: true,
  scene: AssetGalleryScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
