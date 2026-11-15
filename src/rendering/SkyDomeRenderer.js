/**
 * 3D Celestial Sphere, Twilight Scattering Dome, Te Mangoroa (Milky Way),
 * 31 Tinted Navigation Stars + 480 Ambient Stars, Weather Curtains/Fog,
 * and Mode-Gated Chalky Constellation Outlines + Projected Sky Labels.
 */

import * as THREE from 'three';
import {
  GameConstants,
  showsActiveStarShimmer,
  showsSkyAnnotations,
} from '../core/gameConstants.js';
import {
  CONSTELLATIONS,
  NAVIGATION_STARS,
} from '../data/constellationsData.js';
import {
  altAzToDirectionVec3,
  computeStarAltAz,
} from '../simulation/celestialSim.js';

const SKY_RADIUS = 920.0;
const STAR_RADIUS = 880.0;

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uDaylight;
  uniform float uTwilight;
  uniform float uStarVis;
  uniform vec3 uGalacticNormal;
  uniform float uForwardCurtain;
  uniform float uOvercast;
  uniform float uSeaFog;
  uniform float uTime;

  varying vec3 vWorldDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
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
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, -0.15, 1.0);
    float horizonBand = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 4.0);

    // Night palette (deep Polynesian indigo-velvet)
    vec3 nightZenith = vec3(0.015, 0.028, 0.075);
    vec3 nightHorizon = vec3(0.045, 0.078, 0.145);
    vec3 nightCol = mix(nightHorizon, nightZenith, smoothstep(0.0, 0.65, max(0.0, h)));

    // Te Mangoroa (The Long Shark / Milky Way luminous dust band + dark rift)
    float galLat = abs(dot(dir, normalize(uGalacticNormal)));
    float mwBand = exp(-galLat * galLat * 22.0);
    float mwPatch = noise2(dir.xz * 6.5 + vec2(dir.y * 4.0, 1.7));
    float darkRift = smoothstep(0.35, 0.72, noise2(dir.xy * 11.0));
    vec3 mwColor = vec3(0.11, 0.14, 0.23) * mwBand * (0.55 + 0.65 * mwPatch) * (1.0 - 0.45 * darkRift);
    nightCol += mwColor * uStarVis * smoothstep(-0.02, 0.14, dir.y);

    // Day palette (clear tropical cobalt to turquoise horizon haze)
    vec3 dayZenith = vec3(0.09, 0.34, 0.72);
    vec3 dayHorizon = vec3(0.54, 0.78, 0.90);
    vec3 dayCol = mix(dayHorizon, dayZenith, pow(clamp(h, 0.0, 1.0), 0.58));

    vec3 col = mix(nightCol, dayCol, uDaylight);

    // Dawn / Dusk warm golden-coral scattering toward solar azimuth
    float sunCos = dot(dir, normalize(uSunDir));
    float sunAzGlow = pow(clamp(sunCos * 0.5 + 0.5, 0.0, 1.0), 3.2);
    vec3 twilightGlow = mix(vec3(0.88, 0.34, 0.22), vec3(1.0, 0.74, 0.34), sunAzGlow);
    col = mix(col, twilightGlow, uTwilight * horizonBand * (0.35 + 0.65 * sunAzGlow));

    // Crisp solar disc & warm atmospheric halo
    float sunHalo = pow(clamp(sunCos, 0.0, 1.0), 48.0) * 0.45;
    float sunDisc = smoothstep(0.9991, 0.99965, sunCos);
    vec3 sunTint = mix(vec3(1.0, 0.58, 0.24), vec3(1.0, 0.97, 0.88), clamp(uSunDir.y * 2.2, 0.0, 1.0));
    if (dir.y > -0.02) {
      col += sunTint * (sunHalo + sunDisc * 1.6) * smoothstep(-0.06, 0.03, uSunDir.y);
    }

    // Song 10 Forward Rain-Cloud Curtain (veils forward -Z bow sector, leaving +Z stern clear!)
    if (uForwardCurtain > 0.01) {
      float bowAlign = clamp(-dir.z, 0.0, 1.0);
      float n1 = noise2(vec2(dir.x * 4.6 + uTime * 0.022, dir.y * 6.2));
      float n2 = noise2(vec2(dir.x * 10.5 - uTime * 0.014, dir.y * 13.0 + 3.7));
      float fbmCurtain = 0.68 * n1 + 0.32 * n2;
      float curtainMask = smoothstep(0.16, 0.58, bowAlign) *
        smoothstep(0.74, 0.08, dir.y + (fbmCurtain - 0.5) * 0.18);
      vec3 rainBase = mix(vec3(0.022, 0.032, 0.058), vec3(0.24, 0.28, 0.34), uDaylight);
      vec3 rainFold = mix(vec3(0.048, 0.068, 0.115), vec3(0.42, 0.47, 0.54), uDaylight);
      vec3 rainCol = mix(rainBase, rainFold, smoothstep(0.25, 0.80, fbmCurtain) * smoothstep(0.02, 0.55, dir.y));
      col = mix(col, rainCol, clamp(curtainMask * uForwardCurtain * 0.98, 0.0, 0.99));
    }

    // Song 15 Patchy Overcast multi-scale cloud deck (opaque cloud patches with clear sky rifts!)
    if (uOvercast > 0.01 && dir.y > -0.02) {
      vec2 skyUv = dir.xz / (max(0.0, dir.y) + 0.26);
      float c1 = noise2(skyUv * 1.55 + vec2(uTime * 0.015, 0.0));
      float c2 = noise2(skyUv * 3.45 + vec2(uTime * 0.024, 4.3));
      float cloudField = 0.68 * c1 + 0.32 * c2;
      float patchMask = smoothstep(0.38, 0.66, cloudField) * smoothstep(-0.01, 0.14, dir.y);
      float billowLight = smoothstep(0.42, 0.82, c2) * smoothstep(0.04, 0.45, dir.y);
      vec3 ovBase = mix(vec3(0.020, 0.030, 0.055), vec3(0.40, 0.46, 0.55), uDaylight);
      vec3 ovCrown = mix(vec3(0.050, 0.074, 0.128), vec3(0.76, 0.82, 0.89), uDaylight);
      vec3 ovCol = mix(ovBase, ovCrown, billowLight);
      ovCol = mix(ovCol, vec3(0.88, 0.52, 0.38), uTwilight * billowLight * 0.55);
      col = mix(col, ovCol, clamp(patchMask * uOvercast * 0.97, 0.0, 0.985));
    }

    // Act III Sea Fog (shrouds horizon & sky while leaving a faint upper glow)
    if (uSeaFog > 0.01) {
      float fogN = noise2(vec2(dir.x * 4.0 + uTime * 0.025, dir.y * 6.0));
      float fogHeightMask = smoothstep(0.68, 0.04, dir.y + (fogN - 0.5) * 0.08);
      vec3 fogCol = mix(vec3(0.13, 0.16, 0.21), vec3(0.76, 0.81, 0.85), 0.22 + 0.78 * uDaylight);
      col = mix(col, fogCol, clamp(uSeaFog * (0.68 + 0.32 * fogHeightMask), 0.0, 0.96));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const STAR_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aShimmer;

  uniform float uPixelRatio;
  uniform float uTime;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float twinkle = 0.88 + 0.12 * sin(uTime * 3.1 + position.x * 0.07 + position.z * 0.05);
    float easyPulse = aShimmer > 0.5 ? (1.35 + 0.42 * sin(uTime * 5.2)) : 1.0;
    vAlpha = clamp(aAlpha * twinkle * (aShimmer > 0.5 ? 1.2 : 1.0), 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * easyPulse * uPixelRatio;
  }
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.06, d);
    float spark = pow(max(0.0, 1.0 - d * 2.0), 3.0);
    gl_FragColor = vec4(vColor * (0.75 + 0.65 * spark), core * vAlpha);
  }
`;

const CONSTELLATION_LINE_VERTEX_SHADER = /* glsl */ `
  attribute float aLineAlpha;
  varying float vLineAlpha;
  void main() {
    vLineAlpha = aLineAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CONSTELLATION_LINE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBaseOpacity;
  varying float vLineAlpha;
  void main() {
    float a = uBaseOpacity * vLineAlpha;
    if (a <= 0.008) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

function fractJs(v) {
  return v - Math.floor(v);
}

function clampJs(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstepJs(edge0, edge1, x) {
  const t = clampJs((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Exact match to SKY_FRAGMENT_SHADER hash21 / noise2 so overcast & squall patches occlude stars & labels accurately
function hash21Js(px, py) {
  let x = fractJs(px * 123.34);
  let y = fractJs(py * 456.21);
  const d = x * (x + 45.32) + y * (y + 45.32);
  x += d;
  y += d;
  return fractJs(x * y);
}

function noise2Js(px, py) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  let fx = px - ix;
  let fy = py - iy;
  fx = fx * fx * (3.0 - 2.0 * fx);
  fy = fy * fy * (3.0 - 2.0 * fy);
  const a = hash21Js(ix, iy);
  const b = hash21Js(ix + 1.0, iy);
  const c = hash21Js(ix, iy + 1.0);
  const d = hash21Js(ix + 1.0, iy + 1.0);
  const nx0 = a + (b - a) * fx;
  const nx1 = c + (d - c) * fx;
  return nx0 + (nx1 - nx0) * fy;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296.0;
  };
}

export class SkyDomeRenderer {
  constructor(scene, labelLayerEl) {
    this.scene = scene;
    this.labelLayerEl = labelLayerEl;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Sky Scattering Sphere
    this.skyUniforms = {
      uSunDir: { value: new THREE.Vector3(0, 0.2, -1) },
      uDaylight: { value: 0.5 },
      uTwilight: { value: 0.5 },
      uStarVis: { value: 0.5 },
      uGalacticNormal: { value: new THREE.Vector3(0.45, 0.65, 0.61).normalize() },
      uForwardCurtain: { value: 0.0 },
      uOvercast: { value: 0.0 },
      uSeaFog: { value: 0.0 },
      uTime: { value: 0.0 },
    };

    const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 48, 32);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.renderOrder = -10;
    this.group.add(this.skyMesh);

    // 2. Build 31 Named Navigation Stars + 480 Deterministic Ambient Stars
    this.navStarList = Object.values(NAVIGATION_STARS);
    this.ambientStars = this._generateAmbientStars(480);
    const totalStars = this.navStarList.length + this.ambientStars.length;

    this.starPositions = new Float32Array(totalStars * 3);
    this.starSizes = new Float32Array(totalStars);
    this.starColors = new Float32Array(totalStars * 3);
    this.starAlphas = new Float32Array(totalStars);
    this.starShimmers = new Float32Array(totalStars);

    const tmpColor = new THREE.Color();
    this.navStarList.forEach((st, idx) => {
      tmpColor.set(st.colorHex || '#fff4dc');
      this.starColors[idx * 3] = tmpColor.r;
      this.starColors[idx * 3 + 1] = tmpColor.g;
      this.starColors[idx * 3 + 2] = tmpColor.b;
      this.starSizes[idx] = Math.max(4.5, (3.2 - st.magnitude) * 3.8);
    });

    const navOffset = this.navStarList.length;
    this.ambientStars.forEach((amb, i) => {
      const idx = navOffset + i;
      this.starColors[idx * 3] = amb.r;
      this.starColors[idx * 3 + 1] = amb.g;
      this.starColors[idx * 3 + 2] = amb.b;
      this.starSizes[idx] = amb.size;
    });

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(this.starSizes, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(this.starColors, 3));
    starGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.starAlphas, 1));
    starGeo.setAttribute('aShimmer', new THREE.BufferAttribute(this.starShimmers, 1));

    this.starUniforms = {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uTime: { value: 0.0 },
    };
    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      uniforms: this.starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.starPoints.frustumCulled = false;
    this.starPoints.renderOrder = -8;
    this.group.add(this.starPoints);

    // 3. Chalky Constellation Line Segments (shown in Easy/Medium/Hard, hidden in Master Navigator)
    this.constellationSegments = [];
    for (const c of CONSTELLATIONS) {
      for (const pair of c.lines) {
        this.constellationSegments.push({
          constellation: c,
          aId: pair[0],
          bId: pair[1],
        });
      }
    }
    this.linePositions = new Float32Array(this.constellationSegments.length * 6);
    this.lineAlphas = new Float32Array(this.constellationSegments.length * 2);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    lineGeo.setAttribute('aLineAlpha', new THREE.BufferAttribute(this.lineAlphas, 1));
    this.lineUniforms = {
      uColor: { value: new THREE.Color(0xdbe9ff) },
      uBaseOpacity: { value: 0.28 },
    };
    this.lineMaterial = new THREE.ShaderMaterial({
      vertexShader: CONSTELLATION_LINE_VERTEX_SHADER,
      fragmentShader: CONSTELLATION_LINE_FRAGMENT_SHADER,
      uniforms: this.lineUniforms,
      transparent: true,
      depthWrite: false,
    });
    this.constellationLines = new THREE.LineSegments(lineGeo, this.lineMaterial);
    this.constellationLines.frustumCulled = false;
    this.constellationLines.renderOrder = -9;
    this.group.add(this.constellationLines);

    // Highlighted Constellation Focus Lines (used in Star-Stone Vigil lessons, Atlas & Quiz reveal)
    this.focusPositions = new Float32Array(this.constellationSegments.length * 6);
    const focusGeo = new THREE.BufferGeometry();
    focusGeo.setAttribute('position', new THREE.BufferAttribute(this.focusPositions, 3));
    this.focusLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffdf88,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.focusLines = new THREE.LineSegments(focusGeo, this.focusLineMaterial);
    this.focusLines.frustumCulled = false;
    this.focusLines.renderOrder = -8.5;
    this.focusLines.visible = false;
    this.group.add(this.focusLines);

    // 4. DOM Sky Labels for Named Stars (strictly mode-gated; zero degrees/cardinals)
    this.starLabelEls = {};
    if (this.labelLayerEl) {
      for (const st of this.navStarList) {
        const el = document.createElement('div');
        el.className = 'sky-star-label';
        el.textContent = st.name;
        el.style.display = 'none';
        this.labelLayerEl.appendChild(el);
        this.starLabelEls[st.id] = el;
      }
    }

    // Weather transition smoothing
    this.curCurtain = 0.0;
    this.curOvercast = 0.0;
    this.curSeaFog = 0.0;
    this._projVec = new THREE.Vector3();
    this._probeDir = { x: 0.0, y: 1.0, z: 0.0 };
  }

  _generateAmbientStars(count) {
    const rand = seededRandom(90817263);
    const list = [];
    const palettes = [
      [1.0, 0.95, 0.86],
      [0.84, 0.92, 1.0],
      [1.0, 0.86, 0.72],
      [0.92, 0.96, 1.0],
    ];
    for (let i = 0; i < count; i += 1) {
      const raDeg = rand() * 360.0;
      const u = rand() * 2.0 - 1.0;
      const decDeg = (Math.asin(u) * 180.0) / Math.PI;
      const pal = palettes[i % palettes.length];
      list.push({
        raDeg,
        decDeg,
        r: pal[0],
        g: pal[1],
        b: pal[2],
        size: 1.5 + Math.pow(rand(), 2.2) * 2.6,
        baseAlpha: 0.28 + rand() * 0.55,
      });
    }
    return list;
  }

  _weatherAttenuationForDir(dir, curCurtain, curOvercast, curSeaFog, elapsedSec = 0.0) {
    let atten = 1.0;
    if (curCurtain > 0.01 && dir.z < -0.14 && dir.y < 0.78) {
      const bowAlign = clampJs(-dir.z, 0.0, 1.0);
      const n1 = noise2Js(dir.x * 4.6 + elapsedSec * 0.022, dir.y * 6.2);
      const n2 = noise2Js(dir.x * 10.5 - elapsedSec * 0.014, dir.y * 13.0 + 3.7);
      const fbmCurtain = 0.68 * n1 + 0.32 * n2;
      const curtainMask =
        smoothstepJs(0.16, 0.58, bowAlign) *
        smoothstepJs(0.74, 0.08, dir.y + (fbmCurtain - 0.5) * 0.18);
      atten *= 1.0 - Math.min(1.0, curtainMask * curCurtain * 1.04);
    }
    if (curOvercast > 0.01 && dir.y > -0.02) {
      const denom = Math.max(0.0, dir.y) + 0.26;
      const uvX = dir.x / denom;
      const uvY = dir.z / denom;
      const c1 = noise2Js(uvX * 1.55 + elapsedSec * 0.015, uvY * 1.55);
      const c2 = noise2Js(uvX * 3.45 + elapsedSec * 0.024, uvY * 3.45 + 4.3);
      const cloudField = 0.68 * c1 + 0.32 * c2;
      const patchMask =
        smoothstepJs(0.36, 0.64, cloudField) *
        smoothstepJs(-0.01, 0.14, dir.y);
      atten *= 1.0 - Math.min(1.0, patchMask * curOvercast * 1.04);
    }
    if (curSeaFog > 0.01) {
      const fogN = noise2Js(dir.x * 4.0 + elapsedSec * 0.025, dir.y * 6.0);
      const fogHeightMask = smoothstepJs(
        0.68,
        0.04,
        dir.y + (fogN - 0.5) * 0.08
      );
      atten *= 1.0 - Math.min(1.0, curSeaFog * (0.76 + 0.24 * fogHeightMask));
    }
    return Math.max(0.0, atten);
  }

  _skyClearanceForDir(dir, camOrigin, cloudOccluder, elapsedSec) {
    const weatherAtten = this._weatherAttenuationForDir(
      dir,
      this.curCurtain,
      this.curOvercast,
      this.curSeaFog,
      elapsedSec
    );
    if (weatherAtten <= 0.01) return 0.0;
    const cloudTrans =
      cloudOccluder && camOrigin
        ? cloudOccluder.getCloudTransmittance(camOrigin, dir)
        : 1.0;
    return weatherAtten * cloudTrans;
  }

  update(
    dtSec,
    elapsedSec,
    oceanSim,
    difficulty,
    camera,
    vigilOverrides = null,
    cloudOccluder = null
  ) {
    if (!oceanSim) return;

    if (camera) {
      this.group.position.copy(camera.position);
    }
    const camOrigin = camera ? camera.position : this.group.position;

    const headingDeg = oceanSim.headingDeg;
    const latDeg = oceanSim.latDeg ?? GameConstants.REFERENCE_LATITUDE_DEG;
    const sun = oceanSim.sunState;
    const verse = oceanSim.getCurrentVerse();
    const weather = vigilOverrides?.forceClearSky ? 'clear' : verse?.weather ?? 'clear';

    const targetCurtain = weather === 'forward_cloud_curtain' ? 1.0 : 0.0;
    const targetOvercast = weather === 'patchy_overcast' ? 1.0 : 0.0;
    const targetSeaFog = weather === 'sea_fog' ? 1.0 : 0.0;
    const lerpRate = vigilOverrides?.forceClearSky ? 1.0 : Math.min(1.0, dtSec * 1.4);

    this.curCurtain += (targetCurtain - this.curCurtain) * lerpRate;
    this.curOvercast += (targetOvercast - this.curOvercast) * lerpRate;
    this.curSeaFog += (targetSeaFog - this.curSeaFog) * lerpRate;

    const sunVec = altAzToDirectionVec3(sun.altDeg, sun.azDeg, headingDeg);
    this.skyUniforms.uSunDir.value.set(sunVec.x, sunVec.y, sunVec.z).normalize();
    this.skyUniforms.uDaylight.value = sun.daylightFactor;
    this.skyUniforms.uTwilight.value = sun.twilightFactor;
    this.skyUniforms.uStarVis.value = sun.starVisibility;
    this.skyUniforms.uForwardCurtain.value = this.curCurtain;
    this.skyUniforms.uOvercast.value = this.curOvercast;
    this.skyUniforms.uSeaFog.value = this.curSeaFog;
    this.skyUniforms.uTime.value = elapsedSec;
    this.starUniforms.uTime.value = elapsedSec;

    // Rotate Milky Way galactic pole on the unified sphere at the active island/voyage latitude
    const galPoleAltAz = computeStarAltAz(192.8, 27.1, sun.lstDeg, latDeg);
    const galVec = altAzToDirectionVec3(
      galPoleAltAz.altDeg,
      galPoleAltAz.azDeg,
      headingDeg
    );
    this.skyUniforms.uGalacticNormal.value
      .set(galVec.x, galVec.y, galVec.z)
      .normalize();

    // Determine active guidance stars for Easy-mode shimmer & Vigil tutorial focus
    const activeStarIds = new Set();
    if (vigilOverrides) {
      if (vigilOverrides.shimmerStarIds) {
        for (const id of vigilOverrides.shimmerStarIds) activeStarIds.add(id);
      }
    } else if (verse?.guidance) {
      const g = verse.guidance;
      if (Array.isArray(g.stars)) {
        g.stars.forEach((id) => activeStarIds.add(id));
      }
      if (g.sternStarId) activeStarIds.add(g.sternStarId);
      if (verse.zenithTriggerStarId) activeStarIds.add(verse.zenithTriggerStarId);
    }
    const easyShimmer = vigilOverrides
      ? activeStarIds.size > 0
      : showsActiveStarShimmer(difficulty);
    const showLines = vigilOverrides
      ? Boolean(vigilOverrides.showLines)
      : showsSkyAnnotations(difficulty);
    const showLabels = vigilOverrides
      ? Boolean(vigilOverrides.showStarLabels)
      : showsSkyAnnotations(difficulty);

    // Update Named Navigation Stars (occluded by both 3D clouds & weather cloud patches)
    const starVis = sun.starVisibility;
    const navWorldVecs = {};

    this.navStarList.forEach((st, idx) => {
      const state = oceanSim.starsState[st.id];
      if (!state) return;
      const dir = altAzToDirectionVec3(state.altDeg, state.azDeg, headingDeg);

      this.starPositions[idx * 3] = dir.x * STAR_RADIUS;
      this.starPositions[idx * 3 + 1] = dir.y * STAR_RADIUS;
      this.starPositions[idx * 3 + 2] = dir.z * STAR_RADIUS;

      let skyClearance = 0.0;
      if (starVis > 0.005 && state.altDeg > -0.8) {
        skyClearance = this._skyClearanceForDir(
          dir,
          camOrigin,
          cloudOccluder,
          elapsedSec
        );
      }
      navWorldVecs[st.id] = { dir, altDeg: state.altDeg, state, skyClearance };

      const cleanClearance =
        skyClearance < 0.08 ? 0.0 : smoothstepJs(0.08, 0.45, skyClearance) * skyClearance;
      const alpha = state.extinctionFactor * starVis * cleanClearance;
      this.starAlphas[idx] = alpha;
      this.starShimmers[idx] =
        easyShimmer &&
        activeStarIds.has(st.id) &&
        alpha > 0.14 &&
        skyClearance > 0.28
          ? 1.0
          : 0.0;
    });

    // Update 480 Ambient Stars at the active latitude (occluded by 3D clouds & weather patches)
    const navOffset = this.navStarList.length;
    for (let i = 0; i < this.ambientStars.length; i += 1) {
      const amb = this.ambientStars[i];
      const idx = navOffset + i;
      const st = computeStarAltAz(amb.raDeg, amb.decDeg, sun.lstDeg, latDeg);
      const dir = altAzToDirectionVec3(st.altDeg, st.azDeg, headingDeg);

      this.starPositions[idx * 3] = dir.x * STAR_RADIUS;
      this.starPositions[idx * 3 + 1] = dir.y * STAR_RADIUS;
      this.starPositions[idx * 3 + 2] = dir.z * STAR_RADIUS;

      if (starVis <= 0.005 || st.altDeg <= -0.5) {
        this.starAlphas[idx] = 0.0;
        this.starShimmers[idx] = 0.0;
        continue;
      }

      const skyClearance = this._skyClearanceForDir(
        dir,
        camOrigin,
        cloudOccluder,
        elapsedSec
      );
      const cleanClearance =
        skyClearance < 0.08 ? 0.0 : smoothstepJs(0.08, 0.45, skyClearance) * skyClearance;
      this.starAlphas[idx] =
        st.extinctionFactor * starVis * amb.baseAlpha * cleanClearance;
      this.starShimmers[idx] = 0.0;
    }

    this.starPoints.geometry.attributes.position.needsUpdate = true;
    this.starPoints.geometry.attributes.aAlpha.needsUpdate = true;
    this.starPoints.geometry.attributes.aShimmer.needsUpdate = true;

    // Update Chalky Constellation Outlines (per-vertex alpha occluded by clouds)
    this.constellationLines.visible = showLines && starVis > 0.08;
    if (this.constellationLines.visible) {
      this.lineUniforms.uBaseOpacity.value =
        (vigilOverrides ? 0.34 : 0.24) * starVis * (1.0 - 0.85 * this.curSeaFog);
      this.constellationSegments.forEach((seg, sIdx) => {
        const va = navWorldVecs[seg.aId];
        const vb = navWorldVecs[seg.bId];
        const base = sIdx * 6;
        const aBase = sIdx * 2;
        if (va && vb && va.altDeg > 0.5 && vb.altDeg > 0.5) {
          this.linePositions[base] = va.dir.x * (STAR_RADIUS - 2.0);
          this.linePositions[base + 1] = va.dir.y * (STAR_RADIUS - 2.0);
          this.linePositions[base + 2] = va.dir.z * (STAR_RADIUS - 2.0);
          this.linePositions[base + 3] = vb.dir.x * (STAR_RADIUS - 2.0);
          this.linePositions[base + 4] = vb.dir.y * (STAR_RADIUS - 2.0);
          this.linePositions[base + 5] = vb.dir.z * (STAR_RADIUS - 2.0);

          // Also check segment midpoint so a cloud crossing between two stars breaks the line cleanly
          const mx = va.dir.x + vb.dir.x;
          const my = va.dir.y + vb.dir.y;
          const mz = va.dir.z + vb.dir.z;
          const mLen = Math.hypot(mx, my, mz) || 1.0;
          this._probeDir.x = mx / mLen;
          this._probeDir.y = my / mLen;
          this._probeDir.z = mz / mLen;
          const midClearance = this._skyClearanceForDir(
            this._probeDir,
            camOrigin,
            cloudOccluder,
            elapsedSec
          );
          const midFactor = smoothstepJs(0.14, 0.55, midClearance);
          this.lineAlphas[aBase] =
            smoothstepJs(0.12, 0.50, va.skyClearance) * midFactor;
          this.lineAlphas[aBase + 1] =
            smoothstepJs(0.12, 0.50, vb.skyClearance) * midFactor;
        } else {
          for (let k = 0; k < 6; k += 1) this.linePositions[base + k] = 0.0;
          this.lineAlphas[aBase] = 0.0;
          this.lineAlphas[aBase + 1] = 0.0;
        }
      });
      this.constellationLines.geometry.attributes.position.needsUpdate = true;
      this.constellationLines.geometry.attributes.aLineAlpha.needsUpdate = true;
    }

    // Update Focused Constellation Golden Outline (Vigil Atlas / Lesson / Quiz Reveal)
    const focusConstId = vigilOverrides?.focusConstellationId || null;
    this.focusLines.visible = Boolean(focusConstId) && starVis > 0.08;
    if (this.focusLines.visible) {
      this.focusLineMaterial.opacity = 0.65 + 0.2 * Math.sin(elapsedSec * 3.4);
      this.constellationSegments.forEach((seg, sIdx) => {
        const base = sIdx * 6;
        const va = navWorldVecs[seg.aId];
        const vb = navWorldVecs[seg.bId];
        if (
          seg.constellation.id === focusConstId &&
          va &&
          vb &&
          va.altDeg > 0.5 &&
          vb.altDeg > 0.5
        ) {
          this.focusPositions[base] = va.dir.x * (STAR_RADIUS - 4.0);
          this.focusPositions[base + 1] = va.dir.y * (STAR_RADIUS - 4.0);
          this.focusPositions[base + 2] = va.dir.z * (STAR_RADIUS - 4.0);
          this.focusPositions[base + 3] = vb.dir.x * (STAR_RADIUS - 4.0);
          this.focusPositions[base + 4] = vb.dir.y * (STAR_RADIUS - 4.0);
          this.focusPositions[base + 5] = vb.dir.z * (STAR_RADIUS - 4.0);
        } else {
          for (let k = 0; k < 6; k += 1) this.focusPositions[base + k] = 0.0;
        }
      });
      this.focusLines.geometry.attributes.position.needsUpdate = true;
    }

    // Project Mode-Gated Sky Star Labels (strictly hidden whenever occluded by any cloud!)
    if (this.labelLayerEl && camera) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const revealStarIds = vigilOverrides?.revealLabelStarIds || null;
      for (const st of this.navStarList) {
        const el = this.starLabelEls[st.id];
        if (!el) continue;
        const info = navWorldVecs[st.id];
        const allowThisLabel =
          showLabels || (revealStarIds && revealStarIds.has(st.id));
        if (!allowThisLabel || !info || info.altDeg < 1.2 || starVis < 0.16) {
          el.style.display = 'none';
          continue;
        }

        // Check both the star's line of sight AND the label offset slightly above the star (sy - 16px)
        if (info.skyClearance < 0.34) {
          el.style.display = 'none';
          continue;
        }

        const upShift = 0.028;
        const px = info.dir.x;
        const py = info.dir.y + upShift;
        const pz = info.dir.z;
        const pLen = Math.hypot(px, py, pz) || 1.0;
        this._probeDir.x = px / pLen;
        this._probeDir.y = py / pLen;
        this._probeDir.z = pz / pLen;
        const labelOffsetClearance = this._skyClearanceForDir(
          this._probeDir,
          camOrigin,
          cloudOccluder,
          elapsedSec
        );
        const labelClearance = Math.min(info.skyClearance, labelOffsetClearance);
        if (labelClearance < 0.34) {
          el.style.display = 'none';
          continue;
        }

        this._projVec.set(
          this.group.position.x + info.dir.x * STAR_RADIUS,
          this.group.position.y + info.dir.y * STAR_RADIUS,
          this.group.position.z + info.dir.z * STAR_RADIUS
        );
        this._projVec.project(camera);

        if (
          this._projVec.z > 1.0 ||
          this._projVec.x < -0.92 ||
          this._projVec.x > 0.92 ||
          this._projVec.y < -0.68 ||
          this._projVec.y > 0.92
        ) {
          el.style.display = 'none';
          continue;
        }

        const sx = (this._projVec.x * 0.5 + 0.5) * width;
        const sy = (-this._projVec.y * 0.5 + 0.5) * height;
        const isTarget = activeStarIds.has(st.id);
        const cloudFade = smoothstepJs(0.34, 0.78, labelClearance);

        el.style.display = 'block';
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy - 16).toFixed(1)}px, 0) translateX(-50%)`;
        el.style.opacity = String(
          Math.min(
            0.95,
            starVis * cloudFade * (isTarget ? 0.98 : 0.62)
          )
        );
        el.classList.toggle('active-target-star', easyShimmer && isTarget);
      }
    }
  }
}
