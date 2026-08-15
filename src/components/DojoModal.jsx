import React, { useState } from 'react';
import { PlayerProfile } from '../state/PlayerProfile';
import { Shield, Zap, Flame, Crosshair, X, Check, Award } from 'lucide-react';

export function DojoModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(PlayerProfile.getProfile());
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const upgradesConfig = [
    {
      key: 'bladeDamage',
      name: 'Demon Blade Sharpness',
      desc: '+15% Base Katana Damage & Spark Radius',
      icon: Flame,
      color: 'text-rose-400',
      borderColor: 'border-white/10 hover:border-rose-500/40',
      getCoinCost: (lvl) => lvl * 250,
      getDiamondCost: (lvl) => lvl > 2 ? lvl - 1 : 0
    },
    {
      key: 'maxHealth',
      name: 'Demon Hunter Vitality',
      desc: '+25 Maximum HP & Armor Durability',
      icon: Shield,
      color: 'text-emerald-400',
      borderColor: 'border-white/10 hover:border-emerald-500/40',
      getCoinCost: (lvl) => lvl * 200,
      getDiamondCost: () => 0
    },
    {
      key: 'dashEnergy',
      name: 'Shadow Warp Step',
      desc: '-15% Dash Cooldown & Extended I-Frames',
      icon: Zap,
      color: 'text-cyan-400',
      borderColor: 'border-white/10 hover:border-cyan-500/40',
      getCoinCost: (lvl) => lvl * 300,
      getDiamondCost: (lvl) => lvl > 1 ? lvl : 0
    },
    {
      key: 'critRate',
      name: 'Abyssal Focus',
      desc: '+5% Critical Strike Chance (2x Damage)',
      icon: Crosshair,
      color: 'text-amber-400',
      borderColor: 'border-white/10 hover:border-amber-500/40',
      getCoinCost: (lvl) => lvl * 400,
      getDiamondCost: (lvl) => lvl * 2
    }
  ];

  const handleUpgrade = (item) => {
    const currentLevel = profile.upgrades[item.key] || 1;
    if (currentLevel >= 5) return;

    const coinCost = item.getCoinCost(currentLevel);
    const diamondCost = item.getDiamondCost(currentLevel);

    const result = PlayerProfile.upgradeSkill(item.key, coinCost, diamondCost);
    if (result.success) {
      setProfile(result.profile);
      setMessage(`Enhanced ${item.name} to Level ${result.profile.upgrades[item.key]}!`);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Insufficient Coins or Diamonds!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#080808]/95 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl text-gray-100 overflow-hidden font-sans">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 border border-cyan-400/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase font-mono">
                HUNTER DOJO & ARSENAL
              </h2>
              <p className="text-xs text-gray-400">
                Enhance combat attributes with harvested demon souls
              </p>
            </div>
          </div>
          <button
            id="dojo-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Status in Modal */}
        <div className="flex gap-4 mb-6 p-3 rounded-xl bg-white/5 border border-white/5 justify-center sm:justify-end">
          <div className="flex items-center gap-2.5 bg-black/50 border border-white/10 rounded-full pl-1.5 pr-4 py-1">
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-[10px]">
              C
            </div>
            <span className="font-bold text-yellow-500 text-xs sm:text-sm font-mono">
              {profile.totalCoins.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2.5 bg-black/50 border border-white/10 rounded-full pl-1.5 pr-4 py-1">
            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-black font-black text-[10px]">
              D
            </div>
            <span className="font-bold text-cyan-400 text-xs sm:text-sm font-mono">
              {profile.totalDiamonds.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Upgrade Notification Message */}
        {message && (
          <div className="mb-4 p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs font-semibold text-center">
            {message}
          </div>
        )}

        {/* Upgrades List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {upgradesConfig.map((item) => {
            const Icon = item.icon;
            const currentLevel = profile.upgrades[item.key] || 1;
            const isMax = currentLevel >= 5;
            const coinCost = item.getCoinCost(currentLevel);
            const diamondCost = item.getDiamondCost(currentLevel);
            const canAfford = profile.totalCoins >= coinCost && profile.totalDiamonds >= diamondCost;

            return (
              <div
                key={item.key}
                id={`upgrade-card-${item.key}`}
                className={`p-4 rounded-xl bg-black/50 border ${item.borderColor} flex flex-col justify-between transition-all backdrop-blur-sm`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                      <span className="font-bold text-sm text-white">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-400 font-mono">
                      LV {currentLevel}/5
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{item.desc}</p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  {!isMax ? (
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-yellow-500 font-mono font-bold">{coinCost} C</span>
                      {diamondCost > 0 && <span className="text-cyan-400 font-mono font-bold">+{diamondCost} D</span>}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> MAX LEVEL
                    </span>
                  )}

                  {!isMax && (
                    <button
                      id={`buy-${item.key}`}
                      onClick={() => handleUpgrade(item)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        canAfford
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95'
                          : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      Enhance
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

