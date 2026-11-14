import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Ground shadow
    const shadow = scene.add.ellipse(0, 12, 34, 13, 0x10271f, 0.4);

    // Backpack
    const backpack = scene.add.rectangle(-12, -7, 10, 19, 0x47735c);
    backpack.setStrokeStyle(2, 0x294b3d);

    // Body
    const coat = scene.add.rectangle(0, -4, 20, 25, 0x315c4b);
    coat.setStrokeStyle(2, 0x1d3b31);

    // Shirt
    const shirt = scene.add.triangle(
      0, -7,
      -5, 0,
      5, 0,
      0, 10,
      0xe9d8ad
    );

    // Head
    const head = scene.add.circle(0, -23, 9, 0xe8b98e);
    head.setStrokeStyle(2, 0x704b37);

    // Hair
    const hair = scene.add.arc(
      0, -26, 9,
      180, 360,
      false,
      0x382c27
    );
    hair.setStrokeStyle(5, 0x382c27);

    // Explorer badge
    const badge = scene.add.circle(7, -5, 3, 0xf4d58d);

    this.add([
      shadow,
      backpack,
      coat,
      shirt,
      head,
      hair,
      badge,
    ]);

    scene.add.existing(this);
    this.setDepth(y);
  }
}