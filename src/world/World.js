import * as THREE from 'three'
import { palette } from './palette.js'
import { makeGround, makeGrassPatch } from './Ground.js'
import { makeIslandRoads } from './factory/roads.js'
import { makeLamps } from './factory/props.js'
import { makeTrees, makeBushes } from './factory/trees.js'
import { makeVending, makePlanters, makeCones, makeBins, makeBikes } from './factory/streetprops.js'
import { makeBuilding, makeShop, makeBeacon } from './factory/buildings.js'
import {
  makeTokyoTower, makeTorii, makeStall, makeLanternString, makeBillboard, makeBench, makeFountain,
} from './factory/landmarks.js'
import { makeTraffic, makePedestrians, makeClouds } from './factory/life.js'
import { projects } from '../projects/projects.data.js'
import { rand } from '../util/math.js'

// ── Tiny-Tokyo cohesive island ──────────────────────────────────────────
// One compact, dense, well-composed neighbourhood: a fountain roundabout at
// the heart, a grand avenue running north to the hero Tokyo Tower, a cozy
// night-market lane in the foreground, side parks, and the 8 projects as
// character buildings ringing the plaza. Scale is disciplined (low + wide,
// width ≥ height) — verticality belongs to the Tower alone.
export function buildWorld(onPhase) {
  const half = 24
  const towerZ = -21
  const group = new THREE.Group()
  const obstacles = []
  const treePos = [], bushPos = []
  const projectBuildings = []
  const minimap = { half, roadLines: [-15, 0, 15], projects: [], landmarks: [], parks: [] }
  const lanternStrings = []

  const D = palette
  const paved = (x, z, w, d, color = palette.sand) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }))
    m.position.set(x, 0.08, z); m.receiveShadow = true; group.add(m); return m
  }

  onPhase?.('Laying the island', 0.12)
  group.add(makeGround({ half }))
  group.add(makeIslandRoads({ towerZ: towerZ + 0.5 }))

  // ── Central fountain (the animated focal heart) ──
  onPhase?.('Setting the fountain', 0.24)
  const fountain = makeFountain()
  group.add(fountain.group)
  obstacles.push({ x: 0, z: 0, hw: 2.9, hd: 2.9 })

  // ── Tokyo Tower (hero, north end of the avenue) ──
  onPhase?.('Raising Tokyo Tower', 0.38)
  paved(0, towerZ, 9.5, 9.5, palette.sand)
  const tower = makeTokyoTower()
  tower.group.position.set(0, 0, towerZ)
  group.add(tower.group)
  obstacles.push({ x: 0, z: towerZ, hw: 4.0, hd: 4.0 })
  minimap.landmarks.push({ x: 0, z: towerZ, kind: 'tower', color: palette.towerRed })
  for (let i = 0; i < 5; i++) treePos.push([-4 + i * 2, towerZ - 3.4])

  // ── Project "stars" ringing the plaza ──
  onPhase?.('Building the projects', 0.54)
  for (const p of projects) {
    const [x, z] = p.pos
    const [w, d] = p.footprint || [5, 5]
    const { group: b, top } = makeBuilding({ accent: p.accent, w, d, h: p.height, archetype: p.archetype })
    b.position.set(x, 0, z)
    group.add(b)
    const beacon = makeBeacon(p.accent)
    beacon.position.set(x, top + 0.4, z)
    group.add(beacon)
    obstacles.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3 })
    projectBuildings.push({ project: p, anchor: new THREE.Vector3(x, top + 2.0, z), beacon, pos: new THREE.Vector2(x, z) })
    minimap.projects.push({ x, z, color: p.accent })
    // inner-ring plaza stars get a glowing billboard facing the fountain
    if (Math.hypot(x, z) < 11) {
      const dir = new THREE.Vector2(-x, -z).normalize()
      const bb = makeBillboard(p.accent, p.glyph, 2.8, 3.0)
      bb.position.set(x + dir.x * (w / 2 + 0.3), p.height * 0.62, z + dir.y * (d / 2 + 0.3))
      bb.rotation.y = Math.atan2(dir.x, dir.y)
      group.add(bb)
    }
  }

  // ── Filler buildings (texture; never the stars) ──
  onPhase?.('Filling the streets', 0.66)
  const fillers = [
    { x: -2, z: -20, w: 4.0, d: 3.5, h: 3.6, a: 'machiya', c: D.domSandCream },
    { x: 3, z: -20, w: 4.0, d: 3.5, h: 3.6, a: 'machiya', c: D.domTerracotta },
    { x: -4, z: -13, w: 3.6, d: 3.2, h: 3.0, a: 'machiya', c: D.domSandCream },
    { x: 4, z: -13, w: 3.6, d: 3.2, h: 3.4, a: 'machiya', c: D.domMutedBlue },
    { x: 18, z: 7, w: 4.5, d: 4.0, h: 4.0, a: 'market', c: D.accFillTeal },
    { x: 16, z: 13, w: 4.2, d: 3.6, h: 3.6, a: 'machiya', c: D.accFillPink },
    { x: -15, z: -16, w: 4.5, d: 4.0, h: 4.0, a: 'machiya', c: D.domTerracotta },
    { x: 2, z: 12.5, w: 4.0, d: 3.4, h: 3.2, a: 'market', c: D.domSandCream },
    { x: 6, z: 13.5, w: 4.0, d: 3.4, h: 3.0, a: 'market', c: D.domTerracotta },
    { x: -6, z: 12.5, w: 4.0, d: 3.4, h: 3.4, a: 'market', c: D.domMutedBlue },
    { x: 13, z: -18, w: 4.0, d: 3.5, h: 3.4, a: 'machiya', c: D.accFillWarm },
    { x: -20, z: -3, w: 4.0, d: 3.6, h: 3.4, a: 'machiya', c: D.domSage },
    { x: 20, z: 1, w: 4.0, d: 3.6, h: 3.6, a: 'machiya', c: D.domTaupe },
  ]
  for (const f of fillers) {
    const b = makeShop(f.c, f.w, f.d, f.h, f.a)
    b.position.set(f.x, 0, f.z); group.add(b)
    obstacles.push({ x: f.x, z: f.z, hw: f.w / 2, hd: f.d / 2 })
  }

  // ── Night-market lane (foreground) ──
  onPhase?.('Stringing the night market', 0.76)
  paved(0, 14.5, 30, 6.5, palette.sand)
  const torii = makeTorii(1)
  torii.position.set(-15.5, 0, 14.5); torii.rotation.y = Math.PI / 2
  group.add(torii)
  minimap.landmarks.push({ x: 0, z: 14, kind: 'market', color: palette.lantern })
  let si = 0
  for (let x = -12.5; x <= 12.5; x += 4.2) {
    if (Math.abs(x) < 2.6) { si++; continue } // keep the spoke clear for the kart
    const zside = (si % 2 === 0) ? 13.2 : 16.0
    const stall = makeStall(si)
    stall.position.set(x, 0, zside); stall.rotation.y = (si % 2 === 0) ? 0 : Math.PI
    group.add(stall)
    obstacles.push({ x, z: zside, hw: 1.4, hd: 1.0 })
    si++
  }
  for (const z of [12.6, 14.6, 16.4]) {
    const s = makeLanternString(-14, z, 14, z, 9, 3.5)
    group.add(s); lanternStrings.push({ g: s, base: 3.5, ph: z })
  }

  // ── Side parks (cozy green) ──
  onPhase?.('Planting parks', 0.84)
  const parks = [
    { x: -16, z: -6, w: 7, d: 8 },
    { x: 16, z: -4, w: 7, d: 7 },
  ]
  for (const pk of parks) {
    group.add(makeGrassPatch(pk.x, pk.z, pk.w, pk.d))
    minimap.parks.push(pk)
    for (let i = 0; i < 6; i++) treePos.push([pk.x + rand(-pk.w / 2 + 1, pk.w / 2 - 1), pk.z + rand(-pk.d / 2 + 1, pk.d / 2 - 1)])
    for (let i = 0; i < 4; i++) bushPos.push([pk.x + rand(-pk.w / 2 + 1, pk.w / 2 - 1), pk.z + rand(-pk.d / 2 + 1, pk.d / 2 - 1)])
    const bench = makeBench(); bench.position.set(pk.x, 0, pk.z + 1.6); group.add(bench)
  }

  // ── Street-level detail (curated, off-road) ──
  onPhase?.('Dressing the streets', 0.9)
  const vend = [[-9, 16.8, 0], [-3, 16.8, 0], [3, 16.8, 0], [9, 16.8, 0]]
  const plant = [[-4.4, -10], [4.4, -10], [-4.4, -14], [4.4, -14], [-4.4, -18], [4.4, -18], [-7.6, -2.5], [7.6, -2.5], [-7.6, 2.5], [7.6, 2.5]]
  const bike = [[-12, 16.6], [12, 16.6], [-7.2, 5.5], [7.2, -5.5], [11, 4]]
  const bin = [[-6.4, -6.4], [6.4, -6.4], [6.4, 6.4], [-6.4, 6.4]]
  const cone = [[2.4, -7.6], [-2.4, 7.6]]
  group.add(makeVending(vend), makePlanters(plant), makeCones(cone), makeBins(bin), makeBikes(bike))

  // perimeter tree frame + backing behind tower
  for (let t = -half + 2.5; t <= half - 2.5; t += 4.5) {
    treePos.push([t, -half + 2.5], [t, half - 2.5], [-half + 2.5, t], [half - 2.5, t])
  }

  onPhase?.('Final touches', 0.94)
  group.add(makeTrees(treePos))
  group.add(makeBushes(bushPos))

  // lamps: plaza ring + ring-road inner corners + market
  const lampPos = [[-5.6, -5.6], [5.6, -5.6], [5.6, 5.6], [-5.6, 5.6],
    [-12.5, -12.5], [12.5, -12.5], [12.5, 12.5], [-12.5, 12.5], [-14.5, 17], [14.5, 17]]
  group.add(makeLamps(lampPos))

  // ── Life & motion ──
  const traffic = makeTraffic(); group.add(traffic.group)
  const peds = makePedestrians(); group.add(peds.mesh)
  const clouds = makeClouds(5); group.add(clouds.group)

  return {
    group,
    half,
    projectBuildings,
    obstacles,
    bounds: { min: -(half - 2), max: half - 2 },
    spawn: { x: 0, z: 9, heading: Math.PI },
    minimap,
    animate(t, nightT = 0) {
      fountain.animate(t)
      traffic.animate(t)
      peds.animate(t)
      clouds.animate(t, nightT)
      // tower beacon pulse
      const tb = tower.beacon
      if (tb) tb.material.emissiveIntensity = 0.3 + (0.4 + 0.6 * nightT) * (0.6 + 0.4 * Math.sin(t * 4))
      // lantern strings: gentle bob
      for (const ls of lanternStrings) ls.g.position.y = Math.sin(t * 1.6 + ls.ph) * 0.06
      // project beacons
      for (const pb of projectBuildings) {
        pb.beacon.rotation.y = t * 1.1
        const dm = pb.beacon.userData.diamond
        if (dm) dm.position.y = 1.45 + Math.sin(t * 2 + pb.pos.x) * 0.12
      }
    },
  }
}
