/**
 * Voice-Over Line Manifest for Kavenga: Songs of the Star Path.
 *
 * Maps every plot-critical elder `voiceId` across:
 *  1. Sanctuary / Marae encounters (`sanctuary_*`)
 *  2. Guided Sky Vigil constellation lessons (`vigil_<lessonId>_<beatKind>`)
 *  3. Pre-departure Elder Vigil prompts (`prompt_<lessonId>`)
 *
 * Pure ES2022 data module (zero DOM/THREE imports).
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { CONSTELLATION_LESSONS } from './constellationLessonsData.js';
import { ISLANDS } from './islandsData.js';
import { SAND_LESSONS } from './sandDiagramsData.js';

export const SANCTUARY_VOICE_LINES = Object.freeze({
  sanctuary_raiatea_welcome: Object.freeze({
    id: 'sanctuary_raiatea_welcome',
    islandId: 'raiatea',
    elderName: 'Elder Metua',
    category: 'sanctuary',
    text: "Welcome to sacred Taputapuatea, young wayfinder. Sail first at Dawn toward Taha'a's motionless peak cloud (Song 1). Return here with Ceremonial Red Kura Feathers and a restored canoe to earn the outer chant to Maupiti.",
  }),
  sanctuary_raiatea_consecrate_complete: Object.freeze({
    id: 'sanctuary_raiatea_consecrate_complete',
    islandId: 'raiatea',
    elderName: 'Elder Metua',
    category: 'sanctuary',
    text: "Elder Metua binds your crimson Kura feathers to the masthead pennant! 'You have circled the lagoon chain by cloud, bird, shadow, and star. Tonight I entrust you with the Midnight Chant to outer Maupiti.'",
  }),
  sanctuary_raiatea_consecrated: Object.freeze({
    id: 'sanctuary_raiatea_consecrated',
    islandId: 'raiatea',
    elderName: 'Elder Metua',
    category: 'sanctuary',
    text: 'Your consecrated vaka gleams in the lagoon light. Remember our sand wake-lesson: when strong beam winds push your hulls on the midnight crossing to Maupiti, glance astern and lean half a prow into the wind.',
  }),
  sanctuary_tahaa_visit: Object.freeze({
    id: 'sanctuary_tahaa_visit',
    islandId: 'tahaa',
    elderName: 'Hina',
    category: 'sanctuary',
    text: "Hina binds fresh pandanus sennit across your crossbeams and motions to young Tama. 'Carry this Medicinal Kava to Elder Ari'i on twin-peaked Huahine. Launch at Dawn into the white terns' beaks, then hold the post shadow on your second left lashing!'",
  }),
  sanctuary_huahine_need_kava: Object.freeze({
    id: 'sanctuary_huahine_need_kava',
    islandId: 'huahine',
    elderName: "Ari'i",
    category: 'sanctuary',
    text: "Elder Ari'i gazes at the twilight sky. 'Bring me the Medicinal Kava Bundle from Hina on Taha'a, and we shall weave you a new pandanus sail and sing the night-star paths.'",
  }),
  sanctuary_huahine_complete: Object.freeze({
    id: 'sanctuary_huahine_complete',
    islandId: 'huahine',
    elderName: "Ari'i",
    category: 'sanctuary',
    text: "Ari'i breathes in the fragrant kava and unfurls a golden pandanus sail. 'Sail at Dusk toward the sinking sun and Setting Bull's Horn to find uninhabited Manuae glowing jade beneath the clouds—then carry its pearl lures onward to Mo'orea!'",
  }),
  sanctuary_moorea_need_lures: Object.freeze({
    id: 'sanctuary_moorea_need_lures',
    islandId: 'moorea',
    elderName: 'Vaihere',
    category: 'sanctuary',
    text: "Canoe-Wright Vaihere taps your weathered hull planking. 'Bring Giant Pearl-Shell Lures from Manuae's lagoon, and my carvers will raise your gunwales to six cargo slots and gift you a Polished Basalt Adze.'",
  }),
  sanctuary_moorea_complete: Object.freeze({
    id: 'sanctuary_moorea_complete',
    islandId: 'moorea',
    elderName: 'Vaihere',
    category: 'sanctuary',
    text: "Vaihere runs her palm along your raised tamanu splash-strakes. 'Sail home to Ra'iatea at Dusk by handing the watch from Rising Bull's Horn down to Rising Rat's Nose—then consecrate your Kura feathers!'",
  }),
  sanctuary_maupiti_need_adze: Object.freeze({
    id: 'sanctuary_maupiti_need_adze',
    islandId: 'maupiti',
    elderName: "First Master Tera'i",
    category: 'sanctuary',
    text: "First Master Tera'i studies your wake through the foaming pass. 'Present the Polished Basalt Adze of Mo'orea's carvers, and I shall draw the Complete Twelve-Shell Star Ring in the wet sand.'",
  }),
  sanctuary_maupiti_complete: Object.freeze({
    id: 'sanctuary_maupiti_complete',
    islandId: 'maupiti',
    elderName: "First Master Tera'i",
    category: 'sanctuary',
    text: "Master Tera'i places twelve gleaming cowrie shells around a carved canoe mark in the sand. 'Beyond this reef lies empty ocean where all land sinks out of sight. Trust the three-star relay along the Boar's Path at Dusk to reach towering Nuku Hiva!'",
  }),
  sanctuary_nuku_hiva_visit: Object.freeze({
    id: 'sanctuary_nuku_hiva_visit',
    islandId: 'nuku_hiva',
    elderName: 'Master Teiki',
    category: 'sanctuary',
    text: "Master Teiki welcomes your ocean-crossed vaka beneath Nuku Hiva's valley cliffs. 'At Midnight the Horse's Crown skims low above the waves without drowning while the Sea Turtle spins in your wake. Follow the Grazing Horse to basalt-spired Ua Pou!'",
  }),
  sanctuary_ua_pou_visit: Object.freeze({
    id: 'sanctuary_ua_pou_visit',
    islandId: 'ua_pou',
    elderName: 'Vaea',
    category: 'sanctuary',
    text: "Sail-Tender Moana steps aboard to tend your pandanus sheet while Vaea hands over carved harpoon heads. 'Sail at Dusk down three setting stars along the Horse's Path until Rangiroa's immense lagoon paints the dawn clouds jade!'",
  }),
  sanctuary_rangiroa_need_harpoons: Object.freeze({
    id: 'sanctuary_rangiroa_need_harpoons',
    islandId: 'rangiroa',
    elderName: 'Tane',
    category: 'sanctuary',
    text: 'Bring Carved Bone Harpoon Heads from Ua Pou to trade for our Mother-of-Pearl Star Discs.',
  }),
  sanctuary_rangiroa_complete: Object.freeze({
    id: 'sanctuary_rangiroa_complete',
    islandId: 'rangiroa',
    elderName: 'Tane',
    category: 'sanctuary',
    text: "Tane presses luminous pearl star discs into your palm. 'Rain-squalls often curtain your prows halfway to Hiva Oa. When forward stars vanish, look straight back over your steering sweep and hold the Setting Gecko's Tongue centered in your wake!'",
  }),
  sanctuary_hiva_oa_need_discs: Object.freeze({
    id: 'sanctuary_hiva_oa_need_discs',
    islandId: 'hiva_oa',
    elderName: 'Tahia',
    category: 'sanctuary',
    text: "Bring Mother-of-Pearl Star Discs from Rangiroa's divers so we may inlay our ceremonial carvings.",
  }),
  sanctuary_hiva_oa_complete: Object.freeze({
    id: 'sanctuary_hiva_oa_complete',
    islandId: 'hiva_oa',
    elderName: 'Tahia',
    category: 'sanctuary',
    text: "Hull-Wright Kahu stows his sennit mallets on your deck. 'Sail toward the Sea Turtle's Pivot at Dusk while watching your mast-top: the moment the Gecko's Heart passes straight overhead, turn onto the Rising Shark's Jaw for Fatu Hiva!'",
  }),
  sanctuary_fatu_hiva_need_obsidian: Object.freeze({
    id: 'sanctuary_fatu_hiva_need_obsidian',
    islandId: 'fatu_hiva',
    elderName: 'Oihanu',
    category: 'sanctuary',
    text: 'Bring Volcanic Obsidian Blanks from Hiva Oa so our builders can step a second crab-claw mast and finish your double-sail Vaka Moana.',
  }),
  sanctuary_fatu_hiva_complete: Object.freeze({
    id: 'sanctuary_fatu_hiva_complete',
    islandId: 'fatu_hiva',
    elderName: 'Oihanu',
    category: 'sanctuary',
    text: "Oihanu's builders step a second pandanus crab-claw sail and lash twin deep-sea hulls capable of carrying eight full baskets across the mist seas! 'Follow the Rising Whale's Spout, Fluke, and Shark's Tail at Dusk to reach outer Mangareva.'",
  }),
  sanctuary_mangareva_visit: Object.freeze({
    id: 'sanctuary_mangareva_visit',
    islandId: 'mangareva',
    elderName: 'Elder Rongo',
    category: 'sanctuary',
    text: "Elder Rongo points toward the pale mist-curtain brooding over the horizon. 'Follow the Setting Horse at Dusk where the Sea Turtle sinks astern and the Steadfast Peg lifts ahead; when morning sea-fog blinds every star, hold your steering sweep locked without wavering until Kaua'i's black crag pierces above the mist!'",
  }),
  sanctuary_mangareva_rei_miro: Object.freeze({
    id: 'sanctuary_mangareva_rei_miro',
    islandId: 'mangareva',
    elderName: 'Elder Rongo',
    category: 'sanctuary',
    text: "Elder Rongo gazes wide-eyed at the crescent Rei Miro and black obsidian blade from Te Pito o Te Henua. 'Our grandfathers spoke only in sacred chants of that three-volcano isle of giant stone ancestors! Your twin prows have sailed farther than legend—whenever you wish to return, sing the Whale's Spout at dusk back to Rapa Nui, or follow the Setting Horse toward Kaua'i.'",
  }),
  sanctuary_kauai_trial: Object.freeze({
    id: 'sanctuary_kauai_trial',
    islandId: 'kauai',
    elderName: 'Swell Master Pohaku',
    category: 'sanctuary',
    text: "Swell Master Pohaku closes his eyes and presses his palm to the wet sand. 'In these mist-seas stars vanish, yet the Great Ocean Swell never lies. Sail at Dawn on Song 14—let the swell lift your port cheek every four drum-beats into O'ahu's calm wave-shadow, and bring back Sacred Miro Drum-Timber!'",
  }),
  sanctuary_kauai_drum_complete: Object.freeze({
    id: 'sanctuary_kauai_drum_complete',
    islandId: 'kauai',
    elderName: 'Swell Master Pohaku',
    category: 'sanctuary',
    text: "Swell Master Pohaku hollows your O'ahu miro timber into a deep resonant Pahu drum! 'You sailed through blind mist by the feel of the ocean alone. Now cross to sacred Kiritimati (Song 15) to study the Steadfast Peg with Keeper Akura and provision for the Grand Voyage to ancestral Hawai'i!'",
  }),
  sanctuary_kauai_after_drum: Object.freeze({
    id: 'sanctuary_kauai_after_drum',
    islandId: 'kauai',
    elderName: 'Swell Master Pohaku',
    category: 'sanctuary',
    text: 'Your Pahu drum beats true with the deep ocean ridge. Sail Dusk on Song 15 to Kiritimati and follow the diamond swell refraction beneath its jade lagoon cloud.',
  }),
  sanctuary_oahu_visit: Object.freeze({
    id: 'sanctuary_oahu_visit',
    islandId: 'oahu',
    elderName: 'Elder Manu',
    category: 'sanctuary',
    text: "Elder Manu helps lash fragrant red miro timber onto your crossbeams. 'Sail back at Dusk on Return Chant 14R: hold the deep swell four beats upon your starboard cheek until Kaua'i's black crag rises above the morning mist!'",
  }),
  sanctuary_kiritimati_visit: Object.freeze({
    id: 'sanctuary_kiritimati_visit',
    islandId: 'kiritimati',
    elderName: 'Keeper Akura',
    category: 'sanctuary',
    text: "Keeper Akura cradles a still lagoon-water mirror reflecting the Steadfast Peg high above the sea. 'Here across the great waters, the Sea Turtle has sunk out of sight and the Steadfast Peg anchors our night sky! Study the Star-Stone Ring with me on Navigator's Shore, then sing Song 16 at Dawn all the way to ancestral Hawai'i!'",
  }),
  sanctuary_hawaii_finale: Object.freeze({
    id: 'sanctuary_hawaii_finale',
    islandId: 'hawaii',
    elderName: 'Council of Ancestral Wayfinders',
    category: 'sanctuary',
    text: 'Carved stone guardians watch silently over Kealakekua Bay beneath snow-crowned peaks as conch shells echo from cliff to sea. Across both skies—from the spinning Sea Turtle to the unmoving Steadfast Peg—you read cloud, bird, crossbeam shadow, star-house, and four-beat ocean swell. You are named Tupaia-Nui — Master Navigator!',
  }),
  sanctuary_hawaii_rei_miro: Object.freeze({
    id: 'sanctuary_hawaii_rei_miro',
    islandId: 'hawaii',
    elderName: 'Council of Ancestral Wayfinders',
    category: 'sanctuary',
    text: 'As conch shells echo from Kealakekua cliff to sea, the Ancestral Council bows before the crescent Rei Miro and obsidian blade borne all the way from Te Pito o Te Henua! Across all three ocean chains—and even to the silent navel rock beneath the spinning Sea Turtle—no horizon has escaped your twin prows. You are named Tupaia-Nui — Sovereign of Every Star Path!',
  }),
});

const allVoiceLines = { ...SANCTUARY_VOICE_LINES };

for (const lesson of Object.values(CONSTELLATION_LESSONS)) {
  const islName = ISLANDS[lesson.islandId]?.name || 'shore';
  allVoiceLines[lesson.promptVoiceId] = Object.freeze({
    id: lesson.promptVoiceId,
    islandId: lesson.islandId,
    elderName: lesson.elderName,
    category: 'prompt',
    text: `Before you cast off from ${islName}, ${lesson.elderName} wishes to guide your eyes at the Star-Stone Ring to recognize ${lesson.title}. Until you receive this teaching, its chalk lines, star names, and animal shape will remain hidden in the night sky.`,
  });
  for (const beat of lesson.beats) {
    allVoiceLines[beat.voiceId] = Object.freeze({
      id: beat.voiceId,
      islandId: lesson.islandId,
      elderName: lesson.elderName,
      category: 'vigil',
      text: beat.speech,
    });
  }
}

for (const sandLesson of Object.values(SAND_LESSONS)) {
  const voiceId = sandLesson.voiceId || sandLesson.id;
  allVoiceLines[voiceId] = Object.freeze({
    id: voiceId,
    islandId: sandLesson.islandId,
    elderName: sandLesson.mentor,
    category: 'sand',
    text: sandLesson.narration,
  });
}

export const VOICE_LINES = Object.freeze(allVoiceLines);

export function getVoiceLine(voiceId) {
  return voiceId ? VOICE_LINES[voiceId] || null : null;
}
