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
import { createRapaNuiIslandAssembly } from './IslandRapaNuiBuilder.js';
import {
  addBroadleafTrees,
  addCoconutGroves,
  addCoastalScrub,
  addMaraePlatform,
  addOrganicBarrierReefArc,
  addOutriggerCanoe,
  addRegionalHuts,
  addTimberPier,
  createBeveledStoneSlabGeometry,
  createCarvedUnuStandard,
  createGiantPearlShellGroup,
  createGiantPearlValveGeometry,
  createMaterialTracker,
  createOrganicLagoonGeometry,
  createOrganicMotuGeometry,
} from './IslandSculptToolkit.js';
import {
  createCarvedStandingStoneGroup,
  createCoralCairnGroup,
  createKukuiTorchGroup,
  createVillageHearthGroup,
  makeStoneRockGeometry,
} from './IslandPropsBuilder.js';

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

function evalRaiateaReefRadius(theta) {
  return (
    114.0 -
    10.5 * Math.cos(2.0 * theta + 0.25) +
    6.8 * Math.sin(3.0 * theta + 0.45) +
    4.0 * Math.cos(5.0 * theta - 1.1) +
    2.4 * Math.sin(7.0 * theta + 0.8)
  );
}

/**
 * Evaluates Ra'iatea height & shoreline profile at world (x, z) (2x canonical scale).
 * Features elongated volcanic massif, flat-topped Mount Temehani Observation plateau,
 * 7 gentle walkable radial ridge spurs, broad Marae Taputapuatea cape terrace, and crescent coves.
 */
function evalRaiateaPoint(x, z) {
  // 2x elongated, asymmetrically indented island footprint with sacred cape at theta ~ -0.35
  const sx = x * 1.08;
  const sz = z * 0.92;
  const r = Math.hypot(sx, sz);
  const theta = Math.atan2(sz, sx);

  const capeBump =
    11.2 *
    Math.exp(
      -Math.pow(
        Math.atan2(Math.sin(theta + 0.35), Math.cos(theta + 0.35)) / 0.38,
        2.0
      )
    );
  const coveWave =
    7.4 * Math.cos(2.0 * theta - 0.85) +
    5.6 * Math.cos(3.0 * theta - 0.55) +
    3.6 * Math.sin(5.0 * theta + 1.15) +
    1.5 * Math.cos(7.0 * theta - 0.4);
  const rawCoastR = 77.5 + capeBump + coveWave;
  const coastR =
    rawCoastR < 67.0
      ? 67.0 - 4.0 * Math.tanh((67.0 - rawCoastR) / 4.0)
      : rawCoastR;

  const uCoast = r / coastR; // < 1.0 = land, > 1.0 = lagoon floor
  if (uCoast >= 1.0) {
    const lagoonDepth = -4.2 * smoothstep(1.0, 1.38, uCoast);
    return {
      h: lagoonDepth,
      u: uCoast,
      ridgeFactor: 0.0,
      isBeachCove: false,
      isPlateau: false,
    };
  }

  // Smooth inner massif radius away from cove indentations while reaching 36.0m summit gradually
  const massifTargetR = lerp(coastR, 82.0, 0.45);
  const uSmooth = r / lerp(coastR, massifTargetR, smoothstep(1.0, 0.14, uCoast));
  const inland = clamp01(1.0 - uSmooth);
  const domeT = clamp01((inland - 0.01) / 0.95);
  const softCurve = lerp(domeT, smoothstep(0.0, 1.0, domeT), 0.03);
  const baseDome = 35.8 * softCurve;

  // 7 broad, gently undulating radial basalt ridges & valleys
  const twistTheta = theta + 0.12 * Math.sin(2.0 * theta) + 0.06 * inland;
  const ridgeRaw = 0.5 + 0.5 * Math.cos(7.0 * twistTheta - 0.4);
  const ridgeSharp = Math.pow(ridgeRaw, 1.25);
  const ridgeEnv =
    smoothstep(0.16, 0.48, inland) * smoothstep(0.9, 0.52, inland);
  const ridgeRelief = (ridgeSharp - 0.3) * 1.6 * ridgeEnv;

  // Secondary gentle hill shoulder on the aft/south flank
  const southPeakDist = Math.hypot(sx + 14.0, sz - 26.0);
  const southSpur = 3.2 * Math.exp(-Math.pow(southPeakDist / 34.0, 2.0));

  let h = Math.max(0.0, baseDome + ridgeRelief + southSpur);

  // Iconic flat-topped sacred Mount Temehani plateau above ~35.2m
  let isPlateau = false;
  if (h > 35.2) {
    const over = h - 35.2;
    h = 35.2 + Math.min(0.9, over * 0.22);
    isPlateau = true;
  }

  // Gentle walkable eastern ridge approach (theta ~ -1.05 rad -> world +X/+Z trail)
  const rampAngDiff = Math.abs(
    Math.atan2(Math.sin(theta + 1.05), Math.cos(theta + 1.05))
  );
  if (rampAngDiff < 0.9 && uCoast < 0.98) {
    const angMask = smoothstep(0.9, 0.22, rampAngDiff);
    const rampT = clamp01((inland - 0.01) / 0.86);
    const rampProfile = lerp(0.8, 36.0, rampT);
    const rampBlend = angMask * smoothstep(0.98, 0.55, uCoast);
    h = lerp(h, rampProfile, rampBlend * 0.82);
  }

  // Broad level summit clearing at (0, 0) for the Observation Circle (blends gently from 35.2..36.0)
  const summitDist = Math.hypot(sx, sz);
  if (summitDist < 12.0) {
    const flatBlend = smoothstep(12.0, 6.0, summitDist);
    h = lerp(h, 36.0, flatBlend);
    isPlateau = true;
  }

  // Smooth coastal terrace for Sacred Marae Taputapuatea around theta ~ -0.35, r ~ 59m
  const capeAngDiff = Math.abs(
    Math.atan2(Math.sin(theta + 0.35), Math.cos(theta + 0.35))
  );
  if (capeAngDiff < 0.45 && uCoast > 0.54 && uCoast < 0.96) {
    const terraceBlend =
      smoothstep(0.45, 0.16, capeAngDiff) *
      smoothstep(0.54, 0.78, uCoast) *
      smoothstep(0.96, 0.88, uCoast);
    h = lerp(h, 2.2, terraceBlend * 0.76);
  }

  // Wide golden crescent beaches around concave coves & primary landing bay
  const isBeachCove = coveWave < 1.4 && capeAngDiff > 0.22;
  if (isBeachCove && uCoast > 0.85) {
    const beachT = smoothstep(0.85, 1.0, uCoast);
    h = lerp(h, 1.8 * (1.0 - beachT), 0.42);
  }

  return {
    h,
    u: uCoast,
    ridgeFactor: ridgeSharp * ridgeEnv,
    isBeachCove,
    isPlateau,
  };
}

function evalTahaaReefRadius(theta) {
  return (
    112.0 +
    10.5 * Math.cos(2.0 * theta + 1.15) +
    5.4 * Math.sin(theta - 0.35) +
    2.4 * Math.cos(5.0 * theta + 0.55) +
    3.6 * Math.sin(3.0 * theta - 0.8)
  );
}

/**
 * Evaluates Taha'a height & shoreline profile at world (x, z) (2x canonical horizontal scale,
 * preserving full ~23.5m Mount Ohiri hilltop elevation with gentle walkable slopes).
 * Features asymmetric flower-clover coastline with 5 varied fjord bays, wide cream-sand beaches,
 * and eroded Mount Ohiri twin-saddle volcanic hills.
 */
function evalTahaaPoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  // Signature 5-lobed flower/clover-leaf shoreline broken by 2*theta elongation & off-axis coves
  const bayLobe = Math.cos(5.0 * theta + 0.55);
  const asymOvoid =
    7.8 * Math.cos(2.0 * theta + 1.45) + 4.4 * Math.sin(theta - 0.35);
  const subHarmonic =
    2.8 * Math.sin(3.0 * theta - 0.8) + 1.1 * Math.cos(8.0 * theta + 0.3);
  const rawCoastR = 75.0 + 9.2 * bayLobe + asymOvoid + subHarmonic;
  const coastR =
    rawCoastR < 60.0
      ? 60.0 - 4.0 * Math.tanh((60.0 - rawCoastR) / 4.0)
      : rawCoastR;

  const uCoast = r / coastR;
  if (uCoast >= 1.0) {
    const lagoonDepth = -3.8 * smoothstep(1.0, 1.42, uCoast);
    return {
      h: lagoonDepth,
      u: uCoast,
      ridgeFactor: 0.0,
      isBeachCove: true,
      isPlateau: false,
    };
  }

  // Blend radial coordinate gently toward a rounded central massif without pinching steep bay walls
  const massifTargetR = lerp(coastR, 79.0, 0.35);
  const uSmooth = r / lerp(coastR, massifTargetR, smoothstep(1.0, 0.14, uCoast));
  const inland = clamp01(1.0 - uSmooth);
  const domeT = clamp01((inland - 0.01) / 0.95);
  const dome = 35.0 * domeT;

  // 5 broad rolling peninsula ridges aligned with the 5 coastal lobes
  const lobeRidge = Math.pow(0.5 + 0.5 * Math.cos(5.0 * theta + 0.55), 1.2);
  const ridgeEnv =
    smoothstep(0.2, 0.5, inland) * smoothstep(0.9, 0.52, inland);
  const ridgeRelief = (lobeRidge - 0.28) * 1.0 * ridgeEnv;

  // Offset twin-hill caldera shoulder (Mount Ohiri & Mount Puurauti, wide gentle Gaussians)
  const ohiri =
    2.4 * Math.exp(-Math.pow(Math.hypot(x - 8.4, z + 6.0) / 30.0, 2.0));
  const puurauti =
    1.8 * Math.exp(-Math.pow(Math.hypot(x + 15.0, z - 11.0) / 28.0, 2.0));

  let h = Math.max(0.0, dome + ridgeRelief + ohiri + puurauti);
  if (h > 34.8) {
    h = 34.8 + Math.min(0.6, (h - 34.8) * 0.22);
  }

  // Gentle walkable eastern ridge face (theta ~ -0.18 rad -> world +X/+Z trail) leading smoothly to hilltop
  const rampAngDiff = Math.abs(
    Math.atan2(Math.sin(theta + 0.18), Math.cos(theta + 0.18))
  );
  const angMask =
    rampAngDiff < 1.02 && uCoast < 0.99 ? smoothstep(1.02, 0.3, rampAngDiff) : 0.0;
  if (angMask > 0.0) {
    const rampT = clamp01((inland - 0.01) / 0.86);
    const rampProfile = lerp(0.5, 35.2, rampT);
    const rampBlend = angMask * smoothstep(0.99, 0.65, uCoast);
    h = lerp(h, rampProfile, rampBlend * 0.85);
  }

  // Gentle flat beach landing pocket in the primary sheltered cove near spawn
  const coveDeltaAng = Math.atan2(
    Math.sin(theta - 0.305),
    Math.cos(theta - 0.305)
  );
  if (Math.abs(coveDeltaAng) < 0.34 && uCoast > 0.68 && uCoast < 0.995) {
    const coveBlend =
      smoothstep(0.34, 0.08, Math.abs(coveDeltaAng)) *
      smoothstep(0.68, 0.87, uCoast) *
      smoothstep(0.995, 0.93, uCoast);
    h = lerp(h, 1.45, coveBlend * 0.78);
  }

  // Level summit clearing at 35.2m height for the Observation Circle
  const summitDist = Math.hypot(x, z);
  if (summitDist < 11.0) {
    const flatBlend = smoothstep(11.0, 5.5, summitDist);
    h = lerp(h, 35.2, flatBlend);
  }

  // Natural cream-sand shoreline coloring flag inside bays (no hard artificial cliff shelf)
  const isBeachCove = bayLobe < 0.42;

  return {
    h,
    u: uCoast,
    ridgeFactor: lobeRidge * ridgeEnv,
    isBeachCove,
    isPlateau: false,
  };
}

/**
 * Generates a polar heightfield BufferGeometry with smooth normals and vertex biome colors.
 */
function createSculptedIslandTerrainGeometry(
  evalFn,
  maxRadius = 56.0,
  beachColor = COL_BEACH_GOLD,
  { nRings = 52, nSegs = 76 } = {}
) {

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
  [18.5, 9.0, 7.2],
  [-25.5, 13.5, 8.0],
  [10.5, -27.5, 6.8],
  [29.5, -14.0, 6.5],
  [-4.5, 27.5, 7.5],
  [-28.5, -20.5, 6.8],
];

function evalManuaeGeometryProfile(theta) {
  // Warped crescent-kidney coral atoll ring with asymmetric inner & outer shorelines
  const macroLobe =
    9.0 * Math.cos(2.0 * theta - 0.55) + 5.6 * Math.sin(3.0 * theta + 0.85);
  const spineWarp =
    3.4 * Math.cos(4.0 * theta + 0.4) + 1.8 * Math.sin(5.0 * theta - 1.1);
  const ringR = 76.5 + macroLobe + spineWarp;

  const m1 = motuArcMask(theta, -1.24, 0.94, 0.1); // Main broad village crescent motu
  const m2 = motuArcMask(theta, -2.68, 0.36, 0.08); // Far rookery motu
  const m3 = motuArcMask(theta, 2.64, 0.38, 0.08); // Leeward coconut motu
  const m4 = motuArcMask(theta, 1.54, 0.46, 0.085); // Pandanus motu
  const m5 = motuArcMask(theta, 0.58, 0.34, 0.08); // Port pass-shoulder motu
  const motuMask = clamp01(m1 + m2 + m3 + m4 + m5);

  const circleSpit = 7.5 * motuArcMask(theta, -0.83, 0.2, 0.1);
  const innerW =
    lerp(9.6, 16.0, m1) * (0.86 + 0.14 * Math.sin(7.0 * theta - 0.4)) +
    circleSpit;
  const outerW =
    lerp(9.4, 12.6, m1) * (0.88 + 0.12 * Math.cos(6.0 * theta + 0.3));
  const innerToeR = ringR - innerW;
  const outerToeR = ringR + outerW;
  const reefEdgeR =
    outerToeR +
    8.5 +
    1.8 * Math.sin(5.0 * theta + 0.4) +
    1.1 * Math.cos(7.0 * theta - 0.8);

  return {
    ringR,
    m1,
    motuMask,
    innerW,
    outerW,
    innerToeR,
    outerToeR,
    reefEdgeR,
  };
}

const MANUAE_MARAE_THETA = -0.4;
const MANUAE_MARAE_R = evalManuaeGeometryProfile(MANUAE_MARAE_THETA).innerToeR + 12.5;
const MANUAE_MARAE_X = MANUAE_MARAE_R * Math.cos(MANUAE_MARAE_THETA);
const MANUAE_MARAE_Z = MANUAE_MARAE_R * Math.sin(MANUAE_MARAE_THETA);

/**
 * Evaluates Manuae Coral Atoll topography & lagoon bathymetry at local (x, z) (2x canonical scale):
 * - 5 segmented sandy coral motu islets separated by shallow turquoise hoa channels
 * - Deep navigable Te Ava reef pass at theta = 0 leading into the central lagoon
 * - Multi-depth jade-turquoise lagoon with 6 karena coral patch reefs & central rookery sandbar
 * - Asymmetric motu sand ridges (gentle lagoon beach, storm-built makatea crest, outer papa reef shelf)
 */
function evalManuaePoint(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);

  const {
    ringR,
    m1,
    motuMask,
    innerW,
    outerW,
    innerToeR,
    outerToeR,
    reefEdgeR,
  } = evalManuaeGeometryProfile(theta);

  const passChannel = motuArcMask(theta, 0.0, 0.17, 0.075);

  // 1. Central Lagoon Basin (kept gently above 0.14m so global opaque ocean doesn't swallow lagoon colors,
  //    except inside the deep sapphire Te Ava pass inlet)
  if (r < innerToeR) {
    const lu = clamp01(r / Math.max(1.0, innerToeR));
    let h = lerp(0.15, 0.23, smoothstep(0.58, 1.0, lu));

    // Curved bleached-white inner rookery sandbank spit (2x scale centered around (-11.6, -12.8))
    const rx = (x + 11.6) * 0.78 + (z + 12.8) * 0.62;
    const rz = -(x + 11.6) * 0.62 + (z + 12.8) * 0.78;
    const sandbarDist = Math.hypot(rx * 0.62, rz * 1.38);
    const sandbarLift = 0.84 * Math.exp(-Math.pow(sandbarDist / 8.5, 2.0));
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

    // Deep sapphire navigable Te Ava pass inlet tongue shoaling into central lagoon (~65m +Z shore)
    const passInlet = passChannel * smoothstep(64.0, 84.0, r);
    h = lerp(h, -2.4, passInlet);

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
    const rimBump = 0.18 * Math.exp(-Math.pow((r - (reefEdgeR - 2.6)) / 2.4, 2.0));
    const reefFlatH =
      0.21 + 0.03 * Math.sin(r * 0.45 + theta * 9.0) + rimBump;

    let motuH = 0.0;
    let villageClearing = 0.0;
    let isInnerBeach = false;

    if (motuMask > 0.001 && r < outerToeR) {
      let profile = 0.0;
      let tIn = 1.0;
      if (r <= ringR) {
        tIn = clamp01((r - innerToeR) / Math.max(0.5, innerW));
        profile = smoothstep(0.0, 1.0, tIn);
        isInnerBeach = tIn < 0.46;
      } else {
        const tOut = clamp01(1.0 - (r - ringR) / Math.max(0.5, outerW));
        profile = Math.pow(smoothstep(0.0, 1.0, tOut), 0.9);
      }

      const peakH =
        lerp(3.6, 4.75, m1) +
        0.28 * Math.sin(9.0 * theta) +
        0.18 * Math.cos(15.0 * theta);
      motuH = peakH * profile * motuMask;

      // Swept level coral-sand village clearing along inner shore of Motu 1 (around theta ~ -1.35)
      const vilArc = motuArcMask(theta, -1.35, 0.38, 0.12);
      const vilBand = smoothstep(0.18, 0.4, tIn) * smoothstep(0.95, 0.68, tIn);
      villageClearing = vilArc * vilBand * m1;
      if (villageClearing > 0.01) {
        motuH = lerp(motuH, 1.65, villageClearing * 0.84);
      }

      // Level inner coral-sand spit plateau around Navigator's Sand Ring (32.4, -35.4)
      const circDist = Math.hypot(x - 32.4, z + 35.4);
      if (circDist < 10.5) {
        motuH = lerp(motuH, 1.15, smoothstep(10.5, 5.8, circDist));
      }

      // Gentle coral-sand beach clearing around initial spawn (77.5, 34.5) on Motu 5
      const spDist = Math.hypot(x - 77.5, z - 34.5);
      if (spDist < 8.5) {
        motuH = lerp(motuH, 1.25, smoothstep(8.5, 3.5, spDist) * 0.78);
      }

      // Level swept coral terrace beneath Pass-Point Marae courtyard
      const maraeDist = Math.hypot(x - MANUAE_MARAE_X, z - MANUAE_MARAE_Z);
      if (maraeDist < 9.5) {
        motuH = lerp(motuH, 2.05, smoothstep(9.5, 5.2, maraeDist));
      }
    }

    let h = Math.max(reefFlatH, motuH);
    // Carve navigable Te Ava reef pass cleanly down to deep sapphire ocean water
    h = lerp(h, -2.5, passChannel);

    let zone = 'papa_reef';
    if (passChannel > 0.4) {
      zone = 'deep_sea';
    } else if (motuH > reefFlatH + 0.04) {
      zone = isInnerBeach ? 'inner_beach' : 'motu';
    } else if (r < outerToeR - 1.2 && motuMask < 0.25) {
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
  const dropT = smoothstep(reefEdgeR, reefEdgeR + 13.0, r);
  const startH = lerp(0.28, -2.5, passChannel);
  const h = lerp(startH, -4.4, dropT);
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
function createSculptedAtollTerrainGeometry(
  evalFn,
  maxRadius = 118.0,
  nRings = 92,
  nSegs = 136
) {

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
    createAct3IslandAssembly(islandId) ||
    createRapaNuiIslandAssembly(islandId);
  if (modularAssembly) {
    return modularAssembly;
  }

  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();

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

  if (islandId === 'raiatea') {
    // 1. Sculpted 2x Ra'iatea Massif (Mount Temehani plateau, 7 gentle ridges, valleys & golden coves)
    const terrainGeo = createSculptedIslandTerrainGeometry(
      evalRaiateaPoint,
      126.0,
      COL_BEACH_GOLD,
      { nRings: 88, nSegs: 120 }
    );
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 2. Translucent Turquoise Fringing Lagoon & Organic Barrier Reef with Sacred Te Ava Mo'a Pass
    const lagoonDisc = new THREE.Mesh(
      createOrganicLagoonGeometry(evalRaiateaReefRadius, 108),
      lagoonSurfaceMat
    );
    lagoonDisc.position.y = 0.16;
    group.add(lagoonDisc);

    // Leave open pass around theta = -0.35 rad facing Marae Taputapuatea
    addOrganicBarrierReefArc(
      group,
      reefSandMat,
      surfFoamMat,
      evalRaiateaReefRadius,
      -0.08,
      Math.PI * 2.0 - 0.62,
      84
    );

    // Two sculpted organic sandy reef motu islets flanking the sacred reef pass
    const raiateaMotuPositions = [];
    for (const [mAng, rx, rz, seed] of [
      [-0.04, 10.5, 6.8, 1.3],
      [-0.66, 9.2, 7.6, 4.1],
    ]) {
      const mr = evalRaiateaReefRadius(mAng) - 1.8;
      const mx = mr * Math.cos(mAng);
      const mz = mr * Math.sin(mAng);
      const motu = new THREE.Mesh(
        createOrganicMotuGeometry({ radiusX: rx, radiusZ: rz, height: 1.35, seed }),
        reefSandMat
      );
      motu.position.set(mx, 0.36, mz);
      motu.rotation.y = -mAng + Math.PI * 0.5;
      group.add(motu);
      raiateaMotuPositions.push([mx, mz, mAng]);
    }

    // 3. Sacred Marae Taputapuatea Stone Courtyard, Stepped Coral Ahu & Thatched Fare Pote'e
    const basaltStoneMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x45413d,
        roughness: 0.92,
        transparent: true,
        opacity: 1.0,
      })
    );
    const coralSlabMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd8cdb4,
        roughness: 0.85,
        transparent: true,
        opacity: 1.0,
      })
    );
    const maraeTimberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x5c3a21,
        roughness: 0.86,
        transparent: true,
        opacity: 1.0,
      })
    );
    const maraeThatchMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc29c5a,
        roughness: 0.9,
        transparent: true,
        opacity: 1.0,
      })
    );
    const maraeUnuRedMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x8f2d1f,
        roughness: 0.82,
        transparent: true,
        opacity: 1.0,
      })
    );
    const maraeFlameMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffa83e,
        transparent: true,
        opacity: 0.95,
      })
    );
    maraeFlameMat.userData.baseOpacity = 0.95;

    const maraeGroup = new THREE.Group();
    const capeTheta = -0.35;
    const capeX = 59.0 * Math.cos(capeTheta);
    const capeZ = 59.0 * Math.sin(capeTheta);
    const capeY = evalRaiateaPoint(capeX, capeZ).h;
    maraeGroup.position.set(capeX, capeY, capeZ);
    maraeGroup.rotation.y = -capeTheta;

    // Grounded skirt + two-tier beveled stone courtyard terrace (paepae) with fitted curb blocks
    const footingSkirt = new THREE.Mesh(
      createBeveledStoneSlabGeometry(8.7, 1.8, 11.4, 0.24),
      basaltStoneMat
    );
    footingSkirt.position.y = -0.9;
    footingSkirt.userData.walkableSurface = true;
    maraeGroup.add(footingSkirt);

    const footingSlab = new THREE.Mesh(
      createBeveledStoneSlabGeometry(8.5, 0.36, 11.2, 0.22),
      basaltStoneMat
    );
    footingSlab.position.y = -0.02;
    footingSlab.userData.walkableSurface = true;
    maraeGroup.add(footingSlab);

    const pavement = new THREE.Mesh(
      createBeveledStoneSlabGeometry(7.7, 0.36, 10.3, 0.16),
      basaltStoneMat
    );
    pavement.position.y = 0.26;
    pavement.userData.walkableSurface = true;
    maraeGroup.add(pavement);

    const curbGeo = createBeveledStoneSlabGeometry(0.44, 0.26, 1.08, 0.06);
    for (let c = -4; c <= 4; c += 1) {
      if (c !== 0) {
        const curbW = new THREE.Mesh(curbGeo, c % 2 === 0 ? coralSlabMat : basaltStoneMat);
        curbW.position.set(-3.6, 0.52, c * 1.12);
        curbW.rotation.y = (c % 2) * 0.04;
        maraeGroup.add(curbW);
      }
      const curbE = new THREE.Mesh(curbGeo, c % 2 === 0 ? basaltStoneMat : coralSlabMat);
      curbE.position.set(3.6, 0.52, c * 1.12);
      curbE.rotation.y = -(c % 2) * 0.03;
      maraeGroup.add(curbE);
    }
    for (let j = -2; j <= 2; j += 1) {
      for (const ez of [-4.95, 4.95]) {
        const endCurb = new THREE.Mesh(curbGeo, j % 2 === 0 ? coralSlabMat : basaltStoneMat);
        endCurb.rotation.y = Math.PI * 0.5;
        endCurb.position.set(j * 1.25, 0.52, ez);
        maraeGroup.add(endCurb);
      }
    }

    // Three-tier stepped coral-stone Ahu with dressed coping blocks & central offering table
    const ahuTier1 = new THREE.Mesh(
      createBeveledStoneSlabGeometry(2.55, 0.44, 8.0, 0.16),
      coralSlabMat
    );
    ahuTier1.position.set(1.9, 0.62, 0.0);
    ahuTier1.userData.walkableSurface = true;
    maraeGroup.add(ahuTier1);

    const ahuTier2 = new THREE.Mesh(
      createBeveledStoneSlabGeometry(1.75, 0.38, 6.7, 0.12),
      coralSlabMat
    );
    ahuTier2.position.set(2.12, 1.0, 0.0);
    ahuTier2.userData.walkableSurface = true;
    maraeGroup.add(ahuTier2);

    const ahuTier3 = new THREE.Mesh(
      createBeveledStoneSlabGeometry(1.2, 0.28, 5.4, 0.08),
      coralSlabMat
    );
    ahuTier3.position.set(2.24, 1.32, 0.0);
    ahuTier3.userData.walkableSurface = true;
    maraeGroup.add(ahuTier3);

    for (let cap = -2; cap <= 2; cap += 1) {
      const capSlab = new THREE.Mesh(
        createBeveledStoneSlabGeometry(0.95, 0.16, 0.92, 0.06),
        cap % 2 === 0 ? coralSlabMat : basaltStoneMat
      );
      capSlab.position.set(2.24, 1.52, cap * 1.02);
      capSlab.userData.walkableSurface = true;
      maraeGroup.add(capSlab);
    }

    const offeringSlab = new THREE.Mesh(
      createBeveledStoneSlabGeometry(0.95, 0.22, 1.65, 0.08),
      coralSlabMat
    );
    offeringSlab.position.set(0.32, 0.52, 0.0);
    maraeGroup.add(offeringSlab);

    // Three shorter, broad, tapered basalt backrest slabs (ofai) with natural variation
    for (const [bz, bh, lean] of [
      [-2.4, 0.82, -0.05],
      [0.0, 1.08, 0.02],
      [2.45, 0.88, 0.06],
    ]) {
      const slab = createCarvedStandingStoneGroup(trackMat, {
        width: 0.42,
        height: bh,
        depth: 0.28,
        colorHex: 0x35373b,
      });
      slab.group.rotation.y = Math.PI * 0.5;
      slab.group.rotation.z = lean;
      slab.group.position.set(-1.6, 0.44, bz);
      maraeGroup.add(slab.group);
    }

    // Two carved red-ochre unu standards & glowing kukui torches flanking the Ahu
    for (const uz of [-3.35, 3.35]) {
      const unu = createCarvedUnuStandard(
        maraeTimberMat,
        maraeUnuRedMat,
        coralSlabMat
      );
      unu.position.set(2.35, 0.44, uz);
      maraeGroup.add(unu);

      const torch = createKukuiTorchGroup(trackMat, { height: 1.45 });
      torch.group.position.set(-0.2, 0.44, uz * 1.18);
      maraeGroup.add(torch.group);
    }

    // Open-sided thatched Fare Pote'e council pavilion beside the courtyard
    const fareGroup = new THREE.Group();
    fareGroup.position.set(-1.1, 0.36, -6.9);
    const farePlinth = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.3, 4.4),
      coralSlabMat
    );
    farePlinth.position.y = 0.08;
    farePlinth.userData.walkableSurface = true;
    fareGroup.add(farePlinth);

    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.45, 6);
    for (const pxOff of [-1.25, 1.25]) {
      for (const pzOff of [-1.55, 0.0, 1.55]) {
        const post = new THREE.Mesh(postGeo, maraeTimberMat);
        post.position.set(pxOff, 0.9, pzOff);
        fareGroup.add(post);
      }
    }
    const fareRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 2.25, 1.85, 4),
      maraeThatchMat
    );
    fareRoof.rotation.y = Math.PI * 0.25;
    fareRoof.scale.set(0.92, 1.0, 1.32);
    fareRoof.position.y = 2.42;
    fareGroup.add(fareRoof);

    const fareRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.16, 4.4),
      maraeTimberMat
    );
    fareRidge.position.y = 3.28;
    fareGroup.add(fareRidge);
    maraeGroup.add(fareGroup);

    group.add(maraeGroup);

    // 4. Sculpted Terrain-Hugging Highland Cascade Stream & Plunge Pool below Mount Temehani
    const waterfallMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xc2f2ff,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    waterfallMat.userData.baseOpacity = 0.78;
    const foamPoolMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf0fcff,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
      })
    );
    foamPoolMat.userData.baseOpacity = 0.86;

    const fallAz = Math.atan2(-22.5, -25.5);
    const dirX = Math.cos(fallAz);
    const dirZ = Math.sin(fallAz);
    const perpX = -dirZ;
    const perpZ = dirX;
    const streamSegs = 20;
    const streamPos = [];
    const streamIdx = [];
    for (let s = 0; s <= streamSegs; s += 1) {
      const t = s / streamSegs;
      const r = lerp(16.0, 48.0, t);
      const meander = Math.sin(t * Math.PI * 2.4) * 1.4;
      const cx = dirX * r + perpX * meander;
      const cz = dirZ * r + perpZ * meander;
      const hw = lerp(0.55, 1.45, t) + Math.sin(t * Math.PI * 3.0) * 0.18;
      const lx = cx - perpX * hw;
      const lz = cz - perpZ * hw;
      const rx = cx + perpX * hw;
      const rz = cz + perpZ * hw;
      const hc = evalRaiateaPoint(cx, cz).h;
      const hl = evalRaiateaPoint(lx, lz).h;
      const hr = evalRaiateaPoint(rx, rz).h;
      streamPos.push(lx, hl + 0.16, lz);
      streamPos.push(cx, hc + 0.22, cz);
      streamPos.push(rx, hr + 0.16, rz);
      if (s < streamSegs) {
        const b0 = s * 3;
        const b1 = (s + 1) * 3;
        streamIdx.push(b0, b0 + 1, b1, b0 + 1, b1 + 1, b1);
        streamIdx.push(b0 + 1, b0 + 2, b1 + 1, b0 + 2, b1 + 2, b1 + 1);
      }
    }
    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(streamPos, 3)
    );
    streamGeo.setIndex(streamIdx);
    streamGeo.computeVertexNormals();
    group.add(new THREE.Mesh(streamGeo, waterfallMat));

    const poolX = dirX * 48.5;
    const poolZ = dirZ * 48.5;
    const poolY = evalRaiateaPoint(poolX, poolZ).h + 0.12;
    const poolRing = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 18),
      foamPoolMat
    );
    poolRing.rotation.x = -Math.PI * 0.5;
    poolRing.position.set(poolX, poolY, poolZ);
    group.add(poolRing);

    for (let rk = 0; rk < 7; rk += 1) {
      const a = (rk / 7) * Math.PI * 2.0 + 0.3;
      const bx = poolX + Math.cos(a) * (2.25 + (rk % 2) * 0.55);
      const bz = poolZ + Math.sin(a) * (2.25 + (rk % 2) * 0.55);
      const rock = new THREE.Mesh(
        makeStoneRockGeometry(0.45 + (rk % 3) * 0.18, rk + 3),
        basaltStoneMat
      );
      rock.position.set(bx, evalRaiateaPoint(bx, bz).h + 0.12, bz);
      rock.rotation.y = a;
      group.add(rock);
    }

    // 5. Exclusion Zones around Walkable Spawn, Summit Observation Circle & Marae/Landing
    // Convert walkable coordinates to canonical (invert raiatea rotY = -0.44 - PI/2)
    const rotY = -0.44 - Math.PI * 0.5;
    const toCanonXZ = (wx, wz) => {
      const c = Math.cos(-rotY);
      const s = Math.sin(-rotY);
      return [wx * c + wz * s, -wx * s + wz * c];
    };
    const [spawnCx, spawnCz] = toCanonXZ(-12.5, 73.5);
    const [landCx, landCz] = toCanonXZ(-18.5, 78.5);
    const [hutCx, hutCz] = toCanonXZ(-36.0, 66.0);
    const blockedZones = [
      { x: 0.0, z: 0.0, r: 12.5 }, // Observation Circle hilltop plateau clear of trees
      { x: spawnCx, z: spawnCz, r: 9.0 }, // Initial spawn dry beach clearing
      { x: landCx, z: landCz, r: 7.5 }, // Moored canoe beachhead clearing
      { x: hutCx, z: hutCz, r: 6.0 }, // Provisioning hut arrival clearing
      { x: capeX, z: capeZ, r: 12.0 }, // Sacred Marae Taputapuatea plaza
    ];
    const isClear = (px, pz) => {
      for (const bz of blockedZones) {
        if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
      }
      return true;
    };

    // Sculpted Boatbuilders' & Village Fare cluster flanking the western bay
    const villageHuts = [
      [toCanonXZ(-40.5, 63.0)[0], toCanonXZ(-40.5, 63.0)[1], 1.15, 1.05, true],
      [toCanonXZ(-45.5, 56.5)[0], toCanonXZ(-45.5, 56.5)[1], 0.85, 0.94, false],
      [toCanonXZ(-32.5, 54.0)[0], toCanonXZ(-32.5, 54.0)[1], 1.35, 0.92, false],
    ].map(([hx, hz, yaw, sc, longHouse]) => ({
      x: hx,
      y: Math.max(0.75, evalRaiateaPoint(hx, hz).h),
      z: hz,
      rotY: yaw,
      scale: sc,
      longHouse,
    }));
    addRegionalHuts(group, trackMat, villageHuts, 'society');

    // 6. Lush Lowland Broadleaf 'Uru & Valley Trees (filtered cleanly from trails, spawn & summit)
    const broadleafPts = [];
    for (let i = 0; i < 14; i += 1) {
      const ang = (i / 14) * Math.PI * 2.0 + 0.22;
      const br = 44.0 + (i % 3) * 8.5;
      const bx = br * Math.cos(ang);
      const bz = br * Math.sin(ang);
      const py = evalRaiateaPoint(bx, bz).h;
      if (py > 2.2 && py < 16.0 && isClear(bx, bz)) {
        broadleafPts.push([bx, py - 0.15, bz, 0.95 + (i % 3) * 0.16, -ang]);
      }
    }
    addBroadleafTrees(group, trackMat, broadleafPts, {
      trunkHex: 0x5c3e26,
      canopyHexA: 0x265c24,
      canopyHexB: 0x3b762a,
    });

    // 7. Coastal, Bay & Outer-Motu Coconut Palm Groves (filtered cleanly from spawn & circle)
    const palmSites = [];
    for (let i = 0; i < 24; i += 1) {
      const ang = (i / 24) * Math.PI * 2.0 + 0.08;
      const pr = 64.0 + (i % 3) * 4.5;
      const px = pr * Math.cos(ang);
      const pz = pr * Math.sin(ang);
      const py = evalRaiateaPoint(px, pz).h;
      if (py > 0.65 && py < 10.5 && isClear(px, pz)) {
        palmSites.push([px, py - 0.18, pz, -ang, 0.95 + (i % 3) * 0.12, 0.2]);
      }
    }
    for (const [mx, mz, mAng] of raiateaMotuPositions) {
      palmSites.push([mx, 0.92, mz, -mAng + 0.3, 0.92, 0.22]);
      palmSites.push([
        mx - 2.6 * Math.sin(mAng),
        0.88,
        mz + 2.6 * Math.cos(mAng),
        -mAng - 0.35,
        0.84,
        0.24,
      ]);
    }
    addCoconutGroves(group, trackMat, palmSites);

    return { group, materials, sinkDepthM: 88.0 };
  }

  if (islandId === 'manuae') {
    // 1. Sculpted 2x Coral Atoll Ring, Segmented Motu Necklace, Hoa Channels & Central Lagoon Floor
    const atollGeo = createSculptedAtollTerrainGeometry(
      evalManuaePoint,
      122.0,
      92,
      136
    );
    const atollMesh = new THREE.Mesh(atollGeo, terrainMat);
    atollMesh.receiveShadow = true;
    group.add(atollMesh);

    // 2. Translucent Jade-Turquoise Organic Inner Lagoon Shimmer (follows inner motu beaches cleanly)
    const atollLagoonMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x2ae3cc,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    atollLagoonMat.userData.baseOpacity = 0.34;
    const evalManuaeInnerLagoonR = (th) =>
      evalManuaeGeometryProfile(th).innerToeR + 2.0;
    const innerLagoonDisc = new THREE.Mesh(
      createOrganicLagoonGeometry(evalManuaeInnerLagoonR, 108),
      atollLagoonMat
    );
    innerLagoonDisc.position.y = 0.265;
    group.add(innerLagoonDisc);

    // 3. Organic Outer Breaking Surf Rim with Open Navigable Te Ava Reef Pass around theta = 0
    const evalManuaeOuterReefR = (th) =>
      evalManuaeGeometryProfile(th).reefEdgeR - 2.2;
    addOrganicBarrierReefArc(
      group,
      reefSandMat,
      surfFoamMat,
      evalManuaeOuterReefR,
      0.24,
      Math.PI * 2.0 - 0.24,
      96
    );

    // Hooked pass-shoulder surf foam ribbons flanking the Te Ava entrance jaws
    const jawFoamGeo = new THREE.BoxGeometry(10.5, 0.12, 2.1);
    for (const [ang, tilt] of [
      [-0.22, 0.42],
      [0.22, -0.42],
    ]) {
      const jr = evalManuaeOuterReefR(ang) - 4.5;
      const jf = new THREE.Mesh(jawFoamGeo, surfFoamMat);
      jf.position.set(jr * Math.cos(ang), 0.29, jr * Math.sin(ang));
      jf.rotation.y = -ang + tilt;
      group.add(jf);
    }

    // Walkable POI / spawn exclusion zones in canonical coords (rotY = -PI/2 -> cx = wz, cz = -wx)
    const manuaeBlocked = [
      { x: 77.5, z: 34.5, r: 11.2 }, // Initial spawn beach clearing on Motu 5 (leaves palm crowns >= 6.5m away)
      { x: 69.5, z: 44.5, r: 7.5 }, // Quiet Coral Lagoon Landing clearing
      { x: 8.0, z: 65.5, r: 6.8 }, // Motu Palm Shelter clearing on Motu 4
      { x: 52.5, z: -31.5, r: 7.8 }, // Wild Seabird Rookery & Pearl Shallows clearing
      { x: 32.4, z: -35.4, r: 12.5 }, // Navigator's Sand Ring Observation Circle
      { x: MANUAE_MARAE_X, z: MANUAE_MARAE_Z, r: 6.5 }, // Pass-Point Marae stone courtyard
    ];
    const manuaeIsClear = (px, pz, pad = 0.0) => {
      for (const bz of manuaeBlocked) {
        if (Math.hypot(px - bz.x, pz - bz.z) < bz.r + pad) return false;
      }
      return true;
    };

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

    const canoeHullMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x8b522c,
        roughness: 0.78,
        transparent: true,
        opacity: 1.0,
      })
    );

    // 5. Twin Stacked White-Coral Pass Marker Cairns (Ti'ahu Ava) on Both Pass Shoulders
    for (const cTheta of [-0.27, 0.25]) {
      const cRad = evalManuaeGeometryProfile(cTheta).ringR - 3.5;
      const cx = cRad * Math.cos(cTheta);
      const cz = cRad * Math.sin(cTheta);
      const cy = Math.max(0.32, evalManuaePoint(cx, cz).h);
      const cairn = createCoralCairnGroup(trackMat);
      cairn.group.position.set(cx, cy, cz);
      cairn.group.rotation.y = cTheta + 0.5;
      group.add(cairn.group);
    }

    // 6. Polynesian Atoll Lagoon Village on Motu 1 (Facing the Calm Central Lagoon & Pass)
    // 6a. Grand Communal Fare Pote'e (Oval-ended pandanus meeting house on raised coral curb)
    const poteeTheta = -1.35;
    const poteeR = evalManuaeGeometryProfile(poteeTheta).innerToeR + 9.0;
    const poteeX = poteeR * Math.cos(poteeTheta);
    const poteeZ = poteeR * Math.sin(poteeTheta);
    const poteeY = evalManuaePoint(poteeX, poteeZ).h;

    const potee = new THREE.Group();
    potee.position.set(poteeX, poteeY, poteeZ);
    potee.rotation.y = -poteeTheta;

    const coralPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 1.35, 7.7),
      coralStoneMat
    );
    coralPlinth.position.y = -0.25;
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
      [-1.16, 7.5, 0.96, 0.08, true],
      [-1.24, 10.0, 1.04, -0.06, false],
      [-1.44, 8.0, 1.0, 0.05, true],
      [-1.53, 10.5, 0.92, -0.1, false],
      [-1.62, 8.2, 0.88, 0.12, true],
    ];
    const farePlinthGeo = new THREE.BoxGeometry(2.9, 1.1, 3.7);
    const fareWallGeo = new THREE.BoxGeometry(2.45, 1.38, 3.25);
    const fareRoofGeo = new THREE.ConeGeometry(2.48, 1.78, 4);

    for (const [fang, innerOff, fscale, yawJitter, warmRoof] of fareDefs) {
      const fr = evalManuaeGeometryProfile(fang).innerToeR + innerOff;
      const fx = fr * Math.cos(fang);
      const fz = fr * Math.sin(fang);
      if (!manuaeIsClear(fx, fz)) continue;
      const fy = evalManuaePoint(fx, fz).h;

      const fare = new THREE.Group();
      fare.position.set(fx, fy, fz);
      fare.rotation.y = -fang + yawJitter;
      fare.scale.setScalar(fscale);

      const plinth = new THREE.Mesh(farePlinthGeo, weatheredCoralMat);
      plinth.position.y = -0.28;
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
    const pierTheta = -1.28;
    const pierCenterR = evalManuaeGeometryProfile(pierTheta).innerToeR - 3.2;
    const pier = new THREE.Group();
    pier.position.set(
      pierCenterR * Math.cos(pierTheta),
      0.74,
      pierCenterR * Math.sin(pierTheta)
    );
    pier.rotation.y = -pierTheta;

    const pierDeck = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.22, 1.75),
      aitoTimberMat
    );
    pier.add(pierDeck);

    const pilingGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.15, 6);
    for (const lx of [-4.4, -2.2, 0.0, 2.2, 4.4]) {
      for (const lz of [-0.68, 0.68]) {
        const pile = new THREE.Mesh(pilingGeo, aitoTimberMat);
        pile.position.set(lx, -0.45, lz);
        pier.add(pile);
      }
    }
    group.add(pier);

    // 6d. Two Traditional Lagoon Outrigger Canoes (Va'a): One Moored at Pier, One Beached
    const moorR = evalManuaeGeometryProfile(pierTheta + 0.08).innerToeR - 7.5;
    addLagoonOutriggerCanoe(
      group,
      canoeHullMat,
      aitoTimberMat,
      moorR * Math.cos(pierTheta + 0.08),
      0.32,
      moorR * Math.sin(pierTheta + 0.08),
      -pierTheta + Math.PI * 0.5,
      1.0
    );
    const beachCanoeTheta = -1.42;
    const beachCanoeR = evalManuaeGeometryProfile(beachCanoeTheta).innerToeR + 2.8;
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

    // 6e. Pass-Point Coral-Slab Marae (Sculpted Stepped White-Coral Ahu & Upright Orthostats)
    const my = evalManuaePoint(MANUAE_MARAE_X, MANUAE_MARAE_Z).h;
    addMaraePlatform(group, trackMat, {
      x: MANUAE_MARAE_X,
      y: my,
      z: MANUAE_MARAE_Z,
      rotY: -MANUAE_MARAE_THETA,
      scale: 0.78,
      courtHex: 0xbab09c,
      ahuHex: 0xe6decb,
    });

    const sharedPearlValveGeo = createGiantPearlValveGeometry();
    const sharedGiantShellMat = trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.34,
        metalness: 0.22,
        transparent: true,
        opacity: 1.0,
      })
    );

    // 6f. Pearl-Shell Drying Racks & Glowing Coral-Ring Village Hearth (Ahi)
    for (const rTheta of [-1.2, -1.5]) {
      const rr = evalManuaeGeometryProfile(rTheta).innerToeR + 4.8;
      const rx = rr * Math.cos(rTheta);
      const rz = rr * Math.sin(rTheta);
      if (!manuaeIsClear(rx, rz)) continue;
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
        const hangingShell = createGiantPearlShellGroup(trackMat, {
          mode: 'single_valve',
          scale: 0.34,
          sharedValveGeo: sharedPearlValveGeo,
          sharedShellMat: sharedGiantShellMat,
        });
        hangingShell.group.rotation.set(Math.PI * 0.48, 0.0, Math.PI * 0.5);
        hangingShell.group.position.set(0.02, 0.96, zShell);
        rack.add(hangingShell.group);
      }
      group.add(rack);
    }

    // 6g. Sculpted Giant Pearl Shells resting across Manuae's Pearl Shallows & Coral Lagoon Cove
    const giantShellSpecs = [
      // Wild Seabird Rookery & Pearl Shallows (Motu 1 inner lagoon beach)
      { innerOff: 2.8, theta: -0.46, mode: 'open_pearl', pearlType: 'cream', scale: 0.92, openAngle: 0.82, rotY: 2.35 },
      { innerOff: 0.6, theta: -0.51, mode: 'open_pearl', pearlType: 'black', scale: 0.78, openAngle: 0.72, rotY: 2.85 },
      { innerOff: 4.0, theta: -0.41, mode: 'single_valve', scale: 0.72, rotY: 1.92 },
      { innerOff: -0.4, theta: -0.61, mode: 'open', scale: 0.8, openAngle: 0.64, rotY: 2.55 },
      { innerOff: 3.4, theta: -0.66, mode: 'open_pearl', pearlType: 'gold', scale: 0.68, openAngle: 0.78, rotY: 2.15 },
      // Motu 5 Calm Lagoon Cove & Motu Palm Shelter flats
      { innerOff: 2.2, theta: 0.65, mode: 'open_pearl', pearlType: 'cream', scale: 0.85, openAngle: 0.8, rotY: -2.1 },
      { innerOff: 0.2, theta: 0.7, mode: 'open', scale: 0.72, openAngle: 0.68, rotY: -2.55 },
      { innerOff: 2.5, theta: 0.76, mode: 'open_pearl', pearlType: 'black', scale: 0.76, openAngle: 0.76, rotY: -1.75 },
    ];
    const giantShellSpots = giantShellSpecs.map((sp) => ({
      ...sp,
      r: evalManuaeGeometryProfile(sp.theta).innerToeR + sp.innerOff,
    }));
    // 2 shells resting directly on the central bleached-white lagoon Rookery Sandbar
    giantShellSpots.push(
      { r: 16.8, theta: -2.28, mode: 'open_pearl', pearlType: 'black', scale: 0.88, openAngle: 0.85, rotY: 1.65 },
      { r: 14.5, theta: -2.42, mode: 'single_valve', scale: 0.68, rotY: 0.95 }
    );
    for (const sp of giantShellSpots) {
      const sx = sp.r * Math.cos(sp.theta);
      const sz = sp.r * Math.sin(sp.theta);
      if (!manuaeIsClear(sx, sz, 1.5)) continue;
      const sy = Math.max(-0.14, evalManuaePoint(sx, sz).h);
      const gs = createGiantPearlShellGroup(trackMat, {
        mode: sp.mode,
        scale: sp.scale,
        openAngleRad: sp.openAngle ?? 0.78,
        pearlType: sp.pearlType || 'cream',
        sharedValveGeo: sharedPearlValveGeo,
        sharedShellMat: sharedGiantShellMat,
      });
      gs.group.position.set(sx, sy + 0.02, sz);
      gs.group.rotation.y = sp.rotY;
      group.add(gs.group);
    }

    const hearthTheta = -1.32;
    const hearthR = evalManuaeGeometryProfile(hearthTheta).innerToeR + 6.5;
    const hrx = hearthR * Math.cos(hearthTheta);
    const hrz = hearthR * Math.sin(hearthTheta);
    const hry = evalManuaePoint(hrx, hrz).h;
    const manuaeHearth = createVillageHearthGroup(trackMat, { scale: 0.95 });
    manuaeHearth.group.position.set(hrx, hry, hrz);
    group.add(manuaeHearth.group);

    // 7. Dense Wind-Leaning Atoll Coconut Groves & Littoral Naupaka/Pandanus Scrub across all 5 Motu
    const palmSites = [];
    const scrubSites = [];

    const motuSampleAngles = [
      // Motu 1 (Main Village Crescent)
      [-0.32, 0.2, 1.05, 0.28],
      [-0.43, 1.0, 1.12, 0.22],
      [-0.56, 0.2, 1.08, 0.18],
      [-0.64, 1.8, 0.96, 0.2],
      [-0.76, 0.4, 1.15, 0.17],
      [-0.88, 1.4, 1.1, 0.22],
      [-1.02, 0.6, 1.14, 0.19],
      [-1.12, -4.5, 0.94, 0.32],
      [-1.24, 1.6, 1.08, 0.21],
      [-1.38, 1.2, 1.12, 0.24],
      [-1.46, -4.0, 0.92, 0.3],
      [-1.62, 0.8, 1.06, 0.22],
      [-1.76, -1.0, 1.0, 0.26],
      [-1.9, 0.6, 1.04, 0.2],
      [-2.04, 0.0, 0.95, 0.25],
      // Motu 2 (Far Rookery Islet)
      [-2.44, 0.2, 0.96, 0.24],
      [-2.58, 1.2, 1.06, 0.2],
      [-2.72, -0.4, 1.02, 0.26],
      [-2.88, 0.8, 0.92, 0.22],
      // Motu 3 (Leeward Coconut Islet)
      [2.38, 0.2, 0.98, 0.24],
      [2.54, 1.4, 1.1, 0.2],
      [2.68, -0.3, 1.04, 0.27],
      [2.84, 1.0, 0.94, 0.22],
      [2.94, 0.2, 0.88, 0.25],
      // Motu 4 (Pandanus Islet)
      [1.18, 0.4, 0.96, 0.25],
      [1.34, 1.6, 1.08, 0.2],
      [1.48, -0.2, 1.12, 0.26],
      [1.64, 1.2, 1.02, 0.21],
      [1.78, 0.2, 0.98, 0.24],
      [1.9, 0.8, 0.9, 0.22],
      // Motu 5 (Port Pass-Shoulder Islet)
      [0.34, 0.8, 1.04, 0.3],
      [0.46, 2.0, 1.12, 0.22],
      [0.58, 0.6, 1.06, 0.26],
      [0.72, 1.6, 0.98, 0.2],
      [0.82, 0.4, 0.9, 0.24],
    ];

    for (let i = 0; i < motuSampleAngles.length; i += 1) {
      const [ang, rOff, sc, lean] = motuSampleAngles[i];
      const rad = evalManuaeGeometryProfile(ang).ringR + rOff;
      const px = rad * Math.cos(ang);
      const pz = rad * Math.sin(ang);
      if (!manuaeIsClear(px, pz)) continue;
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
    addCoconutGroves(group, trackMat, palmSites);

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
      const srad = evalManuaeGeometryProfile(sang).ringR + 2.4 + ((i % 3) - 1) * 1.8;
      const sx = srad * Math.cos(sang);
      const sz = srad * Math.sin(sang);
      if (!manuaeIsClear(sx, sz)) continue;
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
    addCoastalScrub(group, trackMat, scrubSites, {
      hexA: 0x2f6827,
      hexB: 0x447c2e,
    });

    return { group, materials, sinkDepthM: 24.0 };
  }

  // =========================================================================
  // TAHA'A ("Sheltered Lagoon Isle" — 2x canonical scale)
  // =========================================================================
  const terrainGeo = createSculptedIslandTerrainGeometry(
    evalTahaaPoint,
    122.0,
    COL_BEACH_CREAM,
    { nRings: 88, nSegs: 120 }
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Wide Sheltered Turquoise Lagoon & Organic Outer Reef with Pearl-Sand Motu Islets
  const lagoonDisc = new THREE.Mesh(
    createOrganicLagoonGeometry(evalTahaaReefRadius, 108),
    lagoonSurfaceMat
  );
  lagoonDisc.position.y = 0.16;
  group.add(lagoonDisc);

  addOrganicBarrierReefArc(
    group,
    reefSandMat,
    surfFoamMat,
    evalTahaaReefRadius,
    0.72,
    Math.PI * 1.45,
    60
  );
  addOrganicBarrierReefArc(
    group,
    reefSandMat,
    surfFoamMat,
    evalTahaaReefRadius,
    Math.PI * 1.58,
    Math.PI * 2.08,
    28
  );

  // Convert walkable POI / spawn positions into canonical Taha'a coords (rotY = bayTheta - 0.14 - PI/2)
  const bayTheta = (Math.PI - 0.55) / 5.0;
  const tahaaRotY = bayTheta - 0.14 - Math.PI * 0.5;
  const tahaaToCanon = (wx, wz) => {
    const c = Math.cos(-tahaaRotY);
    const s = Math.sin(-tahaaRotY);
    return [wx * c + wz * s, -wx * s + wz * c];
  };
  const [tSpawnCx, tSpawnCz] = tahaaToCanon(4.5, 59.5);
  const [tLandCx, tLandCz] = tahaaToCanon(-2.5, 63.5);
  const [tHutCx, tHutCz] = tahaaToCanon(-24.0, 48.0);
  const [tElderCx, tElderCz] = tahaaToCanon(26.5, 52.0);
  const tahaaBlocked = [
    { x: 0.0, z: 0.0, r: 12.5 }, // Mount Ohiri summit Observation Circle
    { x: tSpawnCx, z: tSpawnCz, r: 8.5 }, // Beach spawn clearing
    { x: tLandCx, z: tLandCz, r: 7.5 }, // Bay jetty & landing clearing
    { x: tHutCx, z: tHutCz, r: 6.5 }, // Provisioning fare arrival
    { x: tElderCx, z: tElderCz, r: 6.5 }, // Hina's hillside hearth arrival
  ];
  const tahaaIsClear = (px, pz) => {
    for (const bz of tahaaBlocked) {
      if (Math.hypot(px - bz.x, pz - bz.z) < bz.r) return false;
    }
    return true;
  };

  // 3 sculpted organic pearl-sand Motu islets with coconut palms hugging the lagoon rim
  const motuDefs = [
    [0.76, 10.2, 6.8, 2.4],
    [2.54, 9.0, 9.6, 5.7],
    [-1.1, 10.6, 6.5, 8.2],
  ];
  const palmSites = [];
  for (const [mAng, rx, rz, seed] of motuDefs) {
    const mr = evalTahaaReefRadius(mAng) - 2.0;
    const mx = mr * Math.cos(mAng);
    const mz = mr * Math.sin(mAng);
    const motu = new THREE.Mesh(
      createOrganicMotuGeometry({ radiusX: rx, radiusZ: rz, height: 1.35, seed }),
      reefSandMat
    );
    motu.position.set(mx, 0.35, mz);
    motu.rotation.y = -mAng + Math.PI * 0.5;
    group.add(motu);
    palmSites.push([mx, 0.85, mz, -mAng + 0.25, 0.95, 0.22]);
    palmSites.push([
      mx - 2.9 * Math.sin(mAng),
      0.82,
      mz + 2.9 * Math.cos(mAng),
      -mAng - 0.3,
      0.82,
      0.24,
    ]);
  }

  // Sculpted Society-style Fare Huts overlooking the sheltered village bay (kept clear of spawn)
  const villageHuts = [
    [tahaaToCanon(-29.5, 44.5)[0], tahaaToCanon(-29.5, 44.5)[1], -bayTheta + 0.4, 1.08, true],
    [tahaaToCanon(-32.0, 51.0)[0], tahaaToCanon(-32.0, 51.0)[1], -bayTheta - 0.1, 0.95, false],
    [tahaaToCanon(-20.5, 40.5)[0], tahaaToCanon(-20.5, 40.5)[1], -bayTheta + 0.25, 0.96, false],
    [tahaaToCanon(32.0, 51.0)[0], tahaaToCanon(32.0, 51.0)[1], -bayTheta - 0.35, 1.02, false],
  ].map(([hx, hz, rotY, sc, longHouse]) => ({
    x: hx,
    y: Math.max(0.7, evalTahaaPoint(hx, hz).h),
    z: hz,
    rotY,
    scale: sc,
    longHouse,
  }));
  addRegionalHuts(group, trackMat, villageHuts, 'society');

  // Hina's Glowing Hillside Village Hearth beside her sanctuary fare
  const [hinaHearthX, hinaHearthZ] = tahaaToCanon(29.5, 54.0);
  const hinaHearth = createVillageHearthGroup(trackMat, { scale: 1.05 });
  hinaHearth.group.position.set(
    hinaHearthX,
    Math.max(0.8, evalTahaaPoint(hinaHearthX, hinaHearthZ).h),
    hinaHearthZ
  );
  group.add(hinaHearth.group);

  // Sculpted Fisher's Timber Lagoon Pier & Moored Outrigger Va'a Canoe
  const pierR = 54.5;
  addTimberPier(group, trackMat, {
    x: pierR * Math.cos(bayTheta + 0.08),
    y: 0.68,
    z: pierR * Math.sin(bayTheta + 0.08),
    rotY: -(bayTheta + 0.08),
    length: 10.5,
    width: 1.75,
  });
  addOutriggerCanoe(group, trackMat, {
    x: (pierR + 5.5) * Math.cos(bayTheta + 0.16),
    y: 0.3,
    z: (pierR + 5.5) * Math.sin(bayTheta + 0.16),
    rotY: -(bayTheta + 0.16) + Math.PI * 0.5,
  });

  // Broadleaf Vanilla & Breadfruit Grove on Lower Slopes (cleared from spawn & circle)
  const tahaaTrees = [];
  for (let i = 0; i < 14; i += 1) {
    const ang = (i / 14) * Math.PI * 2.0 + 0.18;
    const br = 38.0 + (i % 3) * 8.0;
    const bx = br * Math.cos(ang);
    const bz = br * Math.sin(ang);
    const by = evalTahaaPoint(bx, bz).h;
    if (by > 2.2 && by < 16.0 && tahaaIsClear(bx, bz)) {
      tahaaTrees.push([bx, by - 0.15, bz, 0.92 + (i % 3) * 0.14, -ang]);
    }
  }
  addBroadleafTrees(group, trackMat, tahaaTrees, {
    trunkHex: 0x5c3e26,
    canopyHexA: 0x265e26,
    canopyHexB: 0x3b782c,
  });

  // Coastal Coconut Palms ringing Taha'a's 5 bays & headlands (filtered from spawn & trails)
  for (let b = 0; b < 5; b += 1) {
    const lobeAng = (b * Math.PI * 2.0 - 0.55) / 5.0;
    const coveAng = lobeAng + Math.PI / 5.0;
    for (const [ang, pr] of [
      [lobeAng - 0.12, 68.0],
      [lobeAng + 0.14, 65.0],
      [coveAng - 0.16, 48.0],
      [coveAng + 0.16, 48.0],
    ]) {
      const px = pr * Math.cos(ang);
      const pz = pr * Math.sin(ang);
      const py = evalTahaaPoint(px, pz).h;
      if (py > 0.6 && py < 10.5 && tahaaIsClear(px, pz)) {
        palmSites.push([px, py - 0.15, pz, -ang, 0.92 + (palmSites.length % 3) * 0.1, 0.2]);
      }
    }
  }
  addCoconutGroves(group, trackMat, palmSites);

  return { group, materials, sinkDepthM: 84.0 };
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
  'rapa_nui',
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
    case 'rapa_nui':
      // Aligns the grand upright Moai coastline (Ahu Tongariki, Rano Raraku, Akahanga & Vaihu) toward +Z
      return -0.409;
    default:
      // All other sculpted islands center their primary reef pass / bay entrance on theta = 0
      return -Math.PI * 0.5;
  }
}

const ISLAND_SHORE_RADIUS_M = Object.freeze({
  raiatea: 80.5,
  tahaa: 65.5,
  huahine: 63.5,
  manuae: 65.5,
  moorea: 76.0,
  maupiti: 60.5,
  nuku_hiva: 59.5,
  ua_pou: 33.5,
  rangiroa: 41.5,
  hiva_oa: 32.0,
  fatu_hiva: 30.0,
  mangareva: 34.5,
  kauai: 35.5,
  oahu: 34.5,
  kiritimati: 36.5,
  hawaii: 74.5,
  rapa_nui: 55.0,
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
