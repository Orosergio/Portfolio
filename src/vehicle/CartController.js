import * as THREE from 'three'
import { clamp, damp } from '../util/math.js'

// Arcade kinematic driving — no physics engine. Frame-rate-independent (dt).
export class CartController {
  constructor(cart, { bounds, obstacles, spawn }) {
    this.cart = cart
    this.bounds = bounds
    this.obstacles = obstacles || []
    this.pos = new THREE.Vector2(spawn.x, spawn.z) // (x, z)
    this.heading = spawn.heading
    this.speed = 0
    this.steerVis = 0
    this.radius = 1.05       // tuned for the smaller cart

    // tuning (compact map → calmer top speed, more agile steering)
    this.maxSpeed = 13
    this.accel = 21
    this.reverseMax = 5.5
    this.drag = 1.3          // proportional air drag
    this.roll = 6           // rolling resistance when coasting
    this.steerRate = 2.55

    this._apply(0)
  }

  update(dt, input) {
    const throttle = clamp(input.throttle, -1, 1)
    const steer = clamp(input.steer, -1, 1)

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
    if (bumped) this.speed *= 0.4

    this._collide()

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
      this.speed *= 0.5
    }
  }

  _apply(dt) {
    this.cart.position.set(this.pos.x, 0, this.pos.y)
    this.cart.rotation.y = this.heading
    const ud = this.cart.userData
    if (ud.wheels) {
      const roll = (this.speed * dt) / 0.44
      for (const w of ud.wheels) w.rotation.x += roll
    }
    if (ud.steer) ud.steer.rotation.y = -this.steerVis
  }

  get position() { return this.cart.position }
}
