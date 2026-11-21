/**
 * Sculpted 3D Terrain, Cliffs, Lagoons, Vegetation & Cultural Landmarks for Act II Islands:
 * - Nuku Hiva ("Towering Valley Hub"): Taiohae horseshoe caldera bay, sheer reefless sea-cliffs,
 *   34m Hakaui waterfall, Master Teiki's Tohua plaza & Marquesan stone-paepae fa'e village.
 * - Ua Pou ("Basalt Spire Isle"): 6 soaring vertical phonolite basalt needle spires (Oave, Pouakei),
 *   golden-ochre & emerald flanks, pebble cove, Vaea's Bone-Carvers' Terrace & whale-rib arches.
 * - Rangiroa ("Immense Coral Atoll"): Twin deep passes (Tiputa & Avatoru), Les Sables Roses pink
 *   coral sandbar, black-pearl oyster lagoon lines, Tane's coral-walled village & twin piers.
 * - Hiva Oa ("Volcanic Quarry Isle"): Mount Temetiu dark ridge, oxidized red-tuff quarry face,
 *   black volcanic sand bay, and Tahia's sculpted red-tuff Marquesan Tiki statues on stone paepae.
 * - Fatu Hiva ("Cliff-Walled Forest Isle"): Hanavave columnar basalt sea-pillar towers framing
 *   Waterfall Bay, twin rainforest cascades, and Oihanu's Great Vaka Moana Shipwright Shed & slipway.
 * - Mangareva ("Outer Lagoon Gateway"): Asymmetric Mount Duff tilted wedge ridge + Mount Mokoto
 *   inside an expansive turquoise lapa barrier lagoon with Elder Rongo's white-coral Gateway Marae.
 */

import * as THREE from 'three';
import {
  addBarrierReefArc,
  addBroadleafTrees,
  addCoconutGroves,
  addCoastalScrub,
  addMaraePlatform,
  addOutriggerCanoe,
  addRegionalHuts,
  addTimberPier,
  addWaterfallCascade,
  arcMask,
  buildPolarTerrainGeometry,
  clamp01,
  createMaterialTracker,
  gaussian2D,
  lerp,
  mixRgb,
  smoothstep,
} from './IslandSculptToolkit.js';
import {
  createCarvedHullPairGroup,
  createMarquesanTikiSculpture,
  createPearlLineClusterGroup,
  createQuarriedTikiBlockGroup,
  createSculptedShipwrightShedGroup,
  createWhaleJawArchGroup,
  makeStoneRockGeometry,
} from './IslandPropsBuilder.js';

// Helper for reefless Marquesan cliff surf collar (white foam hugging rocky coast, open at bay mouth)
function addCliffSurfCollar(group, foamMat, radius, startRad, endRad, segs = 36) {
  const span = endRad - startRad;
  const foamGeo = new THREE.TorusGeometry(radius, 0.95, 5, segs, span);
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.rotation.x = Math.PI * 0.5;
  foam.rotation.z = startRad;
  foam.scale.set(1.0, 1.0, 0.14);
  foam.position.y = 0.28;
  group.add(foam);
}

// ============================================================================
// 1. NUKU HIVA — Taiohae Horseshoe Caldera Amphitheater & Hakaui Waterfall (2x)
// ============================================================================
function nukuDistToSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz || 1e-6;
  const t = clamp01((wx * vx + wz * vz) / len2);
  return { d: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
}

function evalNukuHivaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Deep horseshoe Taiohae Bay indenting around theta = 0 (+Z walkable),
  // framed by twin towering sea-cliff headlands jutting out at theta ≈ ±0.68!
  const bayIndent = 16.5 * Math.exp(-Math.pow(theta / 0.36, 2.0));
  const headlandJut =
    23.5 * Math.exp(-Math.pow((theta + 0.72) / 0.36, 2.0)) +
    15.0 * Math.exp(-Math.pow((theta - 0.65) / 0.32, 2.0));
  const backBulge = 10.0 * Math.exp(-Math.pow((Math.abs(theta) - 2.4) / 0.55, 2.0));
  const cliffWave = 3.4 * Math.cos(5.0 * theta + 0.7) + 1.8 * Math.sin(8.0 * theta);
  const coastR = Math.max(54.0, 72.0 - bayIndent + headlandJut + backBulge + cliffWave);

  if (r > coastR) {
    const drop = smoothstep(coastR, coastR + 11.5, r);
    return { h: lerp(0.05, -5.2, drop), flute: 0.0, isBlackBeach: false };
  }

  const u = r / coastR;
  const inBay = Math.abs(theta) < 0.42;

  // Sweeping semicircular horseshoe caldera wall wrapping around Taiohae Valley (~102m summit)
  // Opens toward +Z bay and steps down smoothly toward the SE headland so the Star Circle stays panoramic
  const wallCenterDist = Math.abs(Math.hypot(x + 26.0, z + 10.0) - 46.0);
  const wallBackMask =
    smoothstep(0.45, 1.15, Math.abs(theta)) *
    (1.0 - 0.92 * Math.exp(-Math.pow((theta + 1.25) / 0.68, 2.0)));
  const calderaRim =
    51.0 * Math.exp(-Math.pow(wallCenterDist / 17.5, 1.75)) * wallBackMask;

  // Interior massif & dramatic back amphitheater peaks
  const backMassif = 42.0 * gaussian2D(x, z, -44.0, 12.0, 24.0, 28.0, 0.15);

  // 14 vertical Marquesan fluted cathedral cliff ribs
  const fluteRaw = Math.pow(0.5 + 0.5 * Math.cos(14.0 * theta + 0.25 * Math.sin(3.0 * theta)), 2.1);
  const flute = fluteRaw * smoothstep(0.95, 0.34, u) * wallBackMask;

  // Sheer coastal sea-cliffs outside Taiohae Bay vs gentle black-sand crescent shore inside bay
  const cliffEdge = inBay
    ? 4.0 * smoothstep(1.0, 0.68, u)
    : 24.0 * Math.pow(smoothstep(1.0, 0.82, u), 0.58);

  let h = cliffEdge + calderaRim * 0.84 + backMassif * 0.45 + flute * 12.0;

  // Gently scoop out Taiohae Valley floor (spawn, landing, village hut flat)
  const valleyMask = gaussian2D(x, z, 46.0, 10.0, 18.0, 26.0, 0.08);
  if (valleyMask > 0.02) {
    const valleyTarget = lerp(1.2, 6.4, smoothstep(61.5, 24.0, x));
    h = lerp(h, valleyTarget, clamp01(valleyMask * 1.15));
  }

  // East Headland Sea-Bluff Terrace for Observation Circle at walkable (52, 48) -> canon (48.0, -52.0)
  const bluffProm = gaussian2D(x, z, 49.0, -52.0, 20.0, 19.0, -0.35);
  h = Math.max(h, 31.5 * smoothstep(0.16, 0.82, bluffProm));

  const dCircle = Math.hypot(x - 48.0, z + 52.0);
  if (dCircle < 12.0) {
    h = lerp(h, 31.5, 1.0 - smoothstep(5.6, 12.0, dCircle));
  }

  // Master Teiki's coastal marae terrace at walkable (20, 46) -> canon (46.0, -20.0)
  const dElder = Math.hypot(x - 46.0, z + 20.0);
  if (dElder < 10.5) {
    h = lerp(h, 8.5, 1.0 - smoothstep(4.8, 10.5, dElder));
  }

  // Walkable switchback trail corridors matching WalkableIslandScene stepping stones:
  // Compute closest point across the entire polyline ONCE so joints never fight or step-spike!
  const trailLegs = [
    [58.0, 11.5, 51.0, 14.5, 1.5, 2.6], // spawn -> landing
    [58.0, 11.5, 36.0, 21.0, 1.5, 5.4], // spawn -> hut valley flat
    [58.0, 11.5, 46.0, -20.0, 1.5, 8.5], // spawn -> elder terrace
    [46.0, -20.0, 58.0, -32.0, 8.5, 15.5], // elder (20,46) -> mid1 (32,58) [dist=17.0m, sl=0.41]
    [58.0, -32.0, 64.0, -45.0, 15.5, 23.0], // mid1 (32,58) -> mid2 (45,64) [dist=14.3m, sl=0.52]
    [64.0, -45.0, 53.6, -54.4, 23.0, 31.3], // mid2 (45,64) -> rim (54.4,53.6) [dist=14.0m, sl=0.59]
    [53.6, -54.4, 48.0, -52.0, 31.3, 31.5], // rim -> circle center (52,48)
  ];
  let bestTrailD = 999.0;
  let bestTrailH = h;
  for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
    const seg = nukuDistToSeg(x, z, ax, az, bx, bz);
    if (seg.d < bestTrailD) {
      bestTrailD = seg.d;
      bestTrailH = lerp(h0, h1, seg.t);
    }
  }
  if (bestTrailD < 14.5) {
    const mask = 1.0 - smoothstep(7.5, 14.5, bestTrailD);
    h = lerp(h, bestTrailH, mask);
  }

  // Feather bay foreshore smoothly down to waterline
  if (inBay && u > 0.85) {
    h = lerp(h, 1.8 * (1.0 - smoothstep(0.85, 1.0, u)), 0.85);
  }
  if (dCircle < 8.2) {
    h = lerp(h, 31.5, 1.0 - smoothstep(5.6, 8.2, dCircle));
  }

  // Flat Tohua Marae plaza terrace at walkable (15.0, 56.0) -> canon (56.0, -15.0), well clear of stone trail
  const dMarae = Math.hypot(x - 56.0, z + 15.0);
  if (dMarae < 8.2) {
    h = lerp(h, 8.2, 1.0 - smoothstep(5.0, 8.2, dMarae));
  }

  return { h, flute, isBlackBeach: inBay && u > 0.82 };
}

function buildNukuHivaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.22, 0.4];
  const colBlackSand = [0.11, 0.11, 0.13];
  const colValleyLush = [0.12, 0.36, 0.14];
  const colHighMoss = [0.09, 0.26, 0.12];
  const colDryOchre = [0.46, 0.33, 0.18];
  const colRedScoria = [0.42, 0.19, 0.11];
  const colDarkBasalt = [0.16, 0.16, 0.19];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalNukuHivaPoint,
    maxRadius: 112.0,
    nRings: 118,
    nSegs: 180,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isBlackBeach && s.h < 2.3) {
        return mixRgb(colBlackSand, colValleyLush, smoothstep(0.8, 2.3, s.h));
      }
      let rgb = mixRgb(colValleyLush, colHighMoss, smoothstep(8.0, 56.0, s.h));
      rgb = mixRgb(rgb, colDryOchre, s.flute * 0.52);
      const scoriaBand = smoothstep(52.0, 74.0, s.h) * (1.0 - smoothstep(78.0, 96.0, s.h));
      rgb = mixRgb(rgb, colRedScoria, scoriaBand * 0.34);
      rgb = mixRgb(rgb, colDarkBasalt, smoothstep(0.75, 1.6, slope) * 0.92);
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.89,
        metalness: 0.04,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Reefless Marquesan Cliff Surf Collar framing Taiohae Bay capes
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.72
  );
  addCliffSurfCollar(group, foamMat, 82.0, 0.45, Math.PI * 2.0 - 0.45, 56);

  // Dramatic Offshore Basalt Sea-Stacks guarding the twin sea-cliff headlands
  const stackMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x26252a, roughness: 0.92 })
  );
  for (const [sx, sz, hScale, rScale, rot] of [
    [66.0, 58.0, 14.0, 4.4, 0.5],
    [62.0, -64.0, 16.5, 4.8, 1.7],
    [-76.0, 42.0, 12.0, 3.8, 2.4],
  ]) {
    const stack = new THREE.Mesh(makeStoneRockGeometry(1.0, 19), stackMat);
    stack.scale.set(rScale, hScale, rScale * 0.85);
    stack.position.set(sx, 0.0, sz);
    stack.rotation.y = rot;
    group.add(stack);
  }

  // Towering 48m Hakaui Silver Waterfall plunging down the back caldera notch!
  addWaterfallCascade(group, trackMat, {
    x: -18.0,
    y: 34.0,
    z: 10.0,
    width: 3.0,
    height: 48.0,
    rotY: Math.PI * 0.58,
    tiltX: -0.34,
  });

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-11.5, 58.0);
  const [laCx, laCz] = toCanon(-14.5, 51.0);
  const [huCx, huCz] = toCanon(-21.0, 36.0);
  const [elCx, elCz] = toCanon(20.0, 46.0);
  const [ciCx, ciCz] = toCanon(52.0, 48.0);
  const [mid1Cx, mid1Cz] = toCanon(32.0, 58.0);
  const [mid2Cx, mid2Cz] = toCanon(45.0, 64.0);
  const nukuClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 7.0 },
    { x: huCx, z: huCz, r: 7.5 },
    { x: elCx, z: elCz, r: 8.0 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: mid1Cx, z: mid1Cz, r: 5.5 },
    { x: mid2Cx, z: mid2Cz, r: 5.5 },
  ];
  const nukuIsClear = (px, pz) => {
    for (const bz of nukuClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Master Teiki's Great Tohua Ceremonial Plaza (tucked beside Elder terrace, grounded solidly)
  const [marCx, marCz] = toCanon(15.0, 56.0);
  addMaraePlatform(group, trackMat, {
    x: marCx,
    y: evalNukuHivaPoint(marCx, marCz).h - 0.12,
    z: marCz,
    rotY: -0.35,
    scale: 1.0,
    courtHex: 0x2e2c2b,
    ahuHex: 0x4b4744,
    withBraziers: true,
  });

  // Marquesan Stone-Paepae Fa'e Village along Taiohae Valley apron
  const huts = [
    [toCanon(-30.0, 32.0)[0], toCanon(-30.0, 32.0)[1], 0.45, 1.04],
    [toCanon(-28.0, 44.0)[0], toCanon(-28.0, 44.0)[1], 0.15, 0.98],
    [toCanon(6.0, 48.0)[0], toCanon(6.0, 48.0)[1], -0.4, 0.96],
    [toCanon(-34.0, 49.0)[0], toCanon(-34.0, 49.0)[1], 0.6, 0.92],
  ].map(([hx, hz, rotY, sc]) => ({
    x: hx,
    y: Math.max(0.8, evalNukuHivaPoint(hx, hz).h),
    z: hz,
    rotY,
    scale: sc,
  }));
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  // Timber Canoe Pier & Anchored Outrigger Va'a in Taiohae Bay
  const [pierCx, pierCz] = toCanon(-3.5, 62.5);
  addTimberPier(group, trackMat, {
    x: pierCx,
    y: 0.7,
    z: pierCz,
    rotY: 0.1,
    length: 8.5,
    width: 1.65,
  });

  const [vaaCx, vaaCz] = toCanon(7.5, 65.0);
  addOutriggerCanoe(group, trackMat, {
    x: vaaCx,
    y: 0.34,
    z: vaaCz,
    rotY: Math.PI * 0.44,
  });

  // Sacred Giant Banyan (Aoa) Trees & Valley Coconut Palms (filtered clear of POIs/trails)
  const banyanPts = [
    [toCanon(-36.0, 37.0)[0], 0, toCanon(-36.0, 37.0)[1], 1.28, 0.3],
    [toCanon(-6.0, 34.0)[0], 0, toCanon(-6.0, 34.0)[1], 1.2, -0.5],
    [toCanon(8.0, 38.0)[0], 0, toCanon(8.0, 38.0)[1], 1.12, 1.0],
    [toCanon(-16.0, 24.0)[0], 0, toCanon(-16.0, 24.0)[1], 1.18, 0.8],
  ]
    .filter(([bx, , bz]) => nukuIsClear(bx, bz))
    .map(([bx, , bz, sc, rot]) => [bx, Math.max(1.2, evalNukuHivaPoint(bx, bz).h), bz, sc, rot]);
  addBroadleafTrees(group, trackMat, banyanPts, {
    canopyHexA: 0x1e5220,
    canopyHexB: 0x2f6828,
  });

  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = -0.5 + (i / 36) * 1.0;
    const pr = 46.0 + (i % 4) * 3.8;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const pt = evalNukuHivaPoint(px, pz);
    if (pt.h > 0.7 && pt.h < 12.0 && nukuIsClear(px, pz)) {
      palmPts.push([px, pt.h - 0.15, pz, -ang, 0.94 + (i % 3) * 0.08, 0.2]);
    }
    if (i % 2 === 0 && pt.h > 1.2 && pt.h < 18.0 && nukuIsClear(px * 0.95, pz * 0.95)) {
      const sc = 0.96 + (i % 3) * 0.22;
      scrubPts.push([px * 0.95, pt.h - 0.1, pz * 0.95, sc * 1.12, sc * 0.62, sc * 1.04, -ang]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x22561e,
    hexB: 0x356c26,
  });

  return { group, materials, sinkDepthM: 120.0 };
}

// ============================================================================
// 2. UA POU — 6 Soaring Phonolite Basalt Needle Spires & Bone-Carvers' Terrace
// ============================================================================
const UA_POU_SPIRES = [
  [-2.5, 0.5, 5.2, 54.0], // Mount Oave central fang
  [6.5, -7.8, 4.4, 42.0], // Pouakei spire
  [-9.8, 7.2, 4.5, 40.0], // Poutetainui spire
  [-11.5, -8.5, 4.0, 34.0],
  [8.2, 9.5, 4.1, 33.0],
  [-1.0, 13.5, 3.8, 29.0],
];

function evalUaPouPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const coveIndent = 5.8 * Math.exp(-Math.pow(theta / 0.28, 2.0));
  const rockyLobes = 3.2 * Math.cos(4.0 * theta - 0.5) + 1.8 * Math.sin(7.0 * theta);
  const coastR = 38.5 - coveIndent + rockyLobes;

  if (r > coastR) {
    return {
      h: lerp(0.05, -4.3, smoothstep(coastR, coastR + 7.5, r)),
      spireIntensity: 0.0,
      drySide: 0.0,
      isPebbleCove: false,
    };
  }

  const u = r / coastR;
  const shield = 28.0 * Math.pow(smoothstep(0.96, 0.1, u), 1.35);

  let spireLift = 0.0;
  let spireIntensity = 0.0;
  for (let i = 0; i < UA_POU_SPIRES.length; i += 1) {
    const [sx, sz, sr, sh] = UA_POU_SPIRES[i];
    const d = Math.hypot(x - sx, z - sz);
    const needle = Math.exp(-Math.pow(d / sr, 1.65));
    spireLift += sh * needle;
    spireIntensity = Math.max(spireIntensity, needle);
  }

  const inCove = Math.abs(theta) < 0.28;
  const cliffApron = inCove ? 1.8 * (1.0 - u) : 11.0 * smoothstep(1.0, 0.86, u);
  let h = shield + spireLift + cliffApron;
  if (inCove && u > 0.82) {
    h = lerp(h, 1.3 * (1.0 - smoothstep(0.82, 1.0, u)), 0.8);
  }

  return {
    h,
    spireIntensity,
    drySide: clamp01(0.5 + 0.5 * Math.sin(theta - 0.8)),
    isPebbleCove: inCove && u > 0.8,
  };
}

function buildUaPouAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.23, 0.41];
  const colPebbleGrey = [0.34, 0.35, 0.38];
  const colEmerald = [0.19, 0.45, 0.2];
  const colOchreGrass = [0.56, 0.51, 0.25];
  const colPhonoliteSpire = [0.32, 0.31, 0.36];
  const colCliffDark = [0.21, 0.2, 0.23];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalUaPouPoint,
    maxRadius: 52.0,
    nRings: 64,
    nSegs: 100,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isPebbleCove && s.h < 2.2) {
        return mixRgb(colPebbleGrey, colEmerald, smoothstep(1.1, 2.2, s.h));
      }
      let rgb = mixRgb(colEmerald, colOchreGrass, s.drySide * 0.68);
      rgb = mixRgb(rgb, colCliffDark, smoothstep(0.95, 1.8, slope) * 0.82);
      rgb = mixRgb(rgb, colPhonoliteSpire, smoothstep(0.35, 0.78, s.spireIntensity));
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.05,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Faceted Columnar-Basalt Needle Obelisk Crowns for Razor-Sharp Vertical Silhouettes!
  const spireRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b4952,
      roughness: 0.86,
      flatShading: true,
    })
  );
  for (let i = 0; i < UA_POU_SPIRES.length; i += 1) {
    const [sx, sz, sr, sh] = UA_POU_SPIRES[i];
    const baseH = evalUaPouPoint(sx, sz).h;
    const obeliskH = sh * 0.58;
    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(sr * 0.16, sr * 0.56, obeliskH, 6),
      spireRockMat
    );
    obelisk.position.set(sx, baseH - obeliskH * 0.22, sz);
    obelisk.rotation.y = i * 0.7;
    obelisk.rotation.z = ((i % 3) - 1) * 0.05;
    group.add(obelisk);
  }

  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.7
  );
  addCliffSurfCollar(group, foamMat, 40.5, 0.34, Math.PI * 2.0 - 0.34, 38);

  // Vaea's Bone-Carvers' Terrace & Bleached Whale-Jawbone Archway above the Pebble Cove
  const terraceX = 27.5;
  const terraceZ = -3.6;
  const terraceY = Math.max(1.6, evalUaPouPoint(terraceX, terraceZ).h);
  const jawArch = createWhaleJawArchGroup(trackMat);
  jawArch.group.position.set(terraceX, terraceY, terraceZ);
  jawArch.group.rotation.y = Math.PI * 0.5;
  group.add(jawArch.group);

  const huts = [
    [28.5, -0.14, 0.98],
    [26.2, -0.24, 0.92],
    [28.8, 0.12, 0.95],
    [26.5, 0.22, 0.88],
  ].map(([hr, hang, sc]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.9, evalUaPouPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  addOutriggerCanoe(group, trackMat, {
    x: 31.2,
    y: Math.max(0.45, evalUaPouPoint(31.2, 1.2).h + 0.15),
    z: 1.2,
    rotY: 0.2,
  });

  const palmPts = [];
  for (const ang of [-0.32, -0.2, -0.06, 0.08, 0.2, 0.32, 1.4, -1.6]) {
    const pr = 29.8;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const py = evalUaPouPoint(px, pz).h;
    if (py > 0.6 && py < 12.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.92, 0.2]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 105.0 };
}

// ============================================================================
// 3. RANGIROA — Twin Passes (Tiputa & Avatoru), Pink Sandbar & Pearl Farms
// ============================================================================
function evalRangiroaPoint(x, z) {
  // Elongated oval Tuamotu ring
  const sx = x * 1.06;
  const sz = z * 0.94;
  const r = Math.hypot(sx, sz);
  const theta = Math.atan2(sz, sx);

  const ringR = 40.2 + 1.5 * Math.cos(2.0 * theta - 0.3);
  // Two famous navigable passes: Tiputa (theta = 0) & Avatoru (theta = +0.78)
  const tiputaPass = arcMask(theta, 0.0, 0.15, 0.06);
  const avatoruPass = arcMask(theta, 0.78, 0.13, 0.055);
  const passMask = clamp01(tiputaPass + avatoruPass);

  // Long Tiputa-Avatoru Village Motu (theta in [0.16, 0.64]) + long southern & western motu chains
  const villageMotu = arcMask(theta, 0.4, 0.23, 0.06);
  const southChain = arcMask(theta, -1.15, 0.85, 0.08);
  const pinkSandSector = arcMask(theta, -2.55, 0.42, 0.08); // Les Sables Roses!
  const northWestMotu = arcMask(theta, 1.85, 0.72, 0.08);
  const motuMask = clamp01(villageMotu + southChain + pinkSandSector + northWestMotu);

  const halfW = lerp(3.8, 5.6, clamp01(villageMotu + southChain * 0.5));
  const innerR = ringR - halfW;
  const outerR = ringR + halfW;
  const reefEdgeR = outerR + 3.6;

  if (r < innerR) {
    const lu = clamp01(r / innerR);
    let h = lerp(0.15, 0.22, smoothstep(0.65, 1.0, lu));
    h = lerp(h, -2.4, passMask * smoothstep(22.0, 32.0, r));
    return {
      h,
      zone: h < 0.05 ? 'deep_sea' : 'lagoon',
      isPinkSand: false,
    };
  }

  if (r <= reefEdgeR) {
    let h = 0.22;
    let zone = 'hoa_reef';
    if (r <= outerR && motuMask > 0.02) {
      const mt = 1.0 - Math.abs(r - ringR) / halfW;
      const peakH = pinkSandSector > 0.3 ? 1.85 : 3.65;
      const mh = peakH * Math.pow(smoothstep(0.0, 1.0, mt), 0.85) * motuMask;
      if (mh > h) {
        h = mh;
        zone =
          pinkSandSector > 0.3
            ? 'pink_sand'
            : mh < 1.5
              ? 'white_sand'
              : 'motu_veg';
      }
    }
    h = lerp(h, -2.5, passMask);
    if (h < 0.05) zone = 'deep_sea';
    return { h, zone, isPinkSand: pinkSandSector > 0.3 };
  }

  const drop = smoothstep(reefEdgeR, 55.8, r);
  const h = lerp(lerp(0.24, -2.5, passMask), -4.1, drop);
  return { h, zone: h < 0.05 ? 'deep_sea' : 'hoa_reef', isPinkSand: false };
}

function buildRangiroaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.25, 0.44];
  const colCeruleanLagoon = [0.1, 0.72, 0.76];
  const colWhiteSand = [0.95, 0.91, 0.81];
  const colPinkSand = [0.96, 0.75, 0.74]; // Iconic Les Sables Roses!
  const colHoaAqua = [0.52, 0.86, 0.81];
  const colTuamotuPalm = [0.22, 0.49, 0.2];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalRangiroaPoint,
    maxRadius: 56.0,
    nRings: 66,
    nSegs: 112,
    colorFn: (s) => {
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        return mixRgb(colCeruleanLagoon, colDeepSea, clamp01(-s.h / 2.5));
      }
      if (s.zone === 'lagoon') return colCeruleanLagoon;
      if (s.zone === 'hoa_reef') return colHoaAqua;
      if (s.zone === 'pink_sand') return colPinkSand;
      if (s.zone === 'white_sand') return colWhiteSand;
      return mixRgb(colWhiteSand, colTuamotuPalm, smoothstep(1.3, 2.2, s.h));
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

  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x22d8db, depthWrite: false }),
    0.34
  );
  const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(33.5, 56), lagoonMat);
  lagoonDisc.rotation.x = -Math.PI * 0.5;
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6d8b5, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.75
  );
  // Leave BOTH Tiputa Pass (0.0) and Avatoru Pass (+0.78) open!
  addBarrierReefArc(group, reefMat, foamMat, 48.2, 0.19, 0.61, 14);
  addBarrierReefArc(group, reefMat, foamMat, 48.2, 0.94, Math.PI * 2.0 - 0.19, 44);

  // Submerged Black-Pearl Oyster Lagoon Longlines inside the Calm Lagoon
  const pearlCluster = createPearlLineClusterGroup(trackMat, 3, 6);
  pearlCluster.group.position.set(16.0, 0.0, 4.5);
  group.add(pearlCluster.group);

  // Tane's Pearl-Divers' Village on the Tiputa-Avatoru Motu & Southern Pass Shoulder
  const huts = [
    [38.5, 0.25, 0.96, false],
    [39.8, 0.34, 1.02, true],
    [38.2, 0.45, 0.94, false],
    [39.5, 0.55, 0.9, false],
    [39.2, -0.34, 0.95, false],
    [38.4, -0.48, 0.9, false],
  ].map(([hr, hang, sc, longHouse]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.8, evalRangiroaPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
      longHouse,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'atoll');

  // Twin Pearl-Diving Lagoon Piers
  for (const pAng of [0.3, -0.38]) {
    addTimberPier(group, trackMat, {
      x: 31.5 * Math.cos(pAng),
      y: 0.7,
      z: 31.5 * Math.sin(pAng),
      rotY: -pAng,
      length: 7.8,
    });
  }

  addOutriggerCanoe(group, trackMat, {
    x: 28.2 * Math.cos(0.36),
    y: 0.32,
    z: 28.2 * Math.sin(0.36),
    rotY: -0.36 + Math.PI * 0.5,
  });
  addOutriggerCanoe(group, trackMat, {
    x: 28.5 * Math.cos(-0.32),
    y: 0.32,
    z: 28.5 * Math.sin(-0.32),
    rotY: 0.32 + Math.PI * 0.5,
  });

  const palmPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = (i / 36) * Math.PI * 2.0;
    const pr = 39.5;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const py = evalRangiroaPoint(px, pz).h;
    if (py > 1.55) {
      palmPts.push([px, py - 0.16, pz, -ang, 0.95, 0.24]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 12.5 };
}

// ============================================================================
// 4. HIVA OA — Red-Tuff Quarry Cliffs, Black-Sand Bay & Colossal Carved Tikis
// ============================================================================
function evalHivaOaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const bayIndent = 8.5 * Math.exp(-Math.pow(theta / 0.3, 2.0));
  const cragCoast = 3.5 * Math.cos(3.0 * theta + 0.9) + 2.0 * Math.sin(6.0 * theta);
  const coastR = 39.5 - bayIndent + cragCoast;

  if (r > coastR) {
    return {
      h: lerp(0.05, -4.4, smoothstep(coastR, coastR + 7.2, r)),
      isBlackSand: false,
      redQuarry: 0.0,
    };
  }

  const u = r / coastR;
  const inBay = Math.abs(theta) < 0.3;

  // Elongated Mount Temetiu dark volcanic spine + stepped quarry amphitheater
  const ridgeSpine =
    62.0 * gaussian2D(x, z, -8.5, 2.0, 14.5, 22.0, 0.32) +
    24.0 * gaussian2D(x, z, 8.0, -14.0, 11.5, 10.5, -0.2);

  const cliffWall = inBay ? 2.0 * (1.0 - u) : 18.0 * smoothstep(1.0, 0.85, u);
  let h = ridgeSpine + cliffWall;

  // Flatten sacred Tiki Quarry terrace on the hillside overlooking the black-sand bay!
  const quarryMask = gaussian2D(x, z, 16.5, -8.5, 7.2, 6.2, 0.2);
  if (quarryMask > 0.15) {
    h = lerp(h, 8.2, quarryMask * 0.78);
  }

  if (inBay && u > 0.8) {
    h = lerp(h, 1.35 * (1.0 - smoothstep(0.8, 1.0, u)), 0.8);
  }

  return {
    h,
    isBlackSand: inBay && u > 0.78,
    redQuarry: clamp01(
      gaussian2D(x, z, 13.5, -10.5, 9.5, 8.5, 0.2) * 1.35
    ),
  };
}

/**
 * Builds an expressive carved red-tuff Marquesan Tiki statue.
 */
function createMarquesanTikiMesh(redTuffMat, basaltMat, scale = 1.0) {
  return createMarquesanTikiSculpture(redTuffMat, basaltMat, scale);
}

function buildHivaOaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.22, 0.4];
  const colBlackSand = [0.13, 0.13, 0.15];
  const colJungle = [0.15, 0.42, 0.18];
  const colRedTuff = [0.62, 0.24, 0.17]; // Oxidized red volcanic quarry tuff!
  const colDarkCrag = [0.22, 0.2, 0.21];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalHivaOaPoint,
    maxRadius: 53.0,
    nRings: 62,
    nSegs: 98,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isBlackSand && s.h < 2.2) {
        return mixRgb(colBlackSand, colJungle, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colJungle, colDarkCrag, smoothstep(0.92, 1.8, slope) * 0.85);
      rgb = mixRgb(rgb, colRedTuff, s.redQuarry * 0.88);
      return rgb;
    },
  });

  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.04,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.72
  );
  addCliffSurfCollar(group, foamMat, 41.5, 0.35, Math.PI * 2.0 - 0.35, 38);

  // Tahia's Colossal Carved Red-Tuff Marquesan Tiki Statues on the Quarry & Me'ae Terrace!
  const redTuffMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xa84330, roughness: 0.86 })
  );
  const darkBasaltMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x302e2d, roughness: 0.92 })
  );

  for (const [tx, tz, rotY, sc] of [
    [18.2, -7.2, 0.35, 1.15],
    [16.5, -10.2, 0.5, 1.0],
    [21.5, 4.8, -0.25, 1.08],
  ]) {
    const ty = Math.max(1.5, evalHivaOaPoint(tx, tz).h);
    const tiki = createMarquesanTikiMesh(redTuffMat, darkBasaltMat, sc);
    tiki.position.set(tx, ty - 0.15, tz);
    tiki.rotation.y = rotY;
    group.add(tiki);
  }

  // Half-quarried recumbent red-tuff monolith block in the hillside quarry cut
  const quarryWork = createQuarriedTikiBlockGroup(redTuffMat, darkBasaltMat);
  quarryWork.group.position.set(
    14.2,
    evalHivaOaPoint(14.2, -9.0).h + 0.05,
    -9.0
  );
  quarryWork.group.rotation.y = 0.65;
  group.add(quarryWork.group);

  const huts = [
    [24.5, -0.14, 0.98],
    [22.5, 0.06, 1.02],
    [25.2, 0.18, 0.92],
    [20.5, -0.22, 0.9],
  ].map(([hr, hang, sc]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.8, evalHivaOaPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  const banyanPts = [
    [19.0, evalHivaOaPoint(19.0, 7.5).h, 7.5, 1.2, 0.4],
    [17.5, evalHivaOaPoint(17.5, -3.5).h, -3.5, 1.1, -0.5],
  ];
  addBroadleafTrees(group, trackMat, banyanPts);

  const palmPts = [];
  for (const ang of [-0.26, -0.15, -0.03, 0.1, 0.22]) {
    const px = 27.5 * Math.cos(ang);
    const pz = 27.5 * Math.sin(ang);
    const py = evalHivaOaPoint(px, pz).h;
    if (py > 0.5 && py < 9.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.94, 0.2]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 83.0 };
}

// ============================================================================
// 5. FATU HIVA — Hanavave Basalt Sea-Pillars, Twin Waterfalls & Shipwright Shed
// ============================================================================
function evalFatuHivaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const canyonBay = 12.2 * Math.exp(-Math.pow(theta / 0.26, 2.0));
  const cliffFolding = 2.8 * Math.cos(6.0 * theta) + 1.6 * Math.sin(9.0 * theta);
  const coastR = Math.max(22.0, 40.5 - canyonBay + cliffFolding);

  if (r > coastR) {
    return {
      h: lerp(0.05, -4.4, smoothstep(coastR, coastR + 7.0, r)),
      canyonLush: 0.0,
      isLanding: false,
    };
  }

  const u = r / coastR;
  const inBay = Math.abs(theta) < 0.26;

  // Steep emerald rainforest canyon walls closing tightly around Hanavave / Waterfall Bay
  const northWall = 61.0 * gaussian2D(x, z, 4.0, -14.5, 16.5, 10.5, 0.15);
  const southWall = 58.0 * gaussian2D(x, z, 4.0, 14.5, 16.5, 10.5, -0.15);
  const backHeadwall = 64.0 * gaussian2D(x, z, -12.5, 0.0, 14.0, 17.0, 0.0);

  const seaCliff = inBay ? 1.8 * (1.0 - u) : 20.0 * smoothstep(1.0, 0.84, u);
  let h = seaCliff + Math.max(northWall, southWall, backHeadwall);

  if (inBay && u > 0.78) {
    h = lerp(h, 1.4 * (1.0 - smoothstep(0.78, 1.0, u)), 0.82);
  }

  return {
    h,
    canyonLush: clamp01(1.0 - Math.abs(z) / 22.0),
    isLanding: inBay && u > 0.78,
  };
}

function buildFatuHivaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.23, 0.41];
  const colCareeningSand = [0.68, 0.62, 0.49];
  const colRainforest = [0.11, 0.43, 0.16];
  const colBrightFern = [0.25, 0.56, 0.2];
  const colWetBasalt = [0.18, 0.19, 0.21];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalFatuHivaPoint,
    maxRadius: 53.0,
    nRings: 62,
    nSegs: 98,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isLanding && s.h < 2.2) {
        return mixRgb(colCareeningSand, colRainforest, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colRainforest, colBrightFern, s.canyonLush * 0.55);
      rgb = mixRgb(rgb, colWetBasalt, smoothstep(0.95, 1.85, slope) * 0.86);
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

  // Iconic Hanavave ("Bay of Virgins") Towering Rectangular Basalt Sea-Pillar Monoliths!
  const pillarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c2d31,
      roughness: 0.9,
      flatShading: true,
    })
  );
  for (const [px, pz, pw, ph, rotY] of [
    [29.5, -10.2, 3.6, 26.0, 0.2],
    [33.2, -13.5, 3.1, 21.0, -0.15],
    [29.8, 10.4, 3.8, 25.0, -0.22],
    [33.5, 13.8, 3.0, 19.5, 0.18],
    [24.5, -12.8, 3.2, 23.0, 0.35],
  ]) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(pw, ph, pw * 0.88),
      pillarMat
    );
    pillar.position.set(px, ph * 0.45, pz);
    pillar.rotation.y = rotY;
    group.add(pillar);
  }

  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.72
  );
  addCliffSurfCollar(group, foamMat, 41.5, 0.32, Math.PI * 2.0 - 0.32, 38);

  // Twin Hanging Rainforest Waterfalls Cascading into Waterfall Bay!
  addWaterfallCascade(group, trackMat, {
    x: 6.5,
    y: 23.0,
    z: -9.2,
    width: 1.45,
    height: 24.0,
    rotY: 0.15,
    tiltX: -0.35,
  });
  addWaterfallCascade(group, trackMat, {
    x: -3.5,
    y: 26.0,
    z: 5.5,
    width: 1.6,
    height: 27.0,
    rotY: Math.PI * 0.65,
    tiltX: -0.34,
  });

  // Oihanu's Great Vaka Moana Shipwright Shed & Timber Careening Slipway
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x694224, roughness: 0.85 })
  );
  const shedY = Math.max(1.1, evalFatuHivaPoint(20.5, 0.0).h);
  const grandShed = new THREE.Group();
  grandShed.position.set(20.5, shedY, 0.0);

  const shipwrightShed = createSculptedShipwrightShedGroup(trackMat, {
    width: 6.4,
    depth: 9.2,
    timberHex: 0x694224,
    thatchHex: 0xb88b4e,
  });
  shipwrightShed.group.rotation.y = Math.PI * 0.5;
  grandShed.add(shipwrightShed.group);

  const shedHulls = createCarvedHullPairGroup(trackMat);
  shedHulls.group.rotation.y = Math.PI * 0.5;
  shedHulls.group.position.set(0.6, 0.0, 0.0);
  grandShed.add(shedHulls.group);

  // Timber careening slipway rails running down toward the bay water
  for (const rz of [-1.4, 1.4]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 0.2, 0.24),
      timberMat
    );
    rail.position.set(4.2, 0.1, rz);
    rail.rotation.z = -0.12;
    grandShed.add(rail);
  }
  group.add(grandShed);

  const huts = [
    [22.5, -0.18, 0.95],
    [22.8, 0.18, 0.95],
    [17.5, -0.12, 0.9],
  ].map(([hr, hang, sc]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(1.0, evalFatuHivaPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  const palmPts = [];
  for (const ang of [-0.24, -0.14, -0.05, 0.06, 0.15, 0.24]) {
    const px = 25.2 * Math.cos(ang);
    const pz = 25.2 * Math.sin(ang);
    const py = evalFatuHivaPoint(px, pz).h;
    if (py > 0.5 && py < 9.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 1.0, 0.22]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 86.0 };
}

// ============================================================================
// 6. MANGAREVA — Asymmetric Mount Duff Wedge + Expansive Lapa Barrier Lagoon
// ============================================================================
function evalMangarevaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Compact central island inside a huge luminous Lapa lagoon!
  const islandCoastR =
    26.5 + 3.2 * Math.cos(2.0 * theta - 0.6) + 1.8 * Math.sin(4.0 * theta);
  const passMask = arcMask(theta, 0.0, 0.18, 0.07);

  if (r <= islandCoastR) {
    const u = r / islandCoastR;
    // Asymmetric tilted hogback wedge of Mount Duff (gradual north slope, sheer south cliff!)
    const rotX = x * 0.85 + z * 0.52;
    const rotZ = -x * 0.52 + z * 0.85;
    const ridgeSpine = Math.exp(-Math.pow(rotX / 13.5, 2.0));
    const asymWedge =
      rotZ < 2.5
        ? smoothstep(-14.0, 2.5, rotZ)
        : Math.exp(-Math.pow((rotZ - 2.5) / 3.4, 2.0));
    const mountDuff = 47.0 * ridgeSpine * asymWedge;

    // Secondary Mount Mokoto twin peak
    const mokoto = 31.0 * gaussian2D(x, z, -8.5, -9.5, 7.5, 6.5, 0.2);
    const apron = 2.4 * smoothstep(1.0, 0.78, u);

    return {
      h: apron + mountDuff + mokoto,
      zone: u > 0.85 ? 'beach' : 'island',
    };
  }

  // Expansive turquoise Lapa lagoon out to r = 51.5m with scattered coral motu
  const outerReefR = 51.5;
  if (r <= outerReefR) {
    let h = lerp(0.16, 0.23, smoothstep(islandCoastR, outerReefR, r));
    let zone = 'lapa_lagoon';

    // 3 outer lagoon barrier motu islets
    for (const [mAng, mSpan] of [
      [1.15, 0.24],
      [-1.35, 0.26],
      [2.65, 0.28],
    ]) {
      const mMask = arcMask(theta, mAng, mSpan, 0.06);
      if (mMask > 0.02 && Math.abs(r - 46.8) < 3.4) {
        const mt = 1.0 - Math.abs(r - 46.8) / 3.4;
        const mh = 2.5 * smoothstep(0.0, 1.0, mt) * mMask;
        if (mh > h) {
          h = mh;
          zone = mh > 1.3 ? 'motu_veg' : 'beach';
        }
      }
    }

    h = lerp(h, -2.5, passMask * smoothstep(32.0, 42.0, r));
    if (h < 0.05) zone = 'deep_sea';
    return { h, zone };
  }

  const drop = smoothstep(outerReefR, 55.8, r);
  const h = lerp(lerp(0.24, -2.5, passMask), -4.1, drop);
  return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef' };
}

function buildMangarevaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.26, 0.44];
  const colLapaLagoon = [0.16, 0.85, 0.78];
  const colCreamSand = [0.94, 0.89, 0.77];
  const colGoldenGrass = [0.44, 0.56, 0.23];
  const colValleyGreen = [0.18, 0.45, 0.2];
  const colDuffCliff = [0.29, 0.27, 0.26];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalMangarevaPoint,
    maxRadius: 56.0,
    nRings: 64,
    nSegs: 100,
    colorFn: (s, slope) => {
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        return mixRgb(colLapaLagoon, colDeepSea, clamp01(-s.h / 2.5));
      }
      if (s.zone === 'lapa_lagoon' || s.zone === 'papa_reef') return colLapaLagoon;
      if (s.zone === 'beach' && s.h < 1.9) {
        return mixRgb(colCreamSand, colValleyGreen, smoothstep(1.1, 1.9, s.h));
      }
      if (s.zone === 'motu_veg') return colValleyGreen;
      let rgb = mixRgb(colValleyGreen, colGoldenGrass, smoothstep(8.0, 36.0, s.h));
      rgb = mixRgb(rgb, colDuffCliff, smoothstep(0.95, 1.85, slope) * 0.88);
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

  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x2ce8d2, depthWrite: false }),
    0.38
  );
  const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(49.5, 52), lagoonMat);
  lagoonDisc.rotation.x = -Math.PI * 0.5;
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6d8b4, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.75
  );
  addBarrierReefArc(group, reefMat, foamMat, 50.8, 0.24, Math.PI * 2.0 - 0.24, 44);

  // Elder Rongo's Dressed White-Coral Block Gateway Marae by the Lagoon Shore
  const mx = 22.8 * Math.cos(-0.28);
  const mz = 22.8 * Math.sin(-0.28);
  addMaraePlatform(group, trackMat, {
    x: mx,
    y: Math.max(0.9, evalMangarevaPoint(mx, mz).h),
    z: mz,
    rotY: 0.28,
    scale: 0.86,
    courtHex: 0xdcd3be,
    ahuHex: 0xf0ead9,
  });

  const huts = [
    [23.2, 0.22, 0.96, true],
    [22.0, 0.42, 0.92, false],
    [24.0, -0.55, 0.9, false],
    [22.5, -0.72, 0.88, false],
  ].map(([hr, hang, sc, longHouse]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.7, evalMangarevaPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
      longHouse,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'society');

  addTimberPier(group, trackMat, {
    x: 26.8 * Math.cos(0.05),
    y: 0.7,
    z: 26.8 * Math.sin(0.05),
    rotY: -0.05,
    length: 7.4,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 31.2 * Math.cos(0.14),
    y: 0.32,
    z: 31.2 * Math.sin(0.14),
    rotY: -0.14 + Math.PI * 0.5,
  });

  const palmPts = [];
  for (let i = 0; i < 26; i += 1) {
    const ang = (i / 26) * Math.PI * 2.0;
    const pr = i % 3 === 0 ? 46.8 : 24.2;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const py = evalMangarevaPoint(px, pz).h;
    if (py > 0.75 && py < 10.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.94, 0.22]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 53.0 };
}

export function createAct2IslandAssembly(islandId) {
  switch (islandId) {
    case 'nuku_hiva':
      return buildNukuHivaAssembly();
    case 'ua_pou':
      return buildUaPouAssembly();
    case 'rangiroa':
      return buildRangiroaAssembly();
    case 'hiva_oa':
      return buildHivaOaAssembly();
    case 'fatu_hiva':
      return buildFatuHivaAssembly();
    case 'mangareva':
      return buildMangarevaAssembly();
    default:
      return null;
  }
}
