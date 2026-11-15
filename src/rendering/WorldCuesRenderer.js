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
import {
  applyDetailedIslandAlpha,
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  getIslandShoreRadiusM,
  hasDetailedIslandModel,
} from './IslandTerrainBuilder.js';

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
    this.detailedIslandPool = {};

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
        statue.position.set(m * 6.5, 9.0, 31.5);
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
        landfallStartVisualDist: null,
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

  _createHydrofoilFinGeometry(stations) {
    // stations ordered with strictly increasing Y from bottom/root (0) to top/tip (n-1)
    const positions = [];
    const indices = [];
    const pushV = (x, y, z) => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      return idx;
    };

    const rings = [];
    for (let i = 0; i < stations.length; i += 1) {
      const { leadX, leadY, trailX, trailY, halfZ } = stations[i];
      const hz = Math.max(0.0008, halfZ);
      const sx1 = 0.72 * leadX + 0.28 * trailX;
      const sy1 = 0.72 * leadY + 0.28 * trailY;
      const sx2 = 0.28 * leadX + 0.72 * trailX;
      const sy2 = 0.28 * leadY + 0.72 * trailY;

      rings.push([
        pushV(leadX, leadY, 0.0),
        pushV(sx1, sy1, hz),
        pushV(sx2, sy2, hz * 0.42),
        pushV(trailX, trailY, 0.0),
        pushV(sx2, sy2, -hz * 0.42),
        pushV(sx1, sy1, -hz),
      ]);
    }

    for (let i = 0; i < rings.length - 1; i += 1) {
      for (let k = 0; k < 6; k += 1) {
        const kNext = (k + 1) % 6;
        const a = rings[i][k];
        const b = rings[i][kNext];
        const c = rings[i + 1][k];
        const d = rings[i + 1][kNext];
        indices.push(a, c, d, a, d, b);
      }
    }

    // Close bottom & top fin caps
    const bot = rings[0];
    const top = rings[rings.length - 1];
    indices.push(
      bot[0], bot[1], bot[5],
      bot[5], bot[1], bot[2],
      bot[5], bot[2], bot[4],
      bot[4], bot[2], bot[3],
      top[0], top[5], top[1],
      top[5], top[2], top[1],
      top[5], top[4], top[2],
      top[4], top[3], top[2]
    );

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  _createBonitoBodyGeometry() {
    // Fusiform Pacific Bonito / Skipjack Tuna (Atu / Aku) body along X:
    // Nose at +0.485m (+X), dorsal back +Y, caudal peduncle wrist at -0.385m (-X)
    const uSteps = 32;
    const rSteps = 24;
    const positions = [];
    const colors = [];
    const indices = [];

    const pushVC = (x, y, z, r, g, b) => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      colors.push(r, g, b);
      return idx;
    };

    const evalProfile = (u) => {
      const x = 0.48 - 0.86 * u;
      let halfH;
      if (u <= 0.34) {
        const s = u / 0.34;
        halfH = 0.126 * Math.pow(Math.sin(s * Math.PI * 0.5), 0.78);
      } else {
        const t = (u - 0.34) / 0.66;
        halfH = 0.017 + 0.109 * Math.pow(Math.cos(t * Math.PI * 0.5), 1.48);
      }
      const dorsalY = halfH * (1.0 + 0.06 * Math.sin(Math.PI * Math.min(1.0, u / 0.56)));
      const ventralY = halfH * (1.0 + 0.09 * Math.sin(Math.PI * Math.min(1.0, u / 0.68)));
      const operculumFlare = 1.0 + 0.055 * Math.exp(-Math.pow((u - 0.225) / 0.028, 2.0));
      const keelFlare = 0.022 * Math.exp(-Math.pow((u - 0.925) / 0.045, 2.0));
      return { x, halfH, dorsalY, ventralY, operculumFlare, keelFlare };
    };

    const evalCountershading = (u, ny) => {
      // Authentic pelagic countershading: deep indigo-blue back, iridescent teal lateral band,
      // gleaming pearl-silver belly with dark longitudinal skipjack/bonito stripes
      let r;
      let g;
      let b;
      if (ny > 0.24) {
        const t = Math.min(1.0, (ny - 0.24) / 0.76);
        r = 0.22 * (1.0 - t) + 0.055 * t;
        g = 0.56 * (1.0 - t) + 0.16 * t;
        b = 0.78 * (1.0 - t) + 0.36 * t;
        // Wavy dark mackerel/bonito dorsal bars along aft back
        if (u > 0.35 && u < 0.86 && ny > 0.36) {
          const bar = Math.sin(u * 56.0 - ny * 6.2);
          if (bar > 0.18) {
            const shade = 1.0 - 0.32 * Math.min(1.0, (bar - 0.18) / 0.6);
            r *= shade;
            g *= shade;
            b *= shade;
          }
        }
      } else if (ny >= -0.06) {
        // Iridescent cyan-silver lateral line
        const t = (ny + 0.06) / 0.3;
        r = 0.88 * (1.0 - t) + 0.24 * t;
        g = 0.94 * (1.0 - t) + 0.62 * t;
        b = 0.98 * (1.0 - t) + 0.82 * t;
      } else {
        // Mirror-silver belly with 4 longitudinal skipjack stripes
        const bellyT = Math.min(1.0, (-ny - 0.06) / 0.94);
        r = 0.9 + 0.06 * bellyT;
        g = 0.95 + 0.03 * bellyT;
        b = 0.99;
        if (u > 0.27 && u < 0.89 && ny > -0.82 && ny < -0.13) {
          const envU = Math.sin(Math.PI * ((u - 0.27) / 0.62));
          const stripe = Math.sin(ny * 28.0 + u * 2.4);
          if (stripe > 0.32) {
            const sAmt = Math.min(1.0, (stripe - 0.32) / 0.5) * envU * 0.68;
            r = r * (1.0 - sAmt) + 0.14 * sAmt;
            g = g * (1.0 - sAmt) + 0.21 * sAmt;
            b = b * (1.0 - sAmt) + 0.33 * sAmt;
          }
        }
      }

      // Subtle curved operculum (gill-plate) shadow seam
      const gillCurveU = 0.225 + 0.024 * (1.0 - ny * ny);
      const gillDist = Math.abs(u - gillCurveU);
      if (gillDist < 0.012 && Math.abs(ny) < 0.66) {
        const gShade = 1.0 - 0.28 * (1.0 - gillDist / 0.012);
        r *= gShade;
        g *= gShade;
        b *= gShade;
      }

      return [r, g, b];
    };

    const rings = [];
    for (let i = 0; i <= uSteps; i += 1) {
      const u = 0.014 + 0.972 * (i / uSteps);
      const { x, halfH, dorsalY, ventralY, operculumFlare, keelFlare } = evalProfile(u);
      const ring = [];
      for (let j = 0; j < rSteps; j += 1) {
        const theta = (j / rSteps) * Math.PI * 2.0;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        let y = cosT >= 0.0 ? dorsalY * cosT : ventralY * cosT;
        const keelFactor = Math.pow(Math.max(0.0, 1.0 - Math.abs(cosT) * 3.4), 2.0);
        let z = sinT * (halfH * 0.68 * operculumFlare + keelFlare * keelFactor);

        // Subtle mouth cleft groove near snout
        if (u < 0.095 && Math.abs(cosT + 0.14) < 0.16) {
          const mIndent = 1.0 - 0.14 * (1.0 - u / 0.095);
          z *= mIndent;
          y -= 0.002 * (1.0 - u / 0.095);
        }

        const ny = Math.max(-1.0, Math.min(1.0, y / Math.max(0.016, halfH)));
        const [cr, cg, cb] = evalCountershading(u, ny);
        ring.push(pushVC(x, y, z, cr, cg, cb));
      }
      rings.push(ring);
    }

    for (let i = 0; i < rings.length - 1; i += 1) {
      for (let j = 0; j < rSteps; j += 1) {
        const jNext = (j + 1) % rSteps;
        const a = rings[i][j];
        const b = rings[i][jNext];
        const c = rings[i + 1][j];
        const d = rings[i + 1][jNext];
        indices.push(a, c, d, a, d, b);
      }
    }

    // Closed manifold snout tip (+X) & caudal peduncle tip (-X)
    const snoutIdx = pushVC(0.486, -0.004, 0.0, 0.16, 0.34, 0.56);
    const tailIdx = pushVC(-0.386, 0.0, 0.0, 0.18, 0.36, 0.54);
    const last = rings.length - 1;
    for (let j = 0; j < rSteps; j += 1) {
      const jNext = (j + 1) % rSteps;
      indices.push(snoutIdx, rings[0][j], rings[0][jNext]);
      indices.push(tailIdx, rings[last][jNext], rings[last][j]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  _ensureBonitoAssets() {
    if (this._bonitoGeos) return;

    const bodyGeo = this._createBonitoBodyGeometry();

    // 1. Spiny First Dorsal Fin (sickle hydrofoil rising from +Y back)
    const dorsal1Geo = this._createHydrofoilFinGeometry([
      { leadX: 0.175, leadY: 0.105, trailX: -0.075, trailY: 0.095, halfZ: 0.008 },
      { leadX: 0.125, leadY: 0.165, trailX: -0.045, trailY: 0.135, halfZ: 0.005 },
      { leadX: 0.065, leadY: 0.218, trailX: 0.005, trailY: 0.185, halfZ: 0.003 },
      { leadX: 0.015, leadY: 0.248, trailX: -0.008, trailY: 0.242, halfZ: 0.0012 },
    ]);

    // 2. Second Dorsal Fin
    const dorsal2Geo = this._createHydrofoilFinGeometry([
      { leadX: -0.105, leadY: 0.082, trailX: -0.205, trailY: 0.064, halfZ: 0.006 },
      { leadX: -0.145, leadY: 0.138, trailX: -0.195, trailY: 0.112, halfZ: 0.0035 },
      { leadX: -0.178, leadY: 0.172, trailX: -0.194, trailY: 0.166, halfZ: 0.0012 },
    ]);

    // 3. Ventral Anal Fin (ordered from bottom tip -Y up to body root so Y increases)
    const analGeo = this._createHydrofoilFinGeometry([
      { leadX: -0.192, leadY: -0.166, trailX: -0.208, trailY: -0.16, halfZ: 0.0012 },
      { leadX: -0.158, leadY: -0.132, trailX: -0.208, trailY: -0.108, halfZ: 0.0035 },
      { leadX: -0.12, leadY: -0.08, trailX: -0.218, trailY: -0.06, halfZ: 0.006 },
    ]);

    // 4. Swept Wing-like Pectoral Blade (built upright along +Y, then rotated onto port/starboard flanks)
    const pectoralGeo = this._createHydrofoilFinGeometry([
      { leadX: 0.035, leadY: 0.0, trailX: -0.025, trailY: 0.0, halfZ: 0.005 },
      { leadX: 0.005, leadY: 0.085, trailX: -0.048, trailY: 0.072, halfZ: 0.0035 },
      { leadX: -0.045, leadY: 0.168, trailX: -0.078, trailY: 0.152, halfZ: 0.002 },
      { leadX: -0.095, leadY: 0.215, trailX: -0.11, trailY: 0.208, halfZ: 0.001 },
    ]);

    // 5. Ventral Pelvic Stabilizer Fin
    const pelvicGeo = this._createHydrofoilFinGeometry([
      { leadX: 0.102, leadY: -0.162, trailX: 0.088, trailY: -0.156, halfZ: 0.001 },
      { leadX: 0.138, leadY: -0.132, trailX: 0.105, trailY: -0.122, halfZ: 0.0028 },
      { leadX: 0.165, leadY: -0.102, trailX: 0.118, trailY: -0.098, halfZ: 0.0045 },
    ]);

    // 6. Signature Tuna/Bonito Dorsal & Ventral Finlet
    const finletGeo = this._createHydrofoilFinGeometry([
      { leadX: 0.012, leadY: 0.0, trailX: -0.014, trailY: 0.0, halfZ: 0.0025 },
      { leadX: -0.008, leadY: 0.024, trailX: -0.018, trailY: 0.02, halfZ: 0.001 },
    ]);

    // 7. Deeply Forked Lunate Crescent Caudal Tail Fin (local origin at peduncle wrist x = 0)
    const caudalGeo = this._createHydrofoilFinGeometry([
      { leadX: -0.168, leadY: -0.222, trailX: -0.184, trailY: -0.214, halfZ: 0.0012 },
      { leadX: -0.108, leadY: -0.145, trailX: -0.146, trailY: -0.128, halfZ: 0.0032 },
      { leadX: -0.042, leadY: -0.068, trailX: -0.092, trailY: -0.052, halfZ: 0.0055 },
      { leadX: 0.012, leadY: 0.0, trailX: -0.052, trailY: 0.0, halfZ: 0.0075 },
      { leadX: -0.042, leadY: 0.068, trailX: -0.092, trailY: 0.052, halfZ: 0.0055 },
      { leadX: -0.108, leadY: 0.145, trailX: -0.146, trailY: 0.128, halfZ: 0.0032 },
      { leadX: -0.168, leadY: 0.222, trailX: -0.184, trailY: 0.214, halfZ: 0.0012 },
    ]);

    const eyeIrisGeo = new THREE.SphereGeometry(0.02, 10, 10);
    const eyePupilGeo = new THREE.SphereGeometry(0.0125, 8, 8);

    this._bonitoGeos = {
      bodyGeo,
      dorsal1Geo,
      dorsal2Geo,
      analGeo,
      pectoralGeo,
      pelvicGeo,
      finletGeo,
      caudalGeo,
      eyeIrisGeo,
      eyePupilGeo,
    };

    this.fishBodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.52,
      roughness: 0.22,
      transparent: true,
      opacity: 1.0,
    });
    this.fishFinMat = new THREE.MeshStandardMaterial({
      color: 0x2c4d6e,
      metalness: 0.38,
      roughness: 0.32,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
    });
    this.fishFinletMat = new THREE.MeshStandardMaterial({
      color: 0xc8b44a,
      metalness: 0.42,
      roughness: 0.3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
    });
    this.fishEyeIrisMat = new THREE.MeshStandardMaterial({
      color: 0xdce6b8,
      metalness: 0.6,
      roughness: 0.18,
      transparent: true,
      opacity: 1.0,
    });
    this.fishEyePupilMat = new THREE.MeshStandardMaterial({
      color: 0x070b10,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: 1.0,
    });

    this.fishMaterials = [
      this.fishBodyMat,
      this.fishFinMat,
      this.fishFinletMat,
      this.fishEyeIrisMat,
      this.fishEyePupilMat,
    ];
    // Backwards-compatible alias
    this.fishMat = this.fishBodyMat;
  }

  /**
   * Builds an articulated 3D Pacific Bonito / Skipjack Tuna (Atu / Aku) group:
   * - Nose oriented along +X, dorsal up +Y, lateral flanks +-Z
   * - Exposes fishGroup.userData.tailPivot for live caudal tail-wag animation
   */
  createBonitoFish({ cloneMaterials = false } = {}) {
    this._ensureBonitoAssets();
    const g = this._bonitoGeos;

    const pickMat = (baseMat) => {
      if (!cloneMaterials) return baseMat;
      const m = baseMat.clone();
      m.transparent = false;
      m.opacity = 1.0;
      return m;
    };

    const bodyMat = pickMat(this.fishBodyMat);
    const finMat = pickMat(this.fishFinMat);
    const finletMat = pickMat(this.fishFinletMat);
    const irisMat = pickMat(this.fishEyeIrisMat);
    const pupilMat = pickMat(this.fishEyePupilMat);

    const fish = new THREE.Group();
    fish.rotation.order = 'YXZ';

    const body = new THREE.Mesh(g.bodyGeo, bodyMat);
    const dorsal1 = new THREE.Mesh(g.dorsal1Geo, finMat);
    const dorsal2 = new THREE.Mesh(g.dorsal2Geo, finMat);
    const anal = new THREE.Mesh(g.analGeo, finMat);
    fish.add(body, dorsal1, dorsal2, anal);

    // Paired pectoral & pelvic fins on port (-Z) & starboard (+Z) flanks
    for (const side of [-1, 1]) {
      const pect = new THREE.Mesh(g.pectoralGeo, finMat);
      pect.position.set(0.205, -0.02, side * 0.072);
      pect.rotation.order = 'XYZ';
      pect.rotation.set(side * 1.88, -side * 0.22, -0.34);
      fish.add(pect);

      const pelv = new THREE.Mesh(g.pelvicGeo, finMat);
      pelv.position.set(0.0, 0.0, side * 0.018);
      pelv.rotation.x = -side * 0.24;
      fish.add(pelv);

      // Glossy lateral eyes behind the snout
      const iris = new THREE.Mesh(g.eyeIrisGeo, irisMat);
      iris.position.set(0.352, 0.026, side * 0.044);
      iris.scale.set(1.05, 1.0, 0.38);
      const pupil = new THREE.Mesh(g.eyePupilGeo, pupilMat);
      pupil.position.set(0.355, 0.026, side * 0.0485);
      pupil.scale.set(1.05, 1.0, 0.42);
      fish.add(iris, pupil);
    }

    // Dorsal & ventral metallic yellow-gold tuna finlets along the caudal wrist
    const finletStations = [
      { x: -0.235, y: 0.052 },
      { x: -0.272, y: 0.04 },
      { x: -0.306, y: 0.03 },
      { x: -0.338, y: 0.022 },
    ];
    for (const fs of finletStations) {
      const topFl = new THREE.Mesh(g.finletGeo, finletMat);
      topFl.position.set(fs.x, fs.y, 0.0);
      const botFl = new THREE.Mesh(g.finletGeo, finletMat);
      botFl.position.set(fs.x, -fs.y, 0.0);
      botFl.rotation.x = Math.PI;
      fish.add(topFl, botFl);
    }

    // Articulated lunate caudal tail fin pivoting at the peduncle wrist
    const tailPivot = new THREE.Group();
    tailPivot.position.set(-0.368, 0.0, 0.0);
    const caudal = new THREE.Mesh(g.caudalGeo, finMat);
    tailPivot.add(caudal);
    fish.add(tailPivot);

    fish.userData.tailPivot = tailPivot;
    return fish;
  }

  _buildMiddayFishSchool() {
    this.fishGroup = new THREE.Group();
    this.fishGroup.visible = false;
    this.group.add(this.fishGroup);

    this._ensureBonitoAssets();
    this.leapingFish = [];
    for (let i = 0; i < 10; i += 1) {
      const mesh = this.createBonitoFish({ cloneMaterials: false });
      const scale = 0.88 + (i % 4) * 0.08;
      mesh.scale.setScalar(scale);
      this.fishGroup.add(mesh);
      this.leapingFish.push({
        mesh,
        tailPivot: mesh.userData.tailPivot,
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

  _getDetailedIslandAssembly(islandId) {
    if (!this.detailedIslandPool[islandId]) {
      const built = createDetailedIslandAssembly(islandId);
      built.group.rotation.y = getIslandApproachOrientationRad(islandId);
      this.detailedIslandPool[islandId] = built;
    }
    return this.detailedIslandPool[islandId];
  }

  _detachDetailedIslandFromSlot(slot) {
    if (slot.detailedAssembly) {
      slot.landGroup.remove(slot.detailedAssembly.group);
      slot.detailedAssembly = null;
    }
  }

  _resetVoyageTransitions() {
    for (const slot of this.islandSlots) {
      this._detachDetailedIslandFromSlot(slot);
      slot.islandId = null;
      slot.islandDef = null;
      slot.peakAlpha = 0.0;
      slot.lapaAlpha = 0.0;
      slot.landAlpha = 0.0;
      slot.riseFactor = 0.0;
      slot.landfallStartVisualDist = null;
      slot.root.visible = false;
    }
    this.birdFlockAlpha = 0.0;
    this.birdFlockGroup.visible = false;
    this.fishAlpha = 0.0;
    this.fishGroup.visible = false;
    this.frondAlpha = 0.0;
    this.frondGroup.visible = false;
  }

  update(dtSec, elapsedSec, oceanSim, landfallAnim = null, launchAnim = null) {
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

    const launchTradeMask = launchAnim?.active
      ? smoothstep(0.45, 0.95, launchAnim.rawT ?? 0.0)
      : 1.0;

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
      const opacity = this.tradeFogOpacity * horizonEnv * launchTradeMask;
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
          freeSlot.landfallStartVisualDist = null;
        }
      }
    }

    // Ensure arrived island is bound to a slot even if landfall was triggered directly
    if (landfallAnim?.active && landfallAnim.islandId) {
      const hasLandfallSlot = this.islandSlots.some(
        (s) => s.islandId === landfallAnim.islandId
      );
      if (!hasLandfallSlot) {
        const freeSlot =
          this.islandSlots.find((s) => s.islandId === null) || this.islandSlots[0];
        const arrivedDef =
          oceanSim.arrivedIsland || oceanSim.activeIslands?.[landfallAnim.islandId];
        if (freeSlot && arrivedDef) {
          this._detachDetailedIslandFromSlot(freeSlot);
          freeSlot.islandId = landfallAnim.islandId;
          freeSlot.islandDef = arrivedDef;
          freeSlot.landAlpha = 1.0;
          freeSlot.riseFactor = 1.0;
          freeSlot.lastDistUnits = r4;
          freeSlot.lastBearingDeg = landfallAnim.targetBearingDeg ?? headingDeg;
          freeSlot.landfallStartVisualDist = null;
        }
      }
    }

    // Ensure departure island is bound to a slot during bird's-eye launch & early astern recession
    const launchOriginId = launchAnim?.active
      ? launchAnim.islandId
      : oceanSim.elapsedRealSec < 60.0
        ? oceanSim.song?.fromIsland
        : null;
    if (launchOriginId && oceanSim.activeIslands?.[launchOriginId]) {
      const originDef = oceanSim.activeIslands[launchOriginId];
      const dxO = originDef.simPos.x - oceanSim.pos.x;
      const dyO = originDef.simPos.y - oceanSim.pos.y;
      const distO = Math.hypot(dxO, dyO);
      if (launchAnim?.active || distO <= r1) {
        const hasLaunchSlot = this.islandSlots.some(
          (s) => s.islandId === launchOriginId
        );
        if (!hasLaunchSlot) {
          const freeSlot = this.islandSlots.find((s) => s.islandId === null);
          if (freeSlot) {
            this._detachDetailedIslandFromSlot(freeSlot);
            freeSlot.islandId = launchOriginId;
            freeSlot.islandDef = originDef;
            freeSlot.peakAlpha = 0.0;
            freeSlot.lapaAlpha = 0.0;
            freeSlot.landAlpha = launchAnim?.active ? 1.0 : 0.0;
            freeSlot.riseFactor = launchAnim?.active ? 1.0 : 0.0;
            freeSlot.lastDistUnits = distO;
            freeSlot.lastBearingDeg =
              distO > 0.025
                ? posMod((Math.atan2(dxO, dyO) * 180.0) / Math.PI, 360.0)
                : launchAnim?.sternBearingDeg ?? posMod(headingDeg + 180.0, 360.0);
            freeSlot.landfallStartVisualDist = null;
          }
        }
      }
    }

    for (const slot of this.islandSlots) {
      if (!slot.islandId) {
        slot.root.visible = false;
        continue;
      }

      const isLandfallTarget = Boolean(
        landfallAnim?.active && slot.islandId === landfallAnim.islandId
      );
      const isLaunchOrigin = Boolean(
        launchAnim?.active && slot.islandId === launchAnim.islandId
      );
      if (!isLandfallTarget) {
        slot.landfallStartVisualDist = null;
      }

      const det = detById.get(slot.islandId) || null;
      const activeIsl = oceanSim.activeIslands?.[slot.islandId] || slot.islandDef;
      const isl = det ? det.island : activeIsl;

      // Keep tracking true world bearing & distance even after leaving Ring 1 while fading out
      let distUnits = slot.lastDistUnits;
      let bearingDeg = slot.lastBearingDeg;
      if (isLaunchOrigin) {
        distUnits = 0.0;
        bearingDeg =
          launchAnim.sternBearingDeg ?? posMod(headingDeg + 180.0, 360.0);
      } else if (det) {
        distUnits = det.distanceUnits;
        bearingDeg = det.bearingDeg;
      } else if (activeIsl?.simPos && oceanSim.pos) {
        const dx = activeIsl.simPos.x - oceanSim.pos.x;
        const dy = activeIsl.simPos.y - oceanSim.pos.y;
        distUnits = Math.hypot(dx, dy);
        if (distUnits > 0.025) {
          bearingDeg = posMod((Math.atan2(dx, dy) * 180.0) / Math.PI, 360.0);
        }
      }
      slot.lastDistUnits = distUnits;
      slot.lastBearingDeg = bearingDeg;

      const isDepartedOrigin =
        slot.islandId === oceanSim.song?.fromIsland &&
        oceanSim.elapsedRealSec < 60.0 &&
        distUnits <= r1;
      const effectiveInRange = Boolean(det || isDepartedOrigin || isLaunchOrigin);

      // Target alphas ramp smoothly across ring boundaries rather than binary step cliffs
      const cloudDistEnv =
        effectiveInRange && isl?.hasPeakCloud
          ? smoothstep(r2 * 1.12, r2 * 0.78, distUnits)
          : 0.0;
      const targetPeakAlpha =
        !isFog || Boolean(isl?.peaksPierceFog) || isLandfallTarget || isLaunchOrigin
          ? cloudDistEnv
          : 0.0;

      const lapaDistEnv =
        effectiveInRange && isl?.hasLapaGlow && (!isFog || isLandfallTarget || isLaunchOrigin)
          ? smoothstep(r2 * 1.12, r2 * 0.78, distUnits)
          : 0.0;

      const landEntryDist = isl?.peaksPierceFog ? r2 * 1.04 : r3 * 1.1;
      const landFullAlphaDist = Math.max(r4, landEntryDist * 0.68);
      const targetLandAlpha =
        isLandfallTarget || isLaunchOrigin
          ? 1.0
          : effectiveInRange
            ? smoothstep(landEntryDist, landFullAlphaDist, distUnits)
            : 0.0;
      const targetRise =
        isLandfallTarget || isLaunchOrigin
          ? 1.0
          : effectiveInRange
            ? smoothstep(landEntryDist, r4 * 1.12, distUnits)
            : 0.0;

      if (isLaunchOrigin) {
        const launchCloudMask = smoothstep(0.58, 1.0, launchAnim.rawT ?? 0.0);
        slot.peakAlpha = targetPeakAlpha * launchCloudMask;
        slot.lapaAlpha = lapaDistEnv * launchCloudMask;
        slot.landAlpha = 1.0;
        slot.riseFactor = 1.0;
      } else {
        slot.peakAlpha = easeToward(slot.peakAlpha, targetPeakAlpha, fadeDt, 1.35);
        slot.lapaAlpha = easeToward(slot.lapaAlpha, lapaDistEnv, fadeDt, 1.35);
        if (isLandfallTarget) {
          const animFloor = smoothstep(0.0, 0.45, landfallAnim.rawT ?? 0.0);
          slot.landAlpha = Math.max(
            easeToward(slot.landAlpha, 1.0, fadeDt, 4.5),
            animFloor
          );
          slot.riseFactor = Math.max(
            easeToward(slot.riseFactor, 1.0, fadeDt, 4.5),
            animFloor
          );
        } else {
          slot.landAlpha = easeToward(slot.landAlpha, targetLandAlpha, fadeDt, 1.45);
          slot.riseFactor = easeToward(slot.riseFactor, targetRise, fadeDt, 1.45);
        }
      }

      const anyVisible =
        isLandfallTarget ||
        isLaunchOrigin ||
        slot.peakAlpha > 0.003 ||
        slot.lapaAlpha > 0.003 ||
        slot.landAlpha > 0.003;

      if (!anyVisible && !effectiveInRange) {
        this._detachDetailedIslandFromSlot(slot);
        slot.islandId = null;
        slot.islandDef = null;
        slot.landfallStartVisualDist = null;
        slot.root.visible = false;
        continue;
      }

      if (!anyVisible) {
        slot.root.visible = false;
        continue;
      }

      const relAzRad = degToRad(wrapDeg180(bearingDeg - headingDeg));
      const normDist = Math.min(1.0, Math.max(0.0, distUnits / r1));
      const baseVisualDist = 92.0 + normDist * 460.0;
      let visualDist = baseVisualDist;

      if (isLandfallTarget) {
        if (slot.landfallStartVisualDist === null) {
          slot.landfallStartVisualDist = baseVisualDist;
        }
        const shoreRadiusM = getIslandShoreRadiusM(isl?.id, isl?.archetype);
        const endVisualDist =
          (landfallAnim.bowStopZAbs ?? 30.63) +
          shoreRadiusM +
          (landfallAnim.shoreGapM ?? 3.2);
        const glide = Math.max(0.0, Math.min(1.0, landfallAnim.glide ?? 0.0));
        visualDist =
          slot.landfallStartVisualDist +
          (endVisualDist - slot.landfallStartVisualDist) * glide;
      } else if (isLaunchOrigin) {
        const shoreRadiusM = getIslandShoreRadiusM(isl?.id, isl?.archetype);
        const startVisualDist =
          (launchAnim.canoeStartZ ?? 24.0) +
          7.75 +
          (launchAnim.shoreGapM ?? 3.25) +
          shoreRadiusM;
        const glide = Math.max(0.0, Math.min(1.0, launchAnim.glide ?? 0.0));
        visualDist = startVisualDist + (baseVisualDist - startVisualDist) * glide;
      }

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
        if (hasDetailedIslandModel(isl.id)) {
          slot.mainPeak.visible = false;
          slot.secondPeak.visible = false;
          slot.atollRing.visible = false;
          slot.lagoonDisc.visible = false;
          slot.moaiGroup.visible = false;

          const detailed = this._getDetailedIslandAssembly(isl.id);
          if (slot.detailedAssembly !== detailed) {
            this._detachDetailedIslandFromSlot(slot);
            slot.detailedAssembly = detailed;
            slot.landGroup.add(detailed.group);
          }
          applyDetailedIslandAlpha(detailed, slot.landAlpha);
          slot.landGroup.position.y = -detailed.sinkDepthM * (1.0 - slot.riseFactor);
        } else {
          this._detachDetailedIslandFromSlot(slot);
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
      const useTransparent = this.fishAlpha < 0.995;
      for (const fm of this.fishMaterials) {
        fm.opacity = this.fishAlpha;
        if (fm.transparent !== useTransparent) {
          fm.transparent = useTransparent;
          fm.needsUpdate = true;
        }
      }
      for (const lf of this.leapingFish) {
        const t = (elapsedSec * 2.4 + lf.phase) % (Math.PI * 2.0);
        const sinT = Math.sin(t);
        const arcY = Math.max(-0.42, sinT * 1.85);
        const swimAngle = lf.angle + elapsedSec * 0.62;
        lf.mesh.position.set(
          Math.cos(swimAngle) * lf.radius,
          arcY,
          Math.sin(swimAngle) * lf.radius
        );
        lf.mesh.rotation.y = -swimAngle - Math.PI * 0.5;
        lf.mesh.rotation.z = sinT > -0.22 ? Math.cos(t) * 0.68 : 0.0;
        lf.mesh.rotation.x = -0.16;
        if (lf.tailPivot) {
          lf.tailPivot.rotation.y =
            Math.sin(elapsedSec * 16.0 + lf.phase * 3.1) * 0.28;
        }
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
