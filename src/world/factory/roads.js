import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { palette } from '../palette.js'

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)

// Grid road network with raised sidewalks, dashed lane lines and stop bars.
export function makeRoads({ lines, half, roadW = 4.4, y = 0.06 }) {
  const len = half * 2
  const swW = 1.7, swOff = roadW / 2 + swW / 2, swH = 0.16
  const asph = [], side = [], dash = []

  for (const c of lines) {
    asph.push(box(roadW, 0.12, len).translate(c, y, 0))
    asph.push(box(len, 0.12, roadW).translate(0, y, c))
    side.push(box(swW, swH, len).translate(c - swOff, swH / 2, 0))
    side.push(box(swW, swH, len).translate(c + swOff, swH / 2, 0))
    side.push(box(len, swH, swW).translate(0, swH / 2, c - swOff))
    side.push(box(len, swH, swW).translate(0, swH / 2, c + swOff))
    for (let t = -half + 1; t < half; t += 2.3) {
      dash.push(box(0.16, 0.02, 1.1).translate(c, y + 0.07, t))
      dash.push(box(1.1, 0.02, 0.16).translate(t, y + 0.07, c))
    }
  }

  // stop bars on the four approaches to the central scramble
  const sb = 5.2
  dash.push(box(roadW * 0.92, 0.02, 0.45).translate(0, y + 0.07, -sb))
  dash.push(box(roadW * 0.92, 0.02, 0.45).translate(0, y + 0.07, sb))
  dash.push(box(0.45, 0.02, roadW * 0.92).translate(-sb, y + 0.07, 0))
  dash.push(box(0.45, 0.02, roadW * 0.92).translate(sb, y + 0.07, 0))

  const group = new THREE.Group()
  const road = new THREE.Mesh(mergeGeometries(asph, false), new THREE.MeshStandardMaterial({ color: palette.road, flatShading: true, roughness: 0.96 }))
  road.receiveShadow = true
  const walks = new THREE.Mesh(mergeGeometries(side, false), new THREE.MeshStandardMaterial({ color: palette.sidewalk, flatShading: true, roughness: 0.92 }))
  walks.receiveShadow = true
  const marks = new THREE.Mesh(mergeGeometries(dash, false), new THREE.MeshStandardMaterial({ color: palette.roadLine, roughness: 0.85 }))
  group.add(road, walks, marks)
  return group
}
