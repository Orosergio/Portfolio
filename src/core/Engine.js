import * as THREE from 'three'
import { palette } from '../world/palette.js'

// Owns the renderer + scene + clock, color pipeline, resize, and quality tier.
export class Engine {
  constructor(mount) {
    this.mount = mount
    const coarse = window.matchMedia('(pointer:coarse)').matches
    const lowMem = (navigator.deviceMemory || 8) <= 3
    this.tier = coarse || lowMem ? 'low' : 'high'
    this.shadowSize = this.tier === 'low' ? 512 : 1024

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.tier !== 'low',
      alpha: false, // opaque — the 3D sky dome owns the background now
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(palette.day.skyBottom, 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier === 'low' ? 1.5 : 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
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

  _onResize() {
    // coalesce bursts (mobile URL-bar, orientation) into one rAF
    if (this._resizeQueued) return
    this._resizeQueued = true
    requestAnimationFrame(() => {
      this._resizeQueued = false
      const w = window.innerWidth, h = window.innerHeight
      // re-apply DPR — it changes on zoom or moving between monitors
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier === 'low' ? 1.5 : 2))
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
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
    } catch (e) { return false }
  }
}
