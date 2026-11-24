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
import {
  DepartureWindow,
  computeAdaptiveFovDeg,
  wrapDeg180,
} from '../core/gameConstants.js';
import { ISLANDS } from '../data/islandsData.js';
import { getWalkableIslandSpec } from '../data/walkableIslandsData.js';
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
  constructor(scene, vakaRenderer, domElement, worldCues = null) {
    this.scene = scene;
    this.vakaRenderer = vakaRenderer;
    this.domElement = domElement;
    this.worldCues = worldCues;

    this.active = false;
    this.currentIslandId = null;
    this.currentStation = 'sanctuary';
    this.selectedDeparture = DepartureWindow.DAWN;

    this.root = new THREE.Group();
    this.root.visible = false;
    this.scene.add(this.root);

    this.islandMount = new THREE.Group();
    this.root.add(this.islandMount);

    this.shoreBirdGroup = new THREE.Group();
    this.root.add(this.shoreBirdGroup);
    this.shoreBirds = [];

    // Cached canonical assemblies & 2D thumbnails keyed by islandId
    this._assemblyCache = {};
    this._thumbnailCache = {};
    this._thumbShared = null;
    this._thumbRigs = {};
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

    // Grounded Star-Stone Observation Circle mounted onto each island's knoll
    this._raycaster = new THREE.Raycaster();
    this._rayOrigin = new THREE.Vector3();
    this._rayDown = new THREE.Vector3(0, -1, 0);
    this.observatoryPos = new THREE.Vector3(0.0, 4.0, 18.0);
    this.observatoryRingGroup = this._buildObservatoryRingGroup();
    this.islandMount.add(this.observatoryRingGroup);

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
    this.domElement.style.touchAction = 'none';

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
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._pinchDist = Math.hypot(dx, dy);
      }
    };

    this._onTouchMove = (e) => {
      if (!this.active || e.target !== this.domElement) return;
      if (e.touches.length === 2 && this._pinchDist > 4) {
        e.preventDefault();
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
      passive: false,
    });
    this.domElement.addEventListener('touchmove', this._onTouchMove, {
      passive: false,
    });
  }

  _buildObservatoryRingGroup() {
    const grp = new THREE.Group();
    const coralMat = new THREE.MeshStandardMaterial({
      color: 0xe6d4ae,
      roughness: 0.92,
      metalness: 0.02,
    });
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x353941,
      roughness: 0.88,
      metalness: 0.05,
    });
    const grooveMat = new THREE.MeshBasicMaterial({
      color: 0x9b8259,
      side: THREE.DoubleSide,
    });
    const aitoMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.85,
    });

    const sandPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.75, 0.22, 24),
      coralMat
    );
    sandPad.position.y = 0.04;
    sandPad.receiveShadow = true;
    grp.add(sandPad);

    for (const sr of [0.48, 0.92, 1.28]) {
      const groove = new THREE.Mesh(
        new THREE.RingGeometry(sr - 0.025, sr + 0.025, 28),
        grooveMat
      );
      groove.rotation.x = -Math.PI * 0.5;
      groove.position.y = 0.16;
      grp.add(groove);
    }

    const centerPou = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, 1.05, 7),
      aitoMat
    );
    centerPou.position.y = 0.62;
    centerPou.castShadow = true;
    grp.add(centerPou);

    for (let s = 0; s < 6; s += 1) {
      const sAng = (s / 6) * Math.PI * 2.0 + 0.52;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.96, 0.24),
        basaltMat
      );
      stone.position.set(
        Math.cos(sAng) * 1.95,
        0.44,
        Math.sin(sAng) * 1.95
      );
      stone.rotation.y = -sAng + Math.PI * 0.5;
      stone.castShadow = true;
      stone.receiveShadow = true;
      grp.add(stone);
    }

    return grp;
  }

  _findTerrainMesh(assemblyGroup) {
    if (!assemblyGroup) return null;
    let terrainMesh = null;
    let maxVerts = 0;
    assemblyGroup.traverse((obj) => {
      if (
        obj.isMesh &&
        obj.geometry?.index &&
        obj.geometry?.getAttribute('color')
      ) {
        const cnt = obj.geometry.getAttribute('position').count;
        if (cnt > maxVerts) {
          maxVerts = cnt;
          terrainMesh = obj;
        }
      }
    });
    return terrainMesh;
  }

  _sampleTerrainHeight(terrainMesh, x, z) {
    if (!terrainMesh) return null;
    for (const [ox, oz] of [
      [0, 0],
      [0.25, 0],
      [-0.25, 0],
      [0, 0.25],
      [0, -0.25],
    ]) {
      this._rayOrigin.set(x + ox, 220.0, z + oz);
      this._raycaster.set(this._rayOrigin, this._rayDown);
      const hits = this._raycaster.intersectObject(terrainMesh, false);
      if (hits.length > 0) return hits[0].point.y;
    }
    return null;
  }

  _resolveAccessibleKnollPosition(asmGroup, islandId, shoreR) {
    const wSpec = getWalkableIslandSpec(islandId);
    const scale = wSpec?.canonicalScale ?? 1.55;
    const circlePoi = wSpec?.pois?.find((p) => p.kind === 'circle');
    const terrainMesh = this._findTerrainMesh(asmGroup);

    let ox = circlePoi ? circlePoi.x / scale : 4.5;
    let oz = circlePoi ? circlePoi.z / scale : shoreR * 0.45;
    if (!terrainMesh) {
      return new THREE.Vector3(ox, 2.0, oz);
    }

    const evalSpot = (x, z) => {
      const h = this._sampleTerrainHeight(terrainMesh, x, z);
      if (h === null || h < 0.35) return null;
      let maxDiff = 0.0;
      for (const [dx, dz] of [
        [1.5, 0],
        [-1.5, 0],
        [0, 1.5],
        [0, -1.5],
      ]) {
        const nh = this._sampleTerrainHeight(terrainMesh, x + dx, z + dz);
        if (nh === null || nh < 0.1) return null;
        maxDiff = Math.max(maxDiff, Math.abs(nh - h));
      }
      const slope = maxDiff / 1.5;
      return { x, y: h, z, slope };
    };

    const primary = evalSpot(ox, oz);
    if (primary) {
      return new THREE.Vector3(primary.x, primary.y, primary.z);
    }

    // Search seaward-facing hillside/bluff arc for an accessible, unobstructed hilltop
    let best = primary;
    let bestScore = primary ? primary.y * 0.4 - primary.slope * 10.0 : -999.0;
    for (let rFrac = 0.32; rFrac <= 0.78; rFrac += 0.09) {
      const r = shoreR * rFrac;
      for (let deg = -55; deg <= 55; deg += 15) {
        const rad = (deg * Math.PI) / 180.0;
        const cx = Math.sin(rad) * r;
        const cz = Math.cos(rad) * r;
        const cand = evalSpot(cx, cz);
        if (!cand || cand.slope > 0.75) continue;
        const score = Math.min(cand.y, 18.0) * 0.45 - cand.slope * 10.0;
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }

    if (best) {
      return new THREE.Vector3(best.x, best.y, best.z);
    }
    return new THREE.Vector3(ox, 2.0, oz);
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

    // Position the Observation Circle on an accessible, unobstructed hillside/bluff
    if (asm?.group) {
      asm.group.updateMatrixWorld(true);
    }
    this.observatoryPos.copy(
      this._resolveAccessibleKnollPosition(asm?.group, resolvedId, shoreR)
    );
    this.observatoryRingGroup.position.copy(this.observatoryPos);
    this.observatoryRingGroup.visible = true;

    this._populateShoreBirds(resolvedId, asm?.group);
  }

  _clearShoreBirds() {
    for (const b of this.shoreBirds) {
      b.entry?.mat?.dispose?.();
    }
    while (this.shoreBirdGroup.children.length > 0) {
      this.shoreBirdGroup.remove(this.shoreBirdGroup.children[0]);
    }
    this.shoreBirds = [];
  }

  _populateShoreBirds(islandId, asmGroup) {
    this._clearShoreBirds();
    const isl = ISLANDS[islandId];
    if (
      !this.worldCues ||
      (islandId !== 'manuae' && isl?.birdSpecies !== 'red_kura')
    ) {
      return;
    }

    const terrainMesh = this._findTerrainMesh(asmGroup);
    // 4 Red Kura birds standing along Manuae's central Rookery Sandbar & inner beaches (scale = 1.0)
    const perchCoords = [
      [10.8, -10.4, 0.5],
      [12.8, -11.6, 1.8],
      [14.8, -12.6, -1.1],
      [-34.0, 77.0, 2.3],
    ];
    for (let i = 0; i < perchCoords.length; i += 1) {
      const [px, pz, yaw] = perchCoords[i];
      const py = this._sampleTerrainHeight(terrainMesh, px, pz);
      if (py === null || py < 0.25) continue;
      const entry = this.worldCues.createSeabird('red_kura', { opaque: true });
      const sc = 1.05;
      entry.root.scale.setScalar(sc);
      entry.root.position.set(
        px,
        py + (entry.standFootHeight || 0.13) * sc,
        pz
      );
      entry.root.rotation.set(0.0, yaw, 0.0);
      this.shoreBirdGroup.add(entry.root);
      this.shoreBirds.push({
        kind: 'standing',
        entry,
        baseY: entry.root.position.y,
        phase: i * 1.7,
      });
    }

    // 5 Red Kura birds wheeling low across Manuae's central lagoon and beach cove
    const orbitDefs = [
      { cx: 4.0, cz: 4.0, radius: 13.0, altY: 5.2, speed: 0.36, phase: 0.4 },
      { cx: -3.0, cz: 26.0, radius: 14.0, altY: 6.4, speed: 0.33, phase: 1.9 },
      { cx: 14.0, cz: 20.0, radius: 12.0, altY: 4.6, speed: 0.39, phase: 3.1 },
      { cx: -8.0, cz: 36.0, radius: 11.0, altY: 7.2, speed: 0.31, phase: 4.4 },
      { cx: 8.0, cz: -6.0, radius: 15.0, altY: 8.0, speed: 0.29, phase: 5.2 },
    ];
    for (let i = 0; i < orbitDefs.length; i += 1) {
      const od = orbitDefs[i];
      const entry = this.worldCues.createSeabird('red_kura', { opaque: true });
      entry.root.scale.setScalar(1.08);
      this.shoreBirdGroup.add(entry.root);
      this.shoreBirds.push({
        kind: 'flying',
        entry,
        cx: od.cx,
        cz: od.cz,
        radius: od.radius,
        altY: od.altY,
        speed: od.speed,
        phase: od.phase,
        orbitAngle: od.phase,
      });
    }
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
      // Evening coral-indigo twilight zoomed directly onto the Star-Stone Observation Circle
      const aimTheta = clamp(
        Math.atan2(
          this.observatoryPos.x,
          Math.max(8.0, this.observatoryPos.z)
        ) * 0.75,
        -0.55,
        0.55
      );
      return {
        cx: this.observatoryPos.x,
        cy: this.observatoryPos.y + 1.1,
        cz: this.observatoryPos.z,
        theta: aimTheta,
        phi: 0.28,
        dist: isWide ? 24.0 : 18.0,
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
    transitionFromCam = null,
  } = {}) {
    this.selectedDeparture = selectedDeparture || DepartureWindow.DAWN;
    const isSameIsland = this.active && this.currentIslandId === islandId;
    this._mountIsland(islandId);
    this.active = true;
    this.root.visible = true;
    if (transitionFromCam?.pos) {
      this._applyStationPreset(stationId, false);
      const center = transitionFromCam.lookAt
        ? transitionFromCam.lookAt.clone()
        : this.targetCenter.clone();
      const off = transitionFromCam.pos.clone().sub(center);
      const dist = Math.max(8.0, off.length());
      const horiz = Math.max(0.001, Math.hypot(off.x, off.z));
      this.curCenter.copy(center);
      this.curDist = dist;
      this.curPhi = Math.max(0.04, Math.min(1.15, Math.atan2(off.y, horiz)));
      this.curTheta = Math.atan2(off.x, off.z);
    } else {
      this._applyStationPreset(stationId, !isSameIsland);
    }
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
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 720;
    const isNarrowPortraitPhone = w <= 540 && w / h < 0.78;
    const effDist = isNarrowPortraitPhone ? this.curDist * 1.22 : this.curDist;

    const targetFov = computeAdaptiveFovDeg(56.0, w, h);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    const cosPhi = Math.cos(this.curPhi);
    const sinPhi = Math.sin(this.curPhi);
    const sinTheta = Math.sin(this.curTheta);
    const cosTheta = Math.cos(this.curTheta);

    const camX = this.curCenter.x + effDist * cosPhi * sinTheta;
    const camY = Math.max(1.85, this.curCenter.y + effDist * sinPhi);
    const camZ = this.curCenter.z + effDist * cosPhi * cosTheta;
    camera.position.set(camX, camY, camZ);

    // Offset look-at target rightward in camera space on wide viewports so the 3D island
    // centers naturally inside the unobstructed left ~60% of the screen!
    this._lookTarget.copy(this.curCenter);
    if (w > 900 || (h <= 500 && w > h)) {
      const rightX = cosTheta;
      const rightZ = -sinTheta;
      const panelShift = effDist * 0.21;
      this._lookTarget.x += rightX * panelShift;
      this._lookTarget.z += rightZ * panelShift;
    } else {
      // On portrait/narrow screens where panel docks at bottom, shift look-at slightly downward
      this._lookTarget.y -= effDist * 0.11;
    }
    camera.lookAt(this._lookTarget);

    // Update island cloud lighting
    const sun = oceanSim.sunState;
    const sunVec = altAzToDirectionVec3(sun.altDeg, sun.azDeg, 0.0);
    if (this._activeAssembly?.update) {
      this._activeAssembly.update(elapsedSec, {
        sunDir: sunVec,
        daylight: sun.daylightFactor,
        twilight: sun.twilightFactor,
        alpha: 1.0,
      });
    }
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

    if (this.worldCues && this.shoreBirds.length > 0) {
      for (let i = 0; i < this.shoreBirds.length; i += 1) {
        const b = this.shoreBirds[i];
        if (b.kind === 'standing') {
          const idleLook =
            Math.sin(elapsedSec * 1.45 + b.phase) * 0.3 +
            Math.sin(elapsedSec * 0.6 + i) * 0.2;
          this.worldCues.animateSeabird(b.entry, elapsedSec, b.phase, 1.0, {
            standBlend: 1.0,
            legExtend: 1.0,
            foldBlend: 1.0,
            spreadBlend: 0.0,
            flapSpeed: 1.0,
            flapAmp: 0.0,
            pitchRad: 0.0,
            lookYawRad: idleLook,
          });
          b.entry.root.position.y = b.baseY + (b.entry.bobY ?? 0.0);
        } else {
          b.orbitAngle += b.speed * dtSec;
          const ox = b.cx + Math.cos(b.orbitAngle) * b.radius;
          const oy = b.altY + Math.sin(b.orbitAngle * 2.0) * 0.55;
          const oz = b.cz + Math.sin(b.orbitAngle) * b.radius;
          const oyaw = Math.atan2(Math.sin(b.orbitAngle), -Math.cos(b.orbitAngle));
          this.worldCues.animateSeabird(b.entry, elapsedSec, b.phase, 1.0, null);
          b.entry.root.position.set(ox, oy + (b.entry.bobY ?? 0.0), oz);
          b.entry.root.rotation.set(0.0, oyaw, 0.14);
        }
      }
    }
  }

  _ensureThumbnailRig(square = false) {
    const mode = square ? 'square' : 'wide';
    if (this._thumbRigs[mode]) return this._thumbRigs[mode];

    if (!this._thumbShared) {
      const scene = new THREE.Scene();

      const hemi = new THREE.HemisphereLight(0xfff1d6, 0x164458, 1.4);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xffe7b8, 1.9);
      sun.position.set(110, 125, 115);
      scene.add(sun);

      const fill = new THREE.DirectionalLight(0x6bd6cf, 0.62);
      fill.position.set(-90, 48, -75);
      scene.add(fill);

      // Compact turquoise lagoon shelf disc under the island silhouette
      const waterGroup = new THREE.Group();
      const outerShelf = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 48),
        new THREE.MeshBasicMaterial({
          color: 0x0c4356,
          transparent: true,
          opacity: 0.78,
        })
      );
      outerShelf.rotation.x = -Math.PI * 0.5;
      outerShelf.position.y = -0.06;
      waterGroup.add(outerShelf);

      const innerLagoon = new THREE.Mesh(
        new THREE.CircleGeometry(0.94, 48),
        new THREE.MeshBasicMaterial({
          color: 0x188996,
          transparent: true,
          opacity: 0.9,
        })
      );
      innerLagoon.rotation.x = -Math.PI * 0.5;
      innerLagoon.position.y = 0.02;
      waterGroup.add(innerLagoon);
      scene.add(waterGroup);

      const gammaLut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i += 1) {
        const lin = i / 255;
        const srgb =
          lin <= 0.0031308
            ? 12.92 * lin
            : 1.055 * Math.pow(lin, 1.0 / 2.4) - 0.055;
        gammaLut[i] = Math.round(clamp(srgb, 0.0, 1.0) * 255);
      }

      this._thumbShared = {
        scene,
        waterGroup,
        gammaLut,
        box: new THREE.Box3(),
        center: new THREE.Vector3(),
        size: new THREE.Vector3(),
        prevClearColor: new THREE.Color(),
      };
    }

    const width = square ? 180 : 240;
    const height = square ? 180 : 160;
    const camera = new THREE.PerspectiveCamera(34, width / height, 1.0, 1400.0);
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    this._thumbRigs[mode] = {
      ...this._thumbShared,
      width,
      height,
      camera,
      rt,
      canvas,
      ctx,
      pixelBuf: new Uint8Array(width * height * 4),
      imgData: ctx ? ctx.createImageData(width, height) : null,
    };
    return this._thumbRigs[mode];
  }

  /**
   * Renders a small cached 2D snapshot directly from the canonical 3D island assembly.
   */
  renderIslandThumbnailDataUrl(renderer, islandId, { square = false } = {}) {
    if (!islandId || !ISLANDS[islandId]) return null;
    const cacheKey = square ? `${islandId}:sq` : islandId;
    if (this._thumbnailCache[cacheKey]) return this._thumbnailCache[cacheKey];
    if (!renderer || typeof document === 'undefined') return null;

    const asm = this._getOrCreateCanonicalAssembly(islandId);
    if (!asm?.group) return null;

    const rig = this._ensureThumbnailRig(square);
    if (!rig.ctx || !rig.imgData) return null;

    const isl = ISLANDS[islandId];
    const prevParent = asm.group.parent;
    const prevPos = asm.group.position.clone();
    const prevScale = asm.group.scale.clone();
    const prevRotY = asm.group.rotation.y;

    applyDetailedIslandAlpha(asm, 1.0);
    asm.group.position.set(0, 0, 0);
    asm.group.scale.setScalar(1.0);
    asm.group.rotation.y = getIslandApproachOrientationRad(islandId);
    rig.scene.add(asm.group);
    asm.group.updateMatrixWorld(true);

    rig.box.setFromObject(asm.group);
    rig.box.getCenter(rig.center);
    rig.box.getSize(rig.size);

    const horizR = Math.max(24.0, Math.max(rig.size.x, rig.size.z) * 0.5);
    const maxY = Math.max(8.0, rig.box.max.y);
    rig.waterGroup.position.set(rig.center.x, 0.0, rig.center.z);
    rig.waterGroup.scale.setScalar(horizR * 1.04);

    const isAtoll = isl.archetype === 'coral_atoll';
    const lookY = isAtoll ? 1.8 : Math.min(28.0, maxY * 0.34);
    const dir = isAtoll
      ? new THREE.Vector3(0.38, 0.62, 0.69).normalize()
      : new THREE.Vector3(0.42, 0.36, 0.83).normalize();

    const halfFovRad = (34.0 * Math.PI) / 360.0;
    const aspect = rig.width / rig.height;
    const distH = horizR / (Math.tan(halfFovRad) * aspect);
    const distV = (maxY * 0.62) / Math.tan(halfFovRad);
    const dist = Math.max(distH, distV) * 1.15;

    rig.camera.position.set(
      rig.center.x + dir.x * dist,
      lookY + dir.y * dist,
      rig.center.z + dir.z * dist
    );
    rig.camera.lookAt(rig.center.x, lookY, rig.center.z);

    const prevTarget = renderer.getRenderTarget();
    renderer.getClearColor(rig.prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha();

    try {
      renderer.setRenderTarget(rig.rt);
      renderer.setClearColor(0x091523, 1.0);
      renderer.clear(true, true, true);
      renderer.render(rig.scene, rig.camera);
      renderer.readRenderTargetPixels(
        rig.rt,
        0,
        0,
        rig.width,
        rig.height,
        rig.pixelBuf
      );
    } finally {
      renderer.setClearColor(rig.prevClearColor, prevClearAlpha);
      renderer.setRenderTarget(prevTarget);
      rig.scene.remove(asm.group);
      asm.group.position.copy(prevPos);
      asm.group.scale.copy(prevScale);
      asm.group.rotation.y = prevRotY;
      if (prevParent) {
        prevParent.add(asm.group);
      }
    }

    const { width, height, pixelBuf, imgData, gammaLut } = rig;
    const out = imgData.data;
    for (let y = 0; y < height; y += 1) {
      const srcRow = (height - 1 - y) * width * 4;
      const dstRow = y * width * 4;
      for (let x = 0; x < width; x += 1) {
        const s = srcRow + x * 4;
        const d = dstRow + x * 4;
        out[d] = gammaLut[pixelBuf[s]];
        out[d + 1] = gammaLut[pixelBuf[s + 1]];
        out[d + 2] = gammaLut[pixelBuf[s + 2]];
        out[d + 3] = 255;
      }
    }
    rig.ctx.putImageData(imgData, 0, 0);
    const url = rig.canvas.toDataURL('image/png');
    this._thumbnailCache[cacheKey] = url;
    return url;
  }
}
