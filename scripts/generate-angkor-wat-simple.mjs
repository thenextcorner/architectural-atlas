// Simplified schematic Angkor Wat for the Architectural Atlas.
//
// The "simple" variant of Angkor Wat: same footprint, massing and
// proportions as the detailed model (see scripts/generate-angkor-wat.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 32 named parts across 7 systems instead of 104 across 9. Gallery walls,
// corner towers, lions and devatas are merged into group parts; the
// quincunx keeps its five towers as two masses.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-angkor-wat.mjs for the full attribution):
//   largest religious monument in the world, 162.6 hectares; early 12th
//   century, Suryavarman II, dedicated to Vishnu then Buddhist;
//   temple-mountain plus galleried plan as Mount Meru; quincunx of five
//   lotus-bud towers, central spire 65 m; three rectangular galleries
//   each raised above the next; outer wall 3.6 km; moat 5 km, 190 m wide,
//   4 m deep, stabilizing the foundations; west orientation; stone
//   causeway with guardian lions; colonnades at each level; bas-reliefs
//   and devatas; steep central stair; Churning of the Ocean of Milk;
//   Cambodian flag; Tomb Raider (2001) filmed at Angkor (tree-root scenes
//   at Ta Prohm); In the Mood for Love (2000) final scene at Angkor Wat.
// Schematic (not sourced, never stated as fact in the UI): reduced-scale
// moat ring; all footprints, heights and positions; merged group
// geometry; simplified prasat profiles.
//
// Writes:
//   public/models/angkor-wat-simple/atlas.json
//   public/models/angkor-wat-simple/angkor-wat-simple-0.bin
//
// Usage: node scripts/generate-angkor-wat-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'angkor-wat-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~380 m with schematic moat) maps to 2.4
// units (same as detailed).
const S = 2.4 / 380;

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
function prasat(x, z, baseY, h, r) {
  const g = [];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers, t1 = (i + 1) / tiers;
    const r0 = r * (1 - 0.5 * t0), r1 = r * (1 - 0.5 * t1);
    const y0 = baseY + h * 0.72 * t0, y1 = baseY + h * 0.72 * t1;
    g.push(cyl(r1, r0, y1 - y0, x, (y0 + y1) / 2, z, 10));
  }
  const bud = new THREE.ConeGeometry(r * 0.45, h * 0.28, 10);
  bud.translate(x, baseY + h * 0.72 + h * 0.14, z);
  g.push(bud);
  return g;
}
function stairX(x0, x1, y0, y1, z0, z1, steps = 5) {
  const g = [];
  for (let s = 0; s < steps; s++) {
    const sx0 = x0 + ((x1 - x0) * s) / steps;
    const sx1 = x0 + ((x1 - x0) * (s + 1)) / steps;
    const sy1 = y0 + ((y1 - y0) * (s + 1)) / steps;
    g.push(box(sx0, sx1, y0, sy1, z0, z1));
  }
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Moat and causeways: 7 parts.
addPart('moat-north', 'Moat north', 'moat-causeway', [box(-186, 186, -2, 0, 120, 156)]);
addPart('moat-south', 'Moat south', 'moat-causeway', [box(-186, 186, -2, 0, -156, -120)]);
addPart('moat-west', 'Moat west', 'moat-causeway', [box(-186, -150, -2, 0, -120, 120)]);
addPart('moat-east', 'Moat east', 'moat-causeway', [box(150, 186, -2, 0, -120, 120)]);
addPart('west-causeway', 'West causeway', 'moat-causeway', [box(-186, -148, 0, 1, -6, 6)]);
addPart('naga-balustrades', 'Naga balustrades', 'moat-causeway', [
  box(-186, -148, 1, 2.1, 7, 8), box(-186, -148, 1, 2.1, -8, -7),
]);
{
  const lions = [];
  for (const [lx, lz] of [[-172, 10], [-172, -10], [-158, 10], [-158, -10]]) {
    lions.push(box(lx - 1, lx + 1, 1, 3, lz - 1.5, lz + 1.5));
    const head = new THREE.SphereGeometry(0.9, 8, 6);
    head.translate(lx, 3.6, lz);
    lions.push(head);
  }
  addPart('guardian-lions', 'Guardian lions', 'moat-causeway', lions);
}

// --- Outer enclosure: 4 parts.
{
  const walls = [
    box(-105, 105, 0, 4, 89, 91), box(-105, 105, 0, 4, -91, -89),
    box(104, 106, 0, 4, -90, 90), box(-106, -104, 0, 4, -90, 90),
  ];
  addPart('outer-walls', 'Outer walls', 'outer-enclosure', walls);
  const pavs = [];
  for (const [cx, cz] of [[-105, 90], [105, 90], [-105, -90], [105, -90]]) {
    pavs.push(box(cx - 4, cx + 4, 0, 6, cz - 4, cz + 4));
    pavs.push(...prasat(cx, cz, 6, 10, 3.5));
  }
  addPart('corner-pavilions', 'Corner pavilions', 'outer-enclosure', pavs);
  addPart('west-gopura', 'West gopura', 'outer-enclosure', [
    box(-112, -98, 0, 8, -10, 10), ...prasat(-105, 0, 8, 18, 5),
  ]);
  addPart('east-gopura', 'East gopura', 'outer-enclosure', [
    box(98, 112, 0, 6, -8, 8), ...prasat(105, 0, 6, 12, 4),
  ]);
}

// --- First gallery: 4 parts.
addPart('first-gallery-platform', 'First gallery platform', 'first-gallery', [box(-75, 75, 0, 4, -65, 65)]);
{
  const walls = [
    box(-75, 75, 4, 7, 64.25, 65.75), box(-75, 75, 4, 7, -65.75, -64.25),
    box(74.25, 75.75, 4, 7, -65, 65), box(-75.75, -74.25, 4, 7, -65, 65),
  ];
  addPart('first-gallery-walls', 'First gallery walls', 'first-gallery', walls);
  const towers = [];
  for (const [cx, cz] of [[-72, 62], [72, 62], [-72, -62], [72, -62]]) {
    towers.push(box(cx - 3, cx + 3, 4, 8, cz - 3, cz + 3));
    towers.push(...prasat(cx, cz, 8, 12, 3));
  }
  addPart('first-gallery-corner-towers', 'First gallery corner towers', 'first-gallery', towers);
  addPart('entrance-porches', 'Entrance porches', 'first-gallery', [
    box(-77, -73, 4, 9, -5, 5), box(73, 77, 4, 9, -5, 5),
    box(-5, 5, 4, 9, 63, 67), box(-5, 5, 4, 9, -67, -63),
  ]);
}

// --- Second gallery: 4 parts.
addPart('second-gallery-platform', 'Second gallery platform', 'second-gallery', [box(-55, 55, 4, 8, -48, 48)]);
{
  const walls = [
    box(-55, 55, 8, 11, 47.25, 48.75), box(-55, 55, 8, 11, -48.75, -47.25),
    box(54.25, 55.75, 8, 11, -48, 48), box(-55.75, -54.25, 8, 11, -48, 48),
  ];
  addPart('second-gallery-walls', 'Second gallery walls', 'second-gallery', walls);
  const towers = [];
  for (const [cx, cz] of [[-52, 45], [52, 45], [-52, -45], [52, -45]]) {
    towers.push(...prasat(cx, cz, 11, 10, 2.5));
  }
  addPart('second-gallery-corner-towers', 'Second gallery corner towers', 'second-gallery', towers);
  addPart('libraries', 'Libraries', 'second-gallery', [
    box(-21, -9, 4, 10, 28, 36), box(-21, -9, 4, 10, -36, -28),
  ]);
}

// --- Upper terrace and pyramid: 3 parts.
addPart('upper-terrace-platform', 'Upper terrace platform', 'upper-terrace', [box(-35, 35, 8, 12, -30, 30)]);
addPart('pyramid-tiers', 'Pyramid tiers', 'upper-terrace', [
  box(-28, 28, 12, 15, -24, 24), box(-20, 20, 15, 18, -17, 17), box(-13, 13, 18, 21, -11, 11),
]);
{
  const shrines = [];
  for (const [cx, cz] of [[-32, 27], [32, 27], [-32, -27], [32, -27]]) {
    shrines.push(...prasat(cx, cz, 12, 8, 2.5));
  }
  addPart('upper-corner-shrines', 'Upper corner shrines', 'upper-terrace', shrines);
}

// --- Central quincunx: 3 parts.
{
  const bud = new THREE.ConeGeometry(4.5, 9, 12);
  bud.translate(0, 56.5, 0);
  const orb = new THREE.SphereGeometry(1.5, 10, 8);
  orb.translate(0, 62, 0);
  addPart('central-tower', 'Central tower', 'central-quincunx', [
    box(-8, 8, 21, 24, -8, 8), cyl(6, 8, 14, 0, 31, 0, 12), cyl(4.5, 6, 14, 0, 45, 0, 12), bud, orb,
  ]);
}
{
  const sats = [];
  for (const [cx, cz] of [[-16, 14], [16, 14], [-16, -14], [16, -14]]) {
    sats.push(box(cx - 3, cx + 3, 18, 20, cz - 3, cz + 3));
    sats.push(cyl(2.5, 3.5, 12, cx, 26, cz, 10));
    const bud = new THREE.ConeGeometry(2.5, 6, 10);
    bud.translate(cx, 35, cz);
    sats.push(bud);
  }
  addPart('satellite-towers', 'Satellite towers', 'central-quincunx', sats);
}
addPart('lotus-buds', 'Lotus buds', 'central-quincunx', [
  (() => { const t = new THREE.SphereGeometry(0.7, 8, 6); t.translate(-16, 38.4, 14); return t; })(),
  (() => { const t = new THREE.SphereGeometry(0.7, 8, 6); t.translate(16, 38.4, 14); return t; })(),
  (() => { const t = new THREE.SphereGeometry(0.7, 8, 6); t.translate(-16, 38.4, -14); return t; })(),
  (() => { const t = new THREE.SphereGeometry(0.7, 8, 6); t.translate(16, 38.4, -14); return t; })(),
]);

// --- Stairs and reliefs: 4 parts.
addPart('grand-stairs', 'Grand stairs', 'stairs-reliefs', [
  ...stairX(-95, -75, 0, 4, -8, 8, 6),
  ...stairX(-65, -55, 4, 8, -6, 6, 5),
  ...stairX(-14, -8, 21, 38, -2.5, 2.5, 10),
]);
addPart('upper-terrace-stairs', 'Upper terrace stairs', 'stairs-reliefs', [
  ...stairX(-35, -28, 8, 12, -5, 5, 5), ...stairX(35, 28, 8, 12, -5, 5, 5),
]);
addPart('bas-relief-band', 'Bas-relief band', 'stairs-reliefs', [
  box(20, 60, 4.6, 6.8, 63.9, 64.25), box(-60, -20, 4.6, 6.8, 63.9, 64.25),
  box(-60, -20, 4.6, 6.8, -64.25, -63.9), box(20, 60, 4.6, 6.8, -64.25, -63.9),
]);
{
  const devs = [];
  for (const [dx, dz] of [[-40, 63.5], [0, 63.5], [40, 63.5], [-40, -63.5], [0, -63.5], [40, -63.5]]) {
    devs.push(cyl(0.5, 0.7, 2.2, dx, 5.6, dz, 8));
  }
  addPart('devatas', 'Devatas', 'stairs-reliefs', devs);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('moat-')) return '#5f7f8f';
  if (id.includes('causeway') || id.includes('naga')) return '#a8906c';
  if (id.includes('lions')) return '#9a8a6e';
  if (id.includes('gopura') || id.includes('pavilion')) return '#c4ad88';
  if (id.includes('tower') || id.includes('shrine') || id.includes('bud')) return '#cbb691';
  if (id === 'central-tower') return '#d3bd97';
  if (id.includes('pyramid')) return '#bfa67f';
  if (id.includes('platform') || id.includes('terrace')) return '#b39a7d';
  if (id.includes('wall')) return '#c8b295';
  if (id.includes('relief')) return '#bfa77f';
  if (id.includes('stair')) return '#a8906c';
  if (id.includes('devata')) return '#8f8578';
  if (id.includes('librar') || id.includes('porch')) return '#c0a983';
  return '#c8b295';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'moat-causeway', name: 'Moat and causeways', color: '#5f7f8f', description: 'The schematic moat ring (real: 190 m wide, 5 km perimeter), the west causeway with naga balustrades and guardian lions.' },
  { id: 'outer-enclosure', name: 'Outer enclosure', color: '#c8b295', description: 'The outer walls, corner pavilions and entrance gopuras.' },
  { id: 'first-gallery', name: 'First gallery', color: '#c8b295', description: 'The lowest raised gallery: platform, colonnade walls, corner towers and porches.' },
  { id: 'second-gallery', name: 'Second gallery', color: '#c0a983', description: 'The middle gallery with its walls, corner towers and libraries.' },
  { id: 'upper-terrace', name: 'Upper terrace and pyramid', color: '#bfa67f', description: 'The uppermost terrace with the three-tiered pyramid and corner shrines.' },
  { id: 'central-quincunx', name: 'Central quincunx', color: '#d3bd97', description: 'The five lotus-bud towers: the 65 m central spire and its four satellites.' },
  { id: 'stairs-reliefs', name: 'Stairs, reliefs and devatas', color: '#a8906c', description: 'Grand stairs, the bas-relief band and celestial dancer figures.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'moat north': 'Schematic north stretch of the moat; the real moat is 190 m wide, 4 m deep and over 5 km around, and stabilizes the foundations.',
  'moat south': 'Schematic south stretch of the moat, shown at reduced scale.',
  'moat west': 'Schematic west stretch of the moat at the main entrance.',
  'moat east': 'Schematic east stretch of the moat.',
  'west causeway': 'The stone causeway from the west, the main entrance axis; the temple faces west, unlike most Khmer temples. Exact width is schematic.',
  'naga balustrades': 'Schematic serpent balustrades lining the causeway. Exact form is schematic.',
  'guardian lions': 'Guardian lions marking the entrance across the causeway. Exact count and pose are schematic.',
  'outer walls': 'The schematic outer enclosure walls; the real wall is 3.6 km long.',
  'corner pavilions': 'Corner pavilions of the outer enclosure. Exact form is schematic.',
  'west gopura': 'The monumental west entrance tower on the main axis. Exact size is schematic.',
  'east gopura': 'The smaller east entrance tower. Exact size is schematic.',
  'first gallery platform': 'The raised platform of the first of three galleries, each raised above the next. Exact height is schematic.',
  'first gallery walls': 'The colonnade walls of the first gallery, lined with relief carvings. Exact segmentation is schematic.',
  'first gallery corner towers': 'Lotus-bud corner towers of the first gallery. Exact heights are schematic.',
  'entrance porches': 'Entrance porches through the first gallery walls. Exact form is schematic.',
  'second gallery platform': 'The raised platform of the second gallery. Exact height is schematic.',
  'second gallery walls': 'The colonnade walls of the second gallery. Exact segmentation is schematic.',
  'second gallery corner towers': 'Lotus-bud corner towers of the second gallery. Exact heights are schematic.',
  'libraries': 'The two free-standing libraries between the galleries. Exact form is schematic.',
  'upper terrace platform': 'The uppermost terrace carrying the central pyramid. Exact height is schematic.',
  'pyramid tiers': 'The three tiers of the central temple-mountain pyramid. Exact dimensions are schematic.',
  'upper corner shrines': 'Small shrines at the corners of the upper terrace. Exact form is schematic.',
  'central tower': 'The central lotus-bud spire, rising 65 m (213 ft) above the ground, entered by a steep staircase.',
  'satellite towers': 'The four satellite towers of the quincunx, symbolizing with the central spire the five peaks of Mount Meru. Exact heights are schematic.',
  'lotus buds': 'The lotus-bud crowns of the satellite towers. Exact profiles are schematic.',
  'grand stairs': 'The grand stairs between the levels, including the steep central tower stair. Exact step counts are schematic.',
  'upper terrace stairs': 'Stairs from the upper terrace to the pyramid. Exact layout is schematic.',
  'bas-relief band': 'The extensive bas-relief panels lining the gallery walls, including the Churning of the Ocean of Milk. Exact subjects are schematic.',
  'devatas': 'Devatas, the celestial dancers adorning the walls. Exact count and placement are schematic.',
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
const binName = 'angkor-wat-simple-0.bin';
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
  scope: 'Angkor Wat, Siem Reap, Cambodia (simple)',
  title: 'Angkor Wat',
  location: 'Siem Reap, Cambodia',
  blurb: 'The largest religious monument in the world in simplified schematic form: Suryavarman II\u2019s 12th-century temple-mountain with three raised galleries and a quincunx of five lotus-bud towers, the central spire rising 65 m.',
  sourceUrls: [
    { label: 'Wikipedia: Angkor Wat', url: 'https://en.wikipedia.org/wiki/Angkor_Wat' },
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
  chunks: [{ url: '/models/angkor-wat-simple/angkor-wat-simple-0.bin', bytes: offset }],
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
