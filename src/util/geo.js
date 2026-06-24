import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

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
