import * as THREE from 'three'

// ── Floating nameplate above each project landmark ──────────────────────
// A canvas sprite: dark pill + project title + accent underline. Always
// visible so visitors instantly learn "named landmark = a project to visit".
// Lives on layer 1 (atmosphere) so the GTAO pass ignores it — sprites have
// no usable depth/normals and would smear a dark AO rectangle otherwise.
export function makeNameplate(title, accent) {
  const pad = 26, fontPx = 46
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  ctx.font = `800 ${fontPx}px 'Inter Tight', system-ui, sans-serif`
  const tw = Math.ceil(ctx.measureText(title).width)
  c.width = tw + pad * 2
  c.height = 108
  const x = c.getContext('2d')

  // pill
  const r = 34, w = c.width, h = 76, y0 = 6
  x.fillStyle = 'rgba(30, 18, 10, 0.78)'
  x.beginPath()
  x.moveTo(r, y0); x.lineTo(w - r, y0); x.arc(w - r, y0 + r, r, -Math.PI / 2, Math.PI / 2)
  x.lineTo(r, y0 + h); x.arc(r, y0 + r, r, Math.PI / 2, Math.PI * 1.5)
  x.closePath(); x.fill()
  // title
  x.font = `800 ${fontPx}px 'Inter Tight', system-ui, sans-serif`
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillStyle = '#ffeed2'
  x.fillText(title, w / 2, y0 + h / 2 - 6)
  // accent underline
  x.fillStyle = accent
  x.beginPath()
  x.roundRect(w / 2 - tw / 2, y0 + h - 18, tw, 7, 3.5)
  x.fill()
  // pointer nib
  x.fillStyle = 'rgba(30, 18, 10, 0.78)'
  x.beginPath()
  x.moveTo(w / 2 - 12, y0 + h - 1); x.lineTo(w / 2 + 12, y0 + h - 1); x.lineTo(w / 2, y0 + h + 16)
  x.closePath(); x.fill()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false,
  }))
  // world scale: ~0.0175 u per canvas px keeps plates readable but modest
  const S = 0.00022 // stable screen size: no giant labels at the camera edge
  spr.scale.set(c.width * S, c.height * S, 1)
  spr.center.set(0.5, 0) // anchor at the pointer nib
  spr.layers.set(1)
  spr.renderOrder = 5
  return spr
}
