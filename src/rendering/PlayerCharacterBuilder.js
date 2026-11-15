/**
 * Procedural 3D Player Character Builder for Kavenga: Songs of the Star Path.
 *
 * Defines four traditional Polynesian wayfinder character designs tied to difficulty mode:
 *  - Easy (`easy` / Apprentice): 12-14 year old youth apprentice in woven pandanus pareu,
 *    braided green auti (ti-leaf) headband with tipanie blossoms, cowrie cord & star-shell pouch.
 *  - Medium (`medium` / Wayfinder): 18-20 year old young adult wayfinder with high topknot,
 *    frigatebird feather, diagonal barkcloth kihei sash, wave-patterned tapa wrap & first tatau.
 *  - Hard (`hard` / Navigator): 30 year old broad-shouldered navigator with flowing dark hair,
 *    crimson kura feather circlet & twin plumes, ti-leaf mantle, layered ta'ovala mat & full tatau.
 *  - Master Navigator (`master_navigator`): 50 year old elder master navigator with a full
 *    silver-gray beard, streaked crown knot, golden-crimson feather & pearl-shell headdress,
 *    sacred taumi chest gorget, master tatau, and wind-rippling ceremonial kahu tapa cloak.
 */

import * as THREE from 'three';
import { Difficulty } from '../core/gameConstants.js';
import {
  PLAYER_CHARACTER_PROFILES,
  getPlayerCharacterProfile,
} from '../data/playerCharactersData.js';

export { PLAYER_CHARACTER_PROFILES, getPlayerCharacterProfile };

// ---------------------------------------------------------------------------
// Shared Procedural Geometry Helpers (Elliptical Loft, Patterned Tapa, Plumes)
// ---------------------------------------------------------------------------

/**
 * Lofts an anatomical elliptical tube along Y from ring definitions [{ y, rx, rz, ox?, oz? }].
 */
function createLoftedBodyPartGeometry(rings, radialSegments = 16, capEnds = true) {
  const positions = [];
  const indices = [];
  const ringVertIndices = [];

  for (let r = 0; r < rings.length; r += 1) {
    const { y, rx, rz, ox = 0.0, oz = 0.0 } = rings[r];
    const row = [];
    for (let s = 0; s < radialSegments; s += 1) {
      const theta = (s / radialSegments) * Math.PI * 2.0;
      const x = ox + Math.cos(theta) * rx;
      const z = oz + Math.sin(theta) * rz;
      const idx = positions.length / 3;
      positions.push(x, y, z);
      row.push(idx);
    }
    ringVertIndices.push(row);
  }

  for (let r = 0; r < rings.length - 1; r += 1) {
    const rowA = ringVertIndices[r];
    const rowB = ringVertIndices[r + 1];
    for (let s = 0; s < radialSegments; s += 1) {
      const sNext = (s + 1) % radialSegments;
      const a0 = rowA[s];
      const a1 = rowA[sNext];
      const b0 = rowB[s];
      const b1 = rowB[sNext];
      indices.push(a0, b0, b1, a0, b1, a1);
    }
  }

  if (capEnds && rings.length >= 2) {
    const bot = rings[0];
    const botCenter = positions.length / 3;
    positions.push(bot.ox ?? 0.0, bot.y, bot.oz ?? 0.0);
    for (let s = 0; s < radialSegments; s += 1) {
      const sNext = (s + 1) % radialSegments;
      indices.push(botCenter, ringVertIndices[0][sNext], ringVertIndices[0][s]);
    }

    const top = rings[rings.length - 1];
    const topCenter = positions.length / 3;
    positions.push(top.ox ?? 0.0, top.y, top.oz ?? 0.0);
    const lastRow = ringVertIndices[rings.length - 1];
    for (let s = 0; s < radialSegments; s += 1) {
      const sNext = (s + 1) % radialSegments;
      indices.push(topCenter, lastRow[s], lastRow[sNext]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a wraparound Polynesian pareu / lavalava skirt with vertex-colored traditional border motifs
 * and a natural front-side overlap pleat.
 */
function createPareuSkirtMesh({
  topRx,
  topRz,
  botRx,
  botRz,
  height,
  baseRgb,
  bandRgb,
  trimRgb,
  wovenCheck = false,
}) {
  const segU = 28;
  const segV = 12;
  const positions = [];
  const colors = [];
  const indices = [];

  for (let iv = 0; iv <= segV; iv += 1) {
    const v = iv / segV; // 0 = waist top, 1 = hem bottom
    const y = -v * height;
    const flare = Math.pow(v, 1.15);
    const rx = topRx + (botRx - topRx) * flare;
    const rz = topRz + (botRz - topRz) * flare;

    for (let iu = 0; iu <= segU; iu += 1) {
      const u = iu / segU;
      const theta = u * Math.PI * 2.0;
      // Subtle front-wrap overlap fold near theta ~ -1.15 (-Z front-left)
      const pleat =
        0.014 * Math.exp(-Math.pow(((u - 0.68) * 9.0), 2.0)) * (0.3 + 0.7 * v);
      const drapeWave = 0.006 * Math.sin(theta * 5.0) * v;
      const x = Math.cos(theta) * (rx + pleat + drapeWave);
      const z = Math.sin(theta) * (rz + pleat + drapeWave);
      positions.push(x, y, z);

      let col = baseRgb;
      if (wovenCheck) {
        const check =
          (Math.floor(u * 36.0) + Math.floor(v * 16.0)) % 2 === 0 ? 1.0 : 0.91;
        col = [baseRgb[0] * check, baseRgb[1] * check, baseRgb[2] * check];
      }

      // Traditional geometric niho (spear/shark-tooth) & swell border bands near hem
      const saw = Math.abs(((u * 18.0) % 1.0) * 2.0 - 1.0);
      if (v > 0.88) {
        col = trimRgb;
      } else if (v > 0.72 && v < 0.86) {
        col = v - 0.72 > saw * 0.09 ? bandRgb : trimRgb;
      } else if (v > 0.56 && v < 0.62) {
        col = bandRgb;
      }

      colors.push(col[0], col[1], col[2]);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv += 1) {
    for (let iu = 0; iu < segU; iu += 1) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, c, d, a, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds a ceremonial Kahu Tapa voyaging shoulder cloak draping down the Master Navigator's back (+Z).
 */
function createKahuTapaCloakMesh(shoulderW, cloakLen) {
  const segU = 18;
  const segV = 14;
  const positions = [];
  const colors = [];
  const indices = [];

  const ivory = [0.88, 0.81, 0.67];
  const crimson = [0.58, 0.14, 0.11];
  const umber = [0.18, 0.11, 0.08];

  for (let iv = 0; iv <= segV; iv += 1) {
    const v = iv / segV; // 0 = shoulders, 1 = lower hem
    const y = -v * cloakLen;
    const halfSpan = shoulderW * (0.56 + 0.34 * Math.pow(v, 0.85));

    for (let iu = 0; iu <= segU; iu += 1) {
      const u = iu / segU; // 0 = left edge, 1 = right edge
      const s = u * 2.0 - 1.0; // -1 .. +1
      // Curves smoothly around upper back & shoulders (+Z is back of character!)
      const x = s * halfSpan;
      const wrapArc = (1.0 - s * s) * (0.055 + 0.035 * v);
      const foldRipple = Math.sin(s * Math.PI * 3.0) * 0.012 * v;
      const z = 0.095 + wrapArc + v * 0.085 + foldRipple;

      positions.push(x, y, z);

      const edgeDist = Math.min(u, 1.0 - u);
      const saw = Math.abs(((u * 14.0) % 1.0) * 2.0 - 1.0);
      let col = ivory;
      if (v > 0.9 || edgeDist < 0.055) {
        col = crimson;
      } else if (v > 0.78 && v <= 0.9) {
        col = v - 0.78 > saw * 0.08 ? umber : ivory;
      } else if (edgeDist < 0.11 || (v > 0.06 && v < 0.12)) {
        col = umber;
      }
      colors.push(col[0], col[1], col[2]);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv += 1) {
    for (let iu = 0; iu < segU; iu += 1) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, d, c, a, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, geo, basePositions: Float32Array.from(positions) };
}

function createFeatherPlume(length, width, colorHex, tipHex = null) {
  const grp = new THREE.Group();
  const quillMat = new THREE.MeshStandardMaterial({
    color: 0xeae0cc,
    roughness: 0.65,
  });
  const vaneMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });

  const quill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.005, length, 5),
    quillMat
  );
  quill.position.y = length * 0.5;
  grp.add(quill);

  const shape = new THREE.Shape();
  shape.moveTo(0, length * 0.12);
  shape.quadraticCurveTo(width, length * 0.55, 0, length);
  shape.quadraticCurveTo(-width * 0.88, length * 0.55, 0, length * 0.12);

  const vane = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), vaneMat);
  grp.add(vane);

  if (tipHex !== null) {
    const tip = new THREE.Mesh(
      new THREE.CircleGeometry(width * 0.52, 8),
      new THREE.MeshStandardMaterial({
        color: tipHex,
        roughness: 0.55,
        side: THREE.DoubleSide,
      })
    );
    tip.position.set(0, length * 0.84, 0.002);
    tip.scale.set(0.8, 1.45, 1.0);
    grp.add(tip);
  }
  return grp;
}

function addTatauBands(parentMeshGroup, radiiY, bandMat) {
  for (const { y, r, h = 0.022 } of radiiY) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.025, r * 1.015, h, 14, 1, true),
      bandMat
    );
    band.position.y = y;
    parentMeshGroup.add(band);
  }
}

// ---------------------------------------------------------------------------
// Main Articulated Polynesian Character Builder
// ---------------------------------------------------------------------------

/**
 * Builds a complete, articulated 3D Polynesian player character for the specified difficulty.
 * Character faces -Z (dead ahead toward the canoe's twin manu prows), with feet at y = 0.0.
 */
export function createPlayerCharacterRig(difficulty = Difficulty.EASY) {
  const spec = getPlayerCharacterProfile(difficulty);
  const H = spec.totalHeightM;
  const lt = spec.limbThickness;

  const root = new THREE.Group();
  root.name = `player_character_${spec.id}`;

  // Shared materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: spec.skinHex,
    roughness: 0.66,
    metalness: 0.03,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: spec.hairHex,
    roughness: 0.78,
  });
  const darkHairStreakMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.76,
  });
  const silverBeardMat = new THREE.MeshStandardMaterial({
    color: 0xc8cfd8,
    roughness: 0.74,
  });
  const sennitMat = new THREE.MeshStandardMaterial({
    color: 0x4b2d17,
    roughness: 0.86,
  });
  const pandanusMat = new THREE.MeshStandardMaterial({
    color: 0xd9bc84,
    roughness: 0.84,
  });
  const pearlShellMat = new THREE.MeshStandardMaterial({
    color: 0xeef5f4,
    roughness: 0.25,
    metalness: 0.28,
  });
  const blackPearlMat = new THREE.MeshStandardMaterial({
    color: 0x2e4a52,
    roughness: 0.22,
    metalness: 0.38,
  });
  const tiLeafMat = new THREE.MeshStandardMaterial({
    color: 0x3b762f,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const kuraRedMat = new THREE.MeshStandardMaterial({
    color: 0xc82d22,
    roughness: 0.62,
  });
  const kuraGoldMat = new THREE.MeshStandardMaterial({
    color: 0xe9a934,
    roughness: 0.58,
  });
  const tatauMat = new THREE.MeshStandardMaterial({
    color: 0x1c252c,
    roughness: 0.74,
    side: THREE.DoubleSide,
  });

  // Key vertical landmarks scaled proportionally to totalHeightM
  const hipY = H * 0.525;
  const waistY = H * 0.585;
  const shoulderY = H * 0.815;
  const neckBaseY = H * 0.845;
  const headCenterY = H - spec.headRadiusM * 1.05;

  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0.0, hipY, 0.0);
  root.add(pelvisGroup);

  // -------------------------------------------------------------------------
  // 1. Bare Feet, Sculpted Calves & Thighs (Wide Balanced Sea-Legs Stance)
  // -------------------------------------------------------------------------
  const stanceHalfX = spec.hipWidthM * 0.44;
  const legLen = hipY;
  const thighLen = legLen * 0.5;
  const shinLen = legLen * 0.44;
  const ankleY = legLen * 0.06;

  const legs = {};
  for (const side of [-1, 1]) {
    const hipPivot = new THREE.Group();
    const zStanceOffset = side < 0 ? -0.055 : 0.065; // Left foot slightly forward, right foot braced aft
    hipPivot.position.set(side * stanceHalfX, 0.0, zStanceOffset);
    hipPivot.rotation.z = side * -0.045;
    pelvisGroup.add(hipPivot);

    // Articulated thigh (hip -> knee) and shin (knee -> ankle)
    const rThigh = 0.066 * lt;
    const rKnee = 0.047 * lt;
    const rCalf = 0.051 * lt;
    const rAnkle = 0.032 * lt;

    const thighGeo = createLoftedBodyPartGeometry([
      { y: -thighLen, rx: rKnee, rz: rKnee * 1.04, oz: -0.006 },
      { y: -thighLen * 0.45, rx: rThigh * 0.94, rz: rThigh * 1.02 },
      { y: 0.02, rx: rThigh, rz: rThigh * 1.06 },
    ]);
    const thighMesh = new THREE.Mesh(thighGeo, skinMat);
    thighMesh.castShadow = true;
    thighMesh.receiveShadow = true;
    hipPivot.add(thighMesh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0.0, -thighLen, 0.0);
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(
      new THREE.SphereGeometry(rKnee * 0.96, 8, 8),
      skinMat
    );
    kneePivot.add(kneeCap);

    const shinBottomY = -hipY + ankleY + thighLen; // negative offset below kneePivot
    const shinGeo = createLoftedBodyPartGeometry([
      { y: shinBottomY, rx: rAnkle, rz: rAnkle * 1.08 },
      { y: shinBottomY + shinLen * 0.56, rx: rCalf, rz: rCalf * 1.12, oz: 0.01 },
      { y: 0.0, rx: rKnee, rz: rKnee * 1.04, oz: -0.006 },
    ]);
    const shinMesh = new THREE.Mesh(shinGeo, skinMat);
    shinMesh.castShadow = true;
    shinMesh.receiveShadow = true;
    kneePivot.add(shinMesh);

    // Sculpted bare Polynesian foot planted on the deck / sand (-Z toes)
    const footGrp = new THREE.Group();
    footGrp.position.set(0.0, -hipY + 0.026 + thighLen, -0.038);
    footGrp.rotation.y = side * -0.08;
    const footMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.076 * lt, 0.044, 0.195 * lt),
      skinMat
    );
    footMesh.castShadow = true;
    footGrp.add(footMesh);
    const heel = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 * lt, 8, 8),
      skinMat
    );
    heel.position.set(0, -0.003, 0.072 * lt);
    footGrp.add(heel);
    kneePivot.add(footGrp);

    // Difficulty-specific leg tatau & ankle bindings
    if (spec.id === Difficulty.EASY && side === 1) {
      // Braided pandanus youth ankle cord
      const anklet = new THREE.Mesh(
        new THREE.TorusGeometry(rAnkle * 1.08, 0.008, 6, 14),
        pandanusMat
      );
      anklet.rotation.x = Math.PI * 0.5;
      anklet.position.y = shinBottomY + 0.035;
      kneePivot.add(anklet);
    } else if (spec.id === Difficulty.MEDIUM && side === -1) {
      // First initiation calf tatau bands on left leg
      addTatauBands(
        kneePivot,
        [
          { y: shinBottomY + shinLen * 0.48, r: rCalf * 1.05, h: 0.026 },
          { y: shinBottomY + shinLen * 0.62, r: rCalf * 1.04, h: 0.018 },
        ],
        tatauMat
      );
    } else if (spec.id === Difficulty.HARD || spec.id === Difficulty.MASTER_NAVIGATOR) {
      // Full seasoned navigator calf & lower-thigh tatau bands on both legs
      addTatauBands(
        hipPivot,
        [{ y: -thighLen * 0.72, r: rThigh * 0.92, h: 0.032 }],
        tatauMat
      );
      addTatauBands(
        kneePivot,
        [
          { y: shinBottomY + shinLen * 0.36, r: rCalf * 0.98, h: 0.026 },
          { y: shinBottomY + shinLen * 0.56, r: rCalf * 1.07, h: 0.034 },
          { y: shinBottomY + shinLen * 0.74, r: rKnee * 1.06, h: 0.022 },
        ],
        tatauMat
      );
      if (spec.id === Difficulty.MASTER_NAVIGATOR) {
        const sennitAnklet = new THREE.Mesh(
          new THREE.TorusGeometry(rAnkle * 1.12, 0.009, 6, 14),
          sennitMat
        );
        sennitAnklet.rotation.x = Math.PI * 0.5;
        sennitAnklet.position.y = shinBottomY + 0.032;
        kneePivot.add(sennitAnklet);
      }
    }

    legs[side < 0 ? 'left' : 'right'] = {
      hipPivot,
      kneePivot,
      footGrp,
      baseZ: zStanceOffset,
      side,
    };
  }

  // -------------------------------------------------------------------------
  // 2. Traditional Polynesian Waist Attire (Pareu / Lavalava / Ta'ovala)
  // -------------------------------------------------------------------------
  const skirtTopY = waistY - hipY + 0.015;
  if (spec.id === Difficulty.EASY) {
    const pareu = createPareuSkirtMesh({
      topRx: spec.waistWidthM * 0.55,
      topRz: spec.chestDepthM * 0.56,
      botRx: spec.hipWidthM * 0.76,
      botRz: spec.chestDepthM * 0.78,
      height: H * 0.255,
      baseRgb: [0.87, 0.76, 0.56],
      bandRgb: [0.55, 0.33, 0.18],
      trimRgb: [0.25, 0.15, 0.09],
      wovenCheck: true,
    });
    pareu.position.y = skirtTopY;
    pelvisGroup.add(pareu);
  } else if (spec.id === Difficulty.MEDIUM) {
    const pareu = createPareuSkirtMesh({
      topRx: spec.waistWidthM * 0.56,
      topRz: spec.chestDepthM * 0.56,
      botRx: spec.hipWidthM * 0.78,
      botRz: spec.chestDepthM * 0.8,
      height: H * 0.265,
      baseRgb: [0.71, 0.3, 0.17],
      bandRgb: [0.92, 0.85, 0.7],
      trimRgb: [0.16, 0.11, 0.09],
      wovenCheck: false,
    });
    pareu.position.y = skirtTopY;
    pelvisGroup.add(pareu);
  } else if (spec.id === Difficulty.HARD) {
    // Under-pareu in deep madder tapa + shorter finely woven ta'ovala pandanus overskirt
    const underPareu = createPareuSkirtMesh({
      topRx: spec.waistWidthM * 0.55,
      topRz: spec.chestDepthM * 0.55,
      botRx: spec.hipWidthM * 0.8,
      botRz: spec.chestDepthM * 0.82,
      height: H * 0.285,
      baseRgb: [0.58, 0.2, 0.14],
      bandRgb: [0.9, 0.82, 0.66],
      trimRgb: [0.15, 0.1, 0.08],
    });
    underPareu.position.y = skirtTopY;
    pelvisGroup.add(underPareu);

    const taovala = createPareuSkirtMesh({
      topRx: spec.waistWidthM * 0.59,
      topRz: spec.chestDepthM * 0.59,
      botRx: spec.hipWidthM * 0.76,
      botRz: spec.chestDepthM * 0.78,
      height: H * 0.185,
      baseRgb: [0.81, 0.65, 0.4],
      bandRgb: [0.36, 0.22, 0.12],
      trimRgb: [0.28, 0.16, 0.09],
      wovenCheck: true,
    });
    taovala.position.y = skirtTopY + 0.01;
    pelvisGroup.add(taovala);
  } else {
    // Master Navigator: Ceremonial crimson-mulberry tapa below knees + plaited elder's ta'ovala mat
    const masterPareu = createPareuSkirtMesh({
      topRx: spec.waistWidthM * 0.56,
      topRz: spec.chestDepthM * 0.56,
      botRx: spec.hipWidthM * 0.84,
      botRz: spec.chestDepthM * 0.85,
      height: H * 0.32,
      baseRgb: [0.46, 0.14, 0.12],
      bandRgb: [0.89, 0.8, 0.63],
      trimRgb: [0.16, 0.1, 0.08],
    });
    masterPareu.position.y = skirtTopY;
    pelvisGroup.add(masterPareu);

    const masterMatWrap = createPareuSkirtMesh({
      topRx: spec.waistWidthM * 0.6,
      topRz: spec.chestDepthM * 0.6,
      botRx: spec.hipWidthM * 0.79,
      botRz: spec.chestDepthM * 0.8,
      height: H * 0.205,
      baseRgb: [0.83, 0.69, 0.44],
      bandRgb: [0.58, 0.15, 0.12],
      trimRgb: [0.25, 0.15, 0.09],
      wovenCheck: true,
    });
    masterMatWrap.position.y = skirtTopY + 0.012;
    pelvisGroup.add(masterMatWrap);
  }

  // Braided sennit / plaited pandanus waist sash (tatua) + knotted side tassels
  const beltRadiusX = spec.waistWidthM * 0.58;
  const beltRadiusZ = spec.chestDepthM * 0.58;
  const beltGeo = new THREE.TorusGeometry(1.0, 0.055, 8, 28);
  beltGeo.rotateX(Math.PI * 0.5);
  const beltMesh = new THREE.Mesh(
    beltGeo,
    spec.id === Difficulty.MEDIUM ? pandanusMat : sennitMat
  );
  beltMesh.scale.set(beltRadiusX, 0.52, beltRadiusZ);
  beltMesh.position.y = skirtTopY - 0.005;
  pelvisGroup.add(beltMesh);

  for (const tOff of [-0.02, 0.022]) {
    const tassel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.016, H * 0.13, 6),
      sennitMat
    );
    tassel.position.set(-beltRadiusX * 0.96, skirtTopY - H * 0.068, tOff);
    tassel.rotation.z = 0.09;
    pelvisGroup.add(tassel);
  }

  // Apprentice woven pandanus star-shell pouch at left hip; Master Navigator carved ironwood whisk token
  if (spec.id === Difficulty.EASY) {
    const pouch = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 10, 10),
      pandanusMat
    );
    pouch.scale.set(0.75, 1.05, 0.95);
    pouch.position.set(-beltRadiusX * 1.05, skirtTopY - 0.045, 0.03);
    pelvisGroup.add(pouch);
  } else if (spec.id === Difficulty.MASTER_NAVIGATOR) {
    const tokenStaff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, 0.24, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b1f0e, roughness: 0.5 })
    );
    tokenStaff.position.set(-beltRadiusX * 1.04, skirtTopY - 0.075, 0.04);
    tokenStaff.rotation.z = 0.18;
    tokenStaff.rotation.x = 0.14;
    pelvisGroup.add(tokenStaff);
  }

  // -------------------------------------------------------------------------
  // 3. Sculpted Torso, Chest Ornaments, Shoulder Garments & Kahu Tapa Cloak
  // -------------------------------------------------------------------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0.0, waistY - hipY, 0.0);
  pelvisGroup.add(torsoGroup);

  const torsoH = neckBaseY - waistY;
  const torsoGeo = createLoftedBodyPartGeometry([
    { y: -0.02, rx: spec.waistWidthM * 0.5, rz: spec.chestDepthM * 0.48 },
    { y: torsoH * 0.34, rx: spec.chestWidthM * 0.47, rz: spec.chestDepthM * 0.5 },
    { y: torsoH * 0.72, rx: spec.chestWidthM * 0.52, rz: spec.chestDepthM * 0.52, oz: -0.005 },
    { y: torsoH * 0.92, rx: spec.shoulderWidthM * 0.45, rz: spec.chestDepthM * 0.44 },
    { y: torsoH * 1.03, rx: spec.headRadiusM * 0.52, rz: spec.headRadiusM * 0.52 },
  ]);
  const torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  // Neck cylinder
  const neckLen = headCenterY - neckBaseY;
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(
      spec.headRadiusM * 0.44,
      spec.headRadiusM * 0.5,
      neckLen + 0.04,
      12
    ),
    skinMat
  );
  neck.position.y = torsoH + neckLen * 0.42;
  torsoGroup.add(neck);

  // Difficulty-specific Upper-Body Polynesian Attire & Necklaces
  let cloakData = null;

  if (spec.id === Difficulty.EASY) {
    // Crossbody braided pandanus strap + cowrie-shell neck cord
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(torsoH * 0.56, 0.012, 6, 24),
      pandanusMat
    );
    strap.position.set(-0.02, torsoH * 0.45, 0.0);
    strap.rotation.y = Math.PI * 0.5;
    strap.rotation.x = 0.58;
    strap.scale.set(spec.chestDepthM * 2.15, 1.0, 0.85);
    torsoGroup.add(strap);

    const neckCord = new THREE.Mesh(
      new THREE.TorusGeometry(spec.headRadiusM * 0.74, 0.007, 6, 18),
      sennitMat
    );
    neckCord.rotation.x = Math.PI * 0.5 + 0.22;
    neckCord.position.set(0, torsoH * 0.9, -0.015);
    torsoGroup.add(neckCord);

    for (const cAng of [-0.35, 0.0, 0.35]) {
      const cowrie = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 8, 8),
        pearlShellMat
      );
      cowrie.scale.set(0.75, 1.2, 0.65);
      cowrie.position.set(
        Math.sin(cAng) * 0.055,
        torsoH * 0.85,
        -spec.chestDepthM * 0.46
      );
      torsoGroup.add(cowrie);
    }
  } else if (spec.id === Difficulty.MEDIUM) {
    // Diagonal barkcloth kihei / tiputa shoulder sash across left shoulder & chest/back
    const sashMat = new THREE.MeshStandardMaterial({
      color: 0xe4cda1,
      roughness: 0.84,
    });
    const sash = new THREE.Mesh(
      new THREE.TorusGeometry(torsoH * 0.58, 0.036, 8, 28),
      sashMat
    );
    sash.position.set(0.01, torsoH * 0.48, 0.0);
    sash.rotation.y = Math.PI * 0.5;
    sash.rotation.x = -0.62;
    sash.scale.set(spec.chestDepthM * 2.12, 1.02, 0.92);
    torsoGroup.add(sash);

    // Black-lip pearl-shell crescent pendant on chest
    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(spec.headRadiusM * 0.78, 0.007, 6, 18),
      sennitMat
    );
    cord.rotation.x = Math.PI * 0.5 + 0.24;
    cord.position.set(0, torsoH * 0.9, -0.014);
    torsoGroup.add(cord);

    const crescent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.01, 14),
      blackPearlMat
    );
    crescent.rotation.x = Math.PI * 0.5 - 0.12;
    crescent.position.set(0, torsoH * 0.76, -spec.chestDepthM * 0.52);
    torsoGroup.add(crescent);
  } else if (spec.id === Difficulty.HARD) {
    // Layered auti (ti-leaf) voyaging shoulder collar fanning around shoulders & upper back
    const leafGeo = new THREE.ConeGeometry(0.036, 0.17, 4);
    leafGeo.translate(0, -0.085, 0);
    leafGeo.scale(1.0, 1.0, 0.22);
    const leafCount = 18;
    for (let i = 0; i < leafCount; i += 1) {
      const ang = (i / leafCount) * Math.PI * 2.0;
      const leaf = new THREE.Mesh(leafGeo, tiLeafMat);
      const rx = spec.shoulderWidthM * 0.43;
      const rz = spec.chestDepthM * 0.48;
      leaf.position.set(
        Math.cos(ang) * rx,
        torsoH * 0.92,
        Math.sin(ang) * rz
      );
      leaf.rotation.y = -ang + Math.PI * 0.5;
      leaf.rotation.x = 0.48;
      torsoGroup.add(leaf);
    }

    // Carved whalebone & pearl-shell rei-miro chest gorget (-Z front)
    const gorget = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.018, 8, 16, Math.PI * 1.15),
      pearlShellMat
    );
    gorget.rotation.z = Math.PI * 0.92;
    gorget.rotation.x = -0.18;
    gorget.position.set(0, torsoH * 0.79, -spec.chestDepthM * 0.52);
    torsoGroup.add(gorget);
  } else {
    // Master Navigator: Sacred tiered pearl-shell & kura-trimmed taumi gorget + Kahu Tapa cloak!
    const taumi = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.024, 8, 18, Math.PI * 1.2),
      pearlShellMat
    );
    taumi.rotation.z = Math.PI * 0.9;
    taumi.rotation.x = -0.2;
    taumi.position.set(0, torsoH * 0.79, -spec.chestDepthM * 0.53);
    torsoGroup.add(taumi);

    const taumiTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.011, 6, 18, Math.PI * 1.15),
      kuraRedMat
    );
    taumiTrim.rotation.z = Math.PI * 0.92;
    taumiTrim.rotation.x = -0.2;
    taumiTrim.position.set(0, torsoH * 0.78, -spec.chestDepthM * 0.52);
    torsoGroup.add(taumiTrim);

    // Shoulder clasps & flowing ceremonial Kahu Tapa cloak down the back (+Z)
    for (const side of [-1, 1]) {
      const clasp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.012, 10),
        pearlShellMat
      );
      clasp.rotation.x = Math.PI * 0.4;
      clasp.position.set(
        side * spec.shoulderWidthM * 0.34,
        torsoH * 0.91,
        -spec.chestDepthM * 0.36
      );
      torsoGroup.add(clasp);
    }

    const cloakPivot = new THREE.Group();
    cloakPivot.position.set(0.0, torsoH * 0.93, 0.0);
    cloakData = createKahuTapaCloakMesh(spec.shoulderWidthM, H * 0.54);
    cloakPivot.add(cloakData.mesh);
    torsoGroup.add(cloakPivot);
    cloakData.pivot = cloakPivot;
  }

  // -------------------------------------------------------------------------
  // 4. Articulated Arms & Hands (Right Arm Tending Steering Sweep, Left Steady)
  // -------------------------------------------------------------------------
  const upperArmLen = H * 0.175;
  const forearmLen = H * 0.155;
  const rShoulder = 0.048 * lt;
  const rElbow = 0.036 * lt;
  const rWrist = 0.027 * lt;

  const arms = {};
  for (const side of [-1, 1]) {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(
      side * spec.shoulderWidthM * 0.48,
      torsoH * 0.88,
      0.0
    );
    torsoGroup.add(shoulderPivot);

    const deltoid = new THREE.Mesh(
      new THREE.SphereGeometry(rShoulder * 1.06, 10, 10),
      skinMat
    );
    shoulderPivot.add(deltoid);

    const upperArmGeo = createLoftedBodyPartGeometry([
      { y: -upperArmLen, rx: rElbow, rz: rElbow },
      { y: -upperArmLen * 0.48, rx: rShoulder * 0.9, rz: rShoulder * 0.94 },
      { y: 0.0, rx: rShoulder, rz: rShoulder },
    ]);
    const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    if (spec.id === Difficulty.HARD || spec.id === Difficulty.MASTER_NAVIGATOR) {
      // Bold Polynesian shoulder / bicep tatau sleeves
      addTatauBands(
        shoulderPivot,
        [
          { y: -upperArmLen * 0.24, r: rShoulder * 0.98, h: 0.034 },
          { y: -upperArmLen * 0.52, r: rShoulder * 0.91, h: 0.026 },
        ],
        tatauMat
      );
    }

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0.0, -upperArmLen, 0.0);
    shoulderPivot.add(elbowPivot);

    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(rElbow * 0.96, 8, 8),
      skinMat
    );
    elbowPivot.add(elbowJoint);

    const forearmGeo = createLoftedBodyPartGeometry([
      { y: -forearmLen, rx: rWrist, rz: rWrist * 1.08 },
      { y: -forearmLen * 0.42, rx: rElbow * 0.94, rz: rElbow * 0.98 },
      { y: 0.0, rx: rElbow, rz: rElbow },
    ]);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    if (
      (spec.id === Difficulty.MEDIUM && side === 1) ||
      spec.id === Difficulty.HARD ||
      spec.id === Difficulty.MASTER_NAVIGATOR
    ) {
      addTatauBands(
        elbowPivot,
        [
          { y: -forearmLen * 0.36, r: rElbow * 0.92, h: 0.024 },
          { y: -forearmLen * 0.68, r: rWrist * 1.12, h: 0.02 },
        ],
        tatauMat
      );
    }

    if (spec.id === Difficulty.MEDIUM || spec.id === Difficulty.MASTER_NAVIGATOR) {
      const wristlet = new THREE.Mesh(
        new THREE.TorusGeometry(rWrist * 1.15, 0.008, 6, 12),
        spec.id === Difficulty.MEDIUM ? pearlShellMat : sennitMat
      );
      wristlet.rotation.x = Math.PI * 0.5;
      wristlet.position.y = -forearmLen + 0.018;
      elbowPivot.add(wristlet);
    }

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(rWrist * 1.25, 8, 8),
      skinMat
    );
    hand.scale.set(0.85, 1.35, 1.05);
    hand.position.set(0.0, -forearmLen - 0.026 * lt, 0.0);
    elbowPivot.add(hand);

    arms[side < 0 ? 'left' : 'right'] = { shoulderPivot, elbowPivot };
  }

  // Default poised wayfinder arm pose:
  // Right arm (+X) reaches down-and-outboard to grip/tend the Hoe Uli steering sweep tiller;
  // Left arm (-X) rests poised slightly outboard & forward for sea balance.
  arms.right.shoulderPivot.rotation.set(-0.22, 0.0, 0.18);
  arms.right.elbowPivot.rotation.set(0.36, 0.0, -0.08);

  arms.left.shoulderPivot.rotation.set(0.16, 0.0, -0.16);
  arms.left.elbowPivot.rotation.set(0.34, 0.0, 0.06);

  // -------------------------------------------------------------------------
  // 5. Sculpted Head, Facial Features, Gray Beard & Traditional Headgear
  // -------------------------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0.0, headCenterY - waistY, 0.0);
  torsoGroup.add(headGroup);

  const R = spec.headRadiusM;
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 16), skinMat);
  cranium.scale.set(0.92, 1.08, 0.98);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Nose bridge (-Z forward face), ears, brow & dark eyes
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(R * 0.16, R * 0.38, 6),
    skinMat
  );
  nose.rotation.x = -Math.PI * 0.42;
  nose.position.set(0.0, -R * 0.04, -R * 0.96);
  headGroup.add(nose);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x160f0b,
    roughness: 0.3,
  });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 8, 8), eyeMat);
    eye.position.set(side * R * 0.32, R * 0.08, -R * 0.88);
    headGroup.add(eye);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(R * 0.26, R * 0.055, R * 0.08),
      spec.id === Difficulty.MASTER_NAVIGATOR ? silverBeardMat : hairMat
    );
    brow.position.set(side * R * 0.33, R * 0.22, -R * 0.88);
    brow.rotation.z = side * -0.08;
    headGroup.add(brow);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.19, 8, 8), skinMat);
    ear.scale.set(0.42, 0.95, 0.65);
    ear.position.set(side * R * 0.91, -R * 0.02, 0.02);
    headGroup.add(ear);
  }

  // Hairstyles, Headbands, Plumes & Master Navigator's Full Gray Beard
  if (spec.id === Difficulty.EASY) {
    // Youth wavy hair cap + nape curls + braided green ti-leaf headband + white tipanie blossoms
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.04, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairCap.scale.set(0.95, 1.06, 1.02);
    hairCap.rotation.x = -0.22;
    headGroup.add(hairCap);

    for (let i = -3; i <= 3; i += 1) {
      const lock = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.25, 8, 8),
        hairMat
      );
      lock.scale.set(0.85, 1.45, 0.85);
      const ang = i * 0.34;
      lock.position.set(
        Math.sin(ang) * R * 0.86,
        -R * 0.28,
        Math.cos(ang) * R * 0.88 + 0.015
      );
      headGroup.add(lock);
    }

    const tiBand = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.96, R * 0.11, 7, 22),
      tiLeafMat
    );
    tiBand.rotation.x = Math.PI * 0.5 - 0.12;
    tiBand.position.y = R * 0.3;
    headGroup.add(tiBand);

    // Trailing green ti-leaf ribbons at back of headband (+Z)
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.14, 0.006),
        tiLeafMat
      );
      tail.position.set(side * 0.022, R * 0.02, R * 1.03);
      tail.rotation.z = side * -0.18;
      tail.rotation.x = 0.22;
      headGroup.add(tail);
    }

    // Two white tipanie (frangipani) blossoms tucked over right temple
    for (let b = 0; b < 2; b += 1) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.16, 8, 8),
        pearlShellMat
      );
      flower.scale.set(1.0, 0.85, 0.55);
      flower.position.set(
        R * 0.95,
        R * (0.28 - b * 0.12),
        -R * 0.15 + b * 0.03
      );
      headGroup.add(flower);
    }
  } else if (spec.id === Difficulty.MEDIUM) {
    // Young Adult Wayfinder: High topknot (puahi) + plaited cowrie headband + frigatebird feather
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.04, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.64),
      hairMat
    );
    hairCap.scale.set(0.95, 1.07, 1.02);
    hairCap.rotation.x = -0.25;
    headGroup.add(hairCap);

    const topknot = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.44, 12, 10),
      hairMat
    );
    topknot.scale.set(0.9, 1.18, 0.95);
    topknot.position.set(0.0, R * 1.14, R * 0.22);
    headGroup.add(topknot);

    const knotWrap = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.28, 0.009, 6, 14),
      sennitMat
    );
    knotWrap.rotation.x = Math.PI * 0.5 - 0.2;
    knotWrap.position.set(0.0, R * 0.92, R * 0.18);
    headGroup.add(knotWrap);

    const browBand = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.97, R * 0.1, 7, 22),
      pandanusMat
    );
    browBand.rotation.x = Math.PI * 0.5 - 0.1;
    browBand.position.y = R * 0.28;
    headGroup.add(browBand);

    // Sleek dark frigatebird ('iwa) tail feather rising from right side of headband
    const plume = createFeatherPlume(0.24, 0.028, 0x1b2229, 0x3b4d5e);
    plume.position.set(R * 0.88, R * 0.32, R * 0.2);
    plume.rotation.x = -0.35;
    plume.rotation.z = -0.18;
    headGroup.add(plume);
  } else if (spec.id === Difficulty.HARD) {
    // Seasoned 30yo Navigator: Long cascading black hair + crimson kura circlet & twin tropicbird plumes
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.05, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.66),
      hairMat
    );
    hairCap.scale.set(0.96, 1.08, 1.04);
    hairCap.rotation.x = -0.28;
    headGroup.add(hairCap);

    // Flowing hair mane cascading down back (+Z) between shoulder blades
    const maneGeo = createLoftedBodyPartGeometry([
      { y: -R * 2.55, rx: R * 0.72, rz: R * 0.22, oz: R * 0.92 },
      { y: -R * 1.45, rx: R * 0.88, rz: R * 0.34, oz: R * 0.86 },
      { y: -R * 0.35, rx: R * 0.94, rz: R * 0.42, oz: R * 0.68 },
      { y: R * 0.35, rx: R * 0.82, rz: R * 0.38, oz: R * 0.52 },
    ]);
    const mane = new THREE.Mesh(maneGeo, hairMat);
    mane.castShadow = true;
    headGroup.add(mane);

    const kuraCirclet = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.99, R * 0.125, 8, 24),
      kuraRedMat
    );
    kuraCirclet.rotation.x = Math.PI * 0.5 - 0.1;
    kuraCirclet.position.y = R * 0.32;
    headGroup.add(kuraCirclet);

    for (const side of [-1, 1]) {
      const plume = createFeatherPlume(0.28, 0.03, 0xf2ece0, 0xc82d22);
      plume.position.set(side * R * 0.42, R * 0.38, R * 0.88);
      plume.rotation.x = -0.48;
      plume.rotation.z = side * -0.14;
      headGroup.add(plume);
    }
  } else {
    // Master Navigator (50yo): Streaked charcoal-silver crown hair, FULL SILVER-GRAY BEARD,
    // and sacred golden-crimson kura feather & pearl-shell headdress!
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.05, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.68),
      hairMat
    );
    hairCap.scale.set(0.96, 1.08, 1.04);
    hairCap.rotation.x = -0.3;
    headGroup.add(hairCap);

    // Silver-streaked temple & nape locks visible from rear, side & front
    for (const side of [-1, 1]) {
      const silverTemple = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.32, 10, 8),
        silverBeardMat
      );
      silverTemple.scale.set(0.55, 1.45, 0.92);
      silverTemple.position.set(side * R * 0.86, -R * 0.16, R * 0.12);
      headGroup.add(silverTemple);
    }

    const napeSilver = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.56, 12, 10),
      darkHairStreakMat
    );
    napeSilver.scale.set(1.15, 0.95, 0.65);
    napeSilver.position.set(0.0, -R * 0.38, R * 0.84);
    headGroup.add(napeSilver);

    const elderKnot = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.46, 12, 10),
      silverBeardMat
    );
    elderKnot.scale.set(0.95, 1.12, 0.95);
    elderKnot.position.set(0.0, R * 1.12, R * 0.24);
    headGroup.add(elderKnot);

    // Full Sculpted Silver-Gray Polynesian Beard & Mustache (-Z face & jawline)
    const beardGeo = createLoftedBodyPartGeometry([
      { y: -R * 1.68, rx: R * 0.38, rz: R * 0.28, oz: -R * 0.68 },
      { y: -R * 1.18, rx: R * 0.62, rz: R * 0.44, oz: -R * 0.62 },
      { y: -R * 0.65, rx: R * 0.78, rz: R * 0.56, oz: -R * 0.46 },
      { y: -R * 0.22, rx: R * 0.82, rz: R * 0.52, oz: -R * 0.34 },
    ]);
    const beardMesh = new THREE.Mesh(beardGeo, silverBeardMat);
    beardMesh.castShadow = true;
    headGroup.add(beardMesh);

    // Mustache sweeping from beneath nose into full gray beard
    for (const side of [-1, 1]) {
      const stache = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.24, 8, 8),
        silverBeardMat
      );
      stache.scale.set(1.25, 0.48, 0.62);
      stache.position.set(side * R * 0.22, -R * 0.28, -R * 0.88);
      stache.rotation.z = side * -0.28;
      headGroup.add(stache);
    }

    // Sacred Master's Headdress: braided sennit + pearl discs + fan of golden & crimson kura feathers
    const crownBand = new THREE.Mesh(
      new THREE.TorusGeometry(R * 1.0, R * 0.13, 8, 24),
      sennitMat
    );
    crownBand.rotation.x = Math.PI * 0.5 - 0.1;
    crownBand.position.y = R * 0.34;
    headGroup.add(crownBand);

    for (let d = 0; d < 8; d += 1) {
      const ang = (d / 8) * Math.PI * 2.0;
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.006, 8),
        pearlShellMat
      );
      disc.position.set(
        Math.cos(ang) * R * 1.11,
        R * 0.34 - Math.sin(ang) * R * 0.1,
        Math.sin(ang) * R * 1.11
      );
      disc.rotation.z = Math.PI * 0.5;
      disc.rotation.y = -ang;
      headGroup.add(disc);
    }

    // Upright golden-amber & crimson kura feather fan
    const fanCount = 7;
    for (let f = 0; f < fanCount; f += 1) {
      const norm = (f / (fanCount - 1)) * 2.0 - 1.0; // -1 .. +1
      const isCenter = Math.abs(norm) < 0.35;
      const fLen = (isCenter ? 0.22 : 0.17) - Math.abs(norm) * 0.03;
      const feather = createFeatherPlume(
        fLen,
        0.026,
        f % 2 === 0 ? 0xe9a934 : 0xc82d22,
        isCenter ? 0xfff3d1 : null
      );
      const ang = -Math.PI * 0.5 + norm * 0.85;
      feather.position.set(
        Math.cos(ang) * R * 0.96,
        R * 0.42,
        Math.sin(ang) * R * 0.96
      );
      feather.rotation.z = -norm * 0.32;
      feather.rotation.x = -0.18;
      headGroup.add(feather);
    }

    // Golden kura ring binding the elder's silver-streaked crown knot
    const knotGoldRing = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.3, 0.011, 6, 14),
      kuraGoldMat
    );
    knotGoldRing.rotation.set(Math.PI * 0.42, 0, 0);
    elderKnot.add(knotGoldRing);
  }

  return {
    root,
    difficulty: spec.id,
    spec,
    pelvisGroup,
    torsoGroup,
    headGroup,
    arms,
    legs,
    cloakData,
    cloakMesh: cloakData?.mesh || null,
  };
}

/**
 * Animates the standing player character on the canoe deck in response to swell motion,
 * steering sweep input (`steerNorm` in [-1..1]), wind speed, and camera yaw.
 */
export function animatePlayerCharacterRig(
  rig,
  elapsedSec,
  {
    steerNorm = 0.0,
    hullState = null,
    fastForward = false,
    windStrength = null,
    lookYawDeg = 0.0,
  } = {}
) {
  if (!rig) return;

  const breath = Math.sin(elapsedSec * 2.1);
  const roll = hullState ? hullState.rollRad : 0.0;
  const pitch = hullState ? hullState.pitchRad : 0.0;

  // Natural sea-legs counter-balance against ocean roll + subtle breathing poise
  rig.pelvisGroup.rotation.z = roll * 0.28;
  rig.pelvisGroup.position.y =
    rig.spec.totalHeightM * 0.525 + breath * 0.004;

  // Torso turns subtly as navigator leans on the Hoe Uli steering sweep
  rig.torsoGroup.rotation.y = -0.14 - steerNorm * 0.18;
  rig.torsoGroup.rotation.x = 0.03 - pitch * 0.22 + breath * 0.012;
  rig.torsoGroup.rotation.z = -roll * 0.16 + steerNorm * 0.05;

  // Head gazes dead ahead toward the star horizon (turning subtly with steering / look orbit)
  const clampedLook = Math.max(-0.55, Math.min(0.55, (lookYawDeg * Math.PI) / 180.0 * 0.3));
  rig.headGroup.rotation.y = 0.14 + steerNorm * 0.12 + clampedLook;
  rig.headGroup.rotation.x = -0.06 + Math.sin(elapsedSec * 1.35) * 0.02;

  // Right arm (+X) tracks the Hoe Uli steering sweep tiller as steerNorm shifts [-1..+1]
  rig.arms.right.shoulderPivot.rotation.set(
    -0.22 - Math.abs(steerNorm) * 0.06,
    -steerNorm * 0.12,
    0.18 + steerNorm * 0.24
  );
  rig.arms.right.elbowPivot.rotation.set(
    0.36 + steerNorm * 0.06,
    0.0,
    -0.08 + steerNorm * 0.08
  );

  // Left arm (-X) balances naturally outboard with the ocean swell
  rig.arms.left.shoulderPivot.rotation.set(
    0.16 + Math.sin(elapsedSec * 1.7) * 0.035,
    0.0,
    -0.16 - Math.abs(roll) * 0.25
  );

  // Master Navigator's ceremonial Kahu Tapa cloak ripples gently in the trade wind
  if (rig.cloakData?.pivot) {
    const breeze =
      windStrength !== null ? windStrength : fastForward ? 1.25 : 0.65;
    const windFreq = 2.2 + breeze * 3.1;
    const windAmp = 0.012 + breeze * 0.042;
    rig.cloakData.pivot.rotation.x =
      0.045 + Math.sin(elapsedSec * windFreq) * windAmp;
    rig.cloakData.pivot.rotation.z =
      Math.cos(elapsedSec * (windFreq * 0.73)) * (windAmp * 0.45);
  }
}

/**
 * Animates the character on solid island ground (smoothly blending between an ashore
 * idle stance and a barefoot walking stride with bent knees & counter-swinging arms).
 */
export function animatePlayerCharacterAshore(
  rig,
  elapsedSec,
  {
    walkAmount = 0.0, // [0..1] blend between idle and brisk walk
    stridePhase = 0.0, // continuous radians driven by distance walked
    windStrength = 0.5,
    gestureWave = 0.0, // [0..1] optional welcoming hand gesture for ashore elders/artisans
    holdsStaffRight = false,
  } = {}
) {
  if (!rig) return;

  const w = Math.max(0.0, Math.min(1.0, walkAmount));
  const breath = Math.sin(elapsedSec * 2.0);

  // Double-frequency vertical stride bounce while walking + gentle breathing when idle
  const strideBounce = Math.abs(Math.sin(stridePhase)) * 0.036 * w;
  const hipSwayZ = Math.sin(stridePhase) * 0.035 * w;

  rig.pelvisGroup.position.y =
    rig.spec.totalHeightM * 0.525 + breath * 0.004 * (1.0 - 0.5 * w) + strideBounce;
  rig.pelvisGroup.rotation.z = hipSwayZ;
  rig.pelvisGroup.rotation.y = Math.sin(stridePhase) * 0.06 * w;

  // Natural leg stride: +rotation.x swings thigh forward (-Z); -rotation.x bends knee backward (+Z)
  const leftSwing = Math.sin(stridePhase);
  const rightSwing = -leftSwing;
  const leftLift = Math.max(0.0, Math.cos(stridePhase));
  const rightLift = Math.max(0.0, -Math.cos(stridePhase));

  if (rig.legs?.left && rig.legs?.right) {
    rig.legs.left.hipPivot.position.z = rig.legs.left.baseZ * (1.0 - w);
    rig.legs.right.hipPivot.position.z = rig.legs.right.baseZ * (1.0 - w);

    rig.legs.left.hipPivot.rotation.x = leftSwing * 0.52 * w;
    rig.legs.right.hipPivot.rotation.x = rightSwing * 0.52 * w;

    rig.legs.left.kneePivot.rotation.x = -(0.08 + leftLift * 0.62) * w;
    rig.legs.right.kneePivot.rotation.x = -(0.08 + rightLift * 0.62) * w;

    rig.legs.left.footGrp.rotation.x = leftSwing * 0.16 * w;
    rig.legs.right.footGrp.rotation.x = rightSwing * 0.16 * w;
  }

  // Torso leans slightly forward into the walk and counter-rotates against hips
  rig.torsoGroup.rotation.x = 0.02 + 0.065 * w + breath * 0.01;
  rig.torsoGroup.rotation.y = -Math.sin(stridePhase) * 0.095 * w;
  rig.torsoGroup.rotation.z = -hipSwayZ * 0.65;

  // Head stays level, scanning gently when idle
  rig.headGroup.rotation.y =
    Math.sin(elapsedSec * 0.65) * 0.09 * (1.0 - w) +
    Math.sin(stridePhase) * 0.03 * w;
  rig.headGroup.rotation.x = -0.03 + Math.sin(elapsedSec * 1.25) * 0.018;

  // Counter-swinging arms (left arm swings forward with right leg; right arm with left leg)
  const leftArmSwing = rightSwing * 0.44 * w;
  const rightArmSwing = leftSwing * 0.44 * w;

  rig.arms.left.shoulderPivot.rotation.set(
    0.04 * (1.0 - w) + leftArmSwing + gestureWave * (0.55 + Math.sin(elapsedSec * 3.4) * 0.14),
    0.0,
    -0.11 - 0.03 * w - gestureWave * 0.22
  );
  rig.arms.left.elbowPivot.rotation.set(
    0.14 + Math.max(0.0, leftArmSwing) * 0.48 + gestureWave * 0.52,
    0.0,
    0.04
  );

  if (holdsStaffRight) {
    rig.arms.right.shoulderPivot.rotation.set(
      0.42 + breath * 0.015,
      -0.08,
      0.16
    );
    rig.arms.right.elbowPivot.rotation.set(0.62, 0.0, -0.1);
  } else {
    rig.arms.right.shoulderPivot.rotation.set(
      0.04 * (1.0 - w) + rightArmSwing,
      0.0,
      0.11 + 0.03 * w
    );
    rig.arms.right.elbowPivot.rotation.set(
      0.14 + Math.max(0.0, rightArmSwing) * 0.48,
      0.0,
      -0.04
    );
  }

  // Ceremonial Kahu Tapa cloak flows behind when striding and ripples in the coastal breeze
  if (rig.cloakData?.pivot) {
    const breeze = windStrength + w * 0.55;
    const windFreq = 2.2 + breeze * 3.0;
    const windAmp = 0.014 + breeze * 0.038;
    rig.cloakData.pivot.rotation.x =
      0.05 + 0.16 * w + Math.sin(elapsedSec * windFreq) * windAmp;
    rig.cloakData.pivot.rotation.z =
      Math.cos(elapsedSec * (windFreq * 0.73)) * (windAmp * 0.45);
  }
}
