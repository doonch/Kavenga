/**
 * Declarative Celestial-Locked Animal Silhouette Cut-Outs for all 10 Constellations.
 *
 * Pure data module (zero DOM / window / THREE imports) so headless JSC & Node test suites
 * can validate celestial anchor math, star-inside-silhouette bounds, and spherical invariance.
 *
 * Each silhouette lives on a 512x512 virtual canvas projected onto a curved spherical tangent
 * patch rigidly locked to `(centerRaDeg, centerDecDeg)` and `(upRaDeg, upDecDeg)` on the sky dome:
 *   - `parts`: closed filled subpaths (`M`, `L`, `Q`, `C`, `Z`) painted in low-contrast midnight slate
 *   - `stencils`: open/closed `destination-out` anatomical grooves that let the dark sky shine through
 */

export const CONSTELLATION_SILHOUETTES = Object.freeze({
  // 1. THE SEA TURTLE (Honu) — shell_crown (256.0, 132.8), flippers (76.1, 256.0) & (435.9, 256.0)
  the_sea_turtle: {
    id: 'the_sea_turtle',
    centerRaDeg: 110.0,
    centerDecDeg: -90.0,
    upRaDeg: 20.0,
    upDecDeg: 0.0,
    halfSpan: 0.20,
    gridN: 14,
    parts: [
      // Head & short neck above Shell Crown
      [
        ['M', 236, 114],
        ['C', 231, 90, 238, 62, 256, 58],
        ['C', 274, 62, 281, 90, 276, 114],
        ['Q', 256, 108, 236, 114],
        ['Z'],
      ],
      // Left swept hydrofoil front flipper (enclosing 76.1, 256.0)
      [
        ['M', 178, 168],
        ['C', 134, 162, 86, 194, 50, 248],
        ['C', 38, 266, 44, 280, 64, 278],
        ['C', 106, 272, 144, 244, 170, 222],
        ['Q', 171, 194, 178, 168],
        ['Z'],
      ],
      // Right swept hydrofoil front flipper (enclosing 435.9, 256.0)
      [
        ['M', 334, 168],
        ['C', 378, 162, 426, 194, 462, 248],
        ['C', 474, 266, 468, 280, 448, 278],
        ['C', 406, 272, 368, 244, 342, 222],
        ['Q', 341, 194, 334, 168],
        ['Z'],
      ],
      // Left hind paddle flipper
      [
        ['M', 198, 372],
        ['C', 174, 390, 160, 416, 168, 432],
        ['C', 176, 444, 198, 436, 214, 412],
        ['L', 222, 390],
        ['Z'],
      ],
      // Right hind paddle flipper
      [
        ['M', 314, 372],
        ['C', 338, 390, 352, 416, 344, 432],
        ['C', 336, 444, 314, 436, 298, 412],
        ['L', 290, 390],
        ['Z'],
      ],
      // Small pointed tail
      [
        ['M', 248, 404],
        ['L', 256, 430],
        ['L', 264, 404],
        ['Z'],
      ],
      // Heart-oval sea-turtle carapace (cradling Shell Crown at 256, 132.8)
      [
        ['M', 256, 120],
        ['C', 310, 120, 344, 168, 342, 240],
        ['C', 340, 314, 306, 382, 256, 398],
        ['C', 206, 382, 172, 314, 170, 240],
        ['C', 168, 168, 202, 120, 256, 120],
        ['Z'],
      ],
    ],
    stencils: [
      [
        ['M', 256, 138],
        ['C', 298, 138, 326, 178, 325, 240],
        ['C', 323, 302, 295, 360, 256, 378],
        ['C', 217, 360, 189, 302, 187, 240],
        ['C', 186, 178, 214, 138, 256, 138],
        ['Z'],
      ],
      [['M', 256, 154], ['L', 278, 176], ['L', 274, 218], ['L', 238, 218], ['L', 234, 176], ['L', 256, 154]],
      [['M', 274, 218], ['L', 276, 272], ['L', 236, 272], ['L', 238, 218]],
      [['M', 276, 272], ['L', 270, 326], ['L', 242, 326], ['L', 236, 272]],
      [['M', 256, 326], ['L', 256, 378]],
      [['M', 234, 176], ['L', 196, 192]],
      [['M', 278, 176], ['L', 316, 192]],
      [['M', 238, 218], ['L', 188, 244]],
      [['M', 274, 218], ['L', 324, 244]],
      [['M', 236, 272], ['L', 194, 304]],
      [['M', 276, 272], ['L', 318, 304]],
      [['M', 242, 326], ['L', 212, 352]],
      [['M', 270, 326], ['L', 300, 352]],
    ],
  },

  // 2. THE BULL — bulls_horn (407.2, 326.7), bulls_shoulder (281.0, 183.3), bulls_hoof (107.2, 272.6)
  the_bull: {
    id: 'the_bull',
    centerRaDeg: 4.362,
    centerDecDeg: -15.419,
    upRaDeg: 96.791,
    upDecDeg: -8.738,
    halfSpan: 0.44,
    gridN: 16,
    parts: [
      // Athletic charging bull: humped shoulder at (281, 183), lowered head with sweeping forward horn through (407, 327),
      // tucked galloping forelegs, taut flank, and kicking hind hoof right through (107, 273)
      [
        ['M', 282, 162],
        // Powerful shoulder hump sloping into thick crest of neck
        ['C', 312, 164, 336, 196, 352, 238],
        // Bull ear flicked back
        ['L', 338, 224],
        ['L', 344, 244],
        // Upper secondary horn curving up-right
        ['C', 368, 232, 396, 232, 416, 248],
        ['C', 398, 252, 380, 256, 366, 266],
        // Sweeping primary charging horn spearing through bulls_horn (407.2, 326.7) and hooking upward at tip
        ['C', 384, 286, 398, 314, 414, 326],
        ['C', 426, 334, 440, 324, 446, 310],
        ['C', 446, 330, 430, 344, 408, 340],
        ['C', 390, 336, 376, 322, 364, 306],
        // Distinct chiseled bovine face & broad squared muzzle
        ['L', 376, 346],
        ['C', 378, 358, 364, 366, 350, 360],
        ['L', 332, 340],
        // Muscular brisket & two crisp galloping forelegs
        ['C', 320, 344, 306, 340, 294, 330],
        // Front right foreleg reaching forward-down
        ['L', 324, 386],
        ['L', 312, 394],
        ['L', 278, 342],
        // Folded left foreleg tucked under chest
        ['L', 252, 378],
        ['L', 218, 366],
        ['L', 224, 352],
        ['L', 248, 358],
        ['L', 258, 324],
        // Athletic tucked waist & flank (not saggy!)
        ['C', 228, 316, 198, 298, 176, 282],
        // Lower supporting hind leg
        ['L', 148, 338],
        ['L', 132, 334],
        ['L', 154, 280],
        // Driving upper hind leg kicking straight through bulls_hoof (107.2, 272.6)
        ['L', 94, 282],
        ['L', 88, 266],
        ['L', 152, 256],
        // Muscular croup & strong topline rising into shoulder hump
        ['C', 158, 224, 176, 204, 204, 202],
        ['C', 230, 200, 248, 194, 262, 174],
        ['C', 268, 166, 274, 162, 282, 162],
        ['Z'],
      ],
      // Slender whip-curved bull tail with terminal tassel
      [
        ['M', 166, 214],
        ['C', 142, 192, 118, 178, 96, 188],
        ['C', 82, 194, 78, 208, 92, 212],
        ['C', 104, 214, 112, 200, 128, 198],
        ['C', 142, 198, 152, 210, 162, 224],
        ['Z'],
      ],
    ],
    stencils: [
      // Shoulder hump & neck muscle crease
      [['M', 322, 246], ['C', 310, 214, 292, 196, 268, 198]],
      // Athletic ribcage & hip contour
      [['M', 254, 246], ['C', 236, 274, 212, 292, 186, 288]],
      // Fierce brow & eye slit
      [['M', 350, 292], ['L', 362, 302]],
    ],
  },

  // 3. THE RAT (Kiore) — rats_nose (107.8, 244.0), rats_ear (258.6, 290.2), rats_tail (404.8, 174.8)
  the_rat: {
    id: 'the_rat',
    centerRaDeg: 44.584,
    centerDecDeg: -13.598,
    upRaDeg: 311.179,
    upDecDeg: -13.796,
    halfSpan: 0.44,
    gridN: 16,
    parts: [
      // Nimble Polynesian kiore with delicate whiskered nose at (108, 244), twin rounded rat ears at (216, 262) & (259, 290),
      // plump arched body, dainty paws, and long whip-tail curling high to (405, 175)
      [
        ['M', 98, 242],
        // Pointed Roman rodent snout enclosing rats_nose (107.8, 244.0)
        ['C', 112, 232, 142, 240, 172, 254],
        // Front rounded ear
        ['C', 182, 240, 204, 240, 212, 258],
        ['L', 224, 270],
        // Prominent main rounded kiore ear enclosing rats_ear (258.6, 290.2)
        ['C', 236, 256, 268, 258, 278, 280],
        ['C', 284, 294, 274, 308, 260, 310],
        // Plump arched rodent back & rump
        ['C', 302, 294, 344, 304, 362, 334],
        // Long tapering whip-tail sweeping gracefully up to rats_tail (404.8, 174.8)
        ['C', 380, 304, 390, 256, 396, 210],
        ['C', 400, 184, 402, 166, 408, 158],
        ['C', 414, 152, 418, 160, 414, 174],
        ['C', 408, 208, 398, 262, 382, 318],
        ['C', 376, 338, 368, 352, 356, 362],
        // Hind foot
        ['L', 338, 394],
        ['C', 330, 402, 302, 402, 298, 392],
        ['L', 324, 376],
        // Soft rounded belly
        ['C', 286, 382, 242, 376, 208, 354],
        // Two dainty forepaws reaching forward
        ['L', 176, 374],
        ['C', 164, 380, 154, 372, 162, 362],
        ['L', 188, 338],
        ['L', 158, 346],
        ['C', 148, 348, 144, 338, 154, 332],
        ['L', 180, 320],
        // Rounded cheek & chin tapering back to nose tip
        ['C', 150, 306, 124, 278, 102, 256],
        ['C', 94, 250, 92, 244, 98, 242],
        ['Z'],
      ],
    ],
    stencils: [
      // Inner ear hollow cupping rats_ear
      [['M', 246, 282], ['C', 252, 270, 268, 272, 268, 290]],
      // Haunch & shoulder creases
      [['M', 316, 328], ['C', 306, 348, 314, 366, 328, 372]],
      [['M', 214, 308], ['C', 206, 326, 208, 342, 218, 348]],
      // Eye bead
      [['M', 154, 258], ['Q', 164, 256, 168, 264]],
    ],
  },

  // 4. THE BOAR (Pua'a) — boars_tusk (236.3, 102.4), boars_spine (266.8, 256.3), boars_bristle (275.7, 409.6)
  the_boar: {
    id: 'the_boar',
    centerRaDeg: 72.537,
    centerDecDeg: 43.734,
    upRaDeg: 60.677,
    upDecDeg: -45.648,
    halfSpan: 0.44,
    gridN: 16,
    parts: [
      // Unmistakable thick-chested wild boar (pua'a) leaping upward: flat pig snout disk at top,
      // gleaming curved ivory tusks enclosing boars_tusk (236, 102), pricked boar ears, deep barrel shoulder,
      // bristled hog-mane crest through boars_spine (267, 256) & boars_bristle (276, 410), cloven trotters & curly pig tail!
      [
        // Flat upturned pig snout disk (unmistakably porcine, never reptilian!)
        ['M', 238, 66],
        ['L', 262, 70],
        ['C', 266, 82, 268, 98, 274, 114],
        // Forward-pricked wild boar ear
        ['L', 308, 116],
        ['L', 302, 134],
        ['L', 284, 140],
        // Massive thick wild-boar neck & arched bristled hog-mane (short dense hair tufts)
        ['C', 308, 162, 322, 194, 324, 228],
        ['L', 314, 234],
        ['L', 324, 256],
        ['L', 314, 264],
        ['L', 320, 290],
        ['L', 310, 298],
        // Tapering boar loin & bristled rump enclosing boars_bristle (275.7, 409.6)
        ['C', 312, 336, 306, 382, 292, 418],
        // Classic looped curly pig tail!
        ['C', 308, 426, 316, 444, 304, 454],
        ['C', 292, 462, 278, 452, 286, 440],
        ['C', 292, 432, 298, 438, 294, 444],
        ['L', 278, 428],
        // Two slender cloven-hoofed hind trotters kicking downward-left
        ['L', 234, 456],
        ['L', 222, 446],
        ['L', 252, 414],
        ['L', 198, 434],
        ['L', 190, 420],
        ['L', 236, 390],
        // Taut waist swelling into massive deep barrel boar chest (wide 165px chest!)
        ['C', 214, 354, 178, 308, 166, 252],
        // Two slender cloven-hoofed front trotters tucked in a leap
        ['L', 124, 222],
        ['L', 132, 208],
        ['L', 168, 226],
        ['L', 136, 182],
        ['L', 148, 170],
        ['L', 186, 198],
        // Heavy boar jowl & dramatic upward-curling ivory tusk right through boars_tusk (236.3, 102.4)
        ['C', 192, 166, 206, 142, 222, 124],
        ['C', 202, 118, 196, 96, 212, 82],
        ['C', 218, 96, 226, 104, 236, 104],
        ['C', 234, 88, 232, 74, 238, 66],
        ['Z'],
      ],
    ],
    stencils: [
      // Bristled dorsal hog-mane ridge groove along boars_spine -> boars_bristle
      [['M', 284, 158], ['C', 298, 224, 296, 314, 280, 396]],
      // Massive boar shoulder-shield crease
      [['M', 256, 182], ['C', 222, 198, 198, 232, 202, 274]],
      // Haunch muscle groove
      [['M', 268, 356], ['C', 250, 368, 242, 386, 246, 404]],
    ],
  },

  // 5. THE CRAB — crabs_left_claw (209.8, 216.5), crabs_shell (255.5, 256.5), crabs_right_claw (125.8, 383.3), crabs_eye (385.4, 129.5)
  the_crab: {
    id: 'the_crab',
    centerRaDeg: 120.0,
    centerDecDeg: 28.876,
    upRaDeg: 55.275,
    upDecDeg: -37.748,
    halfSpan: 0.78,
    gridN: 18,
    parts: [
      // Wide, unmistakable Polynesian reef/swimming crab facing TOP-LEFT (135 deg):
      // Wide winged carapace centered at (290, 276) enclosing crabs_shell (256, 256) and winged spine/stalked eye at crabs_eye (385, 130),
      // TWO bold open crab pincer claws reaching forward-left (crabs_left_claw at 210, 216 & crabs_right_claw at 126, 383),
      // and 4 symmetrical pairs of jointed walking legs fanning out behind/sides!
      [
        // Wide scalloped crab carapace (rear at bottom-right, front facing top-left!)
        ['M', 216, 248],
        ['C', 226, 204, 266, 166, 322, 146],
        // Winged lateral carapace spine & stalked eye reaching crabs_eye (385.4, 129.5)
        ['L', 396, 118],
        ['C', 406, 116, 408, 128, 398, 136],
        ['C', 382, 152, 378, 176, 384, 206],
        // Rounded rear-right & rear carapace margin
        ['C', 392, 254, 376, 306, 340, 338],
        ['C', 302, 370, 250, 372, 216, 344],
        ['C', 194, 324, 198, 284, 216, 248],
        ['Z'],
      ],
      // Bold Left Cheliped (Crab's Left Claw) sweeping forward-up-left through crabs_left_claw (209.8, 216.5)
      [
        ['M', 248, 206],
        ['C', 232, 186, 212, 174, 188, 172],
        // Open crab pincer jaws!
        ['C', 162, 152, 132, 156, 122, 176],
        ['C', 118, 186, 130, 192, 144, 186],
        ['L', 170, 188],
        ['L', 146, 206],
        ['C', 136, 214, 144, 228, 162, 226],
        ['C', 186, 224, 212, 228, 232, 236],
        ['Z'],
      ],
      // Bold Right Cheliped (Crab's Right Claw) sweeping forward-down-left through crabs_right_claw (125.8, 383.3)
      [
        ['M', 214, 314],
        ['C', 186, 324, 162, 340, 148, 358],
        // Open crab pincer jaws framing (125.8, 383.3)
        ['C', 122, 356, 94, 368, 88, 390],
        ['C', 86, 400, 98, 404, 112, 394],
        ['L', 136, 384],
        ['L', 114, 408],
        ['C', 106, 418, 116, 430, 134, 424],
        ['C', 162, 414, 184, 392, 196, 368],
        ['C', 212, 356, 226, 342, 234, 330],
        ['Z'],
      ],
      // Two front stalked eyes peeking between the two claws!
      [['M', 218, 256], ['L', 194, 246], ['C', 186, 244, 184, 254, 192, 258], ['L', 214, 268], ['Z']],
      [['M', 210, 282], ['L', 186, 282], ['C', 178, 282, 178, 292, 186, 294], ['L', 210, 294], ['Z']],
      // Symmetrical jointed crab walking legs on BOTH upper-right & lower-right flanks!
      [['M', 268, 178], ['Q', 262, 132, 236, 104], ['L', 252, 98], ['Q', 278, 128, 286, 170], ['Z']],
      [['M', 302, 160], ['Q', 306, 114, 286, 86], ['L', 302, 82], ['Q', 322, 112, 320, 154], ['Z']],
      [['M', 336, 148], ['Q', 348, 108, 336, 80], ['L', 352, 78], ['Q', 364, 108, 352, 146], ['Z']],
      [['M', 378, 212], ['Q', 428, 214, 456, 244], ['L', 442, 254], ['Q', 416, 230, 376, 230], ['Z']],
      [['M', 374, 254], ['Q', 424, 268, 444, 306], ['L', 428, 314], ['Q', 408, 282, 366, 270], ['Z']],
      [['M', 356, 296], ['Q', 398, 322, 410, 362], ['L', 394, 366], ['Q', 382, 332, 344, 310], ['Z']],
    ],
    stencils: [
      // Classic crab carapace grooves around crabs_shell (256, 256)
      [
        ['M', 238, 256],
        ['C', 246, 220, 280, 190, 322, 182],
        ['C', 358, 198, 366, 244, 348, 286],
        ['C', 326, 328, 278, 340, 244, 318],
        ['C', 228, 304, 230, 280, 238, 256],
        ['Z'],
      ],
      [['M', 274, 242], ['Q', 298, 262, 294, 292]],
      [['M', 310, 224], ['Q', 330, 248, 322, 278]],
    ],
  },

  // 6. THE HORSE — horses_crown (248.2, 396.8), horses_mane (186.9, 321.5), horses_heart (251.1, 125.3), horses_tail (324.3, 326.8)
  the_horse: {
    id: 'the_horse',
    centerRaDeg: 19.504,
    centerDecDeg: 48.928,
    upRaDeg: 17.176,
    upDecDeg: -41.048,
    halfSpan: 0.70,
    gridN: 18,
    parts: [
      // Classical Celestial Steed (inverted above the southern surf just like Pegasus so his Crown skims the sea foam,
      // and wheeling upright as he circles the Steadfast Peg in Act III!):
      // Crisp equine head facing left with Crown & ears at horses_crown (248, 397),
      // arched neck & mane through horses_mane (187, 322), deep chest & galloping forelegs through horses_heart (251, 125),
      // muscular croup & flowing tail through horses_tail (324, 327)!
      [
        // Slim chiseled equine muzzle facing left
        ['M', 168, 408],
        ['C', 160, 404, 160, 392, 170, 388],
        // Distinct equine chin & jowl cheek-curve into crisp throatlatch notch!
        ['C', 184, 384, 198, 388, 208, 378],
        ['C', 182, 354, 168, 318, 174, 276],
        // Defined horse brisket & chest swelling toward horses_heart (251.1, 125.3)
        ['C', 178, 240, 172, 206, 196, 176],
        // Leading galloping foreleg reaching boldly forward-up with bent knee & hoof
        ['L', 142, 152],
        ['L', 118, 178],
        ['L', 106, 168],
        ['L', 132, 134],
        ['L', 208, 156],
        // Deep barrel brisket & second galloping foreleg framing horses_heart (251.1, 125.3)
        ['C', 220, 134, 234, 116, 248, 110],
        ['L', 210, 76],
        ['L', 188, 92],
        ['L', 178, 82],
        ['L', 214, 58],
        ['L', 266, 108],
        // Taut equine belly & flank sweeping right to muscular hindquarters
        ['C', 274, 148, 294, 180, 324, 196],
        // Two powerful galloping hind legs kicking skyward-right
        ['L', 376, 134],
        ['L', 398, 144],
        ['L', 392, 156],
        ['L', 378, 150],
        ['L', 344, 204],
        ['L', 404, 184],
        ['L', 418, 202],
        ['L', 406, 210],
        ['L', 396, 198],
        ['L', 348, 224],
        // Rounded muscular croup descending to tail base
        ['C', 356, 256, 348, 286, 328, 304],
        // Lush plumed horse tail streaming right-downward through horses_tail (324.3, 326.8)
        ['C', 354, 316, 386, 338, 408, 370],
        ['C', 378, 372, 344, 358, 320, 338],
        ['C', 310, 328, 304, 316, 304, 304],
        // Smooth horizontal equine saddle-back running from croup (304, 304) to withers (202, 304)
        ['C', 274, 294, 236, 294, 202, 304],
        // Flowing scalloped mane locks sweeping through horses_mane (186.9, 321.5) down to poll!
        ['L', 180, 314],
        ['L', 194, 322],
        ['L', 184, 336],
        ['L', 204, 344],
        ['L', 198, 358],
        ['C', 216, 368, 232, 382, 246, 392],
        // Two crisp pricked equine ears right at horses_crown (248.2, 396.8)!
        ['L', 268, 400],
        ['L', 252, 406],
        ['L', 258, 424],
        ['L', 238, 408],
        // Clean equine forehead/bridge of nose tapering to muzzle (168, 408)
        ['C', 216, 412, 188, 412, 168, 408],
        ['Z'],
      ],
    ],
    stencils: [
      // Flowing mane locks groove along the arched neck
      [['M', 184, 308], ['C', 178, 334, 194, 364, 226, 386]],
      // Shoulder & ribcage muscle crease near horses_heart
      [['M', 228, 172], ['C', 248, 198, 262, 234, 258, 270]],
      // Hindquarter haunch & tail plume grooves
      [['M', 316, 224], ['C', 326, 248, 324, 274, 310, 294]],
      [['M', 322, 322], ['Q', 352, 342, 380, 358]],
    ],
  },

  // 7. THE FRIGATEBIRD ('Iwa) — birds_wingtip (348.2, 173.3), frigatebirds_tail (172.9, 206.7), frigatebirds_beak (163.4, 339.1)
  the_frigatebird: {
    id: 'the_frigatebird',
    centerRaDeg: 128.457,
    centerDecDeg: -66.388,
    upRaDeg: 149.398,
    upDecDeg: 22.208,
    halfSpan: 0.34,
    gridN: 16,
    parts: [
      // Iconic Polynesian 'iwa (great frigatebird) stooping downward: scissor-forked tail at (173, 207),
      // long hooked bill through (163, 339), and dramatic W-bent sea-wings reaching (348, 173)
      [
        // Deeply forked scissor tail streamers framing frigatebirds_tail (172.9, 206.7)
        ['M', 144, 114],
        ['C', 154, 146, 164, 176, 173, 200],
        ['C', 182, 176, 192, 146, 206, 116],
        ['C', 202, 156, 194, 196, 188, 232],
        // Long crooked right wing sweeping high through birds_wingtip (348.2, 173.3)
        ['L', 268, 206],
        ['L', 428, 132],
        ['C', 408, 158, 378, 180, 344, 194],
        ['L', 274, 240],
        ['L', 194, 274],
        // Sleek head & long hooked frigatebird beak spearing through frigatebirds_beak (163.4, 339.1)
        ['C', 192, 296, 182, 314, 172, 326],
        ['L', 166, 374],
        ['C', 164, 384, 152, 382, 154, 370],
        ['L', 158, 324],
        // Gular throat pouch & chest
        ['C', 146, 310, 144, 290, 154, 274],
        // Sweeping crooked left wing balancing the silhouette
        ['L', 96, 258],
        ['L', 34, 198],
        ['C', 64, 206, 94, 218, 118, 230],
        ['L', 158, 240],
        ['C', 156, 202, 150, 158, 144, 114],
        ['Z'],
      ],
    ],
    stencils: [
      [['M', 204, 250], ['L', 270, 222], ['L', 362, 170]],
      [['M', 152, 254], ['L', 102, 240], ['L', 58, 210]],
      [['M', 173, 216], ['L', 168, 298]],
    ],
  },

  // 8. THE GECKO (Mo'o) — geckos_tongue (411.6, 338.9), geckos_crest (307.4, 252.5), geckos_heart (217.2, 170.1), geckos_tail (97.8, 197.9)
  the_gecko: {
    id: 'the_gecko',
    centerRaDeg: 327.264,
    centerDecDeg: -0.347,
    upRaDeg: 57.382,
    upDecDeg: -18.835,
    halfSpan: 0.84,
    gridN: 18,
    parts: [
      // Dorsal Polynesian mo'o (gecko) clinging across the sky dome with sinuous S-spine & splayed adhesive toes
      [
        ['M', 62, 232],
        ['C', 58, 206, 78, 184, 108, 178],
        ['C', 142, 172, 172, 154, 202, 148],
        ['L', 214, 112],
        ['L', 200, 94],
        ['L', 218, 100],
        ['L', 228, 86],
        ['L', 232, 106],
        ['L', 248, 102],
        ['L', 234, 120],
        ['L', 232, 152],
        ['C', 266, 166, 298, 196, 322, 232],
        ['L', 364, 214],
        ['L', 368, 194],
        ['L', 378, 210],
        ['L', 394, 204],
        ['L', 382, 222],
        ['L', 396, 232],
        ['L', 372, 232],
        ['L', 338, 252],
        ['C', 364, 264, 390, 286, 398, 314],
        ['L', 424, 342],
        ['L', 442, 344],
        ['L', 428, 352],
        ['L', 434, 368],
        ['L', 418, 352],
        ['L', 390, 324],
        ['C', 362, 322, 334, 306, 314, 282],
        ['L', 284, 318],
        ['L', 292, 338],
        ['L', 276, 328],
        ['L', 266, 344],
        ['L', 266, 324],
        ['L', 248, 328],
        ['L', 268, 308],
        ['L', 294, 266],
        ['C', 268, 234, 242, 204, 210, 194],
        ['L', 190, 232],
        ['L', 196, 252],
        ['L', 180, 240],
        ['L', 168, 254],
        ['L', 170, 234],
        ['L', 154, 236],
        ['L', 174, 220],
        ['L', 188, 188],
        ['C', 154, 188, 122, 202, 94, 216],
        ['C', 78, 224, 66, 238, 62, 232],
        ['Z'],
      ],
    ],
    stencils: [
      [
        ['M', 96, 198],
        ['C', 144, 182, 182, 166, 218, 172],
        ['C', 256, 180, 286, 218, 312, 254],
        ['Q', 342, 286, 374, 306],
      ],
      [['M', 206, 160], ['L', 222, 172], ['L', 202, 182]],
      [['M', 258, 194], ['L', 270, 210], ['L', 248, 216]],
      [['M', 298, 238], ['L', 310, 254], ['L', 290, 260]],
    ],
  },

  // 9. THE SHARK (Mano) — sharks_jaw (89.7, 230.2), sharks_fin (257.9, 256.3), sharks_tail (422.9, 281.8)
  the_shark: {
    id: 'the_shark',
    centerRaDeg: 80.0,
    centerDecDeg: -28.913,
    upRaDeg: 354.284,
    upDecDeg: 7.701,
    halfSpan: 0.84,
    gridN: 18,
    parts: [
      [
        ['M', 48, 202],
        ['C', 96, 184, 164, 188, 222, 206],
        ['C', 242, 174, 264, 144, 290, 134],
        ['C', 282, 164, 278, 194, 286, 218],
        ['C', 324, 232, 356, 248, 382, 260],
        ['L', 396, 246],
        ['L', 402, 264],
        ['C', 426, 238, 452, 204, 476, 188],
        ['C', 468, 224, 454, 258, 440, 280],
        ['C', 450, 304, 458, 330, 454, 350],
        ['C', 434, 336, 418, 310, 404, 288],
        ['C', 368, 290, 326, 292, 282, 290],
        ['L', 268, 308],
        ['L', 254, 290],
        ['C', 238, 324, 222, 356, 198, 376],
        ['C', 194, 350, 196, 318, 188, 288],
        ['C', 148, 282, 108, 270, 76, 252],
        ['L', 108, 236],
        ['L', 66, 224],
        ['C', 52, 218, 44, 208, 48, 202],
        ['Z'],
      ],
    ],
    stencils: [
      [['M', 148, 222], ['Q', 144, 246, 150, 266]],
      [['M', 162, 224], ['Q', 158, 246, 164, 266]],
      [['M', 176, 226], ['Q', 172, 248, 178, 266]],
      [['M', 198, 236], ['C', 264, 242, 334, 258, 396, 274]],
    ],
  },

  // 10. THE WHALE (Tohora) — whales_spout (324.0, 137.2), whales_brow (189.8, 201.9), whales_fluke (210.4, 374.4)
  the_whale: {
    id: 'the_whale',
    centerRaDeg: 20.75,
    centerDecDeg: -58.674,
    upRaDeg: 312.416,
    upDecDeg: 12.664,
    halfSpan: 0.36,
    gridN: 16,
    parts: [
      [
        ['M', 306, 198],
        ['C', 322, 206, 326, 224, 308, 238],
        ['C', 292, 250, 272, 258, 256, 264],
        ['C', 284, 282, 316, 308, 332, 336],
        ['C', 322, 344, 298, 332, 274, 312],
        ['C', 256, 298, 242, 286, 232, 278],
        ['C', 222, 306, 218, 334, 220, 358],
        ['C', 252, 362, 286, 374, 306, 396],
        ['C', 282, 404, 248, 398, 222, 386],
        ['L', 210, 396],
        ['L', 198, 386],
        ['C', 172, 398, 138, 404, 114, 396],
        ['C', 134, 374, 168, 362, 198, 358],
        ['C', 184, 326, 162, 278, 164, 228],
        ['C', 166, 176, 204, 152, 256, 166],
        ['C', 278, 172, 294, 184, 306, 198],
        ['Z'],
      ],
      [
        ['M', 282, 168],
        ['C', 294, 142, 306, 114, 292, 92],
        ['C', 282, 78, 306, 70, 320, 88],
        ['C', 328, 98, 328, 112, 324, 124],
        ['C', 338, 108, 362, 104, 372, 120],
        ['C', 380, 134, 364, 148, 348, 142],
        ['C', 332, 138, 312, 152, 296, 174],
        ['Z'],
      ],
    ],
    stencils: [
      [['M', 304, 216], ['Q', 276, 224, 254, 214]],
      [['M', 292, 234], ['Q', 264, 250, 236, 254]],
      [['M', 276, 248], ['Q', 252, 262, 228, 266]],
      [['M', 188, 202], ['C', 184, 252, 196, 308, 210, 364]],
    ],
  },
});
