---
name: volcanic-island-redesign
description: Variant of island-redesign specialized for dramatic volcanic islands (volcanic_spire, fortress_crag, high_volcanic, twin_peaks). Allows taller peaks, razor-edge cliffs, shear basalt spires, and unreachable vertical relief (slope > 0.92) alongside BFS-verified walkable coastal bays, valley trails, dramatic terrain color palettes, waterfalls, craters, and panoramic rim/bluff Observation Circles.
---

# Kavenga Dramatic Volcanic Island Redesign Skill

Use this skill when redesigning or authoring **dramatic volcanic islands** (`volcanic_spire`, `fortress_crag`, `high_volcanic`, `twin_peaks`) — such as **Maupiti, Ua Pou, Nuku Hiva, Hiva Oa, Fatu Hiva, Kaua'i, O'ahu, Hawai'i, Mangareva, Rapa Nui**, or high-relief Society peaks where monumental basalt walls, vertical monoliths, and unreachable peaks define the island's visual silhouette.

> **When to use `island-redesign` vs. `volcanic-island-redesign`:**
> - Use [island-redesign](../island-redesign/SKILL.md) for **coral atolls** (`manuae`, `rangiroa`, `kiritimati`) and **walkable green hill islands** (`raiatea`, `tahaa`, `huahine`) where every ridge is meant to be hiked all the way to the summit (`blockedCells = 0`, `p95Slope <= 0.82`).
> - Use **`volcanic-island-redesign`** whenever the island features **unreachable cathedral spires, sheer sea-cliffs, monolith crags, horseshoe calderas, canyon walls, oxidized tuff quarries, solidified black lava fields, or snow-crowned shields** where dramatic vertical slopes (`> 0.92`) should soar undisturbed above reachable coastal villages, valley trails, and lookout spurs.

---

## 1. Core Architectural & Geometric Contracts

### Scale & Mesh Density (Shared with `island-redesign`)
- **2× Canonical Footprint:** Canonical `+Z` dry shore (`ISLAND_SHORE_RADIUS_M[id]`) **`>= 58.0m`** (typical `62m–92m`). Update `ISLAND_SHORE_RADIUS_M` in [IslandTerrainBuilder.js](../../../src/rendering/IslandTerrainBuilder.js) within `±1.5m` of actual `+Z` shoreline.
- **1:1 Walkable Scale:** Set `canonicalScale: 1.0` in [walkableIslandsData.js](../../../src/data/walkableIslandsData.js) and `gridHalfSpan >= Math.ceil(maxOuterRadius + 25.0)`.
- **High-Definition Volcanic Tessellation:** Sheer cliffs, spire needles, and 12–16 basalt ribs facet visibly at low segment counts. Use **`nRings >= 104–124`**, **`nSegs >= 144–180`**, and `sinkDepthM >= peakHeight + 10.0` in `buildPolarTerrainGeometry(...)` so plunging underwater buttresses emerge cleanly with sharp vertical flutes.

### Towering Unreachable Peaks vs. Reachable Playable Corridors
In [WalkableIslandScene.js](../../../src/rendering/WalkableIslandScene.js), player uphill movement is only blocked when:
```js
const uphillSlope = (nh - curH) / stepDist;
if (uphillSlope > 0.92 && nh > 14.0) return false;
```
Design **two deliberate terrain zones**:
1. **Unreachable Volcanic Drama (Protected & Encouraged):**
   - Summit spires, *pari* ridge crests, amphitheater back-walls, and coastal sea-cliffs may soar to **`65m–125m+`** with local slopes **`1.2–4.5+`** (`blockedCells > 0` is expected!).
   - Never flatten spires or crater walls just to eliminate steep cells outside the playable route.
2. **Playable Foothill, Valley & Spur Corridor (Strictly Connected):**
   - `initialSpawn` at dry landing bay (`0.25m <= h <= 3.0m`, `slope <= 0.35`, `propClear >= 6.5m`, `canoeClear >= 6.5m`).
   - Every POI (`landing`, `hut`, `elder`, `observation_circle`, plus any `extraPois`) sits on a gentle pocket terrace (`slope <= 0.25`, obstacle-free radius `>= 4.5m`).
   - **Connected Path Rule:** From `initialSpawn`, **every POI and `observation_circle` MUST be reachable on foot** along dry terrain (`h >= 0.25m`) without crossing obstacles or exceeding `uphillSlope > 0.88` above `y = 14m` (safe margin below runtime `0.92`). Sculpt smooth valley floors, coastal ledges, or terraced ridge-spur switchbacks connecting POIs while leaving flanking cliff walls vertical!

### Lookout Observation Circles (Spur, Promontory, or Crater Rim)
Instead of burying the Observation Circle in a dark canyon or flattening the tallest monolith:
- Place `observation_circle` on an **open shoulder bluff, sea-facing promontory plateau, crater rim spur, or elevated coastal saddle** (`h = 10m–55m`).
- Carve a flat level pad (`padSlope <= 0.18` over `r >= 6.2m`, smoothed into a `12m` collar) and keep props `>= 10.0m` away from circle center.
- **Panoramic Star-View Rule:** An iconic unreachable spire may rise dramatically behind *one narrow azimuth sector*, provided **`>= 75%` of the 360° sky horizon stays `<= 15.0°`** (over `270°` of unobstructed ocean/sky dome) and **`maxTerrainHorizon <= 28.0°`**. Never trap the circle inside a bowl (`45°–80°` cliff walls ringing half the sky).

---

## 2. Volcanic Terrain Palettes, Geology & Signatures

Standard green hills tint everything grass-emerald. Dramatic volcanic islands MUST contrast bare rock strata, scoria, ash, lava flows, and clinging rainforest:
- **Basalt Cliff Walls & Fluted Pillars:** Cold slate-charcoal `[0.16, 0.16, 0.19]` to deep obsidian basalt `[0.11, 0.11, 0.14]` triggered wherever local steepness/flute mask is high (`slope > 0.72` or ridge crest altitude > treeline).
- **Red-Ochre Scoria & Oxidized Tuff:** Warm volcanic iron rust `[0.45, 0.19, 0.11]` / `[0.56, 0.25, 0.14]` on crater rims, quarry faces (`hiva_oa`, `rapa_nui`), and eroded spire bands.
- **Lava Tongues & Black Sand Coves:** Dark basaltic black sand `[0.10, 0.10, 0.12]` and ropey pahoehoe streaks `[0.08, 0.08, 0.10]` in young shields (`hawaii`, `hiva_oa`, `fatu_hiva`), contrasting against frothy surf collars.
- **Clinging Valley Emerald & Highland Scrub:** Mossy fern gulches `[0.09, 0.27, 0.11]`, warm golden-olive grass shoulders `[0.24, 0.34, 0.15]` where slopes ease (`< 0.60`) and moisture gathers, plus crimson-blossom `'ohi'a` pockets `[0.38, 0.14, 0.11]` on misted Hawaiian highlands.
- **Alpine / Mauna Snowcaps (Where Iconic):** Wind-scoured basalt-to-snow transition `[0.88, 0.91, 0.96]` above `y = 68m+` on Mauna peaks (`hawaii`).
- **Signature Landmarks:** Plunging gorge waterfalls (`addWaterfallCascade`), jagged offshore basalt **sea-stacks** and wave-cut arches, crater vents / glowing lava pools (`emissive` lava lakes on `hawaii`), cliff-hugging Marquesan stone *paepae* / *heiau* platforms (`addMaraePlatform`), and **non-circular** reefs or Marquesan reefless surf collars.

For concrete RGB palettes, math sculpting snippets (spire pleats, horseshoe calderas, BFS-safe ramp carving), and per-island briefs, read [references/volcanic-palettes-and-islands.md](./references/volcanic-palettes-and-islands.md).

---

## 3. Mandatory Redesign Workflow

1. **Review Cross-System Couplings:** Check builder location and sync rules in [island-redesign/references/architecture-couplings.md](../island-redesign/references/architecture-couplings.md) and geological recipes in [references/volcanic-palettes-and-islands.md](./references/volcanic-palettes-and-islands.md).
2. **Design Silhouette & Trail Spine First:**
   - Choose canonical `+Z` bay (`landing`, `initialSpawn`), village flat (`hut`, `elder`), and panoramic lookout spur (`observation_circle`).
   - Sketch impassable massifs/spires/calderas *around or beside* the route spine so steep walls frame dramatic vistas instead of blocking movement.
   - Blend a smooth walkable trail ribbon (`slope <= 0.78`) linking `initialSpawn -> village/POIs -> observation_circle`.
3. **Sculpt, Color & Filter Props:**
   - Implement `eval<Island>Point(x, z)` and volcanic `colorFn(x, z, pt)` with high polar density (`nRings >= 108`, `nSegs >= 156`).
   - Filter all trees, palms, huts, cairns, and rocks through canonical exclusion zones around `initialSpawn` (`r = 7.5`), `observation_circle` (`r = 10.5`), every POI `arrivalSpot` (`r = 4.5`), and along narrow spur trail centers (`r = 3.2m`).
   - Sync `ISLAND_SHORE_RADIUS_M`, `WALKABLE_ISLAND_SPECS` (`canonicalScale: 1.0`, `gridHalfSpan`), `trailSpecs`, and `map.html` / `index.html` cache-busters.
4. **Run the Volcanic Headless Audit (ZERO `FAIL`):**
   ```bash
   python3 .agents/skills/volcanic-island-redesign/scripts/run_volcanic_audit.py <island_id>
   ```
   Verify `[PASS]` on `Canonical +Z Shore`, `Walkable Scale`, `Walkable Bounds`, `Initial Spawn`, **`Walkable POI Paths` (BFS reachability to EVERY POI & Observation Circle)**, `Circle Terrace`, `Circle Sky Horizon` (`>= 75%` open sky, `max <= 28°`), and `Circle Canopy Clear`, plus strong **`Volcanic Relief`** peak & cliff drama metrics.
5. **Run Simulation Verification Suites:**
   ```bash
   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runPhase1Tests.mjs
   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runCampaignWalkthroughTests.mjs
   ```
