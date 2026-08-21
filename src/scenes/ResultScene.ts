import Phaser from 'phaser';

type ResultData = {
  totalSeconds: number;
  score: number;
  won: boolean;
};

export class ResultScene extends Phaser.Scene {
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('ResultScene');
  }

  preload(): void {
    this.load.image('simapanbisyojo', 'simapanbisyojo.webp');
  }

  create(data: ResultData): void {
    const { width, height } = this.scale;
    const won = data.won;
      const title = won ? 'クリア！' : 'ゲームオーバー';
      const color = '#f1f1f1';

      this.add.rectangle(width / 2, height / 2, width, height, 0x222222);
    if (won) {
        const image = this.add.image(width / 2, height / 2, 'simapanbisyojo')
          .setDepth(1);
        const scale = Math.min(4200 / image.width, 2300 / image.height);
        image.setScale(scale).setAlpha(0.35);
    }
    this.add.text(width / 2, 295, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(width / 2, 395, `生存時間  ${data.totalSeconds.toFixed(1)} 秒`, {
      fontFamily: 'Georgia, serif',
      fontSize: '30px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(width / 2, 450, `スコア  ${data.score}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);
    const prompt = this.add.text(width / 2, 600, 'Enterキーでタイトルへ', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color,
    }).setOrigin(0.5).setDepth(2);

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
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start('TitleScene');
    }
  }
}