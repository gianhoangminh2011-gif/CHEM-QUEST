import Phaser from 'phaser';
import Player from '../entities/Player';

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickVector = { x: 0, y: 0 };
  private joystickOrigin = { x: 100, y: 490 };
  private joystickRadius = 55;

  private worldWidth = 1800;
  private worldHeight = 1200;
  private moveSpeed = 220;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // World
    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    // Ground
    const ground = this.add.graphics();
    ground.fillStyle(0x20382d, 1);
    ground.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Grid
    ground.lineStyle(1, 0x345343, 0.35);

    for (let x = 0; x <= this.worldWidth; x += 64) {
      ground.lineBetween(x, 0, x, this.worldHeight);
    }

    for (let y = 0; y <= this.worldHeight; y += 64) {
      ground.lineBetween(0, y, this.worldWidth, y);
    }

    // Player
    this.player = new Player(
      this,
      this.worldWidth / 2,
      this.worldHeight / 2
    );

    // Camera
    this.cameras.main.startFollow(
      this.player,
      true,
      0.12,
      0.12
    );

    // Keyboard
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();

      this.keys = {
        W: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.W
        ),
        A: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.A
        ),
        S: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.S
        ),
        D: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.D
        ),
      };

      this.input.keyboard.addCapture(
        'W,A,S,D,UP,DOWN,LEFT,RIGHT'
      );
    }

    // Joystick
    this.createJoystick();

    // Release joystick when pointer leaves
    this.input.on('pointerup', this.releaseJoystick, this);
    this.input.on('pointerupoutside', this.releaseJoystick, this);

    // Reset keyboard on focus loss
    this.game.events.on('blur', () => {
      if (this.input.keyboard) {
        this.input.keyboard.resetKeys();
      }
      this.releaseJoystick();
    });

    this.input.on('pointerdown', () => {
      if (this.game.canvas) {
        this.game.canvas.focus();
      }
    });
  }

  private createJoystick() {
    this.joystickBase = this.add.circle(
      this.joystickOrigin.x,
      this.joystickOrigin.y,
      this.joystickRadius,
      0x18241d,
      0.45
    );

    this.joystickBase.setStrokeStyle(3, 0xb7d2ba, 0.55);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(10000);

    this.joystickThumb = this.add.circle(
      this.joystickOrigin.x,
      this.joystickOrigin.y,
      25,
      0xb7d2ba,
      0.75
    );

    this.joystickThumb.setStrokeStyle(2, 0xffffff, 0.65);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(10001);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < 240 && pointer.y > this.scale.height - 240) {
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId === pointer.id) {
        this.updateJoystick(pointer);
      }
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    let dx = pointer.x - this.joystickOrigin.x;
    let dy = pointer.y - this.joystickOrigin.y;

    const distance = Math.hypot(dx, dy);

    if (distance > this.joystickRadius) {
      dx = (dx / distance) * this.joystickRadius;
      dy = (dy / distance) * this.joystickRadius;
    }

    this.joystickVector.x = dx / this.joystickRadius;
    this.joystickVector.y = dy / this.joystickRadius;

    this.joystickThumb.setPosition(
      this.joystickOrigin.x + dx,
      this.joystickOrigin.y + dy
    );
  }

  private releaseJoystick() {
    this.joystickPointerId = null;
    this.joystickVector.x = 0;
    this.joystickVector.y = 0;

    if (this.joystickThumb) {
      this.joystickThumb.setPosition(
        this.joystickOrigin.x,
        this.joystickOrigin.y
      );
    }
  }

  update(_time: number, delta: number) {
    if (!this.player) return;

    let dx = 0;
    let dy = 0;

    // Keyboard input
    const left =
      this.cursors.left.isDown || this.keys.A.isDown;
    const right =
      this.cursors.right.isDown || this.keys.D.isDown;
    const up =
      this.cursors.up.isDown || this.keys.W.isDown;
    const down =
      this.cursors.down.isDown || this.keys.S.isDown;

    if (left) dx -= 1;
    if (right) dx += 1;
    if (up) dy -= 1;
    if (down) dy += 1;

    // Keyboard priority; joystick fallback
    if (dx === 0 && dy === 0) {
      dx = this.joystickVector.x;
      dy = this.joystickVector.y;
    }

    // Normalize diagonal
    const length = Math.hypot(dx, dy);

    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    // Delta-based movement
    const step = this.moveSpeed * Math.min(delta, 32) / 1000;

    const nextX = Phaser.Math.Clamp(
      this.player.x + dx * step,
      16,
      this.worldWidth - 16
    );

    const nextY = Phaser.Math.Clamp(
      this.player.y + dy * step,
      16,
      this.worldHeight - 16
    );

    this.player.setPosition(nextX, nextY);
    this.player.setDepth(nextY);
  }
}