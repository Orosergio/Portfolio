import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)

// Grid road network with raised sidewalks, dashed lane lines and stop bars.
export function makeRoads({ lines, half, roadW = 4.4, y = 0.06 }) {
  const len = half * 2
  const swW = 1.7, swOff = roadW / 2 + swW / 2, swH = 0.16
  const asph = [], side = [], dash = []

  for (const c of lines) {
    asph.push(box(roadW, 0.12, len).translate(c, y, 0))
    asph.push(box(len, 0.12, roadW).translate(0, y, c))
    side.push(box(swW, swH, len).translate(c - swOff, swH / 2, 0))
    side.push(box(swW, swH, len).translate(c + swOff, swH / 2, 0))
    side.push(box(len, swH, swW).translate(0, swH / 2, c - swOff))
    side.push(box(len, swH, swW).translate(0, swH / 2, c + swOff))
    for (let t = -half + 1; t < half; t += 2.3) {
      dash.push(box(0.16, 0.02, 1.1).translate(c, y + 0.07, t))
      dash.push(box(1.1, 0.02, 0.16).translate(t, y + 0.07, c))
    }
  }

  // stop bars on the four approaches to the central scramble
  const sb = 5.2
  dash.push(box(roadW * 0.92, 0.02, 0.45).translate(0, y + 0.07, -sb))
  dash.push(box(roadW * 0.92, 0.02, 0.45).translate(0, y + 0.07, sb))
  dash.push(box(0.45, 0.02, roadW * 0.92).translate(-sb, y + 0.07, 0))
  dash.push(box(0.45, 0.02, roadW * 0.92).translate(sb, y + 0.07, 0))

  const group = new THREE.Group()
  const road = new THREE.Mesh(mergeGeometries(asph, false), new THREE.MeshStandardMaterial({ color: palette.road, flatShading: true, roughness: 0.96 }))
  road.receiveShadow = true
  const walks = new THREE.Mesh(mergeGeometries(side, false), new THREE.MeshStandardMaterial({ color: palette.sidewalk, flatShading: true, roughness: 0.92 }))
  walks.receiveShadow = true
  const marks = new THREE.Mesh(mergeGeometries(dash, false), new THREE.MeshStandardMaterial({ color: palette.roadLine, roughness: 0.85 }))
  group.add(road, walks, marks)
  return group
}

// ── Tiny-Tokyo island road network ──────────────────────────────────────
// Squared ring loop + grand hero avenue (to the Tower) + market spoke +
// E/W spokes + a plaza roundabout around the central fountain. Flat merged
// decals: asphalt, plaza stone, lane marks, raised curbs.
export function makeIslandRoads({ hx = 15, hz = 15, roadW = 5.0, avenueW = 6.5,
  plazaR = 6.6, ringInner = 3.7, ringOuter = 6.5, towerZ = -20.5 } = {}) {
  const y = 0.085
  const asph = [], stone = [], dash = [], curb = []
  const plane = (w, d, x, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g }
  const annulus = (ri, ro, x, z, yy = y) => { const g = new THREE.RingGeometry(ri, ro, 44); g.rotateX(-Math.PI / 2); g.translate(x, yy, z); return g }
  const disc = (r, x, z, yy) => { const g = new THREE.CircleGeometry(r, 44); g.rotateX(-Math.PI / 2); g.translate(x, yy, z); return g }

  // squared ring road
  asph.push(plane(hx * 2 + roadW, roadW, 0, -hz), plane(hx * 2 + roadW, roadW, 0, hz))
  asph.push(plane(roadW, hz * 2 + roadW, -hx, 0), plane(roadW, hz * 2 + roadW, hx, 0))
  // hero avenue (plaza edge → tower apron)
  const avLen = -6 - towerZ
  asph.push(plane(avenueW, avLen, 0, (-6 + towerZ) / 2))
  // south market spoke + E/W spokes
  asph.push(plane(roadW, 10, 0, 11))
  asph.push(plane(hx - 6, roadW, (6 + hx) / 2, 0), plane(hx - 6, roadW, -(6 + hx) / 2, 0))
  // roundabout ring
  asph.push(annulus(ringInner, ringOuter, 0, 0))

  // plaza stone disc under the roundabout
  stone.push(disc(plazaR, 0, 0, 0.08))

  // lane marks: avenue centre dashes + ring centre dashes + roundabout crosswalks
  for (let z = -8; z > towerZ + 1; z -= 2.4) dash.push(plane(0.18, 1.0, 0, z))
  for (let x = -hx + 2; x <= hx - 2; x += 2.4) { dash.push(plane(1.0, 0.18, x, -hz), plane(1.0, 0.18, x, hz)) }
  for (let z = -hz + 2; z <= hz - 2; z += 2.4) { dash.push(plane(0.18, 1.0, -hx, z), plane(0.18, 1.0, hx, z)) }
  // zebra crosswalks on the 4 roundabout approaches
  const zeb = (x, z, horiz) => { for (let i = -2; i <= 2; i++) dash.push(horiz ? plane(0.4, 2.6, x, z + i * 0.7) : plane(2.6, 0.4, x + i * 0.7, z)) }
  zeb(0, -7.4, false); zeb(0, 7.4, false); zeb(-7.4, 0, true); zeb(7.4, 0, true)

  // raised curbs: avenue sides + plaza rim
  const cbox = (w, h, d, x, z) => new THREE.BoxGeometry(w, h, d).translate(x, h / 2, z)
  curb.push(cbox(0.22, 0.2, avLen, -avenueW / 2, (-6 + towerZ) / 2), cbox(0.22, 0.2, avLen, avenueW / 2, (-6 + towerZ) / 2))

  const group = new THREE.Group()
  const roadMesh = new THREE.Mesh(mergeGeometries(asph, false), new THREE.MeshStandardMaterial({ color: palette.road, roughness: 0.96 }))
  roadMesh.receiveShadow = true
  const stoneMesh = new THREE.Mesh(mergeGeometries(stone, false), new THREE.MeshStandardMaterial({ color: palette.plaza, roughness: 0.92 }))
  stoneMesh.receiveShadow = true
  const marks = new THREE.Mesh(mergeGeometries(dash, false), new THREE.MeshStandardMaterial({ color: palette.crosswalk, roughness: 0.85 }))
  const curbs = new THREE.Mesh(mergeGeometries(curb, false), new THREE.MeshStandardMaterial({ color: palette.curb, roughness: 0.9 }))
  curbs.castShadow = true; curbs.receiveShadow = true
  // plaza rim ring (raised, darker stone so the medallion reads crisply)
  const rim = new THREE.Mesh(annulus(plazaR - 0.2, plazaR, 0, 0, 0.18), new THREE.MeshStandardMaterial({ color: '#86714d', roughness: 0.9 }))
  // a single saturated accent band ringing the fountain — marks the exact centre
  const band = new THREE.Mesh(annulus(2.95, 3.4, 0, 0, 0.11), new THREE.MeshStandardMaterial({ color: palette.accFillTeal, roughness: 0.7 }))
  group.add(stoneMesh, roadMesh, marks, curbs, rim, band)
  return group
}
