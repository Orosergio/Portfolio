import * as THREE from 'three'
import { dampVec3, damp } from '../util/math.js'

// Isometric-feel perspective rig: narrow FOV from a high tilted corner
// (azimuth 45°, elevation ~39°) => "tilt-shift toy model". Follows the cart
// with critically-damped smoothing; the world never rotates, only the cart.
export class IsoCamera {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(32, aspect, 1, 320)
    // higher, closer rig for the compact map so the (small) cart never blocks the view
    this.offset = new THREE.Vector3(19, 26, 19)
    this.cam.position.copy(this.offset)
    this.cam.lookAt(0, 0, 0)
    this._desired = new THREE.Vector3()
    this._look = new THREE.Vector3()
    this._lookSmooth = new THREE.Vector3()
    this.fovBase = 32
    this.rollVis = 0
  }

  // Snap instantly to a target (used once after world build, before fade-in).
  snapTo(target) {
    this._desired.set(target.x + this.offset.x, this.offset.y, target.z + this.offset.z)
    this.cam.position.copy(this._desired)
    this._look.copy(target); this._lookSmooth.copy(target)
    this.cam.lookAt(this._lookSmooth)
  }

  update(dt, target, heading, speed, bank = 0) {
    // look slightly ahead along the cart's heading for lead room
    this._look.set(target.x + Math.sin(heading) * 2.2, target.y + 0.6, target.z + Math.cos(heading) * 2.2)
    // dolly back a touch at speed for a sense of velocity
    const sf = Math.min(Math.abs(speed) / 14, 1)
    const k = 1 + sf * 0.07
    this._desired.set(target.x + this.offset.x * k, this.offset.y * k, target.z + this.offset.z * k)
    dampVec3(this.cam.position, this._desired, 4.5, dt)
    dampVec3(this._lookSmooth, this._look, 6, dt)
    this.cam.lookAt(this._lookSmooth)

    // speed-reactive FOV (subtle sense of velocity)
    const fovTarget = this.fovBase + sf * 3.0
    this.cam.fov = damp(this.cam.fov, fovTarget, 4, dt)
    this.cam.updateProjectionMatrix()
    // bank into turns — roll the camera a touch (lookAt above reset orientation, so no accumulation)
    this.rollVis = damp(this.rollVis, -bank * 0.05, 6, dt)
    this.cam.rotateZ(this.rollVis)
  }
}
