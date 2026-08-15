/**
 * AudioFX.js
 * High-performance, zero-latency procedural sound synthesizer & dynamic BGM engine for Stickman Demon Hunter.
 * Powered by the Web Audio API with zero external asset dependencies (iOS/Android/Desktop 100% compatible).
 */

class MusicPlayer {
  constructor(audioCtx, masterGain) {
    this.ctx = audioCtx;
    this.masterGain = masterGain;
    this.bgmGain = null;
    this.isPlaying = false;
    this.currentTrack = null; // "MENU" | "LEVEL1" | "LEVEL2" | "LEVEL3"
    this.timerId = null;
    this.step = 0;
    this.tempo = 120; // BPM
    this.activeNodes = [];
  }

  init() {
    if (!this.ctx) return;
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }
  }

  playTrack(trackName) {
    if (!this.ctx) return;
    this.init();
    if (this.currentTrack === trackName && this.isPlaying) return;

    this.stop();
    this.currentTrack = trackName;
    this.isPlaying = true;
    this.step = 0;

    switch (trackName) {
      case "MENU":
        this.tempo = 90;
        break;
      case "LEVEL1":
        this.tempo = 124;
        break;
      case "LEVEL2":
        this.tempo = 132;
        break;
      case "LEVEL3":
      case "BOSS":
        this.tempo = 142;
        break;
      default:
        this.tempo = 120;
    }

    const intervalMs = (60 / this.tempo / 4) * 1000; // 16th note interval
    this.timerId = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  tick() {
    if (!this.ctx || !this.isPlaying || this.ctx.state === "suspended") return;
    const t = this.ctx.currentTime;
    const step16 = this.step % 16;
    const step32 = this.step % 32;

    if (this.currentTrack === "MENU") {
      this.playMenuBeat(t, step16, step32);
    } else if (this.currentTrack === "LEVEL1") {
      this.playLevel1Beat(t, step16, step32);
    } else if (this.currentTrack === "LEVEL2") {
      this.playLevel2Beat(t, step16, step32);
    } else if (this.currentTrack === "LEVEL3" || this.currentTrack === "BOSS") {
      this.playBossBeat(t, step16, step32);
    }

    this.step++;
  }

  // Soft synth kick drum
  triggerKick(t, vol = 0.4, decay = 0.18) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + decay);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(t);
    osc.stop(t + decay);
  }

  // Snare / Cyber hi-hat
  triggerHiHat(t, vol = 0.15, isClosed = true) {
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(isClosed ? 7000 : 4000, t);

    const gain = this.ctx.createGain();
    const dur = isClosed ? 0.04 : 0.12;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(t);
  }

  // Bass Synth Note
  triggerBass(t, freq, dur = 0.15, vol = 0.22) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(t);
    osc.stop(t + dur);
  }

  // Lead / Arp Synth Note
  triggerLead(t, freq, dur = 0.12, vol = 0.18) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(t);
    osc.stop(t + dur);
  }

  // Track 1: Dark Ambient Cyber-Gothic Menu Music
  playMenuBeat(t, s16, s32) {
    // Ambient kick on beats 1 & 9
    if (s16 === 0 || s16 === 8) {
      this.triggerKick(t, 0.25, 0.22);
    }
    // Soft hihat
    if (s16 % 4 === 2) {
      this.triggerHiHat(t, 0.08, true);
    }

    // Melodic Minor Arp
    const menuNotes = [110, 130.81, 146.83, 164.81, 130.81, 110, 98, 110]; // A minor
    if (s16 % 2 === 0) {
      const idx = (s16 / 2) % menuNotes.length;
      this.triggerLead(t, menuNotes[idx] * 2, 0.25, 0.12);
      if (s16 === 0 || s16 === 8) {
        this.triggerBass(t, menuNotes[idx] * 0.5, 0.4, 0.18);
      }
    }
  }

  // Track 2: Nether Gates Incursion (Level 1)
  playLevel1Beat(t, s16, s32) {
    // 4-on-the-floor driving cyber kick
    if (s16 % 4 === 0) {
      this.triggerKick(t, 0.35, 0.15);
    }
    // Hi-hats on off-beats
    if (s16 % 2 === 1) {
      this.triggerHiHat(t, 0.12, true);
    }

    // Fast Bassline (D minor rolling)
    const bassline = [73.42, 73.42, 87.31, 73.42, 98.00, 73.42, 87.31, 110.00];
    if (s16 % 2 === 0) {
      const note = bassline[(s16 / 2) % bassline.length];
      this.triggerBass(t, note, 0.14, 0.25);
    }

    // Synced Katana Lead notes
    if (s16 === 0 || s16 === 6 || s16 === 10 || s16 === 14) {
      const leadNotes = [293.66, 349.23, 392.00, 440.00];
      const leadNote = leadNotes[Math.floor(s16 / 4) % leadNotes.length];
      this.triggerLead(t, leadNote, 0.18, 0.16);
    }
  }

  // Track 3: Shadow Catacombs (Level 2)
  playLevel2Beat(t, s16, s32) {
    // Heavy breakbeat kick
    if (s16 === 0 || s16 === 6 || s16 === 10) {
      this.triggerKick(t, 0.4, 0.16);
    }
    // Open/Closed Hi-hats
    this.triggerHiHat(t, s16 % 4 === 2 ? 0.18 : 0.08, s16 % 4 !== 2);

    // E minor Cyber Bassline
    const bassNotes = [82.41, 82.41, 98.00, 110.00, 82.41, 123.47, 110.00, 98.00];
    if (s16 % 2 === 0) {
      const bNote = bassNotes[(s16 / 2) % bassNotes.length];
      this.triggerBass(t, bNote, 0.12, 0.28);
    }

    // Fast Acid Arpeggios
    const arpNotes = [329.63, 392.00, 493.88, 587.33, 659.25, 493.88, 392.00, 440.00];
    const arpNote = arpNotes[s16 % arpNotes.length];
    this.triggerLead(t, arpNote, 0.1, 0.15);
  }

  // Track 4: Demon Overlord Arena Battle (Level 3 / Boss)
  playBossBeat(t, s16, s32) {
    // Pounding double kick
    if (s16 % 2 === 0) {
      this.triggerKick(t, 0.45, 0.14);
    }
    // High energy hi-hat
    this.triggerHiHat(t, 0.15, s16 % 2 === 0);

    // Dark C minor Heavy Industrial Bass
    const bossBass = [65.41, 65.41, 77.78, 65.41, 87.31, 65.41, 98.00, 65.41];
    const bNote = bossBass[s16 % bossBass.length];
    this.triggerBass(t, bNote, 0.1, 0.32);

    // Dissonant Hellfire Lead
    if (s16 % 4 === 0 || s16 % 4 === 3) {
      const bossLeads = [523.25, 587.33, 622.25, 698.46, 783.99];
      const lNote = bossLeads[(Math.floor(s16 / 2)) % bossLeads.length];
      this.triggerLead(t, lNote, 0.18, 0.22);
    }
  }
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.initialized = false;
    this.music = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.music = new MusicPlayer(this.ctx, this.masterGain);
        this.initialized = true;
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
    if (this.music) {
      if (muted) {
        this.music.stop();
      }
    }
  }

  playBGM(trackName) {
    this.ensureContext();
    if (!this.muted && this.music) {
      this.music.playTrack(trackName);
    }
  }

  stopBGM() {
    if (this.music) {
      this.music.stop();
    }
  }

  // Neon Katana Light Slash (Combo 1, 2, 3)
  playSlash(combo = 1) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const baseFreq = 300 + combo * 140;
    osc.type = combo === 3 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(baseFreq * 2.4, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, t + (combo === 3 ? 0.18 : 0.12));

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600 + combo * 300, t);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(combo === 3 ? 0.55 : 0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (combo === 3 ? 0.2 : 0.14));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (combo === 3 ? 0.22 : 0.15));
  }

  // Demon Dash / Warp whoosh
  playDash() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(3600, t + 0.08);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // Enemy Hit / Katana Flesh Cut
  playHit(isCrit = false) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? "square" : "triangle";
    osc.frequency.setValueAtTime(isCrit ? 650 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.16);

    gain.gain.setValueAtTime(isCrit ? 0.65 : 0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  // Demon Death Explosion / Soul Shatter
  playDemonDeath() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.32);

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(100, t);
    subOsc.frequency.exponentialRampToValueAtTime(15, t + 0.36);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.36);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + 0.38);
    subOsc.stop(t + 0.38);
  }

  // Player Jump
  playJump() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.13);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Player Hurt
  playPlayerHurt() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.2);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.21);
  }

  // Player Respawn / Resurrect Sound
  playRespawn() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const arpeggio = [220, 330, 440, 660, 880];
    arpeggio.forEach((freq, idx) => {
      const startT = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.28, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startT);
      osc.stop(startT + 0.32);
    });
  }

  // Currency / Coin Picked Up
  playCollect() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  // UI Button Click
  playUIClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Level Clear Fanfare
  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      const t = this.ctx.currentTime + index * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  // Defeat / Game Over Sound
  playDefeat() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const chords = [220, 185, 146.83, 110, 73.42];
    chords.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.45);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.58);
    });
  }
}

export const AudioFX = new SoundEngine();
