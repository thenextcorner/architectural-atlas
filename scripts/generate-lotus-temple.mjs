// Procedural Lotus Temple (Bahai House of Worship, Delhi) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Lotus Temple in code and
// writes it in the atlas binary format:
//   public/models/lotus-temple/atlas.json
//   public/models/lotus-temple/lotus-temple-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Bahai House of Worship, Kalkaji/Bahapur, South Delhi, completed
//   30 September 1986, inaugurated 24 December 1986, opened 1 January
//   1987; architect Fariborz Sahba (Iranian, design begun 1976);
//   structural engineer Flint & Neill; built by ECC Construction Group,
//   Larsen & Toubro; Expressionist style; 27 free-standing marble-clad
//   petals arranged in clusters of three to form nine sides; three ranks
//   of nine petals each springing from a podium that elevates the building
//   above the surrounding plain; the first two ranks curve inward,
//   embracing the inner dome, while the third (outer) rank curves outward
//   to form canopies over the nine entrances; double-layered interior dome
//   modelled on the innermost portion of the lotus, comprising 54 ribs with
//   concrete shells in between; central hall 34 m diameter, 33.6 m high
//   above the podium, ringed by nine arches supporting the superstructure;
//   nine doors opening onto the central hall; seating capacity 1,300;
//   overall height 34.27 m per the architectural case study (Wikipedia
//   infobox lists 40.8 m, noted as an alternate); overall diameter 70 m;
//   white marble from the Penteli mountain, Greece, over reinforced
//   concrete; nine ponds and walkways on a 9.7-hectare site; no idols, no
//   photographs, no pulpits or altars; open to all regardless of religion.
//   (Sources: en.wikipedia.org/wiki/Lotus_Temple,
//   worldarchitecture.org, indiantravelchannel.com.)
// Schematic (not sourced, never stated as fact in the UI): exact petal
// curvature profiles, petal thickness, podium height and radius, pond
// shapes and positions, walkway layout, entrance arch profiles, dome rib
// cross-sections, oculus form, skylight glazing.
//
// Coordinate frame: y = up, radial layout around origin. All dimensions
// in meters.
//
// Granularity: 117 named parts across 8 systems. Explanations for
// repetitive parts (petals, ribs, entrances, ponds) are generated
// programmatically; each states its rank/position and marks the exact
// profile as schematic.
//
// Usage: node scripts/generate-lotus-temple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'lotus-temple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (70 m diameter) maps to 2.4 units.
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

// Solid petal: lofted leaf-shaped shell along a curved spine.
// Spine is a quadratic bezier in (radius, height); the petal is oriented
// radially at angle theta. Cross-sections taper from width0 at the base to
// a point at the tip, with slight camber and thickness.
function solidPetal(theta, baseR, baseY, ctrlR, ctrlY, tipR, tipY, width0, thick, segs = 10, across = 6) {
  const radial = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
  const side = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
  const up = new THREE.Vector3(0, 1, 0);
  const bz = (t, p0, p1, p2) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  const positions = [];
  const index = [];
  // grid: (segs+1) stations x (across+1) points x 2 (front/back)
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = bz(t, baseR, ctrlR, tipR);
    const y = bz(t, baseY, ctrlY, tipY);
    // tangent in (r, y) plane
    const dr = 2 * (1 - t) * (ctrlR - baseR) + 2 * t * (tipR - ctrlR);
    const dy = 2 * (1 - t) * (ctrlY - baseY) + 2 * t * (tipY - ctrlY);
    const tangent = new THREE.Vector3().addScaledVector(radial, dr).addScaledVector(up, dy).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    const center = new THREE.Vector3().addScaledVector(radial, r).addScaledVector(up, y);
    const w = width0 * Math.pow(Math.cos((t * Math.PI) / 2), 0.7);
    const th = thick * (1 - 0.55 * t);
    for (let j = 0; j <= across; j++) {
      const u = (j / across - 0.5) * 2; // -1..1
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
  // side skirts around the perimeter
  for (let i = 0; i < segs; i++) {
    const a0 = i * rowLen; // front-left
    const a1 = a0 + 1; // back-left
    const b0 = (i + 1) * rowLen;
    const b1 = b0 + 1;
    idx.push(a0, b0, a1, a1, b0, b1);
    const c0 = i * rowLen + across * 2;
    const c1 = c0 + 1;
    const d0 = (i + 1) * rowLen + across * 2;
    const d1 = d0 + 1;
    idx.push(c0, c1, d0, d0, c1, d1);
  }
  // base cap
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

// Vertical datum (meters): podium top at y = 3; petals spring from podium.
const PODIUM_TOP = 3;

// --- Podium: circular podium, entrance steps, plinth ring: 3 parts.
addPart('podium-slab', 'Podium slab', 'podium', [cyl(36, 37, 3, 0, 1.5, 0, 48)]);
exp('Podium slab', 'The circular podium that elevates the temple above the surrounding plain, springing the 27 petals. Exact podium radius and height are schematic.');
{
  const steps = [];
  for (let s = 0; s < 3; s++) {
    steps.push(cyl(38.5 + s * 1.5, 38.5 + s * 1.5, 0.6, 0, 2.7 - s * 0.6, 0, 48));
  }
  addPart('podium-steps', 'Podium entrance steps', 'podium', steps);
  exp('Podium entrance steps', 'Stepped rings leading up to the podium around the temple. Exact step count and profile are schematic.');
}
addPart('plinth-ring', 'Petal plinth ring', 'podium', [cyl(30, 31, 1.2, 0, 3.6, 0, 48)]);
exp('Petal plinth ring', 'The raised plinth ring from which the three ranks of petals spring. Exact form is schematic.');

// --- Petals: three ranks of nine. Inner and middle curve inward, outer
// curves outward to form entrance canopies.
const RANK = [
  { key: 'inner', name: 'Inner', system: 'inner-petals', baseR: 10, baseY: 3.5, ctrlR: 9, ctrlY: 18, tipR: 4.5, tipY: 30, width0: 9, thick: 1.6 },
  { key: 'middle', name: 'Middle', system: 'middle-petals', baseR: 18, baseY: 3.5, ctrlR: 16, ctrlY: 20, tipR: 9, tipY: 32, width0: 11, thick: 1.8 },
  { key: 'outer', name: 'Outer', system: 'outer-petals', baseR: 26, baseY: 3.5, ctrlR: 30, ctrlY: 14, tipR: 34, tipY: 22, width0: 12, thick: 2.0 },
];
for (const rank of RANK) {
  for (let k = 0; k < 9; k++) {
    const theta = (k / 9) * Math.PI * 2;
    const id = `${rank.key}-petal-${k + 1}`;
    const name = `${rank.name} petal ${k + 1}`;
    addPart(id, name, rank.system, [
      solidPetal(theta, rank.baseR, rank.baseY, rank.ctrlR, rank.ctrlY, rank.tipR, rank.tipY, rank.width0, rank.thick),
    ]);
    exp(name, `One of the nine ${rank.key}-rank marble petals (petal ${k + 1} of 9), ${rank.key === 'outer' ? 'curving outward to form a canopy over an entrance' : 'curving inward to embrace the inner dome'}. The 27 petals are clad in white Penteli marble over reinforced concrete. Exact curvature is schematic.`);
  }
}

// --- Inner dome: 54 ribs, concrete shell segments, oculus: 56 parts.
{
  const apexY = 34;
  const baseR = 14;
  const baseY = 12;
  for (let k = 0; k < 54; k++) {
    const theta = (k / 54) * Math.PI * 2;
    const bx = Math.cos(theta) * baseR;
    const bz = Math.sin(theta) * baseR;
    const id = `dome-rib-${k + 1}`;
    const name = `Inner dome rib ${k + 1}`;
    addPart(id, name, 'inner-dome', [strut([bx, baseY, bz], [0, apexY, 0], 0.5, 0.5)]);
    exp(name, `One of the 54 concrete ribs of the double-layered inner dome (rib ${k + 1} of 54), modelled on the innermost portion of the lotus. Exact rib profile is schematic.`);
  }
  const shell = new THREE.SphereGeometry(15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6);
  shell.translate(0, 6, 0);
  addPart('inner-dome-shell', 'Inner dome shell', 'inner-dome', [shell]);
  exp('Inner dome shell', 'The concrete shell between the 54 ribs of the double-layered inner dome, modelled on the innermost portion of the lotus. Exact shell form is schematic.');
  addPart('dome-oculus', 'Dome oculus', 'inner-dome', [cyl(2.2, 2.2, 1.2, 0, apexY - 0.5, 0, 24)]);
  exp('Dome oculus', 'The oculus crowning the inner dome, admitting daylight into the central hall. Exact form is schematic.');
}

// --- Entrances: nine arched entrances between the outer petals, with doors.
// Built in a local frame (x = tangential, z = radial), rotated into place.
for (let k = 0; k < 9; k++) {
  const theta = ((k + 0.5) / 9) * Math.PI * 2; // centered between outer petals
  const r = 26;
  const cx = Math.cos(theta) * r;
  const cz = Math.sin(theta) * r;
  const rot = -theta - Math.PI / 2; // local X -> tangential, local Z -> radial
  const place = (g) => { g.rotateY(rot); g.translate(cx, 0, cz); return g; };
  const jambL = place(box(2.2, 3.8, 3, 12, -0.8, 0.8));
  const jambR = place(box(-3.8, -2.2, 3, 12, -0.8, 0.8));
  const archG = new THREE.TorusGeometry(3, 0.9, 8, 14, Math.PI);
  archG.translate(0, 12, 0);
  place(archG);
  const id = `entrance-${k + 1}`;
  const name = `Entrance ${k + 1}`;
  addPart(id, name, 'entrances', [jambL, jambR, archG]);
  exp(name, `One of the nine entrances (entrance ${k + 1} of 9), sheltered by an outer petal canopy. The nine doors open onto the central hall. Exact arch profile is schematic.`);
  const dg = new THREE.BoxGeometry(4.8, 7.5, 0.5);
  place(dg);
  dg.translate(0, 6.75, 0);
  addPart(`entrance-door-${k + 1}`, `Entrance door ${k + 1}`, 'entrances', [dg]);
  exp(`Entrance door ${k + 1}`, `The door of entrance ${k + 1} of 9, opening onto the central prayer hall. Exact door design is schematic.`);
}

// --- Ponds: nine reflecting ponds around the podium.
for (let k = 0; k < 9; k++) {
  const theta = (k / 9) * Math.PI * 2 + Math.PI / 9;
  const r = 46;
  const cx = Math.cos(theta) * r;
  const cz = Math.sin(theta) * r;
  const water = cyl(6, 6, 0.4, cx, 0.2, cz, 6);
  const rim = new THREE.CylinderGeometry(6.8, 6.8, 0.8, 6, 1, true);
  rim.translate(cx, 0.4, cz);
  const id = `pond-${k + 1}`;
  const name = `Reflecting pond ${k + 1}`;
  addPart(id, name, 'ponds', [water, rim]);
  exp(name, `One of the nine reflecting ponds (pond ${k + 1} of 9) ringing the temple; the lotus grows in water, so the ponds complete the flower's setting. Exact pond shape and position are schematic.`);
}

// --- Walkways and skylight.
{
  const walks = [];
  for (let k = 0; k < 3; k++) {
    const theta = (k / 3) * Math.PI * 2;
    walks.push(strut([Math.cos(theta) * 38, 0.3, Math.sin(theta) * 38], [Math.cos(theta) * 56, 0.3, Math.sin(theta) * 56], 3, 3));
  }
  addPart('walkways', 'Garden walkways', 'walkways', walks);
  exp('Garden walkways', 'Walkways crossing the gardens between the reflecting ponds. Exact layout is schematic.');
  const sky = cyl(3, 3, 0.3, 0, 33, 0, 24);
  addPart('skylight', 'Central skylight', 'walkways', [sky]);
  exp('Central skylight', 'Glazing at the crown of the inner dome, washing the prayer hall in daylight. Exact glazing is schematic.');
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('pond-')) return '#7fb3c8';
  if (id === 'skylight') return '#bcd6e2';
  if (id === 'podium-steps' || id === 'walkways') return '#cfc9bb';
  if (id === 'podium-slab' || id === 'plinth-ring') return '#e8e2d2';
  if (id.startsWith('dome-rib')) return '#ded8c8';
  if (id === 'inner-dome-shell' || id === 'dome-oculus') return '#e4ddcb';
  if (id.startsWith('entrance-door')) return '#8a7a5f';
  return '#f5f1e6'; // white Penteli marble
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'podium', name: 'Podium', color: '#e8e2d2', description: 'The circular podium elevating the temple above the plain, with entrance steps and the plinth ring the petals spring from.' },
  { id: 'inner-petals', name: 'Inner petal rank', color: '#f5f1e6', description: 'The nine inner marble petals, curving inward to embrace the inner dome.' },
  { id: 'middle-petals', name: 'Middle petal rank', color: '#f5f1e6', description: 'The nine middle marble petals, curving inward over the inner rank.' },
  { id: 'outer-petals', name: 'Outer petal rank', color: '#f5f1e6', description: 'The nine outer marble petals, curving outward to form canopies over the nine entrances.' },
  { id: 'inner-dome', name: 'Inner dome', color: '#ded8c8', description: 'The double-layered inner dome: 54 concrete ribs with shells between, modelled on the innermost lotus bud.' },
  { id: 'entrances', name: 'Entrances', color: '#f5f1e6', description: 'The nine entrances between the outer petals, each with its door opening onto the central hall.' },
  { id: 'ponds', name: 'Reflecting ponds', color: '#7fb3c8', description: 'The nine reflecting ponds ringing the temple; the lotus grows in water.' },
  { id: 'walkways', name: 'Walkways and skylight', color: '#cfc9bb', description: 'Garden walkways and the central skylight crowning the dome.' },
];

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
const binName = 'lotus-temple-0.bin';
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
  scope: 'Lotus Temple (Bahai House of Worship), Delhi',
  title: 'Lotus Temple',
  location: 'Delhi, India',
  blurb: 'The Bahai House of Worship in Delhi, completed 1986 to Fariborz Sahba\u2019s design: 27 white marble petals in three ranks of nine form a lotus 70 m across, sheltering a central prayer hall open to all.',
  sourceUrls: [
    { label: 'Wikipedia: Lotus Temple', url: 'https://en.wikipedia.org/wiki/Lotus_Temple' },
    { label: 'World Architecture: Lotus Temple', url: 'https://worldarchitecture.org/articles/cvcmg/lotus_temple_a_symbol_of_excellence_' },
    { label: 'Indian Travel Channel: Lotus Temple', url: 'https://www.indiantravelchannel.com/lotus-temple-new-delhis-bahai-house-of-worship.html' },
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
  chunks: [{ url: '/models/lotus-temple/lotus-temple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
