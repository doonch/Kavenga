/**
 * Procedural 3D Polynesian Double-Hulled Voyaging Canoe (Vaka Moana / Pahi):
 * - Twin carved honey-wood hulls with upturned manu figurehead prows (-Z) & raised sterns (+Z)
 * - Five crossbeams (iako) with color-coded braided sennit lashings
 * - Central Sighting Post (pou) casting real-time solar shadows + crisp projected deck-shadow band
 * - Woven pandanus crab-claw sail + masthead zenith marker (+Y)
 * - Aft Trim-Lock Steering Sweep (hoe uli)
 * - Diegetic deck readiness props (dwindling ration baskets, cargo bundles, crew silhouettes, tier upgrades)
 */

import * as THREE from 'three';
import { altAzToDirectionVec3 } from '../simulation/celestialSim.js';

export class VakaRenderer {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Scene lighting tied to sun/sky so pou post casts real shadows on deck & crossbeams
    this.hemiLight = new THREE.HemisphereLight(0x9ec8ff, 0x1b3044, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 1.45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 45.0;
    const d = 6.5;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0008;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Materials (adjusted dynamically if hull/sail/lashing durability is neglected)
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x8d532b,
      roughness: 0.68,
      metalness: 0.05,
    });
    this.gunwaleMat = new THREE.MeshStandardMaterial({
      color: 0xb67844,
      roughness: 0.62,
    });
    this.deckMat = new THREE.MeshStandardMaterial({
      color: 0xa87948,
      roughness: 0.82,
    });
    this.pouMat = new THREE.MeshStandardMaterial({
      color: 0x5c3116,
      roughness: 0.55,
    });
    this.sailMat = new THREE.MeshStandardMaterial({
      color: 0xe6cfa3,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });

    this.sennitBindMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c16,
      roughness: 0.86,
    });

    this.lashingMeshes = {};
    this.rationBaskets = [];
    this.cargoBundles = [];
    this.crewMeshes = {};

    this._buildTwinHulls();
    this._buildCrossbeamsAndDeck();
    this._buildPouAndLashings();
    this._buildMastAndCrabClawSail();
    this._buildSteeringSweep();
    this._buildDeckReadinessProps();
  }

  /**
   * Evaluates longitudinal hull profile at z in [-8.58 (bow), +7.75 (stern)].
   * World-space Y (waterline ~ 0.0, iako centers = 0.68).
   */
  _evalHullStation(z) {
    let keelY = -0.52;
    let sheerY = 0.58;
    let halfBeam = 0.47;
    let deckCrown = -0.19; // Negative = recessed midships dugout well; positive = peaked manu cover

    if (z < -4.55) {
      // Forward sweep into upturned Manu bow prow (-4.55 -> -8.58)
      const u = Math.min(1.0, (-4.55 - z) / 4.03);
      sheerY = 0.58 + 1.24 * Math.pow(u, 1.82);
      keelY = -0.52 + 0.56 * Math.pow(u, 1.22) + 1.68 * Math.pow(u, 2.35);
      halfBeam = 0.385 * (1.0 - Math.pow(u, 1.28)) + 0.042;
      const coverBlend = Math.min(1.0, u / 0.14);
      const peak = 0.085 * Math.sin(Math.PI * Math.pow(u, 0.78));
      deckCrown = -0.19 * (1.0 - coverBlend) + peak * coverBlend;
    } else if (z > 4.25) {
      // Aft sweep into raised Manu Hope stern-post (+4.25 -> +7.75)
      const v = Math.min(1.0, (z - 4.25) / 3.5);
      sheerY = 0.58 + 1.06 * Math.pow(v, 1.82);
      keelY = -0.52 + 0.54 * Math.pow(v, 1.22) + 1.52 * Math.pow(v, 2.3);
      halfBeam = 0.39 * (1.0 - Math.pow(v, 1.28)) + 0.04;
      const coverBlend = Math.min(1.0, v / 0.16);
      const peak = 0.075 * Math.sin(Math.PI * Math.pow(v, 0.8));
      deckCrown = -0.19 * (1.0 - coverBlend) + peak * coverBlend;
    } else {
      // Midships fairing (-4.55 .. +4.25)
      const midNorm = (z + 0.15) / 4.4;
      halfBeam = 0.47 - 0.085 * Math.min(1.0, midNorm * midNorm);
      // Smooth bulkhead ramp near fore/aft breakwaters
      const foreDist = (z - -4.55) / 0.45;
      const aftDist = (4.25 - z) / 0.45;
      const edgeT = Math.min(1.0, Math.min(foreDist, aftDist));
      deckCrown = -0.19 * Math.max(0.0, edgeT);
    }

    return { keelY, sheerY, halfBeam, deckCrown };
  }

  /**
   * Builds a seamless, closed, double-ended Polynesian V-section dugout hull
   * lofted from bow prow (-8.58m) to stern-post (+7.75m) with zero flat cylinder end-caps:
   * - Crisp V-keel spine + wineglass flared bilges + carved sheerline
   * - Peaked carved manu breakwater covers fore & aft, hollowed dugout trough amidships
   */
  _createPolynesianVHullGeometry() {
    const zStations = [
      -8.58, -8.38, -8.08, -7.7, -7.25, -6.75, -6.2, -5.65, -5.1, -4.75, -4.55,
      -4.15, -3.5, -2.6, -1.5, -0.4, 0.7, 1.8, 2.8, 3.65, 4.05, 4.25, 4.55,
      5.0, 5.55, 6.1, 6.65, 7.15, 7.5, 7.75,
    ];
    const nZ = zStations.length;

    const positions = [];
    const indices = [];
    const pushVert = (x, y, z) => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      return idx;
    };

    // 1. Starboard & Port Outer V-Hull Flanks (separate keel/sheer rings for crisp keel & gunwale creases)
    // Profile parameter s in [0..4]: keel -> garboard V -> rounded chine -> flared topside -> gunwale sheer
    const flankRingsStbd = [];
    const flankRingsPort = [];
    const profilePts = [
      { bx: 0.0, hy: 0.0 },
      { bx: 0.36, hy: 0.25 },
      { bx: 0.78, hy: 0.56 },
      { bx: 0.98, hy: 0.84 },
      { bx: 0.92, hy: 1.0 },
    ];
    const nP = profilePts.length;

    for (let i = 0; i < nZ; i += 1) {
      const z = zStations[i];
      const { keelY, sheerY, halfBeam } = this._evalHullStation(z);
      const h = Math.max(0.08, sheerY - keelY);
      const stbdRow = [];
      const portRow = [];
      for (let j = 0; j < nP; j += 1) {
        const xMag = profilePts[j].bx * halfBeam;
        const y = keelY + profilePts[j].hy * h;
        stbdRow.push(pushVert(xMag, y, z));
        portRow.push(pushVert(-xMag, y, z));
      }
      flankRingsStbd.push(stbdRow);
      flankRingsPort.push(portRow);
    }

    for (let i = 0; i < nZ - 1; i += 1) {
      for (let j = 0; j < nP - 1; j += 1) {
        // Starboard outward normal (+X, -Y)
        const s00 = flankRingsStbd[i][j];
        const s01 = flankRingsStbd[i][j + 1];
        const s10 = flankRingsStbd[i + 1][j];
        const s11 = flankRingsStbd[i + 1][j + 1];
        indices.push(s00, s01, s11, s00, s11, s10);

        // Port outward normal (-X, -Y)
        const p00 = flankRingsPort[i][j];
        const p01 = flankRingsPort[i][j + 1];
        const p10 = flankRingsPort[i + 1][j];
        const p11 = flankRingsPort[i + 1][j + 1];
        indices.push(p00, p11, p01, p00, p10, p11);
      }
    }

    // 2. Upper Gunwale Rim, Peaked Manu Fore/Aft Covers & Recessed Midships Dugout Well (+Y normals)
    // Cross-profile from Port outer sheer (-0.92*B) -> Port inner lip (-0.70*B) -> Port sole/slope -> Centerline (0) -> Starboard mirror
    const topRows = [];
    const nT = 7;
    for (let i = 0; i < nZ; i += 1) {
      const z = zStations[i];
      const { sheerY, halfBeam, deckCrown } = this._evalHullStation(z);
      const outerX = 0.92 * halfBeam;
      const lipX = 0.7 * halfBeam;
      const innerX = 0.52 * halfBeam;
      const wellY = sheerY + deckCrown;
      const midSlopeY = deckCrown < 0 ? wellY + 0.02 : sheerY + deckCrown * 0.62;

      topRows.push([
        pushVert(-outerX, sheerY, z),
        pushVert(-lipX, sheerY + 0.018, z),
        pushVert(-innerX, midSlopeY, z),
        pushVert(0.0, wellY, z),
        pushVert(innerX, midSlopeY, z),
        pushVert(lipX, sheerY + 0.018, z),
        pushVert(outerX, sheerY, z),
      ]);
    }

    for (let i = 0; i < nZ - 1; i += 1) {
      for (let k = 0; k < nT - 1; k += 1) {
        const w00 = topRows[i][k];
        const w01 = topRows[i][k + 1];
        const w10 = topRows[i + 1][k];
        const w11 = topRows[i + 1][k + 1];
        indices.push(w00, w10, w11, w00, w11, w01);
      }
    }

    // 3. Manifold Carved Stem (-Z) & Stern (+Z) Tip Closures (zero open end-caps)
    const bowTip = pushVert(0.0, 1.78, -8.63);
    for (let j = 0; j < nP - 1; j += 1) {
      indices.push(bowTip, flankRingsStbd[0][j + 1], flankRingsStbd[0][j]);
      indices.push(bowTip, flankRingsPort[0][j], flankRingsPort[0][j + 1]);
    }
    for (let k = 0; k < nT - 1; k += 1) {
      indices.push(bowTip, topRows[0][k], topRows[0][k + 1]);
    }

    const last = nZ - 1;
    const sternTip = pushVert(0.0, 1.6, 7.8);
    for (let j = 0; j < nP - 1; j += 1) {
      indices.push(sternTip, flankRingsStbd[last][j], flankRingsStbd[last][j + 1]);
      indices.push(sternTip, flankRingsPort[last][j + 1], flankRingsPort[last][j]);
    }
    for (let k = 0; k < nT - 1; k += 1) {
      indices.push(sternTip, topRows[last][k + 1], topRows[last][k]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Builds a curved washstrake strip hugging both gunwales along [zStart..zEnd].
   */
  _createSheerStrakeGeometry(zStart, zEnd, steps, yOffset, height, thickness, xFrac = 0.88) {
    const positions = [];
    const indices = [];
    const pushVert = (x, y, z) => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      return idx;
    };

    for (const side of [-1, 1]) {
      const rings = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const z = zStart + (zEnd - zStart) * t;
        const taper = Math.sin(Math.PI * t);
        const h = height * (0.42 + 0.58 * Math.pow(taper, 0.45));
        const { sheerY, halfBeam } = this._evalHullStation(z);
        const xIn = side * (halfBeam * xFrac - thickness * 0.5);
        const xOut = side * (halfBeam * xFrac + thickness * 0.5);
        const yBot = sheerY + yOffset;
        const yTop = yBot + h;
        // Closed 4-point box ring around strake perimeter
        rings.push([
          pushVert(xOut, yBot, z),
          pushVert(xOut, yTop, z),
          pushVert(xIn, yTop, z),
          pushVert(xIn, yBot, z),
        ]);
      }

      for (let i = 0; i < steps; i += 1) {
        for (let j = 0; j < 4; j += 1) {
          const jNext = (j + 1) % 4;
          const a = rings[i][j];
          const b = rings[i][jNext];
          const c = rings[i + 1][j];
          const d = rings[i + 1][jNext];
          if (side > 0) {
            indices.push(a, b, d, a, d, c);
          } else {
            indices.push(a, d, b, a, c, d);
          }
        }
      }

      // Close fore (-Z) and aft (+Z) strake tips
      const f = rings[0];
      const r = rings[steps];
      if (side > 0) {
        indices.push(f[0], f[2], f[1], f[0], f[3], f[2]);
        indices.push(r[0], r[1], r[2], r[0], r[2], r[3]);
      } else {
        indices.push(f[0], f[1], f[2], f[0], f[2], f[3]);
        indices.push(r[0], r[2], r[1], r[0], r[3], r[2]);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  _buildTwinHulls() {
    const hullOffsetsX = [-2.35, 2.35];
    this.tier2Gunwales = [];

    const vHullGeo = this._createPolynesianVHullGeometry();
    const rubrailGeo = this._createSheerStrakeGeometry(-6.6, 5.9, 22, -0.04, 0.085, 0.055, 0.93);
    const tier2StrakeGeo = this._createSheerStrakeGeometry(-5.8, 5.2, 20, 0.02, 0.24, 0.065, 0.84);
    const stitchGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.11, 6);
    stitchGeo.rotateZ(Math.PI / 2);

    for (const xOff of hullOffsetsX) {
      const hullGroup = new THREE.Group();
      hullGroup.position.set(xOff, 0.0, 0.0);

      // 1. Seamless double-ended Polynesian V-section dugout hull (bow prow to stern-post)
      const body = new THREE.Mesh(vHullGeo, this.hullMat);
      body.castShadow = true;
      body.receiveShadow = true;
      hullGroup.add(body);

      // 2. Fitted honey-wood gunwale rubrails + stitched sennit plank lashings
      const rubrails = new THREE.Mesh(rubrailGeo, this.gunwaleMat);
      rubrails.castShadow = true;
      rubrails.receiveShadow = true;
      hullGroup.add(rubrails);

      for (let z = -5.4; z <= 4.8; z += 1.02) {
        const { sheerY, halfBeam } = this._evalHullStation(z);
        for (const side of [-1, 1]) {
          const stitch = new THREE.Mesh(stitchGeo, this.sennitBindMat);
          stitch.position.set(side * halfBeam * 0.93, sheerY - 0.005, z);
          hullGroup.add(stitch);
        }
      }

      // 3. Internal carved dugout thwarts across recessed midships hull well
      const thwartGeo = new THREE.BoxGeometry(0.56, 0.045, 0.14);
      for (const zT of [-3.6, -1.6, 0.6, 2.6]) {
        const thwart = new THREE.Mesh(thwartGeo, this.gunwaleMat);
        thwart.position.set(0, 0.46, zT);
        thwart.receiveShadow = true;
        hullGroup.add(thwart);
      }

      // 4. Carved Manu Bow Prow Crest & Finial (-Z dead ahead; max y = 2.00m preserves -1.8 deg horizon sightline)
      const bowCrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.22, 0.52),
        this.gunwaleMat
      );
      bowCrest.position.set(0, 1.72, -8.25);
      bowCrest.rotation.x = 0.52;
      hullGroup.add(bowCrest);

      const finial = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.34, 8),
        this.gunwaleMat
      );
      finial.position.set(0, 1.86, -8.58);
      finial.rotation.x = -0.25;
      finial.castShadow = true;
      hullGroup.add(finial);

      const bowCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.085, 0.024, 6, 12),
        this.sennitBindMat
      );
      bowCollar.position.set(0, 1.73, -8.52);
      bowCollar.rotation.x = 1.25;
      hullGroup.add(bowCollar);

      // 5. Carved Manu Hope Stern-Post Crest & Finial (+Z astern)
      const sternFinial = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.28, 8),
        this.gunwaleMat
      );
      sternFinial.position.set(0, 1.72, 7.75);
      sternFinial.rotation.x = 0.28;
      hullGroup.add(sternFinial);

      const sternCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.022, 6, 12),
        this.sennitBindMat
      );
      sternCollar.position.set(0, 1.6, 7.68);
      sternCollar.rotation.x = -1.2;
      hullGroup.add(sternCollar);

      // 6. Tier 2+ Curved splash-guard washstrakes (moamoa, unlocked on Mo'orea)
      const strake = new THREE.Mesh(tier2StrakeGeo, this.gunwaleMat);
      strake.castShadow = true;
      strake.receiveShadow = true;
      hullGroup.add(strake);
      this.tier2Gunwales.push(strake);

      this.root.add(hullGroup);
    }
  }

  _buildCrossbeamsAndDeck() {
    // 5 Iako crossbeams spanning port to starboard hulls (forward sighting beam at z = -3.15)
    const beamZ = [-4.5, -3.15, -1.1, 1.2, 3.8];
    const hullOffsetsX = [-2.35, 2.35];
    const beamGeo = new THREE.CylinderGeometry(0.115, 0.115, 5.72, 12);
    beamGeo.rotateZ(Math.PI / 2);
    const beamCapGeo = new THREE.SphereGeometry(0.115, 10, 8);
    const pepeSaddleGeo = new THREE.BoxGeometry(0.62, 0.24, 0.28);
    const lashingBandGeo = new THREE.TorusGeometry(0.155, 0.032, 7, 14);

    for (const z of beamZ) {
      const beam = new THREE.Mesh(beamGeo, this.gunwaleMat);
      beam.position.set(0, 0.68, z);
      beam.castShadow = true;
      beam.receiveShadow = true;
      this.root.add(beam);

      // Rounded carved outboard beam tips
      for (const endX of [-2.86, 2.86]) {
        const endCap = new THREE.Mesh(beamCapGeo, this.gunwaleMat);
        endCap.position.set(endX, 0.68, z);
        endCap.scale.set(0.65, 1.0, 1.0);
        this.root.add(endCap);
      }

      // Carved Pepe hull cleats & criss-crossed sennit bindings firmly anchoring each Iako into both V-hulls
      for (const xOff of hullOffsetsX) {
        const pepe = new THREE.Mesh(pepeSaddleGeo, this.pouMat);
        pepe.position.set(xOff, 0.56, z);
        pepe.castShadow = true;
        pepe.receiveShadow = true;
        this.root.add(pepe);

        for (const tilt of [-0.52, 0.52]) {
          const wrap = new THREE.Mesh(lashingBandGeo, this.sennitBindMat);
          wrap.position.set(xOff, 0.65, z);
          wrap.rotation.y = Math.PI / 2;
          wrap.rotation.x = tilt;
          this.root.add(wrap);
        }
      }
    }

    // Central woven Pola deck platform extending past forward sighting crossbeam
    const polaGeo = new THREE.BoxGeometry(3.95, 0.12, 8.6);
    this.polaDeck = new THREE.Mesh(polaGeo, this.deckMat);
    this.polaDeck.position.set(0, 0.78, -0.2);
    this.polaDeck.receiveShadow = true;
    this.root.add(this.polaDeck);

    // Subtle deck planking grooves for visual depth
    const slatGeo = new THREE.BoxGeometry(0.03, 0.13, 8.55);
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x7b532c, roughness: 0.9 });
    for (let x = -1.6; x <= 1.61; x += 0.4) {
      const slat = new THREE.Mesh(slatGeo, slatMat);
      slat.position.set(x, 0.785, -0.2);
      slat.receiveShadow = true;
      this.root.add(slat);
    }
  }

  _buildPouAndLashings() {
    // Forward reference crossbeam (z = -3.15) cleanly visible above bottom HUD bar!
    const pouZ = -3.15;

    // Central Sighting Post (Pou — tip sits just below sea horizon for clean bow star framing)
    const pouGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.08, 12);
    this.pouPost = new THREE.Mesh(pouGeo, this.pouMat);
    this.pouPost.position.set(0.0, 1.34, pouZ);
    this.pouPost.castShadow = true;
    this.root.add(this.pouPost);

    // Carved notch cap on top of Pou
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.088, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9a86c, roughness: 0.5 })
    );
    cap.position.set(0.0, 1.9, pouZ);
    cap.castShadow = true;
    this.root.add(cap);

    // Symmetrical braided sennit lashings clearly visible across the forward sighting beam
    const lashingDefs = [
      { id: 'left_outer', x: -1.76, z: pouZ, color: 0xd95f3b },
      { id: 'left_mid', x: -1.16, z: pouZ, color: 0xe6a644 },
      { id: 'left_inner', x: -0.58, z: pouZ, color: 0xd8be82 },
      { id: 'center_fore', x: 0.0, z: pouZ - 0.68, color: 0xf0deaa },
      { id: 'center_aft', x: 0.0, z: pouZ + 0.68, color: 0xf0deaa },
      { id: 'right_inner', x: 0.58, z: pouZ, color: 0xd8be82 },
      { id: 'right_mid', x: 1.16, z: pouZ, color: 0xe6a644 },
      { id: 'right_outer', x: 1.76, z: pouZ, color: 0xd95f3b },
    ];

    const ringGeo = new THREE.TorusGeometry(0.13, 0.052, 8, 14);
    for (const def of lashingDefs) {
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.72,
        emissive: 0x000000,
      });
      const knot = new THREE.Mesh(ringGeo, mat);
      knot.position.set(def.x, 0.86, def.z);
      knot.rotation.x = Math.PI / 2;
      knot.receiveShadow = true;
      this.root.add(knot);
      this.lashingMeshes[def.id] = { mesh: knot, mat, baseColor: def.color };
    }

    // Crisp projected dark shadow ribbon from base of Pou across Pola deck (guarantees readable shadow craft)
    const shadowBandGeo = new THREE.PlaneGeometry(0.16, 1.0);
    shadowBandGeo.translate(0, 0.5, 0); // Pivot at Pou base
    shadowBandGeo.rotateX(-Math.PI / 2);
    this.pouShadowBandMat = new THREE.MeshBasicMaterial({
      color: 0x160d06,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.pouShadowBand = new THREE.Mesh(shadowBandGeo, this.pouShadowBandMat);
    this.pouShadowBand.position.set(0.0, 0.852, pouZ);
    this.root.add(this.pouShadowBand);
  }

  _buildMastAndCrabClawSail() {
    // Stepped outboard on starboard hull beam so BOTH twin prows frame the forward sky unobstructed!
    this.mastGroup = new THREE.Group();
    this.mastGroup.position.set(2.18, 0.82, -1.65);

    const mastGeo = new THREE.CylinderGeometry(0.07, 0.11, 8.8, 10);
    const mast = new THREE.Mesh(mastGeo, this.gunwaleMat);
    mast.position.set(0, 4.4, 0);
    this.mastGroup.add(mast);

    // Curved Crab-Claw Spars & Woven Pandanus Sail
    this.sailPivot = new THREE.Group();
    this.sailPivot.position.set(0, 1.1, 0);

    const shape = new THREE.Shape();
    shape.moveTo(0.0, 0.0);
    shape.quadraticCurveTo(1.6, 2.8, 2.45, 6.8);
    shape.quadraticCurveTo(1.05, 5.4, -0.35, 7.1);
    shape.quadraticCurveTo(-0.2, 3.2, 0.0, 0.0);

    const sailGeo = new THREE.ShapeGeometry(shape, 14);
    this.sailMesh = new THREE.Mesh(sailGeo, this.sailMat);
    this.sailMesh.rotation.y = 0.42;
    this.sailPivot.add(this.sailMesh);

    this.mastGroup.add(this.sailPivot);
    this.root.add(this.mastGroup);
  }

  _buildSteeringSweep() {
    // 1. Fixed Aft Navigator's Steering Bench & Fulcrum Crutch (Taumanu Hope + Haka Hoe)
    // Cantilevered from aft Iako (z = 3.80) past Pola edge (z = 4.10) to moor the sweep at z = 4.45
    const mountGroup = new THREE.Group();

    const kneeGeo = new THREE.BoxGeometry(0.13, 0.13, 0.96);
    const lashingRingGeo = new THREE.TorusGeometry(0.11, 0.028, 6, 12);
    for (const kX of [-0.48, 0.48]) {
      const knee = new THREE.Mesh(kneeGeo, this.pouMat);
      knee.position.set(kX, 0.72, 4.16);
      knee.castShadow = true;
      knee.receiveShadow = true;
      mountGroup.add(knee);

      const lash = new THREE.Mesh(lashingRingGeo, this.sennitBindMat);
      lash.position.set(kX, 0.74, 3.84);
      lash.rotation.y = Math.PI / 2;
      mountGroup.add(lash);
    }

    // Heavy transverse carved steering beam at z = 4.45
    const steerBeam = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.12, 0.24),
      this.gunwaleMat
    );
    steerBeam.position.set(0.0, 0.81, 4.45);
    steerBeam.castShadow = true;
    steerBeam.receiveShadow = true;
    mountGroup.add(steerBeam);

    for (const kX of [-0.48, 0.48]) {
      const beamLash = new THREE.Mesh(lashingRingGeo, this.sennitBindMat);
      beamLash.position.set(kX, 0.8, 4.45);
      mountGroup.add(beamLash);
    }

    // Carved forked ironwood fulcrum crutch (Haka Hoe) + braided sennit grommet (Humu)
    const crutchBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.12, 10),
      this.pouMat
    );
    crutchBase.position.set(0.0, 0.89, 4.45);
    mountGroup.add(crutchBase);

    const hornGeo = new THREE.CylinderGeometry(0.032, 0.044, 0.22, 8);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeo, this.pouMat);
      horn.position.set(side * 0.085, 0.99, 4.45);
      horn.rotation.z = -side * 0.28;
      horn.castShadow = true;
      mountGroup.add(horn);
    }

    const grommet = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.028, 8, 16),
      this.sennitBindMat
    );
    grommet.position.set(0.0, 0.95, 4.45);
    grommet.rotation.x = 0.88;
    mountGroup.add(grommet);

    this.root.add(mountGroup);

    // 2. Pivoting Heavy Polynesian Steering Sweep (Hoe Uli) moored through (0, 0.95, 4.45)
    this.sweepPivot = new THREE.Group();
    this.sweepPivot.position.set(0.0, 0.95, 4.45);

    // Collinear oar assembly tilted along alpha = -0.68 rad (+Y_oar -> up & forward toward navigator; -Y_oar -> down & aft into wake)
    const oarAssembly = new THREE.Group();
    oarAssembly.rotation.x = -0.68;

    const shaftGeo = new THREE.CylinderGeometry(0.052, 0.068, 3.35, 10);
    const shaft = new THREE.Mesh(shaftGeo, this.pouMat);
    shaft.position.set(0, -0.95, 0); // Spans s = -2.62m (blade neck) up to s = +0.72m (tiller handle)
    shaft.castShadow = true;
    oarAssembly.add(shaft);

    // Sennit chafe-wrap collar right inside the fulcrum crutch (s = 0)
    const chafeWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.074, 0.26, 10),
      this.sennitBindMat
    );
    oarAssembly.add(chafeWrap);

    // Carved cross-tiller grip bar at upper loom (s = +0.70m -> world y ~ 1.49, z ~ 4.01)
    const tillerGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.36, 8),
      this.gunwaleMat
    );
    tillerGrip.rotation.z = Math.PI / 2;
    tillerGrip.position.set(0, 0.7, 0);
    oarAssembly.add(tillerGrip);

    // Sculpted vertical hydrodynamic steering blade (thin along X, broad chord in Y-Z wake plane)
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.0, 0.0);
    bladeShape.quadraticCurveTo(0.24, -0.22, 0.23, -0.92);
    bladeShape.quadraticCurveTo(0.19, -1.58, 0.0, -1.82);
    bladeShape.quadraticCurveTo(-0.17, -1.58, -0.19, -0.92);
    bladeShape.quadraticCurveTo(-0.2, -0.22, 0.0, 0.0);

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.056,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    bladeGeo.translate(0, 0, -0.028);
    bladeGeo.rotateY(Math.PI / 2); // Extrude thickness along X so broad chord slices vertically in Y-Z plane

    const blade = new THREE.Mesh(bladeGeo, this.gunwaleMat);
    blade.position.set(0, -1.55, 0);
    blade.castShadow = true;
    oarAssembly.add(blade);

    this.sweepPivot.add(oarAssembly);
    this.root.add(this.sweepPivot);
  }

  _buildDeckReadinessProps() {
    // 1. Up to 8 woven ration baskets & water gourds along port deck edge
    const basketMat = new THREE.MeshStandardMaterial({
      color: 0xc59b57,
      roughness: 0.85,
    });
    const gourdMat = new THREE.MeshStandardMaterial({
      color: 0x9b5a28,
      roughness: 0.55,
    });

    for (let i = 0; i < 8; i += 1) {
      const grp = new THREE.Group();
      const row = Math.floor(i / 2);
      const col = i % 2;
      grp.position.set(-1.32 + col * 0.38, 0.92, -0.85 + row * 0.52);

      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.12, 0.22, 8),
        basketMat
      );
      grp.add(basket);

      const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), gourdMat);
      gourd.position.set(0.06, 0.14, 0.0);
      grp.add(gourd);

      this.root.add(grp);
      this.rationBaskets.push(grp);
    }

    // 2. Ceremonial Pahu Gourd Drum (prominent in Act III / Tier 3)
    this.pahuDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.19, 0.56, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b3618, roughness: 0.55 })
    );
    this.pahuDrum.position.set(0.95, 1.12, 1.85);
    this.root.add(this.pahuDrum);

    // 3. Lashed Quest Cargo Bundles
    const bundleMat = new THREE.MeshStandardMaterial({
      color: 0x8c3b2b,
      roughness: 0.78,
    });
    for (let i = 0; i < 3; i += 1) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.46), bundleMat);
      b.position.set(0.92, 0.96, -0.55 + i * 0.58);
      b.visible = false;
      this.root.add(b);
      this.cargoBundles.push(b);
    }

    // 4. Stylized Navigator Crew Silhouettes (Tama, Moana, Kahu)
    const crewDefs = [
      { id: 'tama', x: -1.45, z: 1.85, color: 0xb87a4b },  // Port aft fishing line
      { id: 'moana', x: 1.18, z: -1.15, color: 0xc98b5b }, // Starboard sail sheet
      { id: 'kahu', x: -0.95, z: -2.85, color: 0xa66a3e }, // Forward crossbeam tender
    ];
    for (const cd of crewDefs) {
      const fig = new THREE.Group();
      fig.position.set(cd.x, 0.86, cd.z);
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.58, 8),
        new THREE.MeshStandardMaterial({ color: cd.color, roughness: 0.75 })
      );
      torso.position.y = 0.29;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x7c4b2b, roughness: 0.7 })
      );
      head.position.y = 0.68;
      fig.add(torso, head);
      fig.visible = false;
      this.root.add(fig);
      this.crewMeshes[cd.id] = fig;
    }
  }

  update(dtSec, elapsedSec, oceanSim, gameState, steerNorm = 0.0) {
    if (!oceanSim) return;

    // 1. Apply Twin-Hull Pitch, Roll & Heave from HullPhysics
    const hull = oceanSim.hullState;
    if (hull) {
      this.root.position.y = hull.heaveM;
      this.root.rotation.x = hull.pitchRad;
      this.root.rotation.z = -hull.rollRad;
    }

    // 2. Update Directional Sun Light & Pou Deck Shadow Ribbon
    const sun = oceanSim.sunState;
    const sunDir = altAzToDirectionVec3(
      Math.max(3.0, sun.altDeg),
      sun.azDeg,
      oceanSim.headingDeg
    );
    this.sunLight.position.set(sunDir.x * 18.0, sunDir.y * 18.0, sunDir.z * 18.0);
    this.sunLight.target.position.set(0, 0.8, -3.15);
    this.sunLight.intensity = 1.65 * sun.daylightFactor;
    this.hemiLight.intensity = 0.26 + 0.68 * sun.daylightFactor;

    const shadow = oceanSim.deckShadow;
    if (shadow && shadow.visible) {
      this.pouShadowBand.visible = true;
      // Rotate ribbon in XZ plane so +Y local maps along (lateralOffsetNorm, -foreAftOffsetNorm)
      const angle = Math.atan2(
        shadow.lateralOffsetNorm,
        shadow.foreAftOffsetNorm
      );
      this.pouShadowBand.rotation.y = -angle;
      const len = shadow.isZenithWindow
        ? 0.28
        : Math.min(2.15, Math.max(0.45, shadow.shadowLengthRatio * 1.12));
      this.pouShadowBand.scale.set(1.0, 1.0, len);
      this.pouShadowBandMat.opacity = 0.56 * sun.daylightFactor;
    } else {
      this.pouShadowBand.visible = false;
    }

    // Subtle warm sunlit sheen on whichever lashing knot currently catches the Pou shadow
    for (const [zoneId, item] of Object.entries(this.lashingMeshes)) {
      const hit = shadow && shadow.visible && shadow.zone === zoneId;
      item.mat.emissive.setHex(hit ? 0x3b2408 : 0x000000);
    }

    // 3. Pivot Aft Steering Sweep & Billow Crab-Claw Sail
    this.sweepPivot.rotation.y = -steerNorm * 0.48;
    const flutter =
      gameState && gameState.sailCondition < 55.0
        ? Math.sin(elapsedSec * 14.0) * 0.045
        : Math.sin(elapsedSec * 2.2) * 0.015;
    this.sailPivot.rotation.y = flutter;

    // 4. Diegetic Readiness Readouts (Rations, Cargo, Crew, Condition, Vaka Tier)
    const visibleBaskets = Math.max(
      0,
      Math.ceil(oceanSim.rationsRemaining - 0.05)
    );
    this.rationBaskets.forEach((b, idx) => {
      b.visible = idx < visibleBaskets;
    });

    if (gameState) {
      this.tier2Gunwales.forEach((g) => {
        g.visible = gameState.vakaTier >= 2;
      });
      this.pahuDrum.visible = gameState.vakaTier >= 2;

      this.cargoBundles.forEach((b, idx) => {
        b.visible = idx < gameState.cargoItems.length;
      });

      for (const [crewId, mesh] of Object.entries(this.crewMeshes)) {
        mesh.visible = gameState.assignedCrew.includes(crewId);
      }

      // Visual wear tinting when neglected (<55%)
      this.sailMat.color.setHex(
        gameState.sailCondition < 55.0 ? 0xb59e78 : 0xe6cfa3
      );
      this.hullMat.color.setHex(
        gameState.hullCondition < 55.0 ? 0x663d20 : 0x8d532b
      );
    }
  }
}
