import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { rbox, markEmissive, paint } from '../../util/geo.js'
import { rand, TAU } from '../../util/math.js'
import { strutGeo } from './landmarks.js'

// ── Japan district landmarks ─────────────────────────────────────────────
// Procedural icons hosting projects: Tokyo Skytree (OpenClaw), Kaminarimon
// (Milingua), Fushimi Inari path (Pattern Journal), Akihabara (Finger Mouse),
// plus the Mount Fuji horizon backdrop. Tokyo Tower lives in landmarks.js.
// Contract: each returns { group, top, obstacles, animate? } in LOCAL coords.

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0, ...o })
const shade = (hex, amt) => {
  const c = new THREE.Color(hex)
  if (amt < 0) c.multiplyScalar(1 + amt); else c.lerp(new THREE.Color('#ffffff'), amt)
  return '#' + c.getHexString()
}
export function makeSkytree() {
  const g = new THREE.Group()
  const bodyHex = '#e9eef2'
  const up = new THREE.Vector3(0, 1, 0)
  const V = (x, y, z) => new THREE.Vector3(x, y, z)

  // tapered cylinder between two points, non-indexed, merge-ready
  const tube = (a, b, rBot, rTop, seg = 8) => {
    const dir = V(b.x - a.x, b.y - a.y, b.z - a.z)
    const len = dir.length()
    const geo = new THREE.CylinderGeometry(rTop, rBot, len, seg)
    geo.translate(0, len / 2, 0)
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()))
    geo.translate(a.x, a.y, a.z)
    return geo.toNonIndexed()
  }
  const cyl = (rt, rb, h, y, seg = 12) => {
    const c = new THREE.CylinderGeometry(rt, rb, h, seg)
    c.translate(0, y, 0)
    return c.toNonIndexed()
  }
  // point on leg i at height fraction s — tripod splays from r=2.2 to r=0.7 at y=7
  const legPt = (i, s) => {
    const a = i * TAU / 3
    const r = 2.2 - 1.5 * s
    return V(Math.cos(a) * r, s * 7, Math.sin(a) * r)
  }

  // ground pad
  const pad = new THREE.Mesh(cyl(2.6, 2.6, 0.16, 0.08, 16), mat(palette.plaza, { roughness: 0.9 }))
  pad.receiveShadow = true
  g.add(pad)

  // body: 3 tapered legs + collar + shaft + stacked mast, ONE mesh
  const bodyGeos = []
  for (let i = 0; i < 3; i++) bodyGeos.push(tube(legPt(i, 0), legPt(i, 1), 0.34, 0.2, 8))
  bodyGeos.push(cyl(0.9, 1.1, 0.7, 7, 12))       // collar where legs gather
  bodyGeos.push(cyl(0.6, 0.9, 10, 12, 12))       // main shaft y7 -> 17
  bodyGeos.push(cyl(0.34, 0.52, 3.2, 18.6, 10))  // lower mast, carries upper deck
  bodyGeos.push(cyl(0.2, 0.34, 3.2, 21.8, 8))
  bodyGeos.push(cyl(0.07, 0.2, 2.8, 24.8, 8))    // needle to 26.2
  bodyGeos.push(cyl(0.42, 0.42, 0.14, 20.2, 10)) // mast joint collars
  bodyGeos.push(cyl(0.28, 0.28, 0.12, 23.4, 8))
  const body = new THREE.Mesh(mergeGeometries(bodyGeos), mat(bodyHex, { roughness: 0.55 }))
  body.castShadow = true
  g.add(body)

  // diagonal X-bracing + rings between the legs, ONE mesh (33 struts)
  const strutGeos = []
  const lv = [0.12, 0.3, 0.48, 0.66, 0.84]
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3
    for (let k = 0; k < 4; k++) {
      strutGeos.push(strutGeo(legPt(i, lv[k]), legPt(j, lv[k + 1]), 0.05).toNonIndexed())
      strutGeos.push(strutGeo(legPt(j, lv[k]), legPt(i, lv[k + 1]), 0.05).toNonIndexed())
    }
    for (const s of [0.12, 0.48, 0.84]) strutGeos.push(strutGeo(legPt(i, s), legPt(j, s), 0.05).toNonIndexed())
  }
  g.add(new THREE.Mesh(mergeGeometries(strutGeos), mat(shade(bodyHex, -0.15), { roughness: 0.6 })))

  // two donut decks: flared underside + shoulder drum, glass band between
  const deckMat = mat('#f2f6fa', { roughness: 0.5 })
  const glowMat = mat('#5a7690', { roughness: 0.4 })
  markEmissive(glowMat, '#cfe2ff', 1.1, 0.05)
  const deckGeos = []
  const bandGeos = []
  const deck = (y, r, h) => {
    deckGeos.push(cyl(r, r * 0.7, h * 0.42, y - h * 0.29, 16))
    bandGeos.push(cyl(r * 0.96, r * 0.96, h * 0.36, y + h * 0.09, 16))
    deckGeos.push(cyl(r * 0.88, r, h * 0.24, y + h * 0.38, 16))
  }
  deck(13.5, 1.9, 1.2)
  deck(18.5, 1.3, 0.9)
  const decks = new THREE.Mesh(mergeGeometries(deckGeos), deckMat)
  decks.castShadow = true
  g.add(decks)
  g.add(new THREE.Mesh(mergeGeometries(bandGeos), glowMat))

  // vertical ice-blue night strips hugging the shaft taper
  const stripMat = mat('#5a7690', { roughness: 0.45 })
  markEmissive(stripMat, '#cfe2ff', 0.8, 0.03)
  const stripGeos = []
  for (const a of [0.6, 0.6 + TAU / 2]) {
    const s = rbox(0.1, 9.8, 0.3, 0.03).toNonIndexed()
    s.rotateZ(0.0294) // lean top inward to follow the shaft taper
    s.translate(0.775, 12.2, 0)
    s.rotateY(a)
    stripGeos.push(s)
  }
  g.add(new THREE.Mesh(mergeGeometries(stripGeos), stripMat))

  // aviation beacons
  const tipMat = mat('#7a2a1e', { roughness: 0.5 })
  markEmissive(tipMat, '#ff6a4d', 1.5, 0.25)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), tipMat)
  beacon.position.y = 26.3
  g.add(beacon)
  const midMat = mat('#7a2a1e', { roughness: 0.5 })
  markEmissive(midMat, '#ff6a4d', 1.1, 0.12)
  const midBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), midMat)
  midBeacon.position.set(0.32, 21.9, 0)
  g.add(midBeacon)

  const animate = (t, nightT) => {
    const base = 0.25 + 1.25 * nightT
    tipMat.emissiveIntensity = base * (0.6 + 0.4 * Math.sin(t * 3.4))
    beacon.scale.setScalar(1 + 0.12 * Math.sin(t * 3.4))
  }

  return { group: g, top: 26.5, obstacles: [{ x: 0, z: 0, hw: 2.6, hd: 2.6 }], animate }
}

export function makeKaminarimon() {
  const g = new THREE.Group()
  const gold = shade(palette.lanternWarm, -0.12)
  const charcoal = '#2e2a2e'
  const clay = '#8a4a3a'
  const inkDark = '#241b18'
  const soot = '#2a2024'

  // rotate -> translate -> non-indexed -> optional paint, push to arr
  const put = (arr, geo, x, y, z, rx = 0, ry = 0, rz = 0, hex = null) => {
    if (rx) geo.rotateX(rx)
    if (ry) geo.rotateY(ry)
    if (rz) geo.rotateZ(rz)
    geo.translate(x, y, z)
    const n = geo.toNonIndexed()
    if (hex) paint(n, hex)
    arr.push(n)
    return n
  }

  const vcol = mat('#ffffff', { vertexColors: true, roughness: 0.75 })

  // ---- vermilion structure: gate pillars, beams, hall columns (1 mesh)
  const red = []
  for (const s of [-1, 1]) {
    put(red, new THREE.CylinderGeometry(0.43, 0.5, 3.6, 10), s * 2.2, 1.8, 3.2)
    // slimmer inner pillars at ±1.5 leave a 2.36u clear gap — the kart
    // (r 1.05) can actually drive under the lantern (±1.35 sealed it with
    // invisible walls; ±1.6 would fuse them into the outer pillars)
    put(red, new THREE.CylinderGeometry(0.26, 0.31, 3.6, 8), s * 1.5, 1.8, 3.2)
    put(red, new THREE.CylinderGeometry(0.13, 0.15, 2.7, 8), s * 1.15, 1.35, -0.78)
    put(red, new THREE.CylinderGeometry(0.13, 0.15, 2.7, 8), s * 2.3, 1.35, -0.78)
  }
  put(red, rbox(6.1, 0.42, 0.8, 0.1), 0, 3.45, 3.2)   // lintel the lantern hangs from
  put(red, rbox(6.6, 0.32, 0.66, 0.1), 0, 3.86, 3.2)  // upper beam under the roof
  const redMesh = new THREE.Mesh(mergeGeometries(red), mat(palette.torii, { roughness: 0.6 }))
  redMesh.castShadow = true
  g.add(redMesh)

  // ---- gate hip roof: charcoal tile + gold ridge, painted into one mesh
  const a1 = Math.atan2(1.15, 1.3)
  const gr = []
  for (const s of [-1, 1]) {
    put(gr, rbox(6.4, 0.16, 1.8, 0.07), 0, 4.575, 3.2 + s * 0.65, s * a1, 0, 0, charcoal)
    put(gr, rbox(1.5, 0.14, 2.2, 0.07), s * 2.64, 4.55, 3.2, 0, 0, -s * a1, charcoal) // hip ends
    put(gr, rbox(0.34, 0.42, 0.42, 0.06), s * 1.78, 5.14, 3.2, 0, 0, 0, gold)        // ridge end caps
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) // upturned eave corners
    put(gr, rbox(0.8, 0.12, 0.55, 0.05), sx * 2.95, 4.08, 3.2 + sz * 1.18, -sz * 0.32, 0, sx * 0.32, charcoal)
  put(gr, rbox(3.4, 0.2, 0.36, 0.06), 0, 5.1, 3.2, 0, 0, 0, gold)
  const gateRoof = new THREE.Mesh(mergeGeometries(gr), vcol)
  gateRoof.castShadow = true
  g.add(gateRoof)

  // ---- giant lantern (sways from the lintel; pivot raised so the tassel
  // clears the seated driver's head at ~1.39u when driving under)
  const sway = new THREE.Group()
  sway.position.set(0, 4.0, 3.2)
  g.add(sway)
  const lanMat = mat('#c8362a', { roughness: 0.5 })
  markEmissive(lanMat, palette.lantern, 1.35, 0.18)
  const lbody = new THREE.SphereGeometry(0.95, 12, 9)
  lbody.scale(1, 0.92, 1)             // squashed chochin profile
  lbody.translate(0, -1.48, 0)        // bottom clears y≈0.93 — kart drives under
  const lant = new THREE.Mesh(lbody.toNonIndexed(), lanMat)
  lant.castShadow = true
  sway.add(lant)
  const tr = []
  put(tr, new THREE.CylinderGeometry(0.045, 0.045, 0.75, 6), 0, -0.37, 0, 0, 0, 0, soot) // hang rod
  put(tr, new THREE.CylinderGeometry(0.4, 0.33, 0.24, 10), 0, -0.66, 0, 0, 0, 0, soot)   // top cap
  put(tr, new THREE.CylinderGeometry(0.33, 0.4, 0.22, 10), 0, -2.3, 0, 0, 0, 0, soot)    // bottom cap
  put(tr, new THREE.SphereGeometry(0.09, 7, 5), 0, -2.46, 0, 0, 0, 0, gold)              // tassel knob
  const ribRed = shade('#c8362a', -0.35)
  for (const dy of [-0.62, -0.3, 0.3, 0.62]) { // rib rings hug the squashed sphere
    const rr = 0.97 * Math.sqrt(Math.max(0.1, 1 - (dy / 0.874) ** 2))
    put(tr, new THREE.TorusGeometry(rr, 0.028, 5, 22), 0, -1.48 + dy, 0, Math.PI / 2, 0, 0, ribRed)
  }
  sway.add(new THREE.Mesh(mergeGeometries(tr), vcol))

  // ---- dark statics: guardian niches, statues, collars, hall lower wall (1 mesh)
  const dk = []
  for (const s of [-1, 1]) {
    put(dk, new THREE.CylinderGeometry(0.56, 0.62, 0.24, 10), s * 2.2, 0.12, 3.2, 0, 0, 0, soot)
    put(dk, new THREE.CylinderGeometry(0.36, 0.41, 0.2, 8), s * 1.5, 0.1, 3.2, 0, 0, 0, soot)
    put(dk, rbox(1.05, 2.5, 0.14, 0.06), s * 1.82, 1.5, 2.5, 0, 0, 0, inkDark)   // niche back panel
    put(dk, rbox(1.0, 0.07, 0.07, 0.03), s * 1.82, 0.62, 3.9, 0, 0, 0, inkDark)  // fence rail
    put(dk, new THREE.CylinderGeometry(0.3, 0.34, 0.22, 8), s * 1.82, 0.11, 3.05, 0, 0, 0, soot)
    const body = new THREE.SphereGeometry(0.5, 8, 6) // Fujin/Raijin as abstract blobs
    body.scale(0.64, 1.0, 0.52)
    put(dk, body, s * 1.82, 0.78, 3.05, 0, 0, s * 0.12, '#3a2a26')
    put(dk, new THREE.SphereGeometry(0.2, 8, 6), s * 1.76, 1.42, 3.05, 0, 0, 0, '#3a2a26')
    put(dk, new THREE.SphereGeometry(0.13, 7, 5), s * 1.56, 1.1, 3.15, 0, 0, 0, '#3a2a26') // raised fist
  }
  put(dk, rbox(4.6, 1.3, 2.9, 0.1), 0, 0.75, -2.5, 0, 0, 0, inkDark) // recessed hall lower wall
  g.add(new THREE.Mesh(mergeGeometries(dk), vcol))

  // ---- hall: white plaster body + stepped gable filler (1 mesh)
  const wh = []
  put(wh, rbox(5, 1.75, 3.2, 0.13), 0, 2.0, -2.5)
  put(wh, rbox(5.3, 1.15, 3.2, 0.1), 0, 3.35, -2.5)
  put(wh, rbox(5.0, 1.1, 2.0, 0.1), 0, 4.35, -2.5)
  put(wh, rbox(4.7, 1.1, 0.95, 0.1), 0, 5.35, -2.5)
  const whMesh = new THREE.Mesh(mergeGeometries(wh), mat(palette.towerWhite))
  whMesh.castShadow = true
  g.add(whMesh)

  // ---- hall roof: steep gable, dark clay + gold ridge (1 mesh)
  const a2 = Math.atan2(3.9, 2.3)
  const hr = []
  for (const s of [-1, 1])
    put(hr, rbox(6.0, 0.2, 4.6, 0.08), 0, 4.9, -2.5 + s * 1.15, s * a2, 0, 0, clay)
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    put(hr, rbox(0.9, 0.14, 0.6, 0.05), sx * 2.85, 3.0, -2.5 + sz * 2.25, -sz * 0.3, 0, sx * 0.3, clay)
  put(hr, rbox(3.1, 0.24, 0.42, 0.07), 0, 6.92, -2.5, 0, 0, 0, gold)
  const hallRoof = new THREE.Mesh(mergeGeometries(hr), vcol)
  hallRoof.castShadow = true
  g.add(hallRoof)

  // ---- glowing entrance on hall front
  const doorMat = mat('#4a3220', { roughness: 0.6 })
  markEmissive(doorMat, palette.lanternWarm, 0.9, 0.1)
  const door = new THREE.Mesh(rbox(1.5, 1.5, 0.14, 0.05).toNonIndexed(), doorMat)
  door.position.set(0, 0.95, -0.84)
  g.add(door)

  // ---- stone: hall plinth, path, two toro lanterns (1 mesh)
  const st = []
  put(st, rbox(5.5, 0.5, 3.6, 0.1), 0, 0.25, -2.5)
  put(st, rbox(2.2, 0.1, 5.4, 0.05), 0, 0.05, 2.0)
  for (const s of [-1, 1]) {
    const x = s * 1.9
    put(st, new THREE.CylinderGeometry(0.22, 0.26, 0.16, 8), x, 0.08, 0.3)
    put(st, new THREE.CylinderGeometry(0.08, 0.1, 0.5, 7), x, 0.4, 0.3)
    put(st, new THREE.CylinderGeometry(0.16, 0.13, 0.34, 6), x, 0.85, 0.3) // firebox
    put(st, new THREE.CylinderGeometry(0.04, 0.3, 0.22, 6), x, 1.12, 0.3)  // cap
    put(st, new THREE.SphereGeometry(0.07, 6, 5), x, 1.28, 0.3)
  }
  const stone = new THREE.Mesh(mergeGeometries(st), mat(palette.plaza))
  stone.receiveShadow = true
  g.add(stone)

  // ---- toro glow bands (poke through the fireboxes)
  const toroMat = mat('#6b5638', { roughness: 0.6 })
  markEmissive(toroMat, palette.lanternWarm, 0.7, 0.06)
  const tg = []
  for (const s of [-1, 1])
    put(tg, new THREE.CylinderGeometry(0.185, 0.185, 0.15, 6), s * 1.9, 0.86, 0.3)
  g.add(new THREE.Mesh(mergeGeometries(tg), toroMat))

  const obstacles = [
    { x: -2.2, z: 3.2, hw: 0.55, hd: 0.55 },
    { x: 2.2, z: 3.2, hw: 0.55, hd: 0.55 },
    { x: -1.5, z: 3.2, hw: 0.32, hd: 0.32 },
    { x: 1.5, z: 3.2, hw: 0.32, hd: 0.32 },
    { x: 0, z: -2.5, hw: 2.6, hd: 1.7 },
    { x: -1.9, z: 0.3, hw: 0.3, hd: 0.3 },
    { x: 1.9, z: 0.3, hw: 0.3, hd: 0.3 }
  ]

  const animate = (t) => {
    sway.rotation.z = Math.sin(t * 0.9) * 0.02
  }

  return { group: g, top: 7.05, obstacles, animate }
}

export function makeFushimiPath() {
  const g = new THREE.Group()
  const DEG = Math.PI / 180

  const verm = []  // painted vermilion parts -> one mesh
  const tops = []  // black lintels/cords -> one mesh
  const base = []  // painted ground parts -> one mesh
  const deco = []  // painted shrine/fox parts -> one mesh
  const redL = []  // red lantern bodies -> one emissive mesh

  const nx = geo => geo.toNonIndexed()
  const pushPainted = (arr, geo, hex) => { const p = nx(geo); paint(p, hex); arr.push(p) }
  const gateM = (z, s, ry) => new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(s, s, s)
  )

  // ---- 12 torii gates, z = +8 .. -6 ----
  const obstacles = []
  const step = 14 / 11
  for (let i = 0; i < 12; i++) {
    const z = 8 - i * step
    const tm = gateM(z, 1 + rand(-0.04, 0.04), rand(-1.5, 1.5) * DEG)
    const tone = shade(palette.torii, rand(-0.05, 0.04))

    for (const sx of [-1, 1]) {
      const p = new THREE.CylinderGeometry(0.16, 0.175, 2.6, 8)
      p.translate(sx * 1.55, 1.3, 0); p.applyMatrix4(tm)
      pushPainted(verm, p, tone)
      const foot = new THREE.CylinderGeometry(0.24, 0.3, 0.16, 8) // stone footing
      foot.translate(sx * 1.55, 0.08, 0); foot.applyMatrix4(tm)
      pushPainted(base, foot, '#a59882')
      obstacles.push({ x: sx * 1.55, z, hw: 0.3, hd: 0.3 })
    }
    const tie = rbox(3.5, 0.16, 0.14, 0.05) // lower tie beam (nuki)
    tie.translate(0, 1.95, 0); tie.applyMatrix4(tm)
    pushPainted(verm, tie, tone)

    const shi = rbox(3.66, 0.16, 0.26, 0.05) // straight black shimaki
    shi.translate(0, 2.52, 0); shi.applyMatrix4(tm)
    tops.push(nx(shi))
    const gaku = rbox(0.14, 0.44, 0.12, 0.04) // center strut
    gaku.translate(0, 2.22, 0); gaku.applyMatrix4(tm)
    tops.push(nx(gaku))
    for (const sx of [-1, 1]) { // kasagi halves, tilted so ends curve upward
      const k = rbox(2.0, 0.2, 0.32, 0.06)
      k.rotateZ(sx * 0.05)
      k.translate(sx * 0.96, 2.74, 0); k.applyMatrix4(tm)
      tops.push(nx(k))
    }

    if (i % 4 === 2) { // hanging red lantern under every 4th torii
      const cord = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5)
      cord.translate(0, 2.36, 0); cord.applyMatrix4(tm)
      tops.push(nx(cord))
      for (const cy of [2.18, 1.82]) {
        const cap = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8)
        cap.translate(0, cy, 0); cap.applyMatrix4(tm)
        tops.push(nx(cap))
      }
      const body = new THREE.CylinderGeometry(0.13, 0.13, 0.36, 8)
      body.translate(0, 2.0, 0); body.applyMatrix4(tm)
      redL.push(nx(body))
    }
  }

  // ---- gravel strip ----
  const strip = rbox(3.4, 0.12, 18.6, 0.05)
  strip.translate(0, 0.06, 0)
  pushPainted(base, strip, '#8d7f6b')

  // ---- shrine (z = -7.8) ----
  const sz = -7.8
  const plinth = rbox(3.4, 0.3, 2.8, 0.08)
  plinth.translate(0, 0.15, sz)
  pushPainted(base, plinth, palette.plaza)

  const hall = rbox(2.3, 1.5, 1.7, 0.08) // white walls
  hall.translate(0, 1.15, sz)
  pushPainted(deco, hall, palette.towerWhite)
  const gable = rbox(2.1, 1.5, 1.1, 0.08) // gable fill under ridge
  gable.translate(0, 2.5, sz)
  pushPainted(deco, gable, palette.towerWhite)

  for (const cx of [-1.2, 1.2]) for (const cz of [-0.9, 0.9]) {
    const c = new THREE.CylinderGeometry(0.09, 0.1, 1.8, 8) // vermilion columns
    c.translate(cx, 1.2, sz + cz)
    pushPainted(verm, c, palette.torii)
  }

  const slope = Math.atan2(1.7, 1.35) // eave y2.0 -> ridge y3.7
  for (const sd of [-1, 1]) {
    const slab = rbox(3.1, 0.14, 2.2, 0.05)
    slab.rotateX(-sd * slope)
    slab.translate(0, 2.85, sz + sd * 0.675)
    pushPainted(deco, slab, palette.roofTeal)
  }
  const ridge = rbox(3.2, 0.16, 0.24, 0.05) // gold ridge cap
  ridge.translate(0, 3.76, sz)
  pushPainted(deco, ridge, shade('#ffb347', 0.08))

  // ---- kitsune pair ----
  for (const fx of [-1.2, 1.2]) {
    const fm = new THREE.Matrix4().compose(
      new THREE.Vector3(fx, 0.3, -6.6),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -fx * 0.35, 0)),
      new THREE.Vector3(1, 1, 1)
    )
    const ped = rbox(0.34, 0.2, 0.34, 0.05)
    ped.translate(0, 0.1, 0); ped.applyMatrix4(fm)
    pushPainted(deco, ped, palette.domTaupe)
    const parts = []
    const body = new THREE.ConeGeometry(0.22, 0.5, 5) // angular blob body
    body.translate(0, 0.45, 0); parts.push(body)
    const head = rbox(0.24, 0.2, 0.22, 0.06)
    head.translate(0, 0.76, 0.02); parts.push(head)
    for (const ex of [-0.08, 0.08]) {
      const ear = new THREE.ConeGeometry(0.06, 0.16, 4)
      ear.translate(ex, 0.92, 0); parts.push(ear)
    }
    const snout = new THREE.ConeGeometry(0.05, 0.14, 4)
    snout.rotateX(Math.PI / 2); snout.translate(0, 0.73, 0.17); parts.push(snout)
    for (const p of parts) { p.applyMatrix4(fm); pushPainted(deco, p, '#f4ede0') }
    obstacles.push({ x: fx, z: -6.6, hw: 0.25, hd: 0.25 })
  }
  obstacles.push({ x: 0, z: -7.8, hw: 1.6, hd: 1.3 })

  // ---- shrine hanging warm lantern ----
  const wcord = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5)
  wcord.translate(0, 1.85, sz + 1.25)
  tops.push(nx(wcord))
  const wbody = new THREE.SphereGeometry(0.17, 8, 6)
  wbody.scale(1, 1.25, 1); wbody.translate(0, 1.5, sz + 1.25)

  // ---- assemble meshes ----
  const vMat = opts => mat('#ffffff', Object.assign({ vertexColors: true }, opts))
  const vermMesh = new THREE.Mesh(mergeGeometries(verm), vMat({ roughness: 0.6 }))
  vermMesh.castShadow = true
  const topsMesh = new THREE.Mesh(mergeGeometries(tops), mat('#2a1a18', { roughness: 0.7 }))
  topsMesh.castShadow = true
  const baseMesh = new THREE.Mesh(mergeGeometries(base), vMat({ roughness: 0.95 }))
  baseMesh.receiveShadow = true
  const decoMesh = new THREE.Mesh(mergeGeometries(deco), vMat({ roughness: 0.8 }))
  decoMesh.castShadow = true

  const redMat = mat(palette.lantern, { roughness: 0.5 })
  markEmissive(redMat, palette.lantern, 1.2, 0.08)
  const redMesh = new THREE.Mesh(mergeGeometries(redL), redMat)

  const warmMat = mat(palette.lanternWarm, { roughness: 0.5 })
  markEmissive(warmMat, palette.lanternWarm, 1.2, 0.1)
  const warmMesh = new THREE.Mesh(nx(wbody), warmMat)

  g.add(vermMesh, topsMesh, baseMesh, decoMesh, redMesh, warmMesh)
  return { group: g, top: 4.5, obstacles }
}

export function makeAkihabara() {
  const g = new THREE.Group()
  const neon = ['#ff3d8b', '#25e0d0', '#ffb347', '#ff5252']
  const add = (arr, geo, hex) => { paint(geo, hex); arr.push(geo.toNonIndexed()) }

  // ---- body: podium + tower + parapet + awnings + sign backers (one painted mesh)
  const bodyGeos = []
  const podium = rbox(5.5, 2.6, 5.0)
  podium.translate(0, 1.3, 0)
  add(bodyGeos, podium, shade(palette.domMutedBlue, 0.12))
  const tower = rbox(4.6, 5.9, 4.2)
  tower.translate(0, 5.55, 0)
  add(bodyGeos, tower, shade(palette.domMutedBlue, -0.35))
  const parapet = rbox(4.85, 0.3, 4.45, 0.08)
  parapet.translate(0, 8.55, 0)
  add(bodyGeos, parapet, shade(palette.domMutedBlue, -0.45))
  const awnZ = rbox(5.5, 0.16, 0.55, 0.06)
  awnZ.translate(0, 2.35, 2.6)
  add(bodyGeos, awnZ, palette.torii)
  const awnX = rbox(0.55, 0.16, 5.0, 0.06)
  awnX.translate(2.8, 2.35, 0)
  add(bodyGeos, awnX, palette.torii)

  // ---- canvas atlas: 6 abstract sign designs (canvas 1 of 2)
  const makeCanvas = (s) => { const c = document.createElement('canvas'); c.width = c.height = s; return c }
  const atlas = makeCanvas(256)
  const ax = atlas.getContext('2d')
  ax.fillStyle = '#0b0b14'
  ax.fillRect(0, 0, 256, 256)
  const cell = (i, fn) => {
    ax.save()
    ax.translate((i % 2) * 128, Math.floor(i / 2) * 85)
    ax.beginPath(); ax.rect(2, 2, 124, 81); ax.clip()
    fn()
    ax.restore()
  }
  cell(0, () => { // stacked neon bars
    for (let k = 0; k < 4; k++) { ax.fillStyle = neon[k]; ax.fillRect(12, 8 + k * 19, rand(55, 105), 12) }
  })
  cell(1, () => { // dot-matrix
    ax.fillStyle = neon[1]
    for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) if (rand(0, 1) > 0.4) ax.fillRect(10 + c * 13, 10 + r * 14, 8, 8)
  })
  cell(2, () => { // katakana-esque abstract strokes
    ax.fillStyle = neon[0]
    for (let k = 0; k < 4; k++) {
      const x = 14 + k * 28
      ax.fillRect(x, rand(6, 16), 9, rand(34, 58))
      ax.fillRect(x - 4, rand(58, 68), 17, 7)
    }
  })
  cell(3, () => { // big block with cutouts + side bars
    ax.fillStyle = neon[3]; ax.fillRect(10, 10, 52, 62)
    ax.fillStyle = '#0b0b14'; ax.fillRect(20, 22, 32, 12); ax.fillRect(20, 46, 32, 12)
    ax.fillStyle = neon[2]
    for (let k = 0; k < 4; k++) ax.fillRect(74, 10 + k * 17, rand(20, 44), 9)
  })
  cell(4, () => { // broken checker
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      ax.fillStyle = (r + c) % 2 ? neon[1] : neon[2]
      if (rand(0, 1) > 0.25) ax.fillRect(8 + c * 23, 8 + r * 23, 19, 19)
    }
  })
  cell(5, () => { // framed bar
    ax.strokeStyle = neon[2]; ax.lineWidth = 5; ax.strokeRect(10, 10, 108, 62)
    ax.fillStyle = neon[0]; ax.fillRect(22, 30, rand(50, 84), 20)
  })
  const atlasTex = new THREE.CanvasTexture(atlas)
  atlasTex.colorSpace = THREE.SRGBColorSpace
  atlasTex.magFilter = THREE.NearestFilter
  atlasTex.minFilter = THREE.LinearFilter
  atlasTex.generateMipmaps = false

  // ---- sign panels: bake per-panel UV rect into cloned plane geos, merge to ONE mesh
  const setUV = (geo, ci) => {
    const pad = 6 / 256
    const u0 = (ci % 2) * 0.5 + pad, du = 0.5 - pad * 2
    const vTop = 1 - (Math.floor(ci / 2) * 85) / 256 - pad, dv = 85 / 256 - pad * 2
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * du, vTop - dv + uv.getY(i) * dv)
  }
  // f 'z': x = local x on +z face; f 'x': x = local z on +x face
  const panels = [
    { w: 1.7, h: 0.8, x: -1.2, y: 3.4, f: 'z', c: 0 },
    { w: 1.1, h: 1.1, x: 1.35, y: 3.6, f: 'z', c: 3 },
    { w: 0.8, h: 1.6, x: -1.7, y: 5.2, f: 'z', c: 2 },
    { w: 1.9, h: 0.7, x: 0.7, y: 5.0, f: 'z', c: 5 },
    { w: 1.3, h: 0.85, x: -0.6, y: 6.2, f: 'z', c: 1 },
    { w: 1.5, h: 0.9, x: -0.8, y: 3.5, f: 'x', c: 4 },
    { w: 1.0, h: 1.3, x: 1.0, y: 4.8, f: 'x', c: 1 },
    { w: 1.8, h: 0.75, x: -0.4, y: 6.5, f: 'x', c: 0 }
  ]
  const panelGeos = []
  for (const p of panels) {
    const pg = new THREE.PlaneGeometry(p.w, p.h)
    setUV(pg, p.c)
    const back = rbox(p.w + 0.14, p.h + 0.14, 0.1, 0.03)
    if (p.f === 'z') {
      pg.translate(p.x, p.y, 2.225)
      back.translate(p.x, p.y, 2.16)
    } else {
      pg.rotateY(TAU / 4)
      pg.translate(2.425, p.y, p.x)
      back.rotateY(TAU / 4)
      back.translate(2.36, p.y, p.x)
    }
    panelGeos.push(pg.toNonIndexed())
    add(bodyGeos, back, '#151a22')
  }
  const atlasMat = mat('#ffffff', { map: atlasTex, emissiveMap: atlasTex, roughness: 0.6 })
  markEmissive(atlasMat, '#ffffff', 1.15, 0.15)
  const signMesh = new THREE.Mesh(mergeGeometries(panelGeos), atlasMat)
  g.add(signMesh)

  // ---- big screen near top of +z face (canvas 2 of 2, scrolling pixel mosaic)
  const scr = makeCanvas(64)
  const sx = scr.getContext('2d')
  sx.fillStyle = '#05060c'
  sx.fillRect(0, 0, 64, 64)
  for (let i = 0; i < 90; i++) {
    sx.fillStyle = neon[Math.floor(rand(0, 4)) % 4]
    sx.globalAlpha = rand(0.5, 1)
    sx.fillRect(Math.floor(rand(0, 16)) * 4, Math.floor(rand(0, 16)) * 4, 4, rand(0, 1) > 0.5 ? 8 : 4)
  }
  sx.globalAlpha = 1
  const scrTex = new THREE.CanvasTexture(scr)
  scrTex.colorSpace = THREE.SRGBColorSpace
  scrTex.wrapS = scrTex.wrapT = THREE.RepeatWrapping
  scrTex.magFilter = THREE.NearestFilter
  scrTex.minFilter = THREE.LinearFilter
  scrTex.generateMipmaps = false
  const scrMat = mat('#ffffff', { map: scrTex, emissiveMap: scrTex, roughness: 0.5 })
  markEmissive(scrMat, '#ffffff', 1.25, 0.18)
  const scrGeo = new THREE.PlaneGeometry(2.6, 1.6)
  scrGeo.translate(-0.1, 7.5, 2.225)
  const scrMesh = new THREE.Mesh(scrGeo.toNonIndexed(), scrMat)
  g.add(scrMesh)
  const scrFrame = rbox(2.9, 1.9, 0.12, 0.04)
  scrFrame.translate(-0.1, 7.5, 2.155)
  add(bodyGeos, scrFrame, '#151a22')

  // ---- podium arcade band, both street faces (warm glow)
  const arcGeos = []
  const arcZ = rbox(5.2, 1.05, 0.1, 0.04)
  arcZ.translate(0, 0.95, 2.52)
  arcGeos.push(arcZ.toNonIndexed())
  const arcX = rbox(0.1, 1.05, 4.7, 0.04)
  arcX.translate(2.77, 0.95, 0)
  arcGeos.push(arcX.toNonIndexed())
  const arcMat = mat('#3a2a18', { roughness: 0.6 })
  markEmissive(arcMat, palette.lanternWarm, 1.0, 0.1)
  g.add(new THREE.Mesh(mergeGeometries(arcGeos), arcMat))

  // ---- corner sign column: 4 stacked squares, alternating neon (2 glow meshes)
  const colA = [], colB = []
  for (let k = 0; k < 4; k++) {
    const cg = rbox(0.85, 0.9, 0.22, 0.05)
    cg.rotateY(TAU / 8) // face out the +x/+z corner
    cg.translate(2.42, 3.35 + k * 1.12, 2.22)
    ;(k % 2 ? colB : colA).push(cg.toNonIndexed())
  }
  const beacon = rbox(0.16, 0.16, 0.16, 0.05) // mast tip beacon, shares pink glow mat
  beacon.translate(1.4, 9.47, 1.2)
  colA.push(beacon.toNonIndexed())
  const pinkMat = mat(shade(neon[0], -0.6), { roughness: 0.6 })
  markEmissive(pinkMat, neon[0], 1.2, 0.12)
  const tealMat = mat(shade(neon[1], -0.6), { roughness: 0.6 })
  markEmissive(tealMat, neon[1], 1.2, 0.12)
  g.add(new THREE.Mesh(mergeGeometries(colA), pinkMat))
  g.add(new THREE.Mesh(mergeGeometries(colB), tealMat))

  // ---- rooftop clutter + column pole (one painted metal mesh)
  const metalGeos = []
  const ac1 = rbox(1.2, 0.7, 0.95)
  ac1.translate(-1.2, 8.85, -1.0)
  add(metalGeos, ac1, palette.metal)
  const ac2 = rbox(0.85, 0.5, 0.8)
  ac2.translate(0.1, 8.75, -1.4)
  add(metalGeos, ac2, shade(palette.metal, -0.12))
  const mast1 = new THREE.CylinderGeometry(0.035, 0.06, 0.95, 6)
  mast1.translate(1.4, 8.97, 1.2)
  add(metalGeos, mast1, palette.metalDark)
  const mast2 = new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6)
  mast2.translate(0.5, 8.8, 1.5)
  add(metalGeos, mast2, palette.metalDark)
  const bar = strutGeo(new THREE.Vector3(1.4, 9.28, 1.2), new THREE.Vector3(0.5, 9.05, 1.5), 0.028)
  add(metalGeos, bar, palette.metalDark)
  const dish = new THREE.CylinderGeometry(0.42, 0.3, 0.16, 10)
  dish.rotateX(-0.5)
  dish.translate(-1.5, 8.75, 1.1)
  add(metalGeos, dish, palette.metal)
  for (let k = 0; k < 3; k++) { // dish cage
    const a = k * TAU / 3
    const s = strutGeo(
      new THREE.Vector3(-1.5 + Math.cos(a) * 0.45, 8.68, 1.1 + Math.sin(a) * 0.45),
      new THREE.Vector3(-1.5, 9.25, 1.1), 0.03)
    add(metalGeos, s, palette.metalDark)
  }
  const pole = new THREE.CylinderGeometry(0.045, 0.045, 4.7, 6)
  pole.translate(2.36, 4.95, 2.16)
  add(metalGeos, pole, palette.metalDark)

  const bodyMesh = new THREE.Mesh(mergeGeometries(bodyGeos), mat('#ffffff', { vertexColors: true }))
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  g.add(bodyMesh)
  const metalMesh = new THREE.Mesh(mergeGeometries(metalGeos), mat('#ffffff', { vertexColors: true, roughness: 0.55, metalness: 0.3 }))
  metalMesh.castShadow = true
  g.add(metalMesh)

  return {
    group: g,
    top: 9.55,
    obstacles: [{ x: 0, z: 0, hw: 3.0, hd: 2.8 }],
    animate: (t, nightT) => { scrTex.offset.y = (t * 0.05) % 1 }
  }
}

export function makeFuji() {
  const g = new THREE.Group()
  // lathe profile: gently concave volcano flank, truncated crater, small inner lip dip
  const pts = [
    [46, 0], [36, 4.5], [27, 10], [19, 16], [13, 21.5], [9, 26], [7, 29], [6.4, 30],
    [5.4, 29.3], [4.6, 28.9]
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const geo = new THREE.LatheGeometry(pts, 28).toNonIndexed()
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const cLow = new THREE.Color('#6f7fa3')
  const cMid = new THREE.Color('#7d8cb0')
  const snow = new THREE.Color('#f6f8fc')
  const snowDark = new THREE.Color('#dde4ee')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i += 3) {
    // color chosen per face (triangle centroid) -> crisp faceted snowline
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
    const a = Math.atan2(x, z)
    // angle-periodic jitter, max amplitude 1.8, seamless across the lathe seam
    const jitter = Math.sin(a * 5) * 0.9 + Math.sin(a * 11 + 1.7) * 0.6 + Math.sin(a * 3 - 0.6) * 0.3
    const rad = Math.hypot(x, z)
    if (y > 28.7 && rad < 6.1) c.copy(snowDark) // inside crater lip
    else if (y >= 19.5 + jitter) c.copy(snow)
    else c.copy(cLow).lerp(cMid, Math.min(y / 21, 1))
    for (let k = 0; k < 3; k++) {
      const o = (i + k) * 3
      colors[o] = c.r
      colors[o + 1] = c.g
      colors[o + 2] = c.b
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true, roughness: 1 }))
  mesh.castShadow = false
  mesh.receiveShadow = false
  g.add(mesh)
  return { group: g, top: 30, obstacles: [] }
}
