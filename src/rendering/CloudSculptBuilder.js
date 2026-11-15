/**
 * Procedural 3D Volumetric Cumulus Cloud Sculptor, Atmospheric Cloud Shader,
 * and Exact Scalar-Field Ray Occlusion Sampler.
 *
 * Builds watertight, single-envelope 3D cumulus iso-surfaces (eliminating
 * overlapping-sphere transparency seams) across three marine cloud classes:
 *  - Marching Trade-Wind Cumulus (`trade_0` .. `trade_3` — 4 organic variants)
 *  - Stationary High-Island Peak Cumulus (`peak` — towering cumulus congestus)
 *  - Coral Atoll Lapa Canopy Cloud (`lapa` — flat-bottomed turquoise lagoon-lit deck)
 */

import * as THREE from 'three';

const ISO_LEVEL = 0.38;
const OCCLUSION_HALO_LEVEL = 0.29;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// ---------------------------------------------------------------------------
// Deterministic 3D Lattice Value Noise & Convex Cauliflower Billow Noise
// ---------------------------------------------------------------------------

function hash3i(ix, iy, iz) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295.0;
}

function noise3D(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const uz = fz * fz * (3.0 - 2.0 * fz);

  const n000 = hash3i(ix, iy, iz);
  const n100 = hash3i(ix + 1, iy, iz);
  const n010 = hash3i(ix, iy + 1, iz);
  const n110 = hash3i(ix + 1, iy + 1, iz);
  const n001 = hash3i(ix, iy, iz + 1);
  const n101 = hash3i(ix + 1, iy, iz + 1);
  const n011 = hash3i(ix, iy + 1, iz + 1);
  const n111 = hash3i(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;

  return nxy0 + (nxy1 - nxy0) * uz;
}

/**
 * Convex billow ridges: rounded cumulus florets separated by crisp pinched folds.
 */
function billow3D(x, y, z) {
  const n = noise3D(x, y, z);
  return 1.0 - Math.abs(n * 2.0 - 1.0);
}

// ---------------------------------------------------------------------------
// Cloud Archetype Lobe Recipes
// Local frame convention:
//  - Trade clouds: +Z = downwind march direction (turrets lean slightly toward +Z),
//    X = cross-wind span, Y = altitude relative to cluster anchor.
//  - Peak cloud: centered over island summit (anchor at peakCloud.position.y = 56m).
//  - Lapa cloud: wide low atoll canopy spanning y = 35m .. 54m in island-slot space.
// ---------------------------------------------------------------------------

function makeLobe(x, y, z, rx, ry, rz, w = 1.0) {
  return {
    x,
    y,
    z,
    rx,
    ry,
    rz,
    invRx: 1.0 / rx,
    invRy: 1.0 / ry,
    invRz: 1.0 / rz,
    w,
  };
}

const ARCHETYPE_SPECS = {
  trade_0: {
    baseY: -6.2,
    heightSpan: 27.5,
    noiseFreq1: 0.088,
    noiseFreq2: 0.185,
    seedOffset: [11.3, 4.7, 19.1],
    gridRes: [32, 22, 30],
    detailScale: 0.095,
    lobes: [
      // Broad flat condensation base pad
      makeLobe(0.0, -2.5, 1.0, 26.0, 8.5, 19.0, 0.92),
      makeLobe(-14.5, -3.2, -3.5, 19.5, 7.5, 15.0, 0.85),
      makeLobe(15.0, -3.0, 2.5, 18.5, 7.2, 14.5, 0.84),
      makeLobe(-4.0, -3.4, -12.0, 17.0, 6.8, 13.5, 0.78),
      makeLobe(5.5, -3.0, 12.5, 18.0, 7.0, 14.0, 0.80),
      // Upwind feeder cumulus buds (-Z)
      makeLobe(-6.5, 2.5, -15.0, 13.0, 9.5, 12.0, 0.82),
      makeLobe(8.0, 1.5, -11.5, 12.0, 8.5, 11.0, 0.76),
      // Mid-body billowing shoulders
      makeLobe(-13.0, 4.8, -1.5, 15.0, 11.5, 13.5, 0.92),
      makeLobe(12.5, 5.2, 3.0, 14.5, 11.0, 13.0, 0.90),
      makeLobe(0.0, 6.5, -3.0, 16.5, 12.5, 14.5, 0.96),
      // Primary wind-sheared convective turret (+Z lean)
      makeLobe(1.5, 11.2, 4.5, 15.0, 12.0, 14.0, 1.06),
      makeLobe(-3.5, 14.8, 6.5, 11.2, 9.8, 10.8, 0.95),
      makeLobe(5.0, 13.2, 8.0, 10.4, 9.0, 10.2, 0.86),
      // Trailing downwind scud wisps
      makeLobe(2.5, -1.2, 20.5, 12.5, 6.5, 11.0, 0.72),
      makeLobe(-22.5, -2.5, 3.0, 12.0, 6.2, 10.5, 0.68),
      makeLobe(23.0, -2.2, -1.5, 11.5, 6.0, 10.0, 0.68),
    ],
  },

  trade_1: {
    baseY: -6.5,
    heightSpan: 26.5,
    noiseFreq1: 0.085,
    noiseFreq2: 0.178,
    seedOffset: [29.4, 13.2, 7.6],
    gridRes: [34, 22, 30],
    detailScale: 0.092,
    lobes: [
      // Twin-cell trade cumulus base
      makeLobe(-11.0, -2.8, 0.0, 22.0, 8.0, 17.5, 0.90),
      makeLobe(12.5, -2.8, 2.0, 22.5, 8.2, 17.5, 0.90),
      makeLobe(0.0, -3.4, -8.5, 18.0, 7.0, 14.5, 0.80),
      makeLobe(1.5, -3.0, 11.0, 18.5, 7.2, 14.5, 0.80),
      // Port convective tower
      makeLobe(-12.5, 5.8, 2.0, 14.5, 11.8, 13.5, 0.98),
      makeLobe(-10.0, 12.5, 5.0, 11.5, 9.8, 11.0, 0.94),
      makeLobe(-17.5, 3.2, -4.5, 12.0, 8.8, 11.5, 0.78),
      // Starboard taller tower
      makeLobe(11.5, 7.2, 3.5, 15.5, 12.5, 14.0, 1.04),
      makeLobe(13.5, 14.2, 6.8, 11.8, 9.6, 11.2, 0.96),
      makeLobe(6.5, 10.2, 1.0, 12.0, 9.5, 11.5, 0.84),
      // Saddle bridge & peripheral puffs
      makeLobe(0.5, 4.2, -1.5, 13.5, 9.2, 12.5, 0.84),
      makeLobe(24.5, -1.8, 4.5, 12.5, 6.5, 10.5, 0.72),
      makeLobe(-25.0, -2.2, -1.0, 12.0, 6.2, 10.5, 0.70),
      makeLobe(3.0, -1.5, -17.5, 13.0, 6.8, 11.0, 0.72),
    ],
  },

  trade_2: {
    baseY: -5.6,
    heightSpan: 22.0,
    noiseFreq1: 0.092,
    noiseFreq2: 0.195,
    seedOffset: [47.1, 22.8, 33.5],
    gridRes: [30, 20, 28],
    detailScale: 0.10,
    lobes: [
      // Fair-weather cumulus humilis — wider, flatter multi-cell pad
      makeLobe(0.0, -2.2, 0.0, 25.0, 7.5, 20.5, 0.92),
      makeLobe(-15.5, -2.6, 3.5, 18.5, 6.8, 15.5, 0.84),
      makeLobe(16.0, -2.5, -2.5, 18.5, 6.8, 15.5, 0.84),
      makeLobe(-5.0, -2.6, -13.0, 17.5, 6.5, 13.5, 0.78),
      makeLobe(6.5, -2.4, 13.5, 17.5, 6.5, 14.0, 0.80),
      // Clustered cauliflower humilis domes
      makeLobe(-8.5, 4.8, 2.0, 14.5, 10.0, 13.5, 0.94),
      makeLobe(7.5, 5.6, 3.5, 15.0, 10.6, 13.8, 0.96),
      makeLobe(-1.0, 8.8, 5.0, 12.5, 9.2, 12.0, 0.92),
      makeLobe(14.5, 3.2, -4.0, 12.0, 8.2, 11.5, 0.78),
      makeLobe(-15.0, 2.6, -5.5, 11.8, 8.0, 11.0, 0.76),
      makeLobe(1.5, 2.4, -10.5, 12.5, 8.0, 11.2, 0.76),
    ],
  },

  trade_3: {
    baseY: -6.8,
    heightSpan: 31.0,
    noiseFreq1: 0.082,
    noiseFreq2: 0.175,
    seedOffset: [63.8, 9.4, 51.2],
    gridRes: [32, 24, 30],
    detailScale: 0.09,
    lobes: [
      // Vigorous shear-leaning trade cumulus tower
      makeLobe(0.0, -3.0, -1.0, 24.0, 8.2, 19.5, 0.92),
      makeLobe(-13.5, -3.4, -4.0, 18.0, 7.2, 15.0, 0.84),
      makeLobe(14.0, -3.2, 1.5, 18.0, 7.2, 15.0, 0.84),
      makeLobe(0.5, -2.8, 14.0, 17.5, 7.2, 15.0, 0.82),
      // Stepped upwind stair-steps (-Z -> +Z)
      makeLobe(-2.0, 1.8, -14.5, 13.0, 9.2, 12.5, 0.84),
      makeLobe(3.5, 6.2, -5.5, 15.5, 11.8, 14.5, 0.96),
      makeLobe(-8.5, 5.5, 1.5, 14.0, 11.0, 13.0, 0.90),
      makeLobe(9.5, 5.0, 3.0, 13.5, 10.5, 12.5, 0.88),
      // High leaning turret (+Z)
      makeLobe(0.5, 12.5, 4.5, 14.8, 12.8, 14.2, 1.06),
      makeLobe(-1.5, 17.8, 8.5, 11.5, 10.2, 11.5, 0.96),
      makeLobe(4.2, 15.5, 10.5, 10.2, 8.8, 10.2, 0.84),
      // Trailing wake scud
      makeLobe(-1.0, -1.8, 22.5, 12.0, 6.5, 10.5, 0.70),
    ],
  },

  peak: {
    baseY: -13.5,
    heightSpan: 60.5,
    noiseFreq1: 0.058,
    noiseFreq2: 0.128,
    seedOffset: [81.2, 37.9, 14.6],
    gridRes: [36, 30, 32],
    detailScale: 0.064,
    lobes: [
      // Broad heavy orographic condensation shelf anchored over summit
      makeLobe(0.0, -6.5, 0.0, 34.0, 12.5, 29.0, 0.98),
      makeLobe(-21.0, -7.8, 4.0, 24.0, 10.5, 21.0, 0.88),
      makeLobe(21.5, -7.5, -3.0, 24.0, 10.5, 21.0, 0.88),
      makeLobe(3.0, -7.8, 18.5, 23.0, 10.0, 19.5, 0.85),
      makeLobe(-4.0, -8.0, -18.0, 23.0, 10.0, 19.5, 0.85),
      makeLobe(-28.5, -9.2, -8.0, 17.5, 8.5, 16.0, 0.76),
      makeLobe(28.0, -9.0, 9.5, 17.5, 8.5, 16.0, 0.76),
      // Lower convective buttress domes
      makeLobe(-15.5, 4.5, 5.5, 20.5, 15.5, 18.5, 0.95),
      makeLobe(16.0, 5.5, -2.5, 20.5, 16.0, 18.5, 0.95),
      makeLobe(1.5, 4.0, -13.5, 19.0, 14.5, 17.5, 0.90),
      makeLobe(-2.0, 5.0, 13.5, 19.0, 14.5, 17.5, 0.90),
      // Powerful central cumulus congestus column
      makeLobe(0.0, 12.0, 0.0, 24.5, 19.0, 22.5, 1.08),
      makeLobe(-9.5, 20.5, -3.5, 18.0, 15.5, 17.0, 0.98),
      makeLobe(10.0, 21.5, 4.0, 17.5, 15.5, 16.8, 0.96),
      // Towering cauliflower summit turret & flanking crowns
      makeLobe(0.5, 29.5, 1.0, 18.5, 16.5, 17.5, 1.06),
      makeLobe(-4.0, 38.0, 2.5, 13.5, 12.5, 13.0, 0.96),
      makeLobe(5.5, 35.5, -2.5, 12.2, 11.2, 12.0, 0.88),
    ],
  },

  lapa: {
    baseY: 35.2,
    heightSpan: 20.5,
    noiseFreq1: 0.068,
    noiseFreq2: 0.148,
    seedOffset: [105.6, 18.4, 72.3],
    gridRes: [38, 18, 32],
    detailScale: 0.072,
    lobes: [
      // Wide flat-bottomed coral-atoll canopy deck (catches lagoon turquoise bounce underneath)
      makeLobe(0.0, 39.5, 0.0, 38.0, 7.8, 30.0, 0.96),
      makeLobe(-24.0, 39.0, 4.0, 27.5, 7.2, 23.0, 0.90),
      makeLobe(24.5, 39.0, -3.5, 27.5, 7.2, 23.0, 0.90),
      makeLobe(-6.0, 38.8, 18.5, 26.0, 6.8, 20.5, 0.86),
      makeLobe(7.0, 38.8, -18.5, 26.0, 6.8, 20.5, 0.86),
      makeLobe(-36.5, 38.2, -7.0, 18.5, 6.0, 16.5, 0.76),
      makeLobe(36.5, 38.2, 8.0, 18.5, 6.0, 16.5, 0.76),
      // Rolling marine stratocumulus / trade-cumulus upper cells
      makeLobe(-14.0, 44.5, -2.0, 20.0, 9.2, 17.5, 0.92),
      makeLobe(13.5, 45.2, 3.5, 20.5, 9.6, 18.0, 0.94),
      makeLobe(0.0, 46.8, -4.5, 19.0, 9.8, 17.0, 0.96),
      makeLobe(-4.5, 44.0, 12.5, 17.5, 8.4, 15.5, 0.84),
      makeLobe(6.5, 43.8, -13.0, 17.5, 8.2, 15.5, 0.84),
      makeLobe(-26.5, 42.6, 7.5, 15.5, 7.6, 14.0, 0.78),
      makeLobe(26.0, 42.8, -6.0, 15.5, 7.6, 14.0, 0.78),
    ],
  },
};

// Precompute tight AABB + bounding sphere for every archetype
for (const key of Object.keys(ARCHETYPE_SPECS)) {
  const spec = ARCHETYPE_SPECS[key];
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const L of spec.lobes) {
    minX = Math.min(minX, L.x - L.rx * 1.06);
    maxX = Math.max(maxX, L.x + L.rx * 1.06);
    minY = Math.min(minY, L.y - L.ry * 1.06);
    maxY = Math.max(maxY, L.y + L.ry * 1.06);
    minZ = Math.min(minZ, L.z - L.rz * 1.06);
    maxZ = Math.max(maxZ, L.z + L.rz * 1.06);
  }
  minY = Math.max(minY, spec.baseY - 3.2);

  spec.bounds = { minX, minY, minZ, maxX, maxY, maxZ };
  const cx = 0.5 * (minX + maxX);
  const cy = 0.5 * (minY + maxY);
  const cz = 0.5 * (minZ + maxZ);
  const radius = Math.hypot(maxX - cx, maxY - cy, maxZ - cz) + 1.2;
  spec.boundingSphere = { cx, cy, cz, radius };
}

/**
 * Evaluates the 3D cumulus scalar field at local cloud coordinates (x, y, z).
 * Surface is extracted at ISO_LEVEL = 0.38; values > ISO_LEVEL lie inside the cloud.
 */
export function evaluateCloudScalar(spec, x, y, z) {
  const b = spec.bounds;
  if (
    x < b.minX ||
    x > b.maxX ||
    y < b.minY ||
    y > b.maxY ||
    z < b.minZ ||
    z > b.maxZ
  ) {
    return 0.0;
  }

  const lobes = spec.lobes;
  let density = 0.0;
  for (let i = 0; i < lobes.length; i += 1) {
    const L = lobes[i];
    const dx = (x - L.x) * L.invRx;
    const dy = (y - L.y) * L.invRy;
    const dz = (z - L.z) * L.invRz;
    const r2 = dx * dx + dy * dy + dz * dz;
    if (r2 < 1.0) {
      const t = 1.0 - r2;
      density += L.w * t * t * t;
    }
  }

  if (density <= 0.025) return 0.0;

  // Lifting Condensation Level (LCL) flat base with subtle convective undulation
  const [sx, sy, sz] = spec.seedOffset;
  const baseUndulation =
    (noise3D(x * 0.045 + sx, sy, z * 0.045 + sz) - 0.5) * 2.1;
  const localBaseY = spec.baseY + baseUndulation;
  const baseMask = smoothstep(localBaseY - 2.4, localBaseY + 3.4, y);
  density *= baseMask;
  if (density <= 0.025) return 0.0;

  // 2-octave convex cauliflower billow sculpting (gentle on flat belly, crisp on turrets)
  const h01 = clamp((y - spec.baseY) / spec.heightSpan, 0.0, 1.0);
  const f1 = spec.noiseFreq1;
  const f2 = spec.noiseFreq2;
  const b1 = billow3D(x * f1 + sx, y * f1 + sy, z * f1 + sz);
  const b2 = billow3D(x * f2 - sz, y * f2 + sx, z * f2 - sy);
  const cauliflower = 0.68 * b1 + 0.32 * b2;

  const crownMask = smoothstep(0.05, 0.42, h01);
  const sculptGain = 0.12 + 0.36 * crownMask;
  const creaseCarve = (1.0 - cauliflower) * 0.095 * crownMask;

  return density * (0.76 + sculptGain * cauliflower) - creaseCarve;
}

// ---------------------------------------------------------------------------
// Marching Tetrahedra Watertight Iso-Surface Extractor
// ---------------------------------------------------------------------------

// 8 corners of a unit cube:
// 0:(0,0,0), 1:(1,0,0), 2:(0,1,0), 3:(1,1,0),
// 4:(0,0,1), 5:(1,0,1), 6:(0,1,1), 7:(1,1,1)
const CUBE_CORNER_OFFSETS = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

// 6 Kuhn tetrahedra sharing the main diagonal (0 -> 7)
const KUHN_TETRAHEDRA = [
  [0, 5, 1, 7],
  [0, 1, 3, 7],
  [0, 3, 2, 7],
  [0, 2, 6, 7],
  [0, 6, 4, 7],
  [0, 4, 5, 7],
];

function buildCloudIsoGeometry(archetypeKey) {
  const spec = ARCHETYPE_SPECS[archetypeKey];
  const [nx, ny, nz] = spec.gridRes;
  const b = spec.bounds;

  const pad = 1.4;
  const x0 = b.minX - pad;
  const y0 = b.minY - pad;
  const z0 = b.minZ - pad;
  const dx = (b.maxX - b.minX + pad * 2.0) / (nx - 1);
  const dy = (b.maxY - b.minY + pad * 2.0) / (ny - 1);
  const dz = (b.maxZ - b.minZ + pad * 2.0) / (nz - 1);

  const sliceStride = nx * ny;
  const totalGrid = nx * ny * nz;
  const field = new Float32Array(totalGrid);

  for (let iz = 0; iz < nz; iz += 1) {
    const pz = z0 + iz * dz;
    const zBase = iz * sliceStride;
    for (let iy = 0; iy < ny; iy += 1) {
      const py = y0 + iy * dy;
      const yzBase = zBase + iy * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        field[yzBase + ix] = evaluateCloudScalar(spec, x0 + ix * dx, py, pz);
      }
    }
  }

  const positions = [];
  const normals = [];
  const metas = [];
  const indices = [];
  const edgeVertexMap = new Map();

  const invDx = 1.0 / dx;
  const invDy = 1.0 / dy;
  const invDz = 1.0 / dz;
  const maxGx = nx - 1.0001;
  const maxGy = ny - 1.0001;
  const maxGz = nz - 1.0001;

  // Fast trilinear lookup into the precomputed scalar grid (avoids redundant lobe/noise loops)
  const sampleGridField = (qx, qy, qz) => {
    const fx = (qx - x0) * invDx;
    const fy = (qy - y0) * invDy;
    const fz = (qz - z0) * invDz;
    if (fx < 0.0 || fx >= maxGx || fy < 0.0 || fy >= maxGy || fz < 0.0 || fz >= maxGz) {
      return 0.0;
    }
    const ix = fx | 0;
    const iy = fy | 0;
    const iz = fz | 0;
    const tx = fx - ix;
    const ty = fy - iy;
    const tz = fz - iz;

    const base00 = iz * sliceStride + iy * nx + ix;
    const base10 = base00 + nx;
    const base01 = base00 + sliceStride;
    const base11 = base01 + nx;

    const c00 = field[base00] + (field[base00 + 1] - field[base00]) * tx;
    const c10 = field[base10] + (field[base10 + 1] - field[base10]) * tx;
    const c01 = field[base01] + (field[base01 + 1] - field[base01]) * tx;
    const c11 = field[base11] + (field[base11 + 1] - field[base11]) * tx;

    const c0 = c00 + (c10 - c00) * ty;
    const c1 = c01 + (c11 - c01) * ty;
    return c0 + (c1 - c0) * tz;
  };

  const gradEpsX = dx * 0.75;
  const gradEpsY = dy * 0.75;
  const gradEpsZ = dz * 0.75;

  const getOrCreateEdgeVertex = (gA, gB, ax, ay, az, bx, by, bz, vA, vB) => {
    const lo = gA < gB ? gA : gB;
    const hi = gA < gB ? gB : gA;
    // Safe integer key since totalGrid < 80,000
    const key = lo * totalGrid + hi;
    const cached = edgeVertexMap.get(key);
    if (cached !== undefined) return cached;

    const denom = vB - vA;
    const t = Math.abs(denom) > 1e-6 ? clamp((ISO_LEVEL - vA) / denom, 0.0, 1.0) : 0.5;
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    const pz = az + (bz - az) * t;

    // Outward surface normal = -gradient(F)
    const gx =
      (sampleGridField(px - gradEpsX, py, pz) -
        sampleGridField(px + gradEpsX, py, pz)) /
      gradEpsX;
    const gy =
      (sampleGridField(px, py - gradEpsY, pz) -
        sampleGridField(px, py + gradEpsY, pz)) /
      gradEpsY;
    const gz =
      (sampleGridField(px, py, pz - gradEpsZ) -
        sampleGridField(px, py, pz + gradEpsZ)) /
      gradEpsZ;
    const gLen = Math.hypot(gx, gy, gz) || 1.0;
    const nxOut = gx / gLen;
    const nyOut = gy / gLen;
    const nzOut = gz / gLen;

    // Baked volumetric cloud attributes:
    //  x: height01 (0 at condensation base -> 1 at turret crown)
    //  y: ambientOcc (crevasse self-occlusion from upward/outward sky probe)
    //  z: coreDepth (optical thickness sampled inward along -normal)
    //  w: bellyMask (flat underside weight for shadow & coral atoll lapa glow)
    const height01 = clamp((py - spec.baseY) / spec.heightSpan, 0.0, 1.0);

    const occProbe1 = sampleGridField(
      px + nxOut * 2.2,
      py + nyOut * 2.2 + 2.0,
      pz + nzOut * 2.2
    );
    const occProbe2 = sampleGridField(
      px + nxOut * 4.5,
      py + nyOut * 3.0 + 4.2,
      pz + nzOut * 4.5
    );
    const occRaw =
      1.0 -
      clamp((occProbe1 * 0.85 + occProbe2 * 0.65) * 1.15, 0.0, 0.68);
    const ambientOcc = clamp(occRaw, 0.32, 1.0);

    const inward1 = sampleGridField(
      px - nxOut * 3.4,
      py - nyOut * 3.4,
      pz - nzOut * 3.4
    );
    const inward2 = sampleGridField(
      px - nxOut * 7.2,
      py - nyOut * 6.0,
      pz - nzOut * 7.2
    );
    const coreDepth = clamp(
      smoothstep(ISO_LEVEL * 0.85, ISO_LEVEL * 1.85, Math.max(inward1, inward2)),
      0.18,
      1.0
    );

    const bellyMask = clamp(
      smoothstep(0.36, 0.0, height01) * clamp(-nyOut * 0.72 + 0.36, 0.0, 1.0),
      0.0,
      1.0
    );

    const vIdx = positions.length / 3;
    positions.push(px, py, pz);
    normals.push(nxOut, nyOut, nzOut);
    metas.push(height01, ambientOcc, coreDepth, bellyMask);
    edgeVertexMap.set(key, vIdx);
    return vIdx;
  };

  const emitOrientedTri = (i0, i1, i2) => {
    const p0x = positions[i0 * 3];
    const p0y = positions[i0 * 3 + 1];
    const p0z = positions[i0 * 3 + 2];
    const e1x = positions[i1 * 3] - p0x;
    const e1y = positions[i1 * 3 + 1] - p0y;
    const e1z = positions[i1 * 3 + 2] - p0z;
    const e2x = positions[i2 * 3] - p0x;
    const e2y = positions[i2 * 3 + 1] - p0y;
    const e2z = positions[i2 * 3 + 2] - p0z;

    const fnx = e1y * e2z - e1z * e2y;
    const fny = e1z * e2x - e1x * e2z;
    const fnz = e1x * e2y - e1y * e2x;

    const avgNx = normals[i0 * 3] + normals[i1 * 3] + normals[i2 * 3];
    const avgNy = normals[i0 * 3 + 1] + normals[i1 * 3 + 1] + normals[i2 * 3 + 1];
    const avgNz = normals[i0 * 3 + 2] + normals[i1 * 3 + 2] + normals[i2 * 3 + 2];

    if (fnx * avgNx + fny * avgNy + fnz * avgNz >= 0.0) {
      indices.push(i0, i1, i2);
    } else {
      indices.push(i0, i2, i1);
    }
  };

  const cGrid = new Int32Array(8);
  const cVal = new Float32Array(8);
  const cX = new Float32Array(8);
  const cY = new Float32Array(8);
  const cZ = new Float32Array(8);

  const insideIdx = [0, 0, 0, 0];
  const outsideIdx = [0, 0, 0, 0];

  for (let iz = 0; iz < nz - 1; iz += 1) {
    for (let iy = 0; iy < ny - 1; iy += 1) {
      for (let ix = 0; ix < nx - 1; ix += 1) {
        let minV = Infinity;
        let maxV = -Infinity;
        for (let c = 0; c < 8; c += 1) {
          const off = CUBE_CORNER_OFFSETS[c];
          const gx = ix + off[0];
          const gy = iy + off[1];
          const gz = iz + off[2];
          const gIdx = gz * sliceStride + gy * nx + gx;
          const v = field[gIdx];
          cGrid[c] = gIdx;
          cVal[c] = v;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }

        if (maxV < ISO_LEVEL || minV >= ISO_LEVEL) continue;

        for (let c = 0; c < 8; c += 1) {
          const off = CUBE_CORNER_OFFSETS[c];
          cX[c] = x0 + (ix + off[0]) * dx;
          cY[c] = y0 + (iy + off[1]) * dy;
          cZ[c] = z0 + (iz + off[2]) * dz;
        }

        for (let t = 0; t < 6; t += 1) {
          const tet = KUHN_TETRAHEDRA[t];
          let nIn = 0;
          let nOut = 0;
          for (let k = 0; k < 4; k += 1) {
            const corner = tet[k];
            if (cVal[corner] >= ISO_LEVEL) {
              insideIdx[nIn] = corner;
              nIn += 1;
            } else {
              outsideIdx[nOut] = corner;
              nOut += 1;
            }
          }

          if (nIn === 0 || nIn === 4) continue;

          if (nIn === 1) {
            const a = insideIdx[0];
            const b0 = outsideIdx[0];
            const b1 = outsideIdx[1];
            const b2 = outsideIdx[2];
            const v0 = getOrCreateEdgeVertex(
              cGrid[a], cGrid[b0], cX[a], cY[a], cZ[a], cX[b0], cY[b0], cZ[b0], cVal[a], cVal[b0]
            );
            const v1 = getOrCreateEdgeVertex(
              cGrid[a], cGrid[b1], cX[a], cY[a], cZ[a], cX[b1], cY[b1], cZ[b1], cVal[a], cVal[b1]
            );
            const v2 = getOrCreateEdgeVertex(
              cGrid[a], cGrid[b2], cX[a], cY[a], cZ[a], cX[b2], cY[b2], cZ[b2], cVal[a], cVal[b2]
            );
            emitOrientedTri(v0, v1, v2);
          } else if (nIn === 3) {
            const a = outsideIdx[0];
            const b0 = insideIdx[0];
            const b1 = insideIdx[1];
            const b2 = insideIdx[2];
            const v0 = getOrCreateEdgeVertex(
              cGrid[a], cGrid[b0], cX[a], cY[a], cZ[a], cX[b0], cY[b0], cZ[b0], cVal[a], cVal[b0]
            );
            const v1 = getOrCreateEdgeVertex(
              cGrid[a], cGrid[b1], cX[a], cY[a], cZ[a], cX[b1], cY[b1], cZ[b1], cVal[a], cVal[b1]
            );
            const v2 = getOrCreateEdgeVertex(
              cGrid[a], cGrid[b2], cX[a], cY[a], cZ[a], cX[b2], cY[b2], cZ[b2], cVal[a], cVal[b2]
            );
            emitOrientedTri(v0, v1, v2);
          } else {
            // nIn === 2 && nOut === 2 -> quad split into 2 triangles
            const i0 = insideIdx[0];
            const i1 = insideIdx[1];
            const o0 = outsideIdx[0];
            const o1 = outsideIdx[1];
            const v00 = getOrCreateEdgeVertex(
              cGrid[i0], cGrid[o0], cX[i0], cY[i0], cZ[i0], cX[o0], cY[o0], cZ[o0], cVal[i0], cVal[o0]
            );
            const v01 = getOrCreateEdgeVertex(
              cGrid[i0], cGrid[o1], cX[i0], cY[i0], cZ[i0], cX[o1], cY[o1], cZ[o1], cVal[i0], cVal[o1]
            );
            const v10 = getOrCreateEdgeVertex(
              cGrid[i1], cGrid[o0], cX[i1], cY[i1], cZ[i1], cX[o0], cY[o0], cZ[o0], cVal[i1], cVal[o0]
            );
            const v11 = getOrCreateEdgeVertex(
              cGrid[i1], cGrid[o1], cX[i1], cY[i1], cZ[i1], cX[o1], cY[o1], cZ[o1], cVal[i1], cVal[o1]
            );
            emitOrientedTri(v00, v01, v11);
            emitOrientedTri(v00, v11, v10);
          }
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('aCloudMeta', new THREE.Float32BufferAttribute(metas, 4));
  geo.setIndex(indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

const GEOMETRY_CACHE = new Map();

export function getCloudArchetypeSpec(archetypeKey) {
  return ARCHETYPE_SPECS[archetypeKey] || ARCHETYPE_SPECS.trade_0;
}

export function getCloudArchetypeGeometry(archetypeKey) {
  const key = ARCHETYPE_SPECS[archetypeKey] ? archetypeKey : 'trade_0';
  let geo = GEOMETRY_CACHE.get(key);
  if (!geo) {
    geo = buildCloudIsoGeometry(key);
    GEOMETRY_CACHE.set(key, geo);
  }
  return geo;
}

// ---------------------------------------------------------------------------
// Atmospheric Volumetric Cumulus ShaderMaterial
// ---------------------------------------------------------------------------

const CLOUD_VERTEX_SHADER = /* glsl */ `
  attribute vec4 aCloudMeta;

  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec4 vMeta;

  void main() {
    vLocalPos = position;
    vMeta = aCloudMeta;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CLOUD_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uDaylight;
  uniform float uTwilight;
  uniform float uOpacity;
  uniform float uLapaGlow;
  uniform float uDetailScale;
  uniform float uTime;

  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec4 vMeta;

  float hash31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

    vec4 nx0 = mix(vec4(n000, n010, n001, n011), vec4(n100, n110, n101, n111), f.x);
    vec2 nxy = mix(nx0.xy, nx0.zw, f.y);
    return mix(nxy.x, nxy.y, f.z);
  }

  float fbmBillow(vec3 p) {
    float b1 = 1.0 - abs(noise3(p) * 2.0 - 1.0);
    float b2 = 1.0 - abs(noise3(p * 2.13 + vec3(7.3, 3.1, 11.7)) * 2.0 - 1.0);
    float n3 = noise3(p * 4.45 - vec3(2.9, 8.5, 5.1));
    return 0.56 * b1 + 0.29 * b2 + 0.15 * n3;
  }

  void main() {
    vec3 viewVec = cameraPosition - vWorldPos;
    float viewDist = length(viewVec);
    vec3 viewDir = viewVec / max(0.001, viewDist);
    vec3 geomN = normalize(vWorldNormal);
    vec3 sunDir = normalize(uSunDir);

    float height01 = vMeta.x;
    float ambientOcc = vMeta.y;
    float coreDepth = vMeta.z;
    float bellyMask = vMeta.w;

    // Multi-scale 3D cottony micro-billow detail & normal perturbation
    vec3 sampleP = vLocalPos * uDetailScale + vec3(uTime * 0.012, 0.0, uTime * 0.008);
    float eps = 0.35;
    float fCenter = fbmBillow(sampleP);
    float fDx = fbmBillow(sampleP + vec3(eps, 0.0, 0.0)) - fCenter;
    float fDy = fbmBillow(sampleP + vec3(0.0, eps, 0.0)) - fCenter;
    float fDz = fbmBillow(sampleP + vec3(0.0, 0.0, eps)) - fCenter;
    vec3 detailGrad = vec3(fDx, fDy, fDz) / eps;

    // Transform local detail gradient lightly into world normal perturbation
    vec3 nPerturbed = normalize(geomN - detailGrad * (0.26 + 0.16 * height01));

    // Feathered outer vapor rim while keeping interior body 100% optically solid
    float ndv = clamp(abs(dot(geomN, viewDir)), 0.0, 1.0);
    float wispField = mix(0.35, 1.0, fCenter);
    float rimDensity = ndv * (0.68 + 0.55 * coreDepth) * (0.65 + 0.50 * wispField);
    float edgeAlpha = smoothstep(0.045, 0.24, rimDensity);
    // Guarantee thick interior bodies never leak background starlight
    edgeAlpha = max(edgeAlpha, smoothstep(0.30, 0.48, ndv + coreDepth * 0.22));

    float finalAlpha = clamp(edgeAlpha * uOpacity, 0.0, 1.0);
    if (finalAlpha < 0.03) discard;

    // Direct solar + Beers-Powder scattering
    float sunDot = dot(nPerturbed, sunDir);
    float directSun = smoothstep(-0.28, 0.72, sunDot);
    float crownLight = smoothstep(0.08, 0.88, height01);
    float powder = 1.0 - exp(-coreDepth * 2.4);
    float litFactor = clamp(
      (0.58 * directSun + 0.42 * crownLight) * (0.52 + 0.48 * ambientOcc) * (0.72 + 0.28 * powder),
      0.0,
      1.0
    );

    // Forward-scattered silver lining when cloud passes near the sun
    float cosTheta = dot(-viewDir, sunDir);
    float hgPhase = pow(clamp(cosTheta * 0.5 + 0.5, 0.0, 1.0), 7.0);
    float thinRim = (1.0 - smoothstep(0.12, 0.62, ndv)) * smoothstep(-0.08, 0.20, sunDir.y);
    float silverLining = hgPhase * thinRim * (0.35 + 0.65 * (uDaylight + uTwilight * 0.8));

    // Day cumulus palette: warm alabaster crowns -> cool atmospheric slate-blue shadows
    vec3 dayLit = vec3(1.00, 0.99, 0.965);
    vec3 dayMid = vec3(0.80, 0.86, 0.93);
    vec3 dayBaseShadow = vec3(0.45, 0.53, 0.65);
    vec3 dayCol = mix(dayBaseShadow, dayMid, smoothstep(0.0, 0.45, litFactor));
    dayCol = mix(dayCol, dayLit, smoothstep(0.32, 0.95, litFactor));
    dayCol *= mix(0.84, 1.03, fCenter);

    // Dawn / Dusk palette: coral-apricot & molten gold on sunward billows, twilight violet base
    vec3 twiShadow = vec3(0.24, 0.25, 0.38);
    vec3 twiCoral = vec3(0.95, 0.50, 0.38);
    vec3 twiGold = vec3(1.00, 0.80, 0.52);
    float twiSunMask = clamp(0.65 * directSun + 0.35 * crownLight, 0.0, 1.0);
    vec3 twiCol = mix(twiShadow, twiCoral, smoothstep(0.10, 0.58, twiSunMask));
    twiCol = mix(twiCol, twiGold, smoothstep(0.55, 0.95, twiSunMask));

    // Deep Polynesian night palette: dark indigo-slate silhouettes blocking background stars,
    // with subtle starlight / airglow sheen on upper cauliflower crowns
    vec3 nightBase = vec3(0.018, 0.028, 0.056);
    vec3 nightCrown = vec3(0.052, 0.078, 0.132);
    vec3 nightCol = mix(nightBase, nightCrown, crownLight * ambientOcc * (0.65 + 0.35 * fCenter));

    vec3 col = mix(nightCol, dayCol, uDaylight);
    col = mix(col, twiCol, uTwilight * (0.52 + 0.48 * smoothstep(-0.35, 0.65, sunDot)));

    // Add warm silver-gold forward scattering rim
    vec3 rimTint = mix(vec3(1.0, 0.68, 0.38), vec3(1.0, 0.98, 0.92), uDaylight);
    col += rimTint * silverLining * 0.55;

    // Self-shadowed flat condensation belly darkening
    col *= mix(1.0, 0.80, bellyMask * (1.0 - 0.55 * uLapaGlow));

    // Coral Atoll Te Lapa / Lagoon Reflection on cloud underside!
    if (uLapaGlow > 0.01) {
      float underFacing = clamp(-nPerturbed.y * 0.65 + 0.45, 0.0, 1.0);
      float lapaMask = clamp(
        (bellyMask * 0.78 + smoothstep(0.52, 0.0, height01) * underFacing * 0.52) *
        (0.75 + 0.35 * fCenter),
        0.0,
        1.0
      );
      // Visible both in daylight (vivid turquoise lagoon bounce) and starlit twilight/night
      vec3 lapaTint = mix(
        vec3(0.11, 0.48, 0.45),
        vec3(0.20, 0.93, 0.81),
        0.28 + 0.72 * uDaylight
      );
      col = mix(col, lapaTint, lapaMask * uLapaGlow * 0.88);
    }

    // Subtle aerial perspective haze toward distant horizon
    float distHaze = smoothstep(260.0, 680.0, viewDist);
    vec3 hazeCol = mix(vec3(0.038, 0.065, 0.125), vec3(0.55, 0.77, 0.89), uDaylight);
    hazeCol = mix(hazeCol, vec3(0.85, 0.48, 0.34), uTwilight * 0.45);
    col = mix(col, hazeCol, distHaze * 0.34);

    gl_FragColor = vec4(col, finalAlpha);
  }
`;

export function createCloudMaterial({
  archetypeKey = 'trade_0',
  isLapa = false,
  opacity = 1.0,
} = {}) {
  const spec = getCloudArchetypeSpec(archetypeKey);
  return new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.48, 0.68, 0.55).normalize() },
      uDaylight: { value: 0.95 },
      uTwilight: { value: 0.12 },
      uOpacity: { value: opacity },
      uLapaGlow: { value: isLapa ? 1.0 : 0.0 },
      uDetailScale: { value: spec.detailScale },
      uTime: { value: 0.0 },
    },
    transparent: true,
    depthWrite: opacity > 0.45,
    side: THREE.FrontSide,
  });
}

export function updateCloudMaterialUniforms(
  material,
  { sunDir, daylight, twilight, opacity, lapaGlow, elapsedSec }
) {
  if (!material || !material.uniforms) return;
  const u = material.uniforms;
  if (sunDir && u.uSunDir) {
    u.uSunDir.value.set(sunDir.x, sunDir.y, sunDir.z).normalize();
  }
  if (daylight !== undefined && u.uDaylight) {
    u.uDaylight.value = daylight;
  }
  if (twilight !== undefined && u.uTwilight) {
    u.uTwilight.value = twilight;
  }
  if (opacity !== undefined && u.uOpacity) {
    u.uOpacity.value = opacity;
    material.depthWrite = opacity > 0.45;
  }
  if (lapaGlow !== undefined && u.uLapaGlow) {
    u.uLapaGlow.value = lapaGlow;
  }
  if (elapsedSec !== undefined && u.uTime) {
    u.uTime.value = elapsedSec;
  }
}

/**
 * Builds a single-mesh sculpted 3D cloud instance ready for scene attachment.
 */
export function createSculptedCloudMesh(archetypeKey, options = {}) {
  const key = ARCHETYPE_SPECS[archetypeKey] ? archetypeKey : 'trade_0';
  const geo = getCloudArchetypeGeometry(key);
  const mat = createCloudMaterial({
    archetypeKey: key,
    isLapa: Boolean(options.isLapa || key === 'lapa'),
    opacity: options.opacity ?? 1.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  mesh.userData.cloudArchetype = key;
  return { mesh, material: mat, archetypeKey: key, spec: ARCHETYPE_SPECS[key] };
}

// ---------------------------------------------------------------------------
// Exact Local-Space Scalar-Field Ray Optical Depth Sampler (Star & Label Occlusion)
// ---------------------------------------------------------------------------

/**
 * Integrates optical depth along a local-space ray `(ox, oy, oz) + u * (dx, dy, dz)`
 * through the exact same scalar field `evaluateCloudScalar` used to extract the 3D mesh.
 * Returns optical depth `tau >= 0` (`transmittance = Math.exp(-tau * cloudOpacity)`).
 */
export function sampleCloudLocalRayOpticalDepth(
  archetypeKey,
  ox,
  oy,
  oz,
  dx,
  dy,
  dz
) {
  const spec = ARCHETYPE_SPECS[archetypeKey];
  if (!spec) return 0.0;

  const b = spec.bounds;
  const margin = 1.2;

  // Ray-AABB slab intersection in local space
  let uMin = 0.0;
  let uMax = 1e6;

  if (Math.abs(dx) < 1e-7) {
    if (ox < b.minX - margin || ox > b.maxX + margin) return 0.0;
  } else {
    const inv = 1.0 / dx;
    let t1 = (b.minX - margin - ox) * inv;
    let t2 = (b.maxX + margin - ox) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > uMin) uMin = t1;
    if (t2 < uMax) uMax = t2;
    if (uMin > uMax) return 0.0;
  }

  if (Math.abs(dy) < 1e-7) {
    if (oy < b.minY - margin || oy > b.maxY + margin) return 0.0;
  } else {
    const inv = 1.0 / dy;
    let t1 = (b.minY - margin - oy) * inv;
    let t2 = (b.maxY + margin - oy) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > uMin) uMin = t1;
    if (t2 < uMax) uMax = t2;
    if (uMin > uMax) return 0.0;
  }

  if (Math.abs(dz) < 1e-7) {
    if (oz < b.minZ - margin || oz > b.maxZ + margin) return 0.0;
  } else {
    const inv = 1.0 / dz;
    let t1 = (b.minZ - margin - oz) * inv;
    let t2 = (b.maxZ + margin - oz) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > uMin) uMin = t1;
    if (t2 < uMax) uMax = t2;
    if (uMin > uMax) return 0.0;
  }

  const segLen = uMax - uMin;
  if (segLen <= 0.05) return 0.0;

  // Sample 12 evenly spaced points across the local AABB chord
  const STEPS = 12;
  const stepLen = segLen / STEPS;
  let tau = 0.0;

  for (let s = 0; s < STEPS; s += 1) {
    const u = uMin + (s + 0.5) * stepLen;
    const val = evaluateCloudScalar(
      spec,
      ox + dx * u,
      oy + dy * u,
      oz + dz * u
    );
    if (val > OCCLUSION_HALO_LEVEL) {
      if (val >= ISO_LEVEL) {
        // Ray pierces the solid 3D cloud envelope: high extinction per meter
        const excess = 1.0 + (val - ISO_LEVEL) * 3.5;
        tau += stepLen * 1.45 * excess;
        if (tau > 6.5) return tau;
      } else {
        // Soft 1-2px atmospheric fringe right around the outer silhouette edge
        const haloFrac =
          (val - OCCLUSION_HALO_LEVEL) / (ISO_LEVEL - OCCLUSION_HALO_LEVEL);
        tau += stepLen * 0.28 * haloFrac * haloFrac;
      }
    }
  }

  return tau;
}
