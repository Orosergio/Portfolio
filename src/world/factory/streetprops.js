import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { paint, markEmissive, linColor, rbox } from '../../util/geo.js'
import { rand, TAU, pick } from '../../util/math.js'

// mergeGeometries needs consistent index presence; some primitives (polyhedra)
// are non-indexed. Normalize everything to non-indexed before merging.
const merge = (geos) => mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)), false)

function place(mesh, positions, scale = 1) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(scale, scale, scale)
  positions.forEach((pos, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pos[2] != null ? pos[2] : rand(0, TAU))
    p.set(pos[0], 0, pos[1]); m.compose(p, q, s); mesh.setMatrixAt(i, m)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
}

// Vending machines (Taiwan/Japan staple) — colored body + glowing front panel.
export function makeVending(positions) {
  const g = new THREE.Group(); if (!positions.length) return g
  const bodies = new THREE.InstancedMesh(rbox(1.0, 1.9, 0.7, 0.08).translate(0, 0.95, 0),
    new THREE.MeshStandardMaterial({ roughness: 0.6 }), positions.length)
  bodies.castShadow = true
  const pm = new THREE.MeshStandardMaterial({ color: '#0e1c28', roughness: 0.3 })
  markEmissive(pm, '#bfeaff', 1.0, 0.22)
  const panels = new THREE.InstancedMesh(rbox(0.74, 1.34, 0.06, 0.04).translate(0, 1.04, 0.36), pm, positions.length)
  place(bodies, positions); place(panels, positions)
  positions.forEach((_, i) => bodies.setColorAt(i, linColor(pick(palette.vending))))
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
  g.add(bodies, panels)
  return g
}

// Planters with a bush.
export function makePlanters(positions) {
  if (!positions.length) return new THREE.Group()
  const box = paint(new THREE.BoxGeometry(0.85, 0.5, 0.85).translate(0, 0.25, 0), palette.planter)
  const bush = paint(new THREE.IcosahedronGeometry(0.46, 0).translate(0, 0.72, 0), palette.bushFoliage)
  const mesh = new THREE.InstancedMesh(merge([box, bush]),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }), positions.length)
  mesh.castShadow = true; place(mesh, positions)
  return mesh
}

// Traffic cones.
export function makeCones(positions) {
  if (!positions.length) return new THREE.Group()
  const cone = paint(new THREE.ConeGeometry(0.22, 0.6, 10).translate(0, 0.3, 0), palette.cone)
  const base = paint(new THREE.BoxGeometry(0.42, 0.06, 0.42).translate(0, 0.03, 0), '#2a2a2a')
  const band = paint(new THREE.CylinderGeometry(0.165, 0.185, 0.1, 10).translate(0, 0.34, 0), '#f4ede0')
  const mesh = new THREE.InstancedMesh(merge([cone, base, band]),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 }), positions.length)
  mesh.castShadow = true; place(mesh, positions)
  return mesh
}

// Trash bins.
export function makeBins(positions) {
  if (!positions.length) return new THREE.Group()
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.2, 0.72, 10).translate(0, 0.36, 0),
    new THREE.MeshStandardMaterial({ color: palette.metalDark, flatShading: false, roughness: 0.7, metalness: 0.2 }), positions.length)
  mesh.castShadow = true; place(mesh, positions)
  return mesh
}

// Parked bicycles (side-on, length along X).
export function makeBikes(positions) {
  if (!positions.length) return new THREE.Group()
  const tire = '#1b1b1f'
  const frameC = pick(palette.bike)
  const parts = [
    paint(new THREE.TorusGeometry(0.3, 0.05, 6, 14).translate(-0.45, 0.3, 0), tire),
    paint(new THREE.TorusGeometry(0.3, 0.05, 6, 14).translate(0.45, 0.3, 0), tire),
    paint(new THREE.BoxGeometry(0.95, 0.06, 0.06).translate(0, 0.46, 0), frameC),
    paint(new THREE.BoxGeometry(0.06, 0.34, 0.06).translate(-0.3, 0.45, 0), frameC),
    paint(new THREE.BoxGeometry(0.06, 0.42, 0.06).translate(0.4, 0.5, 0), frameC),
    paint(new THREE.BoxGeometry(0.26, 0.07, 0.07).translate(-0.3, 0.64, 0), '#2a2a2a'),
    paint(new THREE.BoxGeometry(0.07, 0.07, 0.34).translate(0.4, 0.7, 0), '#2a2a2a'),
  ]
  const mesh = new THREE.InstancedMesh(merge(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }), positions.length)
  mesh.castShadow = true; place(mesh, positions)
  return mesh
}
