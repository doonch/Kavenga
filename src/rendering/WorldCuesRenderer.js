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
    this._activeBirdIsBooby = false;
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

  /**
   * Lofts a crisp-edged, cambered 3D feathered airfoil or tail fan with separate
   * upper (+Y) and lower (-Y) vertex strips for sharp trailing edges & independent
   * upperwing vs underwing coloration. Requires stations ordered with strictly increasing x.
   */
  _createSheetFoilGeometry(stations, colorFn) {
    const positions = [];
    const colors = [];
    const indices = [];

    const pushVC = (x, y, z, rgb) => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
      return idx;
    };

    const chordFracs = [0.0, 0.26, 0.65, 1.0];
    const upperRows = [];
    const lowerRows = [];

    for (let i = 0; i < stations.length; i += 1) {
      const st = stations[i];
      const chord = st.zTrail - st.zLead;
      const uRow = [];
      const lRow = [];

      for (let k = 0; k < 4; k += 1) {
        const cf = chordFracs[k];
        const z = st.zLead + cf * chord;
        let yUp = st.yBase;
        let yLo = st.yBase;
        if (k === 1) {
          yUp = st.yBase + st.camber + st.thick;
          yLo = st.yBase + 0.32 * st.camber - 0.55 * st.thick;
        } else if (k === 2) {
          yUp = st.yBase + 0.54 * st.camber + 0.46 * st.thick;
          yLo = st.yBase + 0.18 * st.camber - 0.26 * st.thick;
        }

        uRow.push(
          pushVC(
            st.x,
            yUp,
            z,
            colorFn({ isUpper: true, spanFrac: st.spanFrac, chordFrac: cf, x: st.x })
          )
        );
        lRow.push(
          pushVC(
            st.x,
            yLo,
            z,
            colorFn({ isUpper: false, spanFrac: st.spanFrac, chordFrac: cf, x: st.x })
          )
        );
      }
      upperRows.push(uRow);
      lowerRows.push(lRow);
    }

    for (let i = 0; i < stations.length - 1; i += 1) {
      for (let k = 0; k < 3; k += 1) {
        // Upper surface (+Y outward normal as x increases with i and z increases with k)
        const ua = upperRows[i][k];
        const ub = upperRows[i][k + 1];
        const uc = upperRows[i + 1][k];
        const ud = upperRows[i + 1][k + 1];
        indices.push(ua, ub, ud, ua, ud, uc);

        // Lower surface (-Y outward normal)
        const la = lowerRows[i][k];
        const lb = lowerRows[i][k + 1];
        const lc = lowerRows[i + 1][k];
        const ld = lowerRows[i + 1][k + 1];
        indices.push(la, lc, ld, la, ld, lb);
      }
    }

    // Close left (-X, i = 0) & right (+X, i = last) airfoil root/tip caps
    const u0 = upperRows[0];
    const l0 = lowerRows[0];
    indices.push(
      u0[0], l0[1], u0[1],
      u0[1], l0[1], u0[2],
      u0[2], l0[1], l0[2],
      u0[2], l0[2], u0[3]
    );

    const last = stations.length - 1;
    const uL = upperRows[last];
    const lL = lowerRows[last];
    indices.push(
      uL[0], uL[1], lL[1],
      uL[1], uL[2], lL[1],
      uL[2], lL[2], lL[1],
      uL[2], uL[3], lL[2]
    );

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Lofts a manifold 3D seabird beak, head, neck, breast, and rump along Z
   * (beak pointing dead ahead along -Z, tail root along +Z, dorsal up +Y).
   */
  _createBirdBodyGeometry(species) {
    const isBooby = species === 'brown_booby';
    const uSteps = 36;
    const rSteps = 22;
    const positions = [];
    const colors = [];
    const indices = [];

    const pushVC = (x, y, z, r, g, b) => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      colors.push(r, g, b);
      return idx;
    };

    const evalStation = (u) => {
      if (!isBooby) {
        // WHITE TERN (Manu-o-Ku / Gygis alba): delicate dove-like head, slender needle bill, short neck, buoyant breast
        const z = -0.365 + 0.65 * u;
        let halfH;
        let halfW;
        let centerY;
        if (u <= 0.17) {
          const t = u / 0.17;
          halfH = 0.0025 + 0.0175 * Math.pow(t, 0.82);
          halfW = 0.002 + 0.0145 * Math.pow(t, 0.85);
          centerY = 0.03 + 0.003 * t;
        } else if (u <= 0.34) {
          const t = (u - 0.17) / 0.17;
          const crown = Math.sin(t * Math.PI);
          halfH = 0.02 + 0.03 * Math.pow(crown, 0.58) + 0.021 * t;
          halfW = 0.0165 + 0.029 * Math.pow(crown, 0.58) + 0.022 * t;
          centerY = 0.033 + 0.013 * crown - 0.011 * t;
        } else if (u <= 0.45) {
          const t = (u - 0.34) / 0.11;
          halfH = 0.041 + 0.021 * t;
          halfW = 0.0385 + 0.0215 * t;
          centerY = 0.022 - 0.019 * t;
        } else if (u <= 0.82) {
          const t = (u - 0.45) / 0.37;
          const arch = Math.sin(t * Math.PI);
          halfH = 0.062 + 0.012 * arch - 0.032 * t * t;
          halfW = 0.06 + 0.01 * arch - 0.028 * t * t;
          centerY = 0.003 - 0.009 * Math.sin(t * Math.PI * 0.85) + 0.007 * t;
        } else {
          const t = (u - 0.82) / 0.18;
          halfH = 0.03 * (1.0 - 0.52 * t);
          halfW = 0.032 * (1.0 - 0.34 * t);
          centerY = 0.01 + 0.003 * t;
        }
        return { z, halfH, halfW, centerY };
      }

      // BROWN BOOBY (Kena / Sula leucogaster): heavy conical spear bill, wedge head, long outstretched neck, torpedo cigar torso
      const z = -0.565 + 0.96 * u;
      let halfH;
      let halfW;
      let centerY;
      if (u <= 0.18) {
        const t = u / 0.18;
        halfH = 0.003 + 0.031 * Math.pow(t, 0.88);
        halfW = 0.0028 + 0.026 * Math.pow(t, 0.88);
        centerY = 0.014 + 0.005 * t;
      } else if (u <= 0.3) {
        const t = (u - 0.18) / 0.12;
        const swell = Math.sin(t * Math.PI);
        halfH = 0.034 + 0.015 * swell + 0.008 * t;
        halfW = 0.0288 + 0.015 * swell + 0.009 * t;
        centerY = 0.019 + 0.004 * swell;
      } else if (u <= 0.48) {
        const t = (u - 0.3) / 0.18;
        halfH = 0.042 + 0.026 * Math.pow(t, 1.32);
        halfW = 0.0378 + 0.028 * Math.pow(t, 1.32);
        centerY = 0.019 - 0.014 * t;
      } else if (u <= 0.82) {
        const t = (u - 0.48) / 0.34;
        const arch = Math.sin(t * Math.PI);
        halfH = 0.068 + 0.018 * arch - 0.036 * t * t;
        halfW = 0.0658 + 0.016 * arch - 0.032 * t * t;
        centerY = 0.005 - 0.009 * arch + 0.005 * t;
      } else {
        const t = (u - 0.82) / 0.18;
        halfH = 0.032 * (1.0 - 0.52 * t);
        halfW = 0.0338 * (1.0 - 0.42 * t);
        centerY = 0.01 + 0.002 * t;
      }
      return { z, halfH, halfW, centerY };
    };

    const evalBodyColor = (u, ny, nx, z) => {
      if (!isBooby) {
        // White Tern: black-tipped royal-cobalt-blue bill + luminous snow-white plumage + dark eye-ring halo
        if (u <= 0.172) {
          const bt = Math.max(0.0, Math.min(1.0, (u - 0.05) / 0.122));
          return [
            0.05 + 0.08 * bt,
            0.06 + 0.2 * bt,
            0.11 + 0.46 * bt,
          ];
        }
        // Subtle dark eye-ring feathering around (z ~ -0.22, ny ~ +0.25, |nx| > 0.65)
        const dzEye = (z - -0.222) / 0.022;
        const dyEye = (ny - 0.22) / 0.34;
        if (Math.abs(nx) > 0.64 && dzEye * dzEye + dyEye * dyEye < 1.0) {
          return [0.14, 0.16, 0.2];
        }
        const shade = 0.92 + 0.075 * (0.5 + 0.5 * ny);
        return [shade * 0.985, shade * 0.992, Math.min(1.0, shade * 1.01)];
      }

      // Brown Booby: sulfur-yellow conical spear bill, slate-blue facial gular mask,
      // dark chocolate-sepia head/neck/back/hood, and razor-sharp snow-white belly!
      if (u <= 0.162) {
        const bt = u / 0.162;
        return [0.91 - 0.05 * bt, 0.82 - 0.06 * bt, 0.45 - 0.04 * bt];
      }
      if (u <= 0.192) {
        // Bare bluish-slate facial skin ring at base of bill
        return [0.29, 0.4, 0.51];
      }

      // Tuxedo breast demarcation: crisp horizontal cut-off across mid-breast onto snow-white belly
      const cutU = 0.555 + 0.055 * (ny + 1.0);
      const bellyMask =
        smoothstep(cutU - 0.018, cutU + 0.018, u) *
        smoothstep(-0.04, -0.28, ny);

      const dorsalWarmth = 0.5 + 0.5 * ny;
      const chocR = 0.22 + 0.075 * dorsalWarmth;
      const chocG = 0.135 + 0.052 * dorsalWarmth;
      const chocB = 0.085 + 0.036 * dorsalWarmth;

      const whiteR = 0.94;
      const whiteG = 0.955;
      const whiteB = 0.97;

      return [
        chocR * (1.0 - bellyMask) + whiteR * bellyMask,
        chocG * (1.0 - bellyMask) + whiteG * bellyMask,
        chocB * (1.0 - bellyMask) + whiteB * bellyMask,
      ];
    };

    const rings = [];
    for (let i = 0; i <= uSteps; i += 1) {
      const u = 0.01 + 0.98 * (i / uSteps);
      const { z, halfH, halfW, centerY } = evalStation(u);
      const ring = [];
      for (let j = 0; j < rSteps; j += 1) {
        const theta = (j / rSteps) * Math.PI * 2.0;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        // Flatten underside slightly on torso for natural keel/belly contour
        const vScale = cosT < 0.0 && u > 0.42 ? 0.92 : 1.0;
        const x = halfW * sinT;
        const y = centerY + halfH * cosT * vScale;
        const [cr, cg, cb] = evalBodyColor(u, cosT, sinT, z);
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

    // Closed manifold beak tip (-Z) & rump tip (+Z)
    const frontTip = isBooby
      ? pushVC(0.0, 0.013, -0.572, 0.92, 0.83, 0.46)
      : pushVC(0.0, 0.03, -0.372, 0.05, 0.06, 0.1);
    const backTip = isBooby
      ? pushVC(0.0, 0.012, 0.402, 0.25, 0.16, 0.1)
      : pushVC(0.0, 0.013, 0.292, 0.95, 0.97, 0.99);

    const last = rings.length - 1;
    for (let j = 0; j < rSteps; j += 1) {
      const jNext = (j + 1) % rSteps;
      indices.push(frontTip, rings[0][j], rings[0][jNext]);
      indices.push(backTip, rings[last][jNext], rings[last][j]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  _ensureSeabirdAssets() {
    if (this._seabirdGeos) return;

    const mirrorWingStations = (rightStations) =>
      rightStations
        .slice()
        .reverse()
        .map((s) => ({ ...s, x: -s.x }));

    // -----------------------------------------------------------------------
    // 1. WHITE TERN (Manu-o-Ku) Geometries: delicate arched wings & forked swallow tail
    // -----------------------------------------------------------------------
    const ternWingColor = ({ isUpper, spanFrac, chordFrac }) => {
      // Luminous angel-white feathers with delicate pearl-silver primary shaft & translucent trailing edge
      const tipTint = spanFrac > 0.55 ? (spanFrac - 0.55) * 0.09 : 0.0;
      const base = isUpper ? 0.975 - tipTint * 0.45 : 0.935 - tipTint * 0.35;
      const trailIvory = chordFrac > 0.75 ? 0.02 : 0.0;
      return [base - trailIvory * 0.3, base - trailIvory * 0.15, Math.min(1.0, base + 0.02)];
    };

    const ternInnerRightSt = [
      { x: 0.0, zLead: -0.095, zTrail: 0.135, yBase: 0.0, camber: 0.016, thick: 0.016, spanFrac: 0.0 },
      { x: 0.12, zLead: -0.115, zTrail: 0.115, yBase: 0.008, camber: 0.015, thick: 0.013, spanFrac: 0.14 },
      { x: 0.24, zLead: -0.138, zTrail: 0.088, yBase: 0.014, camber: 0.014, thick: 0.01, spanFrac: 0.28 },
      { x: 0.35, zLead: -0.155, zTrail: 0.058, yBase: 0.016, camber: 0.012, thick: 0.008, spanFrac: 0.4 },
    ];
    const ternOuterRightSt = [
      { x: 0.0, zLead: -0.155, zTrail: 0.058, yBase: 0.016, camber: 0.012, thick: 0.008, spanFrac: 0.4 },
      { x: 0.16, zLead: -0.12, zTrail: 0.075, yBase: 0.012, camber: 0.01, thick: 0.006, spanFrac: 0.58 },
      { x: 0.33, zLead: -0.045, zTrail: 0.105, yBase: 0.006, camber: 0.007, thick: 0.004, spanFrac: 0.78 },
      { x: 0.47, zLead: 0.048, zTrail: 0.138, yBase: 0.002, camber: 0.004, thick: 0.0022, spanFrac: 0.93 },
      { x: 0.54, zLead: 0.118, zTrail: 0.152, yBase: 0.0, camber: 0.002, thick: 0.001, spanFrac: 1.0 },
    ];

    // Deeply forked swallow tail (outer streamers z = +0.53, central V-notch z = +0.355)
    const ternTailGeo = this._createSheetFoilGeometry(
      [
        { x: -0.118, zLead: 0.46, zTrail: 0.535, yBase: 0.018, camber: 0.003, thick: 0.0015, spanFrac: 1.0 },
        { x: -0.075, zLead: 0.31, zTrail: 0.475, yBase: 0.015, camber: 0.004, thick: 0.0025, spanFrac: 0.65 },
        { x: -0.032, zLead: 0.255, zTrail: 0.395, yBase: 0.013, camber: 0.005, thick: 0.0035, spanFrac: 0.28 },
        { x: 0.0, zLead: 0.25, zTrail: 0.355, yBase: 0.012, camber: 0.005, thick: 0.004, spanFrac: 0.0 },
        { x: 0.032, zLead: 0.255, zTrail: 0.395, yBase: 0.013, camber: 0.005, thick: 0.0035, spanFrac: 0.28 },
        { x: 0.075, zLead: 0.31, zTrail: 0.475, yBase: 0.015, camber: 0.004, thick: 0.0025, spanFrac: 0.65 },
        { x: 0.118, zLead: 0.46, zTrail: 0.535, yBase: 0.018, camber: 0.003, thick: 0.0015, spanFrac: 1.0 },
      ],
      ternWingColor
    );

    // -----------------------------------------------------------------------
    // 2. BROWN BOOBY (Kena) Geometries: long narrow pelagic wings & pointed diamond wedge tail
    // -----------------------------------------------------------------------
    const boobyWingColor = ({ isUpper, spanFrac, chordFrac }) => {
      // Upperwing: dark chocolate-umber darkening to sepia-black primaries
      const tipDark = 1.0 - 0.28 * spanFrac;
      const choc = [0.27 * tipDark, 0.172 * tipDark, 0.11 * tipDark];
      if (isUpper) return choc;

      // Underwing: bright snow-white central underwing coverts framed by dark brown margins & dark primary tips!
      const inWhiteCoverts =
        spanFrac < 0.72 && chordFrac > 0.18 && chordFrac < 0.78;
      if (inWhiteCoverts) {
        const edgeFade =
          smoothstep(0.72, 0.56, spanFrac) *
          smoothstep(0.18, 0.28, chordFrac) *
          smoothstep(0.78, 0.66, chordFrac);
        return [
          choc[0] * (1.0 - edgeFade) + 0.93 * edgeFade,
          choc[1] * (1.0 - edgeFade) + 0.945 * edgeFade,
          choc[2] * (1.0 - edgeFade) + 0.96 * edgeFade,
        ];
      }
      return choc;
    };

    const boobyInnerRightSt = [
      { x: 0.0, zLead: -0.105, zTrail: 0.145, yBase: 0.0, camber: 0.018, thick: 0.019, spanFrac: 0.0 },
      { x: 0.15, zLead: -0.122, zTrail: 0.122, yBase: 0.006, camber: 0.016, thick: 0.015, spanFrac: 0.14 },
      { x: 0.3, zLead: -0.14, zTrail: 0.095, yBase: 0.01, camber: 0.014, thick: 0.012, spanFrac: 0.28 },
      { x: 0.44, zLead: -0.152, zTrail: 0.068, yBase: 0.012, camber: 0.012, thick: 0.009, spanFrac: 0.4 },
    ];
    const boobyOuterRightSt = [
      { x: 0.0, zLead: -0.152, zTrail: 0.068, yBase: 0.012, camber: 0.012, thick: 0.009, spanFrac: 0.4 },
      { x: 0.22, zLead: -0.108, zTrail: 0.088, yBase: 0.009, camber: 0.01, thick: 0.0065, spanFrac: 0.6 },
      { x: 0.44, zLead: -0.025, zTrail: 0.122, yBase: 0.005, camber: 0.007, thick: 0.004, spanFrac: 0.8 },
      { x: 0.58, zLead: 0.068, zTrail: 0.162, yBase: 0.002, camber: 0.004, thick: 0.0022, spanFrac: 0.93 },
      { x: 0.66, zLead: 0.148, zTrail: 0.185, yBase: 0.0, camber: 0.002, thick: 0.001, spanFrac: 1.0 },
    ];

    // Pointed diamond / wedge tail tapering to a single central spear tip at z = +0.675
    const boobyTailGeo = this._createSheetFoilGeometry(
      [
        { x: -0.084, zLead: 0.43, zTrail: 0.5, yBase: 0.01, camber: 0.003, thick: 0.0015, spanFrac: 1.0 },
        { x: -0.048, zLead: 0.365, zTrail: 0.585, yBase: 0.011, camber: 0.004, thick: 0.003, spanFrac: 0.88 },
        { x: 0.0, zLead: 0.355, zTrail: 0.675, yBase: 0.012, camber: 0.005, thick: 0.0042, spanFrac: 0.82 },
        { x: 0.048, zLead: 0.365, zTrail: 0.585, yBase: 0.011, camber: 0.004, thick: 0.003, spanFrac: 0.88 },
        { x: 0.084, zLead: 0.43, zTrail: 0.5, yBase: 0.01, camber: 0.003, thick: 0.0015, spanFrac: 1.0 },
      ],
      ({ isUpper }) => (isUpper ? [0.22, 0.14, 0.09] : [0.26, 0.17, 0.11])
    );

    const makeUniformColorSphere = (radius, r, g, b) => {
      const sGeo = new THREE.SphereGeometry(radius, 8, 8);
      const count = sGeo.attributes.position.count;
      const cols = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        cols[i * 3] = r;
        cols[i * 3 + 1] = g;
        cols[i * 3 + 2] = b;
      }
      sGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return sGeo;
    };

    const makeUniformColorFoot = (len, r, g, b) => {
      const fGeo = new THREE.ConeGeometry(0.014, len, 5);
      fGeo.rotateX(Math.PI * 0.5);
      const count = fGeo.attributes.position.count;
      const cols = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        cols[i * 3] = r;
        cols[i * 3 + 1] = g;
        cols[i * 3 + 2] = b;
      }
      fGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return fGeo;
    };

    this._seabirdGeos = {
      white_tern: {
        bodyGeo: this._createBirdBodyGeometry('white_tern'),
        tailGeo: ternTailGeo,
        innerRightGeo: this._createSheetFoilGeometry(ternInnerRightSt, ternWingColor),
        innerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(ternInnerRightSt),
          ternWingColor
        ),
        outerRightGeo: this._createSheetFoilGeometry(ternOuterRightSt, ternWingColor),
        outerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(ternOuterRightSt),
          ternWingColor
        ),
        eyeGeo: makeUniformColorSphere(0.0105, 0.04, 0.05, 0.07),
        footGeo: makeUniformColorFoot(0.065, 0.24, 0.3, 0.42),
        shoulderX: 0.048,
        shoulderY: 0.022,
        shoulderZ: -0.008,
        wristX: 0.35,
        eyePos: { x: 0.035, y: 0.041, z: -0.222 },
        footPos: { x: 0.022, y: -0.032, z: 0.225 },
      },
      brown_booby: {
        bodyGeo: this._createBirdBodyGeometry('brown_booby'),
        tailGeo: boobyTailGeo,
        innerRightGeo: this._createSheetFoilGeometry(boobyInnerRightSt, boobyWingColor),
        innerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(boobyInnerRightSt),
          boobyWingColor
        ),
        outerRightGeo: this._createSheetFoilGeometry(boobyOuterRightSt, boobyWingColor),
        outerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(boobyOuterRightSt),
          boobyWingColor
        ),
        irisGeo: makeUniformColorSphere(0.011, 0.86, 0.82, 0.44),
        eyeGeo: makeUniformColorSphere(0.0072, 0.04, 0.05, 0.07),
        footGeo: makeUniformColorFoot(0.085, 0.84, 0.74, 0.34),
        shoulderX: 0.056,
        shoulderY: 0.026,
        shoulderZ: -0.015,
        wristX: 0.44,
        eyePos: { x: 0.035, y: 0.024, z: -0.358 },
        footPos: { x: 0.026, y: -0.036, z: 0.31 },
      },
    };
  }

  /**
   * Instantiates an articulated, vertex-colored 3D White Tern ('white_tern') or
   * Brown Booby ('brown_booby') with 2-joint wings (shoulder + carpal wrist),
   * species-accurate bill, eyes, tucked webbed feet, and tail.
   */
  createSeabird(species = 'white_tern', { opaque = false } = {}) {
    this._ensureSeabirdAssets();
    const key = species === 'brown_booby' ? 'brown_booby' : 'white_tern';
    const spec = this._seabirdGeos[key];
    const isBooby = key === 'brown_booby';

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: isBooby ? 0.62 : 0.52,
      metalness: 0.04,
      emissive: isBooby ? 0x3b281a : 0xdce6f2,
      emissiveIntensity: isBooby ? 0.16 : 0.22,
      transparent: !opaque,
      opacity: 1.0,
    });

    const root = new THREE.Group();
    const body = new THREE.Mesh(spec.bodyGeo, mat);
    const tail = new THREE.Mesh(spec.tailGeo, mat);
    root.add(body, tail);

    // Eyes & tucked webbed feet
    for (const side of [-1, 1]) {
      if (spec.irisGeo) {
        const iris = new THREE.Mesh(spec.irisGeo, mat);
        iris.position.set(side * spec.eyePos.x, spec.eyePos.y, spec.eyePos.z);
        iris.scale.set(0.55, 1.0, 1.0);
        root.add(iris);
      }
      const eye = new THREE.Mesh(spec.eyeGeo, mat);
      eye.position.set(
        side * (spec.eyePos.x + (spec.irisGeo ? 0.003 : 0.0)),
        spec.eyePos.y,
        spec.eyePos.z
      );
      eye.scale.set(0.6, 1.0, 1.0);
      root.add(eye);

      const foot = new THREE.Mesh(spec.footGeo, mat);
      foot.position.set(side * spec.footPos.x, spec.footPos.y, spec.footPos.z);
      root.add(foot);
    }

    // Two-joint articulated right (+X) & left (-X) wings
    const rightInnerWing = new THREE.Group();
    rightInnerWing.position.set(spec.shoulderX, spec.shoulderY, spec.shoulderZ);
    rightInnerWing.add(new THREE.Mesh(spec.innerRightGeo, mat));

    const rightOuterWing = new THREE.Group();
    rightOuterWing.position.set(spec.wristX, 0.0, 0.0);
    rightOuterWing.add(new THREE.Mesh(spec.outerRightGeo, mat));
    rightInnerWing.add(rightOuterWing);

    const leftInnerWing = new THREE.Group();
    leftInnerWing.position.set(-spec.shoulderX, spec.shoulderY, spec.shoulderZ);
    leftInnerWing.add(new THREE.Mesh(spec.innerLeftGeo, mat));

    const leftOuterWing = new THREE.Group();
    leftOuterWing.position.set(-spec.wristX, 0.0, 0.0);
    leftOuterWing.add(new THREE.Mesh(spec.outerLeftGeo, mat));
    leftInnerWing.add(leftOuterWing);

    root.add(rightInnerWing, leftInnerWing);

    const entry = {
      root,
      species: key,
      mat,
      leftInnerWing,
      leftOuterWing,
      rightInnerWing,
      rightOuterWing,
      bobY: 0.0,
    };
    root.userData.seabird = entry;
    return entry;
  }

  /**
   * Animates species-distinct 2-joint wingbeats:
   * - White Tern: buoyant, airy elastic stroke with graceful gull/tern carpal wrist arch
   * - Brown Booby: brisker, stiffer pelagic commuting stroke with shallower crossbow dihedral
   */
  animateSeabird(entry, elapsedSec, phaseOffset = 0.0, speedScale = 1.0) {
    if (!entry) return;
    if (entry.species === 'brown_booby') {
      const theta = elapsedSec * 9.0 * speedScale + phaseOffset;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const wave = sinT + 0.16 * Math.sin(2.0 * theta);
      const innerAngle = wave * 0.36 + 0.04;
      const wristFold = -0.2 * Math.max(0.0, wave) - 0.14 * cosT - 0.04;

      entry.rightInnerWing.rotation.z = innerAngle;
      entry.leftInnerWing.rotation.z = -innerAngle;
      entry.rightOuterWing.rotation.z = wristFold;
      entry.leftOuterWing.rotation.z = -wristFold;
      entry.bobY = -wave * 0.022;
    } else {
      const theta = elapsedSec * 7.6 * speedScale + phaseOffset;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const innerAngle = sinT * 0.48 + 0.09;
      const wristFold = -0.34 * Math.max(0.0, sinT) - 0.24 * cosT - 0.07;

      entry.rightInnerWing.rotation.z = innerAngle;
      entry.leftInnerWing.rotation.z = -innerAngle;
      entry.rightOuterWing.rotation.z = wristFold;
      entry.leftOuterWing.rotation.z = -wristFold;
      entry.bobY = -sinT * 0.034;
    }
  }

  _buildHomingBirdFlocks() {
    // 8 homing seabird slots flying in purposeful straight rays along nearest Ring 1+ island bearing,
    // each carrying distinct sculpted White Tern and Brown Booby assemblies.
    this.homingBirds = [];
    this.birdFlockGroup = new THREE.Group();
    this.group.add(this.birdFlockGroup);

    for (let i = 0; i < 8; i += 1) {
      const bird = new THREE.Group();
      const ternEntry = this.createSeabird('white_tern', { opaque: false });
      const boobyEntry = this.createSeabird('brown_booby', { opaque: false });
      boobyEntry.root.visible = false;

      bird.add(ternEntry.root, boobyEntry.root);
      this.birdFlockGroup.add(bird);

      this.homingBirds.push({
        bird,
        ternEntry,
        boobyEntry,
        leftWing: ternEntry.leftInnerWing,
        rightWing: ternEntry.rightInnerWing,
        mat: ternEntry.mat,
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

      // Update homing flight azimuth & active seabird species while active
      this._lastBirdWorldAz =
        dawnEnv >= duskEnv
          ? posMod(nearestRing1.bearingDeg + 180.0, 360.0)
          : nearestRing1.bearingDeg;

      this._activeBirdIsBooby =
        nearestRing1.island.birdSpecies === 'brown_booby' ||
        nearestRing1.island.birdSpecies === 'booby';
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

      for (const b of this.homingBirds) {
        const activeEntry = this._activeBirdIsBooby ? b.boobyEntry : b.ternEntry;
        const inactiveEntry = this._activeBirdIsBooby ? b.ternEntry : b.boobyEntry;
        inactiveEntry.root.visible = false;
        activeEntry.root.visible = true;

        this.animateSeabird(activeEntry, elapsedSec, b.phase, 1.0);

        b.progress = (b.progress + dtSec * 0.12) % 1.0;
        const along = (b.progress - 0.5) * 145.0;
        b.bird.position.set(
          fDirX * along + fSideX * b.offsetSide,
          b.offsetHeight + activeEntry.bobY,
          fDirZ * along + fSideZ * b.offsetSide
        );
        b.bird.rotation.y = -flightRelRad;

        // Smooth fade-in from rear horizon (0.0 -> 0.18) and fade-out into forward horizon (0.82 -> 1.0)
        const rayEnv =
          smoothstep(0.0, 0.18, b.progress) *
          smoothstep(0.0, 0.18, 1.0 - b.progress);
        const birdAlpha = this.birdFlockAlpha * rayEnv;
        const useTrans = birdAlpha < 0.995;
        activeEntry.mat.opacity = birdAlpha;
        activeEntry.mat.depthWrite = birdAlpha > 0.25;
        if (activeEntry.mat.transparent !== useTrans) {
          activeEntry.mat.transparent = useTrans;
          activeEntry.mat.needsUpdate = true;
        }
        b.bird.scale.setScalar(0.76 + 0.24 * rayEnv);
        b.bird.visible = birdAlpha > 0.004;
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
