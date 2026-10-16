// Procedural Sheikh Zayed Grand Mosque for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Sheikh Zayed Grand Mosque
// in code and writes it in the atlas binary format:
//   public/models/sheikh-zayed-grand-mosque/atlas.json
//   public/models/sheikh-zayed-grand-mosque/sheikh-zayed-grand-mosque-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Abu Dhabi, UAE; groundbreaking 1996, completed 20 December 2007;
//   architect Yusef Abdelki (Syrian); cost 2 billion dirhams
//   (US$545 million); 11-year build with 3,000+ workers; 420 m long,
//   290 m wide; capacity 40,000 to 41,000+ worshippers; 82 domes of seven
//   different sizes; main dome 85 m outer height, 32.2 m outer diameter
//   (32.8 m in some sources), 55 m interior height, the largest of its
//   kind per the Turkey Research Centre for Islamic History and Culture;
//   four minarets about 104 to 107 m high (104 m per Wikipedia, 106 to
//   107 m in other sources) combining Mamluk, Ottoman and Fatimid styles;
//   1,096 columns outside and 96 inside (some sources: 1,192 pillars
//   total), outer columns clad in 20,000+ marble panels inlaid with lapis
//   lazuli, red agate, amethyst, abalone and mother of pearl; 96 inner
//   columns inlaid with mother of pearl; main prayer hall carpet
//   5,627 sq m, 47 tons, 2,268,000,000 knots, hand-knotted by about 1,200
//   women to a design by Iranian artist Ali Khaliqi, the world's largest
//   hand-knotted carpet; seven crystal chandeliers, the largest 12 tonnes
//   with Swarovski crystals and 24-carat gold gilding; courtyard
//   (sahan) 17,000 sq m of floral marble mosaic; reflective pools
//   7,874 sq m; moon-phase lighting by Speirs + Major; white Macedonian
//   marble cladding.
// Schematic (not sourced, never stated as fact in the UI): exact dome
// positions and size-class assignment beyond the main dome; minaret
// profiles and balcony placement; column grid; prayer-hall wall
// subdivision; courtyard pattern; pool shapes; entrance portal forms;
// dome drum heights; finial shapes.
//
// Coordinate frame: y = up (ground = 0), x = length (420 m), z = width
// (290 m). All dimensions in meters.
//
// Granularity: ~110 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-sheikh-zayed-grand-mosque.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sheikh-zayed-grand-mosque');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (420 m) maps to 2.4 units.
const S = 2.4 / 420;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 16) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Onion dome: hemisphere-ish dome from a sphere segment plus a finial.
// r = dome radius, yBase = where the dome springs from, squash scales height.
function dome(r, yBase, x, z, squash = 1.15, seg = 20) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2 | 0), 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, squash, 1);
  g.translate(x, yBase, z);
  return g;
}
function finial(r, yBase, x, z) {
  const parts = [];
  parts.push(cyl(r * 0.12, r * 0.12, r * 1.1, x, yBase + r * 0.55, z, 8));
  const orb = new THREE.SphereGeometry(r * 0.22, 10, 8);
  orb.translate(x, yBase + r * 1.15, z);
  parts.push(orb);
  // crescent: torus arc
  const cres = new THREE.TorusGeometry(r * 0.3, r * 0.07, 8, 16, Math.PI * 1.5);
  cres.rotateZ(Math.PI * 0.75);
  cres.translate(x, yBase + r * 1.55, z);
  parts.push(cres);
  return parts;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const ROOF = 24; // main roof level

// --- Main prayer hall block: walls and roof: 4 parts.
addPart('prayer-hall-north-wall', 'Prayer hall north wall', 'prayer-hall', [box(-70, 70, 0, ROOF, 30, 38)]);
addPart('prayer-hall-south-wall', 'Prayer hall south wall', 'prayer-hall', [box(-70, 70, 0, ROOF, -38, -30)]);
addPart('prayer-hall-east-wall', 'Prayer hall east wall', 'prayer-hall', [box(62, 70, 0, ROOF, -30, 30)]);
addPart('prayer-hall-west-wall', 'Prayer hall west wall', 'prayer-hall', [box(-70, -62, 0, ROOF, -30, 30)]);
addPart('prayer-hall-roof', 'Prayer hall roof', 'prayer-hall', [box(-70, 70, ROOF - 1.5, ROOF, -38, 38)]);

// --- Main dome: drum, outer shell, finial: 3 parts.
addPart('main-dome-drum', 'Main dome drum', 'main-dome', [cyl(17, 17.5, 32, 0, ROOF + 16, 0, 24)]);
{
  const shell = dome(16.1, ROOF + 32, 0, 0, 1.15, 28);
  addPart('main-dome-shell', 'Main dome outer shell', 'main-dome', [shell]);
  addPart('main-dome-finial', 'Main dome finial and crescent', 'main-dome', finial(16.1, ROOF + 32 + 16.1 * 1.15, 0, 0));
}

// --- Four secondary domes (large): 4 parts.
const secondary = [[-48, 0], [48, 0], [0, -26], [0, 26]];
secondary.forEach(([x, z], i) => {
  const r = 10;
  addPart(`secondary-dome-${i + 1}`, `Secondary dome ${i + 1}`, 'domes', [
    cyl(r + 0.6, r + 1, 10, x, ROOF + 5, z, 18),
    dome(r, ROOF + 10, x, z, 1.15, 18),
    ...finial(r, ROOF + 10 + r * 1.15, x, z),
  ]);
});

// --- 77 small domes on the roof grid (schematic arrangement): 77 parts.
// Grid over the prayer-hall roof and side wings, skipping the centre.
let domeN = 0;
for (let gx = -6; gx <= 6; gx++) {
  for (let gz = -4; gz <= 4; gz++) {
    const x = gx * 19, z = gz * 15;
    if (Math.abs(x) < 75 && Math.abs(z) < 42) continue; // keep prayer-hall roof clear
    if (Math.abs(x) > 195 || Math.abs(z) > 130) continue;
    // skip where secondary domes and minarets stand
    if (secondary.some(([sx, sz]) => Math.abs(sx - x) < 20 && Math.abs(sz - z) < 20)) continue;
    domeN++;
    const r = 4.5 + ((gx + gz) % 3) * 0.8; // 4.5 to 6.1 m, schematic size variation
    const yB = 8; // on top of side-wing roofs
    addPart(`roof-dome-${domeN}`, `Roof dome ${domeN}`, 'domes', [
      cyl(r + 0.4, r + 0.7, 5, x, yB + 2.5, z, 12),
      dome(r, yB + 5, x, z, 1.15, 12),
      ...finial(r, yB + 5 + r * 1.15, x, z),
    ]);
    if (domeN >= 77) break;
  }
  if (domeN >= 77) break;
}

// --- Side wings carrying the small domes: 2 parts.
addPart('east-wing', 'East side wing', 'prayer-hall', [box(70, 200, 0, 8, -130, 130)]);
addPart('west-wing', 'West side wing', 'prayer-hall', [box(-200, -70, 0, 8, -130, 130)]);

// --- Four minarets: base, shaft, upper: 12 parts.
const minPos = [[-190, -125, 'southwest'], [190, -125, 'southeast'], [-190, 125, 'northwest'], [190, 125, 'northeast']];
minPos.forEach(([x, z, n]) => {
  const N = n[0].toUpperCase() + n.slice(1);
  addPart(`${n}-minaret-base`, `${N} minaret base`, 'minarets', [
    box(x - 8, x + 8, 0, 22, z - 8, z + 8),
  ]);
  addPart(`${n}-minaret-shaft`, `${N} minaret shaft`, 'minarets', [
    cyl(4.5, 6, 62, x, 22 + 31, z, 8),
  ]);
  addPart(`${n}-minaret-upper`, `${N} minaret upper and balconies`, 'minarets', [
    cyl(5.5, 5.5, 3, x, 86, z, 8),
    cyl(3.5, 4.5, 16, x, 95, z, 8),
    ...finial(4, 103, x, z),
  ]);
});

// --- Courtyard (sahan): slab and colonnade: 2 parts.
addPart('courtyard-slab', 'Courtyard marble slab', 'courtyard', [box(-200, 200, -0.5, 0, -140, 140)]);
{
  const cols = [];
  for (let x = -195; x <= 195; x += 15) {
    cols.push(cyl(0.9, 1.1, 12, x, 6, -138, 8));
    cols.push(cyl(0.9, 1.1, 12, x, 6, 138, 8));
  }
  for (let z = -120; z <= 120; z += 15) {
    cols.push(cyl(0.9, 1.1, 12, -198, 6, z, 8));
    cols.push(cyl(0.9, 1.1, 12, 198, 6, z, 8));
  }
  addPart('courtyard-colonnade', 'Courtyard colonnade', 'colonnades', cols);
  const arc = [];
  for (let x = -195; x <= 195; x += 15) {
    arc.push(box(x - 7.5, x + 7.5, 12, 14, -141, -135));
    arc.push(box(x - 7.5, x + 7.5, 12, 14, 135, 141));
  }
  addPart('courtyard-arcade', 'Courtyard arcade', 'colonnades', arc);
}

// --- Reflective pools: 2 parts.
addPart('north-pool', 'North reflective pool', 'pools', [box(-120, 120, -1.2, -0.4, 100, 128)]);
addPart('south-pool', 'South reflective pool', 'pools', [box(-120, 120, -1.2, -0.4, -128, -100)]);

// --- Entrances: main portal and side gates: 3 parts.
addPart('main-portal', 'Main entrance portal', 'entrances', [
  box(-14, 14, 0, 30, 38, 46),
  cyl(7, 7, 8, 0, 34, 42, 4),
]);
for (const [i, sx] of [[1, -1], [2, 1]]) {
  addPart(`side-gate-${i}`, `Side gate ${i}`, 'entrances', [
    box(sx * 100 - 8, sx * 100 + 8, 0, 16, -144, -136),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('dome') || id.includes('minaret')) return '#f4f1ea';
  if (id.includes('finial')) return '#c9a227';
  if (id.includes('wall') || id.includes('wing') || id.includes('portal') || id.includes('gate')) return '#efe9dc';
  if (id.includes('roof')) return '#e4dccb';
  if (id.includes('colonnade') || id.includes('arcade')) return '#f8f5ee';
  if (id.includes('courtyard-slab')) return '#e8e2d2';
  if (id.includes('pool')) return '#3d6b7a';
  return '#f4f1ea';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'main-dome', name: 'Main dome', color: '#f4f1ea', description: 'The 85 m main dome, the largest of its kind, on its drum with golden finial and crescent.' },
  { id: 'domes', name: 'Domes', color: '#f4f1ea', description: 'The remaining 81 white marble domes in seven sizes across the roofs.' },
  { id: 'minarets', name: 'Minarets', color: '#f4f1ea', description: 'Four minarets of about 104 to 107 m in mixed Mamluk, Ottoman and Fatimid styles.' },
  { id: 'prayer-hall', name: 'Prayer hall and wings', color: '#efe9dc', description: 'The main prayer hall block and the side wings carrying the smaller domes.' },
  { id: 'courtyard', name: 'Courtyard', color: '#e8e2d2', description: 'The 17,000 sq m marble sahan courtyard.' },
  { id: 'colonnades', name: 'Colonnades', color: '#f8f5ee', description: 'Arcaded colonnades around the courtyard, over a thousand columns in total.' },
  { id: 'pools', name: 'Reflective pools', color: '#3d6b7a', description: 'The dark-tiled reflective pools flanking the courtyard.' },
  { id: 'entrances', name: 'Entrances', color: '#efe9dc', description: 'The main portal and side gates.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'prayer hall north wall': 'North wall of the main prayer hall. Exact subdivision is schematic.',
  'prayer hall south wall': 'South wall of the main prayer hall. Exact subdivision is schematic.',
  'prayer hall east wall': 'East wall of the main prayer hall. Exact subdivision is schematic.',
  'prayer hall west wall': 'West wall of the main prayer hall. Exact subdivision is schematic.',
  'prayer hall roof': 'The prayer hall roof deck. Exact buildup is schematic.',
  'main dome drum': 'The drum carrying the main dome. Exact height is schematic.',
  'main dome outer shell': 'The main dome: 85 m outer height, 32.2 m diameter, clad in white Macedonian marble, the largest dome of its kind. Exact profile is schematic.',
  'main dome finial and crescent': 'The gilded finial and crescent crowning the main dome. Exact form is schematic.',
  'east side wing': 'The east wing roof carrying rows of smaller domes. Exact extent is schematic.',
  'west side wing': 'The west wing roof carrying rows of smaller domes. Exact extent is schematic.',
  'courtyard marble slab': 'The 17,000 sq m courtyard paved in floral white marble mosaic. Pattern is schematic.',
  'courtyard colonnade': 'The courtyard colonnade; the mosque has over a thousand outer columns clad in inlaid marble panels. Spacing here is schematic.',
  'courtyard arcade': 'The arcade entablature over the courtyard colonnade. Exact profile is schematic.',
  'north reflective pool': 'The north reflective pool (7,874 sq m of pools in total), its dark tiles mirroring the colonnade. Exact shape is schematic.',
  'south reflective pool': 'The south reflective pool. Exact shape is schematic.',
  'main entrance portal': 'The main entrance portal. Exact form is schematic.',
  'side gate 1': 'A side gate. Exact form is schematic.',
  'side gate 2': 'A side gate. Exact form is schematic.',
};
for (let i = 1; i <= 4; i++) {
  explanations[`secondary dome ${i}`] = `Secondary dome ${i} of four, in white marble with gilded finial. Exact size class is schematic.`;
}
for (let i = 1; i <= domeN; i++) {
  explanations[`roof dome ${i}`] = `Roof dome ${i} of ${domeN} smaller white marble domes across the wings; the mosque has 82 domes of seven sizes in total. Exact position and size are schematic.`;
}
for (const n of ['southwest', 'southeast', 'northwest', 'northeast']) {
  const N = n[0].toUpperCase() + n.slice(1);
  explanations[`${n} minaret base`] = `Base of the ${N} minaret; the four minarets stand about 104 to 107 m high. Exact profile is schematic.`;
  explanations[`${n} minaret shaft`] = `Tapered shaft of the ${N} minaret in mixed Mamluk, Ottoman and Fatimid styling. Exact profile is schematic.`;
  explanations[`${n} minaret upper and balconies`] = `Upper stage of the ${N} minaret with balconies for the call to prayer, crowned by a small dome and crescent. Exact form is schematic.`;
}

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
const binName = 'sheikh-zayed-grand-mosque-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Sheikh Zayed Grand Mosque, Abu Dhabi',
  title: 'Sheikh Zayed Grand Mosque',
  location: 'Abu Dhabi, UAE',
  blurb: 'The UAE\u2019s grand mosque, completed 2007: an 85 m main dome among 82 white marble domes, four 107 m minarets, and a marble courtyard for 40,000 worshippers.',
  sourceUrls: [
    { label: 'Wikipedia: Sheikh Zayed Grand Mosque', url: 'https://en.wikipedia.org/wiki/Sheikh_Zayed_Grand_Mosque' },
    { label: 'Sheikh Zayed Grand Mosque Centre', url: 'https://www.szgmc.gov.ae/' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/sheikh-zayed-grand-mosque/sheikh-zayed-grand-mosque-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
