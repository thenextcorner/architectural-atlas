// Simplified schematic Hall of Prayer for Good Harvests for the
// Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-hall-of-prayer-for-good-harvests.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 28 named parts across 6 systems instead of 107 across 7. Pillars,
// dougong sets, balustrades and spouts are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-hall-of-prayer-for-good-harvests.mjs for the full
// attribution):
//   Temple of Heaven, Beijing; 1420 Yongle (Great Sacrifice Hall), 1545
//   Jiajing circular triple-eaved rebuild, named Hall of Prayer for Good
//   Harvests 1752 (Qianlong); lightning fire 1889, rebuilt; 38 m high,
//   30-36 m diameter (modeled at 32 m); triple blue-tiled eaves, gilded
//   baoding knob; three-tiered marble terrace 6 m high with white marble
//   balustrades; all wood, no nails, mortise-and-tenon; 28 pillars: 4
//   Dragon Well (18.5 m, 1.2 m diameter; four seasons), 12 inner gold
//   (months), 12 outer eave (twelve watches); dougong shrinking layer by
//   layer; Thunder God pillar; 360 m Vermilion Steps Bridge; UNESCO 1998;
//   among China's most photographed structures.
// Schematic (not sourced, never stated as fact in the UI): terrace radii,
// pillar positions and heights beyond the Dragon Well pillars, dougong
// stacking, wall and door arrangement, roof pitches, merged group
// geometry.
//
// Writes:
//   public/models/hall-of-prayer-for-good-harvests-simple/atlas.json
//   public/models/hall-of-prayer-for-good-harvests-simple/hall-of-prayer-for-good-harvests-simple-0.bin
//
// Usage: node scripts/generate-hall-of-prayer-for-good-harvests-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'hall-of-prayer-for-good-harvests-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~52 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 52;

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
function stairZ(z0, z1, y0, y1, x0, x1, steps = 5) {
  const g = [];
  for (let s = 0; s < steps; s++) {
    const sz0 = z0 + ((z1 - z0) * s) / steps;
    const sz1 = z0 + ((z1 - z0) * (s + 1)) / steps;
    const sy1 = y0 + ((y1 - y0) * (s + 1)) / steps;
    g.push(box(x0, x1, y0, sy1, sz0, sz1));
  }
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const FY = 6;

// --- Terraces: 7 parts.
addPart('terrace-level-first', 'Terrace level first', 'marble-terraces', [cyl(26, 26.6, 2, 0, 1, 0, 36)]);
addPart('terrace-level-second', 'Terrace level second', 'marble-terraces', [cyl(22, 22.6, 2, 0, 3, 0, 36)]);
addPart('terrace-level-third', 'Terrace level third', 'marble-terraces', [cyl(18, 18.6, 2, 0, 5, 0, 36)]);
{
  const bal = [];
  for (const [r, y] of [[25.6, 2.55], [21.6, 4.55], [17.6, 6.55]]) {
    const t = new THREE.TorusGeometry(r, 0.28, 6, 36);
    t.rotateX(Math.PI / 2);
    t.translate(0, y, 0);
    bal.push(t);
  }
  addPart('balustrades', 'Balustrades', 'marble-terraces', bal);
}
addPart('terrace-stairs', 'Terrace stairs', 'marble-terraces', [
  ...stairZ(-32, -26, 0, 2, -3, 3, 5),
  ...stairZ(-27, -22, 2, 4, -3, 3, 5),
  ...stairZ(-22, -18, 4, 6, -3, 3, 5),
]);

// --- Pillars: 5 parts.
{
  const dw = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    dw.push(cyl(0.6, 0.6, 18.5, 2.83 * Math.cos(a), FY + 9.25, 2.83 * Math.sin(a), 10));
  }
  addPart('dragon-well-pillars', 'Dragon well pillars', 'pillars', dw);
}
{
  const inner = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    inner.push(cyl(0.5, 0.55, 14, 9 * Math.cos(a), FY + 7, 9 * Math.sin(a), 8));
  }
  addPart('gold-pillars-north', 'Gold pillars north', 'pillars', inner.slice(0, 6));
  addPart('gold-pillars-south', 'Gold pillars south', 'pillars', inner.slice(6, 12));
}
{
  const outer = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + Math.PI / 12;
    outer.push(cyl(0.45, 0.5, 10, 14.5 * Math.cos(a), FY + 5, 14.5 * Math.sin(a), 8));
  }
  addPart('eave-pillars-north', 'Eave pillars north', 'pillars', outer.slice(0, 6));
  addPart('eave-pillars-south', 'Eave pillars south', 'pillars', outer.slice(6, 12));
}

// --- Dougong: 2 parts.
{
  const lower = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + Math.PI / 12;
    const px = 14.5 * Math.cos(a), pz = 14.5 * Math.sin(a);
    lower.push(box(px - 1.1, px + 1.1, FY + 10, FY + 11.3, pz - 1.1, pz + 1.1));
  }
  addPart('dougong-lower-ring', 'Dougong lower ring', 'dougong-brackets', lower);
  const upper = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const px = 9 * Math.cos(a), pz = 9 * Math.sin(a);
    upper.push(box(px - 0.9, px + 0.9, FY + 20, FY + 21, pz - 0.9, pz + 0.9));
  }
  addPart('dougong-upper-ring', 'Dougong upper ring', 'dougong-brackets', upper);
}

// --- Walls: 4 parts.
{
  const quads = [[], [], [], []];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const mx = 14.5 * Math.cos(a + Math.PI / 12), mz = 14.5 * Math.sin(a + Math.PI / 12);
    const w = 2 * 14.5 * Math.sin(Math.PI / 12) * 0.92;
    const panel = box(-w / 2, w / 2, FY, FY + 8, -0.25, 0.25);
    panel.rotateY(-(a + Math.PI / 12) + Math.PI / 2);
    panel.translate(mx, 0, mz);
    quads[Math.floor(i / 3)].push(panel);
  }
  const names = ['north', 'east', 'south', 'west'];
  quads.forEach((geoms, q) => {
    addPart(`wall-panels-${names[q]}`, `Wall panels ${names[q]}`, 'walls-doors', geoms);
  });
}

// --- Roofs: 7 parts.
addPart('eave-lower', 'Eave lower', 'roofs', [cyl(12, 20, 6, 0, FY + 13, 0, 20)]);
addPart('eave-middle', 'Eave middle', 'roofs', [cyl(8, 14, 5, 0, FY + 18.5, 0, 20)]);
addPart('eave-upper', 'Eave upper', 'roofs', [cyl(2, 9, 7, 0, FY + 24.5, 0, 20)]);
{
  const fascia = [];
  for (const [r, y] of [[20, FY + 10], [14, FY + 16], [9, FY + 21]]) {
    const t = new THREE.TorusGeometry(r, 0.33, 6, 32);
    t.rotateX(Math.PI / 2);
    t.translate(0, y, 0);
    fascia.push(t);
  }
  addPart('fascia-rings', 'Fascia rings', 'roofs', fascia);
}
{
  const spouts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const sx = 19.4 * Math.cos(a), sz = 19.4 * Math.sin(a);
    spouts.push(box(sx - 0.3, sx + 0.3, FY + 9.4, FY + 10.2, sz - 0.3, sz + 0.3));
  }
  addPart('drainage-spouts', 'Drainage spouts', 'roofs', spouts);
}
{
  const knob = new THREE.SphereGeometry(1.1, 10, 8);
  knob.translate(0, 36.6, 0);
  addPart('gilded-baoding', 'Gilded baoding', 'roofs', [knob, cyl(0.35, 0.35, 3.4, 0, 35, 0, 8)]);
}

// --- Interior and approach: 3 parts.
addPart('vaulted-dome', 'Vaulted dome', 'dome-interior', [cyl(2, 12, 18, 0, FY + 25, 0, 20)]);
addPart('marble-floor-altar', 'Marble floor and altar', 'dome-interior', [
  cyl(16, 16, 0.5, 0, FY + 0.25, 0, 32), cyl(5, 5.5, 1, 0, FY + 1, 0, 16),
]);
addPart('vermilion-steps-approach', 'Vermilion steps approach', 'dome-interior', [
  box(-4, 4, 0, 1.2, -70, -32),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('eave') && !id.includes('pillar')) return '#2e4a7a';
  if (id.includes('fascia') || id.includes('spout')) return '#3a5a8a';
  if (id.includes('pillar')) return '#a83a2a';
  if (id.includes('dougong')) return '#8a4a30';
  if (id.includes('wall')) return '#7a5a3a';
  if (id.includes('terrace') || id.includes('balustrade') || id.includes('stair')) return '#e8e4da';
  if (id.includes('floor') || id.includes('altar')) return '#ded9cc';
  if (id.includes('dome')) return '#6a4a34';
  if (id.includes('baoding')) return '#c9a227';
  if (id.includes('vermilion')) return '#b09080';
  return '#a83a2a';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'marble-terraces', name: 'Marble terraces', color: '#e8e4da', description: 'The three-tiered marble terrace, 6 m high, with its white marble balustrades and stairs.' },
  { id: 'pillars', name: 'Pillars', color: '#a83a2a', description: 'The 28 wooden pillars: 4 Dragon Well (seasons), 12 gold (months), 12 eave (watches).' },
  { id: 'dougong-brackets', name: 'Dougong brackets', color: '#8a4a30', description: 'The layered interlocking bracket rings, assembled without nails.' },
  { id: 'walls-doors', name: 'Walls', color: '#7a5a3a', description: 'The circular timber wall panels. Arrangement is schematic.' },
  { id: 'roofs', name: 'Roofs and finial', color: '#2e4a7a', description: 'The triple blue-tiled eaves, fascia rings, spouts and the gilded baoding knob.' },
  { id: 'dome-interior', name: 'Dome, floor and approach', color: '#6a4a34', description: 'The vaulted dome, marble floor and altar, and the Vermilion Steps approach.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'terrace level first': 'The lowest marble terrace level; the three tiers rise 6 m in total. Radius is schematic.',
  'terrace level second': 'The middle marble terrace level. Radius is schematic.',
  'terrace level third': 'The top marble terrace level carrying the hall. Radius is schematic.',
  'balustrades': 'The carved white marble balustrades edging the terrace levels. Segmentation is schematic.',
  'terrace stairs': 'The south stairs between terrace levels. Width and step counts are schematic.',
  'dragon well pillars': 'The four central Dragon Well pillars, 18.5 m high and 1.2 m in diameter, read as the four seasons.',
  'gold pillars north': 'Six of the twelve inner gold pillars (the months of the year), north half. Heights are schematic.',
  'gold pillars south': 'Six of the twelve inner gold pillars, south half. Heights are schematic.',
  'eave pillars north': 'Six of the twelve outer eave pillars (the twelve watches of the day), north half. Heights are schematic.',
  'eave pillars south': 'Six of the twelve outer eave pillars, south half. Heights are schematic.',
  'dougong lower ring': 'The lower ring of interlocking dougong brackets, no nails, stepping inward layer by layer. Stacking is schematic.',
  'dougong upper ring': 'The upper ring of dougong brackets toward the dome. Stacking is schematic.',
  'eave lower': 'The lowest blue-tiled eave; the tiles symbolize the sky. Pitch is schematic.',
  'eave middle': 'The middle blue-tiled eave. Pitch is schematic.',
  'eave upper': 'The upper blue-tiled eave rising to the gilded knob at 38 m. Pitch is schematic.',
  'fascia rings': 'The fascia rings edging the three eaves. Profiles are schematic.',
  'drainage spouts': 'Schematic rainwater spouts on the lower eave.',
  'gilded baoding': 'The gilded baoding knob crowning the roof at 38 m, on its supporting pillar.',
  'vaulted dome': 'The vaulted dome carried by the 28 pillars, converging to the apex; the timber frame uses mortise-and-tenon joints, no nails.',
  'marble floor and altar': 'The marble floor and central altar platform. Forms are schematic.',
  'vermilion steps approach': 'Schematic approach of the 360 m Vermilion Steps Bridge to the Imperial Vault of Heaven. Shown shortened.',
};
for (const q of ['north', 'east', 'south', 'west']) {
  explanations[`wall panels ${q}`] = `The timber wall panels of the ${q} quadrant. Arrangement is schematic.`;
}

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
const binName = 'hall-of-prayer-for-good-harvests-simple-0.bin';
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
  scope: 'Hall of Prayer for Good Harvests, Beijing (simple)',
  title: 'Hall of Prayer for Good Harvests',
  location: 'Beijing, China',
  blurb: 'The Temple of Heaven\u2019s great circular hall in simplified schematic form: a 38 m triple-eaved timber hall without nails on a three-tiered marble terrace.',
  sourceUrls: [
    { label: 'Wikipedia: Temple of Heaven', url: 'http://en.wikipedia.org/wiki/Temple_of_Heaven' },
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
  chunks: [{ url: '/models/hall-of-prayer-for-good-harvests-simple/hall-of-prayer-for-good-harvests-simple-0.bin', bytes: offset }],
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
