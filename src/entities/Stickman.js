/**
 * Stickman.js
 * Core Player Entity for Stickman Demon Hunter
 * Features Kinematics, Health & Lives Progression, 3-Hit Katana Combos,
 * Air Acrobatics, Ghost-Trail Dashing, and Instant Resurrections.
 */

import { Physics } from '../engine/Physics';
import { Animations } from '../graphics/Animations';
import { AudioFX } from '../utils/AudioFX';
import { PlayerProfile } from '../state/PlayerProfile';

export class Stickman {
  constructor(startX = 200, startY = 400) {
    this.x = startX;
    this.y = startY;
    this.startX = startX;
    this.startY = startY;

    this.vx = 0;
    this.vy = 0;
    this.width = 32;
    this.height = 68;

    // Load dynamic Dojo Upgrades from Profile
    const profile = PlayerProfile.getProfile();
    const bladeLevel = profile.upgrades?.bladeDamage || 1;
    const armorLevel = profile.upgrades?.armor || 1;
    const agilityLevel = profile.upgrades?.agility || 1;

    // Health & Lives System (Requirement: 3 Lives per battle, respawns with full HP)
    this.maxLives = 3;
    this.lives = 3;
    this.maxHealth = 100 + (armorLevel - 1) * 25;
    this.health = this.maxHealth;
    this.isDead = false;

    // Movement & Combat Stats
    this.moveSpeed = 340 + (agilityLevel - 1) * 20;
    this.jumpForce = -680;
    this.baseDamage = 25 + (bladeLevel - 1) * 12;
    this.critChance = 0.2 + (bladeLevel - 1) * 0.05;

    // States: "IDLE" | "RUN" | "JUMP" | "FALL" | "SLASH_1" | "SLASH_2" | "SLASH_3" | "DASH" | "HURT"
    this.state = "IDLE";
    this.facing = "right";
    this.isGrounded = false;
    this.animTimer = 0;

    // Combat Combo System
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMaxWindow = 1.6;
    this.attackPhase = 0; // 1, 2, 3
    this.attackDuration = 0.22;
    this.attackTimer = 0;
    this.hasHitThisAttack = false;

    // Dash Mechanic
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashSpeed = 820;
    this.ghostTrails = [];

    // Respawn / Invulnerability
    this.invulnerableTimer = 0;
    this.respawnBannerTimer = 0;
    this.hitStunTimer = 0;
  }

  handleInput(input) {
    if (this.isDead || this.hitStunTimer > 0) return;

    // Attack Action
    if (input.attack && this.attackTimer <= 0 && this.dashTimer <= 0) {
      this.executeAttack();
      return;
    }

    // Dash Action
    if (input.dash && this.dashCooldown <= 0 && this.attackTimer <= 0) {
      this.executeDash();
      return;
    }

    // Horizontal Movement (Only if not attacking)
    if (this.attackTimer <= 0 && this.dashTimer <= 0) {
      if (input.left) {
        this.vx = -this.moveSpeed;
        this.facing = "left";
      } else if (input.right) {
        this.vx = this.moveSpeed;
        this.facing = "right";
      } else {
        this.vx = 0;
      }

      // Jump
      if (input.jump && this.isGrounded) {
        this.vy = this.jumpForce;
        this.isGrounded = false;
        this.state = "JUMP";
        AudioFX.playJump();
      }
    }
  }

  executeAttack() {
    this.attackPhase = (this.attackPhase % 3) + 1;
    this.attackTimer = this.attackPhase === 3 ? 0.32 : 0.22;
    this.hasHitThisAttack = false;
    this.state = `SLASH_${this.attackPhase}`;
    this.animTimer = 0;

    // Forward combat momentum lunge
    this.vx = (this.facing === "right" ? 1 : -1) * (140 + this.attackPhase * 70);

    AudioFX.playSlash(this.attackPhase);
  }

  executeDash() {
    this.dashTimer = 0.22;
    this.dashCooldown = 0.9;
    this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.25);
    this.state = "DASH";
    this.animTimer = 0;
    this.vx = (this.facing === "right" ? 1 : -1) * this.dashSpeed;
    this.vy = 0;

    AudioFX.playDash();
  }

  takeDamage(damage, sourceX, uiManager, particleSystem) {
    if (this.isDead || this.invulnerableTimer > 0) return;

    this.health = Math.max(0, this.health - damage);
    this.invulnerableTimer = 1.0;
    this.hitStunTimer = 0.18;
    this.state = "HURT";
    this.animTimer = 0;

    // Reset Combo on taking heavy damage
    this.comboCount = 0;

    // Knockback
    const knockDir = this.x < sourceX ? -1 : 1;
    this.vx = knockDir * 280;
    this.vy = -180;

    // Visual & Audio triggers
    AudioFX.playPlayerHurt();
    uiManager?.addFloatingText(this.x, this.y - 60, `-${Math.round(damage)}`, "#f43f5e", 18);
    uiManager?.triggerScreenShake(8, 0.22);
    particleSystem?.emitDemonBlood(this.x, this.y - 30, this.facing);

    // Life Lost & Respawn Check
    if (this.health <= 0) {
      this.handleLifeLost(uiManager, particleSystem);
    }
  }

  handleLifeLost(uiManager, particleSystem) {
    this.lives--;

    if (this.lives > 0) {
      // RESPAWN THE PLAYER
      this.health = this.maxHealth;
      this.invulnerableTimer = 2.8; // 2.8s Mercy invulnerability
      this.respawnBannerTimer = 2.0;
      this.hitStunTimer = 0;
      this.vx = 0;
      this.vy = -120;
      this.state = "IDLE";

      AudioFX.playRespawn();
      particleSystem?.emitRespawnAura(this.x, this.y - 30);
      uiManager?.addFloatingText(this.x, this.y - 80, `REVIVED! (${this.lives} LIVES LEFT)`, "#22d3ee", 22);
      uiManager?.triggerScreenShake(12, 0.35);
    } else {
      // PERMANENT DEFEAT
      this.isDead = true;
      this.lives = 0;
      AudioFX.playDefeat();
      particleSystem?.emitSoulBurst(this.x, this.y - 30);
      uiManager?.addFloatingText(this.x, this.y - 80, "VESSEL SHATTERED", "#ef4444", 26);
    }
  }

  update(dt, groundY, particleSystem) {
    if (this.isDead) return;

    this.animTimer += dt;

    // Timers
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.respawnBannerTimer > 0) this.respawnBannerTimer -= dt;
    if (this.hitStunTimer > 0) this.hitStunTimer -= dt;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Ghost Trails during Dash
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.ghostTrails.push({
        x: this.x,
        y: this.y,
        facing: this.facing,
        state: this.state,
        animTimer: this.animTimer,
        alpha: 0.6
      });
      if (this.dashTimer <= 0) {
        this.vx = 0;
        this.state = "IDLE";
      }
    }

    // Update Ghost Trails
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      this.ghostTrails[i].alpha -= dt * 3.5;
      if (this.ghostTrails[i].alpha <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }

    // Attack State Lifecycle
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.state = this.isGrounded ? "IDLE" : (this.vy > 0 ? "FALL" : "JUMP");
      }
    }

    // Physics Update
    if (this.dashTimer <= 0) {
      Physics.applyGravity(this, dt);
      Physics.applyFriction(this, this.isGrounded ? 0.88 : 0.98);
    }
    Physics.updatePosition(this, dt);
    Physics.checkGround(this, groundY);

    // Dynamic State Resolution if not attacking or dashing
    if (this.attackTimer <= 0 && this.dashTimer <= 0 && this.hitStunTimer <= 0) {
      if (!this.isGrounded) {
        this.state = this.vy > 0 ? "FALL" : "JUMP";
      } else if (Math.abs(this.vx) > 30) {
        this.state = "RUN";
      } else {
        this.state = "IDLE";
      }
    }
  }

  getAttackHitbox() {
    if (this.attackTimer <= 0 || this.hasHitThisAttack) return null;

    const reach = this.attackPhase === 3 ? 95 : 75;
    const hitboxWidth = reach;
    const hitboxHeight = 70;

    const isCrit = Math.random() < this.critChance;
    const damageMultiplier = this.attackPhase === 3 ? 2.2 : (this.attackPhase === 2 ? 1.4 : 1.0);
    const totalDamage = this.baseDamage * damageMultiplier * (isCrit ? 1.8 : 1.0);

    return {
      x: this.facing === "right" ? this.x + 5 : this.x - hitboxWidth - 5,
      y: this.y - this.height + 5,
      width: hitboxWidth,
      height: hitboxHeight,
      damage: totalDamage,
      isCrit
    };
  }

  draw(ctx) {
    if (this.isDead) return;

    // 1. Draw Ghost Dash Clones
    for (const trail of this.ghostTrails) {
      Animations.drawStickman(ctx, {
        x: trail.x,
        y: trail.y,
        facing: trail.facing,
        state: trail.state,
        animTimer: trail.animTimer,
        color: "#06b6d4",
        accentColor: "#22d3ee",
        bladeColor: "#06b6d4",
        alpha: trail.alpha * 0.4
      });
    }

    // 2. Invulnerability Flickering
    let heroAlpha = 1.0;
    if (this.invulnerableTimer > 0) {
      heroAlpha = Math.sin(this.animTimer * 28) > 0 ? 0.4 : 0.95;
    }

    // 3. Draw Authentic Black Stickman Hero
    Animations.drawStickman(ctx, {
      x: this.x,
      y: this.y,
      facing: this.facing,
      state: this.state,
      animTimer: this.animTimer,
      combo: this.attackPhase,
      color: "#050505",
      accentColor: "#06b6d4",
      bladeColor: "#22d3ee",
      alpha: heroAlpha,
      isInvulnerable: this.invulnerableTimer > 0
    });

    // 4. Respawn Shield Visual Ring
    if (this.invulnerableTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - 34, 28, 44, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
