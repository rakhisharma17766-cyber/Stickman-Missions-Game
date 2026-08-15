/**
 * Physics.js
 * High-performance 2D Physics and Collision System for Stickman Demon Hunter
 */

export const PhysicsConfig = {
  GRAVITY: 1800,           // Pixels/sec^2
  GROUND_FRICTION: 0.84,    // Damping factor on ground
  AIR_RESISTANCE: 0.94,     // Damping factor in air
  MAX_FALL_SPEED: 1200,     // Terminal velocity
  DASH_DRAG: 0.92           // Damping during high-speed dash
};

export class Physics {
  /**
   * Applies downward gravity acceleration
   */
  static applyGravity(body, dt) {
    if (body.isFlying || body.isDashing || body.isStatic) return;
    body.vy += PhysicsConfig.GRAVITY * dt;
    if (body.vy > PhysicsConfig.MAX_FALL_SPEED) {
      body.vy = PhysicsConfig.MAX_FALL_SPEED;
    }
  }

  /**
   * Applies surface friction or air resistance to horizontal velocity
   */
  static applyFriction(body, frictionMultiplier = 0.88) {
    body.vx *= frictionMultiplier;
    if (Math.abs(body.vx) < 2) {
      body.vx = 0;
    }
  }

  /**
   * Integrates velocity into coordinate position
   */
  static updatePosition(body, dt) {
    body.x += body.vx * dt;
    body.y += body.vy * dt;
  }

  /**
   * Resolves ground collision where body.y is the feet position
   */
  static checkGround(body, groundY) {
    if (body.isFlying) {
      body.isGrounded = false;
      return;
    }
    if (body.y >= groundY) {
      body.y = groundY;
      body.vy = 0;
      body.isGrounded = true;
    } else {
      body.isGrounded = false;
    }
  }

  /**
   * Integrated update method for enemies
   */
  static updateBody(body, dt, groundY) {
    if (body.isStatic) return;

    if (!body.isFlying && !body.isDashing) {
      body.vy += PhysicsConfig.GRAVITY * dt;
      if (body.vy > PhysicsConfig.MAX_FALL_SPEED) {
        body.vy = PhysicsConfig.MAX_FALL_SPEED;
      }
    }

    if (body.isGrounded) {
      body.vx *= Math.pow(PhysicsConfig.GROUND_FRICTION, dt * 60);
    } else if (!body.isFlying) {
      body.vx *= Math.pow(PhysicsConfig.AIR_RESISTANCE, dt * 60);
    }

    body.x += body.vx * dt;
    body.y += body.vy * dt;

    if (!body.isFlying && body.y >= groundY) {
      body.y = groundY;
      body.vy = 0;
      body.isGrounded = true;
    } else if (!body.isFlying) {
      body.isGrounded = false;
    }
  }

  /**
   * Axis-Aligned Bounding Box (AABB) intersection check
   */
  static checkAABB(rectA, rectB) {
    return (
      rectA.x < rectB.x + rectB.width &&
      rectA.x + rectA.width > rectB.x &&
      rectA.y < rectB.y + rectB.height &&
      rectA.y + rectA.height > rectB.y
    );
  }

  /**
   * Checks collision between an attack arc/hitbox and a target hurtbox
   */
  static checkAttackHit(attackBox, target) {
    const targetBox = {
      x: target.x - (target.width || 32) / 2,
      y: target.y - (target.height || 60),
      width: target.width || 32,
      height: target.height || 60
    };
    return this.checkAABB(attackBox, targetBox);
  }

  /**
   * Applies knockback impulse from attacker to victim
   */
  static applyKnockback(target, direction, impulseX = 350, impulseY = -220) {
    target.vx = direction * impulseX;
    target.vy = impulseY;
    target.isGrounded = false;
  }

  /**
   * Constrains an entity within the horizontal bounds of the arena
   */
  static clampToBounds(entity, minX, maxX) {
    if (entity.x < minX) {
      entity.x = minX;
      if (entity.vx < 0) entity.vx = 0;
    } else if (entity.x > maxX) {
      entity.x = maxX;
      if (entity.vx > 0) entity.vx = 0;
    }
  }
}
