/**
 * Persistent Surprise Achievements Manager for Kavenga: Songs of the Star Path.
 *
 * - Stores unlocked achievements and Master-difficulty song completions in its own
 *   `localStorage` key (`kavenga_achievements_v1`) so achievements survive "Start Over" resets.
 * - Captures real-world unlock timestamp (`unlockedAtIso`), active `difficulty`, and
 *   optional `islandId` / `basinId` context for every earned feat.
 * - Free of DOM / window / Three.js imports so headless JavaScriptCore suites can test every trigger.
 * - Strictly zero cardinal directions or degree numbers in all player-facing strings.
 */

import { Difficulty } from './gameConstants.js';
import { ACHIEVEMENTS, ACHIEVEMENTS_ORDER } from '../data/achievementsData.js';
import { ISLANDS, OCEAN_BASINS } from '../data/islandsData.js';
import { SONGS } from '../data/songsData.js';

export const ACHIEVEMENTS_STORAGE_KEY = 'kavenga_achievements_v1';

const CANONICAL_SONG_IDS = Object.freeze(Object.keys(SONGS)); // All 17 authored chants (1-16 + 14R)
const ALL_ISLAND_IDS = Object.freeze(Object.keys(ISLANDS));   // All 16 campaign islands + secret rapa_nui

export function formatAchievementDifficultyLabel(difficulty) {
  switch (difficulty) {
    case Difficulty.EASY:
      return 'Apprentice (Easy)';
    case Difficulty.MEDIUM:
      return 'Wayfinder (Medium)';
    case Difficulty.HARD:
      return 'Navigator (Hard)';
    case Difficulty.MASTER_NAVIGATOR:
      return 'Master Navigator';
    default:
      return 'Wayfinder (Medium)';
  }
}

export function formatAchievementLocationLabel(record) {
  if (!record) return '';
  const isl = record.islandId ? ISLANDS[record.islandId] : null;
  const basin =
    (record.basinId && OCEAN_BASINS[record.basinId]) ||
    (isl?.basinId && OCEAN_BASINS[isl.basinId]) ||
    null;

  if (isl && basin) {
    return `${isl.name} · ${basin.name}`;
  }
  if (isl) {
    return isl.name;
  }
  if (basin) {
    return `Open Ocean · ${basin.name}`;
  }
  return 'Open Ocean';
}

export function formatAchievementDateLabel(isoString) {
  if (!isoString) return '';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return String(isoString);
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dt);
    }
  } catch (_err) {
    // Fallback below
  }
  return dt.toISOString().slice(0, 10);
}

export class AchievementsManager {
  constructor({ storage = undefined, nowFn = () => new Date().toISOString() } = {}) {
    this._storage =
      storage !== undefined
        ? storage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    this._nowFn = nowFn;

    this.unlocked = {};
    this.masterCompletedSongs = {};
    this._listeners = [];

    this.loadFromStorage();
  }

  clearSavedAchievements() {
    this.unlocked = {};
    this.masterCompletedSongs = {};
    if (!this._storage) return;
    try {
      this._storage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
    } catch (_err) {
      // Ignore storage access errors in restricted browsing modes.
    }
  }

  onUnlock(listener) {
    if (typeof listener === 'function') {
      this._listeners.push(listener);
    }
  }

  loadFromStorage() {
    if (!this._storage) return false;
    try {
      const raw = this._storage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.unlocked = { ...(parsed.unlocked || {}) };
        this.masterCompletedSongs = { ...(parsed.masterCompletedSongs || {}) };
        return true;
      }
    } catch (_err) {
      return false;
    }
    return false;
  }

  saveToStorage() {
    if (!this._storage) return;
    try {
      this._storage.setItem(
        ACHIEVEMENTS_STORAGE_KEY,
        JSON.stringify({
          unlocked: this.unlocked,
          masterCompletedSongs: this.masterCompletedSongs,
        })
      );
    } catch (_err) {
      // Ignore storage quota errors in restricted browsing modes.
    }
  }

  isUnlocked(achievementId) {
    return Boolean(this.unlocked[achievementId]);
  }

  /**
   * Unlocks `achievementId` if not already earned, persists to storage, notifies listeners,
   * and returns the enriched unlock entry (or `null` if already unlocked / invalid).
   */
  unlock(achievementId, { difficulty = Difficulty.EASY, islandId = null, basinId = null } = {}) {
    const def = ACHIEVEMENTS[achievementId];
    if (!def || this.unlocked[achievementId]) {
      return null;
    }

    const resolvedBasinId =
      basinId || (islandId && ISLANDS[islandId]?.basinId) || null;
    const record = {
      id: achievementId,
      unlockedAtIso: this._nowFn(),
      difficulty: difficulty || Difficulty.EASY,
      islandId: islandId || null,
      basinId: resolvedBasinId,
    };

    this.unlocked[achievementId] = record;
    this.saveToStorage();

    const enriched = this._enrichRecord(record);
    for (const fn of this._listeners) {
      fn(enriched);
    }
    return enriched;
  }

  _enrichRecord(record) {
    const def = ACHIEVEMENTS[record.id];
    if (!def) return null;
    return {
      ...def,
      ...record,
      dateLabel: formatAchievementDateLabel(record.unlockedAtIso),
      difficultyLabel: formatAchievementDifficultyLabel(record.difficulty),
      locationLabel: formatAchievementLocationLabel(record),
    };
  }

  /**
   * Evaluates mid-ocean events (`fish_school_foraged`, `survived_24h_at_sea`).
   */
  evaluateSeaEvent(event, oceanSim, gameState) {
    if (!event || !oceanSim) return [];
    const newlyUnlocked = [];
    const meta = {
      difficulty: gameState?.difficulty || Difficulty.EASY,
      islandId: null,
      basinId: oceanSim.basin?.id || gameState?.currentBasinId || null,
    };

    if (
      event.type === 'fish_school_foraged' &&
      (event.voyageHarvestCount >= 2 || oceanSim.fishSchoolsHarvestedCount >= 2)
    ) {
      const u = this.unlock('two_fish_schools_single_voyage', meta);
      if (u) newlyUnlocked.push(u);
    }

    if (
      event.type === 'survived_24h_at_sea' ||
      oceanSim.elapsedGameHours >= 24.0
    ) {
      const u = this.unlock('survive_24h_at_sea', meta);
      if (u) newlyUnlocked.push(u);
    }

    return newlyUnlocked;
  }

  /**
   * Evaluates landfall achievements upon arriving at an island (`arrivedIslandId`).
   * Call after `gameState.markIslandDiscovered` / `onVoyageLandfall`.
   */
  evaluateLandfall(oceanSim, gameState, arrivedIslandId) {
    if (!gameState || !arrivedIslandId) return [];
    const newlyUnlocked = [];
    const isl = ISLANDS[arrivedIslandId];
    const song = oceanSim?.song || null;
    const isIntendedTarget = Boolean(song && arrivedIslandId === song.toIsland);

    // Use the minimum (easiest) difficulty active during the voyage if the player lowered
    // difficulty mid-crossing; otherwise `gameState.difficulty`.
    const effectiveDifficulty =
      oceanSim?. sailedPureMasterNavigator === false &&
      gameState.difficulty === Difficulty.MASTER_NAVIGATOR
        ? Difficulty.HARD
        : gameState.difficulty || Difficulty.EASY;

    const meta = {
      difficulty: effectiveDifficulty,
      islandId: arrivedIslandId,
      basinId: isl?.basinId || oceanSim?.basin?.id || gameState.currentBasinId || null,
    };

    // 1. Reach Hawai'i
    if (arrivedIslandId === 'hawaii') {
      const u = this.unlock('reach_hawaii', meta);
      if (u) newlyUnlocked.push(u);
    }

    // 2. Reach Secret Rapa Nui
    if (arrivedIslandId === 'rapa_nui') {
      const u = this.unlock('reach_rapa_nui', meta);
      if (u) newlyUnlocked.push(u);
    }

    // 3. Landfall on Fumes (< 0.5 ration baskets remaining at the moment of landfall)
    if (
      oceanSim &&
      oceanSim.rationsRemaining > 0.0 &&
      oceanSim.rationsRemaining < 0.5
    ) {
      const u = this.unlock('landfall_on_fumes', meta);
      if (u) newlyUnlocked.push(u);
    }

    // 4. Off-Window Landfall (launched outside recommended departure window and reached song destination)
    if (oceanSim && isIntendedTarget && oceanSim.departedRecommendedWindow === false) {
      const u = this.unlock('off_window_landfall', meta);
      if (u) newlyUnlocked.push(u);
    }

    // 5. Sea-Fog Crossing Completed Without Opening Sand Recall
    const hasFogVerse = Boolean(
      song?.verses?.some((v) => v.weather === 'sea_fog')
    );
    if (
      oceanSim &&
      isIntendedTarget &&
      hasFogVerse &&
      !oceanSim.usedRecallThisVoyage
    ) {
      const u = this.unlock('fog_without_recall', meta);
      if (u) newlyUnlocked.push(u);
    }

    // 6. Track Master Navigator Song Completion across all 17 canonical songs
    if (
      song &&
      SONGS[song.id] &&
      isIntendedTarget &&
      effectiveDifficulty === Difficulty.MASTER_NAVIGATOR
    ) {
      if (!this.masterCompletedSongs[song.id]) {
        this.masterCompletedSongs[song.id] = true;
        this.saveToStorage();
      }
      const allMasterDone = CANONICAL_SONG_IDS.every(
        (sid) => Boolean(this.masterCompletedSongs[sid])
      );
      if (allMasterDone) {
        const u = this.unlock('all_songs_master_difficulty', meta);
        if (u) newlyUnlocked.push(u);
      }
    }

    // 7. Memory of Seventeen Shores (all 16 campaign islands + secret Rapa Nui charted)
    const allCharted = ALL_ISLAND_IDS.every(
      (iid) => Boolean(gameState.discoveredIslands?.[iid])
    );
    if (allCharted) {
      const u = this.unlock('chart_all_shores', meta);
      if (u) newlyUnlocked.push(u);
    }

    return newlyUnlocked;
  }

  /**
   * Evaluates ashore milestones (full crew + Tier-3 Vaka Moana at 100%, all 11 sky teachings learned).
   */
  evaluateAshoreState(gameState, islandId = null) {
    if (!gameState) return [];
    const newlyUnlocked = [];
    const resolvedIsl = islandId || gameState.currentIslandId || null;
    const meta = {
      difficulty: gameState.difficulty || Difficulty.EASY,
      islandId: resolvedIsl,
      basinId:
        (resolvedIsl && ISLANDS[resolvedIsl]?.basinId) ||
        gameState.currentBasinId ||
        null,
    };

    // 1. All 10 animal constellations + Steadfast Peg genuinely learned in Guided Sky Vigils
    const learnedKeysCount = Object.values(
      gameState.learnedConstellations || {}
    ).filter(Boolean).length;
    if (learnedKeysCount >= 11) {
      const u = this.unlock('all_constellations_learned', meta);
      if (u) newlyUnlocked.push(u);
    }

    // 2. Twin-Sail Vaka Moana (Tier 3) at 100% readiness with Tama, Moana & Kahu all aboard
    const hasAllThreeSpecialists = ['tama', 'moana', 'kahu'].every((cid) =>
      gameState.assignedCrew?.includes(cid)
    );
    if (
      gameState.vakaTier >= 3 &&
      gameState.isCanoeFullyRestored?.() &&
      hasAllThreeSpecialists
    ) {
      const u = this.unlock('full_crew_and_vaka_moana', meta);
      if (u) newlyUnlocked.push(u);
    }

    return newlyUnlocked;
  }

  /**
   * Evaluates Optional Eye Trial sight-alignment streak in Star-Stone Vigil.
   */
  evaluateEyeTrialStreak(streakCount, gameState, islandId = null) {
    if (streakCount < 5) return [];
    const resolvedIsl = islandId || gameState?.currentIslandId || null;
    const u = this.unlock('eye_trial_streak_5', {
      difficulty: gameState?.difficulty || Difficulty.EASY,
      islandId: resolvedIsl,
      basinId:
        (resolvedIsl && ISLANDS[resolvedIsl]?.basinId) ||
        gameState?.currentBasinId ||
        null,
    });
    return u ? [u] : [];
  }

  /**
   * Returns summary for the ashore Achievements Gallery:
   *  - `unlockedList`: earned achievements sorted newest-first (with date, difficulty & location labels)
   *  - `totalCount`: total defined achievements (`12`)
   *  - `unlockedCount`: number unlocked so far
   *  - `remainingMysteryCount`: count of unearned `???` slots (zero spoilers)
   *  - `masterSongsCompletedCount` / `masterSongsTotalCount`
   */
  getSummary() {
    const unlockedList = [];
    for (const id of ACHIEVEMENTS_ORDER) {
      const rec = this.unlocked[id];
      if (rec) {
        const enriched = this._enrichRecord(rec);
        if (enriched) unlockedList.push(enriched);
      }
    }
    unlockedList.sort((a, b) =>
      String(b.unlockedAtIso || '').localeCompare(String(a.unlockedAtIso || ''))
    );

    const totalCount = ACHIEVEMENTS_ORDER.length;
    const unlockedCount = unlockedList.length;
    const remainingMysteryCount = Math.max(0, totalCount - unlockedCount);
    const masterSongsCompletedCount = CANONICAL_SONG_IDS.filter((sid) =>
      Boolean(this.masterCompletedSongs[sid])
    ).length;

    return {
      unlockedList,
      totalCount,
      unlockedCount,
      remainingMysteryCount,
      masterSongsCompletedCount,
      masterSongsTotalCount: CANONICAL_SONG_IDS.length,
    };
  }
}
