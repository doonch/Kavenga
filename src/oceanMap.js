/**
 * Interactive Top-View 3D Known Ocean Map for Kavenga: Songs of the Star Path.
 *
 * Renders all 17 procedural 3D islands (Acts I-III + secret island Rapa Nui) across a unified
 * ocean chart preserving intra-chain relative coordinates and inter-chain crossing vectors,
 * with smooth cursor-centered zooming, 1:1 drag panning, star-path route overlays, and
 * wayfinding cue inspection.
 */

import * as THREE from 'three';
import { GameConstants } from './core/gameConstants.js';
import { ISLANDS, OCEAN_BASINS } from './data/islandsData.js';
import { SONGS } from './data/songsData.js';
import {
  createSculptedCloudMesh,
  updateCloudMaterialUniforms,
} from './rendering/CloudSculptBuilder.js';
import {
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  getIslandShoreRadiusM,
} from './rendering/IslandTerrainBuilder.js';
import { decodeCompactRouteTrace } from './simulation/oceanSim.js';

// 1.0 sailing-minute unit in islandsData.js maps to 68 meters in 3D chart space
const UNIT_TO_METERS = 68.0;

// Open-ocean crossing scale factors separating the 3 regional basins along their true crossing vectors
const CROSSING_7_SCALE = 2.65;
const CROSSING_13_SCALE = 4.0;

const MIN_CAM_HEIGHT = 95.0;
const MAX_CAM_HEIGHT = 5600.0;
const TOP_VIEW_TILT_RAD = 0.0012; // Virtually vertical (0 vertical gimbal discontinuity)
const RELIEF_TILT_RAD = 0.64; // Bird's-eye oblique relief angle

const ARCHETYPE_LABELS = Object.freeze({
  high_volcanic: 'High Volcanic',
  twin_peaks: 'Twin Peaks',
  volcanic_spire: 'Volcanic Spire',
  fortress_crag: 'Fortress Crag',
  coral_atoll: 'Coral Atoll',
});

const ACT_COLORS = Object.freeze({
  1: '#f0c26b',
  2: '#42d9c8',
  3: '#9eb8ff',
  secret: '#f08c6b',
});

const LIGHT_PRESETS = Object.freeze({
  morning: {
    sunDir: new THREE.Vector3(0.68, 0.44, 0.58).normalize(),
    sunColor: 0xffd59a,
    sunIntensity: 1.95,
    hemiSky: 0x9cd2ff,
    hemiGround: 0x1b3a4b,
    hemiIntensity: 0.85,
    daylight: 0.72,
    twilight: 0.55,
    bgHex: 0x091d30,
  },
  midday: {
    sunDir: new THREE.Vector3(0.42, 0.81, 0.41).normalize(),
    sunColor: 0xfff5e4,
    sunIntensity: 2.15,
    hemiSky: 0xbde4ff,
    hemiGround: 0x1d495c,
    hemiIntensity: 0.98,
    daylight: 1.0,
    twilight: 0.0,
    bgHex: 0x08263f,
  },
  dusk: {
    sunDir: new THREE.Vector3(-0.74, 0.34, 0.58).normalize(),
    sunColor: 0xff9b63,
    sunIntensity: 1.75,
    hemiSky: 0x7c8ec4,
    hemiGround: 0x1c2638,
    hemiIntensity: 0.72,
    daylight: 0.38,
    twilight: 0.88,
    bgHex: 0x0a1628,
  },
  night: {
    sunDir: new THREE.Vector3(-0.38, 0.62, -0.68).normalize(),
    sunColor: 0x8fb8ff,
    sunIntensity: 0.88,
    hemiSky: 0x3b5884,
    hemiGround: 0x0b1624,
    hemiIntensity: 0.58,
    daylight: 0.06,
    twilight: 0.12,
    bgHex: 0x040b16,
  },
});

// ---------------------------------------------------------------------------
// Custom Full-Ocean Shader (Bathymetric Lagoon Halos, Trade Swells & Glints)
// ---------------------------------------------------------------------------
const MAP_OCEAN_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const MAP_OCEAN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform float uDaylight;
  uniform float uTwilight;
  uniform float uIslandScale;
  uniform vec3 uIslands[17];
  uniform vec4 uBasinZones[3];

  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 567.21));
    p += dot(p, p + 34.12);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 xz = vWorldPos.xz;
    vec3 viewVec = normalize(cameraPosition - vWorldPos);

    // Multi-scale Polynesian trade-wind swells & surface ripples
    vec2 swellDirA = normalize(vec2(-0.86, -0.51));
    vec2 swellDirB = normalize(vec2(-0.48, 0.88));
    float phaseA = dot(xz, swellDirA) * 0.082 - uTime * 1.15;
    float phaseB = dot(xz, swellDirB) * 0.052 - uTime * 0.78;
    float macroSwell = 0.5 + 0.5 * cos(phaseA) * 0.72 + 0.28 * cos(phaseB);

    float n1 = noise2(xz * 0.045 + vec2(-uTime * 0.22, uTime * 0.14)) - 0.5;
    float n2 = noise2(xz * 0.14 - vec2(uTime * 0.31, uTime * 0.19)) - 0.5;
    vec3 nrm = normalize(vec3(
      swellDirA.x * sin(phaseA) * 0.08 + n1 * 0.16 + n2 * 0.10,
      1.0,
      swellDirA.y * sin(phaseA) * 0.08 + n1 * 0.14 - n2 * 0.10
    ));

    // Broad regional archipelago sea-plateau tint
    float plateau = 0.0;
    for (int b = 0; b < 3; b++) {
      vec2 dBasin = (xz - uBasinZones[b].xy) / uBasinZones[b].zw;
      plateau = max(plateau, exp(-dot(dBasin, dBasin) * 0.85));
    }

    // Coastal reef shelves & outer surf rings around all 17 islands
    float shelfGlow = 0.0;
    float reefRing = 0.0;
    for (int i = 0; i < 17; i++) {
      float rOuter = uIslands[i].z * uIslandScale;
      float d = length(xz - uIslands[i].xy);
      float shoal = 1.0 - smoothstep(rOuter * 0.82, rOuter * 2.35, d);
      shelfGlow = max(shelfGlow, shoal * shoal);
      float ringBand = exp(-pow((d - rOuter * 1.04) / max(3.5, rOuter * 0.09), 2.0));
      reefRing = max(reefRing, ringBand);
    }

    // Deep abyssal cobalt -> archipelago sapphire -> shallow turquoise lagoon shelf
    vec3 nightAbyss = vec3(0.014, 0.038, 0.082);
    vec3 nightPlateau = vec3(0.024, 0.068, 0.132);
    vec3 nightShoal = vec3(0.048, 0.175, 0.235);

    vec3 dayAbyss = vec3(0.022, 0.155, 0.305);
    vec3 dayPlateau = vec3(0.032, 0.245, 0.425);
    vec3 dayShoal = vec3(0.095, 0.625, 0.665);

    vec3 colAbyss = mix(nightAbyss, dayAbyss, uDaylight);
    vec3 colPlateau = mix(nightPlateau, dayPlateau, uDaylight);
    vec3 colShoal = mix(nightShoal, dayShoal, uDaylight);

    // Dusk warm horizon tint
    colPlateau = mix(colPlateau, vec3(0.16, 0.22, 0.36), uTwilight * 0.35);

    vec3 col = mix(colAbyss, colPlateau, plateau * 0.78);
    col += vec3(0.012, 0.052, 0.075) * macroSwell * (0.25 + 0.75 * uDaylight);
    col = mix(col, colShoal, clamp(shelfGlow * 0.88, 0.0, 0.92));

    // Animated foaming outer reef surf pulse
    float surfNoise = 0.65 + 0.35 * sin(uTime * 2.2 + xz.x * 0.09 + xz.y * 0.07);
    vec3 foamCol = mix(vec3(0.32, 0.46, 0.60), vec3(0.90, 0.98, 1.0), 0.22 + 0.78 * uDaylight);
    col = mix(col, foamCol, clamp(reefRing * surfNoise * 0.42, 0.0, 0.55));

    // Subtle open-sea unit lattice (1 sailing unit = 68m; major line every 5 units = 340m)
    vec2 majorGrid = abs(fract(xz / 340.0 - 0.5) - 0.5) / fwidth(xz / 340.0);
    float majorLine = 1.0 - min(min(majorGrid.x, majorGrid.y), 1.0);
    col += vec3(0.32, 0.56, 0.68) * majorLine * 0.045;

    // Specular sun / moon shimmer
    vec3 lightDir = normalize(vec3(uSunDir.x, max(0.12, uSunDir.y), uSunDir.z));
    vec3 halfVec = normalize(lightDir + viewVec);
    float spec = pow(max(0.0, dot(nrm, halfVec)), 84.0);
    vec3 glintCol = mix(vec3(0.45, 0.62, 0.88), vec3(1.0, 0.86, 0.62), clamp(uDaylight + uTwilight * 0.7, 0.0, 1.0));
    col += glintCol * spec * (0.22 + 0.55 * max(uDaylight, uTwilight));

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Compute Unified Known Ocean Coordinates for All 17 Islands
// ---------------------------------------------------------------------------
export function buildKnownOceanLayout() {
  const c7 = SONGS.song_07?.crossingVector ?? { x: 9.09, y: 5.25 };
  const c13 = SONGS.song_13?.crossingVector ?? { x: -4.5, y: 7.79 };

  const act1Origin = { x: 0.0, y: 0.0 };
  const maupitiOcean = {
    x: act1Origin.x + ISLANDS.maupiti.pos.x,
    y: act1Origin.y + ISLANDS.maupiti.pos.y,
  };
  const act2Origin = {
    x: maupitiOcean.x + c7.x * CROSSING_7_SCALE,
    y: maupitiOcean.y + c7.y * CROSSING_7_SCALE,
  };
  const mangarevaOcean = {
    x: act2Origin.x + ISLANDS.mangareva.pos.x,
    y: act2Origin.y + ISLANDS.mangareva.pos.y,
  };
  const act3Origin = {
    x: mangarevaOcean.x + c13.x * CROSSING_13_SCALE,
    y: mangarevaOcean.y + c13.y * CROSSING_13_SCALE,
  };

  const basinOrigins = {
    act1_raiatea: act1Origin,
    act2_nuku_hiva: act2Origin,
    act3_mist_isles: act3Origin,
  };

  const entries = [];
  const byId = {};

  for (const isl of Object.values(ISLANDS)) {
    const origin = basinOrigins[isl.basinId] || act1Origin;
    const ux = origin.x + isl.pos.x;
    const uy = origin.y + isl.pos.y;
    const worldX = ux * UNIT_TO_METERS;
    const worldZ = -uy * UNIT_TO_METERS;
    const shoreRadiusM = getIslandShoreRadiusM(isl.id, isl.archetype);
    const shelfRadiusM =
      isl.id === 'rapa_nui'
        ? 148.0
        : Math.max(54.0, shoreRadiusM + 16.0);

    const entry = {
      id: isl.id,
      isl,
      oceanPos: { x: ux, y: uy },
      worldPos: new THREE.Vector3(worldX, 0.0, worldZ),
      shoreRadiusM,
      shelfRadiusM,
      colorHex: isl.isSecret ? ACT_COLORS.secret : ACT_COLORS[isl.act] || ACT_COLORS[1],
    };
    entries.push(entry);
    byId[isl.id] = entry;
  }

  const computeBounds = (list, padMeters = 320.0) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const e of list) {
      const r = e.shelfRadiusM * 1.4;
      minX = Math.min(minX, e.worldPos.x - r);
      maxX = Math.max(maxX, e.worldPos.x + r);
      minZ = Math.min(minZ, e.worldPos.z - r);
      maxZ = Math.max(maxZ, e.worldPos.z + r);
    }
    return {
      minX: minX - padMeters,
      maxX: maxX + padMeters,
      minZ: minZ - padMeters,
      maxZ: maxZ + padMeters,
      centerX: (minX + maxX) * 0.5,
      centerZ: (minZ + maxZ) * 0.5,
      spanX: maxX - minX + padMeters * 2.0,
      spanZ: maxZ - minZ + padMeters * 2.0,
    };
  };

  const regionBounds = {
    all: computeBounds(entries, 360.0),
    act1_raiatea: computeBounds(
      entries.filter((e) => e.isl.basinId === 'act1_raiatea'),
      260.0
    ),
    act2_nuku_hiva: computeBounds(
      entries.filter((e) => e.isl.basinId === 'act2_nuku_hiva' && !e.isl.isSecret),
      280.0
    ),
    act3_mist_isles: computeBounds(
      entries.filter((e) => e.isl.basinId === 'act3_mist_isles'),
      280.0
    ),
    rapa_nui: computeBounds(
      entries.filter((e) => e.id === 'rapa_nui'),
      260.0
    ),
  };

  return { entries, byId, basinOrigins, regionBounds };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses a `?pts=...` voyage debug query string and projects each local simulation
 * sample `(sx, sy)` onto the unified Known Ocean Map world coordinates `(worldX, 0, worldZ)`.
 */
export function parsePlayerTraceFromSearch(searchString, layout) {
  if (!searchString) return null;
  const qs = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  if (!qs) return null;
  const params = new URLSearchParams(qs);
  const rawPts = params.get('pts');
  if (!rawPts) return null;

  const simPoints = decodeCompactRouteTrace(rawPts);
  if (simPoints.length === 0) return null;

  const songId = params.get('song') || '';
  const songDef = SONGS[songId] || null;
  const fromId = params.get('from') || songDef?.fromIsland || '';
  const toId = params.get('to') || songDef?.toIsland || '';
  const basinParam = params.get('basin') || '';
  const landedId = params.get('landed') || '';
  const reason = params.get('reason') || '';
  const outcome =
    params.get('outcome') === 'landfall' ? 'landfall' : 'lost_at_sea';

  let originX = 0.0;
  let originY = 0.0;
  let unitScale = 1.0;

  if (
    (songId === 'song_07' || (fromId === 'maupiti' && toId === 'nuku_hiva')) &&
    layout.byId.maupiti
  ) {
    originX = layout.byId.maupiti.oceanPos.x;
    originY = layout.byId.maupiti.oceanPos.y;
    unitScale = CROSSING_7_SCALE;
  } else if (
    (songId === 'song_13' || (fromId === 'mangareva' && toId === 'kauai')) &&
    layout.byId.mangareva
  ) {
    originX = layout.byId.mangareva.oceanPos.x;
    originY = layout.byId.mangareva.oceanPos.y;
    unitScale = CROSSING_13_SCALE;
  } else {
    const resolvedBasinId =
      layout.byId[fromId]?.isl?.basinId ||
      (basinParam && layout.basinOrigins[basinParam] ? basinParam : null) ||
      layout.byId[toId]?.isl?.basinId ||
      'act1_raiatea';
    const origin =
      layout.basinOrigins[resolvedBasinId] || layout.basinOrigins.act1_raiatea;
    originX = origin.x;
    originY = origin.y;
    unitScale = 1.0;
  }

  const worldPoints = simPoints.map((pt) => {
    const ux = originX + pt.x * unitScale;
    const uy = originY + pt.y * unitScale;
    return new THREE.Vector3(ux * UNIT_TO_METERS, 0.0, -uy * UNIT_TO_METERS);
  });
  if (worldPoints.length === 1) {
    worldPoints.push(
      new THREE.Vector3(worldPoints[0].x + 2.0, 0.0, worldPoints[0].z)
    );
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const expand = (wx, wz, r = 40.0) => {
    minX = Math.min(minX, wx - r);
    maxX = Math.max(maxX, wx + r);
    minZ = Math.min(minZ, wz - r);
    maxZ = Math.max(maxZ, wz + r);
  };

  for (const wp of worldPoints) {
    expand(wp.x, wp.z, 45.0);
  }
  for (const refId of [fromId, toId, landedId]) {
    const entry = refId ? layout.byId[refId] : null;
    if (entry) {
      expand(entry.worldPos.x, entry.worldPos.z, entry.shelfRadiusM * 1.5);
    }
  }

  const padMeters = 240.0;
  const bounds = {
    minX: minX - padMeters,
    maxX: maxX + padMeters,
    minZ: minZ - padMeters,
    maxZ: maxZ + padMeters,
    centerX: (minX + maxX) * 0.5,
    centerZ: (minZ + maxZ) * 0.5,
    spanX: Math.max(340.0, maxX - minX + padMeters * 2.0),
    spanZ: Math.max(340.0, maxZ - minZ + padMeters * 2.0),
  };

  let sailedUnits = 0.0;
  for (let i = 1; i < simPoints.length; i++) {
    sailedUnits += Math.hypot(
      simPoints[i].x - simPoints[i - 1].x,
      simPoints[i].y - simPoints[i - 1].y
    );
  }

  return {
    outcome,
    songId,
    songDef,
    fromId,
    toId,
    landedId,
    reason,
    simPoints,
    worldPoints,
    sailedUnits,
    bounds,
  };
}

function buildHorizontalRibbonGeometry(worldPoints, halfWidth, yHeight) {
  const clean = [];
  for (const p of worldPoints) {
    const prev = clean[clean.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.z - prev.z) > 0.08) {
      clean.push(p);
    }
  }
  if (clean.length < 2 && worldPoints.length > 0) {
    clean.push(
      worldPoints[0],
      new THREE.Vector3(worldPoints[0].x + 1.5, 0.0, worldPoints[0].z)
    );
  }

  const positions = [];
  const pushTri = (ax, az, bx, bz, cx, cz) => {
    positions.push(ax, yHeight, az, bx, yHeight, bz, cx, yHeight, cz);
  };

  for (let i = 0; i < clean.length - 1; i++) {
    const a = clean[i];
    const b = clean[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-5) continue;
    const nx = (-dz / len) * halfWidth;
    const nz = (dx / len) * halfWidth;

    const aLx = a.x + nx;
    const aLz = a.z + nz;
    const aRx = a.x - nx;
    const aRz = a.z - nz;
    const bLx = b.x + nx;
    const bLz = b.z + nz;
    const bRx = b.x - nx;
    const bRz = b.z - nz;

    pushTri(aLx, aLz, aRx, aRz, bRx, bRz);
    pushTri(aLx, aLz, bRx, bRz, bLx, bLz);
  }

  // Round join & end caps so sharp turns have zero miter spikes
  const capSegs = 10;
  for (const pt of clean) {
    for (let s = 0; s < capSegs; s++) {
      const a0 = (s / capSegs) * Math.PI * 2.0;
      const a1 = ((s + 1) / capSegs) * Math.PI * 2.0;
      pushTri(
        pt.x,
        pt.z,
        pt.x + Math.cos(a0) * halfWidth,
        pt.z + Math.sin(a0) * halfWidth,
        pt.x + Math.cos(a1) * halfWidth,
        pt.z + Math.sin(a1) * halfWidth
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// Main Known Ocean Map Controller
// ---------------------------------------------------------------------------
class KnownOceanMapApp {
  constructor() {
    this.layoutEl = document.getElementById('map-layout');
    this.viewportEl = document.getElementById('map-viewport');
    this.labelsLayerEl = document.getElementById('map-labels');
    this.islandListEl = document.getElementById('island-list');
    this.searchEl = document.getElementById('island-search');
    this.inspectorEl = document.getElementById('inspector-card');
    this.zoomSliderEl = document.getElementById('zoom-slider');
    this.scaleSliderEl = document.getElementById('scale-slider');
    this.scaleValEl = document.getElementById('scale-val');
    this.scaleBarGraphicEl = document.getElementById('scale-bar-graphic');
    this.scaleBarTextEl = document.getElementById('scale-bar-text');

    this.layout = buildKnownOceanLayout();
    this.playerTrace = parsePlayerTraceFromSearch(
      window.location.search,
      this.layout
    );
    this.islandScale = 1.4;
    this.lightKey = 'midday';
    this.activeRegion = this.playerTrace ? 'trace' : 'all';
    this.selectedIslandId = null;
    this.hoveredIslandId = null;

    this.showLabels = true;
    this.showRoutes = true;
    this.showClouds = false;
    this.showRings = Boolean(this.playerTrace);
    this.showPlayerTrace = Boolean(this.playerTrace);
    this.cloudsBuilt = false;

    // Camera state (pan target on y=0 ocean plane + altitude height + tilt)
    const allB = this.layout.regionBounds.all;
    this.panX = allB.centerX;
    this.panZ = allB.centerZ;
    this.goalPanX = allB.centerX;
    this.goalPanZ = allB.centerZ;
    this.velPanX = 0.0;
    this.velPanZ = 0.0;

    this.camHeight = 3600.0;
    this.goalHeight = 3600.0;
    this.tiltRad = TOP_VIEW_TILT_RAD;
    this.goalTiltRad = TOP_VIEW_TILT_RAD;

    // Input state
    this.activePointers = new Map();
    this.isDragging = false;
    this.dragMoved = false;
    this.dragStartClient = { x: 0, y: 0 };
    this.dragAnchorWorld = new THREE.Vector3();
    this.lastPinchDist = null;
    this.keysDown = new Set();

    this.raycaster = new THREE.Raycaster();
    this.oceanPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._tmpVec3 = new THREE.Vector3();
    this._projVec3 = new THREE.Vector3();

    this.islandNodes = new Map();
    this.pickMeshes = [];
    this.labelEls = new Map();
    this.bannerEls = [];
    this.cloudEntries = [];

    this._initThree();
    this._buildOceanSurface();
    this._buildAllIslands();
    this._buildSelectionAndCueRings();
    this._buildStarPathRoutes();
    this._buildPlayerRouteTrace();
    this._buildHtmlLabels();
    this._renderSidebarList('');
    this._renderInspector();
    this._bindEvents();

    if (this.playerTrace) {
      this.fitPlayerTrace(true);
    } else {
      this.fitRegion('all', true);
    }
    this.lastTimeMs = performance.now();
    this.elapsedSec = 0.0;
    requestAnimationFrame((t) => this._animate(t));
  }

  _initThree() {
    this.scene = new THREE.Scene();
    const preset = LIGHT_PRESETS[this.lightKey];
    this.scene.background = new THREE.Color(preset.bgHex);

    const w = Math.max(1, this.viewportEl.clientWidth);
    const h = Math.max(1, this.viewportEl.clientHeight);
    this.camera = new THREE.PerspectiveCamera(42.0, w / h, 20.0, 16000.0);
    this.camera.up.set(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.viewportEl.appendChild(this.renderer.domElement);

    // Directional Sun + Sky/Lagoon Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(
      preset.hemiSky,
      preset.hemiGround,
      preset.hemiIntensity
    );
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(
      preset.sunColor,
      preset.sunIntensity
    );
    this.sunLight.position.copy(preset.sunDir).multiplyScalar(3000.0);
    this.scene.add(this.sunLight);
  }

  _buildOceanSurface() {
    const preset = LIGHT_PRESETS[this.lightKey];
    const islandVecs = this.layout.entries.map(
      (e) => new THREE.Vector3(e.worldPos.x, e.worldPos.z, e.shelfRadiusM)
    );
    while (islandVecs.length < 17) {
      islandVecs.push(new THREE.Vector3(99999.0, 99999.0, 1.0));
    }

    const b1 = this.layout.regionBounds.act1_raiatea;
    const b2 = this.layout.regionBounds.act2_nuku_hiva;
    const b3 = this.layout.regionBounds.act3_mist_isles;
    const basinZones = [
      new THREE.Vector4(b1.centerX, b1.centerZ, b1.spanX * 0.52, b1.spanZ * 0.52),
      new THREE.Vector4(b2.centerX, b2.centerZ, b2.spanX * 0.55, b2.spanZ * 0.55),
      new THREE.Vector4(b3.centerX, b3.centerZ, b3.spanX * 0.55, b3.spanZ * 0.55),
    ];

    this.oceanUniforms = {
      uTime: { value: 0.0 },
      uSunDir: { value: preset.sunDir.clone() },
      uDaylight: { value: preset.daylight },
      uTwilight: { value: preset.twilight },
      uIslandScale: { value: this.islandScale },
      uIslands: { value: islandVecs },
      uBasinZones: { value: basinZones },
    };

    const allB = this.layout.regionBounds.all;
    const geo = new THREE.PlaneGeometry(32000.0, 32000.0, 1, 1);
    geo.rotateX(-Math.PI * 0.5);
    const mat = new THREE.ShaderMaterial({
      vertexShader: MAP_OCEAN_VERT,
      fragmentShader: MAP_OCEAN_FRAG,
      uniforms: this.oceanUniforms,
      extensions: { derivatives: true },
    });
    this.oceanMesh = new THREE.Mesh(geo, mat);
    this.oceanMesh.position.set(allB.centerX, 0.0, allB.centerZ);
    this.oceanMesh.renderOrder = -5;
    this.scene.add(this.oceanMesh);
  }

  _buildAllIslands() {
    this.islandsGroup = new THREE.Group();
    this.scene.add(this.islandsGroup);

    const pickGeo = new THREE.CylinderGeometry(1.0, 1.0, 26.0, 20);
    const pickMat = new THREE.MeshBasicMaterial({ visible: false });

    for (const entry of this.layout.entries) {
      const holder = new THREE.Group();
      holder.position.copy(entry.worldPos);
      holder.scale.setScalar(this.islandScale);

      const assembly = createDetailedIslandAssembly(entry.id);
      // Optimize solid terrain & architectural props for opaque depth-buffered map rendering
      for (const mat of assembly.materials) {
        const baseOp = mat.userData?.baseOpacity;
        if (baseOp !== undefined && baseOp < 0.999) {
          mat.transparent = true;
          mat.opacity = baseOp;
          mat.depthWrite = false;
        } else {
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.depthWrite = true;
        }
        mat.needsUpdate = true;
      }

      assembly.group.rotation.y =
        entry.id === 'rapa_nui' ? 0.0 : getIslandApproachOrientationRad(entry.id);
      holder.add(assembly.group);

      // Invisible pick proxy covering the full lagoon & peak footprint for effortless clicking
      const pickMesh = new THREE.Mesh(pickGeo, pickMat);
      pickMesh.scale.set(entry.shelfRadiusM, 1.0, entry.shelfRadiusM);
      pickMesh.position.y = 12.0;
      pickMesh.userData.islandId = entry.id;
      holder.add(pickMesh);
      this.pickMeshes.push(pickMesh);

      this.islandsGroup.add(holder);
      this.islandNodes.set(entry.id, { entry, holder, assembly });
    }
  }

  _ensureCloudsBuilt() {
    if (this.cloudsBuilt) return;
    this.cloudsBuilt = true;

    for (const entry of this.layout.entries) {
      const node = this.islandNodes.get(entry.id);
      if (!node) continue;

      if (entry.isl.hasPeakCloud) {
        const peak = createSculptedCloudMesh('peak', { opacity: 0.92 });
        peak.mesh.position.y = entry.id === 'rapa_nui' ? 62.0 : 72.0;
        peak.mesh.scale.setScalar(entry.id === 'rapa_nui' ? 1.25 : 0.92);
        peak.mesh.visible = this.showClouds;
        node.holder.add(peak.mesh);
        this.cloudEntries.push({
          mesh: peak.mesh,
          material: peak.material,
          lapaGlow: 0.0,
          opacity: 0.92,
        });
      }

      if (entry.isl.hasLapaGlow) {
        const lapa = createSculptedCloudMesh('lapa', {
          isLapa: true,
          opacity: 0.86,
        });
        lapa.mesh.position.y = 8.0;
        lapa.mesh.scale.setScalar(0.9);
        lapa.mesh.visible = this.showClouds;
        node.holder.add(lapa.mesh);
        this.cloudEntries.push({
          mesh: lapa.mesh,
          material: lapa.material,
          lapaGlow: 1.0,
          opacity: 0.86,
        });
      }
    }
  }

  _buildSelectionAndCueRings() {
    this.ringsGroup = new THREE.Group();
    this.scene.add(this.ringsGroup);

    const makeRing = (colorHex, opacity, thickness = 0.028) => {
      const geo = new THREE.RingGeometry(1.0 - thickness, 1.0 + thickness, 96);
      geo.rotateX(-Math.PI * 0.5);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.55;
      mesh.visible = false;
      this.ringsGroup.add(mesh);
      return mesh;
    };

    // Subtle selection halo around currently selected/hovered island
    this.selectionHalo = makeRing(0x42d9c8, 0.85, 0.036);
    this.hoverHalo = makeRing(0xe6b872, 0.55, 0.026);

    // Concentric Island Detection Rings (1: Seabirds, 2: Peak/Lapa Cloud, 3: Swell Zone, 4: Landfall)
    this.cueRings = [
      { mesh: makeRing(0x9cd2ff, 0.34, 0.012), ratio: GameConstants.RING_1_BIOLOGICAL_RATIO },
      { mesh: makeRing(0xe6b872, 0.42, 0.014), ratio: GameConstants.RING_2_CLOUD_RATIO },
      { mesh: makeRing(0x42d9c8, 0.5, 0.017), ratio: GameConstants.RING_3_SWELL_DRIFT_RATIO },
      { mesh: makeRing(0xf08c6b, 0.62, 0.022), ratio: GameConstants.RING_4_LANDFALL_RATIO, isRing4: true },
    ];
  }

  _buildStarPathRoutes() {
    if (this.routesGroup) {
      this.scene.remove(this.routesGroup);
      this.routesGroup.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }

    this.routesGroup = new THREE.Group();
    this.routesGroup.visible = this.showRoutes;
    this.scene.add(this.routesGroup);
    this.routeObjects = [];

    const chevronGeo = new THREE.ConeGeometry(5.5, 15.0, 3);
    chevronGeo.rotateX(Math.PI * 0.5);
    chevronGeo.scale(1.0, 0.28, 1.0);

    for (const song of Object.values(SONGS)) {
      const fromEntry = this.layout.byId[song.fromIsland];
      const toEntry = this.layout.byId[song.toIsland];
      if (!fromEntry || !toEntry) continue;

      const p0 = fromEntry.worldPos.clone();
      const p2 = toEntry.worldPos.clone();
      const dir = p2.clone().sub(p0);
      const totalDist = dir.length();
      if (totalDist < 1.0) continue;
      dir.normalize();

      const startPad = fromEntry.shelfRadiusM * this.islandScale + 14.0;
      const endPad = toEntry.shelfRadiusM * this.islandScale + 16.0;
      const usable = Math.max(20.0, totalDist - startPad - endPad);
      const a = p0.clone().addScaledVector(dir, Math.min(startPad, totalDist * 0.35));
      const b = p2.clone().addScaledVector(dir, -Math.min(endPad, totalDist * 0.35));

      // Gentle lateral arc (separates outbound Song 14 and return Song 14R cleanly)
      const perp = new THREE.Vector3(-dir.z, 0.0, dir.x);
      const curveSign = song.id === 'song_14r' ? -1.0 : 1.0;
      const archMag =
        song.id === 'song_14' || song.id === 'song_14r'
          ? usable * 0.14
          : song.isInterBasinCrossing
            ? usable * 0.08
            : usable * 0.055;

      const mid = a
        .clone()
        .add(b)
        .multiplyScalar(0.5)
        .addScaledVector(perp, archMag * curveSign);
      a.y = 0.52;
      mid.y = 0.52;
      b.y = 0.52;

      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(44);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);

      const actColorHex =
        song.act === 3 ? 0x9eb8ff : song.act === 2 ? 0x42d9c8 : 0xf0c26b;

      const lineMat = new THREE.LineDashedMaterial({
        color: actColorHex,
        dashSize: song.isInterBasinCrossing ? 26.0 : 16.0,
        gapSize: song.isInterBasinCrossing ? 14.0 : 10.0,
        transparent: true,
        opacity: song.isInterBasinCrossing ? 0.68 : 0.52,
        depthWrite: false,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      line.renderOrder = 2;
      this.routesGroup.add(line);

      // Mid-route directional prow chevron
      const chevMat = new THREE.MeshBasicMaterial({
        color: actColorHex,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      });
      const chevPt = curve.getPoint(0.54);
      const chevTan = curve.getTangent(0.54);
      const chev = new THREE.Mesh(chevronGeo.clone(), chevMat);
      chev.position.copy(chevPt);
      chev.position.y = 0.72;
      chev.lookAt(chevPt.clone().add(chevTan));
      chev.renderOrder = 3;
      this.routesGroup.add(chev);

      this.routeObjects.push({
        song,
        line,
        lineMat,
        chev,
        chevMat,
        baseOpacity: song.isInterBasinCrossing ? 0.68 : 0.52,
      });
    }
  }

  _buildPlayerRouteTrace() {
    if (this.playerTraceGroup) {
      this.scene.remove(this.playerTraceGroup);
      this.playerTraceGroup.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      this.playerTraceGroup = null;
    }

    if (!this.playerTrace) return;

    const pts = this.playerTrace.worldPoints;
    this.playerTraceGroup = new THREE.Group();
    this.playerTraceGroup.visible = this.showPlayerTrace;
    this.scene.add(this.playerTraceGroup);

    // 1. Dark-crimson outer halo ribbon + bold red inner ribbon (visible at close/medium zoom)
    const casingGeo = buildHorizontalRibbonGeometry(pts, 6.2, 1.52);
    const casingMat = new THREE.MeshBasicMaterial({
      color: 0x520404,
      transparent: true,
      opacity: 0.56,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const casingMesh = new THREE.Mesh(casingGeo, casingMat);
    casingMesh.renderOrder = 10;
    this.playerTraceGroup.add(casingMesh);

    const ribbonGeo = buildHorizontalRibbonGeometry(pts, 3.2, 1.62);
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: 0xff2b2b,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbonMesh.renderOrder = 11;
    this.playerTraceGroup.add(ribbonMesh);

    // 2. Crisp 1px red centerline so the route stays unbroken even at max zoom-out (5600m)
    const linePts = pts.map((p) => new THREE.Vector3(p.x, 1.72, p.z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xff5959,
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      depthWrite: false,
    });
    const coreLine = new THREE.Line(lineGeo, lineMat);
    coreLine.renderOrder = 12;
    this.playerTraceGroup.add(coreLine);

    // 3. Directional red chevrons along the actual sailed trajectory
    const chevGeo = new THREE.ConeGeometry(6.8, 17.5, 3);
    chevGeo.rotateX(Math.PI * 0.5);
    chevGeo.scale(1.0, 0.28, 1.0);
    const chevMat = new THREE.MeshBasicMaterial({
      color: 0xff4a4a,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
    });

    let totalLen = 0.0;
    const segLens = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      segLens.push(d);
      totalLen += d;
    }
    if (totalLen > 95.0) {
      const spacing = Math.max(220.0, totalLen / 8.0);
      let nextMark = Math.min(spacing * 0.55, totalLen * 0.5);
      let accum = 0.0;
      for (let i = 0; i < segLens.length; i++) {
        const segLen = segLens[i];
        while (
          segLen > 1e-4 &&
          accum + segLen >= nextMark &&
          nextMark <= totalLen - 38.0
        ) {
          const u = (nextMark - accum) / segLen;
          const cx = pts[i].x + (pts[i + 1].x - pts[i].x) * u;
          const cz = pts[i].z + (pts[i + 1].z - pts[i].z) * u;
          const tx = (pts[i + 1].x - pts[i].x) / segLen;
          const tz = (pts[i + 1].z - pts[i].z) / segLen;
          const chev = new THREE.Mesh(chevGeo, chevMat);
          chev.position.set(cx, 1.8, cz);
          chev.lookAt(cx + tx * 10.0, 1.8, cz + tz * 10.0);
          chev.renderOrder = 13;
          this.playerTraceGroup.add(chev);
          nextMark += spacing;
        }
        accum += segLen;
      }
    }

    // 4. Departure origin ring + Outcome end marker (Landfall bullseye vs Lost-at-Sea X)
    const startPt = pts[0];
    const endPt = pts[pts.length - 1];

    const startRingGeo = new THREE.RingGeometry(7.0, 12.0, 36);
    startRingGeo.rotateX(-Math.PI * 0.5);
    const startRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd2d2,
      transparent: true,
      opacity: 0.94,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const startRing = new THREE.Mesh(startRingGeo, startRingMat);
    startRing.position.set(startPt.x, 1.82, startPt.z);
    startRing.renderOrder = 14;
    this.playerTraceGroup.add(startRing);

    const endOuterGeo = new THREE.RingGeometry(12.5, 18.5, 44);
    endOuterGeo.rotateX(-Math.PI * 0.5);
    const endOuterMat = new THREE.MeshBasicMaterial({
      color: 0xff2b2b,
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const endOuter = new THREE.Mesh(endOuterGeo, endOuterMat);
    endOuter.position.set(endPt.x, 1.85, endPt.z);
    endOuter.renderOrder = 14;
    this.playerTraceGroup.add(endOuter);

    if (this.playerTrace.outcome === 'lost_at_sea') {
      const armGeo = new THREE.PlaneGeometry(28.0, 5.2);
      armGeo.rotateX(-Math.PI * 0.5);
      const armMat = new THREE.MeshBasicMaterial({
        color: 0xff3b3b,
        transparent: true,
        opacity: 0.98,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const armA = new THREE.Mesh(armGeo, armMat);
      armA.position.set(endPt.x, 1.9, endPt.z);
      armA.rotation.y = Math.PI * 0.25;
      armA.renderOrder = 15;
      const armB = new THREE.Mesh(armGeo, armMat);
      armB.position.set(endPt.x, 1.9, endPt.z);
      armB.rotation.y = -Math.PI * 0.25;
      armB.renderOrder = 15;
      this.playerTraceGroup.add(armA, armB);
    } else {
      const endDotGeo = new THREE.CircleGeometry(7.5, 32);
      endDotGeo.rotateX(-Math.PI * 0.5);
      const endDotMat = new THREE.MeshBasicMaterial({
        color: 0xffe49c,
        transparent: true,
        opacity: 0.98,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const endDot = new THREE.Mesh(endDotGeo, endDotMat);
      endDot.position.set(endPt.x, 1.9, endPt.z);
      endDot.renderOrder = 15;
      this.playerTraceGroup.add(endDot);
    }
  }

  _buildHtmlLabels() {
    this.labelsLayerEl.innerHTML = '';
    this.labelEls.clear();
    this.bannerEls = [];

    // Regional Chain Banners floating above each archipelago
    const bannerDefs = [
      {
        title: "Act I · The Ra'iatea Lagoon Chain",
        bounds: this.layout.regionBounds.act1_raiatea,
        offsetZ: -115.0,
      },
      {
        title: 'Act II · The Nuku Hiva Windward Chain',
        bounds: this.layout.regionBounds.act2_nuku_hiva,
        offsetZ: -120.0,
      },
      {
        title: "Act III · The Hawai'i Mist Chain",
        bounds: this.layout.regionBounds.act3_mist_isles,
        offsetZ: -115.0,
      },
    ];

    for (const bd of bannerDefs) {
      const el = document.createElement('div');
      el.className = 'chain-banner';
      el.textContent = bd.title;
      this.labelsLayerEl.appendChild(el);
      this.bannerEls.push({
        el,
        worldPos: new THREE.Vector3(bd.bounds.centerX, 0.0, bd.bounds.minZ + bd.offsetZ),
      });
    }

    // Crisp Interactive Island Nameplates
    for (const entry of this.layout.entries) {
      const wrap = document.createElement('div');
      wrap.className = `map-label${entry.isl.isSecret ? ' secret' : ''}`;
      wrap.innerHTML = `
        <div class="map-label-sub">${entry.isl.subtitle}</div>
        <div class="map-label-pill">
          <span class="map-label-dot" style="background:${entry.colorHex}"></span>
          <span>${entry.isl.name}</span>
        </div>
        <div class="map-label-stem"></div>
      `;
      wrap.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.selectIsland(entry.id, { panTo: true });
      });
      wrap.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        this.selectIsland(entry.id, { zoomClose: true });
      });
      wrap.addEventListener('pointerenter', () => {
        this.hoveredIslandId = entry.id;
      });
      wrap.addEventListener('pointerleave', () => {
        if (this.hoveredIslandId === entry.id) {
          this.hoveredIslandId = null;
        }
      });

      this.labelsLayerEl.appendChild(wrap);
      this.labelEls.set(entry.id, wrap);
    }
  }

  // -------------------------------------------------------------------------
  // Sidebar Island List & Selected Island Inspector
  // -------------------------------------------------------------------------
  _renderSidebarList(query) {
    const q = query.trim().toLowerCase();
    this.islandListEl.innerHTML = '';

    const groups = [
      {
        label: "Act I · Ra'iatea Chain",
        color: ACT_COLORS[1],
        items: this.layout.entries.filter((e) => e.isl.basinId === 'act1_raiatea'),
      },
      {
        label: 'Act II · Nuku Hiva Chain',
        color: ACT_COLORS[2],
        items: this.layout.entries.filter(
          (e) => e.isl.basinId === 'act2_nuku_hiva' && !e.isl.isSecret
        ),
      },
      {
        label: "Act III · Hawai'i Chain",
        color: ACT_COLORS[3],
        items: this.layout.entries.filter((e) => e.isl.basinId === 'act3_mist_isles'),
      },
      {
        label: 'Uncharted Outer Ocean',
        color: ACT_COLORS.secret,
        items: this.layout.entries.filter((e) => e.isl.isSecret),
      },
    ];

    for (const grp of groups) {
      const matched = grp.items.filter((e) => {
        if (!q) return true;
        const hay = `${e.isl.name} ${e.isl.subtitle} ${e.isl.mentorName || ''} ${ARCHETYPE_LABELS[e.isl.archetype] || ''}`.toLowerCase();
        return hay.includes(q);
      });
      if (!matched.length) continue;

      const heading = document.createElement('div');
      heading.className = 'chain-heading';
      heading.innerHTML = `<span><span class="chain-dot" style="background:${grp.color}"></span>${grp.label}</span><span>${matched.length}</span>`;
      this.islandListEl.appendChild(heading);

      for (const e of matched) {
        const btn = document.createElement('button');
        btn.className = `island-btn${this.selectedIslandId === e.id ? ' active' : ''}`;
        btn.dataset.islandId = e.id;
        const shortTag = e.isl.isSecret
          ? 'Secret'
          : ARCHETYPE_LABELS[e.isl.archetype] || 'Island';
        btn.innerHTML = `
          <div class="island-btn-main">
            <span class="island-btn-name">${e.isl.name}</span>
            <span class="island-btn-sub">${e.isl.subtitle}</span>
          </div>
          <span class="island-tag${e.isl.isSecret ? ' secret' : ''}">${shortTag}</span>
        `;
        btn.addEventListener('click', () => {
          this.selectIsland(e.id, { zoomClose: true });
        });
        btn.addEventListener('pointerenter', () => {
          this.hoveredIslandId = e.id;
        });
        btn.addEventListener('pointerleave', () => {
          if (this.hoveredIslandId === e.id) this.hoveredIslandId = null;
        });
        this.islandListEl.appendChild(btn);
      }
    }
  }

  _syncSidebarSelection() {
    const buttons = this.islandListEl.querySelectorAll('.island-btn');
    for (const btn of buttons) {
      btn.classList.toggle(
        'active',
        btn.dataset.islandId === this.selectedIslandId
      );
    }
  }

  _renderInspector() {
    if (!this.selectedIslandId || !this.layout.byId[this.selectedIslandId]) {
      if (this.playerTrace) {
        const pt = this.playerTrace;
        const fromName =
          ISLANDS[pt.fromId]?.name || escapeHtml(pt.fromId) || 'Departure Isle';
        const toName =
          ISLANDS[pt.toId]?.name || escapeHtml(pt.toId) || 'Target Isle';
        const landedName = pt.landedId
          ? ISLANDS[pt.landedId]?.name || escapeHtml(pt.landedId)
          : '';
        const songLabel = pt.songDef
          ? `Song ${escapeHtml(pt.songDef.number)} · ${escapeHtml(pt.songDef.title)}`
          : `${fromName} → ${toName}`;
        const reasonLabel =
          pt.reason === 'rations_depleted'
            ? 'Rations Depleted'
            : pt.reason === 'mercy_divergence'
              ? 'Drifted Wide of Isles'
              : pt.reason
                ? escapeHtml(pt.reason)
                : 'Off Course';
        const outcomeBadge =
          pt.outcome === 'landfall'
            ? `<span class="cue-badge highlight">Landfall${landedName ? ` · ${landedName}` : ''}</span>`
            : `<span class="cue-badge trace-red">Lost at Sea · ${reasonLabel}</span>`;

        const jumpChips = [];
        if (pt.fromId && this.layout.byId[pt.fromId]) {
          jumpChips.push(
            `<button class="route-chip" data-jump="${escapeHtml(pt.fromId)}">From: ${fromName}</button>`
          );
        }
        if (pt.toId && this.layout.byId[pt.toId]) {
          jumpChips.push(
            `<button class="route-chip" data-jump="${escapeHtml(pt.toId)}">Target: ${toName}</button>`
          );
        }
        if (
          pt.landedId &&
          pt.landedId !== pt.toId &&
          this.layout.byId[pt.landedId]
        ) {
          jumpChips.push(
            `<button class="route-chip" data-jump="${escapeHtml(pt.landedId)}">Arrived: ${landedName}</button>`
          );
        }

        this.inspectorEl.innerHTML = `
          <div class="inspector-header">
            <div>
              <div class="inspector-title">Voyage Route Trace</div>
              <div class="inspector-sub">${songLabel}</div>
            </div>
            <div style="display:flex;gap:4px;">
              <button id="btn-focus-trace" class="icon-btn" title="Frame Sailed Route">Focus Route</button>
            </div>
          </div>
          <div class="badge-row">
            ${outcomeBadge}
            <span class="cue-badge trace-red">Red Line · ${pt.sailedUnits.toFixed(1)} Units</span>
          </div>
          <div class="inspector-meta">
            Red line marks the actual path sailed from <strong>${fromName}</strong> toward <strong>${toName}</strong>. Concentric cue rings show target island detection screens.
          </div>
          ${
            jumpChips.length
              ? `<div class="inspector-routes"><div class="route-chip-wrap">${jumpChips.join('')}</div></div>`
              : ''
          }
        `;

        const focusTraceBtn = document.getElementById('btn-focus-trace');
        if (focusTraceBtn) {
          focusTraceBtn.addEventListener('click', () => {
            this.fitPlayerTrace(false);
          });
        }
        for (const chip of this.inspectorEl.querySelectorAll('.route-chip')) {
          chip.addEventListener('click', () => {
            this.selectIsland(chip.dataset.jump, { zoomClose: true });
          });
        }
        return;
      }

      this.inspectorEl.innerHTML = `
        <div class="inspector-header">
          <div>
            <div class="inspector-title">The Known Ocean</div>
            <div class="inspector-sub">3 Regional Island Chains · 17 Sculpted Islands</div>
          </div>
        </div>
        <div class="badge-row">
          <span class="cue-badge highlight">16 Campaign Isles</span>
          <span class="cue-badge">1 Secret Isle</span>
          <span class="cue-badge">17 Star-Path Chants</span>
        </div>
        <div class="inspector-meta">
          Pan and zoom freely across the Polynesian chains, or click any island to inspect its terrain, lagoon reefs, wayfinding cues, and connected star-path voyages.
        </div>
      `;
      return;
    }

    const entry = this.layout.byId[this.selectedIslandId];
    const isl = entry.isl;
    const basin = OCEAN_BASINS[isl.basinId];
    const skyRealm =
      isl.act === 3 ? 'Steadfast Peg Sky' : 'Sea Turtle Sky';

    const cueBadges = [
      `<span class="cue-badge highlight">${ARCHETYPE_LABELS[isl.archetype] || isl.archetype}</span>`,
      `<span class="cue-badge">Peak ${Math.round(isl.peakHeightM)}m</span>`,
      `<span class="cue-badge">${skyRealm}</span>`,
    ];
    if (isl.hasPeakCloud) {
      cueBadges.push('<span class="cue-badge">Peak Cloud</span>');
    }
    if (isl.hasLapaGlow) {
      cueBadges.push('<span class="cue-badge highlight">Lapa Lagoon Glow</span>');
    }
    if (isl.hasSteepCliffs) {
      cueBadges.push('<span class="cue-badge">Cliff Wave Bounce</span>');
    }
    if (isl.peaksPierceFog) {
      cueBadges.push('<span class="cue-badge">Pierces Sea Mist</span>');
    }
    cueBadges.push(
      `<span class="cue-badge">${isl.birdSpecies === 'red_kura' ? 'Red Kura Birds' : isl.birdSpecies === 'brown_booby' ? 'Brown Boobies' : 'White Terns'}</span>`
    );

    const mentorLine = isl.inhabited && isl.mentorName
      ? `<strong>Elder / Mentor:</strong> ${isl.mentorName} (${isl.mentorRole})`
      : isl.isSecret
        ? '<strong>Status:</strong> Uncharted ancestral monument isle beyond the song-lines'
        : '<strong>Status:</strong> Uninhabited wild seabird rookery &amp; coral lagoon';

    const outgoing = Object.values(SONGS).filter((s) => s.fromIsland === isl.id);
    const incoming = Object.values(SONGS).filter((s) => s.toIsland === isl.id);

    let routesHtml = '';
    if (outgoing.length || incoming.length) {
      const chips = [];
      for (const s of outgoing) {
        const dest = ISLANDS[s.toIsland];
        chips.push(
          `<button class="route-chip" data-jump="${s.toIsland}" title="${s.title}">Song ${s.number} → ${dest ? dest.name : s.toIsland}</button>`
        );
      }
      for (const s of incoming) {
        const orig = ISLANDS[s.fromIsland];
        chips.push(
          `<button class="route-chip" data-jump="${s.fromIsland}" title="${s.title}">← Song ${s.number} (${orig ? orig.name : s.fromIsland})</button>`
        );
      }
      routesHtml = `
        <div class="inspector-routes">
          <div class="inspector-routes-label">Connected Star Paths</div>
          <div class="route-chip-wrap">${chips.join('')}</div>
        </div>
      `;
    }

    this.inspectorEl.innerHTML = `
      <div class="inspector-header">
        <div>
          <div class="inspector-title">${isl.name}</div>
          <div class="inspector-sub">${isl.subtitle} · ${basin ? basin.name : ''}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <button id="btn-visit-selected" class="icon-btn visit-btn" title="Visit ${escapeHtml(isl.name)} (Landfall Approach)">Visit</button>
          <button id="btn-focus-selected" class="icon-btn" title="Zoom to Island">Zoom</button>
          <button id="btn-clear-selected" class="icon-btn" title="Back to Overview">✕</button>
        </div>
      </div>
      <div class="badge-row">${cueBadges.join('')}</div>
      <div class="inspector-meta">${mentorLine}</div>
      ${routesHtml}
    `;

    const visitBtn = document.getElementById('btn-visit-selected');
    if (visitBtn) {
      visitBtn.addEventListener('click', () => {
        window.location.assign(
          `./index.html?mode=landfall&island=${encodeURIComponent(isl.id)}`
        );
      });
    }
    const focusBtn = document.getElementById('btn-focus-selected');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        this.selectIsland(isl.id, { zoomClose: true });
      });
    }
    const clearBtn = document.getElementById('btn-clear-selected');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.selectIsland(null);
      });
    }
    for (const chip of this.inspectorEl.querySelectorAll('.route-chip')) {
      chip.addEventListener('click', () => {
        this.selectIsland(chip.dataset.jump, { zoomClose: true });
      });
    }
  }

  selectIsland(islandId, opts = {}) {
    this.selectedIslandId = islandId;
    this._syncSidebarSelection();
    this._renderInspector();
    this._updateRouteHighlights();

    for (const [id, el] of this.labelEls.entries()) {
      el.classList.toggle('selected', id === islandId);
    }

    if (islandId && this.layout.byId[islandId]) {
      const entry = this.layout.byId[islandId];
      if (opts.zoomClose) {
        this.velPanX = 0.0;
        this.velPanZ = 0.0;
        this.goalPanX = entry.worldPos.x;
        this.goalPanZ = entry.worldPos.z;
        const targetR = entry.shelfRadiusM * this.islandScale;
        this.goalHeight = Math.max(
          MIN_CAM_HEIGHT + 25.0,
          Math.min(720.0, targetR * 4.4)
        );
      } else if (opts.panTo) {
        this.velPanX = 0.0;
        this.velPanZ = 0.0;
        this.goalPanX = entry.worldPos.x;
        this.goalPanZ = entry.worldPos.z;
      }
    }
  }

  _updateRouteHighlights() {
    if (!this.routeObjects) return;
    for (const ro of this.routeObjects) {
      const connected =
        !this.selectedIslandId ||
        ro.song.fromIsland === this.selectedIslandId ||
        ro.song.toIsland === this.selectedIslandId;
      const op = !this.selectedIslandId
        ? ro.baseOpacity
        : connected
          ? 0.94
          : 0.16;
      ro.lineMat.opacity = op;
      ro.chevMat.opacity = !this.selectedIslandId ? 0.78 : connected ? 0.98 : 0.18;
    }
  }

  fitRegion(regionKey, instant = false) {
    const b = this.layout.regionBounds[regionKey] || this.layout.regionBounds.all;
    this.activeRegion = regionKey;

    for (const pill of document.querySelectorAll('.region-pill')) {
      pill.classList.toggle('active', pill.dataset.region === regionKey);
    }

    const w = Math.max(1, this.viewportEl.clientWidth);
    const h = Math.max(1, this.viewportEl.clientHeight);
    const aspect = w / h;
    const vFovRad = (this.camera.fov * Math.PI) / 180.0;
    const tanHalfV = Math.tan(vFovRad * 0.5);
    const tanHalfH = tanHalfV * aspect;

    const reqHeightZ = (b.spanZ * 0.54) / tanHalfV;
    const reqHeightX = (b.spanX * 0.54) / tanHalfH;
    const targetH = Math.max(
      MIN_CAM_HEIGHT,
      Math.min(MAX_CAM_HEIGHT, Math.max(reqHeightX, reqHeightZ))
    );

    this.velPanX = 0.0;
    this.velPanZ = 0.0;
    this.goalPanX = b.centerX;
    this.goalPanZ = b.centerZ;
    this.goalHeight = targetH;

    if (regionKey === 'rapa_nui') {
      this.selectIsland('rapa_nui');
    }

    if (instant) {
      this.panX = this.goalPanX;
      this.panZ = this.goalPanZ;
      this.camHeight = this.goalHeight;
      this._applyCameraTransform();
    }
  }

  fitPlayerTrace(instant = false) {
    if (!this.playerTrace) {
      this.fitRegion('all', instant);
      return;
    }
    const b = this.playerTrace.bounds;
    this.activeRegion = 'trace';

    for (const pill of document.querySelectorAll('.region-pill')) {
      pill.classList.remove('active');
    }

    const w = Math.max(1, this.viewportEl.clientWidth);
    const h = Math.max(1, this.viewportEl.clientHeight);
    const aspect = w / h;
    const vFovRad = (this.camera.fov * Math.PI) / 180.0;
    const tanHalfV = Math.tan(vFovRad * 0.5);
    const tanHalfH = tanHalfV * aspect;

    const reqHeightZ = (b.spanZ * 0.56) / tanHalfV;
    const reqHeightX = (b.spanX * 0.56) / tanHalfH;
    const targetH = Math.max(
      MIN_CAM_HEIGHT + 45.0,
      Math.min(MAX_CAM_HEIGHT, Math.max(reqHeightX, reqHeightZ))
    );

    this.velPanX = 0.0;
    this.velPanZ = 0.0;
    this.goalPanX = b.centerX;
    this.goalPanZ = b.centerZ;
    this.goalHeight = targetH;

    if (instant) {
      this.panX = this.goalPanX;
      this.panZ = this.goalPanZ;
      this.camHeight = this.goalHeight;
      this._applyCameraTransform();
    }
  }

  setIslandScale(scale) {
    this.islandScale = Math.max(0.8, Math.min(2.1, scale));
    this.oceanUniforms.uIslandScale.value = this.islandScale;
    for (const node of this.islandNodes.values()) {
      node.holder.scale.setScalar(this.islandScale);
    }
    this._buildStarPathRoutes();
    this._updateRouteHighlights();
    this.scaleValEl.textContent = `${this.islandScale.toFixed(1)}×`;
    this.scaleSliderEl.value = String(Math.round(this.islandScale * 100));
  }

  setLighting(key) {
    const preset = LIGHT_PRESETS[key];
    if (!preset) return;
    this.lightKey = key;

    this.scene.background.setHex(preset.bgHex);
    this.hemiLight.color.setHex(preset.hemiSky);
    this.hemiLight.groundColor.setHex(preset.hemiGround);
    this.hemiLight.intensity = preset.hemiIntensity;

    this.sunLight.color.setHex(preset.sunColor);
    this.sunLight.intensity = preset.sunIntensity;
    this.sunLight.position.copy(preset.sunDir).multiplyScalar(3000.0);

    this.oceanUniforms.uSunDir.value.copy(preset.sunDir);
    this.oceanUniforms.uDaylight.value = preset.daylight;
    this.oceanUniforms.uTwilight.value = preset.twilight;

    for (const btn of document.querySelectorAll('[data-light]')) {
      btn.classList.toggle('active', btn.dataset.light === key);
    }
  }

  // -------------------------------------------------------------------------
  // Raycast, 1:1 Drag Panning & Cursor-Centered Zoom Math
  // -------------------------------------------------------------------------
  _clientToNdc(clientX, clientY) {
    const rect = this.viewportEl.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * 2.0 - 1.0,
      y: -(((clientY - rect.top) / Math.max(1, rect.height)) * 2.0 - 1.0),
    };
  }

  _screenPointToOcean(clientX, clientY, outVec = this._tmpVec3) {
    const ndc = this._clientToNdc(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.oceanPlane, outVec);
    return hit;
  }

  _pickIslandAtClient(clientX, clientY) {
    const ndc = this._clientToNdc(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickMeshes, false);
    if (hits.length > 0) {
      return hits[0].object.userData.islandId || null;
    }
    return null;
  }

  _zoomAtClientPoint(factor, clientX, clientY) {
    const anchor = this._screenPointToOcean(
      clientX,
      clientY,
      new THREE.Vector3()
    );
    const prevGoalH = this.goalHeight;
    const nextGoalH = Math.max(
      MIN_CAM_HEIGHT,
      Math.min(MAX_CAM_HEIGHT, prevGoalH * factor)
    );
    const ratioFromCur = nextGoalH / Math.max(1.0, this.camHeight);

    if (anchor) {
      this.goalPanX = anchor.x + (this.panX - anchor.x) * ratioFromCur;
      this.goalPanZ = anchor.z + (this.panZ - anchor.z) * ratioFromCur;
    }
    this.goalHeight = nextGoalH;
    this.velPanX = 0.0;
    this.velPanZ = 0.0;
    this._clampGoalPan();
  }

  _clampGoalPan() {
    const allB = this.layout.regionBounds.all;
    const pad = 1800.0;
    const minX = this.playerTrace
      ? Math.min(allB.minX, this.playerTrace.bounds.minX)
      : allB.minX;
    const maxX = this.playerTrace
      ? Math.max(allB.maxX, this.playerTrace.bounds.maxX)
      : allB.maxX;
    const minZ = this.playerTrace
      ? Math.min(allB.minZ, this.playerTrace.bounds.minZ)
      : allB.minZ;
    const maxZ = this.playerTrace
      ? Math.max(allB.maxZ, this.playerTrace.bounds.maxZ)
      : allB.maxZ;
    this.goalPanX = Math.max(
      minX - pad,
      Math.min(maxX + pad, this.goalPanX)
    );
    this.goalPanZ = Math.max(
      minZ - pad,
      Math.min(maxZ + pad, this.goalPanZ)
    );
  }

  _heightToSliderValue(h) {
    // Logarithmic zoom slider: 0 = farthest out (MAX_CAM_HEIGHT), 100 = closest in (MIN_CAM_HEIGHT)
    const t =
      Math.log(MAX_CAM_HEIGHT / Math.max(MIN_CAM_HEIGHT, h)) /
      Math.log(MAX_CAM_HEIGHT / MIN_CAM_HEIGHT);
    return Math.round(Math.max(0.0, Math.min(1.0, t)) * 100.0);
  }

  _sliderValueToHeight(val) {
    const t = Math.max(0.0, Math.min(1.0, Number(val) / 100.0));
    return MAX_CAM_HEIGHT * Math.pow(MIN_CAM_HEIGHT / MAX_CAM_HEIGHT, t);
  }

  // -------------------------------------------------------------------------
  // DOM & Pointer Event Bindings
  // -------------------------------------------------------------------------
  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());

    this.searchEl.addEventListener('input', () => {
      this._renderSidebarList(this.searchEl.value);
    });

    for (const pill of document.querySelectorAll('.region-pill')) {
      pill.addEventListener('click', () => {
        this.fitRegion(pill.dataset.region, false);
      });
    }

    // View & Sidebar buttons
    const btnTop = document.getElementById('btn-view-top');
    const btnTilt = document.getElementById('btn-view-tilt');
    btnTop.addEventListener('click', () => {
      this.goalTiltRad = TOP_VIEW_TILT_RAD;
      btnTop.classList.add('active');
      btnTilt.classList.remove('active');
    });
    btnTilt.addEventListener('click', () => {
      this.goalTiltRad = RELIEF_TILT_RAD;
      btnTilt.classList.add('active');
      btnTop.classList.remove('active');
    });
    document.getElementById('btn-fit-ocean').addEventListener('click', () => {
      this.fitRegion('all', false);
    });
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
      this.layoutEl.classList.toggle('sidebar-collapsed');
      setTimeout(() => this._onResize(), 200);
    });

    // Zoom controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      const rect = this.viewportEl.getBoundingClientRect();
      this._zoomAtClientPoint(
        0.7,
        rect.left + rect.width * 0.5,
        rect.top + rect.height * 0.5
      );
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      const rect = this.viewportEl.getBoundingClientRect();
      this._zoomAtClientPoint(
        1.42,
        rect.left + rect.width * 0.5,
        rect.top + rect.height * 0.5
      );
    });
    this.zoomSliderEl.addEventListener('input', () => {
      this.goalHeight = this._sliderValueToHeight(this.zoomSliderEl.value);
      this.velPanX = 0.0;
      this.velPanZ = 0.0;
    });

    // Island chart scale slider
    this.scaleSliderEl.addEventListener('input', () => {
      this.setIslandScale(Number(this.scaleSliderEl.value) / 100.0);
    });

    // Lighting buttons
    for (const btn of document.querySelectorAll('[data-light]')) {
      btn.addEventListener('click', () => this.setLighting(btn.dataset.light));
    }

    // Layer toggles
    const toggleLabelsBtn = document.getElementById('toggle-labels');
    toggleLabelsBtn.addEventListener('click', () => {
      this.showLabels = !this.showLabels;
      toggleLabelsBtn.classList.toggle('active', this.showLabels);
      this.labelsLayerEl.classList.toggle('hidden', !this.showLabels);
    });

    const toggleRoutesBtn = document.getElementById('toggle-routes');
    toggleRoutesBtn.addEventListener('click', () => {
      this.showRoutes = !this.showRoutes;
      toggleRoutesBtn.classList.toggle('active', this.showRoutes);
      if (this.routesGroup) this.routesGroup.visible = this.showRoutes;
    });

    const toggleCloudsBtn = document.getElementById('toggle-clouds');
    toggleCloudsBtn.addEventListener('click', () => {
      this.showClouds = !this.showClouds;
      toggleCloudsBtn.classList.toggle('active', this.showClouds);
      if (this.showClouds) this._ensureCloudsBuilt();
      for (const ce of this.cloudEntries) {
        ce.mesh.visible = this.showClouds;
      }
    });

    const toggleRingsBtn = document.getElementById('toggle-rings');
    toggleRingsBtn.classList.toggle('active', this.showRings);
    toggleRingsBtn.addEventListener('click', () => {
      this.showRings = !this.showRings;
      toggleRingsBtn.classList.toggle('active', this.showRings);
    });

    const toggleTraceBtn = document.getElementById('toggle-trace');
    const legendTraceEl = document.getElementById('legend-trace');
    if (this.playerTrace && toggleTraceBtn) {
      toggleTraceBtn.style.display = 'inline-block';
      toggleTraceBtn.classList.toggle('active', this.showPlayerTrace);
      if (legendTraceEl) {
        legendTraceEl.style.display = 'inline-flex';
      }
      toggleTraceBtn.addEventListener('click', () => {
        this.showPlayerTrace = !this.showPlayerTrace;
        toggleTraceBtn.classList.toggle('active', this.showPlayerTrace);
        if (this.playerTraceGroup) {
          this.playerTraceGroup.visible = this.showPlayerTrace;
        }
      });
    }

    // Pointer Drag Panning, Touch Pinch-Zoom, Click Pick & Double-Click Zoom
    this.viewportEl.addEventListener('contextmenu', (e) => e.preventDefault());

    this.viewportEl.addEventListener('pointerdown', (e) => {
      this.viewportEl.setPointerCapture(e.pointerId);
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 1) {
        this.isDragging = true;
        this.dragMoved = false;
        this.dragStartClient = { x: e.clientX, y: e.clientY };
        this.velPanX = 0.0;
        this.velPanZ = 0.0;
        // Sync goal to current so 1:1 drag starts immediately without lag
        this.goalPanX = this.panX;
        this.goalPanZ = this.panZ;
        const hit = this._screenPointToOcean(
          e.clientX,
          e.clientY,
          this.dragAnchorWorld
        );
        if (!hit) {
          this.dragAnchorWorld.set(this.panX, 0.0, this.panZ);
        }
        this.viewportEl.classList.add('dragging');
      } else if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      }
    });

    this.viewportEl.addEventListener('pointermove', (e) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const midX = (pts[0].x + pts[1].x) * 0.5;
        const midY = (pts[0].y + pts[1].y) * 0.5;
        if (this.lastPinchDist && this.lastPinchDist > 8.0 && dist > 8.0) {
          const factor = this.lastPinchDist / dist;
          this._zoomAtClientPoint(factor, midX, midY);
        }
        this.lastPinchDist = dist;
        this.dragMoved = true;
        return;
      }

      if (this.isDragging && this.activePointers.size === 1) {
        const movePx = Math.hypot(
          e.clientX - this.dragStartClient.x,
          e.clientY - this.dragStartClient.y
        );
        if (movePx > 4.0) this.dragMoved = true;

        const curHit = this._screenPointToOcean(
          e.clientX,
          e.clientY,
          new THREE.Vector3()
        );
        if (curHit) {
          const dx = this.dragAnchorWorld.x - curHit.x;
          const dz = this.dragAnchorWorld.z - curHit.z;
          this.panX += dx;
          this.panZ += dz;
          this.goalPanX = this.panX;
          this.goalPanZ = this.panZ;
          this._clampGoalPan();
          this.panX = this.goalPanX;
          this.panZ = this.goalPanZ;
          this._applyCameraTransform();

          this.velPanX = dx * 18.0;
          this.velPanZ = dz * 18.0;
        }
      } else if (!this.isDragging) {
        this.hoveredIslandId = this._pickIslandAtClient(e.clientX, e.clientY);
      }
    });

    const endPointer = (e) => {
      const wasSingleClick =
        this.activePointers.size === 1 && !this.dragMoved && e.type === 'pointerup';
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size < 2) {
        this.lastPinchDist = null;
      }
      if (this.activePointers.size === 0) {
        this.isDragging = false;
        this.viewportEl.classList.remove('dragging');
      }
      if (wasSingleClick && e.button === 0) {
        const picked = this._pickIslandAtClient(e.clientX, e.clientY);
        if (picked) {
          this.selectIsland(picked);
        }
      }
    };

    this.viewportEl.addEventListener('pointerup', endPointer);
    this.viewportEl.addEventListener('pointercancel', endPointer);

    this.viewportEl.addEventListener('dblclick', (e) => {
      const picked = this._pickIslandAtClient(e.clientX, e.clientY);
      if (picked) {
        this.selectIsland(picked, { zoomClose: true });
      } else {
        this._zoomAtClientPoint(0.56, e.clientX, e.clientY);
      }
    });

    this.viewportEl.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta =
          e.deltaMode === 1 ? e.deltaY * 22.0 : e.deltaMode === 2 ? e.deltaY * 120.0 : e.deltaY;
        const factor = Math.exp(delta * 0.00135);
        this._zoomAtClientPoint(factor, e.clientX, e.clientY);
      },
      { passive: false }
    );

    // Keyboard Pan & Zoom
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === this.searchEl) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.keysDown.add(k);
      } else if (k === '=' || k === '+') {
        const rect = this.viewportEl.getBoundingClientRect();
        this._zoomAtClientPoint(0.76, rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
      } else if (k === '-' || k === '_') {
        const rect = this.viewportEl.getBoundingClientRect();
        this._zoomAtClientPoint(1.32, rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
      } else if (k === 'f' || k === '0' || k === 'home') {
        this.fitRegion('all', false);
      } else if (k === 'escape') {
        this.selectIsland(null);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.key.toLowerCase());
    });
  }

  _onResize() {
    const w = Math.max(1, this.viewportEl.clientWidth);
    const h = Math.max(1, this.viewportEl.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // -------------------------------------------------------------------------
  // Per-Frame Camera, Shader, Rings, Scale Bar & HTML Label Projection
  // -------------------------------------------------------------------------
  _applyCameraTransform() {
    const cosT = Math.cos(this.tiltRad);
    const sinT = Math.sin(this.tiltRad);
    this.camera.position.set(
      this.panX,
      this.camHeight * cosT,
      this.panZ + this.camHeight * sinT
    );
    this.camera.lookAt(this.panX, 0.0, this.panZ);

    // Keep tight logarithmic near/far ratio (~100x) for rock-solid depth precision at every zoom level
    const desiredNear = Math.max(1.5, this.camHeight * 0.045);
    const desiredFar = Math.max(4500.0, this.camHeight * 5.2);
    if (
      Math.abs(this.camera.near - desiredNear) / desiredNear > 0.08 ||
      Math.abs(this.camera.far - desiredFar) / desiredFar > 0.08
    ) {
      this.camera.near = desiredNear;
      this.camera.far = desiredFar;
      this.camera.updateProjectionMatrix();
    }
  }

  _updateRings(elapsedSec) {
    const selEntry = this.selectedIslandId
      ? this.layout.byId[this.selectedIslandId]
      : null;
    const hovEntry =
      this.hoveredIslandId && this.hoveredIslandId !== this.selectedIslandId
        ? this.layout.byId[this.hoveredIslandId]
        : null;

    if (selEntry) {
      const pulse = 1.0 + 0.03 * Math.sin(elapsedSec * 3.1);
      const r = selEntry.shelfRadiusM * this.islandScale * 1.12 * pulse;
      this.selectionHalo.visible = true;
      this.selectionHalo.position.set(selEntry.worldPos.x, 0.58, selEntry.worldPos.z);
      this.selectionHalo.scale.setScalar(r);
    } else {
      this.selectionHalo.visible = false;
    }

    if (hovEntry) {
      const r = hovEntry.shelfRadiusM * this.islandScale * 1.1;
      this.hoverHalo.visible = true;
      this.hoverHalo.position.set(hovEntry.worldPos.x, 0.54, hovEntry.worldPos.z);
      this.hoverHalo.scale.setScalar(r);
    } else {
      this.hoverHalo.visible = false;
    }

    // Concentric Wayfinding Cue Rings around selected island (or traced target / Ra'iatea if none selected)
    const defaultRingEntry =
      (this.playerTrace &&
        (this.layout.byId[this.playerTrace.landedId] ||
          this.layout.byId[this.playerTrace.toId])) ||
      this.layout.byId.raiatea;
    const ringTarget = selEntry || defaultRingEntry;
    if (this.showRings && ringTarget) {
      const basin = OCEAN_BASINS[ringTarget.isl.basinId];
      const refHop = basin?.referenceHopUnits ?? 6.0;
      for (const cr of this.cueRings) {
        const radiusUnits = cr.isRing4
          ? Math.max(GameConstants.RING_4_MIN_RADIUS_UNITS, refHop * cr.ratio)
          : refHop * cr.ratio;
        const radiusM = Math.max(
          ringTarget.shelfRadiusM * this.islandScale * 1.04,
          radiusUnits * UNIT_TO_METERS
        );
        cr.mesh.visible = true;
        cr.mesh.position.set(ringTarget.worldPos.x, 0.48, ringTarget.worldPos.z);
        cr.mesh.scale.setScalar(radiusM);
      }
    } else {
      for (const cr of this.cueRings) {
        cr.mesh.visible = false;
      }
    }
  }

  _updateLabelsAndScaleBar() {
    const w = Math.max(1, this.viewportEl.clientWidth);
    const h = Math.max(1, this.viewportEl.clientHeight);

    // Dynamic Ocean Scale Bar
    const distToPlane = Math.hypot(
      this.camera.position.y,
      this.camera.position.z - this.panZ
    );
    const vFovRad = (this.camera.fov * Math.PI) / 180.0;
    const worldSpanY = 2.0 * distToPlane * Math.tan(vFovRad * 0.5);
    const pxPerMeter = h / Math.max(1.0, worldSpanY);
    const pxPerUnit = pxPerMeter * UNIT_TO_METERS;

    const candidateUnits = [0.5, 1, 2, 5, 10, 20];
    let bestUnits = 5;
    for (const u of candidateUnits) {
      bestUnits = u;
      if (u * pxPerUnit >= 66.0) break;
    }
    const barPx = Math.max(38.0, Math.min(165.0, bestUnits * pxPerUnit));
    this.scaleBarGraphicEl.style.width = `${barPx.toFixed(1)}px`;
    this.scaleBarTextEl.textContent =
      bestUnits === 1 ? '1 Sailing Unit' : `${bestUnits} Sailing Units`;

    if (!this.showLabels) return;

    const showSubtitles = this.camHeight < 1450.0;
    const showBanners = this.camHeight > 900.0;

    for (const bd of this.bannerEls) {
      if (!showBanners) {
        bd.el.style.display = 'none';
        continue;
      }
      this._projVec3.copy(bd.worldPos).project(this.camera);
      if (this._projVec3.z > 1.0) {
        bd.el.style.display = 'none';
        continue;
      }
      const sx = (this._projVec3.x * 0.5 + 0.5) * w;
      const sy = (-this._projVec3.y * 0.5 + 0.5) * h;
      bd.el.style.display = 'block';
      bd.el.style.left = `${sx.toFixed(1)}px`;
      bd.el.style.top = `${sy.toFixed(1)}px`;
    }

    for (const entry of this.layout.entries) {
      const el = this.labelEls.get(entry.id);
      if (!el) continue;

      const labelLiftY = Math.min(
        85.0,
        (entry.isl.peakHeightM * 0.55 + 16.0) * this.islandScale
      );
      this._projVec3.set(
        entry.worldPos.x,
        labelLiftY,
        entry.worldPos.z - entry.shelfRadiusM * this.islandScale * 0.35
      );
      this._projVec3.project(this.camera);

      if (
        this._projVec3.z > 1.0 ||
        this._projVec3.x < -1.15 ||
        this._projVec3.x > 1.15 ||
        this._projVec3.y < -1.15 ||
        this._projVec3.y > 1.15
      ) {
        el.style.display = 'none';
        continue;
      }

      const sx = (this._projVec3.x * 0.5 + 0.5) * w;
      const sy = (-this._projVec3.y * 0.5 + 0.5) * h;
      el.style.display = 'flex';
      el.style.left = `${sx.toFixed(1)}px`;
      el.style.top = `${sy.toFixed(1)}px`;
      el.classList.toggle('show-sub', showSubtitles);
    }
  }

  _animate(nowMs) {
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastTimeMs) * 0.001));
    this.lastTimeMs = nowMs;
    this.elapsedSec += dt;

    // Keyboard WASD / Arrow panning scaled proportionally to camera height
    if (this.keysDown.size > 0 && !this.isDragging) {
      const panSpeed = this.camHeight * 0.92;
      let kx = 0.0;
      let kz = 0.0;
      if (this.keysDown.has('a') || this.keysDown.has('arrowleft')) kx -= 1.0;
      if (this.keysDown.has('d') || this.keysDown.has('arrowright')) kx += 1.0;
      if (this.keysDown.has('w') || this.keysDown.has('arrowup')) kz -= 1.0;
      if (this.keysDown.has('s') || this.keysDown.has('arrowdown')) kz += 1.0;
      if (kx !== 0.0 || kz !== 0.0) {
        const len = Math.hypot(kx, kz);
        this.goalPanX += (kx / len) * panSpeed * dt;
        this.goalPanZ += (kz / len) * panSpeed * dt;
        this._clampGoalPan();
      }
    }

    // Gentle drag-release coasting inertia
    if (!this.isDragging && (Math.abs(this.velPanX) > 0.2 || Math.abs(this.velPanZ) > 0.2)) {
      this.goalPanX += this.velPanX * dt;
      this.goalPanZ += this.velPanZ * dt;
      this._clampGoalPan();
      const damp = Math.exp(-8.5 * dt);
      this.velPanX *= damp;
      this.velPanZ *= damp;
    }

    // Smooth camera easing
    const ease = 1.0 - Math.exp(-13.0 * dt);
    if (!this.isDragging) {
      this.panX += (this.goalPanX - this.panX) * ease;
      this.panZ += (this.goalPanZ - this.panZ) * ease;
    }
    this.camHeight += (this.goalHeight - this.camHeight) * ease;
    this.tiltRad += (this.goalTiltRad - this.tiltRad) * ease;

    this._applyCameraTransform();
    this.zoomSliderEl.value = String(this._heightToSliderValue(this.camHeight));

    // Update ocean & cloud shaders
    this.oceanUniforms.uTime.value = this.elapsedSec;
    if (this.showClouds && this.cloudEntries.length > 0) {
      const preset = LIGHT_PRESETS[this.lightKey];
      for (const ce of this.cloudEntries) {
        updateCloudMaterialUniforms(ce.material, {
          sunDir: preset.sunDir,
          daylight: preset.daylight,
          twilight: preset.twilight,
          opacity: ce.opacity,
          lapaGlow: ce.lapaGlow,
          elapsedSec: this.elapsedSec,
        });
      }
    }

    this._updateRings(this.elapsedSec);
    this._updateLabelsAndScaleBar();
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame((t) => this._animate(t));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new KnownOceanMapApp();
  });
}
