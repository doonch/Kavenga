/**
 * Zero-Compass Open-Ocean Sailing HUD for Kavenga: Songs of the Star Path.
 * INVIOLABLE UX RULE:
 *   Never displays a compass rose, cardinal letters (N/S/E/W), degree numbers, minimap,
 *   or dynamic player-heading needle across ANY difficulty mode.
 */

import {
  Difficulty,
  allowsRecallAtSea,
  showsEasyCueInstructions,
  showsSongLyrics,
} from '../core/gameConstants.js';
import { SAND_LESSONS } from '../data/sandDiagramsData.js';
import { VoyageStatus } from '../simulation/oceanSim.js';
import { SandCanvas } from './SandCanvas.js';

export class SailingHUD {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.recallOpen = false;
    this.pauseOpen = false;
    this._lastSongId = null;
    this._lastVerseIdx = -1;
    this._lastDifficulty = null;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="hud-top-bar">
        <div class="hud-voyage-badge">
          <span class="hud-song-title" id="hudSongTitle"></span>
          <span class="hud-difficulty-pill" id="hudDifficultyPill"></span>
        </div>

        <div class="hud-corner-controls">
          <button class="hud-icon-btn" id="btnCameraView" title="Toggle between behind-canoe view and 1st-person deck view (V)">
            <span class="btn-glyph hud-eye-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/>
                <circle cx="12" cy="12" r="3.2"/>
              </svg>
            </span>
            <span class="btn-text" id="btnCameraViewLabel">Canoe View</span>
          </button>
          <button class="hud-icon-btn" id="btnFreeLook" title="Drag sky to look around (or click to glance astern / recenter)">
            <span class="btn-glyph">↩</span>
            <span class="btn-text" id="btnFreeLookLabel">Look Astern</span>
          </button>
          <button class="hud-icon-btn" id="btnLookZenith" title="Tilt gaze straight up to the mast-top zenith">
            <span class="btn-glyph">✦</span>
            <span class="btn-text">Mast-Top</span>
          </button>
          <button class="hud-icon-btn" id="btnFastForward" title="Toggle 2.75x Fast Forward (F)">
            <span class="btn-glyph">»»</span>
            <span class="btn-text">Fast Wind</span>
          </button>
          <button class="hud-icon-btn" id="btnRecall" title="Recall static stick-in-sand lesson (R)">
            <span class="btn-glyph">🐚</span>
            <span class="btn-text">Recall</span>
          </button>
          <button class="hud-icon-btn" id="btnPauseMenu" title="Voyage & Mode Options">
            <span class="btn-glyph">☰</span>
            <span class="btn-text">Options</span>
          </button>
        </div>
      </div>

      <!-- Mode-gated Chant Lyrics & Easy Cue Hint (hidden in Hard & Master Navigator) -->
      <div class="hud-chant-banner" id="hudChantBanner">
        <div class="chant-verse-tag" id="hudVerseTag"></div>
        <div class="chant-lyrics" id="hudLyricsText"></div>
        <div class="chant-easy-hint" id="hudEasyHint"></div>
      </div>

      <!-- Subtle bottom Trim-Lock touch/click helpers (purely port/starboard paddle trim, zero degrees!) -->
      <div class="hud-trim-bar">
        <button class="trim-btn" id="btnTrimPort" title="Hold A or Left Arrow to trim steering sweep port">⟵ Trim Left Prow</button>
        <div class="trim-status" id="hudTrimStatus">Steering Sweep Locked</div>
        <button class="trim-btn" id="btnTrimStarboard" title="Hold D or Right Arrow to trim steering sweep starboard">Trim Right Prow ⟶</button>
      </div>

      <!-- Toast banner for diegetic events (bonito catch, low gourds, island cloud sighted) -->
      <div class="hud-toast" id="hudToast"></div>

      <!-- STRICTLY STATIC Sand Recall Memory Vignette -->
      <div class="modal-backdrop hidden" id="recallModal">
        <div class="sand-recall-card">
          <div class="recall-header">
            <div>
              <div class="recall-eyebrow">Memory of the Teaching Sand (Static Vignette)</div>
              <h3 id="recallTitle"></h3>
            </div>
            <button class="secondary-btn" id="btnCloseRecall">Close Memory</button>
          </div>
          <canvas id="recallSandCanvas" width="540" height="390"></canvas>
          <p class="recall-narration" id="recallNarration"></p>
        </div>
      </div>

      <!-- Options / Difficulty / Restore Before Voyage Modal -->
      <div class="modal-backdrop hidden" id="pauseModal">
        <div class="dialog-card">
          <h3>Wayfinder Options</h3>
          <p class="dialog-sub">Switch guidance mode at any time or return to shore before departure.</p>
          <div class="mode-selector-grid" id="hudModeGrid">
            <button class="mode-option-btn" data-mode="easy">
              <strong>Easy (Apprentice)</strong>
              <span>Chant audio, lyrics, cue hints &amp; active star shimmer</span>
            </button>
            <button class="mode-option-btn" data-mode="medium">
              <strong>Medium (Wayfinder)</strong>
              <span>Chant audio, poetic lyrics &amp; constellation sky</span>
            </button>
            <button class="mode-option-btn" data-mode="hard">
              <strong>Hard (Navigator)</strong>
              <span>Chant audio &amp; constellation sky — zero on-screen text</span>
            </button>
            <button class="mode-option-btn" data-mode="master_navigator" id="btnHudMasterMode">
              <strong>Master Navigator</strong>
              <span>Pure sea silence, raw starfield &amp; no Recall at sea</span>
            </button>
          </div>
          <div class="dialog-actions">
            <button class="secondary-btn" id="btnToggleAudio">Toggle Sound</button>
            <button class="secondary-btn" id="btnReturnToShoreSnap">Return to Shore (Before Voyage)</button>
            <button class="primary-btn" id="btnResumeSailing">Resume Voyage</button>
          </div>
        </div>
      </div>

      <!-- Lost at Sea Gentle Mist Curtain + Cue-Relative Reflection -->
      <div class="mist-overlay hidden" id="lostMistOverlay">
        <div class="mist-card">
          <div class="mist-eyebrow">The Sea-Mist Closes In</div>
          <h2>Drifted Beyond the Star Path</h2>
          <p class="mist-reflection" id="lostReflectionText"></p>
          <button class="primary-btn" id="btnRestoreFromMist">Return to Shore (Before Departure)</button>
        </div>
      </div>

      <!-- Joyful Landfall / Rapa Nui Finale Overlay -->
      <div class="landfall-overlay hidden" id="landfallOverlay">
        <div class="landfall-card">
          <div class="mist-eyebrow" id="landfallEyebrow">Landfall!</div>
          <h2 id="landfallTitle"></h2>
          <p id="landfallBody"></p>
          <button class="primary-btn" id="btnGoAshore">Beach the Vaka Ashore</button>
        </div>
      </div>
    `;

    this.sandCanvas = new SandCanvas(
      this.rootEl.querySelector('#recallSandCanvas')
    );

    // Wire buttons
    this.rootEl.querySelector('#btnCameraView').addEventListener('click', () => {
      this.callbacks.onToggleCameraView?.();
    });
    this.rootEl.querySelector('#btnFreeLook').addEventListener('click', () => {
      this.callbacks.onToggleFreeLook?.();
    });
    this.rootEl.querySelector('#btnLookZenith').addEventListener('click', () => {
      this.callbacks.onLookZenith?.();
    });
    this.rootEl.querySelector('#btnFastForward').addEventListener('click', () => {
      this.callbacks.onToggleFastForward?.();
    });
    this.rootEl.querySelector('#btnRecall').addEventListener('click', () => {
      this.toggleRecallModal();
    });
    this.rootEl.querySelector('#btnCloseRecall').addEventListener('click', () => {
      this.setRecallModal(false);
    });
    this.rootEl.querySelector('#btnPauseMenu').addEventListener('click', () => {
      this.setPauseModal(true);
    });
    this.rootEl.querySelector('#btnResumeSailing').addEventListener('click', () => {
      this.setPauseModal(false);
    });
    this.rootEl.querySelector('#btnToggleAudio').addEventListener('click', () => {
      const muted = this.callbacks.onToggleMute?.();
      this.showToast(muted ? 'Ocean & Chant Audio Muted' : 'Ocean & Chant Audio Restored');
    });
    this.rootEl
      .querySelector('#btnReturnToShoreSnap')
      .addEventListener('click', () => {
        this.setPauseModal(false);
        this.callbacks.onRestorePreVoyage?.();
      });
    this.rootEl
      .querySelector('#btnRestoreFromMist')
      .addEventListener('click', () => {
        this.callbacks.onRestorePreVoyage?.();
      });
    this.rootEl.querySelector('#btnGoAshore').addEventListener('click', () => {
      this.callbacks.onConfirmLandfall?.();
    });

    // Touch / click steering paddle buttons
    const bindHoldSteer = (sel, code) => {
      const btn = this.rootEl.querySelector(sel);
      const start = (e) => {
        e.preventDefault();
        this.callbacks.onVirtualKey?.(code, true);
      };
      const end = () => {
        this.callbacks.onVirtualKey?.(code, false);
      };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointerleave', end);
      btn.addEventListener('pointercancel', end);
    };
    bindHoldSteer('#btnTrimPort', 'ArrowLeft');
    bindHoldSteer('#btnTrimStarboard', 'ArrowRight');

    // Difficulty buttons
    this.rootEl.querySelectorAll('.mode-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.callbacks.onChangeDifficulty?.(mode);
      });
    });

    // Keyboard shortcuts (F = Fast Forward, R = Recall, Escape = close modal)
    window.addEventListener('keydown', (e) => {
      if (this.rootEl.classList.contains('hidden')) return;
      if (e.code === 'KeyF') {
        this.callbacks.onToggleFastForward?.();
      } else if (e.code === 'KeyR') {
        this.toggleRecallModal();
      } else if (e.code === 'Escape') {
        this.setRecallModal(false);
        this.setPauseModal(false);
      }
    });
  }

  show() {
    this.rootEl.classList.remove('hidden');
    this.setRecallModal(false);
    this.setPauseModal(false);
    this.rootEl.querySelector('#lostMistOverlay').classList.add('hidden');
    this.rootEl.querySelector('#landfallOverlay').classList.add('hidden');
  }

  hide() {
    this.rootEl.classList.add('hidden');
    this.setRecallModal(false);
    this.setPauseModal(false);
  }

  toggleRecallModal() {
    this.setRecallModal(!this.recallOpen);
  }

  setRecallModal(open) {
    const state = this.callbacks.getGameState?.();
    const sim = this.callbacks.getOceanSim?.();
    if (open && state && !allowsRecallAtSea(state.difficulty)) {
      this.showToast('Sand Recall is disabled at sea in Master Navigator mode.');
      return;
    }
    this.recallOpen = Boolean(open);
    const modal = this.rootEl.querySelector('#recallModal');
    modal.classList.toggle('hidden', !this.recallOpen);

    if (this.recallOpen && sim?.song) {
      const lesson =
        SAND_LESSONS[sim.song.sandRecallId] ||
        SAND_LESSONS.sand_maupiti_12_shell_compass;
      this.rootEl.querySelector('#recallTitle').textContent = lesson.title;
      this.rootEl.querySelector('#recallNarration').textContent = lesson.narration;
      // STRICTLY STATIC (animate: false) per GDD Inviolable Zero-Compass Rule!
      this.sandCanvas.renderLesson(lesson, { animate: false });
    }
  }

  setPauseModal(open) {
    this.pauseOpen = Boolean(open);
    this.rootEl
      .querySelector('#pauseModal')
      .classList.toggle('hidden', !this.pauseOpen);
  }

  showToast(text) {
    const el = this.rootEl.querySelector('#hudToast');
    el.textContent = text;
    el.classList.add('visible');
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => {
      el.classList.remove('visible');
    }, 3600);
  }

  update(
    oceanSim,
    gameState,
    cameraCtrl,
    landfallReady = true,
    launchActive = false
  ) {
    if (!oceanSim || !gameState) return;

    const diff = gameState.difficulty;
    const song = oceanSim.song;
    const verse = oceanSim.getCurrentVerse();

    // Update header badge
    if (song) {
      this.rootEl.querySelector('#hudSongTitle').textContent =
        `Song ${song.number}: ${song.title}`;
    }

    const diffNames = {
      [Difficulty.EASY]: 'Easy · Apprentice',
      [Difficulty.MEDIUM]: 'Medium · Wayfinder',
      [Difficulty.HARD]: 'Hard · Navigator',
      [Difficulty.MASTER_NAVIGATOR]: 'Master Navigator',
    };
    this.rootEl.querySelector('#hudDifficultyPill').textContent =
      diffNames[diff] || diff;

    // Mode-gated Recall button
    const recallBtn = this.rootEl.querySelector('#btnRecall');
    recallBtn.style.display = allowsRecallAtSea(diff) ? 'inline-flex' : 'none';

    // Camera perspective (Eye button), Fast Forward & Free-Look button states
    const isThirdPerson = Boolean(cameraCtrl?.isThirdPersonView?.());
    this.rootEl
      .querySelector('#btnCameraView')
      .classList.toggle('active', isThirdPerson);
    this.rootEl.querySelector('#btnCameraViewLabel').textContent = isThirdPerson
      ? 'Deck View'
      : 'Canoe View';

    this.rootEl
      .querySelector('#btnFastForward')
      .classList.toggle('active', Boolean(oceanSim.fastForward));

    const gazeOffset = cameraCtrl?.isGazeOffset();
    this.rootEl.querySelector('#btnFreeLook').classList.toggle('active', Boolean(gazeOffset));
    this.rootEl.querySelector('#btnFreeLookLabel').textContent = gazeOffset
      ? 'Center Gaze'
      : 'Look Astern';

    // Trim-Lock status readout (strictly cue/paddle phrasing — zero degrees!)
    const steerNorm = cameraCtrl ? cameraCtrl.getSteeringNormalized() : 0.0;
    const trimEl = this.rootEl.querySelector('#hudTrimStatus');
    if (Math.abs(steerNorm) > 0.06) {
      trimEl.textContent =
        steerNorm < 0
          ? 'Turning Twin Prows Left...'
          : 'Turning Twin Prows Right...';
    } else {
      trimEl.textContent = oceanSim.fastForward
        ? 'Sweep Locked · Fast Wind Active'
        : 'Steering Sweep Locked Steady';
    }

    // Mode-gated Chant Lyrics & Easy Cue Instructions
    const banner = this.rootEl.querySelector('#hudChantBanner');
    const showLyrics = showsSongLyrics(diff);
    banner.classList.toggle('hidden', !showLyrics || !verse);

    if (
      showLyrics &&
      verse &&
      (this._lastSongId !== song?.id ||
        this._lastVerseIdx !== oceanSim.verseIndex ||
        this._lastDifficulty !== diff)
    ) {
      this._lastSongId = song?.id;
      this._lastVerseIdx = oceanSim.verseIndex;
      this._lastDifficulty = diff;

      this.rootEl.querySelector('#hudVerseTag').textContent =
        `Verse ${verse.verseNumber} of ${song.verses.length}`;
      this.rootEl.querySelector('#hudLyricsText').textContent = verse.lyrics;

      const hintEl = this.rootEl.querySelector('#hudEasyHint');
      if (showsEasyCueInstructions(diff) && verse.easyCueText) {
        hintEl.style.display = 'block';
        hintEl.textContent = verse.easyCueText;
      } else {
        hintEl.style.display = 'none';
      }
    }

    // Sync Pause Modal active mode highlight
    this.rootEl.querySelectorAll('.mode-option-btn').forEach((btn) => {
      const m = btn.getAttribute('data-mode');
      btn.classList.toggle('selected', m === diff);
    });

    // Lost at Sea Mist Curtain
    const lostOverlay = this.rootEl.querySelector('#lostMistOverlay');
    if (oceanSim.status === VoyageStatus.LOST_AT_SEA) {
      lostOverlay.classList.remove('hidden');
      this.rootEl.querySelector('#lostReflectionText').textContent =
        oceanSim.reflectionText;
    } else {
      lostOverlay.classList.add('hidden');
    }

    // Hide sailing chrome cleanly during bird's-eye launch departure & landfall arrival cinematics
    const isArrived =
      oceanSim.status === VoyageStatus.ARRIVED && Boolean(oceanSim.arrivedIsland);
    this.rootEl.classList.toggle(
      'landfall-cinematic-active',
      isArrived || Boolean(launchActive)
    );

    // Landfall Celebration Overlay (revealed after the ~2s landfall animation stops at shore)
    const landOverlay = this.rootEl.querySelector('#landfallOverlay');
    if (isArrived && landfallReady) {
      landOverlay.classList.remove('hidden');
      const isl = oceanSim.arrivedIsland;
      const isGrandFinale = isl.id === 'hawaii';
      const isIntended = isl.id === song?.toIsland;

      this.rootEl.querySelector('#landfallEyebrow').textContent = isGrandFinale
        ? 'Grand Voyage Complete · Tupaia-Nui!'
        : isIntended
          ? 'True Landfall!'
          : 'Uncharted Shore Sighted!';
      this.rootEl.querySelector('#landfallTitle').textContent =
        `${isl.name} — ${isl.subtitle}`;
      this.rootEl.querySelector('#landfallBody').textContent = isGrandFinale
        ? "Through morning sun-shadow, blind sea-mist swells, three night star-houses, and cliff-bounced surf, your twin prows have reached ancestral Hawai'i without map or needle!"
        : isIntended
          ? `Your twin hulls glide cleanly through the reef pass of ${isl.name} with ${oceanSim.rationsRemaining.toFixed(1)} ration baskets remaining.`
          : `Following the sea's living signs brought your canoe safely onto ${isl.name}'s shore.`;
    } else {
      landOverlay.classList.add('hidden');
    }
  }
}
