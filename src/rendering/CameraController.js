/**
 * First-person navigator camera & steering controller for Kavenga: Songs of the Star Path.
 * - Default framing: ~78% sky dome & horizon (0..42 deg altitude), ~22% twin prows, deck & swell.
 * - Trim-Lock Steering: A/D or Left/Right smoothly turns the steering sweep and locks on release.
 * - 360 deg Free-Look: pointer drag or IJKL rotates gaze -180..+180 deg yaw and -24..+90 deg pitch
 *   (including 180 deg astern wake checks and +90 deg masthead zenith checks), snapping back smoothly.
 */

import * as THREE from 'three';
import { GameConstants, degToRad } from '../core/gameConstants.js';

function clamp(val, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, val));
}

export class CameraController {
  constructor(domElement) {
    this.domElement = domElement;

    // 56 deg vertical FOV with +13.5 deg base pitch frames -14.5 deg (deck/prows) to +41.5 deg (~42 deg sky)
    this.camera = new THREE.PerspectiveCamera(
      56.0,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.25,
      1800.0
    );
    this.baseEyePos = new THREE.Vector3(0.0, 2.38, 3.45);
    this.basePitchDeg = 13.5;

    // Gaze offsets relative to canoe forward (-Z)
    this.lookYawDeg = 0.0;
    this.lookPitchOffsetDeg = 0.0;
    this.isDraggingLook = false;
    this.freeLookPinned = false; // If toggled via HUD button, holds gaze until recentered
    this._lastPointer = { x: 0, y: 0 };

    // Steering velocity (deg/sec)
    this.steerVelocityDegPerSec = 0.0;
    this.maxSteerDegPerSec = 24.0;
    this.keysDown = new Set();

    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._bindEvents();
  }

  _bindEvents() {
    this._onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }
      this.keysDown.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyC') {
        this.recenterGaze();
      }
    };

    this._onKeyUp = (e) => {
      this.keysDown.delete(e.code);
    };

    this._onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0 && e.button !== 2) return;
      if (e.target !== this.domElement) return;
      this.isDraggingLook = true;
      this._lastPointer.x = e.clientX;
      this._lastPointer.y = e.clientY;
    };

    this._onPointerMove = (e) => {
      if (!this.isDraggingLook) return;
      const dx = e.clientX - this._lastPointer.x;
      const dy = e.clientY - this._lastPointer.y;
      this._lastPointer.x = e.clientX;
      this._lastPointer.y = e.clientY;

      const sensitivity = 0.28;
      this.lookYawDeg -= dx * sensitivity;
      if (this.lookYawDeg > 180.0) this.lookYawDeg -= 360.0;
      if (this.lookYawDeg < -180.0) this.lookYawDeg += 360.0;

      // Total pitch allowed from -24 deg (down onto crossbeams) up to +90 deg (masthead zenith)
      const nextPitchOffset = this.lookPitchOffsetDeg - dy * sensitivity;
      this.lookPitchOffsetDeg = clamp(
        nextPitchOffset,
        -37.5,
        90.0 - this.basePitchDeg
      );
    };

    this._onPointerUp = () => {
      this.isDraggingLook = false;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
  }

  resize(width, height) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  togglePinnedFreeLook() {
    this.freeLookPinned = !this.freeLookPinned;
    if (!this.freeLookPinned) {
      this.recenterGaze();
    }
    return this.freeLookPinned;
  }

  recenterGaze() {
    this.freeLookPinned = false;
    this.isDraggingLook = false;
  }

  lookAstern() {
    this.freeLookPinned = true;
    this.lookYawDeg = 180.0;
    this.lookPitchOffsetDeg = -6.0;
  }

  lookZenith() {
    this.freeLookPinned = true;
    this.lookYawDeg = 0.0;
    this.lookPitchOffsetDeg = 90.0 - this.basePitchDeg;
  }

  isGazeOffset() {
    return (
      Math.abs(this.lookYawDeg) > 1.5 || Math.abs(this.lookPitchOffsetDeg) > 1.5
    );
  }

  /**
   * Updates steering input, camera gaze spring-back, and couples camera subtly to hull heave/pitch/roll.
   */
  update(dtSec, oceanSim, sailingActive = true) {
    const dt = Math.min(0.1, Math.max(0.001, dtSec));

    // 1. Trim-Lock Steering (A / ArrowLeft = Port, D / ArrowRight = Starboard)
    let steerInput = 0.0;
    if (sailingActive) {
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) {
        steerInput -= 1.0;
      }
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) {
        steerInput += 1.0;
      }
      if (this.keysDown.has('KeyQ')) steerInput -= 0.35; // Fine trim port
      if (this.keysDown.has('KeyE')) steerInput += 0.35; // Fine trim starboard
    }

    const targetVel = steerInput * this.maxSteerDegPerSec;
    const accelRate = steerInput !== 0.0 ? 6.5 : 9.0;
    this.steerVelocityDegPerSec +=
      (targetVel - this.steerVelocityDegPerSec) * Math.min(1.0, accelRate * dt);
    if (Math.abs(this.steerVelocityDegPerSec) < 0.02 && steerInput === 0.0) {
      this.steerVelocityDegPerSec = 0.0;
    }

    if (sailingActive && oceanSim && this.steerVelocityDegPerSec !== 0.0) {
      oceanSim.steer(this.steerVelocityDegPerSec * dt);
    }

    // 2. Keyboard Free-Look (I/J/K/L)
    let keyLookActive = false;
    if (sailingActive) {
      const keyLookSpeed = 85.0 * dt;
      if (this.keysDown.has('KeyJ')) {
        this.lookYawDeg += keyLookSpeed;
        keyLookActive = true;
      }
      if (this.keysDown.has('KeyL')) {
        this.lookYawDeg -= keyLookSpeed;
        keyLookActive = true;
      }
      if (this.keysDown.has('KeyI')) {
        this.lookPitchOffsetDeg = clamp(
          this.lookPitchOffsetDeg + keyLookSpeed,
          -37.5,
          90.0 - this.basePitchDeg
        );
        keyLookActive = true;
      }
      if (this.keysDown.has('KeyK')) {
        this.lookPitchOffsetDeg = clamp(
          this.lookPitchOffsetDeg - keyLookSpeed,
          -37.5,
          90.0 - this.basePitchDeg
        );
        keyLookActive = true;
      }
      if (this.lookYawDeg > 180.0) this.lookYawDeg -= 360.0;
      if (this.lookYawDeg < -180.0) this.lookYawDeg += 360.0;
    }

    // Smooth snap-back to dead-ahead between twin prows when released and not pinned
    if (!this.isDraggingLook && !this.freeLookPinned && !keyLookActive) {
      const spring = Math.min(1.0, 6.2 * dt);
      this.lookYawDeg *= 1.0 - spring;
      this.lookPitchOffsetDeg *= 1.0 - spring;
      if (Math.abs(this.lookYawDeg) < 0.05) this.lookYawDeg = 0.0;
      if (Math.abs(this.lookPitchOffsetDeg) < 0.05) this.lookPitchOffsetDeg = 0.0;
    }

    // 3. Apply hull heave & gentle horizon stabilization (navigator's inner ear keeps ~35% hull motion)
    const hull = oceanSim?.hullState;
    const heave = hull ? hull.heaveM * 0.85 : 0.0;
    const hullPitch = hull ? hull.pitchRad * 0.42 : 0.0;
    const hullRoll = hull ? hull.rollRad * 0.38 : 0.0;

    this.camera.position.set(
      this.baseEyePos.x - (hull ? hull.rollRad * 1.1 : 0.0),
      this.baseEyePos.y + heave,
      this.baseEyePos.z
    );

    const totalPitchRad =
      degToRad(this.basePitchDeg + this.lookPitchOffsetDeg) + hullPitch;
    const totalYawRad = degToRad(this.lookYawDeg);

    this._euler.set(totalPitchRad, totalYawRad, -hullRoll, 'YXZ');
    this.camera.quaternion.setFromEuler(this._euler);

    // Subtle FOV breathing during 2.75x Fast Forward
    const targetFov =
      oceanSim?.fastForward && sailingActive
        ? 59.5
        : GameConstants.DEFAULT_CAMERA_TOP_ALT_DEG + 14.0;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, 5.0 * dt);
      this.camera.updateProjectionMatrix();
    }
  }

  getSteeringNormalized() {
    return clamp(this.steerVelocityDegPerSec / this.maxSteerDegPerSec, -1.0, 1.0);
  }
}
