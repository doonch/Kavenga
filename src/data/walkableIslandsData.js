/**
 * Declarative configurations for Optional 3D Walkable Shore Mode in Kavenga: Songs of the Star Path.
 *
 * All 17 islands default to the Unified 3D Shore Diorama Stage (`ShoreDioramaRenderer` + `IslandHubUI`).
 * On these 4 showcase islands, players may optionally click `Walk Ashore` to walk directly upon
 * the EXACT canonical 3D island mesh (`IslandTerrainBuilder`) seen from the ocean & map room:
 *  - `raiatea`  ("Sacred High Island" — Act I opening & return consecration island)
 *  - `tahaa`    ("Sheltered Lagoon Isle" — Act I clover-leaf bay, Hina & Fisher Tama)
 *  - `hawaii`   ("Ancestral Mauna Horizon" — Act III snow-crowned & lava-lit Grand Finale)
 *  - `rapa_nui` ("Te Pito o Te Henua" — Secret uninhabited Moai monolith island)
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

export const WALKABLE_ISLAND_IDS = Object.freeze(
  new Set(['raiatea', 'tahaa', 'hawaii', 'rapa_nui'])
);

export function isWalkableIsland(islandId) {
  return WALKABLE_ISLAND_IDS.has(islandId);
}

export const WALKABLE_ISLAND_SPECS = Object.freeze({
  // =========================================================================
  // 1. RA'IATEA — Sacred High Island (Mount Temehani & Marae Taputapuatea)
  // =========================================================================
  raiatea: Object.freeze({
    islandId: 'raiatea',
    canonicalScale: 1.55,
    gridHalfSpan: 115.0,
    walkSpeedMps: 6.8,
    sprintSpeedMps: 9.4,
    solarHourBase: 8.85,
    initialSpawn: Object.freeze({
      x: -8.6,
      z: 57.2,
      facingYawRad: -0.36,
      camYawRad: 0.24,
    }),
    vigilExitSpawn: Object.freeze({
      x: 0.0,
      z: 48.2,
      facingYawRad: 0.0,
    }),
    mooredCanoe: Object.freeze({
      x: -15.8,
      z: 64.2,
      yawRad: 2.52,
    }),
    pois: Object.freeze([
      Object.freeze({
        id: 'canoe_landing',
        kind: 'canoe',
        hubTab: 'landing',
        glyph: '🛶',
        label: 'Voyaging Canoe',
        title: 'Moored Voyaging Canoe — Te Vaka Moana',
        subtitle: 'Inspect readiness, choose your route chant & tide-light, and set sail',
        promptHint: 'Board Canoe & Set Sail',
        x: -13.2,
        z: 59.5,
        triggerRadiusM: 4.6,
        markerRadiusM: 3.1,
        arrivalSpot: Object.freeze({
          x: -11.2,
          z: 58.0,
          facingYawRad: 2.31,
          camYawRad: 2.15,
        }),
      }),
      Object.freeze({
        id: 'provisioning_hut',
        kind: 'hut',
        hubTab: 'landing',
        glyph: '🛖',
        label: "Craftsmen's & Ration Hut",
        title: "Provisioning & Canoe-Wrights' Hut",
        subtitle: 'Refill woven ration baskets, careen hulls, and speak with the boatbuilders',
        promptHint: 'Refill Rations & Speak to Craftsmen',
        craftsmanName: "Master Boatbuilder Tahu'a",
        craftsmanQuote:
          'We keep fresh breadfruit paste, husked coconuts, and sweet water gourds ready beneath the thatch. Before a long crossing, let us tighten your crossbeam sennit and caulk both hulls.',
        x: -25.0,
        z: 51.0,
        triggerRadiusM: 5.8,
        markerRadiusM: 3.8,
        arrivalSpot: Object.freeze({
          x: -23.0,
          z: 52.8,
          facingYawRad: 0.42,
          camYawRad: 0.38,
        }),
      }),
      Object.freeze({
        id: 'observation_circle',
        kind: 'circle',
        hubTab: 'sand',
        glyph: '🐚',
        label: 'Observation Knoll & Sand',
        title: 'Coastal Observation Circle & Teaching Sand',
        subtitle: 'Trace stick-in-the-sand wave & cloud lessons or enter the Night-Sky Vigil',
        promptHint: 'Study Teaching Sand & Sky Circle',
        circleDesc:
          'From this breezy basalt stone ring overlooking the reef pass, wayfinders trace wave, cloud, and wake lessons in swept coral sand — or watch the constellations wheel overhead in stillness.',
        x: 0.0,
        z: 46.5,
        triggerRadiusM: 5.6,
        markerRadiusM: 3.6,
        arrivalSpot: Object.freeze({
          x: 0.0,
          z: 49.0,
          facingYawRad: 0.0,
          camYawRad: 0.08,
        }),
      }),
      Object.freeze({
        id: 'elder_marae',
        kind: 'elder',
        hubTab: 'sanctuary',
        glyph: '🌺',
        label: 'Elder Metua · Sacred Marae',
        title: 'Elder Metua at Marae Taputapuatea',
        subtitle: 'Seek the Marae Elder’s star-path counsel and consecrate your voyaging canoe',
        promptHint: 'Speak with Elder Metua',
        x: 24.5,
        z: 47.0,
        triggerRadiusM: 6.0,
        markerRadiusM: 4.0,
        arrivalSpot: Object.freeze({
          x: 22.0,
          z: 48.2,
          facingYawRad: -1.84,
          camYawRad: -1.78,
        }),
      }),
    ]),
  }),

  // =========================================================================
  // 2. TAHA'A — Sheltered Lagoon Isle (5-Lobed Bay, Hina & Fisher Tama)
  // =========================================================================
  tahaa: Object.freeze({
    islandId: 'tahaa',
    canonicalScale: 1.55,
    gridHalfSpan: 115.0,
    walkSpeedMps: 6.8,
    sprintSpeedMps: 9.4,
    solarHourBase: 9.15,
    initialSpawn: Object.freeze({
      x: 4.2,
      z: 38.0,
      facingYawRad: -0.35,
      camYawRad: 0.22,
    }),
    vigilExitSpawn: Object.freeze({
      x: 0.0,
      z: 33.8,
      facingYawRad: 0.0,
    }),
    mooredCanoe: Object.freeze({
      x: -4.8,
      z: 42.6,
      yawRad: 2.52,
    }),
    pois: Object.freeze([
      Object.freeze({
        id: 'canoe_landing',
        kind: 'canoe',
        hubTab: 'landing',
        glyph: '🛶',
        label: 'Bay Jetty & Canoe',
        title: 'Moored Voyaging Canoe — Sheltered Bay Jetty',
        subtitle: 'Check lashed rations, pick your tide-light, and push off across the lagoon',
        promptHint: 'Board Canoe & Set Sail',
        x: -2.6,
        z: 38.6,
        triggerRadiusM: 4.5,
        markerRadiusM: 3.0,
        arrivalSpot: Object.freeze({
          x: -1.4,
          z: 37.2,
          facingYawRad: 2.3,
          camYawRad: 2.15,
        }),
      }),
      Object.freeze({
        id: 'provisioning_hut',
        kind: 'hut',
        hubTab: 'landing',
        glyph: '🛖',
        label: 'Sennit & Fish-Drying Fare',
        title: 'Sennit-Braiders & Fish-Drying Fare',
        subtitle: 'Refill smoked lagoon rations, mend hulls, and inspect coiled sennit cordage',
        promptHint: 'Refill Rations & Speak to Artisans',
        craftsmanName: 'Sennit Artisan Marama',
        craftsmanQuote:
          'Our sheltered clover-leaf bays teem with bonito and sweet coconut fiber. Let us pack smoked fish into your woven baskets and check every crossbeam lashing before Huahine.',
        x: -16.5,
        z: 39.2,
        triggerRadiusM: 5.6,
        markerRadiusM: 3.6,
        arrivalSpot: Object.freeze({
          x: -14.2,
          z: 39.6,
          facingYawRad: 0.35,
          camYawRad: 0.36,
        }),
      }),
      Object.freeze({
        id: 'observation_circle',
        kind: 'circle',
        hubTab: 'sand',
        glyph: '🐚',
        label: 'Sighting-Post Sand Shore',
        title: 'Coral Sighting-Post & Teaching Sand',
        subtitle: 'Study morning bird & post-shadow sand diagrams or enter the Night-Sky Vigil',
        promptHint: 'Study Post-Shadow Sand & Sky',
        circleDesc:
          'Ringed with giant clam shells on a breezy coral knoll above the calm bay, this upright wooden post casts crisp sun-shadows across swept cream sand — teaching how deck lashings hold a morning course.',
        x: 0.0,
        z: 31.2,
        triggerRadiusM: 5.4,
        markerRadiusM: 3.5,
        arrivalSpot: Object.freeze({
          x: 0.0,
          z: 33.6,
          facingYawRad: 0.0,
          camYawRad: 0.08,
        }),
      }),
      Object.freeze({
        id: 'elder_marae',
        kind: 'elder',
        hubTab: 'sanctuary',
        glyph: '🌺',
        label: "Hina's Hillside Hearth",
        title: "Hina's Hillside Hearth & Kava Terrace",
        subtitle: 'Greet Fisher-Navigator Hina, recruit young Tama, and receive Song 2 to Huahine',
        promptHint: 'Speak with Hina & Tama',
        introTitle: 'Hina & Young Fisher Tama Await by the Hearth',
        introSpeech:
          'Beneath fragrant pandanus eaves overlooking the shared lagoon, Hina braids fresh sennit cordage while young Tama readies his pearl-shell trolling lines to join your crew.',
        x: 21.5,
        z: 46.8,
        triggerRadiusM: 6.0,
        markerRadiusM: 4.0,
        arrivalSpot: Object.freeze({
          x: 19.2,
          z: 47.4,
          facingYawRad: -1.82,
          camYawRad: -1.75,
        }),
      }),
    ]),
  }),

  // =========================================================================
  // 3. HAWAI'I — Ancestral Mauna Horizon (Snow-Capped Mauna, Lava & Great Heiau)
  // =========================================================================
  hawaii: Object.freeze({
    islandId: 'hawaii',
    canonicalScale: 1.55,
    gridHalfSpan: 115.0,
    walkSpeedMps: 6.8,
    sprintSpeedMps: 9.4,
    solarHourBase: 17.35,
    initialSpawn: Object.freeze({
      x: -10.5,
      z: 50.8,
      facingYawRad: -0.4,
      camYawRad: 0.25,
    }),
    vigilExitSpawn: Object.freeze({
      x: -14.0,
      z: 45.2,
      facingYawRad: 0.0,
    }),
    mooredCanoe: Object.freeze({
      x: -15.2,
      z: 55.6,
      yawRad: 2.56,
    }),
    pois: Object.freeze([
      Object.freeze({
        id: 'canoe_landing',
        kind: 'canoe',
        hubTab: 'landing',
        glyph: '🛶',
        label: 'Kealakekua Canoe Landing',
        title: 'Moored Voyaging Canoe — Kealakekua Sands',
        subtitle: 'Inspect your deep-ocean vaka and launch return or Master Anthology crossings',
        promptHint: 'Board Canoe & Set Sail',
        x: -14.2,
        z: 54.0,
        triggerRadiusM: 4.5,
        markerRadiusM: 3.1,
        arrivalSpot: Object.freeze({
          x: -12.2,
          z: 52.4,
          facingYawRad: 2.31,
          camYawRad: 2.15,
        }),
      }),
      Object.freeze({
        id: 'provisioning_hut',
        kind: 'hut',
        hubTab: 'landing',
        glyph: '🛖',
        label: 'Royal Canoe Shed',
        title: "Hālau Wa'a — Royal Koa Canoe Shed",
        subtitle: 'Careen hulls, replenish kalo & water gourds, and speak with master builders',
        promptHint: 'Refill Rations & Speak to Builders',
        craftsmanName: "Master Kahuna Kālai Wa'a Keoni",
        craftsmanQuote:
          'Under this high pili-grass gable rest seasoned koa spars, pounded kalo, and cold water carried down from the snow-crowned summit above Kealakekua Bay.',
        x: -29.0,
        z: 46.8,
        triggerRadiusM: 5.8,
        markerRadiusM: 3.8,
        arrivalSpot: Object.freeze({
          x: -26.5,
          z: 48.0,
          facingYawRad: 0.35,
          camYawRad: 0.38,
        }),
      }),
      Object.freeze({
        id: 'observation_circle',
        kind: 'circle',
        hubTab: 'sand',
        glyph: '🐚',
        label: 'Mauna Star-Gourd Knoll',
        title: 'Volcanic Star-Gourd Ring & Teaching Sand',
        subtitle: 'Review all star-path sand diagrams or sight the Steadfast Peg in Night-Sky Vigil',
        promptHint: 'Study Star-Gourd Ring & Sky',
        circleDesc:
          'High on a black basalt bluff between snow-dusted Mauna summits and glowing volcanic fissures, wayfinders sight the unmoving Steadfast Peg and trace every wave and star diagram.',
        x: -14.5,
        z: 42.8,
        triggerRadiusM: 5.6,
        markerRadiusM: 3.6,
        arrivalSpot: Object.freeze({
          x: -14.2,
          z: 45.4,
          facingYawRad: 0.0,
          camYawRad: 0.08,
        }),
      }),
      Object.freeze({
        id: 'elder_marae',
        kind: 'elder',
        hubTab: 'sanctuary',
        glyph: '🌺',
        label: 'Great Ancestral Heiau',
        title: 'The Great Ancestral Heiau Ahu',
        subtitle: 'Meet the Council of Ancestral Wayfinders and unlock Master Navigator Anthology',
        promptHint: 'Greet Ancestral Wayfinders',
        introTitle: 'Council of Ancestral Wayfinders Before the Oracle Tower',
        introSpeech:
          'Conch shells echo from the stacked lava walls beneath the tall white kapa oracle tower as the Ancestral Wayfinders honor your crossing across both skies.',
        x: 19.5,
        z: 52.8,
        triggerRadiusM: 6.2,
        markerRadiusM: 4.2,
        arrivalSpot: Object.freeze({
          x: 17.2,
          z: 53.5,
          facingYawRad: -1.84,
          camYawRad: -1.78,
        }),
      }),
    ]),
  }),

  // =========================================================================
  // 4. RAPA NUI — Te Pito o Te Henua (Canonical Wide Three-Volcano Monolith Isle)
  // =========================================================================
  rapa_nui: Object.freeze({
    islandId: 'rapa_nui',
    canonicalScale: 1.0,
    gridHalfSpan: 155.0,
    walkSpeedMps: 7.2,
    sprintSpeedMps: 10.0,
    solarHourBase: 9.45,
    initialSpawn: Object.freeze({
      x: 1.6,
      z: 47.2,
      facingYawRad: -0.35,
      camYawRad: 0.22,
    }),
    vigilExitSpawn: Object.freeze({
      x: 2.0,
      z: 40.5,
      facingYawRad: 0.0,
    }),
    mooredCanoe: Object.freeze({
      x: -5.2,
      z: 54.4,
      yawRad: 2.52,
    }),
    pois: Object.freeze([
      Object.freeze({
        id: 'canoe_landing',
        kind: 'canoe',
        hubTab: 'landing',
        glyph: '🛶',
        label: 'Coral Cove Landing',
        title: 'Moored Voyaging Canoe — Sheltered Cove',
        subtitle: 'Check supplies in the sheltered volcanic cove and set sail across the open sea',
        promptHint: 'Board Canoe & Set Sail',
        x: -2.8,
        z: 50.2,
        triggerRadiusM: 4.5,
        markerRadiusM: 3.1,
        arrivalSpot: Object.freeze({
          x: -1.6,
          z: 48.8,
          facingYawRad: 2.31,
          camYawRad: 2.15,
        }),
      }),
      Object.freeze({
        id: 'provisioning_hut',
        kind: 'hut',
        hubTab: 'landing',
        glyph: '🛖',
        label: 'Hare Paenga Stone Camp',
        title: 'Hare Paenga Shelter & Fresh-Water Spring',
        subtitle: 'Gather fresh coconuts & spring water beside canoe-shaped foundation stones',
        promptHint: 'Forage Rations & Inspect Camp',
        isWildShelter: true,
        craftsmanName: 'Ancient Hare Paenga Shelter',
        craftsmanQuote:
          'No smoke rises on this silent shore, yet curved basalt canoe-house curbs shelter sweet spring-water gourds and fallen coconuts along the breezy meadow.',
        x: -24.0,
        z: 50.0,
        triggerRadiusM: 5.8,
        markerRadiusM: 3.8,
        arrivalSpot: Object.freeze({
          x: -21.8,
          z: 51.2,
          facingYawRad: 0.31,
          camYawRad: 0.38,
        }),
      }),
      Object.freeze({
        id: 'observation_circle',
        kind: 'circle',
        hubTab: 'sand',
        glyph: '🐚',
        label: 'Te Pito Kura Stone Ring',
        title: 'Te Pito Kura Navel-Stone & Horizon Sand',
        subtitle: 'Trace wave & cloud sand diagrams by the smooth navel-stone or enter Sky Vigil',
        promptHint: 'Study Navel-Stone Ring & Sky',
        circleDesc:
          'Set upon a windswept grassy terrace overlooking volcanic sea stacks, a sun-warmed round boulder and basalt markers frame etched swell rings in pale coral sand.',
        x: 2.0,
        z: 38.0,
        triggerRadiusM: 5.6,
        markerRadiusM: 3.6,
        arrivalSpot: Object.freeze({
          x: 2.0,
          z: 40.5,
          facingYawRad: 0.0,
          camYawRad: 0.08,
        }),
      }),
      Object.freeze({
        id: 'elder_marae',
        kind: 'elder',
        hubTab: 'sanctuary',
        glyph: '🗿',
        label: 'Ahu Tongariki · Moai',
        title: 'Ahu Tongariki — Silent Moai Guardians',
        subtitle: 'Stand before colossal upright volcanic-tuff Moai monoliths facing the open sea',
        promptHint: 'Contemplate the Stone Guardians',
        introTitle: 'Ahu Tongariki — Silent Guardians of Te Pito o Te Henua',
        introSpeech:
          'Colossal upright volcanic-tuff Moai crowned with red scoria Pukao stand shoulder-to-shoulder upon the coastal basalt platform, gazing outward across the boundless ocean.',
        x: 24.5,
        z: 48.0,
        triggerRadiusM: 6.4,
        markerRadiusM: 4.2,
        arrivalSpot: Object.freeze({
          x: 22.0,
          z: 49.2,
          facingYawRad: -1.84,
          camYawRad: -1.78,
        }),
      }),
    ]),
  }),
});

export const RAIATEA_WALKABLE_SPEC = WALKABLE_ISLAND_SPECS.raiatea;

export function getWalkableIslandSpec(islandId) {
  return WALKABLE_ISLAND_SPECS[islandId] || null;
}
