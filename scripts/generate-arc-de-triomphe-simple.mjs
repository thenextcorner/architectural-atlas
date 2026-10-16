// Simplified schematic Arc de Triomphe for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-arc-de-triomphe.mjs, whose header
// lists every sourced dimension reused here), but coarser: ~30 named
// parts across 7 systems instead of 95 across 11. Piers, voussoirs and
// frieze panels are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-arc-de-triomphe.mjs for the full attribution):
//   Paris; 50 m high, 45 m wide, 22 m deep; large vault 29.19 m by
//   14.62 m; small vaults 18.68 m by 8.44 m; 1806-1836, Chalgrin;
//   La Marseillaise by Rude; Tomb of the Unknown Soldier with eternal
//   flame; names of victories and generals inscribed.
// Schematic (not sourced, never stated as fact in the UI): coursing;
// merged group geometry; relief depths; simplified vault profiles.
//
// Writes:
//   public/models/arc-de-triomphe-simple/atlas.json
//   public/models/arc-de-triomphe-simple/arc-de-triomphe-simple-0.bin
//
// Usage: node scripts/generate-arc-de-triomphe-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'arc-de-triomphe-simple');
fs.mkdirSync(outDir, { recursive: true });

const S = 2.4 / 50;

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

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const archR = 7.31, springY = 21.88;

// --- Base: 2 parts.
addPart('platform', 'Base platform', 'base', [box(-24, 24, -1.5, 0, -12.5, 12.5)]);
addPart('steps', 'Steps', 'base', [box(22.5, 26, -1.5, 0, -6, 6), box(-26, -22.5, -1.5, 0, -6, 6)]);

// --- Piers, four merged masses: 4 parts.
for (const [n, sx] of [['northwest', -1], ['northeast', 1], ['southwest', -1], ['southeast', 1]]) {
  const N = n[0].toUpperCase() + n.slice(1);
  const zc = n.includes('north') ? -5.5 : 5.5;
  addPart(`${n}-pier`, `${N} pier`, 'piers', [
    box(sx > 0 ? 7.31 : -22.5, sx > 0 ? 22.5 : -7.31, 0, springY, zc - 5.5, zc + 5.5),
  ]);
}

// --- Main arch: ring segments and spandrels: 4 parts.
{
  const ringF = [], ringB = [];
  for (let i = 0; i < 9; i++) {
    const a = (i + 0.5) * Math.PI / 9;
    const px = 9.5 * Math.sin(Math.PI - a), py = springY + 9.5 * Math.cos(Math.PI - a);
    const g = new THREE.BoxGeometry(3.4, 3.4, 1);
    g.rotateZ(a - Math.PI / 2);
    g.translate(px, py, 10.6);
    ringF.push(g);
    const g2 = g.clone();
    g2.translate(0, 0, -21.2);
    ringB.push(g2);
  }
  addPart('front-arch-ring', 'Front arch ring', 'main-arch', ringF);
  addPart('back-arch-ring', 'Back arch ring', 'main-arch', ringB);
}
addPart('spandrels', 'Spandrel walls', 'spandrels', [
  box(-22.5, 22.5, 29.5, 35, 8, 11), box(-22.5, 22.5, 29.5, 35, -11, -8),
]);
addPart('vault-ceiling', 'Vault ceiling', 'interior', [
  (() => { const v = new THREE.CylinderGeometry(archR, archR, 20, 14, 1, true, 0, Math.PI); v.rotateZ(Math.PI / 2); v.rotateY(Math.PI / 2); v.translate(0, springY, 0); return v; })(),
]);

// --- Side vaults: 2 parts.
for (const [sn, zc] of [['north', -5.5], ['south', 5.5]]) {
  const N = sn[0].toUpperCase() + sn.slice(1);
  addPart(`${sn}-side-vault`, `${N} side vault`, 'side-vaults', [
    box(-22.5, -4.22, 0, 16, zc - 4, zc + 4),
    box(4.22, 22.5, 0, 16, zc - 4, zc + 4),
    box(-22.5, 22.5, 16, 35, zc - 5.5, zc + 5.5),
  ]);
}

// --- Attic, frieze, cornice, terrace: 6 parts.
addPart('attic', 'Attic', 'attic', [box(-22.5, 22.5, 35, 46, -11, 11)]);
addPart('frieze', 'Frieze', 'frieze', [box(-22.5, 22.5, 36, 44, 10.8, 11.3), box(-22.5, 22.5, 36, 44, -11.3, -10.8)]);
addPart('cornice', 'Cornice', 'cornice', [box(-23.2, 23.2, 46, 47.2, -11.7, 11.7)]);
addPart('terrace', 'Terrace', 'attic', [box(-22.5, 22.5, 47.2, 49, -11, 11)]);
addPart('sculptures-front', 'Front sculptures', 'sculptures', [
  box(-21.5, -8.5, 8, 20, 11, 12), box(8.5, 21.5, 8, 20, 11, 12),
]);
addPart('sculptures-back', 'Back sculptures', 'sculptures', [
  box(-21.5, -8.5, 8, 20, -12, -11), box(8.5, 21.5, 8, 20, -12, -11),
]);

// --- Tomb: 2 parts.
addPart('tomb', 'Tomb of the Unknown Soldier', 'tomb', [box(-3, 3, 0, 1.2, -2, 2), box(-4.5, 4.5, 0, 0.4, -3.2, 3.2)]);
addPart('eternal-flame', 'Eternal flame', 'tomb', [cyl(0.3, 0.5, 1.6, 0, 2, 0, 8)]);

function colorFor(id) {
  if (id.includes('arch-ring')) return '#d8cfb8';
  if (id.includes('pier')) return '#e2d9c2';
  if (id.includes('spandrel')) return '#ddd3ba';
  if (id.includes('attic') || id === 'terrace') return '#e6dcc4';
  if (id === 'frieze') return '#cfc39f';
  if (id === 'cornice') return '#d9cdae';
  if (id.includes('sculpture')) return '#b8a87f';
  if (id.includes('vault')) return '#c4b795';
  if (id === 'tomb') return '#8f8574';
  if (id === 'eternal-flame') return '#e8a33d';
  if (id === 'platform' || id === 'steps') return '#b5a98c';
  return '#e2d9c2';
}

const systems = [
  { id: 'base', name: 'Base', color: '#b5a98c', description: 'Platform and steps.' },
  { id: 'piers', name: 'Piers', color: '#e2d9c2', description: 'The four piers, merged masses.' },
  { id: 'main-arch', name: 'Main arch', color: '#d8cfb8', description: 'The main vault arch rings.' },
  { id: 'spandrels', name: 'Spandrels', color: '#ddd3ba', description: 'Spandrel walls.' },
  { id: 'interior', name: 'Vault interior', color: '#c4b795', description: 'The vault ceiling.' },
  { id: 'side-vaults', name: 'Side vaults', color: '#e2d9c2', description: 'The transverse vaults.' },
  { id: 'attic', name: 'Attic and terrace', color: '#e6dcc4', description: 'Attic storey and terrace.' },
  { id: 'frieze', name: 'Frieze', color: '#cfc39f', description: 'Inscribed frieze.' },
  { id: 'cornice', name: 'Cornice', color: '#d9cdae', description: 'Crowning cornice.' },
  { id: 'sculptures', name: 'Sculptures', color: '#b8a87f', description: 'Relief groups.' },
  { id: 'tomb', name: 'Tomb of the Unknown Soldier', color: '#8f8574', description: 'The tomb and eternal flame.' },
];

const explanations = {
  'base platform': 'The platform. Dimensions are schematic.',
  'steps': 'The steps. Count is schematic.',
  'northwest pier': 'The northwest pier mass. Coursing is schematic.',
  'northeast pier': 'The northeast pier mass. Coursing is schematic.',
  'southwest pier': 'The southwest pier mass. Coursing is schematic.',
  'southeast pier': 'The southeast pier mass. Coursing is schematic.',
  'front arch ring': 'The front arch ring over the 14.62 m opening. Voussoirs are schematic.',
  'back arch ring': 'The back arch ring. Voussoirs are schematic.',
  'spandrel walls': 'The spandrel walls. Masonry is schematic.',
  'vault ceiling': 'The barrel-vaulted ceiling, 29.19 m high. Profile is schematic.',
  'north side vault': 'The north transverse vault, 18.68 m high. Form is schematic.',
  'south side vault': 'The south transverse vault. Form is schematic.',
  'attic': 'The attic storey. Masonry is schematic.',
  'frieze': 'The frieze with inscribed names. Subdivision is schematic.',
  'cornice': 'The crowning cornice. Profile is schematic.',
  'terrace': 'The observation terrace. Paving is schematic.',
  'front sculptures': 'The front relief groups including La Marseillaise. Depth is schematic.',
  'back sculptures': 'The back relief groups. Depth is schematic.',
  'tomb of the unknown soldier': 'The Tomb of the Unknown Soldier, interred 1921. Stone is schematic.',
  'eternal flame': 'The eternal flame, rekindled daily. Burner is schematic.',
};

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
const binName = 'arc-de-triomphe-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Arc de Triomphe, Paris (simplified schematic)',
  title: 'Arc de Triomphe',
  location: 'Paris, France',
  blurb: 'Napoleon\u2019s triumphal arch in simplified form: four piers, the great vault, attic and terrace, and the Tomb of the Unknown Soldier.',
  sourceUrls: [
    { label: 'Wikipedia: Arc de Triomphe', url: 'https://en.wikipedia.org/wiki/Arc_de_Triomphe' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/arc-de-triomphe-simple/arc-de-triomphe-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
