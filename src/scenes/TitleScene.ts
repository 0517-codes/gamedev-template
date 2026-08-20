import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    const { width, height } = this.scale;

      this.add.rectangle(width / 2, height / 2, width, height, 0xf4f4f1);
      this.add.rectangle(width / 2, height * 0.72, width, 120, 0x111111);
    this.add.text(width / 2, 170, 'ロードランナー', {
      fontFamily: 'sans-serif',
      fontSize: '72px',
      color: '#111111',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 250, '3ラウンド  |  各ラウンド180秒', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#555555',
    }).setOrigin(0.5);
    this.add.text(width / 2, 390, '矢印キー: 移動　 SHIFT: 加速　 SPACE: ワープ', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#111111',
    }).setOrigin(0.5);
    this.add.text(width / 2, 435, 'F: 連射　 R: リロード　 G: 道案内', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#111111',
    }).setOrigin(0.5);
    const prompt = this.add.text(width / 2, 560, 'Enterキーで開始', {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#000000',
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