# Kavenga: Songs of the Star Path

**Kavenga: Songs of the Star Path** is a contemplative 3D Polynesian wayfinding game built with **Zero-Build ES2022 Modules**, **Three.js (`r170`)**, **Web Audio API**, and **HTML5 2D Canvas**.

Sail a traditional double-hulled voyaging canoe (*vaka moana*) across Pacific lagoons, volcanic archipelagos, and coral atolls from *Raʻiātea* across the Southern Hemisphere (Acts I–II, including *Rapa Nui*) into the Northern Hemisphere *Hawaiʻi Mist Chain* (*Kauaʻi*, *Oʻahu*, *Kiritimati*, and *Hawaiʻi* in Act III)—learning each animal constellation one by one from island elders, and navigating strictly by rising and setting star paths (*kavenga*), hemisphere-true polar anchors (*The Sea Turtle* & *The Frigatebird* in the South; *The Steadfast Peg* & *The Horse* in the North), stationary island peak clouds, turquoise coral-lagoon cloud reflections (*lapa*), dawn/dusk homing terns and boobies, solar sighting-post (*pou*) crossbeam shadows, and 4-beat ocean swells—with **zero maps, zero compasses, and zero degree numbers**.

## Live Deployment (GitHub Pages)

* **Cinematic 3D Intro:** [https://doonch.github.io/Kavenga/intro.html](https://doonch.github.io/Kavenga/intro.html)
* **Play the Game:** [https://doonch.github.io/Kavenga/](https://doonch.github.io/Kavenga/)
* **3D Asset Debug Viewer:** [https://doonch.github.io/Kavenga/asset-viewer.html](https://doonch.github.io/Kavenga/asset-viewer.html)
* **Developer Ocean & Route Map:** [https://doonch.github.io/Kavenga/map.html](https://doonch.github.io/Kavenga/map.html)

---

## Quick Start (Zero Build Required)

No `npm`, bundler, or external network access is required (`vendor/three.module.min.js` is vendored locally). Serve the root directory over any static HTTP server:

```bash
python3 -m http.server 8123 --bind 127.0.0.1
```

Then open in any modern WebGL browser:
- **Cinematic Intro → Game:** **http://127.0.0.1:8123/intro.html**
- **Direct Game Entry:** **http://127.0.0.1:8123/**

### Cinematic 3D Introduction (`intro.html`)
Open **`http://127.0.0.1:8123/intro.html`** to watch the real-time 3D title sequence showcasing the fully upgraded *Vaka Moana* and child apprentice navigator across shifting Pacific skies, clouds, seabird flocks, foggy night bonito leaps, and a golden sunset into starry nightfall before launching `index.html` via **Start** (press `Esc` to skip directly to the dusk title finale).

### Instant Star-Stone Vigil Dev Entry
The grounded 3D night-sky observatory (**The Star-Stone Vigil / *Ahu Fetiʻa***) always shows the true night sky of the island where you currently stand, guided by that island's local elder when a constellation teaching is available:
- **In-Game:** Walk to the **Observation Circle** or **Sanctuary** on any island to stargaze over the twelve Horizon Stones or join the local elder's 5-beat **Guided Sky Vigil**.
- **Direct Dev URL Parameters:**
  - Specific Island Guided Sky Vigil (e.g. *Hina* on Tahaʻa): `http://127.0.0.1:8123/?mode=sky_vigil&island=tahaa`
  - Northern Mist Isles Sky Vigil (e.g. *Keeper Akura* on Kiritimati): `http://127.0.0.1:8123/?mode=sky_vigil&island=kiritimati`
  - Specific Island Sky & Tab (`guided`, `atlas`, or optional `quiz`): `http://127.0.0.1:8123/?mode=sky_vigil&island=hawaii&tab=atlas`

### Instant Landfall Arrival Preview (Zero Playthrough Required)
Preview the 3D Ring 4 shoreline glide and camera pullback on any campaign island directly via URL parameters:
- Default Tahaʻa Lagoon Arrival (~1.6s approach lead-in): `http://127.0.0.1:8123/?mode=landfall`
- Any Island & Lighting Window (`dawn`, `midday`, `dusk`, `midnight`): `http://127.0.0.1:8123/?mode=landfall&island=raiatea&window=dusk` or `http://127.0.0.1:8123/?mode=landfall&island=hawaii`
- Immediate Ring 4 Trigger (`lead=0` or `instant=1`): `http://127.0.0.1:8123/?mode=landfall&island=tahaa&lead=0`

### 3D Asset Debug Viewer & Developer Ocean Map
- **3D Asset Debug Viewer (`http://127.0.0.1:8123/asset-viewer.html`):** Inspect all procedural 3D assets in an interactive orbit/zoom studio (Canoe Tiers 1–3, 4 player wayfinder characters, flapping White Tern & Brown Booby seabirds, Trade-Wind / Peak / *Lapa* clouds, leaping Bonito fish, and all 17 campaign islands in both Ocean/Landfall and Walkable Shore views).
- **Developer Ocean Map (`http://127.0.0.1:8123/map.html`):** Out-of-game basin chart for inspecting island ring radii, authored routes, and post-voyage trajectory traces.

### Hosting on GitHub Pages
Because all ES module imports and `<script type="importmap">` paths are strictly relative, this repository deploys directly to **GitHub Pages** with zero CI/build step:
1. Open **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch** → **`main` / `/ (root)`**.

---

## Controls

| Action | Input |
| :--- | :--- |
| **Walk Ashore (3D Island)** | `W` / `A` / `S` / `D` or Arrow Keys to explore shore paths & approach POIs |
| **Trim-Lock Steering (At Sea)** | `A` / `D` or `Left` / `Right` Arrow (`Q` / `E` for fine trim, or on-screen Prow buttons) |
| **360° Free-Look Gaze** | Click-drag sky/ocean or `I` / `J` / `K` / `L` (`Space` or `C` snaps gaze dead ahead) |
| **Camera View (At Sea)** | Toggle **Deck View** (1st-person) vs. **Canoe View** (3rd-person orbit showing your wayfinder at the sweep) |
| **Look Astern / Mast-Top** | Top-right **Look Astern** (check wake leeway & stern stars) and **Mast-Top** (zenith stars) buttons |
| **Fast Wind (`2.75x`)** | `F` key or **Fast Wind** button (automatically returns to `1x` on verse changes, island rings, or fish schools) |
| **Static Sand Recall** | `R` key or **Recall** button (views the static stick-in-the-sand lesson ashore; disabled at sea in *Master Navigator*) |

---

## Guidance & Difficulty Modes

Switch modes anytime from the ashore **⚙ Settings** button or in-voyage **Options** menu:

1. **Easy (Apprentice):** Baked-in chant & *pahu* drum audio, on-screen verse lyrics, turquoise cue hints, annotated learned constellations with subtle animal silhouette cut-outs and active target-star shimmer, and static Sand **Recall**.
2. **Medium (Wayfinder):** Chant & *pahu* drum audio, poetic verse lyrics, annotated learned constellations (lines & star names), and static Sand **Recall**.
3. **Hard (Navigator):** Chant & *pahu* drum audio, annotated learned constellations, and static Sand **Recall**—zero on-screen text while sailing.
4. **Master Navigator:** Pure ocean silence at sea (memorize your verse ashore!), raw unlabelled night sky, and Sand **Recall** disabled at sea.

---

## Project Structure

```text
├── GAME_DESIGN_DOCUMENT.md                  # Complete design specification & calibrated wayfinding blueprints
├── README.md                                # Quick-start guide, links, controls & architecture overview
├── intro.html                               # Real-time 3D cinematic introduction sequence & title screen
├── index.html                               # Zero-build main game entry point & Three.js importmap
├── asset-viewer.html                        # Standalone 3D asset & island orbit/zoom debug studio
├── map.html                                 # Standalone developer ocean-basin & route-trace visualizer
├── styles.css                               # Walkable Shore, Island Hub, Sky Vigil & Sailing HUD styling
├── favicon.ico                              # Multi-size Polynesian crab-claw canoe favicon
├── .agents/
│   └── rules/
│       └── kavenga-wayfinding.md            # Zero-Compass UX, zero-build & coordinate system rules
├── assets/
│   ├── banner.png                           # Carved wooden "Kavenga" title banner
│   ├── icons/                               # PNG favicons & Apple touch icon (32x32, 64x64, 180x180)
│   ├── mentors/                             # 15 full-body mentor, artisan & elder character portraits
│   └── crew/                                # 3 full-body recruitable voyaging crewmate portraits
├── vendor/
│   └── three.module.min.js                  # Locally vendored Three.js r170 ES module
├── src/
│   ├── main.js                              # Application loop, Walkable Shore <-> Ocean <-> Sky Vigil orchestrator
│   ├── intro.js                             # Real-time 3D cinematic intro director for intro.html
│   ├── assetViewer.js                       # Live 3D asset catalog & studio orbit inspector
│   ├── oceanMap.js                          # 2D ocean basin, detection-ring & sailed-route map inspector
│   ├── core/
│   │   ├── gameConstants.js                 # Astronomical, ocean-ring, ration & difficulty constants
│   │   ├── gameState.js                     # Progression, learned constellations, cargo, crew & snapshots
│   │   └── campaignManager.js               # Full Acts I-III island quests, repairs, upgrades & route builder
│   ├── data/
│   │   ├── constellationsData.js            # 12 Horizon Houses, 31 navigation stars & 10 Animal Constellations
│   │   ├── constellationLessonsData.js      # 11 progressive 5-beat elder-guided Sky Vigil scripts
│   │   ├── constellationSilhouettesData.js  # Celestial-locked Bezier animal silhouettes for all 10 constellations
│   │   ├── islandsData.js                   # 3 regional ocean basins & 17 islands with per-island latitudes
│   │   ├── playerCharactersData.js          # Persona profiles for the 4 difficulty-linked wayfinders
│   │   ├── sandDiagramsData.js              # Stick-and-shell shore teaching diagrams
│   │   ├── skyVigilData.js                  # Local-hemisphere Constellation Atlas lore & Eye Trial prompts
│   │   ├── songsData.js                     # 18 authored route chants & dynamic return-song builder
│   │   └── walkableIslandsData.js           # Walkable 3D shore layouts & proximity POIs for all 17 islands
│   ├── simulation/
│   │   ├── celestialSim.js                  # Spherical astronomy (per-island & voyage-interpolated latitudes)
│   │   ├── shadowCraft.js                   # Sighting post (pou) -> crossbeam (iako) solar shadow projection
│   │   ├── hullPhysics.js                   # Twin-hull 4-beat swell Doppler coupling & Ring 3 wave zones
│   │   └── oceanSim.js                      # 2D basin kinematics, leeway, Rings 1-4 & route-trace encoding
│   ├── rendering/
│   │   ├── CameraController.js              # Trim-Lock steering, 3rd-person Canoe View & Vigil shore gaze
│   │   ├── CloudSculptBuilder.js            # Procedural 3D cumulus, peak & lapa cloud sculpts + ray occlusion
│   │   ├── IslandSculptToolkit.js           # Shared volcanic, atoll, reef, lagoon & foliage geometry toolkit
│   │   ├── IslandTerrainBuilder.js          # Unified 3D ocean/landfall island assembly dispatcher
│   │   ├── IslandAct1RemainBuilder.js       # Bespoke 3D Society Islands terrain & lagoon assemblies
│   │   ├── IslandAct2Builder.js             # Bespoke 3D Marquesas, Tuamotu & Mangareva island assemblies
│   │   ├── IslandAct3Builder.js             # Bespoke 3D Hawai'i Mist Chain & Kiritimati island assemblies
│   │   ├── IslandRapaNuiBuilder.js          # Bespoke 3D Rapa Nui craters, cliffs & ahu moai assemblies
│   │   ├── OceanRenderer.js                 # Swell/refraction/reflection water shader & wake renderer
│   │   ├── PlayerCharacterBuilder.js        # Articulated 3D wayfinder rigs across all 4 difficulty personas
│   │   ├── SkyDomeRenderer.js               # Twilight shader, Milky Way, stars, lines, silhouettes & weather
│   │   ├── StarRingRenderer.js              # Grounded 3D Ahu Feti'a 12-stone coastal observatory & braziers
│   │   ├── VakaRenderer.js                  # Procedural double-hulled vaka, twin sails, pou shadow & helm rig
│   │   ├── WalkableIslandScene.js           # 3rd-person 3D walkable shore camera, pathing & POI controller
│   │   ├── WalkableIslandVariantsBuilder.js # Per-island 3D walkable village, marae, sanctuary & beach scenes
│   │   └── WorldCuesRenderer.js             # Marching clouds, Lapa glow, homing seabirds, bonito & 3D islands
│   ├── audio/
│   │   ├── ChantAndDrumEngine.js            # Sample-accurate 4-beat pahu drum, vivo flute & harmonic chant synth
│   │   └── SpatialSeaAudio.js               # Stereo twin-hull slap cascade, spatial bird calls & surf ambiance
│   └── ui/
│       ├── ElderVigilPromptUI.js            # Pre-departure choice popup when an elder Sky Vigil is unlearned
│       ├── IslandHubUI.js                   # Classic coastal POI tabs, Vigil launcher & mentor dialogues
│       ├── IslandSettingsUI.js              # Ashore Settings modal (sound, difficulty & Start Over)
│       ├── SailingHUD.js                    # Strict Zero-Compass HUD, Landfall & Lost-at-Sea mist overlays
│       ├── SandCanvas.js                    # Animated shore sand-drawing lessons & static Recall renderer
│       ├── SkyVigilUI.js                    # Local island Star-Stone Vigil, Elder Teachings, Atlas & quiz
│       └── WalkableIslandUI.js              # 3D walkable shore HUD, proximity POI cards & sand-lesson modal
└── tests/
    ├── runPhase1Tests.mjs                   # Astronomy, silhouettes, zero-compass & campaign autopilot suite
    └── runCampaignWalkthroughTests.mjs      # Full Ra'iatea -> Hawai'i campaign progression & economy suite
```

---

## Automated Verification Suites

On macOS (using native WebKit JavaScriptCore) or any ES module runtime (`node`):

```bash
# macOS JavaScriptCore (no Node required)
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runPhase1Tests.mjs
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runCampaignWalkthroughTests.mjs

# Or with Node.js (if installed)
node tests/runPhase1Tests.mjs
node tests/runCampaignWalkthroughTests.mjs
```
