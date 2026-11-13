# Kavenga: Songs of the Star Path

**Kavenga: Songs of the Star Path** is a contemplative first-person 3D Polynesian wayfinding game built with **Zero-Build ES2022 Modules**, **Three.js (`r170`)**, **Web Audio API**, and **HTML5 2D Canvas**.

Sail a traditional double-hulled voyaging canoe (*vaka moana*) across **16 Pacific islands** and **17 ancestral route chants** from *Raʻiātea* to *Rapa Nui*—navigating strictly by rising and setting star paths (*kavenga*), stationary island peak clouds, turquoise coral-lagoon cloud reflections (*lapa*), dawn/dusk homing terns and boobies, solar sighting-post (*pou*) crossbeam shadows, and 4-beat ocean swells—with **zero maps, zero compasses, and zero degree numbers**.

---

## Quick Start (Zero Build Required)

No `npm`, bundler, or external network access is required (`vendor/three.module.min.js` is vendored locally). Serve the root directory over any static HTTP server:

```bash
python3 -m http.server 8123 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8123/** in any modern WebGL browser.

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
├── styles.css                       # Island Hub & Zero-Compass Sailing HUD styling
├── vendor/
│   └── three.module.min.js          # Locally vendored Three.js r170 ES module
├── src/
│   ├── main.js                      # Application loop & Shore <-> Open-Ocean orchestrator
│   ├── core/
│   │   ├── gameConstants.js         # Astronomical, ocean-ring, ration & difficulty constants
│   │   ├── gameState.js             # Campaign progression, cargo slots, crew & pre-voyage snapshots
│   │   └── campaignManager.js       # Full Acts I-III island quests, repairs, upgrades & route builder
│   ├── data/
│   │   ├── constellationsData.js    # 12 Horizon Houses, 31 navigation stars & 10 Animal Constellations
│   │   ├── islandsData.js           # 3 regional ocean basins & all 16 Polynesian islands
│   │   ├── songsData.js             # 17 authored route chants (Songs 1-16 + 14R) & dynamic return songs
│   │   └── sandDiagramsData.js      # 16 stick-and-shell shore teaching diagrams
│   ├── simulation/
│   │   ├── celestialSim.js          # Spherical astronomy (-12° reference latitude, twilight & relays)
│   │   ├── shadowCraft.js           # Sighting post (pou) -> crossbeam (iako) solar shadow projection
│   │   ├── hullPhysics.js           # Twin-hull 4-beat swell Doppler coupling & Ring 3 wave zones
│   │   └── oceanSim.js              # 2D basin kinematics, leeway, Rings 1-4 & cue-relative mist reflections
│   ├── rendering/
│   │   ├── CameraController.js      # Trim-Lock steering & 360° Free-Look (-180° stern to +90° zenith)
│   │   ├── SkyDomeRenderer.js       # Twilight scattering shader, Milky Way, stars, curtains & sea fog
│   │   ├── OceanRenderer.js         # Swell/refraction/reflection water shader & foamy leeway wake
│   │   ├── VakaRenderer.js          # Procedural double-hulled vaka, pou shadow & deck readiness props
│   │   └── WorldCuesRenderer.js     # Clouds, Lapa lagoon glow, homing seabirds, bonito & 3D islands
│   ├── audio/
│   │   ├── ChantAndDrumEngine.js    # Sample-accurate 4-beat pahu drum, vivo flute & harmonic chant synth
│   │   └── SpatialSeaAudio.js       # Stereo twin-hull slap cascade, spatial bird calls & surf ambiance
│   └── ui/
│       ├── SandCanvas.js            # Animated shore sand-drawing lessons & static Recall renderer
│       ├── SailingHUD.js            # Strict Zero-Compass HUD, Landfall & Lost-at-Sea mist overlays
│       └── IslandHubUI.js           # Coastal POI tabs, careening, provisioning & mentor dialogues
└── tests/
    ├── runPhase1Tests.mjs           # Astronomy, shadow, swell, zero-compass & 17-route autopilot suite
    └── runCampaignWalkthroughTests.mjs # Full 17-leg Ra'iatea -> Rapa Nui campaign economy suite
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
