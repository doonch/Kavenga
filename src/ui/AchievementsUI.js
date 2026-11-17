/**
 * Celebration Banners & Ashore Achievements Gallery UI for Kavenga: Songs of the Star Path.
 *
 * Provides:
 *  1. Non-blocking Achievement Unlocked toast cards (appear both at sea and ashore)
 *  2. Ashore-only Objective Cleared visual check-off banner (hidden immediately when sailing)
 *  3. Ashore Achievements Gallery modal showing all unlocked feats (with real-world unlock date,
 *     difficulty level, and island / chain context) plus `???` mystery plaques for remaining feats.
 *
 * Strictly zero cardinal directions, degree numbers, or compass icons in all player-facing UI.
 */

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class AchievementsUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.open = false;
    this._bannerTimers = new Set();

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <!-- Non-blocking Floating Celebration Stack (Achievement Unlocks & Shore Objective Clears) -->
      <div class="celebration-toast-stack" id="celebrationToastStack" aria-live="polite"></div>

      <!-- Ashore Achievements Gallery Modal -->
      <div class="modal-backdrop achievements-modal-backdrop hidden" id="achievementsModalBackdrop">
        <div class="dialog-card achievements-modal-card" role="dialog" aria-modal="true" aria-labelledby="achievementsModalTitle">
          <div class="achievements-modal-header">
            <div>
              <div class="recall-eyebrow">Unannounced Feats of Wayfinding</div>
              <h3 id="achievementsModalTitle">🏆 Achievements</h3>
              <p class="achievements-modal-sub">
                Earned organically through extraordinary voyages and discoveries across the sea.
              </p>
            </div>
            <div class="achievements-header-right">
              <div class="achievements-tally-pills" id="achievementsTallyPills"></div>
            </div>
          </div>

          <div class="achievements-grid" id="achievementsGalleryGrid"></div>

          <div class="dialog-actions settings-footer-actions">
            <button class="primary-btn" id="btnDoneAchievementsModal" type="button">Close</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = this.rootEl.querySelector('#achievementsModalBackdrop');
    this.rootEl
      .querySelector('#btnDoneAchievementsModal')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.hideModal();
      });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.hideModal();
      }
    });

    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || e.code !== 'Escape') return;
        e.stopImmediatePropagation();
        this.hideModal();
      },
      true
    );
  }

  isOpen() {
    return this.open;
  }

  showModal() {
    this.open = true;
    this.refreshModal();
    this.rootEl
      .querySelector('#achievementsModalBackdrop')
      ?.classList.remove('hidden');
  }

  hideModal() {
    if (!this.open) return;
    this.open = false;
    this.rootEl
      .querySelector('#achievementsModalBackdrop')
      ?.classList.add('hidden');
    this.callbacks.onClose?.();
  }

  /**
   * Immediately removes any ashore-only Objective banners (called when entering Sailing or Vigil).
   */
  clearObjectiveBanners() {
    const stack = this.rootEl.querySelector('#celebrationToastStack');
    if (!stack) return;
    stack
      .querySelectorAll('.objective-cleared-banner, .objective-added-banner')
      .forEach((el) => el.remove());
  }

  /**
   * Displays a warm tapa-amber toast when a new Objective is given ashore.
   * Calls `onComplete(objectiveDef)` once the toast finishes its exit animation.
   */
  showObjectiveAdded(objectiveDef, onComplete = null) {
    if (!objectiveDef) {
      onComplete?.(objectiveDef);
      return;
    }
    const stack = this.rootEl.querySelector('#celebrationToastStack');
    if (!stack) {
      onComplete?.(objectiveDef);
      return;
    }

    const card = document.createElement('div');
    card.className = 'celebration-banner objective-added-banner';
    card.innerHTML = `
      <div class="objective-added-badge" aria-hidden="true">${escapeHtml(objectiveDef.glyph || '✦')}</div>
      <div class="celebration-banner-copy">
        <div class="celebration-eyebrow objective-added-eyebrow">✦ New Objective</div>
        <div class="celebration-title">${escapeHtml(objectiveDef.title)}</div>
        ${
          objectiveDef.detail
            ? `<div class="celebration-desc">${escapeHtml(objectiveDef.detail)}</div>`
            : ''
        }
      </div>
    `;
    stack.appendChild(card);

    requestAnimationFrame(() => {
      card.classList.add('visible');
    });

    const tOut = setTimeout(() => {
      card.classList.remove('visible');
      const tRem = setTimeout(() => {
        card.remove();
        this._bannerTimers.delete(tRem);
        onComplete?.(objectiveDef);
      }, 420);
      this._bannerTimers.add(tRem);
      this._bannerTimers.delete(tOut);
    }, 4500);
    this._bannerTimers.add(tOut);
  }

  /**
   * Displays a crisp golden-jade check-off cue when an Objective is cleared ashore.
   */
  showObjectiveCleared(objectiveDef) {
    if (!objectiveDef) return;
    const stack = this.rootEl.querySelector('#celebrationToastStack');
    if (!stack) return;

    const card = document.createElement('div');
    card.className = 'celebration-banner objective-cleared-banner';
    card.innerHTML = `
      <div class="celebration-check-badge" aria-hidden="true">✓</div>
      <div class="celebration-banner-copy">
        <div class="celebration-eyebrow objective-eyebrow">Objective Cleared</div>
        <div class="celebration-title objective-strike-anim">${escapeHtml(objectiveDef.glyph || '✦')} ${escapeHtml(objectiveDef.title)}</div>
      </div>
    `;
    stack.appendChild(card);

    requestAnimationFrame(() => {
      card.classList.add('visible');
    });

    const tOut = setTimeout(() => {
      card.classList.remove('visible');
      const tRem = setTimeout(() => {
        card.remove();
        this._bannerTimers.delete(tRem);
      }, 420);
      this._bannerTimers.add(tRem);
      this._bannerTimers.delete(tOut);
    }, 3800);
    this._bannerTimers.add(tOut);
  }

  /**
   * Displays a celebratory mother-of-pearl & gold toast when a Surprise Achievement unlocks (at sea or ashore).
   */
  showAchievementUnlocked(unlockedRecord) {
    if (!unlockedRecord) return;
    const stack = this.rootEl.querySelector('#celebrationToastStack');
    if (!stack) return;

    const card = document.createElement('div');
    card.className = 'celebration-banner achievement-unlocked-banner';
    card.innerHTML = `
      <div class="achievement-toast-emblem" aria-hidden="true">${escapeHtml(unlockedRecord.glyph || '🏆')}</div>
      <div class="celebration-banner-copy">
        <div class="celebration-eyebrow achievement-eyebrow">🏆 Achievement Unlocked</div>
        <div class="celebration-title">${escapeHtml(unlockedRecord.title)}</div>
        <div class="celebration-desc">${escapeHtml(unlockedRecord.description)}</div>
        <div class="celebration-meta">${escapeHtml(unlockedRecord.difficultyLabel)} · ${escapeHtml(unlockedRecord.locationLabel)}</div>
      </div>
    `;
    stack.appendChild(card);

    requestAnimationFrame(() => {
      card.classList.add('visible');
    });

    if (this.open) {
      this.refreshModal();
    }

    const tOut = setTimeout(() => {
      card.classList.remove('visible');
      const tRem = setTimeout(() => {
        card.remove();
        this._bannerTimers.delete(tRem);
      }, 480);
      this._bannerTimers.add(tRem);
      this._bannerTimers.delete(tOut);
    }, 5400);
    this._bannerTimers.add(tOut);
  }

  refreshModal() {
    const mgr = this.callbacks.getAchievementsManager?.();
    if (!mgr) return;
    const summary = mgr.getSummary();

    const pillsEl = this.rootEl.querySelector('#achievementsTallyPills');
    if (pillsEl) {
      pillsEl.innerHTML = `
        <span class="ach-tally-pill unlocked">✦ ${summary.unlockedCount} / ${summary.totalCount} Unlocked</span>
      `;
    }

    const gridEl = this.rootEl.querySelector('#achievementsGalleryGrid');
    if (!gridEl) return;

    const cardsHtml = [];

    for (const item of summary.unlockedList) {
      cardsHtml.push(`
        <article class="ach-card unlocked">
          <div class="ach-card-emblem" aria-hidden="true">${escapeHtml(item.glyph || '🏆')}</div>
          <div class="ach-card-body">
            <div class="ach-card-top">
              <h4>${escapeHtml(item.title)}</h4>
              <span class="ach-date-tag">${escapeHtml(item.dateLabel)}</span>
            </div>
            <p class="ach-card-desc">${escapeHtml(item.description)}</p>
            <div class="ach-card-meta">
              <span class="ach-meta-chip">✦ ${escapeHtml(item.difficultyLabel)}</span>
              ${
                item.locationLabel
                  ? `<span class="ach-meta-chip">🏝️ ${escapeHtml(item.locationLabel)}</span>`
                  : ''
              }
            </div>
          </div>
        </article>
      `);
    }

    for (let i = 0; i < summary.remainingMysteryCount; i += 1) {
      cardsHtml.push(`
        <article class="ach-card mystery" aria-label="Uncharted Mystery Achievement">
          <div class="ach-card-emblem mystery-emblem" aria-hidden="true">???</div>
          <div class="ach-card-body">
            <div class="ach-card-top">
              <h4>Uncharted Wayfinder Feat</h4>
            </div>
            <p class="ach-card-desc">Hidden until earned through extraordinary seamanship or discovery.</p>
          </div>
        </article>
      `);
    }

    gridEl.innerHTML = cardsHtml.join('');
  }
}
