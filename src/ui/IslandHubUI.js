/**
 * Scenic Island Hub & Coastal POI UI for Kavenga: Songs of the Star Path.
 * Presents the 3 ashore tabs / POIs for each of the 16 islands:
 *   1. Canoe Landing & Launch (Canoe Careening, Ration & Cargo Baskets, Crew, Departure Window, Set Sail)
 *   2. Navigator's Shore (Animated Stick-in-the-Sand Teaching Canvas & Mentor Narration)
 *   3. Village / Marae / Wild Outpost (Story Trades, Upgrades, Consecrations & Master Replay)
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

          <!-- TAB 3: VILLAGE / MARAE / WILD OUTPOST -->
          <section class="hub-panel hidden" id="panelSanctuary">
            <div class="hub-card sanctuary-card">
              <div class="sanctuary-eyebrow" id="sanctuaryPoiLabel"></div>
              <h2 id="sanctuaryTitle"></h2>
              <p class="sanctuary-speech" id="sanctuarySpeech"></p>
              <ul class="sanctuary-rewards" id="sanctuaryRewards"></ul>
              <div class="sanctuary-actions">
                <button class="primary-btn" id="btnSpeakMentor">Greet Mentor / Harvest Shore</button>
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
        const gs = this.callbacks.getGameState();
        this.lastSanctuaryResult = interactWithIslandSanctuary(gs);
        // Auto-select newly unlocked song if available
        const routes = getAvailableRoutesFromCurrentIsland(gs);
        if (routes.length > 0) {
          const newest = routes[routes.length - 1].song;
          this.selectedSongId = newest.id;
          this.selectedDeparture = newest.recommendedDeparture;
        }
        this.refresh();
      });
  }

  show() {
    this.rootEl.classList.remove('hidden');
    this.lastSanctuaryResult = null;
    this.selectedSongId = null;
    this.activeTab = 'landing';
    this.refresh();
  }

  hide() {
    this.shoreSandCanvas.stopAnimation();
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
      this._renderSelectedShoreLesson(true);
    } else if (tabId === 'sanctuary' && !this.lastSanctuaryResult) {
      const gs = this.callbacks.getGameState();
      this.lastSanctuaryResult = interactWithIslandSanctuary(gs);
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
      crewContainer.innerHTML = gs.assignedCrew
        .map((crId) => {
          const cr = CREW_CATALOG[crId];
          return `<div class="crew-pill"><strong>${cr.name} · ${cr.role}</strong><span>${cr.traitText}</span></div>`;
        })
        .join('');
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
        '<div class="empty-note">Visit the Village / Marae tab to learn the next route chant.</div>';
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

    if (!lessons.length) {
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
