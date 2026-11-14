# Kavenga: Songs of the Star Path

**Kavenga: Songs of the Star Path** is a contemplative first-person 3D Polynesian wayfinding game built with **Zero-Build ES2022 Modules**, **Three.js (`r170`)**, **Web Audio API**, and **HTML5 2D Canvas**.

Sail a traditional double-hulled voyaging canoe (*vaka moana*) across **16 Pacific islands** and **17 ancestral route chants** from *Raʻiātea* across the Southern Hemisphere lagoons and high islands (Acts I–II) into the Northern Hemisphere *Hawaiʻi Mist Chain* (*Kauaʻi*, *Oʻahu*, *Kiritimati*, and *Hawaiʻi* in Act III)—navigating strictly by rising and setting star paths (*kavenga*), hemisphere-true polar stars (*The Sea Turtle* & *The Frigatebird* in the South; *Steadfast Peg* & *The Horse* in the North), stationary island peak clouds, turquoise coral-lagoon cloud reflections (*lapa*), dawn/dusk homing terns and boobies, solar sighting-post (*pou*) crossbeam shadows, and 4-beat ocean swells—with **zero maps, zero compasses, and zero degree numbers**.

## Live Deployment (GitHub Pages)

* **Play the Game:** [https://doonch.github.io/Kavenga/](https://doonch.github.io/Kavenga/)
* **Star-Stone Vigil (Southern Sky — *First Master Teraʻi*, Maupiti):** [https://doonch.github.io/Kavenga/?mode=sky_vigil&master=terai](https://doonch.github.io/Kavenga/?mode=sky_vigil&master=terai)
* **Star-Stone Vigil (Northern Sky — *Keeper Akura*, Kiritimati):** [https://doonch.github.io/Kavenga/?mode=sky_vigil&master=akura](https://doonch.github.io/Kavenga/?mode=sky_vigil&master=akura)
* **3D Asset Debug Viewer:** [https://doonch.github.io/Kavenga/asset-viewer.html](https://doonch.github.io/Kavenga/asset-viewer.html)

---

## Quick Start (Zero Build Required)

No `npm`, bundler, or external network access is required (`vendor/three.module.min.js` is vendored locally). Serve the root directory over any static HTTP server:

```bash
python3 -m http.server 8123 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8123/** in any modern WebGL browser.

### Instant Star-Stone Vigil Test Entry (Zero Playthrough Required)
You can enter the grounded 3D night-sky observatory (**The Star-Stone Vigil / *Ahu Fetiʻa***) immediately without sailing through prior islands:
- **In-Game (from Island 1):** Open the **`🐚 Navigator's Shore`** tab and click **Enter Star-Stone Vigil** (or jump directly to **First Master Teraʻi · Maupiti** or **Keeper Akura · Kiritimati**, and switch freely among all 16 island skies in the top bar).
- **Direct URL Parameters:**
  - Southern Hemisphere Star Master (*First Master Teraʻi* on Maupiti): `http://127.0.0.1:8123/?mode=sky_vigil&master=terai`
  - Northern Hemisphere Star Master (*Keeper Akura* on Kiritimati): `http://127.0.0.1:8123/?mode=sky_vigil&master=akura`
  - Specific Island Sky & Tab (`lessons`, `atlas`, or optional `quiz`): `http://127.0.0.1:8123/?mode=sky_vigil&island=hawaii&tab=atlas`

### Instant Landfall Arrival Preview (Zero Playthrough Required)
Preview the 3D Ring 4 shoreline glide and camera pullback on any of the 16 islands directly via URL parameters:
- Default Tahaʻa Lagoon Arrival (~1.6s approach lead-in): `http://127.0.0.1:8123/?mode=landfall`
- Any Island & Lighting Window (`dawn`, `midday`, `dusk`, `midnight`): `http://127.0.0.1:8123/?mode=landfall&island=raiatea&window=dusk` or `http://127.0.0.1:8123/?mode=landfall&island=hawaii`
- Immediate Ring 4 Trigger (`lead=0` or `instant=1`): `http://127.0.0.1:8123/?mode=landfall&island=tahaa&lead=0`

### 3D Asset Debug Viewer
Open **`http://127.0.0.1:8123/asset-viewer.html`** to inspect all procedural 3D assets in an interactive orbit/zoom studio (Canoe Tiers 1–3 with live upgrade/ration/cargo/crew/shadow toggles, flapping White Tern & Brown Booby seabirds, Trade-Wind / Peak / *Lapa* clouds, leaping Bonito fish, and all 16 campaign islands).

### Hosting on GitHub Pages
Because all ES module imports and `<script type="importmap">` paths are strictly relative, this repository deploys directly to **GitHub Pages** with zero CI/build step:
1. Open **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch** → **`main` / `/ (root)`**.

---

## Controls

| Action | Input |
| :--- | :--- |
| **Trim-Lock Steering** | `A` / `D` or `Left` / `Right` Arrow (`Q` / `E` for fine trim, or on-screen Prow buttons) |
| **360° Free-Look Gaze** | Click-drag sky/ocean or `I` / `J` / `K` / `L` (`Space` or `C` snaps gaze dead ahead) |
| **Look Astern / Mast-Top** | Top-right **Look Astern** (check wake leeway & stern stars) and **Mast-Top** (zenith stars) buttons |
| **Fast Wind (`2.75x`)** | `F` key or **Fast Wind** button (automatically returns to `1x` on verse changes, island rings, or fish schools) |
| **Static Sand Recall** | `R` key or **Recall** button (views the static stick-in-the-sand lesson ashore; disabled at sea in *Master Navigator*) |

---

## Guidance & Difficulty Modes

Switch modes anytime from the Island Hub or in-voyage **Options** menu:

1. **Easy (Apprentice):** Baked-in chant & *pahu* drum audio, on-screen verse lyrics, turquoise cue hints, annotated constellations, active target-star shimmer, and static Sand **Recall**.
2. **Medium (Wayfinder):** Chant & *pahu* drum audio, poetic verse lyrics, annotated constellations, and static Sand **Recall**.
3. **Hard (Navigator):** Chant & *pahu* drum audio, annotated constellations, and static Sand **Recall**—zero on-screen text while sailing.
4. **Master Navigator:** Pure ocean silence at sea (memorize your verse ashore!), raw unlabelled night sky, and Sand **Recall** disabled at sea.

---

## Project Structure

```text
├── GAME_DESIGN_DOCUMENT.md          # Complete design specification & calibrated wayfinding blueprints
├── index.html                       # Zero-build entry point & Three.js importmap
├── asset-viewer.html                # Standalone 3D asset orbit/zoom debug studio
├── styles.css                       # Island Hub & Zero-Compass Sailing HUD styling
├── assets/
│   ├── mentors/                     # 15 full-body mentor, artisan & elder character portraits
│   └── crew/                        # 3 full-body recruitable voyaging crewmate portraits
├── vendor/
│   └── three.module.min.js          # Locally vendored Three.js r170 ES module
├── src/
│   ├── main.js                      # Application loop & Shore <-> Open-Ocean orchestrator
│   ├── assetViewer.js               # Live 3D asset catalog & studio orbit inspector
│   ├── core/
│   │   ├── gameConstants.js         # Astronomical, ocean-ring, ration & difficulty constants
│   │   ├── gameState.js             # Campaign progression, cargo slots, crew & pre-voyage snapshots
│   │   └── campaignManager.js       # Full Acts I-III island quests, repairs, upgrades & route builder
│   ├── data/
│   │   ├── constellationsData.js    # 12 Horizon Houses, 34 navigation stars & 10 Animal Constellations
│   │   ├── islandsData.js           # 3 regional ocean basins & 16 islands with per-island latitudes
│   │   ├── songsData.js             # 17 authored route chants (Songs 1-16 + 14R) & dynamic return songs
│   │   ├── sandDiagramsData.js      # 16 stick-and-shell shore teaching diagrams
│   │   └── skyVigilData.js          # Dual-hemisphere Star Masters, Constellation Atlas & optional Eye Trial
│   ├── simulation/
│   │   ├── celestialSim.js          # Spherical astronomy (per-island & voyage-interpolated latitudes)
│   │   ├── shadowCraft.js           # Sighting post (pou) -> crossbeam (iako) solar shadow projection
│   │   ├── hullPhysics.js           # Twin-hull 4-beat swell Doppler coupling & Ring 3 wave zones
│   │   └── oceanSim.js              # 2D basin kinematics, leeway, Rings 1-4 & cue-relative mist reflections
│   ├── rendering/
│   │   ├── CameraController.js      # Trim-Lock steering, 360° Free-Look & motionless Vigil shore gaze
│   │   ├── SkyDomeRenderer.js       # Twilight scattering shader, Milky Way, stars, curtains & sea fog
│   │   ├── StarRingRenderer.js      # Grounded 3D Ahu Feti'a 12-stone coastal observatory & braziers
│   │   ├── OceanRenderer.js         # Swell/refraction/reflection water shader & calm night shore mode
│   │   ├── VakaRenderer.js          # Procedural double-hulled vaka, pou shadow & deck readiness props
│   │   └── WorldCuesRenderer.js     # Clouds, Lapa lagoon glow, homing seabirds, bonito & 3D islands
│   ├── audio/
│   │   ├── ChantAndDrumEngine.js    # Sample-accurate 4-beat pahu drum, vivo flute & harmonic chant synth
│   │   └── SpatialSeaAudio.js       # Stereo twin-hull slap cascade, spatial bird calls & surf ambiance
│   └── ui/
│       ├── SandCanvas.js            # Animated shore sand-drawing lessons & static Recall renderer
│       ├── SailingHUD.js            # Strict Zero-Compass HUD, Landfall & Lost-at-Sea mist overlays
│       ├── SkyVigilUI.js            # Guided Star-Stone Vigil lessons, Constellation Atlas & optional quiz
│       └── IslandHubUI.js           # Coastal POI tabs, Star-Stone Vigil launcher & mentor dialogues
└── tests/
    ├── runPhase1Tests.mjs           # Astronomy, hemisphere poles, zero-compass & 17-route autopilot suite
    └── runCampaignWalkthroughTests.mjs # Full 17-leg Ra'iatea -> Hawai'i campaign economy suite
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
