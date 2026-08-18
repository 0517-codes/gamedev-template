import Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor() {
    super('HelloScene');
  }

  create(): void {
    this.add.text(16, 16, 'Hello, world!', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#000000',
    });
  }
}
