import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { lerp, clamp } from '../util/math.js'

// ── The single biggest "premium" lever ─────────────────────────────────
// EffectComposer pipeline: scene → ground-contact AO (GTAO) → neon bloom →
// cinematic grade + vignette → tone-map/sRGB out. Bloom + vignette ramp up
// at night so lanterns / signs / the Tokyo-Tower beacon glow. AO is high-tier
// only (it's the heavy pass); low/mobile still gets bloom + grade.
//
// Grade runs in linear/HDR space (before OutputPass tone-maps), so emissive
// values >1 still feed bloom and the warm split-tone reads on the highlights.
const GradeVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1.12 },
    uContrast: { value: 1.06 },
    uVignette: { value: 0.24 },
    uLift: { value: new THREE.Color(0.018, 0.009, 0.0) }, // warm shadow lift
    uCool: { value: new THREE.Color(0.0, 0.004, 0.012) }, // cool highlight split
    uNight: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uSat, uContrast, uVignette, uNight;
    uniform vec3 uLift, uCool;
    varying vec2 vUv;
    void main(){
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // saturation
      c = mix(vec3(l), c, uSat);
      // soft contrast around a linear mid
      c = (c - 0.18) * uContrast + 0.18;
      // split-tone: warm into shadows, faint cool into highlights
      c += uLift * (1.0 - smoothstep(0.0, 0.55, l));
      c += uCool * smoothstep(0.4, 1.2, l);
      // vignette (stronger at night)
      float dist = length(vUv - 0.5);
      float vig = 1.0 - uVignette * pow(smoothstep(0.32, 0.86, dist), 1.4);
      c *= vig;
      gl_FragColor = vec4(max(c, 0.0), tex.a);
    }
  `,
}

export class Post {
  constructor({ renderer, scene, camera, tier = 'high' }) {
    this.renderer = renderer
    this.tier = tier
    // Work in CSS pixels and let EffectComposer apply the pixel ratio — feeding
    // device pixels here would double-apply DPR (passes run at 4× the pixels).
    const dpr = renderer.getPixelRatio()
    const size = renderer.getSize(new THREE.Vector2())
    const w = size.x, h = size.y

    // HalfFloat target so emissive/bloom keep HDR headroom (no early clip).
    const rt = new THREE.WebGLRenderTarget(Math.round(w * dpr), Math.round(h * dpr), {
      type: THREE.HalfFloatType,
      samples: tier === 'low' ? 0 : 2,
    })
    this.composer = new EffectComposer(renderer, rt)
    this.composer.setPixelRatio(dpr)
    this.composer.addPass(new RenderPass(scene, camera))

    // The sky dome lives on layer 1; a layer-0-only clone drives GTAO so the
    // (far, geometric) sky never gets contact-AO — which otherwise darkens the
    // screen corners. RenderPass still uses the full main camera.
    this.mainCamera = camera
    this.aoCamera = camera.clone()
    this.aoCamera.layers.disableAll()
    this.aoCamera.layers.enable(0)

    // ── Ground-contact AO — instant depth/rootedness (high tier only) ──
    if (tier === 'high') {
      const ao = new GTAOPass(scene, this.aoCamera, w, h)
      ao.output = GTAOPass.OUTPUT.Default
      ao.blendIntensity = 0.85
      ao.updateGtaoMaterial({
        radius: 0.85, distanceExponent: 1.0, thickness: 1.2,
        scale: 1.0, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false,
      })
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 })
      this.composer.addPass(ao)
      this.ao = ao
    }

    // ── Neon bloom (ramps at night) ──
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.62, 0.55)
    this.composer.addPass(bloom)
    this.bloom = bloom

    // ── Cinematic grade + vignette ──
    const grade = new ShaderPass(GradeVignetteShader)
    this.composer.addPass(grade)
    this.grade = grade

    // ── Tone-map + sRGB out (reads renderer.toneMapping/Exposure each frame) ──
    this.composer.addPass(new OutputPass())

    // size every pass + target consistently in CSS px (composer applies DPR)
    this.composer.setSize(w, h)

    // day/night tuning endpoints. NOTE: night threshold stays HIGH so only true
    // emissive (windows/lanterns/neon/tower) blooms — a low threshold makes the
    // bright orange ground bloom and washes the whole night sky orange.
    this._tune = {
      bloomStrength: [0.22, 0.82], bloomThreshold: [0.7, 0.62], bloomRadius: [0.5, 0.72],
      vignette: [0.22, 0.42], sat: [1.1, 1.16],
    }
    this.setNight(0)
  }

  // t: 0 day → 1 night
  setNight(t) {
    const T = this._tune
    if (this.bloom) {
      this.bloom.strength = lerp(T.bloomStrength[0], T.bloomStrength[1], t)
      this.bloom.threshold = lerp(T.bloomThreshold[0], T.bloomThreshold[1], t)
      this.bloom.radius = lerp(T.bloomRadius[0], T.bloomRadius[1], t)
    }
    const u = this.grade.uniforms
    u.uVignette.value = lerp(T.vignette[0], T.vignette[1], t)
    u.uSat.value = lerp(T.sat[0], T.sat[1], t)
    u.uNight.value = t
  }

  setSize(w, h) {
    // w,h are CSS px (from engine.onResize). Re-sync DPR (can change on monitor
    // move) then let the composer resize its targets and every pass.
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.setSize(w, h)
  }

  render() {
    if (this.ao) { // keep the AO camera in lock-step with the follow camera
      const c = this.mainCamera, a = this.aoCamera
      a.position.copy(c.position); a.quaternion.copy(c.quaternion)
      a.fov = c.fov; a.aspect = c.aspect; a.near = c.near; a.far = c.far
      a.updateProjectionMatrix(); a.updateMatrixWorld()
    }
    this.composer.render()
  }

  dispose() { this.composer.dispose?.() }
}
