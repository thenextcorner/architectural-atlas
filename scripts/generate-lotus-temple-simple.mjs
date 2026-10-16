// Simplified schematic Lotus Temple for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-lotus-temple.mjs, whose header lists
// every sourced dimension reused here), but coarser: 30 named parts across
// 7 systems instead of 115 across 8. The inner and middle petal ranks are
// merged into rings; the 54 dome ribs are merged; entrances are individual
// but doors are merged; ponds and walkways are merged.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-lotus-temple.mjs for the full attribution):
//   Bahai House of Worship, Delhi, completed 1986, Fariborz Sahba;
//   27 marble petals in three ranks of nine; 70 m diameter; 34.27 m height;
//   central hall 34 m diameter; nine entrances, nine ponds.
// Schematic (not sourced, never stated as fact in the UI): exact petal
// curvature, podium and pond forms, walkway layout.
//
// Writes:
//   public/models/lotus-temple-simple/atlas.json
//   public/models/lotus-temple-simple/lotus-temple-simple-0.bin
//
// Usage: node scripts/generate-lotus-temple-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'lotus-temple-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (70 m diameter) maps to 2.4 units (same as detailed).
const S = 2.4 / 70;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 24) {
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

// Solid petal (same lofted construction as the detailed model).
function solidPetal(theta, baseR, baseY, ctrlR, ctrlY, tipR, tipY, width0, thick, segs = 8, across = 5) {
  const radial = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
  const side = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
  const up = new THREE.Vector3(0, 1, 0);
  const bz = (t, p0, p1, p2) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  const positions = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = bz(t, baseR, ctrlR, tipR);
    const y = bz(t, baseY, ctrlY, tipY);
    const dr = 2 * (1 - t) * (ctrlR - baseR) + 2 * t * (tipR - ctrlR);
    const dy = 2 * (1 - t) * (ctrlY - baseY) + 2 * t * (tipY - ctrlY);
    const tangent = new THREE.Vector3().addScaledVector(radial, dr).addScaledVector(up, dy).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    const center = new THREE.Vector3().addScaledVector(radial, r).addScaledVector(up, y);
    const w = width0 * Math.pow(Math.cos((t * Math.PI) / 2), 0.7);
    const th = thick * (1 - 0.55 * t);
    for (let j = 0; j <= across; j++) {
      const u = (j / across - 0.5) * 2;
      const camber = (1 - u * u) * w * 0.12;
      const p = new THREE.Vector3().copy(center)
        .addScaledVector(side, u * w / 2)
        .addScaledVector(normal, camber);
      const pf = new THREE.Vector3().copy(p).addScaledVector(normal, th / 2);
      const pb = new THREE.Vector3().copy(p).addScaledVector(normal, -th / 2);
      positions.push(pf.x, pf.y, pf.z, pb.x, pb.y, pb.z);
    }
  }
  const rowLen = (across + 1) * 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  const idx = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * rowLen + j * 2;
      const b = a + 2;
      const c = a + rowLen;
      const d = c + 2;
      idx.push(a, c, b, b, c, d);
      idx.push(a + 1, b + 1, c + 1, b + 1, d + 1, c + 1);
    }
  }
  for (let i = 0; i < segs; i++) {
    const a0 = i * rowLen, a1 = a0 + 1, b0 = (i + 1) * rowLen, b1 = b0 + 1;
    idx.push(a0, b0, a1, a1, b0, b1);
    const c0 = i * rowLen + across * 2, c1 = c0 + 1, d0 = (i + 1) * rowLen + across * 2, d1 = d0 + 1;
    idx.push(c0, c1, d0, d0, c1, d1);
  }
  for (let j = 0; j < across; j++) {
    const a = j * 2, b = a + 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const exp = (name, text) => { explanations[name.toLowerCase()] = text; };

// --- Podium: 3 parts.
addPart('podium-slab', 'Podium slab', 'podium', [cyl(36, 37, 3, 0, 1.5, 0, 36)]);
exp('Podium slab', 'The circular podium elevating the temple above the plain. Exact dimensions are schematic.');
addPart('podium-steps', 'Podium steps', 'podium', [cyl(39, 39, 0.8, 0, 2.6, 0, 36)]);
exp('Podium steps', 'Steps up to the podium. Exact profile is schematic.');
addPart('plinth-ring', 'Petal plinth ring', 'podium', [cyl(30, 31, 1.2, 0, 3.6, 0, 36)]);
exp('Petal plinth ring', 'The plinth ring the petals spring from. Exact form is schematic.');

// --- Petals: outer rank individual (9), inner and middle merged into rings.
const RANK = [
  { key: 'inner', baseR: 10, baseY: 3.5, ctrlR: 9, ctrlY: 18, tipR: 4.5, tipY: 30, width0: 9, thick: 1.6 },
  { key: 'middle', baseR: 18, baseY: 3.5, ctrlR: 16, ctrlY: 20, tipR: 9, tipY: 32, width0: 11, thick: 1.8 },
  { key: 'outer', baseR: 26, baseY: 3.5, ctrlR: 30, ctrlY: 14, tipR: 34, tipY: 22, width0: 12, thick: 2.0 },
];
for (let k = 0; k < 9; k++) {
  const theta = (k / 9) * Math.PI * 2;
  const rk = RANK[2];
  addPart(`outer-petal-${k + 1}`, `Outer petal ${k + 1}`, 'outer-petals', [
    solidPetal(theta, rk.baseR, rk.baseY, rk.ctrlR, rk.ctrlY, rk.tipR, rk.tipY, rk.width0, rk.thick),
  ]);
  exp(`Outer petal ${k + 1}`, `One of the nine outer marble petals (petal ${k + 1} of 9), curving outward to canopy an entrance. Exact curvature is schematic.`);
}
for (const [ri, label] of [[0, 'Inner'], [1, 'Middle']]) {
  const rk = RANK[ri];
  const geoms = [];
  for (let k = 0; k < 9; k++) {
    geoms.push(solidPetal((k / 9) * Math.PI * 2, rk.baseR, rk.baseY, rk.ctrlR, rk.ctrlY, rk.tipR, rk.tipY, rk.width0, rk.thick));
  }
  addPart(`${rk.key}-petal-ring`, `${label} petal ring`, `${rk.key}-petals`, geoms);
  exp(`${label} petal ring`, `The nine ${rk.key}-rank marble petals merged into one part, curving inward to embrace the inner dome. Exact curvature is schematic.`);
}

// --- Inner dome: merged ribs, shell, oculus: 3 parts.
{
  const ribs = [];
  for (let k = 0; k < 54; k++) {
    const theta = (k / 54) * Math.PI * 2;
    ribs.push(strut([Math.cos(theta) * 14, 12, Math.sin(theta) * 14], [0, 34, 0], 0.6, 0.6));
  }
  addPart('dome-ribs', 'Inner dome ribs', 'inner-dome', ribs);
  exp('Inner dome ribs', 'The 54 concrete ribs of the double-layered inner dome, merged into one part. Exact profiles are schematic.');
  const shell = new THREE.SphereGeometry(15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6);
  shell.translate(0, 6, 0);
  addPart('inner-dome-shell', 'Inner dome shell', 'inner-dome', [shell]);
  exp('Inner dome shell', 'The concrete shell of the inner dome. Exact form is schematic.');
  addPart('dome-oculus', 'Dome oculus', 'inner-dome', [cyl(2.2, 2.2, 1.2, 0, 33.5, 0, 18)]);
  exp('Dome oculus', 'The oculus crowning the inner dome. Exact form is schematic.');
}

// --- Entrances: 9 individual arches, doors merged: 10 parts.
{
  const doors = [];
  for (let k = 0; k < 9; k++) {
    const theta = ((k + 0.5) / 9) * Math.PI * 2;
    const r = 26;
    const cx = Math.cos(theta) * r;
    const cz = Math.sin(theta) * r;
    const rot = -theta - Math.PI / 2;
    const place = (g) => { g.rotateY(rot); g.translate(cx, 0, cz); return g; };
    const archG = new THREE.TorusGeometry(3, 0.9, 8, 12, Math.PI);
    archG.translate(0, 12, 0);
    place(archG);
    const jambL = place(box(2.2, 3.8, 3, 12, -0.8, 0.8));
    const jambR = place(box(-3.8, -2.2, 3, 12, -0.8, 0.8));
    addPart(`entrance-${k + 1}`, `Entrance ${k + 1}`, 'entrances', [jambL, jambR, archG]);
    exp(`Entrance ${k + 1}`, `Entrance ${k + 1} of 9 between the outer petals. Exact profile is schematic.`);
    const dg = new THREE.BoxGeometry(4.8, 7.5, 0.5);
    place(dg);
    dg.translate(0, 6.75, 0);
    doors.push(dg);
  }
  addPart('entrance-doors', 'Entrance doors', 'entrances', doors);
  exp('Entrance doors', 'The nine entrance doors merged into one part. Exact designs are schematic.');
}

// --- Ponds and walkways merged: 2 parts.
{
  const ponds = [];
  for (let k = 0; k < 9; k++) {
    const theta = (k / 9) * Math.PI * 2 + Math.PI / 9;
    const cx = Math.cos(theta) * 46;
    const cz = Math.sin(theta) * 46;
    ponds.push(cyl(6, 6, 0.4, cx, 0.2, cz, 6));
  }
  addPart('reflecting-ponds', 'Reflecting ponds', 'ponds', ponds);
  exp('Reflecting ponds', 'The nine reflecting ponds ringing the temple, merged into one part. Exact shapes are schematic.');
  const walks = [];
  for (let k = 0; k < 3; k++) {
    const theta = (k / 3) * Math.PI * 2;
    walks.push(strut([Math.cos(theta) * 38, 0.3, Math.sin(theta) * 38], [Math.cos(theta) * 56, 0.3, Math.sin(theta) * 56], 3, 3));
  }
  walks.push(cyl(3, 3, 0.3, 0, 33, 0, 18));
  addPart('walkways-and-skylight', 'Walkways and skylight', 'walkways', walks);
  exp('Walkways and skylight', 'Garden walkways and the central skylight, merged into one part. Exact layout is schematic.');
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'reflecting-ponds') return '#7fb3c8';
  if (id === 'walkways-and-skylight') return '#cfc9bb';
  if (id === 'podium-steps') return '#cfc9bb';
  if (id === 'podium-slab' || id === 'plinth-ring') return '#e8e2d2';
  if (id === 'dome-ribs' || id === 'inner-dome-shell' || id === 'dome-oculus') return '#e4ddcb';
  if (id === 'entrance-doors') return '#8a7a5f';
  return '#f5f1e6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'podium', name: 'Podium', color: '#e8e2d2', description: 'The circular podium with steps and the plinth ring the petals spring from.' },
  { id: 'inner-petals', name: 'Inner petal rank', color: '#f5f1e6', description: 'The nine inner marble petals, merged, curving inward.' },
  { id: 'middle-petals', name: 'Middle petal rank', color: '#f5f1e6', description: 'The nine middle marble petals, merged, curving inward.' },
  { id: 'outer-petals', name: 'Outer petal rank', color: '#f5f1e6', description: 'The nine outer marble petals, curving outward over the entrances.' },
  { id: 'inner-dome', name: 'Inner dome', color: '#e4ddcb', description: 'The inner dome: merged ribs, shell and oculus.' },
  { id: 'entrances', name: 'Entrances', color: '#f5f1e6', description: 'The nine entrances and their merged doors.' },
  { id: 'ponds', name: 'Reflecting ponds', color: '#7fb3c8', description: 'The nine reflecting ponds, merged.' },
  { id: 'walkways', name: 'Walkways and skylight', color: '#cfc9bb', description: 'Walkways and the central skylight.' },
];

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
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3,
    indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}
const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'lotus-temple-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Lotus Temple (Bahai House of Worship), Delhi (simplified schematic)',
  title: 'Lotus Temple',
  location: 'Delhi, India',
  blurb: 'The Bahai House of Worship in Delhi in simplified schematic form: 27 white marble petals in three ranks form a lotus 70 m across, sheltering a central prayer hall open to all.',
  sourceUrls: [
    { label: 'Wikipedia: Lotus Temple', url: 'https://en.wikipedia.org/wiki/Lotus_Temple' },
    { label: 'World Architecture: Lotus Temple', url: 'https://worldarchitecture.org/articles/cvcmg/lotus_temple_a_symbol_of_excellence_' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/lotus-temple-simple/lotus-temple-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
