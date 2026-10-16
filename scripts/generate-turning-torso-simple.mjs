// Simplified schematic Turning Torso for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-turning-torso.mjs, whose header
// lists every sourced dimension reused here), but coarser: 30 named
// parts across 6 systems instead of 100 across 8. The nine cubes are
// merged into three twist bands; core, exoskeleton and facade detail
// are merged per band.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-turning-torso.mjs for the full attribution):
//   190 m roof, 54 floors, Santiago Calatrava, Malmo, completed 2005;
//   nine five-storey pentagonal cubes twisting 90 degrees clockwise;
//   concrete core 10.6 m inner diameter, walls 2.5 m to 0.4 m;
//   white steel exoskeleton; curved aluminum facade.
// Schematic (not sourced, never stated as fact in the UI): pentagon
// circumradius, band grouping, exoskeleton simplification, podium form.
//
// Writes:
//   public/models/turning-torso-simple/atlas.json
//   public/models/turning-torso-simple/turning-torso-simple-0.bin
//
// Usage: node scripts/generate-turning-torso-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'turning-torso-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (190 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 190;

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
function strut(a, b, w, d = w) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, d);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(va.x, va.y, va.z);
  return g;
}
function pentagon(r, y0, y1, x, z, ang) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, 5);
  g.rotateY(ang);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const CUBES = 9;
const CUBE_H = 190 / CUBES;
const TWIST = Math.PI / 2 / CUBES;
const PENT_R = 13;

// --- Foundation merged: 1 part.
addPart('foundation', 'Foundation', 'foundation', [
  cyl(15, 15, 15, 0, -7.5, 0, 16),
  cyl(16, 16, 7, 0, -18.5, 0, 16),
]);

// --- Core merged: 1 part (tapered).
addPart('core', 'Concrete core', 'core', [
  cyl(10.6 / 2 + 0.4, 10.6 / 2 + 2.5, 190, 0, 95, 0, 16),
]);

// --- Three twist bands, each merging three cubes: mass, facade, windows.
const bands = [
  ['lower', 'Lower', 0, 3, 'offices and apartments'],
  ['middle', 'Middle', 3, 6, 'apartments'],
  ['upper', 'Upper', 6, 9, 'apartments'],
];
for (const [bid, bname, i0, i1, use] of bands) {
  const masses = [];
  const facades = [];
  const windows = [];
  for (let i = i0; i < i1; i++) {
    const y0 = i * CUBE_H;
    const ang = i * TWIST;
    masses.push(pentagon(PENT_R, y0, y0 + CUBE_H, 0, 0, ang));
    facades.push(pentagon(PENT_R * 1.0, y0, y0 + CUBE_H, 0, 0, ang));
    windows.push(pentagon(PENT_R * 1.01, y0 + CUBE_H * 0.55, y0 + CUBE_H * 0.95, 0, 0, ang));
  }
  addPart(`${bid}-band-mass`, `${bname} twist band mass`, 'cubes', masses);
  addPart(`${bid}-band-facade`, `${bname} twist band facade`, 'facade', facades);
  addPart(`${bid}-band-windows`, `${bname} twist band windows`, 'facade', windows);
  void use;
}

// --- Exoskeleton merged: spine segments + ring beams per band.
for (const [bid, bname, i0, i1] of bands) {
  const tubes = [];
  for (let i = i0; i < i1; i++) {
    const y0 = i * CUBE_H;
    const ang = i * TWIST;
    const vx = Math.sin(ang) * PENT_R;
    const vz = Math.cos(ang) * PENT_R;
    const vx1 = Math.sin(ang + TWIST) * PENT_R;
    const vz1 = Math.cos(ang + TWIST) * PENT_R;
    tubes.push(strut([vx, y0, vz], [vx1, y0 + CUBE_H, vz1], 1.4, 1.4));
    for (let k = 0; k < 5; k++) {
      const a0 = ang + (k / 5) * Math.PI * 2;
      const a1 = ang + ((k + 1) / 5) * Math.PI * 2;
      tubes.push(strut(
        [Math.sin(a0) * PENT_R, y0 + CUBE_H, Math.cos(a0) * PENT_R],
        [Math.sin(a1) * PENT_R, y0 + CUBE_H, Math.cos(a1) * PENT_R],
        0.8, 0.8,
      ));
    }
  }
  addPart(`${bid}-band-exoskeleton`, `${bname} band exoskeleton`, 'exoskeleton', tubes);
}

// --- Crown: 4 parts.
addPart('club-floors', 'Club floors', 'crown', [
  pentagon(PENT_R * 0.85, 50 * (190 / 54), 53 * (190 / 54), 0, 0, 8.5 * TWIST),
]);
addPart('conference-floors', 'Conference floors', 'crown', [
  pentagon(PENT_R * 0.8, 53 * (190 / 54), 190, 0, 0, 9 * TWIST),
]);
addPart('roof-plant', 'Roof plant and antenna', 'crown', [
  cyl(4, 5, 3, 0, 191.5, 0, 10),
  cyl(0.15, 0.25, 8, 0, 197, 0, 6),
]);
addPart('observation-deck', 'Observation deck', 'crown', [
  pentagon(PENT_R * 0.9, 49 * (190 / 54), 50 * (190 / 54), 0, 0, 8 * TWIST),
]);

// --- Floor slabs merged per band: 3 parts.
for (const [bid, bname, i0, i1] of bands) {
  const slabs = [];
  for (let i = i0; i < i1; i++) {
    const y0 = i * CUBE_H;
    const ang = i * TWIST;
    for (let f = 0; f < 5; f++) {
      const y = y0 + (f + 0.5) * (CUBE_H / 5);
      slabs.push(pentagon(PENT_R * 0.98, y - 0.25, y + 0.25, 0, 0, ang + (f * TWIST) / 5));
    }
  }
  addPart(`${bid}-band-slabs`, `${bname} band floor slabs`, 'structure', slabs);
}

// --- Podium: 5 parts.
addPart('podium-base', 'Podium base', 'podium', [
  box(-12, 12, 0, 4.5, -6, 8),
]);
addPart('entrance-canopy', 'Entrance canopy', 'podium', [
  box(-10, 10, 4.5, 5.2, 8, 20),
  cyl(0.3, 0.3, 4.5, -9, 2.25, 19, 8),
  cyl(0.3, 0.3, 4.5, 9, 2.25, 19, 8),
]);
addPart('plaza', 'Plaza', 'podium', [
  box(-30, 30, -0.5, 0, -30, 30),
]);
addPart('podium-retail', 'Podium retail', 'podium', [
  box(-22, -13, 0, 4, -4, 6),
  box(13, 22, 0, 4, -4, 6),
]);
addPart('podium-parking', 'Podium parking entrance', 'podium', [
  box(-6, 6, -3, 0, -28, -20),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('facade')) return '#cfd6dd';
  if (id.includes('windows')) return '#5a6b7a';
  if (id.includes('exoskeleton')) return '#e8ebee';
  if (id === 'core') return '#9aa2ab';
  if (id === 'foundation') return '#7d868f';
  if (id.includes('slabs')) return '#b9c0c7';
  if (id.includes('mass')) return '#dde2e7';
  if (id.includes('crown') || id.includes('observation')) return '#c3ccd4';
  if (id.includes('podium') || id.includes('plaza')) return '#aeb6be';
  return '#cfd6dd';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation', color: '#7d868f', description: 'Foundation box and slab piled into limestone bedrock.' },
  { id: 'core', name: 'Concrete core', color: '#9aa2ab', description: 'The tapered load-bearing concrete core carrying lifts and stairs.' },
  { id: 'cubes', name: 'Twisting cubes', color: '#dde2e7', description: 'The nine pentagonal cubes in three twist bands, rotating 90 degrees from base to top.' },
  { id: 'structure', name: 'Floor slabs', color: '#b9c0c7', description: 'Floor slabs anchored in the core, per twist band.' },
  { id: 'facade', name: 'Aluminum facade', color: '#cfd6dd', description: 'Curved aluminum panels and window bands per twist band.' },
  { id: 'exoskeleton', name: 'Steel exoskeleton', color: '#e8ebee', description: 'White steel spine and ring beams bracing each twist band.' },
  { id: 'crown', name: 'Crown', color: '#c3ccd4', description: 'Observation deck and top floors.' },
  { id: 'podium', name: 'Podium and plaza', color: '#aeb6be', description: 'Entrance, podium and plaza.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation': 'The cylindrical foundation box and slab piled into limestone bedrock. Exact form is schematic.',
  'concrete core': 'The tapered concrete core, 10.6 m across inside with walls from 2.5 m thick at the base to 0.4 m at the top. Exact taper is schematic.',
  'lower twist band mass': 'The lower three of nine pentagonal cubes, housing offices and apartments, twisting as they rise. Exact footprints are schematic.',
  'lower twist band facade': 'Curved aluminum facade of the lower band. Exact panels are schematic.',
  'lower twist band windows': 'Window bands of the lower band, leaning to follow the twist. Exact glazing is schematic.',
  'middle twist band mass': 'The middle three cubes, all apartments. Exact footprints are schematic.',
  'middle twist band facade': 'Curved aluminum facade of the middle band. Exact panels are schematic.',
  'middle twist band windows': 'Window bands of the middle band. Exact glazing is schematic.',
  'upper twist band mass': 'The upper three cubes, all apartments, ending 90 degrees twisted from the base. Exact footprints are schematic.',
  'upper twist band facade': 'Curved aluminum facade of the upper band. Exact panels are schematic.',
  'upper twist band windows': 'Window bands of the upper band. Exact glazing is schematic.',
  'lower band exoskeleton': 'White steel spine and ring beams bracing the lower band against wind. Exact members are schematic.',
  'middle band exoskeleton': 'White steel spine and ring beams bracing the middle band. Exact members are schematic.',
  'upper band exoskeleton': 'White steel spine and ring beams bracing the upper band. Exact members are schematic.',
  'club floors': 'Club, restaurant and meeting rooms near the top. Exact layout is schematic.',
  'conference floors': 'The top conference floors with 360-degree views. Exact layout is schematic.',
  'roof plant and antenna': 'Rooftop plant and communications antenna. Exact equipment is schematic.',
  'observation deck': 'The public observation deck. Exact fit-out is schematic.',
  'lower band floor slabs': 'Floor slabs of the lower band anchored in the core. Exact shapes are schematic.',
  'middle band floor slabs': 'Floor slabs of the middle band. Exact shapes are schematic.',
  'upper band floor slabs': 'Floor slabs of the upper band. Exact shapes are schematic.',
  'podium base': 'Entrance lobby. Exact interior is schematic.',
  'entrance canopy': 'The entrance canopy. Exact form is schematic.',
  'plaza': 'The plaza around the tower. Exact landscaping is schematic.',
  'podium retail': 'Retail units in the podium. Exact tenanting is schematic.',
  'podium parking entrance': 'The parking garage entrance. Exact layout is schematic.',
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
    bounds: r_bounds(bb),
  });
  triangles += u32.length / 3;
  merged.dispose();
}
function r_bounds(bb) {
  return [
    [bb.min.x, bb.min.y, bb.min.z],
    [bb.max.x, bb.max.y, bb.max.z],
  ];
}

const buffer = Buffer.alloc(offset);
for (const r of records) {
  r.pos.copy(buffer, r.posOff);
  r.nor.copy(buffer, r.norOff);
  r.idx.copy(buffer, r.idxOff);
}
const binName = 'turning-torso-simple-0.bin';
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
  scope: 'Turning Torso, Malmo (simplified schematic)',
  title: 'Turning Torso',
  location: 'Malmo, Sweden',
  blurb: 'Santiago Calatrava\u2019s 190 m twisting tower in simplified form: nine pentagonal cubes in three twist bands rotating 90 degrees around a concrete core.',
  sourceUrls: [
    { label: 'Wikipedia: Turning Torso', url: 'https://en.wikipedia.org/wiki/Turning_Torso' },
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
  chunks: [{ url: '/models/turning-torso-simple/turning-torso-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
