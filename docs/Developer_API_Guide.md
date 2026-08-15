# Stickman Demon Hunter — Developer API & Architecture Guide

Welcome to the **Stickman Demon Hunter** Game Engine Architecture Guide. This document details the core classes, state management, entity lifecycle, physics, and step-by-step tutorials for extending the game engine with new levels, enemies, and UI bindings.

---

## Table of Contents
1. [Architectural Overview](#1-architectural-overview)
2. [State Management & Economy (`PlayerProfile`)](#2-state-management--economy-playerprofile)
3. [Core Engine Components](#3-core-engine-components)
   - `GameLoop`
   - `Physics`
   - `UIManager`
   - `AudioFX`
4. [Graphics & Animation System](#4-graphics--animation-system)
   - `Background`
   - `Animations`
   - Particle & Hit Effects
5. [Entity Hierarchy](#5-entity-hierarchy)
   - `Stickman` (Player)
   - `BaseEnemy`, `GroundBrute`, `FlyingGargoyle`, `DemonLordBoss`
6. [Level Configuration Architecture](#6-level-configuration-architecture)
7. [Step-by-Step Developer Tutorials](#7-step-by-step-developer-tutorials)
   - [Tutorial 1: Adding a New Level with Specific Rewards](#tutorial-1-adding-a-new-level-with-specific-rewards)
   - [Tutorial 2: Adding a New Enemy Subclass](#tutorial-2-adding-a-new-enemy-subclass)
   - [Tutorial 3: Accessing & Modifying Player Economy in React](#tutorial-3-accessing--modifying-player-economy-in-react)
8. [Capacitor & Android Deployment Notes](#8-capacitor--android-deployment-notes)

---

## 1. Architectural Overview

```
Stickman Demon Hunter
├── React UI Layer (Glassmorphism, High-DPI Canvas host)
│   ├── HomeScreen (Economy HUD, Play Button, Hunter Upgrades)
│   ├── LevelSelectScreen (Interactive Stage Progression Grid)
│   └── GameCanvas (Bridge between React Lifecycle & Game Engine)
│
├── Engine Core
│   ├── GameLoop (Fixed Delta-Time, 60+ FPS Interpolation, Pause/Resume)
│   ├── Physics (AABB Collisions, Gravity, Drag, Slashing Hitboxes)
│   └── UIManager (Canvas Overlays, Kill Counts, Boss Health Bars, Floaters)
│
├── Graphics & Audio
│   ├── Background (Multi-layer Neon Parallax System)
│   ├── Animations (Procedural Inverse-Kinematic Stickman Animation States)
│   └── AudioFX (Web Audio API Real-time Polyphonic Synthesizer)
│
├── Entities
│   ├── Stickman (Player: Combos, Dash, Demon Blade Slash, Health)
│   └── Enemies (BaseEnemy, GroundBrute, FlyingGargoyle, DemonLord)
│
└── Level System
    └── Declarative JSON/JS Configs (Spawns, Waves, Bosses, Rewards)
```

---

## 2. State Management & Economy (`PlayerProfile`)

The `PlayerProfile` module provides a reactive, persistent `localStorage` store for the player's economic assets, unlocked levels, skill upgrades, and weapon masteries.

### State Schema
```javascript
{
  totalCoins: number,          // In-game gold earned from demons
  totalDiamonds: number,       // Rare gems awarded for boss fights/clears
  unlockedLevels: number[],    // Array of unlocked level IDs, e.g. [1, 2, 3]
  highScores: { [levelId]: number },
  stats: {
    demonsSlain: number,
    slashesExecuted: number,
    totalDamageDealt: number
  },
  upgrades: {
    bladeDamage: number,       // Level 1-5
    maxHealth: number,         // Level 1-5
    dashCooldown: number,      // Level 1-5
    demonAura: number          // Level 1-5
  }
}
```

### Core Methods
- `PlayerProfile.getProfile()`: Retrieves the current cached profile (loads from `localStorage` if not yet loaded).
- `PlayerProfile.addRewards(coins, diamonds)`: Adds currency atomically and saves to `localStorage`. Triggers registered event listeners.
- `PlayerProfile.unlockNextLevel(currentLevelId)`: Adds `currentLevelId + 1` to `unlockedLevels` if not already present.
- `PlayerProfile.purchaseUpgrade(upgradeKey, costCoins, costDiamonds)`: Deducts currency and levels up the upgrade attribute.
- `PlayerProfile.subscribe(callback)`: Registers a listener function called whenever the profile state changes.

---

## 3. Core Engine Components

### `GameLoop`
- **Role**: Manages frame-rate independence via Delta Time calculation (`dt = (currentTime - lastTime) / 1000`).
- **Methods**:
  - `start()`: Initializes `requestAnimationFrame` loop.
  - `stop()` / `pause()`: Halts loop execution without losing internal state.
  - `setCallback(updateFn, renderFn)`: Connects logic and render stages.

### `Physics`
- **Constants**: `GRAVITY = 1200`, `AIR_RESISTANCE = 0.98`, `GROUND_Y = 0.82 * canvasHeight`.
- **Functions**:
  - `checkAABB(boxA, boxB)`: Axis-Aligned Bounding Box intersection.
  - `checkAttackIntersection(attackBox, targetBox)`: Directional attack vector vs hurtbox collision.
  - `resolveGround(entity, groundY)`: Clamps entity to ground and zeroes vertical velocity.

### `UIManager`
- **Role**: Draws dynamic in-game canvas HUD (Player Health Bar, Dash Energy Gauge, Combo Counter, Demon Objective Kill Progress, Floating Damage Numbers, and Boss Vitality Meter).

---

## 4. Graphics & Animation System

### `Background`
- **Layers**:
  1. *Deep Sky & Blood Moon*: Static neon gradient with glowing celestial disc.
  2. *Distant Demon Spire Silhouettes*: Scrolls at `0.1x` camera velocity.
  3. *Ruined Gothic Ruins & Torches*: Scrolls at `0.3x` camera velocity.
  4. *Foreground Neon Fog & Ash Particles*: Real-time atmospheric particle simulation.

### `Animations`
- Procedural bone-rigging and joint interpolation for stick figures:
  - `IDLE`: Subtle breathing motion, blade idle humming.
  - `RUN`: Dynamic leg cycle with arm swing and blade trail.
  - `JUMP / FALL`: Aerial silhouette posing with airborne inertia.
  - `SLASH_1, SLASH_2, SLASH_AIR`: Multi-frame arc slashes with glowing cyan/neon arcs.
  - `DEMON_DASH`: Motion blur clones with trailing alpha fade.
  - `HURT / DEATH`: Ragdoll impulse and particle shatter.

---

## 5. Entity Hierarchy

### `Stickman` (Player)
- **Controls**:
  - Left / Right (Arrow keys / 'A', 'D' / On-Screen Touch Joystick)
  - Jump ('W', Space, Up Arrow / Touch Jump Button)
  - Attack ('J', 'Z', Left Click / Touch Attack Button)
  - Demon Dash / Special ('K', 'X', Right Click / Touch Dash Button)
- **Combat Properties**:
  - `health`, `maxHealth`, `comboCount`, `comboTimer`, `dashCooldownTimer`, `isAttacking`, `invulnerableFrames`.

### `BaseEnemy`
- Common logic for patrol, detection range, aggro chase, attack cooldowns, taking damage, floating combat text, and death particle explosions.

### Enemy Subclasses
- `GroundBrute`: Heavy ground demon with shield/club, high HP, telegraph swings.
- `FlyingGargoyle`: Aerial dive-bomber navigating via sine-wave flight patterns.
- `DemonLordBoss`: Multi-phase boss with fiery ground waves, teleport dash, and summon abilities.

---

## 6. Level Configuration Architecture

Levels strictly contain **declarative configuration data** with zero embedded physics or render logic.

```javascript
export const LevelConfig = {
  id: 1,
  title: "Gates of the Underworld",
  nextLevelId: 2,
  environment: "crimson_ruins",
  winCondition: {
    type: "KILL_COUNT", // "KILL_COUNT" | "BOSS_DEFEATED" | "SURVIVAL_TIME"
    targetCount: 15
  },
  rewards: {
    coins: 500,
    diamonds: 10
  },
  spawnTimeline: [
    { time: 1.0, type: "GroundBrute", count: 2, spawnSide: "right" },
    { time: 5.0, type: "FlyingGargoyle", count: 1, spawnSide: "left" },
    { time: 10.0, type: "GroundBrute", count: 3, spawnSide: "both" },
    { time: 18.0, type: "FlyingGargoyle", count: 2, spawnSide: "right" },
    // Endless reinforcement wave generator if target is not yet reached
  ]
};
```

---

## 7. Step-by-Step Developer Tutorials

### Tutorial 1: Adding a New Level with Specific Rewards

1. Create a new file `src/levels/Level4.js` (or next sequence):
```javascript
export const Level4 = {
  id: 4,
  title: "Abyssal Throne",
  description: "Confront the Hellfire Archon at the core of the Underworld.",
  nextLevelId: 5,
  environment: "abyssal_inferno",
  winCondition: {
    type: "BOSS_DEFEATED",
    targetCount: 1,
    bossType: "DemonLordBoss"
  },
  rewards: {
    coins: 2000,
    diamonds: 50
  },
  spawnTimeline: [
    { time: 2.0, type: "GroundBrute", count: 2, spawnSide: "both" },
    { time: 6.0, type: "DemonLordBoss", count: 1, spawnSide: "right" }
  ]
};
```

2. Register the level in `src/levels/LevelRegistry.js`:
```javascript
import { Level1 } from './Level1';
import { Level2 } from './Level2';
import { Level3 } from './Level3';
import { Level4 } from './Level4';

export const ALL_LEVELS = [Level1, Level2, Level3, Level4];

export function getLevelById(id) {
  return ALL_LEVELS.find(lvl => lvl.id === Number(id)) || Level1;
}
```

---

### Tutorial 2: Adding a New Enemy Subclass

1. Open `src/entities/Enemies.js` and extend `BaseEnemy`:

```javascript
export class ShadowNinjaDemon extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 65,
      speed: 160,
      damage: 18,
      scoreValue: 250,
      color: "#a855f7", // Neon Purple
      accentColor: "#c084fc",
      width: 32,
      height: 60,
      type: "ShadowNinjaDemon"
    });
    this.teleportTimer = 0;
    this.teleportCooldown = 4.0;
  }

  update(dt, player, groundY) {
    super.update(dt, player, groundY);
    if (this.isDead) return;

    // Custom Shadow Step Teleport AI
    this.teleportTimer += dt;
    if (this.teleportTimer >= this.teleportCooldown) {
      this.teleportTimer = 0;
      // Teleport behind player with smoke particles
      const behindX = player.facing === "right" ? player.x - 70 : player.x + 70;
      this.x = behindX;
      this.vx = 0;
    }
  }

  draw(ctx) {
    super.draw(ctx);
    // Add custom shadow aura or shuriken animation
  }
}
```

2. Map `"ShadowNinjaDemon"` in the enemy factory in `src/entities/Enemies.js`:
```javascript
export function createEnemy(type, x, y) {
  switch (type) {
    case "GroundBrute": return new GroundBrute(x, y);
    case "FlyingGargoyle": return new FlyingGargoyle(x, y);
    case "ShadowNinjaDemon": return new ShadowNinjaDemon(x, y);
    case "DemonLordBoss": return new DemonLordBoss(x, y);
    default: return new GroundBrute(x, y);
  }
}
```

---

### Tutorial 3: Accessing & Modifying Player Economy in React

```javascript
import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../state/PlayerProfile';

export function EconomyDisplay() {
  const [profile, setProfile] = useState(PlayerProfile.getProfile());

  useEffect(() => {
    // Subscribe to real-time economy updates
    const unsubscribe = PlayerProfile.subscribe((newProfile) => {
      setProfile({ ...newProfile });
    });
    return unsubscribe;
  }, []);

  const handleBonusClaim = () => {
    PlayerProfile.addRewards(100, 5); // +100 Coins, +5 Diamonds
  };

  return (
    <div className="flex gap-4">
      <span>Coins: {profile.totalCoins}</span>
      <span>Diamonds: {profile.totalDiamonds}</span>
      <button onClick={handleBonusClaim}>Claim Daily Reward</button>
    </div>
  );
}
```

---

## 8. Capacitor & Android Deployment Notes

1. **Orientation**: Lock to Landscape mode in `capacitor.config.json` for optimal gaming ergonomics:
   ```json
   {
     "appId": "com.stickman.demonhunter",
     "appName": "Stickman Demon Hunter",
     "webDir": "dist",
     "plugins": {
       "ScreenOrientation": {
         "defaultOrientation": "landscape"
       }
     }
   }
   ```
2. **Touch Targets**: The on-screen joystick and virtual attack/jump/dash buttons automatically activate on touch devices and window width <= 1024px.
3. **Safe Areas**: All HUD overlays utilize `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to adapt flawlessly across notched devices.
