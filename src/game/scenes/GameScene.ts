
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
    ground.fillRect(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    // Grid
    ground.lineStyle(1, 0x345343, 0.35);

    for (let x = 0; x <= this.worldWidth; x += 64) {
      ground.lineBetween(x, 0, x, this.worldHeight);
    }

    for (let y = 0; y <= this.worldHeight; y += 64) {
      ground.lineBetween(0, y, this.worldWidth, y);
    }

    ground.setDepth(-10);

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
    if (!this.input.keyboard) {
      throw new Error('Keyboard input unavailable');
    }

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

    this.createJoystick();

    // Pointer controls
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    // Reset input when focus is lost
    const resetInput = () => {
      this.input.keyboard?.resetKeys();
      this.releaseJoystick();
    };

    this.game.events.on('blur', resetInput);

    // Clean up scene listeners
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('blur', resetInput);
      this.input.off('pointerdown', this.onPointerDown, this);
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.input.off('pointerupoutside', this.onPointerUp, this);
      this.scale.off('resize', this.positionJoystick, this);
    });

    this.input.on('pointerdown', () => {
      this.game.canvas?.focus();
    });

    this.scale.on('resize', this.positionJoystick, this);
    this.positionJoystick();
  }

  // =========================
  // JOYSTICK
  // =========================

  private createJoystick() {
    this.joystickBase = this.add.circle(
      0,
      0,
      this.joystickRadius,
      0x18241d,
      0.45
    );

    this.joystickBase
      .setStrokeStyle(3, 0xb7d2ba, 0.55)
      .setScrollFactor(0)
      .setDepth(10000);

    this.joystickThumb = this.add.circle(
      0,
      0,
      25,
      0xb7d2ba,
      0.75
    );

    this.joystickThumb
      .setStrokeStyle(2, 0xffffff, 0.65)
      .setScrollFactor(0)
      .setDepth(10001);

    this.positionJoystick();
  }

  private positionJoystick() {
    if (!this.joystickBase || !this.joystickThumb) {
      return;
    }

    // Responsive position relative to viewport
    this.joystickOrigin.x = 100;
    this.joystickOrigin.y = this.scale.height - 100;

    this.joystickBase.setPosition(
      this.joystickOrigin.x,
      this.joystickOrigin.y
    );

    if (this.joystickPointerId === null) {
      this.joystickThumb.setPosition(
        this.joystickOrigin.x,
        this.joystickOrigin.y
      );
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.joystickPointerId !== null) return;

    // Only activate joystick in lower-left area
    if (
      pointer.x > 240 ||
      pointer.y < this.scale.height - 240
    ) {
      return;
    }

    this.joystickPointerId = pointer.id;
    this.updateJoystick(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.joystickPointerId) return;

    this.updateJoystick(pointer);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    let dx = pointer.x - this.joystickOrigin.x;
    let dy = pointer.y - this.joystickOrigin.y;

    const distance = Math.hypot(dx, dy);

    if (distance > this.joystickRadius) {
      const scale = this.joystickRadius / distance;
      dx *= scale;
      dy *= scale;
    }

    this.joystickVector.x = dx / this.joystickRadius;
    this.joystickVector.y = dy / this.joystickRadius;

    this.joystickThumb.setPosition(
      this.joystickOrigin.x + dx,
      this.joystickOrigin.y + dy
    );
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.joystickPointerId) return;

    this.releaseJoystick();
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

  // =========================
  // MOVEMENT
  // =========================

  update(_time: number, delta: number) {
    if (!this.player || !this.keys || !this.cursors) {
      return;
    }

    let dx = 0;
    let dy = 0;

    // Keyboard
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      dx -= 1;
    }

    if (this.cursors.right.isDown || this.keys.D.isDown) {
      dx += 1;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown) {
      dy -= 1;
    }

    if (this.cursors.down.isDown || this.keys.S.isDown) {
      dy += 1;
    }

    // Combine joystick and keyboard input
    dx += this.joystickVector.x;
    dy += this.joystickVector.y;

    // Normalize movement
    const length = Math.hypot(dx, dy);

    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    // Frame-rate independent movement
    const safeDelta = Math.min(delta, 32);
    const step = this.moveSpeed * safeDelta / 1000;

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
