import * as THREE from 'three'
import { palette } from '../world/palette.js'
import { rbox, markEmissive } from '../util/geo.js'

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.5, metalness: 0, ...o })

// A refined little open kart in Gulf livery (powder blue + orange), with
// rounded body, mirrors, lights and finer wheels. Faces +z.
export function makeCart() {
  const cart = new THREE.Group()
  const body = new THREE.Group()
  cart.add(body)

  const floor = new THREE.Mesh(rbox(2.0, 0.3, 3.2, 0.12), mat(palette.cartDark, { roughness: 0.7 }))
  floor.position.y = 0.42; body.add(floor)

  const tub = new THREE.Mesh(rbox(1.9, 0.6, 3.0, 0.22), mat(palette.cartBody))
  tub.position.y = 0.7; tub.castShadow = true; body.add(tub)

  // hollow the cockpit with a darker inset
  const cockpit = new THREE.Mesh(rbox(1.3, 0.4, 1.5, 0.14), mat('#21262e', { roughness: 0.75 }))
  cockpit.position.set(0, 0.95, -0.1); body.add(cockpit)

  const nose = new THREE.Mesh(rbox(1.85, 0.55, 0.95, 0.2), mat(palette.cartAccent))
  nose.position.set(0, 0.7, 1.65); nose.castShadow = true; body.add(nose)

  const stripe = new THREE.Mesh(rbox(0.5, 0.08, 3.9, 0.04), mat(palette.cartStripe, { roughness: 0.6 }))
  stripe.position.set(0, 1.02, 0.2); body.add(stripe)

  // seat
  const seat = new THREE.Mesh(rbox(1.1, 0.5, 0.3, 0.1), mat('#2b313a', { roughness: 0.85 }))
  seat.position.set(0, 1.05, -1.0); body.add(seat)

  // roll hoop
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 8, 16, Math.PI), mat(palette.cartStripe, { metalness: 0.3, roughness: 0.4 }))
  hoop.position.set(0, 1.25, -1.0); hoop.rotation.x = Math.PI; body.add(hoop)

  // steering wheel
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 16), mat('#15181d'))
  sw.position.set(0, 1.08, 0.5); sw.rotation.x = 1.15; body.add(sw)

  // side mirrors
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), mat('#2b313a'))
    arm.position.set(sx * 1.0, 1.05, 0.55); arm.rotation.z = sx * 0.7; body.add(arm)
    const mir = new THREE.Mesh(rbox(0.18, 0.16, 0.06, 0.03), mat(palette.cartGlass, { metalness: 0.4, roughness: 0.25 }))
    mir.position.set(sx * 1.18, 1.12, 0.55); body.add(mir)
  }

  // head + tail lights (glow at night)
  const hlMat = mat('#fff6e0'); markEmissive(hlMat, '#fff2cf', 1.0, 0.25)
  const tlMat = mat('#5a1414'); markEmissive(tlMat, '#ff4040', 1.0, 0.3)
  for (const sx of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), hlMat)
    hl.rotation.x = Math.PI / 2; hl.position.set(sx, 0.72, 2.14); body.add(hl)
    const tl = new THREE.Mesh(rbox(0.22, 0.12, 0.06, 0.03), tlMat)
    tl.position.set(sx, 0.82, -1.52); body.add(tl)
  }

  // exhaust
  const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), mat(palette.metal, { metalness: 0.5, roughness: 0.4 }))
  exh.rotation.x = Math.PI / 2; exh.position.set(0.5, 0.5, -1.6); body.add(exh)

  // ── wheels: tire + silver hub + cap (axle along X) ──
  const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.32, 16).rotateZ(Math.PI / 2)
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 10).rotateZ(Math.PI / 2)
  const capGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.36, 8).rotateZ(Math.PI / 2)
  const tireMat = mat(palette.wheel, { roughness: 0.85 })
  const hubMat = mat(palette.wheelHub, { metalness: 0.4, roughness: 0.35 })
  const capMat = mat('#2b313a')
  const mkWheel = () => {
    const g = new THREE.Group()
    const t = new THREE.Mesh(tireGeo, tireMat); t.castShadow = true; g.add(t)
    g.add(new THREE.Mesh(hubGeo, hubMat))
    g.add(new THREE.Mesh(capGeo, capMat))
    return g
  }

  const wheels = []
  const steer = new THREE.Group()
  steer.position.set(0, 0.44, 1.12)
  cart.add(steer)
  for (const sx of [-1.0, 1.0]) { const w = mkWheel(); w.position.set(sx, 0, 0); steer.add(w); wheels.push(w) }
  for (const sx of [-1.0, 1.0]) { const w = mkWheel(); w.position.set(sx, 0.44, -1.15); cart.add(w); wheels.push(w) }

  const driverMount = new THREE.Group()
  driverMount.position.set(0, 0.72, -0.35)
  cart.add(driverMount)

  cart.userData = { wheels, steer, driverMount, body }
  return cart
}
