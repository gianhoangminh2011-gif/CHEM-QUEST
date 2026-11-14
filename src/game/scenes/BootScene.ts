import Phaser from 'phaser';
import Player from '../entities/Player';

export default class BootScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // Virtual joystick
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickVector = new Phaser.Math.Vector2(0, 0);

  private readonly joystickX = 92;
  private readonly joystickY = 500;
  private readonly joystickRadius = 48;
  private readonly joystickMaxDistance = 34;

  private readonly centerX = 480;
  private readonly centerY = 302;
  private readonly mapRadiusX = 350;
  private readonly mapRadiusY = 175;

  constructor() {
    super('BootScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#14251d');

    this.drawWorld();
    this.drawPond();
    this.createEnvironment();
    this.createWorldLabels();

    // Player
    this.player = new Player(
      this,
      this.centerX,
      this.centerY
    );

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();

      this.wasd = {
        up: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.W
        ),
        down: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.S
        ),
        left: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.A
        ),
        right: this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.D
        ),
      };
    }

    // Mobile touch controls
    this.createTouchControls();
  }

  private createTouchControls() {
    // Joystick base
    this.joystickBase = this.add.circle(
      this.joystickX,
      this.joystickY,
      this.joystickRadius,
      0x101b17,
      0.62
    );

    this.joystickBase.setStrokeStyle(
      3,
      0xd5b878,
      0.9
    );

    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(100000);

    // Joystick thumb
    this.joystickThumb = this.add.circle(
      this.joystickX,
      this.joystickY,
      18,
      0xd5b878,
      0.95
    );

    this.joystickThumb.setStrokeStyle(
      2,
      0xf5e5b8,
      1
    );

    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(100001);

    // Joystick label
    const label = this.add.text(
      this.joystickX,
      this.joystickY + 59,
      'MOVE',
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#f0d99d',
        fontStyle: 'bold',
        letterSpacing: 2,
      }
    );

    label.setOrigin(0.5);
    label.setScrollFactor(0);
    label.setDepth(100002);

    // Touch begins
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer) => {
        if (
          this.joystickPointerId !== null ||
          pointer.x > 170 ||
          pointer.y < 400
        ) {
          return;
        }

        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      }
    );

    // Touch moves
    this.input.on(
      'pointermove',
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.id !== this.joystickPointerId) {
          return;
        }

        this.updateJoystick(pointer);
      }
    );

    // Touch ends
    this.input.on(
      'pointerup',
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.id === this.joystickPointerId) {
          this.releaseJoystick();
        }
      }
    );

    this.input.on(
      'pointerupoutside',
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.id === this.joystickPointerId) {
          this.releaseJoystick();
        }
      }
    );
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.joystickX;
    const dy = pointer.y - this.joystickY;

    const distance = Math.sqrt(
      dx * dx + dy * dy
    );

    const clampedDistance = Math.min(
      distance,
      this.joystickMaxDistance
    );

    const angle = Math.atan2(dy, dx);

    const moveX =
      Math.cos(angle) * clampedDistance;

    const moveY =
      Math.sin(angle) * clampedDistance;

    this.joystickThumb.setPosition(
      this.joystickX + moveX,
      this.joystickY + moveY
    );

    this.joystickVector.set(
      moveX / this.joystickMaxDistance,
      moveY / this.joystickMaxDistance
    );
  }

  private releaseJoystick() {
    this.joystickPointerId = null;

    this.joystickVector.set(0, 0);

    this.joystickThumb.setPosition(
      this.joystickX,
      this.joystickY
    );
  }

  private drawWorld() {
    const graphics = this.add.graphics();

    const tileWidth = 64;
    const tileHeight = 32;
    const columns = 14;
    const rows = 12;
    const originX = this.centerX;
    const originY = 110;

    // Isometric ground
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x =
          originX + (col - row) * (tileWidth / 2);

        const y =
          originY + (col + row) * (tileHeight / 2);

        const points = [
          new Phaser.Math.Vector2(x, y),
          new Phaser.Math.Vector2(
            x + tileWidth / 2,
            y + tileHeight / 2
          ),
          new Phaser.Math.Vector2(
            x,
            y + tileHeight
          ),
          new Phaser.Math.Vector2(
            x - tileWidth / 2,
            y + tileHeight / 2
          ),
        ];

        const colors = [
          0x315a45,
          0x365f49,
          0x294d3b,
          0x3b654b,
        ];

        const color =
          colors[(row * 3 + col * 7) % colors.length];

        graphics.fillStyle(color, 1);
        graphics.fillPoints(points, true);

        graphics.lineStyle(
          1,
          0x6c9670,
          0.22
        );

        graphics.strokePoints(points, true);
      }
    }

    // Soft forest floor details
    const details = this.add.graphics();

    for (let i = 0; i < 65; i++) {
      const x = 150 + ((i * 137) % 660);
      const y = 135 + ((i * 83) % 350);

      details.fillStyle(
        i % 2 === 0 ? 0x8aa66a : 0x6d9460,
        0.22
      );

      details.fillCircle(
        x,
        y,
        1 + (i % 3)
      );
    }

    details.setDepth(2);
  }

  private drawPond() {
    // Pond shadow
    const shadow = this.add.ellipse(
      650,
      320,
      190,
      75,
      0x10251e,
      0.45
    );

    shadow.setDepth(3);

    // Water
    const water = this.add.ellipse(
      650,
      302,
      174,
      66,
      0x245c5a,
      0.95
    );

    water.setStrokeStyle(3, 0x78a99a, 0.8);
    water.setDepth(4);

    // Water highlights
    const highlights = this.add.graphics();

    highlights.lineStyle(2, 0x9ccbbb, 0.55);

    highlights.lineBetween(605, 290, 640, 285);
    highlights.lineBetween(660, 310, 692, 305);
    highlights.lineBetween(620, 318, 638, 315);

    highlights.setDepth(5);

    // Shore stones
    const stones = [
      [570, 293],
      [585, 330],
      [700, 278],
      [725, 310],
      [674, 338],
    ];

    stones.forEach(([x, y], index) => {
      const stone = this.add.ellipse(
        x,
        y,
        15 + (index % 2) * 5,
        8,
        0x89917b
      );

      stone.setDepth(y);
    });
  }

  private createEnvironment() {
    // Forest trees
    this.addTree(280, 250, 1.1);
    this.addTree(410, 180, 0.85);
    this.addTree(650, 180, 1);
    this.addTree(730, 270, 1.15);
    this.addTree(300, 370, 0.95);
    this.addTree(620, 390, 1.1);

    // Smaller trees
    this.addTree(365, 410, 0.65);
    this.addTree(540, 155, 0.7);
    this.addTree(790, 350, 0.7);

    // Crystal discoveries
    this.addCrystal(540, 210);
    this.addCrystal(760, 335);
    this.addCrystal(225, 310);

    // Rocks
    this.addRock(350, 315);
    this.addRock(570, 390);
    this.addRock(790, 235);

    // Bushes
    this.addBush(460, 400);
    this.addBush(210, 350);
    this.addBush(720, 405);
  }

  private addTree(
    x: number,
    y: number,
    scale = 1
  ) {
    const shadow = this.add.ellipse(
      0,
      12,
      48,
      20,
      0x10251b,
      0.4
    );

    const trunk = this.add.rectangle(
      0,
      -4,
      15,
      35,
      0x795438
    );

    trunk.setStrokeStyle(2, 0x513b2a);

    const leavesBack = this.add.circle(
      0,
      -33,
      25,
      0x244c36
    );

    const leavesLeft = this.add.circle(
      -13,
      -28,
      19,
      0x356747
    );

    const leavesRight = this.add.circle(
      13,
      -28,
      19,
      0x477b4d
    );

    const leavesTop = this.add.circle(
      0,
      -47,
      18,
      0x578653
    );

    const tree = this.add.container(
      x,
      y,
      [
        shadow,
        trunk,
        leavesBack,
        leavesLeft,
        leavesRight,
        leavesTop,
      ]
    );

    tree.setScale(scale);
    tree.setDepth(y);
  }

  private addCrystal(x: number, y: number) {
    const glow = this.add.ellipse(
      0,
      5,
      42,
      20,
      0x65d7bd,
      0.12
    );

    const crystalGraphics = this.add.graphics();

    // Main crystal
    crystalGraphics.fillStyle(0x4ec8b1, 1);

    crystalGraphics.fillPoints(
      [
        new Phaser.Math.Vector2(0, -27),
        new Phaser.Math.Vector2(12, -7),
        new Phaser.Math.Vector2(5, 12),
        new Phaser.Math.Vector2(-7, 12),
        new Phaser.Math.Vector2(-13, -7),
      ],
      true
    );

    crystalGraphics.lineStyle(
      2,
      0xb3fff0,
      0.8
    );

    crystalGraphics.strokePoints(
      [
        new Phaser.Math.Vector2(0, -27),
        new Phaser.Math.Vector2(12, -7),
        new Phaser.Math.Vector2(5, 12),
        new Phaser.Math.Vector2(-7, 12),
        new Phaser.Math.Vector2(-13, -7),
      ],
      true
    );

    // Crystal highlight
    crystalGraphics.fillStyle(0xc4fff0, 0.8);

    crystalGraphics.fillPoints(
      [
        new Phaser.Math.Vector2(0, -22),
        new Phaser.Math.Vector2(2, -5),
        new Phaser.Math.Vector2(-5, 5),
      ],
      true
    );

    const crystal = this.add.container(
      x,
      y,
      [glow, crystalGraphics]
    );

    crystal.setDepth(y);

    // Gentle glowing animation
    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private addRock(x: number, y: number) {
    const rock = this.add.ellipse(
      x,
      y,
      30,
      17,
      0x758578
    );

    rock.setStrokeStyle(2, 0x46594b);
    rock.setDepth(y);
  }

  private addBush(x: number, y: number) {
    const bush = this.add.container(x, y, [
      this.add.circle(-8, 0, 10, 0x315e3d),
      this.add.circle(5, -4, 12, 0x477b4d),
      this.add.circle(14, 2, 8, 0x5b8952),
    ]);

    bush.setDepth(y);
  }

  private createWorldLabels() {
    // World title
    const title = this.add.text(
      26,
      22,
      'EMERALD FRONTIER',
      {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#f0d99d',
        fontStyle: 'bold',
        letterSpacing: 2,
      }
    );

    title.setDepth(10000);

    const subtitle = this.add.text(
      28,
      48,
      'WORLD 01  /  THE BEGINNING',
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#b6c9ae',
        letterSpacing: 1,
      }
    );

    subtitle.setDepth(10000);

    // Small location marker
    const marker = this.add.text(
      26,
      565,
      '✦  UNKNOWN ELEMENTS DETECTED',
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#b9d9bd',
      }
    );

    marker.setDepth(10000);
  }

  update(_time: number, delta: number) {
    if (!this.cursors || !this.wasd || !this.player) {
      return;
    }

    const speed = 0.18 * delta;

    let dx = 0;
    let dy = 0;

    // Keyboard: left and right
    if (
      this.cursors.left.isDown ||
      this.wasd.left.isDown
    ) {
      dx -= 1;
    }

    if (
      this.cursors.right.isDown ||
      this.wasd.right.isDown
    ) {
      dx += 1;
    }

    // Keyboard: up and down
    if (
      this.cursors.up.isDown ||
      this.wasd.up.isDown
    ) {
      dy -= 1;
    }

    if (
      this.cursors.down.isDown ||
      this.wasd.down.isDown
    ) {
      dy += 1;
    }

    // Mobile joystick movement
    dx += this.joystickVector.x;
    dy += this.joystickVector.y;

    // Normalize diagonal movement
    const inputLength = Math.sqrt(
      dx * dx + dy * dy
    );

    if (inputLength > 1) {
      dx /= inputLength;
      dy /= inputLength;
    }

    // Isometric movement
    const isoX = (dx - dy) * speed;
    const isoY = (dx + dy) * speed * 0.5;

    const nextX = this.player.x + isoX;
    const nextY = this.player.y + isoY;

    // Diamond-shaped map boundary
    const distance =
      Math.abs(nextX - this.centerX) / this.mapRadiusX +
      Math.abs(nextY - this.centerY) / this.mapRadiusY;

    if (distance <= 0.96) {
      this.player.x = nextX;
      this.player.y = nextY;
    }

    // Depth sorting
    this.player.setDepth(this.player.y);
  }
}