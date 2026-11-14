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
  addBarrierReefArc,
  addBroadleafTrees,
  addCoconutGroves,
  addCoastalScrub,
  addMaraePlatform,
  addOutriggerCanoe,
  addRegionalHuts,
  addStarStoneCircle,
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

// ============================================================================
// 1. KAUA'I — 14-Pleat Na Pali Cathedral Razor-Cliffs & High Crag Pa Sanctuary
// ============================================================================
function evalKauaiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const coveIndent = 7.2 * Math.exp(-Math.pow(theta / 0.28, 2.0));
  const paliPleats = 2.6 * Math.cos(14.0 * theta) * smoothstep(0.25, 0.7, Math.abs(theta));
  const coastR = 40.0 - coveIndent + paliPleats + 2.2 * Math.cos(3.0 * theta + 0.5);

  if (r > coastR) {
    return {
      h: lerp(0.05, -4.5, smoothstep(coastR, coastR + 7.2, r)),
      pleat: 0.0,
      isBlackCove: false,
    };
  }

  const u = r / coastR;
  const inCove = Math.abs(theta) < 0.28;

  // Towering Wai'ale'ale central wet massif (~80m) + 14 deep razor-sharp Na Pali pleated ribs!
  const summitDome = 74.0 * Math.pow(smoothstep(0.98, 0.08, u), 1.22);
  const pleatWave = Math.pow(0.5 + 0.5 * Math.cos(14.0 * theta), 2.15);
  const pleatEnv = smoothstep(0.12, 0.42, 1.0 - u) * smoothstep(0.95, 0.32, 1.0 - u);
  const pleatRelief = (pleatWave - 0.3) * 19.5 * pleatEnv;

  const cliffDrop = inCove ? 1.8 * (1.0 - u) : 21.0 * smoothstep(1.0, 0.85, u);
  let h = Math.max(0.0, summitDome + pleatRelief + cliffDrop * 0.55);

  // Flatten Pohaku's High Crag Pa bluff overlooking the cove at theta = -0.44
  const paBluff = gaussian2D(x, z, 25.5, -11.8, 5.2, 4.8, 0.3);
  if (paBluff > 0.15) {
    h = lerp(h, 16.5, paBluff * 0.82);
  }

  if (inCove && u > 0.8) {
    h = lerp(h, 1.4 * (1.0 - smoothstep(0.8, 1.0, u)), 0.82);
  }

  return {
    h,
    pleat: pleatWave * pleatEnv,
    isBlackCove: inCove && u > 0.8,
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
    maxRadius: 53.0,
    nRings: 64,
    nSegs: 112,
    colorFn: (s, slope, _x, _z, _r, theta) => {
      if (s.h <= 0.06) return colDeepSea;
      if (s.isBlackCove && s.h < 2.2) {
        return mixRgb(colBlackSand, colNaPaliEmerald, smoothstep(1.0, 2.2, s.h));
      }
      let rgb = mixRgb(colNaPaliEmerald, colRazorMoss, clamp01(s.pleat * 1.35));
      const redStreak = Math.max(0.0, Math.sin(7.0 * theta + 1.1)) * smoothstep(1.1, 1.9, slope);
      rgb = mixRgb(rgb, colRedDirt, redStreak * 0.48);
      rgb = mixRgb(rgb, colDarkBasalt, smoothstep(1.15, 2.1, slope) * 0.82);
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

  // White surf collar along the sheer Na Pali lava benches
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.74
  );
  const foamGeo = new THREE.TorusGeometry(42.2, 1.0, 5, 42, Math.PI * 2.0 - 0.68);
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.rotation.x = Math.PI * 0.5;
  foam.rotation.z = 0.34;
  foam.scale.set(1.0, 1.0, 0.14);
  foam.position.y = 0.28;
  group.add(foam);

  // Twin Weeping Wai'ale'ale Highland Waterfalls
  addWaterfallCascade(group, trackMat, {
    x: 11.5,
    y: 34.0,
    z: -14.5,
    width: 1.4,
    height: 28.0,
    rotY: 0.45,
    tiltX: -0.32,
  });
  addWaterfallCascade(group, trackMat, {
    x: 12.0,
    y: 31.0,
    z: 14.0,
    width: 1.35,
    height: 25.0,
    rotY: 2.55,
    tiltX: -0.34,
  });

  // Swell Master Pohaku's High Crag Pa Sanctuary with Flaming Signal Braziers!
  addMaraePlatform(group, trackMat, {
    x: 25.5,
    y: Math.max(12.0, evalKauaiPoint(25.5, -11.8).h),
    z: -11.8,
    rotY: 0.42,
    scale: 0.84,
    courtHex: 0x2c2b2e,
    ahuHex: 0x454346,
    withBraziers: true,
  });

  // Steep A-frame Hawaiian Pili-Grass Hale Village behind the Black-Sand Cove
  const huts = [
    [28.5, -0.15, 0.98],
    [26.5, -0.04, 1.04],
    [28.8, 0.12, 0.94],
    [26.2, 0.21, 0.9],
  ].map(([hr, hang, sc]) => {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.8, evalKauaiPoint(hx, hz).h),
      z: hz,
      rotY: -hang,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'hawaiian');

  // Crimson-Blossomed 'Ohi'a Lehua Highland Trees & Cove Palms
  const ohiaPts = [];
  for (const [or, oang] of [
    [21.0, -0.35],
    [19.5, -0.65],
    [20.5, 0.45],
    [18.5, 0.85],
    [21.0, 2.1],
    [19.5, -2.2],
  ]) {
    const ox = or * Math.cos(oang);
    const oz = or * Math.sin(oang);
    const oy = evalKauaiPoint(ox, oz).h;
    if (oy > 4.0 && oy < 32.0) {
      ohiaPts.push([ox, oy - 0.2, oz, 0.95, oang]);
    }
  }
  addBroadleafTrees(group, trackMat, ohiaPts, {
    canopyHexA: 0x1e5422,
    canopyHexB: 0x2f6b28,
    blossomHex: 0xd63028,
  });

  const palmPts = [];
  for (const ang of [-0.24, -0.14, 0.04, 0.16, 0.25]) {
    const px = 30.8 * Math.cos(ang);
    const pz = 30.8 * Math.sin(ang);
    const py = evalKauaiPoint(px, pz).h;
    if (py > 0.5 && py < 8.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.95, 0.2]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 88.0 };
}

// ============================================================================
// 2. O'AHU — Sweeping Ko'olau Pali Wall, Barrier Beach & Russet Miro Grove
// ============================================================================
function evalOahuPoint(x, z) {
  // Elongated windward bay & long curved Ko'olau Pali escarpment wall
  const sx = x * 1.05;
  const sz = z * 0.88;
  const r = Math.hypot(sx, sz);
  const theta = Math.atan2(sz, sx);

  const baySweep = 4.8 * Math.exp(-Math.pow(theta / 0.58, 2.0));
  const mokapuPeninsula = 5.5 * Math.exp(-Math.pow((theta - 0.72) / 0.22, 2.0));
  const coastR = 37.5 - baySweep + mokapuPeninsula + 2.0 * Math.sin(4.0 * theta);

  const passMask = arcMask(theta, 0.0, 0.2, 0.08) * smoothstep(26.0, 36.0, r);

  if (r > coastR) {
    const outerSandbarR = 49.0;
    if (r <= outerSandbarR) {
      const floor = lerp(0.17, 0.23, smoothstep(coastR, outerSandbarR, r));
      return {
        h: lerp(floor, -2.3, passMask),
        paliFlute: 0.0,
        miroZone: 0.0,
        inBay: true,
      };
    }
    const drop = smoothstep(outerSandbarR, 55.6, r);
    return {
      h: lerp(lerp(0.23, -2.3, passMask), -4.0, drop),
      paliFlute: 0.0,
      miroZone: 0.0,
      inBay: false,
    };
  }

  const u = r / coastR;
  // Long curved Ko'olau Pali wall running N-S behind the wooded coastal plain (x ~ -9)
  const paliAxisX = x + 9.5 - 0.018 * z * z;
  const paliSpanZ = 1.0 - smoothstep(18.0, 29.0, Math.abs(z));
  const paliAsym =
    paliAxisX > 0.0
      ? Math.exp(-Math.pow(paliAxisX / 5.2, 1.65)) // Sheer fluted windward Pali cliff facing the bay!
      : Math.exp(-Math.pow(paliAxisX / 15.5, 2.0)); // Gentle leeward slope behind
  const paliFlute =
    (0.5 + 0.5 * Math.cos(z * 0.85)) *
    smoothstep(10.0, 1.5, Math.abs(paliAxisX)) *
    paliSpanZ;
  const paliWall = (37.5 + 4.5 * paliFlute) * paliAsym * paliSpanZ;

  // Wooded coastal plain & wide golden-cream barrier beach on x > 4
  const foothills = 8.5 * smoothstep(1.0, 0.35, u);
  let h = foothills + paliWall;

  if (Math.abs(theta) < 0.65 && u > 0.76) {
    h = lerp(h, 1.45 * (1.0 - smoothstep(0.76, 1.0, u)), 0.76);
  }

  const miroZone = clamp01(gaussian2D(x, z, 11.5, -6.5, 11.5, 13.5, 0.15));
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
    maxRadius: 56.0,
    nRings: 62,
    nSegs: 98,
    colorFn: (s, slope) => {
      if (s.h < 0.06) {
        return mixRgb(colSandbarAqua, colDeepSea, clamp01(-s.h / 2.3));
      }
      if (s.inBay || s.h < 0.27) return colSandbarAqua;
      if (s.h < 2.2 && slope < 0.75) {
        return mixRgb(colBarrierBeach, colPaliGreen, smoothstep(1.1, 2.2, s.h));
      }
      let rgb = mixRgb(colPaliGreen, colPaliRib, s.paliFlute * 0.7);
      rgb = mixRgb(rgb, colMiroForest, s.miroZone * 0.65);
      rgb = mixRgb(rgb, colCliffGrey, smoothstep(1.1, 2.0, slope) * 0.72);
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

  const bayWaterMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x30e5cf, depthWrite: false }),
    0.38
  );
  const bayDisc = new THREE.Mesh(new THREE.CircleGeometry(48.2, 50), bayWaterMat);
  bayDisc.rotation.x = -Math.PI * 0.5;
  bayDisc.position.y = 0.255;
  group.add(bayDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe8dab4, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf2fbff, depthWrite: false }),
    0.7
  );
  addBarrierReefArc(group, reefMat, foamMat, 48.5, 0.26, Math.PI * 2.0 - 0.26, 40);

  // Dense Red-Heartwood Miro & Koa Timber Forest Grove!
  const miroPts = [];
  for (const [mx, mz, sc] of [
    [12.0, -4.5, 1.15],
    [9.5, -8.2, 1.22],
    [14.5, -9.5, 1.08],
    [7.8, -3.5, 1.18],
    [11.0, -12.5, 1.05],
    [15.2, -14.0, 0.98],
    [8.5, 5.5, 1.12],
    [12.5, 8.8, 1.06],
    [6.5, 10.5, 1.15],
  ]) {
    const my = evalOahuPoint(mx, mz).h;
    if (my > 1.5) {
      miroPts.push([mx, my - 0.2, mz, sc, mx * 0.4]);
    }
  }
  addBroadleafTrees(group, trackMat, miroPts, {
    trunkHex: 0x6b331e,
    canopyHexA: 0x5c4c22, // Warm bronze-olive Koa/Miro crown
    canopyHexB: 0x2e5b27, // Deep emerald Milo foliage
    blossomHex: 0xb86b2b, // Russet seedpods/heartwood hue
  });

  // Stacked Seasoned Red Miro Drum-Wood Logs on Beach Skids + Elder Manu's Warm Hearth!
  const miroLogMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8a3820, roughness: 0.78 })
  );
  const logStack = new THREE.Group();
  const lx = 24.5;
  const lz = -3.8;
  logStack.position.set(lx, Math.max(0.9, evalOahuPoint(lx, lz).h), lz);
  logStack.rotation.y = 0.25;
  const logGeo = new THREE.CylinderGeometry(0.24, 0.26, 3.2, 7);
  logGeo.rotateZ(Math.PI * 0.5);
  for (const [ly, lzOff] of [
    [0.24, -0.28],
    [0.24, 0.28],
    [0.64, 0.0],
  ]) {
    const mLog = new THREE.Mesh(logGeo, miroLogMat);
    mLog.position.set(0, ly, lzOff);
    logStack.add(mLog);
  }
  group.add(logStack);

  // Elder Manu's Glowing Beachside Fisher's Hearth
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x423f3c, roughness: 0.9 })
  );
  const fireMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff8229 }),
    0.94
  );
  const hx = 26.8;
  const hz = 2.4;
  const hy = Math.max(0.75, evalOahuPoint(hx, hz).h);
  const hearthRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.2, 6, 12),
    stoneMat
  );
  hearthRing.rotation.x = Math.PI * 0.5;
  hearthRing.position.set(hx, hy + 0.12, hz);
  group.add(hearthRing);

  const bonfire = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.15, 7), fireMat);
  bonfire.position.set(hx, hy + 0.62, hz);
  group.add(bonfire);

  const huts = [
    [23.5, 0.08, 1.02],
    [22.0, 0.24, 0.96],
    [24.2, 0.38, 0.92],
    [21.5, -0.06, 0.94],
  ].map(([hr, hang, sc]) => {
    const px = hr * Math.cos(hang);
    const pz = hr * Math.sin(hang);
    return {
      x: px,
      y: Math.max(0.8, evalOahuPoint(px, pz).h),
      z: pz,
      rotY: -hang,
      scale: sc,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'hawaiian');

  addOutriggerCanoe(group, trackMat, {
    x: 29.8,
    y: Math.max(0.45, evalOahuPoint(29.8, 0.5).h + 0.15),
    z: 0.5,
    rotY: 0.15,
  });

  const palmPts = [];
  for (let i = -5; i <= 5; i += 1) {
    const ang = i * 0.12;
    const px = 28.2 * Math.cos(ang);
    const pz = 28.2 * Math.sin(ang);
    const py = evalOahuPoint(px, pz).h;
    if (py > 0.5 && py < 6.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.94, 0.22]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 53.0 };
}

// ============================================================================
// 3. KIRITIMATI — Broad Claw Land-Atoll, Interior Star-Mirror Ponds & Shrine
// ============================================================================
const KIRITIMATI_MIRROR_PONDS = [
  [-12.5, -6.5, 6.2], // Sacred Star-Mirror Pond beside Keeper Akura's Shrine!
  [-18.5, 9.5, 5.4],
  [-4.5, 16.5, 4.8],
  [-22.0, -14.0, 4.5],
  [4.5, -18.5, 4.6],
];

function evalKiritimatiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Broad C-shaped / claw land-atoll enclosing a western lagoon bay on x > 0 (theta ~ 0)
  const outerR =
    46.5 + 2.4 * Math.cos(2.0 * theta + 0.4) + 1.5 * Math.sin(3.0 * theta);
  const passMask = arcMask(theta, 0.0, 0.28, 0.09);

  // Western lagoon basin centered at (14, 0) opening out through theta = 0!
  const mainLagoonMask = gaussian2D(x, z, 14.5, 0.0, 19.5, 16.5, 0.0);

  if (r > outerR) {
    const reefEdgeR = outerR + 3.8;
    if (r <= reefEdgeR) {
      const h = lerp(0.22, -2.5, passMask);
      return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef', pondRim: 0.0 };
    }
    const drop = smoothstep(reefEdgeR, 55.8, r);
    const h = lerp(lerp(0.23, -2.5, passMask), -4.1, drop);
    return { h, zone: h < 0.05 ? 'deep_sea' : 'papa_reef', pondRim: 0.0 };
  }

  // Broad flat coral-sand & gypsum land table (~2.8m elevation)
  const edgeSlope = smoothstep(outerR, outerR - 5.5, r);
  let h = 0.22 + 2.85 * Math.pow(edgeSlope, 0.78);
  let zone = h < 1.35 ? 'white_sand' : 'atoll_land';

  // Carve main western turquoise lagoon & coral pass
  if (mainLagoonMask > 0.24 || (passMask > 0.1 && x > 6.0)) {
    const lagBlend = clamp01(
      Math.max(smoothstep(0.24, 0.52, mainLagoonMask), passMask * smoothstep(6.0, 22.0, x))
    );
    const lagTarget = lerp(0.18, -2.4, passMask * smoothstep(22.0, 36.0, r));
    h = lerp(h, lagTarget, lagBlend);
    if (lagBlend > 0.55) {
      zone = h < 0.05 ? 'deep_sea' : 'lagoon';
    } else {
      zone = 'white_sand';
    }
  }

  // Carve 5 circular hypersaline Star-Mirror Ponds with pale rose-gypsum salt rims!
  let pondRim = 0.0;
  for (let i = 0; i < KIRITIMATI_MIRROR_PONDS.length; i += 1) {
    const [px, pz, pr] = KIRITIMATI_MIRROR_PONDS[i];
    const d = Math.hypot(x - px, z - pz);
    if (d < pr + 2.4 && zone !== 'lagoon' && zone !== 'deep_sea') {
      const inPond = 1.0 - smoothstep(pr - 1.1, pr + 0.4, d);
      const rim = Math.exp(-Math.pow((d - (pr + 0.6)) / 1.35, 2.0));
      pondRim = Math.max(pondRim, rim);
      h = lerp(h, 0.21, inPond);
      if (inPond > 0.55) zone = 'mirror_pond';
    }
  }

  return { h, zone, pondRim };
}

function buildKiritimatiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.25, 0.44];
  const colLagoon = [0.14, 0.8, 0.77];
  const colMirrorPond = [0.18, 0.64, 0.78];
  const colGypsumRose = [0.94, 0.8, 0.78]; // Rose-gypsum salt flat rims!
  const colSaltWhite = [0.96, 0.94, 0.88];
  const colRenScrub = [0.34, 0.49, 0.29]; // Silvery-olive dry equatorial atoll scrub
  const colPapaCoral = [0.68, 0.62, 0.55];

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalKiritimatiPoint,
    maxRadius: 56.0,
    nRings: 66,
    nSegs: 112,
    colorFn: (s) => {
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        return mixRgb(colLagoon, colDeepSea, clamp01(-s.h / 2.4));
      }
      if (s.zone === 'lagoon') return colLagoon;
      if (s.zone === 'mirror_pond') return colMirrorPond;
      if (s.zone === 'papa_reef') return colPapaCoral;
      if (s.zone === 'white_sand') {
        return mixRgb(colSaltWhite, colGypsumRose, s.pondRim * 0.7);
      }
      let rgb = mixRgb(colSaltWhite, colRenScrub, smoothstep(1.4, 2.5, s.h) * 0.82);
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

  // Glassy Reflective Star-Mirror Lagoon & Pond Shimmer Sheet
  const mirrorMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x3ce8e4, depthWrite: false }),
    0.38
  );
  const mirrorDisc = new THREE.Mesh(new THREE.CircleGeometry(43.5, 56), mirrorMat);
  mirrorDisc.rotation.x = -Math.PI * 0.5;
  mirrorDisc.position.y = 0.255;
  group.add(mirrorDisc);

  const reefMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe8ddc2, roughness: 0.88 })
  );
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf4fcff, depthWrite: false }),
    0.75
  );
  addBarrierReefArc(group, reefMat, foamMat, 49.2, 0.34, Math.PI * 2.0 - 0.34, 46);

  // Keeper Akura's 12-Stone Star-Mirror Shrine + Giant Fluted Tridacna Clam Altar!
  const sx = -4.2;
  const sz = -7.8;
  const sy = Math.max(1.8, evalKiritimatiPoint(sx, sz).h);
  addStarStoneCircle(group, trackMat, {
    x: sx,
    y: sy,
    z: sz,
    radius: 3.4,
    stoneHex: 0xf0ebe0,
    withBraziers: true,
  });

  // Giant Fluted White Tridacna Clam-Shell Sanctuary Altar overlooking the Lagoon
  const clamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8f6f0,
      roughness: 0.35,
      metalness: 0.1,
    })
  );
  const clamAltar = new THREE.Group();
  clamAltar.position.set(1.5, Math.max(1.2, evalKiritimatiPoint(1.5, -10.5).h), -10.5);
  for (const tilt of [-0.45, 0.45]) {
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 0.35, 0.25, 9, 1, false, 0, Math.PI),
      clamMat
    );
    valve.rotation.z = tilt;
    valve.position.y = 0.55;
    clamAltar.add(valve);
  }
  group.add(clamAltar);

  // Grand Maneaba Pavilion & Coral-Pass Atoll Huts
  const huts = [
    [22.0 * Math.cos(-0.68), -0.68, 1.15, true], // Grand Maneaba meeting pavilion
    [26.5 * Math.cos(-0.54), -0.54, 0.95, false],
    [28.5 * Math.cos(-0.44), -0.44, 0.92, false],
    [26.0 * Math.cos(0.56), 0.56, 0.95, false],
    [28.5 * Math.cos(0.45), 0.45, 0.9, false],
  ].map(([_unused, hang, sc, longHouse], idx) => {
    const rad = idx === 0 ? 22.0 : 28.0 + (idx % 2) * 2.5;
    const hx = rad * Math.cos(hang);
    const hz = rad * Math.sin(hang);
    return {
      x: hx,
      y: Math.max(0.9, evalKiritimatiPoint(hx, hz).h),
      z: hz,
      rotY: -hang + Math.PI,
      scale: sc,
      longHouse,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'atoll');

  addTimberPier(group, trackMat, {
    x: 25.0,
    y: 0.7,
    z: -11.2,
    rotY: Math.PI * 0.48,
    length: 7.4,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 22.5,
    y: 0.32,
    z: -8.2,
    rotY: 0.3,
  });

  // Silvery-Olive Ren Scrub & Equatorial Coconut Groves
  const palmPts = [];
  const scrubPts = [];
  for (let i = 0; i < 34; i += 1) {
    const ang = 0.45 + (i / 34) * (Math.PI * 2.0 - 0.9);
    const pr = 34.5 + (i % 3) * 3.2;
    const px = pr * Math.cos(ang);
    const pz = pr * Math.sin(ang);
    const py = evalKiritimatiPoint(px, pz).h;
    if (py > 1.8) {
      palmPts.push([px, py - 0.16, pz, -ang, 0.94, 0.22]);
      scrubPts.push([px * 0.92, py - 0.12, pz * 0.92, 1.35, 0.62, 1.2, -ang]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);
  addCoastalScrub(group, trackMat, scrubPts, {
    hexA: 0x4b6a3e,
    hexB: 0x627e50,
  });

  return { group, materials, sinkDepthM: 12.5 };
}

// ============================================================================
// 4. HAWAI'I — Active Glowing Kilauea & Mauna Loa Lava Calderas + Great Heiau
// ============================================================================
const KILAUEA_CENTER = [-3.5, -9.5];
const KILAUEA_RADIUS = 9.6;
const MAUNA_LOA_CENTER = [-11.5, 9.8];
const MAUNA_LOA_RADIUS = 5.4;

/**
 * Computes proximity [0..1] to the two sinuous molten lava rivers spilling from
 * Kilauea's southern/western rim notch down the black basalt flank into the sea!
 */
function evalHawaiiLavaChannels(x, z) {
  // Primary molten river flowing from Kilauea (-3.5, -9.5) toward sea cliff at (-8.5, -42.0)
  let flowA = 0.0;
  if (z < -9.0 && z > -45.5) {
    const t = clamp01((-z - 9.0) / 34.0);
    const centerX =
      lerp(-3.5, -9.5, t) + 2.8 * Math.sin(t * Math.PI * 2.6 + 0.3);
    const width = lerp(2.1, 3.2, t);
    flowA = Math.exp(-Math.pow(Math.abs(x - centerX) / width, 2.2));
  }

  // Secondary braided molten branch splitting toward (4.5, -39.5)
  let flowB = 0.0;
  if (z < -15.0 && z > -43.0) {
    const t = clamp01((-z - 15.0) / 26.5);
    const centerX =
      lerp(-2.5, 5.2, t) - 1.9 * Math.sin(t * Math.PI * 2.0);
    const width = lerp(1.5, 2.3, t);
    flowB = Math.exp(-Math.pow(Math.abs(x - centerX) / width, 2.2));
  }

  return clamp01(Math.max(flowA, flowB));
}

function evalHawaiiPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Sheltered Kealakekua Bay on theta = 0 (+X approach) & rugged black lava delta on -Z flank
  const kealakekuaBay = 6.8 * Math.exp(-Math.pow(theta / 0.32, 2.0));
  const lavaDeltaBulge = 4.2 * Math.exp(-Math.pow((theta + 1.72) / 0.35, 2.0));
  const coastR =
    41.5 - kealakekuaBay + lavaDeltaBulge + 2.4 * Math.cos(4.0 * theta - 0.5);

  if (r > coastR) {
    return {
      h: lerp(0.05, -4.6, smoothstep(coastR, coastR + 7.5, r)),
      inKilauea: 0.0,
      inMaunaLoa: 0.0,
      lavaRiver: 0.0,
      blackLavaField: 0.0,
      alpineCap: 0.0,
      isGoldenBay: false,
    };
  }

  const u = r / coastR;
  const inBay = Math.abs(theta) < 0.32;

  // 1. Broad Ancestral Twin-Mauna Volcanic Shield Massif:
  //    - Mauna Kea / Mauna Loa high shield on +Z/-X (~72m summit)
  //    - Active Kilauea shield dome on -Z flank (~52m crater rim)
  const highMauna = 69.0 * gaussian2D(x, z, -11.0, 9.5, 19.5, 17.5, 0.25);
  const kilaueaDome = 49.0 * gaussian2D(x, z, -3.5, -9.5, 18.5, 17.5, -0.15);
  const baseShield = 22.0 * Math.pow(smoothstep(1.0, 0.12, u), 1.15);

  const seaCliff = inBay ? 1.8 * (1.0 - u) : 14.0 * smoothstep(1.0, 0.86, u);
  let h = baseShield + Math.max(highMauna * 0.82, kilaueaDome * 0.85) + seaCliff * 0.45;

  // 2. Carve Open-Top Sunken Kilauea / Halema'uma'u Caldera (wide sunken lava crater!)
  const kd = Math.hypot(x - KILAUEA_CENTER[0], z - KILAUEA_CENTER[1]);
  const kRimRaise = 5.8 * Math.exp(-Math.pow((kd - KILAUEA_RADIUS) / 2.6, 2.0));
  // Breach a glowing spillway notch on the -Z rim so molten lava visibly pours out!
  const kSpillway =
    arcMask(Math.atan2(z - KILAUEA_CENTER[1], x - KILAUEA_CENTER[0]), -1.62, 0.28, 0.1) *
    Math.exp(-Math.pow((kd - KILAUEA_RADIUS) / 3.2, 2.0));
  const inKilauea = 1.0 - smoothstep(KILAUEA_RADIUS - 1.8, KILAUEA_RADIUS + 0.4, kd);
  h += kRimRaise * (1.0 - 0.72 * kSpillway);
  h = lerp(h, 39.2, inKilauea);

  // 3. Carve Upper Mauna Loa Summit Rift Caldera (second glowing summit crater!)
  const md = Math.hypot(x - MAUNA_LOA_CENTER[0], z - MAUNA_LOA_CENTER[1]);
  const mRimRaise = 4.6 * Math.exp(-Math.pow((md - MAUNA_LOA_RADIUS) / 2.0, 2.0));
  const inMaunaLoa = 1.0 - smoothstep(MAUNA_LOA_RADIUS - 1.3, MAUNA_LOA_RADIUS + 0.3, md);
  h += mRimRaise;
  h = lerp(h, 58.5, inMaunaLoa);

  // 4. Molten Lava River Channels etched slightly into the black pahoehoe slope
  const lavaRiver = inKilauea > 0.5 ? 0.0 : evalHawaiiLavaChannels(x, z);
  h -= 0.65 * lavaRiver;

  // Flatten Great Ancestral Heiau headland terrace overlooking Kealakekua Bay (theta = 0.38)
  const heiauTerrace = gaussian2D(x, z, 28.5, 11.2, 5.8, 5.4, -0.35);
  if (heiauTerrace > 0.15) {
    h = lerp(h, 5.4, heiauTerrace * 0.82);
  }

  if (inBay && u > 0.8) {
    h = lerp(h, 1.45 * (1.0 - smoothstep(0.8, 1.0, u)), 0.82);
  }

  const blackLavaField = clamp01(
    smoothstep(-2.0, -16.0, z) * 0.9 + inKilauea + lavaRiver
  );
  const alpineCap =
    inMaunaLoa < 0.2 && z > 2.0 ? smoothstep(58.0, 67.5, h) : 0.0;

  return {
    h,
    inKilauea,
    inMaunaLoa,
    lavaRiver,
    blackLavaField,
    alpineCap,
    isGoldenBay: inBay && u > 0.78,
  };
}

/**
 * Builds a self-luminous (`MeshBasicMaterial` vertex-colored) open-top molten lava lake mesh
 * with incandescent yellow-white upwelling fountain core, fiery orange convection cells,
 * dark cooling basalt crust plates, and glowing radial magma fissures!
 */
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

      // Upwelling central fountain + glowing radial/polygonal crustal fracture web!
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

      // Slight domed lava fountain mound in center
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

  const mat = trackMat(
    new THREE.MeshBasicMaterial({ vertexColors: true })
  );
  return new THREE.Mesh(geo, mat);
}

/**
 * Builds a 3D self-luminous molten lava river ribbon hugging `evalHawaiiPoint` down the volcano flank.
 */
function createGlowingLavaRiverRibbon(trackMat, pathFn, zStart, zEnd, halfWidthStart, halfWidthEnd) {
  const steps = 34;
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
      const py = Math.max(0.28, evalHawaiiPoint(px, z).h + (k === 1 ? 0.34 : 0.18));
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

function buildHawaiiAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

  const colDeepSea = [0.04, 0.22, 0.41];
  const colGoldenSand = [0.92, 0.82, 0.58];
  const colOhiaEmerald = [0.16, 0.45, 0.19];
  const colUplandKoa = [0.26, 0.42, 0.18];
  const colBlackPahoehoe = [0.09, 0.09, 0.11]; // Fresh glassy black basalt lava field!
  const colCraterScoria = [0.28, 0.11, 0.08]; // Warm glowing oxidized crater wall
  const colMoltenOrange = [1.0, 0.42, 0.06];
  const colMoltenGold = [1.0, 0.86, 0.25];
  const colMaunaFrost = [0.84, 0.86, 0.89]; // Subtle Mauna Kea periglacial summit stone/frost

  const terrainGeo = buildPolarTerrainGeometry({
    evalPoint: evalHawaiiPoint,
    maxRadius: 55.0,
    nRings: 68,
    nSegs: 116,
    colorFn: (s, slope) => {
      if (s.h <= 0.06) return colDeepSea;

      // Glowing lava channels & open caldera floors baked right into terrain vertex colors too!
      if (s.inKilauea > 0.65 || s.inMaunaLoa > 0.65) {
        return mixRgb(colCraterScoria, colMoltenOrange, 0.75);
      }
      if (s.lavaRiver > 0.32) {
        const coreT = smoothstep(0.32, 0.88, s.lavaRiver);
        return mixRgb(colCraterScoria, mixRgb(colMoltenOrange, colMoltenGold, coreT), coreT);
      }
      if (s.isGoldenBay && s.h < 2.3) {
        return mixRgb(colGoldenSand, colOhiaEmerald, smoothstep(1.1, 2.3, s.h));
      }

      let rgb = mixRgb(colOhiaEmerald, colUplandKoa, smoothstep(10.0, 44.0, s.h));
      rgb = mixRgb(rgb, colBlackPahoehoe, clamp01(s.blackLavaField * 0.92));
      if (s.inKilauea > 0.05 || s.inMaunaLoa > 0.05) {
        rgb = mixRgb(rgb, colCraterScoria, 0.78);
      }
      rgb = mixRgb(rgb, colBlackPahoehoe, smoothstep(1.1, 2.0, slope) * 0.72);
      if (s.alpineCap > 0.01) {
        rgb = mixRgb(rgb, colMaunaFrost, s.alpineCap * 0.78);
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

  // 1. OPEN-TOP GLOWING MOLTEN LAVA LAKES (Kilauea Halema'uma'u & Mauna Loa Summit Caldera!)
  const kilaueaLake = createGlowingLavaLakeMesh(trackMat, KILAUEA_RADIUS - 0.9, 39.65);
  kilaueaLake.position.set(KILAUEA_CENTER[0], 0.0, KILAUEA_CENTER[1]);
  group.add(kilaueaLake);

  const maunaLoaLake = createGlowingLavaLakeMesh(trackMat, MAUNA_LOA_RADIUS - 0.7, 58.9);
  maunaLoaLake.position.set(MAUNA_LOA_CENTER[0], 0.0, MAUNA_LOA_CENTER[1]);
  group.add(maunaLoaLake);

  // Radiant volcanic crater-rim glow collars around both open lava calderas
  const lavaGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff5a14,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    0.46
  );
  const kGlowHalo = new THREE.Mesh(
    new THREE.RingGeometry(KILAUEA_RADIUS - 1.6, KILAUEA_RADIUS + 1.8, 36),
    lavaGlowMat
  );
  kGlowHalo.rotation.x = -Math.PI * 0.5;
  kGlowHalo.position.set(KILAUEA_CENTER[0], 41.2, KILAUEA_CENTER[1]);
  group.add(kGlowHalo);

  const mGlowHalo = new THREE.Mesh(
    new THREE.RingGeometry(MAUNA_LOA_RADIUS - 1.1, MAUNA_LOA_RADIUS + 1.4, 28),
    lavaGlowMat
  );
  mGlowHalo.rotation.x = -Math.PI * 0.5;
  mGlowHalo.position.set(MAUNA_LOA_CENTER[0], 60.1, MAUNA_LOA_CENTER[1]);
  group.add(mGlowHalo);

  // 2. Self-Luminous 3D Braided Molten Lava Rivers Snaking Down to the Sea!
  const riverA = createGlowingLavaRiverRibbon(
    trackMat,
    (t) => lerp(-3.5, -9.5, t) + 2.8 * Math.sin(t * Math.PI * 2.6 + 0.3),
    -10.2,
    -43.2,
    1.55,
    2.45
  );
  group.add(riverA);

  const riverB = createGlowingLavaRiverRibbon(
    trackMat,
    (t) => lerp(-2.5, 5.2, t) - 1.9 * Math.sin(t * Math.PI * 2.0),
    -16.0,
    -40.8,
    1.05,
    1.65
  );
  group.add(riverB);

  // 3. Ocean-Entry Lava Steam Plume & Glowing Coastal Lava Toes where Molten Rock Meets the Pacific!
  const steamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf5f2ee, depthWrite: false }),
    0.68
  );
  const oceanEntryGlowMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff6218, depthWrite: false }),
    0.85
  );
  for (const [sx, sz, sc] of [
    [-9.4, -43.5, 1.0],
    [5.0, -41.2, 0.72],
  ]) {
    const entryGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.6 * sc, 16),
      oceanEntryGlowMat
    );
    entryGlow.rotation.x = -Math.PI * 0.5;
    entryGlow.position.set(sx, 0.34, sz);
    group.add(entryGlow);

    for (let p = 0; p < 3; p += 1) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry((2.1 + p * 0.85) * sc, 1),
        steamMat
      );
      puff.position.set(sx - p * 0.7, 1.8 + p * 2.6 * sc, sz - p * 0.5);
      group.add(puff);
    }
  }

  // White surf collar along the rocky basalt coast (open across Kealakekua Bay)
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0faff, depthWrite: false }),
    0.72
  );
  const foamGeo = new THREE.TorusGeometry(43.2, 1.0, 5, 44, Math.PI * 2.0 - 0.72);
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.rotation.x = Math.PI * 0.5;
  foam.rotation.z = 0.36;
  foam.scale.set(1.0, 1.0, 0.14);
  foam.position.y = 0.28;
  group.add(foam);

  // 4. The Great Ancestral Heiau Ahu (Monumental Black-Basalt Temple + White 'Anu'u Oracle Tower + Braziers!)
  const hx = 28.5;
  const hz = 11.2;
  addMaraePlatform(group, trackMat, {
    x: hx,
    y: Math.max(3.2, evalHawaiiPoint(hx, hz).h),
    z: hz,
    rotY: -0.35,
    scale: 1.12,
    courtHex: 0x222124,
    ahuHex: 0x363438,
    withOracleTower: true,
    withBraziers: true,
  });

  // Royal Kealakekua Hawaiian Hale Village & Double-Hulled Canoe Landing
  const huts = [
    [29.5, -0.18, 1.08, true], // Royal Hale Ali'i longhouse
    [27.5, -0.06, 0.98, false],
    [30.2, 0.08, 0.96, false],
    [28.0, 0.19, 0.94, false],
    [25.5, -0.14, 0.9, false],
  ].map(([hr, hang, sc, longHouse]) => {
    const px = hr * Math.cos(hang);
    const pz = hr * Math.sin(hang);
    return {
      x: px,
      y: Math.max(0.8, evalHawaiiPoint(px, pz).h),
      z: pz,
      rotY: -hang,
      scale: sc,
      longHouse,
    };
  });
  addRegionalHuts(group, trackMat, huts, 'hawaiian');

  addTimberPier(group, trackMat, {
    x: 34.0,
    y: 0.7,
    z: 1.2,
    rotY: 0.0,
    length: 6.8,
  });

  addOutriggerCanoe(group, trackMat, {
    x: 33.2,
    y: Math.max(0.45, evalHawaiiPoint(33.2, -3.5).h + 0.15),
    z: -3.5,
    rotY: 0.22,
    scale: 1.08,
  });

  // 5. Lush Crimson-Blossomed 'Ohi'a Lehua Forest on the Unburned Green Slopes & Bay Palms!
  const ohiaPts = [];
  for (const [or, oang] of [
    [22.0, 0.15],
    [20.5, 0.55],
    [23.5, 0.85],
    [19.0, 1.25],
    [22.5, 1.65],
    [21.0, 2.15],
    [23.0, -0.45],
    [19.5, -0.68],
  ]) {
    const ox = or * Math.cos(oang);
    const oz = or * Math.sin(oang);
    const oy = evalHawaiiPoint(ox, oz).h;
    if (oy > 2.5 && oy < 36.0) {
      ohiaPts.push([ox, oy - 0.2, oz, 1.05, oang]);
    }
  }
  addBroadleafTrees(group, trackMat, ohiaPts, {
    canopyHexA: 0x1e5220,
    canopyHexB: 0x316b29,
    blossomHex: 0xe32b22, // Fiery scarlet 'ohi'a lehua blossoms!
  });

  const palmPts = [];
  for (const ang of [-0.28, -0.18, -0.08, 0.04, 0.14, 0.24]) {
    const px = 32.2 * Math.cos(ang);
    const pz = 32.2 * Math.sin(ang);
    const py = evalHawaiiPoint(px, pz).h;
    if (py > 0.5 && py < 8.0) {
      palmPts.push([px, py - 0.15, pz, -ang, 0.98, 0.2]);
    }
  }
  addCoconutGroves(group, trackMat, palmPts);

  return { group, materials, sinkDepthM: 86.0 };
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
