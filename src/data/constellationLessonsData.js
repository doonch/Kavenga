/**
 * Declarative Elder-Guided Constellation Introduction Scripts for Kavenga: Songs of the Star Path.
 *
 * Implements the 11-step progressive constellation curriculum across Acts I-III:
 *  0. Ra'iatea (Start)          -> 0 constellations known (Song 1 uses daytime sun & cloud)
 *  1. Taha'a (Hina)             -> The Sea Turtle (`the_sea_turtle`)
 *  2. Huahine (Ari'i)           -> The Bull (`the_bull`)
 *  3. Mo'orea (Vaihere)         -> The Rat (`the_rat`)
 *  4. Ra'iatea Return (Metua)   -> The Boar (`the_boar`) [available once returning from Mo'orea / with Kura feathers]
 *  5. Maupiti (Master Tera'i)   -> The Crab (`the_crab`)
 *  6. Nuku Hiva (Master Teiki)  -> The Horse (`the_horse`, 4 grazing stars)
 *  7. Ua Pou (Vaea)             -> The Frigatebird (`the_frigatebird`)
 *  8. Rangiroa (Tane)           -> The Gecko (`the_gecko`)
 *  9. Hiva Oa (Tahia)           -> The Shark (`the_shark`)
 * 10. Fatu Hiva (Oihanu)        -> The Whale (`the_whale`)
 * 11. Kiritimati (Keeper Akura) -> The Steadfast Peg (`steadfast_peg` — Polar Anchor)
 *
 * Strictly Zero-Compass & Zero-Degrees in all player-facing copy.
 */

export const CONSTELLATION_LESSONS_ORDER = Object.freeze([
  'lesson_sea_turtle',
  'lesson_the_bull',
  'lesson_the_rat',
  'lesson_the_boar',
  'lesson_the_crab',
  'lesson_the_horse',
  'lesson_the_frigatebird',
  'lesson_the_gecko',
  'lesson_the_shark',
  'lesson_the_whale',
  'lesson_steadfast_peg',
]);

export const CONSTELLATION_LESSONS = Object.freeze({
  // 1. TAHA'A — Hina introduces The Sea Turtle (Flagship 5-Beat Guided Vigil)
  lesson_sea_turtle: {
    id: 'lesson_sea_turtle',
    unlockKey: 'the_sea_turtle',
    constellationId: 'the_sea_turtle',
    title: 'The Sea Turtle',
    islandId: 'tahaa',
    elderName: 'Hina',
    elderRole: 'Fisher-Navigator & Sennit Artisan',
    portrait: './assets/mentors/hina.webp',
    // LST = 20 deg -> Shell Crown sits directly upright above the two horizontal flippers!
    solarRaDeg: 230.0,
    solarHour: 22.0,
    startHouseId: 'house_south_turtle_pivot',
    focusStarIds: ['shell_crown', 'turtle_flipper_east', 'turtle_flipper_west'],
    panTarget: { altDeg: 18.5, azDeg: 180.0 },
    hasSilhouette: true,
    beats: [
      {
        kind: 'stone',
        heading: "The Pivot Stone of Taha'a",
        speech:
          "Stand beside me in the quiet stone circle, young wayfinder. Before now, the night sky has been a sea of unnamed sparks—yet our ancestors wove pathways through them. Face this twin-horned stone, the House of the Sea Turtle's Pivot, and look up.",
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Three Bright Stars Above the Surf',
        speech:
          'See those three bright stars gleaming above the stone? Together they form the Sea Turtle.',
        buttonLabel: 'See the Sea Turtle →',
      },
      {
        kind: 'silhouette',
        heading: 'Shape of the Swimming Honu',
        speech:
          'Picture the great turtle gliding across the dark vault—his rounded carapace in the center and his two wide front paddles sweeping outward through the stars.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Naming the Three Stars',
        speech:
          "At the front crest of his shell shines golden Shell Crown, and out along his swept blades gleam Turtle's Left Flipper and Turtle's Right Flipper.",
        buttonLabel: 'Watch the Sky Turn →',
      },
      {
        kind: 'spin',
        heading: 'The Unsetting Pivot of the Night',
        speech:
          'The Sea Turtle is special because he always stays above the horizon, never drowning beneath the waves, while all other stars wheel around him! Watch as we set the night dome in motion.',
        buttonLabel: '✦ Keep the Sea Turtle in Memory',
      },
    ],
  },

  // 2. HUAHINE — Elder Ari'i introduces The Bull (Needed for Song 3)
  lesson_the_bull: {
    id: 'lesson_the_bull',
    unlockKey: 'the_bull',
    constellationId: 'the_bull',
    title: 'The Bull',
    islandId: 'huahine',
    elderName: "Elder Ari'i",
    elderRole: 'Night-Sky Elder & Sail-Weaver',
    portrait: './assets/mentors/arii.webp',
    // LST = 56 deg -> Setting Bull sits clearly in the Three-Hands window (~34 deg alt -> descending toward 270)
    solarRaDeg: 266.0,
    solarHour: 22.0,
    startHouseId: 'house_band3_setting',
    focusStarIds: ['bulls_horn', 'bulls_shoulder', 'bulls_hoof'],
    panTarget: { starId: 'bulls_shoulder', minAltDeg: 20.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'The Setting Path of the Bull',
        speech:
          'Tonight you sail beyond daytime clouds into open darkness toward Manuae. Face this carved cairn—the Setting Path of the Bull, where the sun itself sinks at dusk—and look up.',
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'A Mighty Foreleg in the Dusk Sky',
        speech:
          'See those three warm amber stars slanting down toward the sea foam? Together they form the charging foreleg and horn of the Bull.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: "Horn, Shoulder, and Hoof",
        speech:
          "Fierce amber Bull's Horn leads the sun's own path, anchored through Bull's Shoulder down to bright Bull's Hoof along the deeper track.",
        buttonLabel: 'Watch His Descent →',
      },
      {
        kind: 'spin',
        heading: 'Following a Setting Star',
        speech:
          "Unlike the Sea Turtle, the Bull marches across the dome and plunges into his Setting Stone. Watch the sky turn: hold Setting Bull's Horn between your twin prows tonight until dawn paints Manuae's cloud jade!",
        buttonLabel: '✦ Keep the Bull in Memory',
      },
    ],
  },

  // 3. MO'OREA — Vaihere introduces The Rat (Needed for Song 5 & Song 6)
  lesson_the_rat: {
    id: 'lesson_the_rat',
    unlockKey: 'the_rat',
    constellationId: 'the_rat',
    title: 'The Rat',
    islandId: 'moorea',
    elderName: 'Vaihere',
    elderRole: 'Master Canoe-Wright Navigator',
    portrait: './assets/mentors/vaihere.webp',
    // LST = 330 deg -> Bull's Horn has climbed ~31 deg while Rat's Nose rises right beneath it (~18 deg)!
    solarRaDeg: 180.0,
    solarHour: 22.0,
    startHouseId: 'house_band3_rising',
    focusStarIds: ['rats_nose', 'rats_ear', 'rats_tail'],
    panTarget: { starId: 'rats_ear', minAltDeg: 16.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'Where Followers Climb the Same Track',
        speech:
          "A single rising star cannot guide your prows all night—once it climbs higher than three open hands, its path curves overhead. Face the Rising Path of the Bull stone and look up beneath the climbing Bull.",
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'The Swift Follower on the Sun-Path',
        speech:
          'See those three nimble pale-gold stars rising right in the footsteps of the Bull? Together they form the Rat.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: "Nose, Ear, and Tail",
        speech:
          "Bright Rat's Nose climbs out of the exact same stone house as Bull's Horn, curving back through Rat's Ear to Rat's Tail along the Bull's Hoof track.",
        buttonLabel: 'Watch the Star Handoff →',
      },
      {
        kind: 'spin',
        heading: 'Handing Off the Night Watch',
        speech:
          "Watch the dome wheel: as Bull's Horn climbs too steep above the water, Rat's Nose steps cleanly into the low steering window right beneath him!",
        buttonLabel: '✦ Keep the Rat in Memory',
      },
    ],
  },

  // 4. RA'IATEA RETURN — Elder Metua introduces The Boar (Available upon returning from Mo'orea / with Kura feathers)
  lesson_the_boar: {
    id: 'lesson_the_boar',
    unlockKey: 'the_boar',
    constellationId: 'the_boar',
    title: 'The Boar',
    islandId: 'raiatea',
    requiresReturnVisit: true,
    elderName: 'Elder Metua',
    elderRole: 'Village Navigator & Marae Elder',
    portrait: './assets/mentors/elder_metua.webp',
    // LST = 65 deg -> Boar's Bristle (+14 deg), Boar's Spine (+29 deg), and Boar's Tusk (+44 deg) all shine clearly!
    solarRaDeg: 275.0,
    solarHour: 22.0,
    startHouseId: 'house_band2_rising',
    focusStarIds: ['boars_tusk', 'boars_spine', 'boars_bristle'],
    panTarget: { starId: 'boars_spine', minAltDeg: 22.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'The Rising Path of the Boar',
        speech:
          'You left Taputapuatea steering only by morning clouds, and now you return a true lagoon wayfinder. Before you face the outer pass, turn to the Rising Path of the Boar stone and look up.',
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'The Ridged Back of the Wild Boar',
        speech:
          'See that bold three-star ridge climbing slantwise out of the sea spray? Together those stars form the Boar.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Tusk, Spine, and Bristle',
        speech:
          "Warm orange Boar's Tusk leads his charge, rising up his arched Boar's Spine to Boar's Bristle along the lower crest.",
        buttonLabel: 'Watch His Arc →',
      },
      {
        kind: 'spin',
        heading: 'A Beacon for Deep Blue Crossings',
        speech:
          "Watch how the Boar arches low across the sky from his Rising Stone to his Setting Stone—soon you will ride Boar's Tusk across empty ocean where all islands vanish!",
        buttonLabel: '✦ Keep the Boar in Memory',
      },
    ],
  },

  // 5. MAUPITI — First Master Tera'i introduces The Crab (Needed for Song 7)
  lesson_the_crab: {
    id: 'lesson_the_crab',
    unlockKey: 'the_crab',
    constellationId: 'the_crab',
    title: 'The Crab',
    islandId: 'maupiti',
    elderName: "First Master Tera'i",
    elderRole: 'First Master of the Star Ring',
    portrait: './assets/mentors/master_terai.webp',
    // LST = 95 deg -> Crab's Right Claw (+11 deg), Carapace (+36 deg), Left Claw (+41 deg), and Eye (+50 deg) all shine clearly!
    solarRaDeg: 305.0,
    solarHour: 22.0,
    startHouseId: 'house_band2_rising',
    focusStarIds: ['crabs_left_claw', 'crabs_shell', 'crabs_right_claw', 'crabs_eye'],
    panTarget: { starId: 'crabs_shell', minAltDeg: 26.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: "Tera'i's Outer-Pass Companion",
        speech:
          "Beyond Maupiti's foaming pass lies the great open crossing to Nuku Hiva—too wide for the Boar alone to carry you through the night. Face the Rising Path of the Boar stone once more and look up.",
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Two Wide Claws Behind the Boar',
        speech:
          'See those four cool silver-blue stars branching like twin pincers from a central shell? Together they form the Crab.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Claws, Carapace, and Eye',
        speech:
          "Pale Crab's Left Claw rises in the exact track of Boar's Tusk, joined through Crab's Carapace to Crab's Right Claw and bright Crab's Eye.",
        buttonLabel: 'Watch the Relay →',
      },
      {
        kind: 'spin',
        heading: 'Relaying Across the Empty Blue',
        speech:
          "Watch the night wheel turn: when Boar's Tusk climbs three hands high on Song 7, drop your gaze straight back down to Rising Crab's Left Claw to hold your course true till dawn!",
        buttonLabel: '✦ Keep the Crab in Memory',
      },
    ],
  },

  // 6. NUKU HIVA — Master Teiki introduces The Horse (4 Southern-visible grazing stars; needed for Song 8 & 9)
  lesson_the_horse: {
    id: 'lesson_the_horse',
    unlockKey: 'the_horse',
    constellationId: 'the_horse',
    title: 'The Horse',
    islandId: 'nuku_hiva',
    elderName: 'Master Teiki',
    elderRole: 'Valley Master Navigator',
    portrait: './assets/mentors/master_teiki.webp',
    // At Nuku Hiva (lat -8.9 deg), LST = 18 deg puts Horse's Crown (RA 18, Dec +70) at upper culmination: alt = 90 - 8.9 - 20? Wait: sinAlt = sin(-8.9)*sin(70) + cos(-8.9)*cos(70)*1 = -0.145 + 0.338 = +0.193 -> +11.1 deg right above House of the Grazing Horse!
    solarRaDeg: 228.0,
    solarHour: 22.0,
    startHouseId: 'house_north_horse_pivot',
    focusStarIds: ['horses_crown', 'horses_mane', 'horses_heart', 'horses_tail'],
    panTarget: { starId: 'horses_mane', minAltDeg: 14.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'The House of the Grazing Horse',
        speech:
          'Welcome to our steep cliff valleys! Turn your back to the Sea Turtle and face the opposite notched monolith—the House of the Grazing Horse—then look just above the dark waves.',
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Skimming the Sea Foam',
        speech:
          'See those four warm golden stars arching low across the water like a steed lowering its head to drink? Together they form the Horse.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Crown, Mane, Heart, and Tail',
        speech:
          "Low-skimming Horse's Crown glides just above the surf beneath Horse's Mane, stretching back to Horse's Heart and trailing Horse's Tail.",
        buttonLabel: 'Watch Him Graze →',
      },
      {
        kind: 'spin',
        heading: 'Opposite the Sea Turtle',
        speech:
          "Watch the night turn: in these waters Horse's Crown skims low across that notched stone while the Sea Turtle spins directly behind your stern—a twin-horizon lock for your midnight run to Ua Pou!",
        buttonLabel: '✦ Keep the Horse in Memory',
      },
    ],
  },

  // 7. UA POU — Vaea introduces The Frigatebird (Prepares Song 11 diving pointer)
  lesson_the_frigatebird: {
    id: 'lesson_the_frigatebird',
    unlockKey: 'the_frigatebird',
    constellationId: 'the_frigatebird',
    title: 'The Frigatebird',
    islandId: 'ua_pou',
    elderName: 'Vaea',
    elderRole: 'Wind-Watcher & Bone-Carver',
    portrait: './assets/mentors/vaea.webp',
    // LST = 145 deg -> Frigatebird's Tail (RA 145, Dec -64) & Beak (RA 145, Dec -74) stand vertically straight above the Sea Turtle!
    solarRaDeg: 355.0,
    solarHour: 22.0,
    startHouseId: 'house_south_turtle_pivot',
    focusStarIds: ['birds_wingtip', 'frigatebirds_tail', 'frigatebirds_beak'],
    panTarget: { starId: 'frigatebirds_tail', minAltDeg: 22.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'High Above the Sea Turtle',
        speech:
          "When haze or swell foam hides low horizon stars, a wind-watcher reads the diving pointer high overhead. Face the House of the Sea Turtle's Pivot once more and lift your gaze higher.",
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Wings Folded in a Stoop',
        speech:
          'See those three pale violet-white stars angled steeply downward toward the Sea Turtle? Together they form the Frigatebird.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Wingtip, Tail, and Diving Beak',
        speech:
          "Outspread Bird's Wingtip sweeps back to Frigatebird's Tail, aiming straight through bright Frigatebird's Beak toward the Sea Turtle's unmoving Pivot.",
        buttonLabel: 'Watch His Wheel →',
      },
      {
        kind: 'spin',
        heading: 'A Sky Pointer to the Pivot',
        speech:
          "Watch the stars wheel: wherever the Frigatebird swings around the dome, the line from his Tail through his Beak always spears straight at the Sea Turtle's Pivot!",
        buttonLabel: '✦ Keep the Frigatebird in Memory',
      },
    ],
  },

  // 8. RANGIROA — Tane introduces The Gecko (Needed for Song 10 stern backsight & Song 11 zenith)
  lesson_the_gecko: {
    id: 'lesson_the_gecko',
    unlockKey: 'the_gecko',
    constellationId: 'the_gecko',
    title: 'The Gecko',
    islandId: 'rangiroa',
    elderName: 'Tane',
    elderRole: 'Atoll Navigator & Pearl-Diver',
    portrait: './assets/mentors/tane.webp',
    // LST = 18 deg -> Setting Gecko's Tongue (RA 322, Dec +29.3, HA = +56 deg) descends cleanly toward Setting Path of the Boar (~32 deg alt)!
    solarRaDeg: 228.0,
    solarHour: 22.0,
    startHouseId: 'house_band2_setting',
    focusStarIds: ['geckos_tongue', 'geckos_crest', 'geckos_heart', 'geckos_tail'],
    panTarget: { starId: 'geckos_crest', minAltDeg: 26.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'Backsighting Against Squall Curtains',
        speech:
          'Heavy rain-squalls often curtain your forward prows on the reach to Hiva Oa, leaving only the sky behind your wake clear. Face the Setting Path of the Boar stone and look up.',
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Clinging High Across the Vault',
        speech:
          'See that sinuous four-star trail of pale sea-green light curving from high overhead down toward the water? Together those stars form the Gecko.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Tongue, Back, Overhead Heart, and Tail',
        speech:
          "Gecko's Tongue leads toward the setting waves, joined along Gecko's Back to Gecko's Heart—which climbs straight over a masthead—and trailing Gecko's Tail.",
        buttonLabel: 'Watch Him Climb & Set →',
      },
      {
        kind: 'spin',
        heading: 'Stern Guide and Mast-Top Trigger',
        speech:
          "Watch the dome turn: tonight you will hold Setting Gecko's Tongue centered behind your stern sweep when squalls blind your bow, and soon Gecko's Heart overhead will tell you the exact moment to turn at sea!",
        buttonLabel: '✦ Keep the Gecko in Memory',
      },
    ],
  },

  // 9. HIVA OA — Tahia introduces The Shark (Needed for Song 11 dogleg turn & Song 12)
  lesson_the_shark: {
    id: 'lesson_the_shark',
    unlockKey: 'the_shark',
    constellationId: 'the_shark',
    title: 'The Shark',
    islandId: 'hiva_oa',
    elderName: 'Tahia',
    elderRole: 'Zenith Watcher & Quarry Elder',
    portrait: './assets/mentors/tahia.webp',
    // LST = 25 deg -> Shark's Jaw (RA 80, Dec 0), Fin (RA 80, Dec -29.3), Tail (RA 80, Dec -57.9) all rising at HA = -55 deg (~32 deg alt)!
    solarRaDeg: 235.0,
    solarHour: 22.0,
    startHouseId: 'house_band4_rising',
    focusStarIds: ['sharks_jaw', 'sharks_fin', 'sharks_tail'],
    panTarget: { starId: 'sharks_fin', minAltDeg: 22.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'The Rising Path of the Shark',
        speech:
          "Once Gecko's Heart passes straight above your masthead on the voyage to Fatu Hiva, you must swing your twin prows onto a fierce ocean hunter. Face the Rising Path of the Shark stone and look up.",
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Dorsal Fin Cutting the Night',
        speech:
          'See those three cool steel-blue stars slicing upward across three neighboring star tracks? Together they form the Shark.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Jaw, Dorsal Fin, and Tail',
        speech:
          "Sharp Shark's Jaw rides the middle sun-track, brilliant Shark's Fin gleams in the middle, and Shark's Tail sweeps along the deep whale-track.",
        buttonLabel: 'Watch Him Patrol →',
      },
      {
        kind: 'spin',
        heading: 'Turning Onto the Rising Shark',
        speech:
          "Watch the night turn: all three stars of the Shark rise in unison like a reef-runner's fin—ready to catch your prows the moment the overhead Gecko signals your turn!",
        buttonLabel: '✦ Keep the Shark in Memory',
      },
    ],
  },

  // 10. FATU HIVA — Oihanu introduces The Whale (Needed for Song 12)
  lesson_the_whale: {
    id: 'lesson_the_whale',
    unlockKey: 'the_whale',
    constellationId: 'the_whale',
    title: 'The Whale',
    islandId: 'fatu_hiva',
    elderName: 'Oihanu',
    elderRole: 'Master Vaka Moana Shipwright',
    portrait: './assets/mentors/oihanu.webp',
    // LST = 325 deg -> Whale's Spout (RA 0, Dec -57.9) & Fluke (RA 40, Dec -57.9) rising cleanly (~22-35 deg alt) above Rising Path of the Whale!
    solarRaDeg: 175.0,
    solarHour: 22.0,
    startHouseId: 'house_band5_rising',
    focusStarIds: ['whales_spout', 'whales_brow', 'whales_fluke'],
    panTarget: { starId: 'whales_brow', minAltDeg: 20.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'The Deep Track of the Whale',
        speech:
          'Your twin-masted Vaka Moana is ready for the deep ocean swells toward Mangareva. Face the Rising Path of the Whale stone—closest neighbor to the Sea Turtle—and look up.',
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'Breaching Near the Pivot Waters',
        speech:
          'See that broad mist-blue arch of three stars lifting out of the heavy rollers? Together they form the Great Whale.',
        buttonLabel: 'Name His Stars →',
      },
      {
        kind: 'labels',
        heading: 'Spout, Brow, and Broad Fluke',
        speech:
          "Bright Whale's Spout breaks the surface first, arching across Whale's Brow to wide Whale's Fluke right ahead of Shark's Tail.",
        buttonLabel: 'Watch His Breach →',
      },
      {
        kind: 'spin',
        heading: 'Completing the Ten Sky Animals',
        speech:
          "Watch the night wheel: Whale's Spout hands the watch cleanly to Whale's Fluke and Shark's Tail—and with the Whale, you now know all ten animal constellations of our ancestral sea!",
        buttonLabel: '✦ Keep the Whale in Memory',
      },
    ],
  },

  // 11. KIRITIMATI (Act III) — Keeper Akura introduces The Steadfast Peg (Polar Star equivalent for Song 16!)
  lesson_steadfast_peg: {
    id: 'lesson_steadfast_peg',
    unlockKey: 'steadfast_peg',
    constellationId: 'the_horse',
    title: 'The Steadfast Peg',
    islandId: 'kiritimati',
    elderName: 'Keeper Akura',
    elderRole: 'Star-Mirror Master & Shrine Keeper',
    portrait: './assets/mentors/keeper_akura.webp',
    // At Kiritimati (+21.2 deg lat), LST = 25 deg puts Horse's Crown (+70 deg dec) high at +41 deg directly above Steadfast Peg (+89.2 deg dec) at +22.0 deg!
    solarRaDeg: 235.0,
    solarHour: 22.0,
    startHouseId: 'house_north_horse_pivot',
    focusStarIds: ['steadfast_peg'],
    panTarget: { starId: 'steadfast_peg', minAltDeg: 20.0 },
    hasSilhouette: false,
    beats: [
      {
        kind: 'stone',
        heading: 'Across the Curve of the Great Ocean',
        speech:
          'Look behind you first if you wish, traveler: in these distant islands, the Sea Turtle has sunk completely beneath the curve of the sea! Now face the House of the Grazing Horse stone and look up.',
        buttonLabel: 'Look Up →',
      },
      {
        kind: 'lines',
        heading: 'The Tether of the Grazing Horse',
        speech:
          "See that solitary golden-white star standing two hands above the notched stone, tethered directly to Horse's Crown? In our islands, the Horse never drowns—he circles a single peg driven into the sky.",
        buttonLabel: 'Name the Polar Star →',
      },
      {
        kind: 'labels',
        heading: 'The Steadfast Peg',
        speech:
          'This star is the Steadfast Peg—our unmoving sky-nail! Hold it off your left beam on the Grand Voyage to ancestral Hawaiʻi so you never drift past the volcanic peaks.',
        buttonLabel: 'Watch the Sky Wheel →',
      },
      {
        kind: 'spin',
        heading: 'Unmoving Anchor of the Mist Seas',
        speech:
          'Watch as we turn the night dome: every constellation wheels in a great circle while the Steadfast Peg stands motionless above its stone from dusk until dawn!',
        buttonLabel: '✦ Keep the Steadfast Peg in Memory',
      },
    ],
  },
});

/**
 * Returns the constellation lesson taught on a given island if its story prerequisite is met
 * (e.g., Elder Metua's Boar lesson on Ra'iatea only unlocks on your return after Mo'orea / Kura feathers,
 * keeping the opening of the game at 0 constellations for Song 1!).
 */
export function getAvailableConstellationLessonForIsland(gameState, islandId) {
  if (!islandId) return null;
  for (const id of CONSTELLATION_LESSONS_ORDER) {
    const lesson = CONSTELLATION_LESSONS[id];
    if (lesson.islandId !== islandId) continue;
    if (lesson.requiresReturnVisit) {
      const hasReturned =
        Boolean(gameState?.completedQuests?.raiatea_consecration) ||
        Boolean(gameState?.hasCargoItem?.('red_kura_feathers')) ||
        Boolean(gameState?.discoveredIslands?.moorea);
      if (!hasReturned) return null;
    }
    return lesson;
  }
  return null;
}

/**
 * Returns the available constellation lesson on `islandId` ONLY if the player has NOT yet
 * completed that guided Sky Vigil (`!gameState.hasLearnedConstellation(lesson.unlockKey)`).
 */
export function getAvailableUnlearnedLessonForIsland(gameState, islandId) {
  const lesson = getAvailableConstellationLessonForIsland(gameState, islandId);
  if (!lesson) return null;
  if (gameState?.hasLearnedConstellation?.(lesson.unlockKey)) return null;
  return lesson;
}

/**
 * Looks up the Guided Sky Vigil lesson associated with a constellation ID or unlockKey.
 */
export function getLessonByUnlockKey(unlockKey) {
  for (const id of CONSTELLATION_LESSONS_ORDER) {
    const lesson = CONSTELLATION_LESSONS[id];
    if (lesson.unlockKey === unlockKey || lesson.id === unlockKey) {
      return lesson;
    }
  }
  return null;
}
