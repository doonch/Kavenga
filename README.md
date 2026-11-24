# Kavenga: Songs of the Star Path

**Kavenga: Songs of the Star Path** is a contemplative, installable 3D Polynesian wayfinding Progressive Web App (PWA) built with **Zero-Build ES2022 Modules**, **Three.js (`r170`)**, **Web Audio API**, and **HTML5 2D Canvas** for desktop and touch tablets (including iPad Safari).

Sail a traditional double-hulled voyaging canoe (*vaka moana*) across Pacific lagoons, dramatic volcanic islands, and organic coral atolls from *Raʻiātea* across the Southern Hemisphere and into northern mist seas—meeting voiced island elders, recruiting specialist crewmates, learning each animal constellation one by one in grounded Star-Stone Sky Vigils, and navigating strictly by rising and setting star paths (*kavenga*), hemisphere-true polar anchors, stationary island peak clouds, turquoise coral-lagoon cloud reflections (*lapa*), dawn/dusk homing terns, boobies, and pelagic *kaʻupu* albatrosses, solar sighting-post (*pou*) crossbeam shadows, and 4-beat ocean swells—with **zero maps, zero compasses, and zero degree numbers** at sea.

## Live Deployment (GitHub Pages)

* **Cinematic 3D Intro:** [https://doonch.github.io/Kavenga/intro.html](https://doonch.github.io/Kavenga/intro.html)
* **Play the Game:** [https://doonch.github.io/Kavenga/](https://doonch.github.io/Kavenga/)

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
Open **`http://127.0.0.1:8123/intro.html`** to watch the real-time 3D title sequence: a distant mid-ocean zoom-in onto the twin-sail *Vaka Moana* and young wayfinder (`Difficulty.MEDIUM`), a stern swoop and port-beam orbit across shifting starry skies, marching twilight clouds, sculpted *Huahine* with homing seabird flocks, and foggy night bonito leaps, culminating in a true in-game-speed sunset that reveals **Start** as the sun touches the horizon (click the top-left **Skip** pill or press `Esc` anytime to jump straight to the dusk finale).

### Progressive Web App (PWA) & iPad / Tablet Support
- **Installable Standalone App:** Includes `manifest.webmanifest`, full icon suite (`32×32` through `512×512` + maskable), and Apple standalone status-bar metadata (**Share → Add to Home Screen** on iPadOS/iOS Safari, or **Install Kavenga** in Chrome/Edge).
- **Two-Tier Offline Service Worker (`sw.js`):** Precaches the `~7.5 MB` core app shell, 3D modules, stylesheets, and character portraits on install, while caching soundtrack and elder voice `.mp3` assets on demand (with background idle warm-up and full HTTP `206 Partial Content` byte-range slicing for WebKit/Safari `<audio>` playback).
- **Touch & Tablet Ergonomics:** Dynamic `100dvh` + `safe-area-inset` layout under Safari toolbars, two-finger pinch-to-zoom on shore dioramas, a bottom-right virtual analog thumbstick for 3rd-person island walking, press-and-hold `←` / `→` steering arrows, and automatic **Screen Wake Lock** during active voyages, Sky Vigils, and the intro sequence.

### Hosting on GitHub Pages
Because all ES module imports and `<script type="importmap">` paths are strictly relative, this repository deploys directly to **GitHub Pages** with zero CI/build step:
1. Open **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch** → **`main` / `/ (root)`**.

---

## Controls

| Action | Input |
| :--- | :--- |
| **Shore Diorama Stage** | Drag island/lagoon to orbit · Scroll (or two-finger pinch on touch) to zoom; **🛶 Vaka** opens Canoe & Routes; **🚶** toggles 3rd-person Walk Shore |
| **Walk Ashore (3D Island)** | `W` / `A` / `S` / `D` or Arrow Keys (`Q` / `E` or drag to orbit), or **bottom-right virtual thumbstick** on touch/iPad |
| **Trim-Lock Steering (At Sea)** | `A` / `D` or `Left` / `Right` Arrow (`Q` / `E` for fine trim), or hold the on-screen **`←` / `→` arrow buttons** |
| **360° Free-Look Gaze** | Drag sky/ocean or `I` / `J` / `K` / `L` (`Space` or `C` snaps gaze dead ahead) |
| **Camera View (At Sea)** | `V` key or **Canoe View / Deck View** button (toggle 1st-person helm gaze vs. 3rd-person view behind your wayfinder & seated crew) |
| **Look Astern / Mast-Top** | `X` key or **Look Astern** (check wake leeway & stern stars); `Z` key or **Mast-Top** (zenith stars) |
| **Fast Wind (`2.75x`)** | `F` key or **Fast Wind** button (automatically returns to `1x` on verse changes, island rings, or fish schools) |
| **Static Sand Recall** | `R` key or **Recall** button (views the static stick-in-the-sand lesson memorized ashore; disabled at sea in *Master Navigator*) |
| **Audio Controls** | **🔊 / 🔇** top-bar button mutes/unmutes all sound; toggle **Music** and **Elder Speech** independently in **⚙ Settings** |

---

## Shore Life, Progression & Guidance Modes

### Ashore Progression & Wayfinding Systems
- **Unified Shore Stage & Critical-Path CTA:** Explore each island's 3-station Shore Panel (**Elder**, **Sand**, **Sky Vigil**) beside a live 3D island diorama with a single pinned yellow **Next-Step CTA** that guides effortlessly through greeting elders, learning night-sky constellations, careening/provisioning, and setting sail.
- **Canoe Modal, Crew & Customization:** Open **🛶 Vaka** to careen hulls, pack ration baskets, inspect full-body portraits of your wayfinder, recruited crewmates (*Tama*, *Moana*, *Kahu*—each seated in 3D aboard your canoe), and quest gifts, dye your pandanus sails at Moʻorea's vats, or upgrade to the twin-sail *Vaka Moana* on Fatu Hiva.
- **Objectives, Achievements & Onboarding Tours:** Track active quests in the collapsible ashore **Objectives** card, earn persistent **Surprise Achievements** (**🏆**), follow interactive spotlight tours on your first shore visit and maiden voyage, and review a static *"How did I do?"* sailed-path trace if you ever drift into the mist.

### Guidance & Difficulty Modes
Switch modes anytime from the ashore **⚙ Settings** modal (default starting mode: **Easy**) or in-voyage **Options** menu:

1. **Easy (Apprentice — Default):** 4-beat *pahu* drum pulse, rotating soundtrack & voiced elders, on-screen verse lyrics, turquoise cue hints, annotated learned constellations with subtle animal silhouette cut-outs and active target-star shimmer, and static Sand **Recall**.
2. **Medium (Wayfinder):** 4-beat *pahu* drum pulse, soundtrack & voiced elders, poetic verse lyrics, annotated learned constellations (lines & star names), and static Sand **Recall**.
3. **Hard (Navigator):** 4-beat *pahu* drum pulse, soundtrack & voiced elders, annotated learned constellations, and static Sand **Recall**—zero on-screen text while sailing.
4. **Master Navigator:** Pure ocean silence at sea (memorize your verse ashore!), raw unlabelled night sky, and Sand **Recall** disabled at sea.

---

## Project Structure

```text
├── GAME_DESIGN_DOCUMENT.md                  # Complete design specification & calibrated wayfinding blueprints
├── README.md                                # Quick-start guide, PWA details, controls & architecture overview
├── intro.html                               # Real-time 3D cinematic introduction sequence & title screen
├── index.html                               # Zero-build main game entry point & Three.js importmap
├── styles.css                               # Shore Diorama, Canoe Modal, Walkable Shore, Vigil & Sailing HUD CSS
├── manifest.webmanifest                     # Web App Manifest for standalone desktop & iPad/mobile installation
├── sw.js                                    # Two-tier offline Service Worker with HTTP 206 audio range slicing
├── favicon.ico                              # Multi-size Polynesian crab-claw canoe favicon
├── .agents/
│   ├── rules/
│   │   └── kavenga-wayfinding.md            # Zero-Compass UX, zero-build & coordinate system rules
│   └── skills/
│       ├── island-redesign/                 # 2x canonical walkable island & coral-atoll redesign guidelines
│       └── volcanic-island-redesign/        # Dramatic volcanic spire, crag & valley-trail redesign guidelines
├── assets/
│   ├── banner.png                           # Carved wooden "Kavenga" title banner
│   ├── vaka_moana.jpg                       # Painterly twin-sail Vaka Moana upgrade splash artwork
│   ├── audio/                               # 9 soundtrack MP3s (6 base + island unlocks) & voices/ elder MP3s
│   ├── icons/                               # Favicons, Apple touch, 192/512/maskable PWA icons & shore FAB art
│   ├── mentors/                             # 15 full-body mentor, artisan & elder character portraits
│   └── crew/                                # Recruitable crewmate, player persona & Credits portraits
├── vendor/
│   └── three.module.min.js                  # Locally vendored Three.js r170 ES module
├── src/
│   ├── main.js                              # Application loop, Shore Diorama <-> Walk <-> Vigil <-> Sea orchestrator
│   ├── intro.js                             # Real-time 3D cinematic intro director for intro.html
│   ├── pwa.js                               # Service Worker registration, storage persistence & Screen Wake Lock
│   ├── core/
│   │   ├── gameConstants.js                 # Astronomical, ocean-ring, ration & difficulty constants
│   │   ├── gameState.js                     # Progression, constellations, cargo, crew, sail dye & snapshots
│   │   ├── campaignManager.js               # Full Acts I-III island quests, repairs, upgrades & route builder
│   │   ├── objectivesManager.js             # Ashore quest & arrival objective lifecycle tracker
│   │   └── achievementsManager.js           # Persistent Surprise Achievements evaluator & storage
│   ├── data/
│   │   ├── achievementsData.js              # Surprise Achievement definitions & metadata
│   │   ├── constellationsData.js            # 12 Horizon Houses, 31 navigation stars & 10 Animal Constellations
│   │   ├── constellationLessonsData.js      # 11 progressive 5-beat elder-guided Sky Vigil scripts
│   │   ├── constellationSilhouettesData.js  # Celestial-locked Bezier animal silhouettes for all 10 constellations
│   │   ├── islandsData.js                   # 3 regional ocean basins & campaign islands with per-island latitudes
│   │   ├── objectivesData.js                # Declarative ashore arrival & trade-gift quest definitions
│   │   ├── playerCharactersData.js          # Persona profiles for the 4 difficulty-linked wayfinders
│   │   ├── sandDiagramsData.js              # Stick-and-shell shore teaching diagrams
│   │   ├── skyVigilData.js                  # Local-hemisphere Constellation Atlas lore & Eye Trial prompts
│   │   ├── songsData.js                     # Authored campaign & secret route chants + dynamic return-song builder
│   │   ├── voiceLinesData.js                # Elder sanctuary & Guided Sky Vigil voice-line catalog
│   │   └── walkableIslandsData.js           # Walkable 3D shore layouts & proximity POIs across all islands
│   ├── simulation/
│   │   ├── celestialSim.js                  # Spherical astronomy (per-island & voyage-interpolated latitudes)
│   │   ├── shadowCraft.js                   # Sighting post (pou) -> crossbeam (iako) solar shadow projection
│   │   ├── hullPhysics.js                   # Twin-hull 4-beat swell Doppler coupling & Ring 3 wave zones
│   │   └── oceanSim.js                      # 2D basin kinematics, leeway, Rings 1-4 & route-trace encoding
│   ├── rendering/
│   │   ├── CameraController.js              # Trim-Lock steering, 3rd-person Canoe View & Vigil shore gaze
│   │   ├── CloudSculptBuilder.js            # Procedural 3D cumulus, peak, steam & lapa cloud sculpts
│   │   ├── CrewCharacterBuilder.js          # Articulated 3D seated crewmate rigs aboard the vaka
│   │   ├── IslandSculptToolkit.js           # Shared volcanic, atoll, reef, lagoon & foliage geometry toolkit
│   │   ├── IslandPropsBuilder.js            # Sculpted Polynesian fare huts, marae platforms, vats & shore props
│   │   ├── IslandTerrainBuilder.js          # Unified 3D ocean, diorama & walkable island assembly dispatcher
│   │   ├── IslandAct1RemainBuilder.js       # Bespoke 3D Society Islands terrain & lagoon assemblies
│   │   ├── IslandAct2Builder.js             # Bespoke 3D Marquesas, Tuamotu & Mangareva island assemblies
│   │   ├── IslandAct3Builder.js             # Bespoke 3D northern archipelago & atoll assemblies
│   │   ├── OceanRenderer.js                 # Swell/refraction/reflection water shader & wake renderer
│   │   ├── PlayerCharacterBuilder.js        # Articulated 3D wayfinder & mentor rigs across personas
│   │   ├── ShoreDioramaRenderer.js          # Interactive 3D shore stage camera, moored vaka & hilltop stone ring
│   │   ├── SkyDomeRenderer.js               # Twilight shader, Milky Way, stars, lines, silhouettes & weather
│   │   ├── StarRingRenderer.js              # Grounded 3D Ahu Feti'a 12-stone coastal observatory & braziers
│   │   ├── VakaCargoPropsBuilder.js         # Sculpted woven ration baskets, water gourds & deck trade bundles
│   │   ├── VakaRenderer.js                  # Procedural double-hulled vaka, dyed sails, pou shadow & crew rigs
│   │   ├── WalkableIslandScene.js           # 3rd-person 3D walkable shore camera, height-grid pathing & POIs
│   │   └── WorldCuesRenderer.js             # Marching clouds, Lapa glow, terns, boobies, Ka'upu, bonito & islands
│   ├── audio/
│   │   ├── BackgroundMusicEngine.js         # 9-track soundtrack rotation, landfall unlocks & speech ducking
│   │   ├── ChantAndDrumEngine.js            # Sample-accurate 4-beat pahu drum & celebratory marimba/vivo chimes
│   │   ├── SpatialSeaAudio.js               # Stereo twin-hull slap cascade, spatial bird calls & surf ambiance
│   │   └── VoiceOverEngine.js               # Pre-recorded elder sanctuary & Sky Vigil voice-over MP3 player
│   └── ui/
│       ├── AchievementsUI.js                # Top-left objective/achievement toasts & Achievements gallery modal
│       ├── CanoeModalUI.js                  # Dedicated Vaka readiness, crew/cargo lightbox & destination modal
│       ├── canoePanelWidgets.js             # Shared crew/cargo card strips, tooltips & voyage confirm dialog
│       ├── CrewSplashUI.js                  # Celebratory crew recruitment & Vaka Moana upgrade splash modals
│       ├── ElderVigilPromptUI.js            # Pre-departure choice popup when an elder Sky Vigil is unlearned
│       ├── IslandHubUI.js                   # 3-station Shore Diorama panel & pinned Critical-Path CTA
│       ├── IslandSettingsUI.js              # Ashore Settings (audio toggles, difficulty cards, Credits & reset)
│       ├── OnboardingTourUI.js              # Spotlight tours for first shore visit, maiden sail & peak cloud
│       ├── SailingHUD.js                    # Strict Zero-Compass HUD, arrow trim, Landfall & Lost-at-Sea review
│       ├── SandCanvas.js                    # Animated shore sand-drawing lessons & static Recall renderer
│       ├── SkyVigilUI.js                    # Local island Star-Stone Vigil, Elder Teachings, Atlas & quiz
│       └── WalkableIslandUI.js              # 3D walkable shore HUD, touch thumbstick, POI cards & sand modal
└── tests/
    ├── runPhase1Tests.mjs                   # Astronomy, silhouettes, zero-compass, objectives & autopilot suite
    └── runCampaignWalkthroughTests.mjs      # Full campaign progression & economy suite
```

---

<details>
<summary><strong>Spoilers</strong> (Developer Map, 3D Asset Viewer, Direct URLs &amp; Debug Cheats)</summary>

### Live Deployment Debug Links
* **3D Asset Debug Viewer:** [https://doonch.github.io/Kavenga/asset-viewer.html](https://doonch.github.io/Kavenga/asset-viewer.html)
* **Developer Ocean & Route Map:** [https://doonch.github.io/Kavenga/map.html](https://doonch.github.io/Kavenga/map.html)
* **Extended-Cut 3D Intro (`4s` cuts):** [https://doonch.github.io/Kavenga/intro_long.html](https://doonch.github.io/Kavenga/intro_long.html)

### Local Debug Viewers
- **3D Asset Debug Viewer (`http://127.0.0.1:8123/asset-viewer.html`):** Inspect all procedural 3D assets in an interactive orbit/zoom studio (Canoe Tiers 1–3 with deck cargo & seated crewmates, player/mentor characters, White Tern, Brown Booby, Manuae Red Kura & Black-footed Albatross *Kaʻupu* seabirds, Trade-Wind / Peak / *Lapa* / Steam clouds, leaping Bonito fish, **Island Landmarks & Props**, **Island Flora**, and all campaign islands in Ocean/Landfall and Walkable Shore views).
- **Developer Ocean Map (`http://127.0.0.1:8123/map.html`):** Out-of-game basin chart for inspecting island ring radii, authored routes, spawned fish schools, post-voyage trajectory traces, and jumping directly to any selected island via **Visit**.

### Sailing Debug Cheats
| Shortcut | Effect (While Sailing) |
| :--- | :--- |
| `Shift + G` | Directs the canoe straight toward the target island at high speed so it arrives within ~2–3 seconds |
| `Shift + F` | Toggles **Super Fast Wind (`10×`)** speedup for movement, solar progression, and ration consumption |
| `Shift + 8` (`*`) | Spawns an immediate solitary pelagic *Kaʻupu* (Black-footed Albatross) overhead flyby |

### Instant Star-Stone Vigil Dev Entry
- Specific Island Guided Sky Vigil (e.g. *Hina* on Tahaʻa): `http://127.0.0.1:8123/?mode=sky_vigil&island=tahaa`
- Northern Mist Isles Sky Vigil (e.g. *Keeper Akura* on Kiritimati): `http://127.0.0.1:8123/?mode=sky_vigil&island=kiritimati`
- Specific Island Sky & Tab (`guided`, `atlas`, or optional `quiz`): `http://127.0.0.1:8123/?mode=sky_vigil&island=hawaii&tab=atlas`

### Instant Landfall & Launch Previews
- Default Tahaʻa Lagoon Arrival (~1.6s approach lead-in): `http://127.0.0.1:8123/?mode=landfall`
- Any Island & Lighting Window (`dawn`, `midday`, `dusk`, `midnight`): `http://127.0.0.1:8123/?mode=landfall&island=raiatea&window=dusk` or `http://127.0.0.1:8123/?mode=landfall&island=hawaii`
- Immediate Ring 4 Trigger (`lead=0` or `instant=1`): `http://127.0.0.1:8123/?mode=landfall&island=tahaa&lead=0`
- Departure Launch Cinematic Preview: `http://127.0.0.1:8123/?mode=launch&island=raiatea&window=dawn`

</details>

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
