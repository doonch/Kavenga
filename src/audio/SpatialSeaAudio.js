/**
 * Spatial Sea Audio Engine:
 * - Continuous ocean surf & Fast-Forward wind rush
 * - Stereo twin-hull cheek wave-slap cascade (left/port vs right/starboard StereoPannerNode)
 * - Spatialized homing tern/booby bird calls panned to island azimuth
 * - Subtle lashing creak / sail flutter if canoe durability is neglected
 */

import { degToRad, wrapDeg180 } from '../core/gameConstants.js';
import { IslandWaveZone } from '../simulation/hullPhysics.js';

export class SpatialSeaAudio {
  constructor(chantEngine) {
    this.chantEngine = chantEngine;
    this.seaBedGain = null;
    this.noiseBuffer = null;
    this.active = false;

    this._prevPortHigh = false;
    this._prevStbdHigh = false;
    this._birdCallCooldown = 3.0;
    this._creakCooldown = 4.5;
  }

  start() {
    const ctx = this.chantEngine.ensureContext();
    if (!ctx) return;

    if (!this.noiseBuffer) {
      const length = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0.0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2.0 - 1.0;
        last = (last + 0.035 * white) / 1.035; // Warm brownian surf noise
        data[i] = last * 3.2;
      }
      this.noiseBuffer = buf;
    }

    this.stop();

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    this.surfFilter = ctx.createBiquadFilter();
    this.surfFilter.type = 'lowpass';
    this.surfFilter.frequency.value = 340.0;

    this.seaBedGain = ctx.createGain();
    this.seaBedGain.gain.value = 0.14;

    src.connect(this.surfFilter);
    this.surfFilter.connect(this.seaBedGain);
    this.seaBedGain.connect(this.chantEngine.masterGain);

    src.start();
    this.bedSource = src;
    this.active = true;
  }

  stop() {
    this.active = false;
    if (this.bedSource) {
      try {
        this.bedSource.stop();
      } catch (_e) {
        // Ignore already stopped
      }
      this.bedSource = null;
    }
  }

  update(dtSec, oceanSim, gameState) {
    if (!this.active || !oceanSim || !this.chantEngine.ctx) return;
    const ctx = this.chantEngine.ctx;
    if (ctx.state !== 'running') return;

    const hull = oceanSim.hullState;
    const nearestRing3 = oceanSim.detections.find((d) => d.ring >= 3);
    const inCalmShadow =
      nearestRing3?.waveZone === IslandWaveZone.CALM_WAVE_SHADOW;

    // 1. Modulate continuous ocean surf & Fast-Forward wind rush
    if (this.surfFilter && this.seaBedGain) {
      const targetCutoff = oceanSim.fastForward
        ? 780.0
        : inCalmShadow
          ? 180.0
          : 340.0;
      const targetBed = inCalmShadow ? 0.06 : oceanSim.fastForward ? 0.22 : 0.13;
      this.surfFilter.frequency.setTargetAtTime(targetCutoff, ctx.currentTime, 0.2);
      this.seaBedGain.gain.setTargetAtTime(targetBed, ctx.currentTime, 0.2);
    }

    // 2. Stereo Twin-Hull Cheek Wave-Slap Cascade
    if (hull && !inCalmShadow) {
      const portHigh = hull.portSlapIntensity > 0.78;
      const stbdHigh = hull.starboardSlapIntensity > 0.78;

      if (portHigh && !this._prevPortHigh) {
        this._triggerHullSlap(-0.78, 0.09);
      }
      if (stbdHigh && !this._prevStbdHigh) {
        this._triggerHullSlap(0.78, 0.09);
      }
      this._prevPortHigh = portHigh;
      this._prevStbdHigh = stbdHigh;
    }

    // 3. Spatial Homing Bird Calls (Ring 1+ at Dawn & Dusk)
    this._birdCallCooldown -= dtSec;
    const hr = oceanSim.solarHour;
    const isBirdHour =
      (hr >= 5.0 && hr <= 9.75) || (hr >= 15.25 && hr <= 19.25);
    if (this._birdCallCooldown <= 0.0 && isBirdHour && oceanSim.detections.length > 0) {
      const det = oceanSim.detections[0];
      const relRad = degToRad(wrapDeg180(det.bearingDeg - oceanSim.headingDeg));
      const pan = Math.max(-0.95, Math.min(0.95, Math.sin(relRad)));
      const isBooby = det.island.birdSpecies === 'brown_booby';
      this._triggerBirdCall(pan, isBooby);
      this._birdCallCooldown = 4.2 + Math.random() * 3.5;
    }

    // 4. Neglected Maintenance Sennit Creak (<55% lashings)
    this._creakCooldown -= dtSec;
    if (
      this._creakCooldown <= 0.0 &&
      gameState &&
      gameState.lashingsCondition < 55.0
    ) {
      this._triggerSennitCreak();
      this._creakCooldown = 5.5 + Math.random() * 3.0;
    }
  }

  _triggerHullSlap(panValue, intensity) {
    const ctx = this.chantEngine.ctx;
    if (!ctx || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620.0 + Math.random() * 180.0;
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(intensity, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);

    const panner = ctx.createStereoPanner
      ? ctx.createStereoPanner()
      : null;

    src.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = panValue;
      gain.connect(panner);
      panner.connect(this.chantEngine.masterGain);
    } else {
      gain.connect(this.chantEngine.masterGain);
    }

    src.start(now, Math.random() * 1.2, 0.25);
  }

  _triggerBirdCall(panValue, isBooby) {
    const ctx = this.chantEngine.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = isBooby ? 'sawtooth' : 'sine';
    const startHz = isBooby ? 420.0 : 1480.0;
    const endHz = isBooby ? 310.0 : 1860.0;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + 0.14);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isBooby ? 600.0 : 1700.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.048, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0004, now + 0.22);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = panValue;
      gain.connect(panner);
      panner.connect(this.chantEngine.masterGain);
    } else {
      gain.connect(this.chantEngine.masterGain);
    }

    osc.start(now);
    osc.stop(now + 0.24);
  }

  _triggerSennitCreak() {
    const ctx = this.chantEngine.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145.0, now);
    osc.frequency.linearRampToValueAtTime(112.0, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0004, now + 0.2);
    osc.connect(gain);
    gain.connect(this.chantEngine.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Plays an atmospheric overhead wing-swoosh and nasal Ka'upu (Black-footed Albatross)
   * sky-call when the pelagic bird crosses above the canoe and banks toward shore.
   */
  playAlbatrossFlyby(targetPan = 0.0) {
    const ctx = this.chantEngine.ensureContext();
    if (!ctx || this.chantEngine.muted || ctx.state !== 'running') return;
    const now = ctx.currentTime + 0.01;
    const clampedPan = Math.max(-0.85, Math.min(0.85, targetPan || 0.0));

    // Ensure surf/wind noise buffer exists even if SpatialSeaAudio wasn't started yet
    if (!this.noiseBuffer) {
      const length = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0.0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2.0 - 1.0;
        last = (last + 0.035 * white) / 1.035;
        data[i] = last * 3.2;
      }
      this.noiseBuffer = buf;
    }

    // 1. Slow broad-wing air swoosh sweeping overhead
    const wingSrc = ctx.createBufferSource();
    wingSrc.buffer = this.noiseBuffer;

    const wingFilter = ctx.createBiquadFilter();
    wingFilter.type = 'bandpass';
    wingFilter.Q.value = 1.15;
    wingFilter.frequency.setValueAtTime(240.0, now);
    wingFilter.frequency.exponentialRampToValueAtTime(520.0, now + 0.24);
    wingFilter.frequency.exponentialRampToValueAtTime(210.0, now + 0.78);

    const wingGain = ctx.createGain();
    wingGain.gain.setValueAtTime(0.0001, now);
    wingGain.gain.linearRampToValueAtTime(0.095, now + 0.14);
    wingGain.gain.linearRampToValueAtTime(0.038, now + 0.34);
    wingGain.gain.linearRampToValueAtTime(0.075, now + 0.5);
    wingGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.84);

    const wingPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    wingSrc.connect(wingFilter);
    wingFilter.connect(wingGain);
    if (wingPan) {
      wingPan.pan.setValueAtTime(-clampedPan * 0.2, now);
      wingPan.pan.linearRampToValueAtTime(clampedPan * 0.6, now + 0.8);
      wingGain.connect(wingPan);
      wingPan.connect(this.chantEngine.masterGain);
    } else {
      wingGain.connect(this.chantEngine.masterGain);
    }
    wingSrc.start(now, Math.random() * 0.9, 0.88);

    // 2. Haunting pelagic Ka'upu nasal sky-call
    const callT = now + 0.14;
    const callFilter = ctx.createBiquadFilter();
    callFilter.type = 'bandpass';
    callFilter.frequency.value = 780.0;
    callFilter.Q.value = 1.4;

    const callGain = ctx.createGain();
    callGain.gain.setValueAtTime(0.0001, callT);
    callGain.gain.linearRampToValueAtTime(0.068, callT + 0.08);
    callGain.gain.linearRampToValueAtTime(0.052, callT + 0.26);
    callGain.gain.exponentialRampToValueAtTime(0.0004, callT + 0.54);

    const mainOsc = ctx.createOscillator();
    mainOsc.type = 'triangle';
    mainOsc.frequency.setValueAtTime(590.0, callT);
    mainOsc.frequency.linearRampToValueAtTime(625.0, callT + 0.09);
    mainOsc.frequency.exponentialRampToValueAtTime(445.0, callT + 0.52);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(295.0, callT);
    subOsc.frequency.exponentialRampToValueAtTime(222.5, callT + 0.52);

    const subGain = ctx.createGain();
    subGain.gain.value = 0.42;

    const callPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    mainOsc.connect(callFilter);
    subOsc.connect(subGain);
    subGain.connect(callFilter);
    callFilter.connect(callGain);
    if (callPan) {
      callPan.pan.setValueAtTime(clampedPan * 0.25, callT);
      callPan.pan.linearRampToValueAtTime(clampedPan * 0.78, callT + 0.52);
      callGain.connect(callPan);
      callPan.connect(this.chantEngine.masterGain);
    } else {
      callGain.connect(this.chantEngine.masterGain);
    }

    mainOsc.start(callT);
    subOsc.start(callT);
    mainOsc.stop(callT + 0.56);
    subOsc.stop(callT + 0.56);
  }
}
