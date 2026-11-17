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
import { showsEasyConstellationCutout } from '../core/gameConstants.js';
import {
  CONSTELLATION_LESSONS,
  getAvailableConstellationLessonForIsland,
  getAvailableUnlearnedLessonForIsland,
  getLessonByUnlockKey,
} from '../data/constellationLessonsData.js';
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
    this.mode = 'lessons'; // 'guided' | 'lessons' | 'atlas' | 'quiz'
    this.chapterIndex = 0;
    this.sightedChapters = new Set();

    // Elder-Guided Constellation Introduction state
    this.guidedLesson = null;
    this.guidedBeatIndex = 0;
    this.guidedBeatElapsedSec = 0.0;
    this.guidedLinesAlpha = 0.0;
    this.guidedSilhouetteAlpha = 0.0;
    this.guidedLabelsAlpha = 0.0;
    this._guidedTargetLines = 0.0;
    this._guidedTargetSilhouette = 0.0;
    this._guidedTargetLabels = 0.0;
    this._guidedLaunchedFromAtlas = false;

    // Atlas state
    this.selectedConstellationId = 'the_sea_turtle';

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
    this.showAnimalSilhouettes = showsEasyConstellationCutout(
      this.callbacks?.getGameState?.()?.difficulty
    );
    this._userToggledAnimals = false;
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
      if (isl.isSecret) continue;
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
          <button class="vigil-mode-btn hidden" id="btnVigilModeGuided" data-mode="guided" type="button">✨ Elder Teaching</button>
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
          <!-- MODE 0: ELDER-GUIDED CONSTELLATION INTRODUCTION -->
          <div class="vigil-pane hidden" id="vigilPaneGuided">
            <div class="vigil-mentor-row">
              <button class="vigil-mentor-thumb-btn" id="btnVigilEnlargeGuidedMentor" type="button" title="Click to inspect full-body portrait">
                <img class="vigil-mentor-thumb" id="vigilGuidedMentorImg" alt="" />
              </button>
              <div class="vigil-mentor-head">
                <div class="vigil-chapter-steps" id="vigilGuidedSteps"></div>
                <h3 class="vigil-card-heading" id="vigilGuidedTitle"></h3>
                <div class="vigil-mentor-byline" id="vigilGuidedByline"></div>
              </div>
            </div>

            <p class="vigil-speech" id="vigilGuidedSpeech"></p>
            <div class="vigil-hint-line" id="vigilGuidedHint"></div>

            <div class="vigil-action-bar">
              <div class="vigil-sight-status" id="vigilGuidedStatusBadge"></div>
              <div class="vigil-action-btns">
                <button class="secondary-btn small-btn" id="btnVigilGuidedReframe" type="button">
                  ✦ Center Gaze
                </button>
                <button class="secondary-btn small-btn" id="btnVigilGuidedPrev" type="button">← Back</button>
                <button class="primary-btn small-btn" id="btnVigilGuidedNext" type="button">Look Up →</button>
              </div>
            </div>
          </div>

          <!-- MODE 1: GUIDED LESSONS -->
          <div class="vigil-pane" id="vigilPaneLessons">
            <div class="vigil-elder-callout hidden" id="vigilIslandElderCallout">
              <span id="vigilIslandElderCalloutText"></span>
              <button class="primary-btn small-btn" id="btnVigilStartIslandElder" type="button">
                ✨ Begin Elder's Teaching
              </button>
            </div>
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
              <div class="vigil-action-btns">
                <button class="secondary-btn small-btn hidden" id="btnVigilReplayGuided" type="button">
                  ✨ Replay Elder Teaching
                </button>
                <button class="secondary-btn small-btn" id="btnVigilPanAtlas" type="button">
                  ✦ Turn Gaze to Constellation
                </button>
              </div>
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
            <button class="vigil-toggle-chip" id="btnToggleVigilAnimals" type="button" title="Show or hide constellation animal silhouettes on the night dome">
              🐢 Animal Silhouettes
            </button>
            <button class="vigil-toggle-chip vigil-toggle-chip-wide" id="btnVigilLookZenith" type="button" title="Tilt gaze straight overhead to inspect zenith stars">
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

    // Atlas pan & guided replay
    this.rootEl
      .querySelector('#btnVigilPanAtlas')
      .addEventListener('click', () => {
        this.panToSelectedConstellation();
      });
    this.rootEl
      .querySelector('#btnVigilReplayGuided')
      .addEventListener('click', () => {
        const lesson = getLessonByUnlockKey(this.selectedConstellationId);
        if (lesson) {
          this._guidedLaunchedFromAtlas = true;
          this.startGuidedLesson(lesson.id);
        }
      });

    // Elder-Guided Constellation Intro buttons
    this.rootEl
      .querySelector('#btnVigilStartIslandElder')
      .addEventListener('click', () => {
        const gs = this.callbacks.getGameState?.();
        const lesson = getAvailableConstellationLessonForIsland(
          gs,
          this.activeIslandId
        );
        if (lesson) {
          this._guidedLaunchedFromAtlas = false;
          this.startGuidedLesson(lesson.id);
        }
      });
    this.rootEl
      .querySelector('#btnVigilGuidedReframe')
      .addEventListener('click', () => {
        this._frameActiveGuidedBeat(false);
      });
    this.rootEl
      .querySelector('#btnVigilGuidedPrev')
      .addEventListener('click', () => {
        if (this.guidedLesson && this.guidedBeatIndex > 0) {
          this.setGuidedBeat(this.guidedBeatIndex - 1);
        }
      });
    this.rootEl
      .querySelector('#btnVigilGuidedNext')
      .addEventListener('click', () => {
        this.advanceGuidedBeat();
      });
    this.rootEl
      .querySelector('#btnVigilEnlargeGuidedMentor')
      .addEventListener('click', () => {
        if (!this.guidedLesson) return;
        const isl = ISLANDS[this.guidedLesson.islandId];
        this.rootEl.querySelector('#vigilModalEyebrow').textContent =
          `${isl ? isl.name : ''} · Guided Constellation Vigil`;
        this.rootEl.querySelector('#vigilModalName').textContent =
          this.guidedLesson.elderName;
        this.rootEl.querySelector('#vigilModalRole').textContent =
          this.guidedLesson.elderRole;
        const img = this.rootEl.querySelector('#vigilModalImg');
        img.src = this.guidedLesson.portrait;
        img.alt = this.guidedLesson.elderName;
        this.rootEl.querySelector('#vigilPortraitModal').classList.remove('hidden');
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
        const pool = this._getFilteredQuizPool();
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
      .querySelector('#btnToggleVigilAnimals')
      .addEventListener('click', () => {
        this.showAnimalSilhouettes = !this.showAnimalSilhouettes;
        this._userToggledAnimals = true;
        if (this.mode === 'quiz' && this.showAnimalSilhouettes) {
          this.quizPeekHints = true;
        }
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

  syncDifficultyDefault(difficulty) {
    this._userToggledAnimals = false;
    this.showAnimalSilhouettes = showsEasyConstellationCutout(difficulty);
    this._refreshControlsDOM();
  }

  show({
    masterId = 'terai',
    islandId = null,
    mode = null,
    chapterIndex = 0,
    guidedLessonId = null,
  } = {}) {
    const gs = this.callbacks?.getGameState?.();
    if (!this._userToggledAnimals) {
      this.showAnimalSilhouettes = showsEasyConstellationCutout(gs?.difficulty);
    }
    this.rootEl.classList.remove('hidden');
    this.rootEl.querySelector('#vigilPortraitModal').classList.add('hidden');

    if (guidedLessonId && CONSTELLATION_LESSONS[guidedLessonId]) {
      this._guidedLaunchedFromAtlas = false;
      this.startGuidedLesson(guidedLessonId);
      return;
    }

    const resolvedMaster = STAR_MASTERS[masterId] ? masterId : 'terai';
    const resolvedIsland =
      islandId && ISLANDS[islandId]
        ? islandId
        : STAR_MASTERS[resolvedMaster].islandId;

    // If entering the local Star-Stone Ring on an island with an unlearned elder constellation teaching
    // and no explicit non-guided mode was requested, start directly in that elder's Guided Vigil!
    const unlearnedLocal = getAvailableUnlearnedLessonForIsland(
      gs,
      resolvedIsland
    );
    if (!mode && unlearnedLocal) {
      this._guidedLaunchedFromAtlas = false;
      this.startGuidedLesson(unlearnedLocal.id);
      return;
    }

    this.guidedLesson = getAvailableConstellationLessonForIsland(
      gs,
      resolvedIsland
    );
    this.mode = ['guided', 'lessons', 'atlas', 'quiz'].includes(mode)
      ? mode
      : 'lessons';
    if (this.mode === 'guided' && this.guidedLesson) {
      this._guidedLaunchedFromAtlas = false;
      this.startGuidedLesson(this.guidedLesson.id);
      return;
    }
    if (this.mode === 'guided') {
      this.mode = 'lessons';
    }
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

    const gs = this.callbacks.getGameState?.();
    const localLesson = getAvailableConstellationLessonForIsland(
      gs,
      this.activeIslandId
    );
    if (this.mode !== 'guided') {
      this.guidedLesson = localLesson || null;
    }

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
    this._syncModeTabsDOM();
    if (this.mode === 'guided' && this.guidedLesson) {
      this.startGuidedLesson(this.guidedLesson.id);
      return;
    }
    if (this.mode === 'lessons') {
      this.setChapter(this.chapterIndex, autoPan);
    } else if (this.mode === 'atlas') {
      this.selectConstellation(this.selectedConstellationId, autoPan);
    } else {
      this.setQuizPrompt(0);
    }
    this._refreshControlsDOM();
  }

  _syncModeTabsDOM() {
    const guidedTabBtn = this.rootEl.querySelector('#btnVigilModeGuided');
    if (guidedTabBtn) {
      guidedTabBtn.classList.toggle('hidden', !this.guidedLesson);
      if (this.guidedLesson) {
        guidedTabBtn.textContent = `✨ ${this.guidedLesson.elderName}: ${this.guidedLesson.title}`;
      }
    }
    this.rootEl.querySelectorAll('.vigil-mode-btn').forEach((btn) => {
      btn.classList.toggle(
        'active',
        btn.getAttribute('data-mode') === this.mode
      );
    });
    this.rootEl
      .querySelector('#vigilPaneGuided')
      ?.classList.toggle('hidden', this.mode !== 'guided');
    this.rootEl
      .querySelector('#vigilPaneLessons')
      .classList.toggle('hidden', this.mode !== 'lessons');
    this.rootEl
      .querySelector('#vigilPaneAtlas')
      .classList.toggle('hidden', this.mode !== 'atlas');
    this.rootEl
      .querySelector('#vigilPaneQuiz')
      .classList.toggle('hidden', this.mode !== 'quiz');
  }

  setMode(nextMode) {
    if (!['guided', 'lessons', 'atlas', 'quiz'].includes(nextMode)) return;
    if (nextMode === 'guided') {
      if (this.guidedLesson) {
        this._guidedLaunchedFromAtlas = false;
        this.startGuidedLesson(this.guidedLesson.id);
      }
      return;
    }
    this.mode = nextMode;
    this.spinMode = 0;
    this._syncModeTabsDOM();

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

  startGuidedLesson(lessonId) {
    const lesson = CONSTELLATION_LESSONS[lessonId];
    if (!lesson) return;
    this.guidedLesson = lesson;
    this.mode = 'guided';
    this.activeIslandId = lesson.islandId;
    this.activeMasterId =
      ISLANDS[lesson.islandId]?.latDeg > 0 ? 'akura' : 'terai';

    const sim = this.callbacks.getOceanSim?.();
    if (sim) {
      sim.headingDeg = 0.0;
      sim.setShoreIsland(lesson.islandId);
      sim.solarRaDeg = lesson.solarRaDeg;
      this.sliderHour = hourToNocturnalSlider(lesson.solarHour);
      sim.solarHour = this.sliderHour % 24.0;
      sim._refreshEnvironment(0);
    }

    this.guidedLinesAlpha = 0.0;
    this.guidedSilhouetteAlpha = 0.0;
    this.guidedLabelsAlpha = 0.0;
    this._syncHeaderDOM();
    this._syncModeTabsDOM();
    this.setGuidedBeat(0, true);
  }

  setGuidedBeat(beatIdx, isInitial = false) {
    const lesson = this.guidedLesson;
    if (!lesson) return;
    const clamped = Math.max(0, Math.min(lesson.beats.length - 1, beatIdx));
    this.guidedBeatIndex = clamped;
    this.guidedBeatElapsedSec = 0.0;
    const beat = lesson.beats[clamped];

    const sim = this.callbacks.getOceanSim?.();
    if (beat.kind !== 'spin' && sim) {
      this.spinMode = 0;
      this.sliderHour = hourToNocturnalSlider(lesson.solarHour);
      sim.solarRaDeg = lesson.solarRaDeg;
      sim.solarHour = this.sliderHour % 24.0;
      sim._refreshEnvironment(0);
    }

    if (beat.kind === 'stone') {
      this._guidedTargetLines = 0.0;
      this._guidedTargetSilhouette = 0.0;
      this._guidedTargetLabels = 0.0;
      if (isInitial) {
        this.guidedLinesAlpha = 0.0;
        this.guidedSilhouetteAlpha = 0.0;
        this.guidedLabelsAlpha = 0.0;
      }
      this._frameActiveGuidedBeat(isInitial);
    } else if (beat.kind === 'lines') {
      this._guidedTargetLines = 1.0;
      this._guidedTargetSilhouette = 0.0;
      this._guidedTargetLabels = 0.0;
      this._frameActiveGuidedBeat(false);
      this.callbacks.onPlayChime?.();
    } else if (beat.kind === 'silhouette') {
      this._guidedTargetLines = 1.0;
      this._guidedTargetSilhouette = 1.0;
      this._guidedTargetLabels = 0.0;
      this._frameActiveGuidedBeat(false);
    } else if (beat.kind === 'labels') {
      this._guidedTargetLines = 1.0;
      this._guidedTargetSilhouette = lesson.hasSilhouette ? 1.0 : 0.0;
      this._guidedTargetLabels = 1.0;
      this._frameActiveGuidedBeat(false);
    } else if (beat.kind === 'spin') {
      this._guidedTargetLines = 1.0;
      this._guidedTargetSilhouette = lesson.hasSilhouette ? 1.0 : 0.0;
      this._guidedTargetLabels = 1.0;
      // Elder turns on the Night-Wheel "Play" button to demonstrate sky rotation!
      this.spinMode = 1;
      const gs = this.callbacks.getGameState?.();
      if (gs && !gs.hasLearnedConstellation(lesson.unlockKey)) {
        gs.learnConstellation(lesson.unlockKey);
        gs.saveToLocalStorage();
        this.callbacks.onConstellationLearned?.(lesson);
      }
    }

    this._refreshGuidedDOM();
    this._refreshControlsDOM();
  }

  advanceGuidedBeat() {
    const lesson = this.guidedLesson;
    if (!lesson) return;
    if (this.guidedBeatIndex + 1 < lesson.beats.length) {
      this.setGuidedBeat(this.guidedBeatIndex + 1, false);
      return;
    }

    // Final beat completed -> ensure constellation is recorded & return smoothly
    const gs = this.callbacks.getGameState?.();
    if (gs && !gs.hasLearnedConstellation(lesson.unlockKey)) {
      gs.learnConstellation(lesson.unlockKey);
      gs.saveToLocalStorage();
      this.callbacks.onConstellationLearned?.(lesson);
    }
    this.callbacks.onPlayChime?.();
    this.spinMode = 0;

    if (this._guidedLaunchedFromAtlas) {
      this._guidedLaunchedFromAtlas = false;
      this.selectedConstellationId = lesson.constellationId;
      this.setMode('atlas');
    } else {
      this.callbacks.onExitVigil?.();
    }
  }

  _frameActiveGuidedBeat(instant = false) {
    const lesson = this.guidedLesson;
    const sim = this.callbacks.getOceanSim?.();
    const camCtrl = this.callbacks.getCameraCtrl?.();
    if (!lesson || !sim || !camCtrl) return;

    const beat = lesson.beats[this.guidedBeatIndex];
    if (beat?.kind === 'stone') {
      const house = HORIZON_HOUSES.find((h) => h.id === lesson.startHouseId);
      if (house) {
        camCtrl.panToAltAz(1.8, house.engineAzDeg, sim.headingDeg, instant);
      }
      return;
    }

    const pt = lesson.panTarget;
    if (pt?.altDeg !== undefined && pt?.azDeg !== undefined) {
      camCtrl.panToAltAz(pt.altDeg, pt.azDeg, sim.headingDeg, instant);
      return;
    }
    if (pt?.starId) {
      const st = sim.starsState[pt.starId];
      if (st) {
        camCtrl.panToAltAz(
          Math.max(pt.minAltDeg ?? 12.0, st.altDeg),
          st.azDeg,
          sim.headingDeg,
          instant
        );
      }
    }
  }

  _refreshGuidedDOM() {
    const lesson = this.guidedLesson;
    if (!lesson) return;
    const beat = lesson.beats[this.guidedBeatIndex];
    const gs = this.callbacks.getGameState?.();
    const alreadyLearned = Boolean(
      gs?.hasLearnedConstellation(lesson.unlockKey)
    );

    const img = this.rootEl.querySelector('#vigilGuidedMentorImg');
    img.src = lesson.portrait;
    img.alt = lesson.elderName;

    const stepsEl = this.rootEl.querySelector('#vigilGuidedSteps');
    stepsEl.innerHTML = '';
    lesson.beats.forEach((bItem, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      const passed = idx < this.guidedBeatIndex || alreadyLearned;
      b.className = `vigil-step-dot ${idx === this.guidedBeatIndex ? 'active' : ''} ${passed ? 'sighted' : ''}`;
      b.textContent = `Step ${idx + 1}`;
      b.addEventListener('click', () => this.setGuidedBeat(idx, false));
      stepsEl.appendChild(b);
    });

    const isl = ISLANDS[lesson.islandId];
    this.rootEl.querySelector('#vigilGuidedTitle').textContent =
      `${lesson.title} — ${beat.heading}`;
    this.rootEl.querySelector('#vigilGuidedByline').textContent =
      `${lesson.elderName} (${lesson.elderRole}) · ${isl ? isl.name : ''}`;
    this.rootEl.querySelector('#vigilGuidedSpeech').textContent = beat.speech;

    const hintEl = this.rootEl.querySelector('#vigilGuidedHint');
    if (beat.kind === 'stone') {
      const house = HORIZON_HOUSES.find((h) => h.id === lesson.startHouseId);
      hintEl.textContent = `Horizon Stone: ${house ? house.name : ''}`;
    } else if (beat.kind === 'spin') {
      hintEl.textContent =
        'Night-Wheel Play is active — watch how the stars move across the sky dome.';
    } else {
      hintEl.textContent = `Guided Night-Sky Teaching · Step ${this.guidedBeatIndex + 1} of ${lesson.beats.length}`;
    }

    const badge = this.rootEl.querySelector('#vigilGuidedStatusBadge');
    if (alreadyLearned) {
      badge.textContent = `✦ Learned: ${lesson.title}`;
      badge.className = 'vigil-sight-status sighted';
    } else {
      badge.textContent = `◌ Studying: ${lesson.title}`;
      badge.className = 'vigil-sight-status near';
    }

    this.rootEl.querySelector('#btnVigilGuidedPrev').disabled =
      this.guidedBeatIndex === 0;
    this.rootEl.querySelector('#btnVigilGuidedNext').textContent =
      beat.buttonLabel;
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

  _getFilteredQuizPool() {
    const rawPool = getQuizPromptsForMaster(this.activeMasterId);
    const gs = this.callbacks.getGameState?.();
    if (!gs) return rawPool;
    const filtered = rawPool.filter(
      (q) => q.type === 'house' || gs.isStarLearned(q.targetId, NAVIGATION_STARS)
    );
    return filtered.length > 0 ? filtered : rawPool.filter((q) => q.type === 'house');
  }

  setQuizPrompt(index) {
    const pool = this._getFilteredQuizPool();
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
    const pool = this._getFilteredQuizPool();
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
    const gs = this.callbacks.getGameState?.();

    const calloutEl = this.rootEl.querySelector('#vigilIslandElderCallout');
    const localLesson = getAvailableConstellationLessonForIsland(
      gs,
      this.activeIslandId
    );
    if (calloutEl) {
      if (localLesson) {
        const isDone = Boolean(gs?.hasLearnedConstellation(localLesson.unlockKey));
        calloutEl.classList.remove('hidden');
        this.rootEl.querySelector('#vigilIslandElderCalloutText').textContent =
          isDone
            ? `✦ ${localLesson.elderName}'s Constellation Teaching (${localLesson.title}) — Learned`
            : `✨ ${localLesson.elderName} awaits at this ring to introduce ${localLesson.title}!`;
        this.rootEl.querySelector('#btnVigilStartIslandElder').textContent =
          isDone
            ? `Replay ${localLesson.title}`
            : `Learn ${localLesson.title} →`;
      } else {
        calloutEl.classList.add('hidden');
      }
    }

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
    const gs = this.callbacks.getGameState?.();
    const isLearned = !gs || gs.hasLearnedConstellation(guide.id);

    this.rootEl.querySelectorAll('.vigil-const-chip').forEach((chip) => {
      const cid = chip.getAttribute('data-const-id');
      const cDef = CONSTELLATIONS.find((item) => item.id === cid);
      const chipLearned = !gs || gs.hasLearnedConstellation(cid);
      chip.textContent = chipLearned ? (cDef?.name || cid) : '◌ Uncharted';
      chip.classList.toggle('active', cid === guide.id);
      chip.classList.toggle('locked-chip', !chipLearned);
    });

    const panBtn = this.rootEl.querySelector('#btnVigilPanAtlas');
    const replayBtn = this.rootEl.querySelector('#btnVigilReplayGuided');

    if (!isLearned) {
      this.rootEl.querySelector('#vigilAtlasTitle').textContent =
        'Uncharted Sky Pattern';
      this.rootEl.querySelector('#vigilAtlasStatusPill').textContent =
        'Awaiting Elder Teaching Ashore';
      this.rootEl.querySelector('#vigilAtlasNote').textContent =
        'You have not yet been introduced to this constellation. Speak with wayfinder elders as you voyage from island to island—each elder guides your eyes to recognize a new animal in the night vault.';
      this.rootEl.querySelector('#vigilAtlasStarRoster').innerHTML =
        '<span class="vigil-star-pill below-sea">◌ Stars appear unmarked in the sky until taught by an elder</span>';
      if (panBtn) panBtn.classList.add('hidden');
      if (replayBtn) replayBtn.classList.add('hidden');
      return;
    }

    if (panBtn) panBtn.classList.remove('hidden');
    const matchedLesson = getLessonByUnlockKey(guide.id);
    if (replayBtn) {
      replayBtn.classList.toggle('hidden', !matchedLesson);
    }

    this.rootEl.querySelector('#vigilAtlasTitle').textContent =
      constObj?.name || guide.id;
    this.rootEl.querySelector('#vigilAtlasStatusPill').textContent =
      this.activeMasterId === 'akura' ? guide.akuraStatus : guide.teraiStatus;
    this.rootEl.querySelector('#vigilAtlasNote').textContent =
      this.activeMasterId === 'akura' ? guide.akuraNote : guide.teraiNote;

    const rosterEl = this.rootEl.querySelector('#vigilAtlasStarRoster');
    const stars = Object.values(NAVIGATION_STARS).filter(
      (s) =>
        s.constellation === guide.id &&
        (!gs || gs.isStarLearned(s.id, NAVIGATION_STARS))
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
    const pool = this._getFilteredQuizPool();
    const q = pool[this.quizIndex % pool.length];

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
    const effectiveAnimals =
      this.mode === 'quiz'
        ? this.quizPeekHints && this.showAnimalSilhouettes
        : this.showAnimalSilhouettes;

    this.rootEl
      .querySelector('#btnToggleVigilLines')
      .classList.toggle('active', effectiveLines);
    this.rootEl
      .querySelector('#btnToggleVigilStarNames')
      .classList.toggle('active', effectiveLabels);
    this.rootEl
      .querySelector('#btnToggleVigilStones')
      .classList.toggle('active', effectiveStones);
    this.rootEl
      .querySelector('#btnToggleVigilAnimals')
      ?.classList.toggle('active', effectiveAnimals);
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

    // 1b. Animate Guided Constellation Vigil fade-ins smoothly
    if (this.mode === 'guided' && this.guidedLesson) {
      this.guidedBeatElapsedSec += dtSec;
      const beat = this.guidedLesson.beats[this.guidedBeatIndex];
      const allowLinesNow =
        beat?.kind === 'lines' ? this.guidedBeatElapsedSec > 0.32 : true;
      const goalLines = allowLinesNow ? this._guidedTargetLines : 0.0;
      const stepFade = Math.min(1.0, dtSec * 1.15);

      this.guidedLinesAlpha +=
        (goalLines - this.guidedLinesAlpha) * stepFade;
      this.guidedSilhouetteAlpha +=
        (this._guidedTargetSilhouette - this.guidedSilhouetteAlpha) * stepFade;
      this.guidedLabelsAlpha +=
        (this._guidedTargetLabels - this.guidedLabelsAlpha) * stepFade;
    }

    // 2. Evaluate sight-ring alignment for Guided Lessons & Optional Eye Trial
    const reticleEl = this.rootEl.querySelector('#vigilSightReticle');
    const ringEl = this.rootEl.querySelector('#vigilReticleRing');

    if (this.mode === 'guided') {
      reticleEl.classList.add('hidden');
      return;
    }

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
      const pool = this._getFilteredQuizPool();
      const q = pool[this.quizIndex % pool.length];
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
    const gs = this.callbacks.getGameState?.();

    if (this.mode === 'guided' && this.guidedLesson) {
      const starSet = new Set(this.guidedLesson.focusStarIds);
      for (const sid of starSet) {
        shimmerStarIds.add(sid);
        revealLabelStarIds.add(sid);
      }
      return {
        forceClearSky: true,
        showLines: this.guidedLinesAlpha > 0.01,
        showStarLabels: this.guidedLabelsAlpha > 0.01,
        showAnimalSilhouettes: this.guidedSilhouetteAlpha > 0.01,
        shimmerStarIds,
        focusConstellationId: this.guidedLesson.constellationId,
        revealLabelStarIds,
        guidedIntro: {
          unlockKey: this.guidedLesson.unlockKey,
          constellationId: this.guidedLesson.constellationId,
          starIds: starSet,
          linesAlpha: this.guidedLinesAlpha,
          silhouetteAlpha: this.guidedSilhouetteAlpha,
          labelsAlpha: this.guidedLabelsAlpha,
        },
      };
    }

    if (this.mode === 'lessons') {
      const ch = STAR_MASTERS[this.activeMasterId].chapters[this.chapterIndex];
      if (
        ch?.focusStarId &&
        (!gs || gs.isStarLearned(ch.focusStarId, NAVIGATION_STARS))
      ) {
        shimmerStarIds.add(ch.focusStarId);
        revealLabelStarIds.add(ch.focusStarId);
        focusConstellationId =
          NAVIGATION_STARS[ch.focusStarId]?.constellation || null;
      }
      return {
        forceClearSky: true,
        showLines: this.showLines,
        showStarLabels: this.showStarLabels,
        showAnimalSilhouettes: this.showAnimalSilhouettes,
        shimmerStarIds,
        focusConstellationId,
        revealLabelStarIds,
      };
    }

    if (this.mode === 'atlas') {
      const isLearned =
        !gs || gs.hasLearnedConstellation(this.selectedConstellationId);
      if (isLearned) {
        focusConstellationId = this.selectedConstellationId;
        for (const st of Object.values(NAVIGATION_STARS)) {
          if (
            st.constellation === focusConstellationId &&
            (!gs || gs.isStarLearned(st.id, NAVIGATION_STARS))
          ) {
            shimmerStarIds.add(st.id);
            revealLabelStarIds.add(st.id);
          }
        }
      }
      return {
        forceClearSky: true,
        showLines: this.showLines,
        showStarLabels: this.showStarLabels,
        showAnimalSilhouettes: this.showAnimalSilhouettes,
        shimmerStarIds,
        focusConstellationId,
        revealLabelStarIds,
      };
    }

    // Quiz mode: clean raw night sky unless Peek Sky Hints is enabled or prompt is resolved!
    const pool = this._getFilteredQuizPool();
    const q = pool[this.quizIndex % pool.length];
    if (this.quizResolved && q?.type === 'star') {
      shimmerStarIds.add(q.targetId);
      revealLabelStarIds.add(q.targetId);
      focusConstellationId = NAVIGATION_STARS[q.targetId]?.constellation || null;
    }

    return {
      forceClearSky: true,
      showLines: this.quizPeekHints && this.showLines,
      showStarLabels: this.quizPeekHints && this.showStarLabels,
      showAnimalSilhouettes:
        (this.quizPeekHints || Boolean(this.quizResolved && focusConstellationId)) &&
        this.showAnimalSilhouettes,
      shimmerStarIds,
      focusConstellationId,
      revealLabelStarIds,
    };
  }

  /**
   * Returns rendering overrides for `StarRingRenderer.update(...)`.
   */
  getStarRingOverrides() {
    if (this.mode === 'guided' && this.guidedLesson) {
      const hId = this.guidedLesson.startHouseId || null;
      return {
        showStoneLabels: this.showStoneLabels,
        highlightHouseId: hId,
        revealHouseIds: hId ? new Set([hId]) : null,
      };
    }

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
      const gs = this.callbacks.getGameState?.();
      const isLearned =
        !gs || gs.hasLearnedConstellation(this.selectedConstellationId);
      const guide = isLearned
        ? CONSTELLATION_GUIDE[this.selectedConstellationId]
        : null;
      return {
        showStoneLabels: this.showStoneLabels,
        highlightHouseId: guide?.houseId || null,
        revealHouseIds: guide?.houseId ? new Set([guide.houseId]) : null,
      };
    }

    // Quiz mode
    const pool = this._getFilteredQuizPool();
    const q = pool[this.quizIndex % pool.length];
    const resolvedHouseId =
      this.quizResolved && q?.type === 'house' ? q.targetId : null;
    return {
      showStoneLabels: this.quizPeekHints && this.showStoneLabels,
      highlightHouseId: resolvedHouseId,
      revealHouseIds: resolvedHouseId ? new Set([resolvedHouseId]) : null,
    };
  }
}
