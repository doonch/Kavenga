/**
 * Sculpted 3D Terrain, Active Volcanism, Vegetation & Cultural Landmarks for Act III Islands:
 * - Kaua'i ("Mist-Ringed Fortress Crag"): 14-pleat Na Pali cathedral razor-cliffs, crimson 'ohi'a
 *   highlands, black-sand cove, and Swell Master Pohaku's High Crag Pa Sanctuary & signal braziers.
 * - O'ahu ("Fog-Banked Timber Isle"): Sweeping scalloped Ko'olau Pali escarpment wall, golden
 *   barrier beach & turquoise sandbar bay, russet-olive Miro/Koa timber forest & Manu's Hearth.
 * - Kiritimati ("Sacred Star-Mirror Atoll"): Broad crescent land-atoll dotted with rose-rimmed
 *   interior Star-Mirror ponds, Keeper Akura's 12-stone Star Shrine & Giant Tridacna Clam Altar.
 * - Hawai'i ("Ancestral Mauna Horizon"): Twin Mauna shield massif + ACTIVE Kilauea & Mauna Loa
 *   open-top calderas with glowing molten lava lakes (visible from top view!), braided incandescent
 *   lava rivers flowing down black basalt to an ocean steam plume, Kealakekua Bay & Great Heiau Ahu.
 */

import * as THREE from 'three';
import {
  createSculptedCloudMesh,
  TRADE_CLOUD_VARIANT_KEYS,
  updateCloudMaterialUniforms,
} from './CloudSculptBuilder.js';
import {
  addBarrierReefArc,
  addBroadleafTrees,
  addCoconutGroves,
  addCoastalScrub,
  addMaraePlatform,
  addOrganicBarrierReefArc,
  addOutriggerCanoe,
  addRegionalHuts,
  addStarStoneCircle,
  addTimberPier,
  addWaterfallCascade,
  arcMask,
  buildPolarTerrainGeometry,
  clamp01,
  createMaterialTracker,
  createOrganicLagoonGeometry,
  gaussian2D,
  lerp,
  mixRgb,
  smoothstep,
} from './IslandSculptToolkit.js';
import {
  createCarvedHullPairGroup,
  createHawaiianImuPitGroup,
  createHawaiianKahiliAndKiiGroup,
  createHawaiianLoiKaloGroup,
  createHawaiianLokoIaFishpondGroup,
  createSculptedShipwrightShedGroup,
  createSculptedTridacnaAltarGroup,
  createVillageHearthGroup,
} from './IslandPropsBuilder.js';

// ============================================================================
// 1. KAUA'I — 14-Pleat Na Pali Cathedral Razor-Cliffs & High Crag Pa Sanctuary
// ============================================================================
function kauaiDistToSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz || 1e-6;
  const t = clamp01((wx * vx + wz * vz) / len2);
  return { d: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
}

function kauaiCoastR(theta) {
  const coveIndent = 9.0 * Math.exp(-Math.pow((theta - 0.05) / 0.34, 2.0));
  const starboardSpur = 10.5 * Math.exp(-Math.pow((theta + 0.72) / 0.38, 2.0));
  const paliPleats =
    3.6 * Math.cos(14.0 * theta) * smoothstep(0.28, 0.75, Math.abs(theta));
  const macroLobes =
    5.4 * Math.cos(3.0 * theta + 0.48) + 2.8 * Math.sin(4.0 * theta - 0.6);
  return Math.max(58.0, 71.0 - coveIndent + starboardSpur + paliPleats + macroLobes);
}

function evalKauaiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const coastR = kauaiCoastR(theta);

  if (r > coastR) {
    return {
      h: lerp(0.05, -5.0, smoothstep(coastR, coastR + 12.0, r)),
      pleat: 0.0,
      isBlackCove: false,
    };
  }

  const u = r / coastR;

  // Towering Wai'ale'ale wet massif offset astern-port (-28, 22) canon (~68m peak) + 14 Na Pali cathedral pleats
  const waialealePeak = 49.0 * gaussian2D(x, z, -28.0, 22.0, 22.0, 24.0, 0.25);
  const secondaryRidge = 34.0 * gaussian2D(x, z, -22.0, -14.0, 20.0, 18.0, -0.3);
  const pleatWave = Math.pow(0.5 + 0.5 * Math.cos(14.0 * theta), 2.15);
  // Smooth coastal headland cliffs on the Na Pali flanks & back, tapering gently into the broad front harbor
  const flankCliffMask = smoothstep(0.32, 0.96, Math.abs(theta - 0.04));
  const pleatEnv = smoothstep(0.14, 0.44, 1.0 - u) * smoothstep(0.95, 0.32, 1.0 - u) * flankCliffMask;
  const pleatRelief = (pleatWave - 0.28) * 18.0 * pleatEnv;

  const cliffDrop =
    19.0 * smoothstep(1.0, 0.83, u) * flankCliffMask +
    2.6 * (1.0 - u) * (1.0 - flankCliffMask);
  let h = Math.max(0.0, waialealePeak + secondaryRidge * 0.68 + pleatRelief + cliffDrop * 0.68);

  // Broad, natural black-sand harbor slope (no radial wedge cut toward center)
  const harborSlope = gaussian2D(x, z, 54.0, 4.0, 16.0, 24.0, 0.06);
  if (harborSlope > 0.04) {
    const coveTarget = lerp(1.1, 4.8, smoothstep(64.0, 38.0, x));
    h = lerp(h, coveTarget, smoothstep(0.04, 0.72, harborSlope) * 0.88);
  }

  // Starboard-East Na Pali Coastal Ridge Bench for Observation Circle at walkable (34, 38) -> canon (38.0, -34.0)
  const spurProm = gaussian2D(x, z, 38.0, -34.0, 17.0, 16.0, -0.35);
  h = Math.max(h, 22.5 * smoothstep(0.18, 0.84, spurProm));

  const dCircle = Math.hypot(x - 38.0, z + 34.0);
  if (dCircle < 11.5) {
    h = lerp(h, 22.5, 1.0 - smoothstep(5.6, 11.5, dCircle));
  }

  // Grounded terrace for Swell Master Pohaku's High Crag Pa Sanctuary at canon (35.0, -15.0)
  const dElder = Math.hypot(x - 35.0, z + 15.0);
  if (dElder < 9.0) {
    h = lerp(h, 13.5, 1.0 - smoothstep(5.4, 9.0, dElder));
  }

  // Single-pass polyline trail climbing from Black-Sand Cove -> Pohaku's Pa -> Starboard Coastal Ridge Circle
  const trailLegs = [
    [56.0, 6.0, 50.0, 0.0, 1.2, 2.5], // spawn (-6, 56) -> landing (0, 50)
    [56.0, 6.0, 42.0, 22.0, 1.2, 5.2], // spawn -> hut (-22, 42)
    [56.0, 6.0, 48.0, -8.0, 1.2, 7.2], // spawn -> base of starboard ramp (8, 48)
    [48.0, -8.0, 42.0, -18.0, 7.2, 13.5], // base (8, 48) -> Pohaku's Pa (18, 42) [dist=11.7m, sl=0.54]
    [42.0, -18.0, 46.5, -23.5, 13.5, 17.5], // Pa (18, 42) -> mid1 (23.5, 46.5) [dist=7.1m, sl=0.56]
    [46.5, -23.5, 41.5, -29.8, 17.5, 22.5], // mid1 (23.5, 46.5) -> mid2 (29.8, 41.5) [dist=8.0m, sl=0.62]
    [41.5, -29.8, 38.0, -34.0, 22.5, 22.5], // mid2 (29.8, 41.5) -> circle (34, 38) [dist=5.5m, sl=0.00]
  ];
  let bestTrailD = 999.0;
  let bestTrailH = h;
  for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
    const seg = kauaiDistToSeg(x, z, ax, az, bx, bz);
    if (seg.d < bestTrailD) {
      bestTrailD = seg.d;
      bestTrailH = lerp(h0, h1, seg.t);
    }
  }
  if (bestTrailD < 13.5) {
    const mask = 1.0 - smoothstep(6.8, 13.5, bestTrailD);
    h = lerp(h, bestTrailH, mask);
  }

  // Re-apply flat terraces for Pa Sanctuary, Hut, & Circle after trail blend so platforms sit 100% flush
  if (dElder < 6.8) {
    h = lerp(h, 13.5, 1.0 - smoothstep(5.0, 6.8, dElder));
  }
  const dHut = Math.hypot(x - 36.5, z - 26.5);
  if (dHut < 8.5) {
    h = lerp(h, 5.2, 1.0 - smoothstep(5.4, 8.5, dHut));
  }
  if (dCircle < 7.8) {
    h = lerp(h, 22.5, 1.0 - smoothstep(5.6, 7.8, dCircle));
  }

  return {
    h,
    pleat: pleatWave * pleatEnv,
    isBlackCove: Math.abs(theta - 0.04) < 0.45 && u > 0.78,
  };
}

function buildKauaiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.23, 0.41];
  const colBlackSand = [0.14, 0.14, 0.16];
  const colNaPaliEmerald = [0.13, 0.47, 0.2];
  const colRazorMoss = [0.3, 0.56, 0.21];
  const colRedDirt = [0.48, 0.23, 0.16]; // Iconic Kaua'i oxidized red basalt soil streaks!
  const colDarkBasalt = [0.19, 0.19, 0.22];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalKauaiPoint,
    maxRadius: 96.0,
    nRings: 112,
    nSegs: 164,
    colorFn: (s, slope, _x, _z, _r, theta) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isBlackCove && s.h < 2.2) {
        return mixRgb(colBlackSand, colNaPaliEmerald, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colNaPaliEmerald, colRazorMoss, clamp01(s.pleat * 1.35));
      const redStreak = Math.max(0.0, Math.sin(7.0 * theta + 1.1)) * smoothstep(0.95, 1.75, slope);
      rgb = mixRgb(rgb, colRedDirt, redStreak * 0.48);
      rgb = mixRgb(rgb, colDarkBasalt, smoothstep(1.05, 1.95, slope) * 0.82);
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.04,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Contour-matched surf collar along the sheer Na Pali lava benches
  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b3a3d, roughness: 0.92 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.74
  );
  addOrganicBarrierReefArc(group, reefMat, foamMat, kauaiCoastR, 0.38, Math.PI * 2.0 - 0.34, 72, {
    reefWidth: 2.0,
    foamWidth: 2.6,
    foamOffset: 1.5,
  });

  // Twin Weeping Wai'ale'ale Highland Waterfalls hugging the sheer pleated cliff walls
  addWaterfallCascade(group, trackMat, {
    x: -14.0,
    y: 22.0,
    z: 18.0,
    width: 1.8,
    height: 32.0,
    rotY: 0.65,
    tiltX: -0.38,
  });
  addWaterfallCascade(group, trackMat, {
    x: -12.0,
    y: 19.0,
    z: -12.0,
    width: 1.7,
    height: 28.0,
    rotY: 2.35,
    tiltX: -0.38,
  });

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-6.0, 56.0);
  const [laCx, laCz] = toCanon(0.0, 50.0);
  const [huCx, huCz] = toCanon(-22.0, 42.0);
  const [elCx, elCz] = toCanon(18.0, 42.0);
  const [ciCx, ciCz] = toCanon(34.0, 38.0);
  const [midCx, midCz] = toCanon(27.0, 41.0);
  const kauaiClearZones = [
    { x: spCx, z: spCz, r: 12.0 },
    { x: laCx, z: laCz, r: 8.0 },
    { x: huCx, z: huCz, r: 10.5 },
    { x: elCx, z: elCz, r: 10.0 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: midCx, z: midCz, r: 5.5 },
  ];
  const kauaiIsClear = (px, pz) => {
    for (const bz of kauaiClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Swell Master Pohaku's High Crag Pa Sanctuary grounded solidly at canon (35.0, -15.0)
  const maraeCx = 35.0;
  const maraeCz = -15.0;
  addMaraePlatform(group, trackMat, {
    x: maraeCx,
    y: evalKauaiPoint(maraeCx, maraeCz).h - 0.12,
    z: maraeCz,
    rotY: 0.42,
    scale: 0.92,
    courtHex: 0x2c2b2e,
    ahuHex: 0x454346,
    withBraziers: true,
  });

  // Steep A-frame Hawaiian Pili-Grass Hale Village behind the Black-Sand Cove (clear of hut arrival (-22, 42))
  const huts = [
    [huCx - 5.5, huCz + 4.5, 0.25, 1.02],
    [46.0, 12.5, 0.14, 0.96],
    [44.5, 32.0, 0.34, 0.94],
    [48.5, -8.0, -0.18, 0.92],
  ].map(([hx, hz, hang, sc]) => ({
    x: hx,
    y: Math.max(0.8, evalKauaiPoint(hx, hz).h - 0.1),
    z: hz,
    rotY: -hang,
    scale: sc,
  }));
  addRegionalHuts(group, trackMat, huts, 'hawaiian');

  // Crimson-Blossomed 'Ohi'a Lehua Highland Trees & Cove Palms (filtered by kauaiIsClear)
  const ohiaPts = [];
  for (let i = 0; i < 24; i += 1) {
    const oang = -2.4 + (i / 23) * 4.8;
    const or = 34.0 + (i % 3) * 5.5;
    const ox = or * Math.cos(oang);
    const oz = or * Math.sin(oang);
    if (!kauaiIsClear(ox, oz)) continue;
    const oy = evalKauaiPoint(ox, oz).h;
    if (oy > 4.5 && oy < 30.0) {
      ohiaPts.push([ox, oy - 0.2, oz, 0.95 + (i % 3) * 0.08, oang]);
    }
  }
  addBroadleafTrees(group, trackMat, ohiaPts, {
    canopyHexA: 0x1e5422,
    canopyHexB: 0x2f6b28,
    blossomHex: 0xd63028,
  });

  const palmPts = [];
  for (let i = 0; i < 22; i += 1) {
    const ang = -0.52 + (i / 21) * 1.04;
    const pr = 52.0 + (i % 2) * 3.5;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    if (!kauaiIsClear(px, pz)) continue;
    const py = evalKauaiPoint(px, pz).h;
    if (py > 0.8 && py < 9.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.95, 0.2]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 88.0 };
}

// ============================================================================
// 2. O'AHU — Sweeping Ko'olau Pali Wall, Barrier Beach & Russet Miro Grove
// ============================================================================
// 2. O'AHU — Sweeping Ko'olau Pali Wall, Barrier Sandbar, Timber Village & Mokapu Knoll
// ============================================================================
function oahuCoastR(theta) {
  const baySweep = 6.5 * Math.exp(-Math.pow((theta - 0.08) / 0.46, 2.0));
  const mokapuProm = 14.0 * Math.exp(-Math.pow((theta + 0.41) / 0.28, 2.0));
  const westHead = 8.5 * Math.exp(-Math.pow((theta - 0.92) / 0.36, 2.0));
  return Math.max(
    56.0,
    66.5 - baySweep + mokapuProm + westHead + 4.2 * Math.sin(3.0 * theta + 0.4) + 2.4 * Math.cos(4.0 * theta)
  );
}

function oahuReefR(theta) {
  return (
    oahuCoastR(theta) +
    18.5 +
    4.0 * Math.cos(2.0 * theta - 0.35) +
    2.2 * Math.sin(5.0 * theta + 0.6)
  );
}

// Grounded coastal village hut pads for Oahu's expanded 10-hut Windward Village
const OAHU_HUT_SPECS = [
  // Forester Malia's Miro Timber Village (port-central coastal plain)
  [38.5, 28.5, 0.28, 1.04, true, 3.8],
  [39.0, 36.5, 0.38, 0.96, false, 3.4],
  [47.5, 34.0, 0.24, 0.94, false, 2.3],
  [35.0, 19.5, 0.18, 0.98, false, 4.2],
  [53.0, 31.0, 0.34, 0.9, false, 1.8],
  // Elder Manu's Windward Fisher's Hamlet (starboard bay)
  [42.0, -5.0, -0.1, 0.98, false, 3.1],
  [38.0, -13.0, -0.2, 0.96, false, 3.6],
  [52.5, -7.5, -0.14, 0.95, false, 2.0],
  [40.5, -24.5, -0.28, 0.94, false, 3.4],
  [56.0, -14.0, -0.18, 0.92, false, 1.9],
];

function evalOahuPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const coastR = oahuCoastR(theta);
  const outerSandbarR = oahuReefR(theta);

  // Outer barrier channel pass strictly seaward of the dry beach (r > coastR - 2)
  const passMask = arcMask(theta, -0.06, 0.14, 0.06) * smoothstep(58.0, 66.0, r);

  // Mokapu Seaward Headland Promontory jutting toward canon (60.0, -26.0) -> walkable (26.0, 60.0)
  const mokapuDist = Math.hypot(x - 60.0, z + 26.0);
  const mokapuBluff = gaussian2D(x, z, 60.0, -26.0, 14.5, 13.5, -0.25);

  if (r > coastR && mokapuBluff < 0.08) {
    if (r <= outerSandbarR) {
      const floor = lerp(0.16, 0.24, smoothstep(coastR, outerSandbarR, r));
      let h = lerp(floor, -2.2, passMask);
      // Deepen immediate canoe mooring cove at walkable (-6, 68.5) -> canon (68.5, 6.0)
      const moorCove = gaussian2D(x, z, 69.5, 6.0, 6.0, 6.0, 0.0);
      if (moorCove > 0.05) {
        h = lerp(h, -1.6, smoothstep(0.05, 0.5, moorCove));
      }
      return {
        h,
        paliFlute: 0.0,
        miroZone: 0.0,
        inBay: h > 0.05,
      };
    }
    const drop = smoothstep(outerSandbarR, outerSandbarR + 18.0, r);
    const h = lerp(lerp(0.24, -2.2, passMask), -4.2, drop);
    return {
      h,
      paliFlute: 0.0,
      miroZone: 0.0,
      inBay: false,
    };
  }

  const u = clamp01(r / coastR);

  // Towering curved Ko'olau Pali escarpment wall & peaks offset astern (x ~ -34) with NO center wedge cut!
  const paliAxisX = x + 34.0 - 0.008 * z * z;
  const paliSpanZ = 1.0 - smoothstep(32.0, 52.0, Math.abs(z));
  const paliAsym =
    paliAxisX > 0.0
      ? Math.exp(-Math.pow(paliAxisX / 10.5, 1.55)) // Sheer fluted windward Pali cliff facing the coastal plain
      : Math.exp(-Math.pow(paliAxisX / 24.0, 2.0)); // Broad leeward slope astern
  const paliFlute =
    (0.5 + 0.5 * Math.cos(z * 0.42)) *
    smoothstep(18.0, 2.5, Math.abs(paliAxisX)) *
    paliSpanZ;
  // Two iconic Pali peaks (Konahuanui at z = 14, Lanihuli at z = -20)
  const konahuanui = 20.0 * gaussian2D(x, z, -36.0, 14.0, 14.0, 15.0, 0.2);
  const lanihuli = 18.0 * gaussian2D(x, z, -34.0, -20.0, 13.0, 15.0, -0.2);
  const paliWall = (39.0 + 7.0 * paliFlute) * paliAsym * paliSpanZ + konahuanui + lanihuli;

  // Broad, gently rolling coastal plain & forest foothills (whole across front, NO radial wedge)
  const foothills = 8.2 * smoothstep(1.0, 0.28, u);
  let h = foothills + paliWall;

  // Smooth golden barrier beach shelf along the entire front bay (x ~ 38..62)
  const beachMask = gaussian2D(x, z, 51.0, 4.0, 14.0, 32.0, 0.05);
  if (beachMask > 0.03) {
    const beachTarget = lerp(1.1, 4.2, smoothstep(63.0, 34.0, x));
    h = lerp(h, beachTarget, smoothstep(0.03, 0.72, beachMask) * 0.9);
  }

  // Mokapu Sea-Bluff Knoll for Observation Circle at walkable (26, 60) -> canon (60.0, -26.0), h=18.5m
  h = Math.max(h, 18.5 * smoothstep(0.16, 0.84, mokapuBluff));

  // Walkable single-pass curved ramp connecting Elder Manu's (18, 48) -> (26, 48) -> (35, 49) -> (30.0, 55.5) -> Mokapu Circle (26, 60)
  const oahuTrailLegs = [
    [48.0, -18.0, 48.0, -26.0, 2.8, 7.2],
    [48.0, -26.0, 49.0, -35.0, 7.2, 12.8],
    [49.0, -35.0, 55.5, -30.0, 12.8, 18.5],
    [55.5, -30.0, 60.0, -26.0, 18.5, 18.5],
  ];
  let bestRampD = 999.0;
  let bestRampH = h;
  for (const [ax, az, bx, bz, h0, h1] of oahuTrailLegs) {
    const seg = kauaiDistToSeg(x, z, ax, az, bx, bz);
    if (seg.d < bestRampD) {
      bestRampD = seg.d;
      bestRampH = lerp(h0, h1, seg.t);
    }
  }
  if (bestRampD < 11.5) {
    h = lerp(h, bestRampH, 1.0 - smoothstep(5.8, 11.5, bestRampD));
  }

  // Grounded gentle level pads for all 10 extra huts before POI terrace locks
  for (let i = 0; i < OAHU_HUT_SPECS.length; i += 1) {
    const [hx, hz, , , , hh] = OAHU_HUT_SPECS[i];
    const dh = Math.hypot(x - hx, z - hz);
    if (dh < 5.2) {
      h = lerp(h, hh, 1.0 - smoothstep(3.0, 5.2, dh));
    }
  }

  // Flat terraces after ramp for Circle (26, 60), Elder Manu's Village (18, 48), Hut (-24, 44), & Spawn (-10, 58)
  if (mokapuDist < 6.8) {
    h = lerp(h, 18.5, 1.0 - smoothstep(5.6, 6.8, mokapuDist));
  }
  const dElder = Math.hypot(x - 48.0, z + 18.0);
  if (dElder < 6.4) {
    h = lerp(h, 2.8, 1.0 - smoothstep(4.4, 6.4, dElder));
  }
  const dHut = Math.hypot(x - 44.0, z - 24.0);
  if (dHut < 9.5) {
    h = lerp(h, 3.8, 1.0 - smoothstep(5.8, 9.5, dHut));
  }
  const dSpawn = Math.hypot(x - 58.0, z - 10.0);
  if (dSpawn < 9.0) {
    h = lerp(h, 1.35, 1.0 - smoothstep(5.5, 9.0, dSpawn));
  }

  // Canoe mooring cove clipping clean through beach margin
  const moorCove = gaussian2D(x, z, 69.5, 6.0, 6.0, 6.0, 0.0);
  if (moorCove > 0.08) {
    h = lerp(h, -1.6, smoothstep(0.08, 0.55, moorCove));
  }

  const miroZone = clamp01(gaussian2D(x, z, 28.0, 22.0, 18.0, 20.0, 0.15));
  return { h, paliFlute, miroZone, inBay: false };
}

function buildOahuAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.05, 0.27, 0.44];
  const colSandbarAqua = [0.22, 0.83, 0.77];
  const colBarrierBeach = [0.94, 0.88, 0.73];
  const colPaliGreen = [0.19, 0.49, 0.22];
  const colPaliRib = [0.34, 0.57, 0.24];
  const colMiroForest = [0.32, 0.39, 0.17];
  const colCliffGrey = [0.28, 0.29, 0.28];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalOahuPoint,
    maxRadius: 108.0,
    nRings: 112,
    nSegs: 164,
    colorFn: (s, slope) => {
      if (s.h < 0.06) {
        return mixRgb(colSandbarAqua, colDeepSea, clamp01(-s.h / 2.4));
      }
      if (s.inBay || s.h < 0.27) return colSandbarAqua;
      if (s.h < 2.2 && slope < 0.75) {
        return mixRgb(colBarrierBeach, colPaliGreen, smoothstep(1.1, 2.2, s.h));
      }
      let rgb = mixRgb(colPaliGreen, colPaliRib, s.paliFlute * 0.7);
      rgb = mixRgb(rgb, colMiroForest, s.miroZone * 0.65);
      rgb = mixRgb(rgb, colCliffGrey, smoothstep(1.05, 1.95, slope) * 0.76);
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.03,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Contour-matched organic turquoise Kaneohe sandbar lagoon water plane (no circular CircleGeometry!)
  const bayWaterMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x30e5cf, depthWrite: false }),
    0.36
  );
  const bayGeo = createOrganicLagoonGeometry(oahuReefR, 120);
  const bayMesh = new THREE.Mesh(bayGeo, bayWaterMat);
  bayMesh.position.y = 0.255;
  group.add(bayMesh);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe8dab4, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf2fbff, depthWrite: false }),
    0.7
  );
  addOrganicBarrierReefArc(group, reefMat, foamMat, oahuReefR, 0.14, Math.PI * 2.0 - 0.26, 84);

  // Twin misty Ko'olau Pali windward waterfalls (hugging the Pali cliff at x ~ -26..-30)
  addWaterfallCascade(group, trackMat, {
    x: -28.0,
    y: 22.0,
    z: 14.0,
    width: 1.8,
    height: 30.0,
    rotY: 1.45,
    tiltX: -0.38,
  });
  addWaterfallCascade(group, trackMat, {
    x: -26.0,
    y: 20.0,
    z: -20.0,
    width: 1.7,
    height: 28.0,
    rotY: 1.72,
    tiltX: -0.38,
  });

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-10.0, 58.0);
  const [laCx, laCz] = toCanon(-5.0, 52.0);
  const [huCx, huCz] = toCanon(-24.0, 44.0);
  const [elCx, elCz] = toCanon(18.0, 48.0);
  const [ciCx, ciCz] = toCanon(26.0, 60.0);
  const oahuClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 8.0 },
    { x: huCx, z: huCz, r: 9.0 },
    { x: elCx, z: elCz, r: 9.0 },
    { x: ciCx, z: ciCz, r: 12.5 },
  ];
  const oahuIsClear = (px, pz) => {
    for (const bz of oahuClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    for (const [hx, hz] of OAHU_HUT_SPECS) {
      if (Math.hypot(px - hx, pz - hz) < 5.5) return false;
    }
    for (const [ax, az, bx, bz] of [
      [48.0, -18.0, 48.0, -26.0],
      [48.0, -26.0, 50.0, -34.0],
      [50.0, -34.0, 55.6, -30.4],
      [55.6, -30.4, 60.0, -26.0],
    ]) {
      if (kauaiDistToSeg(px, pz, ax, az, bx, bz).d < 5.5) return false;
    }
    return true;
  };

  // Dense Red-Heartwood Miro & Koa Timber Forest Grove (filtered through oahuIsClear)
  const miroPts = [];
  for (const [mx, mz, sc] of [
    [22.0, 34.0, 1.15],
    [16.0, 26.0, 1.22],
    [28.0, 16.0, 1.1],
    [18.0, 10.0, 1.18],
    [24.0, -2.0, 1.08],
    [16.0, -14.0, 1.12],
    [26.0, -24.0, 1.06],
    [34.0, 32.0, 1.04],
    [32.0, 10.0, 1.1],
    [30.0, -8.0, 1.08],
    [14.0, 38.0, 1.14],
    [12.0, -28.0, 1.12],
  ]) {
    if (!oahuIsClear(mx, mz)) continue;
    const my = evalOahuPoint(mx, mz).h;
    if (my > 1.8 && my < 24.0) {
      miroPts.push([mx, my - 0.2, mz, sc, mx * 0.4]);
    }
  }
  addBroadleafTrees(group, trackMat, miroPts, {
    trunkHex: 0x6b331e,
    canopyHexA: 0x5c4c22, // Warm bronze-olive Koa/Miro crown
    canopyHexB: 0x2e5b27, // Deep emerald Milo foliage
    blossomHex: 0xb86b2b, // Russet seedpods/heartwood hue
  });

  // Stacked Seasoned Red Miro Drum-Wood Logs on Beach Skids near Forester Malia's Timber Store
  const miroLogMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8a3820, roughness: 0.78 })
  );
  const logStack = new THREE.Group();
  const lx = 41.0;
  const lz = 17.5;
  logStack.position.set(lx, Math.max(0.9, evalOahuPoint(lx, lz).h - 0.08), lz);
  logStack.rotation.y = 0.25;
  const logGeo = new THREE.CylinderGeometry(0.28, 0.3, 3.6, 7);
  logGeo.rotateZ(Math.PI * 0.5);
  for (const [ly, lzOff] of [
    [0.28, -0.32],
    [0.28, 0.32],
    [0.72, 0.0],
  ]) {
    const mLog = new THREE.Mesh(logGeo, miroLogMat);
    mLog.position.set(0, ly, lzOff);
    logStack.add(mLog);
  }
  group.add(logStack);

  // Elder Manu's Glowing Beachside Fisher's Hearth (clear of elder arrival (18, 48) and ramp)
  const hx = 43.0;
  const hz = -21.5;
  const hy = Math.max(0.75, evalOahuPoint(hx, hz).h);
  const oahuHearth = createVillageHearthGroup(trackMat, { scale: 1.28 });
  oahuHearth.group.position.set(hx, hy - 0.05, hz);
  group.add(oahuHearth.group);

  // Extra Hawaiian Pili-Grass Hale Village (10 grounded huts spanning Timber Store & Fisher's Bay)
  const huts = OAHU_HUT_SPECS.map(([px, pz, hang, sc, longHouse]) => ({
    x: px,
    y: Math.max(0.8, evalOahuPoint(px, pz).h - 0.12),
    z: pz,
    rotY: -hang,
    scale: sc,
    longHouse,
  }));
  addRegionalHuts(group, trackMat, huts, 'hawaiian');

  addOutriggerCanoe(group, trackMat, {
    x: 61.5,
    y: Math.max(0.45, evalOahuPoint(61.5, -3.5).h + 0.12),
    z: -3.5,
    rotY: 0.18,
  });

  // Coastal Coconut Palms across the barrier beaches (strictly filtered by oahuIsClear)
  const palmPts = [];
  for (let i = 0; i < 42; i += 1) {
    const ang = -1.25 + (i / 41) * 2.5;
    const pr = oahuCoastR(ang) - 6.5 - (i % 3) * 2.4;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    if (!oahuIsClear(px, pz)) continue;
    const py = evalOahuPoint(px, pz).h;
    if (py > 0.7 && py < 7.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.94 + (i % 3) * 0.08, 0.22]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 78.0 };
}

// ============================================================================
// 3. KIRITIMATI — Elongated Claw Land-Atoll, Green Mineral Ponds & Star Shrine
// ============================================================================
// Organic mineral ponds (canon [cx, cz, baseRadius, phase]): emerald-green hypersaline lakes!
const KIRITIMATI_MIRROR_PONDS = [
  [36.0, -4.0, 6.2, 0.3], // Central green mineral lake between village & shrine
  [24.0, 26.0, 6.8, 1.4], // Port mineral lake near drying racks
  [12.0, -34.0, 6.4, 2.2], // Lagoon-side mineral lake near Observation Circle
  [-18.0, 18.0, 7.0, 0.9], // Interior northern emerald pond
  [-26.0, -16.0, 6.5, 3.1], // Interior southern mineral basin
  [-4.0, 42.0, 5.6, 1.8], // Outer port salt-rimmed green pool
];

function kiritimatiOuterR(theta) {
  // Asymmetric claw / crooked hammerhead land-atoll (~20% larger footprint, cove-indented front at theta ~ 0)
  const tw = theta + 0.24 * Math.sin(2.0 * theta - 0.45);
  return (
    63.5 -
    9.5 * Math.cos(2.0 * tw - 0.12) +
    7.6 * Math.sin(3.0 * tw - 0.4) +
    4.2 * Math.cos(4.0 * tw + 0.9) +
    2.2 * Math.sin(5.0 * tw + 0.2)
  );
}

function kiritimatiReefEdgeR(theta) {
  return (
    kiritimatiOuterR(theta) +
    7.2 +
    1.8 * Math.cos(4.0 * theta - 0.3) +
    1.1 * Math.sin(6.0 * theta)
  );
}

function kiritimatiPondRadius(ang, baseR, phase) {
  return (
    baseR *
    (1.0 +
      0.22 * Math.cos(2.0 * ang + phase) +
      0.13 * Math.sin(3.0 * ang - phase * 0.7) +
      0.07 * Math.cos(4.0 * ang + 0.5))
  );
}

function evalKiritimatiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const outerR = kiritimatiOuterR(theta);
  const reefEdgeR = kiritimatiReefEdgeR(theta);
  // Main deep lagoon channel opening on the starboard flank (theta ~ -0.92), keeping front land continuous!
  const passMask = arcMask(theta, -0.92, 0.24, 0.08);

  // Asymmetric crooked interior lagoon basin tucked inside the eastern/starboard bend
  const mainLagoonMask = gaussian2D(x, z, 2.0, -28.0, 22.0, 17.5, -0.45);

  if (r > outerR) {
    if (r <= reefEdgeR) {
      let h = lerp(0.22, -2.5, passMask);
      const moorCove = gaussian2D(x, z, 68.5, 4.0, 7.2, 5.8, 0.0);
      if (moorCove > 0.05) {
        h = lerp(h, -1.5, smoothstep(0.05, 0.45, moorCove));
      }
      return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef', pondRim: 0.0, pondDepth: 0.0 };
    }
    const drop = smoothstep(reefEdgeR, reefEdgeR + 15.0, r);
    let h = lerp(lerp(0.23, -2.5, passMask), -4.2, drop);
    const moorCove = gaussian2D(x, z, 68.5, 4.0, 7.2, 5.8, 0.0);
    if (moorCove > 0.05) {
      h = Math.min(h, lerp(0.1, -1.5, smoothstep(0.05, 0.45, moorCove)));
    }
    return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef', pondRim: 0.0, pondDepth: 0.0 };
  }

  // Broad flat coral-sand & gypsum land table (~2.8m elevation)
  const edgeSlope = smoothstep(outerR, outerR - 9.0, r);
  let h = 0.24 + 2.65 * Math.pow(edgeSlope, 0.75);
  let zone = h < 1.35 ? 'white_sand' : 'atoll_land';

  // Carve asymmetric turquoise lagoon bay opening to the starboard pass
  if (mainLagoonMask > 0.24 || (passMask > 0.1 && r > 18.0)) {
    const lagBlend = clamp01(
      Math.max(smoothstep(0.24, 0.54, mainLagoonMask), passMask * smoothstep(18.0, 38.0, r))
    );
    const lagTarget = lerp(0.18, -2.5, passMask * smoothstep(28.0, 52.0, r));
    h = lerp(h, lagTarget, lagBlend);
    if (lagBlend > 0.55) {
      zone = h < 0.05 ? 'deep_sea' : 'lagoon';
    } else {
      zone = 'white_sand';
    }
  }

  // Carve 6 organic hypersaline green mineral lakes/ponds with pale rose-gypsum salt rims!
  let pondRim = 0.0;
  let pondDepth = 0.0;
  for (let i = 0; i < KIRITIMATI_MIRROR_PONDS.length; i += 1) {
    const [px, pz, pr, phase] = KIRITIMATI_MIRROR_PONDS[i];
    const dx = x - px;
    const dz = z - pz;
    const d = Math.hypot(dx, dz);
    const prVar = kiritimatiPondRadius(Math.atan2(dz, dx), pr, phase);
    if (d < prVar + 3.2 && zone !== 'lagoon' && zone !== 'deep_sea') {
      const inPond = 1.0 - smoothstep(prVar - 1.5, prVar + 0.5, d);
      const rim = Math.exp(-Math.pow((d - (prVar + 0.8)) / 1.5, 2.0));
      pondRim = Math.max(pondRim, rim);
      pondDepth = Math.max(pondDepth, inPond);
      // Keep pond bed at ~0.34m (above main lagoon water sheet 0.25m) so custom green pond surface shines!
      h = lerp(h, 0.34, inPond);
      if (inPond > 0.42) zone = 'mirror_pond';
    }
  }

  // Flat Observation Circle terrace on open salt-pan peninsula at walkable (26, 28) -> canon (28.0, -26.0)
  const dCircle = Math.hypot(x - 28.0, z + 26.0);
  if (dCircle < 10.5) {
    h = lerp(h, 2.6, 1.0 - smoothstep(6.2, 10.5, dCircle));
    if (dCircle < 8.5) zone = 'white_sand';
  }

  // Flat grounded terrace for Keeper Akura's 12-Stone Shrine & Tridacna Altar at walkable (18, 44)
  const dElder = Math.hypot(x - 43.0, z + 19.0);
  if (dElder < 11.5) {
    h = lerp(h, 2.7, 1.0 - smoothstep(7.5, 11.5, dElder));
    if (dElder < 8.5) zone = 'white_sand';
  }

  // Flat grounded terrace for Grand-Voyage Drying Racks at walkable (-26, 38) -> canon (38.0, 26.0)
  const dHut = Math.hypot(x - 38.0, z - 26.0);
  if (dHut < 9.0) {
    h = lerp(h, 2.5, 1.0 - smoothstep(5.5, 9.0, dHut));
    if (dHut < 7.0) zone = 'white_sand';
  }

  // Gentle arrival & spawn beach at walkable (-8, 54) -> canon (54.0, 8.0) and sheltered mooring cove (-4, 65)
  const dSpawn = Math.hypot(x - 54.0, z - 8.0);
  if (dSpawn < 10.0) {
    h = lerp(h, 1.35, 1.0 - smoothstep(6.0, 10.0, dSpawn));
    if (dSpawn < 8.0) zone = 'white_sand';
  }
  const moorCove = gaussian2D(x, z, 68.5, 4.0, 7.2, 5.8, 0.0);
  if (moorCove > 0.08) {
    h = lerp(h, -1.5, smoothstep(0.08, 0.45, moorCove));
    if (h < 0.05) zone = 'deep_sea';
  }

  return { h, zone, pondRim, pondDepth };
}

function buildKiritimatiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.25, 0.44];
  const colLagoon = [0.14, 0.78, 0.75];
  const colMirrorPondDeep = [0.08, 0.42, 0.24]; // Rich Kiritimati emerald-green mineral lake center
  const colMirrorPondRim = [0.24, 0.62, 0.31]; // Olive-green algae/brine shelf around ponds
  const colGypsumRose = [0.94, 0.8, 0.78]; // Rose-gypsum salt flat rims!
  const colSaltWhite = [0.96, 0.94, 0.88];
  const colRenScrub = [0.34, 0.49, 0.29]; // Silvery-olive dry equatorial atoll scrub
  const colPapaCoral = [0.68, 0.62, 0.55];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalKiritimatiPoint,
    maxRadius: 104.0,
    nRings: 92,
    nSegs: 140,
    colorFn: (s) => {
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        return mixRgb(colLagoon, colDeepSea, clamp01(-s.h / 2.4));
      }
      if (s.zone === 'lagoon') return colLagoon;
      if (s.zone === 'mirror_pond') {
        return mixRgb(colMirrorPondRim, colMirrorPondDeep, smoothstep(0.42, 0.9, s.pondDepth));
      }
      if (s.zone === 'papa_reef') return colPapaCoral;
      if (s.zone === 'white_sand') {
        return mixRgb(colSaltWhite, colGypsumRose, s.pondRim * 0.75);
      }
      let rgb = mixRgb(colSaltWhite, colRenScrub, smoothstep(1.35, 2.45, s.h) * 0.82);
      rgb = mixRgb(rgb, colGypsumRose, s.pondRim * 0.85);
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.03,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Contour-matched outer turquoise lagoon sheet sitting below the green interior ponds (y=0.25m < pond 0.34m)
  const mirrorMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x32ddd6, depthWrite: false }),
    0.34
  );
  const lagoonContourGeo = createOrganicLagoonGeometry((t) => kiritimatiOuterR(t) * 0.88, 120);
  const lagoonSheet = new THREE.Mesh(lagoonContourGeo, mirrorMat);
  lagoonSheet.position.y = 0.25;
  group.add(lagoonSheet);

  // Dedicated organic emerald-jade water surfaces filling the 6 interior hypersaline Kiritimati lakes!
  const greenPondMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x2ea65d, depthWrite: false }),
    0.58
  );
  for (let i = 0; i < KIRITIMATI_MIRROR_PONDS.length; i += 1) {
    const [px, pz, pr, phase] = KIRITIMATI_MIRROR_PONDS[i];
    const pondGeo = createOrganicLagoonGeometry(
      (ang) => kiritimatiPondRadius(ang, pr * 0.92, phase),
      32
    );
    const pondWater = new THREE.Mesh(pondGeo, greenPondMat);
    pondWater.position.set(px, 0.44, pz);
    group.add(pondWater);
  }

  // Contour-matched organic outer barrier reef & breaking foam leaving starboard lagoon pass (-0.92) open!
  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe8ddc2, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.75
  );
  addOrganicBarrierReefArc(group, reefMat, foamMat, kiritimatiReefEdgeR, -0.62, Math.PI * 2.0 - 1.22, 84);

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-8.0, 54.0);
  const [laCx, laCz] = toCanon(-4.0, 48.0);
  const [huCx, huCz] = toCanon(-26.0, 38.0);
  const [elCx, elCz] = toCanon(18.0, 44.0);
  const [ciCx, ciCz] = toCanon(26.0, 28.0);
  const kiritClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 8.0 },
    { x: huCx, z: huCz, r: 10.5 },
    { x: elCx, z: elCz, r: 11.5 },
    { x: ciCx, z: ciCz, r: 16.5 },
  ];
  const kiritIsClear = (px, pz) => {
    for (const bz of kiritClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    if (evalKiritimatiPoint(px, pz).zone === 'mirror_pond') return false;
    return true;
  };

  // Keeper Akura's 12-Stone Star-Mirror Shrine + Giant Fluted Tridacna Clam Altar grounded behind elder (18, 44)!
  const shrineCx = 42.5;
  const shrineCz = -17.5;
  addStarStoneCircle(group, trackMat, {
    x: shrineCx,
    y: evalKiritimatiPoint(shrineCx, shrineCz).h - 0.08,
    z: shrineCz,
    radius: 3.4,
    stoneHex: 0xf0ebe0,
    withBraziers: true,
  });

  // Giant Fluted White Tridacna Clam-Shell Sanctuary Altar beside the Shrine
  const altarCx = 44.5;
  const altarCz = -21.5;
  const clamAltar = createSculptedTridacnaAltarGroup(trackMat);
  clamAltar.group.position.set(
    altarCx,
    Math.max(1.2, evalKiritimatiPoint(altarCx, altarCz).h - 0.08),
    altarCz
  );
  clamAltar.group.rotation.y = 0.55;
  group.add(clamAltar.group);

  // Grand Maneaba Pavilion & Coral-Pass Atoll Huts (clear of spawns, POIs & ponds)
  const huts = [
    [huCx - 5.5, huCz + 4.5, -0.42, 1.16, true], // Grand Maneaba behind drying racks (-26, 38)
    [42.0, 36.0, -0.32, 0.96, false],
    [49.0, 32.0, -0.24, 0.92, false],
    [28.0, 44.0, -0.58, 0.95, false],
    [52.0, -24.0, 0.36, 0.94, false],
  ].map(([hx, hz, hang, sc, longHouse]) => ({
    x: hx,
    y: Math.max(0.9, evalKiritimatiPoint(hx, hz).h - 0.1),
    z: hz,
    rotY: -hang + Math.PI,
    scale: sc,
    longHouse,
  }));
  addRegionalHuts(group, trackMat, huts, 'atoll');

  // Lagoon Timber Pier & Outrigger Canoe overlooking the starboard lagoon (clear of circle (28, -26))
  addTimberPier(group, trackMat, {
    x: 13.0,
    y: 0.7,
    z: -41.0,
    rotY: 0.45,
    length: 8.6,
  });
  addOutriggerCanoe(group, trackMat, {
    x: 9.0,
    y: 0.32,
    z: -45.5,
    rotY: 0.48,
  });

  // Silvery-Olive Ren Scrub & Equatorial Coconut Groves (filtered by kiritIsClear)
  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 64; i += 1) {
    const ang = (i / 64) * Math.PI * 2.0;
    const pr = kiritimatiOuterR(ang) - 9.5 - (i % 3) * 3.0;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    if (!kiritIsClear(px, pz)) continue;
    const pt = evalKiritimatiPoint(px, pz);
    if (pt.h > 1.75 && pt.zone === 'atoll_land') {
      palmPts.push([px, pt.h - 0.16, pz, -ang, 0.94, 0.22]);
      if (i % 2 === 0 && kiritIsClear(px * 0.94, pz * 0.94)) {
        const spt = evalKiritimatiPoint(px * 0.94, pz * 0.94);
        if (spt.h > 1.4 && spt.zone !== 'mirror_pond') {
          scrubPts.push([px * 0.94, spt.h - 0.12, pz * 0.94, 1.35, 0.62, 1.2, -ang]);
        }
      }
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x4b6a3e,
    hexB: 0x627e50,
  });

  return { group, materials, sinkDepthM: 13.0 };
}

// ============================================================================
// 4. HAWAI'I — Twin-Mauna Shield, Active Kilauea Calderas, Royal Village,
//              Lo'i Kalo, Loko Kuapa & Black Basalt Lava-Point Peninsula
// ============================================================================
const KILAUEA_CENTER = [-34.0, -28.0];
const KILAUEA_RADIUS = 13.5;
const MAUNA_LOA_CENTER = [-58.0, 22.0];
const MAUNA_LOA_RADIUS = 7.6;

// Leveled coastal benches, temple terrace, canoe-shed apron & taro terrace
// in canonical coordinates (cx, cz), guaranteeing flush prop & platform grounding (maxCornerDiff <= 0.15m).
const HAWAII_LEVEL_PADS = [
  // Lava-Point Peninsula Observation Circle (walkable (32, 62) -> canon (62, -32))
  { cx: 62.0, cz: -32.0, h: 6.5, innerR: 7.5, outerR: 13.5, blend: 1.0 },
  // Great Ancestral Heiau headland terrace (canon (25.5, 50.5))
  { cx: 25.5, cz: 50.5, h: 7.8, innerR: 10.5, outerR: 17.0, blend: 1.0 },
  // Halau Wa'a canoe shed & hull terrace (canon (43.8, 35.0))
  { cx: 43.8, cz: 35.0, h: 3.2, innerR: 7.2, outerR: 10.6, blend: 1.0 },
  // Stepped irrigated Lo'i Kalo wetland terrace (walkable (-12, 27) -> canon (27, 12))
  { cx: 27.0, cz: 12.0, h: 5.8, innerR: 6.2, outerR: 8.8, blend: 1.0 },
  // Steaming Imu earth oven commons plaza (matches Hale Ali'i & Hale Mua height 4.2m)
  { cx: 42.5, cz: 10.5, h: 4.2, innerR: 4.2, outerR: 6.2, blend: 1.0 },
];

// 13 grounded Hawaiian hale huts (placed safely inland cx <= 50.5, clear of landing & walking lanes)
const HAWAII_HUT_SPECS = [
  { cx: 42.0, cz: 5.5, h: 4.2, rotY: -0.14, scale: 1.24, longHouse: true },   // 1. Royal Hale Ali'i
  { cx: 40.5, cz: 15.0, h: 4.2, rotY: 0.16, scale: 1.12, longHouse: true },   // 2. Ceremonial Hale Mua
  { cx: 50.5, cz: 4.2, h: 2.6, rotY: -0.22, scale: 0.96, longHouse: false },  // 3. Hale Noho (shore)
  { cx: 50.5, cz: 13.5, h: 2.6, rotY: 0.08, scale: 0.94, longHouse: false },  // 4. Hale Noho (commons)
  { cx: 48.0, cz: 21.5, h: 2.6, rotY: -0.18, scale: 0.98, longHouse: false }, // 5. Hale Kuku (kapa house)
  { cx: 35.5, cz: 2.2, h: 4.4, rotY: 0.24, scale: 0.96, longHouse: false },   // 6. Hale 'Aina (feast house)
  { cx: 36.5, cz: 23.5, h: 4.6, rotY: -0.3, scale: 0.95, longHouse: false },  // 7. Hale Papa'a (gear store)
  { cx: 36.5, cz: 8.2, h: 4.2, rotY: -0.08, scale: 1.0, longHouse: false },   // 8. Hale Ku'i Kalo (beside Lo'i)
  { cx: 26.0, cz: 32.0, h: 7.4, rotY: -0.38, scale: 0.96, longHouse: false }, // 9. Hale Kalai (carver's hale)
  { cx: 16.5, cz: 38.5, h: 7.8, rotY: -0.52, scale: 1.04, longHouse: true },  // 10. Hale Kahuna (heiau keepers)
  { cx: 45.0, cz: 44.0, h: 2.6, rotY: -0.68, scale: 0.98, longHouse: false }, // 11. Hale Lawai'a (fishpond keeper)
  { cx: 20.5, cz: 21.5, h: 8.2, rotY: -0.2, scale: 0.95, longHouse: false },  // 12. Hale La'au (healer's hale)
  { cx: 29.5, cz: 25.5, h: 5.8, rotY: 0.14, scale: 0.94, longHouse: false },  // 13. Hale Ulana (mat weaver's hale)
];

function evalHawaiiLavaChannels(x, z) {
  // Primary molten river pouring from Kilauea (-34, -28) down the black delta toward coast (-60, -72)
  let flowA = 0.0;
  if (z < -28.0 && z > -76.0) {
    const t = clamp01((-z - 28.0) / 46.0);
    const centerX =
      lerp(-34.0, -58.0, t) + 5.0 * Math.sin(t * Math.PI * 2.4 + 0.35);
    const width = lerp(3.4, 5.2, t);
    flowA = Math.exp(-Math.pow(Math.abs(x - centerX) / width, 2.2));
  }

  // Secondary braided molten fork spilling toward black coastal ledges (-14, -74)
  let flowB = 0.0;
  if (z < -34.0 && z > -76.0) {
    const t = clamp01((-z - 34.0) / 40.0);
    const centerX =
      lerp(-30.0, -14.0, t) - 3.6 * Math.sin(t * Math.PI * 2.0);
    const width = lerp(2.4, 3.8, t);
    flowB = Math.exp(-Math.pow(Math.abs(x - centerX) / width, 2.2));
  }

  return clamp01(Math.max(flowA, flowB));
}

function evalHawaiiCoastR(theta) {
  // Smooth organic Big Island shoreline — zero rectangular inBay wedge cutout.
  // Gentle Kealakekua sandy crescent near theta = +0.10, jutting black Lava-Point Peninsula
  // near theta = -0.48 (canon (62, -32)), and wide basalt lava delta around theta = -2.25.
  const kealakekuaCove = 10.5 * Math.exp(-Math.pow((theta - 0.10) / 0.40, 2.0));
  const lavaPointLobe = 13.5 * Math.exp(-Math.pow((theta + 0.48) / 0.25, 2.0));
  const lavaDeltaLobe = 9.0 * Math.exp(-Math.pow((theta + 2.22) / 0.42, 2.0));
  const portHeadlandLobe = 5.5 * Math.exp(-Math.pow((theta - 0.85) / 0.32, 2.0));
  return (
    76.5 -
    kealakekuaCove +
    lavaPointLobe +
    lavaDeltaLobe +
    portHeadlandLobe +
    2.6 * Math.cos(3.0 * theta - 0.35) +
    1.5 * Math.sin(5.0 * theta + 0.8)
  );
}

function distToSeg2D(x, z, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  const t =
    lenSq > 1e-6
      ? clamp01(((x - ax) * abx + (z - az) * abz) / lenSq)
      : 0.0;
  const px = ax + abx * t;
  const pz = az + abz * t;
  return { d: Math.hypot(x - px, z - pz), t };
}

function evalHawaiiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const coastR = evalHawaiiCoastR(theta);

  if (r > coastR) {
    return {
      h: lerp(0.06, -4.8, smoothstep(coastR, coastR + 12.5, r)),
      inKilauea: 0.0,
      inMaunaLoa: 0.0,
      lavaRiver: 0.0,
      blackLavaField: theta < -0.15 ? 0.9 : 0.0,
      alpineCap: 0.0,
      isGoldenBay: false,
      isValleyMist: false,
    };
  }

  const u = r / coastR;

  // 1. Twin-Mauna Shield Massif (shifted astern-port so Lava-Point Peninsula stays <= 26.5deg horizon!)
  //    - Towering frosted Mauna Kea / Mauna Loa shield summit around canon (-54, 34) (~71m)
  //    - Active Kilauea shield dome on starboard-astern (-34, -28) (~40m crater rim)
  //    - Broad vegetated Hualalai / windward saddle spine sloping gently down toward Kealakekua Bay
  const highMauna = 66.5 * gaussian2D(x, z, -54.0, 34.0, 29.0, 26.0, 0.22);
  const kilaueaDome = 41.0 * gaussian2D(x, z, -34.0, -28.0, 26.5, 25.5, -0.18);
  const uplandSpine = 24.5 * gaussian2D(x, z, -10.0, 26.0, 24.0, 22.0, -0.2);
  const baseShield = 15.5 * Math.pow(smoothstep(1.0, 0.14, u), 1.2);
  // Coastal cliffs wrap windward/astern shores while Kealakekua bay & black lava-point shelf stay low
  const notCove =
    1.0 -
    clamp01(
      Math.exp(-Math.pow((theta - 0.08) / 0.52, 2.0)) +
        0.92 * Math.exp(-Math.pow((theta + 0.48) / 0.34, 2.0))
    );
  const basaltSeaCliffs = 8.5 * notCove * smoothstep(1.0, 0.85, u) * smoothstep(0.62, 0.86, u);

  let h =
    baseShield +
    Math.max(highMauna, kilaueaDome * 0.88, uplandSpine) +
    basaltSeaCliffs +
    1.2 * Math.sin(x * 0.09) * Math.cos(z * 0.08) * (1.0 - smoothstep(0.65, 1.0, u));

  // Suppress upland height on the starboard Lava-Point basalt shelf (cz < -4, cx > 28)
  // so there is NO green hill to the right of Kealakekua landing!
  if (x > 18.0 && z < 4.0) {
    const rightShelfSuppress =
      smoothstep(18.0, 42.0, x) * smoothstep(4.0, -14.0, z);
    const shelfTarget = lerp(4.2, 2.4, smoothstep(45.0, 82.0, r));
    h = lerp(h, Math.min(h, shelfTarget), rightShelfSuppress * 0.82);
  }

  // 2. Open-Top Sunken Kilauea (Halema'uma'u) Caldera with south-astern spillway notch
  const kd = Math.hypot(x - KILAUEA_CENTER[0], z - KILAUEA_CENTER[1]);
  const kRimRaise = 5.2 * Math.exp(-Math.pow((kd - KILAUEA_RADIUS) / 3.4, 2.0));
  const kSpillway =
    arcMask(
      Math.atan2(z - KILAUEA_CENTER[1], x - KILAUEA_CENTER[0]),
      -1.85,
      0.34,
      0.14
    ) * Math.exp(-Math.pow((kd - KILAUEA_RADIUS) / 4.2, 2.0));
  const inKilauea = 1.0 - smoothstep(KILAUEA_RADIUS - 2.6, KILAUEA_RADIUS + 0.5, kd);
  h += kRimRaise * (1.0 - 0.72 * kSpillway);
  h = lerp(h, 33.8, inKilauea);

  // 3. Upper Mauna Loa Glowing Summit Caldera
  const md = Math.hypot(x - MAUNA_LOA_CENTER[0], z - MAUNA_LOA_CENTER[1]);
  const mRimRaise = 4.2 * Math.exp(-Math.pow((md - MAUNA_LOA_RADIUS) / 2.6, 2.0));
  const inMaunaLoa = 1.0 - smoothstep(MAUNA_LOA_RADIUS - 1.8, MAUNA_LOA_RADIUS + 0.4, md);
  h += mRimRaise;
  h = lerp(h, 58.2, inMaunaLoa);

  // 4. Molten Lava River Channels incised cleanly into the black basalt delta
  const lavaRiver = inKilauea > 0.5 ? 0.0 : evalHawaiiLavaChannels(x, z);
  h -= 0.72 * lavaRiver;

  // 5. Gently sloped sandy Kealakekua Bay shelf (around +X, theta near 0.08)
  const bayShelfMask = Math.exp(-Math.pow((theta - 0.10) / 0.36, 2.0)) * smoothstep(0.76, 0.97, u);
  if (bayShelfMask > 0.02) {
    h = lerp(h, 1.55 * (1.0 - smoothstep(0.84, 1.0, u)) + 0.15, bayShelfMask * 0.88);
  }

  // 6. Gentle walkable corridors (slope <= 0.25 everywhere!)
  // 6a. Beach (62.2, 2.0) across bare black basalt shelf (62.8, -16.0) to Lava-Point Circle (62.0, -32.0)
  const shelfSegA = distToSeg2D(x, z, 62.2, 2.0, 62.8, -16.0);
  if (shelfSegA.d < 10.5) {
    const mask = smoothstep(10.5, 4.8, shelfSegA.d);
    h = lerp(h, lerp(1.5, 3.8, shelfSegA.t), mask);
  }
  const shelfSegB = distToSeg2D(x, z, 62.8, -16.0, 62.0, -32.0);
  if (shelfSegB.d < 10.5) {
    const mask = smoothstep(10.5, 4.8, shelfSegB.d);
    h = lerp(h, lerp(3.8, 6.5, shelfSegB.t), mask);
  }

  // 6b. Landing (61.5, 16.0) -> Halau Wa'a (49.0, 31.5) -> Great Heiau courtyard (33.0, 44.0)
  const pathCanoe = distToSeg2D(x, z, 61.5, 16.0, 49.0, 31.5);
  if (pathCanoe.d < 9.5) {
    const mask = smoothstep(9.5, 4.2, pathCanoe.d);
    h = lerp(h, lerp(1.6, 3.2, pathCanoe.t), mask * 0.9);
  }
  const pathHeiau = distToSeg2D(x, z, 49.0, 31.5, 33.0, 44.0);
  if (pathHeiau.d < 9.0) {
    const mask = smoothstep(9.0, 4.2, pathHeiau.d);
    h = lerp(h, lerp(3.2, 7.8, pathHeiau.t), mask * 0.92);
  }

  // 6c. Village commons link: landing (59, 14) -> Hale Ali'i plaza (44.5, 10.5) -> Lo'i Kalo (27, 12)
  const pathLoi = distToSeg2D(x, z, 44.5, 10.5, 27.0, 12.0);
  if (pathLoi.d < 8.5) {
    const mask = smoothstep(8.5, 3.8, pathLoi.d);
    h = lerp(h, lerp(4.2, 5.8, pathLoi.t), mask * 0.85);
  }

  // 7. Apply leveled pads for 13 huts first (innerR=4.05 covers full 2.4m half-diag corners cleanly)
  for (let i = 0; i < HAWAII_HUT_SPECS.length; i += 1) {
    const hs = HAWAII_HUT_SPECS[i];
    const dh = Math.hypot(x - hs.cx, z - hs.cz);
    if (dh < 5.6) {
      h = lerp(h, hs.h, smoothstep(5.6, 4.05, dh));
    }
  }
  for (let i = 0; i < HAWAII_LEVEL_PADS.length; i += 1) {
    const pad = HAWAII_LEVEL_PADS[i];
    const dp = Math.hypot(x - pad.cx, z - pad.cz);
    if (dp < pad.outerR) {
      const m = smoothstep(pad.outerR, pad.innerR, dp) * (pad.blend ?? 1.0);
      h = lerp(h, pad.h, m);
    }
  }

  // Shore waterline fade right along outer perimeter so coastline bevels softly into surf
  h *= smoothstep(coastR + 0.35, coastR - 2.6, r);

  // Vertex material zones: black pahoehoe lava covers starboard headland & Lava-Point Peninsula (cz < -1.5)
  const peninsulaBasalt = smoothstep(1.5, -6.5, z) * smoothstep(26.0, 46.0, r);
  const kilaueaLavaZone = smoothstep(0.0, -24.0, z) * smoothstep(14.0, 34.0, r);
  const blackLavaField = clamp01(
    Math.max(peninsulaBasalt, kilaueaLavaZone * 0.94, inKilauea, lavaRiver)
  );
  const alpineCap =
    inMaunaLoa < 0.22 && z > 2.0 ? smoothstep(56.0, 67.5, h) : 0.0;
  const isGoldenBay =
    u > 0.79 && theta > -0.14 && theta < 0.56 && h < 2.25;

  return {
    h,
    inKilauea,
    inMaunaLoa,
    lavaRiver,
    blackLavaField,
    alpineCap,
    isGoldenBay,
    isValleyMist: false,
  };
}

function createGlowingLavaLakeMesh(trackMat, radius, yLevel) {
  const nRings = 24;
  const nSegs = 48;
  const positions = [];
  const colors = [];
  const indices = [];
  const grid = [];

  const colWhiteGold = [1.0, 0.95, 0.38];
  const colBrightOrange = [1.0, 0.44, 0.06];
  const colCrimsonMagma = [0.86, 0.14, 0.03];
  const colDarkCrust = [0.16, 0.05, 0.04];

  for (let i = 0; i <= nRings; i += 1) {
    const u = i / nRings;
    const r = Math.max(0.02, radius * u);
    const row = [];
    for (let j = 0; j < nSegs; j += 1) {
      const th = (j / nSegs) * Math.PI * 2.0;
      const lx = r * Math.cos(th);
      const lz = r * Math.sin(th);

      const coreHot = Math.exp(-Math.pow(u / 0.34, 2.0));
      const crackA = Math.abs(Math.sin(4.0 * th + u * 5.2));
      const crackB = Math.abs(Math.cos(6.0 * th - u * 6.8));
      const fissure =
        Math.pow(1.0 - Math.min(crackA, crackB), 4.5) * smoothstep(0.15, 0.95, u);
      const rimGlow = smoothstep(0.78, 1.0, u) * 0.75;

      const heat = clamp01(coreHot * 1.1 + fissure * 0.95 + rimGlow);
      let rgb;
      if (heat > 0.72) {
        rgb = mixRgb(colBrightOrange, colWhiteGold, (heat - 0.72) / 0.28);
      } else if (heat > 0.32) {
        rgb = mixRgb(colCrimsonMagma, colBrightOrange, (heat - 0.32) / 0.4);
      } else {
        rgb = mixRgb(colDarkCrust, colCrimsonMagma, heat / 0.32);
      }

      const ly = yLevel + 0.85 * coreHot + 0.18 * fissure;
      const idx = positions.length / 3;
      positions.push(lx, ly, lz);
      colors.push(rgb[0], rgb[1], rgb[2]);
      row.push(idx);
    }
    grid.push(row);
  }

  for (let i = 0; i < nRings; i += 1) {
    for (let j = 0; j < nSegs; j += 1) {
      const jNext = (j + 1) % nSegs;
      indices.push(
        grid[i][j],
        grid[i][jNext],
        grid[i + 1][jNext],
        grid[i][j],
        grid[i + 1][jNext],
        grid[i + 1][j]
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);

  const mat = trackMat(new THREE.MeshBasicMaterial({ vertexColors: true }));
  return new THREE.Mesh(geo, mat);
}

function createGlowingLavaRiverRibbon(
  trackMat,
  pathFn,
  zStart,
  zEnd,
  halfWidthStart,
  halfWidthEnd
) {
  const steps = 36;
  const positions = [];
  const colors = [];
  const indices = [];

  const colCore = [1.0, 0.78, 0.2];
  const colEdge = [0.92, 0.2, 0.03];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const z = lerp(zStart, zEnd, t);
    const cx = pathFn(t);
    const hw = lerp(halfWidthStart, halfWidthEnd, t);

    for (let k = 0; k <= 2; k += 1) {
      const offset = (k - 1) * hw;
      const px = cx + offset;
      const py = Math.max(0.28, evalHawaiiPoint(px, z).h + (k === 1 ? 0.36 : 0.18));
      positions.push(px, py, z);
      const c = k === 1 ? colCore : colEdge;
      colors.push(c[0], c[1], c[2]);
    }

    if (i < steps) {
      const b = i * 3;
      indices.push(
        b, b + 3, b + 4, b, b + 4, b + 1,
        b + 1, b + 4, b + 5, b + 1, b + 5, b + 2
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);

  const mat = trackMat(
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
  );
  return new THREE.Mesh(geo, mat);
}

function hawaiiIsClear(x, z) {
  // Keep landing strip, canoe, trails, village pads, taro paddies, lava channels & Lava-Point Circle open
  if (Math.hypot(x - 62.0, z - -32.0) < 18.0) return false; // Lava-Point Circle sky clearance
  if (Math.hypot(x - 61.5, z - 16.0) < 9.0) return false; // Initial spawn
  if (Math.hypot(x - 62.5, z - 10.0) < 7.5) return false; // Canoe landing
  if (Math.hypot(x - 45.0, z - 32.5) < 11.5) return false; // Halau Wa'a
  if (Math.hypot(x - 32.0, z - 44.0) < 13.5) return false; // Great Heiau
  if (Math.hypot(x - 27.0, z - 12.0) < 9.5) return false; // Lo'i Kalo
  if (Math.hypot(x - 43.0, z - 10.5) < 6.5) return false; // Imu pit
  if (distToSeg2D(x, z, 62.2, 2.0, 62.0, -32.0).d < 8.0) return false; // Lava-Point shelf trail
  if (distToSeg2D(x, z, 61.5, 16.0, 32.0, 44.0).d < 7.5) return false; // Beach -> Heiau trail
  for (let i = 0; i < HAWAII_HUT_SPECS.length; i += 1) {
    const hs = HAWAII_HUT_SPECS[i];
    if (Math.hypot(x - hs.cx, z - hs.cz) < 6.2) return false;
  }
  const s = evalHawaiiPoint(x, z);
  if (s.inKilauea > 0.1 || s.inMaunaLoa > 0.1 || s.lavaRiver > 0.08) return false;
  if (s.blackLavaField > 0.6) return false; // Never grow lush forest on fresh black lava shelf!
  return true;
}

function buildHawaiiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.22, 0.41];
  const colGoldenSand = [0.92, 0.82, 0.58];
  const colOhiaEmerald = [0.16, 0.46, 0.20];
  const colUplandKoa = [0.25, 0.42, 0.19];
  const colBlackPahoehoe = [0.09, 0.09, 0.11];
  const colWeatheredLava = [0.16, 0.15, 0.17];
  const colCraterScoria = [0.28, 0.11, 0.08];
  const colMoltenOrange = [1.0, 0.42, 0.06];
  const colMoltenGold = [1.0, 0.86, 0.25];
  const colMaunaFrost = [0.84, 0.86, 0.89];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalHawaiiPoint,
    maxRadius: 120.0,
    nRings: 112,
    nSegs: 160,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.inKilauea > 0.65 || s.inMaunaLoa > 0.65) {
        return mixRgb(colCraterScoria, colMoltenOrange, 0.75);
      }
      if (s.lavaRiver > 0.3) {
        const coreT = smoothstep(0.3, 0.88, s.lavaRiver);
        return mixRgb(
          colCraterScoria,
          mixRgb(colMoltenOrange, colMoltenGold, coreT),
          coreT
        );
      }
      if (s.isGoldenBay) {
        return mixRgb(colGoldenSand, colOhiaEmerald, smoothstep(1.25, 2.25, s.h));
      }

      let rgb = mixRgb(colOhiaEmerald, colUplandKoa, smoothstep(12.0, 44.0, s.h));
      const lavaCoat = mixRgb(colWeatheredLava, colBlackPahoehoe, smoothstep(0.35, 0.95, s.blackLavaField));
      rgb = mixRgb(rgb, lavaCoat, clamp01(s.blackLavaField * 0.96));
      if (s.inKilauea > 0.05 || s.inMaunaLoa > 0.05) {
        rgb = mixRgb(rgb, colCraterScoria, 0.78);
      }
      rgb = mixRgb(rgb, colBlackPahoehoe, smoothstep(0.95, 1.85, slope) * 0.75);
      if (s.alpineCap > 0.01) {
        rgb = mixRgb(rgb, colMaunaFrost, s.alpineCap * 0.82);
      }
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.05,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 1. Open-Top Glowing Molten Lava Lakes (Kilauea Halema'uma'u & Mauna Loa Summit Caldera)
  const kilaueaLake = createGlowingLavaLakeMesh(trackMat, KILAUEA_RADIUS - 1.5, 34.25);
  kilaueaLake.position.set(KILAUEA_CENTER[0], 0.0, KILAUEA_CENTER[1]);
  group.add(kilaueaLake);

  const maunaLoaLake = createGlowingLavaLakeMesh(trackMat, MAUNA_LOA_RADIUS - 1.1, 58.65);
  maunaLoaLake.position.set(MAUNA_LOA_CENTER[0], 0.0, MAUNA_LOA_CENTER[1]);
  group.add(maunaLoaLake);

  const lavaGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff5a14,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    0.46
  );
  const kGlowHalo = new THREE.Mesh(
    new THREE.RingGeometry(KILAUEA_RADIUS - 2.6, KILAUEA_RADIUS + 3.0, 36),
    lavaGlowMat
  );
  kGlowHalo.rotation.x = -Math.PI * 0.5;
  kGlowHalo.position.set(KILAUEA_CENTER[0], 35.8, KILAUEA_CENTER[1]);
  group.add(kGlowHalo);

  const mGlowHalo = new THREE.Mesh(
    new THREE.RingGeometry(MAUNA_LOA_RADIUS - 1.8, MAUNA_LOA_RADIUS + 2.2, 28),
    lavaGlowMat
  );
  mGlowHalo.rotation.x = -Math.PI * 0.5;
  mGlowHalo.position.set(MAUNA_LOA_CENTER[0], 59.8, MAUNA_LOA_CENTER[1]);
  group.add(mGlowHalo);

  // 2. Self-Luminous 3D Braided Molten Lava Rivers Pouring Down to the Sea
  const riverA = createGlowingLavaRiverRibbon(
    trackMat,
    (t) => lerp(-34.0, -58.0, t) + 5.0 * Math.sin(t * Math.PI * 2.4 + 0.35),
    -28.5,
    -74.0,
    2.6,
    4.0
  );
  group.add(riverA);

  const riverB = createGlowingLavaRiverRibbon(
    trackMat,
    (t) => lerp(-30.0, -14.0, t) - 3.6 * Math.sin(t * Math.PI * 2.0),
    -35.0,
    -73.0,
    1.8,
    3.0
  );
  group.add(riverB);

  // 3. Ocean-Entry Lava Steam Clouds (lightweight sculpted cloud puffs with gentle rise & dissipation)
  const oceanEntryGlowMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff6218, depthWrite: false }),
    0.82
  );
  const steamPuffs = [];
  for (const [mouthIdx, [sx, sz, sc]] of [
    [-57.5, -74.5, 1.45],
    [-14.5, -73.5, 1.15],
  ].entries()) {
    const entryGlow = new THREE.Mesh(
      new THREE.CircleGeometry(3.2 * sc, 16),
      oceanEntryGlowMat
    );
    entryGlow.rotation.x = -Math.PI * 0.5;
    entryGlow.position.set(sx, 0.34, sz);
    group.add(entryGlow);

    for (let p = 0; p < 4; p += 1) {
      const variantKey =
        TRADE_CLOUD_VARIANT_KEYS[(mouthIdx * 3 + p) % TRADE_CLOUD_VARIANT_KEYS.length];
      const puff = createSculptedCloudMesh(variantKey, { opacity: 0.56 });
      puff.mesh.castShadow = false;
      puff.mesh.receiveShadow = false;
      trackMat(puff.material, 0.56);
      group.add(puff.mesh);
      steamPuffs.push({
        mesh: puff.mesh,
        material: puff.material,
        sx,
        sz,
        sc,
        phase: p / 4.0 + mouthIdx * 0.13,
        riseSpeed: 0.085 + p * 0.008,
        rotBase: mouthIdx * 1.4 + p * 1.1,
        rotDir: p % 2 === 0 ? 1.0 : -1.0,
      });
    }
  }

  const updateHawaiiSteam = (elapsedSec = 0.0, opts = null) => {
    const t = Math.max(0.0, elapsedSec);
    const baseGlowOp = 0.72 + 0.16 * Math.sin(t * 2.6);
    oceanEntryGlowMat.userData.baseOpacity = baseGlowOp;
    const masterFade = opts?.alpha ?? oceanEntryGlowMat.userData?.fadeAlpha ?? 1.0;
    oceanEntryGlowMat.opacity = baseGlowOp * masterFade;

    const rawDaylight = opts?.daylight ?? 0.9;
    const rawTwilight = opts?.twilight ?? 0.14;
    // Keep steam softly visible over glowing lava entry even around dusk/night
    const steamDaylight = Math.max(0.28, rawDaylight);
    const steamTwilight = Math.max(rawTwilight, 0.32 * (1.0 - rawDaylight));

    for (let i = 0; i < steamPuffs.length; i += 1) {
      const sp = steamPuffs[i];
      const life = ((sp.phase + t * sp.riseSpeed) % 1.0 + 1.0) % 1.0;
      const smoothIn = life < 0.18 ? life / 0.18 : 1.0;
      const fadeStart = 0.42;
      const tOut = life > fadeStart ? (life - fadeStart) / (1.0 - fadeStart) : 0.0;
      const smoothOut = 1.0 - tOut * tOut * (3.0 - 2.0 * tOut);
      const puffOpacity = 0.56 * smoothIn * smoothOut;

      sp.material.userData.puffOpacity = puffOpacity;
      const fadeAlpha = opts?.alpha ?? sp.material.userData?.fadeAlpha ?? 1.0;
      const finalOpacity = puffOpacity * fadeAlpha;

      const puffScale = (0.095 + 0.145 * Math.pow(life, 0.78)) * sp.sc;
      sp.mesh.scale.set(puffScale, puffScale * 1.16, puffScale);
      sp.mesh.position.set(
        sp.sx - life * 3.6 * sp.sc + Math.sin(life * Math.PI * 2.0 + sp.rotBase) * 0.7,
        1.7 + life * 11.2 * sp.sc,
        sp.sz - life * 3.2 * sp.sc
      );
      sp.mesh.rotation.y = sp.rotBase + life * 0.55 * sp.rotDir;
      sp.mesh.visible = finalOpacity > 0.015;

      updateCloudMaterialUniforms(sp.material, {
        sunDir: opts?.sunDir,
        daylight: steamDaylight,
        twilight: steamTwilight,
        opacity: finalOpacity,
        lapaGlow: 0.0,
        elapsedSec: t * 2.6,
      });
    }
  };
  updateHawaiiSteam(0.0);

  // Organic Barrier Reef Surf Contour hugging evalHawaiiCoastR (open across Kealakekua Bay)
  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2c25, roughness: 0.96 }),
    0.92
  );
  const surfFoamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.72
  );
  addOrganicBarrierReefArc(
    group,
    reefMat,
    surfFoamMat,
    (th) => evalHawaiiCoastR(th) + 5.5,
    0.42,
    Math.PI * 2.0 - 0.14,
    96,
    { reefWidth: 4.2, foamWidth: 2.8, foamOffset: 1.8 }
  );

  // Dramatic black-basalt Sea Arch off the tip of Lava-Point Peninsula (canon (74, -49))
  const basaltMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1d1d21, roughness: 0.94 })
  );
  const archLeft = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), basaltMat);
  archLeft.scale.set(0.9, 1.75, 1.0);
  archLeft.position.set(72.0, 1.8, -46.0);
  group.add(archLeft);
  const archRight = new THREE.Mesh(new THREE.DodecahedronGeometry(2.9, 1), basaltMat);
  archRight.scale.set(0.9, 1.65, 1.0);
  archRight.position.set(76.0, 1.6, -52.0);
  group.add(archRight);
  const archSpan = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.9, 3.2), basaltMat);
  archSpan.position.set(74.0, 5.4, -49.0);
  archSpan.rotation.y = -0.95;
  group.add(archSpan);

  // 4. Lava-Point Peninsula Observation Circle (canon (62, -32) -> walkable (32, 62), h = 6.5m)
  const lavaCirclePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 4.3, 0.24, 18),
    basaltMat
  );
  lavaCirclePlinth.position.set(62.0, 6.42, -32.0);
  lavaCirclePlinth.receiveShadow = true;
  group.add(lavaCirclePlinth);
  for (let m = 0; m < 8; m += 1) {
    const ma = (m / 8) * Math.PI * 2.0;
    const cairn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 0.42, 6),
      basaltMat
    );
    cairn.position.set(62.0 + 4.3 * Math.cos(ma), 6.58, -32.0 + 4.3 * Math.sin(ma));
    group.add(cairn);
  }

  // 5. The Great Ancestral Heiau Ahu (canon (25.5, 50.5), leveled pad h = 7.8m)
  addMaraePlatform(group, trackMat, {
    x: 25.5,
    y: 7.8,
    z: 50.5,
    rotY: -0.78,
    scale: 1.24,
    courtHex: 0x222124,
    ahuHex: 0x363438,
    withOracleTower: true,
    withBraziers: true,
  });

  // Flanking carved Ki'i Akua + feathered Kahili & Pulo'ulo'u standards at Heiau & Hale Ali'i
  for (const [kx, kz, ky, kr, ks] of [
    [30.5, 54.0, 7.8, -0.72, 1.08],
    [21.5, 45.5, 7.8, -0.82, 1.06],
    [45.5, 7.8, 4.2, -0.15, 0.92],
  ]) {
    const { group: kGroup } = createHawaiianKahiliAndKiiGroup(trackMat, { scale: ks });
    kGroup.position.set(kx, ky, kz);
    kGroup.rotation.y = kr;
    group.add(kGroup);
  }

  // 6. Grounded Halau Wa'a Shipwright Canoe Shed + Carved Koa Hull Pair (h = 3.2m)
  const { group: shed } = createSculptedShipwrightShedGroup(trackMat, { scale: 1.05 });
  shed.position.set(42.0, 3.2, 34.5);
  shed.rotation.y = -0.62;
  group.add(shed);

  const { group: hullPair } = createCarvedHullPairGroup(trackMat, { scale: 1.0 });
  hullPair.position.set(46.2, 3.2, 36.2);
  hullPair.rotation.y = -0.52;
  group.add(hullPair);

  // 7. 13 Grounded Hawaiian Hale Huts (on leveled pads)
  const huts = HAWAII_HUT_SPECS.map((hs) => ({
    x: hs.cx,
    y: evalHawaiiPoint(hs.cx, hs.cz).h,
    z: hs.cz,
    rotY: hs.rotY,
    scale: hs.scale,
    longHouse: hs.longHouse,
  }));
  addRegionalHuts(group, trackMat, huts, 'hawaiian');

  // 8. Stepped Irrigated Lo'i Kalo Wetland Taro Paddies + Steaming Imu Feast Pit
  const { group: loiKalo } = createHawaiianLoiKaloGroup(trackMat);
  loiKalo.position.set(27.0, 5.8, 12.0);
  loiKalo.rotation.y = -0.1;
  group.add(loiKalo);

  const { group: imuPit } = createHawaiianImuPitGroup(trackMat, { scale: 1.08 });
  imuPit.position.set(43.0, 4.2, 10.5);
  group.add(imuPit);

  // 9. Monumental Loko Kuapa Coastal Basalt Fishpond in sheltered port cove
  const { group: lokoIa } = createHawaiianLokoIaFishpondGroup(trackMat, { radius: 8.6 });
  lokoIa.position.set(58.0, 0.0, 49.0);
  lokoIa.rotation.y = -0.68;
  group.add(lokoIa);

  // Pier & moored outrigger canoes along Kealakekua Bay
  addTimberPier(group, trackMat, {
    x: 68.5,
    y: 0.72,
    z: 7.5,
    rotY: 0.1,
    length: 8.2,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 66.2,
    y: Math.max(0.45, evalHawaiiPoint(66.2, -1.5).h + 0.16),
    z: -1.5,
    rotY: 0.18,
    scale: 1.12,
  });

  // 10. Cascading Windward Valley Waterfall (Wailele) feeding Lo'i Kalo
  const waterfallMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x9be7ff, depthWrite: false }),
    0.78
  );
  for (let s = 0; s < 10; s += 1) {
    const t0 = s / 10;
    const t1 = (s + 1) / 10;
    const x0 = lerp(-12.0, 22.0, t0);
    const z0 = lerp(18.0, 12.0, t0);
    const x1 = lerp(-12.0, 22.0, t1);
    const z1 = lerp(18.0, 12.0, t1);
    const y0 = evalHawaiiPoint(x0, z0).h + 0.24;
    const y1 = evalHawaiiPoint(x1, z1).h + 0.24;
    const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const wfSeg = new THREE.Mesh(
      new THREE.BoxGeometry(1.6 + t0 * 1.1, 0.26, segLen + 0.35),
      waterfallMat
    );
    wfSeg.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    wfSeg.lookAt(x1, y1, z1);
    group.add(wfSeg);
  }

  // 11. Crimson 'Ohi'a Lehua Forest & Coastal Palms (kept strictly off Lava-Point & landing)
  const ohiaPts = [];
  for (const [ox, oz, sc, rot] of [
    [14.0, 28.0, 1.18, 0.4],
    [16.5, 42.0, 1.12, 1.1],
    [12.5, 16.0, 1.2, 2.0],
    [18.0, 5.0, 1.15, 0.7],
    [22.0, 54.0, 1.1, 1.5],
    [38.0, 56.0, 1.08, 2.4],
    [10.0, 36.0, 1.22, 0.2],
    [4.0, 24.0, 1.18, 1.9],
    [6.5, 44.0, 1.15, 2.8],
    [29.0, 58.0, 1.06, 0.9],
    [18.5, 26.5, 1.14, 1.3],
    [42.5, 48.5, 1.06, 2.2],
    [8.0, 6.0, 1.16, 0.6],
    [26.0, 1.5, 1.05, 1.7],
  ]) {
    if (!hawaiiIsClear(ox, oz)) continue;
    const oy = evalHawaiiPoint(ox, oz).h;
    if (oy > 2.2 && oy < 36.0) {
      ohiaPts.push([ox, oy - 0.18, oz, sc, rot]);
    }
  }
  addBroadleafTrees(group, trackMat, ohiaPts, {
    canopyHexA: 0x1e5220,
    canopyHexB: 0x316b29,
    blossomHex: 0xe32b22,
  });

  const palmPts = [];
  for (const [px, pz, lean] of [
    [60.0, 22.0, -0.25],
    [55.0, 38.0, -0.55],
    [57.5, 19.5, -0.2],
    [54.5, 4.5, 0.15],
    [41.5, 51.5, -0.65],
    [38.0, 55.0, -0.75],
  ]) {
    if (!hawaiiIsClear(px, pz)) continue;
    const py = evalHawaiiPoint(px, pz).h;
    if (py > 0.8 && py < 9.0) {
      palmPts.push([px, py - 0.15, pz, lean, 1.05, 0.2]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 88.0, update: updateHawaiiSteam };
}

export function createAct3IslandAssembly(islandId) {
  switch (islandId) {
    case 'kauai':
      return buildKauaiAssembly();
    case 'oahu':
      return buildOahuAssembly();
    case 'kiritimati':
      return buildKiritimatiAssembly();
    case 'hawaii':
      return buildHawaiiAssembly();
    default:
      return null;
  }
}
