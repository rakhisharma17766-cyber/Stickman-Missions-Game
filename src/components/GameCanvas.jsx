import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameLoop } from '../engine/GameLoop';
import { Background } from '../graphics/Background';
import { ParticleSystem } from '../graphics/Animations';
import { UIManager } from '../engine/UIManager';
import { Stickman } from '../entities/Stickman';
import { createEnemy } from '../entities/Enemies';
import { Physics } from '../engine/Physics';
import { AudioFX } from '../utils/AudioFX';
import { PlayerProfile } from '../state/PlayerProfile';
import { getLevelById } from '../levels/LevelRegistry';
import { 
  ArrowLeft, RotateCcw, Play, Pause, Volume2, VolumeX, 
  Trophy, Skull, Zap, ChevronRight, Swords 
} from 'lucide-react';

export function GameCanvas({ levelId, onReturnToMenu, onNextLevel }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const levelConfig = getLevelById(levelId);

  // React UI States for Overlays
  const [gameState, setGameState] = useState('PLAYING'); // "PLAYING" | "PAUSED" | "VICTORY" | "DEFEAT"
  const [gameStats, setGameStats] = useState({
    kills: 0,
    score: 0,
    coinsEarned: 0,
    diamondsEarned: 0,
    maxCombo: 0
  });
  const [audioMuted, setAudioMuted] = useState(!PlayerProfile.getProfile().audioEnabled);

  // Touch Virtual Controls State
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Engine references kept outside React renders
  const engineRef = useRef({
    loop: null,
    background: null,
    particles: null,
    uiManager: null,
    player: null,
    enemies: [],
    boss: null,
    input: { left: false, right: false, jump: false, attack: false, dash: false },
    levelTime: 0,
    spawnIndex: 0,
    kills: 0,
    score: 0,
    maxCombo: 0,
    cameraX: 0,
    groundY: 500,
    canvasWidth: 1200,
    canvasHeight: 700,
    isComplete: false,
    endlessSpawnTimer: 0
  });

  // Detect Touch / Mobile Screen
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState === 'VICTORY' || gameState === 'DEFEAT') return;

      const key = e.key.toLowerCase();
      const input = engineRef.current.input;

      if (key === 'a' || key === 'arrowleft') input.left = true;
      if (key === 'd' || key === 'arrowright') input.right = true;
      if (key === 'w' || key === 'arrowup' || key === ' ') input.jump = true;
      if (key === 'j' || key === 'z') input.attack = true;
      if (key === 'k' || key === 'x') input.dash = true;
      if (key === 'escape' || key === 'p') {
        togglePause();
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      const input = engineRef.current.input;

      if (key === 'a' || key === 'arrowleft') input.left = false;
      if (key === 'd' || key === 'arrowright') input.right = false;
      if (key === 'w' || key === 'arrowup' || key === ' ') input.jump = false;
      if (key === 'j' || key === 'z') input.attack = false;
      if (key === 'k' || key === 'x') input.dash = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const togglePause = () => {
    setGameState((prev) => {
      if (prev === 'PLAYING') {
        engineRef.current.loop?.pause();
        return 'PAUSED';
      } else if (prev === 'PAUSED') {
        engineRef.current.loop?.resume();
        return 'PLAYING';
      }
      return prev;
    });
  };

  const toggleSound = () => {
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);
    AudioFX.setMuted(nextMuted);
    PlayerProfile.setAudioEnabled(!nextMuted);
  };

  // Spawn dynamic enemy helper
  const spawnEnemy = useCallback((type, spawnSide) => {
    const eng = engineRef.current;
    const playerX = eng.player?.x || eng.canvasWidth / 2;
    
    let spawnX = 0;
    if (spawnSide === 'left') {
      spawnX = Math.max(40, playerX - (eng.canvasWidth * 0.45 + Math.random() * 60));
    } else if (spawnSide === 'right') {
      spawnX = Math.min(eng.canvasWidth * 2 - 60, playerX + (eng.canvasWidth * 0.45 + Math.random() * 60));
    } else {
      spawnX = Math.random() > 0.5 
        ? Math.max(40, playerX - 350) 
        : Math.min(eng.canvasWidth * 2 - 60, playerX + 350);
    }

    const enemy = createEnemy(type, spawnX, eng.groundY - 10);
    if (type === 'DemonLordBoss') {
      eng.boss = enemy;
    }
    eng.enemies.push(enemy);
  }, []);

  // Main Canvas Setup and Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateDimensions = () => {
      const parent = containerRef.current || window;
      const width = parent.clientWidth || window.innerWidth;
      const height = parent.clientHeight || window.innerHeight;
      
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const eng = engineRef.current;
      eng.canvasWidth = width;
      eng.canvasHeight = height;
      eng.groundY = height * 0.82;

      if (eng.background) {
        eng.background.resize(width, height);
      }
    };

    updateDimensions();

    const eng = engineRef.current;
    eng.background = new Background(eng.canvasWidth, eng.canvasHeight);
    eng.particles = new ParticleSystem();
    eng.uiManager = new UIManager();
    eng.player = new Stickman(eng.canvasWidth * 0.3, eng.groundY - 60);
    eng.enemies = [];
    eng.boss = null;
    eng.levelTime = 0;
    eng.spawnIndex = 0;
    eng.kills = 0;
    eng.score = 0;
    eng.maxCombo = 0;
    eng.isComplete = false;
    eng.endlessSpawnTimer = 0;

    AudioFX.ensureContext();

    // Engine Update Cycle (Fixed Delta Time)
    const update = (dt) => {
      if (eng.isComplete) return;

      eng.levelTime += dt;

      // 1. Process Timeline Spawns
      const timeline = levelConfig.spawnTimeline || [];
      while (eng.spawnIndex < timeline.length && timeline[eng.spawnIndex].time <= eng.levelTime) {
        const item = timeline[eng.spawnIndex];
        for (let c = 0; c < (item.count || 1); c++) {
          spawnEnemy(item.type, item.spawnSide || 'both');
        }
        eng.spawnIndex++;
      }

      // Reinforcement wave generator if target kills not met and all current enemies cleared
      if (
        levelConfig.winCondition.type === 'KILL_COUNT' &&
        eng.kills < levelConfig.winCondition.targetCount &&
        eng.enemies.length < 3
      ) {
        eng.endlessSpawnTimer += dt;
        if (eng.endlessSpawnTimer >= 3.0) {
          eng.endlessSpawnTimer = 0;
          const enemyType = Math.random() > 0.4 ? 'GroundBrute' : 'FlyingGargoyle';
          spawnEnemy(enemyType, 'both');
        }
      }

      // 2. Update Player
      eng.player.handleInput(eng.input);
      eng.player.update(dt, eng.groundY, eng.particles);
      Physics.clampToBounds(eng.player, 20, eng.canvasWidth - 20);

      // Track Max Combo
      if (eng.player.comboCount > eng.maxCombo) {
        eng.maxCombo = eng.player.comboCount;
      }

      // 3. Player Attack Hit Detection vs Enemies
      const attackHitbox = eng.player.getAttackHitbox();
      if (attackHitbox) {
        let hitAny = false;
        for (const enemy of eng.enemies) {
          if (!enemy.isDead && Physics.checkAttackHit(attackHitbox, enemy)) {
            enemy.takeDamage(
              attackHitbox.damage,
              attackHitbox.isCrit,
              eng.player.x,
              eng.uiManager,
              eng.particles
            );
            hitAny = true;

            // Increment Combo
            eng.player.comboCount++;
            eng.player.comboTimer = eng.player.comboMaxWindow;
            eng.score += (attackHitbox.isCrit ? 150 : 80) * Math.min(5, eng.player.comboCount);

            // Demon Soul Life-Steal (Demon Hunter ability)
            if (eng.player.health < eng.player.maxHealth) {
              eng.player.health = Math.min(eng.player.maxHealth, eng.player.health + 1.2);
            }
          }
        }
        if (hitAny) {
          eng.player.hasHitThisAttack = true;
        }
      }

      // 4. Update Enemies & Enemy Attack vs Player
      for (let i = eng.enemies.length - 1; i >= 0; i--) {
        const enemy = eng.enemies[i];
        enemy.update(dt, eng.player, eng.groundY);
        Physics.clampToBounds(enemy, 20, eng.canvasWidth - 20);

        // Check if enemy strikes player
        const enemyHitbox = enemy.getAttackHitbox();
        if (enemyHitbox && !eng.player.isDead) {
          const targetBox = {
            x: eng.player.x - eng.player.width / 2,
            y: eng.player.y - eng.player.height,
            width: eng.player.width,
            height: eng.player.height
          };
          if (Physics.checkAABB(enemyHitbox, targetBox)) {
            eng.player.takeDamage(enemyHitbox.damage, enemy.x, eng.uiManager, eng.particles);
          }
        }

        // Clean up dead enemies after animation
        if (enemy.isDead && enemy.hitTimer <= 0) {
          eng.kills++;
          eng.score += enemy.scoreValue;
          eng.enemies.splice(i, 1);
        }
      }

      // 5. Update Background, Particles, and UI Overlays
      eng.cameraX = eng.player.x - eng.canvasWidth * 0.4;
      eng.background.update(dt, eng.cameraX);
      eng.particles.update(dt);
      eng.uiManager.update(dt);

      // 6. Check Win Condition
      const winCond = levelConfig.winCondition;
      let isWon = false;

      if (winCond.type === 'KILL_COUNT' && eng.kills >= winCond.targetCount) {
        isWon = true;
      } else if (winCond.type === 'BOSS_DEFEATED' && eng.boss && eng.boss.isDead) {
        isWon = true;
      }

      if (isWon && !eng.isComplete) {
        eng.isComplete = true;
        eng.loop?.triggerSlowMo(0.25, 0.6);
        AudioFX.playVictory();

        // Persist rewards and unlock progression
        const coinsEarned = levelConfig.rewards.coins + Math.floor(eng.score * 0.1);
        const diamondsEarned = levelConfig.rewards.diamonds;

        PlayerProfile.addRewards(coinsEarned, diamondsEarned, eng.kills, eng.score, levelConfig.id);
        PlayerProfile.unlockNextLevel(levelConfig.id);

        setGameStats({
          kills: eng.kills,
          score: eng.score,
          coinsEarned,
          diamondsEarned,
          maxCombo: eng.maxCombo
        });

        setTimeout(() => {
          eng.loop?.pause();
          setGameState('VICTORY');
        }, 1200);
      }

      // 7. Check Player Defeat
      if (eng.player.isDead && !eng.isComplete) {
        eng.isComplete = true;
        setGameStats({
          kills: eng.kills,
          score: eng.score,
          coinsEarned: Math.floor(eng.score * 0.05),
          diamondsEarned: 0,
          maxCombo: eng.maxCombo
        });
        setTimeout(() => {
          eng.loop?.pause();
          setGameState('DEFEAT');
        }, 1000);
      }
    };

    // Engine Render Cycle
    const render = () => {
      ctx.save();
      ctx.clearRect(0, 0, eng.canvasWidth, eng.canvasHeight);

      // Apply screen shake
      eng.uiManager.applyScreenShake(ctx);

      // 1. Draw Parallax Background
      eng.background.draw(ctx);

      // 2. Draw Enemies
      for (const enemy of eng.enemies) {
        enemy.draw(ctx);
      }

      // 3. Draw Player
      if (!eng.player.isDead) {
        eng.player.draw(ctx);
      }

      // 4. Draw Particle System
      eng.particles.draw(ctx);

      // 5. Draw Canvas In-Game HUD
      eng.uiManager.draw(ctx, {
        player: eng.player,
        levelConfig,
        currentKills: eng.kills,
        boss: eng.boss
      });

      ctx.restore();
    };

    // Instantiate and start GameLoop
    const loop = new GameLoop(update, render);
    eng.loop = loop;
    loop.start();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      loop.stop();
      resizeObserver.disconnect();
    };
  }, [levelId, levelConfig, spawnEnemy]);

  // Touch Virtual Button Handlers
  const handleTouchStart = (action) => {
    AudioFX.ensureContext();
    const input = engineRef.current.input;
    if (action === 'left') input.left = true;
    if (action === 'right') input.right = true;
    if (action === 'jump') input.jump = true;
    if (action === 'attack') input.attack = true;
    if (action === 'dash') input.dash = true;
  };

  const handleTouchEnd = (action) => {
    const input = engineRef.current.input;
    if (action === 'left') input.left = false;
    if (action === 'right') input.right = false;
    if (action === 'jump') input.jump = false;
    if (action === 'attack') input.attack = false;
    if (action === 'dash') input.dash = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none touch-none"
    >
      {/* 2D Canvas Target */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top Floating Mini Controls (Pause & Sound) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          id="canvas-sound-btn"
          onClick={toggleSound}
          className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition-all"
          title="Toggle Sound"
        >
          {audioMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        <button
          id="canvas-pause-btn"
          onClick={togglePause}
          className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition-all"
          title="Pause Game"
        >
          {gameState === 'PAUSED' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* PAUSE MENU MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
          <div className="relative w-full max-w-sm p-6 rounded-2xl bg-[#080808]/95 border border-white/10 text-center shadow-2xl overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
            <h2 className="text-2xl font-black uppercase text-white mb-1 font-mono tracking-tight">
              MISSION PAUSED
            </h2>
            <p className="text-xs text-gray-400 mb-6">Stage {levelConfig.id}: {levelConfig.title}</p>

            <div className="space-y-3">
              <button
                id="pause-resume-btn"
                onClick={togglePause}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Resume Battle</span>
              </button>

              <button
                id="pause-restart-btn"
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Sector</span>
              </button>

              <button
                id="pause-menu-btn"
                onClick={onReturnToMenu}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Headquarters</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY SCREEN OVERLAY */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn font-sans">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#080808]/95 border border-cyan-500/50 shadow-2xl text-center overflow-hidden">
            {/* Ambient Cyan Aura */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 bg-cyan-500/15 blur-3xl pointer-events-none rounded-full" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60" />

            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 border border-cyan-400/40 text-white mb-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Trophy className="w-7 h-7" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mb-1 font-mono tracking-tight">
              SECTOR CLEARED
            </h2>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">
              Sector {levelConfig.id} Cleansed of Demons
            </p>

            {/* Match Rewards Breakdown Card */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-rose-400" /> Demons Banished
                </span>
                <span className="font-bold text-white font-mono">{gameStats.kills}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Max Slayer Combo
                </span>
                <span className="font-bold text-cyan-400 font-mono">x{gameStats.maxCombo}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Battle Score
                </span>
                <span className="font-mono font-bold text-yellow-400">{gameStats.score.toLocaleString()}</span>
              </div>

              {/* Currency Earned Badges */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full pl-1.5 pr-4 py-1">
                  <span className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-[10px]">
                    C
                  </span>
                  <span className="font-mono font-bold text-sm text-yellow-500">
                    +{gameStats.coinsEarned}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full pl-1.5 pr-4 py-1">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-black font-black text-[10px]">
                    D
                  </span>
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    +{gameStats.diamondsEarned}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {levelConfig.nextLevelId <= 3 ? (
                <button
                  id="victory-next-level-btn"
                  onClick={() => onNextLevel(levelConfig.nextLevelId)}
                  className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.35)] active:scale-95 transition-all"
                >
                  <span>Next Incursion Sector</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                  🏆 All Demon Incursion Sectors Cleared! You are the Supreme Demon Hunter!
                </div>
              )}

              <button
                id="victory-menu-btn"
                onClick={onReturnToMenu}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Headquarters</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFEAT SCREEN OVERLAY */}
      {gameState === 'DEFEAT' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn font-sans">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#080808]/95 border border-rose-600/60 shadow-2xl text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-60" />
            <div className="inline-flex p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Skull className="w-7 h-7" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mb-1 font-mono tracking-tight">
              DEMON OVERRUN
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
              Mortal vessel collapsed under Nether pressure
            </p>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 mb-6 space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Demons Banished:</span>
                <span className="font-bold text-white font-mono">{gameStats.kills}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Salvaged Soul Coins:</span>
                <span className="font-bold text-yellow-500 font-mono">+{gameStats.coinsEarned} C</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                id="defeat-retry-btn"
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Mission</span>
              </button>

              <button
                id="defeat-menu-btn"
                onClick={onReturnToMenu}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Upgrade in Hunter Dojo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE / TOUCH SCREEN VIRTUAL CONTROLS */}
      {isTouchDevice && (
        <div className="absolute inset-x-0 bottom-6 z-20 pointer-events-none px-6 flex items-end justify-between select-none">
          {/* Left D-Pad (Move Left / Right) */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              id="touch-left-btn"
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={() => handleTouchEnd('left')}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              className="w-16 h-16 rounded-2xl bg-black/60 active:bg-cyan-500/30 border border-white/15 active:border-cyan-400 backdrop-blur-md flex items-center justify-center text-cyan-400 font-black text-xl active:scale-95 shadow-xl transition-all"
            >
              ◀
            </button>
            <button
              id="touch-right-btn"
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={() => handleTouchEnd('right')}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              className="w-16 h-16 rounded-2xl bg-black/60 active:bg-cyan-500/30 border border-white/15 active:border-cyan-400 backdrop-blur-md flex items-center justify-center text-cyan-400 font-black text-xl active:scale-95 shadow-xl transition-all"
            >
              ▶
            </button>
          </div>

          {/* Right Action Cluster (Jump, Slash, Dash) */}
          <div className="pointer-events-auto flex items-center gap-3">
            {/* Dash Button */}
            <button
              id="touch-dash-btn"
              onTouchStart={() => handleTouchStart('dash')}
              onTouchEnd={() => handleTouchEnd('dash')}
              onMouseDown={() => handleTouchStart('dash')}
              onMouseUp={() => handleTouchEnd('dash')}
              className="w-14 h-14 rounded-2xl bg-black/60 active:bg-cyan-500/30 border border-white/15 active:border-cyan-400 backdrop-blur-md flex flex-col items-center justify-center text-cyan-400 active:scale-95 shadow-xl transition-all"
            >
              <Zap className="w-5 h-5 text-cyan-400" />
              <span className="text-[9px] font-black uppercase">DASH</span>
            </button>

            {/* Jump Button */}
            <button
              id="touch-jump-btn"
              onTouchStart={() => handleTouchStart('jump')}
              onTouchEnd={() => handleTouchEnd('jump')}
              onMouseDown={() => handleTouchStart('jump')}
              onMouseUp={() => handleTouchEnd('jump')}
              className="w-14 h-14 rounded-2xl bg-black/60 active:bg-cyan-500/30 border border-white/15 active:border-cyan-400 backdrop-blur-md flex flex-col items-center justify-center text-cyan-400 active:scale-95 shadow-xl transition-all"
            >
              <span className="text-base font-black">▲</span>
              <span className="text-[9px] font-black uppercase">JUMP</span>
            </button>

            {/* Katana Attack Button (Glowing Cyan Button) */}
            <button
              id="touch-attack-btn"
              onTouchStart={() => handleTouchStart('attack')}
              onTouchEnd={() => handleTouchEnd('attack')}
              onMouseDown={() => handleTouchStart('attack')}
              onMouseUp={() => handleTouchEnd('attack')}
              className="w-20 h-20 rounded-3xl bg-cyan-500 active:bg-cyan-400 border-2 border-cyan-300 text-black shadow-[0_0_30px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center active:scale-95 transition-all"
            >
              <Swords className="w-7 h-7 text-black" />
              <span className="text-[10px] font-black uppercase tracking-wider text-black">SLASH</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
