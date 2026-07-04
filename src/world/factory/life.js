import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { rbox, markEmissive, linColor, paint } from '../../util/geo.js'
import { TAU } from '../../util/math.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.7, metalness: 0, ...o })

// ── Rounded-rectangle loop (the ring-road circuit) ──────────────────────
function roundedRectLoop(hx, hz, rc) {
  const ix = hx - rc, iz = hz - rc
  const segs = []
  const line = (x0, z0, x1, z1) => segs.push({ t: 'l', x0, z0, x1, z1, len: Math.hypot(x1 - x0, z1 - z0) })
  const arc = (cx, cz, a0, a1) => segs.push({ t: 'a', cx, cz, a0, a1, len: Math.abs(a1 - a0) * rc })
  line(-ix, -hz, ix, -hz)
  arc(ix, -iz, -Math.PI / 2, 0)
  line(hx, -iz, hx, iz)
  arc(ix, iz, 0, Math.PI / 2)
  line(ix, hz, -ix, hz)
  arc(-ix, iz, Math.PI / 2, Math.PI)
  line(-hx, iz, -hx, -iz)
  arc(-ix, -iz, Math.PI, Math.PI * 1.5)
  let L = 0; for (const s of segs) { s.s0 = L; L += s.len }
  return {
    length: L,
    // writes into `out` — the render loop calls this per car per frame
    at(s, out) {
      s = ((s % L) + L) % L
      let seg = segs[segs.length - 1]
      for (const sg of segs) { if (s < sg.s0 + sg.len) { seg = sg; break } }
      const u = (s - seg.s0) / seg.len
      if (seg.t === 'l') {
        out.x = seg.x0 + (seg.x1 - seg.x0) * u
        out.z = seg.z0 + (seg.z1 - seg.z0) * u
        out.heading = Math.atan2(seg.x1 - seg.x0, seg.z1 - seg.z0)
        return out
      }
      const a = seg.a0 + (seg.a1 - seg.a0) * u
      out.x = seg.cx + Math.cos(a) * rc
      out.z = seg.cz + Math.sin(a) * rc
      out.heading = Math.atan2(-Math.sin(a), Math.cos(a))
      return out
    },
  }
}

// ── A cute low-poly car (forward = +Z) ──────────────────────────────────
// Two meshes per car (merged painted body + merged lights) sharing pooled
// materials — was ~10 meshes × 5 fresh materials each. Scaled 1.55 so sedans
// read LARGER than the player's go-kart (~2.35u vs the kart's ~2.3u length).
const carBodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 })
const carHlMat = (() => { const m = mat('#fff4d0'); markEmissive(m, '#fff0c0', 1.4, 0.1); return m })()
const carTlMat = (() => { const m = mat('#5a1010'); markEmissive(m, '#ff3b30', 1.2, 0.15); return m })()

function makeCar(color) {
  const g = new THREE.Group()
  const geos = []
  const add = (geo, hex) => { const n = geo.toNonIndexed ? geo.toNonIndexed() : geo; paint(n, hex); geos.push(n) }

  const body = rbox(0.84, 0.42, 1.5, 0.14); body.translate(0, 0.4, 0); add(body, color)
  const cabin = rbox(0.74, 0.4, 0.86, 0.12); cabin.translate(0, 0.74, -0.06); add(cabin, '#cfe0ea')
  for (const sx of [-0.36, 0.36]) for (const sz of [-0.5, 0.5]) {
    const w = new THREE.CylinderGeometry(0.19, 0.19, 0.12, 10)
    w.rotateZ(Math.PI / 2); w.translate(sx, 0.19, sz)
    add(w, palette.wheel)
  }
  const bodyMesh = new THREE.Mesh(mergeGeometries(geos, false), carBodyMat)
  bodyMesh.castShadow = true
  g.add(bodyMesh)

  const hl = [], tl = []
  for (const sx of [-0.26, 0.26]) {
    const h = new THREE.SphereGeometry(0.08, 8, 6); h.translate(sx, 0.4, 0.74); hl.push(h)
    const t = new THREE.SphereGeometry(0.07, 8, 6); t.translate(sx, 0.4, -0.76); tl.push(t)
  }
  g.add(new THREE.Mesh(mergeGeometries(hl, false), carHlMat))
  g.add(new THREE.Mesh(mergeGeometries(tl, false), carTlMat))

  g.scale.setScalar(1.55)
  return g
}

// ── Looping traffic: ring circuit cars + 2 avenue shuttles ──────────────
// Ring cars integrate their arc-length position (s += v·dt) and EASE TO A
// STOP when the player's vehicle is close ahead — the city acknowledges you.
export function makeTraffic({ hx = 22, hz = 22, corner = 5.5 } = {}) {
  const group = new THREE.Group()
  const loop = roundedRectLoop(hx, hz, corner)
  const carColors = [palette.accFillTeal, palette.accFillWarm, palette.accFillPink, '#d8d2c4', palette.domMutedBlue]
  const ring = []
  const RING_N = 5
  const CRUISE = 3.2
  for (let i = 0; i < RING_N; i++) {
    const car = makeCar(carColors[i % carColors.length])
    group.add(car)
    ring.push({ car, s: (loop.length / RING_N) * i, v: CRUISE })
  }
  // avenue shuttles: one toward Tokyo Tower (north), one toward Taipei 101
  const shuttleN = makeCar('#d8d2c4')
  const shuttleS = makeCar(palette.accFillWarm)
  group.add(shuttleN, shuttleS)

  const shuttle = (car, t, z0, z1, phase = 0) => {
    const period = 15, tt = ((t + phase) % period) / period
    const span = z1 - z0
    if (tt < 0.5) { car.position.set(1.7, 0, z0 + (tt / 0.5) * span); car.rotation.y = span > 0 ? 0 : Math.PI }
    else { car.position.set(-1.7, 0, z1 - ((tt - 0.5) / 0.5) * span); car.rotation.y = span > 0 ? Math.PI : 0 }
  }

  const P = { x: 0, z: 0, heading: 0 } // per-frame scratch (no allocation)
  let lastT = 0
  return {
    group,
    animate(t, cart) {
      const dt = Math.min(Math.max(t - lastT, 0), 0.1) // 0 when frozen (reduced motion)
      lastT = t
      for (const r of ring) {
        loop.at(r.s, P)
        // brake when the player is close and roughly ahead of the car
        let want = CRUISE
        if (cart) {
          const dx = cart.x - P.x, dz = cart.z - P.z
          const dist = Math.hypot(dx, dz)
          if (dist < 5 && dx * Math.sin(P.heading) + dz * Math.cos(P.heading) > dist * 0.4) want = 0
        }
        r.v += (want - r.v) * Math.min(1, dt * 4)
        r.s += r.v * dt
        r.car.position.set(P.x, 0, P.z)
        r.car.rotation.y = P.heading
      }
      shuttle(shuttleN, t, -9, -20)
      shuttle(shuttleS, t, 9, 20, 7.5)
    },
  }
}

// ── Instanced pedestrians (roundabout scramble + market + tower base) ───
export function makePedestrians() {
  const bodyGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.5, 6); bodyGeo.translate(0, 0.25, 0)
  const headGeo = new THREE.SphereGeometry(0.12, 8, 6); headGeo.translate(0, 0.62, 0)
  const geo = mergeGeometries([bodyGeo, headGeo], false)
  const clothes = ['#caa27a', '#8c98a6', '#b08a86', '#9aa890', '#c0b3a0', '#a98f9a', '#bfae8e']

  // every closure writes into OUT — zero allocation in the render loop
  const OUT = { x: 0, z: 0, face: 0, ph: 0 }
  const people = []
  // A — roundabout crosswalks (8): radial walk across the ring
  for (let i = 0; i < 8; i++) {
    const ang = (i % 4) * (Math.PI / 2), phase = i < 4 ? 0 : Math.PI
    people.push((t) => {
      const r = 6.0 + Math.sin(t * 0.7 + phase) * 1.9
      OUT.x = Math.cos(ang) * r; OUT.z = Math.sin(ang) * r; OUT.face = ang + Math.PI / 2; OUT.ph = i
      return OUT
    })
  }
  // B — night-market street (8): stroll the avenue flanks between the stalls.
  // Loop starts at z 9.2, past the Raohe gate pillars at (±4.0, 8.4) — the
  // old z=8 start marched them straight through the pillar every lap.
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 4.05 : -4.05, dir = i % 3 ? 1 : -1, base = i * 2.1
    people.push((t) => {
      OUT.x = side + Math.sin(t * 0.6 + i) * 0.18
      OUT.z = 9.2 + (((t * 0.65 * dir + base) % 10.3) + 10.3) % 10.3
      OUT.face = dir > 0 ? 0 : Math.PI; OUT.ph = i + 2
      return OUT
    })
  }
  // C — hero-tower gazers: Tokyo Tower (north) + Taipei 101 (south)
  const fixed = [[-1.6, -22.9, 0, 0], [1.6, -22.9, 0.4, 1.5], [-1.6, 22.9, Math.PI, 0.7], [1.6, 22.9, Math.PI - 0.4, 2.2]]
  for (const [fx, fz, ff, fp] of fixed) {
    people.push(() => { OUT.x = fx; OUT.z = fz; OUT.face = ff; OUT.ph = fp; return OUT })
  }
  // D — Fushimi pilgrims (2): pacing the torii tunnel on the west edge
  for (let i = 0; i < 2; i++) {
    const dir = i ? 1 : -1, base = i * 6
    people.push((t) => {
      OUT.x = -27 + Math.sin(t * 0.4 + i * 2) * 0.35
      OUT.z = -16 + (((t * 0.5 * dir + base) % 14) + 14) % 14
      OUT.face = dir > 0 ? 0 : Math.PI; OUT.ph = i + 5
      return OUT
    })
  }

  const N = people.length
  const mesh = new THREE.InstancedMesh(geo, mat('#b0a48c', { roughness: 0.85 }), N)
  mesh.castShadow = true; mesh.frustumCulled = false
  for (let i = 0; i < N; i++) mesh.setColorAt(i, linColor(clothes[i % clothes.length]))
  mesh.instanceColor.needsUpdate = true

  // 1.3 ⇒ ~0.96u ≈ 1.7m — people finally read right next to the kart/driver
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.3, 1.3, 1.3), p = new THREE.Vector3()
  const AWARE = 2.8   // peds step aside + face the vehicle inside this radius
  const HONK_R = 5.5  // horn/bell makes peds inside this radius hop
  return {
    mesh,
    // cart: {x, z} | null · honk: {x, z, t (same clock as t)} | null
    animate(t, cart, honk) {
      for (let i = 0; i < N; i++) {
        const d = people[i](t)
        let x = d.x, z = d.z, face = d.face
        let y = Math.abs(Math.sin(t * 5 + d.ph)) * 0.05
        if (cart) {
          const dx = x - cart.x, dz = z - cart.z
          const dist = Math.hypot(dx, dz)
          if (dist < AWARE && dist > 1e-3) {
            // step aside with falloff + turn toward the vehicle (they notice you)
            const push = (1 - dist / AWARE) * 0.6
            x += (dx / dist) * push
            z += (dz / dist) * push
            face = Math.atan2(-dx, -dz)
          }
        }
        if (honk) {
          const age = t - honk.t
          if (age >= 0 && age < 0.7) {
            const dist = Math.hypot(x - honk.x, z - honk.z)
            if (dist < HONK_R) {
              const k = 1 - dist / HONK_R
              y += Math.sin((age / 0.7) * Math.PI) * 0.34 * k // startled hop
            }
          }
        }
        p.set(x, y, z)
        q.setFromAxisAngle(UP, face)
        m.compose(p, q, s)
        mesh.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    },
  }
}
const UP = new THREE.Vector3(0, 1, 0)

// ── Drifting clouds (soft sprites, fade at night) ───────────────────────
export function makeClouds(n = 5) {
  const group = new THREE.Group()
  const tex = cloudTex()
  const clouds = []
  for (let i = 0; i < n; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.4, depthWrite: false, fog: false }))
    const scale = 10 + Math.random() * 10
    spr.scale.set(scale, scale * 0.55, 1)
    spr.position.set(-40 + Math.random() * 80, 20 + Math.random() * 8, -20 - Math.random() * 30)
    group.add(spr); clouds.push({ spr, speed: 0.25 + Math.random() * 0.3, phase: Math.random() * 92 })
  }
  // layer 1 (atmosphere) so GTAO ignores these sprites — sprites have no usable
  // normals/depth and otherwise produce a black rectangular AO artifact.
  group.traverse((o) => o.layers.set(1))
  return {
    group,
    animate(t, nightT = 0) {
      for (const c of clouds) {
        // time-parametric (frame-rate independent + freezes under reduced-motion)
        c.spr.position.x = -46 + ((t * c.speed + c.phase) % 92)
        c.spr.material.opacity = (1 - nightT) * 0.42 + 0.06
      }
    },
  }
}

function cloudTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const x = c.getContext('2d')
  for (let i = 0; i < 5; i++) {
    const cx = 30 + Math.random() * 68, cy = 50 + Math.random() * 30, r = 18 + Math.random() * 22
    const g = x.createRadialGradient(cx, cy, 2, cx, cy, r)
    g.addColorStop(0, 'rgba(255,250,242,0.9)'); g.addColorStop(1, 'rgba(255,250,242,0)')
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill()
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
