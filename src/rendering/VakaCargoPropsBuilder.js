/**
 * Sculpted 3D Polynesian Deck Provisions & Quest Cargo Props for `VakaRenderer`:
 * - Woven flared pandanus ration baskets (`kete`) brimming with ti-leaf food parcels & breadfruit,
 *   paired with hourglass calabash water gourds (`hue wai`) in braided sennit slings.
 * - Three distinct lashed quest cargo bundles: rolled pandanus/tapa mat bales, a slatted tamanu
 *   timber & basalt adze parcel, and coiled sennit cordage atop a carved `waka huia` treasure chest.
 */

import * as THREE from 'three';

let sharedAssets = null;

function getSharedAssets() {
  if (sharedAssets) return sharedAssets;

  const basketMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.02,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xa67638,
    roughness: 0.84,
  });
  const tiLeafMat = new THREE.MeshStandardMaterial({
    color: 0x3b6f2b,
    roughness: 0.72,
  });
  const breadfruitMat = new THREE.MeshStandardMaterial({
    color: 0x7b8c32,
    roughness: 0.78,
  });
  const coconutMat = new THREE.MeshStandardMaterial({
    color: 0x5c3c22,
    roughness: 0.82,
  });
  const gourdMat = new THREE.MeshStandardMaterial({
    color: 0xa66229,
    roughness: 0.44,
    metalness: 0.04,
  });
  const stopperMat = new THREE.MeshStandardMaterial({
    color: 0x452b18,
    roughness: 0.78,
  });
  const sennitMat = new THREE.MeshStandardMaterial({
    color: 0x4a3019,
    roughness: 0.9,
  });
  const tapaMat = new THREE.MeshStandardMaterial({
    color: 0xd9be8a,
    roughness: 0.86,
  });
  const tapaDyeMat = new THREE.MeshStandardMaterial({
    color: 0x8a3022,
    roughness: 0.82,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x5c381f,
    roughness: 0.8,
  });
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x2f3238,
    roughness: 0.58,
    metalness: 0.08,
  });

  // 1. Woven flared pandanus basket (`kete`) via custom lathe + vertex-colored herringbone bands
  const basketPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.11, 0.005),
    new THREE.Vector2(0.135, 0.045),
    new THREE.Vector2(0.165, 0.125),
    new THREE.Vector2(0.172, 0.19),
    new THREE.Vector2(0.155, 0.235),
    new THREE.Vector2(0.142, 0.235),
    new THREE.Vector2(0.148, 0.18),
    new THREE.Vector2(0.125, 0.09),
    new THREE.Vector2(0.0, 0.08),
  ];
  const basketGeo = new THREE.LatheGeometry(basketPts, 14);
  const bPos = basketGeo.attributes.position;
  const bColors = new Float32Array(bPos.count * 3);
  for (let i = 0; i < bPos.count; i += 1) {
    const px = bPos.getX(i);
    const py = bPos.getY(i);
    const pz = bPos.getZ(i);
    const ang = Math.atan2(pz, px);
    // Subtle organic woven rib relief
    const r = Math.hypot(px, pz);
    if (r > 0.04) {
      const ripple = 1.0 + 0.025 * Math.sin(ang * 7.0 + py * 26.0);
      bPos.setX(i, px * ripple);
      bPos.setZ(i, pz * ripple);
    }
    const band = Math.sin(py * 52.0 + ang * 3.0) * 0.5 + 0.5;
    const isStripe = py > 0.09 && py < 0.165 && band > 0.52;
    const shade = 0.88 + 0.14 * Math.sin(py * 24.0);
    if (isStripe) {
      bColors[i * 3] = 0.54 * shade;
      bColors[i * 3 + 1] = 0.36 * shade;
      bColors[i * 3 + 2] = 0.17 * shade;
    } else {
      bColors[i * 3] = 0.78 * shade;
      bColors[i * 3 + 1] = 0.61 * shade;
      bColors[i * 3 + 2] = 0.34 * shade;
    }
  }
  basketGeo.setAttribute('color', new THREE.BufferAttribute(bColors, 3));
  basketGeo.computeVertexNormals();

  const basketRimGeo = new THREE.TorusGeometry(0.151, 0.018, 6, 16);

  // 2. Hourglass Calabash Water Gourd (`hue wai`) via LatheGeometry
  const gourdPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.056, 0.006),
    new THREE.Vector2(0.092, 0.045),
    new THREE.Vector2(0.096, 0.095),
    new THREE.Vector2(0.068, 0.145),
    new THREE.Vector2(0.036, 0.18),
    new THREE.Vector2(0.048, 0.215),
    new THREE.Vector2(0.052, 0.245),
    new THREE.Vector2(0.034, 0.268),
    new THREE.Vector2(0.024, 0.278),
    new THREE.Vector2(0.0, 0.278),
  ];
  const gourdGeo = new THREE.LatheGeometry(gourdPts, 12);
  const gourdStopperGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.038, 8);
  const gourdSlingWaistGeo = new THREE.TorusGeometry(0.041, 0.008, 5, 12);
  const gourdSlingLoopGeo = new THREE.TorusGeometry(0.098, 0.007, 5, 14);

  sharedAssets = {
    basketMat,
    rimMat,
    tiLeafMat,
    breadfruitMat,
    coconutMat,
    gourdMat,
    stopperMat,
    sennitMat,
    tapaMat,
    tapaDyeMat,
    timberMat,
    basaltMat,
    basketGeo,
    basketRimGeo,
    gourdGeo,
    gourdStopperGeo,
    gourdSlingWaistGeo,
    gourdSlingLoopGeo,
  };
  return sharedAssets;
}

/**
 * Builds one sculpted woven ration basket brimming with ti-leaf parcels & fruit,
 * paired with a slung hourglass calabash water gourd. Base rests at local y = 0.
 */
export function createSculptedRationBasketGroup(variantIdx = 0) {
  const a = getSharedAssets();
  const grp = new THREE.Group();

  const basket = new THREE.Mesh(a.basketGeo, a.basketMat);
  basket.castShadow = true;
  basket.receiveShadow = true;
  grp.add(basket);

  const rim = new THREE.Mesh(a.basketRimGeo, a.rimMat);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.232;
  rim.castShadow = true;
  grp.add(rim);

  // Food parcels nestled inside basket opening
  const parcel1 = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 7), a.tiLeafMat);
  parcel1.scale.set(1.15, 0.72, 0.85);
  parcel1.position.set(-0.045, 0.195, 0.02);
  parcel1.rotation.y = 0.5 + variantIdx * 0.7;
  grp.add(parcel1);

  const parcel2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.062, 8, 7),
    variantIdx % 2 === 0 ? a.breadfruitMat : a.coconutMat
  );
  parcel2.scale.set(0.95, 1.08, 0.95);
  parcel2.position.set(0.048, 0.205, -0.028);
  grp.add(parcel2);

  const parcel3 = new THREE.Mesh(new THREE.SphereGeometry(0.052, 7, 6), a.tiLeafMat);
  parcel3.scale.set(1.2, 0.65, 0.8);
  parcel3.position.set(0.015, 0.22, 0.052);
  parcel3.rotation.z = 0.25;
  grp.add(parcel3);

  // Hourglass Calabash Water Gourd (`hue wai`) + sennit sling tucked alongside basket
  const gourdGrp = new THREE.Group();
  const sideAng = (variantIdx % 2 === 0 ? 0.35 : -0.45) + variantIdx * 0.25;
  gourdGrp.position.set(Math.cos(sideAng) * 0.165, 0.0, Math.sin(sideAng) * 0.145);
  gourdGrp.rotation.z = (variantIdx % 2 === 0 ? -1 : 1) * 0.07;

  const gourd = new THREE.Mesh(a.gourdGeo, a.gourdMat);
  gourd.castShadow = true;
  gourd.receiveShadow = true;
  gourdGrp.add(gourd);

  const stopper = new THREE.Mesh(a.gourdStopperGeo, a.stopperMat);
  stopper.position.y = 0.282;
  gourdGrp.add(stopper);

  const waistCord = new THREE.Mesh(a.gourdSlingWaistGeo, a.sennitMat);
  waistCord.rotation.x = Math.PI * 0.5;
  waistCord.position.y = 0.18;
  gourdGrp.add(waistCord);

  const slingLoop = new THREE.Mesh(a.gourdSlingLoopGeo, a.sennitMat);
  slingLoop.position.y = 0.115;
  slingLoop.rotation.y = 0.4;
  gourdGrp.add(slingLoop);

  grp.add(gourdGrp);
  grp.rotation.y = variantIdx * 0.68;
  return grp;
}

/**
 * Builds one of three distinct sculpted Polynesian quest cargo bundles (`variantIdx` 0..2).
 * Base rests cleanly at local y = 0.
 */
export function createSculptedCargoBundleGroup(variantIdx = 0) {
  const a = getSharedAssets();
  const grp = new THREE.Group();
  const kind = variantIdx % 3;

  if (kind === 0) {
    // 0. Rolled Lauhala Pandanus Sleeping-Mat & Tapa Barkcloth Bale (`moenga`)
    const matRollGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.56, 12);
    const rollA = new THREE.Mesh(matRollGeo, a.tapaMat);
    rollA.rotation.x = Math.PI * 0.5;
    rollA.position.set(-0.08, 0.125, 0.0);
    rollA.castShadow = true;
    rollA.receiveShadow = true;
    grp.add(rollA);

    const rollB = new THREE.Mesh(matRollGeo, a.rimMat);
    rollB.rotation.x = Math.PI * 0.5;
    rollB.position.set(0.11, 0.115, 0.02);
    rollB.scale.set(0.88, 0.94, 0.88);
    rollB.castShadow = true;
    grp.add(rollB);

    const topParcel = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), a.tapaDyeMat);
    topParcel.scale.set(1.15, 0.62, 1.45);
    topParcel.position.set(0.01, 0.255, 0.0);
    topParcel.castShadow = true;
    grp.add(topParcel);

    // Sennit binding bands around the bale
    const bandGeo = new THREE.TorusGeometry(0.21, 0.015, 6, 16);
    for (const bz of [-0.15, 0.15]) {
      const band = new THREE.Mesh(bandGeo, a.sennitMat);
      band.scale.set(1.02, 0.72, 1.0);
      band.position.set(0.01, 0.16, bz);
      grp.add(band);
    }
    grp.rotation.y = 0.08;
  } else if (kind === 1) {
    // 1. Slatted Tamanu Timber Frame cradling Tapa-Wrapped Basalt Adze (`to'i`) Parcel
    const railGeo = new THREE.BoxGeometry(0.045, 0.045, 0.52);
    for (const rx of [-0.17, 0.17]) {
      const rail = new THREE.Mesh(railGeo, a.timberMat);
      rail.position.set(rx, 0.024, 0.0);
      rail.castShadow = true;
      grp.add(rail);
    }
    const cleatGeo = new THREE.BoxGeometry(0.4, 0.036, 0.055);
    for (const cz of [-0.18, 0.18]) {
      const cleat = new THREE.Mesh(cleatGeo, a.timberMat);
      cleat.position.set(0.0, 0.052, cz);
      grp.add(cleat);
    }

    // Pillowed tapa parcel resting on the timber cradle
    const bale = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 9), a.tapaMat);
    bale.scale.set(0.98, 0.68, 1.32);
    bale.position.set(0.0, 0.175, 0.0);
    bale.castShadow = true;
    bale.receiveShadow = true;
    grp.add(bale);

    // Painted hiapo ochre-red stripe
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.018, 6, 14), a.tapaDyeMat);
    stripe.scale.set(1.12, 0.68, 1.0);
    stripe.position.set(0.0, 0.175, 0.0);
    grp.add(stripe);

    // Lashed Ceremonial Basalt Adze (`to'i`) resting diagonally across the parcel
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.36, 7), a.timberMat);
    haft.rotation.set(Math.PI * 0.48, 0.0, -0.45);
    haft.position.set(0.0, 0.285, 0.02);
    grp.add(haft);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.032, 0.13), a.basaltMat);
    blade.position.set(0.08, 0.29, -0.1);
    blade.rotation.y = 0.45;
    blade.castShadow = true;
    grp.add(blade);

    const lashing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.01, 5, 10), a.sennitMat);
    lashing.position.set(0.06, 0.29, -0.07);
    lashing.rotation.y = 0.45;
    grp.add(lashing);

    grp.rotation.y = -0.14;
  } else {
    // 2. Carved Wooden Treasure Chest (`waka huia`) topped with Coiled Sennit Cordage
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-0.22, 0.0);
    hullShape.quadraticCurveTo(0.0, 0.14, 0.22, 0.0);
    hullShape.quadraticCurveTo(0.0, -0.14, -0.22, 0.0);

    const chestGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.17,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    chestGeo.rotateX(-Math.PI * 0.5);
    const chest = new THREE.Mesh(chestGeo, a.timberMat);
    chest.position.set(0.0, 0.02, 0.0);
    chest.rotation.y = Math.PI * 0.5;
    chest.castShadow = true;
    chest.receiveShadow = true;
    grp.add(chest);

    // Carved end finials on the waka huia
    for (const fz of [-0.23, 0.23]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 7, 6), a.rimMat);
      knob.position.set(0.0, 0.115, fz);
      grp.add(knob);
    }

    // Double coiled sennit rope resting on the lid
    const coilGeo = new THREE.TorusGeometry(0.095, 0.022, 7, 16);
    for (let c = 0; c < 3; c += 1) {
      const coil = new THREE.Mesh(coilGeo, a.sennitMat);
      coil.rotation.x = Math.PI * 0.5;
      coil.position.set(0.0, 0.225 + c * 0.032, 0.01);
      coil.scale.setScalar(1.0 - c * 0.08);
      coil.castShadow = true;
      grp.add(coil);
    }
    grp.rotation.y = 0.12;
  }

  return grp;
}
