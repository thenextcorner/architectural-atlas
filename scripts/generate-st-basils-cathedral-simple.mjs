// Simplified schematic St Basil's Cathedral for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-st-basils-cathedral.mjs, whose
// header lists every sourced dimension reused here), but coarser:
// 30 named parts across 6 systems instead of 111 across 6. Kokoshniki
// are merged per chapel, and chapels keep only body, dome and cross.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-st-basils-cathedral.mjs for the full attribution):
//   Cathedral of the Intercession on Red Square, 1555 to 1561, Ivan
//   the Terrible, Kazan 1552, consecrated 12 July 1561; Ivan Barma and
//   Postnik Yakovlev; 47.5 m maximum height (65 m historical per the
//   museum curator); tallest in Moscow until 1600; nine chapels on one
//   foundation, central Church of the Intercession 46 m tall inside on
//   64 sq m; tenth chapel 1588 over St Basil's grave; 10 domes;
//   octagonal core and cardinal chapels, cuboid diagonal chapels;
//   eight-pointed star plan; brick; 1,680 sq m; UNESCO 1990.
// Schematic (not sourced, never stated as fact in the UI): chapel
// positions and sizes; merged kokoshniki; dome profiles, colors and
// patterns; tent pitch; gallery and porch forms.
//
// Writes:
//   public/models/st-basils-cathedral-simple/atlas.json
//   public/models/st-basils-cathedral-simple/st-basils-cathedral-simple-0.bin
//
// Usage: node scripts/generate-st-basils-cathedral-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'st-basils-cathedral-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~47.5 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 48;

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
function onionDome(r, h, x, yBase, z, seg = 12) {
  const prof = [
    [0.001, 0.0], [0.55, 0.02], [0.85, 0.12], [1.0, 0.3],
    [0.95, 0.5], [0.75, 0.72], [0.45, 0.92], [0.18, 1.08], [0.001, 1.18],
  ];
  const pts = prof.map(([pr, py]) => new THREE.Vector2(pr * r, (py * h) / 1.18));
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(x, yBase, z);
  return g;
}
function kokoshnik(w, h, x, yBase, z, rotY) {
  const d = w * 0.5;
  const v = new Float32Array([
    -w / 2, 0, -d, w / 2, 0, -d, 0, h, -d,
    -w / 2, 0, d, w / 2, 0, d, 0, h, d,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  g.rotateY(rotY);
  g.translate(x, yBase, z);
  return g;
}
function cross(x, yBase, z, s = 1) {
  return [
    box(x - 0.12 * s, x + 0.12 * s, yBase, yBase + 2.2 * s, z - 0.12 * s, z + 0.12 * s),
    box(x - 0.7 * s, x + 0.7 * s, yBase + 1.3 * s, yBase + 1.7 * s, z - 0.12 * s, z + 0.12 * s),
  ];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

addPart('basement-platform', 'Basement platform', 'foundations', [box(-22, 22, 0, 3, -22, 22)]);

// --- Central church: tiers, tent, dome, cross, merged kokoshniki: 6 parts.
addPart('central-lower-tier', 'Central church lower tier', 'central-church', [cyl(7.5, 8, 10, 0, 8, 0)]);
addPart('central-upper-tier', 'Central church upper tier', 'central-church', [cyl(6, 7, 10, 0, 18, 0)]);
{
  const tent = new THREE.ConeGeometry(7.2, 18, 8);
  tent.translate(0, 32, 0);
  addPart('central-tent-roof', 'Central tent roof', 'central-church', [tent]);
}
addPart('central-onion-dome', 'Central onion dome', 'central-church', [onionDome(2.2, 4.5, 0, 41, 0)]);
addPart('central-cross', 'Central cross', 'central-church', cross(0, 45.5, 0, 1));
{
  const kokos = [];
  for (let tier = 0; tier < 2; tier++) {
    const yB = tier === 0 ? 13 : 23;
    const rad = tier === 0 ? 7.8 : 6.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      kokos.push(kokoshnik(3.4, 2.6, Math.cos(a) * rad, yB, Math.sin(a) * rad, -a + Math.PI / 2));
    }
  }
  addPart('central-kokoshniki', 'Central kokoshniki', 'central-church', kokos);
}

// --- Cardinal chapels: body+dome+cross and kokoshniki per chapel: 8 parts.
const CARDINALS = [
  { id: 'north', name: 'North', x: 0, z: -14 },
  { id: 'south', name: 'South', x: 0, z: 14 },
  { id: 'east', name: 'East', x: 14, z: 0 },
  { id: 'west', name: 'West', x: -14, z: 0 },
];
for (const c of CARDINALS) {
  addPart(`${c.id}-chapel`, `${c.name} chapel`, 'cardinal-chapels', [
    cyl(4.6, 5, 9, c.x, 7.5, c.z),
    cyl(3.2, 3.4, 4, c.x, 14, c.z),
    onionDome(3.4, 6.5, c.x, 16, c.z),
    ...cross(c.x, 22.5, c.z, 0.9),
  ]);
  const kokos = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kokos.push(kokoshnik(2.6, 2.0, c.x + Math.cos(a) * 4.9, 12, c.z + Math.sin(a) * 4.9, -a + Math.PI / 2));
  }
  addPart(`${c.id}-kokoshniki`, `${c.name} chapel kokoshniki`, 'cardinal-chapels', kokos);
}

// --- Diagonal chapels: body+dome+cross and kokoshniki per chapel: 8 parts.
const DIAGONALS = [
  { id: 'northeast', name: 'Northeast', x: 10, z: -10 },
  { id: 'northwest', name: 'Northwest', x: -10, z: -10 },
  { id: 'southeast', name: 'Southeast', x: 10, z: 10 },
  { id: 'southwest', name: 'Southwest', x: -10, z: 10 },
];
for (const c of DIAGONALS) {
  addPart(`${c.id}-chapel`, `${c.name} chapel`, 'diagonal-chapels', [
    box(c.x - 3.5, c.x + 3.5, 3, 12, c.z - 3.5, c.z + 3.5),
    cyl(2.4, 2.6, 3, c.x, 13.5, c.z),
    onionDome(2.6, 5, c.x, 15, c.z),
    ...cross(c.x, 20, c.z, 0.8),
  ]);
  const kokos = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kokos.push(kokoshnik(2.4, 1.8, c.x + Math.cos(a) * 3.8, 12, c.z + Math.sin(a) * 3.8, -a + Math.PI / 2));
  }
  addPart(`${c.id}-kokoshniki`, `${c.name} chapel kokoshniki`, 'diagonal-chapels', kokos);
}

// --- St Basil chapel: 1 part.
addPart('st-basil-chapel', 'St Basil chapel', 'st-basil-chapel', [
  box(14, 20, 3, 10, -18, -12),
  onionDome(2.2, 4.2, 17, 10, -15),
  ...cross(17, 14.2, -15, 0.7),
]);

// --- Gallery and porches: 6 parts.
addPart('gallery-north', 'North gallery', 'gallery', [box(-12, 12, 3, 7, -17, -13)]);
addPart('gallery-south', 'South gallery', 'gallery', [box(-12, 12, 3, 7, 13, 17)]);
addPart('gallery-east', 'East gallery', 'gallery', [box(13, 17, 3, 7, -12, 12)]);
addPart('gallery-west', 'West gallery', 'gallery', [box(-17, -13, 3, 7, -12, 12)]);
addPart('west-porch', 'West porch', 'gallery', [box(-24, -20, 3, 9, -4, 4)]);
addPart('south-porch', 'South porch', 'gallery', [box(-4, 4, 3, 9, 20, 24)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'central-onion-dome' || id === 'central-cross') return '#c9a227';
  if (id === 'central-tent-roof') return '#b03a2e';
  if (id === 'central-kokoshniki') return '#d4a373';
  if (id === 'central-lower-tier' || id === 'central-upper-tier') return '#e8ddc9';
  if (id === 'north-chapel') return '#b03a2e';
  if (id === 'south-chapel') return '#1f7a4d';
  if (id === 'east-chapel') return '#2471a3';
  if (id === 'west-chapel') return '#c9a227';
  if (id.includes('kokoshniki')) return '#d9c9a8';
  if (id.includes('chapel') && !id.includes('kokoshniki')) return '#e8ddc9';
  if (id === 'st-basil-chapel') return '#1f7a4d';
  if (id.includes('gallery') || id.includes('porch')) return '#d9cfae';
  if (id === 'basement-platform') return '#b0a58a';
  return '#e8ddc9';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundations', name: 'Basement platform', color: '#b0a58a', description: 'The single basement foundation platform carrying all nine chapels.' },
  { id: 'central-church', name: 'Church of the Intercession', color: '#e8ddc9', description: 'The central octagonal Church of the Intercession with its tent roof and gilded onion dome.' },
  { id: 'cardinal-chapels', name: 'Cardinal chapels', color: '#e8ddc9', description: 'The four larger octagonal side churches on the compass points, each with its own onion dome.' },
  { id: 'diagonal-chapels', name: 'Diagonal chapels', color: '#e8ddc9', description: 'The four smaller cuboid side churches on the diagonals, each with its own onion dome.' },
  { id: 'st-basil-chapel', name: 'Chapel of St Basil', color: '#1f7a4d', description: 'The tenth chapel, added in 1588 over the grave of St Basil the Blessed.' },
  { id: 'gallery', name: 'Gallery and porches', color: '#d9cfae', description: 'The vaulted connecting gallery and entrance porches linking the chapels.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'basement platform': 'The single basement foundation on which all nine chapels stand, covering about 1,680 sq m. Exact platform form is schematic.',
  'central church lower tier': 'The lower octagonal tier of the central Church of the Intercession. Exact tier heights are schematic.',
  'central church upper tier': 'The upper octagonal tier of the central church, 46 m tall inside with a floor of only 64 sq m. Exact tier heights are schematic.',
  'central tent roof': 'The tent (shatyor) roof of the central church, the towering octagonal pyramid at the heart of the composition. Exact pitch is schematic.',
  'central onion dome': 'The small gilded onion dome crowning the central tent. Dome colors are schematic.',
  'central cross': 'The cross atop the central church, reaching 47.5 m: the cathedral was Moscow\u2019s tallest building until the Ivan the Great Bell Tower overtook it in 1600. Exact cross form is schematic.',
  'central kokoshniki': 'The kokoshnik gables ringing the central church: decorative arched gables typical of Russian church architecture. Exact count and shapes are schematic.',
  'north chapel': 'The north side church, one of the four larger octagonal chapels on the compass points, with its onion dome and cross. Exact size and colors are schematic.',
  'north chapel kokoshniki': 'The kokoshnik gables of the north chapel. Exact count and shapes are schematic.',
  'south chapel': 'The south side church with its onion dome and cross. Exact size and colors are schematic.',
  'south chapel kokoshniki': 'The kokoshnik gables of the south chapel. Exact count and shapes are schematic.',
  'east chapel': 'The east side church with its onion dome and cross. Exact size and colors are schematic.',
  'east chapel kokoshniki': 'The kokoshnik gables of the east chapel. Exact count and shapes are schematic.',
  'west chapel': 'The west side church with its onion dome and cross. Exact size and colors are schematic.',
  'west chapel kokoshniki': 'The kokoshnik gables of the west chapel. Exact count and shapes are schematic.',
  'northeast chapel': 'The northeast side church, one of the four smaller cuboid diagonal chapels. Exact size and colors are schematic.',
  'northeast chapel kokoshniki': 'The kokoshnik gables of the northeast chapel. Exact count and shapes are schematic.',
  'northwest chapel': 'The northwest side church. Exact size and colors are schematic.',
  'northwest chapel kokoshniki': 'The kokoshnik gables of the northwest chapel. Exact count and shapes are schematic.',
  'southeast chapel': 'The southeast side church. Exact size and colors are schematic.',
  'southeast chapel kokoshniki': 'The kokoshnik gables of the southeast chapel. Exact count and shapes are schematic.',
  'southwest chapel': 'The southwest side church. Exact size and colors are schematic.',
  'southwest chapel kokoshniki': 'The kokoshnik gables of the southwest chapel. Exact count and shapes are schematic.',
  'st basil chapel': 'The tenth chapel, added in 1588 over the grave of St Basil the Blessed (Vasily), the holy fool whose shrine gave the whole cathedral its popular name. Exact form is schematic.',
  'north gallery': 'The north arm of the vaulted connecting gallery linking the chapels. Exact form is schematic.',
  'south gallery': 'The south arm of the connecting gallery. Exact form is schematic.',
  'east gallery': 'The east arm of the connecting gallery. Exact form is schematic.',
  'west gallery': 'The west arm of the connecting gallery. Exact form is schematic.',
  'west porch': 'The west entrance porch from Red Square. Exact form is schematic.',
  'south porch': 'The south entrance porch. Exact form is schematic.',
};

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
const binName = 'st-basils-cathedral-simple-0.bin';
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
  scope: "St Basil's Cathedral, Moscow (simplified schematic)",
  title: "St Basil's Cathedral",
  location: 'Moscow, Russia',
  blurb: 'The Cathedral of the Intercession on Red Square, built 1555 to 1561 for Ivan the Terrible, in simplified schematic form: nine chapels on one foundation around the tent-roofed central church, each with its onion dome.',
  sourceUrls: [
    { label: 'Wikipedia: Saint Basil\u2019s Cathedral', url: 'https://en.wikipedia.org/wiki/Saint_Basil%27s_Cathedral' },
    { label: 'uvisitrussia.com: interview with the Pokrovsky Cathedral chief curator', url: 'https://www.uvisitrussia.com/news/saint-basils-cathedral-moscow.html' },
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
  chunks: [{ url: '/models/st-basils-cathedral-simple/st-basils-cathedral-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
