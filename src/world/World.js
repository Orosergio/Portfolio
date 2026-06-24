import * as THREE from 'three'
import { palette } from './palette.js'
import { makeGround, makeGrassPatch } from './Ground.js'
import { makeRoads } from './factory/roads.js'
import { makeLamps } from './factory/props.js'
import { makeTrees, makeBushes } from './factory/trees.js'
import { makeVending, makePlanters, makeCones, makeBins, makeBikes } from './factory/streetprops.js'
import { makeLandmark, makeShop, makeBeacon } from './factory/buildings.js'
import {
  makeTokyoTower, makeTorii, makeStall, makeLanternString, makeCrossing, makeBillboard, makeBench,
} from './factory/landmarks.js'
import { projects } from '../projects/projects.data.js'
import { rand, pick } from '../util/math.js'

// Compact, curated Tokyo/Taiwan-flavoured city: Shibuya scramble at the
// centre, Tokyo Tower as the hero landmark, a lantern-lit night-market lane,
// parks, and 8 vibrant project towers — no grey filler.
export function buildWorld(onPhase) {
  const half = 22
  const roadLines = [-11, 0, 11]
  const group = new THREE.Group()
  const obstacles = []
  const treePos = [], bushPos = []
  const projectBuildings = []
  const minimap = { half, roadLines, projects: [], landmarks: [], parks: [] }

  const paved = (x, z, w, d, color = palette.plaza) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }))
    m.position.set(x, 0.08, z); m.receiveShadow = true; group.add(m); return m
  }

  onPhase?.('Laying the ground', 0.12)
  group.add(makeGround({ half }))

  // central Shibuya plaza + roads + scramble crossing
  onPhase?.('Painting Shibuya', 0.26)
  paved(0, 0, 13, 13)
  group.add(makeRoads({ lines: roadLines, half, roadW: 4.4 }))
  group.add(makeCrossing(9))

  // ── Tokyo Tower (hero landmark, north end of the central avenue) ──
  onPhase?.('Raising Tokyo Tower', 0.4)
  paved(0, -16, 9, 9, palette.sand)
  const tower = makeTokyoTower()
  tower.group.position.set(0, 0, -16)
  group.add(tower.group)
  obstacles.push({ x: 0, z: -16, hw: 3.9, hd: 3.9 })
  minimap.landmarks.push({ x: 0, z: -16, kind: 'tower', color: palette.towerRed })
  for (const a of [0, 1, 2, 3]) treePos.push([(-2.5 + a * 1.7) - 3, -20.5])

  // ── Project towers ──
  onPhase?.('Lighting the towers', 0.55)
  for (const p of projects) {
    const [x, z] = p.pos
    const { group: b, top } = makeLandmark(p, 4.8)
    b.position.set(x, 0, z)
    group.add(b)
    const beacon = makeBeacon(p.accent)
    beacon.position.set(x, top + 0.4, z)
    group.add(beacon)
    obstacles.push({ x, z, hw: 2.85, hd: 2.85 })
    projectBuildings.push({ project: p, anchor: new THREE.Vector3(x, top + 2.4, z), beacon, pos: new THREE.Vector2(x, z) })
    minimap.projects.push({ x, z, color: p.accent })
    // neon billboard facing the crossing for the inner Shibuya ring
    if (Math.hypot(x, z) < 11) {
      const dir = new THREE.Vector2(-x, -z).normalize()
      const bb = makeBillboard(p.accent, p.glyph, 3.0, 3.4)
      bb.position.set(x + dir.x * 2.95, p.height * 0.58, z + dir.y * 2.95)
      bb.rotation.y = Math.atan2(dir.x, dir.y)
      group.add(bb)
    }
  }

  // ── Night-market lane (south) with torii + lantern strings ──
  onPhase?.('Stringing the night market', 0.7)
  paved(0, 14, 30, 6, palette.sand)
  const torii = makeTorii(1)
  torii.position.set(-16, 0, 14)
  torii.rotation.y = Math.PI / 2
  group.add(torii)
  minimap.landmarks.push({ x: 0, z: 14, kind: 'market', color: palette.lantern })
  let si = 0
  for (let x = -13; x <= 13; x += 3.4) {
    const zside = (si % 2 === 0) ? 12.4 : 15.6
    const stall = makeStall(si)
    stall.position.set(x, 0, zside)
    stall.rotation.y = (si % 2 === 0) ? 0 : Math.PI
    group.add(stall)
    obstacles.push({ x, z: zside, hw: 1.4, hd: 1.0 })
    si++
  }
  group.add(makeLanternString(-14, 14, 14, 14, 9, 3.6))
  group.add(makeLanternString(-14, 12.4, 14, 12.4, 8, 3.4))
  group.add(makeLanternString(-14, 15.6, 14, 15.6, 8, 3.4))

  // ── Parks (cozy green) ──
  onPhase?.('Planting parks', 0.8)
  const parks = [
    { x: -15, z: -1, w: 9, d: 9 },
    { x: 14, z: -3, w: 8, d: 8 },
    { x: -4, z: 4, w: 0, d: 0 }, // (skip — center is the crossing)
  ]
  for (const pk of parks) {
    if (pk.w <= 0) continue
    group.add(makeGrassPatch(pk.x, pk.z, pk.w, pk.d))
    minimap.parks.push(pk)
    for (let i = 0; i < 6; i++) treePos.push([pk.x + rand(-pk.w / 2 + 1, pk.w / 2 - 1), pk.z + rand(-pk.d / 2 + 1, pk.d / 2 - 1)])
    for (let i = 0; i < 4; i++) bushPos.push([pk.x + rand(-pk.w / 2 + 1, pk.w / 2 - 1), pk.z + rand(-pk.d / 2 + 1, pk.d / 2 - 1)])
    const bench = makeBench(); bench.position.set(pk.x, 0, pk.z + 1.5); group.add(bench)
  }

  // ── A few colorful low shops (texture, never grey) ──
  const shops = [
    [4, -11, 4], [-11, 4, 5], [11, 2.5, 4.5], [-4, -12, 4.2], [12, 13.5, 5],
  ]
  for (const [x, z, h] of shops) {
    const s = makeShop(pick(palette.shopColors), rand(3.4, 4.4), rand(3.4, 4.4), h)
    s.position.set(x, 0, z); group.add(s)
    obstacles.push({ x, z, hw: 2.4, hd: 2.4 })
  }

  // ── Street-level detail along the sidewalks ──
  onPhase?.('Dressing the streets', 0.86)
  const free = (x, z) => Math.hypot(x, z) > 6.5 && Math.abs(x) < half - 1.5 && Math.abs(z) < half - 1.5 &&
    !obstacles.some((o) => Math.abs(x - o.x) < o.hw + 1.1 && Math.abs(z - o.z) < o.hd + 1.1)
  const swOff = 2.2 + 0.85
  const cand = []
  for (const c of roadLines) {
    for (let t = -half + 3; t <= half - 3; t += 3.2) {
      for (const off of [c - swOff, c + swOff]) {
        if (free(off, t)) cand.push([off, t, Math.atan2(c - off, 0)]) // face the road
        if (free(t, off)) cand.push([t, off, Math.atan2(0, c - off)])
      }
    }
  }
  const vend = [], plant = [], cone = [], bin = [], bike = []
  cand.forEach((p, i) => {
    if (i % 7 === 0 && vend.length < 11) vend.push(p)
    else if (i % 4 === 1) plant.push([p[0], p[1]])
    else if (i % 9 === 4) cone.push([p[0], p[1]])
    else if (i % 8 === 5) bin.push([p[0], p[1]])
    else if (i % 5 === 2) bike.push([p[0], p[1]])
  })
  // a few vending machines + bikes flanking the night market
  for (let x = -12; x <= 12; x += 6) vend.push([x, 17.2, 0])
  group.add(makeVending(vend), makePlanters(plant), makeCones(cone), makeBins(bin), makeBikes(bike))

  // perimeter tree frame (smaller than before)
  for (let t = -half + 2; t <= half - 2; t += 4) {
    treePos.push([t, -half + 2], [t, half - 2], [-half + 2, t], [half - 2, t])
  }

  onPhase?.('Final touches', 0.9)
  group.add(makeTrees(treePos))
  group.add(makeBushes(bushPos))

  // lamps at road intersections (skip the central scramble)
  const lampPos = []
  for (const lx of roadLines) for (const lz of roadLines) {
    if (Math.hypot(lx, lz) < 7) continue
    lampPos.push([lx + 2.6, lz + 2.6])
  }
  group.add(makeLamps(lampPos))

  return {
    group,
    half,
    projectBuildings,
    obstacles,
    bounds: { min: -(half - 2), max: half - 2 },
    spawn: { x: 0, z: 9, heading: Math.PI },
    minimap,
    animate(t) {
      for (const pb of projectBuildings) {
        pb.beacon.rotation.y = t * 1.1
        const dm = pb.beacon.userData.diamond
        if (dm) dm.position.y = 1.45 + Math.sin(t * 2 + pb.pos.x) * 0.12
      }
    },
  }
}
