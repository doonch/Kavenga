/**
 * Sculpted Wide-Scale 3D Terrain, Volcanic Calderas, Sea Stacks, Villages & Upright Ocean-Facing Moai
 * for the Secret Island — Rapa Nui ("Te Pito o Te Henua"):
 *
 * - Scale & Profile: ~3x standard campaign islands horizontally (~257m x 218m triangular volcanic
 *   landmass on a 330m-diameter high-resolution terrain field — 50% wider than initial 2x draft)
 *   with broad, gently rolling volcanic shields & hills (summit ~54m — 50% lower vertical relief).
 * - Authentic Three-Volcano Rapa Nui Geography:
 *   1. Ma'unga Terevaka (broad, low volcanic shield apex with Rano Aroi & Hiva Hiva cones)
 *   2. Poike Peninsula (cliffed eastern headland across Ko te Ava o Iko saddle + pale trachyte domes)
 *   3. Rano Kau (colossal sunken circular caldera lake with patterned green/gold totora reed
 *      marshes, seaward Kari Kari cliff breach, 'Orongo stone slab village, and offshore sea stacks
 *      Motu Nui, Motu Iti & needle spire Motu Kao Kao)
 * - Rano Raraku Golden-Ochre Tuff Quarry: crater lake, golden quarry cliffs, and upright quarry
 *   Moai gazing outward toward the sea + Ara Moai roads.
 * - Puna Pau Red Scoria Cinder Cone: rust-crimson quarry bowl with upright red Pukao cylinders.
 * - Anakena Coral-Sand Cove: turquoise bay, white-rose coral beach, coconut palm oasis behind
 *   Ahu Nau Nau (7 upright Moai, 4 crowned with crimson Pukao, facing out across the bay).
 * - Monumental Upright Ocean-Facing Ahus:
 *   - Ahu Tongariki (grand 15-Moai terraced basalt platform gazing out over the ocean)
 *   - Ahu Tahai / Ko Te Riku (awakened Moai with white-coral & obsidian eyes + Pukao) & Ahu Vai Uri
 *   - Ahu Akivi (7 upright inland Moai gazing seaward)
 *   - Ahu Akahanga & Ahu Vaihu (upright coastal Moai guardians along the southern basalt shore)
 */

import * as THREE from 'three';
import {
  addBroadleafTrees,
  addCoconutGroves,
  addCoastalScrub,
  clamp01,
  createMaterialTracker,
  gaussian2D,
  lerp,
  mixRgb,
  smoothstep,
} from './IslandSculptToolkit.js';

// ============================================================================
// Scale Multipliers: 1.5x wider horizontally (~257m x 218m), 0.5x lower hills!
// ============================================================================
const W_SCALE = 1.5;
const H_SCALE = 0.5;

const wCoord = ([bx, bz]) => [bx * W_SCALE, bz * W_SCALE];

// Base unscaled reference landmarks (multiplied by W_SCALE in world space)
const B_TEREVAKA = [-10.0, -56.0];
const B_POIKE = [68.0, -12.0];
const B_RANO_KAU = [-52.0, 40.0];

const B_RANO_KAU_CENTER = [-50.5, 38.5];
const B_RANO_KAU_RADIUS = 16.6;
const B_RANO_KAU_LAKE_Y = 25.8;

const B_RANO_RARAKU_CENTER = [34.2, 0.4];
const B_RANO_RARAKU_RADIUS = 8.4;
const B_RANO_RARAKU_LAKE_Y = 19.6;

const B_PUNA_PAU_CENTER = [-30.5, 10.5];
const B_PUNA_PAU_RADIUS = 4.6;

const B_ANAKENA_COVE = [20.5, -45.2];
const B_TONGARIKI_SITE = [48.2, 4.2];
const B_TAHAI_SITE = [-44.2, -2.5];
const B_AKIVI_SITE = [-21.5, -19.5];

// World-space landmark coordinates (1.5x wider)
const RANO_KAU_CENTER = wCoord(B_RANO_KAU_CENTER);
const RANO_KAU_RADIUS = B_RANO_KAU_RADIUS * W_SCALE;
const RANO_KAU_LAKE_Y = B_RANO_KAU_LAKE_Y * H_SCALE;

const RANO_RARAKU_CENTER = wCoord(B_RANO_RARAKU_CENTER);
const RANO_RARAKU_RADIUS = B_RANO_RARAKU_RADIUS * W_SCALE;
const RANO_RARAKU_LAKE_Y = B_RANO_RARAKU_LAKE_Y * H_SCALE;

const ANAKENA_COVE = wCoord(B_ANAKENA_COVE);
const TONGARIKI_SITE = wCoord(B_TONGARIKI_SITE);
const TAHAI_SITE = wCoord(B_TAHAI_SITE);
const AKIVI_SITE = wCoord(B_AKIVI_SITE);

// Offshore volcanic sea stacks (Motu) in base coordinates (scaled by W_SCALE & H_SCALE)
const B_MOTU_STACKS = [
  // [bx, bz, brx, brz, rotRad, baseTopHeightM, isSpire]
  [-75.8, 63.2, 6.2, 4.6, -0.55, 10.5, false], // Motu Nui (broad flat-topped seabird island)
  [-68.6, 60.8, 3.4, 2.7, -0.35, 7.6, false], // Motu Iti (companion rocky islet)
  [-64.8, 56.2, 1.85, 1.55, 0.2, 17.5, true], // Motu Kao Kao (vertical sea needle spire!)
  [65.5, 10.8, 2.6, 2.2, 0.4, 11.2, true], // Motu Marotiri (sea stack off Poike/Tongariki)
];

/**
 * Exact 2D signed distance to triangle (p0, p1, p2): negative inside, positive outside.
 */
function sdTriangle2D(px, pz, p0, p1, p2) {
  const e0x = p1[0] - p0[0];
  const e0z = p1[1] - p0[1];
  const e1x = p2[0] - p1[0];
  const e1z = p2[1] - p1[1];
  const e2x = p0[0] - p2[0];
  const e2z = p0[1] - p2[1];

  const v0x = px - p0[0];
  const v0z = pz - p0[1];
  const v1x = px - p1[0];
  const v1z = pz - p1[1];
  const v2x = px - p2[0];
  const v2z = pz - p2[1];

  const t0 = clamp01((v0x * e0x + v0z * e0z) / (e0x * e0x + e0z * e0z));
  const pq0x = v0x - e0x * t0;
  const pq0z = v0z - e0z * t0;

  const t1 = clamp01((v1x * e1x + v1z * e1z) / (e1x * e1x + e1z * e1z));
  const pq1x = v1x - e1x * t1;
  const pq1z = v1z - e1z * t1;

  const t2 = clamp01((v2x * e2x + v2z * e2z) / (e2x * e2x + e2z * e2z));
  const pq2x = v2x - e2x * t2;
  const pq2z = v2z - e2z * t2;

  const s = e0x * e2z - e0z * e2x >= 0.0 ? 1.0 : -1.0;

  const d0Sq = pq0x * pq0x + pq0z * pq0z;
  const d1Sq = pq1x * pq1x + pq1z * pq1z;
  const d2Sq = pq2x * pq2x + pq2z * pq2z;
  const minDistSq = Math.min(d0Sq, d1Sq, d2Sq);

  const c0 = s * (v0x * e0z - v0z * e0x);
  const c1 = s * (v1x * e1z - v1z * e1x);
  const c2 = s * (v2x * e2z - v2z * e2x);
  const minCross = Math.min(c0, c1, c2);

  return -Math.sqrt(minDistSq) * (minCross >= 0.0 ? 1.0 : -1.0);
}

/**
 * Evaluates Rapa Nui's wide, low-shield triangular topography at world coordinates (wx, wz).
 */
export function evalRapaNuiPoint(wx, wz) {
  const x = wx / W_SCALE;
  const z = wz / W_SCALE;

  const dTri = sdTriangle2D(x, z, B_TEREVAKA, B_POIKE, B_RANO_KAU);
  const ang = Math.atan2(z + 8.0, x - 2.0);

  // Organic volcanic coastline modulation around the rounded triangular spine
  const anakenaIndent = 6.8 * gaussian2D(x, z, B_ANAKENA_COVE[0], B_ANAKENA_COVE[1], 9.2, 7.6, -0.52);
  const ovaheIndent = 3.2 * gaussian2D(x, z, 36.5, -36.5, 5.5, 4.8, -0.55);
  const laPerouseIndent = 3.6 * gaussian2D(x, z, 5.5, -59.5, 8.5, 6.5, -0.3);
  const poikeNorthPinch = 4.4 * gaussian2D(x, z, 47.0, -29.0, 7.5, 6.8, -0.5);
  const hotuitiIndent = 4.8 * gaussian2D(x, z, 50.5, 7.2, 8.8, 6.8, 0.38);
  const southCoves =
    2.6 * gaussian2D(x, z, 15.0, 22.0, 6.5, 5.5, 0.35) +
    2.4 * gaussian2D(x, z, -12.0, 32.0, 6.5, 5.5, 0.38);

  const ranoKauRound = 3.8 * gaussian2D(x, z, B_RANO_KAU_CENTER[0], B_RANO_KAU_CENTER[1], 21.0, 21.0, 0.0);
  const poikeCapeBulge = 2.8 * gaussian2D(x, z, 74.0, -11.5, 14.0, 13.0, 0.15);

  const basaltRough =
    1.85 * Math.sin(ang * 7.0 + 0.6) +
    1.15 * Math.cos(ang * 13.0 - 0.9) +
    0.65 * Math.sin(x * 0.14 - z * 0.11);

  const margin =
    20.6 -
    anakenaIndent -
    ovaheIndent -
    laPerouseIndent -
    poikeNorthPinch -
    hotuitiIndent -
    southCoves +
    ranoKauRound +
    poikeCapeBulge +
    basaltRough;

  const baseInlandDist = margin - dTri; // > 0 on main island, <= 0 in ocean
  const inlandDist = baseInlandDist * W_SCALE;

  // Check offshore volcanic Motu sea stacks when outside main shoreline
  let motuH = -99.0;
  let motuGrass = 0.0;
  for (let i = 0; i < B_MOTU_STACKS.length; i += 1) {
    const [mx, mz, mrx, mrz, mrot, mtop, isSpire] = B_MOTU_STACKS[i];
    const dx = x - mx;
    const dz = z - mz;
    const c = Math.cos(mrot);
    const s = Math.sin(mrot);
    const ux = (dx * c + dz * s) / mrx;
    const uz = (-dx * s + dz * c) / mrz;
    const mr = Math.hypot(ux, uz);
    if (mr < 1.38) {
      if (isSpire) {
        const spireH = lerp(-4.2, mtop * H_SCALE, Math.pow(clamp01(1.22 - mr), 1.35));
        motuH = Math.max(motuH, spireH);
      } else {
        const cliff = smoothstep(1.18, 0.78, mr);
        const plateau =
          lerp(-4.2, mtop * H_SCALE, cliff) + 0.3 * Math.sin(dx * 0.7) * cliff;
        if (plateau > motuH) {
          motuH = plateau;
          motuGrass = smoothstep(0.84, 0.55, mr);
        }
      }
    }
  }

  if (baseInlandDist <= 0.0) {
    const seaFloor = lerp(0.04, -5.2, smoothstep(0.0, 12.5, -baseInlandDist));
    const h = Math.max(seaFloor, motuH);
    return {
      h,
      inlandDist,
      isCoralSand: false,
      inRanoKau: 0.0,
      inRanoRaraku: 0.0,
      rarakuTuff: 0.0,
      redScoria: 0.0,
      whiteTrachyte: 0.0,
      araRoad: 0.0,
      motuGrass,
    };
  }

  // Sheltered beach / low-terrace masks (break the sea-cliffs at key coastal Ahu sites)
  const anakenaBeachMask = gaussian2D(x, z, B_ANAKENA_COVE[0], B_ANAKENA_COVE[1] + 2.2, 11.5, 9.2, -0.52);
  const ovaheBeachMask = gaussian2D(x, z, 36.2, -35.2, 5.2, 4.6, -0.55);
  const tongarikiShelfMask = gaussian2D(x, z, B_TONGARIKI_SITE[0], B_TONGARIKI_SITE[1] + 1.5, 15.5, 9.5, 0.36);
  const tahaiShelfMask = gaussian2D(x, z, B_TAHAI_SITE[0], B_TAHAI_SITE[1], 10.5, 11.5, 0.15);
  const southAhuShelfMask =
    gaussian2D(x, z, 12.5, 20.5, 8.5, 6.5, 0.38) +
    gaussian2D(x, z, -10.5, 29.0, 8.5, 6.5, 0.38);

  const lowShoreMask = clamp01(
    anakenaBeachMask * 1.15 +
      ovaheBeachMask * 0.85 +
      tongarikiShelfMask * 0.85 +
      tahaiShelfMask * 0.82 +
      southAhuShelfMask * 0.75
  );

  // 1. Basalt Sea-Cliff Perimeter (scaled 50% lower via H_SCALE at the end)
  const kauCliffBoost = 16.0 * gaussian2D(x, z, -56.0, 44.0, 22.0, 22.0, 0.0);
  const poikeCliffBoost = 13.5 * gaussian2D(x, z, 72.0, -11.0, 20.0, 18.0, 0.15);
  const nwCliffBoost = 11.0 * gaussian2D(x, z, -24.0, -52.0, 20.0, 22.0, -0.35);
  const cliffTargetH =
    (11.5 + kauCliffBoost + poikeCliffBoost + nwCliffBoost) * (1.0 - 0.88 * lowShoreMask);
  const cliffRise = cliffTargetH * Math.pow(smoothstep(0.0, 6.2, baseInlandDist), 0.58);

  // Rolling central volcanic lava steppe connecting the 3 volcanoes
  const baseSteppe =
    11.5 * smoothstep(0.0, 26.0, baseInlandDist) +
    1.6 *
      Math.sin(x * 0.075 + 0.4) *
      Math.cos(z * 0.075 - 0.3) *
      smoothstep(2.0, 14.0, baseInlandDist);

  // 2. Ma'unga Terevaka Broad Shield Apex + Parasitic Cinder Cones
  const terevakaShield =
    66.5 * gaussian2D(x, z, -11.5, -45.5, 29.5, 27.5, -0.22) +
    14.0 * gaussian2D(x, z, -16.0, -30.0, 24.0, 20.0, 0.3);
  const hivaHivaCone = 7.2 * gaussian2D(x, z, -22.5, -36.5, 6.2, 5.8, 0.0);
  const ranoAroiRim =
    5.4 * Math.exp(-Math.pow((Math.hypot(x + 6.5, z + 38.5) - 3.6) / 1.8, 2.0)) -
    4.2 * (1.0 - smoothstep(2.2, 3.8, Math.hypot(x + 6.5, z + 38.5)));

  // 3. Poike Peninsula Dome (Ma'unga Puakatiki) + Ko te Ava o Iko Saddle + Trachyte Cones
  const poikeDome = 39.5 * gaussian2D(x, z, 67.5, -12.0, 17.5, 14.8, 0.18);
  const poikeSaddleDip = -6.5 * gaussian2D(x, z, 46.5, -13.5, 6.2, 14.5, 0.38);
  const trachyteCones =
    5.8 * gaussian2D(x, z, 57.5, -16.0, 3.4, 3.1, 0.0) +
    4.9 * gaussian2D(x, z, 61.5, -14.2, 3.0, 2.8, 0.0);

  let baseH =
    cliffRise +
    baseSteppe +
    terevakaShield +
    hivaHivaCone +
    ranoAroiRim +
    poikeDome +
    poikeSaddleDip +
    trachyteCones;

  // 4. Rano Kau Giant Sunken Volcanic Caldera + Kari Kari Seaward Cliff Notch
  const dKau = Math.hypot(x - B_RANO_KAU_CENTER[0], z - B_RANO_KAU_CENTER[1]);
  const kauOuterSlope = 29.0 * Math.exp(-Math.pow(dKau / 25.5, 1.85));
  const kauRimRing = 11.5 * Math.exp(-Math.pow((dKau - B_RANO_KAU_RADIUS) / 4.2, 2.0));
  const kauAng = Math.atan2(z - B_RANO_KAU_CENTER[1], x - B_RANO_KAU_CENTER[0]);
  const kariKariDiff = Math.atan2(Math.sin(kauAng - 2.38), Math.cos(kauAng - 2.38));
  const kariKariNotch =
    Math.exp(-Math.pow(kariKariDiff / 0.26, 2.0)) *
    Math.exp(-Math.pow((dKau - B_RANO_KAU_RADIUS) / 4.6, 2.0));

  baseH += kauOuterSlope + kauRimRing * (1.0 - 0.62 * kariKariNotch);
  const inRanoKau = 1.0 - smoothstep(B_RANO_KAU_RADIUS - 3.2, B_RANO_KAU_RADIUS + 0.5, dKau);
  if (inRanoKau > 0.001) {
    baseH = lerp(baseH, B_RANO_KAU_LAKE_Y - 2.8, inRanoKau);
  }

  // 5. Rano Raraku Golden-Ochre Tuff Quarry Crater
  const dRaraku = Math.hypot(x - B_RANO_RARAKU_CENTER[0], z - B_RANO_RARAKU_CENTER[1]);
  const rarakuAng = Math.atan2(z - B_RANO_RARAKU_CENTER[1], x - B_RANO_RARAKU_CENTER[0]);
  const seQuarryAsym = 0.65 + 0.52 * Math.cos(rarakuAng - 0.68);
  const rarakuCone = 18.5 * seQuarryAsym * Math.exp(-Math.pow(dRaraku / 12.2, 1.9));
  const rarakuRim =
    9.2 * seQuarryAsym * Math.exp(-Math.pow((dRaraku - B_RANO_RARAKU_RADIUS) / 2.9, 2.0));
  baseH += rarakuCone + rarakuRim;
  const inRanoRaraku =
    1.0 - smoothstep(B_RANO_RARAKU_RADIUS - 2.1, B_RANO_RARAKU_RADIUS + 0.35, dRaraku);
  if (inRanoRaraku > 0.001) {
    baseH = lerp(baseH, B_RANO_RARAKU_LAKE_Y - 2.1, inRanoRaraku);
  }

  // 6. Puna Pau Red Scoria Quarry Cone
  const dPuna = Math.hypot(x - B_PUNA_PAU_CENTER[0], z - B_PUNA_PAU_CENTER[1]);
  const punaCone = 12.5 * Math.exp(-Math.pow(dPuna / 8.2, 1.8));
  const punaRim = 4.6 * Math.exp(-Math.pow((dPuna - B_PUNA_PAU_RADIUS) / 1.9, 2.0));
  baseH += punaCone + punaRim;
  const inPunaPau = 1.0 - smoothstep(B_PUNA_PAU_RADIUS - 1.5, B_PUNA_PAU_RADIUS + 0.25, dPuna);
  if (inPunaPau > 0.001) {
    baseH = lerp(baseH, 19.5, inPunaPau * 0.85);
  }

  // 7. Smooth Leveling on Key Ceremonial Ahu Terraces & Anakena Coral Beach
  const tongarikiFlat = gaussian2D(x, z, B_TONGARIKI_SITE[0], B_TONGARIKI_SITE[1], 13.5, 6.8, 0.36);
  if (tongarikiFlat > 0.08) {
    baseH = lerp(baseH, 4.4, clamp01(tongarikiFlat * 0.88));
  }

  const tahaiFlat = gaussian2D(x, z, B_TAHAI_SITE[0], B_TAHAI_SITE[1], 7.5, 9.5, 0.15);
  if (tahaiFlat > 0.08) {
    baseH = lerp(baseH, 4.8, clamp01(tahaiFlat * 0.85));
  }

  const akiviFlat = gaussian2D(x, z, B_AKIVI_SITE[0], B_AKIVI_SITE[1], 6.8, 7.8, -0.18);
  if (akiviFlat > 0.1) {
    baseH = lerp(baseH, 23.5, clamp01(akiviFlat * 0.78));
  }

  const akahangaFlat = gaussian2D(x, z, 12.5, 20.2, 6.5, 5.2, 0.38);
  if (akahangaFlat > 0.1) {
    baseH = lerp(baseH, 4.6, clamp01(akahangaFlat * 0.84));
  }

  const vaihuFlat = gaussian2D(x, z, -10.5, 28.8, 6.5, 5.2, 0.38);
  if (vaihuFlat > 0.1) {
    baseH = lerp(baseH, 4.6, clamp01(vaihuFlat * 0.84));
  }

  if (anakenaBeachMask > 0.12 && baseInlandDist < 14.5) {
    const beachSlope = lerp(0.32, 4.8, smoothstep(0.0, 12.5, baseInlandDist));
    baseH = lerp(baseH, beachSlope, clamp01(anakenaBeachMask * 0.92));
  }

  // Apply 50% lower hill elevation scale!
  const h = baseH * H_SCALE;

  // Surface Biome & Geological Color Masks
  const isCoralSand =
    (anakenaBeachMask > 0.28 && baseInlandDist < 9.5) ||
    (ovaheBeachMask > 0.35 && baseInlandDist < 6.0);
  const rarakuTuff = clamp01(
    gaussian2D(x, z, B_RANO_RARAKU_CENTER[0] + 1.5, B_RANO_RARAKU_CENTER[1] + 1.2, 13.5, 13.5, 0.0) *
      1.35
  );
  const redScoria = clamp01(
    gaussian2D(x, z, B_PUNA_PAU_CENTER[0], B_PUNA_PAU_CENTER[1], 7.8, 7.8, 0.0) * 1.4 +
      0.55 * gaussian2D(x, z, -22.5, -36.5, 5.8, 5.8, 0.0)
  );
  const whiteTrachyte = clamp01(
    gaussian2D(x, z, 57.5, -16.0, 3.6, 3.2, 0.0) +
      gaussian2D(x, z, 61.5, -14.2, 3.2, 2.9, 0.0)
  );

  // Subtle ancient Ara Moai transport roads radiating from Rano Raraku quarry
  let araRoad = 0.0;
  if (x > 33.0 && x < 48.0 && z > -4.0 && z < 8.0) {
    const tR1 = clamp01((x - 35.0) / 11.5);
    const rz1 = lerp(2.2, 3.6, tR1);
    araRoad = Math.max(araRoad, Math.exp(-Math.pow((z - rz1) / 1.15, 2.0)) * (1.0 - inRanoRaraku));
  }
  if (x > 4.0 && x < 33.0 && z > 1.0 && z < 21.0) {
    const tR2 = clamp01((32.0 - x) / 26.0);
    const rz2 = lerp(4.2, 17.5, tR2) + 1.4 * Math.sin(tR2 * Math.PI);
    araRoad = Math.max(araRoad, Math.exp(-Math.pow((z - rz2) / 1.1, 2.0)) * (1.0 - inRanoRaraku));
  }

  return {
    h: Math.max(motuH, h),
    inlandDist,
    isCoralSand,
    inRanoKau,
    inRanoRaraku,
    rarakuTuff,
    redScoria,
    whiteTrachyte,
    araRoad,
    motuGrass,
  };
}

/**
 * Builds a uniform circular-clipped high-resolution heightfield mesh across the 330m-wide basin.
 */
function buildRapaNuiTerrainGeometry({ maxRadius = 165.0, gridRes = 216 }) {
  const positions = [];
  const colors = [];
  const indices = [];
  const grid = [];
  const eps = 1.25;

  const colDeepOcean = [0.035, 0.19, 0.36];
  const colCoveAqua = [0.14, 0.68, 0.7];
  const colCoralPinkSand = [0.93, 0.85, 0.74];
  const colBlackBasaltCliff = [0.16, 0.155, 0.17];
  const colWeatheredLava = [0.25, 0.235, 0.22];
  const colGoldenTussock = [0.56, 0.53, 0.25];
  const colOliveSteppe = [0.36, 0.44, 0.2];
  const colHighlandMoor = [0.43, 0.46, 0.24];
  const colRarakuOchreTuff = [0.74, 0.58, 0.31];
  const colPunaRedScoria = [0.62, 0.21, 0.16];
  const colPoikeTrachyte = [0.76, 0.72, 0.64];
  const colAraEarth = [0.44, 0.36, 0.24];

  for (let iz = 0; iz <= gridRes; iz += 1) {
    const vz = lerp(-maxRadius, maxRadius, iz / gridRes);
    const row = [];
    for (let ix = 0; ix <= gridRes; ix += 1) {
      const vx = lerp(-maxRadius, maxRadius, ix / gridRes);
      const rOrigin = Math.hypot(vx, vz);

      const edgeFade = smoothstep(maxRadius - 14.0, maxRadius, rOrigin);
      const s = evalRapaNuiPoint(vx, vz);
      const h = lerp(s.h, -5.4, edgeFade);

      const hx = evalRapaNuiPoint(vx + eps, vz).h - s.h;
      const hz = evalRapaNuiPoint(vx, vz + eps).h - s.h;
      const slope = Math.hypot(hx, hz) / eps;

      let rgb;
      if (h <= 0.06) {
        const dAnakena = Math.hypot(vx - ANAKENA_COVE[0], vz - (ANAKENA_COVE[1] - 3.0));
        const coveTint =
          (1.0 - smoothstep(4.5, 22.5, dAnakena)) * smoothstep(-4.0, -0.1, h);
        rgb = mixRgb(colDeepOcean, colCoveAqua, coveTint * 0.85);
      } else if (s.isCoralSand && h < 2.2) {
        rgb = mixRgb(colCoralPinkSand, colOliveSteppe, smoothstep(1.1, 2.2, h));
      } else {
        const windExposure = clamp01(
          0.5 + 0.35 * Math.sin(vx * 0.04 - vz * 0.035) + 0.25 * smoothstep(9.0, 31.0, h)
        );
        rgb = mixRgb(colOliveSteppe, colGoldenTussock, windExposure);
        rgb = mixRgb(rgb, colHighlandMoor, smoothstep(27.0, 42.0, h) * 0.55);

        rgb = mixRgb(rgb, colRarakuOchreTuff, s.rarakuTuff * 0.86);
        rgb = mixRgb(rgb, colPunaRedScoria, s.redScoria * 0.88);
        rgb = mixRgb(rgb, colPoikeTrachyte, s.whiteTrachyte * 0.65);
        rgb = mixRgb(rgb, colAraEarth, s.araRoad * 0.62);

        // Adjusted slope thresholds for the 1.5x wider / 0.5x lower shield aspect ratio
        const cliffFactor = smoothstep(0.28, 0.68, slope);
        const rockCol =
          s.rarakuTuff > 0.45
            ? mixRgb(colWeatheredLava, colRarakuOchreTuff, 0.72)
            : mixRgb(colWeatheredLava, colBlackBasaltCliff, smoothstep(0.45, 0.95, slope));
        rgb = mixRgb(rgb, rockCol, cliffFactor * 0.92);

        if (!s.isCoralSand && h < 1.8) {
          rgb = mixRgb(colBlackBasaltCliff, rgb, smoothstep(0.35, 1.8, h));
        }

        if (s.motuGrass > 0.05 && h > 2.4) {
          rgb = mixRgb(rgb, colGoldenTussock, s.motuGrass * 0.78);
        }
      }

      const idx = positions.length / 3;
      positions.push(vx, h, vz);
      colors.push(rgb[0], rgb[1], rgb[2]);
      row.push(idx);
    }
    grid.push(row);
  }

  for (let iz = 0; iz < gridRes; iz += 1) {
    for (let ix = 0; ix < gridRes; ix += 1) {
      const v00 = grid[iz][ix];
      const v10 = grid[iz][ix + 1];
      const v01 = grid[iz + 1][ix];
      const v11 = grid[iz + 1][ix + 1];
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

// ============================================================================
// Detailed Sculpted 3D Rapa Nui Moai Geometry Factory
// ============================================================================

/**
 * Builds a closed, outward-normal lofted BufferGeometry from cross-sectional stations:
 * `{ y, zOff = 0, rx, rzFront, rzBack, sq = 0.35 }` (+Z = front face, -Z = flat back).
 */
function buildLoftedSculptGeometry(stations, nSegs = 20) {
  const positions = [];
  const indices = [];
  const rings = [];

  for (let i = 0; i < stations.length; i += 1) {
    const st = stations[i];
    const sq = st.sq ?? 0.35;
    const zOff = st.zOff ?? 0.0;
    const row = [];

    for (let j = 0; j < nSegs; j += 1) {
      const theta = (j / nSegs) * Math.PI * 2.0;
      const rawSin = Math.sin(theta);
      const rawCos = Math.cos(theta);

      const shapedSin =
        Math.sign(rawSin) * lerp(Math.abs(rawSin), Math.pow(Math.abs(rawSin), 0.62), sq);
      const shapedCos =
        Math.sign(rawCos) * lerp(Math.abs(rawCos), Math.pow(Math.abs(rawCos), 0.62), sq);

      const x = shapedSin * st.rx;
      const rz = shapedCos >= 0.0 ? st.rzFront : st.rzBack;
      const z = zOff + shapedCos * rz;

      row.push(positions.length / 3);
      positions.push(x, st.y, z);
    }
    rings.push(row);
  }

  for (let i = 0; i < stations.length - 1; i += 1) {
    for (let j = 0; j < nSegs; j += 1) {
      const jNext = (j + 1) % nSegs;
      const v00 = rings[i][j];
      const v01 = rings[i][jNext];
      const v10 = rings[i + 1][j];
      const v11 = rings[i + 1][jNext];
      indices.push(v00, v01, v11, v00, v11, v10);
    }
  }

  const botSt = stations[0];
  const botCenter = positions.length / 3;
  positions.push(0.0, botSt.y, botSt.zOff ?? 0.0);
  for (let j = 0; j < nSegs; j += 1) {
    const jNext = (j + 1) % nSegs;
    indices.push(botCenter, rings[0][jNext], rings[0][j]);
  }

  const topIdx = stations.length - 1;
  const topSt = stations[topIdx];
  const topCenter = positions.length / 3;
  positions.push(0.0, topSt.y, topSt.zOff ?? 0.0);
  for (let j = 0; j < nSegs; j += 1) {
    const jNext = (j + 1) % nSegs;
    indices.push(topCenter, rings[topIdx][j], rings[topIdx][jNext]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a reusable kit of sculpted Moai anatomical geometries normalized to unit statue
 * crown height = 1.00 (Pukao extends to 1.23 when worn).
 */
function createMoaiGeometryKit() {
  const torsoGeo = buildLoftedSculptGeometry(
    [
      { y: 0.0, zOff: -0.01, rx: 0.255, rzFront: 0.165, rzBack: 0.135, sq: 0.55 },
      { y: 0.08, zOff: 0.0, rx: 0.268, rzFront: 0.188, rzBack: 0.138, sq: 0.48 },
      { y: 0.17, zOff: 0.012, rx: 0.278, rzFront: 0.205, rzBack: 0.136, sq: 0.42 },
      { y: 0.29, zOff: 0.004, rx: 0.258, rzFront: 0.182, rzBack: 0.134, sq: 0.46 },
      { y: 0.41, zOff: -0.004, rx: 0.268, rzFront: 0.174, rzBack: 0.136, sq: 0.58 },
      { y: 0.485, zOff: -0.008, rx: 0.242, rzFront: 0.155, rzBack: 0.13, sq: 0.52 },
      { y: 0.515, zOff: -0.005, rx: 0.162, rzFront: 0.132, rzBack: 0.115, sq: 0.32 },
      { y: 0.565, zOff: 0.0, rx: 0.158, rzFront: 0.135, rzBack: 0.112, sq: 0.35 },
    ],
    20
  );

  const headGeo = buildLoftedSculptGeometry(
    [
      { y: 0.545, zOff: 0.038, rx: 0.152, rzFront: 0.182, rzBack: 0.135, sq: 0.65 },
      { y: 0.615, zOff: 0.025, rx: 0.164, rzFront: 0.178, rzBack: 0.142, sq: 0.68 },
      { y: 0.71, zOff: 0.012, rx: 0.168, rzFront: 0.165, rzBack: 0.146, sq: 0.68 },
      { y: 0.805, zOff: -0.004, rx: 0.166, rzFront: 0.136, rzBack: 0.148, sq: 0.66 },
      { y: 0.868, zOff: -0.006, rx: 0.168, rzFront: 0.134, rzBack: 0.148, sq: 0.68 },
      { y: 0.905, zOff: 0.024, rx: 0.182, rzFront: 0.196, rzBack: 0.152, sq: 0.74 },
      { y: 0.942, zOff: 0.016, rx: 0.176, rzFront: 0.182, rzBack: 0.15, sq: 0.74 },
      { y: 1.0, zOff: -0.018, rx: 0.158, rzFront: 0.148, rzBack: 0.138, sq: 0.72 },
    ],
    20
  );

  const noseGeo = buildLoftedSculptGeometry(
    [
      { y: 0.685, zOff: 0.215, rx: 0.068, rzFront: 0.058, rzBack: 0.045, sq: 0.52 },
      { y: 0.715, zOff: 0.222, rx: 0.056, rzFront: 0.062, rzBack: 0.048, sq: 0.55 },
      { y: 0.775, zOff: 0.192, rx: 0.034, rzFront: 0.045, rzBack: 0.04, sq: 0.58 },
      { y: 0.845, zOff: 0.175, rx: 0.03, rzFront: 0.038, rzBack: 0.038, sq: 0.62 },
      { y: 0.9, zOff: 0.195, rx: 0.042, rzFront: 0.042, rzBack: 0.04, sq: 0.68 },
    ],
    14
  );

  const lipsUpperGeo = new THREE.BoxGeometry(0.118, 0.022, 0.055);
  const lipsLowerGeo = new THREE.BoxGeometry(0.106, 0.02, 0.052);
  const earOuterGeo = new THREE.BoxGeometry(0.042, 0.255, 0.088);
  const earLobeGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.075, 8);

  const upperArmGeo = new THREE.BoxGeometry(0.062, 0.31, 0.105);
  const forearmGeo = new THREE.BoxGeometry(0.135, 0.056, 0.075);
  const handFingersGeo = new THREE.BoxGeometry(0.082, 0.044, 0.058);
  const hamiBandGeo = new THREE.BoxGeometry(0.24, 0.038, 0.055);
  const dorsalRingGeo = new THREE.TorusGeometry(0.058, 0.014, 6, 12);

  const eyeScleraGeo = new THREE.SphereGeometry(0.032, 10, 8);
  eyeScleraGeo.scale(1.28, 0.72, 0.62);
  const eyePupilGeo = new THREE.SphereGeometry(0.018, 8, 8);
  eyePupilGeo.scale(1.0, 0.92, 0.65);

  const pukaoMainGeo = new THREE.CylinderGeometry(0.168, 0.178, 0.175, 16);
  pukaoMainGeo.translate(0, 0.0875, 0);
  const pukaoKnobGeo = new THREE.CylinderGeometry(0.082, 0.095, 0.058, 12);
  pukaoKnobGeo.translate(0, 0.204, 0);

  return {
    torsoGeo,
    headGeo,
    noseGeo,
    lipsUpperGeo,
    lipsLowerGeo,
    earOuterGeo,
    earLobeGeo,
    upperArmGeo,
    forearmGeo,
    handFingersGeo,
    hamiBandGeo,
    dorsalRingGeo,
    eyeScleraGeo,
    eyePupilGeo,
    pukaoMainGeo,
    pukaoKnobGeo,
  };
}

/**
 * Instantiates a single upright sculpted Rapa Nui Moai (+Z = face direction, y = 0 at base of torso).
 */
function buildMoaiInstance(
  kit,
  materials,
  {
    heightM = 5.6,
    widthScale = 1.0,
    stoneMat = materials.tuffGoldMat,
    detailMat = materials.tuffShadowMat,
    hasPukao = false,
    hasEyes = false,
    headOnly = false,
  } = {}
) {
  const moai = new THREE.Group();
  moai.scale.set(heightM * widthScale, heightM, heightM * widthScale);

  if (!headOnly) {
    const torso = new THREE.Mesh(kit.torsoGeo, stoneMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    moai.add(torso);

    for (const side of [-1, 1]) {
      const uArm = new THREE.Mesh(kit.upperArmGeo, detailMat);
      uArm.position.set(side * 0.258, 0.315, 0.012);
      uArm.rotation.z = side * 0.055;
      moai.add(uArm);

      const fArm = new THREE.Mesh(kit.forearmGeo, detailMat);
      fArm.position.set(side * 0.175, 0.152, 0.168);
      fArm.rotation.y = -side * 0.36;
      fArm.rotation.z = -side * 0.08;
      moai.add(fArm);

      const hand = new THREE.Mesh(kit.handFingersGeo, stoneMat);
      hand.position.set(side * 0.068, 0.145, 0.205);
      hand.rotation.y = -side * 0.14;
      moai.add(hand);
    }

    const hami = new THREE.Mesh(kit.hamiBandGeo, detailMat);
    hami.position.set(0.0, 0.078, 0.185);
    moai.add(hami);

    const maroRing = new THREE.Mesh(kit.dorsalRingGeo, detailMat);
    maroRing.position.set(0.0, 0.21, -0.142);
    moai.add(maroRing);
  }

  const headGroup = new THREE.Group();
  if (headOnly) {
    headGroup.position.y = -0.48;
  }

  const head = new THREE.Mesh(kit.headGeo, stoneMat);
  head.castShadow = true;
  head.receiveShadow = true;
  headGroup.add(head);

  const nose = new THREE.Mesh(kit.noseGeo, stoneMat);
  nose.castShadow = true;
  headGroup.add(nose);

  const lipUp = new THREE.Mesh(kit.lipsUpperGeo, detailMat);
  lipUp.position.set(0.0, 0.635, 0.195);
  lipUp.rotation.x = 0.12;
  headGroup.add(lipUp);

  const lipLow = new THREE.Mesh(kit.lipsLowerGeo, stoneMat);
  lipLow.position.set(0.0, 0.612, 0.192);
  lipLow.rotation.x = -0.1;
  headGroup.add(lipLow);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(kit.earOuterGeo, detailMat);
    ear.position.set(side * 0.172, 0.755, -0.012);
    ear.rotation.z = -side * 0.04;
    headGroup.add(ear);

    const lobe = new THREE.Mesh(kit.earLobeGeo, stoneMat);
    lobe.position.set(side * 0.168, 0.618, -0.008);
    headGroup.add(lobe);

    if (hasEyes) {
      const sclera = new THREE.Mesh(kit.eyeScleraGeo, materials.coralEyeMat);
      sclera.position.set(side * 0.072, 0.842, 0.132);
      sclera.rotation.y = side * 0.16;
      headGroup.add(sclera);

      const pupil = new THREE.Mesh(kit.eyePupilGeo, materials.obsidianMat);
      pupil.position.set(side * 0.074, 0.842, 0.149);
      pupil.rotation.y = side * 0.16;
      headGroup.add(pupil);
    }
  }

  if (hasPukao) {
    const pukao = new THREE.Mesh(kit.pukaoMainGeo, materials.pukaoScoriaMat);
    pukao.position.set(0.0, 0.992, -0.012);
    pukao.castShadow = true;
    headGroup.add(pukao);

    const knob = new THREE.Mesh(kit.pukaoKnobGeo, materials.pukaoScoriaMat);
    knob.position.set(0.0, 0.992, -0.012);
    headGroup.add(knob);
  }

  moai.add(headGroup);
  return moai;
}

/**
 * Builds Rano Kau's giant freshwater caldera lake mesh patterned with circular green & gold
 * totora reed floating marshes (nga'atu) scaled proportionally to the caldera radius.
 */
function createRanoKauCalderaLakeMesh(trackMat, radius, yLevel) {
  const nRings = 24;
  const nSegs = 52;
  const positions = [];
  const colors = [];
  const indices = [];
  const grid = [];

  const colDeepWater = [0.05, 0.17, 0.34];
  const colShallWater = [0.09, 0.31, 0.42];
  const colReedLush = [0.25, 0.48, 0.19];
  const colReedGold = [0.54, 0.5, 0.22];

  const k = radius / 15.1;
  const reedMats = [
    [-4.5 * k, -3.2 * k, 4.2 * k],
    [5.2 * k, -2.5 * k, 3.8 * k],
    [-1.2 * k, 5.5 * k, 4.6 * k],
    [6.4 * k, 4.8 * k, 3.2 * k],
    [-7.2 * k, 3.6 * k, 3.5 * k],
    [0.8 * k, -7.2 * k, 3.6 * k],
    [-8.5 * k, -5.8 * k, 2.9 * k],
    [8.8 * k, -1.2 * k, 2.8 * k],
  ];

  for (let i = 0; i <= nRings; i += 1) {
    const u = i / nRings;
    const r = Math.max(0.04, radius * u);
    const row = [];
    for (let j = 0; j < nSegs; j += 1) {
      const th = (j / nSegs) * Math.PI * 2.0;
      const lx = r * Math.cos(th);
      const lz = r * Math.sin(th);

      let reedDensity = smoothstep(0.76, 0.98, u) * 0.88;
      for (let m = 0; m < reedMats.length; m += 1) {
        const [mx, mz, mr] = reedMats[m];
        const d = Math.hypot(lx - mx, lz - mz);
        reedDensity = Math.max(reedDensity, 1.0 - smoothstep(mr * 0.55, mr, d));
      }

      const waterCol = mixRgb(colDeepWater, colShallWater, u * 0.65);
      const reedCol = mixRgb(
        colReedLush,
        colReedGold,
        0.5 + 0.5 * Math.sin((lx / k) * 0.55 - (lz / k) * 0.45)
      );
      const rgb = mixRgb(waterCol, reedCol, clamp01(reedDensity));

      row.push(positions.length / 3);
      positions.push(lx, yLevel + reedDensity * 0.12, lz);
      colors.push(rgb[0], rgb[1], rgb[2]);
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
  geo.computeVertexNormals();

  return new THREE.Mesh(
    geo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.48,
        metalness: 0.08,
      })
    )
  );
}

/**
 * Adds a monumental Rapa Nui Ahu platform where +Z local points outward toward the ocean
 * so every standing Moai stands upright and gazes straight out across the sea!
 */
function addAhuWithMoaiRow(
  group,
  kit,
  mats,
  {
    x,
    y,
    z,
    rotY = 0.0,
    platformWidth = 18.0,
    platformHeight = 1.95,
    platformDepth = 3.4,
    wingWidth = 5.0,
    hasPlaza = true,
    moaiSpecs = [],
  }
) {
  const ahuGroup = new THREE.Group();
  ahuGroup.position.set(x, y, z);
  ahuGroup.rotation.y = rotY;

  // Deep-skirted cyclopean basalt pedestal so coastal slopes never expose an underside gap
  const skirtDepth = 1.4;
  const totalBoxH = platformHeight + skirtDepth;
  const centralPedestal = new THREE.Mesh(
    new THREE.BoxGeometry(platformWidth, totalBoxH, platformDepth),
    mats.ahuBasaltMat
  );
  centralPedestal.position.y = (platformHeight - skirtDepth) * 0.5 - 0.15;
  centralPedestal.castShadow = true;
  centralPedestal.receiveShadow = true;
  ahuGroup.add(centralPedestal);

  // Upper dressed basalt cornice band
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(platformWidth + 0.25, 0.26, platformDepth + 0.22),
    mats.ahuDressedSlabMat
  );
  cornice.position.y = platformHeight - 0.15;
  ahuGroup.add(cornice);

  // Lateral stone wings (pakia) flanking the central pedestal
  if (wingWidth > 0.5) {
    const totalSpan = platformWidth + wingWidth * 2.0;
    const wingH = platformHeight * 0.62 + skirtDepth;
    const wingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(totalSpan, wingH, platformDepth * 0.82),
      mats.ahuBasaltMat
    );
    wingMesh.position.set(0.0, (platformHeight * 0.62 - skirtDepth) * 0.5 - 0.15, -0.08);
    ahuGroup.add(wingMesh);
  }

  // Stepped cobble-paved ceremonial forecourt (+Z seaward front apron)
  if (hasPlaza) {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth + wingWidth * 1.2, 0.85, platformDepth * 1.55),
      mats.poroCobbleMat
    );
    apron.position.set(0.0, -0.18, platformDepth * 0.98);
    apron.receiveShadow = true;
    ahuGroup.add(apron);
  }

  // Mount the upright row of Moai guardians atop the pedestal facing +Z (toward the ocean)!
  const count = moaiSpecs.length;
  const usableW = Math.max(1.0, platformWidth - 2.2);
  for (let i = 0; i < count; i += 1) {
    const spec = moaiSpecs[i];
    const lx =
      spec.xOffset !== undefined
        ? spec.xOffset
        : count === 1
          ? 0.0
          : lerp(-usableW * 0.5, usableW * 0.5, i / (count - 1));

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1.35 * (spec.widthScale ?? 1.0), 0.28, 1.35),
      mats.poroCobbleMat
    );
    slab.position.set(lx, platformHeight + 0.04, 0.0);
    ahuGroup.add(slab);

    const moai = buildMoaiInstance(kit, mats, spec);
    moai.position.set(lx, platformHeight + 0.14, 0.0);
    ahuGroup.add(moai);
  }

  group.add(ahuGroup);
  return ahuGroup;
}

/**
 * Adds traditional Rapa Nui boat-shaped dwellings (Hare Paenga) and stone-walled Manavai gardens.
 */
function addHarePaengaAndManavai(group, mats, hareList, manavaiList) {
  const curbGeo = new THREE.CylinderGeometry(1.2, 1.35, 0.42, 12);
  curbGeo.scale(0.65, 1.0, 2.55);
  const hullRoofGeo = new THREE.SphereGeometry(1.12, 12, 8, 0, Math.PI * 2.0, 0, Math.PI * 0.52);
  hullRoofGeo.scale(0.62, 1.18, 2.45);

  for (let i = 0; i < hareList.length; i += 1) {
    const [hx, hy, hz, rotY, sc = 1.0] = hareList[i];
    const hare = new THREE.Group();
    hare.position.set(hx, hy, hz);
    hare.rotation.y = rotY;
    hare.scale.setScalar(sc);

    const curb = new THREE.Mesh(curbGeo, mats.ahuBasaltMat);
    curb.position.y = 0.08;
    hare.add(curb);

    const roof = new THREE.Mesh(
      hullRoofGeo,
      i % 2 === 0 ? mats.totoraThatchMat : mats.totoraGoldMat
    );
    roof.position.y = 0.22;
    hare.add(roof);

    group.add(hare);
  }

  const wallGeo = new THREE.TorusGeometry(1.95, 0.36, 6, 14);
  wallGeo.rotateX(Math.PI * 0.5);
  const cropGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.55, 12);

  for (let i = 0; i < manavaiList.length; i += 1) {
    const [mx, my, mz, sc = 1.0] = manavaiList[i];
    const mv = new THREE.Group();
    mv.position.set(mx, my, mz);
    mv.scale.setScalar(sc);

    const wall = new THREE.Mesh(wallGeo, mats.ahuBasaltMat);
    wall.scale.set(1.0, 1.45, 1.0);
    wall.position.y = 0.32;
    mv.add(wall);

    const crops = new THREE.Mesh(cropGeo, mats.manavaiGreenMat);
    crops.position.y = 0.22;
    mv.add(crops);

    group.add(mv);
  }
}

/**
 * Adds breaking white ocean surf ribbons around Rapa Nui's wide triangular coastline & Motu stacks.
 */
function addRapaNuiSurfFoam(group, foamMat) {
  const ribbonPoints = [];
  const nSamples = 160;
  const cx = -6.0;
  const cz = -9.0;

  for (let i = 0; i < nSamples; i += 1) {
    const ang = (i / nSamples) * Math.PI * 2.0;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);

    let lo = 24.0;
    let hi = 160.0;
    for (let step = 0; step < 12; step += 1) {
      const mid = (lo + hi) * 0.5;
      const sx = cx + dirX * mid;
      const sz = cz + dirZ * mid;
      if (evalRapaNuiPoint(sx, sz).inlandDist > -1.0) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const r = hi + 1.2;
    ribbonPoints.push([cx + dirX * r, cz + dirZ * r]);
  }

  const positions = [];
  const indices = [];
  for (let i = 0; i < nSamples; i += 1) {
    const [px, pz] = ribbonPoints[i];
    const prev = ribbonPoints[(i - 1 + nSamples) % nSamples];
    const next = ribbonPoints[(i + 1) % nSamples];
    const tx = next[0] - prev[0];
    const tz = next[1] - prev[1];
    const tLen = Math.max(1e-4, Math.hypot(tx, tz));
    let nx = tz / tLen;
    let nz = -tx / tLen;
    if (nx * (px - cx) + nz * (pz - cz) < 0.0) {
      nx = -nx;
      nz = -nz;
    }

    const inAnakena = Math.hypot(px - ANAKENA_COVE[0], pz - ANAKENA_COVE[1]) < 18.0;
    const innerW = inAnakena ? 0.45 : 0.9;
    const outerW = inAnakena ? 1.85 : 3.6;

    positions.push(px - nx * innerW, 0.22, pz - nz * innerW);
    positions.push(px + nx * outerW, 0.18, pz + nz * outerW);
  }

  for (let i = 0; i < nSamples; i += 1) {
    const iNext = (i + 1) % nSamples;
    const a0 = i * 2;
    const a1 = i * 2 + 1;
    const b0 = iNext * 2;
    const b1 = iNext * 2 + 1;
    indices.push(a0, b0, b1, a0, b1, a1);
  }

  const surfGeo = new THREE.BufferGeometry();
  surfGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surfGeo.setIndex(indices);
  surfGeo.computeVertexNormals();
  group.add(new THREE.Mesh(surfGeo, foamMat));

  // White surf rings around each offshore Motu sea stack
  for (const [bmx, bmz, bmrx, bmrz, mrot] of B_MOTU_STACKS) {
    const mx = bmx * W_SCALE;
    const mz = bmz * W_SCALE;
    const mrx = bmrx * W_SCALE;
    const mrz = bmrz * W_SCALE;
    const ringGeo = new THREE.TorusGeometry(Math.max(mrx, mrz) + 1.2, 0.95, 5, 24);
    const ring = new THREE.Mesh(ringGeo, foamMat);
    ring.rotation.x = Math.PI * 0.5;
    ring.rotation.z = -mrot;
    ring.scale.set(1.0, mrz / mrx, 0.16);
    ring.position.set(mx, 0.22, mz);
    group.add(ring);
  }
}

/**
 * Shared tracked material palette for Rapa Nui & Moai sculptures.
 */
function createRapaNuiMaterials(trackMat) {
  return {
    tuffGoldMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0xbda16a, roughness: 0.84, metalness: 0.03 })
    ),
    tuffShadowMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9b8254, roughness: 0.88, metalness: 0.03 })
    ),
    tuffWeatheredMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x928b7b, roughness: 0.9, metalness: 0.04 })
    ),
    tuffLichenMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0xa6997a, roughness: 0.87, metalness: 0.03 })
    ),
    basaltMoaiMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x434146, roughness: 0.82, metalness: 0.06 })
    ),
    pukaoScoriaMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9e3424, roughness: 0.88, metalness: 0.02 })
    ),
    coralEyeMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf6f1e3, roughness: 0.45, metalness: 0.02 })
    ),
    obsidianMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x16151a, roughness: 0.22, metalness: 0.18 })
    ),
    ahuBasaltMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x353338, roughness: 0.92, metalness: 0.04 })
    ),
    ahuDressedSlabMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x4d4847, roughness: 0.86, metalness: 0.04 })
    ),
    poroCobbleMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x625d58, roughness: 0.9, metalness: 0.03 })
    ),
    totoraThatchMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb59352, roughness: 0.88 })
    ),
    totoraGoldMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9c7d43, roughness: 0.9 })
    ),
    manavaiGreenMat: trackMat(
      new THREE.MeshStandardMaterial({ color: 0x387028, roughness: 0.82 })
    ),
  };
}

/**
 * Builds the complete wide, low-relief sculpted 3D assembly for Secret Island Rapa Nui.
 */
export function createRapaNuiIslandAssembly(islandId) {
  if (islandId !== 'rapa_nui') return null;

  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();
  const mats = createRapaNuiMaterials(trackMat);
  const moaiKit = createMoaiGeometryKit();

  // Outward ocean-facing yaw angles for Rapa Nui's three triangular coasts:
  const FACE_SE_OCEAN = 0.409; // (+0.40, +0.92) gazing out over Hotuiti & southern surf
  const FACE_NE_ANAKENA_OCEAN = 2.628; // (+0.49, -0.87) gazing out across Anakena turquoise bay
  const FACE_WEST_OCEAN = -1.982; // (-0.92, -0.40) gazing out across the western horizon

  // 1. Wide, Gently-Sloping Triangular Volcanic Terrain Mesh (330m diameter grid, ~257m x 218m landmass)
  const terrainGeo = buildRapaNuiTerrainGeometry({ maxRadius: 165.0, gridRes: 216 });
  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.03,
      })
    )
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Breaking White Ocean Surf Collar & Offshore Motu Surf Rings + Anakena Turquoise Cove Water
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0fbff, depthWrite: false }),
    0.76
  );
  addRapaNuiSurfFoam(group, foamMat);

  const anakenaLagoonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x26ded0, depthWrite: false }),
    0.52
  );
  const anakenaWater = new THREE.Mesh(new THREE.CircleGeometry(15.5, 32), anakenaLagoonMat);
  anakenaWater.rotation.x = -Math.PI * 0.5;
  anakenaWater.position.set(ANAKENA_COVE[0] + 1.8, 0.16, ANAKENA_COVE[1] - 3.8);
  group.add(anakenaWater);

  // 3. Rano Kau Giant Caldera Lake & Rano Raraku Quarry Lake
  const ranoKauLake = createRanoKauCalderaLakeMesh(
    trackMat,
    RANO_KAU_RADIUS - 2.2,
    RANO_KAU_LAKE_Y
  );
  ranoKauLake.position.set(RANO_KAU_CENTER[0], 0.0, RANO_KAU_CENTER[1]);
  group.add(ranoKauLake);

  const rarakuLake = createRanoKauCalderaLakeMesh(
    trackMat,
    RANO_RARAKU_RADIUS - 1.9,
    RANO_RARAKU_LAKE_Y
  );
  rarakuLake.position.set(RANO_RARAKU_CENTER[0], 0.0, RANO_RARAKU_CENTER[1]);
  group.add(rarakuLake);

  // 4. 'Orongo Ceremonial Stone Village on Rano Kau's Narrow Seaward Rim
  const orongoSlabMat = mats.ahuDressedSlabMat;
  const orongoHouseGeo = new THREE.CylinderGeometry(1.25, 1.55, 0.88, 10);
  orongoHouseGeo.scale(0.75, 1.0, 1.75);
  for (const [ang, rOff, sc] of [
    [2.02, -0.4, 1.1],
    [2.14, 0.25, 1.0],
    [2.25, -0.25, 0.95],
    [2.56, 0.15, 1.05],
    [2.68, -0.25, 0.96],
  ]) {
    const ox = RANO_KAU_CENTER[0] + Math.cos(ang) * (RANO_KAU_RADIUS + rOff);
    const oz = RANO_KAU_CENTER[1] + Math.sin(ang) * (RANO_KAU_RADIUS + rOff);
    const oy = evalRapaNuiPoint(ox, oz).h;
    const stoneHut = new THREE.Mesh(orongoHouseGeo, orongoSlabMat);
    stoneHut.position.set(ox, oy + 0.08, oz);
    stoneHut.rotation.y = -ang + Math.PI * 0.5;
    stoneHut.scale.setScalar(sc);
    group.add(stoneHut);
  }

  // 5. MONUMENTAL AHU TONGARIKI — Grand 15 Upright Moai Platform facing outward over the ocean!
  const tongarikiY = evalRapaNuiPoint(TONGARIKI_SITE[0], TONGARIKI_SITE[1]).h;
  const tongarikiHeights = [
    4.5, 5.1, 5.6, 5.3, 6.4, 5.9, 7.1, 6.6, 6.0, 6.8, 5.7, 6.1, 5.5, 5.8, 4.9,
  ];
  const tongarikiSpecs = tongarikiHeights.map((hM, idx) => ({
    heightM: hM,
    widthScale: 0.94 + (idx % 3) * 0.08,
    stoneMat:
      idx % 3 === 0
        ? mats.tuffGoldMat
        : idx % 3 === 1
          ? mats.tuffLichenMat
          : mats.tuffWeatheredMat,
    detailMat: mats.tuffShadowMat,
    hasPukao: idx === 13,
    hasEyes: idx === 6,
  }));

  addAhuWithMoaiRow(group, moaiKit, mats, {
    x: TONGARIKI_SITE[0],
    y: tongarikiY,
    z: TONGARIKI_SITE[1],
    rotY: FACE_SE_OCEAN,
    platformWidth: 34.0,
    platformHeight: 2.15,
    platformDepth: 3.6,
    wingWidth: 7.5,
    hasPlaza: true,
    moaiSpecs: tongarikiSpecs,
  });

  // 6. RANO RARAKU QUARRY OUTER SEAWARD SLOPES — All upright Moai gazing out toward the ocean!
  const quarryMoaiPlacements = [
    // [baseX, baseZ, oceanFacingRotY, heightM, buriedHeadOnly]
    [40.2, 5.8, 0.58, 6.4, true],
    [41.8, 3.4, 0.72, 5.8, true],
    [37.8, 7.8, 0.48, 6.2, true],
    [42.8, 0.6, 0.84, 5.6, true],
    [35.4, 9.4, 0.44, 6.6, false],
    [32.6, 9.2, 0.42, 5.6, true],
    // Upright Moai standing along the Ara Moai coastal plain facing the ocean
    [25.5, 10.5, FACE_SE_OCEAN, 5.4, false],
    [18.2, 14.2, FACE_SE_OCEAN, 5.2, false],
  ];

  for (let i = 0; i < quarryMoaiPlacements.length; i += 1) {
    const [bqx, bqz, rotY, hM, buriedHeadOnly] = quarryMoaiPlacements[i];
    const qx = bqx * W_SCALE;
    const qz = bqz * W_SCALE;
    const qy = evalRapaNuiPoint(qx, qz).h;
    const qMoai = buildMoaiInstance(moaiKit, mats, {
      heightM: hM,
      widthScale: 0.96 + (i % 3) * 0.06,
      stoneMat: i % 2 === 0 ? mats.tuffGoldMat : mats.tuffLichenMat,
      detailMat: mats.tuffShadowMat,
      headOnly: buriedHeadOnly,
    });
    qMoai.position.set(qx, qy - (buriedHeadOnly ? 0.32 : 0.85), qz);
    qMoai.rotation.set(0.0, rotY, 0.0); // Cleanly upright, facing the ocean!
    group.add(qMoai);
  }

  // 7. ANAKENA COVE — AHU NAU NAU (7 Upright Moai facing Anakena's turquoise bay!) & AHU ATURE HUKI
  const nauNauX = (B_ANAKENA_COVE[0] - 1.2) * W_SCALE;
  const nauNauZ = (B_ANAKENA_COVE[1] + 5.6) * W_SCALE;
  addAhuWithMoaiRow(group, moaiKit, mats, {
    x: nauNauX,
    y: evalRapaNuiPoint(nauNauX, nauNauZ).h,
    z: nauNauZ,
    rotY: FACE_NE_ANAKENA_OCEAN,
    platformWidth: 18.5,
    platformHeight: 1.75,
    platformDepth: 3.0,
    wingWidth: 4.2,
    hasPlaza: true,
    moaiSpecs: [
      { heightM: 3.8, stoneMat: mats.tuffWeatheredMat, hasPukao: false },
      { heightM: 5.4, stoneMat: mats.tuffGoldMat, hasPukao: true },
      { heightM: 5.7, stoneMat: mats.tuffGoldMat, hasPukao: true, hasEyes: true },
      { heightM: 5.8, stoneMat: mats.tuffLichenMat, hasPukao: true },
      { heightM: 5.5, stoneMat: mats.tuffGoldMat, hasPukao: true },
      { heightM: 4.3, stoneMat: mats.tuffWeatheredMat, hasPukao: false },
      { heightM: 3.6, stoneMat: mats.tuffLichenMat, hasPukao: false },
    ],
  });

  const atureX = (B_ANAKENA_COVE[0] + 8.5) * W_SCALE;
  const atureZ = (B_ANAKENA_COVE[1] + 6.8) * W_SCALE;
  addAhuWithMoaiRow(group, moaiKit, mats, {
    x: atureX,
    y: evalRapaNuiPoint(atureX, atureZ).h,
    z: atureZ,
    rotY: FACE_NE_ANAKENA_OCEAN,
    platformWidth: 5.4,
    platformHeight: 1.55,
    platformDepth: 2.6,
    wingWidth: 2.0,
    hasPlaza: true,
    moaiSpecs: [{ heightM: 5.6, widthScale: 1.08, stoneMat: mats.tuffWeatheredMat }],
  });

  // 8. WEST COAST — AHU KO TE RIKU (Awakened Eyes + Pukao) & AHU VAI URI (5 Upright Moai facing ocean!)
  const koTeRikuX = TAHAI_SITE[0] + 2.2;
  const koTeRikuZ = TAHAI_SITE[1] - 6.2;
  addAhuWithMoaiRow(group, moaiKit, mats, {
    x: koTeRikuX,
    y: evalRapaNuiPoint(koTeRikuX, koTeRikuZ).h,
    z: koTeRikuZ,
    rotY: FACE_WEST_OCEAN,
    platformWidth: 5.6,
    platformHeight: 1.7,
    platformDepth: 2.8,
    wingWidth: 2.4,
    hasPlaza: true,
    moaiSpecs: [
      {
        heightM: 6.0,
        stoneMat: mats.tuffGoldMat,
        hasPukao: true,
        hasEyes: true,
      },
    ],
  });

  const vaiUriX = TAHAI_SITE[0] - 2.6;
  const vaiUriZ = TAHAI_SITE[1] + 6.0;
  addAhuWithMoaiRow(group, moaiKit, mats, {
    x: vaiUriX,
    y: evalRapaNuiPoint(vaiUriX, vaiUriZ).h,
    z: vaiUriZ,
    rotY: FACE_WEST_OCEAN,
    platformWidth: 14.6,
    platformHeight: 1.65,
    platformDepth: 2.8,
    wingWidth: 3.0,
    hasPlaza: true,
    moaiSpecs: [
      { heightM: 5.1, stoneMat: mats.tuffWeatheredMat },
      { heightM: 4.6, stoneMat: mats.tuffLichenMat },
      { heightM: 5.3, stoneMat: mats.tuffGoldMat, hasPukao: true },
      { heightM: 4.1, stoneMat: mats.tuffWeatheredMat },
      { heightM: 3.5, stoneMat: mats.tuffLichenMat },
    ],
  });

  // 9. INLAND AHU AKIVI — The 7 Upright Explorers gazing outward toward the ocean!
  addAhuWithMoaiRow(group, moaiKit, mats, {
    x: AKIVI_SITE[0],
    y: evalRapaNuiPoint(AKIVI_SITE[0], AKIVI_SITE[1]).h,
    z: AKIVI_SITE[1],
    rotY: FACE_WEST_OCEAN,
    platformWidth: 18.2,
    platformHeight: 1.55,
    platformDepth: 2.8,
    wingWidth: 3.4,
    hasPlaza: true,
    moaiSpecs: Array.from({ length: 7 }, (_, idx) => ({
      heightM: 5.0 + (idx % 2) * 0.18,
      stoneMat: idx % 2 === 0 ? mats.tuffLichenMat : mats.tuffGoldMat,
    })),
  });

  // 10. SOUTH COAST AHUS (Ahu Akahanga & Ahu Vaihu) — Upright standing Moai rows facing the ocean!
  for (const [bax, baz, hasPukaoIdx] of [
    [12.5, 20.2, 1],
    [-10.5, 28.8, 2],
  ]) {
    const ax = bax * W_SCALE;
    const az = baz * W_SCALE;
    addAhuWithMoaiRow(group, moaiKit, mats, {
      x: ax,
      y: evalRapaNuiPoint(ax, az).h,
      z: az,
      rotY: FACE_SE_OCEAN,
      platformWidth: 13.5,
      platformHeight: 1.65,
      platformDepth: 2.8,
      wingWidth: 3.0,
      hasPlaza: true,
      moaiSpecs: [
        { heightM: 4.6, stoneMat: mats.tuffWeatheredMat, hasPukao: hasPukaoIdx === 0 },
        { heightM: 5.2, stoneMat: mats.tuffGoldMat, hasPukao: hasPukaoIdx === 1 },
        { heightM: 5.0, stoneMat: mats.tuffLichenMat, hasPukao: hasPukaoIdx === 2 },
        { heightM: 4.4, stoneMat: mats.tuffWeatheredMat, hasPukao: false },
      ],
    });
  }

  // 11. PUNA PAU QUARRY — Upright Red Scoria Pukao Topknots inside & beside the crimson crater
  const punaPukaoGeo = new THREE.CylinderGeometry(0.92, 0.98, 1.08, 14);
  for (const [bpx, bpz] of [
    [-30.2, 10.2],
    [-32.0, 11.4],
    [-27.8, 13.6],
  ]) {
    const px = bpx * W_SCALE;
    const pz = bpz * W_SCALE;
    const puk = new THREE.Mesh(punaPukaoGeo, mats.pukaoScoriaMat);
    puk.position.set(px, evalRapaNuiPoint(px, pz).h + 0.5, pz);
    group.add(puk);
  }

  // 12. ANAKENA COCONUT PALM OASIS (Inland behind Ahu Nau Nau so Moai have a clear ocean view!)
  const anakenaPalms = [];
  for (const [ox, oz, sc, lean] of [
    [-8.5, 11.5, 1.2, 0.2],
    [-4.2, 12.8, 1.3, 0.16],
    [0.4, 12.6, 1.25, 0.22],
    [5.2, 11.8, 1.18, 0.18],
    [-10.5, 15.6, 1.1, 0.24],
    [-5.6, 16.4, 1.22, 0.16],
    [-0.6, 16.8, 1.28, 0.18],
    [4.4, 15.8, 1.15, 0.2],
    [8.8, 14.2, 1.08, 0.22],
    [-2.4, 20.2, 1.15, 0.16],
    [2.8, 19.8, 1.1, 0.2],
  ]) {
    const px = ANAKENA_COVE[0] + ox * 1.35;
    const pz = ANAKENA_COVE[1] + oz * 1.35;
    const py = evalRapaNuiPoint(px, pz).h;
    anakenaPalms.push([px, py - 0.15, pz, ox * 0.3, sc, lean]);
  }
  addCoconutGroves(group, trackMat, anakenaPalms);

  // Sparse wind-sculpted Toromiro / Ngaoho broadleaf clusters in sheltered gullies
  const toromiroTrees = [
    [-8.0, -34.5, 1.0, 0.4],
    [-5.2, -37.2, 0.92, -0.6],
    [-38.5, 22.5, 0.96, 0.9],
    [26.5, -18.5, 0.9, -0.3],
    [52.5, -14.0, 0.86, 0.5],
  ].map(([btx, btz, sc, ry]) => {
    const tx = btx * W_SCALE;
    const tz = btz * W_SCALE;
    return [tx, evalRapaNuiPoint(tx, tz).h - 0.12, tz, sc, ry];
  });
  addBroadleafTrees(group, trackMat, toromiroTrees, {
    canopyHexA: 0x3b6428,
    canopyHexB: 0x52782e,
    blossomHex: 0xd9a82b,
  });

  // Low windswept tussock & coastal scrub patches
  const scrubPts = [
    [58.0, -6.0, 1.7, 0.55, 1.5, 0.2],
    [62.5, -18.0, 1.6, 0.5, 1.4, 0.8],
    [-34.0, -28.0, 1.8, 0.55, 1.6, -0.4],
    [-46.0, 18.0, 1.7, 0.52, 1.5, 0.5],
    [4.0, -52.0, 1.6, 0.5, 1.4, 1.1],
  ].map(([bbx, bbz, sx, sy, sz, ry]) => {
    const bx = bbx * W_SCALE;
    const bz = bbz * W_SCALE;
    return [bx, evalRapaNuiPoint(bx, bz).h - 0.1, bz, sx, sy, sz, ry];
  });
  addCoastalScrub(group, trackMat, scrubPts, { hexA: 0x4b6826, hexB: 0x62782c });

  // Boat-shaped Hare Paenga dwellings & circular stone-walled Manavai gardens
  const hareSites = [
    [B_ANAKENA_COVE[0] - 10.5, B_ANAKENA_COVE[1] + 11.5, 0.45, 1.15],
    [B_ANAKENA_COVE[0] - 13.5, B_ANAKENA_COVE[1] + 14.8, 0.62, 1.05],
    [36.5, 12.5, -0.35, 1.12],
    [32.8, 14.5, -0.22, 1.0],
    [B_TAHAI_SITE[0] + 7.5, B_TAHAI_SITE[1] - 1.2, 1.45, 1.1],
    [B_TAHAI_SITE[0] + 8.2, B_TAHAI_SITE[1] + 4.8, 1.32, 1.02],
  ].map(([bhx, bhz, ry, sc]) => {
    const hx = bhx * W_SCALE;
    const hz = bhz * W_SCALE;
    return [hx, evalRapaNuiPoint(hx, hz).h, hz, ry, sc];
  });

  const manavaiSites = [
    [B_ANAKENA_COVE[0] - 5.5, B_ANAKENA_COVE[1] + 21.5, 1.15],
    [28.5, 15.5, 1.2],
    [24.2, 17.8, 1.05],
    [B_TAHAI_SITE[0] + 11.5, B_TAHAI_SITE[1] + 1.8, 1.15],
    [-14.5, -12.5, 1.1],
    [10.5, -16.5, 1.18],
  ].map(([bmx, bmz, sc]) => {
    const mx = bmx * W_SCALE;
    const mz = bmz * W_SCALE;
    return [mx, evalRapaNuiPoint(mx, mz).h - 0.08, mz, sc];
  });

  addHarePaengaAndManavai(group, mats, hareSites, manavaiSites);

  return { group, materials, sinkDepthM: 58.0 };
}

/**
 * Builds a dedicated close-up 3D showcase diorama of Rapa Nui's upright sculpted Moai & Ahu masonry
 * for detailed inspection in the Asset Manager (`asset-viewer.html`).
 */
export function createRapaNuiMoaiShowcaseAssembly() {
  const group = new THREE.Group();
  const { materials, trackMat } = createMaterialTracker();
  const mats = createRapaNuiMaterials(trackMat);
  const kit = createMoaiGeometryKit();

  const turfBase = new THREE.Mesh(
    new THREE.CylinderGeometry(10.8, 11.6, 0.55, 36),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x6e6a38, roughness: 0.9 }))
  );
  turfBase.position.y = -0.28;
  turfBase.receiveShadow = true;
  group.add(turfBase);

  addAhuWithMoaiRow(group, kit, mats, {
    x: 0.0,
    y: 0.35,
    z: -1.6,
    rotY: 0.0,
    platformWidth: 11.2,
    platformHeight: 1.65,
    platformDepth: 2.6,
    wingWidth: 2.4,
    hasPlaza: true,
    moaiSpecs: [
      {
        heightM: 4.8,
        widthScale: 0.98,
        stoneMat: mats.tuffGoldMat,
        detailMat: mats.tuffShadowMat,
        hasPukao: false,
        hasEyes: false,
      },
      {
        heightM: 5.4,
        widthScale: 1.04,
        stoneMat: mats.tuffGoldMat,
        detailMat: mats.tuffShadowMat,
        hasPukao: true,
        hasEyes: true,
      },
      {
        heightM: 4.6,
        widthScale: 1.0,
        stoneMat: mats.tuffWeatheredMat,
        detailMat: mats.tuffShadowMat,
        hasPukao: true,
        hasEyes: false,
      },
    ],
  });

  // Foreground right: Upright half-buried Rano Raraku quarry Moai emerging from a golden tuff mound
  const quarryMound = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.35, 1),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xb68f4c, roughness: 0.9 }))
  );
  quarryMound.scale.set(1.25, 0.52, 1.15);
  quarryMound.position.set(5.6, 0.35, 4.4);
  group.add(quarryMound);

  const quarryHead = buildMoaiInstance(kit, mats, {
    heightM: 5.2,
    stoneMat: mats.tuffGoldMat,
    detailMat: mats.tuffShadowMat,
    headOnly: true,
  });
  quarryHead.position.set(5.6, 0.55, 4.4);
  quarryHead.rotation.set(0.0, -0.35, 0.0);
  group.add(quarryHead);

  // Foreground left: Traditional boat-shaped Hare Paenga + upright Puna Pau red scoria Pukao
  addHarePaengaAndManavai(group, mats, [[-5.6, 0.0, 4.6, 0.55, 0.88]], []);

  const uprightPukao = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.78, 0.88, 16),
    mats.pukaoScoriaMat
  );
  uprightPukao.position.set(-2.6, 0.44, 5.2);
  group.add(uprightPukao);

  return { group, materials };
}
