import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../state/PlayerProfile';
import { ALL_LEVELS } from '../levels/LevelRegistry';
import { AudioFX } from '../utils/AudioFX';
import { ArrowLeft, Lock, Trophy, Skull, Play, Zap, ChevronRight } from 'lucide-react';

export function LevelSelectScreen({ onBack, onStartLevel }) {
  const [profile, setProfile] = useState(PlayerProfile.getProfile());

  useEffect(() => {
    const unsubscribe = PlayerProfile.subscribe((updated) => {
      setProfile({ ...updated });
    });
    return unsubscribe;
  }, []);

  const handleLevelClick = (level) => {
    const isUnlocked = profile.unlockedLevels.includes(level.id);
    if (!isUnlocked) {
      AudioFX.playHit(false);
      return;
    }
    AudioFX.ensureContext();
    AudioFX.playSlash(2);
    onStartLevel(level.id);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-[#050505] text-gray-100 font-sans overflow-y-auto select-none">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 opacity-20 bg-dot-grid pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505] pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 z-20 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-full h-px bg-white/10 z-20 pointer-events-none" />

      {/* TOP BAR */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 mb-8 shadow-2xl">
        <button
          id="level-select-back-btn"
          onClick={() => {
            AudioFX.playSlash(1);
            onBack();
          }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase transition-all shadow-md active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Main Menu</span>
        </button>

        <div className="text-center hidden sm:block">
          <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase font-mono">
            SECTOR DEPLOYMENT
          </h1>
          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
            Select Demon Incursion Sector
          </p>
        </div>

        {/* Currency Counters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-black/50 border border-white/10 rounded-full pl-1.5 pr-4 py-1.5 backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-xs shadow-[0_0_8px_rgba(234,179,8,0.4)]">
              C
            </div>
            <span className="font-mono font-bold text-xs sm:text-sm text-yellow-500">
              {profile.totalCoins.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2.5 bg-black/50 border border-white/10 rounded-full pl-1.5 pr-4 py-1.5 backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-black font-black text-xs shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              D
            </div>
            <span className="font-mono font-bold text-xs sm:text-sm text-cyan-400">
              {profile.totalDiamonds.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* LEVEL CARDS GRID */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {ALL_LEVELS.map((level) => {
          const isUnlocked = profile.unlockedLevels.includes(level.id);
          const highScore = profile.highScores?.[level.id] || 0;

          return (
            <div
              key={level.id}
              id={`level-card-${level.id}`}
              onClick={() => isUnlocked && handleLevelClick(level)}
              className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                isUnlocked
                  ? 'bg-black/60 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:-translate-y-1 cursor-pointer group backdrop-blur-md'
                  : 'bg-black/40 border border-white/5 text-gray-500 opacity-60 cursor-not-allowed backdrop-blur-sm'
              }`}
            >
              {/* Level Glow Aura for unlocked */}
              {isUnlocked && (
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
              )}

              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                      isUnlocked
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-gray-600 border border-white/5'
                    }`}
                  >
                    STAGE {level.id}
                  </span>

                  {isUnlocked ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-cyan-400">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" /> READY
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                      <Lock className="w-3.5 h-3.5" /> LOCKED
                    </span>
                  )}
                </div>

                {/* Level Title */}
                <h3
                  className={`text-xl font-black uppercase tracking-wide mb-2 font-mono ${
                    isUnlocked ? 'text-white group-hover:text-cyan-300 transition-colors' : 'text-gray-500'
                  }`}
                >
                  {level.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  {level.subtitle}
                </p>

                {/* Objective details */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Skull className="w-3.5 h-3.5 text-rose-400" />
                      Win Condition
                    </span>
                    <span className="font-bold text-gray-200">
                      {level.winCondition.type === 'KILL_COUNT'
                        ? `Defeat ${level.winCondition.targetCount} Demons`
                        : 'Slay Demon Overlord'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      High Score
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {highScore.toLocaleString()} PTS
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Rewards & Launch Button */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Rewards</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-yellow-950/40 border border-yellow-500/30 text-yellow-400 font-mono text-xs font-bold">
                      +{level.rewards.coins} C
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold">
                      +{level.rewards.diamonds} D
                    </span>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    id={`launch-level-${level.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLevelClick(level);
                    }}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>LAUNCH SECTOR</span>
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-xl bg-white/5 border border-white/5 text-gray-600 font-bold text-xs uppercase text-center flex items-center justify-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Clear Stage {level.id - 1} First</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto text-center py-4">
        <p className="text-xs text-gray-500 font-semibold tracking-wider uppercase">
          Enhance Katana Sharpness and Armor in the Hunter Dojo before attempting Boss Arenas
        </p>
      </footer>
    </div>
  );
}

