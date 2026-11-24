/**
 * Declarative stick-in-the-sand reference lessons carved on damp beach sand ashore
 * and shown as strictly static (never rotating!) memory vignettes via "Recall" at sea.
 * Ordered chronologically by campaign storyline & gradual mechanism reveal (Songs 1–16).
 * Coordinates live in normalized sand-bed space; zero compass letters, cardinals, or degrees.
 */

export const SAND_LESSONS = Object.freeze({
  // 1. RA'IATEA — Song 1: Clouds & Drifting Fronds
  sand_raiatea_clouds: {
    id: 'sand_raiatea_clouds',
    voiceId: 'sand_raiatea_clouds',
    title: 'The Still Cloud & Drifting Fronds',
    mentor: 'Elder Metua',
    islandId: 'raiatea',
    narration:
      'Trade clouds march downwind like white canoes, while a high island pins one tall cloud fast above its unseen peak. Downwind, green palm fronds drift out upon the tide toward your prows.',
    primitives: [
      { type: 'wind_gusts', from: [1.35, 0.55], to: [0.38, 0.55], count: 2, spacing: 0.13, label: 'Wind', labelAt: [0.88, 0.78] },
      { type: 'cloud_puff', at: [-0.92, 0.56], scale: 0.86, variant: 'drift', label: 'Marching Wind-Clouds', labelAt: [-0.92, 0.8] },
      { type: 'groove_line', from: [-1.45, 0.08], to: [1.45, 0.08], label: 'Sea Horizon', labelAt: [-1.05, -0.08] },
      { type: 'island_cone', at: [0.0, 0.08], scale: 0.9 },
      { type: 'cloud_puff', at: [0.0, 0.42], scale: 1.05, variant: 'peak', label: 'Pinned Peak Cloud (Land)', labelAt: [0.0, 0.8] },
      { type: 'groove_wave', from: [0.0, -0.02], to: [0.0, -0.52], label: 'Drifting Fronds', labelAt: [0.16, -0.3], labelAlign: 'left' },
      { type: 'canoe_mark', at: [0.0, -0.74], angleRad: 0.0, scale: 0.9, wake: true },
    ],
  },

  // 2. TAHA'A — Songs 2 & 4: Homing Terns & Deck Post Crossbeam Shadows
  sand_tahaa_birds_and_shadow: {
    id: 'sand_tahaa_birds_and_shadow',
    voiceId: 'sand_tahaa_birds_and_shadow',
    title: 'Homing Terns & Crossbeam Shadows',
    mentor: 'Hina',
    islandId: 'tahaa',
    narration:
      "At dawn white terns fly outward to hunt—steer straight into their beaks to find land. At dusk follow their tail feathers home. By day, bind the sighting post's shadow to its crossbeam lashing.",
    primitives: [
      { type: 'divider_line', from: [0.0, 0.88], to: [0.0, -0.88] },
      { type: 'panel_title', at: [-0.78, 0.82], label: 'Homing Terns', tone: 'gold' },
      { type: 'island_cone', at: [-0.78, 0.45], scale: 0.95, label: 'Roosting Isle', labelAt: [-0.78, 0.22] },
      { type: 'bird_flight', from: [-0.95, 0.34], to: [-1.36, -0.38], birdT: 0.56, label: 'Dawn: Into Beaks', labelAt: [-1.14, 0.08], labelSize: 10.2 },
      { type: 'canoe_mark', at: [-1.36, -0.68], angleRad: 0.52, scale: 0.72 },
      { type: 'bird_flight', from: [-0.24, -0.38], to: [-0.62, 0.34], birdT: 0.46, label: 'Dusk: Follow Tail', labelAt: [-0.46, -0.08], labelSize: 10.2 },
      { type: 'canoe_mark', at: [-0.22, -0.68], angleRad: -0.52, scale: 0.72 },
      { type: 'panel_title', at: [0.82, 0.82], label: 'Deck Post Shadow', tone: 'gold' },
      { type: 'shadow_lashing_demo', at: [0.82, -0.05], scale: 1.05, sunFrom: 'right', targetIdx: 1, label: 'Post Shadow -> Crossbeam Knot', labelAt: [0.82, -0.65] },
    ],
  },

  // 3. HUAHINE — Song 3: Lagoon Lapa & Band-3 Setting Stars (Bull's Horn -> Rat's Nose)
  sand_huahine_lapa_and_bull: {
    id: 'sand_huahine_lapa_and_bull',
    voiceId: 'sand_huahine_lapa_and_bull',
    title: 'Lagoon Lapa & The Bull and The Rat',
    mentor: "Ari'i",
    islandId: 'huahine',
    narration:
      "Low coral atolls cast no mountain cloud; instead shallow turquoise water paints pale jade onto clouds overhead. At night steer toward Setting Bull's Horn and Setting Rat's Nose along the middle path.",
    primitives: [
      { type: 'divider_line', from: [0.0, 0.88], to: [0.0, -0.88] },
      { type: 'panel_title', at: [-0.8, 0.82], label: 'Atoll Sky Sign', tone: 'gold' },
      { type: 'cloud_puff', at: [-0.8, 0.36], scale: 1.05, variant: 'jade', label: 'Jade Cloud Belly', labelAt: [-0.8, 0.62], labelTone: 'jade' },
      { type: 'gaze_ray', from: [-0.8, -0.22], to: [-0.8, 0.16], color: '#62f0d4' },
      { type: 'groove_ring', at: [-0.8, -0.46], radius: 0.22, label: 'Shallow Coral Ring', labelAt: [-0.8, -0.8] },
      { type: 'panel_title', at: [0.8, 0.82], label: 'Setting Path of the Bull', tone: 'gold' },
      { type: 'groove_line', from: [0.16, -0.45], to: [1.46, -0.45], label: 'Sea Horizon', labelAt: [0.8, -0.64] },
      {
        type: 'star_relay_arc',
        from: [1.28, 0.56],
        to: [0.3, -0.4],
        curveDy: 0.16,
        stars: [
          { t: 0.25, name: "2. Setting Rat's Nose", dx: -0.06, dy: -0.17 },
          { t: 0.72, name: "1. Setting Bull's Horn", dx: 0.08, dy: 0.17 },
        ],
      },
    ],
  },

  // 4. MO'OREA — Song 5: Two-Star Vertical Handoff Along One Rising Path
  sand_moorea_two_star_handoff: {
    id: 'sand_moorea_two_star_handoff',
    voiceId: 'sand_moorea_two_star_handoff',
    title: 'Passing the Watch Along One Star Path',
    mentor: 'Vaihere',
    islandId: 'moorea',
    narration:
      "When a rising star climbs past three hands above the waves, do not chase it up the dome. Drop your gaze straight down to the same horizon house where the Rat's Nose breaks the foam.",
    primitives: [
      { type: 'groove_line', from: [-1.45, -0.48], to: [1.45, -0.48], label: 'Sea Horizon', labelAt: [-0.95, -0.68] },
      { type: 'canoe_mark', at: [-1.02, -0.22], angleRad: 1.57, scale: 0.9, wake: true, label: 'Steer Toward House', labelAt: [-1.02, 0.12] },
      {
        type: 'star_relay_arc',
        from: [0.78, -0.46],
        to: [0.18, 0.62],
        curveDy: -0.12,
        label: 'Path of the Bull',
        labelAt: [-0.28, 0.45],
        stars: [
          { t: 0.18, name: "2. Rising Rat's Nose", dx: 0.16, dy: 0.02, align: 'left' },
          { t: 0.86, name: "1. Bull's Horn (>3 Hands)", dx: 0.02, dy: 0.17, tone: 'gold' },
        ],
      },
      { type: 'gaze_ray', from: [0.27, 0.4], to: [0.68, -0.22], color: '#ffd97d', label: 'Drop Gaze Straight Down', labelAt: [0.12, 0.04], labelAlign: 'right', labelTone: 'gold' },
    ],
  },

  // 5. RA'IATEA CONSECRATION — Song 6: Reading Crosswind Leeway in the Wake
  sand_raiatea_leeway: {
    id: 'sand_raiatea_leeway',
    voiceId: 'sand_raiatea_leeway',
    title: 'Reading Crosswind Leeway in the Wake',
    mentor: 'Elder Metua',
    islandId: 'raiatea',
    narration:
      'When crosswind pushes your beam, twin hulls drift crabwise even while prows point at a star. Look astern: lean half a prow into the wind until your white wake runs straight on course.',
    primitives: [
      { type: 'shell', at: [0.12, 0.74], label: 'Target Star', labelAt: [0.12, 0.56], labelTone: 'gold' },
      { type: 'wind_gusts', from: [-1.35, 0.22], to: [-0.52, 0.22], count: 3, spacing: 0.16, label: 'Crosswind Push', labelAt: [-0.94, 0.54] },
      { type: 'groove_dashed', from: [0.12, 0.02], to: [0.82, 0.62], label: 'Uncompensated Drift', labelAt: [0.95, 0.34], labelAlign: 'center' },
      { type: 'groove_line', from: [0.12, -0.78], to: [0.12, 0.62], highlight: true, label: 'Straight Compensated Wake', labelAt: [-0.62, -0.58], labelTone: 'gold' },
      { type: 'canoe_mark', at: [0.12, -0.08], angleRad: -0.28, scale: 1.0, wake: true },
      { type: 'gaze_ray', from: [0.06, -0.26], to: [0.12, -0.72], color: '#ffd97d', label: 'Lean Half-Prow Into Wind', labelAt: [0.66, -0.18], labelAlign: 'left', labelTone: 'gold' },
    ],
  },

  // 6. MAUPITI — Act I Capstone / Song 7: Complete Twelve-Shell Star Ring
  sand_maupiti_12_shell_compass: {
    id: 'sand_maupiti_12_shell_compass',
    voiceId: 'sand_maupiti_12_shell_compass',
    title: 'The Twelve-Shell Star Ring',
    mentor: "First Master Tera'i",
    islandId: 'maupiti',
    narration:
      "Five parallel star tracks link five Rising Houses to five Setting Houses across the sea, framed by the Grazing Horse and the Sea Turtle's Pivot. Four animal stars share each groove across the sky.",
    primitives: [
      {
        type: 'shell_ring_12',
        radius: 0.62,
        showAllBands: true,
        canoeAngleRad: 0.0,
        canoeWake: true,
        labelHouses: [
          'house_north_horse_pivot',
          'house_band1_rising',
          'house_band1_setting',
          'house_band3_rising',
          'house_band3_setting',
          'house_band5_rising',
          'house_band5_setting',
          'house_south_turtle_pivot',
        ],
      },
      { type: 'panel_title', at: [-1.18, 0.72], label: 'Setting Side', tone: 'gold' },
      { type: 'panel_title', at: [1.18, 0.72], label: 'Rising Side', tone: 'gold' },
    ],
  },

  // 7. NUKU HIVA — Song 8: The Two Horizon Pivots Ahead & Astern
  sand_nuku_hiva_polar_pivots: {
    id: 'sand_nuku_hiva_polar_pivots',
    voiceId: 'sand_nuku_hiva_polar_pivots',
    title: 'The Two Horizon Pivots',
    mentor: 'Master Teiki',
    islandId: 'nuku_hiva',
    narration:
      "Steer straight where the Horse's Crown skims low above dark waves without drowning; glance astern over your steering paddle to keep the spinning Sea Turtle centered in your foamy wake.",
    primitives: [
      { type: 'groove_line', from: [0.0, 0.62], to: [0.0, -0.62], highlight: true },
      { type: 'shell', at: [0.0, 0.66], label: "Horse's Crown (Ahead, Never Sets)", labelAt: [0.0, 0.84], labelTone: 'gold' },
      { type: 'canoe_mark', at: [0.0, 0.04], angleRad: 0.0, scale: 1.05, wake: true },
      { type: 'gaze_ray', from: [0.0, -0.18], to: [0.0, -0.54], color: '#ffd97d', label: 'Check Directly Astern', labelAt: [0.22, -0.34], labelAlign: 'left', labelTone: 'gold' },
      { type: 'shell', at: [0.0, -0.64], label: "Sea Turtle's Pivot (Spins Astern)", labelAt: [0.0, -0.84] },
      { type: 'shell', at: [-0.2, -0.68], radius: 6.0, glowing: false },
      { type: 'shell', at: [0.2, -0.68], radius: 6.0, glowing: false },
    ],
  },

  // 8. UA POU — Song 9: Setting Path of the Horse (Three Setting Lanterns)
  sand_ua_pou_band1_horse: {
    id: 'sand_ua_pou_band1_horse',
    voiceId: 'sand_ua_pou_band1_horse',
    title: 'Setting Path of the Horse',
    mentor: 'Vaea',
    islandId: 'ua_pou',
    narration:
      "Horse's Mane, Horse's Tail, Boar's Bristle, and Crab's Right Claw descend down the same Setting Horse track. Relay down each lantern before it drowns until Rangiroa's jade atoll cloud glows ahead.",
    primitives: [
      { type: 'groove_line', from: [-1.45, -0.5], to: [1.45, -0.5], label: 'Sea Horizon', labelAt: [0.95, -0.68] },
      { type: 'cloud_puff', at: [-1.1, -0.2], scale: 0.95, variant: 'jade', label: 'Jade Lagoon Glow', labelAt: [-1.02, -0.74], labelTone: 'jade' },
      {
        type: 'star_relay_arc',
        from: [1.15, 0.66],
        to: [-0.62, -0.44],
        curveDy: 0.14,
        label: 'Setting Path of the Horse (Track 1)',
        labelAt: [0.42, 0.76],
        stars: [
          { t: 0.22, name: "3. Crab's Right Claw", dx: -0.04, dy: 0.16, tone: 'gold' },
          { t: 0.54, name: "2. Boar's Bristle", dx: 0.16, dy: 0.0, align: 'left' },
          { t: 0.84, name: "1. Horse's Tail", dx: -0.06, dy: 0.16 },
        ],
      },
      { type: 'canoe_mark', at: [0.32, -0.22], angleRad: -1.05, scale: 0.82, wake: true },
    ],
  },

  // 9. RANGIROA — Song 10: Steering by the Opposite Wake Star
  sand_rangiroa_stern_backsight: {
    id: 'sand_rangiroa_stern_backsight',
    voiceId: 'sand_rangiroa_stern_backsight',
    title: 'Steering by the Wake Star',
    mentor: 'Tane',
    islandId: 'rangiroa',
    narration:
      "Every Rising House faces an opposite Setting House straight through your canoe. When rain-clouds curtain the Rising Shark ahead, look astern and hold Setting Gecko's Tongue centered in your wake.",
    primitives: [
      {
        type: 'shell_ring_12',
        radius: 0.62,
        canoeAngleRad: 2.094,
        canoeWake: true,
        highlightOppositePair: ['house_band4_rising', 'house_band2_setting'],
        fogForwardAzDeg: 120.0,
        sternGazeAzDeg: 300.0,
        labelHouses: [
          'house_north_horse_pivot',
          'house_band2_setting',
          'house_band4_rising',
          'house_south_turtle_pivot',
        ],
        houseAliases: {
          house_band2_setting: "Setting Boar (Gecko's Tongue)",
          house_band4_rising: 'Rising Shark (Cloud-Veiled)',
        },
      },
      { type: 'panel_title', at: [-0.66, -0.12], label: 'Look Astern!', tone: 'gold' },
      { type: 'panel_title', at: [0.85, -0.14], label: 'Forward Clouds', tone: 'default' },
    ],
  },

  // 10. HIVA OA — Song 11: Overhead Zenith Star Dogleg Turn
  sand_hiva_oa_zenith_dogleg: {
    id: 'sand_hiva_oa_zenith_dogleg',
    voiceId: 'sand_hiva_oa_zenith_dogleg',
    title: 'The Mast-Top Zenith Star',
    mentor: 'Tahia',
    islandId: 'hiva_oa',
    narration:
      "Sail toward the Sea Turtle's Pivot while watching the Gecko climb overhead. The moment Gecko's Heart stands straight above your mast-top, turn sharply onto the Rising Path of the Bull.",
    primitives: [
      { type: 'island_cone', at: [-0.35, 0.68], scale: 0.85, label: '1. Leave Hiva Oa', labelAt: [0.16, 0.7] },
      { type: 'groove_ray', from: [-0.35, 0.52], to: [-0.35, -0.02], highlight: true, label: "Toward Sea Turtle's Pivot", labelAt: [-0.54, 0.28], labelAlign: 'right', labelSize: 10.5 },
      { type: 'canoe_mark', at: [-0.35, 0.28], angleRad: 3.14, scale: 0.78 },
      { type: 'shell', at: [-0.35, -0.2], label: "Gecko's Heart Straight Overhead!", labelAt: [-0.52, -0.58], labelTone: 'gold' },
      { type: 'canoe_mark', at: [-0.04, -0.2], angleRad: 1.57, scale: 0.82 },
      { type: 'groove_ray', from: [0.22, -0.2], to: [1.06, -0.2], highlight: true, label: "2. Turn to Rising Shark's Jaw", labelAt: [0.64, 0.04], labelTone: 'gold' },
      { type: 'island_cone', at: [1.22, -0.2], scale: 0.9, crag: true, label: 'Fatu Hiva', labelAt: [1.22, -0.48] },
    ],
  },

  // 11. FATU HIVA — Song 12 & Secret S1: Rising Path of the Whale
  sand_fatu_hiva_band5_whale: {
    id: 'sand_fatu_hiva_band5_whale',
    voiceId: 'sand_fatu_hiva_band5_whale',
    title: 'Rising Path of the Whale',
    mentor: 'Oihanu',
    islandId: 'fatu_hiva',
    narration:
      "Near the Sea Turtle's waters, Whale's Spout, Whale's Fluke, Shark's Tail, and Bird's Wingtip climb the same Rising Whale arc out of the sea toward Mangareva and the outer stone isle.",
    primitives: [
      { type: 'groove_line', from: [-1.45, -0.5], to: [1.45, -0.5], label: 'Sea Horizon', labelAt: [-0.95, -0.68] },
      { type: 'canoe_mark', at: [-0.88, -0.24], angleRad: 1.05, scale: 0.85, wake: true },
      {
        type: 'star_relay_arc',
        from: [1.18, -0.44],
        to: [-0.25, 0.64],
        curveDy: -0.14,
        label: 'Rising Path of the Whale (Track 5)',
        labelAt: [0.68, 0.72],
        stars: [
          { t: 0.16, name: "1. Whale's Spout", dx: 0.1, dy: 0.17, tone: 'gold' },
          { t: 0.45, name: "2. Whale's Fluke", dx: 0.18, dy: 0.02, align: 'left' },
          { t: 0.74, name: "3. Shark's Tail", dx: -0.18, dy: -0.02, align: 'right' },
          { t: 0.94, name: "4. Bird's Wingtip", dx: -0.16, dy: 0.15, align: 'right' },
        ],
      },
    ],
  },

  // 12. MANGAREVA — Song 13: Crossing Into the Steadfast Sky & Sea-Fog
  sand_mangareva_mist_warning: {
    id: 'sand_mangareva_mist_warning',
    voiceId: 'sand_mangareva_mist_warning',
    title: 'The Steadfast Peg & Mist Crossing',
    mentor: 'Elder Rongo',
    islandId: 'mangareva',
    narration:
      "Follow the Setting Horse as the Sea Turtle drowns in your wake and the unmoving Steadfast Peg lifts ahead. When grey mist blinds sky and sun, lock your steering sweep until Kaua'i's crag pierces the fog.",
    primitives: [
      { type: 'divider_line', from: [0.04, 0.88], to: [0.04, -0.88] },
      { type: 'panel_title', at: [-0.75, 0.82], label: '1. Night Sky Flip', tone: 'gold' },
      { type: 'shell', at: [-0.75, 0.56], label: 'Steadfast Peg Climbs Ahead', labelAt: [-0.75, 0.34], labelTone: 'gold' },
      { type: 'canoe_mark', at: [-0.75, -0.04], angleRad: -0.42, scale: 0.92, wake: true },
      { type: 'groove_line', from: [-1.42, -0.5], to: [-0.08, -0.5] },
      { type: 'shell', at: [-0.75, -0.66], radius: 7.0, glowing: false, label: 'Sea Turtle Sinks Astern', labelAt: [-0.75, -0.83] },
      { type: 'panel_title', at: [0.82, 0.82], label: '2. Grey Mist Curtain', tone: 'gold' },
      { type: 'fog_veiling', at: [0.82, -0.02], rx: 0.62, ry: 0.38, label: 'Stars & Sun Hidden', labelAt: [0.82, -0.22] },
      { type: 'island_cone', at: [0.82, 0.24], scale: 1.05, crag: true, label: "Kaua'i Crag Pierces Mist", labelAt: [0.82, 0.56], labelTone: 'gold' },
      { type: 'canoe_mark', at: [0.82, -0.54], angleRad: 0.0, scale: 0.88, lockedSweep: true, label: 'Hold Sweep Locked', labelAt: [0.82, -0.82] },
    ],
  },

  // 13. KAUA'I (FIRST VISIT) — Song 14: All Four Voices of the Deep Swell
  sand_kauai_four_swell_voices: {
    id: 'sand_kauai_four_swell_voices',
    voiceId: 'sand_kauai_four_swell_voices',
    title: 'The Four Voices of the Deep Swell',
    mentor: 'Swell Master Pohaku',
    islandId: 'kauai',
    narration:
      'Head-on slams quick in 2.75 beats. Beam-on rolls wide side to side. Following heaves slowly from astern. Only at half-cheek trim does your leading prow rise exactly every fourth beat of the drum!',
    primitives: [
      { type: 'swell_field', xRange: [-1.54, 1.54], yRange: [-0.46, 0.56], angleRad: 0.0, count: 5, showArrows: true },
      { type: 'panel_title', at: [0.0, 0.82], label: 'Swells Roll Downward Across the Hulls', tone: 'default' },
      { type: 'divider_line', from: [-0.78, 0.66], to: [-0.78, -0.86] },
      { type: 'divider_line', from: [0.0, 0.66], to: [0.0, -0.86] },
      { type: 'divider_line', from: [0.78, 0.66], to: [0.78, -0.86] },
      { type: 'canoe_mark', at: [-1.17, 0.05], angleRad: 0.0, scale: 0.82, highlightCheek: 'both', label: 'Head-On (2.75)', labelAt: [-1.17, -0.66], labelSize: 10.5 },
      { type: 'canoe_mark', at: [-0.39, 0.05], angleRad: 0.785, scale: 0.86, highlightCheek: 'port', label: 'Cheek = 4 Beats!', labelAt: [-0.39, -0.66], labelTone: 'gold', labelSize: 10.8 },
      { type: 'canoe_mark', at: [0.39, 0.05], angleRad: 1.57, scale: 0.82, label: 'Beam Roll (5.16)', labelAt: [0.39, -0.66], labelSize: 10.5 },
      { type: 'canoe_mark', at: [1.17, 0.05], angleRad: 3.14, scale: 0.82, label: 'Following (6.25)', labelAt: [1.17, -0.66], labelSize: 10.5 },
    ],
  },

  // 14. O'AHU — Song 14R: Starboard-Cheek Swell Through Mist
  sand_oahu_return_swell: {
    id: 'sand_oahu_return_swell',
    voiceId: 'sand_oahu_return_swell',
    title: 'Holding the Return Ridge',
    mentor: 'Elder Manu',
    islandId: 'oahu',
    narration:
      "Set out through white sea-fog and let the deep swell strike your starboard cheek on every fourth pahu beat until Kaua'i's tall black fortress crag breaks above the mist ahead.",
    primitives: [
      { type: 'swell_field', xRange: [-1.15, 1.15], yRange: [-0.56, 0.56], angleRad: 0.0, count: 5, showArrows: true, mist: true, label: 'Incoming Deep Swell', labelAt: [0.78, 0.74] },
      { type: 'island_cone', at: [-0.95, 0.62], scale: 1.0, crag: true, label: "Kaua'i Crag Above Mist", labelAt: [-0.58, 0.82], labelTone: 'gold' },
      { type: 'canoe_mark', at: [0.05, -0.05], angleRad: -0.785, scale: 1.12, wake: true, highlightCheek: 'starboard', label: 'Starboard Cheek · Every 4 Beats', labelAt: [0.05, -0.76], labelTone: 'gold' },
    ],
  },

  // 15. KAUA'I (DRUM CARVED) — Song 15 & Song 14 Approach: Wave Shadows & Diamond Ripples
  sand_kauai_refraction_lattice: {
    id: 'sand_kauai_refraction_lattice',
    voiceId: 'sand_kauai_refraction_lattice',
    title: 'Island Wave Shadows & Diamond Ripples',
    mentor: 'Swell Master Pohaku',
    islandId: 'kauai',
    narration:
      'Steep cliffs bounce swells back as white-tipped pyramids. Directly behind an island sits a flat Calm Wave Shadow—turn head-on upswell there! Farther leeward, bending swells cross into a diamond lattice.',
    primitives: [
      { type: 'swell_field', xRange: [-1.1, 1.1], yRange: [0.22, 0.76], angleRad: 0.0, count: 2, showArrows: true },
      { type: 'pyramid_peaks', at: [0.0, 0.48], label: 'Upwave Cliff Pyramids', labelAt: [0.0, 0.8] },
      { type: 'island_cone', at: [0.0, 0.12], scale: 1.0, label: 'Unseen Island', labelAt: [0.68, 0.14], labelAlign: 'left' },
      { type: 'calm_zone', at: [0.0, -0.18], label: 'Calm Wave Shadow', labelAt: [0.68, -0.18], labelAlign: 'left', labelTone: 'gold' },
      { type: 'canoe_mark', at: [0.0, -0.22], angleRad: 0.0, scale: 0.68 },
      { type: 'refraction_diamond_grooves', at: [0.0, -0.58], label: 'Leeward Diamond Lattice (Crossed Swells)', labelAt: [0.0, -0.84] },
    ],
  },

  // 16. KIRITIMATI — Song 16 Finale: The Four Legs to Ancestral Hawai'i
  sand_kiritimati_grand_voyage_prep: {
    id: 'sand_kiritimati_grand_voyage_prep',
    voiceId: 'sand_kiritimati_grand_voyage_prep',
    title: "The Four Legs to Ancestral Hawai'i",
    mentor: 'Keeper Akura',
    islandId: 'kiritimati',
    narration:
      "Unite every art: noon sun-shadow down your center deck, port-cheek swell through mist, Rising Shark's path with Steadfast Peg off your port beam, and cliff-bounced pyramids into Hawai'i.",
    primitives: [
      { type: 'divider_line', from: [0.0, 0.88], to: [0.0, -0.88] },
      { type: 'divider_line', from: [-1.52, 0.0], to: [1.52, 0.0] },
      // Top-Left: Leg 1
      { type: 'panel_title', at: [-0.78, 0.84], label: '1. Center-Aft Shadow', tone: 'gold' },
      { type: 'shadow_lashing_demo', at: [-0.78, 0.28], scale: 0.72, sunFrom: 'top', targetIdx: 2 },
      // Top-Right: Leg 2
      { type: 'panel_title', at: [0.78, 0.8], label: '2. Port-Cheek Fog Swell', tone: 'gold' },
      { type: 'swell_field', xRange: [0.24, 1.32], yRange: [0.1, 0.64], angleRad: 0.0, count: 3, showArrows: true, mist: true },
      { type: 'canoe_mark', at: [0.78, 0.36], angleRad: 0.785, scale: 0.68, highlightCheek: 'port' },
      // Bottom-Left: Leg 3
      { type: 'panel_title', at: [-0.78, -0.14], label: '3. Rising Shark + Peg', tone: 'gold' },
      { type: 'shell', at: [-1.22, -0.34], radius: 7.2, label: 'Peg (Port)', labelAt: [-1.22, -0.52], labelSize: 10 },
      { type: 'canoe_mark', at: [-0.78, -0.55], angleRad: 1.57, scale: 0.66 },
      { type: 'shell', at: [-0.26, -0.55], radius: 7.6, label: "Shark's Fin", labelAt: [-0.28, -0.78], labelSize: 10 },
      // Bottom-Right: Leg 4
      { type: 'panel_title', at: [0.78, -0.14], label: "4. Dawn Waves -> Hawai'i", tone: 'gold' },
      { type: 'pyramid_peaks', at: [0.46, -0.55], label: 'Pyramids', labelAt: [0.46, -0.78], labelSize: 10 },
      { type: 'island_cone', at: [1.14, -0.5], scale: 0.9, crag: true, label: "Hawai'i", labelAt: [1.14, -0.78], labelSize: 10, labelTone: 'gold' },
    ],
  },
});
