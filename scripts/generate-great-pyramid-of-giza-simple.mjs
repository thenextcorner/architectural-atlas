// Simplified schematic Great Pyramid of Giza for the Architectural Atlas.
//
// The "simple" variant of the Great Pyramid of Giza: same footprint, massing
// and proportions as the detailed model (see
// scripts/generate-great-pyramid-of-giza.mjs, whose header lists every
// sourced dimension reused here), but coarser: 34 named parts across 7
// systems instead of 100 across 12. Core courses, casing faces, roof slabs
// and temple elements are merged into group parts; ornament and the finer
// passage detail are omitted.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-great-pyramid-of-giza.mjs for the full attribution):
//   built for Pharaoh Khufu, Fourth Dynasty, around 2560 BC; about 20 years;
//   about 20,000 skilled workers in named gangs, not slaves; original height
//   146.6 m, current about 138.8 m; base 230.4 m per side (440 royal cubits),
//   sides differing by a few centimeters, aligned to true north within 0.05
//   degrees; slope about 51 deg 50 min 40 sec; about 2.3 million blocks
//   averaging 2.5 tonnes, largest 80 tonnes, total about 5.75 million tonnes;
//   tallest man-made structure for over 3,800 years; Tura limestone casing up
//   to 2.5 m thick, loosened by a 1301 earthquake and carted away in 1356,
//   surviving in situ around the base; entrance on the north face; descending
//   corridor at about 26.5 degrees; ascending passage 39 m at 26 degrees,
//   about 1.05 m wide and 1.2 m high; Grand Gallery 47 m long, 8.5 m high,
//   seven corbelled tiers, ceiling about 1.04 m wide, ramps with notches,
//   gallery centreline about 7.22 m east of the centre axis; king’s Chamber
//   10.47 x 5.23 m, about 5.85 m high, red Aswan granite from 900 km south,
//   floor about 42.99 m above the base, nine roof slabs of 25 to 40 tonnes,
//   sarcophagus of a single granite piece, lidless and empty; five relieving
//   chambers above, the top one gabled; queen’s Chamber about 5.74 x 5.23 m,
//   4.57 m high, gabled roof, east niche, two blocked 20 cm shafts; king’s
//   air shafts about 59.5 m north and 53.5 m south; subterranean chamber about
//   27 m below the plateau, unfinished; Big Void about 30 m long (2017);
//   north-face corridor 9 m long (2023); mortuary temple 52.2 m by 40 m at
//   the east foot, basalt paving; causeway to the Valley Temple, buried under
//   Nazlet el-Samman and never excavated; the Sphinx belongs to Khafre's
//   complex and is not modeled.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; simplified course, casing and passage profiles; the causeway at
// a partial schematic length; the valley temple in outline at a schematic
// position.
//
// Writes:
//   public/models/great-pyramid-of-giza-simple/atlas.json
//   public/models/great-pyramid-of-giza-simple/great-pyramid-of-giza-simple-0.bin
//
// Usage: node scripts/generate-great-pyramid-of-giza-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'great-pyramid-of-giza-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (500 m, the illustrated site frame)
// maps to 7.2 units (3x the usual fit: keeps the exploded cloud, which lifts
// a fixed +1 world unit, inside the frame).
const S = 7.2 / 500;

const B = 115.2;
const H = 146.6;
const hw = (y) => B * (1 - y / H);

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
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function tube(a, b, w, h) {
  return strut(a, b, w, h);
}
function quadSlab(p0, p1, p2, p3, n, t) {
  const nn = new THREE.Vector3(...n).normalize();
  const off = nn.clone().multiplyScalar(t / 2);
  const P = [p0, p1, p2, p3].map((p) => new THREE.Vector3(...p));
  const f = P.map((p) => p.clone().add(off));
  const b = P.map((p) => p.clone().sub(off));
  const pos = new Float32Array([...f, ...b].flatMap((v) => [v.x, v.y, v.z]));
  let idx = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
  ];
  const e1 = new THREE.Vector3().subVectors(f[1], f[0]);
  const e2 = new THREE.Vector3().subVectors(f[2], f[0]);
  if (new THREE.Vector3().crossVectors(e1, e2).dot(nn) < 0) {
    const flipped = [];
    for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);
    idx = flipped;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function faceSlab(face, y0, y1, t) {
  const a0 = hw(y0);
  const a1 = hw(y1);
  const F = {
    N: { p: [[-a0, y0, -a0], [a0, y0, -a0], [a1, y1, -a1], [-a1, y1, -a1]], n: [0, 0.618, -0.786] },
    S: { p: [[a0, y0, a0], [-a0, y0, a0], [-a1, y1, a1], [a1, y1, a1]], n: [0, 0.618, 0.786] },
    E: { p: [[a0, y0, a0], [a0, y0, -a0], [a1, y1, -a1], [a1, y1, a1]], n: [0.786, 0.618, 0] },
    W: { p: [[-a0, y0, -a0], [-a0, y0, a0], [-a1, y1, a1], [-a1, y1, -a1]], n: [-0.786, 0.618, 0] },
  }[face];
  return quadSlab(F.p[0], F.p[1], F.p[2], F.p[3], F.n, t);
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Stepped core, merged into four course groups: 4 parts.
{
  const bands = [[0, 6, 'lower'], [6, 12, 'middle'], [12, 18, 'upper'], [18, 24, 'apex']];
  for (const [k0, k1, name] of bands) {
    const geoms = [];
    const n = 24, ch = H / n;
    for (let k = k0; k < k1; k++) {
      const y0 = k * ch, y1 = (k + 1) * ch;
      const h = hw(y1) - 0.4;
      geoms.push(box(-h, h, y0, y1, -h, h));
    }
    addPart(`core-courses-${name}`, `Core courses (${name})`, 'pyramid', geoms);
  }
}

// --- Casing: four faces as built, surviving base stones, pyramidion:
// 6 parts.
for (const [face, name] of [['N', 'north'], ['S', 'south'], ['E', 'east'], ['W', 'west']]) {
  addPart(`casing-${name}`, `${name[0].toUpperCase() + name.slice(1)} casing`, 'pyramid', [
    faceSlab(face, 0, 144.5, 2.5),
  ]);
}
addPart('casing-surviving', 'Surviving casing stones', 'pyramid', [
  faceSlab('N', 0, 6, 3.2), faceSlab('S', 0, 6, 3.2),
  faceSlab('E', 0, 6, 3.2), faceSlab('W', 0, 6, 3.2),
]);
{
  const pyr = new THREE.ConeGeometry(1.7, 2.4, 4, 8);
  pyr.rotateY(Math.PI / 4);
  pyr.translate(0, 145.5, 0);
  addPart('pyramidion', 'Pyramidion capstone', 'pyramid', [pyr]);
}

// --- Entrance: portal and chevron blocks merged: 1 part.
{
  const zf = -hw(17);
  const dark = box(-2, 2, 15.5, 18.5, zf - 1.2, zf + 0.2);
  const c1 = strut([-4.5, 20.5, zf - 1.6], [0, 24.5, zf - 1.6], 1.6, 1.2);
  const c2 = strut([4.5, 20.5, zf - 1.6], [0, 24.5, zf - 1.6], 1.6, 1.2);
  addPart('entrance', 'Entrance and chevron blocks', 'entrance', [dark, c1, c2]);
}

// --- Passages: descending, ascending, gallery, antechamber, well shaft:
// 5 parts.
const J = [0, 5.1, -77.9];
addPart('descending-passage', 'Descending passage', 'passages', [
  tube([0, 17, -hw(17)], J, 2.1, 2.4),
  tube(J, [0, -27, -13.5], 2.1, 2.4),
]);
addPart('ascending-passage', 'Ascending passage', 'passages', [
  tube(J, [0, 22.33, -42.6], 2.1, 2.4),
]);
addPart('grand-gallery', 'Grand Gallery', 'passages', [
  tube([0, 22.33, -42.6], [0, 43.06, -0.1], 2.1, 8.6),
]);
addPart('antechamber', 'Antechamber and portcullis slabs', 'passages', [
  box(-1.6, 1.6, 42.99, 46.8, 1.2, 3.8),
  box(-1.05, 1.05, 42.99, 45.4, 1.3, 4.0),
]);
addPart('well-shaft', 'Well shaft', 'passages', [
  strut([0, -2, -55], [0, 22.33, -42.6], 1.2),
]);

// --- Chambers: king’s (walls, floor, roof, sarcophagus), relieving group,
// queen’s, subterranean, air shafts: 10 parts.
const KC = { y: 42.99, w: 10.47, d: 5.23, h: 5.85, z: 8 };
const kx0 = -KC.w / 2, kx1 = KC.w / 2, kz0 = KC.z - KC.d / 2, kz1 = KC.z + KC.d / 2;
addPart('kings-chamber-walls', 'King’s Chamber walls', 'chambers', [
  box(kx0 - 1, kx1 + 1, KC.y, KC.y + KC.h, kz0 - 1, kz0),
  box(kx0 - 1, kx1 + 1, KC.y, KC.y + KC.h, kz1, kz1 + 1),
  box(kx1, kx1 + 1, KC.y, KC.y + KC.h, kz0, kz1),
  box(kx0 - 1, kx0, KC.y, KC.y + KC.h, kz0, kz1),
]);
addPart('kings-chamber-floor', 'King’s Chamber floor', 'chambers', [
  box(kx0, kx1, KC.y - 1, KC.y, kz0, kz1),
]);
{
  const slabs = [];
  for (let i = 0; i < 9; i++) {
    const x0 = kx0 + (i * KC.w) / 9, x1 = kx0 + ((i + 1) * KC.w) / 9;
    slabs.push(box(x0, x1, KC.y + KC.h, KC.y + KC.h + 1.2, kz0 - 1, kz1 + 1));
  }
  addPart('kings-chamber-roof', 'King’s Chamber roof slabs', 'chambers', slabs);
}
addPart('kings-sarcophagus', 'Khufu’s sarcophagus', 'chambers', [
  box(-1.15, 1.15, KC.y, KC.y + 1.05, kz1 - 3.6, kz1 - 1.3),
]);
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    const y0 = KC.y + KC.h + 1.2 + i * 1.9;
    geoms.push(box(kx0 - 0.5, kx1 + 0.5, y0, y0 + 1.5, kz0 - 1.5, kz1 + 1.5));
  }
  addPart('relieving-chambers', 'Relieving chambers', 'chambers', geoms);
}
addPart('kings-air-shafts', 'King’s Chamber air shafts', 'chambers', [
  strut([0, KC.y + 1, kz0], [0, KC.y + 23.7, kz0 - 22.7], 0.45),
  strut([0, KC.y + 23.7, kz0 - 22.7], [0, KC.y + 23.7, -hw(KC.y + 23.7)], 0.45),
  strut([0, KC.y + 1, kz1], [0, KC.y + 21.2, kz1 + 20.2], 0.45),
  strut([0, KC.y + 21.2, kz1 + 20.2], [0, KC.y + 21.2, hw(KC.y + 21.2)], 0.45),
]);
{
  const qy = 21.7, qw = 5.76, qd = 5.23, qh = 4.57, qz = -24;
  const geoms = [
    box(-qw / 2 - 0.8, qw / 2 + 0.8, qy, qy + qh, qz - qd / 2 - 0.8, qz + qd / 2 + 0.8),
  ];
  const r1 = strut([-qw / 2 - 0.8, qy + qh, qz - qd / 2 - 0.8], [0, qy + qh + 2.2, qz - qd / 2 - 0.8], 1.2, 1.4);
  const r2 = strut([qw / 2 + 0.8, qy + qh, qz + qd / 2 + 0.8], [0, qy + qh + 2.2, qz + qd / 2 + 0.8], 1.2, 1.4);
  geoms.push(r1, r2);
  addPart('queens-chamber', 'Queen’s Chamber', 'chambers', geoms);
}
addPart('queens-shafts', 'Queen’s Chamber shafts', 'chambers', [
  strut([0, 24.9, -26.6], [0, 30.7, -38.6], 0.4),
  strut([0, 24.9, -21.4], [0, 30.7, -9.4], 0.4),
]);
addPart('subterranean-chamber', 'Subterranean chamber', 'chambers', [
  box(-8, 8, -34, -26, -1, 11),
]);

// --- Modern discoveries: 2 parts.
addPart('big-void', 'Big Void (ScanPyramids, 2017)', 'discoveries', [
  box(-1, 1, 55, 63, -42, -2),
]);
addPart('north-face-corridor', 'North-face corridor (2023)', 'discoveries', [
  box(-1, 1, 20.5, 22.5, -hw(17) - 11, -hw(17) - 2),
]);

// --- Funerary complex in outline: 3 parts.
addPart('mortuary-temple', 'Mortuary temple', 'funerary-complex', [
  box(B, B + 40, 0, 0.6, -26.1, 26.1),
  box(B, B + 40, 0, 2.5, -26.1, -24.6),
  box(B, B + 40, 0, 2.5, 24.6, 26.1),
  box(B + 2, B + 12, 0, 5, -8, 8),
]);
addPart('causeway', 'Causeway (outline, partial)', 'funerary-complex', [
  box(B + 40, 280, 0, 2.5, -5, 5),
  box(B + 40, 280, 2.5, 4.5, -6.2, -5),
  box(B + 40, 280, 2.5, 4.5, 5, 6.2),
]);
addPart('valley-temple', 'Valley temple (unexcavated, outline)', 'funerary-complex', [
  box(300, 350, 0, 5, -18, 18),
  box(305, 345, 5, 5.5, -13, 13),
]);

// --- Site: 1 part.
addPart('bedrock-platform', 'Leveled bedrock platform', 'site', [
  box(-130, 380, -12, 0, -140, 140),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('core-courses-')) return '#d8cdb4';
  if (id === 'casing-surviving') return '#efe6d0';
  if (id.startsWith('casing-')) return '#f2ede0';
  if (id === 'pyramidion') return '#e6dcc4';
  if (id === 'entrance') return '#6e6257';
  if (id === 'big-void' || id === 'north-face-corridor') return '#5f7a8c';
  if (id === 'antechamber') return '#8a5a52';
  if (id.startsWith('kings-chamber-') || id === 'kings-air-shafts') return '#a0655e';
  if (id === 'kings-sarcophagus') return '#8a4f48';
  if (id === 'relieving-chambers') return '#b08a80';
  if (id === 'queens-chamber' || id === 'queens-shafts') return '#c4b394';
  if (id === 'subterranean-chamber') return '#7a7468';
  if (id === 'mortuary-temple') return '#8a8070';
  if (id === 'causeway') return '#c9c2ae';
  if (id === 'valley-temple') return '#d3cbb6';
  if (id === 'bedrock-platform') return '#b0a890';
  return '#8a8478';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'pyramid', name: 'Pyramid mass', color: '#e4dbc6', description: 'The stepped masonry core and the white Tura limestone casing, shown as built, rising 146.6 m over a 230.4 m square base.' },
  { id: 'entrance', name: 'Entrance', color: '#6e6257', description: 'The original entrance on the north face and its chevron gable blocks.' },
  { id: 'passages', name: 'Passages', color: '#8a8478', description: 'The descending and ascending passages, the 47 m Grand Gallery, the antechamber and the well shaft.' },
  { id: 'chambers', name: 'Chambers', color: '#a0655e', description: 'The King’s Chamber of red Aswan granite with its sarcophagus, the relieving chambers, the Queen’s Chamber and the subterranean chamber.' },
  { id: 'discoveries', name: 'Modern discoveries', color: '#5f7a8c', description: 'Voids found by the ScanPyramids project: the Big Void of 2017 and the north-face corridor of 2023.' },
  { id: 'funerary-complex', name: 'Funerary complex', color: '#b5ad96', description: 'The mortuary temple, causeway and valley temple in outline; the valley temple was never excavated.' },
  { id: 'site', name: 'Bedrock platform', color: '#b0a890', description: 'The leveled bedrock of the Giza plateau on which the pyramid stands.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'core courses (lower)': 'The lower stepped courses of the pyramid core, built of roughly horizontal masonry totaling about 2.3 million blocks averaging 2.5 tonnes. Course count and setback are schematic.',
  'core courses (middle)': 'The middle stepped courses of the pyramid core. Course count and setback are schematic.',
  'core courses (upper)': 'The upper stepped courses of the pyramid core. Course count and setback are schematic.',
  'core courses (apex)': 'The topmost stepped courses of the pyramid core, below the capstone. Course count and setback are schematic.',
  'north casing': 'The north face of the pyramid as built, sheathed in fine white Tura limestone up to 2.5 m thick, loosened by a 1301 earthquake and carted away in 1356 to build mosques and fortresses in Cairo. Shown complete as built.',
  'south casing': 'The south face of the pyramid as built, sheathed in fine white Tura limestone. Shown complete as built.',
  'east casing': 'The east face of the pyramid as built, sheathed in fine white Tura limestone. Shown complete as built.',
  'west casing': 'The west face of the pyramid as built, sheathed in fine white Tura limestone. Shown complete as built.',
  'surviving casing stones': 'Casing stones still in place around the base of the pyramid, showing the original precision fit.',
  'pyramidion capstone': 'The capstone that crowned the pyramid at 146.6 m, long since lost. Exact shape is schematic.',
  'entrance and chevron blocks': 'The original entrance on the north face, with massive chevron gable blocks spreading the load above it. Entrance height above the base is schematic.',
  'descending passage': 'The descending corridor at about 26.5 degrees: one branch continues down to the subterranean chamber, the other turns up the ascending passage. Exact routing is schematic.',
  'ascending passage': 'The ascending passage rises at 26 degrees for 39 m to the Grand Gallery, about 1.05 m wide and 1.2 m high. Exact routing is schematic.',
  'grand gallery': 'The Grand Gallery: a corbelled passage 47 m long and 8.5 m high, rising at 26 degrees, with seven stepped tiers and ramps with notches on both sides.',
  'antechamber and portcullis slabs': 'The small antechamber before the King’s Chamber, with granite slabs that slid down to seal the tomb after the burial. Exact layout is schematic.',
  'well shaft': 'The narrow, near-vertical shaft connecting the lower descending passage with the bottom of the Grand Gallery, likely an escape route for the workers who sealed the tomb. Exact routing is schematic.',
  'king’s chamber walls': 'The walls of the King’s Chamber, 10.47 by 5.23 m, built entirely of red granite from Aswan, some 900 km south, carrying work-gang graffiti naming Khufu.',
  'king’s chamber floor': 'The floor of the King’s Chamber, about 42.99 m above the base of the pyramid.',
  'king’s chamber roof slabs': 'The nine flat granite slabs forming the ceiling of the King’s Chamber, each weighing 25 to 40 tonnes.',
  'khufu’s sarcophagus': 'The sarcophagus of Khufu, hollowed from a single piece of red Aswan granite, placed during construction; found lidless and empty, with no lid ever found.',
  'relieving chambers': 'Five rough chambers stacked above the King’s Chamber, the top one with a pointed gabled roof, spreading the weight of the masonry above. Shown as solid schematic masses.',
  'king’s chamber air shafts': 'The narrow air shafts of the King’s Chamber, about 20 cm square, the northern about 59.5 m and the southern about 53.5 m long, reaching the outer faces. Exact routing is schematic.',
  'queen’s chamber': 'The Queen’s Chamber, about 5.74 by 5.23 m with a gabled roof; despite its name, archaeologists believe it was not meant for a queen. Exact layout is schematic.',
  'queen’s chamber shafts': 'The two narrow shafts of the Queen’s Chamber, about 20 cm wide, which do not reach the surface and are blocked by limestone stones. Exact routing is schematic.',
  'subterranean chamber': 'The subterranean chamber, the largest of the three chambers but totally unfinished, rough-cut in the bedrock about 27 m below the plateau surface. Shown as a solid schematic mass.',
  'big void (scanpyramids, 2017)': 'The Big Void found by the ScanPyramids muon tomography survey in 2017: a cavity about 30 m long above the Grand Gallery. Its purpose is unknown; it has never been entered. Rendered as a schematic mass.',
  'north-face corridor (2023)': 'A 9 m long, 2 by 2 m corridor behind the chevron blocks above the entrance, confirmed by endoscopy in 2023. Exact interior geometry is schematic.',
  'mortuary temple': 'The mortuary temple at the east foot of the pyramid, 52.2 m north to south and 40 m east to west, nearly gone except for black basalt paving. Exact plan is schematic.',
  'causeway (outline, partial)': 'The causeway that linked the mortuary temple with the valley temple near the Nile. Shown in outline at a partial, schematic length.',
  'valley temple (unexcavated, outline)': 'The Valley Temple, buried beneath the village of Nazlet el-Samman; basalt paving and limestone walls have been found, but the site has not been excavated. Rendered in outline at a schematic position.',
  'leveled bedrock platform': 'The leveled bedrock of the Giza plateau on which the pyramid stands. Exact extent is schematic.',
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
const binName = 'great-pyramid-of-giza-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the great-pyramid-of-giza-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Great Pyramid of Giza (Khufu), simplified schematic',
  title: 'Great Pyramid of Giza',
  location: 'Giza, Egypt',
  blurb: 'The tomb of Pharaoh Khufu, built around 2560 BC, in simplified schematic form: the 146.6 m pyramid over its 230.4 m base, the Grand Gallery and the granite King’s Chamber within, and the funerary complex in outline. The Sphinx belongs to Khafre’s complex and is not modeled.',
  sourceUrls: [
    { label: 'Wikipedia: Great Pyramid of Giza', url: 'https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza' },
    { label: 'Wikipedia: Giza pyramid complex', url: 'https://en.wikipedia.org/wiki/Giza_pyramid_complex' },
    { label: 'Smarthistory: Pyramid of Khufu', url: 'https://smarthistory.org/pyramid-of-khufu/' },
    { label: 'Egypt for Travel: What Is Inside the Pyramids', url: 'https://www.egyptfortravel.com/egypt-travel-blog/what-is-inside-the-pyramids' },
    { label: 'Egypt for Travel: How Were the Pyramids Built', url: 'https://www.egyptfortravel.com/egypt-travel-blog/how-were-the-pyramids-built' },
    { label: 'The Daily Galaxy: the Big Void and the north-face corridor', url: 'https://dailygalaxy.com/2026/04/scientists-discover-great-pyramid-giza-hidden-void/' },
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
    bounds: [
r.bounds[0],
      r.bounds[1],
    ],
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/great-pyramid-of-giza-simple/great-pyramid-of-giza-simple-0.bin', bytes: offset }],
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
