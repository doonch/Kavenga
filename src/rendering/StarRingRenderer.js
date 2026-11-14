/**
 * Grounded 3D Coastal Observatory Renderer: The Star-Stone Vigil (Ahu Feti'a).
 * Renders a motionless seaside basalt & coral-stone circle with:
 * - Raised volcanic-sand & fitted-stone terrace surrounded by calm lagoon shallows
 * - Central shell-inlaid standing medallion with 12 radial sight grooves
 * - 12 Carved Horizon House Stones (2 notched Pivot Monoliths + 10 Rising/Setting Cairns)
 *   calibrated just below eye height (2.15m) so their sight-notches kiss the 0-deg sea horizon
 *   without ever occluding low skimming stars
 * - 4 flickering coconut-shell ember braziers casting warm firelight across the carved basalt
 * - Mode-gated projected DOM labels for the 12 Horizon Houses (strictly zero-compass names)
 */

import * as THREE from 'three';
import { HORIZON_HOUSES } from '../data/constellationsData.js';
import { altAzToDirectionVec3 } from '../simulation/celestialSim.js';

const STONE_RADIUS = 11.4;

export class StarRingRenderer {
  constructor(scene, labelLayerEl) {
    this.scene = scene;
    this.labelLayerEl = labelLayerEl;

    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.stoneEntries = [];
    this.braziers = [];
    this.stoneLabelEls = {};
    this._projVec = new THREE.Vector3();

    this._buildTerraceAndReef();
    this._buildHorizonStones();
    this._buildEmberBraziers();
    this._buildStoneLabels();
  }

  _buildTerraceAndReef() {
    const reefMat = new THREE.MeshStandardMaterial({
      color: 0x151b22,
      roughness: 0.94,
      metalness: 0.04,
    });
    const reefApron = new THREE.Mesh(
      new THREE.CylinderGeometry(15.6, 18.4, 0.55, 48),
      reefMat
    );
    reefApron.position.y = -0.14;
    this.group.add(reefApron);

    // Scattered shoreline boulders along outer reef edge
    const boulderGeo = new THREE.DodecahedronGeometry(0.68, 1);
    for (let i = 0; i < 20; i += 1) {
      const ang = (i / 20) * Math.PI * 2 + (i % 3) * 0.09;
      const rad = 14.2 + (i % 4) * 0.65;
      const rock = new THREE.Mesh(boulderGeo, reefMat);
      rock.position.set(Math.cos(ang) * rad, 0.08, Math.sin(ang) * rad);
      rock.scale.set(
        1.1 + (i % 3) * 0.35,
        0.52 + (i % 2) * 0.2,
        0.95 + ((i + 1) % 3) * 0.3
      );
      rock.rotation.y = ang * 1.7;
      this.group.add(rock);
    }

    // Packed dark volcanic-sand & coral-gravel terrace floor
    const terraceMat = new THREE.MeshStandardMaterial({
      color: 0x23201d,
      roughness: 0.92,
      metalness: 0.03,
    });
    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(12.6, 13.5, 0.42, 48),
      terraceMat
    );
    terrace.position.y = 0.06;
    terrace.receiveShadow = true;
    this.group.add(terrace);

    // Fitted basalt curb ring
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x37332e,
      roughness: 0.85,
    });
    const curbRing = new THREE.Mesh(
      new THREE.TorusGeometry(12.05, 0.24, 10, 64),
      curbMat
    );
    curbRing.rotation.x = Math.PI / 2;
    curbRing.position.y = 0.29;
    this.group.add(curbRing);

    // Central Wayfinder's Standing Stone Medallion & 12 shell-lime sight rays
    const medallionMat = new THREE.MeshStandardMaterial({
      color: 0x2f2c28,
      roughness: 0.78,
    });
    const medallion = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.72, 0.1, 36),
      medallionMat
    );
    medallion.position.y = 0.31;
    this.group.add(medallion);

    const inlayMat = new THREE.MeshStandardMaterial({
      color: 0xd9c39a,
      emissive: 0x3b2c14,
      emissiveIntensity: 0.35,
      roughness: 0.65,
    });
    const centerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.035, 8, 36),
      inlayMat
    );
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = 0.365;
    this.group.add(centerRing);

    // Radial shell-coral sight lines out to all 12 Horizon Stones
    for (const house of HORIZON_HOUSES) {
      const dir = altAzToDirectionVec3(0.0, house.engineAzDeg, 0.0);
      const isPivot = house.side.startsWith('pivot');
      const rayLen = STONE_RADIUS - 1.55;
      const rayGeo = new THREE.BoxGeometry(isPivot ? 0.09 : 0.045, 0.02, rayLen);
      const ray = new THREE.Mesh(rayGeo, inlayMat);
      const midR = 1.35 + rayLen * 0.5;
      ray.position.set(dir.x * midR, 0.28, dir.z * midR);
      ray.rotation.y = Math.atan2(-dir.x, -dir.z);
      this.group.add(ray);
    }

    // Dedicated soft moonlight/sky fill for the stone terrace
    this.nightHemi = new THREE.HemisphereLight(0x6d8fc4, 0x1b1612, 0.55);
    this.group.add(this.nightHemi);
  }

  _buildHorizonStones() {
    const basaltBaseMat = new THREE.MeshStandardMaterial({
      color: 0x3a3632,
      roughness: 0.84,
      metalness: 0.06,
    });
    const coralInlayBaseMat = new THREE.MeshStandardMaterial({
      color: 0xe6cfa4,
      emissive: 0x4a3516,
      emissiveIntensity: 0.28,
      roughness: 0.58,
    });

    for (const house of HORIZON_HOUSES) {
      const isPivot = house.side.startsWith('pivot');
      const isRising = house.side === 'rising';
      const dir = altAzToDirectionVec3(0.0, house.engineAzDeg, 0.0);

      const holder = new THREE.Group();
      holder.position.set(dir.x * STONE_RADIUS, 0.26, dir.z * STONE_RADIUS);
      // Face inward toward the navigator at (0, 0, 0)
      holder.rotation.y = Math.atan2(-dir.x, -dir.z);

      const stoneMat = basaltBaseMat.clone();
      const bandMat = coralInlayBaseMat.clone();
      if (!isPivot) {
        // Subtle warm coral tint on Rising stones vs cool slate-shell on Setting stones
        bandMat.color.setHex(isRising ? 0xf0c987 : 0xb8d4e8);
      } else {
        bandMat.color.setHex(0xffdf9a);
      }

      // Plinth base
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.76, 0.26, 8),
        stoneMat
      );
      plinth.position.y = 0.13;
      holder.add(plinth);

      if (isPivot) {
        // Monumental twin-horned Pivot Monolith: V-notch saddle sits at y=1.44 (world y=1.70, below 2.15m eye!)
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.86, 1.24, 0.44),
          stoneMat
        );
        body.position.y = 0.86;
        holder.add(body);

        const leftHorn = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.46, 5),
          stoneMat
        );
        leftHorn.position.set(-0.26, 1.62, 0.0);
        leftHorn.rotation.z = 0.12;
        holder.add(leftHorn);

        const rightHorn = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.46, 5),
          stoneMat
        );
        rightHorn.position.set(0.26, 1.62, 0.0);
        rightHorn.rotation.z = -0.12;
        holder.add(rightHorn);

        const notchInlay = new THREE.Mesh(
          new THREE.BoxGeometry(0.88, 0.09, 0.47),
          bandMat
        );
        notchInlay.position.y = 1.32;
        holder.add(notchInlay);
      } else {
        // Carved Rising / Setting Cairn Upright (world top y ~ 1.68m -> -2.3 deg below eye horizon)
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.29, 0.42, 1.18, 7),
          stoneMat
        );
        shaft.position.y = 0.82;
        holder.add(shaft);

        // Sight-notch cap
        const capLeft = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.2, 0.28),
          stoneMat
        );
        capLeft.position.set(-0.14, 1.44, 0.0);
        const capRight = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.2, 0.28),
          stoneMat
        );
        capRight.position.set(0.14, 1.44, 0.0);
        holder.add(capLeft, capRight);

        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.325, 0.345, 0.085, 7),
          bandMat
        );
        band.position.y = 1.16;
        holder.add(band);
      }

      // Golden ground halo ring when highlighted by Star Master or Sighted
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffd57e,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      });
      const haloRing = new THREE.Mesh(
        new THREE.RingGeometry(0.82, 1.06, 28),
        haloMat
      );
      haloRing.rotation.x = -Math.PI / 2;
      haloRing.position.y = 0.04;
      holder.add(haloRing);

      this.group.add(holder);
      this.stoneEntries.push({
        house,
        holder,
        stoneMat,
        bandMat,
        haloRing,
        haloMat,
        labelWorldPos: new THREE.Vector3(
          dir.x * STONE_RADIUS,
          isPivot ? 2.08 : 1.88,
          dir.z * STONE_RADIUS
        ),
      });
    }
  }

  _buildEmberBraziers() {
    const brazierAnglesDeg = [45.0, 135.0, 225.0, 315.0];
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x2b2520,
      roughness: 0.86,
    });

    for (let i = 0; i < brazierAnglesDeg.length; i += 1) {
      const dir = altAzToDirectionVec3(0.0, brazierAnglesDeg[i], 0.0);
      const r = 9.65;
      const bGroup = new THREE.Group();
      bGroup.position.set(dir.x * r, 0.26, dir.z * r);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.32, 0.56, 8),
        bowlMat
      );
      pedestal.position.y = 0.28;
      bGroup.add(pedestal);

      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.2, 0.22, 10),
        bowlMat
      );
      bowl.position.y = 0.62;
      bGroup.add(bowl);

      const emberMat = new THREE.MeshBasicMaterial({
        color: 0xff9d42,
      });
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.34, 8),
        emberMat
      );
      flame.position.y = 0.82;
      bGroup.add(flame);

      const light = new THREE.PointLight(0xff9b42, 1.45, 19.0, 1.6);
      light.position.set(0.0, 1.05, 0.0);
      bGroup.add(light);

      this.group.add(bGroup);
      this.braziers.push({
        flame,
        emberMat,
        light,
        phaseOffset: i * 1.7,
      });
    }
  }

  _buildStoneLabels() {
    if (!this.labelLayerEl) return;
    for (const house of HORIZON_HOUSES) {
      const el = document.createElement('div');
      el.className = 'vigil-stone-label';
      el.textContent = house.name;
      el.style.display = 'none';
      this.labelLayerEl.appendChild(el);
      this.stoneLabelEls[house.id] = el;
    }
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
    if (!visible) {
      for (const el of Object.values(this.stoneLabelEls)) {
        el.style.display = 'none';
      }
    }
  }

  update(
    elapsedSec,
    camera,
    {
      showStoneLabels = true,
      highlightHouseId = null,
      revealHouseIds = null,
    } = {}
  ) {
    if (!this.group.visible) return;

    // 1. Gentle warm coconut-ember flicker
    for (const br of this.braziers) {
      const wave =
        Math.sin(elapsedSec * 5.2 + br.phaseOffset) * 0.5 +
        Math.sin(elapsedSec * 11.3 + br.phaseOffset * 2.1) * 0.5;
      br.light.intensity = 1.38 + wave * 0.22;
      const s = 1.0 + wave * 0.09;
      br.flame.scale.set(1.0 + wave * 0.05, s, 1.0 - wave * 0.04);
    }

    // 2. Highlight active Horizon House Stone & project mode-gated DOM labels
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const entry of this.stoneEntries) {
      const hid = entry.house.id;
      const isHighlighted = highlightHouseId === hid;
      const pulse = 0.65 + 0.35 * Math.sin(elapsedSec * 3.6);

      entry.haloRing.visible = isHighlighted;
      entry.haloMat.opacity = isHighlighted ? 0.55 * pulse + 0.25 : 0.0;
      entry.bandMat.emissiveIntensity = isHighlighted ? 0.95 * pulse + 0.35 : 0.28;

      const el = this.stoneLabelEls[hid];
      if (!el || !camera) continue;

      const allowLabel =
        showStoneLabels || (revealHouseIds && revealHouseIds.has(hid));
      if (!allowLabel) {
        el.style.display = 'none';
        continue;
      }

      this._projVec.copy(entry.labelWorldPos);
      this._projVec.project(camera);

      if (
        this._projVec.z > 1.0 ||
        this._projVec.x < -0.94 ||
        this._projVec.x > 0.94 ||
        this._projVec.y < -0.82 ||
        this._projVec.y > 0.88
      ) {
        el.style.display = 'none';
        continue;
      }

      const sx = (this._projVec.x * 0.5 + 0.5) * width;
      const sy = (-this._projVec.y * 0.5 + 0.5) * height;
      el.style.display = 'block';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy - 8).toFixed(1)}px, 0) translateX(-50%)`;
      el.classList.toggle('active-target-stone', isHighlighted);
    }
  }
}
