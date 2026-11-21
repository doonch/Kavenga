/**
 * Headless Three.js Dramatic Volcanic Island Layout Audit (`jsc -m` compatible via run_volcanic_audit.py).
 *
 * Tailored for `.agents/skills/volcanic-island-redesign/`:
 * - Encourages taller peaks, sheer basalt cliffs, needle spires, and unreachable vertical relief (`slope > 0.92`)
 * - Strictly enforces BFS/Dijkstra footpath connectivity (`WalkableIslandScene` movement rules)
 *   from `initialSpawn` to EVERY POI + `observation_circle`
 * - Evaluates panoramic lookout Sky Horizon (`openSkyPct >= 75%` <= 15 deg, allowing dramatic spire backdrop)
 * - Verifies canonical +Z shoreline, walkable 1:1 scale, bounds, initial spawn safety, and canopy clearance.
 */

import * as THREE from 'three';
import { ISLANDS } from './src/data/islandsData.js';
import { WALKABLE_ISLAND_SPECS, getWalkableIslandSpec } from './src/data/walkableIslandsData.js';
import {
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  getIslandShoreRadiusM,
  hasDetailedIslandModel,
  applyDetailedIslandAlpha,
} from './src/rendering/IslandTerrainBuilder.js';

function bakeTerrainGrid(islandGroup, gridHalfSpan, gridN, canonicalScale) {
  islandGroup.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const terrainMeshes = [];
  let maxTerrainBoundsR = 0.0;

  islandGroup.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (child.name === 'water_disc' || child.name === 'lagoon_disc' || child.name === 'lagoon_surface') return;
    const mat = child.material;
    if (mat && mat.transparent && mat.opacity !== undefined && mat.opacity < 0.72) return;
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (Math.max(size.x, size.z) < 22.0 && size.y < 10.0) return;

    const rCandidate = Math.max(
      Math.abs(box.min.x), Math.abs(box.max.x),
      Math.abs(box.min.z), Math.abs(box.max.z)
    );
    if (size.y >= 1.5 || Math.max(size.x, size.z) >= 35.0) {
      terrainMeshes.push(child);
      const posAttr = child.geometry.attributes?.position;
      if (posAttr) {
        const v = new THREE.Vector3();
        const stepV = Math.max(1, Math.floor(posAttr.count / 1200));
        for (let i = 0; i < posAttr.count; i += stepV) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
          if (v.y >= -0.25) {
            const rCoord = Math.max(Math.abs(v.x), Math.abs(v.z));
            if (rCoord > maxTerrainBoundsR) maxTerrainBoundsR = rCoord;
          }
        }
      } else if (rCandidate > maxTerrainBoundsR) {
        maxTerrainBoundsR = rCandidate;
      }
    }
  });

  const n = gridN;
  const step = (gridHalfSpan * 2.0) / (n - 1);
  const heightGrid = new Float32Array(n * n).fill(-8.0);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  for (const mesh of terrainMeshes) {
    const pos = mesh.geometry.attributes?.position;
    if (!pos) continue;
    const index = mesh.geometry.index;
    const triCount = index ? Math.floor(index.count / 3) : Math.floor(pos.count / 3);
    const mw = mesh.matrixWorld;

    for (let t = 0; t < triCount; t += 1) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      vA.fromBufferAttribute(pos, i0).applyMatrix4(mw).multiplyScalar(canonicalScale);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(mw).multiplyScalar(canonicalScale);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(mw).multiplyScalar(canonicalScale);

      const minX = Math.min(vA.x, vB.x, vC.x);
      const maxX = Math.max(vA.x, vB.x, vC.x);
      const minZ = Math.min(vA.z, vB.z, vC.z);
      const maxZ = Math.max(vA.z, vB.z, vC.z);

      const ix0 = Math.max(0, Math.floor((minX + gridHalfSpan) / step));
      const ix1 = Math.min(n - 1, Math.ceil((maxX + gridHalfSpan) / step));
      const iz0 = Math.max(0, Math.floor((minZ + gridHalfSpan) / step));
      const iz1 = Math.min(n - 1, Math.ceil((maxZ + gridHalfSpan) / step));
      if (ix0 > ix1 || iz0 > iz1) continue;

      const denom = (vB.z - vC.z) * (vA.x - vC.x) + (vC.x - vB.x) * (vA.z - vC.z);
      if (Math.abs(denom) < 1e-9) continue;
      const invDenom = 1.0 / denom;

      for (let iz = iz0; iz <= iz1; iz += 1) {
        const wz = -gridHalfSpan + iz * step;
        for (let ix = ix0; ix <= ix1; ix += 1) {
          const wx = -gridHalfSpan + ix * step;
          const w0 = ((vB.z - vC.z) * (wx - vC.x) + (vC.x - vB.x) * (wz - vC.z)) * invDenom;
          if (w0 < -1e-4) continue;
          const w1 = ((vC.z - vA.z) * (wx - vC.x) + (vA.x - vC.x) * (wz - vC.z)) * invDenom;
          if (w1 < -1e-4) continue;
          const w2 = 1.0 - w0 - w1;
          if (w2 < -1e-4) continue;

          const hy = w0 * vA.y + w1 * vB.y + w2 * vC.y;
          const ci = iz * n + ix;
          if (hy > heightGrid[ci]) {
            heightGrid[ci] = hy;
          }
        }
      }
    }
  }

  // Fill any single-cell polar pinhole near mesh center
  for (let iz = 1; iz < n - 1; iz += 1) {
    for (let ix = 1; ix < n - 1; ix += 1) {
      const ci = iz * n + ix;
      if (heightGrid[ci] > -7.9) continue;
      const avg = (heightGrid[ci - 1] + heightGrid[ci + 1] + heightGrid[ci - n] + heightGrid[ci + n]) * 0.25;
      if (avg > -1.0) heightGrid[ci] = avg;
    }
  }

  function idx(ix, iz) {
    return Math.max(0, Math.min(n - 1, iz)) * n + Math.max(0, Math.min(n - 1, ix));
  }

  function worldToGrid(wx, wz) {
    const fx = (wx + gridHalfSpan) / step;
    const fz = (wz + gridHalfSpan) / step;
    return {
      ix: Math.max(0, Math.min(n - 1, Math.round(fx))),
      iz: Math.max(0, Math.min(n - 1, Math.round(fz))),
      fx,
      fz,
    };
  }

  function gridToWorld(ix, iz) {
    return {
      x: -gridHalfSpan + ix * step,
      z: -gridHalfSpan + iz * step,
    };
  }

  function getH(wx, wz) {
    const fx = (wx + gridHalfSpan) / step;
    const fz = (wz + gridHalfSpan) / step;
    const ix0 = Math.max(0, Math.min(n - 2, Math.floor(fx)));
    const iz0 = Math.max(0, Math.min(n - 2, Math.floor(fz)));
    const tx = Math.max(0.0, Math.min(1.0, fx - ix0));
    const tz = Math.max(0.0, Math.min(1.0, fz - iz0));
    const h00 = heightGrid[iz0 * n + ix0];
    const h10 = heightGrid[iz0 * n + ix0 + 1];
    const h01 = heightGrid[(iz0 + 1) * n + ix0];
    const h11 = heightGrid[(iz0 + 1) * n + ix0 + 1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  function getSlope(wx, wz, sampleR = 1.25) {
    const hx1 = getH(wx + sampleR, wz);
    const hx0 = getH(wx - sampleR, wz);
    const hz1 = getH(wx, wz + sampleR);
    const hz0 = getH(wx, wz - sampleR);
    const dhdx = (hx1 - hx0) / (2.0 * sampleR);
    const dhdz = (hz1 - hz0) / (2.0 * sampleR);
    return Math.hypot(dhdx, dhdz);
  }

  return {
    n,
    step,
    heightGrid,
    idx,
    worldToGrid,
    gridToWorld,
    getH,
    getSlope,
    maxTerrainBoundsR: maxTerrainBoundsR * canonicalScale,
  };
}

function extractPropBoxes(islandGroup, canonicalScale, terrainGetH) {
  const propBoxes = [];
  const terrainGroups = new Set();
  islandGroup.traverse((child) => {
    if (!child.isMesh) return;
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (Math.max(size.x, size.z) >= 24.0 && size.y < 140.0 && child.geometry?.type !== 'SphereGeometry') {
      terrainGroups.add(child);
    }
  });

  islandGroup.traverse((child) => {
    if (!child.isMesh || terrainGroups.has(child)) return;
    if (child.name === 'water_disc' || child.name === 'lagoon_disc' || child.name === 'lagoon_surface') return;
    const mat = child.material;
    if (mat && mat.transparent && mat.opacity !== undefined && mat.opacity < 0.5) return;
    const box = new THREE.Box3().setFromObject(child);
    const minX = box.min.x * canonicalScale;
    const maxX = box.max.x * canonicalScale;
    const minY = box.min.y * canonicalScale;
    const maxY = box.max.y * canonicalScale;
    const minZ = box.min.z * canonicalScale;
    const maxZ = box.max.z * canonicalScale;
    const sx = maxX - minX;
    const sz = maxZ - minZ;
    const sy = maxY - minY;
    if (sx > 28.0 && sz > 28.0) return; // reef/water ring
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const groundY = terrainGetH(cx, cz);
    // Ignore sub-water rock shelves or tiny low decals (< 0.45m tall)
    if (maxY < groundY + 0.45 || sy < 0.35) return;
    propBoxes.push({
      cx, cz,
      minX, maxX, minY, maxY, minZ, maxZ,
      sx, sy, sz,
      name: child.name || child.geometry?.type || 'mesh',
    });
  });
  return propBoxes;
}

function minClearanceToProps(wx, wz, propBoxes, { ignoreBelowY = -999 } = {}) {
  let minD = 999.0;
  let nearest = null;
  for (const b of propBoxes) {
    if (b.maxY < ignoreBelowY) continue;
    const dx = Math.max(b.minX - wx, 0, wx - b.maxX);
    const dz = Math.max(b.minZ - wz, 0, wz - b.maxZ);
    const d = Math.hypot(dx, dz);
    if (d < minD) {
      minD = d;
      nearest = b;
    }
  }
  return { minD, nearest };
}

/**
 * Min-bottleneck Dijkstra across the walkable grid enforcing WalkableIslandScene._tryMovePlayer rules:
 * - Bounded by |wx| <= maxWalkRadius && |wz| <= maxWalkRadius
 * - Stay dry enough to walk (nh >= -0.20)
 * - Blocked whenever uphillSlope = (nh - curH) / stepDist > 0.92 && nh > 14.0
 * - Avoids stepping inside solid prop obstacle footprints (padded by 0.45m)
 */
function computeWalkableReachability(grid, maxWalkRadius, spawnPos, propBoxes, poiTargets) {
  const { n, step, heightGrid, idx, worldToGrid, gridToWorld } = grid;
  const total = n * n;
  const blockedProp = new Uint8Array(total);
  const pad = 0.45;

  for (const b of propBoxes) {
    // Only consider obstacles protruding meaningfully at torso/foot height above local ground
    const halfSpan = (n - 1) * step * 0.5;
    const ix0 = Math.max(0, Math.floor((b.minX - pad + halfSpan) / step) - 1);
    const ix1 = Math.min(n - 1, Math.ceil((b.maxX + pad + halfSpan) / step) + 1);
    const iz0 = Math.max(0, Math.floor((b.minZ - pad + halfSpan) / step) - 1);
    const iz1 = Math.min(n - 1, Math.ceil((b.maxZ + pad + halfSpan) / step) + 1);
    for (let iz = iz0; iz <= iz1; iz += 1) {
      for (let ix = ix0; ix <= ix1; ix += 1) {
        const w = gridToWorld(ix, iz);
        if (w.x >= b.minX - pad && w.x <= b.maxX + pad && w.z >= b.minZ - pad && w.z <= b.maxZ + pad) {
          const gh = heightGrid[iz * n + ix];
          if (b.minY <= gh + 2.1 && b.maxY >= gh + 0.45) {
            blockedProp[iz * n + ix] = 1;
          }
        }
      }
    }
  }

  // Always keep a tiny seed cell around spawn & POI arrival spots unblocked if grid quantized close to a rim
  const clearNearPoint = (pt, rM = 1.1) => {
    const g = worldToGrid(pt.x, pt.z);
    const rCells = Math.ceil(rM / step);
    for (let dz = -rCells; dz <= rCells; dz += 1) {
      for (let dx = -rCells; dx <= rCells; dx += 1) {
        const ix = g.ix + dx;
        const iz = g.iz + dz;
        if (ix < 0 || ix >= n || iz < 0 || iz >= n) continue;
        const w = gridToWorld(ix, iz);
        if (Math.hypot(w.x - pt.x, w.z - pt.z) <= rM) {
          blockedProp[iz * n + ix] = 0;
        }
      }
    }
  };
  clearNearPoint(spawnPos, 1.2);
  for (const t of poiTargets) clearNearPoint(t.walkPt, 0.9);

  // Dijkstra tracking best bottleneck slope (max slope along path when nh > 14 or steep ramp), secondary distance
  const bestKey = new Float32Array(total).fill(999.0);
  const bestBottle = new Float32Array(total).fill(999.0);
  const bestDist = new Float32Array(total).fill(1e9);
  const visited = new Uint8Array(total);

  // Simple binary min-heap on [bottleneckKey, dist, cellIdx]
  const heap = [];
  const pushHeap = (key, dist, cell) => {
    heap.push([key, dist, cell]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      const hp = heap[p];
      if (hp[0] < key || (hp[0] === key && hp[1] <= dist)) break;
      heap[i] = hp;
      i = p;
    }
    heap[i] = [key, dist, cell];
  };
  const popHeap = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      let i = 0;
      const len = heap.length;
      while (true) {
        let l = (i << 1) + 1;
        let r = l + 1;
        let small = i;
        if (l < len && (heap[l][0] < last[0] || (heap[l][0] === last[0] && heap[l][1] < last[1]))) small = l;
        if (r < len && (heap[r][0] < heap[small][0] || (heap[r][0] === heap[small][0] && heap[r][1] < heap[small][1]))) {
          small = r;
        }
        if (small === i) break;
        heap[i] = heap[small];
        i = small;
      }
      heap[i] = last;
    }
    return top;
  };

  const sCellG = worldToGrid(spawnPos.x, spawnPos.z);
  const sIdx = idx(sCellG.ix, sCellG.iz);
  bestKey[sIdx] = 0.0;
  bestBottle[sIdx] = 0.0;
  bestDist[sIdx] = 0.0;
  pushHeap(0.0, 0.0, sIdx);

  const dirs = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2],
  ];

  while (heap.length > 0) {
    const [, curDist, uIdx] = popHeap();
    if (visited[uIdx]) continue;
    visited[uIdx] = 1;

    const uIx = uIdx % n;
    const uIz = (uIdx - uIx) / n;
    const curH = heightGrid[uIdx];
    const curBottle = bestBottle[uIdx];

    for (const [dx, dz, mult] of dirs) {
      const nx = uIx + dx;
      const nz = uIz + dz;
      if (nx < 0 || nx >= n || nz < 0 || nz >= n) continue;
      const vIdx = nz * n + nx;
      if (visited[vIdx] || blockedProp[vIdx]) continue;

      const w = gridToWorld(nx, nz);
      if (Math.abs(w.x) > maxWalkRadius || Math.abs(w.z) > maxWalkRadius) continue;

      const nh = heightGrid[vIdx];
      if (nh < -0.20) continue;

      const stepDist = step * mult;
      const uphillSlope = (nh - curH) / stepDist;

      // Exact runtime climb limit from WalkableIslandScene._tryMovePlayer
      if (uphillSlope > 0.92 && nh > 14.0) continue;

      const trackedSlope = nh > 14.0 ? Math.max(0.0, uphillSlope) : 0.0;
      const nextBottle = Math.max(curBottle, trackedSlope);
      const bandKey = nextBottle <= 0.72 ? 0.0 : nextBottle;
      const nextDist = curDist + stepDist;

      if (
        bandKey < bestKey[vIdx] - 1e-4 ||
        (Math.abs(bandKey - bestKey[vIdx]) <= 1e-4 && nextDist < bestDist[vIdx] - 1e-4)
      ) {
        bestKey[vIdx] = bandKey;
        bestBottle[vIdx] = nextBottle;
        bestDist[vIdx] = nextDist;
        pushHeap(bandKey, nextDist, vIdx);
      }
    }
  }

  // Evaluate each POI target (checking within 1.5 * step neighborhood for clean arrival snap)
  const poiResults = poiTargets.map((t) => {
    const h = grid.getH(t.walkPt.x, t.walkPt.z);
    const g = worldToGrid(t.walkPt.x, t.walkPt.z);
    let bestB = 999.0;
    let bestD = 1e9;
    let reachable = false;
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const ix = g.ix + dx;
        const iz = g.iz + dz;
        if (ix < 0 || ix >= n || iz < 0 || iz >= n) continue;
        const ci = iz * n + ix;
        if (visited[ci]) {
          reachable = true;
          if (bestBottle[ci] < bestB || (bestBottle[ci] === bestB && bestDist[ci] < bestD)) {
            bestB = bestBottle[ci];
            bestD = bestDist[ci];
          }
        }
      }
    }
    const clear = minClearanceToProps(t.walkPt.x, t.walkPt.z, propBoxes);
    return {
      id: t.id,
      kind: t.kind,
      x: t.walkPt.x,
      z: t.walkPt.z,
      h,
      reachable,
      bottleneckSlope: reachable ? bestB : null,
      pathDistM: reachable ? bestD : null,
      clearM: clear.minD,
    };
  });

  return { poiResults };
}

function auditVolcanicIsland(islandId) {
  const islandDef = ISLANDS[islandId] || Object.values(ISLANDS).find((i) => i.id === islandId);
  if (!islandDef) throw new Error(`Unknown island '${islandId}'`);
  if (!hasDetailedIslandModel(islandId)) {
    return { islandId, missingDetailedModel: true };
  }

  const walkSpec = getWalkableIslandSpec(islandId);
  const canonicalScale = walkSpec.canonicalScale ?? 1.55;
  const gridHalfSpan = walkSpec.gridHalfSpan ?? 115.0;
  // Use fine resolution (~1.25m per cell) so narrow ridge trails & spires resolve faithfully in BFS
  const auditGridN = Math.max(walkSpec.gridN || 152, Math.ceil((gridHalfSpan * 2.0) / 1.35));

  const assembly = createDetailedIslandAssembly(islandId);
  const group = assembly?.group || assembly;
  if (assembly?.materials) applyDetailedIslandAlpha(assembly, 1.0);
  const orientRad = getIslandApproachOrientationRad(islandId);
  group.rotation.y = orientRad;
  group.updateMatrixWorld(true);

  const configuredShoreR = getIslandShoreRadiusM(islandId);
  const grid = bakeTerrainGrid(group, gridHalfSpan, auditGridN, canonicalScale);
  const propBoxes = extractPropBoxes(group, canonicalScale, grid.getH);

  // Measure canonical +Z dry shoreline
  let canonicalShoreZ = 0.0;
  for (let z = gridHalfSpan - 2.0; z >= 0.0; z -= 0.5) {
    let hitDry = false;
    for (let x = -4.0; x <= 4.0; x += 2.0) {
      if (grid.getH(x * canonicalScale, z * canonicalScale) >= 0.05) {
        hitDry = true;
        break;
      }
    }
    if (hitDry) {
      canonicalShoreZ = z;
      break;
    }
  }

  // Measure volcanic terrain relief (dry area h >= 0.3m)
  let peakH = -999.0;
  let peakPos = { x: 0, z: 0 };
  const drySlopes = [];
  let steepCliffCells = 0; // slope > 0.92 & h > 14 (impassable dramatic volcanic rock)
  for (let iz = 2; iz < grid.n - 2; iz += 1) {
    for (let ix = 2; ix < grid.n - 2; ix += 1) {
      const w = grid.gridToWorld(ix, iz);
      const h = grid.getH(w.x, w.z);
      if (h > peakH) {
        peakH = h;
        peakPos = w;
      }
      if (h >= 0.3) {
        const sl = grid.getSlope(w.x, w.z, 1.5);
        drySlopes.push(sl);
        if (sl > 0.92 && h > 14.0) steepCliffCells += 1;
      }
    }
  }
  drySlopes.sort((a, b) => a - b);
  const p95Slope = drySlopes.length ? drySlopes[Math.floor(drySlopes.length * 0.95)] : 0;
  const maxSlope = drySlopes.length ? drySlopes[drySlopes.length - 1] : 0;
  const cliffPct = drySlopes.length ? (steepCliffCells / drySlopes.length) * 100.0 : 0.0;

  // Initial spawn audit
  const sp = walkSpec.initialSpawn;
  const spH = grid.getH(sp.x, sp.z);
  const spSlope = grid.getSlope(sp.x, sp.z, 1.4);
  const spClear = minClearanceToProps(sp.x, sp.z, propBoxes);
  const canoePos = walkSpec.mooredCanoe || { x: sp.x + 8, z: sp.z + 12 };
  const canoeDist = Math.hypot(sp.x - canoePos.x, sp.z - canoePos.z);

  // Build list of ALL POI destinations to test BFS reachability from initialSpawn
  const pois = walkSpec.pois || [];
  const poiTargets = pois.map((p) => {
    const wp = p.arrivalSpot ? { x: p.arrivalSpot.x, z: p.arrivalSpot.z } : { x: p.x, z: p.z };
    return { id: p.id, kind: p.kind, walkPt: wp, center: { x: p.x, z: p.z } };
  });
  const circlePoi = pois.find((p) => p.id === 'observation_circle' || p.kind === 'circle');
  const cx = circlePoi ? circlePoi.x : 0;
  const cz = circlePoi ? circlePoi.z : 0;
  if (circlePoi) {
    // Also require the actual observation circle center itself to be walkable!
    poiTargets.push({ id: 'observation_circle_center', kind: 'circle_center', walkPt: { x: cx, z: cz } });
  }

  const maxWalkRadius = gridHalfSpan - 8.0;
  const { poiResults } = computeWalkableReachability(grid, maxWalkRadius, sp, propBoxes, poiTargets);

  // Observation Circle terrace flatness, panoramic sky horizon, canopy clearance
  const ch = grid.getH(cx, cz);
  const ringSamples = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2.0;
    ringSamples.push(grid.getSlope(cx + Math.cos(a) * 3.8, cz + Math.sin(a) * 3.8, 1.2));
  }
  const padMaxSlope = Math.max(grid.getSlope(cx, cz, 1.2), ...ringSamples);
  const circleClear = minClearanceToProps(cx, cz, propBoxes, { ignoreBelowY: ch + 1.6 });

  // Panoramic sky horizon across 72 azimuth rays (every 5 degrees)
  const eyeY = ch + 1.65;
  let maxHorizonDeg = 0.0;
  let maxHorizonAz = 0;
  let openSkyRays = 0;
  const totalRays = 72;
  for (let azIdx = 0; azIdx < totalRays; azIdx += 1) {
    const az = azIdx * 5;
    const rad = (az * Math.PI) / 180.0;
    const ux = Math.sin(rad);
    const uz = Math.cos(rad);
    let rayMax = 0.0;
    for (let dist = 10.0; dist <= gridHalfSpan * 0.96; dist += 2.0) {
      const tx = cx + ux * dist;
      const tz = cz + uz * dist;
      const th = grid.getH(tx, tz);
      const ang = (Math.atan2(th - eyeY, dist) * 180.0) / Math.PI;
      if (ang > rayMax) rayMax = ang;
    }
    if (rayMax <= 15.0) openSkyRays += 1;
    if (rayMax > maxHorizonDeg) {
      maxHorizonDeg = rayMax;
      maxHorizonAz = az;
    }
  }
  const openSkyPct = (openSkyRays / totalRays) * 100.0;

  return {
    islandId,
    archetype: islandDef.archetype,
    canonicalScale,
    gridHalfSpan,
    maxWalkRadius,
    configuredShoreR,
    canonicalShoreZ,
    maxWalkWorldR: grid.maxTerrainBoundsR,
    peakH,
    peakPos,
    p95Slope,
    maxSlope,
    cliffPct,
    steepCliffCells,
    spawn: {
      x: sp.x,
      z: sp.z,
      h: spH,
      slope: spSlope,
      clearM: spClear.minD,
      nearest: spClear.nearest,
      canoeDist,
      canoeTestOk: spClear.minD >= 6.5 && canoeDist >= 6.5 && canoeDist <= 28.0,
    },
    poiResults,
    circle: {
      x: cx,
      z: cz,
      h: ch,
      padSlope: padMaxSlope,
      maxHorizonDeg,
      maxHorizonAz,
      openSkyPct,
      clearM: circleClear.minD,
      nearest: circleClear.nearest,
    },
  };
}

function formatReport(r) {
  if (r.missingDetailedModel) {
    return `\n=== Volcanic Island Audit: ${r.islandId} ===\n  [SKIP] No detailed builder model yet.`;
  }
  const flag = (ok, warnCond) => (ok ? 'PASS' : warnCond ? 'WARN' : 'FAIL');
  const shoreDiff = Math.abs(r.canonicalShoreZ - r.configuredShoreR);
  const sizeFlag = flag(r.canonicalShoreZ >= 58.0 && shoreDiff <= 2.5, r.canonicalShoreZ >= 45.0 && shoreDiff <= 4.0);
  const scaleFlag = flag(r.canonicalScale <= 1.05, false);
  const boundsFlag = flag(r.maxWalkWorldR <= r.maxWalkRadius, false);

  // Volcanic relief encourages high peaks + crisp steep cliffs (informational/drama check)
  const reliefFlag = r.peakH >= 50.0 ? 'PASS' : r.peakH >= 32.0 ? 'WARN' : 'INFO';

  const spawnFlag = flag(
    r.spawn.h >= 0.25 && r.spawn.slope <= 0.35 && r.spawn.clearM >= 6.5 && r.spawn.canoeTestOk,
    r.spawn.h >= 0.15 && r.spawn.clearM >= 4.0
  );

  // Walkable POI paths check (EVERY POI + circle must be reachable!)
  const blockedPois = r.poiResults.filter((p) => !p.reachable);
  const tightPois = r.poiResults.filter((p) => p.reachable && ((p.bottleneckSlope ?? 0) > 0.85 || p.clearM < 2.0));
  const pathFlag = flag(blockedPois.length === 0 && tightPois.length === 0, blockedPois.length === 0);

  const circPadFlag = flag(r.circle.h >= 0.4 && r.circle.padSlope <= 0.18, r.circle.padSlope <= 0.32);
  // Panoramic star-horizon check: >=75% open sky (<=15deg) & max obstacle <=28deg (dramatic spire backdrop allowed!)
  const circSkyFlag = flag(
    r.circle.openSkyPct >= 75.0 && r.circle.maxHorizonDeg <= 28.0,
    r.circle.openSkyPct >= 60.0 && r.circle.maxHorizonDeg <= 40.0
  );
  const circClearFlag = flag(r.circle.clearM >= 10.0, r.circle.clearM >= 6.0);

  const lines = [
    `\n=== Volcanic Island Audit: ${r.islandId} (${r.archetype}) ===`,
    `  [${sizeFlag}] Canonical +Z Shore : ${r.canonicalShoreZ.toFixed(1)}m (configured=${r.configuredShoreR.toFixed(1)}m, diff=${shoreDiff.toFixed(1)}m | 2x target >= 58m)`,
    `  [${scaleFlag}] Walkable Scale     : canonicalScale=${r.canonicalScale.toFixed(2)} (target = 1.00)`,
    `  [${boundsFlag}] Walkable Bounds    : scaledOuterR=${r.maxWalkWorldR.toFixed(1)}m vs maxWalkRadius=${r.maxWalkRadius.toFixed(1)}m (gridHalfSpan=${r.gridHalfSpan})`,
    `  [${reliefFlag}] Volcanic Relief    : peak=${r.peakH.toFixed(1)}m @ (${r.peakPos.x.toFixed(0)},${r.peakPos.z.toFixed(0)}) | p95Slope=${r.p95Slope.toFixed(2)} | maxSlope=${r.maxSlope.toFixed(2)} | impassable(>0.92)=${r.cliffPct.toFixed(1)}% (${r.steepCliffCells} cells)`,
    `  [${spawnFlag}] Initial Spawn      : (${r.spawn.x}, ${r.spawn.z}) h=${r.spawn.h.toFixed(2)}m | slope=${r.spawn.slope.toFixed(2)} | propClear=${r.spawn.clearM.toFixed(1)}m | canoeDist=${r.spawn.canoeDist.toFixed(1)}m`,
    `  [${pathFlag}] Walkable POI Paths : ${r.poiResults.length - blockedPois.length}/${r.poiResults.length} reachable from spawn`,
  ];

  for (const p of r.poiResults) {
    const status = !p.reachable
      ? 'BLOCKED'
      : p.bottleneckSlope > 0.85
        ? `TIGHT(${p.bottleneckSlope.toFixed(2)})`
        : 'OK';
    const pathInfo = p.reachable
      ? `dist=${p.pathDistM.toFixed(0)}m, bottleneck=${p.bottleneckSlope.toFixed(2)}`
      : 'UNREACHABLE (blocked by >0.92 slope/prop/bounds)';
    lines.push(`      - ${p.id.padEnd(25)} [${status.padEnd(7)}] (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) h=${p.h.toFixed(1)}m | clear=${p.clearM.toFixed(1)}m | ${pathInfo}`);
  }

  lines.push(
    `  [${circPadFlag}] Circle Terrace     : (${r.circle.x}, ${r.circle.z}) h=${r.circle.h.toFixed(2)}m | padSlope=${r.circle.padSlope.toFixed(2)} (target <= 0.18)`,
    `  [${circSkyFlag}] Circle Sky Horizon : openSky=${r.circle.openSkyPct.toFixed(0)}% (target >= 75%) | maxHorizon=${r.circle.maxHorizonDeg.toFixed(1)}deg @ az=${r.circle.maxHorizonAz}deg (target <= 28deg)`,
    `  [${circClearFlag}] Circle Canopy Clear: propClear=${r.circle.clearM.toFixed(1)}m (target >= 10.0m)`
  );

  return lines.join('\n');
}

const logLine = typeof print === 'function' ? print : console.log;
const ALL_ISLAND_LIST = Object.values(ISLANDS);
const VOLCANIC_IDS = ALL_ISLAND_LIST.filter((i) => i.archetype !== 'coral_atoll').map((i) => i.id);
const rawArgs =
  typeof arguments !== 'undefined'
    ? Array.from(arguments)
    : typeof scriptArgs !== 'undefined'
      ? Array.from(scriptArgs)
      : typeof process !== 'undefined'
        ? process.argv.slice(2)
        : [];
const targets =
  rawArgs.includes('--all')
    ? ALL_ISLAND_LIST.map((i) => i.id)
    : rawArgs.includes('--volcanic') || rawArgs.length === 0
      ? VOLCANIC_IDS
      : rawArgs.filter((a) => !a.startsWith('-'));

for (const id of targets) {
  try {
    const report = auditVolcanicIsland(id);
    logLine(formatReport(report));
  } catch (err) {
    logLine(`\n=== Volcanic Island Audit: ${id} ===\n  [ERROR] ${err?.message || err}`);
  }
}
