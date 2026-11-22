/**
 * Native JavaScriptCore (jsc -m) verification suite for Phase 1 of Kavenga: Songs of the Star Path.
 * Run via:
 *   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runPhase1Tests.mjs
 */

import {
  DEFAULT_SAIL_COLOR,
  DepartureWindow,
  Difficulty,
  SAIL_DYE_PALETTE,
  allowsRecallAtSea,
  computeSailVariantColors,
  normalizeSailColorHex,
  playsSongAtSea,
  showsActiveStarShimmer,
  showsEasyConstellationCutout,
  showsEasyCueInstructions,
  showsSkyAnnotations,
  showsSongLyrics,
} from '../src/core/gameConstants.js';
import { GameState } from '../src/core/gameState.js';
import {
  CARGO_CATALOG,
  getAvailableRoutesFromCurrentIsland,
  interactWithIslandSanctuary,
  onVoyageLandfall,
  performBeachCareeningAndRestock,
} from '../src/core/campaignManager.js';
import {
  AchievementsManager,
  formatAchievementDateLabel,
  formatAchievementDifficultyLabel,
  formatAchievementLocationLabel,
} from '../src/core/achievementsManager.js';
import {
  activateIslandArrivalObjective,
  getActiveObjectivesForDisplay,
} from '../src/core/objectivesManager.js';
import { ACHIEVEMENTS, ACHIEVEMENTS_ORDER } from '../src/data/achievementsData.js';
import {
  ISLAND_ARRIVAL_OBJECTIVE_MAP,
  OBJECTIVES,
  OBJECTIVES_ORDER,
} from '../src/data/objectivesData.js';
import {
  CONSTELLATION_LESSONS,
  CONSTELLATION_LESSONS_ORDER,
  getAvailableUnlearnedLessonForIsland,
} from '../src/data/constellationLessonsData.js';
import {
  CONSTELLATIONS,
  HORIZON_HOUSES,
  NAVIGATION_STARS,
} from '../src/data/constellationsData.js';
import { CONSTELLATION_SILHOUETTES } from '../src/data/constellationSilhouettesData.js';
import { ISLANDS, OCEAN_BASINS } from '../src/data/islandsData.js';
import {
  PLAYER_CHARACTER_PROFILES,
  getPlayerCharacterProfile,
} from '../src/data/playerCharactersData.js';
import { SAND_LESSONS } from '../src/data/sandDiagramsData.js';
import {
  CONSTELLATION_GUIDE,
  getQuizPromptsForIsland,
} from '../src/data/skyVigilData.js';
import { SECRET_SONGS, SONGS, buildReturnSong } from '../src/data/songsData.js';
import {
  WALKABLE_ISLAND_IDS,
  WALKABLE_ISLAND_SPECS,
  canWalkIsland,
  getWalkableIslandSpec,
  isWalkableIsland,
} from '../src/data/walkableIslandsData.js';
import {
  altAzToDirectionVec3,
  computeLstDeg,
  computeStarAltAz,
  computeSunState,
} from '../src/simulation/celestialSim.js';
import {
  IslandWaveZone,
  MotionSignature,
  classifyMotionSignature,
  computeBeatsPerWave,
  sampleTwinHullState,
} from '../src/simulation/hullPhysics.js';
import {
  OceanSim,
  VoyageStatus,
  buildVoyageDebugTraceParams,
  decodeCompactRouteTrace,
  decodeFishSchoolsParam,
  encodeCompactRouteTrace,
} from '../src/simulation/oceanSim.js';
import { LASHING_ZONES, evaluateDeckShadow } from '../src/simulation/shadowCraft.js';

const logLine =
  typeof print === 'function'
    ? (msg) => print(msg)
    : (msg) => console.log(msg);

let passedCount = 0;

function assert(cond, message) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  passedCount += 1;
}

function assertNear(actual, expected, tol, message) {
  const diff = Math.abs(actual - expected);
  if (diff > tol || Number.isNaN(actual)) {
    throw new Error(
      `ASSERTION FAILED: ${message} (expected ${expected} +/- ${tol}, got ${actual})`
    );
  }
  passedCount += 1;
}

logLine('=== Kavenga Phase 1 Native ES Module Test Suite ===');

// ---------------------------------------------------------------------------
// 1. Data Catalog Integrity & Difficulty Matrix Checks
// ---------------------------------------------------------------------------
logLine('\n[1/7] Verifying Declarative Data Catalogs & Difficulty Matrix...');
assert(HORIZON_HOUSES.length === 12, 'Expected 12 Horizon Houses');
assert(Object.keys(NAVIGATION_STARS).length === 34, 'Expected 34 Navigation Stars');
assert(CONSTELLATIONS.length === 10, 'Expected 10 Animal Constellations');

// Ensure every constellation line segment is geometrically compact (< 34 deg arc)
for (const c of CONSTELLATIONS) {
  for (const [idA, idB] of c.lines) {
    const a = NAVIGATION_STARS[idA];
    const b = NAVIGATION_STARS[idB];
    assert(Boolean(a && b), `Constellation ${c.id} references valid stars ${idA}, ${idB}`);
    const dRa = ((a.raDeg - b.raDeg) * Math.PI) / 180.0;
    const dec1 = (a.decDeg * Math.PI) / 180.0;
    const dec2 = (b.decDeg * Math.PI) / 180.0;
    const cosArc = Math.max(
      -1.0,
      Math.min(1.0, Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(dRa))
    );
    const arcDeg = (Math.acos(cosArc) * 180.0) / Math.PI;
    assert(
      arcDeg > 5.0 && arcDeg < 34.0,
      `Constellation ${c.id} segment ${idA}->${idB} must be compact (got ${arcDeg.toFixed(1)} deg)`
    );
  }
}
assert(Object.keys(OCEAN_BASINS).length === 3, 'Expected 3 Regional Ocean Basins');
const campaignIslandList = Object.values(ISLANDS).filter((isl) => !isl.isSecret);
const secretIslandList = Object.values(ISLANDS).filter((isl) => isl.isSecret);
assert(campaignIslandList.length === 16, 'Expected 16 Campaign Islands across Acts I-III');
assert(
  secretIslandList.length === 1 && ISLANDS.rapa_nui?.isSecret === true && ISLANDS.rapa_nui?.inhabited === false,
  'Expected Secret Island Rapa Nui unlisted from campaign elders'
);
assert(Object.keys(SONGS).length === 17, 'Expected 17 authored Songs (1-16 + 14R)');
assert(Object.keys(SAND_LESSONS).length === 16, 'Expected 16 Sand Lessons');
assert(
  Object.keys(CONSTELLATION_GUIDE).length === 10 &&
    getQuizPromptsForIsland('raiatea').length >= 6 &&
    getQuizPromptsForIsland('kiritimati').length >= 6,
  'Expected 10 Constellation Atlas entries and local-hemisphere Eye Trial pools'
);
assert(
  Object.keys(PLAYER_CHARACTER_PROFILES).length === 4,
  'Expected 4 Player Character designs (Easy, Medium, Hard, Master Navigator)'
);
assert(
  getPlayerCharacterProfile(Difficulty.EASY).ageLabel.includes('12') &&
    getPlayerCharacterProfile(Difficulty.EASY).totalHeightM < 1.55,
  'Apprentice (Easy) character represents a 12-14 year old youth'
);
assert(
  getPlayerCharacterProfile(Difficulty.MEDIUM).ageLabel.includes('18') &&
    getPlayerCharacterProfile(Difficulty.MEDIUM).totalHeightM > 1.6,
  'Wayfinder (Medium) character represents an 18-20 year old young adult'
);
assert(
  getPlayerCharacterProfile(Difficulty.HARD).ageLabel.includes('30'),
  'Navigator (Hard) character represents a 30 year old adult'
);
assert(
  getPlayerCharacterProfile(Difficulty.MASTER_NAVIGATOR).ageLabel.includes('50') &&
    getPlayerCharacterProfile(Difficulty.MASTER_NAVIGATOR).attireSummary
      .toLowerCase()
      .includes('gray beard'),
  'Master Navigator character represents a 50 year old elder with a gray beard'
);

// Walkable 3D Island Scope Check (Optional Walk Shore mode on Ra'iatea, Taha'a, Hawai'i, and Rapa Nui)
const expectedWalkableIds = ['raiatea', 'tahaa', 'hawaii', 'rapa_nui'];
assert(
  WALKABLE_ISLAND_IDS.size === expectedWalkableIds.length &&
    expectedWalkableIds.every((id) => isWalkableIsland(id) === true),
  "Ra'iatea, Taha'a, Hawai'i, and Rapa Nui support optional 3D Walk Shore mode on canonical island models"
);
for (const iid of Object.keys(ISLANDS)) {
  if (!expectedWalkableIds.includes(iid)) {
    assert(
      isWalkableIsland(iid) === false,
      `Island ${iid} uses Unified 3D Shore Diorama stage without Walk Shore toggle`
    );
  }
}
for (const wid of Object.keys(ISLANDS)) {
  assert(
    canWalkIsland(wid) === true,
    `Island ${wid} supports 3D Walk Shore mode via WalkableIslandScene`
  );
  const wSpec = getWalkableIslandSpec(wid);
  const expectedScale = expectedWalkableIds.includes(wid)
    ? wSpec?.canonicalScale ?? 1.0
    : 1.55;
  const expectedPoiCount = wid === 'moorea' || wid === 'rapa_nui' ? 5 : 4;
  assert(
    wSpec &&
      wSpec.pois.length === expectedPoiCount &&
      Number.isFinite(expectedScale) &&
      expectedScale >= 1.0,
    `Walkable ${wid} defines ${expectedPoiCount} visual POIs and valid scale`
  );
  const spawnToCanoeDist = Math.hypot(
    wSpec.initialSpawn.x - wSpec.mooredCanoe.x,
    wSpec.initialSpawn.z - wSpec.mooredCanoe.z
  );
  assert(
    spawnToCanoeDist > 3.5 && spawnToCanoeDist < 12.0,
    `Walkable ${wid}: player spawns ashore right next to the moored canoe`
  );
  const canoePoi = wSpec.pois.find((p) => p.id === 'canoe_landing');
  const spawnToCanoeTrigger = Math.hypot(
    wSpec.initialSpawn.x - canoePoi.x,
    wSpec.initialSpawn.z - canoePoi.z
  );
  assert(
    spawnToCanoeTrigger > canoePoi.triggerRadiusM,
    `Walkable ${wid}: initial spawn next to canoe leaves viewport clean until stepping onto landing`
  );
  for (const p of wSpec.pois) {
    assert(
      ['landing', 'sand', 'vigil', 'sanctuary'].includes(p.hubTab),
      `Walkable ${wid} POI ${p.id} maps to a valid 4-station Shore Stage tab`
    );
    const dArr = Math.hypot(
      (p.arrivalSpot?.x ?? 999) - p.x,
      (p.arrivalSpot?.z ?? 999) - p.z
    );
    assert(
      dArr <= p.triggerRadiusM,
      `Walkable ${wid} POI ${p.id} arrivalSpot lands inside its trigger radius`
    );
  }
}

assert(showsActiveStarShimmer(Difficulty.EASY) === true, 'Easy shows active star shimmer');
assert(showsActiveStarShimmer(Difficulty.MEDIUM) === false, 'Medium hides active shimmer');
assert(showsEasyCueInstructions(Difficulty.EASY) === true, 'Easy shows cue instructions');
assert(showsSongLyrics(Difficulty.MEDIUM) === true, 'Medium shows lyrics');
assert(showsSongLyrics(Difficulty.HARD) === false, 'Hard hides text lyrics');
assert(allowsRecallAtSea(Difficulty.HARD) === true, 'Hard allows static Sand Recall');
assert(allowsRecallAtSea(Difficulty.MASTER_NAVIGATOR) === false, 'Master disables Recall at sea');
assert(playsSongAtSea(Difficulty.MASTER_NAVIGATOR) === false, 'Master disables song at sea');
assert(showsSkyAnnotations(Difficulty.MASTER_NAVIGATOR) === false, 'Master shows raw starfield');
assert(
  showsEasyConstellationCutout(Difficulty.EASY) === true &&
    showsEasyConstellationCutout(Difficulty.MEDIUM) === false &&
    showsEasyConstellationCutout(Difficulty.HARD) === false &&
    showsEasyConstellationCutout(Difficulty.MASTER_NAVIGATOR) === false,
  'Sea Turtle constellation cut-out is strictly enabled in Easy difficulty only'
);

// ---------------------------------------------------------------------------
// 2. Inviolable Zero-Compass & Zero-Degree Player String Audit
// ---------------------------------------------------------------------------
logLine('[2/7] Running Strict Zero-Compass & Zero-Degree Audit on All Player Text...');
const FORBIDDEN_TOKENS = ['north', 'south', 'east', 'west', 'degree', '°', 'compass'];

function auditText(text, contextLabel) {
  const lower = String(text).toLowerCase();
  for (const tok of FORBIDDEN_TOKENS) {
    assert(
      !lower.includes(tok),
      `Forbidden token "${tok}" found in ${contextLabel}: "${text}"`
    );
  }
}

for (const h of HORIZON_HOUSES) {
  auditText(h.name, `HorizonHouse ${h.id}`);
}
for (const s of Object.values(NAVIGATION_STARS)) {
  auditText(s.name, `NavigationStar ${s.id}`);
}
for (const c of CONSTELLATIONS) {
  auditText(c.name, `Constellation ${c.id}`);
}
for (const [sid, song] of Object.entries(SONGS)) {
  auditText(song.title, `${sid}.title`);
  for (const v of song.verses) {
    auditText(v.lyrics, `${sid} v${v.verseNumber} lyrics`);
    auditText(v.easyCueText, `${sid} v${v.verseNumber} easyCueText`);
    auditText(v.cueLabel, `${sid} v${v.verseNumber} cueLabel`);
  }
}
for (const [sid, song] of Object.entries(SECRET_SONGS)) {
  auditText(song.title, `${sid}.title`);
  for (const v of song.verses) {
    auditText(v.lyrics, `${sid} v${v.verseNumber} lyrics`);
    auditText(v.easyCueText, `${sid} v${v.verseNumber} easyCueText`);
    auditText(v.cueLabel, `${sid} v${v.verseNumber} cueLabel`);
  }
}
for (const [cid, item] of Object.entries(CARGO_CATALOG)) {
  auditText(item.name, `Cargo ${cid}.name`);
  auditText(item.description, `Cargo ${cid}.description`);
}
for (const [lid, les] of Object.entries(SAND_LESSONS)) {
  auditText(les.title, `SandLesson ${lid}.title`);
  auditText(les.narration, `SandLesson ${lid}.narration`);
  for (const prim of les.primitives) {
    if (prim.label) auditText(prim.label, `SandLesson ${lid} label`);
  }
}
for (const z of Object.values(LASHING_ZONES)) {
  auditText(z.label, `LashingZone ${z.id}`);
}
for (const [diffId, prof] of Object.entries(PLAYER_CHARACTER_PROFILES)) {
  auditText(prof.title, `PlayerCharacter ${diffId}.title`);
  auditText(prof.shortPersona, `PlayerCharacter ${diffId}.shortPersona`);
  auditText(prof.ageLabel, `PlayerCharacter ${diffId}.ageLabel`);
  auditText(prof.attireSummary, `PlayerCharacter ${diffId}.attireSummary`);
}
for (const [wid, wSpec] of Object.entries(WALKABLE_ISLAND_SPECS)) {
  for (const poi of wSpec.pois) {
    auditText(poi.label, `WalkablePOI ${wid}.${poi.id}.label`);
    auditText(poi.title, `WalkablePOI ${wid}.${poi.id}.title`);
    auditText(poi.subtitle, `WalkablePOI ${wid}.${poi.id}.subtitle`);
    auditText(poi.promptHint, `WalkablePOI ${wid}.${poi.id}.promptHint`);
    if (poi.craftsmanName) auditText(poi.craftsmanName, `WalkablePOI ${wid}.${poi.id}.craftsmanName`);
    if (poi.craftsmanQuote) auditText(poi.craftsmanQuote, `WalkablePOI ${wid}.${poi.id}.craftsmanQuote`);
    if (poi.circleDesc) auditText(poi.circleDesc, `WalkablePOI ${wid}.${poi.id}.circleDesc`);
    if (poi.introTitle) auditText(poi.introTitle, `WalkablePOI ${wid}.${poi.id}.introTitle`);
    if (poi.introSpeech) auditText(poi.introSpeech, `WalkablePOI ${wid}.${poi.id}.introSpeech`);
    if (poi.rimDesc) auditText(poi.rimDesc, `WalkablePOI ${wid}.${poi.id}.rimDesc`);
  }
}

assert(
  OBJECTIVES_ORDER.length === 26 &&
    Object.keys(ISLAND_ARRIVAL_OBJECTIVE_MAP).length === 16,
  'Expected 26 Campaign Objectives (16 island arrival + 10 quest/sailing objectives)'
);
for (const [oid, obj] of Object.entries(OBJECTIVES)) {
  auditText(obj.title, `Objective ${oid}.title`);
  auditText(obj.detail, `Objective ${oid}.detail`);
  if (obj.readyNote) auditText(obj.readyNote, `Objective ${oid}.readyNote`);
}

assert(
  ACHIEVEMENTS_ORDER.length === 12 && Object.keys(ACHIEVEMENTS).length === 12,
  'Expected 12 Surprise Achievements'
);
for (const [aid, ach] of Object.entries(ACHIEVEMENTS)) {
  auditText(ach.title, `Achievement ${aid}.title`);
  auditText(ach.description, `Achievement ${aid}.description`);
}
for (const diffVal of Object.values(Difficulty)) {
  auditText(formatAchievementDifficultyLabel(diffVal), `AchievementDiff ${diffVal}`);
}
for (const iid of Object.keys(ISLANDS)) {
  auditText(
    formatAchievementLocationLabel({ islandId: iid, basinId: ISLANDS[iid].basinId }),
    `AchievementLocation ${iid}`
  );
}

assert(
  CONSTELLATION_LESSONS_ORDER.length === 11 &&
    Object.keys(CONSTELLATION_LESSONS).length === 11,
  'Expected 11 progressive Elder-Guided Constellation Sky Vigil lessons (10 animals + Steadfast Peg)'
);
const turtleLesson = CONSTELLATION_LESSONS.lesson_sea_turtle;
assert(
  turtleLesson.islandId === 'tahaa' &&
    turtleLesson.elderName === 'Hina' &&
    turtleLesson.beats.map((b) => b.kind).join(',') ===
      'stone,lines,silhouette,labels,spin',
  "Hina on Taha'a teaches The Sea Turtle via the 5-beat stone -> lines -> silhouette -> labels -> spin sequence"
);
const pegLesson = CONSTELLATION_LESSONS.lesson_steadfast_peg;
assert(
  pegLesson.islandId === 'kiritimati' &&
    pegLesson.elderName === 'Keeper Akura' &&
    pegLesson.unlockKey === 'steadfast_peg',
  'Keeper Akura on Kiritimati teaches The Steadfast Peg (polar star equivalent)'
);
for (const [lesId, cLes] of Object.entries(CONSTELLATION_LESSONS)) {
  auditText(cLes.title, `ConstellationLesson ${lesId}.title`);
  auditText(cLes.elderRole, `ConstellationLesson ${lesId}.elderRole`);
  assert(
    cLes.hasSilhouette === true &&
      cLes.beats.map((b) => b.kind).join(',') ===
        'stone,lines,silhouette,labels,spin',
    `ConstellationLesson ${lesId} must integrate a 5-beat stone -> lines -> silhouette -> labels -> spin sequence`
  );
  const isl = ISLANDS[cLes.islandId];
  assert(
    cLes.portrait === isl.mentorPortrait,
    `ConstellationLesson ${lesId} portrait (${cLes.portrait}) must match island mentorPortrait (${isl.mentorPortrait})`
  );
  const lst = computeLstDeg(cLes.solarRaDeg, cLes.solarHour);
  for (const sid of cLes.focusStarIds) {
    const st = NAVIGATION_STARS[sid];
    assert(Boolean(st), `ConstellationLesson ${lesId} references valid star ${sid}`);
    const aa = computeStarAltAz(st.raDeg, st.decDeg, lst, isl.latDeg);
    assert(
      aa.altDeg >= 8.0,
      `ConstellationLesson ${lesId} focus star ${sid} must be clearly above horizon (got ${aa.altDeg.toFixed(1)})`
    );
  }
  for (let bi = 0; bi < cLes.beats.length; bi += 1) {
    const b = cLes.beats[bi];
    auditText(b.heading, `ConstellationLesson ${lesId} beat ${bi} heading`);
    auditText(b.speech, `ConstellationLesson ${lesId} beat ${bi} speech`);
    auditText(b.buttonLabel, `ConstellationLesson ${lesId} beat ${bi} buttonLabel`);
  }
}

// Verify all 10 Animal Constellation Silhouette Cut-Outs & rigid spherical star alignment
assert(
  Object.keys(CONSTELLATION_SILHOUETTES).length === CONSTELLATIONS.length,
  'Every constellation in CONSTELLATIONS must have an animal silhouette spec'
);
for (const c of CONSTELLATIONS) {
  const spec = CONSTELLATION_SILHOUETTES[c.id];
  assert(Boolean(spec), `Missing silhouette spec for ${c.id}`);
  assert(
    Array.isArray(spec.parts) &&
      spec.parts.length >= 1 &&
      Array.isArray(spec.stencils) &&
      spec.stencils.length >= 1,
    `Silhouette ${c.id} must define non-empty parts and stencils`
  );
  for (const part of spec.parts) {
    for (const cmd of part) {
      for (let k = 1; k < cmd.length; k += 1) {
        assert(
          cmd[k] >= 12 && cmd[k] <= 500,
          `Silhouette ${c.id} coordinate ${cmd[k]} must stay safely inside 512x512 canvas`
        );
      }
    }
  }

  const evalBasisAt = (lstTest, latTest, hdgTest) => {
    const cAA = computeStarAltAz(spec.centerRaDeg, spec.centerDecDeg, lstTest, latTest);
    const mRaw = altAzToDirectionVec3(cAA.altDeg, cAA.azDeg, hdgTest);
    const mL = Math.hypot(mRaw.x, mRaw.y, mRaw.z);
    const M = { x: mRaw.x / mL, y: mRaw.y / mL, z: mRaw.z / mL };

    const uAA = computeStarAltAz(spec.upRaDeg, spec.upDecDeg, lstTest, latTest);
    const vRaw = altAzToDirectionVec3(uAA.altDeg, uAA.azDeg, hdgTest);
    const dvm = vRaw.x * M.x + vRaw.y * M.y + vRaw.z * M.z;
    let vx = vRaw.x - dvm * M.x;
    let vy = vRaw.y - dvm * M.y;
    let vz = vRaw.z - dvm * M.z;
    const vL = Math.hypot(vx, vy, vz);
    vx /= vL;
    vy /= vL;
    vz /= vL;
    const V = { x: vx, y: vy, z: vz };
    const U = {
      x: M.y * V.z - M.z * V.y,
      y: M.z * V.x - M.x * V.z,
      z: M.x * V.y - M.y * V.x,
    };
    return { M, U, V };
  };

  const bSouth = evalBasisAt(25.0, -16.8, 0.0);
  const bNorth = evalBasisAt(165.0, 21.2, 74.0);
  const memberStars = Object.values(NAVIGATION_STARS).filter(
    (s) => s.constellation === c.id && s.id !== 'steadfast_peg'
  );
  assert(memberStars.length >= 3, `Constellation ${c.id} has >= 3 stars`);
  for (const st of memberStars) {
    const sAA1 = computeStarAltAz(st.raDeg, st.decDeg, 25.0, -16.8);
    const d1 = altAzToDirectionVec3(sAA1.altDeg, sAA1.azDeg, 0.0);
    const dm1 = d1.x * bSouth.M.x + d1.y * bSouth.M.y + d1.z * bSouth.M.z;
    const u1 = (d1.x * bSouth.U.x + d1.y * bSouth.U.y + d1.z * bSouth.U.z) / dm1;
    const v1 = (d1.x * bSouth.V.x + d1.y * bSouth.V.y + d1.z * bSouth.V.z) / dm1;
    const px1 = ((u1 / spec.halfSpan) * 0.5 + 0.5) * 512.0;
    const py1 = (0.5 - (v1 / spec.halfSpan) * 0.5) * 512.0;

    const sAA2 = computeStarAltAz(st.raDeg, st.decDeg, 165.0, 21.2);
    const d2 = altAzToDirectionVec3(sAA2.altDeg, sAA2.azDeg, 74.0);
    const dm2 = d2.x * bNorth.M.x + d2.y * bNorth.M.y + d2.z * bNorth.M.z;
    const u2 = (d2.x * bNorth.U.x + d2.y * bNorth.U.y + d2.z * bNorth.U.z) / dm2;
    const v2 = (d2.x * bNorth.V.x + d2.y * bNorth.V.y + d2.z * bNorth.V.z) / dm2;
    const px2 = ((u2 / spec.halfSpan) * 0.5 + 0.5) * 512.0;
    const py2 = (0.5 - (v2 / spec.halfSpan) * 0.5) * 512.0;

    assert(
      px1 >= 55 && px1 <= 457 && py1 >= 55 && py1 <= 457,
      `Star ${st.id} of ${c.id} must project comfortably inside 512x512 silhouette canvas (got ${px1.toFixed(1)}, ${py1.toFixed(1)})`
    );
    assert(
      Math.hypot(px1 - px2, py1 - py2) < 1e-4,
      `Star ${st.id} of ${c.id} must remain rigidly locked to silhouette across hemispheres & headings`
    );
  }
}
let mentorPortraitCount = 0;
let starMasterIslandCount = 0;
for (const [iid, isl] of Object.entries(ISLANDS)) {
  auditText(isl.name, `Island ${iid}.name`);
  auditText(isl.subtitle, `Island ${iid}.subtitle`);
  assert(typeof isl.latDeg === 'number' && Number.isFinite(isl.latDeg), `Island ${iid} must define numeric latDeg`);
  if (isl.act <= 2) {
    assert(isl.hemisphere === 'southern' && isl.latDeg < 0, `Acts I-II island ${iid} must be Southern Hemisphere`);
  } else {
    assert(isl.hemisphere === 'northern' && isl.latDeg > 0, `Act III island ${iid} must be Northern Hemisphere`);
  }
  if (isl.starMasterId) starMasterIslandCount += 1;
  if (isl.inhabited) {
    assert(Boolean(isl.mentorName), `Inhabited island ${iid} must have mentorName`);
    assert(Boolean(isl.mentorRole), `Inhabited island ${iid} must have mentorRole`);
    assert(
      typeof isl.mentorPortrait === 'string' &&
        isl.mentorPortrait.startsWith('./assets/mentors/') &&
        isl.mentorPortrait.endsWith('.webp'),
      `Inhabited island ${iid} must have relative WebP mentorPortrait`
    );
    auditText(isl.mentorName, `Island ${iid}.mentorName`);
    auditText(isl.mentorRole, `Island ${iid}.mentorRole`);
    mentorPortraitCount += 1;
  } else {
    assert(isl.mentorPortrait === '', `Uninhabited island ${iid} should have empty mentorPortrait`);
  }
}
assert(mentorPortraitCount === 15, 'Expected 15 full-body mentor portraits across inhabited islands');
assert(starMasterIslandCount === 2, 'Expected exactly 2 Star Master islands (Maupiti & Kiritimati)');

// Audit all Star-Stone Vigil Constellation Atlas notes & Optional Eye Trial Quiz prompts
for (const sampleIsl of ['raiatea', 'kiritimati']) {
  for (const q of getQuizPromptsForIsland(sampleIsl)) {
    auditText(q.prompt, `Quiz ${q.id}.prompt`);
    auditText(q.successNote, `Quiz ${q.id}.successNote`);
  }
}
for (const [cid, cg] of Object.entries(CONSTELLATION_GUIDE)) {
  auditText(cg.southStatus, `ConstellationGuide ${cid}.southStatus`);
  auditText(cg.northStatus, `ConstellationGuide ${cid}.northStatus`);
  auditText(cg.southNote, `ConstellationGuide ${cid}.southNote`);
  auditText(cg.northNote, `ConstellationGuide ${cid}.northNote`);
}

// ---------------------------------------------------------------------------
// 3. Spherical Astronomy & Dual-Hemisphere Polar/Zenith Checks
// ---------------------------------------------------------------------------
logLine('[3/7] Verifying Spherical Astronomy (Southern vs Northern Hemisphere Latitudes)...');
const geckoHeart = NAVIGATION_STARS.geckos_heart;
const geckoTransit = computeStarAltAz(geckoHeart.raDeg, geckoHeart.decDeg, geckoHeart.raDeg);
assertNear(geckoTransit.altDeg, 90.0, 0.05, "Gecko's Heart culminates straight overhead at -12 deg");

const horseCrown = NAVIGATION_STARS.horses_crown;
let hoursSkimmingAboveHorizon = 0;
for (let h = 0; h < 24; h += 0.25) {
  const lst = computeLstDeg(160.0, h);
  const st = computeStarAltAz(horseCrown.raDeg, horseCrown.decDeg, lst, ISLANDS.nuku_hiva.latDeg);
  if (st.altDeg > 0.0 && st.altDeg <= 10.5) {
    hoursSkimmingAboveHorizon += 0.25;
  }
}
assert(
  hoursSkimmingAboveHorizon >= 7.0,
  `Horse's Crown skims low off Nuku Hiva for >=7h (got ${hoursSkimmingAboveHorizon}h)`
);

const shellCrown = NAVIGATION_STARS.shell_crown;
const steadfastPeg = NAVIGATION_STARS.steadfast_peg;

// Southern Star Master (Maupiti, -17.8 deg): Sea Turtle circumpolar; Steadfast Peg hidden below horizon!
for (let h = 0; h < 24; h += 2) {
  const lst = computeLstDeg(160.0, h);
  const stTurtle = computeStarAltAz(shellCrown.raDeg, shellCrown.decDeg, lst, ISLANDS.maupiti.latDeg);
  const stPeg = computeStarAltAz(steadfastPeg.raDeg, steadfastPeg.decDeg, lst, ISLANDS.maupiti.latDeg);
  assert(
    stTurtle.altDeg > 11.0 && stTurtle.altDeg < 24.0,
    `Maupiti (-17.8): Sea Turtle remains circumpolar all night (alt=${stTurtle.altDeg.toFixed(1)})`
  );
  assert(
    stPeg.altDeg < -16.0,
    `Maupiti (-17.8): Steadfast Peg hidden below sea all night (alt=${stPeg.altDeg.toFixed(1)})`
  );
}

// Northern Star Master (Kiritimati, +21.2 deg): Steadfast Peg & Horse circumpolar; Sea Turtle hidden below horizon!
for (let h = 0; h < 24; h += 2) {
  const lst = computeLstDeg(160.0, h);
  const stPeg = computeStarAltAz(steadfastPeg.raDeg, steadfastPeg.decDeg, lst, ISLANDS.kiritimati.latDeg);
  const stHorse = computeStarAltAz(horseCrown.raDeg, horseCrown.decDeg, lst, ISLANDS.kiritimati.latDeg);
  const stTurtle = computeStarAltAz(shellCrown.raDeg, shellCrown.decDeg, lst, ISLANDS.kiritimati.latDeg);
  assert(
    stPeg.altDeg > 20.0 && stPeg.altDeg < 22.5,
    `Kiritimati (+21.2): Steadfast Peg motionless ~21 deg all night (alt=${stPeg.altDeg.toFixed(1)})`
  );
  assert(
    stHorse.altDeg > 0.5,
    `Kiritimati (+21.2): Horse's Crown circumpolar all night (alt=${stHorse.altDeg.toFixed(1)})`
  );
  assert(
    stTurtle.altDeg < -14.0,
    `Kiritimati (+21.2): Sea Turtle hidden below sea all night (alt=${stTurtle.altDeg.toFixed(1)})`
  );
}

// ---------------------------------------------------------------------------
// 4. Solar Deck Shadow Craft (Pou -> Iako Sennit Lashings)
// ---------------------------------------------------------------------------
logLine('[4/7] Verifying Pou Deck Shadow Zones across Songs 2, 4, 7, 16 & High Noon...');
const shadowCases = [
  ['Song 2', 180.0, 9.0, 13.8, 'left_mid'],
  ['Song 4', 290.0, 15.0, 184.9, 'left_outer'],
  ['Song 7', 55.0, 8.0, 60.0, 'left_inner'],
  ['Song 16', 155.0, 8.0, 90.0, 'center_aft'],
  ['High Noon', 180.0, 12.0, 45.0, 'zenith_base'],
  ['Midnight', 180.0, 0.0, 90.0, 'none'],
];
for (const [label, sra, hr, hdg, expectedZone] of shadowCases) {
  const sun = computeSunState(sra, hr);
  const sh = evaluateDeckShadow(sun.altDeg, sun.azDeg, hdg);
  assert(
    sh.zone === expectedZone,
    `${label} deck shadow expected ${expectedZone}, got ${sh.zone}`
  );
}

// ---------------------------------------------------------------------------
// 5. Twin-Hull 4-Beat Swell Coupling & Wave Zones
// ---------------------------------------------------------------------------
logLine('[5/7] Verifying Twin-Hull 4-Beat Doppler Curve & Motion Signatures...');
assertNear(computeBeatsPerWave(135.0, 135.0), 2.75, 0.01, 'Head-on = 2.75 beats/wave');
assertNear(computeBeatsPerWave(90.0, 135.0), 4.0, 0.005, 'Starboard Cheek = 4.000 beats/wave');
assertNear(computeBeatsPerWave(180.0, 135.0), 4.0, 0.005, 'Port Cheek = 4.000 beats/wave');
assertNear(computeBeatsPerWave(45.0, 135.0), 5.16, 0.05, 'Beam-On = ~5.16 beats/wave');
assertNear(computeBeatsPerWave(315.0, 135.0), 6.25, 0.01, 'Following = 6.25 beats/wave');

const portCheekClass = classifyMotionSignature(180.0, 135.0);
assert(portCheekClass.signature === MotionSignature.PORT_CHEEK, '180 vs 135 swell = PORT_CHEEK');
auditText(portCheekClass.description, 'Port cheek motion description');

const stbdCheekClass = classifyMotionSignature(90.0, 135.0);
assert(
  stbdCheekClass.signature === MotionSignature.STARBOARD_CHEEK,
  '90 vs 135 swell = STARBOARD_CHEEK'
);

const sampleHull = sampleTwinHullState({
  elapsedSec: 12.4,
  bpm: 60.0,
  canoeHeadingDeg: 90.0,
  primarySwellFromAz: 135.0,
  secondaryChopFromAz: 180.0,
  islandWaveZone: IslandWaveZone.REFRACTION_LATTICE,
  islandBearingDeg: 95.0,
});
assert(Number.isFinite(sampleHull.pitchRad), 'Hull pitchRad is finite');
assert(Number.isFinite(sampleHull.rollRad), 'Hull rollRad is finite');
assert(Number.isFinite(sampleHull.heaveM), 'Hull heaveM is finite');

// ---------------------------------------------------------------------------
// 6. GameState Snapshot Restore & Upgrade Economy
// ---------------------------------------------------------------------------
logLine('[6/7] Verifying GameState Cargo Slots, Crew Traits & Pre-Voyage Snapshot...');
const gs = new GameState();
assert(gs.maxCargoSlots === 4, 'Starts with 4 cargo slots');
assert(gs.sailColor === DEFAULT_SAIL_COLOR, 'Starts with default Pandanus Cream sail color');
assert(SAIL_DYE_PALETTE.length >= 5, 'Sail dye palette defines multiple pigment options');
for (const dye of SAIL_DYE_PALETTE) {
  auditText(dye.name, `Sail dye ${dye.id}`);
  assert(
    normalizeSailColorHex(dye.hex) === dye.hex.toLowerCase(),
    `Palette dye ${dye.id} has valid normalized hex`
  );
}
assert(
  normalizeSailColorHex('not-a-color') === DEFAULT_SAIL_COLOR,
  'Invalid sail color falls back safely to default'
);
gs.setSailColor('#2ea89c');
const roundTripSailGs = new GameState();
roundTripSailGs.fromJSON(gs.toJSON());
assert(
  roundTripSailGs.sailColor === '#2ea89c',
  'GameState serializes & restores custom sailColor'
);
const customSailVars = computeSailVariantColors('#2ea89c');
assert(
  customSailVars.normalHex === 0x2ea89c &&
    customSailVars.wornHex !== customSailVars.normalHex &&
    customSailVars.seamNormalHex !== customSailVars.normalHex,
  'computeSailVariantColors derives distinct worn & seam colors'
);
assert(
  WALKABLE_ISLAND_SPECS.moorea.pois.some((p) => p.id === 'sail_dye_vats' && p.kind === 'sail_dye') &&
    !WALKABLE_ISLAND_SPECS.raiatea.pois.some((p) => p.kind === 'sail_dye') &&
    !WALKABLE_ISLAND_SPECS.tahaa.pois.some((p) => p.kind === 'sail_dye'),
  "Sail-Dyeing Vats POI exists exclusively on walkable Mo'orea"
);
assert(
  gs.getLearnedConstellationCount() === 0 &&
    !gs.hasLearnedConstellation('the_sea_turtle') &&
    !gs.isStarLearned('shell_crown', NAVIGATION_STARS) &&
    getAvailableUnlearnedLessonForIsland(gs, 'raiatea') === null,
  'Fresh GameState starts knowing 0 constellations and no departure popup on opening Song 1'
);
assert(
  getAvailableUnlearnedLessonForIsland(gs, 'tahaa')?.id === 'lesson_sea_turtle',
  "Taha'a offers Hina's unlearned Sea Turtle vigil before learning"
);
gs.learnConstellation('the_horse');
assert(
  gs.isStarLearned('horses_crown', NAVIGATION_STARS) &&
    !gs.isStarLearned('steadfast_peg', NAVIGATION_STARS) &&
    !gs.isConstellationSegmentLearned('the_horse', 'steadfast_peg', 'horses_crown') &&
    gs.isConstellationSegmentLearned('the_horse', 'horses_crown', 'horses_mane'),
  'Learning the_horse in Act II unlocks grazing stars without prematurely unlocking steadfast_peg'
);
gs.learnConstellation('steadfast_peg');
assert(
  gs.isStarLearned('steadfast_peg', NAVIGATION_STARS) &&
    gs.isConstellationSegmentLearned('the_horse', 'steadfast_peg', 'horses_crown'),
  'Learning steadfast_peg in Act III unlocks Steadfast Peg and its polar tether line'
);
gs.learnedConstellations = {};
gs.savePreVoyageSnapshot();
gs.loadedRations = 0.2;
gs.markIslandDiscovered('tahaa', 'act1_raiatea');
assert(gs.restorePreVoyageSnapshot() === true, 'Restores pre-voyage snapshot');
assert(gs.currentIslandId === 'raiatea' && gs.loadedRations === 3.0, 'Snapshot restored cleanly');
gs.upgradeVakaTier(3);
gs.recruitCrew('tama');
gs.addCargoItem('kava_bundle');
gs.learnSong('song_16');
gs.markIslandDiscovered('hawaii', 'act3_mist_isles');
gs.clearSavedProgress();
assert(
  gs.currentIslandId === 'raiatea' &&
    gs.vakaTier === 1 &&
    gs.maxCargoSlots === 4 &&
    gs.assignedCrew.length === 0 &&
    gs.cargoItems.length === 0 &&
    !gs.learnedSongs.song_16,
  'clearSavedProgress() resets all campaign state back to the starting point on Raʻiātea'
);

// ---------------------------------------------------------------------------
// 7. End-to-End 17-Route Cue Autopilot + Return Song + Mercy-Rule Lost-at-Sea
// ---------------------------------------------------------------------------
logLine('[7/7] Simulating All 17 Campaign Routes + Dynamic Return + Mercy-Rule Test...');
const ORDERED_SONG_IDS = [
  'song_01', 'song_02', 'song_03', 'song_04', 'song_05', 'song_06',
  'song_07', 'song_08', 'song_09', 'song_10', 'song_11', 'song_12',
  'song_13', 'song_14', 'song_14r', 'song_15', 'song_16',
];

for (const sid of ORDERED_SONG_IDS) {
  const song = SONGS[sid];
  const simState = new GameState();
  simState.hullCondition = 100.0;
  simState.sailCondition = 100.0;
  simState.lashingsCondition = 100.0;
  if (song.act === 2) {
    simState.upgradeVakaTier(2);
    simState.recruitCrew('tama');
    simState.recruitCrew('moana');
  } else if (song.act === 3) {
    simState.upgradeVakaTier(3);
    simState.recruitCrew('tama');
    simState.recruitCrew('moana');
    simState.recruitCrew('kahu');
  }
  simState.setLoadedRations(simState.maxCargoSlots);

  const sim = new OceanSim();
  sim.startVoyage(song, song.recommendedDeparture, simState);

  for (let stepIdx = 0; stepIdx < 1200; stepIdx += 1) {
    if (sim.status !== VoyageStatus.SAILING) break;
    const hdg = sim.computeCueAutopilotHeading();
    sim.setHeading(hdg);
    sim.step(1.0);
  }

  assert(
    sim.status === VoyageStatus.ARRIVED,
    `Route ${sid} (${song.fromIsland} -> ${song.toIsland}) did not arrive (status=${sim.status})`
  );
  assert(
    sim.arrivedIsland.id === song.toIsland,
    `Route ${sid} arrived at wrong island: expected ${song.toIsland}, got ${sim.arrivedIsland.id}`
  );
  assert(
    sim.rationsRemaining > 0.5,
    `Route ${sid} rations too tight (${sim.rationsRemaining.toFixed(2)})`
  );
  assert(
    sim.routeTrace.length >= 4,
    `Route ${sid} recorded sailed trajectory (${sim.routeTrace.length} pts)`
  );
  const traceParams = buildVoyageDebugTraceParams(sim);
  assert(
    traceParams.outcome === 'landfall' &&
      traceParams.landed === song.toIsland &&
      /^[0-9._-]+$/.test(traceParams.pts),
    `Route ${sid} debug trace params are URL-clean and match landfall`
  );
  const decodedTrace = decodeCompactRouteTrace(traceParams.pts);
  assert(
    decodedTrace.length >= 4 &&
      Math.hypot(
        decodedTrace[0].x - sim.startPos.x,
        decodedTrace[0].y - sim.startPos.y
      ) < 0.02 &&
      Math.hypot(
        decodedTrace[decodedTrace.length - 1].x - sim.pos.x,
        decodedTrace[decodedTrace.length - 1].y - sim.pos.y
      ) < 0.02,
    `Route ${sid} compact trace round-trips start and arrival coordinates`
  );
  logLine(
    `  PASS ${sid.padEnd(8)} | ${song.fromIsland.padEnd(10)} -> ${song.toIsland.padEnd(10)} | ${(sim.elapsedRealSec / 60.0).toFixed(2)}m | rations=${sim.rationsRemaining.toFixed(2)}`
  );
}

// Dynamic Return Song test (Huahine -> Taha'a)
const returnSong = buildReturnSong('huahine', 'tahaa');
assert(Boolean(returnSong), 'Built dynamic return song for huahine -> tahaa');
auditText(returnSong.verses[0].lyrics, 'Dynamic return song lyrics');
{
  const simState = new GameState();
  simState.setLoadedRations(4);
  const sim = new OceanSim();
  sim.startVoyage(returnSong, DepartureWindow.DAWN, simState);
  for (let i = 0; i < 600 && sim.status === VoyageStatus.SAILING; i += 1) {
    sim.setHeading(sim.computeCueAutopilotHeading());
    sim.step(1.0);
  }
  assert(
    sim.status === VoyageStatus.ARRIVED && sim.arrivedIsland.id === 'tahaa',
    'Dynamic return song arrives cleanly at Tahaʻa'
  );
}

// Mercy-Rule Lost-at-Sea + Zero-Compass Reflection test
{
  const simState = new GameState();
  simState.setLoadedRations(4);
  const sim = new OceanSim();
  sim.startVoyage(SONGS.song_01, DepartureWindow.DAWN, simState);
  // Deliberately sail opposite Taha'a into empty water
  for (let i = 0; i < 600 && sim.status === VoyageStatus.SAILING; i += 1) {
    sim.setHeading(180.0);
    sim.step(1.0);
  }
  assert(sim.status === VoyageStatus.LOST_AT_SEA, 'Sailing opposite target triggers Mercy-Rule Lost at Sea');
  assert(sim.reflectionText.length > 20, 'Post-mist reflection generated');
  auditText(sim.reflectionText, 'Post-mist reflection text');
  const lostTrace = buildVoyageDebugTraceParams(sim);
  const lostPts = decodeCompactRouteTrace(lostTrace.pts);
  assert(
    lostTrace.outcome === 'lost_at_sea' &&
      lostTrace.reason === 'mercy_divergence' &&
      lostPts.length >= 6 &&
      lostPts[lostPts.length - 1].y < -1.2 &&
      Math.hypot(
        lostPts[lostPts.length - 1].x - sim.pos.x,
        lostPts[lostPts.length - 1].y - sim.pos.y
      ) < 0.02,
    'Lost-at-sea debug trace captures off-course trajectory and termination point'
  );
  const lostFish = decodeFishSchoolsParam(lostTrace.fish);
  assert(
    typeof lostTrace.fish === 'string' &&
      /^[0-9._-]+$/.test(lostTrace.fish) &&
      lostFish.length === sim.fishSchools.length &&
      lostFish.every((f, idx) => Math.hypot(f.x - sim.fishSchools[idx].x, f.y - sim.fishSchools[idx].y) < 0.02 && !f.harvested),
    'Lost-at-sea debug trace encodes spawned fish schools with clean URL characters'
  );
  // Dogleg polyline simplification check (>200 points compressed to <=40 while preserving sharp corner)
  const doglegRaw = [];
  for (let i = 0; i <= 100; i += 1) doglegRaw.push({ x: i * 0.1, y: 0 });
  for (let i = 1; i <= 100; i += 1) doglegRaw.push({ x: 10.0, y: i * 0.1 });
  const doglegEncoded = encodeCompactRouteTrace(doglegRaw, 24);
  const doglegDecoded = decodeCompactRouteTrace(doglegEncoded);
  assert(
    doglegDecoded.length === 24 &&
      doglegDecoded.some(
        (p) => Math.abs(p.x - 10.0) < 0.02 && Math.abs(p.y) < 0.02
      ),
    'encodeCompactRouteTrace downsamples while preserving sharp dogleg inflection corner'
  );
  logLine(`  PASS Mercy-Rule reflection: "${sim.reflectionText}"`);
}

// ---------------------------------------------------------------------------
// 8. Objectives & Surprise Achievements End-to-End Verification
// ---------------------------------------------------------------------------
logLine('\n[8/8] Verifying Objectives Lifecycle, Multi-Fish Harvest, 24h Ocean Survival, Rapa Nui & Master Achievements...');
{
  const memStoreMap = new Map();
  const memStorage = {
    getItem: (k) => (memStoreMap.has(k) ? memStoreMap.get(k) : null),
    setItem: (k, v) => memStoreMap.set(k, String(v)),
    removeItem: (k) => memStoreMap.delete(k),
  };

  // A. Fresh GameState starts immediately with Ra'iatea elder objective active,
  //    and sanctuary/landfall interactions emit newly activated objectives for New Objective toasts
  const freshGs = new GameState();
  const initialObjs = getActiveObjectivesForDisplay(freshGs);
  assert(
    initialObjs.length === 1 &&
      initialObjs[0].id === 'meet_raiatea_elder' &&
      initialObjs[0].isHere === true,
    "Fresh GameState on Ra'iatea immediately displays 'Speak with Elder Metua' objective"
  );
  const raiateaSanctuaryRes = interactWithIslandSanctuary(freshGs);
  assert(
    raiateaSanctuaryRes.clearedObjectives.some((o) => o.id === 'meet_raiatea_elder') &&
      raiateaSanctuaryRes.activatedObjectives.some(
        (o) => o.id === 'quest_kura_feathers_raiatea' && o.title && o.detail
      ),
    "Speaking with Elder Metua clears meet_raiatea_elder and emits quest_kura_feathers_raiatea for New Objective toast"
  );
  const tahaaArrivalActivated = activateIslandArrivalObjective(freshGs, 'tahaa');
  assert(
    tahaaArrivalActivated.length === 1 &&
      tahaaArrivalActivated[0].id === 'meet_tahaa_hina' &&
      activateIslandArrivalObjective(freshGs, 'tahaa').length === 0,
    "Arriving on Taha'a emits meet_tahaa_hina once for New Objective toast and does not duplicate on repeat check"
  );

  const unlockedEvents = [];
  const achMgr = new AchievementsManager({
    storage: memStorage,
    nowFn: () => '2026-11-17T18:30:00.000Z',
  });
  achMgr.onUnlock((rec) => unlockedEvents.push(rec));
  assert(
    achMgr.getSummary().unlockedCount === 0 &&
      achMgr.getSummary().remainingMysteryCount === 12,
    'Fresh AchievementsManager starts with 0 unlocked and 12 ??? mystery slots'
  );

  // B. Harvest 2 schools of fish during a single voyage -> unlocks `two_fish_schools_single_voyage`
  const fishGs = new GameState();
  fishGs.difficulty = Difficulty.MEDIUM;
  fishGs.setLoadedRations(4);
  const fishSim = new OceanSim();
  fishSim.startVoyage(SONGS.song_04, DepartureWindow.MIDDAY, fishGs);
  assert(
    fishSim.fishSchools.length >= 2,
    'OceanSim spawns multiple fish schools so 2 schools can be harvested in one voyage'
  );
  // Steer straight through School #1 then School #2 in daylight
  for (const targetSchool of [fishSim.fishSchools[0], fishSim.fishSchools[1]]) {
    fishSim.pos.x = targetSchool.x - 0.1;
    fishSim.pos.y = targetSchool.y - 0.1;
    const evs = fishSim.step(1.0);
    for (const ev of evs) {
      achMgr.evaluateSeaEvent(ev, fishSim, fishGs);
    }
  }
  assert(
    fishSim.fishSchoolsHarvestedCount === 2 &&
      achMgr.isUnlocked('two_fish_schools_single_voyage'),
    'Harvesting two fish schools in a single voyage unlocks two_fish_schools_single_voyage'
  );

  // C. Survive 24 in-game hours at sea without landing -> unlocks `survive_24h_at_sea`
  const seaGs = new GameState();
  seaGs.vakaTier = 3;
  seaGs.maxCargoSlots = 8;
  seaGs.loadedRations = 8;
  const seaSim = new OceanSim();
  seaSim.startVoyage(SONGS.song_01, DepartureWindow.DAWN, seaGs);
  let saw24hEvent = false;
  for (let stepIdx = 0; stepIdx < 1800 && !saw24hEvent; stepIdx += 1) {
    // Sail 90s out into open lagoon-chain water, then hold a steady offshore loop well clear of Ring 4
    seaSim.setHeading(stepIdx < 90 ? 90.0 : ((stepIdx - 90) * 3.0) % 360.0);
    const evs = seaSim.step(1.0);
    for (const ev of evs) {
      if (ev.type === 'survived_24h_at_sea') {
        saw24hEvent = true;
        achMgr.evaluateSeaEvent(ev, seaSim, seaGs);
      }
    }
  }
  assert(
    saw24hEvent &&
      seaSim.status === VoyageStatus.SAILING &&
      seaSim.elapsedGameHours >= 24.0 &&
      achMgr.isUnlocked('survive_24h_at_sea'),
    'Surviving 24 in-game hours at sea without landing unlocks survive_24h_at_sea'
  );

  // D. Sail deliberately from Mangareva to secret Rapa Nui (23.4 units away) -> no Mercy false positive & unlocks `reach_rapa_nui`!
  const rapaGs = new GameState();
  rapaGs.difficulty = Difficulty.HARD;
  rapaGs.vakaTier = 3;
  rapaGs.maxCargoSlots = 8;
  rapaGs.loadedRations = 8;
  rapaGs.recruitCrew('kahu');
  rapaGs.recruitCrew('moana');
  const rapaLaunchSong = buildReturnSong('mangareva', 'fatu_hiva');
  const rapaSim = new OceanSim();
  rapaSim.startVoyage(rapaLaunchSong, DepartureWindow.DAWN, rapaGs);
  const rapaTarget = rapaSim.activeIslands.rapa_nui;
  assert(Boolean(rapaTarget), 'Secret Rapa Nui is present in Act II basin activeIslands');
  for (let t = 0; t < 2000 && rapaSim.status === VoyageStatus.SAILING; t += 1) {
    const dx = rapaTarget.simPos.x - rapaSim.pos.x;
    const dy = rapaTarget.simPos.y - rapaSim.pos.y;
    const brg = (((Math.atan2(dx, dy) * 180.0) / Math.PI) + 360.0) % 360.0;
    rapaSim.setHeading(brg);
    rapaSim.step(1.0);
  }
  assert(
    rapaSim.status === VoyageStatus.ARRIVED && rapaSim.arrivedIsland?.id === 'rapa_nui',
    'Navigator sailing deliberately from Mangareva reaches secret Rapa Nui without Mercy-Rule interruption'
  );
  achMgr.evaluateLandfall(rapaSim, rapaGs, 'rapa_nui');
  assert(achMgr.isUnlocked('reach_rapa_nui'), 'Landing on Rapa Nui unlocks reach_rapa_nui');

  // Verify Mangareva -> Rapa Nui midway fish school allows a full 4-person crew (including Tama) to reach Rapa Nui
  const fullCrewRapaGs = new GameState();
  fullCrewRapaGs.difficulty = Difficulty.HARD;
  fullCrewRapaGs.vakaTier = 3;
  fullCrewRapaGs.maxCargoSlots = 8;
  fullCrewRapaGs.loadedRations = 8;
  fullCrewRapaGs.recruitCrew('tama');
  fullCrewRapaGs.recruitCrew('moana');
  fullCrewRapaGs.recruitCrew('kahu');
  const fullCrewRapaSim = new OceanSim();
  fullCrewRapaSim.startVoyage(buildReturnSong('mangareva', 'nuku_hiva'), DepartureWindow.MIDNIGHT, fullCrewRapaGs);
  const midExpectedX =
    ISLANDS.mangareva.pos.x + (ISLANDS.rapa_nui.pos.x - ISLANDS.mangareva.pos.x) * 0.6;
  const midExpectedY =
    ISLANDS.mangareva.pos.y + (ISLANDS.rapa_nui.pos.y - ISLANDS.mangareva.pos.y) * 0.6;
  assert(
    fullCrewRapaSim.fishSchools.some(
      (s) => Math.hypot(s.x - midExpectedX, s.y - midExpectedY) < 0.01
    ),
    'Every intra-basin sail from Mangareva spawns a fish school 60% of the way to Rapa Nui'
  );
  for (let t = 0; t < 2000 && fullCrewRapaSim.status === VoyageStatus.SAILING; t += 1) {
    const rt = fullCrewRapaSim.activeIslands.rapa_nui;
    const dx = rt.simPos.x - fullCrewRapaSim.pos.x;
    const dy = rt.simPos.y - fullCrewRapaSim.pos.y;
    const brg = (((Math.atan2(dx, dy) * 180.0) / Math.PI) + 360.0) % 360.0;
    fullCrewRapaSim.setHeading(brg);
    fullCrewRapaSim.step(1.0);
  }
  assert(
    fullCrewRapaSim.fishSchoolsHarvestedCount >= 1 &&
      fullCrewRapaSim.status === VoyageStatus.ARRIVED &&
      fullCrewRapaSim.arrivedIsland?.id === 'rapa_nui',
    'Full 4-person crew harvests the Mangareva-Rapa Nui midway fish school and reaches Rapa Nui'
  );
  const rapaTraceParams = buildVoyageDebugTraceParams(fullCrewRapaSim);
  const rapaDecodedFish = decodeFishSchoolsParam(rapaTraceParams.fish);
  assert(
    rapaDecodedFish.length === fullCrewRapaSim.fishSchools.length &&
      rapaDecodedFish.some((f) => f.harvested),
    'Debug trace fish param preserves both harvested and unharvested spawned school flags'
  );

  // D2. Verify Rapa Nui unique Rei Miro & Obsidian Mata'a artifact, Mangareva/Hawai'i secret dialogues,
  //     and both directions of the Secret Pilgrimage Chant (Mangareva <-> Rapa Nui)!
  onVoyageLandfall(fullCrewRapaGs, 'rapa_nui');
  const rapaRes = interactWithIslandSanctuary(fullCrewRapaGs);
  auditText(rapaRes.title, 'RapaNui sanctuary.title');
  auditText(rapaRes.speech, 'RapaNui sanctuary.speech');
  assert(
    fullCrewRapaGs.hasCargoItem('sacred_rei_miro_relic') &&
      fullCrewRapaGs.learnedSongs.secret_rapa_nui_to_mangareva &&
      fullCrewRapaGs.learnedSongs.secret_mangareva_to_rapa_nui,
    "Rapa Nui sanctuary grants Carved Rei Miro & Obsidian Mata'a relic and unlocks secret pilgrimage chants"
  );
  const rapaOutRoutes = getAvailableRoutesFromCurrentIsland(fullCrewRapaGs);
  assert(
    rapaOutRoutes.some((r) => r.song.id === 'secret_rapa_nui_to_mangareva'),
    'Secret Pilgrimage Return Chant is offered from Rapa Nui'
  );
  const returnPilgrimageSim = new OceanSim();
  returnPilgrimageSim.startVoyage(
    SECRET_SONGS.secret_rapa_nui_to_mangareva,
    SECRET_SONGS.secret_rapa_nui_to_mangareva.recommendedDeparture,
    fullCrewRapaGs
  );
  for (let t = 0; t < 2000 && returnPilgrimageSim.status === VoyageStatus.SAILING; t += 1) {
    returnPilgrimageSim.setHeading(returnPilgrimageSim.computeCueAutopilotHeading());
    returnPilgrimageSim.step(1.0);
  }
  assert(
    returnPilgrimageSim.status === VoyageStatus.ARRIVED &&
      returnPilgrimageSim.arrivedIsland?.id === 'mangareva' &&
      returnPilgrimageSim.rationsRemaining > 0.25,
    `Secret Pilgrimage Return Chant reaches Mangareva cleanly (status=${returnPilgrimageSim.status}, rations=${returnPilgrimageSim.rationsRemaining.toFixed(2)})`
  );
  fullCrewRapaGs.currentIslandId = 'mangareva';
  const mangSecretRes = interactWithIslandSanctuary(fullCrewRapaGs);
  auditText(mangSecretRes.speech, 'Mangareva Rapa Nui secret dialogue');
  assert(
    mangSecretRes.speech.includes('Rei Miro') &&
      getAvailableRoutesFromCurrentIsland(fullCrewRapaGs).some(
        (r) => r.song.id === 'secret_mangareva_to_rapa_nui'
      ),
    'Elder Rongo greets Rapa Nui Rei Miro relic with secret dialogue and offers Chant of Te Pito o Te Henua'
  );
  fullCrewRapaGs.currentIslandId = 'hawaii';
  const hawaiiSecretRes = interactWithIslandSanctuary(fullCrewRapaGs);
  auditText(hawaiiSecretRes.speech, 'Hawaii Rapa Nui secret dialogue');
  assert(
    hawaiiSecretRes.speech.includes('Rei Miro'),
    'Ancestral Council on Hawaiʻi honors Rapa Nui Rei Miro relic with secret tribute dialogue'
  );
  const forwardPilgrimageSim = new OceanSim();
  forwardPilgrimageSim.startVoyage(
    SECRET_SONGS.secret_mangareva_to_rapa_nui,
    SECRET_SONGS.secret_mangareva_to_rapa_nui.recommendedDeparture,
    fullCrewRapaGs
  );
  for (let t = 0; t < 2000 && forwardPilgrimageSim.status === VoyageStatus.SAILING; t += 1) {
    forwardPilgrimageSim.setHeading(forwardPilgrimageSim.computeCueAutopilotHeading());
    forwardPilgrimageSim.step(1.0);
  }
  assert(
    forwardPilgrimageSim.status === VoyageStatus.ARRIVED &&
      forwardPilgrimageSim.arrivedIsland?.id === 'rapa_nui' &&
      forwardPilgrimageSim.rationsRemaining > 0.25,
    `Secret Chant of Te Pito o Te Henua arrives at Rapa Nui via cue autopilot (status=${forwardPilgrimageSim.status}, rations=${forwardPilgrimageSim.rationsRemaining.toFixed(2)})`
  );

  // E. Complete all 17 canonical songs in Master Navigator difficulty -> unlocks `all_songs_master_difficulty`
  //    (and verify downgrading difficulty mid-voyage prevents Master credit!)
  const masterGs = new GameState();
  masterGs.difficulty = Difficulty.MASTER_NAVIGATOR;
  const downgradeSim = new OceanSim();
  downgradeSim.startVoyage(SONGS.song_01, DepartureWindow.DAWN, masterGs);
  downgradeSim.sailedPureMasterNavigator = false; // simulated mid-voyage switch to Easy and back
  downgradeSim.arrivedIsland = ISLANDS.tahaa;
  achMgr.evaluateLandfall(downgradeSim, masterGs, 'tahaa');
  assert(
    !achMgr.masterCompletedSongs.song_01,
    'Mid-voyage difficulty downgrade does not grant Master song completion credit'
  );

  for (const [sid, sDef] of Object.entries(SONGS)) {
    const mSim = new OceanSim();
    mSim.startVoyage(sDef, sDef.recommendedDeparture, masterGs);
    mSim.rationsRemaining = 2.0;
    mSim.arrivedIsland = ISLANDS[sDef.toIsland];
    achMgr.evaluateLandfall(mSim, masterGs, sDef.toIsland);
    assert(Boolean(achMgr.masterCompletedSongs[sid]), `Recorded Master completion for ${sid}`);
  }
  assert(
    achMgr.isUnlocked('all_songs_master_difficulty') &&
      achMgr.isUnlocked('reach_hawaii') &&
      achMgr.isUnlocked('fog_without_recall'),
    'Completing all 17 songs on Master Navigator unlocks all_songs_master_difficulty, reach_hawaii, and fog_without_recall'
  );

  // F. Eye Trial 5-streak, fumes landfall, off-window landfall, full crew + Vaka Moana, 11 sky teachings, and all 17 shores
  achMgr.evaluateEyeTrialStreak(5, masterGs, 'raiatea');
  assert(achMgr.isUnlocked('eye_trial_streak_5'), '5-streak in Eye Trial unlocks eye_trial_streak_5');

  const fumesSim = new OceanSim();
  fumesSim.startVoyage(SONGS.song_02, DepartureWindow.MIDNIGHT, masterGs); // off-window!
  fumesSim.rationsRemaining = 0.32;
  achMgr.evaluateLandfall(fumesSim, masterGs, 'huahine');
  assert(
    achMgr.isUnlocked('landfall_on_fumes') && achMgr.isUnlocked('off_window_landfall'),
    'Low-ration (<0.5) and off-window landfalls unlock landfall_on_fumes and off_window_landfall'
  );

  masterGs.upgradeVakaTier(3);
  masterGs.hullCondition = 100.0;
  masterGs.sailCondition = 100.0;
  masterGs.lashingsCondition = 100.0;
  masterGs.recruitCrew('tama');
  masterGs.recruitCrew('moana');
  masterGs.recruitCrew('kahu');
  for (const cLes of Object.values(CONSTELLATION_LESSONS)) {
    masterGs.learnConstellation(cLes.unlockKey);
  }
  for (const iid of Object.keys(ISLANDS)) {
    masterGs.discoveredIslands[iid] = true;
  }
  achMgr.evaluateAshoreState(masterGs, 'fatu_hiva');
  achMgr.evaluateLandfall(fumesSim, masterGs, 'hawaii');
  assert(
    achMgr.isUnlocked('full_crew_and_vaka_moana') &&
      achMgr.isUnlocked('all_constellations_learned') &&
      achMgr.isUnlocked('chart_all_shores'),
    'Unlocked full_crew_and_vaka_moana, all_constellations_learned, and chart_all_shores'
  );

  // G. Verify Start Over (`clearSavedProgress`) resets Objectives while preserving Achievements in storage!
  activateIslandArrivalObjective(masterGs, 'tahaa');
  masterGs.clearSavedProgress();
  const postResetObjs = getActiveObjectivesForDisplay(masterGs);
  const reloadedAchMgr = new AchievementsManager({ storage: memStorage });
  const finalSummary = reloadedAchMgr.getSummary();
  assert(
    postResetObjs.length === 1 &&
      postResetObjs[0].id === 'meet_raiatea_elder' &&
      finalSummary.unlockedCount === 12 &&
      finalSummary.remainingMysteryCount === 0 &&
      unlockedEvents.length === 12 &&
      formatAchievementDateLabel('2026-11-17T18:30:00.000Z').includes('2026'),
    'Start Over resets active objectives to Raʻiatea while preserving all 12 unlocked achievements and metadata'
  );
}

// ── CARGO CATALOG SOURCE ISLANDS & AUTO-CAREENING ON LANDFALL ─────────────────
const cargoEntries = Object.entries(CARGO_CATALOG);
assert(cargoEntries.length === 10, 'Expected 10 quest cargo items in CARGO_CATALOG (including sacred_rei_miro_relic)');
for (const [cargoKey, cargoDef] of cargoEntries) {
  assert(
    typeof cargoDef.sourceIslandId === 'string' && Boolean(ISLANDS[cargoDef.sourceIslandId]),
    `Cargo item ${cargoKey} must declare a valid sourceIslandId (got ${cargoDef.sourceIslandId})`
  );
}
{
  const landfallCareenGs = new GameState();
  landfallCareenGs.hullCondition = 42;
  landfallCareenGs.sailCondition = 55;
  landfallCareenGs.lashingsCondition = 61;
  landfallCareenGs.loadedRations = 1;
  landfallCareenGs.addCargoItem('kava_bundle');
  performBeachCareeningAndRestock(landfallCareenGs);
  assert(
    landfallCareenGs.hullCondition === 88 &&
      landfallCareenGs.sailCondition === 88 &&
      landfallCareenGs.lashingsCondition === 88 &&
      landfallCareenGs.loadedRations === landfallCareenGs.maxCargoSlots - 1,
    'performBeachCareeningAndRestock restores Act I inhabited hull/sail/lashings to 88% and fills remaining ration slots'
  );
  landfallCareenGs.completedQuests.moorea_trade = true;
  performBeachCareeningAndRestock(landfallCareenGs);
  assert(
    landfallCareenGs.hullCondition === 100 &&
      landfallCareenGs.sailCondition === 100 &&
      landfallCareenGs.lashingsCondition === 100,
    'performBeachCareeningAndRestock restores 100% hull/sail/lashings after Moʻorea artisan mastery'
  );
}

// ── RED KURA BIRD EXCLUSIVITY ON MANUAE ───────────────────────────────────────
{
  const kuraIslands = Object.values(ISLANDS).filter((i) => i.birdSpecies === 'red_kura');
  assert(
    kuraIslands.length === 1 && kuraIslands[0].id === 'manuae',
    `Red Kura birds must belong exclusively to Manuae (got ${kuraIslands.map((i) => i.id).join(', ')})`
  );
}

logLine(`\nALL PHASE 1 TESTS PASSED! (${passedCount} assertions verified)`);
