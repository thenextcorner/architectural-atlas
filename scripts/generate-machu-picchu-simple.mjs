// Simplified schematic Machu Picchu for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-machu-picchu.mjs, whose header
// lists every sourced dimension reused here), but coarser: 36 named
// parts across 6 systems instead of 117 across 11. Individual terraces,
// fountains, houses and niches are merged into group parts; carved
// detail is omitted.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-machu-picchu.mjs for the full attribution):
//   15th-century Inca citadel at 2,430 m, Cusco Region, Peru, about
//   80 km northwest of Cusco; built around 1450 for the emperor
//   Pachacuti; UNESCO World Heritage 1983; buildings single storey,
//   white granite, dry-stone walls, trapezoidal doorways and windows;
//   Temple of the Sun: only Inca construction with a semicircular
//   shape, curved ashlar wall about 10.5 m across on a natural granite
//   rock, three windows aligned to the winter (21 June) and summer
//   (22 December) solstice sunrises, about 3,096 m; Royal Tomb: natural
//   cave beneath the Temple of the Sun with carved walls, niches, altar
//   and throne carving; Intihuatana: "hitching post of the sun" carved
//   from bedrock, about 1.70 m high with an 8.60 m perimeter, about
//   3,126 m; Temple of the Three Windows: 10 by 8 m window wall with
//   the largest stone blocks in the citadel, east-facing trapezoidal
//   windows for winter solstice, summer solstice and equinox, the three
//   Inca worlds; Main Temple: three walls 11 by 8 m, walls 90 cm thick,
//   seven niches in the central wall and five in each side wall, carved
//   altar rock about 10 m ahead, Southern Cross sculpture; Temple of
//   the Condor: condor head stone with carved eyes and beak, ruff
//   stones, outstretched wing rocks, subterranean chamber, private
//   fountain with higher walls; water: 16 Stairway of Fountains,
//   spring canal about 749 m long at about 3% slope, total drop about
//   26 m, first fountain at the emperor's residence; saddle between
//   Machu Picchu mountain (2,795 m) and Huayna Picchu (2,667 m).
// Schematic (not sourced, never stated as fact in the UI): exact
// placement of the key structures relative to one another; terrace
// counts and widths; fountain positions; house counts and sizes;
// carved details; ridge base and mountain backdrops are context only.
//
// Writes:
//   public/models/machu-picchu-simple/atlas.json
//   public/models/machu-picchu-simple/machu-picchu-simple-0.bin
//
// Usage: node scripts/generate-machu-picchu-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'machu-picchu-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (500 m, the illustrated site frame)
// maps to 2.4 units (same as detailed).
const S = 7.2 / 500; // 3x the usual fit: keeps the exploded cloud (fixed +1 lift) inside the frame
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Curved wall arc: angles in degrees, 0 = east (+x), + = toward south (+z).
function arcWall(cx, cz, r, a0, a1, y0, y1, seg = 16) {
  const g = new THREE.CylinderGeometry(
    r, r, y1 - y0, seg, 1, true,
    (90 - a1) * D2R, (a1 - a0) * D2R,
  );
  g.translate(cx, (y0 + y1) / 2, cz);
  return g;
}
// Gable (thatched) roof prism: rotated before translating.
function gableRoof(x, z, w, d, y0, h) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-d / 2, 0, 0);
  g.translate(x, y0, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Temples (10 parts) ---
// Temple of the Sun: curved wall + straight west wall merged, windows
// merged, rock platform + altar merged.
{
  const CX = 15, CZ = 25, R = 5.25, Y0 = 4, Y1 = 9;
  addPart('sun-temple-wall', 'Temple of the Sun', 'temples', [
    arcWall(CX, CZ, R, -90, 90, Y0, Y1),
    box(CX - R - 0.45, CX - R + 0.45, Y0, Y1, CZ - R, CZ + R),
  ]);
  {
    const geoms = [];
    for (const [a, w] of [[-82, 1.6], [-25, 1.2], [25, 1.2]]) {
      const ar = a * D2R;
      const px = CX + R * Math.cos(ar);
      const pz = CZ + R * Math.sin(ar);
      const sill = new THREE.BoxGeometry(w + 0.6, 0.3, 0.9);
      sill.rotateY(-a * D2R + Math.PI / 2);
      sill.translate(px, 6.05, pz);
      const lintel = new THREE.BoxGeometry(w + 0.7, 0.35, 0.9);
      lintel.rotateY(-a * D2R + Math.PI / 2);
      lintel.translate(px, 7.9, pz);
      geoms.push(sill, lintel);
    }
    addPart('sun-temple-windows', 'Sun Temple solstice windows', 'temples', geoms);
  }
  addPart('sun-temple-altar-rock', 'Sun Temple altar rock', 'temples', [
    box(CX - 6.5, CX + 6.5, 0, Y0, CZ - 6.5, CZ + 6.5),
    box(CX - 2.2, CX + 2.2, Y0, Y0 + 1.3, CZ - 3, CZ + 1),
  ]);
  // Royal Tomb: merged cave below the temple
  addPart('royal-tomb', 'Royal Tomb', 'temples', [
    box(CX - 4, CX + 4, -8, -7.4, CZ - 5, CZ + 5),
    box(CX - 4, CX + 4, -8, -4.6, CZ - 5.4, CZ - 4.6),
    box(CX - 4.8, CX - 4, -8, -4.6, CZ - 5, CZ + 5),
    box(CX + 4, CX + 4.8, -8, -4.6, CZ - 5, CZ + 5),
    box(CX - 4.8, CX + 4.8, -4.6, -3.9, CZ - 5.4, CZ + 5.4),
    box(CX - 1, CX + 1, -7.4, -6.6, CZ + 1, CZ + 3),
    box(CX - 2.6, CX - 1.4, -7.4, -6.2, CZ - 3.5, CZ - 2.3),
  ]);
  // Temple of the Three Windows: walls merged, windows merged
  const X0 = 38, X1 = 46, Z0 = -50, Z1 = -40, H = 2.8;
  addPart('three-windows-temple', 'Temple of the Three Windows', 'temples', [
    box(X0 - 0.8, X0, 0, H, Z0, Z1),
    box(X0, X1, 0, H, Z0 - 0.8, Z0),
    box(X0, X1, 0, H, Z1, Z1 + 0.8),
    box(X0, X1, -0.4, 0, Z0, Z1),
  ]);
  {
    const geoms = [];
    for (const [z0, z1] of [[Z0 + 2, Z0 + 3.8], [Z0 + 6.2, Z0 + 8], [Z0 + 8, Z0 + 9.4]]) {
      geoms.push(box(X1 - 0.9, X1 + 0.1, 1.1, 1.2, z0, z1));
      geoms.push(box(X1 - 0.9, X1 + 0.1, 2.2, 2.3, z0 + 0.2, z1 - 0.2));
    }
    addPart('three-windows-windows', 'Three Windows openings', 'temples', geoms);
  }
  // Main Temple: walls + niches merged; altar rock separate
  const XN = 48, XC = 52, XS = 56, MZ0 = -13, MZ1 = -2;
  {
    const geoms = [
      box(XN - 0.45, XN + 0.45, 0, 3, MZ0 + 2.5, MZ1),
      box(XC - 0.45, XC + 0.45, 0, 3, MZ0, MZ1),
      box(XS - 0.45, XS + 0.45, 0, 3, MZ0, MZ1),
      box(XN - 2, XS + 2, -0.4, 0, MZ0 - 2, MZ1 + 2),
    ];
    for (let i = 0; i < 7; i++) {
      const z = MZ0 + 1.4 + i * 1.35;
      geoms.push(box(XC - 0.65, XC + 0.65, 1.1, 2.0, z - 0.35, z + 0.35));
    }
    for (const xw of [XN, XS]) {
      for (let i = 0; i < 5; i++) {
        const z = MZ0 + 2 + i * 1.7;
        geoms.push(box(xw - 0.65, xw + 0.65, 1.1, 2.0, z - 0.35, z + 0.35));
      }
    }
    addPart('main-temple', 'Main Temple', 'temples', geoms);
  }
  addPart('main-temple-altar-rock', 'Main Temple altar rock', 'temples', [
    box(XS + 8.5, XS + 12.5, 0, 2.1, MZ0 + 4, MZ0 + 7),
  ]);
  // Temple of the Condor: rock forms merged; walls + altar merged
  {
    const CX2 = 28, CZ2 = 62;
    const shape = new THREE.Shape();
    shape.moveTo(0, -1.6);
    shape.lineTo(1.8, 1.4);
    shape.lineTo(-1.8, 1.4);
    shape.closePath();
    const head = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
    head.rotateX(-Math.PI / 2);
    head.translate(CX2, 0.5, CZ2);
    const wingL = box(-1.2, 1.2, 0, 7, -3.5, 3.5);
    wingL.rotateZ(0.35);
    wingL.rotateY(0.5);
    wingL.translate(CX2 - 6, 0, CZ2 + 3);
    const wingR = box(-1.2, 1.2, 0, 7, -3.5, 3.5);
    wingR.rotateZ(-0.35);
    wingR.rotateY(-0.5);
    wingR.translate(CX2 + 6, 0, CZ2 + 3);
    const ruff = [];
    for (let i = 0; i < 5; i++) {
      const a = (-60 + i * 30) * D2R;
      ruff.push(cyl(0.7, 0.8, 0.6, CX2 + 2.4 * Math.cos(a), 0.8, CZ2 + 2.4 * Math.sin(a), 8));
    }
    addPart('condor-temple', 'Temple of the Condor', 'temples', [head, wingL, wingR, ...ruff]);
  }
  addPart('condor-temple-walls', 'Condor temple walls and altar', 'temples', [
    box(19, 37, 0, 2.6, 55, 55.8),
    box(37, 37.8, 0, 2.6, 55, 70),
    box(26.6, 29.4, 0, 1.1, 57.6, 59.6),
  ]);
}

// --- Ritual stones (3 parts) ---
{
  const CX = -32, CZ = -75;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector2(0.9 - 0.55 * Math.pow(t, 1.4) + 0.25 * Math.sin(t * Math.PI), 8 + t * 1.7));
  }
  const stone = new THREE.LatheGeometry(pts, 10);
  stone.translate(CX, 0, CZ);
  addPart('intihuatana-stone', 'Intihuatana ritual stone', 'ritual-stones', [stone]);
  addPart('intihuatana-terrace', 'Intihuatana knoll and platform', 'ritual-stones', [
    cyl(7.5, 10, 8, CX, 4, CZ, 10),
    cyl(5.2, 5.6, 0.6, CX, 8.3, CZ, 10),
  ]);
  const geoms = [];
  for (const [dx, dz, w] of [[0, -0.8, 0.3], [0, 0.8, 0.3], [-0.5, 0, 0.3], [0.5, 0, 0.3], [0, 0, 0.45]]) {
    geoms.push(box(62 + dx - w / 2, 62 + dx + w / 2, 0, 0.7, -4 + dz - w / 2, -4 + dz + w / 2));
  }
  addPart('southern-cross', 'Southern Cross sculpture', 'ritual-stones', geoms);
}

// --- Terraces (4 parts) ---
{
  const westA = [], westB = [], south = [];
  for (let i = 0; i < 8; i++) {
    const x0 = -92 - i * 6, x1 = -86 - i * 6, y = -2 - i * 2.2;
    const wall = box(x0 - 0.8, x0, y - 2.2, y, -100, 60);
    const plat = box(x0, x1, y - 0.4, y, -100, 60);
    (i < 4 ? westA : westB).push(wall, plat);
  }
  for (let j = 0; j < 3; j++) {
    const z0 = 100 + j * 14, z1 = 108 + j * 14, y = -2 - j * 2;
    south.push(box(-50, 50, y - 2, y, z0 - 0.8, z0));
    south.push(box(-50, 50, y - 0.4, y, z0, z1));
  }
  addPart('terraces-west-north', 'West terraces, upper group', 'terraces', westA);
  addPart('terraces-west-south', 'West terraces, lower group', 'terraces', westB);
  addPart('terraces-south', 'South terraces', 'terraces', south);
}

// --- Residential (7 parts) ---
{
  const walls = [], roofs = [];
  for (const [x, z] of [[64, -32], [64, -22], [64, -42]]) {
    walls.push(
      box(x - 3, x + 3, 0, 2.6, z - 2, z + 2),
      box(x - 3, x - 2.2, 0, 2.0, z - 0.7, z + 0.7),
      box(x + 2.2, x + 3, 0, 2.0, z - 0.7, z + 0.7),
    );
    roofs.push(gableRoof(x, z, 7, 5, 2.6, 1.6));
  }
  addPart('elite-houses', 'Elite houses', 'residential', walls);
  addPart('elite-house-roofs', 'Elite house thatched roofs', 'residential', roofs);
  const rows = [], rowRoofs = [];
  for (const [x, z0, z1] of [[56, 8, 28], [56, 38, 54]]) {
    rows.push(box(x - 2.5, x + 2.5, 0, 2.3, z0, z1));
    rowRoofs.push(
      gableRoof(x, (z0 + z1) / 2 - 3, 6, (z1 - z0) / 2 - 1, 2.3, 1.4),
      gableRoof(x, (z0 + z1) / 2 + 3, 6, (z1 - z0) / 2 - 1, 2.3, 1.4),
    );
  }
  addPart('commoner-house-rows', 'Commoner house rows', 'residential', rows);
  addPart('commoner-house-roofs', 'Commoner house thatched roofs', 'residential', rowRoofs);
  addPart('storehouses', 'Storehouses (colcas)', 'residential', [
    box(42, 46, 0, 2.2, 84, 88),
    gableRoof(44, 86, 4.6, 4.6, 2.2, 1.1),
    box(50, 54, 0, 2.2, 84, 88),
    gableRoof(52, 86, 4.6, 4.6, 2.2, 1.1),
  ]);
  addPart('residential-courtyard', 'Residential courtyard walls', 'residential', [
    box(58, 70, 0, 1.4, -48, -47.4),
    box(58, 70, 0, 1.4, -14, -13.4),
    box(50, 52, -0.2, 0, -50, 60),
  ]);
}

// --- Water (4 parts) ---
{
  const fountain = (x, z, y, tall = 1.2) => [
    box(x - 1.6, x + 1.6, y, y + 0.3, z - 1.6, z + 1.6),
    box(x - 1.6, x - 1.2, y + 0.3, y + tall, z - 1.6, z + 1.6),
    box(x + 1.2, x + 1.6, y + 0.3, y + tall, z - 1.6, z + 1.6),
    box(x - 1.2, x + 1.2, y + 0.3, y + tall, z + 1.2, z + 1.6),
    box(x - 0.2, x + 0.2, y + tall, y + tall + 0.5, z - 1.6, z - 1.2),
  ];
  addPart('royal-fountain', 'Royal fountain', 'water', fountain(8, -2, 0));
  const cascade = [];
  for (const [x, z, y] of [[12, 4, -1.6], [16, 10, -3.2], [20, 16, -4.8], [24, 22, -6.4]]) {
    cascade.push(...fountain(x, z, y));
  }
  addPart('fountain-cascade', 'Fountain cascade', 'water', cascade);
  addPart('condor-fountain', 'Condor temple private fountain', 'water', fountain(20, 54, -7, 2.2));
  const channel = [];
  for (let i = 0; i < 10; i++) {
    const x = -12 + i * 2;
    const z = -62 + i * 6.4;
    const y = 6 - i * 0.75;
    channel.push(box(x - 0.3, x + 0.3, y - 0.2, y, z - 0.15, z + 0.15));
  }
  addPart('spring-channel', 'Spring supply channel', 'water', channel);
}

// --- Setting (8 parts) ---
addPart('sacred-plaza', 'Sacred Plaza', 'setting', [box(32, 52, -0.4, 0, -34, -19)]);
addPart('central-plaza', 'Central Plaza', 'setting', [box(26, 51, -0.4, 0, 12, 34)]);
addPart('main-gate', 'Main Gate and perimeter walls', 'setting', [
  box(-3, 3, 0, 2.6, -160, -159.2),
  box(-60, 60, 0, 2.2, -160, -159.4),
  box(70, 70.6, 0, 2.2, -100, 60),
]);
addPart('guardhouse', 'Guardhouse', 'setting', [
  box(-48, -42, 3, 5.6, -128, -124),
  gableRoof(-45, -126, 7, 5, 5.6, 1.6),
]);
addPart('sun-gate', 'Sun Gate (Intipunku)', 'setting', [
  box(22, 28, 5.4, 8, -166, -165.2),
  box(22, 22.8, 5.4, 7.4, -166, -163),
  box(27.2, 28, 5.4, 7.4, -166, -163),
]);
addPart('ridge-platform', 'Ridge platform', 'setting', [
  box(-75, 75, -8, 0, -170, 170),
]);
{
  const g1 = new THREE.ConeGeometry(48, 72, 12);
  g1.translate(0, 36, 232);
  const g2 = new THREE.ConeGeometry(30, 88, 10);
  g2.translate(-8, 44, -252);
  addPart('mountain-peaks', 'Machu Picchu and Huayna Picchu', 'setting', [g1, g2]);
}
addPart('urubamba-river', 'Urubamba River', 'setting', [
  box(-140, -100, -9, -7.5, 120, 240),
]);

// ---------------------------------------------------------------- colors
// Schematic light stone palette; the Eiffel Tower is the only dark
// realistic model in the atlas.
function colorFor(id) {
  if (id.startsWith('sun-temple')) return '#ddd6c6';
  if (id === 'royal-tomb') return '#8f887a';
  if (id === 'three-windows-temple' || id === 'three-windows-windows') return '#d8d2c0';
  if (id.startsWith('main-temple')) return '#d5cdb8';
  if (id.startsWith('condor')) return '#cdc5b0';
  if (id === 'intihuatana-stone') return '#b8ae97';
  if (id === 'intihuatana-terrace') return '#cfc9ba';
  if (id === 'southern-cross') return '#c9bfa8';
  if (id.startsWith('terraces')) return '#a9bd8f';
  if (id === 'elite-houses' || id === 'commoner-house-rows' || id === 'storehouses' || id === 'residential-courtyard') return '#d9cfbb';
  if (id.endsWith('-roofs')) return '#9d8f6e';
  if (id === 'royal-fountain' || id === 'fountain-cascade' || id === 'condor-fountain' || id === 'spring-channel') return '#a9c3cf';
  if (id === 'sacred-plaza' || id === 'central-plaza') return '#c4bca9';
  if (id === 'main-gate') return '#b9b09a';
  if (id === 'guardhouse') return '#d9cfbb';
  if (id === 'sun-gate') return '#b9b09a';
  if (id === 'ridge-platform') return '#9aa78c';
  if (id === 'mountain-peaks') return '#8fa08a';
  if (id === 'urubamba-river') return '#9fb9c8';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'temples', name: 'Temples', color: '#ddd6c6', description: 'The key temples of the upper Sacred Sector: the Temple of the Sun with its semicircular ashlar wall, the Royal Tomb below it, the Temple of the Three Windows, the Main Temple, and the Temple of the Condor.' },
  { id: 'ritual-stones', name: 'Ritual stones', color: '#cfc9ba', description: 'The carved stones that anchored Inca ritual: the Intihuatana, the "hitching post of the sun", carved from the bedrock, and the Southern Cross sculpture by the Main Temple.' },
  { id: 'terraces', name: 'Agricultural terraces', color: '#a9bd8f', description: 'Stone retaining walls and planting platforms stepping down the west and south slopes, keeping the mountain dry and stable while growing its crops.' },
  { id: 'residential', name: 'Residential sector', color: '#d9cfbb', description: 'Elite houses, commoner house rows and ventilated storehouses (colcas) with reconstructed thatched gable roofs; every doorway and window is trapezoidal.' },
  { id: 'water', name: 'Water', color: '#a9c3cf', description: 'The Stairway of Fountains in schematic form: the royal fountain first, the cascade, the private fountain of the Temple of the Condor, and the spring supply channel.' },
  { id: 'setting', name: 'Setting', color: '#9aa78c', description: 'The Sacred and Central Plazas, the Main Gate, the Guardhouse, the Sun Gate (Intipunku), and the mountain saddle at 2,430 m between Machu Picchu mountain and Huayna Picchu. Context geometry only.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'temple of the sun': 'The Intiwasi: the only Inca construction with a semicircular shape, a curved wall of finely polished ashlar about 10.5 m across, built on a natural granite rock. The curve is unique in Machu Picchu and rare in the Inca Empire. Exact coursing is schematic.',
  'sun temple solstice windows': 'The three windows of the Temple of the Sun: one facing north and two facing east, aligned to the winter solstice (21 June) and summer solstice (22 December) sunrises. Exact openings are schematic.',
  'sun temple altar rock': 'The natural granite rock the Temple of the Sun stands on, its interior dominated by carved altar sections for ceremonies honoring the Sun God Inti. Rock massing is schematic.',
  'royal tomb': 'The natural cave beneath the Temple of the Sun, enhanced with carved walls, niches, an altar and a throne-like carving for the highest-ranking dead. No mummies were found when Bingham arrived in 1911. Exact interior is schematic.',
  'temple of the three windows': 'The 10 by 8 m chamber in the Hanan sector built of some of the largest stone blocks in the citadel. Exact block sizes are schematic.',
  'three windows openings': 'The three east-facing trapezoidal windows, marking the winter solstice, summer solstice and equinox, and the three Inca worlds: Hanan-Pacha, Kay-Pacha and Ukju-Pacha. Exact openings are schematic.',
  'main temple': 'The Principal Temple: three walls 11 m long by 8 m wide with walls 90 cm thick, seven niches in the central wall and five in each side wall. Its west corner is damaged by earthquake and water leaks. Holes for roof beams survive but there is no evidence it was ever roofed. Exact coursing is schematic.',
  'main temple altar rock': 'The large partially carved rock about 10 m ahead of the Main Temple, thought to have served as a sacrificial altar. Exact carving is schematic.',
  'temple of the condor': 'The condor carved from living rock: the flat triangular head stone with carved eyes and beak, the semicircular ruff stones, and the two outstretched wing rocks. The head stone may have served as a sacrificial altar. Exact carving is schematic.',
  'condor temple walls and altar': 'The enclosing walls of the Temple of the Condor and the altar stone before the condor head. The complex includes grottos and subterranean passageways. Exact wall lines are schematic.',
  'intihuatana ritual stone': 'The Intihuatana, the "hitching post of the sun": a ritual stone carved directly from the mountain bedrock, commonly described as about 1.70 m high with an 8.60 m perimeter. Its carved planes are linked to shadows, solar movement and ritual timing. Exact carving is schematic.',
  'intihuatana knoll and platform': 'The bedrock knoll and platform of the Intihuatana in the upper Sacred Sector, at about 3,126 m. Exact massing is schematic.',
  'southern cross sculpture': 'The small stone sculpture depicting the Southern Cross constellation beside the Main Temple, casting a llama-head shadow at the winter solstice. Exact form is schematic.',
  'west terraces, upper group': 'Agricultural terraces on the west slope: stone retaining walls and planting platforms whose layered fills carry subsurface water to the drains. Terrace counts and widths are schematic.',
  'west terraces, lower group': 'Agricultural terraces on the lower west slope. Terrace counts and widths are schematic.',
  'south terraces': 'Agricultural terraces on the south slope. Terrace counts and widths are schematic.',
  'elite houses': 'Elite stone houses with trapezoidal doorways. Exact house sizes are schematic.',
  'elite house thatched roofs': 'Reconstructed thatched gable roofs of the elite houses. Roofs are shown as reconstructed; exact pitch is schematic.',
  'commoner house rows': 'Commoner house rows in the residential quarter. Exact house counts are schematic.',
  'commoner house thatched roofs': 'Reconstructed thatched gable roofs of the commoner houses. Exact pitch is schematic.',
  'storehouses (colcas)': 'Ventilated storehouses (colcas) for food and resource preservation. Exact sizes are schematic.',
  'residential courtyard walls': 'Courtyard walls and paths of the residential quarter. Exact layout is schematic.',
  'royal fountain': 'The first of the Stairway of Fountains, adjacent to the emperor residence, symbolizing the ruler privileged access to water. Machu Picchu 16 fountains cascade with a total drop of about 26 m. Exact fountain position is schematic.',
  'fountain cascade': 'The modeled Stairway of Fountains cascading down the slope; water from one fountain spills into the next. Exact positions are schematic.',
  'condor temple private fountain': 'The private fountain of the Temple of the Condor, the lowest fountain, enclosed by higher walls than the others. Exact position is schematic.',
  'spring supply channel': 'The stone-lined canal from the mountain spring, about 749 m long at about a 3% slope, feeding the fountains by gravity. Exact channel line is schematic.',
  'sacred plaza': 'The Sacred Plaza, the ceremonial heart flanked by temples. Exact plaza extent is schematic.',
  'central plaza': 'The broad grassy Central Plaza, once used for public gatherings and rituals, separating the ceremonial buildings from the housing below. Exact plaza extent is schematic.',
  'main gate and perimeter walls': 'The Main Gate, the single guarded entrance to the citadel behind its stone wall. Exact gate position is schematic.',
  'guardhouse': 'The Guardhouse overlooking the terraces and main entrance, thought to be used for surveillance and signaling. Exact position is schematic.',
  'sun gate (intipunku)': 'The Sun Gate (Intipunku), the Inca Trail entrance at the far end of the citadel. Exact position is schematic.',
  'ridge platform': 'The flattened mountain ridge the city stands on, rising some 650 m above the Urubamba River canyon. Context geometry only.',
  'machu picchu and huayna picchu': 'Machu Picchu mountain (2,795 m) and Huayna Picchu (2,667 m), the peaks sheltering the saddle at 2,430 m. Context geometry only.',
  'urubamba river': 'The Urubamba River far below in its deep canyon. Context geometry only.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract (same as the other generators): per part, 4-byte
// aligned Float32 positions, Int16 normals and Uint32 indices in one
// binary chunk; atlas.json carries byte offsets, bounds, explanations,
// concepts and triangles. Parts carry an optional color that overrides the
// system color in the viewer.
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const normalized = p.geoms.map((g) => {
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  });
  const merged = mergeGeometries(normalized, false);
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
  const align4 = (n) => (n + 3) & ~3; // keep every section 4-byte aligned for typed-array views
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
const binName = 'machu-picchu-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the machu-picchu-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Machu Picchu, Peru - key structures (simplified schematic)',
  title: 'Machu Picchu',
  location: 'Cusco Region, Peru',
  blurb: 'The 15th-century Inca citadel on a 2,430 m mountain ridge, in simplified schematic form: the Temple of the Sun, the Royal Tomb, the Intihuatana, the Temple of the Three Windows, the Main Temple, the Temple of the Condor, the Stairway of Fountains, agricultural terraces, and the residential sector in outline. This model covers the key structures, not the whole mountain.',
  sourceUrls: [
    { label: 'Wikipedia: Machu Picchu', url: 'http://en.wikipedia.org/wiki/Machu_Picchu' },
    { label: 'Smarthistory: Machu Picchu, c. 1450-1540', url: 'https://human.libretexts.org/Bookshelves/Art/Art_History_and_Theory/SmartHistory_of_Art_2e/SmartHistory_of_Art_XIa_-_Th%E2%80%A6/4.2.13.7%253A%2bMachu%2bPicchu.pdf' },
    { label: 'The Only Peru Guide: Temple of the Sun / Intiwasi', url: 'https://www.theonlyperuguide.com/peru-guide/machu-picchu/highlights/temple-sun-intiwasi/' },
    { label: 'Kenneth R. Wright: Water Supply and Drainage at Machu Picchu', url: 'http://www.waterhistory.org/histories/machu/machu.pdf' },
    { label: 'UNEP-WCMC: Historic Sanctuary of Machu Picchu', url: 'http://world-heritage-datasheets.unep-wcmc.org/datasheet/output/site/historic-sanctuary-of-machu-picchu/' },
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
  chunks: [{ url: '/models/machu-picchu-simple/machu-picchu-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
