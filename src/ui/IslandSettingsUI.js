/**
 * Ashore Settings Modal & "Start Over" Confirmation Dialog for Kavenga: Songs of the Star Path.
 *
 * Available exclusively while on an island (`phase === 'shore'`, never while sailing).
 * Provides:
 *  1. Sound On / Off toggle
 *  2. Difficulty selector across all four defined levels (Easy, Medium, Hard, Master Navigator)
 *  3. Start Over action gated behind an explicit "Are you sure?" confirmation popup that
 *     erases all saved progress and reloads the game at the starting point on Ra'iatea.
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { Difficulty } from '../core/gameConstants.js';

export function formatShortSettingsSummary(difficulty, isMuted) {
  const shortDiff = {
    [Difficulty.EASY]: 'Apprentice',
    [Difficulty.MEDIUM]: 'Wayfinder',
    [Difficulty.HARD]: 'Navigator',
    [Difficulty.MASTER_NAVIGATOR]: 'Master',
  };
  const soundGlyph = isMuted ? '🔇' : '🔊';
  return `${shortDiff[difficulty] || 'Wayfinder'} · ${soundGlyph}`;
}

export class IslandSettingsUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.open = false;
    this.confirmResetOpen = false;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="modal-backdrop island-settings-backdrop" id="islandSettingsBackdrop">
        <div class="dialog-card island-settings-card" role="dialog" aria-modal="true" aria-labelledby="islandSettingsTitle">
          <div class="island-settings-header">
            <div>
              <div class="recall-eyebrow">Ashore Preferences</div>
              <h3 id="islandSettingsTitle">⚙ Settings</h3>
            </div>
            <button class="walkable-close-btn" id="btnCloseIslandSettings" type="button" title="Close Settings (Esc)">✕</button>
          </div>

          <!-- 1. Difficulty: The Four Defined Levels -->
          <div class="settings-section">
            <div class="settings-section-label">Difficulty &amp; Wayfinder Persona</div>
            <div class="mode-selector-grid" id="settingsDifficultyGrid">
              <button class="mode-option-btn" data-difficulty="easy" type="button">
                <strong>Easy · Apprentice (12–14 yrs)</strong>
                <span>Youth apprentice in pandanus pareu · Chant audio, verse lyrics, cue hints &amp; active star shimmer</span>
              </button>
              <button class="mode-option-btn" data-difficulty="medium" type="button">
                <strong>Medium · Wayfinder (18–20 yrs)</strong>
                <span>Young wayfinder with frigatebird plume · Chant audio, poetic verse lyrics &amp; constellation sky</span>
              </button>
              <button class="mode-option-btn" data-difficulty="hard" type="button">
                <strong>Hard · Navigator (30 yrs)</strong>
                <span>Seasoned navigator in kura circlet · Chant audio &amp; constellation sky — zero on-screen text</span>
              </button>
              <button class="mode-option-btn" data-difficulty="master_navigator" type="button">
                <strong>Master Navigator (50 yrs, Gray Beard)</strong>
                <span>Elder master in kahu tapa cloak · Pure sea silence, raw starfield &amp; no Recall at sea</span>
              </button>
            </div>
          </div>

          <!-- 2. Start Over (gated by confirmation popup) -->
          <div class="settings-section settings-reset-row">
            <div class="settings-reset-copy">
              <strong>Start Over</strong>
              <span>Erase saved campaign progress and begin anew on Ra'iatea.</span>
            </div>
            <button class="danger-outline-btn" id="btnSettingsStartOver" type="button">
              ↺ Start Over...
            </button>
          </div>

          <div class="dialog-actions settings-footer-actions">
            <button class="primary-btn" id="btnDoneIslandSettings" type="button">Done</button>
          </div>
        </div>

        <!-- "Are you sure?" Confirmation Popup for Start Over -->
        <div class="modal-backdrop settings-confirm-backdrop hidden" id="startOverConfirmModal" role="alertdialog" aria-modal="true" aria-labelledby="startOverConfirmTitle">
          <div class="dialog-card settings-confirm-card">
            <div class="recall-eyebrow settings-danger-eyebrow">Confirm Reset</div>
            <h3 id="startOverConfirmTitle">Are you sure?</h3>
            <p class="dialog-sub">
              This will erase all discovered islands, learned star-path chants, recruited crewmates, and canoe upgrades, and reload your journey at the starting shore of Ra'iatea.
            </p>
            <label class="settings-reset-checkbox">
              <input type="checkbox" id="chkDeleteAchievements" />
              <span>Also delete all unlocked achievements</span>
            </label>
            <div class="dialog-actions">
              <button class="secondary-btn" id="btnCancelStartOver" type="button">Cancel</button>
              <button class="danger-solid-btn" id="btnConfirmStartOver" type="button">Yes, Erase &amp; Start Over</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const closeBtn = this.rootEl.querySelector('#btnCloseIslandSettings');
    const doneBtn = this.rootEl.querySelector('#btnDoneIslandSettings');
    const backdrop = this.rootEl.querySelector('#islandSettingsBackdrop');

    closeBtn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.hide();
    });
    doneBtn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.hide();
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && !this.confirmResetOpen) {
        this.hide();
      }
    });

    // 1. Difficulty level handlers
    this.rootEl.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const mode = btn.getAttribute('data-difficulty');
        this.callbacks.onChangeDifficulty?.(mode);
        this.refresh();
      });
    });

    // 2. Start Over confirmation handlers
    const confirmModal = this.rootEl.querySelector('#startOverConfirmModal');
    this.rootEl
      .querySelector('#btnSettingsStartOver')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this._setConfirmResetOpen(true);
      });
    this.rootEl
      .querySelector('#btnCancelStartOver')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this._setConfirmResetOpen(false);
      });
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        this._setConfirmResetOpen(false);
      }
    });
    this.rootEl
      .querySelector('#btnConfirmStartOver')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        const deleteAchievements = Boolean(
          this.rootEl.querySelector('#chkDeleteAchievements')?.checked
        );
        this.callbacks.onConfirmStartOver?.({ deleteAchievements });
      });

    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || e.code !== 'Escape') return;
        e.stopImmediatePropagation();
        if (this.confirmResetOpen) {
          this._setConfirmResetOpen(false);
        } else {
          this.hide();
        }
      },
      true
    );
  }

  _setConfirmResetOpen(isOpen) {
    this.confirmResetOpen = Boolean(isOpen);
    if (this.confirmResetOpen) {
      const chk = this.rootEl.querySelector('#chkDeleteAchievements');
      if (chk) chk.checked = false;
    }
    this.rootEl
      .querySelector('#startOverConfirmModal')
      ?.classList.toggle('hidden', !this.confirmResetOpen);
  }

  isOpen() {
    return this.open;
  }

  show() {
    this.open = true;
    this._setConfirmResetOpen(false);
    this.rootEl.classList.remove('hidden');
    this.refresh();
  }

  hide() {
    this.open = false;
    this._setConfirmResetOpen(false);
    this.rootEl.classList.add('hidden');
    this.callbacks.onClose?.();
  }

  refresh() {
    const gs = this.callbacks.getGameState?.();
    const diff = gs?.difficulty || Difficulty.MEDIUM;

    this.rootEl.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.classList.toggle(
        'selected',
        btn.getAttribute('data-difficulty') === diff
      );
    });
  }
}
