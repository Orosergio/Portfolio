import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { rbox, markEmissive, linColor } from '../../util/geo.js'
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
    at(s) {
      s = ((s % L) + L) % L
      let seg = segs[segs.length - 1]
      for (const sg of segs) { if (s < sg.s0 + sg.len) { seg = sg; break } }
      const u = (s - seg.s0) / seg.len
      if (seg.t === 'l') {
        return { x: seg.x0 + (seg.x1 - seg.x0) * u, z: seg.z0 + (seg.z1 - seg.z0) * u, heading: Math.atan2(seg.x1 - seg.x0, seg.z1 - seg.z0) }
      }
      const a = seg.a0 + (seg.a1 - seg.a0) * u
      return { x: seg.cx + Math.cos(a) * rc, z: seg.cz + Math.sin(a) * rc, heading: Math.atan2(-Math.sin(a), Math.cos(a)) }
    },
  }
}

// ── A cute low-poly car (forward = +Z) ──────────────────────────────────
function makeCar(color) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(rbox(0.84, 0.42, 1.5, 0.14), mat(color, { roughness: 0.5, metalness: 0.1 }))
  body.position.y = 0.4; body.castShadow = true; g.add(body)
  const cabin = new THREE.Mesh(rbox(0.74, 0.4, 0.86, 0.12), mat('#cfe0ea', { roughness: 0.2, metalness: 0.1 }))
  cabin.position.set(0, 0.74, -0.06); cabin.castShadow = true; g.add(cabin)
  const wheelMat = mat(palette.wheel, { roughness: 0.7 })
  for (const sx of [-0.36, 0.36]) for (const sz of [-0.5, 0.5]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 10), wheelMat)
    w.rotation.z = Math.PI / 2; w.position.set(sx, 0.19, sz); g.add(w)
  }
  const hl = mat('#fff4d0'); markEmissive(hl, '#fff0c0', 1.4, 0.1)
  for (const sx of [-0.26, 0.26]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), hl)
    l.position.set(sx, 0.4, 0.74); g.add(l)
  }
  const tl = mat('#5a1010'); markEmissive(tl, '#ff3b30', 1.2, 0.15)
  for (const sx of [-0.26, 0.26]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), tl)
    l.position.set(sx, 0.4, -0.76); g.add(l)
  }
  return g
}

// ── Looping traffic: ring circuit cars + 1 avenue shuttle ───────────────
export function makeTraffic() {
  const group = new THREE.Group()
  const loop = roundedRectLoop(15, 15, 4.2)
  const carColors = [palette.accFillTeal, palette.accFillWarm, palette.accFillPink, '#d8d2c4']
  const ring = []
  const RING_N = 3
  for (let i = 0; i < RING_N; i++) {
    const car = makeCar(carColors[i % carColors.length])
    group.add(car)
    ring.push({ car, s0: (loop.length / RING_N) * i, speed: 3.0, lane: 1.3 })
  }
  // avenue shuttle (always pulling the eye toward the Tower)
  const avCar = makeCar(carColors[3])
  group.add(avCar)

  return {
    group,
    animate(t) {
      for (const r of ring) {
        const p = loop.at(r.s0 + t * r.speed)
        r.car.position.set(p.x, 0, p.z)
        r.car.rotation.y = p.heading
      }
      const period = 13, tt = (t % period) / period
      let z, heading, x
      if (tt < 0.5) { z = -6 + (tt / 0.5) * -12; heading = Math.PI; x = 1.7 }
      else { z = -18 + ((tt - 0.5) / 0.5) * 12; heading = 0; x = -1.7 }
      avCar.position.set(x, 0, z); avCar.rotation.y = heading
    },
  }
}

// ── Instanced pedestrians (roundabout scramble + market + tower base) ───
export function makePedestrians() {
  const bodyGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.5, 6); bodyGeo.translate(0, 0.25, 0)
  const headGeo = new THREE.SphereGeometry(0.12, 8, 6); headGeo.translate(0, 0.62, 0)
  const geo = mergeGeometries([bodyGeo, headGeo], false)
  const clothes = ['#caa27a', '#8c98a6', '#b08a86', '#9aa890', '#c0b3a0', '#a98f9a', '#bfae8e']

  const people = []
  // A — roundabout crosswalks (8): radial walk across the ring
  for (let i = 0; i < 8; i++) {
    const ang = (i % 4) * (Math.PI / 2), phase = i < 4 ? 0 : Math.PI
    people.push((t) => {
      const r = 5.6 + Math.sin(t * 0.7 + phase) * 1.7
      return { x: Math.cos(ang) * r, z: Math.sin(ang) * r, face: ang + Math.PI / 2, ph: i }
    })
  }
  // B — night-market lane (8): drift along x between the stalls
  for (let i = 0; i < 8; i++) {
    const zoff = 11.4 + (i % 4) * 1.3, dir = i % 2 ? 1 : -1, base = i * 3.3
    people.push((t) => {
      const x = -13 + (((t * 0.7 * dir + base) % 26) + 26) % 26
      return { x, z: zoff + Math.sin(t * 0.6 + i) * 0.2, face: dir > 0 ? Math.PI / 2 : -Math.PI / 2, ph: i + 2 }
    })
  }
  // C — tower base (2): gazing up
  people.push((t) => ({ x: -1.6, z: -18.4, face: 0, ph: 0 }))
  people.push((t) => ({ x: 1.6, z: -18.4, face: 0, ph: 1.5 }))

  const N = people.length
  const mesh = new THREE.InstancedMesh(geo, mat('#b0a48c', { roughness: 0.85 }), N)
  mesh.castShadow = true; mesh.frustumCulled = false
  for (let i = 0; i < N; i++) mesh.setColorAt(i, linColor(clothes[i % clothes.length]))
  mesh.instanceColor.needsUpdate = true

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3()
  return {
    mesh,
    animate(t) {
      for (let i = 0; i < N; i++) {
        const d = people[i](t)
        p.set(d.x, Math.abs(Math.sin(t * 5 + d.ph)) * 0.05, d.z)
        q.setFromAxisAngle(UP, d.face)
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
