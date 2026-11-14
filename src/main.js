/**
 * Main Web 3D Application Orchestrator for Kavenga: Songs of the Star Path.
 * Wires Three.js renderers (SkyDome, Ocean, Vaka, WorldCues, CameraController),
 * Headless Simulation Core (OceanSim, GameState, CampaignManager),
 * Web Audio Synthesis (ChantAndDrumEngine, SpatialSeaAudio),
 * and Zero-Compass UI (IslandHubUI, SailingHUD).
 */

import * as THREE from 'three';
import { ChantAndDrumEngine } from './audio/ChantAndDrumEngine.js';
import { SpatialSeaAudio } from './audio/SpatialSeaAudio.js';
import { onVoyageLandfall } from './core/campaignManager.js';
import {
  DepartureWindow,
  departureWindowToHour,
  GameConstants,
  posMod,
  wrapDeg180,
} from './core/gameConstants.js';
import { GameState } from './core/gameState.js';
import { ISLANDS } from './data/islandsData.js';
import { buildReturnSong, SONGS } from './data/songsData.js';
import { CameraController } from './rendering/CameraController.js';
import { getIslandShoreRadiusM } from './rendering/IslandTerrainBuilder.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { SkyDomeRenderer } from './rendering/SkyDomeRenderer.js';
import { StarRingRenderer } from './rendering/StarRingRenderer.js';
import { VakaRenderer } from './rendering/VakaRenderer.js';
import { WorldCuesRenderer } from './rendering/WorldCuesRenderer.js';
import { sampleTwinHullState } from './simulation/hullPhysics.js';
import { computeLeewayDeg, OceanSim, VoyageStatus } from './simulation/oceanSim.js';
import { IslandHubUI } from './ui/IslandHubUI.js';
import { SailingHUD } from './ui/SailingHUD.js';
import { SkyVigilUI } from './ui/SkyVigilUI.js';

class KavengaApp {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.skyLabelsEl = document.getElementById('sky-labels-layer');
    this.hudRootEl = document.getElementById('sailing-hud');
    this.vigilRootEl = document.getElementById('sky-vigil-ui');
    this.hubRootEl = document.getElementById('island-hub');

    // 1. State & Simulation
    this.gameState = new GameState();
    const hasSavedProgress = this.gameState.loadFromLocalStorage();
    this.oceanSim = new OceanSim();
    this.phase = 'shore'; // 'shore' | 'sailing' | 'sky_vigil'

    // ~2.15s 3D Landfall Arrival Cinematic state (canoe glides to island edge; camera pulls back & up)
    this.landfallAnim = {
      active: false,
      finished: false,
      elapsed: 0.0,
      duration: 2.15,
      rawT: 0.0,
      glide: 0.0,
      canoeTravelM: 22.0,
      bowStopZAbs: 30.63,
      shoreGapM: 3.2,
      islandId: null,
      startHeadingDeg: 0.0,
      targetBearingDeg: 0.0,
      startHeaveM: 0.0,
      startPitchRad: 0.0,
      startRollRad: 0.0,
    };

    // ~2.95s 3D Island Launch Departure Cinematic state (bird's-eye over island & leaving canoe -> 1st-person)
    this.launchAnim = {
      active: false,
      finished: true,
      justStarted: false,
      elapsed: 0.0,
      duration: 2.95,
      rawT: 0.0,
      glide: 0.0,
      canoeStartZ: 24.0,
      curCanoeZ: 0.0,
      shoreGapM: 3.25,
      startIslandZ: 70.0,
      islandId: null,
      sternBearingDeg: 180.0,
    };

    // 2. Three.js Renderer & Scene
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.cameraCtrl = new CameraController(this.renderer.domElement);
    this.skyDome = new SkyDomeRenderer(this.scene, this.skyLabelsEl);
    this.oceanRenderer = new OceanRenderer(this.scene);
    this.vakaRenderer = new VakaRenderer(this.scene);
    this.worldCues = new WorldCuesRenderer(this.scene);
    this.starRing = new StarRingRenderer(this.scene, this.skyLabelsEl);

    // Seed peaceful coastal preview state behind Island Hub at the current island's latitude
    this.oceanSim.startVoyage(
      SONGS.song_01,
      DepartureWindow.DUSK,
      this.gameState
    );
    this.oceanSim.status = VoyageStatus.IDLE;
    this.oceanSim.setShoreIsland(this.gameState.currentIslandId);

    // 3. Web Audio Engines
    this.chantEngine = new ChantAndDrumEngine();
    this.spatialAudio = new SpatialSeaAudio(this.chantEngine);

    // 4. UI Layers
    this.islandHub = new IslandHubUI(this.hubRootEl, {
      getGameState: () => this.gameState,
      onChangeDifficulty: (mode) => this.setDifficulty(mode),
      onLaunchVoyage: (song, depWindow) => this.launchVoyage(song, depWindow),
      onOpenSkyVigil: (opts) => this.enterSkyVigil(opts),
    });

    this.skyVigilUI = new SkyVigilUI(this.vigilRootEl, {
      getOceanSim: () => this.oceanSim,
      getCameraCtrl: () => this.cameraCtrl,
      onExitVigil: () => this.exitSkyVigil(),
      onPlayChime: () => this.chantEngine.playStarSightedChime(),
    });

    this.sailingHud = new SailingHUD(this.hudRootEl, {
      getGameState: () => this.gameState,
      getOceanSim: () => this.oceanSim,
      onToggleCameraView: () => {
        this.cameraCtrl.toggleThirdPersonView();
      },
      onToggleFreeLook: () => {
        if (this.cameraCtrl.isGazeOffset()) {
          this.cameraCtrl.recenterGaze();
        } else {
          this.cameraCtrl.lookAstern();
        }
      },
      onLookZenith: () => {
        if (this.cameraCtrl.lookPitchOffsetDeg > 40.0) {
          this.cameraCtrl.recenterGaze();
        } else {
          this.cameraCtrl.lookZenith();
        }
      },
      onToggleFastForward: () => {
        this.oceanSim.setFastForward(!this.oceanSim.fastForward);
      },
      onVirtualKey: (code, down) => {
        if (down) this.cameraCtrl.keysDown.add(code);
        else this.cameraCtrl.keysDown.delete(code);
      },
      onChangeDifficulty: (mode) => this.setDifficulty(mode),
      onToggleMute: () => this.chantEngine.toggleMute(),
      onRestorePreVoyage: () => this.restoreBeforeVoyage(),
      onConfirmLandfall: () => this.completeLandfallTransition(),
    });

    this.islandHub.show(hasSavedProgress ? 'landing' : 'sanctuary');
    this.sailingHud.hide();
    this.skyVigilUI.hide();

    // Direct URL boot support for instant testing:
    //   ?mode=sky_vigil&master=terai|akura&island=<id>&tab=lessons|atlas|quiz
    //   ?mode=landfall&island=<id>&window=dawn|midday|dusk|midnight&lead=<sec>
    //   ?mode=launch&island=<id>&window=dawn|midday|dusk|midnight
    this._checkStartupUrlParams();

    window.addEventListener('resize', () => this._onResize());

    this._lastFrameMs = performance.now();
    this._elapsedAppSec = 0.0;
    this._animate = this._animate.bind(this);
    window.requestAnimationFrame(this._animate);
  }

  _checkStartupUrlParams() {
    if (typeof window === 'undefined' || !window.location?.search) return;
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const urlIsland = params.get('island');
    const urlMaster = params.get('master');
    const urlTab = params.get('tab');

    if (urlMode === 'launch' || params.get('launch') === '1') {
      this.previewLaunch({
        islandId: urlIsland || undefined,
        songId: params.get('song') || undefined,
        windowId: params.get('window') || undefined,
      });
      return;
    }

    if (urlMode === 'landfall' || params.get('landfall') === '1') {
      const rawLead = params.get('lead');
      const parsedLead = rawLead !== null ? Number(rawLead) : undefined;
      this.previewLandfall({
        islandId: urlIsland || undefined,
        songId: params.get('song') || undefined,
        windowId: params.get('window') || undefined,
        leadSec:
          params.get('instant') === '1'
            ? 0.0
            : Number.isFinite(parsedLead)
              ? Math.max(0.0, parsedLead)
              : 1.6,
      });
      return;
    }

    if (urlIsland && ISLANDS[urlIsland]) {
      this.gameState.currentIslandId = urlIsland;
      this.gameState.currentBasinId = ISLANDS[urlIsland].basinId;
      this.oceanSim.setShoreIsland(urlIsland);
      this.islandHub.refresh();
    }

    if (urlMode === 'sky_vigil' || params.get('vigil') === '1') {
      const islObj = urlIsland && ISLANDS[urlIsland] ? ISLANDS[urlIsland] : null;
      const resolvedMaster =
        urlMaster ||
        islObj?.starMasterId ||
        (islObj && islObj.latDeg > 0 ? 'akura' : 'terai');
      this.enterSkyVigil({
        masterId: resolvedMaster,
        islandId: islObj ? islObj.id : undefined,
        mode: urlTab || 'lessons',
      });
    }
  }

  /**
   * Launches directly from any of the 16 campaign islands so the bird's-eye departure
   * sweep into 1st-person sailing view can be previewed immediately via ?mode=launch.
   */
  previewLaunch(opts = {}) {
    const windowMap = {
      dawn: DepartureWindow.DAWN,
      morning: DepartureWindow.DAWN,
      midday: DepartureWindow.MIDDAY,
      noon: DepartureWindow.MIDDAY,
      afternoon: DepartureWindow.MIDDAY,
      dusk: DepartureWindow.DUSK,
      sunset: DepartureWindow.DUSK,
      midnight: DepartureWindow.MIDNIGHT,
      night: DepartureWindow.MIDNIGHT,
    };

    let song = opts.songId && SONGS[opts.songId] ? SONGS[opts.songId] : null;
    const requestedOrigin =
      opts.islandId && ISLANDS[opts.islandId] ? opts.islandId : null;

    if (!song) {
      const originId = requestedOrigin || this.gameState.currentIslandId || 'raiatea';
      song = Object.values(SONGS).find((s) => s.fromIsland === originId) || null;
      if (!song && ISLANDS[originId]) {
        const sameBasinPeer = Object.values(ISLANDS).find(
          (isl) => isl.id !== originId && isl.basinId === ISLANDS[originId].basinId
        );
        if (sameBasinPeer) {
          song = buildReturnSong(originId, sameBasinPeer.id);
        }
      }
      if (!song) song = SONGS.song_01;
    }

    const fromIsl = ISLANDS[song.fromIsland];
    if (fromIsl) {
      this.gameState.currentIslandId = fromIsl.id;
      this.gameState.currentBasinId = fromIsl.basinId;
    }

    const explicitWin = opts.windowId
      ? windowMap[String(opts.windowId).toLowerCase()]
      : null;
    const depWindow = explicitWin || song.recommendedDeparture || DepartureWindow.DAWN;

    this.launchVoyage(song, depWindow);
  }

  /**
   * Jumps directly onto final Ring 4 approach to any of the 16 campaign islands so the
   * 3D landfall arrival pullback and shoreline glide can be previewed immediately.
   */
  previewLandfall(opts = {}) {
    const windowMap = {
      dawn: DepartureWindow.DAWN,
      morning: DepartureWindow.DAWN,
      midday: DepartureWindow.MIDDAY,
      noon: DepartureWindow.MIDDAY,
      afternoon: DepartureWindow.MIDDAY,
      dusk: DepartureWindow.DUSK,
      sunset: DepartureWindow.DUSK,
      midnight: DepartureWindow.MIDNIGHT,
      night: DepartureWindow.MIDNIGHT,
    };

    let song = opts.songId && SONGS[opts.songId] ? SONGS[opts.songId] : null;
    const requestedIsland =
      opts.islandId && ISLANDS[opts.islandId] ? opts.islandId : null;

    if (!song) {
      const targetId = requestedIsland || 'tahaa';
      song =
        Object.values(SONGS).find((s) => s.toIsland === targetId) ||
        (targetId === 'raiatea' ? buildReturnSong('tahaa', 'raiatea') : null) ||
        SONGS.song_01;
    }

    const fromIsl = ISLANDS[song.fromIsland];
    if (fromIsl) {
      this.gameState.currentIslandId = fromIsl.id;
      this.gameState.currentBasinId = fromIsl.basinId;
    }

    const explicitWin = opts.windowId
      ? windowMap[String(opts.windowId).toLowerCase()]
      : null;
    const depWindow = explicitWin || song.recommendedDeparture || DepartureWindow.DAWN;

    this.launchVoyage(song, depWindow);
    this._resetLaunchAnimation();

    const sim = this.oceanSim;
    const targetId =
      requestedIsland && sim.activeIslands[requestedIsland]
        ? requestedIsland
        : song.toIsland;
    const target = sim.activeIslands[targetId];
    if (!target?.simPos) return;

    let backX = sim.startPos.x - target.simPos.x;
    let backY = sim.startPos.y - target.simPos.y;
    let backLen = Math.hypot(backX, backY);
    if (backLen < 1e-4) {
      backX = 0.0;
      backY = -1.0;
      backLen = 1.0;
    }

    const leadSec = Number.isFinite(opts.leadSec) ? Math.max(0.0, opts.leadSec) : 1.6;
    const speedUnitsPerSec =
      (GameConstants.NOMINAL_SPEED_UNITS_PER_MIN * sim.speedConditionFactor) / 60.0;
    const approachDist =
      leadSec <= 0.001
        ? Math.max(0.05, sim.ringRadii.ring4 - 0.02)
        : sim.ringRadii.ring4 + speedUnitsPerSec * leadSec;

    sim.pos.x = target.simPos.x + (backX / backLen) * approachDist;
    sim.pos.y = target.simPos.y + (backY / backLen) * approachDist;
    sim.verseIndex = Math.max(0, song.verses.length - 1);
    sim.elapsedRealSec = Math.max(60.0, (song.expectedDurationMin ?? 4.0) * 60.0 * 0.9);

    if (explicitWin) {
      sim.solarHour = departureWindowToHour(explicitWin);
    } else {
      const hrsPerMin =
        song.gameHoursPerRealMin ?? 60.0 / GameConstants.REAL_SECONDS_PER_GAME_HOUR;
      sim.solarHour = posMod(
        departureWindowToHour(depWindow) + (sim.elapsedRealSec / 60.0) * hrsPerMin,
        24.0
      );
    }

    const dx = target.simPos.x - sim.pos.x;
    const dy = target.simPos.y - sim.pos.y;
    const directBearingDeg = posMod((Math.atan2(dx, dy) * 180.0) / Math.PI, 360.0);

    const estLeeway = computeLeewayDeg(
      directBearingDeg,
      sim.getWindFromAz(),
      sim.hasSailTender,
      Boolean(song.strongCrosswind)
    );
    sim.headingDeg = posMod(directBearingDeg - estLeeway, 360.0);
    sim._refreshEnvironment(0.0);

    // Pre-warm island beacon fade/rise so terrain, peak cloud, and fronds are settled at Frame 1
    for (let i = 0; i < 24; i += 1) {
      this.worldCues.update(0.1, 0.0, sim, null);
    }
    this.sailingHud.update(sim, this.gameState, this.cameraCtrl, true);
  }

  _beginLaunchAnimation(islandId) {
    const resolvedId = islandId || this.oceanSim.song?.fromIsland;
    if (!resolvedId) return;

    const islDef =
      ISLANDS[resolvedId] || this.oceanSim.activeIslands?.[resolvedId];
    const shoreRadiusM = getIslandShoreRadiusM(resolvedId, islDef?.archetype);
    const startIslandZ =
      this.launchAnim.canoeStartZ +
      7.75 +
      this.launchAnim.shoreGapM +
      shoreRadiusM;

    this.launchAnim.active = true;
    this.launchAnim.finished = false;
    this.launchAnim.justStarted = true;
    this.launchAnim.elapsed = 0.0;
    this.launchAnim.rawT = 0.0;
    this.launchAnim.glide = 0.0;
    this.launchAnim.curCanoeZ = this.launchAnim.canoeStartZ;
    this.launchAnim.startIslandZ = startIslandZ;
    this.launchAnim.islandId = resolvedId;
    this.launchAnim.sternBearingDeg = posMod(
      this.oceanSim.headingDeg + 180.0,
      360.0
    );

    const hull = this.oceanSim.hullState;
    this.vakaRenderer.root.position.set(
      0.0,
      hull ? hull.heaveM * 0.25 : 0.0,
      this.launchAnim.canoeStartZ
    );
    this.cameraCtrl.startLaunchCamera(startIslandZ, this.launchAnim.canoeStartZ);
  }

  _resetLaunchAnimation() {
    this.launchAnim.active = false;
    this.launchAnim.finished = true;
    this.launchAnim.justStarted = false;
    this.launchAnim.elapsed = 0.0;
    this.launchAnim.rawT = 0.0;
    this.launchAnim.glide = 0.0;
    this.launchAnim.curCanoeZ = 0.0;
    this.launchAnim.islandId = null;
    if (!this.landfallAnim.active) {
      this.vakaRenderer.root.position.set(0.0, 0.0, 0.0);
    }
    this.cameraCtrl.resetLaunchCamera();
  }

  _beginLandfallAnimation(islandId) {
    this._resetLaunchAnimation();
    const resolvedId =
      islandId || this.oceanSim.arrivedIsland?.id || this.oceanSim.song?.toIsland;
    if (!resolvedId) return;

    let bearingDeg = this.oceanSim.headingDeg;
    const det = this.oceanSim.detections.find((d) => d.islandId === resolvedId);
    const activeIsl = this.oceanSim.activeIslands?.[resolvedId];
    if (det) {
      bearingDeg = det.bearingDeg;
    } else if (activeIsl?.simPos && this.oceanSim.pos) {
      const dx = activeIsl.simPos.x - this.oceanSim.pos.x;
      const dy = activeIsl.simPos.y - this.oceanSim.pos.y;
      bearingDeg = posMod((Math.atan2(dx, dy) * 180.0) / Math.PI, 360.0);
    }

    const hull = this.oceanSim.hullState;
    this.landfallAnim.active = true;
    this.landfallAnim.finished = false;
    this.landfallAnim.elapsed = 0.0;
    this.landfallAnim.rawT = 0.0;
    this.landfallAnim.glide = 0.0;
    this.landfallAnim.islandId = resolvedId;
    this.landfallAnim.startHeadingDeg = this.oceanSim.headingDeg;
    this.landfallAnim.targetBearingDeg = bearingDeg;
    this.landfallAnim.startHeaveM = hull ? hull.heaveM : 0.0;
    this.landfallAnim.startPitchRad = hull ? hull.pitchRad : 0.0;
    this.landfallAnim.startRollRad = hull ? hull.rollRad : 0.0;

    this.vakaRenderer.root.position.set(0.0, hull ? hull.heaveM : 0.0, 0.0);
    this.cameraCtrl.startLandfallCamera();
    this.chantEngine.stop();
  }

  _resetLandfallAnimation() {
    this.landfallAnim.active = false;
    this.landfallAnim.finished = false;
    this.landfallAnim.elapsed = 0.0;
    this.landfallAnim.rawT = 0.0;
    this.landfallAnim.glide = 0.0;
    this.landfallAnim.islandId = null;
    this.vakaRenderer.root.position.set(0.0, 0.0, 0.0);
    this.cameraCtrl.resetLandfallCamera();
  }

  enterSkyVigil(opts = {}) {
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this.chantEngine.stop();
    this.spatialAudio.stop();

    this.phase = 'sky_vigil';
    this.islandHub.hide();
    this.sailingHud.hide();

    this.vakaRenderer.root.visible = false;
    this.worldCues.group.visible = false;
    this.starRing.setVisible(true);
    this.cameraCtrl.setVigilMode(true);

    this.skyVigilUI.show(opts);
  }

  exitSkyVigil() {
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this.skyVigilUI.hide();
    this.starRing.setVisible(false);
    this.cameraCtrl.setVigilMode(false);

    this.vakaRenderer.root.visible = true;
    this.worldCues.group.visible = true;
    this.skyLabelsEl
      .querySelectorAll('.sky-star-label')
      .forEach((el) => (el.style.display = 'none'));

    this.phase = 'shore';
    this.oceanSim.setShoreIsland(this.gameState.currentIslandId);
    this.islandHub.show('sand');
  }

  setDifficulty(mode) {
    this.gameState.difficulty = mode;
    this.gameState.saveToLocalStorage();
    if (this.phase === 'sailing') {
      this.chantEngine.syncState({
        difficulty: mode,
        fastForward: this.oceanSim.fastForward,
        verseIndex: this.oceanSim.verseIndex,
      });
      this.sailingHud.update(
        this.oceanSim,
        this.gameState,
        this.cameraCtrl,
        !this.landfallAnim.active || this.landfallAnim.finished,
        this.launchAnim.active
      );
    }
  }

  launchVoyage(song, departureWindow) {
    // Snapshot pre-voyage state so Lost at Sea / Return to Shore restores cleanly with zero loss!
    this.gameState.savePreVoyageSnapshot();
    this._resetLandfallAnimation();
    this._resetLaunchAnimation();

    this.phase = 'sailing';
    this.skyVigilUI.hide();
    this.starRing.setVisible(false);
    this.cameraCtrl.setVigilMode(false);
    this.cameraCtrl.setThirdPersonView(false, true);
    this.vakaRenderer.root.visible = true;
    this.worldCues.group.visible = true;

    this.islandHub.hide();
    this.sailingHud.show();
    this.cameraCtrl.recenterGaze();

    this.oceanSim.startVoyage(song, departureWindow, this.gameState);
    this.chantEngine.startVoyageSong(song, this.gameState.difficulty);
    this.spatialAudio.start();

    this._beginLaunchAnimation(song.fromIsland);
    this.sailingHud.update(
      this.oceanSim,
      this.gameState,
      this.cameraCtrl,
      true,
      this.launchAnim.active
    );
  }

  restoreBeforeVoyage() {
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this.chantEngine.stop();
    this.spatialAudio.stop();
    this.gameState.restorePreVoyageSnapshot();
    this.phase = 'shore';
    this.skyLabelsEl
      .querySelectorAll('.sky-star-label')
      .forEach((el) => (el.style.display = 'none'));
    this.sailingHud.hide();
    this.islandHub.show('landing');
  }

  completeLandfallTransition() {
    const arrivedId =
      this.oceanSim.arrivedIsland?.id || this.oceanSim.song?.toIsland;
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this.chantEngine.stop();
    this.spatialAudio.stop();

    // Persist remaining voyage rations rounded up to whole baskets (minimum 1)
    this.gameState.loadedRations = Math.max(
      1,
      Math.min(
        this.gameState.maxCargoSlots - this.gameState.cargoItems.length,
        Math.ceil(this.oceanSim.rationsRemaining)
      )
    );
    onVoyageLandfall(this.gameState, arrivedId);

    this.phase = 'shore';
    this.skyLabelsEl
      .querySelectorAll('.sky-star-label')
      .forEach((el) => (el.style.display = 'none'));
    this.sailingHud.hide();
    this.islandHub.show(ISLANDS[arrivedId]?.inhabited ? 'sanctuary' : 'landing');
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraCtrl.resize(w, h);
  }

  _animate(nowMs) {
    const dtSec = Math.min(0.1, Math.max(0.001, (nowMs - this._lastFrameMs) / 1000.0));
    this._lastFrameMs = nowMs;
    this._elapsedAppSec += dtSec;

    const isActivelySailing =
      this.phase === 'sailing' &&
      this.oceanSim.status === VoyageStatus.SAILING &&
      !this.sailingHud.pauseOpen &&
      !this.launchAnim.active;

    if (this.phase === 'sky_vigil') {
      this.skyVigilUI.update(dtSec, this.oceanSim, this.cameraCtrl);
      this.oceanSim._refreshEnvironment(0);
      this.cameraCtrl.update(dtSec, this.oceanSim, false);

      this.vakaRenderer.sunLight.intensity =
        1.65 * this.oceanSim.sunState.daylightFactor;
      this.vakaRenderer.hemiLight.intensity =
        0.2 + 0.68 * this.oceanSim.sunState.daylightFactor;

      this.skyDome.update(
        dtSec,
        this._elapsedAppSec,
        this.oceanSim,
        this.gameState.difficulty,
        this.cameraCtrl.camera,
        this.skyVigilUI.getSkyDomeOverrides()
      );
      this.oceanRenderer.update(dtSec, this._elapsedAppSec, this.oceanSim, true);
      this.starRing.update(
        this._elapsedAppSec,
        this.cameraCtrl.camera,
        this.skyVigilUI.getStarRingOverrides()
      );

      this.renderer.render(this.scene, this.cameraCtrl.camera);
      window.requestAnimationFrame(this._animate);
      return;
    }

    let justStartedLandfall = false;
    if (isActivelySailing) {
      const events = this.oceanSim.step(dtSec);
      for (const ev of events) {
        if (ev.type === 'fish_school_foraged') {
          this.sailingHud.showToast(
            'Fresh bonito caught from the leaping school — ration baskets replenished!'
          );
        } else if (ev.type === 'low_rations_warning') {
          this.chantEngine.playLowRationsWarning();
          this.sailingHud.showToast(
            'Gourds and woven ration baskets are running low...'
          );
        } else if (ev.type === 'landfall') {
          this.chantEngine.playLandfallConch();
          this._beginLandfallAnimation(ev.islandId);
          justStartedLandfall = true;
        }
      }

      if (!this.landfallAnim.active) {
        this.chantEngine.syncState({
          difficulty: this.gameState.difficulty,
          fastForward: this.oceanSim.fastForward,
          verseIndex: this.oceanSim.verseIndex,
        });
        this.spatialAudio.update(dtSec, this.oceanSim, this.gameState);
      }
    } else if (
      this.phase === 'sailing' &&
      this.oceanSim.status === VoyageStatus.ARRIVED &&
      !this.landfallAnim.active
    ) {
      this._beginLandfallAnimation(this.oceanSim.arrivedIsland?.id);
      justStartedLandfall = true;
    } else if (this.phase === 'shore') {
      // Gentle ambient lagoon twilight behind Island Hub at the current island's exact latitude
      this.oceanSim.setShoreIsland(this.gameState.currentIslandId);
      this.oceanSim.solarHour =
        (18.55 + Math.sin(this._elapsedAppSec * 0.03) * 0.25 + 24.0) % 24.0;
      this.oceanSim._refreshEnvironment(dtSec);
    }

    if (this.launchAnim.active) {
      if (this.launchAnim.justStarted) {
        this.launchAnim.justStarted = false;
      } else if (!this.sailingHud.pauseOpen) {
        this.launchAnim.elapsed = Math.min(
          this.launchAnim.duration,
          this.launchAnim.elapsed + dtSec
        );
      }

      const rawT = Math.min(
        1.0,
        this.launchAnim.elapsed / this.launchAnim.duration
      );
      const smoothT = rawT * rawT * (3.0 - 2.0 * rawT);
      const easeOutT = 1.0 - Math.pow(1.0 - rawT, 2.5);
      const glide = 0.45 * smoothT + 0.55 * easeOutT;

      this.launchAnim.rawT = rawT;
      this.launchAnim.glide = glide;
      this.launchAnim.curCanoeZ = this.launchAnim.canoeStartZ * (1.0 - glide);

      this.oceanSim._refreshEnvironment(0);
      const liveHull = sampleTwinHullState({
        elapsedSec: this.launchAnim.elapsed - this.launchAnim.duration,
        bpm: this.oceanSim.song?.bpm ?? 60.0,
        canoeHeadingDeg: this.oceanSim.headingDeg,
        primarySwellFromAz: this.oceanSim.getPrimarySwellFromAz(),
        secondaryChopFromAz: this.oceanSim.song?.secondaryChopFromAz ?? null,
      });
      const swellRamp = 0.25 + 0.75 * smoothT;
      liveHull.heaveM *= swellRamp;
      liveHull.pitchRad *= swellRamp;
      liveHull.rollRad *= swellRamp;
      this.oceanSim.hullState = liveHull;

      this.vakaRenderer.root.position.x = 0.0;
      this.vakaRenderer.root.position.z = this.launchAnim.curCanoeZ;

      this.chantEngine.syncState({
        difficulty: this.gameState.difficulty,
        fastForward: false,
        verseIndex: this.oceanSim.verseIndex,
      });
      this.spatialAudio.update(dtSec, this.oceanSim, this.gameState);
    }

    if (this.landfallAnim.active) {
      if (!justStartedLandfall && !this.sailingHud.pauseOpen) {
        this.landfallAnim.elapsed = Math.min(
          this.landfallAnim.duration,
          this.landfallAnim.elapsed + dtSec
        );
      }
      const rawT = Math.min(
        1.0,
        this.landfallAnim.elapsed / this.landfallAnim.duration
      );
      const glide = 1.0 - Math.pow(1.0 - rawT, 3.0);
      this.landfallAnim.rawT = rawT;
      this.landfallAnim.glide = glide;
      this.landfallAnim.finished = rawT >= 0.999;

      // Smoothly align prows toward the arrived island over the opening ~0.95s
      const turnU = Math.min(1.0, rawT / 0.45);
      const turnT = turnU * turnU * (3.0 - 2.0 * turnU);
      const deltaHeading = wrapDeg180(
        this.landfallAnim.targetBearingDeg - this.landfallAnim.startHeadingDeg
      );
      this.oceanSim.headingDeg = posMod(
        this.landfallAnim.startHeadingDeg + deltaHeading * turnT,
        360.0
      );
      this.oceanSim._refreshEnvironment(0);

      // Damp open-sea swell pitch/roll/heave smoothly to calm lagoon stillness
      const calmDecay = 1.0 - glide;
      if (this.oceanSim.hullState) {
        this.oceanSim.hullState.heaveM = this.landfallAnim.startHeaveM * calmDecay;
        this.oceanSim.hullState.pitchRad = this.landfallAnim.startPitchRad * calmDecay;
        this.oceanSim.hullState.rollRad = this.landfallAnim.startRollRad * calmDecay;
      }

      // Glide double-hulled canoe forward across the lagoon to a dead stop at z = -22m
      this.vakaRenderer.root.position.x = 0.0;
      this.vakaRenderer.root.position.z = -this.landfallAnim.canoeTravelM * glide;
      this.spatialAudio.stop();
    }

    this.cameraCtrl.update(
      dtSec,
      this.oceanSim,
      isActivelySailing && !this.landfallAnim.active,
      this.landfallAnim.active ? this.landfallAnim : null,
      this.launchAnim.active ? this.launchAnim : null
    );
    this.skyDome.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.phase === 'sailing' &&
        !this.landfallAnim.active &&
        !this.launchAnim.active
        ? this.gameState.difficulty
        : 'master_navigator',
      this.cameraCtrl.camera
    );
    this.oceanRenderer.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      false,
      this.landfallAnim.active ? this.landfallAnim.rawT : 0.0,
      {
        canoeZ: this.vakaRenderer.root.position.z,
        launchProgress01: this.launchAnim.active ? this.launchAnim.rawT : null,
      }
    );
    this.vakaRenderer.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.gameState,
      this.landfallAnim.active || this.launchAnim.active
        ? 0.0
        : this.cameraCtrl.getSteeringNormalized()
    );
    if (this.landfallAnim.active) {
      // Ensure starlit / moonlight shore clarity even during deep-night arrivals
      const nightLift = 0.34 * Math.min(1.0, this.landfallAnim.rawT / 0.65);
      this.vakaRenderer.hemiLight.intensity = Math.max(
        this.vakaRenderer.hemiLight.intensity,
        0.28 + nightLift
      );
    } else if (this.launchAnim.active) {
      // Ensure starlit / moonlight island & shore clarity during deep-night bird's-eye departures
      const fadeOut = Math.max(0.0, (this.launchAnim.rawT - 0.55) / 0.45);
      const launchNightLift = 0.38 * (1.0 - fadeOut);
      this.vakaRenderer.hemiLight.intensity = Math.max(
        this.vakaRenderer.hemiLight.intensity,
        0.26 + launchNightLift
      );
    }
    this.worldCues.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.landfallAnim.active ? this.landfallAnim : null,
      this.launchAnim.active ? this.launchAnim : null
    );

    if (this.launchAnim.active && this.launchAnim.rawT >= 0.999) {
      this._resetLaunchAnimation();
    }

    if (this.phase === 'sailing') {
      this.sailingHud.update(
        this.oceanSim,
        this.gameState,
        this.cameraCtrl,
        !this.landfallAnim.active || this.landfallAnim.finished,
        this.launchAnim.active
      );
    }

    this.renderer.render(this.scene, this.cameraCtrl.camera);
    window.requestAnimationFrame(this._animate);
  }
}

const app = new KavengaApp();
window.__KAVENGA_APP__ = app;
