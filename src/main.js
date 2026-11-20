/**
 * Main Web 3D Application Orchestrator for Kavenga: Songs of the Star Path.
 * Wires Three.js renderers (SkyDome, Ocean, Vaka, WorldCues, CameraController),
 * Headless Simulation Core (OceanSim, GameState, CampaignManager),
 * Web Audio Synthesis (ChantAndDrumEngine, SpatialSeaAudio),
 * and Zero-Compass UI (IslandHubUI, SailingHUD).
 */

import * as THREE from 'three';
import { BackgroundMusicEngine } from './audio/BackgroundMusicEngine.js';
import { ChantAndDrumEngine } from './audio/ChantAndDrumEngine.js';
import { SpatialSeaAudio } from './audio/SpatialSeaAudio.js';
import { VoiceOverEngine } from './audio/VoiceOverEngine.js';
import { AchievementsManager } from './core/achievementsManager.js';
import { onVoyageLandfall } from './core/campaignManager.js';
import {
  DepartureWindow,
  Difficulty,
  departureWindowToHour,
  GameConstants,
  posMod,
  wrapDeg180,
} from './core/gameConstants.js';
import { GameState } from './core/gameState.js';
import {
  activateIslandArrivalObjective,
  getActiveObjectivesForDisplay,
} from './core/objectivesManager.js';
import {
  CONSTELLATION_LESSONS,
  getAvailableUnlearnedLessonForIsland,
} from './data/constellationLessonsData.js';
import { ISLANDS } from './data/islandsData.js';
import {
  ISLAND_ARRIVAL_OBJECTIVE_MAP,
  OBJECTIVES,
} from './data/objectivesData.js';
import { buildReturnSong, SONGS } from './data/songsData.js';
import {
  canWalkIsland,
  isWalkableIsland,
} from './data/walkableIslandsData.js';
import { CameraController } from './rendering/CameraController.js';
import { getIslandShoreRadiusM } from './rendering/IslandTerrainBuilder.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { ShoreDioramaRenderer } from './rendering/ShoreDioramaRenderer.js';
import { SkyDomeRenderer } from './rendering/SkyDomeRenderer.js';
import { StarRingRenderer } from './rendering/StarRingRenderer.js';
import { VakaRenderer } from './rendering/VakaRenderer.js';
import { WalkableIslandScene } from './rendering/WalkableIslandScene.js';
import { WorldCuesRenderer } from './rendering/WorldCuesRenderer.js';
import { sampleTwinHullState } from './simulation/hullPhysics.js';
import {
  buildVoyageDebugTraceParams,
  computeLeewayDeg,
  OceanSim,
  VoyageStatus,
} from './simulation/oceanSim.js';
import { AchievementsUI } from './ui/AchievementsUI.js';
import { CrewSplashUI } from './ui/CrewSplashUI.js';
import { ElderVigilPromptUI } from './ui/ElderVigilPromptUI.js';
import { IslandHubUI } from './ui/IslandHubUI.js';
import { IslandSettingsUI } from './ui/IslandSettingsUI.js';
import {
  clearOnboardingDone,
  OnboardingTourUI,
  SAILING_ONBOARDING_STORAGE_KEY,
  SAILING_TOUR_STEPS,
  TAHAA_CLOUD_TOUR_STEPS,
  TAHAA_CLOUD_TOUR_STORAGE_KEY,
} from './ui/OnboardingTourUI.js';
import { SailingHUD } from './ui/SailingHUD.js?v=20261119h';
import { SkyVigilUI } from './ui/SkyVigilUI.js';
import { WalkableIslandUI } from './ui/WalkableIslandUI.js';

class KavengaApp {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.skyLabelsEl = document.getElementById('sky-labels-layer');
    this.hudRootEl = document.getElementById('sailing-hud');
    this.vigilRootEl = document.getElementById('sky-vigil-ui');
    this.walkableUiRootEl = document.getElementById('walkable-island-ui');
    this.hubRootEl = document.getElementById('island-hub');
    this.crewSplashRootEl = document.getElementById('crew-splash-ui');
    this.shoreTopControlsEl = document.getElementById('shore-top-controls');
    this.btnShoreWalkToggle = document.getElementById('btnShoreWalkToggle');
    this.shoreWalkGlyphEl = document.getElementById('shoreWalkGlyph');
    this.btnShoreToggleSound = document.getElementById('btnShoreToggleSound');
    this.shoreSoundGlyphEl = document.getElementById('shoreSoundGlyph');
    this.btnShoreOpenAchievements = document.getElementById(
      'btnShoreOpenAchievements'
    );
    this.btnShoreOpenSettings = document.getElementById('btnShoreOpenSettings');
    this.settingsRootEl = document.getElementById('island-settings-ui');
    this.onboardingRootEl = document.getElementById('onboarding-tour-ui');
    this.sailingTourRootEl = document.getElementById('sailing-tour-ui');
    this.tahaaCloudTourRootEl = document.getElementById('tahaa-cloud-tour-ui');
    this.elderPromptRootEl = document.getElementById('elder-vigil-prompt-ui');
    this.achievementsRootEl = document.getElementById('achievements-ui');

    // 1. State, Objectives & Persistent Achievements
    this.gameState = new GameState();
    const hasSavedProgress = this.gameState.loadFromLocalStorage();
    // Track objective IDs already toasted so saved sessions don't re-toast on browser refresh,
    // while every genuinely newly given objective (at start, landfall, or elder quest) shows a toast!
    this._announcedObjectiveIds = new Set(
      hasSavedProgress ? Object.keys(this.gameState.activeObjectives || {}) : []
    );
    this._pendingObjectiveIds = new Set();
    this._newlyRevealedObjectiveIds = new Set();
    activateIslandArrivalObjective(
      this.gameState,
      this.gameState.currentIslandId
    );
    if (hasSavedProgress) {
      for (const id of Object.keys(this.gameState.activeObjectives || {})) {
        this._announcedObjectiveIds.add(id);
      }
    }
    this.achievementsManager = new AchievementsManager();
    this.oceanSim = new OceanSim();
    this.phase = 'shore';
    this.sailingTourUI?.hide();
    this.tahaaCloudTourUI?.hide(); // 'shore' | 'sailing' | 'sky_vigil'
    this._enteredVigilFromWalkMode = false;

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

    // ~5.90s (x2 slower) 3D Island Launch Departure Cinematic state (bird's-eye -> behind-helm player showcase -> 1st-person)
    this.launchAnim = {
      active: false,
      finished: true,
      justStarted: false,
      elapsed: 0.0,
      duration: 5.9,
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
    this._webglContextLost = false;
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._webglContextLost = true;
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this._webglContextLost = false;
    });
    window.addEventListener('pagehide', () => {
      this.renderer?.dispose();
    });
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.cameraCtrl = new CameraController(this.renderer.domElement);
    this.skyDome = new SkyDomeRenderer(this.scene, this.skyLabelsEl);
    this.oceanRenderer = new OceanRenderer(this.scene);
    this.vakaRenderer = new VakaRenderer(this.scene);
    this.worldCues = new WorldCuesRenderer(this.scene);
    this.starRing = new StarRingRenderer(this.scene, this.skyLabelsEl);
    this.shoreDiorama = new ShoreDioramaRenderer(
      this.scene,
      this.vakaRenderer,
      this.renderer.domElement
    );
    this.walkableIslandScene = new WalkableIslandScene(
      this.scene,
      this.vakaRenderer,
      this.skyLabelsEl
    );

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
    this.musicEngine = new BackgroundMusicEngine({
      discoveredIslands: this.gameState.discoveredIslands,
    });
    this.musicEngine.setMuted(this.chantEngine.muted);
    this.voiceEngine = new VoiceOverEngine({
      onSpeakingChange: (speaking) => this.musicEngine.setDucked(speaking),
    });
    this.voiceEngine.setMuted(this.chantEngine.muted);

    // 4. UI Layers
    this.achievementsUI = new AchievementsUI(this.achievementsRootEl, {
      getAchievementsManager: () => this.achievementsManager,
      onClose: () => {
        this.cameraCtrl.keysDown.clear();
      },
    });
    this.achievementsManager.onUnlock((unlockedRecord) => {
      this.chantEngine.playAchievementUnlockedFanfare();
      this.achievementsUI.showAchievementUnlocked(unlockedRecord);
      this._refreshShoreOverlays();
    });

    this.crewSplashUI = new CrewSplashUI(this.crewSplashRootEl, {
      onShown: () => {
        this.chantEngine.playCrewRecruitedChime();
      },
      onAllDismissed: () => {
        const pendingVoiceId = this._pendingPostCrewSplashVoiceId;
        this._pendingPostCrewSplashVoiceId = null;
        if (pendingVoiceId && this.phase === 'shore') {
          this.voiceEngine.play(pendingVoiceId);
        }
      },
    });

    this.onboardingTourUI = new OnboardingTourUI(this.onboardingRootEl);
    this.sailingTourUI = new OnboardingTourUI(this.sailingTourRootEl, {
      steps: SAILING_TOUR_STEPS,
      storageKey: SAILING_ONBOARDING_STORAGE_KEY,
      ariaLabel: 'Sailing Interface Tour',
      hideHubOnStepZero: false,
    });
    this.tahaaCloudTourUI = new OnboardingTourUI(this.tahaaCloudTourRootEl, {
      steps: TAHAA_CLOUD_TOUR_STEPS,
      storageKey: TAHAA_CLOUD_TOUR_STORAGE_KEY,
      ariaLabel: "Taha'a Cloud Tour",
      hideHubOnStepZero: false,
    });
    this._tahaaCloudStep2Elapsed = 0;

    this.islandSettingsUI = new IslandSettingsUI(this.settingsRootEl, {
      getGameState: () => this.gameState,
      getIsMusicEnabled: () => !this.chantEngine.muted && this.musicEngine.enabled,
      onSetMusicEnabled: (enabled) => this.setMusicEnabled(enabled),
      getIsVoiceEnabled: () => !this.chantEngine.muted && this.voiceEngine.enabled,
      onSetVoiceEnabled: (enabled) => this.setVoiceEnabled(enabled),
      onChangeDifficulty: (mode) => this.setDifficulty(mode),
      onConfirmStartOver: (opts) => this.resetCampaignAndReload(opts),
      onClose: () => {
        this.cameraCtrl.keysDown.clear();
      },
    });

    this.elderVigilPromptUI = new ElderVigilPromptUI(this.elderPromptRootEl, {
      onPlayVoice: (voiceId) => this.voiceEngine.play(voiceId),
      onStopVoice: () => this.voiceEngine.stop(),
      onGoToTeaching: (lesson) => {
        this.enterSkyVigil({
          guidedLessonId: lesson.id,
          islandId: lesson.islandId,
        });
      },
      onSetSailAnyway: (song, depWindow) => {
        this.launchVoyage(song, depWindow);
      },
    });

    this.islandHub = new IslandHubUI(this.hubRootEl, {
      getGameState: () => this.gameState,
      getAchievementsSummary: () => this.achievementsManager.getSummary(),
      getIsSoundMuted: () => this.chantEngine.muted,
      isObjectivePending: (id) => this._pendingObjectiveIds.has(id),
      consumeObjectiveSwipeIn: (id) => {
        if (!this._newlyRevealedObjectiveIds.has(id)) return false;
        this._newlyRevealedObjectiveIds.delete(id);
        return true;
      },
      onOpenSettings: () => this.openIslandSettings(),
      onOpenAchievements: () => this.openIslandAchievements(),
      onSanctuaryInteracted: (res) => this._handleSanctuaryInteracted(res),
      onPlayVoice: (voiceId) => this.voiceEngine.play(voiceId),
      onStopVoice: () => this.voiceEngine.stop(),
      onAshoreStateChanged: () =>
        this.achievementsManager.evaluateAshoreState(
          this.gameState,
          this.gameState.currentIslandId
        ),
      onChangeDifficulty: (mode) => this.setDifficulty(mode),
      onLaunchVoyage: (song, depWindow) =>
        this.requestLaunchVoyage(song, depWindow),
      onOpenSkyVigil: (opts) => this.enterSkyVigil(opts),
      onEnterWalkMode: () => this.enterWalkableShoreMode(),
      onStationChanged: (tabId, depWindow) =>
        this.shoreDiorama.setStation(tabId, depWindow),
      onDepartureChanged: (depWindow) =>
        this.shoreDiorama.setDeparturePreview(depWindow),
      onResetOrbit: () => this.shoreDiorama.resetOrbitToStation(),
    });
    this.shoreDiorama.onOrbitStateChange((customized) => {
      this.islandHub.setOrbitCustomized(customized);
    });

    this.walkableIslandUI = new WalkableIslandUI(this.walkableUiRootEl, {
      getGameState: () => this.gameState,
      getAchievementsSummary: () => this.achievementsManager.getSummary(),
      getIsSoundMuted: () => this.chantEngine.muted,
      isObjectivePending: (id) => this._pendingObjectiveIds.has(id),
      consumeObjectiveSwipeIn: (id) => {
        if (!this._newlyRevealedObjectiveIds.has(id)) return false;
        this._newlyRevealedObjectiveIds.delete(id);
        return true;
      },
      onOpenSettings: () => this.openIslandSettings(),
      onOpenAchievements: () => this.openIslandAchievements(),
      onSanctuaryInteracted: (res) => this._handleSanctuaryInteracted(res),
      onPlayVoice: (voiceId) => this.voiceEngine.play(voiceId),
      onStopVoice: () => this.voiceEngine.stop(),
      onAshoreStateChanged: () =>
        this.achievementsManager.evaluateAshoreState(
          this.gameState,
          this.gameState.currentIslandId
        ),
      onChangeDifficulty: (mode) => this.setDifficulty(mode),
      onLaunchVoyage: (song, depWindow) =>
        this.requestLaunchVoyage(song, depWindow),
      onOpenSkyVigil: (opts) => this.enterSkyVigil(opts),
      onExitWalkMode: (activePoi) => this.exitWalkableShoreMode(activePoi),
    });

    this.skyVigilUI = new SkyVigilUI(this.vigilRootEl, {
      getGameState: () => this.gameState,
      getOceanSim: () => this.oceanSim,
      getCameraCtrl: () => this.cameraCtrl,
      onExitVigil: () => this.exitSkyVigil(),
      onPlayChime: () => this.chantEngine.playStarSightedChime(),
      onPlayVoice: (voiceId) => this.voiceEngine.play(voiceId),
      onStopVoice: () => this.voiceEngine.stop(),
      onEyeTrialStreak: (streak) => {
        this.achievementsManager.evaluateEyeTrialStreak(
          streak,
          this.gameState,
          this.skyVigilUI.activeIslandId
        );
      },
      onConstellationLearned: () => {
        this.achievementsManager.evaluateAshoreState(
          this.gameState,
          this.gameState.currentIslandId
        );
        this._refreshShoreOverlays();
      },
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
      onToggleMute: () => {
        this.setSoundMuted(!this.chantEngine.muted);
        return this.chantEngine.muted;
      },
      onRestorePreVoyage: () => this.restoreBeforeVoyage(),
      onConfirmLandfall: () => this.completeLandfallTransition(),
    });

    this.sailingHud.hide();
    this.sailingHud.setSoundMutedState(this.chantEngine.muted);
    this.skyVigilUI.hide();
    this._bindShoreTopControls();

    // Pre-mark fresh starting arrival objective as pending before initial shore render
    // so it only swipes into the Objectives Ashore panel after its toast animation finishes.
    const startObjId =
      !hasSavedProgress &&
      ISLAND_ARRIVAL_OBJECTIVE_MAP[this.gameState.currentIslandId];
    if (startObjId && this.gameState.activeObjectives?.[startObjId]) {
      this._pendingObjectiveIds.add(startObjId);
    }

    this._enterShoreMode({ suppressArrivalToast: true });

    // Direct URL boot support for instant testing:
    //   ?island=<id>&tab=sanctuary|sand|vigil|landing
    //   ?island=raiatea&walk=1
    //   ?mode=sky_vigil&master=terai|akura&island=<id>&tab=lessons|atlas|quiz
    //   ?mode=landfall&island=<id>&window=dawn|midday|dusk|midnight&lead=<sec>
    //   ?mode=launch&island=<id>&window=dawn|midday|dusk|midnight
    this._checkStartupUrlParams();
    this.musicEngine.start();

    // On a brand-new campaign (or after Start Over), toast the initial arrival objective ashore
    // and start the onboarding tour immediately alongside it
    if (startObjId && this.phase === 'shore') {
      const hasUrlOverride =
        typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).has('mode') ||
          new URLSearchParams(window.location.search).has('walk'));
      const canStartTour =
        !hasSavedProgress &&
        !hasUrlOverride &&
        !this.walkableIslandScene.active &&
        this.gameState.currentIslandId === 'raiatea';
      if (canStartTour) {
        this.onboardingTourUI.startIfFirstTime();
      }
      this._announceNewObjectives([OBJECTIVES[startObjId]], {
        delayMs: 320,
        playSound: false,
        onRevealed: () => {
          if (this.onboardingTourUI?.open) {
            this.onboardingTourUI._positionCard();
          }
        },
      });
    } else if (startObjId) {
      this._pendingObjectiveIds.delete(startObjId);
    }

    window.addEventListener('resize', () => this._onResize());

    // [DEBUG CHEAT] Shift+G: target homing (~2.4s arrival); Shift+F: toggle 10x super-fast-forward
    window.addEventListener('keydown', (e) => {
      if (e.repeat || !e.shiftKey) return;
      if (e.code !== 'KeyG' && e.code !== 'KeyF') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (
        this.phase !== 'sailing' ||
        this.oceanSim.status !== VoyageStatus.SAILING ||
        this.landfallAnim.active ||
        this.sailingHud.pauseOpen
      ) {
        return;
      }
      e.preventDefault();
      if (e.code === 'KeyG') {
        this._resetLaunchAnimation();
        this.oceanSim.activateDebugTargetHoming(2.4);
      } else if (e.code === 'KeyF') {
        this.oceanSim.debugSuperFastForward = !this.oceanSim.debugSuperFastForward;
        this.sailingHud.showToast(
          this.oceanSim.debugSuperFastForward
            ? 'Super Fast Wind (10×) active'
            : 'Super Fast Wind off'
        );
      }
    });

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
    const urlDiff = params.get('difficulty');
    if (
      urlDiff &&
      ['easy', 'medium', 'hard', 'master_navigator'].includes(urlDiff)
    ) {
      this.setDifficulty(urlDiff);
    }

    const rawTier = params.get('tier');
    if (rawTier !== null) {
      const parsedTier = Number(rawTier);
      if ([1, 2, 3].includes(parsedTier)) {
        this.gameState.vakaTier = parsedTier;
        this.gameState.maxCargoSlots =
          parsedTier >= 3 ? 8 : parsedTier === 2 ? 6 : 4;
        this.gameState.loadedRations = Math.max(
          1,
          this.gameState.maxCargoSlots - this.gameState.cargoItems.length
        );
        this.islandHub.refresh();
      }
    }

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

    const validShoreTab =
      urlTab && ['sanctuary', 'sand', 'vigil', 'landing'].includes(urlTab)
        ? urlTab
        : null;

    if (urlIsland && ISLANDS[urlIsland]) {
      this.gameState.currentIslandId = urlIsland;
      this.gameState.currentBasinId = ISLANDS[urlIsland].basinId;
      this.oceanSim.setShoreIsland(urlIsland);
      this._enterShoreMode({ hubDefaultTab: validShoreTab });
    } else if (
      validShoreTab &&
      urlMode !== 'sky_vigil' &&
      params.get('vigil') !== '1'
    ) {
      this._enterShoreMode({ hubDefaultTab: validShoreTab });
    }

    if (
      (urlMode === 'walk' || params.get('walk') === '1') &&
      isWalkableIsland(this.gameState.currentIslandId)
    ) {
      this.enterWalkableShoreMode({ spawnMode: 'canoe' });
      return;
    }

    if (urlMode === 'sky_vigil' || params.get('vigil') === '1') {
      const urlLesson = params.get('lesson');
      const fallbackMasterIsl =
        urlMaster === 'akura'
          ? 'kiritimati'
          : urlMaster === 'terai'
            ? 'maupiti'
            : null;
      const resolvedIslId =
        urlIsland && ISLANDS[urlIsland]
          ? urlIsland
          : fallbackMasterIsl || this.gameState.currentIslandId;
      this.enterSkyVigil({
        islandId: resolvedIslId,
        mode: urlTab || undefined,
        guidedLessonId:
          urlLesson && CONSTELLATION_LESSONS[urlLesson] ? urlLesson : undefined,
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
      const targetBasinId = ISLANDS[targetId]?.basinId;
      song =
        Object.values(SONGS).find((s) => s.toIsland === targetId) ||
        (targetId === 'raiatea' ? buildReturnSong('tahaa', 'raiatea') : null) ||
        (targetBasinId
          ? Object.values(SONGS).find(
              (s) =>
                ISLANDS[s.fromIsland]?.basinId === targetBasinId &&
                ISLANDS[s.toIsland]?.basinId === targetBasinId
            )
          : null) ||
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
    // Pre-pose the player character standing at the canoe helm at t = 0 of departure
    this.vakaRenderer.update(
      0.0,
      this._elapsedAppSec || 0.0,
      this.oceanSim,
      this.gameState,
      0.0,
      {
        showPlayerOnCanoe: true,
        playerOpacity: 1.0,
        lookYawDeg: 0.0,
      }
    );
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

  _resolveDefaultShoreStation(preferredTab = null) {
    if (
      preferredTab &&
      ['sanctuary', 'sand', 'vigil', 'landing'].includes(preferredTab)
    ) {
      return preferredTab;
    }
    const activeHere = getActiveObjectivesForDisplay(this.gameState).some(
      (obj) => obj.isHere
    );
    if (activeHere) {
      return 'sanctuary';
    }
    const pendingLesson = getAvailableUnlearnedLessonForIsland(
      this.gameState,
      this.gameState.currentIslandId
    );
    if (pendingLesson) {
      return 'vigil';
    }
    return 'landing';
  }

  _announceNewObjectives(
    objectiveDefs,
    { delayMs = 0, playSound = true, onRevealed = null } = {}
  ) {
    if (!Array.isArray(objectiveDefs) || objectiveDefs.length === 0) return;
    const freshList = objectiveDefs.filter(
      (def) => def && def.id && !this._announcedObjectiveIds.has(def.id)
    );
    if (freshList.length === 0) return;

    for (const def of freshList) {
      this._announcedObjectiveIds.add(def.id);
      this._pendingObjectiveIds.add(def.id);
    }

    let remaining = freshList.length;
    const revealObjective = (def) => {
      if (!def?.id) return;
      this._pendingObjectiveIds.delete(def.id);
      this._newlyRevealedObjectiveIds.add(def.id);
      this._refreshShoreOverlays();
      remaining -= 1;
      if (remaining <= 0) {
        onRevealed?.();
      }
    };

    const emitNow = () => {
      if (this.phase !== 'shore') {
        for (const def of freshList) {
          this._pendingObjectiveIds.delete(def.id);
        }
        return;
      }
      if (playSound) {
        this.chantEngine.playObjectiveAddedChime();
      }
      for (const def of freshList) {
        this.achievementsUI.showObjectiveAdded(def, revealObjective);
      }
    };

    if (delayMs > 0 && typeof setTimeout === 'function') {
      setTimeout(emitNow, delayMs);
    } else {
      emitNow();
    }
  }

  /**
   * Transitions into the Unified 3D Shore Diorama Stage across all 17 islands:
   * - Left ~60% viewport: canonical 3D island (`IslandTerrainBuilder`) + moored `VakaRenderer`
   * - Right docked panel: 4 shore stations (`sanctuary`, `sand`, `vigil`, `landing`)
   * - Optional secondary `Walk Shore` mode remains accessible on walkable islands via header button.
   */
  _enterShoreMode({
    hubDefaultTab = null,
    suppressArrivalToast = false,
    transitionFromCam = null,
  } = {}) {
    this.phase = 'shore';
    this.sailingTourUI?.hide();
    this.tahaaCloudTourUI?.hide();
    const newlyActivatedArrival = activateIslandArrivalObjective(
      this.gameState,
      this.gameState.currentIslandId
    );
    if (!suppressArrivalToast && newlyActivatedArrival.length > 0) {
      for (const def of newlyActivatedArrival) {
        if (def?.id && !this._announcedObjectiveIds.has(def.id)) {
          this._pendingObjectiveIds.add(def.id);
        }
      }
    }
    this.oceanSim.setShoreIsland(this.gameState.currentIslandId);
    this.skyLabelsEl
      .querySelectorAll('.sky-star-label')
      .forEach((el) => (el.style.display = 'none'));
    this.sailingHud.hide();
    this.skyVigilUI.hide();
    this.starRing.setVisible(false);
    this.cameraCtrl.setVigilMode(false);

    this.walkableIslandScene.exit();
    this.walkableIslandUI.hide();
    this.cameraCtrl.shoreWalkMode = false;
    this.worldCues.group.visible = false;
    this.vakaRenderer.root.visible = true;

    const initialStation = this._resolveDefaultShoreStation(hubDefaultTab);
    this.islandHub.show(initialStation);
    this.shoreDiorama.enter({
      islandId: this.gameState.currentIslandId,
      stationId: this.islandHub.activeTab,
      selectedDeparture: this.islandHub.selectedDeparture,
      transitionFromCam,
    });
    this._syncShoreTopControls();

    if (!suppressArrivalToast && newlyActivatedArrival.length > 0) {
      this._announceNewObjectives(newlyActivatedArrival, {
        delayMs: 240,
        playSound: true,
      });
    }
  }

  _bindShoreTopControls() {
    this.btnShoreWalkToggle?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      if (this.walkableIslandScene.active) {
        this.exitWalkableShoreMode();
      } else {
        this.enterWalkableShoreMode();
      }
    });
    this.btnShoreToggleSound?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.setSoundMuted(!this.chantEngine.muted);
    });
    this.btnShoreOpenAchievements?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.openIslandAchievements();
    });
    this.btnShoreOpenSettings?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.openIslandSettings();
    });
  }

  _syncShoreTopControls() {
    if (!this.shoreTopControlsEl) return;
    if (this.phase !== 'shore') {
      this.shoreTopControlsEl.classList.add('hidden');
      this.btnShoreWalkToggle?.classList.add('hidden');
      return;
    }
    this.shoreTopControlsEl.classList.remove('hidden');

    const walkable = canWalkIsland(this.gameState.currentIslandId);
    const isWalking = Boolean(this.walkableIslandScene.active);
    if (this.shoreWalkGlyphEl) {
      this.shoreWalkGlyphEl.textContent = isWalking ? '🏝️' : '🚶';
    }
    if (this.btnShoreWalkToggle) {
      this.btnShoreWalkToggle.classList.toggle('hidden', !walkable);
      this.btnShoreWalkToggle.classList.toggle('active', isWalking);
      this.btnShoreWalkToggle.setAttribute(
        'title',
        isWalking
          ? 'Return to 4-Station Shore Stage'
          : 'Walk Shore in 3rd-person (Arrow Keys / WASD)'
      );
      this.btnShoreWalkToggle.setAttribute(
        'aria-label',
        isWalking ? 'Return to Shore Stage' : 'Walk Shore'
      );
      this.btnShoreWalkToggle.setAttribute(
        'aria-pressed',
        String(isWalking)
      );
    }

    const muted = Boolean(this.chantEngine.muted);
    if (this.shoreSoundGlyphEl) {
      this.shoreSoundGlyphEl.textContent = muted ? '🔇' : '🔊';
    }
    if (this.btnShoreToggleSound) {
      this.btnShoreToggleSound.setAttribute(
        'title',
        muted ? 'Sound Muted — Click to Unmute' : 'Sound On — Click to Mute'
      );
      this.btnShoreToggleSound.setAttribute('aria-pressed', String(!muted));
    }
  }

  enterWalkableShoreMode({ spawnMode = 'canoe' } = {}) {
    this.onboardingTourUI?.hide();
    if (
      this.phase !== 'shore' ||
      !canWalkIsland(this.gameState.currentIslandId)
    ) {
      return;
    }
    this.cameraCtrl.keysDown.clear();
    this.shoreDiorama.exit();
    this.islandHub.hide();
    this.worldCues.group.visible = false;
    this.cameraCtrl.shoreWalkMode = true;
    this.walkableIslandScene.enter({
      islandId: this.gameState.currentIslandId,
      spawnMode,
      gameState: this.gameState,
    });
    this.walkableIslandUI.show();
    this._syncShoreTopControls();
  }

  exitWalkableShoreMode(activePoi = null) {
    if (this.phase !== 'shore') return;
    this.cameraCtrl.keysDown.clear();
    let transitionFromCam = null;
    if (this.walkableIslandScene.active && this.cameraCtrl?.camera) {
      const pos = this.cameraCtrl.camera.position.clone();
      const dir = new THREE.Vector3();
      this.cameraCtrl.camera.getWorldDirection(dir);
      const lookAt = pos.clone().addScaledVector(dir, 14.0);
      transitionFromCam = { pos, lookAt };
    }
    const preferredTab =
      activePoi?.hubTab &&
      ['sanctuary', 'sand', 'vigil', 'landing'].includes(activePoi.hubTab)
        ? activePoi.hubTab
        : null;
    this._enterShoreMode({ hubDefaultTab: preferredTab, transitionFromCam });
  }

  openIslandSettings() {
    if (this.phase !== 'shore') return;
    this.elderVigilPromptUI.hide();
    this.achievementsUI.hideModal();
    this.cameraCtrl.keysDown.clear();
    this.islandSettingsUI.show();
  }

  openIslandAchievements() {
    if (this.phase !== 'shore') return;
    this.elderVigilPromptUI.hide();
    this.islandSettingsUI.hide();
    this.cameraCtrl.keysDown.clear();
    this.achievementsUI.showModal();
  }

  _refreshShoreOverlays() {
    if (this.phase !== 'shore') return;
    if (this.walkableIslandScene.active) {
      this.walkableIslandUI.refresh();
    } else {
      this.islandHub.refresh();
    }
  }

  _handleSanctuaryInteracted(sanctuaryResult) {
    const clearedList = sanctuaryResult?.clearedObjectives || [];
    const activatedList = sanctuaryResult?.activatedObjectives || [];

    if (clearedList.length > 0) {
      this.chantEngine.playObjectiveClearedChime();
      for (const clearedObj of clearedList) {
        this.achievementsUI.showObjectiveCleared(clearedObj);
      }
    }
    if (activatedList.length > 0) {
      this._announceNewObjectives(activatedList, {
        delayMs: clearedList.length > 0 ? 420 : 0,
        playSound: true,
      });
    }
    if (sanctuaryResult?.newlyRecruitedCrew?.length > 0) {
      this._pendingPostCrewSplashVoiceId = sanctuaryResult?.voiceId || null;
      this.crewSplashUI.enqueue(sanctuaryResult.newlyRecruitedCrew);
    }
    if (sanctuaryResult?.newlyUpgradedVakaTier === 3) {
      this._pendingPostCrewSplashVoiceId = sanctuaryResult?.voiceId || null;
      this.crewSplashUI.enqueueVakaUpgrade(3);
    }
    this.achievementsManager.evaluateAshoreState(
      this.gameState,
      this.gameState.currentIslandId
    );
    this._refreshShoreOverlays();
  }

  setMusicEnabled(enabled) {
    if (enabled && this.chantEngine.muted) {
      this.setSoundMuted(false);
    }
    this.musicEngine.setEnabled(enabled);
    if (this.phase === 'shore' && this.islandSettingsUI.isOpen()) {
      this.islandSettingsUI.refresh();
    }
  }

  setVoiceEnabled(enabled) {
    if (enabled && this.chantEngine.muted) {
      this.setSoundMuted(false);
    }
    this.voiceEngine.setEnabled(enabled);
    if (this.phase === 'shore' && this.islandSettingsUI.isOpen()) {
      this.islandSettingsUI.refresh();
    }
  }

  setSoundMuted(muted) {
    const nextMuted = Boolean(muted);
    this.chantEngine.setMuted(nextMuted);
    this.musicEngine.setMuted(nextMuted);
    this.voiceEngine.setMuted(nextMuted);
    this.sailingHud?.setSoundMutedState(nextMuted);
    if (!nextMuted) {
      this.chantEngine.playStarSightedChime();
    }
    if (this.phase === 'shore') {
      this._syncShoreTopControls();
      if (this.walkableIslandScene.active) {
        this.walkableIslandUI.refresh();
      } else {
        this.islandHub.refresh();
      }
      if (this.islandSettingsUI.isOpen()) {
        this.islandSettingsUI.refresh();
      }
    }
  }

  resetCampaignAndReload({ deleteAchievements = false } = {}) {
    this.onboardingTourUI?.hide();
    this.sailingTourUI?.hide();
    this.tahaaCloudTourUI?.hide();
    clearOnboardingDone();
    this.islandSettingsUI.hide();
    this.achievementsUI.hideModal();
    this.crewSplashUI.hide();
    this.elderVigilPromptUI.hide();
    this.chantEngine.stop();
    this.spatialAudio.stop();
    this.gameState.clearSavedProgress();
    if (deleteAchievements) {
      this.achievementsManager.clearSavedAchievements();
    }
    if (typeof window !== 'undefined') {
      this.renderer?.dispose();
      window.location.assign(window.location.pathname || './');
    }
  }

  enterSkyVigil(opts = {}) {
    this.onboardingTourUI?.hide();
    this.sailingTourUI?.hide();
    this.tahaaCloudTourUI?.hide();
    this._enteredVigilFromWalkMode = Boolean(this.walkableIslandScene.active);
    this.islandSettingsUI.hide();
    this.achievementsUI.hideModal();
    this.achievementsUI.clearObjectiveBanners();
    this._pendingObjectiveIds.clear();
    this.elderVigilPromptUI.hide();
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this.shoreDiorama.exit();
    this.walkableIslandScene.exit();
    this.walkableIslandUI.hide();
    this.cameraCtrl.shoreWalkMode = false;
    this.chantEngine.stop();
    this.spatialAudio.stop();

    this.phase = 'sky_vigil';
    this._syncShoreTopControls();
    this.islandHub.hide();
    this.sailingHud.hide();

    this.vakaRenderer.root.visible = false;
    this.worldCues.group.visible = false;
    this.starRing.setVisible(true);
    this.cameraCtrl.setVigilMode(true);

    this.skyVigilUI.show(opts);
  }

  exitSkyVigil() {
    const returnToWalk =
      this._enteredVigilFromWalkMode &&
      isWalkableIsland(this.gameState.currentIslandId);
    this._enteredVigilFromWalkMode = false;
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this._enterShoreMode({ hubDefaultTab: 'vigil' });
    if (returnToWalk) {
      this.enterWalkableShoreMode({ spawnMode: 'vigil' });
    }
  }

  setDifficulty(mode) {
    this.gameState.difficulty = mode;
    this.gameState.saveToLocalStorage();
    this.skyVigilUI.syncDifficultyDefault(mode);
    if (this.phase === 'sailing') {
      if (mode !== Difficulty.MASTER_NAVIGATOR) {
        this.oceanSim.sailedPureMasterNavigator = false;
      }
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
    } else if (this.phase === 'shore') {
      if (this.walkableIslandScene.active) {
        this.walkableIslandUI.refresh();
      } else {
        this.islandHub.refresh();
      }
      if (this.islandSettingsUI.isOpen()) {
        this.islandSettingsUI.refresh();
      }
    }
  }

  requestLaunchVoyage(song, departureWindow) {
    const pendingLesson = getAvailableUnlearnedLessonForIsland(
      this.gameState,
      this.gameState.currentIslandId
    );
    if (pendingLesson) {
      this.cameraCtrl.keysDown.clear();
      this.elderVigilPromptUI.show(pendingLesson, song, departureWindow);
      return;
    }
    this.launchVoyage(song, departureWindow);
  }

  launchVoyage(song, departureWindow) {
    this.onboardingTourUI?.hide();
    // Snapshot pre-voyage state so Lost at Sea / Return to Shore restores cleanly with zero loss!
    this.gameState.savePreVoyageSnapshot();
    this._enteredVigilFromWalkMode = false;
    this.islandSettingsUI.hide();
    this.achievementsUI.hideModal();
    this.achievementsUI.clearObjectiveBanners();
    this._pendingObjectiveIds.clear();
    this.elderVigilPromptUI.hide();
    this.shoreDiorama.exit();
    this.walkableIslandScene.exit();
    this.walkableIslandUI.hide();
    this.cameraCtrl.shoreWalkMode = false;
    this._resetLandfallAnimation();
    this._resetLaunchAnimation();

    this.phase = 'sailing';
    this._syncShoreTopControls();
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
    // Sync announced objective set with restored snapshot so rolled-back objectives can toast again
    for (const id of Array.from(this._announcedObjectiveIds)) {
      if (
        !this.gameState.activeObjectives?.[id] &&
        !this.gameState.clearedObjectives?.[id]
      ) {
        this._announcedObjectiveIds.delete(id);
      }
    }
    this._enterShoreMode({ hubDefaultTab: 'landing' });
  }

  completeLandfallTransition() {
    const arrivedId =
      this.oceanSim.arrivedIsland?.id || this.oceanSim.song?.toIsland;
    this._resetLaunchAnimation();
    this._resetLandfallAnimation();
    this.chantEngine.stop();
    this.spatialAudio.stop();

    const newlyActivatedOnArrival = activateIslandArrivalObjective(
      this.gameState,
      arrivedId
    );
    for (const def of newlyActivatedOnArrival) {
      if (def?.id && !this._announcedObjectiveIds.has(def.id)) {
        this._pendingObjectiveIds.add(def.id);
      }
    }
    const wasNewIsland = !this.gameState.discoveredIslands?.[arrivedId];
    onVoyageLandfall(this.gameState, arrivedId);
    this.musicEngine.onIslandLandfall(arrivedId, {
      wasNewlyDiscovered: wasNewIsland,
      discoveredIslands: this.gameState.discoveredIslands,
    });
    this.achievementsManager.evaluateLandfall(
      this.oceanSim,
      this.gameState,
      arrivedId
    );
    this.achievementsManager.evaluateAshoreState(this.gameState, arrivedId);

    // Persist remaining voyage rations rounded up to whole baskets (minimum 1)
    this.gameState.loadedRations = Math.max(
      1,
      Math.min(
        this.gameState.maxCargoSlots - this.gameState.cargoItems.length,
        Math.ceil(this.oceanSim.rationsRemaining)
      )
    );
    this.gameState.saveToLocalStorage();

    this._enterShoreMode();
    if (newlyActivatedOnArrival.length > 0) {
      this._announceNewObjectives(newlyActivatedOnArrival, {
        delayMs: 240,
        playSound: true,
      });
    }
  }

  _logVoyageDebugMapUrl(outcomeEvent) {
    if (typeof window === 'undefined') return;
    try {
      const params = buildVoyageDebugTraceParams(this.oceanSim, outcomeEvent);
      const url = new URL('./map.html', window.location.href);
      for (const [key, val] of Object.entries(params)) {
        if (val) url.searchParams.set(key, val);
      }
      this.lastVoyageDebugMapUrl = url.href;

      const fromName =
        ISLANDS[params.from]?.name || params.from || 'Departure Isle';
      const toName = ISLANDS[params.to]?.name || params.to || 'Target Isle';
      const summary =
        params.outcome === 'landfall'
          ? `Landfall at ${ISLANDS[params.landed]?.name || params.landed || toName}`
          : `Lost at Sea (${params.reason || 'off_course'})`;
      console.info(
        `[Kavenga Route Debug] ${summary} [${fromName} -> ${toName}]\n${url.href}`
      );
    } catch {
      // Ignore URL construction errors in non-standard environments
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraCtrl.resize(w, h);
  }

  _updateTahaaCloudTour(dtSec) {
    if (!this.tahaaCloudTourUI) return;
    const canRun =
      this.phase === 'sailing' &&
      this.oceanSim.status === VoyageStatus.SAILING &&
      !this.launchAnim.active &&
      !this.landfallAnim.active &&
      !this.sailingHud.pauseOpen &&
      !this.sailingTourUI?.open;

    if (!canRun) {
      if (this.tahaaCloudTourUI.open) {
        this.tahaaCloudTourUI.hide();
      }
      this._tahaaCloudStep2Elapsed = 0;
      return;
    }

    const tahaaSlot = this.worldCues.islandSlots.find(
      (s) => s.islandId === 'tahaa'
    );

    if (
      !this.tahaaCloudTourUI.open &&
      !this.tahaaCloudTourUI.hasCompleted() &&
      this.oceanSim.song?.toIsland === 'tahaa' &&
      tahaaSlot &&
      tahaaSlot.peakAlpha >= 0.25
    ) {
      this._tahaaCloudStep2Elapsed = 0;
      this.tahaaCloudTourUI.startIfFirstTime();
    }

    if (!this.tahaaCloudTourUI.open) {
      this._tahaaCloudStep2Elapsed = 0;
      return;
    }

    if (!this.tahaaCloudTourUI.isInteractiveStep()) {
      this._tahaaCloudStep2Elapsed = 0;
      return;
    }

    this._tahaaCloudStep2Elapsed += dtSec;

    let targetBearingDeg = tahaaSlot?.lastBearingDeg;
    if (!Number.isFinite(targetBearingDeg)) {
      const tahaaPos = ISLANDS.tahaa?.simPos;
      if (tahaaPos && this.oceanSim.pos) {
        const dx = tahaaPos.x - this.oceanSim.pos.x;
        const dy = tahaaPos.y - this.oceanSim.pos.y;
        targetBearingDeg = posMod((Math.atan2(dx, dy) * 180.0) / Math.PI, 360.0);
      }
    }

    if (!Number.isFinite(targetBearingDeg)) return;

    const delta = wrapDeg180(targetBearingDeg - this.oceanSim.headingDeg);
    const steerSelector = delta < 0 ? '#btnTrimPort' : '#btnTrimStarboard';
    this.tahaaCloudTourUI.setDynamicTarget(steerSelector);

    if (Math.abs(delta) <= 6.0 && this._tahaaCloudStep2Elapsed >= 0.9) {
      this.tahaaCloudTourUI.finish();
    }
  }

  _animate(nowMs) {
    const dtSec = Math.min(0.1, Math.max(0.001, (nowMs - this._lastFrameMs) / 1000.0));
    this._lastFrameMs = nowMs;
    this._elapsedAppSec += dtSec;

    const isActivelySailing =
      this.phase === 'sailing' &&
      this.oceanSim.status === VoyageStatus.SAILING &&
      !this.sailingHud.pauseOpen &&
      !this.sailingTourUI?.open &&
      !(this.tahaaCloudTourUI?.open && !this.tahaaCloudTourUI.isInteractiveStep()) &&
      !this.launchAnim.active;

    if (this.phase === 'shore' && this.walkableIslandScene.active) {
      // Optional secondary Walk Shore mode on the canonical 3D island mesh
      const baseHour = this.walkableIslandScene.spec?.solarHourBase ?? 8.75;
      this.oceanSim.setShoreIsland(this.gameState.currentIslandId);
      this.oceanSim.solarHour =
        (baseHour + Math.sin(this._elapsedAppSec * 0.02) * 0.2 + 24.0) % 24.0;
      this.oceanSim.headingDeg = 0.0;
      this.oceanSim._refreshEnvironment(dtSec);

      const nearPoi = this.walkableIslandScene.update(
        dtSec,
        this._elapsedAppSec,
        {
          gameState: this.gameState,
          oceanSim: this.oceanSim,
          camera: this.cameraCtrl.camera,
          keysDown: this.cameraCtrl.keysDown,
          inputBlocked:
            this.islandSettingsUI.isOpen() ||
            this.achievementsUI.isOpen() ||
            this.elderVigilPromptUI.isOpen() ||
            this.walkableIslandUI.isBlockingMovement(),
          hideLabels:
            this.islandSettingsUI.isOpen() ||
            this.achievementsUI.isOpen() ||
            this.elderVigilPromptUI.isOpen(),
        }
      );
      this.walkableIslandUI.updateActivePoi(nearPoi);

      this.skyDome.update(
        dtSec,
        this._elapsedAppSec,
        this.oceanSim,
        'master_navigator',
        this.cameraCtrl.camera,
        null,
        null,
        this.gameState
      );
      this.oceanRenderer.update(dtSec, this._elapsedAppSec, this.oceanSim, true);

      this.renderer.render(this.scene, this.cameraCtrl.camera);
      window.requestAnimationFrame(this._animate);
      return;
    }

    if (this.phase === 'shore' && this.shoreDiorama.active) {
      this.shoreDiorama.update(
        dtSec,
        this._elapsedAppSec,
        this.oceanSim,
        this.cameraCtrl.camera,
        this.gameState
      );
      this.skyDome.update(
        dtSec,
        this._elapsedAppSec,
        this.oceanSim,
        'master_navigator',
        this.cameraCtrl.camera,
        null,
        null,
        this.gameState
      );
      this.oceanRenderer.update(dtSec, this._elapsedAppSec, this.oceanSim, true);

      this.renderer.render(this.scene, this.cameraCtrl.camera);
      window.requestAnimationFrame(this._animate);
      return;
    }

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
        this.skyVigilUI.getSkyDomeOverrides(),
        null,
        this.gameState
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
            ev.voyageHarvestCount >= 2
              ? 'Second leaping bonito school harvested — woven baskets brimming!'
              : 'Fresh bonito caught from the leaping school — ration baskets replenished!'
          );
          this.achievementsManager.evaluateSeaEvent(
            ev,
            this.oceanSim,
            this.gameState
          );
        } else if (ev.type === 'survived_24h_at_sea') {
          this.achievementsManager.evaluateSeaEvent(
            ev,
            this.oceanSim,
            this.gameState
          );
        } else if (ev.type === 'low_rations_warning') {
          this.chantEngine.playLowRationsWarning();
          this.sailingHud.showToast(
            'Gourds and woven ration baskets are running low...'
          );
        } else if (ev.type === 'landfall') {
          this._logVoyageDebugMapUrl(ev);
          this.chantEngine.playLandfallConch();
          const wasNewIsland = !this.gameState.discoveredIslands?.[ev.islandId];
          const nextDiscovered = {
            ...this.gameState.discoveredIslands,
            [ev.islandId]: true,
          };
          this.musicEngine.onIslandLandfall(ev.islandId, {
            wasNewlyDiscovered: wasNewIsland,
            discoveredIslands: nextDiscovered,
          });
          this.achievementsManager.evaluateLandfall(
            this.oceanSim,
            {
              difficulty: this.gameState.difficulty,
              currentBasinId: this.gameState.currentBasinId,
              discoveredIslands: nextDiscovered,
            },
            ev.islandId
          );
          this._beginLandfallAnimation(ev.islandId);
          justStartedLandfall = true;
        } else if (ev.type === 'lost_at_sea') {
          this._logVoyageDebugMapUrl(ev);
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
    this.worldCues.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.landfallAnim.active ? this.landfallAnim : null,
      this.launchAnim.active ? this.launchAnim : null
    );
    this._updateTahaaCloudTour(dtSec);
    this.skyDome.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.phase === 'sailing' &&
        !this.landfallAnim.active &&
        !this.launchAnim.active
        ? this.gameState.difficulty
        : 'master_navigator',
      this.cameraCtrl.camera,
      null,
      this.worldCues,
      this.gameState
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
    let playerOpacity = 1.0;
    if (this.launchAnim.active && this.cameraCtrl.thirdPersonBlend < 0.22) {
      const fadeU = Math.max(
        0.0,
        Math.min(1.0, (this.launchAnim.rawT - 0.78) / 0.1)
      );
      playerOpacity = 1.0 - fadeU * fadeU * (3.0 - 2.0 * fadeU);
    }

    const showPlayerOnCanoe =
      this.phase === 'sailing' &&
      (this.cameraCtrl.thirdPersonBlend >= 0.22 ||
        (this.launchAnim.active && playerOpacity > 0.005) ||
        (this.landfallAnim.active &&
          (this.cameraCtrl.isThirdPersonView() || this.landfallAnim.rawT > 0.22)));

    this.vakaRenderer.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.gameState,
      this.landfallAnim.active || this.launchAnim.active
        ? 0.0
        : this.cameraCtrl.getSteeringNormalized(),
      {
        showPlayerOnCanoe,
        playerOpacity,
        lookYawDeg: this.cameraCtrl.lookYawDeg,
      }
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

    if (this.launchAnim.active && this.launchAnim.rawT >= 0.999) {
      this._resetLaunchAnimation();
      if (
        this.phase === 'sailing' &&
        this.oceanSim.status === VoyageStatus.SAILING
      ) {
        this.sailingTourUI?.startIfFirstTime();
      }
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

    if (!this._webglContextLost) {
      this.renderer.render(this.scene, this.cameraCtrl.camera);
    }
    window.requestAnimationFrame(this._animate);
  }
}

const app = new KavengaApp();
window.__KAVENGA_APP__ = app;
