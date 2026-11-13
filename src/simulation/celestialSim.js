/**
 * Unified spherical astronomy engine for Kavenga: Songs of the Star Path.
 * Reference latitude: -12 deg (Polynesian tropical band).
 * All degree math stays internal; player-facing strings use Horizon Houses and Animal Stars only.
 */

import {
  GameConstants,
  degToRad,
  posMod,
  radToDeg,
  wrapDeg180,
} from '../core/gameConstants.js';
import { NAVIGATION_STARS } from '../data/constellationsData.js';

export function clamp(val, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, val));
}

/**
 * Local Sidereal Time in degrees [0, 360).
 * At solarHour === 12.0 (local solar noon), the sun transits the meridian so LST === solarRaDeg.
 */
export function computeLstDeg(solarRaDeg, solarHour) {
  return posMod(
    solarRaDeg + (solarHour - 12.0) * GameConstants.SKY_ROTATION_DEG_PER_HOUR,
    360.0
  );
}

/**
 * Transforms equatorial (RA, Dec) into local horizon (Altitude, Azimuth) at reference latitude.
 * Azimuth convention (internal engine): 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function computeStarAltAz(
  raDeg,
  decDeg,
  lstDeg,
  latDeg = GameConstants.REFERENCE_LATITUDE_DEG
) {
  const haDeg = wrapDeg180(lstDeg - raDeg);
  const ha = degToRad(haDeg);
  const phi = degToRad(latDeg);
  const dec = degToRad(decDeg);

  const sinAlt = clamp(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha),
    -1.0,
    1.0
  );
  const altDeg = radToDeg(Math.asin(sinAlt));

  const y = -Math.cos(dec) * Math.sin(ha);
  const x = Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(ha);
  const azDeg = posMod(radToDeg(Math.atan2(y, x)), 360.0);

  let extinctionFactor = 0.0;
  if (altDeg > 0.0) {
    if (altDeg < GameConstants.HORIZON_EXTINCTION_BAND_DEG) {
      extinctionFactor = 0.35 + 0.65 * (altDeg / GameConstants.HORIZON_EXTINCTION_BAND_DEG);
    } else {
      extinctionFactor = 1.0;
    }
  }

  const inThreeHandsWindow =
    altDeg >= 0.0 && altDeg <= GameConstants.THREE_HANDS_MAX_ALT_DEG;

  return {
    altDeg,
    azDeg,
    haDeg,
    extinctionFactor,
    inThreeHandsWindow,
  };
}

/**
 * Evaluates solar altitude, azimuth, daylight brightness, and nocturnal star visibility.
 * The Sun rides Band 3 (celestial equator, dec = 0 deg) at seasonal solarRaDeg.
 */
export function computeSunState(
  solarRaDeg,
  solarHour,
  latDeg = GameConstants.REFERENCE_LATITUDE_DEG
) {
  const lstDeg = computeLstDeg(solarRaDeg, solarHour);
  const pos = computeStarAltAz(solarRaDeg, 0.0, lstDeg, latDeg);

  // Smooth daylight & twilight curves across civil/nautical twilight (-12..+8 deg solar alt)
  const daylightFactor = clamp((pos.altDeg + 2.5) / 12.5, 0.0, 1.0);
  const twilightFactor =
    pos.altDeg > -14.0 && pos.altDeg < 8.0
      ? 1.0 - Math.abs(pos.altDeg + 3.0) / 11.0
      : 0.0;

  // Bright stars emerge in twilight (~-1 deg solar alt) and reach full brilliance by -10 deg
  const starVisibility = clamp((2.0 - pos.altDeg) / 11.0, 0.0, 1.0);

  return {
    altDeg: pos.altDeg,
    azDeg: pos.azDeg,
    haDeg: pos.haDeg,
    lstDeg,
    daylightFactor,
    twilightFactor: clamp(twilightFactor, 0.0, 1.0),
    starVisibility,
  };
}

/**
 * Converts (altDeg, azDeg) into a unit 3D direction vector.
 * In local canoe/Three.js frame (when relativeToHeadingDeg === canoeHeadingDeg):
 *   -Z = dead ahead between twin prows, +X = starboard beam, +Y = masthead zenith.
 * When relativeToHeadingDeg === 0, -Z = engine 0 deg, +X = engine 90 deg.
 */
export function altAzToDirectionVec3(altDeg, azDeg, relativeToHeadingDeg = 0.0) {
  const alt = degToRad(altDeg);
  const relAz = degToRad(azDeg - relativeToHeadingDeg);
  const cosAlt = Math.cos(alt);
  return {
    x: cosAlt * Math.sin(relAz),
    y: Math.sin(alt),
    z: -cosAlt * Math.cos(relAz),
  };
}

/**
 * Computes current horizon coordinates for all 31 named navigation stars.
 */
export function evaluateAllNavigationStars(
  solarRaDeg,
  solarHour,
  latDeg = GameConstants.REFERENCE_LATITUDE_DEG
) {
  const lstDeg = computeLstDeg(solarRaDeg, solarHour);
  const result = {};
  for (const [id, star] of Object.entries(NAVIGATION_STARS)) {
    const state = computeStarAltAz(star.raDeg, star.decDeg, lstDeg, latDeg);
    result[id] = {
      ...star,
      ...state,
    };
  }
  return result;
}

/**
 * Selects the active steering star along a Kavenga star-relay sequence.
 * Rising relays hand off as a star climbs past ~30-33 deg ("three hands") and the next breaks the horizon.
 * Setting relays stay on the current descending star until it nears horizon extinction (~1 deg).
 */
export function pickActiveRelayStar(
  starIds,
  isSetting,
  solarRaDeg,
  solarHour,
  latDeg = GameConstants.REFERENCE_LATITUDE_DEG
) {
  if (!Array.isArray(starIds) || starIds.length === 0) {
    return null;
  }
  const lstDeg = computeLstDeg(solarRaDeg, solarHour);
  const evaluated = [];
  for (const id of starIds) {
    const starDef = NAVIGATION_STARS[id];
    if (!starDef) continue;
    const state = computeStarAltAz(starDef.raDeg, starDef.decDeg, lstDeg, latDeg);
    evaluated.push({
      ...starDef,
      ...state,
    });
  }
  if (evaluated.length === 0) {
    return null;
  }

  if (!isSetting) {
    let chosen = evaluated[0];
    for (let i = 0; i < evaluated.length; i += 1) {
      const cur = evaluated[i];
      if (cur.altDeg >= 0.2 && cur.altDeg <= 33.0) {
        chosen = cur;
        break;
      }
      if (
        cur.altDeg > 33.0 &&
        i + 1 < evaluated.length &&
        evaluated[i + 1].altDeg >= -0.5
      ) {
        chosen = evaluated[i + 1];
      }
    }
    return chosen;
  }

  let chosen = evaluated[evaluated.length - 1];
  for (const cur of evaluated) {
    if (cur.altDeg >= 1.0 && cur.altDeg <= 40.0) {
      chosen = cur;
      break;
    }
  }
  return chosen;
}
