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
  addOrganicBarrierReefArc,
  addOutriggerCanoe,
  addRegionalHuts,
  addTimberPier,
  addWaterfallCascade,
  arcMask,
  buildPolarTerrainGeometry,
  clamp01,
  createMaterialTracker,
  createOrganicLagoonGeometry,
  createOrganicMotuGeometry,
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
  const [pierCx, pierCz] = toCanon(-2.0, 62.5);
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
// 2. UA POU — 6 Soaring Phonolite Basalt Needle Spires & Bone-Carvers' Terrace (2x)
// ============================================================================
const UA_POU_SPIRES = [
  [-40.0, 18.0, 9.2, 34.0], // Mount Oave central fang (80m terrain + faceted basalt obelisk to ~114m)
  [-28.0, -6.0, 8.0, 29.0], // Pouakei spire
  [-42.0, 32.0, 8.2, 32.0], // Poutetainui spire
  [-50.0, -8.0, 7.6, 28.0], // Western fang
  [-20.0, 28.0, 7.4, 26.0], // Harbor-west spire
  [-52.0, 16.0, 7.0, 26.0], // Back sentinel spire
];

function uaPouDistToSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz || 1e-6;
  const t = clamp01((wx * vx + wz * vz) / len2);
  return { d: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
}

function evalUaPouPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Rugged asymmetric coastline with Pebble Cove (+X canon / +Z walkable) & jutting east lookout cape
  const coveIndent = 11.5 * Math.exp(-Math.pow(theta / 0.34, 2.0));
  const eastCape = 14.5 * Math.exp(-Math.pow((theta + 0.76) / 0.38, 2.0));
  const westCape = 10.5 * Math.exp(-Math.pow((theta - 0.68) / 0.34, 2.0));
  const rockyLobes = 4.6 * Math.cos(4.0 * theta - 0.45) + 2.4 * Math.sin(7.0 * theta);
  const coastR = Math.max(58.0, 72.0 - coveIndent + eastCape + westCape + rockyLobes);

  if (r > coastR) {
    return {
      h: lerp(0.05, -5.0, smoothstep(coastR, coastR + 11.0, r)),
      spireIntensity: 0.0,
      drySide: 0.0,
      isPebbleCove: false,
    };
  }

  const u = r / coastR;
  const shield = 34.0 * Math.pow(smoothstep(0.97, 0.14, u), 1.32);

  let spireLift = 0.0;
  let spireIntensity = 0.0;
  for (let i = 0; i < UA_POU_SPIRES.length; i += 1) {
    const [sx, sz, sr, sh] = UA_POU_SPIRES[i];
    const d = Math.hypot(x - sx, z - sz);
    const needle = Math.exp(-Math.pow(d / sr, 1.65));
    spireLift += sh * needle;
    spireIntensity = Math.max(spireIntensity, needle);
  }

  const inCove = Math.abs(theta) < 0.36;
  const cliffApron = inCove ? 3.2 * (1.0 - u) : 18.0 * smoothstep(1.0, 0.84, u);
  let h = shield + spireLift + cliffApron;

  // Gently level Pebble Cove bay apron & Sail-Tenders' Loft valley
  const coveMask = gaussian2D(x, z, 46.0, 10.0, 17.0, 24.0, 0.08);
  if (coveMask > 0.02) {
    const coveTarget = lerp(1.2, 6.0, smoothstep(61.5, 24.0, x));
    h = lerp(h, coveTarget, clamp01(coveMask * 1.15));
  }

  // East Headland Sea-Bluff Terrace for Observation Circle at walkable (46, 48) -> canon (48.0, -46.0)
  const bluffProm = gaussian2D(x, z, 48.0, -47.0, 19.0, 18.0, -0.35);
  h = Math.max(h, 27.5 * smoothstep(0.18, 0.84, bluffProm));

  const dCircle = Math.hypot(x - 48.0, z + 46.0);
  if (dCircle < 12.0) {
    h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 12.0, dCircle));
  }

  // Vaea's Carvers' Terrace at walkable (20, 46) -> canon (46.0, -20.0)
  const dElder = Math.hypot(x - 46.0, z + 20.0);
  if (dElder < 10.5) {
    h = lerp(h, 8.5, 1.0 - smoothstep(4.8, 10.5, dElder));
  }

  // Single-pass closest-segment polyline trail matching WalkableIslandScene stepping stones
  const trailLegs = [
    [62.5, 9.5, 51.0, 14.5, 1.0, 2.6], // spawn (-9.5, 62.5) -> landing
    [62.5, 9.5, 36.0, 21.0, 1.0, 5.4], // spawn -> hut loft
    [62.5, 9.5, 46.0, -20.0, 1.0, 8.5], // spawn -> elder terrace
    [46.0, -20.0, 56.0, -31.0, 8.5, 14.5], // elder (20,46) -> mid1 (31,56) [dist=14.9m, sl=0.40]
    [56.0, -31.0, 63.0, -43.0, 14.5, 20.8], // mid1 (31,56) -> mid2 (43,63) [dist=13.9m, sl=0.45]
    [63.0, -43.0, 52.0, -50.0, 20.8, 27.3], // mid2 (43,63) -> rim (50,52) [dist=13.0m, sl=0.50]
    [52.0, -50.0, 48.0, -46.0, 27.3, 27.5], // rim -> circle center (46,48)
  ];
  let bestTrailD = 999.0;
  let bestTrailH = h;
  for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
    const seg = uaPouDistToSeg(x, z, ax, az, bx, bz);
    if (seg.d < bestTrailD) {
      bestTrailD = seg.d;
      bestTrailH = lerp(h0, h1, seg.t);
    }
  }
  if (bestTrailD < 14.5) {
    const mask = 1.0 - smoothstep(7.2, 14.5, bestTrailD);
    h = lerp(h, bestTrailH, mask);
  }

  if (inCove && u > 0.84) {
    h = lerp(h, 1.6 * (1.0 - smoothstep(0.84, 1.0, u)), 0.82);
  }
  if (dCircle < 8.2) {
    h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 8.2, dCircle));
  }

  // Flat grounded terrace for Vaea's Whale-Jawbone Archway at walkable (14.5, 55.5) -> canon (55.5, -14.5)
  const dArch = Math.hypot(x - 55.5, z + 14.5);
  if (dArch < 7.5) {
    h = lerp(h, 7.6, 1.0 - smoothstep(4.6, 7.5, dArch));
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
  const colPebbleGrey = [0.3, 0.31, 0.34];
  const colEmerald = [0.12, 0.35, 0.14];
  const colOchreGrass = [0.5, 0.41, 0.19];
  const colRedScoria = [0.43, 0.19, 0.11];
  const colPhonoliteSpire = [0.28, 0.27, 0.32];
  const colCliffDark = [0.16, 0.16, 0.19];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalUaPouPoint,
    maxRadius: 112.0,
    nRings: 118,
    nSegs: 180,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isPebbleCove && s.h < 2.3) {
        return mixRgb(colPebbleGrey, colEmerald, smoothstep(1.0, 2.3, s.h));
      }
      let rgb = mixRgb(colEmerald, colOchreGrass, s.drySide * 0.65);
      const scoriaBand = smoothstep(42.0, 62.0, s.h) * (1.0 - smoothstep(66.0, 82.0, s.h));
      rgb = mixRgb(rgb, colRedScoria, scoriaBand * 0.28);
      rgb = mixRgb(rgb, colCliffDark, smoothstep(0.82, 1.65, slope) * 0.88);
      rgb = mixRgb(rgb, colPhonoliteSpire, smoothstep(0.32, 0.76, s.spireIntensity));
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

  // Faceted Columnar-Basalt Needle Obelisk Crowns soaring above the terrain ridges!
  const spireRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x45434c,
      roughness: 0.86,
      flatShading: true,
    })
  );
  for (let i = 0; i < UA_POU_SPIRES.length; i += 1) {
    const [sx, sz, sr, sh] = UA_POU_SPIRES[i];
    const baseH = evalUaPouPoint(sx, sz).h;
    const obeliskH = sh * 1.05;
    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(sr * 0.14, sr * 0.52, obeliskH, 6),
      spireRockMat
    );
    obelisk.position.set(sx, baseH + obeliskH * 0.28, sz);
    obelisk.rotation.y = i * 0.7;
    obelisk.rotation.z = ((i % 3) - 1) * 0.04;
    group.add(obelisk);
  }

  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.72
  );
  addCliffSurfCollar(group, foamMat, 79.0, 0.4, Math.PI * 2.0 - 0.4, 54);

  // Offshore Basalt Sea-Stacks guarding the steep spire headlands
  const stackMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x26252a, roughness: 0.92 })
  );
  for (const [sx, sz, hScale, rScale, rot] of [
    [60.0, 56.0, 14.5, 4.2, 0.3],
    [-68.0, 48.0, 16.0, 4.6, 1.4],
    [-72.0, -34.0, 13.0, 3.8, 2.2],
  ]) {
    const stack = new THREE.Mesh(makeStoneRockGeometry(1.0, 23), stackMat);
    stack.scale.set(rScale, hScale, rScale * 0.85);
    stack.position.set(sx, 0.0, sz);
    stack.rotation.y = rot;
    group.add(stack);
  }

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-9.5, 62.5);
  const [laCx, laCz] = toCanon(-14.5, 51.0);
  const [huCx, huCz] = toCanon(-21.0, 36.0);
  const [elCx, elCz] = toCanon(20.0, 46.0);
  const [ciCx, ciCz] = toCanon(46.0, 48.0);
  const [mid1Cx, mid1Cz] = toCanon(31.0, 56.0);
  const [mid2Cx, mid2Cz] = toCanon(43.0, 63.0);
  const uaClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 7.5 },
    { x: huCx, z: huCz, r: 10.5 },
    { x: elCx, z: elCz, r: 8.5 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: mid1Cx, z: mid1Cz, r: 6.0 },
    { x: mid2Cx, z: mid2Cz, r: 6.0 },
  ];
  const uaIsClear = (px, pz) => {
    for (const bz of uaClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Vaea's Bleached Whale-Jawbone Archway grounded solidly on its flat terrace
  const [archCx, archCz] = toCanon(14.5, 55.5);
  const jawArch = createWhaleJawArchGroup(trackMat);
  jawArch.group.position.set(archCx, evalUaPouPoint(archCx, archCz).h - 0.1, archCz);
  jawArch.group.rotation.y = Math.PI * 0.5;
  group.add(jawArch.group);

  // Marquesan Stone-Paepae Huts around Pebble Cove & Sail-Tenders' Loft
  const huts = [
    [toCanon(-30.0, 34.0)[0], toCanon(-30.0, 34.0)[1], 0.45, 1.02],
    [toCanon(-28.0, 45.0)[0], toCanon(-28.0, 45.0)[1], 0.18, 0.96],
    [toCanon(4.0, 48.0)[0], toCanon(4.0, 48.0)[1], -0.35, 0.94],
    [toCanon(-33.0, 50.0)[0], toCanon(-33.0, 50.0)[1], 0.6, 0.9],
  ].map(([hx, hz, rotY, sc]) => ({
    x: hx,
    y: Math.max(0.8, evalUaPouPoint(hx, hz).h - 0.08),
    z: hz,
    rotY,
    scale: sc,
  }));
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  const [pierCx, pierCz] = toCanon(-2.0, 62.5);
  addTimberPier(group, trackMat, {
    x: pierCx,
    y: 0.7,
    z: pierCz,
    rotY: 0.1,
    length: 8.5,
    width: 1.65,
  });

  const [vaaCx, vaaCz] = toCanon(7.0, 65.0);
  addOutriggerCanoe(group, trackMat, {
    x: vaaCx,
    y: 0.34,
    z: vaaCz,
    rotY: Math.PI * 0.42,
  });

  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = -0.48 + (i / 36) * 0.96;
    const pr = 46.0 + (i % 4) * 3.8;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const pt = evalUaPouPoint(px, pz);
    if (pt.h > 0.7 && pt.h < 12.0 && uaIsClear(px, pz)) {
      palmPts.push([px, pt.h - 0.15, pz, -ang, 0.94 + (i % 3) * 0.08, 0.2]);
    }
    if (i % 2 === 0 && pt.h > 1.2 && pt.h < 18.0 && uaIsClear(px * 0.95, pz * 0.95)) {
      const sc = 0.96 + (i % 3) * 0.22;
      scrubPts.push([px * 0.95, pt.h - 0.1, pz * 0.95, sc * 1.12, sc * 0.62, sc * 1.04, -ang]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x265c21,
    hexB: 0x3b7228,
  });

  return { group, materials, sinkDepthM: 122.0 };
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
// 4. HIVA OA — Red-Tuff Quarry Cliffs, Black-Sand Bay & Colossal Carved Tikis (2x)
// ============================================================================
function evalHivaOaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const bayIndent = 12.0 * Math.exp(-Math.pow(theta / 0.34, 2.0));
  const eastCape = 15.0 * Math.exp(-Math.pow((theta + 0.74) / 0.38, 2.0));
  const westCape = 11.0 * Math.exp(-Math.pow((theta - 0.68) / 0.34, 2.0));
  const cragCoast = 4.6 * Math.cos(3.0 * theta + 0.9) + 2.4 * Math.sin(6.0 * theta);
  const coastR = Math.max(58.0, 72.0 - bayIndent + eastCape + westCape + cragCoast);

  if (r > coastR) {
    return {
      h: lerp(0.05, -5.0, smoothstep(coastR, coastR + 11.0, r)),
      isBlackSand: false,
      redQuarry: 0.0,
    };
  }

  const u = r / coastR;
  const inBay = Math.abs(theta) < 0.36;

  // Elongated Mount Temetiu dark volcanic spine (~82m peak astern) + stepped red-tuff quarry wall
  const ridgeSpine =
    60.0 * gaussian2D(x, z, -38.0, 12.0, 22.0, 30.0, 0.28) +
    26.0 * gaussian2D(x, z, -10.0, -14.0, 18.0, 16.0, -0.2);

  const cliffWall = inBay ? 3.2 * (1.0 - u) : 22.0 * smoothstep(1.0, 0.84, u);
  let h = ridgeSpine + cliffWall;

  // Gently level black-sand bay apron & Quarry Carvers' Shed flat
  const bayMask = gaussian2D(x, z, 46.0, 10.0, 17.0, 24.0, 0.08);
  if (bayMask > 0.02) {
    const bayTarget = lerp(1.2, 6.0, smoothstep(61.5, 24.0, x));
    h = lerp(h, bayTarget, clamp01(bayMask * 1.15));
  }

  // East Headland Sea-Bluff Terrace for Observation Circle at walkable (48, 48) -> canon (48.0, -48.0)
  const bluffProm = gaussian2D(x, z, 49.0, -49.0, 19.0, 18.0, -0.35);
  h = Math.max(h, 27.5 * smoothstep(0.18, 0.84, bluffProm));

  const dCircle = Math.hypot(x - 48.0, z + 48.0);
  if (dCircle < 12.0) {
    h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 12.0, dCircle));
  }

  // Tahia's Volcanic Quarry Terrace at walkable (20, 46) -> canon (46.0, -20.0)
  const dElder = Math.hypot(x - 46.0, z + 20.0);
  if (dElder < 10.5) {
    h = lerp(h, 8.5, 1.0 - smoothstep(4.8, 10.5, dElder));
  }

  // Single-pass closest-segment polyline trail matching WalkableIslandScene stepping stones
  const trailLegs = [
    [61.0, 9.5, 52.0, 13.5, 1.1, 2.6], // spawn (-9.5, 61.0) -> landing
    [61.0, 9.5, 36.0, 21.0, 1.1, 5.4], // spawn -> hut shed
    [61.0, 9.5, 46.0, -20.0, 1.1, 8.5], // spawn -> elder terrace
    [46.0, -20.0, 56.0, -31.0, 8.5, 14.5], // elder (20,46) -> mid1 (31,56)
    [56.0, -31.0, 63.0, -43.0, 14.5, 20.8], // mid1 (31,56) -> mid2 (43,63)
    [63.0, -43.0, 52.0, -51.0, 20.8, 27.3], // mid2 (43,63) -> rim (51,52)
    [52.0, -51.0, 48.0, -48.0, 27.3, 27.5], // rim -> circle center (48,48)
  ];
  let bestTrailD = 999.0;
  let bestTrailH = h;
  for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
    const seg = uaPouDistToSeg(x, z, ax, az, bx, bz);
    if (seg.d < bestTrailD) {
      bestTrailD = seg.d;
      bestTrailH = lerp(h0, h1, seg.t);
    }
  }
  if (bestTrailD < 14.5) {
    const mask = 1.0 - smoothstep(7.2, 14.5, bestTrailD);
    h = lerp(h, bestTrailH, mask);
  }

  if (inBay && u > 0.84) {
    h = lerp(h, 1.5 * (1.0 - smoothstep(0.84, 1.0, u)), 0.82);
  }
  if (dCircle < 8.2) {
    h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 8.2, dCircle));
  }

  // Flat grounded Tiki Quarry Plaza terrace at walkable (13.0, 56.0) -> canon (56.0, -13.0)
  const dQuarry = Math.hypot(x - 56.0, z + 13.0);
  if (dQuarry < 9.5) {
    h = lerp(h, 8.2, 1.0 - smoothstep(6.2, 9.5, dQuarry));
  }

  return {
    h,
    isBlackSand: inBay && u > 0.8,
    redQuarry: clamp01(
      gaussian2D(x, z, 46.0, -14.0, 16.0, 14.0, 0.2) * 1.35 +
        gaussian2D(x, z, -12.0, -14.0, 14.0, 12.0, -0.2) * 0.9
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
  const colBlackSand = [0.11, 0.11, 0.13];
  const colJungle = [0.12, 0.36, 0.14];
  const colRedTuff = [0.6, 0.23, 0.15]; // Oxidized red volcanic quarry tuff!
  const colDarkCrag = [0.16, 0.16, 0.19];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalHivaOaPoint,
    maxRadius: 112.0,
    nRings: 118,
    nSegs: 180,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isBlackSand && s.h < 2.2) {
        return mixRgb(colBlackSand, colJungle, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colJungle, colDarkCrag, smoothstep(0.85, 1.75, slope) * 0.88);
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
  addCliffSurfCollar(group, foamMat, 80.0, 0.4, Math.PI * 2.0 - 0.4, 54);

  // Offshore Basalt Sea-Stacks guarding the steep crag headlands
  const stackMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x26252a, roughness: 0.92 })
  );
  for (const [sx, sz, hScale, rScale, rot] of [
    [60.0, 56.0, 14.0, 4.2, 0.4],
    [-68.0, 44.0, 15.5, 4.6, 1.5],
    [-70.0, -38.0, 12.5, 3.6, 2.3],
  ]) {
    const stack = new THREE.Mesh(makeStoneRockGeometry(1.0, 29), stackMat);
    stack.scale.set(rScale, hScale, rScale * 0.85);
    stack.position.set(sx, 0.0, sz);
    stack.rotation.y = rot;
    group.add(stack);
  }

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-9.5, 61.0);
  const [laCx, laCz] = toCanon(-13.5, 52.0);
  const [huCx, huCz] = toCanon(-21.0, 36.0);
  const [elCx, elCz] = toCanon(20.0, 46.0);
  const [ciCx, ciCz] = toCanon(48.0, 48.0);
  const [mid1Cx, mid1Cz] = toCanon(31.0, 56.0);
  const [mid2Cx, mid2Cz] = toCanon(43.0, 63.0);
  const hivaClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 7.5 },
    { x: huCx, z: huCz, r: 10.5 },
    { x: elCx, z: elCz, r: 8.5 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: mid1Cx, z: mid1Cz, r: 6.0 },
    { x: mid2Cx, z: mid2Cz, r: 6.0 },
  ];
  const hivaIsClear = (px, pz) => {
    for (const bz of hivaClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Tahia's Colossal Carved Red-Tuff Marquesan Tiki Statues grounded on the Quarry Plaza!
  const redTuffMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xa84330, roughness: 0.86 })
  );
  const darkBasaltMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x302e2d, roughness: 0.92 })
  );

  for (const [wx, wz, rotY, sc] of [
    [11.0, 54.5, 0.35, 1.15],
    [14.5, 57.5, 0.5, 1.05],
    [9.5, 58.0, -0.25, 1.0],
  ]) {
    const [tx, tz] = toCanon(wx, wz);
    const ty = evalHivaOaPoint(tx, tz).h;
    const tiki = createMarquesanTikiMesh(redTuffMat, darkBasaltMat, sc);
    tiki.position.set(tx, ty - 0.14, tz);
    tiki.rotation.y = rotY;
    group.add(tiki);
  }

  // Half-quarried recumbent red-tuff monolith block grounded on the quarry terrace
  const [qCx, qCz] = toCanon(13.5, 53.5);
  const quarryWork = createQuarriedTikiBlockGroup(redTuffMat, darkBasaltMat);
  quarryWork.group.position.set(qCx, evalHivaOaPoint(qCx, qCz).h - 0.08, qCz);
  quarryWork.group.rotation.y = 0.65;
  group.add(quarryWork.group);

  const huts = [
    [toCanon(-30.0, 34.0)[0], toCanon(-30.0, 34.0)[1], 0.45, 1.02],
    [toCanon(-28.0, 45.0)[0], toCanon(-28.0, 45.0)[1], 0.18, 0.96],
    [toCanon(4.0, 48.0)[0], toCanon(4.0, 48.0)[1], -0.35, 0.94],
    [toCanon(-33.0, 50.0)[0], toCanon(-33.0, 50.0)[1], 0.6, 0.9],
  ].map(([hx, hz, rotY, sc]) => ({
    x: hx,
    y: Math.max(0.8, evalHivaOaPoint(hx, hz).h - 0.08),
    z: hz,
    rotY,
    scale: sc,
  }));
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  const [pierCx, pierCz] = toCanon(-2.0, 62.5);
  addTimberPier(group, trackMat, {
    x: pierCx,
    y: 0.7,
    z: pierCz,
    rotY: 0.1,
    length: 8.5,
    width: 1.65,
  });

  const [vaaCx, vaaCz] = toCanon(6.5, 65.5);
  addOutriggerCanoe(group, trackMat, {
    x: vaaCx,
    y: 0.34,
    z: vaaCz,
    rotY: Math.PI * 0.42,
  });

  const banyanPts = [
    [toCanon(-36.0, 37.0)[0], 0, toCanon(-36.0, 37.0)[1], 1.22, 0.4],
    [toCanon(-6.0, 34.0)[0], 0, toCanon(-6.0, 34.0)[1], 1.12, -0.5],
  ]
    .filter(([bx, , bz]) => hivaIsClear(bx, bz))
    .map(([bx, , bz, sc, rot]) => [bx, Math.max(1.2, evalHivaOaPoint(bx, bz).h), bz, sc, rot]);
  addBroadleafTrees(group, trackMat, banyanPts);

  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = -0.48 + (i / 36) * 0.96;
    const pr = 46.0 + (i % 4) * 3.8;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const pt = evalHivaOaPoint(px, pz);
    if (pt.h > 0.7 && pt.h < 12.0 && hivaIsClear(px, pz)) {
      palmPts.push([px, pt.h - 0.15, pz, -ang, 0.94 + (i % 3) * 0.08, 0.2]);
    }
    if (i % 2 === 0 && pt.h > 1.2 && pt.h < 18.0 && hivaIsClear(px * 0.95, pz * 0.95)) {
      const sc = 0.96 + (i % 3) * 0.22;
      scrubPts.push([px * 0.95, pt.h - 0.1, pz * 0.95, sc * 1.12, sc * 0.62, sc * 1.04, -ang]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts);

  return { group, materials, sinkDepthM: 120.0 };
}

// ============================================================================
// 5. FATU HIVA — Hanavave Basalt Sea-Pillars, Twin Waterfalls & Shipwright Shed (2x)
// ============================================================================
function evalFatuHivaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const canyonBay = 14.5 * Math.exp(-Math.pow(theta / 0.34, 2.0));
  const eastCape = 15.0 * Math.exp(-Math.pow((theta + 0.74) / 0.38, 2.0));
  const westCape = 11.5 * Math.exp(-Math.pow((theta - 0.68) / 0.34, 2.0));
  const cliffFolding = 3.8 * Math.cos(6.0 * theta) + 2.2 * Math.sin(9.0 * theta);
  const coastR = Math.max(58.0, 72.0 - canyonBay + eastCape + westCape + cliffFolding);

  if (r > coastR) {
    return {
      h: lerp(0.05, -5.0, smoothstep(coastR, coastR + 11.0, r)),
      canyonLush: 0.0,
      isLanding: false,
    };
  }

  const u = r / coastR;
  const inBay = Math.abs(theta) < 0.36;

  // Steep emerald rainforest amphitheater canyon walls framing Hanavave / Waterfall Bay (~84m back headwall)
  const backHeadwall = 63.0 * gaussian2D(x, z, -40.0, 10.0, 22.0, 30.0, 0.1);
  const westWall = 52.0 * gaussian2D(x, z, -12.0, 30.0, 22.0, 14.0, 0.25);
  const eastWall = 38.0 * gaussian2D(x, z, -24.0, -24.0, 20.0, 14.0, -0.2);

  const seaCliff = inBay ? 2.6 * (1.0 - u) : 22.0 * smoothstep(1.0, 0.84, u);
  let h = seaCliff + Math.max(backHeadwall, westWall, eastWall);

  // Gently level Waterfall Bay careening foreshore & Forest Timber Yard
  const bayMask = gaussian2D(x, z, 46.0, 10.0, 17.0, 24.0, 0.08);
  if (bayMask > 0.02) {
    const bayTarget = lerp(1.2, 5.8, smoothstep(61.5, 24.0, x));
    h = lerp(h, bayTarget, clamp01(bayMask * 1.15));
  }

  // East Headland Sea-Bluff Terrace for Observation Circle at walkable (48, 48) -> canon (48.0, -48.0)
  const bluffProm = gaussian2D(x, z, 49.0, -49.0, 19.0, 18.0, -0.35);
  h = Math.max(h, 27.5 * smoothstep(0.18, 0.84, bluffProm));

  const dCircle = Math.hypot(x - 48.0, z + 48.0);
  if (dCircle < 12.0) {
    h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 12.0, dCircle));
  }

  // Oihanu's Great Vaka Moana Shed Terrace at walkable (20, 46) -> canon (46.0, -20.0)
  const dElder = Math.hypot(x - 46.0, z + 20.0);
  if (dElder < 10.5) {
    h = lerp(h, 8.5, 1.0 - smoothstep(4.8, 10.5, dElder));
  }

  // Single-pass closest-segment polyline trail matching WalkableIslandScene stepping stones
  const trailLegs = [
    [61.0, 9.5, 52.0, 13.5, 1.1, 2.6], // spawn (-9.5, 61.0) -> landing
    [61.0, 9.5, 36.0, 21.0, 1.1, 5.4], // spawn -> hut timber yard
    [61.0, 9.5, 46.0, -20.0, 1.1, 8.5], // spawn -> elder terrace
    [46.0, -20.0, 56.0, -31.0, 8.5, 14.5], // elder (20,46) -> mid1 (31,56)
    [56.0, -31.0, 63.0, -43.0, 14.5, 20.8], // mid1 (31,56) -> mid2 (43,63)
    [63.0, -43.0, 52.0, -51.0, 20.8, 27.3], // mid2 (43,63) -> rim (51,52)
    [52.0, -51.0, 48.0, -48.0, 27.3, 27.5], // rim -> circle center (48,48)
  ];
  let bestTrailD = 999.0;
  let bestTrailH = h;
  for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
    const seg = uaPouDistToSeg(x, z, ax, az, bx, bz);
    if (seg.d < bestTrailD) {
      bestTrailD = seg.d;
      bestTrailH = lerp(h0, h1, seg.t);
    }
  }
  if (bestTrailD < 14.5) {
    const mask = 1.0 - smoothstep(7.2, 14.5, bestTrailD);
    h = lerp(h, bestTrailH, mask);
  }

  if (inBay && u > 0.84) {
    h = lerp(h, 1.5 * (1.0 - smoothstep(0.84, 1.0, u)), 0.82);
  }
  if (dCircle < 8.2) {
    h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 8.2, dCircle));
  }

  // Flat grounded terrace for Oihanu's Great Vaka Moana Shipwright Shed at walkable (8.0, 57.5) -> canon (57.5, -8.0)
  const dShed = Math.hypot(x - 57.5, z + 8.0);
  if (dShed < 9.5) {
    h = lerp(h, 4.6, 1.0 - smoothstep(6.2, 9.5, dShed));
  }

  return {
    h,
    canyonLush: clamp01(1.0 - Math.abs(z) / 38.0),
    isLanding: inBay && u > 0.8,
  };
}

function buildFatuHivaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.23, 0.41];
  const colCareeningSand = [0.68, 0.62, 0.49];
  const colRainforest = [0.11, 0.38, 0.14];
  const colBrightFern = [0.22, 0.5, 0.18];
  const colWetBasalt = [0.15, 0.16, 0.19];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalFatuHivaPoint,
    maxRadius: 112.0,
    nRings: 118,
    nSegs: 180,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isLanding && s.h < 2.2) {
        return mixRgb(colCareeningSand, colRainforest, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colRainforest, colBrightFern, s.canyonLush * 0.55);
      rgb = mixRgb(rgb, colWetBasalt, smoothstep(0.85, 1.75, slope) * 0.88);
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

  // Iconic Hanavave ("Bay of Virgins") Towering Rectangular Basalt Sea-Pillar Monoliths (2x)!
  const pillarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c2d31,
      roughness: 0.9,
      flatShading: true,
    })
  );
  for (const [px, pz, pw, ph, rotY] of [
    [52.0, 32.0, 5.8, 48.0, 0.2],
    [59.0, 38.0, 5.0, 38.0, -0.15],
    [46.0, 36.0, 5.2, 42.0, 0.35],
    [46.0, -28.0, 5.4, 38.0, -0.22],
    [58.0, -26.0, 4.6, 32.0, 0.18],
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
  addCliffSurfCollar(group, foamMat, 80.0, 0.4, Math.PI * 2.0 - 0.4, 54);

  // Twin Hanging Rainforest Waterfalls Cascading into Waterfall Bay!
  addWaterfallCascade(group, trackMat, {
    x: -10.0,
    y: 34.0,
    z: -16.0,
    width: 2.4,
    height: 44.0,
    rotY: 0.22,
    tiltX: -0.35,
  });
  addWaterfallCascade(group, trackMat, {
    x: -16.0,
    y: 36.0,
    z: 14.0,
    width: 2.6,
    height: 46.0,
    rotY: Math.PI * 0.62,
    tiltX: -0.34,
  });

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-9.5, 61.0);
  const [laCx, laCz] = toCanon(-13.5, 52.0);
  const [huCx, huCz] = toCanon(-21.0, 36.0);
  const [elCx, elCz] = toCanon(20.0, 46.0);
  const [ciCx, ciCz] = toCanon(48.0, 48.0);
  const [mid1Cx, mid1Cz] = toCanon(31.0, 56.0);
  const [mid2Cx, mid2Cz] = toCanon(43.0, 63.0);
  const fatuClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 7.5 },
    { x: huCx, z: huCz, r: 10.5 },
    { x: elCx, z: elCz, r: 8.5 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: mid1Cx, z: mid1Cz, r: 6.0 },
    { x: mid2Cx, z: mid2Cz, r: 6.0 },
  ];
  const fatuIsClear = (px, pz) => {
    for (const bz of fatuClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Oihanu's Great Vaka Moana Shipwright Shed & Timber Careening Slipway grounded solidly!
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x694224, roughness: 0.85 })
  );
  const [shedCx, shedCz] = toCanon(8.0, 57.5);
  const shedY = evalFatuHivaPoint(shedCx, shedCz).h;
  const grandShed = new THREE.Group();
  grandShed.position.set(shedCx, shedY - 0.12, shedCz);

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

  // Timber careening slipway rails running down toward Waterfall Bay water
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
    [toCanon(-30.0, 34.0)[0], toCanon(-30.0, 34.0)[1], 0.45, 1.02],
    [toCanon(-28.0, 45.0)[0], toCanon(-28.0, 45.0)[1], 0.18, 0.96],
    [toCanon(4.0, 48.0)[0], toCanon(4.0, 48.0)[1], -0.35, 0.94],
    [toCanon(-33.0, 50.0)[0], toCanon(-33.0, 50.0)[1], 0.6, 0.9],
  ].map(([hx, hz, rotY, sc]) => ({
    x: hx,
    y: Math.max(0.8, evalFatuHivaPoint(hx, hz).h - 0.08),
    z: hz,
    rotY,
    scale: sc,
  }));
  addRegionalHuts(group, trackMat, huts, 'marquesan');

  const [pierCx, pierCz] = toCanon(-2.0, 62.5);
  addTimberPier(group, trackMat, {
    x: pierCx,
    y: 0.7,
    z: pierCz,
    rotY: 0.1,
    length: 8.5,
    width: 1.65,
  });

  const [vaaCx, vaaCz] = toCanon(6.5, 65.5);
  addOutriggerCanoe(group, trackMat, {
    x: vaaCx,
    y: 0.34,
    z: vaaCz,
    rotY: Math.PI * 0.42,
  });

  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = -0.48 + (i / 36) * 0.96;
    const pr = 46.0 + (i % 4) * 3.8;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const pt = evalFatuHivaPoint(px, pz);
    if (pt.h > 0.7 && pt.h < 12.0 && fatuIsClear(px, pz)) {
      palmPts.push([px, pt.h - 0.15, pz, -ang, 0.98, 0.22]);
    }
    if (i % 2 === 0 && pt.h > 1.2 && pt.h < 18.0 && fatuIsClear(px * 0.95, pz * 0.95)) {
      const sc = 0.96 + (i % 3) * 0.22;
      scrubPts.push([px * 0.95, pt.h - 0.1, pz * 0.95, sc * 1.12, sc * 0.62, sc * 1.04, -ang]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x20541c,
    hexB: 0x356c24,
  });

  return { group, materials, sinkDepthM: 120.0 };
}

// ============================================================================
// 6. MANGAREVA — Asymmetric Mount Duff Wedge + Expansive Organic Lapa Lagoon (2x)
// ============================================================================
function evalMangarevaReefRadius(theta) {
  return (
    102.0 +
    11.5 * Math.cos(2.0 * theta - 0.55) +
    7.5 * Math.sin(3.0 * theta + 0.9) +
    5.2 * Math.cos(5.0 * theta - 1.1) +
    2.8 * Math.sin(7.0 * theta + 0.4)
  );
}

function evalMangarevaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Asymmetric crooked-headland central island footprint (non-circular!)
  const rx = x * 0.94 + z * 0.08;
  const rz = z * 1.08 - x * 0.06;
  const rWarp = Math.hypot(rx, rz);
  const eastCape = 24.5 * Math.exp(-Math.pow((theta + 0.78) / 0.48, 2.0));
  const westCape = 10.5 * Math.exp(-Math.pow((theta - 0.85) / 0.36, 2.0));
  const bayIndent = 6.5 * Math.exp(-Math.pow((theta - 0.08) / 0.3, 2.0));
  const organicWaves =
    5.4 * Math.cos(2.0 * theta - 0.5) +
    3.6 * Math.sin(3.0 * theta + 0.8) +
    2.4 * Math.cos(5.0 * theta - 0.7);
  const islandCoastR = Math.max(54.0, 61.0 - bayIndent + eastCape + westCape + organicWaves);

  const outerReefR = evalMangarevaReefRadius(theta);
  const passMask = arcMask(theta, 0.02, 0.16, 0.06);

  if (r <= islandCoastR) {
    const u = rWarp / (islandCoastR + 4.0);
    // Iconic Mount Duff asymmetric tilted hogback wedge (gradual north slope, sheer south cliff!)
    const dx = x + 32.0;
    const dz = z - 12.0;
    const rotX = dx * 0.85 + dz * 0.52;
    const rotZ = -dx * 0.52 + dz * 0.85;
    const ridgeSpine = Math.exp(-Math.pow(rotX / 22.0, 2.0));
    const asymWedge =
      rotZ < 4.5
        ? smoothstep(-28.0, 4.5, rotZ)
        : Math.exp(-Math.pow((rotZ - 4.5) / 5.8, 2.0));
    const mountDuff = 78.0 * ridgeSpine * asymWedge;

    // Secondary Mount Mokoto dramatic twin peak
    const mokoto = 52.0 * gaussian2D(x, z, -30.0, -18.0, 14.0, 12.0, 0.2);
    const apron = 6.0 * smoothstep(1.0, 0.65, clamp01(u));

    let h = apron + mountDuff + mokoto;

    // Gently level Mist-Border harbor cove & Outfitting Fare apron
    const bayMask = gaussian2D(x, z, 46.0, 10.0, 17.0, 24.0, 0.08);
    if (bayMask > 0.02) {
      const bayTarget = lerp(1.1, 5.8, smoothstep(60.5, 24.0, x));
      h = lerp(h, bayTarget, clamp01(bayMask * 1.15));
    }

    // East Headland Sea-Bluff Terrace for Observation Circle at walkable (46, 46) -> canon (46.0, -46.0)
    const bluffProm = gaussian2D(x, z, 47.0, -47.0, 19.0, 18.0, -0.35);
    h = Math.max(h, 27.5 * smoothstep(0.18, 0.84, bluffProm));

    const dCircle = Math.hypot(x - 46.0, z + 46.0);
    if (dCircle < 12.0) {
      h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 12.0, dCircle));
    }

    // Elder Rongo's terrace at walkable (20, 46) -> canon (46.0, -20.0)
    const dElder = Math.hypot(x - 46.0, z + 20.0);
    if (dElder < 10.5) {
      h = lerp(h, 8.5, 1.0 - smoothstep(4.8, 10.5, dElder));
    }

    // Single-pass closest-segment polyline trail matching WalkableIslandScene stepping stones
    const trailLegs = [
      [59.5, 9.5, 51.0, 13.5, 1.1, 2.6], // spawn (-9.5, 59.5) -> landing
      [59.5, 9.5, 36.0, 21.0, 1.1, 5.4], // spawn -> hut fare
      [59.5, 9.5, 46.0, -20.0, 1.1, 8.5], // spawn -> elder terrace
      [46.0, -20.0, 56.0, -31.0, 8.5, 14.5], // elder (20,46) -> mid1 (31,56)
      [56.0, -31.0, 62.0, -43.0, 14.5, 20.8], // mid1 (31,56) -> mid2 (43,62)
      [62.0, -43.0, 50.0, -49.0, 20.8, 27.3], // mid2 (43,62) -> rim (49,50)
      [50.0, -49.0, 46.0, -46.0, 27.3, 27.5], // rim -> circle center (46,46)
    ];
    let bestTrailD = 999.0;
    let bestTrailH = h;
    for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
      const seg = uaPouDistToSeg(x, z, ax, az, bx, bz);
      if (seg.d < bestTrailD) {
        bestTrailD = seg.d;
        bestTrailH = lerp(h0, h1, seg.t);
      }
    }
    if (bestTrailD < 14.5) {
      const mask = 1.0 - smoothstep(7.2, 14.5, bestTrailD);
      h = lerp(h, bestTrailH, mask);
    }

    if (r / islandCoastR > 0.88 && dCircle > 10.5 && bestTrailD > 8.5) {
      h = lerp(h, 0.45, smoothstep(0.88, 1.0, r / islandCoastR));
    }
    if (dCircle < 8.2) {
      h = lerp(h, 27.5, 1.0 - smoothstep(5.6, 8.2, dCircle));
    }

    // Flat grounded Gateway Marae terrace at walkable (13.0, 56.0) -> canon (56.0, -13.0)
    const dMarae = Math.hypot(x - 56.0, z + 13.0);
    if (dMarae < 8.5) {
      h = lerp(h, 6.2, 1.0 - smoothstep(5.5, 8.5, dMarae));
    }

    return {
      h,
      zone: r / islandCoastR > 0.87 && h < 2.2 ? 'beach' : 'island',
    };
  }

  // Expansive organic turquoise Lapa lagoon out to warped outerReefR(theta)
  if (r <= outerReefR) {
    let h = lerp(0.16, 0.23, smoothstep(islandCoastR, outerReefR, r));
    let zone = 'lapa_lagoon';

    const motuCenterR = outerReefR - 7.5;
    for (const [mAng, mSpan] of [
      [1.15, 0.28],
      [-1.35, 0.3],
      [2.55, 0.34],
    ]) {
      const mMask = arcMask(theta, mAng, mSpan, 0.07);
      if (mMask > 0.02 && Math.abs(r - motuCenterR) < 5.2) {
        const mt = 1.0 - Math.abs(r - motuCenterR) / 5.2;
        const mh = 2.6 * smoothstep(0.0, 1.0, mt) * mMask;
        if (mh > h) {
          h = mh;
          zone = mh > 1.35 ? 'motu_veg' : 'beach';
        }
      }
    }

    h = lerp(h, -3.0, passMask * smoothstep(64.0, 78.0, r));
    if (h < 0.05) zone = 'deep_sea';
    return { h, zone };
  }

  const drop = smoothstep(outerReefR, outerReefR + 10.0, r);
  const h = lerp(lerp(0.24, -3.0, passMask), -4.8, drop);
  return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef' };
}

function buildMangarevaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.26, 0.44];
  const colLapaLagoon = [0.16, 0.85, 0.78];
  const colCreamSand = [0.94, 0.89, 0.77];
  const colGoldenGrass = [0.44, 0.56, 0.23];
  const colValleyGreen = [0.15, 0.4, 0.17];
  const colDuffCliff = [0.22, 0.21, 0.22];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalMangarevaPoint,
    maxRadius: 122.0,
    nRings: 118,
    nSegs: 180,
    colorFn: (s, slope) => {
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        return mixRgb(colLapaLagoon, colDeepSea, clamp01(-s.h / 2.8));
      }
      if (s.zone === 'lapa_lagoon' || s.zone === 'papa_reef') return colLapaLagoon;
      if (s.zone === 'beach' && s.h < 1.9) {
        return mixRgb(colCreamSand, colValleyGreen, smoothstep(1.0, 1.9, s.h));
      }
      if (s.zone === 'motu_veg') return colValleyGreen;
      let rgb = mixRgb(colValleyGreen, colGoldenGrass, smoothstep(10.0, 44.0, s.h));
      rgb = mixRgb(rgb, colDuffCliff, smoothstep(0.88, 1.75, slope) * 0.9);
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

  // Organic Turquoise Lapa Lagoon & Non-Circular Barrier Reef + Motu Islets
  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x2ce8d2, depthWrite: false }),
    0.38
  );
  const lagoonDisc = new THREE.Mesh(
    createOrganicLagoonGeometry((th) => evalMangarevaReefRadius(th) - 4.0, 108),
    lagoonMat
  );
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6d8b4, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.75
  );
  addOrganicBarrierReefArc(
    group,
    reefMat,
    foamMat,
    evalMangarevaReefRadius,
    0.22,
    Math.PI * 2.0 - 0.16,
    92
  );

  const mangarevaMotuSites = [];
  for (const [mAng, rx, rz, seed] of [
    [1.15, 13.0, 6.4, 3.7],
    [-1.35, 13.5, 6.6, 6.9],
    [2.55, 14.5, 7.0, 10.2],
  ]) {
    const mr = evalMangarevaReefRadius(mAng) - 7.5;
    const mx = mr * Math.cos(mAng);
    const mz = mr * Math.sin(mAng);
    const motu = new THREE.Mesh(
      createOrganicMotuGeometry({ radiusX: rx, radiusZ: rz, height: 1.45, seed }),
      reefMat
    );
    motu.position.set(mx, 0.34, mz);
    motu.rotation.y = -mAng + Math.PI * 0.5;
    group.add(motu);
    mangarevaMotuSites.push([mx, mz, mAng]);
  }

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-9.5, 59.5);
  const [laCx, laCz] = toCanon(-13.5, 51.0);
  const [huCx, huCz] = toCanon(-21.0, 36.0);
  const [elCx, elCz] = toCanon(20.0, 46.0);
  const [ciCx, ciCz] = toCanon(46.0, 46.0);
  const [mid1Cx, mid1Cz] = toCanon(31.0, 56.0);
  const [mid2Cx, mid2Cz] = toCanon(43.0, 62.0);
  const mangClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 7.5 },
    { x: huCx, z: huCz, r: 10.5 },
    { x: elCx, z: elCz, r: 8.5 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: mid1Cx, z: mid1Cz, r: 6.0 },
    { x: mid2Cx, z: mid2Cz, r: 6.0 },
  ];
  const mangIsClear = (px, pz) => {
    for (const bz of mangClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Elder Rongo's Dressed White-Coral Block Gateway Marae grounded solidly on its flat terrace!
  const [marCx, marCz] = toCanon(13.0, 56.0);
  addMaraePlatform(group, trackMat, {
    x: marCx,
    y: evalMangarevaPoint(marCx, marCz).h - 0.12,
    z: marCz,
    rotY: -0.28,
    scale: 0.96,
    courtHex: 0xdcd3be,
    ahuHex: 0xf0ead9,
  });

  const huts = [
    [toCanon(-30.0, 34.0)[0], toCanon(-30.0, 34.0)[1], 0.45, 1.02, true],
    [toCanon(-28.0, 45.0)[0], toCanon(-28.0, 45.0)[1], 0.18, 0.96, false],
    [toCanon(4.0, 48.0)[0], toCanon(4.0, 48.0)[1], -0.35, 0.94, false],
    [toCanon(-33.0, 50.0)[0], toCanon(-33.0, 50.0)[1], 0.6, 0.9, false],
  ].map(([hx, hz, rotY, sc, longHouse]) => ({
    x: hx,
    y: Math.max(0.8, evalMangarevaPoint(hx, hz).h - 0.08),
    z: hz,
    rotY,
    scale: sc,
    longHouse,
  }));
  addRegionalHuts(group, trackMat, huts, 'society');

  const [pierCx, pierCz] = toCanon(-2.0, 62.5);
  addTimberPier(group, trackMat, {
    x: pierCx,
    y: 0.7,
    z: pierCz,
    rotY: 0.08,
    length: 8.5,
    width: 1.65,
  });

  const [vaaCx, vaaCz] = toCanon(6.5, 65.5);
  addOutriggerCanoe(group, trackMat, {
    x: vaaCx,
    y: 0.34,
    z: vaaCz,
    rotY: Math.PI * 0.42,
  });

  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = -0.48 + (i / 36) * 0.96;
    const pr = 46.0 + (i % 4) * 3.8;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const pt = evalMangarevaPoint(px, pz);
    if (pt.h > 0.7 && pt.h < 12.0 && mangIsClear(px, pz)) {
      palmPts.push([px, pt.h - 0.15, pz, -ang, 0.94 + (i % 3) * 0.08, 0.22]);
    }
    if (i % 2 === 0 && pt.h > 1.2 && pt.h < 18.0 && mangIsClear(px * 0.95, pz * 0.95)) {
      const sc = 0.96 + (i % 3) * 0.22;
      scrubPts.push([px * 0.95, pt.h - 0.1, pz * 0.95, sc * 1.12, sc * 0.62, sc * 1.04, -ang]);
    }
  }
  for (const [mox, moz, mang] of mangarevaMotuSites) {
    palmPts.push([mox + 2.0, 1.0, moz - 1.5, -mang + 0.2, 0.94, 0.24]);
    palmPts.push([mox - 2.4, 0.95, moz + 2.0, -mang - 0.25, 0.86, 0.22]);
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts);

  return { group, materials, sinkDepthM: 112.0 };
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
