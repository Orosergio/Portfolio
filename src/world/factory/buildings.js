import * as THREE from 'three'
import { palette } from '../palette.js'
import { rbox, markEmissive } from '../../util/geo.js'
import { pick } from '../../util/math.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.8, metalness: 0, ...o })
const shade = (hex, amt) => {
  const c = new THREE.Color(hex)
  if (amt < 0) c.multiplyScalar(1 + amt)
  else c.lerp(new THREE.Color('#ffffff'), amt)
  return '#' + c.getHexString()
}

// shared materials (one instance each → DayNight lights them once)
const glassMat = (() => { const m = mat(palette.glass, { roughness: 0.28, metalness: 0.12 }); markEmissive(m, '#ffd49a', 0.5, 0.0); return m })()
const metalMat = mat(palette.metal, { roughness: 0.5, metalness: 0.35 })
const metalDarkMat = mat(palette.metalDark, { roughness: 0.6 })
const darkMat = mat('#1a1320')

// curtain-wall facade: corner pilasters + recessed glass + protruding floor slabs
function facade(g, w, d, y0, h, accMat) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(rbox(0.55, h, 0.55, 0.1), accMat)
    p.position.set(sx * (w / 2 - 0.27), y0 + h / 2, sz * (d / 2 - 0.27)); p.castShadow = true; p.receiveShadow = true
    g.add(p)
  }
  const glass = new THREE.Mesh(rbox(w - 0.5, h - 0.2, d - 0.5, 0.08), glassMat)
  glass.position.y = y0 + h / 2; g.add(glass)
  const floors = Math.max(2, Math.round(h / 1.7))
  for (let i = 1; i < floors; i++) {
    const slab = new THREE.Mesh(rbox(w + 0.14, 0.18, d + 0.14, 0.06), accMat)
    slab.position.y = y0 + (h * i) / floors; slab.castShadow = true
    g.add(slab)
  }
}

function shopfront(g, pw, pd, accent) {
  const fz = pd / 2
  const glass = new THREE.Mesh(rbox(pw - 0.7, 1.1, 0.14, 0.05), glassMat)
  glass.position.set(0, 1.0, fz - 0.04); g.add(glass)
  const door = new THREE.Mesh(rbox(0.9, 1.4, 0.16, 0.05), darkMat)
  door.position.set(pw * 0.22, 0.75, fz + 0.02); g.add(door)
  const awn = new THREE.Mesh(rbox(pw, 0.12, 1.0, 0.04), mat(pick(palette.awning), { roughness: 0.7 }))
  awn.position.set(0, 1.78, fz + 0.34); awn.rotation.x = -0.34; awn.castShadow = true; g.add(awn)
  const sm = mat('#14101c'); markEmissive(sm, pick(palette.signNeon), 1.1, 0.18)
  const sign = new THREE.Mesh(rbox(pw - 1.1, 0.5, 0.12, 0.05), sm)
  sign.position.set(-pw * 0.08, 2.05, fz + 0.05); g.add(sign)
}

function rooftop(g, fw, fd, y, accent) {
  const para = new THREE.Mesh(rbox(fw + 0.2, 0.45, fd + 0.2, 0.08), mat(shade(accent, -0.16)))
  para.position.y = y + 0.22; para.castShadow = true; g.add(para)
  // water tank on legs
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.95, 12), metalMat)
  tank.position.set(fw * 0.22, y + 1.05, -fd * 0.18); tank.castShadow = true; g.add(tank)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), metalDarkMat)
    leg.position.set(fw * 0.22 + sx * 0.4, y + 0.5, -fd * 0.18 + sz * 0.4); g.add(leg)
  }
  // AC units
  for (let i = 0; i < 2; i++) {
    const ac = new THREE.Mesh(rbox(0.85, 0.5, 0.65, 0.06), metalMat)
    ac.position.set(-fw * 0.26 + i * 0.62, y + 0.45, fd * 0.22); ac.castShadow = true; g.add(ac)
  }
  // stair penthouse
  const pent = new THREE.Mesh(rbox(1.3, 1.05, 1.3, 0.1), mat(shade(accent, 0.08)))
  pent.position.set(-fw * 0.16, y + 0.72, -fd * 0.2); pent.castShadow = true; g.add(pent)
  // antenna + red light
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.9, 6), metalDarkMat)
  ant.position.set(fw * 0.1, y + 1.35, 0); g.add(ant)
  const lm = mat('#7a1a10'); markEmissive(lm, '#ff4d4d', 1.4, 0.3)
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lm)
  light.position.set(fw * 0.1, y + 2.35, 0); g.add(light)
}

// ── A composed, rounded project tower ──────────────────────────────────
export function makeLandmark(project, baseW = 4.6) {
  const g = new THREE.Group()
  const accent = project.accent, h = project.height
  const w = baseW, d = baseW
  const accMat = mat(accent, { roughness: 0.78 })
  const podMat = mat(shade(accent, -0.16), { roughness: 0.82 })

  const podH = 2.0
  const pod = new THREE.Mesh(rbox(w + 0.7, podH, d + 0.7, 0.16), podMat)
  pod.position.y = podH / 2; pod.castShadow = true; pod.receiveShadow = true; g.add(pod)
  shopfront(g, w + 0.7, d + 0.7, accent)

  facade(g, w, d, podH, h - podH, accMat)

  let topY = h
  if (h > 8.5) {
    const tw = w * 0.64, tierH = 2.8
    facade(g, tw, tw, h, tierH, accMat)
    topY = h + tierH
    rooftop(g, tw, tw, topY, accent)
  } else {
    rooftop(g, w, d, h, accent)
  }
  return { group: g, top: topY + 0.5 }
}

// ── Colorful low shop (1–2 floors) ──────────────────────────────────────
export function makeShop(colorHex, w, d, h) {
  const g = new THREE.Group()
  const accMat = mat(colorHex, { roughness: 0.8 })
  facade(g, w, d, 0, h, accMat)
  shopfront(g, w, d, colorHex)
  const para = new THREE.Mesh(rbox(w + 0.16, 0.35, d + 0.16, 0.07), mat(shade(colorHex, -0.15)))
  para.position.y = h + 0.17; para.castShadow = true; g.add(para)
  const ac = new THREE.Mesh(rbox(0.8, 0.45, 0.6, 0.06), metalMat)
  ac.position.set(w * 0.2, h + 0.42, -d * 0.1); ac.castShadow = true; g.add(ac)
  return g
}

// ── Floating beacon above a project building ────────────────────────────
export function makeBeacon(accent) {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), mat(palette.cartStripe))
  stem.position.y = 0.5; g.add(stem)
  const dMat = mat(accent, { roughness: 0.5 })
  markEmissive(dMat, accent, 0.9, 0.35)
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.58), dMat)
  diamond.position.y = 1.45; diamond.scale.y = 1.35; g.add(diamond)
  g.userData.diamond = diamond
  return g
}
