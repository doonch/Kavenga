/**
 * Pure Headless Campaign Objectives Manager for Kavenga: Songs of the Star Path.
 *
 * Tracks active and cleared plot/quest objectives across Acts I, II, and III:
 *  - Immediate arrival objective on Ra'iatea at campaign start and upon landfall at any island
 *  - Sacred trade-gift retrieval & delivery objectives assigned by elders and master artisans
 *  - Live readiness hints (e.g., when required cargo is lashed on deck)
 *
 * Free of DOM / window / Three.js imports so headless JavaScriptCore tests run directly.
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { ISLANDS } from '../data/islandsData.js';
import {
  ISLAND_ARRIVAL_OBJECTIVE_MAP,
  OBJECTIVES,
  OBJECTIVES_ORDER,
} from '../data/objectivesData.js';

function ensureMaps(gameState) {
  if (!gameState.activeObjectives || typeof gameState.activeObjectives !== 'object') {
    gameState.activeObjectives = {};
  }
  if (!gameState.clearedObjectives || typeof gameState.clearedObjectives !== 'object') {
    gameState.clearedObjectives = {};
  }
}

function tryActivate(gameState, objId, activatedOut) {
  const def = OBJECTIVES[objId];
  if (!def) return false;
  if (gameState.clearedObjectives[objId]) return false;
  if (gameState.activeObjectives[objId]) return false;
  gameState.activeObjectives[objId] = true;
  if (activatedOut) activatedOut.push(def);
  return true;
}

function tryClear(gameState, objId, clearedOut, emitIfNeverActive = false) {
  const def = OBJECTIVES[objId];
  if (!def) return false;
  const wasActive = Boolean(gameState.activeObjectives[objId]);
  const alreadyCleared = Boolean(gameState.clearedObjectives[objId]);
  delete gameState.activeObjectives[objId];
  gameState.clearedObjectives[objId] = true;
  if (!alreadyCleared && (wasActive || emitIfNeverActive)) {
    if (clearedOut) clearedOut.push(def);
    return true;
  }
  return false;
}

/**
 * Activates the local arrival/meeting objective when setting foot on an island.
 * Returns array of newly activated objective definitions.
 */
export function activateIslandArrivalObjective(gameState, islandId) {
  if (!gameState || !islandId) return [];
  ensureMaps(gameState);
  const activated = [];
  const arrivalObjId = ISLAND_ARRIVAL_OBJECTIVE_MAP[islandId];
  if (arrivalObjId) {
    tryActivate(gameState, arrivalObjId, activated);
  }
  return activated;
}

/**
 * Updates active and cleared objectives after interacting with an island's Elder / Marae / Outpost.
 * Call right after `interactWithIslandSanctuary` updates `completedQuests` and `cargoItems`.
 * Returns `{ cleared: Array<ObjectiveDef>, activated: Array<ObjectiveDef> }`.
 */
export function recordSanctuaryObjectiveProgress(
  gameState,
  islandId,
  { hadTridacnaBefore = false } = {}
) {
  if (!gameState || !islandId) return { cleared: [], activated: [] };
  ensureMaps(gameState);

  const cleared = [];
  const activated = [];
  const q = gameState.completedQuests || {};

  // 1. Speaking with the local elder/master (or harvesting Manuae's rookery) clears the arrival objective
  const arrivalObjId = ISLAND_ARRIVAL_OBJECTIVE_MAP[islandId];
  if (arrivalObjId) {
    tryClear(gameState, arrivalObjId, cleared, true);
  }

  // 2. Evaluate island-specific quest handoffs & completions across Acts I, II, and III
  if (islandId === 'raiatea') {
    if (q.raiatea_consecration) {
      tryClear(gameState, 'quest_kura_feathers_raiatea', cleared, false);
    } else {
      tryActivate(gameState, 'quest_kura_feathers_raiatea', activated);
    }
  } else if (islandId === 'tahaa') {
    if (q.tahaa_visit && !q.huahine_trade) {
      tryActivate(gameState, 'quest_kava_to_huahine', activated);
    }
  } else if (islandId === 'huahine') {
    if (q.huahine_trade) {
      tryClear(gameState, 'quest_kava_to_huahine', cleared, false);
      if (!q.moorea_trade) {
        tryActivate(gameState, 'quest_lures_to_moorea', activated);
      }
    } else {
      tryActivate(gameState, 'quest_kava_to_huahine', activated);
    }
  } else if (islandId === 'manuae') {
    if (q.manuae_harvest) {
      if (!q.moorea_trade && gameState.hasCargoItem('pearl_shell_lures')) {
        tryActivate(gameState, 'quest_lures_to_moorea', activated);
      }
      if (!q.raiatea_consecration && gameState.hasCargoItem('red_kura_feathers')) {
        tryActivate(gameState, 'quest_kura_feathers_raiatea', activated);
      }
    }
  } else if (islandId === 'moorea') {
    if (q.moorea_trade) {
      tryClear(gameState, 'quest_lures_to_moorea', cleared, false);
      if (!q.maupiti_master) {
        tryActivate(gameState, 'quest_adze_to_maupiti', activated);
      }
    } else {
      tryActivate(gameState, 'quest_lures_to_moorea', activated);
    }
  } else if (islandId === 'maupiti') {
    if (q.maupiti_master) {
      tryClear(gameState, 'quest_adze_to_maupiti', cleared, false);
    } else {
      tryActivate(gameState, 'quest_adze_to_maupiti', activated);
    }
  } else if (islandId === 'ua_pou') {
    if (q.ua_pou_visit && !q.rangiroa_trade) {
      tryActivate(gameState, 'quest_harpoons_to_rangiroa', activated);
    }
  } else if (islandId === 'rangiroa') {
    if (q.rangiroa_trade) {
      tryClear(gameState, 'quest_harpoons_to_rangiroa', cleared, false);
      if (!q.hiva_oa_trade) {
        tryActivate(gameState, 'quest_star_discs_to_hiva_oa', activated);
      }
    } else {
      tryActivate(gameState, 'quest_harpoons_to_rangiroa', activated);
    }
  } else if (islandId === 'hiva_oa') {
    if (q.hiva_oa_trade) {
      tryClear(gameState, 'quest_star_discs_to_hiva_oa', cleared, false);
      if (!q.fatu_hiva_upgrade) {
        tryActivate(gameState, 'quest_obsidian_to_fatu_hiva', activated);
      }
    } else {
      tryActivate(gameState, 'quest_star_discs_to_hiva_oa', activated);
    }
  } else if (islandId === 'fatu_hiva') {
    if (q.fatu_hiva_upgrade) {
      tryClear(gameState, 'quest_obsidian_to_fatu_hiva', cleared, false);
    } else {
      tryActivate(gameState, 'quest_obsidian_to_fatu_hiva', activated);
    }
  } else if (islandId === 'kauai') {
    if (q.kauai_drum) {
      tryClear(gameState, 'quest_miro_timber_kauai', cleared, false);
    } else {
      tryActivate(gameState, 'quest_miro_timber_kauai', activated);
    }
  } else if (islandId === 'oahu') {
    if (q.oahu_timber && !q.kauai_drum) {
      tryActivate(gameState, 'quest_miro_timber_kauai', activated);
    }
  } else if (islandId === 'kiritimati') {
    if (q.kiritimati_prep && gameState.hasCargoItem('sacred_tridacna_shell')) {
      tryActivate(gameState, 'quest_tridacna_to_hawaii', activated);
    }
  } else if (islandId === 'hawaii') {
    if (hadTridacnaBefore || gameState.activeObjectives.quest_tridacna_to_hawaii) {
      tryClear(gameState, 'quest_tridacna_to_hawaii', cleared, false);
    }
  }

  return { cleared, activated };
}

/**
 * Backfills `activeObjectives` and `clearedObjectives` for legacy saved games created before
 * the Objectives feature existed.
 */
export function backfillLegacyObjectives(gameState) {
  if (!gameState) return;
  const active = {};
  const cleared = {};
  const q = gameState.completedQuests || {};
  const disc = gameState.discoveredIslands || {};

  const questDoneByArrival = {
    tahaa: Boolean(q.tahaa_visit),
    huahine: Boolean(q.huahine_trade),
    manuae: Boolean(q.manuae_harvest),
    moorea: Boolean(q.moorea_trade),
    maupiti: Boolean(q.maupiti_master),
    nuku_hiva: Boolean(q.nuku_hiva_visit),
    ua_pou: Boolean(q.ua_pou_visit),
    rangiroa: Boolean(q.rangiroa_trade),
    hiva_oa: Boolean(q.hiva_oa_trade),
    fatu_hiva: Boolean(q.fatu_hiva_upgrade),
    mangareva: Boolean(q.mangareva_gateway),
    kauai: Boolean(q.kauai_drum),
    oahu: Boolean(q.oahu_timber),
    kiritimati: Boolean(q.kiritimati_prep),
    hawaii: Boolean(q.hawaii_finale),
  };

  const progressedBeyondRaiatea =
    Object.keys(disc).some((id) => id !== 'raiatea' && disc[id]) ||
    Boolean(q.raiatea_consecration);
  if (progressedBeyondRaiatea) {
    cleared.meet_raiatea_elder = true;
  } else {
    active.meet_raiatea_elder = true;
  }

  for (const [islId, objId] of Object.entries(ISLAND_ARRIVAL_OBJECTIVE_MAP)) {
    if (islId === 'raiatea') continue;
    if (questDoneByArrival[islId]) {
      cleared[objId] = true;
    } else if (disc[islId] || gameState.currentIslandId === islId) {
      active[objId] = true;
    }
  }

  if (q.raiatea_consecration) cleared.quest_kura_feathers_raiatea = true;
  else if (progressedBeyondRaiatea) active.quest_kura_feathers_raiatea = true;

  if (q.huahine_trade) cleared.quest_kava_to_huahine = true;
  else if (q.tahaa_visit || gameState.hasCargoItem?.('kava_bundle')) active.quest_kava_to_huahine = true;

  if (q.moorea_trade) cleared.quest_lures_to_moorea = true;
  else if (q.huahine_trade || gameState.hasCargoItem?.('pearl_shell_lures')) active.quest_lures_to_moorea = true;

  if (q.maupiti_master) cleared.quest_adze_to_maupiti = true;
  else if (q.moorea_trade || gameState.hasCargoItem?.('polished_basalt_adze')) active.quest_adze_to_maupiti = true;

  if (q.rangiroa_trade) cleared.quest_harpoons_to_rangiroa = true;
  else if (q.ua_pou_visit || gameState.hasCargoItem?.('bone_harpoon_heads')) active.quest_harpoons_to_rangiroa = true;

  if (q.hiva_oa_trade) cleared.quest_star_discs_to_hiva_oa = true;
  else if (q.rangiroa_trade || gameState.hasCargoItem?.('pearl_star_discs')) active.quest_star_discs_to_hiva_oa = true;

  if (q.fatu_hiva_upgrade) cleared.quest_obsidian_to_fatu_hiva = true;
  else if (q.hiva_oa_trade || gameState.hasCargoItem?.('obsidian_adze_blanks')) active.quest_obsidian_to_fatu_hiva = true;

  if (q.kauai_drum) cleared.quest_miro_timber_kauai = true;
  else if (disc.kauai || gameState.hasCargoItem?.('miro_drum_wood')) active.quest_miro_timber_kauai = true;

  if (q.hawaii_finale && !gameState.hasCargoItem?.('sacred_tridacna_shell')) {
    cleared.quest_tridacna_to_hawaii = true;
  } else if (q.kiritimati_prep || gameState.hasCargoItem?.('sacred_tridacna_shell')) {
    active.quest_tridacna_to_hawaii = true;
  }

  gameState.activeObjectives = active;
  gameState.clearedObjectives = cleared;
}

/**
 * Returns ordered active objectives enriched with live island & cargo readiness indicators
 * for ashore UI display (`WalkableIslandUI` and `IslandHubUI`).
 */
export function getActiveObjectivesForDisplay(gameState) {
  if (!gameState) return [];
  ensureMaps(gameState);

  const curIslandId = gameState.currentIslandId;
  const items = [];

  for (const objId of OBJECTIVES_ORDER) {
    if (!gameState.activeObjectives[objId] || gameState.clearedObjectives[objId]) {
      continue;
    }
    const def = OBJECTIVES[objId];
    if (!def) continue;

    const targetIsl = ISLANDS[def.islandId];
    const isHere = def.islandId === curIslandId;
    const hasRequiredCargo = Boolean(
      def.requiredItemId && gameState.hasCargoItem?.(def.requiredItemId)
    );

    let statusText = def.detail;
    let statusBadge = isHere
      ? 'On This Shore'
      : targetIsl
        ? targetIsl.name
        : '';

    if (def.requiredItemId && hasRequiredCargo) {
      statusText = def.readyNote || def.detail;
      statusBadge = isHere ? 'Ready Here' : `Cargo Ready → ${targetIsl?.name || ''}`;
    }

    items.push({
      id: def.id,
      kind: def.kind,
      glyph: def.glyph,
      title: def.title,
      detail: statusText,
      islandId: def.islandId,
      islandName: targetIsl?.name || '',
      isHere,
      hasRequiredCargo,
      statusBadge,
    });
  }

  // Sort: 1) Objectives actionable on the player's current island first (arrival before quest),
  //       2) Quests whose required cargo is already aboard, 3) Canonical campaign order.
  items.sort((a, b) => {
    if (a.isHere !== b.isHere) return a.isHere ? -1 : 1;
    if (a.isHere && b.isHere && a.kind !== b.kind) {
      return a.kind === 'arrival' ? -1 : 1;
    }
    if (a.hasRequiredCargo !== b.hasRequiredCargo) {
      return a.hasRequiredCargo ? -1 : 1;
    }
    return 0;
  });

  return items;
}
