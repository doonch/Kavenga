/**
 * Background Music Rotation Engine for Kavenga: Songs of the Star Path.
 *
 * Rotates through core voyage/island tracks (`dawn`, `thunder`, `lineage`, `tide`, `lagoon`)
 * and supports extensible island-specific tracks (`ISLAND_MUSIC_TRACKS`).
 * When an island with a dedicated track (e.g. Hawai'i) is reached for the first time,
 * that track plays immediately and is permanently unlocked in the global rotation
 * for the remainder of the campaign.
 */

const MUSIC_PREF_STORAGE_KEY = 'kavenga_music_enabled_v1';

export const BASE_MUSIC_TRACKS = Object.freeze([
  'dawn',
  'thunder',
  'lineage',
  'tide',
  'lagoon',
]);

/**
 * Extensible map of islandId -> track filename (without .mp3) in ./assets/audio/.
 * Add future island-specific tracks here.
 */
export const ISLAND_MUSIC_TRACKS = Object.freeze({
  maupiti: 'kaukauwa_ni_koro',
  hawaii: 'hawaii',
});

export function buildMusicPlaylist(discoveredIslands = {}) {
  const tracks = [...BASE_MUSIC_TRACKS];
  for (const [islandId, trackId] of Object.entries(ISLAND_MUSIC_TRACKS)) {
    if (discoveredIslands?.[islandId] && !tracks.includes(trackId)) {
      tracks.push(trackId);
    }
  }
  return tracks;
}

export class BackgroundMusicEngine {
  constructor({ discoveredIslands = {}, volume = 0.36 } = {}) {
    this.discoveredIslands = { ...discoveredIslands };
    this.targetVolume = volume;
    this.duckedVolume = Math.min(0.1, volume * 0.28);
    this.ducked = false;
    this.enabled = this._loadEnabledPref();
    this.muted = false;
    this.currentTrack = null;
    this._queue = [];
    this._audio = null;
    this._fadeTimer = null;
    this._unlockBound = false;
    this._started = false;
    this._lastLandfallTriggeredIsland = null;

    if (typeof Audio !== 'undefined') {
      this._audio = new Audio();
      this._audio.preload = 'auto';
      this._audio.loop = false;
      this._audio.volume = this.targetVolume;
      this._audio.addEventListener('ended', () => {
        if (this.enabled) {
          this.playNext();
        }
      });
      this._audio.addEventListener('error', () => {
        // Skip broken/missing track gracefully on next tick if needed
        if (this.enabled && this._started) {
          setTimeout(() => {
            if (this.enabled) this.playNext();
          }, 1200);
        }
      });
    }
  }

  _loadEnabledPref() {
    try {
      if (typeof localStorage === 'undefined') return true;
      const raw = localStorage.getItem(MUSIC_PREF_STORAGE_KEY);
      if (raw === null) return true;
      return raw !== 'false';
    } catch {
      return true;
    }
  }

  _saveEnabledPref() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(MUSIC_PREF_STORAGE_KEY, String(this.enabled));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  _trackUrl(trackId) {
    return `./assets/audio/${trackId}.mp3`;
  }

  _refillQueue() {
    const pool = buildMusicPlaylist(this.discoveredIslands);
    // Fisher-Yates shuffle so rotation feels organic without immediate repeats
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (pool.length > 1 && pool[0] === this.currentTrack) {
      const swapIdx = 1 + Math.floor(Math.random() * (pool.length - 1));
      [pool[0], pool[swapIdx]] = [pool[swapIdx], pool[0]];
    }
    this._queue = pool;
  }

  _bindGestureUnlock() {
    if (this._unlockBound || typeof window === 'undefined') return;
    this._unlockBound = true;
    const onGesture = () => {
      this._unlockBound = false;
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      if (this.enabled && this._audio && this._audio.paused) {
        this._attemptPlay();
      }
    };
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
  }

  _clearFade() {
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
  }

  _fadeTo(targetVol, durationMs = 600, onDone = null) {
    if (!this._audio) {
      onDone?.();
      return;
    }
    this._clearFade();
    const startVol = this._audio.volume;
    const steps = Math.max(1, Math.round(durationMs / 40));
    let step = 0;
    this._fadeTimer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      if (this._audio) {
        this._audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * t));
      }
      if (t >= 1) {
        this._clearFade();
        onDone?.();
      }
    }, 40);
  }

  _attemptPlay() {
    if (!this._audio || !this.enabled) return;
    const p = this._audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        this._bindGestureUnlock();
      });
    }
  }

  _activeTargetVolume() {
    return this.ducked ? this.duckedVolume : this.targetVolume;
  }

  _playTrack(trackId, { fadeMs = 450 } = {}) {
    this.currentTrack = trackId;
    if (!this._audio) return;

    const startNew = () => {
      if (!this._audio) return;
      this._audio.src = this._trackUrl(trackId);
      this._audio.currentTime = 0;
      if (this.enabled) {
        this._audio.volume = 0;
        this._attemptPlay();
        this._fadeTo(this._activeTargetVolume(), fadeMs);
      }
    };

    if (!this._audio.paused && this._audio.src) {
      this._fadeTo(0, Math.min(350, fadeMs), startNew);
    } else {
      startNew();
    }
  }

  start() {
    this._started = true;
    if (!this.enabled) return;
    if (!this.currentTrack) {
      this.playNext();
    } else if (this._audio && this._audio.paused) {
      this._attemptPlay();
    }
  }

  playNext() {
    if (this._queue.length === 0) {
      this._refillQueue();
    }
    const nextTrack = this._queue.shift();
    if (nextTrack) {
      this._playTrack(nextTrack, { fadeMs: 500 });
    }
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (this.enabled === next) return;
    this.enabled = next;
    this._saveEnabledPref();

    if (!this._audio) return;
    if (this.enabled) {
      if (!this.currentTrack) {
        this.playNext();
      } else {
        this._audio.volume = 0;
        this._attemptPlay();
        this._fadeTo(this._activeTargetVolume(), 450);
      }
    } else {
      this._fadeTo(0, 280, () => {
        if (!this.enabled && this._audio) {
          this._audio.pause();
        }
      });
    }
  }

  setDucked(isDucked) {
    const next = Boolean(isDucked);
    if (this.ducked === next) return;
    this.ducked = next;
    if (this._audio && this.enabled && !this._audio.paused) {
      this._fadeTo(this._activeTargetVolume(), 240);
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this._audio) {
      this._audio.muted = this.muted;
    }
  }

  syncDiscoveredIslands(discoveredIslands = {}) {
    this.discoveredIslands = { ...discoveredIslands };
  }

  onIslandLandfall(islandId, { wasNewlyDiscovered = false, discoveredIslands = null } = {}) {
    if (discoveredIslands) {
      this.discoveredIslands = { ...discoveredIslands };
    } else if (islandId) {
      this.discoveredIslands[islandId] = true;
    }

    const dedicatedTrack = ISLAND_MUSIC_TRACKS[islandId];
    if (
      wasNewlyDiscovered &&
      dedicatedTrack &&
      this._lastLandfallTriggeredIsland !== islandId
    ) {
      this._lastLandfallTriggeredIsland = islandId;
      // Refresh future queue so the unlocked track enters rotation
      this._queue = [];
      if (this.currentTrack !== dedicatedTrack) {
        this._playTrack(dedicatedTrack, { fadeMs: 700 });
      }
    }
  }
}
