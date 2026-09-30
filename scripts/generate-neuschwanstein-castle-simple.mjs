// Procedural Neuschwanstein Castle (Simple variant) for the Architectural Atlas.
//
// Simplified schematic: 36 named parts across 6 systems on the same
// footprint and coordinate frame as the detailed variant. See
// generate-neuschwanstein-castle.mjs and
// ~/workspace/architectural-atlas/research/neuschwanstein-castle-attribution.md
// (opened 2026-09-30) for the sourced dimensions and facts; every concrete
// measurement below comes from those pages, and everything else is marked
// schematic.
//
// Usage: node scripts/generate-neuschwanstein-castle-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'neuschwanstein-castle-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (164 m terrace) maps to 2.4 units.
const S = 2.4 / 164;

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
function cyl(rt, rb, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function prismRoof(x0, x1, zc, halfW, yEave, yRidge) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, yEave);
  shape.lineTo(halfW, yEave);
  shape.lineTo(0, yRidge);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(x0, 0, zc);
  return g;
}
// Half cylinder shell with axis along Y covering the half where x <= 0.
function halfCylXNeg(r, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false, Math.PI, Math.PI);
  g.translate(x, y, z);
  return g;
}
// The posterior (west) Palas wing joins the anterior wing at a flat angle.
// Build its geometry in wing-local coordinates, rotate FIRST, then translate
// to the joint (rotate-before-translate; the reverse flings parts off site).
const POST_A = (12 * Math.PI) / 180;
const POST_J = [-52, 0, 0];
function posterior(geoms) {
  for (const g of geoms) {
    g.rotateY(POST_A);
    g.translate(POST_J[0], POST_J[1], POST_J[2]);
  }
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Gatehouse: 7 parts.
{
  const vault = new THREE.CylinderGeometry(3, 3, 14, 10, 1, true, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  vault.translate(62, 7, 0);
  addPart('gatehouse-body', 'Gatehouse', 'gatehouse', [
    box(55, 69, 0, 14, -10, -3),
    box(55, 69, 0, 14, 3, 10),
    box(55, 69, 10, 14, -3, 3),
  ]);
  addPart('gate-arch', 'Gate arch and doors', 'gatehouse', [
    vault,
    box(60.8, 61.2, 0, 6.5, -2.8, 2.8),
  ]);
}
addPart('gatehouse-red-brick', 'Red brick east facade', 'gatehouse', [
  box(68.7, 69.06, 0, 14, -10, -3),
  box(68.7, 69.06, 0, 14, 3, 10),
  box(68.7, 69.06, 10, 14, -3, 3),
]);
addPart('gatehouse-yellow-limestone', 'Yellow limestone court facade', 'gatehouse', [
  box(54.94, 55.3, 0, 14, -10, -3),
  box(54.94, 55.3, 0, 14, 3, 10),
  box(54.94, 55.3, 10, 14, -3, 3),
]);
{
  const geoms = [];
  for (const z of [-13.5, 13.5]) {
    geoms.push(cyl(3.5, 4, 24, 62, 12, z, 8));
    const cap = new THREE.ConeGeometry(4.2, 6, 8);
    cap.translate(62, 27, z);
    geoms.push(cap);
  }
  addPart('gatehouse-turrets', 'Gatehouse stair turrets', 'gatehouse', geoms);
}
addPart('gatehouse-gable', 'Crow-stepped gable', 'gatehouse', [
  box(58, 66, 14, 15.3, -4, 4),
  box(59, 65, 15.3, 16.6, -4, 4),
  box(60, 64, 16.6, 17.9, -4, 4),
  box(61, 63, 17.9, 19.2, -4, 4),
]);
addPart('gatehouse-arms', 'Bavarian coat of arms', 'gatehouse', [
  box(68.8, 69.3, 9, 12, -2, 2),
]);

// --- Courtyards: 8 parts.
{
  const geoms = [box(28, 55, 0, 0.5, -14, 14), box(28, 55, 0, 1.5, 13.2, 14)];
  for (let i = 0; i < 8; i++) {
    geoms.push(box(24 + i * 0.5, 24 + (i + 1) * 0.5, 0, (8 - i) * 0.5, -2, 2));
  }
  addPart('lower-court', 'Lower courtyard', 'courtyards', geoms);
}
addPart('upper-court', 'Upper courtyard', 'courtyards', [
  box(-20, 28, 4, 4.5, -26, 26),
]);
addPart('gallery-building', 'Gallery building', 'courtyards', [
  box(28, 55, 0, 10, -20, -14),
  box(28, 55, 10, 10.8, -20, -14),
]);
addPart('rectangular-tower-foundations', 'Rectangular Tower foundations', 'courtyards', [
  box(30, 44, 0, 2, -28, -27),
  box(30, 44, 0, 2, -23, -22),
  box(30, 31, 0, 2, -28, -22),
  box(43, 44, 0, 2, -28, -22),
]);
addPart('chapel-choir-embankment', 'Chapel choir embankment', 'courtyards', [
  box(26, 30, 0, 4, -14, 14),
  halfCylXNeg(5, 4, 28, 2, 0, 8),
]);
addPart('knights-house', 'Knights\u2019 House', 'courtyards', [
  box(-10, 25, 4, 16, -38, -26),
  prismRoof(-10, 25, -32, 6, 16, 21),
]);
addPart('bower', 'Bower', 'courtyards', [
  box(-10, 25, 4, 16, 26, 38),
  prismRoof(-10, 25, 32, 6, 16, 21),
]);
addPart('keep-chapel-foundations', 'Keep and chapel foundations', 'courtyards', [
  box(-3, 11, 4, 5.5, -7, -6),
  box(-3, 11, 4, 5.5, 6, 7),
  box(-3, -2, 4, 5.5, -7, 7),
  box(10, 11, 4, 5.5, -7, 7),
  box(0, 10, 4.5, 4.7, -4, -3.6),
  box(0, 10, 4.5, 4.7, 3.6, 4),
]);

// --- Palas: 8 parts.
addPart('anterior-wing', 'Anterior wing', 'palas', [
  box(-52, -20, 0, 30, -20, 20),
]);
addPart('posterior-wing', 'Posterior wing', 'palas',
  posterior([box(-36, 0, 0, 30, -16, 16)]));
addPart('palas-roofs', 'Palas gable roofs', 'palas', [
  prismRoof(-52, -20, 0, 20, 30, 38),
  ...posterior([prismRoof(-36, 0, 0, 16, 30, 38)]),
]);
addPart('west-balcony', 'West balcony', 'palas',
  posterior([
    box(-40.06, -35.94, 18, 19, -8, 8),
    box(-40.06, -35.94, 24, 25, -8, 8),
  ]));
addPart('court-frescoes', 'Court frescoes', 'palas', [
  box(-20.1, -19.7, 16, 24, -6, 6),
  box(-20.1, -19.7, 16, 24, 8, 18),
]);
{
  const geoms = [
    box(-21.5, -20.5, 38, 39.5, -1, 1),
    box(-21.3, -20.7, 39.5, 40.5, -0.7, 0.7),
  ];
  addPart('crest-figures', 'Crest figures', 'palas', [
    ...geoms,
    ...posterior([
      box(-36.5, -35.5, 38, 39.5, -1, 1),
      box(-36.3, -35.7, 39.5, 40.3, -0.6, 0.6),
    ]),
  ]);
}
addPart('conservatory', 'Conservatory', 'palas', [
  box(-45, -25, 0, 8, -30, -19.94),
  box(-45, -25, 8, 8.8, -30, -20),
]);
{
  const geoms = [];
  for (const [x, z, post] of [[-46, -8, false], [-40, 6, false], [-30, -4, false], [-12, 5, true], [-24, -6, true]]) {
    const c = [box(x - 0.75, x + 0.75, 33, 41, z - 0.75, z + 0.75)];
    geoms.push(...(post ? posterior(c) : c));
  }
  addPart('chimneys', 'Decorative chimneys', 'palas', geoms);
}

// --- Towers: 4 parts.
{
  const shaft = cyl(5, 5.5, 65, -2, 32.5, -19, 10);
  const cap = new THREE.ConeGeometry(6, 8, 10);
  cap.translate(-2, 69, -19);
  addPart('north-tower', 'North stair tower (65 m)', 'towers', posterior([shaft, cap]));
}
{
  const shaft = cyl(4.5, 5, 48, -2, 24, 19, 10);
  const cap = new THREE.ConeGeometry(5.2, 6, 10);
  cap.translate(-2, 51, 19);
  addPart('south-tower', 'South stair tower', 'towers', posterior([shaft, cap]));
}
addPart('rectangular-tower', 'Rectangular Tower (45 m)', 'towers', [
  box(-21, -11, 4, 49, -37, -27),
  box(-21.5, -10.5, 49, 50, -37.5, -26.5),
]);
{
  const geoms = [];
  for (const [x, z] of [[-50, -18], [-22, -18], [-50, 18], [-22, 18]]) {
    geoms.push(cyl(2, 2.3, 34, x, 17, z, 8));
    const c = new THREE.ConeGeometry(2.6, 4, 8);
    c.translate(x, 36, z);
    geoms.push(c);
  }
  addPart('corner-turrets', 'Palas corner turrets', 'towers', geoms);
}

// --- Interiors: 6 parts.
addPart('throne-hall', 'Throne Hall (20 by 12 m)', 'interiors',
  posterior([
    box(-30, -10, 18, 31, -6, 6),
    halfCylXNeg(6, 13, -30, 24.5, 0, 8),
    box(-33, -29, 18, 19.2, -3, 3),
  ]));
{
  const ring = new THREE.TorusGeometry(3, 0.35, 6, 18);
  ring.rotateX(Math.PI / 2);
  ring.translate(-20, 25, 0);
  addPart('throne-chandelier', 'Throne Hall chandelier', 'interiors',
    posterior([ring, strut([-20, 31, 0], [-20, 25.6, 0], 0.15)]));
}
addPart('singers-hall', 'Hall of the Singers (27 by 10 m)', 'interiors', [
  box(-47, -20, 24, 34, -5, 5),
  box(-24, -20, 24, 25, -4, 4),
]);
{
  const r1 = new THREE.SphereGeometry(2.5, 8, 6);
  r1.translate(-28, 17, -4);
  addPart('grotto', 'Artificial grotto', 'interiors', [
    box(-30, -26, 14, 20, -8, 6),
    r1,
    box(-28.2, -27.4, 14, 19, -2, 2),
  ]);
}
addPart('royal-lodging', 'Royal lodging', 'interiors', [
  box(-36, -30, 14, 21, -8, 6),
  box(-26, -20, 14, 21, -8, 6),
  box(-52, -46, 14, 21, -8, 6),
  box(-46, -40, 14, 21, -8, 6),
  box(-40, -36, 14, 21, -8, 6),
]);
addPart('kitchen-service', 'Kitchen and service lift', 'interiors', [
  box(-52, -46, 2, 8, -8, 6),
  box(-51, -49, 2, 5, -6, 6),
  box(-47, -46, 2, 21, 4, 5),
]);

// --- Terrain: 3 parts.
addPart('rock-terrace', 'Rock terrace', 'terrain', [
  box(-92, 72, -20, 0, -52, 48),
  box(-92, 72, -20, 0, 58, 68),
]);
addPart('pollat-gorge', 'P\u00f6llat Gorge and stream', 'terrain', [
  box(-92, 72, -14, 2, 44, 48),
  box(-92, 72, -14, 2, 58, 62),
  box(-92, 72, -12, -11.5, 48, 58),
]);
addPart('marienbrucke', 'Marienbr\u00fccke', 'terrain', [
  box(-24, -16, 9, 10, 44, 62),
  box(-24, -16, -14, 9, 44, 48),
  box(-24, -16, -14, 9, 58, 62),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'gatehouse-red-brick' || id === 'chapel-choir-embankment') return '#a8563f';
  if (id === 'gatehouse-yellow-limestone') return '#d9c48f';
  if (id === 'gate-arch') return '#8a8378';
  if (id === 'gatehouse-arms' || id === 'throne-hall' || id === 'throne-chandelier') return '#c9a227';
  if (id === 'crest-figures') return '#b87333';
  if (id === 'court-frescoes') return '#c4a06a';
  if (id === 'palas-roofs') return '#7a8a99';
  if (id === 'conservatory') return '#9fc3d8';
  if (id === 'grotto') return '#7a746c';
  if (id === 'kitchen-service') return '#b9b2a0';
  if (id === 'rock-terrace') return '#9a938a';
  if (id === 'pollat-gorge') return '#8a8378';
  if (id === 'marienbrucke') return '#5b6b7a';
  if (id === 'lower-court' || id === 'upper-court') return '#cfc8b4';
  if (id === 'rectangular-tower-foundations' || id === 'keep-chapel-foundations') return '#a89a80';
  if (id === 'singers-hall') return '#8a6b4a';
  return '#e8e2d4';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'gatehouse', name: 'Gatehouse', color: '#d9c48f', description: 'The symmetrical entrance block flanked by two stair towers, with red brick outer walls, yellow limestone court fronts and a crow-stepped gable.' },
  { id: 'courtyards', name: 'Courtyards', color: '#cfc8b4', description: 'The lower and upper court levels, the gallery building, the Knights\u2019 House and the Bower, and the foundations of the unbuilt keep and chapel.' },
  { id: 'palas', name: 'Palas', color: '#e8e2d4', description: 'The colossal five-storey main building: two cuboids joined at a flat angle under two high gable roofs, with frescoes, balcony and crest figures.' },
  { id: 'towers', name: 'Towers', color: '#e8e2d4', description: 'The 65 m north stair tower, the tallest castle tower in the world, the south stair tower, the 45 m Rectangular Tower and the corner turrets.' },
  { id: 'interiors', name: 'Interiors', color: '#c9a227', description: 'The Throne Hall with its Byzantine crown chandelier, the Hall of the Singers, the royal lodging, the artificial grotto and the kitchen with its service lift.' },
  { id: 'terrain', name: 'Rock terrace and gorge', color: '#9a938a', description: 'The cliff-ridge terrace, the gorge of the P\u00f6llat stream and the steel Marienbr\u00fccke.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'gatehouse': 'The symmetrical Gatehouse was finished first and served as a kind of observatory for the king over the building work. Its exterior walls are red brick, the court fronts yellow limestone, and its roof cornice is surrounded by pinnacles with a crow-stepped gable. Exact massing is schematic.',
  'gate arch and doors': 'The gate passage through the Gatehouse, with iron doors. Exact passage profile is schematic.',
  'red brick east facade': 'The eastward-pointing outer face of the Gatehouse, cased with red bricks in high contrast to the rest of the palace. Exact brickwork is schematic.',
  'yellow limestone court facade': 'The court-facing front of the Gatehouse, cased with yellow limestone. Exact stonework is schematic.',
  'gatehouse stair turrets': 'Two stair towers flank the symmetrical Gatehouse. Exact heights are schematic.',
  'crow-stepped gable': 'The crow-stepped gable surmounting the upper floor of the Gatehouse. Exact step profile is schematic.',
  'bavarian coat of arms': 'The royal coat of arms of Bavaria crowning the passage through the Gatehouse. Exact heraldry is schematic.',
  'lower courtyard': 'The lower of the two courtyard levels, with steps giving access to the upper level. Exact paving and step count are schematic.',
  'upper courtyard': 'The upper courtyard level, in which the foundation plan of the planned chapel-keep is marked out. Exact paving pattern is schematic.',
  'gallery building': 'The gallery building defining the lower courtyard to the north. Exact massing is schematic.',
  'rectangular tower foundations': 'Foundations of the so-called Rectangular Tower, defining the lower courtyard to the north. Exact outline is schematic.',
  'chapel choir embankment': 'The bricked embankment at the western end of the lower courtyard, whose polygonal bulge marks the choir of the originally projected chapel, a three-nave church that was never built. Exact outline is schematic.',
  'knights\u2019 house': 'The three-storey Knights\u2019 House defining the northern end of the upper courtyard; estate and service rooms were envisioned here. Exact massing is schematic.',
  'bower': 'The Bower, or Kemenate, defining the south side of the upper courtyard, with the balcony of Elsa von Brabant facing the courtyard as in Wagner\u2019s stage directions for Lohengrin. Exact massing is schematic.',
  'keep and chapel foundations': 'The foundation outlines of the planned 90 m keep, the intended centrepiece of the ensemble, and of the projected three-nave chapel; neither was ever built. Exact outlines are schematic.',
  'anterior wing': 'The court-side, eastern cuboid of the five-storey Palas, containing the king\u2019s lodging and the Hall of the Singers. Exact wall articulation is schematic.',
  'posterior wing': 'The west-facing cuboid of the Palas, joined to the anterior wing at a flat angle and holding the Throne Hall. Exact angle and articulation are schematic.',
  'palas gable roofs': 'The two adjacent high gable roofs covering the Palas. Exact roof profiles are schematic.',
  'west balcony': 'The two-storey balcony on the western front of the Palas, with a view of the Alpsee. Exact balustrade design is schematic.',
  'court frescoes': 'The Patrona Bavariae and Saint George depicted on the court face of the Palas in the L\u00fcftlmalerei fresco style of Allg\u00e4u farmhouses. Exact paintings are schematic.',
  'crest figures': 'The court-side gable of the Palas is crowned with a copper lion and the western gable carries the likeness of a knight. Exact figures are schematic.',
  'conservatory': 'The conservatory, or winter garden, protruding north from the main structure of the Palas. Exact glazing divisions are schematic.',
  'decorative chimneys': 'The numerous decorative chimneys spangling the Palas roofs. Exact chimney profiles are schematic.',
  'north stair tower (65 m)': 'The northern stair tower rises 65 m (213 ft) and surmounts the palace roof by several storeys, which makes Neuschwanstein the tallest castle in the world. Exact shaft and cap profiles are schematic.',
  'south stair tower': 'The southern stair tower in the angles of the Palas. Its height is schematic.',
  'rectangular tower (45 m)': 'The Rectangular Tower, 45 m high, the most striking structure of the upper court level; like most court buildings it mostly serves a decorative purpose. Exact massing is schematic.',
  'palas corner turrets': 'Ornamental turrets at the corners of the Palas. Exact turret profiles are schematic.',
  'throne hall (20 by 12 m)': 'The Throne Hall, 20 by 12 m and 13 m high, in the west wing across the third and fourth floors, with an apse for the never-completed throne and a floor mosaic finished after the king\u2019s death. Exact interior volumes are schematic.',
  'throne hall chandelier': 'The chandelier of the Throne Hall, fashioned after a Byzantine crown. Exact chandelier design is schematic.',
  'hall of the singers (27 by 10 m)': 'The Hall of the Singers, 27 by 10 m, the largest room of the palace, in the east wing on the fourth floor, with the arcaded S\u00e4ngerlaube stage, the gallery and its tribune, decorated with Lohengrin and Parzival themes. Exact interior volume is schematic.',
  'artificial grotto': 'The little artificial grotto of the royal lodging, depicting the H\u00f6rselberg grotto from Wagner\u2019s Tannh\u00e4user, originally equipped with an artificial waterfall and a rainbow machine. Exact rockwork is schematic.',
  'royal lodging': 'The king\u2019s rooms on the third floor: drawing room, study, dining room, bedroom and house chapel. Exact room layouts are schematic.',
  'kitchen and service lift': 'The kitchen three storeys below the dining room, with its Rumford oven and the service lift connecting them. Exact layouts are schematic.',
  'rock terrace': 'The rock terrace of the cliff ridge carrying the 150 m ensemble of individual structures. Exact terrace profile is schematic.',
  'p\u00f6llat gorge and stream': 'The narrow gorge of the P\u00f6llat stream, above which the castle stands. Exact gorge profile is schematic.',
  'marienbr\u00fccke': 'The Marienbr\u00fccke, named after Ludwig\u2019s mother Marie of Prussia; the first wooden bridge was replaced with a steel construction in 1886. Exact bridge design is schematic.',
};

// ---------------------------------------------------------------- serialize
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const cleaned = p.geoms.map((g) => {
    g.deleteAttribute('uv');
    return g;
  });
  const normalized =
    cleaned.some((g) => !g.index) && cleaned.some((g) => g.index)
      ? cleaned.map((g) => (g.index ? g.toNonIndexed() : g))
      : cleaned;
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
const binName = 'neuschwanstein-castle-simple-0.bin';
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
  scope: 'Neuschwanstein Castle, Bavaria (simple schematic)',
  title: 'Neuschwanstein Castle',
  location: 'Hohenschwangau, Bavaria, Germany',
  blurb: 'King Ludwig II of Bavaria\u2019s Romanesque Revival palace above the P\u00f6llat Gorge, in simplified schematic form: the red-brick Gatehouse, the two courtyard levels, the five-storey Palas and its 65 m tower.',
  sourceUrls: [
    { label: 'Wikipedia: Neuschwanstein Castle', url: 'https://en.wikipedia.org/wiki/Neuschwanstein_Castle' },
    { label: 'German Federal Foreign Office: UNESCO inscription 2025', url: 'https://unesco.diplo.de/unesco-en/inscription-of-the-castles-of-king-ludwig-ii-of-bavaria-to-the-list-of-unesco-world-heritage-sites-2727496' },
    { label: 'TravelPulse: Bavaria\u2019s palaces added to UNESCO list', url: 'https://www.travelpulse.ca/news/destinations/bavaria-s-fairy-tale-palaces-added-to-unesco-world-heritage-list' },
    { label: 'History Tools: The Fantastical History of Neuschwanstein Castle', url: 'https://www.historytools.org/stories/the-fantastical-history-of-neuschwanstein-castle' },
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
  chunks: [{ url: '/models/neuschwanstein-castle-simple/neuschwanstein-castle-simple-0.bin', bytes: offset }],
  triangles,
  spread: 2.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
