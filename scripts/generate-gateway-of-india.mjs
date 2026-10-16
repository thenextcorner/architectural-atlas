// Procedural Gateway of India (Mumbai) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Gateway of India in code and
// writes it in the atlas binary format:
//   public/models/gateway-of-india/atlas.json
//   public/models/gateway-of-india/gateway-of-india-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Triumphal arch at Apollo Bunder, Mumbai, overlooking the Arabian Sea;
//   built to commemorate the landing of King George V and Queen Mary, the
//   first reigning British monarchs to visit India, in December 1911;
//   foundation stone laid 31 March 1911 by Governor Sir George Sydenham
//   Clarke (construction started 31 March 1913 per Wikipedia); design by
//   Scottish architect George Wittet, final design sanctioned 1914;
//   construction 1915 to 1924, inaugurated 4 December 1924 by Viceroy
//   Rufus Isaacs (Earl of Reading); cost Rs. 21.13 lakhs; Indo-Saracenic
//   style blending Islamic, Hindu and European Gothic Revival elements,
//   with 16th-century Gujarati influences; 26 m (85 ft) high; central dome
//   14.6 m (48 ft) in diameter, 25.3 m (83 ft) high; four turrets with
//   intricate latticework (jali); yellow basalt with reinforced concrete;
//   central arch opens toward the harbor; large halls on each side of the
//   arch holding about 600 people each; steps at the rear lead down to the
//   Arabian Sea; last British troops to leave India passed through the arch
//   in February 1948. (Sources: en.wikipedia.org/wiki/Gateway_of_India,
//   fabhotels.com, mumbaitourism.travel.)
// Schematic (not sourced, never stated as fact in the UI): exact arch
// profile and voussoir count, pier widths, dome rib arrangement, turret
// proportions, hall interiors, jali patterns, parapet and platform forms,
// inscription wording.
//
// Coordinate frame: x = lateral (width), z = depth (harbor is +z), y = up.
// All dimensions in meters.
//
// Granularity: 102 named parts across 8 systems.
//
// Usage: node scripts/generate-gateway-of-india.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'gateway-of-india');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~50 m width) maps to 2.4 units.
const S = 2.4 / 50;

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
// Radial voussoirs forming a semicircular arch in the XY plane,
// centered at (cx, cy), radius R, at depth cz (extruded depth d).
function archVoussoirs(cx, cy, cz, R, radialH, d, n) {
  const geoms = [];
  for (let i = 0; i < n; i++) {
    const am = ((i + 0.5) / n) * Math.PI;
    const w = (Math.PI * R) / n;
    const g = new THREE.BoxGeometry(w * 0.96, radialH, d);
    g.rotateZ(am + Math.PI / 2);
    g.translate(cx + Math.cos(am) * R, cy + Math.sin(am) * R, cz);
    geoms.push(g);
  }
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const exp = (name, text) => { explanations[name.toLowerCase()] = text; };

// Vertical datum (meters): platform top y = 2; arch springs at y = 10;
// arch crown at y = 18; dome base y = 20; dome apex y = 26.
const ARCH_CX = 0, ARCH_CY = 10, ARCH_R = 7, DEPTH = 8;

// --- Central arch: piers, 10 voussoirs, keystone, spandrels, soffit: 15 parts.
addPart('arch-pier-left', 'Left arch pier', 'central-arch', [box(-11, -7, 2, 10, -4, 4)]);
exp('Left arch pier', 'The left pier of the great central arch, in yellow basalt. Exact pier width is schematic.');
addPart('arch-pier-right', 'Right arch pier', 'central-arch', [box(7, 11, 2, 10, -4, 4)]);
exp('Right arch pier', 'The right pier of the great central arch, in yellow basalt. Exact pier width is schematic.');
{
  const vous = archVoussoirs(ARCH_CX, ARCH_CY, 0, ARCH_R, 2.2, DEPTH, 10);
  vous.forEach((g, i) => {
    addPart(`arch-voussoir-${i + 1}`, `Arch voussoir ${i + 1}`, 'central-arch', [g]);
    exp(`Arch voussoir ${i + 1}`, `Voussoir ${i + 1} of 10 forming the great arch ring. The Indo-Saracenic arch shows Gujarati influence. Exact voussoir count is schematic.`);
  });
}
addPart('arch-keystone', 'Arch keystone', 'central-arch', [box(-0.9, 0.9, 16.2, 19.4, -4, 4)]);
exp('Arch keystone', 'The keystone locking the great arch ring at its crown. Exact form is schematic.');
addPart('spandrel-left', 'Left spandrel', 'central-arch', [box(-11, -7.5, 12, 20, -4, 4)]);
exp('Left spandrel', 'The spandrel wall filling between the arch ring and the left pier. Exact form is schematic.');
addPart('spandrel-right', 'Right spandrel', 'central-arch', [box(7.5, 11, 12, 20, -4, 4)]);
exp('Right spandrel', 'The spandrel wall filling between the arch ring and the right pier. Exact form is schematic.');
{
  const soffit = new THREE.CylinderGeometry(ARCH_R, ARCH_R, DEPTH, 20, 1, true, 0, Math.PI);
  soffit.rotateX(Math.PI / 2);
  soffit.translate(0, ARCH_CY, 0);
  addPart('arch-soffit', 'Arch soffit', 'central-arch', [soffit]);
  exp('Arch soffit', 'The curved underside (soffit) of the great arch. Exact curvature is schematic.');
}

// --- Dome: drum, 12 shell segments, finial, base molding: 15 parts.
addPart('dome-drum', 'Dome drum', 'dome', [cyl(7.8, 8.2, 2.5, 0, 21.2, 0, 24)]);
exp('Dome drum', 'The drum carrying the central dome, 14.6 m in diameter. Exact drum height is schematic.');
{
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const seg = new THREE.SphereGeometry(7.3, 6, 8, a0, Math.PI * 2 / 12, 0, Math.PI / 2.15);
    seg.scale(1, 1.25, 1);
    seg.translate(0, 20.5, 0);
    addPart(`dome-segment-${i + 1}`, `Dome segment ${i + 1}`, 'dome', [seg]);
    exp(`Dome segment ${i + 1}`, `Dome shell segment ${i + 1} of 12. The central dome rises 25.3 m above the ground. Exact segmentation is schematic.`);
  }
}
addPart('dome-finial', 'Dome finial', 'dome', [cyl(0.25, 0.5, 3.2, 0, 30.5, 0, 10), new THREE.SphereGeometry(0.55, 10, 8).translate(0, 32.2, 0)]);
exp('Dome finial', 'The finial crowning the central dome. Exact form is schematic.');
addPart('dome-base-molding', 'Dome base molding', 'dome', [cyl(8.6, 8.6, 0.8, 0, 20, 0, 24)]);
exp('Dome base molding', 'The molding at the dome springing. Exact profile is schematic.');
{
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = strut([Math.cos(a) * 7.3, 22.5, Math.sin(a) * 7.3], [0, 29.5, 0], 0.45, 0.45);
    addPart(`dome-rib-${i + 1}`, `Dome rib ${i + 1}`, 'dome', [rib]);
    exp(`Dome rib ${i + 1}`, `Dome rib ${i + 1} of 8 articulating the dome shell. Exact rib arrangement is schematic.`);
  }
}

// --- Turrets: 4 corner turrets, each with base, shaft, balcony, dome, finial: 20 parts.
const TUR = [[-16, -6], [16, -6], [-16, 6], [16, 6]];
const TNAMES = ['Northwest', 'Northeast', 'Southwest', 'Southeast'];
TUR.forEach(([tx, tz], ti) => {
  const nm = TNAMES[ti];
  const key = `${ti + 1}`;
  addPart(`turret-${key}-base`, `${nm} turret base`, 'turrets', [box(tx - 2.2, tx + 2.2, 2, 8, tz - 2.2, tz + 2.2)]);
  exp(`${nm} turret base`, `The base of the ${nm.toLowerCase()} turret. The four turrets carry intricate latticework. Exact form is schematic.`);
  addPart(`turret-${key}-shaft`, `${nm} turret shaft`, 'turrets', [cyl(1.5, 1.8, 10, tx, 13, tz, 12)]);
  exp(`${nm} turret shaft`, `The shaft of the ${nm.toLowerCase()} turret with its carved latticework panels. Exact carving is schematic.`);
  addPart(`turret-${key}-balcony`, `${nm} turret balcony`, 'turrets', [cyl(2.3, 2.3, 0.7, tx, 18.3, tz, 12)]);
  exp(`${nm} turret balcony`, `The balconied cornice of the ${nm.toLowerCase()} turret. Exact form is schematic.`);
  const mini = new THREE.SphereGeometry(1.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  mini.translate(tx, 18.6, tz);
  addPart(`turret-${key}-dome`, `${nm} turret dome`, 'turrets', [mini]);
  exp(`${nm} turret dome`, `The small dome capping the ${nm.toLowerCase()} turret. Exact profile is schematic.`);
  addPart(`turret-${key}-finial`, `${nm} turret finial`, 'turrets', [cyl(0.12, 0.25, 1.6, tx, 21.2, tz, 8)]);
  exp(`${nm} turret finial`, `The finial of the ${nm.toLowerCase()} turret. Exact form is schematic.`);
});

// --- Side halls: 2 halls with walls, roofs, columns: 16 parts.
for (const [side, sname] of [[-1, 'West'], [1, 'East']]) {
  const hx = side * 19;
  addPart(`${sname.toLowerCase()}-hall-north-wall`, `${sname} hall north wall`, 'side-halls', [box(hx - 5, hx + 5, 2, 9, -9.5, -8)]);
  exp(`${sname} hall north wall`, `The north wall of the ${sname.toLowerCase()} side hall. The halls flanking the arch each hold about 600 people. Exact interior is schematic.`);
  addPart(`${sname.toLowerCase()}-hall-south-wall`, `${sname} hall south wall`, 'side-halls', [box(hx - 5, hx + 5, 2, 9, 8, 9.5)]);
  exp(`${sname} hall south wall`, `The south wall of the ${sname.toLowerCase()} side hall. Exact interior is schematic.`);
  addPart(`${sname.toLowerCase()}-hall-outer-wall`, `${sname} hall outer wall`, 'side-halls', [box(hx + side * 4.2, hx + side * 5.8, 2, 9, -9.5, 9.5)]);
  exp(`${sname} hall outer wall`, `The outer wall of the ${sname.toLowerCase()} side hall. Exact form is schematic.`);
  addPart(`${sname.toLowerCase()}-hall-roof`, `${sname} hall roof`, 'side-halls', [box(hx - 5.5, hx + 5.5, 9, 10, -10, 10)]);
  exp(`${sname} hall roof`, `The roof of the ${sname.toLowerCase()} side hall. Exact form is schematic.`);
  const cols = [];
  for (const cxo of [-2.5, 2.5]) for (const czo of [-4, 4]) cols.push(cyl(0.45, 0.55, 7, hx + cxo, 5.5, czo, 10));
  addPart(`${sname.toLowerCase()}-hall-columns`, `${sname} hall columns`, 'side-halls', cols);
  exp(`${sname} hall columns`, `Interior columns of the ${sname.toLowerCase()} side hall. Exact arrangement is schematic.`);
  addPart(`${sname.toLowerCase()}-hall-floor`, `${sname} hall floor`, 'side-halls', [box(hx - 5, hx + 5, 2, 2.4, -9.5, 9.5)]);
  exp(`${sname} hall floor`, `The floor of the ${sname.toLowerCase()} side hall. Exact finish is schematic.`);
  const hallArch = archVoussoirs(hx, 6.5, 0, 3, 1.2, 2, 6);
  addPart(`${sname.toLowerCase()}-hall-inner-arch`, `${sname} hall inner arch`, 'side-halls', hallArch);
  exp(`${sname} hall inner arch`, `The inner arch of the ${sname.toLowerCase()} side hall. Exact profile is schematic.`);
}

// --- Facade: jali screens, medallions, cornices, inscription: 14 parts.
{
  for (let i = 0; i < 8; i++) {
    const jx = -14 + i * 4;
    const jali = box(jx - 1.2, jx + 1.2, 13, 17, 4.05, 4.35);
    addPart(`jali-panel-${i + 1}`, `Jali panel ${i + 1}`, 'facade', [jali]);
    exp(`Jali panel ${i + 1}`, `Carved stone latticework (jali) panel ${i + 1} of 8, filtering sunlight into geometric shadows. Exact pattern is schematic.`);
  }
  for (let i = 0; i < 4; i++) {
    const mx = -9 + i * 6;
    const med = cyl(1.1, 1.1, 0.3, mx, 21.5, 4.1, 16);
    med.rotateX(Math.PI / 2);
    addPart(`medallion-${i + 1}`, `Facade medallion ${i + 1}`, 'facade', [med]);
    exp(`Facade medallion ${i + 1}`, `Decorative medallion ${i + 1} of 4 on the harbor facade. Exact ornament is schematic.`);
  }
}
addPart('main-cornice', 'Main cornice', 'facade', [box(-24, 24, 19.2, 20, -5, 5)]);
exp('Main cornice', 'The main cornice running across the harbor facade. Exact profile is schematic.');
addPart('inscription-tablet', 'Commemorative inscription', 'facade', [box(-4, 4, 17.5, 19, 4.1, 4.35)]);
exp('Commemorative inscription', 'The tablet recording the 1911 landing of King George V and Queen Mary that the arch commemorates. Exact wording is schematic.');

// --- Side arches: 4 smaller flanking arches.
for (const [sx, sz, nm] of [[-13.5, 0, 'West inner'], [13.5, 0, 'East inner'], [-22, 0, 'West outer'], [22, 0, 'East outer']]) {
  const vous = archVoussoirs(sx, 6, 0, 2.5, 1.1, 3, 6);
  const key = nm.toLowerCase().replace(/ /g, '-');
  addPart(`${key}-arch`, `${nm} side arch`, 'side-arches', vous);
  exp(`${nm} side arch`, `The ${nm.toLowerCase()} flanking arch. Exact profile is schematic.`);
}

// --- Platform: slab, steps, plinth, sea steps: 5 parts.
addPart('platform-slab', 'Platform slab', 'platform', [box(-25, 25, 0, 2, -12, 12)]);
exp('Platform slab', 'The high stone platform lifting the monument above the harbor promenade, guarding against tides and monsoon flooding. Exact buildup is schematic.');
{
  const steps = [];
  for (let s = 0; s < 3; s++) steps.push(box(-25 - (s + 1) * 1.5, 25 + (s + 1) * 1.5, -0.7 * (s + 1), -0.7 * s, -12 - (s + 1) * 1.2, 12 + (s + 1) * 1.2));
  addPart('platform-steps', 'Platform steps', 'platform', steps);
  exp('Platform steps', 'Steps up to the platform. Exact count is schematic.');
}
addPart('sea-steps', 'Harbor steps', 'platform', [box(-8, 8, -1.5, 0.5, 12, 18)]);
exp('Harbor steps', 'The flight of steps at the rear leading down to the Arabian Sea. Exact form is schematic.');
addPart('corner-pilasters-nw', 'Northwest corner pilaster', 'platform', [box(-25.8, -24.2, 2, 19, -5.8, -4.2)]);
exp('Northwest corner pilaster', 'Corner pilaster tying the platform to the superstructure. Exact form is schematic.');
addPart('corner-pilasters-se', 'Southeast corner pilaster', 'platform', [box(24.2, 25.8, 2, 19, 4.2, 5.8)]);
exp('Southeast corner pilaster', 'Corner pilaster tying the platform to the superstructure. Exact form is schematic.');

// --- Parapets: 4 sections.
addPart('parapet-north', 'North parapet', 'parapets', [box(-24, 24, 20, 21.2, -5, -4.2)]);
exp('North parapet', 'The north parapet above the cornice. Exact merlon pattern is schematic.');
addPart('parapet-south', 'South parapet', 'parapets', [box(-24, 24, 20, 21.2, 4.2, 5)]);
exp('South parapet', 'The south parapet above the cornice. Exact merlon pattern is schematic.');
{
  const merlons = [];
  for (let i = 0; i < 12; i++) merlons.push(box(-23 + i * 4, -21.5 + i * 4, 21.2, 22.2, -4.8, -4.4));
  addPart('parapet-merlons-north', 'North parapet merlons', 'parapets', merlons);
  exp('North parapet merlons', 'Merlons crowning the north parapet. Exact pattern is schematic.');
  const merlons2 = [];
  for (let i = 0; i < 12; i++) merlons2.push(box(-23 + i * 4, -21.5 + i * 4, 21.2, 22.2, 4.4, 4.8));
  addPart('parapet-merlons-south', 'South parapet merlons', 'parapets', merlons2);
  exp('South parapet merlons', 'Merlons crowning the south parapet. Exact pattern is schematic.');
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('jali')) return '#c9a86a';
  if (id.includes('medallion') || id === 'inscription-tablet') return '#b8935a';
  if (id === 'arch-keystone') return '#d4af6e';
  if (id.includes('dome-segment') || id === 'dome-drum') return '#d9b878';
  if (id === 'dome-finial') return '#8a6f3e';
  if (id.includes('turret-dome')) return '#d9b878';
  if (id.includes('turret-finial')) return '#8a6f3e';
  if (id.includes('soffit')) return '#a8845c';
  if (id.includes('steps') || id === 'platform-slab') return '#b99a68';
  if (id.includes('parapet-merlons')) return '#c9a86a';
  return '#cfa96f'; // yellow basalt
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'central-arch', name: 'Central arch', color: '#cfa96f', description: 'The great triumphal arch: piers, ten voussoirs, keystone, spandrels and soffit.' },
  { id: 'dome', name: 'Central dome', color: '#d9b878', description: 'The 14.6 m central dome in twelve segments on its drum, with finial.' },
  { id: 'turrets', name: 'Corner turrets', color: '#cfa96f', description: 'The four corner turrets with latticework shafts, balconies and small domes.' },
  { id: 'side-halls', name: 'Side halls', color: '#cfa96f', description: 'The great halls flanking the arch, each holding about 600 people.' },
  { id: 'facade', name: 'Facade ornament', color: '#c9a86a', description: 'Jali latticework panels, medallions, cornice and the commemorative inscription.' },
  { id: 'side-arches', name: 'Flanking arches', color: '#cfa96f', description: 'Four smaller arches flanking the central opening.' },
  { id: 'platform', name: 'Platform', color: '#b99a68', description: 'The raised platform, its steps, the harbor steps and corner pilasters.' },
  { id: 'parapets', name: 'Parapets', color: '#c9a86a', description: 'Parapet walls and merlons above the main cornice.' },
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
const binName = 'gateway-of-india-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Gateway of India, Mumbai',
  title: 'Gateway of India',
  location: 'Mumbai, India',
  blurb: 'George Wittet\u2019s 1924 triumphal arch at Apollo Bunder: a 26 m Indo-Saracenic gateway in yellow basalt, built for the 1911 landing of King George V and the last British troops\u2019 farewell in 1948.',
  sourceUrls: [
    { label: 'Wikipedia: Gateway of India', url: 'https://en.wikipedia.org/wiki/Gateway_of_India' },
    { label: 'FabHotels: Gateway of India guide', url: 'https://www.fabhotels.com/blog/gateway-of-india-mumbai/' },
    { label: 'Mumbai Tourism: Gateway of India', url: 'https://mumbaitourism.travel/gateway-of-india-mumbai' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/gateway-of-india/gateway-of-india-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
