/**
 * Enemies.js
 * Extensible Demon AI Entity Hierarchy (GroundBrute, FlyingGargoyle, DemonLordBoss)
 */

import { Physics } from '../engine/Physics';
import { AudioFX } from '../utils/AudioFX';

export class BaseEnemy {
  constructor(x, y, config = {}) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = config.width || 34;
    this.height = config.height || 60;
    this.type = config.type || "BaseEnemy";
    this.facing = "left";
    
    this.maxHealth = config.maxHealth || 60;
    this.health = this.maxHealth;
    this.speed = config.speed || 140;
    this.damage = config.damage || 15;
    this.scoreValue = config.scoreValue || 100;
    this.coinDrop = config.coinDrop || 20;

    this.isGrounded = false;
    this.isFlying = !!config.isFlying;
    this.isDead = false;

    // AI & Combat timers
    this.attackRange = config.attackRange || 55;
    this.attackCooldown = config.attackCooldown || 1.8;
    this.attackCooldownTimer = Math.random() * 1.0;
    this.isAttacking = false;
    this.attackWindup = 0;
    this.attackDuration = config.attackDuration || 0.35;
    this.hitTimer = 0;

    // Visuals
    this.color = config.color || "#ef4444";
    this.accentColor = config.accentColor || "#f43f5e";
    this.animTimer = Math.random() * 10;
  }

  update(dt, player, groundY) {
    if (this.isDead) return;

    this.animTimer += dt;
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;

    // Determine facing direction towards player
    const distToPlayer = player.x - this.x;
    this.facing = distToPlayer > 0 ? "right" : "left";

    // AI State logic
    const absDistX = Math.abs(distToPlayer);
    const absDistY = Math.abs(player.y - this.y);

    if (this.isAttacking) {
      this.attackWindup += dt;
      if (this.attackWindup >= this.attackDuration) {
        this.isAttacking = false;
        this.attackWindup = 0;
      }
    } else if (absDistX < this.attackRange && absDistY < 70 && this.attackCooldownTimer <= 0) {
      // Initiate Attack
      this.isAttacking = true;
      this.attackWindup = 0;
      this.attackCooldownTimer = this.attackCooldown;
      this.vx = 0;
    } else {
      // Chase Player
      const dir = distToPlayer > 0 ? 1 : -1;
      this.vx = dir * this.speed;
    }

    Physics.updateBody(this, dt, groundY);
  }

  takeDamage(amount, isCrit = false, fromX = 0, uiManager = null, particles = null) {
    if (this.isDead) return;

    this.health -= amount;
    this.hitTimer = 0.2;

    // Knockback
    const knockDir = this.x > fromX ? 1 : -1;
    Physics.applyKnockback(this, knockDir, isCrit ? 360 : 200, -160);

    AudioFX.playHit(isCrit);

    if (uiManager) {
      uiManager.addDamageText(this.x, this.y - this.height * 0.7, Math.ceil(amount), isCrit, false);
      if (isCrit && typeof uiManager.triggerScreenShake === "function") {
        uiManager.triggerScreenShake(6, 0.18);
      }
    }

    if (particles) {
      particles.emitSlashSparks(this.x, this.y - this.height * 0.5, this.facing, isCrit ? "#fbbf24" : "#22d3ee");
      particles.emitDemonBlood(this.x, this.y - this.height * 0.5, this.facing);
    }

    if (this.health <= 0) {
      this.die(uiManager, particles);
    }
  }

  die(uiManager = null, particles = null) {
    this.isDead = true;
    AudioFX.playDemonDeath();
    if (particles) {
      particles.emitSoulBurst(this.x, this.y - this.height * 0.5);
    }
    if (uiManager && typeof uiManager.addFloatingText === "function") {
      uiManager.addFloatingText(this.x, this.y - this.height, `+${this.coinDrop} COINS`, "#fbbf24", 16);
    }
  }

  getAttackHitbox() {
    if (!this.isAttacking || this.attackWindup < this.attackDuration * 0.4) return null;
    const reach = this.attackRange + 10;
    const x = this.facing === "right" ? this.x : this.x - reach;
    return {
      x,
      y: this.y - this.height * 0.8,
      width: reach,
      height: this.height * 0.7,
      damage: this.damage,
      fromX: this.x
    };
  }

  draw(ctx) {
    // Base implementation overridden in sub-classes
  }
}

/**
 * GroundBrute: Heavy demonic brute with red warclub and horns
 */
export class GroundBrute extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 85,
      speed: 120,
      damage: 18,
      scoreValue: 150,
      coinDrop: 35,
      color: "#dc2626",
      accentColor: "#f87171",
      width: 40,
      height: 68,
      attackRange: 60,
      attackCooldown: 2.0,
      type: "GroundBrute"
    });
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing === "left" ? -1 : 1, 1);

    const isHit = this.hitTimer > 0;
    const mainColor = isHit ? "#ffffff" : this.color;
    const glowColor = isHit ? "#ffffff" : this.accentColor;

    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    const animCycle = this.animTimer * 6;
    const legSwing = Math.sin(animCycle) * 14;

    // Head
    const headY = -62;
    ctx.beginPath();
    ctx.arc(0, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Demonic Horns
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(-6, headY - 8);
    ctx.lineTo(-12, headY - 22);
    ctx.lineTo(-2, headY - 10);
    ctx.moveTo(6, headY - 8);
    ctx.lineTo(12, headY - 22);
    ctx.lineTo(2, headY - 10);
    ctx.fill();

    // Glowing Yellow Demon Eyes
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(4, headY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Torso
    ctx.beginPath();
    ctx.moveTo(0, headY + 11);
    ctx.lineTo(0, -26);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(legSwing, 0);
    ctx.moveTo(0, -26);
    ctx.lineTo(-legSwing, 0);
    ctx.stroke();

    // Demon Spiked Club
    const attackAngle = this.isAttacking 
      ? -Math.PI * 0.4 + (this.attackWindup / this.attackDuration) * Math.PI * 1.1 
      : Math.sin(this.animTimer * 3) * 0.2;

    ctx.save();
    ctx.translate(14, -40);
    ctx.rotate(attackAngle);

    // Arm
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Club Shaft & Spikes
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(36, -6);
    ctx.stroke();

    // Spiked Club Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(36, -6, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Health Bar overhead
    const hpPct = Math.max(0, this.health / this.maxHealth);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(-22, headY - 28, 44, 5);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-22, headY - 28, 44 * hpPct, 5);

    ctx.restore();
  }
}

/**
 * FlyingGargoyle: Fast aerial flyer with crimson bat wings and diving claw strikes
 */
export class FlyingGargoyle extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 50,
      speed: 210,
      damage: 14,
      scoreValue: 180,
      coinDrop: 40,
      color: "#9333ea", // Neon purple demon
      accentColor: "#c084fc",
      width: 38,
      height: 48,
      attackRange: 80,
      isFlying: true,
      attackCooldown: 1.6,
      type: "FlyingGargoyle"
    });
    this.targetAltitude = y;
    this.diveSpeed = 380;
    this.isDiving = false;
  }

  update(dt, player, groundY) {
    if (this.isDead) return;

    this.animTimer += dt;
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;

    const distToPlayerX = player.x - this.x;
    const distToPlayerY = player.y - this.y;
    this.facing = distToPlayerX > 0 ? "right" : "left";

    // Sine-wave aerial hovering
    const hoverY = (groundY - 180) + Math.sin(this.animTimer * 4) * 35;

    if (this.isAttacking) {
      this.attackWindup += dt;
      // Dive towards player
      this.vx = (distToPlayerX > 0 ? 1 : -1) * this.diveSpeed;
      this.vy = 240;

      if (this.attackWindup >= this.attackDuration) {
        this.isAttacking = false;
        this.attackWindup = 0;
      }
    } else if (Math.abs(distToPlayerX) < 220 && this.attackCooldownTimer <= 0) {
      // Initiate swoop attack
      this.isAttacking = true;
      this.attackWindup = 0;
      this.attackCooldownTimer = this.attackCooldown;
    } else {
      // Maintain air patrol
      this.vx = (distToPlayerX > 0 ? 1 : -1) * this.speed;
      this.vy = (hoverY - this.y) * 3.5;
    }

    Physics.updateBody(this, dt, groundY);
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing === "left" ? -1 : 1, 1);

    const isHit = this.hitTimer > 0;
    const mainColor = isHit ? "#ffffff" : this.color;
    const glowColor = isHit ? "#ffffff" : this.accentColor;

    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;

    const wingFlap = Math.sin(this.animTimer * 14) * 22;
    const headY = -34;

    // Demon Wings
    ctx.fillStyle = "rgba(147, 51, 234, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-32, -34 + wingFlap);
    ctx.lineTo(-14, -10);
    ctx.lineTo(0, -18);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(32, -34 - wingFlap);
    ctx.lineTo(14, -10);
    ctx.lineTo(0, -18);
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, headY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(4, headY - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Talons / Claws
    ctx.strokeStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(0, headY + 9);
    ctx.lineTo(0, -8);
    ctx.lineTo(8, 6);
    ctx.moveTo(0, -8);
    ctx.lineTo(-8, 6);
    ctx.stroke();

    // Health Bar
    const hpPct = Math.max(0, this.health / this.maxHealth);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(-18, headY - 20, 36, 4);
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(-18, headY - 20, 36 * hpPct, 4);

    ctx.restore();
  }
}

/**
 * DemonLordBoss: Demonic Overlord with dual flame scythes, teleport lunges, and arena shake
 */
export class DemonLordBoss extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 650,
      speed: 160,
      damage: 32,
      scoreValue: 1200,
      coinDrop: 300,
      color: "#e11d48",
      accentColor: "#f43f5e",
      width: 65,
      height: 100,
      attackRange: 110,
      attackCooldown: 1.4,
      attackDuration: 0.5,
      type: "DemonLordBoss"
    });
    this.phase = 1;
    this.rageTimer = 0;
  }

  update(dt, player, groundY) {
    super.update(dt, player, groundY);
    if (this.isDead) return;

    // Enrage phase under 50% HP
    if (this.health < this.maxHealth * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.speed = 240;
      this.attackCooldown = 0.9;
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing === "left" ? -1 : 1, 1);

    const isHit = this.hitTimer > 0;
    const mainColor = isHit ? "#ffffff" : this.phase === 2 ? "#f97316" : this.color;
    const glowColor = isHit ? "#ffffff" : this.phase === 2 ? "#fbbf24" : this.accentColor;

    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 22;

    const headY = -92;

    // Giant Demon Crown Horns
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(-10, headY - 8);
    ctx.lineTo(-24, headY - 36);
    ctx.lineTo(-4, headY - 14);
    ctx.moveTo(10, headY - 8);
    ctx.lineTo(24, headY - 36);
    ctx.lineTo(4, headY - 14);
    ctx.fill();

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, headY, 16, 0, Math.PI * 2);
    ctx.fill();

    // Burning Demon Eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(6, headY - 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Massive Body
    ctx.beginPath();
    ctx.moveTo(0, headY + 16);
    ctx.lineTo(0, -40);
    ctx.stroke();

    // Heavy Stomping Legs
    const walkAnim = Math.sin(this.animTimer * 5) * 18;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(walkAnim, 0);
    ctx.moveTo(0, -40);
    ctx.lineTo(-walkAnim, 0);
    ctx.stroke();

    // Dual Hellfire Scythe
    const scytheAngle = this.isAttacking 
      ? -Math.PI * 0.8 + (this.attackWindup / this.attackDuration) * Math.PI * 2.0 
      : Math.sin(this.animTimer * 3) * 0.3;

    ctx.save();
    ctx.translate(22, -60);
    ctx.rotate(scytheAngle);

    // Scythe Staff
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-20, 20);
    ctx.lineTo(40, -40);
    ctx.stroke();

    // Scythe Flaming Blade
    ctx.strokeStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(40, -40, 36, -Math.PI * 0.5, Math.PI * 0.2);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }
}

/**
 * Factory for instantiating enemies dynamically from Level configuration
 */
export function createEnemy(type, x, y) {
  switch (type) {
    case "FlyingGargoyle":
      return new FlyingGargoyle(x, y);
    case "DemonLordBoss":
      return new DemonLordBoss(x, y);
    case "GroundBrute":
    default:
      return new GroundBrute(x, y);
  }
}
