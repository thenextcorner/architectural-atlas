// Procedural Brandenburg Gate for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Brandenburg Gate in code and
// writes it in the atlas binary format:
//   public/models/brandenburg-gate/atlas.json
//   public/models/brandenburg-gate/brandenburg-gate-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/brandenburg-gate-attribution.md,
// opened 2026-09-30):
//   built 1788 to 1791 by order of King Frederick William II of Prussia to
//   the design of royal architect Carl Gotthard Langhans (his first major
//   Greek-style work, a "new Athens on the river Spree"); originally called
//   "Friedenstor" (Peace Gate), opened to traffic August 1791; replaced a
//   Baroque gate on the Berlin Customs Wall, one of eighteen city gates;
//   inspired by the Propylaea of the Acropolis in Athens, central portion
//   in the Roman triumphal arch tradition, one of the first Greek Revival
//   buildings in Germany; 26 m high, 65.5 m wide, 11 m deep (visitBerlin;
//   Wikipedia lists 62.5 m wide from a 1990s monument survey, noted as an
//   alternate); sandstone (Labski sandstone from near Lwowek Slaski);
//   twelve fluted Doric columns, six per side in a front and a rear row,
//   forming five passageways; citizens used only the outermost two on each
//   side; the central archway was reserved for the royal family (and the
//   Pfuel family 1814 to 1919); columns 15 m tall, 1.75 m in diameter at
//   the base; walls between the front and rear column pairs carry
//   classicizing reliefs of the Labors of Hercules; Greek Doric order: no
//   column bases, fluting in the Greek Ionic/Corinthian manner with flat
//   fillets and rounded flute ends, entablature with triglyphs, guttae,
//   metopes and mutules, half-metopes at the corners; 16 metopes along
//   each long face with Greek myth scenes, many echoing the Parthenon
//   centaurs; plain attic storey with wide steps at the sides receding in
//   both directions, a large allegorical Triumph of Peace relief on the
//   east side only, and a second cornice with a projecting central section
//   above; Quadriga by Johann Gottfried Schadow placed 1793, about 5 m
//   high, copper sheets hammered in moulds, chariot drawn by four horses
//   driven by a goddess figure facing east into the city; first intended
//   as Eirene (peace), rebranded after the Napoleonic Wars as Victoria
//   with an Iron Cross standard, a crowned Imperial eagle on top and an
//   oak-leaf wreath (1814 redesign by Karl Friedrich Schinkel); first
//   quadriga made since antiquity, moulds kept for renewal; taken to
//   Paris by Napoleon after Jena-Auerstedt 1806, returned 1814 after the
//   Prussian occupation of Paris under General Ernst von Pfuel; L-shaped
//   flanking wings at lower height in the same Doric order, open "stoas"
//   next to and parallel with the gate, longer sides stretching beyond the
//   east side with buildings set back from the columns, called "custom
//   houses" (Berlin Customs Wall in force until 1860) or "gatehouses";
//   plain metopes, simple angled roofs ending in gable pediments with a
//   small circular relief in the tympanum; statues of Minerva and Mars in
//   niches at the furthest side walls, added in the 19th century;
//   Minerva originally by Johann Daniel Meltzer, destroyed in WWII,
//   replaced 1951 to 1952 by a copy from the Kranold sculptor collective;
//   Mars by Carl Friedrich Wichmann; both after Schadow designs of 1792;
//   gate badly damaged in WWII (bullet holes in the columns), one horse's
//   head of the original Quadriga surviving in the Markisches Museum;
//   restored 1956 to 1958 by East and West Berlin together, and again
//   2000 to 2002; symbol of reunified Berlin since 1990, on Pariser Platz
//   to the east with the Platz des 18. Marz and the Strasse des 17. Juni
//   to the west.
// Schematic (not sourced, never stated as fact in the UI): exact column
// spacing and bay widths (central bay modeled wider, per the royal
// archway arrangement); capital, architrave, frieze, cornice and attic
// heights and profiles; metope and triglyph sizes and positions (beyond
// the count of sixteen per face and the centaur theme); which Hercules
// labor stands on which wall; passageway floor buildup; step and platform
// dimensions; attic side-step arrangement; the exact form of the second
// cornice's projecting central section; Quadriga proportions and the
// positions of Victoria, the horses, the chariot, the Iron Cross
// standard, the eagle and the oak-leaf wreath; side-wing column counts
// and positions, roof profiles, custom-house footprints, pediment and
// tympanum-roundel shapes, niche placement, and which wing holds Minerva
// and which holds Mars (assigned schematically: Minerva north, Mars
// south).
//
// Coordinate frame: x = lateral (north is -x), z = depth (east/Pariser
// Platz is +z, the direction the Quadriga faces), y = up. All dimensions
// in meters.
//
// Granularity: 129 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-brandenburg-gate.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'brandenburg-gate');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~33 m with Quadriga) maps to 2.4 units.
const S = 2.4 / 33;

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
// Triangular prism: triangle in XY (base x0..x1 at y0, apex at mid x, yApex),
// extruded from z0 to z1. Indexed, normals computed.
function prism(x0, x1, y0, yApex, z0, z1) {
  const xm = (x0 + x1) / 2;
  const v = new Float32Array([
    x0, y0, z0, x1, y0, z0, xm, yApex, z0,
    x0, y0, z1, x1, y0, z1, xm, yApex, z1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  return g;
}
// Slanted box: rotate about Z first, then translate (modeling hygiene).
function slab(w, t, l, ang, x, y, z) {
  const g = new THREE.BoxGeometry(w, t, l);
  g.rotateZ(ang);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Vertical datum (meters): platform top at y = 1.5; columns 15 m to 16.5;
// capital 16.5 to 17.5; architrave 17.5 to 18.4; frieze 18.4 to 19.4;
// cornice 19.4 to 20.0; attic 20.0 to 25.0; second cornice 25.0 to 25.6;
// projecting central section 25.0 to 26.4; Quadriga plinth to 27.2;
// sculpture to about 32.4 (the Quadriga's ~5 m on top of the 26 m gate).
const COLX = [-24.25, -15.5, -6.75, 6.75, 15.5, 24.25]; // six column lines
const ROWZ = 4.5; // front and rear rows at z = +/-4.5
const BASE = 1.5;

// --- Colonnade: twelve 15 m fluted Doric shafts (no bases, Greek manner)
// with schematic taper, plus echinus-and-abacus capitals: 24 parts.
for (const [ri, rowName] of [['front', 'Front'], ['rear', 'Rear']]) {
  const z = ri === 'front' ? ROWZ : -ROWZ;
  COLX.forEach((x, i) => {
    const n = i + 1;
    addPart(`${ri}-column-${n}-shaft`, `${rowName} row column ${n} shaft`, 'colonnade', [
      cyl(0.7, 0.875, 15, x, BASE + 7.5, z, 24),
    ]);
    const echinus = cyl(1.02, 0.7, 0.55, x, 16.5 + 0.275, z, 16);
    const abacus = box(x - 1.1, x + 1.1, 17.05, 17.5, z - 1.1, z + 1.1);
    addPart(`${ri}-column-${n}-capital`, `${rowName} row column ${n} capital`, 'colonnade', [echinus, abacus]);
  });
}

// --- Passageway walls: six walls between the front and rear column pairs,
// dividing the five passageways, with the twelve Labors of Hercules relief
// panels (two per wall face arrangement gives twelve faces): 18 parts.
const LABORS = [
  'Nemean Lion', 'Lernaean Hydra', 'Ceryneian Hind', 'Erymanthian Boar',
  'Augean Stables', 'Stymphalian Birds', 'Cretan Bull', 'Mares of Diomedes',
  'Belt of Hippolyta', 'Cattle of Geryon', 'Apples of the Hesperides', 'Capture of Cerberus',
];
COLX.forEach((x, i) => {
  addPart(`transverse-wall-${i + 1}`, `Transverse wall ${i + 1}`, 'passageway-walls', [
    box(x - 1.25, x + 1.25, BASE, 16.5, -5.5, 5.5),
  ]);
});
// Wall faces carrying the twelve labor panels: walls 2-5 show two faces
// each, the outer walls show their inner face plus their outer face.
const FACES = [
  { wall: 0, dir: 1 }, { wall: 0, dir: -1 },
  { wall: 1, dir: 1 }, { wall: 1, dir: -1 },
  { wall: 2, dir: 1 }, { wall: 2, dir: -1 },
  { wall: 3, dir: 1 }, { wall: 3, dir: -1 },
  { wall: 4, dir: 1 }, { wall: 4, dir: -1 },
  { wall: 5, dir: 1 }, { wall: 5, dir: -1 },
];
FACES.forEach((f, k) => {
  const x = COLX[f.wall] + f.dir * 1.25;
  const px0 = f.dir > 0 ? x : x - 0.12;
  const px1 = f.dir > 0 ? x + 0.12 : x;
  const panel = box(px0, px1, 6.2, 9.8, -1.1, 1.1);
  const frameT = box(px0 - 0.06, px1 + 0.06, 9.8, 10.05, -1.35, 1.35);
  const frameB = box(px0 - 0.06, px1 + 0.06, 5.95, 6.2, -1.35, 1.35);
  const labor = LABORS[k];
  const id = `hercules-labor-${k + 1}`;
  addPart(id, `Hercules labor ${k + 1}: ${labor}`, 'passageway-walls', [panel, frameT, frameB]);
});

// --- Entablature: architrave, triglyph frieze, sixteen metopes per long
// face, cornice: 38 parts.
for (const [fi, fName] of [['front', 'Front'], ['rear', 'Rear']]) {
  const zc = fi === 'front' ? ROWZ : -ROWZ;
  const zo = fi === 'front' ? 1 : -1;
  addPart(`${fi}-architrave`, `${fName} architrave`, 'entablature', [
    box(-26.25, 26.25, 17.5, 18.4, zc - 0.65, zc + 0.65),
  ]);
  const trigGeoms = [box(-26.25, 26.25, 18.4, 19.4, zc - 0.6, zc + 0.6)];
  for (let k = 0; k <= 16; k++) {
    const tx = -26.25 + (k * 52.5) / 16;
    trigGeoms.push(box(tx - 0.28, tx + 0.28, 18.4, 19.4, zc + zo * 0.6, zc + zo * 0.74));
  }
  addPart(`${fi}-triglyph-frieze`, `${fName} triglyph frieze`, 'entablature', trigGeoms);
  for (let k = 0; k < 16; k++) {
    const mx = -26.25 + ((k + 0.5) * 52.5) / 16;
    const g = box(mx - 0.9, mx + 0.9, 18.45, 19.35, zc + (zo > 0 ? 0.6 : -0.74), zc + (zo > 0 ? 0.74 : -0.6));
    addPart(`${fi}-metope-${k + 1}`, `${fName} metope ${k + 1}`, 'entablature', [g]);
  }
  addPart(`${fi}-cornice`, `${fName} cornice`, 'entablature', [
    box(-27, 27, 19.4, 20.0, zc - 1.1, zc + 1.1),
  ]);
}

// --- Attic storey: plain attic, east-side Triumph of Peace relief, wide
// side steps, second cornice with projecting central section: 6 parts.
addPart('attic-core', 'Attic storey', 'attic', [
  box(-26.25, 26.25, 20.0, 25.0, -5.5, 5.5),
]);
addPart('triumph-of-peace-relief', 'Triumph of Peace relief', 'attic', [
  box(-6, 6, 21.2, 24.2, 5.5, 5.75),
]);
for (const [si, sName] of [['north', 'North'], ['south', 'South']]) {
  const sx = si === 'north' ? -1 : 1;
  const steps = [];
  for (let s = 0; s < 3; s++) {
    steps.push(box(
      sx > 0 ? 26.25 + s * 1.1 : -26.25 - (s + 1) * 1.1,
      sx > 0 ? 26.25 + (s + 1) * 1.1 : -26.25 - s * 1.1,
      20.0 + s * 1.4, 21.4 + s * 1.4, -5.5, 5.5,
    ));
  }
  addPart(`${si}-attic-side-steps`, `${sName} attic side steps`, 'attic', steps);
}
addPart('second-cornice', 'Second cornice', 'attic', [
  box(-27, 27, 25.0, 25.6, -6, 6),
]);
addPart('projecting-central-section', 'Projecting central section', 'attic', [
  box(-7, 7, 25.0, 26.4, 5.5, 7.2),
  box(-3.5, 3.5, 26.4, 27.2, 3.5, 6.8),
]);

// --- Quadriga: Victoria with her four-horse chariot, facing east (+z):
// 13 parts. About 5 m of copper sculpture on top of the 26 m gate.
function horseGeoms(x, z) {
  const g = [];
  g.push(box(x - 0.55, x + 0.55, 28.4, 29.7, z - 1.5, z + 1.5));
  for (const dx of [-0.35, 0.35]) {
    for (const dz of [-1.0, 1.0]) {
      g.push(box(x + dx - 0.13, x + dx + 0.13, 27.2, 28.5, z + dz - 0.13, z + dz + 0.13));
    }
  }
  g.push(strut([x, 29.5, z + 1.2], [x, 30.5, z + 2.1], 0.5));
  g.push(box(x - 0.25, x + 0.25, 30.3, 30.9, z + 1.9, z + 2.9));
  g.push(box(x - 0.08, x + 0.08, 28.6, 30.1, z - 1.75, z - 1.55));
  return g;
}
{
  const robe = cyl(0.55, 0.95, 2.6, 0, 28.5, 5.0, 12);
  addPart('victoria-body', 'Victoria body', 'quadriga', [robe]);
  const head = new THREE.SphereGeometry(0.32, 10, 8);
  head.translate(0, 30.15, 5.0);
  addPart('victoria-head', 'Victoria head', 'quadriga', [head]);
  const wingL = box(-0.08, 0.08, 0, 1.9, -0.45, 0.45);
  wingL.rotateZ(0.55);
  wingL.translate(-0.8, 29.5, 4.7);
  const wingR = box(-0.08, 0.08, 0, 1.9, -0.45, 0.45);
  wingR.rotateZ(-0.55);
  wingR.translate(0.8, 29.5, 4.7);
  const armL = strut([-0.4, 29.6, 5.0], [-0.55, 29.9, 6.9], 0.16);
  const armR = strut([0.4, 29.6, 5.0], [1.1, 30.1, 5.6], 0.16);
  addPart('victoria-wings', 'Victoria wings', 'quadriga', [wingL, wingR, armL, armR]);
  const reinL = strut([-0.55, 29.9, 6.9], [-0.9, 29.4, 7.6], 0.05);
  const reinR = strut([-0.55, 29.9, 6.9], [0.9, 29.4, 7.6], 0.05);
  addPart('chariot-body', 'Chariot body', 'quadriga', [
    box(-1.2, 1.2, 27.4, 29.0, 4.2, 5.8),
    box(-0.1, 0.1, 27.2, 27.4, 4.9, 6.6),
    reinL, reinR,
  ]);
  const wheelL = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 14);
  wheelL.rotateZ(Math.PI / 2);
  wheelL.translate(-1.32, 28.3, 5.0);
  addPart('chariot-left-wheel', 'Chariot left wheel', 'quadriga', [wheelL]);
  const wheelR = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 14);
  wheelR.rotateZ(Math.PI / 2);
  wheelR.translate(1.32, 28.3, 5.0);
  addPart('chariot-right-wheel', 'Chariot right wheel', 'quadriga', [wheelR]);
  const horseNames = ['outer left', 'inner left', 'inner right', 'outer right'];
  [-2.7, -0.9, 0.9, 2.7].forEach((x, i) => {
    addPart(`quadriga-horse-${i + 1}`, `Quadriga horse ${i + 1} (${horseNames[i]})`, 'quadriga', horseGeoms(x, 8.2));
  });
  const pole = cyl(0.06, 0.06, 3.4, 1.1, 30.3, 5.0, 8);
  const crossV = box(1.1 - 0.13, 1.1 + 0.13, 31.05, 31.9, 4.94, 5.06);
  const crossH = box(1.1 - 0.36, 1.1 + 0.36, 31.42, 31.68, 4.94, 5.06);
  addPart('iron-cross-standard', 'Iron Cross standard', 'quadriga', [pole, crossV, crossH]);
  const eagleBody = box(1.1 - 0.16, 1.1 + 0.16, 32.0, 32.45, 4.92, 5.08);
  const eagleW1 = box(1.1 - 0.55, 1.1 - 0.1, 32.1, 32.25, 4.94, 5.06);
  const eagleW2 = box(1.1 + 0.1, 1.1 + 0.55, 32.1, 32.25, 4.94, 5.06);
  addPart('prussian-eagle', 'Prussian eagle', 'quadriga', [eagleBody, eagleW1, eagleW2]);
  const wreath = new THREE.TorusGeometry(0.45, 0.1, 8, 20);
  wreath.translate(-0.9, 30.6, 5.0);
  addPart('oak-leaf-wreath', 'Oak-leaf wreath', 'quadriga', [wreath]);
}

// --- Side wings: L-shaped flanking wings at lower height, same Doric
// order; open stoas beside the gate, custom houses set back on the longer
// east-stretching sides, angled roofs, gable pediments with tympanum
// roundels, statue niches with Minerva (north) and Mars (south): 22 parts.
function buildWing(side, name, statueName, statueKind) {
  const mx = (a, b) => (side < 0 ? [a, b] : [-b, -a]);
  const colPos = [
    [-31.0, -4], [-31.0, 2], [-28.0, 8], [-24.75, 8],
  ];
  colPos.forEach(([cx0, cz], i) => {
    const cx = -cx0 * side;
    const shaft = cyl(0.38, 0.45, 6, cx, 3, cz, 10);
    const ech = cyl(0.38, 0.55, 0.25, cx, 6.12, cz, 10);
    const ab = box(cx - 0.55, cx + 0.55, 6.25, 6.45, cz - 0.55, cz + 0.55);
    addPart(`${name}-stoa-column-${i + 1}`, `${name === 'north-wing' ? 'North' : 'South'} wing stoa column ${i + 1}`, 'side-wings', [shaft, ech, ab]);
  });
  {
    const [ax0, ax1] = mx(-31.6, -30.4);
    const [bx0, bx1] = mx(-30.6, -24.0);
    addPart(`${name}-entablature`, `${name === 'north-wing' ? 'North' : 'South'} wing entablature`, 'side-wings', [
      box(ax0, ax1, 6.45, 7.15, -5, 9),
      box(bx0, bx1, 6.45, 7.15, 7.4, 8.6),
    ]);
  }
  {
    const [hx0, hx1] = mx(-29.5, -24.5);
    addPart(`${name}-custom-house`, `${name === 'north-wing' ? 'North' : 'South'} wing custom house`, 'side-wings', [
      box(hx0, hx1, 0, 6, 9.2, 12.8),
    ]);
  }
  {
    const r1 = slab(4.6, 0.18, 15, -0.42 * side, 31.95 * side, 7.9, 2);
    const r2 = slab(4.6, 0.18, 15, 0.42 * side, 30.05 * side, 7.9, 2);
    addPart(`${name}-angled-roof`, `${name === 'north-wing' ? 'North' : 'South'} wing angled roof`, 'side-wings', [r1, r2]);
  }
  {
    const [px0, px1] = mx(-32.5, -29.5);
    addPart(`${name}-gable-pediment`, `${name === 'north-wing' ? 'North' : 'South'} wing gable pediment`, 'side-wings', [
      prism(px0, px1, 7.15, 8.7, 8.6, 9.5),
    ]);
    const roundel = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16);
    roundel.rotateX(Math.PI / 2);
    roundel.translate(31 * side, 7.75, 9.55);
    addPart(`${name}-tympanum-roundel`, `${name === 'north-wing' ? 'North' : 'South'} wing tympanum roundel`, 'side-wings', [roundel]);
  }
  {
    const [nx0, nx1] = mx(-32.4, -31.4);
    const [jx0, jx1] = mx(-32.4, -32.15);
    const [kx0, kx1] = mx(-31.85, -31.6);
    const [capx0, capx1] = mx(-32.65, -31.15);
    const niche = [
      box(nx0, nx1, 0, 3.6, -6.4, -6.15),
      box(jx0, jx1, 0, 3.6, -6.15, -4.6),
      box(kx0, kx1, 0, 3.6, -6.15, -4.6),
      box(capx0, capx1, 3.6, 3.9, -6.6, -4.4),
    ];
    addPart(`${name}-statue-niche`, `${name === 'north-wing' ? 'North' : 'South'} wing statue niche`, 'side-wings', niche);
    const sx = 31.9 * side;
    const sBody = cyl(0.3, 0.44, 2.2, sx, 1.1, -5.5, 10);
    const sHead = new THREE.SphereGeometry(0.22, 10, 8);
    sHead.translate(sx, 2.42, -5.5);
    const sGeoms = [sBody, sHead];
    if (statueKind === 'minerva') {
      sGeoms.push(cyl(0.05, 0.05, 3.0, sx + 0.5, 1.5, -5.5, 8));
    } else {
      sGeoms.push(strut([sx + 0.45, 1.6, -5.5], [sx + 0.45, 0.2, -5.1], 0.09));
    }
    addPart(`${statueName.toLowerCase().replace(/ /g, '-')}-statue`, `${statueName} statue`, 'side-wings', sGeoms);
  }
}
buildWing(-1, 'north-wing', 'Minerva', 'minerva');
buildWing(1, 'south-wing', 'Mars', 'mars');

// --- Passageway floors: five slots between the six transverse walls: 5.
{
  const slots = [
    ['central', -5.5, 5.5],
    ['north-inner', 8.0, 14.25],
    ['north-outer', 16.75, 23.0],
    ['south-inner', -14.25, -8.0],
    ['south-outer', -23.0, -16.75],
  ];
  for (const [sn, x0, x1] of slots) {
    addPart(`${sn}-passageway-floor`, `${sn[0].toUpperCase()}${sn.slice(1)} passageway floor`, 'passageways', [
      box(x0, x1, 0, 1.35, -5.5, 5.5),
    ]);
  }
}

// --- Base: front and rear steps plus the column platform: 3 parts.
{
  const frontSteps = [];
  for (let s = 0; s < 3; s++) {
    frontSteps.push(box(-26.25, 26.25, s * 0.45, (s + 1) * 0.45, 5.5, 8.5 - s * 0.8));
  }
  addPart('front-steps', 'Front steps', 'base', frontSteps);
  const rearSteps = [];
  for (let s = 0; s < 3; s++) {
    rearSteps.push(box(-26.25, 26.25, s * 0.45, (s + 1) * 0.45, -8.5 + s * 0.8, -5.5));
  }
  addPart('rear-steps', 'Rear steps', 'base', rearSteps);
  addPart('column-platform', 'Column platform', 'base', [
    box(-26.25, 26.25, 1.35, BASE, -5.5, 5.5),
  ]);
}

// ---------------------------------------------------------------- colors
// Schematic light sandstone palette; the Eiffel Tower is the only dark
// realistic model in the atlas. The Quadriga keeps its copper tone.
function colorFor(id) {
  if (id === 'victoria-body' || id === 'victoria-head' || id === 'victoria-wings') return '#b87333';
  if (id.startsWith('quadriga-horse-')) return '#a86a30';
  if (id === 'chariot-body' || id === 'chariot-left-wheel' || id === 'chariot-right-wheel') return '#96602c';
  if (id === 'iron-cross-standard') return '#3a3a3a';
  if (id === 'prussian-eagle') return '#8a5a2a';
  if (id === 'oak-leaf-wreath') return '#6b7a3a';
  if (id.startsWith('hercules-labor-')) return '#a89a76';
  if (id.startsWith('transverse-wall-')) return '#d3c8ae';
  if (id.includes('-metope-')) return '#c9bfa5';
  if (id.includes('-triglyph-frieze')) return '#b8ad92';
  if (id.includes('-architrave') || id.includes('-cornice')) return '#d9cfbb';
  if (id.includes('-column-') && id.includes('stoa')) return '#cfc4a4';
  if (id.includes('-column-')) return '#ded3ba';
  if (id === 'triumph-of-peace-relief') return '#b39b62';
  if (id === 'attic-core' || id === 'second-cornice' || id === 'projecting-central-section') return '#d3c8ae';
  if (id.includes('attic-side-steps')) return '#c4b898';
  if (id.includes('-wing-entablature') || id.includes('-wing-angled-roof') || id.includes('-wing-gable-pediment')) return '#c9bfa5';
  if (id.includes('-wing-custom-house')) return '#d0c5a8';
  if (id.includes('-tympanum-roundel')) return '#b39b62';
  if (id.includes('-statue-niche')) return '#c4b898';
  if (id === 'minerva-statue' || id === 'mars-statue') return '#8f8578';
  if (id.includes('-passageway-floor')) return '#8a8478';
  if (id === 'front-steps' || id === 'rear-steps') return '#b5aa92';
  if (id === 'column-platform') return '#c4b898';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'colonnade', name: 'Doric colonnades', color: '#ded3ba', description: 'Twelve 15 m fluted Doric columns in a front and a rear row, with echinus-and-abacus capitals and no bases, in the Greek manner.' },
  { id: 'passageway-walls', name: 'Passageway walls and Hercules reliefs', color: '#d3c8ae', description: 'The six walls between the front and rear column pairs, dividing the five passageways, with classicizing reliefs of the Labors of Hercules.' },
  { id: 'entablature', name: 'Entablature', color: '#c9bfa5', description: 'Architrave, triglyph frieze with sixteen metopes on each long face, and cornice.' },
  { id: 'attic', name: 'Attic storey', color: '#d3c8ae', description: 'The plain attic with the Triumph of Peace relief, side steps, and the second cornice carrying the Quadriga.' },
  { id: 'quadriga', name: 'Quadriga', color: '#b87333', description: 'Schadow\u2019s copper four-horse chariot, about 5 m high, driven by Victoria and facing east into the city.' },
  { id: 'side-wings', name: 'Side wings', color: '#cfc4a4', description: 'L-shaped flanking wings at lower height in the same Doric order, with open stoas, custom houses, angled roofs, pediments and statues.' },
  { id: 'passageways', name: 'Passageway floors', color: '#8a8478', description: 'The floors of the five passageways between the transverse walls.' },
  { id: 'base', name: 'Steps and platform', color: '#b5aa92', description: 'Front and rear steps and the column platform the gate stands on.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (const row of ['front', 'rear']) {
  const Row = row[0].toUpperCase() + row.slice(1);
  for (let i = 1; i <= 6; i++) {
    explanations[`${row} row column ${i} shaft`] =
      `One of twelve fluted Doric columns, 15 m tall and 1.75 m in diameter at the base, in the ${row} row of six. The columns carry no bases, in the Greek manner. Exact taper and fluting are schematic.`;
    explanations[`${row} row column ${i} capital`] =
      `Echinus-and-abacus capital of ${Row} row column ${i}, carrying the architrave. Exact profile is schematic.`;
  }
}
for (let i = 1; i <= 6; i++) {
  explanations[`transverse wall ${i}`] =
    `One of six walls between the front and rear column pairs, dividing the gate into five passageways. The walls carry classicizing reliefs of the Labors of Hercules. Exact thickness is schematic.`;
}
const LABOR_NOTES = {
  'Nemean Lion': 'Hercules strangles the invulnerable lion of Nemea.',
  'Lernaean Hydra': 'Hercules slays the many-headed water serpent.',
  'Ceryneian Hind': 'Hercules captures the golden-horned hind of Artemis.',
  'Erymanthian Boar': 'Hercules captures the giant boar alive.',
  'Augean Stables': 'Hercules cleans the stables in a single day.',
  'Stymphalian Birds': 'Hercules drives off the man-eating birds.',
  'Cretan Bull': 'Hercules captures the bull of Crete.',
  'Mares of Diomedes': 'Hercules tames the man-eating mares.',
  'Belt of Hippolyta': 'Hercules takes the belt of the Amazon queen.',
  'Cattle of Geryon': 'Hercules drives off the cattle of the giant Geryon.',
  'Apples of the Hesperides': 'Hercules steals the golden apples.',
  'Capture of Cerberus': 'Hercules brings the hound of Hades to the surface.',
};
LABORS.forEach((labor, k) => {
  explanations[`hercules labor ${k + 1}: ${labor.toLowerCase()}`] =
    `Relief panel of the labor of the ${labor}: ${LABOR_NOTES[labor]} Which labor stands on which wall is schematic.`;
});
for (const face of ['front', 'rear']) {
  const Face = face[0].toUpperCase() + face.slice(1);
  explanations[`${face} architrave`] =
    `The ${Face.toLowerCase()} architrave, the lowest band of the entablature, spanning the ${face} colonnade. Exact height is schematic.`;
  explanations[`${face} triglyph frieze`] =
    `The ${Face.toLowerCase()} frieze band with triglyphs, guttae and mutules in the Greek manner, with half-metopes at the corners, the Roman solution to the Doric corner conflict. Exact carving is schematic.`;
  for (let k = 1; k <= 16; k++) {
    explanations[`${face} metope ${k}`] =
      `One of sixteen metopes along the ${face} face, carrying a relief scene from Greek mythology; many echo the Parthenon in showing centaurs fighting men. Exact scenes are schematic.`;
  }
  explanations[`${face} cornice`] =
    `The ${Face.toLowerCase()} cornice crowning the entablature above the metopes. Exact profile is schematic.`;
}
Object.assign(explanations, {
  'attic storey': 'The plain attic storey above the cornice. On the east side only it carries a large allegorical relief of the Triumph of Peace. Exact height is schematic.',
  'triumph of peace relief': 'The large allegorical relief of the Triumph of Peace on the east face of the attic, above Pariser Platz. Exact composition is schematic.',
  'north attic side steps': 'Wide steps at the north side of the attic, receding in both directions. Exact arrangement is schematic.',
  'south attic side steps': 'Wide steps at the south side of the attic, receding in both directions. Exact arrangement is schematic.',
  'second cornice': 'The second cornice above the attic storey. Exact profile is schematic.',
  'projecting central section': 'The projecting central section of the second cornice, carrying the plinth of the Quadriga. Exact projection is schematic.',
  'victoria body': 'The robed body of Victoria, the Roman goddess of victory, standing in the chariot. The Quadriga is made of copper sheets hammered in moulds and stands about 5 m high. Exact figure is schematic.',
  'victoria head': 'The head of Victoria, facing east into the city center. Exact features are schematic.',
  'victoria wings': 'The wings and outstretched arms of Victoria, reaching for the reins of the four horses. Exact pose is schematic.',
  'chariot body': 'The body of the two-wheeled chariot, with the reins running forward to the horses. Exact joinery is schematic.',
  'chariot left wheel': 'One of the two wheels of the Quadriga chariot. Exact wheel design is schematic.',
  'chariot right wheel': 'One of the two wheels of the Quadriga chariot. Exact wheel design is schematic.',
  'iron cross standard': 'The lance with the Iron Cross standard, added when Schinkel redesigned the Quadriga in 1814 as a Prussian triumphal emblem. Exact form is schematic.',
  'prussian eagle': 'The crowned Prussian eagle perched on top of the Iron Cross standard, added in 1814. Exact form is schematic.',
  'oak-leaf wreath': 'The wreath of oak leaves carried with the Iron Cross standard since 1814. Exact form is schematic.',
});
['outer left', 'inner left', 'inner right', 'outer right'].forEach((pos, i) => {
  explanations[`quadriga horse ${i + 1} (${pos})`] =
    `The ${pos} horse of the Quadriga team, drawing Victoria\u2019s chariot eastward into the city. Only one horse\u2019s head from the original 1793 sculpture survives, kept in the M\u00e4rkisches Museum. Exact pose is schematic.`;
});
for (const wing of ['north', 'south']) {
  const Wing = wing[0].toUpperCase() + wing.slice(1);
  for (let i = 1; i <= 4; i++) {
    explanations[`${wing} wing stoa column ${i}`] =
      `A Doric column of the ${wing} wing\u2019s open stoa, at a lower height than the gate\u2019s colonnade. Exact column count and positions are schematic.`;
  }
  explanations[`${wing} wing entablature`] =
    `The entablature over the ${wing} wing\u2019s stoa colonnade. Exact beam layout is schematic.`;
  explanations[`${wing} wing custom house`] =
    `The ${wing} custom house, set back from the columns on the longer east-stretching side of the wing. These housed the guards and tax collectors of the Berlin Customs Wall, in force until 1860. Exact footprint is schematic.`;
  explanations[`${wing} wing angled roof`] =
    `The simple angled roof of the ${wing} wing. Exact roof profile is schematic.`;
  explanations[`${wing} wing gable pediment`] =
    `The gable pediment ending the ${wing} wing\u2019s roof. Exact pediment shape is schematic.`;
  explanations[`${wing} wing tympanum roundel`] =
    `The small circular relief in the tympanum of the ${wing} wing\u2019s gable pediment. Exact relief is schematic.`;
  explanations[`${wing} wing statue niche`] =
    `The statue niche at the furthest side wall of the ${wing} wing. Exact niche placement is schematic.`;
}
explanations['minerva statue'] = 'The statue of Minerva with her lance in the north wing niche, after Schadow\u2019s 1792 design; the original by Johann Daniel Meltzer was destroyed in the Second World War and replaced in 1951 to 1952 by a copy from the Kranold sculptor collective. Exact figure is schematic.';
explanations['mars statue'] = 'The statue of Mars, the Roman god of war, in the south wing niche, after Schadow\u2019s 1792 design and executed by Carl Friedrich Wichmann. Exact figure is schematic.';
for (const [key, name] of [
  ['central', 'Central'], ['north-inner', 'North-inner'], ['north-outer', 'North-outer'],
  ['south-inner', 'South-inner'], ['south-outer', 'South-outer'],
]) {
  const label = `${name} passageway floor`;
  explanations[label.toLowerCase()] = key === 'central'
    ? 'The floor of the central passageway, the widest of the five, historically reserved for the royal family. Exact paving is schematic.'
    : `The floor of the ${name.toLowerCase().replace('-', ' ')} passageway, one of the four outer passages once open to ordinary citizens. Exact paving is schematic.`;
}
explanations['front steps'] = 'The front steps rising from Pariser Platz to the column platform on the east side. Exact step count is schematic.';
explanations['rear steps'] = 'The rear steps on the west side, toward the Platz des 18. M\u00e4rz. Exact step count is schematic.';
explanations['column platform'] = 'The column platform the gate\u2019s colonnades stand on. Exact platform depth is schematic.';

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
const binName = 'brandenburg-gate-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the brandenburg-gate directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Brandenburg Gate, Berlin',
  title: 'Brandenburg Gate',
  location: 'Berlin, Germany',
  blurb: 'Carl Gotthard Langhans\u2019 neoclassical city gate in Berlin, built 1788 to 1791. Twelve 15 m Doric columns in two rows form five passageways, and a copper Quadriga of Victoria driving a four-horse chariot crowns the attic.',
  sourceUrls: [
    { label: 'Wikipedia: Brandenburg Gate', url: 'https://en.wikipedia.org/wiki/Brandenburg_Gate' },
    { label: 'visitBerlin.de: Brandenburg Gate', url: 'https://www.visitberlin.de/en/brandenburg-gate?ref=trip101com' },
    { label: 'thebettervacation.com: Brandenburg Gate visitor guide', url: 'https://thebettervacation.com/berlin/brandenburg-gate/' },
    { label: 'intercityhotelberlin.com: Brandenburg Gate history', url: 'https://intercityhotelberlin.com/brandenburg-gate-berlins-majestic-symbol-of-unity-and-peace/' },
    { label: 'budowle.pl: Brandenburg Gate facts', url: 'https://www.budowle.pl/building/brandenburg-gate' },
    { label: 'tropter.com: Brandenburg Gate', url: 'https://tropter.com/en/germany/berlin/brandenburg-gate' },
    { label: 'ad-hoc-news.de: Brandenburger Tor and the Quadriga', url: 'https://www.ad-hoc-news.de/unterhaltung/reisen/brandenburger-tor-and-the-quadriga-above-berlin/70173237' },
    { label: 'Alamy: Quadriga copper sculpture caption', url: 'https://www.alamy.com/atop-the-brandenburg-gate-is-the-quadriga-a-chariot-drawn-by-four-horses-driven-by-victoria-the-roman-goddess-of-victory-the-brandenburg-gate-is-cr-image679503479.html' },
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
  chunks: [{ url: '/models/brandenburg-gate/brandenburg-gate-0.bin', bytes: offset }],
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
