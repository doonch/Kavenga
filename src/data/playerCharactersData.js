/**
 * Declarative Player Character Profiles for Kavenga: Songs of the Star Path.
 *
 * Maps each of the four difficulty levels to a traditional Polynesian wayfinder
 * character design, age, physical proportions, and ceremonial/voyaging attire:
 *  - Easy (`easy` / Apprentice): 12–14 year old child/youth apprentice
 *  - Medium (`medium` / Wayfinder): 18–20 year old young adult wayfinder
 *  - Hard (`hard` / Navigator): 30 year old seasoned adult navigator
 *  - Master Navigator (`master_navigator`): 50 year old elder master with a gray beard
 */

import { Difficulty } from '../core/gameConstants.js';

export const PLAYER_CHARACTER_PROFILES = Object.freeze({
  [Difficulty.EASY]: Object.freeze({
    id: Difficulty.EASY,
    title: 'Apprentice Wayfinder',
    shortPersona: '12–14 yr Apprentice',
    ageLabel: '12–14 Years Old',
    attireSummary:
      'Braided green ti-leaf headband with white blossoms, cowrie cord, woven star-pouch, and knee-length pandanus pareu.',
    totalHeightM: 1.44,
    shoulderWidthM: 0.31,
    chestWidthM: 0.26,
    chestDepthM: 0.175,
    waistWidthM: 0.215,
    hipWidthM: 0.235,
    limbThickness: 0.82,
    headRadiusM: 0.102,
    skinHex: 0xa5663d,
    hairHex: 0x1e1612,
  }),
  [Difficulty.MEDIUM]: Object.freeze({
    id: Difficulty.MEDIUM,
    title: 'Initiated Wayfinder',
    shortPersona: '18–20 yr Wayfinder',
    ageLabel: '18–20 Years Old',
    attireSummary:
      'Voyager topknot with frigatebird plume, diagonal barkcloth sash, pearl-shell crescent, wave-motif tapa wrap, and initiation tatau.',
    totalHeightM: 1.69,
    shoulderWidthM: 0.395,
    chestWidthM: 0.335,
    chestDepthM: 0.215,
    waistWidthM: 0.26,
    hipWidthM: 0.285,
    limbThickness: 0.96,
    headRadiusM: 0.109,
    skinHex: 0x9b5c35,
    hairHex: 0x191310,
  }),
  [Difficulty.HARD]: Object.freeze({
    id: Difficulty.HARD,
    title: 'Seasoned Navigator',
    shortPersona: '30 yr Navigator',
    ageLabel: '30 Years Old',
    attireSummary:
      'Flowing dark hair under a crimson kura feather circlet, ti-leaf voyaging collar, whalebone gorget, woven taʻovala mat, and full navigator tatau.',
    totalHeightM: 1.77,
    shoulderWidthM: 0.445,
    chestWidthM: 0.38,
    chestDepthM: 0.24,
    waistWidthM: 0.29,
    hipWidthM: 0.31,
    limbThickness: 1.08,
    headRadiusM: 0.113,
    skinHex: 0x91532e,
    hairHex: 0x15100e,
  }),
  [Difficulty.MASTER_NAVIGATOR]: Object.freeze({
    id: Difficulty.MASTER_NAVIGATOR,
    title: 'Elder Master Navigator',
    shortPersona: '50 yr Elder (Gray Beard)',
    ageLabel: '50 Years Old',
    attireSummary:
      'Full silver-gray beard and streaked crown knot, golden-crimson kura & pearl-shell crown, sacred taumi gorget, master tatau, and ceremonial kahu tapa cloak.',
    totalHeightM: 1.75,
    shoulderWidthM: 0.44,
    chestWidthM: 0.385,
    chestDepthM: 0.255,
    waistWidthM: 0.315,
    hipWidthM: 0.32,
    limbThickness: 1.06,
    headRadiusM: 0.114,
    skinHex: 0x894d2b,
    hairHex: 0x4d5259,
  }),
});

export function getPlayerCharacterProfile(difficulty) {
  return (
    PLAYER_CHARACTER_PROFILES[difficulty] ||
    PLAYER_CHARACTER_PROFILES[Difficulty.EASY]
  );
}
