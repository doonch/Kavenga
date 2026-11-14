/**
 * Persistent campaign progression, canoe readiness, cargo slots, crew, and pre-voyage snapshot.
 */

import { Difficulty } from './gameConstants.js';

const STORAGE_KEY = 'kavenga_campaign_save_v1';

export class GameState {
  constructor() {
    this.difficulty = Difficulty.MEDIUM;
    this.masterReplayUnlocked = false;

    this.currentBasinId = 'act1_raiatea';
    this.currentIslandId = 'raiatea';
    this.discoveredIslands = { raiatea: true };
    this.learnedSongs = { song_01: true };
    this.learnedSandLessons = { sand_raiatea_clouds: true };
    this.completedQuests = {};

    // Starting Coastal Vaka on Ra'iatea (GDD 9.2): 4 slots, Hull 75%, Sail 75%, Lashings 65%
    this.vakaTier = 1;
    this.maxCargoSlots = 4;
    this.hullCondition = 75.0;
    this.sailCondition = 75.0;
    this.lashingsCondition = 65.0;

    this.loadedRations = 3.0;
    this.cargoItems = [];

    this.recruitedCrew = [];
    this.assignedCrew = [];

    this._preVoyageSnapshot = null;
  }

  getTotalCrewCount() {
    return 1 + this.assignedCrew.length;
  }

  hasSailTender() {
    return this.assignedCrew.includes('moana');
  }

  hasHullWright() {
    return this.assignedCrew.includes('kahu');
  }

  hasFisher() {
    return this.assignedCrew.includes('tama');
  }

  getMinimumCondition() {
    return Math.min(this.hullCondition, this.sailCondition, this.lashingsCondition);
  }

  isCanoeFullyRestored() {
    return (
      this.hullCondition >= 99.9 &&
      this.sailCondition >= 99.9 &&
      this.lashingsCondition >= 99.9
    );
  }

  getUsedCargoSlots() {
    return Math.ceil(this.loadedRations) + this.cargoItems.length;
  }

  getFreeCargoSlots() {
    return Math.max(0, this.maxCargoSlots - this.getUsedCargoSlots());
  }

  addCargoItem(itemId) {
    if (this.cargoItems.includes(itemId)) {
      return true;
    }
    if (this.getUsedCargoSlots() >= this.maxCargoSlots) {
      return false;
    }
    this.cargoItems.push(itemId);
    return true;
  }

  removeCargoItem(itemId) {
    const idx = this.cargoItems.indexOf(itemId);
    if (idx < 0) return false;
    this.cargoItems.splice(idx, 1);
    return true;
  }

  hasCargoItem(itemId) {
    return this.cargoItems.includes(itemId);
  }

  setLoadedRations(amount) {
    const intAmount = Math.floor(amount);
    if (intAmount < 1) return false;
    if (intAmount + this.cargoItems.length > this.maxCargoSlots) return false;
    this.loadedRations = intAmount;
    return true;
  }

  recruitCrew(crewId) {
    if (!this.recruitedCrew.includes(crewId)) {
      this.recruitedCrew.push(crewId);
    }
    if (!this.assignedCrew.includes(crewId) && this.assignedCrew.length < 3) {
      this.assignedCrew.push(crewId);
    }
  }

  upgradeVakaTier(newTier) {
    if (newTier <= this.vakaTier) return;
    this.vakaTier = newTier;
    if (newTier === 2) this.maxCargoSlots = 6;
    if (newTier >= 3) this.maxCargoSlots = 8;
  }

  markIslandDiscovered(islandId, basinId) {
    this.currentIslandId = islandId;
    this.currentBasinId = basinId;
    this.discoveredIslands[islandId] = true;
  }

  learnSong(songId) {
    this.learnedSongs[songId] = true;
  }

  learnSandLesson(lessonId) {
    this.learnedSandLessons[lessonId] = true;
  }

  savePreVoyageSnapshot() {
    this._preVoyageSnapshot = this.toJSON();
  }

  restorePreVoyageSnapshot() {
    if (!this._preVoyageSnapshot) return false;
    this.fromJSON(this._preVoyageSnapshot);
    return true;
  }

  toJSON() {
    return {
      difficulty: this.difficulty,
      masterReplayUnlocked: this.masterReplayUnlocked,
      currentBasinId: this.currentBasinId,
      currentIslandId: this.currentIslandId,
      discoveredIslands: { ...this.discoveredIslands },
      learnedSongs: { ...this.learnedSongs },
      learnedSandLessons: { ...this.learnedSandLessons },
      completedQuests: { ...this.completedQuests },
      vakaTier: this.vakaTier,
      maxCargoSlots: this.maxCargoSlots,
      hullCondition: this.hullCondition,
      sailCondition: this.sailCondition,
      lashingsCondition: this.lashingsCondition,
      loadedRations: this.loadedRations,
      cargoItems: [...this.cargoItems],
      recruitedCrew: [...this.recruitedCrew],
      assignedCrew: [...this.assignedCrew],
    };
  }

  fromJSON(data) {
    if (!data) return;
    const legacyIslandMap = {
      rapa_iti: 'kauai',
      tubuai: 'oahu',
      tongareva: 'kiritimati',
      rapa_nui: 'hawaii',
    };
    const mapIsl = (id) => legacyIslandMap[id] || id;
    const migratedDiscovered = {};
    for (const [k, v] of Object.entries(data.discoveredIslands ?? { raiatea: true })) {
      migratedDiscovered[mapIsl(k)] = v;
    }

    this.difficulty = data.difficulty ?? Difficulty.MEDIUM;
    this.masterReplayUnlocked = Boolean(data.masterReplayUnlocked);
    this.currentBasinId = data.currentBasinId ?? 'act1_raiatea';
    this.currentIslandId = mapIsl(data.currentIslandId ?? 'raiatea');
    this.discoveredIslands = migratedDiscovered;
    this.learnedSongs = { ...(data.learnedSongs ?? { song_01: true }) };
    this.learnedSandLessons = { ...(data.learnedSandLessons ?? {}) };
    this.completedQuests = { ...(data.completedQuests ?? {}) };
    this.vakaTier = data.vakaTier ?? 1;
    this.maxCargoSlots = data.maxCargoSlots ?? 4;
    this.hullCondition = data.hullCondition ?? 75.0;
    this.sailCondition = data.sailCondition ?? 75.0;
    this.lashingsCondition = data.lashingsCondition ?? 65.0;
    this.loadedRations = data.loadedRations ?? 3.0;
    this.cargoItems = [...(data.cargoItems ?? [])];
    this.recruitedCrew = [...(data.recruitedCrew ?? [])];
    this.assignedCrew = [...(data.assignedCrew ?? [])];
  }

  saveToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toJSON()));
      } catch (_err) {
        // Ignore storage quota errors in private browsing.
      }
    }
  }

  loadFromLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.fromJSON(JSON.parse(raw));
          return true;
        }
      } catch (_err) {
        return false;
      }
    }
    return false;
  }
}
