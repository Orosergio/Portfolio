import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'
import { paint } from '../../util/geo.js'
import { rand, TAU } from '../../util/math.js'

// One InstancedMesh of conifer trees (trunk + stacked cones), vertex-colored,
// so the whole forest is a single draw call. Per-instance tint varies the green.
export function makeTrees(positions) {
  // Three green variants, round-robined into 3 instanced meshes => 3 draw calls
  // for the whole forest, with real foliage-color variation and brown trunks.
  const group = new THREE.Group()
  const buckets = palette.treeFoliage.slice(0, 3).map(() => [])
  positions.forEach((p, i) => buckets[i % buckets.length].push(p))

  buckets.forEach((bucket, bi) => {
    if (!bucket.length) return
    const trunk = paint(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 6).translate(0, 0.45, 0), palette.treeTrunk)
    const c1 = paint(new THREE.ConeGeometry(1.05, 2.0, 7).translate(0, 1.7, 0), palette.treeFoliage[bi])
    const c2 = paint(new THREE.ConeGeometry(0.78, 1.5, 7).translate(0, 2.7, 0), palette.treeFoliage[bi])
    const c3 = paint(new THREE.ConeGeometry(0.5, 1.1, 7).translate(0, 3.5, 0), palette.treeFoliage[bi])
    const tpl = mergeGeometries([trunk, c1, c2, c3], false)
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 })
    const mesh = new THREE.InstancedMesh(tpl, mat, bucket.length)
    mesh.castShadow = true
    mesh.frustumCulled = false // instances span the whole diorama; template sphere would mis-cull
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3()
    bucket.forEach((pos, i) => {
      const sc = rand(0.78, 1.25)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(0, TAU))
      p.set(pos[0], 0, pos[1]); s.set(sc, rand(0.9, 1.35) * sc, sc)
      m.compose(p, q, s); mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    group.add(mesh)
  })
  return group
}

// Low rounded bushes (instanced icospheres), single draw call.
export function makeBushes(positions) {
  if (!positions.length) return new THREE.Group()
  const geo = new THREE.IcosahedronGeometry(0.55, 0)
  const mat = new THREE.MeshStandardMaterial({ color: palette.bushFoliage, flatShading: true, roughness: 0.9 })
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length)
  mesh.castShadow = true
  mesh.frustumCulled = false
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3()
  positions.forEach((pos, i) => {
    const sc = rand(0.7, 1.3)
    p.set(pos[0], 0.35, pos[1]); s.set(sc, sc * rand(0.7, 1), sc)
    m.compose(p, q, s); mesh.setMatrixAt(i, m)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
