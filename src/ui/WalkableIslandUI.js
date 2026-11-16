/**
 * Zero-Compass On-Screen HUD & Proximity POI Popups for 3D Walkable Islands (Ra'iatea).
 *
 * Keeps the 3D island viewport open and unobstructed while walking with Arrow Keys,
 * and presents a contextual on-screen popup whenever the player arrives at a Point of Interest:
 *  - Provisioning & Canoe-Wrights' Hut (refill rations, careen hulls, speak with craftsmen, inspect cargo/crew)
 *  - Elder Metua at Sacred Marae Taputapuatea (counsel, Kura feather consecration, Song 6 unlock)
 *  - Hilltop Observation Circle & Teaching Sand (interactive SandCanvas lessons & Night-Sky Vigil)
 *  - Moored Voyaging Canoe (route chant & tide-light selection, Set Sail)
 */

import {
  CARGO_CATALOG,
  CREW_CATALOG,
  getAvailableRoutesFromCurrentIsland,
  getLearnedSandLessonsList,
  interactWithIslandSanctuary,
  performBeachCareeningAndRestock,
} from '../core/campaignManager.js';
import {
  DepartureWindow,
  Difficulty,
  departureWindowLabel,
} from '../core/gameConstants.js';
import { ISLANDS, OCEAN_BASINS } from '../data/islandsData.js';
import { getPlayerCharacterProfile } from '../data/playerCharactersData.js';
import { SONGS } from '../data/songsData.js';
import { SandCanvas } from './SandCanvas.js';

export class WalkableIslandUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;

    this.currentPoi = null;
    this.minimizedPoiId = null;
    this.craftsmanDrawerOpen = false;
    this.sandModalOpen = false;
    this.portraitModalOpen = false;
    this.selectedLessonId = null;
    this.selectedSongId = null;
    this.selectedDeparture = DepartureWindow.DAWN;
    this.lastSanctuaryResult = null;
    this.hutFeedbackText = '';

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="walkable-shore-shell">
        <!-- Minimal Top Bar: Island Hub Button & Controls Hint (Left) + Guidance Mode (Right) -->
        <header class="walkable-top-bar">
          <div class="walkable-top-left">
            <button
              class="walkable-island-btn"
              id="btnOpenIslandHub"
              type="button"
              title="Open Island Hub to inspect locations or move straight to a Point of Interest"
            >
              <span class="walkable-island-btn-icon" aria-hidden="true">🏝️</span>
              <span class="walkable-island-btn-copy">
                <span class="walkable-act-eyebrow" id="walkActEyebrow">Island · Act I · The Ra'iatea Lagoon Chain</span>
                <span class="walkable-island-title-row">
                  <strong id="walkIslandName">Ra'iatea</strong>
                  <span id="walkIslandSubtitle">Sacred High Island</span>
                </span>
              </span>
              <span class="walkable-island-btn-cta">Island Hub ▾</span>
            </button>
            <div class="walkable-controls-hint">
              Arrow Keys (or WASD) to walk · Drag view to orbit · Click island button above for quick hub
            </div>
          </div>

          <label class="hub-mode-select-wrap walkable-mode-wrap">
            <span>Guidance &amp; Wayfinder</span>
            <select id="walkDifficultySelect">
              <option value="easy">Easy · 12–14 yr Apprentice</option>
              <option value="medium">Medium · 18–20 yr Wayfinder</option>
              <option value="hard">Hard · 30 yr Navigator</option>
              <option value="master_navigator">Master Navigator · 50 yr Elder</option>
            </select>
          </label>
        </header>

        <!-- Minimized POI Re-open Pill (shown only if player minimized active POI card while standing inside it) -->
        <button class="walkable-reopen-pill hidden" id="btnReopenPoi" type="button"></button>

        <!-- Contextual On-Screen POI Popup Card -->
        <section class="walkable-poi-popup hidden" id="walkPoiPopup" aria-live="polite">
          <div class="walkable-poi-header">
            <div class="walkable-poi-heading">
              <span class="walkable-poi-glyph" id="walkPoiGlyph"></span>
              <div>
                <div class="walkable-poi-eyebrow">Point of Interest Ashore</div>
                <h3 id="walkPoiTitle"></h3>
                <p id="walkPoiSubtitle"></p>
              </div>
            </div>
            <button class="walkable-close-btn" id="btnMinimizePoi" type="button" title="Hide popup while standing here">✕</button>
          </div>

          <div class="walkable-poi-body" id="walkPoiBody"></div>
        </section>

        <!-- Toast feedback banner -->
        <div class="hud-toast" id="walkShoreToast"></div>

        <!-- Interactive Stick-in-the-Sand Teaching Modal (opened from Hilltop Observation Circle) -->
        <div class="modal-backdrop hidden" id="walkSandModal">
          <div class="walkable-sand-modal-card">
            <div class="recall-header">
              <div>
                <div class="recall-eyebrow">Navigator's Teaching Sand · Hilltop Observation Circle</div>
                <h3 id="walkSandModalTitle">Stick-in-the-Sand Diagrams</h3>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="secondary-btn small-btn" id="btnWalkRedrawSand" type="button">Redraw in Sand</button>
                <button class="secondary-btn small-btn" id="btnCloseWalkSand" type="button">Step Back to Knoll</button>
              </div>
            </div>
            <div class="walkable-sand-modal-grid">
              <div class="lesson-list" id="walkSandLessonList"></div>
              <div class="walkable-sand-canvas-col">
                <span class="sand-mentor-tag" id="walkSandMentorTag"></span>
                <canvas id="walkShoreSandCanvas" width="540" height="380"></canvas>
                <p class="sand-narration-box" id="walkSandNarration"></p>
              </div>
            </div>
          </div>
        </div>

        <!-- Full-Body Character Portrait Lightbox -->
        <div class="modal-backdrop hidden" id="walkPortraitModal">
          <div class="portrait-lightbox-card">
            <div class="portrait-lightbox-header">
              <div>
                <div class="recall-eyebrow" id="walkPortraitEyebrow">Wayfinder Encounter</div>
                <h3 id="walkPortraitName"></h3>
                <p class="portrait-lightbox-role" id="walkPortraitRole"></p>
              </div>
              <button class="secondary-btn" id="btnCloseWalkPortrait" type="button">Close</button>
            </div>
            <div class="portrait-lightbox-stage">
              <img id="walkPortraitImg" alt="" />
            </div>
          </div>
        </div>
      </div>
    `;

    this.sandCanvas = new SandCanvas(
      this.rootEl.querySelector('#walkShoreSandCanvas')
    );

    this.rootEl
      .querySelector('#btnOpenIslandHub')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.callbacks.onOpenIslandHub?.(this.currentPoi);
      });

    this.rootEl
      .querySelector('#walkDifficultySelect')
      .addEventListener('change', (e) => {
        this.callbacks.onChangeDifficulty?.(e.target.value);
        this.refresh();
      });

    this.rootEl
      .querySelector('#btnMinimizePoi')
      .addEventListener('click', () => {
        if (this.currentPoi) {
          this.minimizedPoiId = this.currentPoi.id;
          this._syncPopupVisibility();
        }
      });

    this.rootEl
      .querySelector('#btnReopenPoi')
      .addEventListener('click', () => {
        this.minimizedPoiId = null;
        this._syncPopupVisibility();
      });

    this.rootEl
      .querySelector('#btnWalkRedrawSand')
      .addEventListener('click', () => {
        this._renderSelectedSandLesson(true);
      });

    this.rootEl
      .querySelector('#btnCloseWalkSand')
      .addEventListener('click', () => {
        this.closeSandModal();
      });

    this.rootEl
      .querySelector('#walkSandModal')
      .addEventListener('click', (e) => {
        if (e.target.id === 'walkSandModal') this.closeSandModal();
      });

    this.rootEl
      .querySelector('#btnCloseWalkPortrait')
      .addEventListener('click', () => {
        this.closePortraitModal();
      });

    this.rootEl
      .querySelector('#walkPortraitModal')
      .addEventListener('click', (e) => {
        if (e.target.id === 'walkPortraitModal') this.closePortraitModal();
      });

    window.addEventListener('keydown', (e) => {
      if (this.rootEl.classList.contains('hidden')) return;
      if (e.code === 'Escape') {
        if (this.sandModalOpen) {
          this.closeSandModal();
        } else if (this.portraitModalOpen) {
          this.closePortraitModal();
        } else if (this.currentPoi && !this.minimizedPoiId) {
          this.minimizedPoiId = this.currentPoi.id;
          this._syncPopupVisibility();
        }
      }
    });
  }

  show() {
    this.lastSanctuaryResult = null;
    this.hutFeedbackText = '';
    this.craftsmanDrawerOpen = false;
    this.minimizedPoiId = null;
    this.closeSandModal();
    this.closePortraitModal();
    this.rootEl.classList.remove('hidden');
    this.refresh();
  }

  hide() {
    this.sandCanvas.stopAnimation();
    this.sandModalOpen = false;
    this.portraitModalOpen = false;
    this.currentPoi = null;
    this.rootEl.classList.add('hidden');
  }

  isBlockingMovement() {
    return this.sandModalOpen || this.portraitModalOpen;
  }

  showToast(message) {
    const el = this.rootEl.querySelector('#walkShoreToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('visible');
    }, 3600);
  }

  /**
   * Temporarily hides or restores the walkable HUD while the closeable Island Hub is open
   * without resetting currentPoi state.
   */
  setSuspendedForHub(suspended) {
    if (suspended) {
      this.closeSandModal();
      this.closePortraitModal();
      this.rootEl.classList.add('hidden');
    } else {
      this.rootEl.classList.remove('hidden');
      this.refresh();
      this._syncPopupVisibility();
    }
  }

  /**
   * Syncs active POI immediately when the player clicks a location inside the Island Hub.
   */
  selectPoiFromHub(poi) {
    this.currentPoi = poi || null;
    this.minimizedPoiId = null;
    this.craftsmanDrawerOpen = false;
    this.hutFeedbackText = '';
    this._renderCurrentPoiPopup();
    this._syncPopupVisibility();
  }

  /**
   * Called each frame by KavengaApp with the POI the player is currently standing inside (or null).
   */
  updateActivePoi(poi) {
    const prevId = this.currentPoi?.id || null;
    const nextId = poi?.id || null;
    if (prevId === nextId) return;

    this.currentPoi = poi || null;
    if (nextId !== this.minimizedPoiId) {
      this.minimizedPoiId = null;
    }
    this.craftsmanDrawerOpen = false;
    this.hutFeedbackText = '';
    this._renderCurrentPoiPopup();
    this._syncPopupVisibility();
  }

  _syncPopupVisibility() {
    const popupEl = this.rootEl.querySelector('#walkPoiPopup');
    const reopenEl = this.rootEl.querySelector('#btnReopenPoi');
    if (!this.currentPoi) {
      popupEl.classList.add('hidden');
      reopenEl.classList.add('hidden');
      return;
    }

    if (this.minimizedPoiId === this.currentPoi.id) {
      popupEl.classList.add('hidden');
      reopenEl.classList.remove('hidden');
      reopenEl.textContent = `${this.currentPoi.glyph} ${this.currentPoi.promptHint}`;
    } else {
      reopenEl.classList.add('hidden');
      popupEl.classList.remove('hidden');
    }
  }

  refresh() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;
    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;
    const basin = OCEAN_BASINS[isl.basinId];

    this.rootEl.querySelector('#walkActEyebrow').textContent =
      `Island · Act ${isl.act} · ${basin?.name || ''}`;
    this.rootEl.querySelector('#walkIslandName').textContent = isl.name;
    this.rootEl.querySelector('#walkIslandSubtitle').textContent = isl.subtitle;

    const diffSelect = this.rootEl.querySelector('#walkDifficultySelect');
    const masterOpt = diffSelect.querySelector('option[value="master_navigator"]');
    if (masterOpt) {
      masterOpt.disabled =
        !gs.masterReplayUnlocked && gs.difficulty !== Difficulty.MASTER_NAVIGATOR;
      masterOpt.textContent = gs.masterReplayUnlocked
        ? 'Master Navigator · 50 yr Elder'
        : 'Master Navigator · 50 yr Elder (Unlock at Finale)';
    }
    diffSelect.value = gs.difficulty;

    if (this.currentPoi) {
      this._renderCurrentPoiPopup();
    }
  }

  _describeCondition(val) {
    return val >= 99
      ? 'Consecrated & Sound'
      : val >= 75
        ? 'Seaworthy'
        : val >= 55
          ? 'Weathered'
          : 'Worn — Careen Ashore';
  }

  _renderCurrentPoiPopup() {
    const poi = this.currentPoi;
    if (!poi) return;

    this.rootEl.querySelector('#walkPoiGlyph').textContent = poi.glyph;
    this.rootEl.querySelector('#walkPoiTitle').textContent = poi.title;
    this.rootEl.querySelector('#walkPoiSubtitle').textContent = poi.subtitle;

    const bodyEl = this.rootEl.querySelector('#walkPoiBody');
    bodyEl.innerHTML = '';

    if (poi.kind === 'hut') {
      this._renderProvisioningHutBody(bodyEl);
    } else if (poi.kind === 'elder') {
      this._renderElderMaraeBody(bodyEl);
    } else if (poi.kind === 'circle') {
      this._renderObservationCircleBody(bodyEl);
    } else if (poi.kind === 'canoe') {
      this._renderCanoeLandingBody(bodyEl);
    }
  }

  // -------------------------------------------------------------------------
  // POI 1: Provisioning & Canoe-Wrights' Hut (Refill/Restock, Talk to Craftsmen)
  // -------------------------------------------------------------------------
  _renderProvisioningHutBody(bodyEl) {
    const gs = this.callbacks.getGameState();
    const playerProfile = getPlayerCharacterProfile(gs.difficulty);
    const sailLabel = gs.vakaTier >= 3 ? 'Twin Pandanus Sails' : 'Pandanus Sail';

    const cargoHtml =
      gs.cargoItems.length === 0
        ? '<div class="empty-note">No trade gifts currently lashed on deck.</div>'
        : gs.cargoItems
            .map((cid) => {
              const item = CARGO_CATALOG[cid] || { name: cid, description: '' };
              return `<div class="cargo-pill"><strong>📦 ${item.name}</strong><span>${item.description}</span></div>`;
            })
            .join('');

    const crewHtml =
      gs.assignedCrew.length === 0
        ? '<div class="empty-note">Sailing with your starter paddler (specialist crewmates join across the lagoon islands).</div>'
        : gs.assignedCrew
            .map((crId) => {
              const cr = CREW_CATALOG[crId];
              return cr
                ? `<div class="cargo-pill"><strong>🛶 ${cr.name} · ${cr.role}</strong><span>${cr.traitText}</span></div>`
                : '';
            })
            .join('');

    bodyEl.innerHTML = `
      <div class="walkable-cond-strip">
        <div class="cond-chip"><span>Twin Hulls</span><strong>${this._describeCondition(gs.hullCondition)}</strong></div>
        <div class="cond-chip"><span>${sailLabel}</span><strong>${this._describeCondition(gs.sailCondition)}</strong></div>
        <div class="cond-chip"><span>Sennit Lashings</span><strong>${this._describeCondition(gs.lashingsCondition)}</strong></div>
      </div>

      <div class="walkable-ration-row">
        <div>
          <strong>Woven Ration Baskets: ${Math.floor(gs.loadedRations)}</strong>
          <span class="walkable-slot-sub">(${gs.getUsedCargoSlots()} / ${gs.maxCargoSlots} Deck Slots Lashed)</span>
        </div>
        <div class="ration-step-btns">
          <button class="secondary-btn small-btn" id="btnWalkRationMinus" type="button">−</button>
          <button class="secondary-btn small-btn" id="btnWalkRationPlus" type="button">+</button>
        </div>
      </div>

      <div class="walkable-action-row">
        <button class="primary-btn" id="btnWalkCareenRestock" type="button">
          🛖 Careen Canoe &amp; Refill Ration Baskets
        </button>
        <button class="secondary-btn" id="btnWalkTalkCraftsmen" type="button">
          ${this.craftsmanDrawerOpen ? 'Hide Craftsmen &amp; Manifest' : 'Speak with Craftsmen &amp; Inspect Load'}
        </button>
      </div>

      ${
        this.hutFeedbackText
          ? `<div class="walkable-feedback-note">${this.hutFeedbackText}</div>`
          : ''
      }

      ${
        this.craftsmanDrawerOpen
          ? `
        <div class="walkable-craftsman-drawer">
          <p class="walkable-craftsman-quote">
            <strong>Master Boatbuilder Tahu'a:</strong> "We keep fresh breadfruit paste, husked coconuts, and sweet water gourds ready beneath the thatch. Before a long crossing, let us tighten your crossbeam sennit and caulk both hulls."
          </p>
          <div class="cargo-pill">
            <strong>At the Helm · ${playerProfile.title} (${playerProfile.ageLabel})</strong>
            <span>${playerProfile.attireSummary}</span>
          </div>
          <div class="walkable-manifest-cols">
            <div>
              <div class="walkable-mini-heading">Trade Gifts Lashed</div>
              ${cargoHtml}
            </div>
            <div>
              <div class="walkable-mini-heading">Voyaging Crew</div>
              ${crewHtml}
            </div>
          </div>
        </div>
      `
          : ''
      }
    `;

    bodyEl.querySelector('#btnWalkRationMinus').addEventListener('click', () => {
      gs.setLoadedRations(gs.loadedRations - 1);
      gs.saveToLocalStorage();
      this._renderCurrentPoiPopup();
    });

    bodyEl.querySelector('#btnWalkRationPlus').addEventListener('click', () => {
      gs.setLoadedRations(gs.loadedRations + 1);
      gs.saveToLocalStorage();
      this._renderCurrentPoiPopup();
    });

    bodyEl.querySelector('#btnWalkCareenRestock').addEventListener('click', () => {
      const msg = performBeachCareeningAndRestock(gs);
      this.hutFeedbackText = msg;
      this.showToast('Canoe careened & woven ration baskets refilled!');
      this._renderCurrentPoiPopup();
    });

    bodyEl.querySelector('#btnWalkTalkCraftsmen').addEventListener('click', () => {
      this.craftsmanDrawerOpen = !this.craftsmanDrawerOpen;
      this._renderCurrentPoiPopup();
    });
  }

  // -------------------------------------------------------------------------
  // POI 2: Elder Metua at Marae Taputapuatea
  // -------------------------------------------------------------------------
  _renderElderMaraeBody(bodyEl) {
    const gs = this.callbacks.getGameState();
    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;
    const hasKuraFeathers = gs.hasCargoItem('red_kura_feathers');

    const res = this.lastSanctuaryResult || {
      title: `${isl.mentorName} Awaits Before the Sacred Ahu`,
      speech: hasKuraFeathers
        ? 'Elder Metua sees the sacred crimson Kura feathers gleaming in your cargo! Present them at the Marae to consecrate your vaka and learn the outer-pass chant to Maupiti.'
        : 'Step before the coral altar to receive Elder Metua’s star-path blessing and guidance for your lagoon crossings.',
      rewardsList: [],
    };

    const actionLabel =
      hasKuraFeathers && !gs.completedQuests.raiatea_consecration
        ? '🌺 Present Crimson Kura Feathers & Consecrate Vaka'
        : this.lastSanctuaryResult
          ? `Speak Again with ${isl.mentorName}`
          : `Speak with ${isl.mentorName}`;

    bodyEl.innerHTML = `
      <div class="walkable-elder-layout">
        <button class="walkable-elder-thumb-btn" id="btnWalkElderPortrait" type="button" title="Inspect full-body portrait">
          <img src="${isl.mentorPortrait}" alt="${isl.mentorName}" />
        </button>
        <div class="walkable-elder-copy">
          <div class="walkable-elder-name">${res.title}</div>
          <div class="walkable-elder-role">${isl.mentorRole}</div>
          <p class="walkable-elder-speech">${res.speech}</p>
          ${
            res.rewardsList?.length
              ? `<ul class="walkable-rewards-list">${res.rewardsList
                  .map((r) => `<li>✦ ${r}</li>`)
                  .join('')}</ul>`
              : ''
          }
          <div class="walkable-action-row">
            <button class="primary-btn" id="btnWalkSpeakElder" type="button">${actionLabel}</button>
          </div>
        </div>
      </div>
      ${
        gs.masterReplayUnlocked
          ? `<div class="walkable-replay-strip" id="walkMasterReplayStrip">
               <div class="walkable-mini-heading">Master Navigator Anthology (Replay Any Crossing)</div>
               <div class="walkable-replay-btns" id="walkMasterReplayBtns"></div>
             </div>`
          : ''
      }
    `;

    bodyEl.querySelector('#btnWalkElderPortrait').addEventListener('click', () => {
      this.openPortraitModal({
        eyebrow: 'Marae Taputapuatea · Sacred Headland',
        name: isl.mentorName,
        role: `${isl.mentorRole} · ${isl.name}`,
        src: isl.mentorPortrait,
      });
    });

    bodyEl.querySelector('#btnWalkSpeakElder').addEventListener('click', () => {
      this.lastSanctuaryResult = interactWithIslandSanctuary(gs);
      if (this.lastSanctuaryResult?.rewardsList?.length) {
        this.showToast(this.lastSanctuaryResult.rewardsList[0]);
      }
      this._renderCurrentPoiPopup();
    });

    if (gs.masterReplayUnlocked) {
      const stripEl = bodyEl.querySelector('#walkMasterReplayBtns');
      for (const song of Object.values(SONGS)) {
        if (song.number === '14R') continue;
        const b = document.createElement('button');
        b.className = 'secondary-btn small-btn';
        b.type = 'button';
        b.textContent = `Song ${song.number}: ${ISLANDS[song.toIsland]?.name || song.title}`;
        b.addEventListener('click', () => {
          this.callbacks.onLaunchVoyage?.(song, song.recommendedDeparture);
        });
        stripEl.appendChild(b);
      }
    }
  }

  // -------------------------------------------------------------------------
  // POI 3: Hilltop Observation Circle & Teaching Sand
  // -------------------------------------------------------------------------
  _renderObservationCircleBody(bodyEl) {
    const gs = this.callbacks.getGameState();
    const lessons = getLearnedSandLessonsList(gs);
    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;

    bodyEl.innerHTML = `
      <p class="walkable-circle-desc">
        From this breezy basalt stone ring overlooking the reef pass, wayfinders trace wave, cloud, and wake lessons in swept coral sand — or watch the constellations wheel overhead in stillness.
      </p>
      <div class="walkable-lesson-pills">
        ${lessons
          .slice(0, 4)
          .map(
            (l) => `<span class="stat-pill">🐚 ${l.title}</span>`
          )
          .join('')}
        ${lessons.length > 4 ? `<span class="stat-pill">+${lessons.length - 4} more</span>` : ''}
      </div>
      <div class="walkable-action-row">
        <button class="primary-btn" id="btnWalkOpenSand" type="button">
          🐚 Trace Stick-in-the-Sand Diagrams (${lessons.length})
        </button>
        <button class="secondary-btn" id="btnWalkEnterVigil" type="button">
          ✨ Enter Night-Sky Star-Stone Vigil
        </button>
      </div>
    `;

    bodyEl.querySelector('#btnWalkOpenSand').addEventListener('click', () => {
      this.openSandModal();
    });

    bodyEl.querySelector('#btnWalkEnterVigil').addEventListener('click', () => {
      const masterId = isl.starMasterId || (isl.latDeg > 0 ? 'akura' : 'terai');
      this.callbacks.onOpenSkyVigil?.({
        masterId,
        islandId: isl.id,
        mode: 'lessons',
      });
    });
  }

  // -------------------------------------------------------------------------
  // POI 4: Moored Voyaging Canoe (Route Chant, Tide-Light & Set Sail)
  // -------------------------------------------------------------------------
  _renderCanoeLandingBody(bodyEl) {
    const gs = this.callbacks.getGameState();
    const routes = getAvailableRoutesFromCurrentIsland(gs);

    if (!routes.length) {
      bodyEl.innerHTML = `
        <div class="empty-note">
          Walk over to Elder Metua on Sacred Marae Taputapuatea to learn your next star-path chant before launching.
        </div>
      `;
      return;
    }

    if (
      !this.selectedSongId ||
      !routes.some((r) => r.song.id === this.selectedSongId)
    ) {
      this.selectedSongId = routes[0].song.id;
      this.selectedDeparture = routes[0].song.recommendedDeparture;
    }

    const activeRoute =
      routes.find((r) => r.song.id === this.selectedSongId) || routes[0];
    const activeSong = activeRoute.song;
    const v1 = activeSong.verses[0];
    const warnMismatch =
      this.selectedDeparture !== activeSong.recommendedDeparture
        ? `<div class="dep-warning">Note: This chant expects ${departureWindowLabel(activeSong.recommendedDeparture)} skies; launching at ${departureWindowLabel(this.selectedDeparture)} shifts sun and stars out of phase!</div>`
        : '';

    bodyEl.innerHTML = `
      <div class="walkable-canoe-summary">
        <span>🛶 <strong>${Math.floor(gs.loadedRations)}</strong> Ration Baskets Aboard</span>
        <span>·</span>
        <span>Hulls: <strong>${this._describeCondition(gs.hullCondition)}</strong></span>
        <span>·</span>
        <span>Sail: <strong>${this._describeCondition(gs.sailCondition)}</strong></span>
      </div>

      <div class="walkable-route-choices" id="walkRouteList"></div>

      <div class="walkable-dep-row">
        <span class="walkable-dep-label">
          Tide-Light: <em>(Recommended: ${departureWindowLabel(activeSong.recommendedDeparture)})</em>
        </span>
        <div class="departure-grid walkable-dep-grid" id="walkDepGrid">
          <button class="dep-btn" data-window="dawn" type="button">🌅 Dawn</button>
          <button class="dep-btn" data-window="midday" type="button">☀️ Midday</button>
          <button class="dep-btn" data-window="dusk" type="button">🌇 Dusk</button>
          <button class="dep-btn" data-window="midnight" type="button">🌌 Midnight</button>
        </div>
      </div>

      <div class="song-preview-box walkable-verse-preview">
        <div class="preview-eyebrow">Opening Verse Memorized Ashore</div>
        <blockquote>"${v1.lyrics}"</blockquote>
        ${gs.difficulty === Difficulty.EASY ? `<div class="preview-easy-cue">${v1.easyCueText}</div>` : ''}
        ${warnMismatch}
      </div>

      <div class="walkable-action-row">
        <button class="primary-btn launch-btn" id="btnWalkSetSail" type="button">
          ⛵ Set Sail on the Star Path → ${ISLANDS[activeSong.toIsland]?.name || activeSong.toIsland}
        </button>
      </div>
    `;

    const routeListEl = bodyEl.querySelector('#walkRouteList');
    for (const { song, isReturn } of routes) {
      const dst = ISLANDS[song.toIsland];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `route-choice-btn ${song.id === this.selectedSongId ? 'selected' : ''}`;
      btn.innerHTML = `
        <div class="route-choice-top">
          <strong>${isReturn && song.number === 'R' ? song.title : `Song ${song.number}: ${song.title}`}</strong>
          <span class="route-target-tag">→ ${dst?.name || song.toIsland}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.selectedSongId = song.id;
        this.selectedDeparture = song.recommendedDeparture;
        this._renderCurrentPoiPopup();
      });
      routeListEl.appendChild(btn);
    }

    bodyEl.querySelectorAll('.dep-btn').forEach((btn) => {
      const w = btn.getAttribute('data-window');
      btn.classList.toggle('selected', w === this.selectedDeparture);
      btn.classList.toggle('recommended', w === activeSong.recommendedDeparture);
      btn.addEventListener('click', () => {
        this.selectedDeparture = w;
        this._renderCurrentPoiPopup();
      });
    });

    bodyEl.querySelector('#btnWalkSetSail').addEventListener('click', () => {
      this.callbacks.onLaunchVoyage?.(activeSong, this.selectedDeparture);
    });
  }

  // -------------------------------------------------------------------------
  // Sand Diagrams & Portrait Modals
  // -------------------------------------------------------------------------
  openSandModal() {
    const gs = this.callbacks.getGameState();
    const lessons = getLearnedSandLessonsList(gs);
    if (!lessons.length) return;

    if (
      !this.selectedLessonId ||
      !lessons.some((l) => l.id === this.selectedLessonId)
    ) {
      this.selectedLessonId = lessons[0].id;
    }

    this.sandModalOpen = true;
    this.rootEl.querySelector('#walkSandModal').classList.remove('hidden');
    this._populateSandModalList();
    this._renderSelectedSandLesson(true);
  }

  closeSandModal() {
    this.sandModalOpen = false;
    this.sandCanvas?.stopAnimation();
    this.rootEl.querySelector('#walkSandModal')?.classList.add('hidden');
  }

  _populateSandModalList() {
    const gs = this.callbacks.getGameState();
    const lessons = getLearnedSandLessonsList(gs);
    const listEl = this.rootEl.querySelector('#walkSandLessonList');
    listEl.innerHTML = '';

    for (const les of lessons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `lesson-choice-btn ${les.id === this.selectedLessonId ? 'selected' : ''}`;
      btn.innerHTML = `<strong>${les.title}</strong><span>Taught by ${les.mentor}</span>`;
      btn.addEventListener('click', () => {
        this.selectedLessonId = les.id;
        this._populateSandModalList();
        this._renderSelectedSandLesson(true);
      });
      listEl.appendChild(btn);
    }
  }

  _renderSelectedSandLesson(animate) {
    const gs = this.callbacks.getGameState();
    const lessons = getLearnedSandLessonsList(gs);
    const les =
      lessons.find((l) => l.id === this.selectedLessonId) || lessons[0];
    if (!les) return;

    this.rootEl.querySelector('#walkSandModalTitle').textContent = les.title;
    this.rootEl.querySelector('#walkSandMentorTag').textContent =
      `Mentor: ${les.mentor}`;
    this.rootEl.querySelector('#walkSandNarration').textContent = les.narration;
    this.sandCanvas.renderLesson(les, { animate });
  }

  openPortraitModal({ eyebrow, name, role, src }) {
    this.portraitModalOpen = true;
    this.rootEl.querySelector('#walkPortraitEyebrow').textContent = eyebrow || '';
    this.rootEl.querySelector('#walkPortraitName').textContent = name || '';
    this.rootEl.querySelector('#walkPortraitRole').textContent = role || '';
    const img = this.rootEl.querySelector('#walkPortraitImg');
    img.src = src;
    img.alt = name || '';
    this.rootEl.querySelector('#walkPortraitModal').classList.remove('hidden');
  }

  closePortraitModal() {
    this.portraitModalOpen = false;
    this.rootEl.querySelector('#walkPortraitModal')?.classList.add('hidden');
  }
}
