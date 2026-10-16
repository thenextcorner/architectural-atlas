// Simplified schematic St Peter's Basilica for the Architectural Atlas.
//
// The "simple" variant of St Peter's Basilica: same footprint, massing
// and proportions as the detailed model (see
// scripts/generate-st-peters-basilica.mjs, whose header lists every
// sourced dimension reused here), but coarser: 28 named parts across 7
// systems instead of 191 across 8. Individual columns, statues, ribs and
// bays are merged into group parts; the baldachin, lantern and obelisk
// are reduced to their main masses.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-st-peters-basilica.mjs for the full attribution):
//   Vatican City; architects Bramante, Sangallo the Younger, Michelangelo,
//   Vignola, della Porta, Maderno, Bernini and Fontana; Renaissance and
//   Baroque; groundbreaking 18 April 1506, consecrated 18 November 1626;
//   220 m long, 150 m wide, 136.6 m to the top of the cross; nave interior
//   46.2 m; dome 42.0 m outer, 41.5 m inner, sixteen ribs and sixteen
//   windows; drum 190 m circumference, 20 m high, to 73 m; lantern 19 m,
//   ball 2.4 m, cross 4.9 m; four crossing piers of 73 m circumference with
//   Longinus (Bernini), Helena (Bolgi), Veronica (Mochi) and Andrew
//   (Duquesnoy); facade 51 m by 114 m with giant order, five portals
//   (Holy Door northernmost, Filarete bronze door central, Door of the Dead
//   southern), thirteen attic statues and two clocks; vestibule 71 m wide,
//   13.5 m deep, 28 m high; baldachin 1624-1633, 28.5 m high, four 11 m
//   helical columns; colonnade 1656-1667, arms 93 m long and 20 m high,
//   284 columns, 88 pilasters, 140 statues; square 340 m by 240 m; obelisk
//   25.5 m shaft, 40 m total, moved 1586 by Domenico Fontana for Sixtus V;
//   capacity about 60,000.
// Schematic (not sourced, never stated as fact in the UI): exact plan
// layout and block depths; merged group geometry; simplified dome, rib,
// baldachin and colonnade forms; chapel and fountain positions.
//
// Writes:
//   public/models/st-peters-basilica-simple/atlas.json
//   public/models/st-peters-basilica-simple/st-peters-basilica-simple-0.bin
//
// Usage: node scripts/generate-st-peters-basilica-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'st-peters-basilica-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~220 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 220;

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
function hbeam(x1, z1, x2, z2, y0, y1, w) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(len, y1 - y0, w);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// === FACADE (5 parts) ===
addPart('facade-block', 'Facade block', 'facade', [
  box(-57, 57, 0, 51, -4, 0),
  box(-57.8, 57.8, 37, 41, -1, 1.8),
  box(-57, 57, 41, 51, -3, 0.5),
]);
{
  const cols = [];
  for (const x of [-52.5, -38.5, -24.5, -10.5, 10.5, 24.5, 38.5, 52.5]) {
    cols.push(cyl(1.35, 1.55, 34, x, 17, 1.2, 8));
    cols.push(box(x - 1.9, x + 1.9, 34, 37, -0.7, 3.1));
  }
  addPart('facade-columns', 'Facade columns', 'facade', cols);
}
{
  const portals = [];
  for (const [x0, x1, y1] of [[-46.5, -41.5, 12], [-24, -20, 12], [-3.5, 3.5, 14], [20, 24, 12], [41.5, 46.5, 12]]) {
    portals.push(box(x0, x1, 0, y1, -0.6, 0.15));
  }
  addPart('facade-portals', 'Facade portals', 'facade', portals);
}
{
  const statues = [];
  for (let i = 0; i < 13; i++) {
    const x = -52 + (i * 104) / 12;
    statues.push(box(x - 0.8, x + 0.8, 51, 55.9, -0.8, 0.8));
    const head = new THREE.SphereGeometry(0.5, 8, 6);
    head.translate(x, 56.3, 0);
    statues.push(head);
  }
  addPart('attic-statues', 'Attic statues', 'facade', statues);
}
{
  const vest = [
    box(-35.5, 35.5, -0.5, 0, -17.5, -4),
    box(-35.5, 35.5, 27, 28, -17.5, -4),
    box(-35.5, -34.3, 0, 28, -17.5, -4),
    box(34.3, 35.5, 0, 28, -17.5, -4),
  ];
  for (const x of [-26, -9, 9, 26]) {
    vest.push(box(x - 1.1, x + 1.1, 0, 28, -17.4, -16.4));
  }
  addPart('vestibule', 'Vestibule', 'facade', vest);
}

// === NAVE BODY (5 parts) ===
addPart('nave-block', 'Nave block', 'nave-body', [
  box(-30, -14, 0, 32, -135, -17.5),
  box(14, 30, 0, 32, -135, -17.5),
  box(-44, 44, -0.5, 0, -135, -17.5),
]);
{
  const vault = new THREE.CylinderGeometry(16, 16, 117.5, 14, 1, true, Math.PI / 2, Math.PI);
  vault.rotateX(Math.PI / 2);
  vault.translate(0, 32, -76.25);
  addPart('nave-vault', 'Nave vault', 'nave-body', [vault]);
}
addPart('aisle-blocks', 'Aisle blocks', 'nave-body', [
  box(-44, -30, 0, 26, -135, -17.5),
  box(30, 44, 0, 26, -135, -17.5),
  box(-44, -30, 26, 27.5, -135, -17.5),
  box(30, 44, 26, 27.5, -135, -17.5),
]);
{
  const piers = [];
  for (const [x0, x1, z0, z1] of [
    [-30.25, -12, -138, -119.75], [12, 30.25, -138, -119.75],
    [12, 30.25, -180.25, -162], [-30.25, -12, -180.25, -162],
  ]) {
    piers.push(box(x0, x1, 0, 46, z0, z1));
  }
  addPart('crossing-piers', 'Crossing piers', 'nave-body', piers);
}
{
  const chapels = [];
  for (const [x0, x1, z0, z1] of [
    [-56, -44, -90, -60], [-56, -44, -125, -95],
    [44, 56, -90, -60], [44, 56, -125, -95],
  ]) {
    chapels.push(box(x0, x1, 0, 20, z0, z1));
    const dome = new THREE.SphereGeometry(6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate((x0 + x1) / 2, 20, (z0 + z1) / 2);
    chapels.push(dome);
  }
  chapels.push(box(25, 50, 0, 18, -215, -185));
  addPart('chapel-blocks', 'Chapel blocks', 'nave-body', chapels);
}

// === TRANSEPT AND APSE (2 parts) ===
addPart('transept-block', 'Transept block', 'transept-apse', [
  box(-75, -30, 0, 40, -165, -135),
  box(30, 75, 0, 40, -165, -135),
  box(-76, -75, 0, 44, -165, -135),
  box(75, 76, 0, 44, -165, -135),
  box(-75, 75, 40, 41.5, -165, -135),
  box(-75, 75, -0.5, 0, -165, -135),
]);
{
  const wall = new THREE.CylinderGeometry(24, 24, 40, 18, 1, true, Math.PI / 2, Math.PI);
  wall.translate(0, 20, -165);
  const conch = new THREE.SphereGeometry(24, 18, 8, Math.PI, Math.PI, 0, Math.PI / 2);
  conch.translate(0, 40, -165);
  addPart('apse', 'Apse', 'transept-apse', [wall, conch]);
}

// === DOME (4 parts) ===
addPart('dome-drum', 'Dome drum', 'dome', [
  cyl(32, 33.5, 11.5, 0, 47.25, -150, 20),
  cyl(30.24, 30.24, 20, 0, 63, -150, 28),
  cyl(31.5, 31.5, 2, 0, 74, -150, 28),
]);
{
  const shellPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    shellPts.push(new THREE.Vector2(3.2 + (21 - 3.2) * Math.pow(1 - t, 1.6), 73 + (110.3 - 73) * t));
  }
  const shell = new THREE.LatheGeometry(shellPts, 28);
  shell.translate(0, 0, -150);
  addPart('dome-shell', 'Dome shell', 'dome', [shell]);
}
{
  const ribs = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const r = 3.2 + (21 - 3.2) * Math.pow(1 - t, 1.6) + 0.55;
      pts.push(new THREE.Vector3(r * Math.cos(a), 73 + (110.3 - 73) * t, -150 + r * Math.sin(a)));
    }
    ribs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.55, 5, false));
  }
  addPart('dome-ribs', 'Dome ribs', 'dome', ribs);
}
{
  const drumL = cyl(3.2, 3.4, 15.7, 0, 110.3 + 7.85, -150, 10);
  const cap = new THREE.SphereGeometry(3.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(0, 126, -150);
  const ball = new THREE.SphereGeometry(1.2, 10, 8);
  ball.translate(0, 130.5, -150);
  addPart('lantern-ball-cross', 'Lantern, ball and cross', 'dome', [
    drumL, cap, ball,
    box(-0.25, 0.25, 131.7, 136.6, -150.25, -149.75),
    box(-1.1, 1.1, 134.2, 134.7, -150.25, -149.75),
  ]);
}

// === BALDACHIN (2 parts) ===
{
  const cols = [];
  for (const [cx, cz] of [[-4.5, -4.5], [4.5, -4.5], [4.5, 4.5], [-4.5, 4.5]]) {
    cols.push(box(cx - 1.4, cx + 1.4, 0, 3, -150 + cz - 1.4, -150 + cz + 1.4));
    for (let s = 0; s < 8; s++) {
      const t = new THREE.TorusGeometry(0.7, 0.32, 6, 10);
      t.rotateX(Math.PI / 2);
      t.translate(cx + 0.3 * Math.cos(s * 1.1), 3 + (s + 0.5) * (11 / 8), -150 + cz + 0.3 * Math.sin(s * 1.1));
      cols.push(t);
    }
  }
  addPart('baldachin-columns', 'Baldachin columns', 'baldachin', cols);
}
{
  const canopy = [box(-6, 6, 14, 16, -156, -144)];
  for (const [cx, cz] of [[-4.5, -4.5], [4.5, -4.5], [4.5, 4.5], [-4.5, 4.5]]) {
    const v = new THREE.BoxGeometry(1.1, 8.5, 1.1);
    v.translate(0, 4.25, 0);
    const dir = new THREE.Vector3(cx * 0.3 - cx, 23 - 16, (cz * 0.3) - cz).normalize();
    v.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    v.translate(cx, 16, -150 + cz);
    canopy.push(v);
  }
  const orb = new THREE.SphereGeometry(1.3, 10, 8);
  orb.translate(0, 24.3, -150);
  canopy.push(orb);
  canopy.push(box(-0.2, 0.2, 25.6, 28.5, -150.2, -149.8));
  addPart('baldachin-canopy', 'Baldachin canopy', 'baldachin', canopy);
}

// === COLONNADE (7 parts) ===
function colPoint(thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  return [100 * Math.cos(t), 140 + 70 * Math.sin(t)];
}
for (const [key, Name, start] of [['north', 'North', 150], ['south', 'South', -30]]) {
  const cols = [];
  for (let i = 0; i < 10; i++) {
    const t = ((start + (i + 0.5) * 6) * Math.PI) / 180;
    const px = 100 * Math.cos(t);
    const pz = 140 + 70 * Math.sin(t);
    const dx = px;
    const dz = pz - 140;
    const l = Math.hypot(dx, dz);
    for (const k of [-7.125, -2.375, 2.375, 7.125]) {
      cols.push(cyl(0.7, 0.85, 14, px + (dx / l) * k, 7, pz + (dz / l) * k, 8));
    }
  }
  addPart(`${key}-arm-columns`, `${Name} arm columns`, 'colonnade', cols);
  const ent = [];
  for (let j = 0; j < 3; j++) {
    const p0 = colPoint(start + j * 20);
    const p1 = colPoint(start + (j + 1) * 20);
    ent.push(hbeam(p0[0], p0[1], p1[0], p1[1], 14, 16.5, 19));
  }
  for (let j = 0; j < 6; j++) {
    const p0 = colPoint(start + j * 10);
    const p1 = colPoint(start + (j + 1) * 10);
    ent.push(hbeam(p0[0], p0[1], p1[0], p1[1], 16.5, 18.5, 19));
  }
  addPart(`${key}-arm-entablature`, `${Name} arm entablature`, 'colonnade', ent);
  const statues = [];
  for (let m = 0; m < 6; m++) {
    const p = colPoint(start + 5 + m * 10);
    statues.push(box(p[0] - 0.5, p[0] + 0.5, 18.5, 21, p[1] - 0.5, p[1] + 0.5));
    const head = new THREE.SphereGeometry(0.35, 8, 6);
    head.translate(p[0], 21.2, p[1]);
    statues.push(head);
  }
  addPart(`${key}-arm-statues`, `${Name} arm statues`, 'colonnade', statues);
}
{
  const corr = [];
  for (const side of [-1, 1]) {
    const x0 = side * 57;
    const x1 = side * 86.6;
    for (let i = 0; i < 8; i++) {
      const t = 0.06 + (i * 0.88) / 7;
      const px = x0 + (x1 - x0) * t;
      const pz = 5 + 100 * t;
      corr.push(cyl(0.6, 0.75, 12, px - 3.5, 6, pz, 8));
      corr.push(cyl(0.6, 0.75, 12, px + 3.5, 6, pz, 8));
    }
    corr.push(hbeam(x0, 5, x1, 105, 12, 14, 14));
  }
  addPart('entrance-corridors', 'Entrance corridors', 'colonnade', corr);
}

// === SQUARE AND OBELISK (3 parts) ===
{
  const shaft = new THREE.CylinderGeometry(1.0, 1.5, 25.5, 4, 1);
  shaft.rotateY(Math.PI / 4);
  shaft.translate(0, 8 + 12.75, 140);
  const pyr = new THREE.ConeGeometry(1.05, 1.8, 4);
  pyr.rotateY(Math.PI / 4);
  pyr.translate(0, 33.5 + 0.9, 140);
  addPart('obelisk', 'Obelisk', 'square-obelisk', [
    box(-3, 3, 0, 8, 137, 143),
    shaft, pyr,
    box(-0.2, 0.2, 35.3, 39.9, 139.8, 140.2),
  ]);
}
{
  const f = [];
  for (const fx of [-71.4, 71.4]) {
    f.push(cyl(6, 6.5, 1.5, fx, 0.75, 140, 14));
    f.push(cyl(0.8, 1.2, 4.5, fx, 3.75, 140, 8));
    f.push(cyl(3, 3.2, 1, fx, 6.5, 140, 12));
  }
  addPart('fountains', 'Fountains', 'square-obelisk', f);
}
addPart('square-paving', 'Square paving', 'square-obelisk', [
  box(-120, 120, -0.5, 0, 0, 260),
  box(-121, -120, 0, 0.5, 0, 260),
  box(120, 121, 0, 0.5, 0, 260),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'baldachin-columns' || id === 'baldachin-canopy') return '#8a6b3f';
  if (id === 'dome-shell' || id === 'dome-ribs') return '#aeb6ba';
  if (id === 'lantern-ball-cross') return '#9aa2a6';
  if (id === 'obelisk') return '#c9bfa5';
  if (id === 'fountains') return '#b9c4c6';
  if (id === 'square-paving') return '#a8a094';
  if (id === 'facade-portals') return '#5a4a33';
  if (id === 'attic-statues') return '#c9c2b2';
  if (id === 'nave-vault') return '#c9c0ab';
  return '#d8cfc0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facade', name: 'Facade and vestibule', color: '#d8cfc0', description: "Maderno's 51 m high, 114 m wide facade with giant columns, five portals and thirteen attic statues, in simplified form." },
  { id: 'nave-body', name: 'Nave and crossing', color: '#d5ccb8', description: 'The long nave with its barrel vault, the aisles, the four crossing piers and the chapel blocks.' },
  { id: 'transept-apse', name: 'Transept and apse', color: '#d5ccb8', description: 'The 150 m wide transept and the semicircular apse with its conch.' },
  { id: 'dome', name: 'Dome', color: '#aeb6ba', description: "Michelangelo's dome: drum, 42 m shell with sixteen ribs, and the lantern, ball and cross rising to 136.6 m." },
  { id: 'baldachin', name: 'Baldachin', color: '#8a6b3f', description: "Bernini's 28.5 m bronze canopy over the high altar." },
  { id: 'colonnade', name: 'Colonnade', color: '#d8cfc0', description: "Bernini's elliptical colonnade embracing St Peter's Square, in simplified form." },
  { id: 'square-obelisk', name: 'Square and obelisk', color: '#a8a094', description: "St Peter's Square with the Vatican obelisk and the two fountains." },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'facade block': 'The 51 m high, 114 m wide facade wall with its entablature and attic, merged into one mass. Exact articulation is schematic.',
  'facade columns': 'The eight giant columns of the facade order, merged into one part. Exact diameters and heights are schematic.',
  'facade portals': 'The five portals from the vestibule into the basilica, merged into one part: the Holy Door (northernmost, opened only for holy years), the central Filarete bronze door of 1455 and the Door of the Dead (southernmost) among them. Exact recesses are schematic.',
  'attic statues': 'The thirteen colossal attic statues, merged into one part: Christ the Redeemer at the center with St John the Baptist and eleven apostles. Exact figures are schematic.',
  'vestibule': 'The 71 m wide, 13.5 m deep, 28 m high entrance hall behind the facade, with its 28 m internal pilasters, merged into one part. Exact detail is schematic.',
  'nave block': 'The nave walls and floor, merged into one part; the nave interior rises 46.2 m. Exact wall thicknesses are schematic.',
  'nave vault': 'The barrel vault over the nave, the highest church vault of its kind. Exact profile is schematic.',
  'aisle blocks': 'The aisle blocks flanking the nave with their roofs, merged into one part. Exact widths are schematic.',
  'crossing piers': 'The four gargantuan crossing piers, 73 m in circumference each, merged into one part; their niches hold the colossal statues of Longinus, Helena, Veronica and Andrew. Exact cross sections are schematic.',
  'chapel blocks': 'The chapels off the aisles and the sacristy, merged into one part. Exact volumes and positions are schematic.',
  'transept block': 'The 150 m wide transept with its end walls, roof and floor, merged into one part. Exact depth is schematic.',
  'apse': 'The semicircular apse with its semi-dome conch at the west end, merged into one part. Exact radius is schematic.',
  'dome drum': 'The drum of the dome, 190 m in circumference, 20 m high and rising to 73 m, with its plinth, cornice and sixteen windows, merged into one part. Exact detail is schematic.',
  'dome shell': 'The dome shell, 42.0 m in outer diameter, the tallest dome in the world. Exact profile is schematic.',
  'dome ribs': 'The sixteen ribs of the dome with their buttress fins, merged into one part. Exact cross sections are schematic.',
  'lantern, ball and cross': 'The 19 m lantern, the 2.4 m ball and the 4.9 m cross, merged into one part; from the pavement to the top of the cross is 136.6 m. Exact subdivision is schematic.',
  'baldachin columns': "Bernini's four 11 m helical bronze columns on their pedestals, merged into one part; the twist is approximated by stacked offset rings. Exact ornament is schematic.",
  'baldachin canopy': 'The entablature, volutes, orb and cross of the 28.5 m baldachin, merged into one part. Exact detail is schematic.',
  'north arm columns': 'The columns of the north colonnade arm, part of the 284 columns of the colonnade, merged into one part. Exact count is schematic.',
  'north arm entablature': 'The entablature, attic and pilasters of the north arm, merged into one part. Exact profiles are schematic.',
  'north arm statues': 'The statues crowning the north arm, part of the 140 statues above the colonnade, merged into one part. Exact figures are schematic.',
  'south arm columns': 'The columns of the south colonnade arm, part of the 284 columns of the colonnade, merged into one part. Exact count is schematic.',
  'south arm entablature': 'The entablature, attic and pilasters of the south arm, merged into one part. Exact profiles are schematic.',
  'south arm statues': 'The statues crowning the south arm, part of the 140 statues above the colonnade, merged into one part. Exact figures are schematic.',
  'entrance corridors': 'The straight corridors linking the facade to the colonnade arms, merged into one part. Exact alignment is schematic.',
  'obelisk': 'The Vatican obelisk, 25.5 m of shaft rising to 40 m with base and cross, merged into one part; moved to the square in 1586 under Sixtus V by Domenico Fontana. Exact pedestal form is schematic.',
  'fountains': "The two fountains of St Peter's Square, merged into one part. Exact forms are schematic.",
  'square paving': "The paving of St Peter's Square, shown schematically; the real square is 340 m long and 240 m wide. Exact extent and pattern are schematic.",
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
const binName = 'st-peters-basilica-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the st-peters-basilica-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: "St Peter's Basilica, Vatican City (simplified schematic)",
  title: "St Peter's Basilica",
  location: 'Vatican City',
  blurb: 'The Papal Basilica of Saint Peter in the Vatican in simplified schematic form: 220 m long, with the 136.6 m dome, the 114 m facade, the bronze baldachin and the embracing colonnade.',
  sourceUrls: [
    { label: "Wikipedia: St. Peter's Basilica", url: 'https://en.wikipedia.org/wiki/St._Peter%27s_Basilica' },
    { label: 'Opus Dei: 400 Years of the Basilica of Saint Peter', url: 'https://opusdei.org/en-za/article/basilica-saint-peter-four-hundredth-anniversary/pdf/' },
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
  chunks: [{ url: '/models/st-peters-basilica-simple/st-peters-basilica-simple-0.bin', bytes: offset }],
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
