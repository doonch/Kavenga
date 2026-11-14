/**
 * First-person navigator camera & steering controller for Kavenga: Songs of the Star Path.
 * - Default framing: ~78% sky dome & horizon (0..42 deg altitude), ~22% twin prows, deck & swell.
 * - Trim-Lock Steering: A/D or Left/Right smoothly turns the steering sweep and locks on release.
 * - 360 deg Free-Look: pointer drag or IJKL rotates gaze -180..+180 deg yaw and -24..+90 deg pitch
 *   (including 180 deg astern wake checks and +90 deg masthead zenith checks), snapping back smoothly.
 */

import * as THREE from 'three';
import { GameConstants, degToRad, wrapDeg180 } from '../core/gameConstants.js';

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
    this.vigilEyePos = new THREE.Vector3(0.0, 2.15, 0.0);
    this.basePitchDeg = 13.5;

    // 3rd-person behind-and-above chase view (frames canoe in bottom ~30% & sky across upper ~70%)
    this.thirdPersonMode = false;
    this.thirdPersonBlend = 0.0;
    this.thirdPersonDist = 20.6;
    this.thirdPersonHeight = 4.55;
    this.thirdPersonPitchDeg = 11.8;

    // Gaze offsets relative to canoe forward (-Z) or Star-Stone Ring center
    this.lookYawDeg = 0.0;
    this.lookPitchOffsetDeg = 0.0;
    this.isDraggingLook = false;
    this.freeLookPinned = false; // If toggled via HUD button, holds gaze until recentered
    this.vigilMode = false; // Grounded ashore mode: zero boat motion, gaze stays parked where aimed
    this._panTarget = null; // { yawDeg, pitchOffsetDeg } for smooth Master-guided pans
    this._lastPointer = { x: 0, y: 0 };

    // Steering velocity (deg/sec)
    this.steerVelocityDegPerSec = 0.0;
    this.maxSteerDegPerSec = 24.0;
    this.keysDown = new Set();

    // Landfall arrival pullback camera state (backward +Z & upward +Y framing canoe + island)
    this._landfallActive = false;
    this._landfallStartPos = new THREE.Vector3(0.0, 2.38, 3.45);
    this._landfallStartQuat = new THREE.Quaternion();
    this._landfallStartFov = 56.0;
    this._landfallEndPos = new THREE.Vector3(-8.5, 21.5, 17.5);
    this._landfallLookStart = new THREE.Vector3(0.0, 4.5, -36.0);
    this._landfallLookEnd = new THREE.Vector3(0.0, 15.5, -48.0);
    this._landfallCurLook = new THREE.Vector3();
    this._landfallLookMat = new THREE.Matrix4();
    this._landfallTargetQuat = new THREE.Quaternion();

    // Island launch departure camera state (bird's-eye over island & departing canoe -> 1st-person view)
    this._launchActive = false;
    this._launchCanoeStartZ = 24.0;
    this._launchP0 = new THREE.Vector3(7.5, 126.0, 64.0);
    this._launchP1 = new THREE.Vector3(2.2, 16.5, 29.5);
    this._launchP2 = new THREE.Vector3(0.0, 2.38, 3.45);
    this._launchLookStart = new THREE.Vector3(0.0, 1.2, 46.0);
    this._launchCurLook = new THREE.Vector3();
    this._launchLookMat = new THREE.Matrix4();
    this._launchLookQuat = new THREE.Quaternion();
    this._launchEndQuat = new THREE.Quaternion();

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
      } else if (
        e.code === 'KeyV' &&
        !e.repeat &&
        !this.vigilMode &&
        !this._landfallActive &&
        !this._launchActive
      ) {
        this.toggleThirdPersonView();
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
      this._panTarget = null;
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

  toggleThirdPersonView() {
    this.thirdPersonMode = !this.thirdPersonMode;
    return this.thirdPersonMode;
  }

  setThirdPersonView(enabled, instant = false) {
    this.thirdPersonMode = Boolean(enabled);
    if (instant) {
      this.thirdPersonBlend = this.thirdPersonMode ? 1.0 : 0.0;
    }
  }

  isThirdPersonView() {
    return this.thirdPersonMode;
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
    if (this.vigilMode) {
      this._panTarget = { yawDeg: 0.0, pitchOffsetDeg: 2.5 };
    } else {
      this._panTarget = null;
    }
  }

  setVigilMode(enabled) {
    this.vigilMode = Boolean(enabled);
    this.steerVelocityDegPerSec = 0.0;
    this.isDraggingLook = false;
    this._panTarget = null;
    if (this.vigilMode) {
      this.thirdPersonMode = false;
      this.thirdPersonBlend = 0.0;
    } else {
      this.freeLookPinned = false;
      this.lookYawDeg = 0.0;
      this.lookPitchOffsetDeg = 0.0;
    }
  }

  /**
   * Smoothly turns the camera to frame a world (altDeg, azDeg) direction.
   */
  panToAltAz(altDeg, azDeg, headingDeg = 0.0) {
    const relAzDeg = azDeg - headingDeg;
    const targetYawDeg = wrapDeg180(-relAzDeg);
    const clampedAlt = clamp(altDeg, -18.0, 89.5);
    const targetPitchOffsetDeg = clamp(
      clampedAlt - this.basePitchDeg,
      -37.5,
      90.0 - this.basePitchDeg
    );
    this._panTarget = {
      yawDeg: targetYawDeg,
      pitchOffsetDeg: targetPitchOffsetDeg,
    };
  }

  /**
   * Returns unit world-space gaze vector of the camera center.
   */
  getGazeWorldDir(outVec = new THREE.Vector3()) {
    return this.camera.getWorldDirection(outVec);
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
   * Captures current live navigator eye pose at t=0 of landfall so the backward/upward
   * pullback starts seamlessly without any orientation or position snap.
   */
  startLandfallCamera() {
    this._landfallActive = true;
    this._landfallStartPos.copy(this.camera.position);
    this._landfallStartQuat.copy(this.camera.quaternion);
    this._landfallStartFov = this.camera.fov;
    this.steerVelocityDegPerSec = 0.0;
    this.isDraggingLook = false;
    this._panTarget = null;
  }

  resetLandfallCamera() {
    this._landfallActive = false;
    this.lookYawDeg = 0.0;
    this.lookPitchOffsetDeg = 0.0;
    this.camera.fov = GameConstants.DEFAULT_CAMERA_TOP_ALT_DEG + 14.0;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Configures the bird's-eye departure camera high above the origin island & reef pass,
   * framing the entire sculpted island and departing canoe before swooping into 1st-person view.
   */
  startLaunchCamera(startIslandZ = 70.0, canoeStartZ = 24.0) {
    this._launchActive = true;
    this._launchCanoeStartZ = canoeStartZ;
    this.thirdPersonMode = false;
    this.thirdPersonBlend = 0.0;
    this.steerVelocityDegPerSec = 0.0;
    this.isDraggingLook = false;
    this.freeLookPinned = false;
    this._panTarget = null;
    this.lookYawDeg = 0.0;
    this.lookPitchOffsetDeg = 0.0;

    const startHeight = 122.0 + Math.max(0.0, startIslandZ - 62.0) * 1.15;
    this._launchP0.set(7.5, startHeight, startIslandZ - 6.0);
    this._launchP1.set(2.2, 16.5, canoeStartZ + 5.5);
    this._launchLookStart.set(
      0.0,
      1.2,
      0.5 * (startIslandZ + canoeStartZ) - 1.0
    );
  }

  resetLaunchCamera() {
    this._launchActive = false;
  }

  /**
   * Updates steering input, camera gaze spring-back, and couples camera subtly to hull heave/pitch/roll.
   */
  update(
    dtSec,
    oceanSim,
    sailingActive = true,
    landfallAnim = null,
    launchAnim = null
  ) {
    const dt = Math.min(0.1, Math.max(0.001, dtSec));

    if (landfallAnim?.active) {
      if (!this._landfallActive) {
        this.startLandfallCamera();
      }
      this.steerVelocityDegPerSec = 0.0;

      const rawT = clamp(landfallAnim.rawT ?? 0.0, 0.0, 1.0);
      const smoothT = rawT * rawT * (3.0 - 2.0 * rawT);
      const easeOutT = 1.0 - Math.pow(1.0 - rawT, 3.0);
      const posT = 0.35 * smoothT + 0.65 * easeOutT;

      this.camera.position.lerpVectors(
        this._landfallStartPos,
        this._landfallEndPos,
        posT
      );

      this._landfallCurLook.lerpVectors(
        this._landfallLookStart,
        this._landfallLookEnd,
        posT
      );
      this._landfallLookMat.lookAt(
        this.camera.position,
        this._landfallCurLook,
        THREE.Object3D.DEFAULT_UP
      );
      this._landfallTargetQuat.setFromRotationMatrix(this._landfallLookMat);

      const slerpU = clamp(rawT / 0.55, 0.0, 1.0);
      const slerpT = slerpU * slerpU * (3.0 - 2.0 * slerpU);
      this.camera.quaternion.slerpQuaternions(
        this._landfallStartQuat,
        this._landfallTargetQuat,
        slerpT
      );

      const targetFov =
        this._landfallStartFov + (62.0 - this._landfallStartFov) * posT;
      if (Math.abs(this.camera.fov - targetFov) > 0.01) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
      this.camera.updateMatrixWorld();
      return;
    }

    if (this._landfallActive) {
      this._landfallActive = false;
    }

    if (launchAnim?.active) {
      if (!this._launchActive) {
        this.startLaunchCamera(
          launchAnim.startIslandZ ?? 70.0,
          launchAnim.canoeStartZ ?? 24.0
        );
      }
      this.steerVelocityDegPerSec = 0.0;

      const hull = oceanSim?.hullState;
      const heave = hull ? hull.heaveM * 0.85 : 0.0;
      const hullPitch = hull ? hull.pitchRad * 0.42 : 0.0;
      const hullRoll = hull ? hull.rollRad * 0.38 : 0.0;

      this._launchP2.set(
        this.baseEyePos.x - (hull ? hull.rollRad * 1.1 : 0.0),
        this.baseEyePos.y + heave,
        this.baseEyePos.z
      );
      this._euler.set(
        degToRad(this.basePitchDeg) + hullPitch,
        0.0,
        -hullRoll,
        'YXZ'
      );
      this._launchEndQuat.setFromEuler(this._euler);

      const rawT = clamp(launchAnim.rawT ?? 0.0, 0.0, 1.0);
      const u = rawT * rawT * (3.0 - 2.0 * rawT);
      const oneMinusU = 1.0 - u;
      const w0 = oneMinusU * oneMinusU;
      const w1 = 2.0 * oneMinusU * u;
      const w2 = u * u;

      this.camera.position.set(
        w0 * this._launchP0.x + w1 * this._launchP1.x + w2 * this._launchP2.x,
        w0 * this._launchP0.y + w1 * this._launchP1.y + w2 * this._launchP2.y,
        w0 * this._launchP0.z + w1 * this._launchP1.z + w2 * this._launchP2.z
      );

      const curCanoeZ =
        launchAnim.curCanoeZ ??
        this._launchCanoeStartZ * (1.0 - (launchAnim.glide ?? u));
      const lookTrackU = clamp(rawT / 0.78, 0.0, 1.0);
      const lookSmooth = lookTrackU * lookTrackU * (3.0 - 2.0 * lookTrackU);
      this._launchCurLook.set(
        0.0,
        1.2 + 1.2 * lookSmooth,
        this._launchLookStart.z +
          (curCanoeZ - 14.0 - this._launchLookStart.z) * lookSmooth
      );
      this._launchLookMat.lookAt(
        this.camera.position,
        this._launchCurLook,
        THREE.Object3D.DEFAULT_UP
      );
      this._launchLookQuat.setFromRotationMatrix(this._launchLookMat);

      const slerpU = clamp((rawT - 0.5) / 0.5, 0.0, 1.0);
      const slerpT = slerpU * slerpU * (3.0 - 2.0 * slerpU);
      this.camera.quaternion.slerpQuaternions(
        this._launchLookQuat,
        this._launchEndQuat,
        slerpT
      );

      const baseFov = GameConstants.DEFAULT_CAMERA_TOP_ALT_DEG + 14.0;
      const targetFov = 64.0 + (baseFov - 64.0) * u;
      if (Math.abs(this.camera.fov - targetFov) > 0.01) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
      this.camera.updateMatrixWorld();
      return;
    }

    if (this._launchActive) {
      this._launchActive = false;
    }

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

    // 2. Keyboard Free-Look (I/J/K/L at sea; also W/A/S/D & Arrow keys in grounded Star-Stone Vigil)
    let keyLookActive = false;
    if (sailingActive || this.vigilMode) {
      const keyLookSpeed = 85.0 * dt;
      const leftKey =
        this.keysDown.has('KeyJ') ||
        (this.vigilMode && (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')));
      const rightKey =
        this.keysDown.has('KeyL') ||
        (this.vigilMode && (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')));
      const upKey =
        this.keysDown.has('KeyI') ||
        (this.vigilMode && (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')));
      const downKey =
        this.keysDown.has('KeyK') ||
        (this.vigilMode && (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')));

      if (leftKey) {
        this.lookYawDeg += keyLookSpeed;
        keyLookActive = true;
      }
      if (rightKey) {
        this.lookYawDeg -= keyLookSpeed;
        keyLookActive = true;
      }
      if (upKey) {
        this.lookPitchOffsetDeg = clamp(
          this.lookPitchOffsetDeg + keyLookSpeed,
          -37.5,
          90.0 - this.basePitchDeg
        );
        keyLookActive = true;
      }
      if (downKey) {
        this.lookPitchOffsetDeg = clamp(
          this.lookPitchOffsetDeg - keyLookSpeed,
          -37.5,
          90.0 - this.basePitchDeg
        );
        keyLookActive = true;
      }
      if (keyLookActive) {
        this._panTarget = null;
      }
      this.lookYawDeg = wrapDeg180(this.lookYawDeg);
    }

    // Smooth Master-guided pan when requested in Star-Stone Vigil
    if (this._panTarget && !this.isDraggingLook && !keyLookActive) {
      const panRate = Math.min(1.0, 5.4 * dt);
      const dYaw = wrapDeg180(this._panTarget.yawDeg - this.lookYawDeg);
      const dPitch = this._panTarget.pitchOffsetDeg - this.lookPitchOffsetDeg;
      this.lookYawDeg = wrapDeg180(this.lookYawDeg + dYaw * panRate);
      this.lookPitchOffsetDeg = clamp(
        this.lookPitchOffsetDeg + dPitch * panRate,
        -37.5,
        90.0 - this.basePitchDeg
      );
      if (Math.abs(dYaw) < 0.2 && Math.abs(dPitch) < 0.2) {
        this.lookYawDeg = this._panTarget.yawDeg;
        this.lookPitchOffsetDeg = this._panTarget.pitchOffsetDeg;
        this._panTarget = null;
      }
    } else if (
      !this.vigilMode &&
      !this.isDraggingLook &&
      !this.freeLookPinned &&
      !keyLookActive
    ) {
      // Smooth snap-back to dead-ahead between twin prows when released at sea and not pinned
      const spring = Math.min(1.0, 6.2 * dt);
      this.lookYawDeg *= 1.0 - spring;
      this.lookPitchOffsetDeg *= 1.0 - spring;
      if (Math.abs(this.lookYawDeg) < 0.05) this.lookYawDeg = 0.0;
      if (Math.abs(this.lookPitchOffsetDeg) < 0.05) this.lookPitchOffsetDeg = 0.0;
    }

    // Smoothly transition between 1st-person navigator bench (0) and 3rd-person behind-canoe view (1)
    const tpTarget = !this.vigilMode && this.thirdPersonMode ? 1.0 : 0.0;
    if (Math.abs(this.thirdPersonBlend - tpTarget) > 0.001) {
      this.thirdPersonBlend +=
        (tpTarget - this.thirdPersonBlend) * Math.min(1.0, 5.8 * dt);
      if (Math.abs(this.thirdPersonBlend - tpTarget) <= 0.002) {
        this.thirdPersonBlend = tpTarget;
      }
    }
    const tpEase =
      this.thirdPersonBlend *
      this.thirdPersonBlend *
      (3.0 - 2.0 * this.thirdPersonBlend);

    // 3. Position & Orientation: completely motionless ashore in Star-Stone Vigil; coupled to hull at sea
    if (this.vigilMode) {
      this.camera.position.copy(this.vigilEyePos);
      const totalPitchRad = degToRad(this.basePitchDeg + this.lookPitchOffsetDeg);
      const totalYawRad = degToRad(this.lookYawDeg);
      this._euler.set(totalPitchRad, totalYawRad, 0.0, 'YXZ');
      this.camera.quaternion.setFromEuler(this._euler);
    } else {
      const hull = oceanSim?.hullState;
      const heave = hull ? hull.heaveM * 0.85 : 0.0;
      const hullPitch = hull ? hull.pitchRad * 0.42 : 0.0;
      const hullRoll = hull ? hull.rollRad * 0.38 : 0.0;

      const totalYawRad = degToRad(this.lookYawDeg);

      // 1st-person navigator bench vs 3rd-person behind-and-above chase orbit
      const fpX = this.baseEyePos.x - (hull ? hull.rollRad * 1.1 : 0.0);
      const fpY = this.baseEyePos.y + heave;
      const fpZ = this.baseEyePos.z;

      const tpX =
        Math.sin(totalYawRad) * this.thirdPersonDist -
        (hull ? hull.rollRad * 0.22 : 0.0);
      const tpY = this.thirdPersonHeight + (hull ? hull.heaveM * 0.2 : 0.0);
      const tpZ = Math.cos(totalYawRad) * this.thirdPersonDist;

      this.camera.position.set(
        fpX + (tpX - fpX) * tpEase,
        fpY + (tpY - fpY) * tpEase,
        fpZ + (tpZ - fpZ) * tpEase
      );

      const activeBasePitchDeg =
        this.basePitchDeg + (this.thirdPersonPitchDeg - this.basePitchDeg) * tpEase;
      const motionCoupling = 1.0 - 0.82 * tpEase;
      const totalPitchRad =
        degToRad(activeBasePitchDeg + this.lookPitchOffsetDeg) +
        hullPitch * motionCoupling;

      this._euler.set(totalPitchRad, totalYawRad, -hullRoll * motionCoupling, 'YXZ');
      this.camera.quaternion.setFromEuler(this._euler);
    }

    // Subtle FOV breathing during 2.75x Fast Forward & 3rd-person framing
    const baseViewFov =
      GameConstants.DEFAULT_CAMERA_TOP_ALT_DEG + 14.0 + 2.0 * tpEase;
    const targetFov =
      oceanSim?.fastForward && sailingActive ? baseViewFov + 3.5 : baseViewFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, 5.0 * dt);
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }

  getSteeringNormalized() {
    return clamp(this.steerVelocityDegPerSec / this.maxSteerDegPerSec, -1.0, 1.0);
  }
}
