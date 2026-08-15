/**
 * Stickman.js
 * Player Entity with 3-Stage Katana Combo, Aerial Leaping, Demon Dash, and Health/Upgrades
 */

import { Physics } from '../engine/Physics';
import { Animations } from '../graphics/Animations';
import { AudioFX } from '../utils/AudioFX';
import { PlayerProfile } from '../state/PlayerProfile';

export class Stickman {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 30;
    this.height = 58;
    this.facing = "right"; // "left" | "right"
    this.isGrounded = false;
    this.isFlying = false;
    this.isDead = false;

    // Upgrades calculation from PlayerProfile
    const profile = PlayerProfile.getProfile();
    const hpLevel = profile.upgrades.maxHealth || 1;
    const dmgLevel = profile.upgrades.bladeDamage || 1;
    const dashLevel = profile.upgrades.dashEnergy || 1;
    const critLevel = profile.upgrades.critRate || 1;

    this.maxHealth = 100 + (hpLevel - 1) * 25;
    this.health = this.maxHealth;
    this.baseDamage = 25 * (1 + (dmgLevel - 1) * 0.15);
    this.critChance = 0.10 + (critLevel - 1) * 0.05;

    // Movement speeds
    this.moveSpeed = 380;
    this.jumpForce = -720;
    
    // Combat & Combo
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMaxWindow = 2.0;
    this.attackPhase = 1; // 1, 2, 3
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackDuration = 0.22;
    this.attackHitboxes = [];
    this.hasHitThisAttack = false;

    // Dash
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.18;
    this.dashCooldown = Math.max(0.6, 1.4 - (dashLevel - 1) * 0.18);
    this.dashCooldownTimer = 0;
    this.dashSpeed = 950;
    this.dashTrail = [];

    // Invulnerability & Recoil
    this.invulnerableTimer = 0;
    this.hurtTimer = 0;

    // Visual Animation
    this.animState = "IDLE";
    this.animTimer = 0;
  }

  handleInput(inputState) {
    if (this.isDead) return;

    // Left / Right Movement
    if (!this.isDashing) {
      if (inputState.left) {
        this.vx = -this.moveSpeed;
        this.facing = "left";
      } else if (inputState.right) {
        this.vx = this.moveSpeed;
        this.facing = "right";
      }
    }

    // Jump
    if (inputState.jump && this.isGrounded && !this.isDashing) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      AudioFX.playJump();
      inputState.jump = false; // Consume input trigger
    }

    // Attack
    if (inputState.attack && !this.isAttacking && !this.isDashing) {
      this.executeAttack();
      inputState.attack = false;
    }

    // Dash
    if (inputState.dash && this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.executeDash();
      inputState.dash = false;
    }
  }

  executeAttack() {
    this.isAttacking = true;
    this.attackTimer = 0;
    this.hasHitThisAttack = false;

    // Progress combo
    if (this.comboTimer > 0) {
      this.attackPhase = (this.attackPhase % 3) + 1;
    } else {
      this.attackPhase = 1;
    }

    // Lunge forward slightly during attack
    const lungeDir = this.facing === "right" ? 1 : -1;
    this.vx = lungeDir * (this.attackPhase === 3 ? 320 : 180);

    AudioFX.playSlash(this.attackPhase);
  }

  executeDash() {
    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;
    this.invulnerableTimer = this.dashDuration + 0.1; // I-frames during dash
    
    const dashDir = this.facing === "right" ? 1 : -1;
    this.vx = dashDir * this.dashSpeed;
    this.vy = 0; // Level dash

    AudioFX.playDash();
  }

  update(dt, groundY, particles) {
    this.animTimer += dt;

    // Update Timers
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= dt;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
    }

    // Combo Decay Timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.attackPhase = 1;
      }
    }

    // Dash State
    if (this.isDashing) {
      this.dashTimer -= dt;
      // Record shadow trail for neon blur
      this.dashTrail.push({
        x: this.x,
        y: this.y,
        facing: this.facing,
        alpha: 0.6,
        state: "DASH"
      });

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Decay dash trail
    for (let i = this.dashTrail.length - 1; i >= 0; i--) {
      this.dashTrail[i].alpha -= dt * 3.5;
      if (this.dashTrail[i].alpha <= 0) {
        this.dashTrail.splice(i, 1);
      }
    }

    // Attack State
    if (this.isAttacking) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.attackDuration) {
        this.isAttacking = false;
      }
    }

    // Apply Physics
    Physics.updateBody(this, dt, groundY);

    // Determine Animation State
    if (this.hurtTimer > 0) {
      this.animState = "HURT";
    } else if (this.isDashing) {
      this.animState = "DASH";
    } else if (this.isAttacking) {
      this.animState = `SLASH_${this.attackPhase}`;
    } else if (!this.isGrounded) {
      this.animState = this.vy < 0 ? "JUMP" : "FALL";
    } else if (Math.abs(this.vx) > 30) {
      this.animState = "RUN";
    } else {
      this.animState = "IDLE";
    }
  }

  getAttackHitbox() {
    if (!this.isAttacking || this.hasHitThisAttack) return null;

    const reach = this.attackPhase === 3 ? 75 : 60;
    const height = 54;
    const x = this.facing === "right" ? this.x : this.x - reach;
    const y = this.y - this.height * 0.85;

    return {
      x,
      y,
      width: reach,
      height,
      damage: this.baseDamage * (this.attackPhase === 3 ? 1.8 : this.attackPhase === 2 ? 1.3 : 1.0),
      isCrit: Math.random() < this.critChance,
      facing: this.facing
    };
  }

  takeDamage(amount, fromX = 0, uiManager = null, particles = null) {
    if (this.invulnerableTimer > 0 || this.isDead) return false;

    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.25;
    this.invulnerableTimer = 0.6; // Brief mercy invulnerability

    // Knockback
    const knockDir = this.x > fromX ? 1 : -1;
    Physics.applyKnockback(this, knockDir, 280, -200);

    AudioFX.playPlayerHurt();

    if (uiManager) {
      uiManager.addDamageText(this.x, this.y - 30, Math.ceil(amount), false, true);
      uiManager.triggerShake(9, 0.28);
    }

    if (particles) {
      particles.emitDemonBlood(this.x, this.y - 30, this.facing);
    }

    if (this.health <= 0) {
      this.isDead = true;
      AudioFX.playDefeat();
    }

    return true;
  }

  draw(ctx) {
    // Draw Dash Ghost Trail
    for (const ghost of this.dashTrail) {
      Animations.drawStickman(ctx, {
        x: ghost.x,
        y: ghost.y,
        facing: ghost.facing,
        state: ghost.state,
        animTimer: this.animTimer,
        color: "#a855f7",
        bladeColor: "#c084fc",
        alpha: ghost.alpha
      });
    }

    // Invulnerability Blink
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
      // Skip draw frame for flicker
      return;
    }

    // Draw Main Stickman
    Animations.drawStickman(ctx, {
      x: this.x,
      y: this.y,
      facing: this.facing,
      state: this.animState,
      animTimer: this.animTimer,
      combo: this.attackPhase,
      color: "#06b6d4",
      bladeColor: "#22d3ee",
      alpha: 1.0
    });
  }
}
