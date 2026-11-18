update(_time: number, delta: number) {
  if (!this.player) return;

  const speed = 0.18 * delta;

  let keyboardX = 0;
  let keyboardY = 0;

  // Keyboard input: WASD + Arrow Keys
  if (this.cursors && this.wasd) {
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      keyboardX -= 1;
    }

    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      keyboardX += 1;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      keyboardY -= 1;
    }

    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      keyboardY += 1;
    }
  }

  // Normalize keyboard diagonal movement
  const keyboardLength = Math.sqrt(
    keyboardX * keyboardX + keyboardY * keyboardY
  );

  if (keyboardLength > 1) {
    keyboardX /= keyboardLength;
    keyboardY /= keyboardLength;
  }

  // Joystick input
  const joyX = this.joystickVector.x;
  const joyY = this.joystickVector.y;

  // Combine inputs in screen-space
  let dx = keyboardX + joyX;
  let dy = keyboardY + joyY;

  // Normalize combined input
  const inputLength = Math.sqrt(dx * dx + dy * dy);

  if (inputLength > 1) {
    dx /= inputLength;
    dy /= inputLength;
  }

  const currentX = this.player.x;
  const currentY = this.player.y;

  const nextX = currentX + dx * speed;
  const nextY = currentY + dy * speed;

  // World boundary and collision checks
  if (
    this.isInsideWorld(nextX, nextY) &&
    !this.collidesWithObstacle(nextX, nextY)
  ) {
    this.player.setPosition(nextX, nextY);
  } else {
    // Allow sliding along walls and obstacles
    if (
      this.isInsideWorld(nextX, currentY) &&
      !this.collidesWithObstacle(nextX, currentY)
    ) {
      this.player.x = nextX;
    }

    if (
      this.isInsideWorld(this.player.x, nextY) &&
      !this.collidesWithObstacle(this.player.x, nextY)
    ) {
      this.player.y = nextY;
    }
  }

  this.player.setDepth(this.player.y);

  this.updateInteractionTarget();

  // Interaction key
  if (
    this.interactKey &&
    Phaser.Input.Keyboard.JustDown(this.interactKey)
  ) {
    this.interactNearbyObject();
  }
}
