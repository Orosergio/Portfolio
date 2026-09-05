import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// Opt-in detail: one scene render + restrained HDR bloom. No second geometry
// render for GTAO, no multisampled float buffer, no separate color-grade pass.
export class Post {
  constructor({ renderer, scene, camera }) {
    this.renderer = renderer
    const size = renderer.getSize(new THREE.Vector2())
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 0 })
    this.composer = new EffectComposer(renderer, target)
    this.composer.addPass(new RenderPass(scene, camera))
    this.bloom = new UnrealBloomPass(size, 0.2, 0.45, 0.8)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.setSize(size.x, size.y)
    this.setNight(0)
  }
  setNight(t) {
    if (this.nightT === t) return
    this.nightT = t
    this.bloom.strength = 0.12 + t * 0.4
    this.bloom.threshold = 0.8 - t * 0.35
  }
  setSize(w, h) {
    this.composer.setPixelRatio(Math.min(this.renderer.getPixelRatio(), 1.25))
    this.composer.setSize(w, h)
  }
  render() { this.composer.render() }
  dispose() {
    for (const pass of this.composer.passes) pass.dispose?.()
    this.composer.dispose()
  }
}
