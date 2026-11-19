/**
 * First-Time Shore Onboarding Tour for Kavenga: Songs of the Star Path.
 *
 * Presents a lightweight, unobtrusive 4-step floating coachmark tour on the
 * player's very first arrival on Ra'iatea (after the initial objective toast
 * finishes and the objective appears in the Objectives pane).
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

export const ONBOARDING_STORAGE_KEY = 'kavenga_onboarding_done_v1';
export const SAILING_ONBOARDING_STORAGE_KEY = 'kavenga_sailing_onboarding_done_v1';

export function clearOnboardingDone() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem(SAILING_ONBOARDING_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

const TOUR_STEPS = Object.freeze([
  {
    selector: null,
    title: 'Welcome to Kavenga!',
    body: "Your adventure starts in the island of Ra'iatea. Let's look around and see what you can do.",
    preferSide: 'center',
  },
  {
    selector: '.hub-poi-tabs',
    title: 'Island Places',
    body: 'Check out places you could visit on this island.',
    preferSide: 'left',
  },
  {
    selector: '#hubCriticalCtaBar',
    title: 'Next Step',
    body: 'Not sure what to do next? This button always guides you to the next key step.',
    preferSide: 'left',
  },
  {
    selector: '#btnShoreWalkToggle',
    title: 'Walk Shore',
    body: 'Explore the island on foot.',
    preferSide: 'top',
  },
  {
    selector: '#hubObjectivesCard',
    title: 'Objectives',
    body: 'Track your objectives here.',
    preferSide: 'bottom',
  },
]);

export const SAILING_TOUR_STEPS = Object.freeze([
  {
    selector: null,
    title: 'Into the Open Sea',
    body: 'Welcome aboard! Navigate by sun, stars, clouds, birds, and swells—with zero maps or compasses.',
    preferSide: 'center',
  },
  {
    selector: '#hudChantBanner',
    title: 'Route Chant',
    body: "Follow your navigator's chant and cues here as each leg of the voyage unfolds.",
    preferSide: 'bottom',
  },
  {
    selector: '.hud-trim-bar',
    title: 'Steering the Vaka',
    body: 'Use A / D, Arrow keys, or these buttons to turn the steering sweep and lock your course.',
    preferSide: 'top',
  },
  {
    selector: '#btnCameraView',
    title: 'Views & Gaze',
    body: 'Toggle Canoe / Deck View (V), drag to look around, or press X (astern) and Z (mast-top).',
    preferSide: 'bottom',
  },
  {
    selector: '#btnFastForward',
    title: 'Fast Wind',
    body: 'Press F or click Fast Wind to speed up sailing once your course is set.',
    preferSide: 'bottom',
  },
  {
    selector: '#btnRecall',
    title: 'Sand Recall',
    body: 'Press R or click Recall anytime to review the shore sand lesson.',
    preferSide: 'bottom',
  },
]);

export class OnboardingTourUI {
  constructor(
    rootEl,
    {
      steps = TOUR_STEPS,
      storageKey = ONBOARDING_STORAGE_KEY,
      ariaLabel = 'Interface Tour',
      hideHubOnStepZero = true,
    } = {}
  ) {
    this.rootEl = rootEl;
    this.steps = steps;
    this.storageKey = storageKey;
    this.ariaLabel = ariaLabel;
    this.hideHubOnStepZero = Boolean(hideHubOnStepZero);
    this.open = false;
    this.stepIndex = 0;
    this._highlightedEl = null;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="onboarding-tour-layer" id="onboardingTourLayer" role="dialog" aria-live="polite" aria-label="${this.ariaLabel}">
        <div class="onboarding-spotlight" id="onboardingSpotlight" aria-hidden="true"></div>
        <div class="onboarding-card" id="onboardingTourCard">
          <div class="onboarding-card-head">
            <h4 class="onboarding-card-title" id="onboardingTitle"></h4>
            <button class="onboarding-skip-btn" id="btnOnboardingSkip" type="button" title="Skip Tour (Esc)">Skip</button>
          </div>
          <p class="onboarding-card-body" id="onboardingBody"></p>
          <div class="onboarding-card-foot">
            <div class="onboarding-dots" id="onboardingDots" aria-hidden="true"></div>
            <div class="onboarding-actions">
              <button class="secondary-btn small-btn" id="btnOnboardingBack" type="button">Back</button>
              <button class="primary-btn small-btn" id="btnOnboardingNext" type="button">Next</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.rootEl
      .querySelector('#btnOnboardingSkip')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.finish();
      });

    this.rootEl
      .querySelector('#btnOnboardingBack')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        if (this.stepIndex > 0) {
          this.stepIndex -= 1;
          this._renderStep();
        }
      });

    this.rootEl
      .querySelector('#btnOnboardingNext')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        if (this.stepIndex + 1 < this.steps.length) {
          this.stepIndex += 1;
          this._renderStep();
        } else {
          this.finish();
        }
      });

    window.addEventListener('resize', () => {
      if (this.open) this._positionCard();
    });

    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || e.code !== 'Escape') return;
        e.stopImmediatePropagation();
        this.finish();
      },
      true
    );
  }

  hasCompleted() {
    try {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem(this.storageKey) === '1';
    } catch {
      return false;
    }
  }

  _markCompleted() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, '1');
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  startIfFirstTime() {
    if (this.hasCompleted()) return false;
    this.stepIndex = 0;
    this.open = true;
    this.rootEl.classList.remove('hidden');
    this._renderStep();
    return true;
  }

  finish() {
    this._markCompleted();
    this.hide();
  }

  hide() {
    this.open = false;
    this._syncHubVisibility();
    this._syncHubVisibility();
    this._clearHighlight();
    this.rootEl.classList.add('hidden');
  }

  _syncHubVisibility() {
    if (!this.hideHubOnStepZero) return;
    const hubShell = document.querySelector('.island-hub-shell');
    if (!hubShell) return;
    const shouldHide = this.open && this.stepIndex < 1;
    hubShell.classList.toggle('hidden', shouldHide);
  }

  _clearHighlight() {
    if (this._highlightedEl) {
      this._highlightedEl.classList.remove('onboarding-highlight');
      this._highlightedEl = null;
    }
  }

  _renderStep() {
    const step = this.steps[this.stepIndex];
    if (!step) {
      this.finish();
      return;
    }

    this.rootEl.querySelector('#onboardingTitle').textContent = step.title;
    this.rootEl.querySelector('#onboardingBody').textContent = step.body;

    const backBtn = this.rootEl.querySelector('#btnOnboardingBack');
    const nextBtn = this.rootEl.querySelector('#btnOnboardingNext');
    backBtn.classList.toggle('hidden', this.stepIndex === 0);
    nextBtn.textContent =
      this.stepIndex + 1 >= this.steps.length ? 'Got It' : 'Next';

    const dotsEl = this.rootEl.querySelector('#onboardingDots');
    dotsEl.innerHTML = '';
    for (let i = 0; i < this.steps.length; i += 1) {
      const dot = document.createElement('span');
      dot.className = `onboarding-dot${i === this.stepIndex ? ' active' : i < this.stepIndex ? ' done' : ''}`;
      dotsEl.appendChild(dot);
    }

    this._syncHubVisibility();
    this._clearHighlight();
    const target = step.selector ? document.querySelector(step.selector) : null;
    if (target) {
      target.classList.add('onboarding-highlight');
      this._highlightedEl = target;
    }

    this._positionCard();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (this.open) this._positionCard();
      });
    }
  }

  _positionCard() {
    const card = this.rootEl.querySelector('#onboardingTourCard');
    const spotlight = this.rootEl.querySelector('#onboardingSpotlight');
    const step = this.steps[this.stepIndex];
    if (!card || !step) return;

    const target = step.selector ? document.querySelector(step.selector) : null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 14;
    const cw = card.offsetWidth || 300;
    const ch = card.offsetHeight || 130;

    if (!target || target.classList.contains('hidden')) {
      if (spotlight) {
        spotlight.classList.add('no-target');
        spotlight.style.left = '-20px';
        spotlight.style.top = '-20px';
        spotlight.style.width = '0px';
        spotlight.style.height = '0px';
      }
      card.style.left = `${Math.round(Math.max(margin, (vw - cw) * 0.5))}px`;
      card.style.top = `${Math.round(
        step.preferSide === 'center'
          ? Math.max(margin, (vh - ch) * 0.5)
          : Math.max(margin, vh - ch - 24)
      )}px`;
      return;
    }

    const rect = target.getBoundingClientRect();
    if (spotlight) {
      spotlight.classList.remove('no-target');
      const pad = 6;
      spotlight.style.left = `${Math.round(rect.left - pad)}px`;
      spotlight.style.top = `${Math.round(rect.top - pad)}px`;
      spotlight.style.width = `${Math.round(rect.width + pad * 2)}px`;
      spotlight.style.height = `${Math.round(rect.height + pad * 2)}px`;
    }

    let left = rect.left;
    let top = rect.bottom + margin;

    if (step.preferSide === 'left' && rect.left - cw - margin >= margin) {
      left = rect.left - cw - margin;
      top = rect.top + Math.max(0, (rect.height - ch) * 0.5);
    } else if (step.preferSide === 'top' && rect.top - ch - margin >= margin) {
      left = rect.left;
      top = rect.top - ch - margin;
    } else if (rect.bottom + ch + margin <= vh - margin) {
      left = Math.min(rect.right - cw, rect.left);
      if (left < margin) left = rect.left;
      top = rect.bottom + margin;
    } else if (rect.top - ch - margin >= margin) {
      left = rect.left;
      top = rect.top - ch - margin;
    } else {
      left = Math.max(margin, rect.left - cw - margin);
      top = Math.max(margin, rect.top);
    }

    left = Math.max(margin, Math.min(vw - cw - margin, left));
    top = Math.max(margin, Math.min(vh - ch - margin, top));

    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }
}
