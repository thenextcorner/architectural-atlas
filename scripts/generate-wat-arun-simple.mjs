// Simplified schematic Wat Arun for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-wat-arun.mjs, whose header lists
// every sourced dimension reused here), but coarser: 22 named parts across
// 8 systems instead of 101 across 8. The six tower tiers merge to two
// masses; stairs, balustrades, statues, mosaics, pavilions and courtyard
// merge to group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-wat-arun.mjs for the full attribution):
//   central prang ~80 m (sources report 66.8-86 m), four satellite prangs,
//   two terraces, seven-pronged Trident of Shiva, porcelain mosaics from
//   Chinese ballast, Indra-on-Erawan statues, Chinese figures, demon
//   guardians, Niramitr Buddha, ordination hall, six riverside pavilions.
// Schematic (not sourced, never stated as fact in the UI): all merged
// group geometry and simplified forms.
//
// Writes:
//   public/models/wat-arun-simple/atlas.json
//   public/models/wat-arun-simple/wat-arun-simple-0.bin
//
// Usage: node scripts/generate-wat-arun-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'wat-arun-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (80 m prang) maps to 2.4 units (same as
// detailed).
const S = 2.4 / 80;

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
function tier(wTop, wBot, h, x, y, z) {
  const g = new THREE.CylinderGeometry(wTop / Math.SQRT2, wBot / Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Central prang merged: 6 parts.
addPart('prang-base', 'Prang stepped base', 'central-prang', [
  tier(22, 34, 8, 0, 4, 0),
]);
addPart('prang-lower-tower', 'Prang lower tower mass', 'central-prang', [
  tier(11.5, 19, 28.5, 0, 29, 0),
]);
addPart('prang-upper-tower', 'Prang upper tower mass', 'central-prang', [
  tier(1.2, 11.5, 28.5, 0, 57.75, 0),
]);
addPart('prang-crown', 'Prang lotus-bud crown', 'central-prang', [
  tier(1.2, 6.5, 5, 0, 74.3, 0),
]);
{
  const prongs = [cyl(0.35, 0.5, 4, 0, 79, 0, 8)];
  for (let pi = 0; pi < 7; pi++) {
    const ang = (pi / 7) * Math.PI * 2;
    prongs.push(cyl(0.12, 0.2, 3.2, Math.cos(ang) * 0.9, 82, Math.sin(ang) * 0.9, 6));
  }
  addPart('trident-of-shiva', 'Trident of Shiva', 'central-prang', prongs);
}
addPart('prang-mosaic-skin', 'Prang porcelain mosaic skin', 'mosaics', [
  tier(11.8, 19.3, 28.5, 0, 29, 0),
  tier(1.5, 11.8, 28.5, 0, 57.75, 0),
]);

// --- Terraces merged: 3 parts.
addPart('terraces', 'Terraces', 'terraces', [
  box(-13, 13, 8, 8.8, -13, 13),
  box(-10, 10, 14, 14.8, -10, 10),
]);
{
  const stairs = [];
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    for (let s = 0; s < 6; s++) {
      stairs.push(box(
        dx !== 0 ? (dx > 0 ? 13 + s * 1.1 : -13 - (s + 1) * 1.1) : -1.6,
        dx !== 0 ? (dx > 0 ? 13 + (s + 1) * 1.1 : -13 - s * 1.1) : 1.6,
        8 - (s + 1) * 1.35, 8 - s * 1.35,
        dz !== 0 ? (dz > 0 ? 13 + s * 1.1 : -13 - (s + 1) * 1.1) : -1.6,
        dz !== 0 ? (dz > 0 ? 13 + (s + 1) * 1.1 : -13 - s * 1.1) : 1.6,
      ));
    }
  }
  addPart('terrace-stairs', 'Terrace stairs', 'terraces', stairs);
}
addPart('terrace-balustrades', 'Terrace balustrades', 'terraces', [
  box(-13, 13, 8.8, 9.9, 12.5, 13),
  box(-13, 13, 8.8, 9.9, -13, -12.5),
  box(12.5, 13, 8.8, 9.9, -13, 13),
  box(-13, -12.5, 8.8, 9.9, -13, 13),
]);

// --- Satellite prangs merged: 4 parts (one per corner).
for (const [sn, sN, sx, sz] of [['northeast', 'Northeast', 24, 24], ['northwest', 'Northwest', -24, 24], ['southeast', 'Southeast', 24, -24], ['southwest', 'Southwest', -24, -24]]) {
  addPart(`${sn}-satellite-prang`, `${sN} satellite prang`, 'satellite-prangs', [
    tier(9, 11, 3, sx, 1.5, sz),
    tier(3.5, 8, 11, sx, 8.5, sz),
    tier(0.8, 3.5, 3, sx, 15.5, sz),
    cyl(0.15, 0.3, 2.5, sx, 18, sz, 8),
  ]);
}

// --- Statues merged: 3 parts.
{
  const indras = [];
  for (let ii = 0; ii < 4; ii++) {
    const ang = (ii / 4) * Math.PI * 2 + Math.PI / 4;
    const ix = Math.cos(ang) * 8.5, iz = Math.sin(ang) * 8.5;
    indras.push(box(ix - 1.6, ix + 1.6, 14.8, 17.2, iz - 1, iz + 1));
    indras.push(cyl(0.4, 0.6, 1.8, ix, 18.6, iz, 8));
  }
  addPart('indra-erawan-group', 'Indra on Erawan group', 'statues', indras);
}
{
  const figs = [];
  for (let ci = 0; ci < 4; ci++) {
    const ang = (ci / 4) * Math.PI * 2;
    const cx = Math.cos(ang) * 15, cz = Math.sin(ang) * 15;
    figs.push(cyl(0.5, 0.7, 2.6, cx, 1.3, cz, 8));
  }
  figs.push(box(7, 9, 0, 4.5, 34, 36));
  figs.push(box(-9, -7, 0, 4.5, 34, 36));
  addPart('guardian-figures', 'Guardian figures', 'statues', figs);
}
addPart('niramitr-buddha', 'Niramitr Buddha', 'statues', [
  cyl(1.2, 1.6, 0.8, 0, 0.4, 44, 10),
  cyl(0.9, 1.1, 2.2, 0, 1.9, 44, 8),
  new THREE.SphereGeometry(0.7, 8, 6).translate(0, 3.4, 44),
]);

// --- Ordination hall merged: 2 parts.
addPart('ordination-hall', 'Ordination Hall', 'ordination-hall', [
  box(-14, 14, 0, 1.5, 36, 58),
  box(-11, 11, 1.5, 7.5, 38, 56),
]);
addPart('ordination-hall-roof', 'Ordination Hall roof', 'ordination-hall', [
  tier(7, 15, 6, 0, 10.5, 47),
  tier(0.5, 6, 4, 0, 15.5, 47),
]);

// --- Pavilions merged: 2 parts.
{
  const bases = [], roofs = [];
  for (let pi = 0; pi < 6; pi++) {
    const px = -50 + pi * 20;
    bases.push(box(px - 3, px + 3, 0, 3.5, -46, -40));
    roofs.push(tier(0.8, 8, 2.5, px, 4.75, -43));
  }
  addPart('riverside-pavilions', 'Riverside pavilions', 'pavilions', bases);
  addPart('pavilion-roofs', 'Pavilion roofs', 'pavilions', roofs);
}

// --- Courtyard merged: 2 parts.
addPart('courtyard-walls', 'Courtyard walls', 'courtyard', [
  box(-60, 60, 0, 3, 62, 63),
  box(-60, 60, 0, 3, -64, -63),
  box(60, 61, 0, 3, -63, 62),
  box(-61, -60, 0, 3, -63, 62),
]);
addPart('courtyard-gates-chedis', 'Courtyard gates and chedis', 'courtyard', [
  box(59, 62, 0, 5, -2, 2),
  box(-62, -59, 0, 5, -2, 2),
  tier(1.5, 6, 7, -40, 3.5, 30),
  tier(1.5, 6, 7, 40, 3.5, 30),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('mosaic')) return '#7fb3c8';
  if (id === 'trident-of-shiva') return '#b8963e';
  if (id.includes('buddha')) return '#c9a227';
  if (id.includes('ordination')) return '#b0714f';
  if (id.includes('pavilion')) return '#6f8f7a';
  return '#e3d9bd';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'central-prang', name: 'Central prang', color: '#e3d9bd', description: 'The central tower merged to base, two tower masses, crown and trident.' },
  { id: 'mosaics', name: 'Porcelain mosaics', color: '#7fb3c8', description: 'The porcelain mosaic skin, merged.' },
  { id: 'terraces', name: 'Terraces and stairs', color: '#d5c9a8', description: 'Merged terraces, stairs and balustrades.' },
  { id: 'satellite-prangs', name: 'Satellite prangs', color: '#e3d9bd', description: 'The four corner prangs, one merged part each.' },
  { id: 'statues', name: 'Statues and figures', color: '#c9bfa0', description: 'Merged Indra group, guardian figures and Buddha.' },
  { id: 'ordination-hall', name: 'Ordination Hall', color: '#b0714f', description: 'Merged hall body and roof.' },
  { id: 'pavilions', name: 'Riverside pavilions', color: '#6f8f7a', description: 'Merged pavilion bases and roofs.' },
  { id: 'courtyard', name: 'Courtyard', color: '#ded3b8', description: 'Merged walls, gates and chedis.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
const E = (name, text) => { explanations[name.toLowerCase()] = text; };
E('Prang stepped base', 'Merged stepped base of the central prang. Stepping is schematic.');
E('Prang lower tower mass', 'Merged lower mass of the Khmer tower. Sources report the prang between 66.8 m and 86 m high.');
E('Prang upper tower mass', 'Merged upper mass of the Khmer tower.');
E('Prang lotus-bud crown', 'Merged lotus-bud crown. Exact form is schematic.');
E('Trident of Shiva', 'The merged seven-pronged trident crowning the prang.');
E('Prang porcelain mosaic skin', 'Merged skin standing in for the Chinese porcelain mosaics.');
E('Terraces', 'The merged two terraces. Heights are schematic.');
E('Terrace stairs', 'The merged steep stairs, the kind used for the Mortal Kombat (2021) fight sequence.');
E('Terrace balustrades', 'Merged terrace balustrades.');
for (const sN of ['Northeast', 'Northwest', 'Southeast', 'Southwest']) {
  E(`${sN} satellite prang`, `The merged ${sN.toLowerCase()} satellite prang. Height is schematic.`);
}
E('Indra on Erawan group', 'The merged four Indra-on-Erawan statues above the upper terrace.');
E('Guardian figures', 'Merged Chinese figures and demon guardians.');
E('Niramitr Buddha', 'The merged Niramitr Buddha, said to have been designed by Rama II.');
E('Ordination Hall', 'The merged Ordination Hall body.');
E('Ordination Hall roof', 'The merged tiled roof and spire.');
E('Riverside pavilions', 'The merged six green-granite riverside pavilions.');
E('Pavilion roofs', 'The merged pavilion roofs.');
E('Courtyard walls', 'The merged courtyard walls.');
E('Courtyard gates and chedis', 'Merged gates and chedis. Layout is schematic.');

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
const binName = 'wat-arun-simple-0.bin';
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
  scope: 'Wat Arun, Bangkok (simplified schematic)',
  title: 'Wat Arun',
  location: 'Bangkok, Thailand',
  blurb: 'The Temple of Dawn in simplified form: the 80 m porcelain-skinned central prang with its trident, four satellite prangs, terraces and riverside pavilions.',
  sourceUrls: [
    { label: 'Wikipedia: Wat Arun', url: 'https://en.wikipedia.org/wiki/Wat_Arun' },
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
  chunks: [{ url: '/models/wat-arun-simple/wat-arun-simple-0.bin', bytes: offset }],
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
