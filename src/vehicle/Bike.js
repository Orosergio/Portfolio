import * as THREE from 'three'
import { palette } from '../world/palette.js'
import { rbox, markEmissive } from '../util/geo.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.55, metalness: 0, ...o })

// A Taipei YouBike-style city bike (warm yellow frame, cream fenders, front
// basket). Faces +z. Shares the vehicle userData contract with the kart:
// { wheels, steer, driverMount, body } — the whole bike lives inside `body`
// so the controller's bank lean tilts frame, wheels and rider together.
export function makeBike() {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const frameMat = mat(palette.bikeFrame)
  const darkMat = mat('#2b313a', { roughness: 0.7 })
  const creamMat = mat('#f7f2e8', { roughness: 0.6 })

  const WHEEL_R = 0.46
  const wheelGeo = new THREE.TorusGeometry(WHEEL_R - 0.05, 0.055, 8, 20)
  const tireMat = mat(palette.wheel, { roughness: 0.85 })
  const hubGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.09, 10).rotateZ(Math.PI / 2)
  const spokeGeo = new THREE.CylinderGeometry(0.014, 0.014, (WHEEL_R - 0.06) * 2, 4)
  const mkWheel = () => {
    const g = new THREE.Group()
    const tire = new THREE.Mesh(wheelGeo, tireMat)
    tire.rotation.y = Math.PI / 2 // torus axis along X so rotation.x rolls it
    tire.castShadow = true
    g.add(tire)
    g.add(new THREE.Mesh(hubGeo, mat(palette.wheelHub, { metalness: 0.4, roughness: 0.35 })))
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
      const s = new THREE.Mesh(spokeGeo, darkMat)
      s.rotation.x = a
      g.add(s)
    }
    return g
  }

  const wheels = []

  // rear wheel + fender + rack
  const rear = mkWheel()
  rear.position.set(0, WHEEL_R, -0.78)
  body.add(rear); wheels.push(rear)
  const rFender = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_R + 0.035, 0.035, 6, 12, Math.PI * 0.85).rotateY(Math.PI / 2).rotateX(-Math.PI * 0.12),
    creamMat)
  rFender.position.set(0, WHEEL_R, -0.78)
  body.add(rFender)
  const rack = new THREE.Mesh(rbox(0.3, 0.06, 0.5, 0.03), frameMat)
  rack.position.set(0, 0.98, -0.85)
  body.add(rack)

  // ── steering assembly: fork + front wheel + fender + handlebar + basket ──
  // steer pivots around its own y (slightly ahead of the head tube).
  const steer = new THREE.Group()
  steer.position.set(0, 0, 0.72)
  body.add(steer)
  const front = mkWheel()
  front.position.set(0, WHEEL_R, 0)
  steer.add(front); wheels.push(front)
  const fFender = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_R + 0.035, 0.035, 6, 12, Math.PI * 0.8).rotateY(Math.PI / 2).rotateX(Math.PI * 0.62),
    creamMat)
  fFender.position.set(0, WHEEL_R, 0)
  steer.add(fFender)
  for (const sx of [-0.06, 0.06]) {
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.62, 6), frameMat)
    blade.position.set(sx, WHEEL_R + 0.24, 0.07)
    blade.rotation.x = 0.22
    steer.add(blade)
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 6), frameMat)
  stem.position.set(0, 1.08, 0.1)
  stem.rotation.x = 0.18
  steer.add(stem)
  const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.66, 8).rotateZ(Math.PI / 2), darkMat)
  hbar.position.set(0, 1.28, 0.06)
  steer.add(hbar)
  for (const sx of [-0.3, 0.3]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8).rotateZ(Math.PI / 2), mat('#3a2c20', { roughness: 0.85 }))
    grip.position.set(sx, 1.28, 0.06)
    steer.add(grip)
  }
  // front basket (the YouBike signature)
  const basket = new THREE.Group()
  basket.position.set(0, 1.02, 0.34)
  const bwall = mat('#8a8f96', { roughness: 0.5, metalness: 0.3 })
  const bBottom = new THREE.Mesh(rbox(0.42, 0.05, 0.34, 0.02), bwall)
  basket.add(bBottom)
  for (const [w, d, x, z] of [[0.42, 0.05, 0, 0.17], [0.42, 0.05, 0, -0.17], [0.05, 0.34, 0.21, 0], [0.05, 0.34, -0.21, 0]]) {
    const wall = new THREE.Mesh(rbox(w, 0.26, d, 0.02), bwall)
    wall.position.set(x, 0.15, z)
    basket.add(wall)
  }
  steer.add(basket)

  // ── frame: step-through downtube + seat tube + saddle ──
  const down = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 1.15, 8), frameMat)
  down.position.set(0, 0.62, 0.13)
  down.rotation.x = Math.PI / 2 - 0.42
  down.castShadow = true
  body.add(down)
  const chainstay = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6), frameMat)
  chainstay.position.set(0, 0.42, -0.48)
  chainstay.rotation.x = Math.PI / 2 - 1.05
  body.add(chainstay)
  const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.62, 8), frameMat)
  seatTube.position.set(0, 0.72, -0.42)
  seatTube.rotation.x = -0.2
  body.add(seatTube)
  const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), darkMat)
  seatPost.position.set(0, 1.12, -0.5)
  seatPost.rotation.x = -0.2
  body.add(seatPost)
  const saddle = new THREE.Mesh(rbox(0.24, 0.09, 0.42, 0.04), mat('#2b313a', { roughness: 0.8 }))
  saddle.position.set(0, 1.3, -0.52)
  saddle.castShadow = true
  body.add(saddle)
  // pedals + crank (visual only)
  const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10).rotateZ(Math.PI / 2), darkMat)
  crank.position.set(0, 0.42, -0.12)
  body.add(crank)
  for (const s of [-1, 1]) {
    const pedal = new THREE.Mesh(rbox(0.16, 0.04, 0.1, 0.02), darkMat)
    pedal.position.set(s * 0.14, 0.42 + s * 0.1, -0.12 + s * 0.08)
    body.add(pedal)
  }

  // head + tail light (glow at night, same contract as the kart lights)
  const hlMat = mat('#fff6e0'); markEmissive(hlMat, '#fff2cf', 1.0, 0.25)
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), hlMat)
  hl.position.set(0, 0.96, 0.56)
  steer.add(hl)
  const tlMat = mat('#5a1414'); markEmissive(tlMat, '#ff4040', 1.0, 0.3)
  const tl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tlMat)
  tl.position.set(0, 0.9, -1.05)
  body.add(tl)

  // rider sits on the saddle, hands reaching the bars
  const driverMount = new THREE.Group()
  driverMount.position.set(0, 1.06, -0.62)
  body.add(driverMount)

  root.userData = { wheels, steer, driverMount, body, wheelR: WHEEL_R }
  return root
}
