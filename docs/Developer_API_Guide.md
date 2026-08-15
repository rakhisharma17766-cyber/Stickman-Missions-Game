# ⚔️ Stickman Demon Hunter — Developer API & Architecture Guide

## 1. System Architecture Overview

`Stickman Demon Hunter` is a modular, high-performance 2D Canvas Action Game built for Web and Mobile (Capacitor/Android/iOS).

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                      │
│        (HomeScreen -> LevelSelect -> GameCanvas -> Dojo)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ PlayerProfile │      │  SoundEngine  │      │   GameLoop    │
│ (localStorage)│      │  (Web Audio)  │      │ (Fixed dt 60) │
└───────┬───────┘      └───────┬───────┘      └───────┬───────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Dojo Upgrades │      │ Procedural SFX│      │    Physics    │
│ & Progression │      │  & Multi-BGM  │      │ & Kinematics  │
└───────────────┘      └───────────────┘      └───────┬───────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       ▼                              ▼                              ▼
              ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
              │ Stickman (Hero) │            │ Demon Entities  │            │    UIManager    │
              │ (3-Lives, Combos)│           │(Brute, Gargoyle)│            │(HUD, Damage Pop)│
              └─────────────────┘            └─────────────────┘            └─────────────────┘
```

---

## 2. Health & Lives Progression System

The player character (`Stickman`) incorporates a health and lives model:

- **Lives Pool**: Starts with `3` lives per sector attempt.
- **Health Bar**: Sized dynamically based on Dojo Armor upgrades (`100 HP + 25 HP * level`).
- **Damage Mechanics**:
  - `Stickman.takeDamage(damage, sourceX, uiManager, particleSystem)`: Applies damage, camera shake, blood particles, and hit stun.
  - When `health <= 0` and `lives > 1`, `handleLifeLost()` triggers a **Soul Resurrection**:
    - Deducts 1 Life (`lives--`).
    - Grants **2.8s Mercy Invulnerability** (`invulnerableTimer`).
    - Restores Health to `maxHealth`.
    - Triggers procedural resurrection sound effect & aura ring.
    - Displays canvas banner: `✦ SOUL RESURRECTED — X LIVES REMAINING ✦`.
  - When `lives <= 0`, `isDead = true`, triggering the Defeat screen overlay and returning the player to the Sector Map or Dojo.

---

## 3. Procedural Audio & Music Engine (`src/utils/AudioFX.js`)

Zero external audio files are required; all SFX and Multi-Track BGM are procedurally synthesized in real-time using the **Web Audio API**:

### Background Music Synthesizer (`MusicPlayer`)
| Track Name | Tempo | Synth Style | Description |
|---|---|---|---|
| `MENU` | 90 BPM | Ambient Gothic Synth | Soft sub-bass, minor arpeggios, gentle rhythm. |
| `LEVEL1` | 124 BPM | Nether Incursion | 4-on-the-floor cyber beat, rolling D-minor bassline, Katana leads. |
| `LEVEL2` | 132 BPM | Shadow Catacombs | Breakbeat kicks, open hi-hats, syncopated acid arp. |
| `LEVEL3` / `BOSS` | 142 BPM | Overlord's Wrath | Double-time industrial kick, C-minor heavy bass, hellfire leads. |

### Sound FX Methods
- `AudioFX.playSlash(combo)`: Synthesizes high-frequency blade whistle (Combo 1, 2, or 3).
- `AudioFX.playDash()`: Air-burst white noise filter sweep.
- `AudioFX.playHit(isCrit)`: Flesh cutting impact with harmonic resonance.
- `AudioFX.playDemonDeath()`: Low-frequency soul shatter and sub-bass drop.
- `AudioFX.playJump()`: Upward frequency glide.
- `AudioFX.playPlayerHurt()`: Sawtooth dissonance and hit thump.
- `AudioFX.playRespawn()`: Ascending pentatonic revival chords.
- `AudioFX.playVictory()` / `AudioFX.playDefeat()`: Fanfares.

---

## 4. Mobile & Touch Screen Integration

- **Orientation Adaptation**: Automatically scales canvas pixel ratio and detects portrait view to prompt rotation to Landscape.
- **On-Screen Virtual Overlays**:
  - **Left D-Pad**: `◀` Left / `▶` Right direction buttons with active glassmorphism feedback.
  - **Right Action Cluster**:
    - `▲` Jump button
    - `⚡` Dash button (ghost-trail warp)
    - `⚔️` Large Neon SLASH button (combos 1, 2, 3)

---

## 5. Developer Tutorials

### Tutorial A: Adding a New Level
To add **Sector 4: Nether Citadel**, open `src/levels/LevelRegistry.js` and add a new level config:

```javascript
export const LEVEL_4 = {
  id: 4,
  title: "Nether Citadel",
  subtitle: "Infiltrate the high demon citadel and exterminate elite guards",
  winCondition: {
    type: "KILL_COUNT",
    targetCount: 20
  },
  rewards: {
    coins: 750,
    diamonds: 4
  },
  nextLevelId: 5,
  spawnTimeline: [
    { time: 1.0, type: "GroundBrute", count: 2, spawnSide: "both" },
    { time: 6.0, type: "FlyingGargoyle", count: 2, spawnSide: "right" },
    { time: 14.0, type: "GroundBrute", count: 3, spawnSide: "left" }
  ]
};
```

### Tutorial B: Adding a New Enemy
To create a ranged caster (e.g. `DemonPyromancer`):
1. Extend `BaseEnemy` in `src/entities/Enemies.js`.
2. Configure attributes (`maxHealth`, `speed`, `damage`, `attackRange`).
3. Implement procedural limb rendering in `draw(ctx)`.
4. Register the new enemy type in `createEnemy(type, x, y)` factory.

```javascript
export class DemonPyromancer extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 70,
      speed: 100,
      damage: 22,
      scoreValue: 220,
      coinDrop: 50,
      color: "#f97316",
      type: "DemonPyromancer"
    });
  }

  draw(ctx) {
    // Custom procedural visual drawing
  }
}
```

### Tutorial C: Accessing Player Economy & Profile
```javascript
import { PlayerProfile } from '../state/PlayerProfile';

// Read current profile:
const profile = PlayerProfile.getProfile();
console.log(profile.totalCoins, profile.totalDiamonds, profile.unlockedLevels);

// Subscribe to state updates:
const unsubscribe = PlayerProfile.subscribe((updatedProfile) => {
  console.log("Updated coins:", updatedProfile.totalCoins);
});
```
