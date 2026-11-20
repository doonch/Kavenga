/**
 * Optional 3D Walkable Island Scene & Character Controller for Kavenga: Songs of the Star Path.
 *
 * Mounts the EXACT canonical 3D island assembly (`IslandTerrainBuilder`) seen from the ocean,
 * in `map.html`, in `asset-viewer.html`, and in the Shore Diorama Stage — guaranteeing a single
 * unified 3D island model everywhere in the game.
 *
 * Rasterizes the canonical terrain mesh's triangles into a fast `Float32Array` heightmap on
 * entry so the articulated barefoot wayfinder walks smoothly across the real beaches, bluffs,
 * bays, and Moai terraces with proximity POI detection and third-person camera follow.
 */

import * as THREE from 'three';
import {
  computeSailVariantColors,
  Difficulty,
  wrapDeg180,
} from '../core/gameConstants.js';
import { ISLANDS } from '../data/islandsData.js';
import {
  RAIATEA_WALKABLE_SPEC,
  getWalkableIslandSpec,
} from '../data/walkableIslandsData.js';
import {
  createSculptedCloudMesh,
  updateCloudMaterialUniforms,
} from './CloudSculptBuilder.js';
import {
  applyDetailedIslandAlpha,
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
} from './IslandTerrainBuilder.js';
import {
  createCarvedStandingStoneGroup,
  createKukuiTorchGroup,
  createPandanusSailFrameGroup,
  createSailDyeVatsCluster,
  makeStoneRockGeometry,
} from './IslandPropsBuilder.js';
import {
  animatePlayerCharacterAshore,
  createPlayerCharacterRig,
} from './PlayerCharacterBuilder.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v) {
  return Math.max(0.0, Math.min(1.0, v));
}

function smoothstep(e0, e1, x) {
  if (Math.abs(e1 - e0) < 1e-6) return x >= e1 ? 1.0 : 0.0;
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3.0 - 2.0 * t);
}

export class WalkableIslandScene {
  constructor(scene, vakaRenderer, labelLayerEl, worldCues = null) {
    this.scene = scene;
    this.vakaRenderer = vakaRenderer;
    this.labelLayerEl = labelLayerEl;
    this.worldCues = worldCues;
    this.spec = RAIATEA_WALKABLE_SPEC;

    this.root = new THREE.Group();
    this.root.visible = false;
    this.scene.add(this.root);

    this.active = false;
    this.gridHalfSpan = 115.0;
    this.gridN = 200;
    this.heightGrid = new Float32Array((this.gridN + 1) * (this.gridN + 1));

    // Player ashore state
    this.playerPos = new THREE.Vector3(
      this.spec.initialSpawn.x,
      0.0,
      this.spec.initialSpawn.z
    );
    this.playerYawRad = this.spec.initialSpawn.facingYawRad;
    this.walkAmount = 0.0;
    this.stridePhase = 0.0;
    this.playerRigs = {};
    this.activePlayerRig = null;

    // Third-person island camera orbit state
    this.camYawRad = 0.24;
    this.camPitchRad = 0.31;
    this.camDist = 10.2;
    this.camTarget = new THREE.Vector3();
    this.camDesiredPos = new THREE.Vector3();
    this._isOrbitDragging = false;
    this._lastPtr = { x: 0, y: 0 };

    this.obstacles = [];
    this.poiVisuals = {};
    this.poiBadgeEls = {};
    this.activePoi = null;
    this.torchFlames = [];
    this.lagoonTerns = [];
    this.npcEntries = [];
    this.peakCloudMat = null;
    this.builtIslandId = null;

    this._buildPlayerGroup();
    this._bindCameraPointerOrbit();
  }

  _clearCurrentIslandContent() {
    for (let i = this.root.children.length - 1; i >= 0; i -= 1) {
      const child = this.root.children[i];
      if (child !== this.playerGroup) {
        child.traverse?.((obj) => {
          if (!child.userData?.sharedGeometries && obj.geometry) {
            obj.geometry.dispose?.();
          }
          if (Array.isArray(obj.material)) {
            for (const m of obj.material) m?.dispose?.();
          } else if (obj.material) {
            obj.material.dispose?.();
          }
        });
        this.root.remove(child);
      }
    }
    for (const el of Object.values(this.poiBadgeEls)) {
      el.remove?.();
    }
    this.poiVisuals = {};
    this.poiBadgeEls = {};
    this.torchFlames = [];
    this.lagoonTerns = [];
    this.birdPerchSpots = [];
    this.npcEntries = [];
    this.obstacles = [];
    this.peakCloudMat = null;
    this.dyeBannerMat = null;
  }

  _bakeHeightGridFromCanonicalAssembly(assemblyGroup) {
    const N = this.gridN;
    const stride = N + 1;
    const half = this.gridHalfSpan;
    const span = half * 2.0;
    const invStep = N / span;
    const step = span / N;

    this.heightGrid.fill(-4.0);
    assemblyGroup.updateMatrixWorld(true);

    // Find the primary vertex-colored terrain mesh in the canonical island assembly
    let terrainMesh = null;
    let maxVerts = 0;
    assemblyGroup.traverse((obj) => {
      if (
        obj.isMesh &&
        obj.geometry?.index &&
        obj.geometry?.getAttribute('color')
      ) {
        const cnt = obj.geometry.getAttribute('position').count;
        if (cnt > maxVerts) {
          maxVerts = cnt;
          terrainMesh = obj;
        }
      }
    });

    if (!terrainMesh) return;

    const posAttr = terrainMesh.geometry.getAttribute('position');
    const idxAttr = terrainMesh.geometry.index;
    const mw = terrainMesh.matrixWorld.elements;
    const vCount = posAttr.count;

    const wx = new Float32Array(vCount);
    const wy = new Float32Array(vCount);
    const wz = new Float32Array(vCount);

    for (let i = 0; i < vCount; i += 1) {
      const lx = posAttr.getX(i);
      const ly = posAttr.getY(i);
      const lz = posAttr.getZ(i);
      wx[i] = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
      wy[i] = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
      wz[i] = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];
    }

    const idxArr = idxAttr.array;
    for (let t = 0; t < idxArr.length; t += 3) {
      const i0 = idxArr[t];
      const i1 = idxArr[t + 1];
      const i2 = idxArr[t + 2];
      const x0 = wx[i0];
      const y0 = wy[i0];
      const z0 = wz[i0];
      const x1 = wx[i1];
      const y1 = wy[i1];
      const z1 = wz[i1];
      const x2 = wx[i2];
      const y2 = wy[i2];
      const z2 = wz[i2];

      const denom = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
      if (Math.abs(denom) < 1e-6) continue;
      const invDenom = 1.0 / denom;

      const minX = Math.min(x0, x1, x2);
      const maxX = Math.max(x0, x1, x2);
      const minZ = Math.min(z0, z1, z2);
      const maxZ = Math.max(z0, z1, z2);

      const gx0 = Math.max(0, Math.floor((minX + half) * invStep));
      const gx1 = Math.min(N, Math.ceil((maxX + half) * invStep));
      const gz0 = Math.max(0, Math.floor((minZ + half) * invStep));
      const gz1 = Math.min(N, Math.ceil((maxZ + half) * invStep));

      for (let gz = gz0; gz <= gz1; gz += 1) {
        const pz = -half + gz * step;
        for (let gx = gx0; gx <= gx1; gx += 1) {
          const px = -half + gx * step;
          const w0 =
            ((z1 - z2) * (px - x2) + (x2 - x1) * (pz - z2)) * invDenom;
          const w1 =
            ((z2 - z0) * (px - x2) + (x0 - x2) * (pz - z2)) * invDenom;
          const w2 = 1.0 - w0 - w1;
          if (w0 >= -1e-4 && w1 >= -1e-4 && w2 >= -1e-4) {
            const py = w0 * y0 + w1 * y1 + w2 * y2;
            const cell = gz * stride + gx;
            if (py > this.heightGrid[cell]) {
              this.heightGrid[cell] = py;
            }
          }
        }
      }
    }

    // Fill any single-cell polar pinhole (e.g. r=0.04m center of polar terrain meshes)
    for (let gz = 1; gz < N; gz += 1) {
      for (let gx = 1; gx < N; gx += 1) {
        const cell = gz * stride + gx;
        if (this.heightGrid[cell] > -3.99) continue;
        const n0 = this.heightGrid[cell - 1];
        const n1 = this.heightGrid[cell + 1];
        const n2 = this.heightGrid[cell - stride];
        const n3 = this.heightGrid[cell + stride];
        if (n0 > 0 && n1 > 0 && n2 > 0 && n3 > 0) {
          this.heightGrid[cell] = (n0 + n1 + n2 + n3) * 0.25;
        }
      }
    }
  }

  _loadIsland(islandId) {
    const resolvedId = getWalkableIslandSpec(islandId) ? islandId : 'raiatea';
    if (this.builtIslandId === resolvedId) return;

    this._clearCurrentIslandContent();
    this.spec = getWalkableIslandSpec(resolvedId) || RAIATEA_WALKABLE_SPEC;
    this.gridHalfSpan = this.spec.gridHalfSpan || 115.0;
    this.builtIslandId = resolvedId;

    const scale = this.spec.canonicalScale ?? 1.55;
    const islDef = ISLANDS[resolvedId];

    // 1. Mount the exact canonical 3D island assembly (same model as ocean & Shore Diorama!)
    const asm = createDetailedIslandAssembly(resolvedId);
    applyDetailedIslandAlpha(asm, 1.0);
    asm.group.rotation.y = getIslandApproachOrientationRad(resolvedId);
    asm.group.scale.setScalar(scale);
    asm.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.receiveShadow = true;
      }
    });
    this.root.add(asm.group);

    // 2. Bake walkable ground heightmap directly from canonical terrain triangles
    this._bakeHeightGridFromCanonicalAssembly(asm.group);

    // 3. Crown high islands with their signature stationary peak cumulus cloud
    if (islDef?.hasPeakCloud) {
      const peakH = (islDef.peakHeightM ?? 60.0) * scale;
      const peakSculpt = createSculptedCloudMesh('peak', { opacity: 0.95 });
      peakSculpt.mesh.position.set(0.0, Math.max(68.0, peakH * 0.86 + 18.0), -6.0);
      peakSculpt.mesh.scale.setScalar(1.2);
      this.peakCloudMat = peakSculpt.material;
      this.root.add(peakSculpt.mesh);
    }

    // 4. Add subtle diegetic POI threshold rings, teaching sand circle, NPCs & lagoon terns
    this._buildPoiMarkersAndAshoreProps(resolvedId);
    this._buildPoiWorldLabels();
  }

  _buildSummitStonePath(islandId, basaltMat, coralStoneMat, addKukuiTorch) {
    const trailSpecs = {
      raiatea: {
        waypoints: [
          new THREE.Vector3(4.5, 0, 50.5),
          new THREE.Vector3(14.5, 0, 44.5),
          new THREE.Vector3(21.0, 0, 32.5),
          new THREE.Vector3(17.2, 0, 20.5),
          new THREE.Vector3(10.0, 0, 11.8),
          new THREE.Vector3(3.4, 0, 5.2),
        ],
        steps: 34,
        torches: [
          [5.6, 49.4],
          [22.2, 32.0],
          [11.0, 11.2],
        ],
      },
      tahaa: {
        waypoints: [
          new THREE.Vector3(12.8, 0, 39.2),
          new THREE.Vector3(17.5, 0, 32.0),
          new THREE.Vector3(17.0, 0, 22.0),
          new THREE.Vector3(11.5, 0, 13.5),
          new THREE.Vector3(3.4, 0, 5.0),
        ],
        steps: 34,
        torches: [
          [14.0, 38.2],
          [18.2, 22.0],
          [4.8, 6.2],
        ],
      },
      huahine: {
        waypoints: [
          new THREE.Vector3(24.5, 0, 42.5),
          new THREE.Vector3(23.5, 0, 31.0),
          new THREE.Vector3(22.8, 0, 19.0),
          new THREE.Vector3(22.2, 0, 7.5),
          new THREE.Vector3(22.0, 0, 1.0),
        ],
        steps: 34,
        torches: [
          [25.6, 41.5],
          [24.2, 20.0],
          [23.2, 2.2],
        ],
      },
      hawaii: {
        waypoints: [
          new THREE.Vector3(-20.9, 0, 61.0),
          new THREE.Vector3(-11.8, 0, 60.5),
          new THREE.Vector3(-2.8, 0, 60.0),
          new THREE.Vector3(4.7, 0, 59.6),
        ],
        steps: 22,
        torches: [
          [-18.0, 60.8],
          [-7.5, 60.2],
          [2.0, 59.7],
        ],
      },
      rapa_nui: {
        waypoints: [
          new THREE.Vector3(1.5, 0, 44.5),
          new THREE.Vector3(2.2, 0, 36.5),
          new THREE.Vector3(1.4, 0, 29.0),
          new THREE.Vector3(0.4, 0, 22.2),
        ],
        steps: 22,
        torches: [
          [2.8, 44.0],
          [2.8, 33.0],
          [1.6, 23.2],
        ],
      },
    };

    const spec = trailSpecs[islandId];
    if (!spec) return;

    const curve = new THREE.CatmullRomCurve3(spec.waypoints);
    const stepCount = spec.steps;
    const stepGeo = new THREE.CylinderGeometry(0.58, 0.7, 0.14, 7);
    const kerbGeo = makeStoneRockGeometry(0.25, 11);

    for (let i = 0; i <= stepCount; i += 1) {
      const t = i / stepCount;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const perpX = -tan.z;
      const perpZ = tan.x;
      const perpLen = Math.hypot(perpX, perpZ) || 1.0;
      const nx = perpX / perpLen;
      const nz = perpZ / perpLen;

      // Subtle natural stagger left/right for hand-laid stepping stones
      const stagger = (i % 2 === 0 ? 1 : -1) * 0.24;
      const sx = p.x + nx * stagger;
      const sz = p.z + nz * stagger;
      const sy = this.getGroundHeight(sx, sz);
      if (sy < 0.15) continue;

      // Estimate local forward slope so stepping stone hugs the hillside
      const fDist = 0.65;
      const hAhead = this.getGroundHeight(sx + tan.x * fDist, sz + tan.z * fDist);
      const hBehind = this.getGroundHeight(sx - tan.x * fDist, sz - tan.z * fDist);
      const pitch = Math.atan2(hAhead - hBehind, fDist * 2.0);

      const stone = new THREE.Mesh(
        stepGeo,
        i % 3 === 0 ? coralStoneMat : basaltMat
      );
      stone.position.set(sx, sy + 0.04, sz);
      stone.rotation.order = 'YXZ';
      stone.rotation.y = Math.atan2(tan.x, tan.z) + (i % 5) * 0.18;
      stone.rotation.x = -pitch * 0.85;
      stone.scale.set(
        1.0 + (i % 3) * 0.12,
        1.0,
        0.88 + ((i + 1) % 3) * 0.14
      );
      stone.receiveShadow = true;
      this.root.add(stone);

      // Flanking coral & basalt border kerb stones every step to guide the eye uphill
      for (const side of [-1, 1]) {
        if (i % 2 === 1 && side === -1) continue;
        const kx = p.x + nx * side * (1.12 + (i % 2) * 0.14);
        const kz = p.z + nz * side * (1.12 + (i % 2) * 0.14);
        const ky = this.getGroundHeight(kx, kz);
        if (ky < 0.15) continue;

        const kerb = new THREE.Mesh(
          kerbGeo,
          (i + (side > 0 ? 1 : 0)) % 2 === 0 ? coralStoneMat : basaltMat
        );
        kerb.position.set(kx, ky + 0.08, kz);
        kerb.scale.set(1.25, 0.68, 1.05);
        kerb.rotation.y = i * 0.9 + side;
        kerb.castShadow = true;
        kerb.receiveShadow = true;
        this.root.add(kerb);
      }
    }

    // Warm kukui-nut torch markers at trailhead, ridge bend, and summit approach
    for (const [tx, tz] of spec.torches) {
      addKukuiTorch(tx, tz, 1.65);
    }
  }

  _buildPoiMarkersAndAshoreProps(islandId) {
    const islDef = ISLANDS[islandId];
    const aitoMat = new THREE.MeshStandardMaterial({
      color: 0x623e24,
      roughness: 0.86,
    });
    const sennitMat = new THREE.MeshStandardMaterial({
      color: 0x5c381c,
      roughness: 0.9,
    });
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x3c3936,
      roughness: 0.92,
    });
    const coralStoneMat = new THREE.MeshStandardMaterial({
      color: 0xe6decb,
      roughness: 0.84,
    });
    const reedMat = new THREE.MeshStandardMaterial({
      color: 0xa6804e,
      roughness: 0.85,
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9d3b });

    const mc = this.spec.mooredCanoe;
    this.obstacles.push({ x: mc.x, z: mc.z, r: 4.0 });

    const tMat = (m) => m;
    const addKukuiTorch = (x, z, height = 1.65) => {
      const y = Math.max(0.1, this.getGroundHeight(x, z));
      const torch = createKukuiTorchGroup(tMat, { height });
      torch.group.position.set(x, y, z);
      torch.group.traverse((ch) => {
        if (ch.isMesh) ch.castShadow = true;
      });
      this.torchFlames.push({
        mesh: torch.flame,
        baseY: torch.flame.position.y,
        phase: x * 0.7 + z,
      });

      this.root.add(torch.group);
      this.obstacles.push({ x, z, r: 0.45 });
    };

    this._buildSummitStonePath(
      islandId,
      basaltMat,
      coralStoneMat,
      addKukuiTorch
    );

    for (const poi of this.spec.pois) {
      const groundY = this.getGroundHeight(poi.x, poi.z);
      const py = Math.max(0.14, groundY + 0.06);
      const ringGrp = new THREE.Group();
      ringGrp.position.set(poi.x, py, poi.z);

      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xf4c96b,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(poi.markerRadiusM - 0.18, poi.markerRadiusM, 40),
        outerMat
      );
      outerRing.rotation.x = -Math.PI * 0.5;
      ringGrp.add(outerRing);

      for (let i = 0; i < 12; i += 1) {
        const ang = (i / 12) * Math.PI * 2.0;
        const peb = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.11, 0),
          coralStoneMat
        );
        peb.position.set(
          Math.cos(ang) * poi.markerRadiusM,
          0.02,
          Math.sin(ang) * poi.markerRadiusM
        );
        peb.scale.set(1.2, 0.55, 1.0);
        ringGrp.add(peb);
      }

      // Etched teaching sand circle + sighting post inside the Observation Circle POI
      if (poi.kind === 'circle') {
        const sandBed = new THREE.Mesh(
          new THREE.CylinderGeometry(1.75, 1.85, 0.14, 24),
          coralStoneMat
        );
        sandBed.position.y = 0.06;
        sandBed.receiveShadow = true;
        ringGrp.add(sandBed);

        for (const sr of [0.55, 1.05, 1.48]) {
          const groove = new THREE.Mesh(
            new THREE.RingGeometry(sr - 0.03, sr + 0.03, 28),
            reedMat
          );
          groove.rotation.x = -Math.PI * 0.5;
          groove.position.y = 0.14;
          ringGrp.add(groove);
        }

        const centerPou = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.06, 1.25, 7),
          aitoMat
        );
        centerPou.position.y = 0.68;
        centerPou.castShadow = true;
        ringGrp.add(centerPou);

        for (let s = 0; s < 6; s += 1) {
          const sAng = (s / 6) * Math.PI * 2.0 + 0.52;
          const stone = createCarvedStandingStoneGroup(tMat, {
            width: 0.48,
            height: 1.15,
            depth: 0.28,
            colorHex: 0x3c3936,
          });
          stone.group.position.set(
            Math.cos(sAng) * (poi.markerRadiusM - 0.35),
            0.0,
            Math.sin(sAng) * (poi.markerRadiusM - 0.35)
          );
          stone.group.rotation.y = -sAng + Math.PI * 0.5;
          stone.mesh.castShadow = true;
          ringGrp.add(stone.group);
        }
        this.obstacles.push({ x: poi.x, z: poi.z, r: 1.55 });
      }

      // Carved Sail-Dyeing Vats & drying pandanus sail-cloth banner on Mo'orea
      if (poi.kind === 'sail_dye') {
        const vatsCluster = createSailDyeVatsCluster(
          tMat,
          [0xb83227, 0xd9a441, 0x2ea89c],
          1.15
        );
        vatsCluster.group.traverse((ch) => {
          if (ch.isMesh) {
            ch.castShadow = true;
            ch.receiveShadow = true;
          }
        });
        ringGrp.add(vatsCluster.group);

        const sailFrame = createPandanusSailFrameGroup(tMat, {
          sailColorHex: 0xe6cfa3,
          width: 2.25,
          height: 1.38,
          arched: false,
        });
        sailFrame.group.position.set(0.0, 0.0, -0.55);
        sailFrame.group.traverse((ch) => {
          if (ch.isMesh) ch.castShadow = true;
        });
        this.dyeBannerMat = sailFrame.sailMat;
        ringGrp.add(sailFrame.group);

        this.obstacles.push({ x: poi.x, z: poi.z, r: 1.65 });
      }

      // Add welcoming 3D Artisan & Elder figures on inhabited islands
      if (islDef?.inhabited && (poi.kind === 'hut' || poi.kind === 'elder')) {
        const isElder = poi.kind === 'elder';
        const npcRig = createPlayerCharacterRig(
          isElder ? Difficulty.MASTER_NAVIGATOR : Difficulty.MEDIUM
        );
        const standX = poi.x + (isElder ? 1.1 : -0.9);
        const standZ = poi.z - 0.8;
        const standY = Math.max(0.08, this.getGroundHeight(standX, standZ));
        npcRig.root.position.set(standX, standY, standZ);
        const toSpawnAngle = Math.atan2(
          -(this.spec.initialSpawn.x - standX),
          -(this.spec.initialSpawn.z - standZ)
        );
        npcRig.root.rotation.y = toSpawnAngle;

        if (isElder) {
          const staff = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.018, 1.82, 7),
            aitoMat
          );
          staff.position.set(0.24, 0.91, -0.22);
          staff.castShadow = true;
          npcRig.root.add(staff);
        }
        this.root.add(npcRig.root);
        this.obstacles.push({ x: standX, z: standZ, r: 0.85 });
        this.npcEntries.push({
          rig: npcRig,
          watchX: standX,
          watchZ: standZ,
          holdsStaffRight: isElder,
        });
        addKukuiTorch(poi.x - poi.markerRadiusM * 0.85, poi.z + 1.4, 1.65);
      }

      this.root.add(ringGrp);
      this.poiVisuals[poi.id] = { group: ringGrp, ringMat: outerMat, baseY: py };
    }

    // Sculpted Birds wheeling above the shore & cove (with land/stand/takeoff lifecycle)
    // On Manuae exclusively, spawn 9 sacred red Kura birds!
    const isManuaeKura =
      this.builtIslandId === 'manuae' || islDef?.birdSpecies === 'red_kura';
    const birdCount = isManuaeKura ? 9 : 3;
    const birdScale = isManuaeKura ? 1.45 : 1.25;
    this.birdPerchSpots = this._findPerchSpots(
      isManuaeKura ? 14 : 6,
      isManuaeKura ? { minZ: -24.0, maxZ: 74.0, minX: -52.0, maxX: 52.0 } : null
    );
    if (this.worldCues) {
      for (let i = 0; i < birdCount; i += 1) {
        const species = isManuaeKura
          ? 'red_kura'
          : i === 1
            ? 'brown_booby'
            : 'white_tern';
        const entry = this.worldCues.createSeabird(species, { opaque: true });
        entry.root.userData.sharedGeometries = true;
        entry.root.scale.setScalar(birdScale);
        this.root.add(entry.root);

        const slot = i % 3;
        const band = Math.floor(i / 3);
        const cx = isManuaeKura
          ? -10.0 + slot * 15.0 + (band - 1) * 4.0
          : -4.0 + i * 14.0;
        const cz = isManuaeKura
          ? this.spec.mooredCanoe.z - 8.0 - band * 24.0 - slot * 3.0
          : this.spec.mooredCanoe.z - 4.0 - i * 5.0;
        const radius = isManuaeKura
          ? 11.0 + slot * 4.0 + band * 2.0
          : 14.0 + i * 4.5;
        const altY = isManuaeKura ? 4.6 + (i % 4) * 1.35 : 14.5 + i * 2.4;
        const speed = isManuaeKura ? 0.32 + (i % 5) * 0.045 : 0.34 + i * 0.05;
        const orbitAngle = isManuaeKura
          ? i * ((Math.PI * 2.0) / birdCount)
          : i * 2.1;

        let initState = 'flying';
        let initPerch = null;
        let initYaw = orbitAngle;
        let stateTimer = isManuaeKura ? 1.5 + (i % 5) * 2.2 : 3.5 + i * 4.5;

        // Seed up to 4 Manuae Red Kura birds already perched/standing on sandy flats & rookery sandbar!
        if (isManuaeKura && i < 4 && this.birdPerchSpots.length > 0) {
          const openSpot = this.birdPerchSpots.find(
            (s) =>
              !s.occupiedBy &&
              Math.hypot(s.x - this.spec.initialSpawn.x, s.z - this.spec.initialSpawn.z) > 6.5
          );
          if (openSpot) {
            openSpot.occupiedBy = true;
            initState = 'standing';
            initPerch = openSpot;
            initYaw = (i * 1.9) % (Math.PI * 2.0);
            stateTimer = 5.0 + i * 2.4;
            entry.root.position.set(
              openSpot.x,
              openSpot.y + (entry.standFootHeight ?? 0.13) * birdScale,
              openSpot.z
            );
            entry.root.rotation.set(0.0, initYaw, 0.0);
          }
        }

        const birdRecord = {
          entry,
          group: entry.root,
          scale: birdScale,
          cx,
          cz,
          radius,
          altY,
          speed,
          phase: i * 1.45,
          orbitAngle,
          state: initState,
          stateTimer,
          stateProgress: 0.0,
          stateDur: 1.0,
          perchSpot: initPerch,
          currentYaw: initYaw,
        };
        if (initPerch) {
          initPerch.occupiedBy = birdRecord;
        }
        this.lagoonTerns.push(birdRecord);
      }
    }
  }

  _findPerchSpots(maxSpots = 6, scanRange = null) {
    const spots = [];
    const pois = this.spec?.pois || [];
    const mc = this.spec?.mooredCanoe;
    const minSpacingSq = 36.0; // >= 6m between perch spots
    const minZ = scanRange?.minZ ?? 12.0;
    const maxZ = scanRange?.maxZ ?? 74.0;
    const minX = scanRange?.minX ?? -44.0;
    const maxX = scanRange?.maxX ?? 44.0;

    const tryCollect = (minH, maxH, maxSlope) => {
      for (let z = minZ; z <= maxZ; z += 4.0) {
        for (let x = minX; x <= maxX; x += 4.0) {
          const h = this.getGroundHeight(x, z);
          if (h < minH || h > maxH) continue;

          const hx = Math.abs(this.getGroundHeight(x + 0.75, z) - this.getGroundHeight(x - 0.75, z)) / 1.5;
          const hz = Math.abs(this.getGroundHeight(x, z + 0.75) - this.getGroundHeight(x, z - 0.75)) / 1.5;
          if (Math.max(hx, hz) > maxSlope) continue;

          if (mc && Math.hypot(x - mc.x, z - mc.z) < 6.0) continue;

          let blocked = false;
          for (const poi of pois) {
            if (Math.hypot(x - poi.x, z - poi.z) < 4.5) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;

          for (const ob of this.obstacles) {
            if (Math.hypot(x - ob.x, z - ob.z) < Math.max(3.0, ob.r + 1.8)) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;

          for (const s of spots) {
            const dx = x - s.x;
            const dz = z - s.z;
            if (dx * dx + dz * dz < minSpacingSq) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;

          spots.push({ x, y: h, z, occupiedBy: null });
          if (spots.length >= maxSpots) return;
        }
      }
    };

    tryCollect(0.35, 6.5, 0.34);
    if (spots.length < 3) {
      tryCollect(0.25, 14.0, 0.5);
    }
    return spots;
  }

  _updateLagoonBirds(dt, elapsedSec) {
    if (!this.lagoonTerns.length || !this.worldCues) return;

    const lerpNum = (a, b, t) => a + (b - a) * t;
    const smoothstep = (e0, e1, v) => {
      const t = Math.max(0.0, Math.min(1.0, (v - e0) / (e1 - e0)));
      return t * t * (3.0 - 2.0 * t);
    };
    const lerpAngle = (a, b, t) => {
      const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
      return a + diff * t;
    };

    for (let i = 0; i < this.lagoonTerns.length; i += 1) {
      const tb = this.lagoonTerns[i];
      const entry = tb.entry;
      const scale = tb.scale || 1.25;
      const standOffsetY = (entry?.standFootHeight ?? 0.13) * scale;

      const evalOrbit = (ang) => {
        const ox = tb.cx + Math.cos(ang) * tb.radius;
        const oy = tb.altY + Math.sin(ang * 2.0) * 0.65;
        const oz = tb.cz + Math.sin(ang) * tb.radius;
        const oyaw = Math.atan2(Math.sin(ang), -Math.cos(ang));
        return { ox, oy, oz, oyaw };
      };

      if (tb.state === 'flying') {
        tb.orbitAngle += tb.speed * dt;
        const { ox, oy, oz, oyaw } = evalOrbit(tb.orbitAngle);
        this.worldCues.animateSeabird(entry, elapsedSec, tb.phase, 1.0, null);
        tb.group.position.set(ox, oy + (entry?.bobY ?? 0.0), oz);
        tb.group.rotation.set(0.0, oyaw, 0.14);

        tb.stateTimer -= dt;
        if (tb.stateTimer <= 0.0 && this.birdPerchSpots.length > 0) {
          const candidates = this.birdPerchSpots.filter(
            (s) =>
              !s.occupiedBy &&
              Math.hypot(s.x - this.playerPos.x, s.z - this.playerPos.z) > 6.0
          );
          if (candidates.length > 0) {
            const spot = candidates[(i + Math.floor(elapsedSec)) % candidates.length];
            spot.occupiedBy = tb;
            tb.perchSpot = spot;
            const fX = -Math.sin(oyaw);
            const fZ = -Math.cos(oyaw);
            const targetY = spot.y + standOffsetY;
            tb.startPos = { x: ox, y: oy, z: oz };
            tb.descendCtrl = {
              x: ox + fX * 8.5,
              y: lerpNum(oy, targetY, 0.28),
              z: oz + fZ * 8.5,
            };
            tb.startYaw = oyaw;
            tb.landYaw = Math.atan2(-(spot.x - tb.descendCtrl.x), -(spot.z - tb.descendCtrl.z));
            tb.state = 'descending';
            tb.stateProgress = 0.0;
            tb.stateDur = 3.0;
          } else {
            tb.stateTimer = 2.5;
          }
        }
      } else if (tb.state === 'descending') {
        tb.stateProgress += dt / tb.stateDur;
        const u = Math.min(1.0, tb.stateProgress);
        const omt = 1.0 - u;
        const spot = tb.perchSpot;
        const targetY = spot.y + standOffsetY;
        const p0 = tb.startPos;
        const p1 = tb.descendCtrl;

        const px = omt * omt * p0.x + 2.0 * omt * u * p1.x + u * u * spot.x;
        const py = omt * omt * p0.y + 2.0 * omt * u * p1.y + u * u * targetY;
        const pz = omt * omt * p0.z + 2.0 * omt * u * p1.z + u * u * spot.z;

        const vx = 2.0 * omt * (p1.x - p0.x) + 2.0 * u * (spot.x - p1.x);
        const vz = 2.0 * omt * (p1.z - p0.z) + 2.0 * u * (spot.z - p1.z);
        const yaw =
          Math.hypot(vx, vz) > 1e-4 ? Math.atan2(-vx, -vz) : tb.landYaw;
        tb.landYaw = yaw;

        const legExtend = smoothstep(0.45, 0.92, u);
        const standBlend = smoothstep(0.75, 1.0, u);
        const foldBlend = smoothstep(0.84, 1.0, u);
        const flarePitch = Math.sin(u * Math.PI) * 0.32;
        const flapFade = 1.0 - foldBlend;

        this.worldCues.animateSeabird(entry, elapsedSec, tb.phase, 1.0, {
          standBlend,
          legExtend,
          foldBlend,
          spreadBlend: 0.0,
          flapSpeed: lerpNum(1.0, 1.12, smoothstep(0.4, 0.85, u)),
          flapAmp: lerpNum(0.85, 1.08, smoothstep(0.4, 0.85, u)) * flapFade,
          pitchRad: flarePitch * (1.0 - standBlend),
          lookYawRad: 0.0,
        });

        tb.group.position.set(px, py + (entry?.bobY ?? 0.0), pz);
        tb.group.rotation.set(0.0, yaw, 0.14 * (1.0 - smoothstep(0.0, 0.6, u)));

        if (u >= 1.0) {
          tb.state = 'standing';
          tb.stateTimer = 5.5 + (i % 3) * 1.4;
          tb.currentYaw = yaw;
        }
      } else if (tb.state === 'standing') {
        const spot = tb.perchSpot;
        const idleLook =
          Math.sin(elapsedSec * 1.45 + tb.phase) * 0.28 +
          Math.sin(elapsedSec * 0.55 + i) * 0.22;

        this.worldCues.animateSeabird(entry, elapsedSec, tb.phase, 1.0, {
          standBlend: 1.0,
          legExtend: 1.0,
          foldBlend: 1.0,
          spreadBlend: 0.0,
          flapSpeed: 1.0,
          flapAmp: 0.0,
          pitchRad: 0.0,
          lookYawRad: idleLook,
        });

        tb.group.position.set(
          spot.x,
          spot.y + standOffsetY + (entry?.bobY ?? 0.0),
          spot.z
        );
        tb.group.rotation.set(0.0, tb.currentYaw, 0.0);

        const distToPlayer = Math.hypot(
          this.playerPos.x - spot.x,
          this.playerPos.z - spot.z
        );
        tb.stateTimer -= dt;
        if (distToPlayer < 4.5 || tb.stateTimer <= 0.0) {
          if (distToPlayer < 6.0) {
            tb.takeoffYaw = Math.atan2(
              -(spot.x - this.playerPos.x),
              -(spot.z - this.playerPos.z)
            );
          } else {
            tb.takeoffYaw = tb.currentYaw;
          }
          tb.state = 'spreading';
          tb.stateProgress = 0.0;
          tb.stateDur = 0.72;
        }
      } else if (tb.state === 'spreading') {
        const spot = tb.perchSpot;
        tb.stateProgress += dt / tb.stateDur;
        const u = Math.min(1.0, tb.stateProgress);
        const spreadBlend = smoothstep(0.05, 0.9, u);
        const foldBlend = 1.0 - smoothstep(0.0, 0.75, u);
        const crouchOffset = -Math.sin(u * Math.PI) * 0.025;
        const yaw = lerpAngle(tb.currentYaw, tb.takeoffYaw, smoothstep(0.0, 0.8, u));

        this.worldCues.animateSeabird(entry, elapsedSec, tb.phase, 1.0, {
          standBlend: 1.0 - u * 0.45,
          legExtend: 1.0,
          foldBlend,
          spreadBlend,
          flapSpeed: 1.2,
          flapAmp: 0.0,
          pitchRad: 0.0,
          lookYawRad: 0.0,
        });

        tb.group.position.set(spot.x, spot.y + standOffsetY + crouchOffset, spot.z);
        tb.group.rotation.set(0.0, yaw, 0.0);

        if (u >= 1.0) {
          spot.occupiedBy = null;
          const fX = -Math.sin(yaw);
          const fZ = -Math.cos(yaw);
          const startY = spot.y + standOffsetY;
          const climbDur = 2.6;
          // Choose an orbit re-entry angle roughly ahead of the bird's takeoff direction
          const aheadX = spot.x + fX * 18.0;
          const aheadZ = spot.z + fZ * 18.0;
          tb.orbitAngle =
            Math.atan2(aheadZ - tb.cz, aheadX - tb.cx) - tb.speed * climbDur * 0.35;
          tb.startPos = { x: spot.x, y: startY, z: spot.z };
          tb.climbCtrl = {
            x: spot.x + fX * 13.0,
            y: startY + 6.5,
            z: spot.z + fZ * 13.0,
          };
          tb.startYaw = yaw;
          tb.state = 'taking_off';
          tb.stateProgress = 0.0;
          tb.stateDur = climbDur;
        }
      } else if (tb.state === 'taking_off') {
        tb.orbitAngle += tb.speed * dt;
        tb.stateProgress += dt / tb.stateDur;
        const u = Math.min(1.0, tb.stateProgress);
        const omt = 1.0 - u;
        const { ox, oy, oz } = evalOrbit(tb.orbitAngle);
        const p0 = tb.startPos;
        const p1 = tb.climbCtrl;

        const hopLift = Math.sin(Math.min(1.0, u * 3.0) * Math.PI) * 0.35;
        const px = omt * omt * p0.x + 2.0 * omt * u * p1.x + u * u * ox;
        const py = omt * omt * p0.y + 2.0 * omt * u * p1.y + u * u * oy + hopLift;
        const pz = omt * omt * p0.z + 2.0 * omt * u * p1.z + u * u * oz;

        const vx = 2.0 * omt * (p1.x - p0.x) + 2.0 * u * (ox - p1.x);
        const vz = 2.0 * omt * (p1.z - p0.z) + 2.0 * u * (oz - p1.z);
        const yaw =
          Math.hypot(vx, vz) > 1e-4 ? Math.atan2(-vx, -vz) : tb.startYaw;

        const spreadBlend = 1.0 - smoothstep(0.0, 0.25, u);
        const legExtend = 1.0 - smoothstep(0.12, 0.55, u);
        const standBlend = 1.0 - smoothstep(0.0, 0.3, u);
        const climbPitch = 0.24 * Math.sin(u * Math.PI);

        this.worldCues.animateSeabird(entry, elapsedSec, tb.phase, 1.0, {
          standBlend,
          legExtend,
          foldBlend: 0.0,
          spreadBlend,
          flapSpeed: lerpNum(1.16, 1.0, u),
          flapAmp: lerpNum(1.12, 1.0, u) * (1.0 - spreadBlend * 0.65),
          pitchRad: climbPitch,
          lookYawRad: 0.0,
        });

        tb.group.position.set(px, py + (entry?.bobY ?? 0.0), pz);
        tb.group.rotation.set(0.0, yaw, 0.14 * smoothstep(0.45, 1.0, u));

        if (u >= 1.0) {
          tb.perchSpot = null;
          tb.state = 'flying';
          tb.stateTimer = 10.5 + (i % 3) * 3.5;
        }
      }
    }
  }

  _bindCameraPointerOrbit() {
    if (typeof window === 'undefined') return;

    window.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      if (e.target?.tagName !== 'CANVAS') return;
      this._isOrbitDragging = true;
      this._lastPtr.x = e.clientX;
      this._lastPtr.y = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.active || !this._isOrbitDragging) return;
      const dx = e.clientX - this._lastPtr.x;
      const dy = e.clientY - this._lastPtr.y;
      this._lastPtr.x = e.clientX;
      this._lastPtr.y = e.clientY;

      this.camYawRad -= dx * 0.0055;
      this.camPitchRad = clamp(this.camPitchRad + dy * 0.0045, 0.11, 0.82);
    });

    const endDrag = () => {
      this._isOrbitDragging = false;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.active) return;
        if (e.target?.tagName !== 'CANVAS') return;
        this.camDist = clamp(this.camDist + e.deltaY * 0.01, 5.4, 22.0);
      },
      { passive: true }
    );
  }

  getGroundHeight(x, z) {
    const span = this.gridHalfSpan * 2.0;
    const gx = ((x + this.gridHalfSpan) / span) * this.gridN;
    const gz = ((z + this.gridHalfSpan) / span) * this.gridN;
    if (gx < 0 || gz < 0 || gx >= this.gridN || gz >= this.gridN) {
      return -3.4;
    }

    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const stride = this.gridN + 1;

    const h00 = this.heightGrid[iz * stride + ix];
    const h10 = this.heightGrid[iz * stride + (ix + 1)];
    const h01 = this.heightGrid[(iz + 1) * stride + ix];
    const h11 = this.heightGrid[(iz + 1) * stride + (ix + 1)];

    if (fz >= fx) {
      return h00 + fz * (h01 - h00) + fx * (h11 - h01);
    }
    return h00 + fx * (h10 - h00) + fz * (h11 - h10);
  }

  _buildPlayerGroup() {
    this.playerGroup = new THREE.Group();
    this.root.add(this.playerGroup);
  }

  _getOrCreatePlayerRig(difficulty) {
    const key = difficulty || Difficulty.EASY;
    if (!this.playerRigs[key]) {
      const rig = createPlayerCharacterRig(key);
      rig.root.visible = false;
      this.playerGroup.add(rig.root);
      this.playerRigs[key] = rig;
    }
    return this.playerRigs[key];
  }

  _buildPoiWorldLabels() {
    if (!this.labelLayerEl) return;
    for (const poi of this.spec.pois) {
      const el = document.createElement('div');
      el.className = 'shore-poi-world-tag hidden';
      el.innerHTML = `<span class="shore-poi-glyph">${poi.glyph}</span><span>${poi.label}</span>`;
      this.labelLayerEl.appendChild(el);
      this.poiBadgeEls[poi.id] = el;
    }
  }

  enter({ islandId = null, spawnMode = 'canoe', gameState = null } = {}) {
    const targetIslandId =
      islandId || gameState?.currentIslandId || this.builtIslandId || 'raiatea';
    this._loadIsland(targetIslandId);

    this.active = true;
    this.root.visible = true;

    const spawn =
      spawnMode === 'vigil' ? this.spec.vigilExitSpawn : this.spec.initialSpawn;
    const safeSpawn = this._findStandablePoint(spawn.x, spawn.z);
    this.playerPos.x = safeSpawn.x;
    this.playerPos.z = safeSpawn.z;
    this.playerPos.y = Math.max(
      0.0,
      this.getGroundHeight(safeSpawn.x, safeSpawn.z)
    );
    this.playerYawRad = spawn.facingYawRad;
    this.walkAmount = 0.0;

    if (spawnMode === 'canoe') {
      this.camYawRad = spawn.camYawRad ?? 0.24;
      this.camPitchRad = 0.31;
      this.camDist = 10.6;
    }

    this._syncCamera(1.0, null);
    this._dockVakaAtLanding(0.0, gameState);
  }

  exit() {
    if (!this.active && !this.root.visible) return;
    this.active = false;
    this.root.visible = false;
    this.activePoi = null;
    this._isOrbitDragging = false;

    for (const el of Object.values(this.poiBadgeEls)) {
      el.classList.add('hidden');
    }

    if (this.vakaRenderer?.root) {
      this.vakaRenderer.root.position.set(0.0, 0.0, 0.0);
      this.vakaRenderer.root.rotation.set(0.0, 0.0, 0.0);
    }
  }

  _dockVakaAtLanding(elapsedSec, gameState) {
    if (!this.vakaRenderer?.root) return;
    const mc = this.spec.mooredCanoe;
    const gentleBob = Math.sin(elapsedSec * 1.45) * 0.035;
    const gentleRoll = Math.sin(elapsedSec * 1.1) * 0.014;
    this.vakaRenderer.root.visible = true;
    this.vakaRenderer.root.position.set(mc.x, gentleBob, mc.z);
    this.vakaRenderer.root.rotation.set(0.0, mc.yawRad, gentleRoll);
    if (this.vakaRenderer.pouShadowBand) {
      this.vakaRenderer.pouShadowBand.visible = false;
    }
    if (this.vakaRenderer.playerHelmGroup) {
      this.vakaRenderer.playerHelmGroup.visible = false;
    }
    if (gameState) {
      const visibleBaskets = Math.max(0, Math.floor(gameState.loadedRations));
      this.vakaRenderer.rationBaskets.forEach((b, idx) => {
        b.visible = idx < visibleBaskets;
      });
      this.vakaRenderer.tier2Gunwales.forEach((g) => {
        g.visible = gameState.vakaTier >= 2;
      });
      this.vakaRenderer.pahuDrum.visible = gameState.vakaTier >= 2;
      if (this.vakaRenderer.secondMastGroup) {
        this.vakaRenderer.secondMastGroup.visible = gameState.vakaTier >= 3;
      }
      this.vakaRenderer.cargoBundles.forEach((b, idx) => {
        b.visible = idx < gameState.cargoItems.length;
      });
      for (const [crewId, mesh] of Object.entries(this.vakaRenderer.crewMeshes)) {
        mesh.visible = gameState.assignedCrew.includes(crewId);
      }
      const isSailWorn = gameState.sailCondition < 55.0;
      const sailColors = computeSailVariantColors(gameState.sailColor);
      this.vakaRenderer.sailMat.color.setHex(
        isSailWorn ? sailColors.wornHex : sailColors.normalHex
      );
      this.vakaRenderer.sailSeamMat.color.setHex(
        isSailWorn ? sailColors.seamWornHex : sailColors.seamNormalHex
      );
      if (this.dyeBannerMat) {
        this.dyeBannerMat.color.setHex(sailColors.normalHex);
      }
      this.vakaRenderer.hullMat.color.setHex(
        gameState.hullCondition < 55.0 ? 0x663d20 : 0x8d532b
      );
    }
  }

  _isInsideObstacle(x, z) {
    for (let i = 0; i < this.obstacles.length; i += 1) {
      const ob = this.obstacles[i];
      if (Math.hypot(x - ob.x, z - ob.z) < ob.r) {
        return true;
      }
    }
    return false;
  }

  _findStandablePoint(x, z) {
    const maxWalkRadius = this.gridHalfSpan - 8.0;
    const isStandable = (px, pz) =>
      Math.abs(px) <= maxWalkRadius &&
      Math.abs(pz) <= maxWalkRadius &&
      this.getGroundHeight(px, pz) >= -0.18 &&
      !this._isInsideObstacle(px, pz);

    if (isStandable(x, z)) return { x, z };

    // Step inward toward island center (0, 0) to snap offshore spawns onto dry beach
    const dist = Math.hypot(x, z);
    if (dist > 0.5) {
      const ux = -x / dist;
      const uz = -z / dist;
      for (let step = 1.0; step <= dist; step += 1.5) {
        const cx = x + ux * step;
        const cz = z + uz * step;
        if (isStandable(cx, cz)) return { x: cx, z: cz };
      }
    }
    return { x, z };
  }

  _tryMovePlayer(dx, dz) {
    if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return 0.0;

    const startX = this.playerPos.x;
    const startZ = this.playerPos.z;
    const curH = this.getGroundHeight(startX, startZ);
    const maxWalkRadius = this.gridHalfSpan - 8.0;

    const canStandAt = (nx, nz) => {
      if (Math.abs(nx) > maxWalkRadius || Math.abs(nz) > maxWalkRadius) {
        return false;
      }
      const nh = this.getGroundHeight(nx, nz);
      if (curH < -0.24) {
        if (nh < curH - 0.05) return false;
      } else if (nh < -0.24) {
        return false;
      }
      const stepDist = Math.max(0.05, Math.hypot(nx - startX, nz - startZ));
      const uphillSlope = (nh - curH) / stepDist;
      if (uphillSlope > 0.92 && nh > 14.0) return false;
      return true;
    };

    let nextX = startX + dx;
    let nextZ = startZ + dz;

    if (!canStandAt(nextX, nextZ)) {
      if (canStandAt(startX + dx, startZ)) {
        nextX = startX + dx;
        nextZ = startZ;
      } else if (canStandAt(startX, startZ + dz)) {
        nextX = startX;
        nextZ = startZ + dz;
      } else {
        return 0.0;
      }
    }

    for (let i = 0; i < this.obstacles.length; i += 1) {
      const ob = this.obstacles[i];
      const ox = nextX - ob.x;
      const oz = nextZ - ob.z;
      const d = Math.hypot(ox, oz);
      if (d < ob.r && d > 1e-4) {
        nextX = ob.x + (ox / d) * ob.r;
        nextZ = ob.z + (oz / d) * ob.r;
      }
    }

    const moved = Math.hypot(nextX - startX, nextZ - startZ);
    this.playerPos.x = nextX;
    this.playerPos.z = nextZ;
    this.playerPos.y = Math.max(-0.08, this.getGroundHeight(nextX, nextZ));
    return moved;
  }

  _syncCamera(blendAlpha, camera) {
    this.camTarget.set(
      this.playerPos.x,
      this.playerPos.y + 1.48,
      this.playerPos.z
    );

    const horizDist = Math.cos(this.camPitchRad) * this.camDist;
    const vertDist = Math.sin(this.camPitchRad) * this.camDist;

    const cx = this.camTarget.x + Math.sin(this.camYawRad) * horizDist;
    const cz = this.camTarget.z + Math.cos(this.camYawRad) * horizDist;
    const groundAtCam = this.getGroundHeight(cx, cz);
    const cy = Math.max(groundAtCam + 1.25, this.camTarget.y + vertDist);

    this.camDesiredPos.set(cx, cy, cz);

    if (camera) {
      if (blendAlpha >= 0.999) {
        camera.position.copy(this.camDesiredPos);
      } else {
        camera.position.lerp(this.camDesiredPos, blendAlpha);
      }
      if (Math.abs(camera.fov - 56.0) > 0.05) {
        camera.fov = 56.0;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(this.camTarget);
      camera.updateMatrixWorld();
    }
  }

  update(
    dtSec,
    elapsedSec,
    { gameState, oceanSim, camera, keysDown, inputBlocked = false, hideLabels = false }
  ) {
    if (!this.active) return null;

    const dt = Math.min(0.1, Math.max(0.001, dtSec));

    if (!inputBlocked && keysDown) {
      if (keysDown.has('KeyQ')) this.camYawRad += 1.45 * dt;
      if (keysDown.has('KeyE')) this.camYawRad -= 1.45 * dt;
    }

    let moveRight = 0.0;
    let moveFwd = 0.0;
    if (!inputBlocked && keysDown) {
      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) moveFwd += 1.0;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) moveFwd -= 1.0;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) moveRight -= 1.0;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) moveRight += 1.0;
    }

    const inputMag = Math.hypot(moveRight, moveFwd);
    let movedDist = 0.0;

    if (inputMag > 0.01) {
      const nr = moveRight / inputMag;
      const nf = moveFwd / inputMag;

      const fwdX = -Math.sin(this.camYawRad);
      const fwdZ = -Math.cos(this.camYawRad);
      const rightX = Math.cos(this.camYawRad);
      const rightZ = -Math.sin(this.camYawRad);

      const worldDirX = fwdX * nf + rightX * nr;
      const worldDirZ = fwdZ * nf + rightZ * nr;

      const isSprinting = Boolean(
        keysDown && (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight'))
      );
      const speed = isSprinting
        ? this.spec.sprintSpeedMps
        : this.spec.walkSpeedMps;

      movedDist = this._tryMovePlayer(
        worldDirX * speed * dt,
        worldDirZ * speed * dt
      );

      const targetYaw = Math.atan2(-worldDirX, -worldDirZ);
      const diffDeg = wrapDeg180(
        ((targetYaw - this.playerYawRad) * 180.0) / Math.PI
      );
      this.playerYawRad +=
        ((diffDeg * Math.PI) / 180.0) * Math.min(1.0, 12.0 * dt);
    }

    const targetWalk = movedDist > 0.002 ? 1.0 : 0.0;
    this.walkAmount += (targetWalk - this.walkAmount) * Math.min(1.0, 10.5 * dt);
    if (movedDist > 0.0005) {
      this.stridePhase += movedDist * 2.55;
    }

    const activeRig = this._getOrCreatePlayerRig(gameState?.difficulty);
    if (this.activePlayerRig !== activeRig) {
      for (const r of Object.values(this.playerRigs)) {
        r.root.visible = r === activeRig;
      }
      this.activePlayerRig = activeRig;
    } else {
      activeRig.root.visible = true;
    }

    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerYawRad;
    animatePlayerCharacterAshore(activeRig, elapsedSec, {
      walkAmount: this.walkAmount,
      stridePhase: this.stridePhase,
      windStrength: 0.52,
    });

    if (this.vakaRenderer?.sunLight && oceanSim?.sunState) {
      const sun = oceanSim.sunState;
      const azRad = (sun.azDeg * Math.PI) / 180.0;
      const altRad = (Math.max(12.0, sun.altDeg) * Math.PI) / 180.0;
      const cosAlt = Math.cos(altRad);
      const sx = Math.sin(azRad) * cosAlt;
      const sy = Math.sin(altRad);
      const sz = -Math.cos(azRad) * cosAlt;

      this.vakaRenderer.sunLight.target.position.set(
        this.playerPos.x,
        this.playerPos.y + 1.0,
        this.playerPos.z
      );
      this.vakaRenderer.sunLight.position.set(
        this.playerPos.x + sx * 24.0,
        this.playerPos.y + sy * 24.0,
        this.playerPos.z + sz * 24.0
      );
      this.vakaRenderer.sunLight.intensity = 1.68 * sun.daylightFactor;
      this.vakaRenderer.hemiLight.intensity = 0.42 + 0.56 * sun.daylightFactor;
    }

    this._dockVakaAtLanding(elapsedSec, gameState);

    for (let i = 0; i < this.npcEntries.length; i += 1) {
      const npc = this.npcEntries[i];
      const dNpc = Math.hypot(
        this.playerPos.x - npc.watchX,
        this.playerPos.z - npc.watchZ
      );
      animatePlayerCharacterAshore(npc.rig, elapsedSec + i * 1.1, {
        walkAmount: 0.0,
        holdsStaffRight: Boolean(npc.holdsStaffRight),
        gestureWave: smoothstep(12.0, 6.5, dNpc),
      });
    }

    for (let i = 0; i < this.torchFlames.length; i += 1) {
      const tf = this.torchFlames[i];
      const flicker = 0.9 + 0.16 * Math.sin(elapsedSec * 11.5 + tf.phase);
      tf.mesh.scale.set(flicker, 0.88 + 0.24 * flicker, flicker);
      tf.mesh.position.y = tf.baseY + (flicker - 1.0) * 0.05;
    }

    this._updateLagoonBirds(dt, elapsedSec);

    if (this.peakCloudMat && oceanSim?.sunState) {
      updateCloudMaterialUniforms(this.peakCloudMat, {
        sunDir: new THREE.Vector3(0.4, 0.72, -0.55).normalize(),
        daylight: oceanSim.sunState.daylightFactor,
        twilight: oceanSim.sunState.twilightFactor,
        opacity: 0.95,
        elapsedSec,
      });
    }

    this._syncCamera(Math.min(1.0, 9.5 * dt), camera);

    let nearestPoi = null;
    let nearestDist = Infinity;

    for (const poi of this.spec.pois) {
      const d = Math.hypot(this.playerPos.x - poi.x, this.playerPos.z - poi.z);
      const vis = this.poiVisuals[poi.id];
      const isInside = d <= poi.triggerRadiusM;

      if (vis) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsedSec * 3.2);
        vis.ringMat.opacity = isInside
          ? 0.78 + 0.18 * pulse
          : 0.34 + 0.1 * pulse;
        vis.ringMat.color.setHex(isInside ? 0x3ef0d0 : 0xf4c96b);
      }

      if (isInside && d < nearestDist) {
        nearestDist = d;
        nearestPoi = poi;
      }
    }

    this.activePoi = nearestPoi;
    this._updateProjectedPoiTags(camera, hideLabels);

    return nearestPoi;
  }

  _updateProjectedPoiTags(camera, hideLabels = false) {
    if (!camera || !this.labelLayerEl) return;
    if (hideLabels) {
      for (const el of Object.values(this.poiBadgeEls)) {
        el.classList.add('hidden');
      }
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const proj = new THREE.Vector3();

    for (const poi of this.spec.pois) {
      const el = this.poiBadgeEls[poi.id];
      if (!el) continue;

      const py =
        this.getGroundHeight(poi.x, poi.z) +
        (poi.kind === 'elder' ? 3.8 : poi.kind === 'hut' ? 3.5 : 2.7);
      proj.set(poi.x, py, poi.z);
      const distCam = proj.distanceTo(camera.position);
      proj.project(camera);

      if (proj.z > 1.0 || proj.z < -1.0 || distCam > 95.0) {
        el.classList.add('hidden');
        continue;
      }

      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-proj.y * 0.5 + 0.5) * h;
      if (sx < -60 || sx > w + 60 || sy < 40 || sy > h - 40) {
        el.classList.add('hidden');
        continue;
      }

      el.classList.remove('hidden');
      el.classList.toggle('active-poi', this.activePoi?.id === poi.id);
      el.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
    }
  }
}
