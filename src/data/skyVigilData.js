/**
 * Declarative Constellation Atlas Lore and Optional Wayfinder's Eye Practice Prompts
 * for the local island Star-Stone Vigil (Ahu Feti'a).
 *
 * Strictly local to the player's current island sky—never teleports to or voices distant
 * mentors from other islands, and contains zero cardinal words/letters or degree numbers.
 */

import { ISLANDS } from './islandsData.js';

export const CONSTELLATION_GUIDE = Object.freeze({
  the_horse: {
    id: 'the_horse',
    focusStarId: 'horses_crown',
    houseId: 'house_north_horse_pivot',
    bestSolarRaDeg: 228.0,
    bestSolarHour: 22.0,
    southStatus: 'Skims low above the surf over the House of the Grazing Horse',
    northStatus: 'Wheels all night around the unmoving Steadfast Peg',
    southNote:
      "In these waters, the galloping Horse arcs inverted low above the House of the Grazing Horse so Horse's Crown and Horse's Mane skim just above the sea foam.",
    northNote:
      "In the Mist Isles, the Steadfast Peg stands motionless two hands above the stone all night while Horse's Crown circles around it without ever drowning!",
  },
  the_boar: {
    id: 'the_boar',
    focusStarId: 'boars_tusk',
    houseId: 'house_band2_rising',
    bestSolarRaDeg: 218.0,
    bestSolarHour: 22.0,
    southStatus: 'Compact tusk-to-bristle ridge across the Boar & Horse tracks',
    northStatus: 'Arches high overhead near the Mist Isles zenith',
    southNote:
      "Warm orange Boar's Tusk leads deep-ocean crossings along the Rising Path of the Boar, rising ahead of Boar's Spine and Boar's Bristle before handing off to the Crab.",
    northNote:
      "In these waters, the Path of the Boar climbs high overhead—steer by Boar's Tusk while he rides below three hands high near his stone.",
  },
  the_gecko: {
    id: 'the_gecko',
    focusStarId: 'geckos_heart',
    houseId: 'house_band2_rising',
    bestSolarRaDeg: 186.0,
    bestSolarHour: 22.0,
    southStatus: "Gecko's Heart transits high near the mast-top zenith",
    northStatus: 'Sinuous four-star lizard curving across three sky bands',
    southNote:
      "The Gecko winds from Gecko's Tongue on the Boar's track through Gecko's Back and overhead Gecko's Heart down to Gecko's Tail on the Shark's track.",
    northNote:
      "From the Mist Chain, Gecko's Heart arcs lower across the sky rather than dead overhead, while Gecko's Tail opens the star watch on the Grand Voyage.",
  },
  the_crab: {
    id: 'the_crab',
    focusStarId: 'crabs_shell',
    houseId: 'house_band2_rising',
    bestSolarRaDeg: 295.0,
    bestSolarHour: 22.0,
    southStatus: 'Two-clawed reef crab spanning the Horse, Boar & Bull tracks',
    northStatus: 'Two-clawed lantern gleaming high across the night dome',
    southNote:
      "From bright Crab's Eye on the central Sun Path, Crab's Carapace branches into Crab's Left Claw on the Boar track and sweeping Crab's Right Claw on the Horse track.",
    northNote:
      "All four stars of the Crab shine high together above these waters, bridging the central Sun Path toward the Horse's track.",
  },
  the_bull: {
    id: 'the_bull',
    focusStarId: 'bulls_horn',
    houseId: 'house_band3_rising',
    bestSolarRaDeg: 178.0,
    bestSolarHour: 20.5,
    southStatus: 'Rises & sets true along the central Sun Path',
    northStatus: 'Rises & sets true along the central Sun Path',
    southNote:
      "Warm amber Bull's Horn rides the exact central track of the daytime Sun, anchored through Bull's Shoulder back to bright Bull's Hoof on the Path of the Shark.",
    northNote:
      "Bull's Horn still breaks the sea at the exact Rising Path of the Bull stone here—though notice how his high arc leans toward the opposite half of the dome!",
  },
  the_rat: {
    id: 'the_rat',
    focusStarId: 'rats_nose',
    houseId: 'house_band3_rising',
    bestSolarRaDeg: 178.0,
    bestSolarHour: 22.8,
    southStatus: 'Faithful second-watch relay following the Bull',
    northStatus: 'Nimble relay climber along the Bull & Shark tracks',
    southNote:
      "Whenever Bull's Horn or Bull's Hoof climbs past three hands high, Rat's Nose and Rat's Tail rise faithfully out of the exact same stones right behind them.",
    northNote:
      "Rising Rat's Tail climbs cleanly out of the Shark's stone as evening sea-mist parts, handing the watch onward to Shark's Fin.",
  },
  the_shark: {
    id: 'the_shark',
    focusStarId: 'sharks_fin',
    houseId: 'house_band4_rising',
    bestSolarRaDeg: 205.0,
    bestSolarHour: 23.5,
    southStatus: 'Sleek ocean hunter spanning the Bull, Shark & Whale bands',
    northStatus: 'Patrols crisp and low along the Shark track under Te Mangoroa',
    southNote:
      "Icy steel-blue Shark's Fin is one of the brightest beacons of the night sea, linking Shark's Jaw on the Bull Path to Shark's Tail on the Whale Path.",
    northNote:
      "In the Mist Isles, Shark's Fin stays low inside the three-hands steering window longer, making him a steadfast guide across open water.",
  },
  the_whale: {
    id: 'the_whale',
    focusStarId: 'whales_spout',
    houseId: 'house_band5_rising',
    bestSolarRaDeg: 175.0,
    bestSolarHour: 22.0,
    southStatus: 'Breaches bold and clear near the Sea Turtle waters',
    northStatus: 'Skims a shallow, low arc near the horizon mist',
    southNote:
      "Whale's Spout, Whale's Brow, and wide Whale's Fluke lift clearly out of the deep rollers beside the Sea Turtle's Pivot.",
    northNote:
      "Notice how low the Whale rides in these waters—he lifts barely one hand above the sea rim before gliding into his Setting Stone.",
  },
  the_frigatebird: {
    id: 'the_frigatebird',
    focusStarId: 'frigatebirds_tail',
    houseId: 'house_south_turtle_pivot',
    bestSolarRaDeg: 355.0,
    bestSolarHour: 22.0,
    southStatus: 'Soars all night, stooping straight toward the Sea Turtle',
    northStatus: 'Briefly skims the waterline while his Beak hides in the foam',
    southNote:
      "Follow the razor-straight line from forked Frigatebird's Tail through Frigatebird's Beak—wherever he wheels, he spears straight toward the Sea Turtle's Pivot!",
    northNote:
      "Watch closely at deep night: in these distant waters only Frigatebird's Tail and Bird's Wingtip clear the waves briefly while his Beak stays below the sea.",
  },
  the_sea_turtle: {
    id: 'the_sea_turtle',
    focusStarId: 'shell_crown',
    houseId: 'house_south_turtle_pivot',
    bestSolarRaDeg: 230.0,
    bestSolarHour: 22.0,
    southStatus: 'Unsetting anchor wheeling all night above the Pivot Stone',
    northStatus: 'Hidden beneath the curve of the ocean all night long',
    southNote:
      "Golden Shell Crown and the Sea Turtle's two swept flippers never sink below the waves here—they wheel tightly above the Pivot Stone from dusk until dawn.",
    northNote:
      "Look toward the House of the Sea Turtle's Pivot stone—in these Mist Isles, the Sea Turtle swims unseen beneath the curve of the sea all night long!",
  },
});

const LAGOON_QUIZ_POOL = Object.freeze([
  {
    id: 'q_south_house_bull_rise',
    type: 'house',
    targetId: 'house_band3_rising',
    solarRaDeg: 178.0,
    solarHour: 21.0,
    prompt: 'Face the carved horizon stone marking the Rising Path of the Bull, where the morning sun breaks the sea.',
    successNote: 'Steady bearing! Both the morning sun and the Bull rise over that central stone.',
  },
  {
    id: 'q_south_house_turtle',
    type: 'house',
    targetId: 'house_south_turtle_pivot',
    solarRaDeg: 230.0,
    solarHour: 22.0,
    prompt: "Turn to face the twin-horned horizon stone for the House of the Sea Turtle's Pivot.",
    successNote: 'True alignment! That stone anchors the unmoving pivot of these waters.',
  },
  {
    id: 'q_south_house_whale',
    type: 'house',
    targetId: 'house_band5_rising',
    solarRaDeg: 210.0,
    solarHour: 22.0,
    prompt: "Face the carved horizon stone for the Rising Path of the Whale, closest neighbor to the Sea Turtle's Pivot.",
    successNote: "Well sighted! Deep-track stars break the foam right above that stone.",
  },
  {
    id: 'q_south_turtle',
    type: 'star',
    targetId: 'shell_crown',
    solarRaDeg: 230.0,
    solarHour: 22.0,
    prompt: "Find golden Shell Crown, the Sea Turtle's unsetting anchor star.",
    successNote: 'True eyes! The Sea Turtle wheels above his Pivot Stone all night.',
  },
  {
    id: 'q_south_bull',
    type: 'star',
    targetId: 'bulls_horn',
    solarRaDeg: 178.0,
    solarHour: 20.3,
    prompt: "Spot warm amber Bull's Horn climbing from the Rising Path of the Bull.",
    successNote: "You know the Sun's twin track! Bull's Horn rises ahead of Rat's Nose.",
  },
  {
    id: 'q_south_frigate',
    type: 'star',
    targetId: 'frigatebirds_beak',
    solarRaDeg: 355.0,
    solarHour: 22.0,
    prompt: "Center your gaze upon Frigatebird's Beak stooping toward the Sea Turtle.",
    successNote: "Well sighted! Tail to Beak always points straight to the Sea Turtle's Pivot.",
  },
  {
    id: 'q_south_gecko_zenith',
    type: 'star',
    targetId: 'geckos_heart',
    solarRaDeg: 186.0,
    solarHour: 22.0,
    prompt: "Tilt high overhead and locate pale-green Gecko's Heart near the zenith.",
    successNote: "Sharp mast-top sight! Gecko's Heart climbs high overhead in these waters.",
  },
  {
    id: 'q_south_shark',
    type: 'star',
    targetId: 'sharks_fin',
    solarRaDeg: 205.0,
    solarHour: 22.8,
    prompt: "Locate icy steel-blue Shark's Fin riding the Rising Path of the Shark.",
    successNote: "Clear as reef water! Shark's Fin gleams between Shark's Jaw and Shark's Tail.",
  },
]);

const MIST_QUIZ_POOL = Object.freeze([
  {
    id: 'q_north_house_horse',
    type: 'house',
    targetId: 'house_north_horse_pivot',
    solarRaDeg: 228.0,
    solarHour: 22.0,
    prompt: 'Face the notched horizon monolith marking the House of the Grazing Horse.',
    successNote: 'True alignment! Above this stone shines the polar anchor of the Mist Seas.',
  },
  {
    id: 'q_north_house_bull_set',
    type: 'house',
    targetId: 'house_band3_setting',
    solarRaDeg: 178.0,
    solarHour: 23.0,
    prompt: 'Face the Setting Path of the Bull stone, where the sun sinks into the waves at dusk.',
    successNote: 'Well oriented! With the Grazing Horse stone off your right shoulder, you face the Setting Bull Path.',
  },
  {
    id: 'q_north_peg',
    type: 'star',
    targetId: 'steadfast_peg',
    solarRaDeg: 155.0,
    solarHour: 22.0,
    prompt: 'Center your gaze on the unmoving Steadfast Peg two hands above the Grazing Horse stone.',
    successNote: 'Unerring sight! While every other star wheels, the Steadfast Peg holds its place all night.',
  },
  {
    id: 'q_north_horse',
    type: 'star',
    targetId: 'horses_crown',
    solarRaDeg: 228.0,
    solarHour: 22.0,
    prompt: "Spot Horse's Crown wheeling in its tireless circle around the Grazing Horse stone.",
    successNote: "Well found! In these Mist Isles, Horse's Crown never drowns beneath the foam.",
  },
  {
    id: 'q_north_shark_fin',
    type: 'star',
    targetId: 'sharks_fin',
    solarRaDeg: 205.0,
    solarHour: 23.5,
    prompt: "Find icy Shark's Fin along the Rising Path of the Shark.",
    successNote: 'Keen eyes! Shark\'s Fin rides steady inside the low steering window here.',
  },
  {
    id: 'q_north_boar',
    type: 'star',
    targetId: 'boars_tusk',
    solarRaDeg: 218.0,
    solarHour: 21.5,
    prompt: "Locate bright golden-orange Boar's Tusk rising on the Path of the Boar.",
    successNote: "True wayfinder's eye! Boar's Tusk climbs toward the overhead zenith here.",
  },
]);

export function getQuizPromptsForIsland(islandId) {
  const isl = ISLANDS[islandId];
  return isl && isl.latDeg > 0 ? MIST_QUIZ_POOL : LAGOON_QUIZ_POOL;
}
