/**
 * Procedural 3D Volcanic & Coral-Atoll Lagoon Terrain & Landmark Builder for Detailed Islands:
 * - Ra'iatea ("Sacred High Island"): Flat-topped sacred Mount Temehani plateau, 7 knife-edge
 *   radial basalt ridges & lush amphitheater valleys, waterfall cascade, crescent coral-sand
 *   beaches, Marae Taputapuatea ceremonial stone platform on the sacred headland, fringing
 *   turquoise lagoon, coconut palm groves & barrier reef with Te Ava Mo'a pass.
 * - Taha'a ("Sheltered Lagoon Isle"): Scalloped clover-leaf coastline with 5 deep calm fjord
 *   bays & rounded peninsulas, gentler Mount Ohiri eroded shield peaks, wide cream-sand bay
 *   beaches, thatched Polynesian hillside & shore fare huts, wooden canoe jetty & lagoon motu islets.
 * - Manuae ("Coral Atoll"): Segmented necklace of 5 sandy coral motu islets separated by shallow
 *   turquoise hoa channels and a navigable Te Ava reef pass, central jade-aqua lagoon with karena
 *   patch reefs and rookery sandbar, outer makatea/papa coral-limestone shelf & breaking surf,
 *   wind-leaning coconut groves & pandanus/naupaka littoral scrub, and a pearl-diving lagoon village
 *   with a grand fare pote'e, woven fare huts, coral marae, timber pier, and outrigger va'a canoes.
 */

import * as THREE from 'three';
import { createAct1RemainIslandAssembly } from './IslandAct1RemainBuilder.js';
import { createAct2IslandAssembly } from './IslandAct2Builder.js';
import { createAct3IslandAssembly } from './IslandAct3Builder.js';

function clamp01(v) {
  return Math.max(0.0, Math.min(1.0, v));
}

function smoothstep(edge0, edge1, x) {
  if (Math.abs(edge1 - edge0) < 1e-6) return x >= edge1 ? 1.0 : 0.0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
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

// Palette constants in linear-ish sRGB [0..1] for vertex coloring
const COL_DEEP_REEF = [0.07, 0.34, 0.44];
const COL_LAGOON_AQUA = [0.16, 0.78, 0.72];
const COL_SHALLO_SAND = [0.68, 0.84, 0.74];
const COL_BEACH_GOLD = [0.89, 0.81, 0.62];
const COL_BEACH_CREAM = [0.93, 0.87, 0.72];
const COL_SHORE_BASALT = [0.22, 0.21, 0.2];
const COL_PALM_LOWLAND = [0.24, 0.49, 0.21];
const COL_VALLEY_JUNGLE = [0.13, 0.34, 0.17];
const COL_RIDGE_FERN = [0.35, 0.47, 0.21];
const COL_CLIFF_BASALT = [0.29, 0.27, 0.25];
const COL_PLATEAU_MOSS = [0.27, 0.39, 0.22];

/**
 * Evaluates Ra'iatea height & shoreline profile at world (x, z).
 * Features elongated N-S volcanic massif, flat-topped Mount Temehani plateau,
 * 7 sharp radial ridge spurs, eastern sacred Marae cape, and crescent sand coves.
 */
function evalRaiateaPoint(x, z) {
  // Slightly elongated island footprint along Z with sacred cape jutting at theta ~ -0.35
  const sx = x * 1.08;
  const sz = z * 0.92;
  const r = Math.hypot(sx, sz);
  const theta = Math.atan2(sz, sx);

  const capeBump = 5.5 * Math.exp(-Math.pow(Math.atan2(Math.sin(theta + 0.35), Math.cos(theta + 0.35)) / 0.38, 2.0));
  const coveWave =
    2.8 * Math.cos(3.0 * theta - 0.6) +
    2.1 * Math.sin(5.0 * theta + 1.1) +
    1.1 * Math.cos(8.0 * theta);
  const coastR = 39.5 + capeBump + coveWave;

  const u = r / coastR; // < 1.0 = land, > 1.0 = lagoon floor
  if (u >= 1.0) {
    const lagoonDepth = -3.6 * smoothstep(1.0, 1.38, u);
    return { h: lagoonDepth, u, ridgeFactor: 0.0, isBeachCove: false, isPlateau: false };
  }

  // Coastal apron transitioning into steep volcanic massif
  const inland = 1.0 - u;
  const baseDome = 58.0 * Math.pow(smoothstep(0.04, 0.88, inland), 1.32);

  // 7 dramatic eroded radial basalt ridges & deep lush valleys
  const twistTheta = theta + 0.18 * Math.sin(2.0 * theta) + 0.12 * inland;
  const ridgeRaw = 0.5 + 0.5 * Math.cos(7.0 * twistTheta - 0.4);
  const ridgeSharp = Math.pow(ridgeRaw, 1.85);
  const ridgeEnv = smoothstep(0.08, 0.36, inland) * smoothstep(0.95, 0.52, inland);
  const ridgeRelief = (ridgeSharp - 0.32) * 18.5 * ridgeEnv;

  // Secondary peak spur on the aft/south flank
  const southPeakDist = Math.hypot(sx + 6.0, sz - 12.5);
  const southSpur = 14.5 * Math.exp(-Math.pow(southPeakDist / 12.0, 2.0));

  let h = Math.max(0.0, baseDome + ridgeRelief + southSpur);

  // Iconic flat-topped sacred Mount Temehani plateau truncation above 52m with subtle rim
  let isPlateau = false;
  if (h > 50.5) {
    const over = h - 50.5;
    h = 50.5 + Math.min(5.2, over * 0.24);
    // Subtle plateau rim lip
    const centerDist = Math.hypot(sx - 1.5, sz + 2.0);
    h += 1.4 * Math.exp(-Math.pow((centerDist - 6.8) / 2.4, 2.0));
    isPlateau = true;
  }

  // Flatten sacred Marae Taputapuatea coastal terrace around theta ~ -0.35 near shore
  const capeAngDiff = Math.abs(Math.atan2(Math.sin(theta + 0.35), Math.cos(theta + 0.35)));
  if (capeAngDiff < 0.28 && u > 0.72 && u < 0.98) {
    const terraceBlend = (1.0 - capeAngDiff / 0.28) * smoothstep(0.72, 0.82, u) * smoothstep(0.99, 0.92, u);
    h = lerp(h, 2.4, terraceBlend * 0.82);
  }

  // Crescent beaches form inside the concave coves (where coveWave < 0.4)
  const isBeachCove = coveWave < 0.65 && capeAngDiff > 0.24;
  if (isBeachCove && u > 0.84) {
    // Gentle sandy beach slope near water
    const beachT = smoothstep(0.84, 1.0, u);
    h = lerp(h, 1.6 * (1.0 - beachT), 0.65);
  }

  return {
    h,
    u,
    ridgeFactor: ridgeSharp * ridgeEnv,
    isBeachCove,
    isPlateau,
  };
}

/**
 * Evaluates Taha'a height & shoreline profile at world (x, z).
 * Features clover-leaf coastline with 5 deep calm fjord bays, wide cream-sand beaches,
 * and gentler eroded Mount Ohiri twin-saddle volcanic hills.
 */
function evalTahaaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Signature 5-lobed flower/clover-leaf shoreline with deep indented bays
  const bayLobe = Math.cos(5.0 * theta + 0.55);
  const subHarmonic = 0.35 * Math.sin(3.0 * theta - 0.8) + 0.2 * Math.cos(8.0 * theta);
  const coastR = 33.5 + 8.2 * bayLobe + 3.2 * subHarmonic;

  const u = r / coastR;
  if (u >= 1.0) {
    const lagoonDepth = -3.0 * smoothstep(1.0, 1.42, u);
    return { h: lagoonDepth, u, ridgeFactor: 0.0, isBeachCove: true, isPlateau: false };
  }

  const inland = 1.0 - u;
  // Lower, rounder volcanic shield dome (~43m summit vs Ra'iatea's ~57m plateau)
  const dome = 40.5 * Math.pow(smoothstep(0.05, 0.92, inland), 1.48);

  // 5 soft rolling peninsula ridges aligned with the 5 coastal lobes
  const lobeRidge = Math.pow(0.5 + 0.5 * Math.cos(5.0 * theta + 0.55), 1.35);
  const ridgeEnv = smoothstep(0.06, 0.34, inland) * smoothstep(0.95, 0.45, inland);
  const ridgeRelief = (lobeRidge - 0.28) * 11.5 * ridgeEnv;

  // Offset twin-hill caldera saddle (Mount Ohiri & Mount Puurauti)
  const ohiri = 6.2 * Math.exp(-Math.pow(Math.hypot(x - 4.2, z + 3.0) / 9.5, 2.0));
  const puurauti = 4.8 * Math.exp(-Math.pow(Math.hypot(x + 7.5, z - 5.5) / 8.5, 2.0));

  let h = Math.max(0.0, dome + ridgeRelief + ohiri + puurauti);

  // Wide, tranquil cream-sand beaches wrapping deep inside all 5 sheltered bays
  const isBeachCove = bayLobe < 0.38;
  if (isBeachCove && u > 0.78) {
    const beachT = smoothstep(0.78, 1.0, u);
    h = lerp(h, 1.4 * (1.0 - beachT), 0.72);
  }

  return {
    h,
    u,
    ridgeFactor: lobeRidge * ridgeEnv,
    isBeachCove,
    isPlateau: false,
  };
}

/**
 * Generates a polar heightfield BufferGeometry with smooth normals and vertex biome colors.
 */
function createSculptedIslandTerrainGeometry(evalFn, maxRadius = 56.0, beachColor = COL_BEACH_GOLD) {
  const nRings = 52;
  const nSegs = 76;

  const positions = [];
  const colors = [];
  const indices = [];
  const grid = [];

  for (let i = 0; i <= nRings; i += 1) {
    // Concentrate rings slightly near coastline (r ~ 24..46m) for crisp beaches & ridges
    const t = i / nRings;
    const r = Math.max(0.04, maxRadius * (0.82 * t + 0.18 * t * t));
    const row = [];

    for (let j = 0; j < nSegs; j += 1) {
      const theta = (j / nSegs) * Math.PI * 2.0;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const sample = evalFn(x, z);
      // Estimate local gradient magnitude for cliff/rock coloring
      const eps = 0.85;
      const hx = evalFn(x + eps, z).h - sample.h;
      const hz = evalFn(x, z + eps).h - sample.h;
      const slope = Math.hypot(hx, hz) / eps;

      let rgb;
      if (sample.h <= 0.08) {
        const depthT = clamp01(-sample.h / 2.8);
        rgb = mixRgb(COL_SHALLO_SAND, mixRgb(COL_LAGOON_AQUA, COL_DEEP_REEF, depthT), smoothstep(0.0, 0.35, depthT));
      } else if (sample.h < 2.65 && sample.isBeachCove && slope < 0.72) {
        const sandFade = smoothstep(1.3, 2.65, sample.h);
        rgb = mixRgb(beachColor, COL_PALM_LOWLAND, sandFade);
      } else if (sample.h < 3.0 && !sample.isBeachCove) {
        const rockFade = smoothstep(0.8, 3.0, sample.h);
        rgb = mixRgb(COL_SHORE_BASALT, COL_PALM_LOWLAND, rockFade);
      } else {
        // Inland lush vegetation + sunlit fern ridges + steep dark basalt cliffs
        const altT = clamp01((sample.h - 2.5) / 46.0);
        rgb = mixRgb(COL_PALM_LOWLAND, COL_VALLEY_JUNGLE, smoothstep(0.0, 0.55, altT));

        const ridgeSun = clamp01(sample.ridgeFactor * 1.25);
        rgb = mixRgb(rgb, COL_RIDGE_FERN, ridgeSun * 0.72);

        const cliffT = smoothstep(0.95, 1.85, slope);
        rgb = mixRgb(rgb, COL_CLIFF_BASALT, cliffT * 0.82);

        if (sample.isPlateau) {
          rgb = mixRgb(rgb, COL_PLATEAU_MOSS, 0.55);
        }
      }

      const idx = positions.length / 3;
      positions.push(x, sample.h, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
      row.push(idx);
    }
    grid.push(row);
  }

  for (let i = 0; i < nRings; i += 1) {
    for (let j = 0; j < nSegs; j += 1) {
      const jNext = (j + 1) % nSegs;
      const v00 = grid[i][j];
      const v01 = grid[i][jNext];
      const v10 = grid[i + 1][j];
      const v11 = grid[i + 1][jNext];
      // T_theta x T_r => +Y upward normal
      indices.push(v00, v01, v11, v00, v11, v10);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to add miniature coastal coconut palms at (x, y, z) onto a parent group.
 */
function addCoconutPalmCluster(group, trunkMat, frondMat, points) {
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 3.6, 6);
  trunkGeo.translate(0, 1.8, 0);
  const frondGeo = new THREE.ConeGeometry(1.55, 0.95, 6);

  for (let i = 0; i < points.length; i += 1) {
    const [px, py, pz, leanAz = 0.0, scale = 1.0] = points[i];
    const palm = new THREE.Group();
    palm.position.set(px, py, pz);
    palm.scale.setScalar(scale);
    palm.rotation.y = leanAz;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.rotation.z = 0.16;
    palm.add(trunk);

    const crown = new THREE.Mesh(frondGeo, frondMat);
    crown.position.set(-0.28, 3.55, 0);
    crown.scale.set(1.2, 0.55, 1.2);
    palm.add(crown);

    group.add(palm);
  }
}

/**
 * Helper to create a curved barrier-reef arc (leaving reef passes open).
 */
function addBarrierReefArc(group, reefMat, foamMat, radius, startRad, endRad, segs = 28) {
  const arcSpan = endRad - startRad;
  const reefGeo = new THREE.TorusGeometry(radius, 2.3, 6, segs, arcSpan);
  const reef = new THREE.Mesh(reefGeo, reefMat);
  reef.rotation.x = Math.PI / 2;
  reef.rotation.z = startRad;
  reef.scale.set(1.0, 1.0, 0.28);
  reef.position.y = 0.22;
  group.add(reef);

  const foamGeo = new THREE.TorusGeometry(radius + 1.4, 1.15, 5, segs, arcSpan);
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.rotation.x = Math.PI / 2;
  foam.rotation.z = startRad;
  foam.scale.set(1.0, 1.0, 0.14);
  foam.position.y = 0.28;
  group.add(foam);
}

function angDiffAbs(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function motuArcMask(theta, center, halfSpan, feather = 0.085) {
  const d = angDiffAbs(theta, center);
  return 1.0 - smoothstep(halfSpan - feather, halfSpan + feather, d);
}

const MANUAE_KARENA_HEADS = [
  [9.5, 4.5, 3.8],
  [-13.2, 6.8, 4.2],
  [5.2, -14.2, 3.6],
  [15.4, -7.2, 3.4],
  [-2.2, 14.2, 3.9],
  [-14.8, -10.6, 3.5],
];

/**
 * Evaluates Manuae Coral Atoll topography & lagoon bathymetry at local (x, z):
 * - 5 segmented sandy coral motu islets separated by shallow turquoise hoa channels
 * - Deep navigable Te Ava reef pass at theta = 0 leading into the central lagoon
 * - Multi-depth jade-turquoise lagoon with 6 karena coral patch reefs & central rookery sandbar
 * - Asymmetric motu sand ridges (gentle lagoon beach, storm-built makatea crest, outer papa reef shelf)
 */
function evalManuaePoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Slightly oval organic reef-ring spine
  const ringR =
    37.6 + 2.0 * Math.cos(2.0 * theta + 0.5) + 1.2 * Math.sin(3.0 * theta - 0.7);

  // 5 distinct motu arcs around the coral ring (leaving hoa channels & Te Ava pass at theta = 0)
  const m1 = motuArcMask(theta, -1.24, 0.96, 0.09); // Main broad village crescent motu
  const m2 = motuArcMask(theta, -2.68, 0.36, 0.075); // Far rookery motu
  const m3 = motuArcMask(theta, 2.64, 0.38, 0.075); // Leeward coconut motu
  const m4 = motuArcMask(theta, 1.54, 0.46, 0.08); // Pandanus motu
  const m5 = motuArcMask(theta, 0.58, 0.32, 0.075); // Port pass-shoulder motu
  const motuMask = clamp01(m1 + m2 + m3 + m4 + m5);

  const passChannel = motuArcMask(theta, 0.0, 0.17, 0.07);

  const innerW =
    lerp(4.3, 7.8, m1) * (0.88 + 0.12 * Math.sin(7.0 * theta - 0.4));
  const outerW =
    lerp(4.3, 5.7, m1) * (0.9 + 0.1 * Math.cos(6.0 * theta + 0.3));
  const innerToeR = ringR - innerW;
  const outerToeR = ringR + outerW;
  const reefEdgeR = outerToeR + 4.3 + 0.85 * Math.sin(5.0 * theta);

  // 1. Central Lagoon Basin (kept gently above 0.14m so global opaque ocean doesn't swallow lagoon colors,
  //    except inside the deep sapphire Te Ava pass inlet)
  if (r < innerToeR) {
    const lu = clamp01(r / Math.max(1.0, innerToeR));
    let h = lerp(0.15, 0.23, smoothstep(0.58, 1.0, lu));

    // Curved bleached-white inner rookery sandbank spit
    const rx = (x + 5.8) * 0.78 + (z + 6.4) * 0.62;
    const rz = -(x + 5.8) * 0.62 + (z + 6.4) * 0.78;
    const sandbarDist = Math.hypot(rx * 0.62, rz * 1.38);
    const sandbarLift = 0.78 * Math.exp(-Math.pow(sandbarDist / 4.2, 2.0));
    h += sandbarLift;

    // 6 submerged-looking karena coral patch-reef mounds
    let coralPatch = 0.0;
    for (let k = 0; k < MANUAE_KARENA_HEADS.length; k += 1) {
      const [kx, kz, kr] = MANUAE_KARENA_HEADS[k];
      const kd = Math.hypot(x - kx, z - kz);
      const patch = Math.exp(-Math.pow(kd / kr, 2.4));
      coralPatch = Math.max(coralPatch, patch);
    }
    h += 0.14 * coralPatch;

    // Deep sapphire navigable Te Ava pass inlet tongue shoaling into central lagoon
    const passInlet = passChannel * smoothstep(18.5, 29.5, r);
    h = lerp(h, -2.35, passInlet);

    return {
      h,
      zone: sandbarLift > 0.16 ? 'sandbar' : passInlet > 0.35 ? 'deep_sea' : 'lagoon',
      lagoonRadT: lu,
      coralPatch,
      motuMask: 0.0,
      villageClearing: 0.0,
    };
  }

  // 2. Coral Ring: Motu Islets, Shallow Hoa Channels, and Outer Papa Reef Shelf
  if (r <= reefEdgeR) {
    const rimBump = 0.15 * Math.exp(-Math.pow((r - (reefEdgeR - 1.3)) / 1.35, 2.0));
    const reefFlatH =
      0.21 + 0.03 * Math.sin(r * 0.8 + theta * 9.0) + rimBump;

    let motuH = 0.0;
    let villageClearing = 0.0;
    let isInnerBeach = false;

    if (motuMask > 0.001 && r < outerToeR) {
      let profile = 0.0;
      let tIn = 1.0;
      if (r <= ringR) {
        tIn = clamp01((r - innerToeR) / Math.max(0.5, innerW));
        profile = Math.pow(smoothstep(0.0, 1.0, tIn), 1.32);
        isInnerBeach = tIn < 0.44;
      } else {
        const tOut = clamp01(1.0 - (r - ringR) / Math.max(0.5, outerW));
        profile = Math.pow(smoothstep(0.0, 1.0, tOut), 0.76);
      }

      const peakH =
        lerp(3.35, 4.35, m1) +
        0.32 * Math.sin(9.0 * theta) +
        0.2 * Math.cos(15.0 * theta);
      motuH = peakH * profile * motuMask;

      // Swept level coral-sand village clearing along inner shore of Motu 1
      const vilArc = motuArcMask(theta, -0.96, 0.56, 0.1);
      const vilBand = smoothstep(0.22, 0.42, tIn) * smoothstep(0.95, 0.72, tIn);
      villageClearing = vilArc * vilBand * m1;
      if (villageClearing > 0.01) {
        motuH = lerp(motuH, 1.62, villageClearing * 0.82);
      }
    }

    let h = Math.max(reefFlatH, motuH);
    // Carve navigable Te Ava reef pass cleanly down to deep sapphire ocean water
    h = lerp(h, -2.45, passChannel);

    let zone = 'papa_reef';
    if (passChannel > 0.4) {
      zone = 'deep_sea';
    } else if (motuH > reefFlatH + 0.04) {
      zone = isInnerBeach ? 'inner_beach' : 'motu';
    } else if (r < outerToeR - 0.6 && motuMask < 0.25) {
      zone = 'hoa_channel';
    }

    return {
      h,
      zone,
      lagoonRadT: 1.0,
      coralPatch: 0.0,
      motuMask,
      villageClearing,
    };
  }

  // 3. Steep Outer Fore-Reef Ocean Drop-Off
  const dropT = smoothstep(reefEdgeR, 55.8, r);
  const startH = lerp(0.28, -2.45, passChannel);
  const h = lerp(startH, -4.1, dropT);
  return {
    h,
    zone: h < 0.05 ? 'deep_sea' : 'papa_reef',
    lagoonRadT: 1.0,
    coralPatch: 0.0,
    motuMask: 0.0,
    villageClearing: 0.0,
  };
}

/**
 * Generates a high-resolution polar atoll BufferGeometry with coral/lagoon/motu vertex biomes.
 */
function createSculptedAtollTerrainGeometry(evalFn, maxRadius = 56.0) {
  const nRings = 64;
  const nSegs = 108;

  const colDeepSea = [0.05, 0.27, 0.44];
  const colLagoonDeep = [0.08, 0.57, 0.66];
  const colLagoonJade = [0.16, 0.82, 0.75];
  const colLagoonShoal = [0.68, 0.89, 0.81];
  const colKarenaCoral = [0.55, 0.43, 0.28];
  const colHoaWash = [0.54, 0.86, 0.79];
  const colCoralSand = [0.95, 0.9, 0.79];
  const colVillageSand = [0.91, 0.85, 0.71];
  const colPapaLimestone = [0.67, 0.6, 0.53];
  const colAlgalCrest = [0.52, 0.45, 0.42];
  const colAtollPalm = [0.2, 0.48, 0.19];
  const colAtollScrub = [0.33, 0.53, 0.22];
  const colCanopyDeep = [0.13, 0.35, 0.15];

  const positions = [];
  const colors = [];
  const indices = [];
  const grid = [];

  for (let i = 0; i <= nRings; i += 1) {
    const t = i / nRings;
    const r = Math.max(0.05, maxRadius * t);
    const row = [];

    for (let j = 0; j < nSegs; j += 1) {
      const theta = (j / nSegs) * Math.PI * 2.0;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const s = evalFn(x, z);

      let rgb;
      if (s.zone === 'deep_sea' || s.h < 0.06) {
        const dt = clamp01(-s.h / 2.6);
        rgb = mixRgb(colLagoonShoal, mixRgb(colLagoonDeep, colDeepSea, dt), smoothstep(0.0, 0.45, dt));
      } else if (s.zone === 'lagoon') {
        rgb = mixRgb(colLagoonDeep, colLagoonJade, smoothstep(0.15, 0.78, s.lagoonRadT));
        rgb = mixRgb(rgb, colLagoonShoal, smoothstep(0.78, 1.0, s.lagoonRadT) * 0.72);
        if (s.coralPatch > 0.08) {
          const halo = smoothstep(0.08, 0.42, s.coralPatch);
          const core = smoothstep(0.42, 0.82, s.coralPatch);
          rgb = mixRgb(rgb, colLagoonShoal, halo * 0.55);
          rgb = mixRgb(rgb, colKarenaCoral, core * 0.85);
        }
      } else if (s.zone === 'sandbar') {
        rgb = mixRgb(colLagoonShoal, colCoralSand, smoothstep(0.24, 0.52, s.h));
      } else if (s.zone === 'hoa_channel') {
        rgb = mixRgb(colHoaWash, colCoralSand, smoothstep(0.22, 0.34, s.h) * 0.45);
      } else if (s.zone === 'papa_reef') {
        const mottle = 0.5 + 0.5 * Math.sin(x * 0.65 + z * 0.55);
        rgb = mixRgb(colPapaLimestone, colAlgalCrest, mottle * 0.55);
      } else {
        // Motu beach, swept village clearing, or lush palm/pandanus ridge
        const vegT = smoothstep(1.35, 2.35, s.h);
        const lushVar = 0.5 + 0.5 * Math.cos(theta * 11.0 + r * 0.45);
        const vegRgb = mixRgb(
          mixRgb(colAtollPalm, colAtollScrub, lushVar * 0.68),
          colCanopyDeep,
          smoothstep(2.6, 4.2, s.h) * 0.5
        );
        rgb = mixRgb(colCoralSand, vegRgb, vegT);
        if (s.villageClearing > 0.05) {
          rgb = mixRgb(rgb, colVillageSand, clamp01(s.villageClearing * 0.88));
        }
      }

      const idx = positions.length / 3;
      positions.push(x, s.h, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
      row.push(idx);
    }
    grid.push(row);
  }

  for (let i = 0; i < nRings; i += 1) {
    for (let j = 0; j < nSegs; j += 1) {
      const jNext = (j + 1) % nSegs;
      const v00 = grid[i][j];
      const v01 = grid[i][jNext];
      const v10 = grid[i + 1][j];
      const v11 = grid[i + 1][jNext];
      indices.push(v00, v01, v11, v00, v11, v10);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Adds multi-frond wind-curved atoll coconut palms with drooping star-tier canopies & coconuts.
 */
function addAtollCoconutGroves(group, trunkMat, frondMatDark, frondMatSun, nutMat, points) {
  const lowerSegGeo = new THREE.CylinderGeometry(0.21, 0.33, 2.0, 6);
  lowerSegGeo.translate(0, 1.0, 0);
  const upperSegGeo = new THREE.CylinderGeometry(0.14, 0.21, 2.05, 6);
  upperSegGeo.translate(0, 1.02, 0);
  const crownLowerGeo = new THREE.ConeGeometry(1.75, 0.82, 7);
  const crownUpperGeo = new THREE.ConeGeometry(1.38, 0.72, 7);
  const nutClusterGeo = new THREE.DodecahedronGeometry(0.28, 0);

  for (let i = 0; i < points.length; i += 1) {
    const [px, py, pz, leanAz = 0.0, scale = 1.0, leanAmt = 0.22] = points[i];
    const palm = new THREE.Group();
    palm.position.set(px, py, pz);
    palm.scale.setScalar(scale);
    palm.rotation.y = leanAz;

    const lowerTrunk = new THREE.Mesh(lowerSegGeo, trunkMat);
    lowerTrunk.rotation.z = leanAmt * 0.65;
    palm.add(lowerTrunk);

    const upperPivot = new THREE.Group();
    upperPivot.position.set(-Math.sin(leanAmt * 0.65) * 1.95, Math.cos(leanAmt * 0.65) * 1.95, 0);
    upperPivot.rotation.z = leanAmt * 1.15;
    const upperTrunk = new THREE.Mesh(upperSegGeo, trunkMat);
    upperPivot.add(upperTrunk);

    const crownHub = new THREE.Group();
    crownHub.position.set(0, 2.02, 0);
    crownHub.rotation.z = -leanAmt * 0.85;

    const nuts = new THREE.Mesh(nutClusterGeo, nutMat);
    nuts.position.y = -0.12;
    crownHub.add(nuts);

    const cLow = new THREE.Mesh(crownLowerGeo, i % 2 === 0 ? frondMatDark : frondMatSun);
    cLow.scale.set(1.25, 0.48, 1.25);
    crownHub.add(cLow);

    const cHigh = new THREE.Mesh(crownUpperGeo, i % 2 === 0 ? frondMatSun : frondMatDark);
    cHigh.position.y = 0.28;
    cHigh.rotation.y = 0.45;
    cHigh.scale.set(1.15, 0.52, 1.15);
    crownHub.add(cHigh);

    upperPivot.add(crownHub);
    palm.add(upperPivot);
    group.add(palm);
  }
}

/**
 * Adds low littoral naupaka, mikimiki & pandanus scrub thickets along coral motu ridges.
 */
function addCoastalScrubCluster(group, scrubMatA, scrubMatB, points) {
  const bushGeo = new THREE.DodecahedronGeometry(1.05, 1);
  for (let i = 0; i < points.length; i += 1) {
    const [bx, by, bz, sx = 1.2, sy = 0.65, sz = 1.1, rotY = 0.0] = points[i];
    const bush = new THREE.Mesh(bushGeo, i % 2 === 0 ? scrubMatA : scrubMatB);
    bush.position.set(bx, by + sy * 0.42, bz);
    bush.scale.set(sx, sy, sz);
    bush.rotation.y = rotY;
    group.add(bush);
  }
}

/**
 * Builds a traditional single-outrigger Polynesian lagoon canoe (va'a) at (x, y, z).
 */
function addLagoonOutriggerCanoe(group, hullMat, trimMat, x, y, z, yawRad = 0.0, scale = 1.0) {
  const vaa = new THREE.Group();
  vaa.position.set(x, y, z);
  vaa.rotation.y = yawRad;
  vaa.scale.setScalar(scale);

  const hullGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.6, 8);
  hullGeo.rotateX(Math.PI * 0.5);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1.0, 0.72, 1.0);
  vaa.add(hull);

  const prowGeo = new THREE.ConeGeometry(0.22, 0.75, 6);
  const foreProw = new THREE.Mesh(prowGeo, hullMat);
  foreProw.rotation.x = -Math.PI * 0.5;
  foreProw.position.set(0, 0.05, -2.05);
  vaa.add(foreProw);

  const aftProw = new THREE.Mesh(prowGeo, hullMat);
  aftProw.rotation.x = Math.PI * 0.5;
  aftProw.position.set(0, 0.08, 2.05);
  vaa.add(aftProw);

  const amaGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.7, 6);
  amaGeo.rotateX(Math.PI * 0.5);
  const ama = new THREE.Mesh(amaGeo, trimMat);
  ama.position.set(-1.05, -0.02, 0.0);
  vaa.add(ama);

  const iakoGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.12, 5);
  iakoGeo.rotateZ(Math.PI * 0.5);
  for (const iz of [-0.75, 0.75]) {
    const iako = new THREE.Mesh(iakoGeo, trimMat);
    iako.position.set(-0.52, 0.14, iz);
    vaa.add(iako);
  }

  group.add(vaa);
}

/**
 * Builds a complete sculpted 3D island assembly for all 16 campaign islands across Acts I-III,
 * returning { group, materials, sinkDepthM } so WorldCuesRenderer can fade & rise it seamlessly.
 */
export function createDetailedIslandAssembly(islandId) {
  const modularAssembly =
    createAct1RemainIslandAssembly(islandId) ||
    createAct2IslandAssembly(islandId) ||
    createAct3IslandAssembly(islandId);
  if (modularAssembly) {
    return modularAssembly;
  }

  const group = new THREE.Group();
  const materials = [];
  const trackMat = (m) => {
    materials.push(m);
    return m;
  };

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.03,
      transparent: true,
      opacity: 1.0,
    })
  );

  const lagoonSurfaceMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x24d6c2,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    })
  );
  lagoonSurfaceMat.userData.baseOpacity = 0.52;

  const reefSandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe3d3a8,
      roughness: 0.88,
      transparent: true,
      opacity: 1.0,
    })
  );

  const surfFoamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf2fbff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  surfFoamMat.userData.baseOpacity = 0.72;

  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x765334,
      roughness: 0.85,
      transparent: true,
      opacity: 1.0,
    })
  );

  const palmFrondMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b7a2e,
      roughness: 0.78,
      transparent: true,
      opacity: 1.0,
    })
  );

  if (islandId === 'raiatea') {
    // 1. Sculpted Ra'iatea Massif (Mount Temehani plateau, 7 basalt ridges, valleys & golden coves)
    const terrainGeo = createSculptedIslandTerrainGeometry(
      evalRaiateaPoint,
      56.0,
      COL_BEACH_GOLD
    );
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 2. Translucent Turquoise Fringing Lagoon Ring + Barrier Reef with Sacred Te Ava Mo'a Pass
    const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(55.5, 48), lagoonSurfaceMat);
    lagoonDisc.rotation.x = -Math.PI / 2;
    lagoonDisc.position.y = 0.16;
    group.add(lagoonDisc);

    // Leave open pass around theta = -0.35 rad facing Marae Taputapuatea!
    addBarrierReefArc(group, reefSandMat, surfFoamMat, 55.0, -0.1, Math.PI * 2.0 - 0.62, 36);

    // Two sandy reef motu islets flanking the sacred reef pass
    const motuGeo = new THREE.CylinderGeometry(3.4, 4.8, 1.1, 10);
    for (const [mx, mz, sx, sz] of [
      [50.5, -9.5, 1.2, 0.75],
      [44.5, -29.5, 0.95, 1.15],
    ]) {
      const motu = new THREE.Mesh(motuGeo, reefSandMat);
      motu.position.set(mx, 0.35, mz);
      motu.scale.set(sx, 1.0, sz);
      group.add(motu);
    }

    // 3. Sacred Marae Taputapuatea Stone Courtyard & Stepped Ahu on the Eastern Headland
    const basaltStoneMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x3d3a37,
        roughness: 0.92,
        transparent: true,
        opacity: 1.0,
      })
    );
    const coralSlabMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xcfc4ab,
        roughness: 0.85,
        transparent: true,
        opacity: 1.0,
      })
    );

    const maraeGroup = new THREE.Group();
    const capeTheta = -0.35;
    const capeX = 33.5 * Math.cos(capeTheta);
    const capeZ = 33.5 * Math.sin(capeTheta);
    const capeY = evalRaiateaPoint(capeX, capeZ).h;
    maraeGroup.position.set(capeX, capeY, capeZ);
    maraeGroup.rotation.y = -capeTheta;

    const pavement = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 9.6), basaltStoneMat);
    pavement.position.y = 0.25;
    maraeGroup.add(pavement);

    const ahuAltar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 7.6), coralSlabMat);
    ahuAltar.position.set(2.1, 1.2, 0.0);
    maraeGroup.add(ahuAltar);

    for (let s = -2; s <= 2; s += 1) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.3, 0.55), basaltStoneMat);
      upright.position.set(-1.8, 1.4, s * 1.75);
      maraeGroup.add(upright);
    }
    group.add(maraeGroup);

    // 4. Highland Waterfall Cascade below Mount Temehani Plateau
    const waterfallMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xdcf6ff,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    waterfallMat.userData.baseOpacity = 0.82;
    const fallRibbon = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 22.0), waterfallMat);
    fallRibbon.position.set(-11.8, 31.5, -10.5);
    fallRibbon.rotation.y = -2.35;
    fallRibbon.rotation.x = -0.44;
    group.add(fallRibbon);

    // 5. Coastal & Motu Coconut Palm Groves
    const palmSites = [];
    for (const ang of [0.42, 0.55, 1.55, 1.72, 2.68, 2.84, -1.55, -1.38, -2.45]) {
      const pr = 34.0;
      const px = pr * Math.cos(ang);
      const pz = pr * Math.sin(ang);
      const py = evalRaiateaPoint(px, pz).h;
      if (py > 0.6 && py < 9.0) {
        palmSites.push([px, py - 0.2, pz, -ang, 0.92 + ( palmSites.length % 3 ) * 0.14]);
      }
    }
    palmSites.push([50.5, 0.85, -9.5, 0.4, 0.85]);
    palmSites.push([44.5, 0.85, -29.5, -0.8, 0.82]);
    addCoconutPalmCluster(group, trunkMat, palmFrondMat, palmSites);

    return { group, materials, sinkDepthM: 58.0 };
  }

  if (islandId === 'manuae') {
    // 1. Sculpted Coral Atoll Ring, Segmented Motu Necklace, Hoa Channels & Central Lagoon Floor
    const atollGeo = createSculptedAtollTerrainGeometry(evalManuaePoint, 56.0);
    const atollMesh = new THREE.Mesh(atollGeo, terrainMat);
    atollMesh.receiveShadow = true;
    group.add(atollMesh);

    // 2. Translucent Jade-Turquoise Inner Lagoon Surface Shimmer (sandbar & beaches rise cleanly above it)
    const atollLagoonMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x2ae3cc,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    atollLagoonMat.userData.baseOpacity = 0.34;
    const innerLagoonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(29.8, 56),
      atollLagoonMat
    );
    innerLagoonDisc.rotation.x = -Math.PI * 0.5;
    innerLagoonDisc.position.y = 0.265;
    group.add(innerLagoonDisc);

    // 3. Outer Breaking Surf Rim with Open Navigable Te Ava Reef Pass around theta = 0
    addBarrierReefArc(
      group,
      reefSandMat,
      surfFoamMat,
      48.6,
      0.25,
      Math.PI * 2.0 - 0.25,
      48
    );

    // Hooked pass-shoulder surf foam ribbons flanking the Te Ava entrance jaws
    const jawFoamGeo = new THREE.BoxGeometry(5.6, 0.12, 1.35);
    for (const [ang, tilt] of [
      [-0.23, 0.42],
      [0.23, -0.42],
    ]) {
      const jf = new THREE.Mesh(jawFoamGeo, surfFoamMat);
      jf.position.set(44.5 * Math.cos(ang), 0.29, 44.5 * Math.sin(ang));
      jf.rotation.y = -ang + tilt;
      group.add(jf);
    }

    // 4. Shared Atoll Architectural, Coral-Stone & Foliage Materials
    const thatchGoldMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc89d5c,
        roughness: 0.88,
        transparent: true,
        opacity: 1.0,
      })
    );
    const thatchWeatherMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xb08850,
        roughness: 0.9,
        transparent: true,
        opacity: 1.0,
      })
    );
    const aitoTimberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x684528,
        roughness: 0.85,
        transparent: true,
        opacity: 1.0,
      })
    );
    const wovenReedMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9c784c,
        roughness: 0.86,
        transparent: true,
        opacity: 1.0,
      })
    );
    const coralStoneMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe4dcc8,
        roughness: 0.88,
        transparent: true,
        opacity: 1.0,
      })
    );
    const weatheredCoralMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xbdb49f,
        roughness: 0.92,
        transparent: true,
        opacity: 1.0,
      })
    );
    const pearlShellMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf0f7fa,
        roughness: 0.28,
        metalness: 0.18,
        transparent: true,
        opacity: 1.0,
      })
    );
    const hearthEmberMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xff7b2e,
        transparent: true,
        opacity: 0.92,
      })
    );
    hearthEmberMat.userData.baseOpacity = 0.92;

    const palmSunMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4e8f34,
        roughness: 0.76,
        transparent: true,
        opacity: 1.0,
      })
    );
    const coconutMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x6d5828,
        roughness: 0.8,
        transparent: true,
        opacity: 1.0,
      })
    );
    const scrubMatA = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2f6827,
        roughness: 0.86,
        transparent: true,
        opacity: 1.0,
      })
    );
    const scrubMatB = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x447c2e,
        roughness: 0.84,
        transparent: true,
        opacity: 1.0,
      })
    );
    const canoeHullMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x8b522c,
        roughness: 0.78,
        transparent: true,
        opacity: 1.0,
      })
    );

    // 5. Twin Stacked White-Coral Pass Marker Cairns (Ti'ahu Ava) on Both Pass Shoulders
    for (const [cTheta, cRad] of [
      [-0.29, 39.2],
      [0.28, 39.0],
    ]) {
      const cx = cRad * Math.cos(cTheta);
      const cz = cRad * Math.sin(cTheta);
      const cy = Math.max(0.32, evalManuaePoint(cx, cz).h);
      const cairn = new THREE.Group();
      cairn.position.set(cx, cy, cz);

      const baseTier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.25, 0.65, 7),
        weatheredCoralMat
      );
      baseTier.position.y = 0.3;
      cairn.add(baseTier);

      const midTier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.92, 0.6, 7),
        coralStoneMat
      );
      midTier.position.y = 0.88;
      cairn.add(midTier);

      const capStone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.46, 0),
        pearlShellMat
      );
      capStone.position.y = 1.42;
      cairn.add(capStone);

      group.add(cairn);
    }

    // 6. Polynesian Atoll Lagoon Village on Motu 1 (Facing the Calm Central Lagoon & Pass)
    // 6a. Grand Communal Fare Pote'e (Oval-ended pandanus meeting house on raised coral curb)
    const poteeTheta = -0.92;
    const poteeR = 34.4;
    const poteeX = poteeR * Math.cos(poteeTheta);
    const poteeZ = poteeR * Math.sin(poteeTheta);
    const poteeY = evalManuaePoint(poteeX, poteeZ).h;

    const potee = new THREE.Group();
    potee.position.set(poteeX, poteeY, poteeZ);
    potee.rotation.y = -poteeTheta;

    const coralPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(4.3, 0.44, 7.6),
      coralStoneMat
    );
    coralPlinth.position.y = 0.2;
    potee.add(coralPlinth);

    const postGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.55, 6);
    for (const pxOff of [-1.65, 1.65]) {
      for (const pzOff of [-2.85, -0.95, 0.95, 2.85]) {
        const post = new THREE.Mesh(postGeo, aitoTimberMat);
        post.position.set(pxOff, 1.15, pzOff);
        potee.add(post);
      }
    }

    const poteeRoofMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 2.65, 2.35, 4),
      thatchGoldMat
    );
    poteeRoofMain.rotation.y = Math.PI * 0.25;
    poteeRoofMain.scale.set(1.02, 1.0, 1.95);
    poteeRoofMain.position.y = 2.95;
    potee.add(poteeRoofMain);

    const ridgePole = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.2, 7.4),
      aitoTimberMat
    );
    ridgePole.position.y = 3.98;
    potee.add(ridgePole);
    group.add(potee);

    // 6b. 5 Woven-Thatch Village Dwellings & Pearl-Diver Sheds along the Coral-Sand Clearing
    const fareDefs = [
      [33.4, -0.5, 0.96, 0.08, true],
      [35.2, -0.68, 1.04, -0.06, false],
      [33.6, -1.16, 1.0, 0.05, true],
      [35.6, -1.33, 0.92, -0.1, false],
      [34.2, -1.52, 0.88, 0.12, true],
    ];
    const farePlinthGeo = new THREE.BoxGeometry(2.85, 0.28, 3.65);
    const fareWallGeo = new THREE.BoxGeometry(2.45, 1.38, 3.25);
    const fareRoofGeo = new THREE.ConeGeometry(2.48, 1.78, 4);

    for (const [fr, fang, fscale, yawJitter, warmRoof] of fareDefs) {
      const fx = fr * Math.cos(fang);
      const fz = fr * Math.sin(fang);
      const fy = evalManuaePoint(fx, fz).h;

      const fare = new THREE.Group();
      fare.position.set(fx, fy, fz);
      fare.rotation.y = -fang + yawJitter;
      fare.scale.setScalar(fscale);

      const plinth = new THREE.Mesh(farePlinthGeo, weatheredCoralMat);
      plinth.position.y = 0.12;
      fare.add(plinth);

      const walls = new THREE.Mesh(fareWallGeo, wovenReedMat);
      walls.position.y = 0.92;
      fare.add(walls);

      const roof = new THREE.Mesh(
        fareRoofGeo,
        warmRoof ? thatchGoldMat : thatchWeatherMat
      );
      roof.position.y = 2.38;
      roof.rotation.y = Math.PI * 0.25;
       roof.scale.set(1.0, 1.0, 1.24);
      fare.add(roof);

      group.add(fare);
    }

    // 6c. Timber Lagoon Pier on Pilings Extending into the Turquoise Shallows
    const pierTheta = -0.78;
    const pierCenterR = 26.8;
    const pier = new THREE.Group();
    pier.position.set(
      pierCenterR * Math.cos(pierTheta),
      0.74,
      pierCenterR * Math.sin(pierTheta)
    );
    pier.rotation.y = -pierTheta;

    const pierDeck = new THREE.Mesh(
      new THREE.BoxGeometry(8.8, 0.2, 1.58),
      aitoTimberMat
    );
    pier.add(pierDeck);

    const pilingGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.1, 6);
    for (const lx of [-3.8, -1.9, 0.0, 1.9, 3.8]) {
      for (const lz of [-0.62, 0.62]) {
        const pile = new THREE.Mesh(pilingGeo, aitoTimberMat);
        pile.position.set(lx, -0.45, lz);
        pier.add(pile);
      }
    }
    group.add(pier);

    // 6d. Two Traditional Lagoon Outrigger Canoes (Va'a): One Moored at Pier, One Beached
    addLagoonOutriggerCanoe(
      group,
      canoeHullMat,
      aitoTimberMat,
      24.4 * Math.cos(pierTheta + 0.07),
      0.32,
      24.4 * Math.sin(pierTheta + 0.07),
      -pierTheta + Math.PI * 0.5,
      1.0
    );
    const beachCanoeTheta = -1.05;
    const beachCanoeR = 30.8;
    const bcx = beachCanoeR * Math.cos(beachCanoeTheta);
    const bcz = beachCanoeR * Math.sin(beachCanoeTheta);
    addLagoonOutriggerCanoe(
      group,
      canoeHullMat,
      aitoTimberMat,
      bcx,
      evalManuaePoint(bcx, bcz).h + 0.16,
      bcz,
      -beachCanoeTheta + 0.18,
      0.94
    );

    // 6e. Pass-Point Coral-Slab Marae (Stepped White-Coral Ahu & Upright Limestone Slabs)
    const maraeTheta = -0.37;
    const maraeR = 36.2;
    const mx = maraeR * Math.cos(maraeTheta);
    const mz = maraeR * Math.sin(maraeTheta);
    const my = evalManuaePoint(mx, mz).h;
    const atollMarae = new THREE.Group();
    atollMarae.position.set(mx, my, mz);
    atollMarae.rotation.y = -maraeTheta;

    const court = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.42, 5.6),
      weatheredCoralMat
    );
    court.position.y = 0.16;
    atollMarae.add(court);

    const coralAhu = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.25, 4.4),
      coralStoneMat
    );
    coralAhu.position.set(1.2, 0.82, 0.0);
    atollMarae.add(coralAhu);

    for (const szOff of [-1.45, 0.0, 1.45]) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 1.75, 0.58),
        coralStoneMat
      );
      slab.position.set(-1.15, 1.05, szOff);
      atollMarae.add(slab);
    }
    group.add(atollMarae);

    // 6f. Pearl-Shell Drying Racks & Glowing Coral-Ring Village Hearth (Ahi)
    for (const rTheta of [-0.61, -0.85]) {
      const rr = 31.8;
      const rx = rr * Math.cos(rTheta);
      const rz = rr * Math.sin(rTheta);
      const ry = evalManuaePoint(rx, rz).h;
      const rack = new THREE.Group();
      rack.position.set(rx, ry, rz);
      rack.rotation.y = -rTheta + 0.25;

      const crossBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5),
        aitoTimberMat
      );
      crossBar.rotation.x = Math.PI * 0.5;
      crossBar.position.y = 1.15;
      rack.add(crossBar);

      for (const zLeg of [-1.05, 1.05]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.06, 1.25, 5),
          aitoTimberMat
        );
        leg.position.set(0, 0.58, zLeg);
        rack.add(leg);
      }
      for (const zShell of [-0.65, 0.0, 0.65]) {
        const shell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8),
          pearlShellMat
        );
        shell.rotation.z = Math.PI * 0.5;
        shell.position.set(0, 0.92, zShell);
        rack.add(shell);
      }
      group.add(rack);
    }

    const hearthTheta = -0.99;
    const hearthR = 32.2;
    const hrx = hearthR * Math.cos(hearthTheta);
    const hrz = hearthR * Math.sin(hearthTheta);
    const hry = evalManuaePoint(hrx, hrz).h;
    const hearth = new THREE.Group();
    hearth.position.set(hrx, hry, hrz);
    const curbRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.16, 6, 12),
      weatheredCoralMat
    );
    curbRing.rotation.x = Math.PI * 0.5;
    curbRing.position.y = 0.12;
    hearth.add(curbRing);
    const embers = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.35, 7),
      hearthEmberMat
    );
    embers.position.y = 0.22;
    hearth.add(embers);
    group.add(hearth);

    // 7. Dense Wind-Leaning Atoll Coconut Groves & Littoral Naupaka/Pandanus Scrub across all 5 Motu
    const palmSites = [];
    const scrubSites = [];

    const motuSampleRings = [
      // Motu 1 (Main Village Crescent: behind huts, flanking village, and pass shoulder)
      [-0.32, 37.8, 1.05, 0.28],
      [-0.43, 38.4, 1.12, 0.22],
      [-0.56, 37.9, 1.08, 0.18],
      [-0.64, 39.2, 0.96, 0.2],
      [-0.76, 38.2, 1.15, 0.17],
      [-0.88, 38.8, 1.1, 0.22],
      [-1.02, 38.4, 1.14, 0.19],
      [-1.12, 31.6, 0.94, 0.32],
      [-1.24, 38.0, 1.08, 0.21],
      [-1.38, 37.6, 1.12, 0.24],
      [-1.46, 32.2, 0.92, 0.3],
      [-1.62, 37.2, 1.06, 0.22],
      [-1.76, 35.8, 1.0, 0.26],
      [-1.9, 36.8, 1.04, 0.2],
      [-2.04, 36.2, 0.95, 0.25],
      // Motu 2 (Far Rookery Islet)
      [-2.44, 36.8, 0.96, 0.24],
      [-2.58, 37.6, 1.06, 0.2],
      [-2.72, 36.4, 1.02, 0.26],
      [-2.88, 37.2, 0.92, 0.22],
      // Motu 3 (Leeward Coconut Islet)
      [2.38, 36.8, 0.98, 0.24],
      [2.54, 37.8, 1.1, 0.2],
      [2.68, 36.5, 1.04, 0.27],
      [2.84, 37.5, 0.94, 0.22],
      [2.94, 36.8, 0.88, 0.25],
      // Motu 4 (Pandanus Islet)
      [1.18, 37.8, 0.96, 0.25],
      [1.34, 38.8, 1.08, 0.2],
      [1.48, 37.4, 1.12, 0.26],
      [1.64, 38.6, 1.02, 0.21],
      [1.78, 37.6, 0.98, 0.24],
      [1.9, 38.2, 0.9, 0.22],
      // Motu 5 (Port Pass-Shoulder Islet)
      [0.34, 38.6, 1.04, 0.3],
      [0.46, 39.4, 1.12, 0.22],
      [0.58, 38.2, 1.06, 0.26],
      [0.72, 39.0, 0.98, 0.2],
      [0.82, 38.4, 0.9, 0.24],
    ];

    for (let i = 0; i < motuSampleRings.length; i += 1) {
      const [ang, rad, sc, lean] = motuSampleRings[i];
      const px = rad * Math.cos(ang);
      const pz = rad * Math.sin(ang);
      const py = evalManuaePoint(px, pz).h;
      if (py > 0.75) {
        palmSites.push([
          px,
          py - 0.18,
          pz,
          -ang + ((i % 3) - 1) * 0.28,
          sc,
          lean,
        ]);
      }
    }
    addAtollCoconutGroves(
      group,
      trunkMat,
      palmFrondMat,
      palmSunMat,
      coconutMat,
      palmSites
    );

    // Littoral scrub mounds framing the outer windward coral ridges and motu tips
    const scrubAngles = [
      -0.35, -0.46, -0.58, -0.72, -0.86, -1.04, -1.2, -1.36, -1.54, -1.68, -1.82, -1.98, -2.1,
      -2.42, -2.56, -2.7, -2.86, -2.96,
      2.34, 2.5, 2.66, 2.8, 2.92,
      1.16, 1.3, 1.44, 1.6, 1.74, 1.88,
      0.34, 0.48, 0.62, 0.76, 0.84,
    ];
    for (let i = 0; i < scrubAngles.length; i += 1) {
      const sang = scrubAngles[i];
      const srad = 39.2 + ((i % 3) - 1) * 1.35;
      const sx = srad * Math.cos(sang);
      const sz = srad * Math.sin(sang);
      const sy = evalManuaePoint(sx, sz).h;
      if (sy > 1.05) {
        scrubSites.push([
          sx,
          sy - 0.15,
          sz,
          1.35 + (i % 3) * 0.32,
          0.62 + (i % 2) * 0.22,
          1.15 + ((i + 1) % 3) * 0.28,
          -sang + i * 0.4,
        ]);
      }
    }
    addCoastalScrubCluster(group, scrubMatA, scrubMatB, scrubSites);

    // 8. Perched White Terns (Kakaia) on the Inner Rookery Sandbar & Far Rookery Motu
    const ternGeo = new THREE.ConeGeometry(0.2, 0.55, 5);
    ternGeo.rotateX(Math.PI * 0.42);
    for (const [tx, tz] of [
      [-4.8, -5.8],
      [-6.2, -6.6],
      [-5.4, -7.2],
      [-6.8, -5.6],
      [-34.5, -15.5],
      [-33.2, -17.2],
    ]) {
      const ty = evalManuaePoint(tx, tz).h;
      if (ty > 0.3) {
        const tern = new THREE.Mesh(ternGeo, pearlShellMat);
        tern.position.set(tx, ty + 0.18, tz);
        tern.rotation.y = tx * 0.7;
        group.add(tern);
      }
    }

    return { group, materials, sinkDepthM: 12.5 };
  }

  // =========================================================================
  // TAHA'A ("Sheltered Lagoon Isle")
  // =========================================================================
  const terrainGeo = createSculptedIslandTerrainGeometry(
    evalTahaaPoint,
    54.0,
    COL_BEACH_CREAM
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Wide Sheltered Turquoise Lagoon & Outer Ring of Sandy Coral Motu Islets
  const lagoonDisc = new THREE.Mesh(new THREE.CircleGeometry(54.5, 48), lagoonSurfaceMat);
  lagoonDisc.rotation.x = -Math.PI / 2;
  lagoonDisc.position.y = 0.16;
  group.add(lagoonDisc);

  addBarrierReefArc(group, reefSandMat, surfFoamMat, 53.5, 0.74, Math.PI * 1.45, 26);
  addBarrierReefArc(group, reefSandMat, surfFoamMat, 53.5, Math.PI * 1.58, Math.PI * 2.08, 12);

  // 3 low pearl-sand Motu islets with coconut palms along the calm lagoon rim
  const motuGeo = new THREE.CylinderGeometry(3.8, 5.4, 1.0, 12);
  const motuDefs = [
    [47.0, 18.0, 1.35, 0.8],
    [-42.0, 27.5, 0.9, 1.3],
    [16.5, -48.5, 1.25, 0.85],
  ];
  const palmSites = [];
  for (const [mx, mz, sx, sz] of motuDefs) {
    const motu = new THREE.Mesh(motuGeo, reefSandMat);
    motu.position.set(mx, 0.32, mz);
    motu.scale.set(sx, 1.0, sz);
    group.add(motu);
    palmSites.push([mx, 0.75, mz, mx * 0.1, 0.85]);
    palmSites.push([mx + 1.4, 0.72, mz - 0.9, -mz * 0.1, 0.75]);
  }

  // Sheltered Hillside & Bay Village (Thatched Polynesian Fare Huts + Canoe Landing Jetty)
  const thatchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc49759,
      roughness: 0.88,
      transparent: true,
      opacity: 1.0,
    })
  );
  const wallTimberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6f4a2b,
      roughness: 0.85,
      transparent: true,
      opacity: 1.0,
    })
  );

  // Place village overlooking the deep calm bay at theta = (Math.PI - 0.55) / 5 ~ +0.518 rad
  const bayTheta = (Math.PI - 0.55) / 5.0;
  const hutSpots = [
    [22.5, bayTheta - 0.06, 1.05],
    [20.2, bayTheta + 0.08, 0.92],
    [17.8, bayTheta - 0.02, 0.98],
    [23.2, bayTheta + 0.19, 0.88],
  ];

  const hutBaseGeo = new THREE.BoxGeometry(2.6, 1.5, 3.4);
  const hutRoofGeo = new THREE.ConeGeometry(2.55, 1.85, 4);

  for (const [hr, hang, hscale] of hutSpots) {
    const hx = hr * Math.cos(hang);
    const hz = hr * Math.sin(hang);
    const hy = evalTahaaPoint(hx, hz).h;

    const fare = new THREE.Group();
    fare.position.set(hx, hy, hz);
    fare.rotation.y = -hang + Math.PI * 0.25;
    fare.scale.setScalar(hscale);

    const walls = new THREE.Mesh(hutBaseGeo, wallTimberMat);
    walls.position.y = 0.65;
    fare.add(walls);

    const roof = new THREE.Mesh(hutRoofGeo, thatchMat);
    roof.position.y = 2.15;
    roof.rotation.y = Math.PI * 0.25;
    fare.add(roof);

    group.add(fare);
  }

  // Small wooden fisher's canoe jetty extending into the calm bay shallows
  const jetty = new THREE.Group();
  const jx = 26.2 * Math.cos(bayTheta);
  const jz = 26.2 * Math.sin(bayTheta);
  jetty.position.set(jx, 0.65, jz);
  jetty.rotation.y = -bayTheta;
  const deckPlank = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 1.45), wallTimberMat);
  jetty.add(deckPlank);
  group.add(jetty);

  // Coastal Coconut Palms ringing Taha'a's 5 bays & headlands
  for (let b = 0; b < 5; b += 1) {
    const lobeAng = (b * Math.PI * 2.0 - 0.55) / 5.0;
    const coveAng = lobeAng + Math.PI / 5.0;
    for (const ang of [lobeAng - 0.12, coveAng - 0.14, coveAng + 0.14]) {
      const pr = ang === lobeAng - 0.12 ? 34.5 : 23.5;
      const px = pr * Math.cos(ang);
      const pz = pr * Math.sin(ang);
      const py = evalTahaaPoint(px, pz).h;
      if (py > 0.5 && py < 9.5) {
        palmSites.push([px, py - 0.15, pz, -ang, 0.9]);
      }
    }
  }
  addCoconutPalmCluster(group, trunkMat, palmFrondMat, palmSites);

  return { group, materials, sinkDepthM: 45.0 };
}

/**
 * Applies smooth sea-haze opacity [0..1] across all materials of a detailed island assembly.
 */
export function applyDetailedIslandAlpha(assembly, alpha) {
  const a = clamp01(alpha);
  for (const mat of assembly.materials) {
    const base = mat.userData?.baseOpacity ?? 1.0;
    mat.opacity = base * a;
    if (mat.userData?.baseOpacity === undefined) {
      mat.depthWrite = a > 0.35;
    }
  }
}

const DETAILED_ISLAND_IDS = new Set([
  'raiatea',
  'tahaa',
  'huahine',
  'manuae',
  'moorea',
  'maupiti',
  'nuku_hiva',
  'ua_pou',
  'rangiroa',
  'hiva_oa',
  'fatu_hiva',
  'mangareva',
  'kauai',
  'oahu',
  'kiritimati',
  'hawaii',
]);

export function hasDetailedIslandModel(islandId) {
  return DETAILED_ISLAND_IDS.has(islandId);
}

/**
 * Returns Y-axis rotation (radians) for a detailed island assembly so its open reef pass
 * and welcoming landing beach face +Z (toward the approaching canoe when root looks at origin).
 */
export function getIslandApproachOrientationRad(islandId) {
  switch (islandId) {
    case 'raiatea':
      // Aligns Te Ava Mo'a sacred reef pass & golden cove beside Marae Taputapuatea toward +Z
      return -0.44 - Math.PI * 0.5;
    case 'tahaa': {
      // Aligns open lagoon pass & sheltered cream-sand bay alongside the village jetty toward +Z
      const bayTheta = (Math.PI - 0.55) / 5.0;
      return bayTheta - 0.14 - Math.PI * 0.5;
    }
    case 'moorea':
      // Aligns northern 'Opunohu reef pass, Vaihere's Canoe-Wright Shed & Mount Rotui toward +Z
      return -0.35 - Math.PI * 0.5;
    case 'hawaii':
      // Frames Kealakekua Bay & Great Heiau ahead while showing glowing Kilauea lava rivers on starboard!
      return -0.32 - Math.PI * 0.5;
    default:
      // All other sculpted islands center their primary reef pass / bay entrance on theta = 0
      return -Math.PI * 0.5;
  }
}

const ISLAND_SHORE_RADIUS_M = Object.freeze({
  raiatea: 39.8,
  tahaa: 27.0,
  huahine: 35.5,
  manuae: 41.5,
  moorea: 31.5,
  maupiti: 39.5,
  nuku_hiva: 28.5,
  ua_pou: 33.5,
  rangiroa: 41.5,
  hiva_oa: 32.0,
  fatu_hiva: 30.0,
  mangareva: 34.5,
  kauai: 35.5,
  oahu: 34.5,
  kiritimati: 36.5,
  hawaii: 37.8,
});

/**
 * Returns the exact waterline shoreline radius (meters from island center along +Z approach)
 * so the arriving canoe stops cleanly right at the edge of the island without clipping terrain.
 */
export function getIslandShoreRadiusM(islandId, archetype = 'volcanic_high') {
  if (ISLAND_SHORE_RADIUS_M[islandId] !== undefined) {
    return ISLAND_SHORE_RADIUS_M[islandId];
  }
  if (archetype === 'coral_atoll') return 50.0;
  return 37.1;
}
