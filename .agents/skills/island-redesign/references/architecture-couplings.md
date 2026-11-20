# Kavenga Island Architecture Couplings & Reusable Snippets

Use this reference alongside [SKILL.md](../SKILL.md) to locate every module, helper, and coordinate sync point affected by an island redesign.

---

## 1. Where Each of the 17 Islands Is Built

| Island ID | Act | Canonical Terrain & Props File | Builder Function | Approach Rotation Source |
| :--- | :---: | :--- | :--- | :--- |
| `raiatea`, `tahaa`, `manuae` | Act I | `src/rendering/IslandTerrainBuilder.js` | `createDetailedIslandAssembly` | `getIslandApproachOrientationRad` |
| `huahine`, `moorea`, `maupiti` | Act I | `src/rendering/IslandAct1RemainBuilder.js` | `buildHuahineAssembly` / `buildMooreaAssembly` / `buildMaupitiAssembly` | `getIslandApproachOrientationRad` |
| `nuku_hiva`, `ua_pou`, `rangiroa`, `hiva_oa`, `fatu_hiva`, `mangareva` | Act II | `src/rendering/IslandAct2Builder.js` | `createAct2IslandAssembly` | `getIslandApproachOrientationRad` |
| `kauai`, `oahu`, `kiritimati`, `hawaii` | Act III | `src/rendering/IslandAct3Builder.js` | `createAct3IslandAssembly` | `getIslandApproachOrientationRad` |
| `rapa_nui` | Secret | `src/rendering/IslandRapaNuiBuilder.js` | `createRapaNuiIslandAssembly` | `getIslandApproachOrientationRad` |

---

## 2. Cross-System Synchronization Checklist

When changing an island's footprint or elevation profile:

1. **Shoreline Stopping Distance (`ISLAND_SHORE_RADIUS_M`)**
   - File: `src/rendering/IslandTerrainBuilder.js` (`ISLAND_SHORE_RADIUS_M`, `getIslandShoreRadiusM`).
   - Consumers:
     - `WorldCuesRenderer.js`: landfall canoe bow stopping distance (`endVisualDist = bowStopZAbs + shoreRadiusM + shoreGapM`) and launch departure distance.
     - `ShoreDioramaRenderer.js`: camera presets (`_computeStationPreset`), moored canoe (`canoeZ = shoreR + 13.5`), and observatory fallback search (`_resolveAccessibleKnollPosition`).
     - `oceanMap.js`: clickable pick cylinder (`shelfRadiusM = Math.max(54.0, shoreRadiusM + 16.0)`).
   - Rule: After setting `group.rotation.y = getIslandApproachOrientationRad(islandId)`, measure the farthest dry land (`h >= 0.05m`) near `+Z` (`x ∈ [-4, +4]`) and set `ISLAND_SHORE_RADIUS_M[islandId]` within `±1.5m`. Also scale `sinkDepthM` proportionally (`~maxPeakHeight + 8m` or `~shoreR * 1.1`) so ocean horizon rise emerges smoothly from underwater.

2. **Walkable Spec (`WALKABLE_ISLAND_SPECS`)**
   - File: `src/data/walkableIslandsData.js` (`WALKABLE_ISLAND_SPECS`, `makeStandardWalkableSpec`).
   - Walkable coordinates are in **walkable meters** (`canonicalPos * canonicalScale` after `getIslandApproachOrientationRad` rotation).
   - Set `canonicalScale: 1.0` for every redesigned 2× island so human characters, thatched doors, and canoes match `1:1` proportions (same as `hawaii` and `rapa_nui`).
   - Set `gridHalfSpan` `>= Math.ceil(maxOuterRadius + 25.0)` (e.g. `135.0–155.0`), because `WalkableIslandScene` clamps player bounds to `maxWalkRadius = gridHalfSpan - 8.0`.
   - If the grid span exceeds `130.0`, consider raising `gridN` in `WalkableIslandScene.js` if step resolution (`(gridHalfSpan * 2) / gridN`) exceeds `~1.35m` per cell.
   - Check `trailSpecs[islandId]` in `WalkableIslandScene.js` (`_buildSummitStonePath`) so stepping-stone waypoints and flanking `addKukuiTorch` sites follow the redesigned coastline/hill slope without dipping into ocean water or overlapping `initialSpawn`.

3. **3D Known Ocean Map Neighbor Clearance (`src/oceanMap.js`)**
   - `oceanMap.js` places islands at `pos * UNIT_TO_METERS` (`68.0m` per sailing unit) and scales meshes globally by `this.islandScale` (currently `1.4` default, slider `0.8..2.1`).
   - Tightly spaced neighbors (e.g., `raiatea` ↔ `tahaa` are `3.37` units = `229m` apart) will visually touch outer reefs if `shelfRadiusM ~ 90m` at `islandScale = 1.4` (`90 × 1.4 × 2 = 252m > 229m`). When multiple Act islands have been scaled 2×, inspect `map.html` and lower `this.islandScale` default (e.g. `0.85`–`1.0`) or widen slider min if needed.

4. **Zero-Compass & Zero-Build Constraints**
   - Never add compass needles, degree numbers (`°`), or cardinal directions (`N/S/E/W`, `north/south/east/west`) to `walkableIslandsData.js` POI labels, quotes, or hints.
   - Bump matching `?v=` cache-busters in `index.html`, `asset-viewer.html`, `map.html`, `intro.html`, and `intro_long.html`.

---

## 3. Reusable Terrain & Clearance Patterns

### A. Exclusion-Zone Filter for Canonical Props (`keepClearOf`)
Define clearance circles in **canonical builder `(x, z)` coordinates** (remember to invert `getIslandApproachOrientationRad(id)` when converting from walkable `(wx, wz)` back to canonical `(cx, cz)`, i.e., rotate by `-rotY`):

```js
function toCanonicalXZ(wx, wz, rotY, canonicalScale = 1.0) {
  const ux = wx / canonicalScale;
  const uz = wz / canonicalScale;
  const c = Math.cos(-rotY);
  const s = Math.sin(-rotY);
  return { x: ux * c + uz * s, z: -ux * s + uz * c };
}

function isClearOfZones(x, z, zones) {
  for (const z0 of zones) {
    if (Math.hypot(x - z0.x, z - z0.z) < z0.r) return false;
  }
  return true;
}
```
Recommended canonical exclusion radii (when `canonicalScale = 1.0`):
- `initialSpawn` / `vigilExitSpawn`: `r = 7.5`
- `observation_circle`: `r = 10.5`
- Each POI `arrivalSpot`: `r = 4.5`

### B. Flat Hilltop / Bluff Plateau Blending Inside `eval<Island>Point`
Carve an inviting, unobstructed lookout pad around the canonical circle site `(cx, cz)` at target plateau elevation `targetH`:

```js
const dCircle = Math.hypot(x - cx, z - cz);
if (dCircle < 12.0) {
  const flatBlend = 1.0 - smoothstep(6.2, 12.0, dCircle);
  h = lerp(h, targetH, flatBlend);
}
```
Use `plateauRadius >= 6.2m` with a gentle `6m` blend collar so the pad edges flow smoothly into the hillside (`slope <= 0.16` across the ring).

### C. Organic Non-Circular Shorelines, Lagoons & Barrier Reefs
Never use `new THREE.CircleGeometry(...)` or `addBarrierReefArc(constantRadius)` for islands with fringing lagoons, reefs, or atolls. Instead define an asymmetric `reefRadiusFn(theta)` and use the shared builders in `src/rendering/IslandSculptToolkit.js`:

```js
const evalReefRadius = (theta) =>
  104.0 +
  10.5 * Math.cos(2.0 * theta - 0.5) +
  6.5 * Math.sin(3.0 * theta + 0.9) +
  4.8 * Math.cos(5.0 * theta - 1.1) +
  2.4 * Math.sin(7.0 * theta + 0.4);

const lagoonGeo = createOrganicLagoonGeometry(evalReefRadius, 96);
const lagoonDisc = new THREE.Mesh(lagoonGeo, lagoonSurfaceMat);
lagoonDisc.position.y = 0.16;
group.add(lagoonDisc);

addOrganicBarrierReefArc(
  group,
  reefSandMat,
  surfFoamMat,
  evalReefRadius,
  startRad,
  endRad,
  72
);
```

For coral atolls (`manuae`, `rangiroa`, `kiritimati`), modulate inner lagoon rim and outer ocean rim independently:

```js
function evalOrganicAtollBounds(x, z) {
  const rx = x * 0.9;
  const rz = z * 1.14 + 0.08 * x;
  const r = Math.hypot(rx, rz);
  const th = Math.atan2(rz, rx);

  const macroLobe = 7.5 * Math.cos(2.0 * th - 0.55) + 4.8 * Math.sin(3.0 * th + 0.9);
  const outerRipple = 4.2 * Math.sin(5.0 * th + 0.4) + 2.6 * Math.cos(7.0 * th - 1.1);
  const innerRipple = 5.0 * Math.cos(4.0 * th - 0.8) + 3.2 * Math.sin(6.0 * th + 1.3);

  const outerReefR = 82.0 + macroLobe + outerRipple;
  const lagoonRimR = 54.0 + macroLobe * 0.85 + innerRipple;
  return { r, th, outerReefR, lagoonRimR };
}
```
