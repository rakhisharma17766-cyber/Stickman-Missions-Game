import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../state/PlayerProfile';
import { AudioFX } from '../utils/AudioFX';
import { DojoModal } from './DojoModal';
import { Shield, Volume2, VolumeX, Sparkles, Swords, Zap, Crosshair, ChevronRight } from 'lucide-react';

export function HomeScreen({ onStartGame, onSelectLevels }) {
  const [profile, setProfile] = useState(PlayerProfile.getProfile());
  const [isDojoOpen, setIsDojoOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(profile.audioEnabled !== false);

  useEffect(() => {
    const unsubscribe = PlayerProfile.subscribe((updated) => {
      setProfile({ ...updated });
    });
    return unsubscribe;
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    AudioFX.setMuted(!next);
    PlayerProfile.setAudioEnabled(next);
    if (next) AudioFX.playSlash(1);
  };

  const handlePlayClick = () => {
    AudioFX.ensureContext();
    AudioFX.playSlash(2);
    onSelectLevels();
  };

  const hunterLevel = Math.min(99, 1 + Math.floor((profile.stats?.totalKills || 0) / 5) + (profile.upgrades?.bladeDamage || 1) * 2);
  const levelProgress = Math.min(100, (((profile.stats?.totalKills || 0) % 5) / 5) * 100);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] text-gray-100 font-sans overflow-hidden flex flex-col justify-between select-none">
      {/* Background Matrix & Subtle Gradient Mesh */}
      <div className="absolute inset-0 opacity-20 bg-dot-grid pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-white/10 z-20 pointer-events-none" />

      {/* HEADER: Hunter Identity & Economy HUD */}
      <header className="relative z-10 p-4 sm:p-8 flex justify-between items-start flex-wrap gap-4">
        {/* Hunter Emblem & Level Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Swords className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-white uppercase font-mono">
              SHADOW_HUNTER
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 w-24 sm:w-32 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-500"
                  style={{ width: `${Math.max(20, levelProgress)}%` }}
                />
              </div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                LVL {hunterLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Currency Badges & Settings Hub */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Gold Coin Pill */}
          <div id="economy-coins" className="flex items-center gap-2.5 sm:gap-3 bg-black/50 border border-white/10 rounded-full pl-1.5 sm:pl-2 pr-4 sm:pr-5 py-1.5 sm:py-2 backdrop-blur-md">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-xs shadow-[0_0_10px_rgba(234,179,8,0.4)]">
              C
            </div>
            <span className="font-mono font-bold text-xs sm:text-sm text-yellow-500">
              {profile.totalCoins.toLocaleString()}
            </span>
          </div>

          {/* Cyan Diamond Pill */}
          <div id="economy-diamonds" className="flex items-center gap-2.5 sm:gap-3 bg-black/50 border border-white/10 rounded-full pl-1.5 sm:pl-2 pr-4 sm:pr-5 py-1.5 sm:py-2 backdrop-blur-md">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-cyan-500 flex items-center justify-center text-black font-black text-xs shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              D
            </div>
            <span className="font-mono font-bold text-xs sm:text-sm text-cyan-400">
              {profile.totalDiamonds.toLocaleString()}
            </span>
          </div>

          {/* Hunter Dojo Upgrade Modal Trigger */}
          <button
            id="open-dojo-btn"
            onClick={() => {
              AudioFX.ensureContext();
              AudioFX.playSlash(1);
              setIsDojoOpen(true);
            }}
            className="p-2 sm:p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-400 hover:text-white transition-all shadow-md active:scale-95 flex items-center gap-2 px-3 sm:px-4"
            title="Hunter Dojo"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline text-gray-200">
              Dojo
            </span>
          </button>

          {/* Sound Toggle Button */}
          <button
            id="sound-toggle-btn"
            onClick={toggleSound}
            className="p-2 sm:p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
            title={soundEnabled ? "Mute Audio" : "Unmute Audio"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN: Metallic Hero Headline, Action Launch Cluster & Silhouette */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 py-6 px-4">
        {/* Title Header */}
        <div className="mb-8 sm:mb-10 text-center">
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-300 to-gray-600 uppercase leading-none drop-shadow-2xl">
            STICKMAN
          </h1>
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-[-6px] sm:mt-[-10px]">
            <div className="h-[2px] w-16 sm:w-28 bg-gradient-to-l from-cyan-400 to-transparent" />
            <h2 className="text-xl sm:text-3xl md:text-4xl font-light tracking-[0.35em] sm:tracking-[0.45em] text-cyan-400 uppercase">
              Demon Hunter
            </h2>
            <div className="h-[2px] w-16 sm:w-28 bg-gradient-to-r from-cyan-400 to-transparent" />
          </div>
        </div>

        {/* Action Controls Cluster */}
        <div className="flex flex-col gap-4 sm:gap-5 w-72 sm:w-80">
          {/* Main Primary Mission Launch Button */}
          <button
            id="play-button"
            onClick={handlePlayClick}
            className="group relative bg-cyan-500 hover:bg-cyan-400 text-black py-4 sm:py-5 px-8 sm:px-10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-white/25 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative text-xl sm:text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3">
              <span>Start Mission</span>
              <ChevronRight className="w-6 h-6 stroke-[3]" />
            </span>
          </button>

          {/* Quick Sub-actions: The Forge & Arena */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              id="open-arsenal-btn"
              onClick={() => {
                AudioFX.ensureContext();
                AudioFX.playSlash(1);
                setIsDojoOpen(true);
              }}
              className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/40 py-3.5 sm:py-4 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95"
            >
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">The Forge</span>
              <span className="text-xs sm:text-sm font-bold uppercase text-gray-200">Arsenal</span>
            </button>

            <button
              id="open-arena-btn"
              onClick={handlePlayClick}
              className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/40 py-3.5 sm:py-4 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95"
            >
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Trials</span>
              <span className="text-xs sm:text-sm font-bold uppercase text-gray-200">Arena</span>
            </button>
          </div>
        </div>

        {/* Ambient Stickman Demon Hunter Silhouette Art */}
        <div className="hidden lg:flex absolute right-12 xl:right-24 bottom-12 w-80 xl:w-96 h-[420px] items-center justify-center pointer-events-none">
          <svg className="w-full h-full opacity-40 drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]" viewBox="0 0 100 100">
            {/* Stickman Body & Limbs in Cyan */}
            <path
              d="M50 10 L50 85 M50 28 L28 48 M50 28 L72 48 M50 58 L28 88 M50 58 L72 88"
              stroke="#22d3ee"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Stickman Head */}
            <circle cx="50" cy="18" r="7.5" stroke="#22d3ee" strokeWidth="2.5" fill="none" />
            {/* Demon Katana Blade in Crimson Glow */}
            <path
              d="M72 48 L90 25 L84 55 Z"
              fill="#f43f5e"
              className="opacity-70 animate-pulse"
            />
          </svg>
        </div>
      </main>

      {/* FOOTER: Daily Mission Box & Build Info */}
      <footer className="relative z-10 p-4 sm:p-8 flex flex-wrap justify-between items-end gap-4">
        {/* Daily Mission Card */}
        <div className="flex gap-4">
          <div className="w-56 p-3.5 bg-white/5 border-l-4 border-cyan-400 rounded-r-lg backdrop-blur-sm">
            <p className="text-[10px] uppercase font-bold text-cyan-400 mb-1 tracking-wider">
              Daily Mission
            </p>
            <p className="text-xs sm:text-sm font-medium text-gray-200">
              Slay {profile.stats?.totalKills >= 15 ? '30' : '15'} Nether Demons
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 italic">
              Reward: 500 Coins + 2 Diamonds
            </p>
          </div>
        </div>

        {/* Engine and Build Tags */}
        <div className="flex items-center gap-4 sm:gap-8 text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest">
          <span className="text-cyan-400">Build 0.4.2-α</span>
          <span className="hidden sm:inline">Engine: Blade-2D</span>
          <span className="bg-white/10 text-white px-2.5 py-1 rounded">v1.2.0-Production</span>
        </div>
      </footer>

      {/* Dojo Upgrade Modal */}
      <DojoModal isOpen={isDojoOpen} onClose={() => setIsDojoOpen(false)} />
    </div>
  );
}

