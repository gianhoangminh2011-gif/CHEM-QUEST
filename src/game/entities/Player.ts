import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Container {
  private bodyShape: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bodyShape = scene.add.circle(0, 0, 13, 0xf4d58d);
    this.bodyShape.setStrokeStyle(3, 0x8c6335);

    const marker = scene.add.circle(0, -18, 5, 0xffffff);

    this.add([this.bodyShape, marker]);
    scene.add.existing(this);

    this.setDepth(y);
  }
}