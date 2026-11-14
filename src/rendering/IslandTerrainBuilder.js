/**
 * Procedural 3D Volcanic Lagoon Terrain & Landmark Builder for Detailed Islands:
 * - Ra'iatea ("Sacred High Island"): Flat-topped sacred Mount Temehani plateau, 7 knife-edge
 *   radial basalt ridges & lush amphitheater valleys, waterfall cascade, crescent coral-sand
 *   beaches, Marae Taputapuatea ceremonial stone platform on the sacred headland, fringing
 *   turquoise lagoon, coconut palm groves & barrier reef with Te Ava Mo'a pass.
 * - Taha'a ("Sheltered Lagoon Isle"): Scalloped clover-leaf coastline with 5 deep calm fjord
 *   bays & rounded peninsulas, gentler Mount Ohiri eroded shield peaks, wide cream-sand bay
 *   beaches, thatched Polynesian hillside & shore fare huts, wooden canoe jetty & lagoon motu islets.
 */

import * as THREE from 'three';

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

/**
 * Builds a complete sculpted 3D island assembly for 'raiatea' or 'tahaa',
 * returning { group, materials, sinkDepthM } so WorldCuesRenderer can fade & rise it seamlessly.
 */
export function createDetailedIslandAssembly(islandId) {
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

  addBarrierReefArc(group, reefSandMat, surfFoamMat, 53.5, 0.25, Math.PI * 1.45, 28);
  addBarrierReefArc(group, reefSandMat, surfFoamMat, 53.5, Math.PI * 1.58, Math.PI * 2.12, 14);

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

export function hasDetailedIslandModel(islandId) {
  return islandId === 'raiatea' || islandId === 'tahaa';
}
