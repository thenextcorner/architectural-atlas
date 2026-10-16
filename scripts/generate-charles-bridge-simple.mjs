// Simplified schematic Charles Bridge, Prague, for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-charles-bridge.mjs, whose header
// lists every sourced dimension reused here), but coarser: ~30 named parts
// across 6 systems instead of 100+ across 7. Arches, piers and statues are
// merged into group parts; the bridge towers are reduced to their main
// masses.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-charles-bridge.mjs for the full attribution):
//   516 m long, nearly 10 m wide, 16 arches with ice guards, 30 statues
//   (15 per side, erected 1683-1714, now replicas), three bridge towers,
//   built 1357 to early 15th century under Charles IV, sandstone.
// Schematic (not sourced, never stated as fact in the UI): pier and arch
// heights, deck camber, statue forms, tower heights and roof profiles.
//
// Writes:
//   public/models/charles-bridge-simple/atlas.json
//   public/models/charles-bridge-simple/charles-bridge-simple-0.bin
//
// Usage: node scripts/generate-charles-bridge-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'charles-bridge-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (516 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 516;

const LEN = 516, WID = 10, BAYS = 16, BAY = LEN / BAYS;
const DECK_Y = 13;

// ---------------------------------------------------------------- helpers
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
function halfArch(cx, ySpring, radius, tube, rotY = 0) {
  const g = new THREE.TorusGeometry(radius, tube, 6, 16, Math.PI);
  if (rotY) g.rotateY(rotY);
  g.translate(cx, ySpring, 0);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const explain = (name, text) => { explanations[name.toLowerCase()] = text; };

// ---------------------------------------------------------------- deck (3 parts)
addPart('deck-west', 'West deck', 'deck',
  [box(-LEN / 2, -LEN / 6, DECK_Y, DECK_Y + 1.6, -WID / 2, WID / 2)]);
explain('West deck', 'The western third of the 516 m sandstone roadway deck. Deck buildup is schematic.');
addPart('deck-center', 'Center deck', 'deck',
  [box(-LEN / 6, LEN / 6, DECK_Y, DECK_Y + 1.6, -WID / 2, WID / 2)]);
explain('Center deck', 'The center third of the deck. Deck buildup is schematic.');
addPart('deck-east', 'East deck', 'deck',
  [box(LEN / 6, LEN / 2, DECK_Y, DECK_Y + 1.6, -WID / 2, WID / 2)]);
explain('East deck', 'The eastern third of the deck. Deck buildup is schematic.');
addPart('deck-paving', 'Deck paving', 'deck',
  [box(-LEN / 2, LEN / 2, DECK_Y + 1.6, DECK_Y + 1.85, -WID / 2, WID / 2)]);
explain('Deck paving', 'Cobblestone paving of the deck. Detail is schematic.');

// ---------------------------------------------------------------- arches in 8 groups, piers in 2 groups, ice guards merged
for (let gI = 0; gI < 8; gI++) {
  const geoms = [];
  for (let i = gI * 2; i < (gI + 1) * 2; i++) {
    const cx = -LEN / 2 + (i + 0.5) * BAY;
    geoms.push(halfArch(cx, 6, BAY / 2 - 1.2, 1.6));
    geoms.push(box(cx - BAY / 2 + 1, cx + BAY / 2 - 1, 6, DECK_Y + 0.5, -4.4, 4.4));
  }
  addPart(`arch-group-${gI + 1}`, `Arch group ${gI + 1}`, 'arches', geoms);
  explain(`Arch group ${gI + 1}`, `Two of the bridge's 16 sandstone arches with their spandrels. Arch profiles are schematic.`);
}
{
  const piersW = [], piersE = [];
  for (let i = 0; i <= BAYS; i++) {
    const x = -LEN / 2 + i * BAY;
    (x < 0 ? piersW : piersE).push(box(x - 2.2, x + 2.2, 0, 7.5, -5.2, 5.2));
  }
  addPart('piers-west', 'West piers and abutment', 'arches', piersW);
  explain('West piers and abutment', 'The western piers and abutment rising from the Vltava. Dimensions are schematic.');
  addPart('piers-east', 'East piers and abutment', 'arches', piersE);
  explain('East piers and abutment', 'The eastern piers and abutment rising from the Vltava. Dimensions are schematic.');
  const guards = [];
  for (let i = 1; i < BAYS; i++) {
    const x = -LEN / 2 + i * BAY;
    const shape = new THREE.Shape();
    shape.moveTo(-3.5, 0); shape.lineTo(3.5, 0); shape.lineTo(0, 4); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
    g.translate(x, 0, -6.7);
    guards.push(g);
  }
  addPart('ice-guards', 'Ice guards', 'arches', guards);
  explain('Ice guards', 'Cutwater ice guards shielding the piers from ice floes. Shape and orientation are schematic.');
}

// ---------------------------------------------------------------- parapets (2 parts)
for (const [side, nm] of [['north', 'North'], ['south', 'South']]) {
  const z = side === 'north' ? 1 : -1;
  addPart(`${side}-parapet`, `${nm} parapet`, 'parapets',
    [box(-LEN / 2, LEN / 2, DECK_Y + 1.85, DECK_Y + 3.1, z * 4.2, z * 5.0)]);
  explain(`${nm} parapet`, `The ${nm.toLowerCase()} sandstone parapet carrying the statues. Height is schematic.`);
}

// ---------------------------------------------------------------- statues in 6 groups (5 positions x 2 sides each)
const SIDES = [[4.6, 'north'], [-4.6, 'south']];
for (let gI = 0; gI < 6; gI++) {
  const sideIdx = Math.floor(gI / 3);
  const z = SIDES[sideIdx][0];
  const geoms = [];
  for (let k = 0; k < 5; k++) {
    const i = (gI % 3) * 5 + k;
    const x = -LEN / 2 + 24 + i * ((LEN - 48) / 14);
    geoms.push(box(x - 0.9, x + 0.9, DECK_Y + 3.1, DECK_Y + 4.6, z - 0.9, z + 0.9));
    geoms.push(cyl(0.55, 0.8, 2.6, x, DECK_Y + 5.9, z, 8));
    const head = new THREE.SphereGeometry(0.35, 6, 5); head.translate(x, DECK_Y + 7.5, z);
    geoms.push(head);
  }
  addPart(`statue-group-${gI + 1}`, `Statue group ${gI + 1} (${SIDES[sideIdx][1]})`, 'statues', geoms);
  explain(`Statue group ${gI + 1} (${SIDES[sideIdx][1]})`, 'A group of the 30 Baroque statues lining the bridge (erected 1683-1714, now replicas). Figure forms are schematic.');
}

// ---------------------------------------------------------------- towers (5 parts)
{
  const x = LEN / 2 + 7;
  addPart('old-town-tower', 'Old Town Bridge Tower', 'towers', [
    box(x - 5, x - 1.6, DECK_Y, DECK_Y + 26, -5, 5),
    box(x + 1.6, x + 5, DECK_Y, DECK_Y + 26, -5, 5),
    box(x - 5, x + 5, DECK_Y + 12, DECK_Y + 26, -5, 5),
  ]);
  explain('Old Town Bridge Tower', 'The Gothic gateway tower on the Old Town side, a symbolic victory arch on the coronation route. Form is schematic.');
  const roof = new THREE.ConeGeometry(7.2, 9, 4);
  roof.rotateY(Math.PI / 4); roof.translate(x, DECK_Y + 30.5, 0);
  addPart('old-town-tower-roof', 'Old Town Bridge Tower roof', 'towers', [roof]);
  explain('Old Town Bridge Tower roof', 'The steep tower roof. Profile is schematic.');
  const xw = -LEN / 2 - 6, xw2 = -LEN / 2 - 16;
  addPart('lesser-town-towers', 'Lesser Town towers', 'towers', [
    box(xw - 4, xw + 4, DECK_Y, DECK_Y + 20, -4, 4),
    box(xw2 - 3.4, xw2 + 3.4, DECK_Y, DECK_Y + 13, -3.4, 3.4),
  ]);
  explain('Lesser Town towers', 'The pair of bridge towers on the Lesser Town side. Forms are schematic.');
  const r1 = new THREE.ConeGeometry(5.8, 8, 4); r1.rotateY(Math.PI / 4); r1.translate(xw, DECK_Y + 24, 0);
  const r2 = new THREE.ConeGeometry(4.8, 6, 4); r2.rotateY(Math.PI / 4); r2.translate(xw2, DECK_Y + 16, 0);
  addPart('lesser-town-tower-roofs', 'Lesser Town tower roofs', 'towers', [r1, r2]);
  explain('Lesser Town tower roofs', 'The roofs of the Lesser Town towers. Profiles are schematic.');
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('statue-')) return '#8f8578';
  if (id.includes('tower')) return '#a89a76';
  if (id.includes('arch') || id.includes('pier') || id.includes('ice')) return '#b5aa92';
  if (id.includes('parapet')) return '#c4b898';
  if (id.includes('paving')) return '#8a8478';
  return '#c9bfa5';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'deck', name: 'Deck', color: '#c9bfa5', description: 'The 516 m sandstone roadway deck, 10 m wide, with its cobblestone paving.' },
  { id: 'arches', name: 'Arches, piers and ice guards', color: '#b5aa92', description: 'Sixteen sandstone arches on massive piers, shielded by ice guards.' },
  { id: 'parapets', name: 'Parapets', color: '#c4b898', description: 'The north and south parapets carrying the statues.' },
  { id: 'statues', name: 'Statues', color: '#8f8578', description: 'Thirty Baroque statues in six groups, fifteen per side.' },
  { id: 'towers', name: 'Bridge towers', color: '#a89a76', description: 'The three Gothic bridge towers guarding the bridge ends.' },
];

// ---------------------------------------------------------------- serialize (Atlas v1 contract)
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(p.geoms.map((g) => { g.deleteAttribute('uv'); return g; }), false);
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  const idx = merged.index ? merged.index.array : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const n16 = new Int16Array(nor.length);
  for (let i = 0; i < nor.length; i++) n16[i] = Math.round(Math.max(-1, Math.min(1, nor[i])) * 32767);
  const u32 = idx instanceof Uint32Array ? idx : Uint32Array.from(idx);
  const align4 = (n) => (n + 3) & ~3;
  const posOff = offset; offset = align4(offset + pos.byteLength);
  const norOff = offset; offset = align4(offset + n16.byteLength);
  const idxOff = offset; offset = align4(offset + u32.byteLength);
  const bb = merged.boundingBox;
  records.push({
    part: p,
    pos: Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength),
    nor: Buffer.from(n16.buffer, n16.byteOffset, n16.byteLength),
    idx: Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength),
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3, indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}

const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'charles-bridge-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Charles Bridge, Prague (simplified schematic)',
  title: 'Charles Bridge',
  location: 'Prague, Czech Republic',
  blurb: 'Prague\u2019s medieval stone arch bridge over the Vltava, begun in 1357 under Charles IV, in simplified schematic form: sixteen arches carry the 516 m deck with its 30 statues between the three bridge towers.',
  sourceUrls: [
    { label: 'Wikipedia: Charles Bridge', url: 'https://en.wikipedia.org/wiki/Charles_Bridge' },
    { label: 'praguefreetours.com: Charles Bridge', url: 'https://praguefreetours.com/charles-bridge-prague/' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system,
    chunk: 0, color: colorFor(r.part.id),
    positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/charles-bridge-simple/charles-bridge-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
