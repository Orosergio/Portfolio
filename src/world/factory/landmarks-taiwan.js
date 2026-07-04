import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { rbox, markEmissive, paint } from '../../util/geo.js'
import { rand, TAU } from '../../util/math.js'
import { strutGeo } from './landmarks.js'

// ── Taiwan district landmarks ────────────────────────────────────────────
// Procedural icons hosting projects: Taipei 101 (AI Wealth Lab), the Taipei
// Dome arena (Kiniela Mundial), Longshan Temple (Inmob Recovery), plus the
// drifting Pingxi sky lanterns that float over the district after dark.
// Contract: each returns { group, top, obstacles, animate? } in LOCAL coords.

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0, ...o })
const shade = (hex, amt) => {
  const c = new THREE.Color(hex)
  if (amt < 0) c.multiplyScalar(1 + amt); else c.lerp(new THREE.Color('#ffffff'), amt)
  return '#' + c.getHexString()
}
export function makeTaipei101() {
  const g = new THREE.Group()
  // helper: rotate/translate a geo then de-index it for safe merging
  const nix = (geo, x, y, z, ry = 0) => {
    if (ry) geo.rotateY(ry)
    geo.translate(x, y, z)
    return geo.toNonIndexed()
  }

  // -- pedestal: two slightly tapering tiers, 6x6 footprint, 3.2u tall
  const ped = new THREE.Mesh(mergeGeometries([
    nix(rbox(6, 2, 6, 0.18), 0, 1, 0),
    nix(rbox(5.2, 1.5, 5.2, 0.16), 0, 2.45, 0)
  ]), mat(shade(palette.domTaupe, -0.05), { roughness: 0.75 }))
  ped.castShadow = true
  ped.receiveShadow = true
  g.add(ped)

  // ground-level glass shopfront band, warm glow at night
  const shopMat = mat('#7a5632', { roughness: 0.4, metalness: 0.1 })
  markEmissive(shopMat, palette.towerLight, 0.9, 0.08)
  const shop = new THREE.Mesh(rbox(6.14, 0.9, 6.14, 0.1).toNonIndexed(), shopMat)
  shop.position.y = 0.55
  g.add(shop)

  // -- tower body: 8 inverted-trapezoid bamboo segments flaring upward
  const base = 3.2, segH = 2.05, rT = 2.15, rB = 1.7
  const bodyGeos = []
  for (let i = 0; i < 8; i++) {
    bodyGeos.push(nix(new THREE.CylinderGeometry(rT, rB, segH, 4, 1), 0, base + segH * (i + 0.5), 0, TAU / 8))
  }
  // 2-tier crown above segment 8 (tops out at 20.97)
  const crownBase = base + segH * 8
  bodyGeos.push(nix(new THREE.CylinderGeometry(1.12, 1.5, 0.75, 4, 1), 0, crownBase + 0.375, 0, TAU / 8))
  bodyGeos.push(nix(new THREE.CylinderGeometry(0.7, 1.02, 0.62, 4, 1), 0, crownBase + 0.75 + 0.31, 0, TAU / 8))
  const body = new THREE.Mesh(mergeGeometries(bodyGeos),
    mat(shade(palette.roofTeal, 0.05), { roughness: 0.35, metalness: 0.15 }))
  body.castShadow = true
  g.add(body)

  // -- lighter lip rings at every segment junction (ruyi bands)
  const lipGeos = []
  for (let i = 0; i <= 8; i++) {
    lipGeos.push(nix(new THREE.CylinderGeometry(2.24, 2.24, 0.13, 4, 1), 0, base + i * segH, 0, TAU / 8))
  }
  g.add(new THREE.Mesh(mergeGeometries(lipGeos), mat(shade(palette.metal, 0.2), { roughness: 0.6 })))

  // -- one emissive window ribbon per segment, merged into a single mesh
  const ribGeos = []
  const rAt = f => (rB + (rT - rB) * (f / segH)) * 1.035 // segment radius at local height f, pushed out
  for (let i = 0; i < 8; i++) {
    ribGeos.push(nix(new THREE.CylinderGeometry(rAt(1.4), rAt(0.9), 0.5, 4, 1), 0, base + i * segH + 1.15, 0, TAU / 8))
  }
  const ribMat = mat('#33434f', { roughness: 0.45, metalness: 0.1 })
  markEmissive(ribMat, '#cfe2ff', 0.85, 0.04)
  g.add(new THREE.Mesh(mergeGeometries(ribGeos), ribMat))

  // -- slim spire, two stacked thin cylinders (20.97 -> 23.37)
  const spire = new THREE.Mesh(mergeGeometries([
    nix(new THREE.CylinderGeometry(0.17, 0.26, 1.4, 6, 1), 0, 20.97 + 0.7, 0),
    nix(new THREE.CylinderGeometry(0.06, 0.14, 1, 6, 1), 0, 22.37 + 0.5, 0)
  ]), mat(palette.metalDark, { roughness: 0.5, metalness: 0.2 }))
  g.add(spire)

  // -- warm beacon at the tip
  const beaconMat = mat('#ff5a3a', { roughness: 0.4 })
  markEmissive(beaconMat, '#ff5a3a', 1.6, 0.3)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), beaconMat)
  beacon.position.y = 23.37
  g.add(beacon)

  return {
    group: g,
    top: 23.5,
    obstacles: [{ x: 0, z: 0, hw: 3.2, hd: 3.2 }],
    animate: (t, nightT) => {
      beacon.material.emissiveIntensity = 0.3 + (0.4 + 0.6 * nightT) * (0.6 + 0.4 * Math.sin(t * 4))
    }
  }
}

export function makeStadium() {
  const g = new THREE.Group()
  const RX = 6.37, RZ = 4.9, DRUM_H = 3.2
  const cream = palette.domSandCream
  const prep = (geo, hex) => {
    const out = geo.toNonIndexed()
    paint(out, hex)
    return out
  }

  // --- bowl: pad + drum (split so the concourse band reads recessed) + ribs + portal, ONE vertex-colored mesh
  const body = []
  const pad = new THREE.CylinderGeometry(5.0, 5.15, 0.22, 24)
  pad.scale(1.3, 1, 1)
  pad.translate(0, 0.11, 0)
  body.push(prep(pad, palette.plaza))
  const drumSeg = (r, y0, h, hex) => {
    const c = new THREE.CylinderGeometry(r, r, h, 24)
    c.scale(1.3, 1, 1)
    c.translate(0, y0 + h / 2, 0)
    body.push(prep(c, hex))
  }
  drumSeg(RZ, 0, 0.95, cream)
  drumSeg(RZ * 0.93, 0.95, 0.55, shade(cream, -0.45)) // dark recessed concourse band
  drumSeg(RZ, 1.5, DRUM_H - 1.5, cream)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU
    const rib = rbox(0.34, 3.0, 0.34, 0.08).toNonIndexed()
    rib.rotateY(-a)
    rib.translate(Math.cos(a) * (RX + 0.08), 1.55, Math.sin(a) * (RZ + 0.08))
    paint(rib, shade(cream, -0.12))
    body.push(rib)
  }
  const portal = rbox(3.4, 2.6, 0.95, 0.13).toNonIndexed()
  portal.translate(0, 1.3, -5.05)
  paint(portal, shade(cream, 0.06))
  body.push(portal)
  const door = rbox(1.7, 1.5, 0.3, 0.08).toNonIndexed() // dark doorway inset
  door.translate(0, 0.78, -5.42)
  paint(door, '#3a3230')
  body.push(door)
  const bodyMesh = new THREE.Mesh(mergeGeometries(body), mat('#ffffff', { vertexColors: true }))
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  g.add(bodyMesh)

  // --- squashed dome roof
  const dome = new THREE.SphereGeometry(RZ, 24, 10, 0, TAU, 0, Math.PI / 2)
  dome.scale(1.3, 0.45, 1)
  const domeMesh = new THREE.Mesh(dome, mat('#d9b24a', { metalness: 0.25, roughness: 0.5 }))
  domeMesh.position.y = DRUM_H - 0.05
  domeMesh.castShadow = true
  g.add(domeMesh)

  // --- warm glow: dome rim ring + entrance band, ONE emissive mesh
  const glow = []
  const rim = new THREE.TorusGeometry(RZ - 0.02, 0.09, 6, 40).toNonIndexed()
  rim.rotateX(Math.PI / 2)
  rim.scale(1.3, 1, 1)
  rim.translate(0, DRUM_H, 0)
  glow.push(rim)
  const band = rbox(2.3, 0.32, 0.14, 0.05).toNonIndexed()
  band.translate(0, 2.15, -5.55)
  glow.push(band)
  const glowMat = mat('#5a4423', { roughness: 0.5 })
  markEmissive(glowMat, palette.lanternWarm, 0.9, 0.03)
  g.add(new THREE.Mesh(mergeGeometries(glow), glowMat))

  // --- floodlight masts (poles + head panels) + flag poles + flags, ONE vertex-colored mesh
  const struct = []
  const flood = []
  const tilt = 0.12
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const bx = sx * 7.3, bz = sz * 5.8
    const rz = sx * tilt, rx = -sz * tilt // lean top toward the field
    const pole = new THREE.CylinderGeometry(0.06, 0.1, 6.5, 6).toNonIndexed()
    pole.translate(0, 3.25, 0)
    pole.rotateZ(rz)
    pole.rotateX(rx)
    pole.translate(bx, 0, bz)
    paint(pole, palette.metalDark)
    struct.push(pole)
    const tip = new THREE.Vector3(0, 6.4, 0)
    tip.applyAxisAngle(new THREE.Vector3(0, 0, 1), rz)
    tip.applyAxisAngle(new THREE.Vector3(1, 0, 0), rx)
    tip.x += bx
    tip.z += bz
    const yaw = Math.atan2(-tip.x, -tip.z) // panel faces the pitch, angled down
    const m = new THREE.Matrix4().makeTranslation(tip.x, tip.y, tip.z)
      .multiply(new THREE.Matrix4().makeRotationY(yaw))
      .multiply(new THREE.Matrix4().makeRotationX(0.4))
    const panel = rbox(0.85, 0.6, 0.16, 0.05).toNonIndexed()
    panel.applyMatrix4(m)
    paint(panel, shade(palette.metalDark, -0.2))
    struct.push(panel)
    for (const ox of [-0.19, 0.19]) for (const oy of [-0.13, 0.13]) {
      const s = new THREE.SphereGeometry(0.11, 6, 5).toNonIndexed()
      s.applyMatrix4(new THREE.Matrix4().copy(m).multiply(new THREE.Matrix4().makeTranslation(ox, oy, 0.1)))
      flood.push(s)
    }
  }
  const flagCols = [palette.accFillTeal, palette.accFillPink]
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1
    const fp = new THREE.CylinderGeometry(0.045, 0.045, 3.1, 6).toNonIndexed()
    fp.translate(s * 2.35, 1.55, -5.75)
    paint(fp, palette.metal)
    struct.push(fp)
    const fl = rbox(0.72, 0.44, 0.06, 0.03).toNonIndexed()
    fl.rotateY(Math.PI / 2)
    fl.translate(s * 2.35, 2.8, -6.13)
    paint(fl, flagCols[i])
    struct.push(fl)
  }
  g.add(new THREE.Mesh(mergeGeometries(struct), mat('#ffffff', { vertexColors: true, roughness: 0.6 })))

  const floodMat = mat('#233240', { roughness: 0.4 })
  markEmissive(floodMat, '#eaf4ff', 1.3, 0.0)
  g.add(new THREE.Mesh(mergeGeometries(flood), floodMat))

  return {
    group: g,
    top: 7.4,
    obstacles: [
      { x: 0, z: 0, hw: 6.7, hd: 5.2 },
      { x: 7.3, z: 5.8, hw: 0.3, hd: 0.3 },
      { x: -7.3, z: 5.8, hw: 0.3, hd: 0.3 },
      { x: 7.3, z: -5.8, hw: 0.3, hd: 0.3 },
      { x: -7.3, z: -5.8, hw: 0.3, hd: 0.3 },
    ],
  }
}

export function makeLongshan() {
  const g = new THREE.Group()
  const S = [], R = [], G = [], W = [], B = []
  const push = (arr, geo, hex, x, y, z) => {
    if (hex) paint(geo, hex)
    geo.translate(x, y, z)
    arr.push(geo.toNonIndexed())
  }

  // stone courtyard slab
  const floor = new THREE.Mesh(rbox(9, 0.2, 7, 0.07), mat(palette.plaza, { roughness: 0.9 }))
  floor.position.y = 0.1
  floor.receiveShadow = true
  g.add(floor)

  // perimeter wall, 2.6u gate gap on -z
  const wy = 0.2 + 0.45
  push(W, rbox(8.9, 0.9, 0.26, 0.08), null, 0, wy, 3.35)
  push(W, rbox(0.26, 0.9, 6.7, 0.08), null, -4.37, wy, 0)
  push(W, rbox(0.26, 0.9, 6.7, 0.08), null, 4.37, wy, 0)
  push(W, rbox(3.05, 0.9, 0.26, 0.08), null, -2.83, wy, -3.35)
  push(W, rbox(3.05, 0.9, 0.26, 0.08), null, 2.83, wy, -3.35)
  const walls = new THREE.Mesh(mergeGeometries(W), mat(shade(palette.domTerracotta, -0.1)))
  walls.receiveShadow = true
  g.add(walls)

  // halls + columns + plinth: one painted mesh
  const red = '#a83f30'
  push(S, rbox(6, 2.6, 1.9), red, 0, 1.5, -2.35)
  for (const cx of [-2.55, -0.95, 0.95, 2.55])
    push(S, new THREE.CylinderGeometry(0.16, 0.18, 2.3, 8), palette.torii, cx, 1.35, -3.42)
  push(S, rbox(5.8, 0.5, 3.8, 0.1), shade(palette.plaza, -0.18), 0, 0.45, 1.0)
  push(S, rbox(5, 3.2, 3), red, 0, 2.3, 1.0)
  for (const cx of [-2.2, -0.9, 0.9, 2.2])
    push(S, new THREE.CylinderGeometry(0.17, 0.19, 2.9, 8), palette.torii, cx, 2.15, -0.68)
  const struct = new THREE.Mesh(mergeGeometries(S), mat('#ffffff', { vertexColors: true }))
  struct.castShadow = true
  struct.receiveShadow = true
  g.add(struct)

  // swallow-tail roof: sagging planes, curved ridge, gold upswept forked horns
  const dark = shade(palette.roofTeal, -0.25)
  const roof = (cx, cz, topY, w, halfRun, rise) => {
    const a = Math.atan2(rise, halfRun)
    const len = Math.hypot(halfRun, rise) + 0.25
    const eaveY = topY - 0.12
    for (const s of [-1, 1]) {
      const p = rbox(w, 0.14, len, 0.06)
      p.rotateX(s * a)
      push(R, p, palette.roofTeal, cx, eaveY + rise / 2, cz + s * halfRun / 2)
    }
    const ry = eaveY + rise + 0.06
    push(R, rbox(w * 0.55, 0.16, 0.26, 0.06), dark, cx, ry, cz)
    for (const s of [-1, 1]) {
      const e = rbox(w * 0.26, 0.14, 0.24, 0.06)
      e.rotateZ(s * 0.22)
      push(R, e, dark, cx + s * w * 0.36, ry + 0.08, cz)
      const h1 = rbox(0.8, 0.1, 0.16, 0.04)
      h1.rotateZ(s * 0.55)
      push(G, h1, null, cx + s * w * 0.48, ry + 0.32, cz)
      const h2 = rbox(0.42, 0.08, 0.12, 0.03)
      h2.rotateZ(s * 1.0)
      push(G, h2, null, cx + s * (w * 0.48 + 0.34), ry + 0.6, cz)
    }
    return ry
  }
  roof(0, -2.35, 2.8, 6.9, 1.5, 0.9)
  const ry2 = roof(0, 1.0, 3.9, 6.1, 2.1, 1.25)

  // dragon-silhouette finial stacks flanking a center pearl on the main ridge
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      push(G, rbox(0.13, 0.17, 0.12, 0.03), null, s * (0.42 - i * 0.07), ry2 + 0.12 + i * 0.15, 1.0)
  push(G, new THREE.ConeGeometry(0.13, 0.32, 6), null, 0, ry2 + 0.22, 1.0)

  const roofs = new THREE.Mesh(mergeGeometries(R), mat('#ffffff', { vertexColors: true, roughness: 0.7 }))
  roofs.castShadow = true
  g.add(roofs)
  g.add(new THREE.Mesh(mergeGeometries(G), mat('#d9b24a', { roughness: 0.5, metalness: 0.2 })))

  // warm glowing door/window bays between columns, both halls
  for (const bx of [-1.75, 0, 1.75]) push(B, rbox(1.15, 1.6, 0.12, 0.05), null, bx, 1.25, -3.33)
  for (const bx of [-1.55, 0, 1.55]) push(B, rbox(1.0, 1.7, 0.12, 0.05), null, bx, 1.7, -0.52)
  const bayMat = mat('#6e4a26', { roughness: 0.55 })
  markEmissive(bayMat, palette.lanternWarm, 1.0, 0.05)
  g.add(new THREE.Mesh(mergeGeometries(B), bayMat))

  // red lantern row strung across the front
  const row = new THREE.Group()
  const L = []
  for (let i = 0; i < 7; i++) {
    const s = new THREE.SphereGeometry(0.15, 8, 6)
    s.scale(1, 1.15, 1)
    // gentle catenary: center hangs lowest
    s.translate(-2.7 + i * 0.9, 2.0 + Math.abs(i - 3) * 0.06, 0)
    L.push(s.toNonIndexed())
  }
  const lanternMat = mat(palette.lantern, { roughness: 0.5 })
  markEmissive(lanternMat, palette.lantern, 1.3, 0.1)
  row.add(new THREE.Mesh(mergeGeometries(L), lanternMat))
  row.add(new THREE.Mesh(
    strutGeo(new THREE.Vector3(-3.1, 2.32, 0), new THREE.Vector3(3.1, 2.32, 0), 0.03),
    mat(palette.metalDark)
  ))
  row.position.set(0, 0, -3.55)
  g.add(row)

  // incense burner + glowing embers, center of the courtyard front
  const U = []
  push(U, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 10), null, 0, 0.49, 0)
  push(U, new THREE.CylinderGeometry(0.05, 0.17, 0.14, 10), null, 0, 0.71, 0)
  for (let i = 0; i < 3; i++) {
    const ang = i / 3 * TAU
    push(U, new THREE.CylinderGeometry(0.03, 0.04, 0.16, 6), null, Math.cos(ang) * 0.12, 0.28, Math.sin(ang) * 0.12)
  }
  const burner = new THREE.Mesh(mergeGeometries(U), mat(shade(palette.metalDark, -0.35)))
  burner.position.set(0, 0, -1.15)
  g.add(burner)
  const emberMat = mat('#5a2a16', { roughness: 0.6 })
  markEmissive(emberMat, palette.lanternWarm, 0.8, 0.1)
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), emberMat)
  ember.position.set(0, 0.8, -1.15)
  g.add(ember)

  const animate = (t) => {
    row.position.y = Math.sin(t * 1.6) * 0.05
  }

  return {
    group: g,
    top: 5.95,
    obstacles: [
      { x: 0, z: 0.8, hw: 4.6, hd: 2.8 },
      { x: 0, z: -2.6, hw: 3.2, hd: 1.3 },
      // perimeter walls (the two boxes above left the front corners open —
      // the kart could clip through the 0.9u wall); gate gap stays drivable
      { x: -4.37, z: 0, hw: 0.15, hd: 3.35 },
      { x: 4.37, z: 0, hw: 0.15, hd: 3.35 },
      { x: -2.83, z: -3.35, hw: 1.53, hd: 0.15 },
      { x: 2.83, z: -3.35, hw: 1.53, hd: 0.15 },
    ],
    animate
  }
}

// ── Raohe-style night-market entrance arch ───────────────────────────────
// Spans the southern avenue (the existing stall street runs behind it), so
// the visitor literally drives through the landmark. Red paifang pillars,
// swallow-tail tiled roof, a glowing 夜市 sign and hanging lanterns.
export function makeMarketGate() {
  const g = new THREE.Group()
  const PX = 4.0 // pillar x offset — clears the 6.5u avenue
  const vcol = mat('#ffffff', { vertexColors: true, roughness: 0.75 })
  const put = (arr, geo, hex, x, y, z, rx = 0, rz = 0) => {
    if (rx) geo.rotateX(rx)
    if (rz) geo.rotateZ(rz)
    geo.translate(x, y, z)
    const n = geo.toNonIndexed()
    if (hex) paint(n, hex)
    arr.push(n)
  }

  // ---- red structure: pillars + double crossbeams (one mesh)
  const red = []
  for (const s of [-1, 1]) {
    put(red, new THREE.CylinderGeometry(0.26, 0.32, 4.6, 10), null, s * PX, 2.3, 0)
    put(red, new THREE.CylinderGeometry(0.14, 0.17, 3.6, 8), null, s * (PX - 0.7), 1.8, 0)
  }
  const redMesh = new THREE.Mesh(mergeGeometries(red), mat(palette.torii, { roughness: 0.6 }))
  redMesh.castShadow = true
  g.add(redMesh)

  // ---- painted statics: stone bases, beams, gold trim (one mesh)
  const st = []
  for (const s of [-1, 1]) {
    put(st, new THREE.CylinderGeometry(0.42, 0.5, 0.5, 10), shade(palette.plaza, -0.12), s * PX, 0.25, 0)
    put(st, new THREE.CylinderGeometry(0.24, 0.28, 0.3, 8), shade(palette.plaza, -0.2), s * (PX - 0.7), 0.15, 0)
  }
  put(st, rbox(2 * PX + 1.3, 0.5, 0.66, 0.08), '#2e2a2e', 0, 4.75, 0)         // main charcoal beam
  put(st, rbox(2 * PX + 0.6, 0.3, 0.5, 0.06), shade(palette.torii, -0.15), 0, 4.28, 0) // lower red beam
  put(st, rbox(2 * PX + 1.0, 0.12, 0.72, 0.04), shade(palette.lanternWarm, -0.12), 0, 5.06, 0) // gold trim
  g.add(new THREE.Mesh(mergeGeometries(st), vcol))

  // ---- swallow-tail roof over the center + pillar caps (one mesh)
  const R = []
  const dark = shade(palette.roofTeal, -0.25)
  const a = Math.atan2(0.85, 1.05)
  for (const s of [-1, 1]) {
    const p = rbox(5.6, 0.14, 1.5, 0.06)
    p.rotateX(s * a)
    put(R, p, palette.roofTeal, 0, 5.6 + 0.42, s * 0.7)
  }
  put(R, rbox(3.2, 0.16, 0.3, 0.06), dark, 0, 6.5, 0) // ridge
  for (const s of [-1, 1]) { // upswept gold horns
    const h1 = rbox(0.8, 0.1, 0.16, 0.04)
    h1.rotateZ(s * 0.55)
    put(R, h1, '#d9b24a', s * 2.9, 6.15, 0)
    const h2 = rbox(0.42, 0.08, 0.12, 0.03)
    h2.rotateZ(s * 1.0)
    put(R, h2, '#d9b24a', s * 3.25, 6.42, 0)
    // small tiled caps over each pillar
    const cap = rbox(1.3, 0.12, 1.1, 0.05)
    put(R, cap, palette.roofTeal, s * PX, 4.62, 0)
  }
  const roof = new THREE.Mesh(mergeGeometries(R), vcol)
  roof.castShadow = true
  g.add(roof)

  // ---- glowing 夜市 sign (canvas texture, emissive at night)
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const x = c.getContext('2d')
  x.fillStyle = '#1a1020'
  x.fillRect(0, 0, 256, 128)
  x.strokeStyle = '#ffb347'; x.lineWidth = 6
  x.strokeRect(6, 6, 244, 116)
  x.textAlign = 'center'
  x.fillStyle = '#ff5a4d'
  x.font = "bold 62px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
  x.fillText('夜市', 128, 66)
  x.fillStyle = '#ffe9c9'
  x.font = "700 24px 'Inter Tight', system-ui, sans-serif"
  x.fillText('RAOHE ST. MARKET', 128, 104)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const signMat = mat('#ffffff', { map: tex, emissiveMap: tex, roughness: 0.5 })
  markEmissive(signMat, '#ffffff', 1.25, 0.2)
  // y 5.77 / h 1.25: bottom edge (5.145) clears the gold trim top (5.12) and
  // the top (6.395) stays under the ridge (6.42) — at y 5.5 × 1.45 the whole
  // subtitle third sat buried inside the crossbeam
  const sign = new THREE.Mesh(rbox(2.9, 1.25, 0.16, 0.04).toNonIndexed(), signMat)
  sign.position.set(0, 5.77, 0.02)
  g.add(sign)

  // ---- hanging red lanterns (sway together)
  const sway = new THREE.Group()
  const L = []
  for (const lx of [-2.9, -2.1, 2.1, 2.9]) {
    const s = new THREE.SphereGeometry(0.2, 8, 6)
    s.scale(1, 1.2, 1)
    s.translate(lx, 3.85, 0)
    L.push(s.toNonIndexed())
    const cord = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5)
    cord.translate(lx, 4.2, 0)
    L.push(cord.toNonIndexed())
  }
  const lanMat = mat(palette.lantern, { roughness: 0.5 })
  markEmissive(lanMat, palette.lantern, 1.35, 0.12)
  sway.add(new THREE.Mesh(mergeGeometries(L), lanMat))
  g.add(sway)

  return {
    group: g,
    top: 6.8,
    obstacles: [
      { x: -PX, z: 0, hw: 0.6, hd: 0.6 },
      { x: PX, z: 0, hw: 0.6, hd: 0.6 },
    ],
    animate: (t) => { sway.rotation.z = Math.sin(t * 0.8 + 1.3) * 0.018 },
  }
}

export function makeSkyLanterns(n = 12) {
  const g = new THREE.Group()

  // paper body — taper the rounded box so it's wide at the crown, pinched at the mouth
  const body = rbox(0.55, 0.75, 0.55, 0.12).toNonIndexed()
  const bp = body.attributes.position
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i)
    const s = 0.74 + 0.26 * ((y + 0.375) / 0.75)
    bp.setX(i, bp.getX(i) * s)
    bp.setZ(i, bp.getZ(i) * s)
  }
  body.translate(0, 0.42, 0)
  body.computeVertexNormals()
  paint(body, '#e8a25a')

  // tiny dark bamboo collar at the mouth
  const collar = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10).toNonIndexed()
  collar.translate(0, 0.05, 0)
  paint(collar, '#4a3226')

  const geo = mergeGeometries([body, collar])
  const paper = mat('#ffffff', { vertexColors: true, roughness: 0.65, transparent: true })
  markEmissive(paper, '#ffb347', 1.45, 0.06)

  const mesh = new THREE.InstancedMesh(geo, paper, n)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.castShadow = false
  g.add(mesh)
  g.traverse(o => o.layers.set(1))

  const data = []
  for (let i = 0; i < n; i++) {
    data.push({
      bx: rand(-13, 13),
      bz: rand(7, 20),
      speed: rand(0.55, 0.85),
      phase: rand(0, 14),
      spin: rand(0.15, 0.4) * (rand(0, 1) > 0.5 ? 1 : -1),
      size: rand(0.85, 1.2)
    })
  }

  const dummy = new THREE.Object3D()
  const animate = (t, nightT) => {
    paper.opacity = 0.25 + 0.75 * nightT
    for (let i = 0; i < n; i++) {
      const d = data[i]
      const cyc = (t * d.speed + d.phase) % 14
      // shrink in/out at the loop seams so the respawn never pops
      const fade = Math.min(1, cyc * 1.4, (14 - cyc) * 0.8)
      dummy.position.set(
        d.bx + Math.sin(t * 0.5 + i) * 0.4,
        3.5 + cyc,
        d.bz + Math.cos(t * 0.42 + i * 1.7) * 0.4
      )
      dummy.rotation.set(0, t * d.spin + i * 1.3, 0)
      dummy.scale.setScalar(d.size * Math.max(0.001, fade))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  animate(0, 0)

  return { group: g, top: 18, obstacles: [], animate }
}
