/**
 * Animations.js
 * Centralized procedural animation calculators, stickman limb kinematics,
 * neon slash arcs, and dynamic particle systems.
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(options) {
    const {
      x,
      y,
      count = 8,
      color = "#06b6d4",
      speedMin = 40,
      speedMax = 200,
      sizeMin = 2,
      sizeMax = 5,
      lifeMin = 0.2,
      lifeMax = 0.6,
      gravity = 400,
      shape = "circle" // "circle" | "spark" | "ring"
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = options.angle !== undefined 
        ? options.angle + (Math.random() - 0.5) * (options.spread || Math.PI * 0.5)
        : Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        maxLife: lifeMin + Math.random() * (lifeMax - lifeMin),
        gravity,
        shape
      });
    }
  }

  emitSlashSparks(x, y, facing = "right", color = "#06b6d4") {
    const baseAngle = facing === "right" ? 0 : Math.PI;
    this.emit({
      x,
      y,
      count: 14,
      color,
      angle: baseAngle,
      spread: Math.PI * 0.7,
      speedMin: 150,
      speedMax: 450,
      sizeMin: 2,
      sizeMax: 4.5,
      lifeMin: 0.2,
      lifeMax: 0.45,
      gravity: 500,
      shape: "spark"
    });
  }

  emitDemonBlood(x, y, facing = "right") {
    const baseAngle = facing === "right" ? Math.PI * 0.1 : Math.PI * 0.9;
    this.emit({
      x,
      y,
      count: 16,
      color: "#ef4444",
      angle: baseAngle,
      spread: Math.PI * 0.8,
      speedMin: 120,
      speedMax: 380,
      sizeMin: 3,
      sizeMax: 6,
      lifeMin: 0.3,
      lifeMax: 0.7,
      gravity: 700,
      shape: "circle"
    });
  }

  emitSoulBurst(x, y) {
    this.emit({
      x,
      y,
      count: 24,
      color: "#c084fc",
      speedMin: 80,
      speedMax: 260,
      sizeMin: 3,
      sizeMax: 7,
      lifeMin: 0.4,
      lifeMax: 0.9,
      gravity: -100, // Float upwards
      shape: "circle"
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.shape === "spark") {
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export const Animations = {
  /**
   * Draws a procedurally animated Stickman body with glowing cyber-neon joints
   */
  drawStickman(ctx, params) {
    const {
      x,
      y,
      facing = "right",
      state = "IDLE", // "IDLE" | "RUN" | "JUMP" | "FALL" | "SLASH_1" | "SLASH_2" | "SLASH_3" | "DASH" | "HURT"
      animTimer = 0,
      combo = 1,
      color = "#06b6d4",
      bladeColor = "#22d3ee",
      isDashing = false,
      alpha = 1.0,
      scale = 1.0
    } = params;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale * (facing === "left" ? -1 : 1), scale);

    // Dynamic Kinematics calculation
    const headRadius = 9;
    const bodyLength = 28;
    const limbWidth = 3.5;

    let headX = 0, headY = -56;
    let chestX = 0, chestY = -44;
    let pelvisX = 0, pelvisY = -24;
    
    // Legs
    let leftKneeX = -6, leftKneeY = -12, leftFootX = -8, leftFootY = 0;
    let rightKneeX = 6, rightKneeY = -12, rightFootX = 8, rightFootY = 0;

    // Arms
    let leftElbowX = -10, leftElbowY = -34, leftHandX = -12, leftHandY = -22;
    let rightElbowX = 10, rightElbowY = -34, rightHandX = 14, rightHandY = -22;

    // Blade angles
    let bladeAngle = -Math.PI * 0.35;
    let drawSlashArc = false;
    let slashArcProgress = 0;

    if (state === "IDLE") {
      const breath = Math.sin(animTimer * 4) * 1.5;
      headY += breath;
      chestY += breath * 0.8;
      bladeAngle = -Math.PI * 0.3 + Math.sin(animTimer * 2) * 0.08;
      rightHandX = 12;
      rightHandY = -26 + breath;
    } else if (state === "RUN") {
      const runCycle = animTimer * 12;
      const legSin = Math.sin(runCycle);
      const legCos = Math.cos(runCycle);
      
      headX = 4;
      chestX = 3;
      pelvisX = 0;
      
      // Running legs
      leftFootX = legSin * 16;
      leftFootY = Math.max(-14, -Math.abs(legCos) * 10);
      leftKneeX = leftFootX * 0.5 - 4;
      leftKneeY = -12 - Math.max(0, -legSin * 6);

      rightFootX = -legSin * 16;
      rightFootY = Math.max(-14, -Math.abs(-legCos) * 10);
      rightKneeX = rightFootX * 0.5 + 4;
      rightKneeY = -12 - Math.max(0, legSin * 6);

      // Running arms
      rightHandX = 16 - legSin * 8;
      rightHandY = -28 + legCos * 4;
      bladeAngle = -Math.PI * 0.4 + legSin * 0.2;
    } else if (state === "JUMP") {
      headY = -58;
      leftFootX = -8;
      leftFootY = -8;
      rightFootX = 10;
      rightFootY = -12;
      leftKneeY = -18;
      rightKneeY = -20;
      rightHandX = 14;
      rightHandY = -38;
      bladeAngle = -Math.PI * 0.7;
    } else if (state === "FALL") {
      headY = -54;
      leftFootX = -12;
      leftFootY = -4;
      rightFootX = 12;
      rightFootY = -4;
      rightHandX = 16;
      rightHandY = -20;
      bladeAngle = -Math.PI * 0.15;
    } else if (state.startsWith("SLASH")) {
      const slashProgress = Math.min(1, animTimer * 5);
      slashArcProgress = slashProgress;
      drawSlashArc = true;

      if (combo === 1) {
        // Horizontal forward cleave
        chestX = 6;
        headX = 4;
        rightHandX = 18 + Math.cos(slashProgress * Math.PI) * 14;
        rightHandY = -34 + Math.sin(slashProgress * Math.PI) * 16;
        bladeAngle = -Math.PI * 0.8 + slashProgress * Math.PI * 1.1;
      } else if (combo === 2) {
        // Upward crescent uppercut
        chestX = 8;
        rightHandX = 22 - Math.sin(slashProgress * Math.PI) * 10;
        rightHandY = -18 - slashProgress * 24;
        bladeAngle = Math.PI * 0.4 - slashProgress * Math.PI * 1.2;
      } else {
        // Stage 3: 360 Whirlwind Demonic Strike
        chestX = 10;
        rightHandX = 24 + Math.sin(slashProgress * Math.PI * 2) * 12;
        rightHandY = -36 + Math.cos(slashProgress * Math.PI * 2) * 10;
        bladeAngle = -Math.PI + slashProgress * Math.PI * 2.5;
      }
    } else if (state === "DASH") {
      headX = 16;
      chestX = 12;
      pelvisX = 4;
      leftFootX = -20;
      leftFootY = -10;
      rightFootX = -8;
      rightFootY = -4;
      rightHandX = 24;
      rightHandY = -30;
      bladeAngle = 0; // Blade thrust forward
    } else if (state === "HURT") {
      headX = -8;
      chestX = -6;
      pelvisX = -2;
      rightHandX = 6;
      rightHandY = -18;
      bladeAngle = -Math.PI * 0.1;
    }

    // Set Neon Stroke Properties
    ctx.strokeStyle = color;
    ctx.lineWidth = limbWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Draw Head
    ctx.fillStyle = "#0a0a14";
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Demon Eyes
    ctx.fillStyle = "#f43f5e";
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(headX + 3, headY - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Restore stick stroke shadow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Spine / Torso
    ctx.beginPath();
    ctx.moveTo(headX, headY + headRadius);
    ctx.lineTo(chestX, chestY);
    ctx.lineTo(pelvisX, pelvisY);
    ctx.stroke();

    // Left Leg (Behind)
    ctx.beginPath();
    ctx.moveTo(pelvisX, pelvisY);
    ctx.lineTo(leftKneeX, leftKneeY);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.stroke();

    // Right Leg (Foreground)
    ctx.beginPath();
    ctx.moveTo(pelvisX, pelvisY);
    ctx.lineTo(rightKneeX, rightKneeY);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.stroke();

    // Left Arm (Behind)
    ctx.beginPath();
    ctx.moveTo(chestX, chestY);
    ctx.lineTo(leftElbowX, leftElbowY);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.stroke();

    // Right Arm (Weapon Wielding)
    ctx.beginPath();
    ctx.moveTo(chestX, chestY);
    ctx.lineTo(rightElbowX, rightElbowY);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    // Neon Katana Blade
    ctx.save();
    ctx.translate(rightHandX, rightHandY);
    ctx.rotate(bladeAngle);
    
    // Katana Hilt
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Katana Glowing Blade
    ctx.strokeStyle = bladeColor;
    ctx.shadowColor = bladeColor;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(38, -3);
    ctx.stroke();

    // Inner White Laser Core
    ctx.strokeStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -0.5);
    ctx.lineTo(36, -2.5);
    ctx.stroke();

    ctx.restore();

    // Slash Arc Visual FX
    if (drawSlashArc) {
      ctx.save();
      ctx.strokeStyle = bladeColor;
      ctx.shadowColor = bladeColor;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 6 * (1 - slashArcProgress * 0.7);
      ctx.beginPath();
      const startAngle = combo === 1 ? -Math.PI * 0.5 : combo === 2 ? Math.PI * 0.4 : -Math.PI;
      const arcSweep = Math.PI * (combo === 3 ? 1.8 : 0.85);
      ctx.arc(10, -30, 48, startAngle, startAngle + arcSweep * slashArcProgress);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
};
