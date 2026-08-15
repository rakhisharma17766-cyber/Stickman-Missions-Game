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
  Trophy, Skull, Zap, ChevronRight, Swords, Smartphone, Maximize2
} from 'lucide-react';

export function GameCanvas({ levelId, onReturnToMenu, onNextLevel }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const levelConfig = getLevelById(levelId) || getLevelById(1);

  // React UI States for Overlays
  const [gameState, setGameState] = useState('PLAYING'); // "PLAYING" | "PAUSED" | "VICTORY" | "DEFEAT"
  const [gameStats, setGameStats] = useState({
    kills: 0,
    score: 0,
    coinsEarned: 0,
    diamondsEarned: 0,
    maxCombo: 0,
    remainingLives: 3
  });
  const [audioMuted, setAudioMuted] = useState(!PlayerProfile.getProfile().audioEnabled);

  // Orientation & Touch Controls State
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [forceLandscape, setForceLandscape] = useState(false);

  // Engine references kept outside React renders
  const engineRef = useRef({
    loop: null,
    background: null,
    particles: null,
    uiManager: null,
    player: null,
    enemies: [],
    boss: null,
    input: { left: false, right: false, jump: false, attack: false, dash: false, heavy: false },
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
    endlessSpawnTimer: 0,
    waveNotified: false
  });

  // Detect Touch & Screen Orientation
  useEffect(() => {
    const checkViewport = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024;
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 900;
      setIsTouchDevice(isTouch);
      setIsPortrait(portrait);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  // Play Level-specific BGM
  useEffect(() => {
    AudioFX.ensureContext();
    const track = levelId === 3 ? 'LEVEL3' : levelId === 2 ? 'LEVEL2' : 'LEVEL1';
    AudioFX.playBGM(track);

    return () => {
      AudioFX.stopBGM();
    };
  }, [levelId]);

  // Keyboard Event Listeners (WASD, Arrows, Space, J/K/L, Esc)
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
      if (key === 'l' || key === 'c') input.heavy = true;
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
      if (key === 'l' || key === 'c') input.heavy = false;
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
    if (!nextMuted) {
      const track = levelId === 3 ? 'LEVEL3' : levelId === 2 ? 'LEVEL2' : 'LEVEL1';
      AudioFX.playBGM(track);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Spawn dynamic enemy helper
  const spawnEnemy = useCallback((type, spawnSide) => {
    const eng = engineRef.current;
    const playerX = eng.player?.x || eng.canvasWidth / 2;
    
    let spawnX = 0;
    if (spawnSide === 'left') {
      spawnX = Math.max(40, playerX - (eng.canvasWidth * 0.42 + Math.random() * 60));
    } else if (spawnSide === 'right') {
      spawnX = Math.min(eng.canvasWidth - 60, playerX + (eng.canvasWidth * 0.42 + Math.random() * 60));
    } else {
      spawnX = Math.random() > 0.5 
        ? Math.max(40, playerX - 340) 
        : Math.min(eng.canvasWidth - 60, playerX + 340);
    }

    const enemy = createEnemy(type, spawnX, eng.groundY - 10);
    if (type === 'DemonLordBoss') {
      eng.boss = enemy;
      eng.uiManager?.addFloatingText(eng.canvasWidth / 2, 120, "⚠️ DEMON OVERLORD ARRIVED!", "#ef4444", 22);
    }
    eng.enemies.push(enemy);
  }, []);

  // Main Canvas Setup and Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const eng = engineRef.current;

    const updateDimensions = () => {
      const parent = containerRef.current || window;
      const width = parent.clientWidth || window.innerWidth || 800;
      const height = parent.clientHeight || window.innerHeight || 450;
      
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      eng.canvasWidth = width;
      eng.canvasHeight = height;
      eng.groundY = height * 0.82;

      if (eng.background) {
        eng.background.resize(width, height);
      }
      if (eng.player && eng.player.isGrounded) {
        eng.player.y = eng.groundY;
      }
    };

    updateDimensions();

    eng.background = new Background(eng.canvasWidth, eng.canvasHeight);
    eng.particles = new ParticleSystem();
    eng.uiManager = new UIManager();
    eng.player = new Stickman(eng.canvasWidth * 0.28, eng.groundY);
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

    // Initial first wave announcement
    eng.uiManager.addFloatingText(
      eng.canvasWidth / 2,
      eng.groundY - 140,
      `MISSION: ${levelConfig.title.toUpperCase()}`,
      "#22d3ee",
      22
    );

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
        if (eng.endlessSpawnTimer >= 2.5) {
          eng.endlessSpawnTimer = 0;
          const enemyType = Math.random() > 0.4 ? 'GroundBrute' : 'FlyingGargoyle';
          spawnEnemy(enemyType, 'both');
        }
      }

      // 2. Heavy Attack Skill handler (Combo Cleave)
      if (eng.input.heavy && eng.player.attackTimer <= 0 && eng.player.dashTimer <= 0) {
        eng.player.attackPhase = 3; // Trigger Demonic 360 Whirlwind
        eng.player.executeAttack();
        eng.input.heavy = false;
      }

      // 3. Update Player
      eng.player.handleInput(eng.input);
      eng.player.update(dt, eng.groundY, eng.particles);
      Physics.clampToBounds(eng.player, 25, eng.canvasWidth - 25);

      // Track Max Combo
      if (eng.player.comboCount > eng.maxCombo) {
        eng.maxCombo = eng.player.comboCount;
      }

      // 4. Player Attack Hit Detection vs Enemies
      const attackHitbox = eng.player.getAttackHitbox();
      if (attackHitbox) {
        for (let i = eng.enemies.length - 1; i >= 0; i--) {
          const enemy = eng.enemies[i];
          if (enemy.isDead) continue;

          if (Physics.checkAttackHit(attackHitbox, enemy)) {
            eng.player.hasHitThisAttack = true;
            eng.player.comboCount++;
            eng.player.comboTimer = eng.player.comboMaxWindow;

            // Damage enemy
            enemy.takeDamage(
              attackHitbox.damage,
              attackHitbox.isCrit,
              eng.player.x,
              eng.uiManager,
              eng.particles
            );

            // If enemy died from this blow
            if (enemy.isDead) {
              eng.kills++;
              eng.score += enemy.scoreValue * Math.min(3, 1 + eng.player.comboCount * 0.1);
              PlayerProfile.recordKill();
              PlayerProfile.addRewards(enemy.coinDrop, 0);

              eng.enemies.splice(i, 1);
            }
          }
        }
      }

      // 5. Update Enemies & AI Combat vs Player
      for (let i = eng.enemies.length - 1; i >= 0; i--) {
        const enemy = eng.enemies[i];
        enemy.update(dt, eng.player, eng.groundY);
        Physics.clampToBounds(enemy, 15, eng.canvasWidth - 15);

        // Check Enemy Attack Hit on Player
        const enemyHitbox = enemy.getAttackHitbox();
        if (enemyHitbox && !eng.player.isDead) {
          const playerHurtBox = {
            x: eng.player.x - 16,
            y: eng.player.y - 68,
            width: 32,
            height: 68
          };

          if (Physics.checkAABB(enemyHitbox, playerHurtBox)) {
            eng.player.takeDamage(enemyHitbox.damage, enemy.x, eng.uiManager, eng.particles);
          }
        }

        // Clean up dead enemies after animation
        if (enemy.isDead && enemy.hitTimer <= 0) {
          eng.enemies.splice(i, 1);
        }
      }

      // 6. Update Visual Particles & HUD Texts
      eng.particles.update(dt);
      eng.uiManager.update(dt);

      // 7. Check Level Win Conditions
      let hasWon = false;
      if (levelConfig.winCondition.type === 'KILL_COUNT') {
        if (eng.kills >= levelConfig.winCondition.targetCount) {
          hasWon = true;
        }
      } else if (levelConfig.winCondition.type === 'BOSS_DEFEAT') {
        if (eng.boss && eng.boss.isDead) {
          hasWon = true;
        }
      }

      if (hasWon && !eng.isComplete) {
        eng.isComplete = true;
        AudioFX.playVictory();
        PlayerProfile.addRewards(levelConfig.rewards.coins, levelConfig.rewards.diamonds);
        PlayerProfile.unlockLevel(levelConfig.nextLevelId);

        setGameStats({
          kills: eng.kills,
          score: eng.score + levelConfig.rewards.coins * 10,
          coinsEarned: levelConfig.rewards.coins,
          diamondsEarned: levelConfig.rewards.diamonds,
          maxCombo: eng.maxCombo,
          remainingLives: eng.player.lives
        });

        setTimeout(() => {
          eng.loop?.pause();
          setGameState('VICTORY');
        }, 1100);
      }

      // 8. Check Player Defeat (When all 3 lives are exhausted)
      if (eng.player.isDead && !eng.isComplete) {
        eng.isComplete = true;
        setGameStats({
          kills: eng.kills,
          score: eng.score,
          coinsEarned: Math.floor(eng.score * 0.05),
          diamondsEarned: 0,
          maxCombo: eng.maxCombo,
          remainingLives: 0
        });
        setTimeout(() => {
          eng.loop?.pause();
          setGameState('DEFEAT');
        }, 900);
      }
    };

    // Engine Render Cycle (DPR Scaled)
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, eng.canvasWidth, eng.canvasHeight);

      // Apply screen shake
      eng.uiManager.applyScreenShake(ctx);

      // 1. Draw Parallax Background
      eng.background.draw(ctx);

      // 2. Draw Enemies
      for (const enemy of eng.enemies) {
        enemy.draw(ctx);
      }

      // 3. Draw Player Stickman
      if (!eng.player.isDead) {
        eng.player.draw(ctx);
      }

      // 4. Draw Particle System
      eng.particles.draw(ctx);

      // 5. Draw In-Game Canvas HUD (Health, 3 Lives, Mission Goals)
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
    if (action === 'heavy') input.heavy = true;
  };

  const handleTouchEnd = (action) => {
    const input = engineRef.current.input;
    if (action === 'left') input.left = false;
    if (action === 'right') input.right = false;
    if (action === 'jump') input.jump = false;
    if (action === 'attack') input.attack = false;
    if (action === 'dash') input.dash = false;
    if (action === 'heavy') input.heavy = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-screen bg-black overflow-hidden select-none flex flex-col justify-between ${
        forceLandscape && isPortrait ? 'rotate-90 origin-top-left w-[100vh] h-[100vw] fixed top-0 left-[100vw]' : ''
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* 2D Canvas Target */}
      <canvas ref={canvasRef} className="block w-full h-full absolute inset-0 z-0" />

      {/* Portrait / Landscape Guidance & Quick Toggle */}
      {isPortrait && !forceLandscape && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-black/85 border border-cyan-500/50 rounded-full px-4 py-1.5 flex items-center gap-2.5 text-cyan-300 text-xs backdrop-blur-md shadow-xl">
          <Smartphone className="w-4 h-4 text-cyan-400 rotate-90 animate-pulse" />
          <span>Rotate to Landscape or</span>
          <button
            id="force-landscape-btn"
            onClick={() => setForceLandscape(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase transition-all active:scale-95"
          >
            Lock Landscape
          </button>
        </div>
      )}

      {/* Top Floating Mini Controls (Back to Map, Landscape, Fullscreen, Sound, Pause) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {/* Toggle Landscape Orientation Mode */}
        {isPortrait && (
          <button
            id="toggle-rotation-btn"
            onClick={() => setForceLandscape((prev) => !prev)}
            className={`p-2 rounded-xl border backdrop-blur-md shadow-lg transition-all active:scale-95 text-xs font-bold flex items-center gap-1 ${
              forceLandscape
                ? 'bg-cyan-500 text-black border-cyan-300'
                : 'bg-black/70 text-cyan-400 border-white/10'
            }`}
            title="Rotate / Lock Landscape"
          >
            <Smartphone className="w-4 h-4 rotate-90" />
            <span className="hidden sm:inline">Landscape</span>
          </button>
        )}

        <button
          id="canvas-fullscreen-btn"
          onClick={toggleFullscreen}
          className="p-2 sm:p-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition-all active:scale-95"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-gray-300" />
        </button>

        <button
          id="canvas-sound-btn"
          onClick={toggleSound}
          className="p-2 sm:p-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition-all active:scale-95"
          title="Toggle Sound & Music"
        >
          {audioMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        <button
          id="canvas-pause-btn"
          onClick={togglePause}
          className="p-2 sm:p-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition-all active:scale-95"
          title="Pause Game"
        >
          {gameState === 'PAUSED' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
        </button>

        <button
          id="canvas-back-map-btn"
          onClick={() => {
            AudioFX.playUIClick();
            onReturnToMenu();
          }}
          className="p-2 sm:p-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition-all active:scale-95 flex items-center gap-1.5 px-3"
          title="Return to Sector Map"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px] font-bold uppercase hidden sm:inline">Sectors</span>
        </button>
      </div>

      {/* PAUSE MENU MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm p-6 rounded-2xl bg-[#080808]/95 border border-white/10 text-center shadow-2xl overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
            <h2 className="text-2xl font-black uppercase text-white mb-1 font-mono tracking-tight">
              MISSION PAUSED
            </h2>
            <p className="text-xs text-gray-400 mb-6">Sector {levelConfig.id}: {levelConfig.title}</p>

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
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Sector</span>
              </button>

              <button
                id="pause-menu-btn"
                onClick={onReturnToMenu}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sector Map</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY SCREEN OVERLAY */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg font-sans">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#080808]/95 border border-cyan-500/50 shadow-2xl text-center overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 bg-cyan-500/15 blur-3xl pointer-events-none rounded-full" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60" />

            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 border border-cyan-400/40 text-white mb-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Trophy className="w-7 h-7" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mb-1 font-mono tracking-tight">
              SECTOR CLEARED
            </h2>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">
              Sector {levelConfig.id} Cleansed of Demon Incursion
            </p>

            {/* Match Rewards Breakdown Card */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-rose-400" /> Demons Slayed
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
                  🏆 All Demon Incursion Sectors Cleared! Supreme Demon Hunter!
                </div>
              )}

              <button
                id="victory-menu-btn"
                onClick={onReturnToMenu}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sector Map</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFEAT SCREEN OVERLAY */}
      {gameState === 'DEFEAT' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg font-sans">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#080808]/95 border border-rose-600/60 shadow-2xl text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-60" />
            <div className="inline-flex p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Skull className="w-7 h-7" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mb-1 font-mono tracking-tight">
              ALL LIVES LOST
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
              Vessel collapsed — Upgrade Blade & Armor at Dojo
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
                <span>Retry Sector</span>
              </button>

              <button
                id="defeat-menu-btn"
                onClick={onReturnToMenu}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sector Map</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERGONOMIC MOBILE / TOUCH SCREEN VIRTUAL CONTROLS (WITH PROPER GAPS & FIGHTING BUTTONS) */}
      {(isTouchDevice || true) && (
        <div className="absolute inset-x-0 bottom-4 z-20 pointer-events-none px-4 sm:px-8 flex items-end justify-between select-none">
          {/* Left D-Pad Controls: Move Backward / Move Forward with 24px Gap */}
          <div className="pointer-events-auto flex items-center gap-5 sm:gap-6">
            {/* Move Left / Backward */}
            <button
              id="touch-left-btn"
              onTouchStart={(e) => { e.preventDefault(); handleTouchStart('left'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('left'); }}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              onMouseLeave={() => handleTouchEnd('left')}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 active:bg-cyan-500/40 border-2 border-white/20 active:border-cyan-400 backdrop-blur-lg flex flex-col items-center justify-center text-cyan-400 font-black text-2xl active:scale-90 shadow-2xl transition-all"
              title="Move Left / Backward"
            >
              <span>◀</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase mt-[-2px]">BACK</span>
            </button>

            {/* Move Right / Forward */}
            <button
              id="touch-right-btn"
              onTouchStart={(e) => { e.preventDefault(); handleTouchStart('right'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('right'); }}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              onMouseLeave={() => handleTouchEnd('right')}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 active:bg-cyan-500/40 border-2 border-white/20 active:border-cyan-400 backdrop-blur-lg flex flex-col items-center justify-center text-cyan-400 font-black text-2xl active:scale-90 shadow-2xl transition-all"
              title="Move Right / Forward"
            >
              <span>▶</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase mt-[-2px]">FORWARD</span>
            </button>
          </div>

          {/* Right Action & Combat Cluster (Dash, Jump, Heavy Skill, Main Slash) */}
          <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
            {/* Secondary Combat Cluster (Jump & Dash & Heavy) */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Dash / Evade Button */}
                <button
                  id="touch-dash-btn"
                  onTouchStart={(e) => { e.preventDefault(); handleTouchStart('dash'); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('dash'); }}
                  onMouseDown={() => handleTouchStart('dash')}
                  onMouseUp={() => handleTouchEnd('dash')}
                  onMouseLeave={() => handleTouchEnd('dash')}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/80 active:bg-cyan-500/40 border border-white/20 active:border-cyan-400 backdrop-blur-lg flex flex-col items-center justify-center text-cyan-400 active:scale-90 shadow-2xl transition-all"
                  title="Dash Evade (K)"
                >
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span className="text-[8px] font-black uppercase text-gray-300">DASH</span>
                </button>

                {/* Jump Button */}
                <button
                  id="touch-jump-btn"
                  onTouchStart={(e) => { e.preventDefault(); handleTouchStart('jump'); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('jump'); }}
                  onMouseDown={() => handleTouchStart('jump')}
                  onMouseUp={() => handleTouchEnd('jump')}
                  onMouseLeave={() => handleTouchEnd('jump')}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/80 active:bg-cyan-500/40 border border-white/20 active:border-cyan-400 backdrop-blur-lg flex flex-col items-center justify-center text-cyan-400 active:scale-90 shadow-2xl transition-all"
                  title="Jump (W / Space)"
                >
                  <span className="text-base font-black">▲</span>
                  <span className="text-[8px] font-black uppercase text-gray-300">JUMP</span>
                </button>
              </div>

              {/* Heavy Whirlwind Cleave Attack Button */}
              <button
                id="touch-heavy-btn"
                onTouchStart={(e) => { e.preventDefault(); handleTouchStart('heavy'); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('heavy'); }}
                onMouseDown={() => handleTouchStart('heavy')}
                onMouseUp={() => handleTouchEnd('heavy')}
                onMouseLeave={() => handleTouchEnd('heavy')}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-600/80 to-amber-600/80 active:from-orange-500 active:to-amber-500 border border-amber-400/40 text-white flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                title="Whirlwind Cleave (L)"
              >
                <Swords className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[9px] font-black uppercase tracking-wider">WHIRLWIND</span>
              </button>
            </div>

            {/* Primary Katana Slash Attack Button (Large Glowing Cyan Diamond) */}
            <button
              id="touch-attack-btn"
              onTouchStart={(e) => { e.preventDefault(); handleTouchStart('attack'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('attack'); }}
              onMouseDown={() => handleTouchStart('attack')}
              onMouseUp={() => handleTouchEnd('attack')}
              onMouseLeave={() => handleTouchEnd('attack')}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-cyan-500 active:bg-cyan-400 border-2 border-cyan-200 text-black shadow-[0_0_35px_rgba(6,182,212,0.45)] flex flex-col items-center justify-center active:scale-90 transition-all cursor-pointer"
              title="Slash Attack (J)"
            >
              <Swords className="w-8 h-8 sm:w-9 sm:h-9 text-black" />
              <span className="text-[10px] font-black uppercase tracking-wider text-black mt-0.5">SLASH</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
