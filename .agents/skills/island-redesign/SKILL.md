---
name: island-redesign
description: >-
  Guidelines, architecture checklist, and headless Three.js geometry audit workflow for
  redesigning Kavenga's 17 islands to 2x canonical scale with gentle walkable hills,
  unobstructed spawns, open-sky hilltop/flat Observation Circles, and organic coral atolls.
---

# Kavenga Island Redesign Skill

Use this workflow whenever enlarging, reshaping, or rebalancing an island's 3D terrain, props, or walkable layout. Always preserve Kavenga's **Zero-Compass UX rule**, **zero-build ES2022 module structure**, and **cross-mode single-mesh consistency** (Ocean approach, Known Ocean Map, Shore Diorama, and Walkable Shore all mount the exact same canonical assembly).

---

## Target Standards (Apply to Every Redesigned Island)

### 1. Canonical Size & Scale (`2×` Horizontal Footprint, `canonicalScale: 1.0`)
- **Horizontal Expansion:** Expand canonical island shoreline radius (`coastR` / outer atoll rim) to **~2.0×** the legacy compact size:
  - Volcanic / Lagoon High Islands: canonical shoreline `coastR ~ 60–82m`, outer reef `maxRadius ~ 98–120m` (comparable to Hawai'i `74.5m`).
  - Coral Atolls: canonical outer rim `~ 76–86m`, terrain `maxRadius ~ 108–124m`.
- **Walkable Scale (`Option A` Standard):** Set `canonicalScale: 1.0` in [walkableIslandsData.js](../../../src/data/walkableIslandsData.js) for every 2× redesigned island so huts, doorways, canoe bows, palms, and steps match true `1:1` human proportions next to the `1.7m` navigator rig.
- **Walkable Grid Span:** Set `gridHalfSpan >= Math.ceil(maxOuterRadius + 25.0)` (typically `135.0–155.0`) in [walkableIslandsData.js](../../../src/data/walkableIslandsData.js) so the island reef and beach never clip past `WalkableIslandScene`'s `maxWalkRadius = gridHalfSpan - 8.0`.
- **Tessellation Density:** Increase `buildPolarTerrainGeometry` / terrain mesh segments to `nRings: 84–96`, `nSegs: 120–144` so doubled radii keep ~`1.0–1.3m` vertex resolution.

### 2. Majestic, Walkable Hills ("Keep or Increase Peak Height, Widen Horizontal Run")
- **Do not reduce original hill/peak height:** Keep peak/plateau elevations at **`>= 1.0×` (typically `1.0×–1.5×`)** of baseline height so `2×` wider islands retain bold volcanic silhouettes on the horizon rather than looking flattened.
- **Gentle Grade via Horizontal Expansion & Ridge Smoothing:**
  - Achieve walkable slopes by spreading elevation smoothly across the `2×` horizontal run (`coastR ~ 64–82m`) and softening sharp angular bay sidewalls / ridge spikes rather than lowering the mountain.
  - Keep **zero impassable climb-blocked cells** above `WalkableIslandScene`'s hard limit (`uphillSlope > 0.92` above `y = 14.0m`), and target smooth hillside `p95Slope <= 0.80` (`~0.50–0.75` natural mountain grade across open slopes, `<= 0.35` at spawn/beaches).
  - Reserve near-vertical rock faces (`slope > 0.92`) solely for non-walkable sea cliffs, spire monuments (e.g., Ua Pou needles), or caldera rims outside POI trails.

### 3. Clear Walkable Spawns & POI Arrival Clearings
- **Pass Exclusion Zones into Prop Builders:** Define dry, open coordinates in walkable (`canonicalScale: 1.0`) space and filter **all** canonical assembly placements (palms, broadleaf trees, coastal scrub, huts, marae, rocks, hearths) against explicit clearance guards:
  - **`initialSpawn` & `vigilExitSpawn`:** Ground height `0.35m <= h <= 2.4m`, local slope `<= 0.30`, **zero canonical props within `>= 7.0m`** radius (`~7.0m / canonicalScale` in unscaled builder space), and outside `mooredCanoe` (`r = 4.0`) + POI obstacles. Keep `3.5m < dist(initialSpawn, mooredCanoe) < 12.0m` and `dist(initialSpawn, canoe_landing) > canoe_landing.triggerRadiusM` to satisfy `runPhase1Tests.mjs`.
  - **Every POI `arrivalSpot`:** **Zero unrelated trees/scrub/rocks within `>= 4.5m`** radius.

### 4. Observation Circles (Hilltop Terrace OR Open Flat + Full Sky Visibility)
Every `observation_circle` POI must satisfy **all three** rules:
1. **Site Type:** Place either on:
   - a leveled hilltop/coastal bluff plateau (flatten a `>= 6.5m` canonical-radius terrace directly in `eval<Island>Point` with local slope `<= 0.16`), **or**
   - a broad, open, flat coastal meadow or inner lagoon sandspit (`0.7m <= h <= 3.0m`, local slope `<= 0.12`).
2. **Open Sky Hemisphere (`<= 12°` Horizon Occlusion):** Across a 360° sweep from the circle center, surrounding peaks and ridges must subtend **`<= 12°`** above the circle's eye level so stars near the horizon and rising/setting constellations remain clearly visible in Sky Vigil.
3. **Zero Overhead Canopy / Props:** Maintain a **`>= 10.0m` clearance radius** around `(circle.x, circle.z)` free of all palms, broadleaf trees, scrub, and structures so `ShoreDioramaRenderer` and the player never stand inside foliage.
4. **Grounded Platforms & Structures (No Floating *Marae* or Huts):** Never place flat platforms (`addMaraePlatform`, `addStarStoneCircle`, `addRegionalHuts`, shipwright sheds) on sloped ridges where downhill corners hang in mid-air. Always flatten a level terrace (`r >= 5.5m` with smooth collar) around the structure *after* any adjacent trail/cliff ramps, and sink its base `y` by `~0.10–0.15m` into the ground (checking all four `±2.5m` corners sit flush).

### 5. Organic, Non-Circular Shorelines, Lagoons & Coral Atolls
For **all islands** (volcanic fringing reefs, lagoon islands, and coral atolls alike — never leave circular `CircleGeometry` water discs, constant-radius `TorusGeometry` reef arcs, or cylindrical `motu` islets):
1. **Asymmetric Macro Footprint:** Stretch axes (`sx, sz` ~ `1.14 × 0.88` or skewed axis) and combine `2θ` + `3θ` elongation waves alongside asymmetric higher harmonics (`4θ`, `5θ`, `7θ`) so high islands, bays, and atolls form natural crescent, ovoid, or crooked-headland silhouettes rather than radial circles or mirror-symmetric stars.
2. **Independent Inner & Outer Shoreline Harmonics:** Modulate outer reef rim `rOuter(theta)` and inner shoreline/lagoon rim with phase-offset harmonics plus angular domain warp so motu islets and fringing lagoons vary organically in width, curve into hooked sandspits, and indent into sheltered coves.
3. **Contour-Matched Water, Reefs & Motu Islets:** Use `createOrganicLagoonGeometry(reefRadiusFn)` and `addOrganicBarrierReefArc(group, reefMat, foamMat, reefRadiusFn, ...)` plus `createOrganicMotuGeometry(...)` from [IslandSculptToolkit.js](../../../src/rendering/IslandSculptToolkit.js) so turquoise lagoon water, breaking surf collars, and reef motus follow the warped organic perimeter rather than cutting across bays as circles.

---

## Step-by-Step Redesign Workflow

1. **Baseline Audit:**
   Run the headless audit script against the target island before editing:
   ```bash
   python3 .agents/skills/island-redesign/scripts/run_audit.py <island_id>
   ```
   Review shoreline radius mismatch, slope distribution, atoll circularity index, spawn/POI obstacle collisions, and Observation Circle horizon occlusion.
2. **Consult Architecture Couplings:**
   Read [references/architecture-couplings.md](references/architecture-couplings.md) for the target island's builder function, orientation rotation (`getIslandApproachOrientationRad`), `ISLAND_SHORE_RADIUS_M`, and walkable spec (`walkableIslandsData.js` + `WalkableIslandScene.js` summit paths).
3. **Reshape Terrain & Props:**
   - Expand horizontal radii `~2×`, soften elevation ramps, flatten the Observation Circle terrace (or open flat), and carve organic non-circular contours on atolls/lagoons.
   - Add an explicit exclusion filter (`keepClearOf(pts, blockedZones)`) before spawning `addCoconutGroves`, `addBroadleafTrees`, `addCoastalScrub`, huts, and landmarks.
4. **Sync Cross-System Specs:**
   - Update `ISLAND_SHORE_RADIUS_M[islandId]` and `sinkDepthM` in [IslandTerrainBuilder.js](../../../src/rendering/IslandTerrainBuilder.js).
   - Update [walkableIslandsData.js](../../../src/data/walkableIslandsData.js): set `canonicalScale: 1.0`, `gridHalfSpan >= Math.ceil(outerReefR + 25)`, updated `canoe` / `spawn` / `landing` / `hut` / `circle` / `elder` coordinates, and matching trail waypoints in [WalkableIslandScene.js](../../../src/rendering/WalkableIslandScene.js).
   - Check neighbor clearance on `oceanMap.js` if multiple adjacent Act islands have expanded (see [references/architecture-couplings.md](references/architecture-couplings.md)).
5. **Re-Audit & Verify:**
   - Re-run `python3 .agents/skills/island-redesign/scripts/run_audit.py <island_id>` and confirm all PASS criteria.
   - Run mandatory test suites via JavaScriptCore (`jsc -m`):
     ```bash
     /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runPhase1Tests.mjs
     /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tests/runCampaignWalkthroughTests.mjs
     ```
   - Bump `?v=` cache-busters across HTML entrypoints (`index.html`, `asset-viewer.html`, `map.html`, `intro.html`, `intro_long.html`).
