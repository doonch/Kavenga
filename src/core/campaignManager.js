/**
 * Full Campaign Progression, Island POI Interactions, Quest Trades, Canoe Maintenance,
 * Crew Recruitment, Vaka Upgrades, and Available Route Builder across Acts I, II, and III.
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { ISLANDS } from '../data/islandsData.js';
import { SAND_LESSONS } from '../data/sandDiagramsData.js';
import { SONGS, buildReturnSong } from '../data/songsData.js';

export const CARGO_CATALOG = Object.freeze({
  kava_bundle: {
    id: 'kava_bundle',
    name: 'Medicinal Kava Bundle',
    description: "Fragrant root bundle wrapped in ti leaves, sought by Elder Ari'i on Huahine.",
  },
  red_kura_feathers: {
    id: 'red_kura_feathers',
    name: 'Ceremonial Red Kura Feathers',
    description: "Sacred crimson tropicbird feathers for Marae Taputapuatea on Ra'iatea.",
  },
  pearl_shell_lures: {
    id: 'pearl_shell_lures',
    name: 'Giant Pearl-Shell Lures',
    description: "Iridescent lagoon trolling lures prized by Vaihere's canoe-wrights on Mo'orea.",
  },
  polished_basalt_adze: {
    id: 'polished_basalt_adze',
    name: 'Polished Basalt Adze',
    description: "Ceremonial black-stone adze lashed in sennit, worthy of First Master Tera'i on Maupiti.",
  },
  bone_harpoon_heads: {
    id: 'bone_harpoon_heads',
    name: 'Carved Bone Harpoon Heads',
    description: 'Barbed sea-hunter points carved on Ua Pou for the lagoon divers of Rangiroa.',
  },
  pearl_star_discs: {
    id: 'pearl_star_discs',
    name: 'Mother-of-Pearl Star Discs',
    description: 'Shining shell discs inlaid into ceremonial tiki eyes by the carvers of Hiva Oa.',
  },
  obsidian_adze_blanks: {
    id: 'obsidian_adze_blanks',
    name: 'Volcanic Obsidian Blanks',
    description: 'Razor-sharp volcanic glass prized by Master Canoe-Builder Oihanu on Fatu Hiva.',
  },
  miro_drum_wood: {
    id: 'miro_drum_wood',
    name: 'Sacred Miro Drum-Timber',
    description: "Resonant heartwood from foggy O'ahu needed by Swell Master Pohaku on Kaua'i.",
  },
  sacred_tridacna_shell: {
    id: 'sacred_tridacna_shell',
    name: 'Sacred Giant Tridacna Shell',
    description: "Ancient fluted lagoon shell carried from Kiritimati to the Great Ancestral Ahu of Hawai'i.",
  },
});

export const CREW_CATALOG = Object.freeze({
  tama: {
    id: 'tama',
    name: 'Tama',
    role: 'Lagoon Fisher',
    homeIslandId: 'tahaa',
    portrait: './assets/crew/tama.webp',
    traitText: 'Doubles fresh catch from midday leaping fish schools and steadies crew rations.',
  },
  moana: {
    id: 'moana',
    name: 'Moana',
    role: 'Master Sail-Tender',
    homeIslandId: 'ua_pou',
    portrait: './assets/crew/moana.webp',
    traitText: 'Trims the woven pandanus crab-claw sail to halve sideways crosswind leeway.',
  },
  kahu: {
    id: 'kahu',
    name: 'Kahu',
    role: 'Master Hull-Wright',
    homeIslandId: 'hiva_oa',
    portrait: './assets/crew/kahu.webp',
    traitText: 'Tends crossbeam sennit lashings and halves sea wear and hull drift.',
  },
});

export const POI_LABELS = Object.freeze({
  canoe_landing: 'Canoe Landing & Beach Careening',
  lagoon_beach: 'Quiet Coral Lagoon Landing',
  canoe_yard_beach: "Vaihere's Canoe-Yard Beach",
  reef_pass_beach: 'Foaming Reef-Pass Landing',
  taiohae_beach: 'Taiohae Sheltered Bay',
  pebble_cove: 'Basalt Pebble Cove',
  lagoon_pass_beach: 'Great Lagoon Pass Landing',
  black_sand_landing: 'Black Volcanic Sand Landing',
  waterfall_bay: 'Waterfall Bay Careening Shore',
  mist_border_beach: 'Mist-Border Lagoon Beach',
  black_sand_cove: 'Fortress Crag Cove',
  barrier_beach: 'Fog-Shrouded Barrier Beach',
  coral_pass_landing: 'Sacred Coral Pass Landing',
  kealakekua_golden_beach: 'Kealakekua Ancestral Sands',

  navigators_shore: "Navigator's Teaching Sand",
  master_terai_sand: "First Master Tera'i's Star-Ring Sand",
  master_pohaku_sand: "Swell Master Pohaku's Drum & Pebble Shore",

  marae_taputapuatea: 'Marae Taputapuatea & Village',
  hillside_village: "Hina's Hillside Hearth",
  twin_bay_village: "Ari'i's Twin-Bay Sail Loft",
  wild_rookery_outpost: 'Wild Seabird Rookery & Pearl Shallows',
  spire_foot_marae: 'Spire-Foot Adze Sanctuary',
  cliff_sanctuary: "Master Tera'i's Cliff Sanctuary",
  chiefs_marae: "Master Teiki's Great Marae",
  carvers_terrace: "Vaea's Bone-Carvers' Terrace",
  pearl_divers_village: "Tane's Pearl-Divers' Village",
  tiki_quarry: "Tahia's Volcanic Quarry",
  master_canoe_shed: "Oihanu's Great Vaka Moana Shed",
  lagoon_marae: "Elder Rongo's Gateway Marae",
  high_crag_pa: "Pohaku's High Crag Sanctuary",
  miro_forest_grove: 'Misty Miro Timber Grove',
  fishers_hearth: "Elder Manu's Warm Hearth",
  sacred_lagoon_shrine: "Keeper Akura's Star-Mirror Shrine",
  drying_racks: 'Provisioning & Drying Racks',
  great_ancestral_ahu: 'The Great Ancestral Heiau Ahu',
});

function grantCargoWithSlotSafety(gameState, itemId) {
  if (gameState.hasCargoItem(itemId)) return true;
  if (gameState.getFreeCargoSlots() <= 0) {
    // Trim loaded rations by 1 basket ashore so quest gifts are never blocked
    const trimmed = Math.max(1, gameState.maxCargoSlots - gameState.cargoItems.length - 1);
    gameState.loadedRations = Math.min(gameState.loadedRations, trimmed);
  }
  return gameState.addCargoItem(itemId);
}

/**
 * Applies post-voyage landfall updates (discovery, natural sea wear, initial island song hooks).
 */
export function onVoyageLandfall(gameState, islandId) {
  const isl = ISLANDS[islandId];
  if (!isl) return [];
  const notes = [];

  const wasNew = !gameState.discoveredIslands[islandId];
  gameState.markIslandDiscovered(islandId, isl.basinId);
  if (wasNew) {
    notes.push(`Charted ${isl.name} (${isl.subtitle}) in your memory.`);
  }

  // Mild natural sea wear from the crossing (halved if Kahu is aboard)
  const wear = gameState.hasHullWright() ? 2.5 : 5.0;
  gameState.hullCondition = Math.max(46.0, gameState.hullCondition - wear);
  gameState.sailCondition = Math.max(46.0, gameState.sailCondition - wear);
  gameState.lashingsCondition = Math.max(46.0, gameState.lashingsCondition - wear);

  // Unlock immediate teaching sand lessons on arrival if the island has a shore mentor
  for (const lessonId of isl.sandLessons || []) {
    if (!gameState.learnedSandLessons[lessonId]) {
      gameState.learnSandLesson(lessonId);
    }
  }

  // Kaua'i immediately grants the initial fog-swell trial (Song 14 to O'ahu) on arrival
  if (islandId === 'kauai' && isl.rewards?.initialSong) {
    if (!gameState.learnedSongs[isl.rewards.initialSong]) {
      gameState.learnSong(isl.rewards.initialSong);
      notes.push(
        "Swell Master Pohaku awaits on the black sand to teach the Four Swell Voices toward O'ahu."
      );
    }
  }

  // Hawai'i Grand Finale unlock!
  if (islandId === 'hawaii') {
    gameState.completedQuests.hawaii_finale = true;
    if (!gameState.masterReplayUnlocked) {
      gameState.masterReplayUnlocked = true;
      notes.push(
        'Ancestral Wayfinders honor your arrival! Master Navigator mode (pure raw starfield & sea silence) is now unlocked.'
      );
    }
  }

  gameState.saveToLocalStorage();
  return notes;
}

/**
 * Repairs hull, sail, and sennit lashings at an inhabited island's Canoe Landing & restocks rations.
 */
export function performBeachCareeningAndRestock(gameState) {
  const isl = ISLANDS[gameState.currentIslandId];
  if (!isl) return 'No shore landing available.';

  const actions = [];
  if (isl.inhabited) {
    // Before Mo'orea/Huahine/Taha'a artisan upgrades in Act I, basic beach careening restores up to 85%
    // unless that system's master artisan has already brought it to 100%!
    const cap =
      isl.act >= 2 || gameState.completedQuests.moorea_trade ? 100.0 : 88.0;
    if (gameState.hullCondition < cap) gameState.hullCondition = cap;
    if (gameState.sailCondition < cap) gameState.sailCondition = cap;
    if (gameState.lashingsCondition < cap) gameState.lashingsCondition = cap;
    actions.push('Tightened sennit lashings, patched pandanus sail, and caulked twin hulls.');
  } else {
    actions.push('Gathered fresh coconuts and clear lagoon water along the wild shore.');
  }

  const maxRations = Math.max(1, gameState.maxCargoSlots - gameState.cargoItems.length);
  gameState.loadedRations = maxRations;
  actions.push(`Restocked ${maxRations} woven ration baskets for the next crossing.`);
  gameState.saveToLocalStorage();
  return actions.join(' ');
}

/**
 * Executes the Village / Marae / Outpost quest interaction on the current island.
 * Returns { title, speech, unlockedItems, canCompleteNow } with strictly cue-relative copy.
 */
export function interactWithIslandSanctuary(gameState) {
  const id = gameState.currentIslandId;
  const isl = ISLANDS[id];
  if (!isl) {
    return { title: 'Quiet Shore', speech: 'Waves lap gently against the coral.', rewardsList: [] };
  }

  const rewardsList = [];

  // 1. RA'IATEA (Home Sacred Island — Act I Consecration Gate for Song 6)
  if (id === 'raiatea') {
    if (gameState.completedQuests.raiatea_consecration) {
      return {
        title: 'Elder Metua at Marae Taputapuatea',
        speech:
          "Your consecrated vaka gleams in the lagoon light. Remember our sand wake-lesson: when strong beam winds push your hulls on the midnight crossing to Maupiti, glance astern and lean half a prow into the wind.",
        rewardsList: ['Song 6 (The Outer Pass of Maupiti) is ready at Canoe Landing.'],
      };
    }

    if (gameState.hasCargoItem('red_kura_feathers')) {
      // Bring canoe to 100% consecration readiness
      gameState.hullCondition = 100.0;
      gameState.sailCondition = 100.0;
      gameState.lashingsCondition = 100.0;
      gameState.removeCargoItem('red_kura_feathers');
      gameState.learnSandLesson('sand_raiatea_leeway');
      gameState.learnSong('song_06');
      gameState.completedQuests.raiatea_consecration = true;
      gameState.loadedRations = Math.max(
        gameState.loadedRations,
        gameState.maxCargoSlots - gameState.cargoItems.length
      );
      rewardsList.push('Consecrated Canoe at 100% Readiness');
      rewardsList.push('Learned Sand Lesson: Reading Crosswind Leeway in the Wake');
      rewardsList.push('Learned Song 6: The Outer Pass of Maupiti');
      gameState.saveToLocalStorage();
      return {
        title: 'Consecration at Marae Taputapuatea',
        speech:
          "Elder Metua binds your crimson Kura feathers to the masthead pennant! 'You have circled the lagoon chain by cloud, bird, shadow, and star. Tonight I entrust you with the Midnight Chant to outer Maupiti.'",
        rewardsList,
      };
    }

    return {
      title: 'Elder Metua at Marae Taputapuatea',
      speech:
        "Welcome to sacred Taputapuatea, young wayfinder. Sail first at Dawn toward Taha'a's motionless peak cloud (Song 1). Return here with Ceremonial Red Kura Feathers and a restored canoe to earn the outer chant to Maupiti.",
      rewardsList: ['Active Goal: Sail Song 1 to Tahaʻa at Dawn.'],
    };
  }

  // 2. TAHA'A
  if (id === 'tahaa') {
    if (!gameState.completedQuests.tahaa_visit) {
      gameState.completedQuests.tahaa_visit = true;
      gameState.lashingsCondition = 100.0;
      gameState.recruitCrew('tama');
      grantCargoWithSlotSafety(gameState, 'kava_bundle');
      gameState.learnSandLesson('sand_tahaa_birds_and_shadow');
      gameState.learnSong('song_02');
      rewardsList.push('Braided Sennit Lashings restored to 100%');
      rewardsList.push('Recruited Crewmate: Tama (Lagoon Fisher)');
      rewardsList.push('Loaded Cargo: Medicinal Kava Bundle (for Huahine)');
      rewardsList.push('Learned Song 2: Beaks of the Morning Fisher');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Hina's Hillside Hearth",
      speech:
        "Hina binds fresh pandanus sennit across your crossbeams and motions to young Tama. 'Carry this Medicinal Kava to Elder Ari'i on twin-peaked Huahine. Launch at Dawn into the white terns' beaks, then hold the post shadow on your second left lashing!'",
      rewardsList,
    };
  }

  // 3. HUAHINE
  if (id === 'huahine') {
    if (!gameState.completedQuests.huahine_trade) {
      if (!gameState.hasCargoItem('kava_bundle')) {
        return {
          title: "Ari'i's Twin-Bay Sail Loft",
          speech:
            "Elder Ari'i gazes at the twilight sky. 'Bring me the Medicinal Kava Bundle from Hina on Taha'a, and we shall weave you a new pandanus sail and sing the night-star paths.'",
          rewardsList: ['Requires: Medicinal Kava Bundle from Tahaʻa.'],
        };
      }
      gameState.removeCargoItem('kava_bundle');
      gameState.completedQuests.huahine_trade = true;
      gameState.sailCondition = 100.0;
      gameState.learnSandLesson('sand_huahine_lapa_and_bull');
      gameState.learnSong('song_03');
      gameState.learnSong('song_04');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Woven Pandanus Sail restored to 100%');
      rewardsList.push('Learned Song 3 (Manuae Atoll) & Song 4 (Moʻorea)');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Ari'i's Twin-Bay Sail Loft",
      speech:
        "Ari'i breathes in the fragrant kava and unfurls a golden pandanus sail. 'Sail at Dusk toward the sinking sun and Setting Bull's Horn to find uninhabited Manuae glowing jade beneath the clouds—then carry its pearl lures onward to Mo'orea!'",
      rewardsList,
    };
  }

  // 4. MANUAE (Uninhabited Atoll Wild Outpost)
  if (id === 'manuae') {
    if (!gameState.completedQuests.manuae_harvest) {
      gameState.completedQuests.manuae_harvest = true;
      grantCargoWithSlotSafety(gameState, 'red_kura_feathers');
      grantCargoWithSlotSafety(gameState, 'pearl_shell_lures');
      gameState.loadedRations = Math.max(
        1,
        gameState.maxCargoSlots - gameState.cargoItems.length
      );
      rewardsList.push('Harvested Ceremonial Red Kura Feathers');
      rewardsList.push('Harvested Giant Pearl-Shell Lures');
      rewardsList.push('Restocked fresh coconuts & lagoon water');
      gameState.saveToLocalStorage();
    }
    return {
      title: 'Wild Seabird Rookery & Turquoise Shallows',
      speech:
        'White terns wheel above undisturbed coral motus while giant pearl shells glint in jade water. With red feathers and pearl lures lashed aboard, launch at Midday on Song 4 toward Moʻorea!',
      rewardsList,
    };
  }

  // 5. MO'OREA
  if (id === 'moorea') {
    if (!gameState.completedQuests.moorea_trade) {
      if (!gameState.hasCargoItem('pearl_shell_lures')) {
        return {
          title: "Vaihere's Spire-Foot Sanctuary",
          speech:
            "Canoe-Wright Vaihere taps your weathered hull planking. 'Bring Giant Pearl-Shell Lures from Manuae's lagoon, and my carvers will raise your gunwales to six cargo slots and gift you a Polished Basalt Adze.'",
          rewardsList: ['Requires: Giant Pearl-Shell Lures from Manuae.'],
        };
      }
      gameState.removeCargoItem('pearl_shell_lures');
      gameState.completedQuests.moorea_trade = true;
      gameState.hullCondition = 100.0;
      gameState.upgradeVakaTier(2);
      grantCargoWithSlotSafety(gameState, 'polished_basalt_adze');
      gameState.learnSandLesson('sand_moorea_two_star_handoff');
      gameState.learnSong('song_05');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Twin Hulls restored to 100% & Upgraded to 6 Cargo Slots!');
      rewardsList.push('Received Polished Basalt Adze (for First Master Teraʻi)');
      rewardsList.push("Learned Song 5: Return to Taputapuatea (Ra'iatea)");
      gameState.saveToLocalStorage();
    }
    return {
      title: "Vaihere's Spire-Foot Sanctuary",
      speech:
        "Vaihere runs her palm along your raised tamanu splash-strakes. 'Sail home to Ra'iatea at Dusk by handing the watch from Rising Bull's Horn down to Rising Rat's Nose—then consecrate your Kura feathers!'",
      rewardsList,
    };
  }

  // 6. MAUPITI (Act I Capstone -> Unlocks Act II Deep Crossing Song 7)
  if (id === 'maupiti') {
    if (!gameState.completedQuests.maupiti_master) {
      if (!gameState.hasCargoItem('polished_basalt_adze')) {
        return {
          title: "First Master Tera'i's Cliff Sanctuary",
          speech:
            "First Master Tera'i studies your wake through the foaming pass. 'Present the Polished Basalt Adze of Mo'orea's carvers, and I shall draw the Complete Twelve-Shell Star Ring in the wet sand.'",
          rewardsList: ['Requires: Polished Basalt Adze from Moʻorea.'],
        };
      }
      gameState.removeCargoItem('polished_basalt_adze');
      gameState.completedQuests.maupiti_master = true;
      gameState.learnSandLesson('sand_maupiti_12_shell_compass');
      gameState.learnSong('song_07');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Mastered the Complete Twelve-Shell Star Ring (10 Constellations)');
      rewardsList.push('Learned Song 7: Across the Empty Blue to Nuku Hiva (Act II)');
      gameState.saveToLocalStorage();
    }
    return {
      title: "First Master Tera'i's Cliff Sanctuary",
      speech:
        "Master Tera'i places twelve gleaming cowrie shells around a carved canoe mark in the sand. 'Beyond this reef lies empty ocean where all land sinks out of sight. Trust the three-star relay along the Boar's Path at Dusk to reach towering Nuku Hiva!'",
      rewardsList,
    };
  }

  // 7. NUKU HIVA (Act II Hub)
  if (id === 'nuku_hiva') {
    if (!gameState.completedQuests.nuku_hiva_visit) {
      gameState.completedQuests.nuku_hiva_visit = true;
      gameState.learnSandLesson('sand_nuku_hiva_polar_pivots');
      gameState.learnSong('song_08');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Learned Sand Lesson: The Two Horizon Pivots');
      rewardsList.push('Learned Song 8: Where the Horse Grazes the Foam (Ua Pou)');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Master Teiki's Great Marae",
      speech:
        "Master Teiki welcomes your ocean-crossed vaka beneath Nuku Hiva's valley cliffs. 'At Midnight the Horse's Crown skims low above the waves without drowning while the Sea Turtle spins in your wake. Follow the Grazing Horse to basalt-spired Ua Pou!'",
      rewardsList,
    };
  }

  // 8. UA POU
  if (id === 'ua_pou') {
    if (!gameState.completedQuests.ua_pou_visit) {
      gameState.completedQuests.ua_pou_visit = true;
      gameState.recruitCrew('moana');
      grantCargoWithSlotSafety(gameState, 'bone_harpoon_heads');
      gameState.learnSandLesson('sand_ua_pou_band1_horse');
      gameState.learnSong('song_09');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Recruited Crewmate: Moana (Master Sail-Tender — halves leeway)');
      rewardsList.push('Loaded Cargo: Carved Bone Harpoon Heads (for Rangiroa)');
      rewardsList.push('Learned Song 9: Three Lanterns Down to Rangiroa');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Vaea's Bone-Carvers' Terrace",
      speech:
        "Sail-Tender Moana steps aboard to tend your pandanus sheet while Vaea hands over carved harpoon heads. 'Sail at Dusk down three setting stars along the Horse's Path until Rangiroa's immense lagoon paints the dawn clouds jade!'",
      rewardsList,
    };
  }

  // 9. RANGIROA
  if (id === 'rangiroa') {
    if (!gameState.completedQuests.rangiroa_trade) {
      if (!gameState.hasCargoItem('bone_harpoon_heads')) {
        return {
          title: "Tane's Pearl-Divers' Village",
          speech: "Bring Carved Bone Harpoon Heads from Ua Pou to trade for our Mother-of-Pearl Star Discs.",
          rewardsList: ['Requires: Carved Bone Harpoon Heads from Ua Pou.'],
        };
      }
      gameState.removeCargoItem('bone_harpoon_heads');
      gameState.completedQuests.rangiroa_trade = true;
      grantCargoWithSlotSafety(gameState, 'pearl_star_discs');
      gameState.learnSandLesson('sand_rangiroa_stern_backsight');
      gameState.learnSong('song_10');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Loaded Cargo: Mother-of-Pearl Star Discs (for Hiva Oa)');
      rewardsList.push('Learned Song 10: The Cloud-Veiled Reach to Hiva Oa');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Tane's Pearl-Divers' Village",
      speech:
        "Tane presses luminous pearl star discs into your palm. 'Rain-squalls often curtain your prows halfway to Hiva Oa. When forward stars vanish, look straight back over your steering sweep and hold the Setting Gecko's Tongue centered in your wake!'",
      rewardsList,
    };
  }

  // 10. HIVA OA
  if (id === 'hiva_oa') {
    if (!gameState.completedQuests.hiva_oa_trade) {
      if (!gameState.hasCargoItem('pearl_star_discs')) {
        return {
          title: "Tahia's Volcanic Quarry",
          speech: "Bring Mother-of-Pearl Star Discs from Rangiroa's divers so we may inlay our ceremonial carvings.",
          rewardsList: ['Requires: Mother-of-Pearl Star Discs from Rangiroa.'],
        };
      }
      gameState.removeCargoItem('pearl_star_discs');
      gameState.completedQuests.hiva_oa_trade = true;
      gameState.recruitCrew('kahu');
      grantCargoWithSlotSafety(gameState, 'obsidian_adze_blanks');
      gameState.learnSandLesson('sand_hiva_oa_zenith_dogleg');
      gameState.learnSong('song_11');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Recruited Crewmate: Kahu (Master Hull-Wright — halves wear)');
      rewardsList.push('Loaded Cargo: Volcanic Obsidian Blanks (for Fatu Hiva)');
      rewardsList.push('Learned Song 11: Beneath the Overhead Gecko');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Tahia's Volcanic Quarry",
      speech:
        "Hull-Wright Kahu stows his sennit mallets on your deck. 'Sail toward the Sea Turtle's Pivot at Dusk while watching your mast-top: the moment the Gecko's Heart passes straight overhead, turn onto the Rising Shark's Jaw for Fatu Hiva!'",
      rewardsList,
    };
  }

  // 11. FATU HIVA
  if (id === 'fatu_hiva') {
    if (!gameState.completedQuests.fatu_hiva_upgrade) {
      if (!gameState.hasCargoItem('obsidian_adze_blanks')) {
        return {
          title: "Oihanu's Great Vaka Moana Shed",
          speech: 'Bring Volcanic Obsidian Blanks from Hiva Oa so our builders can finish your deep-sea Vaka Moana.',
          rewardsList: ['Requires: Volcanic Obsidian Blanks from Hiva Oa.'],
        };
      }
      gameState.removeCargoItem('obsidian_adze_blanks');
      gameState.completedQuests.fatu_hiva_upgrade = true;
      gameState.upgradeVakaTier(3);
      gameState.hullCondition = 100.0;
      gameState.sailCondition = 100.0;
      gameState.lashingsCondition = 100.0;
      gameState.learnSandLesson('sand_fatu_hiva_band5_whale');
      gameState.learnSong('song_12');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Upgraded to Deep-Ocean Vaka Moana (8 Cargo Slots, 100% Condition)!');
      rewardsList.push('Learned Song 12: Wake of the Great Whale (Mangareva)');
      gameState.saveToLocalStorage();
    }
    return {
      title: "Oihanu's Great Vaka Moana Shed",
      speech:
        "Oihanu's builders lash twin deep-sea hulls capable of carrying eight full baskets across the mist seas! 'Follow the Rising Whale's Spout, Fluke, and Shark's Tail at Dusk to reach outer Mangareva.'",
      rewardsList,
    };
  }

  // 12. MANGAREVA
  if (id === 'mangareva') {
    if (!gameState.completedQuests.mangareva_gateway) {
      gameState.completedQuests.mangareva_gateway = true;
      gameState.learnSandLesson('sand_mangareva_mist_warning');
      gameState.learnSong('song_13');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push("Learned Song 13: Edge of the Grey Curtain (Kaua'i — Act III)");
      gameState.saveToLocalStorage();
    }
    return {
      title: "Elder Rongo's Gateway Marae",
      speech:
        "Elder Rongo points toward the pale mist-curtain brooding over the horizon. 'Follow the Setting Horse at Dusk where the Sea Turtle sinks astern and the Steadfast Peg lifts ahead; when morning sea-fog blinds every star, hold your steering sweep locked without wavering until Kaua'i's black crag pierces above the mist!'",
      rewardsList,
    };
  }

  // 13. KAUA'I (Act III Swell Master Hub)
  if (id === 'kauai') {
    gameState.learnSong('song_14');
    gameState.learnSandLesson('sand_kauai_four_swell_voices');
    gameState.learnSandLesson('sand_kauai_refraction_lattice');

    if (
      !gameState.completedQuests.kauai_drum &&
      gameState.hasCargoItem('miro_drum_wood')
    ) {
      gameState.removeCargoItem('miro_drum_wood');
      gameState.completedQuests.kauai_drum = true;
      gameState.hullCondition = 100.0;
      gameState.sailCondition = 100.0;
      gameState.lashingsCondition = 100.0;
      gameState.learnSong('song_15');
      gameState.learnSong('song_16');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Carved the Sacred Pahu Swell-Drum & Restored Vaka to 100%!');
      rewardsList.push("Learned Song 15 (Kiritimati) & Song 16 (The Great Chant of Hawai'i)!");
      gameState.saveToLocalStorage();
      return {
        title: "Swell Master Pohaku's High Crag Sanctuary",
        speech:
          "Swell Master Pohaku hollows your O'ahu miro timber into a deep resonant Pahu drum! 'You sailed through blind mist by the feel of the ocean alone. Now cross to sacred Kiritimati (Song 15) to study the Steadfast Peg with Keeper Akura and provision for the Grand Voyage to ancestral Hawai'i!'",
        rewardsList,
      };
    }

    if (gameState.completedQuests.kauai_drum) {
      return {
        title: "Swell Master Pohaku's High Crag Sanctuary",
        speech:
          'Your Pahu drum beats true with the deep ocean ridge. Sail Dusk on Song 15 to Kiritimati and follow the diamond swell refraction beneath its jade lagoon cloud.',
        rewardsList: ["Song 15 (Kiritimati) & Song 16 (Hawai'i) unlocked."],
      };
    }

    return {
      title: "Swell Master Pohaku's Drum & Pebble Shore",
      speech:
        "Swell Master Pohaku closes his eyes and presses his palm to the wet sand. 'In these mist-seas stars vanish, yet the Great Ocean Swell never lies. Sail at Dawn on Song 14—let the swell lift your port cheek every four drum-beats into O'ahu's calm wave-shadow, and bring back Sacred Miro Drum-Timber!'",
      rewardsList: ["Active Trial: Sail Song 14 to O'ahu at Dawn and bring back Miro Drum-Timber."],
    };
  }

  // 14. O'AHU
  if (id === 'oahu') {
    if (!gameState.completedQuests.oahu_timber) {
      gameState.completedQuests.oahu_timber = true;
      grantCargoWithSlotSafety(gameState, 'miro_drum_wood');
      gameState.learnSandLesson('sand_oahu_return_swell');
      gameState.learnSong('song_14r');
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push("Harvested Sacred Miro Drum-Timber (for Pohaku on Kaua'i)");
      rewardsList.push("Learned Song 14R: Echo of the Fortress Crag (Return to Kaua'i)");
      gameState.saveToLocalStorage();
    }
    return {
      title: 'Misty Miro Timber Grove & Hearth',
      speech:
        "Elder Manu helps lash fragrant red miro timber onto your crossbeams. 'Sail back at Dusk on Return Chant 14R: hold the deep swell four beats upon your starboard cheek until Kaua'i's black crag rises above the morning mist!'",
      rewardsList,
    };
  }

  // 15. KIRITIMATI (Northern Hemisphere Star Master & Shrine Keeper)
  if (id === 'kiritimati') {
    if (!gameState.completedQuests.kiritimati_prep) {
      gameState.completedQuests.kiritimati_prep = true;
      grantCargoWithSlotSafety(gameState, 'sacred_tridacna_shell');
      gameState.learnSandLesson('sand_kiritimati_grand_voyage_prep');
      gameState.learnSong('song_16');
      gameState.hullCondition = 100.0;
      gameState.sailCondition = 100.0;
      gameState.lashingsCondition = 100.0;
      gameState.loadedRations = gameState.maxCargoSlots - gameState.cargoItems.length;
      rewardsList.push('Loaded Sacred Giant Tridacna Shell');
      rewardsList.push('Full Grand-Voyage Provisioning & 100% Careening');
      rewardsList.push("Ready for Song 16: The Great Chant of Hawai'i (Dawn Departure)");
      gameState.saveToLocalStorage();
    }
    return {
      title: "Keeper Akura's Sacred Star-Mirror Shrine",
      speech:
        "Keeper Akura cradles a still lagoon-water mirror reflecting the Steadfast Peg high above the sea. 'Here across the great waters, the Sea Turtle has sunk out of sight and the Steadfast Peg anchors our night sky! Study the Star-Stone Ring with me on Navigator's Shore, then sing Song 16 at Dawn all the way to ancestral Hawai'i!'",
      rewardsList,
    };
  }

  // 16. HAWAI'I (Grand Finale!)
  if (id === 'hawaii') {
    gameState.masterReplayUnlocked = true;
    gameState.completedQuests.hawaii_finale = true;
    if (gameState.hasCargoItem('sacred_tridacna_shell')) {
      gameState.removeCargoItem('sacred_tridacna_shell');
      rewardsList.push('Placed Sacred Tridacna Shell upon the Great Ancestral Heiau Ahu!');
    }
    rewardsList.push('Master Navigator Mode Unlocked (Replay any of the 17 Chants!)');
    gameState.saveToLocalStorage();
    return {
      title: 'Council of Ancestral Wayfinders — Great Heiau Ahu',
      speech:
        'Carved stone guardians watch silently over Kealakekua Bay beneath snow-crowned peaks as conch shells echo from cliff to sea. Across both skies—from the spinning Sea Turtle to the unmoving Steadfast Peg—you read cloud, bird, crossbeam shadow, star-house, and four-beat ocean swell. You are named Tupaia-Nui — Master Navigator!',
      rewardsList,
    };
  }

  return {
    title: isl.name,
    speech: 'The ocean breeze stirs the palms along the shore.',
    rewardsList,
  };
}

/**
 * Returns all playable routes from the player's current island (authored learned songs + return chants to discovered basin islands).
 * Once Master Navigator replay is unlocked, also offers a "Free Replay Any Route" list.
 */
export function getAvailableRoutesFromCurrentIsland(gameState) {
  const fromId = gameState.currentIslandId;
  const routes = [];
  const coveredTargets = new Set();

  for (const song of Object.values(SONGS)) {
    if (song.fromIsland === fromId && gameState.learnedSongs[song.id]) {
      routes.push({ song, isReturn: song.id === 'song_14r' });
      coveredTargets.add(song.toIsland);
    }
  }

  // Add reversed return chants to any already-discovered island in the same regional basin
  const curIsl = ISLANDS[fromId];
  if (curIsl) {
    for (const [islId, discovered] of Object.entries(gameState.discoveredIslands)) {
      if (!discovered || islId === fromId || coveredTargets.has(islId)) continue;
      const dst = ISLANDS[islId];
      if (dst && dst.basinId === curIsl.basinId) {
        const retSong = buildReturnSong(fromId, islId);
        if (retSong) {
          routes.push({ song: retSong, isReturn: true });
          coveredTargets.add(islId);
        }
      }
    }
  }

  return routes;
}

/**
 * Returns sand lessons available for inspection on the current island (or all learned lessons).
 */
export function getLearnedSandLessonsList(gameState) {
  const curIsl = ISLANDS[gameState.currentIslandId];
  const localIds = curIsl?.sandLessons || [];
  const ordered = [];
  const seen = new Set();

  for (const id of localIds) {
    if (SAND_LESSONS[id]) {
      ordered.push(SAND_LESSONS[id]);
      seen.add(id);
    }
  }
  for (const [id, unlocked] of Object.entries(gameState.learnedSandLessons)) {
    if (unlocked && !seen.has(id) && SAND_LESSONS[id]) {
      ordered.push(SAND_LESSONS[id]);
      seen.add(id);
    }
  }
  return ordered;
}
