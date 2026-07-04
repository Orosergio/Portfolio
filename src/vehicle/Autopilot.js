import { clamp, wrapAngle, TAU } from '../util/math.js'

// ── Autopilot: self-driving to any project landmark ──────────────────────
// A hand-laid waypoint graph over the real road network (ring, both avenues,
// the fountain roundabout, plus spurs to off-road landmarks), Dijkstra route
// search, and a pure-pursuit follower that feeds {throttle, steer} into the
// EXISTING CartController physics — so collisions, bounds, camera juice and
// vehicle switching all keep working, and the player can grab the wheel at
// any instant (main.js cancels on manual input).
//
// Numbers tuned against the physics (steerRate 2.7, accel 19, drag 1.25):
//  - the fountain collision test is an AABB (hw 3.95 incl. vehicle radius):
//    its CORNER reaches 3.95·√2 = 5.59, so the roundabout loop bulges to
//    r 6.05 on the diagonals (still inside the 6.5 annulus).
//  - traffic drives LEFT-hand (the avenue shuttles run x=+1.7 northbound):
//    laned segments are offset 1.6u to the driver's left, so oncoming cars
//    pass in the other lane instead of deadlocking nose-to-nose.

const CRUISE = 6.8        // auto top speed (below kart max for smoothness)
const LANE = 1.6          // left-hand lane offset on ring/avenue segments
const KP_STEER = 2.4
const TURN_VMAX = 4.2     // through sharp turns + the roundabout
const BRAKE_A = 4.5       // assumed decel for slow-point anticipation
const ARRIVE_R = 1.3      // done when this close to the park spot (arc dist)
const FOLLOW_GAP = 2.3    // car-following: stop distance behind a car
const FOLLOW_R = 7        // how far ahead we look for cars
const FOLLOW_LAT = 1.15   // same-lane lateral tolerance

// ---- graph ---------------------------------------------------------------
function buildGraph() {
  const nodes = []
  const edges = [] // adjacency: edges[i] = [j, ...]
  const add = (x, z, lane = false) => { nodes.push({ x, z, lane }); edges.push([]); return nodes.length - 1 }
  const link = (a, b) => { edges[a].push(b); edges[b].push(a) }
  const chain = (ids) => { for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]) }

  // roundabout: 16-node rounded square (axes 5.25 / ±22.5° 5.6 / diagonals 6.05)
  // — bulged so pure-pursuit chord-cutting never grazes the fountain AABB
  const R = []
  const rr = [5.25, 5.6, 6.05, 5.6]
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU
    const r = rr[i % 4]
    R.push(add(r * Math.cos(a), r * Math.sin(a)))
  }
  for (let i = 0; i < 16; i++) link(R[i], R[(i + 1) % 16])
  // R[0]=(5,0) E · R[4]=(0,5) S · R[8]=(-5,0) W · R[12]=(0,-5) N

  // avenues (laned) — join the roundabout axis nodes to the ring junctions
  const AN = [add(0, -8.2, true), add(0, -14, true), add(0, -20, true)]
  const AS = [add(0, 8.2, true), add(0, 13, true), add(0, 18, true)]
  const AE = [add(8.2, 0, true), add(13, 0, true), add(18, 0, true)]
  const AW = [add(-8.2, 0, true), add(-14, 0, true), add(-18, 0, true)]
  // The hero towers' collision boxes swallow the OUTER half of the ring in
  // front of them (Tokyo Tower reaches z -21.55, Taipei 101 reaches z 22.75),
  // so the north/south straights are single fixed INNER-lane corridors —
  // unlaned nodes pinned where both directions can actually drive.
  const JN = add(0, -20.7), JS = add(0, 20.4)
  const JE = add(22, 0, true), JW = add(-22, 0, true)
  chain([R[12], ...AN, JN]); chain([R[4], ...AS, JS])
  chain([R[0], ...AE, JE]); chain([R[8], ...AW, JW])

  // squared ring (laned), corners + mid nodes + park anchors.
  // Corners stay UNLANED: the inner-lane miter at C_NE cuts into the Skytree
  // collision box — swinging wide over the centerline clears all four.
  const C_NW = add(-22, -22), C_NE = add(22, -22)
  const C_SE = add(22, 22), C_SW = add(-22, 22)
  // park-anchor nodes stay UNLANED: the inner lanes of the east/west ring
  // clip the Skytree / tower collision boxes — stopping bays hug the centerline
  chain([C_NW, add(-12, -20.7), JN, add(12, -20.7), C_NE])                // north straight (inner corridor)
  chain([C_NE, add(22, -16.5), add(22, -8, true), JE, add(22, 8, true), C_SE]) // east
  chain([C_SE, add(12, 20.4), JS, add(-12, 20.4), C_SW])                  // south straight (inner corridor)
  chain([C_SW, add(-22, 8, true), JW, add(-22, -9), C_NW])                // west

  // off-road spurs (unlaned): Akihabara, Taipei Dome, Longshan approaches
  link(AE[1], add(13, -2.5))    // akihabara park street stub
  link(AE[1], add(13.5, 7.2))   // stadium portal
  link(AW[1], add(-14, 8.6))    // longshan gate

  return { nodes, edges }
}

const GRAPH = buildGraph()

// left-hand lane offset for a unit direction d = {x, z}
const laneOff = (d, out) => { out.x = -d.z * LANE; out.z = d.x * LANE; return out }

export class Autopilot {
  constructor(cars = []) {
    this.cars = cars
    this.active = false
    this.arrived = false
    this.project = null
    this._pts = []      // path points {x, z, vmax}
    this._seg = 0
    this._out = { throttle: 0, steer: 0 }
    this._blockedT = 0
    this._ignoreCarsT = 0
  }

  // Route from the vehicle position to the project's park spot. True on success.
  engage(project, pos) {
    const park = project.park
    if (!park) return false
    const path = this._route({ x: pos.x, z: pos.z }, { x: park[0], z: park[1] })
    if (!path) return false
    this._pts = path
    this._seg = 0
    this.project = project
    this.active = true
    this.arrived = false
    this._blockedT = 0
    this._ignoreCarsT = 0
    return true
  }

  cancel() {
    this.active = false
    this.project = null
  }

  _nearestNode(p) {
    const { nodes } = GRAPH
    let best = 0, bd = Infinity
    for (let i = 0; i < nodes.length; i++) {
      const d = (nodes[i].x - p.x) ** 2 + (nodes[i].z - p.z) ** 2
      if (d < bd) { bd = d; best = i }
    }
    return best
  }

  // Dijkstra (graph is ~50 nodes — no heap needed), then post-process:
  // trim overshoot, apply lane offsets, tag slow points at sharp turns.
  _route(from, to) {
    const { nodes, edges } = GRAPH
    const start = this._nearestNode(from)
    const goal = this._nearestNode(to)
    const dist = new Array(nodes.length).fill(Infinity)
    const prev = new Array(nodes.length).fill(-1)
    const done = new Array(nodes.length).fill(false)
    dist[start] = 0
    for (;;) {
      let u = -1, ud = Infinity
      for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i }
      if (u === -1) break
      if (u === goal) break
      done[u] = true
      for (const v of edges[u]) {
        const w = Math.hypot(nodes[v].x - nodes[u].x, nodes[v].z - nodes[u].z)
        if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u }
      }
    }
    if (dist[goal] === Infinity) return null

    const ids = []
    for (let v = goal; v !== -1; v = prev[v]) ids.unshift(v)
    let pts = ids.map((i) => ({ x: nodes[i].x, z: nodes[i].z, lane: nodes[i].lane, vmax: Infinity }))
    pts.push({ x: to.x, z: to.z, lane: false, vmax: 0 })

    // drop leading nodes that point backwards (vehicle already past them)
    while (pts.length >= 2) {
      const d0 = Math.hypot(pts[0].x - from.x, pts[0].z - from.z)
      const d1 = Math.hypot(pts[1].x - from.x, pts[1].z - from.z)
      const seg = Math.hypot(pts[1].x - pts[0].x, pts[1].z - pts[0].z)
      if (d1 < seg && d0 > 1.5 && d1 < d0) pts.shift()
      else break
    }
    // trim end overshoot (park spot sits before the last graph node)
    while (pts.length >= 3) {
      const a = pts[pts.length - 3], b = pts[pts.length - 2], p = pts[pts.length - 1]
      if (Math.hypot(p.x - a.x, p.z - a.z) <= Math.hypot(b.x - a.x, b.z - a.z)) pts.splice(pts.length - 2, 1)
      else break
    }

    // lane offset (driver's LEFT — matches the shuttles/ring traffic).
    // Proper polyline MITER JOIN: each corner shifts to the intersection of
    // its two offset lanes — averaging directions pre-rotates the corner into
    // flanking buildings, and incoming-only parks it inside the junction
    // (where Tokyo Tower's collision box overlaps the north ring).
    const unitDir = (a, b, out) => {
      out.x = b.x - a.x; out.z = b.z - a.z
      const len = Math.hypot(out.x, out.z) || 1
      out.x /= len; out.z /= len
      return out
    }
    const dIn = { x: 0, z: 0 }, dOut = { x: 0, z: 0 }
    const n1 = { x: 0, z: 0 }, n2 = { x: 0, z: 0 }
    const shifted = pts.map((p, i) => {
      if (!p.lane) return { ...p }
      unitDir(pts[Math.max(0, i - 1)], i > 0 ? p : pts[1], dIn)
      unitDir(i < pts.length - 1 ? p : pts[i - 1], pts[Math.min(pts.length - 1, i + 1)], dOut)
      n1.x = -dIn.z; n1.z = dIn.x
      n2.x = -dOut.z; n2.z = dOut.x
      const dot = n1.x * n2.x + n1.z * n2.z
      const k = LANE / Math.max(1 + dot, 0.35) // miter (clamped for sharp turns)
      return { ...p, x: p.x + (n1.x + n2.x) * k, z: p.z + (n1.z + n2.z) * k }
    })

    // slow points: sharp direction changes (junction turns, roundabout entry)
    for (let i = 1; i < shifted.length - 1; i++) {
      const a = shifted[i - 1], b = shifted[i], c = shifted[i + 1]
      const h1 = Math.atan2(b.x - a.x, b.z - a.z)
      const h2 = Math.atan2(c.x - b.x, c.z - b.z)
      if (Math.abs(wrapAngle(h2 - h1)) > 0.6) shifted[i].vmax = Math.min(shifted[i].vmax, TURN_VMAX)
      // roundabout nodes sit within r≈6.1 of the origin
      if (Math.hypot(b.x, b.z) < 6.6) shifted[i].vmax = Math.min(shifted[i].vmax, TURN_VMAX)
    }
    return shifted
  }

  // dt-driven; reads the live controller; returns a REUSED {throttle, steer}.
  update(dt, controller) {
    if (!this.active) return null
    const pos = controller.position
    const pts = this._pts

    // project onto the current segment; advance segments as we pass them
    let seg = this._seg
    let px = pos.x, pz = pos.z, t = 0
    for (;;) {
      const a = pts[seg], b = pts[seg + 1] || a
      const abx = b.x - a.x, abz = b.z - a.z
      const len2 = abx * abx + abz * abz
      t = len2 > 1e-6 ? clamp(((pos.x - a.x) * abx + (pos.z - a.z) * abz) / len2, 0, 1) : 1
      if (t >= 1 && seg < pts.length - 2) { seg++; continue }
      px = a.x + abx * t; pz = a.z + abz * t
      break
    }
    this._seg = seg

    // remaining arc length + lookahead target + nearest slow-point cap
    const v = controller.speed
    let L = clamp(1.5 + 0.45 * Math.abs(v), 2.2, 4.6)
    // shorten the lookahead approaching a turn — long lookaheads cut the
    // corner chord straight through whatever flanks the junction
    {
      let walked0 = 0, cx0 = px, cz0 = pz
      for (let i = seg + 1; i < pts.length && walked0 < 5; i++) {
        walked0 += Math.hypot(pts[i].x - cx0, pts[i].z - cz0)
        if (pts[i].vmax < CRUISE && walked0 < 4) { L = Math.min(L, 2.3); break }
        cx0 = pts[i].x; cz0 = pts[i].z
      }
    }
    let remain = 0, tx = pts[pts.length - 1].x, tz = pts[pts.length - 1].z
    let walked = 0, targetSet = false
    let vT = Math.min(CRUISE, controller.maxSpeed * 0.85)
    let cx = px, cz = pz
    for (let i = seg + 1; i < pts.length; i++) {
      const p = pts[i]
      const d = Math.hypot(p.x - cx, p.z - cz)
      if (!targetSet && walked + d >= L) {
        const k = (L - walked) / d
        tx = cx + (p.x - cx) * k; tz = cz + (p.z - cz) * k
        targetSet = true
      }
      walked += d
      remain += d
      // anticipate slow points/turns within braking range
      if (p.vmax < vT && walked < 16) vT = Math.min(vT, Math.sqrt(p.vmax * p.vmax + 2 * BRAKE_A * walked))
      cx = p.x; cz = p.z
    }

    // arrival
    if (remain < ARRIVE_R) {
      this.active = false
      this.arrived = true
      this._out.throttle = 0; this._out.steer = 0
      return this._out
    }
    vT = Math.min(vT, Math.max(0, (remain - 0.4) * 1.3))

    // steering — positive steer DECREASES heading in CartController
    const err = wrapAngle(Math.atan2(tx - pos.x, tz - pos.z) - controller.heading)
    this._out.steer = clamp(-KP_STEER * err, -1, 1)
    if (Math.abs(err) > 1.6) vT = Math.min(vT, 2.6) // creeping U-turn

    // car-following: ease off behind traffic in our lane (rect cone)
    const capBefore = vT
    if (this._ignoreCarsT > 0) this._ignoreCarsT -= dt
    else {
      const fx = Math.sin(controller.heading), fz = Math.cos(controller.heading)
      for (const car of this.cars) {
        const rx = car.position.x - pos.x, rz = car.position.z - pos.z
        const along = rx * fx + rz * fz
        if (along < 0.5 || along > FOLLOW_R) continue
        const lat = Math.abs(rx * fz - rz * fx)
        if (lat < FOLLOW_LAT) vT = Math.min(vT, Math.max(0, 1.15 * (along - FOLLOW_GAP)))
      }
    }
    // escape hatch: wedged behind something for a while → ignore cars briefly
    if (capBefore > 1 && vT < 0.5 && Math.abs(v) < 0.4) {
      this._blockedT += dt
      if (this._blockedT > 2.5) { this._ignoreCarsT = 1.5; this._blockedT = 0 }
    } else this._blockedT = 0

    // target-speed → throttle (P + drag feedforward); never command reverse
    let throttle = clamp((vT - v) * 0.55 + (controller.drag * vT) / controller.accel, -0.8, 1)
    if (vT < 0.5 && v < 0.6) throttle = 0
    if (throttle < 0 && v <= 0.5) throttle = 0
    this._out.throttle = throttle
    return this._out
  }
}
