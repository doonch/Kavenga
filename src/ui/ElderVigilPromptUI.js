/**
 * Pre-Departure Elder Night-Sky Teaching Choice Popup for Kavenga: Songs of the Star Path.
 *
 * Shown when a player chooses to set sail from an island whose local elder / master has an
 * available Guided Sky Vigil constellation lesson that the player has not yet completed.
 * Gives the player two clear choices:
 *  1. Go directly to the elder's Guided Sky Vigil teaching, OR
 *  2. Set sail anyway without the teaching (leaving that constellation's lines, labels &
 *     silhouette hidden at sea).
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { ISLANDS } from '../data/islandsData.js';

export class ElderVigilPromptUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.open = false;
    this.pendingLesson = null;
    this.pendingSong = null;
    this.pendingDepartureWindow = null;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="modal-backdrop elder-vigil-prompt-backdrop" id="elderVigilPromptBackdrop">
        <div class="dialog-card elder-vigil-prompt-card" role="dialog" aria-modal="true" aria-labelledby="elderVigilPromptTitle">
          <div class="island-settings-header">
            <div>
              <div class="recall-eyebrow" id="elderVigilPromptEyebrow">Night-Sky Teaching Ashore</div>
              <h3 id="elderVigilPromptTitle"></h3>
            </div>
            <button class="walkable-close-btn" id="btnCloseElderVigilPrompt" type="button" title="Stay Ashore (Esc)">✕</button>
          </div>

          <div class="elder-vigil-prompt-body">
            <img class="elder-vigil-prompt-portrait" id="elderVigilPromptImg" alt="" />
            <div class="elder-vigil-prompt-copy">
              <div class="elder-vigil-prompt-role" id="elderVigilPromptRole"></div>
              <p class="elder-vigil-prompt-text" id="elderVigilPromptText"></p>
            </div>
          </div>

          <div class="elder-vigil-prompt-actions">
            <button class="primary-btn" id="btnGoDirectlyToTeaching" type="button"></button>
            <button class="secondary-btn" id="btnSetSailWithoutTeaching" type="button">
              ⛵ Set Sail Anyway Without Teaching
            </button>
          </div>
        </div>
      </div>
    `;

    this.rootEl
      .querySelector('#btnCloseElderVigilPrompt')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.hide();
      });

    this.rootEl
      .querySelector('#elderVigilPromptBackdrop')
      .addEventListener('click', (e) => {
        if (e.target.id === 'elderVigilPromptBackdrop') {
          this.hide();
        }
      });

    this.rootEl
      .querySelector('#btnGoDirectlyToTeaching')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        const lesson = this.pendingLesson;
        this.hide();
        if (lesson) {
          this.callbacks.onGoToTeaching?.(lesson);
        }
      });

    this.rootEl
      .querySelector('#btnSetSailWithoutTeaching')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        const song = this.pendingSong;
        const dep = this.pendingDepartureWindow;
        this.hide();
        if (song) {
          this.callbacks.onSetSailAnyway?.(song, dep);
        }
      });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.open) {
        this.hide();
      }
    });
  }

  isOpen() {
    return this.open;
  }

  show(lesson, song, departureWindow) {
    if (!lesson || !song) return;
    this.pendingLesson = lesson;
    this.pendingSong = song;
    this.pendingDepartureWindow = departureWindow;
    this.open = true;

    const isl = ISLANDS[lesson.islandId];
    const islName = isl ? isl.name : 'shore';

    this.rootEl.querySelector('#elderVigilPromptEyebrow').textContent =
      `${islName} · Night-Sky Teaching`;
    this.rootEl.querySelector('#elderVigilPromptTitle').textContent =
      `${lesson.elderName} Would Like to Teach You`;
    this.rootEl.querySelector('#elderVigilPromptRole').textContent =
      `${lesson.elderName} · ${lesson.elderRole}`;
    this.rootEl.querySelector('#elderVigilPromptText').textContent =
      `Before you cast off from ${islName}, ${lesson.elderName} wishes to guide your eyes at the Star-Stone Ring to recognize ${lesson.title}. Until you receive this teaching, its chalk lines, star names, and animal shape will remain hidden in the night sky.`;
    this.rootEl.querySelector('#btnGoDirectlyToTeaching').textContent =
      `✨ Go to ${lesson.elderName}'s Teaching (${lesson.title})`;

    const imgEl = this.rootEl.querySelector('#elderVigilPromptImg');
    imgEl.src = lesson.portrait;
    imgEl.alt = lesson.elderName;

    this.rootEl.classList.remove('hidden');
    if (lesson.promptVoiceId) {
      this.callbacks.onPlayVoice?.(lesson.promptVoiceId);
    }
  }

  hide() {
    this.open = false;
    this.pendingLesson = null;
    this.pendingSong = null;
    this.pendingDepartureWindow = null;
    this.rootEl.classList.add('hidden');
    this.callbacks.onStopVoice?.();
  }
}
