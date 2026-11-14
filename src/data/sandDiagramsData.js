/**
 * Declarative stick-in-the-sand lesson scripts drawn on damp beach sand ashore
 * and shown as strictly static (never rotating!) memory vignettes via "Recall" at sea.
 * Coordinates live in normalized [-1.0, +1.0] sand-bed space; zero compass letters or degrees.
 */

export const SAND_LESSONS = Object.freeze({
  sand_raiatea_clouds: {
    id: 'sand_raiatea_clouds',
    title: 'The Still Cloud & Drifting Fronds',
    mentor: 'Elder Metua',
    islandId: 'raiatea',
    narration:
      'Trade clouds march with the wind like white canoes, yet a high island pins one tall cloud fast above its peak. Downwind, green fronds drift out upon the tide.',
    primitives: [
      { type: 'groove_line', from: [-0.8, 0.2], to: [0.8, 0.2], label: 'Sea Horizon' },
      { type: 'pebble', at: [0.0, 0.2], label: 'Pinned Peak Cloud' },
      { type: 'palm_rib_arrow', from: [0.6, 0.55], to: [-0.6, 0.55], label: 'Marching Wind-Clouds' },
      { type: 'groove_wave', from: [0.0, 0.12], to: [0.0, -0.62], label: 'Drifting Fronds' },
      { type: 'canoe_mark', at: [0.0, -0.75] },
    ],
  },
  sand_raiatea_leeway: {
    id: 'sand_raiatea_leeway',
    title: 'Reading Crosswind Leeway in the Wake',
    mentor: 'Elder Metua',
    islandId: 'raiatea',
    narration:
      'When strong wind presses your beam, your hulls slide crabwise even while your prows face a star. Look back over your steering sweep: lean half a prow into the wind until your white wake trails straight.',
    primitives: [
      { type: 'shell', at: [0.0, 0.7], label: 'Target Star' },
      { type: 'canoe_mark', at: [0.0, -0.1] },
      { type: 'groove_dashed', from: [0.0, -0.25], to: [0.38, -0.8], label: 'Crooked Leeway Wake' },
      { type: 'groove_line', from: [-0.08, -0.25], to: [-0.08, -0.8], label: 'Compensated Wake' },
    ],
  },
  sand_tahaa_birds_and_shadow: {
    id: 'sand_tahaa_birds_and_shadow',
    title: 'Homing Terns & Crossbeam Shadows',
    mentor: 'Hina',
    islandId: 'tahaa',
    narration:
      "At dawn the white fisher-tern flies straight out to sea—steer into his beak to find his home. At dusk follow his tail feathers back to land. When the sun climbs above your sail, bind the post's shadow to a crossbeam lashing.",
    primitives: [
      { type: 'pebble', at: [0.0, 0.55], label: 'Roosting Isle' },
      { type: 'groove_ray', from: [0.0, 0.45], to: [-0.55, -0.08], label: 'Dawn Outward' },
      { type: 'groove_ray', from: [0.55, -0.08], to: [0.0, 0.45], label: 'Dusk Homeward' },
      { type: 'palm_rib', from: [-0.55, -0.6], to: [0.55, -0.6], label: 'Iako Crossbeam Lashings' },
    ],
  },
  sand_huahine_lapa_and_bull: {
    id: 'sand_huahine_lapa_and_bull',
    title: 'Lagoon Lapa & The Bull and The Rat',
    mentor: "Ari'i",
    islandId: 'huahine',
    narration:
      "Low coral rings bear no mountain cloud, yet their shallow turquoise waters paint pale jade across the belly of clouds overhead. By night, steer while the Bull's Horn or Rat's Nose rides below three hands high.",
    primitives: [
      { type: 'groove_ring', at: [-0.45, -0.2], radius: 0.22, label: 'Coral Ring & Jade Cloud' },
      { type: 'shell', at: [0.28, 0.45], label: "Bull's Horn" },
      { type: 'shell', at: [0.38, 0.08], label: "Bull's Hoof" },
      { type: 'groove_line', from: [0.28, 0.45], to: [0.38, 0.08] },
      { type: 'shell', at: [0.64, 0.35], label: "Rat's Nose" },
      { type: 'shell', at: [0.72, 0.02], label: "Rat's Tail" },
      { type: 'groove_line', from: [0.64, 0.35], to: [0.72, 0.02] },
    ],
  },
  sand_moorea_two_star_handoff: {
    id: 'sand_moorea_two_star_handoff',
    title: 'Passing the Watch Along One Star Path',
    mentor: 'Vaihere',
    islandId: 'moorea',
    narration:
      "No rising star stays low forever. When the Bull's Horn climbs past three hands above the waves, drop your gaze straight down to the same horizon house where the Rat's Nose breaks the foam.",
    primitives: [
      { type: 'groove_line', from: [-0.8, -0.35], to: [0.8, -0.35], label: 'Sea Horizon' },
      { type: 'groove_arc', center: [0.0, -0.35], radius: 0.65, label: 'Path of the Bull' },
      { type: 'shell', at: [0.42, 0.22], label: "Climbing Bull's Horn (>3 Hands)" },
      { type: 'shell', at: [0.62, -0.28], label: "Rising Rat's Nose" },
    ],
  },
  sand_maupiti_12_shell_compass: {
    id: 'sand_maupiti_12_shell_compass',
    title: 'The Twelve-Shell Star Ring',
    mentor: "First Master Tera'i",
    islandId: 'maupiti',
    narration:
      "Five parallel star tracks connect five Rising Houses to five Setting Houses across the sea, framed by the Grazing Horse and the Sea Turtle's Pivot. Memorize which four animal stars share each groove.",
    primitives: [
      { type: 'canoe_mark', at: [0.0, 0.0] },
      { type: 'shell_ring_12', radius: 0.78 },
      { type: 'parallel_band_grooves_5', radius: 0.78 },
    ],
  },
  sand_nuku_hiva_polar_pivots: {
    id: 'sand_nuku_hiva_polar_pivots',
    title: 'The Two Horizon Pivots',
    mentor: 'Master Teiki',
    islandId: 'nuku_hiva',
    narration:
      "On one horizon the Horse's Crown skims low above the dark waves; directly opposite, the Frigatebird dives toward the spinning Sea Turtle.",
    primitives: [
      { type: 'shell', at: [0.0, 0.75], label: 'Grazing Horse' },
      { type: 'canoe_mark', at: [0.0, 0.0] },
      { type: 'shell', at: [0.0, -0.75], label: "Sea Turtle's Pivot" },
    ],
  },
  sand_ua_pou_band1_horse: {
    id: 'sand_ua_pou_band1_horse',
    title: 'Path of the Horse',
    mentor: 'Vaea',
    islandId: 'ua_pou',
    narration:
      "Horse's Mane, Horse's Tail, Boar's Bristle, and Crab's Right Claw ride the shallow Grazing Horse track together.",
    primitives: [{ type: 'shell_ring_12', radius: 0.78, highlightBand: 'band_1' }],
  },
  sand_rangiroa_stern_backsight: {
    id: 'sand_rangiroa_stern_backsight',
    title: 'Steering by the Wake Star',
    mentor: 'Tane',
    islandId: 'rangiroa',
    narration:
      "Every Rising House faces an opposite Setting House across the canoe. When rain-clouds curtain the Rising Shark, look astern and hold the Setting Boar's stars centered in your wake.",
    primitives: [
      {
        type: 'shell_ring_12',
        radius: 0.78,
        highlightOppositePair: ['house_band4_rising', 'house_band2_setting'],
      },
    ],
  },
  sand_hiva_oa_zenith_dogleg: {
    id: 'sand_hiva_oa_zenith_dogleg',
    title: 'The Mast-Top Zenith Star',
    mentor: 'Tahia',
    islandId: 'hiva_oa',
    narration:
      "Sail toward the Sea Turtle's Pivot while watching the Gecko climb. The moment the Gecko's Heart passes straight above your mast-top, turn onto the Rising Path of the Bull.",
    primitives: [
      { type: 'canoe_mark', at: [0.0, 0.0] },
      { type: 'shell', at: [0.0, 0.0], label: "Overhead Gecko's Heart" },
      { type: 'groove_ray', from: [0.0, 0.55], to: [0.0, 0.0] },
      { type: 'groove_ray', from: [0.0, 0.0], to: [0.65, 0.0] },
    ],
  },
  sand_fatu_hiva_band5_whale: {
    id: 'sand_fatu_hiva_band5_whale',
    title: 'Path of the Whale',
    mentor: 'Oihanu',
    islandId: 'fatu_hiva',
    narration:
      "Near the Sea Turtle's waters, Whale's Spout, Whale's Fluke, Shark's Tail, and Bird's Wingtip share the deep Whale's arc.",
    primitives: [{ type: 'shell_ring_12', radius: 0.78, highlightBand: 'band_5' }],
  },
  sand_mangareva_mist_warning: {
    id: 'sand_mangareva_mist_warning',
    title: 'Beyond the Starlit Waters',
    mentor: 'Elder Rongo',
    islandId: 'mangareva',
    narration:
      "Follow the Setting Horse across the great waters where the Sea Turtle drowns in your wake and the Steadfast Peg lifts ahead; when grey mist swallows the heavens, hold your sweep tied fast until Kaua'i's high crag pierces the morning fog.",
    primitives: [{ type: 'shell_ring_12', radius: 0.78, highlightBand: 'band_1' }],
  },
  sand_kauai_four_swell_voices: {
    id: 'sand_kauai_four_swell_voices',
    title: 'The Four Voices of the Deep Swell',
    mentor: 'Swell Master Pohaku',
    islandId: 'kauai',
    narration:
      'Head-on rushes ahead of the pahu drum in a quick seesaw. Beam-on rolls your deck sideways. Following surges slow from astern. Only on your port or starboard cheek does the leading prow crest on every fourth beat of the drum!',
    primitives: [
      { type: 'parallel_swell_ridges', angleRad: 0.0 },
      { type: 'canoe_mark', at: [0.0, 0.0], angleRad: 0.785, label: '4-Beat Cheek Trim' },
    ],
  },
  sand_kauai_refraction_lattice: {
    id: 'sand_kauai_refraction_lattice',
    title: 'Island Wave Shadows & Diamond Ripples',
    mentor: 'Swell Master Pohaku',
    islandId: 'kauai',
    narration:
      'Cliffs bounce swells back as white-tipped pyramids. Behind an island sits a flat Calm Wave Shadow, and farther leeward the bending swells cross into a diamond lattice.',
    primitives: [
      { type: 'pebble', at: [0.0, 0.15], label: 'Unseen Island' },
      { type: 'refraction_diamond_grooves', at: [0.0, -0.35], label: 'Leeward Diamond Lattice' },
      { type: 'calm_zone', at: [0.0, -0.08], label: 'Calm Wave Shadow' },
      { type: 'pyramid_peaks', at: [0.0, 0.45], label: 'Reflected Cliffs' },
    ],
  },
  sand_oahu_return_swell: {
    id: 'sand_oahu_return_swell',
    title: 'Holding the Return Ridge',
    mentor: 'Elder Manu',
    islandId: 'oahu',
    narration:
      "Keep the deep ocean swell striking your starboard cheek every four beats through the mist until Kaua'i's black crag breaks above the fog.",
    primitives: [
      { type: 'parallel_swell_ridges', angleRad: 0.0 },
      { type: 'canoe_mark', at: [0.0, 0.0], angleRad: -0.785, label: 'Starboard Cheek' },
    ],
  },
  sand_kiritimati_grand_voyage_prep: {
    id: 'sand_kiritimati_grand_voyage_prep',
    title: "The Four Legs to Ancestral Hawai'i",
    mentor: 'Keeper Akura',
    islandId: 'kiritimati',
    narration:
      'Unite every art: morning sun-shadow along your center deck, port-cheek swell through afternoon mist, the Rising Path of the Shark with the Steadfast Peg shining off your port beam, and cliff-reflected pyramid waves at misty dawn.',
    primitives: [{ type: 'shell_ring_12', radius: 0.78, highlightBand: 'band_4' }],
  },
});
