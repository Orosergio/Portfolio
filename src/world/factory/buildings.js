import * as THREE from 'three'
import { palette } from '../palette.js'
import { rbox, markEmissive } from '../../util/geo.js'
import { pick, rand } from '../../util/math.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.8, metalness: 0, ...o })
const shade = (hex, amt) => {
  const c = new THREE.Color(hex)
  if (amt < 0) c.multiplyScalar(1 + amt)
  else c.lerp(new THREE.Color('#ffffff'), amt)
  return '#' + c.getHexString()
}

// shared greeble materials (one instance each → DayNight lights them once)
const metalMat = mat(palette.metal, { roughness: 0.5, metalness: 0.35 })
const metalDarkMat = mat(palette.metalDark, { roughness: 0.6 })
const darkMat = mat('#1a1320')
const plainGlassMat = (() => { const m = mat(palette.glass, { roughness: 0.28, metalness: 0.12 }); markEmissive(m, '#ffd49a', 0.5, 0.0); return m })()

// ── Per-window emissive grid glass ───────────────────────────────────────
// A canvas of lit/cool/off cells used as BOTH map and emissiveMap, so towers
// read as real lit floors at night instead of one uniform glowing band.
// One material per building (≈22 total → negligible for DayNight's tween).
function windowGridMaterial(cols = 6, rows = 9, litRatio = 0.36) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 128
  const x = c.getContext('2d')
  x.fillStyle = '#16242f'; x.fillRect(0, 0, 96, 128) // dark mullions
  const cw = 96 / cols, ch = 128 / rows
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const r = Math.random()
    const col = r > litRatio ? '#0e1a24' : (r < litRatio * 0.7 ? '#ffd9a8' : '#bcd4ff')
    x.fillStyle = col
    x.fillRect(i * cw + 1.5, j * ch + 1.8, cw - 3, ch - 3.4)
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const m = mat('#16242f', { roughness: 0.32, metalness: 0.1 })
  m.map = tex
  m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = tex
  m.emissiveIntensity = 0.06; m.userData.nightE = 0.9; m.userData.dayE = 0.06
  return m
}

// deterministic index into a palette array from an accent hex (stable screenshots)
const hashPick = (arr, accent, salt = 0) => arr[(accent.charCodeAt(1) + accent.charCodeAt(3) + salt) % arr.length]

// curtain-wall facade: corner pilasters + recessed glass + protruding floor slabs
function facade(g, w, d, y0, h, accMat, glassMat = plainGlassMat) {
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

// signage = the awning + glowing neon sign. Opt-in: project "stars" and the
// night-market lane get it; plain filler machiya stay quiet glass+door so neon
// reads as a focal cue, not wallpaper.
function shopfront(g, pw, pd, accent, signage = true) {
  const fz = pd / 2
  const glass = new THREE.Mesh(rbox(pw - 0.7, 1.1, 0.14, 0.05), plainGlassMat)
  glass.position.set(0, 1.0, fz - 0.04); g.add(glass)
  const door = new THREE.Mesh(rbox(0.9, 1.4, 0.16, 0.05), darkMat)
  door.position.set(pw * 0.22, 0.75, fz + 0.02); g.add(door)
  if (!signage) return
  const awn = new THREE.Mesh(rbox(pw, 0.12, 1.0, 0.04), mat(hashPick(palette.awning, accent), { roughness: 0.7 }))
  awn.position.set(0, 1.78, fz + 0.34); awn.rotation.x = -0.34; awn.castShadow = true; g.add(awn)
  const sm = mat('#14101c'); markEmissive(sm, hashPick(palette.signNeon, accent, 2), 1.1, 0.18)
  const sign = new THREE.Mesh(rbox(pw - 1.1, 0.5, 0.12, 0.05), sm)
  sign.position.set(-pw * 0.08, 2.05, fz + 0.05); g.add(sign)
}

function rooftop(g, fw, fd, y, accent) {
  const para = new THREE.Mesh(rbox(fw + 0.2, 0.45, fd + 0.2, 0.08), mat(shade(accent, -0.16)))
  para.position.y = y + 0.22; para.castShadow = true; g.add(para)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.95, 12), metalMat)
  tank.position.set(fw * 0.22, y + 1.05, -fd * 0.18); tank.castShadow = true; g.add(tank)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), metalDarkMat)
    leg.position.set(fw * 0.22 + sx * 0.4, y + 0.5, -fd * 0.18 + sz * 0.4); g.add(leg)
  }
  for (let i = 0; i < 2; i++) {
    const ac = new THREE.Mesh(rbox(0.85, 0.5, 0.65, 0.06), metalMat)
    ac.position.set(-fw * 0.26 + i * 0.62, y + 0.45, fd * 0.22); ac.castShadow = true; g.add(ac)
  }
  const pent = new THREE.Mesh(rbox(1.3, 1.05, 1.3, 0.1), mat(shade(accent, 0.08)))
  pent.position.set(-fw * 0.16, y + 0.72, -fd * 0.2); pent.castShadow = true; g.add(pent)
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.9, 6), metalDarkMat)
  ant.position.set(fw * 0.1, y + 1.35, 0); g.add(ant)
  const lm = mat('#7a1a10'); markEmissive(lm, '#ff4d4d', 1.4, 0.3)
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lm)
  light.position.set(fw * 0.1, y + 2.35, 0); g.add(light)
}

// ── Gable roof (machiya / shop pitched roof) ────────────────────────────
function gableRoof(g, w, d, baseY, roofH, color, over = 0.34) {
  const ang = Math.atan2(roofH, w / 2 + over)
  const planeLen = Math.hypot(w / 2 + over, roofH)
  const roofMat = mat(color, { roughness: 0.82 })
  for (const s of [-1, 1]) {
    const plane = new THREE.Mesh(rbox(planeLen, 0.17, d + over * 2, 0.05), roofMat)
    plane.position.set(s * (w / 2 + over) / 2, baseY + roofH / 2, 0)
    plane.rotation.z = -s * ang
    plane.castShadow = true; plane.receiveShadow = true; g.add(plane)
  }
  const ridge = new THREE.Mesh(rbox(0.26, 0.2, d + over * 2, 0.06), mat(shade(color, -0.18)))
  ridge.position.set(0, baseY + roofH, 0); g.add(ridge)
}

// ── A. Machiya shophouse (workhorse: most fillers + FM/ML/IR) ───────────
function makeMachiya(accent, w, d, h, signage = true) {
  const g = new THREE.Group()
  const bodyMat = mat(accent, { roughness: 0.84 })
  const body = new THREE.Mesh(rbox(w, h, d, 0.12), bodyMat)
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body)
  shopfront(g, w, d, accent, signage)
  // upper warm window strip (glows at night)
  const wm = mat('#1c2630', { roughness: 0.3 }); markEmissive(wm, '#ffd49a', 0.85, 0.05)
  const win = new THREE.Mesh(rbox(w - 0.9, 0.7, 0.08, 0.04), wm)
  win.position.set(0, h - 0.7, d / 2 - 0.02); g.add(win)
  const roofH = Math.min(1.3, w * 0.32)
  gableRoof(g, w, d, h, roofH, pick([palette.roofWarm, palette.roofClay, palette.roofTeal]))
  return { group: g, top: h + roofH + 0.2 }
}

// ── B. Mid curtain-wall block w/ per-window night glow (PJ, WL) ─────────
function makeCurtain(accent, w, d, h) {
  const g = new THREE.Group()
  const accMat = mat(accent, { roughness: 0.78 })
  const podMat = mat(shade(accent, -0.16), { roughness: 0.82 })
  const glass = windowGridMaterial(Math.max(5, Math.round(w * 1.3)), Math.max(7, Math.round(h * 1.3)))
  const podH = 1.8
  const pod = new THREE.Mesh(rbox(w + 0.7, podH, d + 0.7, 0.16), podMat)
  pod.position.y = podH / 2; pod.castShadow = true; pod.receiveShadow = true; g.add(pod)
  shopfront(g, w + 0.7, d + 0.7, accent)
  facade(g, w, d, podH, h - podH, accMat, glass)
  let topY = h
  if (h > 7.5) {
    const tw = w * 0.66, tierH = 2.2
    facade(g, tw, tw, h, tierH, accMat, glass)
    topY = h + tierH
    rooftop(g, tw, tw, topY, accent)
  } else {
    rooftop(g, w, d, h, accent)
  }
  return { group: g, top: topY + 0.5 }
}

// ── C. Pagoda-roof corner block (Kiniela) ───────────────────────────────
function makePagoda(accent, w, d, h) {
  const g = new THREE.Group()
  const bodyMat = mat(accent, { roughness: 0.8 })
  const podMat = mat(shade(accent, -0.14), { roughness: 0.82 })
  const podH = 1.7
  const pod = new THREE.Mesh(rbox(w + 0.5, podH, d + 0.5, 0.14), podMat)
  pod.position.y = podH / 2; pod.castShadow = true; pod.receiveShadow = true; g.add(pod)
  shopfront(g, w + 0.5, d + 0.5, accent)
  const bodyH = h - podH
  const body = new THREE.Mesh(rbox(w, bodyH, d, 0.12), bodyMat)
  body.position.y = podH + bodyH / 2; body.castShadow = true; g.add(body)
  // window band (glows)
  const wm = mat('#1c2630', { roughness: 0.3 }); markEmissive(wm, '#ffd49a', 0.8, 0.05)
  const band = new THREE.Mesh(rbox(w + 0.04, bodyH * 0.5, d + 0.04, 0.06), wm)
  band.position.y = podH + bodyH * 0.55; g.add(band)
  // 2-tier upturned pagoda roof (4-sided cones rotated 45°)
  const roofMat = mat(palette.roofTeal, { roughness: 0.78 })
  const eaveMat = mat('#2b6f69', { roughness: 0.7 })
  let ry = h
  for (const [r, rh, drop] of [[w * 0.92, 0.9, 0.0], [w * 0.62, 0.8, 0.0]]) {
    const eave = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.18, 0.22, 4), eaveMat)
    eave.rotation.y = Math.PI / 4; eave.position.y = ry + 0.1; eave.castShadow = true; g.add(eave)
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r, rh, 4), roofMat)
    cone.rotation.y = Math.PI / 4; cone.position.y = ry + 0.1 + rh / 2; cone.castShadow = true; g.add(cone)
    // under-eave warm lantern strip
    const lm = mat('#7a4a10'); markEmissive(lm, palette.lanternWarm, 0.9, 0.06)
    const strip = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.12, 4), lm)
    strip.rotation.y = Math.PI / 4; strip.position.y = ry - 0.04; g.add(strip)
    ry += rh + 0.5
  }
  const finialMat = mat('#d9b24a', { roughness: 0.4, metalness: 0.4 })
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), finialMat)
  finial.position.y = ry; g.add(finial)
  return { group: g, top: ry + 0.4 }
}

// ── D. Market hall (Oro RealState + market-lane fillers) ────────────────
function makeMarketHall(accent, w, d, h) {
  const g = new THREE.Group()
  const bodyMat = mat(accent, { roughness: 0.84 })
  const body = new THREE.Mesh(rbox(w, h, d, 0.1), bodyMat)
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body)
  const fz = d / 2
  // arched glass bays with interior glow
  const bays = 3
  const bw = (w - 0.8) / bays
  const gm = mat('#241a14', { roughness: 0.3 }); markEmissive(gm, '#ffce85', 0.95, 0.08)
  for (let i = 0; i < bays; i++) {
    const bx = -w / 2 + 0.4 + bw * (i + 0.5)
    const bay = new THREE.Mesh(rbox(bw - 0.25, h * 0.55, 0.12, 0.05), gm)
    bay.position.set(bx, h * 0.42, fz - 0.02); g.add(bay)
    const arch = new THREE.Mesh(new THREE.CylinderGeometry((bw - 0.25) / 2, (bw - 0.25) / 2, 0.12, 12, 1, false, 0, Math.PI), mat(shade(accent, 0.1)))
    arch.rotation.z = Math.PI; arch.position.set(bx, h * 0.69, fz - 0.02); g.add(arch)
  }
  // continuous striped awning across the front
  const awn = new THREE.Mesh(rbox(w + 0.3, 0.14, 1.3, 0.04), mat(hashPick(palette.awning, accent), { roughness: 0.7 }))
  awn.position.set(0, h * 0.7 + 0.1, fz + 0.5); awn.rotation.x = -0.3; awn.castShadow = true; g.add(awn)
  // horizontal neon sign band on top
  const sm = mat('#14101c'); markEmissive(sm, hashPick(palette.signNeon, accent, 1), 1.15, 0.2)
  const sign = new THREE.Mesh(rbox(w - 0.6, 0.6, 0.12, 0.05), sm)
  sign.position.set(0, h + 0.34, fz - 0.1); g.add(sign)
  const para = new THREE.Mesh(rbox(w + 0.16, 0.3, d + 0.16, 0.06), mat(shade(accent, -0.16)))
  para.position.y = h + 0.13; para.castShadow = true; g.add(para)
  return { group: g, top: h + 0.7 }
}

// ── E. Capsule / round accent tower (OpenClaw — the ONE special silhouette) ─
// Terraced glowing pods (decreasing radius) + alternating warm/cool window
// ribbons + a dome cap and a short crown spire, so it reads as a distinct
// landmark, not a plain cylinder.
function makeCapsule(accent, w, d, h) {
  const g = new THREE.Group()
  const r = Math.min(w, d) / 2
  const bodyMat = mat(accent, { roughness: 0.74 })
  const podMat = mat(shade(accent, -0.18), { roughness: 0.82 })
  const podH = 1.6
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.5, r + 0.6, podH, 16), podMat)
  pod.position.y = podH / 2; pod.castShadow = true; pod.receiveShadow = true; g.add(pod)

  const bodyH = h - podH
  const segs = 3, segH = bodyH / segs
  const warm = mat('#2a1c12', { roughness: 0.3 }); markEmissive(warm, palette.lanternWarm, 0.95, 0.06)
  const cool = mat('#16242f', { roughness: 0.3 }); markEmissive(cool, '#cfe2ff', 0.95, 0.06)
  let topR = r
  for (let i = 0; i < segs; i++) {
    const rr = r * (1 - i * 0.08); topR = rr
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, segH - 0.14, 16), bodyMat)
    seg.position.y = podH + segH * i + segH / 2; seg.castShadow = true; g.add(seg)
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(rr + 0.04, rr + 0.04, segH * 0.46, 16), i % 2 ? warm : cool)
    ring.position.y = podH + segH * i + segH / 2; g.add(ring)
    if (i < segs - 1) {
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(rr + 0.14, rr + 0.14, 0.16, 16), podMat)
      lip.position.y = podH + segH * (i + 1); lip.castShadow = true; g.add(lip)
    }
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(topR, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(shade(accent, 0.06), { roughness: 0.6 }))
  cap.position.y = h; cap.castShadow = true; g.add(cap)
  const rimM = mat('#7a4a10'); markEmissive(rimM, palette.lanternWarm, 0.9, 0.05)
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(topR, 0.07, 8, 24), rimM)
  rimRing.rotation.x = Math.PI / 2; rimRing.position.y = h; g.add(rimRing)
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.0, 6), mat(shade(accent, 0.12)))
  spire.position.y = h + topR + 0.5; spire.castShadow = true; g.add(spire)
  const tipM = mat('#7a1a10'); markEmissive(tipM, '#ff7a4d', 1.3, 0.2)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), tipM)
  tip.position.y = h + topR + 1.1; g.add(tip)
  return { group: g, top: h + topR + 1.3 }
}

// ── Dispatcher ──────────────────────────────────────────────────────────
export function makeBuilding({ accent, w, d, h, archetype = 'machiya', signage = true }) {
  switch (archetype) {
    case 'curtain': return makeCurtain(accent, w, d, h)
    case 'pagoda': return makePagoda(accent, w, d, h)
    case 'market': return makeMarketHall(accent, w, d, h)
    case 'capsule': return makeCapsule(accent, w, d, h)
    default: return makeMachiya(accent, w, d, h, signage)
  }
}

// Back-compat: a curated project tower (now routes through archetypes).
export function makeLandmark(project, baseW = 4.8) {
  const [w, d] = project.footprint || [baseW, baseW]
  return makeBuilding({ accent: project.accent, w, d, h: project.height, archetype: project.archetype || 'curtain' })
}

// Filler building (non-project) — same archetype system, dominant colours.
export function makeShop(colorHex, w, d, h, archetype = 'machiya', signage = false) {
  return makeBuilding({ accent: colorHex, w, d, h, archetype, signage }).group
}

// ── Floating beacon above a project building (the "star" marker) ─────────
export function makeBeacon(accent) {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), mat(palette.cartStripe))
  stem.position.y = 0.5; g.add(stem)
  const dMat = mat(accent, { roughness: 0.5 })
  markEmissive(dMat, accent, 0.9, 0.35)
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), dMat)
  diamond.position.y = 1.45; diamond.scale.y = 1.35; g.add(diamond)
  g.userData.diamond = diamond
  return g
}
