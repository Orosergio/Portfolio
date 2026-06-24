// ── The single source of truth for color ───────────────────────────────
// Warm, saturated, cozy. No greys. Tokyo / Taiwan night-market vibe.
// Object colors are theme-agnostic; the day/night blocks below drive the
// lighting, sky and how strongly emissive elements glow.

export const palette = {
  // ground / base
  ground:      '#eda04e',  // warm orange diorama top
  groundEdge:  '#f6e3c2',  // cream bevel
  groundUnder: '#c98a4e',
  park:        '#73c06a',  // lush grass
  parkDark:    '#4f9e55',
  plaza:       '#d9c49a',
  sand:        '#e9c999',

  // roads
  road:        '#54585f',
  roadLine:    '#f4e6c8',
  crosswalk:   '#f3ece0',
  sidewalk:    '#d8c9a8',
  curb:        '#bfae87',

  // fine detail / greebles
  glass:       '#2b4a63',   // building window glass (glows at night)
  metal:       '#b7bec7',   // AC units, tanks, railings
  metalDark:   '#6b7178',
  vending:     ['#e23b4e', '#2f9fb0', '#f0b03e', '#5fbf8a', '#5d8bff'],
  bike:        ['#e8557f', '#34b3c4', '#f2a93c'],
  signNeon:    ['#ff3d8b', '#25e0d0', '#ffb347', '#ff5252', '#b76bff'],
  cone:        '#f06a2a',
  planter:     '#8a5a3a',

  // shop / non-project buildings — vibrant, never grey
  shopColors:  ['#f2784b', '#34b3c4', '#f0b03e', '#e8557f', '#5a8fe0', '#8e6fd0', '#5fbf8a', '#ef6f6f'],
  roofWarm:    '#c9603a',
  roofTeal:    '#2f8a99',
  doorway:     '#3a2a44',
  window:      '#fdfae8',

  // project landmark accents (kept distinct + saturated)
  // (the actual per-project accent lives in projects.data.js)

  // cart — Gulf racing livery (powder blue + orange)
  cartBody:    '#7cc0e6',
  cartAccent:  '#f26b2a',
  cartStripe:  '#f7f2e8',
  cartDark:    '#2b313a',
  cartGlass:   '#cfeaf6',
  wheel:       '#1d2228',
  wheelHub:    '#d3d7de',

  // trees
  treeFoliage: ['#4e9a5a', '#3f8a4c', '#62b562'],
  treeTrunk:   '#7a5230',
  bushFoliage: '#57ad60',

  // Tokyo / night-market landmarks
  towerRed:    '#e8472f',  // Tokyo Tower international orange
  towerWhite:  '#f4ede0',
  towerLight:  '#ffd27a',  // tower night lights
  torii:       '#d6402b',
  stallColors: ['#e8557f', '#f0b03e', '#34b3c4', '#f2784b', '#8e6fd0', '#5fbf8a'],
  awning:      ['#e23b4e', '#f2a93c', '#2f9fb0', '#e8557f'],
  lantern:     '#ff5a4d',  // red paper lantern
  lanternWarm: '#ffb347',
  lampPost:    '#33373f',
  lampGlow:    '#ffd98a',

  // neon (night accents)
  neon:        ['#ff3d8b', '#25e0d0', '#ffb347', '#ff5252', '#5d8bff', '#b76bff'],

  marker:      '#f26b2a',

  // ── Day theme ──
  day: {
    skyTop: '#ffe3bd', skyBottom: '#e98a3f',
    hemiSky: '#ffd9a8', hemiGround: '#e08a3c', hemiI: 0.92,
    sun: '#fff1da', sunI: 1.1,
    ambI: 0.32,
    fog: '#f4b878', fogD: 0.0075,
    exposure: 1.12,
    emissive: 0.04, // tiny self-glow so neon still reads in daylight
    lampGlow: 0.0,
  },

  // ── Night theme ──
  night: {
    skyTop: '#241a3c', skyBottom: '#532f4a',  // deep indigo → warm plum horizon
    hemiSky: '#3b3b72', hemiGround: '#2a2030', hemiI: 0.42,
    sun: '#7e86c4', sunI: 0.28,               // cool moonlight
    ambI: 0.2,
    fog: '#241a34', fogD: 0.014,
    exposure: 1.2,
    emissive: 1.0,  // full neon / lit windows / lanterns
    lampGlow: 1.0,
  },
}
