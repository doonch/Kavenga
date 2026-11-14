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
  addOutriggerCanoe,
  addRegionalHuts,
  addStarStoneCircle,
  addTimberPier,
  arcMask,
  buildPolarTerrainGeometry,
  clamp01,
  createMaterialTracker,
  gaussian2D,
  lerp,
  mixRgb,
  smoothstep,
} from './IslandSculptToolkit.js';

// ============================================================================
// 1. HUAHINE — Twin Islands Split by Turquoise Maroe Strait + Stone Fish Traps
// ============================================================================
function evalHuahinePoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const coastR =
    37.0 +
    3.4 * Math.cos(2.0 * theta - 1.57) +
    2.2 * Math.cos(4.0 * theta + 0.4) +
    1.4 * Math.sin(6.0 * theta);

  // Winding Maroe Strait cutting cleanly between Huahine Nui (z < 0) & Huahine Iti (z > 0)
  const straitCenterZ = 1.6 * Math.sin(x * 0.085) - 0.5;
  const straitDist = Math.abs(z - straitCenterZ);
  const straitMask = 1.0 - smoothstep(2.4, 5.8, straitDist);

  const passMask = arcMask(theta, 0.0, 0.16, 0.07) * smoothstep(22.0, 34.0, r);

  if (r > coastR) {
    const outerReefR = 49.5 + 1.0 * Math.sin(4.0 * theta);
    if (r <= outerReefR) {
      const lagoonFloor = lerp(0.18, 0.24, smoothstep(coastR, outerReefR, r));
      const h = lerp(lagoonFloor, -2.4, passMask);
      return { h, straitMask: 0.0, ridge: 0.0, inLagoon: h > 0.05 };
    }
    const drop = smoothstep(outerReefR, 55.6, r);
    const h = lerp(lerp(0.25, -2.4, passMask), -4.0, drop);
    return { h, straitMask: 0.0, ridge: 0.0, inLagoon: false };
  }

  const nuiPeak = 47.5 * gaussian2D(x, z, -1.5, -14.2, 15.2, 12.0, 0.18);
  const itiPeak = 37.5 * gaussian2D(x, z, 2.2, 15.0, 13.8, 11.2, -0.22);
  const radialRibs =
    (0.5 + 0.5 * Math.cos(6.0 * theta + 0.5)) *
    6.5 *
    smoothstep(36.0, 20.0, r) *
    (1.0 - straitMask);

  const coastalApron = 3.2 * smoothstep(coastR, coastR - 5.5, r);
  const landH = coastalApron + nuiPeak + itiPeak + radialRibs;

  let h = lerp(landH, 0.19, straitMask);
  h = lerp(h, -2.3, passMask);

  return {
    h,
    straitMask,
    ridge: clamp01(radialRibs / 6.5),
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
    maxRadius: 56.0,
    nRings: 62,
    nSegs: 96,
    colorFn: (s, slope) => {
      if (s.h < 0.06) {
        return mixRgb(colLagoon, colDeepSea, clamp01(-s.h / 2.4));
      }
      if (s.inLagoon || s.h < 0.28) {
        return s.straitMask > 0.4 ? colStraitJade : colLagoon;
      }
      if (s.h < 2.2 && slope < 0.75) {
        return mixRgb(colCreamSand, colBreadfruit, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(
        colBreadfruit,
        colHighJungle,
        smoothstep(4.0, 38.0, s.h)
      );
      rgb = mixRgb(rgb, colSunFern, s.ridge * 0.65);
      rgb = mixRgb(rgb, colBasalt, smoothstep(1.05, 1.9, slope) * 0.75);
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

  const lagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x26dbc5, depthWrite: false }),
    0.42
  );
  const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(48.8, 52), lagoonMat);
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
  addBarrierReefArc(group, reefMat, foamMat, 49.0, 0.26, Math.PI * 2.0 - 0.26, 40);

  // Ancient Maeva V-Shaped Basalt Stone Fish Traps (Pa I'a) in the Turquoise Channel
  const basaltWeirMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2f2d2b, roughness: 0.94 })
  );
  for (const [wx, wz, rot] of [
    [29.5, -1.8, 0.15],
    [25.0, 2.1, -0.2],
  ]) {
    const weir = new THREE.Group();
    weir.position.set(wx, 0.36, wz);
    weir.rotation.y = rot;
    const armA = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.42, 0.38),
      basaltWeirMat
    );
    armA.position.set(-2.4, 0, -1.35);
    armA.rotation.y = 0.46;
    const armB = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.42, 0.38),
      basaltWeirMat
    );
    armB.position.set(-2.4, 0, 1.35);
    armB.rotation.y = -0.46;
    const trapRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.18, 5, 10),
      basaltWeirMat
    );
    trapRing.rotation.x = Math.PI * 0.5;
    trapRing.position.set(0.55, 0, 0);
    weir.add(armA, armB, trapRing);
    group.add(weir);
  }

  // Ari'i's Twin-Bay Sail-Weaving Village & Stretched Golden Pandanus Sail Frames
  const hutSpots = [
    [27.5, -0.38, 1.05, true],
    [25.5, -0.54, 0.95, false],
    [28.2, -0.66, 0.9, false],
    [26.5, 0.42, 0.96, false],
    [28.5, 0.56, 0.88, false],
  ].map(([hr, hang, sc, longHouse]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.6, evalHuahinePoint(hx, hz).h),
      z: hz,
      rotY: -hang + Math.PI * 0.25,
      scale: sc,
      longHouse,
    };
  });
  addRegionalHuts(group, trackMat, hutSpots, 'society');

  const pandanusSailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe8cb88,
      roughness: 0.78,
      side: THREE.DoubleSide,
    })
  );
  const frameTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4728, roughness: 0.86 })
  );
  for (const [sr, sang] of [
    [29.8, -0.32],
    [30.2, -0.46],
  ]) {
    const sx = sr * Math.cos(sang);
    const sz = sr * Math.sin(sang);
    const sy = Math.max(0.55, evalHuahinePoint(sx, sz).h);
    const frame = new THREE.Group();
    frame.position.set(sx, sy, sz);
    frame.rotation.y = -sang;
    const matPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.7),
      pandanusSailMat
    );
    matPanel.position.y = 1.05;
    matPanel.rotation.x = -0.48;
    frame.add(matPanel);
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5),
      frameTimberMat
    );
    bar.rotation.z = Math.PI * 0.5;
    bar.position.set(0, 1.68, -0.38);
    frame.add(bar);
    group.add(frame);
  }

  const mx = 28.5 * Math.cos(-0.82);
  const mz = 28.5 * Math.sin(-0.82);
  addMaraePlatform(group, trackMat, {
    x: mx,
    y: Math.max(0.8, evalHuahinePoint(mx, mz).h),
    z: mz,
    rotY: 0.82,
    scale: 0.78,
  });

  addTimberPier(group, trackMat, {
    x: 32.5 * Math.cos(-0.26),
    y: 0.68,
    z: 32.5 * Math.sin(-0.26),
    rotY: 0.26,
    length: 6.8,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 33.8 * Math.cos(-0.19),
    y: 0.32,
    z: 33.8 * Math.sin(-0.19),
    rotY: 0.19 + Math.PI * 0.5,
  });

  const breadfruitPts = [];
  for (const [br, bang] of [
    [22.0, -0.45],
    [20.5, -0.75],
    [23.0, -1.15],
    [21.5, 0.52],
    [23.5, 0.88],
    [20.0, 1.35],
    [22.5, 2.45],
    [21.0, -2.35],
  ]) {
    const bx = br * Math.cos(bang);
    const bz = br * Math.sin(bang);
    const by = evalHuahinePoint(bx, bz).h;
    if (by > 1.8 && by < 16.0) {
      breadfruitPts.push([bx, by - 0.2, bz, 0.95, bang]);
    }
  }
  addBroadleafTrees(group, trackMat, breadfruitPts, {
    canopyHexA: 0x266324,
    canopyHexB: 0x3f822d,
  });

  const palmPts = [];
  for (let i = 0; i < 24; i += 1) {
    const ang = (i / 24) * Math.PI * 2.0 + 0.11;
    if (Math.abs(Math.sin(ang)) < 0.14 && Math.cos(ang) > 0) continue;
    const pr = 31.2 + (i % 3) * 1.4;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const py = evalHuahinePoint(px, pz).h;
    if (py > 0.55 && py < 9.5) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.92 + (i % 3) * 0.08, 0.22]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 54.0 };
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
  for (const hxOff of [-0.75, 0.75]) {
    const hLog = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 6.2, 8),
      tamanuHullMat
    );
    hLog.rotation.x = Math.PI * 0.5;
    hLog.position.set(hxOff, 0.55, 0.8);
    canoeYard.add(hLog);
  }
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
