import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x102033);
    this.add.rectangle(width / 2, height * 0.72, width, 120, 0x27364a);
    this.add.text(width / 2, 170, 'ロードランナー', {
      fontFamily: 'sans-serif',
      fontSize: '72px',
      color: '#f7d774',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 250, '3ラウンド  |  道路を渡れ', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#c9d6e6',
    }).setOrigin(0.5);
    this.add.text(width / 2, 410, '矢印キー  移動     SHIFT  加速     SPACE  ワープ', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const prompt = this.add.text(width / 2, 560, 'Enterキーで開始', {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#f7d774',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required.');
    }
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.ESC,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start('GameScene');
    }
  }
}