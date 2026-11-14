/**
 * Declarative curriculum, dual-hemisphere Star Masters, Constellation Atlas lore,
 * and optional Wayfinder's Eye memory trials for The Star-Stone Vigil (Ahu Feti'a).
 *
 * Strictly zero cardinal letters/words (N/S/E/W) and zero degree numbers in all player-facing text.
 */

export const STAR_MASTERS = Object.freeze({
  terai: {
    id: 'terai',
    islandId: 'maupiti',
    mentorName: "First Master Tera'i",
    mentorRole: 'Star Master of the Lagoon Skies',
    portrait: './assets/mentors/first_master_terai.webp',
    ringTitle: "Maupiti Star-Stone Ring",
    skyRealmLabel: "Realm of the Sea Turtle's Pivot",
    defaultSolarRaDeg: 178.0,
    defaultSolarHour: 22.0,
    welcomeIntro:
      "Stand still within these twelve carved stones, apprentice. Here on solid rock the deck never pitches, and our eyes may study how the Sea Turtle anchors the night dome while five star-bands arch from Rising Stone to Setting Stone.",
    chapters: [
      {
        id: 'terai_ch1_houses',
        number: 1,
        title: 'The Twelve Horizon Stones',
        solarRaDeg: 178.0,
        solarHour: 20.3,
        focusStarId: 'bulls_horn',
        highlightHouseId: 'house_band3_rising',
        promptTarget: { type: 'star', id: 'bulls_horn', label: "Bull's Horn" },
        speech:
          "Around our feet stand twelve carved stones—five Rising Paths, five opposite Setting Paths, and two Pivot Stones. Turn your gaze to the amber Bull's Horn breaking above the Rising Path of the Bull, then drag the Night Time bar to watch him climb the dome.",
        hint: "Drag the sky (or press J / L) until the warm amber Bull's Horn sits inside your sight ring, or tap 'Look Where Master Points'.",
      },
      {
        id: 'terai_ch2_relay',
        number: 2,
        title: 'Three Hands High & Star Relays',
        solarRaDeg: 178.0,
        solarHour: 22.6,
        focusStarId: 'rats_nose',
        highlightHouseId: 'house_band3_rising',
        promptTarget: { type: 'star', id: 'rats_nose', label: "Rat's Nose" },
        speech:
          "Once a rising star climbs past three hands above the dark water, it pulls away from your canoe's prows. Notice how Bull's Horn has climbed high while Rat's Nose now rises out of the exact same stone House right beneath him! Center your gaze on Rat's Nose.",
        hint: "Look just above the Rising Path of the Bull stone beneath the higher Bull's Horn to spot Rat's Nose.",
      },
      {
        id: 'terai_ch3_turtle_pivot',
        number: 3,
        title: "The Sea Turtle's Unmoving Pivot",
        solarRaDeg: 355.0,
        solarHour: 22.0,
        focusStarId: 'shell_crown',
        highlightHouseId: 'house_south_turtle_pivot',
        promptTarget: { type: 'star', id: 'shell_crown', label: 'Shell Crown (The Sea Turtle)' },
        speech:
          "In our Lagoon and Windward waters, the Sea Turtle's Shell Crown wheels in a tight circle above its Pivot Stone all night without ever drowning, and the Frigatebird's Beak dives straight toward it. Across the ring, the Steadfast Peg lies hidden beneath the curve of the sea!",
        hint: "Turn toward the House of the Sea Turtle's Pivot stone to find golden Shell Crown beneath the diving Frigatebird.",
      },
      {
        id: 'terai_ch4_zenith',
        number: 4,
        title: 'Overhead Zenith & Deep-Track Whales',
        solarRaDeg: 186.0,
        solarHour: 22.0,
        focusStarId: 'geckos_heart',
        highlightHouseId: 'house_band2_rising',
        promptTarget: { type: 'star', id: 'geckos_heart', label: "Gecko's Heart" },
        speech:
          "Tilt your head straight overhead as if checking your mast-top! In these islands, bright green-tinted Gecko's Heart passes nearly straight above the center of our ring—telling a navigator at sea that they ride the latitude of our home chain.",
        hint: "Drag downward / press I (or tap 'Look Where Master Points') to tilt your gaze high overhead toward Gecko's Heart.",
      },
    ],
  },

  akura: {
    id: 'akura',
    islandId: 'kiritimati',
    mentorName: 'Keeper Akura',
    mentorRole: 'Star-Mirror Master of the Mist Isles',
    portrait: './assets/mentors/keeper_akura.webp',
    ringTitle: 'Kiritimati Star-Mirror Ring',
    skyRealmLabel: 'Realm of the Steadfast Peg',
    defaultSolarRaDeg: 155.0,
    defaultSolarHour: 22.5,
    welcomeIntro:
      "Welcome to the Star-Mirror Ring of Kiritimati, far across the great waters from Ra'iatea. Gaze into the night sky above these coral stones: here the Sea Turtle has vanished beneath the ocean's curve, and the unmoving Steadfast Peg rules the night!",
    chapters: [
      {
        id: 'akura_ch1_peg',
        number: 1,
        title: 'The Unmoving Steadfast Peg',
        solarRaDeg: 155.0,
        solarHour: 22.0,
        focusStarId: 'steadfast_peg',
        highlightHouseId: 'house_north_horse_pivot',
        promptTarget: { type: 'star', id: 'steadfast_peg', label: 'Steadfast Peg' },
        speech:
          "In your home lagoons this star was buried beneath the sea. Here in the Hawai'i Mist Chain, the golden Steadfast Peg hangs motionless two hands above the House of the Grazing Horse all night long! Center your gaze upon him and scrub the Night Time bar—he never budges.",
        hint: "Look two hands above the House of the Grazing Horse stone to spot the bright, unmoving Steadfast Peg.",
      },
      {
        id: 'akura_ch2_horse_wheel',
        number: 2,
        title: 'The Tireless Wheel of the Horse',
        solarRaDeg: 228.0,
        solarHour: 22.0,
        focusStarId: 'horses_crown',
        highlightHouseId: 'house_north_horse_pivot',
        promptTarget: { type: 'star', id: 'horses_crown', label: "Horse's Crown" },
        speech:
          "Remember how Horse's Crown barely skimmed the wave-tops off Ua Pou before drowning? Watch him now! Tethered to the high Steadfast Peg, Horse's Crown circles through the heavens all night without ever touching the sea.",
        hint: "Find Horse's Crown linked by a chalk tether to the Steadfast Peg above the Grazing Horse stone.",
      },
      {
        id: 'akura_ch3_vanished_turtle',
        number: 3,
        title: 'Where the Frigatebird Skims the Foam',
        solarRaDeg: 355.0,
        solarHour: 22.0,
        focusStarId: 'frigatebirds_tail',
        highlightHouseId: 'house_south_turtle_pivot',
        promptTarget: { type: 'star', id: 'frigatebirds_tail', label: "Frigatebird's Tail" },
        speech:
          "Turn across the ring to the House of the Sea Turtle's Pivot. The Sea Turtle himself lies drowned beneath the curve of the ocean—never rising here! Only the Frigatebird's Tail and Wingtip lift briefly above the dark waves like a low lantern before sinking again.",
        hint: "Face the House of the Sea Turtle's Pivot stone at deep night to catch Frigatebird's Tail skimming just above the waterline.",
      },
      {
        id: 'akura_ch4_hawaii_relay',
        number: 4,
        title: "The Night Relay to Hawai'i",
        solarRaDeg: 205.0,
        solarHour: 23.5,
        focusStarId: 'sharks_fin',
        highlightHouseId: 'house_band4_rising',
        promptTarget: { type: 'star', id: 'sharks_fin', label: "Shark's Fin" },
        speech:
          "On the Grand Voyage to ancestral Hawai'i, when night wind parts the mist, you will steer along the Rising Path of the Shark—Gecko's Tail, Bull's Hoof, Rat's Tail, then icy Shark's Fin—while keeping the Steadfast Peg shining steady off your port beam!",
        hint: "Look above the Rising Path of the Shark stone for bright icy-blue Shark's Fin.",
      },
    ],
  },
});

export const CONSTELLATION_GUIDE = Object.freeze({
  the_horse: {
    id: 'the_horse',
    focusStarId: 'horses_crown',
    houseId: 'house_north_horse_pivot',
    bestSolarRaDeg: 228.0,
    bestSolarHour: 22.0,
    teraiStatus: 'Skims low above the foam; Steadfast Peg hidden below the sea',
    akuraStatus: 'Circumpolar all night around the unmoving Steadfast Peg',
    teraiNote:
      "From Maupiti, the Steadfast Peg lies hidden below the waves, so only Horse's Crown and Mane skim low above the Grazing Horse stone for part of the night.",
    akuraNote:
      "From Kiritimati and Hawai'i, the Steadfast Peg stands motionless two hands high all night while Horse's Crown circles around it without ever setting!",
  },
  the_boar: {
    id: 'the_boar',
    focusStarId: 'boars_tusk',
    houseId: 'house_band2_rising',
    bestSolarRaDeg: 218.0,
    bestSolarHour: 22.0,
    teraiStatus: 'Compact tusk-to-bristle arc across the Boar & Horse tracks',
    akuraStatus: 'Arches high overhead near the Mist Isles zenith',
    teraiNote:
      "Boar's Tusk leads the great deep-water crossing from Maupiti to Nuku Hiva along the Rising Path of the Boar before handing off to Crab's Left Claw.",
    akuraNote:
      "Here in the Mist Chain, the Path of the Boar climbs almost straight overhead! Steer by Boar's Tusk while he rides below three hands high near his stone.",
  },
  the_gecko: {
    id: 'the_gecko',
    focusStarId: 'geckos_heart',
    houseId: 'house_band2_rising',
    bestSolarRaDeg: 186.0,
    bestSolarHour: 22.0,
    teraiStatus: "Gecko's Heart transits high near the mast-top zenith",
    akuraStatus: 'Sinuous four-star lizard curving across three sky bands',
    teraiNote:
      "The Gecko curves cleanly from Gecko's Tongue on the Boar's track through Gecko's Back and overhead Gecko's Heart down to Gecko's Tail on the Shark's track.",
    akuraNote:
      "From Kiritimati, Gecko's Heart rides lower across the sky rather than dead overhead, while Gecko's Tail opens the star watch of Song 16 to Hawai'i.",
  },
  the_crab: {
    id: 'the_crab',
    focusStarId: 'crabs_shell',
    houseId: 'house_band3_rising',
    bestSolarRaDeg: 285.0,
    bestSolarHour: 22.0,
    teraiStatus: 'Forked two-clawed crab spanning the Horse, Boar & Bull tracks',
    akuraStatus: 'Forked two-clawed lantern high in the Mist Isles sky',
    teraiNote:
      "From Crab's Eye on the central Sun Path, Crab's Carapace forks into Left Claw on the Boar track and Right Claw on the Horse track.",
    akuraNote:
      "All four stars of The Crab gleam high together above Kiritimati, bridging the central Sun Path up toward the Horse's waters.",
  },
  the_bull: {
    id: 'the_bull',
    focusStarId: 'bulls_horn',
    houseId: 'house_band3_rising',
    bestSolarRaDeg: 178.0,
    bestSolarHour: 20.5,
    teraiStatus: 'Rises & sets true along the central Sun Path',
    akuraStatus: 'Rises & sets true along the central Sun Path',
    teraiNote:
      "Warm amber Bull's Horn rides the exact same central band as the daytime Sun, while Bull's Hoof marks the neighboring Path of the Shark.",
    akuraNote:
      "Even across the equator, Bull's Horn still breaks the sea at the exact Rising Path of the Bull stone—though watch how his arc leans toward the opposite side of the dome!",
  },
  the_rat: {
    id: 'the_rat',
    focusStarId: 'rats_nose',
    houseId: 'house_band3_rising',
    bestSolarRaDeg: 178.0,
    bestSolarHour: 22.8,
    teraiStatus: 'Faithful second-watch relay behind The Bull',
    akuraStatus: "Opens the Grand Voyage night watch toward Hawai'i",
    teraiNote:
      "Whenever Bull's Horn or Bull's Hoof climbs past three hands high, Rat's Nose and Rat's Tail rise faithfully in the same stones right behind them.",
    akuraNote:
      "On Song 16 to Hawai'i, Rising Rat's Tail greets you as night wind tears the afternoon sea-fog apart, passing the watch to Shark's Fin.",
  },
  the_shark: {
    id: 'the_shark',
    focusStarId: 'sharks_fin',
    houseId: 'house_band4_rising',
    bestSolarRaDeg: 205.0,
    bestSolarHour: 23.5,
    teraiStatus: 'Great diagonal hunter across Bull, Shark, and Whale bands',
    akuraStatus: 'Rides crisp and low along the Shark track under Te Mangoroa',
    teraiNote:
      "Icy blue-white Shark's Fin is one of the brightest beacons of the night sea, linking Shark's Jaw on the Bull Path to Shark's Tail on the Whale Path.",
    akuraNote:
      "From Kiritimati, Shark's Fin stays comfortably low in the steering window longer, making him a steadfast guide on the night leg to Hawai'i.",
  },
  the_whale: {
    id: 'the_whale',
    focusStarId: 'whales_spout',
    houseId: 'house_band5_rising',
    bestSolarRaDeg: 210.0,
    bestSolarHour: 22.0,
    teraiStatus: 'Sweeps high and wide near the Sea Turtle waters',
    akuraStatus: 'Skims a shallow, low arc near the horizon mist',
    teraiNote:
      "In the Lagoon and Windward chains, Whale's Spout and Whale's Fluke climb bold and clear, guiding deep-sea vakas from Fatu Hiva to Mangareva.",
    akuraNote:
      "Notice how low the Whale rides from Kiritimati! Because we stand far in the Steadfast Peg's waters, the Whale barely lifts one hand above the sea before setting.",
  },
  the_frigatebird: {
    id: 'the_frigatebird',
    focusStarId: 'frigatebirds_tail',
    houseId: 'house_south_turtle_pivot',
    bestSolarRaDeg: 355.0,
    bestSolarHour: 22.0,
    teraiStatus: 'Soars all night, diving straight toward the Sea Turtle',
    akuraStatus: 'Briefly skims the waterline; Beak hides in the sea foam',
    teraiNote:
      "Follow the line from Frigatebird's Tail through Frigatebird's Beak—like a diving seabird, he points straight down to the Sea Turtle's unmoving Pivot!",
    akuraNote:
      "Watch closely at deep night! From our islands only Frigatebird's Tail and Bird's Wingtip clear the waves for a fleeting watch while his Beak hides in the sea foam.",
  },
  the_sea_turtle: {
    id: 'the_sea_turtle',
    focusStarId: 'shell_crown',
    houseId: 'house_south_turtle_pivot',
    bestSolarRaDeg: 355.0,
    bestSolarHour: 22.0,
    hiddenForMasters: ['akura'],
    teraiStatus: 'Circumpolar all night above the Pivot Stone',
    akuraStatus: 'Hidden beneath the curve of the sea all night long',
    teraiNote:
      "Golden Shell Crown and the Turtle's two flippers never sink below our waves—they spin tightly above the Pivot Stone from dusk until dawn.",
    akuraNote:
      "Look to the House of the Sea Turtle's Pivot stone—the Sea Turtle never rises here! He swims unseen beneath the curve of the earth, just as the Steadfast Peg hides from Maupiti.",
  },
});

const TERAI_QUIZ_POOL = Object.freeze([
  {
    id: 'q_terai_turtle',
    type: 'star',
    targetId: 'shell_crown',
    solarRaDeg: 355.0,
    solarHour: 22.0,
    prompt: "Find golden Shell Crown, the Sea Turtle's unsetting anchor star.",
    successNote: "True eyes! The Sea Turtle wheels above that Pivot Stone all night in our lagoon waters.",
  },
  {
    id: 'q_terai_frigate',
    type: 'star',
    targetId: 'frigatebirds_beak',
    solarRaDeg: 355.0,
    solarHour: 22.0,
    prompt: "Center your gaze upon Frigatebird's Beak diving toward the Sea Turtle.",
    successNote: "Well sighted! Tail to Beak always points down to the Sea Turtle's Pivot.",
  },
  {
    id: 'q_terai_bull',
    type: 'star',
    targetId: 'bulls_horn',
    solarRaDeg: 178.0,
    solarHour: 20.3,
    prompt: "Spot warm amber Bull's Horn climbing from the Rising Path of the Bull.",
    successNote: "You know the Sun's twin track! Bull's Horn rises ahead of Rat's Nose.",
  },
  {
    id: 'q_terai_gecko_zenith',
    type: 'star',
    targetId: 'geckos_heart',
    solarRaDeg: 186.0,
    solarHour: 22.0,
    prompt: "Tilt high overhead and locate pale-green Gecko's Heart near the zenith.",
    successNote: "Sharp mast-top sight! Gecko's Heart marks our home island chain overhead.",
  },
  {
    id: 'q_terai_shark',
    type: 'star',
    targetId: 'sharks_fin',
    solarRaDeg: 205.0,
    solarHour: 22.8,
    prompt: "Locate icy blue-white Shark's Fin riding the Rising Path of the Shark.",
    successNote: "Clear as reef water! Shark's Fin gleams between Shark's Jaw and Shark's Tail.",
  },
  {
    id: 'q_terai_house_whale',
    type: 'house',
    targetId: 'house_band5_rising',
    solarRaDeg: 210.0,
    solarHour: 22.0,
    prompt: "Face the carved horizon stone for the Rising Path of the Whale (beside the Sea Turtle's Pivot).",
    successNote: "Steady bearing! Whale's Spout and Fluke break the foam right over that stone.",
  },
]);

const AKURA_QUIZ_POOL = Object.freeze([
  {
    id: 'q_akura_peg',
    type: 'star',
    targetId: 'steadfast_peg',
    solarRaDeg: 155.0,
    solarHour: 22.0,
    prompt: 'Center your gaze on the unmoving Steadfast Peg two hands above the Grazing Horse stone.',
    successNote: "Unerring sight! While every other star wheels, the Steadfast Peg holds his place all night.",
  },
  {
    id: 'q_akura_horse',
    type: 'star',
    targetId: 'horses_crown',
    solarRaDeg: 228.0,
    solarHour: 22.0,
    prompt: "Spot Horse's Crown wheeling in its tireless circle around the Steadfast Peg.",
    successNote: "Well found! In these Mist Isles, Horse's Crown never drowns beneath the foam.",
  },
  {
    id: 'q_akura_shark_fin',
    type: 'star',
    targetId: 'sharks_fin',
    solarRaDeg: 205.0,
    solarHour: 23.5,
    prompt: "Find icy Shark's Fin along the Rising Path of the Shark—your Song 16 night beacon.",
    successNote: "Ready for the Grand Voyage! Keep the Steadfast Peg off your port beam while holding Shark's Fin.",
  },
  {
    id: 'q_akura_boar',
    type: 'star',
    targetId: 'boars_tusk',
    solarRaDeg: 218.0,
    solarHour: 21.5,
    prompt: "Locate bright golden-orange Boar's Tusk rising on the Path of the Boar.",
    successNote: "True wayfinder's eye! Boar's Tusk climbs toward our overhead zenith here.",
  },
  {
    id: 'q_akura_frigate_tail',
    type: 'star',
    targetId: 'frigatebirds_tail',
    solarRaDeg: 355.0,
    solarHour: 22.0,
    prompt: "Look opposite the Steadfast Peg and catch Frigatebird's Tail skimming low above the dark waves.",
    successNote: "Keen eyes through the horizon mist! Only the Frigatebird's upper feathers clear the sea here.",
  },
  {
    id: 'q_akura_house_bull_set',
    type: 'house',
    targetId: 'house_band3_setting',
    solarRaDeg: 178.0,
    solarHour: 23.0,
    prompt: 'Face the Setting Path of the Bull stone (with the Steadfast Peg off your right shoulder).',
    successNote: "Well oriented! With the Steadfast Peg on your right beam, you face the Setting Sun & Bull Path.",
  },
]);

export function getQuizPromptsForMaster(masterId) {
  return masterId === 'akura' ? AKURA_QUIZ_POOL : TERAI_QUIZ_POOL;
}
