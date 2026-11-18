/**
 * Unified 4-Station Shore Diorama UI for Kavenga: Songs of the Star Path.
 *
 * Pairs a clean right-docked 4-station shore panel with an unobstructed 3D view of the
 * canonical island & moored voyaging canoe (`ShoreDioramaRenderer`) on the left:
 *   1. `sanctuary` — 🌺 Elder & Marae / Wild Shore (mentor encounter, quest gifts, crew & route chants)
 *   2. `sand`      — 🐚 Sand Diagrams (interactive Stick-in-the-Sand wave, cloud, wake & post lessons)
 *   3. `vigil`     — ✨ Sky Vigil (elder-guided constellation teaching & Star-Stone Night Observatory)
 *   4. `landing`   — 🛶 Set Sail (canoe careening, ration baskets, crew/cargo, tide-light & launch)
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import {
  DepartureWindow,
  Difficulty,
  departureWindowLabel,
} from '../core/gameConstants.js';
import {
  CARGO_CATALOG,
  CREW_CATALOG,
  POI_LABELS,
  getAvailableRoutesFromCurrentIsland,
  getLearnedSandLessonsList,
  interactWithIslandSanctuary,
  performBeachCareeningAndRestock,
} from '../core/campaignManager.js';
import { getActiveObjectivesForDisplay } from '../core/objectivesManager.js';
import {
  CONSTELLATION_LESSONS,
  getAvailableConstellationLessonForIsland,
  getAvailableUnlearnedLessonForIsland,
} from '../data/constellationLessonsData.js';
import { ISLANDS, OCEAN_BASINS } from '../data/islandsData.js';
import { getPlayerCharacterProfile } from '../data/playerCharactersData.js';
import { SONGS } from '../data/songsData.js';
import { SandCanvas } from './SandCanvas.js';

const TOTAL_SKY_TEACHINGS = Object.keys(CONSTELLATION_LESSONS).length;

export class IslandHubUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;

    this.activeTab = 'sanctuary';
    this.selectedSongId = null;
    this.selectedDeparture = DepartureWindow.DAWN;
    this.selectedLessonId = null;
    this.lastSanctuaryResult = null;
    this._currentIslandSessionId = null;
    this._seenSandLessons = new Set();
    this._recentlyClearedObjectives = [];
    this.objectivesCollapsed = false;
    this.orbitCustomized = false;
    this._lightboxMentor = null;
    this._userPickedRoute = false;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="shore-stage-layout">
        <!-- LEFT VIEWPORT OVERLAY: Collapsible Ashore Objectives + Camera Orbit Hint -->
        <div class="shore-viewport-overlay">
          <section class="shore-objectives-card hidden" id="hubObjectivesCard" aria-live="polite">
            <button class="shore-objectives-header" id="btnToggleHubObjectives" type="button">
              <span class="shore-objectives-heading" id="hubObjectivesHeading">✦ Objectives Ashore</span>
              <span class="shore-objectives-chevron" id="hubObjectivesChevron">▾</span>
            </button>
            <div class="shore-objectives-list" id="hubObjectivesList"></div>
          </section>

          <div class="shore-orbit-bar">
            <span class="shore-orbit-hint">Drag island or lagoon to orbit · Scroll to zoom</span>
            <button
              class="secondary-btn small-btn shore-reset-orbit-btn hidden"
              id="btnResetShoreOrbit"
              type="button"
              title="Smoothly glide camera back to station framing"
            >
              ⟳ Reset View
            </button>
          </div>
        </div>

        <!-- RIGHT-DOCKED 4-STATION SHORE PANEL -->
        <aside class="island-hub-shell" aria-label="Island Shore Stations">
          <header class="hub-header">
            <div class="hub-header-top-row">
              <div class="hub-act-badge" id="hubActBadge"></div>
            </div>
            <div class="hub-title-row">
              <h1 class="hub-island-name" id="hubIslandName"></h1>
              <p class="hub-island-sub" id="hubIslandSubtitle"></p>
            </div>
          </header>

          <!-- 4 CLEAR, DISTINCT SHORE STATIONS WITH LIVE STATUS BADGES -->
          <nav class="hub-poi-tabs" role="tablist" aria-label="Shore Preparation Stations">
            <button class="poi-tab-btn active" data-tab="sanctuary" id="tabBtnSanctuary" role="tab" type="button">
              <span class="station-tab-main">
                <span class="station-tab-glyph" id="tabGlyphSanctuary">🌺</span>
                <span class="station-tab-label" id="tabLabelSanctuary">Elder</span>
              </span>
              <span class="station-badge hidden" id="badgeSanctuary"></span>
            </button>

            <button class="poi-tab-btn" data-tab="sand" id="tabBtnSand" role="tab" type="button">
              <span class="station-tab-main">
                <span class="station-tab-glyph">🐚</span>
                <span class="station-tab-label">Sand</span>
              </span>
              <span class="station-badge hidden" id="badgeSand"></span>
            </button>

            <button class="poi-tab-btn" data-tab="vigil" id="tabBtnVigil" role="tab" type="button">
              <span class="station-tab-main">
                <span class="station-tab-glyph">✨</span>
                <span class="station-tab-label">Sky Vigil</span>
              </span>
              <span class="station-badge hidden" id="badgeVigil"></span>
            </button>

            <button class="poi-tab-btn" data-tab="landing" id="tabBtnLanding" role="tab" type="button">
              <span class="station-tab-main">
                <span class="station-tab-glyph">🛶</span>
                <span class="station-tab-label">Set Sail</span>
              </span>
              <span class="station-badge hidden" id="badgeLanding"></span>
            </button>
          </nav>

          <main class="hub-content">
            <!-- STATION 1: ELDER & MARAE / WILD SHORE -->
            <section class="hub-panel" id="panelSanctuary" role="tabpanel">
              <div class="hub-card sanctuary-card" id="sanctuaryCard">
                <div class="sanctuary-encounter-layout" id="sanctuaryEncounterLayout">
                  <aside class="mentor-portrait-panel" id="sanctuaryPortraitPanel">
                    <button class="mentor-portrait-frame" id="btnEnlargeSanctuaryPortrait" type="button" title="Click to inspect full-body portrait">
                      <img class="mentor-fullbody-img" id="sanctuaryMentorImg" alt="" />
                    </button>
                    <div class="mentor-portrait-caption">
                      <strong id="sanctuaryMentorName"></strong>
                      <span id="sanctuaryMentorRole"></span>
                    </div>
                  </aside>

                  <div class="sanctuary-dialogue-col">
                    <div class="sanctuary-eyebrow" id="sanctuaryPoiLabel"></div>
                    <h2 id="sanctuaryTitle"></h2>
                    <p class="sanctuary-speech" id="sanctuarySpeech"></p>
                    <ul class="sanctuary-rewards" id="sanctuaryRewards"></ul>
                  </div>
                </div>

                <div class="sanctuary-actions" id="sanctuaryActions">
                  <button class="secondary-btn" id="btnSpeakMentor" type="button">Greet Mentor</button>
                </div>

                <!-- Voyaging Crewmate Encounter Card (Taha'a -> Tama, Ua Pou -> Moana, Hiva Oa -> Kahu) -->
                <div class="sanctuary-crew-card hidden" id="sanctuaryCrewCard">
                  <button class="sanctuary-crew-thumb-btn" id="btnEnlargeSanctuaryCrew" type="button" title="Click to inspect full-body portrait">
                    <img class="sanctuary-crew-img" id="sanctuaryCrewImg" alt="" />
                  </button>
                  <div class="sanctuary-crew-meta">
                    <span class="sand-mentor-tag" id="sanctuaryCrewStatusTag">Voyaging Companion</span>
                    <strong id="sanctuaryCrewName"></strong>
                    <span id="sanctuaryCrewTrait"></span>
                  </div>
                </div>

                <!-- Unlocked after Hawai'i Finale: Free Replay Any of the 17 Chants! -->
                <div class="master-replay-box hidden" id="masterReplayBox">
                  <h3>Master Navigator Anthology — Replay Any Chant</h3>
                  <p>Having reached Hawai'i, you may launch any route chant across all three archipelagos directly.</p>
                  <div class="replay-song-grid" id="masterReplayGrid"></div>
                </div>
              </div>
            </section>

            <!-- STATION 2: STICK-IN-THE-SAND DIAGRAMS -->
            <section class="hub-panel hidden" id="panelSand" role="tabpanel">
              <div class="hub-card sand-stage-card">
                <div class="sand-stage-header">
                  <div>
                    <span class="sand-mentor-tag" id="sandStageMentor"></span>
                    <h3 id="sandStageTitle">Stick-in-the-Sand Lessons</h3>
                  </div>
                  <button class="secondary-btn small-btn" id="btnRedrawSand" type="button">Redraw</button>
                </div>
                <canvas id="shoreSandCanvas" width="520" height="350"></canvas>
                <p class="sand-narration-box" id="sandStageNarration"></p>
              </div>

              <div class="hub-card sand-list-card">
                <div class="sand-list-head">
                  <h4 id="sandPoiTitle">Carved Ocean Cue Diagrams</h4>
                  <button class="sand-mentor-mini-btn hidden" id="btnEnlargeSandPortrait" type="button" title="Inspect teaching mentor portrait">
                    <img id="sandMentorImg" alt="" />
                    <span id="sandMentorCardName"></span>
                  </button>
                </div>
                <div class="lesson-list" id="hubLessonList"></div>
              </div>
            </section>

            <!-- STATION 3: STAR-STONE SKY VIGIL -->
            <section class="hub-panel hidden" id="panelVigil" role="tabpanel">
              <div class="hub-card vigil-station-card">
                <div class="vigil-station-hero">
                  <button class="vigil-station-portrait-btn hidden" id="btnEnlargeVigilPortrait" type="button" title="Click to inspect full-body portrait">
                    <img class="vigil-launch-portrait" id="shoreVigilThumb" alt="" />
                  </button>
                  <div class="vigil-launch-copy">
                    <span class="sand-mentor-tag" id="shoreVigilEyebrow">✦ Grounded Night-Sky Observatory</span>
                    <h3 id="shoreVigilTitle">The Star-Stone Vigil</h3>
                    <p id="shoreVigilDesc"></p>
                  </div>
                </div>

                <button class="secondary-btn full-width-btn vigil-primary-launch-btn" id="btnLaunchLocalVigil" type="button">
                  ✨ Enter Star-Stone Vigil
                </button>

                <div class="vigil-progress-box">
                  <div class="vigil-progress-head">
                    <strong>Ancestral Sky Teachings Learned</strong>
                    <span id="vigilLearnedCountPill">0 / 11</span>
                  </div>
                  <p class="vigil-progress-hint">
                    Constellations taught by island elders reveal their star names, chalk outlines, and sky-animal forms when sailing at night.
                  </p>
                  <div class="vigil-learned-chips" id="vigilLearnedChips"></div>
                </div>
              </div>
            </section>

            <!-- STATION 4: READY CANOE & SET SAIL -->
            <section class="hub-panel hidden" id="panelLanding" role="tabpanel">
              <div class="hub-card launch-station-card">
                <div class="launch-card-head">
                  <h3>Choose Route Chant &amp; Tide-Light</h3>
                </div>
                <div class="route-list" id="hubRouteList"></div>

                <div class="departure-picker" id="hubDepartureSection">
                  <div class="dep-label">
                    <strong>Departure Tide-Light</strong>
                    <span id="hubRecWindowHint"></span>
                  </div>
                  <div class="dep-buttons" id="hubDepartureBtns">
                    <button class="dep-btn" data-window="dawn" type="button">Dawn</button>
                    <button class="dep-btn" data-window="midday" type="button">Midday</button>
                    <button class="dep-btn" data-window="dusk" type="button">Dusk</button>
                    <button class="dep-btn" data-window="midnight" type="button">Midnight</button>
                  </div>
                </div>

                <div class="song-preview-box" id="hubSongPreview"></div>
              </div>

              <div class="hub-card readiness-station-card">
                <div class="readiness-head">
                  <div>
                    <h4 id="landingPoiTitle">Canoe Readiness &amp; Deck Load</h4>
                    <div class="vaka-tier-line" id="hubVakaTier"></div>
                  </div>
                </div>

                <div class="condition-list" id="hubConditionList"></div>

                <button class="secondary-btn full-width-btn" id="btnCareenAndRestock" type="button">
                  Careen Canoe &amp; Fill Ration Baskets
                </button>
                <div class="careen-feedback" id="hubCareenFeedback"></div>

                <div class="cargo-section">
                  <div class="cargo-header">
                    <strong>Deck Cargo Slots</strong>
                    <span id="hubSlotCounter"></span>
                  </div>
                  <div class="ration-controls">
                    <span>Woven Ration Baskets: <strong id="hubRationCount"></strong></span>
                    <div class="ration-step-btns">
                      <button class="secondary-btn small-btn" id="btnRationMinus" type="button">−</button>
                      <button class="secondary-btn small-btn" id="btnRationPlus" type="button">+</button>
                    </div>
                  </div>
                  <div class="cargo-items-list" id="hubCargoItems"></div>
                </div>

                <div class="crew-section">
                  <strong>Voyaging Crew Aboard</strong>
                  <div class="crew-list" id="hubCrewList"></div>
                </div>
              </div>
            </section>
          </main>

          <!-- Always-Visible Pinned Critical-Path CTA -->
          <div class="hub-critical-cta-bar" id="hubCriticalCtaBar">
            <button class="primary-btn full-width-btn hub-critical-cta-btn" id="btnHubCriticalCta" type="button"></button>
          </div>
        </aside>
      </div>

      <!-- Full-Body Character Portrait Lightbox Modal -->
      <div class="modal-backdrop hidden" id="mentorPortraitModal">
        <div class="mentor-lightbox-card">
          <div class="mentor-lightbox-header">
            <div>
              <div class="sanctuary-eyebrow" id="lightboxIslandLabel"></div>
              <h3 id="lightboxMentorName"></h3>
              <p class="mentor-lightbox-role" id="lightboxMentorRole"></p>
            </div>
            <button class="secondary-btn small-btn" id="btnClosePortraitModal" type="button">Close</button>
          </div>
          <div class="mentor-lightbox-stage">
            <img class="mentor-lightbox-img" id="lightboxMentorImg" alt="" />
          </div>
        </div>
      </div>
    `;

    this.shoreSandCanvas = new SandCanvas(
      this.rootEl.querySelector('#shoreSandCanvas')
    );

    // Station Tab Switching
    this.rootEl.querySelectorAll('.poi-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Top-left Objectives Card collapse toggle
    this.rootEl
      .querySelector('#btnToggleHubObjectives')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.objectivesCollapsed = !this.objectivesCollapsed;
        this._renderObjectivesTracker();
      });

    // Reset 3D camera orbit button
    this.rootEl
      .querySelector('#btnResetShoreOrbit')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.callbacks.onResetOrbit?.();
      });

    // Portrait Lightbox triggers
    this.rootEl
      .querySelector('#btnEnlargeSanctuaryPortrait')
      .addEventListener('click', () => {
        const gs = this.callbacks.getGameState();
        const isl = ISLANDS[gs?.currentIslandId];
        if (isl?.mentorPortrait) {
          this.openPortraitModal(isl);
        }
      });
    this.rootEl
      .querySelector('#btnEnlargeSandPortrait')
      .addEventListener('click', () => {
        if (this._sandMentorIsland?.mentorPortrait) {
          this.openPortraitModal(this._sandMentorIsland);
        }
      });
    this.rootEl
      .querySelector('#btnEnlargeVigilPortrait')
      .addEventListener('click', () => {
        if (this._vigilPortraitPayload) {
          this._showCharacterLightbox(this._vigilPortraitPayload);
        }
      });
    this.rootEl
      .querySelector('#btnEnlargeSanctuaryCrew')
      .addEventListener('click', () => {
        const gs = this.callbacks.getGameState();
        const isl = ISLANDS[gs?.currentIslandId];
        const crewId = isl?.rewards?.recruitsCrew;
        if (crewId) {
          this.openCrewPortraitModal(crewId);
        }
      });
    this.rootEl
      .querySelector('#btnClosePortraitModal')
      .addEventListener('click', () => {
        this.closePortraitModal();
      });
    this.rootEl
      .querySelector('#mentorPortraitModal')
      .addEventListener('click', (e) => {
        if (e.target.id === 'mentorPortraitModal') {
          this.closePortraitModal();
        }
      });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.rootEl.classList.contains('hidden')) {
        const modalEl = this.rootEl.querySelector('#mentorPortraitModal');
        if (modalEl && !modalEl.classList.contains('hidden')) {
          this.closePortraitModal();
        }
      }
    });

    // Speak with Mentor / Harvest Outpost button
    this.rootEl
      .querySelector('#btnSpeakMentor')
      .addEventListener('click', () => {
        this._triggerSanctuaryInteraction();
        this.refresh();
      });

    // Star-Stone Vigil Launcher inside Station 3
    this.rootEl
      .querySelector('#btnLaunchLocalVigil')
      .addEventListener('click', () => {
        const gs = this.callbacks.getGameState();
        const isl = ISLANDS[gs?.currentIslandId] || ISLANDS.raiatea;
        const unlearnedLocal = getAvailableUnlearnedLessonForIsland(gs, isl.id);
        this.callbacks.onOpenSkyVigil?.({
          islandId: isl.id,
          guidedLessonId: unlearnedLocal ? unlearnedLocal.id : undefined,
        });
      });

    // Ration +/- buttons
    this.rootEl.querySelector('#btnRationMinus').addEventListener('click', () => {
      const gs = this.callbacks.getGameState();
      gs.setLoadedRations(gs.loadedRations - 1);
      gs.saveToLocalStorage();
      this.refresh();
    });
    this.rootEl.querySelector('#btnRationPlus').addEventListener('click', () => {
      const gs = this.callbacks.getGameState();
      gs.setLoadedRations(gs.loadedRations + 1);
      gs.saveToLocalStorage();
      this.refresh();
    });

    // Careen & Restock button
    this.rootEl
      .querySelector('#btnCareenAndRestock')
      .addEventListener('click', () => {
        const gs = this.callbacks.getGameState();
        const msg = performBeachCareeningAndRestock(gs);
        this.rootEl.querySelector('#hubCareenFeedback').textContent = msg;
        this.callbacks.onAshoreStateChanged?.();
        this.refresh();
      });

    // Departure window buttons (also live-preview tide-light in ShoreDioramaRenderer!)
    this.rootEl.querySelectorAll('.dep-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedDeparture = btn.getAttribute('data-window');
        this._refreshRoutePanel();
        this.callbacks.onDepartureChanged?.(this.selectedDeparture);
      });
    });

    // Redraw Sand button
    this.rootEl.querySelector('#btnRedrawSand').addEventListener('click', () => {
      this._renderSelectedShoreLesson(true);
    });

    // Always-visible pinned critical-path CTA
    this.rootEl
      .querySelector('#btnHubCriticalCta')
      .addEventListener('click', (e) => {
        e.currentTarget.blur();
        this._handleCriticalCtaClick();
      });
  }

  setOrbitCustomized(customized) {
    this.orbitCustomized = Boolean(customized);
    this.rootEl
      .querySelector('#btnResetShoreOrbit')
      ?.classList.toggle('hidden', !this.orbitCustomized);
  }

  _triggerSanctuaryInteraction() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;
    this.lastSanctuaryResult = interactWithIslandSanctuary(gs);
    if (
      this.lastSanctuaryResult?.voiceId &&
      !(this.lastSanctuaryResult?.newlyRecruitedCrew?.length > 0)
    ) {
      this.callbacks.onPlayVoice?.(this.lastSanctuaryResult.voiceId);
    }
    if (this.lastSanctuaryResult?.clearedObjectives?.length) {
      this.flashClearedObjectives(this.lastSanctuaryResult.clearedObjectives);
    }
    this.callbacks.onSanctuaryInteracted?.(this.lastSanctuaryResult);
    const routes = getAvailableRoutesFromCurrentIsland(gs);
    const defaultRoute = this._getDefaultRoute(routes);
    if (defaultRoute) {
      this._userPickedRoute = false;
      this.selectedSongId = defaultRoute.song.id;
      this.selectedDeparture = defaultRoute.song.recommendedDeparture;
    }
  }

  flashClearedObjectives(clearedList) {
    if (!Array.isArray(clearedList) || clearedList.length === 0) return;
    for (const def of clearedList) {
      this._recentlyClearedObjectives.push(def);
    }
    this._renderObjectivesTracker();
    clearTimeout(this._clearedObjTimer);
    this._clearedObjTimer = setTimeout(() => {
      this._recentlyClearedObjectives = [];
      this._renderObjectivesTracker();
    }, 2800);
  }

  _renderObjectivesTracker() {
    const cardEl = this.rootEl.querySelector('#hubObjectivesCard');
    const listEl = this.rootEl.querySelector('#hubObjectivesList');
    const headEl = this.rootEl.querySelector('#hubObjectivesHeading');
    const chevEl = this.rootEl.querySelector('#hubObjectivesChevron');
    if (!cardEl || !listEl) return;

    const gs = this.callbacks.getGameState();
    const activeItems = getActiveObjectivesForDisplay(gs).filter(
      (item) => !this.callbacks.isObjectivePending?.(item.id)
    );
    const recentCleared = this._recentlyClearedObjectives || [];

    if (activeItems.length === 0 && recentCleared.length === 0) {
      cardEl.classList.add('hidden');
      cardEl.classList.remove('swipe-in-top');
      return;
    }

    const wasHidden = cardEl.classList.contains('hidden');
    cardEl.classList.remove('hidden');
    if (wasHidden) {
      cardEl.classList.remove('swipe-in-top');
      void cardEl.offsetWidth;
      cardEl.classList.add('swipe-in-top');
    }
    if (headEl) {
      headEl.textContent =
        activeItems.length > 0
          ? `✦ Objectives Ashore (${activeItems.length})`
          : '✦ Objective Cleared';
    }
    if (chevEl) {
      chevEl.textContent = this.objectivesCollapsed ? '▸' : '▾';
    }
    listEl.classList.toggle('hidden', this.objectivesCollapsed);
    if (this.objectivesCollapsed) return;

    listEl.innerHTML = '';

    for (const c of recentCleared) {
      const div = document.createElement('div');
      div.className = 'shore-obj-item cleared-flash';
      div.innerHTML = `
        <span class="shore-obj-check">✓</span>
        <div class="shore-obj-copy">
          <strong>${c.glyph || '✦'} ${c.title}</strong>
          <span class="shore-obj-cleared-tag">Objective Cleared</span>
        </div>
      `;
      listEl.appendChild(div);
    }

    for (const item of activeItems) {
      const swipeIn = Boolean(this.callbacks.consumeObjectiveSwipeIn?.(item.id));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `shore-obj-item shore-obj-btn ${item.isHere ? 'is-local' : ''} ${
        item.hasRequiredCargo ? 'cargo-ready' : ''
      } ${swipeIn ? 'swipe-in-top' : ''}`;
      btn.title = item.isHere
        ? 'Jump to Elder & Sanctuary station on this shore'
        : 'Jump to Set Sail station to plan route';
      btn.innerHTML = `
        <span class="shore-obj-bullet" aria-hidden="true">${item.glyph || '✦'}</span>
        <div class="shore-obj-copy">
          <div class="shore-obj-title-row">
            <strong>${item.title}</strong>
            ${
              item.statusBadge
                ? `<span class="shore-obj-badge">${item.statusBadge}</span>`
                : ''
            }
          </div>
          <span class="shore-obj-detail">${item.detail}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.switchTab(item.isHere ? 'sanctuary' : 'landing');
      });
      listEl.appendChild(btn);
    }
  }

  _showCharacterLightbox({ eyebrow, name, role, portrait, alt }) {
    if (!portrait) return;
    this._lightboxMentor = { eyebrow, name, role, portrait };
    this.rootEl.querySelector('#lightboxIslandLabel').textContent = eyebrow;
    this.rootEl.querySelector('#lightboxMentorName').textContent = name;
    this.rootEl.querySelector('#lightboxMentorRole').textContent = role;
    const imgEl = this.rootEl.querySelector('#lightboxMentorImg');
    imgEl.src = portrait;
    imgEl.alt = alt || `${name} — full-body portrait in traditional attire`;
    this.rootEl.querySelector('#mentorPortraitModal').classList.remove('hidden');
  }

  openPortraitModal(isl) {
    if (!isl?.mentorPortrait) return;
    this._showCharacterLightbox({
      eyebrow: `${isl.name} · ${isl.subtitle}`,
      name: isl.mentorName,
      role: isl.mentorRole || 'Island Wayfinder',
      portrait: isl.mentorPortrait,
      alt: `${isl.mentorName} — full-body portrait in traditional attire on ${isl.name}`,
    });
  }

  openCrewPortraitModal(crewId) {
    const cr = CREW_CATALOG[crewId];
    if (!cr?.portrait) return;
    const homeIsl = ISLANDS[cr.homeIslandId];
    this._showCharacterLightbox({
      eyebrow: `Voyaging Companion${homeIsl ? ` · ${homeIsl.name}` : ''}`,
      name: cr.name,
      role: `${cr.role} — ${cr.traitText}`,
      portrait: cr.portrait,
      alt: `${cr.name} (${cr.role}) — full-body portrait in traditional attire`,
    });
  }

  closePortraitModal() {
    this._lightboxMentor = null;
    this.rootEl.querySelector('#mentorPortraitModal')?.classList.add('hidden');
  }

  show(initialTab = 'sanctuary') {
    const gs = this.callbacks.getGameState();
    const curIslId = gs?.currentIslandId || 'raiatea';

    // Reset per-visit state only when arriving on a different island
    if (this._currentIslandSessionId !== curIslId) {
      this._currentIslandSessionId = curIslId;
      this.lastSanctuaryResult = null;
      this.selectedSongId = null;
      this.selectedLessonId = null;
      this._userPickedRoute = false;
    }

    // Ensure selectedDeparture matches the default available song if not yet picked
    const routes = this._getAvailableRoutes();
    const defaultRoute = this._getDefaultRoute(routes);
    if (defaultRoute && !this._userPickedRoute) {
      this.selectedSongId = defaultRoute.song.id;
      this.selectedDeparture = defaultRoute.song.recommendedDeparture;
    }

    this.rootEl.querySelector('#hubCareenFeedback').textContent = '';
    this.rootEl.classList.remove('hidden');
    this.closePortraitModal();

    const validTabs = ['sanctuary', 'sand', 'vigil', 'landing'];
    const resolvedTab = validTabs.includes(initialTab) ? initialTab : 'sanctuary';
    this.switchTab(resolvedTab);
  }

  hide() {
    this.shoreSandCanvas.stopAnimation();
    this.closePortraitModal();
    this.callbacks.onStopVoice?.();
    this.rootEl.classList.add('hidden');
  }

  switchTab(tabId) {
    const validTabs = ['sanctuary', 'sand', 'vigil', 'landing'];
    const nextTab = validTabs.includes(tabId) ? tabId : 'sanctuary';
    if (nextTab !== 'sanctuary') {
      this.callbacks.onStopVoice?.();
    }
    this.activeTab = nextTab;

    this.rootEl.querySelectorAll('.poi-tab-btn').forEach((btn) => {
      const active = btn.getAttribute('data-tab') === nextTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    this.rootEl
      .querySelector('#panelSanctuary')
      .classList.toggle('hidden', nextTab !== 'sanctuary');
    this.rootEl
      .querySelector('#panelSand')
      .classList.toggle('hidden', nextTab !== 'sand');
    this.rootEl
      .querySelector('#panelVigil')
      .classList.toggle('hidden', nextTab !== 'vigil');
    this.rootEl
      .querySelector('#panelLanding')
      .classList.toggle('hidden', nextTab !== 'landing');

    if (nextTab !== 'sand') {
      this.shoreSandCanvas.stopAnimation();
    }

    this.refresh();

    if (nextTab === 'sand') {
      if (this.selectedLessonId) {
        this._seenSandLessons.add(this.selectedLessonId);
        this._updateStationBadges();
      }
      this._renderSelectedShoreLesson(true);
    }

    this.callbacks.onStationChanged?.(nextTab, this.selectedDeparture);
  }

  refresh() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;

    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;
    const basin = OCEAN_BASINS[isl.basinId];

    // Header
    const chartedMainCount = Object.keys(gs.discoveredIslands || {}).filter(
      (id) => !ISLANDS[id]?.isSecret
    ).length;
    this.rootEl.querySelector('#hubActBadge').textContent =
      `Act ${basin.act} · ${basin.name} · ${chartedMainCount}/16 Charted`;
    this.rootEl.querySelector('#hubIslandName').textContent = isl.name;
    const uninhabitedLabel = isl.isSecret
      ? 'Silent Stone-Guardian Isle'
      : 'Uninhabited Wild Atoll';
    this.rootEl.querySelector('#hubIslandSubtitle').textContent =
      `${isl.subtitle}${isl.mentorName ? ` · ${isl.mentorName}` : ` · ${uninhabitedLabel}`}`;

    // Station 1 tab title adapts naturally to inhabited vs wild / monolith shores
    this.rootEl.querySelector('#tabGlyphSanctuary').textContent = isl.isSecret
      ? '🗿'
      : isl.inhabited
        ? '🌺'
        : '🌴';
    this.rootEl.querySelector('#tabLabelSanctuary').textContent = isl.isSecret
      ? 'Moai Shore'
      : isl.inhabited
        ? 'Elder'
        : 'Rookery';

    const [pLanding, pSand] = isl.pois;
    this.rootEl.querySelector('#landingPoiTitle').textContent =
      POI_LABELS[pLanding] || 'Canoe Readiness & Deck Load';
    this.rootEl.querySelector('#sandPoiTitle').textContent =
      (pSand && POI_LABELS[pSand]) || 'Carved Ocean Cue Diagrams';

    this._renderObjectivesTracker();
    this._refreshSanctuaryPanel();
    this._refreshSandLessonsList();
    this._refreshVigilPanel();
    this._refreshLandingReadinessAndRoutes();
    this._updateStationBadges();
    this._refreshCriticalCta();
  }

  _resolveCriticalNextStep(gs) {
    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;
    const activeObjs = getActiveObjectivesForDisplay(gs);
    const hasLocalAction = activeObjs.some(
      (o) => o.isHere && (o.kind !== 'quest' || o.hasRequiredCargo)
    );
    const hasGiftHere = activeObjs.some((o) => o.isHere && o.hasRequiredCargo);
    const routes = this._getAvailableRoutes();

    // 1. Meet Elder / Harvest Wild Outpost
    if (hasLocalAction || (routes.length === 0 && !this.lastSanctuaryResult)) {
      const label = isl.inhabited
        ? hasGiftHere
          ? `🌺 Present Offering to ${isl.mentorName}`
          : `🌺 Greet ${isl.mentorName}`
        : isl.isSecret
          ? '🗿 Survey the Silent Moai Terrace'
          : '🌴 Harvest Wild Rookery & Shallows';
      return {
        kind: 'sanctuary',
        label,
        run: () => {
          if (this.activeTab !== 'sanctuary') {
            this.switchTab('sanctuary');
          }
          this._triggerSanctuaryInteraction();
          this.refresh();
        },
      };
    }

    // 2. Sky Vigil (unlearned constellation teaching on this island)
    const unlearnedLocal = getAvailableUnlearnedLessonForIsland(gs, isl.id);
    if (unlearnedLocal) {
      return {
        kind: 'vigil',
        label: `✨ Sky Vigil: Learn ${unlearnedLocal.title}`,
        run: () => {
          this.callbacks.onOpenSkyVigil?.({
            islandId: isl.id,
            guidedLessonId: unlearnedLocal.id,
          });
        },
      };
    }

    // 3. Prep Canoe (careen hull/sail/lashings & fill ration baskets)
    const minCond = Math.min(
      gs.hullCondition,
      gs.sailCondition,
      gs.lashingsCondition
    );
    const maxRations = Math.max(1, gs.maxCargoSlots - gs.cargoItems.length);
    const needsCareen = isl.inhabited && minCond < 78.0;
    if (routes.length > 0 && (needsCareen || gs.loadedRations < maxRations)) {
      return {
        kind: 'prep',
        label: isl.inhabited
          ? '🛠️ Careen Canoe & Fill Rations'
          : '🥥 Restock Coconuts & Water',
        run: () => {
          const msg = performBeachCareeningAndRestock(gs);
          this.rootEl.querySelector('#hubCareenFeedback').textContent = msg;
          this.callbacks.onAshoreStateChanged?.();
          if (this.activeTab !== 'landing') {
            this.switchTab('landing');
          } else {
            this.refresh();
          }
        },
      };
    }

    // 4. Set Sail for the Newly Discovered / Selected Song
    if (routes.length > 0) {
      const song = this._getSelectedSongObject();
      const dstName =
        ISLANDS[song?.toIsland]?.name || song?.toIsland || 'Next Island';
      return {
        kind: 'sail',
        label: `⛵ Set Sail → ${dstName}`,
        run: () => {
          if (song) {
            this.callbacks.onLaunchVoyage?.(song, this.selectedDeparture);
          }
        },
      };
    }

    // 5. Post-Finale Fallback (no vigil/prep/route remaining): switch to Canoe Landing
    return {
      kind: 'landing',
      label: '🛶 Go to Canoe Landing & Set Sail →',
      run: () => {
        this.switchTab('landing');
      },
    };
  }

  _refreshCriticalCta() {
    const gs = this.callbacks.getGameState();
    const btn = this.rootEl.querySelector('#btnHubCriticalCta');
    if (!gs || !btn) return;
    const step = this._resolveCriticalNextStep(gs);
    this._currentCriticalStep = step;
    btn.textContent = step.label;
  }

  _handleCriticalCtaClick() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;
    const step = this._resolveCriticalNextStep(gs);
    step.run();
  }

  _setBadge(el, text, variant) {
    if (!el) return;
    if (!text) {
      el.className = 'station-badge hidden';
      el.textContent = '';
      return;
    }
    el.className = `station-badge ${variant || 'badge-neutral'}`;
    el.textContent = text;
  }

  _updateStationBadges() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;
    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;

    // 1. Elder / Sanctuary badge
    const activeObjs = getActiveObjectivesForDisplay(gs);
    const hasLocalActionObj = activeObjs.some((o) => o.isHere);
    if (hasLocalActionObj) {
      const hasReadyGift = activeObjs.some((o) => o.isHere && o.hasRequiredCargo);
      this._setBadge(
        this.rootEl.querySelector('#badgeSanctuary'),
        hasReadyGift ? 'Gift' : isl.inhabited ? 'Meet' : 'Gather',
        'badge-action'
      );
    } else if (this.lastSanctuaryResult || !isl.isSecret) {
      this._setBadge(
        this.rootEl.querySelector('#badgeSanctuary'),
        '✓',
        'badge-done'
      );
    } else {
      this._setBadge(this.rootEl.querySelector('#badgeSanctuary'), '', '');
    }

    // 2. Sand Diagrams badge
    const lessons = getLearnedSandLessonsList(gs);
    const localUnseen = (isl.sandLessons || []).some(
      (lid) => gs.learnedSandLessons?.[lid] && !this._seenSandLessons.has(lid)
    );
    if (localUnseen) {
      this._setBadge(
        this.rootEl.querySelector('#badgeSand'),
        'New',
        'badge-action'
      );
    } else if (lessons.length > 0) {
      this._setBadge(
        this.rootEl.querySelector('#badgeSand'),
        String(lessons.length),
        'badge-neutral'
      );
    } else {
      this._setBadge(this.rootEl.querySelector('#badgeSand'), '', '');
    }

    // 3. Sky Vigil badge
    const unlearnedLocal = getAvailableUnlearnedLessonForIsland(gs, isl.id);
    const localConstLesson = getAvailableConstellationLessonForIsland(gs, isl.id);
    if (unlearnedLocal) {
      this._setBadge(
        this.rootEl.querySelector('#badgeVigil'),
        'Teach',
        'badge-teach'
      );
    } else if (
      localConstLesson &&
      gs.hasLearnedConstellation(localConstLesson.unlockKey)
    ) {
      this._setBadge(this.rootEl.querySelector('#badgeVigil'), '✓', 'badge-done');
    } else {
      this._setBadge(this.rootEl.querySelector('#badgeVigil'), '', '');
    }

    // 4. Set Sail badge
    const routes = this._getAvailableRoutes();
    const minCond = Math.min(
      gs.hullCondition,
      gs.sailCondition,
      gs.lashingsCondition
    );
    const maxRations = Math.max(1, gs.maxCargoSlots - gs.cargoItems.length);
    const needsCareen = isl.inhabited && minCond < 78.0;
    if (!routes.length) {
      this._setBadge(this.rootEl.querySelector('#badgeLanding'), '', '');
    } else if (needsCareen || gs.loadedRations < maxRations) {
      this._setBadge(
        this.rootEl.querySelector('#badgeLanding'),
        'Prep',
        'badge-warn'
      );
    } else {
      this._setBadge(
        this.rootEl.querySelector('#badgeLanding'),
        'Ready',
        'badge-ready'
      );
    }
  }

  _refreshSanctuaryPanel() {
    const gs = this.callbacks.getGameState();
    const isl = ISLANDS[gs.currentIslandId] || ISLANDS.raiatea;
    const [, , pSanct] = isl.pois;
    this.rootEl.querySelector('#sanctuaryPoiLabel').textContent =
      POI_LABELS[pSanct || isl.pois[isl.pois.length - 1]] || isl.name;

    const layoutEl = this.rootEl.querySelector('#sanctuaryEncounterLayout');
    const portraitPanel = this.rootEl.querySelector('#sanctuaryPortraitPanel');
    const actionsEl = this.rootEl.querySelector('#sanctuaryActions');
    const speakBtn = this.rootEl.querySelector('#btnSpeakMentor');

    const activeObjs = getActiveObjectivesForDisplay(gs);
    const hasLocalAction = activeObjs.some(
      (o) => o.isHere && (o.kind !== 'quest' || o.hasRequiredCargo)
    );
    const hasGiftHere = activeObjs.some((o) => o.isHere && o.hasRequiredCargo);
    const hideSpeakAgain = Boolean(this.lastSanctuaryResult && !hasLocalAction);

    if (isl.inhabited && isl.mentorPortrait) {
      layoutEl.classList.remove('no-mentor');
      portraitPanel.classList.remove('hidden');
      const imgEl = this.rootEl.querySelector('#sanctuaryMentorImg');
      imgEl.src = isl.mentorPortrait;
      imgEl.alt = `${isl.mentorName} — full-body portrait in traditional attire on ${isl.name}`;
      this.rootEl.querySelector('#sanctuaryMentorName').textContent =
        isl.mentorName;
      this.rootEl.querySelector('#sanctuaryMentorRole').textContent =
        isl.mentorRole || isl.subtitle;

      speakBtn.textContent = hasGiftHere
        ? `Present Offering to ${isl.mentorName}`
        : `Greet ${isl.mentorName}`;
      speakBtn.className = 'secondary-btn';
    } else {
      layoutEl.classList.add('no-mentor');
      portraitPanel.classList.add('hidden');
      speakBtn.textContent = isl.isSecret
        ? 'Survey the Silent Moai Terrace'
        : 'Harvest Wild Rookery & Shallows';
      speakBtn.className = 'secondary-btn';
    }
    actionsEl?.classList.toggle('hidden', hideSpeakAgain);

    const res = this.lastSanctuaryResult || {
      title: isl.mentorName
        ? `${isl.mentorName} Awaits`
        : isl.isSecret
          ? 'Silent Guardians of Rapa Nui'
          : 'Uninhabited Lagoon Outpost',
      speech: isl.inhabited
        ? `Step forward to speak with ${isl.mentorName}, exchange island gifts, and receive the next star-path chant.`
        : isl.isSecret
          ? 'Colossal volcanic-tuff Moai stand upright along the shore gazing out across the ocean swell.'
          : 'Explore the wild coral shallows and seabird rookery to gather rare voyage gifts.',
      rewardsList: [],
    };

    this.rootEl.querySelector('#sanctuaryTitle').textContent = res.title;
    this.rootEl.querySelector('#sanctuarySpeech').textContent = res.speech;
    this.rootEl.querySelector('#sanctuaryRewards').innerHTML = (
      res.rewardsList || []
    )
      .map((r) => `<li>✦ ${r}</li>`)
      .join('');

    // Crewmate Encounter Card on Taha'a, Ua Pou, Hiva Oa
    const crewCardEl = this.rootEl.querySelector('#sanctuaryCrewCard');
    const crewId = isl.rewards?.recruitsCrew;
    const crewObj = crewId ? CREW_CATALOG[crewId] : null;
    if (crewObj?.portrait) {
      crewCardEl.classList.remove('hidden');
      const isAboard = gs.recruitedCrew.includes(crewId);
      const crewImg = this.rootEl.querySelector('#sanctuaryCrewImg');
      crewImg.src = crewObj.portrait;
      crewImg.alt = `${crewObj.name} · ${crewObj.role}`;
      this.rootEl.querySelector('#sanctuaryCrewStatusTag').textContent = isAboard
        ? 'Voyaging Companion · Aboard Your Vaka'
        : 'Voyaging Companion Ashore';
      this.rootEl.querySelector('#sanctuaryCrewName').textContent =
        `${crewObj.name} · ${crewObj.role}`;
      this.rootEl.querySelector('#sanctuaryCrewTrait').textContent =
        crewObj.traitText;
    } else {
      crewCardEl.classList.add('hidden');
    }

    // Master Replay Anthology box once Hawai'i Finale is completed
    const replayBox = this.rootEl.querySelector('#masterReplayBox');
    replayBox.classList.toggle('hidden', !gs.masterReplayUnlocked);
    if (gs.masterReplayUnlocked) {
      const grid = this.rootEl.querySelector('#masterReplayGrid');
      grid.innerHTML = '';
      for (const song of Object.values(SONGS)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'secondary-btn small-btn';
        b.textContent = `Song ${song.number}: ${song.title}`;
        b.addEventListener('click', () => {
          gs.currentIslandId = song.fromIsland;
          gs.currentBasinId = ISLANDS[song.fromIsland].basinId;
          this.callbacks.onLaunchVoyage?.(song, song.recommendedDeparture);
        });
        grid.appendChild(b);
      }
    }
  }

  _refreshSandLessonsList() {
    const gs = this.callbacks.getGameState();
    const curIsl = ISLANDS[gs?.currentIslandId] || ISLANDS.raiatea;
    const lessons = getLearnedSandLessonsList(gs);
    const listEl = this.rootEl.querySelector('#hubLessonList');
    const miniMentorBtn = this.rootEl.querySelector('#btnEnlargeSandPortrait');
    listEl.innerHTML = '';

    if (!lessons.length) {
      miniMentorBtn.classList.add('hidden');
      this._sandMentorIsland = null;
      return;
    }

    // Prefer selecting the current island's sand lesson first when arriving on a new island
    if (
      !this.selectedLessonId ||
      !lessons.some((l) => l.id === this.selectedLessonId)
    ) {
      const localMatch = lessons.find((l) => l.islandId === curIsl.id);
      this.selectedLessonId = (localMatch || lessons[lessons.length - 1]).id;
    }

    // Sort current island's lesson(s) to the top for instant clarity
    const ordered = lessons.slice().sort((a, b) => {
      const aLocal = a.islandId === curIsl.id ? 0 : 1;
      const bLocal = b.islandId === curIsl.id ? 0 : 1;
      return aLocal - bLocal;
    });

    for (const les of ordered) {
      const isLocal = les.islandId === curIsl.id;
      const isUnseen = isLocal && !this._seenSandLessons.has(les.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `lesson-choice-btn ${les.id === this.selectedLessonId ? 'selected' : ''}`;
      btn.innerHTML = `
        <div class="lesson-choice-row">
          <strong>${les.title}</strong>
          ${
            isUnseen
              ? '<span class="station-badge badge-action">New</span>'
              : isLocal
                ? '<span class="station-badge badge-neutral">This Shore</span>'
                : ''
          }
        </div>
        <span>Taught by ${les.mentor}</span>
      `;
      btn.addEventListener('click', () => {
        this.selectedLessonId = les.id;
        this._seenSandLessons.add(les.id);
        this._refreshSandLessonsList();
        this._updateStationBadges();
        this._renderSelectedShoreLesson(true);
      });
      listEl.appendChild(btn);
    }

    const activeLesson =
      lessons.find((l) => l.id === this.selectedLessonId) || ordered[0];
    const mentorIsl = activeLesson ? ISLANDS[activeLesson.islandId] : null;
    if (mentorIsl?.mentorPortrait) {
      this._sandMentorIsland = mentorIsl;
      miniMentorBtn.classList.remove('hidden');
      const imgEl = this.rootEl.querySelector('#sandMentorImg');
      imgEl.src = mentorIsl.mentorPortrait;
      imgEl.alt = mentorIsl.mentorName;
      this.rootEl.querySelector('#sandMentorCardName').textContent =
        mentorIsl.mentorName;
    } else {
      this._sandMentorIsland = null;
      miniMentorBtn.classList.add('hidden');
    }

    if (this.activeTab === 'sand') {
      this._renderSelectedShoreLesson(false);
    }
  }

  _renderSelectedShoreLesson(animate) {
    const gs = this.callbacks.getGameState();
    const lessons = getLearnedSandLessonsList(gs);
    const les = lessons.find((l) => l.id === this.selectedLessonId) || lessons[0];
    if (!les) return;

    this.rootEl.querySelector('#sandStageMentor').textContent =
      `Mentor: ${les.mentor}`;
    this.rootEl.querySelector('#sandStageTitle').textContent = les.title;
    this.rootEl.querySelector('#sandStageNarration').textContent = les.narration;
    this.shoreSandCanvas.renderLesson(les, { animate });
  }

  _refreshVigilPanel() {
    const gs = this.callbacks.getGameState();
    const curIsl = ISLANDS[gs?.currentIslandId] || ISLANDS.raiatea;
    const basin = OCEAN_BASINS[curIsl.basinId];

    const portraitBtn = this.rootEl.querySelector('#btnEnlargeVigilPortrait');
    const thumbEl = this.rootEl.querySelector('#shoreVigilThumb');
    const launchBtn = this.rootEl.querySelector('#btnLaunchLocalVigil');

    const localConstLesson = getAvailableConstellationLessonForIsland(
      gs,
      curIsl.id
    );
    const unlearnedLocal = getAvailableUnlearnedLessonForIsland(gs, curIsl.id);

    if (unlearnedLocal) {
      portraitBtn.classList.remove('hidden');
      thumbEl.src = unlearnedLocal.portrait;
      thumbEl.alt = unlearnedLocal.elderName;
      this._vigilPortraitPayload = {
        eyebrow: `${curIsl.name} · Night-Sky Teaching`,
        name: unlearnedLocal.elderName,
        role: unlearnedLocal.elderRole,
        portrait: unlearnedLocal.portrait,
      };
      this.rootEl.querySelector('#shoreVigilEyebrow').textContent =
        `✨ Elder Night-Sky Teaching Ready · ${curIsl.name}`;
      this.rootEl.querySelector('#shoreVigilTitle').textContent =
        `${unlearnedLocal.elderName} Introduces ${unlearnedLocal.title}`;
      this.rootEl.querySelector('#shoreVigilDesc').textContent =
        `Join ${unlearnedLocal.elderName} inside the Star-Stone Ring on ${curIsl.name} to trace ${unlearnedLocal.title} across the night sky and unlock its chalk lines, star names, and sky-animal form at sea.`;
      launchBtn.textContent = `✨ Begin ${unlearnedLocal.elderName}'s Guided Vigil (${unlearnedLocal.title})`;
    } else if (localConstLesson) {
      portraitBtn.classList.remove('hidden');
      thumbEl.src = localConstLesson.portrait;
      thumbEl.alt = localConstLesson.elderName;
      this._vigilPortraitPayload = {
        eyebrow: `${curIsl.name} · Star-Stone Vigil`,
        name: localConstLesson.elderName,
        role: localConstLesson.elderRole,
        portrait: localConstLesson.portrait,
      };
      this.rootEl.querySelector('#shoreVigilEyebrow').textContent =
        `✦ Star-Stone Ring of ${curIsl.name} · ${basin ? basin.name : ''}`;
      this.rootEl.querySelector('#shoreVigilTitle').textContent =
        `${localConstLesson.title} — Learned on ${curIsl.name}`;
      this.rootEl.querySelector('#shoreVigilDesc').textContent =
        `Stand within the stone circle of ${curIsl.name} to study your learned constellations across tonight's sky, practice sight-alignments, or replay ${localConstLesson.elderName}'s teaching.`;
      launchBtn.textContent = `✨ Enter ${curIsl.name} Star-Stone Observatory`;
    } else {
      if (curIsl.inhabited && curIsl.mentorPortrait) {
        portraitBtn.classList.remove('hidden');
        thumbEl.src = curIsl.mentorPortrait;
        thumbEl.alt = curIsl.mentorName;
        this._vigilPortraitPayload = {
          eyebrow: `${curIsl.name} · ${curIsl.subtitle}`,
          name: curIsl.mentorName,
          role: curIsl.mentorRole || 'Island Wayfinder',
          portrait: curIsl.mentorPortrait,
        };
      } else {
        portraitBtn.classList.add('hidden');
        this._vigilPortraitPayload = null;
      }
      this.rootEl.querySelector('#shoreVigilEyebrow').textContent =
        `✦ Grounded Night-Sky Observatory · ${curIsl.name}`;
      this.rootEl.querySelector('#shoreVigilTitle').textContent =
        `${curIsl.name} Star-Stone Ring`;
      this.rootEl.querySelector('#shoreVigilDesc').textContent =
        `Step into the coastal stone circle on ${curIsl.name} to watch tonight's stars wheel overhead in stillness and review the constellations you have learned.`;
      launchBtn.textContent = `✨ Observe ${curIsl.name} Night Sky`;
    }

    // Populate learned sky-teachings progress summary
    const allLessons = Object.values(CONSTELLATION_LESSONS);
    let learnedCount = 0;
    const chipsHtml = [];
    for (const les of allLessons) {
      const learned = gs.hasLearnedConstellation(les.unlockKey);
      if (learned) {
        learnedCount += 1;
        chipsHtml.push(
          `<span class="vigil-learned-chip learned">✦ ${les.title}</span>`
        );
      }
    }
    this.rootEl.querySelector('#vigilLearnedCountPill').textContent =
      `${learnedCount} / ${TOTAL_SKY_TEACHINGS}`;
    this.rootEl.querySelector('#vigilLearnedChips').innerHTML =
      chipsHtml.length > 0
        ? chipsHtml.join('')
        : '<span class="empty-note">Complete your first Guided Sky Vigil ashore to reveal ancestral sky animals at sea.</span>';
  }

  _refreshLandingReadinessAndRoutes() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;

    const tierNames = {
      1: 'Coastal Double-Hulled Vaka (4 Cargo Slots)',
      2: 'Raised-Strake Voyaging Vaka (6 Cargo Slots)',
      3: 'Double-Sail Deep-Ocean Vaka Moana (8 Cargo Slots)',
    };
    this.rootEl.querySelector('#hubVakaTier').textContent =
      tierNames[gs.vakaTier] || tierNames[1];

    const describeCond = (val) =>
      val >= 99
        ? 'Consecrated & Sound'
        : val >= 75
          ? 'Seaworthy'
          : val >= 55
            ? 'Weathered'
            : 'Worn — Careen Ashore';

    const sailLabel = gs.vakaTier >= 3 ? 'Twin Pandanus Sails' : 'Pandanus Sail';
    this.rootEl.querySelector('#hubConditionList').innerHTML = `
      <div class="cond-chip"><span>Twin Hulls</span><strong>${describeCond(gs.hullCondition)}</strong></div>
      <div class="cond-chip"><span>${sailLabel}</span><strong>${describeCond(gs.sailCondition)}</strong></div>
      <div class="cond-chip"><span>Sennit Lashings</span><strong>${describeCond(gs.lashingsCondition)}</strong></div>
    `;

    this.rootEl.querySelector('#hubSlotCounter').textContent =
      `${gs.getUsedCargoSlots()} / ${gs.maxCargoSlots} Slots Lashed`;
    this.rootEl.querySelector('#hubRationCount').textContent =
      `${Math.floor(gs.loadedRations)} Baskets`;

    const cargoContainer = this.rootEl.querySelector('#hubCargoItems');
    if (gs.cargoItems.length === 0) {
      cargoContainer.innerHTML =
        '<div class="empty-note">No trade gifts currently lashed on deck.</div>';
    } else {
      cargoContainer.innerHTML = gs.cargoItems
        .map((cid) => {
          const item = CARGO_CATALOG[cid] || { name: cid, description: '' };
          return `<div class="cargo-pill"><strong>📦 ${item.name}</strong><span>${item.description}</span></div>`;
        })
        .join('');
    }

    const crewContainer = this.rootEl.querySelector('#hubCrewList');
    crewContainer.innerHTML = '';
    const playerProfile = getPlayerCharacterProfile(gs.difficulty);
    const playerPill = document.createElement('div');
    playerPill.className = 'crew-pill';
    playerPill.innerHTML = `
      <div class="crew-pill-text">
        <strong>You · ${playerProfile.title} (${playerProfile.ageLabel})</strong>
        <span>At the Helm: ${playerProfile.attireSummary}</span>
      </div>
    `;
    crewContainer.appendChild(playerPill);

    if (gs.assignedCrew.length === 0) {
      const note = document.createElement('div');
      note.className = 'empty-note';
      note.textContent =
        'Sailing with your starter paddler (recruit specialist crewmates across the islands).';
      crewContainer.appendChild(note);
    } else {
      for (const crId of gs.assignedCrew) {
        const cr = CREW_CATALOG[crId];
        if (!cr) continue;
        const pill = document.createElement('div');
        pill.className = 'crew-pill crew-pill-with-portrait';
        pill.innerHTML = `
          ${
            cr.portrait
              ? `<button class="crew-pill-thumb-btn" type="button" title="Inspect ${cr.name}'s full-body portrait">
                   <img class="crew-pill-thumb" src="${cr.portrait}" alt="${cr.name}" />
                 </button>`
              : ''
          }
          <div class="crew-pill-text">
            <strong>${cr.name} · ${cr.role}</strong>
            <span>${cr.traitText}</span>
          </div>
        `;
        const thumbBtn = pill.querySelector('.crew-pill-thumb-btn');
        if (thumbBtn) {
          thumbBtn.addEventListener('click', () => {
            this.openCrewPortraitModal(crId);
          });
        }
        crewContainer.appendChild(pill);
      }
    }

    this._refreshRoutePanel();
  }

  _getAvailableRoutes() {
    const gs = this.callbacks.getGameState();
    return getAvailableRoutesFromCurrentIsland(gs);
  }

  _getDefaultRoute(routes) {
    if (!routes || routes.length === 0) return null;
    const forwardRoutes = routes.filter((r) => !r.isReturn);
    return forwardRoutes.length > 0
      ? forwardRoutes[forwardRoutes.length - 1]
      : routes[0];
  }

  _getSelectedSongObject() {
    const routes = this._getAvailableRoutes();
    if (!routes.length) return null;
    const match = routes.find((r) => r.song.id === this.selectedSongId);
    if (match) return match.song;
    return (this._getDefaultRoute(routes) || routes[0]).song;
  }

  _refreshRoutePanel() {
    const gs = this.callbacks.getGameState();
    const routes = this._getAvailableRoutes();
    const listEl = this.rootEl.querySelector('#hubRouteList');
    const depSection = this.rootEl.querySelector('#hubDepartureSection');
    const previewEl = this.rootEl.querySelector('#hubSongPreview');

    if (!routes.length) {
      listEl.innerHTML = `
        <div class="empty-route-callout">
          <p>Speak with this island's wayfinder in the <strong>Elder</strong> station first to learn the next route chant.</p>
          <button class="secondary-btn small-btn" id="btnJumpToElderForRoute" type="button">
            🌺 Go to Elder Station →
          </button>
        </div>
      `;
      listEl
        .querySelector('#btnJumpToElderForRoute')
        ?.addEventListener('click', () => this.switchTab('sanctuary'));
      depSection.classList.add('hidden');
      previewEl.innerHTML = '';
      return;
    }

    depSection.classList.remove('hidden');
    const defaultRoute = this._getDefaultRoute(routes);
    if (
      !this._userPickedRoute ||
      !this.selectedSongId ||
      !routes.some((r) => r.song.id === this.selectedSongId)
    ) {
      this._userPickedRoute = false;
      this.selectedSongId = defaultRoute.song.id;
      this.selectedDeparture = defaultRoute.song.recommendedDeparture;
    }

    listEl.innerHTML = '';
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
        <div class="route-choice-meta">
          Recommended Tide-Light: <strong>${departureWindowLabel(song.recommendedDeparture)}</strong>
        </div>
      `;
      btn.addEventListener('click', () => {
        this._userPickedRoute = true;
        this.selectedSongId = song.id;
        this.selectedDeparture = song.recommendedDeparture;
        this._refreshRoutePanel();
        this._refreshCriticalCta();
        this.callbacks.onDepartureChanged?.(this.selectedDeparture);
      });
      listEl.appendChild(btn);
    }

    const activeSong = this._getSelectedSongObject();
    this.rootEl.querySelector('#hubRecWindowHint').textContent = activeSong
      ? `(Sung for ${departureWindowLabel(activeSong.recommendedDeparture)})`
      : '';

    this.rootEl.querySelectorAll('.dep-btn').forEach((btn) => {
      const w = btn.getAttribute('data-window');
      btn.classList.toggle('selected', w === this.selectedDeparture);
      btn.classList.toggle(
        'recommended',
        activeSong && w === activeSong.recommendedDeparture
      );
    });

    if (activeSong) {
      const v1 = activeSong.verses[0];
      const warnMismatch =
        this.selectedDeparture !== activeSong.recommendedDeparture
          ? `<div class="dep-warning">Note: This chant expects ${departureWindowLabel(activeSong.recommendedDeparture)} skies; launching at ${departureWindowLabel(this.selectedDeparture)} shifts sun and stars out of phase!</div>`
          : '';
      previewEl.innerHTML = `
        <div class="preview-eyebrow">Opening Verse Memorized Ashore</div>
        <blockquote>"${v1.lyrics}"</blockquote>
        ${gs.difficulty === Difficulty.EASY ? `<div class="preview-easy-cue">${v1.easyCueText}</div>` : ''}
        ${warnMismatch}
      `;
    }
  }
}
