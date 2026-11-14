/**
 * End-to-end Campaign Quest Economy, Ration Slot Safety & Zero-Compass Audit Suite.
 * Walks a fresh GameState from Ra'iatea all the way to Rapa Nui across all 17 voyages!
 */

import {
  CARGO_CATALOG,
  CREW_CATALOG,
  POI_LABELS,
  getAvailableRoutesFromCurrentIsland,
  interactWithIslandSanctuary,
  onVoyageLandfall,
  performBeachCareeningAndRestock,
} from '../src/core/campaignManager.js';
import { GameState } from '../src/core/gameState.js';
import { OceanSim, VoyageStatus } from '../src/simulation/oceanSim.js';

const logLine =
  typeof print === 'function'
    ? (msg) => print(msg)
    : (msg) => console.log(msg);

const FORBIDDEN_TOKENS = ['north', 'south', 'east', 'west', 'degree', '°', 'compass'];
let assertions = 0;

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`CAMPAIGN ASSERTION FAILED: ${msg}`);
  }
  assertions += 1;
}

function auditText(text, ctx) {
  const lower = String(text).toLowerCase();
  for (const tok of FORBIDDEN_TOKENS) {
    assert(!lower.includes(tok), `Forbidden token "${tok}" in ${ctx}: "${text}"`);
  }
}

logLine('=== Kavenga Full Campaign Walkthrough & Zero-Compass Audit ===');

// 1. Audit static catalogs
for (const [k, v] of Object.entries(CARGO_CATALOG)) {
  auditText(v.name, `Cargo ${k}.name`);
  auditText(v.description, `Cargo ${k}.description`);
}
for (const [k, v] of Object.entries(CREW_CATALOG)) {
  auditText(v.name, `Crew ${k}.name`);
  auditText(v.role, `Crew ${k}.role`);
  auditText(v.traitText, `Crew ${k}.traitText`);
  assert(
    typeof v.portrait === 'string' &&
      v.portrait.startsWith('./assets/crew/') &&
      v.portrait.endsWith('.webp'),
    `Crew ${k} must have relative WebP portrait`
  );
}
for (const [k, v] of Object.entries(POI_LABELS)) {
  auditText(v, `POI ${k}`);
}

// 2. Execute complete 17-leg player journey from Ra'iatea to Rapa Nui!
const gs = new GameState();

const CAMPAIGN_STEPS = [
  { expectedIsland: 'raiatea', sailSongId: 'song_01' },
  { expectedIsland: 'tahaa', sailSongId: 'song_02' },
  { expectedIsland: 'huahine', sailSongId: 'song_03' },
  { expectedIsland: 'manuae', sailSongId: 'song_04' },
  { expectedIsland: 'moorea', sailSongId: 'song_05' },
  { expectedIsland: 'raiatea', sailSongId: 'song_06' }, // Consecrates Red Kura Feathers -> unlocks Song 6!
  { expectedIsland: 'maupiti', sailSongId: 'song_07' }, // Presents Basalt Adze -> unlocks Act II Song 7!
  { expectedIsland: 'nuku_hiva', sailSongId: 'song_08' },
  { expectedIsland: 'ua_pou', sailSongId: 'song_09' },
  { expectedIsland: 'rangiroa', sailSongId: 'song_10' },
  { expectedIsland: 'hiva_oa', sailSongId: 'song_11' },
  { expectedIsland: 'fatu_hiva', sailSongId: 'song_12' },
  { expectedIsland: 'mangareva', sailSongId: 'song_13' },
  { expectedIsland: 'rapa_iti', sailSongId: 'song_14' }, // Unlocks Song 14 trial to Tubuai
  { expectedIsland: 'tubuai', sailSongId: 'song_14r' },  // Harvests Miro wood -> unlocks Return 14R
  { expectedIsland: 'rapa_iti', sailSongId: 'song_15' }, // Carves Pahu drum -> unlocks Song 15 & 16!
  { expectedIsland: 'tongareva', sailSongId: 'song_16' }, // Grand Voyage prep -> sails to Rapa Nui!
];

for (let i = 0; i < CAMPAIGN_STEPS.length; i += 1) {
  const step = CAMPAIGN_STEPS[i];
  assert(
    gs.currentIslandId === step.expectedIsland,
    `Step ${i + 1}: expected to be on ${step.expectedIsland}, got ${gs.currentIslandId}`
  );

  // Visit Sanctuary / Mentor / Outpost
  const sanct = interactWithIslandSanctuary(gs);
  auditText(sanct.title, `${step.expectedIsland} sanctuary title`);
  auditText(sanct.speech, `${step.expectedIsland} sanctuary speech`);
  for (const rw of sanct.rewardsList) {
    auditText(rw, `${step.expectedIsland} reward`);
  }

  // Careen & restock rations within actual slot limits!
  const careenMsg = performBeachCareeningAndRestock(gs);
  auditText(careenMsg, `${step.expectedIsland} careen message`);
  assert(
    gs.getUsedCargoSlots() <= gs.maxCargoSlots,
    `Cargo slots respected on ${step.expectedIsland} (${gs.getUsedCargoSlots()}/${gs.maxCargoSlots})`
  );

  // Verify required route song is unlocked and available from this island
  const routes = getAvailableRoutesFromCurrentIsland(gs);
  const chosen = routes.find((r) => r.song.id === step.sailSongId);
  assert(
    Boolean(chosen),
    `Step ${i + 1} on ${step.expectedIsland}: expected ${step.sailSongId} to be available, got [${routes.map((r) => r.song.id).join(', ')}]`
  );

  // Sail the voyage with actual GameState rations, crew, leeway, and durability!
  const sim = new OceanSim();
  sim.startVoyage(chosen.song, chosen.song.recommendedDeparture, gs);
  for (let t = 0; t < 1200 && sim.status === VoyageStatus.SAILING; t += 1) {
    sim.setHeading(sim.computeCueAutopilotHeading());
    sim.step(1.0);
  }

  assert(
    sim.status === VoyageStatus.ARRIVED,
    `Campaign leg ${step.sailSongId} failed to arrive (status=${sim.status}, rations=${sim.rationsRemaining.toFixed(2)})`
  );
  assert(
    sim.arrivedIsland.id === chosen.song.toIsland,
    `Campaign leg ${step.sailSongId} landed on ${sim.arrivedIsland.id} instead of ${chosen.song.toIsland}`
  );

  onVoyageLandfall(gs, sim.arrivedIsland.id);
  logLine(
    `  Leg ${String(i + 1).padStart(2, ' ')}/17 | ${step.sailSongId.padEnd(8)} | ${step.expectedIsland.padEnd(10)} -> ${gs.currentIslandId.padEnd(10)} | slots=${gs.maxCargoSlots} | crew=${gs.getTotalCrewCount()} | rationsLeft=${sim.rationsRemaining.toFixed(2)}`
  );
}

// Final arrival interaction on Rapa Nui
assert(gs.currentIslandId === 'rapa_nui', 'Reached Rapa Nui at end of Song 16');
const finaleSanct = interactWithIslandSanctuary(gs);
auditText(finaleSanct.title, 'Rapa Nui finale title');
auditText(finaleSanct.speech, 'Rapa Nui finale speech');

assert(
  Object.keys(gs.discoveredIslands).length === 16,
  `Expected all 16 islands discovered, got ${Object.keys(gs.discoveredIslands).length}`
);
assert(gs.masterReplayUnlocked === true, 'Master Navigator replay unlocked upon Rapa Nui finale');
assert(gs.vakaTier === 3 && gs.maxCargoSlots === 8, 'Upgraded to Tier 3 Vaka Moana (8 slots)');
assert(
  gs.hasFisher() && gs.hasSailTender() && gs.hasHullWright(),
  'Recruited all 3 specialist crewmates (Tama, Moana, Kahu)'
);

logLine(`\nFULL 17-LEG CAMPAIGN WALKTHROUGH PASSED! (${assertions} assertions verified)`);
