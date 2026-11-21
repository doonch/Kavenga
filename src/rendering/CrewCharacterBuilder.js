/**
 * Procedural 3D Crew Character Builder for Kavenga: Songs of the Star Path.
 *
 * Replaces the former cylinder+sphere crew placeholders aboard `VakaRenderer`
 * with three seated, articulated Polynesian companion rigs faithful to their
 * recruited island portraits (`CREW_CATALOG`):
 *  - `tama`  (Taha'a Lagoon Fisher): shirtless, braided pandanus headband, pearl-shell
 *            pendant, crossbody woven fish basket, checkered pareu, cowrie bracelet,
 *            forearm/calf tatau, seated with three-pronged wooden trident (`patia`).
 *  - `moana` (Ua Pou Master Sail-Tender): wind-swept ponytail, ochre-gold & indigo
 *            geometric tapa sleeveless bodice & wrap pareu, shoulder/arm tatau,
 *            pearl pendant, waist-coiled sennit sail sheet tended in both hands.
 *  - `kahu`  (Hiva Oa Master Hull-Wright): broad-shouldered build, tied-back dark hair,
 *            carved tiki pendant, chestnut patterned barkcloth `tiputa` tunic & taupe
 *            wrap pareu with braided sennit belt, holding lashing fid & sennit coil.
 */

import * as THREE from 'three';
import {
  addTatauBands,
  createLoftedBodyPartGeometry,
  createPareuSkirtMesh,
  createTorsoCrossbodyBandMesh,
} from './PlayerCharacterBuilder.js';

export const CREW_DESIGN_SPECS = Object.freeze({
  tama: Object.freeze({
    id: 'tama',
    name: 'Tama',
    role: 'Lagoon Fisher',
    homeIsland: "Taha'a",
    totalHeightM: 1.72,
    shoulderWidthM: 0.44,
    chestWidthM: 0.36,
    waistWidthM: 0.30,
    hipWidthM: 0.34,
    chestDepthM: 0.23,
    headRadiusM: 0.112,
    limbThickness: 0.98,
    skinHex: 0xa0643b,
    hairHex: 0x1c1410,
    attireSummary:
      'Braided pandanus headband, iridescent pearl pendant, woven fish basket, checkered lauhala pareu, cowrie wristlet & 3-pronged lagoon trident.',
  }),
  moana: Object.freeze({
    id: 'moana',
    name: 'Moana',
    role: 'Master Sail-Tender',
    homeIsland: 'Ua Pou',
    totalHeightM: 1.69,
    shoulderWidthM: 0.39,
    chestWidthM: 0.33,
    waistWidthM: 0.26,
    hipWidthM: 0.36,
    chestDepthM: 0.21,
    headRadiusM: 0.108,
    limbThickness: 0.88,
    skinHex: 0xa86c43,
    hairHex: 0x171211,
    attireSummary:
      'Flowing ponytail, ochre-and-indigo geometric tapa sleeveless dress, Marquesan shoulder tatau, pearl pendant & coiled sennit sail sheets.',
  }),
  kahu: Object.freeze({
    id: 'kahu',
    name: 'Kahu',
    role: 'Master Hull-Wright',
    homeIsland: 'Hiva Oa',
    totalHeightM: 1.78,
    shoulderWidthM: 0.49,
    chestWidthM: 0.41,
    waistWidthM: 0.33,
    hipWidthM: 0.36,
    chestDepthM: 0.25,
    headRadiusM: 0.116,
    limbThickness: 1.12,
    skinHex: 0x935a34,
    hairHex: 0x1b1512,
    attireSummary:
      'Tied-back long hair, carved bone tiki pendant, chestnut patterned barkcloth tiputa tunic, taupe pareu, marlinspike fid & sennit lashing coil.',
  }),
});

/** Deck seating stations on `VakaRenderer` (local `y = 0.84m` woven pola deck). */
export const CREW_SEAT_SPECS = Object.freeze({
  tama: Object.freeze({ x: -1.42, y: 0.84, z: 1.85, yawRad: 0.92 }),
  moana: Object.freeze({ x: 1.24, y: 0.84, z: -1.18, yawRad: 0.58 }),
  kahu: Object.freeze({ x: -1.04, y: 0.84, z: -2.76, yawRad: 0.38 }),
});

function createPatternedTunicMesh({ rings, radialSegments = 24, colorFn }) {
  const positions = [];
  const colors = [];
  const indices = [];

  for (let r = 0; r < rings.length; r += 1) {
    const v = r / Math.max(1, rings.length - 1);
    const { y, rx, rz, ox = 0.0, oz = 0.0 } = rings[r];
    for (let s = 0; s <= radialSegments; s += 1) {
      const u = s / radialSegments;
      const theta = u * Math.PI * 2.0;
      const x = ox + Math.cos(theta) * rx;
      const z = oz + Math.sin(theta) * rz;
      positions.push(x, y, z);
      const col = colorFn(u, v, theta);
      colors.push(col[0], col[1], col[2]);
    }
  }

  const stride = radialSegments + 1;
  for (let r = 0; r < rings.length - 1; r += 1) {
    for (let s = 0; s < radialSegments; s += 1) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, c, d, a, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      side: THREE.DoubleSide,
    })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createWovenFishBasket(pandanusMat, darkFiberMat, woodRimMat) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 12, 10),
    pandanusMat
  );
  body.scale.set(1.0, 1.15, 0.92);
  body.castShadow = true;
  grp.add(body);

  for (const ang of [0.35, -0.35, 1.05]) {
    const weaveRib = new THREE.Mesh(
      new THREE.TorusGeometry(0.114, 0.008, 5, 16),
      darkFiberMat
    );
    weaveRib.rotation.y = ang;
    weaveRib.scale.set(1.0, 1.12, 0.94);
    grp.add(weaveRib);
  }

  const neckRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.068, 0.013, 6, 16),
    woodRimMat
  );
  neckRim.rotation.x = Math.PI * 0.5;
  neckRim.position.y = 0.118;
  grp.add(neckRim);
  return grp;
}

function createFishingTrident(shaftMat, prongMat, sennitMat) {
  const grp = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.019, 1.56, 8),
    shaftMat
  );
  shaft.position.y = 0.12;
  shaft.castShadow = true;
  grp.add(shaft);

  const lashing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.022, 0.11, 8),
    sennitMat
  );
  lashing.position.y = 0.88;
  grp.add(lashing);

  // Carved three-pronged barbed lagoon head
  for (const sx of [-0.056, 0.0, 0.056]) {
    const hLen = sx === 0.0 ? 0.30 : 0.25;
    const prong = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, hLen, 6),
      prongMat
    );
    prong.position.set(sx, 0.94 + hLen * 0.5, 0.0);
    prong.rotation.z = sx === 0.0 ? 0.0 : sx > 0 ? -0.08 : 0.08;
    prong.castShadow = true;
    grp.add(prong);

    if (sx !== 0.0) {
      const shoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.012, 0.085, 6),
        prongMat
      );
      shoulder.position.set(sx * 0.54, 0.92, 0.0);
      shoulder.rotation.z = sx > 0 ? -0.68 : 0.68;
      grp.add(shoulder);
    }
  }
  return grp;
}

function createRopeCoilMesh(sennitMat, radius = 0.085, loops = 3) {
  const grp = new THREE.Group();
  for (let i = 0; i < loops; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius + (i % 2) * 0.006, 0.011, 6, 16),
      sennitMat
    );
    ring.position.set(0, (i - 1) * 0.012, 0);
    ring.rotation.x = Math.PI * 0.5 + (i - 1) * 0.05;
    grp.add(ring);
  }
  return grp;
}

function buildSeatedBodyBase(spec, skinMat, hairMat) {
  const H = spec.totalHeightM;
  const lt = spec.limbThickness;
  const hipY = H * 0.525;
  const waistY = H * 0.585;
  const neckBaseY = H * 0.845;
  const headCenterY = H - spec.headRadiusM * 1.05;
  const torsoH = neckBaseY - waistY;

  const root = new THREE.Group();
  root.name = `crew_character_${spec.id}`;

  // Seated pelvis resting directly on canoe deck at local y = 0.0
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0.0, 0.155, 0.0);
  root.add(pelvisGroup);

  const stanceHalfX = spec.hipWidthM * 0.42;
  const legLen = hipY;
  const thighLen = legLen * 0.48;
  const shinLen = legLen * 0.42;

  const legs = {};
  for (const side of [-1, 1]) {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * stanceHalfX, 0.0, -0.02);
    hipPivot.rotation.order = 'YXZ';
    pelvisGroup.add(hipPivot);

    const rThigh = 0.064 * lt;
    const rKnee = 0.045 * lt;
    const rCalf = 0.049 * lt;
    const rAnkle = 0.031 * lt;

    const thighGeo = createLoftedBodyPartGeometry([
      { y: -thighLen, rx: rKnee, rz: rKnee * 1.04, oz: -0.005 },
      { y: -thighLen * 0.46, rx: rThigh * 0.94, rz: rThigh * 1.02 },
      { y: 0.03, rx: rThigh, rz: rThigh * 1.06 },
    ]);
    const thighMesh = new THREE.Mesh(thighGeo, skinMat);
    thighMesh.castShadow = true;
    thighMesh.receiveShadow = true;
    hipPivot.add(thighMesh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0.0, -thighLen, 0.0);
    kneePivot.rotation.order = 'YXZ';
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(
      new THREE.SphereGeometry(rKnee * 0.95, 8, 8),
      skinMat
    );
    kneePivot.add(kneeCap);

    const shinGeo = createLoftedBodyPartGeometry([
      { y: -shinLen, rx: rAnkle, rz: rAnkle * 1.08 },
      { y: -shinLen * 0.44, rx: rCalf, rz: rCalf * 1.12, oz: 0.01 },
      { y: 0.0, rx: rKnee, rz: rKnee * 1.04, oz: -0.005 },
    ]);
    const shinMesh = new THREE.Mesh(shinGeo, skinMat);
    shinMesh.castShadow = true;
    shinMesh.receiveShadow = true;
    kneePivot.add(shinMesh);

    const footGrp = new THREE.Group();
    footGrp.position.set(0.0, -shinLen - 0.012, -0.035);
    const footMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.074 * lt, 0.042, 0.185 * lt),
      skinMat
    );
    footMesh.castShadow = true;
    footGrp.add(footMesh);
    const heel = new THREE.Mesh(
      new THREE.SphereGeometry(0.033 * lt, 8, 8),
      skinMat
    );
    heel.position.set(0, -0.002, 0.068 * lt);
    footGrp.add(heel);
    kneePivot.add(footGrp);

    legs[side < 0 ? 'left' : 'right'] = {
      hipPivot,
      kneePivot,
      footGrp,
      rThigh,
      rKnee,
      rCalf,
      rAnkle,
      thighLen,
      shinLen,
    };
  }

  // Torso group perched above seated pelvis
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0.0, waistY - hipY, 0.0);
  pelvisGroup.add(torsoGroup);

  const isFeminine = spec.id === 'moana';
  const torsoRings = [
    { y: -0.02, rx: spec.waistWidthM * 0.5, rz: spec.chestDepthM * 0.48, oz: 0.0 },
    {
      y: torsoH * 0.34,
      rx: spec.chestWidthM * (isFeminine ? 0.44 : 0.48),
      rz: spec.chestDepthM * 0.50,
      oz: 0.0,
    },
    {
      y: torsoH * 0.70,
      rx: spec.chestWidthM * 0.52,
      rz: spec.chestDepthM * (isFeminine ? 0.56 : 0.52),
      oz: isFeminine ? -0.012 : -0.005,
    },
    { y: torsoH * 0.92, rx: spec.shoulderWidthM * 0.45, rz: spec.chestDepthM * 0.44, oz: 0.0 },
    { y: torsoH * 1.03, rx: spec.headRadiusM * 0.52, rz: spec.headRadiusM * 0.52, oz: 0.0 },
  ];
  const torsoMesh = new THREE.Mesh(
    createLoftedBodyPartGeometry(torsoRings),
    skinMat
  );
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  const neckLen = headCenterY - neckBaseY;
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(
      spec.headRadiusM * 0.43,
      spec.headRadiusM * 0.50,
      neckLen + 0.04,
      12
    ),
    skinMat
  );
  neck.position.y = torsoH + neckLen * 0.42;
  torsoGroup.add(neck);

  // Articulated arms & hands
  const upperArmLen = H * 0.172;
  const forearmLen = H * 0.152;
  const rShoulder = 0.047 * lt;
  const rElbow = 0.035 * lt;
  const rWrist = 0.026 * lt;

  const arms = {};
  for (const side of [-1, 1]) {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(
      side * spec.shoulderWidthM * 0.48,
      torsoH * 0.88,
      0.0
    );
    torsoGroup.add(shoulderPivot);

    const deltoid = new THREE.Mesh(
      new THREE.SphereGeometry(rShoulder * 1.05, 10, 10),
      skinMat
    );
    shoulderPivot.add(deltoid);

    const upperArm = new THREE.Mesh(
      createLoftedBodyPartGeometry([
        { y: -upperArmLen, rx: rElbow, rz: rElbow },
        { y: -upperArmLen * 0.48, rx: rShoulder * 0.90, rz: rShoulder * 0.94 },
        { y: 0.0, rx: rShoulder, rz: rShoulder },
      ]),
      skinMat
    );
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0.0, -upperArmLen, 0.0);
    shoulderPivot.add(elbowPivot);

    elbowPivot.add(
      new THREE.Mesh(new THREE.SphereGeometry(rElbow * 0.95, 8, 8), skinMat)
    );

    const forearm = new THREE.Mesh(
      createLoftedBodyPartGeometry([
        { y: -forearmLen, rx: rWrist, rz: rWrist * 1.08 },
        { y: -forearmLen * 0.42, rx: rElbow * 0.94, rz: rElbow * 0.98 },
        { y: 0.0, rx: rElbow, rz: rElbow },
      ]),
      skinMat
    );
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(rWrist * 1.24, 8, 8),
      skinMat
    );
    hand.scale.set(0.86, 1.32, 1.05);
    hand.position.set(0.0, -forearmLen - 0.024 * lt, 0.0);
    elbowPivot.add(hand);

    arms[side < 0 ? 'left' : 'right'] = {
      shoulderPivot,
      elbowPivot,
      hand,
      upperArmLen,
      forearmLen,
      rShoulder,
      rElbow,
      rWrist,
    };
  }

  // Head & sculpted Polynesian facial features (-Z forward)
  const headGroup = new THREE.Group();
  headGroup.position.set(0.0, headCenterY - waistY, 0.0);
  torsoGroup.add(headGroup);

  const R = spec.headRadiusM;
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 16), skinMat);
  cranium.scale.set(0.92, 1.08, 0.98);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(R * 0.16, R * 0.36, 6), skinMat);
  nose.rotation.x = -Math.PI * 0.42;
  nose.position.set(0.0, -R * 0.04, -R * 0.95);
  headGroup.add(nose);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x160f0b, roughness: 0.28 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 8, 8), eyeMat);
    eye.position.set(side * R * 0.32, R * 0.08, -R * 0.88);
    headGroup.add(eye);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(R * 0.25, R * 0.052, R * 0.08),
      hairMat
    );
    brow.position.set(side * R * 0.33, R * 0.22, -R * 0.88);
    brow.rotation.z = side * -0.08;
    headGroup.add(brow);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.18, 8, 8), skinMat);
    ear.scale.set(0.42, 0.95, 0.65);
    ear.position.set(side * R * 0.91, -R * 0.02, 0.02);
    headGroup.add(ear);
  }

  return {
    root,
    spec,
    pelvisGroup,
    torsoGroup,
    headGroup,
    arms,
    legs,
    hipY,
    waistY,
    torsoH,
    torsoRings,
    R,
    lt,
  };
}

function outfitTama(base, mats) {
  const { pelvisGroup, torsoGroup, headGroup, arms, legs, torsoH, torsoRings, spec, R, lt } = base;
  const skirtTopY = base.waistY - base.hipY + 0.018;

  // 1. Seated Cross-Legged Left + Braced Knee-Up Right Pose
  legs.left.hipPivot.rotation.set(1.42, 0.70, 0.0);
  legs.left.kneePivot.rotation.set(0.08, -0.10, 1.92);
  legs.left.footGrp.rotation.x = 0.28;

  legs.right.hipPivot.rotation.set(2.34, -0.18, 0.0);
  legs.right.kneePivot.rotation.set(-2.34, 0.0, 0.0);

  // Left calf & both forearms tatau bands + white cowrie right-wrist bracelet
  addTatauBands(
    legs.left.kneePivot,
    [
      { y: -legs.left.shinLen * 0.45, r: legs.left.rCalf * 1.05, h: 0.025 },
      { y: -legs.left.shinLen * 0.62, r: legs.left.rCalf * 1.04, h: 0.018 },
    ],
    mats.tatauMat
  );
  for (const key of ['left', 'right']) {
    addTatauBands(
      arms[key].elbowPivot,
      [
        { y: -arms[key].forearmLen * 0.34, r: arms[key].rElbow * 0.92, h: 0.024 },
        { y: -arms[key].forearmLen * 0.56, r: arms[key].rWrist * 1.15, h: 0.018 },
      ],
      mats.tatauMat
    );
  }
  for (let c = 0; c < 6; c += 1) {
    const a = (c / 6) * Math.PI * 2.0;
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.010, 6, 6),
      mats.pearlShellMat
    );
    shell.scale.set(0.8, 1.1, 0.7);
    shell.position.set(
      Math.cos(a) * arms.right.rWrist * 1.24,
      -arms.right.forearmLen + 0.022,
      Math.sin(a) * arms.right.rWrist * 1.24
    );
    arms.right.elbowPivot.add(shell);
  }

  // 2. Woven Lauhala Pareu & Braided Sennit Rope Belt with Knotted Tassels
  const pareu = createPareuSkirtMesh({
    topRx: spec.waistWidthM * 0.56,
    topRz: spec.chestDepthM * 0.56,
    botRx: spec.hipWidthM * 0.80,
    botRz: spec.chestDepthM * 0.82,
    height: 0.145,
    baseRgb: [0.85, 0.72, 0.48],
    bandRgb: [0.58, 0.36, 0.18],
    trimRgb: [0.28, 0.16, 0.08],
    wovenCheck: true,
    forwardDrapeZ: 0.11,
  });
  pareu.position.y = skirtTopY;
  pelvisGroup.add(pareu);

  const beltGeo = new THREE.TorusGeometry(1.0, 0.06, 8, 28);
  beltGeo.rotateX(Math.PI * 0.5);
  const belt = new THREE.Mesh(beltGeo, mats.sennitMat);
  belt.scale.set(spec.waistWidthM * 0.58, 0.55, spec.chestDepthM * 0.58);
  belt.position.y = skirtTopY - 0.004;
  pelvisGroup.add(belt);

  for (const xOff of [-0.022, 0.024]) {
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.015, 0.15, 6),
      mats.sennitMat
    );
    tail.position.set(xOff, skirtTopY - 0.085, -spec.chestDepthM * 0.60);
    tail.rotation.x = -0.35;
    pelvisGroup.add(tail);
  }

  // 3. Bare Chest Pearl-Shell Pendant + Crossbody Cord & Woven Fish Basket ('ete)
  const cord = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.78, 0.007, 6, 18),
    mats.darkCordMat
  );
  cord.rotation.x = Math.PI * 0.5 + 0.24;
  cord.position.set(0, torsoH * 0.90, -0.015);
  torsoGroup.add(cord);

  const shellDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.010, 14),
    mats.pearlShellMat
  );
  shellDisc.rotation.x = Math.PI * 0.5 - 0.12;
  shellDisc.position.set(0, torsoH * 0.74, -spec.chestDepthM * 0.55);
  torsoGroup.add(shellDisc);

  const basketCord = createTorsoCrossbodyBandMesh({
    torsoRings,
    torsoH,
    shoulderSide: 1,
    halfWidth: 0.013,
    thickness: 0.005,
    liftM: 0.0025,
    variant: 'braided_cord',
  });
  torsoGroup.add(basketCord);

  const fishBasket = createWovenFishBasket(
    mats.pandanusMat,
    mats.sennitMat,
    mats.woodDarkMat
  );
  fishBasket.position.set(-spec.hipWidthM * 0.88, 0.045, -0.03);
  pelvisGroup.add(fishBasket);

  // 4. Curly Wavy Hair, Half-Up Back Knot & Braided Pandanus Headband
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.05, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.64),
    mats.hairMat
  );
  hairCap.scale.set(0.96, 1.07, 1.03);
  hairCap.rotation.x = -0.24;
  headGroup.add(hairCap);

  const backKnot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.42, 10, 8), mats.hairMat);
  backKnot.scale.set(0.92, 1.05, 0.98);
  backKnot.position.set(0.0, R * 0.52, R * 0.92);
  headGroup.add(backKnot);

  for (let i = -3; i <= 3; i += 1) {
    const curl = new THREE.Mesh(new THREE.SphereGeometry(R * 0.24, 8, 8), mats.hairMat);
    curl.scale.set(0.85, 1.38, 0.85);
    const a = i * 0.34;
    curl.position.set(Math.sin(a) * R * 0.86, -R * 0.24, Math.cos(a) * R * 0.88 + 0.015);
    headGroup.add(curl);
  }

  const headBand = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.98, R * 0.125, 7, 22),
    mats.pandanusMat
  );
  headBand.rotation.x = Math.PI * 0.5 - 0.12;
  headBand.position.y = R * 0.30;
  headGroup.add(headBand);

  // 5. Three-Pronged Fishing Trident gripped diagonally in left hand while seated
  arms.left.shoulderPivot.rotation.set(0.45, 0.12, -0.24);
  arms.left.elbowPivot.rotation.set(0.92, 0.0, 0.14);

  arms.right.shoulderPivot.rotation.set(0.62, -0.10, 0.18);
  arms.right.elbowPivot.rotation.set(0.86, 0.0, -0.18);

  const trident = createFishingTrident(mats.woodDarkMat, mats.woodLightMat, mats.sennitMat);
  trident.position.set(0.0, -arms.left.forearmLen - 0.02 * lt, -0.02);
  trident.rotation.set(-0.32, 0.0, 0.16);
  arms.left.elbowPivot.add(trident);

  return { trident };
}

function outfitMoana(base, mats) {
  const { pelvisGroup, torsoGroup, headGroup, arms, legs, torsoH, torsoRings, spec, R, lt } = base;
  const skirtTopY = base.waistY - base.hipY + 0.018;

  // 1. Symmetric Cross-Legged Seated Pose facing forward toward main sail sheet
  legs.left.hipPivot.rotation.set(1.42, 0.70, 0.0);
  legs.left.kneePivot.rotation.set(0.08, -0.10, 1.92);
  legs.left.footGrp.rotation.x = 0.28;

  legs.right.hipPivot.rotation.set(1.46, -0.68, 0.0);
  legs.right.kneePivot.rotation.set(0.06, 0.10, -1.88);
  legs.right.footGrp.rotation.x = 0.28;

  // 2. Ochre-Gold & Deep Indigo Geometric Tapa Dress (Bodice + Seated Wrap Pareu)
  const goldTapa = [0.85, 0.62, 0.24];
  const indigoDye = [0.11, 0.18, 0.29];
  const tapaDressColor = (u, v) => {
    const wave = Math.sin(u * Math.PI * 12.0 + v * 5.0);
    const chevron = Math.abs(((u * 14.0 + v * 2.0) % 1.0) * 2.0 - 1.0);
    if (v < 0.14) return chevron > 0.45 ? indigoDye : goldTapa;
    if (v > 0.80) return chevron < 0.55 ? indigoDye : goldTapa;
    return wave > 0.34 ? indigoDye : goldTapa;
  };

  // Fitted upper bodice hugging torso from waist up to chest top (`y = torsoH * 0.79`)
  const bodiceRings = torsoRings
    .slice(0, 3)
    .map((r) => ({ y: r.y, rx: r.rx + 0.008, rz: r.rz + 0.008, oz: r.oz ?? 0.0 }));
  bodiceRings.push({
    y: torsoH * 0.82,
    rx: spec.chestWidthM * 0.48,
    rz: spec.chestDepthM * 0.52,
    oz: -0.006,
  });
  torsoGroup.add(createPatternedTunicMesh({ rings: bodiceRings, colorFn: tapaDressColor }));

  // Sleeveless shoulder straps over both shoulders
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(spec.chestDepthM * 0.46, 0.022, 6, 16, Math.PI * 1.05),
      mats.ochreTapaMat
    );
    strap.rotation.y = Math.PI * 0.5;
    strap.rotation.x = -0.15;
    strap.position.set(side * spec.shoulderWidthM * 0.25, torsoH * 0.78, 0.0);
    torsoGroup.add(strap);
  }

  const dressSkirt = createPareuSkirtMesh({
    topRx: spec.waistWidthM * 0.57,
    topRz: spec.chestDepthM * 0.57,
    botRx: spec.hipWidthM * 0.82,
    botRz: spec.chestDepthM * 0.84,
    height: 0.148,
    baseRgb: goldTapa,
    bandRgb: indigoDye,
    trimRgb: indigoDye,
    forwardDrapeZ: 0.12,
    colorFn: tapaDressColor,
  });
  dressSkirt.position.y = skirtTopY;
  pelvisGroup.add(dressSkirt);

  // Coiled golden-tan sennit sail sheet rope wrapped around her waist
  const waistCoil = createRopeCoilMesh(mats.lightRopeMat, spec.hipWidthM * 0.47, 3);
  waistCoil.position.set(0.0, skirtTopY + 0.01, 0.0);
  pelvisGroup.add(waistCoil);

  // Side rope loop hanging beside her right hip
  const hangLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.012, 6, 14),
    mats.lightRopeMat
  );
  hangLoop.position.set(spec.hipWidthM * 0.54, skirtTopY - 0.055, -0.06);
  hangLoop.rotation.y = 0.6;
  pelvisGroup.add(hangLoop);

  // 3. Marquesan Shoulder/Bicep & Forearm Tatau + Pearl-Shell Chest Pendant
  for (const key of ['left', 'right']) {
    addTatauBands(
      arms[key].shoulderPivot,
      [
        { y: -arms[key].upperArmLen * 0.20, r: arms[key].rShoulder * 1.0, h: 0.036 },
        { y: -arms[key].upperArmLen * 0.46, r: arms[key].rShoulder * 0.92, h: 0.024 },
      ],
      mats.tatauMat
    );
    addTatauBands(
      arms[key].elbowPivot,
      [{ y: -arms[key].forearmLen * 0.36, r: arms[key].rElbow * 0.92, h: 0.022 }],
      mats.tatauMat
    );
  }

  const cord = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.76, 0.007, 6, 18),
    mats.darkCordMat
  );
  cord.rotation.x = Math.PI * 0.5 + 0.22;
  cord.position.set(0, torsoH * 0.90, -0.014);
  torsoGroup.add(cord);

  const shellDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.034, 0.009, 14),
    mats.pearlShellMat
  );
  shellDisc.rotation.x = Math.PI * 0.5 - 0.12;
  shellDisc.position.set(0, torsoH * 0.77, -spec.chestDepthM * 0.56);
  torsoGroup.add(shellDisc);

  // 4. Swept Dark Hair + Dynamic Windswept Ponytail (+Z back)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.04, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
    mats.hairMat
  );
  hairCap.scale.set(0.95, 1.07, 1.02);
  hairCap.rotation.x = -0.25;
  headGroup.add(hairCap);

  const hairTie = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.28, 0.011, 6, 12),
    mats.sennitMat
  );
  hairTie.rotation.x = Math.PI * 0.35;
  hairTie.position.set(0, R * 0.10, R * 1.02);
  headGroup.add(hairTie);

  const ponytailGroup = new THREE.Group();
  ponytailGroup.position.set(0, R * 0.08, R * 1.02);
  const ponytailMesh = new THREE.Mesh(
    createLoftedBodyPartGeometry([
      { y: -R * 2.15, rx: R * 0.22, rz: R * 0.16, oz: R * 0.75 },
      { y: -R * 1.25, rx: R * 0.38, rz: R * 0.26, oz: R * 0.52 },
      { y: -R * 0.42, rx: R * 0.42, rz: R * 0.32, oz: R * 0.25 },
      { y: 0.0, rx: R * 0.24, rz: R * 0.22, oz: 0.0 },
    ]),
    mats.hairMat
  );
  ponytailMesh.castShadow = true;
  ponytailGroup.add(ponytailMesh);
  headGroup.add(ponytailGroup);

  // 5. Raised Sailor Arms Holding Taut Sail-Sheet Rope Segment
  arms.left.shoulderPivot.rotation.set(0.74, 0.16, -0.18);
  arms.left.elbowPivot.rotation.set(0.88, 0.0, 0.14);

  arms.right.shoulderPivot.rotation.set(0.58, -0.22, 0.22);
  arms.right.elbowPivot.rotation.set(1.02, 0.0, -0.18);

  const sheetLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.58, 8),
    mats.lightRopeMat
  );
  sheetLine.rotation.z = Math.PI * 0.46;
  sheetLine.rotation.y = 0.28;
  sheetLine.position.set(-0.02, torsoH * 0.48, -0.34);
  torsoGroup.add(sheetLine);

  return { ponytailGroup, sheetLine };
}

function outfitKahu(base, mats) {
  const { pelvisGroup, torsoGroup, headGroup, arms, legs, torsoH, torsoRings, spec, R, lt } = base;
  const skirtTopY = base.waistY - base.hipY + 0.018;

  // 1. Seated Cross-Legged Craft Pose leaning forward over forward kiato lashings
  legs.left.hipPivot.rotation.set(1.42, 0.70, 0.0);
  legs.left.kneePivot.rotation.set(0.08, -0.10, 1.92);
  legs.left.footGrp.rotation.x = 0.28;

  legs.right.hipPivot.rotation.set(1.46, -0.68, 0.0);
  legs.right.kneePivot.rotation.set(0.06, 0.10, -1.88);
  legs.right.footGrp.rotation.x = 0.28;

  // 2. Chestnut-Ochre Patterned Barkcloth Tunic ('tiputa') + Short Cap Sleeves
  const chestnutRgb = [0.62, 0.39, 0.21];
  const darkUmberRgb = [0.22, 0.13, 0.08];
  const ochreTrimRgb = [0.78, 0.56, 0.31];
  const tiputaColor = (u, v) => {
    const zig = Math.abs(((u * 16.0) % 1.0) * 2.0 - 1.0);
    if (v > 0.83) return zig > 0.45 ? darkUmberRgb : ochreTrimRgb;
    if (v > 0.34 && v < 0.64 && (Math.abs(u - 0.75) < 0.18 || Math.abs(u - 0.25) < 0.18)) {
      return zig > 0.52 ? darkUmberRgb : chestnutRgb;
    }
    return chestnutRgb;
  };

  const tunicRings = torsoRings
    .slice(0, 4)
    .map((r) => ({ y: r.y, rx: r.rx + 0.012, rz: r.rz + 0.012, oz: r.oz ?? 0.0 }));
  torsoGroup.add(createPatternedTunicMesh({ rings: tunicRings, colorFn: tiputaColor }));

  for (const key of ['left', 'right']) {
    const sleeveGeo = createLoftedBodyPartGeometry([
      { y: -arms[key].upperArmLen * 0.44, rx: arms[key].rShoulder * 1.18, rz: arms[key].rShoulder * 1.2 },
      { y: 0.025, rx: arms[key].rShoulder * 1.28, rz: arms[key].rShoulder * 1.28 },
    ]);
    const sleeve = new THREE.Mesh(sleeveGeo, mats.chestnutTapaMat);
    sleeve.castShadow = true;
    arms[key].shoulderPivot.add(sleeve);
  }

  // Warm Taupe Pleated Pareu + Braided Sennit Waist Rope & Hanging Knotted Tails
  const taupePareu = createPareuSkirtMesh({
    topRx: spec.waistWidthM * 0.58,
    topRz: spec.chestDepthM * 0.58,
    botRx: spec.hipWidthM * 0.80,
    botRz: spec.chestDepthM * 0.82,
    height: 0.148,
    baseRgb: [0.49, 0.39, 0.30],
    bandRgb: [0.22, 0.15, 0.10],
    trimRgb: [0.16, 0.11, 0.08],
    forwardDrapeZ: 0.12,
  });
  taupePareu.position.y = skirtTopY;
  pelvisGroup.add(taupePareu);

  const beltGeo = new THREE.TorusGeometry(1.0, 0.062, 8, 28);
  beltGeo.rotateX(Math.PI * 0.5);
  const belt = new THREE.Mesh(beltGeo, mats.sennitMat);
  belt.scale.set(spec.waistWidthM * 0.60, 0.56, spec.chestDepthM * 0.60);
  belt.position.y = skirtTopY - 0.004;
  pelvisGroup.add(belt);

  for (const xOff of [0.04, 0.085]) {
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.015, 0.15, 6),
      mats.sennitMat
    );
    tail.position.set(xOff, skirtTopY - 0.085, -spec.chestDepthM * 0.61);
    tail.rotation.x = -0.35;
    pelvisGroup.add(tail);
  }

  // 3. Carved Whalebone Tiki Pendant on Sennit Cord
  const cord = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.78, 0.007, 6, 18),
    mats.darkCordMat
  );
  cord.rotation.x = Math.PI * 0.5 + 0.24;
  cord.position.set(0, torsoH * 0.90, -0.016);
  torsoGroup.add(cord);

  const tikiCarving = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.062, 0.016),
    mats.boneMat
  );
  tikiCarving.position.set(0, torsoH * 0.73, -spec.chestDepthM * 0.58);
  tikiCarving.rotation.x = -0.14;
  torsoGroup.add(tikiCarving);

  // 4. Long Dark Swept-Back Hair Tied Behind Shoulders
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.05, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
    mats.hairMat
  );
  hairCap.scale.set(0.96, 1.07, 1.04);
  hairCap.rotation.x = -0.28;
  headGroup.add(hairCap);

  const backHair = new THREE.Mesh(
    createLoftedBodyPartGeometry([
      { y: -R * 1.95, rx: R * 0.68, rz: R * 0.22, oz: R * 0.88 },
      { y: -R * 1.05, rx: R * 0.84, rz: R * 0.34, oz: R * 0.78 },
      { y: -R * 0.20, rx: R * 0.88, rz: R * 0.38, oz: R * 0.62 },
    ]),
    mats.hairMat
  );
  backHair.castShadow = true;
  headGroup.add(backHair);

  // 5. Hardwood Marlinspike / Lashing Fid in Right Hand & Sennit Coil in Left Hand
  arms.right.shoulderPivot.rotation.set(0.55, -0.10, 0.14);
  arms.right.elbowPivot.rotation.set(0.96, 0.0, -0.12);

  arms.left.shoulderPivot.rotation.set(0.58, 0.18, -0.18);
  arms.left.elbowPivot.rotation.set(0.98, 0.0, 0.12);

  const fid = new THREE.Mesh(
    new THREE.ConeGeometry(0.016, 0.22, 8),
    mats.woodDarkMat
  );
  fid.rotation.x = -Math.PI * 0.55;
  fid.position.set(0.0, -arms.right.forearmLen - 0.025 * lt, -0.05);
  arms.right.elbowPivot.add(fid);

  const sennitCoil = createRopeCoilMesh(mats.lightRopeMat, 0.072, 3);
  sennitCoil.position.set(0.0, -arms.left.forearmLen - 0.03 * lt, -0.04);
  sennitCoil.rotation.x = 0.72;
  arms.left.elbowPivot.add(sennitCoil);

  return { fid, sennitCoil };
}

/**
 * Builds a complete, articulated, seated 3D crew character rig for `tama`, `moana`, or `kahu`.
 * Local feet/seated contact lies at `y = 0.0`, facing `-Z`.
 */
export function createCrewCharacterRig(crewId = 'tama') {
  const spec = CREW_DESIGN_SPECS[crewId] || CREW_DESIGN_SPECS.tama;
  const skinMat = new THREE.MeshStandardMaterial({
    color: spec.skinHex,
    roughness: 0.65,
    metalness: 0.03,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: spec.hairHex,
    roughness: 0.78,
  });

  const mats = {
    hairMat,
    sennitMat: new THREE.MeshStandardMaterial({ color: 0x5c391e, roughness: 0.86 }),
    lightRopeMat: new THREE.MeshStandardMaterial({ color: 0xb78f52, roughness: 0.84 }),
    darkCordMat: new THREE.MeshStandardMaterial({ color: 0x201814, roughness: 0.82 }),
    pandanusMat: new THREE.MeshStandardMaterial({ color: 0xd9bc84, roughness: 0.84 }),
    pearlShellMat: new THREE.MeshStandardMaterial({
      color: 0xe6f2f0,
      roughness: 0.24,
      metalness: 0.28,
    }),
    boneMat: new THREE.MeshStandardMaterial({ color: 0xc29e74, roughness: 0.55 }),
    tatauMat: new THREE.MeshStandardMaterial({
      color: 0x1b242b,
      roughness: 0.74,
      side: THREE.DoubleSide,
    }),
    woodDarkMat: new THREE.MeshStandardMaterial({ color: 0x4e2d17, roughness: 0.68 }),
    woodLightMat: new THREE.MeshStandardMaterial({ color: 0x8f6236, roughness: 0.72 }),
    ochreTapaMat: new THREE.MeshStandardMaterial({ color: 0xd89c42, roughness: 0.84 }),
    chestnutTapaMat: new THREE.MeshStandardMaterial({ color: 0x9e6436, roughness: 0.84 }),
  };

  const base = buildSeatedBodyBase(spec, skinMat, hairMat);
  let props = {};
  if (spec.id === 'moana') {
    props = outfitMoana(base, mats);
  } else if (spec.id === 'kahu') {
    props = outfitKahu(base, mats);
  } else {
    props = outfitTama(base, mats);
  }

  return {
    ...base,
    crewId: spec.id,
    props,
  };
}

/**
 * Animates a seated crew member gently breathing, balancing ocean roll/pitch,
 * and tending their distinctive voyaging craft on deck.
 */
export function animateCrewCharacterRig(
  rig,
  elapsedSec = 0.0,
  { hullState = null, fastForward = false, sailFlutter = 0.0 } = {}
) {
  if (!rig) return;
  const phaseOffset =
    rig.crewId === 'moana' ? 1.8 : rig.crewId === 'kahu' ? 3.4 : 0.3;
  const t = elapsedSec + phaseOffset;
  const breath = Math.sin(t * 1.9);
  const roll = hullState ? hullState.rollRad : 0.0;
  const pitch = hullState ? hullState.pitchRad : 0.0;
  const workFreq = fastForward ? 2.4 : 1.0;

  // Seated torso gently counter-balances sea roll and breathes smoothly
  rig.pelvisGroup.rotation.z = roll * 0.14;
  rig.torsoGroup.rotation.z = -roll * 0.18 + Math.sin(t * 0.85) * 0.015;
  rig.torsoGroup.rotation.x = 0.06 - pitch * 0.18 + breath * 0.014;

  if (rig.crewId === 'tama') {
    // Tama watches the port lagoon wake and subtly shifts his fishing trident
    rig.torsoGroup.rotation.y = Math.sin(t * 0.55) * 0.05;
    rig.headGroup.rotation.y = -0.22 + Math.sin(t * 0.72) * 0.18;
    rig.headGroup.rotation.x = 0.04 + Math.sin(t * 1.2) * 0.025;
    rig.arms.left.shoulderPivot.rotation.x = 0.45 + Math.sin(t * 1.4) * 0.04;
    rig.arms.right.shoulderPivot.rotation.x = 0.62 + Math.cos(t * 1.4) * 0.03;
  } else if (rig.crewId === 'moana') {
    // Moana hauls/eases the sail sheet rhythmically in sync with sail breeze
    const haul = Math.sin(t * 1.65 * workFreq) * 0.075 + sailFlutter * 0.8;
    rig.torsoGroup.rotation.x += 0.04 + haul * 0.35;
    rig.headGroup.rotation.y = 0.18 + Math.sin(t * 0.8) * 0.12;
    rig.headGroup.rotation.x = -0.14 + Math.sin(t * 1.3) * 0.03; // glancing up toward crab-claw sail
    rig.arms.left.shoulderPivot.rotation.x = 0.74 + haul;
    rig.arms.right.shoulderPivot.rotation.x = 0.58 - haul * 0.8;
    if (rig.props?.ponytailGroup) {
      rig.props.ponytailGroup.rotation.x = 0.18 + Math.abs(haul) * 0.4 + Math.sin(t * 4.2) * 0.06;
      rig.props.ponytailGroup.rotation.z = Math.sin(t * 3.1) * 0.09;
    }
  } else if (rig.crewId === 'kahu') {
    // Kahu inspects forward crossbeam lashings and works sennit with his fid
    const lashMotion = Math.sin(t * 1.9 * workFreq) * 0.07;
    rig.torsoGroup.rotation.x += 0.12;
    rig.headGroup.rotation.y = Math.sin(t * 0.65) * 0.10;
    rig.headGroup.rotation.x = 0.14 + Math.sin(t * 1.1) * 0.02;
    rig.arms.right.shoulderPivot.rotation.x = 0.55 + lashMotion;
    rig.arms.right.elbowPivot.rotation.z = -0.12 + lashMotion * 0.45;
    rig.arms.left.shoulderPivot.rotation.x = 0.58 - lashMotion * 0.4;
  }
}
