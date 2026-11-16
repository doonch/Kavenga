/**
 * Declarative configuration for 3D Walkable Shore Islands in Kavenga: Songs of the Star Path.
 *
 * Currently enabled exclusively for the opening island (`raiatea`) while keeping all other
 * campaign islands on the classic IslandHubUI interface during experimentation & iteration.
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

export const WALKABLE_ISLAND_IDS = Object.freeze(new Set(['raiatea']));

export function isWalkableIsland(islandId) {
  return WALKABLE_ISLAND_IDS.has(islandId);
}

export const RAIATEA_WALKABLE_SPEC = Object.freeze({
  islandId: 'raiatea',
  walkSpeedMps: 6.8,
  sprintSpeedMps: 9.4,
  // Player spawns on the warm golden cove sand right beside the moored canoe's starboard hull
  initialSpawn: Object.freeze({
    x: -9.2,
    z: 54.0,
    facingYawRad: -0.42, // Angled toward the village hut, hilltop circle, and Marae headland
  }),
  // Return spawn when exiting the Night-Sky Star-Stone Vigil back to the island
  vigilExitSpawn: Object.freeze({
    x: 2.5,
    z: 33.4,
    facingYawRad: 0.0,
  }),
  mooredCanoe: Object.freeze({
    x: -15.4,
    z: 57.6,
    yawRad: 2.58,
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
      x: -14.2,
      z: 56.2,
      triggerRadiusM: 4.6,
      markerRadiusM: 3.1,
      arrivalSpot: Object.freeze({
        x: -11.9,
        z: 54.4,
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
      x: -22.5,
      z: 36.5,
      triggerRadiusM: 5.8,
      markerRadiusM: 4.0,
      arrivalSpot: Object.freeze({
        x: -21.6,
        z: 39.6,
        facingYawRad: 0.31,
        camYawRad: 0.38,
      }),
    }),
    Object.freeze({
      id: 'observation_circle',
      kind: 'circle',
      hubTab: 'sand',
      glyph: '🐚',
      label: 'Observation Knoll & Sand',
      title: 'Hilltop Observation Circle & Teaching Sand',
      subtitle: 'Trace stick-in-the-sand wave & cloud lessons or enter the Night-Sky Vigil',
      promptHint: 'Study Teaching Sand & Sky Circle',
      x: 2.5,
      z: 28.5,
      triggerRadiusM: 5.6,
      markerRadiusM: 3.8,
      arrivalSpot: Object.freeze({
        x: 2.5,
        z: 31.6,
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
      x: 26.5,
      z: 42.5,
      triggerRadiusM: 6.0,
      markerRadiusM: 4.2,
      arrivalSpot: Object.freeze({
        x: 24.4,
        z: 42.2,
        facingYawRad: -1.84,
        camYawRad: -1.78,
      }),
    }),
  ]),
});
