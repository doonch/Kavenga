/**
 * Unified 3D Shore Diorama Stage Renderer for Kavenga: Songs of the Star Path.
 *
 * Frames the canonical 3D island model (`IslandTerrainBuilder`) and moored voyaging canoe
 * (`VakaRenderer`) across all 17 islands in the unobstructed left viewport while the
 * docked 4-station Shore Panel occupies the right side.
 *
 * Features:
 * - Single source of truth: mounts the exact same 3D island seen from the ocean & map room
 * - Live sculpted island peak cloud / coral-atoll lapa cloud + moored Vaka with crew & rations
 * - Smooth damped camera glides across the 4 shore stations (`sanctuary`, `sand`, `vigil`, `landing`)
 * - Live sky/lighting preview when selecting Departure Tide-Light (`Dawn`, `Midday`, `Dusk`, `Midnight`)
 * - Optional pointer drag-to-orbit & wheel/pinch zoom on the open 3D viewport
 */

import * as THREE from 'three';
import { DepartureWindow, wrapDeg180 } from '../core/gameConstants.js';
import { ISLANDS } from '../data/islandsData.js';
import { altAzToDirectionVec3 } from '../simulation/celestialSim.js';
import {
  createSculptedCloudMesh,
  updateCloudMaterialUniforms,
} from './CloudSculptBuilder.js';
import {
  applyDetailedIslandAlpha,
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  getIslandShoreRadiusM,
  hasDetailedIslandModel,
} from './IslandTerrainBuilder.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngleRad(a, b, t) {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

function lerpHour24(curH, targetH, t) {
  let diff = ((targetH - curH + 12.0) % 24.0 + 24.0) % 24.0 - 12.0;
  return ((curH + diff * t) % 24.0 + 24.0) % 24.0;
}

function departureToPreviewHour(depWindow) {
  switch (depWindow) {
    case DepartureWindow.DAWN:
      return 6.18;
    case DepartureWindow.MIDDAY:
      return 11.35;
    case DepartureWindow.DUSK:
      return 18.28;
    case DepartureWindow.MIDNIGHT:
      return 22.85;
    default:
      return 6.18;
  }
}

export class ShoreDioramaRenderer {
  constructor(scene, vakaRenderer, domElement) {
    this.scene = scene;
    this.vakaRenderer = vakaRenderer;
    this.domElement = domElement;

    this.active = false;
    this.currentIslandId = null;
    this.currentStation = 'sanctuary';
    this.selectedDeparture = DepartureWindow.DAWN;

    this.root = new THREE.Group();
    this.root.visible = false;
    this.scene.add(this.root);

    this.islandMount = new THREE.Group();
    this.root.add(this.islandMount);

    // Cached canonical assemblies keyed by islandId
    this._assemblyCache = {};
    this._activeAssembly = null;

    // Signature Stationary Peak Cloud & Coral Atoll Lapa Cloud
    const peakSculpt = createSculptedCloudMesh('peak', { opacity: 0.96 });
    this.peakCloudGroup = new THREE.Group();
    this.peakCloudGroup.add(peakSculpt.mesh);
    this.peakCloudMat = peakSculpt.material;
    this.root.add(this.peakCloudGroup);

    const lapaSculpt = createSculptedCloudMesh('lapa', {
      isLapa: true,
      opacity: 0.96,
    });
    this.lapaCloudGroup = new THREE.Group();
    this.lapaCloudGroup.add(lapaSculpt.mesh);
    this.lapaCloudMat = lapaSculpt.material;
    this.root.add(this.lapaCloudGroup);

    // Moored canoe anchor coordinates
    this.mooredCanoePos = new THREE.Vector3(-6.5, 0.0, 52.0);
    this.mooredCanoeYaw = 2.52;

    // Smooth Spherical Camera State + User Orbit Override
    this.targetCenter = new THREE.Vector3(0, 8, 22);
    this.curCenter = new THREE.Vector3(0, 8, 22);
    this.targetTheta = 0.34;
    this.curTheta = 0.34;
    this.targetPhi = 0.28;
    this.curPhi = 0.28;
    this.targetDist = 96.0;
    this.curDist = 96.0;
    this.targetSolarHour = 9.15;
    this.curSolarHour = 9.15;

    this.userAdjustedOrbit = false;
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._pinchDist = 0;
    this._lookTarget = new THREE.Vector3();
    this._onOrbitChangeCb = null;

    this._bindPointerOrbit();
  }

  onOrbitStateChange(cb) {
    this._onOrbitChangeCb = cb;
  }

  _setUserAdjusted(flag) {
    const next = Boolean(flag);
    if (this.userAdjustedOrbit !== next) {
      this.userAdjustedOrbit = next;
      this._onOrbitChangeCb?.(next);
    }
  }

  _bindPointerOrbit() {
    if (!this.domElement) return;

    this._onPointerDown = (e) => {
      if (!this.active) return;
      if (e.button !== undefined && e.button !== 0 && e.button !== 2) return;
      if (e.target !== this.domElement) return;
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    };

    this._onPointerMove = (e) => {
      if (!this.active || !this._dragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) return;

      this.targetTheta -= dx * 0.0065;
      this.curTheta = this.targetTheta;
      this.targetPhi = clamp(this.targetPhi + dy * 0.0055, 0.06, 1.28);
      this.curPhi = this.targetPhi;
      this._setUserAdjusted(true);
    };

    this._onPointerUp = () => {
      this._dragging = false;
    };

    this._onWheel = (e) => {
      if (!this.active) return;
      if (e.target !== this.domElement) return;
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.0011);
      this.targetDist = clamp(this.targetDist * factor, 14.0, 320.0);
      this._setUserAdjusted(true);
    };

    this._onTouchStart = (e) => {
      if (!this.active || e.target !== this.domElement) return;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._pinchDist = Math.hypot(dx, dy);
      }
    };

    this._onTouchMove = (e) => {
      if (!this.active || e.target !== this.domElement) return;
      if (e.touches.length === 2 && this._pinchDist > 4) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const nextDist = Math.hypot(dx, dy);
        if (nextDist > 4) {
          const ratio = this._pinchDist / nextDist;
          this._pinchDist = nextDist;
          this.targetDist = clamp(this.targetDist * ratio, 14.0, 320.0);
          this._setUserAdjusted(true);
        }
      }
    };

    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.domElement.addEventListener('touchstart', this._onTouchStart, {
      passive: true,
    });
    this.domElement.addEventListener('touchmove', this._onTouchMove, {
      passive: true,
    });
  }

  _getOrCreateCanonicalAssembly(islandId) {
    if (!hasDetailedIslandModel(islandId)) return null;
    if (!this._assemblyCache[islandId]) {
      const asm = createDetailedIslandAssembly(islandId);
      asm.group.rotation.y = getIslandApproachOrientationRad(islandId);
      applyDetailedIslandAlpha(asm, 1.0);
      this._assemblyCache[islandId] = asm;
    }
    return this._assemblyCache[islandId];
  }

  _mountIsland(islandId) {
    const resolvedId = ISLANDS[islandId] ? islandId : 'raiatea';
    const isl = ISLANDS[resolvedId];
    const shoreR = getIslandShoreRadiusM(resolvedId, isl.archetype);

    if (this._activeAssembly && this.currentIslandId !== resolvedId) {
      this.islandMount.remove(this._activeAssembly.group);
      this._activeAssembly = null;
    }

    const asm = this._getOrCreateCanonicalAssembly(resolvedId);
    if (asm && this._activeAssembly !== asm) {
      applyDetailedIslandAlpha(asm, 1.0);
      asm.group.position.set(0, 0, 0);
      asm.group.scale.setScalar(1.0);
      asm.group.rotation.y = getIslandApproachOrientationRad(resolvedId);
      this.islandMount.add(asm.group);
      this._activeAssembly = asm;
    }

    this.currentIslandId = resolvedId;

    // Position island's signature stationary peak cloud or coral-atoll lapa cloud
    const peakH = isl.peakHeightM ?? 60.0;
    this.peakCloudGroup.visible = Boolean(isl.hasPeakCloud);
    if (this.peakCloudGroup.visible) {
      this.peakCloudGroup.position.set(0.0, Math.max(56.0, peakH * 0.72 + 22.0), -4.0);
      this.peakCloudGroup.scale.setScalar(resolvedId === 'rapa_nui' ? 1.15 : 0.96);
    }

    this.lapaCloudGroup.visible = Boolean(isl.hasLapaGlow);
    if (this.lapaCloudGroup.visible) {
      this.lapaCloudGroup.position.set(0.0, 0.0, 0.0);
      this.lapaCloudGroup.scale.setScalar(1.0);
    }

    // Moor the double-hulled Vaka in calm lagoon/cove shallows off the +Z landing shore
    const canoeOffsetSide = resolvedId === 'rapa_nui' ? -8.0 : -6.5;
    const canoeZ = shoreR + 13.5;
    this.mooredCanoePos.set(canoeOffsetSide, 0.0, canoeZ);
    // Angle bows (-Z local) outward-quartering toward the open ocean horizon (+Z/+X)
    this.mooredCanoeYaw = 2.48;
  }

  _computeStationPreset(stationId) {
    const isl = ISLANDS[this.currentIslandId] || ISLANDS.raiatea;
    const shoreR = getIslandShoreRadiusM(isl.id, isl.archetype);
    const isAtoll = isl.archetype === 'coral_atoll';
    const isWide = isl.id === 'rapa_nui' || isl.id === 'hawaii';
    const peakH = isAtoll ? 12.0 : isl.peakHeightM ?? 64.0;
    const wideBoost = isWide ? 42.0 : 0.0;

    if (stationId === 'landing') {
      // Intimate lagoon-level view beside the moored Vaka looking past prows & shore
      return {
        cx: this.mooredCanoePos.x + 1.5,
        cy: 2.55,
        cz: this.mooredCanoePos.z - 1.5,
        theta: -0.56,
        phi: 0.21,
        dist: 24.5,
        solarHour: departureToPreviewHour(this.selectedDeparture),
      };
    }

    if (stationId === 'sand') {
      // Swept beach, reef pass & lagoon swell angle
      return {
        cx: -2.0,
        cy: isAtoll ? 2.4 : 4.8,
        cz: shoreR * 0.72,
        theta: -0.34,
        phi: 0.25,
        dist: shoreR * 1.32 + 28.0 + wideBoost * 0.55,
        solarHour: 10.25,
      };
    }

    if (stationId === 'vigil') {
      // Evening coral-indigo twilight zoomed onto the coastal observation knoll
      return {
        cx: isWide ? -6.0 : 4.5,
        cy: isAtoll ? 5.2 : Math.min(22.0, peakH * 0.28 + 5.5),
        cz: shoreR * 0.34,
        theta: -0.36,
        phi: 0.20,
        dist: shoreR * 1.18 + 22.0 + wideBoost * 0.48,
        solarHour: 18.78,
      };
    }

    // Default: 'sanctuary' (🌺 Elder & Marae / Wild Shore / Moai Coastline)
    return {
      cx: isWide ? 6.0 : 2.5,
      cy: isAtoll ? 4.5 : Math.min(20.0, peakH * 0.24 + 4.0),
      cz: shoreR * 0.32,
      theta: isWide ? 0.22 : 0.34,
      phi: isAtoll ? 0.34 : 0.28,
      dist: shoreR * 1.92 + 34.0 + wideBoost,
      solarHour: isl.id === 'hawaii' ? 17.95 : 9.15,
    };
  }

  _applyStationPreset(stationId, snapImmediate = false) {
    this.currentStation = stationId || 'sanctuary';
    const p = this._computeStationPreset(this.currentStation);
    this.targetCenter.set(p.cx, p.cy, p.cz);
    this.targetTheta = p.theta;
    this.targetPhi = p.phi;
    this.targetDist = p.dist;
    this.targetSolarHour = p.solarHour;
    this._setUserAdjusted(false);

    if (snapImmediate) {
      this.curCenter.copy(this.targetCenter);
      this.curTheta = this.targetTheta;
      this.curPhi = this.targetPhi;
      this.curDist = this.targetDist;
      this.curSolarHour = this.targetSolarHour;
    }
  }

  enter({
    islandId,
    stationId = 'sanctuary',
    selectedDeparture = DepartureWindow.DAWN,
  } = {}) {
    this.selectedDeparture = selectedDeparture || DepartureWindow.DAWN;
    const isSameIsland = this.active && this.currentIslandId === islandId;
    this._mountIsland(islandId);
    this.active = true;
    this.root.visible = true;
    this._applyStationPreset(stationId, !isSameIsland);
  }

  setStation(stationId, selectedDeparture) {
    if (selectedDeparture) {
      this.selectedDeparture = selectedDeparture;
    }
    if (!this.active) return;
    this._applyStationPreset(stationId, false);
  }

  setDeparturePreview(selectedDeparture) {
    this.selectedDeparture = selectedDeparture || DepartureWindow.DAWN;
    if (this.active && this.currentStation === 'landing') {
      this.targetSolarHour = departureToPreviewHour(this.selectedDeparture);
    }
  }

  resetOrbitToStation() {
    if (!this.active) return;
    this._applyStationPreset(this.currentStation, false);
  }

  exit() {
    this.active = false;
    this.root.visible = false;
    this._dragging = false;
    this._setUserAdjusted(false);
    if (this.vakaRenderer?.root) {
      this.vakaRenderer.root.position.set(0, 0, 0);
      this.vakaRenderer.root.rotation.set(0, 0, 0);
    }
  }

  update(dtSec, elapsedSec, oceanSim, camera, gameState) {
    if (!this.active || !oceanSim || !camera) return;

    const damp = 1.0 - Math.exp(-Math.max(0.001, dtSec) * 4.2);
    this.curCenter.lerp(this.targetCenter, damp);
    this.curTheta = lerpAngleRad(this.curTheta, this.targetTheta, damp);
    this.curPhi = lerp(this.curPhi, this.targetPhi, damp);
    this.curDist = lerp(this.curDist, this.targetDist, damp);
    this.curSolarHour = lerpHour24(
      this.curSolarHour,
      this.targetSolarHour,
      damp
    );

    // Sync shore solar hour & latitude into OceanSim so SkyDome, Ocean & Vaka lights match seamlessly
    oceanSim.setShoreIsland(this.currentIslandId);
    oceanSim.solarHour =
      (this.curSolarHour + Math.sin(elapsedSec * 0.04) * 0.08 + 24.0) % 24.0;
    oceanSim.headingDeg = 0.0;
    oceanSim._refreshEnvironment(dtSec);

    // Compute spherical camera pose around `curCenter`
    const cosPhi = Math.cos(this.curPhi);
    const sinPhi = Math.sin(this.curPhi);
    const sinTheta = Math.sin(this.curTheta);
    const cosTheta = Math.cos(this.curTheta);

    const camX = this.curCenter.x + this.curDist * cosPhi * sinTheta;
    const camY = Math.max(1.85, this.curCenter.y + this.curDist * sinPhi);
    const camZ = this.curCenter.z + this.curDist * cosPhi * cosTheta;
    camera.position.set(camX, camY, camZ);

    // Offset look-at target rightward in camera space on wide viewports so the 3D island
    // centers naturally inside the unobstructed left ~60% of the screen!
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    this._lookTarget.copy(this.curCenter);
    if (w > 900) {
      const rightX = cosTheta;
      const rightZ = -sinTheta;
      const panelShift = this.curDist * 0.21;
      this._lookTarget.x += rightX * panelShift;
      this._lookTarget.z += rightZ * panelShift;
    } else {
      // On narrow/mobile screens where panel docks at bottom, shift look-at slightly downward
      this._lookTarget.y -= this.curDist * 0.11;
    }
    camera.lookAt(this._lookTarget);

    // Update island cloud lighting
    const sun = oceanSim.sunState;
    const sunVec = altAzToDirectionVec3(sun.altDeg, sun.azDeg, 0.0);
    if (this.peakCloudGroup.visible) {
      updateCloudMaterialUniforms(this.peakCloudMat, {
        sunDir: sunVec,
        daylight: sun.daylightFactor,
        twilight: sun.twilightFactor,
        opacity: 0.96,
        lapaGlow: 0.0,
        elapsedSec,
      });
    }
    if (this.lapaCloudGroup.visible) {
      updateCloudMaterialUniforms(this.lapaCloudMat, {
        sunDir: sunVec,
        daylight: sun.daylightFactor,
        twilight: sun.twilightFactor,
        opacity: 0.96,
        lapaGlow: 1.0,
        elapsedSec,
      });
    }

    // Update moored VakaRenderer in calm lagoon shallows with live crew, cargo & helm figure
    if (this.vakaRenderer) {
      const gentleBob = Math.sin(elapsedSec * 1.45) * 0.04;
      const gentleRoll = Math.sin(elapsedSec * 1.05) * 0.015;
      if (oceanSim.hullState) {
        oceanSim.hullState.heaveM = gentleBob;
        oceanSim.hullState.pitchRad = Math.cos(elapsedSec * 1.2) * 0.008;
        oceanSim.hullState.rollRad = gentleRoll;
      }
      this.vakaRenderer.update(dtSec, elapsedSec, oceanSim, gameState, 0.0, {
        showPlayerOnCanoe: true,
        playerOpacity: 1.0,
        lookYawDeg: wrapDeg180(-18.0),
      });
      this.vakaRenderer.root.visible = true;
      this.vakaRenderer.root.position.set(
        this.mooredCanoePos.x,
        gentleBob,
        this.mooredCanoePos.z
      );
      this.vakaRenderer.root.rotation.set(0.0, this.mooredCanoeYaw, gentleRoll);
      if (this.vakaRenderer.pouShadowBand) {
        this.vakaRenderer.pouShadowBand.visible = false;
      }

      // Ensure starlit / twilight clarity on the moored canoe & island during Dusk/Midnight previews
      this.vakaRenderer.hemiLight.intensity = Math.max(
        this.vakaRenderer.hemiLight.intensity,
        0.34
      );
    }
  }
}
