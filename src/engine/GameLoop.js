/**
 * GameLoop.js
 * Frame-rate independent 60+ FPS Game Loop with Delta-Time, Slow-Mo, and Pause controls
 */

export class GameLoop {
  constructor(updateFn, renderFn) {
    this.update = updateFn || (() => {});
    this.render = renderFn || (() => {});
    
    this.lastTime = 0;
    this.accumulatedTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.timeScale = 1.0; // Slow-mo multiplier (e.g. 0.3 on boss kill or heavy hit)
    this.targetSlowMo = 1.0;
    this.slowMoDuration = 0;
    this.slowMoTimer = 0;
    
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;
    
    this.rafId = null;
    this.boundLoop = this.loop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
    }
  }

  triggerSlowMo(scale = 0.25, duration = 0.4) {
    this.timeScale = scale;
    this.targetSlowMo = 1.0;
    this.slowMoDuration = duration;
    this.slowMoTimer = 0;
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp dt to avoid huge jumps if tab was blurred
    if (dt > 0.1) dt = 0.1;

    // Handle dynamic slow-mo transition
    if (this.slowMoDuration > 0) {
      this.slowMoTimer += dt;
      if (this.slowMoTimer >= this.slowMoDuration) {
        this.timeScale += (1.0 - this.timeScale) * Math.min(1, dt * 10);
        if (Math.abs(this.timeScale - 1.0) < 0.05) {
          this.timeScale = 1.0;
          this.slowMoDuration = 0;
        }
      }
    }

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1.0) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Update and Render
    if (!this.isPaused) {
      const effectiveDt = dt * this.timeScale;
      this.update(effectiveDt);
    }
    
    this.render(dt);

    this.rafId = requestAnimationFrame(this.boundLoop);
  }
}
