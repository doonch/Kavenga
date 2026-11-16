/**
 * 3D Walkable Island Scene & Character Controller for Ra'iatea ("Sacred High Island").
 *
 * Renders Ra'iatea at human walkable scale (~185m across) with:
 * - High-resolution sculpted volcanic massif (flat-topped Mount Temehani plateau, 7 radial
 *   basalt ridges, highland waterfall, golden crescent beaches, turquoise lagoon & Te Ava Mo'a pass)
 * - Swept coral-pebble footpaths & bamboo kukui torches connecting 4 interactive 3D POIs:
 *   1. Moored Voyaging Canoe (live VakaRenderer moored at timber beach rollers; player spawns beside it)
 *   2. Provisioning & Canoe-Wrights' Hut (open-sided thatched fare pote'e, ration baskets, hearth & 3D craftsman)
 *   3. Hilltop Observation Circle & Teaching Sand (coastal bluff stone circle & etched white-sand diagram bed)
 *   4. Sacred Marae Taputapuatea (headland basalt courtyard, stepped coral ahu, kura standards & 3D Elder Metua)
 * - Arrow-key (and WASD) third-person character movement with articulated barefoot walking animation,
 *   exact triangle-barycentric terrain height clamping, obstacle sliding, and proximity POI detection.
 */

import * as THREE from 'three';
import { Difficulty, wrapDeg180 } from '../core/gameConstants.js';
import {
  RAIATEA_WALKABLE_SPEC,
  getWalkableIslandSpec,
} from '../data/walkableIslandsData.js';
import { createSculptedCloudMesh, updateCloudMaterialUniforms } from './CloudSculptBuilder.js';
import {
  animatePlayerCharacterAshore,
  createPlayerCharacterRig,
} from './PlayerCharacterBuilder.js';
import {
  buildVariantIslandStructures,
  createHawaiiTerrainEvaluator,
  createRapaNuiTerrainEvaluator,
  createTahaaTerrainEvaluator,
} from './WalkableIslandVariantsBuilder.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v) {
  return Math.max(0.0, Math.min(1.0, v));
}

function smoothstep(e0, e1, x) {
  if (Math.abs(e1 - e0) < 1e-6) return x >= e1 ? 1.0 : 0.0;
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3.0 - 2.0 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixRgb(c1, c2, t) {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
  ];
}

function distToSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 1e-6 ? clamp01((wx * vx + wz * vz) / lenSq) : 0.0;
  const cx = ax + t * vx;
  const cz = az + t * vz;
  return Math.hypot(px - cx, pz - cz);
}

// Swept coral-sand footpath segments connecting all 4 Ra'iatea shore POIs
const FOOTPATH_SEGMENTS = [
  // Canoe Landing -> Player Spawn -> Village Fork -> Provisioning Hut
  [-13.5, 55.6, -9.2, 54.0],
  [-9.2, 54.0, -13.0, 45.2],
  [-13.0, 45.2, -22.5, 36.5],
  // Village Fork -> Gentle Hilltop Ramp -> Observation Circle Knoll
  [-13.0, 45.2, -5.8, 36.4],
  [-5.8, 36.4, 2.5, 28.5],
  // Provisioning Hut -> Hillside Trail -> Observation Circle Knoll
  [-22.5, 36.5, -10.5, 33.8],
  [-10.5, 33.8, 2.5, 28.5],
  // Observation Circle Knoll -> Scenic Ridge Walk -> Sacred Marae Taputapuatea
  [2.5, 28.5, 14.2, 34.8],
  [14.2, 34.8, 26.5, 42.5],
  // Golden Beach Promenade: Spawn -> Lagoon Cove -> Marae Terrace
  [-9.2, 54.0, 8.2, 50.2],
  [8.2, 50.2, 26.5, 42.5],
];

function evalFootpathMask(x, z) {
  let minD = 999.0;
  for (let i = 0; i < FOOTPATH_SEGMENTS.length; i += 1) {
    const [ax, az, bx, bz] = FOOTPATH_SEGMENTS[i];
    const d = distToSegment2D(x, z, ax, az, bx, bz);
    if (d < minD) minD = d;
  }
  return 1.0 - smoothstep(1.15, 2.25, minD);
}

/**
 * Evaluates human-scale walkable Ra'iatea height & surface biome at world (x, z) in meters.
 * Centered with Mount Temehani massif around (0, -8) and walkable village shore on +Z (z ~ 24..62m).
 */
function evalWalkableRaiateaTerrain(x, z) {
  // Shift volcanic massif center slightly inland (-Z) so the +Z coastal apron is broad & inviting
  const mx = x * 1.02;
  const mz = (z + 6.0) * 0.96;
  const r = Math.hypot(mx, mz);
  const theta = Math.atan2(mz, mx);

  // Sacred Marae headland jutting around (26.5, 42.5) -> theta ~ 1.05 rad
  const maraeCapeDiff = Math.atan2(Math.sin(theta - 1.03), Math.cos(theta - 1.03));
  const maraeCape = 9.5 * Math.exp(-Math.pow(maraeCapeDiff / 0.32, 2.0));

  // Gentle sheltered Canoe Landing cove around (-13, 56) -> theta ~ 1.80 rad
  const coveWave =
    4.2 * Math.cos(3.0 * theta - 0.85) +
    2.8 * Math.sin(5.0 * theta + 0.9) +
    1.4 * Math.cos(8.0 * theta);

  const coastR = 60.5 + maraeCape + coveWave;
  const u = r / coastR;

  if (u >= 1.0) {
    const lagoonDepth = -3.4 * smoothstep(1.0, 1.42, u);
    return {
      h: lagoonDepth,
      u,
      pathMask: 0.0,
      ridgeFactor: 0.0,
      zone: 'lagoon',
    };
  }

  const inland = 1.0 - u;

  // Broad walkable coastal apron on the +Z village side, rising into steep Mount Temehani inland
  const villageSide = smoothstep(-6.0, 26.0, z);
  const domeCurve = lerp(1.28, 1.85, villageSide);
  const baseDome = 74.0 * Math.pow(smoothstep(0.03, 0.88, inland), domeCurve);

  // 7 dramatic radial basalt ridges & lush amphitheater valleys on Mount Temehani
  const twistTheta = theta + 0.16 * Math.sin(2.0 * theta) + 0.1 * inland;
  const ridgeRaw = 0.5 + 0.5 * Math.cos(7.0 * twistTheta - 0.4);
  const ridgeSharp = Math.pow(ridgeRaw, 1.85);
  const ridgeEnv =
    smoothstep(0.14, 0.42, inland) *
    smoothstep(0.95, 0.54, inland) *
    (1.0 - 0.55 * villageSide * smoothstep(0.38, 0.14, inland));
  const ridgeRelief = (ridgeSharp - 0.3) * 22.0 * ridgeEnv;

  let h = Math.max(0.05, baseDome + ridgeRelief);

  // Iconic flat-topped sacred Mount Temehani plateau truncation above 64m
  let isPlateau = false;
  if (h > 63.0) {
    h = 63.0 + Math.min(5.5, (h - 63.0) * 0.22);
    const rimDist = Math.hypot(mx - 1.5, mz + 3.0);
    h += 1.6 * Math.exp(-Math.pow((rimDist - 10.5) / 3.5, 2.0));
    isPlateau = true;
  }

  // Gentle golden-sand beach slope near shoreline along the southern/lagoon coves
  if (u > 0.84) {
    const beachT = smoothstep(0.84, 1.0, u);
    h = lerp(h, 1.85 * (1.0 - beachT), 0.72 * villageSide);
  }

  // 1. Level clearing for Provisioning & Canoe-Wrights' Hut at (-22.5, 36.5)
  const dHut = Math.hypot(x - -22.5, z - 36.5);
  const hutPad = 1.0 - smoothstep(5.8, 12.5, dHut);
  if (hutPad > 0.001) {
    h = lerp(h, 2.15, hutPad * 0.92);
  }

  // 2. Scenic breezy Coastal Knoll for Observation Circle & Teaching Sand at (2.5, 28.5)
  const dKnoll = Math.hypot(x - 2.5, z - 28.5);
  const knollTop = 1.0 - smoothstep(5.4, 13.8, dKnoll);
  if (knollTop > 0.001) {
    h = lerp(h, 6.65, knollTop * 0.94);
  }
  // Smooth walkable ramp shoulders leading up to the Observation Knoll from Hut, Beach & Marae
  const rampMask =
    Math.max(
      1.0 - smoothstep(2.4, 7.2, distToSegment2D(x, z, -13.0, 45.2, 2.5, 28.5)),
      1.0 - smoothstep(2.4, 7.2, distToSegment2D(x, z, -22.5, 36.5, 2.5, 28.5)),
      1.0 - smoothstep(2.4, 7.2, distToSegment2D(x, z, 26.5, 42.5, 2.5, 28.5))
    ) *
    (1.0 - knollTop);
  if (rampMask > 0.01) {
    const rampTarget = lerp(6.65, 2.25, clamp01((z - 28.5) / 14.5));
    h = lerp(h, rampTarget, rampMask * 0.9);
  }

  // 3. Flat Sacred Terrace for Marae Taputapuatea on the headland at (26.5, 42.5)
  const dMarae = Math.hypot((x - 26.5) * 0.92, (z - 42.5) * 0.85);
  const maraePad = 1.0 - smoothstep(7.8, 15.5, dMarae);
  if (maraePad > 0.001) {
    h = lerp(h, 2.55, maraePad * 0.95);
  }

  // 4. Smooth Golden Cove Beach beside the Moored Canoe & Player Spawn (-11, 54)
  const dLanding = Math.hypot((x - -10.5) * 0.85, (z - 53.5) * 1.05);
  const landingPad = 1.0 - smoothstep(4.5, 11.0, dLanding);
  if (landingPad > 0.001 && u < 0.985) {
    const targetBeachH = lerp(1.25, 0.25, smoothstep(0.86, 0.99, u));
    h = lerp(h, targetBeachH, landingPad * 0.78);
  }

  const pathMask = u < 0.985 ? evalFootpathMask(x, z) : 0.0;

  let zone = 'inland';
  if (maraePad > 0.55) zone = 'marae_terrace';
  else if (knollTop > 0.62) zone = 'knoll_top';
  else if (hutPad > 0.58) zone = 'hut_clearing';
  else if (u > 0.87 || h < 1.65) zone = 'beach';
  else if (isPlateau) zone = 'plateau';

  return {
    h,
    u,
    pathMask,
    ridgeFactor: ridgeSharp * ridgeEnv,
    zone,
  };
}

export class WalkableIslandScene {
  constructor(scene, vakaRenderer, labelLayerEl) {
    this.scene = scene;
    this.vakaRenderer = vakaRenderer;
    this.labelLayerEl = labelLayerEl;
    this.spec = RAIATEA_WALKABLE_SPEC;

    this.root = new THREE.Group();
    this.root.visible = false;
    this.scene.add(this.root);

    this.active = false;
    this.gridHalfSpan = 108.0;
    this.gridN = 148; // ~1.46m cell resolution across 216m x 216m
    this.heightGrid = new Float32Array((this.gridN + 1) * (this.gridN + 1));

    // Player ashore state
    this.playerPos = new THREE.Vector3(
      this.spec.initialSpawn.x,
      0.0,
      this.spec.initialSpawn.z
    );
    this.playerYawRad = this.spec.initialSpawn.facingYawRad;
    this.walkAmount = 0.0;
    this.stridePhase = 0.0;
    this.playerRigs = {};
    this.activePlayerRig = null;

    // Third-person island camera orbit state
    this.camYawRad = 0.26; // Frames canoe on left, hut ahead-left, knoll center, Marae ahead-right, Mt Temehani behind!
    this.camPitchRad = 0.31; // ~17.8 deg downward look
    this.camDist = 10.2;
    this.camTarget = new THREE.Vector3();
    this.camDesiredPos = new THREE.Vector3();
    this._isOrbitDragging = false;
    this._lastPtr = { x: 0, y: 0 };

    // Solid circular obstacles so player slides around huts, altars & moored canoe cleanly
    this.obstacles = [
      { x: -15.4, z: 57.6, r: 4.1 }, // Moored twin-hulled canoe
      { x: -22.5, z: 34.4, r: 2.35 }, // Rear workbench/baskets inside Provisioning Hut
      { x: -19.2, z: 38.2, r: 1.05 }, // Stone cooking hearth
      { x: 28.8, z: 41.2, r: 2.85 }, // Raised coral Ahu altar on Marae Taputapuatea
      { x: 2.5, z: 28.5, r: 1.85 }, // Sacred central etched sand bed inside Observation Circle
    ];

    this.poiVisuals = {};
    this.poiBadgeEls = {};
    this.activePoi = null;
    this.torchFlames = [];
    this.pennantMeshes = [];
    this.lagoonTerns = [];
    this.variantNpcEntries = [];
    this.variantCloudMats = [];
    this.builtIslandId = null;

    this._buildPlayerGroup();
    this._loadIsland('raiatea');
    this._bindCameraPointerOrbit();
  }

  _clearCurrentIslandContent() {
    for (let i = this.root.children.length - 1; i >= 0; i -= 1) {
      const child = this.root.children[i];
      if (child !== this.playerGroup) {
        this.root.remove(child);
      }
    }
    for (const el of Object.values(this.poiBadgeEls)) {
      el.remove?.();
    }
    this.poiVisuals = {};
    this.poiBadgeEls = {};
    this.torchFlames = [];
    this.pennantMeshes = [];
    this.lagoonTerns = [];
    this.variantNpcEntries = [];
    this.variantCloudMats = [];
    this.craftsmanRig = null;
    this.elderMetuaRig = null;
    this.peakCloudMat = null;
    this.tahaaCloudMat = null;
  }

  _loadIsland(islandId) {
    const resolvedId = getWalkableIslandSpec(islandId) ? islandId : 'raiatea';
    if (this.builtIslandId === resolvedId) return;

    this._clearCurrentIslandContent();
    this.spec = getWalkableIslandSpec(resolvedId) || RAIATEA_WALKABLE_SPEC;
    this.builtIslandId = resolvedId;

    this.obstacles = [
      { x: -15.4, z: 57.6, r: 4.1 },
      { x: -22.5, z: 34.4, r: 2.35 },
      { x: -19.2, z: 38.2, r: 1.05 },
      { x: 28.8, z: 41.2, r: 2.85 },
      { x: 2.5, z: 28.5, r: 1.85 },
    ];

    this._buildIslandTerrainAndLagoon(resolvedId);
    this._buildVillageStructuresAndPois(resolvedId);
    this._buildPoiWorldLabels();
  }

  _bindCameraPointerOrbit() {
    if (typeof window === 'undefined') return;
    const canvasParent = document.getElementById('webgl-container');
    if (!canvasParent) return;

    window.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      if (e.target?.tagName !== 'CANVAS') return;
      this._isOrbitDragging = true;
      this._lastPtr.x = e.clientX;
      this._lastPtr.y = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.active || !this._isOrbitDragging) return;
      const dx = e.clientX - this._lastPtr.x;
      const dy = e.clientY - this._lastPtr.y;
      this._lastPtr.x = e.clientX;
      this._lastPtr.y = e.clientY;

      this.camYawRad -= dx * 0.0055;
      this.camPitchRad = clamp(this.camPitchRad + dy * 0.0045, 0.11, 0.82);
    });

    const endDrag = () => {
      this._isOrbitDragging = false;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.active) return;
        if (e.target?.tagName !== 'CANVAS') return;
        this.camDist = clamp(this.camDist + e.deltaY * 0.01, 5.4, 19.5);
      },
      { passive: true }
    );
  }

  /**
   * Exact bilinear/triangle-matched ground height lookup from the rendered terrain grid.
   */
  getGroundHeight(x, z) {
    const span = this.gridHalfSpan * 2.0;
    const gx = ((x + this.gridHalfSpan) / span) * this.gridN;
    const gz = ((z + this.gridHalfSpan) / span) * this.gridN;
    if (gx < 0 || gz < 0 || gx >= this.gridN || gz >= this.gridN) {
      return -3.4;
    }

    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const stride = this.gridN + 1;

    const h00 = this.heightGrid[iz * stride + ix];
    const h10 = this.heightGrid[iz * stride + (ix + 1)];
    const h01 = this.heightGrid[(iz + 1) * stride + ix];
    const h11 = this.heightGrid[(iz + 1) * stride + (ix + 1)];

    // Exact barycentric interpolation matching the (v00 -> v11) triangle diagonal
    if (fz >= fx) {
      return h00 + fz * (h01 - h00) + fx * (h11 - h01);
    }
    return h00 + fx * (h10 - h00) + fz * (h11 - h10);
  }

  _buildIslandTerrainAndLagoon(islandId = 'raiatea') {
    const N = this.gridN;
    const half = this.gridHalfSpan;
    const span = half * 2.0;
    const stride = N + 1;

    let evalFn = evalWalkableRaiateaTerrain;
    if (islandId === 'tahaa') {
      evalFn = createTahaaTerrainEvaluator(this.spec);
    } else if (islandId === 'hawaii') {
      evalFn = createHawaiiTerrainEvaluator(this.spec);
    } else if (islandId === 'rapa_nui') {
      evalFn = createRapaNuiTerrainEvaluator(this.spec);
    }

    const colDeepReef = [0.06, 0.32, 0.44];
    const colLagoonAqua = [0.15, 0.79, 0.73];
    const colShoalSand = [0.72, 0.87, 0.77];
    const colBeachGold = [0.91, 0.83, 0.64];
    const colFootpath = [0.94, 0.88, 0.72];
    const colVillageGrass = [0.27, 0.53, 0.22];
    const colMaraeStone = [0.34, 0.32, 0.3];
    const colKnollLawn = [0.32, 0.56, 0.24];
    const colValleyJungle = [0.13, 0.35, 0.17];
    const colRidgeFern = [0.36, 0.49, 0.21];
    const colCliffBasalt = [0.28, 0.26, 0.24];
    const colPlateauMoss = [0.27, 0.4, 0.22];

    const positions = new Float32Array(stride * stride * 3);
    const colors = new Float32Array(stride * stride * 3);
    const samples = new Array(stride * stride);

    for (let iz = 0; iz <= N; iz += 1) {
      const z = -half + (iz / N) * span;
      for (let ix = 0; ix <= N; ix += 1) {
        const x = -half + (ix / N) * span;
        const idx = iz * stride + ix;
        const s = evalFn(x, z);
        this.heightGrid[idx] = s.h;
        samples[idx] = s;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = s.h;
        positions[idx * 3 + 2] = z;
      }
    }

    // Colorize vertices using local height + slope + footpath/terrace masks
    const step = span / N;
    for (let iz = 0; iz <= N; iz += 1) {
      for (let ix = 0; ix <= N; ix += 1) {
        const idx = iz * stride + ix;
        const s = samples[idx];
        const hL = this.heightGrid[iz * stride + Math.max(0, ix - 1)];
        const hR = this.heightGrid[iz * stride + Math.min(N, ix + 1)];
        const hD = this.heightGrid[Math.max(0, iz - 1) * stride + ix];
        const hU = this.heightGrid[Math.min(N, iz + 1) * stride + ix];
        const slope = Math.hypot(hR - hL, hU - hD) / (2.0 * step);

        let rgb;
        if (s.h <= 0.08) {
          const depthT = clamp01(-s.h / 2.8);
          rgb = mixRgb(
            colShoalSand,
            mixRgb(colLagoonAqua, colDeepReef, depthT),
            smoothstep(0.0, 0.38, depthT)
          );
        } else if (s.zone === 'lava_molten') {
          const heat = clamp01(s.lavaGlow || 0.5);
          rgb =
            heat > 0.65
              ? mixRgb([1.0, 0.38, 0.05], [1.0, 0.92, 0.34], (heat - 0.65) / 0.35)
              : mixRgb([0.2, 0.06, 0.04], [1.0, 0.38, 0.05], heat / 0.65);
        } else if (s.zone === 'black_pahoehoe' || s.zone === 'heiau_lava_terrace') {
          rgb = s.zone === 'heiau_lava_terrace' ? [0.22, 0.21, 0.22] : [0.15, 0.14, 0.15];
        } else if (s.zone === 'beach_cream') {
          rgb = mixRgb([0.94, 0.89, 0.74], colVillageGrass, smoothstep(1.15, 2.25, s.h));
        } else if (s.zone === 'anakena_rose_sand') {
          rgb = mixRgb([0.94, 0.85, 0.78], [0.52, 0.56, 0.25], smoothstep(1.2, 2.3, s.h));
        } else if (s.zone === 'basalt_shore') {
          rgb = [0.2, 0.19, 0.2];
        } else if (s.zone === 'tuff_quarry') {
          rgb = mixRgb([0.74, 0.62, 0.34], colCliffBasalt, smoothstep(0.95, 1.8, slope) * 0.55);
        } else if (s.zone === 'caldera_marsh') {
          rgb = [0.22, 0.48, 0.28];
        } else if (s.zone === 'rapa_grassland') {
          const meadow = mixRgb([0.48, 0.54, 0.24], [0.68, 0.6, 0.3], clamp01(s.ridgeFactor * 1.2));
          rgb = mixRgb(meadow, colCliffBasalt, smoothstep(0.75, 1.55, slope) * 0.85);
        } else if (s.zone === 'beach' || s.h < 1.75) {
          const grassBlend = smoothstep(1.15, 2.25, s.h);
          rgb = mixRgb(colBeachGold, colVillageGrass, grassBlend);
        } else if (s.zone === 'hut_clearing') {
          rgb =
            islandId === 'rapa_nui'
              ? mixRgb([0.52, 0.56, 0.25], [0.92, 0.84, 0.74], 0.5)
              : mixRgb(colVillageGrass, colBeachGold, 0.58);
        } else if (s.zone === 'marae_terrace') {
          rgb =
            islandId === 'rapa_nui'
              ? mixRgb([0.5, 0.54, 0.25], colMaraeStone, 0.52)
              : mixRgb(colVillageGrass, colMaraeStone, 0.42);
        } else if (s.zone === 'knoll_top') {
          rgb =
            islandId === 'rapa_nui'
              ? [0.56, 0.58, 0.28]
              : mixRgb(colKnollLawn, colBeachGold, 0.25);
        } else {
          const altT = clamp01((s.h - 2.5) / 56.0);
          rgb = mixRgb(colVillageGrass, colValleyJungle, smoothstep(0.0, 0.55, altT));
          rgb = mixRgb(rgb, colRidgeFern, clamp01(s.ridgeFactor * 1.25) * 0.7);
          rgb = mixRgb(rgb, colCliffBasalt, smoothstep(0.75, 1.55, slope) * 0.85);
          if (s.zone === 'plateau') {
            rgb = mixRgb(rgb, colPlateauMoss, 0.55);
          }
          if (s.snowCap && s.snowCap > 0.01) {
            rgb = mixRgb(rgb, [0.95, 0.97, 1.0], s.snowCap);
          }
        }

        if (s.pathMask > 0.02 && s.h > 0.12) {
          rgb = mixRgb(rgb, colFootpath, s.pathMask * 0.88);
        }

        colors[idx * 3] = rgb[0];
        colors[idx * 3 + 1] = rgb[1];
        colors[idx * 3 + 2] = rgb[2];
      }
    }

    const indices = [];
    for (let iz = 0; iz < N; iz += 1) {
      for (let ix = 0; ix < N; ix += 1) {
        const v00 = iz * stride + ix;
        const v10 = iz * stride + (ix + 1);
        const v01 = (iz + 1) * stride + ix;
        const v11 = (iz + 1) * stride + (ix + 1);
        // Upward +Y normal in Three.js right-handed space: (v00, v01, v11) and (v00, v11, v10)
        indices.push(v00, v01, v11, v00, v11, v10);
      }
    }

    const terrainGeo = new THREE.BufferGeometry();
    terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.setIndex(indices);
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.87,
      metalness: 0.02,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.root.add(terrainMesh);

    // Translucent Coastal Water Shimmer (+ Barrier Reef & Motu on Lagoon Islands)
    const lagoonMat = new THREE.MeshBasicMaterial({
      color: islandId === 'hawaii' ? 0x1ba8c8 : islandId === 'rapa_nui' ? 0x1e9bc4 : 0x24dcc8,
      transparent: true,
      opacity: islandId === 'raiatea' || islandId === 'tahaa' ? 0.36 : 0.26,
      depthWrite: false,
    });
    const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(105.0, 64), lagoonMat);
    lagoonDisc.rotation.x = -Math.PI * 0.5;
    lagoonDisc.position.set(0, 0.11, -6.0);
    this.root.add(lagoonDisc);

    if (islandId !== 'raiatea' && islandId !== 'tahaa') {
      return;
    }

    const reefSandMat = new THREE.MeshStandardMaterial({
      color: 0xe3d3a8,
      roughness: 0.88,
    });
    const surfFoamMat = new THREE.MeshBasicMaterial({
      color: 0xf2fbff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    // Leave Sacred Te Ava Mo'a Reef Pass open around theta ~ 1.18 rad (+Z/+X lagoon approach)
    const addReefArc = (r, a0, a1) => {
      const spanRad = a1 - a0;
      const reef = new THREE.Mesh(
        new THREE.TorusGeometry(r, 3.6, 6, 40, spanRad),
        reefSandMat
      );
      reef.rotation.x = Math.PI * 0.5;
      reef.rotation.z = a0;
      reef.scale.set(1, 1, 0.25);
      reef.position.set(0, 0.22, -6.0);
      this.root.add(reef);

      const foam = new THREE.Mesh(
        new THREE.TorusGeometry(r + 2.2, 1.7, 5, 40, spanRad),
        surfFoamMat
      );
      foam.rotation.x = Math.PI * 0.5;
      foam.rotation.z = a0;
      foam.scale.set(1, 1, 0.14);
      foam.position.set(0, 0.29, -6.0);
      this.root.add(foam);
    };
    addReefArc(98.0, 1.48, Math.PI * 2.0 + 0.88);

    // Two sandy coral Motu islets flanking Te Ava Mo'a pass + distant Taha'a silhouette on horizon!
    const motuGeo = new THREE.CylinderGeometry(6.2, 8.8, 1.35, 14);
    for (const [mx, mz, sx, sz] of [
      [54.0, 74.0, 1.25, 0.82],
      [82.0, 42.0, 0.92, 1.2],
    ]) {
      const motu = new THREE.Mesh(motuGeo, reefSandMat);
      motu.position.set(mx, 0.36, mz);
      motu.scale.set(sx, 1.0, sz);
      this.root.add(motu);
    }

    if (islandId !== 'raiatea') {
      return;
    }

    // Highland Waterfall Cascade tumbling off Mount Temehani's amphitheater valley
    const fallMat = new THREE.MeshBasicMaterial({
      color: 0xe3f8ff,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fallRibbon = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 34.0), fallMat);
    fallRibbon.position.set(-14.5, 41.0, 8.5);
    fallRibbon.rotation.x = -0.38;
    fallRibbon.rotation.y = -0.24;
    this.root.add(fallRibbon);

    // Ra'iatea's signature stationary Cumulus Peak Cloud crowning Mount Temehani
    const peakSculpt = createSculptedCloudMesh('peak', { opacity: 0.94 });
    peakSculpt.mesh.position.set(0.0, 96.0, -8.0);
    peakSculpt.mesh.scale.setScalar(1.35);
    this.peakCloudMat = peakSculpt.material;
    this.root.add(peakSculpt.mesh);

    // Distant Taha'a Island & its Motionless Peak Cloud on the sea horizon (foreshadowing Song 1!)
    const distantTahaaGroup = new THREE.Group();
    distantTahaaGroup.position.set(135.0, -1.0, 320.0);
    const tahaaCone = new THREE.Mesh(
      new THREE.ConeGeometry(46.0, 42.0, 16),
      new THREE.MeshStandardMaterial({ color: 0x3b6858, roughness: 0.92 })
    );
    tahaaCone.position.y = 18.0;
    distantTahaaGroup.add(tahaaCone);
    const tahaaCloud = createSculptedCloudMesh('peak', { opacity: 0.9 });
    tahaaCloud.mesh.position.set(0.0, 68.0, 0.0);
    this.tahaaCloudMat = tahaaCloud.material;
    distantTahaaGroup.add(tahaaCloud.mesh);
    this.root.add(distantTahaaGroup);
  }

  _buildVillageStructuresAndPois(islandId = 'raiatea') {
    const aitoMat = new THREE.MeshStandardMaterial({ color: 0x623e24, roughness: 0.86 });
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0xc89d5c, roughness: 0.88 });
    const reedMat = new THREE.MeshStandardMaterial({ color: 0xa6804e, roughness: 0.85 });
    const pandanusMat = new THREE.MeshStandardMaterial({ color: 0xd9bc82, roughness: 0.84 });
    const sennitMat = new THREE.MeshStandardMaterial({ color: 0x5c381c, roughness: 0.9 });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x3c3936, roughness: 0.92 });
    const coralStoneMat = new THREE.MeshStandardMaterial({ color: 0xe6decb, roughness: 0.84 });
    const kuraRedMat = new THREE.MeshStandardMaterial({
      color: 0xc92c20,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9d3b });

    // Helper: Bamboo Kukui Torch
    const addKukuiTorch = (x, z, height = 1.65) => {
      const y = this.getGroundHeight(x, z);
      const tGrp = new THREE.Group();
      tGrp.position.set(x, y, z);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.06, height, 6),
        aitoMat
      );
      pole.position.y = height * 0.5;
      pole.castShadow = true;
      tGrp.add(pole);

      const cup = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.22, 7),
        sennitMat
      );
      cup.rotation.x = Math.PI;
      cup.position.y = height;
      tGrp.add(cup);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.28, 7),
        flameMat
      );
      flame.position.y = height + 0.18;
      tGrp.add(flame);
      this.torchFlames.push({ mesh: flame, baseY: height + 0.18, phase: x * 0.7 + z });

      this.root.add(tGrp);
    };

    // Helper: Diegetic Coral/Gold Ground POI Ring
    for (const poi of this.spec.pois) {
      const py = Math.max(0.16, this.getGroundHeight(poi.x, poi.z) + 0.05);
      const ringGrp = new THREE.Group();
      ringGrp.position.set(poi.x, py, poi.z);

      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xf4c96b,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(poi.markerRadiusM - 0.18, poi.markerRadiusM, 40),
        outerMat
      );
      outerRing.rotation.x = -Math.PI * 0.5;
      ringGrp.add(outerRing);

      // Small ring of white coral pebbles marking the threshold
      for (let i = 0; i < 12; i += 1) {
        const ang = (i / 12) * Math.PI * 2.0;
        const peb = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.11, 0),
          coralStoneMat
        );
        peb.position.set(
          Math.cos(ang) * poi.markerRadiusM,
          0.02,
          Math.sin(ang) * poi.markerRadiusM
        );
        peb.scale.set(1.2, 0.55, 1.0);
        ringGrp.add(peb);
      }

      this.root.add(ringGrp);
      this.poiVisuals[poi.id] = { group: ringGrp, ringMat: outerMat, baseY: py };
    }

    if (islandId !== 'raiatea') {
      const built = buildVariantIslandStructures(
        {
          root: this.root,
          spec: this.spec,
          getGroundHeight: (x, z) => this.getGroundHeight(x, z),
          addKukuiTorch,
          torchFlames: this.torchFlames,
          pennantMeshes: this.pennantMeshes,
        },
        islandId
      );
      this.obstacles = built.obstacles;
      this.variantNpcEntries = built.npcEntries;
      this.variantCloudMats = built.peakCloudMats;
      this._populateCoastalPalmsAndBirds(islandId);
      return;
    }

    // -----------------------------------------------------------------------
    // POI 1: CANOE LANDING (Timber Beach Rollers, Woven Boarding Mat & Posts)
    // -----------------------------------------------------------------------
    const landingGrp = new THREE.Group();
    const lx = this.spec.pois[0].x;
    const lz = this.spec.pois[0].z;
    const ly = this.getGroundHeight(lx, lz);
    landingGrp.position.set(lx, ly, lz);
    landingGrp.rotation.y = this.spec.mooredCanoe.yawRad;

    const boardingMat = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.06, 3.8),
      pandanusMat
    );
    boardingMat.position.set(0.5, 0.06, 0.2);
    boardingMat.receiveShadow = true;
    landingGrp.add(boardingMat);

    for (let r = -2; r <= 2; r += 1) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 3.2, 8),
        aitoMat
      );
      roller.rotation.z = Math.PI * 0.5;
      roller.position.set(-0.6, 0.04, r * 0.95);
      landingGrp.add(roller);
    }

    for (const pzOff of [-1.8, 1.8]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 1.25, 7),
        aitoMat
      );
      post.position.set(1.65, 0.55, pzOff);
      post.castShadow = true;
      landingGrp.add(post);
    }
    this.root.add(landingGrp);
    addKukuiTorch(-11.2, 56.2, 1.6);
    addKukuiTorch(-15.5, 52.8, 1.6);

    // -----------------------------------------------------------------------
    // POI 2: PROVISIONING & CANOE-WRIGHTS' HUT (Fare Hoa Vaka at -22.5, 36.5)
    // -----------------------------------------------------------------------
    const hx = -22.5;
    const hz = 36.5;
    const hy = this.getGroundHeight(hx, hz);
    const hutGrp = new THREE.Group();
    hutGrp.position.set(hx, hy, hz);
    hutGrp.rotation.y = 0.42; // Faces welcomingly toward the beach & footpath

    // Raised basalt & woven mat floor platform
    const floorPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.32, 5.4),
      basaltMat
    );
    floorPlinth.position.set(0, 0.12, -1.6);
    floorPlinth.receiveShadow = true;
    hutGrp.add(floorPlinth);

    const floorMat = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.06, 4.8),
      pandanusMat
    );
    floorMat.position.set(0, 0.3, -1.6);
    floorMat.receiveShadow = true;
    hutGrp.add(floorMat);

    // 6 sturdy Aito timber support posts (open front so player sees inside clearly!)
    for (const px of [-2.9, 0.0, 2.9]) {
      for (const pz of [-3.7, 0.5]) {
        if (px === 0.0 && pz > 0) continue; // Keep front center wide open!
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.16, 2.55, 8),
          aitoMat
        );
        post.position.set(px, 1.55, pz);
        post.castShadow = true;
        hutGrp.add(post);
      }
    }

    // High-pitched Polynesian pandanus thatch roof (4-sided pyramid/hip roof)
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.35, 2.65, 4),
      thatchMat
    );
    roof.position.set(0, 3.95, -1.6);
    roof.rotation.y = Math.PI * 0.25;
    roof.scale.set(1.18, 1.0, 0.92);
    roof.castShadow = true;
    hutGrp.add(roof);

    // Ridgepole ornament
    const ridgeBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 5.2, 6),
      aitoMat
    );
    ridgeBeam.rotation.z = Math.PI * 0.5;
    ridgeBeam.position.set(0, 5.12, -1.6);
    hutGrp.add(ridgeBeam);

    // Stacked Woven Ration Baskets, Gourds & Coiled Sennit inside & beside the Hut
    const basketGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.38, 9);
    for (const [bx, by, bz] of [
      [-1.9, 0.52, -2.6],
      [-1.2, 0.52, -2.7],
      [-1.55, 0.88, -2.65],
      [-2.1, 0.52, -1.7],
      [2.1, 0.52, -0.4],
      [2.55, 0.52, -0.6],
    ]) {
      const b = new THREE.Mesh(basketGeo, reedMat);
      b.position.set(bx, by, bz);
      b.castShadow = true;
      hutGrp.add(b);
    }

    // Boatbuilder's timber workhorse & carved hull strake plank
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.14, 0.48),
      aitoMat
    );
    plank.position.set(1.25, 0.98, -2.45);
    plank.rotation.y = -0.15;
    plank.castShadow = true;
    hutGrp.add(plank);
    for (const tx of [0.45, 2.05]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.68, 6),
        aitoMat
      );
      leg.position.set(tx, 0.62, -2.45);
      hutGrp.add(leg);
    }

    // Master Craftsman / Boatbuilder 3D Character tending supplies at the Hut entrance
    this.craftsmanRig = createPlayerCharacterRig(Difficulty.MEDIUM);
    this.craftsmanRig.root.position.set(-0.65, 0.33, -0.85);
    this.craftsmanRig.root.rotation.y = Math.PI; // Faces +Z out the open hut front toward player!
    hutGrp.add(this.craftsmanRig.root);

    this.root.add(hutGrp);

    // Glowing stone village hearth (Ahi) just outside the hut
    const hearthX = -19.2;
    const hearthZ = 38.2;
    const hearthY = this.getGroundHeight(hearthX, hearthZ);
    const hearthGrp = new THREE.Group();
    hearthGrp.position.set(hearthX, hearthY, hearthZ);
    const hearthRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.18, 6, 12),
      basaltMat
    );
    hearthRing.rotation.x = Math.PI * 0.5;
    hearthRing.position.y = 0.12;
    hearthGrp.add(hearthRing);
    const hearthFire = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.52, 7),
      flameMat
    );
    hearthFire.position.y = 0.28;
    hearthGrp.add(hearthFire);
    this.torchFlames.push({ mesh: hearthFire, baseY: 0.28, phase: 1.7 });

    const hearthLight = new THREE.PointLight(0xff9436, 1.6, 14.0);
    hearthLight.position.y = 0.85;
    hearthGrp.add(hearthLight);
    this.root.add(hearthGrp);
    addKukuiTorch(-25.8, 39.2, 1.75);

    // -----------------------------------------------------------------------
    // POI 3: HILLTOP OBSERVATION CIRCLE & TEACHING SAND (Ahu Feti'a at 2.5, 28.5)
    // -----------------------------------------------------------------------
    const cx = 2.5;
    const cz = 28.5;
    const cy = this.getGroundHeight(cx, cz);
    const circleGrp = new THREE.Group();
    circleGrp.position.set(cx, cy, cz);

    // Swept white-coral Teaching Sand Bed in the center of the stone ring
    const sandCurb = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.18, 7, 28),
      basaltMat
    );
    sandCurb.rotation.x = Math.PI * 0.5;
    sandCurb.position.y = 0.12;
    circleGrp.add(sandCurb);

    const sandBed = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.15, 0.16, 28),
      coralStoneMat
    );
    sandBed.position.y = 0.08;
    sandBed.receiveShadow = true;
    circleGrp.add(sandBed);

    // Etched concentric wave rings & shell star-markers in the teaching sand
    for (const sr of [0.65, 1.25, 1.72]) {
      const groove = new THREE.Mesh(
        new THREE.RingGeometry(sr - 0.035, sr + 0.035, 32),
        reedMat
      );
      groove.rotation.x = -Math.PI * 0.5;
      groove.position.y = 0.17;
      circleGrp.add(groove);
    }

    // Central upright sighting rod (Pou) & leaning bamboo sand-drawing stick
    const centerPou = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.065, 1.35, 7),
      aitoMat
    );
    centerPou.position.y = 0.72;
    centerPou.castShadow = true;
    circleGrp.add(centerPou);

    // 8 Upright Basalt Horizon Observation Stones ringing the knoll (leaving entrance gap on +Z)
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2.0 + 0.39;
      const sx = Math.cos(ang) * 4.35;
      const sz = Math.sin(ang) * 4.35;
      const hStone = 1.35 + (i % 3) * 0.28;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, hStone, 0.36),
        basaltMat
      );
      stone.position.set(sx, hStone * 0.48, sz);
      stone.rotation.y = -ang + Math.PI * 0.5;
      stone.castShadow = true;
      circleGrp.add(stone);
    }

    // Woven pandanus sitting mat at the ring threshold
    const sitMat = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.05, 1.05),
      pandanusMat
    );
    sitMat.position.set(0.0, 0.05, 3.05);
    circleGrp.add(sitMat);

    this.root.add(circleGrp);
    addKukuiTorch(-1.2, 32.0, 1.7);
    addKukuiTorch(6.2, 32.0, 1.7);

    // -----------------------------------------------------------------------
    // POI 4: ELDER METUA AT SACRED MARAE TAPUTAPUATEA (Headland at 26.5, 42.5)
    // -----------------------------------------------------------------------
    const mx = 26.5;
    const mz = 42.5;
    const my = this.getGroundHeight(mx, mz);
    const maraeGrp = new THREE.Group();
    maraeGrp.position.set(mx, my, mz);
    maraeGrp.rotation.y = -0.52; // Courtyard faces toward the beach & hilltop approach!

    // Paved dry-stone basalt ceremonial courtyard
    const court = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.46, 12.6),
      basaltMat
    );
    court.position.set(1.2, 0.18, 0.0);
    court.receiveShadow = true;
    maraeGrp.add(court);

    // Stepped Two-Tier Sacred Coral & Basalt Ahu Altar along the seaward (+X local) edge
    const ahuTier1 = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.35, 9.6),
      coralStoneMat
    );
    ahuTier1.position.set(4.5, 1.05, 0.0);
    ahuTier1.castShadow = true;
    ahuTier1.receiveShadow = true;
    maraeGrp.add(ahuTier1);

    const ahuTier2 = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 1.15, 7.8),
      basaltMat
    );
    ahuTier2.position.set(4.65, 2.25, 0.0);
    ahuTier2.castShadow = true;
    maraeGrp.add(ahuTier2);

    // 5 Upright Sacred Basalt Unu / Backrest Slabs
    for (let u = -2; u <= 2; u += 1) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 2.15 + (u === 0 ? 0.45 : 0.0), 0.62),
        coralStoneMat
      );
      slab.position.set(2.55, 1.35, u * 1.95);
      slab.castShadow = true;
      maraeGrp.add(slab);
    }

    // 4 Tall Ceremonial Crimson Kura Feather Standards fluttering in the sea breeze
    for (const zStd of [-4.6, -1.8, 1.8, 4.6]) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 4.4, 6),
        aitoMat
      );
      mast.position.set(3.2, 2.55, zStd);
      mast.castShadow = true;
      maraeGrp.add(mast);

      const pennant = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 1.65, 1, 4),
        kuraRedMat
      );
      pennant.position.set(3.2, 3.85, zStd + 0.3);
      pennant.rotation.y = Math.PI * 0.5;
      maraeGrp.add(pennant);
      this.pennantMeshes.push({ mesh: pennant, phase: zStd });
    }

    // 3D ELDER METUA standing before the sacred Ahu holding his carved ironwood staff (tokotoko)
    this.elderMetuaRig = createPlayerCharacterRig(Difficulty.MASTER_NAVIGATOR);
    this.elderMetuaRig.root.position.set(1.15, 0.41, 0.0);
    // Rig faces -Z in local space; rotating +PI/2 makes -Z point toward -X (the courtyard entrance!)
    this.elderMetuaRig.root.rotation.y = Math.PI * 0.5;

    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.018, 1.82, 7),
      aitoMat
    );
    staff.position.set(0.24, 0.91, -0.22);
    staff.castShadow = true;
    this.elderMetuaRig.root.add(staff);

    maraeGrp.add(this.elderMetuaRig.root);
    this.root.add(maraeGrp);

    addKukuiTorch(21.8, 44.8, 1.85);
    addKukuiTorch(23.5, 37.8, 1.85);
    // Pathside way-torches
    addKukuiTorch(-12.5, 45.8, 1.55);
    addKukuiTorch(8.5, 49.0, 1.55);
    addKukuiTorch(14.0, 35.4, 1.55);

    // -----------------------------------------------------------------------
    // 5. Lush Wind-Leaning Coconut Palm Groves & Wheeling Lagoon White Terns
    // -----------------------------------------------------------------------
    this._populateCoastalPalmsAndBirds('raiatea');
  }

  _populateCoastalPalmsAndBirds(islandId = 'raiatea') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x745133, roughness: 0.86 });
    const frondDark = new THREE.MeshStandardMaterial({ color: 0x316e26, roughness: 0.78 });
    const frondSun = new THREE.MeshStandardMaterial({ color: 0x4b8d32, roughness: 0.76 });
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x695224, roughness: 0.82 });

    const lowerGeo = new THREE.CylinderGeometry(0.22, 0.36, 2.7, 7);
    lowerGeo.translate(0, 1.35, 0);
    const upperGeo = new THREE.CylinderGeometry(0.15, 0.22, 2.8, 7);
    upperGeo.translate(0, 1.4, 0);
    const crownLowGeo = new THREE.ConeGeometry(2.25, 0.95, 7);
    const crownHighGeo = new THREE.ConeGeometry(1.75, 0.85, 7);
    const nutGeo = new THREE.DodecahedronGeometry(0.32, 0);

    const addPalm = (x, z, leanYaw, scale = 1.0, lean = 0.2) => {
      const y = this.getGroundHeight(x, z);
      if (y < 0.35) return;
      const palm = new THREE.Group();
      palm.position.set(x, y - 0.12, z);
      palm.rotation.y = leanYaw;
      palm.scale.setScalar(scale);

      const low = new THREE.Mesh(lowerGeo, trunkMat);
      low.rotation.z = lean * 0.65;
      low.castShadow = true;
      palm.add(low);

      const upPivot = new THREE.Group();
      upPivot.position.set(-Math.sin(lean * 0.65) * 2.65, Math.cos(lean * 0.65) * 2.65, 0);
      upPivot.rotation.z = lean * 1.1;
      const up = new THREE.Mesh(upperGeo, trunkMat);
      up.castShadow = true;
      upPivot.add(up);

      const crown = new THREE.Group();
      crown.position.set(0, 2.75, 0);
      crown.rotation.z = -lean * 0.85;
      const nuts = new THREE.Mesh(nutGeo, nutMat);
      nuts.position.y = -0.15;
      crown.add(nuts);

      const c1 = new THREE.Mesh(crownLowGeo, frondDark);
      c1.scale.set(1.25, 0.48, 1.25);
      c1.castShadow = true;
      crown.add(c1);

      const c2 = new THREE.Mesh(crownHighGeo, frondSun);
      c2.position.y = 0.34;
      c2.rotation.y = 0.45;
      c2.scale.set(1.15, 0.52, 1.15);
      crown.add(c2);

      upPivot.add(crown);
      palm.add(upPivot);
      this.root.add(palm);
    };

    const palmCoords = [
      // Framing Provisioning Hut & Beach Cove
      [-28.5, 41.5, 0.4, 1.08, 0.24],
      [-30.2, 34.0, 0.9, 1.15, 0.18],
      [-25.5, 29.5, 1.2, 1.02, 0.2],
      [-17.2, 30.8, -0.4, 0.96, 0.18],
      [-19.8, 47.2, 0.7, 1.05, 0.26],
      [-4.2, 54.8, 1.5, 0.94, 0.28],
      [3.5, 53.2, 1.8, 1.06, 0.25],
      [14.8, 50.5, 2.1, 0.98, 0.24],
      // Framing Observation Knoll & Valley Flanks
      [-9.5, 25.5, 0.5, 1.12, 0.16],
      [11.8, 25.2, -0.7, 1.08, 0.19],
      [18.5, 30.2, -1.1, 1.04, 0.21],
      // Framing Marae Headland & Motu Islets
      [34.5, 35.0, -1.4, 1.1, 0.22],
      [35.8, 47.5, -2.0, 0.96, 0.27],
      [-36.0, 46.0, 0.6, 1.12, 0.24],
      [-41.0, 32.0, 0.3, 1.04, 0.2],
    ];
    for (const [px, pz, yaw, sc, ln] of palmCoords) {
      if (islandId === 'rapa_nui' && px > 2.0) continue; // Keep Rapa Nui palms clustered at Anakena oasis!
      addPalm(px, pz, yaw, sc, ln);
    }

    // Motu palms (lagoon islands only)
    if (islandId === 'raiatea' || islandId === 'tahaa') {
      for (const [mx, mz] of [
        [54.0, 74.0],
        [56.2, 72.5],
        [82.0, 42.0],
      ]) {
        const mPalm = new THREE.Group();
        mPalm.position.set(mx, 0.9, mz);
        const t = new THREE.Mesh(lowerGeo, trunkMat);
        t.scale.setScalar(0.9);
        mPalm.add(t);
        const c = new THREE.Mesh(crownLowGeo, frondSun);
        c.position.y = 2.45;
        mPalm.add(c);
        this.root.add(mPalm);
      }
    }

    // 3 Graceful White Terns (Kakaia) wheeling above the turquoise lagoon
    const ternMat = new THREE.MeshBasicMaterial({ color: 0xf9fcff, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i += 1) {
      const bird = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 6), ternMat);
      body.rotation.x = -Math.PI * 0.5;
      bird.add(body);

      const wingGeo = new THREE.PlaneGeometry(0.75, 0.22);
      wingGeo.translate(0.375, 0, 0);
      const rWing = new THREE.Mesh(wingGeo, ternMat);
      rWing.rotation.x = -Math.PI * 0.5;
      const lWing = new THREE.Mesh(wingGeo.clone().scale(-1, 1, 1), ternMat);
      lWing.rotation.x = -Math.PI * 0.5;
      bird.add(rWing, lWing);

      this.root.add(bird);
      this.lagoonTerns.push({
        group: bird,
        rWing,
        lWing,
        cx: -2.0 + i * 14.0,
        cz: 52.0 - i * 6.0,
        radius: 14.0 + i * 4.5,
        altY: 13.5 + i * 2.4,
        speed: 0.34 + i * 0.05,
        phase: i * 2.1,
      });
    }
  }

  _buildPlayerGroup() {
    this.playerGroup = new THREE.Group();
    this.root.add(this.playerGroup);
  }

  _getOrCreatePlayerRig(difficulty) {
    const key = difficulty || Difficulty.EASY;
    if (!this.playerRigs[key]) {
      const rig = createPlayerCharacterRig(key);
      rig.root.visible = false;
      this.playerGroup.add(rig.root);
      this.playerRigs[key] = rig;
    }
    return this.playerRigs[key];
  }

  _buildPoiWorldLabels() {
    if (!this.labelLayerEl) return;
    for (const poi of this.spec.pois) {
      const el = document.createElement('div');
      el.className = 'shore-poi-world-tag hidden';
      el.innerHTML = `<span class="shore-poi-glyph">${poi.glyph}</span><span>${poi.label}</span>`;
      this.labelLayerEl.appendChild(el);
      this.poiBadgeEls[poi.id] = el;
    }
  }

  /**
   * Enters the 3D Walkable Island mode, spawning the player beside the moored canoe
   * (or beside the Observation Circle when returning from the Night-Sky Vigil).
   */
  enter({ islandId = null, spawnMode = 'canoe', gameState = null } = {}) {
    const targetIslandId =
      islandId || gameState?.currentIslandId || this.builtIslandId || 'raiatea';
    this._loadIsland(targetIslandId);

    this.active = true;
    this.root.visible = true;

    const spawn =
      spawnMode === 'vigil' ? this.spec.vigilExitSpawn : this.spec.initialSpawn;
    this.playerPos.x = spawn.x;
    this.playerPos.z = spawn.z;
    this.playerPos.y = Math.max(0.0, this.getGroundHeight(spawn.x, spawn.z));
    this.playerYawRad = spawn.facingYawRad;
    this.walkAmount = 0.0;

    if (spawnMode === 'canoe') {
      this.camYawRad = spawn.camYawRad ?? 0.26;
      this.camPitchRad = 0.31;
      this.camDist = 10.2;
    }

    // Snap camera immediately on first frame so there is no sweep from ocean origin
    this._syncCamera(1.0, null);

    // Dock live VakaRenderer canoe in the calm lagoon shallows beside the landing!
    this._dockVakaAtLanding(0.0, gameState);
  }

  /**
   * Immediately moves the player character (and third-person shore camera) to a named 3D POI.
   * Used when clicking a location inside the closeable Island Hub on a walkable island.
   */
  moveToPoi(poiId, camera = null) {
    const poi = this.spec.pois.find((p) => p.id === poiId) || null;
    if (!poi) return null;

    const spot = poi.arrivalSpot || {
      x: poi.x,
      z: poi.z,
      facingYawRad: 0.0,
      camYawRad: this.camYawRad,
    };

    this.playerPos.x = spot.x;
    this.playerPos.z = spot.z;
    this.playerPos.y = Math.max(-0.08, this.getGroundHeight(spot.x, spot.z));
    this.playerYawRad = spot.facingYawRad ?? 0.0;
    if (spot.camYawRad !== undefined) {
      this.camYawRad = spot.camYawRad;
    }
    this.walkAmount = 0.0;
    this.activePoi = poi;

    if (this.playerGroup) {
      this.playerGroup.position.copy(this.playerPos);
      this.playerGroup.rotation.y = this.playerYawRad;
    }
    this._syncCamera(1.0, camera);
    return poi;
  }

  /**
   * Exits 3D Walkable Island mode and restores VakaRenderer root to sailing origin (0, 0, 0).
   */
  exit() {
    if (!this.active && !this.root.visible) return;
    this.active = false;
    this.root.visible = false;
    this.activePoi = null;
    this._isOrbitDragging = false;

    for (const el of Object.values(this.poiBadgeEls)) {
      el.classList.add('hidden');
    }

    if (this.vakaRenderer?.root) {
      this.vakaRenderer.root.position.set(0.0, 0.0, 0.0);
      this.vakaRenderer.root.rotation.set(0.0, 0.0, 0.0);
    }
  }

  _dockVakaAtLanding(elapsedSec, gameState) {
    if (!this.vakaRenderer?.root) return;
    const mc = this.spec.mooredCanoe;
    const gentleBob = Math.sin(elapsedSec * 1.45) * 0.035;
    const gentleRoll = Math.sin(elapsedSec * 1.1) * 0.014;
    this.vakaRenderer.root.visible = true;
    this.vakaRenderer.root.position.set(mc.x, gentleBob, mc.z);
    this.vakaRenderer.root.rotation.set(0.0, mc.yawRad, gentleRoll);
    if (this.vakaRenderer.pouShadowBand) {
      this.vakaRenderer.pouShadowBand.visible = false;
    }
    if (this.vakaRenderer.playerHelmGroup) {
      // Never duplicate the player on the canoe while the player is walking ashore!
      this.vakaRenderer.playerHelmGroup.visible = false;
    }
    if (gameState) {
      const visibleBaskets = Math.max(0, Math.floor(gameState.loadedRations));
      this.vakaRenderer.rationBaskets.forEach((b, idx) => {
        b.visible = idx < visibleBaskets;
      });
      this.vakaRenderer.tier2Gunwales.forEach((g) => {
        g.visible = gameState.vakaTier >= 2;
      });
      this.vakaRenderer.pahuDrum.visible = gameState.vakaTier >= 2;
      if (this.vakaRenderer.secondMastGroup) {
        this.vakaRenderer.secondMastGroup.visible = gameState.vakaTier >= 3;
      }
      this.vakaRenderer.cargoBundles.forEach((b, idx) => {
        b.visible = idx < gameState.cargoItems.length;
      });
      for (const [crewId, mesh] of Object.entries(this.vakaRenderer.crewMeshes)) {
        mesh.visible = gameState.assignedCrew.includes(crewId);
      }
      const isSailWorn = gameState.sailCondition < 55.0;
      this.vakaRenderer.sailMat.color.setHex(isSailWorn ? 0xb59e78 : 0xe6cfa3);
      this.vakaRenderer.hullMat.color.setHex(
        gameState.hullCondition < 55.0 ? 0x663d20 : 0x8d532b
      );
    }
  }

  _tryMovePlayer(dx, dz) {
    if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return 0.0;

    const startX = this.playerPos.x;
    const startZ = this.playerPos.z;
    const curH = this.getGroundHeight(startX, startZ);

    const canStandAt = (nx, nz) => {
      if (Math.hypot(nx, nz + 6.0) > 74.0) return false;
      const nh = this.getGroundHeight(nx, nz);
      // Allow ankle-deep wading (-0.24m) in lagoon shallows, block deep water
      if (nh < -0.24) return false;
      // Block climbing sheer inland volcanic cliffs of Mount Temehani (allow climbing down)
      const stepDist = Math.max(0.05, Math.hypot(nx - startX, nz - startZ));
      const uphillSlope = (nh - curH) / stepDist;
      if (uphillSlope > 0.85 && nh > 11.5) return false;
      return true;
    };

    let nextX = startX + dx;
    let nextZ = startZ + dz;

    if (!canStandAt(nextX, nextZ)) {
      // Smooth axis-separated sliding along shoreline or cliff toe
      if (canStandAt(startX + dx, startZ)) {
        nextX = startX + dx;
        nextZ = startZ;
      } else if (canStandAt(startX, startZ + dz)) {
        nextX = startX;
        nextZ = startZ + dz;
      } else {
        return 0.0;
      }
    }

    // Push smoothly out of solid circular structure colliders
    for (let i = 0; i < this.obstacles.length; i += 1) {
      const ob = this.obstacles[i];
      const ox = nextX - ob.x;
      const oz = nextZ - ob.z;
      const d = Math.hypot(ox, oz);
      if (d < ob.r && d > 1e-4) {
        nextX = ob.x + (ox / d) * ob.r;
        nextZ = ob.z + (oz / d) * ob.r;
      }
    }

    const moved = Math.hypot(nextX - startX, nextZ - startZ);
    this.playerPos.x = nextX;
    this.playerPos.z = nextZ;
    this.playerPos.y = Math.max(-0.08, this.getGroundHeight(nextX, nextZ));
    return moved;
  }

  _syncCamera(blendAlpha, camera) {
    this.camTarget.set(
      this.playerPos.x,
      this.playerPos.y + 1.48,
      this.playerPos.z
    );

    const horizDist = Math.cos(this.camPitchRad) * this.camDist;
    const vertDist = Math.sin(this.camPitchRad) * this.camDist;

    const cx = this.camTarget.x + Math.sin(this.camYawRad) * horizDist;
    const cz = this.camTarget.z + Math.cos(this.camYawRad) * horizDist;
    const groundAtCam = this.getGroundHeight(cx, cz);
    const cy = Math.max(groundAtCam + 1.25, this.camTarget.y + vertDist);

    this.camDesiredPos.set(cx, cy, cz);

    if (camera) {
      if (blendAlpha >= 0.999) {
        camera.position.copy(this.camDesiredPos);
      } else {
        camera.position.lerp(this.camDesiredPos, blendAlpha);
      }
      if (Math.abs(camera.fov - 56.0) > 0.05) {
        camera.fov = 56.0;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(this.camTarget);
      camera.updateMatrixWorld();
    }
  }

  /**
   * Updates player arrow-key movement, character/NPC animations, moored canoe,
   * third-person camera, and POI proximity detection.
   */
  update(
    dtSec,
    elapsedSec,
    { gameState, oceanSim, camera, keysDown, inputBlocked = false, hideLabels = false }
  ) {
    if (!this.active) return null;

    const dt = Math.min(0.1, Math.max(0.001, dtSec));

    // 1. Optional Q / E keyboard camera orbit
    if (!inputBlocked && keysDown) {
      if (keysDown.has('KeyQ')) this.camYawRad += 1.45 * dt;
      if (keysDown.has('KeyE')) this.camYawRad -= 1.45 * dt;
    }

    // 2. Arrow-Key (and WASD) Camera-Relative Character Movement
    let moveRight = 0.0;
    let moveFwd = 0.0;
    if (!inputBlocked && keysDown) {
      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) moveFwd += 1.0;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) moveFwd -= 1.0;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) moveRight -= 1.0;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) moveRight += 1.0;
    }

    const inputMag = Math.hypot(moveRight, moveFwd);
    let movedDist = 0.0;

    if (inputMag > 0.01) {
      const nr = moveRight / inputMag;
      const nf = moveFwd / inputMag;

      // Camera looks along (-sin(camYawRad), -cos(camYawRad)); right is (+cos(camYawRad), -sin(camYawRad))
      const fwdX = -Math.sin(this.camYawRad);
      const fwdZ = -Math.cos(this.camYawRad);
      const rightX = Math.cos(this.camYawRad);
      const rightZ = -Math.sin(this.camYawRad);

      const worldDirX = fwdX * nf + rightX * nr;
      const worldDirZ = fwdZ * nf + rightZ * nr;

      const isSprinting = Boolean(
        keysDown && (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight'))
      );
      const speed = isSprinting
        ? this.spec.sprintSpeedMps
        : this.spec.walkSpeedMps;

      movedDist = this._tryMovePlayer(worldDirX * speed * dt, worldDirZ * speed * dt);

      // Character rig faces local -Z -> world forward is (-sin(yaw), -cos(yaw)), so yaw = atan2(-dx, -dz)
      const targetYaw = Math.atan2(-worldDirX, -worldDirZ);
      const diffDeg = wrapDeg180(((targetYaw - this.playerYawRad) * 180.0) / Math.PI);
      this.playerYawRad += ((diffDeg * Math.PI) / 180.0) * Math.min(1.0, 12.0 * dt);
    }

    const targetWalk = movedDist > 0.002 ? 1.0 : 0.0;
    this.walkAmount += (targetWalk - this.walkAmount) * Math.min(1.0, 10.5 * dt);
    if (movedDist > 0.0005) {
      this.stridePhase += movedDist * 2.55;
    }

    // 3. Update Active Difficulty Player Rig & Walking Cycle
    const activeRig = this._getOrCreatePlayerRig(gameState?.difficulty);
    if (this.activePlayerRig !== activeRig) {
      for (const r of Object.values(this.playerRigs)) {
        r.root.visible = r === activeRig;
      }
      this.activePlayerRig = activeRig;
    } else {
      activeRig.root.visible = true;
    }

    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerYawRad;
    animatePlayerCharacterAshore(activeRig, elapsedSec, {
      walkAmount: this.walkAmount,
      stridePhase: this.stridePhase,
      windStrength: 0.52,
    });

    // 4. Update Directional Sunlight Shadow Target to Track the Walking Player & Village!
    if (this.vakaRenderer?.sunLight && oceanSim?.sunState) {
      const sun = oceanSim.sunState;
      const azRad = (sun.azDeg * Math.PI) / 180.0;
      const altRad = (Math.max(12.0, sun.altDeg) * Math.PI) / 180.0;
      const cosAlt = Math.cos(altRad);
      const sx = Math.sin(azRad) * cosAlt;
      const sy = Math.sin(altRad);
      const sz = -Math.cos(azRad) * cosAlt;

      this.vakaRenderer.sunLight.target.position.set(
        this.playerPos.x,
        this.playerPos.y + 1.0,
        this.playerPos.z
      );
      this.vakaRenderer.sunLight.position.set(
        this.playerPos.x + sx * 24.0,
        this.playerPos.y + sy * 24.0,
        this.playerPos.z + sz * 24.0
      );
      this.vakaRenderer.sunLight.intensity = 1.68 * sun.daylightFactor;
      this.vakaRenderer.hemiLight.intensity = 0.42 + 0.56 * sun.daylightFactor;
    }

    // 5. Update Moored Canoe, NPCs, Torches, Kura Pennants, Peak Clouds & Lagoon Terns
    this._dockVakaAtLanding(elapsedSec, gameState);

    if (this.craftsmanRig) {
      const dToHut = Math.hypot(this.playerPos.x - -22.5, this.playerPos.z - 36.5);
      animatePlayerCharacterAshore(this.craftsmanRig, elapsedSec + 1.7, {
        walkAmount: 0.0,
        gestureWave: smoothstep(11.0, 6.2, dToHut),
      });
    }

    if (this.elderMetuaRig) {
      const dToMarae = Math.hypot(this.playerPos.x - 26.5, this.playerPos.z - 42.5);
      animatePlayerCharacterAshore(this.elderMetuaRig, elapsedSec + 0.6, {
        walkAmount: 0.0,
        holdsStaffRight: true,
        gestureWave: smoothstep(12.5, 6.8, dToMarae),
      });
    }

    for (let i = 0; i < this.variantNpcEntries.length; i += 1) {
      const npc = this.variantNpcEntries[i];
      const dNpc = Math.hypot(
        this.playerPos.x - npc.watchX,
        this.playerPos.z - npc.watchZ
      );
      animatePlayerCharacterAshore(npc.rig, elapsedSec + i * 1.1, {
        walkAmount: 0.0,
        holdsStaffRight: Boolean(npc.holdsStaffRight),
        gestureWave: smoothstep(12.0, 6.5, dNpc),
      });
    }

    for (let i = 0; i < this.torchFlames.length; i += 1) {
      const tf = this.torchFlames[i];
      const flicker = 0.9 + 0.16 * Math.sin(elapsedSec * 11.5 + tf.phase);
      tf.mesh.scale.set(flicker, 0.88 + 0.24 * flicker, flicker);
      tf.mesh.position.y = tf.baseY + (flicker - 1.0) * 0.05;
    }

    for (let i = 0; i < this.pennantMeshes.length; i += 1) {
      const pm = this.pennantMeshes[i];
      pm.mesh.rotation.z = 0.12 + Math.sin(elapsedSec * 3.4 + pm.phase) * 0.1;
      pm.mesh.rotation.y =
        Math.PI * 0.5 + Math.cos(elapsedSec * 2.6 + pm.phase) * 0.16;
    }

    for (let i = 0; i < this.lagoonTerns.length; i += 1) {
      const tb = this.lagoonTerns[i];
      const ang = elapsedSec * tb.speed + tb.phase;
      tb.group.position.set(
        tb.cx + Math.cos(ang) * tb.radius,
        tb.altY + Math.sin(ang * 2.0) * 0.65,
        tb.cz + Math.sin(ang) * tb.radius
      );
      // Tangent velocity is (-sin(ang), +cos(ang)); local -Z faces velocity
      tb.group.rotation.y = Math.atan2(Math.sin(ang), -Math.cos(ang));
      const flap = Math.sin(elapsedSec * 7.2 + tb.phase) * 0.42;
      tb.rWing.rotation.y = flap;
      tb.lWing.rotation.y = -flap;
    }

    if (oceanSim?.sunState) {
      const cloudOpts = {
        sunDir: new THREE.Vector3(0.4, 0.72, -0.55).normalize(),
        daylight: oceanSim.sunState.daylightFactor,
        twilight: oceanSim.sunState.twilightFactor,
        opacity: 0.92,
      };
      if (this.peakCloudMat) updateCloudMaterialUniforms(this.peakCloudMat, cloudOpts);
      if (this.tahaaCloudMat) updateCloudMaterialUniforms(this.tahaaCloudMat, cloudOpts);
      for (let i = 0; i < this.variantCloudMats.length; i += 1) {
        updateCloudMaterialUniforms(this.variantCloudMats[i], cloudOpts);
      }
    }

    // 6. Smooth Third-Person Camera Follow
    this._syncCamera(Math.min(1.0, 9.5 * dt), camera);

    // 7. Proximity POI Detection & Projected World Labels
    let nearestPoi = null;
    let nearestDist = Infinity;

    for (const poi of this.spec.pois) {
      const d = Math.hypot(this.playerPos.x - poi.x, this.playerPos.z - poi.z);
      const vis = this.poiVisuals[poi.id];
      const isInside = d <= poi.triggerRadiusM;

      if (vis) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsedSec * 3.2);
        vis.ringMat.opacity = isInside ? 0.78 + 0.18 * pulse : 0.34 + 0.1 * pulse;
        vis.ringMat.color.setHex(isInside ? 0x3ef0d0 : 0xf4c96b);
      }

      if (isInside && d < nearestDist) {
        nearestDist = d;
        nearestPoi = poi;
      }
    }

    this.activePoi = nearestPoi;
    this._updateProjectedPoiTags(camera, hideLabels);

    return nearestPoi;
  }

  _updateProjectedPoiTags(camera, hideLabels = false) {
    if (!camera || !this.labelLayerEl) return;
    if (hideLabels) {
      for (const el of Object.values(this.poiBadgeEls)) {
        el.classList.add('hidden');
      }
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const proj = new THREE.Vector3();

    for (const poi of this.spec.pois) {
      const el = this.poiBadgeEls[poi.id];
      if (!el) continue;

      const py = this.getGroundHeight(poi.x, poi.z) + (poi.kind === 'hut' ? 5.6 : poi.kind === 'elder' ? 3.9 : 2.9);
      proj.set(poi.x, py, poi.z);
      const distCam = proj.distanceTo(camera.position);
      proj.project(camera);

      if (proj.z > 1.0 || proj.z < -1.0 || distCam > 78.0) {
        el.classList.add('hidden');
        continue;
      }

      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-proj.y * 0.5 + 0.5) * h;
      if (sx < -60 || sx > w + 60 || sy < 40 || sy > h - 40) {
        el.classList.add('hidden');
        continue;
      }

      el.classList.remove('hidden');
      el.classList.toggle('active-poi', this.activePoi?.id === poi.id);
      el.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
    }
  }
}
