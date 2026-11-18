update(_time: number, delta: number) {
  if (!this.player) return;

  const speed = 0.18 * Math.min(delta, 32);

  let dx = 0;
  let dy = 0;

  // Keyboard input
  if (this.cursors && this.wasd) {
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;
  }

  // Keyboard takes priority over joystick
  if (dx === 0 && dy === 0) {
    dx = this.joystickVector.x;
    dy = this.joystickVector.y;
  }

  // Normalize movement
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length > 1) {
    dx /= length;
    dy /= length;
  }

  const currentX = this.player.x;
  const currentY = this.player.y;

  const nextX = currentX + dx * speed;
  const nextY = currentY + dy * speed;

  // Collision and boundary
  if (
    this.isInsideWorld(nextX, nextY) &&
    !this.collidesWithObstacle(nextX, nextY)
  ) {
    this.player.setPosition(nextX, nextY);
  } else {
    // Horizontal sliding
    if (
      this.isInsideWorld(nextX, currentY) &&
      !this.collidesWithObstacle(nextX, currentY)
    ) {
      this.player.x = nextX;
    }

    // Vertical sliding
    if (
      this.isInsideWorld(this.player.x, nextY) &&
      !this.collidesWithObstacle(this.player.x, nextY)
    ) {
      this.player.y = nextY;
    }
  }

  this.player.setDepth(this.player.y);

  this.updateInteractionTarget();

  // Interaction
  if (
    this.interactKey &&
    Phaser.Input.Keyboard.JustDown(this.interactKey)
  ) {
    this.interactNearbyObject();
  }
}
