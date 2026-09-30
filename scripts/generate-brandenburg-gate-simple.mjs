// Simplified schematic Brandenburg Gate for the Architectural Atlas.
//
// The "simple" variant of the Brandenburg Gate: same footprint, massing
// and proportions as the detailed model (see
// scripts/generate-brandenburg-gate.mjs, whose header lists every sourced
// dimension reused here), but coarser: 31 named parts across 7 systems
// instead of 129 across 8. Individual columns, metopes, Hercules labor
// panels and stoa columns are merged into group parts; the Quadriga's
// fine detail is reduced to its four main masses.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-brandenburg-gate.mjs for the full attribution):
//   built 1788 to 1791 to Carl Gotthard Langhans' design, "Friedenstor",
//   inspired by the Propylaea of Athens, one of Germany's first Greek
//   Revival buildings; 26 m high, 65.5 m wide (62.5 m per Wikipedia's
//   survey figure), 11 m deep, sandstone; twelve 15 m fluted Doric
//   columns, six per side in front and rear rows, five passageways, the
//   central archway reserved for the royal family; walls between the front
//   and rear column pairs with Labors of Hercules reliefs; Greek Doric
//   order (no bases, flat-fillet fluting, triglyphs, guttae, metopes,
//   mutules, half-metopes at the corners); 16 metopes per long face with
//   Greek myth scenes; plain attic with side steps, east-side Triumph of
//   Peace relief, second cornice with projecting central section;
//   Quadriga by Schadow (1793), about 5 m high, copper sheets hammered in
//   moulds, four-horse chariot driven by a goddess figure facing east,
//   rebranded as Victoria with Iron Cross standard, crowned eagle and
//   oak-leaf wreath in 1814; L-shaped side wings at lower height, same
//   Doric order, open stoas, custom houses set back on the east sides,
//   plain metopes, angled roofs, gable pediments with tympanum roundels,
//   Minerva and Mars statues in niches.
// Schematic (not sourced, never stated as fact in the UI): exact column
// spacing and bay widths; entablature, attic and cornice heights and
// profiles; merged group geometry; simplified Quadriga and side-wing
// forms; Minerva north / Mars south assignment.
//
// Writes:
//   public/models/brandenburg-gate-simple/atlas.json
//   public/models/brandenburg-gate-simple/brandenburg-gate-simple-0.bin
//
// Usage: node scripts/generate-brandenburg-gate-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'brandenburg-gate-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~33 m with Quadriga) maps to 2.4 units
// (same as detailed).
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
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function slab(w, t, l, ang, x, y, z) {
  const g = new THREE.BoxGeometry(w, t, l);
  g.rotateZ(ang);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const COLX = [-24.25, -15.5, -6.75, 6.75, 15.5, 24.25];
const BASE = 1.5;

// --- Colonnade: front and rear rows of six 15 m Doric columns each, with
// capitals merged per row: 4 parts.
for (const [row, rowName] of [['front', 'Front'], ['rear', 'Rear']]) {
  const z = row === 'front' ? 4.5 : -4.5;
  const shafts = [];
  const capitals = [];
  for (const x of COLX) {
    shafts.push(cyl(0.7, 0.875, 15, x, BASE + 7.5, z, 12));
    capitals.push(cyl(1.02, 0.7, 0.55, x, 16.775, z, 10));
    capitals.push(box(x - 1.1, x + 1.1, 17.05, 17.5, z - 1.1, z + 1.1));
  }
  addPart(`${row}-column-shafts`, `${rowName} column shafts`, 'colonnade', shafts);
  addPart(`${row}-column-capitals`, `${rowName} column capitals`, 'colonnade', capitals);
}

// --- Passageway walls: six transverse walls, Hercules labor relief band,
// and the five passageway floors merged: 3 parts.
{
  const walls = [];
  for (const x of COLX) {
    walls.push(box(x - 1.25, x + 1.25, BASE, 16.5, -5.5, 5.5));
  }
  addPart('transverse-walls', 'Transverse passageway walls', 'passageway-walls', walls);
  const reliefs = [];
  const faces = [
    [0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1],
    [3, 1], [3, -1], [4, 1], [4, -1], [5, 1], [5, -1],
  ];
  for (const [wi, dir] of faces) {
    const x = COLX[wi] + dir * 1.25;
    reliefs.push(box(dir > 0 ? x : x - 0.12, dir > 0 ? x + 0.12 : x, 6.2, 9.8, -1.1, 1.1));
  }
  addPart('hercules-relief-band', 'Hercules labor relief band', 'passageway-walls', reliefs);
  const floors = [];
  for (const [x0, x1] of [[-5.5, 5.5], [8.0, 14.25], [16.75, 23.0], [-14.25, -8.0], [-23.0, -16.75]]) {
    floors.push(box(x0, x1, 0, 1.35, -5.5, 5.5));
  }
  addPart('passageway-floors', 'Passageway floors', 'passageway-walls', floors);
}

// --- Entablature: architrave, metope-and-triglyph frieze, cornice, front
// and rear: 6 parts.
for (const [face, faceName] of [['front', 'Front'], ['rear', 'Rear']]) {
  const zc = face === 'front' ? 4.5 : -4.5;
  const zo = face === 'front' ? 1 : -1;
  addPart(`${face}-architrave`, `${faceName} architrave`, 'entablature', [
    box(-26.25, 26.25, 17.5, 18.4, zc - 0.65, zc + 0.65),
  ]);
  const frieze = [box(-26.25, 26.25, 18.4, 19.4, zc - 0.6, zc + 0.6)];
  for (let k = 0; k < 16; k++) {
    const mxp = -26.25 + ((k + 0.5) * 52.5) / 16;
    frieze.push(box(mxp - 0.9, mxp + 0.9, 18.45, 19.35, zc + (zo > 0 ? 0.6 : -0.74), zc + (zo > 0 ? 0.74 : -0.6)));
  }
  addPart(`${face}-metope-frieze`, `${faceName} metope and triglyph frieze`, 'entablature', frieze);
  addPart(`${face}-cornice`, `${faceName} cornice`, 'entablature', [
    box(-27, 27, 19.4, 20.0, zc - 1.1, zc + 1.1),
  ]);
}

// --- Attic: storey, Triumph of Peace relief, side steps, second cornice
// and plinth: 4 parts.
addPart('attic-storey', 'Attic storey', 'attic', [
  box(-26.25, 26.25, 20.0, 25.0, -5.5, 5.5),
]);
addPart('triumph-of-peace-relief', 'Triumph of Peace relief', 'attic', [
  box(-6, 6, 21.2, 24.2, 5.5, 5.75),
]);
{
  const steps = [];
  for (const sx of [-1, 1]) {
    for (let s = 0; s < 3; s++) {
      steps.push(box(
        sx > 0 ? 26.25 + s * 1.1 : -26.25 - (s + 1) * 1.1,
        sx > 0 ? 26.25 + (s + 1) * 1.1 : -26.25 - s * 1.1,
        20.0 + s * 1.4, 21.4 + s * 1.4, -5.5, 5.5,
      ));
    }
  }
  addPart('attic-side-steps', 'Attic side steps', 'attic', steps);
}
addPart('second-cornice-plinth', 'Second cornice and plinth', 'attic', [
  box(-27, 27, 25.0, 25.6, -6, 6),
  box(-7, 7, 25.0, 26.4, 5.5, 7.2),
  box(-3.5, 3.5, 26.4, 27.2, 3.5, 6.8),
]);

// --- Quadriga: Victoria, the four horses, the chariot with wheels, and
// the Iron Cross standard: 4 parts.
{
  const robe = cyl(0.55, 0.95, 2.6, 0, 28.5, 5.0, 10);
  const head = new THREE.SphereGeometry(0.32, 8, 6);
  head.translate(0, 30.15, 5.0);
  const wingL = box(-0.08, 0.08, 0, 1.9, -0.45, 0.45);
  wingL.rotateZ(0.55);
  wingL.translate(-0.8, 29.5, 4.7);
  const wingR = box(-0.08, 0.08, 0, 1.9, -0.45, 0.45);
  wingR.rotateZ(-0.55);
  wingR.translate(0.8, 29.5, 4.7);
  addPart('victoria', 'Victoria', 'quadriga', [robe, head, wingL, wingR]);
  const horses = [];
  for (const x of [-2.7, -0.9, 0.9, 2.7]) {
    const z = 8.2;
    horses.push(box(x - 0.55, x + 0.55, 28.4, 29.7, z - 1.5, z + 1.5));
    for (const dx of [-0.35, 0.35]) {
      for (const dz of [-1.0, 1.0]) {
        horses.push(box(x + dx - 0.13, x + dx + 0.13, 27.2, 28.5, z + dz - 0.13, z + dz + 0.13));
      }
    }
    horses.push(strut([x, 29.5, z + 1.2], [x, 30.5, z + 2.1], 0.5));
    horses.push(box(x - 0.25, x + 0.25, 30.3, 30.9, z + 1.9, z + 2.9));
  }
  addPart('quadriga-horses', 'Four Quadriga horses', 'quadriga', horses);
  const wheelGeoms = [];
  for (const wx of [-1.32, 1.32]) {
    const w = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 12);
    w.rotateZ(Math.PI / 2);
    w.translate(wx, 28.3, 5.0);
    wheelGeoms.push(w);
  }
  addPart('chariot-wheels', 'Chariot and wheels', 'quadriga', [
    box(-1.2, 1.2, 27.4, 29.0, 4.2, 5.8),
    ...wheelGeoms,
  ]);
  const pole = cyl(0.06, 0.06, 3.4, 1.1, 30.3, 5.0, 8);
  const crossV = box(1.1 - 0.13, 1.1 + 0.13, 31.05, 31.9, 4.94, 5.06);
  const crossH = box(1.1 - 0.36, 1.1 + 0.36, 31.42, 31.68, 4.94, 5.06);
  const eagle = box(1.1 - 0.16, 1.1 + 0.16, 32.0, 32.45, 4.92, 5.08);
  addPart('iron-cross-standard', 'Iron Cross standard', 'quadriga', [pole, crossV, crossH, eagle]);
}

// --- Side wings: stoa columns, custom houses, roofs with pediments, and
// the Minerva and Mars statues: 8 parts.
for (const side of [-1, 1]) {
  const wingName = side < 0 ? 'North' : 'South';
  const mx = (a, b) => (side < 0 ? [a, b] : [-b, -a]);
  const cols = [];
  for (const [cx0, cz] of [[-31.0, -4], [-31.0, 2], [-28.0, 8], [-24.75, 8]]) {
    const cx = -cx0 * side;
    cols.push(cyl(0.38, 0.45, 6, cx, 3, cz, 8));
    cols.push(cyl(0.38, 0.55, 0.25, cx, 6.12, cz, 8));
    cols.push(box(cx - 0.55, cx + 0.55, 6.25, 6.45, cz - 0.55, cz + 0.55));
  }
  addPart(`${wingName.toLowerCase()}-stoa-columns`, `${wingName} wing stoa columns`, 'side-wings', cols);
  const [hx0, hx1] = mx(-29.5, -24.5);
  const [ax0, ax1] = mx(-31.6, -30.4);
  const [bx0, bx1] = mx(-30.6, -24.0);
  const [px0, px1] = mx(-32.5, -29.5);
  addPart(`${wingName.toLowerCase()}-custom-house`, `${wingName} wing custom house`, 'side-wings', [
    box(hx0, hx1, 0, 6, 9.2, 12.8),
    box(ax0, ax1, 6.45, 7.15, -5, 9),
    box(bx0, bx1, 6.45, 7.15, 7.4, 8.6),
  ]);
  const r1 = slab(4.6, 0.18, 15, -0.42 * side, 31.95 * side, 7.9, 2);
  const r2 = slab(4.6, 0.18, 15, 0.42 * side, 30.05 * side, 7.9, 2);
  const roundel = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 12);
  roundel.rotateX(Math.PI / 2);
  roundel.translate(31 * side, 7.75, 9.55);
  const pediment = new THREE.CylinderGeometry(1.6, 1.6, 1.0, 3, 1);
  pediment.rotateZ(Math.PI / 2);
  pediment.rotateX(Math.PI / 2);
  pediment.translate(31 * side, 7.9, 9.0);
  addPart(`${wingName.toLowerCase()}-roof-pediment`, `${wingName} wing roof and pediment`, 'side-wings', [r1, r2, pediment, roundel]);
}
{
  const minerva = [
    cyl(0.3, 0.44, 2.2, -31.9, 1.1, -5.5, 8),
    cyl(0.05, 0.05, 3.0, -31.4, 1.5, -5.5, 6),
  ];
  const mh = new THREE.SphereGeometry(0.22, 8, 6);
  mh.translate(-31.9, 2.42, -5.5);
  minerva.push(mh);
  addPart('minerva-statue', 'Minerva statue', 'side-wings', minerva);
  const mars = [
    cyl(0.3, 0.44, 2.2, 31.9, 1.1, -5.5, 8),
    strut([32.35, 1.6, -5.5], [32.35, 0.2, -5.1], 0.09),
  ];
  const mah = new THREE.SphereGeometry(0.22, 8, 6);
  mah.translate(31.9, 2.42, -5.5);
  mars.push(mah);
  addPart('mars-statue', 'Mars statue', 'side-wings', mars);
}

// --- Base: steps and platform merged: 2 parts.
{
  const steps = [];
  for (let s = 0; s < 3; s++) {
    steps.push(box(-26.25, 26.25, s * 0.45, (s + 1) * 0.45, 5.5, 8.5 - s * 0.8));
    steps.push(box(-26.25, 26.25, s * 0.45, (s + 1) * 0.45, -8.5 + s * 0.8, -5.5));
  }
  addPart('steps', 'Front and rear steps', 'base', steps);
  addPart('platform', 'Column platform', 'base', [
    box(-26.25, 26.25, 1.35, BASE, -5.5, 5.5),
  ]);
}

// ---------------------------------------------------------------- colors
// Schematic light sandstone palette (same family as the detailed model;
// the Eiffel Tower is the only dark realistic model in the atlas).
function colorFor(id) {
  if (id === 'victoria') return '#b87333';
  if (id === 'quadriga-horses') return '#a86a30';
  if (id === 'chariot-wheels') return '#96602c';
  if (id === 'iron-cross-standard') return '#5a4a33';
  if (id === 'hercules-relief-band') return '#a89a76';
  if (id === 'transverse-walls') return '#d3c8ae';
  if (id.includes('-metope-frieze')) return '#c9bfa5';
  if (id.includes('-architrave') || id.includes('-cornice')) return '#d9cfbb';
  if (id.includes('-stoa-columns')) return '#cfc4a4';
  if (id.includes('-column-shafts') || id.includes('-column-capitals')) return '#ded3ba';
  if (id === 'triumph-of-peace-relief') return '#b39b62';
  if (id === 'attic-storey' || id === 'second-cornice-plinth') return '#d3c8ae';
  if (id === 'attic-side-steps') return '#c4b898';
  if (id.includes('-custom-house') || id.includes('-roof-pediment')) return '#cfc4a4';
  if (id === 'minerva-statue' || id === 'mars-statue') return '#8f8578';
  if (id === 'passageway-floors') return '#8a8478';
  if (id === 'steps') return '#b5aa92';
  if (id === 'platform') return '#c4b898';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'colonnade', name: 'Doric colonnades', color: '#ded3ba', description: 'Twelve 15 m fluted Doric columns in a front and a rear row, with echinus-and-abacus capitals and no bases, in the Greek manner.' },
  { id: 'passageway-walls', name: 'Passageway walls and reliefs', color: '#d3c8ae', description: 'The six walls between the front and rear column pairs, dividing the five passageways, with reliefs of the Labors of Hercules.' },
  { id: 'entablature', name: 'Entablature', color: '#c9bfa5', description: 'Architrave, metope-and-triglyph frieze with sixteen metopes on each long face, and cornice.' },
  { id: 'attic', name: 'Attic storey', color: '#d3c8ae', description: 'The plain attic with the Triumph of Peace relief, side steps, and the second cornice and plinth carrying the Quadriga.' },
  { id: 'quadriga', name: 'Quadriga', color: '#b87333', description: 'Schadow\u2019s copper four-horse chariot, about 5 m high, driven by Victoria and facing east into the city.' },
  { id: 'side-wings', name: 'Side wings', color: '#cfc4a4', description: 'L-shaped flanking wings at lower height in the same Doric order, with open stoas, custom houses, angled roofs, pediments and statues.' },
  { id: 'base', name: 'Steps and platform', color: '#b5aa92', description: 'Front and rear steps and the column platform the gate stands on.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'front column shafts': 'Six fluted Doric columns, 15 m tall and 1.75 m in diameter at the base, in the front row. The columns carry no bases, in the Greek manner. Exact taper and fluting are schematic.',
  'front column capitals': 'Echinus-and-abacus capitals of the front row columns, carrying the architrave. Exact profiles are schematic.',
  'rear column shafts': 'Six fluted Doric columns, 15 m tall and 1.75 m in diameter at the base, in the rear row. The columns carry no bases, in the Greek manner. Exact taper and fluting are schematic.',
  'rear column capitals': 'Echinus-and-abacus capitals of the rear row columns, carrying the architrave. Exact profiles are schematic.',
  'transverse passageway walls': 'Six walls between the front and rear column pairs, dividing the gate into five passageways. Exact wall thicknesses are schematic.',
  'hercules labor relief band': 'Classicizing reliefs of the Labors of Hercules decorating the passageway walls. Exact panel arrangement is schematic.',
  'passageway floors': 'The floors of the five passageways; the central one, the widest, was historically reserved for the royal family, while ordinary citizens used the outer four. Exact paving is schematic.',
  'front architrave': 'The front architrave, the lowest band of the entablature, spanning the front colonnade. Exact height is schematic.',
  'front metope and triglyph frieze': 'The front frieze with triglyphs and sixteen metopes carrying relief scenes from Greek mythology, many echoing the Parthenon in showing centaurs fighting men. Exact scenes are schematic.',
  'front cornice': 'The front cornice crowning the entablature. Exact profile is schematic.',
  'rear architrave': 'The rear architrave, the lowest band of the entablature, spanning the rear colonnade. Exact height is schematic.',
  'rear metope and triglyph frieze': 'The rear frieze with triglyphs and sixteen metopes carrying relief scenes from Greek mythology. Exact scenes are schematic.',
  'rear cornice': 'The rear cornice crowning the entablature. Exact profile is schematic.',
  'attic storey': 'The plain attic storey above the cornice. Exact height is schematic.',
  'triumph of peace relief': 'The large allegorical relief of the Triumph of Peace on the east face of the attic, above Pariser Platz. Exact composition is schematic.',
  'attic side steps': 'Wide steps at the sides of the attic, receding in both directions. Exact arrangement is schematic.',
  'second cornice and plinth': 'The second cornice above the attic, with its projecting central section carrying the plinth of the Quadriga. Exact projection is schematic.',
  'victoria': 'Victoria, the Roman goddess of victory, winged and robed, driving the chariot. The Quadriga is made of copper sheets hammered in moulds and stands about 5 m high. Exact figure is schematic.',
  'four quadriga horses': 'The four horses drawing Victoria\u2019s chariot eastward into the city. Only one horse\u2019s head from the original 1793 sculpture survives, kept in the M\u00e4rkisches Museum. Exact poses are schematic.',
  'chariot and wheels': 'The two-wheeled chariot of the Quadriga. Exact wheel design is schematic.',
  'iron cross standard': 'The lance with the Iron Cross standard and the crowned Prussian eagle, added when Schinkel redesigned the Quadriga in 1814 as a Prussian triumphal emblem. Exact form is schematic.',
  'north wing stoa columns': 'Doric columns of the north wing\u2019s open stoa, at a lower height than the gate\u2019s colonnade. Exact column count and positions are schematic.',
  'north wing custom house': 'The north wing\u2019s entablature and custom house, set back from the columns on the longer east-stretching side of the wing. These housed the guards and tax collectors of the Berlin Customs Wall, in force until 1860. Exact footprint is schematic.',
  'north wing roof and pediment': 'The simple angled roof and gable pediment of the north wing, with a small circular relief in the tympanum. Exact shapes are schematic.',
  'south wing stoa columns': 'Doric columns of the south wing\u2019s open stoa, at a lower height than the gate\u2019s colonnade. Exact column count and positions are schematic.',
  'south wing custom house': 'The south wing\u2019s entablature and custom house, set back from the columns on the longer east-stretching side of the wing. Exact footprint is schematic.',
  'south wing roof and pediment': 'The simple angled roof and gable pediment of the south wing, with a small circular relief in the tympanum. Exact shapes are schematic.',
  'minerva statue': 'The statue of Minerva with her lance in the north wing niche, after Schadow\u2019s 1792 design; the original by Johann Daniel Meltzer was destroyed in the Second World War and replaced in 1951 to 1952 by a copy from the Kranold sculptor collective. Exact figure is schematic.',
  'mars statue': 'The statue of Mars, the Roman god of war, in the south wing niche, after Schadow\u2019s 1792 design and executed by Carl Friedrich Wichmann. Exact figure is schematic.',
  'front and rear steps': 'The steps rising to the column platform on the east (Pariser Platz) and west sides. Exact step counts are schematic.',
  'column platform': 'The column platform the gate\u2019s colonnades stand on. Exact platform depth is schematic.',
};

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
const binName = 'brandenburg-gate-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the brandenburg-gate-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Brandenburg Gate, Berlin (simplified schematic)',
  title: 'Brandenburg Gate',
  location: 'Berlin, Germany',
  blurb: 'Carl Gotthard Langhans\u2019 neoclassical city gate in Berlin, built 1788 to 1791, in simplified schematic form: twelve 15 m Doric columns in two rows form five passageways, and a copper Quadriga of Victoria driving a four-horse chariot crowns the attic.',
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
  chunks: [{ url: '/models/brandenburg-gate-simple/brandenburg-gate-simple-0.bin', bytes: offset }],
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
