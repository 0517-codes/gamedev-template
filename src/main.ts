import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#f1f1f1',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 800,
  },
  scene: [TitleScene, GameScene, ResultScene],
};

const game = new Phaser.Game(config);

// HMR: src 配下を編集したら、古い Game インスタンスを破棄して作り直す
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
  import.meta.hot.accept();
}
