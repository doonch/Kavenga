/**
 * Elder Voice-Over Playback Engine for Kavenga: Songs of the Star Path.
 *
 * Plays pre-recorded elder voice MP3s from `./assets/audio/voices/<voiceId>.mp3`
 * for plot-critical Sanctuary encounters, Guided Sky Vigil lessons, and
 * Pre-Departure Elder Vigil prompts.
 *
 * Gracefully handles missing audio files without throwing or leaving
 * background music ducked.
 */

const VOICE_PREF_STORAGE_KEY = 'kavenga_voice_enabled_v1';

export class VoiceOverEngine {
  constructor({ volume = 0.92, onSpeakingChange = null } = {}) {
    this.volume = volume;
    this.onSpeakingChange = onSpeakingChange;
    this.enabled = this._loadEnabledPref();
    this.muted = false;
    this.currentVoiceId = null;
    this.speaking = false;
    this._audio = null;

    if (typeof Audio !== 'undefined') {
      this._audio = new Audio();
      this._audio.preload = 'none';
      this._audio.volume = this.volume;
      this._audio.addEventListener('ended', () => {
        this._setSpeaking(false);
      });
      this._audio.addEventListener('error', () => {
        this._setSpeaking(false);
      });
    }
  }

  _loadEnabledPref() {
    try {
      if (typeof localStorage === 'undefined') return true;
      const raw = localStorage.getItem(VOICE_PREF_STORAGE_KEY);
      if (raw === null) return true;
      return raw !== 'false';
    } catch {
      return true;
    }
  }

  _saveEnabledPref() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(VOICE_PREF_STORAGE_KEY, String(this.enabled));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  _setSpeaking(next) {
    const val = Boolean(next);
    if (this.speaking === val) return;
    this.speaking = val;
    if (!val) {
      this.currentVoiceId = null;
    }
    this.onSpeakingChange?.(val);
  }

  _voiceUrl(voiceId) {
    return `./assets/audio/voices/${voiceId}.mp3`;
  }

  play(voiceId, { restart = false } = {}) {
    if (!voiceId || !this.enabled || this.muted) {
      this.stop();
      return;
    }
    if (!restart && this.speaking && this.currentVoiceId === voiceId) {
      return;
    }

    this.stop();
    this.currentVoiceId = voiceId;
    if (!this._audio) return;

    this._audio.src = this._voiceUrl(voiceId);
    this._audio.currentTime = 0;
    this._audio.volume = this.volume;
    this._setSpeaking(true);

    const p = this._audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        this._setSpeaking(false);
      });
    }
  }

  stop() {
    if (this._audio) {
      try {
        this._audio.pause();
        this._audio.currentTime = 0;
      } catch {
        // Ignore pause/seek errors when no source is loaded
      }
    }
    this._setSpeaking(false);
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (this.enabled === next) return;
    this.enabled = next;
    this._saveEnabledPref();
    if (!this.enabled) {
      this.stop();
    }
  }

  setMuted(muted) {
    const next = Boolean(muted);
    if (this.muted === next) return;
    this.muted = next;
    if (this.muted) {
      this.stop();
    }
  }
}
