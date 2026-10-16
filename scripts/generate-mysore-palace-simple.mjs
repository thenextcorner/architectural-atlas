// Simplified schematic Mysore Palace for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-mysore-palace.mjs, whose header lists
// every sourced dimension reused here), but coarser: 30 named parts across
// 7 systems instead of 113 across 7. Walls, tower levels and arches are
// merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-mysore-palace.mjs for the full attribution):
//   Amba Vilas Palace, Mysore; Henry Irwin, 1912; Indo-Saracenic;
//   75 m by 48 m, three stories; central tower with 44 m gold dome;
//   pink-domed corner towers; Gajalakshmi over the central arch.
// Schematic (not sourced, never stated as fact in the UI): exact wall,
// tower, arch and dome profiles, gate and courtyard forms.
//
// Writes:
//   public/models/mysore-palace-simple/atlas.json
//   public/models/mysore-palace-simple/mysore-palace-simple-0.bin
//
// Usage: node scripts/generate-mysore-palace-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'mysore-palace-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (75 m length) maps to 2.4 units (same as detailed).
const S = 2.4 / 75;

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
function onionDome(r, h, x, y, z, seg = 14) {
  const pts = [];
  const prof = [[0.02, 1.0], [0.30, 0.88], [0.62, 0.72], [0.88, 0.52], [1.0, 0.32], [0.92, 0.15], [0.68, 0.03], [0.45, 0.0]];
  for (const [pr, py] of prof) pts.push(new THREE.Vector2(Math.max(0.02, pr * r), py * h));
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const exp = (name, text) => { explanations[name.toLowerCase()] = text; };

const HX = 37.5, HZ = 24;

// --- Main block merged: 4 parts.
addPart('main-block-walls', 'Main block walls', 'main-block', [
  box(-HX, HX, 2, 20, HZ - 1.2, HZ), box(-HX, HX, 2, 20, -HZ, -HZ + 1.2),
  box(HX - 1.2, HX, 2, 20, -HZ, HZ), box(-HX, -HX + 1.2, 2, 20, -HZ, HZ),
]);
exp('Main block walls', 'The three-story granite walls, merged into one part. Exact buildup is schematic.');
addPart('main-block-plinth', 'Granite plinth', 'main-block', [box(-HX - 1, HX + 1, 0, 2, -HZ - 1, HZ + 1)]);
exp('Granite plinth', 'The granite plinth. Exact form is schematic.');
addPart('main-block-cornices', 'Floor cornices', 'main-block', [
  box(-HX - 0.6, HX + 0.6, 7.5, 8, -HZ - 0.6, HZ + 0.6),
  box(-HX - 0.6, HX + 0.6, 13.5, 14, -HZ - 0.6, HZ + 0.6),
  box(-HX - 0.6, HX + 0.6, 19.5, 20, -HZ - 0.6, HZ + 0.6),
]);
exp('Floor cornices', 'The cornices marking the floor levels, merged. Exact profiles are schematic.');
addPart('main-roof', 'Main roof', 'main-block', [box(-HX, HX, 20, 21, -HZ, HZ)]);
exp('Main roof', 'The roof over the main block. Exact construction is schematic.');

// --- Central tower merged: 3 parts.
addPart('central-tower', 'Central tower', 'central-tower', [cyl(6.5, 7.5, 12, 0, 26, 0, 8)]);
exp('Central tower', 'The five-story central tower, merged into one part. Exact level division is schematic.');
addPart('gold-dome', 'Gold dome', 'central-tower', [onionDome(5, 11, 0, 32, 0)]);
exp('Gold dome', 'The gold-plated onion dome, 44 m above the ground, merged into one part. Exact profile is schematic.');
addPart('dome-chhatri', 'Dome chhatri', 'central-tower', [cyl(1.6, 1.2, 0.5, 0, 45.8, 0, 8), new THREE.SphereGeometry(1.0, 8, 6).translate(0, 46.2, 0)]);
exp('Dome chhatri', 'The chhatri carried on the gold dome. Exact form is schematic.');

// --- Corner towers merged: 8 parts (2 per tower).
for (const [cx, cz, nm] of [[-HX + 5, -HZ + 5, 'Northwest'], [HX - 5, -HZ + 5, 'Northeast'], [-HX + 5, HZ - 5, 'Southwest'], [HX - 5, HZ - 5, 'Southeast']]) {
  const key = nm.toLowerCase();
  addPart(`${key}-tower`, `${nm} tower`, 'corner-towers', [
    box(cx - 4, cx + 4, 0, 8, cz - 4, cz + 4),
    box(cx - 3.2, cx + 3.2, 8, 30, cz - 3.2, cz + 3.2),
    box(cx - 3.8, cx + 3.8, 30, 30.8, cz - 3.8, cz + 3.8),
  ]);
  exp(`${nm} tower`, `The ${nm.toLowerCase()} five-story tower, merged into one part. Exact form is schematic.`);
  addPart(`${key}-pink-dome`, `${nm} pink dome`, 'corner-towers', [onionDome(3.4, 5, cx, 30.8, cz, 12)]);
  exp(`${nm} pink dome`, `The pink dome of the ${nm.toLowerCase()} tower. Exact profile is schematic.`);
}

// --- Arcades merged per facade: 5 parts.
{
  const mkArchRow = (n, span, fixed, vertical) => {
    const geoms = [];
    for (let i = 0; i < n; i++) {
      const c = -((n - 1) * span) / 2 + i * span;
      const jambL = vertical ? box(fixed - 1, fixed + 1, 2, 6.5, c - 2.5, c - 1.5) : box(c - 2.5, c - 1.5, 2, 6.5, fixed - 1, fixed + 1);
      const jambR = vertical ? box(fixed - 1, fixed + 1, 2, 6.5, c + 1.5, c + 2.5) : box(c + 1.5, c + 2.5, 2, 6.5, fixed - 1, fixed + 1);
      geoms.push(jambL, jambR);
      const arch = new THREE.TorusGeometry(1.7, 0.45, 6, 10, Math.PI);
      if (vertical) { arch.rotateY(Math.PI / 2); arch.translate(fixed, 6.5, c); }
      else arch.translate(c, 6.5, fixed);
      geoms.push(arch);
    }
    return geoms;
  };
  addPart('front-arcade', 'Front arcade', 'arcades', mkArchRow(9, 5, HX, true));
  exp('Front arcade', 'The nine arched bays of the east facade, merged. Exact count and profiles are schematic.');
  addPart('rear-arcade', 'Rear arcade', 'arcades', mkArchRow(9, 5, -HX, true));
  exp('Rear arcade', 'The nine arched bays of the west facade, merged. Exact count and profiles are schematic.');
  addPart('north-arcade', 'North arcade', 'arcades', mkArchRow(6, 10, HZ, false));
  exp('North arcade', 'The arched bays of the north facade, merged. Exact count and profiles are schematic.');
  addPart('south-arcade', 'South arcade', 'arcades', mkArchRow(6, 10, -HZ, false));
  exp('South arcade', 'The arched bays of the south facade, merged. Exact count and profiles are schematic.');
  const central = [];
  const cjL = box(HX - 1.5, HX + 1.5, 2, 9, -4.3, -2.8);
  const cjR = box(HX - 1.5, HX + 1.5, 2, 9, 2.8, 4.3);
  const cArch = new THREE.TorusGeometry(3.5, 0.8, 8, 12, Math.PI);
  cArch.rotateY(Math.PI / 2); cArch.translate(HX, 9, 0);
  const gaj = cyl(0.9, 1.2, 2.4, HX, 13.2, 0, 8);
  central.push(cjL, cjR, cArch, gaj);
  addPart('central-arch-and-gajalakshmi', 'Central arch and Gajalakshmi', 'arcades', central);
  exp('Central arch and Gajalakshmi', 'The ceremonial central archway with the Gajalakshmi sculpture above, merged. Exact forms are schematic.');
}

// --- Entrances merged: 2 parts.
{
  const gates = [];
  for (const [gx, gz] of [[HX + 8, 0], [0, HZ + 8], [0, -HZ - 8], [-HX - 8, 0]]) {
    gates.push(box(gx - 3, gx + 3, 0, 9, gz - 1.5, gz + 1.5));
    gates.push(onionDome(2.2, 3, gx, 9, gz, 10));
  }
  addPart('entrance-gates', 'Entrance gates', 'entrances', gates);
  exp('Entrance gates', 'The four named gates of the palace, merged. Exact forms are schematic.');
  addPart('tigers-and-elephant-gate', 'Bronze tigers and Elephant Gate', 'entrances', [
    cyl(0.5, 0.7, 1.6, HX + 12, 1.8, 6, 8), cyl(0.5, 0.7, 1.6, HX + 12, 1.8, -6, 8),
    box(HX - 2, HX + 2, 2, 10, -3, 3),
  ]);
  exp('Bronze tigers and Elephant Gate', 'Colton\u2019s bronze tigers and the inner Elephant Gate, merged. Exact forms are schematic.');
}

// --- Roofs and courtyard merged: 3 parts.
{
  const chhatris = [];
  for (let i = 0; i < 8; i++) {
    const cx = -28 + (i % 4) * 18.5;
    const cz = i < 4 ? HZ - 4 : -HZ + 4;
    chhatris.push(cyl(1.2, 1.2, 2, cx, 22, cz, 8));
    chhatris.push(onionDome(1.6, 2.2, cx, 23, cz, 8));
  }
  addPart('roof-chhatris', 'Roof chhatris', 'roofs', chhatris);
  exp('Roof chhatris', 'The eight rooftop chhatri kiosks, merged. Exact forms are schematic.');
}
addPart('roof-parapets', 'Roof parapets', 'roofs', [
  box(-HX, HX, 21, 22.5, HZ - 0.8, HZ), box(-HX, HX, 21, 22.5, -HZ, -HZ + 0.8),
  box(HX - 0.8, HX, 21, 22.5, -HZ, HZ), box(-HX, -HX + 0.8, 21, 22.5, -HZ, HZ),
]);
exp('Roof parapets', 'The roof parapets, merged. Exact forms are schematic.');
addPart('courtyard-and-walls', 'Courtyard and garden walls', 'courtyard', [
  box(-20, 20, 0.2, 0.5, -14, 14),
  box(-30, 30, 0, 3, 20, 21), box(-30, 30, 0, 3, -21, -20),
  box(29, 30, 0, 3, -20, 20), box(-30, -29, 0, 3, -20, 20),
]);
exp('Courtyard and garden walls', 'The inner courtyard and garden walls, merged. Exact layout is schematic.');

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'gold-dome') return '#c9a227';
  if (id === 'dome-chhatri') return '#b8941f';
  if (id.includes('pink-dome')) return '#d4a0a0';
  if (id === 'central-arch-and-gajalakshmi') return '#b8935a';
  if (id === 'tigers-and-elephant-gate') return '#8a6f3e';
  if (id.includes('cornices')) return '#c9bfa5';
  return '#b8b0a0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'main-block', name: 'Main block', color: '#b8b0a0', description: 'The three-story granite block, merged.' },
  { id: 'central-tower', name: 'Central tower and gold dome', color: '#c9a227', description: 'Tower, gold dome and chhatri, merged per element.' },
  { id: 'corner-towers', name: 'Corner towers', color: '#b8b0a0', description: 'The four pink-domed towers.' },
  { id: 'arcades', name: 'Arcades', color: '#b8b0a0', description: 'Facade arcades merged per side, plus the central arch.' },
  { id: 'entrances', name: 'Entrances', color: '#b8b0a0', description: 'Gates, tigers and Elephant Gate, merged.' },
  { id: 'roofs', name: 'Roofs', color: '#b8b0a0', description: 'Chhatris and parapets.' },
  { id: 'courtyard', name: 'Courtyard and gardens', color: '#b0a894', description: 'Courtyard and garden walls, merged.' },
];

// ---------------------------------------------------------------- serialize
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
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3,
    indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}
const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'mysore-palace-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Mysore Palace (Amba Vilas Palace), Mysore (simplified schematic)',
  title: 'Mysore Palace',
  location: 'Mysore, India',
  blurb: 'Henry Irwin\u2019s 1912 palace in simplified schematic form: a 75 m granite block with its gold-domed central tower and pink-domed corner towers.',
  sourceUrls: [
    { label: 'Wikipedia: Mysore Palace', url: 'https://en.wikipedia.org/wiki/Mysore_Palace' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/mysore-palace-simple/mysore-palace-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
