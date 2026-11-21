# Volcanic Palettes, Sculpting Math & Island Briefs

Use alongside [SKILL.md](../SKILL.md) and [architecture-couplings.md](../../island-redesign/references/architecture-couplings.md).

---

## 1. Volcanic Terrain Color Palettes (`[r, g, b]` linear/sRGB floats)

Feed these into `buildPolarTerrainGeometry({ colorFn })` via `mixRgb(a, b, t)`:

| Geological Zone | RGB Triplet | Where to Trigger |
| :--- | :--- | :--- |
| **Black Volcanic Sand / Foreshore** | `[0.10, 0.10, 0.12]` | `isBlackBeach && h < 2.2` |
| **Dark Basalt Sea-Cliff** | `[0.16, 0.15, 0.18]` | Steep coastal rock & underwater apron (`h < 18, flute > 0.45`) |
| **Charcoal Pillar Basalt** | `[0.22, 0.21, 0.24]` | Exposed razor ridges, needle spires, sheer *pari* faces (`h > 32`) |
| **Cooled Pahoehoe / A'a Lava** | `[0.08, 0.08, 0.095]` | Active shield aprons (`hawaii`, crater flanks) |
| **Oxidized Red Scoria / Tuff** | `[0.46, 0.19, 0.11]` | Crater rims, quarries (`hiva_oa`, `rapa_nui`), cinder cones |
| **Golden-Ochre Basalt Dust** | `[0.49, 0.34, 0.18]` | Sunlit Marquesan windward ledges (`ua_pou`, `nuku_hiva`) |
| **Lush Canyon Rainforest** | `[0.09, 0.27, 0.11]` | Sheltered valley bottoms & waterfall amphitheaters |
| **Sunlit Ferns / Koa Highland** | `[0.18, 0.33, 0.14]` | Gentle habitable shoulders & spurs (`slope < 0.65`) |
| **Crimson `'Ohi'a` Blossom Pocket** | `[0.38, 0.14, 0.11]` | High misty ridge pockets (`kauai`, `hawaii`) |
| **Alpine Mauna Snowcap** | `[0.89, 0.92, 0.97]` | Extreme summit snowline (`h > 68m` on `hawaii`) |

**Slope-Driven Rock Exposure Tip:** Estimate local steepness or radial flute factor (`crest = pow(pleatWave, 1.8)`). Blend greenery *only* into sheltered pockets (`1.0 - crest`) and moderate heights (`< 52m`), letting bare dark basalt, red tuff, and ochre scree dominate upper cliffs and spires.

---

## 2. Reusable Sculpting Patterns

### A. Needle Spires & Fluted *Pari* Cathedral Ribs
Create vertical rock buttresses without blunting peaks into round cones:

```js
// N crisp radial ridge pleats (e.g. N = 12..16)
const rib = Math.pow(0.5 + 0.5 * Math.cos(14.0 * theta + 0.35 * Math.sin(3.0 * theta)), 2.2);
const ribEnv = smoothstep(0.14, 0.38, 1.0 - u) * smoothstep(0.94, 0.34, 1.0 - u);
const pleatRelief = (rib - 0.28) * 22.0 * ribEnv;

// Asymmetric monolithic spire (uses steep power exponent 1.6..2.4 instead of wide bell)
function basaltSpire(x, z, cx, cz, rx, rz, height, power = 1.9) {
  const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
  return height * Math.exp(-Math.pow(d, power));
}
```

### B. Walkable Trail Spine & Switchback Spur Carving
Guarantee BFS reachability (`slope <= 0.88`) from coastal bay to a bluff/spur Observation Circle *without* flattening nearby spires:

```js
function distToSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const wx = px - ax, wz = pz - az;
  const len2 = vx * vx + vz * vz || 1e-6;
  const t = clamp01((wx * vx + wz * vz) / len2);
  return { d: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
}

// Inside eval<Island>Point(x, z): carve a gently sloped ramp along path waypoints A -> B
const { d, t } = distToSegment2D(x, z, ax, az, bx, bz);
if (d < 8.5) {
  const rampH = lerp(startH, endH, smoothstep(0.0, 1.0, t));
  const mask = 1.0 - smoothstep(3.2, 8.5, d);
  h = lerp(h, rampH, mask * 0.92);
}
```
> Keep the trail blend width narrow (`3.2m` core, `8.5m` shoulder) so vertical spires just `12m–20m` away stay sheer and dramatic!

### C. Horseshoe Caldera Amphitheater with Open Sea Breach
```js
// Semicircular caldera rim wall open toward the +Z approach bay (theta = 0 in canonical before rotation)
const rimDist = Math.abs(Math.hypot(x + 8.0, z) - 34.0);
const rimArc = smoothstep(0.28, 0.78, Math.abs(theta));
const calderaWall = 84.0 * Math.exp(-Math.pow(rimDist / 11.5, 1.65)) * rimArc;
```

### D. Reefless Marquesan Surf Collars & Offshore Basalt Sea-Stacks
For steep reefless islands (`nuku_hiva`, `ua_pou`, `hiva_oa`, `fatu_hiva`, `kauai`):
- Omit wide sand barriers in front of sheer sea-cliffs; use thin white-water surf collars (`TorusGeometry` or asymmetric coastal foam hugging non-circular capes).
- Add 2–4 jagged basalt **sea-stacks** (`makeStoneRockGeometry` stretched vertically `scale(3.5, 11.0, 3.0)`) just offshore of cliff headlands (`y = -1.5m`) to break the waterline silhouette.

---

## 3. Target Volcanic Island Redesign Briefs

| Island | Builder & Archetype | Peak Target | Signature Geology & Playable Layout |
| :--- | :--- | :---: | :--- |
| **`maupiti`** | `IslandAct1RemainBuilder` (`fortress_crag`) | `85–105m` | **Mt Teurafaatiu** sheer vertical rectangular monolith centered over shallow turquoise motu lagoon & organic reef pass; circle on an accessible mid-cliff **panoramic shoulder terrace** (`h ~ 22–28m`) overlooking the lagoon, trail winding up from southern coral bay. |
| **`ua_pou`** | `IslandAct2Builder` (`volcanic_spire`) | `95–120m` | **6–7 vertical phonolite needle spires** (Oave, Pouakei) thrusting above emerald ridges & golden-ochre flanks; black-pebble landing cove & Vaea's Whale-Rib terrace connected along a coastal ridge bluff to an open-sky coastal promontory circle. |
| **`nuku_hiva`** | `IslandAct2Builder` (`high_volcanic`) | `85–105m` | Immense **Taiohae horseshoe caldera wall** framing reefless sea cliffs & deep turquoise bay + tall **Hakaui waterfall** pouring from notch cleft; Tohua plaza near bay shore, gently terraced ridge trail climbing west caldera spur to sea-view Observation Circle. |
| **`hiva_oa`** | `IslandAct2Builder` (`fortress_crag`) | `78–96m` | **Mt Temetiu** dark sawtooth wall, **oxidized red-tuff quarry wall** (`[0.52, 0.20, 0.11]`), sculpted red-tuff Tiki sanctuary on black-sand cove apron, coastal spur path up to seaward cliff terrace. |
| **`fatu_hiva`** | `IslandAct2Builder` (`high_volcanic`) | `88–112m` | **Hanavave Bay basalt sea-pillar towers** guarding a dark jungle amphitheater with **twin rainforest cascades**; slipway & shipwright shed at cove beach, terraced foreland overlook clear of cliff shadows (`>= 75%` open ocean arc). |
| **`mangareva`** | `IslandAct2Builder` (`twin_peaks`) | `68–84m` | Asymmetric knife-edged **Mt Duff tilted wedge** & Mt Mokoto rising inside an expansive turquoise *lapa* barrier reef & motu chain; gentle col trail or seaward headland plateau for Elder Rongo's Gateway Marae & Observation Circle. |
| **`kauai`** | `IslandAct3Builder` (`fortress_crag`) | `92–115m` | **14-pleat Na Pali cathedral razor-cliffs** (`pleatWave`) in mossy emerald & iron-red basalt gullies, crimson `'ohi'a` highlands, dramatic black-sand cove; terraced trail climbing **Pohaku's High Crag Pa** headland bluff (`>= 75%` ocean horizon). |
| **`oahu`** | `IslandAct3Builder` (`high_volcanic`) | `68–82m` | Sweeping scalloped **Ko'olau Pali vertical escarpment wall** rising steeply behind a wide golden-sand crescent lagoon & Koa/Miro forest flat; unobstructed headland plateau circle in front of the pali arc. |
| **`hawaii`** | `IslandAct3Builder` (`fortress_crag`) | `98–125m` | **Snow-crowned twin Mauna Loa / Mauna Kea shield peaks**, open glowing **Kilauea caldera lava pool** + braided glowing basalt rivers meeting surf steam; black-lava cove & elevated coastal heiau terrace with unobstructed star-dome visibility. |
| **`rapa_nui`** | `IslandRapaNuiBuilder` (`high_volcanic`) | `65–82m` | **Rano Raraku cinder tuff quarry amphitheater** + **Poike & Orongo sea-cliffs**, moai silhouettes, barren windswept golden-ochre lava downs (`canonicalScale: 1.0`, `gridHalfSpan >= 170+`), ocean cliff-edge Observation Circle. |
