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
import { DepartureWindow } from './core/gameConstants.js';
import { GameState } from './core/gameState.js';
import { ISLANDS } from './data/islandsData.js';
import { SONGS } from './data/songsData.js';
import { CameraController } from './rendering/CameraController.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { SkyDomeRenderer } from './rendering/SkyDomeRenderer.js';
import { VakaRenderer } from './rendering/VakaRenderer.js';
import { WorldCuesRenderer } from './rendering/WorldCuesRenderer.js';
import { OceanSim, VoyageStatus } from './simulation/oceanSim.js';
import { IslandHubUI } from './ui/IslandHubUI.js';
import { SailingHUD } from './ui/SailingHUD.js';

class KavengaApp {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.skyLabelsEl = document.getElementById('sky-labels-layer');
    this.hudRootEl = document.getElementById('sailing-hud');
    this.hubRootEl = document.getElementById('island-hub');

    // 1. State & Simulation
    this.gameState = new GameState();
    const hasSavedProgress = this.gameState.loadFromLocalStorage();
    this.oceanSim = new OceanSim();
    this.phase = 'shore'; // 'shore' | 'sailing'

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

    // Seed peaceful coastal preview state behind Island Hub
    this.oceanSim.startVoyage(
      SONGS.song_01,
      DepartureWindow.DUSK,
      this.gameState
    );
    this.oceanSim.status = VoyageStatus.IDLE;

    // 3. Web Audio Engines
    this.chantEngine = new ChantAndDrumEngine();
    this.spatialAudio = new SpatialSeaAudio(this.chantEngine);

    // 4. UI Layers
    this.islandHub = new IslandHubUI(this.hubRootEl, {
      getGameState: () => this.gameState,
      onChangeDifficulty: (mode) => this.setDifficulty(mode),
      onLaunchVoyage: (song, depWindow) => this.launchVoyage(song, depWindow),
    });

    this.sailingHud = new SailingHUD(this.hudRootEl, {
      getGameState: () => this.gameState,
      getOceanSim: () => this.oceanSim,
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

    window.addEventListener('resize', () => this._onResize());

    this._lastFrameMs = performance.now();
    this._elapsedAppSec = 0.0;
    this._animate = this._animate.bind(this);
    window.requestAnimationFrame(this._animate);
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
      this.sailingHud.update(this.oceanSim, this.gameState, this.cameraCtrl);
    }
  }

  launchVoyage(song, departureWindow) {
    // Snapshot pre-voyage state so Lost at Sea / Return to Shore restores cleanly with zero loss!
    this.gameState.savePreVoyageSnapshot();

    this.phase = 'sailing';
    this.islandHub.hide();
    this.sailingHud.show();
    this.cameraCtrl.recenterGaze();

    this.oceanSim.startVoyage(song, departureWindow, this.gameState);
    this.chantEngine.startVoyageSong(song, this.gameState.difficulty);
    this.spatialAudio.start();

    this.sailingHud.update(this.oceanSim, this.gameState, this.cameraCtrl);
  }

  restoreBeforeVoyage() {
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
      !this.sailingHud.pauseOpen;

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
        }
      }

      this.chantEngine.syncState({
        difficulty: this.gameState.difficulty,
        fastForward: this.oceanSim.fastForward,
        verseIndex: this.oceanSim.verseIndex,
      });
      this.spatialAudio.update(dtSec, this.oceanSim, this.gameState);
    } else if (this.phase === 'shore') {
      // Gentle ambient lagoon bobbing behind the Island Hub UI
      this.oceanSim.solarHour = (17.6 + Math.sin(this._elapsedAppSec * 0.03) * 0.35 + 24.0) % 24.0;
      this.oceanSim._refreshEnvironment(dtSec);
    }

    this.cameraCtrl.update(dtSec, this.oceanSim, isActivelySailing);
    this.skyDome.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.phase === 'sailing' ? this.gameState.difficulty : 'master_navigator',
      this.cameraCtrl.camera
    );
    this.oceanRenderer.update(dtSec, this._elapsedAppSec, this.oceanSim);
    this.vakaRenderer.update(
      dtSec,
      this._elapsedAppSec,
      this.oceanSim,
      this.gameState,
      this.cameraCtrl.getSteeringNormalized()
    );
    this.worldCues.update(dtSec, this._elapsedAppSec, this.oceanSim);

    if (this.phase === 'sailing') {
      this.sailingHud.update(this.oceanSim, this.gameState, this.cameraCtrl);
    }

    this.renderer.render(this.scene, this.cameraCtrl.camera);
    window.requestAnimationFrame(this._animate);
  }
}

const app = new KavengaApp();
window.__KAVENGA_APP__ = app;
