// Procedural St Basil's Cathedral for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned St Basil's Cathedral in
// code and writes it in the atlas binary format:
//   public/models/st-basils-cathedral/atlas.json
//   public/models/st-basils-cathedral/st-basils-cathedral-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Orthodox cathedral on Red Square, Moscow; officially the Cathedral
//   of the Intercession of the Most Holy Theotokos on the Moat
//   (Pokrovsky Cathedral); built 1555 to 1561 on the orders of Ivan
//   the Terrible to commemorate the capture of Kazan (1552) and
//   Astrakhan; consecrated 12 July 1561; architects Ivan Barma and
//   Postnik Yakovlev (names recovered in the 19th century from a
//   17th-century manuscript); maximum height 47.5 m (156 ft) per modern
//   listings, while the cathedral museum's curator cites 65 m as the
//   historical height, consistent with the Ivan the Great Bell Tower
//   (1600) overtaking it by 16 m; the city's tallest building until
//   1600; nine chapels on a single foundation: eight side churches
//   around the central Church of the Intercession, whose interior is
//   46 m tall with a floor of only 64 sq m; a tenth chapel added in
//   1588 over the grave of St Basil the Blessed, giving the cathedral
//   its popular name; 10 domes; the central core and the four larger
//   side churches on the compass points are octagonal, the four
//   diagonal smaller churches cuboid; plan forms an eight-pointed star;
//   built of brick, then a new material for Russian churches;
//   1,680 sq m footprint; UNESCO World Heritage (Kremlin and Red
//   Square) 1990; voted one of the Seven Wonders of Russia in a 2008
//   poll; one of the most popular cultural symbols of Russia.
//   (Sources: Wikipedia "Saint Basil's Cathedral"; uvisitrussia.com
//   interview with the Pokrovsky Cathedral chief curator;
//   catholicshrinebasilica.com; historytools.org; mapsofworld.com;
//   the-landmark.fandom.com.)
// Schematic (not sourced, never stated as fact in the UI): exact
// chapel positions, sizes and heights; kokoshnik counts and shapes;
// onion dome profiles and their painted colors and patterns (the real
// domes carry varied red, green, gold and blue patterns); tent roof
// pitch; gallery and porch forms; cross designs; the 65 m historical
// height is cited per the museum curator but the model uses the
// modern 47.5 m figure.
//
// Coordinate frame: x = east-west (Red Square is to the west, -x),
// z = north-south, y = up. All dimensions in meters.
//
// Granularity: ~110 named parts across 6 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-st-basils-cathedral.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'st-basils-cathedral');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~47.5 m) maps to 2.4 units.
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
// Onion dome via lathe: radius r, height h, base at yBase.
function onionDome(r, h, x, yBase, z, seg = 16) {
  const prof = [
    [0.001, 0.0], [0.55, 0.02], [0.85, 0.12], [1.0, 0.3],
    [0.95, 0.5], [0.75, 0.72], [0.45, 0.92], [0.18, 1.08], [0.001, 1.18],
  ];
  const pts = prof.map(([pr, py]) => new THREE.Vector2(pr * r, (py * h) / 1.18));
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(x, yBase, z);
  return g;
}
// Kokoshnik: small arched gable (triangular prism) of width w and height
// h, centered at (x, z), base at yBase, facing outward at angle rotY.
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

// --- Foundations: basement platform: 1 part.
addPart('basement-platform', 'Basement platform', 'foundations', [box(-22, 22, 0, 3, -22, 22)]);

// --- Central Church of the Intercession: octagonal two-tier body, tent
// roof, onion dome, cross, 16 kokoshniki: 21 parts.
addPart('central-lower-tier', 'Central church lower tier', 'central-church', [cyl(7.5, 8, 10, 0, 8, 0)]);
addPart('central-upper-tier', 'Central church upper tier', 'central-church', [cyl(6, 7, 10, 0, 18, 0)]);
{
  const tent = new THREE.ConeGeometry(7.2, 18, 8);
  tent.translate(0, 32, 0);
  addPart('central-tent-roof', 'Central tent roof', 'central-church', [tent]);
}
addPart('central-onion-dome', 'Central onion dome', 'central-church', [onionDome(2.2, 4.5, 0, 41, 0)]);
addPart('central-cross', 'Central cross', 'central-church', cross(0, 45.5, 0, 1));
for (let tier = 0; tier < 2; tier++) {
  const yB = tier === 0 ? 13 : 23;
  const rad = tier === 0 ? 7.8 : 6.4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    addPart(`central-kokoshnik-${tier + 1}-${i + 1}`, `Central kokoshnik tier ${tier + 1} gable ${i + 1}`, 'central-church', [
      kokoshnik(3.4, 2.6, Math.cos(a) * rad, yB, Math.sin(a) * rad, -a + Math.PI / 2),
    ]);
  }
}

// --- Four cardinal chapels (large, octagonal): body, drum, dome,
// cross, 8 kokoshniki each: 48 parts.
const CARDINALS = [
  { id: 'north', name: 'North', x: 0, z: -14, color: '#b03a2e' },
  { id: 'south', name: 'South', x: 0, z: 14, color: '#1f7a4d' },
  { id: 'east', name: 'East', x: 14, z: 0, color: '#2471a3' },
  { id: 'west', name: 'West', x: -14, z: 0, color: '#b9770e' },
];
for (const c of CARDINALS) {
  addPart(`${c.id}-chapel-body`, `${c.name} chapel body`, 'cardinal-chapels', [cyl(4.6, 5, 9, c.x, 7.5, c.z)]);
  addPart(`${c.id}-chapel-drum`, `${c.name} chapel drum`, 'cardinal-chapels', [cyl(3.2, 3.4, 4, c.x, 14, c.z)]);
  addPart(`${c.id}-chapel-dome`, `${c.name} chapel onion dome`, 'cardinal-chapels', [onionDome(3.4, 6.5, c.x, 16, c.z)]);
  addPart(`${c.id}-chapel-cross`, `${c.name} chapel cross`, 'cardinal-chapels', cross(c.x, 22.5, c.z, 0.9));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    addPart(`${c.id}-kokoshnik-${i + 1}`, `${c.name} chapel kokoshnik ${i + 1}`, 'cardinal-chapels', [
      kokoshnik(2.6, 2.0, c.x + Math.cos(a) * 4.9, 12, c.z + Math.sin(a) * 4.9, -a + Math.PI / 2),
    ]);
  }
}

// --- Four diagonal chapels (small, cuboid): body, drum, dome, cross,
// 4 kokoshniki each: 32 parts.
const DIAGONALS = [
  { id: 'northeast', name: 'Northeast', x: 10, z: -10, color: '#7d3c98' },
  { id: 'northwest', name: 'Northwest', x: -10, z: -10, color: '#b03a2e' },
  { id: 'southeast', name: 'Southeast', x: 10, z: 10, color: '#1f7a4d' },
  { id: 'southwest', name: 'Southwest', x: -10, z: 10, color: '#2471a3' },
];
for (const c of DIAGONALS) {
  addPart(`${c.id}-chapel-body`, `${c.name} chapel body`, 'diagonal-chapels', [box(c.x - 3.5, c.x + 3.5, 3, 12, c.z - 3.5, c.z + 3.5)]);
  addPart(`${c.id}-chapel-drum`, `${c.name} chapel drum`, 'diagonal-chapels', [cyl(2.4, 2.6, 3, c.x, 13.5, c.z)]);
  addPart(`${c.id}-chapel-dome`, `${c.name} chapel onion dome`, 'diagonal-chapels', [onionDome(2.6, 5, c.x, 15, c.z)]);
  addPart(`${c.id}-chapel-cross`, `${c.name} chapel cross`, 'diagonal-chapels', cross(c.x, 20, c.z, 0.8));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addPart(`${c.id}-kokoshnik-${i + 1}`, `${c.name} chapel kokoshnik ${i + 1}`, 'diagonal-chapels', [
      kokoshnik(2.4, 1.8, c.x + Math.cos(a) * 3.8, 12, c.z + Math.sin(a) * 3.8, -a + Math.PI / 2),
    ]);
  }
}

// --- St Basil chapel (10th, 1588, northeast): body, dome, cross: 3 parts.
addPart('st-basil-chapel-body', 'St Basil chapel body', 'st-basil-chapel', [box(14, 20, 3, 10, -18, -12)]);
addPart('st-basil-chapel-dome', 'St Basil chapel dome', 'st-basil-chapel', [onionDome(2.2, 4.2, 17, 10, -15)]);
addPart('st-basil-chapel-cross', 'St Basil chapel cross', 'st-basil-chapel', cross(17, 14.2, -15, 0.7));

// --- Connecting gallery: 4 segments: 4 parts.
addPart('gallery-north', 'North gallery', 'gallery', [box(-12, 12, 3, 7, -17, -13)]);
addPart('gallery-south', 'South gallery', 'gallery', [box(-12, 12, 3, 7, 13, 17)]);
addPart('gallery-east', 'East gallery', 'gallery', [box(13, 17, 3, 7, -12, 12)]);
addPart('gallery-west', 'West gallery', 'gallery', [box(-17, -13, 3, 7, -12, 12)]);

// --- Porches: 2 parts.
addPart('west-porch', 'West porch', 'gallery', [box(-24, -20, 3, 9, -4, 4)]);
addPart('south-porch', 'South porch', 'gallery', [box(-4, 4, 3, 9, 20, 24)]);

// ---------------------------------------------------------------- colors
// Schematic bright palette echoing the cathedral's famous polychromy;
// exact painted patterns are not modeled.
function colorFor(id) {
  if (id === 'central-onion-dome') return '#c9a227';
  if (id === 'central-tent-roof') return '#b03a2e';
  if (id.includes('central-') && id.includes('kokoshnik')) return '#d4a373';
  if (id === 'central-lower-tier' || id === 'central-upper-tier') return '#e8ddc9';
  if (id === 'north-chapel-dome') return '#b03a2e';
  if (id === 'south-chapel-dome') return '#1f7a4d';
  if (id === 'east-chapel-dome') return '#2471a3';
  if (id === 'west-chapel-dome') return '#c9a227';
  if (id.includes('cardinal-chapels') && id.includes('-dome')) return '#b03a2e';
  if (id.includes('-chapel-body') || id.includes('-chapel-drum')) return '#e8ddc9';
  if (id.includes('-chapel-dome')) return '#b03a2e';
  if (id.includes('kokoshnik')) return '#d9c9a8';
  if (id.includes('-cross') || id === 'central-cross') return '#c9a227';
  if (id.includes('gallery') || id.includes('porch')) return '#d9cfae';
  if (id === 'basement-platform') return '#b0a58a';
  if (id === 'st-basil-chapel-dome') return '#1f7a4d';
  return '#e8ddc9';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundations', name: 'Basement platform', color: '#b0a58a', description: 'The single basement foundation platform carrying all nine chapels.' },
  { id: 'central-church', name: 'Church of the Intercession', color: '#e8ddc9', description: 'The central octagonal Church of the Intercession, 46 m tall inside, with its tent roof and gilded onion dome.' },
  { id: 'cardinal-chapels', name: 'Cardinal chapels', color: '#e8ddc9', description: 'The four larger octagonal side churches on the compass points, each with its own onion dome.' },
  { id: 'diagonal-chapels', name: 'Diagonal chapels', color: '#e8ddc9', description: 'The four smaller cuboid side churches on the diagonals, each with its own onion dome.' },
  { id: 'st-basil-chapel', name: 'Chapel of St Basil', color: '#1f7a4d', description: 'The tenth chapel, added in 1588 over the grave of St Basil the Blessed, which gave the cathedral its popular name.' },
  { id: 'gallery', name: 'Gallery and porches', color: '#d9cfae', description: 'The vaulted connecting gallery and entrance porches linking the chapels.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'basement platform': 'The single basement foundation on which all nine chapels stand, covering about 1,680 sq m. Exact platform form is schematic.',
  'central church lower tier': 'The lower octagonal tier of the central Church of the Intercession. The central church is 46 m tall inside with a floor of only 64 sq m. Exact tier heights are schematic.',
  'central church upper tier': 'The upper octagonal tier of the central church. Exact tier heights are schematic.',
  'central tent roof': 'The tent (shatyor) roof of the central church, the towering octagonal pyramid at the heart of the composition. Exact pitch is schematic.',
  'central onion dome': 'The small gilded onion dome crowning the central tent. Dome colors and patterns are schematic.',
  'central cross': 'The cross atop the central church, reaching 47.5 m: the cathedral was Moscow\u2019s tallest building until the Ivan the Great Bell Tower overtook it in 1600. Exact cross form is schematic.',
};
for (let t = 1; t <= 2; t++) {
  for (let i = 1; i <= 8; i++) {
    explanations[`central kokoshnik tier ${t} gable ${i}`] =
      `A kokoshnik gable of the central church, tier ${t}: the decorative arched gables ringing the octagon. Exact count and shapes are schematic.`;
  }
}
for (const c of CARDINALS) {
  const n = c.name.toLowerCase();
  explanations[`${n} chapel body`] = `The octagonal body of the ${n} side church, one of the four larger chapels on the compass points. Exact size is schematic.`;
  explanations[`${n} chapel drum`] = `The drum beneath the ${n} chapel\u2019s onion dome. Exact form is schematic.`;
  explanations[`${n} chapel onion dome`] = `The onion dome of the ${n} chapel. The real domes carry varied painted patterns in red, green, gold and blue; modeled colors are schematic.`;
  explanations[`${n} chapel cross`] = `The cross of the ${n} chapel. Exact form is schematic.`;
  for (let i = 1; i <= 8; i++) {
    explanations[`${n} chapel kokoshnik ${i}`] =
      `A kokoshnik gable of the ${n} chapel. Exact count and shapes are schematic.`;
  }
}
for (const c of DIAGONALS) {
  const n = c.name.toLowerCase();
  explanations[`${n} chapel body`] = `The cuboid body of the ${n} side church, one of the four smaller diagonal chapels. Exact size is schematic.`;
  explanations[`${n} chapel drum`] = `The drum beneath the ${n} chapel\u2019s onion dome. Exact form is schematic.`;
  explanations[`${n} chapel onion dome`] = `The onion dome of the ${n} chapel. Modeled colors are schematic.`;
  explanations[`${n} chapel cross`] = `The cross of the ${n} chapel. Exact form is schematic.`;
  for (let i = 1; i <= 4; i++) {
    explanations[`${n} chapel kokoshnik ${i}`] =
      `A kokoshnik gable of the ${n} chapel. Exact count and shapes are schematic.`;
  }
}
Object.assign(explanations, {
  'st basil chapel body': 'The body of the tenth chapel, added in 1588 over the grave of St Basil the Blessed (Vasily), the holy fool whose shrine gave the whole cathedral its popular name. Exact form is schematic.',
  'st basil chapel dome': 'The dome of the St Basil chapel. Modeled color is schematic.',
  'st basil chapel cross': 'The cross of the St Basil chapel. Exact form is schematic.',
  'north gallery': 'The north arm of the vaulted connecting gallery linking the chapels. The interior is a labyrinth of narrow vaulted corridors. Exact gallery form is schematic.',
  'south gallery': 'The south arm of the connecting gallery. Exact form is schematic.',
  'east gallery': 'The east arm of the connecting gallery. Exact form is schematic.',
  'west gallery': 'The west arm of the connecting gallery. Exact form is schematic.',
  'west porch': 'The west entrance porch from Red Square. Exact form is schematic.',
  'south porch': 'The south entrance porch. Exact form is schematic.',
});

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
const binName = 'st-basils-cathedral-0.bin';
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
  scope: "St Basil's Cathedral, Moscow",
  title: "St Basil's Cathedral",
  location: 'Moscow, Russia',
  blurb: 'The Cathedral of the Intercession on Red Square, built 1555 to 1561 for Ivan the Terrible. Explore the nine chapels on one foundation: the central tent-roofed Church of the Intercession ringed by eight side churches, each with its own onion dome.',
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
  chunks: [{ url: '/models/st-basils-cathedral/st-basils-cathedral-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
