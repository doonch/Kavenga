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

  _buildTwinHulls() {
    const hullOffsetsX = [-2.35, 2.35];
    this.tier2Gunwales = [];

    for (const xOff of hullOffsetsX) {
      const hullGroup = new THREE.Group();
      hullGroup.position.set(xOff, 0.12, 0.0);

      // Main sleek dugout hull body
      const bodyGeo = new THREE.CylinderGeometry(0.46, 0.34, 12.6, 12);
      bodyGeo.rotateX(Math.PI / 2);
      bodyGeo.scale(0.92, 0.85, 1.0);
      const body = new THREE.Mesh(bodyGeo, this.hullMat);
      body.receiveShadow = true;
      hullGroup.add(body);

      // Upturned carved Manu Bow Prow (-Z dead ahead — frames stars cleanly between twin prows!)
      const prowCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.05, -5.8),
        new THREE.Vector3(0, 0.42, -7.2),
        new THREE.Vector3(0, 1.18, -8.25),
        new THREE.Vector3(0, 1.72, -8.55),
      ]);
      const prowGeo = new THREE.TubeGeometry(prowCurve, 16, 0.24, 8, false);
      const prow = new THREE.Mesh(prowGeo, this.hullMat);
      prow.castShadow = true;
      hullGroup.add(prow);

      // Carved finial ornament atop each bow prow
      const finial = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.48, 8),
        this.gunwaleMat
      );
      finial.position.set(0, 1.88, -8.58);
      finial.rotation.x = -0.25;
      hullGroup.add(finial);

      // Raised curved Stern-Post (Manu Hope at +Z astern — frames stern wake-stars!)
      const sternCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.08, 5.8),
        new THREE.Vector3(0, 0.65, 7.1),
        new THREE.Vector3(0, 1.55, 7.75),
      ]);
      const sternGeo = new THREE.TubeGeometry(sternCurve, 14, 0.21, 8, false);
      const stern = new THREE.Mesh(sternGeo, this.hullMat);
      hullGroup.add(stern);

      // Tier 2+ Raised splash-guard gunwale strakes (unlocked on Mo'orea)
      const strakeGeo = new THREE.BoxGeometry(0.14, 0.32, 11.4);
      const strake = new THREE.Mesh(strakeGeo, this.gunwaleMat);
      strake.position.set(xOff < 0 ? 0.34 : -0.34, 0.44, 0.0);
      hullGroup.add(strake);
      this.tier2Gunwales.push(strake);

      this.root.add(hullGroup);
    }
  }

  _buildCrossbeamsAndDeck() {
    // 5 Iako crossbeams spanning port to starboard hulls (forward sighting beam at z = -3.15)
    const beamZ = [-4.5, -3.15, -1.1, 1.2, 3.8];
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.7, 10);
    beamGeo.rotateZ(Math.PI / 2);

    for (const z of beamZ) {
      const beam = new THREE.Mesh(beamGeo, this.gunwaleMat);
      beam.position.set(0, 0.68, z);
      beam.castShadow = true;
      beam.receiveShadow = true;
      this.root.add(beam);
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

    // Overhead Masthead Zenith Pennant directly at (0, +10.2, 3.1) above navigator for Song 11 Zenith check!
    const zenithArch = new THREE.Group();
    const pennant = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.55, 6),
      new THREE.MeshStandardMaterial({ color: 0xd94e34, roughness: 0.6 })
    );
    pennant.position.set(0.0, 9.6, 3.45);
    this.root.add(pennant);

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
    // Heavy Polynesian Steering Sweep (Hoe Uli) at the stern (+Z)
    this.sweepPivot = new THREE.Group();
    this.sweepPivot.position.set(0.0, 0.95, 4.45);

    const shaftGeo = new THREE.CylinderGeometry(0.065, 0.075, 4.4, 10);
    const shaft = new THREE.Mesh(shaftGeo, this.pouMat);
    shaft.rotation.x = 0.72;
    shaft.position.set(0, -0.45, 1.15);
    this.sweepPivot.add(shaft);

    const bladeGeo = new THREE.BoxGeometry(0.42, 1.65, 0.07);
    const blade = new THREE.Mesh(bladeGeo, this.gunwaleMat);
    blade.rotation.x = 0.72;
    blade.position.set(0, -1.45, 2.25);
    this.sweepPivot.add(blade);

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
