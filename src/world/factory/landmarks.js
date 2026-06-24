import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { paint, markEmissive } from '../../util/geo.js'
import { rand, TAU } from '../../util/math.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0, ...o })

// ── Tokyo Tower — stylized red lattice tower with night lights ──────────
// Returns { group, top }. ~18 units tall, sits on its own plaza.
export function makeTokyoTower() {
  const g = new THREE.Group()
  const red = mat(palette.towerRed, { roughness: 0.6 })
  const white = mat(palette.towerWhite, { roughness: 0.7 })

  // four splayed legs (tapered) forming the base pyramid
  const legGeos = []
  const legH = 8, spread = 3.4, topSpread = 1.0
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const geo = new THREE.CylinderGeometry(0.18, 0.42, legH, 5)
    geo.translate(0, legH / 2, 0)
    // lean inward: shift top toward center
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = y / legH
      pos.setX(i, pos.getX(i) + sx * (spread * (1 - t) + topSpread * t))
      pos.setZ(i, pos.getZ(i) + sz * (spread * (1 - t) + topSpread * t))
    }
    geo.computeVertexNormals()
    legGeos.push(geo)
  }
  const legs = new THREE.Mesh(mergeGeometries(legGeos, false), red)
  legs.castShadow = true
  g.add(legs)

  // horizontal lattice bands (white deck rings)
  for (const y of [3.2, 6.4]) {
    const s = (spread * (1 - y / legH) + topSpread * (y / legH)) * 2 + 0.9
    const ring = new THREE.Mesh(new THREE.BoxGeometry(s, 0.5, s), white)
    ring.position.y = y; ring.castShadow = true; g.add(ring)
  }

  // main observation deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 3.0), white)
  deck.position.y = legH + 0.2; deck.castShadow = true; g.add(deck)
  // deck windows glow at night
  const deckGlow = mat('#3a2a44', { roughness: 0.5 })
  markEmissive(deckGlow, palette.towerLight, 1.1, 0.0)
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.5, 3.05), deckGlow)
  band.position.y = legH + 0.2; g.add(band)

  // upper shaft (red lattice) + small deck
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.1, 5.5, 6), red)
  shaft.position.y = legH + 3.1; shaft.castShadow = true; g.add(shaft)
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.8), white)
  deck2.position.y = legH + 5.0; g.add(deck2)

  // antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 4.5, 6), red)
  ant.position.y = legH + 7.6; ant.castShadow = true; g.add(ant)
  // beacon at the tip (always a bit lit, full at night)
  const beaconMat = mat('#7a1a10')
  markEmissive(beaconMat, '#ff5a3c', 1.4, 0.25)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), beaconMat)
  beacon.position.y = legH + 9.9; g.add(beacon)

  // warm light strips up the legs (night glow)
  const stripMat = mat('#7a4a10')
  markEmissive(stripMat, palette.towerLight, 0.9, 0.0)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, legH, 0.1), stripMat)
    strip.position.set(sx * spread * 0.7, legH / 2, sz * spread * 0.7)
    g.add(strip)
  }

  return { group: g, top: legH + 10.2 }
}

// ── Torii gate (night-market entrance) ──────────────────────────────────
export function makeTorii(scale = 1) {
  const g = new THREE.Group()
  const v = mat(palette.torii, { roughness: 0.7 })
  const black = mat('#2a1a18')
  for (const sx of [-1.4, 1.4]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 4.2, 8), v)
    pillar.position.set(sx, 2.1, 0); pillar.castShadow = true; g.add(pillar)
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 0.6), black)
  top.position.y = 4.4; top.rotation.z = 0; g.add(top)
  const lintel2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.34, 0.5), v)
  lintel2.position.y = 3.7; g.add(lintel2)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.34, 0.7), black)
  cap.position.y = 4.7; g.add(cap)
  g.scale.setScalar(scale)
  return g
}

// ── Paper lantern (glows at night) ──────────────────────────────────────
export function makeLantern(color = palette.lantern) {
  const m = mat('#7a1a14', { roughness: 0.5 })
  markEmissive(m, color, 1.3, 0.15)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), m)
  lamp.scale.y = 1.15
  const capMat = mat('#241a18')
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 6), capMat)
  cap.position.y = 0.42
  const g = new THREE.Group(); g.add(lamp, cap)
  return g
}

// A string of lanterns between two points (for night-market lanes).
export function makeLanternString(x1, z1, x2, z2, count = 6, y = 3.4) {
  const g = new THREE.Group()
  // wire
  const len = Math.hypot(x2 - x1, z2 - z1)
  const wire = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), mat('#2a1a14'))
  wire.position.set((x1 + x2) / 2, y, (z1 + z2) / 2)
  wire.rotation.y = Math.atan2(z2 - z1, x2 - x1)
  g.add(wire)
  const colors = [palette.lantern, palette.lanternWarm, '#ff8a4d']
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    const lan = makeLantern(colors[i % colors.length])
    lan.position.set(x1 + (x2 - x1) * t, y - 0.45, z1 + (z2 - z1) * t)
    g.add(lan)
  }
  return g
}

// ── Night-market stall (counter + striped awning + sign) ────────────────
export function makeStall(i = 0) {
  const g = new THREE.Group()
  const body = palette.stallColors[i % palette.stallColors.length]
  const aw = palette.awning[i % palette.awning.length]

  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.6), mat(body))
  counter.position.y = 0.55; counter.castShadow = true; counter.receiveShadow = true; g.add(counter)
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 1.7), mat('#3a2a26'))
  top.position.y = 1.18; g.add(top)
  // posts
  for (const sx of [-1.1, 1.1]) for (const sz of [-0.7, 0.7]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), mat('#4a3a30'))
    p.position.set(sx, 1.1, sz); g.add(p)
  }
  // slanted awning
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.4), mat(aw, { roughness: 0.7 }))
  awning.position.set(0, 2.25, 0.4); awning.rotation.x = -0.32; awning.castShadow = true; g.add(awning)
  // glowing sign
  const signMat = mat('#241820')
  markEmissive(signMat, palette.neon[i % palette.neon.length], 1.2, 0.1)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), signMat)
  sign.position.set(0, 1.9, 0.85); g.add(sign)

  return g
}

// ── Shibuya scramble crossing decals (white stripes: 4 sides + diagonals) ─
export function makeCrossing(size = 9) {
  const g = new THREE.Group()
  const stripeMat = mat(palette.crosswalk, { roughness: 0.85 })
  const y = 0.14
  const mk = (w, d, x, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), stripeMat)
    m.position.set(x, y, z); m.rotation.y = ry; g.add(m)
  }
  const half = size / 2
  // straight crossings on the 4 approaches (zebra bars)
  for (let i = -2; i <= 2; i++) {
    mk(0.5, 3.2, i * 0.85, -half, 0)       // north
    mk(0.5, 3.2, i * 0.85, half, 0)        // south
    mk(3.2, 0.5, -half, i * 0.85, 0)       // west
    mk(3.2, 0.5, half, i * 0.85, 0)        // east
  }
  // two diagonal scrambles
  for (let i = -3; i <= 3; i++) {
    mk(0.5, size * 1.25, i * 0.8, 0, Math.PI / 4)
    mk(0.5, size * 1.25, i * 0.8, 0, -Math.PI / 4)
  }
  return g
}

// ── Neon billboard panel showing the project glyph (for project towers) ─
export function makeBillboard(accent, glyph = '', w = 2.6, h = 3.4) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 168
  const x = c.getContext('2d')
  x.fillStyle = '#120d1a'; x.fillRect(0, 0, 128, 168)
  x.fillStyle = accent; x.globalAlpha = 0.92; x.fillRect(7, 7, 114, 154); x.globalAlpha = 1
  x.fillStyle = '#ffffff'; x.font = "bold 70px 'JetBrains Mono', monospace"
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText(glyph, 64, 88)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const m = mat('#120d1a', { roughness: 0.4 })
  m.map = tex; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = tex
  m.emissiveIntensity = 0.2; m.userData.nightE = 1.15; m.userData.dayE = 0.2
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), m)
}

// Low decorative bushes already exist in trees.js; benches here for parks.
export function makeBench() {
  const g = new THREE.Group()
  const wood = mat('#9a6b40')
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), wood)
  seat.position.y = 0.5; seat.castShadow = true; g.add(seat)
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.12), wood)
  back.position.set(0, 0.78, -0.2); g.add(back)
  for (const sx of [-0.65, 0.65]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.45), mat('#3a4048'))
    leg.position.set(sx, 0.25, 0); g.add(leg)
  }
  return g
}
