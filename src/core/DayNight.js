import * as THREE from 'three'
import { palette } from '../world/palette.js'

const C = (h) => new THREE.Color(h)

// Smoothly blends the whole scene between day and night via a single nightT
// parameter (0 = day, 1 = night): lights, fog, exposure, sky gradient, and
// every material tagged with userData.nightE (windows, lanterns, neon, lamps).
export class DayNight {
  constructor({ scene, renderer, lights, body, onLabel }) {
    this.scene = scene; this.renderer = renderer; this.lights = lights
    this.body = body; this.onLabel = onLabel
    this.mode = 'day'
    this.nightT = 0
    this.target = 0
    this.dur = 0.9

    // precompute day/night color endpoints
    const d = palette.day, n = palette.night
    this.col = {
      hemiSky: [C(d.hemiSky), C(n.hemiSky)],
      hemiGround: [C(d.hemiGround), C(n.hemiGround)],
      sun: [C(d.sun), C(n.sun)],
      fog: [C(d.fog), C(n.fog)],
      skyTop: [C(d.skyTop), C(n.skyTop)],
      skyBottom: [C(d.skyBottom), C(n.skyBottom)],
    }
    this._tmp = new THREE.Color()

    // collect emissive materials once
    this.nightables = []
    scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : [])
      for (const m of mats) if (m && m.userData && m.userData.nightE != null) this.nightables.push(m)
    })

    this._apply(0)
  }

  toggle() {
    this.mode = this.mode === 'day' ? 'night' : 'day'
    this.target = this.mode === 'night' ? 1 : 0
    this.onLabel?.(this.mode)
    return this.mode
  }

  update(dt) {
    if (this.nightT === this.target) return
    const step = dt / this.dur
    if (this.nightT < this.target) this.nightT = Math.min(this.target, this.nightT + step)
    else this.nightT = Math.max(this.target, this.nightT - step)
    this._apply(this.nightT)
  }

  _hex(pair, t) { return this._tmp.copy(pair[0]).lerp(pair[1], t) }

  _apply(t) {
    const d = palette.day, n = palette.night
    const L = (a, b) => a + (b - a) * t
    const { hemi, sun, amb } = this.lights
    hemi.intensity = L(d.hemiI, n.hemiI)
    hemi.color.copy(this._hex(this.col.hemiSky, t))
    hemi.groundColor.copy(this._hex(this.col.hemiGround, t))
    sun.intensity = L(d.sunI, n.sunI)
    sun.color.copy(this._hex(this.col.sun, t))
    amb.intensity = L(d.ambI, n.ambI)
    this.scene.fog.color.copy(this._hex(this.col.fog, t))
    this.scene.fog.density = L(d.fogD, n.fogD)
    this.renderer.toneMappingExposure = L(d.exposure, n.exposure)
    for (const m of this.nightables) m.emissiveIntensity = L(m.userData.dayE, m.userData.nightE)
    const top = this._hex(this.col.skyTop, t).getStyle()
    const bot = this._hex(this.col.skyBottom, t).getStyle()
    this.body.style.background = `linear-gradient(180deg, ${top} 0%, ${bot} 100%)`
  }
}
