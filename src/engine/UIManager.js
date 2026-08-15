/**
 * UIManager.js
 * In-game Canvas HUD: Health & 3-Lives Counter, Boss Health Bars,
 * Resurrect Notifications, Floating Damage Numbers, and Combo Meter.
 */

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
      text,
      color,
      fontSize,
      vy: -55,
      life: 0.85,
      maxLife: 0.85
    });
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
    if (this.screenShake.intensity > 0) {
      const decay = 1 - this.screenShake.timer / this.screenShake.duration;
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
    const barWidth = Math.min(200, w * 0.28);
    const barHeight = 14;

    // Outer Glass Container
    ctx.fillStyle = "rgba(8, 8, 14, 0.82)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hudX - 8, hudY - 8, barWidth + 72, 72, 12);
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
    const healthX = hudX + 44;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(healthX, hudY + 4, barWidth, barHeight, 4);
    ctx.fill();

    // Damage Lag / Ghost Bar
    const lagPct = Math.max(0, Math.min(1, this.displayedHp / player.maxHealth));
    ctx.fillStyle = "rgba(244, 63, 94, 0.45)";
    ctx.beginPath();
    ctx.roundRect(healthX, hudY + 4, barWidth * lagPct, barHeight, 4);
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
    ctx.roundRect(healthX, hudY + 4, barWidth * healthPct, barHeight, 4);
    ctx.fill();

    // HP Text Numeric
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`HP ${Math.ceil(player.health)} / ${player.maxHealth}`, healthX + 6, hudY + 15);

    // LIVES COUNTER (3 Stickman Hunter Icons / Hearts)
    const livesY = hudY + 26;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 10px monospace";
    ctx.fillText("LIVES:", healthX, livesY + 10);

    for (let i = 0; i < player.maxLives; i++) {
      const isAlive = i < player.lives;
      const lx = healthX + 44 + i * 22;
      const ly = livesY + 2;

      ctx.save();
      if (isAlive) {
        // Glowing Active Life Stickman Icon
        ctx.fillStyle = "#f43f5e";
        ctx.strokeStyle = "#f43f5e";
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 8;
        
        // Heart icon shape
        ctx.beginPath();
        ctx.arc(lx + 4, ly + 3, 3, Math.PI, 0);
        ctx.arc(lx + 10, ly + 3, 3, Math.PI, 0);
        ctx.lineTo(lx + 7, ly + 11);
        ctx.closePath();
        ctx.fill();
      } else {
        // Lost Life (Hollow Gray Outline)
        ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lx + 4, ly + 3, 3, Math.PI, 0);
        ctx.arc(lx + 10, ly + 3, 3, Math.PI, 0);
        ctx.lineTo(lx + 7, ly + 11);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Dash Ready Indicator
    const dashY = hudY + 46;
    const isDashReady = player.dashCooldown <= 0;
    ctx.fillStyle = isDashReady ? "#22d3ee" : "#475569";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(isDashReady ? "⚡ DASH READY [K / BUTTON]" : "⏳ DASH CHARGING...", healthX, dashY + 8);

    ctx.restore();

    // 2. MISSION OBJECTIVE (Top Right)
    ctx.save();
    const objWidth = Math.min(210, w * 0.28);
    const objX = w - objWidth - 20;
    const objY = 20;

    ctx.fillStyle = "rgba(8, 8, 14, 0.82)";
    ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(objX, objY - 8, objWidth, 54, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f43f5e";
    ctx.font = "bold 10px monospace";
    ctx.fillText("MISSION SECTOR", objX + 12, objY + 8);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    if (levelConfig.winCondition.type === "KILL_COUNT") {
      const target = levelConfig.winCondition.targetCount;
      ctx.fillText(`DEMONS: ${currentKills} / ${target}`, objX + 12, objY + 28);
    } else {
      ctx.fillText(boss && !boss.isDead ? "SLAY OVERLORD" : "SECTOR CLEARED", objX + 12, objY + 28);
    }
    ctx.restore();

    // 3. COMBO MULTIPLIER (Left Mid)
    if (player.comboCount > 1) {
      ctx.save();
      const comboX = 32;
      const comboY = 135;
      const comboScale = Math.min(1.35, 1 + player.comboCount * 0.04);

      ctx.translate(comboX, comboY);
      ctx.scale(comboScale, comboScale);
      
      ctx.font = "900 30px system-ui, sans-serif";
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 14;
      ctx.fillText(`x${player.comboCount}`, 0, 0);

      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      ctx.fillText(player.comboCount >= 10 ? "HELLFIRE SLAYER!" : "COMBO STRIKE", 0, 16);
      ctx.restore();
    }

    // 4. RESPAWN / REVIVED BANNER
    if (player.respawnBannerTimer > 0) {
      ctx.save();
      const bannerAlpha = Math.min(1, player.respawnBannerTimer);
      ctx.globalAlpha = bannerAlpha;
      ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
      ctx.strokeStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2;

      const bw = Math.min(380, w * 0.6);
      const bx = (w - bw) / 2;
      const by = 80;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 42, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 15px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`✦ SOUL RESURRECTED — ${player.lives} LIVES REMAINING ✦`, w / 2, by + 26);
      ctx.restore();
    }

    // 5. BOSS HEALTH BAR (Top Center)
    if (boss && !boss.isDead) {
      ctx.save();
      const bossBarWidth = Math.min(420, w * 0.55);
      const bossBarX = (w - bossBarWidth) / 2;
      const bossBarY = 28;

      ctx.fillStyle = "rgba(10, 5, 15, 0.9)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(bossBarX - 8, bossBarY - 10, bossBarWidth + 16, 36, 8);
      ctx.fill();
      ctx.stroke();

      const bossHpPct = Math.max(0, Math.min(1, boss.health / boss.maxHealth));
      const bossGrad = ctx.createLinearGradient(bossBarX, 0, bossBarX + bossBarWidth, 0);
      bossGrad.addColorStop(0, "#ef4444");
      bossGrad.addColorStop(1, "#a855f7");
      ctx.fillStyle = bossGrad;
      ctx.beginPath();
      ctx.roundRect(bossBarX, bossBarY - 2, bossBarWidth * bossHpPct, 18, 4);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`DEMON OVERLORD — ${Math.ceil(boss.health)} / ${boss.maxHealth}`, w / 2, bossBarY + 11);
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
