/**
 * Animations.js
 * Centralized procedural animation calculators, Black Stickman limb kinematics,
 * flowing ninja bandana tails, neon slash arcs, and dynamic particle systems.
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
      count: 16,
      color,
      angle: baseAngle,
      spread: Math.PI * 0.75,
      speedMin: 180,
      speedMax: 480,
      sizeMin: 2,
      sizeMax: 5,
      lifeMin: 0.2,
      lifeMax: 0.45,
      gravity: 450,
      shape: "spark"
    });
  }

  emitDemonBlood(x, y, facing = "right") {
    const baseAngle = facing === "right" ? Math.PI * 0.1 : Math.PI * 0.9;
    this.emit({
      x,
      y,
      count: 18,
      color: "#ef4444",
      angle: baseAngle,
      spread: Math.PI * 0.8,
      speedMin: 140,
      speedMax: 400,
      sizeMin: 3,
      sizeMax: 6.5,
      lifeMin: 0.3,
      lifeMax: 0.7,
      gravity: 750,
      shape: "circle"
    });
  }

  emitSoulBurst(x, y) {
    this.emit({
      x,
      y,
      count: 28,
      color: "#c084fc",
      speedMin: 90,
      speedMax: 280,
      sizeMin: 3.5,
      sizeMax: 8,
      lifeMin: 0.4,
      lifeMax: 0.95,
      gravity: -120, // Float upwards
      shape: "circle"
    });
  }

  emitRespawnAura(x, y) {
    this.emit({
      x,
      y,
      count: 32,
      color: "#22d3ee",
      speedMin: 100,
      speedMax: 320,
      sizeMin: 4,
      sizeMax: 8,
      lifeMin: 0.6,
      lifeMax: 1.2,
      gravity: -180, // Ascending holy light
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
   * Draws a procedurally animated Authentic Black Stickman Hero with glowing demon bandana & joints
   */
  drawStickman(ctx, params) {
    const {
      x,
      y,
      facing = "right",
      state = "IDLE", // "IDLE" | "RUN" | "JUMP" | "FALL" | "SLASH_1" | "SLASH_2" | "SLASH_3" | "DASH" | "HURT"
      animTimer = 0,
      combo = 1,
      color = "#000000",
      accentColor = "#06b6d4",
      bladeColor = "#22d3ee",
      alpha = 1.0,
      scale = 1.0,
      isInvulnerable = false
    } = params;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale * (facing === "left" ? -1 : 1), scale);

    // Kinematics Dimensions
    const headRadius = 9.5;
    const limbWidth = 4.2; // Bold, authentic stickman line-weight

    let headX = 0, headY = -58;
    let chestX = 0, chestY = -45;
    let pelvisX = 0, pelvisY = -24;
    
    // Legs (Pelvis -> Knee -> Foot)
    let leftKneeX = -6, leftKneeY = -12, leftFootX = -8, leftFootY = 0;
    let rightKneeX = 6, rightKneeY = -12, rightFootX = 8, rightFootY = 0;

    // Arms (Chest -> Elbow -> Hand)
    let leftElbowX = -10, leftElbowY = -35, leftHandX = -12, leftHandY = -24;
    let rightElbowX = 10, rightElbowY = -35, rightHandX = 14, rightHandY = -24;

    // Katana angle
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
      const runCycle = animTimer * 14;
      const legSin = Math.sin(runCycle);
      const legCos = Math.cos(runCycle);
      
      headX = 6;
      chestX = 4;
      pelvisX = 0;
      
      // Running legs stride
      leftFootX = legSin * 18;
      leftFootY = Math.max(-15, -Math.abs(legCos) * 12);
      leftKneeX = leftFootX * 0.5 - 4;
      leftKneeY = -12 - Math.max(0, -legSin * 7);

      rightFootX = -legSin * 18;
      rightFootY = Math.max(-15, -Math.abs(-legCos) * 12);
      rightKneeX = rightFootX * 0.5 + 4;
      rightKneeY = -12 - Math.max(0, legSin * 7);

      // Running arms motion
      rightHandX = 18 - legSin * 10;
      rightHandY = -28 + legCos * 4;
      bladeAngle = -Math.PI * 0.4 + legSin * 0.25;
    } else if (state === "JUMP") {
      headY = -60;
      leftFootX = -10;
      leftFootY = -10;
      rightFootX = 12;
      rightFootY = -14;
      leftKneeY = -20;
      rightKneeY = -22;
      rightHandX = 16;
      rightHandY = -40;
      bladeAngle = -Math.PI * 0.75;
    } else if (state === "FALL") {
      headY = -56;
      leftFootX = -14;
      leftFootY = -4;
      rightFootX = 14;
      rightFootY = -4;
      rightHandX = 18;
      rightHandY = -20;
      bladeAngle = -Math.PI * 0.15;
    } else if (state.startsWith("SLASH")) {
      const slashProgress = Math.min(1, animTimer * 5.5);
      slashArcProgress = slashProgress;
      drawSlashArc = true;

      if (combo === 1) {
        // Combo 1: Horizontal forward cleave
        chestX = 8;
        headX = 6;
        rightHandX = 20 + Math.cos(slashProgress * Math.PI) * 16;
        rightHandY = -36 + Math.sin(slashProgress * Math.PI) * 18;
        bladeAngle = -Math.PI * 0.85 + slashProgress * Math.PI * 1.2;
      } else if (combo === 2) {
        // Combo 2: Upward crescent uppercut
        chestX = 10;
        rightHandX = 24 - Math.sin(slashProgress * Math.PI) * 12;
        rightHandY = -18 - slashProgress * 28;
        bladeAngle = Math.PI * 0.45 - slashProgress * Math.PI * 1.3;
      } else {
        // Combo 3: 360 Demonic Whirlwind strike
        chestX = 12;
        rightHandX = 26 + Math.sin(slashProgress * Math.PI * 2) * 14;
        rightHandY = -38 + Math.cos(slashProgress * Math.PI * 2) * 12;
        bladeAngle = -Math.PI + slashProgress * Math.PI * 2.6;
      }
    } else if (state === "DASH") {
      headX = 18;
      chestX = 14;
      pelvisX = 6;
      leftFootX = -22;
      leftFootY = -12;
      rightFootX = -10;
      rightFootY = -4;
      rightHandX = 26;
      rightHandY = -32;
      bladeAngle = 0; // Blade thrust forward
    } else if (state === "HURT") {
      headX = -10;
      chestX = -8;
      pelvisX = -4;
      rightHandX = 4;
      rightHandY = -16;
      bladeAngle = -Math.PI * 0.1;
    }

    // 1. Draw Flowing Ninja Bandana Tails (Flapping behind the stickman head)
    const ribbonWave = Math.sin(animTimer * 12) * 6;
    const ribbonWave2 = Math.cos(animTimer * 10) * 8;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.moveTo(headX - 6, headY);
    ctx.quadraticCurveTo(headX - 16, headY - 4 + ribbonWave, headX - 28, headY + 2 + ribbonWave2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(headX - 6, headY + 2);
    ctx.quadraticCurveTo(headX - 14, headY + 6 + ribbonWave, headX - 24, headY + 12 + ribbonWave);
    ctx.stroke();

    // 2. Pure Black Stickman Limbs and Body
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = limbWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = isInvulnerable ? "#22d3ee" : "transparent";
    ctx.shadowBlur = isInvulnerable ? 12 : 0;

    // Left Leg (Behind)
    ctx.beginPath();
    ctx.moveTo(pelvisX, pelvisY);
    ctx.lineTo(leftKneeX, leftKneeY);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.stroke();

    // Left Arm (Behind)
    ctx.beginPath();
    ctx.moveTo(chestX, chestY);
    ctx.lineTo(leftElbowX, leftElbowY);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.stroke();

    // Spine / Torso
    ctx.beginPath();
    ctx.moveTo(headX, headY + headRadius);
    ctx.lineTo(chestX, chestY);
    ctx.lineTo(pelvisX, pelvisY);
    ctx.stroke();

    // Right Leg (Foreground)
    ctx.beginPath();
    ctx.moveTo(pelvisX, pelvisY);
    ctx.lineTo(rightKneeX, rightKneeY);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.stroke();

    // Right Arm (Weapon Wielding)
    ctx.beginPath();
    ctx.moveTo(chestX, chestY);
    ctx.lineTo(rightElbowX, rightElbowY);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    // 3. Stickman Solid Black Head
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Glowing Cyan Demon Hunter Eyes
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(headX + 3.5, headY - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Bandana Forehead Knot
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(headX, headY - 2, headRadius + 0.5, -Math.PI * 0.7, Math.PI * 0.1);
    ctx.stroke();

    // 5. Neon Katana Weapon
    ctx.save();
    ctx.translate(rightHandX, rightHandY);
    ctx.rotate(bladeAngle);
    
    // Katana Hilt & Crossguard
    ctx.strokeStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Katana Glowing Blade
    ctx.strokeStyle = bladeColor;
    ctx.shadowColor = bladeColor;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(42, -3);
    ctx.stroke();

    // White Laser Blade Core
    ctx.strokeStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(2, -0.5);
    ctx.lineTo(40, -2.5);
    ctx.stroke();

    ctx.restore();

    // 6. Slash Arc Visual FX
    if (drawSlashArc) {
      ctx.save();
      ctx.strokeStyle = bladeColor;
      ctx.shadowColor = bladeColor;
      ctx.shadowBlur = 24;
      ctx.lineWidth = 7 * (1 - slashArcProgress * 0.7);
      ctx.beginPath();
      const startAngle = combo === 1 ? -Math.PI * 0.5 : combo === 2 ? Math.PI * 0.4 : -Math.PI;
      const arcSweep = Math.PI * (combo === 3 ? 2.0 : 0.9);
      ctx.arc(10, -30, 52, startAngle, startAngle + arcSweep * slashArcProgress);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
};
