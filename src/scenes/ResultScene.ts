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

  create(data: ResultData): void {
    const { width, height } = this.scale;
    const won = data.won;
    const title = won ? 'YOU MADE IT!' : 'GAME OVER';
    const color = won ? '#8de0a8' : '#ff8f8f';

    this.add.rectangle(width / 2, height / 2, width, height, won ? 0x12352d : 0x3a202b);
    this.add.text(width / 2, 190, title, {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 330, `SURVIVAL TIME  ${data.totalSeconds.toFixed(1)} s`, {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(width / 2, 385, `SCORE  ${data.score}`, {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#d7e2ee',
    }).setOrigin(0.5);
    const prompt = this.add.text(width / 2, 550, 'PRESS ENTER FOR TITLE', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color,
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
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start('TitleScene');
    }
  }
}