/**
 * Native JavaScriptCore (jsc -m) verification suite for Phase 1 of Kavenga: Songs of the Star Path.
 * Run via:
 *   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runPhase1Tests.mjs
 */

import {
  DepartureWindow,
  Difficulty,
  allowsRecallAtSea,
  playsSongAtSea,
  showsActiveStarShimmer,
  showsEasyCueInstructions,
  showsSkyAnnotations,
  showsSongLyrics,
} from '../src/core/gameConstants.js';
import { GameState } from '../src/core/gameState.js';
import {
  CONSTELLATIONS,
  HORIZON_HOUSES,
  NAVIGATION_STARS,
} from '../src/data/constellationsData.js';
import { ISLANDS, OCEAN_BASINS } from '../src/data/islandsData.js';
import { SAND_LESSONS } from '../src/data/sandDiagramsData.js';
import { SONGS, buildReturnSong } from '../src/data/songsData.js';
import {
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
import { OceanSim, VoyageStatus } from '../src/simulation/oceanSim.js';
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
assert(Object.keys(NAVIGATION_STARS).length === 31, 'Expected 31 Navigation Stars');
assert(CONSTELLATIONS.length === 10, 'Expected 10 Animal Constellations');
assert(Object.keys(OCEAN_BASINS).length === 3, 'Expected 3 Regional Ocean Basins');
assert(Object.keys(ISLANDS).length === 16, 'Expected 16 Islands across Acts I-III');
assert(Object.keys(SONGS).length === 17, 'Expected 17 authored Songs (1-16 + 14R)');
assert(Object.keys(SAND_LESSONS).length === 16, 'Expected 16 Sand Lessons');

assert(showsActiveStarShimmer(Difficulty.EASY) === true, 'Easy shows active star shimmer');
assert(showsActiveStarShimmer(Difficulty.MEDIUM) === false, 'Medium hides active shimmer');
assert(showsEasyCueInstructions(Difficulty.EASY) === true, 'Easy shows cue instructions');
assert(showsSongLyrics(Difficulty.MEDIUM) === true, 'Medium shows lyrics');
assert(showsSongLyrics(Difficulty.HARD) === false, 'Hard hides text lyrics');
assert(allowsRecallAtSea(Difficulty.HARD) === true, 'Hard allows static Sand Recall');
assert(allowsRecallAtSea(Difficulty.MASTER_NAVIGATOR) === false, 'Master disables Recall at sea');
assert(playsSongAtSea(Difficulty.MASTER_NAVIGATOR) === false, 'Master disables song at sea');
assert(showsSkyAnnotations(Difficulty.MASTER_NAVIGATOR) === false, 'Master shows raw starfield');

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

// ---------------------------------------------------------------------------
// 3. Spherical Astronomy & Polar/Zenith Checks
// ---------------------------------------------------------------------------
logLine('[3/7] Verifying Spherical Astronomy (-12 deg latitude, Pivots & Zenith)...');
const geckoHeart = NAVIGATION_STARS.geckos_heart;
const geckoTransit = computeStarAltAz(geckoHeart.raDeg, geckoHeart.decDeg, geckoHeart.raDeg);
assertNear(geckoTransit.altDeg, 90.0, 0.05, "Gecko's Heart culminates straight overhead at 90 deg");

const horseCrown = NAVIGATION_STARS.horses_crown;
let hoursSkimmingAboveHorizon = 0;
for (let h = 0; h < 24; h += 0.25) {
  const lst = computeLstDeg(160.0, h);
  const st = computeStarAltAz(horseCrown.raDeg, horseCrown.decDeg, lst);
  if (st.altDeg > 0.0 && st.altDeg <= 8.5) {
    hoursSkimmingAboveHorizon += 0.25;
  }
}
assert(
  hoursSkimmingAboveHorizon >= 7.0,
  `Horse's Crown skims low above horizon for >=7h (got ${hoursSkimmingAboveHorizon}h)`
);

const shellCrown = NAVIGATION_STARS.shell_crown;
for (let h = 0; h < 24; h += 2) {
  const st = computeStarAltAz(shellCrown.raDeg, shellCrown.decDeg, computeLstDeg(160.0, h));
  assert(
    st.altDeg > 6.0 && st.altDeg < 18.0,
    `Sea Turtle's Shell Crown remains circumpolar all night (alt=${st.altDeg.toFixed(1)})`
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
gs.savePreVoyageSnapshot();
gs.loadedRations = 0.2;
gs.markIslandDiscovered('tahaa', 'act1_raiatea');
assert(gs.restorePreVoyageSnapshot() === true, 'Restores pre-voyage snapshot');
assert(gs.currentIslandId === 'raiatea' && gs.loadedRations === 3.0, 'Snapshot restored cleanly');

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
  logLine(`  PASS Mercy-Rule reflection: "${sim.reflectionText}"`);
}

logLine(`\nALL PHASE 1 TESTS PASSED! (${passedCount} assertions verified)`);
