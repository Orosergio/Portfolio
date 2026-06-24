import * as THREE from 'three'
import './styles.css'
import './ui/card.css'

import { Engine } from './core/Engine.js'
import { IsoCamera } from './core/Camera.js'
import { addLighting } from './core/Lighting.js'
import { DayNight } from './core/DayNight.js'
import { buildWorld } from './world/World.js'
import { makeCart } from './vehicle/Cart.js'
import { CartController } from './vehicle/CartController.js'
import { DriverSwitcher } from './character/Driver.js'
import { ProximitySystem } from './projects/ProximitySystem.js'
import { Hud } from './ui/Hud.js'
import { Minimap } from './ui/Minimap.js'
import { Loader } from './ui/Loader.js'
import { Intro } from './ui/Intro.js'
import { createKeyboard } from './input/Keyboard.js'
import { createTouchControls } from './input/TouchControls.js'

boot()

async function boot() {
  if (!Engine.isWebGLAvailable()) {
    document.getElementById('loader')?.remove()
    const nw = document.getElementById('nowebgl'); if (nw) nw.hidden = false
    return
  }

  const loader = new Loader()
  loader.set('Warming up', 0.04)
  await frame()

  const engine = new Engine(document.getElementById('app'))
  const camera = new IsoCamera(window.innerWidth / window.innerHeight)
  engine.setCamera(camera.cam)

  const world = buildWorld((label, p) => loader.set(label, p))
  engine.scene.add(world.group)
  const lights = addLighting(engine.scene, { shadowSize: engine.shadowSize, half: world.half })

  // cart + driver (scaled down so it never blocks the view)
  const cart = makeCart()
  cart.scale.setScalar(0.72)
  engine.scene.add(cart)
  const driver = new DriverSwitcher(cart.userData.driverMount, 0)
  const controller = new CartController(cart, {
    bounds: world.bounds, obstacles: world.obstacles, spawn: world.spawn,
  })
  camera.snapTo(cart.position)

  // UI overlay
  const overlay = document.getElementById('overlay')
  const seen = (() => { try { return localStorage.getItem('city.seen') === '1' } catch { return false } })()
  const intro = new Intro(overlay, { open: !seen })
  let dayNight
  const hud = new Hud(overlay, {
    onSwitchDriver: () => hud.setDriverLabel(driver.toggle().label),
    onHelp: () => intro.open(),
    onDayNight: () => { if (dayNight) dayNight.toggle() },
  })
  hud.setDriverLabel(driver.label)
  dayNight = new DayNight({
    scene: engine.scene, renderer: engine.renderer, lights,
    body: document.body, onLabel: (m) => hud.setDayNight(m),
  })
  hud.setDayNight('day')
  const minimap = new Minimap(overlay, world.minimap)
  const proximity = new ProximitySystem(world.projectBuildings)

  // input → shared state
  const input = { throttle: 0, steer: 0 }
  const doAction = () => { if (intro.visible) intro.close(); else hud.reveal() }
  createKeyboard(input, { onAction: doAction })
  if (window.matchMedia('(pointer:coarse)').matches) {
    createTouchControls(input, { onAction: doAction, container: overlay })
  }

  // render loop
  const ndc = new THREE.Vector3()
  let running = true
  let rafId = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(rafId) }
    else if (!running) { running = true; engine.clock.getDelta(); rafId = requestAnimationFrame(loop) }
  })

  function loop() {
    if (!running) return
    rafId = requestAnimationFrame(loop)
    const dt = Math.min(engine.clock.getDelta(), 0.05)
    const t = engine.clock.elapsedTime

    const drive = intro.visible ? { throttle: 0, steer: 0 } : input
    controller.update(dt, drive)
    camera.update(dt, cart.position, controller.heading, controller.speed)
    world.animate(t)
    dayNight.update(dt)

    const active = proximity.update(cart.position)
    hud.setActive(active ? active.project : null)
    if (active) {
      ndc.copy(active.anchor).project(camera.cam)
      const onScreen = ndc.z < 1 && Math.abs(ndc.x) < 1.25 && Math.abs(ndc.y) < 1.25
      const x = (ndc.x * 0.5 + 0.5) * window.innerWidth
      const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight
      hud.position(x, y, onScreen)
    }

    minimap.update({ x: cart.position.x, z: cart.position.z, heading: controller.heading })
    engine.render(camera.cam)
  }

  loop()
  await loader.hide()

  if (import.meta.env.DEV) {
    window.__city = { controller, proximity, hud, camera, driver, world, cart, input, dayNight, engine }
  }
}

function frame() { return new Promise((r) => requestAnimationFrame(() => r())) }
