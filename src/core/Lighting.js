import * as THREE from 'three'
import { palette } from '../world/palette.js'

// Warm low-poly lighting: hemisphere fill (the secret to the cozy warmth) +
// one shadow-casting key light + a hint of ambient. Shadow frustum is wrapped
// tight to the diorama so the single soft shadow stays crisp.
export function addLighting(scene, { shadowSize = 1024, half = 30 } = {}) {
  const hemi = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, 0.85)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(palette.sun, 1.12)
  sun.position.set(26, 38, 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(shadowSize, shadowSize)
  const s = half + 8
  const c = sun.shadow.camera
  c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 170
  c.updateProjectionMatrix()
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.7
  scene.add(sun)
  scene.add(sun.target) // target defaults to (0,0,0) — the diorama center

  const amb = new THREE.AmbientLight('#ffe6c8', 0.3)
  scene.add(amb)

  return { hemi, sun, amb }
}
