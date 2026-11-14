
import Phaser from 'phaser';
import Player from '../entities/Player';

export default class BootScene extends Phaser.Scene {
  private tileWidth = 64;
  private tileHeight = 32;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super('BootScene');
  }

  create() {
    const graphics = this.add.graphics();
    const columns = 15;
    const rows = 12;
    const originX = 480;
    const originY = 100;

    graphics.lineStyle(1, 0x526574, 0.7);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = originX + (col - row) * (this.tileWidth / 2);
        const y = originY + (col + row) * (this.tileHeight / 2);

        const points = [
          new Phaser.Math.Vector2(x, y),
          new Phaser.Math.Vector2(x + this.tileWidth / 2, y + this.tileHeight / 2),
          new Phaser.Math.Vector2(x, y + this.tileHeight),
          new Phaser.Math.Vector2(x - this.tileWidth / 2, y + this.tileHeight / 2),
        ];

        graphics.fillStyle(
          (row + col) % 2 === 0 ? 0x294b45 : 0x31564c,
          1
        );
        graphics.fillPoints(points, true);
        graphics.strokePoints(points, true);
      }
    }

    this.add.text(480, 35, 'CHEM QUEST', {
      fontSize: '28px',
      color: '#f4d58d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(480, 570, 'WASD / ARROW KEYS TO MOVE', {
      fontSize: '14px',
      color: '#d8e4e8',
    }).setOrigin(0.5);

    this.player = new Player(this, originX, originY + 150);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  update(_time: number, delta: number) {
    if (!this.cursors || !this.wasd) return;

    const speed = 0.18 * delta;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      dx -= 1;
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      dx += 1;
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      dy -= 1;
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      dy += 1;
    }

    const isoX = (dx - dy) * speed;
    const isoY = (dx + dy) * speed * 0.5;

    this.player.x += isoX;
    this.player.y += isoY;
    this.player.setDepth(this.player.y);
  }
}
