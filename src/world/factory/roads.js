import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'

// ── Two-district island road network ────────────────────────────────────
// Squared ring loop (±hx) + the grand north-south avenue linking the two
// hero towers (Tokyo Tower ↔ Taipei 101) through the fountain roundabout +
// an east-west avenue + landmark aprons. Flat merged decals: asphalt, plaza
// stone, lane marks, raised curbs. Everything merges to 6 draw calls.
export function makeIslandRoads({ hx = 22, hz = 22, roadW = 5.0, avenueW = 6.5,
  plazaR = 7.4, ringInner = 3.7, ringOuter = 6.5, apronZ = 27 } = {}) {
  const y = 0.085
  const asph = [], stone = [], dash = [], curb = []
  const plane = (w, d, x, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g }
  const annulus = (ri, ro, x, z, yy = y) => { const g = new THREE.RingGeometry(ri, ro, 44); g.rotateX(-Math.PI / 2); g.translate(x, yy, z); return g }
  const disc = (r, x, z, yy) => { const g = new THREE.CircleGeometry(r, 44); g.rotateX(-Math.PI / 2); g.translate(x, yy, z); return g }

  // squared ring road
  asph.push(plane(hx * 2 + roadW, roadW, 0, -hz), plane(hx * 2 + roadW, roadW, 0, hz))
  asph.push(plane(roadW, hz * 2 + roadW, -hx, 0), plane(roadW, hz * 2 + roadW, hx, 0))
  // grand avenue: full north-south, hero apron → plaza → hero apron
  asph.push(plane(avenueW, (apronZ - 5.5) - 6, 0, -(6 + (apronZ - 5.5)) / 2))
  asph.push(plane(avenueW, (apronZ - 5.5) - 6, 0, (6 + (apronZ - 5.5)) / 2))
  // east-west avenue (plaza edge → ring)
  asph.push(plane(hx - 6, roadW, (6 + hx) / 2, 0), plane(hx - 6, roadW, -(6 + hx) / 2, 0))
  // roundabout ring
  asph.push(annulus(ringInner, ringOuter, 0, 0))

  // plaza stone disc under the roundabout
  stone.push(disc(plazaR, 0, 0, 0.08))

  // lane marks: avenue centre dashes (both halves) + ring dashes
  for (let z = 8.6; z <= apronZ - 7; z += 2.4) { dash.push(plane(0.18, 1.0, 0, z), plane(0.18, 1.0, 0, -z)) }
  for (let x = -hx + 2; x <= hx - 2; x += 2.4) { dash.push(plane(1.0, 0.18, x, -hz), plane(1.0, 0.18, x, hz)) }
  for (let z = -hz + 2; z <= hz - 2; z += 2.4) { dash.push(plane(0.18, 1.0, -hx, z), plane(0.18, 1.0, hx, z)) }
  for (let x = 8.6; x <= hx - 3; x += 2.4) { dash.push(plane(1.0, 0.18, x, 0), plane(1.0, 0.18, -x, 0)) }

  // zebra crosswalks: 4 roundabout approaches + before each ring junction
  const zeb = (x, z, horiz) => { for (let i = -2; i <= 2; i++) dash.push(horiz ? plane(0.4, roadW - 0.8, x + i * 0.7, z) : plane(avenueW - 0.8, 0.4, x, z + i * 0.7)) }
  zeb(0, -8.2, false); zeb(0, 8.2, false); zeb(-8.2, 0, true); zeb(8.2, 0, true)
  zeb(0, -(hz - 3.4), false); zeb(0, hz - 3.4, false); zeb(-(hx - 3.4), 0, true); zeb(hx - 3.4, 0, true)

  // raised curbs along the grand avenue (both halves)
  const cbox = (w, h, d, x, z) => new THREE.BoxGeometry(w, h, d).translate(x, h / 2, z)
  const avLen = (apronZ - 5.5) - 6
  for (const s of [-1, 1]) {
    curb.push(cbox(0.22, 0.2, avLen, s * avenueW / 2, -(6 + avLen / 2) + 0))
    curb.push(cbox(0.22, 0.2, avLen, s * avenueW / 2, (6 + avLen / 2) - 0))
  }

  const group = new THREE.Group()
  const roadMesh = new THREE.Mesh(mergeGeometries(asph, false), new THREE.MeshStandardMaterial({ color: palette.road, roughness: 0.96 }))
  roadMesh.receiveShadow = true
  const stoneMesh = new THREE.Mesh(mergeGeometries(stone, false), new THREE.MeshStandardMaterial({ color: palette.plaza, roughness: 0.92 }))
  stoneMesh.receiveShadow = true
  const marks = new THREE.Mesh(mergeGeometries(dash, false), new THREE.MeshStandardMaterial({ color: palette.crosswalk, roughness: 0.85 }))
  marks.position.y = 0.025 // decals must not share the asphalt's depth (flicker)
  const curbs = new THREE.Mesh(mergeGeometries(curb, false), new THREE.MeshStandardMaterial({ color: palette.curb, roughness: 0.9 }))
  curbs.castShadow = true; curbs.receiveShadow = true
  // plaza rim ring (raised, darker stone so the medallion reads crisply)
  const rim = new THREE.Mesh(annulus(plazaR - 0.2, plazaR, 0, 0, 0.18), new THREE.MeshStandardMaterial({ color: '#86714d', roughness: 0.9 }))
  // a single saturated accent band ringing the fountain — marks the exact centre
  const band = new THREE.Mesh(annulus(2.95, 3.4, 0, 0, 0.11), new THREE.MeshStandardMaterial({ color: palette.accFillTeal, roughness: 0.7 }))
  group.add(stoneMesh, roadMesh, marks, curbs, rim, band)
  return group
}
