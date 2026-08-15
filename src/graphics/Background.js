/**
 * Background.js
 * Multi-layer Parallax Neon Fantasy Background with Dynamic Atmospheric Particles
 */

export class Background {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.cameraX = 0;
    this.groundY = canvasHeight * 0.82;
    
    // Atmospheric glowing embers/ashes
    this.particles = [];
    this.initParticles();
    
    // Distant mountain/spire coordinates
    this.spires = [
      { x: 100, w: 140, h: 280 },
      { x: 320, w: 200, h: 360 },
      { x: 600, w: 160, h: 300 },
      { x: 840, w: 240, h: 420 },
      { x: 1150, w: 180, h: 340 },
      { x: 1400, w: 260, h: 400 },
      { x: 1750, w: 190, h: 320 }
    ];
    
    // Midground Gothic pillars & arches
    this.pillars = [
      { x: 50, w: 50, h: 220 },
      { x: 380, w: 60, h: 260 },
      { x: 750, w: 45, h: 200 },
      { x: 1100, w: 55, h: 240 },
      { x: 1500, w: 50, h: 230 },
      { x: 1900, w: 60, h: 250 }
    ];

    this.time = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.groundY = height * 0.82;
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * (this.width || 1200),
        y: Math.random() * (this.height || 700),
        size: Math.random() * 2.5 + 1,
        speedX: Math.random() * 30 - 15,
        speedY: -(Math.random() * 35 + 15),
        alpha: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.4 ? "#ef4444" : "#06b6d4", // Crimson and Cyan Neon Embers
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt, cameraX) {
    this.cameraX = cameraX;
    this.time += dt;

    // Update atmospheric embers
    for (const p of this.particles) {
      p.x += p.speedX * dt;
      p.y += p.speedY * dt;
      p.pulse += dt * 3;

      // Wrap around
      if (p.y < 0) {
        p.y = this.height;
        p.x = Math.random() * this.width;
      }
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
    }
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;
    const gY = this.groundY;

    // 1. Sky Gradient (Abyssal Void to Crimson Horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, gY);
    skyGrad.addColorStop(0, "#08060f");    // Deep cosmic abyss
    skyGrad.addColorStop(0.5, "#180922");  // Purple nether haze
    skyGrad.addColorStop(0.85, "#3b0724"); // Crimson demon glow
    skyGrad.addColorStop(1, "#5b0c2a");    // Horizon flame
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Giant Blood Moon with Neon Aura
    const moonX = w * 0.75 - (this.cameraX * 0.02) % (w * 1.5);
    const moonY = h * 0.24;
    const moonRadius = Math.min(w, h) * 0.12;

    // Moon Glow
    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.5, moonX, moonY, moonRadius * 2.2);
    moonGlow.addColorStop(0, "rgba(239, 68, 68, 0.45)");
    moonGlow.addColorStop(0.5, "rgba(168, 85, 247, 0.2)");
    moonGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Moon Disc with craters
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner moon eclipse shadow
    ctx.fillStyle = "#1e0817";
    ctx.beginPath();
    ctx.arc(moonX + moonRadius * 0.25, moonY - moonRadius * 0.1, moonRadius * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // 3. Distant Spire Silhouettes (Layer 1 - 0.08x Parallax)
    ctx.fillStyle = "#13091c";
    ctx.beginPath();
    const l1Offset = (this.cameraX * 0.08) % (w * 1.2);
    for (let offset = -w; offset <= w * 2; offset += w * 1.2) {
      for (const sp of this.spires) {
        const sx = sp.x + offset - l1Offset;
        ctx.moveTo(sx, gY);
        ctx.lineTo(sx + sp.w / 2, gY - sp.h);
        ctx.lineTo(sx + sp.w, gY);
      }
    }
    ctx.fill();

    // 4. Midground Gothic Pillars & Arches (Layer 2 - 0.25x Parallax)
    ctx.fillStyle = "#1f0f29";
    const l2Offset = (this.cameraX * 0.25) % (w * 1.5);
    for (let offset = -w; offset <= w * 2; offset += w * 1.5) {
      for (const pil of this.pillars) {
        const px = pil.x + offset - l2Offset;
        ctx.fillRect(px, gY - pil.h, pil.w, pil.h);
        // Capital ornament
        ctx.fillRect(px - 8, gY - pil.h - 12, pil.w + 16, 12);

        // Torch light on pillar
        const torchY = gY - pil.h + 50;
        const torchFlicker = Math.sin(this.time * 8 + px) * 3;
        ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
        ctx.beginPath();
        ctx.arc(px + pil.w / 2, torchY, 18 + torchFlicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#06b6d4";
        ctx.fillRect(px + pil.w / 2 - 3, torchY - 6, 6, 10);
        ctx.fillStyle = "#1f0f29"; // Restore
      }
    }

    // 5. Solid Ground & Neon Grid Edge
    const groundGrad = ctx.createLinearGradient(0, gY, 0, h);
    groundGrad.addColorStop(0, "#15081c");
    groundGrad.addColorStop(0.1, "#0a030e");
    groundGrad.addColorStop(1, "#020104");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gY, w, h - gY);

    // Glowing Neon Ground Edge
    ctx.strokeStyle = "#06b6d4";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gY);
    ctx.lineTo(w, gY);
    ctx.stroke();

    // Ground Runes / Grid segments
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
    ctx.lineWidth = 1;
    const gridSpacing = 60;
    const gridOffset = (this.cameraX * 0.9) % gridSpacing;
    for (let x = -gridOffset; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, gY);
      ctx.lineTo(x + (x - w / 2) * 0.4, h);
      ctx.stroke();
    }

    // 6. Atmospheric Embers
    for (const p of this.particles) {
      const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
}
