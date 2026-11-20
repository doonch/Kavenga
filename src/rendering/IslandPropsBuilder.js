/**
 * Sculpted Polynesian Landmarks, Crafts & Island Shore Props Builder.
 * Replaces simple primitive placeholders across detailed islands and Walkable Shore scenes
 * while staying reusable by the standalone Asset Debug Viewer.
 */

import * as THREE from 'three';
import {
  createGiantPearlShellGroup,
  createGiantPearlValveGeometry,
} from './IslandSculptToolkit.js';

export function makeStoneRockGeometry(radius = 0.35, seed = 0) {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const jitter =
      0.86 +
      0.24 *
        Math.sin(x * 5.2 + seed * 1.7 + z * 3.1) *
        Math.cos(y * 4.4 - seed * 0.9);
    pos.setXYZ(i, x * jitter, y * jitter * 0.72, z * jitter);
  }
  geo.computeVertexNormals();
  return geo;
}

function createSculptedFlameGroup(trackMat, scale = 1.0) {
  const grp = new THREE.Group();
  grp.scale.setScalar(scale);

  const outerMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff7e26, side: THREE.DoubleSide }),
    0.92
  );
  const coreMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffe48a }),
    0.96
  );

  // Teardrop curved outer flame tongues
  const ptsOuter = [
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(0.11, 0.05),
    new THREE.Vector2(0.135, 0.14),
    new THREE.Vector2(0.082, 0.27),
    new THREE.Vector2(0.028, 0.39),
    new THREE.Vector2(0.001, 0.45),
  ];
  const outerGeo = new THREE.LatheGeometry(ptsOuter, 9);
  const mainTongue = new THREE.Mesh(outerGeo, outerMat);
  grp.add(mainTongue);

  for (const [rx, rz, ox, oz, sc] of [
    [0.18, 0.14, 0.045, 0.02, 0.72],
    [-0.16, -0.18, -0.04, -0.025, 0.65],
  ]) {
    const wisp = new THREE.Mesh(outerGeo, outerMat);
    wisp.scale.setScalar(sc);
    wisp.position.set(ox, 0.02, oz);
    wisp.rotation.set(rx, 0, rz);
    grp.add(wisp);
  }

  const ptsCore = [
    new THREE.Vector2(0.001, 0.02),
    new THREE.Vector2(0.068, 0.07),
    new THREE.Vector2(0.052, 0.17),
    new THREE.Vector2(0.015, 0.27),
    new THREE.Vector2(0.001, 0.31),
  ];
  const core = new THREE.Mesh(new THREE.LatheGeometry(ptsCore, 8), coreMat);
  grp.add(core);

  return grp;
}

/**
 * 1. Kiritimati — Giant Fluted White & Jade Tridacna Clam-Shell Sanctuary Altar
 */
export function createSculptedTridacnaAltarGroup(trackMat) {
  const grp = new THREE.Group();

  const plinthMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6decb, roughness: 0.88 })
  );
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.38, 0.34, 12),
    plinthMat
  );
  plinth.position.y = 0.17;
  plinth.receiveShadow = true;
  grp.add(plinth);

  const clam = createGiantPearlShellGroup(trackMat, {
    mode: 'open_pearl',
    pearlType: 'cream',
    tridacnaPalette: true,
    scale: 1.5,
    openAngleRad: 0.74,
  });
  clam.group.position.y = 0.32;
  grp.add(clam.group);

  return { group: grp, clam };
}

/**
 * 2. Mo'orea — Twin Carved Dugout Tamanu Vaka Hulls on Notched Timber Cradles
 */
export function createCarvedHullPairGroup(trackMat) {
  const grp = new THREE.Group();
  const hullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9b5a2e, roughness: 0.72 })
  );
  const gunwaleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.8 })
  );
  const cradleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4527, roughness: 0.86 })
  );

  // Build curved lofted dugout hull along Z (-3.4 to +3.4) with upturned manu finials
  const zSegs = 24;
  const rSegs = 12;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= zSegs; i += 1) {
    const t = i / zSegs; // 0..1
    const u = t * 2.0 - 1.0; // -1..+1
    const z = u * 3.35;
    const beam = Math.max(0.025, 0.34 * Math.pow(1.0 - Math.pow(Math.abs(u), 1.85), 0.75));
    const depth = Math.max(0.035, 0.36 * Math.pow(1.0 - Math.pow(Math.abs(u), 2.1), 0.72));
    // Upturned carved prow & stern sweep
    const sheerLift = 0.42 * Math.pow(Math.max(0.0, Math.abs(u) - 0.55) / 0.45, 1.85);

    for (let j = 0; j < rSegs; j += 1) {
      const ang = (j / rSegs) * Math.PI * 2.0;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const x = sinA * beam;
      // Flatten deck top slightly, deepen U-hull keel below
      const yLocal = cosA > 0.2 ? depth * 0.22 : cosA * depth;
      positions.push(x, yLocal + sheerLift, z);
    }
  }

  for (let i = 0; i < zSegs; i += 1) {
    for (let j = 0; j < rSegs; j += 1) {
      const jn = (j + 1) % rSegs;
      const a = i * rSegs + j;
      const b = i * rSegs + jn;
      const c = (i + 1) * rSegs + j;
      const d = (i + 1) * rSegs + jn;
      indices.push(a, c, d, a, d, b);
    }
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  hullGeo.setIndex(indices);
  hullGeo.computeVertexNormals();

  const prowFinialGeo = new THREE.BoxGeometry(0.09, 0.34, 0.28);

  for (const hxOff of [-0.78, 0.78]) {
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.set(hxOff, 0.56, 0.5);
    hull.castShadow = true;
    grp.add(hull);

    // Carved upright manu prow & stern crests
    for (const endZ of [-2.82, 3.82]) {
      const manu = new THREE.Mesh(prowFinialGeo, gunwaleMat);
      manu.position.set(hxOff, 1.08, endZ);
      manu.rotation.x = endZ < 0 ? 0.35 : -0.35;
      grp.add(manu);
    }
  }

  // Twin notched crossbeam cradles & kiato lashing beams
  for (const cz of [-1.25, 1.85]) {
    const sleeper = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 0.14, 0.2),
      cradleMat
    );
    sleeper.position.set(0, 0.18, cz);
    grp.add(sleeper);

    const kiato = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 2.1, 6),
      cradleMat
    );
    kiato.rotation.z = Math.PI * 0.5;
    kiato.position.set(0, 0.72, cz);
    grp.add(kiato);
  }

  return { group: grp };
}

/**
 * 3. Huahine / Mo'orea — Sculpted Woven Pandanus Sail Rack & Billowing Sail Cloth
 */
export function createPandanusSailFrameGroup(
  trackMat,
  { sailColorHex = 0xe8cb88, width = 2.4, height = 1.48, arched = true } = {}
) {
  const grp = new THREE.Group();
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4728, roughness: 0.86 })
  );
  const lashingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc29e68, roughness: 0.9 })
  );
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: sailColorHex,
      roughness: 0.78,
      side: THREE.DoubleSide,
    })
  );

  // Twin carved upright Aito posts + horizontal hanging spar + lower tension pole
  const postH = height + 0.88;
  for (const px of [-width * 0.52, width * 0.52]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.078, postH, 7),
      timberMat
    );
    post.position.set(px, postH * 0.5, 0);
    post.castShadow = true;
    grp.add(post);

    const lash = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.024, 5, 10),
      lashingMat
    );
    lash.position.set(px, postH - 0.14, 0);
    grp.add(lash);
  }

  const topSpar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, width * 1.16, 7),
    timberMat
  );
  topSpar.rotation.z = Math.PI * 0.5;
  topSpar.position.set(0, postH - 0.14, 0);
  topSpar.castShadow = true;
  grp.add(topSpar);

  // Curved crab-claw / draped woven pandanus sail cloth (subdivided billowing sheet)
  const segX = 14;
  const segY = 10;
  const clothGeo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = clothGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (width * 0.5); // -1..+1
    const ny = (y + height * 0.5) / height; // 0 (bottom) .. 1 (top)
    const belly = Math.sin(ny * Math.PI) * Math.cos(nx * Math.PI * 0.42) * 0.18;
    const scallop = arched ? (1.0 - ny) * 0.16 * (1.0 - nx * nx) : 0.0;
    const taperX = arched ? x * (0.76 + 0.24 * ny) : x;
    pos.setXYZ(i, taperX, y + scallop, belly);
  }
  clothGeo.computeVertexNormals();

  const clothMesh = new THREE.Mesh(clothGeo, sailMat);
  clothMesh.position.set(0, postH - 0.16 - height * 0.5, 0.03);
  clothMesh.castShadow = true;
  grp.add(clothMesh);

  return { group: grp, sailMat, clothMesh };
}

/**
 * 4. Mo'orea — Carved Basalt Sail-Dyeing Vats (LatheGeometry Basins + Stirring Paddles)
 */
export function createSailDyeVatsCluster(
  trackMat,
  vatColors = [0xb83227, 0xd9a441, 0x2ea89c],
  ringRadius = 1.15
) {
  const grp = new THREE.Group();
  const basaltMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b3938, roughness: 0.9 })
  );
  const paddleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x734a27, roughness: 0.82 })
  );

  // Carved thick-walled stone basin profile (outer rounded belly -> wide rim -> deep hollow interior)
  const vatProfile = [
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.55, 0.24),
    new THREE.Vector2(0.58, 0.48),
    new THREE.Vector2(0.54, 0.62),
    new THREE.Vector2(0.45, 0.63),
    new THREE.Vector2(0.43, 0.52),
    new THREE.Vector2(0.37, 0.18),
    new THREE.Vector2(0.001, 0.14),
  ];
  const vatGeo = new THREE.LatheGeometry(vatProfile, 16);
  const liquidGeo = new THREE.CircleGeometry(0.425, 18);
  const stickGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.88, 6);

  for (let v = 0; v < vatColors.length; v += 1) {
    const ang = (v / vatColors.length) * Math.PI * 2.0 + 0.35;
    const vx = Math.cos(ang) * ringRadius;
    const vz = Math.sin(ang) * ringRadius;

    const vatUnit = new THREE.Group();
    vatUnit.position.set(vx, 0, vz);

    const basin = new THREE.Mesh(vatGeo, basaltMat);
    basin.castShadow = true;
    basin.receiveShadow = true;
    vatUnit.add(basin);

    const dyePool = new THREE.Mesh(
      liquidGeo,
      trackMat(
        new THREE.MeshStandardMaterial({
          color: vatColors[v],
          roughness: 0.2,
          metalness: 0.12,
        })
      )
    );
    dyePool.rotation.x = -Math.PI * 0.5;
    dyePool.position.y = 0.51;
    vatUnit.add(dyePool);

    const paddle = new THREE.Mesh(stickGeo, paddleMat);
    paddle.position.set(0.16, 0.58, 0.1);
    paddle.rotation.set(0.24, 0.0, -0.34);
    vatUnit.add(paddle);

    grp.add(vatUnit);
  }

  return { group: grp };
}

/**
 * 5. Hiva Oa — Sculpted Red-Tuff Marquesan Tiki Statue & Quarry Block
 */
export function createMarquesanTikiSculpture(redTuffMat, basaltMat, scale = 1.0) {
  const tiki = new THREE.Group();
  tiki.scale.setScalar(scale);

  // Two-stepped dark basalt paepae pedestal
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.38, 1.92), basaltMat);
  base1.position.y = 0.19;
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.32, 1.52), basaltMat);
  base2.position.y = 0.52;
  tiki.add(base1, base2);

  // Stout crouched legs
  const legGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.62, 8);
  for (const lx of [-0.34, 0.34]) {
    const leg = new THREE.Mesh(legGeo, redTuffMat);
    leg.position.set(lx, 0.94, 0.06);
    tiki.add(leg);
  }

  // Broad carved torso with chest relief & waist belt
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.62, 1.05, 8),
    redTuffMat
  );
  torso.scale.set(1.06, 1.0, 0.86);
  torso.position.y = 1.7;
  tiki.add(torso);

  // Bent Marquesan arms & symmetric three-fingered belly hands
  const upperArmGeo = new THREE.BoxGeometry(0.2, 0.58, 0.24);
  const forearmGeo = new THREE.BoxGeometry(0.46, 0.2, 0.22);
  for (const side of [-1, 1]) {
    const uArm = new THREE.Mesh(upperArmGeo, redTuffMat);
    uArm.position.set(side * 0.62, 1.84, 0.08);
    uArm.rotation.z = side * 0.12;
    const fArm = new THREE.Mesh(forearmGeo, redTuffMat);
    fArm.position.set(side * 0.36, 1.48, 0.44);
    fArm.rotation.y = -side * 0.28;
    tiki.add(uArm, fArm);
  }

  // Broad sculpted block-head with overhanging brow, wide Mata goggle eyes, carved nose & mouth
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.62, 1.24, 8),
    redTuffMat
  );
  head.scale.set(1.04, 1.0, 0.92);
  head.position.y = 2.86;
  tiki.add(head);

  const browRidge = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.2, 0.28),
    redTuffMat
  );
  browRidge.position.set(0, 3.24, 0.48);
  tiki.add(browRidge);

  const eyeRimGeo = new THREE.TorusGeometry(0.2, 0.058, 6, 12);
  const eyePupilGeo = new THREE.SphereGeometry(0.11, 8, 8);
  for (const ex of [-0.26, 0.26]) {
    const rim = new THREE.Mesh(eyeRimGeo, basaltMat);
    rim.position.set(ex, 2.98, 0.56);
    const pupil = new THREE.Mesh(eyePupilGeo, redTuffMat);
    pupil.scale.set(1.0, 0.72, 0.5);
    pupil.position.set(ex, 2.98, 0.55);
    tiki.add(rim, pupil);
  }

  // Flared flat Marquesan nose + wide grinning lip slot + stepped ear flanges
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.2), redTuffMat);
  nose.position.set(0, 2.74, 0.58);
  const mouthOuter = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.14), basaltMat);
  mouthOuter.position.set(0, 2.46, 0.56);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.16), redTuffMat);
  tongue.position.set(0, 2.46, 0.57);
  tiki.add(nose, mouthOuter, tongue);

  const earGeo = new THREE.BoxGeometry(0.14, 0.56, 0.24);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, redTuffMat);
    ear.position.set(side * 0.72, 2.84, 0.02);
    tiki.add(ear);
  }

  return tiki;
}

export function createQuarriedTikiBlockGroup(redTuffMat, basaltMat) {
  const grp = new THREE.Group();
  // Rough quarried basalt/tuff bed slab + partially carved recumbent Tiki emerging from stone
  const roughBed = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 4.05), redTuffMat);
  roughBed.position.y = 0.36;
  grp.add(roughBed);

  const emerging = createMarquesanTikiSculpture(redTuffMat, basaltMat, 0.78);
  emerging.rotation.x = -Math.PI * 0.5;
  emerging.position.set(0, 0.64, -1.32);
  grp.add(emerging);
  return { group: grp };
}

/**
 * 6. Rangiroa — Lagoon Pearl-Oyster Longlines (Sennit Lines, Carved Floats & Shell Baskets)
 */
export function createPearlLineClusterGroup(trackMat, rows = 3, cols = 6) {
  const grp = new THREE.Group();
  const ropeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb6925c, roughness: 0.9 })
  );
  const floatMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6eadb, roughness: 0.52 })
  );
  const woodBandMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4528, roughness: 0.85 })
  );
  const valveGeo = createGiantPearlValveGeometry({ radius: 0.26, dishDepth: 0.06, thickness: 0.022 });
  const shellMat = trackMat(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.2 })
  );

  // Double-cone carved spindle buoy profile
  const floatGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.22),
      new THREE.Vector2(0.14, -0.06),
      new THREE.Vector2(0.16, 0.0),
      new THREE.Vector2(0.14, 0.06),
      new THREE.Vector2(0.001, 0.22),
    ],
    10
  );
  floatGeo.rotateZ(Math.PI * 0.5);

  const colSpacing = 2.6;
  const rowSpacing = 3.4;
  const midRow = (rows - 1) * 0.5;

  for (let r = 0; r < rows; r += 1) {
    const rx = (r - midRow) * rowSpacing;
    const pts = [];
    for (let c = 0; c < cols; c += 1) {
      const cz = c * colSpacing;
      const fx = rx;
      const fy = 0.24;
      pts.push(new THREE.Vector3(fx, fy - 0.04, cz));

      const buoy = new THREE.Mesh(floatGeo, floatMat);
      buoy.position.set(fx, fy, cz);
      buoy.rotation.y = (r + c) * 0.45;
      grp.add(buoy);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.165, 0.165, 0.05, 10),
        woodBandMat
      );
      band.rotation.z = Math.PI * 0.5;
      band.position.set(fx, fy, cz);
      band.rotation.y = buoy.rotation.y;
      grp.add(band);

      // Hanging pearl oyster tether dipping below surface
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.34, 5),
        ropeMat
      );
      drop.position.set(fx, fy - 0.18, cz);
      grp.add(drop);

      const oyster = new THREE.Mesh(valveGeo, shellMat);
      oyster.position.set(fx, fy - 0.36, cz - 0.08);
      oyster.rotation.set(Math.PI * 0.42, c * 0.8, 0);
      grp.add(oyster);
    }

    const lineCurve = new THREE.CatmullRomCurve3(pts);
    const lineMesh = new THREE.Mesh(
      new THREE.TubeGeometry(lineCurve, cols * 4, 0.025, 5, false),
      ropeMat
    );
    grp.add(lineMesh);
  }

  return { group: grp };
}

/**
 * 7. Ua Pou — Paired Tapered Bleached Whale-Jawbone Archway
 */
export function createWhaleJawArchGroup(trackMat) {
  const grp = new THREE.Group();
  const boneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf1ebd8, roughness: 0.62 })
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b3836, roughness: 0.92 })
  );
  const lashMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9b7444, roughness: 0.88 })
  );

  for (const side of [-1, 1]) {
    // Basalt anchorage stone socket
    const socket = new THREE.Mesh(makeStoneRockGeometry(0.45, side + 2), stoneMat);
    socket.position.set(side * 1.85, 0.22, 0);
    grp.add(socket);

    const pts = [
      new THREE.Vector3(side * 1.82, 0.15, 0.0),
      new THREE.Vector3(side * 1.65, 1.15, 0.06),
      new THREE.Vector3(side * 1.12, 2.02, 0.04),
      new THREE.Vector3(side * 0.42, 2.48, 0.0),
      new THREE.Vector3(-side * 0.08, 2.58, -0.02),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 18, 0.16, 7, false);
    const pos = tubeGeo.attributes.position;
    // Taper radius gently from thick jaw root toward graceful apex tip
    for (let i = 0; i < pos.count; i += 1) {
      const ringIdx = Math.floor(i / 8);
      const t = Math.min(1.0, ringIdx / 18);
      const cPt = curve.getPointAt(t);
      const taper = 1.18 - 0.68 * t;
      pos.setXYZ(
        i,
        cPt.x + (pos.getX(i) - cPt.x) * taper,
        cPt.y + (pos.getY(i) - cPt.y) * taper,
        cPt.z + (pos.getZ(i) - cPt.z) * taper
      );
    }
    tubeGeo.computeVertexNormals();
    const mandible = new THREE.Mesh(tubeGeo, boneMat);
    mandible.castShadow = true;
    grp.add(mandible);
  }

  // Lashed sennit collar at apex crossing
  const apexLash = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.045, 6, 12),
    lashMat
  );
  apexLash.position.set(0, 2.55, 0);
  apexLash.rotation.y = Math.PI * 0.5;
  grp.add(apexLash);

  return { group: grp };
}

/**
 * 8. Huahine — Stacked Basalt Boulder Maeva Fish Weir (V-Funnel + Stone Pen)
 */
export function createBasaltFishWeirGroup(trackMat) {
  const grp = new THREE.Group();
  const stoneMatA = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.94 })
  );
  const stoneMatB = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4c4a46, roughness: 0.92 })
  );
  const stakeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a20, roughness: 0.88 })
  );

  const rockGeos = [
    makeStoneRockGeometry(0.28, 1),
    makeStoneRockGeometry(0.32, 3),
    makeStoneRockGeometry(0.24, 7),
  ];

  // Two diverging stone funnel arms
  for (const armSign of [-1, 1]) {
    for (let s = 0; s < 14; s += 1) {
      const t = s / 13;
      const rx = -5.0 + t * 5.2;
      const rz = armSign * (2.6 - t * 1.9);
      const rock = new THREE.Mesh(
        rockGeos[(s + (armSign > 0 ? 1 : 0)) % 3],
        s % 2 === 0 ? stoneMatA : stoneMatB
      );
      rock.position.set(rx, 0.08 + (s % 2) * 0.04, rz);
      rock.scale.set(1.25, 0.78, 1.05);
      rock.rotation.y = s * 0.9;
      grp.add(rock);
    }
  }

  // Circular catchment stone ring at apex + bamboo guide stakes
  for (let p = 0; p < 12; p += 1) {
    const ang = -Math.PI * 0.78 + (p / 11) * (Math.PI * 1.56);
    const px = 0.9 + Math.cos(ang) * 0.92;
    const pz = Math.sin(ang) * 0.92;
    const rock = new THREE.Mesh(rockGeos[p % 3], p % 2 === 0 ? stoneMatA : stoneMatB);
    rock.position.set(px, 0.1, pz);
    rock.scale.set(1.1, 0.85, 1.1);
    rock.rotation.y = p * 1.1;
    grp.add(rock);

    if (p % 3 === 0) {
      const stake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, 0.95, 5),
        stakeMat
      );
      stake.position.set(px, 0.45, pz);
      grp.add(stake);
    }
  }

  return { group: grp };
}

/**
 * 9. Shared — Carved Aito Kukui Torch with Woven Basket Cup & Multi-Tongue Flame
 */
export function createKukuiTorchGroup(trackMat, { height = 1.65 } = {}) {
  const grp = new THREE.Group();
  const poleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a20, roughness: 0.88 })
  );
  const cupMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7d5834, roughness: 0.9 })
  );
  const emberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a1812,
      emissive: 0xff5a18,
      emissiveIntensity: 0.65,
      roughness: 0.9,
    })
  );

  // Flared bamboo/aito post with lashed node rings
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.068, height, 7),
    poleMat
  );
  pole.position.y = height * 0.5;
  pole.castShadow = true;
  grp.add(pole);

  const cupProfile = [
    new THREE.Vector2(0.05, 0.0),
    new THREE.Vector2(0.11, 0.08),
    new THREE.Vector2(0.16, 0.2),
    new THREE.Vector2(0.135, 0.21),
    new THREE.Vector2(0.08, 0.09),
  ];
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 9), cupMat);
  cup.position.y = height - 0.05;
  grp.add(cup);

  const coals = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 6), emberMat);
  coals.scale.set(1.0, 0.55, 1.0);
  coals.position.y = height + 0.12;
  grp.add(coals);

  const flame = createSculptedFlameGroup(trackMat, 0.72);
  flame.position.y = height + 0.14;
  grp.add(flame);

  return { group: grp, flame };
}

/**
 * 10. Shared — Sculpted Chamfered Basalt Standing Stone (Ofai Backrest Stela)
 */
export function createCarvedStandingStoneGroup(
  trackMat,
  { width = 0.44, height = 1.18, depth = 0.28, colorHex = 0x3b3a3c } = {}
) {
  const mat = trackMat(
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 })
  );
  // Tapered octagonal/chamfered monolithic stone slab (wider sturdy base -> beveled top)
  const geo = new THREE.CylinderGeometry(0.42, 0.56, height, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const topPinch = y > height * 0.35 ? 0.84 : 1.0;
    pos.setXYZ(i, x * width * topPinch, y + height * 0.5, z * depth);
  }
  geo.computeVertexNormals();
  const stone = new THREE.Mesh(geo, mat);
  stone.castShadow = true;
  stone.receiveShadow = true;
  return { group: stone, mesh: stone };
}

/**
 * 11. Shared — Village Coral-Stone Hearth Ring with Charred Logs & Multi-Tongue Flame
 */
export function createVillageHearthGroup(trackMat, { scale = 1.0 } = {}) {
  const grp = new THREE.Group();
  grp.scale.setScalar(scale);

  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xbab09c, roughness: 0.92 })
  );
  const logMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3a2518, roughness: 0.92 })
  );
  const ashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c1b15,
      emissive: 0xff4e14,
      emissiveIntensity: 0.55,
      roughness: 0.95,
    })
  );

  const rockGeos = [makeStoneRockGeometry(0.18, 2), makeStoneRockGeometry(0.2, 5)];
  for (let i = 0; i < 11; i += 1) {
    const ang = (i / 11) * Math.PI * 2.0;
    const stone = new THREE.Mesh(rockGeos[i % 2], stoneMat);
    stone.position.set(Math.cos(ang) * 0.68, 0.1, Math.sin(ang) * 0.68);
    stone.rotation.y = ang + i * 0.4;
    grp.add(stone);
  }

  const emberBed = new THREE.Mesh(new THREE.SphereGeometry(0.44, 10, 6), ashMat);
  emberBed.scale.set(1.0, 0.28, 1.0);
  emberBed.position.y = 0.08;
  grp.add(emberBed);

  for (let l = 0; l < 3; l += 1) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.08, 0.92, 6),
      logMat
    );
    log.rotation.z = Math.PI * 0.42;
    log.rotation.y = (l * Math.PI * 2.0) / 3.0 + 0.3;
    log.position.y = 0.16;
    grp.add(log);
  }

  const flame = createSculptedFlameGroup(trackMat, 1.05);
  flame.position.y = 0.16;
  grp.add(flame);

  return { group: grp, flame };
}

/**
 * 12. Manuae — Stacked Weathered Coral Pass Marker Cairn (Ti'ahu Ava)
 */
export function createCoralCairnGroup(trackMat) {
  const grp = new THREE.Group();
  const baseMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xbdb49f, roughness: 0.92 })
  );
  const topMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe7dfd0, roughness: 0.86 })
  );

  const tiers = [
    { r: 1.05, y: 0.28, sx: 1.15, sy: 0.56, sz: 1.02, mat: baseMat, seed: 1 },
    { r: 0.82, y: 0.72, sx: 1.08, sy: 0.54, sz: 0.98, mat: topMat, seed: 4 },
    { r: 0.58, y: 1.12, sx: 1.04, sy: 0.52, sz: 0.95, mat: baseMat, seed: 8 },
  ];
  for (const t of tiers) {
    const boulder = new THREE.Mesh(makeStoneRockGeometry(t.r, t.seed), t.mat);
    boulder.scale.set(t.sx, t.sy, t.sz);
    boulder.position.y = t.y;
    boulder.rotation.y = t.seed * 0.8;
    grp.add(boulder);
  }

  // Sculpted white shell crowning the pass marker cairn
  const capShell = createGiantPearlShellGroup(trackMat, {
    mode: 'single_valve',
    tridacnaPalette: true,
    scale: 0.48,
  });
  capShell.group.position.set(0, 1.44, 0);
  capShell.group.rotation.set(0.32, 0.4, 0.0);
  grp.add(capShell.group);

  return { group: grp };
}

/**
 * 13. Fatu Hiva / Manuae — Sculpted Open-Front Canoe Shipwright Shed with Curved Thatch Eaves
 */
export function createSculptedShipwrightShedGroup(
  trackMat,
  { width = 4.6, depth = 6.8, timberHex = 0x694224, thatchHex = 0xb88b4e } = {}
) {
  const grp = new THREE.Group();
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: timberHex, roughness: 0.85 })
  );
  const thatchMat = trackMat(
    new THREE.MeshStandardMaterial({ color: thatchHex, roughness: 0.88 })
  );

  const postH = 1.95;
  const postGeo = new THREE.CylinderGeometry(0.11, 0.14, postH, 7);
  for (const px of [-width * 0.46, width * 0.46]) {
    for (const pz of [-depth * 0.44, 0, depth * 0.44]) {
      const p = new THREE.Mesh(postGeo, timberMat);
      p.position.set(px, postH * 0.5, pz);
      grp.add(p);
    }
  }

  const roofH = 2.45;
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, width * 0.68, roofH, 4),
    thatchMat
  );
  roof.rotation.y = Math.PI * 0.25;
  roof.scale.set(1.0, 1.0, (depth * 1.15) / width);
  roof.position.y = postH + roofH * 0.42;
  grp.add(roof);

  const eave = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.66, width * 0.76, 0.28, 4),
    thatchMat
  );
  eave.rotation.y = Math.PI * 0.25;
  eave.scale.set(1.0, 1.0, (depth * 1.15) / width);
  eave.position.y = postH + 0.05;
  grp.add(eave);

  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, depth * 1.08),
    timberMat
  );
  ridge.position.y = postH + roofH * 0.88;
  grp.add(ridge);

  // Tapered timber careening slipway rails
  for (const rz of [-1.25, 1.25]) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 7.6, 6),
      timberMat
    );
    rail.rotation.z = Math.PI * 0.5 - 0.12;
    rail.position.set(3.8, 0.12, rz);
    grp.add(rail);
  }

  return { group: grp };
}
