/**
 * Declarative Surprise Achievements Catalog for Kavenga: Songs of the Star Path.
 *
 * Achievements are never announced or hinted at in advance: they unlock as delightful
 * surprises for extraordinary feats at sea or ashore, persist across "Start Over" resets,
 * and record when (real-world date), at what difficulty, and where (island / chain) they
 * were earned. Unearned slots appear only as mysterious `???` plaques in the gallery.
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

export const ACHIEVEMENTS = Object.freeze({
  reach_hawaii: Object.freeze({
    id: 'reach_hawaii',
    glyph: '🏔️',
    title: 'Tupaia-Nui of the Ancestral Shore',
    description: "Made landfall upon snow-crowned Hawai'i across the mist-seas without map or needle.",
  }),

  reach_rapa_nui: Object.freeze({
    id: 'reach_rapa_nui',
    glyph: '🗿',
    title: 'Guardians of Te Pito o Te Henua',
    description: 'Found the silent stone-guardian shore of Rapa Nui far beyond the outer horizon.',
  }),

  two_fish_schools_single_voyage: Object.freeze({
    id: 'two_fish_schools_single_voyage',
    glyph: '🐟',
    title: 'Bounty of the Leaping Bonito',
    description: 'Harvested two schools of leaping fish during a single ocean crossing.',
  }),

  survive_24h_at_sea: Object.freeze({
    id: 'survive_24h_at_sea',
    glyph: '🌊',
    title: 'Child of the Endless Swell',
    description: 'Survived twenty-four hours upon the open ocean without making landfall.',
  }),

  all_songs_master_difficulty: Object.freeze({
    id: 'all_songs_master_difficulty',
    glyph: '🌌',
    title: 'Keeper of the Silent Star Path',
    description: 'Completed all seventeen navigation chants in Master Navigator difficulty.',
  }),

  all_constellations_learned: Object.freeze({
    id: 'all_constellations_learned',
    glyph: '✨',
    title: 'Weaver of the Sky Animals',
    description: 'Learned all ten ancestral sky animals and the Steadfast Peg in Guided Sky Vigils.',
  }),

  full_crew_and_vaka_moana: Object.freeze({
    id: 'full_crew_and_vaka_moana',
    glyph: '🛶',
    title: 'Pride of the Double-Sail Pahi',
    description: 'Commanded a twin-sail Vaka Moana at full readiness with Tama, Moana, and Kahu aboard.',
  }),

  landfall_on_fumes: Object.freeze({
    id: 'landfall_on_fumes',
    glyph: '🥥',
    title: 'Last Drop in the Gourd',
    description: 'Guided the canoe safely onto shore with less than half a ration basket remaining.',
  }),

  off_window_landfall: Object.freeze({
    id: 'off_window_landfall',
    glyph: '🌅',
    title: 'Against the Tide-Light',
    description: "Reached a chant's destination after launching outside its recommended tide-light.",
  }),

  fog_without_recall: Object.freeze({
    id: 'fog_without_recall',
    glyph: '🥁',
    title: 'Hands Upon the Pahu',
    description: 'Completed a sea-fog crossing without once opening Sand Recall.',
  }),

  chart_all_shores: Object.freeze({
    id: 'chart_all_shores',
    glyph: '🐚',
    title: 'Memory of Seventeen Shores',
    description: 'Set foot upon every island across all three chains, including secret Rapa Nui.',
  }),

  eye_trial_streak_5: Object.freeze({
    id: 'eye_trial_streak_5',
    glyph: '👁️',
    title: 'Unblinking Eye of the Marae',
    description: 'Sighted five stars or horizon stones in a row without hints in the Star-Stone Vigil.',
  }),
});

export const ACHIEVEMENTS_ORDER = Object.freeze(Object.keys(ACHIEVEMENTS));
