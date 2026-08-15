/**
 * UIManager.js
 * In-game Canvas HUD, Boss Health Bars, Floating Damage Text, and Combat Meters
 */

export class UIManager {
  constructor() {
    this.floatingTexts = [];
    this.screenShake = { intensity: 0, duration: 0, timer: 0 };
  }

  addDamageText(x, y, amount, isCrit = false, isPlayer = false) {
    this.floatingTexts.push({
      x: x + (Math.random() * 20 - 10),
      y: y - 20,
      text: isCrit ? `CRIT! -${amount}` : `-${amount}`,
      color: isPlayer ? "#f43f5e" : isCrit ? "#fbbf24" : "#22d3ee",
      fontSize: isCrit ? 22 : 16,
      vy: isCrit ? -80 : -50,
      life: 0.75,
      maxLife: 0.75
    });
  }

  addNotification(x, y, text, color = "#a855f7") {
    this.floatingTexts.push({
      x,
      y: y - 30,
      text,
      color,
      fontSize: 18,
      vy: -40,
      life: 1.2,
      maxLife: 1.2
    });
  }

  triggerShake(intensity = 8, duration = 0.25) {
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

    // 1. Player HUD (Top Left)
    ctx.save();
    const hudX = 24;
    const hudY = 24;
    const barWidth = Math.min(220, w * 0.28);
    const barHeight = 16;

    // Glass backdrop panel
    ctx.fillStyle = "rgba(10, 10, 20, 0.75)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hudX - 10, hudY - 10, barWidth + 60, 68, 10);
    ctx.fill();
    ctx.stroke();

    // Hunter Avatar Icon
    ctx.fillStyle = "#06b6d4";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(hudX + 16, hudY + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(hudX + 16, hudY + 16, 11, 0, Math.PI * 2);
    ctx.fill();
    // Glowing eye in icon
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(hudX + 18, hudY + 15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Health Bar Background
    const healthX = hudX + 42;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(healthX, hudY + 6, barWidth, barHeight, 4);
    ctx.fill();

    // Health Bar Foreground
    const healthPct = Math.max(0, player.health / player.maxHealth);
    const hpGrad = ctx.createLinearGradient(healthX, 0, healthX + barWidth, 0);
    hpGrad.addColorStop(0, "#06b6d4");
    hpGrad.addColorStop(1, "#10b981");
    ctx.fillStyle = hpGrad;
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(healthX, hudY + 6, barWidth * healthPct, barHeight, 4);
    ctx.fill();

    // HP Text
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.fillText(`HP ${Math.ceil(player.health)} / ${player.maxHealth}`, healthX + 6, hudY + 18);

    // Dash Energy Cooldown Bar
    const dashY = hudY + 28;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(healthX, dashY, barWidth * 0.75, 8, 3);
    ctx.fill();

    const dashProgress = Math.min(1, 1 - player.dashCooldownTimer / player.dashCooldown);
    ctx.fillStyle = dashProgress >= 1 ? "#a855f7" : "#64748b";
    ctx.shadowColor = dashProgress >= 1 ? "#a855f7" : "transparent";
    ctx.shadowBlur = dashProgress >= 1 ? 8 : 0;
    ctx.beginPath();
    ctx.roundRect(healthX, dashY, (barWidth * 0.75) * dashProgress, 8, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillText(dashProgress >= 1 ? "DEMON DASH READY [K / DASH]" : "DASH CHARGING...", healthX + 6, dashY + 7);

    ctx.restore();

    // 2. Mission Objective Tracker (Top Right)
    ctx.save();
    const objWidth = Math.min(220, w * 0.3);
    const objX = w - objWidth - 24;
    const objY = 24;

    ctx.fillStyle = "rgba(10, 10, 20, 0.75)";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(objX, objY - 10, objWidth, 54, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f43f5e";
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 6;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("OBJECTIVE", objX + 14, objY + 8);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, sans-serif";
    if (levelConfig.winCondition.type === "KILL_COUNT") {
      const target = levelConfig.winCondition.targetCount;
      ctx.fillText(`DEMONS SLAIN: ${currentKills} / ${target}`, objX + 14, objY + 28);
    } else {
      ctx.fillText(boss && !boss.isDead ? `DEFEAT ${boss.type.toUpperCase()}` : "DEFEAT BOSS", objX + 14, objY + 28);
    }

    ctx.restore();

    // 3. Combo Multiplier Counter (Mid Left)
    if (player.comboCount > 1) {
      ctx.save();
      const comboX = 36;
      const comboY = 140;
      const comboScale = Math.min(1.4, 1 + player.comboCount * 0.03);

      ctx.translate(comboX, comboY);
      ctx.scale(comboScale, comboScale);
      
      ctx.font = "900 28px system-ui, sans-serif";
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

    // 4. Boss Health Bar (Top Center)
    if (boss && !boss.isDead) {
      ctx.save();
      const bossBarWidth = Math.min(420, w * 0.55);
      const bossBarX = (w - bossBarWidth) / 2;
      const bossBarY = 32;

      ctx.fillStyle = "rgba(10, 5, 15, 0.85)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(bossBarX - 8, bossBarY - 14, bossBarWidth + 16, 36, 6);
      ctx.fill();
      ctx.stroke();

      const bossHpPct = Math.max(0, boss.health / boss.maxHealth);
      const bossGrad = ctx.createLinearGradient(bossBarX, 0, bossBarX + bossBarWidth, 0);
      bossGrad.addColorStop(0, "#ef4444");
      bossGrad.addColorStop(1, "#a855f7");
      ctx.fillStyle = bossGrad;
      ctx.beginPath();
      ctx.roundRect(bossBarX, bossBarY - 6, bossBarWidth * bossHpPct, 18, 4);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`DEMON OVERLORD — ${Math.ceil(boss.health)} / ${boss.maxHealth}`, w / 2, bossBarY + 7);
      ctx.restore();
    }

    // 5. Floating Damage Numbers
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
