// Procedural Stockholm City Hall for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Stockholm City Hall in
// code and writes it in the atlas binary format:
//   public/models/stockholm-city-hall/atlas.json
//   public/models/stockholm-city-hall/stockholm-city-hall-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// primarily Wikipedia "Stockholm City Hall" and the City of Stockholm's
// own English-language fact sheet):
//   seat of Stockholm Municipality on the eastern tip of Kungsholmen
//   island, on Riddarfjarden's northern shore; designed by Swedish
//   architect Ragnar Ostberg in the National Romantic style; built
//   1911 to 1923, inaugurated 23 June 1923 on the 400th anniversary of
//   Gustav Vasa's entry into Stockholm; around 8 million bricks;
//   the City Hall Tower (Stadshustornet) is 106 m high with 365 steps to
//   the top; tower holds nine bells, the largest weighing 3,000 kg,
//   striking hourly with tunes at noon and 6 pm; the carillon figures
//   turn on the eastern balcony and tell the story of St. George and
//   the Dragon; the tower alone took almost 2.5 million bricks and
//   weighs 24,000 tonnes, double the Eiffel Tower; viewpoint 73 m above
//   sea level with four large sculptures including Eric IX (St. Eric),
//   Stockholm's patron saint; the Three Crowns (Tre Kronor) top the
//   tower: gilded copper, each 2.2 m wide, 1.1 m high, 70 kg, angled
//   toward Gamla Stan where the medieval Tre Kronor castle stood until
//   it burned in 1697; the crowns are Sweden's national emblem since
//   the 14th century; the Blue Hall (Bla hallen) hosts the Nobel
//   Banquet every 10 December, broadcast live on SVT, with the dance
//   afterwards in the Golden Hall (Gyllene salen), whose walls carry
//   about 18 million gold mosaic pieces; the Council Chamber ceiling is
//   built like a Viking longhouse; the building is arranged around two
//   courtyards, the Blue Hall and the Borgargarden (citizens'
//   courtyard); deliberately built one meter taller than Copenhagen
//   City Hall's tower.
// Schematic (not sourced, never stated as fact in the UI): exact
// building footprint and wing dimensions (modeled as a 110 by 75 m
// complex); tower shaft cross-section and taper; belfry arch
// arrangement; exact Blue Hall, Golden Hall and Council Chamber
// volumes and positions; courtyard colonnade details; roof profiles;
// waterfront terrace and steps; statue placements; window rhythms.
//
// Coordinate frame: x = east-west (water/Riddarfjarden is +z south),
// y = up. All dimensions in meters.
//
// Granularity: 100+ named parts across 8 systems.
//
// Usage: node scripts/generate-stockholm-city-hall.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'stockholm-city-hall');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (106 m tower) maps to 2.4 units.
const S = 2.4 / 106;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Building footprint (schematic): 110 m (x) by 75 m (z), tower at the
// southeast corner facing the water (+z).
const BX = 55, BZ = 37.5;
const TX = 42, TZ = 28; // tower center

// --- Tower: base, three shaft segments, belfry, spire, Three Crowns.
addPart('tower-base', 'Tower base', 'tower', [
  box(TX - 7, TX + 7, 0, 15, TZ - 7, TZ + 7),
]);
addPart('tower-shaft-lower', 'Tower shaft (lower)', 'tower', [
  box(TX - 5.5, TX + 5.5, 15, 40, TZ - 5.5, TZ + 5.5),
]);
addPart('tower-shaft-middle', 'Tower shaft (middle)', 'tower', [
  box(TX - 5, TX + 5, 40, 62, TZ - 5, TZ + 5),
]);
addPart('tower-shaft-upper', 'Tower shaft (upper)', 'tower', [
  box(TX - 4.5, TX + 4.5, 62, 78, TZ - 4.5, TZ + 4.5),
]);
// corner pilasters on the shaft
{
  const pil = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pil.push(box(TX + sx * 5.5 - 0.6, TX + sx * 5.5 + 0.6, 15, 78, TZ + sz * 5.5 - 0.6, TZ + sz * 5.5 + 0.6));
  }
  addPart('tower-pilasters', 'Tower corner pilasters', 'tower', pil);
}
// narrow tower windows per shaft segment
for (const [seg, y0, y1] of [['lower', 15, 40], ['middle', 40, 62], ['upper', 62, 78]]) {
  const wins = [];
  for (const s of [-1, 1]) {
    wins.push(box(TX - 0.8, TX + 0.8, y0 + 5, y1 - 5, TZ - 5.6, TZ - 5.4));
    wins.push(box(TX - 0.8, TX + 0.8, y0 + 5, y1 - 5, TZ + 5.4, TZ + 5.6));
    wins.push(box(TX - 5.6, TX - 5.4, y0 + 5, y1 - 5, TZ - 0.8, TZ + 0.8));
    wins.push(box(TX + 5.4, TX + 5.6, y0 + 5, y1 - 5, TZ - 0.8, TZ + 0.8));
  }
  addPart(`tower-${seg}-windows`, `Tower ${seg} shaft windows`, 'tower', wins);
}
// observation balcony at the viewpoint
addPart('tower-balcony', 'Tower observation balcony', 'tower', [
  box(TX - 6.5, TX + 6.5, 71, 72, TZ - 6.5, TZ + 6.5),
  box(TX - 6.5, TX + 6.5, 72, 73, TZ - 6.5, TZ - 6.2),
  box(TX - 6.5, TX + 6.5, 72, 73, TZ + 6.2, TZ + 6.5),
  box(TX - 6.5, TX - 6.2, 72, 73, TZ - 6.5, TZ + 6.5),
  box(TX + 6.2, TX + 6.5, 72, 73, TZ - 6.5, TZ + 6.5),
]);
addPart('tower-flagpole', 'Tower flagpole', 'tower', [
  cyl(0.08, 0.08, 6, TX + 3, 95, TZ + 3, 6),
]);
// belfry: open arches on four sides (one part per side)
for (const [bid, bname, x0, x1, z0, z1] of [
  ['north', 'North', TX - 4.5, TX + 4.5, TZ - 4.5, TZ - 3.5],
  ['south', 'South', TX - 4.5, TX + 4.5, TZ + 3.5, TZ + 4.5],
  ['west', 'West', TX - 4.5, TX - 3.5, TZ - 4.5, TZ + 4.5],
  ['east', 'East', TX + 3.5, TX + 4.5, TZ - 4.5, TZ + 4.5],
]) {
  addPart(`belfry-${bid}`, `Belfry ${bname} arches`, 'tower', [box(x0, x1, 78, 90, z0, z1)]);
}
{
  const piers = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    piers.push(box(TX + sx * 4.5 - 1, TX + sx * 4.5 + 1, 78, 90, TZ + sz * 4.5 - 1, TZ + sz * 4.5 + 1));
  piers.push(box(TX - 5.5, TX + 5.5, 90, 92, TZ - 5.5, TZ + 5.5));
  addPart('belfry-piers', 'Belfry corner piers', 'tower', piers);
}
// spire ribs
{
  const ribs = [];
  for (let r = 0; r < 4; r++) {
    const a = (r / 4) * Math.PI * 2 + Math.PI / 4;
    ribs.push(box(TX + Math.cos(a) * 2.2 - 0.25, TX + Math.cos(a) * 2.2 + 0.25, 92, 104, TZ + Math.sin(a) * 2.2 - 0.25, TZ + Math.sin(a) * 2.2 + 0.25));
  }
  addPart('spire-ribs', 'Spire ribs', 'tower', ribs);
}
// clock faces on four sides
for (const [cid, cname, x0, x1, z0, z1] of [
  ['north', 'North', TX - 2, TX + 2, TZ - 5.1, TZ - 4.9],
  ['south', 'South', TX - 2, TX + 2, TZ + 4.9, TZ + 5.1],
  ['east', 'East', TX + 4.9, TX + 5.1, TZ - 2, TZ + 2],
  ['west', 'West', TX - 5.1, TX - 4.9, TZ - 2, TZ + 2],
]) {
  addPart(`clock-${cid}`, `${cname} clock face`, 'tower', [box(x0, x1, 66, 70, z0, z1)]);
}
// spire: tapering from belfry to the crowns
addPart('spire', 'Tower spire', 'tower', [
  cyl(0.8, 4.5, 12, TX, 98, TZ, 4),
]);
// Three Crowns: gilded copper, 2.2 m wide, 1.1 m high each
for (let c = 0; c < 3; c++) {
  const a = (c / 3) * Math.PI * 2;
  const cx = TX + Math.cos(a) * 1.8;
  const cz = TZ + Math.sin(a) * 1.8;
  const band = cyl(1.1, 1.1, 1.1, cx, 104.5, cz, 12);
  const points = [];
  for (let k = 0; k < 5; k++) {
    const pa = (k / 5) * Math.PI * 2;
    points.push(box(cx + Math.cos(pa) * 0.9 - 0.15, cx + Math.cos(pa) * 0.9 + 0.15, 105, 106, cz + Math.sin(pa) * 0.9 - 0.15, cz + Math.sin(pa) * 0.9 + 0.15));
  }
  addPart(`crown-${c + 1}`, `Three Crowns: crown ${c + 1}`, 'tower', [band, ...points]);
}
// carillon + bells
addPart('carillon', 'Carillon', 'tower', [
  box(TX - 3, TX + 3, 80, 84, TZ + 4.5, TZ + 5.5),
]);
{
  const bells = [];
  for (let b = 0; b < 9; b++) {
    const bx = TX - 3 + (b % 3) * 3;
    const bz = TZ - 2 + Math.floor(b / 3) * 2;
    bells.push(cyl(0.3, 0.7, 1.2, bx, 85, bz, 8));
  }
  addPart('bells', 'Tower bells', 'tower', bells);
}
// four sculptures at the viewpoint, incl. St. Eric
const saints = ['St. Eric', 'St. George', 'Birger Jarl', 'Gustav Vasa'];
saints.forEach((s, si) => {
  const a = (si / 4) * Math.PI * 2 + Math.PI / 4;
  const sx = TX + Math.cos(a) * 6;
  const sz = TZ + Math.sin(a) * 6;
  addPart(`tower-sculpture-${si + 1}`, `Viewpoint sculpture: ${s}`, 'tower', [
    cyl(0.4, 0.6, 2.5, sx, 74, sz, 8),
    new THREE.SphereGeometry(0.35, 8, 6).translate(sx, 75.6, sz),
  ]);
});

// --- Main block: four wings, three floors of window bands each.
const wings = [
  ['north', 'North', -BX, BX, -BZ, -BZ + 14],
  ['south', 'South', -BX, BX, BZ - 14, BZ],
  ['west', 'West', -BX, -BX + 14, -BZ + 14, BZ - 14],
  ['east', 'East', BX - 14, BX, -BZ + 14, BZ - 14],
];
for (const [wid, wname, x0, x1, z0, z1] of wings) {
  addPart(`${wid}-wing-walls`, `${wname} wing walls`, 'main-block', [
    box(x0, x1, 0, 15, z0, z1),
  ]);
  for (let f = 0; f < 3; f++) {
    const y0 = 3 + f * 4;
    const wins = [];
    const n = Math.max(3, Math.floor((x1 - x0) / 6));
    for (let wxi = 0; wxi < n; wxi++) {
      const wx = x0 + 4 + (wxi * (x1 - x0 - 8)) / Math.max(1, n - 1);
      wins.push(box(wx - 0.9, wx + 0.9, y0, y0 + 2.2, z0 - 0.3, z0 + 0.1));
      wins.push(box(wx - 0.9, wx + 0.9, y0, y0 + 2.2, z1 - 0.1, z1 + 0.3));
    }
    addPart(`${wid}-wing-floor-${f + 1}-windows`, `${wname} wing floor ${f + 1} windows`, 'main-block', wins);
  }
  addPart(`${wid}-wing-cornice`, `${wname} wing cornice`, 'main-block', [
    box(x0 - 0.5, x1 + 0.5, 15, 16, z0 - 0.5, z1 + 0.5),
  ]);
  addPart(`${wid}-wing-parapet`, `${wname} wing parapet`, 'main-block', [
    box(x0 - 0.3, x1 + 0.3, 16, 17, z0 - 0.3, z1 + 0.3),
  ]);
  {
    const chim = [];
    const nch = 3;
    for (let ci = 0; ci < nch; ci++) {
      const cx = x0 + 8 + (ci * (x1 - x0 - 16)) / Math.max(1, nch - 1);
      chim.push(box(cx - 0.8, cx + 0.8, 16, 20, (z0 + z1) / 2 - 0.8, (z0 + z1) / 2 + 0.8));
    }
    addPart(`${wid}-wing-chimneys`, `${wname} wing chimneys`, 'main-block', chim);
  }
}

// --- Blue Hall: the Nobel banquet hall on the water side.
addPart('blue-hall-volume', 'Blue Hall volume', 'blue-hall', [
  box(-40, 10, 0, 14, BZ - 30, BZ - 14),
]);
{
  const cols = [];
  for (let ci = 0; ci < 6; ci++) {
    cols.push(cyl(0.5, 0.6, 12, -35 + ci * 9, 6, BZ - 22, 10));
  }
  addPart('blue-hall-columns', 'Blue Hall columns', 'blue-hall', cols);
}
addPart('blue-hall-windows', 'Blue Hall windows', 'blue-hall', [
  box(-40, 10, 4, 10, BZ - 30.3, BZ - 29.9),
]);
addPart('blue-hall-floor', 'Blue Hall floor', 'blue-hall', [
  box(-40, 10, -0.5, 0, BZ - 30, BZ - 14),
]);
addPart('blue-hall-organ', 'Blue Hall organ loft', 'blue-hall', [
  box(-40, -30, 8, 14, BZ - 30, BZ - 24),
]);
addPart('blue-hall-stage', 'Blue Hall stage', 'blue-hall', [
  box(-5, 10, 0, 1.2, BZ - 30, BZ - 20),
]);
{
  const chand = [];
  for (const cx of [-25, -10, 5]) {
    chand.push(cyl(0.1, 0.1, 4, cx, 11, BZ - 22, 6));
    chand.push(cyl(1.5, 1.0, 0.8, cx, 8.6, BZ - 22, 10));
  }
  addPart('blue-hall-chandeliers', 'Blue Hall chandeliers', 'blue-hall', chand);
}
addPart('blue-hall-balcony', 'Blue Hall balcony', 'blue-hall', [
  box(-40, 10, 10, 11, BZ - 16, BZ - 14),
]);
addPart('blue-hall-tapestries', 'Blue Hall tapestries', 'blue-hall', [
  box(-40, -30, 4, 10, BZ - 29.9, BZ - 29.5),
  box(0, 10, 4, 10, BZ - 29.9, BZ - 29.5),
]);

// --- Golden Hall: gold mosaic hall.
addPart('golden-hall-volume', 'Golden Hall volume', 'golden-hall', [
  box(-40, 10, 14, 22, BZ - 30, BZ - 20),
]);
for (const [mid, mname, x0, x1, z0, z1] of [
  ['north', 'North', -40, 10, BZ - 30.3, BZ - 29.9],
  ['south', 'South', -40, 10, BZ - 20.1, BZ - 19.7],
  ['west', 'West', -40.3, -39.9, BZ - 30, BZ - 20],
  ['east', 'East', 9.7, 10.1, BZ - 30, BZ - 20],
]) {
  addPart(`golden-mosaic-${mid}`, `Golden Hall ${mname} mosaic wall`, 'golden-hall', [box(x0, x1, 14, 22, z0, z1)]);
}
addPart('golden-mosaic-ceiling', 'Golden Hall mosaic ceiling', 'golden-hall', [
  box(-40, 10, 21.7, 22, BZ - 30, BZ - 20),
]);
addPart('golden-hall-queen', 'Queen of Lake Malaren mosaic', 'golden-hall', [
  box(-15, -5, 14, 22, BZ - 20.1, BZ - 19.7),
]);
addPart('golden-hall-doors', 'Golden Hall doors', 'golden-hall', [
  box(-2, 2, 14, 19, BZ - 30.3, BZ - 29.9),
]);

// --- Council Chamber.
addPart('council-chamber', 'Council Chamber', 'council', [
  box(-50, -20, 0, 10, -BZ + 14, -BZ + 34),
]);
addPart('council-ceiling', 'Council Chamber longhouse ceiling', 'council', [
  cyl(8, 8, 30, -35, 10, -BZ + 24, 3, 1),
]);
addPart('council-gallery', 'Council Chamber public gallery', 'council', [
  box(-50, -20, 6, 7, -BZ + 30, -BZ + 34),
]);
addPart('council-dais', 'Council Chamber dais', 'council', [
  box(-45, -25, 0, 1.5, -BZ + 16, -BZ + 22),
]);

// --- Borgargarden courtyard: colonnades on three sides + fountain.
for (const [cid, cname, x0, x1, z0, z1] of [
  ['north', 'North', -30, 30, -15, -13],
  ['west', 'West', -32, -30, -15, 15],
  ['east', 'East', 30, 32, -15, 15],
]) {
  const col = [];
  const n = 8;
  for (let ci = 0; ci < n; ci++) {
    const t = ci / (n - 1);
    col.push(cyl(0.35, 0.4, 5, x0 + t * (x1 - x0), 2.5, z0 + t * (z1 - z0), 8));
  }
  col.push(box(Math.min(x0, x1) - 1, Math.max(x0, x1) + 1, 5, 5.8, Math.min(z0, z1) - 1, Math.max(z0, z1) + 1));
  addPart(`courtyard-colonnade-${cid}`, `Borgargarden ${cname} colonnade`, 'courtyard', col);
}
addPart('courtyard-fountain', 'Borgargarden fountain', 'courtyard', [
  cyl(3, 3.5, 1, 0, 0.5, 0, 12),
  cyl(0.3, 0.3, 2.5, 0, 1.5, 0, 8),
]);
addPart('courtyard-paving', 'Borgargarden paving', 'courtyard', [
  box(-32, 32, -0.4, 0, -15, 15),
]);
addPart('courtyard-gate-east', 'Borgargarden east gate', 'courtyard', [
  box(30, 32, 0, 6, -2, 2),
  cyl(0.4, 0.4, 7, 30, 3.5, -2.5, 8),
  cyl(0.4, 0.4, 7, 30, 3.5, 2.5, 8),
]);
addPart('courtyard-gate-west', 'Borgargarden west gate', 'courtyard', [
  box(-32, -30, 0, 6, -2, 2),
  cyl(0.4, 0.4, 7, -30, 3.5, -2.5, 8),
  cyl(0.4, 0.4, 7, -30, 3.5, 2.5, 8),
]);

// --- Roofs.
for (const [rid, rname, x0, x1, z0, z1] of wings) {
  const roof = new THREE.CylinderGeometry(0.1, 1, 4, 4, 1);
  roof.rotateY(Math.PI / 4);
  roof.scale((x1 - x0) / 1.4, 1, (z1 - z0) / 1.4);
  roof.translate((x0 + x1) / 2, 18, (z0 + z1) / 2);
  addPart(`${rid}-wing-roof`, `${rname} wing roof`, 'roofs', [roof]);
}
addPart('blue-hall-roof', 'Blue Hall roof', 'roofs', [
  box(-40, 10, 14, 15.5, BZ - 30, BZ - 14),
]);
addPart('golden-hall-roof', 'Golden Hall roof', 'roofs', [
  box(-40, 10, 22, 23.5, BZ - 30, BZ - 20),
]);

// --- Waterfront: terrace, steps, statues.
addPart('waterfront-terrace', 'Waterfront terrace', 'waterfront', [
  box(-BX, BX, -0.5, 0.5, BZ, BZ + 18),
]);
{
  const steps = [];
  for (let s = 0; s < 4; s++) {
    steps.push(box(-BX, BX, -0.5 - s * 0.5, -s * 0.5, BZ + 18 + s * 1.5, BZ + 19.5 + s * 1.5));
  }
  addPart('waterfront-steps', 'Waterfront steps', 'waterfront', steps);
}
addPart('waterfront-statue-east', 'Waterfront statue (east)', 'waterfront', [
  cyl(0.5, 0.7, 3, BX - 8, 2, BZ + 10, 8),
  box(BX - 9, BX - 7, 0, 0.8, BZ + 9, BZ + 11),
]);
addPart('waterfront-statue-west', 'Waterfront statue (west)', 'waterfront', [
  cyl(0.5, 0.7, 3, -BX + 8, 2, BZ + 10, 8),
  box(-BX + 7, -BX + 9, 0, 0.8, BZ + 9, BZ + 11),
]);
addPart('quay-wall', 'Quay wall', 'waterfront', [
  box(-BX - 2, BX + 2, -3, -0.5, BZ + 18, BZ + 20),
]);
for (const [fid, fname, fx] of [['east', 'East', BX - 15], ['west', 'West', -BX + 15]]) {
  addPart(`flagpole-${fid}`, `${fname} flagpole`, 'waterfront', [
    cyl(0.1, 0.12, 12, fx, 6, BZ + 12, 6),
    box(fx, fx + 2.5, 10.5, 12, BZ + 11.9, BZ + 12.1),
  ]);
}

// --- Entrance portal.
addPart('entrance-portal', 'Main entrance portal', 'main-block', [
  box(-4, 4, 0, 8, -BZ - 1, -BZ + 1),
  cyl(2, 2, 1, 0, 8.5, -BZ, 12, 1),
]);
addPart('entrance-doors', 'Main entrance doors', 'main-block', [
  box(-2.5, 2.5, 0, 6, -BZ - 0.5, -BZ),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('crown')) return '#c9a227';
  if (id.includes('clock')) return '#2b2b2b';
  if (id.includes('spire') || id.includes('belfry')) return '#8a4a3a';
  if (id.includes('tower')) return '#9c4a38';
  if (id.includes('golden')) return '#d4af37';
  if (id.includes('blue-hall')) return '#7a3b2e';
  if (id.includes('council')) return '#8a5a44';
  if (id.includes('colonnade') || id.includes('fountain')) return '#b08a6a';
  if (id.includes('roof')) return '#5a6b5a';
  if (id.includes('terrace') || id.includes('steps') || id.includes('paving')) return '#9a938a';
  if (id.includes('statue') || id.includes('sculpture')) return '#7d7d7d';
  if (id.includes('carillon') || id.includes('bells')) return '#4a4a4a';
  if (id.includes('entrance') || id.includes('portal')) return '#6b4a3a';
  return '#9c4a38';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'tower', name: 'City Hall Tower', color: '#9c4a38', description: 'The 106 m Stadshustornet: brick shaft, belfry, spire and the gilded Three Crowns.' },
  { id: 'main-block', name: 'Main block', color: '#9c4a38', description: 'The red-brick office wings around the courtyards.' },
  { id: 'blue-hall', name: 'Blue Hall', color: '#7a3b2e', description: 'Bla hallen, the Nobel Banquet hall.' },
  { id: 'golden-hall', name: 'Golden Hall', color: '#d4af37', description: 'Gyllene salen with its 18 million gold mosaic pieces.' },
  { id: 'council', name: 'Council Chamber', color: '#8a5a44', description: 'The chamber with its Viking longhouse ceiling.' },
  { id: 'courtyard', name: 'Borgargarden', color: '#b08a6a', description: "The citizens' courtyard with colonnades and fountain." },
  { id: 'roofs', name: 'Roofs', color: '#5a6b5a', description: 'Copper-clad roofs over the wings and halls.' },
  { id: 'waterfront', name: 'Waterfront', color: '#9a938a', description: 'The terrace and steps down to Riddarfjarden.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
function buildExplanations() {
  const e = {};
  e['tower base'] = 'The tower base rising from the southeast corner of the complex. Exact cross-section is schematic.';
  e['tower shaft (lower)'] = 'Lower section of the 106 m brick tower shaft. The tower alone took almost 2.5 million bricks. Exact taper is schematic.';
  e['tower shaft (middle)'] = 'Middle section of the tower shaft. Exact brick coursing is schematic.';
  e['tower shaft (upper)'] = 'Upper section of the tower shaft below the belfry. Exact detail is schematic.';
  e['tower corner pilasters'] = 'Brick pilasters emphasizing the tower corners. Exact profile is schematic.';
  for (const seg of ['lower', 'middle', 'upper']) e[`tower ${seg} shaft windows`] = `Narrow windows of the ${seg} shaft. Exact rhythm is schematic.`;
  e['tower observation balcony'] = 'The railed balcony at the 73 m viewpoint. Exact railing is schematic.';
  e['tower flagpole'] = 'Flagpole on the tower. Exact position is schematic.';
  e['belfry'] = 'The open belfry with arches on four sides, housing the nine bells. Exact arch arrangement is schematic.';
  for (const d of ['north', 'south', 'west', 'east']) e[`belfry ${d} arches`] = `The ${d} arches of the open belfry. Exact arrangement is schematic.`;
  e['belfry corner piers'] = 'Corner piers of the belfry. Exact form is schematic.';
  e['spire ribs'] = 'Ribs of the tapering spire. Exact profile is schematic.';
  e['north clock face'] = 'Clock face on the north side of the tower. Exact dial design is schematic.';
  e['south clock face'] = 'Clock face on the south side of the tower. Exact dial design is schematic.';
  e['east clock face'] = 'Clock face on the east side, above the carillon balcony. Exact dial design is schematic.';
  e['west clock face'] = 'Clock face on the west side of the tower. Exact dial design is schematic.';
  e['tower spire'] = 'The tapering spire above the belfry carrying the Three Crowns. Exact profile is schematic.';
  for (let c = 1; c <= 3; c++) e[`three crowns: crown ${c}`] = `One of the Three Crowns (Tre Kronor), Sweden's national emblem since the 14th century: gilded copper, 2.2 m wide, 1.1 m high, 70 kg, angled toward Gamla Stan. Exact mounting is schematic.`;
  e['carillon'] = 'The carillon on the eastern balcony: when the bells play their tune, figures turn and tell the story of St. George and the Dragon. Exact mechanism is schematic.';
  e['tower bells'] = 'Nine bells, the largest weighing 3,000 kg, striking every hour with tunes at noon and 6 pm. Exact hanging is schematic.';
  const saints = ['St. Eric', 'St. George', 'Birger Jarl', 'Gustav Vasa'];
  saints.forEach((s, si) => {
    e[`viewpoint sculpture: ${s.toLowerCase()}`] = `${s} guards the viewpoint 73 m above sea level. Exact figure is schematic.`;
  });
  for (const [wid, wname] of [['north', 'North'], ['south', 'South'], ['west', 'West'], ['east', 'East']]) {
    e[`${wname.toLowerCase()} wing walls`] = `${wname} wing of the red-brick main block. The whole building took about 8 million bricks. Exact wall buildup is schematic.`;
    for (let f = 1; f <= 3; f++) e[`${wname.toLowerCase()} wing floor ${f} windows`] = `Window band of floor ${f} on the ${wname.toLowerCase()} wing. Exact rhythm is schematic.`;
    e[`${wname.toLowerCase()} wing cornice`] = `Cornice crowning the ${wname.toLowerCase()} wing. Exact profile is schematic.`;
    e[`${wname.toLowerCase()} wing parapet`] = `Parapet above the ${wname.toLowerCase()} wing cornice. Exact form is schematic.`;
    e[`${wname.toLowerCase()} wing chimneys`] = `Chimneys on the ${wname.toLowerCase()} wing. Exact count is schematic.`;
    e[`${wname.toLowerCase()} wing roof`] = `Copper-clad roof over the ${wname.toLowerCase()} wing. Exact pitch is schematic.`;
  }
  e['blue hall volume'] = 'The Blue Hall (Bla hallen), the Nobel Banquet hall. Its walls were meant to be blue but stayed red brick. Exact volume is schematic.';
  e['blue hall columns'] = 'Columns of the Blue Hall. Exact order is schematic.';
  e['blue hall windows'] = 'Tall windows of the Blue Hall toward the water. Exact glazing is schematic.';
  e['blue hall floor'] = 'The Blue Hall floor where the Nobel dinner is served each 10 December. Exact finish is schematic.';
  e['blue hall organ loft'] = 'The organ loft of the Blue Hall. Exact instrument is schematic.';
  e['blue hall stage'] = 'The stage used for the Nobel entertainment (divertissement). Exact form is schematic.';
  e['blue hall chandeliers'] = 'Chandeliers of the Blue Hall. Exact design is schematic.';
  e['blue hall balcony'] = "The Blue Hall's interior balcony. Exact form is schematic.";
  e['blue hall tapestries'] = 'Tapestries of the Blue Hall. Exact subjects are schematic.';
  e['golden hall volume'] = 'The Golden Hall (Gyllene salen) above the Blue Hall, where the Nobel dance is held. Exact volume is schematic.';
  for (const d of ['north', 'south', 'west', 'east']) e[`golden hall ${d} mosaic wall`] = `The ${d} wall's gold mosaics: about 18 million pieces depicting Swedish history. Exact scenes are schematic.`;
  e['golden hall mosaic ceiling'] = 'The mosaic ceiling of the Golden Hall. Exact pattern is schematic.';
  e['queen of lake malaren mosaic'] = 'The great mosaic of the Queen of Lake Malaren receiving homage. Exact composition is schematic.';
  e['golden hall doors'] = 'Doors of the Golden Hall. Exact design is schematic.';
  e['council chamber'] = 'The Council Chamber where Stockholm City Council meets. Exact interior is schematic.';
  e['council chamber longhouse ceiling'] = 'The ceiling built in the style of a Viking longhouse. Exact construction is schematic.';
  e['council chamber public gallery'] = 'The public gallery seating 200. Exact seating is schematic.';
  e['council chamber dais'] = 'The dais of the Council Chamber. Exact form is schematic.';
  for (const d of ['north', 'west', 'east']) e[`borgargarden ${d} colonnade`] = `The ${d} colonnade of the Borgargarden, the citizens' courtyard. Exact columns are schematic.`;
  e['borgargarden fountain'] = "Fountain in the citizens' courtyard. Exact design is schematic.";
  e['borgargarden paving'] = "Paving of the citizens' courtyard. Exact pattern is schematic.";
  e['borgargarden east gate'] = "East gate of the citizens' courtyard. Exact design is schematic.";
  e['borgargarden west gate'] = "West gate of the citizens' courtyard. Exact design is schematic.";
  e['blue hall roof'] = 'Roof over the Blue Hall. Exact form is schematic.';
  e['golden hall roof'] = 'Roof over the Golden Hall. Exact form is schematic.';
  e['waterfront terrace'] = 'The terrace facing Riddarfjarden. Exact extent is schematic.';
  e['waterfront steps'] = 'Steps down toward the water. Exact count is schematic.';
  e['waterfront statue (east)'] = 'Statue on the waterfront terrace. Exact subject is schematic.';
  e['waterfront statue (west)'] = 'Statue on the waterfront terrace. Exact subject is schematic.';
  e['quay wall'] = 'The quay wall along Riddarfjarden. Exact construction is schematic.';
  e['east flagpole'] = 'Flagpole on the waterfront terrace. Exact position is schematic.';
  e['west flagpole'] = 'Flagpole on the waterfront terrace. Exact position is schematic.';
  e['main entrance portal'] = 'The main entrance portal on the north side. Exact design is schematic.';
  e['main entrance doors'] = 'The main entrance doors. Exact design is schematic.';
  return e;
}
Object.assign(explanations, buildExplanations());

// ---------------------------------------------------------------- serialize
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(
    p.geoms.map((g) => {
      g.deleteAttribute('uv');
      return g;
    }),
    false,
  );
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  const idx = merged.index ? merged.index.array : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const n16 = new Int16Array(nor.length);
  for (let i = 0; i < nor.length; i++) {
    n16[i] = Math.round(Math.max(-1, Math.min(1, nor[i])) * 32767);
  }
  const u32 = idx instanceof Uint32Array ? idx : Uint32Array.from(idx);
  const align4 = (n) => (n + 3) & ~3;
  const posOff = offset;
  offset = align4(offset + pos.byteLength);
  const norOff = offset;
  offset = align4(offset + n16.byteLength);
  const idxOff = offset;
  offset = align4(offset + u32.byteLength);
  const bb = merged.boundingBox;
  records.push({
    part: p,
    pos: Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength),
    nor: Buffer.from(n16.buffer, n16.byteOffset, n16.byteLength),
    idx: Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength),
    posOff,
    norOff,
    idxOff,
    vertexCount: pos.length / 3,
    indexCount: u32.length,
    bounds: [
      [bb.min.x, bb.min.y, bb.min.z],
      [bb.max.x, bb.max.y, bb.max.z],
    ],
  });
  triangles += u32.length / 3;
  merged.dispose();
}

const buffer = Buffer.alloc(offset);
for (const r of records) {
  r.pos.copy(buffer, r.posOff);
  r.nor.copy(buffer, r.norOff);
  r.idx.copy(buffer, r.idxOff);
}
const binName = 'stockholm-city-hall-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Stockholm City Hall (schematic)',
  title: 'Stockholm City Hall',
  location: 'Stockholm, Sweden',
  blurb: 'Ragnar Ostberg\u2019s National Romantic city hall (1911-1923): red-brick wings around courtyards with the 106 m Stadshustornet crowned by the gilded Three Crowns, home of the Nobel Banquet.',
  sourceUrls: [
    { label: 'Wikipedia: Stockholm City Hall', url: 'https://en.wikipedia.org/wiki/Stockholm_City_Hall' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id,
    name: r.part.name,
    conceptId: r.part.id,
    system: r.part.system,
    chunk: 0,
    color: colorFor(r.part.id),
    positions: r.posOff,
    normals: r.norOff,
    indices: r.idxOff,
    vertexCount: r.vertexCount,
    indexCount: r.indexCount,
    bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/stockholm-city-hall/stockholm-city-hall-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
