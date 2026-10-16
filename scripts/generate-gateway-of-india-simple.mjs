// Simplified schematic Gateway of India for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-gateway-of-india.mjs, whose header
// lists every sourced dimension reused here), but coarser: 30 named parts
// across 7 systems instead of 100 across 8. Voussoirs, dome segments and
// turret details are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-gateway-of-india.mjs for the full attribution):
//   Apollo Bunder, Mumbai; 1911 royal landing commemoration; George Wittet;
//   completed 1924; Indo-Saracenic; 26 m high; central dome 14.6 m diameter;
//   four turrets; yellow basalt; side halls for 600 each.
// Schematic (not sourced, never stated as fact in the UI): exact arch and
// dome profiles, turret and hall forms, ornament.
//
// Writes:
//   public/models/gateway-of-india-simple/atlas.json
//   public/models/gateway-of-india-simple/gateway-of-india-simple-0.bin
//
// Usage: node scripts/generate-gateway-of-india-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'gateway-of-india-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~50 m width) maps to 2.4 units (same as detailed).
const S = 2.4 / 50;

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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const exp = (name, text) => { explanations[name.toLowerCase()] = text; };

// --- Central arch: piers, merged arch ring, spandrels: 5 parts.
addPart('arch-pier-left', 'Left arch pier', 'central-arch', [box(-11, -7, 2, 10, -4, 4)]);
exp('Left arch pier', 'The left pier of the great arch. Exact width is schematic.');
addPart('arch-pier-right', 'Right arch pier', 'central-arch', [box(7, 11, 2, 10, -4, 4)]);
exp('Right arch pier', 'The right pier of the great arch. Exact width is schematic.');
{
  const ring = [];
  for (let i = 0; i < 10; i++) {
    const am = ((i + 0.5) / 10) * Math.PI;
    const w = (Math.PI * 7) / 10;
    const g = new THREE.BoxGeometry(w * 0.96, 2.2, 8);
    g.rotateZ(am + Math.PI / 2);
    g.translate(Math.cos(am) * 7, 10 + Math.sin(am) * 7, 0);
    ring.push(g);
  }
  ring.push(box(-0.9, 0.9, 16.2, 19.4, -4, 4));
  addPart('arch-ring', 'Arch ring and keystone', 'central-arch', ring);
  exp('Arch ring and keystone', 'The great arch ring with its keystone, merged into one part. Exact profile is schematic.');
}
addPart('spandrel-left', 'Left spandrel', 'central-arch', [box(-11, -7.5, 12, 20, -4, 4)]);
exp('Left spandrel', 'Spandrel wall left of the arch. Exact form is schematic.');
addPart('spandrel-right', 'Right spandrel', 'central-arch', [box(7.5, 11, 12, 20, -4, 4)]);
exp('Right spandrel', 'Spandrel wall right of the arch. Exact form is schematic.');

// --- Dome: drum, merged shell, finial: 3 parts.
addPart('dome-drum', 'Dome drum', 'dome', [cyl(7.8, 8.2, 2.5, 0, 21.2, 0, 18)]);
exp('Dome drum', 'The drum of the 14.6 m central dome. Exact height is schematic.');
{
  for (let q = 0; q < 4; q++) {
    const shell = new THREE.SphereGeometry(7.3, 8, 8, (q / 4) * Math.PI * 2, Math.PI / 2, 0, Math.PI / 2.15);
    shell.scale(1, 1.25, 1);
    shell.translate(0, 20.5, 0);
    addPart(`dome-shell-${['ne', 'se', 'sw', 'nw'][q]}`, `Dome shell ${['NE', 'SE', 'SW', 'NW'][q]}`, 'dome', [shell]);
    exp(`Dome shell ${['NE', 'SE', 'SW', 'NW'][q]}`, `One quadrant of the central dome shell. Exact profile is schematic.`);
  }
}
addPart('dome-finial', 'Dome finial', 'dome', [cyl(0.25, 0.5, 3.2, 0, 30.5, 0, 8)]);
exp('Dome finial', 'The dome finial. Exact form is schematic.');

// --- Turrets: 4 merged turrets: 4 parts.
for (const [i, [tx, tz, nm]] of [[-16, -6, 'Northwest'], [16, -6, 'Northeast'], [-16, 6, 'Southwest'], [16, 6, 'Southeast']].entries()) {
  const mini = new THREE.SphereGeometry(1.9, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  mini.translate(tx, 18.6, tz);
  addPart(`turret-${i + 1}`, `${nm} turret`, 'turrets', [
    box(tx - 2.2, tx + 2.2, 2, 8, tz - 2.2, tz + 2.2),
    cyl(1.5, 1.8, 10, tx, 13, tz, 10),
    cyl(2.3, 2.3, 0.7, tx, 18.3, tz, 10),
    mini,
  ]);
  exp(`${nm} turret`, `The ${nm.toLowerCase()} corner turret, merged into one part. Exact form is schematic.`);
}

// --- Side halls merged: 2 parts.
for (const [side, sname] of [[-1, 'West'], [1, 'East']]) {
  const hx = side * 19;
  addPart(`${sname.toLowerCase()}-hall`, `${sname} hall`, 'side-halls', [
    box(hx - 5, hx + 5, 2, 9, -9.5, -8),
    box(hx - 5, hx + 5, 2, 9, 8, 9.5),
    box(hx + side * 4.2, hx + side * 5.8, 2, 9, -9.5, 9.5),
    box(hx - 5.5, hx + 5.5, 9, 10, -10, 10),
  ]);
  exp(`${sname} hall`, `The ${sname.toLowerCase()} side hall, merged into one part. Exact interior is schematic.`);
}

// --- Facade: jali band, cornice, medallions merged: 3 parts.
{
  const jalis = [];
  for (let i = 0; i < 8; i++) jalis.push(box(-15.2 + i * 4, -12.8 + i * 4, 13, 17, 4.05, 4.35));
  addPart('jali-band', 'Jali latticework band', 'facade', jalis);
  exp('Jali latticework band', 'Carved stone latticework panels, merged into one part. Exact patterns are schematic.');
}
addPart('main-cornice', 'Main cornice', 'facade', [box(-24, 24, 19.2, 20, -5, 5)]);
exp('Main cornice', 'The main cornice. Exact profile is schematic.');
{
  const meds = [];
  for (let i = 0; i < 4; i++) {
    const m = cyl(1.1, 1.1, 0.3, -9 + i * 6, 21.5, 4.1, 12);
    m.rotateX(Math.PI / 2);
    meds.push(m);
  }
  meds.push(box(-4, 4, 17.5, 19, 4.1, 4.35));
  addPart('facade-ornament', 'Medallions and inscription', 'facade', meds);
  exp('Medallions and inscription', 'Facade medallions and the commemorative inscription tablet, merged. Exact ornament is schematic.');
}

// --- Side arches merged: 2 parts.
for (const [key, nm, xs] of [['west', 'West', [-13.5, -22]], ['east', 'East', [13.5, 22]]]) {
  const arches = [];
  for (const sx of xs) {
    for (let i = 0; i < 6; i++) {
      const am = ((i + 0.5) / 6) * Math.PI;
      const g = new THREE.BoxGeometry(((Math.PI * 2.5) / 6) * 0.96, 1.1, 3);
      g.rotateZ(am + Math.PI / 2);
      g.translate(sx + Math.cos(am) * 2.5, 6 + Math.sin(am) * 2.5, 0);
      arches.push(g);
    }
  }
  addPart(`${key}-side-arches`, `${nm} side arches`, 'side-arches', arches);
  exp(`${nm} side arches`, `The ${nm.toLowerCase()} flanking arches, merged. Exact profiles are schematic.`);
}

// --- Platform: slab, steps, sea steps: 3 parts.
addPart('platform-slab', 'Platform slab', 'platform', [box(-25, 25, 0, 2, -12, 12)]);
exp('Platform slab', 'The raised stone platform. Exact buildup is schematic.');
{
  const steps = [];
  for (let s = 0; s < 3; s++) steps.push(box(-25 - (s + 1) * 1.5, 25 + (s + 1) * 1.5, -0.7 * (s + 1), -0.7 * s, -12 - (s + 1) * 1.2, 12 + (s + 1) * 1.2));
  addPart('platform-steps', 'Platform steps', 'platform', steps);
  exp('Platform steps', 'Steps up to the platform. Exact count is schematic.');
  addPart('harbor-steps', 'Harbor steps', 'platform', [box(-8, 8, -1.5, 0.5, 12, 18)]);
  exp('Harbor steps', 'Steps down to the Arabian Sea. Exact form is schematic.');
}
addPart('parapet-north', 'North parapet', 'parapets', [box(-24, 24, 20, 21.2, -5, -4.2)]);
exp('North parapet', 'The north parapet. Exact form is schematic.');
addPart('parapet-south', 'South parapet', 'parapets', [box(-24, 24, 20, 21.2, 4.2, 5)]);
exp('South parapet', 'The south parapet. Exact form is schematic.');

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'jali-band') return '#c9a86a';
  if (id === 'facade-ornament') return '#b8935a';
  if (id === 'arch-ring') return '#d4af6e';
  if (id.startsWith('dome-shell') || id === 'dome-drum') return '#d9b878';
  if (id === 'dome-finial') return '#8a6f3e';
  if (id.includes('steps') || id === 'platform-slab') return '#b99a68';
  return '#cfa96f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'central-arch', name: 'Central arch', color: '#cfa96f', description: 'The great arch: piers, merged ring, spandrels.' },
  { id: 'dome', name: 'Central dome', color: '#d9b878', description: 'Drum, merged shell and finial.' },
  { id: 'turrets', name: 'Corner turrets', color: '#cfa96f', description: 'The four turrets, each merged into one part.' },
  { id: 'side-halls', name: 'Side halls', color: '#cfa96f', description: 'The flanking halls, merged.' },
  { id: 'facade', name: 'Facade ornament', color: '#c9a86a', description: 'Jali band, cornice, medallions and inscription.' },
  { id: 'side-arches', name: 'Flanking arches', color: '#cfa96f', description: 'Smaller side arches, merged per side.' },
  { id: 'platform', name: 'Platform', color: '#b99a68', description: 'Platform, steps and harbor steps.' },
  { id: 'parapets', name: 'Parapets', color: '#c9a86a', description: 'Parapet walls.' },
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
const binName = 'gateway-of-india-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Gateway of India, Mumbai (simplified schematic)',
  title: 'Gateway of India',
  location: 'Mumbai, India',
  blurb: 'George Wittet\u2019s 1924 triumphal arch in simplified schematic form: a 26 m Indo-Saracenic gateway in yellow basalt with its central dome and four turrets.',
  sourceUrls: [
    { label: 'Wikipedia: Gateway of India', url: 'https://en.wikipedia.org/wiki/Gateway_of_India' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/gateway-of-india-simple/gateway-of-india-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
