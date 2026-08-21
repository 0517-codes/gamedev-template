import Phaser from 'phaser';

type RoundConfig = {
  carSpeed: number;
  spawnDelay: number;
  laneCount: number;
  carsPerRound: number;
  bombDelay: number;
  bombCount: number;
  mazeWalls: number;
};

const ROUND_CONFIGS: RoundConfig[] = [
  { carSpeed: 190, spawnDelay: 1250, laneCount: 4, carsPerRound: 500, bombDelay: 6200, bombCount: 5, mazeWalls: 5 },
  { carSpeed: 250, spawnDelay: 950, laneCount: 5, carsPerRound: 1000, bombDelay: 5000, bombCount: 8, mazeWalls: 7 },
  { carSpeed: 315, spawnDelay: 700, laneCount: 6, carsPerRound: 1200, bombDelay: 3900, bombCount: 11, mazeWalls: 9 },
];
const ROUND_TIME_LIMIT_SECONDS = 180;
const BULLET_FIRE_INTERVAL_MS = 120;
const MAGAZINE_SIZE = 12;
const RELOAD_DURATION_MS = 2000;
const WARP_COOLDOWN_MS = 3000;
const DASH_DURATION_MS = 10000;
const GUIDE_DISPLAY_MS = 5000;
const GUIDE_COOLDOWN_MS = 15000;
const MAZE_COLUMNS = 40;
const MAZE_ROWS = 40;
const MAZE_CELL_SIZE = 44;
const MAZE_WALL_THICKNESS = 8;
const WORLD_SIZE = MAZE_COLUMNS * MAZE_CELL_SIZE;
const SIDEBAR_WIDTH = 256;
const STAGE_VIEWPORT_WIDTH = 1024;
const START_COLUMN = Math.floor(MAZE_COLUMNS / 2);
const START_X = START_COLUMN * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
const START_Y = WORLD_SIZE - MAZE_CELL_SIZE + 8;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cars!: Phaser.Physics.Arcade.Group;
  private bombs!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private reloadKey!: Phaser.Input.Keyboard.Key;
  private guideKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private round = 1;
  private hits = 0;
  private score = 0;
  private carsSpawned = 0;
  private totalSeconds = 0;
  private roundSeconds = 0;
  private speedBoostUntil = 0;
  private dashReadyAt = 0;
  private warpReadyAt = 0;
  private paused = false;
  private transitioning = false;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private bombTimer?: Phaser.Time.TimerEvent;
  private dangerDropTimer?: Phaser.Time.TimerEvent;
  private hitCooldownUntil = 0;
  private nextShotAt = 0;
  private ammo = MAGAZINE_SIZE;
  private reloading = false;
  private reloadStartedAt = 0;
  private reloadEndsAt = 0;
  private shotDirectionX = 0;
  private shotDirectionY = -1;
  private guideReadyAt = 0;
  private dangerZone?: Phaser.GameObjects.Rectangle;
  private guidePath?: Phaser.GameObjects.Graphics;
  private guideHideTimer?: Phaser.Time.TimerEvent;
  private guidePathPoints: Array<{ row: number; column: number }> = [];
  private reloadGauge?: Phaser.GameObjects.Graphics;
  private dashGauge?: Phaser.GameObjects.Graphics;
  private dashMotion?: Phaser.Tweens.Tween;
  private startMarker?: Phaser.GameObjects.Arc;
  private startLabel?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.round = 1;
    this.hits = 0;
    this.score = 0;
    this.carsSpawned = 0;
    this.totalSeconds = 0;
    this.roundSeconds = 0;
    this.speedBoostUntil = 0;
    this.dashReadyAt = 0;
    this.warpReadyAt = 0;
    this.hitCooldownUntil = 0;
    this.nextShotAt = 0;
    this.ammo = MAGAZINE_SIZE;
    this.reloading = false;
    this.reloadStartedAt = 0;
    this.reloadEndsAt = 0;
    this.shotDirectionX = 0;
    this.shotDirectionY = -1;
    this.guideReadyAt = 0;
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
    if (this.roundSeconds >= ROUND_TIME_LIMIT_SECONDS) {
      this.roundSeconds = ROUND_TIME_LIMIT_SECONDS;
      this.finishGame(false);
      return;
    }
    this.updatePlayer(time);
    this.updateDashGauge(time);
    this.updateReload(time);
    this.fireWeapon(time);
    this.updateGuideSkill(time);
    this.recycleCars();
    this.recycleBullets();
    this.updateBombs();
    this.updateHud(time);

    if (this.player.y <= 82) {
      this.finishRound();
    }
  }

  private createTextures(): void {
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x777777, 1);
    playerGraphics.fillRoundedRect(0, 0, 40, 40, 8);
    playerGraphics.generateTexture('player', 40, 40);
    playerGraphics.destroy();

    const carGraphics = this.add.graphics();
    carGraphics.fillStyle(0x333333, 1);
    carGraphics.fillRoundedRect(0, 0, 86, 34, 7);
    carGraphics.fillStyle(0xdddddd, 1);
    carGraphics.fillRect(15, 5, 20, 11);
    carGraphics.fillRect(51, 5, 20, 11);
    carGraphics.generateTexture('car', 86, 34);
    carGraphics.destroy();

    const bombGraphics = this.add.graphics();
    bombGraphics.fillStyle(0x111111, 1);
    bombGraphics.fillCircle(18, 18, 16);
    bombGraphics.fillStyle(0x888888, 1);
    bombGraphics.fillCircle(27, 7, 5);
    bombGraphics.generateTexture('bomb', 36, 36);
    bombGraphics.destroy();

    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0x111111, 1);
    bulletGraphics.fillRoundedRect(0, 0, 8, 22, 3);
    bulletGraphics.generateTexture('bullet', 8, 22);
    bulletGraphics.destroy();

    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x888888, 1);
    wallGraphics.fillRect(0, 0, 1, 1);
    wallGraphics.generateTexture('wall', 1, 1);
    wallGraphics.destroy();
  }

  private createWorld(): void {
    const { height } = this.scale;
    this.add.rectangle(SIDEBAR_WIDTH / 2, height / 2, SIDEBAR_WIDTH, height, 0x222222)
      .setScrollFactor(0)
      .setDepth(900);
    this.add.rectangle(SIDEBAR_WIDTH, height / 2, 4, height, 0xffffff)
      .setScrollFactor(0)
      .setDepth(901);
    this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 0xf1f1f1);
    this.add.rectangle(WORLD_SIZE / 2, 40, WORLD_SIZE, 80, 0xaaaaaa);
    this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE - 40, WORLD_SIZE, 80, 0xaaaaaa);

    this.player = this.physics.add.sprite(START_X, START_Y, 'player');
    this.player.setCollideWorldBounds(true);
    if (this.player.body) {
      this.player.body.setSize(28, 28, true);
    }

    this.cars = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bombs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.walls = this.physics.add.staticGroup();
    this.physics.add.overlap(this.player, this.cars, this.handleHit, undefined, this);
    this.physics.add.overlap(this.player, this.bombs, this.handleBombHit, undefined, this);
    this.physics.add.overlap(this.bullets, this.cars, this.handleBulletHit, undefined, this);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.cars, this.walls);
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.centerOn(START_X, START_Y);
    this.cameras.main.startFollow(this.player, true, 1, 1);

    this.hud = this.add.text(20, 28, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#222222',
      padding: { x: 10, y: 12 },
      wordWrap: { width: SIDEBAR_WIDTH - 40 },
    }).setScrollFactor(0).setDepth(1000);
    this.dashGauge = this.add.graphics().setScrollFactor(0).setDepth(1001);
    this.banner = this.add.text(SIDEBAR_WIDTH + STAGE_VIEWPORT_WIDTH / 2, height / 2, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '54px',
      color: '#222222',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(1100);
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required.');
    }
    this.cursors = keyboard.createCursorKeys();
    this.shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.reloadKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.guideKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.ESC,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.F,
      Phaser.Input.Keyboard.KeyCodes.G,
      Phaser.Input.Keyboard.KeyCodes.R,
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
    this.roundSeconds = 0;
    this.player.setPosition(START_X, START_Y);
    this.player.setVelocity(0, 0);
    this.cars.clear(true, true);
    this.bombs.clear(true, true);
    this.bullets.clear(true, true);
    this.carsSpawned = 0;
    this.ammo = MAGAZINE_SIZE;
    this.reloading = false;
    this.reloadGauge?.destroy();
    this.reloadGauge = undefined;
    this.guideHideTimer?.remove();
    this.guidePath?.destroy();
    this.guidePath = undefined;
    this.guideHideTimer?.remove();
    this.guideHideTimer = undefined;
    this.dashMotion?.stop();
    this.player.setAlpha(1);
    this.player.setScale(1);
    this.startMarker?.destroy();
    this.startLabel?.destroy();
    this.walls.clear(true, true);
    this.createMaze(config.mazeWalls);
    this.startMarker = this.add.circle(START_X, START_Y, 18, 0xf1f1f1, 1)
      .setStrokeStyle(4, 0x222222, 1)
      .setDepth(-1);
    this.startLabel = this.add.text(START_X, START_Y - 64, 'スタート', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#222222',
      backgroundColor: '#f1f1f1',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(21);
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
          delay: (ROUND_TIME_LIMIT_SECONDS * 1000) / config.carsPerRound,
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
    const config = ROUND_CONFIGS[this.round - 1];
    if (!config || this.paused || this.transitioning || this.carsSpawned >= config.carsPerRound) {
      return;
    }
    const lane = Phaser.Math.Between(0, config.laneCount - 1);
    const laneHeight = (WORLD_SIZE - 160) / config.laneCount;
    const y = Phaser.Math.Between(
      Math.floor(120 + lane * laneHeight + 20),
      Math.floor(120 + (lane + 1) * laneHeight - 20),
    );
    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const x = Phaser.Math.Between(40, WORLD_SIZE - 40);
    const car = this.cars.create(x, y, 'car') as Phaser.Physics.Arcade.Sprite;
    const speed = Phaser.Math.Between(
      Math.floor(config.carSpeed * 0.7),
      Math.ceil(config.carSpeed * 1.3),
    );
    car.setVelocityX(fromLeft ? speed : -speed);
    car.setFlipX(!fromLeft);
    car.setData('direction', fromLeft ? 1 : -1);
    this.carsSpawned += 1;
  }

  private updatePlayer(time: number): void {
    const baseSpeed = time < this.speedBoostUntil ? 330 : 210;
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-baseSpeed);
      this.shotDirectionX = 0;
      this.shotDirectionY = -1;
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(baseSpeed);
      this.shotDirectionX = 0;
      this.shotDirectionY = 1;
    } else {
      this.player.setVelocityY(0);
    }
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-baseSpeed);
      this.shotDirectionX = -1;
      this.shotDirectionY = 0;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(baseSpeed);
      this.shotDirectionX = 1;
      this.shotDirectionY = 0;
    } else {
      this.player.setVelocityX(0);
    }

    if (this.player.body && this.player.body.velocity.length() > baseSpeed) {
      this.player.body.velocity.normalize().scale(baseSpeed);
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, 30, WORLD_SIZE - 30);

    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && time >= this.speedBoostUntil) {
      if (time >= this.dashReadyAt) {
        this.speedBoostUntil = time + DASH_DURATION_MS;
        this.dashReadyAt = this.speedBoostUntil;
        this.createDashMotion();
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && time >= this.warpReadyAt) {
      const previousX = this.player.x;
      const previousY = this.player.y;
      this.player.x = Phaser.Math.Clamp(
        this.player.x + this.shotDirectionX * 125,
        30,
        WORLD_SIZE - 30,
      );
      this.player.y = Phaser.Math.Clamp(
        this.player.y + this.shotDirectionY * 125,
        82,
        WORLD_SIZE - 82,
      );
      this.createWarpMotion(previousX, previousY);
      this.warpReadyAt = time + WARP_COOLDOWN_MS;
    }
  }

  private createDashMotion(): void {
    this.dashMotion?.stop();
    this.dashMotion = this.tweens.add({
      targets: this.player,
      alpha: 0.55,
      duration: 140,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updateDashGauge(time: number): void {
    const remaining = Phaser.Math.Clamp((this.speedBoostUntil - time) / DASH_DURATION_MS, 0, 1);
    const x = 20;
    const y = this.scale.height - 38;
    const width = SIDEBAR_WIDTH - 40;
    this.dashGauge?.clear();
    this.dashGauge?.fillStyle(0x666666, 1);
    this.dashGauge?.fillRect(x, y, width, 10);
    this.dashGauge?.fillStyle(0xffffff, 1);
    this.dashGauge?.fillRect(x, y, width * remaining, 10);
    if (remaining <= 0) {
      this.dashMotion?.stop();
      this.player.setAlpha(1);
      this.player.setScale(1);
    }
  }

  private createWarpMotion(previousX: number, previousY: number): void {
    const trail = this.add.circle(previousX, previousY, 18, 0xaaaaaa, 0.7)
      .setStrokeStyle(4, 0x222222, 1)
      .setDepth(15);
    this.tweens.add({
      targets: trail,
      radius: 70,
      alpha: 0,
      duration: 260,
      onComplete: () => trail.destroy(),
    });
    this.tweens.add({
      targets: this.player,
      scaleX: 1.35,
      scaleY: 0.7,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private fireWeapon(time: number): void {
    if (this.reloading) {
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.reloadKey) || this.ammo <= 0) {
      this.startReload(time);
      return;
    }
    if (!this.fireKey.isDown || time < this.nextShotAt) {
      return;
    }
    const bullet = this.bullets.create(
      this.player.x + this.shotDirectionX * 28,
      this.player.y + this.shotDirectionY * 28,
      'bullet',
    ) as Phaser.Physics.Arcade.Sprite;
    bullet.setVelocity(this.shotDirectionX * 760, this.shotDirectionY * 760);
    bullet.setAngle(this.shotDirectionX !== 0 ? (this.shotDirectionX > 0 ? 90 : -90) : 0);
    this.ammo -= 1;
    this.nextShotAt = time + BULLET_FIRE_INTERVAL_MS;
  }

  private startReload(time: number): void {
    if (this.reloading) {
      return;
    }
    this.reloading = true;
    this.reloadStartedAt = time;
    this.reloadEndsAt = time + RELOAD_DURATION_MS;
    this.reloadGauge = this.add.graphics().setScrollFactor(0).setDepth(1002);
  }

  private updateReload(time: number): void {
    if (!this.reloading) {
      return;
    }
    const progress = Phaser.Math.Clamp(
      (time - this.reloadStartedAt) / RELOAD_DURATION_MS,
      0,
      1,
    );
    const centerX = SIDEBAR_WIDTH / 2;
    const centerY = this.scale.height - 100;
    const radius = 58;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;
    this.reloadGauge?.clear();
    this.reloadGauge?.lineStyle(8, 0x333333, 0.95);
    this.reloadGauge?.strokeCircle(centerX, centerY, radius);
    if (progress > 0) {
      this.reloadGauge?.lineStyle(10, 0xdddddd, 1);
      this.reloadGauge?.beginPath();
      for (let segment = 0; segment <= 32 * progress; segment += 1) {
        const angle = startAngle + (endAngle - startAngle) * (segment / (32 * progress));
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (segment === 0) {
          this.reloadGauge?.moveTo(x, y);
        } else {
          this.reloadGauge?.lineTo(x, y);
        }
      }
      this.reloadGauge?.strokePath();
    }
    if (time >= this.reloadEndsAt) {
      this.ammo = MAGAZINE_SIZE;
      this.reloading = false;
      this.reloadGauge?.destroy();
      this.reloadGauge = undefined;
    }
  }

  private updateGuideSkill(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.guideKey) && time >= this.guideReadyAt) {
      this.showGuidePath();
      this.guideReadyAt = time + GUIDE_COOLDOWN_MS;
    }
  }

  private showGuidePath(): void {
    this.guidePath?.destroy();
    this.guideHideTimer?.remove();
    this.guidePath = this.add.graphics().setDepth(10);
    this.guidePath.lineStyle(8, 0x333333, 0.9);
    this.guidePath.beginPath();
    this.guidePathPoints.forEach((point, index) => {
      const x = point.column * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
      const y = point.row * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
      if (index === 0) {
        this.guidePath?.moveTo(x, y);
      } else {
        this.guidePath?.lineTo(x, y);
      }
    });
    this.guidePath.strokePath();
    this.guideHideTimer = this.time.delayedCall(GUIDE_DISPLAY_MS, () => {
      this.guidePath?.destroy();
      this.guidePath = undefined;
      this.guideHideTimer = undefined;
    });
  }

  private createMaze(difficulty: number): void {
    const columns = MAZE_COLUMNS;
    const rows = MAZE_ROWS;
    const cellWidth = MAZE_CELL_SIZE;
    const cellHeight = MAZE_CELL_SIZE;
    const wallThickness = MAZE_WALL_THICKNESS;
    const openRight = Array.from({ length: rows }, () => Array(columns - 1).fill(false));
    const openDown = Array.from({ length: rows - 1 }, () => Array(columns).fill(false));
    const visited = Array.from({ length: rows }, () => Array(columns).fill(false));
    const startRow = rows - 1;
    const startColumn = START_COLUMN;
    const stack: Array<{ row: number; column: number }> = [{ row: startRow, column: startColumn }];
    visited[startRow][startColumn] = true;

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [
        { row: current.row - 1, column: current.column, direction: 'up' },
        { row: current.row + 1, column: current.column, direction: 'down' },
        { row: current.row, column: current.column - 1, direction: 'left' },
        { row: current.row, column: current.column + 1, direction: 'right' },
      ].filter((neighbor) => (
        neighbor.row >= 0
        && neighbor.row < rows
        && neighbor.column >= 0
        && neighbor.column < columns
        && !visited[neighbor.row][neighbor.column]
      ));

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const neighbor = neighbors[Phaser.Math.Between(0, neighbors.length - 1)];
      visited[neighbor.row][neighbor.column] = true;
      if (neighbor.direction === 'up') {
        openDown[neighbor.row][neighbor.column] = true;
      } else if (neighbor.direction === 'down') {
        openDown[current.row][current.column] = true;
      } else if (neighbor.direction === 'left') {
        openRight[neighbor.row][neighbor.column] = true;
      } else {
        openRight[current.row][current.column] = true;
      }
      stack.push({ row: neighbor.row, column: neighbor.column });
    }

    for (let opening = 0; opening < difficulty; opening += 1) {
      const row = Phaser.Math.Between(0, rows - 1);
      const column = Phaser.Math.Between(0, columns - 2);
      openRight[row][column] = true;
    }

    this.guidePathPoints = this.findMazePath(openRight, openDown);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        if (!openRight[row][column]) {
          this.addMazeWall(
            (column + 1) * cellWidth,
            row * cellHeight + cellHeight / 2,
            wallThickness,
            cellHeight + 2,
          );
        }
      }
    }

    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (!openDown[row][column]) {
          this.addMazeWall(
            column * cellWidth + cellWidth / 2,
            (row + 1) * cellHeight,
            cellWidth + 2,
            wallThickness,
          );
        }
      }
    }
  }

  private findMazePath(
    openRight: boolean[][],
    openDown: boolean[][],
  ): Array<{ row: number; column: number }> {
    const start = { row: MAZE_ROWS - 1, column: Math.floor(MAZE_COLUMNS / 2) };
    const goal = { row: 0, column: Math.floor(MAZE_COLUMNS / 2) };
    const keyFor = (cell: { row: number; column: number }): string => `${cell.row},${cell.column}`;
    const queue: Array<{ row: number; column: number }> = [start];
    const previous = new Map<string, { row: number; column: number } | undefined>();
    previous.set(keyFor(start), undefined);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }
      if (current.row === goal.row && current.column === goal.column) {
        break;
      }
      const neighbors: Array<{ row: number; column: number }> = [];
      if (current.row > 0 && openDown[current.row - 1][current.column]) {
        neighbors.push({ row: current.row - 1, column: current.column });
      }
      if (current.row < MAZE_ROWS - 1 && openDown[current.row][current.column]) {
        neighbors.push({ row: current.row + 1, column: current.column });
      }
      if (current.column > 0 && openRight[current.row][current.column - 1]) {
        neighbors.push({ row: current.row, column: current.column - 1 });
      }
      if (current.column < MAZE_COLUMNS - 1 && openRight[current.row][current.column]) {
        neighbors.push({ row: current.row, column: current.column + 1 });
      }
      for (const neighbor of neighbors) {
        if (!previous.has(keyFor(neighbor))) {
          previous.set(keyFor(neighbor), current);
          queue.push(neighbor);
        }
      }
    }

    const path: Array<{ row: number; column: number }> = [];
    let current: { row: number; column: number } | undefined = goal;
    while (current) {
      path.unshift(current);
      current = previous.get(keyFor(current));
    }
    return path;
  }

  private addMazeWall(x: number, y: number, width: number, height: number): void {
    const wall = this.walls.create(x, y, 'wall') as Phaser.Physics.Arcade.Sprite;
    wall.setDisplaySize(width, height);
    if (wall.body) {
      wall.body.setSize(width, height);
    }
    wall.refreshBody();
  }

  private recycleCars(): void {
    for (const child of this.cars.children) {
      const car = child as Phaser.Physics.Arcade.Sprite;
      if (car.x < -120 || car.x > WORLD_SIZE + 120) {
        car.destroy();
      }
    }
  }

  private recycleBullets(): void {
    for (const child of this.bullets.children) {
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (bullet.x < -40 || bullet.x > WORLD_SIZE + 40 || bullet.y < -40 || bullet.y > WORLD_SIZE + 40) {
        bullet.destroy();
      }
    }
  }

  private handleBulletHit(
    bulletObject: Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    carObject: Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ): void {
    const bullet = bulletObject as unknown as Phaser.Physics.Arcade.Sprite;
    const car = carObject as unknown as Phaser.Physics.Arcade.Sprite;
    if (!bullet.active || !car.active) {
      return;
    }
    bullet.destroy();
    car.destroy();
    this.score += 50;
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

    const x = Phaser.Math.Between(150, WORLD_SIZE - 150);
    const y = Phaser.Math.Between(200, WORLD_SIZE - 200);
    const zone = this.add.rectangle(x, y, 120, 76, 0x888888, 0.45)
      .setStrokeStyle(4, 0x222222, 1);
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
      this.dropBomb();
    });
  }

  private dropBomb(): void {
    const config = ROUND_CONFIGS[this.round - 1];
    const bombCount = config?.bombCount ?? 1;
    for (let index = 0; index < bombCount; index += 1) {
      const bombX = Phaser.Math.Between(100, WORLD_SIZE - 100);
      const bombTargetY = Phaser.Math.Between(160, WORLD_SIZE - 160);
      const bomb = this.bombs.create(bombX, 45, 'bomb') as Phaser.Physics.Arcade.Sprite;
      bomb.setVelocity(0, 500);
      bomb.setData('targetY', bombTargetY);
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
    const explosion = this.add.circle(x, y, 24, 0xaaaaaa, 0.9)
      .setStrokeStyle(5, 0xffffff, 1);
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
    this.bullets.clear(true, true);
    this.guidePath?.destroy();
    this.guideHideTimer?.remove();
    this.reloadGauge?.destroy();
    this.dashGauge?.destroy();
    this.dashMotion?.stop();
    this.player.setAlpha(1);
    this.player.setScale(1);
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
    const guide = Math.max(0, (this.guideReadyAt - time) / 1000);
    this.hud.setText([
      `ラウンド ${this.round} / 3`,
      `残り時間  ${Math.max(0, ROUND_TIME_LIMIT_SECONDS - this.roundSeconds).toFixed(1)} 秒`,
      `スコア ${this.score}`,
      `弾薬  ${this.reloading ? 'リロード中' : `${this.ammo} / ${MAGAZINE_SIZE}`}`,
      `衝突  ${this.hits} / 2`,
      '',
      '[SHIFT] ダッシュ（最大10秒）',
      `  ${boost > 0 ? `残り ${boost.toFixed(1)}秒` : '準備完了'}`,
      '[SPACE] ワープ',
      `  ${warp > 0 ? `あと ${warp.toFixed(1)}秒` : '準備完了'}`,
      '[G] 道案内（5秒）',
      `  ${guide > 0 ? `あと ${guide.toFixed(1)}秒` : '準備完了'}`,
      '[F] 連射   [R] リロード',
      '矢印キー: 移動',
    ]);
  }
}