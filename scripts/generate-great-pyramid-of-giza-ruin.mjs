// Procedural Great Pyramid of Giza, RUIN variant for the Architectural Atlas.
//
// Builds the pyramid AS IT STANDS TODAY: the smooth white Tura limestone
// casing was stripped away over centuries (earthquakes, then carting to
// Cairo in 1356), the pyramidion capstone is lost, and the stepped core
// masonry is exposed and truncated to about 138.5 m. Writes the atlas
// binary format:
//   public/models/great-pyramid-of-giza-ruin/atlas.json
//   public/models/great-pyramid-of-giza-ruin/great-pyramid-of-giza-ruin-0.bin
//
// The interior (passages, Grand Gallery, King's Chamber, Queen's Chamber,
// relieving chambers, subterranean chamber) is stonework that survives
// intact, so it is modeled as built. The funerary complex is ruined
// honestly from the research brief: the mortuary temple keeps only its
// basalt paving and foundation walls, the causeway keeps only its outline
// (a few remnants survive), and the never-excavated valley temple keeps
// only its outline; the speculative buried interior parts are dropped.
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/great-pyramid-of-giza-attribution.md,
// opened 2026-09-30):
//   Built for Pharaoh Khufu (Cheops), Fourth Dynasty, around 2560 BC; about
//   20 years; about 20,000 skilled workers in named work gangs, not slaves.
//   Original height 146.6 m (481 ft); current height about 138.8 m after the
//   loss of the casing stones and the pyramidion. Base originally 230.4 m per
//   side (440 royal cubits), today about 230.36 m; sides differ by only a few
//   centimeters; base aligned to true north within 0.05 degrees. Slope about
//   51 deg 50 min 40 sec. About 2.3 million blocks averaging 2.5 tonnes, the
//   largest 80 tonnes; total about 5.75 million tonnes; tallest man-made
//   structure for over 3,800 years. Casing of fine white Tura limestone up to
//   2.5 m thick weighing upwards of 15 tonnes; a 1301 earthquake loosened many
//   casing stones, carted away in 1356 under Sultan An-Nasir Nasir-ad-Din
//   al-Hasan for mosques and fortresses in Cairo; casing survives in situ
//   around the base. Entrance on the north face. Descending corridor at about
//   26.5 degrees; one branch continues down to the subterranean chamber, the
//   other turns up the ascending passage (39 m, about 1.05 m wide and 1.2 m
//   high, at 26 degrees) to the Grand Gallery. Grand Gallery: 47 m long,
//   8.5 m high, corbelled walls in seven stepped tiers narrowing to a ceiling
//   about 1.04 m wide; ramps with notches on both sides; gallery centreline
//   about 7.22 m east of the pyramid centre axis; the Great Step at its top.
//   King's Chamber: 10.47 x 5.23 m, about 5.85 m high, lined entirely with
//   red granite from Aswan, some 900 km south; chamber floor about 42.99 m
//   above the base; ceiling of nine flat granite slabs each 25 to 40 tonnes;
//   sarcophagus hollowed from a single piece of red Aswan granite, too large
//   to fit through the passage (placed during construction), lidless and
//   empty; five relieving chambers above (Davison's, Wellington's, Nelson's,
//   Lady Arbuthnot's, Campbell's), the top one with a pointed gabled roof;
//   chamber walls carry work-gang graffiti naming Khufu. Queen's Chamber:
//   about 5.74 x 5.23 m, 4.57 m high, gabled roof; large niche in the east
//   wall; two narrow shafts about 20 cm wide that do not reach the surface,
//   blocked by limestone "doors"; Mark Lehner suggests a serdab for the
//   pharaoh's Ka statue. King's Chamber air shafts: northern shaft about
//   59.5 m, southern about 53.5 m, reaching the outer faces. Subterranean
//   chamber: largest of the three chambers, rough-cut and unfinished in the
//   bedrock about 27 m below the plateau surface. ScanPyramids Big Void
//   (2017, muon tomography): about 30 m long cavity above the Grand Gallery
//   with a cross-section mirroring it; north-face corridor, 9 m long,
//   confirmed by endoscopy in 2023 behind the chevron blocks above the
//   entrance. Mortuary temple on the east side, 52.2 m north to south and
//   40 m east to west, nearly gone except for black basalt paving; a causeway
//   linked it to the Valley Temple, buried beneath the village of Nazlet
//   el-Samman and never excavated. The Sphinx belongs to Khafre's complex
//   and is not modeled here.
// Schematic (not sourced, never stated as fact in the UI): the stepped core
// courses (count, thickness and setback); the truncated summit form; the
// entrance height above the base (about 17 m); exact
// passage routings beyond the sourced lengths, angles and chamber altitudes;
// antechamber and portcullis positions; the well shaft routing; the detailed
// geometry of the air shafts, the Big Void and the north-face corridor;
// exact interior placement beyond the sourced 7.22 m gallery offset and the
// 42.99 m King's Chamber altitude; void chambers shown as solid schematic
// masses; the mortuary temple plan beyond its sourced footprint and basalt
// paving; the causeway and valley temple in outline at schematic positions,
// rendered unexcavated;
// the queens' pyramids, boat pits, the Khufu ship and the wider plateau are
// not modeled.
//
// Model frame: x east, z south, y up, metres.
//
// Granularity: 89 named parts across 12 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly marked
// schematic.
//
// Usage: node scripts/generate-great-pyramid-of-giza-ruin.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'great-pyramid-of-giza-ruin');
fs.mkdirSync(outDir, { recursive: true });

// RUIN: today the casing and pyramidion are gone, so the pyramid stands at
// the current height of about 138.5 m (sourced in the research brief).
const HR = 138.5;

// Atlas units: longest dimension (500 m, the illustrated site frame)
// maps to 7.2 units (3x the usual fit: keeps the exploded cloud, which lifts
// a fixed +1 world unit, inside the frame).
const S = 7.2 / 500;

// Pyramid constants (sourced): base 230.4 m, original height 146.6 m.
const B = 115.2;
const H = 146.6;
const hw = (y) => B * (1 - y / H); // face half-width at height y

// ---------------------------------------------------------------- helpers
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
// Rectangular tube from a to b with cross-section w (x) by h (z), for
// passages whose direction stays in the yz plane (no roll).
function tube(a, b, w, h) {
  return strut(a, b, w, h);
}
// Quad slab: planar quad p0..p3 (ordered around the perimeter) with
// thickness t along normal n. Winding is auto-corrected so the front face
// points along +n. Rotate-before-translate is not needed: corners are given
// in final coordinates.
function quadSlab(p0, p1, p2, p3, n, t) {
  const nn = new THREE.Vector3(...n).normalize();
  const off = nn.clone().multiplyScalar(t / 2);
  const P = [p0, p1, p2, p3].map((p) => new THREE.Vector3(...p));
  const f = P.map((p) => p.clone().add(off));
  const b = P.map((p) => p.clone().sub(off));
  const pos = new Float32Array([...f, ...b].flatMap((v) => [v.x, v.y, v.z]));
  let idx = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
  ];
  const e1 = new THREE.Vector3().subVectors(f[1], f[0]);
  const e2 = new THREE.Vector3().subVectors(f[2], f[0]);
  if (new THREE.Vector3().crossVectors(e1, e2).dot(nn) < 0) {
    const flipped = [];
    for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);
    idx = flipped;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
// Sloped slab of one pyramid face between heights y0 and y1, thickness t.
// Faces: N (entrance side), S, E, W.
function faceSlab(face, y0, y1, t) {
  const a0 = hw(y0);
  const a1 = hw(y1);
  const F = {
    N: { p: [[-a0, y0, -a0], [a0, y0, -a0], [a1, y1, -a1], [-a1, y1, -a1]], n: [0, 0.618, -0.786] },
    S: { p: [[a0, y0, a0], [-a0, y0, a0], [-a1, y1, a1], [a1, y1, a1]], n: [0, 0.618, 0.786] },
    E: { p: [[a0, y0, a0], [a0, y0, -a0], [a1, y1, -a1], [a1, y1, a1]], n: [0.786, 0.618, 0] },
    W: { p: [[-a0, y0, -a0], [-a0, y0, a0], [-a1, y1, a1], [-a1, y1, -a1]], n: [-0.786, 0.618, 0] },
  }[face];
  return quadSlab(F.p[0], F.p[1], F.p[2], F.p[3], F.n, t);
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
// Interior plan is shown on the pyramid centre axis (the gallery's sourced
// 7.22 m east offset is stated in its explanation).
const IX = 0;

// --- Stepped core: RUIN: the casing skin is stripped and the summit is
// truncated, so the exposed core is 22 full stepped courses plus a flat
// truncated summit at the current height of about 138.5 m (sourced).
// Course count, thickness and setback are schematic, as in the detailed
// model; each course is set back by the thickness of the stripped casing.
{
  const n = 24;
  const ch = H / n; // same course pitch as the detailed model
  for (let k = 0; k < 22; k++) {
    const y0 = k * ch;
    const y1 = (k + 1) * ch;
    const h = hw(y1) - 2.5; // RUIN: stripped of the casing skin (up to 2.5 m thick)
    addPart(`core-course-${k + 1}`, `Core course ${k + 1} of 24`, 'stepped-core', [
      box(-h, h, y0, y1, -h, h),
    ]);
  }
  // RUIN: the flat truncated summit where the stripped core ends at 138.5 m.
  const y0 = 22 * ch;
  const hh = B * (1 - HR / H) - 2.5; // set back along the original casing line
  addPart('core-summit', 'Truncated summit course', 'stepped-core', [
    box(-hh, hh, y0, HR, -hh, hh),
  ]);
}

// --- Casing: RUIN: the full casing faces are gone; only the lowest-course
// stones surviving in situ around the base remain: 4 parts.
for (const [face, name] of [['N', 'north'], ['S', 'south'], ['E', 'east'], ['W', 'west']]) {
  addPart(`casing-in-situ-${name}`, `Surviving casing, ${name} base`, 'casing', [
    faceSlab(face, 0, 6, 3.2),
  ]);
}
// RUIN: the four full casing faces were stripped over the centuries,
// especially after the 1301 earthquake and the 1356 carting to Cairo.
// RUIN: the pyramidion capstone is lost; nothing of the summit survives.

// --- Entrance: north face portal (height above base schematic), chevron
// gable blocks, and the 2023 north-face corridor: 3 parts.
{
  const zf = -hw(17);
  const dark = box(IX - 2, IX + 2, 15.5, 18.5, zf - 1.2, zf + 0.2);
  const lintel = box(IX - 3, IX + 3, 18.5, 19.5, zf - 1.4, zf + 0.2);
  addPart('entrance-portal', 'Entrance portal, north face', 'entrance', [dark, lintel]);
  const c1 = strut([IX - 4.5, 20.5, zf - 1.6], [IX, 24.5, zf - 1.6], 1.6, 1.2);
  const c2 = strut([IX + 4.5, 20.5, zf - 1.6], [IX, 24.5, zf - 1.6], 1.6, 1.2);
  addPart('entrance-chevron', 'Chevron gable blocks', 'entrance', [c1, c2]);
  addPart('north-face-corridor', 'North-face corridor (2023)', 'discoveries', [
    box(IX - 1, IX + 1, 20.5, 22.5, zf - 11, zf - 2),
  ]);
}

// --- Passages: descending (two branches), ascending, and the well shaft:
// 5 parts. Angles sourced (26.5 deg descending, 26 deg ascending);
// junction points and routing schematic.
const J = [IX, 5.1, -77.9]; // junction of descending and ascending passages
addPart('descending-passage-upper', 'Descending passage, upper section', 'passages', [
  tube([IX, 17, -hw(17)], J, 2.1, 2.4),
]);
addPart('descending-passage-lower', 'Descending passage, lower section', 'passages', [
  tube(J, [IX, -27, -13.5], 2.1, 2.4),
]);
addPart('ascending-passage', 'Ascending passage', 'passages', [
  tube(J, [IX, 22.33, -42.6], 2.1, 2.4),
]);
addPart('queens-passage', "Queen's Chamber passage", 'passages', [
  tube([IX, 27, -33], [IX, 21.7, -26.6], 1.8, 2.2),
]);
addPart('well-shaft', 'Well shaft', 'passages', [
  strut([IX, -2, -55], [IX, 22.33, -42.6], 1.2),
]);

// --- Grand Gallery: 47 m long, 8.5 m high, seven corbelled tiers, ramps
// with notches, bench sockets, the Great Step: 12 parts.
const G0 = [IX, 22.33, -42.6];
const G1 = [IX, 43.06, -0.1];
addPart('grand-gallery', 'Grand Gallery', 'grand-gallery', [tube(G0, G1, 2.1, 8.6)]);
for (let i = 0; i < 7; i++) {
  // Corbel tiers step inward as they rise; tier widths schematic.
  const w = 2.1 - (i / 7) * 1.06;
  const t = 8.6 / 7;
  const yA = 22.33 + (i * t) / Math.sin((26 * Math.PI) / 180);
  const zA = -42.6 + (i * t) / Math.tan((26 * Math.PI) / 180);
  const yB = 22.33 + ((i + 1) * t) / Math.sin((26 * Math.PI) / 180);
  const zB = -42.6 + ((i + 1) * t) / Math.tan((26 * Math.PI) / 180);
  addPart(`gallery-corbel-tier-${i + 1}`, `Gallery corbel tier ${i + 1} of 7`, 'grand-gallery', [
    tube([IX, yA, zA], [IX, yB, zB], w, 1.4),
  ]);
}
addPart('gallery-ramp-west', 'Gallery west ramp', 'grand-gallery', [
  tube([IX - 1.6, 22.33, -42.6], [IX - 1.6, 43.06, -0.1], 0.9, 0.9),
]);
addPart('gallery-ramp-east', 'Gallery east ramp', 'grand-gallery', [
  tube([IX + 1.6, 22.33, -42.6], [IX + 1.6, 43.06, -0.1], 0.9, 0.9),
]);
{
  const sockets = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const y = 22.33 + t * (43.06 - 22.33);
    const z = -42.6 + t * (-0.1 + 42.6);
    sockets.push(box(IX - 2.2, IX - 1.2, y - 0.4, y + 0.4, z - 0.5, z + 0.5));
    sockets.push(box(IX + 1.2, IX + 2.2, y - 0.4, y + 0.4, z - 0.5, z + 0.5));
  }
  addPart('gallery-bench-sockets', 'Gallery bench sockets', 'grand-gallery', sockets);
}
addPart('great-step', 'Great Step', 'grand-gallery', [
  box(IX - 1.05, IX + 1.05, 43.06, 44.9, -1.6, -0.1),
]);
addPart('kings-passage', "King's Chamber passage", 'passages', [
  box(IX - 1.05, IX + 1.05, 42.99, 44.2, -0.1, 5.4),
]);

// --- Antechamber and portcullis slabs before the King's Chamber: 4 parts.
addPart('kings-antechamber', "King's antechamber", 'passages', [
  box(IX - 1.6, IX + 1.6, 42.99, 46.8, 1.2, 3.8),
]);
for (let i = 0; i < 3; i++) {
  const z = 1.6 + i * 0.9;
  addPart(`portcullis-slab-${i + 1}`, `Portcullis slab ${i + 1} of 3`, 'passages', [
    box(IX - 1.05, IX + 1.05, 42.99, 45.4, z - 0.3, z + 0.3),
  ]);
}

// --- King's Chamber: 10.47 x 5.23 m, about 5.85 m high, red Aswan granite;
// floor about 42.99 m above the base; nine roof slabs of 25 to 40 tonnes;
// sarcophagus; north and south air shafts: 17 parts.
const KC = { x: IX, y: 42.99, z: 8, w: 10.47, d: 5.23, h: 5.85 };
const kx0 = KC.x - KC.w / 2, kx1 = KC.x + KC.w / 2;
const kz0 = KC.z - KC.d / 2, kz1 = KC.z + KC.d / 2;
addPart('kings-chamber-wall-north', "King's Chamber north wall", 'kings-chamber', [
  box(kx0, kx1, KC.y, KC.y + KC.h, kz0 - 1, kz0),
]);
addPart('kings-chamber-wall-south', "King's Chamber south wall", 'kings-chamber', [
  box(kx0, kx1, KC.y, KC.y + KC.h, kz1, kz1 + 1),
]);
addPart('kings-chamber-wall-east', "King's Chamber east wall", 'kings-chamber', [
  box(kx1, kx1 + 1, KC.y, KC.y + KC.h, kz0, kz1),
]);
addPart('kings-chamber-wall-west', "King's Chamber west wall", 'kings-chamber', [
  box(kx0 - 1, kx0, KC.y, KC.y + KC.h, kz0, kz1),
]);
addPart('kings-chamber-floor', "King's Chamber floor", 'kings-chamber', [
  box(kx0, kx1, KC.y - 1, KC.y, kz0, kz1),
]);
for (let i = 0; i < 9; i++) {
  const x0 = kx0 + (i * KC.w) / 9;
  const x1 = kx0 + ((i + 1) * KC.w) / 9;
  addPart(`kings-roof-slab-${i + 1}`, `King's Chamber roof slab ${i + 1} of 9`, 'kings-chamber', [
    box(x0, x1, KC.y + KC.h, KC.y + KC.h + 1.2, kz0 - 1, kz1 + 1),
  ]);
}
addPart('kings-sarcophagus', "Khufu's sarcophagus", 'kings-chamber', [
  box(KC.x - 1.15, KC.x + 1.15, KC.y, KC.y + 1.05, kz1 - 3.6, kz1 - 1.3),
  box(KC.x - 0.95, KC.x + 0.95, KC.y + 0.2, KC.y + 0.95, kz1 - 3.4, kz1 - 1.5),
]);
{
  // Air shafts, about 20 cm square; routing schematic, lengths sourced
  // (north about 59.5 m, south about 53.5 m).
  const n1 = strut([IX, KC.y + 1, kz0], [IX, KC.y + 23.7, kz0 - 22.7], 0.45);
  const n2 = strut([IX, KC.y + 23.7, kz0 - 22.7], [IX, KC.y + 23.7, -hw(KC.y + 23.7)], 0.45);
  addPart('kings-air-shaft-north', "King's Chamber north air shaft", 'kings-chamber', [n1, n2]);
  const s1 = strut([IX, KC.y + 1, kz1], [IX, KC.y + 21.2, kz1 + 20.2], 0.45);
  const s2 = strut([IX, KC.y + 21.2, kz1 + 20.2], [IX, KC.y + 21.2, hw(KC.y + 21.2)], 0.45);
  addPart('kings-air-shaft-south', "King's Chamber south air shaft", 'kings-chamber', [s1, s2]);
}

// --- Five relieving chambers above the King's Chamber (Davison's at the
// bottom, Campbell's with the gabled roof at the top); shown as solid
// schematic masses: 5 parts.
{
  const base = KC.y + KC.h + 1.2;
  const names = ["Davison's", "Wellington's", "Nelson's", "Lady Arbuthnot's", "Campbell's"];
  for (let i = 0; i < 5; i++) {
    const y0 = base + i * 1.9;
    const id = `relieving-${names[i].toLowerCase().replace(/[' ]/g, '')}`;
    const geoms = [box(kx0 - 0.5, kx1 + 0.5, y0, y0 + 1.5, kz0 - 1.5, kz1 + 1.5)];
    if (i === 4) {
      const g1 = strut([kx0 - 0.5, y0 + 1.5, kz0 - 1.5], [KC.x, y0 + 3.4, kz0 - 1.5], 1.4, 3.0);
      const g2 = strut([kx1 + 0.5, y0 + 1.5, kz1 + 1.5], [KC.x, y0 + 3.4, kz1 + 1.5], 1.4, 3.0);
      geoms.push(g1, g2);
    }
    addPart(id, `${names[i]} relieving chamber`, 'relieving-chambers', geoms);
  }
}

// --- Queen's Chamber: about 5.74 x 5.23 m, 4.57 m high, gabled roof,
// east-wall niche, two blocked shafts with limestone doors: 8 parts.
const QC = { x: IX, y: 21.7, z: -24, w: 5.76, d: 5.23, h: 4.57 };
const qx0 = QC.x - QC.w / 2, qx1 = QC.x + QC.w / 2;
const qz0 = QC.z - QC.d / 2, qz1 = QC.z + QC.d / 2;
addPart('queens-chamber-walls', "Queen's Chamber walls", 'queens-chamber', [
  box(qx0 - 0.8, qx1 + 0.8, QC.y, QC.y + QC.h, qz0 - 0.8, qz0),
  box(qx0 - 0.8, qx1 + 0.8, QC.y, QC.y + QC.h, qz1, qz1 + 0.8),
  box(qx0 - 0.8, qx0, QC.y, QC.y + QC.h, qz0, qz1),
  box(qx1, qx1 + 0.8, QC.y, QC.y + QC.h, qz0, qz1),
]);
addPart('queens-chamber-floor', "Queen's Chamber floor", 'queens-chamber', [
  box(qx0, qx1, QC.y - 0.8, QC.y, qz0, qz1),
]);
{
  const r1 = strut([qx0 - 0.8, QC.y + QC.h, qz0 - 0.8], [QC.x, QC.y + QC.h + 2.2, qz0 - 0.8], 1.2, 1.4);
  const r2 = strut([qx1 + 0.8, QC.y + QC.h, qz0 - 0.8], [QC.x, QC.y + QC.h + 2.2, qz0 - 0.8], 1.2, 1.4);
  const r3 = strut([qx0 - 0.8, QC.y + QC.h, qz1 + 0.8], [QC.x, QC.y + QC.h + 2.2, qz1 + 0.8], 1.2, 1.4);
  const r4 = strut([qx1 + 0.8, QC.y + QC.h, qz1 + 0.8], [QC.x, QC.y + QC.h + 2.2, qz1 + 0.8], 1.2, 1.4);
  addPart('queens-chamber-roof', "Queen's Chamber gabled roof", 'queens-chamber', [r1, r2, r3, r4]);
}
addPart('queens-chamber-niche', "Queen's Chamber east niche", 'queens-chamber', [
  box(qx1 - 0.2, qx1 + 1.6, QC.y + 1, QC.y + 3.4, QC.z - 0.9, QC.z + 0.9),
]);
{
  // Shafts about 20 cm wide, blocked, do not reach the surface; routing
  // schematic.
  const n1 = strut([IX, QC.y + 3.2, qz0], [IX, QC.y + 9, qz0 - 5], 0.4);
  const n2 = strut([IX, QC.y + 9, qz0 - 5], [IX, QC.y + 9, qz0 - 12], 0.4);
  addPart('queens-shaft-north', "Queen's Chamber north shaft", 'queens-chamber', [n1, n2]);
  const s1 = strut([IX, QC.y + 3.2, qz1], [IX, QC.y + 9, qz1 + 5], 0.4);
  const s2 = strut([IX, QC.y + 9, qz1 + 5], [IX, QC.y + 9, qz1 + 12], 0.4);
  addPart('queens-shaft-south', "Queen's Chamber south shaft", 'queens-chamber', [s1, s2]);
  addPart('queens-shaft-door-north', "Queen's shaft north blocking stone", 'queens-chamber', [
    box(IX - 0.5, IX + 0.5, QC.y + 8.4, QC.y + 9.6, qz0 - 12.6, qz0 - 11.4),
  ]);
  addPart('queens-shaft-door-south', "Queen's shaft south blocking stone", 'queens-chamber', [
    box(IX - 0.5, IX + 0.5, QC.y + 8.4, QC.y + 9.6, qz1 + 11.4, qz1 + 12.6),
  ]);
}

// --- Subterranean chamber: the largest chamber, rough-cut and unfinished
// in the bedrock about 27 m below the plateau surface; shown as a solid
// schematic mass: 1 part.
addPart('subterranean-chamber', 'Subterranean chamber', 'subterranean', [
  box(IX - 8, IX + 8, -34, -26, -1, 11),
]);

// --- ScanPyramids Big Void (2017): about 30 m long cavity above the Grand
// Gallery, cross-section mirroring it; rendered as a schematic mass: 1 part.
addPart('big-void', 'Big Void (ScanPyramids, 2017)', 'discoveries', [
  box(IX - 1, IX + 1, 55, 63, -42, -2),
]);

// --- Mortuary temple: RUIN: almost entirely disappeared; only the black
// basalt paving and low foundation walls remain. The columned court and the
// sanctuary are gone: 2 parts.
{
  const tx0 = B, tx1 = B + 40, tz = 26.1;
  addPart('mortuary-temple-pavement', 'Mortuary temple basalt pavement', 'funerary-complex', [
    box(tx0, tx1, 0, 0.6, -tz, tz),
  ]);
  addPart('mortuary-temple-foundations', 'Mortuary temple foundation walls', 'funerary-complex', [
    box(tx0, tx0 + 1.5, 0, 2.5, -tz, tz),
    box(tx1 - 1.5, tx1, 0, 2.5, -tz, tz),
    box(tx0, tx1, 0, 2.5, -tz, -tz + 1.5),
    box(tx0, tx1, 0, 2.5, tz - 1.5, tz),
  ]);
  // RUIN: the columned court is gone; the temple has almost entirely disappeared.
  // RUIN: the sanctuary is gone; only paving and foundation walls remain.
}

// --- Causeway: RUIN: only a few remnants survive, so the side walls no
// longer stand. Kept in outline at a partial, schematic length: 1 part.
addPart('causeway', 'Causeway (outline, partial)', 'funerary-complex', [
  box(B + 40, 280, 0, 2.5, -5, 5),
]);
// RUIN: the causeway side walls are gone.

// --- Valley temple: buried beneath the village of Nazlet el-Samman and
// never excavated. RUIN: only the outline is shown; the buried paving and
// walls found there are unverified interior detail and are not modeled: 1 part.
addPart('valley-temple-outline', 'Valley temple (unexcavated, outline)', 'funerary-complex', [
  box(300, 350, 0, 5, -18, 18),
]);

// --- Site: the leveled bedrock platform of the Giza plateau: 1 part.
addPart('bedrock-platform', 'Leveled bedrock platform', 'site', [
  box(-130, 380, -12, 0, -140, 140),
]);


// ---------------------------------------------------------------- colors
// Schematic light palette: warm limestone for the core, bright white for
// the Tura casing, red granite for the King's Chamber; only the Eiffel
// Tower in the atlas is dark.
function colorFor(id) {
  if (id.startsWith('core-course-')) return '#d8cdb4';
  if (id === 'core-summit') return '#d8cdb4';
  if (id.startsWith('casing-in-situ-')) return '#efe6d0';
  if (id === 'entrance-portal') return '#5a4f44';
  if (id === 'entrance-chevron') return '#cbbfa5';
  if (id === 'north-face-corridor' || id === 'big-void') return '#5f7a8c';
  if (id.startsWith('portcullis-slab-')) return '#8a5a52';
  if (id.startsWith('gallery-corbel-tier-')) return '#a39c86';
  if (id === 'grand-gallery' || id === 'great-step') return '#9a937f';
  if (id.startsWith('gallery-')) return '#948d76';
  if (id === 'kings-sarcophagus') return '#8a4f48';
  if (id.startsWith('kings-air-shaft-')) return '#8a8478';
  if (id.startsWith('kings-')) return '#a0655e';
  if (id.startsWith('relieving-')) return '#b08a80';
  if (id.startsWith('queens-')) return '#c4b394';
  if (id === 'subterranean-chamber') return '#7a7468';
  if (id === 'mortuary-temple-pavement') return '#3f4448';
  if (id.startsWith('mortuary-temple-')) return '#b0a58c';
  if (id === 'causeway') return '#c9c2ae';
  if (id === 'valley-temple-outline') return '#d3cbb6';
  if (id === 'bedrock-platform') return '#b0a890';
  return '#8a8478';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'stepped-core', name: 'Stepped core', color: '#d8cdb4', description: 'The exposed roughly coursed masonry core of the pyramid, about 2.3 million blocks, truncated to the current height of about 138.5 m and shown as 22 schematic stepped courses plus a flat summit. The core masonry visible today is the exposed inner structure, not the finished ancient surface.' },
  { id: 'casing', name: 'Surviving casing', color: '#efe6d0', description: 'The few lowest-course Tura limestone casing stones still in place around the base, excavated by Howard Vyse in 1837 and best preserved on the north face. The rest of the smooth white skin was stripped over centuries and carted to Cairo in 1356.' },
  { id: 'entrance', name: 'Entrance', color: '#6e6257', description: 'The original entrance on the north face and its chevron gable blocks.' },
  { id: 'passages', name: 'Passages', color: '#8a8478', description: 'The descending and ascending passages, the antechamber with its portcullis slabs, and the well shaft.' },
  { id: 'grand-gallery', name: 'Grand Gallery', color: '#9a937f', description: 'The 47 m corbelled gallery rising at 26 degrees, with its ramps, bench sockets and the Great Step.' },
  { id: 'kings-chamber', name: "King's Chamber", color: '#a0655e', description: 'The 10.47 by 5.23 m burial chamber of red Aswan granite, its nine roof slabs, the sarcophagus and the air shafts.' },
  { id: 'relieving-chambers', name: 'Relieving chambers', color: '#b08a80', description: "Five rough chambers stacked above the King's Chamber that spread the weight of the masonry above." },
  { id: 'queens-chamber', name: "Queen's Chamber", color: '#c4b394', description: "The smaller chamber below the King's Chamber, with its gabled roof, east niche and blocked shafts." },
  { id: 'subterranean', name: 'Subterranean chamber', color: '#7a7468', description: 'The unfinished chamber rough-cut in the bedrock about 27 m below the plateau.' },
  { id: 'discoveries', name: 'Modern discoveries', color: '#5f7a8c', description: 'Voids found by the ScanPyramids project: the Big Void of 2017 and the north-face corridor of 2023.' },
  { id: 'funerary-complex', name: 'Funerary complex', color: '#b5ad96', description: 'The ruined mortuary temple, surviving only as basalt paving and foundation walls; the causeway and the never-excavated valley temple in outline.' },
  { id: 'site', name: 'Bedrock platform', color: '#b0a890', description: 'The leveled bedrock of the Giza plateau on which the pyramid stands.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let k = 1; k <= 22; k++) {
  explanations[`core course ${k} of 24`] =
    `One of the schematic stepped courses of the exposed pyramid core, built of roughly horizontal masonry totaling about 2.3 million blocks averaging 2.5 tonnes. The smooth Tura casing that once covered this masonry is gone. Course count, thickness and setback are schematic.`;
}
explanations['truncated summit course'] =
  'The flat summit of the stripped core at about 138.5 m, where the lost pyramidion and the top of the casing once began. The pyramid lost about 8 m of height when the casing was removed. Exact form is schematic.';
for (const [name, place] of [['north', 'north'], ['south', 'south'], ['east', 'east'], ['west', 'west']]) {
  explanations[`surviving casing, ${name} base`] =
    `Casing stones still in place around the ${place} base of the pyramid, showing the original precision fit of the fine white Tura limestone. A 1301 earthquake loosened many casing stones, and in 1356 they were carted away to build mosques and fortresses in Cairo; these survivors were excavated by Howard Vyse in 1837. Best preserved on the north face. Exact extent is schematic.`;
}
// RUIN: the full casing faces and the pyramidion are gone, so they have no parts and no explanations.
explanations['entrance portal, north face'] =
  'The original entrance on the north face of the pyramid, above which the chevron gable blocks sit. Entrance height above the base is schematic.';
explanations['chevron gable blocks'] =
  'Massive limestone beams set as an inverted V above the entrance, spreading the load of the masonry above it. Exact block sizes are schematic.';
explanations['north-face corridor (2023)'] =
  'A 9 m long, 2 by 2 m corridor behind the chevron blocks above the entrance, confirmed by endoscopy in 2023. Exact interior geometry is schematic.';
explanations['descending passage, upper section'] =
  'The upper section of the descending corridor, running down at about 26.5 degrees from the north-face entrance to the junction. Exact routing is schematic.';
explanations['descending passage, lower section'] =
  'The lower section of the descending corridor, continuing down past the junction to the subterranean chamber cut in the bedrock. Exact routing is schematic.';
explanations['ascending passage'] =
  'The ascending passage rises at 26 degrees for 39 m from the junction to the Grand Gallery. About 1.05 m wide and 1.2 m high, it is sealed at its lower end by granite plugs. Exact routing is schematic.';
explanations["queen's chamber passage"] =
  "The low horizontal passage leading from the Grand Gallery to the Queen's Chamber. Exact routing is schematic.";
explanations['well shaft'] =
  'The narrow, near-vertical shaft connecting the lower descending passage with the bottom of the Grand Gallery, likely an escape route for the workers who sealed the tomb. Exact routing is schematic.';
explanations["king's chamber passage"] =
  "The horizontal passage from the top of the Grand Gallery toward the King's Chamber. Exact length is schematic.";
explanations["king's antechamber"] =
  "The small antechamber before the King's Chamber, with slots for the granite portcullis slabs. Exact layout is schematic.";
for (let i = 1; i <= 3; i++) {
  explanations[`portcullis slab ${i} of 3`] =
    `One of three granite slabs that slid down to seal the King's Chamber after the burial. Exact positions are schematic.`;
}
explanations['grand gallery'] =
  'The Grand Gallery: a corbelled passage 47 m long and 8.5 m high, rising at 26 degrees. Its centreline lies about 7.22 m east of the pyramid centre axis.';
for (let i = 1; i <= 7; i++) {
  explanations[`gallery corbel tier ${i} of 7`] =
    `One of the seven stepped tiers of the Grand Gallery's corbelled walls, each projecting inward to narrow the ceiling to about 1.04 m. Exact tier widths are schematic.`;
}
explanations['gallery west ramp'] =
  'The west ramp of the Grand Gallery, with notches that may have held the ropes or timbers used to lower the granite sealing plugs. Exact notch geometry is schematic.';
explanations['gallery east ramp'] =
  'The east ramp of the Grand Gallery, with notches that may have held the ropes or timbers used to lower the granite sealing plugs. Exact notch geometry is schematic.';
explanations['gallery bench sockets'] =
  'Cut sockets spaced along the gallery benches, of unknown purpose; the Red Pyramid at Dahshur has galleries of similar design. Exact socket spacing is schematic.';
explanations['great step'] =
  "The Great Step at the top of the Grand Gallery, the landing before the passage to the King's Chamber. Exact height is schematic.";
for (const [id, place] of [['north', 'north'], ['south', 'south'], ['east', 'east'], ['west', 'west']]) {
  explanations[`king's chamber ${id} wall`] =
    `The ${place} wall of the King's Chamber, built entirely of red granite brought by barge from Aswan, some 900 km south. The walls carry work-gang graffiti naming Khufu. Exact block joints are schematic.`;
}
explanations["king's chamber floor"] =
  "The floor of the King's Chamber, about 42.99 m above the base of the pyramid.";
for (let i = 1; i <= 9; i++) {
  explanations[`king's chamber roof slab ${i} of 9`] =
    `One of nine flat granite slabs forming the ceiling of the King's Chamber, each weighing 25 to 40 tonnes. Exact slab divisions are schematic.`;
}
explanations["khufu's sarcophagus"] =
  'The sarcophagus of Khufu, hollowed from a single piece of red Aswan granite. Too large to fit through the passage, it was placed during construction; it was found lidless and empty, and no lid was ever found.';
explanations["king's chamber north air shaft"] =
  "The northern air shaft of the King's Chamber, about 20 cm square and about 59.5 m long, reaching the north face of the pyramid. Scientists debate whether the shafts ventilated the chamber or served as pathways for the king's soul to the stars. Exact routing is schematic.";
explanations["king's chamber south air shaft"] =
  "The southern air shaft of the King's Chamber, about 20 cm square and about 53.5 m long, reaching the south face of the pyramid. Scientists debate whether the shafts ventilated the chamber or served as pathways for the king's soul to the stars. Exact routing is schematic.";
const RELIEVING = [
  ["davison's", 'the lowest of the five'],
  ["wellington's", 'the second of the five'],
  ["nelson's", "the middle of the five; a 2024 survey found new graffiti on its west wall dated to the year of the 6th census of Khufu's reign"],
  ["lady arbuthnot's", "the fourth of the five, its north wall inscribed with cartouches of Khufu and masons' leveling lines"],
  ["campbell's", 'the topmost of the five, with a pointed gabled roof'],
];
for (const [name, note] of RELIEVING) {
  explanations[`${name} relieving chamber`] =
    `${name[0].toUpperCase() + name.slice(1)} relieving chamber, ${note} rough chambers stacked above the King's Chamber that spread the weight of the masonry above. The chambers are shown as solid schematic masses.`;
}
explanations["queen's chamber walls"] =
  "The walls of the Queen's Chamber, about 5.74 by 5.23 m. Despite its name, archaeologists believe it was not meant for a queen; Mark Lehner suggests it was a serdab for the pharaoh's Ka statue. Exact block joints are schematic.";
explanations["queen's chamber floor"] =
  "The floor of the Queen's Chamber. Exact level is schematic.";
explanations["queen's chamber gabled roof"] =
  "The gabled roof of the Queen's Chamber. Exact geometry is schematic.";
explanations["queen's chamber east niche"] =
  "The large angular niche in the east wall of the Queen's Chamber, which may have held a statue of the pharaoh's Ka. Exact niche profile is schematic.";
explanations["queen's chamber north shaft"] =
  "The northern shaft of the Queen's Chamber, about 20 cm wide, which does not reach the surface. Exact routing is schematic.";
explanations["queen's chamber south shaft"] =
  "The southern shaft of the Queen's Chamber, about 20 cm wide, which does not reach the surface. Exact routing is schematic.";
explanations["queen's shaft north blocking stone"] =
  "One of the limestone blocking stones, fitted with copper handles, that seal the Queen's Chamber shafts; explored by small robots. Exact position is schematic.";
explanations["queen's shaft south blocking stone"] =
  "One of the limestone blocking stones, fitted with copper handles, that seal the Queen's Chamber shafts; explored by small robots. Exact position is schematic.";
explanations['subterranean chamber'] =
  'The subterranean chamber, the largest of the three chambers but totally unfinished, rough-cut in the bedrock about 27 m below the plateau surface. Some see it as the original planned burial chamber, others as the symbolic underworld. Shown as a solid schematic mass.';
explanations['big void (scanpyramids, 2017)'] =
  'The Big Void found by the ScanPyramids muon tomography survey in 2017: a cavity about 30 m long above the Grand Gallery, its cross-section mirroring the gallery. Its purpose is unknown; it has never been entered. Rendered as a schematic mass.';
explanations['mortuary temple basalt pavement'] =
  'The black basalt paving of the mortuary temple at the east foot of the pyramid, almost all that remains of a temple that measured 52.2 m north to south and 40 m east to west. Exact paving extent is schematic.';
explanations['mortuary temple foundation walls'] =
  'Low foundation walls of the mortuary temple, where rituals for the dead king were performed; the standing building has almost entirely disappeared. Exact plan is schematic.';
explanations['causeway (outline, partial)'] =
  'The causeway that linked the mortuary temple with the valley temple near the Nile. Only a few remnants survive, so it is shown in outline at a partial, schematic length.';
explanations['valley temple (unexcavated, outline)'] =
  'The Valley Temple, buried beneath the village of Nazlet el-Samman; basalt paving and limestone walls have been found, but the site has not been excavated. Rendered in outline at a schematic position.';
explanations['leveled bedrock platform'] =
  'The leveled bedrock of the Giza plateau on which the pyramid stands. Exact extent is schematic.';

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
const binName = 'great-pyramid-of-giza-ruin-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the great-pyramid-of-giza directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Great Pyramid of Giza (today)',
  title: 'Great Pyramid of Giza',
  location: 'Giza, Egypt',
  blurb: `The Great Pyramid of Khufu as it stands today: the smooth white Tura casing was stripped away over centuries and the pyramidion is lost, leaving about 138.5 m of stepped core masonry from the original 146.6 m. Explore ${records.length} components across ${systems.length} systems: the exposed core courses, the surviving in-situ casing stones, the 47 m Grand Gallery and the granite King's Chamber, and the ruined funerary complex in outline. The Sphinx belongs to Khafre's complex and is not modeled.`,
  sourceUrls: [
    { label: 'Wikipedia: Great Pyramid of Giza', url: 'https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza' },
    { label: 'Wikipedia: The Great Pyramid', url: 'https://en.wikipedia.org/wiki/The_Great_Pyramid' },
    { label: 'Wikipedia: Giza pyramid complex', url: 'https://en.wikipedia.org/wiki/Giza_pyramid_complex' },
    { label: 'Smarthistory: Pyramid of Khufu', url: 'https://smarthistory.org/pyramid-of-khufu/' },
    { label: 'Madain Project: Great Pyramid of Giza Complex', url: 'https://madainproject.com/great_pyramid_of_giza_complex' },
    { label: 'Egypt for Travel: What Is Inside the Pyramids', url: 'https://www.egyptfortravel.com/egypt-travel-blog/what-is-inside-the-pyramids' },
    { label: 'Egypt for Travel: How Were the Pyramids Built', url: 'https://www.egyptfortravel.com/egypt-travel-blog/how-were-the-pyramids-built' },
    { label: 'Vectree: Great Pyramid of Giza (PDF)', url: 'https://vectree.io/pdf/c/great-pyramid-of-giza' },
    { label: 'Scribd: Measurements of the Great Pyramid', url: 'https://www.scribd.com/document/349546111/Measurements-of-the-Great-Pyramid' },
    { label: 'The Daily Galaxy: the Big Void and the north-face corridor', url: 'https://dailygalaxy.com/2026/04/scientists-discover-great-pyramid-giza-hidden-void/' },
    { label: 'thediplomariot.com: Great Pyramid specs', url: 'https://thediplomariot.com/blog/great-pyramid-of-giza-unveiling-the-specs-of-an-ancient-wonder-1764799082' },
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
  chunks: [{ url: '/models/great-pyramid-of-giza-ruin/great-pyramid-of-giza-ruin-0.bin', bytes: offset }],
  triangles,
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
