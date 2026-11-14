/**
 * Scenic Island Hub & Coastal POI UI for Kavenga: Songs of the Star Path.
 * Presents the 3 ashore tabs / POIs for each of the 16 islands:
 *   1. Canoe Landing & Launch (Canoe Careening, Ration & Cargo Baskets, Crew, Departure Window, Set Sail)
 *   2. Navigator's Shore (Animated Stick-in-the-Sand Teaching Canvas, Mentor Portrait & Narration)
 *   3. Village / Marae / Wild Outpost (Full-Body Mentor Encounter, Story Trades, Upgrades & Master Replay)
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
import { ISLANDS, OCEAN_BASINS } from '../data/islandsData.js';
import { SONGS } from '../data/songsData.js';
import { SandCanvas } from './SandCanvas.js';

export class IslandHubUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.activeTab = 'landing';
    this.selectedSongId = null;
    this.selectedDeparture = DepartureWindow.DAWN;
    this.selectedLessonId = null;
    this.lastSanctuaryResult = null;
    this._lightboxMentor = null;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="island-hub-shell">
        <header class="hub-header">
          <div>
            <div class="hub-act-badge" id="hubActBadge"></div>
            <h1 class="hub-island-name" id="hubIslandName"></h1>
            <p class="hub-island-sub" id="hubIslandSubtitle"></p>
          </div>
          <div class="hub-header-right">
            <label class="hub-mode-select-wrap">
              <span>Guidance Mode</span>
              <select id="hubDifficultySelect">
                <option value="easy">Easy · Apprentice (Lyrics + Cue Hints + Shimmer)</option>
                <option value="medium">Medium · Wayfinder (Lyrics + Sky Outlines)</option>
                <option value="hard">Hard · Navigator (Audio + Sky Outlines Only)</option>
                <option value="master_navigator">Master Navigator (Pure Silence &amp; Raw Stars)</option>
              </select>
            </label>
          </div>
        </header>

        <nav class="hub-poi-tabs">
          <button class="poi-tab-btn active" data-tab="landing" id="tabBtnLanding">🛶 Canoe Landing</button>
          <button class="poi-tab-btn" data-tab="sand" id="tabBtnSand">🐚 Navigator's Shore</button>
          <button class="poi-tab-btn" data-tab="sanctuary" id="tabBtnSanctuary">🌺 Village &amp; Marae</button>
        </nav>

        <main class="hub-content">
          <!-- TAB 1: CANOE LANDING & VOYAGE LAUNCH -->
          <section class="hub-panel" id="panelLanding">
            <div class="landing-grid">
              <div class="hub-card">
                <h3 id="landingPoiTitle">Canoe Readiness &amp; Deck Load</h3>
                <div class="vaka-tier-line" id="hubVakaTier"></div>

                <div class="condition-list" id="hubConditionList"></div>

                <div class="cargo-section">
                  <div class="cargo-header">
                    <strong>Deck Cargo Slots</strong>
                    <span id="hubSlotCounter"></span>
                  </div>
                  <div class="ration-controls">
                    <span>Woven Ration Baskets: <strong id="hubRationCount"></strong></span>
                    <div class="ration-step-btns">
                      <button class="secondary-btn small-btn" id="btnRationMinus">−</button>
                      <button class="secondary-btn small-btn" id="btnRationPlus">+</button>
                    </div>
                  </div>
                  <div class="cargo-items-list" id="hubCargoItems"></div>
                </div>

                <div class="crew-section">
                  <strong>Voyaging Crew Aboard</strong>
                  <div class="crew-list" id="hubCrewList"></div>
                </div>

                <button class="secondary-btn full-width-btn" id="btnCareenAndRestock">
                  Careen Canoe &amp; Fill Ration Baskets
                </button>
                <div class="careen-feedback" id="hubCareenFeedback"></div>
              </div>

              <div class="hub-card">
                <!-- Quick Mentor Encounter Card on Inhabited Islands -->
                <div class="landing-mentor-banner hidden" id="landingMentorBanner">
                  <img class="landing-mentor-thumb" id="landingMentorThumb" alt="" />
                  <div class="landing-mentor-info">
                    <span class="landing-mentor-eyebrow">Ashore Encounter</span>
                    <strong id="landingMentorName"></strong>
                    <span id="landingMentorRole"></span>
                  </div>
                  <button class="secondary-btn small-btn" id="btnMeetMentorFromLanding" type="button">
                    Meet Ashore →
                  </button>
                </div>

                <h3>Choose Route Chant &amp; Tide-Light</h3>
                <div class="route-list" id="hubRouteList"></div>

                <div class="departure-picker">
                  <div class="dep-label">
                    <strong>Departure Window</strong>
                    <span id="hubRecWindowHint"></span>
                  </div>
                  <div class="dep-buttons" id="hubDepartureBtns">
                    <button class="dep-btn" data-window="dawn">Dawn</button>
                    <button class="dep-btn" data-window="midday">Midday</button>
                    <button class="dep-btn" data-window="dusk">Dusk</button>
                    <button class="dep-btn" data-window="midnight">Midnight</button>
                  </div>
                </div>

                <div class="song-preview-box" id="hubSongPreview"></div>

                <button class="primary-btn launch-voyage-btn" id="btnLaunchVoyage">
                  Push Off Through the Reef Pass
                </button>
              </div>
            </div>
          </section>

          <!-- TAB 2: NAVIGATOR'S SHORE (ANIMATED STICK-IN-THE-SAND LESSONS) -->
          <section class="hub-panel hidden" id="panelSand">
            <div class="sand-shore-grid">
              <div class="hub-card sand-list-card">
                <h3 id="sandPoiTitle">Stick-in-the-Sand Lessons</h3>
                <p class="panel-hint">Select a beach diagram to watch the mentor carve grooves and place shells in damp sand.</p>

                <!-- Full-Body Teaching Mentor Preview -->
                <div class="sand-mentor-showcase hidden" id="sandMentorShowcase">
                  <button class="sand-mentor-thumb-btn" id="btnEnlargeSandPortrait" type="button" title="Inspect full-body attire">
                    <img class="sand-mentor-img" id="sandMentorImg" alt="" />
                  </button>
                  <div class="sand-mentor-meta">
                    <span class="sand-mentor-tag">Teaching Mentor</span>
                    <strong id="sandMentorCardName"></strong>
                    <span id="sandMentorCardRole"></span>
                    <span class="portrait-zoom-hint">Click portrait to enlarge</span>
                  </div>
                </div>

                <div class="lesson-list" id="hubLessonList"></div>
              </div>
              <div class="hub-card sand-stage-card">
                <div class="sand-stage-header">
                  <div>
                    <span class="sand-mentor-tag" id="sandStageMentor"></span>
                    <h3 id="sandStageTitle"></h3>
                  </div>
                  <button class="secondary-btn small-btn" id="btnRedrawSand">Redraw in Sand</button>
                </div>
                <canvas id="shoreSandCanvas" width="560" height="400"></canvas>
                <p class="sand-narration-box" id="sandStageNarration"></p>
              </div>
            </div>
          </section>

          <!-- TAB 3: VILLAGE / MARAE / WILD OUTPOST (FULL-BODY CHARACTER ENCOUNTER) -->
          <section class="hub-panel hidden" id="panelSanctuary">
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

                  <!-- Voyaging Crewmate Encounter Card (Taha'a -> Tama, Ua Pou -> Moana, Hiva Oa -> Kahu) -->
                  <div class="sanctuary-crew-card hidden" id="sanctuaryCrewCard">
                    <button class="sanctuary-crew-thumb-btn" id="btnEnlargeSanctuaryCrew" type="button" title="Click to inspect full-body portrait">
                      <img class="sanctuary-crew-img" id="sanctuaryCrewImg" alt="" />
                    </button>
                    <div class="sanctuary-crew-meta">
                      <span class="sand-mentor-tag" id="sanctuaryCrewStatusTag">Voyaging Companion</span>
                      <strong id="sanctuaryCrewName"></strong>
                      <span id="sanctuaryCrewTrait"></span>
                      <span class="portrait-zoom-hint">Click portrait to enlarge</span>
                    </div>
                  </div>

                  <div class="sanctuary-actions">
                    <button class="primary-btn" id="btnSpeakMentor">Greet Mentor / Harvest Shore</button>
                    <button class="secondary-btn" id="btnGoToLandingFromSanctuary" type="button">
                      Prepare Canoe &amp; Set Sail →
                    </button>
                  </div>
                </div>
              </div>

              <!-- Unlocked after Rapa Nui Finale: Free Replay Any of the 17 Chants! -->
              <div class="master-replay-box hidden" id="masterReplayBox">
                <h3>Master Navigator Anthology — Replay Any of the 17 Chants</h3>
                <p>Having reached Rapa Nui, you may launch any route chant across all three archipelagos directly.</p>
                <div class="replay-song-grid" id="masterReplayGrid"></div>
              </div>
            </div>
          </section>
        </main>
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

    // Tab switching
    this.rootEl.querySelectorAll('.poi-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Quick jump between Landing <-> Mentor Sanctuary
    this.rootEl
      .querySelector('#btnMeetMentorFromLanding')
      .addEventListener('click', () => {
        this.switchTab('sanctuary');
      });
    this.rootEl
      .querySelector('#btnGoToLandingFromSanctuary')
      .addEventListener('click', () => {
        this.switchTab('landing');
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
        this.closePortraitModal();
      }
    });

    // Difficulty selector
    this.rootEl
      .querySelector('#hubDifficultySelect')
      .addEventListener('change', (e) => {
        this.callbacks.onChangeDifficulty?.(e.target.value);
        this.refresh();
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
        this.refresh();
      });

    // Departure window buttons
    this.rootEl.querySelectorAll('.dep-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedDeparture = btn.getAttribute('data-window');
        this._refreshRoutePanel();
      });
    });

    // Launch Voyage button
    this.rootEl
      .querySelector('#btnLaunchVoyage')
      .addEventListener('click', () => {
        const song = this._getSelectedSongObject();
        if (song) {
          this.callbacks.onLaunchVoyage?.(song, this.selectedDeparture);
        }
      });

    // Redraw Sand button
    this.rootEl.querySelector('#btnRedrawSand').addEventListener('click', () => {
      this._renderSelectedShoreLesson(true);
    });

    // Speak with Mentor / Harvest Outpost button
    this.rootEl
      .querySelector('#btnSpeakMentor')
      .addEventListener('click', () => {
        this._triggerSanctuaryInteraction();
        this.refresh();
      });
  }

  _triggerSanctuaryInteraction() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;
    this.lastSanctuaryResult = interactWithIslandSanctuary(gs);
    const routes = getAvailableRoutesFromCurrentIsland(gs);
    if (routes.length > 0) {
      const newest = routes[routes.length - 1].song;
      this.selectedSongId = newest.id;
      this.selectedDeparture = newest.recommendedDeparture;
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

  show(initialTab = 'landing') {
    this.rootEl.classList.remove('hidden');
    this.closePortraitModal();
    this.lastSanctuaryResult = null;
    this.selectedSongId = null;
    this.switchTab(initialTab);
  }

  hide() {
    this.shoreSandCanvas.stopAnimation();
    this.closePortraitModal();
    this.rootEl.classList.add('hidden');
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this.rootEl.querySelectorAll('.poi-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    this.rootEl
      .querySelector('#panelLanding')
      .classList.toggle('hidden', tabId !== 'landing');
    this.rootEl
      .querySelector('#panelSand')
      .classList.toggle('hidden', tabId !== 'sand');
    this.rootEl
      .querySelector('#panelSanctuary')
      .classList.toggle('hidden', tabId !== 'sanctuary');

    if (tabId === 'sand') {
      this.refresh();
      this._renderSelectedShoreLesson(true);
    } else if (tabId === 'sanctuary') {
      if (!this.lastSanctuaryResult) {
        this._triggerSanctuaryInteraction();
      }
      this.refresh();
    } else {
      this.refresh();
    }
  }

  refresh() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;

    const isl = ISLANDS[gs.currentIslandId];
    const basin = OCEAN_BASINS[isl.basinId];

    // Header
    this.rootEl.querySelector('#hubActBadge').textContent =
      `Act ${basin.act} · ${basin.name} · ${Object.keys(gs.discoveredIslands).length}/16 Islands Charted`;
    this.rootEl.querySelector('#hubIslandName').textContent = isl.name;
    this.rootEl.querySelector('#hubIslandSubtitle').textContent =
      `${isl.subtitle}${isl.mentorName ? ` · Mentor: ${isl.mentorName}` : ' · Uninhabited Wild Atoll'}`;

    this.rootEl.querySelector('#hubDifficultySelect').value = gs.difficulty;

    // POI Tab titles from island POIs
    const [pLanding, pSand, pSanctuary] = isl.pois;
    this.rootEl.querySelector('#landingPoiTitle').textContent =
      POI_LABELS[pLanding] || 'Canoe Landing';
    if (pSand && isl.sandLessons.length > 0) {
      this.rootEl.querySelector('#tabBtnSand').style.display = 'inline-flex';
      this.rootEl.querySelector('#sandPoiTitle').textContent =
        POI_LABELS[pSand] || "Navigator's Teaching Sand";
    } else {
      this.rootEl.querySelector('#tabBtnSand').style.display = 'inline-flex';
    }
    const sanctKey = pSanctuary || pSand || pLanding;
    this.rootEl.querySelector('#tabBtnSanctuary').textContent = isl.inhabited
      ? `🌺 ${POI_LABELS[sanctKey] || 'Village & Marae'}`
      : `🌴 ${POI_LABELS[sanctKey] || 'Wild Outpost'}`;

    // Landing Mentor Banner (quick access to meet the mentor face-to-face)
    const landingBanner = this.rootEl.querySelector('#landingMentorBanner');
    if (isl.inhabited && isl.mentorPortrait) {
      landingBanner.classList.remove('hidden');
      const thumb = this.rootEl.querySelector('#landingMentorThumb');
      thumb.src = isl.mentorPortrait;
      thumb.alt = isl.mentorName;
      this.rootEl.querySelector('#landingMentorName').textContent = isl.mentorName;
      this.rootEl.querySelector('#landingMentorRole').textContent =
        isl.mentorRole || POI_LABELS[sanctKey] || '';
    } else {
      landingBanner.classList.add('hidden');
    }

    // Canoe Tier & Readiness Conditions (diegetic state descriptions rather than raw arcade meters)
    const tierNames = {
      1: 'Coastal Double-Hulled Vaka (4 Cargo Slots)',
      2: 'Raised-Strake Voyaging Vaka (6 Cargo Slots)',
      3: 'Deep-Ocean Vaka Moana (8 Cargo Slots)',
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
            : 'Worn — Careen Before Sailing';

    this.rootEl.querySelector('#hubConditionList').innerHTML = `
      <div class="cond-chip"><span>Twin Hulls</span><strong>${describeCond(gs.hullCondition)}</strong></div>
      <div class="cond-chip"><span>Pandanus Sail</span><strong>${describeCond(gs.sailCondition)}</strong></div>
      <div class="cond-chip"><span>Sennit Lashings</span><strong>${describeCond(gs.lashingsCondition)}</strong></div>
    `;

    // Cargo & Ration Baskets
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

    // Crew List
    const crewContainer = this.rootEl.querySelector('#hubCrewList');
    if (gs.assignedCrew.length === 0) {
      crewContainer.innerHTML =
        '<div class="empty-note">Sailing solo with your starter paddler (recruit specialists across the islands).</div>';
    } else {
      crewContainer.innerHTML = '';
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
    this._refreshSandLessonsList();
    this._refreshSanctuaryPanel();
  }

  _getAvailableRoutes() {
    const gs = this.callbacks.getGameState();
    return getAvailableRoutesFromCurrentIsland(gs);
  }

  _getSelectedSongObject() {
    const routes = this._getAvailableRoutes();
    if (!routes.length) return null;
    const match = routes.find((r) => r.song.id === this.selectedSongId);
    return match ? match.song : routes[0].song;
  }

  _refreshRoutePanel() {
    const gs = this.callbacks.getGameState();
    const routes = this._getAvailableRoutes();
    const listEl = this.rootEl.querySelector('#hubRouteList');

    if (!routes.length) {
      listEl.innerHTML =
        '<div class="empty-note">Visit the Village / Marae tab to meet the local mentor and learn the next route chant.</div>';
      this.rootEl.querySelector('#btnLaunchVoyage').disabled = true;
      return;
    }

    this.rootEl.querySelector('#btnLaunchVoyage').disabled = false;
    if (!this.selectedSongId || !routes.some((r) => r.song.id === this.selectedSongId)) {
      this.selectedSongId = routes[0].song.id;
      this.selectedDeparture = routes[0].song.recommendedDeparture;
    }

    listEl.innerHTML = '';
    for (const { song, isReturn } of routes) {
      const dst = ISLANDS[song.toIsland];
      const btn = document.createElement('button');
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
        this.selectedSongId = song.id;
        this.selectedDeparture = song.recommendedDeparture;
        this._refreshRoutePanel();
      });
      listEl.appendChild(btn);
    }

    const activeSong = this._getSelectedSongObject();
    this.rootEl.querySelector('#hubRecWindowHint').textContent = activeSong
      ? `(Chant sung for ${departureWindowLabel(activeSong.recommendedDeparture)})`
      : '';

    this.rootEl.querySelectorAll('.dep-btn').forEach((btn) => {
      const w = btn.getAttribute('data-window');
      btn.classList.toggle('selected', w === this.selectedDeparture);
      btn.classList.toggle(
        'recommended',
        activeSong && w === activeSong.recommendedDeparture
      );
    });

    const previewEl = this.rootEl.querySelector('#hubSongPreview');
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

  _refreshSandLessonsList() {
    const gs = this.callbacks.getGameState();
    const lessons = getLearnedSandLessonsList(gs);
    const listEl = this.rootEl.querySelector('#hubLessonList');
    listEl.innerHTML = '';

    const showcaseEl = this.rootEl.querySelector('#sandMentorShowcase');
    if (!lessons.length) {
      showcaseEl.classList.add('hidden');
      this._sandMentorIsland = null;
      return;
    }
    if (!this.selectedLessonId || !lessons.some((l) => l.id === this.selectedLessonId)) {
      this.selectedLessonId = lessons[0].id;
    }

    for (const les of lessons) {
      const btn = document.createElement('button');
      btn.className = `lesson-choice-btn ${les.id === this.selectedLessonId ? 'selected' : ''}`;
      btn.innerHTML = `<strong>${les.title}</strong><span>Taught by ${les.mentor}</span>`;
      btn.addEventListener('click', () => {
        this.selectedLessonId = les.id;
        this._refreshSandLessonsList();
        this._renderSelectedShoreLesson(true);
      });
      listEl.appendChild(btn);
    }

    const activeLesson =
      lessons.find((l) => l.id === this.selectedLessonId) || lessons[0];
    const mentorIsl = activeLesson ? ISLANDS[activeLesson.islandId] : null;
    if (mentorIsl?.mentorPortrait) {
      this._sandMentorIsland = mentorIsl;
      showcaseEl.classList.remove('hidden');
      const imgEl = this.rootEl.querySelector('#sandMentorImg');
      imgEl.src = mentorIsl.mentorPortrait;
      imgEl.alt = `${mentorIsl.mentorName} — ${mentorIsl.name}`;
      this.rootEl.querySelector('#sandMentorCardName').textContent =
        mentorIsl.mentorName;
      this.rootEl.querySelector('#sandMentorCardRole').textContent =
        `${mentorIsl.mentorRole} · ${mentorIsl.name}`;
    } else {
      this._sandMentorIsland = null;
      showcaseEl.classList.add('hidden');
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

  _refreshSanctuaryPanel() {
    const gs = this.callbacks.getGameState();
    const isl = ISLANDS[gs.currentIslandId];
    const [, , pSanct] = isl.pois;
    this.rootEl.querySelector('#sanctuaryPoiLabel').textContent =
      POI_LABELS[pSanct || isl.pois[isl.pois.length - 1]] || isl.name;

    // Full-Body Character Portrait Column
    const layoutEl = this.rootEl.querySelector('#sanctuaryEncounterLayout');
    const portraitPanel = this.rootEl.querySelector('#sanctuaryPortraitPanel');
    const speakBtn = this.rootEl.querySelector('#btnSpeakMentor');

    if (isl.inhabited && isl.mentorPortrait) {
      layoutEl.classList.remove('no-mentor');
      portraitPanel.classList.remove('hidden');
      const imgEl = this.rootEl.querySelector('#sanctuaryMentorImg');
      imgEl.src = isl.mentorPortrait;
      imgEl.alt = `${isl.mentorName} — full-body portrait in traditional attire on ${isl.name}`;
      this.rootEl.querySelector('#sanctuaryMentorName').textContent = isl.mentorName;
      this.rootEl.querySelector('#sanctuaryMentorRole').textContent =
        isl.mentorRole || isl.subtitle;
      speakBtn.textContent = this.lastSanctuaryResult
        ? `Speak Again with ${isl.mentorName}`
        : `Greet ${isl.mentorName}`;
    } else {
      layoutEl.classList.add('no-mentor');
      portraitPanel.classList.add('hidden');
      speakBtn.textContent = 'Harvest Wild Rookery & Shallows';
    }

    const res = this.lastSanctuaryResult || {
      title: isl.mentorName ? `${isl.mentorName} Awaits` : 'Uninhabited Lagoon Outpost',
      speech: isl.inhabited
        ? `Step forward to speak with ${isl.mentorName}, exchange island gifts, and receive the next star-path chant.`
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

    // Crewmate Encounter Card on islands that recruit a specialist companion (Taha'a, Ua Pou, Hiva Oa)
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

    // Master Replay Anthology box once Rapa Nui is completed
    const replayBox = this.rootEl.querySelector('#masterReplayBox');
    replayBox.classList.toggle('hidden', !gs.masterReplayUnlocked);
    if (gs.masterReplayUnlocked) {
      const grid = this.rootEl.querySelector('#masterReplayGrid');
      grid.innerHTML = '';
      for (const song of Object.values(SONGS)) {
        const b = document.createElement('button');
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
}
