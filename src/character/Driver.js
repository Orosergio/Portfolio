import * as THREE from 'three'
import { characters } from './characterRegistry.js'

const m = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.72, metalness: 0 })

// Build one seated low-poly driver (faces +z, the cart's forward).
export function makeDriver(ch) {
  const g = new THREE.Group()

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.42), m(ch.shirt))
  torso.position.set(0, 0.46, -0.04); torso.rotation.x = -0.14; torso.castShadow = true; g.add(torso)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), m(ch.skin))
  head.position.set(0, 0.95, 0.03); head.castShadow = true; g.add(head)

  if (ch.hairLong) {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.44), m(ch.hair))
    hair.position.set(0, 1.0, -0.07); g.add(hair)
    const pony = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.2), m(ch.hair))
    pony.position.set(0, 0.68, -0.3); g.add(pony)
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.285, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m(ch.hair))
    cap.position.set(0, 0.99, 0.01); g.add(cap)
  }

  for (const sx of [-0.34, 0.34]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.52), m(ch.shirt))
    arm.position.set(sx, 0.55, 0.3); arm.rotation.x = 0.5; g.add(arm)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m(ch.skin))
    hand.position.set(sx, 0.63, 0.62); g.add(hand)
  }
  for (const sx of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.62), m(ch.pants))
    leg.position.set(sx, 0.12, 0.3); g.add(leg)
  }

  return g
}

// Manages the active driver mounted on the cart and toggling between them.
export class DriverSwitcher {
  constructor(mount, startIndex = 0) {
    this.mount = mount
    this.index = startIndex
    this.current = null
    this._mountCurrent()
  }
  _mountCurrent() {
    if (this.current) {
      this.mount.remove(this.current)
      this.current.traverse((o) => {
        if (o.isMesh) { o.geometry.dispose(); o.material.dispose() }
      })
    }
    this.current = makeDriver(characters[this.index])
    this.mount.add(this.current)
  }
  toggle() {
    this.index = (this.index + 1) % characters.length
    this._mountCurrent()
    return characters[this.index]
  }
  get label() { return characters[this.index].label }
}
