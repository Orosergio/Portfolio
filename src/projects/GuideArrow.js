import * as THREE from 'three'
import { damp } from '../util/math.js'

// ── Floating guide chevron ───────────────────────────────────────────────
// Hovers above the kart pointing at the current guide target (next unvisited
// project, or whichever dot the visitor taps in the tracker). Takes the
// target's accent color so the arrow and the tracker dot read as one system.
export class GuideArrow {
  constructor(scene) {
    const geo = new THREE.ConeGeometry(0.34, 0.95, 4)
    geo.rotateX(Math.PI / 2) // point along +z, flat diamond profile
    geo.rotateZ(Math.PI / 4)
    this.mat = new THREE.MeshStandardMaterial({
      color: '#ffffff', flatShading: true, roughness: 0.4, metalness: 0,
      emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55,
      transparent: true, opacity: 0.95,
    })
    this.mesh = new THREE.Mesh(geo, this.mat)
    this.mesh.visible = false
    this.mesh.renderOrder = 3
    scene.add(this.mesh)
    this._angle = 0
    this._color = new THREE.Color('#ffffff')
    this._flash = 0
  }

  // Attention pulse: pressing T away from a landmark flashes the arrow so the
  // eye is pulled to the navigation aid.
  flash() { this._flash = 1 }

  setColor(hex) {
    this._color.set(hex)
    this.mat.color.copy(this._color)
    this.mat.emissive.copy(this._color)
  }

  // cartPos: Vector3 · target: {x, z} | null · hide when idle/near/covered
  update(dt, t, cartPos, target, hidden) {
    if (!target || hidden) { this.mesh.visible = false; return }
    const dx = target.x - cartPos.x, dz = target.z - cartPos.z
    const dist = Math.hypot(dx, dz)
    if (dist < 6.5) { this.mesh.visible = false; return } // arrived — tooltip takes over
    const want = Math.atan2(dx, dz)
    // shortest-arc damp so the arrow swings smoothly through ±π
    let diff = want - this._angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this._angle += damp(0, diff, 8, dt)
    this.mesh.visible = true
    this.mesh.position.set(
      cartPos.x + Math.sin(this._angle) * 1.9,
      2.5 + Math.sin(t * 2.4) * 0.14,
      cartPos.z + Math.cos(this._angle) * 1.9,
    )
    this.mesh.rotation.set(0, this._angle, 0)
    // gentle attention pulse (+ decaying flash boost)
    this._flash = Math.max(0, this._flash - dt * 1.4)
    this.mat.emissiveIntensity = 0.45 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3)) + this._flash * 0.9
  }
}
