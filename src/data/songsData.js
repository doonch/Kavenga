/**
 * Complete catalog of all 17 authored route chants (Songs 1-16 + Song 14R Return Trial)
 * plus dynamic return-chant builder for revisiting discovered islands.
 * Strictly cue-relative language: zero cardinal letters (N/S/E/W) and zero degree numbers.
 */

import { DepartureWindow, posMod, radToDeg, wrapDeg180 } from '../core/gameConstants.js';
import { HORIZON_HOUSES } from './constellationsData.js';
import { ISLANDS } from './islandsData.js';

export const SONGS = Object.freeze({
  // =========================================================================
  // ACT I: THE RA'IATEA LAGOON CHAIN (Songs 1 - 6)
  // =========================================================================
  song_01: {
    id: 'song_01',
    number: '1',
    title: "The Still Cloud of Taha'a",
    fromIsland: 'raiatea',
    toIsland: 'tahaa',
    act: 1,
    sandRecallId: 'sand_raiatea_clouds',
    recommendedDeparture: DepartureWindow.DAWN,
    expectedDurationMin: 4.0,
    gameHoursPerRealMin: 0.9,
    solarRaDeg: 180.0,
    bpm: 58.0,
    windFromAz: 95.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 260.0,
        weather: 'clear',
        lyrics:
          "Leave Ra'iatea's bay with the rising sun warm upon your right cheek / Watch the white wind-clouds march while one tall cloud stands still / Follow the green palm-fronds floating down from Taha'a's shore.",
        easyCueText:
          'Look right in Free-Look to place the rising sun off your starboard beam; center your twin prows on the single motionless tall cloud on the horizon, then steer along the floating green fronds.',
        cueLabel: "the motionless tall cloud of Taha'a with the rising sun upon your right cheek",
        guidance: { mode: 'island_beacon', fallbackHeadingDeg: 0.0 },
      },
    ],
  },

  song_02: {
    id: 'song_02',
    number: '2',
    title: 'Beaks of the Morning Fisher',
    fromIsland: 'tahaa',
    toIsland: 'huahine',
    act: 1,
    sandRecallId: 'sand_tahaa_birds_and_shadow',
    recommendedDeparture: DepartureWindow.DAWN,
    expectedDurationMin: 5.0,
    gameHoursPerRealMin: 1.0,
    solarRaDeg: 180.0,
    bpm: 60.0,
    windFromAz: 100.0,
    primarySwellFromAz: 135.0,
    spawnsMiddayFishSchool: true,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 120.0,
        weather: 'clear',
        lyrics:
          'Launch into the pale dawn where the white terns fly out to hunt / Point your twin prows straight into their beaks against their morning flight.',
        easyCueText: 'Spot straight-flying white terns at dawn and steer directly opposite their flight path.',
        cueLabel: "the morning white terns' beaks",
        guidance: { mode: 'heading', targetHeadingDeg: 13.8 },
      },
      {
        verseNumber: 2,
        endRealSec: 320.0,
        weather: 'clear',
        lyrics:
          "When the sun climbs above your sail, keep the post's dark shadow upon the second left lashing / Pass through the silver leaping fish until twin peaks break the sea.",
        easyCueText:
          'Hold heading by keeping the deck post shadow on the second port crossbeam notch past the leaping fish.',
        cueLabel: 'the post shadow upon the second left lashing',
        guidance: { mode: 'sun_shadow', targetLashingZone: 'left_mid', targetHeadingDeg: 13.8 },
      },
    ],
  },

  song_03: {
    id: 'song_03',
    number: '3',
    title: 'The Jade Belly of Manuae',
    fromIsland: 'huahine',
    toIsland: 'manuae',
    act: 1,
    sandRecallId: 'sand_huahine_lapa_and_bull',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 6.5,
    gameHoursPerRealMin: 1.9,
    solarRaDeg: 285.0,
    bpm: 56.0,
    windFromAz: 95.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 75.0,
        weather: 'clear',
        lyrics: "Set Huahine's twin peaks straight behind your steering sweep and chase the sinking sun across the golden foam.",
        easyCueText:
          "Steer toward the setting sun (check Free-Look astern to keep Huahine's twin peaks centered behind your stern).",
        cueLabel: "the sinking sun with Huahine's twin peaks astern",
        guidance: { mode: 'sun_direct', targetHeadingDeg: 270.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 410.0,
        weather: 'clear',
        lyrics:
          "Center the amber Setting Bull's Horn descending between your prows / When grey dawn softens the sky, steer beneath the flat cloud painted green on its belly.",
        easyCueText:
          "At night, center the Setting Bull's Horn between your twin prows; at dawn, steer toward the low cloud glowing pale turquoise underneath.",
        cueLabel: "the Setting Bull's Horn and the jade-bellied lagoon cloud",
        guidance: { mode: 'star_relay_setting', stars: ['bulls_horn', 'rats_nose'], fallbackHeadingDeg: 270.0 },
      },
    ],
  },

  song_04: {
    id: 'song_04',
    number: '4',
    title: "Homeward Wings to Mo'orea",
    fromIsland: 'manuae',
    toIsland: 'moorea',
    act: 1,
    sandRecallId: 'sand_tahaa_birds_and_shadow',
    recommendedDeparture: DepartureWindow.MIDDAY,
    expectedDurationMin: 7.0,
    gameHoursPerRealMin: 0.9,
    solarRaDeg: 290.0,
    bpm: 60.0,
    windFromAz: 90.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 220.0,
        weather: 'clear',
        lyrics:
          'Put the green ring of Manuae behind your wake / Hold the afternoon post shadow steady across the left outer lashing while trade clouds march across your bow.',
        easyCueText:
          'Keep the deck post shadow aligned with the outer port (left) lashing as afternoon sun shines from starboard.',
        cueLabel: 'the afternoon post shadow across the left outer lashing',
        guidance: { mode: 'sun_shadow', targetLashingZone: 'left_outer', targetHeadingDeg: 184.9 },
      },
      {
        verseNumber: 2,
        endRealSec: 460.0,
        weather: 'clear',
        lyrics:
          "When the sun sinks golden off your right beam, follow the white tern's tail feathers homeward / Aim where the jagged spire-cloud stands unmoving against the twilight sea.",
        easyCueText:
          'Near sunset, follow straight-flying white terns in the same direction they fly toward the motionless tall spire cloud.',
        cueLabel: "the homeward white terns and Mo'orea's motionless spire-cloud",
        guidance: { mode: 'island_beacon', fallbackHeadingDeg: 184.9 },
      },
    ],
  },

  song_05: {
    id: 'song_05',
    number: '5',
    title: 'Return to Taputapuatea',
    fromIsland: 'moorea',
    toIsland: 'raiatea',
    act: 1,
    sandRecallId: 'sand_moorea_two_star_handoff',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 6.0,
    gameHoursPerRealMin: 1.1,
    solarRaDeg: 178.0,
    bpm: 58.0,
    windFromAz: 95.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 135.0,
        weather: 'clear',
        lyrics: "Leave Mo'orea's spire astern as darkness falls / Place the Rising Bull's Horn squarely between your twin prows.",
        easyCueText: "Center the Rising Bull's Horn between your twin prows.",
        cueLabel: "the Rising Bull's Horn",
        guidance: { mode: 'star_relay_rising', stars: ['bulls_horn'], fallbackHeadingDeg: 90.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 400.0,
        weather: 'clear',
        lyrics:
          "When the Bull's Horn climbs three hands above the dark sea, drop your eyes to the Rising Rat's Nose / Hold him true until sacred Ra'iatea lifts against the morning light.",
        easyCueText:
          "Once Bull's Horn climbs high near the top of your view, switch to the Rising Rat's Nose right beneath it on the horizon.",
        cueLabel: "the Rising Rat's Nose beneath the climbing Bull's Horn",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['rats_nose'],
          useRing2BeaconOnApproach: true,
          fallbackHeadingDeg: 90.0,
        },
      },
    ],
  },

  song_06: {
    id: 'song_06',
    number: '6',
    title: 'The Outer Pass of Maupiti',
    fromIsland: 'raiatea',
    toIsland: 'maupiti',
    act: 1,
    sandRecallId: 'sand_raiatea_leeway',
    recommendedDeparture: DepartureWindow.MIDNIGHT,
    expectedDurationMin: 8.5,
    gameHoursPerRealMin: 0.95,
    solarRaDeg: 242.0,
    bpm: 60.0,
    windFromAz: 150.0,
    primarySwellFromAz: 135.0,
    strongCrosswind: true,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 180.0,
        weather: 'clear',
        lyrics:
          "Steer for the Setting Bull's Hoof descending toward the dark foam / Glance back at your white wake—lean half a prow into the wind so your trail runs straight.",
        easyCueText:
          "Aim toward the Setting Bull's Hoof (aim half a prow into the crosswind so your stern wake trails straight).",
        cueLabel: "the Setting Bull's Hoof while compensating your foamy wake",
        guidance: {
          mode: 'star_relay_setting',
          stars: ['bulls_hoof'],
          compensateLeeway: true,
          fallbackHeadingDeg: 240.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 360.0,
        weather: 'clear',
        lyrics: "Before the Bull's Hoof drowns beneath the sea, let the Setting Rat's Tail take the watch above him.",
        easyCueText: "Just before Bull's Hoof sets into the water, track the Setting Rat's Tail descending above it.",
        cueLabel: "the Setting Rat's Tail",
        guidance: {
          mode: 'star_relay_setting',
          stars: ['rats_tail'],
          compensateLeeway: true,
          fallbackHeadingDeg: 240.0,
        },
      },
      {
        verseNumber: 3,
        endRealSec: 530.0,
        weather: 'clear',
        lyrics:
          "At first light, steer against the brown boobies flying outward / Thread the foaming reef-pass where Maupiti's fortress rock stands.",
        easyCueText: 'At dawn, steer opposite outward-flying boobies to reach Maupiti.',
        cueLabel: 'the outward-flying dawn boobies of Maupiti',
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 240.0 },
      },
    ],
  },

  // =========================================================================
  // ACT II: THE NUKU HIVA WINDWARD CHAIN (Songs 7 - 12)
  // =========================================================================
  song_07: {
    id: 'song_07',
    number: '7',
    title: 'Across the Empty Blue to Nuku Hiva',
    fromIsland: 'maupiti',
    toIsland: 'nuku_hiva',
    act: 2,
    sandRecallId: 'sand_maupiti_12_shell_compass',
    isInterBasinCrossing: true,
    crossingVector: { x: 9.09, y: 5.25 },
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 10.5,
    gameHoursPerRealMin: 1.15,
    solarRaDeg: 256.0,
    bpm: 60.0,
    windFromAz: 115.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 165.0,
        weather: 'clear',
        lyrics: "Watch Maupiti vanish in your wake as darkness claims the sea / Place the Rising Boar's Tusk squarely between your twin prows.",
        easyCueText: "Center the Rising Boar's Tusk between your twin prows.",
        cueLabel: "the Rising Boar's Tusk",
        guidance: { mode: 'star_relay_rising', stars: ['boars_tusk'], compensateLeeway: true, fallbackHeadingDeg: 60.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 440.0,
        weather: 'clear',
        lyrics:
          "When the Boar's Tusk climbs three hands high, hand the watch to the Rising Crab's Left Claw / Hold that pale claw steady between your prows across the deep night sea.",
        easyCueText:
          "Once Boar's Tusk climbs past three hands high, relay down the same horizon house to Rising Crab's Left Claw.",
        cueLabel: "the Rising Crab's Left Claw beneath Boar's Tusk",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['crabs_left_claw'],
          useRing2BeaconOnApproach: true,
          compensateLeeway: true,
          fallbackHeadingDeg: 60.0,
        },
      },
      {
        verseNumber: 3,
        endRealSec: 660.0,
        weather: 'clear',
        lyrics:
          "When dawn washes out the Crab, lock your post shadow upon the first left lashing / Hold steady until Nuku Hiva's great cloud-crown pierces the empty sea.",
        easyCueText: 'After sunrise, hold the post shadow on the first port lashing toward the tall stationary peak cloud.',
        cueLabel: 'the morning post shadow upon the first left lashing',
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 60.0 },
      },
    ],
  },

  song_08: {
    id: 'song_08',
    number: '8',
    title: 'Where the Horse Grazes the Foam',
    fromIsland: 'nuku_hiva',
    toIsland: 'ua_pou',
    act: 2,
    sandRecallId: 'sand_nuku_hiva_polar_pivots',
    recommendedDeparture: DepartureWindow.MIDNIGHT,
    expectedDurationMin: 7.5,
    gameHoursPerRealMin: 0.95,
    solarRaDeg: 160.0,
    bpm: 60.0,
    windFromAz: 90.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 330.0,
        weather: 'clear',
        lyrics:
          "Steer where the Horse's Crown skims low across the dark water without sinking / Check behind your steering paddle that the Sea Turtle spins directly in your wake.",
        easyCueText:
          "Center the low-skimming Horse's Crown between your twin prows (verify in Free-Look that The Sea Turtle sits dead astern).",
        cueLabel: "the low-skimming Horse's Crown with the Sea Turtle spinning astern",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['horses_crown'],
          sternStarId: 'shell_crown',
          compensateLeeway: true,
          fallbackHeadingDeg: 0.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 480.0,
        weather: 'clear',
        lyrics: "When morning pales the Horse, steer opposite the white terns until Ua Pou's stone needles rise.",
        easyCueText: 'At dawn, steer opposite outward-flying white terns toward Ua Pou.',
        cueLabel: 'the morning white terns off Ua Pou',
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 0.0 },
      },
    ],
  },

  song_09: {
    id: 'song_09',
    number: '9',
    title: 'Three Lanterns Down to Rangiroa',
    fromIsland: 'ua_pou',
    toIsland: 'rangiroa',
    act: 2,
    sandRecallId: 'sand_ua_pou_band1_horse',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 8.5,
    gameHoursPerRealMin: 1.45,
    solarRaDeg: 336.0,
    bpm: 58.0,
    windFromAz: 85.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 260.0,
        weather: 'clear',
        lyrics:
          "Aim your twin prows where the Horse's Tail descends toward the dark waves / Before it drowns, let the descending Boar's Bristle take its place.",
        easyCueText:
          "Steer toward Setting Horse's Tail; before it sinks below the horizon, switch to Setting Boar's Bristle descending above it.",
        cueLabel: "the Setting Horse's Tail and Boar's Bristle",
        guidance: {
          mode: 'star_relay_setting',
          stars: ['horses_tail', 'boars_bristle'],
          compensateLeeway: true,
          fallbackHeadingDeg: 330.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 540.0,
        weather: 'clear',
        lyrics:
          "Follow the Crab's Right Claw down toward the sea mist / At first light, seek the wide jade belly glowing above Rangiroa's ring.",
        easyCueText: "Switch to Setting Crab's Right Claw, then steer under the pale turquoise-bellied cloud at dawn.",
        cueLabel: "the Setting Crab's Right Claw and Rangiroa's jade cloud belly",
        guidance: {
          mode: 'star_relay_setting',
          stars: ['crabs_right_claw'],
          useRing2BeaconOnApproach: true,
          compensateLeeway: true,
          fallbackHeadingDeg: 330.0,
        },
      },
    ],
  },

  song_10: {
    id: 'song_10',
    number: '10',
    title: 'The Cloud-Veiled Reach to Hiva Oa',
    fromIsland: 'rangiroa',
    toIsland: 'hiva_oa',
    act: 2,
    sandRecallId: 'sand_rangiroa_stern_backsight',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 9.5,
    gameHoursPerRealMin: 1.4,
    solarRaDeg: 176.0,
    bpm: 60.0,
    windFromAz: 90.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 240.0,
        weather: 'clear',
        lyrics: "Leave the great lagoon on the Rising Bull's Hoof / When he climbs three hands high, hold the Rising Rat's Tail.",
        easyCueText: "Center Rising Bull's Hoof, then hand off to Rising Rat's Tail.",
        cueLabel: "the Rising Bull's Hoof and Rat's Tail",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['bulls_hoof', 'rats_tail'],
          compensateLeeway: true,
          fallbackHeadingDeg: 120.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 600.0,
        weather: 'forward_cloud_curtain',
        lyrics:
          "When low rain-clouds curtain your prows and the Shark's Fin hides in mist / Look straight back over your steering sweep and center the Setting Gecko's Tongue in your wake until morning lifts Hiva Oa's dark cliffs.",
        easyCueText:
          "When dark clouds block your forward horizon, use Free-Look astern to keep Setting Gecko's Tongue centered directly behind your stern-post until dawn.",
        cueLabel: "the Setting Gecko's Tongue centered behind your stern",
        guidance: {
          mode: 'stern_star',
          sternStarId: 'geckos_tongue',
          useRing2BeaconOnApproach: true,
          compensateLeeway: true,
          fallbackHeadingDeg: 120.0,
        },
      },
    ],
  },

  song_11: {
    id: 'song_11',
    number: '11',
    title: 'Beneath the Overhead Gecko',
    fromIsland: 'hiva_oa',
    toIsland: 'fatu_hiva',
    act: 2,
    sandRecallId: 'sand_hiva_oa_zenith_dogleg',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 9.0,
    gameHoursPerRealMin: 1.45,
    solarRaDeg: 182.0,
    bpm: 60.0,
    windFromAz: 100.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 270.0,
        zenithTriggerStarId: 'geckos_heart',
        weather: 'clear',
        lyrics:
          "Point your twin prows where the Frigatebird's Beak dives down toward the Sea Turtle's Pivot / Sail steady while the Gecko climbs the dome.",
        easyCueText: "Steer toward the point on the horizon beneath The Sea Turtle and Frigatebird's Beak.",
        cueLabel: "the Sea Turtle's Pivot before the Gecko reached the mast-top",
        guidance: { mode: 'star_relay_rising', stars: ['shell_crown'], compensateLeeway: true, fallbackHeadingDeg: 180.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 560.0,
        weather: 'clear',
        lyrics:
          "Tilt your eyes to the mast-top: when the Gecko's Heart passes straight overhead / Turn your prows to the Rising Shark's Jaw until Fatu Hiva's green cliffs greet the sun.",
        easyCueText:
          "Look straight up in Free-Look; once Gecko's Heart passes directly overhead above your mast, turn to center the Rising Shark's Jaw between your prows.",
        cueLabel: "the turn onto the Rising Shark's Jaw when Gecko's Heart passed overhead",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['sharks_jaw', 'crabs_eye'],
          useRing2BeaconOnApproach: true,
          compensateLeeway: true,
          fallbackHeadingDeg: 90.0,
        },
      },
    ],
  },

  song_12: {
    id: 'song_12',
    number: '12',
    title: 'Wake of the Great Whale',
    fromIsland: 'fatu_hiva',
    toIsland: 'mangareva',
    act: 2,
    sandRecallId: 'sand_fatu_hiva_band5_whale',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 10.0,
    gameHoursPerRealMin: 1.4,
    solarRaDeg: 158.0,
    bpm: 58.0,
    windFromAz: 95.0,
    primarySwellFromAz: 150.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 380.0,
        weather: 'clear',
        lyrics:
          "Set the Rising Whale's Spout between your prows / Hand the watch to the Whale's Fluke, and then to the Rising Shark's Tail.",
        easyCueText:
          "Relay along the same rising house: Whale's Spout, Whale's Fluke, then Shark's Tail as each climbs past three hands high.",
        cueLabel: "the Rising Whale's Spout, Fluke, and Shark's Tail",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['whales_spout', 'whales_fluke', 'sharks_tail'],
          compensateLeeway: true,
          fallbackHeadingDeg: 150.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 630.0,
        weather: 'clear',
        lyrics:
          "Keep the morning sun off your port beam and steer into the morning boobies' beaks / Until green Mangareva shines beneath its mountain cloud.",
        easyCueText: 'At dawn, steer opposite outward-flying boobies toward the peak cloud ringed with lagoon green.',
        cueLabel: "the morning boobies and Mangareva's cloud",
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 150.0 },
      },
    ],
  },

  // =========================================================================
  // ACT III: THE HAWAI'I MIST CHAIN & GRAND VOYAGE (Songs 13 - 16 + 14R)
  // =========================================================================
  song_13: {
    id: 'song_13',
    number: '13',
    title: 'Edge of the Grey Curtain',
    fromIsland: 'mangareva',
    toIsland: 'kauai',
    act: 3,
    sandRecallId: 'sand_mangareva_mist_warning',
    isInterBasinCrossing: true,
    crossingVector: { x: -4.5, y: 7.79 },
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 9.0,
    gameHoursPerRealMin: 1.4,
    solarRaDeg: 336.0,
    bpm: 58.0,
    windFromAz: 120.0,
    primarySwellFromAz: 15.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 260.0,
        weather: 'clear',
        lyrics:
          "Follow the Setting Horse's Tail and Boar's Bristle down toward the dark sea / Watch the Sea Turtle drown in your wake while the Steadfast Peg lifts above the foam.",
        easyCueText:
          "Steer on Setting Horse's Tail, then Setting Boar's Bristle as the Sea Turtle sinks astern and the Steadfast Peg rises ahead.",
        cueLabel: "the Setting Horse's Tail and Boar's Bristle",
        guidance: {
          mode: 'star_relay_setting',
          stars: ['horses_tail', 'boars_bristle'],
          compensateLeeway: true,
          fallbackHeadingDeg: 330.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 560.0,
        weather: 'sea_fog',
        lyrics:
          "When grey mist blinds the stars and steals the morning sun, hold your steering sweep locked without wavering / Watch high above the low fog-bank where Kaua'i's black crag pierces the sky.",
        easyCueText:
          "When fog hides the horizon and stars, hold your Trim-Lock paddle steady; look slightly above the low fog bank at dawn to spot Kaua'i's high peak.",
        cueLabel: "a steady locked sweep toward Kaua'i's crag above the mist",
        guidance: { mode: 'heading', compensateLeeway: true, targetHeadingDeg: 330.0 },
      },
    ],
  },

  song_14: {
    id: 'song_14',
    number: '14',
    title: "Four Heartbeats to O'ahu",
    fromIsland: 'kauai',
    toIsland: 'oahu',
    act: 3,
    sandRecallId: 'sand_kauai_four_swell_voices',
    recommendedDeparture: DepartureWindow.DAWN,
    expectedDurationMin: 8.5,
    gameHoursPerRealMin: 0.75,
    solarRaDeg: 180.0,
    bpm: 60.0,
    windFromAz: 135.0,
    primarySwellFromAz: 270.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 410.0,
        weather: 'sea_fog',
        lyrics:
          'Put the rising sun behind your right shoulder until white sea-mist closes the world / Listen to the deep drum—let the great swell lift your port cheek every four beats.',
        easyCueText:
          'In the fog, adjust heading until the left (port) prow lifts first in a diagonal corkscrew exactly on Beat 1 of every 4-beat drum cycle.',
        cueLabel: 'the four-beat ocean swell upon your port cheek',
        guidance: { mode: 'swell_cheek', cheekSide: 'port', compensateLeeway: true, targetHeadingDeg: 315.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 540.0,
        weather: 'sea_fog',
        lyrics:
          "Turn away if the waves rush your bow; turn closer if your deck rolls side to side / When the deep swell suddenly falls flat and still, steer straight upswell into O'ahu's hidden bay.",
        easyCueText:
          "When you enter the flat Calm Wave Shadow, turn Head-On (symmetric bow seesaw) straight into the swell to reach O'ahu.",
        cueLabel: "the Calm Wave Shadow upswell into O'ahu",
        guidance: { mode: 'wave_shadow_landfall', compensateLeeway: true, targetHeadingDeg: 315.0 },
      },
    ],
  },

  song_14r: {
    id: 'song_14r',
    number: '14R',
    title: 'Echo of the Fortress Crag',
    fromIsland: 'oahu',
    toIsland: 'kauai',
    act: 3,
    sandRecallId: 'sand_oahu_return_swell',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 8.5,
    gameHoursPerRealMin: 1.45,
    solarRaDeg: 180.0,
    bpm: 60.0,
    windFromAz: 45.0,
    primarySwellFromAz: 180.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 360.0,
        weather: 'sea_fog',
        lyrics:
          "Leave O'ahu's timber cove with the sinking sun behind your left shoulder / Let the deep ocean ridge lift your starboard cheek every four beats through the dark mist.",
        easyCueText:
          'Place the setting sun behind your port shoulder; hold starboard-cheek corkscrew lift on every 4-beat drum strike through the mist.',
        cueLabel: 'the four-beat swell upon your starboard cheek',
        guidance: { mode: 'swell_cheek', cheekSide: 'starboard', compensateLeeway: true, targetHeadingDeg: 135.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 540.0,
        weather: 'sea_fog',
        lyrics:
          "Hold your wake true against the rolling ridge / When grey morning lightens the mist, steer where Kaua'i's black fortress crag pierces above the cloud.",
        easyCueText: "At dawn, steer toward Kaua'i's tall peak rising above the low fog bank.",
        cueLabel: "Kaua'i's black crag rising above the morning mist",
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 135.0 },
      },
    ],
  },

  song_15: {
    id: 'song_15',
    number: '15',
    title: 'The Chant of Kiritimati',
    fromIsland: 'kauai',
    toIsland: 'kiritimati',
    act: 3,
    sandRecallId: 'sand_kauai_refraction_lattice',
    recommendedDeparture: DepartureWindow.DUSK,
    expectedDurationMin: 10.0,
    gameHoursPerRealMin: 1.4,
    solarRaDeg: 140.0,
    bpm: 60.0,
    windFromAz: 120.0,
    primarySwellFromAz: 135.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 120.0,
        weather: 'clear',
        lyrics:
          "Put Kaua'i's Fortress Crag behind your stern-post / Sail against the sinking sun until the Gecko's Tongue breaks the dark foam.",
        easyCueText: "Keep the setting sun astern until Gecko's Tongue rises.",
        cueLabel: "the sinking sun astern while awaiting the Gecko's Tongue",
        guidance: { mode: 'heading', compensateLeeway: true, targetHeadingDeg: 90.0 },
      },
      {
        verseNumber: 2,
        endRealSec: 430.0,
        weather: 'patchy_overcast',
        lyrics:
          "Turn your twin prows to the Rising Bull's Horn / When clouds veil the Rat's Nose, hold the deep swell four beats upon your starboard cheek.",
        easyCueText:
          "Align prows to Rising Bull's Horn; when night clouds cover the sky, hold starboard-cheek corkscrew lift every 4 drum beats.",
        cueLabel: "the Rising Bull's Horn and starboard-cheek four-beat swell",
        guidance: { mode: 'swell_cheek', cheekSide: 'starboard', compensateLeeway: true, targetHeadingDeg: 90.0 },
      },
      {
        verseNumber: 3,
        endRealSec: 630.0,
        weather: 'patchy_overcast',
        lyrics:
          'Watch the sea cross into diamond ripples beneath your twin hulls / Follow the crisscrossed water where pale jade paints the morning cloud.',
        easyCueText: 'Follow the diamond cross-hatched swell refraction toward the turquoise-bellied cloud.',
        cueLabel: "the diamond swell refraction beneath Kiritimati's jade cloud",
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 90.0 },
      },
    ],
  },

  song_16: {
    id: 'song_16',
    number: '16',
    title: "The Great Chant of Hawai'i",
    fromIsland: 'kiritimati',
    toIsland: 'hawaii',
    act: 3,
    sandRecallId: 'sand_kiritimati_grand_voyage_prep',
    recommendedDeparture: DepartureWindow.DAWN,
    expectedDurationMin: 12.0,
    gameHoursPerRealMin: 2.1,
    solarRaDeg: 190.0,
    bpm: 60.0,
    windFromAz: 30.0,
    primarySwellFromAz: 45.0,
    secondaryChopFromAz: 180.0,
    verses: [
      {
        verseNumber: 1,
        endRealSec: 180.0,
        weather: 'clear',
        lyrics:
          'Sail against the morning boobies with the rising sun warm between your twin prows / When the sun climbs high, bind the post shadow to the center deck-lashing.',
        easyCueText:
          'Steer toward the rising sun (opposite dawn boobies), then keep the post shadow centered along the middle deck lashing.',
        cueLabel: 'the rising sun and center deck-lashing shadow',
        guidance: {
          mode: 'sun_shadow',
          targetLashingZone: 'center_aft',
          compensateLeeway: true,
          targetHeadingDeg: 90.0,
        },
      },
      {
        verseNumber: 2,
        endRealSec: 360.0,
        weather: 'sea_fog',
        lyrics:
          'When white mist swallows sun and sky, ignore the quick chop slapping your beam / Feel only the slow ocean ridge lifting your port cheek every four strikes of the deep drum.',
        easyCueText: 'In fog, tune heading until the deep Primary Swell lifts your port prow every 4 beats.',
        cueLabel: 'the deep four-beat ridge upon your port cheek',
        guidance: { mode: 'swell_cheek', cheekSide: 'port', compensateLeeway: true, targetHeadingDeg: 90.0 },
      },
      {
        verseNumber: 3,
        endRealSec: 570.0,
        weather: 'clear',
        lyrics:
          "When night wind tears the fog apart, set your prows upon the Rising Gecko's Tail / Hand the watch to the Bull's Hoof, the Rat's Tail, and icy Shark's Fin, keeping the Steadfast Peg shining off your port beam.",
        easyCueText:
          "Under night stars, relay along Rising Gecko's Tail, Bull's Hoof, Rat's Tail, and Shark's Fin while the Steadfast Peg shines off your left beam.",
        cueLabel: "the Rising Gecko's Tail, Bull's Hoof, Rat's Tail, and Shark's Fin",
        guidance: {
          mode: 'star_relay_rising',
          stars: ['geckos_tail', 'bulls_hoof', 'rats_tail', 'sharks_fin'],
          compensateLeeway: true,
          fallbackHeadingDeg: 120.0,
        },
      },
      {
        verseNumber: 4,
        endRealSec: 760.0,
        weather: 'sea_fog',
        lyrics:
          "When morning mist returns, watch for white-tipped pyramid waves bouncing back from unseen cliffs / Follow the dawn terns' beaks straight through the surf-mist to Hawai'i's ancestral shore.",
        easyCueText:
          "In dawn mist, steer toward peaked white-tipped reflected waves and opposite outward-flying terns to reach Hawai'i.",
        cueLabel: "the cliff-reflected pyramid waves and dawn terns of Hawai'i",
        guidance: { mode: 'island_beacon', compensateLeeway: true, fallbackHeadingDeg: 120.0 },
      },
    ],
  },
});

export function buildReturnSong(fromId, toId) {
  for (const song of Object.values(SONGS)) {
    if (song.fromIsland === fromId && song.toIsland === toId) {
      return song;
    }
  }

  const src = ISLANDS[fromId];
  const dst = ISLANDS[toId];
  if (!src || !dst || src.basinId !== dst.basinId) {
    return null;
  }

  const dx = dst.pos.x - src.pos.x;
  const dy = dst.pos.y - src.pos.y;
  const distMin = Math.max(3.5, Math.hypot(dx, dy));
  const azDeg = posMod(radToDeg(Math.atan2(dx, dy)), 360.0);
  const houseName = nearestHouseName(azDeg);
  const beaconPhrase = dst.hasPeakCloud ? 'its tall stationary cloud' : 'its jade-bellied lagoon cloud';

  return {
    id: `return_${fromId}_to_${toId}`,
    number: 'R',
    title: `Return Chant to ${dst.name}`,
    fromIsland: fromId,
    toIsland: toId,
    act: dst.act,
    sandRecallId: 'sand_maupiti_12_shell_compass',
    recommendedDeparture: DepartureWindow.DAWN,
    expectedDurationMin: distMin,
    gameHoursPerRealMin: 1.0,
    solarRaDeg: 180.0,
    bpm: 60.0,
    windFromAz: 100.0,
    primarySwellFromAz: posMod(azDeg + 45.0, 360.0),
    verses: [
      {
        verseNumber: 1,
        endRealSec: distMin * 60.0 + 30.0,
        weather: 'clear',
        lyrics: `Set your twin prows toward the ${houseName} and let the four-beat ridge lift your starboard cheek / Hold steady until ${dst.name} reveals ${beaconPhrase}.`,
        easyCueText: `Align toward the ${houseName} (starboard-cheek four-beat swell) and steer for ${beaconPhrase}.`,
        cueLabel: `the ${houseName} toward ${dst.name}`,
        guidance: {
          mode: 'island_beacon',
          compensateLeeway: true,
          fallbackHeadingDeg: azDeg,
        },
      },
    ],
  };
}

function nearestHouseName(azDeg) {
  let bestName = 'House of the Grazing Horse';
  let bestDiff = 999.0;
  for (const h of HORIZON_HOUSES) {
    const diff = Math.abs(wrapDeg180(azDeg - h.engineAzDeg));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestName = h.name;
    }
  }
  return bestName;
}
