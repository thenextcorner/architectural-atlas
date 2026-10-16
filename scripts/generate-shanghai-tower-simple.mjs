// Simplified schematic Shanghai Tower for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-shanghai-tower.mjs, whose header
// lists every sourced dimension reused here), but coarser: ~30 named
// parts across 7 systems instead of 118 across 9. The nine zones are
// merged into three stacked sections; curtain-wall faces, columns and
// outriggers are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-shanghai-tower.mjs for the full attribution):
//   632 m, 128 floors above ground, completed 2015, Gensler design;
//   120-degree twist; nine vertical zones; double-skin facade with
//   triangular twisted outer wall and circular inner wall; sky-garden
//   atriums between the skins; concrete core, super-columns, outriggers;
//   36.9 m five-storey podium; 1,000-tonne tuned mass damper.
// Schematic (not sourced, never stated as fact in the UI): exact radii
// and taper; three-section zone grouping; merged group geometry.
//
// Writes:
//   public/models/shanghai-tower-simple/atlas.json
//   public/models/shanghai-tower-simple/shanghai-tower-simple-0.bin
//
// Usage: node scripts/generate-shanghai-tower-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'shanghai-tower-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (632 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 632;

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
function quad(p1, p2, p3, p4) {
  const v = [...p1, ...p2, ...p3, ...p1, ...p3, ...p4];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  g.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2, 3, 4, 5, 0, 2, 1, 3, 5, 4]), 1));
  return g;
}
function triVerts(R, th) {
  const v = [];
  for (let k = 0; k < 3; k++) {
    const a = th + (k * 2 * Math.PI) / 3;
    v.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  return v;
}
const twistAt = (h) => ((120 * Math.PI) / 180) * (h / 632);
const outerR = (h) => 46 - (20 * h) / 632;
const innerR = (h) => 30 - (11 * h) / 632;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Foundation and podium: 3 parts.
addPart('foundation-mat', 'Foundation mat', 'foundation', [box(-55, 55, -8, 0, -55, 55)]);
addPart('podium-block', 'Podium', 'podium', [box(-48, 48, 0, 37, -40, 40)]);
addPart('entrance-canopy', 'Entrance canopy', 'podium', [box(-20, 20, 37, 38.5, 40, 56)]);

// --- Core and columns, three stacked sections: 6 parts.
const SECC = [[40, 244], [244, 448], [448, 632]];
SECC.forEach(([y0, y1], i) => {
  addPart(`core-section-${i + 1}`, `Concrete core, section ${i + 1}`, 'core', [
    box(-13.7, 13.7, y0, y1, -13.7, 13.7),
  ]);
  const cols = [];
  for (let c = 0; c < 12; c++) {
    const a = (c * 2 * Math.PI) / 12;
    cols.push(cyl(1.6, 1.6, y1 - y0, 22 * Math.cos(a), (y0 + y1) / 2, 22 * Math.sin(a), 8));
  }
  addPart(`columns-section-${i + 1}`, `Super-columns, section ${i + 1}`, 'columns', cols);
});

// --- Inner skin, three sections: 3 parts.
SECC.forEach(([y0, y1], i) => {
  const g = new THREE.CylinderGeometry(innerR(y1), innerR(y0), y1 - y0, 32, 1, true);
  g.translate(0, (y0 + y1) / 2, 0);
  addPart(`inner-skin-${i + 1}`, `Inner curtain wall, section ${i + 1}`, 'inner-skin', [g]);
});

// --- Outer twisted skin: three sections x three faces = 9 parts.
SECC.forEach(([y0, y1], i) => {
  const v0 = triVerts(outerR(y0), twistAt(y0));
  const v1 = triVerts(outerR(y1), twistAt(y1));
  for (let f = 0; f < 3; f++) {
    const a0 = v0[f], b0 = v0[(f + 1) % 3];
    const a1 = v1[f], b1 = v1[(f + 1) % 3];
    addPart(`outer-face-s${i + 1}-f${f + 1}`, `Outer skin face ${f + 1}, section ${i + 1}`, 'outer-skin', [
      quad([a0[0], y0, a0[1]], [b0[0], y0, b0[1]], [b1[0], y1, b1[1]], [a1[0], y1, a1[1]]),
    ]);
  }
});

// --- Sky lobbies merged, outriggers merged, crown: 5 parts.
addPart('sky-lobbies', 'Sky lobbies', 'sky-lobbies', SECC.map(([y0, y1]) => {
  const r = innerR(y1) + 6;
  return cyl(r, r, 1.5, 0, y1, 0, 32);
}));
addPart('outriggers', 'Outrigger trusses', 'outriggers', [
  box(-32, 32, 240, 248, -3, 3), box(-3, 3, 240, 248, -32, 32),
  box(-30, 30, 444, 452, -3, 3), box(-3, 3, 444, 452, -30, 30),
]);
addPart('crown-parapet', 'Crown parapet', 'crown', [cyl(outerR(610), outerR(600), 14, 0, 613, 0, 3)]);
addPart('crown-glass', 'Crown glass', 'crown', [cyl(8, 14, 22, 0, 621, 0, 3)]);
addPart('mass-damper', 'Tuned mass damper', 'crown', [box(-8, 8, 585, 593, -8, 8)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'foundation-mat') return '#7a7268';
  if (id === 'podium-block') return '#9aa0a3';
  if (id === 'entrance-canopy') return '#b9c0c4';
  if (id.startsWith('core-section')) return '#a8a094';
  if (id.startsWith('columns-section')) return '#c2b9a6';
  if (id.startsWith('inner-skin')) return '#9fc4d4';
  if (id.startsWith('outer-face')) return '#cfe3ec';
  if (id === 'sky-lobbies') return '#b7d6c9';
  if (id === 'outriggers') return '#7d8894';
  if (id === 'crown-parapet') return '#dfeaf0';
  if (id === 'crown-glass') return '#a9d3e8';
  if (id === 'mass-damper') return '#5d6b78';
  return '#cfe3ec';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation', color: '#7a7268', description: 'The piled mat foundation.' },
  { id: 'podium', name: 'Podium', color: '#9aa0a3', description: 'The five-storey podium at the tower base.' },
  { id: 'core', name: 'Concrete core', color: '#a8a094', description: 'The concrete core, in three stacked sections.' },
  { id: 'columns', name: 'Super-columns', color: '#c2b9a6', description: 'The twelve perimeter super-columns, grouped per section.' },
  { id: 'inner-skin', name: 'Inner curtain wall', color: '#9fc4d4', description: 'The circular inner glass wall.' },
  { id: 'outer-skin', name: 'Twisted outer skin', color: '#cfe3ec', description: 'The triangular outer skin twisting 120 degrees.' },
  { id: 'sky-lobbies', name: 'Sky lobbies', color: '#b7d6c9', description: 'The garden atriums between the two skins.' },
  { id: 'outriggers', name: 'Outrigger trusses', color: '#7d8894', description: 'Trusses tying core to columns.' },
  { id: 'crown', name: 'Crown', color: '#dfeaf0', description: 'Parapet, glass crown and mass damper.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation mat': 'The foundation mat over the piled foundations. Exact depth is schematic.',
  'podium': 'The five-storey podium (36.9 m) with retail and conference space. Exact massing is schematic.',
  'entrance canopy': 'The entrance canopy. Exact form is schematic.',
  'concrete core, section 1': 'Lower third of the concrete core. Exact wall thickness is schematic.',
  'concrete core, section 2': 'Middle third of the concrete core. Exact wall thickness is schematic.',
  'concrete core, section 3': 'Upper third of the concrete core. Exact wall thickness is schematic.',
  'super-columns, section 1': 'The twelve super-columns through the lower third, merged into one part. Exact sections are schematic.',
  'super-columns, section 2': 'The twelve super-columns through the middle third, merged into one part. Exact sections are schematic.',
  'super-columns, section 3': 'The twelve super-columns through the upper third, merged into one part. Exact sections are schematic.',
  'inner curtain wall, section 1': 'Lower third of the circular inner glass wall. Panel subdivision is schematic.',
  'inner curtain wall, section 2': 'Middle third of the circular inner glass wall. Panel subdivision is schematic.',
  'inner curtain wall, section 3': 'Upper third of the circular inner glass wall. Panel subdivision is schematic.',
  'sky lobbies': 'The sky-lobby garden atriums between the two skins, merged into one part. Exact depths are schematic.',
  'outrigger trusses': 'The outrigger trusses tying core to columns, merged into one part. Exact geometry is schematic.',
  'crown parapet': 'The parapet crowning the tower. Exact profile is schematic.',
  'crown glass': 'The glass crown. Exact framing is schematic.',
  'tuned mass damper': 'The 1,000-tonne tuned mass damper. Housing form is schematic.',
};
for (let s = 1; s <= 3; s++) {
  for (let f = 1; f <= 3; f++) {
    explanations[`outer skin face ${f}, section ${s}`] = `Face ${f} of the twisted outer skin in section ${s} of three; the skin rotates 120 degrees over the full height. Exact panels are schematic.`;
  }
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
const binName = 'shanghai-tower-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Shanghai Tower, Shanghai (simplified schematic)',
  title: 'Shanghai Tower',
  location: 'Shanghai, China',
  blurb: 'Gensler\u2019s 632 m twisted supertall in simplified form: three stacked sections of core, columns and double glass skin spiralling 120 degrees.',
  sourceUrls: [
    { label: 'Wikipedia: Shanghai Tower', url: 'https://en.wikipedia.org/wiki/Shanghai_Tower' },
    { label: 'Gensler: Shanghai Tower', url: 'https://www.gensler.com/projects/shanghai-tower' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/shanghai-tower-simple/shanghai-tower-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
