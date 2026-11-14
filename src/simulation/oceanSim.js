/**
 * Continuous 2D Regional Ocean Basin simulator for Kavenga: Songs of the Star Path.
 * Handles canoe kinematics, crosswind leeway, neglected-maintenance creep, rations & fish foraging,
 * Concentric Island Detection Screens (Rings 1-4), condition-driven verse progression,
 * Mercy-Rule Lost-at-Sea detection, and strictly cue-relative post-mist reflections.
 */

import {
  GameConstants,
  degToRad,
  departureWindowToHour,
  posMod,
  radToDeg,
  wrapDeg180,
} from '../core/gameConstants.js';
import { NAVIGATION_STARS } from '../data/constellationsData.js';
import { ISLANDS, OCEAN_BASINS } from '../data/islandsData.js';
import {
  computeLstDeg,
  computeStarAltAz,
  computeSunState,
  evaluateAllNavigationStars,
  pickActiveRelayStar,
} from './celestialSim.js';
import { IslandWaveZone, sampleTwinHullState } from './hullPhysics.js';
import { evaluateDeckShadow } from './shadowCraft.js';

export const VoyageStatus = Object.freeze({
  IDLE: 'idle',
  SAILING: 'sailing',
  ARRIVED: 'arrived',
  LOST_AT_SEA: 'lost_at_sea',
});

/**
 * Crosswind leeway angle (degrees added to heading to obtain actual Course Over Ground).
 * Strong crosswind routes (e.g., Song 6) push up to 4.0 deg; Moana (Sail-Tender) halves drift.
 */
export function computeLeewayDeg(
  headingDeg,
  windFromAz,
  hasSailTender = false,
  strongCrosswind = false
) {
  const downwindAz = posMod(windFromAz + 180.0, 360.0);
  const relRad = degToRad(wrapDeg180(downwindAz - headingDeg));
  let baseMax = strongCrosswind ? GameConstants.MAX_CROSSWIND_LEEWAY_DEG : 2.6;
  if (hasSailTender) {
    baseMax *= 0.5;
  }
  return baseMax * Math.sin(relRad);
}

/**
 * Neglected canoe maintenance (<50% minimum condition) introduces slow asymmetric hull pull.
 * Kahu (Hull-Wright) halves any residual maintenance drift.
 */
export function computeMaintenanceCreepDegPerSec(
  minCondition,
  hasHullWright = false,
  biasDirection = 1.0
) {
  if (minCondition >= GameConstants.NEGLECTED_MAINTENANCE_THRESHOLD) {
    return 0.0;
  }
  const deficit =
    (GameConstants.NEGLECTED_MAINTENANCE_THRESHOLD - minCondition) /
    GameConstants.NEGLECTED_MAINTENANCE_THRESHOLD;
  let degPerMin = GameConstants.LOW_CONDITION_CREEP_DEG_PER_MIN * (0.45 + 0.55 * deficit);
  if (hasHullWright) {
    degPerMin *= 0.5;
  }
  return (degPerMin / 60.0) * (biasDirection >= 0 ? 1.0 : -1.0);
}

export class OceanSim {
  constructor() {
    this.status = VoyageStatus.IDLE;
    this.song = null;
    this.basin = null;
    this.activeIslands = {};

    this.pos = { x: 0.0, y: 0.0 };
    this.startPos = { x: 0.0, y: 0.0 };
    this.totalRouteUnits = 6.0;
    this.latDeg = ISLANDS.raiatea?.latDeg ?? GameConstants.REFERENCE_LATITUDE_DEG;
    this.fromLatDeg = this.latDeg;
    this.toLatDeg = this.latDeg;
    this.headingDeg = 0.0;
    this.courseOverGroundDeg = 0.0;
    this.leewayDeg = 0.0;

    this.solarHour = 6.0;
    this.solarRaDeg = 180.0;
    this.elapsedRealSec = 0.0;
    this.verseIndex = 0;
    this.fastForward = false;

    this.initialRations = 3.0;
    this.rationsRemaining = 3.0;
    this.lowRationWarningActive = false;
    this.crewCount = 1;
    this.hasSailTender = false;
    this.hasHullWright = false;
    this.hasFisher = false;
    this.minCondition = 75.0;
    this.speedConditionFactor = 1.0;

    this.ringRadii = { ring1: 2.1, ring2: 1.5, ring3: 0.9, ring4: 0.45 };
    this.detections = [];
    this.arrivedIsland = null;
    this.lostReason = '';
    this.reflectionText = '';

    // Midday leaping bonito school state
    this.fishSchool = null;

    // Telemetry for cue-relative reflection if the player gets Lost at Sea
    this.offCueAccumSec = 0.0;
    this.worstCueLabel = '';
    this.worstCueDeviationScore = 0.0;
    this.departedRecommendedWindow = true;

    // Cached per-frame readout for renderers, audio, and HUD
    this.sunState = computeSunState(180.0, 6.0, this.latDeg);
    this.starsState = {};
    this.deckShadow = evaluateDeckShadow(0.0, 90.0, 0.0);
    this.hullState = null;
    this.events = [];
  }

  /**
   * Aligns the sky dome and calm environment to a specific island's latitude when ashore or in a Star-Stone Vigil.
   */
  setShoreIsland(islandId) {
    const isl = ISLANDS[islandId];
    if (!isl) return;
    this.basin = OCEAN_BASINS[isl.basinId] || this.basin;
    this.latDeg = isl.latDeg ?? this.basin?.referenceLatDeg ?? GameConstants.REFERENCE_LATITUDE_DEG;
    this.fromLatDeg = this.latDeg;
    this.toLatDeg = this.latDeg;
    this._refreshEnvironment(0.0);
  }

  /**
   * Initializes an open-ocean voyage from a declarative song definition and current GameState.
   */
  startVoyage(song, departureWindow, gameState) {
    this.song = song;
    this.status = VoyageStatus.SAILING;
    this.elapsedRealSec = 0.0;
    this.verseIndex = 0;
    this.fastForward = false;
    this.arrivedIsland = null;
    this.lostReason = '';
    this.reflectionText = '';
    this.events = [];

    this.departedRecommendedWindow =
      departureWindow === song.recommendedDeparture;
    this.solarHour = departureWindowToHour(departureWindow);
    this.solarRaDeg = song.solarRaDeg ?? 180.0;

    this.crewCount = gameState ? gameState.getTotalCrewCount() : 1;
    this.hasSailTender = gameState ? gameState.hasSailTender() : false;
    this.hasHullWright = gameState ? gameState.hasHullWright() : false;
    this.hasFisher = gameState ? gameState.hasFisher() : false;
    this.minCondition = gameState ? gameState.getMinimumCondition() : 80.0;
    this.initialRations = gameState ? Math.max(0.5, gameState.loadedRations) : 3.0;
    this.rationsRemaining = this.initialRations;
    this.lowRationWarningActive = false;

    // Slight drag if canoe condition is neglected (<50%)
    this.speedConditionFactor =
      this.minCondition >= GameConstants.WELL_MAINTAINED_THRESHOLD
        ? 1.0
        : this.minCondition >= GameConstants.NEGLECTED_MAINTENANCE_THRESHOLD
          ? 0.96
          : 0.88;

    // Populate active regional basin islands (or inter-basin crossing pair)
    this.activeIslands = {};
    const fromDef = ISLANDS[song.fromIsland];
    const toDef = ISLANDS[song.toIsland];

    if (song.isInterBasinCrossing && song.crossingVector) {
      this.basin = OCEAN_BASINS[toDef.basinId];
      this.activeIslands[fromDef.id] = {
        ...fromDef,
        simPos: { x: 0.0, y: 0.0 },
      };
      this.activeIslands[toDef.id] = {
        ...toDef,
        simPos: { x: song.crossingVector.x, y: song.crossingVector.y },
      };
      this.pos = { x: 0.0, y: 0.0 };
    } else {
      this.basin = OCEAN_BASINS[fromDef.basinId];
      for (const [id, isl] of Object.entries(ISLANDS)) {
        if (isl.basinId === fromDef.basinId) {
          this.activeIslands[id] = {
            ...isl,
            simPos: { x: isl.pos.x, y: isl.pos.y },
          };
        }
      }
      this.pos = {
        x: this.activeIslands[fromDef.id].simPos.x,
        y: this.activeIslands[fromDef.id].simPos.y,
      };
    }

    const refHop = this.basin.referenceHopUnits;
    this.ringRadii = {
      ring1: refHop * GameConstants.RING_1_BIOLOGICAL_RATIO,
      ring2: refHop * GameConstants.RING_2_CLOUD_RATIO,
      ring3: refHop * GameConstants.RING_3_SWELL_DRIFT_RATIO,
      ring4: Math.max(
        GameConstants.RING_4_MIN_RADIUS_UNITS,
        refHop * GameConstants.RING_4_LANDFALL_RATIO
      ),
    };

    // Initial heading gently faces open water outside the departure bay
    const dx = this.activeIslands[toDef.id].simPos.x - this.pos.x;
    const dy = this.activeIslands[toDef.id].simPos.y - this.pos.y;
    this.startPos = { x: this.pos.x, y: this.pos.y };
    this.totalRouteUnits = Math.max(1.0, Math.hypot(dx, dy));
    this.fromLatDeg = fromDef?.latDeg ?? GameConstants.REFERENCE_LATITUDE_DEG;
    this.toLatDeg = toDef?.latDeg ?? this.fromLatDeg;
    this.latDeg = this.fromLatDeg;

    const trueInitialAz = posMod(radToDeg(Math.atan2(dx, dy)), 360.0);
    this.headingDeg = posMod(trueInitialAz + 12.0, 360.0);

    // Optional midday fish school along route (GDD 5.5.2 & Song 2)
    this.fishSchool = null;
    if (song.spawnsMiddayFishSchool || song.expectedDurationMin >= 7.0) {
      this.fishSchool = {
        x: this.pos.x + dx * 0.52,
        y: this.pos.y + dy * 0.52,
        radius: 0.55,
        harvested: false,
      };
    }

    this.offCueAccumSec = 0.0;
    this.worstCueLabel = song.verses[0]?.cueLabel ?? 'the star path';
    this.worstCueDeviationScore = 0.0;

    this._refreshEnvironment(0.0);
  }

  getCurrentVerse() {
    if (!this.song || !this.song.verses.length) return null;
    return this.song.verses[Math.min(this.verseIndex, this.song.verses.length - 1)];
  }

  getWindFromAz() {
    return this.song?.windFromAz ?? this.basin?.defaultWindFromAz ?? 100.0;
  }

  getPrimarySwellFromAz() {
    return this.song?.primarySwellFromAz ?? this.basin?.defaultSwellFromAz ?? 135.0;
  }

  setHeading(deg) {
    this.headingDeg = posMod(deg, 360.0);
  }

  steer(deltaDeg) {
    this.headingDeg = posMod(this.headingDeg + deltaDeg, 360.0);
  }

  setFastForward(enabled) {
    if (this.status !== VoyageStatus.SAILING) {
      this.fastForward = false;
      return;
    }
    this.fastForward = Boolean(enabled);
  }

  /**
   * Advances simulation by realDtSec (at 1x; automatically scaled by FAST_FORWARD_MULTIPLIER if active).
   */
  step(realDtSec) {
    this.events = [];
    if (this.status !== VoyageStatus.SAILING || !this.song) {
      return this.events;
    }

    const mult = this.fastForward ? GameConstants.FAST_FORWARD_MULTIPLIER : 1.0;
    const simDtSec = Math.max(0.0, realDtSec * mult);
    const dtMin = simDtSec / 60.0;

    // 1. Neglected maintenance creep slowly pulls Trim-Lock paddle if condition < 50%
    const creepDeg =
      computeMaintenanceCreepDegPerSec(this.minCondition, this.hasHullWright, 1.0) *
      simDtSec;
    if (creepDeg !== 0.0) {
      this.headingDeg = posMod(this.headingDeg + creepDeg, 360.0);
    }

    // 2. Crosswind leeway & Course Over Ground
    const windFrom = this.getWindFromAz();
    this.leewayDeg = computeLeewayDeg(
      this.headingDeg,
      windFrom,
      this.hasSailTender,
      Boolean(this.song.strongCrosswind)
    );
    this.courseOverGroundDeg = posMod(this.headingDeg + this.leewayDeg, 360.0);

    // 3. Advance 2D Basin Coordinates (X = East, Y = North)
    const speedUnitsPerMin =
      GameConstants.NOMINAL_SPEED_UNITS_PER_MIN * this.speedConditionFactor;
    const cogRad = degToRad(this.courseOverGroundDeg);
    this.pos.x += Math.sin(cogRad) * speedUnitsPerMin * dtMin;
    this.pos.y += Math.cos(cogRad) * speedUnitsPerMin * dtMin;

    // 4. Advance Solar Time & Voyage Clock
    this.elapsedRealSec += simDtSec;
    const hrsPerMin =
      this.song.gameHoursPerRealMin ??
      60.0 / GameConstants.REAL_SECONDS_PER_GAME_HOUR;
    this.solarHour = posMod(this.solarHour + dtMin * hrsPerMin, 24.0);

    // 5. Ration consumption & Midday bonito school foraging
    const effectiveCrewLoad = 1.0 + 0.55 * Math.max(0, this.crewCount - 1);
    const rationBurn =
      GameConstants.BASE_RATION_BURN_PER_MIN_PER_CREW *
      effectiveCrewLoad *
      dtMin;
    this.rationsRemaining = Math.max(0.0, this.rationsRemaining - rationBurn);

    if (
      !this.lowRationWarningActive &&
      this.rationsRemaining <=
        this.initialRations * GameConstants.LOW_RATION_WARNING_FRACTION
    ) {
      this.lowRationWarningActive = true;
      this.fastForward = false;
      this.events.push({ type: 'low_rations_warning' });
    }

    if (this.fishSchool && !this.fishSchool.harvested) {
      const isDaytime = this.sunState.altDeg > 8.0;
      const fDist = Math.hypot(
        this.fishSchool.x - this.pos.x,
        this.fishSchool.y - this.pos.y
      );
      if (isDaytime && fDist <= this.fishSchool.radius) {
        this.fishSchool.harvested = true;
        const bonus = this.hasFisher ? 1.5 : 0.85;
        this.rationsRemaining = Math.min(
          this.initialRations + 1.0,
          this.rationsRemaining + bonus
        );
        this.fastForward = false;
        this.events.push({ type: 'fish_school_foraged', bonus });
      }
    }

    // 6. Refresh sky, deck shadow, Ring 1-4 detections, and hull state
    const prevMaxRing = this._getHighestNonDepartureRing();
    this._refreshEnvironment(simDtSec);
    const newMaxRing = this._getHighestNonDepartureRing();
    if (newMaxRing >= 2 && newMaxRing > prevMaxRing) {
      this.fastForward = false;
      this.events.push({ type: 'island_ring_entered', ring: newMaxRing });
    }

    // 7. Check Ring 4 Landfall (any discovered or undiscovered island in basin!)
    for (const det of this.detections) {
      const isJustDeparted =
        det.islandId === this.song.fromIsland && this.elapsedRealSec < 45.0;
      if (det.ring >= 4 && !isJustDeparted) {
        this.status = VoyageStatus.ARRIVED;
        this.arrivedIsland = this.activeIslands[det.islandId];
        this.fastForward = false;
        this.events.push({
          type: 'landfall',
          islandId: det.islandId,
          isIntendedTarget: det.islandId === this.song.toIsland,
        });
        return this.events;
      }
    }

    // 8. Verse progression (Zenith overhead star trigger or verse duration)
    const verse = this.getCurrentVerse();
    if (verse && this.verseIndex + 1 < this.song.verses.length) {
      let shouldAdvance = false;
      if (verse.zenithTriggerStarId) {
        const zStar = this.starsState[verse.zenithTriggerStarId];
        if (zStar && zStar.altDeg >= 86.0) {
          shouldAdvance = true;
        }
      }
      if (this.elapsedRealSec >= verse.endRealSec) {
        shouldAdvance = true;
      }
      if (shouldAdvance) {
        this.verseIndex += 1;
        this.fastForward = false;
        this.events.push({ type: 'verse_changed', verseIndex: this.verseIndex });
      }
    }

    // 9. Track cue deviation for post-mist cue-relative reflection
    const idealHeading = this.computeCueAutopilotHeading();
    const headingErr = Math.abs(wrapDeg180(this.headingDeg - idealHeading));
    if (headingErr > 16.0) {
      this.offCueAccumSec += simDtSec;
      const score = headingErr * simDtSec;
      if (score > this.worstCueDeviationScore && verse) {
        this.worstCueDeviationScore = score;
        this.worstCueLabel = verse.cueLabel;
      }
    }

    // 10. Check Lost at Sea: Ration Depletion OR Mercy-Rule Divergence
    if (this.rationsRemaining <= 0.0) {
      this._triggerLostAtSea('rations_depleted');
      return this.events;
    }

    if (this._checkMercyRuleDivergence()) {
      this._triggerLostAtSea('mercy_divergence');
      return this.events;
    }

    return this.events;
  }

  /**
   * Computes the exact cue-following Trim-Lock heading a skilled navigator holds for the active verse.
   */
  computeCueAutopilotHeading() {
    if (!this.song) return 0.0;
    const verse = this.getCurrentVerse();
    if (!verse || !verse.guidance) return 0.0;

    const g = verse.guidance;
    const mode = g.mode;
    const weather = verse.weather ?? 'clear';
    const toId = this.song.toIsland;

    let desiredCog = null;

    // Check visible/tactile target-island cues within Concentric Detection Screens
    for (const det of this.detections) {
      if (det.islandId !== toId) continue;
      const isl = this.activeIslands[det.islandId];
      const piercesFog = Boolean(isl.peaksPierceFog) || det.ring >= 3;

      if (
        mode === 'wave_shadow_landfall' &&
        det.waveZone === IslandWaveZone.CALM_WAVE_SHADOW
      ) {
        desiredCog = det.bearingDeg;
      } else if (
        (weather !== 'sea_fog' && det.ring >= 2) ||
        (mode === 'island_beacon' && det.ring >= 1) ||
        (weather === 'sea_fog' && piercesFog && det.ring >= 2)
      ) {
        desiredCog = det.bearingDeg;
      }
    }

    if (desiredCog === null) {
      desiredCog = g.fallbackHeadingDeg ?? g.targetHeadingDeg ?? 0.0;

      if (mode === 'star_relay_rising') {
        const st = pickActiveRelayStar(
          g.stars,
          false,
          this.solarRaDeg,
          this.solarHour,
          this.latDeg
        );
        if (st && st.altDeg > -2.0) {
          desiredCog = st.azDeg;
        }
      } else if (mode === 'star_relay_setting') {
        const st = pickActiveRelayStar(
          g.stars,
          true,
          this.solarRaDeg,
          this.solarHour,
          this.latDeg
        );
        if (st && st.altDeg > -2.0) {
          desiredCog = st.azDeg;
        }
      } else if (mode === 'stern_star') {
        const sDef = NAVIGATION_STARS[g.sternStarId];
        if (sDef) {
          const st = computeStarAltAz(
            sDef.raDeg,
            sDef.decDeg,
            computeLstDeg(this.solarRaDeg, this.solarHour),
            this.latDeg
          );
          if (st.altDeg > 0.0) {
            desiredCog = posMod(st.azDeg + 180.0, 360.0);
          }
        }
      } else if (mode === 'sun_direct') {
        if (this.sunState.altDeg > -4.0) {
          desiredCog = this.sunState.azDeg;
        }
      } else if (mode === 'swell_cheek' || mode === 'wave_shadow_landfall') {
        const offset = (g.cheekSide ?? 'port') === 'port' ? 45.0 : -45.0;
        desiredCog = posMod(this.getPrimarySwellFromAz() + offset, 360.0);
      }
    }

    const estLeeway = g.compensateLeeway
      ? computeLeewayDeg(
          desiredCog,
          this.getWindFromAz(),
          this.hasSailTender,
          Boolean(this.song.strongCrosswind)
        )
      : 0.0;

    return posMod(desiredCog - estLeeway, 360.0);
  }

  _refreshEnvironment(_simDtSec) {
    if (this.status === VoyageStatus.SAILING && this.song) {
      const traveled = Math.hypot(
        this.pos.x - this.startPos.x,
        this.pos.y - this.startPos.y
      );
      const frac = Math.max(0.0, Math.min(1.0, traveled / this.totalRouteUnits));
      this.latDeg = this.fromLatDeg + (this.toLatDeg - this.fromLatDeg) * frac;
    }

    this.sunState = computeSunState(this.solarRaDeg, this.solarHour, this.latDeg);
    this.starsState = evaluateAllNavigationStars(
      this.solarRaDeg,
      this.solarHour,
      this.latDeg
    );
    this.deckShadow = evaluateDeckShadow(
      this.sunState.altDeg,
      this.sunState.azDeg,
      this.headingDeg
    );

    // Evaluate Concentric Island Detection Rings (1 -> 4)
    const swellFrom = this.getPrimarySwellFromAz();
    const downswellAz = posMod(swellFrom + 180.0, 360.0);
    const detections = [];

    for (const [id, isl] of Object.entries(this.activeIslands)) {
      if (id === this.song?.fromIsland && this.elapsedRealSec < 60.0) {
        continue;
      }
      const dx = isl.simPos.x - this.pos.x;
      const dy = isl.simPos.y - this.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.ringRadii.ring1) {
        continue;
      }

      const bearingDeg = posMod(radToDeg(Math.atan2(dx, dy)), 360.0);
      let ring = 1;
      if (dist <= this.ringRadii.ring4) ring = 4;
      else if (dist <= this.ringRadii.ring3) ring = 3;
      else if (dist <= this.ringRadii.ring2) ring = 2;

      let waveZone = IslandWaveZone.OPEN_SEA;
      if (ring >= 3) {
        const canoeFromIslAz = posMod(radToDeg(Math.atan2(-dx, -dy)), 360.0);
        const leeDiff = Math.abs(wrapDeg180(canoeFromIslAz - downswellAz));
        if (leeDiff <= 38.0 && dist <= this.ringRadii.ring3 * 0.72) {
          waveZone = IslandWaveZone.CALM_WAVE_SHADOW;
        } else if (isl.hasSteepCliffs && leeDiff >= 125.0) {
          waveZone = IslandWaveZone.CLIFF_REFLECTION;
        } else {
          waveZone = IslandWaveZone.REFRACTION_LATTICE;
        }
      }

      detections.push({
        islandId: id,
        island: isl,
        distanceUnits: dist,
        bearingDeg,
        ring,
        waveZone,
      });
    }

    detections.sort((a, b) => a.distanceUnits - b.distanceUnits);
    this.detections = detections;

    const nearestRing3 = detections.find((d) => d.ring >= 3);
    this.hullState = sampleTwinHullState({
      elapsedSec: this.elapsedRealSec,
      bpm: this.song?.bpm ?? 60.0,
      canoeHeadingDeg: this.headingDeg,
      primarySwellFromAz: swellFrom,
      secondaryChopFromAz: this.song?.secondaryChopFromAz ?? null,
      islandWaveZone: nearestRing3 ? nearestRing3.waveZone : IslandWaveZone.OPEN_SEA,
      islandBearingDeg: nearestRing3 ? nearestRing3.bearingDeg : 0.0,
    });
  }

  _getHighestNonDepartureRing() {
    let maxRing = 0;
    for (const det of this.detections) {
      if (det.islandId === this.song?.fromIsland && this.elapsedRealSec < 90.0) {
        continue;
      }
      if (det.ring > maxRing) {
        maxRing = det.ring;
      }
    }
    return maxRing;
  }

  _checkMercyRuleDivergence() {
    if (!this.song || this.elapsedRealSec < 90.0) return false;
    const target = this.activeIslands[this.song.toIsland];
    if (!target) return false;

    const maxThreshold =
      Math.max(5.0, this.song.expectedDurationMin) *
      GameConstants.MERCY_DIVERGENCE_DISTANCE_RATIO;
    const dxT = target.simPos.x - this.pos.x;
    const dyT = target.simPos.y - this.pos.y;
    const distTarget = Math.hypot(dxT, dyT);

    if (distTarget <= maxThreshold) {
      return false;
    }

    // Check if any island lies within the forward +/-60 deg cone within reasonable reach
    for (const isl of Object.values(this.activeIslands)) {
      const dx = isl.simPos.x - this.pos.x;
      const dy = isl.simPos.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      const brg = posMod(radToDeg(Math.atan2(dx, dy)), 360.0);
      const angleDiff = Math.abs(wrapDeg180(brg - this.courseOverGroundDeg));
      if (
        angleDiff <= GameConstants.MERCY_FORWARD_CONE_HALF_DEG &&
        d <= maxThreshold * 0.95
      ) {
        return false;
      }
    }

    return true;
  }

  _triggerLostAtSea(reason) {
    this.status = VoyageStatus.LOST_AT_SEA;
    this.lostReason = reason;
    this.fastForward = false;
    this.reflectionText = this._buildCueRelativeReflection(reason);
    this.events.push({
      type: 'lost_at_sea',
      reason,
      reflectionText: this.reflectionText,
    });
  }

  /**
   * Generates a gentle, strictly cue-relative navigator reflection with ZERO cardinal words or degrees.
   */
  _buildCueRelativeReflection(reason) {
    if (!this.departedRecommendedWindow) {
      return `The sea-mist closed in because the canoe launched outside the chant's tide-light, finding ${this.worstCueLabel} already shifted across the sky dome.`;
    }
    if (
      this.minCondition < GameConstants.NEGLECTED_MAINTENANCE_THRESHOLD &&
      reason === 'mercy_divergence'
    ) {
      return `Slack lashings and worn planking pulled the twin prows crabwise off ${this.worstCueLabel} until only empty swells remained ahead.`;
    }
    if (reason === 'rations_depleted') {
      return `Gourds and woven baskets ran dry before any island cloud broke the sea; check ${this.worstCueLabel} and carry fuller rations before casting off.`;
    }
    if (this.song?.strongCrosswind && Math.abs(this.leewayDeg) > 2.2) {
      return `The beam wind slid the hulls sideways while holding ${this.worstCueLabel}—glance astern at your foamy wake and lean half a prow into the wind.`;
    }
    return `The twin prows drifted wide of ${this.worstCueLabel}, sailing past the island's birds and clouds into the empty mist.`;
  }
}
