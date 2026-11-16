# Game Design Document: *Kavenga: Songs of the Star Path* *(Working Title)*

## 1. Executive Summary & High Concept

*Kavenga: Songs of the Star Path* is a contemplative, atmospheric 3D wayfinding adventure in which the player steps into the role of a traditional Polynesian navigator. Across two interlocking phases—exploring, learning, trading, and provisioning ashore during the **Island Phase** (via **3D Walkable Islands** and **Point-of-Interest Hubs**), and sailing a double-hulled voyaging canoe across open water during the **Navigation Phase**—players cross a fictionalized Pacific Ocean inspired by authentic Polynesian history and place names, using zero maps, compasses, paper logs, or GPS.

Routes are preserved and taught orally through **baked-in navigation songs** paired with **stick-in-the-sand diagrams** drawn on the beach and **grounded 360° night-sky vigils** led by master navigators. Song lyrics encode celestial and environmental landmarks while musical meter mirrors the physical rhythm of ocean swells. Rather than testing reflexes, racing clocks, or rapid clicking, the game rewards calm observation, listening, and genuine environmental literacy—guiding the player from feeling completely lost on an endless sea to reading the sky and water at a glance.

| Attribute | Target Specification |
| :--- | :--- |
| **Genre** | Contemplative Exploration / Musical Wayfinding Simulation / Adventure |
| **Camera Perspectives** | **Navigation:** 1st-person **Deck View** from the aft navigator's bench (default) + toggleable 3D **3rd-Person Canoe View** (`V` / Eye icon) + 360° Free-Look, framed by 3D **Launch (`5.90s`)** and **Landfall (`2.15s`)** cinematics<br>**Island:** **3D Walkable Islands** (*Raʻiātea*, *Tahaʻa*, *Hawaiʻi*, *Rapa Nui*) with 3rd-person orbit camera & closeable **Island Hub** + classic **POI Hubs** on the remaining 12 campaign islands + overhead **Teaching Sand** + 360° **Star-Stone Vigil (*Ahu Fetiʻa*)** |
| **Player Avatar** | **4 difficulty-specific 3D Polynesian wayfinders** (`12–14 yr` Apprentice, `18–20 yr` Wayfinder, `30 yr` Navigator, `50 yr` gray-bearded Master Navigator) standing at the steering sweep in 3rd-person/launch views, hidden in 1st-person Deck View, and walked barefoot ashore |
| **Voyage Pacing** | **8–12 real-time minutes per voyage** at 1x speed (no abrupt time-skips); includes a heading-locked **Fast Forward (`2.75x`)** button that cuts voyage play time by **~60%** (~3–5 minutes) |
| **World Setting** | **Fictionalized 3-basin Pacific geography** (`16` campaign islands across Southern & Northern Hemispheres + `1` uncharted secret monolith island, **Rapa Nui**) populated with **authentic Polynesian island names, terminology, and cultural traditions** |
| **Memory & Diegesis** | Oral songs + **marks drawn on wet sand with a stick** (revisitable via an at-sea **Recall** memory flash on *Easy*, *Medium*, and *Hard*; strictly **no paper journals or written logs**) |

---

## 2. Core Design Pillars

1. **From Mystery to Mastery:** Early on, the sky and sea feel vast and inscrutable. Every mechanic builds *player knowledge* rather than character stats, steadily transforming *"I have no idea where I am"* into *"I know my exact bearing from that cloud, those terns, and the Bull's Horn rising."*
2. **Music & Sand Are the Map:** In an oral culture without paper charts, navigation lives in voice, rhythm, and ephemeral marks sketched in beach sand. Songs and sand lessons directly encode star sequences, daytime wildlife cues, and swell frequencies.
3. **Unhurried Presence & Respect for Player Time:** Sailing is calm and deliberate—zero rapid clicking or twitch timing. At any moment, the player can lock steering trim to look freely around the horizon and sky, or engage **Fast Forward** to accelerate steady legs without skipping the visible movement of stars and waves.
4. **Accessible Authenticity:** Grounded in real Polynesian wayfinding (*kavenga* star paths, celestial rotation, *lapa* cloud reflections, homing seabirds, refracted swells, beach stick-drawings), distilled into readable game systems—such as simplified **Animal Constellations**—so astronomy enhances play rather than overwhelming it.

---

## 3. Core Gameplay Loop

The game alternates between focused preparation at coastal island hubs and open-ocean execution at sea.

```mermaid
flowchart LR
    subgraph Island["Island Phase (POI Hubs Ashore)"]
        A["Visit Village & Beach POIs"] --> B["Fulfill Quests & Trade Inventory"]
        B --> C["Study Sand Marks & Songs with Master"]
        C --> D["Provision Food, Crew & Maintain Canoe"]
    end

    subgraph Sea["Navigation Phase (Open Ocean - 8 to 12 min at 1x)"]
        E["Choose Departure Time & Set Sail"] --> F["Observe Cues, Recall Sand Marks & Listen"]
        F --> G["Lock Canoe Heading (Optional Fast Forward)"]
        G --> H{"Followed Route Cues?"}
    end

    D --> E
    H -- "Yes: Landfall Sighted" --> I["Arrive at Target Island (Autosave)"]
    I --> A
    H -- "No: Off-Course / Rations Depleted" --> J["Lost at Sea"]
    J -- "Restore Pre-Voyage Save" --> D
```

> [!IMPORTANT]
> **Forgiving Failure State ("Lost at Sea"):** Straying irreversibly off course or exhausting provisions never punishes the player with tedious backtracking or permanent loss. When the canoe becomes lost in empty water, the screen gently fades into sea mist and offers an immediate **Restore Before Voyage** option—returning the player to the departure island before launch so they can re-watch the Master's sand drawings, re-listen to the chant, adjust provisions, or pick the proper departure hour.

---

## 4. Phase I: The Island Phase (3D Walkable Islands & Point-of-Interest Hubs)

The Island Phase combines **human-scale 3D Walkable Islands** on four signature shores (**Raʻiātea**, **Tahaʻa**, **Hawaiʻi**, and secret **Rapa Nui**) with curated **Point-of-Interest (POI) Hubs** across the remaining 12 campaign islands, unified by full-body character portraits (`15` mentors and `3` recruitable crewmates) and shared quest/provisioning mechanics.

### 4.1 Island POI Structure & Hybrid Walkable Experience
Depending on whether an island is a major settlement or an uninhabited resource/monolith shore, players visit 2–4 distinct POIs:
1. **The Canoe Landing (*Hālau* / Beach):** Manage canoe maintenance, load food/water rations, inspect crew and lashed cargo, select departure tide-light, and launch into the Navigation Phase.
2. **The Provisioning & Craftsmen's Hut *(Walkable Islands)*:** Thatched *fare*, royal *hālau waʻa* canoe shed, or uninhabited boat-shaped *hare paenga* stone shelter where players refill woven ration baskets, careen/mend hulls, and speak with boatbuilders or forage wild coconuts and spring water.
3. **The Navigator's Shore / Observation Circle (Teaching Sand & Sky Vigil):** Coastal stone ring or beach shore where players study **stick-in-the-sand diagrams**, rehearse **Route Songs**, or enter the grounded 360° **Star-Stone Vigil (*Ahu Fetiʻa*)**.
4. **The Village, *Marae*, *Heiau*, or Stone *Ahu* (Sanctuary / Wild Outpost):** Speak with island elders, artisans, and fishers (or stand before uninhabited ancestral *Moai* and rookeries); complete inter-island delivery/harvest quests; recruit specialist crew members.

#### 3D Walkable Islands & Closeable Hub Integration (`Raʻiātea`, `Tahaʻa`, `Hawaiʻi`, `Rapa Nui`)
On walkable islands, arriving ashore places your difficulty-specific 3D character barefoot on the sand **right beside the moored double-hulled canoe**:
* **Controls & Camera:** Players walk freely across sculpted volcanic beaches, footpaths, hilltop knolls, and ceremonial terraces using **Arrow Keys** (or `WASD`, `Shift` for a brisk stride), while orbiting/zooming the 3rd-person view via pointer drag, `Q` / `E`, or scroll wheel.
* **Diegetic 3D POIs & Contextual Popups:** Points of interest are physically built on the island surface—such as Elder Metua at *Marae Taputapuātea* (Raʻiātea), Hina & young Fisher Tama at Hillside Hearth (Tahaʻa), the white-*kapa* *Anuʻu* Oracle Tower & glowing Kīlauea lava flank (Hawaiʻi), and the 5-Moai *Ahu Tongariki* platform & *Te Pito Kura* stone ring (Rapa Nui). Walking into a POI's coral-stone ring slides up an on-screen action popup without blocking Arrow-Key movement.
* **Top-Left "Island" Hub Button:** At the top left of every walkable island, clicking the **Island** button (bearing the island's name) opens the standard **Island Hub** over the live 3D scene with two special behaviors:
  1. **Closeable Overlay:** Closing the hub (`✕ Close Hub & Walk`, `Esc`, or backdrop click) returns immediately to live Arrow-Key walking from your current spot.
  2. **Instant Character Move:** Clicking any location tab inside the hub (`🛶`, `🛖`, `🐚`, `🌺` / `🗿`) immediately moves your 3D character and camera to that POI on the island.

### 4.2 Stick-in-the-Sand Teaching & The Star-Stone Vigil (*Ahu Fetiʻa*)
True to Polynesian history—where wayfinding was passed down without paper or ink—there is **no written journal or notebook UI** anywhere in the game.
* **Interactive Sand Lessons (`16` Shore Diagrams):** When a Master teaches a navigation concept or breaks down a route song at the Navigator's Shore or Observation Circle, an overhead sand canvas animates a wooden stick (accented with coral pebbles, shells, and palm ribs) carving grooves in damp beach sand:
  * *Star Horizon Rings:* Twelve shells/pebbles placed around a central twin-canoe mark to illustrate rising and setting horizon houses and the star paths connecting them.
  * *Constellation Sketches:* Stick-drawn outlines of Animal Constellations pointing out exact target stars (*Bull's Horn*, *Rat's Nose*).
  * *Daytime & Swell Diagrams:* Stick grooves showing how deep swells bend around an island, how crossbeam post shadows track morning sun, or how white terns radiate outward at dawn and return at dusk.
* **The Star-Stone Vigil (*Ahu Fetiʻa* — Grounded 360° Night-Sky Observatory):** From any island's Navigator's Shore or Observation Circle, players can step into a motionless coastal ring of 12 carved horizon stones lit by warm braziers to study the live 3D rotating night sky without hull pitch or ration pressure:
  * **Dual-Hemisphere Star Masters:** Guided interactive chapters with **First Master Teraʻi** on Maupiti (*Realm of the Sea Turtle's Pivot* — Southern Hemisphere sky) and **Keeper Akura** on Kiritimati (*Realm of the Steadfast Peg* — Northern Hemisphere sky).
  * **Constellation Atlas & Optional Eye Trial:** Scrub night hours freely, switch between any of the 16 campaign island latitudes to watch polar stars rise or dip beneath the sea, inspect all 10 Animal Constellations, or test naked-eye star memory in optional sighting trials.
* **Rehearsal Ashore:** While on an island, the player can redraw any learned sand mark or review any unlocked route verse as many times as needed before setting sail.

### 4.3 Quests, Inventory & Persuasion
To earn a Master Navigator's trust and unlock coveted route songs, players undertake lightweight quests tied to a **Canoe Inventory**:
* **Examples:** Bringing volcanic obsidian adze blanks from **Hiva Oa** to a master canoe-builder on **Rangiroa**; retrieving ceremonial red feathers from the uninhabited cliffs of **Manuae**; or delivering medicinal *kava* root across the lagoon from **Tahaʻa** to **Huahine**.

### 4.4 Provisioning & Voyage Readiness
At the Canoe Landing POI, the player prepares their double-hulled canoe (*vaka moana* / *waʻa kaulua*):

| Readiness Factor | Gameplay Function | Trade-off / Strategic Choice |
| :--- | :--- | :--- |
| **Food & Water** | Consumed steadily over voyage time based on crew count; determines safe endurance before exhaustion triggers "Lost at Sea." | Rations share limited **Deck Cargo Slots** with quest items on smaller early-game canoes. |
| **Crew Members** | 2–4 companions (e.g., *Sail-Tender* to reduce wind drift, *Hull-Wright* to slow sea wear, *Fisher* to replenish food when passing tuna schools). | Extra crew add helpful passive traits on long crossings, but increase food/water burn. |
| **Canoe Maintenance** | Condition of **Twin Hulls**, **Pandanus Sail**, and **Sennit Lashings**. Repaired at the Canoe Landing using gathered/traded materials. | Neglected maintenance causes gradual heading drift or faster wear in rough squalls. |
| **Departure Window** | Player launches at **Dawn**, **Midday**, **Dusk**, or **Midnight**. | Crucial alignment with Verse 1 of the route song (e.g., a dusk bird-homing route requires departing before sunset). |

---

## 5. Phase II: The Navigation Phase

### 5.1 Camera Perspectives, Player Character, Cinematics & Continuous Time Flow ("Fast Forward")
* **First-Person Deck View *(Default)* & Toggleable Third-Person Canoe View:**
  * **Deck View (1st-Person, Default):** Positioned at the aft navigator's bench (`baseEyePos`), framing **~22%** twin *manu* prows, forward crossbeam (*iako*) lashings, central sighting post (*pou*), and ocean swell at the bottom of the screen against **~78%** open horizon and sky dome (`0°–42°` altitude). In 1st-person Deck View, the player's own 3D body mesh is hidden so nothing obstructs deck-shadow or horizon sightings.
  * **Canoe View (3rd-Person Toggle via `V` or HUD Eye Button):** Smoothly pulls back behind and slightly above the twin sterns, rendering the full double-hulled canoe, billowing crab-claw sail(s), wake leeway trail, crew, and **your difficulty-specific 3D Polynesian player character** standing at the aft helm tending the *hoe uli* steering sweep.
* **Departure & Landfall 3D Cinematics:**
  * **Canoe Launch Sequence (`5.90s`):** Pushing off from any island begins with your 3D character already standing in position at the canoe's helm. Over `5.90` seconds (paced deliberately at half speed), a 3-stage camera sweeps from a high bird's-eye overview of the departing island and reef pass down into a ~2-second hero framing directly behind your character on deck, then glides forward and cross-fades cleanly into 1st-person Deck View.
  * **Landfall Arrival Sequence (`2.15s`):** Entering Ring 4 aligns the twin prows toward the destination shore, damps open-sea swells into lagoon calm, and pulls the camera gently back and upward (revealing your character at the helm) as the canoe glides up to the island's reef edge.
* **Diegetic Trim-Lock Steering:** Adjusting the steering sweep sets a **tied-off paddle angle** holding the canoe's trim relative to wind and swell. Steering is 100% visual—aligning the twin prows, rigging, or stern directly against sky and sea cues with **zero HUD heading readout, degree number, or compass indicator**—requiring no constant clicking once aligned.
* **360° Free-Look Observation:** At any time, players can pan freely around the entire horizon (including **back-sighting** stars directly behind the stern), tilt straight up to the masthead zenith, or inspect wave angles against the hulls, then snap smoothly back to steering.
* **Voyage Duration & The "Fast Forward" (`2.75x`) Button:**
  * **Standard Duration (1x Speed):** A full voyage takes **8–12 minutes** of real time (with brief ~3.5–6 minute introductory hops in early Act I), flowing continuously through day and night **without fade-to-black time-skipping**.
  * **Fast Forward Mode (`2.75x`):** Pressing `F` or toggling **Fast Wind** accelerates world time at `2.75x` while **keeping the canoe locked on its current heading** (automatically easing back to `1x` on verse changes, island detection rings, or fish schools). Stars visibly wheel faster across the sky dome, clouds march downwind, and waves roll smoothly past.
  * **Time Savings:** Using Fast Forward during steady legs once aligned cuts total voyage playtime by **~60%** (bringing an 8–12 minute voyage down to **~3–5 minutes**), while keeping the player actively watching the sky and horizon for the next transition cue.
  * **Audio Handling in Fast Forward:** Rather than pitch-warping the sung chant, engaging Fast Forward smoothly crossfades vocals into rushing wind, wake, and a gentle rhythmic pulse, seamlessly restoring the song when returning to normal 1x speed.

---

### 5.2 Nighttime Navigation: The 3D Sky Dome & *Kavenga* (Star Paths)

#### 5.2.1 Dual-Hemisphere Celestial Sphere Geometry & Rotation
* **True Rotating Sky Sphere:** Surrounding the ocean is a seamless 3D celestial sphere rotating continuously from rising horizon to setting horizon (`15° per in-game hour`). Across a 12-hour night (~4–6 real-time minutes at 1x speed, or ~1.5–2 minutes in Fast Forward), the night sky rotates `180°` smoothly overhead.
* **Per-Island & Voyage-Interpolated Dual-Hemisphere Latitudes:** Rather than using a single static sky tilt for the entire ocean, every island carries an authentic tropical latitude and inter-basin voyages interpolate latitude smoothly as the canoe sails:
  * **Southern Hemisphere Skies (`-17.8°` to `-8.6°` in Acts I & II; `-27.1°` at Secret Rapa Nui):** Above the southern polar pivot, **The Sea Turtle** (*Shell Crown*) wheels in tight circumpolar circles above the waves while **The Frigatebird** (*Tail -> Beak*) dives straight toward that invisible pivot. Opposite it, the northern pole star (**Steadfast Peg**) lies hidden beneath the curve of the sea, and *Horse's Crown* skims a shallow low arc just above the foam.
  * **Equatorial Crossing & Northern Hemisphere Skies (`+19.8°` to `+22.4°` in Act III's Hawaiʻi Mist Chain):** During Song 13 (*Mangareva -> Kauaʻi*), the canoe crosses the equator—watching *The Sea Turtle* drown behind the wake while the motionless northern pole star **Steadfast Peg** (*Hōkūpaʻa*, `89.2°N` declination) lifts `~20°–22°` above the northern horizon and *The Horse* becomes circumpolar all night.
  * Between the two poles, all other stars travel along **parallel circular tracks (Declination Bands)**—breaking out of the sea at fixed horizon "houses" on the rising side, arcing overhead, and sinking into the mirror-image houses on the setting side.

#### 5.2.2 What a *Kavenga* Looks Like on the Sky Dome
A **Star Path (*Kavenga*)** is not a single star—it is a **relay chain of 3 to 4 named Animal Stars riding the exact same circular track across the sky dome**, spaced `~36°` apart in Right Ascension (`~2.4` in-game hours) along the nocturnal star-train so each successor star rises just as its predecessor climbs above the `30°` steering window (with each route anchored to a seasonal solar phase aligned to its recommended Departure Window):

```mermaid
flowchart LR
    subgraph Dome["One Declination Band Across the 3D Sky Dome (Rising to Setting)"]
        H1["Rising Horizon House (Breaks the Sea)"] --> W1["Low Steering Window (0 to 30 deg: 'Three Hands High')"]
        W1 --> Z["High Sky (>30 deg: Climbs Out of Sightline & Shifts Bearing)"]
        Z --> W2["Setting Steering Window (30 down to 0 deg: Descending)"]
        W2 --> H2["Setting Horizon House (Sinks Into Sea)"]
    end
```

1. **The "Three-Hands" Steering Window (`0°–30°` Altitude):**
   * From the default camera behind the canoe, the horizon sits roughly a quarter of the way up the screen and the upper edge of the frame reaches `~42°` sky altitude.
   * Any star between **the waterline and `~30°` elevation ("three hands high" above the sea)** appears **simultaneously in frame with the canoe's twin prows**, maintaining a steady horizon bearing. To steer, the player simply keeps that low star visually centered between the twin hulls (or aligned over a designated hull/spar).
2. **Why Stars Must Hand Off (Rising vs. Setting Paths):**
   * **Following Rising Stars:** The player aligns the twin prows on Star 1 (*e.g., Bull's Horn*) as it rises out of the sea. Over the next ~2–3 in-game hours, *Bull's Horn* climbs past "three hands high" (`>30°`): on tilted tracks it begins curving sideways in bearing, and visually it rises away from the prows toward the top of the frame. At that exact moment, **Star 2** on the same band (*Rat's Nose*) breaks the horizon in the **exact same Rising House right beneath it**. The navigator drops their gaze from the climbing star to the newly risen star and holds course seamlessly.
   * **Following Setting Stars:** When steering toward the setting side of the sky, stars run in reverse: the navigator tracks Star 1 as it *descends* toward the waves. Just before it sinks into the sea mist and vanishes, **Star 2** on the same track drops below three hands high directly above that same spot on the horizon, taking over the watch.
   * **Back-Sighting (Stern Stars):** Every Rising House lies directly opposite (`180°` across the water from) a Setting House. If storm clouds blot out the forward horizon, the player uses **360° Free-Look** to look straight back over the steering paddle and center the opposite house's star behind the stern.

#### 5.2.3 The 12-Shell Horizon Ring & 10 Animal Constellations
Traditionally called a "Star Compass" by scholars, this system is **not a physical or HUD compass**—it is a **mental and sand-drawn ring of 12 Horizon Cue Houses** formed by **5 parallel Rising/Setting Star Paths** plus the **2 Polar Pivots**, populated by **10 Animal Constellations**.

*(Note: Degree angles in the developer column below are **strictly internal 3D engine math** for placing stars on the sky sphere; players, songs, and sand lessons refer to directions exclusively by **Cue House Names**, never degrees or `N/E/S/W` labels.)*

| Star Path Band | Player-Facing Cue House Names *(Rising / Setting)* | *Kavenga* Relay / Pivot Stars *(34 Total Navigation Stars Across 10 Animal Constellations)* | Internal Engine Azimuths *(Hidden From Player)* |
| :--- | :--- | :--- | :--- |
| **Northern Pivot** | *House of the Grazing Horse* | **Steadfast Peg** *(motionless northern pole star in Act III; below horizon in Acts I–II)* + *Horse's Crown* *(skims low in Acts I–II; circumpolar in Act III)* | `0°` |
| **Band 1** | *Rising / Setting Path of the Horse* | *Horse's Mane* -> *Horse's Tail* -> *Boar's Bristle* -> *Crab's Right Claw* | `30°` / `330°` |
| **Band 2** | *Rising / Setting Path of the Boar* | *Gecko's Tongue* -> *Horse's Heart* -> *Boar's Tusk* -> *Crab's Left Claw* | `60°` / `300°` |
| **Band 3** | *Rising / Setting Path of the Bull* *(Sun Path)* | *Bull's Horn* -> *Rat's Nose* -> *Shark's Jaw* -> *Crab's Eye* | `90°` / `270°` |
| **Band 4** | *Rising / Setting Path of the Shark* | *Bull's Hoof* -> *Rat's Tail* -> *Shark's Fin* -> *Gecko's Tail* | `120°` / `240°` |
| **Band 5** | *Rising / Setting Path of the Whale* | *Whale's Spout* -> *Whale's Fluke* -> *Shark's Tail* -> *Bird's Wingtip* | `150°` / `210°` |
| **Southern Pivot** | *House of the Sea Turtle's Pivot* | **The Sea Turtle** (*Shell Crown* tightly orbits pivot in Acts I–II; below horizon in Act III) + **The Frigatebird** (*Tail -> Beak* points down to pivot) | `180°` |

> [!TIP]
> **Cross-Band Constellation Geometry (How Master Navigators Read Raw Stars):** Large constellations intentionally span adjacent bands—for example, **The Bull** has its bright amber *Bull's Horn* on **Band 3** and its *Bull's Hoof* on **Band 4**, **The Shark** stretches diagonally across Bands 3, 4, and 5 (*Jaw -> Fin -> Tail*), and **The Gecko** bridges Band 2 (*Gecko's Tongue*) to Band 4 (*Gecko's Tail*) with **Gecko's Heart** (`-12°` declination) passing `90°` straight through the overhead zenith above the masthead. Even with zero UI lines in *Master Navigator* mode, spotting one familiar animal silhouette lets the player visually deduce neighboring star paths and distinguish rising vs. setting sides by watching which way the stars wheel!

#### 5.2.4 Visual Presentation on the Sky Dome (By Mode)
To keep the night ocean diegetic and ensure the player always deduces heading from the sky itself:
1. **Natural Starlight Layer *(Always Visible in All Modes)*:**
   * **Magnitude Hierarchy:** `34` bright, unmistakable Primary Navigation Stars across `10` compact Animal Constellations (each segment spanning `< 34°` of sky arc, with subtle natural warmth/coolness—amber *Bull's Horn*, icy blue-white *Shark's Fin*, golden *Shell Crown*, pale gold *Steadfast Peg*) set against ~400 faint ambient stars that convey the sweeping rotation of the dome.
   * **The Milky Way (*Te Mangōroa*):** A soft, luminous celestial band arching near *The Shark* and *The Frigatebird*, offering natural macro-orientation at a glance.
   * **Horizon Extinction & Volumetric Cloud Occlusion:** Stars near the waterline softly pulse through horizon mist as they rise or set, while sculpted 3D cumulus clouds physically occlude stars and sky labels passing behind them.
2. **Constellation & Star Name Annotations *(Easy, Medium, Hard — Hidden in Master Navigator)*:**
   * **Animal Outlines & Names Only (Zero Horizon Compass Ticks):** Soft, chalky starlight strokes connect the stars of each Animal Constellation alongside clean star name labels (*"Bull's Horn"*, *"Rat's Nose"*). The horizon itself **never** displays `N/E/S/W` letters, degree ticks, or heading markers.
   * **Active Star Highlight *(Easy Mode Only)*:** In **Easy** mode, the target star named in the current verse (and its successor star rising/setting along the same path) softly shimmers in the sky—helping beginners spot the right star while still requiring them to look around the dome, find it, and steer the canoe to meet it.
3. **Static Sand-Ring Diagram *(Via "Recall" Button in Easy, Medium, Hard)*:**
   * Pressing **Recall** displays the static beach-sand diagram of the 12 shells and 5 parallel grooves taught ashore, reminding the player *which* animal stars share a path without ever indicating which direction the canoe is currently pointing.

---

### 5.3 Daytime & Ocean-Surface Navigation Cues

When sunrise washes out the stars—or when Act III clouds and sea fog hide the heavens altogether—the navigator relies on five interlocking daytime and ocean-surface systems, all readable directly from the 3D world and canoe deck with zero UI gauges.

#### 5.3.1 Solar Orientation & Crossbeam (*Iako*) Shadow Craft
1. **Dawn & Dusk Horizon Window (`0°–30°` Sun Altitude):**
   * The sun rises and sets along **Band 3 (*Path of the Bull*)**, casting a crisp golden glitter path across the waves toward the canoe. During the first and last ~2.5 in-game hours of daylight, the sun sits inside the forward camera frame and works just like a low horizon star.
2. **Mid-Morning & Afternoon (*Iako* Deck Shadows, `30°–75°` Altitude):**
   * Once the sun climbs out of the forward horizon sightline, squinting upward is imprecise. Instead, the **central mast-step / sighting post (*pou*)** casts a sharp, dark shadow across **symmetrical sennit-lashing bands** bound along the forward crossbeam (*iako*) and central deck platform (*pola*) at the bottom-center of the screen.
   * Before the morning sun climbs past three hands high, the player notes which lashing band the shadow touches while holding true course, then maintains that shadow alignment (accounting for its slow, predictable creep) through mid-morning and afternoon.
3. **Bridging the High-Noon Zenith (~1 In-Game Hour):**
   * Near solar noon, the post's shadow shrinks directly beneath its base and loses directional leverage. Navigators bridge this brief midday window by locking trim against **drifting trade-wind clouds** or **ocean swells** until the afternoon shadow lengthens cleanly on the opposite side of the deck.

#### 5.3.2 Cloud Craft (*Ao*) & Lagoon Reflection (*Lapa*)
Volumetric 3D sculpted clouds distinguish ordinary weather from island-born clouds through motion, silhouette, and underside color:
* **Drifting Trade Clouds (*Directional Grain*):** Six distinct sculpted cumulus variants arranged in parallel "cloud streets" marching steadily downwind (with randomized variant, yaw, and scale remixing whenever a cloud wraps past the horizon). Tapping **Fast Forward** makes this sky-wide river of motion unmistakable, giving a reliable daytime reference axis.
* **Stationary Peak Clouds (*High Volcanic Islands*):** While surrounding trade clouds drift across the horizon, a single tall, dome- or anvil-topped cloud cap remains **pinned over one fixed spot** above an unseen mountain peak (such as *Moʻorea* or *Nuku Hiva*), anchored by a faint vertical mist-curtain beneath its base.
* **Lagoon Underside Glow (*Lapa — Low Coral Atolls*):** Open-ocean clouds have cool slate-grey or lavender undersides reflecting deep water. A cloud hovering over a shallow coral lagoon (like *Manuae*, *Rangiroa*, or *Kiritimati*) displays a luminous **pale turquoise-jade glow painted across its flat belly**, visible long before low palm trees break the horizon.

#### 5.3.3 Homing Seabirds & Surface Marine Trails
* **Land-Roosting Seabirds (*White Terns & Boobies*):** Unlike solitary open-ocean gliders, island-roosting terns and boobies fly in **purposeful, straight-line groups of 2–5 birds** at masthead height (`~5°–15°`), announced by crisp stereo calls left, right, or astern:
  * **Dawn / Early Morning:** Fly briskly *outward* from their roosting island to hunt -> **steer directly opposite their flight line** to reach land.
  * **Late Afternoon / Dusk:** Fly steadily *homeward* into the twilight -> **follow their tail feathers** straight to shore.
  * **Midday Nuance:** Wheel and dive in tight circles over baitfish -> signals a **surface fish school** (sailing through with a *Fisher* crew member aboard restores +1 food ration), *not* a directional line to land.
* **Leeward Surface Drift:** Downwind of an island, ocean wakes carry ribbons of golden reef-kelp, floating green coconut fronds, and pumice pebbles—confirming land lies directly upwind even in dense mist.

#### 5.3.4 Deep-Ocean Swells: Twin-Hull Physics, Stereo Audio & 4-Beat Coupling
To keep waves visually readable rather than chaotic, the 3D water surface separates **fine local wind ripples (chop)** from **Primary Deep Swells**—long, glassy, wide-spaced ocean ridges rolling endlessly along a constant axis (joined in Act III by shorter secondary **Cross-Swells**).

Because the twin hulls and crossbeams sit permanently at the bottom-center of the screen, the canoe itself behaves as a physical wave-reading instrument with **four unmistakable motion and stereo-audio signatures**:

```mermaid
flowchart TD
    S["Incoming Primary Ocean Swell"] --> A1["Head-On: Symmetric Bow Seesaw + Fast Beat (~2.5 to 3 beats)"]
    S --> A2["Quartering Cheek: Diagonal Corkscrew Lift + Locked 4-Beat Drum Sync"]
    S --> A3["Beam-On: Side-to-Side Deck Roll + Broadside Slap"]
    S --> A4["Following Stern: Long Surfing Surge + Slow Beat (~5.5 to 7 beats)"]
```

| Canoe Angle to Incoming Swell | 3D Twin-Hull Visual Signature | Spatial Audio Signature | Encounter Rhythm *(vs. 4-Beat Song)* |
| :--- | :--- | :--- | :--- |
| **Head-On**<br>*(Directly Into Swell)* | **Symmetric Pitch (Seesaw):** Both prows lift together toward the sky, throw twin bow spray, and dip together into the trough with zero roll. | Simultaneous twin-bow *whoosh-slap* centered equally in both ears. | **Too Fast (`~2.5–3 beats`):** Hulls charge into waves, cresting *ahead* of the *pahu* drum. |
| **Quartering "Cheek"**<br>*(~45° Port or Starboard Bow — Standard Song Trim)* | **Diagonal Corkscrew ("Cheek Lift"):** For a *starboard-cheek* swell, the right prow lifts first, followed half a second later by the left prow as the crest rolls diagonally under the crossbeams. | Crisp **Right-to-Left** (or Left-to-Right) stereo cascade + warm lashing creak. | **Locked (`Exact 4 Beats`):** Leading prow crests in unison with **Beat 1** of the *pahu* gourd drum! |
| **Beam-On**<br>*(Sideways to Swell)* | **Pure Side-to-Side Roll:** Deck tilts left-and-right like a metronome; mast tip sweeps sideways against sky/clouds; prows do not pitch. | Broad, flat *thump* against one outer hull wall. | **Wrong Motion:** Even near tempo, sideways rolling without bow lift reveals a perpendicular heading error. |
| **Following / Stern**<br>*(Running With Swell)* | **Long Surfing Surge:** Stern lifts first, pressing twin prows slightly down as the canoe glides forward down the wave face. | Soft, hissing wake surge swelling from behind the camera forward. | **Too Slow (`~5.5–7 beats`):** Waves overtake the canoe slowly, lagging behind the 4-beat pulse. |

#### 5.3.5 Island Swell Refraction, Reflection & Wave Shadows
In Act III's overcast nights and daytime fog, unseen islands betray their presence by disrupting the Primary Swell—matching the **rock-and-groove sand diagram** taught by **Swell Master Pōhaku** on *Kauaʻi*:
1. **Leeward Diamond Lattice (*Refraction*):** Swells bending around both flanks of an island cross in its lee, forming a visible **crisscross diamond wave pattern** on the water and imparting a distinctive *double-bob* shimmer to the twin hulls.
2. **Windward Pyramid Peaks (*Reflection*):** Faint counter-swells bouncing back off steep island cliffs collide with incoming swells to form sharp, white-tipped **pyramid crests** in open water.
3. **The Wave Shadow (*Calm Lee*):** Directly behind an island sheltering the sea, the deep rolling swell abruptly flattens—telling a practiced navigator that land lies immediately upswell through the fog.

### 5.4 Sailing HUD & UX: Strict "No Compass / No Absolute Heading" Rule

> [!WARNING]
> **Inviolable UX Rule — Zero Absolute Heading Indicators:** Across **all** difficulty levels (including *Easy*), the sailing HUD must **never** include a compass rose, rotating heading tape, cardinal letters (`N / S / E / W`), degree numbers, minimap, or "current heading" arrow. Deducing orientation exclusively from stars, sun, shadows, clouds, birds, and swells is the foundational gameplay of *Kavenga*.

* **On-Screen Controls Only:** Subtle, non-directional corner icons for **Free-Look**, **Fast Forward**, and—on *Easy*, *Medium*, and *Hard*—the **Recall** button (plus on-screen song lyrics/cue translations in *Easy* and *Medium*).
* **Static Nature of "Recall":** Pressing **Recall** opens a fixed, sand-textured memory vignette showing the **exact static stick-marks on beach sand** as drawn by the Master ashore. It **never** rotates dynamically with the canoe or camera, never highlights where the player is currently facing, and never points toward the destination—the player must always cross-reference that mental sand diagram against the live 3D sky and sea.

---

### 5.5 Course-Tolerance, Drift & "Lost at Sea" Mechanics

Without a compass or GPS, requiring pinpoint `±1°` accuracy across an 8–12 minute crossing would feel punishing and artificial. Instead, *Kavenga* models the authentic Polynesian concept of **Expanded Target Screens**—where long-range star or swell navigation brings the canoe into a wide outer detection zone, and local island cues guide the final approach onto the beach.

#### 5.5.1 Continuous Ocean Plane & Concentric Island Screens
Under the hood, each ocean region is simulated on a continuous, wall-less 2D `(X, Z)` coordinate plane (wandering into a neighboring island's screen in a dense archipelago genuinely lets you discover and land on that island!). Every island is surrounded by **four concentric, diegetic detection rings**:

```mermaid
flowchart LR
    C["Deep-Ocean Crossing (±12 to ±15 deg Corridor)"] --> R1["Ring 1: Homing Bird Screen (~35% of Hop Distance)"]
    R1 --> R2["Ring 2: Peak Cloud / Lapa Glow Screen (~25% of Hop Distance)"]
    R2 --> R3["Ring 3: Swell Refraction & Drift Screen (~15% of Hop Distance)"]
    R3 --> R4["Ring 4: Visual Island & Reef Arrival (~6% of Hop Distance)"]
```

| Detection Ring | Radius *(Relative to Standard Hop)* | Cues Triggered Inside Ring | Gameplay Purpose |
| :--- | :--- | :--- | :--- |
| **Ring 1: Biological Screen** | `~35%` of route length | Radial dawn/dusk **white terns & boobies** cross near the canoe. | Widest safety net: rewards holding within `±15°` (half a Star House) across open water. |
| **Ring 2: Cloud Screen** | `~25%` of route length | **Stationary Peak Cloud** (high island) or **pale green *Lapa* cloud belly** (coral atoll) becomes visible on the horizon. | Visual beacon confirming the island's exact bearing well before land rises above the sea curve. |
| **Ring 3: Swell & Drift Screen** | `~15%` of route length | **Diamond swell refraction**, **cliff reflections**, **wave shadow**, and **leeward kelp/frond trails** appear. | Crucial in Act III sea fog or moonless overcast when neither birds nor clouds can be seen. |
| **Ring 4: Landfall Trigger** | `~6%` of route length | 3D island silhouette rises clearly; reef surf sounds; triggers **Arrival Sequence** & autosave. | Graceful completion transition into the target island's POI Hub. |

#### 5.5.2 Heading Tolerance & Transition Grace Windows
* **Generous Deep-Water Capture Cone (`±12° to ±15°`):** Because the 12 Horizon Cue Houses sit `30°` apart (`±15°` half-width), keeping a target star roughly framed near the twin prows—or keeping hull motion roughly in sync with the 4-beat swell—reliably delivers the canoe into **Ring 1 & Ring 2**, where local cues naturally funnel the player home.
* **Unhurried Star-Handoff & Leg-Pivot Grace (`~45–90s` at 1x Speed):** As a star climbs above three hands high (`>30°`), its horizontal bearing shifts gradually (`~3°–6°` per in-game hour), never snapping abruptly. Taking a full minute in Free-Look to study the sky, press **Recall**, or listen to a verse change costs virtually zero corridor margin.
* **Fast-Forward Safety Behavior:** Because Fast Forward runs at a controlled `~2.5x–3x` speed (not an instant warp), players always have `15–30` real-time seconds to spot a climbing star or twilight shift. When song audio is active (*Easy*, *Medium*, *Hard*), starting a **new song verse** automatically eases Fast Forward back to `1x` speed so the player never misses a leg transition (optional setting for veterans).

#### 5.5.3 Wind Leeway & Canoe Condition Drift
To keep Trim-Lock meditative while making island preparation meaningful, drift follows clear diegetic rules:
* **Well-Maintained Canoe (`>= 70%` Condition):** Once Trim-Lock is set, unintended steering creep is **`0°/min`**—the paddle holds steady relative to the water.
* **Crosswind Leeway *(Sideways Slip)*:** Strong beam winds push the canoe `~3°–5°` sideways downwind even while the prows face a star. Players can spot leeway diegetically by looking astern in Free-Look: in a crosswind, the **foamy wake trail angles slightly off-center** behind the twin sterns (halved by bringing a *Sail-Tender* crew member, or compensated by aiming half a prow upwind of the target star).
* **Neglected Maintenance (`< 50%` Lashings / Sail / Hulls) or Squalls:** Frayed sails and loose sennit cordage introduce a slow, audible weathercocking creep (`~2°–3° per real-time minute`) accompanied by louder lashing creaks and fluttering sail edges—encouraging hull repairs ashore before multi-leg crossings without ever demanding rapid clicking.

#### 5.5.4 Exact "Lost at Sea" Triggers & Cue-Relative Debrief
A voyage ends in **Lost at Sea** under two transparent conditions—never invisible corridor walls:
1. **Ration Exhaustion (`Food & Water == 0`):**
   * Woven food baskets and water gourds stacked visibly on the canoe's central deck (*pola*) dwindle over the voyage.
   * *Early Diegetic Warning (`~15%` remaining):* Deck baskets sit nearly bare, crew posture droops, and ocean wind shifts to a sparse nose-flute motif—giving a player already inside Ring 1 or Ring 2 enough buffer to complete landfall.
   * *Depletion (`0%`):* Sea mist gently envelops the canoe and presents **Restore Before Voyage**.
2. **Empty-Ocean Divergence *(Time-Saving Mercy Rule)*:**
   * If a player sails `180°` away from an archipelago with full rations, forcing them to wait 10 minutes for food to run out would waste their time. If the canoe exceeds `125%` of the route's expected distance (or exits the archipelago basin) with **zero islands inside a wide `±60°` forward arc** and **no active Detection Rings (`Ring 1–4`)**, open-ocean mist rolls in early to trigger **Restore Before Voyage**. Players may also manually select *Retire Watch & Restore* from the pause menu at any time.
3. **Cue-Relative Post-Mist Reflection *(Easy & Medium Only)*:**
   * Before restoring to the departure beach, *Easy* and *Medium* modes offer a single-sentence navigator's reflection phrased **strictly in cue-relative language** (never cardinal directions or degrees)—for example: *"You held the sinking sun true in Verse 1, but when the Bull's Horn climbed past three hands high, your twin prows wandered from the Rising Rat's Nose."*

---

## 6. Music & Navigation Coupling System

Every discoverable route has an authored, **baked-in vocal and percussive chant** whose words, structure, and tempo serve directly as navigational instruments.

### 6.1 Dual-Layer Musical Encoding

```mermaid
flowchart LR
    subgraph Song["Authored Route Song"]
        L["Lyrics & Poetic Metaphors"]
        M["Verse Progression"]
        R["Tempo & 4-Beat Pahu Drum Pulse"]
    end

    subgraph World["Sailing Execution"]
        C["Visual Cues (Animal Stars, Birds, Lapa Clouds)"]
        T["Course Leg Transitions (Star Height / Dawn / Dusk)"]
        S["Swell Encounter Frequency Against Twin Hulls"]
    end

    L --> C
    M --> T
    R --> S
```

1. **Lyrical Imagery -> Concrete Cues:** Poetic phrases map consistently to lessons drawn in the sand ashore (e.g., *"follow the white fisher home to sleep"* = steer with dusk-homing terns; *"set the Bull's Horn between the twin prows"* = center the rising *Bull's Horn* star between the two hulls).
2. **Verse Structure -> Route Legs:** Each verse corresponds to a sequential leg of the 8–12 minute voyage, telling the navigator *when* to pivot headings or hand off along a *kavenga* as stars climb past three hands high.
3. **Musical Rhythm -> Ocean Swell Cadence:**
   * In swell-guided waters, the beat of the song physically matches the wave encounter period **when the canoe is held on the correct heading**.
   * **Example:** In a chant driven by a deep *pahu* drum accent every **4 beats**, primary swells lift the canoe's bow in exact **4-beat synchronization** with the drum *only* at the true heading angle.
   * Turning too far **into** the swell makes waves strike faster (every ~2.5–3 beats, rushing ahead of the music); turning too far **away** delays wave crests (every ~5.5–6 beats) or shifts motion into a sideways roll. Steering becomes the meditative act of tuning the hull's rise-and-fall to match the song's heartbeat.

### 6.2 Worked Example: Late-Game Full-Mastery Route Song (Act III Showcase)
*Route: "The Chant of Kiritimati" (Dusk-to-Morning Crossing from Kauaʻi to Kiritimati Atoll — Song 15)*

> **Verse 1 (Dusk Departure):** *"Put Kauaʻi's Fortress Crag behind your stern-post / Sail against the sinking sun until the Gecko's Tongue breaks the dark foam."*
> **Verse 2 (Patchy Night *Kavenga* — Path of the Bull & Swell):** *"Turn your twin prows to the Rising Bull's Horn / When clouds veil the Rat's Nose, hold the deep swell four beats upon your starboard cheek."*
> **Verse 3 (Dawn Swell Refraction & Landfall):** *"Watch the sea cross into diamond ripples beneath your twin hulls / Follow the crisscrossed water where pale jade paints the morning cloud."*

### 6.3 The Four Difficulty Modes & Player Character Designs

Notice the clean progression across the four tiers: *Easy -> Medium -> Hard* gradually removes **on-screen song decoding** while retaining visual constellation labels and static Sand Recall, whereas *Master Navigator* removes **all external aids** at sea—and each tier is embodied by its own **articulated 3D Polynesian player character** (visible standing at the canoe's aft steering sweep in 3rd-person view and during launch/landfall cinematics, hidden in 1st-person Deck View, and walked barefoot on walkable islands):

| Mode & 3D Player Character | Audio Song at Sea | On-Screen Song Text *(Cue-Relative Only)* | "Recall" Button *(Static Sand Marks)* | Sky & Star Annotations *(No Compass/Horizon Ticks)* | Target Experience |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EASY — Apprentice**<br>*12–14 yr Youth in woven pandanus pareu, braided auti headband & cowrie cord* | **Plays at sea** | **Lyrics + Cue-Based Instructions**<br>*(e.g., "Center twin prows on Rising Bull's Horn; at 3 hands high, follow Rising Rat's Nose")* | **Enabled at sea** | **Annotated** *(constellation lines, star names + active star shimmer)* | Relaxed, guided onboarding connecting music, sand lessons, and sky cues without ever giving away a compass bearing. |
| **MEDIUM — Wayfinder**<br>*18–20 yr Young Adult with topknot, frigatebird feather, kīhei sash & wave tapa* | **Plays at sea** | **Lyrics Only** *(no explicit instructions)* | **Enabled at sea** | **Annotated** *(constellation lines + star names)* | Core interpretive puzzle mode: combine on-screen lyrics + recalled sand diagrams to deduce heading. |
| **HARD — Navigator**<br>*30 yr Navigator with crimson kura feather circlet, tī-leaf mantle, taʻovala & full tatau* | **Plays at sea** | **None** *(no text on screen)* | **Enabled at sea** | **Annotated** *(constellation lines + star names)* | Pure auditory comprehension: listen closely to sung words and drum cadence, cross-referencing Sand Recall as needed. |
| **MASTER NAVIGATOR**<br>*50 yr Elder with full silver-gray beard, pearl-shell headdress, taumi gorget & kahu cloak* | **Silence at sea** *(natural ocean audio only; memorize song ashore)* | **None** | **Disabled at sea** *(pure memory)* | **Unannotated** *(raw starfield only)* | True traditional mastery: sing the chant and count its swell rhythm internally while reading naked-eye star shapes. |

> [!NOTE]
> Regardless of difficulty, **all songs and stick-in-sand diagrams remain freely accessible ashore** at the Navigator's Shore POI before every voyage, ensuring *Master Navigator* rewards attentive study and real wayfinding mastery rather than guesswork.

---

## 7. Fictionalized Polynesian World, Dual-Hemisphere Arc & Secret Rapa Nui

The ocean layout spans **three continuous flat 2D regional ocean basins** bridged by inter-basin crossings (`Song 7` and `Song 13`), designed around the 12-House Star Ring, 8–12 minute voyage legs, and unspoiled exploration while honoring Polynesian heritage with **real island names, sculpted 3D geological landmarks, and authentic hemisphere sky shifts**.

```mermaid
flowchart TD
    subgraph Act1["Act I: The Ra'iatea Lagoon Chain (Southern Sky, -17.3 to -16.1 deg)"]
        A1["Start on Walkable Ra'iatea with Elder Metua"] --> A2["Short Hops: Walkable Taha'a, Huahine, Manuae & Mo'orea"]
        A2 --> A3["Meet First Master Tera'i on Maupiti (Star-Stone Vigil)"]
    end

    subgraph Act2["Act II: The Nuku Hiva Windward Chain (Southern Sky, -12.6 to -8.9 deg)"]
        B1["Deep Crossing to Nuku Hiva"] --> B2["Explore Ua Pou, Rangiroa, Hiva Oa, Fatu Hiva & Mangareva"]
        B2 -. "Unlisted Open-Ocean Discovery" .-> BSecret["Secret 3x Island: Walkable Rapa Nui (-27.1 deg)"]
    end

    subgraph Act3["Act III: The Hawai'i Mist Chain (Northern Sky, +19.8 to +22.4 deg)"]
        C1["Cross Equator to Kaua'i (Swell Master Pohaku)"] --> C2["Master Fog Swells on O'ahu & Star-Mirror Kiritimati"]
        C2 --> C3["Grand Finale Voyage to Walkable Hawai'i (Tupaia-Nui)"]
    end

    A3 --> B1
    B2 --> C1
```

### Act I: The Raʻiātea Lagoon Chain *(Near-Shore Basics & Tutorial — Southern Hemisphere)*
* **Setting:** Begins on **walkable 3D Raʻiātea** and **walkable 3D Tahaʻa**, surrounded by a sheltered cluster of high islands and coral atolls (**Huahine**, uninhabited bird-atoll **Manuae**, **Moʻorea**, and outer windward **Maupiti**).
* **Guidance & Cues:** Elder Metua, Hina, Ariʻi, and Vaihere teach stationary peak clouds, *lapa* coral reflections, dawn/dusk seabird vectors, *pou* crossbeam sun-shadows, and introductory rising/setting relays along *The Bull* and *The Rat*, culminating at **First Master Teraʻi's** Star-Stone Ring on Maupiti.

### Act II: The Nuku Hiva Windward Chain *(The Star Ring & Deep Ocean — Southern Hemisphere)*
* **The Deep Crossing:** Armed with a multi-verse crossing chant and a Tier 2 raised-strake voyaging canoe (`6` Cargo Slots), the player sails out of sight of all land across **Nuku Hiva**, **Ua Pou**, **Rangiroa**, **Hiva Oa**, **Fatu Hiva** (upgrading to the Tier 3 twin-sail *Vaka Moana* with `8` Cargo Slots), and **Mangareva**.
* **Regional Mastery:** Multi-star *kavenga* relays across all 5 Declination Bands, polar pivot checks against *The Sea Turtle*, 360° stern back-sighting behind rain curtains, and overhead zenith dogleg turns (*Gecko's Heart*).

### Act III: The Hawaiʻi Mist Chain *(Equatorial Crossing, Ocean Swells & Grand Finale — Northern Hemisphere)*
* **Crossing the Equator (`Song 13`):** Departing Mangareva at dusk, the canoe crosses from the Southern sky into the **Northern Hemisphere**—watching *The Sea Turtle* sink beneath the wake while the motionless **Steadfast Peg** rises ahead above the fog-ringed crag of **Kauaʻi**.
* **Swell Mastery & Northern Star-Mirror:** On Kauaʻi, **Swell Master Pōhaku** teaches the Four Swell Voices, 4-beat *pahu* synchronization, and wave refraction across misty **Oʻahu** (*Miro* drum-timber) and **Kiritimati** (where **Keeper Akura** tends the Northern Star-Mirror Ring and bestows the Sacred Giant *Tridacna* Shell).
* **The Grand Voyage (`Song 16`):** A culminating four-verse crossing to **walkable 3D Hawaiʻi**—uniting dawn birds, *pou* deck shadow, blind 4-beat swell-reading through cross-chop, a 4-star rising relay under the Steadfast Peg, and cliff-reflected pyramid waves beneath snow-crowned Mauna Kea and glowing Kīlauea lava rivers.

### Secret Uncharted Island: Rapa Nui (*Te Pito o Te Henua*)
* Hidden far off the beaten star-paths in the remote corner of Act II's ocean basin (`pos: { x: 26.5, y: -22.5 }`, `-27.1°` Southern latitude), **Rapa Nui** is never named by elders or authored route songs.
* Sculpted at **3× horizontal scale** during open-ocean approach—with Maʻunga Terevaka, Poike, sunken Rano Kau caldera, golden Rano Raraku tuff quarry, Puna Pau red scoria cone, offshore *Motu* sea stacks, and upright ocean-facing *Moai*—landing on Rapa Nui opens a full **3D Walkable Island** featuring Anakena Coral Cove, an uninhabited boat-shaped *Hare Paenga* stone camp, *Te Pito Kura*, and 5 towering *Moai* crowned with crimson *Pukao* on *Ahu Tongariki*.

---

## 8. Audiovisual Craft, 3D Assets & Companion Inspection Tools

* **Procedural 3D Voyaging Fleet, Wildlife & Sculpted Islands:**
  * **Three Canoe Tiers:** Lofted asymmetric Polynesian V-hulls, *pepe* crossbeam lashings, moored *hoe uli* steering sweep, real-time *pou* solar shadow ribbon, and a Tier 3 *Hōkūleʻa*-style **fore-and-aft twin crab-claw sail rig** (`Vaka Moana`).
  * **Articulated 3D Marine & Avian Life:** Flapping **White Terns** (*kākāia*), **Brown Boobies**, and leaping **Pacific Bonito** baitballs.
  * **17 Custom-Sculpted 3D Islands:** Individual volcanic ridges, waterfalls, barrier-reef passes, coral *motu* necklaces, regional flora, villages, and active incandescent lava lakes on Hawaiʻi, paired with `18` WebP full-body character portraits (`15` mentors and `3` crewmates).
* **Spatial & Musical Soundscape:**
  * **Diegetic Cues:** Stereo positioning of wind in the sail, birds calling off port/starboard beams, and right-to-left / left-to-right wave slap cascades against the twin hulls.
  * **Baked-In Chants:** Sample-accurate Web Audio synthesis of vocal harmonies, nose flute (*vivo*), and *pahu* gourd percussion mixed naturally over ocean ambiance so drum downbeats lock cleanly with visual hull pitch.
* **Standalone Inspection & Cartography Tools *(Outside Main Game HUD)*:**
  * **Known Ocean 3D Map (`map.html`):** Top-view zoomable and pannable 3D ocean table rendering all three regional basins, all 16 campaign islands plus secret Rapa Nui, and route threads using the live 3D island assets (kept strictly separate from the in-game Zero-Compass experience).
  * **3D Asset Studio (`asset-viewer.html`) & URL Preview Harness:** Interactive orbit/zoom inspector for canoe tiers, wildlife, clouds, and islands, alongside direct URL boot modes (`?island=<id>`, `?mode=launch`, `?mode=landfall`, `?mode=sky_vigil`) for rapid testing.

---

## 9. Appendix A: Complete Act I Blueprint (*The Raʻiātea Chain*)

Act I serves as a self-contained, 6-island opening archipelago designed to onboard the player gently—introducing **one new navigational concept per voyage**, weaving a cohesive inter-island trade and canoe-restoration loop, and culminating in an audience with the **First Master Navigator** on outer windward **Maupiti** (strictly reserving full 12-Shell Star Compass mastery for Act II and ocean swell reading for Act III).

### 9.1 Archipelago Topology & Progression Flow

```mermaid
flowchart LR
    I1["1. Ra'iatea (Starter High Isle)"] -- "Song 1: Peak Cloud & Drift (~4 min)" --> I2["2. Taha'a (Kava & Fisher Isle)"]
    I2 -- "Song 2: Dawn Terns & Post Shadow (~5 min)" --> I3["3. Huahine (Star-Watcher Isle)"]
    I3 -- "Song 3: Rising Bull's Horn & Lapa (~6.5 min)" --> I4["4. Manuae (Uninhabited Bird Atoll)"]
    I4 -- "Song 4: Dusk Terns & Spire Cloud (~7 min)" --> I5["5. Mo'orea (Timber & Adze Isle)"]
    I5 -- "Song 5: Two-Star Intro Return (~6 min)" --> I1
    I1 -- "Song 6: Capstone Night-to-Dawn Pass (~8.5 min)" --> I6["6. Maupiti (First Master Navigator)"]
```

* **Looping Progression & Return Chants:** The core quest chain forms a natural 5-island circuit returning to **Raʻiātea** to consecrate the fully restored canoe before tackling the windward passage to **Maupiti**. Whenever the player discovers an inhabited island, its local navigator also shares simple **return verses** along reversed daytime/star cues so the player can revisit any discovered island to restock rations or swap crew.

---

### 9.2 The 6 Act I Islands: POIs, Sand Lessons & Quest Economy

*(Starting Canoe State on Raʻiātea: Coastal double-hulled canoe with **4 Deck Cargo Slots**, 1 loyal starter paddler, Hulls `75%`, Sail `75%`, Lashings `65%`.)*

| Island & Archetype | Active POIs | Mentor & Stick-in-Sand Lessons Taught | Quest / Cargo Role & Upgrades |
| :--- | :--- | :--- | :--- |
| **1. Raʻiātea**<br>*(Walkable Sacred High Island — Home)* | **3D Walkable Island:**<br>• Moored Canoe Landing<br>• Craftsmen's & Ration Hut<br>• Hilltop Observation Circle<br>• *Marae Taputapuātea* | **Elder Metua** *(Village Navigator)*:<br>1. *Stationary Peak Cloud vs. Drifting Trade Clouds*<br>2. *Leeward Frond & Kelp Trails*<br>*(Later, before Song 6)*: *Checking Foamy Wake Leeway Astern* | **Main Act I Goal:** Bring **Red *Kura* Feathers** + restore Canoe to `100%` so Elder Metua consecrates the vessel and teaches **Song 6 (Maupiti)**. |
| **2. Tahaʻa**<br>*(Walkable Sheltered Lagoon Isle)* | **3D Walkable Island:**<br>• Bay Jetty & Canoe<br>• Sennit & Fish-Drying *Fare*<br>• Coral Sighting-Post Shore<br>• Hina's Hillside Hearth | **Hina** *(Fisher-Navigator)*:<br>1. *Dawn Outward vs. Dusk Homeward White Terns* (+ midday baitfish-circle warning)<br>2. *Sunrise & Forward Crossbeam (Iako) Post Shadow* | • Gives **Pandanus Sennit Cordage** *(repairs Lashings to `100%`)*<br>• Provides **Medicinal *Kava* Bundle** *(wanted on Huahine)*<br>• Recruits **Tama (*Fisher* Crewmate)** |
| **3. Huahine**<br>*(Twin-Peak Artisans' Isle)* | • Canoe Landing<br>• Navigator's Shore<br>• Twin-Bay Village | **Ariʻi** *(Night-Sky Elder)*:<br>1. *Pale Jade Lagoon Glow (Lapa)* on atoll cloud bellies<br>2. *Sand Sketches of **The Bull** (Bull's Horn) & **The Rat** (Rat's Nose)* in the 3-Hands Window | • Trade **Medicinal *Kava* Bundle** -> Ariʻi teaches **Song 3 (Manuae)** & **Song 4 (Moʻorea)**<br>• Crafts **Woven Pandanus Sail** *(repairs Sail to `100%`)* |
| **4. Manuae**<br>*(Uninhabited Coral Atoll)* | • Lagoon Beach<br>• Wild Rookery & Pearl Shallows *(Outpost)* | *Uninhabited — quiet environmental storytelling reward for trusting night stars & lapa glow.* | • Harvest **Ceremonial Red *Kura* Feathers** *(for Raʻiātea's Marae)*<br>• Harvest **Giant Pearl-Shell Lures** *(prized on Moʻorea)* |
| **5. Moʻorea**<br>*(Jagged Volcanic Spire)* | • Canoe Yard Beach<br>• Navigator's Shore<br>• Spire-Foot *Marae* | **Vaihere** *(Canoe-Wright Navigator)*:<br>1. *Following Setting Stars Downward*<br>2. *Two-Star Handoff Preview (Bull's Horn -> Rat's Nose)* | • Trade **Pearl-Shell Lures** -> repairs **Twin Hulls to `100%`**, expands Deck Cargo **`4 -> 6 Slots`**, gives **Polished Basalt Adze** *(gift for Maupiti's Master)*, and teaches **Song 5** |
| **6. Maupiti**<br>*(Outer Windward Fortress)* | • Reef-Pass Beach<br>• **Master Teraʻi's Teaching Sand**<br>• Cliff Sanctuary | **First Master Teraʻi**:<br>• Draws the **Complete 12-Shell Horizon Ring** across all 5 Star-Path Bands & 10 Animal Constellations! | • Present **Polished Basalt Adze** after discovering all 6 Act I islands -> unlocks **Act II's Deep Crossing Chant to Nuku Hiva**! |

---

### 9.3 Complete Act I Route Songs & Cue-Relative Decoding

Every Act I chant uses **strictly cue-relative imagery** (zero cardinal words or compass degrees), scaling gradually from a single daytime cloud to an overnight multi-cue passage:

#### Song 1: *"The Still Cloud of Tahaʻa"* (`Raʻiātea -> Tahaʻa`)
* **Recommended Departure:** **Dawn** | **1x Duration:** `~4 min` *(~1.5–2 min with Fast Forward)*
* **Mechanics Taught:** Trim-Lock steering, 360° Free-Look, Fast Forward motion contrast, Stationary Peak Clouds, Leeward Drift.
> **Verse 1:** *"Leave Raʻiātea's bay with the rising sun warm upon your right cheek / Watch the white wind-clouds march while one tall cloud stands still / Follow the green palm-fronds floating down from Tahaʻa's shore."*
* ***Easy*-Mode Cue Text:** *"Look right in Free-Look to place the rising sun off your starboard beam; center your twin prows on the single motionless tall cloud on the horizon, then steer along the floating green fronds."*

#### Song 2: *"Beaks of the Morning Fisher"* (`Tahaʻa -> Huahine`)
* **Recommended Departure:** **Dawn** | **1x Duration:** `~5 min`
* **Mechanics Taught:** Dawn outward seabird vectors, midday bonito fish-school foraging (with *Tama*), *Iako* post-shadow tracking.
> **Verse 1 (Dawn):** *"Launch into the pale dawn where the white terns fly out to hunt / Point your twin prows straight into their beaks against their morning flight."*
> **Verse 2 (Mid-Morning):** *"When the sun climbs above your sail, keep the post's dark shadow upon the second left lashing / Pass through the silver leaping fish until twin peaks break the sea."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Spot straight-flying white terns at dawn and steer directly opposite their flight path. Verse 2: Hold heading by keeping the deck post shadow on the second port crossbeam notch past the leaping fish."*

#### Song 3: *"The Jade Belly of Manuae"* (`Huahine -> Manuae Atoll`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~6.5 min`
* **Mechanics Taught:** Stern island back-sighting + dusk solar alignment, first nighttime Animal Star (*Setting Bull's Horn*), coral atoll *Lapa* cloud reflection.
> **Verse 1 (Dusk):** *"Set Huahine's twin peaks straight behind your steering sweep and chase the sinking sun across the golden foam."*
> **Verse 2 (Night into Dawn):** *"Center the amber Setting Bull's Horn descending between your prows / When grey dawn softens the sky, steer beneath the flat cloud painted green on its belly."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Steer toward the setting sun (check Free-Look astern to keep Huahine's twin peaks centered behind your stern). Verse 2: At night, center the Setting Bull's Horn between your twin prows; at dawn, steer toward the low cloud glowing pale turquoise underneath."*

#### Song 4: *"Homeward Wings to Moʻorea"* (`Manuae Atoll -> Moʻorea`)
* **Recommended Departure:** **Midday** *(arriving near Dusk)* | **1x Duration:** `~7 min`
* **Mechanics Taught:** Bridging afternoon sun-shadow into dusk homing birds and stationary volcanic spire cloud.
> **Verse 1 (Afternoon):** *"Put the green ring of Manuae behind your wake / Hold the afternoon post shadow steady across the left outer lashing while trade clouds march across your bow."*
> **Verse 2 (Dusk):** *"When the sun sinks golden off your right beam, follow the white tern's tail feathers homeward / Aim where the jagged spire-cloud stands unmoving against the twilight sea."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Keep the deck post shadow aligned with the outer port (left) lashing as afternoon sun shines from starboard. Verse 2: Near sunset, follow straight-flying white terns in the same direction they fly toward the motionless tall spire cloud."*

#### Song 5: *"Return to Taputapuātea"* (`Moʻorea -> Raʻiātea`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~6 min`
* **Mechanics Taught:** First gentle **2-star rising handoff** (*Bull's Horn -> Rat's Nose*) along a single band before meeting the Master.
> **Verse 1 (Early Night):** *"Leave Moʻorea's spire astern as darkness falls / Place the Rising Bull's Horn squarely between your twin prows."*
> **Verse 2 (Late Night to Dawn):** *"When the Bull's Horn climbs three hands above the dark sea, drop your eyes to the Rising Rat's Nose / Hold him true until sacred Raʻiātea lifts against the morning light."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Center the Rising Bull's Horn between your twin prows. Verse 2: Once Bull's Horn climbs high near the top of your view, switch to the Rising Rat's Nose right beneath it on the horizon."*

#### Song 6: *"The Outer Pass of Maupiti"* (`Raʻiātea -> Maupiti` — Act I Capstone)
* **Recommended Departure:** **Midnight** *(sailing into Dawn)* | **1x Duration:** `~8.5 min`
* **Mechanics Taught:** Setting-side 2-star handoff (*Setting Bull's Hoof -> Setting Rat's Tail*), crosswind wake-leeway compensation, and dawn booby landfall funnel.
> **Verse 1 (Midnight):** *"Steer for the Setting Bull's Hoof descending toward the dark foam / Glance back at your white wake—lean half a prow into the wind so your trail runs straight."*
> **Verse 2 (Pre-Dawn):** *"Before the Bull's Hoof drowns beneath the sea, let the Setting Rat's Tail take the watch above him."*
> **Verse 3 (Dawn Landfall):** *"At first light, steer against the brown boobies flying outward / Thread the foaming reef-pass where Maupiti's fortress rock stands."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Aim toward the Setting Bull's Hoof (aim half a prow into the crosswind so your stern wake trails straight). Verse 2: Just before Bull's Hoof sets into the water, track the Setting Rat's Tail descending above it. Verse 3: At dawn, steer opposite outward-flying boobies to reach Maupiti."*

---

## 10. Appendix B: Complete Act II Blueprint (*The Nuku Hiva Windward Chain*)

Upon presenting the **Polished Basalt Adze** on Maupiti, **First Master Teraʻi** draws the **Complete 12-Shell Horizon Ring** in the wet sand—unlocking all 5 Star-Path Bands and 10 Animal Constellations. Act II challenges the player to cross empty blue water out of sight of all land, execute 3-star *kavenga* relays, steer by polar pivots and stern back-sighting, read overhead zenith stars, and chart every island in the 6-island **Nuku Hiva Windward Chain** (still strictly prior to learning ocean swells in Act III).

### 10.1 Act II Topology & Progression Flow

```mermaid
flowchart LR
    M["Maupiti (Act I Outer Isle)"] -- "Song 7: Deep Crossing (Band 2 Relay, ~10.5 min)" --> N1["1. Nuku Hiva (Regional Hub)"]
    N1 -- "Song 8: Grazing Horse Pivot (~7.5 min)" --> N2["2. Ua Pou (Spire Artisans)"]
    N2 -- "Song 9: Band 1 Setting Relay (~8.5 min)" --> N3["3. Rangiroa (Giant Coral Ring)"]
    N3 -- "Song 10: Cloud Curtain & Stern Star (~9.5 min)" --> N4["4. Hiva Oa (Obsidian Cliffs)"]
    N4 -- "Song 11: Turtle Pivot & Zenith Gecko (~9 min)" --> N5["5. Fatu Hiva (Vaka Upgrade Isle)"]
    N5 -- "Song 12: Band 5 Whale Relay (~10 min)" --> N6["6. Mangareva (Gateway to Mist Isles)"]
```

---

### 10.2 The 6 Act II Islands: POIs, Sand Lessons, Crew & Canoe Upgrades

| Island & Archetype | Active POIs | Mentor & Stick-in-Sand Lessons Taught | Quest / Cargo Role & Upgrades |
| :--- | :--- | :--- | :--- |
| **1. Nuku Hiva**<br>*(Towering Valley Hub)* | • Taiohae Canoe Beach<br>• Navigator's Shore<br>• Chief's *Marae* | **Master Teiki**:<br>1. *Polar Pivots in the Sand (Grazing Horse vs. Sea Turtle's Pivot)*<br>2. *Planning Multi-Day Rations vs. Crew Burn* | • Regional hub; Elders promise the guarded southern route out of the chain once all 6 regional islands are charted and united. |
| **2. Ua Pou**<br>*(Basalt Spire Isle)* | • Pebble Cove<br>• Navigator's Shore<br>• Carvers' Terrace | **Vaea** *(Wind-Watcher)*:<br>• *Reading Band 1 (Path of the Horse) & Compensating Strong Trade Winds* | • Recruits **Moana (*Sail-Tender* Crewmate — halves crosswind leeway)**<br>• Crafts **Carved Bone Harpoon Heads** *(wanted on Rangiroa)*. |
| **3. Rangiroa**<br>*(Immense Coral Atoll)* | • Lagoon Pass Beach<br>• Navigator's Shore<br>• Pearl Divers' Village | **Tane** *(Atoll Navigator)*:<br>• *360° Stern Back-Sighting Along Opposite Houses When Forward Rain-Clouds Bank Low* | • Trade **Bone Harpoon Heads** -> receives **Mother-of-Pearl Star Discs** *(for Hiva Oa)* & teaches **Song 10 (Hiva Oa)**. |
| **4. Hiva Oa**<br>*(Volcanic Quarry Isle)* | • Black-Sand Landing<br>• Navigator's Shore<br>• Quarry & *Tiki* Sanctuary | **Tahia** *(Zenith Watcher)*:<br>• *Mid-Ocean Dogleg Turns & Overhead Zenith Stars (Tilting Free-Look Straight Up to Spot Gecko's Heart Passing the Mast-Top)* | • Trade **Pearl Star Discs** -> receives **Obsidian Adze Blanks** *(for Fatu Hiva's builders)*<br>• Recruits **Kahu (*Hull-Wright* Crewmate — slows sea wear by 50%)**. |
| **5. Fatu Hiva**<br>*(Cliff-Walled Forest Isle)* | • Waterfall Bay<br>• Navigator's Shore<br>• Master Canoe Shed | **Oihanu** *(Master Builder)*:<br>• *Southern Band 5 (Path of the Whale) & Long-Range Ration Pacing* | • Trade **Obsidian Adze Blanks** -> upgrades vessel into a **Tier 3 Twin-Sail Deep-Ocean *Vaka Moana* (`6 -> 8 Cargo Slots`, fore-and-aft double crab-claw sails, reinforced durability)** & teaches **Song 12**. |
| **6. Mangareva**<br>*(Outer Lagoon Gateway)* | • Mist-Border Beach<br>• Navigator's Shore<br>• Lagoon *Marae* | **Elder Rongo**:<br>• *Warning of the Equatorial Mist Waters Ahead* | • Verifies all 6 Act II islands are discovered -> teaches **Song 13 (Crossing to Kauaʻi)** to seek Swell Master Pōhaku! |

---

### 10.3 Complete Act II Route Songs & Cue-Relative Decoding

#### Song 7: *"Across the Empty Blue to Nuku Hiva"* (`Maupiti -> Nuku Hiva` — First Deep Crossing)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~10.5 min` *(full night + morning out of sight of all land)*
* **Mechanics Taught:** Full 3-star rising *kavenga* relay along **Band 2 (*Path of the Boar*)**, trusting stars across empty ocean into morning sun-shadow.
> **Verse 1 (Early Night — Band 2):** *"Watch Maupiti vanish in your wake as darkness claims the sea / Place the Rising Boar's Tusk squarely between your twin prows."*
> **Verse 2 (Mid- to Late Night):** *"When the Boar's Tusk climbs three hands high, hand the watch to the Rising Gecko's Tongue / When the Gecko climbs, follow the Crab's Left Claw breaking the dark foam."*
> **Verse 3 (Morning Landfall):** *"When dawn washes out the Crab, lock your post shadow upon the first left lashing / Hold steady until Nuku Hiva's great cloud-crown pierces the empty sea."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Center the Rising Boar's Tusk between your twin prows. Verse 2: Relay down the same horizon house as each star passes 3 hands high: Rising Gecko's Tongue -> Rising Crab's Left Claw. Verse 3: After sunrise, hold the post shadow on the first port lashing toward the tall stationary peak cloud."*

#### Song 8: *"Where the Horse Grazes the Foam"* (`Nuku Hiva -> Ua Pou`)
* **Recommended Departure:** **Midnight** | **1x Duration:** `~7.5 min`
* **Mechanics Taught:** Polar-axis steering using the **Northern Pivot (*Horse's Crown*)** checked against the **Southern Pivot (*Sea Turtle*)** astern.
> **Verse 1 (Night):** *"Steer where the Horse's Crown skims low across the dark water without sinking / Check behind your steering paddle that the Sea Turtle spins directly in your wake."*
> **Verse 2 (Dawn):** *"When morning pales the Horse, steer opposite the white terns until Ua Pou's stone needles rise."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Center the low-skimming Horse's Crown between your twin prows (verify in Free-Look that The Sea Turtle sits dead astern). Verse 2: At dawn, steer opposite outward-flying white terns toward Ua Pou."*

#### Song 9: *"Three Lanterns Down to Rangiroa"* (`Ua Pou -> Rangiroa`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~8.5 min`
* **Mechanics Taught:** 3-star **setting** relay along **Band 1 (*Setting Path of the Horse*)** into coral-atoll *lapa* glow.
> **Verse 1 (Early Night — Band 1 Setting):** *"Aim your twin prows where the Horse's Tail descends toward the dark waves / Before it drowns, let the descending Boar's Bristle take its place."*
> **Verse 2 (Pre-Dawn into Morning):** *"Follow the Crab's Right Claw down toward the sea mist / At first light, seek the wide jade belly glowing above Rangiroa's ring."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Steer toward Setting Horse's Tail; before it sinks below the horizon, switch to Setting Boar's Bristle descending above it. Verse 2: Switch to Setting Crab's Right Claw, then steer under the pale turquoise-bellied cloud at dawn."*

#### Song 10: *"The Cloud-Veiled Reach to Hiva Oa"* (`Rangiroa -> Hiva Oa`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~9.5 min`
* **Mechanics Taught:** Holding course via **360° Free-Look stern back-sighting** along the opposite Setting House when dark trade clouds block the forward bow horizon.
> **Verse 1 (Early Night — Band 4 Rising):** *"Leave the great lagoon on the Rising Bull's Hoof / When he climbs three hands high, hold the Rising Rat's Tail."*
> **Verse 2 (Midnight Cloud Curtain — Stern Back-Sighting):** *"When low rain-clouds curtain your prows and the Shark's Fin hides in mist / Look straight back over your steering sweep and center the Setting Crab's Left Claw in your wake until morning lifts Hiva Oa's dark cliffs."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Center Rising Bull's Hoof, then hand off to Rising Rat's Tail. Verse 2: When dark clouds block your forward horizon, use Free-Look astern to keep Setting Crab's Left Claw centered directly behind your stern-post until dawn."*

#### Song 11: *"Beneath the Overhead Gecko"* (`Hiva Oa -> Fatu Hiva`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~9 min`
* **Mechanics Taught:** **Southern Pivot** sailing + **Zenith Star dogleg turn** (tilting Free-Look straight up `90°` overhead to watch *Gecko's Heart* cross directly above the masthead!).
> **Verse 1 (Night — Southern Pivot):** *"Point your twin prows where the Frigatebird's Beak dives down toward the Sea Turtle's Pivot / Sail steady while the Gecko climbs the dome."*
> **Verse 2 (Zenith Dogleg Turn):** *"Tilt your eyes to the mast-top: when the Gecko's Heart passes straight overhead / Turn your prows to the Rising Shark's Jaw until Fatu Hiva's green cliffs greet the sun."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Steer toward the point on the horizon beneath The Sea Turtle and Frigatebird's Beak. Verse 2: Look straight up in Free-Look; once Gecko's Heart passes directly overhead above your mast, turn to center the Rising Shark's Jaw between your prows."*

#### Song 12: *"Wake of the Great Whale"* (`Fatu Hiva -> Mangareva`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~10 min`
* **Mechanics Taught:** Mastering **Band 5 (*Rising Path of the Whale*)** across a long open-water reach.
> **Verse 1 (Night — Band 5 Rising):** *"Set the Rising Whale's Spout between your prows / Hand the watch to the Whale's Fluke, and then to the Rising Shark's Tail."*
> **Verse 2 (Morning):** *"Keep the morning sun off your port beam and steer into the morning boobies' beaks / Until green Mangareva shines beneath its mountain cloud."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Relay along the same rising house: Whale's Spout -> Whale's Fluke -> Shark's Tail as each climbs past 3 hands high. Verse 2: At dawn, steer opposite outward-flying boobies toward the peak cloud ringed with lagoon green."*

---

## 11. Appendix C: Complete Act III Blueprint (*The Hawaiʻi Mist Chain & Grand Voyage*)

Beyond Mangareva, Song 13 carries the canoe across the equator into the Northern Hemisphere's **Hawaiʻi Mist Chain** (`+19.8°` to `+22.4°` latitude), where *The Sea Turtle* vanishes astern, the unmoving **Steadfast Peg** anchors the northern night, and dense sea fog and unbroken cloud decks frequently strip away stars and sun shadows. Act III introduces **Swell Master Pōhaku** on **Kauaʻi** and **Keeper Akura** on **Kiritimati**, unlocking deep-ocean swell reading, **4-beat *pahu* drum synchronization**, and wave refraction landfalls before culminating at **walkable 3D Hawaiʻi**.

### 11.1 Act III Topology & Progression Flow

```mermaid
flowchart LR
    M6["Mangareva (Act II Gateway)"] -- "Song 13: Equatorial Crossing Into Mist (~9 min)" --> H1["1. Kaua'i (Swell Master Pohaku)"]
    H1 -- "Song 14: Fog & Port-Cheek 4-Beat Trial (~8.5 min)" --> H2["2. O'ahu (Miro Drum-Wood Isle)"]
    H2 -- "Song 14R: Starboard-Cheek Return (~8.5 min)" --> H1
    H1 -- "Song 15: Overcast & Swell Lattice (~10 min)" --> H3["3. Kiritimati (Keeper Akura's Star-Mirror Atoll)"]
    H3 -- "Song 16: The Great Chant of Hawai'i (~12 min)" --> H4["4. Walkable Hawai'i (Ancestral Mauna Finale)"]
```

---

### 11.2 The 4 Act III Islands: POIs, Swell Sand Lessons & Final Quests

| Island & Archetype | Active POIs | Mentor & Lessons Taught | Quest / Cargo Role & Culmination |
| :--- | :--- | :--- | :--- |
| **1. Kauaʻi**<br>*(Mist-Ringed Fortress Crag, `+21.8°`)* | • Black-Sand Cove<br>• **Master Pōhaku's Drum & Pebble Shore**<br>• High Crag *Pā* | **Swell Master Pōhaku**:<br>1. *The Four Twin-Hull Swell Voices & 4-Beat Pahu Sync*<br>2. *Rock-in-Sand Wave Refraction (Diamond Lattice, Pyramid Reflections & Calm Wave Shadow)* | • Grants initial fog-swell trial (**Song 14** to *Oʻahu*) on arrival.<br>• Deliver *Oʻahu*'s **Sacred *Miro* Drum-Timber** -> Pōhaku carves the resonant *pahu*, teaching **Refraction**, **Song 15**, and **Song 16**! |
| **2. Oʻahu**<br>*(Fog-Banked Timber Isle, `+22.4°`)* | • Fog-Shrouded Barrier Beach<br>• *Miro* Forest Grove<br>• Fisher's Hearth | **Elder Manu**:<br>• Reinforces *Reversing Cheek Trim on a Return Swell Passage in Sea Fog* | • Harvest **Sacred *Miro* Drum-Timber** *(quest item for Master Pōhaku on Kauaʻi)* & learn **Song 14R**. |
| **3. Kiritimati**<br>*(Sacred Star-Mirror Atoll, `+21.2°`)* | • Sacred Coral Pass Landing<br>• Navigator's Shore *(Northern Star-Stone Vigil)*<br>• Sacred Lagoon Shrine | **Keeper Akura** *(Northern Star Master)*:<br>• *Northern Sky Star-Stone Vigil (Steadfast Peg & Circumpolar Horse)*<br>• *Grand Voyage Preparation* | • Full `100%` careening & `8`-slot ration provisioning + loads **Sacred Giant *Tridacna* Shell** for Hawaiʻi's Great *Heiau*. |
| **4. Hawaiʻi**<br>*(Walkable Ancestral Mauna Horizon, `+19.8°` — Finale)* | **3D Walkable Island:**<br>• Kealakekua Canoe Landing<br>• Royal *Hālau Waʻa* Shed<br>• Mauna Star-Gourd Knoll<br>• **Great Ancestral *Heiau Ahu*** | **Council of Ancestral Wayfinders** | • **Campaign Culmination:** Present the *Sacred Tridacna Shell* beneath snow-crowned Mauna Kea & glowing Kīlauea lava rivers; earn the title ***Tupaia-Nui* (Master Navigator)** and unlock the **Master Navigator Anthology** (free replay of all 17 chants)! |

---

### 11.3 Complete Act III Route Songs & Cue-Relative Decoding

#### Song 13: *"Edge of the Grey Curtain"* (`Mangareva -> Kauaʻi` — Equatorial Crossing into Act III)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~9 min`
* **Mechanics Taught:** Crossing from the Southern to the Northern sky (*Sea Turtle* drowning astern as **Steadfast Peg** rises ahead), followed by holding a locked sweep through pre-dawn sea fog until Kauaʻi's high crag pierces above the mist.
> **Verse 1 (Night — Band 1 Setting & Hemisphere Shift):** *"Follow the Setting Horse's Tail and Boar's Bristle down toward the dark sea / Watch the Sea Turtle drown in your wake while the Steadfast Peg lifts above the foam."*
> **Verse 2 (Pre-Dawn Mist):** *"When grey mist blinds the stars and steals the morning sun, hold your steering sweep locked without wavering / Watch high above the low fog-bank where Kauaʻi's black crag pierces the sky."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Steer on Setting Horse's Tail, then Setting Boar's Bristle as the Sea Turtle sinks astern and the Steadfast Peg rises ahead. Verse 2: When fog hides the horizon and stars, hold your Trim-Lock paddle steady; look slightly above the low fog bank at dawn to spot Kauaʻi's high peak."*

#### Song 14: *"Four Heartbeats to Oʻahu"* (`Kauaʻi -> Oʻahu`)
* **Recommended Departure:** **Dawn** | **1x Duration:** `~8.5 min`
* **Mechanics Taught:** First pure **4-beat *pahu* swell-to-hull synchronization** through daytime sea fog + **Calm Wave Shadow** landfall.
> **Verse 1 (Dawn into Fog):** *"Put the rising sun behind your right shoulder until white sea-mist closes the world / Listen to the deep drum—let the great swell lift your port cheek every four beats."*
> **Verse 2 (Fog Landfall):** *"Turn away if the waves rush your bow; turn closer if your deck rolls side to side / When the deep swell suddenly falls flat and still, steer straight upswell into Oʻahu's hidden bay."*
* ***Easy*-Mode Cue Text:** *"Verse 1: In the fog, adjust heading until the left (port) prow lifts first in a diagonal corkscrew exactly on Beat 1 of every 4-beat drum cycle. Verse 2: When you enter the flat Calm Wave Shadow, turn Head-On (symmetric bow seesaw) straight into the swell to reach Oʻahu."*

#### Song 14R: *"Echo of the Fortress Crag"* (`Oʻahu -> Kauaʻi` — Return Swell Trial)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~8.5 min`
* **Mechanics Taught:** Reversing to starboard-cheek 4-beat swell feel on the return passage + dawn high-crag landfall above the mist.
> **Verse 1 (Dusk into Fog):** *"Leave Oʻahu's timber cove with the sinking sun behind your left shoulder / Let the deep ocean ridge lift your starboard cheek every four beats through the dark mist."*
> **Verse 2 (Misty Dawn Landfall):** *"Hold your wake true against the rolling ridge / When grey morning lightens the mist, steer where Kauaʻi's black fortress crag pierces above the cloud."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Place the setting sun behind your port shoulder; hold starboard-cheek corkscrew lift on every 4-beat drum strike through the mist. Verse 2: At dawn, steer toward Kauaʻi's tall peak rising above the low fog bank."*

#### Song 15: *"The Chant of Kiritimati"* (`Kauaʻi -> Kiritimati Atoll`)
* **Recommended Departure:** **Dusk** | **1x Duration:** `~10 min`
* **Mechanics Taught:** Combining patchy night *kavenga*, starboard-cheek 4-beat swell maintenance under cloud cover, and **Leeward Diamond Lattice + *Lapa* Glow** landfall.
> **Verse 1 (Dusk Departure):** *"Put Kauaʻi's Fortress Crag behind your stern-post / Sail against the sinking sun until the Gecko's Tongue breaks the dark foam."*
> **Verse 2 (Patchy Night *Kavenga*):** *"Turn your twin prows to the Rising Bull's Horn / When clouds veil the Rat's Nose, hold the deep swell four beats upon your starboard cheek."*
> **Verse 3 (Dawn Refraction & Landfall):** *"Watch the sea cross into diamond ripples beneath your twin hulls / Follow the crisscrossed water where pale jade paints the morning cloud."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Keep the setting sun astern until Gecko's Tongue rises. Verse 2: Align prows to Rising Bull's Horn; when night clouds cover the sky, hold starboard-cheek corkscrew lift every 4 drum beats. Verse 3: Follow the diamond cross-hatched swell refraction toward the turquoise-bellied cloud."*

#### Song 16: *"The Great Chant of Hawaiʻi"* (`Kiritimati -> Hawaiʻi` — The Grand Finale)
* **Recommended Departure:** **Dawn** | **1x Duration:** `~12 min` *(Full day -> foggy afternoon -> starry night -> misty dawn)*
* **Mechanics Taught:** Complete mastery exam uniting every cue in the game—dawn wildlife, *pou* sun-shadow, blind 4-beat swell-reading against a deceptive cross-chop, a 4-star rising *kavenga* relay checked against the northern **Steadfast Peg**, and cliff-reflected pyramid waves into Kealakekua Bay.
> **Verse 1 (Dawn Departure & Sun Shadow):** *"Sail against the morning boobies with the rising sun warm between your twin prows / When the sun climbs high, bind the post shadow to the center deck-lashing."*
> **Verse 2 (Afternoon Sea Fog & Cross-Swell):** *"When white mist swallows sun and sky, ignore the quick chop slapping your beam / Feel only the slow ocean ridge lifting your port cheek every four strikes of the deep drum."*
> **Verse 3 (Clearing Midnight *Kavenga* — Band 4 & Steadfast Peg):** *"When night wind tears the fog apart, set your prows upon the Rising Gecko's Tail / Hand the watch to the Bull's Hoof, the Rat's Tail, and icy Shark's Fin, keeping the Steadfast Peg shining off your port beam."*
> **Verse 4 (Misty Dawn & Reflected Cliffs):** *"When morning mist returns, watch for white-tipped pyramid waves bouncing back from unseen cliffs / Follow the dawn terns' beaks straight through the surf-mist to Hawaiʻi's ancestral shore."*
* ***Easy*-Mode Cue Text:** *"Verse 1: Steer toward the rising sun (opposite dawn boobies), then keep the post shadow centered along the middle deck lashing. Verse 2: In fog, tune heading until the deep Primary Swell lifts your port prow every 4 beats. Verse 3: Under night stars, relay along Rising Gecko's Tail, Bull's Hoof, Rat's Tail, and Shark's Fin while the Steadfast Peg shines off your left beam. Verse 4: In dawn mist, steer toward peaked white-tipped reflected waves and opposite outward-flying terns to reach Hawaiʻi."*



