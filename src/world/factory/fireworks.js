import * as THREE from 'three'

// Celebration fireworks (all 8 projects visited): a few additive point-sprite
// bursts above the plaza. One InstancedBufferGeometry-free implementation —
// a single THREE.Points with per-particle velocity baked into attributes,
// animated on the CPU only while a show is running (zero cost otherwise).
const COLORS = ['#ffd27a', '#ff5a4d', '#25e0d0', '#ff3d8b', '#7cc0e6', '#ffb347']

export class Fireworks {
  constructor(scene, { count = 90, bursts = 5 } = {}) {
    this.bursts = []
    const geo = new THREE.BufferGeometry()
    this.count = count
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    this.mat = new THREE.PointsMaterial({
      size: 0.8, vertexColors: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    for (let i = 0; i < bursts; i++) {
      const points = new THREE.Points(geo.clone(), this.mat.clone())
      points.visible = false
      points.frustumCulled = false
      points.layers.set(1) // atmosphere layer: skip AO, glow via bloom
      scene.add(points)
      this.bursts.push({ points, vel: new Float32Array(count * 3), t0: -1, x: 0, y: 0, z: 0 })
    }
    this.active = false
  }

  // Launch a staged show around (x, z) — bursts pop one after another.
  show(x, z) {
    this.active = true
    this._pending = this.bursts.map((b, i) => ({ b, at: i * 0.55 }))
    this._t = 0
    this._cx = x
    this._cz = z
  }

  _ignite(b) {
    const { points, vel } = b
    const pos = points.geometry.attributes.position
    const col = points.geometry.attributes.color
    const c = new THREE.Color(COLORS[(Math.random() * COLORS.length) | 0])
    const c2 = new THREE.Color(COLORS[(Math.random() * COLORS.length) | 0])
    // low-ish bursts biased up-screen (-x/-z): the tilted 32° follow cam can't
    // see much above y≈9 near the player, so sky-high fireworks never show
    b.x = this._cx - 3 + (Math.random() - 0.5) * 12
    b.z = this._cz - 3 + (Math.random() - 0.5) * 12
    b.y = 5.5 + Math.random() * 2.5
    for (let i = 0; i < this.count; i++) {
      pos.setXYZ(i, 0, 0, 0)
      // spherical burst, slight upward bias
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const sp = 3.2 + Math.random() * 2.4
      vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp
      vel[i * 3 + 1] = Math.cos(ph) * sp + 0.8
      vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp
      const mix = Math.random()
      col.setXYZ(i,
        c.r * mix + c2.r * (1 - mix),
        c.g * mix + c2.g * (1 - mix),
        c.b * mix + c2.b * (1 - mix))
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    points.position.set(b.x, b.y, b.z)
    points.visible = true
    b.t0 = 0
  }

  // dt-driven; self-deactivates when the show ends.
  update(dt) {
    if (!this.active) return
    this._t += dt
    if (this._pending.length && this._t >= this._pending[0].at) {
      this._ignite(this._pending.shift().b)
    }
    let alive = this._pending.length > 0
    const LIFE = 1.9
    for (const b of this.bursts) {
      if (b.t0 < 0 || !b.points.visible) continue
      b.t0 += dt
      const k = b.t0 / LIFE
      if (k >= 1) { b.points.visible = false; b.t0 = -1; continue }
      alive = true
      const pos = b.points.geometry.attributes.position
      for (let i = 0; i < this.count; i++) {
        const drag = 1 - 0.72 * k
        pos.setXYZ(i,
          b.vel[i * 3] * b.t0 * drag,
          b.vel[i * 3 + 1] * b.t0 * drag - 2.4 * b.t0 * b.t0, // gravity sag
          b.vel[i * 3 + 2] * b.t0 * drag)
      }
      pos.needsUpdate = true
      b.points.material.opacity = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88
    }
    if (!alive) this.active = false
  }
}
