/**
 * Sample-accurate Web Audio Chant, Vivo Nose-Flute & 4-Beat Pahu Gourd Drum Engine.
 * - Locks Beat 1 of every 4-beat cycle directly to the song's BPM so players can feel/count
 *   1-2-3-4 against hull cheek lift in fog (Songs 14, 14R, 15, 16).
 * - Synthesizes warm harmonic Polynesian chant phrases + airy vivo nose-flute counter-melody,
 *   and supports optional recorded stem playback if audio files are registered.
 * - Automatically silences chant/drum in Master Navigator mode and crossfades smoothly during Fast Forward.
 */

import { playsSongAtSea } from '../core/gameConstants.js';

// Pentatonic Polynesian modal frequencies (Hz)
const CHANT_SCALE_HZ = [130.81, 146.83, 164.81, 196.0, 220.0, 261.63];
const VIVO_SCALE_HZ = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25];

export class ChantAndDrumEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicBus = null;
    this.muted = false;
    this.volume = 0.78;

    this.isPlaying = false;
    this.currentSong = null;
    this.verseIndex = 0;
    this.fastForward = false;
    this.difficulty = 'medium';

    this.nextBeatTime = 0.0;
    this.beatCounter = 0;
    this._schedulerTimer = null;

    // Optional external stem buffers keyed by songId
    this.stemBuffers = {};
    this.activeStemSource = null;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0.0 : this.volume;
        this.masterGain.connect(this.ctx.destination);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 1.0;
        this.musicBus.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0.0 : this.volume,
        this.ctx.currentTime,
        0.06
      );
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startVoyageSong(song, difficulty) {
    this.stop();
    this.currentSong = song;
    this.difficulty = difficulty;
    this.verseIndex = 0;
    this.fastForward = false;

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isPlaying = true;
    this.beatCounter = 0;
    this.nextBeatTime = ctx.currentTime + 0.08;

    this._updateBusGain();

    if (this.stemBuffers[song.id] && playsSongAtSea(difficulty)) {
      const src = ctx.createBufferSource();
      src.buffer = this.stemBuffers[song.id];
      src.loop = true;
      src.connect(this.musicBus);
      src.start();
      this.activeStemSource = src;
    }

    this._schedulerTimer = window.setInterval(() => this._scheduleTick(), 40);
  }

  stop() {
    this.isPlaying = false;
    if (this._schedulerTimer) {
      window.clearInterval(this._schedulerTimer);
      this._schedulerTimer = null;
    }
    if (this.activeStemSource) {
      try {
        this.activeStemSource.stop();
      } catch (_e) {
        // Ignore already stopped source
      }
      this.activeStemSource = null;
    }
  }

  syncState({ difficulty, fastForward, verseIndex }) {
    const prevPlay = playsSongAtSea(this.difficulty);
    this.difficulty = difficulty;
    this.fastForward = Boolean(fastForward);
    this.verseIndex = verseIndex ?? 0;

    if (prevPlay !== playsSongAtSea(difficulty) || this.musicBus) {
      this._updateBusGain();
    }
  }

  _updateBusGain() {
    if (!this.musicBus || !this.ctx) return;
    let target = 0.85;
    if (!playsSongAtSea(this.difficulty)) {
      target = 0.0; // Strict sea silence in Master Navigator mode!
    } else if (this.fastForward) {
      target = 0.16; // Gentle wind crossfade during 2.75x Fast Forward
    }
    this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  _scheduleTick() {
    if (!this.isPlaying || !this.ctx || !this.currentSong) return;
    if (this.ctx.state !== 'running') return;

    const bpm = this.currentSong.bpm || 60.0;
    const secPerBeat = 60.0 / bpm;
    const lookahead = 0.14;

    while (this.nextBeatTime < this.ctx.currentTime + lookahead) {
      if (playsSongAtSea(this.difficulty) && !this.activeStemSource) {
        const beatInBar = this.beatCounter % 4;
        this._triggerPahuDrum(this.nextBeatTime, beatInBar === 0);

        // Harmonic chant phrase on Beat 1 & Beat 3
        if (beatInBar === 0 || beatInBar === 2) {
          this._triggerChantVoice(
            this.nextBeatTime,
            this.beatCounter,
            secPerBeat * 1.85
          );
        }

        // Vivo nose-flute breath ornament every 2nd bar on Beat 4
        if (this.beatCounter % 8 === 3 || this.beatCounter % 8 === 7) {
          this._triggerVivoFlute(
            this.nextBeatTime + secPerBeat * 0.12,
            this.beatCounter,
            secPerBeat * 0.95
          );
        }
      }

      this.nextBeatTime += secPerBeat;
      this.beatCounter += 1;
    }
  }

  _triggerPahuDrum(when, isDownbeat) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startHz = isDownbeat ? 66.0 : 54.0;
    const endHz = isDownbeat ? 41.0 : 38.0;
    osc.frequency.setValueAtTime(startHz, when);
    osc.frequency.exponentialRampToValueAtTime(endHz, when + 0.22);

    const peak = isDownbeat ? 0.55 : 0.22;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, when + (isDownbeat ? 0.44 : 0.26));

    osc.connect(gain);
    gain.connect(this.musicBus);

    osc.start(when);
    osc.stop(when + 0.48);
  }

  _triggerChantVoice(when, stepIdx, duration) {
    const ctx = this.ctx;
    const songSeed = (this.currentSong?.id?.charCodeAt(6) || 1) + this.verseIndex * 2;
    const noteIdx = (stepIdx / 2 + songSeed) % CHANT_SCALE_HZ.length;
    const rootHz = CHANT_SCALE_HZ[Math.floor(noteIdx)];

    // Warm dual-oscillator formant-filtered Polynesian choral harmony (root + perfect fifth)
    const intervals = [1.0, 1.498];
    intervals.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(rootHz * ratio, when);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(idx === 0 ? 540.0 : 780.0, when);
      filter.Q.value = 3.2;

      const gain = ctx.createGain();
      const peak = idx === 0 ? 0.085 : 0.055;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(peak, when + 0.16);
      gain.gain.setValueAtTime(peak * 0.82, when + duration * 0.65);
      gain.gain.exponentialRampToValueAtTime(0.0005, when + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);

      osc.start(when);
      osc.stop(when + duration + 0.04);
    });
  }

  _triggerVivoFlute(when, stepIdx, duration) {
    const ctx = this.ctx;
    const freq =
      VIVO_SCALE_HZ[(stepIdx + this.verseIndex) % VIVO_SCALE_HZ.length];

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.985, when);
    osc.frequency.linearRampToValueAtTime(freq, when + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.052, when + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0005, when + duration);

    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  /**
   * Plaintive descending Vivo nose-flute warning when voyage rations drop below 15%.
   */
  playLowRationsWarning() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime + 0.02;
    [523.25, 440.0, 349.23].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, now + i * 0.24);
      gain.gain.setValueAtTime(0.0001, now + i * 0.24);
      gain.gain.linearRampToValueAtTime(0.09, now + i * 0.24 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0006, now + i * 0.24 + 0.32);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.24);
      osc.stop(now + i * 0.24 + 0.35);
    });
  }

  /**
   * Joyful conch-shell (pu) call on Ring 4 Landfall!
   */
  playLandfallConch() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime + 0.02;
    [196.0, 293.66].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hz * 0.96, now + i * 0.38);
      osc.frequency.linearRampToValueAtTime(hz, now + i * 0.38 + 0.14);
      filter.type = 'lowpass';
      filter.frequency.value = 680.0;

      gain.gain.setValueAtTime(0.0001, now + i * 0.38);
      gain.gain.linearRampToValueAtTime(0.14, now + i * 0.38 + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0006, now + i * 0.38 + 1.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.38);
      osc.stop(now + i * 0.38 + 1.3);
    });
  }

  /**
   * Gentle rising pentatonic vivo nose-flute chime when sighting a star in the Star-Stone Vigil.
   */
  playStarSightedChime() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime + 0.01;
    [440.0, 587.33].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, now + i * 0.14);
      gain.gain.setValueAtTime(0.0001, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.075, now + i * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.14 + 0.38);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.42);
    });
  }
}
