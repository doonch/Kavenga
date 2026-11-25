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

export const DIFFICULTY_META = Object.freeze({
  [Difficulty.EASY]: {
    short: 'Easy',
    persona: 'Apprentice',
    portrait: './assets/crew/player_easy.jpg',
    summary: 'Chant audio, verse lyrics, cue hints & active star shimmer.',
  },
  [Difficulty.MEDIUM]: {
    short: 'Medium',
    persona: 'Wayfinder',
    portrait: './assets/crew/player_medium.jpg',
    summary: 'Chant audio, poetic verse lyrics & constellation sky.',
  },
  [Difficulty.HARD]: {
    short: 'Hard',
    persona: 'Navigator',
    portrait: './assets/crew/player_hard.jpg',
    summary: 'Chant audio & constellation sky — zero on-screen text.',
  },
  [Difficulty.MASTER_NAVIGATOR]: {
    short: 'Master',
    persona: 'Elder Master',
    portrait: './assets/crew/player_master_navigator.jpg',
    summary: 'Pure sea silence, raw starfield & no Recall at sea.',
  },
});

export class IslandSettingsUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.open = false;
    this.confirmResetOpen = false;
    this.creditsOpen = false;

    this._buildDOM();
  }

  _buildDOM() {
    const diffCardsHtml = Object.entries(DIFFICULTY_META)
      .map(
        ([key, meta]) => `
        <button class="settings-diff-card" data-difficulty="${key}" type="button">
          <div class="settings-diff-art">
            <img src="${meta.portrait}" alt="${meta.persona}" />
          </div>
          <strong>${meta.short}</strong>
          <span>${meta.persona}</span>
        </button>`
      )
      .join('');

    this.rootEl.innerHTML = `
      <div class="modal-backdrop island-settings-backdrop" id="islandSettingsBackdrop">
        <div class="dialog-card island-settings-card" role="dialog" aria-modal="true" aria-labelledby="islandSettingsTitle">
          <div class="island-settings-header">
            <h3 id="islandSettingsTitle">⚙ Settings</h3>
            <button class="walkable-close-btn" id="btnCloseIslandSettings" type="button" title="Close Settings (Esc)">✕</button>
          </div>

          <!-- 1. Compact Audio Toggles -->
          <div class="settings-section">
            <div class="settings-section-label">Audio</div>
            <div class="settings-sound-toggle">
              <button class="settings-sound-btn" id="btnSettingsMusicToggle" type="button"></button>
              <button class="settings-sound-btn" id="btnSettingsVoiceToggle" type="button"></button>
            </div>
          </div>

          <!-- 2. Difficulty: Compact Portrait Cards + Active Summary -->
          <div class="settings-section">
            <div class="settings-section-label">Difficulty &amp; Wayfinder</div>
            <div class="settings-diff-grid" id="settingsDifficultyGrid">
              ${diffCardsHtml}
            </div>
            <div class="settings-diff-summary" id="settingsDifficultyDesc"></div>
          </div>

          <div class="dialog-actions settings-footer-actions settings-footer-split">
            <button class="danger-outline-btn" id="btnSettingsStartOver" type="button">
              ↺ Start Over...
            </button>
            <div class="settings-footer-right">
              <button class="secondary-btn" id="btnSettingsCredits" type="button">Credits</button>
              <button class="primary-btn" id="btnDoneIslandSettings" type="button">Done</button>
            </div>
          </div>
        </div>

        <!-- Secondary Credits Modal -->
        <div class="modal-backdrop settings-confirm-backdrop hidden" id="settingsCreditsModal" role="dialog" aria-modal="true" aria-labelledby="settingsCreditsTitle">
          <div class="dialog-card settings-credits-card">
            <h3 id="settingsCreditsTitle">Thank you for playing Kavenga</h3>
            <div class="settings-credits-section">
              <div class="settings-section-label">Developers</div>
              <div class="settings-credits-grid">
                <div class="crew-card settings-credits-dev-card">
                  <div class="crew-card-art settings-credits-art">
                    <img src="./assets/crew/dan.png" alt="Dan Elharrar" />
                  </div>
                  <div class="crew-card-name">Dan Elharrar</div>
                </div>
                <div class="crew-card settings-credits-dev-card">
                  <div class="crew-card-art settings-credits-art">
                    <img src="./assets/crew/adam.png" alt="Adam Lukasiewicz Elharrar" />
                  </div>
                  <div class="crew-card-name">Adam Lukasiewicz Elharrar</div>
                </div>
              </div>
            </div>
            <div class="settings-credits-link-row">
              <p class="settings-credits-prompt">
                Have an idea, found an issue? Visit our GitHub repository:
              </p>
              <a
                class="settings-credits-link"
                href="https://github.com/doonch/Kavenga"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/doonch/Kavenga
              </a>
            </div>
            <div class="dialog-actions">
              <button class="primary-btn" id="btnDoneCredits" type="button">Done</button>
            </div>
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
      if (e.target === backdrop && !this.confirmResetOpen && !this.creditsOpen) {
        this.hide();
      }
    });

    // 1. Compact Audio toggle handlers
    this.rootEl
      .querySelector('#btnSettingsMusicToggle')
      ?.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const cur = this.callbacks.getIsMusicEnabled?.() ?? true;
        this.callbacks.onSetMusicEnabled?.(!cur);
        this.refresh();
      });
    this.rootEl
      .querySelector('#btnSettingsVoiceToggle')
      ?.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const cur = this.callbacks.getIsVoiceEnabled?.() ?? true;
        this.callbacks.onSetVoiceEnabled?.(!cur);
        this.refresh();
      });

    // 3. Difficulty level handlers
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

    // Credits secondary modal handlers
    const creditsModal = this.rootEl.querySelector('#settingsCreditsModal');
    this.rootEl
      .querySelector('#btnSettingsCredits')
      ?.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this._setCreditsOpen(true);
      });
    this.rootEl
      .querySelector('#btnDoneCredits')
      ?.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this._setCreditsOpen(false);
      });
    creditsModal?.addEventListener('click', (e) => {
      if (e.target === creditsModal) {
        this._setCreditsOpen(false);
      }
    });

    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || e.code !== 'Escape') return;
        e.stopImmediatePropagation();
        if (this.creditsOpen) {
          this._setCreditsOpen(false);
        } else if (this.confirmResetOpen) {
          this._setConfirmResetOpen(false);
        } else {
          this.hide();
        }
      },
      true
    );
  }

  _setCreditsOpen(isOpen) {
    this.creditsOpen = Boolean(isOpen);
    this.rootEl
      .querySelector('#settingsCreditsModal')
      ?.classList.toggle('hidden', !this.creditsOpen);
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
    this._setCreditsOpen(false);
    this._setConfirmResetOpen(false);
    this.rootEl.classList.remove('hidden');
    this.refresh();
  }

  hide() {
    this.open = false;
    this._setCreditsOpen(false);
    this._setConfirmResetOpen(false);
    this.rootEl.classList.add('hidden');
    this.callbacks.onClose?.();
  }

  refresh() {
    const gs = this.callbacks.getGameState?.();
    const diff = gs?.difficulty || Difficulty.EASY;
    const musicEnabled = this.callbacks.getIsMusicEnabled?.() ?? true;
    const voiceEnabled = this.callbacks.getIsVoiceEnabled?.() ?? true;

    const musicBtn = this.rootEl.querySelector('#btnSettingsMusicToggle');
    if (musicBtn) {
      musicBtn.textContent = musicEnabled ? '🎵 Music: On' : '🔇 Music: Off';
      musicBtn.classList.toggle('active', musicEnabled);
      musicBtn.setAttribute('aria-pressed', String(musicEnabled));
    }

    const voiceBtn = this.rootEl.querySelector('#btnSettingsVoiceToggle');
    if (voiceBtn) {
      voiceBtn.textContent = voiceEnabled ? '🗣️ Speech: On' : '🔇 Speech: Off';
      voiceBtn.classList.toggle('active', voiceEnabled);
      voiceBtn.setAttribute('aria-pressed', String(voiceEnabled));
    }

    this.rootEl.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.classList.toggle(
        'selected',
        btn.getAttribute('data-difficulty') === diff
      );
    });

    const descEl = this.rootEl.querySelector('#settingsDifficultyDesc');
    if (descEl) {
      descEl.textContent =
        DIFFICULTY_META[diff]?.summary || DIFFICULTY_META[Difficulty.EASY].summary;
    }
  }
}
