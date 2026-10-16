// Procedural Hall of Prayer for Good Harvests for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Hall of Prayer for Good
// Harvests (the Temple of Heaven's great circular hall in Beijing) in
// code and writes it in the atlas binary format:
//   public/models/hall-of-prayer-for-good-harvests/atlas.json
//   public/models/hall-of-prayer-for-good-harvests/hall-of-prayer-for-good-harvests-0.bin
//
// Sourced dimensions and facts (verified via web search 2026-10-10):
//   the main building of the Temple of Heaven, Beijing; built 1420 in
//   the reign of the Ming Yongle Emperor as the rectangular Great
//   Sacrifice Hall; rebuilt as a circular triple-eaved hall in 1545
//   under the Jiajing Emperor and renamed the Hall of Great Synthesis,
//   finally named the Hall of Prayer for Good Harvests in 1752 under
//   the Qing Qianlong Emperor; burned down by lightning in 1889 and
//   rebuilt in the years after; 38 m high; diameter reported as 30 m
//   (Chinese Academy of Sciences), 32 m (several guides) and 36 m
//   (Wikipedia), modeled here at 32 m; triple eaves of deep blue glazed
//   tiles crowned with a gilded knob (baoding); built on a three-tiered
//   circular marble terrace 6 m high, each level edged with carved white
//   marble balustrades; the building is completely wooden, assembled
//   without nails using mortise-and-tenon joints; the vaulted dome is
//   carried by 28 massive wooden pillars: 4 central Dragon Well pillars
//   (18.5 m high, 1.2 m in diameter), 12 inner gold pillars and 12 outer
//   eave pillars; the four are read as the four seasons, the twelve as
//   the months of the year, the outer twelve as the twelve two-hour
//   watches of the day (other guides read all 28 as the 28
//   constellations); bracket sets (dougong) shrink layer by layer to
//   form the vaulted dome, converging at the apex where the gilded
//   finial sits on the Thunder God pillar; connected to the Imperial
//   Vault of Heaven by the 360 m Vermilion Steps Bridge; Temple of
//   Heaven inscribed as UNESCO World Heritage in 1998; the hall is among
//   the most photographed structures in China, a visual shorthand for
//   Beijing.
// Schematic (not sourced, never stated as fact in the UI): exact terrace
// radii and pillar positions; pillar heights beyond the Dragon Well
// pillars; dougong count per pillar and exact stacking; wall panel and
// door arrangement; roof pitches and eave overhangs; balustrade arc
// segmentation; stair widths and step counts; drainage spout count;
// interior floor, altar and ceiling caisson; the Vermilion Steps Bridge
// shown as a short schematic approach (real: 360 m).
//
// Coordinate frame: x = east-west, z = north-south (main stair and
// bridge approach on the south, -z), y = up. All dimensions in meters.
//
// Granularity: 107 named parts across 7 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-hall-of-prayer-for-good-harvests.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'hall-of-prayer-for-good-harvests');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~48 m incl. terrace) maps to 2.4 units.
const S = 2.4 / 52;

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
// Flat ring segment (annulus sector) for balustrades: torus arc laid flat.
function balArc(radius, y, a0, a1) {
  const g = new THREE.TorusGeometry(radius, 0.28, 8, 24, a1 - a0);
  g.rotateX(Math.PI / 2);
  g.rotateY(-a0);
  g.translate(0, y, 0);
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

const TERR = [
  { r: 26, y0: 0, y1: 2, n: 'first' },
  { r: 22, y0: 2, y1: 4, n: 'second' },
  { r: 18, y0: 4, y1: 6, n: 'third' },
];
const FY = 6; // hall floor level (terrace top)

// --- Marble terraces: three platforms, twelve balustrade arcs, three
// south stairs: 18 parts.
for (const t of TERR) {
  addPart(`terrace-level-${t.n}`, `Terrace level ${t.n}`, 'marble-terraces', [
    cyl(t.r, t.r + 0.6, t.y1 - t.y0, 0, (t.y0 + t.y1) / 2, 0, 48),
  ]);
  for (let a = 0; a < 4; a++) {
    const a0 = (a * Math.PI) / 2, a1 = ((a + 1) * Math.PI) / 2;
    const dir = ['east', 'north', 'west', 'south'][a];
    addPart(`balustrade-${t.n}-${dir}`, `Balustrade ${t.n} ${dir}`, 'marble-terraces', [
      balArc(t.r - 0.4, t.y1 + 0.55, a0, a1),
    ]);
  }
}
addPart('stair-terrace-1', 'Stair terrace 1', 'marble-terraces', stairZ(-32, -26, 0, 2, -3, 3, 5));
addPart('stair-terrace-2', 'Stair terrace 2', 'marble-terraces', stairZ(-27, -22, 2, 4, -3, 3, 5));
addPart('stair-terrace-3', 'Stair terrace 3', 'marble-terraces', stairZ(-22, -18, 4, 6, -3, 3, 5));

// --- Pillars: 4 Dragon Well (18.5 m, 1.2 m diameter, sourced), 12 inner
// gold, 12 outer eave: 28 parts.
for (let i = 0; i < 4; i++) {
  const a = (i * Math.PI) / 2 + Math.PI / 4;
  const px = 2.83 * Math.cos(a), pz = 2.83 * Math.sin(a);
  addPart(`dragon-well-pillar-${i + 1}`, `Dragon well pillar ${i + 1}`, 'pillars', [
    cyl(0.6, 0.6, 18.5, px, FY + 9.25, pz, 12),
  ]);
}
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  const px = 9 * Math.cos(a), pz = 9 * Math.sin(a);
  addPart(`gold-pillar-${i + 1}`, `Gold pillar ${i + 1}`, 'pillars', [
    cyl(0.5, 0.55, 14, px, FY + 7, pz, 10),
  ]);
}
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6 + Math.PI / 12;
  const px = 14.5 * Math.cos(a), pz = 14.5 * Math.sin(a);
  addPart(`eave-pillar-${i + 1}`, `Eave pillar ${i + 1}`, 'pillars', [
    cyl(0.45, 0.5, 10, px, FY + 5, pz, 10),
  ]);
}

// --- Dougong bracket sets: twelve lower on the eave pillars, twelve
// upper on the inner pillars, each a shrinking stack: 24 parts.
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6 + Math.PI / 12;
  const px = 14.5 * Math.cos(a), pz = 14.5 * Math.sin(a);
  addPart(`dougong-lower-${i + 1}`, `Dougong lower ${i + 1}`, 'dougong-brackets', [
    box(px - 1.1, px + 1.1, FY + 10, FY + 10.5, pz - 1.1, pz + 1.1),
    box(px - 0.8, px + 0.8, FY + 10.5, FY + 11, pz - 0.8, pz + 0.8),
    box(px - 1.3, px + 1.3, FY + 11, FY + 11.3, pz - 0.35, pz + 0.35),
  ]);
}
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  const px = 9 * Math.cos(a), pz = 9 * Math.sin(a);
  addPart(`dougong-upper-${i + 1}`, `Dougong upper ${i + 1}`, 'dougong-brackets', [
    box(px - 0.9, px + 0.9, FY + 20, FY + 20.5, pz - 0.9, pz + 0.9),
    box(px - 0.65, px + 0.65, FY + 20.5, FY + 21, pz - 0.65, pz + 0.65),
  ]);
}

// --- Walls and doors: twelve circular wall panels between the eave
// pillars: 12 parts.
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  const mx = 14.5 * Math.cos(a + Math.PI / 12), mz = 14.5 * Math.sin(a + Math.PI / 12);
  const w = 2 * 14.5 * Math.sin(Math.PI / 12) * 0.92;
  const panel = box(-w / 2, w / 2, FY, FY + 8, -0.25, 0.25);
  panel.rotateY(-(a + Math.PI / 12) + Math.PI / 2);
  panel.translate(mx, 0, mz);
  const isDoor = i % 3 === 0;
  const geoms = [panel];
  if (isDoor) {
    const frame = box(-1.4, 1.4, FY, FY + 5.4, -0.35, 0.35);
    frame.rotateY(-(a + Math.PI / 12) + Math.PI / 2);
    frame.translate(mx, 0, mz);
    geoms.push(frame);
  }
  addPart(`wall-panel-${i + 1}`, `Wall panel ${i + 1}${isDoor ? ' (door)' : ''}`, 'walls-doors', geoms);
}

// --- Roofs: three blue-tiled eave cones, three fascia rings, twelve
// drainage spouts: 18 parts.
addPart('eave-lower', 'Eave lower', 'roofs', [cyl(12, 20, 6, 0, FY + 13, 0, 24)]);
addPart('eave-middle', 'Eave middle', 'roofs', [cyl(8, 14, 5, 0, FY + 18.5, 0, 24)]);
addPart('eave-upper', 'Eave upper', 'roofs', [cyl(2, 9, 7, 0, FY + 24.5, 0, 24)]);
addPart('fascia-lower', 'Fascia lower', 'roofs', [
  (() => { const t = new THREE.TorusGeometry(20, 0.35, 8, 40); t.rotateX(Math.PI / 2); t.translate(0, FY + 10, 0); return t; })(),
]);
addPart('fascia-middle', 'Fascia middle', 'roofs', [
  (() => { const t = new THREE.TorusGeometry(14, 0.32, 8, 36); t.rotateX(Math.PI / 2); t.translate(0, FY + 16, 0); return t; })(),
]);
addPart('fascia-upper', 'Fascia upper', 'roofs', [
  (() => { const t = new THREE.TorusGeometry(9, 0.3, 8, 32); t.rotateX(Math.PI / 2); t.translate(0, FY + 21, 0); return t; })(),
]);
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  const sx = 19.4 * Math.cos(a), sz = 19.4 * Math.sin(a);
  addPart(`drainage-spout-${i + 1}`, `Drainage spout ${i + 1}`, 'roofs', [
    box(sx - 0.3, sx + 0.3, FY + 9.4, FY + 10.2, sz - 0.3, sz + 0.3),
  ]);
}

// --- Dome, finial, ceiling caisson: 4 parts.
addPart('vaulted-dome', 'Vaulted dome', 'dome-finial', [cyl(2, 12, 18, 0, FY + 25, 0, 24)]);
{
  const knob = new THREE.SphereGeometry(1.1, 12, 10);
  knob.translate(0, 36.6, 0);
  addPart('gilded-baoding', 'Gilded baoding', 'dome-finial', [knob]);
}
addPart('thunder-god-pillar', 'Thunder god pillar', 'dome-finial', [cyl(0.35, 0.35, 3.4, 0, 35, 0, 8)]);
addPart('dragon-well-caisson', 'Dragon well caisson', 'dome-finial', [
  cyl(6, 6, 0.8, 0, FY + 24.6, 0, 24),
]);

// --- Floor, altar, bridge approach: 3 parts.
addPart('marble-floor', 'Marble floor', 'floor-altar-approach', [cyl(16, 16, 0.5, 0, FY + 0.25, 0, 40)]);
addPart('altar-platform', 'Altar platform', 'floor-altar-approach', [cyl(5, 5.5, 1, 0, FY + 1, 0, 20)]);
addPart('vermilion-steps-approach', 'Vermilion steps approach', 'floor-altar-approach', [
  box(-4, 4, 0, 1.2, -70, -32),
]);

// ---------------------------------------------------------------- colors
// Vermilion pillars, deep blue tiles, white marble, gilded finial.
function colorFor(id) {
  if (id.includes('eave') && !id.includes('pillar')) return '#2e4a7a';
  if (id.includes('fascia')) return '#24406a';
  if (id.includes('spout')) return '#3a5a8a';
  if (id.includes('pillar')) return '#a83a2a';
  if (id.includes('dougong')) return '#8a4a30';
  if (id.includes('wall-panel')) return '#7a5a3a';
  if (id.includes('terrace') || id.includes('balustrade') || id.includes('stair')) return '#e8e4da';
  if (id.includes('floor') || id.includes('altar')) return '#ded9cc';
  if (id.includes('dome')) return '#6a4a34';
  if (id.includes('baoding')) return '#c9a227';
  if (id.includes('thunder')) return '#8a6a3a';
  if (id.includes('caisson')) return '#a83a2a';
  if (id.includes('vermilion')) return '#b09080';
  return '#a83a2a';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'marble-terraces', name: 'Marble terraces', color: '#e8e4da', description: 'The three-tiered circular marble terrace, 6 m high, each level edged with carved white marble balustrades, with the south stairs.' },
  { id: 'pillars', name: 'Pillars', color: '#a83a2a', description: 'The 28 massive wooden pillars: 4 central Dragon Well pillars (18.5 m, the four seasons), 12 inner gold pillars (the months) and 12 outer eave pillars (the twelve watches of the day).' },
  { id: 'dougong-brackets', name: 'Dougong brackets', color: '#8a4a30', description: 'The interlocking wooden bracket sets, shrinking layer by layer to form the vaulted dome, assembled without nails.' },
  { id: 'walls-doors', name: 'Walls and doors', color: '#7a5a3a', description: 'The circular timber wall panels between the eave pillars, with doors on four sides. Exact arrangement is schematic.' },
  { id: 'roofs', name: 'Roofs', color: '#2e4a7a', description: 'The triple eaves of deep blue glazed tiles with fascia rings and drainage spouts. Exact pitches are schematic.' },
  { id: 'dome-finial', name: 'Dome and finial', color: '#c9a227', description: 'The vaulted dome converging at the apex, the gilded baoding knob on the Thunder God pillar, and the dragon well ceiling caisson.' },
  { id: 'floor-altar-approach', name: 'Floor, altar and approach', color: '#ded9cc', description: 'The marble floor, the central altar platform and the schematic approach of the 360 m Vermilion Steps Bridge.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'terrace level first': 'The lowest of the three circular marble terrace levels; together the three rise 6 m. Exact radius is schematic.',
  'terrace level second': 'The middle marble terrace level. Exact radius is schematic.',
  'terrace level third': 'The top marble terrace level, carrying the hall itself. Exact radius is schematic.',
  'stair terrace 1': 'The south stair to the first terrace level. Exact width and step count are schematic.',
  'stair terrace 2': 'The south stair to the second terrace level. Exact width and step count are schematic.',
  'stair terrace 3': 'The south stair to the third terrace level. Exact width and step count are schematic.',
  'eave lower': 'The lowest of the three blue-tiled eaves. The triple eaves are covered in deep blue glazed tiles symbolizing the sky. Exact pitch is schematic.',
  'eave middle': 'The middle blue-tiled eave. Exact pitch is schematic.',
  'eave upper': 'The uppermost blue-tiled eave, rising toward the gilded knob. Exact pitch is schematic.',
  'fascia lower': 'The fascia ring edging the lower eave. Exact profile is schematic.',
  'fascia middle': 'The fascia ring edging the middle eave. Exact profile is schematic.',
  'fascia upper': 'The fascia ring edging the upper eave. Exact profile is schematic.',
  'vaulted dome': 'The vaulted dome inside the roof, carried by the 28 pillars and the layered dougong brackets, converging toward the apex. The whole timber frame uses mortise-and-tenon joints, no nails.',
  'gilded baoding': 'The gilded knob (baoding) crowning the roof at 38 m, the apex of the triple eaves.',
  'thunder god pillar': 'The Thunder God pillar carrying the gilded finial at the dome\u2019s apex.',
  'dragon well caisson': 'The decorated ceiling caisson above the four Dragon Well pillars. Exact carving is schematic.',
  'marble floor': 'The marble floor of the hall on the top terrace. Exact paving is schematic.',
  'altar platform': 'The central altar platform where the imperial rites were focused. Exact form is schematic.',
  'vermilion steps approach': 'Schematic approach of the Vermilion Steps Bridge, the 360 m raised walkway linking the hall to the Imperial Vault of Heaven. Shown shortened.',
};
for (const [tn, td] of [['first', 'lowest'], ['second', 'middle'], ['third', 'top']]) {
  for (const dir of ['east', 'north', 'west', 'south']) {
    explanations[`balustrade ${tn} ${dir}`] = `The carved white marble balustrade edging the ${dir} arc of the ${td} terrace level. Segmentation is schematic.`;
  }
}
for (let i = 1; i <= 4; i++) {
  explanations[`dragon well pillar ${i}`] = `One of the four central Dragon Well pillars, 18.5 m high and 1.2 m in diameter, read as the four seasons. They carry the heart of the vaulted dome.`;
}
for (let i = 1; i <= 12; i++) {
  explanations[`gold pillar ${i}`] = `One of the twelve inner gold pillars, read as the twelve months of the year. Exact height is schematic.`;
  explanations[`eave pillar ${i}`] = `One of the twelve outer eave pillars, read as the twelve two-hour watches of the day. Exact height is schematic.`;
  explanations[`dougong lower ${i}`] = `A lower dougong bracket set on eave pillar ${i}: interlocking wooden brackets, no nails, stepping inward layer by layer. Exact stacking is schematic.`;
  explanations[`dougong upper ${i}`] = `An upper dougong bracket set on inner pillar ${i}, continuing the layered brackets toward the dome. Exact stacking is schematic.`;
  const door = i % 3 === 1 ? ' (door)' : '';
  explanations[`wall panel ${i}${door}`] = `A timber wall panel of the circular hall${door ? ', one of the four door panels' : ''}. Exact arrangement is schematic.`;
  explanations[`drainage spout ${i}`] = `A schematic rainwater spout on the lower eave. Count and form are schematic.`;
}

// ---------------------------------------------------------------- serialize
// Atlas v1 contract (same as the other generators): per part, 4-byte
// aligned Float32 positions, Int16 normals and Uint32 indices in one
// binary chunk; atlas.json carries byte offsets, bounds, explanations,
// concepts and triangles. Parts carry an optional color that overrides the
// system color in the viewer.
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
  const align4 = (n) => (n + 3) & ~3; // keep every section 4-byte aligned for typed-array views
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
const binName = 'hall-of-prayer-for-good-harvests-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the hall-of-prayer-for-good-harvests directory referenced by the
// chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Hall of Prayer for Good Harvests, Temple of Heaven, Beijing',
  title: 'Hall of Prayer for Good Harvests',
  location: 'Beijing, China',
  blurb: 'The Temple of Heaven\u2019s great circular hall in Beijing: a 38 m triple-eaved timber hall built without nails, raised on a three-tiered marble terrace, its dome carried by 28 pillars encoding the seasons, months and watches of the day.',
  sourceUrls: [
    { label: 'Wikipedia: Temple of Heaven', url: 'http://en.wikipedia.org/wiki/Temple_of_Heaven' },
    { label: 'Chinese Academy of Sciences: Temple of Heaven in Beijing', url: 'http://english.igsnrr.cas.cn/ecg/cnwh/202011/t20201119_251655.html' },
    { label: 'Visit Beijing: Hall of Prayer for Good Harvests', url: 'https://english.visitbeijing.com.cn/article/47OOH9KHEOe' },
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
  chunks: [{ url: '/models/hall-of-prayer-for-good-harvests/hall-of-prayer-for-good-harvests-0.bin', bytes: offset }],
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
