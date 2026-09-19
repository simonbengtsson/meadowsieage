import Phaser from "phaser";
import "./style.css";

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  create() {
    this.add
      .text(640, 360, "Hello, Grassy World!", {
        color: "#ffffff",
        fontFamily: "sans-serif",
        fontSize: "48px",
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#4f8f43",
  scene: MainScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
