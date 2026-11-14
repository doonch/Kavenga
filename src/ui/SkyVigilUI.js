/**
 * Grounded On-Shore Observatory & Guided Sky Tutorial UI:
 * The Star-Stone Vigil (Ahu Feti'a).
 *
 * Features:
 * - Dual-Hemisphere Star Masters: First Master Tera'i (Maupiti) & Keeper Akura (Kiritimati)
 * - Instant Island Sky Switcher across all 16 islands (matches each island's exact latitude)
 * - 3 Modes: Master's Lessons (4 chapters per Master), Constellation Atlas (all 10 animals),
 *   and a 100% Optional "Wayfinder's Eye" Sight-Alignment Practice Trial
 * - Continuous Nocturnal Time Scrubber & Night-Wheel Spin + Chalk/Label Layer Toggles
 * - Strictly Zero-Compass & Zero-Degrees in all player-facing text
 */

import * as THREE from 'three';
import {
  CONSTELLATIONS,
  HORIZON_HOUSES,
  NAVIGATION_STARS,
} from '../data/constellationsData.js';
import { ISLANDS, OCEAN_BASINS } from '../data/islandsData.js';
import {
  CONSTELLATION_GUIDE,
  STAR_MASTERS,
  getQuizPromptsForMaster,
} from '../data/skyVigilData.js';
import { altAzToDirectionVec3 } from '../simulation/celestialSim.js';

const NOCTURNAL_MIN_SLIDER = 18.4; // Evening Dusk (18.4h)
const NOCTURNAL_MAX_SLIDER = 29.6; // Pre-Dawn (5.6h next morning)
const ALIGN_THRESHOLD_DEG = 11.2;
const QUIZ_HOLD_SEC = 0.62;

function hourToNocturnalSlider(solarHour) {
  const h = ((solarHour % 24.0) + 24.0) % 24.0;
  const unwrapped = h < 12.0 ? h + 24.0 : h;
  return Math.max(NOCTURNAL_MIN_SLIDER, Math.min(NOCTURNAL_MAX_SLIDER, unwrapped));
}

function describeNightWatch(sliderVal) {
  if (sliderVal < 19.45) return 'Evening Twilight';
  if (sliderVal < 21.85) return 'First Star Watch';
  if (sliderVal < 24.85) return 'Deep Midnight Watch';
  if (sliderVal < 27.85) return 'Late Star Watch';
  return 'Pre-Dawn Glow';
}

export class SkyVigilUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;

    this.activeMasterId = 'terai';
    this.activeIslandId = 'maupiti';
    this.mode = 'lessons'; // 'lessons' | 'atlas' | 'quiz'
    this.chapterIndex = 0;
    this.sightedChapters = new Set();

    // Atlas state
    this.selectedConstellationId = 'the_bull';

    // Optional Eye Trial (Quiz) state
    this.quizIndex = 0;
    this.quizHoldSec = 0.0;
    this.quizResolved = false;
    this.quizRevealedByHelper = false;
    this.quizPeekHints = false;
    this.quizScore = 0;
    this.quizStreak = 0;

    // Layer toggles & nocturnal clock
    this.showLines = true;
    this.showStarLabels = true;
    this.showStoneLabels = true;
    this.spinMode = 0; // 0 = still, 1 = gentle wheel, 2 = swift wheel
    this.sliderHour = 20.3;

    // Reusable gaze vectors
    this._gazeVec = new THREE.Vector3();
    this._lastTargetDeg = 90.0;
    this._chapterChimePlayedFor = null;

    this._buildDOM();
  }

  _buildDOM() {
    // Build Island Sky options grouped by Act without forbidden compass words
    const act12Options = [];
    const act3Options = [];
    for (const isl of Object.values(ISLANDS)) {
      const basin = OCEAN_BASINS[isl.basinId];
      const starBadge = isl.starMasterId ? ' ✦ Star Ring' : '';
      const optHtml = `<option value="${isl.id}">${isl.name}${starBadge} (Act ${basin.act})</option>`;
      if (basin.act === 3) {
        act3Options.push(optHtml);
      } else {
        act12Options.push(optHtml);
      }
    }

    this.rootEl.innerHTML = `
      <!-- Subtle Center Sighting Ring for Lessons & Eye Trial -->
      <div class="vigil-sight-reticle" id="vigilSightReticle">
        <div class="vigil-reticle-ring" id="vigilReticleRing"></div>
        <div class="vigil-reticle-dot"></div>
      </div>

      <!-- Top Bar: Ring Title, Master & Island Sky Switchers, Mode Tabs, Return -->
      <header class="vigil-top-bar">
        <div class="vigil-title-cluster">
          <div class="vigil-ring-eyebrow" id="vigilRealmBadge"></div>
          <h2 class="vigil-ring-title" id="vigilRingTitle"></h2>
        </div>

        <div class="vigil-switcher-cluster">
          <div class="vigil-master-pills" role="group" aria-label="Choose Star Master">
            <button class="vigil-pill-btn active" id="btnVigilMasterTerai" type="button" title="Jump to First Master Tera'i on Maupiti">
              🐢 Tera'i · Maupiti
            </button>
            <button class="vigil-pill-btn" id="btnVigilMasterAkura" type="button" title="Jump to Keeper Akura on Kiritimati">
              ✦ Akura · Kiritimati
            </button>
          </div>

          <label class="vigil-island-picker" title="Preview the exact night sky seen from any of the 16 islands">
            <span>Island Sky:</span>
            <select id="vigilIslandSelect">
              <optgroup label="Realm of the Sea Turtle's Pivot (Acts I–II)">
                ${act12Options.join('')}
              </optgroup>
              <optgroup label="Realm of the Steadfast Peg (Act III)">
                ${act3Options.join('')}
              </optgroup>
            </select>
          </label>
        </div>

        <div class="vigil-mode-tabs" role="tablist">
          <button class="vigil-mode-btn active" data-mode="lessons" type="button">📖 Master's Lessons</button>
          <button class="vigil-mode-btn" data-mode="atlas" type="button">🌌 Constellation Atlas</button>
          <button class="vigil-mode-btn" data-mode="quiz" type="button">🎯 Optional Eye Trial</button>
        </div>

        <button class="hud-icon-btn vigil-exit-btn" id="btnVigilReturnShore" type="button">
          ← Return to Shore
        </button>
      </header>

      <!-- Bottom Workspace: Left Teaching/Atlas/Quiz Card + Right Sky & Time Controls -->
      <div class="vigil-bottom-deck">
        <!-- LEFT PANEL -->
        <section class="vigil-main-card" id="vigilMainCard">
          <!-- MODE 1: GUIDED LESSONS -->
          <div class="vigil-pane" id="vigilPaneLessons">
            <div class="vigil-mentor-row">
              <button class="vigil-mentor-thumb-btn" id="btnVigilEnlargeMentor" type="button" title="Click to inspect full-body portrait">
                <img class="vigil-mentor-thumb" id="vigilMentorImg" alt="" />
              </button>
              <div class="vigil-mentor-head">
                <div class="vigil-chapter-steps" id="vigilChapterSteps"></div>
                <h3 class="vigil-card-heading" id="vigilLessonTitle"></h3>
                <div class="vigil-mentor-byline" id="vigilMentorByline"></div>
              </div>
            </div>

            <p class="vigil-speech" id="vigilLessonSpeech"></p>
            <div class="vigil-hint-line" id="vigilLessonHint"></div>

            <div class="vigil-action-bar">
              <div class="vigil-sight-status" id="vigilLessonSightBadge"></div>
              <div class="vigil-action-btns">
                <button class="secondary-btn small-btn" id="btnVigilPointTarget" type="button">
                  ✦ Look Where Master Points
                </button>
                <button class="secondary-btn small-btn" id="btnVigilPrevChapter" type="button">← Prev</button>
                <button class="primary-btn small-btn" id="btnVigilNextChapter" type="button">Next Lesson →</button>
              </div>
            </div>
          </div>

          <!-- MODE 2: CONSTELLATION ATLAS -->
          <div class="vigil-pane hidden" id="vigilPaneAtlas">
            <div class="vigil-atlas-header">
              <div>
                <span class="vigil-eyebrow">Ten Ancestral Sky Animals</span>
                <h3 class="vigil-card-heading" id="vigilAtlasTitle"></h3>
              </div>
              <span class="vigil-status-pill" id="vigilAtlasStatusPill"></span>
            </div>

            <div class="vigil-constellation-chips" id="vigilConstellationChips"></div>

            <p class="vigil-speech vigil-atlas-note" id="vigilAtlasNote"></p>
            <div class="vigil-star-roster" id="vigilAtlasStarRoster"></div>

            <div class="vigil-action-bar">
              <span class="vigil-drag-tip">Drag the sky or press W/A/S/D or I/J/K/L to look freely</span>
              <button class="secondary-btn small-btn" id="btnVigilPanAtlas" type="button">
                ✦ Turn Gaze to Constellation
              </button>
            </div>
          </div>

          <!-- MODE 3: OPTIONAL WAYFINDER'S EYE TRIAL -->
          <div class="vigil-pane hidden" id="vigilPaneQuiz">
            <div class="vigil-quiz-top">
              <div>
                <span class="vigil-eyebrow">100% Optional Memory Practice · Never Required for Story</span>
                <h3 class="vigil-card-heading" id="vigilQuizHeading">Wayfinder's Eye Trial</h3>
              </div>
              <div class="vigil-quiz-tally" id="vigilQuizTally"></div>
            </div>

            <p class="vigil-speech" id="vigilQuizPrompt"></p>

            <div class="vigil-quiz-meter-wrap">
              <div class="vigil-quiz-meter-bar" id="vigilQuizMeterBar"></div>
            </div>
            <div class="vigil-hint-line" id="vigilQuizFeedback"></div>

            <div class="vigil-action-bar">
              <button class="secondary-btn small-btn" id="btnVigilQuizPeek" type="button">
                Peek Sky Hints: Off
              </button>
              <div class="vigil-action-btns">
                <button class="secondary-btn small-btn" id="btnVigilQuizShowMe" type="button">
                  Show Me Where It Sits
                </button>
                <button class="primary-btn small-btn" id="btnVigilQuizNext" type="button">
                  Next Star Prompt →
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: NIGHT TIME SCRUBBER & SKY LAYER TOGGLES -->
        <aside class="vigil-controls-card">
          <div class="vigil-time-header">
            <div>
              <span class="vigil-eyebrow">Wheel of the Night Dome</span>
              <strong class="vigil-watch-label" id="vigilWatchLabel">First Star Watch</strong>
            </div>
            <button class="secondary-btn small-btn" id="btnVigilSpinToggle" type="button">
              ▶ Turn Night
            </button>
          </div>

          <input
            type="range"
            class="vigil-time-slider"
            id="vigilTimeSlider"
            min="18.4"
            max="29.6"
            step="0.03"
            value="20.3"
            aria-label="Scrub night sky from evening dusk to pre-dawn"
          />
          <div class="vigil-slider-ends">
            <span>Dusk</span>
            <span>Midnight</span>
            <span>Pre-Dawn</span>
          </div>

          <div class="vigil-layer-toggles">
            <button class="vigil-toggle-chip active" id="btnToggleVigilLines" type="button">
              ✦ Chalk Lines
            </button>
            <button class="vigil-toggle-chip active" id="btnToggleVigilStarNames" type="button">
              ✦ Star Names
            </button>
            <button class="vigil-toggle-chip active" id="btnToggleVigilStones" type="button">
              ✦ Stone Houses
            </button>
            <button class="vigil-toggle-chip" id="btnVigilLookZenith" type="button" title="Tilt gaze straight overhead to inspect zenith stars">
              ↑ Mast-Top Zenith
            </button>
          </div>
        </aside>
      </div>

      <!-- Full-Body Star Master Portrait Modal inside Vigil -->
      <div class="modal-backdrop hidden" id="vigilPortraitModal">
        <div class="mentor-lightbox-card">
          <div class="mentor-lightbox-header">
            <div>
              <div class="sanctuary-eyebrow" id="vigilModalEyebrow"></div>
              <h3 id="vigilModalName"></h3>
              <p class="mentor-lightbox-role" id="vigilModalRole"></p>
            </div>
            <button class="secondary-btn small-btn" id="btnCloseVigilModal" type="button">Close</button>
          </div>
          <div class="mentor-lightbox-stage">
            <img class="mentor-lightbox-img" id="vigilModalImg" alt="" />
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
    this._buildAtlasChips();
  }

  _bindEvents() {
    // Master Switchers
    this.rootEl
      .querySelector('#btnVigilMasterTerai')
      .addEventListener('click', () => {
        this.selectMasterAndIsland('terai', 'maupiti', true);
      });
    this.rootEl
      .querySelector('#btnVigilMasterAkura')
      .addEventListener('click', () => {
        this.selectMasterAndIsland('akura', 'kiritimati', true);
      });

    // Island Sky Picker (all 16 islands)
    this.rootEl
      .querySelector('#vigilIslandSelect')
      .addEventListener('change', (e) => {
        const islId = e.target.value;
        const isl = ISLANDS[islId];
        if (!isl) return;
        const pairedMaster = isl.latDeg > 0 ? 'akura' : 'terai';
        this.selectMasterAndIsland(pairedMaster, islId, false);
      });

    // Mode Tabs
    this.rootEl.querySelectorAll('.vigil-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setMode(btn.getAttribute('data-mode'));
      });
    });

    // Return to Shore
    this.rootEl
      .querySelector('#btnVigilReturnShore')
      .addEventListener('click', () => {
        this.callbacks.onExitVigil?.();
      });

    // Lesson actions
    this.rootEl
      .querySelector('#btnVigilPointTarget')
      .addEventListener('click', () => {
        this.panToActiveLessonTarget();
      });
    this.rootEl
      .querySelector('#btnVigilPrevChapter')
      .addEventListener('click', () => {
        if (this.chapterIndex > 0) {
          this.setChapter(this.chapterIndex - 1, true);
        }
      });
    this.rootEl
      .querySelector('#btnVigilNextChapter')
      .addEventListener('click', () => {
        const chapters = STAR_MASTERS[this.activeMasterId].chapters;
        if (this.chapterIndex < chapters.length - 1) {
          this.setChapter(this.chapterIndex + 1, true);
        } else {
          this.setMode('atlas');
        }
      });

    // Atlas pan
    this.rootEl
      .querySelector('#btnVigilPanAtlas')
      .addEventListener('click', () => {
        this.panToSelectedConstellation();
      });

    // Quiz actions
    this.rootEl
      .querySelector('#btnVigilQuizPeek')
      .addEventListener('click', () => {
        this.quizPeekHints = !this.quizPeekHints;
        this._refreshQuizDOM();
      });
    this.rootEl
      .querySelector('#btnVigilQuizShowMe')
      .addEventListener('click', () => {
        this._revealAndPanCurrentQuizPrompt();
      });
    this.rootEl
      .querySelector('#btnVigilQuizNext')
      .addEventListener('click', () => {
        const pool = getQuizPromptsForMaster(this.activeMasterId);
        this.setQuizPrompt((this.quizIndex + 1) % pool.length);
      });

    // Night Time Slider & Spin Toggle
    const slider = this.rootEl.querySelector('#vigilTimeSlider');
    slider.addEventListener('input', (e) => {
      this.spinMode = 0;
      this.sliderHour = Number(e.target.value);
      this._applySliderHourToSim();
      this._refreshControlsDOM();
      if (this.mode === 'atlas') {
        this._refreshAtlasDOM();
      }
    });

    this.rootEl
      .querySelector('#btnVigilSpinToggle')
      .addEventListener('click', () => {
        this.spinMode = (this.spinMode + 1) % 3;
        this._refreshControlsDOM();
      });

    // Layer Toggles
    this.rootEl
      .querySelector('#btnToggleVigilLines')
      .addEventListener('click', () => {
        this.showLines = !this.showLines;
        if (this.mode === 'quiz') this.quizPeekHints = true;
        this._refreshControlsDOM();
      });
    this.rootEl
      .querySelector('#btnToggleVigilStarNames')
      .addEventListener('click', () => {
        this.showStarLabels = !this.showStarLabels;
        if (this.mode === 'quiz') this.quizPeekHints = true;
        this._refreshControlsDOM();
      });
    this.rootEl
      .querySelector('#btnToggleVigilStones')
      .addEventListener('click', () => {
        this.showStoneLabels = !this.showStoneLabels;
        if (this.mode === 'quiz') this.quizPeekHints = true;
        this._refreshControlsDOM();
      });
    this.rootEl
      .querySelector('#btnVigilLookZenith')
      .addEventListener('click', () => {
        const camCtrl = this.callbacks.getCameraCtrl?.();
        const sim = this.callbacks.getOceanSim?.();
        if (camCtrl) {
          camCtrl.panToAltAz(86.0, sim?.headingDeg ?? 0.0, sim?.headingDeg ?? 0.0);
        }
      });

    // Portrait Lightbox
    this.rootEl
      .querySelector('#btnVigilEnlargeMentor')
      .addEventListener('click', () => {
        const master = STAR_MASTERS[this.activeMasterId];
        this.rootEl.querySelector('#vigilModalEyebrow').textContent =
          `${master.ringTitle} · ${master.skyRealmLabel}`;
        this.rootEl.querySelector('#vigilModalName').textContent = master.mentorName;
        this.rootEl.querySelector('#vigilModalRole').textContent = master.mentorRole;
        const img = this.rootEl.querySelector('#vigilModalImg');
        img.src = master.portrait;
        img.alt = master.mentorName;
        this.rootEl.querySelector('#vigilPortraitModal').classList.remove('hidden');
      });
    this.rootEl
      .querySelector('#btnCloseVigilModal')
      .addEventListener('click', () => {
        this.rootEl.querySelector('#vigilPortraitModal').classList.add('hidden');
      });
    this.rootEl
      .querySelector('#vigilPortraitModal')
      .addEventListener('click', (e) => {
        if (e.target.id === 'vigilPortraitModal') {
          this.rootEl.querySelector('#vigilPortraitModal').classList.add('hidden');
        }
      });
  }

  _buildAtlasChips() {
    const wrap = this.rootEl.querySelector('#vigilConstellationChips');
    wrap.innerHTML = '';
    for (const c of CONSTELLATIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vigil-const-chip';
      btn.setAttribute('data-const-id', c.id);
      btn.textContent = c.name;
      btn.addEventListener('click', () => {
        this.selectConstellation(c.id, true);
      });
      wrap.appendChild(btn);
    }
  }

  show({ masterId = 'terai', islandId = null, mode = 'lessons', chapterIndex = 0 } = {}) {
    this.rootEl.classList.remove('hidden');
    this.rootEl.querySelector('#vigilPortraitModal').classList.add('hidden');
    const resolvedMaster = STAR_MASTERS[masterId] ? masterId : 'terai';
    const resolvedIsland =
      islandId && ISLANDS[islandId]
        ? islandId
        : STAR_MASTERS[resolvedMaster].islandId;

    this.mode = ['lessons', 'atlas', 'quiz'].includes(mode) ? mode : 'lessons';
    this.chapterIndex = chapterIndex || 0;
    this.selectMasterAndIsland(resolvedMaster, resolvedIsland, true);
  }

  hide() {
    this.spinMode = 0;
    this.rootEl.querySelector('#vigilPortraitModal')?.classList.add('hidden');
    this.rootEl.classList.add('hidden');
  }

  selectMasterAndIsland(masterId, islandId, autoPan = true) {
    this.activeMasterId = STAR_MASTERS[masterId] ? masterId : 'terai';
    const master = STAR_MASTERS[this.activeMasterId];
    this.activeIslandId =
      islandId && ISLANDS[islandId] ? islandId : master.islandId;

    const sim = this.callbacks.getOceanSim?.();
    if (sim) {
      sim.headingDeg = 0.0;
      sim.setShoreIsland(this.activeIslandId);
    }

    // Clamp chapter & quiz indices
    if (this.chapterIndex >= master.chapters.length) {
      this.chapterIndex = 0;
    }
    this.quizIndex = 0;

    this._syncHeaderDOM();
    if (this.mode === 'lessons') {
      this.setChapter(this.chapterIndex, autoPan);
    } else if (this.mode === 'atlas') {
      this.selectConstellation(this.selectedConstellationId, autoPan);
    } else {
      this.setQuizPrompt(0);
    }
    this._refreshControlsDOM();
  }

  setMode(nextMode) {
    if (!['lessons', 'atlas', 'quiz'].includes(nextMode)) return;
    this.mode = nextMode;
    this.spinMode = 0;

    this.rootEl.querySelectorAll('.vigil-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === nextMode);
    });
    this.rootEl
      .querySelector('#vigilPaneLessons')
      .classList.toggle('hidden', nextMode !== 'lessons');
    this.rootEl
      .querySelector('#vigilPaneAtlas')
      .classList.toggle('hidden', nextMode !== 'atlas');
    this.rootEl
      .querySelector('#vigilPaneQuiz')
      .classList.toggle('hidden', nextMode !== 'quiz');

    if (nextMode === 'lessons') {
      this.setChapter(this.chapterIndex, true);
    } else if (nextMode === 'atlas') {
      this.selectConstellation(this.selectedConstellationId, true);
    } else {
      this.quizPeekHints = false;
      this.setQuizPrompt(this.quizIndex);
    }
    this._refreshControlsDOM();
  }

  setChapter(index, autoPan = true) {
    const master = STAR_MASTERS[this.activeMasterId];
    this.chapterIndex = Math.max(0, Math.min(master.chapters.length - 1, index));
    this._chapterChimePlayedFor = null;
    const ch = master.chapters[this.chapterIndex];

    const sim = this.callbacks.getOceanSim?.();
    if (sim) {
      sim.solarRaDeg = ch.solarRaDeg;
      this.sliderHour = hourToNocturnalSlider(ch.solarHour);
      sim.solarHour = this.sliderHour % 24.0;
      sim._refreshEnvironment(0);
    }

    this._refreshLessonDOM();
    this._refreshControlsDOM();
    if (autoPan) {
      this.panToActiveLessonTarget();
    }
  }

  panToActiveLessonTarget() {
    const master = STAR_MASTERS[this.activeMasterId];
    const ch = master.chapters[this.chapterIndex];
    const sim = this.callbacks.getOceanSim?.();
    const camCtrl = this.callbacks.getCameraCtrl?.();
    if (!sim || !camCtrl || !ch) return;

    if (ch.promptTarget?.type === 'star') {
      const st = sim.starsState[ch.promptTarget.id];
      if (st && st.altDeg > -4.0) {
        camCtrl.panToAltAz(Math.max(4.0, st.altDeg), st.azDeg, sim.headingDeg);
        return;
      }
    }
    const house = HORIZON_HOUSES.find((h) => h.id === ch.highlightHouseId);
    if (house) {
      camCtrl.panToAltAz(8.0, house.engineAzDeg, sim.headingDeg);
    }
  }

  selectConstellation(constId, autoPan = true) {
    const guide = CONSTELLATION_GUIDE[constId] || CONSTELLATION_GUIDE.the_bull;
    this.selectedConstellationId = guide.id;

    const sim = this.callbacks.getOceanSim?.();
    if (sim) {
      sim.solarRaDeg = guide.bestSolarRaDeg;
      this.sliderHour = hourToNocturnalSlider(guide.bestSolarHour);
      sim.solarHour = this.sliderHour % 24.0;
      sim._refreshEnvironment(0);
    }

    this._refreshAtlasDOM();
    this._refreshControlsDOM();
    if (autoPan) {
      this.panToSelectedConstellation();
    }
  }

  panToSelectedConstellation() {
    const guide = CONSTELLATION_GUIDE[this.selectedConstellationId];
    const sim = this.callbacks.getOceanSim?.();
    const camCtrl = this.callbacks.getCameraCtrl?.();
    if (!guide || !sim || !camCtrl) return;

    const focusState = sim.starsState[guide.focusStarId];
    if (focusState && focusState.altDeg > 1.0) {
      camCtrl.panToAltAz(focusState.altDeg, focusState.azDeg, sim.headingDeg);
      return;
    }

    // Fallback: any visible star of this constellation, else its Horizon Stone
    const memberStars = Object.values(NAVIGATION_STARS).filter(
      (s) => s.constellation === guide.id
    );
    let bestStar = null;
    for (const ms of memberStars) {
      const st = sim.starsState[ms.id];
      if (st && st.altDeg > 1.0 && (!bestStar || st.altDeg > bestStar.altDeg)) {
        bestStar = st;
      }
    }
    if (bestStar) {
      camCtrl.panToAltAz(bestStar.altDeg, bestStar.azDeg, sim.headingDeg);
      return;
    }

    const house = HORIZON_HOUSES.find((h) => h.id === guide.houseId);
    if (house) {
      camCtrl.panToAltAz(6.0, house.engineAzDeg, sim.headingDeg);
    }
  }

  setQuizPrompt(index) {
    const pool = getQuizPromptsForMaster(this.activeMasterId);
    this.quizIndex = ((index % pool.length) + pool.length) % pool.length;
    this.quizHoldSec = 0.0;
    this.quizResolved = false;
    this.quizRevealedByHelper = false;

    const q = pool[this.quizIndex];
    const sim = this.callbacks.getOceanSim?.();
    if (sim && q) {
      sim.solarRaDeg = q.solarRaDeg;
      this.sliderHour = hourToNocturnalSlider(q.solarHour);
      sim.solarHour = this.sliderHour % 24.0;
      sim._refreshEnvironment(0);
    }

    this._refreshQuizDOM();
    this._refreshControlsDOM();
  }

  _revealAndPanCurrentQuizPrompt() {
    const pool = getQuizPromptsForMaster(this.activeMasterId);
    const q = pool[this.quizIndex];
    const sim = this.callbacks.getOceanSim?.();
    const camCtrl = this.callbacks.getCameraCtrl?.();
    if (!q || !sim || !camCtrl) return;

    this.quizResolved = true;
    this.quizRevealedByHelper = true;
    this.quizStreak = 0;

    if (q.type === 'star') {
      const st = sim.starsState[q.targetId];
      if (st) {
        camCtrl.panToAltAz(Math.max(4.0, st.altDeg), st.azDeg, sim.headingDeg);
      }
    } else {
      const house = HORIZON_HOUSES.find((h) => h.id === q.targetId);
      if (house) {
        camCtrl.panToAltAz(5.0, house.engineAzDeg, sim.headingDeg);
      }
    }
    this._refreshQuizDOM();
  }

  _applySliderHourToSim() {
    const sim = this.callbacks.getOceanSim?.();
    if (!sim) return;
    sim.solarHour = this.sliderHour % 24.0;
    sim._refreshEnvironment(0);
  }

  _syncHeaderDOM() {
    const master = STAR_MASTERS[this.activeMasterId];
    const isl = ISLANDS[this.activeIslandId];
    const isHomeRing = this.activeIslandId === master.islandId;

    this.rootEl.querySelector('#vigilRealmBadge').textContent =
      `Observing Sky From ${isl.name} · ${master.skyRealmLabel}`;
    this.rootEl.querySelector('#vigilRingTitle').textContent = isHomeRing
      ? master.ringTitle
      : `${isl.name} Shore Sky · Guided by ${master.mentorName}`;

    this.rootEl
      .querySelector('#btnVigilMasterTerai')
      .classList.toggle(
        'active',
        this.activeMasterId === 'terai' && this.activeIslandId === 'maupiti'
      );
    this.rootEl
      .querySelector('#btnVigilMasterAkura')
      .classList.toggle(
        'active',
        this.activeMasterId === 'akura' && this.activeIslandId === 'kiritimati'
      );
    this.rootEl.querySelector('#vigilIslandSelect').value = this.activeIslandId;
  }

  _refreshLessonDOM() {
    const master = STAR_MASTERS[this.activeMasterId];
    const ch = master.chapters[this.chapterIndex];

    const img = this.rootEl.querySelector('#vigilMentorImg');
    img.src = master.portrait;
    img.alt = master.mentorName;

    const stepsEl = this.rootEl.querySelector('#vigilChapterSteps');
    stepsEl.innerHTML = '';
    master.chapters.forEach((item, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      const done = this.sightedChapters.has(item.id);
      b.className = `vigil-step-dot ${idx === this.chapterIndex ? 'active' : ''} ${done ? 'sighted' : ''}`;
      b.textContent = done ? `✦ ${item.number}` : `Lesson ${item.number}`;
      b.addEventListener('click', () => this.setChapter(idx, true));
      stepsEl.appendChild(b);
    });

    this.rootEl.querySelector('#vigilLessonTitle').textContent =
      `${ch.number}. ${ch.title}`;
    this.rootEl.querySelector('#vigilMentorByline').textContent =
      `${master.mentorName} · ${master.mentorRole}`;
    this.rootEl.querySelector('#vigilLessonSpeech').textContent = ch.speech;
    this.rootEl.querySelector('#vigilLessonHint').textContent = ch.hint;

    this.rootEl.querySelector('#btnVigilPrevChapter').disabled =
      this.chapterIndex === 0;
    this.rootEl.querySelector('#btnVigilNextChapter').textContent =
      this.chapterIndex < master.chapters.length - 1
        ? 'Next Lesson →'
        : 'Open Constellation Atlas →';
  }

  _refreshAtlasDOM() {
    const guide = CONSTELLATION_GUIDE[this.selectedConstellationId];
    const constObj = CONSTELLATIONS.find((c) => c.id === guide.id);
    const sim = this.callbacks.getOceanSim?.();

    this.rootEl.querySelectorAll('.vigil-const-chip').forEach((chip) => {
      chip.classList.toggle(
        'active',
        chip.getAttribute('data-const-id') === guide.id
      );
    });

    this.rootEl.querySelector('#vigilAtlasTitle').textContent =
      constObj?.name || guide.id;
    this.rootEl.querySelector('#vigilAtlasStatusPill').textContent =
      this.activeMasterId === 'akura' ? guide.akuraStatus : guide.teraiStatus;
    this.rootEl.querySelector('#vigilAtlasNote').textContent =
      this.activeMasterId === 'akura' ? guide.akuraNote : guide.teraiNote;

    const rosterEl = this.rootEl.querySelector('#vigilAtlasStarRoster');
    const stars = Object.values(NAVIGATION_STARS).filter(
      (s) => s.constellation === guide.id
    );
    rosterEl.innerHTML = stars
      .map((st) => {
        const state = sim?.starsState?.[st.id];
        const above = state && state.altDeg > 0.8;
        return `<span class="vigil-star-pill ${above ? 'visible-now' : 'below-sea'}">
          ${above ? '✦' : '◌'} ${st.name} <em>${above ? 'Above Horizon' : 'Below Sea'}</em>
        </span>`;
      })
      .join('');
  }

  _refreshQuizDOM() {
    const pool = getQuizPromptsForMaster(this.activeMasterId);
    const q = pool[this.quizIndex];

    this.rootEl.querySelector('#vigilQuizTally').textContent =
      `Sighted: ${this.quizScore} · Streak: ${this.quizStreak}`;
    this.rootEl.querySelector('#vigilQuizPrompt').textContent = q.prompt;

    const peekBtn = this.rootEl.querySelector('#btnVigilQuizPeek');
    peekBtn.textContent = `Peek Sky Hints: ${this.quizPeekHints ? 'On' : 'Off'}`;
    peekBtn.classList.toggle('active-peek', this.quizPeekHints);

    const feedbackEl = this.rootEl.querySelector('#vigilQuizFeedback');
    if (this.quizResolved) {
      feedbackEl.textContent = this.quizRevealedByHelper
        ? `Master's Pointer: Study where it sits in the dome, then try the next prompt whenever you wish.`
        : `✦ ${q.successNote}`;
      feedbackEl.classList.add('sighted-ok');
    } else {
      feedbackEl.textContent =
        'Turn the night dome to center the target inside your sight ring and hold steady for a heartbeat.';
      feedbackEl.classList.remove('sighted-ok');
    }
  }

  _refreshControlsDOM() {
    const slider = this.rootEl.querySelector('#vigilTimeSlider');
    slider.value = String(this.sliderHour.toFixed(2));
    this.rootEl.querySelector('#vigilWatchLabel').textContent =
      describeNightWatch(this.sliderHour);

    const spinBtn = this.rootEl.querySelector('#btnVigilSpinToggle');
    if (this.spinMode === 0) {
      spinBtn.textContent = '▶ Turn Night';
      spinBtn.classList.remove('active-spin');
    } else if (this.spinMode === 1) {
      spinBtn.textContent = '❚❚ Gentle Wheel';
      spinBtn.classList.add('active-spin');
    } else {
      spinBtn.textContent = '❚❚ Swift Wheel';
      spinBtn.classList.add('active-spin');
    }

    const effectiveLines =
      this.mode === 'quiz' ? this.quizPeekHints && this.showLines : this.showLines;
    const effectiveLabels =
      this.mode === 'quiz'
        ? this.quizPeekHints && this.showStarLabels
        : this.showStarLabels;
    const effectiveStones =
      this.mode === 'quiz'
        ? this.quizPeekHints && this.showStoneLabels
        : this.showStoneLabels;

    this.rootEl
      .querySelector('#btnToggleVigilLines')
      .classList.toggle('active', effectiveLines);
    this.rootEl
      .querySelector('#btnToggleVigilStarNames')
      .classList.toggle('active', effectiveLabels);
    this.rootEl
      .querySelector('#btnToggleVigilStones')
      .classList.toggle('active', effectiveStones);
  }

  /**
   * Computes angular distance in degrees between camera gaze and a star or horizon stone.
   */
  _measureAngleToTarget(target, oceanSim, cameraCtrl) {
    if (!target || !oceanSim || !cameraCtrl) return 180.0;
    cameraCtrl.getGazeWorldDir(this._gazeVec);

    let dir = null;
    if (target.type === 'star') {
      const st = oceanSim.starsState[target.id || target.targetId];
      if (!st || st.altDeg < -2.0) return 180.0;
      dir = altAzToDirectionVec3(st.altDeg, st.azDeg, oceanSim.headingDeg);
    } else if (target.type === 'house') {
      const hid = target.id || target.targetId;
      const house = HORIZON_HOUSES.find((h) => h.id === hid);
      if (!house) return 180.0;
      dir = altAzToDirectionVec3(3.0, house.engineAzDeg, oceanSim.headingDeg);
    }
    if (!dir) return 180.0;

    const dot = Math.max(
      -1.0,
      Math.min(
        1.0,
        this._gazeVec.x * dir.x +
          this._gazeVec.y * dir.y +
          this._gazeVec.z * dir.z
      )
    );
    return (Math.acos(dot) * 180.0) / Math.PI;
  }

  /**
   * Per-frame update while in `phase === 'sky_vigil'`.
   */
  update(dtSec, oceanSim, cameraCtrl) {
    if (!oceanSim || !cameraCtrl) return;

    // 1. Advance nocturnal wheel if spinning
    if (this.spinMode > 0) {
      const speedHrPerSec = this.spinMode === 1 ? 0.24 : 0.88;
      this.sliderHour += speedHrPerSec * dtSec;
      if (this.sliderHour > NOCTURNAL_MAX_SLIDER) {
        this.sliderHour = NOCTURNAL_MIN_SLIDER;
      }
      oceanSim.solarHour = this.sliderHour % 24.0;
      this._refreshControlsDOM();
      if (this.mode === 'atlas') {
        this._refreshAtlasDOM();
      }
    } else {
      oceanSim.solarHour = this.sliderHour % 24.0;
    }

    // 2. Evaluate sight-ring alignment for Guided Lessons & Optional Eye Trial
    const reticleEl = this.rootEl.querySelector('#vigilSightReticle');
    const ringEl = this.rootEl.querySelector('#vigilReticleRing');

    if (this.mode === 'lessons') {
      reticleEl.classList.remove('hidden');
      const master = STAR_MASTERS[this.activeMasterId];
      const ch = master.chapters[this.chapterIndex];
      const angDeg = this._measureAngleToTarget(
        ch.promptTarget,
        oceanSim,
        cameraCtrl
      );
      this._lastTargetDeg = angDeg;
      const aligned = angDeg <= ALIGN_THRESHOLD_DEG;
      ringEl.classList.toggle('aligned', aligned);

      const badge = this.rootEl.querySelector('#vigilLessonSightBadge');
      if (aligned) {
        if (!this.sightedChapters.has(ch.id)) {
          this.sightedChapters.add(ch.id);
          this._refreshLessonDOM();
        }
        if (this._chapterChimePlayedFor !== ch.id) {
          this._chapterChimePlayedFor = ch.id;
          this.callbacks.onPlayChime?.();
        }
        badge.textContent = `✦ Sighted: ${ch.promptTarget.label}`;
        badge.className = 'vigil-sight-status sighted';
      } else if (angDeg < 28.0) {
        badge.textContent = `◌ Drawing Near: ${ch.promptTarget.label}`;
        badge.className = 'vigil-sight-status near';
      } else {
        badge.textContent = `◌ Seek: ${ch.promptTarget.label}`;
        badge.className = 'vigil-sight-status';
      }
    } else if (this.mode === 'quiz') {
      reticleEl.classList.remove('hidden');
      const pool = getQuizPromptsForMaster(this.activeMasterId);
      const q = pool[this.quizIndex];
      const angDeg = this._measureAngleToTarget(q, oceanSim, cameraCtrl);
      const aligned = angDeg <= ALIGN_THRESHOLD_DEG;
      ringEl.classList.toggle('aligned', aligned || this.quizResolved);

      if (!this.quizResolved) {
        if (aligned) {
          this.quizHoldSec = Math.min(QUIZ_HOLD_SEC, this.quizHoldSec + dtSec);
          if (this.quizHoldSec >= QUIZ_HOLD_SEC) {
            this.quizResolved = true;
            this.quizScore += 1;
            this.quizStreak += 1;
            this.callbacks.onPlayChime?.();
            this._refreshQuizDOM();
          }
        } else {
          this.quizHoldSec = Math.max(0.0, this.quizHoldSec - dtSec * 1.5);
        }
      }

      const pct = this.quizResolved
        ? 100
        : Math.round((this.quizHoldSec / QUIZ_HOLD_SEC) * 100);
      this.rootEl.querySelector('#vigilQuizMeterBar').style.width = `${pct}%`;
    } else {
      reticleEl.classList.add('hidden');
    }
  }

  /**
   * Returns rendering overrides for `SkyDomeRenderer.update(...)`.
   */
  getSkyDomeOverrides() {
    const shimmerStarIds = new Set();
    const revealLabelStarIds = new Set();
    let focusConstellationId = null;

    if (this.mode === 'lessons') {
      const ch = STAR_MASTERS[this.activeMasterId].chapters[this.chapterIndex];
      if (ch?.focusStarId) {
        shimmerStarIds.add(ch.focusStarId);
        revealLabelStarIds.add(ch.focusStarId);
        focusConstellationId =
          NAVIGATION_STARS[ch.focusStarId]?.constellation || null;
      }
      return {
        forceClearSky: true,
        showLines: this.showLines,
        showStarLabels: this.showStarLabels,
        shimmerStarIds,
        focusConstellationId,
        revealLabelStarIds,
      };
    }

    if (this.mode === 'atlas') {
      focusConstellationId = this.selectedConstellationId;
      for (const st of Object.values(NAVIGATION_STARS)) {
        if (st.constellation === focusConstellationId) {
          shimmerStarIds.add(st.id);
          revealLabelStarIds.add(st.id);
        }
      }
      return {
        forceClearSky: true,
        showLines: this.showLines,
        showStarLabels: this.showStarLabels,
        shimmerStarIds,
        focusConstellationId,
        revealLabelStarIds,
      };
    }

    // Quiz mode: clean raw night sky unless Peek Sky Hints is enabled or prompt is resolved!
    const pool = getQuizPromptsForMaster(this.activeMasterId);
    const q = pool[this.quizIndex];
    if (this.quizResolved && q?.type === 'star') {
      shimmerStarIds.add(q.targetId);
      revealLabelStarIds.add(q.targetId);
      focusConstellationId = NAVIGATION_STARS[q.targetId]?.constellation || null;
    }

    return {
      forceClearSky: true,
      showLines: this.quizPeekHints && this.showLines,
      showStarLabels: this.quizPeekHints && this.showStarLabels,
      shimmerStarIds,
      focusConstellationId,
      revealLabelStarIds,
    };
  }

  /**
   * Returns rendering overrides for `StarRingRenderer.update(...)`.
   */
  getStarRingOverrides() {
    if (this.mode === 'lessons') {
      const ch = STAR_MASTERS[this.activeMasterId].chapters[this.chapterIndex];
      return {
        showStoneLabels: this.showStoneLabels,
        highlightHouseId: ch?.highlightHouseId || null,
        revealHouseIds: ch?.highlightHouseId
          ? new Set([ch.highlightHouseId])
          : null,
      };
    }

    if (this.mode === 'atlas') {
      const guide = CONSTELLATION_GUIDE[this.selectedConstellationId];
      return {
        showStoneLabels: this.showStoneLabels,
        highlightHouseId: guide?.houseId || null,
        revealHouseIds: guide?.houseId ? new Set([guide.houseId]) : null,
      };
    }

    // Quiz mode
    const pool = getQuizPromptsForMaster(this.activeMasterId);
    const q = pool[this.quizIndex];
    const resolvedHouseId =
      this.quizResolved && q?.type === 'house' ? q.targetId : null;
    return {
      showStoneLabels: this.quizPeekHints && this.showStoneLabels,
      highlightHouseId: resolvedHouseId,
      revealHouseIds: resolvedHouseId ? new Set([resolvedHouseId]) : null,
    };
  }
}
