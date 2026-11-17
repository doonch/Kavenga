/**
 * Cinematic Real-Time 3D Introduction Sequence for Kavenga: Songs of the Star Path (`intro.html`).
 *
 * Choreography:
 *  1. [0.0s – 4.0s]  Mid-ocean, midday, fully upgraded Tier-3 Vaka Moana with nothing around
 *                    but endless swells and waves.
 *  2. [4.0s – 7.6s]  Camera swoops cinematically behind the stern ("canoe view"), showcasing
 *                    the canoe and the child navigator (`Difficulty.EASY`) from behind.
 *  3. [7.6s – 21.2s] Camera glides smoothly from behind around to the left (port, `-X`) side
 *                    while the environment abruptly cuts through four distinct worlds around
 *                    the unchanging, continuously wave-riding canoe:
 *                      - [7.6s  – 11.0s] Clear starry night (bright stars & Te Mangoroa visible)
 *                      - [11.0s – 14.4s] Golden-coral twilight with marching trade-wind clouds
 *                      - [14.4s – 17.8s] Bright day again with flocks of seabirds flying
 *                      - [17.8s – 21.2s] Foggy night with silver fish jumping next to the canoe
 *  4. [21.2s – ∞]    Abrupt cut to golden dusk on the port-beam profile view with the sun
 *                    setting directly behind the visible canoe:
 *                      - `assets/banner.png` ("Kavenga") slowly eases in at the top
 *                      - "Songs of the Star Path" appears right beneath it
 *                      - The sun sets completely below the horizon and starry night falls
 *                      - The canoe keeps bouncing naturally on the waves as "Start" appears
 */

import * as THREE from 'three';
import { DepartureWindow, Difficulty } from './core/gameConstants.js';
import { GameState } from './core/gameState.js';
import { SONGS } from './data/songsData.js';
import { OceanSim } from './simulation/oceanSim.js';
import { SkyDomeRenderer } from './rendering/SkyDomeRenderer.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { VakaRenderer } from './rendering/VakaRenderer.js';
import { WorldCuesRenderer } from './rendering/WorldCuesRenderer.js';

// Timeline cue timestamps (seconds)
const T_MOVE_TO_STERN_START = 3.6;
const T_ARRIVE_BEHIND_NAVIGATOR = 6.4;
const T_ORBIT_TO_LEFT_START = 6.9;
const T_CUT_STARRY_NIGHT = 7.6;
const T_CUT_TWILIGHT_CLOUDS = 11.0;
const T_CUT_DAY_BIRDS = 14.4;
const T_CUT_FOG_NIGHT_FISH = 17.8;
const T_CUT_DUSK_FINALE = 21.2;

const T_BANNER_IN = 21.7;
const T_SUBTITLE_IN = 25.0;
const T_SUNSET_COMPLETE = 29.6;
const T_START_BTN_IN = 29.9;

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
    this.container.appendChild(this.renderer.domElement);

    // Build fully upgraded Tier-3 Vaka Moana state with the child navigator (`Difficulty.EASY`)
    // and 0 learned constellations so night skies showcase pure, sparkling, unmarked stars.
    this.gameState = new GameState();
    this.gameState.difficulty = Difficulty.EASY;
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
    // Place canoe far out in empty blue ocean so zero islands ever enter detection rings
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

    // Build dedicated cinematic bird flocks (Scene 4) & close-up leaping fish + splash rings (Scene 5)
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

  _buildIntroBirdFlocks() {
    this.introBirdsGroup = new THREE.Group();
    this.introBirdsGroup.visible = false;
    this.scene.add(this.introBirdsGroup);

    this.introBirds = [];
    // Three distinct flocks sweeping overhead & past the sails in bright daylight
    const flockSpecs = [
      // Flock A: White Terns sweeping low across the twin crab-claw sails
      { count: 7, species: 'white_tern', baseX: 3.5, baseY: 6.6, baseZ: 18.0, vx: -0.9, vz: -11.8, scale: 1.55 },
      // Flock B: Brown Boobies soaring in high V-formation across the upper sky
      { count: 6, species: 'brown_booby', baseX: 8.5, baseY: 11.2, baseZ: 22.0, vx: -1.6, vz: -10.4, scale: 1.75 },
      // Flock C: White Terns skimming briskly past the bow wave
      { count: 5, species: 'white_tern', baseX: -2.2, baseY: 4.4, baseZ: 13.5, vx: 0.6, vz: -13.2, scale: 1.45 },
    ];

    flockSpecs.forEach((fs, fIdx) => {
      for (let i = 0; i < fs.count; i += 1) {
        const rank = i - (fs.count - 1) * 0.5;
        const vLag = Math.abs(rank) * 1.65 + (i % 2) * 0.55;
        const entry = this.worldCues.createSeabird(fs.species, { opaque: true });
        const holder = new THREE.Group();
        holder.scale.setScalar(fs.scale);
        holder.add(entry.root);
        this.introBirdsGroup.add(holder);

        const yaw = Math.atan2(-fs.vx, -fs.vz);
        holder.rotation.y = yaw;

        this.introBirds.push({
          holder,
          entry,
          phase: fIdx * 1.7 + i * 0.85,
          speedScale: 1.08 + (i % 3) * 0.08,
          startX: fs.baseX + rank * 1.55,
          startY: fs.baseY + (i % 3) * 0.65 - Math.abs(rank) * 0.18,
          startZ: fs.baseZ + vLag,
          vx: fs.vx,
          vz: fs.vz,
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
      { x: -4.45, z: 2.35, dirZ: -1.0, phase: 0.15, speed: 2.85, height: 1.55, dist: 3.1, scale: 1.28 },
      { x: -5.65, z: 0.85, dirZ: -1.0, phase: 1.25, speed: 2.65, height: 1.75, dist: 3.4, scale: 1.35 },
      { x: -4.15, z: -0.95, dirZ: -1.0, phase: 2.35, speed: 3.05, height: 1.42, dist: 2.9, scale: 1.2 },
      { x: -6.35, z: 3.1, dirZ: -1.0, phase: 3.1, speed: 2.75, height: 1.68, dist: 3.3, scale: 1.3 },
      { x: -5.05, z: -2.4, dirZ: -1.0, phase: 4.05, speed: 2.9, height: 1.5, dist: 3.0, scale: 1.24 },
      { x: -6.85, z: -0.35, dirZ: -1.0, phase: 4.95, speed: 2.6, height: 1.82, dist: 3.5, scale: 1.36 },
      { x: -4.65, z: 3.85, dirZ: -1.0, phase: 5.65, speed: 2.95, height: 1.48, dist: 3.1, scale: 1.22 },
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
    if (t < T_CUT_TWILIGHT_CLOUDS) return 1;   // Abrupt cut -> Clear bright starry night
    if (t < T_CUT_DAY_BIRDS) return 2;         // Abrupt cut -> Twilight + marching clouds
    if (t < T_CUT_FOG_NIGHT_FISH) return 3;    // Abrupt cut -> Day + flocks of flying birds
    if (t < T_CUT_DUSK_FINALE) return 4;       // Abrupt cut -> Foggy night + jumping fish
    return 5;                                  // Abrupt cut -> Dusk sunset behind canoe -> Nightfall
  }

  _applyEnvironmentForTime(t, dtSec) {
    const stage = this._resolveEnvironmentStage(t);
    const isCutFrame = stage !== this._activeEnvStage;
    this._activeEnvStage = stage;

    let solarHour = 12.2;
    let weather = 'clear';
    let showClouds = false;
    let cloudSpeedBoost = 1.0;
    let showBirds = false;
    let showFish = false;
    let instantFog = 0.0;

    if (stage === 0) {
      // 1. Mid-ocean midday: nothing around but ocean & waves
      solarHour = 12.2;
      weather = 'clear';
      showClouds = false;
    } else if (stage === 1) {
      // 2. Abrupt cut -> Nighttime with bright stars & Milky Way clearly visible
      solarHour = 23.15;
      weather = 'clear';
      showClouds = false;
    } else if (stage === 2) {
      // 3. Abrupt cut -> Warm twilight with marching trade-wind clouds moving
      solarHour = 18.18;
      weather = 'clear';
      showClouds = true;
      cloudSpeedBoost = 4.2;
    } else if (stage === 3) {
      // 4. Abrupt cut -> Bright day again with flocks of seabirds flying
      solarHour = 9.25;
      weather = 'clear';
      showClouds = false;
      showBirds = true;
    } else if (stage === 4) {
      // 5. Abrupt cut -> Night and foggy, silver fish jumping next to the canoe
      solarHour = 22.4;
      weather = 'sea_fog';
      showClouds = false;
      showFish = true;
      instantFog = 0.86;
    } else {
      // 6. Abrupt cut -> Dusk behind the canoe (17.74 -> 18.92), sun sets completely & night falls!
      const sunsetProgress = smootherstep(T_CUT_DUSK_FINALE, T_SUNSET_COMPLETE, t);
      solarHour = lerp(17.74, 18.92, sunsetProgress);
      weather = 'clear';
      showClouds = false;
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

    // Update WorldCuesRenderer (marching clouds during Stage 2, hidden otherwise)
    if (showClouds) {
      this.worldCues.group.visible = true;
      this.worldCues.tradeCloudGroup.visible = true;
      this.worldCues.tradeFogOpacity = 1.0;
      this.worldCues.update(dtSec * cloudSpeedBoost, t, this.oceanSim);
      this.worldCues.birdFlockGroup.visible = false;
      this.worldCues.fishGroup.visible = false;
      this.worldCues.frondGroup.visible = false;
    } else {
      this.worldCues.group.visible = false;
      this.worldCues._activeCloudOccluders.length = 0;
    }

    // Update Stage 3 Daylight Seabird Flocks
    this.introBirdsGroup.visible = showBirds;
    if (showBirds) {
      const localT = t - T_CUT_DAY_BIRDS;
      for (const b of this.introBirds) {
        this.worldCues.animateSeabird(b.entry, t, b.phase, b.speedScale);
        b.holder.position.set(
          b.startX + b.vx * localT,
          b.startY + b.entry.bobY * 2.2 + Math.sin(t * 1.8 + b.phase) * 0.18,
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
        // Leap occurs during cycle in [0, PI]; underwater glide during [PI, 2*PI]
        const sinC = Math.sin(cycle);
        const inAir = sinC > -0.18;
        f.mesh.visible = inAir;

        if (inAir) {
          const u = cycle / Math.PI; // ~0 at breach, ~0.5 at apex, ~1.0 at splashdown
          const arcZ = f.z + (u - 0.5) * f.dist * f.dirZ;
          const arcY = sinC * f.height;
          f.mesh.position.set(f.x, arcY, arcZ);
          // Bonito nose is +X in local space: rotateY(+PI/2) aims nose toward -Z (forward alongside canoe!),
          // and rotation.z pitches nose up on breach (+cosC) and nose down on dive (-cosC)!
          f.mesh.rotation.set(0.0, Math.PI * 0.5, Math.cos(cycle) * 0.72);
          if (f.tailPivot) {
            f.tailPivot.rotation.y = Math.sin(t * 22.0 + f.phase * 2.7) * 0.34;
          }
        }

        // Expanding water-surface splash ring on breach (cycle ~ 0) & re-entry (cycle ~ PI)
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
      // Opening wide mid-ocean midday hold: endless swells around the Vaka Moana
      const u = smootherstep(0.0, T_MOVE_TO_STERN_START, t);
      this._camPos.set(
        lerp(-22.5, -18.2, u),
        lerp(11.4, 9.4, u) + gentleBobY,
        lerp(-25.5, -20.0, u)
      );
      this._camLook.set(0.0, lerp(2.0, 2.2, u) + gentleBobY * 0.6, 0.2);
    } else if (t <= T_ARRIVE_BEHIND_NAVIGATOR) {
      // Cinematic swoop around port (-X) into the stern "canoe view" behind the child navigator
      const u = smootherstep(T_MOVE_TO_STERN_START, T_ARRIVE_BEHIND_NAVIGATOR, t);
      const angle = lerp(-2.32, 0.0, u); // Sweeps from ahead-port (-133 deg) around port to astern (0)
      const radius = lerp(27.0, 8.55, u);
      const camX = Math.sin(angle) * radius - 0.38 * u;
      const camZ = Math.cos(angle) * radius;
      const camY = lerp(9.4, 2.48, u) + gentleBobY * (0.4 + 0.6 * u);

      this._camPos.set(camX, camY, camZ);
      this._camLook.set(
        lerp(0.0, -0.08, u),
        lerp(2.2, 2.15, u) + gentleBobY * 0.8,
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
    if (!this._startShown && t >= T_START_BTN_IN) {
      this._startShown = true;
      this.startWrapEl?.classList.add('visible');
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

    // 3. Update Sky, Ocean & Fully Upgraded Vaka + Child Navigator
    const steerSubtle = Math.sin(t * 0.85) * 0.12;
    this.skyRenderer.update(
      dtSec,
      t,
      this.oceanSim,
      Difficulty.EASY,
      this.camera,
      null,
      this.worldCues.group.visible ? this.worldCues : null,
      this.gameState
    );
    this.oceanRenderer.update(dtSec, t, this.oceanSim, false, 0.0, null);
    this.vakaRenderer.update(dtSec, t, this.oceanSim, this.gameState, steerSubtle, {
      showPlayerOnCanoe: true,
      difficultyOverride: Difficulty.EASY,
      playerOpacity: 1.0,
      lookYawDeg: Math.sin(t * 0.52) * 8.0,
    });

    // 4. Trigger title & Start button overlays
    this._updateOverlays(t);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._tick);
  }
}

window.__KAVENGA_INTRO__ = new KavengaIntroDirector();
