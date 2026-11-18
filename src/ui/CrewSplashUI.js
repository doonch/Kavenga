/**
 * Crew Recruitment Splash Modal UI.
 *
 * Displays a celebratory splash popup whenever a specialist voyaging companion
 * joins the player's canoe crew (`tama`, `moana`, `kahu`), showing their
 * full-body portrait and an explanation of what they do aboard the vaka.
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { CREW_CATALOG } from '../core/campaignManager.js';
import { ISLANDS } from '../data/islandsData.js';

export class CrewSplashUI {
  constructor(rootEl, callbacks = {}) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this._queue = [];
    this._activeCrewId = null;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="modal-backdrop hidden" id="crewSplashBackdrop" role="dialog" aria-modal="true" aria-labelledby="crewSplashTitle">
        <div class="crew-splash-card">
          <div class="crew-splash-eyebrow" id="crewSplashEyebrow">Voyaging Companion</div>
          <h2 class="crew-splash-title" id="crewSplashTitle"></h2>
          <div class="crew-splash-role" id="crewSplashRole"></div>
          <div class="crew-splash-portrait-wrap">
            <img class="crew-splash-portrait" id="crewSplashPortrait" alt="" />
          </div>
          <p class="crew-splash-trait" id="crewSplashTrait"></p>
          <div class="crew-splash-actions">
            <button class="primary-btn full-width-btn" id="btnDismissCrewSplash" type="button">
              Welcome Aboard
            </button>
          </div>
        </div>
      </div>
    `;

    this.backdropEl = this.rootEl.querySelector('#crewSplashBackdrop');
    this.rootEl
      .querySelector('#btnDismissCrewSplash')
      .addEventListener('click', () => this.dismiss());

    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.dismiss();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen()) {
        this.dismiss();
      }
    });
  }

  isOpen() {
    return Boolean(
      this.backdropEl && !this.backdropEl.classList.contains('hidden')
    );
  }

  enqueue(crewIds) {
    const ids = Array.isArray(crewIds) ? crewIds : [crewIds];
    for (const id of ids) {
      if (id && CREW_CATALOG[id] && !this._queue.includes(id) && this._activeCrewId !== id) {
        this._queue.push(id);
      }
    }
    if (!this.isOpen() && this._queue.length > 0) {
      this._showNext();
    }
  }

  _showNext() {
    const nextId = this._queue.shift();
    if (!nextId) {
      this.hide();
      return;
    }
    const cr = CREW_CATALOG[nextId];
    if (!cr) {
      this._showNext();
      return;
    }
    this._activeCrewId = nextId;
    const homeIsl = ISLANDS[cr.homeIslandId];

    this.rootEl.querySelector('#crewSplashEyebrow').textContent = homeIsl
      ? `Voyaging Companion · ${homeIsl.name}`
      : 'Voyaging Companion';
    this.rootEl.querySelector('#crewSplashTitle').textContent =
      `${cr.name} has joined your crew!`;
    this.rootEl.querySelector('#crewSplashRole').textContent = cr.role;

    const imgEl = this.rootEl.querySelector('#crewSplashPortrait');
    imgEl.src = cr.portrait || '';
    imgEl.alt = `${cr.name} · ${cr.role}`;

    this.rootEl.querySelector('#crewSplashTrait').textContent = cr.traitText;

    this.rootEl.classList.remove('hidden');
    this.backdropEl.classList.remove('hidden');
    this.callbacks.onShown?.(nextId);
  }

  dismiss() {
    this._activeCrewId = null;
    if (this._queue.length > 0) {
      this._showNext();
    } else {
      this.hide();
      this.callbacks.onAllDismissed?.();
    }
  }

  hide() {
    this._activeCrewId = null;
    this._queue = [];
    this.backdropEl?.classList.add('hidden');
    this.rootEl?.classList.add('hidden');
  }
}
