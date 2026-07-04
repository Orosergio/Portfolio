import * as THREE from 'three'
import { palette } from './palette.js'
import { makeGround, makeGrassPatch } from './Ground.js'
import { makeIslandRoads } from './factory/roads.js'
import { makeLamps } from './factory/props.js'
import { makeTrees, makeBushes, makeSakura } from './factory/trees.js'
import { makeVending, makePlanters, makeCones, makeBins, makeBikes } from './factory/streetprops.js'
import { makeShop } from './factory/buildings.js'
import { makeTokyoTower, makeStall, makeLanternString, makeFountain } from './factory/landmarks.js'
import { makeSkytree, makeKaminarimon, makeFushimiPath, makeAkihabara, makeFuji } from './factory/landmarks-japan.js'
import { makeTaipei101, makeStadium, makeLongshan, makeSkyLanterns, makeMarketGate } from './factory/landmarks-taiwan.js'
import { makeNameplate } from './factory/nameplates.js'
import { makeTraffic, makePedestrians, makeClouds } from './factory/life.js'
import { projects } from '../projects/projects.data.js'
import { rand } from '../util/math.js'
import { mergeStatic } from '../util/geo.js'

// ── Two-district island: Japan (north) ↔ Taiwan (south) ─────────────────
// Every project lives inside an ICONIC LANDMARK. The grand avenue runs the
// hero axis Tokyo Tower (N) → fountain roundabout → Taipei 101 (S), with a
// Taiwanese night-market street lining the southern avenue, Fushimi Inari's
// torii tunnel on the west edge, Mount Fuji on the horizon, and Pingxi sky
// lanterns drifting over the Taiwan district after dark.
//
// Scale rubric (1u ≈ 1.8 m): fillers 3–4u < temples/gates 5–7.5u < stadium
// (wide, low) < Tokyo Tower ~20u < Taipei 101 ~23.5u < Skytree ~26.5u.
export function buildWorld(onPhase) {
  const half = 34
  const RING = 22, ROAD_W = 5, AVENUE_W = 6.5, PLAZA_R = 7.4
  const group = new THREE.Group()
  const obstacles = []
  const treePos = [], sakuraPos = [], bushPos = []
  const projectBuildings = []
  const animated = [] // landmark { animate } hooks
  const lanternStrings = []
  const minimap = {
    half,
    ring: { hx: RING, hz: RING, w: ROAD_W },
    avenueW: AVENUE_W,
    plazaR: PLAZA_R,
    rects: [], // {x,z,w,d,kind:'sand'|'park'}
    projects: [],
  }

  const D = palette
  const paved = (x, z, w, d, color = palette.sand) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }))
    m.position.set(x, 0.08, z); m.receiveShadow = true; group.add(m)
    minimap.rects.push({ x, z, w, d, kind: 'sand' })
    return m
  }

  onPhase?.('Laying the island', 0.1)
  group.add(makeGround({ half }))
  group.add(makeIslandRoads({ hx: RING, hz: RING, roadW: ROAD_W, avenueW: AVENUE_W, plazaR: PLAZA_R, apronZ: 27 }))

  // ── Central fountain (the hub both districts share) ──
  onPhase?.('Setting the fountain', 0.18)
  const fountain = makeFountain()
  group.add(fountain.group)
  obstacles.push({ x: 0, z: 0, hw: 2.9, hd: 2.9 })

  // ── Mount Fuji on the northern horizon (Japan reads instantly) ──
  onPhase?.('Raising Mount Fuji', 0.24)
  const fuji = makeFuji()
  fuji.group.position.set(-22, -6, -112)
  fuji.group.traverse((o) => o.layers.set(1)) // atmosphere layer: GTAO ignores it
  group.add(fuji.group)

  // ── The 8 project landmarks ──
  onPhase?.('Building the landmarks', 0.42)
  const BUILDERS = {
    tokyoTower: makeTokyoTower, taipei101: makeTaipei101, skytree: makeSkytree,
    fushimi: makeFushimiPath, stadium: makeStadium, akihabara: makeAkihabara,
    nightMarket: makeMarketGate, longshan: makeLongshan,
  }
  // per-landmark placement tweaks: uniform scale + obstacle fallback
  const TWEAK = {
    // 4.4: the splayed legs reach ±4.35 at the base — the old 4.0 box let the
    // kart nose sink into a leg
    tokyoTower: { obstacles: [{ x: 0, z: 0, hw: 4.4, hd: 4.4 }] },
    stadium: { scale: 0.92 },
  }
  // hero aprons so both towers sit on dressed stone
  paved(0, -27, 11, 10, palette.sand)
  paved(0, 27, 11, 10, palette.sand)
  paved(-27, 1.2, 6, 4.5, palette.sand) // Fushimi entrance apron off the west ring

  for (const p of projects) {
    const [x, z] = p.pos
    const built = BUILDERS[p.landmark]()
    const s = TWEAK[p.landmark]?.scale ?? 1
    built.group.position.set(x, 0, z)
    built.group.rotation.y = p.rotY || 0
    if (s !== 1) built.group.scale.setScalar(s)
    group.add(built.group)

    const obs = built.obstacles?.length ? built.obstacles : (TWEAK[p.landmark]?.obstacles || [])
    for (const o of obs) obstacles.push(rotObs(o, p.rotY || 0, x, z, s))
    if (built.animate) animated.push(built)

    const top = (built.top ?? 8) * s
    const plate = makeNameplate(p.title, p.accent)
    // cap like the tooltip anchor: the follow cam never sees points above ~9u
    // near a landmark base, so uncapped plates on the hero towers never showed
    plate.position.set(x, Math.min(top + 0.7, 9), z)
    group.add(plate)

    projectBuildings.push({
      project: p,
      // tooltip anchor: above the base for tall towers (not the tip — it
      // would project off-screen), just over the roof for low landmarks
      anchor: new THREE.Vector3(x, Math.min(top + 1.6, 10.5), z),
      pos: new THREE.Vector2(x, z),
      enter: p.enterR || 7,
    })
    minimap.projects.push({ id: p.id, x, z, color: p.accent })

    // tower beacon pulse (the tokyoTower builder exposes `beacon`)
    if (built.beacon) {
      const tb = built.beacon
      animated.push({ animate: (t, nightT) => { tb.material.emissiveIntensity = 0.3 + (0.4 + 0.6 * nightT) * (0.6 + 0.4 * Math.sin(t * 4)) } })
    }
  }

  // ── Kaminarimon stands as a decorative gate (no project — it welcomes
  // drivers into the Japan machiya blocks; nameplates mark the projects) ──
  const kam = makeKaminarimon()
  kam.group.position.set(-16, 0, -13)
  group.add(kam.group)
  for (const o of kam.obstacles) obstacles.push(rotObs(o, 0, -16, -13, 1))
  if (kam.animate) animated.push(kam)

  // ── Filler shophouses (texture; never the stars — ≤ ~4.7u incl. roofs) ──
  // All fillers live in ONE group merged in a single mergeStatic pass:
  // pooled materials in buildings.js let 16 houses collapse to ~a dozen draws.
  onPhase?.('Filling the streets', 0.6)
  const fillers = [
    // Japan: avenue lining + inner blocks
    { x: -5.4, z: -12, w: 4.0, d: 3.5, h: 3.2, a: 'machiya', c: D.domSandCream },
    { x: 5.4, z: -12, w: 4.0, d: 3.5, h: 3.0, a: 'machiya', c: D.domMutedBlue },
    { x: -5.4, z: -17.5, w: 4.0, d: 3.5, h: 3.2, a: 'machiya', c: D.domTerracotta },
    { x: 5.4, z: -17.5, w: 4.2, d: 3.6, h: 2.8, a: 'market', c: D.domSandCream },
    { x: -10.5, z: -7, w: 3.8, d: 3.4, h: 2.8, a: 'machiya', c: D.domSage },
    { x: -9.5, z: -17.5, w: 3.8, d: 3.4, h: 3.0, a: 'machiya', c: D.accFillWarm },
    { x: 9.5, z: -13, w: 3.8, d: 3.4, h: 3.0, a: 'machiya', c: D.domTaupe },
    // Japan: outer strip flanking the Tower apron
    { x: -12, z: -28, w: 4.2, d: 3.6, h: 3.2, a: 'machiya', c: D.domTerracotta },
    { x: 12, z: -28, w: 4.2, d: 3.6, h: 3.0, a: 'machiya', c: D.domSandCream },
    { x: 28, z: -3, w: 4.0, d: 3.6, h: 3.0, a: 'machiya', c: D.accFillTeal },
    // Taiwan: plaza corners + outer strip flanking the 101 apron
    { x: 8.5, z: 6.2, w: 3.8, d: 3.2, h: 2.8, a: 'market', c: D.domSandCream },
    { x: -8.5, z: 6.2, w: 3.8, d: 3.2, h: 2.8, a: 'market', c: D.domTerracotta },
    { x: -12, z: 28, w: 4.2, d: 3.6, h: 3.2, a: 'market', c: D.accFillPink },
    { x: 12, z: 28, w: 4.2, d: 3.6, h: 3.0, a: 'machiya', c: D.domMutedBlue },
    { x: 28, z: 10, w: 4.0, d: 3.6, h: 3.0, a: 'machiya', c: D.domSage },
    { x: -28, z: 24, w: 4.0, d: 3.6, h: 3.0, a: 'machiya', c: D.domTaupe },
  ]
  const fillGroup = new THREE.Group()
  for (const f of fillers) {
    const b = makeShop(f.c, f.w, f.d, f.h, f.a)
    b.position.set(f.x, 0, f.z); fillGroup.add(b)
    obstacles.push({ x: f.x, z: f.z, hw: f.w / 2, hd: f.d / 2 })
  }
  group.add(mergeStatic(fillGroup))

  // ── Taiwanese night-market street lining the southern avenue ──
  onPhase?.('Stringing the night market', 0.72)
  let si = 0
  const marketGroup = new THREE.Group()
  for (const z of [9.5, 12.5, 15.5, 18.5]) {
    for (const sx of [-1, 1]) {
      const stall = makeStall(si)
      stall.position.set(sx * 5.2, 0, z)
      stall.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2 // face the avenue
      marketGroup.add(stall)
      obstacles.push({ x: sx * 5.2, z, hw: 1.0, hd: 1.4 })
      si++
    }
  }
  group.add(mergeStatic(marketGroup)) // 8 stalls → 1 static mesh + pooled signs
  for (const z of [10.8, 13.8, 16.8]) {
    const s = makeLanternString(-5.4, z, 5.4, z, 6, 3.5)
    group.add(s); lanternStrings.push({ g: s, base: 3.5, ph: z })
  }

  // ── Parks & green pockets ──
  onPhase?.('Planting parks', 0.8)
  const jpPark = { x: -12, z: -20.5, w: 7, d: 5.5 }
  group.add(makeGrassPatch(jpPark.x, jpPark.z, jpPark.w, jpPark.d))
  minimap.rects.push({ ...jpPark, kind: 'park' })
  for (let i = 0; i < 6; i++) sakuraPos.push([jpPark.x + rand(-2.6, 2.6), jpPark.z + rand(-1.9, 1.9)])
  for (let i = 0; i < 3; i++) bushPos.push([jpPark.x + rand(-2.6, 2.6), jpPark.z + rand(-1.9, 1.9)])
  for (const [cx, cz] of [[28.5, -28.5], [28.5, 28.5], [-28.5, 28.5]]) {
    group.add(makeGrassPatch(cx, cz, 6, 6))
    minimap.rects.push({ x: cx, z: cz, w: 6, d: 6, kind: 'park' })
    const bucket = cz < 0 ? sakuraPos : treePos
    for (let i = 0; i < 4; i++) bucket.push([cx + rand(-2.2, 2.2), cz + rand(-2.2, 2.2)])
    for (let i = 0; i < 2; i++) bushPos.push([cx + rand(-2.2, 2.2), cz + rand(-2.2, 2.2)])
  }

  // perimeter tree frame: sakura on the Japan half, green on the Taiwan half.
  // Skip gaps where the hero aprons and the Fushimi path meet the edge.
  for (let t = -half + 2.5; t <= half - 2.5; t += 4.5) {
    if (Math.abs(t) > 7.5) { sakuraPos.push([t, -half + 2.5]); treePos.push([t, half - 2.5]) }
    ;(t < 0 ? sakuraPos : treePos).push([half - 2.5, t])
    if (t < -20 || t > 2) (t < 0 ? sakuraPos : treePos).push([-half + 2.5, t])
  }
  // avenue greenery accents near the plaza
  for (const [x, z] of [[-8.5, -3.2], [8.5, -3.2], [-7.4, -26.5], [7.4, -26.5]]) sakuraPos.push([x, z])
  for (const [x, z] of [[-8.5, 3.2], [8.5, 3.2]]) treePos.push([x, z])

  // ── Street-level detail (curated, off-road) ──
  onPhase?.('Dressing the streets', 0.88)
  const vend = [[-7.4, 11, Math.PI / 2], [7.4, 14, -Math.PI / 2], [16.9, -5.2, 0], [-11.8, -12.2, 0]]
  const plant = [[-4.4, -9.5], [4.4, -9.5], [-4.4, -15], [4.4, -15], [-7.6, -2.5], [7.6, -2.5], [-7.6, 2.5], [7.6, 2.5]]
  const bike = [[-12.6, 2.9], [12.6, -2.9], [16.4, -7.2], [-11.6, 16.4]]
  const bin = [[-6.4, -6.4], [6.4, -6.4], [6.4, 6.4], [-6.4, 6.4]]
  const cone = [[2.4, -8.9], [-2.4, 8.9]]
  group.add(makeVending(vend), makePlanters(plant), makeCones(cone), makeBins(bin), makeBikes(bike))

  onPhase?.('Final touches', 0.94)
  group.add(makeTrees(treePos))
  group.add(makeSakura(sakuraPos))
  group.add(makeBushes(bushPos))

  // lamps: plaza ring + ring-road inner corners + Japan avenue (the Taiwan
  // avenue is lit by the market lantern strings instead)
  const lampPos = [[-5.6, -5.6], [5.6, -5.6], [5.6, 5.6], [-5.6, 5.6],
    [-17.8, -17.8], [17.8, -17.8], [17.8, 17.8], [-17.8, 17.8],
    [-4.3, -11.5], [4.3, -11.5], [-4.3, -18], [4.3, -18]]
  group.add(makeLamps(lampPos))

  // ── Life & motion ──
  const lastAnim = { t: NaN, n: NaN, x: NaN, z: NaN }
  const traffic = makeTraffic({ hx: RING, hz: RING, corner: 5.5 })
  group.add(traffic.group)
  const peds = makePedestrians()
  group.add(peds.mesh)
  const clouds = makeClouds(6)
  group.add(clouds.group)
  const skyLan = makeSkyLanterns(12)
  group.add(skyLan.group)

  return {
    group,
    half,
    projectBuildings,
    obstacles,
    trafficCars: traffic.cars,
    bounds: { min: -(half - 2), max: half - 2 },
    // spawn on the grand avenue facing the Tower + Fuji — the money shot
    spawn: { x: 0, z: -8, heading: Math.PI },
    minimap,
    // cart: {x, z} of the player vehicle (peds step aside, traffic brakes).
    // honk: {x, z, t} of the last horn/bell blast (peds nearby hop).
    animate(t, nightT = 0, cart = null, honk = null) {
      // reduced-motion idle: identical inputs ⇒ identical output — skip all
      // recompute + instance-buffer uploads (t is frozen at 6.0 there)
      const cx = cart ? cart.x : 0, cz = cart ? cart.z : 0
      if (t === lastAnim.t && nightT === lastAnim.n && cx === lastAnim.x && cz === lastAnim.z && !honk) return
      lastAnim.t = t; lastAnim.n = nightT; lastAnim.x = cx; lastAnim.z = cz
      fountain.animate(t)
      traffic.animate(t, cart)
      peds.animate(t, cart, honk)
      clouds.animate(t, nightT)
      skyLan.animate(t, nightT)
      for (const a of animated) a.animate(t, nightT)
      for (const ls of lanternStrings) ls.g.position.y = Math.sin(t * 1.6 + ls.ph) * 0.06
    },
  }
}

// Transform a landmark-local obstacle box to world space (yaw in 90° steps,
// uniform scale s, then translate). Sufficient for our axis-aligned city.
function rotObs(o, rotY, x, z, s = 1) {
  const q = Math.round(rotY / (Math.PI / 2)) & 3
  let { x: ox, z: oz, hw, hd } = o
  ox *= s; oz *= s; hw *= s; hd *= s
  if (q === 1) { const t = ox; ox = oz; oz = -t; const th = hw; hw = hd; hd = th }
  else if (q === 2) { ox = -ox; oz = -oz }
  else if (q === 3) { const t = ox; ox = -oz; oz = t; const th = hw; hw = hd; hd = th }
  return { x: x + ox, z: z + oz, hw, hd }
}
