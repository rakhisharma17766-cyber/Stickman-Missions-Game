/**
 * UIManager.js
 * In-game Canvas HUD: Health & 3-Lives Counter, Boss Health Bars,
 * Resurrect Notifications, Floating Damage Numbers, and Combo Meter.
 * Includes cross-browser Canvas roundRect polyfill fallback.
 */

// Helper to draw rounded rectangle safely across all mobile browsers
export function drawRoundRect(ctx, x, y, width, height, radius = 6) {
  if (width < 0) width = 0;
  if (height < 0) height = 0;
  const r = Math.min(radius, width / 2, height / 2);
  
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}

export class UIManager {
  constructor() {
    this.floatingTexts = [];
    this.screenShake = { intensity: 0, duration: 0, timer: 0 };
    this.displayedHp = 100;
  }

  addFloatingText(x, y, text, color = "#22d3ee", fontSize = 18) {
    this.floatingTexts.push({
      x: x + (Math.random() * 20 - 10),
      y: y,
      text: String(text),
      color,
      fontSize,
      vy: -55,
      life: 0.85,
      maxLife: 0.85
    });
  }

  addNotification(x, y, text, color = "#fbbf24") {
    this.addFloatingText(x, y, text, color, 18);
  }

  addDamageText(x, y, amount, isCrit = false, isPlayer = false) {
    const text = isCrit ? `CRIT! -${Math.round(amount)}` : `-${Math.round(amount)}`;
    const color = isPlayer ? "#f43f5e" : isCrit ? "#fbbf24" : "#22d3ee";
    this.addFloatingText(x, y, text, color, isCrit ? 22 : 16);
  }

  triggerScreenShake(intensity = 8, duration = 0.25) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
    this.screenShake.timer = 0;
  }

  triggerShake(intensity = 6, duration = 0.2) {
    this.triggerScreenShake(intensity, duration);
  }

  update(dt) {
    // Update floating damage texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.timer += dt;
      if (this.screenShake.timer >= this.screenShake.duration) {
        this.screenShake.intensity = 0;
        this.screenShake.duration = 0;
      }
    }
  }

  applyScreenShake(ctx) {
    if (this.screenShake.intensity > 0 && this.screenShake.duration > 0) {
      const decay = Math.max(0, 1 - this.screenShake.timer / this.screenShake.duration);
      const offsetX = (Math.random() - 0.5) * this.screenShake.intensity * decay * 2;
      const offsetY = (Math.random() - 0.5) * this.screenShake.intensity * decay * 2;
      ctx.translate(offsetX, offsetY);
    }
  }

  draw(ctx, gameState) {
    const { player, levelConfig, currentKills, boss } = gameState;
    const w = ctx.canvas.width;

    if (!player) return;

    // Smoothly interpolate displayed HP bar
    this.displayedHp += (player.health - this.displayedHp) * 0.15;

    // 1. PLAYER HUD (Health Bar & 3 Lives Counter) - Top Left
    ctx.save();
    const hudX = 20;
    const hudY = 20;
    const barWidth = Math.min(180, Math.max(120, w * 0.22));
    const barHeight = 12;

    // Outer Glass Container
    ctx.fillStyle = "rgba(8, 8, 14, 0.85)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundRect(ctx, hudX - 8, hudY - 8, barWidth + 72, 68, 12);
    ctx.fill();
    ctx.stroke();

    // Hunter Avatar Silhouette Icon
    ctx.fillStyle = "#050505";
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hudX + 16, hudY + 16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Stickman Eye in Avatar
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(hudX + 19, hudY + 15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Health Bar Background Track
    const healthX = hudX + 42;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    drawRoundRect(ctx, healthX, hudY + 4, barWidth, barHeight, 4);
    ctx.fill();

    // Damage Lag / Ghost Bar
    const lagPct = Math.max(0, Math.min(1, this.displayedHp / player.maxHealth));
    ctx.fillStyle = "rgba(244, 63, 94, 0.45)";
    ctx.beginPath();
    drawRoundRect(ctx, healthX, hudY + 4, barWidth * lagPct, barHeight, 4);
    ctx.fill();

    // Main Health Bar Fill (Cyan to Emerald Gradient)
    const healthPct = Math.max(0, Math.min(1, player.health / player.maxHealth));
    const hpGrad = ctx.createLinearGradient(healthX, 0, healthX + barWidth, 0);
    hpGrad.addColorStop(0, "#06b6d4");
    hpGrad.addColorStop(1, "#10b981");
    ctx.fillStyle = hpGrad;
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    drawRoundRect(ctx, healthX, hudY + 4, barWidth * healthPct, barHeight, 4);
    ctx.fill();

    // HP Text Numeric
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`HP ${Math.ceil(player.health)}/${player.maxHealth}`, healthX + 4, hudY + 14);

    // LIVES COUNTER (3 Stickman Hearts)
    const livesY = hudY + 24;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 9px monospace";
    ctx.fillText("LIVES:", healthX, livesY + 9);

    for (let i = 0; i < player.maxLives; i++) {
      const isAlive = i < player.lives;
      const lx = healthX + 40 + i * 20;
      const ly = livesY + 2;

      ctx.save();
      if (isAlive) {
        // Glowing Active Life Stickman Icon
        ctx.fillStyle = "#f43f5e";
        ctx.strokeStyle = "#f43f5e";
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.arc(lx + 4, ly + 3, 3, Math.PI, 0);
        ctx.arc(lx + 10, ly + 3, 3, Math.PI, 0);
        ctx.lineTo(lx + 7, ly + 10);
        ctx.closePath();
        ctx.fill();
      } else {
        // Lost Life (Hollow Gray Outline)
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lx + 4, ly + 3, 3, Math.PI, 0);
        ctx.arc(lx + 10, ly + 3, 3, Math.PI, 0);
        ctx.lineTo(lx + 7, ly + 10);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Dash Ready Indicator
    const dashY = hudY + 42;
    const isDashReady = player.dashCooldown <= 0;
    ctx.fillStyle = isDashReady ? "#22d3ee" : "#64748b";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(isDashReady ? "⚡ DASH [EVADE] READY" : "⏳ DASH CHARGING...", healthX, dashY + 8);

    ctx.restore();

    // 2. MISSION OBJECTIVE (Top Right HUD)
    ctx.save();
    const objWidth = Math.min(220, Math.max(160, w * 0.28));
    const objX = w - objWidth - 20;
    const objY = 20;

    ctx.fillStyle = "rgba(8, 8, 14, 0.85)";
    ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundRect(ctx, objX, objY - 8, objWidth, 54, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f43f5e";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`SECTOR ${levelConfig.id} MISSION`, objX + 10, objY + 8);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    if (levelConfig.winCondition.type === "KILL_COUNT") {
      const target = levelConfig.winCondition.targetCount;
      ctx.fillText(`DEMONS: ${currentKills} / ${target}`, objX + 10, objY + 26);
      
      // Mini Progress bar
      const pPct = Math.min(1, currentKills / target);
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(objX + 10, objY + 32, objWidth - 20, 4);
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(objX + 10, objY + 32, (objWidth - 20) * pPct, 4);
    } else {
      ctx.fillText(boss && !boss.isDead ? "SLAY DEMON OVERLORD" : "SECTOR CLEARED", objX + 10, objY + 26);
    }
    ctx.restore();

    // 3. COMBO MULTIPLIER (Left Mid)
    if (player.comboCount > 1) {
      ctx.save();
      const comboX = 32;
      const comboY = 125;
      const comboScale = Math.min(1.3, 1 + player.comboCount * 0.04);

      ctx.translate(comboX, comboY);
      ctx.scale(comboScale, comboScale);
      
      ctx.font = "900 28px system-ui, sans-serif";
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 14;
      ctx.fillText(`x${player.comboCount}`, 0, 0);

      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      ctx.fillText(player.comboCount >= 10 ? "DEMON SLAYER!" : "COMBO STRIKE", 0, 14);
      ctx.restore();
    }

    // 4. RESPAWN / REVIVED BANNER
    if (player.respawnBannerTimer > 0) {
      ctx.save();
      const bannerAlpha = Math.min(1, player.respawnBannerTimer);
      ctx.globalAlpha = bannerAlpha;
      ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
      ctx.strokeStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2;

      const bw = Math.min(360, w * 0.65);
      const bx = (w - bw) / 2;
      const by = 80;
      ctx.beginPath();
      drawRoundRect(ctx, bx, by, bw, 38, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`✦ SOUL RESURRECTED — ${player.lives} LIVES REMAINING ✦`, w / 2, by + 24);
      ctx.restore();
    }

    // 5. BOSS HEALTH BAR (Top Center)
    if (boss && !boss.isDead) {
      ctx.save();
      const bossBarWidth = Math.min(380, w * 0.5);
      const bossBarX = (w - bossBarWidth) / 2;
      const bossBarY = 24;

      ctx.fillStyle = "rgba(10, 5, 15, 0.92)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      drawRoundRect(ctx, bossBarX - 8, bossBarY - 10, bossBarWidth + 16, 34, 8);
      ctx.fill();
      ctx.stroke();

      const bossHpPct = Math.max(0, Math.min(1, boss.health / boss.maxHealth));
      const bossGrad = ctx.createLinearGradient(bossBarX, 0, bossBarX + bossBarWidth, 0);
      bossGrad.addColorStop(0, "#ef4444");
      bossGrad.addColorStop(1, "#a855f7");
      ctx.fillStyle = bossGrad;
      ctx.beginPath();
      drawRoundRect(ctx, bossBarX, bossBarY - 2, bossBarWidth * bossHpPct, 16, 4);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`DEMON OVERLORD — ${Math.ceil(boss.health)} / ${boss.maxHealth}`, w / 2, bossBarY + 10);
      ctx.restore();
    }

    // 6. FLOATING DAMAGE & COMBAT TEXTS
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${ft.fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
