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
  vending:     ['#e23b4e', '#2f9fb0', '#f0b03e', '#5fbf8a'], // dropped candy-blue
  bike:        ['#e8557f', '#34b3c4', '#f2a93c'],
  signNeon:    ['#ff3d8b', '#25e0d0', '#ffb347', '#ff5252'], // 4 only — no violet/blue
  cone:        '#f06a2a',
  planter:     '#8a5a3a',

  // ── PALETTE DISCIPLINE ────────────────────────────────────────────────
  // Body colours come ONLY from the 5 DOMINANT muted tones below or the 8
  // project accents. High chroma is reserved for ≤11 surfaces per scene.
  // Neon appears only on emissive (nightE) elements — never a wall colour.
  //
  // (a) DOMINANT — warm-muted majority (~70% of buildings). sat ≤0.35.
  domSandCream:  '#e6c79b',  // D1 — machiya plaster, MOST common
  domMutedBlue:  '#8fa6b4',  // D2 — clean blue, desaturated (cool relief)
  domTerracotta: '#cf9272',  // D3 — warm Taiwan brick
  domSage:       '#a7b09a',  // D4 — occasional green-grey
  domTaupe:      '#b9aa97',  // D5 — podiums, neutral connector
  // (b) FILLER ACCENTS — lower chroma than projects (max 3 placed citywide)
  accFillTeal:   '#4ea3a0',
  accFillPink:   '#d96f93',
  accFillWarm:   '#e0925a',

  // shop / filler buildings now route through the dominant set (no candy)
  shopColors:  ['#e6c79b', '#8fa6b4', '#cf9272', '#a7b09a', '#b9aa97'],
  roofWarm:    '#c9603a',
  roofTeal:    '#3e8f88',   // muted from #2f8a99
  roofClay:    '#b5654a',
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
  stallColors: ['#e8557f', '#f0b03e', '#34b3c4', '#f2784b', '#5fbf8a'], // dropped violet
  awning:      ['#e23b4e', '#f2a93c', '#e8557f'], // warm-biased (dropped cool teal)
  lantern:     '#ff5a4d',  // red paper lantern
  lanternWarm: '#ffb347',
  lampPost:    '#33373f',
  lampGlow:    '#ffd98a',

  // neon (night accents) — tight 4-colour set; violet/blue removed (read "candy")
  neon:        ['#ff3d8b', '#25e0d0', '#ffb347', '#ff5252'],

  marker:      '#f26b2a',

  // ── Day theme ──
  day: {
    skyTop: '#ffe3bd', skyBottom: '#ef9a4e',
    hemiSky: '#fff0d8', hemiGround: '#e8a35e', hemiI: 0.96,
    sun: '#fff4e2', sunI: 1.18,
    ambI: 0.34,
    fog: '#f7ddb6', fogD: 0.0028,  // light — let building colours breathe (was a sepia veil)
    exposure: 1.12,
    emissive: 0.04, // tiny self-glow so neon still reads in daylight
    lampGlow: 0.0,
  },

  // ── Night theme ──
  night: {
    skyTop: '#1c1636', skyBottom: '#3a2950',  // deep indigo → cool plum horizon
    hemiSky: '#37407e', hemiGround: '#241d34', hemiI: 0.46,
    sun: '#7e86c4', sunI: 0.3,                // cool moonlight
    ambI: 0.2,
    fog: '#1d1830', fogD: 0.0085,
    exposure: 1.12,
    emissive: 1.0,  // full neon / lit windows / lanterns
    lampGlow: 1.0,
  },
}
