import { palette } from '../world/palette.js'

// A small north-up GTA-style minimap: parks, roads, project dots, landmark
// icons, and a rotating cart marker. Static layers are pre-rendered once.
const S = 150

export class Minimap {
  constructor(container, data) {
    this.data = data
    const wrap = document.createElement('div')
    wrap.className = 'minimap'
    const cv = document.createElement('canvas')
    cv.width = S; cv.height = S
    wrap.appendChild(cv)
    container.appendChild(wrap)
    this.ctx = cv.getContext('2d')

    // pre-render static base
    this.base = document.createElement('canvas')
    this.base.width = S; this.base.height = S
    this._drawBase(this.base.getContext('2d'))
  }

  _p(v) { return ((v + this.data.half) / (this.data.half * 2)) * S }

  _drawBase(x) {
    const d = this.data
    // ground
    x.fillStyle = palette.ground
    x.fillRect(0, 0, S, S)
    // parks
    x.fillStyle = palette.park
    for (const pk of d.parks) {
      const px = this._p(pk.x - pk.w / 2), pz = this._p(pk.z - pk.d / 2)
      x.fillRect(px, pz, (pk.w / (d.half * 2)) * S, (pk.d / (d.half * 2)) * S)
    }
    // roads
    x.strokeStyle = palette.road
    x.lineWidth = (4.4 / (d.half * 2)) * S
    x.lineCap = 'butt'
    x.beginPath()
    for (const c of d.roadLines) {
      const p = this._p(c)
      x.moveTo(p, 0); x.lineTo(p, S)
      x.moveTo(0, p); x.lineTo(S, p)
    }
    x.stroke()
    // landmarks
    for (const lm of d.landmarks) {
      const px = this._p(lm.x), pz = this._p(lm.z)
      if (lm.kind === 'tower') {
        x.fillStyle = lm.color
        x.beginPath(); x.moveTo(px, pz - 6); x.lineTo(px + 5, pz + 5); x.lineTo(px - 5, pz + 5); x.closePath(); x.fill()
      } else { // market
        x.fillStyle = lm.color
        x.fillRect(px - 4, pz - 4, 8, 8)
      }
    }
    // project dots
    for (const pr of d.projects) {
      const px = this._p(pr.x), pz = this._p(pr.z)
      x.beginPath(); x.arc(px, pz, 4, 0, Math.PI * 2)
      x.fillStyle = pr.color; x.fill()
      x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke()
    }
  }

  // cart: { x, z, heading }
  update(cart) {
    const x = this.ctx
    x.clearRect(0, 0, S, S)
    x.drawImage(this.base, 0, 0)
    const px = this._p(cart.x), pz = this._p(cart.z)
    x.save()
    x.translate(px, pz)
    x.rotate(Math.PI - cart.heading)
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(0, 3); x.lineTo(-5, 6); x.closePath()
    x.fillStyle = palette.cartAccent
    x.fill()
    x.lineWidth = 1.5; x.strokeStyle = '#fff'; x.stroke()
    x.restore()
  }
}
