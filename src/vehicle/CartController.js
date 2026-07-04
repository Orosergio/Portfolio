import * as THREE from 'three'
import { clamp, damp } from '../util/math.js'

// Per-vehicle handling presets. The kart is a brisk cruiser; the UBike is
// slower but nimbler (tighter steering, deeper lean, smaller footprint).
export const VEHICLE_PRESETS = {
  kart: {
    maxSpeed: 11.5, accel: 19, reverseMax: 5.0, drag: 1.25, roll: 6,
    steerRate: 2.7, radius: 1.05, wheelR: 0.44, lean: 0.5, bob: 0.012, idle: 0.004,
  },
  bike: {
    maxSpeed: 8.2, accel: 13, reverseMax: 2.2, drag: 1.1, roll: 4.5,
    steerRate: 3.4, radius: 0.55, wheelR: 0.46, lean: 1.05, bob: 0.004, idle: 0.0015,
  },
}

// Arcade kinematic driving — no physics engine. Frame-rate-independent (dt).
// Drives whichever vehicle mesh is active; setVehicle() swaps mesh + preset
// while keeping position/heading/momentum.
export class CartController {
  constructor(cart, { bounds, obstacles, spawn, preset = 'kart', reduced = false }) {
    this.cart = cart
    this.bounds = bounds
    this.obstacles = obstacles || []
    this.reduced = reduced // prefers-reduced-motion: no idle bob
    this.bumped = false    // true on frames where we hit a wall (feedback hook)
    this.pos = new THREE.Vector2(spawn.x, spawn.z) // (x, z)
    this.heading = spawn.heading
    this.speed = 0
    this.steerVis = 0
    // juice state
    this.t = 0
    this.accelEst = 0
    this.bankVis = 0
    this.pitchVis = 0
    this.bank = 0            // lateral signal exposed to the camera

    this.setPreset(preset)
    this._apply(0)
  }

  setPreset(name) {
    const p = VEHICLE_PRESETS[name] || VEHICLE_PRESETS.kart
    this.presetName = name
    Object.assign(this, p)
  }

  // Swap the driven mesh (kart ↔ bike) in place: the new vehicle appears at
  // the same spot/heading; momentum is clamped to the new top speed.
  setVehicle(mesh, presetName) {
    // reset the old chassis pose so it parks cleanly
    const old = this.cart.userData
    if (old.body) { old.body.rotation.set(0, 0, 0); old.body.position.y = 0 }
    this.cart = mesh
    this.setPreset(presetName)
    this.speed = clamp(this.speed, -this.reverseMax, this.maxSpeed)
    this._apply(0)
  }

  update(dt, input) {
    this.bumped = false
    const throttle = clamp(input.throttle, -1, 1)
    const steer = clamp(input.steer, -1, 1)
    const prevSpeed = this.speed

    // longitudinal accel (reverse is weaker)
    if (throttle > 0) this.speed += this.accel * throttle * dt
    else if (throttle < 0) this.speed += this.accel * throttle * dt * 0.7

    // drag + coast-to-stop rolling resistance
    this.speed -= this.speed * this.drag * dt
    if (Math.abs(throttle) < 0.05) {
      const f = this.roll * dt
      this.speed = this.speed > 0 ? Math.max(0, this.speed - f) : Math.min(0, this.speed + f)
    }
    this.speed = clamp(this.speed, -this.reverseMax, this.maxSpeed)

    // steering scaled by speed (no pirouettes when stopped); reverse inverts
    const speedFactor = clamp(Math.abs(this.speed) / 3, 0, 1)
    const dir = this.speed >= 0 ? 1 : -1
    this.heading -= steer * this.steerRate * dt * speedFactor * dir

    // integrate on the ground plane
    this.pos.x += Math.sin(this.heading) * this.speed * dt
    this.pos.y += Math.cos(this.heading) * this.speed * dt

    // soft city bounds — bump and bleed speed, never drive into the void
    const b = this.bounds
    let bumped = false
    if (this.pos.x < b.min) { this.pos.x = b.min; bumped = true }
    if (this.pos.x > b.max) { this.pos.x = b.max; bumped = true }
    if (this.pos.y < b.min) { this.pos.y = b.min; bumped = true }
    if (this.pos.y > b.max) { this.pos.y = b.max; bumped = true }
    if (bumped) { this.speed *= 0.4; this.bumped = true }

    this._collide()

    this.accelEst = dt > 1e-4 ? (this.speed - prevSpeed) / dt : 0
    this.steerVis = damp(this.steerVis, steer * 0.5, 10, dt)
    this._apply(dt)
  }

  // Circle (cart) vs AABB (building) push-out, only for nearby obstacles.
  _collide() {
    const r = this.radius
    for (const o of this.obstacles) {
      const dx = this.pos.x - o.x, dz = this.pos.y - o.z
      const adx = Math.abs(dx), adz = Math.abs(dz)
      if (adx > o.hw + r || adz > o.hd + r) continue
      const px = o.hw + r - adx
      const pz = o.hd + r - adz
      if (px < pz) this.pos.x += (dx >= 0 ? 1 : -1) * px
      else this.pos.y += (dz >= 0 ? 1 : -1) * pz
      // gentle bump: bleed a little speed, keep momentum so walls feel
      // slideable rather than sticky (was 0.5 — jarring on every graze)
      this.speed *= 0.78
      this.bumped = true
    }
  }

  _apply(dt) {
    this.t += dt
    this.cart.position.set(this.pos.x, 0, this.pos.y)
    this.cart.rotation.y = this.heading
    const ud = this.cart.userData
    if (ud.wheels) {
      const roll = (this.speed * dt) / (ud.wheelR || this.wheelR)
      for (const w of ud.wheels) w.rotation.x += roll
    }
    if (ud.steer) ud.steer.rotation.y = -this.steerVis

    // ── chassis juice: lean into turns, squat on accel, dip on brake, idle bob ──
    const speedFactor = clamp(Math.abs(this.speed) / this.maxSpeed, 0, 1)
    const dir = this.speed >= 0 ? 1 : -1
    this.bank = this.steerVis * speedFactor * dir
    const bankTarget = this.bank * this.lean                            // roll the body outward
    const pitchTarget = clamp(-this.accelEst * 0.006, -0.07, 0.07)      // squat/dip
    this.bankVis = damp(this.bankVis, bankTarget, 9, dt)
    this.pitchVis = damp(this.pitchVis, pitchTarget, 7, dt)
    if (ud.body) {
      ud.body.rotation.z = this.bankVis
      ud.body.rotation.x = this.pitchVis
      // engine idle at rest (slower, tiny) blending into road bob at speed —
      // a perfectly frozen vehicle reads as dead when you stop to look around
      const idleAmp = this.reduced ? 0 : this.idle
      ud.body.position.y = Math.sin(this.t * (9 + 14 * speedFactor)) * (idleAmp + this.bob * speedFactor)
    }
  }

  get position() { return this.cart.position }
}
