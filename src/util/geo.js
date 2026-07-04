import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Soft-edged box — the single biggest "premium Lego vs Duplo" upgrade.
export function rbox(w, h, d, r = 0.13, seg = 2) {
  const rad = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(0.02, rad))
}

// Paint every vertex of a geometry one color (linear space, to match
// MeshStandardMaterial.color under ColorManagement). Enables merging
// multi-colored shapes into ONE geometry drawn with vertexColors:true.
export function paint(geo, hex) {
  const c = new THREE.Color(hex).convertSRGBToLinear()
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

// Color in linear space for InstancedMesh.setColorAt (kept consistent with paint()).
export const linColor = (hex) => new THREE.Color(hex).convertSRGBToLinear()

// Tag a material as day/night emissive. DayNight scans userData.nightE and sets
// emissiveIntensity per mode. dayE keeps a faint glow in daylight (0 = none).
export function markEmissive(material, color, nightE, dayE = 0) {
  material.emissive = new THREE.Color(color)
  material.emissiveIntensity = dayE
  material.userData.nightE = nightE
  material.userData.dayE = dayE
  return material
}

// ── Draw-call collapse for static assemblies ─────────────────────────────
// Merges every plain static Mesh in a group that shares a material into ONE
// mesh per material (baking local transforms). Skips anything that must stay
// live: textured maps, day/night emissives, instanced meshes, sprites, points.
// Call on a group built around the origin BEFORE positioning it in the world.
export function mergeStatic(root) {
  root.updateMatrixWorld(true)
  const buckets = new Map() // material -> geometries[]
  const keep = []
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  root.traverse((o) => {
    if (o === root) return
    const mergeable = o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) &&
      !o.material.map && o.material.userData.nightE == null && !o.material.transparent
    if (!mergeable) { if (o.isMesh || o.isSprite || o.isPoints || o.isInstancedMesh) keep.push(o); return }
    const geo = o.geometry.clone().toNonIndexed()
    geo.applyMatrix4(new THREE.Matrix4().copy(o.matrixWorld).premultiply(inv))
    if (!buckets.has(o.material)) buckets.set(o.material, [])
    buckets.get(o.material).push(geo)
  })
  const merged = new THREE.Group()
  for (const [material, geos] of buckets) {
    const geo = mergeGeometries(geos, false)
    if (!geo) continue
    const m = new THREE.Mesh(geo, material)
    m.castShadow = true
    m.receiveShadow = true
    merged.add(m)
  }
  // rebuild: merged statics + untouched live meshes (re-parented with baked transforms)
  const g = new THREE.Group()
  g.add(merged)
  for (const o of keep) {
    const m4 = new THREE.Matrix4().copy(o.matrixWorld).premultiply(inv)
    o.removeFromParent()
    m4.decompose(o.position, o.quaternion, o.scale)
    g.add(o)
  }
  g.userData = root.userData
  return g
}
