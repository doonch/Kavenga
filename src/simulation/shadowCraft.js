/**
 * Solar Deck Shadow Craft (Pou Sighting Post -> Iako Crossbeam Sennit Lashings).
 * Evaluates real-time solar shadow ray projection across the central pola deck.
 * Zero cardinal words or degree numbers in labels.
 */

import { degToRad, posMod, wrapDeg180 } from '../core/gameConstants.js';

export const LASHING_ZONES = Object.freeze({
  none: { id: 'none', label: 'No distinct post shadow (night or twilight)', lateralNorm: 0.0 },
  zenith_base: { id: 'zenith_base', label: 'Shadow pooled tight around the post base (High Sun)', lateralNorm: 0.0 },
  left_outer: { id: 'left_outer', label: 'Left outer crossbeam lashing', lateralNorm: -0.95 },
  left_mid: { id: 'left_mid', label: 'Second left crossbeam lashing', lateralNorm: -0.62 },
  left_inner: { id: 'left_inner', label: 'First left crossbeam lashing', lateralNorm: -0.32 },
  center_fore: { id: 'center_fore', label: 'Center forward deck-lashing', lateralNorm: 0.0 },
  center_aft: { id: 'center_aft', label: 'Center aft deck-lashing', lateralNorm: 0.0 },
  right_inner: { id: 'right_inner', label: 'First right crossbeam lashing', lateralNorm: 0.32 },
  right_mid: { id: 'right_mid', label: 'Second right crossbeam lashing', lateralNorm: 0.62 },
  right_outer: { id: 'right_outer', label: 'Right outer crossbeam lashing', lateralNorm: 0.95 },
});

/**
 * Evaluates the deck sighting post (pou) shadow zone on the vaka crossbeam lashings.
 * @param {number} sunAltDeg Solar altitude in degrees
 * @param {number} sunAzDeg Solar azimuth in internal engine degrees
 * @param {number} canoeHeadingDeg Canoe heading in internal engine degrees
 */
export function evaluateDeckShadow(sunAltDeg, sunAzDeg, canoeHeadingDeg) {
  if (sunAltDeg < 2.0) {
    return {
      visible: false,
      isZenithWindow: false,
      zone: 'none',
      label: LASHING_ZONES.none.label,
      shadowRelDeg: 0.0,
      shadowLengthRatio: 0.0,
      lateralOffsetNorm: 0.0,
      foreAftOffsetNorm: 0.0,
    };
  }

  // Shadow points opposite the sun's azimuth
  const shadowWorldAzDeg = posMod(sunAzDeg + 180.0, 360.0);
  const shadowRelDeg = wrapDeg180(shadowWorldAzDeg - canoeHeadingDeg);
  const relRad = degToRad(shadowRelDeg);

  const sunAltRad = degToRad(Math.max(4.0, sunAltDeg));
  const rawLen = 1.0 / Math.tan(sunAltRad);
  const shadowLengthRatio = Math.min(3.5, rawLen);

  const lateralSin = Math.sin(relRad);
  const foreCos = Math.cos(relRad);

  if (sunAltDeg >= 74.0) {
    return {
      visible: true,
      isZenithWindow: true,
      zone: 'zenith_base',
      label: LASHING_ZONES.zenith_base.label,
      shadowRelDeg,
      shadowLengthRatio,
      lateralOffsetNorm: lateralSin * 0.12,
      foreAftOffsetNorm: foreCos * 0.12,
    };
  }

  const absLat = Math.abs(lateralSin);
  let zone = 'center_fore';
  if (absLat < 0.25) {
    zone = foreCos >= 0.0 ? 'center_fore' : 'center_aft';
  } else if (absLat < 0.60) {
    zone = lateralSin > 0.0 ? 'right_inner' : 'left_inner';
  } else if (absLat < 0.92) {
    zone = lateralSin > 0.0 ? 'right_mid' : 'left_mid';
  } else {
    zone = lateralSin > 0.0 ? 'right_outer' : 'left_outer';
  }

  return {
    visible: true,
    isZenithWindow: false,
    zone,
    label: LASHING_ZONES[zone].label,
    shadowRelDeg,
    shadowLengthRatio,
    lateralOffsetNorm: lateralSin,
    foreAftOffsetNorm: foreCos,
  };
}
