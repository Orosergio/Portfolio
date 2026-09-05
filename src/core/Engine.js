import * as THREE from 'three'
import { palette } from '../world/palette.js'
import { QUALITY, pixelRatio } from './Quality.js'

// Owns the renderer + scene + clock, color pipeline, resize, and quality tier.
export class Engine {
  constructor(mount) {
    this.mount = mount
    const coarse = window.matchMedia('(pointer:coarse)').matches
    const lowMem = (navigator.deviceMemory || 8) <= 3
    this.tier = coarse || lowMem ? 'low' : 'balanced'
    this.profile = QUALITY[this.tier]
    this.shadowSize = this.tier === 'low' ? 512 : 1024

    this.renderer = new THREE.WebGLRenderer({
      // high tier presents through EffectComposer (canvas MSAA would resolve
      // nothing visible); low tier renders direct, so IT gets hardware MSAA.
      antialias: true,
      alpha: false, // opaque — the 3D sky dome owns the background now
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(palette.day.skyBottom, 1)
    // mutable DPR ceiling — autoQuality can lower it and resizes respect it
    this.dprCap = this.profile.dpr
    this.renderer.setPixelRatio(pixelRatio(window.innerWidth, window.innerHeight, window.devicePixelRatio, this.profile))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12
    this.renderer.shadowMap.enabled = this.profile.shadows
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.shadowMap.needsUpdate = true
    // PCFSoft's wide kernel is wasted on the low tier's 512px map — plain PCF
    // is near-identical there and much cheaper on mobile GPUs.
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.info.autoReset = false // diagnostics count the WHOLE frame
    mount.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(palette.day.fog, palette.day.fogD)
    this.clock = new THREE.Clock()
    this.cameraRef = null
    this.onResize = null // main wires post-composer resize here

    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
  }

  setCamera(cam) { this.cameraRef = cam }

  setQuality(level) {
    this.tier = level
    this.profile = QUALITY[level]
    this.dprCap = this.profile.dpr
    this.renderer.shadowMap.enabled = this.profile.shadows
    this.renderer.shadowMap.needsUpdate = true
    this._onResize()
  }

  // Lower the DPR ceiling at runtime (adaptive quality) — sticks across resizes.
  setDprCap(cap) { this.dprCap = cap; this._onResize() }

  _onResize() {
    // coalesce bursts (mobile URL-bar, orientation) into one rAF
    if (this._resizeQueued) return
    this._resizeQueued = true
    requestAnimationFrame(() => {
      this._resizeQueued = false
      const w = window.innerWidth, h = window.innerHeight
      // re-apply DPR — it changes on zoom or moving between monitors
      this.renderer.setPixelRatio(pixelRatio(w, h, window.devicePixelRatio, { ...this.profile, dpr: this.dprCap }))
      this.renderer.setSize(w, h)
      if (this.cameraRef) {
        this.cameraRef.aspect = w / h
        this.cameraRef.updateProjectionMatrix()
      }
      this.onResize?.(w, h)
    })
  }

  render(camera) { this.renderer.render(this.scene, camera) }

  // Cheap WebGL availability probe.
  static isWebGLAvailable() {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      return !!gl
    } catch (e) { return false }
  }
}
