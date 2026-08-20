import Phaser from 'phaser';

type RoundConfig = {
  carSpeed: number;
  spawnDelay: number;
  laneCount: number;
  bombDelay: number;
  bombCount: number;
  mazeWalls: number;
};

const ROUND_CONFIGS: RoundConfig[] = [
  { carSpeed: 190, spawnDelay: 1250, laneCount: 4, bombDelay: 6200, bombCount: 2, mazeWalls: 5 },
  { carSpeed: 250, spawnDelay: 950, laneCount: 5, bombDelay: 5000, bombCount: 3, mazeWalls: 7 },
  { carSpeed: 315, spawnDelay: 700, laneCount: 6, bombDelay: 3900, bombCount: 4, mazeWalls: 9 },
];
const TIME_LIMIT_SECONDS = 10;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cars!: Phaser.Physics.Arcade.Group;
  private bombs!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private round = 1;
  private hits = 0;
  private score = 0;
  private totalSeconds = 0;
  private roundSeconds = 0;
  private speedBoostUntil = 0;
  private warpReadyAt = 0;
  private paused = false;
  private transitioning = false;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private bombTimer?: Phaser.Time.TimerEvent;
  private dangerDropTimer?: Phaser.Time.TimerEvent;
  private hitCooldownUntil = 0;
  private dangerZone?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.round = 1;
    this.hits = 0;
    this.score = 0;
    this.totalSeconds = 0;
    this.roundSeconds = 0;
    this.speedBoostUntil = 0;
    this.warpReadyAt = 0;
    this.hitCooldownUntil = 0;
    this.paused = false;
    this.transitioning = false;
    this.createTextures();
    this.createWorld();
    this.createInput();
    this.startRound();
  }

  update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && !this.transitioning) {
      this.togglePause();
    }
    if (this.paused || this.transitioning) {
      return;
    }

    const seconds = delta / 1000;
    this.roundSeconds += seconds;
    this.totalSeconds += seconds;
    this.score += Math.floor(seconds * 10);
    if (this.totalSeconds >= TIME_LIMIT_SECONDS) {
      this.totalSeconds = TIME_LIMIT_SECONDS;
      this.finishGame(false);
      return;
    }
    this.updatePlayer(time);
    this.recycleCars();
    this.updateBombs();
    this.updateHud(time);

    if (this.player.y <= 82) {
      this.finishRound();
    }
  }

  private createTextures(): void {
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x63d8a0, 1);
    playerGraphics.fillRoundedRect(0, 0, 34, 46, 8);
    playerGraphics.generateTexture('player', 34, 46);
    playerGraphics.destroy();

    const carGraphics = this.add.graphics();
    carGraphics.fillStyle(0xef6b63, 1);
    carGraphics.fillRoundedRect(0, 0, 86, 34, 7);
    carGraphics.fillStyle(0x202c3c, 1);
    carGraphics.fillRect(15, 5, 20, 11);
    carGraphics.fillRect(51, 5, 20, 11);
    carGraphics.generateTexture('car', 86, 34);
    carGraphics.destroy();

    const bombGraphics = this.add.graphics();
    bombGraphics.fillStyle(0x1b1b24, 1);
    bombGraphics.fillCircle(18, 18, 16);
    bombGraphics.fillStyle(0xffb347, 1);
    bombGraphics.fillCircle(27, 7, 5);
    bombGraphics.generateTexture('bomb', 36, 36);
    bombGraphics.destroy();

    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x657386, 1);
    wallGraphics.fillRect(0, 0, 1, 1);
    wallGraphics.generateTexture('wall', 1, 1);
    wallGraphics.destroy();
  }

  private createWorld(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x102033);
    this.add.rectangle(width / 2, 78, width - 140, 90, 0x23533f);
    this.add.rectangle(width / 2, 654, width - 140, 90, 0x23533f);

    this.player = this.physics.add.sprite(width / 2, 620, 'player');
    this.player.setCollideWorldBounds(true);
    if (this.player.body) {
      this.player.body.setSize(24, 36, true);
    }

    this.cars = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bombs = this.physics.add.group({ allowGravity: false, immovable: true });
  this.walls = this.physics.add.staticGroup();
    this.physics.add.overlap(this.player, this.cars, this.handleHit, undefined, this);
    this.physics.add.overlap(this.player, this.bombs, this.handleBombHit, undefined, this);
  this.physics.add.collider(this.player, this.walls);
  this.physics.add.collider(this.cars, this.walls);

    this.hud = this.add.text(24, 20, '', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#172436',
      padding: { x: 14, y: 10 },
    });
    this.banner = this.add.text(width / 2, height / 2, '', {
      fontFamily: 'sans-serif',
      fontSize: '54px',
      color: '#f7d774',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required.');
    }
    this.cursors = keyboard.createCursorKeys();
    this.shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.ESC,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  private startRound(): void {
    const config = ROUND_CONFIGS[this.round - 1];
    if (!config) {
      return;
    }
    this.transitioning = true;
    this.hits = 0;
    this.hitCooldownUntil = 0;
    this.player.setPosition(this.scale.width / 2, 620);
    this.player.setVelocity(0, 0);
    this.cars.clear(true, true);
    this.bombs.clear(true, true);
    this.walls.clear(true, true);
    this.createMaze(config.mazeWalls);
    this.dangerZone?.destroy();
    this.dangerZone = undefined;
    this.dangerDropTimer?.remove();
    this.dangerDropTimer = undefined;
    this.banner.setText(`ラウンド ${this.round}`).setAlpha(0);
    this.tweens.add({
      targets: this.banner,
      alpha: 1,
      duration: 350,
      hold: 700,
      yoyo: true,
      onComplete: () => {
        this.transitioning = false;
        this.spawnTimer = this.time.addEvent({
          delay: config.spawnDelay,
          loop: true,
          callback: this.spawnCar,
          callbackScope: this,
        });
        this.bombTimer = this.time.addEvent({
          delay: config.bombDelay,
          loop: true,
          callback: this.showDangerZone,
          callbackScope: this,
        });
      },
    });
  }

  private spawnCar(): void {
    if (this.paused || this.transitioning) {
      return;
    }
    const config = ROUND_CONFIGS[this.round - 1];
    if (!config) {
      return;
    }
    const lane = Phaser.Math.Between(0, config.laneCount - 1);
    const laneHeight = 500 / config.laneCount;
    const y = 145 + lane * laneHeight + laneHeight / 2;
    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const x = fromLeft ? 70 : this.scale.width - 70;
    const car = this.cars.create(x, y, 'car') as Phaser.Physics.Arcade.Sprite;
    car.setVelocityX(fromLeft ? config.carSpeed : -config.carSpeed);
    car.setFlipX(!fromLeft);
    car.setData('direction', fromLeft ? 1 : -1);
  }

  private updatePlayer(time: number): void {
    const baseSpeed = time < this.speedBoostUntil ? 330 : 210;
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-baseSpeed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(baseSpeed);
    } else {
      this.player.setVelocityY(0);
    }
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-baseSpeed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(baseSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, 90, this.scale.width - 90);

    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && time >= this.speedBoostUntil) {
      this.speedBoostUntil = time + 3500;
    }
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && time >= this.warpReadyAt) {
      this.player.y = Math.max(82, this.player.y - 125);
      this.warpReadyAt = time + 6000;
    }
  }

  private createMaze(difficulty: number): void {
    const mazeLeft = 90;
    const mazeTop = 125;
    const mazeWidth = this.scale.width - 180;
    const mazeHeight = 500;
    const columns = 15;
    const rows = 8;
    const cellWidth = mazeWidth / columns;
    const cellHeight = mazeHeight / rows;
    const wallThickness = 12;
    const pathColumns = [Math.floor(columns / 2)];

    for (let row = 1; row < rows; row += 1) {
      const previousColumn = pathColumns[row - 1] ?? Math.floor(columns / 2);
      const direction = (row + difficulty) % 4 < 2 ? 1 : -1;
      pathColumns.push(Phaser.Math.Clamp(previousColumn + direction, 1, columns - 2));
    }

    for (let row = 1; row < rows; row += 1) {
      const pathColumn = pathColumns[row] ?? Math.floor(columns / 2);
      const secondaryGap = (row * 3 + difficulty) % columns;
      for (let column = 0; column < columns; column += 1) {
        if (column !== pathColumn && column !== secondaryGap) {
          this.addMazeWall(
            mazeLeft + column * cellWidth + cellWidth / 2,
            mazeTop + row * cellHeight,
            cellWidth + 2,
            wallThickness,
          );
        }
      }
    }

    for (let barrier = 0; barrier < difficulty; barrier += 1) {
      const row = 1 + ((barrier * 2 + difficulty) % (rows - 1));
      const column = 2 + ((barrier * 4 + difficulty) % (columns - 4));
      const pathBefore = pathColumns[row - 1] ?? Math.floor(columns / 2);
      const pathAfter = pathColumns[row] ?? pathBefore;
      if (Math.abs(column - pathBefore) <= 1 || Math.abs(column - pathAfter) <= 1) {
        continue;
      }
      const wallHeight = cellHeight * 0.75;
      this.addMazeWall(
        mazeLeft + column * cellWidth,
        mazeTop + row * cellHeight - cellHeight / 2,
        wallThickness,
        wallHeight,
      );
    }
  }

  private addMazeWall(x: number, y: number, width: number, height: number): void {
    const wall = this.walls.create(x, y, 'wall') as Phaser.Physics.Arcade.Sprite;
    wall.setDisplaySize(width, height);
    wall.refreshBody();
  }

  private recycleCars(): void {
    for (const child of this.cars.children) {
      const car = child as Phaser.Physics.Arcade.Sprite;
      if (car.x < -120 || car.x > this.scale.width + 120) {
        car.destroy();
      }
    }
  }

  private handleHit(): void {
    if (this.transitioning || this.paused || this.time.now < this.hitCooldownUntil) {
      return;
    }
    this.hitCooldownUntil = this.time.now + 1200;
    this.hits += 1;
    this.score = Math.max(0, this.score - 100);
    this.player.setTint(0xffffff);
    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.player.clearTint(),
    });
    if (this.hits >= 2) {
      this.finishGame(false);
    }
  }

  private showDangerZone(): void {
    if (this.paused || this.transitioning || this.dangerZone) {
      return;
    }

    const x = Phaser.Math.Between(150, this.scale.width - 150);
    const y = Phaser.Math.Between(200, 570);
    const zone = this.add.rectangle(x, y, 120, 76, 0xe33e4f, 0.45)
      .setStrokeStyle(4, 0xff6675, 1);
    this.dangerZone = zone;
    this.tweens.add({
      targets: zone,
      alpha: 0.85,
      duration: 300,
      yoyo: true,
      repeat: 5,
    });
    this.dangerDropTimer = this.time.delayedCall(2000, () => {
      if (this.dangerZone !== zone || this.transitioning) {
        return;
      }
      this.dangerZone = undefined;
      this.dangerDropTimer = undefined;
      zone.destroy();
      this.dropBomb(x, y);
    });
  }

  private dropBomb(x: number, targetY: number): void {
    const config = ROUND_CONFIGS[this.round - 1];
    const bombCount = config?.bombCount ?? 1;
    for (let index = 0; index < bombCount; index += 1) {
      const offsetX = (index - (bombCount - 1) / 2) * 72;
      const bomb = this.bombs.create(x + offsetX, 45, 'bomb') as Phaser.Physics.Arcade.Sprite;
      bomb.setVelocity(0, 500);
      bomb.setData('targetY', targetY + (index % 2 === 0 ? 0 : 28));
    }
  }

  private updateBombs(): void {
    for (const child of this.bombs.children) {
      const bomb = child as Phaser.Physics.Arcade.Sprite;
      const targetY = bomb.getData('targetY') as number | undefined;
      if (targetY !== undefined && bomb.y >= targetY) {
        bomb.setVelocity(0, 0);
        this.createExplosion(bomb.x, targetY);
        bomb.destroy();
      }
    }
  }

  private handleBombHit(): void {
    if (this.transitioning || this.paused) {
      return;
    }
    this.handleHit();
  }

  private createExplosion(x: number, y: number): void {
    const explosion = this.add.circle(x, y, 24, 0xffa33d, 0.9)
      .setStrokeStyle(5, 0xffe277, 1);
    this.tweens.add({
      targets: explosion,
      radius: 105,
      alpha: 0,
      duration: 450,
      onUpdate: () => {
        if (!this.transitioning && Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < 105) {
          this.handleHit();
        }
      },
      onComplete: () => explosion.destroy(),
    });
  }

  private finishRound(): void {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    this.spawnTimer?.remove();
    this.bombTimer?.remove();
    this.dangerZone?.destroy();
    this.dangerZone = undefined;
    this.dangerDropTimer?.remove();
    this.dangerDropTimer = undefined;
    this.banner.setText(`ラウンド ${this.round} クリア`).setAlpha(1);
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => {
        if (this.round >= ROUND_CONFIGS.length) {
          this.finishGame(true);
        } else {
          this.round += 1;
          this.roundSeconds = 0;
          this.startRound();
        }
      },
    });
  }

  private finishGame(won: boolean): void {
    if (this.transitioning && !won) {
      this.spawnTimer?.remove();
    }
    this.transitioning = true;
    this.spawnTimer?.remove();
    this.bombTimer?.remove();
    this.dangerZone?.destroy();
    this.dangerZone = undefined;
    this.dangerDropTimer?.remove();
    this.dangerDropTimer = undefined;
    this.bombs.clear(true, true);
    this.player.setVelocity(0, 0);
    this.scene.start('ResultScene', {
      totalSeconds: this.totalSeconds,
      score: this.score,
      won,
    });
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.physics.world.isPaused = this.paused;
    if (this.spawnTimer) {
      this.spawnTimer.paused = this.paused;
    }
    if (this.bombTimer) {
      this.bombTimer.paused = this.paused;
    }
    if (this.dangerDropTimer) {
      this.dangerDropTimer.paused = this.paused;
    }
    this.banner.setText(this.paused ? 'ポーズ中' : '').setAlpha(this.paused ? 1 : 0);
  }

  private updateHud(time: number): void {
    const boost = Math.max(0, (this.speedBoostUntil - time) / 1000);
    const warp = Math.max(0, (this.warpReadyAt - time) / 1000);
    this.hud.setText([
      `ラウンド ${this.round} / 3`,
      `残り時間  ${Math.max(0, TIME_LIMIT_SECONDS - this.totalSeconds).toFixed(1)} 秒`,
      `スコア ${this.score}`,
      `衝突  ${this.hits} / 2`,
      `加速 ${boost > 0 ? `${boost.toFixed(1)}秒` : '準備完了'}   ワープ ${warp > 0 ? `${warp.toFixed(1)}秒` : '準備完了'}`,
      '移動: 矢印キー   赤い警告ゾーン: 2秒後に爆弾',
    ]);
  }
}