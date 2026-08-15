/**
 * PlayerProfile.js
 * Persistent State Management & Economy for Stickman Demon Hunter
 */

const STORAGE_KEY = "STICKMAN_DEMON_HUNTER_PROFILE_V1";

const DEFAULT_PROFILE = {
  totalCoins: 250,
  totalDiamonds: 5,
  unlockedLevels: [1],
  highScores: { 1: 0 },
  selectedWeapon: "katana_neon",
  audioEnabled: true,
  upgrades: {
    bladeDamage: 1,      // +10% dmg per level
    maxHealth: 1,        // +20 HP per level
    dashEnergy: 1,       // -15% cooldown per level
    demonAura: 0,        // Passive soul burn
    critRate: 1          // +5% critical hit chance
  },
  stats: {
    totalKills: 0,
    bossesDefeated: 0,
    totalCoinsEarned: 250,
    totalDiamondsEarned: 5,
    gamesPlayed: 0
  }
};

class PlayerProfileManager {
  constructor() {
    this.profile = this.load();
    this.listeners = new Set();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          upgrades: { ...DEFAULT_PROFILE.upgrades, ...(parsed.upgrades || {}) },
          stats: { ...DEFAULT_PROFILE.stats, ...(parsed.stats || {}) },
          unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length > 0 
            ? Array.from(new Set([1, ...parsed.unlockedLevels])) 
            : [1]
        };
      }
    } catch (e) {
      console.warn("Failed to load PlayerProfile from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.warn("Failed to save PlayerProfile to localStorage:", e);
    }
    this.notify();
  }

  notify() {
    this.listeners.forEach(fn => {
      try {
        fn(this.getProfile());
      } catch (err) {
        console.error("PlayerProfile listener error:", err);
      }
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getProfile() {
    return { ...this.profile };
  }

  addRewards(coins = 0, diamonds = 0, kills = 0, score = 0, levelId = null) {
    this.profile.totalCoins = Math.max(0, this.profile.totalCoins + Math.floor(coins));
    this.profile.totalDiamonds = Math.max(0, this.profile.totalDiamonds + Math.floor(diamonds));
    
    this.profile.stats.totalCoinsEarned += Math.floor(coins);
    this.profile.stats.totalDiamondsEarned += Math.floor(diamonds);
    this.profile.stats.totalKills += Math.floor(kills);
    this.profile.stats.gamesPlayed += 1;

    if (levelId) {
      const prevHigh = this.profile.highScores[levelId] || 0;
      if (score > prevHigh) {
        this.profile.highScores[levelId] = score;
      }
    }

    this.save();
    return this.getProfile();
  }

  recordKill(isBoss = false) {
    this.profile.stats.totalKills = (this.profile.stats.totalKills || 0) + 1;
    if (isBoss) {
      this.profile.stats.bossesDefeated = (this.profile.stats.bossesDefeated || 0) + 1;
    }
    this.save();
    return this.getProfile();
  }

  unlockLevel(levelId) {
    const id = Number(levelId);
    if (id && !this.profile.unlockedLevels.includes(id)) {
      this.profile.unlockedLevels.push(id);
      this.profile.unlockedLevels.sort((a, b) => a - b);
      this.save();
    }
    return this.getProfile();
  }

  unlockNextLevel(currentLevelId) {
    const nextId = Number(currentLevelId) + 1;
    if (!this.profile.unlockedLevels.includes(nextId)) {
      this.profile.unlockedLevels.push(nextId);
      this.profile.unlockedLevels.sort((a, b) => a - b);
      this.save();
    }
    return this.getProfile();
  }

  isLevelUnlocked(levelId) {
    return this.profile.unlockedLevels.includes(Number(levelId));
  }

  upgradeSkill(skillName, coinCost, diamondCost = 0) {
    if (
      this.profile.totalCoins >= coinCost &&
      this.profile.totalDiamonds >= diamondCost &&
      this.profile.upgrades[skillName] !== undefined
    ) {
      this.profile.totalCoins -= coinCost;
      this.profile.totalDiamonds -= diamondCost;
      this.profile.upgrades[skillName] += 1;
      this.save();
      return { success: true, profile: this.getProfile() };
    }
    return { success: false, reason: "Insufficient currency or invalid upgrade" };
  }

  setAudioEnabled(enabled) {
    this.profile.audioEnabled = !!enabled;
    this.save();
  }

  resetProgress() {
    this.profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    this.save();
  }
}

export const PlayerProfile = new PlayerProfileManager();
