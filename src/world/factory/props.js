import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { paint } from '../../util/geo.js'
import { rand, TAU } from '../../util/math.js'

// Central roundabout fountain (single group, animated water in update()).
export function makeFountain() {
  const g = new THREE.Group()
  const stone = new THREE.MeshStandardMaterial({ color: palette.fountainBase, flatShading: true, roughness: 0.85 })
  const rimMat = new THREE.MeshStandardMaterial({ color: palette.fountainRim, flatShading: true, roughness: 0.7 })
  const waterMat = new THREE.MeshStandardMaterial({ color: palette.water, flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 })

  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.7, 24), stone)
  base.position.y = 0.35; base.receiveShadow = true; g.add(base)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.35, 8, 24), rimMat)
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.7; g.add(rim)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, 0.3, 24), waterMat)
  water.position.y = 0.62; g.add(water)
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.4, 12), stone)
  pillar.position.y = 1.3; g.add(pillar)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.5, 0.35, 16), rimMat)
  bowl.position.y = 2.0; g.add(bowl)
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 10), waterMat)
  spout.position.y = 2.7; g.add(spout)
  g.userData.spout = spout
  g.userData.water = water
  return g
}

// Street lamps — dark structural post (instanced, shadows) + a separate
// instanced glowing head that lights up at night.
export function makeLamps(positions) {
  const group = new THREE.Group()
  if (!positions.length) return group
  const n = positions.length

  const pole = paint(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6).translate(0, 1.3, 0), palette.lampPost)
  const arm = paint(new THREE.BoxGeometry(0.6, 0.12, 0.12).translate(0.3, 2.55, 0), palette.lampPost)
  const tpl = mergeGeometries([pole, arm], false)
  const postMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 })
  const posts = new THREE.InstancedMesh(tpl, postMat, n)
  posts.castShadow = true; posts.frustumCulled = false

  const headMat = new THREE.MeshStandardMaterial({ color: palette.lampGlow, flatShading: true })
  headMat.emissive = new THREE.Color(palette.lampGlow); headMat.emissiveIntensity = 0
  headMat.userData.nightE = 1.0; headMat.userData.dayE = 0.1
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6).translate(0.6, 2.5, 0), headMat, n)
  heads.frustumCulled = false

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1)
  positions.forEach((pos, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(0, TAU))
    p.set(pos[0], 0, pos[1])
    m.compose(p, q, s); posts.setMatrixAt(i, m); heads.setMatrixAt(i, m)
  })
  posts.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true
  group.add(posts, heads)
  return group
}

// Low hedge/fence posts around park edges — instanced.
export function makeHedges(positions) {
  if (!positions.length) return new THREE.Group()
  const geo = new THREE.BoxGeometry(1, 0.5, 0.4)
  const mat = new THREE.MeshStandardMaterial({ color: palette.bushFoliage, flatShading: true, roughness: 0.9 })
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length)
  mesh.castShadow = true
  mesh.frustumCulled = false
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1)
  positions.forEach((pos, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pos[2] || 0)
    p.set(pos[0], 0.25, pos[1])
    m.compose(p, q, s); mesh.setMatrixAt(i, m)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
