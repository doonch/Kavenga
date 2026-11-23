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
import { altAzToDirectionVec3 } from '../simulation/celestialSim.js';
import {
  TRADE_CLOUD_VARIANT_KEYS,
  createSculptedCloudMesh,
  getCloudArchetypeGeometry,
  getCloudArchetypeSpec,
  sampleCloudLocalRayOpticalDepth,
  updateCloudMaterialUniforms,
} from './CloudSculptBuilder.js';
import { createSculptedPalmFrondGeometry } from './IslandSculptToolkit.js';
import {
  applyDetailedIslandAlpha,
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  getIslandShoreRadiusM,
  hasDetailedIslandModel,
} from './IslandTerrainBuilder.js';

function clamp01(v) {
  return Math.max(0.0, Math.min(1.0, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

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

    this.tradeFogOpacity = 1.0;
    this.birdFlockAlpha = 0.0;
    this.albatrossAlpha = 0.0;
    this._lastBirdWorldAz = 0.0;
    this._activeBirdIsBooby = false;
    this._birdTargetColor = new THREE.Color(0xf7fbff);
    this.fishAlpha = 0.0;
    this.frondAlpha = 0.0;
    this.detailedIslandPool = {};
    this._activeCloudOccluders = [];
    this._occluderPool = [];
    this._tradeVariantBag = [];
    this._lastDrawnTradeVariant = null;
    this._cloudSpawnCounter = 0;

    this._buildMarchingTradeClouds();
    this._buildIslandBeaconPools();
    this._buildHomingBirdFlocks();
    this._buildPelagicAlbatross();
    this._buildMiddayFishSchool();
    this._buildDriftingFronds();
  }

  _drawNextTradeVariantKey() {
    if (this._tradeVariantBag.length === 0) {
      const deck = TRADE_CLOUD_VARIANT_KEYS.slice();
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = deck[i];
        deck[i] = deck[j];
        deck[j] = tmp;
      }
      // Prevent back-to-back seam repeat across bag boundaries
      if (
        deck.length > 1 &&
        deck[deck.length - 1] === this._lastDrawnTradeVariant
      ) {
        const swapIdx = Math.floor(Math.random() * (deck.length - 1));
        const tmp = deck[deck.length - 1];
        deck[deck.length - 1] = deck[swapIdx];
        deck[swapIdx] = tmp;
      }
      this._tradeVariantBag = deck;
    }
    const nextKey = this._tradeVariantBag.pop();
    this._lastDrawnTradeVariant = nextKey;
    return nextKey;
  }

  _assignMixedTradeCloudTraits(tc, laneIndex = null, laneCount = 5) {
    const archetypeKey = this._drawNextTradeVariantKey();
    const geo = getCloudArchetypeGeometry(archetypeKey);
    const spec = getCloudArchetypeSpec(archetypeKey);

    tc.archetypeKey = archetypeKey;
    tc.spec = spec;
    if (tc.cloudMesh.geometry !== geo) {
      tc.cloudMesh.geometry = geo;
    }
    if (tc.mat?.uniforms?.uDetailScale) {
      tc.mat.uniforms.uDetailScale.value = spec.detailScale;
    }
    tc.cloudMesh.userData.cloudArchetype = archetypeKey;

    const slot =
      laneIndex !== null
        ? laneIndex % laneCount
        : (this._cloudSpawnCounter++) % laneCount;
    const spanWidth = 340.0;
    const laneStep = spanWidth / laneCount;
    const laneCenter = -spanWidth * 0.5 + (slot + 0.5) * laneStep;
    tc.lateralOffset = laneCenter + (Math.random() - 0.5) * laneStep * 0.88;
    tc.altY = 62.0 + Math.random() * 58.0;
    tc.baseScale = 0.82 + Math.random() * 0.38;
    tc.yawJitter = (Math.random() - 0.5) * 1.15;
    tc.speedMul = 0.85 + Math.random() * 0.32;
  }

  _remixMarchingTradeClouds() {
    const count = this.tradeClouds.length;
    // Shuffle lateral lane assignments so initial spatial layout isn't sequential
    const lanes = Array.from({ length: count }, (_, idx) => idx);
    for (let i = lanes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }
    for (let i = 0; i < count; i += 1) {
      const tc = this.tradeClouds[i];
      this._assignMixedTradeCloudTraits(tc, lanes[i], 5);
      const jitter = (Math.random() - 0.5) * (0.65 / count);
      tc.progress = ((i + 0.5) / count + jitter + 1.0) % 1.0;
    }
  }

  _buildMarchingTradeClouds() {
    this.tradeCloudGroup = new THREE.Group();
    this.group.add(this.tradeCloudGroup);

    // Pre-warm all 6 trade-wind cumulus geometries so runtime variant swaps are zero-cost
    for (const key of TRADE_CLOUD_VARIANT_KEYS) {
      getCloudArchetypeGeometry(key);
    }

    this.tradeClouds = [];
    const cloudCount = 15;

    for (let i = 0; i < cloudCount; i += 1) {
      const archetypeKey = this._drawNextTradeVariantKey();
      const cluster = new THREE.Group();
      const sculpted = createSculptedCloudMesh(archetypeKey, { opacity: 1.0 });
      cluster.add(sculpted.mesh);
      this.tradeCloudGroup.add(cluster);

      const tc = {
        mesh: cluster,
        cloudMesh: sculpted.mesh,
        mat: sculpted.material,
        archetypeKey,
        spec: sculpted.spec,
        opacity: 1.0,
        baseScale: 1.0,
        yawJitter: 0.0,
        speedMul: 1.0,
        progress: i / cloudCount,
        lateralOffset: 0.0,
        altY: 80.0,
      };
      this.tradeClouds.push(tc);
    }

    this._remixMarchingTradeClouds();
  }

  _buildIslandBeaconPools() {
    // Pool of up to 8 basin island 3D beacons keyed persistently by island.id so fade-outs complete cleanly
    this.islandSlots = [];
    for (let i = 0; i < 8; i += 1) {
      const root = new THREE.Group();
      root.visible = false;

      // 1. Tall Stationary Cumulus Peak Cloud (High Volcanic Islands — Cumulus Congestus)
      const peakCloud = new THREE.Group();
      const peakSculpt = createSculptedCloudMesh('peak', { opacity: 1.0 });
      peakCloud.add(peakSculpt.mesh);
      peakCloud.position.y = 56.0;
      root.add(peakCloud);

      // 2. Coral Atoll Lapa Cloud (flat low canopy with pale jade/turquoise lagoon underside glow!)
      const lapaCloud = new THREE.Group();
      const lapaSculpt = createSculptedCloudMesh('lapa', {
        isLapa: true,
        opacity: 1.0,
      });
      lapaCloud.add(lapaSculpt.mesh);
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
        peakCloudMesh: peakSculpt.mesh,
        peakCloudSpec: peakSculpt.spec,
        cloudMat: peakSculpt.material,
        lapaCloud,
        lapaCloudMesh: lapaSculpt.mesh,
        lapaCloudSpec: lapaSculpt.spec,
        lapaMat: lapaSculpt.material,
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
    const isKura = species === 'red_kura';
    const isSooty = species === 'sooty_tern';
    const isAlbatross = species === 'albatross';
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
      if (isKura) {
        // RED KURA (Vini kuhlii / Sacred Crimson Lorikeet): compact hooked coral beak, rounded crown,
        // full plump crimson breast, tapered scarlet-ruby torso & vent
        const z = -0.315 + 0.61 * u;
        let halfH;
        let halfW;
        let centerY;
        if (u <= 0.145) {
          const t = u / 0.145;
          const hookDip = (1.0 - t) * (1.0 - t);
          halfH = 0.002 + 0.021 * Math.pow(t, 0.72);
          halfW = 0.002 + 0.017 * Math.pow(t, 0.8);
          centerY = 0.038 - 0.017 * hookDip + 0.004 * t;
        } else if (u <= 0.34) {
          const t = (u - 0.145) / 0.195;
          const crown = Math.sin(t * Math.PI);
          halfH = 0.023 + 0.032 * Math.pow(crown, 0.54) + 0.022 * t;
          halfW = 0.019 + 0.03 * Math.pow(crown, 0.56) + 0.023 * t;
          centerY = 0.042 + 0.011 * crown - 0.014 * t;
        } else if (u <= 0.46) {
          const t = (u - 0.34) / 0.12;
          halfH = 0.045 + 0.023 * t;
          halfW = 0.042 + 0.022 * t;
          centerY = 0.028 - 0.02 * t;
        } else if (u <= 0.83) {
          const t = (u - 0.46) / 0.37;
          const arch = Math.sin(t * Math.PI);
          halfH = 0.068 + 0.014 * arch - 0.036 * t * t;
          halfW = 0.064 + 0.012 * arch - 0.032 * t * t;
          centerY = 0.008 - 0.008 * Math.sin(t * Math.PI * 0.85) + 0.006 * t;
        } else {
          const t = (u - 0.83) / 0.17;
          halfH = 0.032 * (1.0 - 0.5 * t);
          halfW = 0.032 * (1.0 - 0.38 * t);
          centerY = 0.014 + 0.002 * t;
        }
        return { z, halfH, halfW, centerY };
      }

      if (isAlbatross) {
        // KA'UPU (Black-footed Albatross / Phoebastria nigripes):
        // heavy hooked tube-nose bill, broad oceanic brow, deep pelagic chest & tapered rump
        const z = -0.665 + 1.105 * u;
        let halfH;
        let halfW;
        let centerY;
        if (u <= 0.195) {
          const t = u / 0.195;
          const hookDip = Math.pow(1.0 - t, 2.2);
          const tubeBump = Math.sin(clamp01((t - 0.35) / 0.55) * Math.PI);
          halfH = 0.004 + 0.036 * Math.pow(t, 0.78) + 0.004 * tubeBump;
          halfW = 0.0035 + 0.03 * Math.pow(t, 0.84);
          centerY = 0.02 - 0.018 * hookDip + 0.007 * t;
        } else if (u <= 0.34) {
          const t = (u - 0.195) / 0.145;
          const crown = Math.sin(t * Math.PI);
          halfH = 0.04 + 0.018 * crown + 0.01 * t;
          halfW = 0.0335 + 0.018 * crown + 0.012 * t;
          centerY = 0.027 + 0.007 * crown - 0.005 * t;
        } else if (u <= 0.49) {
          const t = (u - 0.34) / 0.15;
          halfH = 0.05 + 0.038 * Math.pow(t, 1.25);
          halfW = 0.0455 + 0.0385 * Math.pow(t, 1.25);
          centerY = 0.022 - 0.016 * t;
        } else if (u <= 0.84) {
          const t = (u - 0.49) / 0.35;
          const arch = Math.sin(t * Math.PI);
          halfH = 0.088 + 0.018 * arch - 0.048 * t * t;
          halfW = 0.084 + 0.016 * arch - 0.044 * t * t;
          centerY = 0.006 - 0.009 * arch + 0.007 * t;
        } else {
          const t = (u - 0.84) / 0.16;
          halfH = 0.04 * (1.0 - 0.54 * t);
          halfW = 0.04 * (1.0 - 0.44 * t);
          centerY = 0.013 + 0.002 * t;
        }
        return { z, halfH, halfW, centerY };
      }

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
      if (isKura) {
        // Red Kura: hooked coral-amber beak, scarlet face & breast, jewel-cobalt nape streak,
        // ruby-crimson back & deep mulberry-plum lower vent
        if (u <= 0.148) {
          const bt = Math.max(0.0, Math.min(1.0, u / 0.148));
          const tipDark = bt < 0.25 ? 0.55 + 1.8 * bt : 1.0;
          return [
            0.94 * tipDark,
            (0.46 + 0.12 * bt) * tipDark,
            (0.12 + 0.08 * bt) * tipDark,
          ];
        }
        // Dark eye-ring contour
        const dzEye = (z - -0.195) / 0.02;
        const dyEye = (ny - 0.24) / 0.34;
        if (Math.abs(nx) > 0.65 && dzEye * dzEye + dyEye * dyEye < 1.0) {
          return [0.22, 0.05, 0.06];
        }
        // Royal cobalt nape accent along dorsal neck (u ~ 0.30..0.44, ny > 0.35)
        const napeMask =
          smoothstep(0.28, 0.35, u) *
          smoothstep(0.47, 0.39, u) *
          smoothstep(0.28, 0.62, ny);
        // Deep violet-plum under-vent highlight (u ~ 0.72..0.95, ny < -0.22)
        const ventMask =
          smoothstep(0.7, 0.84, u) * smoothstep(-0.18, -0.58, ny);

        // Rich scarlet breast/throat shading up into deep ruby mantle on back
        const dorsalDark = 0.5 + 0.5 * ny;
        let rCol = lerp(0.95, 0.72, dorsalDark);
        let gCol = lerp(0.18, 0.075, dorsalDark);
        let bCol = lerp(0.14, 0.085, dorsalDark);

        // Apply sapphire-cobalt nape crest & plum vent accents
        rCol = rCol * (1.0 - napeMask) + 0.14 * napeMask;
        gCol = gCol * (1.0 - napeMask) + 0.26 * napeMask;
        bCol = bCol * (1.0 - napeMask) + 0.68 * napeMask;

        rCol = rCol * (1.0 - ventMask) + 0.36 * ventMask;
        gCol = gCol * (1.0 - ventMask) + 0.08 * ventMask;
        bCol = bCol * (1.0 - ventMask) + 0.34 * ventMask;

        return [rCol, gCol, bCol];
      }

      if (isAlbatross) {
        // Ka'upu (Black-footed Albatross): slate-black hooked bill, crisp white feather ring at bill base,
        // pale post-ocular crescent, dark chocolate-umber mantle fading to smoky dove-slate breast & belly,
        // and clean white upper/undertail rump band
        if (u <= 0.195) {
          const ridgeHighlight = ny > 0.45 ? 0.04 : 0.0;
          return [0.09 + ridgeHighlight, 0.085 + ridgeHighlight, 0.105 + ridgeHighlight];
        }
        if (u <= 0.232) {
          return [0.92, 0.92, 0.93];
        }
        const dzEyePatch = (z - -0.405) / 0.032;
        const dyEyePatch = (ny + 0.02) / 0.24;
        if (Math.abs(nx) > 0.6 && dzEyePatch * dzEyePatch + dyEyePatch * dyEyePatch < 1.0) {
          return [0.85, 0.84, 0.82];
        }
        if (u >= 0.865) {
          const rumpBlend = smoothstep(0.865, 0.92, u);
          return [
            lerp(0.24, 0.88, rumpBlend),
            lerp(0.19, 0.885, rumpBlend),
            lerp(0.16, 0.9, rumpBlend),
          ];
        }
        const dorsalFactor = 0.5 + 0.5 * ny;
        return [
          lerp(0.35, 0.18, dorsalFactor),
          lerp(0.3, 0.14, dorsalFactor),
          lerp(0.275, 0.115, dorsalFactor),
        ];
      }

      if (!isBooby) {
        if (isSooty) {
          // Sooty Tern (Manutara): glossy slate-black cap/nape/mantle/upper-tail, snow-white forehead & belly!
          if (u <= 0.172) {
            return [0.06, 0.065, 0.085];
          }
          // Crisp white forehead crescent just behind the bill (u ~ 0.175..0.245, dorsal ny > 0.05)
          const isForehead = u > 0.174 && u < 0.248 && ny > 0.05;
          // Dark slate-black eye-stripe mask & upper dorsal crown/back/rump
          const isUpperPlumage =
            !isForehead &&
            (ny > 0.02 || (u < 0.30 && ny > -0.18 && Math.abs(nx) > 0.45));
          if (isUpperPlumage) {
            const dorsalSheen = 0.08 + 0.045 * (1.0 - Math.max(0.0, ny));
            return [dorsalSheen, dorsalSheen * 1.05, dorsalSheen * 1.18];
          }
          const bellyShade = 0.92 + 0.06 * Math.abs(ny);
          return [bellyShade * 0.98, bellyShade * 0.99, Math.min(1.0, bellyShade)];
        }
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
      : isAlbatross
        ? pushVC(0.0, 0.002, -0.672, 0.08, 0.08, 0.095)
        : isKura
          ? pushVC(0.0, 0.021, -0.322, 0.52, 0.25, 0.08)
          : pushVC(0.0, 0.03, -0.372, 0.05, 0.06, 0.1);
    const backTip = isBooby
      ? pushVC(0.0, 0.012, 0.402, 0.25, 0.16, 0.1)
      : isAlbatross
        ? pushVC(0.0, 0.015, 0.448, 0.88, 0.89, 0.91)
        : isKura
          ? pushVC(0.0, 0.016, 0.302, 0.78, 0.12, 0.11)
          : isSooty
            ? pushVC(0.0, 0.013, 0.292, 0.11, 0.115, 0.14)
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

    // Sooty Tern (Manutara): dark charcoal-slate upperwings, snow-white underwing coverts & slate flight tips
    const sootyWingColor = ({ isUpper, spanFrac, chordFrac }) => {
      if (isUpper) {
        const s = 0.115 - 0.03 * spanFrac;
        return [s, s * 1.04, s * 1.16];
      }
      if (spanFrac < 0.66 && chordFrac < 0.62) {
        return [0.92, 0.94, 0.96];
      }
      const u = 0.22 - 0.06 * spanFrac;
      return [u, u * 1.04, u * 1.15];
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

    // -----------------------------------------------------------------------
    // 3. RED KURA BIRD (Vini kuhlii / Manu Kura) Geometries: rounded crimson wings & fan tail
    // -----------------------------------------------------------------------
    const kuraWingColor = ({ isUpper, spanFrac, chordFrac }) => {
      // Vibrant scarlet-crimson coverts, warm vermilion-gold secondary flash, dark burgundy flight tips
      const tipDark = smoothstep(0.58, 1.0, spanFrac);
      const secGold =
        smoothstep(0.15, 0.34, spanFrac) *
        smoothstep(0.62, 0.42, spanFrac) *
        smoothstep(0.42, 0.72, chordFrac);
      if (isUpper) {
        let rCol = lerp(0.86, 0.24, tipDark);
        let gCol = lerp(0.11, 0.05, tipDark);
        let bCol = lerp(0.1, 0.07, tipDark);
        rCol = lerp(rCol, 0.96, secGold * 0.72);
        gCol = lerp(gCol, 0.36, secGold * 0.72);
        bCol = lerp(bCol, 0.14, secGold * 0.72);
        return [rCol, gCol, bCol];
      }
      // Underwing: luminous flame-scarlet coverts shading to dark claret primary tips
      return [
        lerp(0.95, 0.32, tipDark),
        lerp(0.22, 0.07, tipDark),
        lerp(0.14, 0.08, tipDark),
      ];
    };

    const kuraInnerRightSt = [
      { x: 0.0, zLead: -0.095, zTrail: 0.145, yBase: 0.0, camber: 0.017, thick: 0.016, spanFrac: 0.0 },
      { x: 0.11, zLead: -0.108, zTrail: 0.132, yBase: 0.008, camber: 0.016, thick: 0.013, spanFrac: 0.15 },
      { x: 0.22, zLead: -0.122, zTrail: 0.112, yBase: 0.013, camber: 0.014, thick: 0.01, spanFrac: 0.3 },
      { x: 0.33, zLead: -0.128, zTrail: 0.092, yBase: 0.014, camber: 0.012, thick: 0.008, spanFrac: 0.44 },
    ];
    const kuraOuterRightSt = [
      { x: 0.0, zLead: -0.128, zTrail: 0.092, yBase: 0.014, camber: 0.012, thick: 0.008, spanFrac: 0.44 },
      { x: 0.14, zLead: -0.102, zTrail: 0.102, yBase: 0.01, camber: 0.01, thick: 0.006, spanFrac: 0.64 },
      { x: 0.27, zLead: -0.048, zTrail: 0.116, yBase: 0.005, camber: 0.007, thick: 0.0042, spanFrac: 0.82 },
      { x: 0.36, zLead: 0.012, zTrail: 0.128, yBase: 0.002, camber: 0.004, thick: 0.0024, spanFrac: 0.94 },
      { x: 0.41, zLead: 0.068, zTrail: 0.122, yBase: 0.0, camber: 0.002, thick: 0.0012, spanFrac: 1.0 },
    ];

    // Graduated crimson & vermilion fan tail (z = +0.24 to +0.49)
    const kuraTailGeo = this._createSheetFoilGeometry(
      [
        { x: -0.098, zLead: 0.28, zTrail: 0.415, yBase: 0.012, camber: 0.003, thick: 0.0018, spanFrac: 1.0 },
        { x: -0.056, zLead: 0.255, zTrail: 0.465, yBase: 0.014, camber: 0.004, thick: 0.0028, spanFrac: 0.58 },
        { x: 0.0, zLead: 0.24, zTrail: 0.495, yBase: 0.015, camber: 0.005, thick: 0.0036, spanFrac: 0.0 },
        { x: 0.056, zLead: 0.255, zTrail: 0.465, yBase: 0.014, camber: 0.004, thick: 0.0028, spanFrac: 0.58 },
        { x: 0.098, zLead: 0.28, zTrail: 0.415, yBase: 0.012, camber: 0.003, thick: 0.0018, spanFrac: 1.0 },
      ],
      ({ isUpper, chordFrac }) => {
        const tipWarm = smoothstep(0.62, 1.0, chordFrac);
        return isUpper
          ? [lerp(0.84, 0.96, tipWarm), lerp(0.11, 0.34, tipWarm), lerp(0.1, 0.14, tipWarm)]
          : [lerp(0.92, 0.98, tipWarm), lerp(0.2, 0.42, tipWarm), lerp(0.13, 0.16, tipWarm)];
      }
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

    const makeUniformColorShaft = (topR, botR, len, r, g, b, rotX = 0, rotY = 0, ty = 0, tz = 0) => {
      const fGeo = new THREE.CylinderGeometry(topR, botR, len, 5);
      if (rotX) fGeo.rotateX(rotX);
      if (rotY) fGeo.rotateY(rotY);
      if (ty || tz) fGeo.translate(0, ty, tz);
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

    const makeWebbedFootGeo = (len, r, g, b) => {
      const fGeo = new THREE.ConeGeometry(0.022, len, 3);
      fGeo.scale(1.25, 1.0, 0.28);
      fGeo.rotateX(-Math.PI * 0.5);
      fGeo.translate(0, -0.002, -len * 0.42);
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
        legGeo: makeUniformColorShaft(0.0068, 0.0052, 0.095, 0.24, 0.3, 0.42, 0, 0, -0.0475, 0),
        footGeo: makeWebbedFootGeo(0.052, 0.24, 0.3, 0.42),
        legLen: 0.095,
        shoulderX: 0.048,
        shoulderY: 0.022,
        shoulderZ: -0.008,
        wristX: 0.35,
        eyePos: { x: 0.035, y: 0.041, z: -0.222 },
        footPos: { x: 0.024, y: -0.026, z: 0.025 },
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
        legGeo: makeUniformColorShaft(0.009, 0.007, 0.125, 0.84, 0.74, 0.34, 0, 0, -0.0625, 0),
        footGeo: makeWebbedFootGeo(0.074, 0.84, 0.74, 0.34),
        legLen: 0.125,
        shoulderX: 0.056,
        shoulderY: 0.026,
        shoulderZ: -0.015,
        wristX: 0.44,
        eyePos: { x: 0.035, y: 0.024, z: -0.358 },
        footPos: { x: 0.032, y: -0.03, z: 0.03 },
      },
      red_kura: {
        bodyGeo: this._createBirdBodyGeometry('red_kura'),
        tailGeo: kuraTailGeo,
        innerRightGeo: this._createSheetFoilGeometry(kuraInnerRightSt, kuraWingColor),
        innerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(kuraInnerRightSt),
          kuraWingColor
        ),
        outerRightGeo: this._createSheetFoilGeometry(kuraOuterRightSt, kuraWingColor),
        outerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(kuraOuterRightSt),
          kuraWingColor
        ),
        irisGeo: makeUniformColorSphere(0.0102, 0.96, 0.74, 0.2),
        eyeGeo: makeUniformColorSphere(0.0068, 0.04, 0.04, 0.06),
        legGeo: makeUniformColorShaft(0.0068, 0.0052, 0.092, 0.92, 0.44, 0.16, 0, 0, -0.046, 0),
        footGeo: makeWebbedFootGeo(0.044, 0.92, 0.44, 0.16),
        legLen: 0.092,
        shoulderX: 0.052,
        shoulderY: 0.022,
        shoulderZ: -0.01,
        wristX: 0.33,
        eyePos: { x: 0.04, y: 0.042, z: -0.195 },
        footPos: { x: 0.024, y: -0.026, z: 0.02 },
      },
      sooty_tern: {
        bodyGeo: this._createBirdBodyGeometry('sooty_tern'),
        tailGeo: this._createSheetFoilGeometry(
          [
            { x: -0.118, zLead: 0.46, zTrail: 0.535, yBase: 0.018, camber: 0.003, thick: 0.0015, spanFrac: 1.0 },
            { x: -0.075, zLead: 0.31, zTrail: 0.475, yBase: 0.015, camber: 0.004, thick: 0.0025, spanFrac: 0.65 },
            { x: -0.032, zLead: 0.255, zTrail: 0.395, yBase: 0.013, camber: 0.005, thick: 0.0035, spanFrac: 0.28 },
            { x: 0.0, zLead: 0.25, zTrail: 0.355, yBase: 0.012, camber: 0.005, thick: 0.004, spanFrac: 0.0 },
            { x: 0.032, zLead: 0.255, zTrail: 0.395, yBase: 0.013, camber: 0.005, thick: 0.0035, spanFrac: 0.28 },
            { x: 0.075, zLead: 0.31, zTrail: 0.475, yBase: 0.015, camber: 0.004, thick: 0.0025, spanFrac: 0.65 },
            { x: 0.118, zLead: 0.46, zTrail: 0.535, yBase: 0.018, camber: 0.003, thick: 0.0015, spanFrac: 1.0 },
          ],
          sootyWingColor
        ),
        innerRightGeo: this._createSheetFoilGeometry(ternInnerRightSt, sootyWingColor),
        innerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(ternInnerRightSt),
          sootyWingColor
        ),
        outerRightGeo: this._createSheetFoilGeometry(ternOuterRightSt, sootyWingColor),
        outerLeftGeo: this._createSheetFoilGeometry(
          mirrorWingStations(ternOuterRightSt),
          sootyWingColor
        ),
        eyeGeo: makeUniformColorSphere(0.0105, 0.04, 0.05, 0.07),
        legGeo: makeUniformColorShaft(0.0068, 0.0052, 0.095, 0.12, 0.12, 0.14, 0, 0, -0.0475, 0),
        footGeo: makeWebbedFootGeo(0.052, 0.12, 0.12, 0.14),
        legLen: 0.095,
        shoulderX: 0.048,
        shoulderY: 0.022,
        shoulderZ: -0.008,
        wristX: 0.35,
        eyePos: { x: 0.035, y: 0.041, z: -0.222 },
        footPos: { x: 0.024, y: -0.026, z: 0.025 },
      },
      albatross: (() => {
        // Ka'upu (Black-footed Albatross): long high-aspect dynamic-soaring glider wings
        // (3.38m span at 1x) + dark umber upperwings, smoky underwing sheen & short wedged tail
        const albatrossWingColor = ({ isUpper, spanFrac, chordFrac }) => {
          const tipDark = 1.0 - 0.34 * spanFrac;
          if (isUpper) {
            return [0.21 * tipDark, 0.16 * tipDark, 0.13 * tipDark];
          }
          if (spanFrac < 0.56 && chordFrac > 0.14 && chordFrac < 0.62) {
            const pale = smoothstep(0.56, 0.25, spanFrac) * smoothstep(0.14, 0.32, chordFrac);
            return [
              lerp(0.24 * tipDark, 0.48, pale),
              lerp(0.2 * tipDark, 0.45, pale),
              lerp(0.18 * tipDark, 0.43, pale),
            ];
          }
          return [0.18 * tipDark, 0.145 * tipDark, 0.125 * tipDark];
        };
        const albatrossInnerRightSt = [
          { x: 0.0, zLead: -0.115, zTrail: 0.135, yBase: 0.0, camber: 0.02, thick: 0.022, spanFrac: 0.0 },
          { x: 0.22, zLead: -0.125, zTrail: 0.105, yBase: 0.008, camber: 0.018, thick: 0.017, spanFrac: 0.14 },
          { x: 0.43, zLead: -0.132, zTrail: 0.078, yBase: 0.014, camber: 0.015, thick: 0.013, spanFrac: 0.27 },
          { x: 0.64, zLead: -0.134, zTrail: 0.052, yBase: 0.016, camber: 0.012, thick: 0.01, spanFrac: 0.4 },
        ];
        const albatrossOuterRightSt = [
          { x: 0.0, zLead: -0.134, zTrail: 0.052, yBase: 0.016, camber: 0.012, thick: 0.01, spanFrac: 0.4 },
          { x: 0.3, zLead: -0.09, zTrail: 0.068, yBase: 0.011, camber: 0.009, thick: 0.007, spanFrac: 0.6 },
          { x: 0.6, zLead: -0.018, zTrail: 0.098, yBase: 0.004, camber: 0.006, thick: 0.0045, spanFrac: 0.8 },
          { x: 0.84, zLead: 0.068, zTrail: 0.136, yBase: -0.003, camber: 0.003, thick: 0.0024, spanFrac: 0.94 },
          { x: 0.98, zLead: 0.145, zTrail: 0.172, yBase: -0.008, camber: 0.0015, thick: 0.0012, spanFrac: 1.0 },
        ];
        const albatrossTailGeo = this._createSheetFoilGeometry(
          [
            { x: -0.11, zLead: 0.435, zTrail: 0.565, yBase: 0.012, camber: 0.003, thick: 0.0018, spanFrac: 1.0 },
            { x: -0.06, zLead: 0.41, zTrail: 0.605, yBase: 0.014, camber: 0.004, thick: 0.0032, spanFrac: 0.55 },
            { x: 0.0, zLead: 0.405, zTrail: 0.625, yBase: 0.015, camber: 0.005, thick: 0.0042, spanFrac: 0.0 },
            { x: 0.06, zLead: 0.41, zTrail: 0.605, yBase: 0.014, camber: 0.004, thick: 0.0032, spanFrac: 0.55 },
            { x: 0.11, zLead: 0.435, zTrail: 0.565, yBase: 0.012, camber: 0.003, thick: 0.0018, spanFrac: 1.0 },
          ],
          ({ isUpper, chordFrac }) => {
            if (chordFrac < 0.25) return [0.85, 0.86, 0.88];
            return isUpper ? [0.16, 0.12, 0.1] : [0.22, 0.18, 0.16];
          }
        );
        return {
          bodyGeo: this._createBirdBodyGeometry('albatross'),
          tailGeo: albatrossTailGeo,
          innerRightGeo: this._createSheetFoilGeometry(albatrossInnerRightSt, albatrossWingColor),
          innerLeftGeo: this._createSheetFoilGeometry(
            mirrorWingStations(albatrossInnerRightSt),
            albatrossWingColor
          ),
          outerRightGeo: this._createSheetFoilGeometry(albatrossOuterRightSt, albatrossWingColor),
          outerLeftGeo: this._createSheetFoilGeometry(
            mirrorWingStations(albatrossOuterRightSt),
            albatrossWingColor
          ),
          eyeGeo: makeUniformColorSphere(0.0115, 0.05, 0.04, 0.04),
          legGeo: makeUniformColorShaft(0.01, 0.0078, 0.135, 0.16, 0.15, 0.17, 0, 0, -0.0675, 0),
          footGeo: makeWebbedFootGeo(0.088, 0.16, 0.15, 0.17),
          legLen: 0.135,
          shoulderX: 0.068,
          shoulderY: 0.03,
          shoulderZ: -0.018,
          wristX: 0.64,
          eyePos: { x: 0.044, y: 0.036, z: -0.42 },
          footPos: { x: 0.036, y: -0.034, z: 0.035 },
        };
      })(),
    };
  }

  /**
   * Instantiates an articulated, vertex-colored 3D White Tern ('white_tern'),
   * Sooty Tern ('sooty_tern'), Brown Booby ('brown_booby'), Red Kura Bird ('red_kura'),
   * or Black-footed Albatross ('albatross' / Ka'upu).
   */
  createSeabird(species = 'white_tern', { opaque = false } = {}) {
    this._ensureSeabirdAssets();
    const key =
      species === 'brown_booby'
        ? 'brown_booby'
        : species === 'red_kura'
          ? 'red_kura'
          : species === 'sooty_tern'
            ? 'sooty_tern'
            : species === 'albatross'
              ? 'albatross'
              : 'white_tern';
    const spec = this._seabirdGeos[key];
    const isBooby = key === 'brown_booby';
    const isKura = key === 'red_kura';
    const isSooty = key === 'sooty_tern';
    const isAlbatross = key === 'albatross';

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: isBooby ? 0.62 : isKura ? 0.48 : isAlbatross ? 0.58 : 0.52,
      metalness: 0.04,
      emissive: isBooby
        ? 0x3b281a
        : isKura
          ? 0x6b1412
          : isSooty
            ? 0x262e38
            : isAlbatross
              ? 0x3a2f28
              : 0xdce6f2,
      emissiveIntensity: isBooby || isSooty || isAlbatross ? 0.16 : isKura ? 0.24 : 0.22,
      transparent: !opaque,
      opacity: 1.0,
    });

    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const body = new THREE.Mesh(spec.bodyGeo, mat);
    const tail = new THREE.Mesh(spec.tailGeo, mat);
    bodyPivot.add(body, tail);

    const legPivots = [];
    // Eyes & articulated legs + webbed feet
    for (const side of [-1, 1]) {
      if (spec.irisGeo) {
        const iris = new THREE.Mesh(spec.irisGeo, mat);
        iris.position.set(side * spec.eyePos.x, spec.eyePos.y, spec.eyePos.z);
        iris.scale.set(0.55, 1.0, 1.0);
        bodyPivot.add(iris);
      }
      const eye = new THREE.Mesh(spec.eyeGeo, mat);
      eye.position.set(
        side * (spec.eyePos.x + (spec.irisGeo ? 0.003 : 0.0)),
        spec.eyePos.y,
        spec.eyePos.z
      );
      eye.scale.set(0.6, 1.0, 1.0);
      bodyPivot.add(eye);

      const legPivot = new THREE.Group();
      legPivot.position.set(side * spec.footPos.x, spec.footPos.y, spec.footPos.z);
      legPivot.rotation.x = -1.42; // Tucked neatly under tail during flight
      const legMesh = new THREE.Mesh(spec.legGeo, mat);
      const footMesh = new THREE.Mesh(spec.footGeo, mat);
      footMesh.position.set(0, -spec.legLen, 0);
      legPivot.add(legMesh, footMesh);
      root.add(legPivot);
      legPivots.push(legPivot);
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

    bodyPivot.add(rightInnerWing, leftInnerWing);

    const entry = {
      root,
      bodyPivot,
      species: key,
      mat,
      leftLegPivot: legPivots[0],
      rightLegPivot: legPivots[1],
      leftInnerWing,
      leftOuterWing,
      rightInnerWing,
      rightOuterWing,
      standFootHeight: Math.abs(spec.footPos.y) + spec.legLen + 0.008,
      bobY: 0.0,
    };
    root.userData.seabird = entry;
    return entry;
  }

  /**
   * Animates species-distinct 2-joint wingbeats, plus optional landing/standing/wing-spread poses.
   */
  animateSeabird(entry, elapsedSec, phaseOffset = 0.0, speedScale = 1.0, poseOpts = null) {
    if (!entry) return;
    const isBooby = entry.species === 'brown_booby';
    const isKura = entry.species === 'red_kura';
    const isAlbatross = entry.species === 'albatross';
    const baseFreq = isAlbatross ? 4.1 : isBooby ? 8.2 : isKura ? 8.8 : 7.2;
    const flapSpeed = poseOpts?.flapSpeed ?? 1.0;
    const flapAmp = poseOpts?.flapAmp ?? 1.0;

    let theta;
    if (entry._lastAnimSec !== undefined && elapsedSec >= entry._lastAnimSec) {
      const dtAnim = Math.min(0.1, elapsedSec - entry._lastAnimSec);
      entry._wingPhase =
        (entry._wingPhase ?? elapsedSec * baseFreq * speedScale + phaseOffset) +
        dtAnim * baseFreq * speedScale * flapSpeed;
      theta = entry._wingPhase;
    } else {
      entry._wingPhase = elapsedSec * baseFreq * speedScale + phaseOffset;
      theta = entry._wingPhase;
    }
    entry._lastAnimSec = elapsedSec;

    let innerFly;
    let outerFly;
    let bobFly;
    if (isAlbatross) {
      // Dynamic soaring: long serene gull-arch glides punctuated by slow sweeping wingbeats every ~9s
      const cycle = ((elapsedSec * 0.42 * speedScale + phaseOffset * 0.3) % 4.0 + 4.0) % 4.0;
      const beatEnv = smoothstep(0.0, 0.25, cycle) * smoothstep(1.35, 0.95, cycle);
      const userGlide = poseOpts?.glideBlend;
      const soarMix = userGlide !== undefined ? clamp01(userGlide) : 1.0 - beatEnv;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const flapInner = (sinT * 0.28 + 0.04) * flapAmp;
      const flapOuter = (-0.2 * Math.max(0.0, sinT) - 0.14 * cosT - 0.05) * flapAmp;
      const gustFlex = Math.sin(elapsedSec * 1.45 + phaseOffset) * 0.025;
      const soarInner = 0.11 + gustFlex * 0.4;
      const soarOuter = -0.075 - gustFlex;
      innerFly = lerp(flapInner, soarInner, soarMix);
      outerFly = lerp(flapOuter, soarOuter, soarMix);
      bobFly = lerp(-sinT * 0.018 * flapAmp, gustFlex * 0.35, soarMix);
    } else if (isBooby) {
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const wave = sinT + 0.16 * Math.sin(2.0 * theta);
      innerFly = (wave * 0.36 + 0.04) * flapAmp;
      outerFly = (-0.2 * Math.max(0.0, wave) - 0.14 * cosT - 0.04) * flapAmp;
      bobFly = -wave * 0.022 * flapAmp;
    } else if (isKura) {
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      innerFly = (sinT * 0.44 + 0.08) * flapAmp;
      outerFly = (-0.28 * Math.max(0.0, sinT) - 0.2 * cosT - 0.06) * flapAmp;
      bobFly = -sinT * 0.028 * flapAmp;
    } else {
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      innerFly = (sinT * 0.48 + 0.09) * flapAmp;
      outerFly = (-0.34 * Math.max(0.0, sinT) - 0.24 * cosT - 0.07) * flapAmp;
      bobFly = -sinT * 0.034 * flapAmp;
    }

    if (!poseOpts) {
      entry.rightInnerWing.rotation.set(0.0, 0.0, innerFly);
      entry.leftInnerWing.rotation.set(0.0, 0.0, -innerFly);
      entry.rightOuterWing.rotation.set(0.0, 0.0, outerFly);
      entry.leftOuterWing.rotation.set(0.0, 0.0, -outerFly);
      entry.rightOuterWing.scale.x = 1.0;
      entry.leftOuterWing.scale.x = 1.0;
      if (entry.bodyPivot) {
        const autoBank = isAlbatross ? Math.sin(elapsedSec * 0.55 + phaseOffset) * 0.38 : 0.0;
        entry.bodyPivot.rotation.set(0.0, 0.0, autoBank);
      }
      if (entry.leftLegPivot) entry.leftLegPivot.rotation.x = -1.42;
      if (entry.rightLegPivot) entry.rightLegPivot.rotation.x = -1.42;
      entry.bobY = bobFly;
      return;
    }

    const fold = clamp01(poseOpts.foldBlend ?? 0.0);
    const spread = clamp01(poseOpts.spreadBlend ?? 0.0);
    const legExtend = clamp01(poseOpts.legExtend ?? 0.0);
    const standBlend = clamp01(poseOpts.standBlend ?? 0.0);
    const pitchRad = poseOpts.pitchRad ?? 0.0;
    const lookYawRad = poseOpts.lookYawRad ?? 0.0;
    const bankRad = (poseOpts.bankRad ?? 0.0) * (1.0 - fold);

    // 1. Blend flapping wing pose toward folded standing pose
    let innerX = lerp(0.0, 0.14, fold);
    let innerY = lerp(0.0, -1.26, fold);
    let innerZ = lerp(innerFly, -0.26, fold);

    let outerY = lerp(0.0, -0.24, fold);
    let outerZ = lerp(outerFly, -0.14, fold);
    let outerScaleX = lerp(1.0, 0.58, fold);

    // 2. Blend in wide poised wing-spread just before jumping into flight
    if (spread > 0.001) {
      innerX = lerp(innerX, -0.1, spread);
      innerY = lerp(innerY, 0.0, spread);
      innerZ = lerp(innerZ, 0.36, spread);
      outerY = lerp(outerY, 0.0, spread);
      outerZ = lerp(outerZ, -0.18, spread);
      outerScaleX = lerp(outerScaleX, 1.0, spread);
    }

    entry.rightInnerWing.rotation.set(innerX, innerY, innerZ);
    entry.leftInnerWing.rotation.set(innerX, -innerY, -innerZ);
    entry.rightOuterWing.rotation.set(0.0, outerY, outerZ);
    entry.leftOuterWing.rotation.set(0.0, -outerY, -outerZ);
    entry.rightOuterWing.scale.x = outerScaleX;
    entry.leftOuterWing.scale.x = outerScaleX;

    if (entry.bodyPivot) {
      const chestUp = standBlend * 0.36;
      const crouchPitch = spread * -0.14;
      entry.bodyPivot.rotation.set(pitchRad + chestUp + crouchPitch, lookYawRad, bankRad);
    }

    const legX = lerp(-1.42, 0.0, legExtend);
    if (entry.leftLegPivot) entry.leftLegPivot.rotation.x = legX;
    if (entry.rightLegPivot) entry.rightLegPivot.rotation.x = legX;

    entry.bobY = bobFly * (1.0 - fold) + standBlend * Math.sin(elapsedSec * 2.1 + phaseOffset) * 0.004;
  }

  _buildHomingBirdFlocks() {
    // 8 homing seabird slots flying in purposeful straight rays along nearest Ring 1+ island bearing,
    // carrying sculpted White Tern, Brown Booby, and Manuae-exclusive Red Kura assemblies.
    this.homingBirds = [];
    this._activeBirdSpecies = 'white_tern';
    this.birdFlockGroup = new THREE.Group();
    this.group.add(this.birdFlockGroup);

    for (let i = 0; i < 8; i += 1) {
      const bird = new THREE.Group();
      const ternEntry = this.createSeabird('white_tern', { opaque: false });
      const sootyEntry = this.createSeabird('sooty_tern', { opaque: false });
      const boobyEntry = this.createSeabird('brown_booby', { opaque: false });
      const kuraEntry = this.createSeabird('red_kura', { opaque: false });
      sootyEntry.root.visible = false;
      boobyEntry.root.visible = false;
      kuraEntry.root.visible = false;

      bird.add(ternEntry.root, sootyEntry.root, boobyEntry.root, kuraEntry.root);
      this.birdFlockGroup.add(bird);

      this.homingBirds.push({
        bird,
        ternEntry,
        sootyEntry,
        boobyEntry,
        kuraEntry,
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

  _buildPelagicAlbatross() {
    // 1-2 solitary open-ocean Ka'upu (Black-footed Albatross) gliding outside Ring 1
    // across Act III and Rapa Nui crossings, sweeping beside/ahead of the bows with zero sail contact.
    this.pelagicAlbatrossGroup = new THREE.Group();
    this.group.add(this.pelagicAlbatrossGroup);
    this.pelagicAlbatrosses = [];

    const specs = [
      {
        side: 1,
        scale: 0.96,
        baseX: 9.2,
        ampX: 3.6,
        baseZ: -14.2,
        ampZ: 8.6,
        baseY: 2.3,
        ampY: 2.9,
        omega: 0.29,
        phase: 0.4,
        longRouteOnly: false,
      },
      {
        side: -1,
        scale: 0.86,
        baseX: -9.6,
        ampX: 3.8,
        baseZ: -16.8,
        ampZ: 9.2,
        baseY: 2.8,
        ampY: 3.1,
        omega: 0.25,
        phase: 2.65,
        longRouteOnly: true,
      },
    ];

    for (const s of specs) {
      const entry = this.createSeabird('albatross', { opaque: false });
      entry.root.scale.setScalar(s.scale);
      entry.root.visible = false;
      this.pelagicAlbatrossGroup.add(entry.root);
      this.pelagicAlbatrosses.push({ entry, ...s });
    }
  }

  _evalPelagicAlbatrossLocalPos(spec, t) {
    const rawX =
      spec.baseX +
      spec.side * (spec.ampX * Math.sin(t) + 0.95 * Math.sin(t * 2.0));
    const rawZ = spec.baseZ + spec.ampZ * Math.cos(t);
    const waveSurge = 0.5 - 0.5 * Math.cos(t * 2.0);
    const rawY = spec.baseY + spec.ampY * waveSurge;

    // Enforce hard clearance envelope around canoe hulls, masts & crab-claw sails
    const minClearX = 4.35;
    let x = rawX;
    if (rawY < 10.8 && rawZ > -10.5 && rawZ < 9.2 && Math.abs(x) < minClearX) {
      x = spec.side * minClearX;
    }
    return { x, y: rawY, z: rawZ };
  }

  _updatePelagicAlbatross(oceanSim, elapsedSec, fadeDt) {
    if (!this.pelagicAlbatrossGroup || !this.pelagicAlbatrosses?.length) return;
    const s = oceanSim.song;
    const isRapaRoute = s?.toIsland === 'rapa_nui' || s?.fromIsland === 'rapa_nui';
    const isAct3Route =
      s?.act === 3 ||
      oceanSim.activeIslands?.[s?.toIsland]?.basinId === 'act3_mist_isles' ||
      oceanSim.activeIslands?.[s?.fromIsland]?.basinId === 'act3_mist_isles';
    const isEligible = Boolean(s && (isAct3Route || isRapaRoute));

    const r1 = Math.max(0.5, oceanSim.ringRadii?.ring1 ?? 1.85);
    const nearestDet = oceanSim.detections?.[0];
    // Strictly outside Ring 1 of every island
    const deepWaterEnv = nearestDet
      ? smoothstep(r1 * 1.0, r1 * 1.24, nearestDet.distanceUnits)
      : 1.0;

    const targetAlpha = isEligible ? deepWaterEnv : 0.0;
    this.albatrossAlpha = easeToward(this.albatrossAlpha, targetAlpha, fadeDt, 1.35);

    if (this.albatrossAlpha <= 0.004) {
      this.pelagicAlbatrossGroup.visible = false;
      return;
    }

    this.pelagicAlbatrossGroup.visible = true;
    const isLongRoute = isRapaRoute || (s?.expectedDurationMin ?? 0) >= 7.8;

    for (const a of this.pelagicAlbatrosses) {
      if (a.longRouteOnly && !isLongRoute) {
        a.entry.root.visible = false;
        continue;
      }
      const ph = elapsedSec * a.omega + a.phase;
      const dtSample = 0.04;
      const pPrev = this._evalPelagicAlbatrossLocalPos(a, ph - dtSample);
      const pCur = this._evalPelagicAlbatrossLocalPos(a, ph);
      const pNext = this._evalPelagicAlbatrossLocalPos(a, ph + dtSample);

      const vx = (pNext.x - pPrev.x) / (2.0 * dtSample);
      const vy = (pNext.y - pPrev.y) / (2.0 * dtSample);
      const vz = (pNext.z - pPrev.z) / (2.0 * dtSample);
      const horizSpeed = Math.max(0.01, Math.hypot(vx, vz));

      const ax = (pNext.x - 2.0 * pCur.x + pPrev.x) / (dtSample * dtSample);
      const az = (pNext.z - 2.0 * pCur.z + pPrev.z) / (dtSample * dtSample);
      const turnSigned = (vx * az - vz * ax) / Math.max(1.0, horizSpeed * horizSpeed);
      const bankRad = Math.max(-0.68, Math.min(0.68, turnSigned * 0.42 + Math.sin(ph) * 0.22));
      const pitchRad = Math.atan2(vy, horizSpeed) * 0.85;
      const yawRad = Math.atan2(-vx, -vz);

      // Slow occasional climb wingbeats near crest bottom-to-top pullup, otherwise serene glide
      const beatPulse = Math.max(0.0, Math.sin(ph * 0.5) - 0.58) / 0.42;
      const glideBlend = clamp01(1.0 - beatPulse * 0.72);

      this.animateSeabird(a.entry, elapsedSec, a.phase, 0.75, {
        glideBlend,
        bankRad,
        pitchRad,
      });

      a.entry.root.position.set(pCur.x, pCur.y + a.entry.bobY, pCur.z);
      a.entry.root.rotation.set(0.0, yawRad, 0.0);

      const useTrans = this.albatrossAlpha < 0.995;
      a.entry.mat.opacity = this.albatrossAlpha;
      a.entry.mat.depthWrite = this.albatrossAlpha > 0.25;
      if (a.entry.mat.transparent !== useTrans) {
        a.entry.mat.transparent = useTrans;
        a.entry.mat.needsUpdate = true;
      }
      a.entry.root.visible = true;
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
    const frondGeo = createSculptedPalmFrondGeometry({
      length: 2.35,
      maxWidth: 0.72,
      archHeight: 0.1,
      tipDroop: 0.06,
      lengthSegs: 13,
    });
    // Align centered along local XY so existing `rotation.x = -PI/2` & `rotation.z` drift logic stays exact
    frondGeo.translate(0, 0, -1.175);
    frondGeo.rotateX(Math.PI * 0.5);

    this.fronds = [];
    for (let i = 0; i < 12; i += 1) {
      const mat = baseFrondMat.clone();
      const mesh = new THREE.Mesh(frondGeo, mat);
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
    this._remixMarchingTradeClouds();
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
    const sunVec = altAzToDirectionVec3(sun.altDeg, sun.azDeg, headingDeg);
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
    const marchYawRad = Math.atan2(marchDirX, marchDirZ);

    const targetTradeOpacity = isFog ? 0.12 : 1.0;
    this.tradeFogOpacity = easeToward(this.tradeFogOpacity, targetTradeOpacity, fadeDt, 1.15);

    const launchTradeMask = launchAnim?.active
      ? smoothstep(0.45, 0.95, launchAnim.rawT ?? 0.0)
      : 1.0;

    for (const tc of this.tradeClouds) {
      const nextProgress = tc.progress + dtSec * 0.014 * tc.speedMul;
      if (nextProgress >= 1.0) {
        tc.progress = nextProgress % 1.0;
        // Re-shuffle cloud variation, lane, altitude, scale & yaw invisibly at horizon wrap
        this._assignMixedTradeCloudTraits(tc);
      } else {
        tc.progress = nextProgress;
      }

      const along = (tc.progress - 0.5) * 860.0;
      tc.mesh.position.set(
        marchDirX * along + perpX * tc.lateralOffset,
        tc.altY,
        marchDirZ * along + perpZ * tc.lateralOffset
      );
      tc.mesh.rotation.y = marchYawRad + tc.yawJitter;

      // Smooth horizon fade-in (0.0 -> 0.16) and fade-out (0.84 -> 1.0) so wrap-around is invisible
      const horizonEnv =
        smoothstep(0.0, 0.16, tc.progress) *
        smoothstep(0.0, 0.16, 1.0 - tc.progress);
      const opacity = this.tradeFogOpacity * horizonEnv * launchTradeMask;
      tc.opacity = opacity;
      tc.mesh.scale.setScalar(tc.baseScale * (0.84 + 0.16 * horizonEnv));
      tc.mesh.visible = opacity > 0.004;

      if (tc.mesh.visible) {
        updateCloudMaterialUniforms(tc.mat, {
          sunDir: sunVec,
          daylight: sun.daylightFactor,
          twilight: sun.twilightFactor,
          opacity,
          lapaGlow: 0.0,
          elapsedSec,
        });
      }
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

      const landEntryDist = isl?.peaksPierceFog ? r2 * 1.08 : r3 * 1.25;
      const landFullAlphaDist = Math.max(r4, landEntryDist * 0.78);
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
            ? smoothstep(landEntryDist, r4 * 0.15, distUnits)
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
      const shoreRadiusM = getIslandShoreRadiusM(isl?.id, isl?.archetype);
      const minOpenSeaDist = Math.max(92.0, shoreRadiusM + 50.0);
      const baseVisualDist = minOpenSeaDist + normDist * 460.0;
      let visualDist = baseVisualDist;

      if (isLandfallTarget) {
        if (slot.landfallStartVisualDist === null) {
          slot.landfallStartVisualDist = baseVisualDist;
        }
        const endVisualDist =
          (landfallAnim.bowStopZAbs ?? 30.63) +
          shoreRadiusM +
          (landfallAnim.shoreGapM ?? 3.2);
        const glide = Math.max(0.0, Math.min(1.0, landfallAnim.glide ?? 0.0));
        visualDist =
          slot.landfallStartVisualDist +
          (endVisualDist - slot.landfallStartVisualDist) * glide;
      } else if (isLaunchOrigin) {
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
        updateCloudMaterialUniforms(slot.cloudMat, {
          sunDir: sunVec,
          daylight: sun.daylightFactor,
          twilight: sun.twilightFactor,
          opacity: slot.peakAlpha,
          lapaGlow: 0.0,
          elapsedSec,
        });
        slot.peakCloud.scale.setScalar(0.84 + 0.16 * slot.peakAlpha);
      }

      // Coral Atoll Lapa Cloud ease-in / fade-out
      slot.lapaCloud.visible = slot.lapaAlpha > 0.003;
      if (slot.lapaCloud.visible) {
        updateCloudMaterialUniforms(slot.lapaMat, {
          sunDir: sunVec,
          daylight: sun.daylightFactor,
          twilight: sun.twilightFactor,
          opacity: slot.lapaAlpha,
          lapaGlow: 1.0,
          elapsedSec,
        });
        slot.lapaCloud.scale.setScalar(0.86 + 0.14 * slot.lapaAlpha);
      }

      // 3D Island Landmass smooth horizon rise + scale growth & sea-haze fade
      slot.landGroup.visible = slot.landAlpha > 0.003;
      if (slot.landGroup.visible && isl) {
        const riseT = Math.max(0.0, Math.min(1.0, slot.riseFactor));
        const landScale = 0.08 + 0.92 * riseT;
        slot.landGroup.scale.setScalar(landScale);

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
          slot.landGroup.position.y =
            -detailed.sinkDepthM * 0.1 * (1.0 - riseT);
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

          const baseSink = isAtoll ? 9.5 : 58.0;
          slot.landGroup.position.y = -baseSink * 0.1 * (1.0 - riseT);
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

      this._activeBirdSpecies =
        nearestRing1.island.birdSpecies === 'red_kura'
          ? 'red_kura'
          : nearestRing1.island.birdSpecies === 'sooty_tern'
            ? 'sooty_tern'
            : nearestRing1.island.birdSpecies === 'brown_booby' ||
                nearestRing1.island.birdSpecies === 'booby'
              ? 'brown_booby'
              : 'white_tern';
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
        const activeEntry =
          this._activeBirdSpecies === 'red_kura'
            ? b.kuraEntry
            : this._activeBirdSpecies === 'sooty_tern'
              ? b.sootyEntry
              : this._activeBirdSpecies === 'brown_booby'
                ? b.boobyEntry
                : b.ternEntry;
        b.ternEntry.root.visible = activeEntry === b.ternEntry;
        b.sootyEntry.root.visible = activeEntry === b.sootyEntry;
        b.boobyEntry.root.visible = activeEntry === b.boobyEntry;
        b.kuraEntry.root.visible = activeEntry === b.kuraEntry;

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

    this._updatePelagicAlbatross(oceanSim, elapsedSec, fadeDt);

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

    // Refresh active 3D cloud world transforms for exact star & star-label occlusion
    this._refreshActiveCloudOccluders();
  }

  _pushCloudOccluder(count, cloudMesh, archetypeKey, spec, opacity) {
    cloudMesh.updateWorldMatrix(true, false);
    const mw = cloudMesh.matrixWorld;
    const e = mw.elements;

    let entry = this._occluderPool[count];
    if (!entry) {
      entry = {
        archetypeKey: 'trade_0',
        opacity: 1.0,
        wx: 0.0,
        wy: 0.0,
        wz: 0.0,
        wRadiusSq: 1.0,
        invMat: new THREE.Matrix4(),
      };
      this._occluderPool.push(entry);
    }

    const bs = spec.boundingSphere;
    entry.archetypeKey = archetypeKey;
    entry.opacity = opacity;
    entry.wx = e[0] * bs.cx + e[4] * bs.cy + e[8] * bs.cz + e[12];
    entry.wy = e[1] * bs.cx + e[5] * bs.cy + e[9] * bs.cz + e[13];
    entry.wz = e[2] * bs.cx + e[6] * bs.cy + e[10] * bs.cz + e[14];

    const scaleX = Math.hypot(e[0], e[1], e[2]);
    const scaleY = Math.hypot(e[4], e[5], e[6]);
    const scaleZ = Math.hypot(e[8], e[9], e[10]);
    const maxScale = Math.max(scaleX, scaleY, scaleZ);
    const wRad = bs.radius * maxScale + 1.5;
    entry.wRadiusSq = wRad * wRad;
    entry.invMat.copy(mw).invert();

    this._activeCloudOccluders.push(entry);
    return count + 1;
  }

  _refreshActiveCloudOccluders() {
    this._activeCloudOccluders.length = 0;
    if (!this.group.visible) return;

    let count = 0;
    if (this.tradeCloudGroup.visible) {
      for (const tc of this.tradeClouds) {
        if (tc.mesh.visible && tc.opacity > 0.025) {
          count = this._pushCloudOccluder(
            count,
            tc.cloudMesh,
            tc.archetypeKey,
            tc.spec,
            tc.opacity
          );
        }
      }
    }

    for (const slot of this.islandSlots) {
      if (!slot.root.visible) continue;
      if (slot.peakCloud.visible && slot.peakAlpha > 0.025) {
        count = this._pushCloudOccluder(
          count,
          slot.peakCloudMesh,
          'peak',
          slot.peakCloudSpec,
          slot.peakAlpha
        );
      }
      if (slot.lapaCloud.visible && slot.lapaAlpha > 0.025) {
        count = this._pushCloudOccluder(
          count,
          slot.lapaCloudMesh,
          'lapa',
          slot.lapaCloudSpec,
          slot.lapaAlpha
        );
      }
    }
  }

  /**
   * Computes exact optical transmittance in [0.0, 1.0] along a world-space ray
   * from `rayOrigin` (`{x, y, z}`) along unit `rayDir` (`{x, y, z}`) across all
   * active 3D clouds (`tradeClouds`, `peakCloud`, `lapaCloud`).
   *  - 1.0 = completely clear of 3D clouds
   *  - 0.0 = blocked by a cloud body (hides stars, constellation lines & star labels)
   */
  getCloudTransmittance(rayOrigin, rayDir) {
    const occluders = this._activeCloudOccluders;
    const n = occluders.length;
    if (n === 0 || !this.group.visible) return 1.0;

    const ox = rayOrigin.x;
    const oy = rayOrigin.y;
    const oz = rayOrigin.z;
    const dx = rayDir.x;
    const dy = rayDir.y;
    const dz = rayDir.z;

    let totalTau = 0.0;

    for (let i = 0; i < n; i += 1) {
      const oc = occluders[i];
      const vx = oc.wx - ox;
      const vy = oc.wy - oy;
      const vz = oc.wz - oz;
      const distSq = vx * vx + vy * vy + vz * vz;
      const tProj = vx * dx + vy * dy + vz * dz;

      if (distSq > oc.wRadiusSq && tProj <= 0.0) continue;
      const perpSq = distSq - tProj * tProj;
      if (perpSq >= oc.wRadiusSq) continue;

      const m = oc.invMat.elements;
      const lox = m[0] * ox + m[4] * oy + m[8] * oz + m[12];
      const loy = m[1] * ox + m[5] * oy + m[9] * oz + m[13];
      const loz = m[2] * ox + m[6] * oy + m[10] * oz + m[14];

      let ldx = m[0] * dx + m[4] * dy + m[8] * dz;
      let ldy = m[1] * dx + m[5] * dy + m[9] * dz;
      let ldz = m[2] * dx + m[6] * dy + m[10] * dz;
      const lLen = Math.hypot(ldx, ldy, ldz);
      if (lLen < 1e-7) continue;
      const invLen = 1.0 / lLen;
      ldx *= invLen;
      ldy *= invLen;
      ldz *= invLen;

      const tau =
        sampleCloudLocalRayOpticalDepth(
          oc.archetypeKey,
          lox,
          loy,
          loz,
          ldx,
          ldy,
          ldz
        ) * oc.opacity;

      if (tau > 0.0) {
        totalTau += tau;
        if (totalTau >= 5.2) return 0.0;
      }
    }

    if (totalTau <= 0.001) return 1.0;
    return Math.exp(-totalTau);
  }
}
