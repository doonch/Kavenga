/**
 * Sculpted 3D Terrain, Reefs, Vegetation & Cultural Landmarks for Remaining Act I Islands:
 * - Huahine ("Twin-Peak Artisans' Isle"): Twin sub-islands split by turquoise Maroe Strait,
 *   V-shaped Maeva basalt stone fish traps, Ari'i's Sail-Weaving Loft & stretched pandanus sails.
 * - Mo'orea ("Jagged Volcanic Spire"): Twin northern fjord bays flanking Mount Rotui in front of
 *   the jagged Mou'a Puta / Tohivea cathedral spire amphitheater & Vaihere's Canoe-Wright Shed.
 * - Maupiti ("Outer Fortress Rock"): Sheer central Mount Teurafa'atiu basalt citadel encircled by
 *   a wide jade lagoon, long outer white-sand motu arcs, Onoiau foaming pass & Tera'i's 12-stone Star Ring.
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
  addStarStoneCircle,
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
  createBasaltFishWeirGroup,
  createCarvedHullPairGroup,
  createPandanusSailFrameGroup,
  makeStoneRockGeometry,
} from './IslandPropsBuilder.js';

// ============================================================================
// 1. HUAHINE — Twin Islands Split by Turquoise Maroe Strait + Stone Fish Traps
// ============================================================================
function evalHuahineCoastR(theta) {
  const bayThetaDiff = Math.atan2(Math.sin(theta), Math.cos(theta));
  const bayCarve = 22.5 * Math.exp(-Math.pow(bayThetaDiff / 0.56, 2.0));
  return (
    108.0 -
    22.0 * Math.cos(2.0 * theta) -
    bayCarve +
    3.6 * Math.sin(3.0 * theta + 0.55) +
    2.2 * Math.cos(4.0 * theta + 0.35) +
    1.2 * Math.sin(5.0 * theta - 0.9)
  );
}

function evalHuahineReefRadius(theta) {
  const ax = 104.0;
  const bz = 148.0;
  const baseEllip =
    (ax * bz) / Math.hypot(bz * Math.cos(theta), ax * Math.sin(theta));
  return (
    baseEllip +
    6.8 * Math.cos(2.0 * theta - 0.55) +
    5.2 * Math.sin(3.0 * theta + 0.7) +
    3.6 * Math.cos(5.0 * theta - 1.0)
  );
}

function evalHuahineStraitCenterZ(x) {
  return 4.2 * Math.sin(x * 0.045 + 0.3) - 1.2;
}

function smoothMin(a, b, k) {
  const hMix = clamp01(0.5 + 0.5 * ((b - a) / k));
  return lerp(b, a, hMix) - k * hMix * (1.0 - hMix);
}

function evalHuahinePoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const coastR = evalHuahineCoastR(theta);

  // Winding Maroe Strait cutting cleanly between Huahine Nui (z < 0) & Huahine Iti (z > 0)
  const straitCenterZ = evalHuahineStraitCenterZ(x);
  const straitHalfW = 3.5 + 0.8 * Math.cos(x * 0.06);
  const straitDist = Math.abs(z - straitCenterZ);
  const straitMask = 1.0 - smoothstep(straitHalfW, straitHalfW + 8.0, straitDist);

  const passMask =
    arcMask(theta, 0.0, 0.22, 0.09) * smoothstep(61.5, 78.0, r);

  if (r > coastR) {
    const outerReefR = evalHuahineReefRadius(theta);
    if (r <= outerReefR) {
      const uBay = smoothstep(coastR, outerReefR, r);
      const lagoonFloor = lerp(-0.1, 0.14, uBay);
      const h = lerp(lagoonFloor, -2.8, passMask);
      return { h, straitMask: 0.0, ridge: 0.0, inLagoon: h > 0.04 };
    }
    const drop = smoothstep(outerReefR, outerReefR + 12.0, r);
    const h = lerp(lerp(0.18, -2.8, passMask), -4.5, drop);
    return { h, straitMask: 0.0, ridge: 0.0, inLagoon: false };
  }

  // World-metric Lipschitz slopes via smoothMin of summit cone, strait ramp, and coast ramp:
  // Every component keeps slope <= 0.86 so zero cliff walls form along bays or Maroe Strait.
  const isNui = z < straitCenterZ;
  const maxSummit = isNui ? 44.0 : 37.8;
  const peakCone = isNui
    ? Math.min(44.0, 48.0 - 0.62 * Math.hypot((x + 2.0) * 0.98, (z + 64.0) * 0.94))
    : Math.min(37.8, 41.0 - 0.6 * Math.hypot((x - 4.0) * 0.98, (z - 62.0) * 0.94));

  const dStrait = Math.max(0.0, straitDist - straitHalfW);
  const straitRamp = 0.16 + 0.785 * dStrait;
  const coastRamp = 0.16 + 0.73 * Math.max(0.0, coastR - r);

  const boundedHill = smoothMin(
    smoothMin(peakCone, straitRamp, 1.8),
    coastRamp,
    1.8
  );

  const ribEnv = smoothstep(6.0, 18.0, boundedHill) * smoothstep(38.0, 22.0, boundedHill);
  const radialRibs = (0.5 + 0.5 * Math.cos(6.0 * theta + 0.5)) * 0.4 * ribEnv;

  let h = clamp01((boundedHill + radialRibs) / maxSummit) * maxSummit;
  h = Math.max(0.16, h);

  // Gentle sandy village clearing around spawn/landing on Huahine Iti front cove
  const spawnDist = Math.hypot(x - 64.0, z - 15.5);
  if (spawnDist < 12.5) {
    h = lerp(h, 1.35, smoothstep(12.5, 4.5, spawnDist) * 0.82);
  }

  // Fine level trim across Observation Knoll plateau (-2.0, -64.0)
  const nuiSummitDist = Math.hypot(x + 2.0, z + 64.0);
  if (nuiSummitDist < 7.5) {
    h = lerp(h, 44.0, smoothstep(7.5, 5.2, nuiSummitDist));
  }

  h = lerp(h, -2.5, passMask);

  return {
    h,
    straitMask,
    ridge: clamp01(radialRibs / 0.9),
    inLagoon: straitMask > 0.68 && h < 0.35,
  };
}

function buildHuahineAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.05, 0.28, 0.44];
  const colLagoon = [0.15, 0.8, 0.73];
  const colStraitJade = [0.12, 0.74, 0.69];
  const colCreamSand = [0.93, 0.87, 0.72];
  const colBreadfruit = [0.2, 0.49, 0.19];
  const colSunFern = [0.37, 0.55, 0.22];
  const colHighJungle = [0.13, 0.35, 0.16];
  const colBasalt = [0.28, 0.26, 0.24];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalHuahinePoint,
    maxRadius: 158.0,
    nRings: 92,
    nSegs: 124,
    colorFn: (s, slope) => {
      if (s.h < 0.04) {
        return mixRgb(colLagoon, colDeepSea, clamp01(-s.h / 2.8));
      }
      if (s.inLagoon || s.h < 0.26) {
        return s.straitMask > 0.4 ? colStraitJade : colLagoon;
      }
      if (s.h < 2.2 && slope < 0.75) {
        return mixRgb(colCreamSand, colBreadfruit, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(
        colBreadfruit,
        colHighJungle,
        smoothstep(5.0, 42.0, s.h)
      );
      rgb = mixRgb(rgb, colSunFern, s.ridge * 0.65);
      rgb = mixRgb(rgb, colBasalt, smoothstep(0.88, 1.55, slope) * 0.7);
      return rgb;
    },
  });

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.03,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Translucent Organic Turquoise Lagoon & Contoured Barrier Reef with Te Ava Pass
  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x26dbc5, depthWrite: false }),
    0.44
  );
  const lagoonDisc = new THREE.Mesh(
    createOrganicLagoonGeometry(evalHuahineReefRadius, 108),
    lagoonMat
  );
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe3d3a8, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf2fbff, depthWrite: false }),
    0.72
  );
  addOrganicBarrierReefArc(
    group,
    reefMat,
    foamMat,
    evalHuahineReefRadius,
    0.26,
    Math.PI * 2.0 - 0.26,
    84
  );

  // Sculpted organic coral-sand motu islets flanking the reef rim
  const huahineMotuSites = [];
  for (const [mAng, rx, rz, seed] of [
    [0.34, 9.6, 6.4, 2.1],
    [-0.36, 9.0, 6.8, 5.4],
    [2.68, 10.2, 6.2, 7.9],
  ]) {
    const mr = evalHuahineReefRadius(mAng) - 2.2;
    const mx = mr * Math.cos(mAng);
    const mz = mr * Math.sin(mAng);
    const motu = new THREE.Mesh(
      createOrganicMotuGeometry({ radiusX: rx, radiusZ: rz, height: 1.35, seed }),
      reefMat
    );
    motu.position.set(mx, 0.34, mz);
    motu.rotation.y = -mAng + Math.PI * 0.5;
    group.add(motu);
    huahineMotuSites.push([mx, mz, mAng]);
  }

  // Exclusion zones in canonical coordinates (approach rotY = -PI/2 -> cx = wz, cz = -wx)
  const blockedZones = [
    { x: -2.0, z: -64.0, r: 12.5 }, // Observation Knoll summit clearing
    { x: 64.0, z: 15.5, r: 9.0 }, // Initial spawn beach clearing
    { x: 58.0, z: 29.0, r: 7.5 }, // Maroe Bay Landing clearing
    { x: 48.0, z: 36.5, r: 6.5 }, // Twin-Bay Sail Loft arrival clearing
    { x: 50.0, z: -30.0, r: 7.5 }, // Elder Ari'i & Marae plaza clearing
  ];
  const isClear = (px, pz) => {
    for (const bz of blockedZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // Ancient Maeva V-Shaped Basalt Stone Fish Traps (Pa I'a) in the Turquoise Channel
  for (const [wx, wzOff, rot] of [
    [42.0, -2.4, 0.14],
    [28.0, 2.6, -0.22],
  ]) {
    const weir = createBasaltFishWeirGroup(trackMat);
    weir.group.position.set(wx, 0.32, evalHuahineStraitCenterZ(wx) + wzOff);
    weir.group.rotation.y = rot;
    group.add(weir.group);
  }

  // Ari'i's Twin-Bay Sail-Weaving Village & Stretched Golden Pandanus Sail Frames
  const hutSpots = [
    [42.5, 42.5, 1.06, true],
    [52.5, 34.5, 0.96, false],
    [41.0, 31.0, 0.92, false],
    [44.5, -21.5, 0.98, false],
    [54.5, -23.5, 0.9, false],
  ].map(([hx, hz, sc, longHouse]) => ({
    x: hx,
    y: Math.max(0.65, evalHuahinePoint(hx, hz).h),
    z: hz,
    rotY: -Math.atan2(hz, hx) + Math.PI * 0.25,
    scale: sc,
    longHouse,
  }));
  addRegionalHuts(group, trackMat, hutSpots, 'society');

  for (const [sx, sz] of [
    [52.0, 30.5],
    [53.0, 26.5],
  ]) {
    const sy = Math.max(0.55, evalHuahinePoint(sx, sz).h);
    const frame = createPandanusSailFrameGroup(trackMat, {
      sailColorHex: 0xe8cb88,
      width: 2.7,
      height: 1.75,
      arched: true,
    });
    frame.group.position.set(sx, sy, sz);
    frame.group.rotation.y = -Math.atan2(sz, sx);
    group.add(frame.group);
  }

  // Sacred Maeva / Taputapuatea stone marae terrace on Huahine Nui overlooking Maroe Bay
  const mx = 46.0;
  const mz = -34.0;
  addMaraePlatform(group, trackMat, {
    x: mx,
    y: Math.max(0.85, evalHuahinePoint(mx, mz).h),
    z: mz,
    rotY: 0.72,
    scale: 1.0,
  });

  // Village Timber Lagoon Pier & Moored Outrigger Canoe beside Maroe Bay Landing
  addTimberPier(group, trackMat, {
    x: 59.0,
    y: 0.68,
    z: 29.0,
    rotY: -Math.atan2(29.0, 59.0),
    length: 8.5,
    width: 1.65,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 67.0,
    y: 0.32,
    z: 26.5,
    rotY: -0.38 + Math.PI * 0.5,
  });

  const breadfruitPts = [];
  for (let i = 0; i < 20; i += 1) {
    const bang = (i / 20) * Math.PI * 2.0 + 0.17;
    const br = 44.0 + (i % 4) * 5.0;
    const bx = br * Math.cos(bang);
    const bz = br * Math.sin(bang) / 0.78;
    const sample = evalHuahinePoint(bx, bz);
    if (sample.h > 1.8 && sample.h < 18.0 && sample.straitMask < 0.25 && isClear(bx, bz)) {
      breadfruitPts.push([bx, sample.h - 0.2, bz, 0.96 + (i % 3) * 0.08, bang]);
    }
  }
  addBroadleafTrees(group, trackMat, breadfruitPts, {
    canopyHexA: 0x266324,
    canopyHexB: 0x3f822d,
  });

  const palmPts = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = (i / 36) * Math.PI * 2.0 + 0.09;
    if (Math.abs(Math.sin(ang)) < 0.14 && Math.cos(ang) > 0) continue;
    const pr = 60.0 + (i % 4) * 4.0;
    const px = pr * Math.cos(ang);
    const pz = (pr * Math.sin(ang)) / 0.76;
    const sample = evalHuahinePoint(px, pz);
    if (sample.h > 0.65 && sample.h < 11.0 && sample.straitMask < 0.3 && isClear(px, pz)) {
      palmPts.push([px, sample.h - 0.16, pz, -ang, 0.94 + (i % 3) * 0.1, 0.22]);
    }
  }
  for (const [mox, moz, mang] of huahineMotuSites) {
    palmPts.push([mox, 0.88, moz, -mang + 0.3, 0.92, 0.22]);
    palmPts.push([
      mox - 2.6 * Math.sin(mang),
      0.85,
      moz + 2.6 * Math.cos(mang),
      -mang - 0.3,
      0.84,
      0.24,
    ]);
  }
  addCoconutGroves(group, trackMat, palmPts);

  const scrubPts = [];
  for (let i = 0; i < 32; i += 1) {
    const sang = (i / 32) * Math.PI * 2.0 + 0.24;
    const sr = 58.0 + (i % 3) * 4.5;
    const sx = sr * Math.cos(sang);
    const sz = (sr * Math.sin(sang)) / 0.78;
    const sample = evalHuahinePoint(sx, sz);
    if (sample.h > 0.7 && sample.h < 10.5 && isClear(sx, sz)) {
      const sc = 0.98 + (i % 3) * 0.24;
      scrubPts.push([sx, sample.h - 0.08, sz, sc * 1.15, sc * 0.62, sc * 1.08, -sang]);
    }
  }
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x2f6827,
    hexB: 0x457d30,
  });

  return { group, materials, sinkDepthM: 86.0 };
}

// ============================================================================
// 2. MO'OREA — Twin Northern Fjord Bays, Mount Rotui & Jagged Mou'a Puta Spires
// ============================================================================
function smoothMax(a, b, k) {
  const hMix = clamp01(0.5 + 0.5 * ((b - a) / k));
  return lerp(a, b, hMix) + k * hMix * (1.0 - hMix);
}

const MOOREA_BAY_COS = Math.cos(0.35);
const MOOREA_BAY_SIN = Math.sin(0.35);

function evalMooreaReefRadius(theta) {
  return (
    158.0 -
    30.0 * Math.cos(theta) +
    10.5 * Math.cos(2.0 * theta - 0.45) +
    5.8 * Math.sin(3.0 * theta + 0.8) +
    3.4 * Math.cos(5.0 * theta - 0.6)
  );
}

function evalMooreaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Singularity-free 2D massif envelope + twin bay coves ('Opunohu & Cook's Bays)
  const smoothCoastD = 144.0 - Math.hypot((x + 38.0) * 0.96, z);

  const dxA = x - 100.0;
  const dzA = z + 37.0;
  const uA = dxA * MOOREA_BAY_COS - dzA * MOOREA_BAY_SIN;
  const vA = dxA * MOOREA_BAY_SIN + dzA * MOOREA_BAY_COS;
  const bayAD = Math.hypot(uA * 0.98, vA * 1.04) - 29.8;

  const dxB = x - 100.0;
  const dzB = z - 37.0;
  const uB = dxB * MOOREA_BAY_COS + dzB * MOOREA_BAY_SIN;
  const vB = -dxB * MOOREA_BAY_SIN + dzB * MOOREA_BAY_COS;
  const bayBD = Math.hypot(uB * 0.98, vB * 1.04) - 29.8;

  const inlandDist = smoothMin(smoothCoastD, smoothMin(bayAD, bayBD, 8.0), 8.0);
  const passA =
    arcMask(theta, -0.35, 0.13, 0.06) * smoothstep(-8.0, -24.0, inlandDist);
  const passB =
    arcMask(theta, 0.35, 0.13, 0.06) * smoothstep(-8.0, -24.0, inlandDist);
  const passMask = clamp01(passA + passB);

  if (inlandDist <= 0.0) {
    const outerReefR = evalMooreaReefRadius(theta);
    const lagoonBed = 0.08 + 0.18 * Math.max(-5.5, inlandDist);
    if (r <= outerReefR) {
      const h = lerp(lagoonBed, -2.6, passMask);
      return { h, spireFactor: 0.0, isBeach: inlandDist > -1.8 };
    }
    const drop = smoothstep(outerReefR, outerReefR + 12.0, r);
    return {
      h: lerp(lerp(-0.9, -2.6, passMask), -4.5, drop),
      spireFactor: 0.0,
      isBeach: false,
    };
  }

  // Strictly bounded volcanic spire cones: Mount Tohivea (89.2m natural Observation Mesa),
  // Mou'a Puta shoulder (68m), and Mount Rotui promontory (44m) between the twin bays.
  const tohiveaCone = Math.min(
    89.2,
    94.7 - 0.68 * Math.hypot((x + 54.0) * 0.96, z * 0.96)
  );
  const rotuiCone = Math.min(
    44.0,
    46.5 - 0.68 * Math.hypot((x - 34.0) * 0.98, z * 1.08)
  );
  const mouaPutaCone = Math.min(
    68.0,
    70.2 - 0.68 * Math.hypot(x + 36.0, z + 52.0)
  );
  const ridgeMassif = smoothMax(
    tohiveaCone,
    smoothMax(rotuiCone, mouaPutaCone, 7.5),
    7.5
  );

  // Singularity-free coastal apron ramp (gentle sandy beach transitioning smoothly up flanks)
  const coastRamp =
    0.08 + 0.8 * inlandDist - 6.0 * Math.tanh(inlandDist / 11.5);
  let h = smoothMin(ridgeMassif, coastRamp, 2.0);

  // Subtle carved spire ridges on mid/high flanks without exceeding walkable slope limits
  const thS = Math.atan2(z, x + 54.0);
  const backArcMask = smoothstep(0.65, 1.45, Math.abs(thS));
  const toothEnv =
    smoothstep(22.0, 42.0, h) * smoothstep(78.0, 58.0, h) * backArcMask;
  const spireTeeth =
    0.55 * Math.pow(0.5 + 0.5 * Math.cos(9.0 * thS + 0.4), 2.2) * toothEnv;
  h += spireTeeth;

  const isInnerBay =
    Math.abs(theta + 0.36) < 0.28 || Math.abs(theta - 0.36) < 0.28;

  return {
    h,
    spireFactor: clamp01(toothEnv + smoothstep(52.0, 88.0, h) * 0.65),
    isBeach: isInnerBay || inlandDist < 7.5,
  };
}

function buildMooreaAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.05, 0.27, 0.45];
  const colLagoon = [0.14, 0.79, 0.74];
  const colGoldSand = [0.9, 0.83, 0.65];
  const colEmerald = [0.18, 0.47, 0.2];
  const colRazorFern = [0.34, 0.54, 0.2];
  const colCanopyShade = [0.11, 0.32, 0.15];
  const colSpireBasalt = [0.24, 0.23, 0.25];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalMooreaPoint,
    maxRadius: 202.0,
    nRings: 98,
    nSegs: 136,
    colorFn: (s, slope) => {
      if (s.h < 0.06) {
        return mixRgb(colLagoon, colDeepSea, clamp01(-s.h / 2.5));
      }
      if (s.h < 0.28) return colLagoon;
      if (s.h < 2.4 && s.isBeach && slope < 0.78) {
        return mixRgb(colGoldSand, colEmerald, smoothstep(1.0, 2.4, s.h));
      }
      let rgb = mixRgb(colEmerald, colCanopyShade, smoothstep(8.0, 68.0, s.h));
      rgb = mixRgb(rgb, colRazorFern, s.spireFactor * 0.6);
      rgb = mixRgb(
        rgb,
        colSpireBasalt,
        clamp01(smoothstep(0.82, 1.35, slope) * 0.85 + s.spireFactor * 0.42)
      );
      return rgb;
    },
  });

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.03,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Translucent Organic Turquoise Lagoon & Twin-Pass Barrier Reef
  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x24dac4, depthWrite: false }),
    0.42
  );
  const lagoonDisc = new THREE.Mesh(
    createOrganicLagoonGeometry(evalMooreaReefRadius, 108),
    lagoonMat
  );
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe3d3a8, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf2fbff, depthWrite: false }),
    0.72
  );
  // Twin barrier reef passes aligned with 'Opunohu & Cook's Bays!
  addOrganicBarrierReefArc(
    group,
    reefMat,
    foamMat,
    evalMooreaReefRadius,
    -0.2,
    0.2,
    18
  );
  addOrganicBarrierReefArc(
    group,
    reefMat,
    foamMat,
    evalMooreaReefRadius,
    0.5,
    Math.PI * 2.0 - 0.5,
    80
  );

  // Sculpted organic reef motu islets flanking the twin reef passes
  const mooreaMotuSites = [];
  for (const [mAng, rx, rz, seed] of [
    [-0.56, 10.5, 6.8, 3.2],
    [0.56, 9.8, 6.5, 6.4],
    [2.15, 11.2, 7.0, 9.1],
  ]) {
    const mr = evalMooreaReefRadius(mAng) - 2.2;
    const mx = mr * Math.cos(mAng);
    const mz = mr * Math.sin(mAng);
    const motu = new THREE.Mesh(
      createOrganicMotuGeometry({ radiusX: rx, radiusZ: rz, height: 1.35, seed }),
      reefMat
    );
    motu.position.set(mx, 0.34, mz);
    motu.rotation.y = -mAng + Math.PI * 0.5;
    group.add(motu);
    mooreaMotuSites.push([mx, mz, mAng]);
  }

  // Exclusion zones in canonical coordinates (invert rotY = -0.35 - PI/2)
  const rotY = -0.35 - Math.PI * 0.5;
  const toCanonXZ = (wx, wz) => {
    const c = Math.cos(-rotY);
    const s = Math.sin(-rotY);
    return [wx * c + wz * s, -wx * s + wz * c];
  };
  const [mSpawnCx, mSpawnCz] = toCanonXZ(-3.5, 72.2);
  const [mLandCx, mLandCz] = toCanonXZ(-11.5, 65.5);
  const [mHutCx, mHutCz] = toCanonXZ(-31.0, 54.0);
  const [mDyeCx, mDyeCz] = toCanonXZ(11.5, 58.0);
  const [mElderCx, mElderCz] = toCanonXZ(18.0, 46.0);
  const mooreaBlocked = [
    { x: -54.0, z: 0.0, r: 12.5 }, // Mount Tohivea summit Observation Circle
    { x: mSpawnCx, z: mSpawnCz, r: 12.0 }, // Initial spawn dry beach clearing
    { x: mLandCx, z: mLandCz, r: 7.5 }, // Vaihere's Canoe-Yard Beach clearing
    { x: mHutCx, z: mHutCz, r: 7.0 }, // Tamanu Carvers' Shed clearing
    { x: mDyeCx, z: mDyeCz, r: 7.5 }, // Sail-Dyeing Vats plaza clearing
    { x: mElderCx, z: mElderCz, r: 7.5 }, // Vaihere Spire Sanctuary clearing
  ];
  const mooreaIsClear = (px, pz) => {
    for (const bz of mooreaBlocked) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };
  const sampleMooreaInland = (ang, insetM) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    let r = 152.0;
    while (r > 32.0 && evalMooreaPoint(-38.0 + r * ca, r * sa).h <= 0.35) {
      r -= 2.5;
    }
    const pr = Math.max(24.0, r - insetM);
    const px = -38.0 + pr * ca;
    const pz = pr * sa;
    return [px, pz, evalMooreaPoint(px, pz).h];
  };

  // Vaihere's Master Canoe-Wright Shed (Fare Va'a) with Double-Hulled Vaka on Cradles
  const shedTheta = -0.58;
  const [sx, sz, rawSy] = sampleMooreaInland(shedTheta, 10.0);
  const sy = Math.max(0.75, rawSy);

  const canoeYard = new THREE.Group();
  canoeYard.position.set(sx, sy, sz);
  canoeYard.rotation.y = -shedTheta;

  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4527, roughness: 0.85 })
  );
  const thatchMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc29556, roughness: 0.88 })
  );

  // Open-ended high-pitched Fare Va'a canoe house
  const shedRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 3.1, 3.2, 4),
    thatchMat
  );
  shedRoof.rotation.y = Math.PI * 0.25;
  shedRoof.scale.set(1.0, 1.0, 2.25);
  shedRoof.position.y = 2.85;
  canoeYard.add(shedRoof);

  for (const px of [-2.0, 2.0]) {
    for (const pz of [-3.2, 0.0, 3.2]) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 1.8, 6),
        timberMat
      );
      p.position.set(px, 0.9, pz);
      canoeYard.add(p);
    }
  }
  const carvedHulls = createCarvedHullPairGroup(trackMat);
  carvedHulls.group.position.set(0, 0, 0.8);
  canoeYard.add(carvedHulls.group);
  group.add(canoeYard);

  // Artisan Village Huts flanking 'Opunohu & Cook's Bays (kept clear of POIs/spawn)
  const huts = [
    [toCanonXZ(-37.0, 48.0)[0], toCanonXZ(-37.0, 48.0)[1], 0.55, 1.04],
    [toCanonXZ(-35.5, 56.5)[0], toCanonXZ(-35.5, 56.5)[1], 0.25, 0.96],
    [toCanonXZ(24.5, 48.0)[0], toCanonXZ(24.5, 48.0)[1], -0.45, 0.98],
    [toCanonXZ(30.0, 54.0)[0], toCanonXZ(30.0, 54.0)[1], -0.62, 0.9],
  ].map(([hx, hz, yaw, sc]) => ({
    x: hx,
    y: Math.max(0.7, evalMooreaPoint(hx, hz).h),
    z: hz,
    rotY: yaw,
    scale: sc,
  }));
  addRegionalHuts(group, trackMat, huts, 'society');

  // Spire-Foot Marae overlooking 'Opunohu Valley beside Vaihere's Sanctuary
  const [maraeX, maraeZ] = toCanonXZ(25.5, 36.5);
  addMaraePlatform(group, trackMat, {
    x: maraeX,
    y: Math.max(1.8, evalMooreaPoint(maraeX, maraeZ).h),
    z: maraeZ,
    rotY: 0.42,
    scale: 1.0,
  });

  // Village Timber Lagoon Pier at Vaihere's Canoe-Yard Beach
  addTimberPier(group, trackMat, {
    x: toCanonXZ(-13.5, 69.0)[0],
    y: 0.68,
    z: toCanonXZ(-13.5, 69.0)[1],
    rotY: 0.35,
    length: 8.5,
    width: 1.65,
  });

  const palmPts = [];
  for (let i = 0; i < 38; i += 1) {
    const ang = (i / 38) * Math.PI * 2.0 + 0.06;
    const [px, pz, py] = sampleMooreaInland(ang, 6.5 + (i % 3) * 3.5);
    if (py > 0.65 && py < 12.0 && mooreaIsClear(px, pz)) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.95 + (i % 3) * 0.08, 0.22]);
    }
  }
  for (const [mox, moz, mang] of mooreaMotuSites) {
    palmPts.push([mox, 0.88, moz, -mang + 0.3, 0.92, 0.22]);
    palmPts.push([
      mox - 2.6 * Math.sin(mang),
      0.85,
      moz + 2.6 * Math.cos(mang),
      -mang - 0.3,
      0.84,
      0.24,
    ]);
  }
  addCoconutGroves(group, trackMat, palmPts);

  const scrubPts = [];
  for (let i = 0; i < 30; i += 1) {
    const sang = (i / 30) * Math.PI * 2.0 + 0.14;
    const [sx2, sz2, sy2] = sampleMooreaInland(sang, 8.5 + (i % 3) * 2.5);
    if (sy2 > 0.7 && sy2 < 11.0 && mooreaIsClear(sx2, sz2)) {
      const sc = 0.96 + (i % 3) * 0.22;
      scrubPts.push([sx2, sy2 - 0.1, sz2, sc * 1.12, sc * 0.6, sc * 1.05, -sang]);
    }
  }
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x2c6426,
    hexB: 0x427c2c,
  });

  return { group, materials, sinkDepthM: 120.0 };
}

// ============================================================================
// 3. MAUPITI — Dramatic Basalt Fortress Citadel + Organic Coral Motu Ring (2x)
// ============================================================================
function maupitiDistToSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz || 1e-6;
  const t = clamp01((wx * vx + wz * vz) / len2);
  return { d: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
}

function evalMaupitiReefRadius(theta) {
  return (
    102.0 +
    8.5 * Math.cos(2.0 * theta - 0.35) +
    5.8 * Math.sin(3.0 * theta + 0.85) +
    4.2 * Math.cos(5.0 * theta - 1.05) +
    2.1 * Math.sin(7.0 * theta + 0.4)
  );
}

function evalMaupitiPoint(x, z) {
  // Island fortress footprint centered near origin with protruding harbor & SE fortress capes
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Asymmetric volcanic main-island coastline:
  // - +X canon (walkable +Z) harbor cove cape ~61.5m
  // - SE headland cape (theta ~ -1.13, walkable +38,+14) bulging to ~68m so cliff bluff stays inland
  const harborCape = 5.5 * Math.exp(-Math.pow((theta - 0.1) / 0.42, 2.0));
  const bluffCape = 13.5 * Math.exp(-Math.pow((theta + 1.05) / 0.46, 2.0));
  const westCape = 6.5 * Math.exp(-Math.pow((theta - 2.3) / 0.45, 2.0));
  const centralCoastR =
    55.0 +
    harborCape +
    bluffCape +
    westCape +
    3.8 * Math.cos(3.0 * theta - 0.4) +
    2.1 * Math.sin(5.0 * theta + 0.65);

  // Te Ava Onoiau foaming pass cutting along canonical +X (walkable +Z) outside the harbor shore
  const passChannel =
    Math.exp(-Math.pow((theta - 0.04) / 0.14, 2.0)) * smoothstep(58.0, 72.0, r);

  if (r <= centralCoastR) {
    const u = r / centralCoastR;
    const inland = 1.0 - u;

    // 1. Coastal valley apron on harbor side vs sheer basalt sea-cliffs on back ocean side
    const backCliffMask = smoothstep(1.35, 2.35, Math.abs(theta));
    const seaCliffDrop = lerp(
      12.5 * Math.pow(smoothstep(0.02, 0.56, inland), 1.32),
      28.0 * Math.pow(smoothstep(0.0, 0.22, inland), 0.72),
      backCliffMask
    );

    // 2. Sheer columnar-basalt Mount Teurafa'atiu Fortress Citadel at walkable (-34, -44) -> canon (-44, 34)
    const cxCit = -44.0;
    const czCit = 34.0;
    const dxC = x - cxCit;
    const dzC = z - czCit;
    const cragDist = Math.hypot(dxC * 0.96 + dzC * 0.18, dzC * 1.1 - dxC * 0.18);
    const citadelTheta = Math.atan2(dzC, dxC);

    // Monolithic sheer fortress spire (~84m total summit, vertical fluted pari walls)
    const sheerMonolith = 61.0 * (1.0 - smoothstep(10.0, 21.5, cragDist));
    const pariFlutes =
      Math.pow(0.5 + 0.5 * Math.cos(10.0 * citadelTheta + 0.4), 1.9) *
      11.0 *
      smoothstep(24.0, 13.0, cragDist) *
      smoothstep(4.0, 11.5, cragDist);

    // Secondary Twin Buttress Crag: Mount Nuupure at canon (-28, -14) (walkable +14, -28)
    const crag2Dist = Math.hypot((x + 28.0) * 1.05, (z + 14.0) * 0.95);
    const crag2 = 46.0 * (1.0 - smoothstep(7.5, 18.0, crag2Dist));

    // Sharp fortress ridge connecting citadel across back amphitheater
    const saddleRidge = 26.0 * gaussian2D(x, z, -36.0, 10.0, 11.0, 20.0, 0.25);

    let h = Math.max(seaCliffDrop, seaCliffDrop * 0.35 + sheerMonolith + pariFlutes + saddleRidge * 0.5);
    h = Math.max(h, seaCliffDrop * 0.35 + crag2);

    // Scoria crater notch / waterfall ravine descending toward harbor bay
    const gorgeCut = gaussian2D(x, z, -8.0, 16.0, 14.0, 8.0, 0.35);
    h *= 1.0 - gorgeCut * 0.36;

    // 3. Elevated Basalt Sea-Bluff Shoulder & Observation Circle at walkable (38, 14) -> canon (14.0, -38.0)
    const bluffProm = gaussian2D(x, z, 15.0, -36.5, 16.5, 15.5, -0.35);
    h = Math.max(h, 39.5 * smoothstep(0.18, 0.84, bluffProm));

    // Carve flat Observation Circle terrace pad (padSlope <= 0.14)
    const dCircle = Math.hypot(x - 14.0, z + 38.0);
    if (dCircle < 12.0) {
      const flatBlend = 1.0 - smoothstep(5.5, 12.0, dCircle);
      h = lerp(h, 39.5, flatBlend);
    }

    // 4. Harbor cove & village flat around approach bay (spawn (-11.5, 57.5) -> canon (57.5, 11.5))
    const bayMask = gaussian2D(x, z, 49.0, 12.0, 15.0, 22.0, 0.12);
    if (bayMask > 0.02) {
      const bayTargetH = lerp(1.1, 4.6, smoothstep(60.0, 32.0, x));
      h = lerp(h, bayTargetH, clamp01(bayMask * 1.15));
    }

    // Sanctuary paepae shelf at elder walkable (19.0, 42.0) -> canon (42.0, -19.0)
    const dElder = Math.hypot(x - 42.0, z + 19.0);
    if (dElder < 10.5) {
      h = lerp(h, 9.0, 1.0 - smoothstep(5.0, 10.5, dElder));
    }

    // 5. Switchback walkable trail corridor linking Spawn -> POIs -> Observation Circle
    // Use linear seg.t so max ramp slope stays smooth (~0.66-0.71) everywhere up to the bluff rim
    const trailLegs = [
      [57.5, 11.5, 50.5, 15.0, 1.5, 3.0], // spawn -> landing
      [57.5, 11.5, 34.0, 22.0, 1.5, 4.4], // spawn -> hut flat
      [57.5, 11.5, 42.0, -19.0, 1.5, 9.0], // spawn -> elder terrace
      [42.0, -19.0, 38.0, -34.0, 9.0, 19.0], // elder -> coastal switchback bend (34, 38) [dist=15.5m, sl=0.64]
      [38.0, -34.0, 29.0, -47.0, 19.0, 29.5], // switchback bend -> upper spur (47, 29) [dist=15.8m, sl=0.66]
      [29.0, -47.0, 18.2, -40.5, 29.5, 39.2], // upper spur -> pad outer rim (dCircle=4.9m) [dist=12.6m, sl=0.77]
      [18.2, -40.5, 14.0, -38.0, 39.2, 39.5], // pad rim -> circle center (38, 14) [flat]
    ];
    for (const [ax, az, bx, bz, h0, h1] of trailLegs) {
      const seg = maupitiDistToSeg(x, z, ax, az, bx, bz);
      if (seg.d < 8.5) {
        const rampH = lerp(h0, h1, seg.t);
        const mask = 1.0 - smoothstep(4.2, 8.5, seg.d);
        h = lerp(h, rampH, mask * 0.96);
      }
    }

    // Softly feather shoreline into jade lagoon at u > 0.89 unless on sheer back cliff
    const shoreDrop = smoothstep(0.89, 1.0, u);
    h = lerp(h, 0.15, shoreDrop * (1.0 - backCliffMask * 0.55));
    if (r > centralCoastR - 1.4 && backCliffMask > 0.45) {
      h = lerp(h, -1.8, smoothstep(centralCoastR - 1.4, centralCoastR, r));
    }

    // Flatten inner circle core cleanly (dCircle < 5.0m) without blocking the incoming spur trail
    if (dCircle < 6.8) {
      h = lerp(h, 39.5, 1.0 - smoothstep(4.6, 6.8, dCircle));
    }

    // Deepen harbor boat entry right at +Z pass mouth
    if (x > 55.0 && Math.abs(z) < 6.0) {
      const ch = smoothstep(56.0, 62.5, x) * (1.0 - smoothstep(2.2, 6.0, Math.abs(z)));
      h = lerp(h, -2.4, ch);
    }

    const slopeHint = cragDist < 21.0 || crag2Dist < 17.0 ? 1.0 : 0.0;
    let zone = 'foothill';
    if (h < 0.05) zone = 'lagoon';
    else if (cragDist < 19.5 || crag2Dist < 16.0) zone = 'citadel';
    else if (u > 0.89 && backCliffMask < 0.45 && h < 2.4) zone = 'beach';
    else if (h > 28.0 && dCircle < 16.0) zone = 'bluff';

    return { h, zone, spireHint: slopeHint, backCliff: backCliffMask };
  }

  // Organic Barrier Reef Lagoon + Ring of Outer Coral Motu Islets
  const reefEdgeR = evalMaupitiReefRadius(theta);
  const motuCenterR = reefEdgeR - 7.5;
  const motuHalfW = 5.8;

  // Two distinct sandy motu arcs framing the reef (broken cleanly by Te Ava Onoiau pass at theta ≈ 0)
  const motuMask = clamp01(
    1.0 -
      arcMask(theta, 0.04, 0.28, 0.09) -
      0.92 * arcMask(theta, 2.35, 0.16, 0.06) -
      0.92 * arcMask(theta, -2.15, 0.18, 0.06)
  );

  if (r <= reefEdgeR + 2.0) {
    let h = lerp(0.14, 0.22, smoothstep(centralCoastR, motuCenterR - motuHalfW, r));
    let zone = 'lagoon';

    if (Math.abs(r - motuCenterR) <= motuHalfW && motuMask > 0.06) {
      const mt = 1.0 - Math.abs(r - motuCenterR) / motuHalfW;
      const motuH = 2.6 * Math.pow(smoothstep(0.0, 1.0, mt), 0.85) * motuMask;
      if (motuH > h) {
        h = motuH;
        zone = motuH > 1.35 ? 'motu_veg' : 'motu_sand';
      }
    } else if (r > motuCenterR + motuHalfW) {
      h = 0.22;
      zone = 'papa_reef';
    }

    h = lerp(h, -3.2, passChannel);
    if (h < 0.05) zone = 'deep_sea';
    return { h, zone, spireHint: 0.0, backCliff: 0.0 };
  }

  const outerDrop = smoothstep(reefEdgeR + 2.0, reefEdgeR + 10.0, r);
  const h = lerp(lerp(0.2, -3.2, passChannel), -5.0, outerDrop);
  return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef', spireHint: 0.0, backCliff: 0.0 };
}

function buildMaupitiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.05, 0.26, 0.44];
  const colJadeLagoon = [0.15, 0.83, 0.76];
  const colWhiteSand = [0.95, 0.91, 0.8];
  const colFoothillGreen = [0.14, 0.36, 0.15];
  const colValleyLush = [0.09, 0.27, 0.11];
  const colMotuGreen = [0.24, 0.49, 0.2];
  const colFortressBasalt = [0.16, 0.16, 0.19];
  const colObsidianCliff = [0.11, 0.11, 0.14];
  const colRedScoria = [0.44, 0.2, 0.12];
  const colBluffMoss = [0.22, 0.34, 0.18];
  const colPapaCoral = [0.66, 0.6, 0.53];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalMaupitiPoint,
    maxRadius: 118.0,
    nRings: 112,
    nSegs: 164,
    colorFn: (s, slope) => {
      if (s.zone === 'deep_sea' || s.h < 0.05) {
        return mixRgb(colJadeLagoon, colDeepSea, clamp01(-s.h / 2.8));
      }
      if (s.zone === 'lagoon') return colJadeLagoon;
      if (s.zone === 'papa_reef') return colPapaCoral;
      if (s.zone === 'motu_sand' || s.zone === 'beach') {
        return mixRgb(colWhiteSand, colMotuGreen, smoothstep(1.2, 2.2, s.h));
      }
      if (s.zone === 'motu_veg') return colMotuGreen;
      if (s.zone === 'bluff') {
        const rockEdge = smoothstep(0.42, 1.05, slope);
        return mixRgb(colBluffMoss, colFortressBasalt, rockEdge * 0.88);
      }
      if (s.zone === 'citadel') {
        const cliffT = smoothstep(0.65, 1.65, slope);
        const scoriaBand = smoothstep(46.0, 72.0, s.h) * (1.0 - smoothstep(76.0, 92.0, s.h));
        let c = mixRgb(colBluffMoss, colFortressBasalt, Math.max(0.55, cliffT));
        c = mixRgb(c, colObsidianCliff, smoothstep(1.4, 2.6, slope) * 0.65);
        c = mixRgb(c, colRedScoria, scoriaBand * 0.35);
        return c;
      }
      const rockT = smoothstep(0.65, 1.45, slope);
      const lush = mixRgb(colFoothillGreen, colValleyLush, smoothstep(6.0, 26.0, s.h));
      return mixRgb(lush, colFortressBasalt, rockT * 0.88);
    },
  });

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Translucent Organic Jade Lagoon + Twin-Broken Barrier Reef around Te Ava Onoiau Pass
  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x26e2cb, depthWrite: false }),
    0.38
  );
  const lagoonDisc = new THREE.Mesh(
    createOrganicLagoonGeometry((th) => evalMaupitiReefRadius(th) - 6.0, 108),
    lagoonMat
  );
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe3d3a8, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.76
  );
  addOrganicBarrierReefArc(
    group,
    reefMat,
    foamMat,
    evalMaupitiReefRadius,
    0.22,
    Math.PI * 2.0 - 0.14,
    88
  );

  // Sculpted organic reef motu sandbanks around outer necklace
  const maupitiMotuSites = [];
  for (const [mAng, rx, rz, seed] of [
    [-0.78, 12.0, 6.2, 2.4],
    [0.82, 11.5, 6.0, 5.1],
    [2.95, 13.0, 6.6, 8.7],
  ]) {
    const mr = evalMaupitiReefRadius(mAng) - 7.5;
    const mx = mr * Math.cos(mAng);
    const mz = mr * Math.sin(mAng);
    const motu = new THREE.Mesh(
      createOrganicMotuGeometry({ radiusX: rx, radiusZ: rz, height: 1.45, seed }),
      reefMat
    );
    motu.position.set(mx, 0.34, mz);
    motu.rotation.y = -mAng + Math.PI * 0.5;
    group.add(motu);
    maupitiMotuSites.push([mx, mz, mAng]);
  }

  // Dramatic Offshore Basalt Sea-Stacks guarding the steep windward cliffs
  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2a292e, roughness: 0.92 })
  );
  for (const [sx, sz, hScale, rScale, rot] of [
    [-68.0, 32.0, 12.5, 4.2, 0.4],
    [-72.0, -24.0, 15.0, 4.8, 1.3],
    [-46.0, -56.0, 9.5, 3.4, 2.2],
  ]) {
    const stack = new THREE.Mesh(makeStoneRockGeometry(1.0, 17), rockMat);
    stack.scale.set(rScale, hScale, rScale * 0.85);
    stack.position.set(sx, 0.0, sz);
    stack.rotation.y = rot;
    group.add(stack);
  }

  // Plunging Cascade Waterfall down Mount Teurafa'atiu Gorge toward Harbor Valley
  addWaterfallCascade(group, trackMat, {
    x: -22.5,
    y: 27.0,
    z: 22.5,
    width: 2.8,
    height: 34.0,
    rotY: Math.PI * 0.65,
    tiltX: -0.35,
  });

  // Canonical exclusion zones (rotY = -PI/2 => cx = wz, cz = -wx)
  const toCanon = (wx, wz) => [wz, -wx];
  const [spCx, spCz] = toCanon(-11.5, 57.5);
  const [laCx, laCz] = toCanon(-15.0, 50.5);
  const [huCx, huCz] = toCanon(-22.0, 34.0);
  const [elCx, elCz] = toCanon(19.0, 42.0);
  const [ciCx, ciCz] = toCanon(38.0, 14.0);
  const [mid1Cx, mid1Cz] = toCanon(34.0, 38.0);
  const [mid2Cx, mid2Cz] = toCanon(47.0, 29.0);
  const maupitiClearZones = [
    { x: spCx, z: spCz, r: 10.5 },
    { x: laCx, z: laCz, r: 7.0 },
    { x: huCx, z: huCz, r: 7.0 },
    { x: elCx, z: elCz, r: 8.0 },
    { x: ciCx, z: ciCz, r: 12.5 },
    { x: mid1Cx, z: mid1Cz, r: 5.5 },
    { x: mid2Cx, z: mid2Cz, r: 5.5 },
  ];
  const maupitiIsClear = (px, pz) => {
    for (const bz of maupitiClearZones) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // First Master Tera'i's 12-Stone Star-Ring Observatory (Ahu Feti'a) perched on the Panoramic Bluff!
  addStarStoneCircle(group, trackMat, {
    x: ciCx,
    y: evalMaupitiPoint(ciCx, ciCz).h,
    z: ciCz,
    radius: 5.6,
    stoneHex: 0x3b393c,
    withBraziers: false,
  });

  // Sacred Stone Sanctuary Marae tucked beside Elder Tera'i's terrace (well clear of arrival spot)
  const [marCx, marCz] = toCanon(27.5, 48.0);
  addMaraePlatform(group, trackMat, {
    x: marCx,
    y: evalMaupitiPoint(marCx, marCz).h,
    z: marCz,
    rotY: -0.45,
    scale: 1.0,
  });

  // Harbor Village Fare Huts & Outer Motu Fisher Huts (well clear of spawn/POIs)
  const huts = [
    [toCanon(-31.0, 31.0)[0], toCanon(-31.0, 31.0)[1], 0.45, 1.04],
    [toCanon(-29.0, 44.0)[0], toCanon(-29.0, 44.0)[1], 0.15, 0.96],
    [toCanon(6.0, 44.0)[0], toCanon(6.0, 44.0)[1], -0.4, 0.94],
    [maupitiMotuSites[0][0], maupitiMotuSites[0][1], -maupitiMotuSites[0][2] + Math.PI, 0.88],
    [maupitiMotuSites[1][0], maupitiMotuSites[1][1], -maupitiMotuSites[1][2] + Math.PI, 0.88],
  ].map(([hx, hz, rotY, scale]) => ({
    x: hx,
    y: Math.max(0.65, evalMaupitiPoint(hx, hz).h),
    z: hz,
    rotY,
    scale,
  }));
  addRegionalHuts(group, trackMat, huts, 'society');

  // Timber Canoe Pier extending into Te Ava Onoiau harbor cove (clear of spawn)
  const [pierCx, pierCz] = toCanon(-3.5, 62.5);
  addTimberPier(group, trackMat, {
    x: pierCx,
    y: 0.7,
    z: pierCz,
    rotY: 0.12,
    length: 8.0,
    width: 1.65,
  });

  // Shore-side Outrigger Va'a anchored beside the beach (well clear of player spawn)
  const [vaaCx, vaaCz] = toCanon(5.5, 65.5);
  addOutriggerCanoe(group, trackMat, {
    x: vaaCx,
    y: 0.34,
    z: vaaCz,
    rotY: Math.PI * 0.42,
  });

  // Coconut Palms & Coastal Rainforest Scrub on Lowlands & Outer Motu
  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 42; i += 1) {
    const ang = (i / 42) * Math.PI * 2.0 + 0.08;
    const rad = 42.0 + (i % 4) * 4.2;
    const px = -12.0 + rad * Math.cos(ang);
    const pz = rad * Math.sin(ang);
    const pt = evalMaupitiPoint(px, pz);
    if (pt.h > 0.7 && pt.h < 13.0 && maupitiIsClear(px, pz)) {
      palmPts.push([px, pt.h - 0.15, pz, -ang, 0.94 + (i % 3) * 0.08, 0.2]);
    }
    if (i % 2 === 0 && pt.h > 1.2 && pt.h < 18.0 && maupitiIsClear(px * 0.96, pz * 0.96)) {
      const sc = 0.95 + (i % 3) * 0.24;
      scrubPts.push([px * 0.96, pt.h - 0.12, pz * 0.96, sc * 1.15, sc * 0.62, sc * 1.05, -ang]);
    }
  }
  for (const [mox, moz, mang] of maupitiMotuSites) {
    palmPts.push([mox + 2.2, 1.0, moz - 1.5, -mang + 0.2, 0.94, 0.24]);
    palmPts.push([mox - 2.6, 0.95, moz + 2.1, -mang - 0.25, 0.86, 0.22]);
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x265c21,
    hexB: 0x3b7228,
  });

  return { group, materials, sinkDepthM: 112.0 };
}

export function createAct1RemainIslandAssembly(islandId) {
  switch (islandId) {
    case 'huahine':
      return buildHuahineAssembly();
    case 'moorea':
      return buildMooreaAssembly();
    case 'maupiti':
      return buildMaupitiAssembly();
    default:
      return null;
  }
}
