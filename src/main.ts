import Phaser from "phaser";
import TilemapScene from "./scenes/TilemapScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade"
  },
  render: {
    // prevent tile bleeding
    antialiasGL: false,
    // prevent pixel art from becoming blurre when scaled
    pixelArt: true
  },
  scene: [TilemapScene]
};

export default new Phaser.Game(config);
