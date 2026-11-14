/**
 * Living Ocean & Horizon Cues Renderer:
 * - Marching Trade-Wind Clouds vs. Stationary Island Peak Clouds (Ring 2+)
 * - Coral Atoll Lapa Turquoise Cloud Underside Glow (Ring 2+)
 * - Purposeful Dawn/Dusk Homing Terns & Brown Boobies (Ring 1+)
 * - Midday Leaping Bonito Fish School & Wheeling Birds
 * - Drifting Green Palm Fronds & Kelp Trails (Ring 3+)
 * - Rising 3D Volcanic Islands, Twin Peaks, Fortress Crags, Coral Atolls & Ancestral Monoliths
 *
 * All cues ease in and fade out smoothly across both distance thresholds and loop boundaries.
 */

import * as THREE from 'three';
import { degToRad, posMod, wrapDeg180 } from '../core/gameConstants.js';

function smoothstep(edge0, edge1, x) {
  if (Math.abs(edge1 - edge0) < 1e-6) {
    return x >= edge1 ? 1.0 : 0.0;
  }
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

function easeToward(current, target, dtSec, rate) {
  if (dtSec <= 0.0) return current;
  const alpha = 1.0 - Math.exp(-rate * dtSec);
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < 0.0015 ? target : next;
}

export class WorldCuesRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._lastSong = null;
    this._lastSimElapsed = 0.0;

    this.tradeFogOpacity = 0.65;
    this.birdFlockAlpha = 0.0;
    this._lastBirdWorldAz = 0.0;
    this._birdTargetColor = new THREE.Color(0xf7fbff);
    this.fishAlpha = 0.0;
    this.frondAlpha = 0.0;

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
      depthWrite: false,
    });

    for (let i = 0; i < 14; i += 1) {
      const cluster = new THREE.Group();
      const mat = this.tradeCloudMat.clone();
      for (let p = 0; p < 3; p += 1) {
        const puff = new THREE.Mesh(puffGeo, mat);
        puff.position.set((p - 1) * 16.0, p === 1 ? 5.0 : 0.0, 0.0);
        puff.scale.set(22.0, 9.5, 16.0);
        cluster.add(puff);
      }
      this.tradeCloudGroup.add(cluster);
      this.tradeClouds.push({
        mesh: cluster,
        mat,
        progress: i / 14.0,
        lateralOffset: ((i * 73) % 260) - 130.0,
        altY: 68.0 + (i % 4) * 14.0,
      });
    }
  }

  _buildIslandBeaconPools() {
    // Pool of up to 8 basin island 3D beacons keyed persistently by island.id so fade-outs complete cleanly
    this.islandSlots = [];
    for (let i = 0; i < 8; i += 1) {
      const root = new THREE.Group();
      root.visible = false;

      // 1. Tall Stationary Cumulus Peak Cloud (High Volcanic Islands)
      const peakCloud = new THREE.Group();
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
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
      const lapaTopMat = new THREE.MeshBasicMaterial({
        color: 0xeef4f8,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const lapaTop = new THREE.Mesh(
        new THREE.SphereGeometry(32, 14, 10),
        lapaTopMat
      );
      lapaTop.scale.set(1.6, 0.35, 1.3);
      lapaTop.position.y = 42.0;

      const lapaBellyMat = new THREE.MeshBasicMaterial({
        color: 0x3ef0d0,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      });
      const lapaBelly = new THREE.Mesh(
        new THREE.SphereGeometry(30, 14, 10),
        lapaBellyMat
      );
      lapaBelly.scale.set(1.55, 0.18, 1.25);
      lapaBelly.position.y = 36.5;
      lapaCloud.add(lapaTop, lapaBelly);
      root.add(lapaCloud);

      // 3. 3D Island Landmass Variants (Volcanic Peak, Twin Peaks, Atoll Ring, Ancestral Monoliths)
      const landGroup = new THREE.Group();

      const mainPeakMat = new THREE.MeshStandardMaterial({
        color: 0x2d5a36,
        roughness: 0.88,
        transparent: true,
        opacity: 1.0,
      });
      const mainPeak = new THREE.Mesh(new THREE.ConeGeometry(42, 68, 12), mainPeakMat);
      mainPeak.position.y = 26.0;
      landGroup.add(mainPeak);

      const secondPeak = new THREE.Mesh(new THREE.ConeGeometry(32, 54, 10), mainPeakMat);
      secondPeak.position.set(34.0, 20.0, 8.0);
      landGroup.add(secondPeak);

      const atollMat = new THREE.MeshBasicMaterial({
        color: 0xd8ca9e,
        transparent: true,
        opacity: 1.0,
      });
      const atollRing = new THREE.Mesh(
        new THREE.TorusGeometry(42, 8, 8, 24),
        atollMat
      );
      atollRing.rotation.x = Math.PI / 2;
      atollRing.position.y = 1.6;
      landGroup.add(atollRing);

      const lagoonMat = new THREE.MeshBasicMaterial({
        color: 0x28d8c0,
        transparent: true,
        opacity: 1.0,
      });
      const lagoonDisc = new THREE.Mesh(
        new THREE.CircleGeometry(36, 20),
        lagoonMat
      );
      lagoonDisc.rotation.x = -Math.PI / 2;
      lagoonDisc.position.y = 1.2;
      landGroup.add(lagoonDisc);

      // Ancestral stone monoliths for Hawai'i Grand Finale
      const moaiGroup = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x6b675e,
        roughness: 0.9,
        transparent: true,
        opacity: 1.0,
      });
      for (let m = -2; m <= 2; m += 1) {
        const statue = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.5, 2.2), stoneMat);
        statue.position.set(m * 6.5, 9.0, -26.0);
        moaiGroup.add(statue);
      }
      landGroup.add(moaiGroup);

      root.add(landGroup);
      this.group.add(root);

      this.islandSlots.push({
        islandId: null,
        islandDef: null,
        peakAlpha: 0.0,
        lapaAlpha: 0.0,
        landAlpha: 0.0,
        riseFactor: 0.0,
        lastDistUnits: 99.0,
        lastBearingDeg: 0.0,
        root,
        peakCloud,
        cloudMat,
        lapaCloud,
        lapaTopMat,
        lapaBellyMat,
        landGroup,
        mainPeak,
        mainPeakMat,
        secondPeak,
        atollRing,
        atollMat,
        lagoonDisc,
        lagoonMat,
        moaiGroup,
        stoneMat,
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
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfafcff,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
      });
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

    this.fishMat = new THREE.MeshStandardMaterial({
      color: 0xb8d8ef,
      metalness: 0.55,
      roughness: 0.25,
      transparent: true,
      opacity: 1.0,
    });
    this.leapingFish = [];
    for (let i = 0; i < 10; i += 1) {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 6), this.fishMat);
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

    const baseFrondMat = new THREE.MeshStandardMaterial({
      color: 0x4b7f32,
      roughness: 0.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    this.fronds = [];
    for (let i = 0; i < 12; i += 1) {
      const mat = baseFrondMat.clone();
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.2), mat);
      mesh.rotation.x = -Math.PI / 2;
      this.frondGroup.add(mesh);
      this.fronds.push({
        mesh,
        mat,
        progress: i / 12.0,
        lateral: ((i * 29) % 26) - 13.0,
      });
    }
  }

  _resetVoyageTransitions() {
    for (const slot of this.islandSlots) {
      slot.islandId = null;
      slot.islandDef = null;
      slot.peakAlpha = 0.0;
      slot.lapaAlpha = 0.0;
      slot.landAlpha = 0.0;
      slot.riseFactor = 0.0;
      slot.root.visible = false;
    }
    this.birdFlockAlpha = 0.0;
    this.birdFlockGroup.visible = false;
    this.fishAlpha = 0.0;
    this.fishGroup.visible = false;
    this.frondAlpha = 0.0;
    this.frondGroup.visible = false;
  }

  update(dtSec, elapsedSec, oceanSim) {
    if (!oceanSim) return;

    // Reset transient fade states cleanly when launching a new voyage
    if (
      oceanSim.song !== this._lastSong ||
      oceanSim.elapsedRealSec < this._lastSimElapsed - 1.0
    ) {
      this._resetVoyageTransitions();
      this._lastSong = oceanSim.song;
    }
    this._lastSimElapsed = oceanSim.elapsedRealSec;

    const fadeDt = Math.min(0.1, Math.max(0.001, dtSec));
    const headingDeg = oceanSim.headingDeg;
    const sun = oceanSim.sunState;
    const weather = oceanSim.getCurrentVerse()?.weather ?? 'clear';
    const isFog = weather === 'sea_fog';

    // -----------------------------------------------------------------------
    // 1. Marching Trade-Wind Clouds (ease in upwind, fade out downwind & in fog)
    // -----------------------------------------------------------------------
    const downwindAz = posMod(oceanSim.getWindFromAz() + 180.0, 360.0);
    const downwindRelRad = degToRad(wrapDeg180(downwindAz - headingDeg));
    const marchDirX = Math.sin(downwindRelRad);
    const marchDirZ = -Math.cos(downwindRelRad);
    const perpX = -marchDirZ;
    const perpZ = marchDirX;

    const cloudBrightness = 0.16 + 0.82 * sun.daylightFactor;
    const cr = cloudBrightness;
    const cg = cloudBrightness * 0.99;
    const cb = Math.min(1.0, cloudBrightness * 1.04);

    const targetTradeOpacity = isFog ? 0.08 : 0.65;
    this.tradeFogOpacity = easeToward(this.tradeFogOpacity, targetTradeOpacity, fadeDt, 1.15);

    for (const tc of this.tradeClouds) {
      tc.progress = (tc.progress + dtSec * 0.014) % 1.0;
      const along = (tc.progress - 0.5) * 860.0;
      tc.mesh.position.set(
        marchDirX * along + perpX * tc.lateralOffset,
        tc.altY,
        marchDirZ * along + perpZ * tc.lateralOffset
      );

      // Smooth horizon fade-in (0.0 -> 0.18) and fade-out (0.82 -> 1.0) so wrap-around is invisible
      const horizonEnv =
        smoothstep(0.0, 0.18, tc.progress) *
        smoothstep(0.0, 0.18, 1.0 - tc.progress);
      const opacity = this.tradeFogOpacity * horizonEnv;
      tc.mat.color.setRGB(cr, cg, cb);
      tc.mat.opacity = opacity;
      tc.mesh.scale.setScalar(0.82 + 0.18 * horizonEnv);
      tc.mesh.visible = opacity > 0.004;
    }

    // -----------------------------------------------------------------------
    // 2. Concentric Island Beacons (persistent per-island slots with smooth fade & rise)
    // -----------------------------------------------------------------------
    const r1 = Math.max(0.5, oceanSim.ringRadii.ring1);
    const r2 = Math.max(0.35, oceanSim.ringRadii.ring2);
    const r3 = Math.max(0.25, oceanSim.ringRadii.ring3);
    const r4 = Math.max(0.15, oceanSim.ringRadii.ring4);

    const detById = new Map();
    for (const det of oceanSim.detections) {
      detById.set(det.island.id, det);
    }

    // Claim free slots for newly detected islands (starting from 0 alpha so they ease in smoothly)
    for (const det of oceanSim.detections) {
      const alreadyBound = this.islandSlots.some((s) => s.islandId === det.island.id);
      if (!alreadyBound) {
        const freeSlot = this.islandSlots.find((s) => s.islandId === null);
        if (freeSlot) {
          freeSlot.islandId = det.island.id;
          freeSlot.islandDef = det.island;
          freeSlot.peakAlpha = 0.0;
          freeSlot.lapaAlpha = 0.0;
          freeSlot.landAlpha = 0.0;
          freeSlot.riseFactor = 0.0;
          freeSlot.lastDistUnits = det.distanceUnits;
          freeSlot.lastBearingDeg = det.bearingDeg;
        }
      }
    }

    for (const slot of this.islandSlots) {
      if (!slot.islandId) {
        slot.root.visible = false;
        continue;
      }

      const det = detById.get(slot.islandId) || null;
      const activeIsl = oceanSim.activeIslands?.[slot.islandId] || slot.islandDef;
      const isl = det ? det.island : activeIsl;

      // Keep tracking true world bearing & distance even after leaving Ring 1 while fading out
      let distUnits = slot.lastDistUnits;
      let bearingDeg = slot.lastBearingDeg;
      if (det) {
        distUnits = det.distanceUnits;
        bearingDeg = det.bearingDeg;
      } else if (activeIsl?.simPos && oceanSim.pos) {
        const dx = activeIsl.simPos.x - oceanSim.pos.x;
        const dy = activeIsl.simPos.y - oceanSim.pos.y;
        distUnits = Math.hypot(dx, dy);
        bearingDeg = posMod((Math.atan2(dx, dy) * 180.0) / Math.PI, 360.0);
      }
      slot.lastDistUnits = distUnits;
      slot.lastBearingDeg = bearingDeg;

      // Target alphas ramp smoothly across ring boundaries rather than binary step cliffs
      const cloudDistEnv =
        det && isl?.hasPeakCloud
          ? smoothstep(r2 * 1.12, r2 * 0.78, distUnits)
          : 0.0;
      const targetPeakAlpha =
        !isFog || Boolean(isl?.peaksPierceFog) ? cloudDistEnv : 0.0;

      const lapaDistEnv =
        det && isl?.hasLapaGlow && !isFog
          ? smoothstep(r2 * 1.12, r2 * 0.78, distUnits)
          : 0.0;

      const landEntryDist = isl?.peaksPierceFog ? r2 * 1.04 : r3 * 1.1;
      const landFullAlphaDist = Math.max(r4, landEntryDist * 0.68);
      const targetLandAlpha = det
        ? smoothstep(landEntryDist, landFullAlphaDist, distUnits)
        : 0.0;
      const targetRise = det
        ? smoothstep(landEntryDist, r4 * 1.12, distUnits)
        : 0.0;

      slot.peakAlpha = easeToward(slot.peakAlpha, targetPeakAlpha, fadeDt, 1.35);
      slot.lapaAlpha = easeToward(slot.lapaAlpha, lapaDistEnv, fadeDt, 1.35);
      slot.landAlpha = easeToward(slot.landAlpha, targetLandAlpha, fadeDt, 1.45);
      slot.riseFactor = easeToward(slot.riseFactor, targetRise, fadeDt, 1.45);

      const anyVisible =
        slot.peakAlpha > 0.003 ||
        slot.lapaAlpha > 0.003 ||
        slot.landAlpha > 0.003;

      if (!anyVisible && !det) {
        slot.islandId = null;
        slot.islandDef = null;
        slot.root.visible = false;
        continue;
      }

      if (!anyVisible) {
        slot.root.visible = false;
        continue;
      }

      const relAzRad = degToRad(wrapDeg180(bearingDeg - headingDeg));
      const normDist = Math.min(1.0, Math.max(0.0, distUnits / r1));
      const visualDist = 92.0 + normDist * 460.0;
      const px = Math.sin(relAzRad) * visualDist;
      const pz = -Math.cos(relAzRad) * visualDist;

      slot.root.visible = true;
      slot.root.position.set(px, 0.0, pz);
      slot.root.lookAt(0, 0, 0);

      // Peak Cloud ease-in / fade-out
      slot.peakCloud.visible = slot.peakAlpha > 0.003;
      if (slot.peakCloud.visible) {
        slot.cloudMat.color.setRGB(
          0.22 + 0.78 * sun.daylightFactor,
          0.22 + 0.77 * sun.daylightFactor,
          0.26 + 0.74 * sun.daylightFactor
        );
        slot.cloudMat.opacity = 0.9 * slot.peakAlpha;
        slot.peakCloud.scale.setScalar(0.84 + 0.16 * slot.peakAlpha);
      }

      // Coral Atoll Lapa Cloud ease-in / fade-out
      slot.lapaCloud.visible = slot.lapaAlpha > 0.003;
      if (slot.lapaCloud.visible) {
        slot.lapaTopMat.opacity = 0.85 * slot.lapaAlpha;
        slot.lapaBellyMat.opacity =
          (0.42 + 0.45 * sun.daylightFactor) * slot.lapaAlpha;
        slot.lapaCloud.scale.setScalar(0.86 + 0.14 * slot.lapaAlpha);
      }

      // 3D Island Landmass smooth horizon rise & sea-haze fade
      slot.landGroup.visible = slot.landAlpha > 0.003;
      if (slot.landGroup.visible && isl) {
        const isAtoll = isl.archetype === 'coral_atoll';
        slot.mainPeak.visible = !isAtoll;
        slot.secondPeak.visible = isl.archetype === 'twin_peaks';
        slot.atollRing.visible = isAtoll;
        slot.lagoonDisc.visible = isAtoll;
        slot.moaiGroup.visible = isl.id === 'hawaii';

        slot.mainPeakMat.color.setHex(
          isl.archetype === 'fortress_crag' ? 0x26292e : 0x2d5a36
        );
        slot.mainPeakMat.opacity = slot.landAlpha;
        slot.mainPeakMat.depthWrite = slot.landAlpha > 0.35;
        slot.atollMat.opacity = slot.landAlpha;
        slot.lagoonMat.opacity = slot.landAlpha;
        slot.stoneMat.opacity = slot.landAlpha;
        slot.stoneMat.depthWrite = slot.landAlpha > 0.35;

        // Sink distant peaks smoothly below sea curvature (-58m hides the +60m summit at riseFactor = 0)
        slot.landGroup.position.y = isAtoll
          ? -9.5 * (1.0 - slot.riseFactor)
          : -58.0 * (1.0 - slot.riseFactor);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Purposeful Straight-Line Homing Birds (ease across dawn/dusk, Ring 1 & flight ray)
    // -----------------------------------------------------------------------
    const hr = oceanSim.solarHour;
    const dawnEnv = smoothstep(4.8, 5.35, hr) * smoothstep(10.0, 9.35, hr);
    const duskEnv = smoothstep(15.0, 15.55, hr) * smoothstep(19.5, 18.85, hr);
    const timeEnv = Math.max(dawnEnv, duskEnv);
    const nearestRing1 = oceanSim.detections[0];

    let targetFlockAlpha = 0.0;
    if (nearestRing1 && timeEnv > 0.001) {
      const distEnv = smoothstep(r1 * 1.02, r1 * 0.82, nearestRing1.distanceUnits);
      targetFlockAlpha = timeEnv * distEnv;

      // Update homing flight azimuth & plumage color while active
      this._lastBirdWorldAz =
        dawnEnv >= duskEnv
          ? posMod(nearestRing1.bearingDeg + 180.0, 360.0)
          : nearestRing1.bearingDeg;

      const isBooby =
        nearestRing1.island.birdSpecies === 'brown_booby' ||
        nearestRing1.island.birdSpecies === 'booby';
      this._birdTargetColor.setHex(isBooby ? 0x8b6344 : 0xf7fbff);
    }

    this.birdFlockAlpha = easeToward(
      this.birdFlockAlpha,
      targetFlockAlpha,
      fadeDt,
      1.5
    );

    if (this.birdFlockAlpha > 0.003) {
      this.birdFlockGroup.visible = true;
      const flightRelRad = degToRad(wrapDeg180(this._lastBirdWorldAz - headingDeg));
      const fDirX = Math.sin(flightRelRad);
      const fDirZ = -Math.cos(flightRelRad);
      const fSideX = -fDirZ;
      const fSideZ = fDirX;
      const colorLerp = Math.min(1.0, fadeDt * 3.0);

      for (const b of this.homingBirds) {
        b.mat.color.lerp(this._birdTargetColor, colorLerp);
        b.progress = (b.progress + dtSec * 0.12) % 1.0;
        const along = (b.progress - 0.5) * 145.0;
        b.bird.position.set(
          fDirX * along + fSideX * b.offsetSide,
          b.offsetHeight,
          fDirZ * along + fSideZ * b.offsetSide
        );
        b.bird.rotation.y = -flightRelRad;

        // Smooth fade-in from rear horizon (0.0 -> 0.18) and fade-out into forward horizon (0.82 -> 1.0)
        const rayEnv =
          smoothstep(0.0, 0.18, b.progress) *
          smoothstep(0.0, 0.18, 1.0 - b.progress);
        const birdAlpha = this.birdFlockAlpha * rayEnv;
        b.mat.opacity = birdAlpha;
        b.bird.scale.setScalar(0.76 + 0.24 * rayEnv);
        b.bird.visible = birdAlpha > 0.004;

        const flap = Math.sin(elapsedSec * 9.5 + b.phase) * 0.52;
        b.leftWing.rotation.z = -flap;
        b.rightWing.rotation.z = flap;
      }
    } else {
      this.birdFlockGroup.visible = false;
    }

    // -----------------------------------------------------------------------
    // 4. Midday Leaping Bonito Fish School (smooth proximity & twilight fade)
    // -----------------------------------------------------------------------
    const fs = oceanSim.fishSchool;
    let targetFishAlpha = 0.0;
    if (fs && !fs.harvested && sun.altDeg > 3.0) {
      const fdx = fs.x - oceanSim.pos.x;
      const fdy = fs.y - oceanSim.pos.y;
      const fDistUnits = Math.hypot(fdx, fdy);
      if (fDistUnits < 2.4) {
        targetFishAlpha =
          smoothstep(2.4, 1.65, fDistUnits) * smoothstep(3.0, 8.0, sun.altDeg);
        const fBrg = posMod((Math.atan2(fdx, fdy) * 180.0) / Math.PI, 360.0);
        const fRel = degToRad(wrapDeg180(fBrg - headingDeg));
        const mDist = Math.max(8.0, fDistUnits * 48.0);
        this.fishGroup.position.set(
          Math.sin(fRel) * mDist,
          0.0,
          -Math.cos(fRel) * mDist
        );
      }
    }

    this.fishAlpha = easeToward(this.fishAlpha, targetFishAlpha, fadeDt, 2.0);
    if (this.fishAlpha > 0.004) {
      this.fishGroup.visible = true;
      this.fishMat.opacity = this.fishAlpha;
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

    // -----------------------------------------------------------------------
    // 5. Drifting Green Palm Fronds & Kelp (smooth Ring 3 & drift-loop fade)
    // -----------------------------------------------------------------------
    const nearestIsl = oceanSim.detections[0];
    const targetFrondAlpha = nearestIsl
      ? smoothstep(r3 * 1.08, r3 * 0.82, nearestIsl.distanceUnits)
      : 0.0;
    this.frondAlpha = easeToward(this.frondAlpha, targetFrondAlpha, fadeDt, 1.5);

    if (this.frondAlpha > 0.004) {
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
        const driftEnv =
          smoothstep(0.0, 0.16, fr.progress) *
          smoothstep(0.0, 0.16, 1.0 - fr.progress);
        fr.mat.opacity = this.frondAlpha * driftEnv;
        fr.mesh.visible = fr.mat.opacity > 0.004;
      }
    } else {
      this.frondGroup.visible = false;
    }
  }
}
