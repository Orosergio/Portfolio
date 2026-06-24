import * as THREE from 'three'
import { palette } from '../palette.js'

const C = (h) => new THREE.Color(h)

// ── Soft gradient sky dome (replaces the flat CSS gradient) ─────────────
// Big inward sphere with a vertical gradient that lerps day↔night inside the
// shader via a single uNight uniform (robust), plus a cross-faded sun/moon
// disc and gentle stars. fog:false keeps it crisp behind the foggy diorama.
// Kept minimal + warm to match the clean floating-slab moodboard.
export function makeSky({ radius = 150 } = {}) {
  const group = new THREE.Group()
  const d = palette.day, n = palette.night

  const uniforms = {
    uTopDay: { value: C(d.skyTop) }, uTopNight: { value: C(n.skyTop) },
    uHorDay: { value: C(d.skyBottom) }, uHorNight: { value: C(n.skyBottom) },
    uNight: { value: 0 },
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform vec3 uTopDay, uTopNight, uHorDay, uHorNight;
        uniform float uNight;
        void main(){
          vec3 top = mix(uTopDay, uTopNight, uNight);
          vec3 hor = mix(uHorDay, uHorNight, uNight);
          float y = vDir.y;
          vec3 col = mix(hor, top, smoothstep(-0.02, 0.62, y));
          col = mix(col, hor * 0.8, smoothstep(0.0, -0.45, y));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  )
  dome.renderOrder = -10
  group.add(dome)

  // sun (day) + moon (night) cross-faded discs, high up-left, behind the scene
  const sun = makeDisc('#fff3d4', '#ffd089')
  const moon = makeDisc('#f3f0ff', '#b9c2ee')
  const dir = new THREE.Vector3(-0.55, 0.62, -0.56).normalize().multiplyScalar(radius * 0.8)
  sun.position.copy(dir); moon.position.copy(dir)
  sun.scale.setScalar(16); moon.scale.setScalar(13)
  sun.material.opacity = 1; moon.material.opacity = 0
  group.add(sun, moon)

  const stars = makeStars(radius * 0.95)
  group.add(stars)

  // layer 1 → the main camera sees it, but the GTAO (layer-0) camera does not,
  // so the far sky never receives contact-AO (which darkened the screen corners)
  group.traverse((o) => o.layers.set(1))

  return {
    group,
    setNight(t) {
      uniforms.uNight.value = t
      sun.material.opacity = 1 - t
      moon.material.opacity = t
      stars.material.opacity = Math.max(0, t - 0.15) * 1.1
    },
    animate(time) { stars.rotation.y = time * 0.004 },
  }
}

function makeDisc(core, halo) {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const x = c.getContext('2d')
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64)
  g.addColorStop(0, core); g.addColorStop(0.32, halo)
  g.addColorStop(0.46, 'rgba(255,220,170,0.2)'); g.addColorStop(1, 'rgba(255,220,170,0)')
  x.fillStyle = g; x.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, fog: false,
  }))
  spr.renderOrder = -9
  return spr
}

function makeStars(r) {
  const N = 420
  const pos = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const u = Math.random(), v = Math.random() * 0.5 + 0.45
    const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 + 6
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color: '#fff6e8', size: 1.1, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.renderOrder = -8
  return pts
}
