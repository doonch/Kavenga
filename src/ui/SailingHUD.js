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
import { DIFFICULTY_META } from './IslandSettingsUI.js';
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
    const diffCardsHtml = Object.entries(DIFFICULTY_META)
      .map(
        ([key, meta]) => `
        <button class="settings-diff-card" data-mode="${key}" type="button">
          <div class="settings-diff-art">
            <img src="${meta.portrait}" alt="${meta.short}" />
          </div>
          <strong>${meta.short}</strong>
        </button>`
      )
      .join('');

    this.rootEl.innerHTML = `
      <div class="hud-top-bar">
        <div class="hud-voyage-badge">
          <span class="hud-song-title" id="hudSongTitle"></span>
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
          <button class="hud-icon-btn" id="btnFreeLook" title="Look Astern / recenter (X)">
            <span class="btn-glyph">↩</span>
            <span class="btn-text" id="btnFreeLookLabel">Look Astern</span>
          </button>
          <button class="hud-icon-btn" id="btnLookZenith" title="Tilt gaze straight up to the mast-top zenith (Z)">
            <span class="btn-glyph">✦</span>
            <span class="btn-text">Mast-Top</span>
          </button>
          <button class="hud-icon-btn" id="btnRecall" title="Recall static stick-in-sand lesson (R)">
            <span class="btn-glyph">🐚</span>
            <span class="btn-text">Recall</span>
          </button>
          <button
            class="hud-icon-btn"
            id="btnHudSoundToggle"
            type="button"
            title="Sound On — Click to Mute"
            aria-label="Toggle Sound"
          >
            <span class="btn-glyph" id="hudSoundGlyph" aria-hidden="true">🔊</span>
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
        <button
          class="trim-btn"
          id="btnTrimPort"
          type="button"
          title="Hold A or Left Arrow to trim steering sweep port"
          aria-label="Trim Left Prow"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5"/>
            <path d="M11 18l-6-6 6-6"/>
          </svg>
        </button>
        <button
          class="trim-btn wind-boost-btn"
          id="btnFastForward"
          type="button"
          title="Toggle 2.75x Wind Surge (F)"
          aria-label="Fast Wind"
          aria-pressed="false"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <g transform="rotate(-90 12 12)">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
            </g>
          </svg>
        </button>
        <button
          class="trim-btn"
          id="btnTrimStarboard"
          type="button"
          title="Hold D or Right Arrow to trim steering sweep starboard"
          aria-label="Trim Right Prow"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/>
            <path d="M13 6l6 6-6 6"/>
          </svg>
        </button>
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
        <div class="dialog-card hud-pause-dialog-card">
          <h3>Wayfinder Options</h3>
          <p class="dialog-sub">Switch guidance mode at any time or return to shore before departure.</p>
          <div class="settings-section hud-pause-diff-section">
            <div class="settings-section-label">Difficulty &amp; Wayfinder</div>
            <div class="settings-diff-grid" id="hudModeGrid">
              ${diffCardsHtml}
            </div>
            <div class="settings-diff-summary" id="hudDifficultyDesc"></div>
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
          <div class="lost-map-wrap hidden" id="lostMapWrap">
            <canvas class="lost-route-canvas" id="lostRouteCanvas" width="360" height="220"></canvas>
          </div>
          <div class="dialog-actions lost-mist-actions">
            <button class="secondary-btn" id="btnLostHowDidIDo" type="button">How did I do?</button>
            <button class="primary-btn" id="btnRestoreFromMist">Return to Shore (Before Departure)</button>
          </div>
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
    this.rootEl
      .querySelector('#btnHudSoundToggle')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.callbacks.onToggleMute?.();
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
      .querySelector('#btnLostHowDidIDo')
      .addEventListener('click', () => {
        const wrap = this.rootEl.querySelector('#lostMapWrap');
        const btn = this.rootEl.querySelector('#btnLostHowDidIDo');
        if (!wrap || !btn) return;
        const nextOpen = wrap.classList.contains('hidden');
        wrap.classList.toggle('hidden', !nextOpen);
        btn.textContent = nextOpen ? 'Hide Path' : 'How did I do?';
        if (nextOpen) {
          this._renderLostRouteMap();
        }
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
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end);
      btn.addEventListener('touchcancel', end);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    bindHoldSteer('#btnTrimPort', 'ArrowLeft');
    bindHoldSteer('#btnTrimStarboard', 'ArrowRight');

    // Difficulty cards
    this.rootEl.querySelectorAll('#hudModeGrid .settings-diff-card').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const mode = btn.getAttribute('data-mode');
        this.callbacks.onChangeDifficulty?.(mode);
        this._syncPauseDifficultyUI(mode);
      });
    });

    // Keyboard shortcuts (X = Look Astern, Z = Mast-Top, F = Fast Forward, R = Recall, Escape = close modal)
    window.addEventListener('keydown', (e) => {
      if (this.rootEl.classList.contains('hidden')) return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!e.shiftKey && e.code === 'KeyX') {
        this.callbacks.onToggleFreeLook?.();
      } else if (!e.shiftKey && e.code === 'KeyZ') {
        this.callbacks.onLookZenith?.();
      } else if (!e.shiftKey && e.code === 'KeyF') {
        this.callbacks.onToggleFastForward?.();
      } else if (!e.shiftKey && e.code === 'KeyR') {
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
    this.rootEl.querySelector('#lostMapWrap')?.classList.add('hidden');
    const howBtn = this.rootEl.querySelector('#btnLostHowDidIDo');
    if (howBtn) howBtn.textContent = 'How did I do?';
    this.rootEl.querySelector('#landfallOverlay').classList.add('hidden');
  }

  _renderLostRouteMap() {
    const canvas = this.rootEl.querySelector('#lostRouteCanvas');
    const oceanSim = this.callbacks.getOceanSim?.();
    if (!canvas || !oceanSim) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#071726');
    bgGrad.addColorStop(1, '#0c2338');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const fromIsl = oceanSim.activeIslands?.[oceanSim.song?.fromIsland];
    const toIsl = oceanSim.activeIslands?.[oceanSim.song?.toIsland];
    const trace = Array.isArray(oceanSim.routeTrace) ? oceanSim.routeTrace : [];

    const pts = [...trace];
    if (fromIsl?.simPos) pts.push(fromIsl.simPos);
    if (toIsl?.simPos) pts.push(toIsl.simPos);
    if (pts.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = Math.max(2.0, maxX - minX);
    const spanY = Math.max(2.0, maxY - minY);
    const pad = 34;
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;
    const toPx = (p) => ({
      x: w * 0.5 + (p.x - midX) * scale,
      y: h * 0.5 - (p.y - midY) * scale,
    });

    // Subtle dashed direct line from origin to target
    if (fromIsl?.simPos && toIsl?.simPos) {
      const a = toPx(fromIsl.simPos);
      const b = toPx(toIsl.simPos);
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(232, 198, 142, 0.28)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    // Sailed path marked in red
    if (trace.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      trace.forEach((pt, idx) => {
        const c = toPx(pt);
        if (idx === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.stroke();

      const endPt = toPx(trace[trace.length - 1]);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const drawIslandMarker = (isl, color, ringColor = null) => {
      if (!isl?.simPos) return;
      const p = toPx(isl.simPos);
      if (ringColor) {
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f4efe6';
      ctx.textAlign = 'center';
      const labelY = p.y - 11 < 14 ? p.y + 18 : p.y - 11;
      ctx.fillText(isl.name || isl.id, p.x, labelY);
    };

    drawIslandMarker(fromIsl, '#f4d35e');
    drawIslandMarker(toIsl, '#3ef0d0', 'rgba(62, 240, 208, 0.4)');
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
      sim.usedRecallThisVoyage = true;
      const lesson =
        SAND_LESSONS[sim.song.sandRecallId] ||
        SAND_LESSONS.sand_maupiti_12_shell_compass;
      this.rootEl.querySelector('#recallTitle').textContent = lesson.title;
      this.rootEl.querySelector('#recallNarration').textContent = lesson.narration;
      // STRICTLY STATIC (animate: false) per GDD Inviolable Zero-Compass Rule!
      this.sandCanvas.renderLesson(lesson, { animate: false });
    }
  }

  setSoundMutedState(muted) {
    const isMuted = Boolean(muted);
    const glyphEl = this.rootEl.querySelector('#hudSoundGlyph');
    const btnEl = this.rootEl.querySelector('#btnHudSoundToggle');
    if (glyphEl) {
      glyphEl.textContent = isMuted ? '🔇' : '🔊';
    }
    if (btnEl) {
      btnEl.title = isMuted
        ? 'Sound Muted — Click to Unmute'
        : 'Sound On — Click to Mute';
      btnEl.setAttribute('aria-pressed', String(!isMuted));
    }
  }

  _syncPauseDifficultyUI(diff) {
    const resolved = DIFFICULTY_META[diff] ? diff : Difficulty.EASY;
    this.rootEl
      .querySelectorAll('#hudModeGrid .settings-diff-card')
      .forEach((btn) => {
        const m = btn.getAttribute('data-mode');
        btn.classList.toggle('selected', m === resolved);
      });
    const descEl = this.rootEl.querySelector('#hudDifficultyDesc');
    if (descEl) {
      descEl.textContent = DIFFICULTY_META[resolved].summary;
    }
  }

  setPauseModal(open) {
    this.pauseOpen = Boolean(open);
    if (this.pauseOpen) {
      this._syncPauseDifficultyUI(
        this.callbacks.getGameState?.()?.difficulty || Difficulty.EASY
      );
    }
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

    // Mode-gated Recall button
    const recallBtn = this.rootEl.querySelector('#btnRecall');
    recallBtn.style.display = allowsRecallAtSea(diff) ? 'inline-flex' : 'none';

    // Camera perspective (Eye button), Fast Wind & Free-Look button states
    const camBtn = this.rootEl.querySelector('#btnCameraView');
    const isPhoneCam = Boolean(cameraCtrl?.isPhoneViewport?.());
    if (isPhoneCam) {
      const phoneStates = ['Deck View', 'Canoe View', 'Look Astern', 'Look Up'];
      const stateIdx = cameraCtrl.phoneCameraState ?? 0;
      const stateLabel = phoneStates[stateIdx] || 'Deck View';
      camBtn.classList.toggle('active', stateIdx !== 0);
      camBtn.setAttribute('aria-label', `Camera View: ${stateLabel}`);
      camBtn.setAttribute('title', `Camera View: ${stateLabel} (Tap to Switch)`);
      this.rootEl.querySelector('#btnCameraViewLabel').textContent = stateLabel;
    } else {
      const isThirdPerson = Boolean(cameraCtrl?.isThirdPersonView?.());
      camBtn.classList.toggle('active', isThirdPerson);
      camBtn.setAttribute(
        'title',
        'Toggle between behind-canoe view and 1st-person deck view (V)'
      );
      camBtn.setAttribute('aria-label', isThirdPerson ? 'Deck View' : 'Canoe View');
      this.rootEl.querySelector('#btnCameraViewLabel').textContent = isThirdPerson
        ? 'Deck View'
        : 'Canoe View';
    }

    const fastWind = Boolean(oceanSim.fastForward);
    const fastBtn = this.rootEl.querySelector('#btnFastForward');
    fastBtn.classList.toggle('active', fastWind);
    fastBtn.setAttribute('aria-pressed', String(fastWind));

    const gazeOffset = cameraCtrl?.isGazeOffset();
    this.rootEl.querySelector('#btnFreeLook').classList.toggle('active', Boolean(gazeOffset));
    this.rootEl.querySelector('#btnFreeLookLabel').textContent = gazeOffset
      ? 'Center Gaze'
      : 'Look Astern';

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

    // Sync Pause Modal active mode highlight & unified explanation
    this._syncPauseDifficultyUI(diff);

    // Lost at Sea Mist Curtain
    const lostOverlay = this.rootEl.querySelector('#lostMistOverlay');
    if (oceanSim.status === VoyageStatus.LOST_AT_SEA) {
      lostOverlay.classList.remove('hidden');
      this.rootEl.querySelector('#lostReflectionText').textContent =
        oceanSim.reflectionText;
    } else {
      lostOverlay.classList.add('hidden');
      this.rootEl.querySelector('#lostMapWrap')?.classList.add('hidden');
      const howBtn = this.rootEl.querySelector('#btnLostHowDidIDo');
      if (howBtn) howBtn.textContent = 'How did I do?';
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
