/**
 * Living Ocean & Horizon Cues Renderer:
 * - Marching Trade-Wind Clouds vs. Stationary Island Peak Clouds (Ring 2+)
 * - Coral Atoll Lapa Turquoise Cloud Underside Glow (Ring 2+)
 * - Purposeful Dawn/Dusk Homing Terns & Brown Boobies (Ring 1+)
 * - Midday Leaping Bonito Fish School & Wheeling Birds
 * - Drifting Green Palm Fronds & Kelp Trails (Ring 3+)
 * - Rising 3D Volcanic Islands, Twin Peaks, Fortress Crags, Coral Atolls & Rapa Nui Moai
 */

import * as THREE from 'three';
import { degToRad, posMod, wrapDeg180 } from '../core/gameConstants.js';

export class WorldCuesRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._buildMarchingTradeClouds();
    this._buildIslandBeaconPools();
    this._buildHomingBirdFlocks();
    this._buildMiddayFishSchool();
    this._buildDriftingFronds();
  }

  _buildMarchingTradeClouds() {
    this.tradeCloudGroup = new THREE.Group();
    this.group.add(this.tradeCloudGroup);

    this.tradeClouds = [];
    const puffGeo = new THREE.SphereGeometry(1.0, 10, 8);
    this.tradeCloudMat = new THREE.MeshBasicMaterial({
      color: 0xf4f7fb,
      transparent: true,
      opacity: 0.72,
    });

    for (let i = 0; i < 14; i += 1) {
      const cluster = new THREE.Group();
      for (let p = 0; p < 3; p += 1) {
        const puff = new THREE.Mesh(puffGeo, this.tradeCloudMat);
        puff.position.set((p - 1) * 16.0, (p === 1 ? 5.0 : 0.0), 0.0);
        puff.scale.set(22.0, 9.5, 16.0);
        cluster.add(puff);
      }
      this.tradeCloudGroup.add(cluster);
      this.tradeClouds.push({
        mesh: cluster,
        progress: i / 14.0,
        lateralOffset: ((i * 73) % 260) - 130.0,
        altY: 68.0 + (i % 4) * 14.0,
      });
    }
  }

  _buildIslandBeaconPools() {
    // Pool of up to 6 active basin island 3D beacons (Peak Cloud, Lapa Glow, 3D Landmass)
    this.islandSlots = [];
    for (let i = 0; i < 6; i += 1) {
      const root = new THREE.Group();
      root.visible = false;

      // 1. Tall Stationary Cumulus Peak Cloud (High Volcanic Islands)
      const peakCloud = new THREE.Group();
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const basePuff = new THREE.Mesh(new THREE.SphereGeometry(26, 12, 10), cloudMat);
      basePuff.scale.set(1.35, 0.65, 1.1);
      const midPuff = new THREE.Mesh(new THREE.SphereGeometry(22, 12, 10), cloudMat);
      midPuff.position.set(0, 20, 0);
      const crownPuff = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 10), cloudMat);
      crownPuff.position.set(0, 38, 0);
      peakCloud.add(basePuff, midPuff, crownPuff);
      peakCloud.position.y = 56.0;
      root.add(peakCloud);

      // 2. Coral Atoll Lapa Cloud (flat low cloud with unmistakable pale jade/turquoise belly!)
      const lapaCloud = new THREE.Group();
      const lapaTop = new THREE.Mesh(
        new THREE.SphereGeometry(32, 14, 10),
        new THREE.MeshBasicMaterial({ color: 0xeef4f8, transparent: true, opacity: 0.85 })
      );
      lapaTop.scale.set(1.6, 0.35, 1.3);
      lapaTop.position.y = 42.0;

      const lapaBellyMat = new THREE.MeshBasicMaterial({
        color: 0x3ef0d0,
        transparent: true,
        opacity: 0.82,
      });
      const lapaBelly = new THREE.Mesh(
        new THREE.SphereGeometry(30, 14, 10),
        lapaBellyMat
      );
      lapaBelly.scale.set(1.55, 0.18, 1.25);
      lapaBelly.position.y = 36.5;
      lapaCloud.add(lapaTop, lapaBelly);
      root.add(lapaCloud);

      // 3. 3D Island Landmass Variants (Volcanic Peak, Twin Peaks, Atoll Ring, Moai Ridge)
      const landGroup = new THREE.Group();

      const mainPeakMat = new THREE.MeshStandardMaterial({
        color: 0x2d5a36,
        roughness: 0.88,
      });
      const mainPeak = new THREE.Mesh(new THREE.ConeGeometry(42, 68, 12), mainPeakMat);
      mainPeak.position.y = 26.0;
      landGroup.add(mainPeak);

      const secondPeak = new THREE.Mesh(new THREE.ConeGeometry(32, 54, 10), mainPeakMat);
      secondPeak.position.set(34.0, 20.0, 8.0);
      landGroup.add(secondPeak);

      const atollRing = new THREE.Mesh(
        new THREE.TorusGeometry(42, 8, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xd8ca9e })
      );
      atollRing.rotation.x = Math.PI / 2;
      atollRing.position.y = 1.6;
      landGroup.add(atollRing);

      const lagoonDisc = new THREE.Mesh(
        new THREE.CircleGeometry(36, 20),
        new THREE.MeshBasicMaterial({ color: 0x28d8c0 })
      );
      lagoonDisc.rotation.x = -Math.PI / 2;
      lagoonDisc.position.y = 1.2;
      landGroup.add(lagoonDisc);

      // Ancestral Moai monoliths for Rapa Nui Grand Finale!
      const moaiGroup = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b675e, roughness: 0.9 });
      for (let m = -2; m <= 2; m += 1) {
        const statue = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.5, 2.2), stoneMat);
        statue.position.set(m * 6.5, 9.0, -26.0);
        moaiGroup.add(statue);
      }
      landGroup.add(moaiGroup);

      root.add(landGroup);
      this.group.add(root);

      this.islandSlots.push({
        root,
        peakCloud,
        cloudMat,
        lapaCloud,
        lapaBellyMat,
        landGroup,
        mainPeak,
        mainPeakMat,
        secondPeak,
        atollRing,
        lagoonDisc,
        moaiGroup,
      });
    }
  }

  _buildHomingBirdFlocks() {
    // 8 homing sea birds flying in purposeful straight rays along nearest Ring 1+ island bearing
    this.homingBirds = [];
    this.birdFlockGroup = new THREE.Group();
    this.group.add(this.birdFlockGroup);

    const wingGeo = new THREE.BoxGeometry(0.95, 0.05, 0.32);
    wingGeo.translate(0.47, 0, 0);

    for (let i = 0; i < 8; i += 1) {
      const bird = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xfafcff });
      const leftWing = new THREE.Mesh(wingGeo, mat);
      leftWing.scale.x = -1;
      const rightWing = new THREE.Mesh(wingGeo, mat);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.95, 6), mat);
      body.rotation.x = -Math.PI / 2; // Beak points along -Z local
      bird.add(leftWing, rightWing, body);
      this.birdFlockGroup.add(bird);

      this.homingBirds.push({
        bird,
        leftWing,
        rightWing,
        mat,
        phase: i * 0.78,
        offsetSide: (i - 3.5) * 5.2,
        offsetHeight: 9.5 + (i % 3) * 3.4,
        progress: i / 8.0,
      });
    }
  }

  _buildMiddayFishSchool() {
    this.fishGroup = new THREE.Group();
    this.fishGroup.visible = false;
    this.group.add(this.fishGroup);

    const fishMat = new THREE.MeshStandardMaterial({
      color: 0xb8d8ef,
      metalness: 0.55,
      roughness: 0.25,
    });
    this.leapingFish = [];
    for (let i = 0; i < 10; i += 1) {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 6), fishMat);
      this.fishGroup.add(mesh);
      this.leapingFish.push({
        mesh,
        angle: (i / 10.0) * Math.PI * 2.0,
        radius: 2.2 + (i % 3) * 1.6,
        phase: i * 0.62,
      });
    }
  }

  _buildDriftingFronds() {
    this.frondGroup = new THREE.Group();
    this.frondGroup.visible = false;
    this.group.add(this.frondGroup);

    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x4b7f32,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    this.fronds = [];
    for (let i = 0; i < 12; i += 1) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.2), frondMat);
      mesh.rotation.x = -Math.PI / 2;
      this.frondGroup.add(mesh);
      this.fronds.push({
        mesh,
        progress: i / 12.0,
        lateral: ((i * 29) % 26) - 13.0,
      });
    }
  }

  update(dtSec, elapsedSec, oceanSim) {
    if (!oceanSim) return;

    const headingDeg = oceanSim.headingDeg;
    const sun = oceanSim.sunState;
    const weather = oceanSim.getCurrentVerse()?.weather ?? 'clear';
    const isFog = weather === 'sea_fog';

    // 1. Marching Trade-Wind Clouds (drift steadily toward windFromAz + 180 deg)
    const downwindAz = posMod(oceanSim.getWindFromAz() + 180.0, 360.0);
    const downwindRelRad = degToRad(wrapDeg180(downwindAz - headingDeg));
    const marchDirX = Math.sin(downwindRelRad);
    const marchDirZ = -Math.cos(downwindRelRad);
    const perpX = -marchDirZ;
    const perpZ = marchDirX;

    const cloudBrightness = 0.16 + 0.82 * sun.daylightFactor;
    this.tradeCloudMat.color.setRGB(
      cloudBrightness,
      cloudBrightness * 0.99,
      Math.min(1.0, cloudBrightness * 1.04)
    );
    this.tradeCloudMat.opacity = isFog ? 0.08 : 0.65;

    for (const tc of this.tradeClouds) {
      tc.progress = (tc.progress + dtSec * 0.014) % 1.0;
      const along = (tc.progress - 0.5) * 860.0;
      tc.mesh.position.set(
        marchDirX * along + perpX * tc.lateralOffset,
        tc.altY,
        marchDirZ * along + perpZ * tc.lateralOffset
      );
    }

    // 2. Concentric Island Beacons (Peak Cloud, Lapa Glow, Rising 3D Islands)
    this.islandSlots.forEach((slot) => {
      slot.root.visible = false;
    });

    oceanSim.detections.slice(0, this.islandSlots.length).forEach((det, idx) => {
      const slot = this.islandSlots[idx];
      const isl = det.island;
      const relAzRad = degToRad(wrapDeg180(det.bearingDeg - headingDeg));

      // Visual distance scales smoothly from horizon (540m at Ring 1) to close reef (95m at Ring 4)
      const normDist = Math.min(
        1.0,
        Math.max(0.0, det.distanceUnits / Math.max(0.5, oceanSim.ringRadii.ring1))
      );
      const visualDist = 92.0 + normDist * 460.0;
      const px = Math.sin(relAzRad) * visualDist;
      const pz = -Math.cos(relAzRad) * visualDist;

      slot.root.visible = true;
      slot.root.position.set(px, 0.0, pz);
      slot.root.lookAt(0, 0, 0);

      // Peak Cloud visible in Ring 2+ (unless thick sea fog hides low clouds)
      const showCloud = det.ring >= 2 && (!isFog || Boolean(isl.peaksPierceFog));
      slot.peakCloud.visible = Boolean(isl.hasPeakCloud) && showCloud;
      slot.cloudMat.color.setRGB(
        0.22 + 0.78 * sun.daylightFactor,
        0.22 + 0.77 * sun.daylightFactor,
        0.26 + 0.74 * sun.daylightFactor
      );

      // Coral Atoll Lapa Turquoise Belly Glow (Ring 2+)
      slot.lapaCloud.visible = Boolean(isl.hasLapaGlow) && det.ring >= 2 && !isFog;
      slot.lapaBellyMat.opacity = 0.42 + 0.45 * sun.daylightFactor;

      // 3D Island Landmass rises over sea curvature across Ring 3 -> Ring 4
      const showLand =
        det.ring >= 3 || (Boolean(isl.peaksPierceFog) && det.ring >= 2);
      slot.landGroup.visible = showLand;
      if (showLand) {
        const riseProgress = Math.min(
          1.0,
          Math.max(0.0, 1.0 - (det.distanceUnits - oceanSim.ringRadii.ring4) / Math.max(0.4, oceanSim.ringRadii.ring2))
        );
        const isAtoll = isl.archetype === 'coral_atoll';
        slot.mainPeak.visible = !isAtoll;
        slot.secondPeak.visible = isl.archetype === 'twin_peaks';
        slot.atollRing.visible = isAtoll;
        slot.lagoonDisc.visible = isAtoll;
        slot.moaiGroup.visible = isl.id === 'hawaii' && det.ring >= 3;

        slot.mainPeakMat.color.setHex(
          isl.archetype === 'fortress_crag' ? 0x26292e : 0x2d5a36
        );
        // Sink far islands partially below the horizon curvature, rising grandly on approach
        slot.landGroup.position.y = isAtoll
          ? -4.0 * (1.0 - riseProgress)
          : -34.0 * (1.0 - riseProgress);
      }
    });

    // 3. Purposeful Straight-Line Homing Birds at Dawn (05:00..09:45) & Dusk (15:15..19:15)
    const hr = oceanSim.solarHour;
    const isDawnWindow = hr >= 5.0 && hr <= 9.75;
    const isDuskWindow = hr >= 15.25 && hr <= 19.25;
    const nearestRing1 = oceanSim.detections[0];

    if (nearestRing1 && (isDawnWindow || isDuskWindow)) {
      this.birdFlockGroup.visible = true;
      // Dawn: fly OUTWARD from island (bearing + 180); Dusk: fly HOMEWARD toward island (bearing)
      const flightWorldAz = isDawnWindow
        ? posMod(nearestRing1.bearingDeg + 180.0, 360.0)
        : nearestRing1.bearingDeg;
      const flightRelRad = degToRad(wrapDeg180(flightWorldAz - headingDeg));
      const fDirX = Math.sin(flightRelRad);
      const fDirZ = -Math.cos(flightRelRad);
      const fSideX = -fDirZ;
      const fSideZ = fDirX;

      const isBooby =
        nearestRing1.island.birdSpecies === 'brown_booby' ||
        nearestRing1.island.birdSpecies === 'booby';
      const birdHex = isBooby ? 0x8b6344 : 0xf7fbff;

      for (const b of this.homingBirds) {
        b.mat.color.setHex(birdHex);
        b.progress = (b.progress + dtSec * 0.12) % 1.0;
        const along = (b.progress - 0.5) * 145.0;
        b.bird.position.set(
          fDirX * along + fSideX * b.offsetSide,
          b.offsetHeight,
          fDirZ * along + fSideZ * b.offsetSide
        );
        // Orient beak (-Z local) strictly along flight vector
        b.bird.rotation.y = -flightRelRad;
        const flap = Math.sin(elapsedSec * 9.5 + b.phase) * 0.52;
        b.leftWing.rotation.z = -flap;
        b.rightWing.rotation.z = flap;
      }
    } else {
      this.birdFlockGroup.visible = false;
    }

    // 4. Midday Leaping Bonito Fish School
    const fs = oceanSim.fishSchool;
    if (fs && !fs.harvested && sun.altDeg > 6.0) {
      const fdx = fs.x - oceanSim.pos.x;
      const fdy = fs.y - oceanSim.pos.y;
      const fDistUnits = Math.hypot(fdx, fdy);
      if (fDistUnits < 2.2) {
        this.fishGroup.visible = true;
        const fBrg = posMod((Math.atan2(fdx, fdy) * 180.0) / Math.PI, 360.0);
        const fRel = degToRad(wrapDeg180(fBrg - headingDeg));
        const mDist = Math.max(8.0, fDistUnits * 48.0);
        this.fishGroup.position.set(
          Math.sin(fRel) * mDist,
          0.0,
          -Math.cos(fRel) * mDist
        );
        for (const lf of this.leapingFish) {
          const t = (elapsedSec * 2.4 + lf.phase) % (Math.PI * 2.0);
          const arcY = Math.max(-0.4, Math.sin(t) * 1.85);
          lf.mesh.position.set(
            Math.cos(lf.angle + elapsedSec * 0.5) * lf.radius,
            arcY,
            Math.sin(lf.angle + elapsedSec * 0.5) * lf.radius
          );
          lf.mesh.rotation.z = Math.cos(t) * 0.9;
        }
      } else {
        this.fishGroup.visible = false;
      }
    } else {
      this.fishGroup.visible = false;
    }

    // 5. Drifting Green Palm Fronds & Kelp (Ring 3+)
    const ring3Isl = oceanSim.detections.find((d) => d.ring >= 3);
    if (ring3Isl) {
      this.frondGroup.visible = true;
      for (const fr of this.fronds) {
        fr.progress = (fr.progress + dtSec * 0.08) % 1.0;
        const along = (fr.progress - 0.5) * 58.0;
        fr.mesh.position.set(
          marchDirX * along + perpX * fr.lateral,
          0.08,
          marchDirZ * along + perpZ * fr.lateral
        );
        fr.mesh.rotation.z = -downwindRelRad;
      }
    } else {
      this.frondGroup.visible = false;
    }
  }
}
