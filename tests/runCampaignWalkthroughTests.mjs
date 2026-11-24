/**
 * End-to-end Campaign Quest Economy, Ration Slot Safety & Zero-Compass Audit Suite.
 * Walks a fresh GameState from Ra'iatea all the way to Rapa Nui across all 17 voyages!
 */

import {
  CANOE_ROUTE_FILTERS,
  CARGO_CATALOG,
  CREW_CATALOG,
  POI_LABELS,
  getAvailableRoutesFromCurrentIsland,
  getRoutesForCanoeFilter,
  interactWithIslandSanctuary,
  onVoyageLandfall,
  performBeachCareeningAndRestock,
} from '../src/core/campaignManager.js';
import { GameState } from '../src/core/gameState.js';
import { getActiveObjectivesForDisplay } from '../src/core/objectivesManager.js';
import {
  ISLAND_ARRIVAL_OBJECTIVE_MAP,
  OBJECTIVES_ORDER,
} from '../src/data/objectivesData.js';
import { getAvailableUnlearnedLessonForIsland } from '../src/data/constellationLessonsData.js';
import { NAVIGATION_STARS } from '../src/data/constellationsData.js';
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

// 2. Execute complete 17-leg player journey from Ra'iatea to Hawai'i!
const gs = new GameState();
const visitedSanctuaries = new Set();

// Verify Ra'iatea arrival objective is immediately active upon setting foot on the starting island
assert(
  getActiveObjectivesForDisplay(gs).some((o) => o.id === 'meet_raiatea_elder'),
  "Immediate starting objective on Ra'iatea calls on player to speak with Elder Metua"
);

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
  { expectedIsland: 'kauai', sailSongId: 'song_14' },      // Unlocks Song 14 trial to O'ahu
  { expectedIsland: 'oahu', sailSongId: 'song_14r' },      // Harvests Miro wood -> unlocks Return 14R
  { expectedIsland: 'kauai', sailSongId: 'song_15' },      // Carves Pahu drum -> unlocks Song 15 & 16!
  { expectedIsland: 'kiritimati', sailSongId: 'song_16' }, // Grand Voyage prep -> sails to Hawai'i!
];

for (let i = 0; i < CAMPAIGN_STEPS.length; i += 1) {
  const step = CAMPAIGN_STEPS[i];
  assert(
    gs.currentIslandId === step.expectedIsland,
    `Step ${i + 1}: expected to be on ${step.expectedIsland}, got ${gs.currentIslandId}`
  );

  const isFirstSanctuaryVisit = !visitedSanctuaries.has(step.expectedIsland);
  const expectedArrivalObjId = ISLAND_ARRIVAL_OBJECTIVE_MAP[step.expectedIsland];
  if (isFirstSanctuaryVisit && expectedArrivalObjId) {
    assert(
      Boolean(gs.activeObjectives[expectedArrivalObjId]),
      `Step ${i + 1}: arrival objective ${expectedArrivalObjId} must be active upon arriving at ${step.expectedIsland}`
    );
  }

  // Visit Sanctuary / Mentor / Outpost
  const sanct = interactWithIslandSanctuary(gs);
  visitedSanctuaries.add(step.expectedIsland);
  if (isFirstSanctuaryVisit && expectedArrivalObjId) {
    assert(
      sanct.clearedObjectives.some((o) => o.id === expectedArrivalObjId) &&
        Boolean(gs.clearedObjectives[expectedArrivalObjId]) &&
        !gs.activeObjectives[expectedArrivalObjId],
      `Step ${i + 1}: interacting with ${step.expectedIsland} sanctuary clears ${expectedArrivalObjId}`
    );
  }
  if (step.expectedIsland === 'raiatea' && i === 0) {
    assert(
      Boolean(gs.activeObjectives.quest_kura_feathers_raiatea),
      "Elder Metua assigns quest_kura_feathers_raiatea objective on Ra'iatea"
    );
  }
  if (step.expectedIsland === 'raiatea' && i === 5) {
    assert(
      sanct.clearedObjectives.some((o) => o.id === 'quest_kura_feathers_raiatea'),
      "Presenting Red Kura Feathers on Ra'iatea clears quest_kura_feathers_raiatea"
    );
  }
  auditText(sanct.title, `${step.expectedIsland} sanctuary title`);
  auditText(sanct.speech, `${step.expectedIsland} sanctuary speech`);
  for (const rw of sanct.rewardsList) {
    auditText(rw, `${step.expectedIsland} reward`);
  }

  // Complete the local elder's Guided Constellation Sky Vigil if available on this island
  const pendingConstLesson = getAvailableUnlearnedLessonForIsland(
    gs,
    step.expectedIsland
  );
  if (i === 0) {
    assert(
      pendingConstLesson === null && gs.getLearnedConstellationCount() === 0,
      'Step 1 on Raʻiātea: starts with 0 constellations and no pre-Song-1 vigil prompt'
    );
  }
  if (pendingConstLesson) {
    gs.learnConstellation(pendingConstLesson.unlockKey);
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

  // Verify every guidance star actively steered on this leg has ALREADY been taught by an elder!
  for (const v of chosen.song.verses) {
    const g = v.guidance || {};
    const primaryStarId = Array.isArray(g.stars) ? g.stars[0] : null;
    if (primaryStarId) {
      assert(
        gs.isStarLearned(primaryStarId, NAVIGATION_STARS),
        `Leg ${step.sailSongId} steers by ${primaryStarId}, which must already be taught before departure`
      );
    }
    if (g.sternStarId) {
      assert(
        gs.isStarLearned(g.sternStarId, NAVIGATION_STARS),
        `Leg ${step.sailSongId} backsights ${g.sternStarId}, which must already be taught before departure`
      );
    }
    if (v.zenithTriggerStarId) {
      assert(
        gs.isStarLearned(v.zenithTriggerStarId, NAVIGATION_STARS),
        `Leg ${step.sailSongId} uses zenith star ${v.zenithTriggerStarId}, which must already be taught`
      );
    }
  }

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

// Final arrival interaction on Hawai'i
assert(gs.currentIslandId === 'hawaii', "Reached Hawai'i at end of Song 16");
assert(
  Boolean(gs.activeObjectives.meet_hawaii_council) &&
    Boolean(gs.activeObjectives.quest_tridacna_to_hawaii),
  "Arriving on Hawai'i displays Ancestral Council arrival objective and Tridacna Shell delivery quest"
);
const finaleSanct = interactWithIslandSanctuary(gs);
auditText(finaleSanct.title, "Hawai'i finale title");
auditText(finaleSanct.speech, "Hawai'i finale speech");
assert(
  getActiveObjectivesForDisplay(gs).length === 0 &&
    OBJECTIVES_ORDER.every((oid) => Boolean(gs.clearedObjectives[oid])),
  `All ${OBJECTIVES_ORDER.length} campaign objectives across Acts I-III are cleared upon completing Hawai'i finale`
);

assert(
  Object.keys(gs.discoveredIslands).length === 16,
  `Expected all 16 islands discovered, got ${Object.keys(gs.discoveredIslands).length}`
);
assert(gs.masterReplayUnlocked === true, "Master Navigator replay unlocked upon Hawai'i finale");
assert(gs.vakaTier === 3 && gs.maxCargoSlots === 8, 'Upgraded to Tier 3 Vaka Moana (8 slots)');
assert(
  gs.hasFisher() && gs.hasSailTender() && gs.hasHullWright(),
  'Recruited all 3 specialist crewmates (Tama, Moana, Kahu)'
);

// Verify Canoe Modal Archipelago Filter Pills (`Option 1A`)
for (const filter of CANOE_ROUTE_FILTERS) {
  auditText(filter.label, `Canoe route filter pill ${filter.id}`);
}
const localHawaiiRoutes = getRoutesForCanoeFilter(gs, 'local');
assert(
  localHawaiiRoutes.length === getAvailableRoutesFromCurrentIsland(gs).length &&
    localHawaiiRoutes.every((r) => !r.isAnthology),
  "Canoe 'local' filter returns physical local-waters routes from Hawai'i"
);
const act1Routes = getRoutesForCanoeFilter(gs, 'act1');
const act2Routes = getRoutesForCanoeFilter(gs, 'act2');
const act3Routes = getRoutesForCanoeFilter(gs, 'act3');
assert(act1Routes.length === 6, `Expected 6 Act I chants, got ${act1Routes.length}`);
assert(
  act2Routes.length === 6,
  `Expected 6 Act II chants before Rapa Nui discovery, got ${act2Routes.length}`
);
assert(
  act3Routes.length === 5 && act3Routes.some((r) => r.song.id === 'song_14r'),
  `Expected 5 Act III chants (including Song 14R), got ${act3Routes.length}`
);
assert(
  act1Routes.length + act2Routes.length + act3Routes.length === 17,
  'Archipelago filter pills cover all 17 canonical chants across Acts I-III'
);
gs.markIslandDiscovered('rapa_nui', 'act2_nuku_hiva');
const act2WithSecret = getRoutesForCanoeFilter(gs, 'act2');
assert(
  act2WithSecret.length === 8 &&
    act2WithSecret.some((r) => r.song.id === 'secret_mangareva_to_rapa_nui'),
  'Discovering Rapa Nui surfaces the secret pilgrimage chants under Act II'
);

logLine(`\nFULL 17-LEG CAMPAIGN WALKTHROUGH PASSED! (${assertions} assertions verified)`);
