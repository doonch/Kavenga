/**
 * Declarative Campaign Objectives Catalog for Kavenga: Songs of the Star Path.
 *
 * Two complementary objective categories guide the player ashore across Acts I, II, and III:
 *  1. `arrival` — Activated immediately upon setting foot on an island (starting on Ra'iatea
 *     and upon landfall across every campaign island), calling on the player to greet the local
 *     elder, master navigator, canoe-wright, or gather from the wild rookery on Manuae.
 *  2. `quest`   — Activated when an elder/master entrusts the player with retrieving or
 *     delivering a sacred item (or restoring & consecrating the vaka).
 *
 * Strictly visible ONLY ashore (`phase === 'shore'`), never while sailing or in Sky Vigils.
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

export const OBJECTIVES = Object.freeze({
  // =========================================================================
  // ACT I — ARRIVAL / MEETING OBJECTIVES (The Ra'iatea Lagoon Chain)
  // =========================================================================
  meet_raiatea_elder: Object.freeze({
    id: 'meet_raiatea_elder',
    kind: 'arrival',
    act: 1,
    islandId: 'raiatea',
    glyph: '🌺',
    title: 'Speak with Elder Metua at Marae Taputapuatea',
    detail: "Seek the Marae Elder's blessing and first lagoon star-path guidance on Ra'iatea.",
  }),

  meet_tahaa_hina: Object.freeze({
    id: 'meet_tahaa_hina',
    kind: 'arrival',
    act: 1,
    islandId: 'tahaa',
    glyph: '🌺',
    title: 'Meet Fisher-Navigator Hina at the Hillside Hearth',
    detail: "Greet Hina on Taha'a to mend your sennit lashings and learn the morning bird chant.",
  }),

  meet_huahine_arii: Object.freeze({
    id: 'meet_huahine_arii',
    kind: 'arrival',
    act: 1,
    islandId: 'huahine',
    glyph: '🌺',
    title: "Meet Night-Sky Elder Ari'i at the Twin-Bay Sail Loft",
    detail: "Visit Elder Ari'i on Huahine to speak of pandanus sails and dusk star paths.",
  }),

  harvest_manuae_rookery: Object.freeze({
    id: 'harvest_manuae_rookery',
    kind: 'arrival',
    act: 1,
    islandId: 'manuae',
    glyph: '🐚',
    title: 'Gather Sacred Gifts at the Wild Seabird Rookery',
    detail: 'Search the undisturbed motus and jade lagoon shallows of Manuae for rare offerings.',
  }),

  meet_moorea_vaihere: Object.freeze({
    id: 'meet_moorea_vaihere',
    kind: 'arrival',
    act: 1,
    islandId: 'moorea',
    glyph: '🌺',
    title: 'Meet Master Canoe-Wright Vaihere at the Spire-Foot Sanctuary',
    detail: "Speak with Vaihere on Mo'orea beneath the volcanic spire about strengthening your hulls.",
  }),

  meet_maupiti_terai: Object.freeze({
    id: 'meet_maupiti_terai',
    kind: 'arrival',
    act: 1,
    islandId: 'maupiti',
    glyph: '🌺',
    title: "Meet First Master Tera'i at the Cliff Sanctuary",
    detail: "Ascend to First Master Tera'i's sanctuary overlooking Maupiti's foaming reef pass.",
  }),

  // =========================================================================
  // ACT I — ITEM-RETRIEVAL & CONSECRATION QUESTS
  // =========================================================================
  quest_kura_feathers_raiatea: Object.freeze({
    id: 'quest_kura_feathers_raiatea',
    kind: 'quest',
    act: 1,
    islandId: 'raiatea',
    requiredItemId: 'red_kura_feathers',
    requiresRestoredCanoe: true,
    glyph: '🪶',
    title: "Bring Ceremonial Red Kura Feathers to Elder Metua on Ra'iatea",
    detail: 'Gather crimson tropicbird feathers across the lagoon chain and return with a sound canoe for consecration.',
    readyNote: "Crimson Kura Feathers lashed aboard — present them at Marae Taputapuatea on Ra'iatea",
  }),

  quest_kava_to_huahine: Object.freeze({
    id: 'quest_kava_to_huahine',
    kind: 'quest',
    act: 1,
    islandId: 'huahine',
    requiredItemId: 'kava_bundle',
    glyph: '🌿',
    title: "Deliver the Medicinal Kava Bundle to Elder Ari'i on Huahine",
    detail: "Carry Hina's fragrant kava root from Taha'a to the Twin-Bay Sail Loft on Huahine.",
    readyNote: "Medicinal Kava Bundle aboard — deliver to Elder Ari'i on Huahine",
  }),

  quest_lures_to_moorea: Object.freeze({
    id: 'quest_lures_to_moorea',
    kind: 'quest',
    act: 1,
    islandId: 'moorea',
    requiredItemId: 'pearl_shell_lures',
    glyph: '🐚',
    title: "Retrieve Giant Pearl-Shell Lures from Manuae for Vaihere on Mo'orea",
    detail: "Harvest iridescent lagoon lures at Manuae Atoll and trade them to Canoe-Wright Vaihere on Mo'orea.",
    readyNote: "Giant Pearl-Shell Lures aboard — bring them to Vaihere on Mo'orea",
  }),

  quest_adze_to_maupiti: Object.freeze({
    id: 'quest_adze_to_maupiti',
    kind: 'quest',
    act: 1,
    islandId: 'maupiti',
    requiredItemId: 'polished_basalt_adze',
    glyph: '🪨',
    title: "Present the Polished Basalt Adze to First Master Tera'i on Maupiti",
    detail: "Carry Vaihere's ceremonial black-stone adze through the outer pass to First Master Tera'i on Maupiti.",
    readyNote: "Polished Basalt Adze aboard — present it to First Master Tera'i on Maupiti",
  }),

  // =========================================================================
  // ACT II — ARRIVAL & ITEM-RETRIEVAL OBJECTIVES (The Nuku Hiva Windward Chain)
  // =========================================================================
  meet_nuku_hiva_teiki: Object.freeze({
    id: 'meet_nuku_hiva_teiki',
    kind: 'arrival',
    act: 2,
    islandId: 'nuku_hiva',
    glyph: '🌺',
    title: 'Meet Master Teiki at the Great Marae of Nuku Hiva',
    detail: 'Seek Valley Master Teiki beneath the towering cliffs to learn the low-grazing star path.',
  }),

  meet_ua_pou_vaea: Object.freeze({
    id: 'meet_ua_pou_vaea',
    kind: 'arrival',
    act: 2,
    islandId: 'ua_pou',
    glyph: '🌺',
    title: "Meet Bone-Carver Vaea at the Carvers' Terrace",
    detail: 'Greet Vaea and Master Sail-Tender Moana beneath the basalt spires of Ua Pou.',
  }),

  quest_harpoons_to_rangiroa: Object.freeze({
    id: 'quest_harpoons_to_rangiroa',
    kind: 'quest',
    act: 2,
    islandId: 'rangiroa',
    requiredItemId: 'bone_harpoon_heads',
    glyph: '🦴',
    title: 'Deliver Carved Bone Harpoon Heads to Pearl-Diver Tane on Rangiroa',
    detail: "Carry Ua Pou's barbed sea-hunter points across the star path to Rangiroa's immense lagoon.",
    readyNote: 'Carved Bone Harpoon Heads aboard — trade them to Tane on Rangiroa',
  }),

  meet_rangiroa_tane: Object.freeze({
    id: 'meet_rangiroa_tane',
    kind: 'arrival',
    act: 2,
    islandId: 'rangiroa',
    glyph: '🌺',
    title: "Meet Atoll Navigator Tane at the Pearl-Divers' Village",
    detail: 'Speak with Tane beside the turquoise pass of Rangiroa about stern-wake star steering.',
  }),

  quest_star_discs_to_hiva_oa: Object.freeze({
    id: 'quest_star_discs_to_hiva_oa',
    kind: 'quest',
    act: 2,
    islandId: 'hiva_oa',
    requiredItemId: 'pearl_star_discs',
    glyph: '✦',
    title: 'Deliver Mother-of-Pearl Star Discs to Quarry Elder Tahia on Hiva Oa',
    detail: "Bring Rangiroa's luminous shell inlays through rain-squall waters to the carvers of Hiva Oa.",
    readyNote: 'Mother-of-Pearl Star Discs aboard — present them to Tahia on Hiva Oa',
  }),

  meet_hiva_oa_tahia: Object.freeze({
    id: 'meet_hiva_oa_tahia',
    kind: 'arrival',
    act: 2,
    islandId: 'hiva_oa',
    glyph: '🌺',
    title: 'Meet Quarry Elder Tahia at the Volcanic Quarry',
    detail: 'Greet Zenith Watcher Tahia and Hull-Wright Kahu on cliff-walled Hiva Oa.',
  }),

  quest_obsidian_to_fatu_hiva: Object.freeze({
    id: 'quest_obsidian_to_fatu_hiva',
    kind: 'quest',
    act: 2,
    islandId: 'fatu_hiva',
    requiredItemId: 'obsidian_adze_blanks',
    glyph: '🖤',
    title: 'Bring Volcanic Obsidian Blanks to Master Shipwright Oihanu on Fatu Hiva',
    detail: 'Deliver sharp volcanic glass from Hiva Oa so Oihanu can step your twin-sail Vaka Moana.',
    readyNote: 'Volcanic Obsidian Blanks aboard — bring them to Oihanu on Fatu Hiva',
  }),

  meet_fatu_hiva_oihanu: Object.freeze({
    id: 'meet_fatu_hiva_oihanu',
    kind: 'arrival',
    act: 2,
    islandId: 'fatu_hiva',
    glyph: '🌺',
    title: 'Meet Master Shipwright Oihanu at the Great Vaka Moana Shed',
    detail: 'Visit Oihanu beside Waterfall Bay on Fatu Hiva to prepare your deep-ocean canoe.',
  }),

  meet_mangareva_rongo: Object.freeze({
    id: 'meet_mangareva_rongo',
    kind: 'arrival',
    act: 2,
    islandId: 'mangareva',
    glyph: '🌺',
    title: 'Meet Elder Rongo at the Gateway Marae of Mangareva',
    detail: 'Receive Elder Rongo’s mist-border counsel before crossing into the fog-shrouded seas.',
  }),

  // =========================================================================
  // ACT III — ARRIVAL & ITEM-RETRIEVAL OBJECTIVES (The Hawai'i Mist Chain)
  // =========================================================================
  meet_kauai_pohaku: Object.freeze({
    id: 'meet_kauai_pohaku',
    kind: 'arrival',
    act: 3,
    islandId: 'kauai',
    glyph: '🌺',
    title: "Speak with Swell Master Pohaku on Kaua'i",
    detail: 'Listen as Swell Master Pohaku teaches the four rhythmic ocean swell voices on the black sand.',
  }),

  quest_miro_timber_kauai: Object.freeze({
    id: 'quest_miro_timber_kauai',
    kind: 'quest',
    act: 3,
    islandId: 'kauai',
    requiredItemId: 'miro_drum_wood',
    glyph: '🥁',
    title: "Retrieve Sacred Miro Drum-Timber from O'ahu for Swell Master Pohaku",
    detail: "Cross the blind mist to O'ahu by four-beat swell feel and bring resonant miro heartwood back to Kaua'i.",
    readyNote: "Sacred Miro Drum-Timber aboard — return it to Swell Master Pohaku on Kaua'i",
  }),

  meet_oahu_manu: Object.freeze({
    id: 'meet_oahu_manu',
    kind: 'arrival',
    act: 3,
    islandId: 'oahu',
    glyph: '🌺',
    title: 'Meet Elder Manu at the Misty Miro Timber Grove',
    detail: "Speak with Elder Manu on fog-banked O'ahu to lash miro heartwood and learn the return swell chant.",
  }),

  meet_kiritimati_akura: Object.freeze({
    id: 'meet_kiritimati_akura',
    kind: 'arrival',
    act: 3,
    islandId: 'kiritimati',
    glyph: '🌺',
    title: 'Meet Keeper Akura at the Sacred Star-Mirror Shrine',
    detail: 'Study the Steadfast Peg and provision your canoe with Keeper Akura on Kiritimati.',
  }),

  quest_tridacna_to_hawaii: Object.freeze({
    id: 'quest_tridacna_to_hawaii',
    kind: 'quest',
    act: 3,
    islandId: 'hawaii',
    requiredItemId: 'sacred_tridacna_shell',
    glyph: '🐚',
    title: "Carry the Sacred Giant Tridacna Shell to the Great Heiau on Hawai'i",
    detail: "Bear Kiritimati's fluted lagoon offering across the final star-and-swell voyage to ancestral Hawai'i.",
    readyNote: "Sacred Giant Tridacna Shell aboard — lay it upon the Great Heiau Ahu on Hawai'i",
  }),

  meet_hawaii_council: Object.freeze({
    id: 'meet_hawaii_council',
    kind: 'arrival',
    act: 3,
    islandId: 'hawaii',
    glyph: '🌺',
    title: 'Stand Before the Council of Ancestral Wayfinders at the Great Heiau',
    detail: "Walk up from Kealakekua Sands to the Great Ancestral Heiau Ahu on Hawai'i.",
  }),
});

export const ISLAND_ARRIVAL_OBJECTIVE_MAP = Object.freeze({
  raiatea: 'meet_raiatea_elder',
  tahaa: 'meet_tahaa_hina',
  huahine: 'meet_huahine_arii',
  manuae: 'harvest_manuae_rookery',
  moorea: 'meet_moorea_vaihere',
  maupiti: 'meet_maupiti_terai',
  nuku_hiva: 'meet_nuku_hiva_teiki',
  ua_pou: 'meet_ua_pou_vaea',
  rangiroa: 'meet_rangiroa_tane',
  hiva_oa: 'meet_hiva_oa_tahia',
  fatu_hiva: 'meet_fatu_hiva_oihanu',
  mangareva: 'meet_mangareva_rongo',
  kauai: 'meet_kauai_pohaku',
  oahu: 'meet_oahu_manu',
  kiritimati: 'meet_kiritimati_akura',
  hawaii: 'meet_hawaii_council',
});

export const OBJECTIVES_ORDER = Object.freeze(Object.keys(OBJECTIVES));
