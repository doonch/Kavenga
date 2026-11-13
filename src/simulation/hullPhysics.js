/**
 * Twin-hull ocean swell coupling, 4-beat pahu drum Doppler sync, and Ring 3 island wave interference.
 * Drives both 3D VakaRenderer pitch/roll/heave and SpatialSeaAudio stereo slap cascade.
 */

import { degToRad, wrapDeg180 } from '../core/gameConstants.js';

export const MotionSignature = Object.freeze({
  HEAD_ON: 'head_on',
  PORT_CHEEK: 'port_cheek',
  STARBOARD_CHEEK: 'starboard_cheek',
  BEAM_ON: 'beam_on',
  FOLLOWING: 'following',
  CALM_SHADOW: 'calm_shadow',
});

export const IslandWaveZone = Object.freeze({
  OPEN_SEA: 0,
  REFRACTION_LATTICE: 1,
  CLIFF_REFLECTION: 2,
  CALM_WAVE_SHADOW: 3,
});

function clamp(val, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, val));
}

/**
 * Perceptual Doppler curve calibrated to GDD Section 5.4:
 *   - Head-On (0 deg rel): 2.75 beats per wave (rushed bow slap)
 *   - Port / Starboard Cheek (+/-45 deg rel): 4.000 beats per wave (exact 4-beat pahu drum lock)
 *   - Beam-On (+/-90 deg rel): 5.16 beats per wave (lateral roll)
 *   - Following (180 deg rel): 6.25 beats per wave (lazy surging lift)
 */
export function computeBeatsPerWave(canoeHeadingDeg, swellFromAzDeg) {
  const relDeg = wrapDeg180(swellFromAzDeg - canoeHeadingDeg);
  const u = clamp((1.0 - Math.cos(degToRad(relDeg))) * 0.5, 0.0, 1.0);
  return 2.75 + 3.5 * Math.pow(u, 0.535955);
}

/**
 * Classifies the twin-hulled vaka's motion signature in cue-relative terms.
 */
export function classifyMotionSignature(
  canoeHeadingDeg,
  swellFromAzDeg,
  islandWaveZone = IslandWaveZone.OPEN_SEA
) {
  if (islandWaveZone === IslandWaveZone.CALM_WAVE_SHADOW) {
    return {
      signature: MotionSignature.CALM_SHADOW,
      relAngleDeg: 0.0,
      cheekSide: 'none',
      description: 'Flat calm wave-shadow behind an unseen island',
    };
  }

  // relDeg > 0 means swell arrives from starboard side; relDeg < 0 means swell arrives from port side.
  const relDeg = wrapDeg180(swellFromAzDeg - canoeHeadingDeg);
  const absRel = Math.abs(relDeg);

  if (absRel < 22.5) {
    return {
      signature: MotionSignature.HEAD_ON,
      relAngleDeg: relDeg,
      cheekSide: 'both',
      description: 'Sharp bow seesaw rushing into the swell',
    };
  }
  if (absRel < 67.5) {
    const isPort = relDeg < 0.0;
    return {
      signature: isPort ? MotionSignature.PORT_CHEEK : MotionSignature.STARBOARD_CHEEK,
      relAngleDeg: relDeg,
      cheekSide: isPort ? 'port' : 'starboard',
      description: isPort
        ? 'Diagonal corkscrew lifting port cheek first'
        : 'Diagonal corkscrew lifting starboard cheek first',
    };
  }
  if (absRel < 125.0) {
    return {
      signature: MotionSignature.BEAM_ON,
      relAngleDeg: relDeg,
      cheekSide: relDeg < 0.0 ? 'port' : 'starboard',
      description: 'Wide side-to-side roll across the crossbeams',
    };
  }
  return {
    signature: MotionSignature.FOLLOWING,
    relAngleDeg: relDeg,
    cheekSide: 'stern',
    description: 'Slow surging heave as swells overtake the stern',
  };
}

/**
 * Samples the 4 twin-hull corners (portBow, starboardBow, portStern, starboardStern)
 * to produce smooth 3D pitch, roll, heave, and stereo slap intensities.
 */
export function sampleTwinHullState({
  elapsedSec,
  bpm = 60.0,
  canoeHeadingDeg,
  primarySwellFromAz,
  secondaryChopFromAz = null,
  islandWaveZone = IslandWaveZone.OPEN_SEA,
  islandBearingDeg = 0.0,
}) {
  const beatsPerWave = computeBeatsPerWave(canoeHeadingDeg, primarySwellFromAz);
  const beatsPerSec = bpm / 60.0;
  const wavesPerSec = beatsPerSec / beatsPerWave;
  const wavePhase01 = (elapsedSec * wavesPerSec) % 1.0;
  const omegaT = wavePhase01 * Math.PI * 2.0;

  const motion = classifyMotionSignature(
    canoeHeadingDeg,
    primarySwellFromAz,
    islandWaveZone
  );

  // Local canoe coordinates of the 4 hull corners (meters: X starboard, Z aft)
  const halfBeam = 2.35;
  const halfLen = 6.8;
  const corners = {
    portBow: { x: -halfBeam, z: -halfLen },
    starboardBow: { x: halfBeam, z: -halfLen },
    portStern: { x: -halfBeam, z: halfLen },
    starboardStern: { x: halfBeam, z: halfLen },
  };

  // Wave propagation direction in local canoe XZ frame (swell travels toward primarySwellFromAz + 180)
  const relFromRad = degToRad(wrapDeg180(primarySwellFromAz - canoeHeadingDeg));
  // Incoming direction vector in local frame (+X starboard, -Z bow):
  // A wave arriving from relFromRad comes from (sin(relFromRad), -cos(relFromRad))
  // and propagates toward (-sin(relFromRad), +cos(relFromRad))
  const propX = -Math.sin(relFromRad);
  const propZ = Math.cos(relFromRad);
  const kPrimary = (Math.PI * 2.0) / 42.0; // 42m effective local coupling wavelength

  const baseAmp =
    islandWaveZone === IslandWaveZone.CALM_WAVE_SHADOW ? 0.09 : 0.62;

  const heights = {};
  for (const [name, pt] of Object.entries(corners)) {
    const proj = pt.x * propX + pt.z * propZ;
    let h = baseAmp * Math.cos(omegaT - kPrimary * proj);

    // Secondary surface wind-chop (e.g., Song 16 cross-chop)
    if (secondaryChopFromAz !== null && secondaryChopFromAz !== undefined) {
      const chopRel = degToRad(wrapDeg180(secondaryChopFromAz - canoeHeadingDeg));
      const chopPropX = -Math.sin(chopRel);
      const chopPropZ = Math.cos(chopRel);
      const chopProj = pt.x * chopPropX + pt.z * chopPropZ;
      h += 0.16 * Math.cos(elapsedSec * 2.65 - 0.35 * chopProj);
    }

    // Ring 3 island wave zone interference signatures
    if (islandWaveZone === IslandWaveZone.REFRACTION_LATTICE) {
      const islRel = degToRad(wrapDeg180(islandBearingDeg - canoeHeadingDeg));
      const refA = -Math.sin(islRel + 0.48) * pt.x + Math.cos(islRel + 0.48) * pt.z;
      const refB = -Math.sin(islRel - 0.48) * pt.x + Math.cos(islRel - 0.48) * pt.z;
      h += 0.18 * Math.cos(omegaT * 1.15 - 0.22 * refA) + 0.18 * Math.cos(omegaT * 1.15 - 0.22 * refB);
    } else if (islandWaveZone === IslandWaveZone.CLIFF_REFLECTION) {
      const islRel = degToRad(wrapDeg180(islandBearingDeg - canoeHeadingDeg));
      const backX = -Math.sin(islRel);
      const backZ = Math.cos(islRel);
      const backProj = pt.x * backX + pt.z * backZ;
      // Standing-wave pyramidal interference bounce
      h += 0.32 * Math.cos(omegaT * 1.35 - 0.28 * backProj);
    }

    heights[name] = h;
  }

  const foreAvg = 0.5 * (heights.portBow + heights.starboardBow);
  const aftAvg = 0.5 * (heights.portStern + heights.starboardStern);
  const portAvg = 0.5 * (heights.portBow + heights.portStern);
  const stbdAvg = 0.5 * (heights.starboardBow + heights.starboardStern);

  const heaveM = 0.25 * (foreAvg + aftAvg + portAvg + stbdAvg);
  // Positive pitchRad lifts the twin prows upward; positive rollRad dips starboard / lifts port
  const pitchRad = Math.atan2(foreAvg - aftAvg, halfLen * 2.0);
  const rollRad = Math.atan2(portAvg - stbdAvg, halfBeam * 2.0);

  // Stereo cheek slap intensities peak as each bow crest rises sharply through zero
  const portCrest = clamp(heights.portBow / Math.max(0.2, baseAmp), 0.0, 1.0);
  const starboardCrest = clamp(heights.starboardBow / Math.max(0.2, baseAmp), 0.0, 1.0);

  return {
    heaveM,
    pitchRad,
    rollRad,
    beatsPerWave,
    wavePhase01,
    drumBeatPhase01: ((elapsedSec * beatsPerSec) % 4.0) / 4.0,
    drumBeatIndex: Math.floor((elapsedSec * beatsPerSec) % 4.0),
    signature: motion.signature,
    cheekSide: motion.cheekSide,
    relAngleDeg: motion.relAngleDeg,
    motionDescription: motion.description,
    portSlapIntensity: portCrest,
    starboardSlapIntensity: starboardCrest,
    cornerHeights: heights,
  };
}
