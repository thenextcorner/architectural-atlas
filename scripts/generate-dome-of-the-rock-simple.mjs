// Simplified schematic Dome of the Rock for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-dome-of-the-rock.mjs, whose header
// lists every sourced dimension reused here), but coarser: 28 named parts
// across 6 systems instead of 112 across 8. Wall courses, arcade members,
// drum windows and dome segments are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-dome-of-the-rock.mjs for the full attribution):
//   691-692 CE, octagonal plan, 20 m dome on drum with 4 piers and
//   12 columns, 24-member arcade, 18 m sides, four entrances, 35 m total.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; simplified walls, arcades, drum and dome.
//
// Writes:
//   public/models/dome-of-the-rock-simple/atlas.json
//   public/models/dome-of-the-rock-simple/dome-of-the-rock-simple-0.bin
//
// Usage: node scripts/generate-dome-of-the-rock-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'dome-of-the-rock-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~43 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 43;

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
function octPt(R, k, t) {
  const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
  const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
  const a = a0 + (a1 - a0) * t;
  return [Math.cos(a) * R, Math.sin(a) * R];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const DOME_R = 10, WALL_H = 11, DRUM_H = 9, DRUM_Y = WALL_H, DOME_Y = DRUM_Y + DRUM_H, APEX_Y = 33, OR = 23.5;

// Outer walls (4 parts)
{
  const walls = [];
  for (let k = 0; k < 8; k++) {
    const [x0, z0] = octPt(OR, k, 0), [x1, z1] = octPt(OR, k, 1);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.BoxGeometry(len, WALL_H, 1.2);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
    g.translate(mx, WALL_H / 2, mz);
    walls.push(g);
  }
  addPart('outer-walls', 'Octagonal outer walls', 'walls', walls);
  const wins = [];
  for (let k = 0; k < 8; k++) {
    const [x0, z0] = octPt(OR - 0.7, k, 0.2), [x1, z1] = octPt(OR - 0.7, k, 0.8);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.BoxGeometry(len, 2.2, 0.3);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
    g.translate(mx, WALL_H * 0.72, mz);
    wins.push(g);
  }
  addPart('outer-windows', 'Outer wall windows', 'walls', wins);
  const c1 = new THREE.CylinderGeometry(OR * 0.98, OR * 1.02, 0.8, 8, 1);
  c1.rotateY(Math.PI / 8); c1.translate(0, WALL_H + 0.4, 0);
  const c2 = new THREE.CylinderGeometry(OR * 1.04, OR * 1.04, 0.5, 8, 1);
  c2.rotateY(Math.PI / 8); c2.translate(0, 0.25, 0);
  addPart('wall-cornice-plinth', 'Wall cornice and plinth', 'walls', [c1, c2]);
}

// Arcade (2 parts)
{
  const piers = [], cols = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2 + Math.PI / 24;
    const x = Math.cos(a) * 13, z = Math.sin(a) * 13;
    if (k % 3 === 0) piers.push(box(x - 0.9, x + 0.9, 0, WALL_H - 1, z - 0.9, z + 0.9));
    else cols.push(cyl(0.45, 0.5, WALL_H - 2, x, (WALL_H - 2) / 2, z, 8));
  }
  addPart('arcade-piers', 'Arcade piers', 'arcade', piers);
  addPart('arcade-columns', 'Arcade columns', 'arcade', cols);
}

// Drum supports (2 parts)
{
  const piers = [], cols = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * (DOME_R + 1.2), z = Math.sin(a) * (DOME_R + 1.2);
    piers.push(box(x - 1.1, x + 1.1, 0, DRUM_Y, z - 1.1, z + 1.1));
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = Math.cos(a) * (DOME_R + 1.2), z = Math.sin(a) * (DOME_R + 1.2);
    cols.push(cyl(0.4, 0.45, DRUM_Y - 1, x, (DRUM_Y - 1) / 2, z, 8));
  }
  addPart('drum-piers', 'Drum piers', 'arcade', piers);
  addPart('drum-columns', 'Drum columns', 'arcade', cols);
}

// Drum (3 parts)
{
  const dg = new THREE.CylinderGeometry(DOME_R + 0.6, DOME_R + 0.6, DRUM_H, 20, 1, true);
  dg.translate(0, DRUM_Y + DRUM_H / 2, 0);
  addPart('drum-shell', 'Drum shell', 'drum', [dg]);
  const wins = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const g = new THREE.BoxGeometry(1.1, 3.2, 0.25);
    g.rotateY(-a + Math.PI / 2);
    g.translate(Math.cos(a) * (DOME_R + 0.55), DRUM_Y + DRUM_H / 2, Math.sin(a) * (DOME_R + 0.55));
    wins.push(g);
  }
  addPart('drum-windows', 'Drum windows', 'drum', wins);
  addPart('drum-cornice', 'Drum cornice', 'drum', [cyl(DOME_R + 1.0, DOME_R + 0.7, 0.7, 0, DOME_Y + 0.35, 0, 20)]);
}

// Dome (4 parts)
{
  const g = new THREE.SphereGeometry(DOME_R + 0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, (APEX_Y - DOME_Y) / (DOME_R + 0.3), 1);
  g.translate(0, DOME_Y, 0);
  addPart('dome-shell', 'Gilded dome', 'dome', [g]);
  const inner = new THREE.SphereGeometry(DOME_R - 1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  inner.translate(0, DOME_Y - 1.5, 0);
  addPart('inner-dome', 'Inner dome', 'dome', [inner]);
  addPart('dome-finial', 'Finial and crescent', 'dome', [
    cyl(0.18, 0.18, 3.2, 0, APEX_Y + 1.2, 0, 8),
    new THREE.TorusGeometry(0.7, 0.14, 8, 16, Math.PI * 1.5).translate(0, APEX_Y + 2.9, 0),
  ]);
}

// Entrances (4 parts)
{
  const doors = [], porches = [];
  for (const [k, dx, dz] of [[0, 0, -1], [2, 1, 0], [4, 0, 1], [6, -1, 0]]) {
    const [px, pz] = octPt(OR, k, 0.5);
    const dg = new THREE.BoxGeometry(dx !== 0 ? 0.8 : 2.8, 5, dx !== 0 ? 2.8 : 0.8);
    dg.translate(px, 3, pz);
    doors.push(dg);
    porches.push(box(px + dx * 2 - 2, px + dx * 2 + 2, 0, 7, pz + dz * 2 - 2, pz + dz * 2 + 2));
  }
  addPart('entrance-doors', 'Entrance doors', 'entrances', doors);
  addPart('entrance-porches', 'Entrance porches', 'entrances', porches);
}

// Platform + rock (3 parts)
{
  const pg = new THREE.CylinderGeometry(OR * 1.35, OR * 1.4, 1.2, 8, 1);
  pg.rotateY(Math.PI / 8); pg.translate(0, -0.6, 0);
  addPart('platform', 'Temple Mount platform', 'platform', [pg]);
  addPart('foundation-stone', 'Foundation Stone', 'platform', [
    new THREE.SphereGeometry(4.5, 10, 8).scale(1.45, 0.5, 0.85).translate(0, 1.2, 0),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('outer-')) return '#b8a888';
  if (id === 'wall-cornice-plinth') return '#a89878';
  if (id.startsWith('arcade-')) return '#a89878';
  if (id.startsWith('drum-')) return '#b8a888';
  if (id === 'dome-shell') return '#c9a83a';
  if (id === 'inner-dome') return '#8a7a5a';
  if (id === 'dome-finial') return '#d4af37';
  if (id.startsWith('entrance-')) return '#7a6a52';
  if (id === 'platform') return '#8a8478';
  if (id === 'foundation-stone') return '#7a7568';
  return '#b8a888';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'walls', name: 'Outer walls', color: '#b8a888', description: 'The octagonal outer walls with windows.' },
  { id: 'arcade', name: 'Arcades', color: '#a89878', description: 'Inner arcade and drum supports.' },
  { id: 'drum', name: 'Drum', color: '#b8a888', description: 'The windowed cylindrical drum.' },
  { id: 'dome', name: 'Dome', color: '#c9a83a', description: 'The gilded dome with inner shell and finial.' },
  { id: 'entrances', name: 'Entrances', color: '#7a6a52', description: 'The four cardinal entrances.' },
  { id: 'platform', name: 'Platform', color: '#8a8478', description: 'Temple Mount platform and Foundation Stone.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'octagonal outer walls': 'The octagonal outer walls, each side about 18 m, faced with 16th-century Ottoman tiles. Exact coursing is schematic.',
  'outer wall windows': 'Window bands piercing the outer walls. Exact arrangement is schematic.',
  'wall cornice and plinth': 'Cornice and plinth of the outer walls. Exact profiles are schematic.',
  'arcade piers': 'Piers of the inner octagonal arcade. Exact positions are schematic.',
  'arcade columns': 'Columns of the inner octagonal arcade of 24 members. Exact positions are schematic.',
  'drum piers': 'The four piers carrying the dome drum. Exact positions are schematic.',
  'drum columns': 'The twelve columns carrying the dome drum. Exact positions are schematic.',
  'drum shell': 'The cylindrical drum carrying the 20 m dome. Exact height is schematic.',
  'drum windows': 'Windows ringing the drum. Exact arrangement is schematic.',
  'drum cornice': 'Cornice at the top of the drum. Exact profile is schematic.',
  'gilded dome': 'The gilded outer dome, 20 m in diameter. Exact profile is schematic.',
  'inner dome': 'The inner wooden dome of the double-shell construction. Exact form is schematic.',
  'finial and crescent': 'The finial and crescent crowning the dome. Exact form is schematic.',
  'entrance doors': 'The four entrance doors on the cardinal axes. Exact forms are schematic.',
  'entrance porches': 'Porches fronting the entrances. Exact forms are schematic.',
  'temple mount platform': 'The raised Temple Mount platform. Exact form is schematic.',
  'foundation stone': 'The Foundation Stone, about 13 by 7.6 m. Exact form is schematic.',
};

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
const binName = 'dome-of-the-rock-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Dome of the Rock, Jerusalem (simplified schematic)',
  title: 'Dome of the Rock',
  location: 'Jerusalem',
  blurb: 'The 691-692 CE Umayyad shrine in simplified form: octagonal walls around a 20 m gilded dome.',
  sourceUrls: [{ label: 'Wikipedia: Dome of the Rock', url: 'https://en.wikipedia.org/wiki/Dome_of_the_Rock' }],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/dome-of-the-rock-simple/dome-of-the-rock-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
