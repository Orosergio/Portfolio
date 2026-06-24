import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { paint, markEmissive, rbox } from '../../util/geo.js'
import { rand, TAU } from '../../util/math.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0, ...o })
const shade = (hex, amt) => {
  const c = new THREE.Color(hex)
  if (amt < 0) c.multiplyScalar(1 + amt); else c.lerp(new THREE.Color('#ffffff'), amt)
  return '#' + c.getHexString()
}

// ── Tokyo Tower — the HERO: ~20u tall, double-taper red lattice w/ fine
// cross-bracing + night lights. Returns { group, top, beacon }. ───────────
export function makeTokyoTower() {
  const g = new THREE.Group()
  const red = mat(palette.towerRed, { roughness: 0.55 })
  const redDark = mat(shade(palette.towerRed, -0.2), { roughness: 0.6 })
  const white = mat(palette.towerWhite, { roughness: 0.7 })

  const legH = 9.5, spread = 3.95, topSpread = 1.05
  const off = (y) => { const t = Math.min(1, y / legH); return spread * (1 - t) + topSpread * t }
  const corner = (sx, sz, y) => new THREE.Vector3(sx * off(y), y, sz * off(y))

  // four splayed tapered legs
  const legGeos = []
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const geo = new THREE.CylinderGeometry(0.16, 0.4, legH, 5)
    geo.translate(0, legH / 2, 0)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), t = y / legH
      pos.setX(i, pos.getX(i) + sx * (spread * (1 - t) + topSpread * t))
      pos.setZ(i, pos.getZ(i) + sz * (spread * (1 - t) + topSpread * t))
    }
    geo.computeVertexNormals(); legGeos.push(geo)
  }
  const legs = new THREE.Mesh(mergeGeometries(legGeos, false), red)
  legs.castShadow = true; g.add(legs)

  // fine X cross-bracing on all 4 faces, in height bands (merged → 1 draw call)
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  const braceGeos = []
  const bands = [[0.6, 2.4], [2.4, 4.2], [4.2, 6.0], [6.0, 7.8], [7.8, legH]]
  for (let f = 0; f < 4; f++) {
    const a = corners[f], b = corners[(f + 1) % 4]
    for (const [y0, y1] of bands) {
      braceGeos.push(strutGeo(corner(a[0], a[1], y0), corner(b[0], b[1], y1), 0.05))
      braceGeos.push(strutGeo(corner(b[0], b[1], y0), corner(a[0], a[1], y1), 0.05))
    }
  }
  const braces = new THREE.Mesh(mergeGeometries(braceGeos, false), redDark)
  braces.castShadow = true; g.add(braces)

  // horizontal white deck rings (3)
  for (const y of [2.4, 5.0, 7.6]) {
    const s = off(y) * 2 + 0.7
    const ring = new THREE.Mesh(new THREE.BoxGeometry(s, 0.34, s), white)
    ring.position.y = y; ring.castShadow = true; g.add(ring)
  }

  // main observation deck + glowing window band
  const deck = new THREE.Mesh(rbox(3.1, 1.3, 3.1, 0.12), white)
  deck.position.y = legH + 0.3; deck.castShadow = true; g.add(deck)
  const deckGlow = mat('#3a2a44', { roughness: 0.5 }); markEmissive(deckGlow, palette.towerLight, 1.15, 0.05)
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.55, 3.16), deckGlow)
  band.position.y = legH + 0.3; g.add(band)

  // upper red lattice shaft + small deck
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.05, 6.0, 6), red)
  shaft.position.y = legH + 3.4; shaft.castShadow = true; g.add(shaft)
  const deck2 = new THREE.Mesh(rbox(1.7, 0.85, 1.7, 0.1), white)
  deck2.position.y = legH + 5.4; g.add(deck2)
  const deck2Glow = mat('#3a2a44'); markEmissive(deck2Glow, palette.towerLight, 1.1, 0.05)
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.32, 1.76), deck2Glow)
  band2.position.y = legH + 5.4; g.add(band2)

  // antenna + pulsing tip beacon
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.26, 5.0, 6), red)
  ant.position.y = legH + 8.2; ant.castShadow = true; g.add(ant)
  const beaconMat = mat('#7a1a10'); markEmissive(beaconMat, '#ff5a3c', 1.6, 0.3)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), beaconMat)
  beacon.position.y = legH + 10.9; g.add(beacon)

  // warm light strips up the legs (night glow)
  const stripMat = mat('#7a4a10'); markEmissive(stripMat, palette.towerLight, 0.95, 0.0)
  for (const [sx, sz] of corners) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.09, legH, 0.09), stripMat)
    strip.position.set(sx * spread * 0.72, legH / 2, sz * spread * 0.72); g.add(strip)
  }

  return { group: g, top: legH + 11.1, beacon }
}

// thin oriented strut geometry between two points (for lattice bracing)
function strutGeo(p1, p2, t = 0.05) {
  const dir = new THREE.Vector3().subVectors(p2, p1)
  const len = dir.length()
  const geo = new THREE.CylinderGeometry(t, t, len, 4)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  geo.applyQuaternion(q)
  geo.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2)
  return geo
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

// ── Central fountain — the animated focal heart of the plaza ─────────────
// Returns { group, animate(t) }. Tiered stone pool + gold orb + bobbing jets.
export function makeFountain() {
  const g = new THREE.Group()
  const stone = mat(palette.plaza, { roughness: 0.9 })
  const stoneDk = mat(shade(palette.plaza, -0.16), { roughness: 0.9 })

  const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.55, 28), stone)
  pool.position.y = 0.27; pool.castShadow = true; pool.receiveShadow = true; g.add(pool)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.16, 8, 28), stoneDk)
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.54; g.add(rim)

  const waterMat = mat('#3fb6d8', { roughness: 0.18, metalness: 0.0, transparent: true, opacity: 0.78 })
  markEmissive(waterMat, '#7fe3ff', 0.5, 0.0)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.14, 28), waterMat)
  water.position.y = 0.5; g.add(water)
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 6, 24), waterMat)
  ripple.rotation.x = Math.PI / 2; ripple.position.y = 0.56; g.add(ripple)

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 0.9, 20), stone)
  ped.position.y = 0.95; ped.castShadow = true; g.add(ped)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.7, 0.24, 20), stoneDk)
  bowl.position.y = 1.45; g.add(bowl)

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 12), stoneDk)
  stem.position.y = 1.95; g.add(stem)
  const orbMat = mat('#e8c45a', { roughness: 0.3, metalness: 0.55 })
  markEmissive(orbMat, '#ffd98a', 0.7, 0.12) // glows as the literal centre after dark
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 14), orbMat)
  orb.position.y = 2.6; orb.castShadow = true; g.add(orb)

  // bobbing water jets around the bowl
  const jets = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 6), waterMat)
    jet.position.set(Math.cos(a) * 1.0, 1.9, Math.sin(a) * 1.0)
    g.add(jet); jets.push({ jet, phase: a })
  }

  return {
    group: g,
    animate(t) {
      orb.position.y = 2.6 + Math.sin(t * 1.6) * 0.06
      orb.rotation.y = t * 0.5
      ripple.scale.setScalar(0.7 + (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.5)
      ripple.material.opacity = 0.5 - (ripple.scale.x - 0.7) * 0.6
      for (const { jet, phase } of jets) {
        const s = 0.7 + (Math.sin(t * 3 + phase) * 0.5 + 0.5) * 0.9
        jet.scale.y = s; jet.position.y = 1.9 + (s - 1) * 0.5
      }
    },
  }
}

// ── Round plaza kiosk (low rim detail; lantern roof) ────────────────────
export function makeKiosk(color = palette.domSandCream) {
  const g = new THREE.Group()
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 1.9, 14), mat(color, { roughness: 0.85 }))
  drum.position.y = 0.95; drum.castShadow = true; drum.receiveShadow = true; g.add(drum)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.25, 0.7, 14), mat(palette.roofWarm, { roughness: 0.8 }))
  cap.position.y = 2.2; cap.castShadow = true; g.add(cap)
  const lm = mat('#7a4a10'); markEmissive(lm, palette.lanternWarm, 1.0, 0.08)
  const lan = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lm)
  lan.position.y = 2.75; g.add(lan)
  return g
}
