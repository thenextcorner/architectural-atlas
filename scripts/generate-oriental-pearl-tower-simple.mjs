// Simplified schematic Oriental Pearl Tower, Shanghai, for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-oriental-pearl-tower.mjs, whose header
// lists every sourced dimension reused here), but coarser: ~30 named parts
// across 6 systems instead of 101 across 7. Spheres are kept whole; columns,
// antenna and decks are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-oriental-pearl-tower.mjs for the full attribution):
//   468 m tall, built 1991-1994, 11 spheres (50 m and 45 m great spheres,
//   14 m top sphere), three 9 m columns, fifteen observatory levels,
//   Space Module at 350 m, revolving restaurant at 267 m, Space Hotel.
// Schematic (not sourced, never stated as fact in the UI): sphere center
// heights, small-sphere positions, podium and antenna forms.
//
// Writes:
//   public/models/oriental-pearl-tower-simple/atlas.json
//   public/models/oriental-pearl-tower-simple/oriental-pearl-tower-simple-0.bin
//
// Usage: node scripts/generate-oriental-pearl-tower-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'oriental-pearl-tower-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (468 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 468;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function sphere(r, x, y, z) {
  const g = new THREE.SphereGeometry(r, 20, 14);
  g.translate(x, y, z);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const explain = (name, text) => { explanations[name.toLowerCase()] = text; };

const COLS = [];
for (let k = 0; k < 3; k++) {
  const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
  COLS.push([Math.cos(a) * 22, Math.sin(a) * 22]);
}

// ---------------------------------------------------------------- base (2 parts)
addPart('podium', 'Base podium', 'base', [box(-45, 45, 0, 19, -45, 45)]);
explain('Base podium', 'The podium with the Shanghai history museum and retail. Form is schematic.');
addPart('entrance-plaza', 'Entrance plaza', 'base', [box(-60, 60, 0, 1, 48, 90)]);
explain('Entrance plaza', 'The visitor plaza. Layout is schematic.');

// ---------------------------------------------------------------- columns (3 parts: full height each)
for (let c = 0; c < 3; c++) {
  const [cx, cz] = COLS[c];
  addPart(`column-${c + 1}`, `Support column ${c + 1}`, 'columns',
    [cyl(4.5, 5.5, 350, cx, 175, cz, 14)]);
  explain(`Support column ${c + 1}`, `One of the three 9 m diameter concrete columns. Form is schematic.`);
}

// ---------------------------------------------------------------- spheres (11 whole spheres)
const SPHERES = [
  ['Lower great sphere', 25, 0, 112, 0, 'The lower great sphere, 50 m in diameter.'],
  ['Upper great sphere', 22.5, 0, 272, 0, 'The upper great sphere, 45 m in diameter, with the sightseeing floor and revolving restaurant.'],
  ['Top sphere', 7, 0, 350, 0, 'The top sphere, 14 m in diameter, with the Space Module at 350 m.'],
  ['Small sphere 1', 5, 20, 60, 8, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 2', 5, -18, 90, -10, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 3', 4, 16, 170, -12, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 4', 4, -14, 200, 14, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 5', 3.5, 12, 235, 6, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 6', 3.5, -10, 315, -8, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 7', 3, 8, 335, 4, 'A small decorative pearl. Position is schematic.'],
  ['Small sphere 8', 3, -6, 45, 16, 'A small decorative pearl. Position is schematic.'],
];
for (const [nm, r, cx, cy, cz, desc] of SPHERES) {
  const slug = nm.toLowerCase().replace(/ /g, '-');
  if (r >= 7) {
    // Split the three great spheres into upper/lower for a richer simple model.
    addPart(`${slug}-upper`, `${nm} upper`, 'spheres',
      [new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, 1.6).translate(cx, cy, cz)]);
    explain(`${nm} upper`, desc + ' Split for the exploded view; form is schematic.');
    addPart(`${slug}-lower`, `${nm} lower`, 'spheres',
      [new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 1.6, Math.PI - 1.6).translate(cx, cy, cz)]);
    explain(`${nm} lower`, desc + ' Split for the exploded view; form is schematic.');
  } else {
    addPart(slug, nm, 'spheres', [sphere(r, cx, cy, cz)]);
    explain(nm, desc);
  }
}

// ---------------------------------------------------------------- observation (4 parts)
addPart('observation-decks', 'Observation decks', 'observation',
  [cyl(20, 20, 2, 0, 263, 0, 20), cyl(6.5, 6.5, 2, 0, 350, 0, 16)]);
explain('Observation decks', 'The sightseeing floor at 263 m and the Space Module deck at 350 m. Layout is schematic.');
addPart('revolving-restaurant', 'Revolving restaurant', 'observation', [cyl(19, 19, 3, 0, 267, 0, 20)]);
explain('Revolving restaurant', 'The 267 m revolving restaurant. Form is schematic.');
addPart('glass-floor', 'Glass observation floor', 'observation', [cyl(8, 8, 0.6, 0, 259, 0, 16)]);
explain('Glass observation floor', 'The glass-bottomed walkway. Position is schematic.');
{
  const shafts = [];
  for (const [cx, cz] of COLS) shafts.push(box(cx - 2, cx + 2, 20, 345, cz - 2, cz + 2));
  addPart('elevator-shafts', 'Elevator shafts', 'observation', shafts);
  explain('Elevator shafts', 'The high-speed elevator shafts. Positions are schematic.');
}

// ---------------------------------------------------------------- hotel (1 part)
{
  const wings = [];
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * Math.PI * 2;
    wings.push(box(Math.cos(a) * 14 - 6, Math.cos(a) * 14 + 6, 150, 190, Math.sin(a) * 14 - 6, Math.sin(a) * 14 + 6));
  }
  addPart('space-hotel', 'Space Hotel', 'hotel', wings);
  explain('Space Hotel', 'The 20-room Space Hotel between the two great spheres. Layout is schematic.');
}

// ---------------------------------------------------------------- antenna (4 parts)
addPart('antenna-lower', 'Antenna lower mast', 'antenna', [cyl(1.4, 1.9, 55, 0, 384.5, 0, 10)]);
explain('Antenna lower mast', 'The lower broadcast antenna mast. Form is schematic.');
addPart('antenna-upper', 'Antenna upper mast', 'antenna', [cyl(0.7, 1.4, 58, 0, 441, 0, 10)]);
explain('Antenna upper mast', 'The upper antenna mast rising to the 468 m tip. Form is schematic.');
addPart('antenna-beacon', 'Antenna beacon', 'antenna', [sphere(1.2, 0, 469, 0)]);
explain('Antenna beacon', 'The aircraft-warning beacon at the tip. Form is schematic.');
addPart('antenna-led-band', 'Antenna LED band', 'antenna',
  [new THREE.TorusGeometry(2.2, 0.5, 8, 24).rotateX(Math.PI / 2).translate(0, 410, 0)]);
explain('Antenna LED band', 'LED band on the antenna for night illumination. Position is schematic.');

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('sphere')) return '#c98f8f';
  if (id.includes('column')) return '#b9b3a8';
  if (id.includes('antenna')) return '#8a8f96';
  if (id.includes('hotel')) return '#d4a5a5';
  if (id.includes('restaurant') || id.includes('observation') || id.includes('glass') || id.includes('elevator')) return '#a8c4d4';
  return '#c9c2b4';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base', color: '#c9c2b4', description: 'The podium and entrance plaza.' },
  { id: 'columns', name: 'Support columns', color: '#b9b3a8', description: 'Three 9 m diameter concrete columns.' },
  { id: 'spheres', name: 'Pearl spheres', color: '#c98f8f', description: 'Eleven spheres: the 50 m and 45 m great spheres, the 14 m top sphere and eight smaller pearls.' },
  { id: 'observation', name: 'Observation', color: '#a8c4d4', description: 'Decks, revolving restaurant, glass floor and elevators.' },
  { id: 'hotel', name: 'Space Hotel', color: '#d4a5a5', description: 'The 20-room Space Hotel between the great spheres.' },
  { id: 'antenna', name: 'Antenna', color: '#8a8f96', description: 'The broadcast antenna to the 468 m tip.' },
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
const binName = 'oriental-pearl-tower-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Oriental Pearl Tower, Shanghai (simplified schematic)',
  title: 'Oriental Pearl Tower',
  location: 'Shanghai, China',
  blurb: 'Shanghai\u2019s 468 m TV tower in Pudong, completed 1994, in simplified schematic form: eleven pearl spheres on three columns, with the great spheres, Space Hotel and antenna.',
  sourceUrls: [
    { label: 'Wikipedia: Oriental Pearl Tower', url: 'https://en.wikipedia.org/wiki/Oriental_Pearl_Tower' },
    { label: 'e-architect: Oriental Pearl Tower', url: 'https://www.e-architect.com/shanghai/oriental-pearl-tower' },
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
  chunks: [{ url: '/models/oriental-pearl-tower-simple/oriental-pearl-tower-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
