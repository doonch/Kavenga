/**
 * Headless Three.js Layout, Slope, Clearance & Sky-Visibility Auditor for Kavenga Islands.
 * Invoked via `python3 .agents/skills/island-redesign/scripts/run_audit.py <islandId|--all>`.
 */

import * as THREE from 'three';
import {
  getWalkableIslandSpec,
  WALKABLE_ISLAND_SPECS,
} from './src/data/walkableIslandsData.js';
import { ISLANDS } from './src/data/islandsData.js';
import {
  applyDetailedIslandAlpha,
  createDetailedIslandAssembly,
  getIslandApproachOrientationRad,
  getIslandShoreRadiusM,
  hasDetailedIslandModel,
} from './src/rendering/IslandTerrainBuilder.js';

function bakeTerrainGrid(assemblyGroup, gridHalfSpan = 160.0, gridN = 240) {
  const N = gridN;
  const stride = N + 1;
  const span = gridHalfSpan * 2.0;
  const invStep = N / span;
  const step = span / N;
  const heightGrid = new Float32Array(stride * stride);
  heightGrid.fill(-9.0);

  assemblyGroup.updateMatrixWorld(true);
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
  if (!terrainMesh) return { heightGrid, gridHalfSpan, gridN, stride, step, maxWorldRadius: 0 };

  const posAttr = terrainMesh.geometry.getAttribute('position');
  const idxAttr = terrainMesh.geometry.index;
  const mw = terrainMesh.matrixWorld.elements;
  const vCount = posAttr.count;
  const wx = new Float32Array(vCount);
  const wy = new Float32Array(vCount);
  const wz = new Float32Array(vCount);

  let maxWorldRadius = 0;
  for (let i = 0; i < vCount; i += 1) {
    const lx = posAttr.getX(i);
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);
    wx[i] = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
    wy[i] = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
    wz[i] = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];
    const r = Math.hypot(wx[i], wz[i]);
    if (r > maxWorldRadius) maxWorldRadius = r;
  }

  const idxArr = idxAttr.array;
  for (let t = 0; t < idxArr.length; t += 3) {
    const i0 = idxArr[t];
    const i1 = idxArr[t + 1];
    const i2 = idxArr[t + 2];
    const x0 = wx[i0], y0 = wy[i0], z0 = wz[i0];
    const x1 = wx[i1], y1 = wy[i1], z1 = wz[i1];
    const x2 = wx[i2], y2 = wy[i2], z2 = wz[i2];
    const denom = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
    if (Math.abs(denom) < 1e-6) continue;
    const invDenom = 1.0 / denom;

    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minZ = Math.min(z0, z1, z2);
    const maxZ = Math.max(z0, z1, z2);

    const gx0 = Math.max(0, Math.floor((minX + gridHalfSpan) * invStep));
    const gx1 = Math.min(N, Math.ceil((maxX + gridHalfSpan) * invStep));
    const gz0 = Math.max(0, Math.floor((minZ + gridHalfSpan) * invStep));
    const gz1 = Math.min(N, Math.ceil((maxZ + gridHalfSpan) * invStep));

    for (let gz = gz0; gz <= gz1; gz += 1) {
      const pz = -gridHalfSpan + gz * step;
      for (let gx = gx0; gx <= gx1; gx += 1) {
        const px = -gridHalfSpan + gx * step;
        const w0 = ((z1 - z2) * (px - x2) + (x2 - x1) * (pz - z2)) * invDenom;
        const w1 = ((z2 - z0) * (px - x2) + (x0 - x2) * (pz - z2)) * invDenom;
        const w2 = 1.0 - w0 - w1;
        if (w0 >= -1e-4 && w1 >= -1e-4 && w2 >= -1e-4) {
          const py = w0 * y0 + w1 * y1 + w2 * y2;
          const cell = gz * stride + gx;
          if (py > heightGrid[cell]) heightGrid[cell] = py;
        }
      }
    }
  }

  for (let gz = 1; gz < N; gz += 1) {
    for (let gx = 1; gx < N; gx += 1) {
      const cell = gz * stride + gx;
      if (heightGrid[cell] > -8.9) continue;
      const n0 = heightGrid[cell - 1];
      const n1 = heightGrid[cell + 1];
      const n2 = heightGrid[cell - stride];
      const n3 = heightGrid[cell + stride];
      if (n0 > -1 && n1 > -1 && n2 > -1 && n3 > -1) {
        heightGrid[cell] = (n0 + n1 + n2 + n3) * 0.25;
      }
    }
  }

  const getH = (x, z) => {
    const gx = Math.max(0, Math.min(N - 0.001, (x + gridHalfSpan) * invStep));
    const gz = Math.max(0, Math.min(N - 0.001, (z + gridHalfSpan) * invStep));
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const h00 = heightGrid[iz * stride + ix];
    const h10 = heightGrid[iz * stride + (ix + 1)];
    const h01 = heightGrid[(iz + 1) * stride + ix];
    const h11 = heightGrid[(iz + 1) * stride + (ix + 1)];
    if (fz >= fx) return h00 + fz * (h01 - h00) + fx * (h11 - h01);
    return h00 + fx * (h10 - h00) + fz * (h11 - h10);
  };

  const getSlope = (x, z, d = 1.2) => {
    const dhx = (getH(x + d, z) - getH(x - d, z)) / (2 * d);
    const dhz = (getH(x, z + d) - getH(x, z - d)) / (2 * d);
    return Math.hypot(dhx, dhz);
  };

  return { terrainMesh, heightGrid, gridHalfSpan, gridN, maxWorldRadius, getH, getSlope };
}

function extractPropBoxes(assemblyGroup, terrainMesh) {
  const boxes = [];
  const tempBox = new THREE.Box3();
  const size = new THREE.Vector3();

  assemblyGroup.updateMatrixWorld(true);
  assemblyGroup.traverse((obj) => {
    if (!obj.isMesh || obj === terrainMesh) return;
    if (obj.material?.depthWrite === false) return; // skip water/foam sheets
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
    tempBox.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
    tempBox.getSize(size);
    // Skip huge lagoon discs / barrier reef & surf collars spanning > 18m horizontally
    if (size.y < 6.0 && Math.max(size.x, size.z) > 18.0) return;
    boxes.push({
      minX: tempBox.min.x,
      maxX: tempBox.max.x,
      minY: tempBox.min.y,
      maxY: tempBox.max.y,
      minZ: tempBox.min.z,
      maxZ: tempBox.max.z,
      name: obj.name || 'prop',
    });
  });
  return boxes;
}

function minClearanceToProps(x, z, propBoxes) {
  let minD = Infinity;
  let nearest = null;
  for (const b of propBoxes) {
    const dx = Math.max(b.minX - x, 0, x - b.maxX);
    const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
    const d = Math.hypot(dx, dz);
    if (d < minD) {
      minD = d;
      nearest = b;
    }
  }
  return { minDist: minD, nearest };
}

function auditIsland(islandId) {
  const isl = ISLANDS[islandId];
  const wSpec = getWalkableIslandSpec(islandId);
  if (!isl || !wSpec || !hasDetailedIslandModel(islandId)) {
    throw new Error(`Unknown or non-detailed islandId: ${islandId}`);
  }

  const scale = wSpec.canonicalScale ?? 1.55;
  const gridHalfSpan = Math.max(180.0, (wSpec.gridHalfSpan || 115.0) + 40.0);
  const asm = createDetailedIslandAssembly(islandId);
  applyDetailedIslandAlpha(asm, 1.0);
  asm.group.rotation.y = getIslandApproachOrientationRad(islandId);
  asm.group.scale.setScalar(scale);

  const grid = bakeTerrainGrid(asm.group, gridHalfSpan, 240);
  const props = extractPropBoxes(asm.group, grid.terrainMesh);

  // 1. Canonical shore & bounds measurements
  let measuredWalkShoreZ = 0;
  for (let z = gridHalfSpan - 2.0; z >= 0; z -= 0.5) {
    let wetOrDry = false;
    for (let x = -4.0; x <= 4.0; x += 2.0) {
      if (grid.getH(x, z) >= 0.08) {
        wetOrDry = true;
        break;
      }
    }
    if (wetOrDry) {
      measuredWalkShoreZ = z;
      break;
    }
  }
  const canonicalShoreZ = measuredWalkShoreZ / scale;
  const configuredShoreM = getIslandShoreRadiusM(islandId, isl.archetype);
  const canonicalOuterR = grid.maxWorldRadius / scale;

  // 2. Dry terrain slope & coastline circularity profile
  const drySlopes = [];
  let maxPeakH = -Infinity;
  let maxWalkableSlope = 0;
  let steepWalkCells = 0;
  let blockedCells = 0;

  for (let z = -gridHalfSpan + 4; z <= gridHalfSpan - 4; z += 2.5) {
    for (let x = -gridHalfSpan + 4; x <= gridHalfSpan - 4; x += 2.5) {
      const h = grid.getH(x, z);
      if (h > maxPeakH) maxPeakH = h;
      if (h >= 0.25) {
        const sl = grid.getSlope(x, z, 1.3);
        drySlopes.push(sl);
        if (sl > 0.55) steepWalkCells += 1;
        if (sl > 0.92 && h > 14.0) blockedCells += 1;
        if (sl > maxWalkableSlope) maxWalkableSlope = sl;
      }
    }
  }
  drySlopes.sort((a, b) => a - b);
  const p95Slope = drySlopes.length ? drySlopes[Math.floor(drySlopes.length * 0.95)] : 0;
  const pctOver55 = drySlopes.length ? (steepWalkCells / drySlopes.length) * 100 : 0;

  // Circularity check: outer coastline radius across 72 angles
  const coastRadii = [];
  for (let i = 0; i < 72; i += 1) {
    const a = (i / 72) * Math.PI * 2.0;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    for (let r = gridHalfSpan - 4; r >= 2; r -= 1.0) {
      if (grid.getH(dx * r, dz * r) >= 0.1) {
        coastRadii.push(r / scale);
        break;
      }
    }
  }
  const rMean = coastRadii.reduce((s, v) => s + v, 0) / Math.max(1, coastRadii.length);
  const rMin = Math.min(...coastRadii);
  const rMax = Math.max(...coastRadii);
  const radialVariation = rMean > 0 ? (rMax - rMin) / rMean : 0;

  // 3. Spawn & POI clearance
  const sp = wSpec.initialSpawn;
  const spH = grid.getH(sp.x, sp.z);
  const spSlope = grid.getSlope(sp.x, sp.z, 1.0);
  const spClearObj = minClearanceToProps(sp.x, sp.z, props);
  const spPropClear = spClearObj.minDist;
  const spawnToCanoe = Math.hypot(sp.x - wSpec.mooredCanoe.x, sp.z - wSpec.mooredCanoe.z);
  const canoePoi = wSpec.pois.find((p) => p.id === 'canoe_landing');
  const spawnToLanding = canoePoi ? Math.hypot(sp.x - canoePoi.x, sp.z - canoePoi.z) : 99;
  const canoeTestOk =
    spawnToCanoe > 3.5 &&
    spawnToCanoe < 12.0 &&
    (!canoePoi || spawnToLanding > canoePoi.triggerRadiusM);
  const spNearest = spClearObj.nearest
    ? {
        cx: ((spClearObj.nearest.minX + spClearObj.nearest.maxX) * 0.5).toFixed(1),
        cz: ((spClearObj.nearest.minZ + spClearObj.nearest.maxZ) * 0.5).toFixed(1),
        w: (spClearObj.nearest.maxX - spClearObj.nearest.minX).toFixed(1),
        d: (spClearObj.nearest.maxZ - spClearObj.nearest.minZ).toFixed(1),
      }
    : null;

  // 4. Observation Circle checks
  const circlePoi = wSpec.pois.find((p) => p.kind === 'circle');
  const cx = circlePoi.x;
  const cz = circlePoi.z;
  const cH = grid.getH(cx, cz);
  let circleMaxPadSlope = 0;
  for (let a = 0; a < 8; a += 1) {
    const ang = (a / 8) * Math.PI * 2.0;
    const sl = grid.getSlope(cx + Math.cos(ang) * 2.5, cz + Math.sin(ang) * 2.5, 1.0);
    if (sl > circleMaxPadSlope) circleMaxPadSlope = sl;
  }
  const circlePropClear = minClearanceToProps(cx, cz, props).minDist;

  let maxHorizonDeg = 0;
  let worstAzDeg = 0;
  for (let a = 0; a < 36; a += 1) {
    const rad = (a / 36) * Math.PI * 2.0;
    const dx = Math.cos(rad);
    const dz = Math.sin(rad);
    for (let dist = 10.0; dist <= gridHalfSpan - 8.0; dist += 2.5) {
      const px = cx + dx * dist;
      const pz = cz + dz * dist;
      const h = grid.getH(px, pz);
      const elevDeg = (Math.atan2(h - (cH + 1.5), dist) * 180.0) / Math.PI;
      if (elevDeg > maxHorizonDeg) {
        maxHorizonDeg = elevDeg;
        worstAzDeg = a * 10;
      }
    }
  }

  return {
    islandId,
    archetype: isl.archetype,
    canonicalScale: scale,
    walkGridHalfSpan: wSpec.gridHalfSpan || 115.0,
    canonicalShoreZ,
    configuredShoreM,
    canonicalOuterR,
    maxWalkWorldR: grid.maxWorldRadius,
    peakHeightM: maxPeakH / scale,
    p95Slope,
    pctOver55,
    blockedCells,
    radialVariation,
    spawn: { x: sp.x, z: sp.z, h: spH, slope: spSlope, clearM: spPropClear, nearest: spNearest, canoeTestOk, spawnToCanoe },
    circle: {
      x: cx,
      z: cz,
      h: cH,
      padSlope: circleMaxPadSlope,
      clearM: circlePropClear,
      maxHorizonDeg,
      worstAzDeg,
    },
  };
}

function formatReport(r) {
  const flag = (ok, warn) => (ok ? 'PASS' : warn ? 'WARN' : 'FAIL');
  const shoreDiff = Math.abs(r.canonicalShoreZ - r.configuredShoreM);
  const sizeFlag = flag(r.canonicalShoreZ >= 58.0 && shoreDiff <= 2.5, r.canonicalShoreZ >= 45.0 && shoreDiff <= 4.0);
  const scaleFlag = flag(r.canonicalScale <= 1.05, false);
  const boundsFlag = flag(r.maxWalkWorldR <= r.walkGridHalfSpan - 8.0, false);
  const slopeFlag = flag(r.p95Slope <= 0.82 && r.blockedCells === 0, r.p95Slope <= 0.92 && r.blockedCells <= 10);
  const spawnFlag = flag(r.spawn.h >= 0.25 && r.spawn.slope <= 0.35 && r.spawn.clearM >= 6.5 && r.spawn.canoeTestOk, r.spawn.clearM >= 4.0 && r.spawn.canoeTestOk);
  const circPadFlag = flag(r.circle.h >= 0.4 && r.circle.padSlope <= 0.18, r.circle.padSlope <= 0.32);
  const circSkyFlag = flag(r.circle.maxHorizonDeg <= 12.0, r.circle.maxHorizonDeg <= 20.0);
  const circClearFlag = flag(r.circle.clearM >= 10.0, r.circle.clearM >= 6.0);
  const atollFlag =
    r.archetype === 'coral_atoll'
      ? flag(r.radialVariation >= 0.2, r.radialVariation >= 0.12)
      : 'INFO';

  print(`\n=== Island Layout Audit: ${r.islandId} (${r.archetype}) ===`);
  print(`  [${sizeFlag}] Canonical +Z Shore : ${r.canonicalShoreZ.toFixed(1)}m (configured ISLAND_SHORE_RADIUS_M = ${r.configuredShoreM.toFixed(1)}m, diff=${shoreDiff.toFixed(1)}m | 2x target >= 58m)`);
  print(`  [${scaleFlag}] Walkable Scale     : canonicalScale=${r.canonicalScale.toFixed(2)} (Option A target = 1.00)`);
  print(`  [${boundsFlag}] Walkable Bounds    : scaledOuterR=${r.maxWalkWorldR.toFixed(1)}m vs maxWalkRadius=${(r.walkGridHalfSpan - 8.0).toFixed(1)}m (gridHalfSpan=${r.walkGridHalfSpan})`);
  print(`  [${slopeFlag}] Relief & Slopes    : peak=${r.peakHeightM.toFixed(1)}m | p95Slope=${r.p95Slope.toFixed(2)} | >0.55 slope=${r.pctOver55.toFixed(1)}% | >0.92 blockedCells=${r.blockedCells}`);
  print(`  [${atollFlag}] Coast Circularity  : radialVariation=${r.radialVariation.toFixed(2)} (atoll target >= 0.20)`);
  const spNearNote = r.spawn.nearest
    ? ` nearest=(${r.spawn.nearest.cx},${r.spawn.nearest.cz} ${r.spawn.nearest.w}x${r.spawn.nearest.d}m)`
    : '';
  print(`  [${spawnFlag}] Initial Spawn      : (${r.spawn.x}, ${r.spawn.z}) h=${r.spawn.h.toFixed(2)}m | slope=${r.spawn.slope.toFixed(2)} | propClear=${r.spawn.clearM.toFixed(1)}m (target >= 6.5m) | canoeDist=${r.spawn.spawnToCanoe.toFixed(1)}m${spNearNote}`);
  print(`  [${circPadFlag}] Circle Terrace     : (${r.circle.x}, ${r.circle.z}) h=${r.circle.h.toFixed(2)}m | padSlope=${r.circle.padSlope.toFixed(2)} (target <= 0.18)`);
  print(`  [${circSkyFlag}] Circle Sky View    : maxTerrainHorizon=${r.circle.maxHorizonDeg.toFixed(1)}deg @ az=${r.circle.worstAzDeg}deg (target <= 12.0deg)`);
  print(`  [${circClearFlag}] Circle Canopy Clear: propClear=${r.circle.clearM.toFixed(1)}m (target >= 10.0m)`);
}

const rawArgs = typeof arguments !== 'undefined' ? Array.from(arguments) : [];
const ids =
  rawArgs.includes('--all') || rawArgs.length === 0
    ? Object.keys(WALKABLE_ISLAND_SPECS)
    : rawArgs;

for (const id of ids) {
  formatReport(auditIsland(id));
}
