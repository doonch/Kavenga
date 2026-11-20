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
 * Helper to append an indexed BufferGeometry (position + normal) into raw position/index arrays
 * so multi-frond crowns and branched trees render cleanly with minimal draw calls.
 */
function appendGeometryToArrays(srcGeo, matrix, outPositions, outIndices) {
  const nonIndexed = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo;
  const pos = nonIndexed.attributes.position;
  const v = new THREE.Vector3();
  const baseVert = outPositions.length / 3;
  for (let i = 0; i < pos.count; i += 1) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (matrix) v.applyMatrix4(matrix);
    outPositions.push(v.x, v.y, v.z);
  }
  for (let i = 0; i < pos.count; i += 3) {
    outIndices.push(baseVert + i, baseVert + i + 1, baseVert + i + 2);
  }
  if (nonIndexed !== srcGeo) nonIndexed.dispose();
}

function finalizeMergedTriangleGeometry(positions, indices) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Lofts a graceful arched, V-troughed, serrated pinnate Polynesian coconut palm frond.
 * Root petiole sits at (0, 0, 0) and arches forward along +Z with gentle droop toward the tip.
 */
export function createSculptedPalmFrondGeometry({
  length = 2.05,
  maxWidth = 0.56,
  archHeight = 0.34,
  tipDroop = 0.58,
  lengthSegs = 13,
} = {}) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= lengthSegs; i += 1) {
    const t = i / lengthSegs;
    const z = t * length;
    // Graceful upward arch near petiole then parabolic outward droop
    const ySpine =
      Math.sin(t * Math.PI * 0.72) * archHeight - t * t * tipDroop;

    // Blade width envelope + crisp serrated pinnate leaflet notches
    const env =
      t < 0.08
        ? lerp(0.06, 0.25, t / 0.08)
        : Math.sin(Math.pow(t, 0.72) * Math.PI * 0.96);
    const leafletNotch = i === 0 || i === lengthSegs ? 1.0 : i % 2 === 1 ? 1.0 : 0.44;
    const halfW = Math.max(0.015, maxWidth * 0.5 * env * leafletNotch);
    const edgeDrop = halfW * 0.32 + t * 0.04;

    // 3 vertices per cross-section row: left serrated tip, central rachis ridge, right serrated tip
    positions.push(-halfW, ySpine - edgeDrop, z);
    positions.push(0.0, ySpine + 0.032 * (1.0 - t * 0.6), z);
    positions.push(halfW, ySpine - edgeDrop, z);
  }

  for (let i = 0; i < lengthSegs; i += 1) {
    const r0 = i * 3;
    const r1 = (i + 1) * 3;
    // Left leaflet web (L0, C0, L1, C1)
    indices.push(r0 + 0, r0 + 1, r1 + 0);
    indices.push(r0 + 1, r1 + 1, r1 + 0);
    // Right leaflet web (C0, R0, C1, R1)
    indices.push(r0 + 1, r0 + 2, r1 + 1);
    indices.push(r0 + 2, r1 + 2, r1 + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createRingedCurvedPalmTrunkGeometry({
  height = 3.95,
  baseR = 0.29,
  topR = 0.115,
  curveX = -0.58,
  rings = 14,
  radialSegs = 7,
} = {}) {
  const positions = [];
  const indices = [];
  const rowVerts = radialSegs + 1;

  for (let r = 0; r <= rings; r += 1) {
    const t = r / rings;
    const y = t * height;
    const leanX = Math.pow(t, 1.38) * curveX;
    // Flared root collar at ground + characteristic coconut bark growth rings
    const rootFlare = r <= 2 ? (1.0 - r / 2) * 0.1 : 0.0;
    const barkRing = (r % 2 === 1 && r > 1 && r < rings - 1) ? 0.016 : -0.008;
    const radius = Math.max(0.08, lerp(baseR, topR, Math.pow(t, 0.85)) + rootFlare + barkRing);

    for (let s = 0; s <= radialSegs; s += 1) {
      const ang = (s / radialSegs) * Math.PI * 2.0;
      const vx = leanX + Math.cos(ang) * radius;
      const vz = Math.sin(ang) * radius;
      positions.push(vx, y, vz);
    }
  }

  for (let r = 0; r < rings; r += 1) {
    for (let s = 0; s < radialSegs; s += 1) {
      const a = r * rowVerts + s;
      const b = a + rowVerts;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createPalmCrownWhorlGeometry({
  count = 7,
  frondLen = 2.05,
  maxWidth = 0.56,
  pitchBase = 0.18,
  tipDroop = 0.62,
  yawOffset = 0.0,
  withSpearShoot = false,
} = {}) {
  const frond = createSculptedPalmFrondGeometry({
    length: frondLen,
    maxWidth,
    archHeight: 0.34,
    tipDroop,
    lengthSegs: 12,
  });
  const positions = [];
  const indices = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();

  for (let i = 0; i < count; i += 1) {
    const yaw = yawOffset + (i / count) * Math.PI * 2.0 + ((i % 2) - 0.5) * 0.12;
    const pitch = pitchBase + ((i * 7) % 3 - 1) * 0.08;
    const roll = ((i % 2 === 0 ? 1 : -1) * 0.08);
    e.set(pitch, yaw, roll, 'YXZ');
    q.setFromEuler(e);
    p.set(Math.sin(yaw) * 0.06, 0.0, Math.cos(yaw) * 0.06);
    m.compose(p, q, s);
    appendGeometryToArrays(frond, m, positions, indices);
  }

  if (withSpearShoot) {
    const spear = new THREE.ConeGeometry(0.065, 1.05, 5);
    spear.translate(0, 0.52, 0);
    e.set(0.08, 0.0, -0.06, 'YXZ');
    q.setFromEuler(e);
    p.set(0, 0.06, 0);
    m.compose(p, q, s);
    appendGeometryToArrays(spear, m, positions, indices);
    spear.dispose();
  }

  frond.dispose();
  return finalizeMergedTriangleGeometry(positions, indices);
}

/**
 * Adds wind-leaning Polynesian coconut palms with ringed curved trunks, clustered coconuts,
 * and 12 individual arching serrated pinnate fronds in two sunlit/shaded whorls.
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
    new THREE.MeshStandardMaterial({
      color: frondDarkHex,
      roughness: 0.76,
      side: THREE.DoubleSide,
    })
  );
  const frondSunMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: frondSunHex,
      roughness: 0.74,
      side: THREE.DoubleSide,
    })
  );
  const nutMat = trackMat(
    new THREE.MeshStandardMaterial({ color: nutHex, roughness: 0.8 })
  );

  const trunkGeo = createRingedCurvedPalmTrunkGeometry({
    height: 3.95,
    baseR: 0.29,
    topR: 0.115,
    curveX: -0.58,
  });

  // Clustered ovoid coconut drupes tucked cleanly under the crown petioles
  const nutPositions = [];
  const nutIndices = [];
  const nutSingle = new THREE.SphereGeometry(0.13, 7, 6);
  const nutM = new THREE.Matrix4();
  const nutQ = new THREE.Quaternion();
  const nutE = new THREE.Euler();
  const nutS = new THREE.Vector3(0.95, 1.25, 0.95);
  const nutP = new THREE.Vector3();
  for (let n = 0; n < 4; n += 1) {
    const a = (n / 4) * Math.PI * 2.0 + 0.3;
    nutE.set(0.25, a, 0.2, 'YXZ');
    nutQ.setFromEuler(nutE);
    nutP.set(Math.cos(a) * 0.14, -0.14 - (n % 2) * 0.04, Math.sin(a) * 0.14);
    nutM.compose(nutP, nutQ, nutS);
    appendGeometryToArrays(nutSingle, nutM, nutPositions, nutIndices);
  }
  nutSingle.dispose();
  const nutClusterGeo = finalizeMergedTriangleGeometry(nutPositions, nutIndices);

  const lowerWhorlGeo = createPalmCrownWhorlGeometry({
    count: 7,
    frondLen: 2.15,
    maxWidth: 0.62,
    pitchBase: 0.12,
    tipDroop: 0.74,
    yawOffset: 0.0,
    withSpearShoot: false,
  });
  const upperWhorlGeo = createPalmCrownWhorlGeometry({
    count: 5,
    frondLen: 1.72,
    maxWidth: 0.5,
    pitchBase: -0.34,
    tipDroop: 0.44,
    yawOffset: 0.44,
    withSpearShoot: true,
  });

  for (let i = 0; i < points.length; i += 1) {
    const [px, py, pz, leanAz = 0.0, scale = 1.0, leanAmt = 0.2] = points[i];
    const palm = new THREE.Group();
    palm.position.set(px, py, pz);
    palm.scale.setScalar(scale);
    palm.rotation.y = leanAz;

    // Subtle per-tree tilt variation while keeping base rooted smoothly
    const extraLean = clamp((leanAmt - 0.2) * 0.45, -0.14, 0.18);
    const bodyGrp = new THREE.Group();
    bodyGrp.rotation.z = extraLean;
    bodyGrp.add(new THREE.Mesh(trunkGeo, trunkMat));

    const crownHub = new THREE.Group();
    crownHub.position.set(-0.58, 3.92, 0.0);
    crownHub.rotation.z = -extraLean * 0.65;
    crownHub.rotation.y = (i * 1.17) % (Math.PI * 2.0);

    crownHub.add(new THREE.Mesh(nutClusterGeo, nutMat));
    crownHub.add(new THREE.Mesh(lowerWhorlGeo, frondDarkMat));
    crownHub.add(new THREE.Mesh(upperWhorlGeo, frondSunMat));

    bodyGrp.add(crownHub);
    palm.add(bodyGrp);
    group.add(palm);
  }
}

function createOrganicFoliageGeo(radius = 1.0, seed = 0) {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const disp =
      0.86 +
      0.24 *
        Math.sin(x * 3.7 + seed * 1.3 + z * 2.5) *
        Math.cos(y * 3.2 - seed * 0.8);
    pos.setXYZ(i, x * disp, y * disp * 0.72, z * disp);
  }
  geo.computeVertexNormals();
  return geo;
}

function createForkedBroadleafTrunkGeometry() {
  const positions = [];
  const indices = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);

  // Flared root-buttressed main trunk
  const mainStem = new THREE.CylinderGeometry(0.24, 0.42, 2.05, 7);
  mainStem.translate(0, 1.02, 0);
  m.identity();
  appendGeometryToArrays(mainStem, m, positions, indices);
  mainStem.dispose();

  // Three diverging gnarly canopy limbs
  const limb = new THREE.CylinderGeometry(0.08, 0.17, 1.45, 6);
  limb.translate(0, 0.72, 0);
  for (const [yaw, tilt, scLen] of [
    [0.2, 0.62, 1.0],
    [2.3, 0.56, 0.92],
    [4.4, 0.66, 0.88],
  ]) {
    e.set(tilt, yaw, 0, 'YXZ');
    q.setFromEuler(e);
    p.set(0, 1.82, 0);
    s.set(1, scLen, 1);
    m.compose(p, q, s);
    appendGeometryToArrays(limb, m, positions, indices);
  }
  limb.dispose();

  return finalizeMergedTriangleGeometry(positions, indices);
}

/**
 * Adds spreading broadleaf Polynesian trees (breadfruit 'uru, banyan aoa, miro/koa timber, or crimson 'ohi'a lehua)
 * with flared forked trunks, multi-lobe sculpted canopy clusters, and tufted blossom clusters.
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

  const trunkGeo = createForkedBroadleafTrunkGeometry();
  const mainCrownGeo = createOrganicFoliageGeo(1.42, 3);
  const subCrownGeo = createOrganicFoliageGeo(1.02, 7);

  let blossomGeo = null;
  if (blossomHex) {
    const bPos = [];
    const bIdx = [];
    const puff = createOrganicFoliageGeo(0.28, 11);
    const bm = new THREE.Matrix4();
    const bq = new THREE.Quaternion();
    const bs = new THREE.Vector3(1.15, 0.75, 1.15);
    const bp = new THREE.Vector3();
    for (const [bx, by, bz] of [
      [-0.55, 3.25, 0.45],
      [0.68, 3.05, 0.2],
      [0.12, 3.48, -0.45],
      [-0.25, 2.95, -0.62],
      [0.42, 3.32, 0.65],
    ]) {
      bp.set(bx, by, bz);
      bm.compose(bp, bq, bs);
      appendGeometryToArrays(puff, bm, bPos, bIdx);
    }
    puff.dispose();
    blossomGeo = finalizeMergedTriangleGeometry(bPos, bIdx);
  }

  for (let i = 0; i < points.length; i += 1) {
    const [tx, ty, tz, scale = 1.0, rotY = 0.0] = points[i];
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    tree.scale.setScalar(scale);
    tree.rotation.y = rotY;

    tree.add(new THREE.Mesh(trunkGeo, trunkMat));

    const crownA = new THREE.Mesh(mainCrownGeo, i % 2 === 0 ? canMatA : canMatB);
    crownA.position.set(0.0, 2.78, 0.0);
    crownA.scale.set(1.22, 0.92, 1.16);
    tree.add(crownA);

    for (const [cx, cy, cz, cs] of [
      [0.86, 2.52, 0.34, 0.94],
      [-0.78, 2.48, 0.42, 0.88],
      [-0.18, 2.56, -0.82, 0.92],
    ]) {
      const lobe = new THREE.Mesh(
        subCrownGeo,
        i % 2 === 0 ? canMatB : canMatA
      );
      lobe.position.set(cx, cy, cz);
      lobe.scale.setScalar(cs);
      lobe.rotation.y = cx + cz;
      tree.add(lobe);
    }

    if (blossomMat && blossomGeo && i % 2 === 0) {
      tree.add(new THREE.Mesh(blossomGeo, blossomMat));
    }

    group.add(tree);
  }
}

function createPandanusRosetteGeometry() {
  const positions = [];
  const indices = [];

  // Spiraling sword-shaped pandanus blade strip
  const blade = new THREE.PlaneGeometry(0.18, 1.05, 1, 4);
  blade.translate(0, 0.525, 0);
  const bPos = blade.attributes.position;
  for (let i = 0; i < bPos.count; i += 1) {
    const x = bPos.getX(i);
    const y = bPos.getY(i);
    const t = clamp(y / 1.05, 0.0, 1.0);
    // Taper to pointed sword tip and arch gracefully outward
    const taper = Math.max(0.08, 1.0 - Math.pow(t, 1.6));
    const archZ = t * t * 0.34;
    bPos.setXYZ(i, x * taper, y * 0.94, archZ);
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);

  for (let tier = 0; tier < 2; tier += 1) {
    const blades = tier === 0 ? 7 : 5;
    const tilt = tier === 0 ? 0.82 : 0.42;
    const sc = tier === 0 ? 1.0 : 0.78;
    for (let b = 0; b < blades; b += 1) {
      const yaw = (b / blades) * Math.PI * 2.0 + tier * 0.45;
      e.set(tilt, yaw, 0, 'YXZ');
      q.setFromEuler(e);
      p.set(0, 0.24 + tier * 0.12, 0);
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      appendGeometryToArrays(blade, m, positions, indices);
    }
  }
  blade.dispose();
  return finalizeMergedTriangleGeometry(positions, indices);
}

/**
 * Adds multi-lobe wind-sheared coastal naupaka/mikimiki cushions and stilt-rooted pandanus rosettes.
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
    new THREE.MeshStandardMaterial({
      color: hexA,
      roughness: 0.86,
      side: THREE.DoubleSide,
    })
  );
  const matB = trackMat(
    new THREE.MeshStandardMaterial({
      color: hexB,
      roughness: 0.82,
      side: THREE.DoubleSide,
    })
  );
  const stiltMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.9 })
  );

  // Compound 3-lobe sculpted coastal bush geometry
  const bushPos = [];
  const bushIdx = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const lobe = createOrganicFoliageGeo(0.75, 5);
  for (const [lx, ly, lz, lsc] of [
    [0.0, 0.46, 0.0, 1.05],
    [0.54, 0.34, 0.22, 0.72],
    [-0.48, 0.36, -0.25, 0.76],
  ]) {
    e.set(0, lx * 2.0, 0, 'YXZ');
    q.setFromEuler(e);
    p.set(lx, ly, lz);
    s.setScalar(lsc);
    m.compose(p, q, s);
    appendGeometryToArrays(lobe, m, bushPos, bushIdx);
  }
  lobe.dispose();
  const bushClusterGeo = finalizeMergedTriangleGeometry(bushPos, bushIdx);

  // Pandanus prop roots + sword-leaf rosette crown
  const rootPos = [];
  const rootIdx = [];
  const propRoot = new THREE.CylinderGeometry(0.032, 0.048, 0.62, 5);
  propRoot.translate(0, 0.31, 0);
  for (let r = 0; r < 5; r += 1) {
    const a = (r / 5) * Math.PI * 2.0;
    e.set(0.55, a, 0, 'YXZ');
    q.setFromEuler(e);
    p.set(Math.sin(a) * -0.24, 0.0, Math.cos(a) * -0.24);
    s.set(1, 1, 1);
    m.compose(p, q, s);
    appendGeometryToArrays(propRoot, m, rootPos, rootIdx);
  }
  propRoot.dispose();
  const pandanusRootsGeo = finalizeMergedTriangleGeometry(rootPos, rootIdx);
  const pandanusCrownGeo = createPandanusRosetteGeometry();

  for (let i = 0; i < points.length; i += 1) {
    const [bx, by, bz, sx = 1.25, sy = 0.65, sz = 1.15, rotY = 0.0] = points[i];
    if (i % 3 === 0) {
      const pandanus = new THREE.Group();
      pandanus.position.set(bx, by, bz);
      const pSc = clamp((sx + sy) * 0.52, 0.68, 1.35);
      pandanus.scale.setScalar(pSc);
      pandanus.rotation.y = rotY;
      pandanus.add(new THREE.Mesh(pandanusRootsGeo, stiltMat));
      pandanus.add(new THREE.Mesh(pandanusCrownGeo, i % 2 === 0 ? matA : matB));
      group.add(pandanus);
    } else {
      const bush = new THREE.Mesh(bushClusterGeo, i % 2 === 0 ? matA : matB);
      bush.position.set(bx, by, bz);
      bush.scale.set(sx, sy, sz);
      bush.rotation.y = rotY;
      group.add(bush);
    }
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
 * Generates an organic non-circular horizontal lagoon water mesh whose outer edge
 * traces `radiusFn(theta)` in world XZ (`+Y` normal upward).
 */
export function createOrganicLagoonGeometry(radiusFn, segs = 96) {
  const positions = [0, 0, 0];
  const indices = [];

  for (let i = 0; i <= segs; i += 1) {
    const theta = (i / segs) * Math.PI * 2.0;
    const r = radiusFn(theta);
    positions.push(Math.cos(theta) * r, 0, Math.sin(theta) * r);
  }
  for (let i = 1; i <= segs; i += 1) {
    indices.push(0, i + 1, i);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates an organic non-circular sandy coral motu islet with natural scalloped shores.
 */
export function createOrganicMotuGeometry({
  radiusX = 8.0,
  radiusZ = 5.5,
  height = 1.25,
  seed = 0,
  segs = 28,
} = {}) {
  const geo = new THREE.CylinderGeometry(0.72, 1.0, height, segs, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const r = Math.hypot(vx, vz);
    if (r > 1e-4) {
      const th = Math.atan2(vz, vx);
      const lobe =
        1.0 +
        0.18 * Math.cos(2.0 * th + seed * 1.1) +
        0.14 * Math.sin(3.0 * th - seed * 0.7) +
        0.08 * Math.cos(5.0 * th + seed * 1.9);
      pos.setXYZ(i, vx * radiusX * lobe, vy, vz * radiusZ * lobe);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function buildOrganicContourRibbonGeometry({
  radiusFn,
  startRad,
  endRad,
  halfWidth = 2.6,
  crestHeight = 0.55,
  yBase = -0.1,
  segs = 72,
  radialOffset = 0.0,
} = {}) {
  const positions = [];
  const indices = [];
  const span = endRad - startRad;

  for (let i = 0; i <= segs; i += 1) {
    const t = i / segs;
    const th = startRad + span * t;
    // Taper gently into rounded reef heads at pass openings
    const endTaper = Math.sin(Math.min(1.0, Math.min(t, 1.0 - t) / 0.06) * Math.PI * 0.5);
    const w = halfWidth * (0.35 + 0.65 * endTaper);
    const h = crestHeight * (0.25 + 0.75 * endTaper);
    const rMid = radiusFn(th) + radialOffset + Math.sin(th * 9.0 + i * 0.2) * 0.45;
    const c = Math.cos(th);
    const s = Math.sin(th);

    // 4-point convex arch across ribbon width (inner edge -> inner crest -> outer crest -> outer edge)
    const rIn = rMid - w;
    const rCIn = rMid - w * 0.35;
    const rCOut = rMid + w * 0.35;
    const rOut = rMid + w;
    positions.push(rIn * c, yBase, rIn * s);
    positions.push(rCIn * c, yBase + h, rCIn * s);
    positions.push(rCOut * c, yBase + h, rCOut * s);
    positions.push(rOut * c, yBase, rOut * s);

    if (i < segs) {
      const b0 = i * 4;
      const b1 = (i + 1) * 4;
      for (let q = 0; q < 3; q += 1) {
        indices.push(b0 + q, b1 + q, b0 + q + 1);
        indices.push(b0 + q + 1, b1 + q, b1 + q + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Adds a contoured, non-circular barrier-reef shelf & breaking white surf foam ribbon
 * following `radiusFn(theta)` across `[startRad, endRad]`.
 */
export function addOrganicBarrierReefArc(
  group,
  reefMat,
  foamMat,
  radiusFn,
  startRad,
  endRad,
  segs = 72,
  { reefWidth = 5.4, foamWidth = 2.6, foamOffset = 2.0 } = {}
) {
  const reefGeo = buildOrganicContourRibbonGeometry({
    radiusFn,
    startRad,
    endRad,
    halfWidth: reefWidth * 0.5,
    crestHeight: 0.62,
    yBase: -0.08,
    segs,
    radialOffset: 0.0,
  });
  group.add(new THREE.Mesh(reefGeo, reefMat));

  const foamGeo = buildOrganicContourRibbonGeometry({
    radiusFn,
    startRad,
    endRad,
    halfWidth: foamWidth * 0.5,
    crestHeight: 0.24,
    yBase: 0.16,
    segs,
    radialOffset: foamOffset,
  });
  group.add(new THREE.Mesh(foamGeo, foamMat));
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
  const plinthGeo = new THREE.BoxGeometry(3.15, plinthH, 4.05);
  const wallH = isHawaiian ? 0.72 : 1.32;
  const wallGeo = new THREE.BoxGeometry(2.38, wallH, 3.15);
  const doorGeo = new THREE.BoxGeometry(0.16, wallH * 0.68, 0.84);
  const postGeo = new THREE.CylinderGeometry(0.065, 0.08, wallH + 0.14, 6);
  const roofH = isMarquesan ? 2.48 : isHawaiian ? 2.38 : 1.88;
  const roofGeo = new THREE.ConeGeometry(2.45, roofH, 4);
  const eaveGeo = new THREE.CylinderGeometry(2.38, 2.66, 0.24, 4);
  const ridgeGeo = new THREE.BoxGeometry(0.16, 0.16, 3.85);
  const postMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a20, roughness: 0.86 })
  );
  const doorMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 0.95 })
  );

  for (let i = 0; i < huts.length; i += 1) {
    const { x, y, z, rotY = 0.0, scale = 1.0, longHouse = false } = huts[i];
    const fare = new THREE.Group();
    fare.position.set(x, y, z);
    fare.rotation.y = rotY;
    fare.scale.set(scale, scale, scale * (longHouse ? 1.65 : 1.0));

    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = plinthH * 0.42;
    fare.add(plinth);

    const wallBaseY = plinthH * 0.82;
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = wallBaseY + wallH * 0.5;
    fare.add(walls);

    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(1.18, wallBaseY + wallH * 0.34, 0.0);
    fare.add(door);

    for (const pxOff of [-1.24, 1.24]) {
      for (const pzOff of [-1.56, 1.56]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(pxOff, wallBaseY + (wallH + 0.1) * 0.5, pzOff);
        fare.add(post);
      }
    }

    const rMat = i % 2 === 0 ? roofMatA : roofMatB;
    const eave = new THREE.Mesh(eaveGeo, rMat);
    eave.position.y = wallBaseY + wallH + 0.04;
    eave.rotation.y = Math.PI * 0.25;
    eave.scale.set(1.02, 1.0, 1.24);
    fare.add(eave);

    const roof = new THREE.Mesh(roofGeo, rMat);
    roof.position.y = wallBaseY + wallH + roofH * 0.48;
    roof.rotation.y = Math.PI * 0.25;
    roof.scale.set(1.02, 1.0, 1.24);
    fare.add(roof);

    const ridge = new THREE.Mesh(ridgeGeo, postMat);
    ridge.position.y = wallBaseY + wallH + roofH * 0.94;
    fare.add(ridge);

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
 * Creates a chamfered/tapered fitted stone masonry block (replaces raw rectangular boxes on marae).
 */
export function createBeveledStoneSlabGeometry(
  width,
  height,
  depth,
  topInset = 0.14
) {
  const geo = new THREE.BoxGeometry(width, height, depth, 2, 1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0) {
      const sx = Math.max(0.55, 1.0 - topInset / Math.max(0.4, width * 0.5));
      const sz = Math.max(0.55, 1.0 - topInset / Math.max(0.4, depth * 0.5));
      pos.setXYZ(i, x * sx, y, z * sz);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a carved Polynesian sacred *unu* wooden standard with notched chevron/diamond crest.
 */
export function createCarvedUnuStandard(timberMat, ochreMat, lashingMat) {
  const grp = new THREE.Group();

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.075, 1.45, 7),
    timberMat
  );
  shaft.position.y = 0.72;
  grp.add(shaft);

  // Carved notched board blades stacked into traditional sacred unu silhouette
  for (let tier = 0; tier < 3; tier += 1) {
    const w = 0.32 - tier * 0.04;
    const h = 0.28;
    const blade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, w * 0.65, h, 4),
      ochreMat
    );
    blade.rotation.y = Math.PI * 0.25;
    blade.scale.set(0.42, 1.0, 1.35);
    blade.position.y = 0.88 + tier * 0.27;
    grp.add(blade);
  }

  // Twin finial horns at crown
  for (const hz of [-0.07, 0.07]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.22, 5),
      ochreMat
    );
    horn.position.set(0, 1.66, hz);
    horn.rotation.x = hz > 0 ? 0.16 : -0.16;
    grp.add(horn);
  }

  // Wrapping sennit collar band near base of carved blade
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.022, 5, 8),
    lashingMat
  );
  collar.rotation.x = Math.PI * 0.5;
  collar.position.y = 0.72;
  grp.add(collar);

  return grp;
}

/**
 * Adds a ceremonial stone Marae / Me'ae / Heiau court with stepped dry-laid masonry,
 * fitted perimeter curbing, three-tier Ahu altar, carved *unu* standards, and tapered orthostats.
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
  const baseColor = new THREE.Color(courtHex);
  const ahuColor = new THREE.Color(ahuHex);
  const midColor = baseColor.clone().lerp(ahuColor, 0.35);
  const pavingColor = baseColor.clone().lerp(ahuColor, 0.18);

  const midStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: midColor, roughness: 0.89 })
  );
  const pavingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: pavingColor, roughness: 0.94 })
  );
  const ahuMat = trackMat(
    new THREE.MeshStandardMaterial({ color: ahuHex, roughness: 0.86 })
  );
  const ochreUnuMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9b3322, roughness: 0.82 })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a1f, roughness: 0.86 })
  );
  const lashingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc29e68, roughness: 0.9 })
  );

  const marae = new THREE.Group();
  marae.position.set(x, y, z);
  marae.rotation.y = rotY;
  marae.scale.setScalar(scale);

  // 1. Deep grounded foundation skirt + two-tier stepped stone Paepae footing + dressed paving bed
  const foundationSkirt = new THREE.Mesh(
    createBeveledStoneSlabGeometry(7.7, 1.8, 10.2, 0.24),
    courtMat
  );
  foundationSkirt.position.y = -0.82;
  marae.add(foundationSkirt);

  const lowerFooting = new THREE.Mesh(
    createBeveledStoneSlabGeometry(7.5, 0.38, 10.0, 0.22),
    courtMat
  );
  lowerFooting.position.y = 0.08;
  marae.add(lowerFooting);

  const mainCourt = new THREE.Mesh(
    createBeveledStoneSlabGeometry(6.7, 0.32, 9.1, 0.16),
    courtMat
  );
  mainCourt.position.y = 0.38;
  marae.add(mainCourt);

  // Warm recessed central courtyard stone/gravel mosaic floor
  const innerPaving = new THREE.Mesh(
    createBeveledStoneSlabGeometry(5.3, 0.08, 7.6, 0.06),
    pavingMat
  );
  innerPaving.position.set(-0.25, 0.56, 0.0);
  marae.add(innerPaving);

  // 2. Fitted perimeter curb stones around north/south/east edges & flanking west entry
  const curbGeo = createBeveledStoneSlabGeometry(0.42, 0.22, 0.96, 0.05);
  for (let i = -4; i <= 4; i += 1) {
    // Leave ceremonial entrance gap in center of -X court edge (i === 0)
    if (i !== 0) {
      const wCurb = new THREE.Mesh(curbGeo, i % 2 === 0 ? midStoneMat : ahuMat);
      wCurb.position.set(-3.1, 0.62, i * 1.02);
      wCurb.rotation.y = ((i * 7) % 3 - 1) * 0.04;
      wCurb.scale.set(1.0, 0.9 + ((i + 4) % 3) * 0.08, 0.92);
      marae.add(wCurb);
    }
    const eCurb = new THREE.Mesh(curbGeo, i % 2 === 0 ? courtMat : midStoneMat);
    eCurb.position.set(3.12, 0.62, i * 1.02);
    eCurb.rotation.y = ((i * 5) % 3 - 1) * 0.03;
    marae.add(eCurb);
  }
  for (let j = -2; j <= 2; j += 1) {
    for (const edgeZ of [-4.32, 4.32]) {
      const endCurb = new THREE.Mesh(curbGeo, j % 2 === 0 ? midStoneMat : courtMat);
      endCurb.rotation.y = Math.PI * 0.5 + ((j * 3) % 2) * 0.04;
      endCurb.position.set(j * 1.18, 0.62, edgeZ);
      marae.add(endCurb);
    }
  }

  // Front ceremonial threshold stepping stones on the entrance side (-X)
  for (let st = 0; st < 2; st += 1) {
    const stepSlab = new THREE.Mesh(
      createBeveledStoneSlabGeometry(0.95, 0.16, 2.05 - st * 0.25, 0.08),
      ahuMat
    );
    stepSlab.position.set(-3.85 - st * 0.72, 0.34 - st * 0.16, 0.0);
    marae.add(stepSlab);
  }

  // 3. Three-tier stepped dry-laid Ahu altar mound + dressed capstones + offering slab
  const ahuTier1 = new THREE.Mesh(
    createBeveledStoneSlabGeometry(2.55, 0.54, 7.8, 0.16),
    midStoneMat
  );
  ahuTier1.position.set(2.0, 0.82, 0.0);
  marae.add(ahuTier1);

  const ahuTier2 = new THREE.Mesh(
    createBeveledStoneSlabGeometry(2.0, 0.62, 7.05, 0.14),
    ahuMat
  );
  ahuTier2.position.set(2.08, 1.38, 0.0);
  marae.add(ahuTier2);

  const ahuTier3 = new THREE.Mesh(
    createBeveledStoneSlabGeometry(1.42, 0.44, 6.2, 0.1),
    ahuMat
  );
  ahuTier3.position.set(2.14, 1.88, 0.0);
  marae.add(ahuTier3);

  // Individual fitted dressed coping slabs crowning the Ahu ridge
  for (let c = -3; c <= 3; c += 1) {
    const capStone = new THREE.Mesh(
      createBeveledStoneSlabGeometry(1.15, 0.18, 0.78, 0.07),
      c % 2 === 0 ? ahuMat : midStoneMat
    );
    capStone.position.set(2.14, 2.16, c * 0.86);
    capStone.rotation.y = ((c % 3) - 1) * 0.025;
    marae.add(capStone);
  }

  // Central flat stone offering table slab in front of the Ahu
  const offeringTable = new THREE.Mesh(
    createBeveledStoneSlabGeometry(0.95, 0.26, 1.55, 0.08),
    ahuMat
  );
  offeringTable.position.set(0.35, 0.7, 0.0);
  marae.add(offeringTable);

  // Two sculpted carved red-ochre *unu* standards flanking the Ahu altar
  for (const uz of [-3.3, 3.3]) {
    const unu = createCarvedUnuStandard(timberMat, ochreUnuMat, lashingMat);
    unu.position.set(2.2, 0.58, uz);
    marae.add(unu);
  }

  // 4. Five sculpted tapered backrest orthostats (*ofai*) seated in stone collars
  const orthoGeo = new THREE.CylinderGeometry(0.28, 0.44, 1.0, 6);
  const orthoPos = orthoGeo.attributes.position;
  for (let i = 0; i < orthoPos.count; i += 1) {
    const vx = orthoPos.getX(i);
    const vy = orthoPos.getY(i);
    const vz = orthoPos.getZ(i);
    // Slightly crown the top center & flatten front/back depth
    const crown = vy > 0.35 ? (1.0 - Math.abs(vx) * 0.9) * 0.08 : 0.0;
    orthoPos.setXYZ(i, vx * 0.48, vy + 0.5 + crown, vz * 0.82);
  }
  orthoGeo.computeVertexNormals();

  for (let s = -2; s <= 2; s += 1) {
    const isCenter = s === 0;
    const h = isCenter ? 1.52 : Math.abs(s) === 1 ? 1.32 : 1.16;
    const w = isCenter ? 1.15 : 0.95;
    const stoneCollar = new THREE.Mesh(
      createBeveledStoneSlabGeometry(0.58, 0.16, 0.76, 0.08),
      midStoneMat
    );
    stoneCollar.position.set(-1.68, 0.62, s * 1.58);
    marae.add(stoneCollar);

    const upright = new THREE.Mesh(
      orthoGeo,
      isCenter ? ahuMat : s % 2 === 0 ? courtMat : midStoneMat
    );
    upright.scale.set(1.0, h, w);
    upright.position.set(-1.68, 0.64, s * 1.58);
    upright.rotation.z = -0.04 + ((s * 3) % 2) * 0.03;
    upright.rotation.y = s * 0.035;
    marae.add(upright);
  }

  if (withOracleTower) {
    // Tall sculpted Hawaiian 'anu'u timber-framed & white-tapa draped oracle tower
    const tapaMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf1ebdc, roughness: 0.84 })
    );
    const thatchCapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xa68149, roughness: 0.9 })
    );
    const towerGrp = new THREE.Group();
    towerGrp.position.set(0.35, 0.58, -2.55);

    const towerBase = new THREE.Mesh(
      createBeveledStoneSlabGeometry(2.1, 0.32, 2.1, 0.12),
      courtMat
    );
    towerBase.position.y = 0.14;
    towerGrp.add(towerBase);

    // 4 tapered corner scaffold poles
    for (const [px, pz] of [
      [-0.78, -0.78],
      [0.78, -0.78],
      [-0.78, 0.78],
      [0.78, 0.78],
    ]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.085, 5.2, 6),
        timberMat
      );
      pole.position.set(px * 0.88, 2.65, pz * 0.88);
      pole.rotation.z = px > 0 ? 0.045 : -0.045;
      pole.rotation.x = pz > 0 ? -0.045 : 0.045;
      towerGrp.add(pole);
    }

    // 3 tiered tapa-wrapped tower shrouds + lashing cordage bands
    for (let st = 0; st < 3; st += 1) {
      const wTop = 1.38 - st * 0.18;
      const wBot = 1.52 - st * 0.18;
      const tierH = 1.38;
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(wTop * 0.68, wBot * 0.68, tierH, 4),
        tapaMat
      );
      shroud.rotation.y = Math.PI * 0.25;
      shroud.position.y = 1.05 + st * 1.38;
      towerGrp.add(shroud);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(wBot * 0.7, wBot * 0.7, 0.1, 4),
        lashingMat
      );
      band.rotation.y = Math.PI * 0.25;
      band.position.y = 0.42 + st * 1.38;
      towerGrp.add(band);
    }

    // Pitched thatch crown cap & protruding sacred 'anu'u ridgepoles
    const capRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.12, 1.05, 4),
      thatchCapMat
    );
    capRoof.rotation.y = Math.PI * 0.25;
    capRoof.position.y = 5.38;
    towerGrp.add(capRoof);

    marae.add(towerGrp);
  }

  if (withBraziers) {
    const outerFlameMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xff7a24, side: THREE.DoubleSide }),
      0.94
    );
    const coreFlameMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffe488 }),
      0.98
    );
    const emberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd94816,
        emissive: 0xff5a12,
        emissiveIntensity: 0.75,
        roughness: 0.9,
      })
    );
    // Lathe carved stone fire-bowl profile
    const bowlPts = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.32, 0.0),
      new THREE.Vector2(0.24, 0.22),
      new THREE.Vector2(0.26, 0.42),
      new THREE.Vector2(0.46, 0.68),
      new THREE.Vector2(0.42, 0.76),
      new THREE.Vector2(0.28, 0.56),
      new THREE.Vector2(0.001, 0.54),
    ];
    const bowlGeo = new THREE.LatheGeometry(bowlPts, 10);
    const tonguePts = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.24, 0.12),
      new THREE.Vector2(0.26, 0.34),
      new THREE.Vector2(0.14, 0.62),
      new THREE.Vector2(0.03, 0.85),
      new THREE.Vector2(0.001, 0.94),
    ];
    const tongueGeo = new THREE.LatheGeometry(tonguePts, 8);

    for (const bz of [-3.35, 3.35]) {
      const brazier = new THREE.Group();
      brazier.position.set(-2.45, 0.56, bz);

      const cupMesh = new THREE.Mesh(bowlGeo, courtMat);
      brazier.add(cupMesh);

      const emberBed = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 8, 6),
        emberMat
      );
      emberBed.scale.set(1.0, 0.42, 1.0);
      emberBed.position.y = 0.64;
      brazier.add(emberBed);

      const mainFlame = new THREE.Mesh(tongueGeo, outerFlameMat);
      mainFlame.position.y = 0.66;
      brazier.add(mainFlame);

      const innerCore = new THREE.Mesh(tongueGeo, coreFlameMat);
      innerCore.scale.set(0.55, 0.72, 0.55);
      innerCore.position.y = 0.68;
      brazier.add(innerCore);

      marae.add(brazier);
    }
  }

  group.add(marae);
  return marae;
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
  tridacnaPalette = false,
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

      // Inner surface: either Tridacna white-jade sanctuary clam or Pinctada black-lip pearl oyster
      const centerGlow = 1.0 - smoothstep(0.05, 0.58, u);
      const iridBand = smoothstep(0.18, 0.52, u) * smoothstep(0.95, 0.72, u);
      const outerLip = smoothstep(0.81, 0.96, u);
      const shimmerShift = 0.5 + 0.5 * Math.sin(phi * 3.5 + u * 5.2);

      let nr;
      let ng;
      let nb;
      let sr;
      let sg;
      let sb;
      const ribShade = 0.5 + 0.5 * ribWave;

      if (tridacnaPalette) {
        nr = lerp(0.95, 0.22, iridBand * 0.65);
        ng = lerp(0.96, 0.76, iridBand * 0.55);
        nb = lerp(0.94, 0.72, iridBand * 0.5);
        nr = lerp(nr, 0.98, centerGlow * 0.8);
        ng = lerp(ng, 0.98, centerGlow * 0.8);
        nb = lerp(nb, 0.96, centerGlow * 0.8);
        nr = lerp(nr, 0.14 + 0.1 * shimmerShift, outerLip);
        ng = lerp(ng, 0.68 + 0.14 * shimmerShift, outerLip);
        nb = lerp(nb, 0.64 + 0.16 * shimmerShift, outerLip);

        sr = lerp(0.76, 0.97, ribShade);
        sg = lerp(0.74, 0.96, ribShade);
        sb = lerp(0.68, 0.91, ribShade);
      } else {
        nr = lerp(0.84, 0.42, iridBand * shimmerShift);
        ng = lerp(0.9, 0.86, iridBand);
        nb = lerp(0.92, 0.84, iridBand * (1.0 - 0.35 * shimmerShift));

        nr = lerp(nr, 0.97, centerGlow * 0.75);
        ng = lerp(ng, 0.96, centerGlow * 0.75);
        nb = lerp(nb, 0.91, centerGlow * 0.75);

        // Black-lip nacre outer lip (Pinctada margaritifera peacock charcoal-emerald edge)
        nr = lerp(nr, 0.14 + 0.08 * shimmerShift, outerLip);
        ng = lerp(ng, 0.23 + 0.12 * shimmerShift, outerLip);
        nb = lerp(nb, 0.25 + 0.14 * shimmerShift, outerLip);

        // Outer calcified shell: chalky limestone ridges & deep olive-umber fluted grooves
        const umboDark = 1.0 - smoothstep(0.0, 0.36, u);
        sr = lerp(0.46, 0.84, ribShade);
        sg = lerp(0.42, 0.79, ribShade);
        sb = lerp(0.36, 0.7, ribShade);
        sr = lerp(sr, 0.34, umboDark * 0.55);
        sg = lerp(sg, 0.3, umboDark * 0.55);
        sb = lerp(sb, 0.25, umboDark * 0.55);
      }

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
    tridacnaPalette = false,
    sharedValveGeo = null,
    sharedShellMat = null,
  } = {}
) {
  const valveGeo =
    sharedValveGeo ||
    createGiantPearlValveGeometry({ tridacnaPalette });
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
