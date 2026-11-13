/**
 * Global simulation, astronomical, and difficulty constants for Kavenga: Songs of the Star Path.
 * Strictly internal engine math; player-facing strings never expose compass degrees or N/E/S/W.
 */

export const Difficulty = Object.freeze({
  EASY: 'easy',                         // Apprentice: audio song, lyrics + cue hints, Recall enabled, sky annotated + active star shimmer
  MEDIUM: 'medium',                     // Wayfinder: audio song, lyrics only, Recall enabled, sky annotated
  HARD: 'hard',                         // Navigator: audio song, no text, Recall enabled, sky annotated
  MASTER_NAVIGATOR: 'master_navigator', // Grandmaster: silence at sea, no text, Recall disabled at sea, raw starfield
});

export const DepartureWindow = Object.freeze({
  DAWN: 'dawn',
  MIDDAY: 'midday',
  DUSK: 'dusk',
  MIDNIGHT: 'midnight',
});

export const GameConstants = Object.freeze({
  REAL_SECONDS_PER_GAME_HOUR: 30.0,
  SKY_ROTATION_DEG_PER_HOUR: 15.0,
  FAST_FORWARD_MULTIPLIER: 2.75,

  NOMINAL_SPEED_UNITS_PER_MIN: 1.0,
  REFERENCE_LATITUDE_DEG: -12.0,

  THREE_HANDS_MAX_ALT_DEG: 30.0,
  HORIZON_EXTINCTION_BAND_DEG: 6.0,
  DEFAULT_CAMERA_TOP_ALT_DEG: 42.0,

  RING_1_BIOLOGICAL_RATIO: 0.35,
  RING_2_CLOUD_RATIO: 0.25,
  RING_3_SWELL_DRIFT_RATIO: 0.15,
  RING_4_LANDFALL_RATIO: 0.06,
  RING_4_MIN_RADIUS_UNITS: 0.45,

  WELL_MAINTAINED_THRESHOLD: 70.0,
  NEGLECTED_MAINTENANCE_THRESHOLD: 50.0,
  MAX_CROSSWIND_LEEWAY_DEG: 4.0,
  LOW_CONDITION_CREEP_DEG_PER_MIN: 2.5,

  BASE_RATION_BURN_PER_MIN_PER_CREW: 0.14,
  LOW_RATION_WARNING_FRACTION: 0.15,
  MERCY_DIVERGENCE_DISTANCE_RATIO: 1.25,
  MERCY_FORWARD_CONE_HALF_DEG: 60.0,
});

export function departureWindowToHour(windowId) {
  switch (windowId) {
    case DepartureWindow.DAWN:
      return 6.0;
    case DepartureWindow.MIDDAY:
      return 12.0;
    case DepartureWindow.DUSK:
      return 18.0;
    case DepartureWindow.MIDNIGHT:
      return 0.0;
    default:
      return 6.0;
  }
}

export function departureWindowLabel(windowId) {
  switch (windowId) {
    case DepartureWindow.DAWN:
      return 'Dawn';
    case DepartureWindow.MIDDAY:
      return 'Midday';
    case DepartureWindow.DUSK:
      return 'Dusk';
    case DepartureWindow.MIDNIGHT:
      return 'Midnight';
    default:
      return 'Dawn';
  }
}

export function allowsRecallAtSea(difficulty) {
  return difficulty !== Difficulty.MASTER_NAVIGATOR;
}

export function playsSongAtSea(difficulty) {
  return difficulty !== Difficulty.MASTER_NAVIGATOR;
}

export function showsSkyAnnotations(difficulty) {
  return difficulty !== Difficulty.MASTER_NAVIGATOR;
}

export function showsActiveStarShimmer(difficulty) {
  return difficulty === Difficulty.EASY;
}

export function showsSongLyrics(difficulty) {
  return difficulty === Difficulty.EASY || difficulty === Difficulty.MEDIUM;
}

export function showsEasyCueInstructions(difficulty) {
  return difficulty === Difficulty.EASY;
}

export function posMod(value, mod) {
  return ((value % mod) + mod) % mod;
}

export function wrapDeg180(deg) {
  return posMod(deg + 180.0, 360.0) - 180.0;
}

export function degToRad(deg) {
  return (deg * Math.PI) / 180.0;
}

export function radToDeg(rad) {
  return (rad * 180.0) / Math.PI;
}
