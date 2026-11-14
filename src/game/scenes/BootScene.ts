
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  private tileWidth = 64;
  private tileHeight = 32;

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

    this.add.text(480, 550, 'WORLD INITIALIZED', {
      fontSize: '14px',
      color: '#d8e4e8',
    }).setOrigin(0.5);
  }
}
