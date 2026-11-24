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

export function showsEasyConstellationCutout(difficulty) {
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

/**
 * Widens vertical FOV on narrow portrait phone screens so prows, star arcs,
 * and island silhouettes stay framed horizontally without affecting iPad/desktop.
 * @param {number} baseFovDeg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function computeAdaptiveFovDeg(baseFovDeg, width, height) {
  if (!(width > 0) || !(height > 0)) return baseFovDeg;
  const aspect = width / height;
  const minDim = Math.min(width, height);
  if (aspect >= 1.0 || minDim > 520) return baseFovDeg;
  const halfTan = Math.tan(degToRad(baseFovDeg) * 0.5);
  const scale = Math.min(1.55, Math.max(1.0, 0.85 / Math.max(aspect, 0.35)));
  const adapted = radToDeg(2.0 * Math.atan(halfTan * scale));
  return Math.max(baseFovDeg, Math.min(76.0, adapted));
}

export const DEFAULT_SAIL_COLOR = '#e6cfa3';

export const SAIL_DYE_PALETTE = Object.freeze([
  Object.freeze({ id: 'pandanus', name: 'Pandanus Cream', hex: '#e6cfa3' }),
  Object.freeze({ id: 'kura', name: 'Crimson Kura', hex: '#b83227' }),
  Object.freeze({ id: 'turmeric', name: 'Turmeric Gold', hex: '#d9a441' }),
  Object.freeze({ id: 'jade', name: 'Lagoon Jade', hex: '#2ea89c' }),
  Object.freeze({ id: 'indigo', name: 'Ocean Indigo', hex: '#2c5078' }),
  Object.freeze({ id: 'terracotta', name: 'Clay Terracotta', hex: '#c45d38' }),
  Object.freeze({ id: 'charcoal', name: 'Basalt Charcoal', hex: '#363d45' }),
]);

export function normalizeSailColorHex(hex) {
  if (typeof hex !== 'string') return DEFAULT_SAIL_COLOR;
  const trimmed = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return DEFAULT_SAIL_COLOR;
}

export function computeSailVariantColors(baseHex) {
  const safeHex = normalizeSailColorHex(baseHex);
  const normalHex = parseInt(safeHex.slice(1), 16);
  const r = (normalHex >> 16) & 0xff;
  const g = (normalHex >> 8) & 0xff;
  const b = normalHex & 0xff;

  const pack = (rr, gg, bb) =>
    ((Math.max(0, Math.min(255, Math.round(rr))) & 0xff) << 16) |
    ((Math.max(0, Math.min(255, Math.round(gg))) & 0xff) << 8) |
    (Math.max(0, Math.min(255, Math.round(bb))) & 0xff);

  // Salt-and-sun weathered shade when sailCondition < 55%
  const wr = r * 0.72 + 158 * 0.14;
  const wg = g * 0.72 + 139 * 0.14;
  const wb = b * 0.72 + 112 * 0.14;
  const wornHex = pack(wr, wg, wb);

  // Subtle woven panel seam shade (darkens bright cloths, softly lifts very dark cloths)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const seamNormalHex =
    luma < 52
      ? pack(r + 22, g + 20, b + 18)
      : pack(r * 0.85, g * 0.82, b * 0.76);
  const seamWornHex =
    luma < 52
      ? pack(wr + 16, wg + 15, wb + 14)
      : pack(wr * 0.85, wg * 0.82, wb * 0.76);

  return { normalHex, wornHex, seamNormalHex, seamWornHex };
}
