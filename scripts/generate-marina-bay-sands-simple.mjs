// Simplified schematic Marina Bay Sands for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-marina-bay-sands.mjs, whose header
// lists every sourced dimension reused here), but coarser: 27 named parts
// across 8 systems instead of 102 across 9. The three towers merge to one
// mass each with merged facades; the 14 SkyPark segments merge to a single
// deck; pool, gardens, observation, ArtScience Museum and podium merge to
// group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-marina-bay-sands.mjs for the full attribution):
//   three 55-storey, 195 m hotel towers; 340 m SkyPark at 200 m, 40 m max
//   width, 65-67 m north cantilever; 150 m infinity pool; 1.2-hectare
//   garden (250 trees, 650 plants); ArtScience Museum lotus form; podium
//   with casino, Shoppes, convention center and theatre.
// Schematic (not sourced, never stated as fact in the UI): all merged
// group geometry and simplified forms.
//
// Writes:
//   public/models/marina-bay-sands-simple/atlas.json
//   public/models/marina-bay-sands-simple/marina-bay-sands-simple-0.bin
//
// Usage: node scripts/generate-marina-bay-sands-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'marina-bay-sands-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (340 m SkyPark) maps to 2.4 units (same
// as detailed).
const S = 2.4 / 340;

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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const TOWER_X = [-80, 0, 80];
const TOWER_NAMES = ['North', 'Central', 'South'];

// --- Three tower masses, merged: 6 parts.
TOWER_X.forEach((tx, ti) => {
  const tn = TOWER_NAMES[ti].toLowerCase();
  const tN = TOWER_NAMES[ti];
  addPart(`${tn}-tower-mass`, `${tN} tower mass`, 'towers', [
    box(tx - 21, tx + 21, 0, 195, -17, 17),
  ]);
  addPart(`${tn}-tower-glass`, `${tN} tower glass skin`, 'towers', [
    box(tx - 21.6, tx + 21.6, 14, 195, -17.6, 17.6),
  ]);
});

// --- SkyPark merged: 4 parts.
addPart('skypark-deck', 'SkyPark deck', 'skypark', [
  box(-170, 170, 200, 205, -20, 20),
]);
addPart('skypark-cantilever', 'SkyPark north cantilever', 'skypark', [
  box(101, 168, 198, 205, -15, 15),
]);
addPart('skypark-supports', 'SkyPark tower supports', 'skypark', [
  box(-92, -68, 195, 200, -8, 8),
  box(-12, 12, 195, 200, -8, 8),
  box(68, 92, 195, 200, -8, 8),
]);
addPart('skypark-edge', 'SkyPark edge beams', 'skypark', [
  box(-170, 170, 199, 205, 19, 20),
  box(-170, 170, 199, 205, -20, -19),
]);

// --- Pool merged: 2 parts.
addPart('infinity-pool', 'Infinity pool', 'pool', [
  box(-75, 75, 205, 206.6, -8, 11),
]);
addPart('pool-decks', 'Pool decks', 'pool', [
  box(-75, 75, 205, 205.4, -19, -8),
  box(-75, 75, 205, 205.4, 11, 19),
]);

// --- Gardens merged: 3 parts.
{
  const trees = [];
  for (const [cx, cz] of [[-125, 0], [-60, -12], [-60, 12], [0, 0], [60, -12], [60, 12], [125, 0]]) {
    trees.push(cyl(0.3, 0.4, 3, cx, 206.5, cz, 6));
    const crown = new THREE.SphereGeometry(2.6, 8, 6);
    crown.translate(cx, 209.5, cz);
    trees.push(crown);
  }
  addPart('garden-trees', 'SkyPark garden trees', 'gardens', trees);
}
addPart('garden-lawns', 'SkyPark garden lawns', 'gardens', [
  box(-165, -80, 205, 205.5, -14, 14),
  box(80, 165, 205, 205.5, -14, 14),
]);
addPart('garden-path', 'SkyPark garden path', 'gardens', [
  box(-165, 165, 205, 205.35, -19.5, -17.5),
]);

// --- Observation and dining merged: 3 parts.
addPart('observation-deck', 'Observation deck', 'observation', [
  box(100, 165, 205, 205.6, -19, 19),
]);
addPart('dining-pavilions', 'SkyPark dining pavilions', 'observation', [
  box(-134, -106, 205, 211, -19, -6),
  box(-54, -26, 205, 211, -19, -6),
  box(30, 58, 205, 211, 6, 19),
]);

// --- ArtScience Museum merged: 3 parts.
{
  const petals = [];
  for (let pi = 0; pi < 5; pi++) {
    const ang = (pi / 5) * Math.PI * 2;
    const petal = new THREE.ConeGeometry(9, 34, 8, 1, true);
    petal.translate(0, 17, 0);
    petal.rotateZ(0.5);
    petal.rotateY(-ang);
    petal.translate(150 + Math.cos(ang) * 14, 10, 90 + Math.sin(ang) * 14);
    petals.push(petal);
  }
  addPart('artscience-petals', 'ArtScience Museum lotus petals', 'artscience', petals);
}
addPart('artscience-base', 'ArtScience Museum base', 'artscience', [
  cyl(28, 32, 12, 150, 6, 90, 16),
]);
addPart('artscience-pond', 'ArtScience Museum lily pond', 'artscience', [
  cyl(38, 38, 1.2, 150, 0.6, 90, 16),
]);

// --- Podium merged: 4 parts.
addPart('podium-hotel-base', 'Podium hotel base', 'podium', [
  box(-120, 130, 0, 14, -110, 110),
]);
addPart('podium-casino', 'Casino podium', 'podium', [
  box(-120, -20, 0, 26, -90, -45),
]);
addPart('podium-shoppes', 'Shoppes podium', 'podium', [
  box(20, 130, 0, 22, -90, -45),
]);
addPart('podium-convention-theatre', 'Convention and theatre podium', 'podium', [
  box(-120, 90, 0, 22, 45, 95),
]);

// --- Structure merged: 3 parts.
addPart('tower-cores', 'Tower structural cores', 'structure', [
  box(-86, -74, 0, 195, -6, 6),
  box(-6, 6, 0, 195, -6, 6),
  box(74, 86, 0, 195, -6, 6),
]);
addPart('cantilever-truss', 'Cantilever support truss', 'structure', [
  box(101, 168, 196, 199, -15, 15),
]);
addPart('skypark-dampers', 'SkyPark dampers and joints', 'structure', [
  box(-46, -34, 192, 198, -6, 6),
  box(34, 46, 192, 198, -6, 6),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#9fb8c8';
  if (id.startsWith('skypark')) return '#cfd6da';
  if (id === 'skypark-cantilever') return '#b9c0c6';
  if (id.startsWith('infinity') || id.startsWith('pool')) return '#3f9fd8';
  if (id.startsWith('garden')) return '#5d8f5f';
  if (id === 'garden-path') return '#b09a7a';
  if (id.startsWith('observation') || id.startsWith('dining')) return '#d9dee2';
  if (id.startsWith('artscience')) return '#eef0f1';
  if (id === 'artscience-pond') return '#7fb8d9';
  if (id.startsWith('podium')) return '#c9cdd1';
  if (id.includes('core') || id.includes('truss') || id.includes('damper')) return '#6e7a84';
  return '#b9c0c6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'towers', name: 'Hotel towers', color: '#b9c0c6', description: 'The three 55-storey hotel tower masses with merged glass skins.' },
  { id: 'skypark', name: 'Sands SkyPark', color: '#cfd6da', description: 'The 340 m SkyPark as a single deck with its north cantilever, supports and edge beams.' },
  { id: 'pool', name: 'Infinity pool', color: '#3f9fd8', description: 'The 150 m infinity pool and its decks, merged.' },
  { id: 'gardens', name: 'SkyPark gardens', color: '#5d8f5f', description: 'Garden trees, lawns and path, merged.' },
  { id: 'observation', name: 'Observation and dining', color: '#d9dee2', description: 'Observation deck and dining pavilions, merged.' },
  { id: 'artscience', name: 'ArtScience Museum', color: '#eef0f1', description: 'The lotus-flower museum: merged petals, base and lily pond.' },
  { id: 'podium', name: 'Podium and resort', color: '#c9cdd1', description: 'Resort podium masses: hotel base, casino, Shoppes, convention and theatre.' },
  { id: 'structure', name: 'Engineering structure', color: '#6e7a84', description: 'Tower cores, cantilever truss, dampers and joints, merged.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
const E = (name, text) => { explanations[name.toLowerCase()] = text; };
const SCHEM = 'Exact form is schematic.';
TOWER_NAMES.forEach((tN) => {
  const tn = tN.toLowerCase();
  E(`${tN} tower mass`, `The ${tn} of three 55-storey, 195 m hotel towers. ${SCHEM}`);
  E(`${tN} tower glass skin`, `Merged glass curtain-wall skin of the ${tn} tower. ${SCHEM}`);
});
E('SkyPark deck', 'The 340 m SkyPark deck at 200 m, merged from its 14 prefabricated steel segments. Segment joints are not shown.');
E('SkyPark north cantilever', 'The SkyPark cantilevering 65 to 67 m beyond the north tower. Truss detail is merged away.');
E('SkyPark tower supports', 'Merged columns carrying the SkyPark on the three towers.');
E('SkyPark edge beams', 'Merged edge beams of the SkyPark deck.');
E('Infinity pool', 'The 150 m infinity pool with its 145 m vanishing edge, merged to a single basin.');
E('Pool decks', 'Merged pool decks north and south of the basin.');
E('SkyPark garden trees', 'Merged tree masses standing in for the 250 SkyPark trees.');
E('SkyPark garden lawns', 'Merged lawns of the 1.2-hectare SkyPark garden.');
E('SkyPark garden path', 'The merged jogging path.');
E('Observation deck', 'The merged public observation deck, 200 m above the city.');
E('SkyPark dining pavilions', 'Merged restaurant and lounge pavilions.');
E('ArtScience Museum lotus petals', 'The merged lotus petals of the ArtScience Museum.');
E('ArtScience Museum base', 'The merged drum base of the museum.');
E('ArtScience Museum lily pond', 'The merged lily pond at the museum base.');
E('Podium hotel base', 'The merged podium tying the three towers together at ground level.');
E('Casino podium', 'The merged 15,000 sqm casino podium block.');
E('Shoppes podium', 'The merged Shoppes mall podium block.');
E('Convention and theatre podium', 'Merged convention center and Sands Theatre blocks.');
E('Tower structural cores', 'Merged structural cores of the three towers.');
E('Cantilever support truss', 'Merged truss of the north cantilever.');
E('SkyPark dampers and joints', 'Merged tuned mass dampers and expansion joints.');

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
const binName = 'marina-bay-sands-simple-0.bin';
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
  scope: 'Marina Bay Sands, Singapore (simplified schematic)',
  title: 'Marina Bay Sands',
  location: 'Singapore',
  blurb: 'Moshe Safdie\'s 2010 resort in simplified form: three 195 m hotel tower masses crowned by the 340 m SkyPark deck with its infinity pool.',
  sourceUrls: [
    { label: 'Safdie Architects: Marina Bay Sands', url: 'https://www.safdiearchitects.com/projects/marina-bay-sands' },
    { label: 'Wikipedia: Marina Bay Sands', url: 'https://en.wikipedia.org/wiki/Marina_Bay_Sands' },
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
  chunks: [{ url: '/models/marina-bay-sands-simple/marina-bay-sands-simple-0.bin', bytes: offset }],
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
