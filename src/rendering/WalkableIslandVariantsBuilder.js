/**
 * Custom 3D Terrain Evaluators, Landmarks, Monuments & Ashore NPC Builders for
 * Walkable Islands beyond Ra'iatea:
 *  - `tahaa`    ("Sheltered Lagoon Isle" — 5-lobed clover bay, Hina & Fisher Tama, distant Ra'iatea)
 *  - `hawaii`   ("Ancestral Mauna Horizon" — Snow-capped Mauna, glowing Kilauea lava & Great Heiau)
 *  - `rapa_nui` ("Te Pito o Te Henua" — Anakena Cove, Hare Paenga, Te Pito Kura & 5-Moai Ahu Tongariki)
 */

import * as THREE from 'three';
import { Difficulty } from '../core/gameConstants.js';
import { createSculptedCloudMesh } from './CloudSculptBuilder.js';
import { createPlayerCharacterRig } from './PlayerCharacterBuilder.js';

function clamp01(v) {
  return Math.max(0.0, Math.min(1.0, v));
}

function smoothstep(e0, e1, x) {
  if (Math.abs(e1 - e0) < 1e-6) return x >= e1 ? 1.0 : 0.0;
  const t = clamp01((x - e0) / (e1 - e0));
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

function distToSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 1e-6 ? clamp01((wx * vx + wz * vz) / lenSq) : 0.0;
  const cx = ax + t * vx;
  const cz = az + t * vz;
  return Math.hypot(px - cx, pz - cz);
}

function evalSegmentsMask(x, z, segments) {
  let minD = 999.0;
  for (let i = 0; i < segments.length; i += 1) {
    const [ax, az, bx, bz] = segments[i];
    const d = distToSegment2D(x, z, ax, az, bx, bz);
    if (d < minD) minD = d;
  }
  return 1.0 - smoothstep(1.15, 2.25, minD);
}

function applySharedPoiPadsAndRamps(x, z, h, u, spec) {
  const hutPoi = spec.pois[1];
  const circlePoi = spec.pois[2];
  const elderPoi = spec.pois[3];
  const spawn = spec.initialSpawn;

  // 1. Level clearing for Provisioning Hut / Canoe Shed / Hare Paenga
  const dHut = Math.hypot(x - hutPoi.x, z - hutPoi.z);
  const hutPad = 1.0 - smoothstep(5.8, 12.5, dHut);
  if (hutPad > 0.001) {
    h = lerp(h, 2.2, hutPad * 0.93);
  }

  // 2. Breezy Coastal Knoll for Observation Circle
  const dKnoll = Math.hypot(x - circlePoi.x, z - circlePoi.z);
  const knollTop = 1.0 - smoothstep(5.4, 13.8, dKnoll);
  if (knollTop > 0.001) {
    h = lerp(h, 6.45, knollTop * 0.94);
  }

  // Smooth walkable ramp shoulders connecting Beach, Hut & Sanctuary to Observation Knoll
  const forkX = (spawn.x + hutPoi.x) * 0.5;
  const forkZ = (spawn.z + hutPoi.z) * 0.5;
  const rampMask =
    Math.max(
      1.0 - smoothstep(2.4, 7.2, distToSegment2D(x, z, forkX, forkZ, circlePoi.x, circlePoi.z)),
      1.0 - smoothstep(2.4, 7.2, distToSegment2D(x, z, hutPoi.x, hutPoi.z, circlePoi.x, circlePoi.z)),
      1.0 - smoothstep(2.4, 7.2, distToSegment2D(x, z, elderPoi.x, elderPoi.z, circlePoi.x, circlePoi.z))
    ) *
    (1.0 - knollTop);
  if (rampMask > 0.01) {
    const rampTarget = lerp(6.45, 2.3, clamp01((z - circlePoi.z) / 14.5));
    h = lerp(h, rampTarget, rampMask * 0.9);
  }

  // 3. Flat Terrace for Sanctuary / Hearth / Heiau / Ahu Tongariki
  const dMarae = Math.hypot((x - elderPoi.x) * 0.9, (z - elderPoi.z) * 0.85);
  const maraePad = 1.0 - smoothstep(8.2, 16.0, dMarae);
  if (maraePad > 0.001) {
    h = lerp(h, 2.65, maraePad * 0.95);
  }

  // 4. Sheltered Landing Cove beside Moored Canoe & Player Spawn
  const dLanding = Math.hypot((x - (spawn.x - 1.4)) * 0.85, (z - (spawn.z - 0.5)) * 1.05);
  const landingPad = 1.0 - smoothstep(4.6, 11.2, dLanding);
  if (landingPad > 0.001 && u < 0.985) {
    const targetBeachH = lerp(1.25, 0.25, smoothstep(0.85, 0.99, u));
    h = lerp(h, targetBeachH, landingPad * 0.8);
  }

  return { h, hutPad, knollTop, maraePad };
}

function buildFootpathSegmentsForSpec(spec) {
  const canoe = spec.pois[0];
  const hut = spec.pois[1];
  const circle = spec.pois[2];
  const elder = spec.pois[3];
  const sp = spec.initialSpawn;
  const forkX = (sp.x + hut.x) * 0.5 + 2.2;
  const forkZ = (sp.z + hut.z) * 0.5;
  return [
    [canoe.x + 0.6, canoe.z - 0.6, sp.x, sp.z],
    [sp.x, sp.z, forkX, forkZ],
    [forkX, forkZ, hut.x, hut.z],
    [forkX, forkZ, (forkX + circle.x) * 0.5, (forkZ + circle.z) * 0.5],
    [(forkX + circle.x) * 0.5, (forkZ + circle.z) * 0.5, circle.x, circle.z],
    [hut.x, hut.z, (hut.x + circle.x) * 0.5, (hut.z + circle.z) * 0.5 + 1.2],
    [(hut.x + circle.x) * 0.5, (hut.z + circle.z) * 0.5 + 1.2, circle.x, circle.z],
    [circle.x, circle.z, (circle.x + elder.x) * 0.5, (circle.z + elder.z) * 0.5 - 0.8],
    [(circle.x + elder.x) * 0.5, (circle.z + elder.z) * 0.5 - 0.8, elder.x, elder.z],
    [sp.x, sp.z, 7.8, sp.z - 3.6],
    [7.8, sp.z - 3.6, elder.x, elder.z],
  ];
}

// ============================================================================
// 1. TAHA'A — Clover-Leaf Lagoon Isle, Hina & Fisher Tama
// ============================================================================
export function createTahaaTerrainEvaluator(spec) {
  const paths = buildFootpathSegmentsForSpec(spec);
  return (x, z) => {
    const mx = x * 1.03;
    const mz = (z + 5.0) * 0.97;
    const r = Math.hypot(mx, mz);
    const theta = Math.atan2(mz, mx);

    // Signature 5-lobed clover-leaf shoreline with sheltered bays & rounded peninsulas
    const bayLobe = Math.cos(5.0 * theta - 1.15);
    const hearthCape = 7.8 * Math.exp(-Math.pow(Math.atan2(Math.sin(theta - 1.02), Math.cos(theta - 1.02)) / 0.34, 2.0));
    const landingCove = 4.6 * Math.exp(-Math.pow(Math.atan2(Math.sin(theta - 1.78), Math.cos(theta - 1.78)) / 0.32, 2.0));
    const coastR = 57.5 + 5.8 * bayLobe + hearthCape + landingCove;
    const u = r / coastR;

    if (u >= 1.0) {
      return {
        h: -3.1 * smoothstep(1.0, 1.42, u),
        u,
        pathMask: 0.0,
        ridgeFactor: 0.0,
        zone: 'lagoon',
        lavaGlow: 0.0,
        snowCap: 0.0,
      };
    }

    const inland = 1.0 - u;
    const villageSide = smoothstep(-6.0, 26.0, z);
    const dome = 54.0 * Math.pow(smoothstep(0.04, 0.9, inland), lerp(1.36, 1.88, villageSide));

    // Twin-saddle Mount Ohiri & Mount Puurauti green summits
    const ohiri = 8.5 * Math.exp(-Math.pow(Math.hypot(mx - 6.5, mz + 5.0) / 14.0, 2.0));
    const puurauti = 6.8 * Math.exp(-Math.pow(Math.hypot(mx + 10.5, mz - 3.5) / 12.5, 2.0));
    const lobeRidge = Math.pow(0.5 + 0.5 * Math.cos(5.0 * theta - 1.15), 1.4);
    const ridgeEnv = smoothstep(0.14, 0.44, inland) * (1.0 - 0.55 * villageSide * smoothstep(0.4, 0.14, inland));
    let h = Math.max(0.05, dome + ohiri + puurauti + (lobeRidge - 0.28) * 12.5 * ridgeEnv);

    if (u > 0.8) {
      const beachT = smoothstep(0.8, 1.0, u);
      h = lerp(h, 1.65 * (1.0 - beachT), 0.76 * villageSide);
    }

    const pads = applySharedPoiPadsAndRamps(x, z, h, u, spec);
    h = pads.h;

    const pathMask = u < 0.985 ? evalSegmentsMask(x, z, paths) : 0.0;
    let zone = 'inland';
    if (pads.maraePad > 0.55) zone = 'marae_terrace';
    else if (pads.knollTop > 0.62) zone = 'knoll_top';
    else if (pads.hutPad > 0.58) zone = 'hut_clearing';
    else if (u > 0.84 || h < 1.75) zone = 'beach_cream';

    return {
      h,
      u,
      pathMask,
      ridgeFactor: lobeRidge * ridgeEnv,
      zone,
      lavaGlow: 0.0,
      snowCap: 0.0,
    };
  };
}

// ============================================================================
// 2. HAWAI'I — Snow-Capped Mauna, Glowing Kilauea Lava & Kealakekua Cliffs
// ============================================================================
export function createHawaiiTerrainEvaluator(spec) {
  const paths = buildFootpathSegmentsForSpec(spec);
  return (x, z) => {
    const mx = x * 1.0;
    const mz = (z + 6.0) * 0.95;
    const r = Math.hypot(mx, mz);
    const theta = Math.atan2(mz, mx);

    const heiauCape = 9.2 * Math.exp(-Math.pow(Math.atan2(Math.sin(theta - 1.01), Math.cos(theta - 1.01)) / 0.32, 2.0));
    const bayCove = 4.2 * Math.cos(3.0 * theta - 0.8) + 2.2 * Math.sin(5.0 * theta + 0.8);
    const coastR = 60.5 + heiauCape + bayCove;
    const u = r / coastR;

    if (u >= 1.0) {
      return {
        h: -3.8 * smoothstep(1.0, 1.4, u),
        u,
        pathMask: 0.0,
        ridgeFactor: 0.0,
        zone: 'lagoon',
        lavaGlow: 0.0,
        snowCap: 0.0,
      };
    }

    const inland = 1.0 - u;
    const villageSide = smoothstep(-4.0, 26.0, z);

    // Twin Mauna shield domes: high snow-dusted Mauna Kea (+X/-Z) & glowing Kilauea crater (-X/-Z)
    const maunaKea = 78.0 * Math.exp(-Math.pow(Math.hypot(x - 13.5, z + 15.0) / 29.0, 1.75));
    const kilaueaDome = 52.0 * Math.exp(-Math.pow(Math.hypot(x + 19.5, z + 16.5) / 25.0, 1.75));
    const baseShield = 36.0 * Math.pow(smoothstep(0.03, 0.88, inland), lerp(1.25, 1.85, villageSide));

    let h = Math.max(0.08, Math.max(baseShield, maunaKea, kilaueaDome * 0.95));

    // Carve glowing sunken Kilauea caldera bowl on (-19.5, -16.5) — safely inland of all village paths!
    const kd = Math.hypot(x + 19.5, z + 16.5);
    const kRim = 5.2 * Math.exp(-Math.pow((kd - 9.8) / 2.6, 2.0));
    const inCaldera = 1.0 - smoothstep(7.6, 9.6, kd);
    h += kRim;
    h = lerp(h, 39.5, inCaldera);

    // Sinuous molten lava river spilling down the far -Z/-X black basalt flank into the sea
    let lavaFlow = 0.0;
    if (z < -16.0 && z > -64.0) {
      const ft = clamp01((-z - 16.0) / 44.0);
      const riverX = lerp(-19.5, -28.0, ft) + 3.4 * Math.sin(ft * Math.PI * 2.4);
      lavaFlow = Math.exp(-Math.pow(Math.abs(x - riverX) / 2.6, 2.2));
      h -= 0.7 * lavaFlow;
    }
    const lavaGlow = clamp01(inCaldera * 0.95 + lavaFlow);

    if (u > 0.83) {
      const beachT = smoothstep(0.83, 1.0, u);
      h = lerp(h, 1.8 * (1.0 - beachT), 0.74 * villageSide);
    }

    const pads = applySharedPoiPadsAndRamps(x, z, h, u, spec);
    h = pads.h;

    const snowCap = lavaGlow < 0.05 && x > -4.0 && z < 8.0 ? smoothstep(58.0, 68.5, h) : 0.0;
    const pathMask = u < 0.985 ? evalSegmentsMask(x, z, paths) : 0.0;

    let zone = 'inland_hawaii';
    if (lavaGlow > 0.18) zone = 'lava_molten';
    else if (x < -8.0 && z < 10.0 && h > 10.0) zone = 'black_pahoehoe';
    else if (pads.maraePad > 0.55) zone = 'heiau_lava_terrace';
    else if (pads.knollTop > 0.62) zone = 'knoll_top';
    else if (pads.hutPad > 0.58) zone = 'hut_clearing';
    else if (u > 0.86 || h < 1.65) zone = 'beach';

    return {
      h,
      u,
      pathMask,
      ridgeFactor: clamp01((h - 14.0) / 42.0),
      zone,
      lavaGlow,
      snowCap,
    };
  };
}

// ============================================================================
// 3. RAPA NUI — Golden Tuff Quarry, Rano Kau Caldera & Anakena Coral Cove
// ============================================================================
export function createRapaNuiTerrainEvaluator(spec) {
  const paths = buildFootpathSegmentsForSpec(spec);
  return (x, z) => {
    const mx = x * 0.98;
    const mz = (z + 6.0) * 0.96;
    const r = Math.hypot(mx, mz);
    const theta = Math.atan2(mz, mx);

    const tongarikiCape = 10.2 * Math.exp(-Math.pow(Math.atan2(Math.sin(theta - 1.0), Math.cos(theta - 1.0)) / 0.34, 2.0));
    const basaltRough = 3.2 * Math.cos(3.0 * theta - 0.75) + 1.8 * Math.sin(6.0 * theta + 0.5);
    const coastR = 60.5 + tongarikiCape + basaltRough;
    const u = r / coastR;

    if (u >= 1.0) {
      return {
        h: -3.6 * smoothstep(1.0, 1.38, u),
        u,
        pathMask: 0.0,
        ridgeFactor: 0.0,
        zone: 'lagoon',
        lavaGlow: 0.0,
        snowCap: 0.0,
      };
    }

    const inland = 1.0 - u;
    const villageSide = smoothstep(-4.0, 26.0, z);

    // Rolling grassy shield of Ma'unga Terevaka + Rano Raraku golden tuff cone + Rano Kau caldera
    const terevaka = 48.0 * Math.pow(smoothstep(0.03, 0.88, inland), lerp(1.3, 1.85, villageSide));
    const ranoRaraku = 26.0 * Math.exp(-Math.pow(Math.hypot(x - 16.5, z + 10.5) / 16.5, 2.0));
    const ranoKau = 28.0 * Math.exp(-Math.pow(Math.hypot(x + 21.0, z + 15.0) / 18.5, 2.0));
    let h = Math.max(0.1, terevaka + ranoRaraku * 0.55 + ranoKau * 0.5);

    // Sunken Rano Kau reed-lake caldera bowl on (-21, -15)
    const rkd = Math.hypot(x + 21.0, z + 15.0);
    const rkRim = 4.8 * Math.exp(-Math.pow((rkd - 11.5) / 2.8, 2.0));
    const inRanoKau = 1.0 - smoothstep(9.0, 11.2, rkd);
    h += rkRim;
    h = lerp(h, 24.5, inRanoKau);

    if (u > 0.84) {
      const beachT = smoothstep(0.84, 1.0, u);
      h = lerp(h, 1.75 * (1.0 - beachT), 0.75 * villageSide);
    }

    const pads = applySharedPoiPadsAndRamps(x, z, h, u, spec);
    h = pads.h;

    const dRaraku = Math.hypot(x - 16.5, z + 10.5);
    const isTuffQuarry = dRaraku < 16.0 && h > 9.0;
    const pathMask = u < 0.985 ? evalSegmentsMask(x, z, paths) : 0.0;

    let zone = 'rapa_grassland';
    if (inRanoKau > 0.45) zone = 'caldera_marsh';
    else if (isTuffQuarry) zone = 'tuff_quarry';
    else if (pads.maraePad > 0.55) zone = 'marae_terrace';
    else if (pads.knollTop > 0.62) zone = 'knoll_top';
    else if (pads.hutPad > 0.58) zone = 'hut_clearing';
    else if (u > 0.86 && x < 6.0 && z > 38.0) zone = 'anakena_rose_sand';
    else if (u > 0.88 && h < 2.2) zone = 'basalt_shore';

    return {
      h,
      u,
      pathMask,
      ridgeFactor: clamp01((h - 8.0) / 36.0),
      zone,
      lavaGlow: 0.0,
      snowCap: 0.0,
    };
  };
}

/**
 * Sculpts a single iconic 3D Rapa Nui Moai statue (overhanging brow ridge, deep eye sockets,
 * long nose with flared nostrils, thin pursed lips, angular jawline, elongated ears, torso
 * with clasped abdominal hands, optional red scoria Pukao topknot & awakened coral eyes).
 */
function createMoaiStatueGroup({
  scale = 1.0,
  hasPukao = true,
  hasCoralEyes = false,
  tuffMat,
  pukaoMat,
  coralEyeMat,
  obsidianMat,
}) {
  const moai = new THREE.Group();

  // 1. Trapezoidal Basalt/Tuff Torso & Clasped Hands
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.62, 1.85, 8),
    tuffMat
  );
  torso.position.y = 0.92;
  torso.scale.set(1.18, 1.0, 0.76);
  torso.castShadow = true;
  torso.receiveShadow = true;
  moai.add(torso);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.28, 0.26),
      tuffMat
    );
    arm.position.set(side * 0.62, 0.92, -0.02);
    arm.castShadow = true;
    moai.add(arm);

    const forearm = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.16, 0.22),
      tuffMat
    );
    forearm.position.set(side * 0.28, 0.34, -0.36);
    moai.add(forearm);
  }

  // 2. Iconic Elongated Angular Moai Head (faces local -Z)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 1.72, 0.74),
    tuffMat
  );
  head.position.set(0.0, 2.66, -0.04);
  head.rotation.x = -0.06; // Proud slight upward tilt
  head.castShadow = true;
  head.receiveShadow = true;
  moai.add(head);

  // Heavy overhanging brow ridge
  const brow = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.22, 0.34),
    tuffMat
  );
  brow.position.set(0.0, 3.16, -0.32);
  brow.castShadow = true;
  moai.add(brow);

  // Deep-set shadowed eye hollows (or white coral + black obsidian eyes)
  for (const side of [-1, 1]) {
    if (hasCoralEyes) {
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        coralEyeMat
      );
      sclera.position.set(side * 0.22, 2.95, -0.39);
      sclera.scale.set(1.25, 0.72, 0.45);
      moai.add(sclera);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        obsidianMat
      );
      pupil.position.set(side * 0.22, 2.95, -0.43);
      pupil.scale.set(1.0, 1.0, 0.5);
      moai.add(pupil);
    } else {
      const socket = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.14, 0.1),
        obsidianMat
      );
      socket.position.set(side * 0.22, 2.96, -0.38);
      moai.add(socket);
    }

    // Elongated carved rectangular ears
    const ear = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.88, 0.24),
      tuffMat
    );
    ear.position.set(side * 0.46, 2.62, 0.02);
    moai.add(ear);
  }

  // Long concave nose bridge & flared nostrils
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.74, 0.28),
    tuffMat
  );
  nose.position.set(0.0, 2.66, -0.42);
  nose.rotation.x = 0.12;
  nose.castShadow = true;
  moai.add(nose);

  const nostrils = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.12, 0.22),
    tuffMat
  );
  nostrils.position.set(0.0, 2.31, -0.46);
  moai.add(nostrils);

  // Thin resolute pursed lips & strong chin
  const lips = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.09, 0.16),
    tuffMat
  );
  lips.position.set(0.0, 2.06, -0.41);
  moai.add(lips);

  // 3. Optional Red Scoria Pukao Topknot Cylinder
  if (hasPukao) {
    const pukao = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.5, 0.58, 14),
      pukaoMat
    );
    pukao.position.set(0.0, 3.78, -0.04);
    pukao.castShadow = true;
    moai.add(pukao);

    const knot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.22, 10),
      pukaoMat
    );
    knot.position.set(0.0, 4.14, -0.04);
    moai.add(knot);
  }

  moai.scale.setScalar(scale);
  return moai;
}

/**
 * Builds custom 3D structures, horizon vistas, monuments, and ashore NPCs for
 * `tahaa`, `hawaii`, or `rapa_nui`, returning `{ obstacles, npcEntries, peakCloudMats }`.
 */
export function buildVariantIslandStructures(sceneCtx, islandId) {
  const { root, spec, getGroundHeight, addKukuiTorch, torchFlames, pennantMeshes } = sceneCtx;
  const npcEntries = [];
  const peakCloudMats = [];

  const aitoMat = new THREE.MeshStandardMaterial({ color: 0x623e24, roughness: 0.86 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0xc89d5c, roughness: 0.88 });
  const reedMat = new THREE.MeshStandardMaterial({ color: 0xa6804e, roughness: 0.85 });
  const pandanusMat = new THREE.MeshStandardMaterial({ color: 0xd9bc82, roughness: 0.84 });
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x363330, roughness: 0.92 });
  const coralStoneMat = new THREE.MeshStandardMaterial({ color: 0xe8dfd0, roughness: 0.82 });
  const kapaWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.82 });
  const kuraRedMat = new THREE.MeshStandardMaterial({
    color: 0xc92c20,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9d3b });

  // Shared Canoe Landing Rollers & Boarding Mat at POI 0
  const cPoi = spec.pois[0];
  const landingGrp = new THREE.Group();
  landingGrp.position.set(cPoi.x, getGroundHeight(cPoi.x, cPoi.z), cPoi.z);
  landingGrp.rotation.y = spec.mooredCanoe.yawRad;

  const boardingMat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 3.8), pandanusMat);
  boardingMat.position.set(0.5, 0.06, 0.2);
  boardingMat.receiveShadow = true;
  landingGrp.add(boardingMat);

  for (let r = -2; r <= 2; r += 1) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 3.2, 8),
      aitoMat
    );
    roller.rotation.z = Math.PI * 0.5;
    roller.position.set(-0.6, 0.04, r * 0.95);
    landingGrp.add(roller);
  }
  root.add(landingGrp);
  addKukuiTorch(cPoi.x + 2.8, cPoi.z - 0.2, 1.55);

  const hPoi = spec.pois[1];
  const oPoi = spec.pois[2];
  const ePoi = spec.pois[3];

  // =========================================================================
  // VARIANT A: TAHA'A ("Sheltered Lagoon Isle" — Hina & Young Fisher Tama)
  // =========================================================================
  if (islandId === 'tahaa') {
    // Stationary Peak Cloud over Mount Ohiri + Sacred Flat-Topped Ra'iatea on the Horizon!
    const ohiriCloud = createSculptedCloudMesh('peak', { opacity: 0.92 });
    ohiriCloud.mesh.position.set(3.0, 86.0, -6.0);
    ohiriCloud.mesh.scale.setScalar(1.22);
    peakCloudMats.push(ohiriCloud.material);
    root.add(ohiriCloud.mesh);

    const distantRaiatea = new THREE.Group();
    distantRaiatea.position.set(-145.0, -1.0, 310.0);
    const temehaniMassif = new THREE.Mesh(
      new THREE.CylinderGeometry(32.0, 56.0, 44.0, 16),
      new THREE.MeshStandardMaterial({ color: 0x355f52, roughness: 0.92 })
    );
    temehaniMassif.position.y = 20.0;
    distantRaiatea.add(temehaniMassif);
    const raiateaCloud = createSculptedCloudMesh('peak', { opacity: 0.9 });
    raiateaCloud.mesh.position.set(0.0, 74.0, 0.0);
    peakCloudMats.push(raiateaCloud.material);
    distantRaiatea.add(raiateaCloud.mesh);
    root.add(distantRaiatea);

    // POI 2: Sennit-Braiders & Fish-Drying Fare
    const hutGrp = new THREE.Group();
    hutGrp.position.set(hPoi.x, getGroundHeight(hPoi.x, hPoi.z), hPoi.z);
    hutGrp.rotation.y = 0.38;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.28, 5.0), basaltMat);
    plinth.position.set(0, 0.1, -1.5);
    hutGrp.add(plinth);

    for (const px of [-2.7, 2.7]) {
      for (const pz of [-3.4, 0.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.45, 8), aitoMat);
        post.position.set(px, 1.45, pz);
        post.castShadow = true;
        hutGrp.add(post);
      }
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 2.5, 4), thatchMat);
    roof.position.set(0, 3.78, -1.5);
    roof.rotation.y = Math.PI * 0.25;
    roof.scale.set(1.16, 1.0, 0.9);
    roof.castShadow = true;
    hutGrp.add(roof);

    // Bonito fish-drying rack & golden braided sennit coils
    const rackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), aitoMat);
    rackBar.rotation.z = Math.PI * 0.5;
    rackBar.position.set(1.4, 1.45, -2.3);
    hutGrp.add(rackBar);
    for (const rx of [0.0, 2.8]) {
      const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6), aitoMat);
      rPost.position.set(rx, 0.75, -2.3);
      hutGrp.add(rPost);
    }
    for (let s = 0; s < 4; s += 1) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 7, 14), pandanusMat);
      coil.position.set(-1.6 + s * 0.55, 0.45, -2.5);
      coil.rotation.x = Math.PI * 0.5;
      hutGrp.add(coil);
    }

    const artisanRig = createPlayerCharacterRig(Difficulty.MEDIUM);
    artisanRig.root.position.set(-0.6, 0.26, -0.75);
    artisanRig.root.rotation.y = Math.PI;
    hutGrp.add(artisanRig.root);
    npcEntries.push({ rig: artisanRig, watchX: hPoi.x, watchZ: hPoi.z, holdsStaffRight: false });
    root.add(hutGrp);
    addKukuiTorch(hPoi.x + 3.2, hPoi.z + 2.4, 1.65);

    // POI 3: Coral Sighting-Post & Giant Clam Shell Ring
    const circleGrp = new THREE.Group();
    circleGrp.position.set(oPoi.x, getGroundHeight(oPoi.x, oPoi.z), oPoi.z);
    const sandBed = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.25, 0.16, 28), coralStoneMat);
    sandBed.position.y = 0.08;
    circleGrp.add(sandBed);
    const tallPou = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.85, 8), aitoMat);
    tallPou.position.y = 0.96;
    tallPou.castShadow = true;
    circleGrp.add(tallPou);
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2.0 + 0.39;
      const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), coralStoneMat);
      shell.position.set(Math.cos(ang) * 4.1, 0.28, Math.sin(ang) * 4.1);
      shell.scale.set(1.25, 0.72, 0.9);
      shell.rotation.y = -ang;
      circleGrp.add(shell);
    }
    root.add(circleGrp);
    addKukuiTorch(oPoi.x - 3.2, oPoi.z + 3.1, 1.65);

    // POI 4: Hina's Hillside Hearth + Young Fisher Tama
    const hearthSite = new THREE.Group();
    hearthSite.position.set(ePoi.x, getGroundHeight(ePoi.x, ePoi.z), ePoi.z);
    hearthSite.rotation.y = -0.5;

    const terrace = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.38, 10.4), basaltMat);
    terrace.position.set(1.2, 0.14, 0.0);
    terrace.receiveShadow = true;
    hearthSite.add(terrace);

    // Warm hillside thatched shelter behind Hina & Tama
    const hinaRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.4, 5), thatchMat);
    hinaRoof.position.set(3.6, 3.1, 0.0);
    hinaRoof.castShadow = true;
    hearthSite.add(hinaRoof);
    for (const [px, pz] of [[2.2, -2.2], [2.2, 2.2], [4.8, -2.0], [4.8, 2.0]]) {
      const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.2, 7), aitoMat);
      hp.position.set(px, 1.2, pz);
      hearthSite.add(hp);
    }

    // Glowing hillside hearth fire
    const fireRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 6, 12), basaltMat);
    fireRing.rotation.x = Math.PI * 0.5;
    fireRing.position.set(0.4, 0.36, -1.65);
    hearthSite.add(fireRing);
    const fireCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.52, 7), flameMat);
    fireCone.position.set(0.4, 0.56, -1.65);
    hearthSite.add(fireCone);
    torchFlames.push({ mesh: fireCone, baseY: 0.56, phase: 2.1 });

    // 3D Hina (Sennit Artisan & Navigator) + 3D Young Tama (Lagoon Fisher)
    const hinaRig = createPlayerCharacterRig(Difficulty.HARD);
    hinaRig.root.position.set(1.35, 0.34, 0.35);
    hinaRig.root.rotation.y = Math.PI * 0.5;
    hearthSite.add(hinaRig.root);
    npcEntries.push({ rig: hinaRig, watchX: ePoi.x, watchZ: ePoi.z, holdsStaffRight: false });

    const tamaRig = createPlayerCharacterRig(Difficulty.EASY);
    tamaRig.root.position.set(1.45, 0.34, 1.95);
    tamaRig.root.rotation.y = Math.PI * 0.56;
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 1.65, 6), aitoMat);
    spear.position.set(0.22, 0.82, -0.18);
    tamaRig.root.add(spear);
    hearthSite.add(tamaRig.root);
    npcEntries.push({ rig: tamaRig, watchX: ePoi.x, watchZ: ePoi.z, holdsStaffRight: true });

    root.add(hearthSite);
    addKukuiTorch(ePoi.x - 3.6, ePoi.z + 2.2, 1.75);

    return {
      obstacles: [
        { x: spec.mooredCanoe.x, z: spec.mooredCanoe.z, r: 4.1 },
        { x: hPoi.x, z: hPoi.z - 2.0, r: 2.3 },
        { x: oPoi.x, z: oPoi.z, r: 1.85 },
        { x: ePoi.x + 2.6, z: ePoi.z - 0.8, r: 2.6 },
      ],
      npcEntries,
      peakCloudMats,
    };
  }

  // =========================================================================
  // VARIANT B: HAWAI'I ("Ancestral Mauna Horizon" — Snow, Lava & Great Heiau)
  // =========================================================================
  if (islandId === 'hawaii') {
    // High Mauna Cloud + Glowing Volcanic Crater Light over Kilauea!
    const maunaCloud = createSculptedCloudMesh('peak', { opacity: 0.92 });
    maunaCloud.mesh.position.set(12.0, 102.0, -14.0);
    maunaCloud.mesh.scale.setScalar(1.4);
    peakCloudMats.push(maunaCloud.material);
    root.add(maunaCloud.mesh);

    const calderaGlowLight = new THREE.PointLight(0xff5a14, 2.8, 68.0);
    calderaGlowLight.position.set(-19.5, 45.0, -16.5);
    root.add(calderaGlowLight);

    // POI 2: Royal Koa Canoe Shed (Halau Wa'a)
    const halauGrp = new THREE.Group();
    halauGrp.position.set(hPoi.x, getGroundHeight(hPoi.x, hPoi.z), hPoi.z);
    halauGrp.rotation.y = 0.4;

    const lavaPlinth = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.36, 5.8), basaltMat);
    lavaPlinth.position.set(0, 0.14, -1.6);
    halauGrp.add(lavaPlinth);

    // Steep Hawaiian A-frame pili-grass gable roof
    const gableGeo = new THREE.CylinderGeometry(3.8, 3.8, 6.8, 3);
    const gableRoof = new THREE.Mesh(gableGeo, thatchMat);
    gableRoof.rotation.x = Math.PI * 0.5;
    gableRoof.position.set(0, 3.25, -1.6);
    gableRoof.scale.set(1.15, 0.9, 1.0);
    gableRoof.castShadow = true;
    halauGrp.add(gableRoof);

    for (const px of [-3.1, 3.1]) {
      for (const pz of [-3.8, 0.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.3, 8), aitoMat);
        post.position.set(px, 1.35, pz);
        halauGrp.add(post);
      }
    }

    // Seasoned koa hull log & ipu gourds
    const koaLog = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.6, 9), aitoMat);
    koaLog.rotation.z = Math.PI * 0.5;
    koaLog.position.set(0.9, 0.58, -2.5);
    halauGrp.add(koaLog);

    const kahunaRig = createPlayerCharacterRig(Difficulty.HARD);
    kahunaRig.root.position.set(-0.7, 0.32, -0.75);
    kahunaRig.root.rotation.y = Math.PI;
    halauGrp.add(kahunaRig.root);
    npcEntries.push({ rig: kahunaRig, watchX: hPoi.x, watchZ: hPoi.z, holdsStaffRight: false });
    root.add(halauGrp);
    addKukuiTorch(hPoi.x + 3.5, hPoi.z + 2.4, 1.75);

    // POI 3: Volcanic Star-Gourd Ring (Ipu Hoku)
    const gourdRing = new THREE.Group();
    gourdRing.position.set(oPoi.x, getGroundHeight(oPoi.x, oPoi.z), oPoi.z);
    const blackSandBed = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.18, 28), basaltMat);
    blackSandBed.position.y = 0.08;
    gourdRing.add(blackSandBed);
    for (const sr of [0.75, 1.45, 1.92]) {
      const coralRing = new THREE.Mesh(new THREE.RingGeometry(sr - 0.04, sr + 0.04, 32), coralStoneMat);
      coralRing.rotation.x = -Math.PI * 0.5;
      coralRing.position.y = 0.18;
      gourdRing.add(coralRing);
    }
    // Pedestal & sacred Star-Gourd (Ipu Hoku)
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.72, 8), basaltMat);
    ped.position.y = 0.42;
    gourdRing.add(ped);
    const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), reedMat);
    gourd.position.y = 1.02;
    gourd.scale.set(1.0, 1.25, 1.0);
    gourdRing.add(gourd);

    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2.0 + 0.39;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.6 + (i % 2) * 0.35, 6), basaltMat);
      col.position.set(Math.cos(ang) * 4.3, 0.8, Math.sin(ang) * 4.3);
      col.castShadow = true;
      gourdRing.add(col);
    }
    root.add(gourdRing);
    addKukuiTorch(oPoi.x - 3.4, oPoi.z + 3.2, 1.75);

    // POI 4: Great Ancestral Heiau (Stacked Lava Courtyard, White Kapa Anu'u Oracle Tower & Ki'i)
    const heiauGrp = new THREE.Group();
    heiauGrp.position.set(ePoi.x, getGroundHeight(ePoi.x, ePoi.z), ePoi.z);
    heiauGrp.rotation.y = -0.52;

    const court = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.56, 13.4), basaltMat);
    court.position.set(1.4, 0.22, 0.0);
    court.receiveShadow = true;
    heiauGrp.add(court);

    // Towering 3-tier White Kapa-Wrapped Anu'u Oracle Tower (iconic Hawaiian Heiau landmark!)
    for (let tier = 0; tier < 3; tier += 1) {
      const w = 2.2 - tier * 0.36;
      const h = 2.15;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), kapaWhiteMat);
      box.position.set(4.5, 1.45 + tier * 2.08, 0.0);
      box.castShadow = true;
      heiauGrp.add(box);

      const lashBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.14, w + 0.1), aitoMat);
      lashBand.position.set(4.5, 0.5 + tier * 2.08, 0.0);
      heiauGrp.add(lashBand);
    }

    // 4 Carved Wooden Ki'i Temple Guardian Images & Crimson Kahili Feather Standards
    for (const zOff of [-4.2, -2.1, 2.1, 4.2]) {
      const kii = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.35, 7), aitoMat);
      kii.position.set(3.1, 1.55, zOff);
      kii.castShadow = true;
      heiauGrp.add(kii);
      const kiiHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.38), aitoMat);
      kiiHead.position.set(3.1, 2.85, zOff);
      heiauGrp.add(kiiHead);

      const kahiliPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.8, 6), aitoMat);
      kahiliPole.position.set(2.5, 2.2, zOff * 1.08);
      heiauGrp.add(kahiliPole);
      const kahiliPlume = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.95, 10), kuraRedMat);
      kahiliPlume.position.set(2.5, 3.85, zOff * 1.08);
      heiauGrp.add(kahiliPlume);
    }

    // Two Ancestral Wayfinder Elders standing before the Anu'u Oracle Tower
    const elderA = createPlayerCharacterRig(Difficulty.MASTER_NAVIGATOR);
    elderA.root.position.set(1.15, 0.5, -0.65);
    elderA.root.rotation.y = Math.PI * 0.5;
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 1.82, 7), aitoMat);
    staff.position.set(0.24, 0.91, -0.22);
    elderA.root.add(staff);
    heiauGrp.add(elderA.root);
    npcEntries.push({ rig: elderA, watchX: ePoi.x, watchZ: ePoi.z, holdsStaffRight: true });

    const elderB = createPlayerCharacterRig(Difficulty.HARD);
    elderB.root.position.set(1.25, 0.5, 0.95);
    elderB.root.rotation.y = Math.PI * 0.46;
    heiauGrp.add(elderB.root);
    npcEntries.push({ rig: elderB, watchX: ePoi.x, watchZ: ePoi.z, holdsStaffRight: false });

    root.add(heiauGrp);
    addKukuiTorch(ePoi.x - 4.2, ePoi.z + 2.6, 1.9);
    addKukuiTorch(ePoi.x - 2.6, ePoi.z - 4.4, 1.9);

    return {
      obstacles: [
        { x: spec.mooredCanoe.x, z: spec.mooredCanoe.z, r: 4.1 },
        { x: hPoi.x, z: hPoi.z - 2.1, r: 2.4 },
        { x: oPoi.x, z: oPoi.z, r: 1.85 },
        { x: ePoi.x + 2.5, z: ePoi.z - 1.2, r: 2.9 },
      ],
      npcEntries,
      peakCloudMats,
    };
  }

  // =========================================================================
  // VARIANT C: RAPA NUI ("Te Pito o Te Henua" — Hare Paenga, Te Pito Kura & 5-Moai Ahu Tongariki)
  // =========================================================================
  const tuffMat = new THREE.MeshStandardMaterial({ color: 0x9e9170, roughness: 0.9 });
  const pukaoMat = new THREE.MeshStandardMaterial({ color: 0x8f3426, roughness: 0.88 });
  const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x18171a, roughness: 0.45 });

  // Peak Cloud + Offshore Volcanic Sea Stacks (Motu Nui, Motu Iti & Needle Spire Motu Kao Kao!)
  const terevakaCloud = createSculptedCloudMesh('peak', { opacity: 0.88 });
  terevakaCloud.mesh.position.set(-4.0, 88.0, -10.0);
  terevakaCloud.mesh.scale.setScalar(1.25);
  peakCloudMats.push(terevakaCloud.material);
  root.add(terevakaCloud.mesh);

  for (const [sx, sz, rTop, rBot, hStack] of [
    [-68.0, 74.0, 5.8, 8.2, 11.5], // Motu Nui
    [-55.0, 78.0, 3.2, 4.8, 7.8],  // Motu Iti
    [-46.5, 71.0, 0.85, 2.4, 18.5], // Motu Kao Kao needle spire!
  ]) {
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, hStack, 9),
      basaltMat
    );
    stack.position.set(sx, hStack * 0.45, sz);
    stack.castShadow = true;
    root.add(stack);
  }

  // Two partially buried Quarry Moai emerging from the golden Rano Raraku tuff hillside inland!
  for (const [qx, qz, qYaw, qScale] of [
    [13.5, 2.5, -0.35, 0.82],
    [19.2, 6.2, -0.55, 0.74],
  ]) {
    const qMoai = createMoaiStatueGroup({
      scale: qScale,
      hasPukao: false,
      hasCoralEyes: false,
      tuffMat,
      pukaoMat,
      coralEyeMat: coralStoneMat,
      obsidianMat,
    });
    qMoai.position.set(qx, getGroundHeight(qx, qz) - 0.85, qz);
    qMoai.rotation.y = qYaw;
    qMoai.rotation.z = 0.08;
    root.add(qMoai);
  }

  // POI 2: Uninhabited Hare Paenga (Boat-Shaped Basalt Foundation & Low Curved Reed Shelter)
  const hareGrp = new THREE.Group();
  hareGrp.position.set(hPoi.x, getGroundHeight(hPoi.x, hPoi.z), hPoi.z);
  hareGrp.rotation.y = 0.36;

  // Boat-shaped elliptical dressed basalt curbstone foundation (Hare Paenga)
  const curbRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.24, 7, 24), basaltMat);
  curbRing.rotation.x = Math.PI * 0.5;
  curbRing.scale.set(1.25, 0.58, 1.0);
  curbRing.position.set(0, 0.16, -1.6);
  hareGrp.add(curbRing);

  // Low overturned-canoe arched totora-reed shelter
  const archShelter = new THREE.Mesh(
    new THREE.SphereGeometry(2.65, 16, 10, 0, Math.PI * 2.0, 0, Math.PI * 0.5),
    thatchMat
  );
  archShelter.scale.set(1.38, 0.74, 0.62);
  archShelter.position.set(0, 0.18, -1.6);
  archShelter.castShadow = true;
  hareGrp.add(archShelter);

  // Stone-rimmed freshwater spring pool & stacked wild Anakena coconuts
  const springRim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.18, 7, 16), basaltMat);
  springRim.rotation.x = Math.PI * 0.5;
  springRim.position.set(2.9, 0.14, 0.6);
  hareGrp.add(springRim);
  const springWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.88, 16),
    new THREE.MeshBasicMaterial({ color: 0x2fd8d0 })
  );
  springWater.rotation.x = -Math.PI * 0.5;
  springWater.position.set(2.9, 0.18, 0.6);
  hareGrp.add(springWater);

  for (const [cx, cz] of [[-1.8, 0.4], [-1.35, 0.5], [-1.58, 0.2]]) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), reedMat);
    nut.position.set(cx, 0.2, cz);
    hareGrp.add(nut);
  }
  root.add(hareGrp);

  // POI 3: Te Pito Kura ("Navel of Light" Smooth Spherical Boulder & 4 Companion Stones)
  const pitoGrp = new THREE.Group();
  pitoGrp.position.set(oPoi.x, getGroundHeight(oPoi.x, oPoi.z), oPoi.z);

  const sandDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.4, 0.14, 28), coralStoneMat);
  sandDisc.position.y = 0.06;
  pitoGrp.add(sandDisc);

  const navelStone = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x6b6055, roughness: 0.62 })
  );
  navelStone.scale.set(1.12, 0.76, 1.05);
  navelStone.position.y = 0.48;
  navelStone.castShadow = true;
  pitoGrp.add(navelStone);

  for (let i = 0; i < 4; i += 1) {
    const ang = (i / 4) * Math.PI * 2.0 + 0.55;
    const comp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), basaltMat);
    comp.position.set(Math.cos(ang) * 1.45, 0.26, Math.sin(ang) * 1.45);
    comp.scale.set(1.1, 0.75, 1.0);
    pitoGrp.add(comp);
  }
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2.0 + 0.39;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.95, 0.36), basaltMat);
    marker.position.set(Math.cos(ang) * 4.2, 0.46, Math.sin(ang) * 4.2);
    marker.rotation.y = -ang;
    pitoGrp.add(marker);
  }
  root.add(pitoGrp);

  // POI 4: Monumental Ahu Tongariki — 5 Towering Moai Guardians with Crimson Pukao!
  const ahuGrp = new THREE.Group();
  ahuGrp.position.set(ePoi.x, getGroundHeight(ePoi.x, ePoi.z), ePoi.z);
  ahuGrp.rotation.y = -0.52;

  const plaza = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.38, 14.8), basaltMat);
  plaza.position.set(1.0, 0.14, 0.0);
  plaza.receiveShadow = true;
  ahuGrp.add(plaza);

  const ahuPlatform = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.42, 13.6), basaltMat);
  ahuPlatform.position.set(4.1, 0.92, 0.0);
  ahuPlatform.castShadow = true;
  ahuPlatform.receiveShadow = true;
  ahuGrp.add(ahuPlatform);

  // 5 Upright Ocean-Backed Moai facing -X (inland across the ceremonial plaza toward the player!)
  const moaiConfigs = [
    { z: -4.9, scale: 0.88, pukao: false, eyes: false },
    { z: -2.45, scale: 0.98, pukao: true, eyes: false },
    { z: 0.0, scale: 1.12, pukao: true, eyes: true }, // Central Great Awakened Moai!
    { z: 2.45, scale: 0.96, pukao: true, eyes: false },
    { z: 4.9, scale: 0.86, pukao: false, eyes: false },
  ];
  for (const cfg of moaiConfigs) {
    const moai = createMoaiStatueGroup({
      scale: cfg.scale,
      hasPukao: cfg.pukao,
      hasCoralEyes: cfg.eyes,
      tuffMat,
      pukaoMat,
      coralEyeMat: coralStoneMat,
      obsidianMat,
    });
    // Moai local -Z is face -> rotate +PI/2 so face points along -X toward courtyard & player!
    moai.rotation.y = Math.PI * 0.5;
    moai.position.set(4.05, 1.62, cfg.z);
    ahuGrp.add(moai);
  }

  root.add(ahuGrp);

  return {
    obstacles: [
      { x: spec.mooredCanoe.x, z: spec.mooredCanoe.z, r: 4.1 },
      { x: hPoi.x, z: hPoi.z - 1.6, r: 2.35 },
      { x: oPoi.x, z: oPoi.z, r: 1.85 },
      { x: ePoi.x + 2.8, z: ePoi.z - 1.3, r: 3.1 },
    ],
    npcEntries,
    peakCloudMats,
  };
}
