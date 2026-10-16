// Procedural Rijksmuseum for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Rijksmuseum in code and
// writes it in the atlas binary format:
//   public/models/rijksmuseum/atlas.json
//   public/models/rijksmuseum/rijksmuseum-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// primarily Wikipedia "Rijksmuseum" and "Pierre Cuypers"):
//   designed by Pierre Cuypers, commission won 1876, construction began
//   1876, opened 1885; combines Gothic and Renaissance forms (Max Rooses
//   1885: Gothic church motifs like towers and circular windows with
//   Renaissance civic motifs like rectangular windows, roofs, dormers);
//   controversial as too Gothic/medieval/Catholic for a national museum;
//   King William III refused the opening ("I will not set foot in that
//   monastery"); two squares with an atrium in each centre; central axis
//   tunnel with entrances at ground level and the Gallery of Honour at
//   the first floor; building also contains a library; fragment building
//   (Philips wing) shows Dutch architectural history; rijksmonument
//   since 1970; 80 galleries after the 2003-2013 Cruz y Ortiz renovation
//   (reopened 13 April 2013); Asian pavilion by Cruz y Ortiz opened 2013;
//   red brick facade with stone detailing, decorative gables, ornate
//   central tower; 30,000 sqm total area (renovation project data).
// Schematic (not sourced, never stated as fact in the UI): exact
// footprint (modeled 150 m long, 24 m deep, 22 m to the eaves); tower
// heights and positions; all bay divisions, window positions and sizes;
// gable, dormer and chimney counts and forms; passage dimensions; atrium
// and gallery layouts; library, Philips wing and Asian pavilion forms.
//
// Coordinate frame: x = lateral (east +x), z = depth (south/Museumplein
// front is +z), y = up. All dimensions in meters.
//
// Granularity: ~102 named parts across 9 systems.
//
// Usage: node scripts/generate-rijksmuseum.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'rijksmuseum');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~150 m) maps to 2.4 units.
const S = 2.4 / 150;

// ---------------------------------------------------------------- helpers
function strut(a, b, w, d = w) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, d);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(va.x, va.y, va.z);
  return g;
}
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
// Triangular gable prism.
function gable(x0, x1, y0, yApex, z0, z1) {
  const xm = (x0 + x1) / 2;
  const v = new Float32Array([
    x0, y0, z0, x1, y0, z0, xm, yApex, z0,
    x0, y0, z1, x1, y0, z1, xm, yApex, z1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const L = 75;   // half-length (150 m)
const D = 12;   // half-depth (24 m)
const EAVE = 22; // eaves height

// --- Facades: bays along the long south and north fronts, plus ends.
// South (Museumplein) front: 9 bays.
for (let b = 0; b < 9; b++) {
  const x0 = -L + b * (2 * L / 9), x1 = -L + (b + 1) * (2 * L / 9);
  const gs = [box(x0, x1, 0, EAVE, D - 1.2, D)];
  // Windows: two rows.
  for (const y of [7, 14]) {
    for (let w = 0; w < 3; w++) {
      const wx = x0 + (w + 0.5) * (x1 - x0) / 3;
      gs.push(box(wx - 0.9, wx + 0.9, y, y + 3.2, D - 0.3, D + 0.15));
    }
  }
  addPart(`south-bay-${b + 1}`, `South bay ${b + 1}`, 'facades', gs);
}
// North front: 9 bays.
for (let b = 0; b < 9; b++) {
  const x0 = -L + b * (2 * L / 9), x1 = -L + (b + 1) * (2 * L / 9);
  const gs = [box(x0, x1, 0, EAVE, -D, -D + 1.2)];
  for (const y of [7, 14]) {
    for (let w = 0; w < 3; w++) {
      const wx = x0 + (w + 0.5) * (x1 - x0) / 3;
      gs.push(box(wx - 0.9, wx + 0.9, y, y + 3.2, -D - 0.15, -D + 0.3));
    }
  }
  addPart(`north-bay-${b + 1}`, `North bay ${b + 1}`, 'facades', gs);
}
// East and west ends: 3 bays each.
for (let b = 0; b < 3; b++) {
  const z0 = -D + b * (2 * D / 3), z1 = -D + (b + 1) * (2 * D / 3);
  addPart(`east-bay-${b + 1}`, `East bay ${b + 1}`, 'facades', [
    box(L - 1.2, L, 0, EAVE, z0, z1),
    box(L - 0.3, L + 0.15, 7, 10.2, (z0 + z1) / 2 - 0.9, (z0 + z1) / 2 + 0.9),
    box(L - 0.3, L + 0.15, 14, 17.2, (z0 + z1) / 2 - 0.9, (z0 + z1) / 2 + 0.9),
  ]);
  addPart(`west-bay-${b + 1}`, `West bay ${b + 1}`, 'facades', [
    box(-L, -L + 1.2, 0, EAVE, z0, z1),
    box(-L - 0.15, -L + 0.3, 7, 10.2, (z0 + z1) / 2 - 0.9, (z0 + z1) / 2 + 0.9),
    box(-L - 0.15, -L + 0.3, 14, 17.2, (z0 + z1) / 2 - 0.9, (z0 + z1) / 2 + 0.9),
  ]);
}
// Stone bands.
addPart('stone-band-lower', 'Lower stone band', 'facades', [
  box(-L - 0.2, L + 0.2, 5.5, 6.2, -D - 0.2, D + 0.2),
]);
addPart('stone-band-upper', 'Upper stone band', 'facades', [
  box(-L - 0.2, L + 0.2, 18.5, 19.2, -D - 0.2, D + 0.2),
]);

// --- Central passage: the famous tunnel through the building.
addPart('passage-vault', 'Passage vault', 'passage', [
  box(-6, 6, 0, 9, -D, D),
]);
addPart('passage-south-arch', 'Passage south arch', 'passage', [
  box(-7.5, -6, 0, 10, D - 0.5, D + 0.8),
  box(6, 7.5, 0, 10, D - 0.5, D + 0.8),
  (() => { const a = new THREE.CylinderGeometry(7.5, 7.5, 1.3, 16, 1, false, 0, Math.PI); a.rotateX(Math.PI / 2); a.translate(0, 10, D + 0.15); return a; })(),
]);
addPart('passage-north-arch', 'Passage north arch', 'passage', [
  box(-7.5, -6, 0, 10, -D - 0.8, -D + 0.5),
  box(6, 7.5, 0, 10, -D - 0.8, -D + 0.5),
  (() => { const a = new THREE.CylinderGeometry(7.5, 7.5, 1.3, 16, 1, false, 0, Math.PI); a.rotateX(Math.PI / 2); a.rotateY(Math.PI); a.translate(0, 10, -D - 0.15); return a; })(),
]);
addPart('passage-floor', 'Passage floor', 'passage', [
  box(-6, 6, 0, 0.4, -D, D),
]);

// --- Towers: ornate central tower + 4 corner towers.
addPart('central-tower-shaft', 'Central tower shaft', 'towers', [
  box(-6, 6, EAVE, 38, -6, 6),
]);
addPart('central-tower-belfry', 'Central tower belfry', 'towers', [
  box(-5, 5, 38, 44, -5, 5),
  box(-2, 2, 39, 43, 5 - 0.3, 5 + 0.3),
  box(-2, 2, 39, 43, -5 - 0.3, -5 + 0.3),
]);
addPart('central-tower-spire', 'Central tower spire', 'towers', [
  cyl(0.2, 5.5, 10, 0, 49, 0, 8),
]);
addPart('central-tower-clock', 'Central tower clock', 'towers', [
  (() => { const d = new THREE.CylinderGeometry(1.8, 1.8, 0.4, 16); d.rotateX(Math.PI / 2); d.translate(0, 41, 5.2); return d; })(),
]);
const CORNERS = [[-L + 6, D - 6, 'southwest'], [L - 6, D - 6, 'southeast'], [-L + 6, -D + 6, 'northwest'], [L - 6, -D + 6, 'northeast']];
for (const [cx, cz, cn] of CORNERS) {
  addPart(`${cn}-tower-shaft`, `${cn[0].toUpperCase()}${cn.slice(1)} tower shaft`, 'towers', [
    box(cx - 4, cx + 4, 0, 30, cz - 4, cz + 4),
  ]);
  addPart(`${cn}-tower-belfry`, `${cn[0].toUpperCase()}${cn.slice(1)} tower belfry`, 'towers', [
    box(cx - 3.5, cx + 3.5, 30, 35, cz - 3.5, cz + 3.5),
  ]);
  addPart(`${cn}-tower-spire`, `${cn[0].toUpperCase()}${cn.slice(1)} tower spire`, 'towers', [
    cyl(0.15, 4, 7, cx, 38.5, cz, 8),
  ]);
}

// --- Roofs and gables.
for (let b = 0; b < 4; b++) {
  const x0 = -L + b * (2 * L / 4);
  addPart(`roof-section-${b + 1}`, `Roof section ${b + 1}`, 'roofs', [
    box(x0, x0 + 2 * L / 4, EAVE, EAVE + 0.8, -D, D),
    (() => { const r = box(x0, x0 + 2 * L / 4, 0, 6, -D * 0.96, D * 0.96); r.translate(0, 0, 0); return r; })(),
  ]);
}
const GABLE_X = [-60, -36, -12, 12, 36, 60];
GABLE_X.forEach((gx, i) => {
  addPart(`gable-${i + 1}`, `Decorative gable ${i + 1}`, 'roofs', [
    gable(gx - 5, gx + 5, EAVE, EAVE + 7, D - 1.5, D + 0.5),
  ]);
});
for (let i = 0; i < 6; i++) {
  const dx = -50 + i * 20;
  addPart(`dormer-${i + 1}`, `Dormer ${i + 1}`, 'roofs', [
    box(dx - 2, dx + 2, EAVE + 1, EAVE + 4, -1.5, 1.5),
    gable(dx - 2, dx + 2, EAVE + 4, EAVE + 6, -1.5, 1.5),
  ]);
}
for (let i = 0; i < 4; i++) {
  addPart(`chimney-${i + 1}`, `Chimney ${i + 1}`, 'roofs', [
    box(-55 + i * 35 - 0.8, -55 + i * 35 + 0.8, EAVE + 2, EAVE + 7, -3, -1.4),
  ]);
}

// --- Atriums: two interior courtyards.
for (const [an, ax] of [['west', -37.5], ['east', 37.5]]) {
  addPart(`${an}-atrium-floor`, `${an[0].toUpperCase()}${an.slice(1)} atrium floor`, 'atriums', [
    box(ax - 15, ax + 15, 0, 0.5, -8, 8),
  ]);
  const col = [];
  for (let c = 0; c < 6; c++) {
    col.push(cyl(0.4, 0.45, 12, ax - 12 + c * 4.8, 6, -7, 8));
    col.push(cyl(0.4, 0.45, 12, ax - 12 + c * 4.8, 6, 7, 8));
  }
  addPart(`${an}-atrium-colonnade`, `${an[0].toUpperCase()}${an.slice(1)} atrium colonnade`, 'atriums', col);
}

// --- Interiors: Gallery of Honour + library.
addPart('gallery-of-honour', 'Gallery of Honour', 'interiors', [
  box(-L + 5, L - 5, 10, 11, -2, 2),
]);
addPart('library-block', 'Library block', 'interiors', [
  box(-L - 2, -L + 18, 0, 16, -D - 14, -D - 1),
]);
addPart('library-reading-room', 'Library reading room', 'interiors', [
  box(-L + 2, -L + 14, 4, 12, -D - 12, -D - 3),
]);
addPart('library-tower', 'Library tower', 'interiors', [
  box(-L + 6, -L + 12, 16, 28, -D - 10, -D - 4),
  cyl(0.1, 3.5, 5, -L + 9, 30.5, -D - 7, 8),
]);

// --- Decoration: sculptures, tile panels, stained glass.
for (let i = 0; i < 4; i++) {
  const sx = -45 + i * 30;
  addPart(`facade-sculpture-${i + 1}`, `Facade sculpture ${i + 1}`, 'decoration', [
    cyl(0.5, 0.7, 2.5, sx, 20, D + 0.6, 8),
    new THREE.SphereGeometry(0.4, 8, 6).translate(sx, 21.5, D + 0.6),
  ]);
}
for (let i = 0; i < 4; i++) {
  const tx = -52.5 + i * 35;
  addPart(`tile-panel-${i + 1}`, `Tile picture ${i + 1}`, 'decoration', [
    box(tx - 4, tx + 4, 8, 13, D - 0.15, D + 0.2),
  ]);
}
for (let i = 0; i < 6; i++) {
  const wx = -50 + i * 20;
  addPart(`stained-glass-${i + 1}`, `Stained glass window ${i + 1}`, 'decoration', [
    box(wx - 1.2, wx + 1.2, 12, 18, -D - 0.15, -D + 0.2),
  ]);
}

// --- Wings: Philips wing, Asian pavilion, garden.
addPart('philips-wing', 'Philips wing', 'wings', [
  box(20, 60, 0, 10, -D - 16, -D - 2),
  box(38, 42, 10, 16, -D - 16, -D - 2),
]);
addPart('asian-pavilion', 'Asian pavilion', 'wings', [
  box(30, 50, 0, 6, D + 8, D + 20),
]);
addPart('museum-garden', 'Museum garden', 'wings', [
  box(-L, L, 0, 0.3, D + 2, D + 30),
]);

// --- Entrances.
addPart('main-entrance-south', 'Main entrance (south)', 'entrances', [
  box(-4, 4, 0, 6, D - 0.5, D + 1.5),
  box(-5, 5, 6, 7, D - 0.5, D + 1.5),
]);
addPart('main-entrance-north', 'Main entrance (north)', 'entrances', [
  box(-4, 4, 0, 6, -D - 1.5, -D + 0.5),
]);
addPart('foundation', 'Foundation', 'entrances', [
  box(-L, L, -2, 0, -D, D),
]);
// --- Extra facade articulation to complete the street walls.
for (let i = 0; i < 4; i++) {
  const sx = -52.5 + i * 35;
  addPart(`north-sculpture-${i + 1}`, `North facade sculpture ${i + 1}`, 'decoration', [
    cyl(0.5, 0.7, 2.5, sx, 20, -D - 0.6, 8),
    new THREE.SphereGeometry(0.4, 8, 6).translate(sx, 21.5, -D - 0.6),
  ]);
}
for (let i = 0; i < 4; i++) {
  const gx = -45 + i * 30;
  addPart(`gable-figure-${i + 1}`, `Gable figure ${i + 1}`, 'decoration', [
    cyl(0.4, 0.55, 2, gx, EAVE + 7.5, D + 0.2, 8),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('stained-glass')) return '#3a6a8a';
  if (id.includes('tile-panel')) return '#7a8a9a';
  if (id.includes('sculpture')) return '#8f8578';
  if (id.includes('tower-spire')) return '#4a5a6a';
  if (id.includes('tower')) return '#a8442a';
  if (id.includes('gable') || id.includes('dormer')) return '#8a3a24';
  if (id.includes('roof')) return '#5a4a3a';
  if (id.includes('chimney')) return '#8a5a4a';
  if (id.includes('passage')) return '#6a5a4a';
  if (id.includes('atrium')) return '#b8a888';
  if (id.includes('gallery') || id.includes('library')) return '#9a8a72';
  if (id.includes('asian-pavilion')) return '#7a8a7a';
  if (id.includes('garden')) return '#5a7a4a';
  if (id.includes('stone-band')) return '#c9bfa5';
  if (id.includes('entrance')) return '#6a4a3a';
  return '#a8442a';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facades', name: 'Facades', color: '#a8442a', description: 'Red brick facades in bays with stone bands, combining Gothic and Renaissance motifs.' },
  { id: 'passage', name: 'Central passage', color: '#6a5a4a', description: 'The public tunnel through the building\u2019s central axis, open to cyclists and pedestrians.' },
  { id: 'towers', name: 'Towers', color: '#a8442a', description: 'The ornate central tower and four corner towers.' },
  { id: 'roofs', name: 'Roofs and gables', color: '#5a4a3a', description: 'Roof sections, decorative gables, dormers and chimneys.' },
  { id: 'atriums', name: 'Atriums', color: '#b8a888', description: 'The two interior courtyards at the centre of each square.' },
  { id: 'interiors', name: 'Interiors', color: '#9a8a72', description: 'The Gallery of Honour and the library.' },
  { id: 'decoration', name: 'Decoration', color: '#8f8578', description: 'Sculptures, tile pictures, and stained glass.' },
  { id: 'wings', name: 'Wings and garden', color: '#7a8a7a', description: 'Philips wing, Asian pavilion and museum garden.' },
  { id: 'entrances', name: 'Entrances', color: '#6a4a3a', description: 'Main entrances and foundation.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let b = 1; b <= 9; b++) {
  explanations[`south bay ${b}`] = `Bay ${b} of the south (Museumplein) facade. Bay divisions and window counts are schematic.`;
  explanations[`north bay ${b}`] = `Bay ${b} of the north facade. Bay divisions and window counts are schematic.`;
}
for (let b = 1; b <= 3; b++) {
  explanations[`east bay ${b}`] = `Bay ${b} of the east end. Exact form is schematic.`;
  explanations[`west bay ${b}`] = `Bay ${b} of the west end. Exact form is schematic.`;
}
Object.assign(explanations, {
  'lower stone band': 'A stone band around the building. Exact position is schematic.',
  'upper stone band': 'A stone band around the building. Exact position is schematic.',
  'passage vault': 'The vaulted public passage through the building\u2019s central axis. Exact dimensions are schematic.',
  'passage south arch': 'The arched south entrance of the passage. Exact form is schematic.',
  'passage north arch': 'The arched north entrance of the passage. Exact form is schematic.',
  'passage floor': 'The floor of the passage, used by cyclists and pedestrians. Exact finish is schematic.',
  'central tower shaft': 'The shaft of the ornate central tower. Exact height is schematic.',
  'central tower belfry': 'The belfry stage of the central tower. Exact form is schematic.',
  'central tower spire': 'The spire crowning the central tower. Exact form is schematic.',
  'central tower clock': 'A clock dial on the central tower. Exact design is schematic.',
  'gallery of honour': 'The Gallery of Honour on the first floor along the central axis, the museum\u2019s ceremonial spine leading to the Night Watch. Exact layout is schematic.',
  'library block': 'The library wing. Exact form is schematic.',
  'library reading room': 'The library\u2019s reading room. Exact interior is schematic.',
  'library tower': 'A tower of the library wing. Exact form is schematic.',
  'philips wing': 'The Philips wing, the fragment building showing Dutch architectural history. Exact form is schematic.',
  'asian pavilion': 'The Asian pavilion by Cruz y Ortiz, opened 2013. Exact form is schematic.',
  'museum garden': 'The museum garden on the south side. Exact layout is schematic.',
  'main entrance (south)': 'The main south entrance. Exact form is schematic.',
  'main entrance (north)': 'The main north entrance. Exact form is schematic.',
  'foundation': 'The building\u2019s foundation. Exact depth is schematic.',
});
for (let b = 1; b <= 4; b++) {
  explanations[`roof section ${b}`] = `Roof section ${b}. Exact roof form is schematic.`;
}
for (let i = 1; i <= 6; i++) {
  explanations[`decorative gable ${i}`] = `A decorative gable on the south front. Exact form is schematic.`;
  explanations[`dormer ${i}`] = `A dormer in the roof. Exact form is schematic.`;
  explanations[`stained glass window ${i}`] = `A stained glass window. Exact design is schematic.`;
}
for (let i = 1; i <= 4; i++) {
  explanations[`chimney ${i}`] = `A chimney. Exact form is schematic.`;
  explanations[`facade sculpture ${i}`] = `A facade sculpture. Cuypers\u2019 design wove sculpture through the architecture. Exact figure is schematic.`;
  explanations[`tile picture ${i}`] = `A tile picture depicting Dutch history, part of Cuypers\u2019 decorative programme. Exact scene is schematic.`;
  explanations[`north facade sculpture ${i}`] = `A sculpture on the north facade. Exact figure is schematic.`;
  explanations[`gable figure ${i}`] = `A figure crowning a decorative gable. Exact figure is schematic.`;
}
for (const cn of ['southwest', 'southeast', 'northwest', 'northeast']) {
  const Cn = cn[0].toUpperCase() + cn.slice(1);
  explanations[`${cn} tower shaft`] = `The shaft of the ${cn} corner tower. Exact height is schematic.`;
  explanations[`${cn} tower belfry`] = `The belfry stage of the ${cn} corner tower. Exact form is schematic.`;
  explanations[`${cn} tower spire`] = `The spire of the ${cn} corner tower. Exact form is schematic.`;
}
for (const an of ['west', 'east']) {
  const An = an[0].toUpperCase() + an.slice(1);
  explanations[`${an} atrium floor`] = `The floor of the ${an.toLowerCase()} interior courtyard. Exact layout is schematic.`;
  explanations[`${an} atrium colonnade`] = `Colonnade around the ${an.toLowerCase()} atrium. Exact form is schematic.`;
}

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
const binName = 'rijksmuseum-0.bin';
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
  scope: 'Rijksmuseum, Amsterdam',
  title: 'Rijksmuseum',
  location: 'Amsterdam, Netherlands',
  blurb: 'Pierre Cuypers\u2019s 1885 national museum: red brick Gothic-Renaissance facades around two atrium courts, a public passage through the middle, and the Gallery of Honour.',
  sourceUrls: [
    { label: 'Wikipedia: Rijksmuseum', url: 'https://en.wikipedia.org/wiki/Rijksmuseum' },
    { label: 'Wikipedia: Pierre Cuypers', url: 'https://en.wikipedia.org/wiki/Pierre_Cuypers' },
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
  chunks: [{ url: '/models/rijksmuseum/rijksmuseum-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
