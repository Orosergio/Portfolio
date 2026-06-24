import * as THREE from 'three'
import { palette } from './palette.js'

// The floating diorama base: warm-orange top, cream beveled sides, plus a soft
// radial under-shadow so it reads as a little model sitting on a desk.
export function makeGround({ half = 30, baseH = 2.4 } = {}) {
  const group = new THREE.Group()
  const W = half * 2 + 6

  // base block — top orange, sides cream, bottom shadowed
  const topMat = new THREE.MeshStandardMaterial({ color: palette.ground, flatShading: true, roughness: 0.95, metalness: 0 })
  const sideMat = new THREE.MeshStandardMaterial({ color: palette.groundEdge, flatShading: true, roughness: 0.9 })
  const underMat = new THREE.MeshStandardMaterial({ color: palette.groundUnder, flatShading: true })
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(W, baseH, W),
    [sideMat, sideMat, topMat, underMat, sideMat, sideMat]
  )
  base.position.y = -baseH / 2
  base.receiveShadow = true
  group.add(base)

  // a subtle inner orange inset so the very top reads crisp under shadows
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.6, 0.12, W - 0.6),
    topMat
  )
  top.position.y = 0.0
  top.receiveShadow = true
  group.add(top)

  // soft under-shadow blob (radial gradient on a plane beneath the base)
  group.add(makeUnderShadow(W * 1.18, -baseH - 0.05))

  return group
}

function makeUnderShadow(size, y) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d')
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 128)
  g.addColorStop(0, 'rgba(60,30,10,0.5)')
  g.addColorStop(0.55, 'rgba(60,30,10,0.28)')
  g.addColorStop(1, 'rgba(60,30,10,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  mesh.renderOrder = -1
  return mesh
}

// A flat grass plot (parks / project plinths sit on the orange ground).
export function makeGrassPatch(x, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.16, d),
    new THREE.MeshStandardMaterial({ color: palette.park, flatShading: true, roughness: 0.95 })
  )
  mesh.position.set(x, 0.08, z)
  mesh.receiveShadow = true
  return mesh
}
