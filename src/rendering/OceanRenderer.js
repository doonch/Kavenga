/**
 * Translucent Polynesian swell ocean shader, Ring 3 island wave interference
 * (Diamond Refraction Lattice, Cliff Pyramid Reflection, Calm Wave Shadow),
 * and Foamy Astern Leeway Wake.
 */

import * as THREE from 'three';
import { degToRad, wrapDeg180 } from '../core/gameConstants.js';
import { altAzToDirectionVec3 } from '../simulation/celestialSim.js';
import { IslandWaveZone } from '../simulation/hullPhysics.js';

const OCEAN_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOmegaT;
  uniform vec2 uSwellProp;
  uniform float uSwellAmp;
  uniform float uHasChop;
  uniform vec2 uChopProp;
  uniform int uWaveZone;
  uniform vec2 uIslandProp;

  varying vec3 vWorldPos;
  varying float vWaveCrest;
  varying float vPyramidTip;
  varying float vDiamondPattern;

  void main() {
    vec3 pos = position;
    // Distance falloff keeps far horizon seam clean against sky dome
    float radialDist = length(pos.xz);
    float distAtten = 1.0 - smoothstep(180.0, 760.0, radialDist);

    float kPrimary = 6.2831853 / 42.0;
    float proj = dot(pos.xz, uSwellProp);
    float h = uSwellAmp * cos(uOmegaT - kPrimary * proj);
    float crest = max(0.0, cos(uOmegaT - kPrimary * proj));

    // Secondary surface chop (e.g., Song 16)
    if (uHasChop > 0.5) {
      float cProj = dot(pos.xz, uChopProp);
      h += 0.17 * cos(uTime * 2.65 - 0.35 * cProj);
    }

    float diamond = 0.0;
    float pyramid = 0.0;

    // Ring 3 Island Swell Interference Signatures
    if (uWaveZone == 1) {
      // Diamond Refraction Lattice: two refracted swell trains crossing at +/-28 deg
      vec2 perp = vec2(-uIslandProp.y, uIslandProp.x);
      vec2 dirA = normalize(uIslandProp * 0.88 + perp * 0.47);
      vec2 dirB = normalize(uIslandProp * 0.88 - perp * 0.47);
      float wA = cos(uOmegaT * 1.15 - 0.22 * dot(pos.xz, dirA));
      float wB = cos(uOmegaT * 1.15 - 0.22 * dot(pos.xz, dirB));
      h += 0.22 * (wA + wB);
      diamond = max(0.0, wA * wB);
    } else if (uWaveZone == 2) {
      // Windward Cliff Reflection: steep pyramidal standing-wave bounce with white tips
      float bProj = dot(pos.xz, uIslandProp);
      float bounce = cos(uOmegaT * 1.35 - 0.28 * bProj);
      h += 0.36 * bounce;
      pyramid = smoothstep(0.45, 0.95, crest * max(0.0, bounce));
    }

    // Fine wind ripples
    h += 0.04 * sin(pos.x * 0.85 + uTime * 1.9) * cos(pos.z * 0.85 - uTime * 1.4);

    pos.y += h * distAtten;
    vWorldPos = pos;
    vWaveCrest = crest * distAtten;
    vPyramidTip = pyramid * distAtten;
    vDiamondPattern = diamond * distAtten;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const OCEAN_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uDaylight;
  uniform float uTwilight;
  uniform float uSeaFog;
  uniform float uTime;
  uniform float uLeewaySin;
  uniform float uShowWake;
  uniform vec2 uScrollOffset;
  uniform int uWaveZone;

  varying vec3 vWorldPos;
  varying float vWaveCrest;
  varying float vPyramidTip;
  varying float vDiamondPattern;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 567.21));
    p += dot(p, p + 34.12);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 viewVec = normalize(cameraPosition - vWorldPos);
    float dist = length(vWorldPos.xz);

    // Estimate perturbed surface normal from scrolled ripple field
    vec2 uvScroll = vWorldPos.xz * 0.16 + uScrollOffset;
    float nx = noise2(uvScroll + vec2(uTime * 0.35, 0.0)) - 0.5;
    float nz = noise2(uvScroll * 1.3 - vec2(0.0, uTime * 0.32)) - 0.5;
    vec3 nrm = normalize(vec3(nx * 0.26, 1.0, nz * 0.26));

    float fresnel = pow(1.0 - clamp(dot(nrm, viewVec), 0.0, 1.0), 3.6);

    // Deep cobalt-teal Polynesian ocean palette
    vec3 nightDeep = vec3(0.012, 0.036, 0.078);
    vec3 nightCrest = vec3(0.032, 0.095, 0.155);
    vec3 dayDeep = vec3(0.015, 0.20, 0.38);
    vec3 daySubsurface = vec3(0.04, 0.52, 0.58);

    vec3 baseWater = mix(nightDeep, dayDeep, uDaylight);
    vec3 crestWater = mix(nightCrest, daySubsurface, uDaylight);
    vec3 col = mix(baseWater, crestWater, clamp(vWaveCrest * 0.55 + fresnel * 0.45, 0.0, 1.0));

    // Calm Wave Shadow subtly darkens into glassy lagoon stillness
    if (uWaveZone == 3) {
      col = mix(col, mix(vec3(0.018, 0.06, 0.10), vec3(0.05, 0.38, 0.46), uDaylight), 0.35);
    }

    // Diamond Refraction Lattice highlights cross-hatched turquoise wavelets
    if (vDiamondPattern > 0.02) {
      vec3 latticeGlow = mix(vec3(0.18, 0.38, 0.52), vec3(0.62, 0.92, 0.96), uDaylight);
      col = mix(col, latticeGlow, clamp(vDiamondPattern * 0.55, 0.0, 0.48));
    }

    // Windward Cliff Reflection white-tipped pyramid foam
    if (vPyramidTip > 0.02) {
      col = mix(col, vec3(0.92, 0.96, 0.99), clamp(vPyramidTip * 0.85, 0.0, 0.85));
    }

    // Solar / Lunar glint track across swells
    vec3 lightDir = normalize(vec3(uSunDir.x, max(0.06, abs(uSunDir.y)), uSunDir.z));
    vec3 halfVec = normalize(lightDir + viewVec);
    float spec = pow(max(0.0, dot(nrm, halfVec)), 72.0);
    vec3 glintTint = mix(vec3(0.38, 0.52, 0.78), vec3(1.0, 0.82, 0.52), clamp(uDaylight + uTwilight * 0.7, 0.0, 1.0));
    col += glintTint * spec * (0.28 + 0.72 * max(uDaylight, uTwilight));

    // Foamy Astern Twin-Hull Wake (+Z astern; angles sideways by leeway when crosswind pushes canoe!)
    if (uShowWake > 0.5 && vWorldPos.z > 4.2 && vWorldPos.z < 115.0) {
      float zAft = vWorldPos.z - 4.2;
      // Wake trails opposite Course Over Ground: if leeway > 0 (drifting starboard +X), wake trails port (-X)
      float wakeCenterX = -uLeewaySin * zAft * 2.4;
      float portWakeDist = abs(vWorldPos.x - (wakeCenterX - 2.35));
      float stbdWakeDist = abs(vWorldPos.x - (wakeCenterX + 2.35));
      float spread = 0.55 + zAft * 0.032;
      float foamN = noise2(vec2(vWorldPos.x * 1.4, vWorldPos.z * 0.65 - uTime * 3.8));
      float wakeMask =
        (smoothstep(spread, 0.08, portWakeDist) + smoothstep(spread, 0.08, stbdWakeDist)) *
        (1.0 - smoothstep(12.0, 110.0, zAft)) *
        (0.55 + 0.45 * foamN);
      vec3 foamCol = mix(vec3(0.32, 0.44, 0.58), vec3(0.92, 0.97, 1.0), 0.25 + 0.75 * uDaylight);
      col = mix(col, foamCol, clamp(wakeMask * 0.78, 0.0, 0.82));
    }

    // Horizon mist & Act III sea-fog blend
    vec3 horizonHaze = mix(vec3(0.045, 0.078, 0.145), vec3(0.54, 0.78, 0.90), uDaylight);
    horizonHaze = mix(horizonHaze, vec3(0.92, 0.52, 0.30), uTwilight * 0.55);
    float farBlend = smoothstep(190.0, 820.0, dist);
    col = mix(col, horizonHaze, farBlend);

    if (uSeaFog > 0.01) {
      vec3 fogCol = mix(vec3(0.13, 0.16, 0.21), vec3(0.76, 0.81, 0.85), 0.22 + 0.78 * uDaylight);
      float fogDistMask = smoothstep(14.0, 135.0, dist);
      col = mix(col, fogCol, clamp(uSeaFog * (0.20 + 0.78 * fogDistMask), 0.0, 0.96));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class OceanRenderer {
  constructor(scene) {
    this.scene = scene;
    this.scrollOffset = new THREE.Vector2(0, 0);
    this.curSeaFog = 0.0;

    this.uniforms = {
      uTime: { value: 0.0 },
      uOmegaT: { value: 0.0 },
      uSwellProp: { value: new THREE.Vector2(0, 1) },
      uSwellAmp: { value: 0.62 },
      uHasChop: { value: 0.0 },
      uChopProp: { value: new THREE.Vector2(1, 0) },
      uWaveZone: { value: 0 },
      uIslandProp: { value: new THREE.Vector2(0, 1) },
      uSunDir: { value: new THREE.Vector3(0, 0.3, -1) },
      uDaylight: { value: 0.5 },
      uTwilight: { value: 0.3 },
      uSeaFog: { value: 0.0 },
      uLeewaySin: { value: 0.0 },
      uShowWake: { value: 1.0 },
      uScrollOffset: { value: this.scrollOffset },
    };

    const geo = new THREE.PlaneGeometry(1700, 1700, 150, 150);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERTEX_SHADER,
      fragmentShader: OCEAN_FRAGMENT_SHADER,
      uniforms: this.uniforms,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.0;
    this.mesh.renderOrder = -2;
    this.scene.add(this.mesh);
  }

  update(dtSec, elapsedSec, oceanSim, calmShoreMode = false, landfallProgress01 = 0.0) {
    if (!oceanSim) return;

    const landfallT = Math.max(0.0, Math.min(1.0, landfallProgress01));
    const decel = Math.pow(1.0 - landfallT, 2.0);
    const mult = oceanSim.fastForward ? 2.75 : 1.0;
    const speed = calmShoreMode ? 0.35 : 5.4 * mult * decel;
    const leewayRad = degToRad(
      calmShoreMode ? 0.0 : (oceanSim.leewayDeg || 0.0) * (1.0 - landfallT)
    );

    // Scroll water texture astern (+Z) & sideways by leeway (decelerates to 0 on landfall stop)
    this.scrollOffset.x += Math.sin(leewayRad) * speed * dtSec * 0.14;
    this.scrollOffset.y -= Math.cos(leewayRad) * speed * dtSec * 0.14;

    const headingDeg = oceanSim.headingDeg;
    const swellFrom = oceanSim.getPrimarySwellFromAz();
    const relFromRad = degToRad(wrapDeg180(swellFrom - headingDeg));
    this.uniforms.uSwellProp.value.set(-Math.sin(relFromRad), Math.cos(relFromRad));

    const chopAz = calmShoreMode ? null : oceanSim.song?.secondaryChopFromAz;
    if (chopAz !== null && chopAz !== undefined) {
      const chopRel = degToRad(wrapDeg180(chopAz - headingDeg));
      this.uniforms.uHasChop.value = 1.0 - landfallT;
      this.uniforms.uChopProp.value.set(-Math.sin(chopRel), Math.cos(chopRel));
    } else {
      this.uniforms.uHasChop.value = 0.0;
    }

    const nearestRing3 = calmShoreMode ? null : oceanSim.detections.find((d) => d.ring >= 3);
    const waveZone = calmShoreMode
      ? IslandWaveZone.CALM_WAVE_SHADOW
      : nearestRing3
        ? nearestRing3.waveZone
        : IslandWaveZone.OPEN_SEA;
    this.uniforms.uWaveZone.value = waveZone;
    const baseSwellAmp = calmShoreMode
      ? 0.05
      : waveZone === IslandWaveZone.CALM_WAVE_SHADOW
        ? 0.09
        : 0.62;
    this.uniforms.uSwellAmp.value = baseSwellAmp + (0.055 - baseSwellAmp) * landfallT;
    this.uniforms.uShowWake.value = calmShoreMode ? 0.0 : decel;

    if (nearestRing3) {
      const islRel = degToRad(wrapDeg180(nearestRing3.bearingDeg - headingDeg));
      this.uniforms.uIslandProp.value.set(-Math.sin(islRel), Math.cos(islRel));
    }

    const hull = oceanSim.hullState;
    this.uniforms.uOmegaT.value =
      !calmShoreMode && hull && landfallT < 0.999
        ? hull.wavePhase01 * Math.PI * 2.0
        : elapsedSec * 0.65;
    this.uniforms.uTime.value = elapsedSec;
    this.uniforms.uLeewaySin.value = Math.sin(leewayRad);

    const sun = oceanSim.sunState;
    const sunVec = altAzToDirectionVec3(sun.altDeg, sun.azDeg, headingDeg);
    this.uniforms.uSunDir.value.set(sunVec.x, sunVec.y, sunVec.z).normalize();
    this.uniforms.uDaylight.value = sun.daylightFactor;
    this.uniforms.uTwilight.value = sun.twilightFactor;

    const targetFog =
      !calmShoreMode &&
      landfallT <= 0.0 &&
      oceanSim.getCurrentVerse()?.weather === 'sea_fog'
        ? 1.0
        : 0.0;
    const fogRate = landfallT > 0.0 ? 3.5 : 1.4;
    this.curSeaFog += (targetFog - this.curSeaFog) * Math.min(1.0, dtSec * fogRate);
    this.uniforms.uSeaFog.value = calmShoreMode
      ? 0.0
      : this.curSeaFog * (1.0 - landfallT);
  }
}
