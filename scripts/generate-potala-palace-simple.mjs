// Simplified schematic Potala Palace, Lhasa, for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-potala-palace.mjs, whose header
// lists every sourced dimension reused here), but coarser: ~30 named parts
// across 6 systems instead of 109 across 8. Palace blocks are merged;
// stupas, roofs and stairs are grouped.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-potala-palace.mjs for the full attribution):
//   400 m by 350 m, 13 stories, over 1,000 rooms, White Palace (1648-1649)
//   and Red Palace (1690-1694), eight golden stupas, gilded bronze roofs,
//   on Marpo Ri at about 3,700 m.
// Schematic (not sourced, never stated as fact in the UI): exact block
// heights and footprints, stair and courtyard layouts, roof profiles.
//
// Writes:
//   public/models/potala-palace-simple/atlas.json
//   public/models/potala-palace-simple/potala-palace-simple-0.bin
//
// Usage: node scripts/generate-potala-palace-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'potala-palace-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (400 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 400;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function frustum(cx, cz, wBase, wTop, y0, y1) {
  const g = new THREE.CylinderGeometry(wTop / Math.SQRT2, wBase / Math.SQRT2, y1 - y0, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(cx, (y0 + y1) / 2, cz);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const explain = (name, text) => { explanations[name.toLowerCase()] = text; };

// ---------------------------------------------------------------- hill (1 part)
addPart('marpo-ri-hill', 'Marpo Ri hill', 'hill', [frustum(0, 0, 460, 380, -60, 0)]);
explain('Marpo Ri hill', 'Red Hill at about 3,700 m above sea level. Hill form is schematic.');

// ---------------------------------------------------------------- White Palace (6 parts)
addPart('white-palace-east-lower', 'White Palace east lower', 'white-palace', [frustum(130, 0, 140, 132, 0, 20)]);
explain('White Palace east lower', 'The lower eastern White Palace (Potrang Karpo), the secular residence completed 1648-1649. Form is schematic.');
addPart('white-palace-east-upper', 'White Palace east upper', 'white-palace', [frustum(130, 0, 132, 124, 20, 40)]);
explain('White Palace east upper', 'The upper eastern White Palace. Form is schematic.');
addPart('white-palace-west-lower', 'White Palace west lower', 'white-palace', [frustum(-130, 0, 140, 132, 0, 20)]);
explain('White Palace west lower', 'The lower western White Palace. Form is schematic.');
addPart('white-palace-west-upper', 'White Palace west upper', 'white-palace', [frustum(-130, 0, 132, 124, 20, 40)]);
explain('White Palace west upper', 'The upper western White Palace. Form is schematic.');
addPart('white-palace-frieze', 'White Palace frieze bands', 'white-palace',
  [box(62, 198, 40, 43, -52, 52), box(-198, -62, 40, 43, -52, 52)]);
explain('White Palace frieze bands', 'The dark red-brown frieze bands below the rooflines. Form is schematic.');
addPart('chambers-of-sunshine', 'Chambers of Sunshine', 'white-palace',
  [box(120, 170, 40, 47, -30, 30), box(-170, -120, 40, 47, -30, 30)]);
explain('Chambers of Sunshine', 'The top-floor Chambers of Sunshine, the Dalai Lama\u2019s winter quarters. Form is schematic.');

// ---------------------------------------------------------------- Red Palace (6 parts)
addPart('red-palace-lower', 'Red Palace lower', 'red-palace', [frustum(0, 0, 124, 116, 0, 28)]);
explain('Red Palace lower', 'The lower Red Palace (Potrang Marpo), added 1690-1694 for religious use. Form is schematic.');
addPart('red-palace-upper', 'Red Palace upper', 'red-palace', [frustum(0, 0, 116, 109, 28, 55)]);
explain('Red Palace upper', 'The upper Red Palace with its chapels. Form is schematic.');
{
  const stupas = [];
  for (let i = 0; i < 8; i++) {
    const sx = -42 + (i % 4) * 28, sz = (i < 4 ? -30 : 30);
    stupas.push(box(sx - 6, sx + 6, 55, 58, sz - 6, sz + 6));
    stupas.push(cyl(2.5, 4, 8, sx, 62, sz, 8));
    const top = new THREE.SphereGeometry(2.5, 8, 6); top.translate(sx, 68, sz);
    stupas.push(top);
  }
  addPart('golden-stupas', 'Eight golden stupas', 'red-palace', stupas);
  explain('Eight golden stupas', 'The eight golden stupas, tombs of eight Dalai Lamas. Positions are schematic.');
}
addPart('great-assembly-hall', 'Great assembly hall', 'red-palace', [box(-40, 40, 10, 24, -45, 45)]);
explain('Great assembly hall', "The monks' great assembly hall. Position is schematic.");
addPart('red-palace-chapels', 'Red Palace chapels', 'red-palace',
  [box(-58, 58, 30, 44, -64, -50), box(-58, 58, 30, 44, 50, 64)]);
explain('Red Palace chapels', 'Chapels and shrines of the Red Palace. Layout is schematic.');

// ---------------------------------------------------------------- gilded roofs (3 parts)
function pavilionRoof(cx, cz, w, y) {
  return [
    box(cx - w / 2, cx + w / 2, y, y + 1.5, cz - w / 2, cz + w / 2),
    box(cx - w / 2 + 3, cx + w / 2 - 3, y + 1.5, y + 4, cz - w / 2 + 3, cz + w / 2 - 3),
  ];
}
addPart('red-palace-roofs', 'Red Palace gilded roofs', 'roofs',
  [...pavilionRoof(0, 0, 60, 55), ...pavilionRoof(45, 0, 40, 55), ...pavilionRoof(-45, 0, 40, 55)]);
explain('Red Palace gilded roofs', 'Gilded bronze pavilion roofs over the Red Palace. Forms are schematic.');
addPart('white-palace-roofs', 'White Palace gilded roofs', 'roofs',
  [...pavilionRoof(130, 0, 55, 43), ...pavilionRoof(-130, 0, 55, 43)]);
explain('White Palace gilded roofs', 'Gilded roofs over the White Palace. Forms are schematic.');
addPart('chapel-roofs', 'Chapel gilded roofs', 'roofs',
  [...pavilionRoof(0, -80, 35, 55), ...pavilionRoof(0, 80, 35, 55)]);
explain('Chapel gilded roofs', 'Gilded roofs over the chapels. Forms are schematic.');

// ---------------------------------------------------------------- walls, gates (3 parts)
{
  const walls = [];
  for (let i = 0; i < 8; i++) {
    const x0 = -200 + i * 50;
    walls.push(box(x0, x0 + 50, -30, 8, -175, -165), box(x0, x0 + 50, -30, 8, 165, 175));
  }
  walls.push(box(195, 205, -30, 8, -165, 165), box(-205, -195, -30, 8, -165, 165));
  addPart('perimeter-walls', 'Perimeter walls', 'walls', walls);
  explain('Perimeter walls', 'The outer walls ringing the 400 by 350 m complex. Layout is schematic.');
}
addPart('gates', 'Palace gates', 'walls',
  [box(-12, 12, 0, 14, 165, 175), box(195, 205, 0, 10, -8, 8), box(-205, -195, 0, 10, -8, 8)]);
explain('Palace gates', 'The pilgrim gates. Forms are schematic.');

// ---------------------------------------------------------------- stairs and courtyards (3 parts)
{
  const stairs = [];
  for (let i = 0; i < 3; i++) {
    stairs.push(box(-14 + i * 2, 14 - i * 2, -50 + i * 18, -44 + i * 18, 120 - i * 40, 175 - i * 40));
    stairs.push(box(175 - i * 30, 230 - i * 30, -50 + i * 18, -44 + i * 18, -12 + i * 2, 12 - i * 2));
  }
  addPart('grand-stairs', 'Grand stairs', 'stairs', stairs);
  explain('Grand stairs', 'The long stair flights climbing Marpo Ri. Layout is schematic.');
}
addPart('courtyards', 'Palace courtyards', 'courtyards',
  [box(70, 190, 0, 2, -60, 60), box(-190, -70, 0, 2, -60, 60), box(-60, 60, 0, 2, 100, 160)]);
explain('Palace courtyards', 'The courtyards before the palace fronts. Layout is schematic.');

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('stupa') || id.includes('roof')) return '#c9a227';
  if (id.includes('red-palace')) return '#a03a2e';
  if (id.includes('white-palace') || id.includes('sunshine')) return '#e8e2d4';
  if (id.includes('frieze')) return '#5a3226';
  return '#c9bfa5';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'hill', name: 'Marpo Ri hill', color: '#9a917f', description: 'Red Hill, some 3,700 m above sea level.' },
  { id: 'white-palace', name: 'White Palace', color: '#e8e2d4', description: 'The secular White Palace completed 1648-1649.' },
  { id: 'red-palace', name: 'Red Palace', color: '#a03a2e', description: 'The religious Red Palace of 1690-1694 with the eight golden stupas.' },
  { id: 'roofs', name: 'Gilded roofs', color: '#c9a227', description: 'Gilded bronze pavilion roofs.' },
  { id: 'walls', name: 'Walls and gates', color: '#c9bfa5', description: 'Perimeter walls and pilgrim gates.' },
  { id: 'stairs', name: 'Stairs and courtyards', color: '#b5aa92', description: 'Grand stairs and courtyards.' },
  { id: 'courtyards', name: 'Courtyards', color: '#b5aa92', description: 'Courtyards before the palace fronts.' },
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
const binName = 'potala-palace-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Potala Palace, Lhasa (simplified schematic)',
  title: 'Potala Palace',
  location: 'Lhasa, Tibet, China',
  blurb: 'The Dalai Lamas\u2019 winter palace on Marpo Ri, begun 1645, in simplified schematic form: the White and Red Palaces with the eight golden stupas, gilded roofs and battered walls.',
  sourceUrls: [
    { label: 'Wikipedia: Potala Palace', url: 'https://en.wikipedia.org/wiki/Potala_Palace' },
    { label: 'chinatourguide.com: Potala Palace', url: 'http://www.chinatourguide.com/tibet/potala_palace.html' },
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
  chunks: [{ url: '/models/potala-palace-simple/potala-palace-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
