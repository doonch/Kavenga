---
trigger: always_on
---

# Kavenga: Songs of the Star Path — Project Rules & Architecture

## 1. Inviolable Zero-Compass UX Rule
- **Never** display or emit a compass rose, rotating heading tape, cardinal words/letters (`north`, `south`, `east`, `west`, `N`, `S`, `E`, `W`), degree numbers (`°`, `degree`), minimap, or dynamic player-heading indicator in any UI, HUD, sand diagram, mentor dialogue, chant lyric, or *Lost at Sea* reflection across any difficulty mode (`easy`, `medium`, `hard`, `master_navigator`).
- **Strictly Static Recall:** The at-sea Sand **Recall** overlay (`SandCanvas.renderLesson(lesson, { animate: false })`) must remain a static, non-rotating memory vignette—never rotate it with canoe heading or mark the player's live orientation on it.
- Internal engine azimuth/altitude degree math is permitted **only** in simulation/data internals (`engineAzDeg`, `raDeg`, `decDeg`, `headingDeg`), never in player-facing strings.

## 2. Zero-Build Web 3D Stack
- Maintain **zero-build** browser execution: native ES2022 modules loaded from `index.html` using `<script type="importmap">` mapped to `./vendor/three.module.min.js` (Three.js `r170`).
- Keep all asset and module paths strictly relative (`./src/...`, `./vendor/...`) so the repository works offline via `python3 -m http.server` and deploys directly to GitHub Pages with no bundler or `npm` step.
- Keep `src/core/`, `src/data/`, and `src/simulation/` free of DOM/`window`/`THREE` imports so headless test suites run cleanly in both Node.js and macOS JavaScriptCore (`jsc -m`).

## 3. Coordinate & Simulation Conventions
- **3D Canoe Frame (`VakaRenderer`, `SkyDomeRenderer`, `OceanRenderer`, `WorldCuesRenderer`, `CameraController`):**
  - `-Z` = dead ahead between the twin *manu* prows
  - `+Z` = dead astern over the steering sweep (*hoe uli*) and foamy leeway wake
  - `+X` = starboard (right) beam, `-X` = port (left) beam, `+Y` = masthead zenith
  - `altAzToDirectionVec3(altDeg, azDeg, canoeHeadingDeg)` maps world horizon coordinates directly into this frame.
- **2D Ocean Basins (`islandsData.js`, `oceanSim.js`):**
  - Three continuous regional basins (`act1_raiatea`, `act2_nuku_hiva`, `act3_mist_isles`) bridged by inter-basin crossings (`song_07`, `song_13`). Coordinates use `{ x: eastUnits, y: northUnits }` where `1.0` unit equals `1` minute of nominal `1x` sailing.
- **4-Beat Swell Coupling (`hullPhysics.js`):**
  - Preserve exact `4.000` beats per wave at `±45°` port/starboard cheek trim (`2.75` head-on, `5.16` beam-on, `6.25` following) locked to `ChantAndDrumEngine` *pahu* downbeats.

## 4. Verification Gate Before Completing Changes
Whenever modifying `src/data/`, `src/simulation/`, `src/core/`, or player-facing UI copy, run both automated suites and confirm `0` failures:

```bash
# Using Node.js (if available):
node tests/runPhase1Tests.mjs
node tests/runCampaignWalkthroughTests.mjs

# Or on macOS without Node.js (native JavaScriptCore):
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runPhase1Tests.mjs
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runCampaignWalkthroughTests.mjs
```
