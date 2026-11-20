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
function evalMooreaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const bayA = 14.5 * Math.exp(-Math.pow((theta + 0.35) / 0.17, 2.0));
  const bayB = 14.5 * Math.exp(-Math.pow((theta - 0.35) / 0.17, 2.0));
  const rotuiPromontory = 4.6 * Math.exp(-Math.pow(theta / 0.15, 2.0));
  const heartBack = 3.2 * Math.cos(3.0 * theta + Math.PI);

  const coastR = Math.max(19.0, 40.8 - bayA - bayB + rotuiPromontory + heartBack);
  const passA = arcMask(theta, -0.35, 0.11, 0.05) * smoothstep(18.0, 30.0, r);
  const passB = arcMask(theta, 0.35, 0.11, 0.05) * smoothstep(18.0, 30.0, r);
  const passMask = clamp01(passA + passB);

  if (r > coastR) {
    const outerReefR = 50.5;
    if (r <= outerReefR) {
      const floor = lerp(0.18, 0.24, smoothstep(coastR, outerReefR, r));
      const h = lerp(floor, -2.5, passMask);
      return { h, spireFactor: 0.0, isBeach: false };
    }
    const drop = smoothstep(outerReefR, 55.8, r);
    return {
      h: lerp(lerp(0.24, -2.5, passMask), -4.2, drop),
      spireFactor: 0.0,
      isBeach: false,
    };
  }

  // Mount Rotui triangular peak between the twin bays + jagged cathedral amphitheater behind
  const rotui =
    42.0 * Math.pow(gaussian2D(x, z, 22.0, 0.0, 7.0, 5.2, 0.0), 0.82);

  const arcAngle = Math.atan2(z, x + 4.0);
  const backArcMask = smoothstep(0.5, 1.35, Math.abs(arcAngle));
  const ringDist = Math.abs(Math.hypot(x + 4.0, z) - 18.5);
  const amphitheaterWall =
    61.0 * Math.exp(-Math.pow(ringDist / 9.0, 1.75)) * backArcMask;

  const spireTeeth =
    17.5 *
    Math.pow(0.5 + 0.5 * Math.cos(9.0 * theta + 0.4), 2.6) *
    Math.exp(-Math.pow(ringDist / 7.5, 2.0)) *
    backArcMask;

  const mouaPutaNeedle =
    23.0 * Math.pow(gaussian2D(x, z, -14.0, -13.5, 4.0, 4.0, 0.0), 0.7);

  const apron = 2.6 * smoothstep(coastR, coastR - 5.0, r);
  let h = apron + rotui + amphitheaterWall + spireTeeth + mouaPutaNeedle;

  const isInnerBay =
    Math.abs(theta + 0.35) < 0.22 || Math.abs(theta - 0.35) < 0.22;
  if (isInnerBay && r > coastR - 4.2) {
    h = lerp(h, 1.25 * smoothstep(coastR, coastR - 4.2, r), 0.72);
  }

  return {
    h,
    spireFactor: clamp01((spireTeeth + mouaPutaNeedle) / 22.0),
    isBeach: isInnerBay || r > coastR - 2.6,
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
    maxRadius: 56.0,
    nRings: 62,
    nSegs: 98,
    colorFn: (s, slope) => {
      if (s.h < 0.06) {
        return mixRgb(colLagoon, colDeepSea, clamp01(-s.h / 2.5));
      }
      if (s.h < 0.28) return colLagoon;
      if (s.h < 2.2 && s.isBeach && slope < 0.85) {
        return mixRgb(colGoldSand, colEmerald, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colEmerald, colCanopyShade, smoothstep(5.0, 48.0, s.h));
      rgb = mixRgb(rgb, colRazorFern, s.spireFactor * 0.6);
      rgb = mixRgb(
        rgb,
        colSpireBasalt,
        clamp01(smoothstep(1.05, 2.0, slope) * 0.88 + s.spireFactor * 0.35)
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

  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x24dac4, depthWrite: false }),
    0.42
  );
  const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(49.8, 52), lagoonMat);
  lagoonDisc.rotation.x = -Math.PI * 0.5;
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
  addBarrierReefArc(group, reefMat, foamMat, 49.8, -0.2, 0.2, 10);
  addBarrierReefArc(group, reefMat, foamMat, 49.8, 0.5, Math.PI * 2.0 - 0.5, 36);

  // Vaihere's Master Canoe-Wright Shed (Fare Va'a) with Double-Hulled Vaka on Cradles
  const shedTheta = -0.37;
  const shedR = 24.5;
  const sx = shedR * Math.cos(shedTheta);
  const sz = shedR * Math.sin(shedTheta);
  const sy = Math.max(0.75, evalMooreaPoint(sx, sz).h);

  const canoeYard = new THREE.Group();
  canoeYard.position.set(sx, sy, sz);
  canoeYard.rotation.y = -shedTheta;

  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4527, roughness: 0.85 })
  );
  const thatchMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc29556, roughness: 0.88 })
  );
  const tamanuHullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9c5c30, roughness: 0.74 })
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
  // Twin carved hulls resting on timber cradles inside & protruding from shed
  const carvedHulls = createCarvedHullPairGroup(trackMat);
  carvedHulls.group.position.set(0, 0, 0.8);
  canoeYard.add(carvedHulls.group);
  group.add(canoeYard);

  // Artisan Village Huts & Spire-Foot Marae
  const huts = [
    [25.5, -0.55, 0.96],
    [27.2, -0.68, 0.9],
    [25.2, 0.36, 0.95],
    [27.0, 0.52, 0.88],
  ].map(([hr, hang, sc]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.65, evalMooreaPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'society');

  addMaraePlatform(group, trackMat, {
    x: 8.5,
    y: Math.max(1.8, evalMooreaPoint(8.5, -8.5).h),
    z: -8.5,
    rotY: 0.4,
    scale: 0.82,
  });

  addTimberPier(group, trackMat, {
    x: 28.5 * Math.cos(-0.34),
    y: 0.68,
    z: 28.5 * Math.sin(-0.34),
    rotY: 0.34,
    length: 6.4,
  });

  const palmPts = [];
  for (let i = 0; i < 24; i += 1) {
    const ang = (i / 24) * Math.PI * 2.0;
    const pr = Math.abs(ang) < 0.6 ? 27.5 : 35.5;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const py = evalMooreaPoint(px, pz).h;
    if (py > 0.6 && py < 11.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.95, 0.22]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 93.0 };
}

// ============================================================================
// 3. MAUPITI — Central Sheer Basalt Fortress Citadel + Outer Coral Motu Ring
// ============================================================================
function evalMaupitiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Compact central fortress island (r < 23.5m)
  const centralCoastR =
    22.5 + 1.8 * Math.cos(3.0 * theta - 0.4) + 1.1 * Math.sin(5.0 * theta);

  // Outer low white-coral motu ring (r ~ 41..48.5m), broken at Onoiau Pass around theta = 0
  const motuRingMask =
    1.0 - arcMask(theta, 0.0, 0.24, 0.08) - 0.85 * arcMask(theta, 2.45, 0.12, 0.05);
  const passMask = arcMask(theta, 0.0, 0.17, 0.07);

  if (r <= centralCoastR) {
    const u = r / centralCoastR;
    const inland = 1.0 - u;

    // Lush emerald skirt rising abruptly into sheer dark-basalt Mount Teurafa'atiu citadel!
    const skirt = 12.5 * Math.pow(smoothstep(0.03, 0.55, inland), 1.3);
    const cragDist = Math.hypot((x + 1.5) * 0.95, (z - 0.8) * 1.12);
    const citadelWall = 49.0 * (1.0 - smoothstep(6.2, 11.8, cragDist));
    const cragBattlements =
      3.8 *
      Math.cos(6.0 * theta + 0.7) *
      smoothstep(12.0, 7.0, cragDist) *
      smoothstep(3.0, 7.0, cragDist);

    // Flatten coastal star-observatory bluff at theta = -0.32 near shore
    let h = skirt + citadelWall + cragBattlements;
    const starBluff =
      arcMask(theta, -0.32, 0.2, 0.07) *
      smoothstep(0.62, 0.76, u) *
      smoothstep(0.98, 0.88, u);
    if (starBluff > 0.01) {
      h = lerp(h, 3.6, starBluff * 0.85);
    }

    return {
      h,
      zone: cragDist < 11.4 ? 'citadel' : u > 0.86 ? 'beach' : 'foothill',
    };
  }

  // Wide Jade Lagoon & Outer Coral Motu Necklace
  const motuCenterR = 44.8 + 0.9 * Math.cos(2.0 * theta);
  const motuHalfW = 3.4;
  const reefEdgeR = 50.8;

  if (r <= reefEdgeR) {
    let h = lerp(0.17, 0.23, smoothstep(centralCoastR, motuCenterR - motuHalfW, r));
    let zone = 'lagoon';

    if (Math.abs(r - motuCenterR) <= motuHalfW && motuRingMask > 0.05) {
      const mt = 1.0 - Math.abs(r - motuCenterR) / motuHalfW;
      const motuH = 2.85 * Math.pow(smoothstep(0.0, 1.0, mt), 0.88) * clamp01(motuRingMask);
      if (motuH > h) {
        h = motuH;
        zone = motuH > 1.45 ? 'motu_veg' : 'motu_sand';
      }
    } else if (r > motuCenterR + motuHalfW) {
      h = 0.23;
      zone = 'papa_reef';
    }

    h = lerp(h, -2.5, passMask * smoothstep(26.0, 35.0, r));
    if (h < 0.05) zone = 'deep_sea';
    return { h, zone };
  }

  const drop = smoothstep(reefEdgeR, 55.8, r);
  const h = lerp(lerp(0.24, -2.5, passMask), -4.2, drop);
  return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef' };
}

function buildMaupitiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.05, 0.26, 0.44];
  const colJadeLagoon = [0.15, 0.83, 0.76];
  const colWhiteSand = [0.95, 0.91, 0.8];
  const colFoothillGreen = [0.19, 0.46, 0.2];
  const colMotuGreen = [0.25, 0.51, 0.21];
  const colFortressBasalt = [0.21, 0.22, 0.25];
  const colCragCrown = [0.27, 0.36, 0.23];
  const colPapaCoral = [0.66, 0.6, 0.53];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalMaupitiPoint,
    maxRadius: 56.0,
    nRings: 66,
    nSegs: 100,
    colorFn: (s, slope) => {
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        return mixRgb(colJadeLagoon, colDeepSea, clamp01(-s.h / 2.5));
      }
      if (s.zone === 'lagoon') return colJadeLagoon;
      if (s.zone === 'papa_reef') return colPapaCoral;
      if (s.zone === 'motu_sand' || s.zone === 'beach') {
        return mixRgb(colWhiteSand, colMotuGreen, smoothstep(1.1, 1.9, s.h));
      }
      if (s.zone === 'motu_veg') return colMotuGreen;
      if (s.zone === 'citadel') {
        const cliffT = smoothstep(0.65, 1.6, slope);
        return mixRgb(colCragCrown, colFortressBasalt, Math.max(0.68, cliffT));
      }
      const rockT = smoothstep(1.0, 1.85, slope);
      return mixRgb(colFoothillGreen, colFortressBasalt, rockT * 0.85);
    },
  });

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.87,
      metalness: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x28e4ce, depthWrite: false }),
    0.36
  );
  const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(42.0, 52), lagoonMat);
  lagoonDisc.rotation.x = -Math.PI * 0.5;
  lagoonDisc.position.y = 0.255;
  group.add(lagoonDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe3d3a8, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.76
  );
  addBarrierReefArc(group, reefMat, foamMat, 50.0, 0.25, Math.PI * 2.0 - 0.25, 44);

  // First Master Tera'i's 12-Stone Star-Ring Observatory (Ahu Feti'a) on the Coastal Bluff!
  const bluffX = 18.2 * Math.cos(-0.32);
  const bluffZ = 18.2 * Math.sin(-0.32);
  addStarStoneCircle(group, trackMat, {
    x: bluffX,
    y: Math.max(2.2, evalMaupitiPoint(bluffX, bluffZ).h),
    z: bluffZ,
    radius: 2.8,
    stoneHex: 0x454340,
    withBraziers: true,
  });

  // Cliff-Foot Sanctuary Huts & Outer Motu Fisher Huts
  const huts = [
    [19.5, -0.68, 0.96],
    [20.2, -0.92, 0.9],
    [19.8, 0.45, 0.92],
    [44.6, -0.45, 0.86],
    [44.6, 0.42, 0.86],
  ].map(([hr, hang, sc]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.6, evalMaupitiPoint(hx, hz).h),
      z: hz,
      rotY: -hang + Math.PI,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'society');

  addTimberPier(group, trackMat, {
    x: 23.5 * Math.cos(-0.12),
    y: 0.68,
    z: 23.5 * Math.sin(-0.12),
    rotY: 0.12,
    length: 6.4,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 28.0 * Math.cos(-0.2),
    y: 0.32,
    z: 28.0 * Math.sin(-0.2),
    rotY: 0.2 + Math.PI * 0.5,
  });

  // Outer Motu & Central Shore Coconut Palms + Coastal Scrub
  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 28; i += 1) {
    const ang = (i / 28) * Math.PI * 2.0;
    if (Math.abs(Math.sin(ang)) < 0.26 && Math.cos(ang) > 0) continue;
    const mx = 44.8 * Math.cos(ang);
    const mz = 44.8 * Math.sin(ang);
    const my = evalMaupitiPoint(mx, mz).h;
    if (my > 1.1) {
      palmPts.push([mx, my - 0.15, mz, -ang, 0.92, 0.24]);
      if (i % 2 === 0) {
        scrubPts.push([mx * 1.02, my - 0.1, mz * 1.02, 1.25, 0.6, 1.1, -ang]);
      }
    }
  }
  for (const cAng of [-0.52, -1.15, 0.68, 1.45, 2.35, -2.2]) {
    const cx = 20.5 * Math.cos(cAng);
    const cz = 20.5 * Math.sin(cAng);
    const cy = evalMaupitiPoint(cx, cz).h;
    if (cy > 0.7 && cy < 9.0) {
      palmPts.push([cx, cy - 0.15, cz, -cAng, 0.96, 0.18]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts);

  return { group, materials, sinkDepthM: 67.0 };
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
