/**
 * Standalone 3D Asset Debug Viewer for Kavenga: Songs of the Star Path.
 * Instantiates the live procedural 3D renderers (VakaRenderer, WorldCuesRenderer, ISLANDS)
 * so every asset view reflects the current in-game geometry without duplication.
 */

import * as THREE from 'three';
import { Difficulty } from './core/gameConstants.js';
import { ISLANDS } from './data/islandsData.js';
import { GameState } from './core/gameState.js';
import { OceanSim } from './simulation/oceanSim.js';
import {
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  hasDetailedIslandModel,
} from './rendering/IslandTerrainBuilder.js';
import {
  TRADE_CLOUD_VARIANT_KEYS,
  createSculptedCloudMesh,
  updateCloudMaterialUniforms,
} from './rendering/CloudSculptBuilder.js';
import { createRapaNuiMoaiShowcaseAssembly } from './rendering/IslandRapaNuiBuilder.js';
import {
  addBroadleafTrees,
  addCoastalScrub,
  addCoconutGroves,
  addMaraePlatform,
  addRegionalHuts,
  createGiantPearlShellGroup,
} from './rendering/IslandSculptToolkit.js';
import {
  createBasaltFishWeirGroup,
  createCarvedHullPairGroup,
  createCarvedStandingStoneGroup,
  createCoralCairnGroup,
  createKukuiTorchGroup,
  createMarquesanTikiSculpture,
  createPandanusSailFrameGroup,
  createPearlLineClusterGroup,
  createQuarriedTikiBlockGroup,
  createSailDyeVatsCluster,
  createSculptedShipwrightShedGroup,
  createSculptedTridacnaAltarGroup,
  createVillageHearthGroup,
  createWhaleJawArchGroup,
} from './rendering/IslandPropsBuilder.js';
import {
  animateCrewCharacterRig,
  createCrewCharacterRig,
  CREW_DESIGN_SPECS,
} from './rendering/CrewCharacterBuilder.js';
import {
  animatePlayerCharacterRig,
  createPlayerCharacterRig,
  getPlayerCharacterProfile,
} from './rendering/PlayerCharacterBuilder.js';
import { VakaRenderer } from './rendering/VakaRenderer.js';
import { WorldCuesRenderer } from './rendering/WorldCuesRenderer.js';

const ARCHETYPE_LABELS = {
  high_volcanic: 'High Volcanic',
  twin_peaks: 'Twin Peaks',
  volcanic_spire: 'Volcanic Spire',
  fortress_crag: 'Fortress Crag',
  coral_atoll: 'Coral Atoll',
};

// ---------------------------------------------------------------------------
// Build Declarative Asset Catalog (Canoe, Birds, Clouds, Fish, All 16 Islands)
// ---------------------------------------------------------------------------
function buildAssetCatalog() {
  const items = [
    // 1. Voyaging Canoe (with & without upgrades)
    {
      id: 'vaka_tier1',
      category: 'Voyaging Canoe (Vaka)',
      name: 'Canoe — Tier 1 (No Upgrades)',
      subtitle: 'Base dugout V-hulls, 4 rations, no washstrakes or crew',
      tag: 'Tier 1',
      kind: 'vaka',
      preset: {
        tier: 1,
        rations: 4,
        cargo: 0,
        crew: [],
        worn: false,
        steer: 0.0,
        solarHour: 9.2,
        swellMotion: false,
        helmMode: Difficulty.EASY,
      },
    },
    {
      id: 'vaka_tier2',
      category: 'Voyaging Canoe (Vaka)',
      name: "Canoe — Tier 2 (Mo'orea Upgrade)",
      subtitle: 'Curved splash washstrakes, Pahu drum, 2 crew, 2 cargo',
      tag: 'Tier 2',
      kind: 'vaka',
      preset: {
        tier: 2,
        rations: 6,
        cargo: 2,
        crew: ['tama', 'moana'],
        worn: false,
        steer: 0.25,
        solarHour: 15.0,
        swellMotion: false,
        helmMode: Difficulty.MEDIUM,
      },
    },
    {
      id: 'vaka_tier3',
      category: 'Voyaging Canoe (Vaka)',
      name: 'Canoe — Tier 3 (Double-Sail Vaka Moana)',
      subtitle: 'Fore-and-aft main & mizzen crab-claw sails, 8 rations, 3 cargo, 3 crew',
      tag: 'Tier 3',
      kind: 'vaka',
      preset: {
        tier: 3,
        rations: 8,
        cargo: 3,
        crew: ['tama', 'moana', 'kahu'],
        worn: false,
        steer: -0.2,
        solarHour: 8.5,
        swellMotion: false,
        helmMode: Difficulty.MASTER_NAVIGATOR,
      },
    },
    {
      id: 'vaka_weathered',
      category: 'Voyaging Canoe (Vaka)',
      name: 'Canoe — Worn (<55% Durability)',
      subtitle: 'Darkened hull timber, dulled pandanus sail & rapid flogging',
      tag: 'Worn',
      kind: 'vaka',
      preset: {
        tier: 2,
        rations: 2,
        cargo: 1,
        crew: ['tama'],
        worn: true,
        steer: 0.0,
        solarHour: 16.2,
        swellMotion: true,
        helmMode: Difficulty.HARD,
      },
    },

    // 1b. Player Characters (4 Difficulty Designs)
    {
      id: 'player_apprentice',
      category: 'Player Characters (By Difficulty)',
      name: 'Apprentice (Easy · 12–14 yrs)',
      subtitle: getPlayerCharacterProfile(Difficulty.EASY).attireSummary,
      tag: 'Easy',
      kind: 'player_char',
      difficulty: Difficulty.EASY,
    },
    {
      id: 'player_wayfinder',
      category: 'Player Characters (By Difficulty)',
      name: 'Wayfinder (Medium · 18–20 yrs)',
      subtitle: getPlayerCharacterProfile(Difficulty.MEDIUM).attireSummary,
      tag: 'Medium',
      kind: 'player_char',
      difficulty: Difficulty.MEDIUM,
    },
    {
      id: 'player_navigator',
      category: 'Player Characters (By Difficulty)',
      name: 'Navigator (Hard · 30 yrs)',
      subtitle: getPlayerCharacterProfile(Difficulty.HARD).attireSummary,
      tag: 'Hard',
      kind: 'player_char',
      difficulty: Difficulty.HARD,
    },
    {
      id: 'player_master',
      category: 'Player Characters (By Difficulty)',
      name: 'Master Navigator (50 yrs · Gray Beard)',
      subtitle: getPlayerCharacterProfile(Difficulty.MASTER_NAVIGATOR).attireSummary,
      tag: 'Master',
      kind: 'player_char',
      difficulty: Difficulty.MASTER_NAVIGATOR,
    },

    // 1c. Voyaging Crew (Seated)
    ...Object.values(CREW_DESIGN_SPECS).map((cs) => ({
      id: `crew_${cs.id}`,
      category: 'Voyaging Crew (Seated)',
      name: `${cs.name} — ${cs.role}`,
      subtitle: cs.attireSummary,
      tag: cs.homeIsland,
      kind: 'crew_char',
      crewId: cs.id,
    })),

    // 2. Seabirds (Flapping)
    {
      id: 'bird_white_tern',
      category: 'Seabirds (Flapping)',
      name: 'White Tern — Manu-o-Kū (Single Bird)',
      subtitle: 'Snow-white pelagic tern with cobalt-black needle bill, forked swallow tail & 2-joint wings',
      tag: 'Tern',
      kind: 'bird_single',
      species: 'white_tern',
    },
    {
      id: 'bird_brown_booby',
      category: 'Seabirds (Flapping)',
      name: 'Brown Booby — Kenā (Single Bird)',
      subtitle: 'Chocolate-and-white tuxedo plunge-diver with yellow spear bill, wedge tail & long glider wings',
      tag: 'Booby',
      kind: 'bird_single',
      species: 'brown_booby',
    },
    {
      id: 'bird_red_kura',
      category: 'Seabirds (Flapping)',
      name: 'Red Kura Bird — Manu Kura (Manuae)',
      subtitle: 'Sacred crimson-scarlet Manuae lorikeet with coral hooked beak, cobalt nape & full landing/takeoff cycle',
      tag: 'Kura',
      kind: 'bird_single',
      species: 'red_kura',
    },
    {
      id: 'bird_sooty_tern',
      category: 'Seabirds (Flapping)',
      name: 'Sooty Tern — Manutara (Rapa Nui)',
      subtitle: 'Slate-black upper plumage with snow-white forehead crescent & forked swallow tail',
      tag: 'Manutara',
      kind: 'bird_single',
      species: 'sooty_tern',
    },
    {
      id: 'bird_homing_flock',
      category: 'Seabirds (Flapping)',
      name: 'Homing Flock (8 Seabirds Flapping)',
      subtitle: '8-bird dawn/dusk homing formation showcasing White Terns & Brown Boobies',
      tag: 'Flock',
      kind: 'bird_flock',
    },

    // 3. Clouds
    {
      id: 'cloud_trade',
      category: 'Clouds',
      name: 'Marching Trade-Wind Cloud',
      subtitle:
        'Sculpted flat-bottomed marine cumulus, fractus scud streets & inversion caps (6 variants)',
      tag: 'Cloud',
      kind: 'cloud',
      cloudType: 'trade',
    },
    {
      id: 'cloud_peak',
      category: 'Clouds',
      name: 'Stationary Island Peak Cumulus',
      subtitle:
        'Towering orographic cumulus congestus column anchored above high volcanic peaks',
      tag: 'Cloud',
      kind: 'cloud',
      cloudType: 'peak',
    },
    {
      id: 'cloud_lapa',
      category: 'Clouds',
      name: 'Coral Atoll Lapa Glow Cloud',
      subtitle:
        'Stratified marine canopy deck with turquoise lagoon-reflected underside (Te Lapa)',
      tag: 'Lapa',
      kind: 'cloud',
      cloudType: 'lapa',
    },

    // 4. Fish & Ocean Cues
    {
      id: 'fish_bonito_single',
      category: 'Fish & Sea Cues',
      name: 'Bonito Fish (Single Close-Up)',
      subtitle: 'Countershaded Pacific bonito (Atu) with dorsal/pectoral fins, finlets & live lunate tail',
      tag: 'Fish',
      kind: 'fish_single',
    },
    {
      id: 'fish_bonito_school',
      category: 'Fish & Sea Cues',
      name: 'Midday Leaping Bonito School',
      subtitle: '10 bonito fish arcing and breaching in a Tight Ring circle',
      tag: 'School',
      kind: 'fish_school',
    },
    {
      id: 'cue_drifting_fronds',
      category: 'Fish & Sea Cues',
      name: 'Drifting Green Palm Fronds',
      subtitle: 'Near-island Ring 3 floating vegetation trail',
      tag: 'Cue',
      kind: 'fronds',
    },

    // 5. Island Landmarks & Props
    {
      id: 'cue_giant_pearl_shells',
      category: 'Island Landmarks & Props',
      name: 'Giant Pearl Shells — Te Pārau (Manuae)',
      subtitle:
        'Sculpted fluted black-lip pearl oyster & Tridacna valves with iridescent nacre, South Seas pearls & drying-rack half-shell',
      tag: 'Manuae',
      kind: 'pearl_shells',
    },
    {
      id: 'prop_tridacna_altar',
      category: 'Island Landmarks & Props',
      name: 'Giant White Tridacna Clam Altar (Kiritimati)',
      subtitle:
        'Elevated coral-limestone sanctuary pedestal cradling colossal opposing sculpted Tridacna valves & giant coral pearl',
      tag: 'Kiritimati',
      kind: 'prop',
      propId: 'tridacna_altar',
    },
    {
      id: 'prop_carved_hulls',
      category: 'Island Landmarks & Props',
      name: "Carved Vaka Hull Pair on Cradles (Mo'orea)",
      subtitle:
        'Lofted twin tamanu dugout canoe hulls with flared prow cutwaters, hollowed bilges, carved gunwales & Y-chock timber cradles',
      tag: "Mo'orea",
      kind: 'prop',
      propId: 'carved_hulls',
    },
    {
      id: 'prop_sail_dye_and_loom',
      category: 'Island Landmarks & Props',
      name: "Sail-Dye Vats & Pandanus Sail Loom (Mo'orea / Huahine)",
      subtitle:
        'Hollowed basalt dye basins with ochre/turmeric/lagoon pigment pools beside arched carved-frame pandanus sail racks',
      tag: 'Artisan',
      kind: 'prop',
      propId: 'sail_dye_and_loom',
    },
    {
      id: 'prop_marquesan_tiki',
      category: 'Island Landmarks & Props',
      name: 'Red-Tuff Marquesan Tiki & Quarry Block (Hiva Oa)',
      subtitle:
        'Sculpted basalt-paepae red-tuff guardian tiki (broad brow, goggle eyes, carved ribs & hands) beside a chiseled quarry monolith',
      tag: 'Hiva Oa',
      kind: 'prop',
      propId: 'marquesan_tiki',
    },
    {
      id: 'prop_pearl_lines',
      category: 'Island Landmarks & Props',
      name: 'Pearl-Oyster Lagoon Longlines (Rangiroa)',
      subtitle:
        'Suspended catenary harvest ropes stretched between weathered hibiscus mooring stakes, glass-pearl floats & hanging shell baskets',
      tag: 'Rangiroa',
      kind: 'prop',
      propId: 'pearl_lines',
    },
    {
      id: 'prop_whale_arch',
      category: 'Island Landmarks & Props',
      name: 'Bleached Whale-Jawbone Archway (Ua Pou)',
      subtitle:
        'Stepped basalt carving terrace crowned by sculpted tapered cetacean mandible arches lashed with sennit binding & bone altar bench',
      tag: 'Ua Pou',
      kind: 'prop',
      propId: 'whale_arch',
    },
    {
      id: 'prop_fish_weir',
      category: 'Island Landmarks & Props',
      name: 'Stacked Basalt Maeva Fish Weir (Huahine)',
      subtitle:
        'Multi-course dry-laid volcanic basalt boulders forming converging V-wing tide walls & circular trap impoundment pen',
      tag: 'Huahine',
      kind: 'prop',
      propId: 'fish_weir',
    },
    {
      id: 'prop_torches_hearth_cairn',
      category: 'Island Landmarks & Props',
      name: 'Kukui Torch, Village Hearth, Standing Stone & Coral Cairn',
      subtitle:
        'Split-bamboo kukui torch with ti-leaf collar, coral-ringed bonfire hearth, tapered marae backrest stela & Manuae stacked coral cairn',
      tag: 'Shared Props',
      kind: 'prop',
      propId: 'torches_hearth_cairn',
    },
    {
      id: 'prop_regional_fares',
      category: 'Island Landmarks & Props',
      name: 'Polynesian Fare Hut & Vaka Shipwright Shed',
      subtitle:
        'Elevated Society/Marquesan thatched fare with recessed doorway, verandah posts & overhanging eaves alongside open shipwright shed',
      tag: 'Architecture',
      kind: 'prop',
      propId: 'regional_fares',
    },
    {
      id: 'prop_marae_platforms',
      category: 'Island Landmarks & Props',
      name: "Sculpted Marae & Heiau Platforms (Mangareva / Hawai'i)",
      subtitle:
        "Stepped dry-laid stone paepae with fitted perimeter curbing, 3-tier Ahu altar, carved unu standards, tapered ofai orthostats, braziers & Hawaiian 'Anu'u tower",
      tag: 'Sacred Marae',
      kind: 'prop',
      propId: 'marae_platforms',
    },

    // 6. Island Flora & Vegetation
    {
      id: 'prop_coconut_grove',
      category: 'Island Flora & Vegetation',
      name: 'Polynesian Coconut Palms (Niu)',
      subtitle:
        'Ringed wind-leaning curved trunks, ovoid coconut drupe clusters & 12 individual arching serrated pinnate fronds in sunlit/shaded whorls',
      tag: 'Palms',
      kind: 'prop',
      propId: 'coconut_grove',
    },
    {
      id: 'prop_broadleaf_forest',
      category: 'Island Flora & Vegetation',
      name: "Breadfruit ('Uru), Miro & Crimson 'Ohi'a Lehua Trees",
      subtitle:
        "Flared root-buttressed forked trunks with organic multi-lobe canopy foliage and crimson 'ohi'a lehua blossom tufts",
      tag: 'Canopy',
      kind: 'prop',
      propId: 'broadleaf_forest',
    },
    {
      id: 'prop_coastal_scrub_pandanus',
      category: 'Island Flora & Vegetation',
      name: 'Coastal Pandanus (Hala) & Naupaka Scrub',
      subtitle:
        'Prop-rooted pandanus sword-leaf rosettes beside wind-sheared multi-lobe coastal naupaka & mikimiki thickets',
      tag: 'Littoral',
      kind: 'prop',
      propId: 'coastal_scrub_pandanus',
    },
  ];

  // 5. Secret Island — Rapa Nui (Wide Low-Shield Island + Close-Up Moai & Ahu Inspection)
  if (ISLANDS.rapa_nui) {
    items.push(
      {
        id: 'island_rapa_nui',
        category: 'Secret Island — Rapa Nui',
        name: 'Rapa Nui (Secret Island)',
        subtitle:
          'Wide low-shield triangular three-volcano island: Terevaka, Poike, Rano Kau caldera & Motu, Rano Raraku, Anakena & upright ocean-facing Moai',
        tag: 'Secret Isle',
        kind: 'island',
        island: ISLANDS.rapa_nui,
      },
      {
        id: 'rapa_nui_moai_ahu',
        category: 'Secret Island — Rapa Nui',
        name: 'Moai Guardians & Ahu (Real Scale)',
        subtitle:
          'True historical scale: 10.0m Paro (+ 2.0m Pukao = 12m), awakened coral/obsidian eyes, 8.8m Rano Raraku quarry giant & 1.75m human scale reference',
        tag: 'Moai Scale',
        kind: 'moai_showcase',
      }
    );
  }

  // 6. All 16 Campaign Islands grouped by Act I, Act II, Act III
  const actTitles = {
    1: "Islands — Act I (Ra'iatea Chain)",
    2: 'Islands — Act II (Nuku Hiva Chain)',
    3: "Islands — Act III (Hawai'i Chain)",
  };

  for (const isl of Object.values(ISLANDS)) {
    if (isl.isSecret) continue;
    const detailed = hasDetailedIslandModel(isl.id);
    items.push({
      id: `island_${isl.id}`,
      category: actTitles[isl.act] || 'Islands',
      name: isl.name,
      subtitle: `${isl.subtitle} · ${ARCHETYPE_LABELS[isl.archetype] || isl.archetype}`,
      tag: detailed ? 'Sculpted' : ARCHETYPE_LABELS[isl.archetype] || isl.archetype,
      kind: 'island',
      island: isl,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main Viewer Application
// ---------------------------------------------------------------------------
class AssetDebugViewer {
  constructor() {
    this.viewportEl = document.getElementById('viewport');
    this.listEl = document.getElementById('asset-list');
    this.searchEl = document.getElementById('asset-search');
    this.infoTitleEl = document.getElementById('info-title');
    this.infoDescEl = document.getElementById('info-desc');
    this.infoStatsEl = document.getElementById('info-stats');
    this.contextCardEl = document.getElementById('context-card');
    this.zoomSliderEl = document.getElementById('zoom-slider');

    this.catalog = buildAssetCatalog();
    this.activeItem = null;

    // Shared simulation & state for live canoe updates
    this.gameState = new GameState();
    this.oceanSim = new OceanSim();
    this.vakaCtrl = {
      tier: 1,
      rations: 4,
      cargo: 0,
      crew: new Set(),
      worn: false,
      steer: 0.0,
      solarHour: 9.2,
      swellMotion: false,
      helmMode: Difficulty.EASY,
    };
    this.playerCtrl = {
      steer: 0.0,
      wind: 0.65,
    };
    this.islandCtrl = {
      showClouds: false,
    };
    this.animCtrl = {
      speed: 1.0,
      fishLeapSingle: false,
    };
    this.cloudCtrl = {
      tradeVariant: 0,
      lighting: 'day',
    };

    // Viewer display flags
    this.showWaterGrid = true;
    this.showEdges = false;
    this.showWireframe = false;
    this.showAxes = false;
    this.autoSpin = false;
    this.paused = false;

    this._initThreeScene();
    this._initLiveSourceRenderers();
    this._initOrbitControls();
    this._initToolbarUI();
    this._renderSidebar('');

    // Select initial asset from URL ?asset=... or #... or default to Tier 1 Canoe
    const params = new URLSearchParams(window.location.search);
    const hashId = window.location.hash ? window.location.hash.slice(1) : '';
    const requestedId = params.get('asset') || hashId || 'vaka_tier1';
    const initial =
      this.catalog.find((c) => c.id === requestedId) || this.catalog[0];
    this.selectAsset(initial.id);

    this.lastTimeMs = performance.now();
    this.animElapsedSec = 0.0;
    requestAnimationFrame((t) => this._animate(t));
  }

  _initThreeScene() {
    this.scene = new THREE.Scene();

    const w = this.viewportEl.clientWidth || window.innerWidth - 310;
    const h = this.viewportEl.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.05, 4000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.viewportEl.appendChild(this.renderer.domElement);

    // Studio lighting for general assets (disabled when Vaka's own sun/hemi lights are active)
    this.studioLights = new THREE.Group();
    const hemi = new THREE.HemisphereLight(0xbde0ff, 0x243447, 1.05);
    const key = new THREE.DirectionalLight(0xfff2dc, 1.45);
    key.position.set(35, 55, 40);
    const rim = new THREE.DirectionalLight(0x7cc8ff, 0.55);
    rim.position.set(-40, 22, -35);
    this.studioLights.add(hemi, key, rim);
    this.scene.add(this.studioLights);

    // Reference Waterline Disc + Grid + Axes
    this.referenceGroup = new THREE.Group();
    this.waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0f4c68,
        roughness: 0.32,
        metalness: 0.12,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.waterDisc.rotation.x = -Math.PI / 2;
    this.waterDisc.position.y = -0.01;
    this.referenceGroup.add(this.waterDisc);

    this.gridHelper = new THREE.GridHelper(20, 20, 0x42d9c8, 0x244058);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.35;
    this.referenceGroup.add(this.gridHelper);
    this.scene.add(this.referenceGroup);

    this.axesHelper = new THREE.AxesHelper(5);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);

    // Container holding whichever asset is currently inspected
    this.stageGroup = new THREE.Group();
    this.scene.add(this.stageGroup);

    this.edgeLineMat = new THREE.LineBasicMaterial({
      color: 0xe6b872,
      transparent: true,
      opacity: 0.62,
    });

    window.addEventListener('resize', () => this._onResize());
  }

  _initLiveSourceRenderers() {
    // 1. Real VakaRenderer mounted into its own sub-scene holder, moved onto stage when selected
    this.vakaHolder = new THREE.Scene();
    this.vakaRenderer = new VakaRenderer(this.vakaHolder);

    // 2. Real WorldCuesRenderer built in an offscreen scene so we can inspect its exact live meshes
    this.cuesHolder = new THREE.Scene();
    this.worldCues = new WorldCuesRenderer(this.cuesHolder);
  }

  _initOrbitControls() {
    this.orbit = {
      target: new THREE.Vector3(0, 0.8, 0),
      defaultTarget: new THREE.Vector3(0, 0.8, 0),
      theta: 0.68, // Horizontal azimuth (rad)
      phi: 0.38,   // Elevation above horizon (rad)
      distance: 16.0,
      defaultDistance: 16.0,
      minDistance: 0.5,
      maxDistance: 180.0,
      dragging: false,
      panMode: false,
      lastX: 0,
      lastY: 0,
      pinchDist: 0,
    };

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('pointerdown', (e) => {
      this.orbit.dragging = true;
      this.orbit.panMode = e.button === 2 || e.button === 1 || e.shiftKey;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.orbit.dragging) return;
      const dx = e.clientX - this.orbit.lastX;
      const dy = e.clientY - this.orbit.lastY;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;

      if (this.orbit.panMode || e.shiftKey) {
        const panScale = this.orbit.distance * 0.0014;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
        this.orbit.target.addScaledVector(right, -dx * panScale);
        this.orbit.target.addScaledVector(up, dy * panScale);
      } else {
        this.orbit.theta -= dx * 0.0075;
        this.orbit.phi = Math.max(
          -1.48,
          Math.min(1.5, this.orbit.phi + dy * 0.0075)
        );
      }
      this._updateCameraFromOrbit();
    });

    const endDrag = (e) => {
      if (this.orbit.dragging) {
        this.orbit.dragging = false;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {
          // Ignore if not captured
        }
      }
    };
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = Math.exp(e.deltaY * 0.0013);
        this._setOrbitDistance(this.orbit.distance * factor);
      },
      { passive: false }
    );

    dom.addEventListener('dblclick', () => {
      this._applyCameraPreset('reset');
    });

    // 2-finger touch pinch zoom support
    dom.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.orbit.pinchDist = Math.hypot(dx, dy);
        }
      },
      { passive: true }
    );

    dom.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2 && this.orbit.pinchDist > 0) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const nextDist = Math.hypot(dx, dy);
          if (nextDist > 4) {
            const ratio = this.orbit.pinchDist / nextDist;
            this.orbit.pinchDist = nextDist;
            this._setOrbitDistance(this.orbit.distance * ratio);
          }
        }
      },
      { passive: true }
    );
  }

  _setOrbitDistance(dist) {
    this.orbit.distance = Math.max(
      this.orbit.minDistance,
      Math.min(this.orbit.maxDistance, dist)
    );
    // Sync slider (100 = closest minDistance, 0 = farthest maxDistance)
    const logMin = Math.log(this.orbit.minDistance);
    const logMax = Math.log(this.orbit.maxDistance);
    const norm = 1.0 - (Math.log(this.orbit.distance) - logMin) / Math.max(1e-5, logMax - logMin);
    this.zoomSliderEl.value = String(Math.round(Math.max(0, Math.min(100, norm * 100))));
    this._updateCameraFromOrbit();
  }

  _updateCameraFromOrbit() {
    const { target, theta, phi, distance } = this.orbit;
    const cosPhi = Math.cos(phi);
    const x = target.x + distance * cosPhi * Math.sin(theta);
    const y = target.y + distance * Math.sin(phi);
    const z = target.z + distance * cosPhi * Math.cos(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
  }

  _applyCameraPreset(mode) {
    if (mode === 'reset' || mode === 'iso') {
      this.orbit.target.copy(this.orbit.defaultTarget);
      this.orbit.theta = 0.68;
      this.orbit.phi = 0.36;
      this._setOrbitDistance(this.orbit.defaultDistance);
      return;
    }
    if (mode === 'front') {
      // Bow (-Z) faces forward, so view from -Z looking +Z (theta = PI)
      this.orbit.theta = Math.PI;
      this.orbit.phi = 0.14;
    } else if (mode === 'side') {
      this.orbit.theta = Math.PI * 0.5;
      this.orbit.phi = 0.14;
    } else if (mode === 'back') {
      this.orbit.theta = 0.0;
      this.orbit.phi = 0.16;
    } else if (mode === 'top') {
      this.orbit.theta = 0.0;
      this.orbit.phi = 1.48;
    } else if (mode === 'bottom') {
      this.orbit.theta = 0.45;
      this.orbit.phi = -1.15;
    }
    this._updateCameraFromOrbit();
  }

  _initToolbarUI() {
    this.searchEl.addEventListener('input', () => {
      this._renderSidebar(this.searchEl.value.trim().toLowerCase());
    });

    document.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._applyCameraPreset(btn.getAttribute('data-cam'));
      });
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      this._setOrbitDistance(this.orbit.distance * 0.76);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      this._setOrbitDistance(this.orbit.distance * 1.32);
    });

    this.zoomSliderEl.addEventListener('input', () => {
      const val = Number(this.zoomSliderEl.value) / 100.0;
      const logMin = Math.log(this.orbit.minDistance);
      const logMax = Math.log(this.orbit.maxDistance);
      const dist = Math.exp(logMax - val * (logMax - logMin));
      this.orbit.distance = dist;
      this._updateCameraFromOrbit();
    });

    const bindToggle = (id, getter, setter) => {
      const btn = document.getElementById(id);
      btn.addEventListener('click', () => {
        const next = !getter();
        setter(next);
        btn.classList.toggle('active', next);
      });
    };

    bindToggle(
      'toggle-water',
      () => this.showWaterGrid,
      (v) => {
        this.showWaterGrid = v;
        this.referenceGroup.visible = v;
      }
    );
    bindToggle(
      'toggle-edges',
      () => this.showEdges,
      (v) => {
        this.showEdges = v;
        this._rebuildEdgeOverlay();
      }
    );
    bindToggle(
      'toggle-wire',
      () => this.showWireframe,
      (v) => {
        this.showWireframe = v;
        this._applyWireframeFlag();
      }
    );
    bindToggle(
      'toggle-axes',
      () => this.showAxes,
      (v) => {
        this.showAxes = v;
        this.axesHelper.visible = v;
      }
    );
    bindToggle(
      'toggle-spin',
      () => this.autoSpin,
      (v) => {
        this.autoSpin = v;
      }
    );
    bindToggle(
      'toggle-pause',
      () => this.paused,
      (v) => {
        this.paused = v;
      }
    );
  }

  _renderSidebar(filterText) {
    this.listEl.innerHTML = '';
    let lastCat = '';

    for (const item of this.catalog) {
      if (filterText) {
        const hay = `${item.name} ${item.subtitle} ${item.category} ${item.tag}`.toLowerCase();
        if (!hay.includes(filterText)) continue;
      }

      if (item.category !== lastCat) {
        lastCat = item.category;
        const h = document.createElement('div');
        h.className = 'category-heading';
        h.textContent = lastCat;
        this.listEl.appendChild(h);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'asset-btn' + (this.activeItem?.id === item.id ? ' active' : '');
      btn.dataset.assetId = item.id;
      btn.innerHTML = `
        <span class="asset-btn-main">
          <span class="asset-btn-name">${item.name}</span>
          <span class="asset-btn-sub">${item.subtitle}</span>
        </span>
        <span class="asset-tag">${item.tag}</span>
      `;
      btn.addEventListener('click', () => this.selectAsset(item.id));
      this.listEl.appendChild(btn);
    }
  }

  // -------------------------------------------------------------------------
  // Asset Selection & Stage Construction
  // -------------------------------------------------------------------------
  selectAsset(assetId) {
    const item = this.catalog.find((c) => c.id === assetId);
    if (!item) return;

    this._clearStage();
    this.activeItem = item;
    window.history.replaceState(null, '', `#${item.id}`);

    // Update active state in sidebar
    this.listEl.querySelectorAll('.asset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.assetId === item.id);
    });

    this.activeTickFn = null;

    if (item.kind === 'vaka') {
      this._mountVakaAsset(item);
    } else if (item.kind === 'player_char') {
      this._mountPlayerCharacterAsset(item);
    } else if (item.kind === 'crew_char') {
      this._mountCrewCharacterAsset(item);
    } else if (item.kind === 'bird_single') {
      this._mountSingleBirdAsset(item);
    } else if (item.kind === 'bird_flock') {
      this._mountBirdFlockAsset();
    } else if (item.kind === 'cloud') {
      this._mountCloudAsset(item);
    } else if (item.kind === 'fish_single') {
      this._mountSingleFishAsset();
    } else if (item.kind === 'fish_school') {
      this._mountFishSchoolAsset();
    } else if (item.kind === 'fronds') {
      this._mountFrondsAsset();
    } else if (item.kind === 'pearl_shells') {
      this._mountPearlShellsAsset();
    } else if (item.kind === 'prop') {
      this._mountIslandPropAsset(item);
    } else if (item.kind === 'moai_showcase') {
      this._mountMoaiShowcaseAsset();
    } else if (item.kind === 'island') {
      this._mountIslandAsset(item.island);
    }

    this._renderContextControls(item);
    this._applyWireframeFlag();
    this._frameActiveStage();
    this._updateInfoCard();
    this._rebuildEdgeOverlay();
  }

  _clearStage() {
    this._clearEdgeOverlay();

    // Return Vaka root & lights to holder if previously mounted
    if (this.vakaRenderer.root.parent === this.stageGroup) {
      this.vakaHolder.add(this.vakaRenderer.root);
      this.vakaHolder.add(this.vakaRenderer.hemiLight);
      this.vakaHolder.add(this.vakaRenderer.sunLight);
      this.vakaHolder.add(this.vakaRenderer.sunLight.target);
    }

    while (this.stageGroup.children.length > 0) {
      this.stageGroup.remove(this.stageGroup.children[0]);
    }
    this.studioLights.visible = true;
  }

  _mountVakaAsset(item) {
    const p = item.preset;
    this.vakaCtrl.tier = p.tier;
    this.vakaCtrl.rations = p.rations;
    this.vakaCtrl.cargo = p.cargo;
    this.vakaCtrl.crew = new Set(p.crew);
    this.vakaCtrl.worn = p.worn;
    this.vakaCtrl.steer = p.steer;
    this.vakaCtrl.solarHour = p.solarHour;
    this.vakaCtrl.swellMotion = p.swellMotion;
    this.vakaCtrl.helmMode = p.helmMode || Difficulty.EASY;

    this.studioLights.visible = false;
    this.stageGroup.add(this.vakaRenderer.root);
    this.stageGroup.add(this.vakaRenderer.hemiLight);
    this.stageGroup.add(this.vakaRenderer.sunLight);
    this.stageGroup.add(this.vakaRenderer.sunLight.target);

    this._syncAndTickVaka(0.016, this.animElapsedSec);
    this.activeTickFn = (dt, elapsed) => this._syncAndTickVaka(dt, elapsed);
  }

  _syncAndTickVaka(dt, elapsed) {
    this.gameState.vakaTier = this.vakaCtrl.tier;
    if (this.vakaCtrl.helmMode && this.vakaCtrl.helmMode !== 'hidden') {
      this.gameState.difficulty = this.vakaCtrl.helmMode;
    }
    this.gameState.cargoItems = Array.from(
      { length: this.vakaCtrl.cargo },
      (_, idx) => `debug_cargo_${idx}`
    );
    this.gameState.assignedCrew = Array.from(this.vakaCtrl.crew);
    this.gameState.hullCondition = this.vakaCtrl.worn ? 36.0 : 100.0;
    this.gameState.sailCondition = this.vakaCtrl.worn ? 36.0 : 100.0;

    this.oceanSim.rationsRemaining = this.vakaCtrl.rations;
    this.oceanSim.solarHour = this.vakaCtrl.solarHour;
    this.oceanSim.step(this.vakaCtrl.swellMotion ? dt : 0.0);

    if (!this.vakaCtrl.swellMotion && this.oceanSim.hullState) {
      this.oceanSim.hullState.heaveM = 0.0;
      this.oceanSim.hullState.pitchRad = 0.0;
      this.oceanSim.hullState.rollRad = 0.0;
    }

    this.vakaRenderer.update(
      dt,
      elapsed,
      this.oceanSim,
      this.gameState,
      this.vakaCtrl.steer,
      { showPlayerOnCanoe: this.vakaCtrl.helmMode !== 'hidden' }
    );
  }

  _mountPlayerCharacterAsset(item) {
    const rig = createPlayerCharacterRig(item.difficulty);
    // Rotate 180 deg around Y in standalone studio so character faces the front camera (+Z)
    rig.root.rotation.y = Math.PI;

    // Subtle woven pandanus deck plinth underfoot
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.58, 0.05, 32),
      new THREE.MeshStandardMaterial({
        color: 0xc29e65,
        roughness: 0.88,
        metalness: 0.02,
      })
    );
    plinth.position.y = -0.025;
    this.stageGroup.add(plinth);
    this.stageGroup.add(rig.root);

    const applyPose = (elapsed) => {
      animatePlayerCharacterRig(rig, elapsed * this.animCtrl.speed, {
        steerNorm: this.playerCtrl.steer,
        windStrength: this.playerCtrl.wind,
      });
    };
    applyPose(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => applyPose(elapsed);
  }

  _mountCrewCharacterAsset(item) {
    const rig = createCrewCharacterRig(item.crewId);
    // Rotate 180 deg around Y in standalone studio so character faces the front camera (+Z)
    rig.root.rotation.y = Math.PI;

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.58, 0.05, 32),
      new THREE.MeshStandardMaterial({
        color: 0xc29e65,
        roughness: 0.88,
        metalness: 0.02,
      })
    );
    plinth.position.y = -0.025;
    this.stageGroup.add(plinth);
    this.stageGroup.add(rig.root);

    const applyPose = (elapsed) => {
      animateCrewCharacterRig(rig, elapsed * this.animCtrl.speed);
    };
    applyPose(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => applyPose(elapsed);
  }

  _mountSingleBirdAsset(item) {
    const species =
      item.species === 'brown_booby'
        ? 'brown_booby'
        : item.species === 'red_kura'
          ? 'red_kura'
          : 'white_tern';
    const entry = this.worldCues.createSeabird(species, { opaque: true });
    entry.root.position.set(0, 0.52, 0);
    this.stageGroup.add(entry.root);

    // Subtle coral-sand pedestal disc at y = 0 so landing touchdown is visually grounded
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.03, 28),
      new THREE.MeshStandardMaterial({
        color: 0xdccaa2,
        roughness: 0.9,
      })
    );
    pad.position.set(0, -0.015, 0);
    pad.receiveShadow = true;
    this.stageGroup.add(pad);

    const smoothstep = (e0, e1, v) => {
      const t = Math.max(0.0, Math.min(1.0, (v - e0) / (e1 - e0)));
      return t * t * (3.0 - 2.0 * t);
    };
    const lerp = (a, b, t) => a + (b - a) * t;
    const flyY = 0.52;
    const standY = entry.standFootHeight || 0.135;
    const cycleDur = 10.5;

    const applyCycle = (elapsed) => {
      const spd = this.animCtrl.speed || 1.0;
      const t = (elapsed * spd) % cycleDur;

      let y = flyY;
      let poseOpts = null;

      if (t < 3.2) {
        // 1. Cruising Flight
        poseOpts = null;
      } else if (t < 4.8) {
        // 2. Descending Flare -> Touchdown & Fold
        const u = (t - 3.2) / 1.6;
        const vertT = 1.0 - Math.pow(1.0 - u, 2.0);
        y = lerp(flyY, standY, vertT);
        const foldBlend = smoothstep(0.75, 1.0, u);
        poseOpts = {
          standBlend: smoothstep(0.65, 1.0, u),
          legExtend: smoothstep(0.25, 0.82, u),
          foldBlend,
          spreadBlend: 0.0,
          flapSpeed: lerp(1.0, 1.12, smoothstep(0.2, 0.78, u)),
          flapAmp: lerp(0.9, 1.08, smoothstep(0.2, 0.78, u)) * (1.0 - foldBlend),
          pitchRad: Math.sin(u * Math.PI) * 0.32 * (1.0 - foldBlend),
          lookYawRad: 0.0,
        };
      } else if (t < 7.6) {
        // 3. Standing Folded Pose + Alert Look
        const u = (t - 4.8) / 2.8;
        y = standY;
        poseOpts = {
          standBlend: 1.0,
          legExtend: 1.0,
          foldBlend: 1.0,
          spreadBlend: 0.0,
          flapSpeed: 1.0,
          flapAmp: 0.0,
          pitchRad: 0.0,
          lookYawRad: Math.sin(u * Math.PI * 2.0) * 0.34,
        };
      } else if (t < 8.4) {
        // 4. Spread Wings Wide for Takeoff
        const u = (t - 7.6) / 0.8;
        y = standY - Math.sin(u * Math.PI) * 0.018;
        poseOpts = {
          standBlend: 1.0 - u * 0.45,
          legExtend: 1.0,
          foldBlend: 1.0 - smoothstep(0.0, 0.75, u),
          spreadBlend: smoothstep(0.05, 0.9, u),
          flapSpeed: 1.2,
          flapAmp: 0.0,
          pitchRad: 0.0,
          lookYawRad: 0.0,
        };
      } else {
        // 5. Climb Out & Tuck Legs Back Into Flight
        const u = (t - 8.4) / 2.1;
        const spreadBlend = 1.0 - smoothstep(0.0, 0.28, u);
        y = lerp(standY, flyY, Math.pow(u, 1.2)) + Math.sin(Math.min(1.0, u * 2.5) * Math.PI) * 0.06;
        poseOpts = {
          standBlend: 1.0 - smoothstep(0.0, 0.32, u),
          legExtend: 1.0 - smoothstep(0.15, 0.62, u),
          foldBlend: 0.0,
          spreadBlend,
          flapSpeed: lerp(1.16, 1.0, u),
          flapAmp: lerp(1.12, 1.0, u) * (1.0 - spreadBlend * 0.65),
          pitchRad: 0.22 * Math.sin(u * Math.PI),
          lookYawRad: 0.0,
        };
      }

      this.worldCues.animateSeabird(entry, elapsed, 0.0, spd, poseOpts);
      entry.root.position.y = y + entry.bobY;
    };

    applyCycle(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => applyCycle(elapsed);
  }

  _mountBirdFlockAsset() {
    const flockEntries = [];
    for (let i = 0; i < 8; i += 1) {
      const isBooby = i % 2 === 1;
      const entry = this.worldCues.createSeabird(
        isBooby ? 'brown_booby' : 'white_tern',
        { opaque: true }
      );
      const row = Math.floor((i + 1) / 2);
      const side = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
      const baseY = 1.4 + (i % 3) * 0.45;
      entry.root.position.set(
        side * row * 1.85,
        baseY,
        row * 1.65 - 2.2
      );
      this.stageGroup.add(entry.root);
      flockEntries.push({ entry, phase: i * 0.78, baseY });
    }

    const applyFlap = (elapsed) => {
      for (const f of flockEntries) {
        this.worldCues.animateSeabird(
          f.entry,
          elapsed,
          f.phase,
          this.animCtrl.speed
        );
        f.entry.root.position.y = f.baseY + f.entry.bobY;
      }
    };
    applyFlap(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => applyFlap(elapsed);
  }

  _mountCloudAsset(item) {
    const slot0 = this.worldCues.islandSlots[0];
    let cloudClone = null;
    const isLapa = item.cloudType === 'lapa';

    if (item.cloudType === 'trade') {
      const idx = Math.max(
        0,
        Math.min(TRADE_CLOUD_VARIANT_KEYS.length - 1, this.cloudCtrl.tradeVariant)
      );
      const sculpted = createSculptedCloudMesh(TRADE_CLOUD_VARIANT_KEYS[idx], {
        opacity: 1.0,
      });
      cloudClone = new THREE.Group();
      cloudClone.add(sculpted.mesh);
      cloudClone.position.set(0, 14, 0);
    } else if (item.cloudType === 'peak') {
      cloudClone = slot0.peakCloud.clone(true);
      cloudClone.visible = true;
      cloudClone.scale.setScalar(1.0);
      cloudClone.position.set(0, 22, 0);
    } else {
      cloudClone = slot0.lapaCloud.clone(true);
      cloudClone.visible = true;
      cloudClone.scale.setScalar(1.0);
      // Shift down so the sculpted canopy (~35m..55m) sits cleanly above the reference ocean disc
      cloudClone.position.set(0, -24, 0);
    }

    const cloudMats = [];
    cloudClone.traverse((c) => {
      if (c.isMesh && c.material) {
        c.material = c.material.clone();
        cloudMats.push(c.material);
      }
    });
    this.stageGroup.add(cloudClone);

    const applyCloudLighting = (elapsed) => {
      const mode = this.cloudCtrl.lighting;
      let sunDir = { x: 0.52, y: 0.68, z: 0.52 };
      let daylight = 0.96;
      let twilight = 0.10;
      if (mode === 'twilight') {
        sunDir = { x: 0.78, y: 0.14, z: 0.61 };
        daylight = 0.34;
        twilight = 0.95;
      } else if (mode === 'night') {
        sunDir = { x: -0.45, y: -0.65, z: 0.61 };
        daylight = 0.0;
        twilight = 0.0;
      }
      for (const m of cloudMats) {
        updateCloudMaterialUniforms(m, {
          sunDir,
          daylight,
          twilight,
          opacity: 1.0,
          lapaGlow: isLapa ? 1.0 : 0.0,
          elapsedSec: elapsed,
        });
      }
    };

    applyCloudLighting(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => applyCloudLighting(elapsed);
  }

  _mountSingleFishAsset() {
    const fish = this.worldCues.createBonitoFish({ cloneMaterials: true });
    const tailPivot = fish.userData.tailPivot;
    fish.position.set(0, 0.36, 0);
    this.stageGroup.add(fish);

    this.activeTickFn = (_dt, elapsed) => {
      const scaled = elapsed * this.animCtrl.speed;
      if (this.animCtrl.fishLeapSingle) {
        const t = (scaled * 2.4) % (Math.PI * 2.0);
        const sinT = Math.sin(t);
        fish.position.y = Math.max(-0.25, sinT * 1.45);
        fish.rotation.z = sinT > -0.22 ? Math.cos(t) * 0.68 : 0.0;
        if (tailPivot) {
          tailPivot.rotation.y = Math.sin(scaled * 16.0) * 0.3;
        }
      } else {
        fish.position.y = 0.36;
        fish.rotation.set(0, 0, 0);
        if (tailPivot) {
          tailPivot.rotation.y = Math.sin(scaled * 8.5) * 0.16;
        }
      }
    };
  }

  _mountFishSchoolAsset() {
    const schoolGroup = new THREE.Group();
    const entries = [];
    for (const lf of this.worldCues.leapingFish) {
      const mesh = this.worldCues.createBonitoFish({ cloneMaterials: true });
      mesh.scale.copy(lf.mesh.scale);
      schoolGroup.add(mesh);
      entries.push({
        mesh,
        tailPivot: mesh.userData.tailPivot,
        angle: lf.angle,
        radius: lf.radius,
        phase: lf.phase,
      });
    }
    this.stageGroup.add(schoolGroup);

    const tickSchool = (elapsed) => {
      const scaled = elapsed * this.animCtrl.speed;
      for (const lf of entries) {
        const t = (scaled * 2.4 + lf.phase) % (Math.PI * 2.0);
        const sinT = Math.sin(t);
        const arcY = Math.max(-0.42, sinT * 1.85);
        const swimAngle = lf.angle + scaled * 0.62;
        lf.mesh.position.set(
          Math.cos(swimAngle) * lf.radius,
          arcY,
          Math.sin(swimAngle) * lf.radius
        );
        lf.mesh.rotation.y = -swimAngle - Math.PI * 0.5;
        lf.mesh.rotation.z = sinT > -0.22 ? Math.cos(t) * 0.68 : 0.0;
        lf.mesh.rotation.x = -0.16;
        if (lf.tailPivot) {
          lf.tailPivot.rotation.y =
            Math.sin(scaled * 16.0 + lf.phase * 3.1) * 0.28;
        }
      }
    };
    tickSchool(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => tickSchool(elapsed);
  }

  _mountFrondsAsset() {
    const group = new THREE.Group();
    for (let i = 0; i < 5; i += 1) {
      const src = this.worldCues.fronds[i].mesh;
      const m = src.clone(true);
      m.material = src.material.clone();
      m.position.set((i - 2) * 1.25, 0.05, ((i * 7) % 3 - 1) * 0.85);
      m.rotation.z = i * 0.45;
      group.add(m);
    }
    this.stageGroup.add(group);
  }

  _mountPearlShellsAsset() {
    const group = new THREE.Group();
    const trackMat = (mat) => mat;

    // Warm coral-sand lagoon shoal disc under the giant pearl shell cluster
    const sandPad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.45, 0.14, 36),
      new THREE.MeshStandardMaterial({
        color: 0xe6d6b0,
        roughness: 0.9,
      })
    );
    sandPad.position.set(0, -0.07, 0);
    sandPad.receiveShadow = true;
    group.add(sandPad);

    // 1. Hero open giant pearl shell with lustrous South Seas cream pearl
    const heroShell = createGiantPearlShellGroup(trackMat, {
      mode: 'open_pearl',
      pearlType: 'cream',
      scale: 1.15,
      openAngleRad: 0.82,
    });
    heroShell.group.position.set(-0.45, 0.0, 0.15);
    heroShell.group.rotation.y = 0.25;
    group.add(heroShell.group);

    // 2. Companion open black-lip shell cradling a shimmering dark Tahitian pearl
    const blackShell = createGiantPearlShellGroup(trackMat, {
      mode: 'open_pearl',
      pearlType: 'black',
      scale: 0.88,
      openAngleRad: 0.74,
    });
    blackShell.group.position.set(0.95, 0.0, -0.45);
    blackShell.group.rotation.y = -0.48;
    group.add(blackShell.group);

    // 3. Harvested single fluted half-valve tilted slightly to show exterior ridges & nacre bowl
    const singleValve = createGiantPearlShellGroup(trackMat, {
      mode: 'single_valve',
      scale: 0.82,
    });
    singleValve.group.position.set(0.72, 0.14, 0.78);
    singleValve.group.rotation.set(0.18, -0.75, -0.32);
    group.add(singleValve.group);

    this.stageGroup.add(group);

    // Gentle living valve breathing motion on the hero shell
    const tickShells = (elapsed) => {
      if (heroShell.upperPivot) {
        heroShell.upperPivot.rotation.x =
          -0.82 + Math.sin(elapsed * 0.9) * 0.07;
      }
      if (blackShell.upperPivot) {
        blackShell.upperPivot.rotation.x =
          -0.74 + Math.sin(elapsed * 0.9 + 1.8) * 0.05;
      }
    };
    tickShells(this.animElapsedSec);
    this.activeTickFn = (_dt, elapsed) => tickShells(elapsed);
  }

  _mountIslandPropAsset(item) {
    const group = new THREE.Group();
    const trackMat = (mat) => mat;
    const isLagoonWater =
      item.propId === 'pearl_lines' || item.propId === 'fish_weir';

    // Ground / lagoon shoal inspection plinth
    const plinthRadius =
      item.propId === 'marae_platforms'
        ? 11.8
        : item.propId === 'pearl_lines' ||
          item.propId === 'fish_weir' ||
          item.propId === 'regional_fares'
        ? 9.0
        : item.propId === 'carved_hulls' ||
          item.propId === 'sail_dye_and_loom' ||
          item.propId === 'coconut_grove' ||
          item.propId === 'broadleaf_forest'
        ? 5.6
        : 4.0;
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(plinthRadius, plinthRadius + 0.35, 0.16, 40),
      new THREE.MeshStandardMaterial({
        color: isLagoonWater ? 0x1a7882 : 0xcfb98f,
        roughness: isLagoonWater ? 0.25 : 0.9,
        metalness: isLagoonWater ? 0.08 : 0.02,
      })
    );
    pad.position.y = -0.08;
    pad.receiveShadow = true;
    group.add(pad);

    const flameEntries = [];

    if (item.propId === 'tridacna_altar') {
      const altar = createSculptedTridacnaAltarGroup(trackMat);
      altar.group.rotation.y = 0.35;
      group.add(altar.group);
    } else if (item.propId === 'carved_hulls') {
      const hulls = createCarvedHullPairGroup(trackMat);
      group.add(hulls.group);
    } else if (item.propId === 'sail_dye_and_loom') {
      const vats = createSailDyeVatsCluster(
        trackMat,
        [0xb83227, 0xd9a441, 0x2ea89c],
        1.15
      );
      vats.group.position.set(-1.6, 0, 0.6);
      group.add(vats.group);

      const rack = createPandanusSailFrameGroup(trackMat, {
        sailColorHex: 0xe6cfa3,
        width: 2.3,
        height: 1.45,
        arched: true,
      });
      rack.group.position.set(1.5, 0, -0.4);
      rack.group.rotation.y = -0.35;
      group.add(rack.group);
    } else if (item.propId === 'marquesan_tiki') {
      const redTuffMat = new THREE.MeshStandardMaterial({
        color: 0xa84330,
        roughness: 0.86,
      });
      const darkBasaltMat = new THREE.MeshStandardMaterial({
        color: 0x302e2d,
        roughness: 0.92,
      });
      const tiki = createMarquesanTikiSculpture(redTuffMat, darkBasaltMat, 1.0);
      tiki.position.set(-1.3, 0, 0.2);
      tiki.rotation.y = 0.25;
      group.add(tiki);

      const quarry = createQuarriedTikiBlockGroup(redTuffMat, darkBasaltMat);
      quarry.group.position.set(1.75, 0, -0.35);
      quarry.group.rotation.y = 0.5;
      group.add(quarry.group);
    } else if (item.propId === 'pearl_lines') {
      const cluster = createPearlLineClusterGroup(trackMat, 3, 5);
      cluster.group.position.set(0, 0, -5.0);
      group.add(cluster.group);
    } else if (item.propId === 'whale_arch') {
      const arch = createWhaleJawArchGroup(trackMat);
      group.add(arch.group);
    } else if (item.propId === 'fish_weir') {
      const weir = createBasaltFishWeirGroup(trackMat);
      weir.group.position.set(1.2, 0.28, 0);
      group.add(weir.group);
    } else if (item.propId === 'torches_hearth_cairn') {
      const torch = createKukuiTorchGroup(trackMat, { height: 1.65 });
      torch.group.position.set(-2.1, 0, 0.6);
      group.add(torch.group);
      flameEntries.push({
        mesh: torch.flame,
        baseY: torch.flame.position.y,
        phase: 0.2,
      });

      const hearth = createVillageHearthGroup(trackMat, { scale: 1.05 });
      hearth.group.position.set(-0.4, 0, -0.5);
      group.add(hearth.group);
      flameEntries.push({
        mesh: hearth.flame,
        baseY: hearth.flame.position.y,
        phase: 1.7,
      });

      const stone = createCarvedStandingStoneGroup(trackMat, {
        width: 0.48,
        height: 1.25,
        depth: 0.28,
        colorHex: 0x3b3a3c,
      });
      stone.group.position.set(1.1, 0, 0.6);
      stone.group.rotation.y = -0.35;
      group.add(stone.group);

      const cairn = createCoralCairnGroup(trackMat);
      cairn.group.position.set(2.35, 0, -0.4);
      cairn.group.scale.setScalar(0.8);
      group.add(cairn.group);
    } else if (item.propId === 'regional_fares') {
      addRegionalHuts(
        group,
        trackMat,
        [
          { x: -3.2, y: 0, z: 0.8, rotY: 0.35, scale: 1.0, longHouse: false },
          { x: -2.8, y: 0, z: -3.4, rotY: 0.15, scale: 1.05, longHouse: true },
        ],
        'society'
      );
      const shed = createSculptedShipwrightShedGroup(trackMat, {
        width: 4.8,
        depth: 6.8,
      });
      shed.group.position.set(2.6, 0, 0.0);
      group.add(shed.group);

      const hullsInside = createCarvedHullPairGroup(trackMat);
      hullsInside.group.position.set(2.6, 0, 0.2);
      group.add(hullsInside.group);
    } else if (item.propId === 'marae_platforms') {
      // Mangareva white-coral Gateway Marae alongside Hawai'i basalt Heiau with 'Anu'u tower
      addMaraePlatform(group, trackMat, {
        x: -4.6,
        y: 0.0,
        z: 0.0,
        rotY: 0.2,
        scale: 0.88,
        courtHex: 0xdcd3be,
        ahuHex: 0xf0ead9,
      });
      addMaraePlatform(group, trackMat, {
        x: 4.8,
        y: 0.0,
        z: 0.0,
        rotY: -0.25,
        scale: 0.92,
        courtHex: 0x222124,
        ahuHex: 0x363438,
        withOracleTower: true,
        withBraziers: true,
      });
    } else if (item.propId === 'coconut_grove') {
      addCoconutGroves(group, trackMat, [
        [-2.0, 0, 0.8, 0.25, 1.15, 0.22],
        [0.4, 0, -1.2, -0.45, 0.95, 0.28],
        [2.2, 0, 1.0, -1.1, 1.05, 0.16],
      ]);
    } else if (item.propId === 'broadleaf_forest') {
      // Flowering crimson 'ohi'a lehua (left), emerald 'uru breadfruit (center), warm olive miro (right)
      addBroadleafTrees(
        group,
        trackMat,
        [[-2.5, 0, 0.3, 1.02, 0.4]],
        {
          trunkHex: 0x4b3324,
          canopyHexA: 0x264e24,
          canopyHexB: 0x38662a,
          blossomHex: 0xd92626,
        }
      );
      addBroadleafTrees(
        group,
        trackMat,
        [[0.4, 0, -0.8, 1.12, -0.6]],
        {
          trunkHex: 0x5c3e26,
          canopyHexA: 0x265e24,
          canopyHexB: 0x3b782b,
        }
      );
      addBroadleafTrees(
        group,
        trackMat,
        [[2.7, 0, 0.7, 0.96, 1.1]],
        {
          trunkHex: 0x583a22,
          canopyHexA: 0x4c6122,
          canopyHexB: 0x5f782b,
        }
      );
    } else if (item.propId === 'coastal_scrub_pandanus') {
      addCoastalScrub(group, trackMat, [
        [-1.6, 0, 0.3, 1.45, 1.0, 1.35, 0.2],
        [0.1, 0, -0.9, 1.35, 0.72, 1.2, 0.9],
        [1.7, 0, 0.5, 1.25, 0.65, 1.15, -0.5],
        [-0.3, 0, 1.2, 1.3, 0.9, 1.2, 1.8],
        [1.4, 0, -1.3, 1.15, 0.6, 1.05, -1.2],
      ]);
    }

    this.stageGroup.add(group);

    if (flameEntries.length > 0) {
      const tickProps = (elapsed) => {
        for (const f of flameEntries) {
          const flk =
            1.0 +
            0.12 * Math.sin(elapsed * 8.5 + f.phase) +
            0.07 * Math.cos(elapsed * 14.0 + f.phase * 1.9);
          f.mesh.scale.set(1.0 + (flk - 1.0) * 0.45, flk, 1.0 + (flk - 1.0) * 0.45);
          f.mesh.position.y = f.baseY + (flk - 1.0) * 0.04;
        }
      };
      tickProps(this.animElapsedSec);
      this.activeTickFn = (_dt, elapsed) => tickProps(elapsed);
    }
  }

  _mountMoaiShowcaseAsset() {
    const showcase = createRapaNuiMoaiShowcaseAssembly();
    this.stageGroup.add(showcase.group);
  }

  _mountIslandAsset(isl) {
    // Clone one full island beacon slot from WorldCuesRenderer and apply exact per-island visibility rules
    const srcSlot = this.worldCues.islandSlots[0];
    const root = srcSlot.root.clone(true);
    root.visible = true;
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);

    root.traverse((c) => {
      if (c.isMesh && c.material) c.material = c.material.clone();
    });

    const peakCloud = root.children[0];
    const lapaCloud = root.children[1];
    const landGroup = root.children[2];
    const mainPeak = landGroup.children[0];
    const secondPeak = landGroup.children[1];
    const atollRing = landGroup.children[2];
    const lagoonDisc = landGroup.children[3];
    const moaiGroup = landGroup.children[4];

    landGroup.visible = true;
    landGroup.position.y = 0.0;

    if (hasDetailedIslandModel(isl.id)) {
      mainPeak.visible = false;
      secondPeak.visible = false;
      atollRing.visible = false;
      lagoonDisc.visible = false;
      moaiGroup.visible = false;

      const detailed = createDetailedIslandAssembly(isl.id);
      detailed.group.rotation.y =
        isl.id === 'rapa_nui' ? 0.0 : getIslandApproachOrientationRad(isl.id);
      landGroup.add(detailed.group);
    } else {
      const isAtoll = isl.archetype === 'coral_atoll';
      mainPeak.visible = !isAtoll;
      secondPeak.visible = isl.archetype === 'twin_peaks';
      atollRing.visible = isAtoll;
      lagoonDisc.visible = isAtoll;
      moaiGroup.visible = isl.id === 'hawaii';

      const peakHex = isl.archetype === 'fortress_crag' ? 0x26292e : 0x2d5a36;
      mainPeak.material.color.setHex(peakHex);
      secondPeak.material.color.setHex(peakHex);
    }

    peakCloud.visible = this.islandCtrl.showClouds && Boolean(isl.hasPeakCloud);
    lapaCloud.visible = this.islandCtrl.showClouds && Boolean(isl.hasLapaGlow);

    this.currentIslandNodes = { peakCloud, lapaCloud, isl };
    this.stageGroup.add(root);
  }

  // -------------------------------------------------------------------------
  // Context Controls (Bottom-Right Inspector)
  // -------------------------------------------------------------------------
  _renderContextControls(item) {
    this.contextCardEl.innerHTML = '';

    if (item.kind === 'vaka') {
      this.contextCardEl.classList.remove('hidden');
      this.contextCardEl.innerHTML = `
        <div class="context-heading">Canoe Upgrade &amp; Deck Inspector</div>
        <div class="ctrl-row">
          <span>Upgrade Tier:</span>
          <span>
            <button class="tool-btn ${this.vakaCtrl.tier === 1 ? 'active' : ''}" data-vtier="1">Tier 1</button>
            <button class="tool-btn ${this.vakaCtrl.tier === 2 ? 'active' : ''}" data-vtier="2">Tier 2</button>
            <button class="tool-btn ${this.vakaCtrl.tier === 3 ? 'active' : ''}" data-vtier="3">Tier 3</button>
          </span>
        </div>
        <div class="ctrl-row" style="flex-wrap:wrap;gap:4px;">
          <span>Helm Character:</span>
          <span>
            <button class="tool-btn ${this.vakaCtrl.helmMode === 'easy' ? 'active' : ''}" data-vhelm="easy">12–14y</button>
            <button class="tool-btn ${this.vakaCtrl.helmMode === 'medium' ? 'active' : ''}" data-vhelm="medium">18–20y</button>
            <button class="tool-btn ${this.vakaCtrl.helmMode === 'hard' ? 'active' : ''}" data-vhelm="hard">30y</button>
            <button class="tool-btn ${this.vakaCtrl.helmMode === 'master_navigator' ? 'active' : ''}" data-vhelm="master_navigator">50y</button>
            <button class="tool-btn ${this.vakaCtrl.helmMode === 'hidden' ? 'active' : ''}" data-vhelm="hidden" title="First-Person Deck View hides player mesh">Deck View</button>
          </span>
        </div>
        <div class="ctrl-row">
          <span>Ration Baskets (<strong id="lbl-rations">${this.vakaCtrl.rations}</strong>):</span>
          <input id="inp-rations" type="range" min="0" max="8" step="1" value="${this.vakaCtrl.rations}" />
        </div>
        <div class="ctrl-row">
          <span>Cargo Bundles (<strong id="lbl-cargo">${this.vakaCtrl.cargo}</strong>):</span>
          <input id="inp-cargo" type="range" min="0" max="3" step="1" value="${this.vakaCtrl.cargo}" />
        </div>
        <div class="ctrl-row">
          <span>Hoe Uli Sweep (<strong id="lbl-steer">${this.vakaCtrl.steer.toFixed(2)}</strong>):</span>
          <input id="inp-steer" type="range" min="-1" max="1" step="0.05" value="${this.vakaCtrl.steer}" />
        </div>
        <div class="ctrl-row">
          <span>Sun Shadow Hr (<strong id="lbl-hour">${this.vakaCtrl.solarHour.toFixed(1)}h</strong>):</span>
          <input id="inp-hour" type="range" min="6.5" max="17.5" step="0.25" value="${this.vakaCtrl.solarHour}" />
        </div>
        <div class="ctrl-checks">
          <label><input type="checkbox" data-crew="tama" ${this.vakaCtrl.crew.has('tama') ? 'checked' : ''} /> Tama</label>
          <label><input type="checkbox" data-crew="moana" ${this.vakaCtrl.crew.has('moana') ? 'checked' : ''} /> Moana</label>
          <label><input type="checkbox" data-crew="kahu" ${this.vakaCtrl.crew.has('kahu') ? 'checked' : ''} /> Kahu</label>
          <label><input id="chk-worn" type="checkbox" ${this.vakaCtrl.worn ? 'checked' : ''} /> Worn (&lt;55%)</label>
          <label><input id="chk-swell" type="checkbox" ${this.vakaCtrl.swellMotion ? 'checked' : ''} /> Live Swell</label>
        </div>
      `;

      this.contextCardEl.querySelectorAll('[data-vtier]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.vakaCtrl.tier = Number(btn.dataset.vtier);
          this.contextCardEl.querySelectorAll('[data-vtier]').forEach((b) => {
            b.classList.toggle('active', Number(b.dataset.vtier) === this.vakaCtrl.tier);
          });
          this._syncAndTickVaka(0.0, this.animElapsedSec);
          this._updateInfoCard();
          this._rebuildEdgeOverlay();
        });
      });

      const bindSlider = (id, lblId, fmt, apply) => {
        const el = document.getElementById(id);
        const lbl = document.getElementById(lblId);
        el.addEventListener('input', () => {
          const val = Number(el.value);
          lbl.textContent = fmt(val);
          apply(val);
          this._syncAndTickVaka(0.0, this.animElapsedSec);
          this._updateInfoCard();
        });
      };

      bindSlider('inp-rations', 'lbl-rations', (v) => String(v), (v) => {
        this.vakaCtrl.rations = v;
      });
      bindSlider('inp-cargo', 'lbl-cargo', (v) => String(v), (v) => {
        this.vakaCtrl.cargo = v;
      });
      bindSlider('inp-steer', 'lbl-steer', (v) => v.toFixed(2), (v) => {
        this.vakaCtrl.steer = v;
      });
      bindSlider('inp-hour', 'lbl-hour', (v) => `${v.toFixed(1)}h`, (v) => {
        this.vakaCtrl.solarHour = v;
      });

      this.contextCardEl.querySelectorAll('[data-crew]').forEach((chk) => {
        chk.addEventListener('change', () => {
          const cid = chk.dataset.crew;
          if (chk.checked) this.vakaCtrl.crew.add(cid);
          else this.vakaCtrl.crew.delete(cid);
          this._syncAndTickVaka(0.0, this.animElapsedSec);
          this._updateInfoCard();
          this._rebuildEdgeOverlay();
        });
      });

      document.getElementById('chk-worn').addEventListener('change', (e) => {
        this.vakaCtrl.worn = e.target.checked;
        this._syncAndTickVaka(0.0, this.animElapsedSec);
      });
      document.getElementById('chk-swell').addEventListener('change', (e) => {
        this.vakaCtrl.swellMotion = e.target.checked;
      });
      this.contextCardEl.querySelectorAll('[data-vhelm]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.vakaCtrl.helmMode = btn.dataset.vhelm;
          this.contextCardEl.querySelectorAll('[data-vhelm]').forEach((b) => {
            b.classList.toggle('active', b.dataset.vhelm === this.vakaCtrl.helmMode);
          });
          this._syncAndTickVaka(0.0, this.animElapsedSec);
          this._updateInfoCard();
          this._rebuildEdgeOverlay();
        });
      });
      return;
    }

    if (item.kind === 'player_char') {
      const prof = getPlayerCharacterProfile(item.difficulty);
      this.contextCardEl.classList.remove('hidden');
      this.contextCardEl.innerHTML = `
        <div class="context-heading">Wayfinder Character Inspector</div>
        <div class="ctrl-row">
          <span>Helm Trim (<strong id="lbl-psteer">${this.playerCtrl.steer.toFixed(2)}</strong>):</span>
          <input id="inp-psteer" type="range" min="-1" max="1" step="0.05" value="${this.playerCtrl.steer}" />
        </div>
        <div class="ctrl-row">
          <span>Trade Breeze (<strong id="lbl-pwind">${this.playerCtrl.wind.toFixed(2)}</strong>):</span>
          <input id="inp-pwind" type="range" min="0" max="1.4" step="0.05" value="${this.playerCtrl.wind}" />
        </div>
        <div class="stats-row">
          <span class="stat-pill">${prof.title}</span>
          <span class="stat-pill">${prof.ageLabel}</span>
          <span class="stat-pill">Height: ${prof.totalHeightM.toFixed(2)}m</span>
        </div>
      `;

      const inpSteer = document.getElementById('inp-psteer');
      const lblSteer = document.getElementById('lbl-psteer');
      inpSteer.addEventListener('input', () => {
        this.playerCtrl.steer = Number(inpSteer.value);
        lblSteer.textContent = this.playerCtrl.steer.toFixed(2);
      });

      const inpWind = document.getElementById('inp-pwind');
      const lblWind = document.getElementById('lbl-pwind');
      inpWind.addEventListener('input', () => {
        this.playerCtrl.wind = Number(inpWind.value);
        lblWind.textContent = this.playerCtrl.wind.toFixed(2);
      });
      return;
    }

    if (item.kind === 'island') {
      const isl = item.island;
      const isRapaNui = isl.id === 'rapa_nui';
      this.contextCardEl.classList.remove('hidden');
      this.contextCardEl.innerHTML = `
        <div class="context-heading">Island Cue &amp; Landmass Inspector</div>
        <div class="ctrl-checks">
          <label>
            <input id="chk-isl-cloud" type="checkbox" ${this.islandCtrl.showClouds ? 'checked' : ''} />
            Show Overhead Cloud (${isl.hasPeakCloud ? 'Peak Cumulus' : ''}${isl.hasPeakCloud && isl.hasLapaGlow ? ' + ' : ''}${isl.hasLapaGlow ? 'Lapa Glow' : !isl.hasPeakCloud ? 'None on this Isle' : ''})
          </label>
          ${
            isRapaNui
              ? `<label>
                  <input id="chk-isl-scale-ring" type="checkbox" />
                  Show 1x Standard Island Footprint Ring (~76m dia)
                </label>`
              : ''
          }
        </div>
        ${
          isRapaNui
            ? `<div class="ctrl-row" style="flex-wrap:wrap;gap:4px;margin-top:6px;">
                <button class="tool-btn" data-rfocus="overview">Full Isle</button>
                <button class="tool-btn" data-rfocus="tongariki">Ahu Tongariki (15 Moai)</button>
                <button class="tool-btn" data-rfocus="raraku">Rano Raraku Quarry</button>
                <button class="tool-btn" data-rfocus="anakena">Anakena &amp; Nau Nau</button>
                <button class="tool-btn" data-rfocus="ranokau">Rano Kau &amp; Motu</button>
                <button class="tool-btn" data-rfocus="tahai">Ahu Tahai</button>
                <button class="tool-btn" data-rfocus="akivi">Ahu Akivi</button>
              </div>`
            : ''
        }
        <div class="stats-row">
          <span class="stat-pill">${isl.isSecret ? 'Secret Isle (Wide Scale)' : `Act ${isl.act}`}</span>
          <span class="stat-pill">Data Peak: ${isl.peakHeightM}m</span>
          <span class="stat-pill">Birds: ${isl.birdSpecies}</span>
          <span class="stat-pill">Cliffs: ${isl.hasSteepCliffs ? 'Yes' : 'No'}</span>
          ${isl.peaksPierceFog ? '<span class="stat-pill">Pierces Fog</span>' : ''}
        </div>
      `;

      document.getElementById('chk-isl-cloud').addEventListener('change', (e) => {
        this.islandCtrl.showClouds = e.target.checked;
        if (this.currentIslandNodes) {
          const { peakCloud, lapaCloud } = this.currentIslandNodes;
          peakCloud.visible = this.islandCtrl.showClouds && Boolean(isl.hasPeakCloud);
          lapaCloud.visible = this.islandCtrl.showClouds && Boolean(isl.hasLapaGlow);
          this._frameActiveStage();
          this._updateInfoCard();
          this._rebuildEdgeOverlay();
        }
      });

      if (isRapaNui) {
        const scaleRingChk = document.getElementById('chk-isl-scale-ring');
        if (scaleRingChk) {
          scaleRingChk.addEventListener('change', (e) => {
            if (!this.rapaScaleRing) {
              const rGeo = new THREE.RingGeometry(37.4, 38.6, 64);
              rGeo.rotateX(-Math.PI * 0.5);
              this.rapaScaleRing = new THREE.Mesh(
                rGeo,
                new THREE.MeshBasicMaterial({
                  color: 0xffb347,
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 0.85,
                  depthWrite: false,
                })
              );
              this.rapaScaleRing.position.y = 1.2;
            }
            if (e.target.checked) {
              this.stageGroup.add(this.rapaScaleRing);
            } else {
              this.stageGroup.remove(this.rapaScaleRing);
            }
          });
        }

        const focusTargets = {
          overview: null,
          tongariki: { target: [72.3, 4.8, 6.3], theta: 0.52, phi: 0.18, dist: 38.0 },
          raraku: { target: [57.5, 11.5, 9.5], theta: 0.62, phi: 0.22, dist: 36.0 },
          anakena: { target: [29.0, 4.5, -59.0], theta: 2.52, phi: 0.18, dist: 32.0 },
          ranokau: { target: [-76.0, 14.0, 58.0], theta: 2.35, phi: 0.48, dist: 78.0 },
          tahai: { target: [-66.0, 4.8, -3.8], theta: -1.88, phi: 0.18, dist: 32.0 },
          akivi: { target: [-32.25, 14.0, -29.25], theta: -1.86, phi: 0.18, dist: 28.0 },
        };

        this.contextCardEl.querySelectorAll('[data-rfocus]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-rfocus');
            const preset = focusTargets[key];
            if (!preset) {
              this._applyCameraPreset('reset');
              return;
            }
            this.orbit.target.set(preset.target[0], preset.target[1], preset.target[2]);
            this.orbit.theta = preset.theta;
            this.orbit.phi = preset.phi;
            this._setOrbitDistance(preset.dist);
          });
        });
      }
      return;
    }

    if (
      item.kind === 'bird_single' ||
      item.kind === 'bird_flock' ||
      item.kind === 'fish_single' ||
      item.kind === 'fish_school'
    ) {
      this.contextCardEl.classList.remove('hidden');
      this.contextCardEl.innerHTML = `
        <div class="context-heading">Animation Controls</div>
        <div class="ctrl-row">
          <span>Speed (<strong id="lbl-aspeed">${this.animCtrl.speed.toFixed(2)}x</strong>):</span>
          <input id="inp-aspeed" type="range" min="0" max="2.5" step="0.05" value="${this.animCtrl.speed}" />
        </div>
        ${
          item.kind === 'fish_single'
            ? `<div class="ctrl-checks"><label><input id="chk-fish-leap" type="checkbox" ${
                this.animCtrl.fishLeapSingle ? 'checked' : ''
              } /> Animate Leaping Arc</label></div>`
            : ''
        }
      `;

      const inp = document.getElementById('inp-aspeed');
      const lbl = document.getElementById('lbl-aspeed');
      inp.addEventListener('input', () => {
        this.animCtrl.speed = Number(inp.value);
        lbl.textContent = `${this.animCtrl.speed.toFixed(2)}x`;
      });

      const leapChk = document.getElementById('chk-fish-leap');
      if (leapChk) {
        leapChk.addEventListener('change', (e) => {
          this.animCtrl.fishLeapSingle = e.target.checked;
        });
      }
      return;
    }

    if (item.kind === 'cloud') {
      this.contextCardEl.classList.remove('hidden');
      const variantRow =
        item.cloudType === 'trade'
          ? `
        <div class="ctrl-row">
          <span>Cumulus Variant:</span>
          <span>
            <button class="tool-btn ${this.cloudCtrl.tradeVariant === 0 ? 'active' : ''}" data-cvar="0">1</button>
            <button class="tool-btn ${this.cloudCtrl.tradeVariant === 1 ? 'active' : ''}" data-cvar="1">2</button>
            <button class="tool-btn ${this.cloudCtrl.tradeVariant === 2 ? 'active' : ''}" data-cvar="2">3</button>
            <button class="tool-btn ${this.cloudCtrl.tradeVariant === 3 ? 'active' : ''}" data-cvar="3">4</button>
            <button class="tool-btn ${this.cloudCtrl.tradeVariant === 4 ? 'active' : ''}" data-cvar="4">5</button>
            <button class="tool-btn ${this.cloudCtrl.tradeVariant === 5 ? 'active' : ''}" data-cvar="5">6</button>
          </span>
        </div>`
          : '';
      this.contextCardEl.innerHTML = `
        <div class="context-heading">Cloud Lighting &amp; Form Inspector</div>
        ${variantRow}
        <div class="ctrl-row">
          <span>Sky Lighting:</span>
          <span>
            <button class="tool-btn ${this.cloudCtrl.lighting === 'day' ? 'active' : ''}" data-clight="day">Day</button>
            <button class="tool-btn ${this.cloudCtrl.lighting === 'twilight' ? 'active' : ''}" data-clight="twilight">Twilight</button>
            <button class="tool-btn ${this.cloudCtrl.lighting === 'night' ? 'active' : ''}" data-clight="night">Night</button>
          </span>
        </div>
      `;

      this.contextCardEl.querySelectorAll('[data-cvar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.cloudCtrl.tradeVariant = Number(btn.dataset.cvar);
          this.selectAsset(item.id);
        });
      });

      this.contextCardEl.querySelectorAll('[data-clight]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.cloudCtrl.lighting = btn.dataset.clight;
          this.contextCardEl.querySelectorAll('[data-clight]').forEach((b) => {
            b.classList.toggle('active', b.dataset.clight === this.cloudCtrl.lighting);
          });
          if (this.activeTickFn) {
            this.activeTickFn(0.0, this.animElapsedSec);
          }
        });
      });
      return;
    }

    this.contextCardEl.classList.add('hidden');
  }

  // -------------------------------------------------------------------------
  // Auto-Framing, Stats, Wireframe & Edge Overlay
  // -------------------------------------------------------------------------
  _computeVisibleBounds() {
    this.stageGroup.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const temp = new THREE.Box3();
    let hasMesh = false;

    this.stageGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.visible) return;
      // Check ancestor visibility
      let p = obj.parent;
      while (p && p !== this.scene) {
        if (!p.visible) return;
        p = p.parent;
      }
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      temp.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
      box.union(temp);
      hasMesh = true;
    });

    if (!hasMesh) {
      box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    }
    return box;
  }

  _frameActiveStage() {
    const box = this._computeVisibleBounds();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // For canoe, center target between hulls and crab-claw sails
    if (this.activeItem?.kind === 'vaka') {
      center.set(0.0, 2.85, -0.15);
    }

    const maxDim = Math.max(0.8, size.x, size.y, size.z);
    const radius = maxDim * 0.55;

    this.orbit.defaultTarget.copy(center);
    this.orbit.target.copy(center);
    this.orbit.minDistance = Math.max(0.25, radius * 0.16);
    this.orbit.maxDistance = Math.max(12.0, radius * 8.5);
    this.orbit.defaultDistance = Math.max(1.4, radius * 2.25);

    this.camera.near = Math.max(0.01, radius * 0.004);
    this.camera.far = Math.max(1200.0, radius * 32.0);
    this.camera.updateProjectionMatrix();

    // Scale reference waterline disc & grid proportionally to asset footprint
    const footRadius = Math.max(2.5, Math.max(size.x, size.z) * 1.15);
    this.waterDisc.scale.set(footRadius, footRadius, 1.0);

    this.referenceGroup.remove(this.gridHelper);
    const gridSpan = Math.max(4, Math.ceil(footRadius * 2));
    this.gridHelper = new THREE.GridHelper(gridSpan, 16, 0x42d9c8, 0x244058);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.32;
    this.referenceGroup.add(this.gridHelper);

    this.axesHelper.scale.setScalar(Math.max(0.5, radius * 0.45));

    this._setOrbitDistance(this.orbit.defaultDistance);
  }

  _updateInfoCard() {
    if (!this.activeItem) return;
    this.infoTitleEl.textContent = this.activeItem.name;
    this.infoDescEl.textContent = this.activeItem.subtitle;

    const box = this._computeVisibleBounds();
    const size = new THREE.Vector3();
    box.getSize(size);

    let meshes = 0;
    let verts = 0;
    let tris = 0;
    this.stageGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.visible) return;
      let p = obj.parent;
      while (p && p !== this.scene) {
        if (!p.visible) return;
        p = p.parent;
      }
      meshes += 1;
      const pos = obj.geometry.getAttribute('position');
      if (pos) {
        verts += pos.count;
        tris += obj.geometry.index
          ? Math.round(obj.geometry.index.count / 3)
          : Math.round(pos.count / 3);
      }
    });

    this.infoStatsEl.innerHTML = `
      <span class="stat-pill">Meshes: ${meshes}</span>
      <span class="stat-pill">Tris: ${tris.toLocaleString()}</span>
      <span class="stat-pill">Verts: ${verts.toLocaleString()}</span>
      <span class="stat-pill">Size: ${size.x.toFixed(1)}m × ${size.y.toFixed(1)}m × ${size.z.toFixed(1)}m</span>
    `;
  }

  _applyWireframeFlag() {
    this.stageGroup.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          m.wireframe = this.showWireframe;
        }
      }
    });
  }

  _clearEdgeOverlay() {
    this.stageGroup.traverse((obj) => {
      if (obj.userData && obj.userData._debugEdgeSeg) {
        const seg = obj.userData._debugEdgeSeg;
        obj.remove(seg);
        seg.geometry?.dispose();
        delete obj.userData._debugEdgeSeg;
      }
    });
  }

  _rebuildEdgeOverlay() {
    this._clearEdgeOverlay();
    if (!this.showEdges) return;

    this.stageGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.visible) return;
      let p = obj.parent;
      while (p && p !== this.scene) {
        if (!p.visible) return;
        p = p.parent;
      }
      const edges = new THREE.EdgesGeometry(obj.geometry, 20);
      const seg = new THREE.LineSegments(edges, this.edgeLineMat);
      obj.userData._debugEdgeSeg = seg;
      obj.add(seg);
    });
  }

  _onResize() {
    const w = this.viewportEl.clientWidth || window.innerWidth - 310;
    const h = this.viewportEl.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate(nowMs) {
    requestAnimationFrame((t) => this._animate(t));
    const dt = Math.min(0.05, Math.max(0.0, (nowMs - this.lastTimeMs) * 0.001));
    this.lastTimeMs = nowMs;

    if (!this.paused) {
      this.animElapsedSec += dt;
      if (this.activeTickFn) {
        this.activeTickFn(dt, this.animElapsedSec);
      }
      if (this.autoSpin && !this.orbit.dragging) {
        this.orbit.theta += dt * 0.35;
        this._updateCameraFromOrbit();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__kavengaAssetViewer = new AssetDebugViewer();
});
