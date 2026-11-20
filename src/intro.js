/**
 * Cinematic Real-Time 3D Introduction Sequence for Kavenga: Songs of the Star Path (`intro.html`).
 *
 * Choreography:
 *  1. [0.0s – 3.0s]  Mid-ocean, midday, fully upgraded Tier-3 Vaka Moana from far away,
 *                    very slightly zooming in across endless swells and waves.
 *  2. [3.0s – 6.3s]  Camera swoops cinematically behind the stern ("canoe view"), showcasing
 *                    the canoe and the young wayfinder (`Difficulty.MEDIUM`) from behind.
 *  3. [6.3s – 13.9s] Camera glides smoothly from behind around to the left (port, `-X`) side
 *                    while the environment abruptly cuts every 1.9s (<= 2.0s per cut) around
 *                    the unchanging, continuously wave-riding canoe:
 *                      - [6.3s  – 8.2s]  Clear starry night (bright stars & Te Mangoroa visible)
 *                      - [8.2s  – 10.1s] Golden-coral twilight with 2x marching trade-wind clouds
 *                      - [10.1s – 12.0s] Bright day with sculpted Huahine fully visible behind the
 *                                        canoe on the left side of the screen & bird flocks flying
 *                                        directly toward Huahine
 *                      - [12.0s – 13.9s] Foggy night with silver fish jumping next to the canoe
 *  4. [13.9s – ∞]    Abrupt cut to golden dusk on the port-beam profile view with the sun
 *                    setting directly behind the visible canoe at true in-game solar speed:
 *                      - `assets/banner.png` ("Kavenga") slowly eases in at the top
 *                      - "Songs of the Star Path" appears right beneath it
 *                      - "Start" button appears when the sun disk touches the horizon
 *                      - The sun slowly sinks below the horizon at in-game speed into starry night
 *                        while the canoe keeps bouncing naturally on the waves
 */

import * as THREE from 'three';
import {
  DepartureWindow,
  Difficulty,
  GameConstants,
} from './core/gameConstants.js';
import { GameState } from './core/gameState.js';
import { SONGS } from './data/songsData.js';
import { altAzToDirectionVec3 } from './simulation/celestialSim.js';
import { OceanSim } from './simulation/oceanSim.js';
import {
  TRADE_CLOUD_VARIANT_KEYS,
  createSculptedCloudMesh,
  updateCloudMaterialUniforms,
} from './rendering/CloudSculptBuilder.js';
import {
  applyDetailedIslandAlpha,
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
} from './rendering/IslandTerrainBuilder.js';
import { SkyDomeRenderer } from './rendering/SkyDomeRenderer.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { VakaRenderer } from './rendering/VakaRenderer.js';
import { WorldCuesRenderer } from './rendering/WorldCuesRenderer.js';

// Timeline cue timestamps (seconds) — each Part-3 cut defaults to 1.9s (4.0s in intro_long.html)
const CUT_DURATION_SEC =
  typeof window !== 'undefined' && Number(window.__KAVENGA_INTRO_CUT_SEC__) > 0
    ? Number(window.__KAVENGA_INTRO_CUT_SEC__)
    : 1.9;
const T_MOVE_TO_STERN_START = 3.0;
const T_ARRIVE_BEHIND_NAVIGATOR = 5.7;
const T_ORBIT_TO_LEFT_START = 6.0;

const T_CUT_STARRY_NIGHT = 6.3;
const T_CUT_TWILIGHT_CLOUDS = T_CUT_STARRY_NIGHT + CUT_DURATION_SEC;      // 8.2s
const T_CUT_DAY_BIRDS = T_CUT_TWILIGHT_CLOUDS + CUT_DURATION_SEC;         // 10.1s
const T_CUT_FOG_NIGHT_FISH = T_CUT_DAY_BIRDS + CUT_DURATION_SEC;          // 12.0s
const T_CUT_DUSK_FINALE = T_CUT_FOG_NIGHT_FISH + CUT_DURATION_SEC;        // 13.9s

const T_BANNER_IN = T_CUT_DUSK_FINALE + 0.5;                              // 14.4s
const T_SUBTITLE_IN = T_CUT_DUSK_FINALE + 3.8;                            // 17.7s
const DUSK_START_SOLAR_HOUR = 17.74;
const DUSK_END_SOLAR_HOUR = 18.92;
const IN_GAME_SOLAR_HOURS_PER_SEC = 1.0 / GameConstants.REAL_SECONDS_PER_GAME_HOUR;
const SUN_HORIZON_TOUCH_ALT_DEG = 0.5;

// Sculpted Huahine world position during Stage 3 (behind the canoe on the left side of the screen)
const HUAHINE_POS = Object.freeze({ x: 182.0, y: 0.52, z: -129.0 });
const TWILIGHT_CLOUD_SUN_DIR = new THREE.Vector3(-0.72, 0.34, 0.60).normalize();

function clamp01(v) {
  return v < 0.0 ? 0.0 : v > 1.0 ? 1.0 : v;
}

function smoothstep3(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
}

function smootherstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

class KavengaIntroDirector {
  constructor() {
    this.container = document.getElementById('intro-webgl');
    this.bannerEl = document.getElementById('intro-banner');
    this.subtitleEl = document.getElementById('intro-subtitle');
    this.startWrapEl = document.getElementById('intro-start-wrap');
    this.startBtnEl = document.getElementById('btn-intro-start');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      52.0,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.25,
      1900.0
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this._webglContextLost = false;
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._webglContextLost = true;
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this._webglContextLost = false;
    });
    this.container.appendChild(this.renderer.domElement);

    // Build fully upgraded Tier-3 Vaka Moana state with the Wayfinder (`Difficulty.MEDIUM`)
    // and 0 learned constellations so night skies showcase pure, sparkling, unmarked stars.
    this.gameState = new GameState();
    this.gameState.difficulty = Difficulty.MEDIUM;
    this.gameState.vakaTier = 3;
    this.gameState.hullCondition = 100.0;
    this.gameState.sailCondition = 100.0;
    this.gameState.lashingCondition = 100.0;
    this.gameState.cargoItems = ['seed_yams', 'tapa_cloth_bales', 'fresh_gourds'];
    this.gameState.assignedCrew = [];

    this.oceanSim = new OceanSim();
    this.oceanSim.startVoyage(
      SONGS.song_07,
      DepartureWindow.HIGH_NOON,
      this.gameState
    );
    this.oceanSim.rationsRemaining = 8.0;
    // Place canoe far out in empty blue ocean so zero basin islands auto-detect
    this.oceanSim.pos.x = -9999.0;
    this.oceanSim.pos.y = -9999.0;
    this.oceanSim.detections = [];
    // Heading 180 deg aligns world sunset (az 270 deg) directly onto +X (dead behind the canoe
    // when viewed from the port `-X` camera!) while giving a crisp 4-beat swell ride.
    this.oceanSim.headingDeg = 180.0;
    this.oceanSim.solarRaDeg = 0.0;

    // Mutable verse proxy so weather switches cleanly without mutating shared SONGS catalog
    this._introVerse = {
      ...this.oceanSim.getCurrentVerse(),
      weather: 'clear',
    };
    this.oceanSim.getCurrentVerse = () => this._introVerse;

    // Core 3D Renderers
    this.skyRenderer = new SkyDomeRenderer(this.scene, null);
    this.oceanRenderer = new OceanRenderer(this.scene);
    this.vakaRenderer = new VakaRenderer(this.scene);
    this.worldCues = new WorldCuesRenderer(this.scene);
    this.worldCues.group.visible = false;

    // Supplemental nocturnal & sunset rim lighting so the upgraded canoe, child navigator,
    // and leaping silver fish stay sculpted and luminous during night & dusk scenes
    this.moonRimLight = new THREE.DirectionalLight(0x9ac0ff, 0.0);
    this.moonRimLight.position.set(-14.0, 12.0, 7.0);
    this.scene.add(this.moonRimLight);

    this.deckWarmFill = new THREE.PointLight(0xffcb88, 0.0, 22.0, 1.4);
    this.deckWarmFill.position.set(-3.2, 3.2, 2.2);
    this.scene.add(this.deckWarmFill);

    this.fishSpotLight = new THREE.PointLight(0xbbe2ff, 0.0, 20.0, 1.3);
    this.fishSpotLight.position.set(-6.0, 5.2, 0.8);
    this.scene.add(this.fishSpotLight);

    // Build 2x (30) camera-framed marching twilight clouds (Stage 2), sculpted Huahine +
    // sail-clear homing bird flocks (Stage 3), and close-up leaping fish (Stage 4)
    this._buildIntroTwilightClouds();
    this._buildIntroHuahineBackdrop();
    this._buildIntroBirdFlocks();
    this._buildIntroCloseFishSchool();

    // Camera spline waypoints:
    //  P0 -> P1 : Wide mid-ocean establishing drift (ahead-port elevated)
    //  P1 -> P2 : Sweeping arc around port to stern "canoe view" behind child navigator
    //  P2 -> P5 : Continuous orbit from behind (+Z) to port-beam profile (-X)
    this.sternOrbitCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.38, 2.48, 8.55),
        new THREE.Vector3(-4.85, 2.65, 8.15),
        new THREE.Vector3(-10.4, 2.62, 5.45),
        new THREE.Vector3(-14.6, 2.48, 2.35),
        new THREE.Vector3(-16.8, 2.35, 0.35),
      ],
      false,
      'centripetal',
      0.5
    );
    this.sternLookCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.08, 2.15, -3.2),
        new THREE.Vector3(0.15, 2.85, -1.8),
        new THREE.Vector3(0.35, 3.15, -0.9),
        new THREE.Vector3(0.5, 3.55, -0.45),
        new THREE.Vector3(0.6, 3.85, -0.25),
      ],
      false,
      'centripetal',
      0.5
    );

    this._camPos = new THREE.Vector3();
    this._camLook = new THREE.Vector3();

    this.elapsedSec = 0.0;
    this._activeEnvStage = -1;
    this._bannerShown = false;
    this._subtitleShown = false;
    this._startShown = false;
    this._lastTimeMs = performance.now();

    this._bindEvents();
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  /**
   * Builds 30 sculpted cumulus clouds (2x the standard 15 trade clouds) directly across the
   * Stage-2 camera's forward-starboard sky frustum so a dense, tiered armada of twilight-lit
   * clouds marches unmistakably across the sky throughout [8.7s – 10.6s].
   */
  _buildIntroTwilightClouds() {
    this.introCloudsGroup = new THREE.Group();
    this.introCloudsGroup.visible = false;
    this.scene.add(this.introCloudsGroup);

    this.introTwilightClouds = [];
    const cloudCount = 30; // 2x the standard 15 trade-wind clouds
    const marchHeadingRad = Math.atan2(-0.58, -0.81);

    for (let i = 0; i < cloudCount; i += 1) {
      const archetypeKey =
        TRADE_CLOUD_VARIANT_KEYS[i % TRADE_CLOUD_VARIANT_KEYS.length];
      const sculpted = createSculptedCloudMesh(archetypeKey, { opacity: 0.98 });
      const holder = new THREE.Group();
      const scale = 0.78 + (i % 4) * 0.12;
      holder.scale.setScalar(scale);
      holder.rotation.y = marchHeadingRad + ((i % 5) - 2) * 0.18;
      holder.add(sculpted.mesh);
      this.introCloudsGroup.add(holder);

      // 10 azimuth columns spanning [2..126 deg] right of -Z (from bow all the way around
      // starboard-astern) x 3 depth/elevation tiers (102..266m) so marching clouds stay densely
      // visible behind the canoe & stern right through the end of the Stage-2 camera movement!
      const col = i % 10;              // 0..9 across wide 124-deg arc
      const tier = Math.floor(i / 10); // 0..2 depth/height tiers
      const azDeg = 2.0 + col * 13.8 + (tier - 1) * 4.2 + ((i * 7) % 5) - 2.0;
      const azRad = (azDeg * Math.PI) / 180.0;
      const dist = 102.0 + tier * 68.0 + ((i * 17) % 28);
      const elevSlope = 0.13 + ((i * 3 + tier) % 4) * 0.068;

      const startX = Math.sin(azRad) * dist;
      const startZ = -Math.cos(azRad) * dist;
      const startY = 3.4 + dist * elevSlope;
      const speed = 21.0 + (i % 4) * 3.0;

      this.introTwilightClouds.push({
        holder,
        mat: sculpted.material,
        startX,
        startY,
        startZ,
        vx: -0.58 * speed,
        vz: -0.81 * speed,
      });
    }
  }

  /**
   * Builds the full sculpted 3D Huahine assembly (twin Huahine Nui & Huahine Iti volcanic peaks,
   * turquoise Maroe Strait, barrier reef surf, palms & stationary peak cloud) behind the canoe
   * on the left side of the screen for Stage 3.
   */
  _buildIntroHuahineBackdrop() {
    this.introHuahineGroup = new THREE.Group();
    this.introHuahineGroup.visible = false;
    this.introHuahineGroup.position.set(
      HUAHINE_POS.x,
      HUAHINE_POS.y,
      HUAHINE_POS.z
    );
    // Orient Huahine so its twin peaks & reef pass face directly toward the canoe & camera!
    this.introHuahineGroup.lookAt(0.0, HUAHINE_POS.y, 0.0);

    const huahineAssembly = createDetailedIslandAssembly('huahine');
    huahineAssembly.group.rotation.y = getIslandApproachOrientationRad('huahine');
    applyDetailedIslandAlpha(huahineAssembly, 1.0);
    this.introHuahineGroup.add(huahineAssembly.group);

    // Signature stationary island cumulus cloud crowning high above Huahine's twin peaks
    const peakSculpt = createSculptedCloudMesh('peak', { opacity: 0.94 });
    peakSculpt.mesh.position.set(0.0, 66.0, 0.0);
    peakSculpt.mesh.scale.setScalar(0.95);
    this.introHuahinePeakMat = peakSculpt.material;
    this.introHuahineGroup.add(peakSculpt.mesh);

    this.scene.add(this.introHuahineGroup);
  }

  /**
   * Builds three seabird flocks (White Terns & Brown Boobies) that sweep across the foreground
   * and mid-sky flying directly toward sculpted Huahine (`HUAHINE_POS`) on the left!
   */
  _buildIntroBirdFlocks() {
    this.introBirdsGroup = new THREE.Group();
    this.introBirdsGroup.visible = false;
    this.scene.add(this.introBirdsGroup);

    this.introBirds = [];
    const flockSpecs = [
      // Flock A: White Terns sweeping sideways forward of the bow & sails toward Huahine
      { count: 7, species: 'white_tern', baseX: 2.2, baseY: 6.2, baseZ: -12.8, speed: 18.2, targetY: 23.0, scale: 1.55 },
      // Flock B: Brown Boobies soaring high above masthead height toward Huahine's twin peaks
      { count: 6, species: 'brown_booby', baseX: 14.0, baseY: 15.2, baseZ: -19.2, speed: 17.6, targetY: 50.0, scale: 1.75 },
      // Flock C: White Terns skimming seaward ahead of the twin prows toward Huahine's lagoon pass
      { count: 6, species: 'white_tern', baseX: 12.0, baseY: 3.8, baseZ: -16.5, speed: 19.2, targetY: 12.0, scale: 1.48 },
    ];

    flockSpecs.forEach((fs, fIdx) => {
      // Exact 3D unit flight vector from this flock's origin straight to Huahine!
      const dx = HUAHINE_POS.x - fs.baseX;
      const dy = fs.targetY - fs.baseY;
      const dz = HUAHINE_POS.z - fs.baseZ;
      const dLen = Math.hypot(dx, dy, dz) || 1.0;
      const ux = dx / dLen;
      const uy = dy / dLen;
      const uz = dz / dLen;

      // Horizontal perpendicular vector for V-formation wingman spacing
      const hLen = Math.hypot(ux, uz) || 1.0;
      const sideX = -uz / hLen;
      const sideZ = ux / hLen;

      const vx = ux * fs.speed;
      const vy = uy * fs.speed;
      const vz = uz * fs.speed;
      // Seabird beak is local -Z -> rotation.y = atan2(-vx, -vz) points beak dead at Huahine!
      const yaw = Math.atan2(-vx, -vz);

      for (let i = 0; i < fs.count; i += 1) {
        const rank = i - (fs.count - 1) * 0.5;
        const vLag = Math.abs(rank) * 1.55 + (i % 2) * 0.45;
        const entry = this.worldCues.createSeabird(fs.species, { opaque: true });
        const holder = new THREE.Group();
        holder.scale.setScalar(fs.scale);
        holder.rotation.y = yaw;
        holder.add(entry.root);
        this.introBirdsGroup.add(holder);

        this.introBirds.push({
          holder,
          entry,
          phase: fIdx * 1.7 + i * 0.85,
          speedScale: 1.12 + (i % 3) * 0.08,
          startX: fs.baseX + sideX * rank * 1.35 - ux * vLag,
          startY: fs.baseY + (i % 3) * 0.42 - Math.abs(rank) * 0.12,
          startZ: fs.baseZ + sideZ * rank * 1.35 - uz * vLag,
          vx,
          vy,
          vz,
        });
      }
    });
  }

  _buildIntroCloseFishSchool() {
    this.introFishGroup = new THREE.Group();
    this.introFishGroup.visible = false;
    this.scene.add(this.introFishGroup);

    const ringGeo = new THREE.RingGeometry(0.14, 0.28, 20);
    ringGeo.rotateX(-Math.PI * 0.5);

    this.introFish = [];
    // 7 silver Pacific Bonito leaping right next to the port (-X) hull in staggered arcs
    const slots = [
      { x: -4.45, z: 2.35, dirZ: -1.0, phase: 0.25, speed: 3.35, height: 1.58, dist: 3.1, scale: 1.28 },
      { x: -5.65, z: 0.85, dirZ: -1.0, phase: 1.35, speed: 3.15, height: 1.78, dist: 3.4, scale: 1.35 },
      { x: -4.15, z: -0.95, dirZ: -1.0, phase: 2.45, speed: 3.55, height: 1.45, dist: 2.9, scale: 1.2 },
      { x: -6.35, z: 3.1, dirZ: -1.0, phase: 3.25, speed: 3.25, height: 1.7, dist: 3.3, scale: 1.3 },
      { x: -5.05, z: -2.4, dirZ: -1.0, phase: 4.15, speed: 3.4, height: 1.52, dist: 3.0, scale: 1.24 },
      { x: -6.85, z: -0.35, dirZ: -1.0, phase: 5.05, speed: 3.1, height: 1.84, dist: 3.5, scale: 1.36 },
      { x: -4.65, z: 3.85, dirZ: -1.0, phase: 5.75, speed: 3.45, height: 1.5, dist: 3.1, scale: 1.22 },
    ];

    for (const sl of slots) {
      const mesh = this.worldCues.createBonitoFish({ cloneMaterials: true });
      mesh.scale.setScalar(sl.scale);
      this.introFishGroup.add(mesh);

      const splashMat = new THREE.MeshBasicMaterial({
        color: 0xdff4ff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const splash = new THREE.Mesh(ringGeo, splashMat);
      this.introFishGroup.add(splash);

      this.introFish.push({
        ...sl,
        mesh,
        tailPivot: mesh.userData.tailPivot || null,
        splash,
        splashMat,
      });
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    if (this.startBtnEl) {
      this.startBtnEl.addEventListener('click', () => {
        window.location.href = './index.html';
      });
    }

    // Allow Escape key to jump straight to the dusk title finale if desired
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elapsedSec < T_CUT_DUSK_FINALE) {
        this.elapsedSec = T_CUT_DUSK_FINALE;
      }
    });
  }

  _resolveEnvironmentStage(t) {
    if (t < T_CUT_STARRY_NIGHT) return 0;      // Midday pure ocean
    if (t < T_CUT_TWILIGHT_CLOUDS) return 1;   // Cut 1 (1.9s): Clear bright starry night
    if (t < T_CUT_DAY_BIRDS) return 2;         // Cut 2 (1.9s): Twilight + 2x marching clouds
    if (t < T_CUT_FOG_NIGHT_FISH) return 3;    // Cut 3 (1.9s): Day + Huahine + homing bird flocks
    if (t < T_CUT_DUSK_FINALE) return 4;       // Cut 4 (1.9s): Foggy night + jumping fish
    return 5;                                  // Cut 5: Dusk sunset behind canoe -> Nightfall
  }

  _applyEnvironmentForTime(t, dtSec) {
    const stage = this._resolveEnvironmentStage(t);
    const isCutFrame = stage !== this._activeEnvStage;
    this._activeEnvStage = stage;

    let solarHour = 12.2;
    let weather = 'clear';
    let showClouds = false;
    let showDayHuahineAndBirds = false;
    let showFish = false;
    let instantFog = 0.0;

    if (stage === 0) {
      // 1. Mid-ocean midday: nothing around but ocean & waves
      solarHour = 12.2;
      weather = 'clear';
    } else if (stage === 1) {
      // 2. Abrupt cut -> Nighttime with bright stars & Milky Way clearly visible
      solarHour = 23.15;
      weather = 'clear';
    } else if (stage === 2) {
      // 3. Abrupt cut -> Warm twilight with 2x (30) marching trade-wind clouds filling the sky
      solarHour = 18.08;
      weather = 'clear';
      showClouds = true;
    } else if (stage === 3) {
      // 4. Abrupt cut -> Bright morning sunlight from over-shoulder (-X) illuminating Huahine & bird flocks!
      solarHour = 9.55;
      weather = 'clear';
      showDayHuahineAndBirds = true;
    } else if (stage === 4) {
      // 5. Abrupt cut -> Night and foggy, silver fish jumping next to the canoe
      solarHour = 22.4;
      weather = 'sea_fog';
      showFish = true;
      instantFog = 0.86;
    } else {
      // 6. Abrupt cut -> Dusk behind the canoe (17.74 -> 18.92) at true in-game solar speed!
      const duskElapsed = Math.max(0.0, t - T_CUT_DUSK_FINALE);
      solarHour = Math.min(
        DUSK_END_SOLAR_HOUR,
        DUSK_START_SOLAR_HOUR + duskElapsed * IN_GAME_SOLAR_HOURS_PER_SEC
      );
      weather = 'clear';
      instantFog = 0.0;
    }

    this._introVerse.weather = weather;
    this.oceanSim.solarHour = solarHour;
    this.oceanSim._refreshEnvironment(dtSec);

    // Enforce crisp, instantaneous environment cuts (no leftover fog bleed across cuts!)
    if (isCutFrame || stage === 4 || stage === 5) {
      this.skyRenderer.curSeaFog = instantFog;
      this.skyRenderer.curCurtain = 0.0;
      this.skyRenderer.curOvercast = 0.0;
      this.oceanRenderer.curSeaFog = instantFog;
    }

    // Update Stage 2 Camera-Framed 2x (30) Marching Twilight Clouds
    this.introCloudsGroup.visible = showClouds;
    if (showClouds) {
      const localCloudT = t - T_CUT_TWILIGHT_CLOUDS;
      for (const tc of this.introTwilightClouds) {
        tc.holder.position.set(
          tc.startX + tc.vx * localCloudT,
          tc.startY,
          tc.startZ + tc.vz * localCloudT
        );
        updateCloudMaterialUniforms(tc.mat, {
          sunDir: TWILIGHT_CLOUD_SUN_DIR,
          daylight: 0.28,
          twilight: 0.98,
          opacity: 0.96,
          lapaGlow: 0.0,
          elapsedSec: t,
        });
      }
    }

    // Update Stage 3 Sculpted Huahine & Homing Seabird Flocks Flying Toward Huahine
    this.introHuahineGroup.visible = showDayHuahineAndBirds;
    this.introBirdsGroup.visible = showDayHuahineAndBirds;
    if (showDayHuahineAndBirds) {
      const sun = this.oceanSim.sunState;
      const sunVec = altAzToDirectionVec3(
        sun.altDeg,
        sun.azDeg,
        this.oceanSim.headingDeg
      );
      if (this.introHuahinePeakMat) {
        updateCloudMaterialUniforms(this.introHuahinePeakMat, {
          sunDir: sunVec,
          daylight: sun.daylightFactor,
          twilight: sun.twilightFactor,
          opacity: 0.94,
          lapaGlow: 0.0,
          elapsedSec: t,
        });
      }

      const localT = t - T_CUT_DAY_BIRDS;
      for (const b of this.introBirds) {
        this.worldCues.animateSeabird(b.entry, t, b.phase, b.speedScale);
        b.holder.position.set(
          b.startX + b.vx * localT,
          b.startY + b.vy * localT + b.entry.bobY * 2.2 + Math.sin(t * 1.9 + b.phase) * 0.14,
          b.startZ + b.vz * localT
        );
      }
    }

    // Update Stage 4 Foggy-Night Leaping Fish Next to the Canoe
    this.introFishGroup.visible = showFish;
    this.fishSpotLight.intensity = showFish ? 3.2 : 0.0;
    if (showFish) {
      for (const f of this.introFish) {
        const cycle = (t * f.speed + f.phase) % (Math.PI * 2.0);
        const sinC = Math.sin(cycle);
        const inAir = sinC > -0.18;
        f.mesh.visible = inAir;

        if (inAir) {
          const u = cycle / Math.PI;
          const arcZ = f.z + (u - 0.5) * f.dist * f.dirZ;
          const arcY = sinC * f.height;
          f.mesh.position.set(f.x, arcY, arcZ);
          f.mesh.rotation.set(0.0, Math.PI * 0.5, Math.cos(cycle) * 0.72);
          if (f.tailPivot) {
            f.tailPivot.rotation.y = Math.sin(t * 22.0 + f.phase * 2.7) * 0.34;
          }
        }

        const distEntry = Math.abs(cycle - 0.08);
        const distExit = Math.abs(cycle - Math.PI);
        const splashAge =
          cycle < 1.15
            ? Math.max(0.0, cycle)
            : cycle >= Math.PI && cycle < Math.PI + 1.25
              ? cycle - Math.PI
              : -1.0;

        if (splashAge >= 0.0) {
          const splashZ =
            distEntry < distExit
              ? f.z - 0.5 * f.dist * f.dirZ
              : f.z + 0.5 * f.dist * f.dirZ;
          const normAge = splashAge / 1.2;
          f.splash.visible = true;
          f.splash.position.set(f.x, 0.06, splashZ);
          f.splash.scale.setScalar(0.65 + normAge * 3.4);
          f.splashMat.opacity = (1.0 - normAge) * (1.0 - normAge) * 0.62;
        } else {
          f.splash.visible = false;
        }
      }
    }

    // Balance nocturnal / twilight / daylight fill on the canoe & child navigator
    const daylight = this.oceanSim.sunState.daylightFactor;
    const twilight = this.oceanSim.sunState.twilightFactor;
    const nightAmt = clamp01(1.0 - daylight);
    this.moonRimLight.intensity = 0.85 * nightAmt;
    this.deckWarmFill.intensity = 0.95 * twilight + 0.42 * nightAmt;
  }

  _updateCamera(t) {
    const hull = this.oceanSim.hullState;
    const gentleBobY = hull ? hull.heaveM * 0.22 : 0.0;

    if (t <= T_MOVE_TO_STERN_START) {
      // Opening far mid-ocean midday hold: very slight 3s zoom-in across endless swells
      const u = smootherstep(0.0, T_MOVE_TO_STERN_START, t);
      this._camPos.set(
        lerp(-42.0, -36.5, u),
        lerp(18.5, 16.0, u) + gentleBobY * 0.6,
        lerp(-48.0, -41.5, u)
      );
      this._camLook.set(0.0, lerp(1.9, 2.1, u) + gentleBobY * 0.5, 0.2);
    } else if (t <= T_ARRIVE_BEHIND_NAVIGATOR) {
      // Cinematic swoop around port (-X) into the stern "canoe view" behind the navigator
      const u = smootherstep(T_MOVE_TO_STERN_START, T_ARRIVE_BEHIND_NAVIGATOR, t);
      const startAngle = Math.atan2(-36.5, -41.5);
      const startRadius = Math.hypot(-36.5, -41.5);
      const angle = lerp(startAngle, 0.0, u);
      const radius = lerp(startRadius, 8.55, u);
      const camX = Math.sin(angle) * radius - 0.38 * u;
      const camZ = Math.cos(angle) * radius;
      const camY = lerp(16.0, 2.48, u) + gentleBobY * (0.6 + 0.4 * u);

      this._camPos.set(camX, camY, camZ);
      this._camLook.set(
        lerp(0.0, -0.08, u),
        lerp(2.1, 2.15, u) + gentleBobY * 0.8,
        lerp(0.2, -3.2, u)
      );
    } else {
      // Smooth continuous orbit from behind the child navigator (+Z) to the left/port side (-X)
      const tLin = clamp01(
        (t - T_ORBIT_TO_LEFT_START) /
          Math.max(1e-5, T_CUT_DUSK_FINALE - T_ORBIT_TO_LEFT_START)
      );
      const u = 0.32 * tLin + 0.68 * smoothstep3(0.0, 1.0, tLin);
      this.sternOrbitCurve.getPoint(u, this._camPos);
      this.sternLookCurve.getPoint(u, this._camLook);

      // Subtle living sea-camera breathing once settled on the port-beam finale shot
      const settle = smootherstep(T_CUT_DUSK_FINALE - 0.6, T_CUT_DUSK_FINALE + 2.0, t);
      this._camPos.y += gentleBobY * 0.45 + Math.sin(t * 0.55) * 0.08 * settle;
      this._camPos.z += Math.cos(t * 0.38) * 0.16 * settle;
      this._camLook.y += gentleBobY * 0.35;
    }

    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
  }

  _updateOverlays(t) {
    if (!this._bannerShown && t >= T_BANNER_IN) {
      this._bannerShown = true;
      this.bannerEl?.classList.add('visible');
    }
    if (!this._subtitleShown && t >= T_SUBTITLE_IN) {
      this._subtitleShown = true;
      this.subtitleEl?.classList.add('visible');
    }
    if (!this._startShown && this._activeEnvStage === 5) {
      const sunAltDeg = this.oceanSim.sunState?.altDeg ?? 90.0;
      if (sunAltDeg <= SUN_HORIZON_TOUCH_ALT_DEG) {
        this._startShown = true;
        this.startWrapEl?.classList.add('visible');
      }
    }
  }

  _tick(nowMs) {
    const rawDt = (nowMs - this._lastTimeMs) * 0.001;
    this._lastTimeMs = nowMs;
    const dtSec = Math.min(0.05, Math.max(0.001, rawDt));
    this.elapsedSec += dtSec;
    const t = this.elapsedSec;

    // 1. Advance continuous wave & hull physics so the canoe never jumps across cuts
    this.oceanSim.elapsedRealSec = t;
    this._applyEnvironmentForTime(t, dtSec);

    // 2. Position camera along the cinematic spline
    this._updateCamera(t);

    // 3. Update Sky, Ocean & Fully Upgraded Vaka + Wayfinder (`Difficulty.MEDIUM`)
    const steerSubtle = Math.sin(t * 0.85) * 0.12;
    this.skyRenderer.update(
      dtSec,
      t,
      this.oceanSim,
      Difficulty.MEDIUM,
      this.camera,
      null,
      this.worldCues.group.visible ? this.worldCues : null,
      this.gameState
    );
    this.oceanRenderer.update(dtSec, t, this.oceanSim, false, 0.0, null);
    this.vakaRenderer.update(dtSec, t, this.oceanSim, this.gameState, steerSubtle, {
      showPlayerOnCanoe: true,
      difficultyOverride: Difficulty.MEDIUM,
      playerOpacity: 1.0,
      lookYawDeg: Math.sin(t * 0.52) * 8.0,
    });

    // 4. Trigger title & Start button overlays
    this._updateOverlays(t);

    if (!this._webglContextLost) {
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this._tick);
  }
}

window.__KAVENGA_INTRO__ = new KavengaIntroDirector();
