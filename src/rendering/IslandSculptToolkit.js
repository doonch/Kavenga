/**
 * Shared procedural terrain heightfield engine, color blending math, and Polynesian
 * botanical & architectural prop builders used across Acts I, II, and III island sculptors.
 */

import * as THREE from 'three';

export function clamp01(v) {
  return Math.max(0.0, Math.min(1.0, v));
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function smoothstep(edge0, edge1, x) {
  if (Math.abs(edge1 - edge0) < 1e-6) return x >= edge1 ? 1.0 : 0.0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mixRgb(c1, c2, t) {
  const k = clamp01(t);
  return [
    lerp(c1[0], c2[0], k),
    lerp(c1[1], c2[1], k),
    lerp(c1[2], c2[2], k),
  ];
}

export function angDiffSigned(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

export function angDiffAbs(a, b) {
  return Math.abs(angDiffSigned(a, b));
}

export function arcMask(theta, center, halfSpan, feather = 0.085) {
  const d = angDiffAbs(theta, center);
  return 1.0 - smoothstep(halfSpan - feather, halfSpan + feather, d);
}

export function gaussian2D(x, z, cx, cz, rx, rz = rx, rotRad = 0.0) {
  const dx = x - cx;
  const dz = z - cz;
  const c = Math.cos(rotRad);
  const s = Math.sin(rotRad);
  const ux = (dx * c + dz * s) / Math.max(0.1, rx);
  const uz = (-dx * s + dz * c) / Math.max(0.1, rz);
  return Math.exp(-(ux * ux + uz * uz));
}

/**
 * Creates a material tracker so WorldCuesRenderer can fade all island meshes smoothly across sea haze.
 */
export function createMaterialTracker() {
  const materials = [];
  const trackMat = (mat, baseOpacity = undefined) => {
    mat.transparent = true;
    if (baseOpacity !== undefined) {
      mat.opacity = baseOpacity;
      mat.userData.baseOpacity = baseOpacity;
    } else if (mat.opacity < 0.999) {
      mat.userData.baseOpacity = mat.opacity;
    } else {
      mat.opacity = 1.0;
    }
    materials.push(mat);
    return mat;
  };
  return { materials, trackMat };
}

/**
 * Builds a polar heightfield BufferGeometry from `evalPoint(x, z)` -> `{ h, rgb }`
 * (or uses `colorFn(sample, slope, x, z, r, theta)` when provided).
 */
export function buildPolarTerrainGeometry({
  evalPoint,
  colorFn = null,
  maxRadius = 56.0,
  nRings = 58,
  nSegs = 92,
  radialPower = 1.0,
}) {
  const positions = [];
  const colors = [];
  const indices = [];
  const grid = [];
  const eps = 0.8;

  for (let i = 0; i <= nRings; i += 1) {
    const t = i / nRings;
    const r = Math.max(
      0.04,
      maxRadius *
        (radialPower === 1.0
          ? t
          : lerp(t, Math.pow(t, radialPower), 0.25))
    );
    const row = [];

    for (let j = 0; j < nSegs; j += 1) {
      const theta = (j / nSegs) * Math.PI * 2.0;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const sample = evalPoint(x, z);
      let rgb = sample.rgb;
      if (colorFn) {
        const hx = evalPoint(x + eps, z).h - sample.h;
        const hz = evalPoint(x, z + eps).h - sample.h;
        const slope = Math.hypot(hx, hz) / eps;
        rgb = colorFn(sample, slope, x, z, r, theta);
      }

      const idx = positions.length / 3;
      positions.push(x, sample.h, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
      row.push(idx);
    }
    grid.push(row);
  }

  for (let i = 0; i < nRings; i += 1) {
    for (let j = 0; j < nSegs; j += 1) {
      const jNext = (j + 1) % nSegs;
      const v00 = grid[i][j];
      const v01 = grid[i][jNext];
      const v10 = grid[i + 1][j];
      const v11 = grid[i + 1][jNext];
      indices.push(v00, v01, v11, v00, v11, v10);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Adds multi-tier wind-leaning coconut palms (segmented curved trunk, coconuts, 2-tier star canopy).
 * Each entry in `points`: `[x, y, z, leanAzRad, scale = 1.0, leanAmt = 0.2]`.
 */
export function addCoconutGroves(
  group,
  trackMat,
  points,
  {
    trunkHex = 0x765334,
    frondDarkHex = 0x36752b,
    frondSunHex = 0x4e8f34,
    nutHex = 0x6d5828,
  } = {}
) {
  if (!points.length) return;
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: trunkHex, roughness: 0.86 })
  );
  const frondDarkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: frondDarkHex, roughness: 0.78 })
  );
  const frondSunMat = trackMat(
    new THREE.MeshStandardMaterial({ color: frondSunHex, roughness: 0.76 })
  );
  const nutMat = trackMat(
    new THREE.MeshStandardMaterial({ color: nutHex, roughness: 0.8 })
  );

  const lowerSegGeo = new THREE.CylinderGeometry(0.2, 0.32, 1.95, 6);
  lowerSegGeo.translate(0, 0.975, 0);
  const upperSegGeo = new THREE.CylinderGeometry(0.13, 0.2, 2.0, 6);
  upperSegGeo.translate(0, 1.0, 0);
  const crownLowGeo = new THREE.ConeGeometry(1.72, 0.82, 7);
  const crownHighGeo = new THREE.ConeGeometry(1.35, 0.7, 7);
  const nutGeo = new THREE.DodecahedronGeometry(0.26, 0);

  for (let i = 0; i < points.length; i += 1) {
    const [px, py, pz, leanAz = 0.0, scale = 1.0, leanAmt = 0.2] = points[i];
    const palm = new THREE.Group();
    palm.position.set(px, py, pz);
    palm.scale.setScalar(scale);
    palm.rotation.y = leanAz;

    const lower = new THREE.Mesh(lowerSegGeo, trunkMat);
    lower.rotation.z = leanAmt * 0.65;
    palm.add(lower);

    const upperPivot = new THREE.Group();
    upperPivot.position.set(
      -Math.sin(leanAmt * 0.65) * 1.9,
      Math.cos(leanAmt * 0.65) * 1.9,
      0
    );
    upperPivot.rotation.z = leanAmt * 1.15;
    upperPivot.add(new THREE.Mesh(upperSegGeo, trunkMat));

    const crownHub = new THREE.Group();
    crownHub.position.set(0, 1.98, 0);
    crownHub.rotation.z = -leanAmt * 0.85;

    const nuts = new THREE.Mesh(nutGeo, nutMat);
    nuts.position.y = -0.1;
    crownHub.add(nuts);

    const cLow = new THREE.Mesh(
      crownLowGeo,
      i % 2 === 0 ? frondDarkMat : frondSunMat
    );
    cLow.scale.set(1.24, 0.48, 1.24);
    crownHub.add(cLow);

    const cHigh = new THREE.Mesh(
      crownHighGeo,
      i % 2 === 0 ? frondSunMat : frondDarkMat
    );
    cHigh.position.y = 0.28;
    cHigh.rotation.y = 0.45;
    cHigh.scale.set(1.14, 0.52, 1.14);
    crownHub.add(cHigh);

    upperPivot.add(crownHub);
    palm.add(upperPivot);
    group.add(palm);
  }
}

/**
 * Adds spreading broadleaf Polynesian trees (breadfruit 'uru, banyan aoa, miro/koa timber, or crimson 'ohi'a lehua).
 * Each entry in `points`: `[x, y, z, scale = 1.0, rotY = 0.0]`.
 */
export function addBroadleafTrees(
  group,
  trackMat,
  points,
  {
    trunkHex = 0x5c3e26,
    canopyHexA = 0x285c26,
    canopyHexB = 0x3b742c,
    blossomHex = null,
  } = {}
) {
  if (!points.length) return;
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: trunkHex, roughness: 0.88 })
  );
  const canMatA = trackMat(
    new THREE.MeshStandardMaterial({ color: canopyHexA, roughness: 0.84 })
  );
  const canMatB = trackMat(
    new THREE.MeshStandardMaterial({ color: canopyHexB, roughness: 0.82 })
  );
  const blossomMat = blossomHex
    ? trackMat(
        new THREE.MeshStandardMaterial({ color: blossomHex, roughness: 0.72 })
      )
    : null;

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 2.2, 6);
  trunkGeo.translate(0, 1.1, 0);
  const lobeGeo = new THREE.DodecahedronGeometry(1.45, 1);
  const bloomGeo = blossomHex ? new THREE.DodecahedronGeometry(0.48, 0) : null;

  for (let i = 0; i < points.length; i += 1) {
    const [tx, ty, tz, scale = 1.0, rotY = 0.0] = points[i];
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    tree.scale.setScalar(scale);
    tree.rotation.y = rotY;

    tree.add(new THREE.Mesh(trunkGeo, trunkMat));

    const mainCrown = new THREE.Mesh(lobeGeo, i % 2 === 0 ? canMatA : canMatB);
    mainCrown.position.set(0.0, 2.55, 0.0);
    mainCrown.scale.set(1.25, 0.78, 1.18);
    tree.add(mainCrown);

    const sideCrown = new THREE.Mesh(lobeGeo, i % 2 === 0 ? canMatB : canMatA);
    sideCrown.position.set(0.75, 2.2, 0.35);
    sideCrown.scale.set(0.85, 0.62, 0.85);
    tree.add(sideCrown);

    if (blossomMat && bloomGeo && i % 2 === 0) {
      const bloom = new THREE.Mesh(bloomGeo, blossomMat);
      bloom.position.set(-0.35, 3.25, 0.25);
       bloom.scale.set(1.3, 0.55, 1.2);
      tree.add(bloom);
    }

    group.add(tree);
  }
}

/**
 * Adds low coastal scrub & pandanus/naupaka/ren thickets.
 * Each entry in `points`: `[x, y, z, sx = 1.25, sy = 0.65, sz = 1.15, rotY = 0.0]`.
 */
export function addCoastalScrub(
  group,
  trackMat,
  points,
  { hexA = 0x2f6827, hexB = 0x457d2e } = {}
) {
  if (!points.length) return;
  const matA = trackMat(
    new THREE.MeshStandardMaterial({ color: hexA, roughness: 0.86 })
  );
  const matB = trackMat(
    new THREE.MeshStandardMaterial({ color: hexB, roughness: 0.84 })
  );
  const bushGeo = new THREE.DodecahedronGeometry(1.0, 1);

  for (let i = 0; i < points.length; i += 1) {
    const [bx, by, bz, sx = 1.25, sy = 0.65, sz = 1.15, rotY = 0.0] = points[i];
    const bush = new THREE.Mesh(bushGeo, i % 2 === 0 ? matA : matB);
    bush.position.set(bx, by + sy * 0.4, bz);
    bush.scale.set(sx, sy, sz);
    bush.rotation.y = rotY;
    group.add(bush);
  }
}

/**
 * Adds a curved barrier-reef shelf & breaking white surf foam arc across `[startRad, endRad]`.
 */
export function addBarrierReefArc(
  group,
  reefMat,
  foamMat,
  radius,
  startRad,
  endRad,
  segs = 32
) {
  const arcSpan = endRad - startRad;
  const reefGeo = new THREE.TorusGeometry(radius, 2.25, 6, segs, arcSpan);
  const reef = new THREE.Mesh(reefGeo, reefMat);
  reef.rotation.x = Math.PI * 0.5;
  reef.rotation.z = startRad;
  reef.scale.set(1.0, 1.0, 0.26);
  reef.position.y = 0.22;
  group.add(reef);

  const foamGeo = new THREE.TorusGeometry(radius + 1.35, 1.15, 5, segs, arcSpan);
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.rotation.x = Math.PI * 0.5;
  foam.rotation.z = startRad;
  foam.scale.set(1.0, 1.0, 0.13);
  foam.position.y = 0.29;
  group.add(foam);
}

/**
 * Adds Polynesian dwellings in regional architectural styles:
 * - `style: 'society'`: Woven reed walls + honey pandanus roof on low coral/earth plinth
 * - `style: 'marquesan'`: High dry-stone basalt `paepae` terrace + steep high-peaked `fa'e` roof
 * - `style: 'hawaiian'`: Steep A-frame `pili`-grass `hale` reaching near ground over dark stone curb
 * - `style: 'atoll'`: Bleached coral-slab curb + airy woven pandanus thatch
 * Each entry in `huts`: `{ x, y, z, rotY = 0, scale = 1, longHouse = false }`.
 */
export function addRegionalHuts(group, trackMat, huts, style = 'society') {
  if (!huts.length) return;

  const isMarquesan = style === 'marquesan';
  const isHawaiian = style === 'hawaiian';
  const isAtoll = style === 'atoll';

  const plinthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isMarquesan || isHawaiian ? 0x3b3835 : isAtoll ? 0xded6c1 : 0x8b7e6a,
      roughness: 0.92,
    })
  );
  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isMarquesan ? 0x6b472a : isHawaiian ? 0x8f7248 : 0x967247,
      roughness: 0.86,
    })
  );
  const roofMatA = trackMat(
    new THREE.MeshStandardMaterial({
      color: isHawaiian ? 0xb89658 : isMarquesan ? 0xa97e46 : 0xc69a5b,
      roughness: 0.88,
    })
  );
  const roofMatB = trackMat(
    new THREE.MeshStandardMaterial({
      color: isHawaiian ? 0xa38249 : 0xb28850,
      roughness: 0.9,
    })
  );

  const plinthH = isMarquesan ? 0.95 : 0.32;
  const plinthGeo = new THREE.BoxGeometry(3.1, plinthH, 3.9);
  const wallH = isHawaiian ? 0.75 : 1.35;
  const wallGeo = new THREE.BoxGeometry(2.45, wallH, 3.25);
  const roofH = isMarquesan ? 2.45 : isHawaiian ? 2.35 : 1.82;
  const roofGeo = new THREE.ConeGeometry(2.48, roofH, 4);

  for (let i = 0; i < huts.length; i += 1) {
    const { x, y, z, rotY = 0.0, scale = 1.0, longHouse = false } = huts[i];
    const fare = new THREE.Group();
    fare.position.set(x, y, z);
    fare.rotation.y = rotY;
    fare.scale.set(scale, scale, scale * (longHouse ? 1.65 : 1.0));

    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = plinthH * 0.42;
    fare.add(plinth);

    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = plinthH * 0.82 + wallH * 0.5;
    fare.add(walls);

    const roof = new THREE.Mesh(roofGeo, i % 2 === 0 ? roofMatA : roofMatB);
    roof.position.y = plinthH * 0.82 + wallH + roofH * 0.44;
    roof.rotation.y = Math.PI * 0.25;
    roof.scale.set(1.02, 1.0, 1.24);
    fare.add(roof);

    group.add(fare);
  }
}

/**
 * Adds a timber landing pier on pilings centered at `(x, y, z)` oriented along `rotY`.
 */
export function addTimberPier(
  group,
  trackMat,
  { x, y = 0.72, z, rotY = 0.0, length = 7.6, width = 1.5, timberHex = 0x684528 }
) {
  const mat = trackMat(
    new THREE.MeshStandardMaterial({ color: timberHex, roughness: 0.86 })
  );
  const pier = new THREE.Group();
  pier.position.set(x, y, z);
  pier.rotation.y = rotY;

  pier.add(new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, width), mat));

  const pileGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.15, 6);
  const nPairs = Math.max(3, Math.round(length / 2.0));
  for (let i = 0; i < nPairs; i += 1) {
    const lx = -length * 0.44 + (i / (nPairs - 1)) * (length * 0.88);
    for (const lz of [-width * 0.38, width * 0.38]) {
      const p = new THREE.Mesh(pileGeo, mat);
      p.position.set(lx, -0.46, lz);
      pier.add(p);
    }
  }
  group.add(pier);
}

/**
 * Adds a traditional single-outrigger lagoon canoe (va'a).
 */
export function addOutriggerCanoe(
  group,
  trackMat,
  { x, y, z, rotY = 0.0, scale = 1.0, hullHex = 0x8b522c, trimHex = 0x654326 }
) {
  const hullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: hullHex, roughness: 0.78 })
  );
  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.84 })
  );

  const vaa = new THREE.Group();
  vaa.position.set(x, y, z);
  vaa.rotation.y = rotY;
  vaa.scale.setScalar(scale);

  const hullGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.6, 8);
  hullGeo.rotateX(Math.PI * 0.5);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1.0, 0.72, 1.0);
  vaa.add(hull);

  const prowGeo = new THREE.ConeGeometry(0.22, 0.75, 6);
  const fore = new THREE.Mesh(prowGeo, hullMat);
  fore.rotation.x = -Math.PI * 0.5;
  fore.position.set(0, 0.05, -2.05);
  vaa.add(fore);

  const aft = new THREE.Mesh(prowGeo, hullMat);
  aft.rotation.x = Math.PI * 0.5;
  aft.position.set(0, 0.08, 2.05);
  vaa.add(aft);

  const amaGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.7, 6);
  amaGeo.rotateX(Math.PI * 0.5);
  const ama = new THREE.Mesh(amaGeo, trimMat);
  ama.position.set(-1.05, -0.02, 0.0);
  vaa.add(ama);

  const iakoGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.12, 5);
  iakoGeo.rotateZ(Math.PI * 0.5);
  for (const iz of [-0.75, 0.75]) {
    const iako = new THREE.Mesh(iakoGeo, trimMat);
    iako.position.set(-0.52, 0.14, iz);
    vaa.add(iako);
  }
  group.add(vaa);
}

/**
 * Adds a ceremonial stone Marae / Me'ae / Heiau court with stepped Ahu altar & upright orthostats.
 */
export function addMaraePlatform(
  group,
  trackMat,
  {
    x,
    y,
    z,
    rotY = 0.0,
    scale = 1.0,
    courtHex = 0x3d3a37,
    ahuHex = 0xcfc4ab,
    withOracleTower = false,
    withBraziers = false,
  }
) {
  const courtMat = trackMat(
    new THREE.MeshStandardMaterial({ color: courtHex, roughness: 0.92 })
  );
  const ahuMat = trackMat(
    new THREE.MeshStandardMaterial({ color: ahuHex, roughness: 0.86 })
  );

  const marae = new THREE.Group();
  marae.position.set(x, y, z);
  marae.rotation.y = rotY;
  marae.scale.setScalar(scale);

  const court = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.78, 9.2), courtMat);
  court.position.y = 0.24;
  marae.add(court);

  const ahu = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.85, 7.2), ahuMat);
  ahu.position.set(2.0, 1.15, 0.0);
  marae.add(ahu);

  for (let s = -2; s <= 2; s += 1) {
    const upright = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 2.2, 0.54),
      courtMat
    );
    upright.position.set(-1.75, 1.35, s * 1.68);
    marae.add(upright);
  }

  if (withOracleTower) {
    // Tall Hawaiian 'anu'u white tapa-draped oracle tower on the heiau platform
    const tapaMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xefe9da, roughness: 0.82 })
    );
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 5.4, 1.55),
      tapaMat
    );
    tower.position.set(0.35, 3.1, -2.4);
    marae.add(tower);
  }

  if (withBraziers) {
    const flameMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xff842b }),
      0.94
    );
    for (const bz of [-3.4, 3.4]) {
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.26, 0.75, 7),
        courtMat
      );
      bowl.position.set(-2.4, 0.95, bz);
      marae.add(bowl);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 6), flameMat);
      flame.position.set(-2.4, 1.55, bz);
      marae.add(flame);
    }
  }

  group.add(marae);
}

/**
 * Adds a miniature 12-stone Star-Ring coastal observatory (for Star Masters on Maupiti & Kiritimati).
 */
export function addStarStoneCircle(
  group,
  trackMat,
  { x, y, z, radius = 3.2, stoneHex = 0xdad2be, withBraziers = true }
) {
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: stoneHex, roughness: 0.88 })
  );
  const ring = new THREE.Group();
  ring.position.set(x, y, z);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.55, radius + 0.8, 0.28, 16),
    stoneMat
  );
  floor.position.y = 0.08;
  ring.add(floor);

  const stoneGeo = new THREE.BoxGeometry(0.32, 1.15, 0.24);
  for (let i = 0; i < 12; i += 1) {
    const ang = (i / 12) * Math.PI * 2.0;
    const st = new THREE.Mesh(stoneGeo, stoneMat);
    st.position.set(Math.cos(ang) * radius, 0.65, Math.sin(ang) * radius);
    st.rotation.y = -ang;
    ring.add(st);
  }

  if (withBraziers) {
    const fireMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xff8a30 }),
      0.92
    );
    const centerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.68, 7),
      fireMat
    );
    centerFlame.position.y = 0.52;
    ring.add(centerFlame);
  }

  group.add(ring);
}

/**
 * Adds a cascading highland waterfall ribbon + misty plunge pool.
 */
export function addWaterfallCascade(
  group,
  trackMat,
  { x, y, z, width = 1.6, height = 22.0, rotY = 0.0, tiltX = -0.38 }
) {
  const fallMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xdcf7ff,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    0.84
  );
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(width, height), fallMat);
  ribbon.position.set(x, y, z);
  ribbon.rotation.y = rotY;
  ribbon.rotation.x = tiltX;
  group.add(ribbon);

  const mistPool = new THREE.Mesh(
    new THREE.CircleGeometry(width * 1.65, 14),
    fallMat
  );
  mistPool.rotation.x = -Math.PI * 0.5;
  const bottomOffset = Math.sin(-tiltX) * (height * 0.5);
  mistPool.position.set(
    x + Math.sin(rotY) * bottomOffset,
    Math.max(0.35, y - Math.cos(tiltX) * (height * 0.5)),
    z + Math.cos(rotY) * bottomOffset
  );
  group.add(mistPool);
}

/**
 * Lofts a closed, watertight 3D giant black-lip pearl oyster / Tridacna valve
 * with undulating radial ribs on the outside and concave iridescent nacre inside.
 * Hinge umbo sits at local (0, 0, 0), fan flares along +Z.
 */
export function createGiantPearlValveGeometry({
  radius = 1.0,
  dishDepth = 0.24,
  ribCount = 9,
  ribAmp = 0.044,
  thickness = 0.06,
  uSegs = 20,
  vSegs = 32,
} = {}) {
  const positions = [];
  const colors = [];
  const indices = [];

  const pushV = (x, y, z, r, g, b) => {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    colors.push(r, g, b);
    return idx;
  };

  const topGrid = [];
  const botGrid = [];

  for (let i = 0; i <= uSegs; i += 1) {
    const u = i / uSegs;
    const topRow = [];
    const botRow = [];

    for (let j = 0; j <= vSegs; j += 1) {
      const vFrac = j / vSegs; // 0..1
      const vSym = vFrac - 0.5; // -0.5..+0.5
      const phi = vSym * Math.PI * 1.02;

      // Subtle scalloped radial margin + gentle hinge auricles near u ~ 0.14
      const ribWave = Math.cos(vSym * ribCount * Math.PI * 2.0);
      const auricle = 0.09 * Math.exp(-Math.pow((u - 0.12) / 0.09, 2.0)) * Math.pow(Math.abs(vSym) * 2.0, 2.0);
      const rEdge =
        radius *
        (0.06 +
          0.94 * u * (0.94 + 0.06 * Math.sin(u * Math.PI)) +
          0.045 * smoothstep(0.35, 1.0, u) * ribWave +
          auricle);

      const x = rEdge * Math.sin(phi);
      const z = rEdge * Math.cos(phi);

      const bowl = Math.sin(u * Math.PI * 0.88) * Math.cos(phi * 0.62);
      const yMid =
        -dishDepth * bowl +
        ribAmp * smoothstep(0.18, 1.0, u) * ribWave;

      const halfT =
        thickness *
        0.5 *
        (1.2 - 0.76 * smoothstep(0.0, 1.0, u)) *
        (0.86 + 0.14 * ribWave);

      // Inner surface: glowing cream core -> turquoise/pearl shimmer -> dark black-lip rim
      const centerGlow = 1.0 - smoothstep(0.05, 0.58, u);
      const iridBand = smoothstep(0.18, 0.52, u) * smoothstep(0.95, 0.72, u);
      const blackLip = smoothstep(0.81, 0.96, u);
      const shimmerShift = 0.5 + 0.5 * Math.sin(phi * 3.5 + u * 5.2);

      let nr = lerp(0.84, 0.42, iridBand * shimmerShift);
      let ng = lerp(0.9, 0.86, iridBand);
      let nb = lerp(0.92, 0.84, iridBand * (1.0 - 0.35 * shimmerShift));

      nr = lerp(nr, 0.97, centerGlow * 0.75);
      ng = lerp(ng, 0.96, centerGlow * 0.75);
      nb = lerp(nb, 0.91, centerGlow * 0.75);

      // Black-lip nacre outer lip (Pinctada margaritifera peacock charcoal-emerald edge)
      nr = lerp(nr, 0.14 + 0.08 * shimmerShift, blackLip);
      ng = lerp(ng, 0.23 + 0.12 * shimmerShift, blackLip);
      nb = lerp(nb, 0.25 + 0.14 * shimmerShift, blackLip);

      // Outer calcified shell: chalky limestone ridges & deep olive-umber fluted grooves
      const ribShade = 0.5 + 0.5 * ribWave;
      const umboDark = 1.0 - smoothstep(0.0, 0.36, u);
      let sr = lerp(0.46, 0.84, ribShade);
      let sg = lerp(0.42, 0.79, ribShade);
      let sb = lerp(0.36, 0.7, ribShade);
      sr = lerp(sr, 0.34, umboDark * 0.55);
      sg = lerp(sg, 0.3, umboDark * 0.55);
      sb = lerp(sb, 0.25, umboDark * 0.55);

      topRow.push(pushV(x, yMid + halfT, z, nr, ng, nb));
      botRow.push(pushV(x, yMid - halfT, z, sr, sg, sb));
    }

    topGrid.push(topRow);
    botGrid.push(botRow);
  }

  for (let i = 0; i < uSegs; i += 1) {
    for (let j = 0; j < vSegs; j += 1) {
      const ta = topGrid[i][j];
      const tb = topGrid[i][j + 1];
      const tc = topGrid[i + 1][j];
      const td = topGrid[i + 1][j + 1];
      indices.push(ta, tc, td, ta, td, tb);

      const ba = botGrid[i][j];
      const bb = botGrid[i][j + 1];
      const bc = botGrid[i + 1][j];
      const bd = botGrid[i + 1][j + 1];
      indices.push(ba, bd, bc, ba, bb, bd);
    }
  }

  // Outer scalloped lip wall (u = uSegs)
  for (let j = 0; j < vSegs; j += 1) {
    const t0 = topGrid[uSegs][j];
    const t1 = topGrid[uSegs][j + 1];
    const b0 = botGrid[uSegs][j];
    const b1 = botGrid[uSegs][j + 1];
    indices.push(b0, b1, t1, b0, t1, t0);
  }

  // Side hinge skirts (v = 0 and v = vSegs) and umbo edge (u = 0)
  for (let i = 0; i < uSegs; i += 1) {
    indices.push(
      botGrid[i][0],
      topGrid[i][0],
      topGrid[i + 1][0],
      botGrid[i][0],
      topGrid[i + 1][0],
      botGrid[i + 1][0]
    );
    indices.push(
      topGrid[i][vSegs],
      botGrid[i][vSegs],
      botGrid[i + 1][vSegs],
      topGrid[i][vSegs],
      botGrid[i + 1][vSegs],
      topGrid[i + 1][vSegs]
    );
  }
  for (let j = 0; j < vSegs; j += 1) {
    indices.push(
      topGrid[0][j],
      topGrid[0][j + 1],
      botGrid[0][j + 1],
      topGrid[0][j],
      botGrid[0][j + 1],
      botGrid[0][j]
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Instantiates a sculpted Giant Pearl Shell (paired open shell with South Seas pearl,
 * open clam pair, or harvested single half-valve).
 */
export function createGiantPearlShellGroup(
  trackMat,
  {
    mode = 'open_pearl',
    scale = 1.0,
    openAngleRad = 0.78,
    pearlType = 'cream',
    sharedValveGeo = null,
    sharedShellMat = null,
  } = {}
) {
  const valveGeo = sharedValveGeo || createGiantPearlValveGeometry();
  const shellMat =
    sharedShellMat ||
    trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.34,
        metalness: 0.22,
        transparent: true,
        opacity: 1.0,
      })
    );

  const root = new THREE.Group();
  root.scale.setScalar(scale);

  // Offset so center of shell sits nicely near local origin
  const body = new THREE.Group();
  body.position.set(0, 0.16, -0.46);
  root.add(body);

  const lowerValve = new THREE.Mesh(valveGeo, shellMat);
  lowerValve.rotation.x = -0.1;
  lowerValve.castShadow = true;
  lowerValve.receiveShadow = true;
  body.add(lowerValve);

  let upperPivot = null;
  let pearlMesh = null;

  if (mode !== 'single_valve') {
    upperPivot = new THREE.Group();
    upperPivot.rotation.x = -Math.max(0.25, openAngleRad);
    const upperValve = new THREE.Mesh(valveGeo, shellMat);
    // Flip upper valve around Z so convex ribbed back faces upward & nacre concavity faces inward!
    upperValve.rotation.z = Math.PI;
    upperValve.castShadow = true;
    upperValve.receiveShadow = true;
    upperPivot.add(upperValve);
    body.add(upperPivot);

    if (mode === 'open_pearl') {
      const pearlSpecs = {
        cream: { color: 0xf7f1e3, emissive: 0x3b3428 },
        black: { color: 0x26393c, emissive: 0x0b2629 },
        gold: { color: 0xf3d485, emissive: 0x3d2e10 },
      };
      const ps = pearlSpecs[pearlType] || pearlSpecs.cream;
      const pearlMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: ps.color,
          roughness: 0.14,
          metalness: 0.34,
          emissive: ps.emissive,
          emissiveIntensity: 0.22,
          transparent: true,
          opacity: 1.0,
        })
      );
      pearlMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 16), pearlMat);
      pearlMesh.position.set(0.0, -0.04, 0.56);
      pearlMesh.scale.set(1.0, 0.92, 1.0);
      pearlMesh.castShadow = true;
      body.add(pearlMesh);
    }
  }

  return { group: root, body, upperPivot, pearlMesh, valveGeo, shellMat };
}
