import { palette } from '../world/palette.js'

// A small north-up GTA-style minimap of the two-district island: ring road,
// grand avenue, plaza, aprons/parks, and one dot per project landmark. Dots
// hollow out once visited; the current guide target pulses. Static layers
// are pre-rendered once; per-frame work is one blit + cart marker + pulse.
const S = 160

export class Minimap {
  constructor(container, data, { onProjectClick } = {}) {
    this.data = data
    this.visited = new Set()
    this.targetId = null
    const wrap = document.createElement('div')
    wrap.className = 'minimap'
    const cv = document.createElement('canvas')
    cv.width = S; cv.height = S
    cv.setAttribute('aria-hidden', 'true') // decorative: the tracker buttons carry the same info
    wrap.appendChild(cv)
    container.appendChild(wrap)
    this.ctx = cv.getContext('2d')

    // tap a project dot on the map → same behavior as tapping its tracker dot
    if (onProjectClick) {
      cv.addEventListener('click', (e) => {
        const r = cv.getBoundingClientRect()
        const mx = ((e.clientX - r.left) / r.width) * S
        const mz = ((e.clientY - r.top) / r.height) * S
        // hit radius fixed in CSS px (the touch layout shrinks the map to
        // 104px, which would shrink a logical-px radius below tappable size)
        let best = null, bd = 14 * (S / r.width)
        for (const pr of this.data.projects) {
          const d = Math.hypot(this._p(pr.x) - mx, this._p(pr.z) - mz)
          if (d < bd) { bd = d; best = pr }
        }
        if (best) onProjectClick(best.id)
      })
    }

    // pre-render static base
    this.base = document.createElement('canvas')
    this.base.width = S; this.base.height = S
    this._drawBase(this.base.getContext('2d'))
  }

  _p(v) { return ((v + this.data.half) / (this.data.half * 2)) * S }
  _s(v) { return (v / (this.data.half * 2)) * S }

  setState(visited, targetId) { this.visited = visited; this.targetId = targetId; this._drawBase(this.base.getContext('2d')) }

  _drawBase(x) {
    const d = this.data
    x.clearRect(0, 0, S, S)
    // ground, washed darker than the world so warm project dots keep contrast
    x.fillStyle = palette.ground
    x.fillRect(0, 0, S, S)
    x.fillStyle = 'rgba(42,28,16,.16)'
    x.fillRect(0, 0, S, S)
    // sand aprons + parks
    for (const r of d.rects) {
      x.fillStyle = r.kind === 'park' ? palette.park : palette.sand
      x.fillRect(this._p(r.x - r.w / 2), this._p(r.z - r.d / 2), this._s(r.w), this._s(r.d))
    }
    // roads
    x.strokeStyle = palette.road
    x.lineCap = 'butt'
    // ring
    x.lineWidth = this._s(d.ring.w)
    x.strokeRect(this._p(-d.ring.hx), this._p(-d.ring.hz), this._s(d.ring.hx * 2), this._s(d.ring.hz * 2))
    // grand avenue (full N-S) + east-west avenue
    x.lineWidth = this._s(d.avenueW)
    x.beginPath()
    x.moveTo(this._p(0), this._p(-27)); x.lineTo(this._p(0), this._p(27))
    x.stroke()
    x.lineWidth = this._s(5)
    x.beginPath()
    x.moveTo(this._p(-d.ring.hx), this._p(0)); x.lineTo(this._p(d.ring.hx), this._p(0))
    x.stroke()
    // plaza medallion
    x.fillStyle = palette.plaza
    x.beginPath(); x.arc(this._p(0), this._p(0), this._s(d.plazaR), 0, Math.PI * 2); x.fill()
    x.fillStyle = palette.accFillTeal
    x.beginPath(); x.arc(this._p(0), this._p(0), this._s(1.6), 0, Math.PI * 2); x.fill()
    // project dots (hollow ring once visited)
    for (const pr of d.projects) {
      const px = this._p(pr.x), pz = this._p(pr.z)
      x.beginPath(); x.arc(px, pz, 4.5, 0, Math.PI * 2)
      if (this.visited.has(pr.id)) {
        x.fillStyle = 'rgba(255,255,255,.9)'; x.fill()
        x.lineWidth = 2.5; x.strokeStyle = pr.color; x.stroke()
      } else {
        // dark ink ring: a white ring left the gold/coral accents iso-luminant
        // with the warm map base — the dots' color identity vanished
        x.fillStyle = pr.color; x.fill()
        x.lineWidth = 2; x.strokeStyle = 'rgba(42,28,16,.85)'; x.stroke()
      }
    }
    // compass
    x.font = '700 10px system-ui, sans-serif'
    x.textAlign = 'center'
    x.fillStyle = 'rgba(42,28,16,.55)'
    x.beginPath(); x.arc(S - 12, 12, 8, 0, Math.PI * 2); x.fill()
    x.fillStyle = '#ffeed2'
    x.fillText('N', S - 12, 15.5)
  }

  // cart: { x, z, heading } · t: seconds (drives the target pulse)
  update(cart, t = 0) {
    const x = this.ctx
    x.clearRect(0, 0, S, S)
    x.drawImage(this.base, 0, 0)
    // guide-target pulse
    if (this.targetId) {
      const pr = this.data.projects.find((p) => p.id === this.targetId)
      if (pr) {
        const r = 6 + (Math.sin(t * 4) * 0.5 + 0.5) * 4
        x.beginPath(); x.arc(this._p(pr.x), this._p(pr.z), r, 0, Math.PI * 2)
        x.lineWidth = 2; x.strokeStyle = pr.color; x.globalAlpha = 0.85; x.stroke(); x.globalAlpha = 1
      }
    }
    const px = this._p(cart.x), pz = this._p(cart.z)
    x.save()
    x.translate(px, pz)
    x.rotate(Math.PI - cart.heading)
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(0, 3); x.lineTo(-5, 6); x.closePath()
    x.fillStyle = palette.cartAccent
    x.fill()
    x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke()
    x.restore()
  }
}
