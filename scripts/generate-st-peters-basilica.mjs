// Procedural St Peter's Basilica for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned St Peter's Basilica in code
// and writes it in the atlas binary format:
//   public/models/st-peters-basilica/atlas.json
//   public/models/st-peters-basilica/st-peters-basilica-0.bin
//
// Sourced dimensions and facts (verified 2026-10-10 from the Wikipedia
// article "St. Peter's Basilica", the Opus Dei 400th anniversary article,
// the Bluffton University St Peter's art reference, RIBA pix, and
// onthisday.com):
//   Papal Basilica of Saint Peter in the Vatican, Vatican City; architects
//   Donato Bramante, Antonio da Sangallo the Younger, Michelangelo,
//   Giacomo Barozzi da Vignola, Giacomo della Porta, Carlo Maderno,
//   Gian Lorenzo Bernini and Carlo Fontana; style Renaissance and Baroque;
//   groundbreaking 18 April 1506 (cornerstone laid by Pope Julius II, to
//   Bramante's design); consecrated 18 November 1626 by Pope Urban VIII;
//   total length 220 m; total width 150 m; height from pavement to top of
//   cross 136.6 m; interior nave height 46.2 m (barrel vault, the highest
//   of any church); nave in three bays; nave interior width 27.5 m;
//   dome outer diameter 42.0 m, inner 41.5 m; dome made up of sixteen ribs
//   converging at the top, with sixteen windows; drum 190 m in
//   circumference, 20 m high, rising to 73 m from the ground; lantern
//   19 m high; ball 2.4 m in diameter; cross 4.9 m high; tallest dome in
//   the world; four crossing piers of 73 m circumference each, their
//   niches holding St Longinus by Bernini (north-east, 1639), St Helena
//   by Andrea Bolgi (north-west), St Veronica by Francesco Mochi
//   (south-west) and St Andrew by Francois Duquesnoy (south-east),
//   guarding the basilica's major relics; facade 51 m high by 114 m wide
//   with a giant order of columns; two 5.55 m statues of Saints Peter
//   and Paul on the steps; five portals from the narthex, the northernmost
//   the Holy Door (walled up, opened only for holy years; present bronze
//   door by Vico Consorti, 1950), the central the Renaissance bronze door
//   by Filarete (1455) enlarged to fit, the southern the Door of the Dead
//   by Giacomo Manzu; thirteen attic statues, Christ the Redeemer at the
//   center with St John the Baptist and eleven apostles; two clocks in
//   towers to either side of the facade, replacing Bernini's bell towers;
//   vestibule (narthex) 71 m wide, 13.5 m deep, 28 m high, its internal
//   pilasters 28 m tall; Navicella mosaic above the central external door
//   after Giotto; equestrian statues of Constantine (Bernini, 1670) at the
//   north end of the narthex and Charlemagne (Cornacchini) at the south;
//   baldachin by Bernini 1624 to 1633, 28.5 m high, four helical bronze
//   columns 11 m tall, over the high altar above the tomb of St Peter;
//   Michelangelo's Pieta (1498-1499) in the north aisle; colonnade designed
//   by Bernini 1656 to 1667, each arm 93 m long and 20 m high, 284 columns,
//   88 pilasters and 140 statues in total, the arms embracing the faithful;
//   St Peter's Square 340 m long and 240 m wide; Vatican obelisk with a
//   25.5 m shaft and 40 m total with base and cross, moved to the square
//   in 1586 under Pope Sixtus V by Domenico Fontana, revered as a witness
//   to Peter's death; capacity about 60,000; the largest Christian church
//   building in the world by interior area.
// Schematic (not sourced, never stated as fact in the UI): exact plan
// layout and bay divisions; wall thicknesses and block depths; the apse
// radius and choir block behind it; column spacings, diameters and
// heights; capital, entablature, attic and cornice profiles; portal
// recess depths and the north-south order of the two middle doors;
// vestibule pilaster count and positions; vault springing height and
// profile; aisle widths; crossing pier cross sections (square, sized to
// the 73 m circumference); pier statue poses; transept depth; dome shell
// profile curve, rib cross sections and buttress shapes; lantern
// subdivision; baldachin spiral approximation (stacked offset tori),
// volute curves and canopy details; colonnade ellipse axes, bay count,
// arm depth, corridor alignment and statue poses; obelisk pedestal shape;
// fountain designs and positions; square paving extent; chapel volumes
// and positions; clock tower proportions; sacristy footprint.
//
// Coordinate frame: x = lateral (north is -x), z = depth (east, toward
// St Peter's Square, is +z; the facade front is the z = 0 plane), y = up.
// All dimensions in meters.
//
// Granularity: 191 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-st-peters-basilica.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'st-peters-basilica');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~220 m) maps to 2.4 units.
const S = 2.4 / 220;

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
// Horizontal beam between two plan points (x1,z1) and (x2,z2),
// spanning y0..y1 with width w.
function hbeam(x1, z1, x2, z2, y0, y1, w) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(len, y1 - y0, w);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2);
  return g;
}
// Box rotated about Y so its local +x axis points along angle a,
// then translated.
function rbox(w, h, d, a, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(-a);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// === FACADE (system: facade) ===
// Facade front plane at z = 0, facing +z (east, toward the square).
addPart('facade-wall', 'Facade wall', 'facade', [
  box(-57, 57, 0, 51, -4, 0),
]);

// --- Giant order: eight giant columns across the 114 m front: 16 parts.
const FAC_COL_X = [-52.5, -38.5, -24.5, -10.5, 10.5, 24.5, 38.5, 52.5];
FAC_COL_X.forEach((x, i) => {
  const n = i + 1;
  addPart(`facade-column-${n}-shaft`, `Facade column ${n} shaft`, 'facade', [
    cyl(1.35, 1.55, 34, x, 17, 1.2, 14),
  ]);
  addPart(`facade-column-${n}-capital`, `Facade column ${n} capital`, 'facade', [
    box(x - 1.9, x + 1.9, 34, 37, -0.7, 3.1),
  ]);
});

addPart('facade-entablature', 'Facade entablature', 'facade', [
  box(-57.8, 57.8, 37, 41, -1, 1.8),
]);
addPart('facade-attic', 'Facade attic', 'facade', [
  box(-57, 57, 41, 51, -3, 0.5),
]);

// --- Thirteen attic statues, Christ the Redeemer at the center with
// St John the Baptist and eleven apostles, from the north (left) end.
const ATTIC_STATUES = [
  'St. Thadeus', 'St. Matthew', 'St. Philip', 'St. Thomas',
  'St. James the Greater', 'St. John the Baptist', 'Christ the Redeemer',
  'St. Andrew', 'St. John the Evangelist', 'St. James the Lesser',
  'St. Bartholomew', 'St. Simeon', 'St. Matthias',
];
ATTIC_STATUES.forEach((saint, i) => {
  const x = -52 + (i * 104) / 12;
  const body = box(x - 0.8, x + 0.8, 51, 55.9, -0.8, 0.8);
  const head = new THREE.SphereGeometry(0.5, 10, 8);
  head.translate(x, 56.3, 0);
  const id = `attic-statue-${i + 1}`;
  addPart(id, `Attic statue: ${saint}`, 'facade', [body, head]);
});

// --- Five portals. Verified: Holy Door northernmost, central bronze door
// by Filarete, Door of the Dead southern. Positions of the two middle
// doors are schematic.
const PORTALS = [
  { id: 'holy-door', name: 'Holy Door', x0: -46.5, x1: -41.5, y1: 12 },
  { id: 'door-of-good-and-evil', name: 'Door of Good and Evil', x0: -24, x1: -20, y1: 12 },
  { id: 'central-bronze-door', name: 'Central bronze door', x0: -3.5, x1: 3.5, y1: 14 },
  { id: 'door-of-the-sacraments', name: 'Door of the Sacraments', x0: 20, x1: 24, y1: 12 },
  { id: 'door-of-the-dead', name: 'Door of the Dead', x0: 41.5, x1: 46.5, y1: 12 },
];
for (const p of PORTALS) {
  addPart(p.id, p.name, 'facade', [
    box(p.x0, p.x1, 0, p.y1, -0.6, 0.15),
    box(p.x0 - 0.7, p.x1 + 0.7, p.y1, p.y1 + 0.9, -0.6, 0.15),
  ]);
}

// --- Two 5.55 m statues of Saints Peter and Paul on the steps.
for (const [id, name, x] of [
  ['statue-st-peter-steps', 'Statue of St. Peter (facade steps)', -7],
  ['statue-st-paul-steps', 'Statue of St. Paul (facade steps)', 7],
]) {
  const body = box(x - 0.7, x + 0.7, 0, 4.9, 5.3, 6.7);
  const head = new THREE.SphereGeometry(0.42, 10, 8);
  head.translate(x, 5.25, 6);
  const plinth = box(x - 1, x + 1, -0.5, 0, 5, 7);
  addPart(id, name, 'facade', [plinth, body, head]);
}

// --- Vestibule (narthex): 71 m wide, 13.5 m deep, 28 m high.
addPart('vestibule-floor', 'Vestibule floor', 'facade', [
  box(-35.5, 35.5, -0.5, 0, -17.5, -4),
]);
addPart('vestibule-ceiling', 'Vestibule ceiling', 'facade', [
  box(-35.5, 35.5, 27, 28, -17.5, -4),
]);
addPart('vestibule-north-end-wall', 'Vestibule north end wall', 'facade', [
  box(-35.5, -34.3, 0, 28, -17.5, -4),
]);
addPart('vestibule-south-end-wall', 'Vestibule south end wall', 'facade', [
  box(34.3, 35.5, 0, 28, -17.5, -4),
]);
for (let i = 1; i <= 4; i++) {
  const x = [-26, -9, 9, 26][i - 1];
  addPart(`vestibule-pilaster-${i}`, `Vestibule pilaster ${i}`, 'facade', [
    box(x - 1.1, x + 1.1, 0, 28, -17.4, -16.4),
  ]);
}

// === NAVE BODY (system: nave-body) ===
// Long nave in three bays, z from -17.5 to -135.
addPart('nave-north-wall', 'Nave north wall', 'nave-body', [
  box(-30, -14, 0, 32, -135, -17.5),
]);
addPart('nave-south-wall', 'Nave south wall', 'nave-body', [
  box(14, 30, 0, 32, -135, -17.5),
]);
{
  // Barrel vault: half-cylinder shell, top half, axis along z.
  const vault = new THREE.CylinderGeometry(16, 16, 117.5, 20, 1, true, Math.PI / 2, Math.PI);
  vault.rotateX(Math.PI / 2);
  vault.translate(0, 32, -76.25);
  addPart('nave-barrel-vault', 'Nave barrel vault', 'nave-body', [vault]);
}
addPart('north-aisle-block', 'North aisle block', 'nave-body', [
  box(-44, -30, 0, 26, -135, -17.5),
]);
addPart('south-aisle-block', 'South aisle block', 'nave-body', [
  box(30, 44, 0, 26, -135, -17.5),
]);
addPart('north-aisle-roof', 'North aisle roof', 'nave-body', [
  box(-44, -30, 26, 27.5, -135, -17.5),
]);
addPart('south-aisle-roof', 'South aisle roof', 'nave-body', [
  box(30, 44, 26, 27.5, -135, -17.5),
]);
addPart('nave-floor', 'Nave floor', 'nave-body', [
  box(-44, 44, -0.5, 0, -135, -17.5),
]);
addPart('crossing-floor', 'Crossing floor', 'nave-body', [
  box(-12, 12, -0.5, 0, -162, -138),
]);

// --- Four crossing piers, 73 m circumference each (18.25 m square,
// schematic cross section), at the corners of the crossing.
const PIERS = [
  { id: 'crossing-pier-1', name: 'Crossing pier 1 (north-east)', x0: -30.25, x1: -12, z0: -138, z1: -119.75 },
  { id: 'crossing-pier-2', name: 'Crossing pier 2 (south-east)', x0: 12, x1: 30.25, z0: -138, z1: -119.75 },
  { id: 'crossing-pier-3', name: 'Crossing pier 3 (south-west)', x0: 12, x1: 30.25, z0: -180.25, z1: -162 },
  { id: 'crossing-pier-4', name: 'Crossing pier 4 (north-west)', x0: -30.25, x1: -12, z0: -180.25, z1: -162 },
];
for (const p of PIERS) {
  addPart(p.id, p.name, 'nave-body', [box(p.x0, p.x1, 0, 46, p.z0, p.z1)]);
}

// --- The four colossal niche statues guarding the major relics.
function nicheFigure(x, z) {
  const body = box(x - 0.9, x + 0.9, 0, 4.4, z - 0.9, z + 0.9);
  const head = new THREE.SphereGeometry(0.45, 10, 8);
  head.translate(x, 4.85, z);
  return [body, head];
}
addPart('pier-statue-longinus', 'Pier statue: St. Longinus', 'nave-body', nicheFigure(-11, -137));
addPart('pier-statue-helena', 'Pier statue: St. Helena', 'nave-body', nicheFigure(-11, -163));
addPart('pier-statue-veronica', 'Pier statue: St. Veronica', 'nave-body', nicheFigure(11, -163));
addPart('pier-statue-andrew', 'Pier statue: St. Andrew', 'nave-body', nicheFigure(11, -137));

// === TRANSEPT AND APSE (system: transept-apse) ===
addPart('north-transept-arm', 'North transept arm', 'transept-apse', [
  box(-75, -30, 0, 40, -165, -135),
]);
addPart('south-transept-arm', 'South transept arm', 'transept-apse', [
  box(30, 75, 0, 40, -165, -135),
]);
addPart('north-transept-end-wall', 'North transept end wall', 'transept-apse', [
  box(-76, -75, 0, 44, -165, -135),
]);
addPart('south-transept-end-wall', 'South transept end wall', 'transept-apse', [
  box(75, 76, 0, 44, -165, -135),
]);
addPart('transept-roof', 'Transept roof', 'transept-apse', [
  box(-75, 75, 40, 41.5, -165, -135),
]);
addPart('transept-floor', 'Transept floor', 'transept-apse', [
  box(-75, 75, -0.5, 0, -165, -135),
]);
{
  // Apse: half-cylinder wall and semi-dome conch, center (0, -165).
  const wall = new THREE.CylinderGeometry(24, 24, 40, 24, 1, true, Math.PI / 2, Math.PI);
  wall.translate(0, 20, -165);
  addPart('apse-wall', 'Apse wall', 'transept-apse', [wall]);
  const conch = new THREE.SphereGeometry(24, 24, 12, Math.PI, Math.PI, 0, Math.PI / 2);
  conch.translate(0, 40, -165);
  addPart('apse-conch', 'Apse conch', 'transept-apse', [conch]);
  const floor = new THREE.CircleGeometry(24, 24, 0, Math.PI);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0.01, -165);
  addPart('apse-floor', 'Apse floor', 'transept-apse', [floor]);
}
addPart('choir-block', 'Choir block', 'transept-apse', [
  box(-25, 25, 0, 30, -218, -189),
]);

// === DOME (system: dome) ===
// Dome center at the crossing (0, -150).
const DCX = 0;
const DCZ = -150;
addPart('dome-plinth', 'Dome plinth', 'dome', [
  cyl(32, 33.5, 11.5, DCX, 47.25, DCZ, 32),
]);
addPart('dome-drum', 'Dome drum', 'dome', [
  cyl(30.24, 30.24, 20, DCX, 63, DCZ, 48),
]);
addPart('drum-cornice', 'Drum cornice', 'dome', [
  cyl(31.5, 31.5, 2, DCX, 74, DCZ, 48),
]);
{
  // Sixteen tall drum windows, merged into one part.
  const wins = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    wins.push(rbox(1.2, 12, 3.2, a, DCX + 29.9 * Math.cos(a), 63, DCZ + 29.9 * Math.sin(a)));
  }
  addPart('drum-windows', 'Drum windows', 'dome', wins);
}
for (let k = 0; k < 16; k++) {
  const a = (k * Math.PI) / 8 + Math.PI / 16;
  addPart(`dome-buttress-${k + 1}`, `Dome buttress ${k + 1}`, 'dome', [
    rbox(6, 11, 1.8, a, DCX + 29.5 * Math.cos(a), 78.5, DCZ + 29.5 * Math.sin(a)),
  ]);
}
{
  // Dome shell: lathe from (21, 73) to (3.2, 110.3).
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = 3.2 + (21 - 3.2) * Math.pow(1 - t, 1.6);
    profile.push(new THREE.Vector2(r, 73 + (110.3 - 73) * t));
  }
  const shell = new THREE.LatheGeometry(profile, 48);
  shell.translate(DCX, 0, DCZ);
  addPart('dome-shell', 'Dome shell', 'dome', [shell]);
}
for (let k = 0; k < 16; k++) {
  const a = (k * Math.PI) / 8;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = 3.2 + (21 - 3.2) * Math.pow(1 - t, 1.6) + 0.55;
    pts.push(new THREE.Vector3(DCX + r * Math.cos(a), 73 + (110.3 - 73) * t, DCZ + r * Math.sin(a)));
  }
  const rib = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.55, 6, false);
  addPart(`dome-rib-${k + 1}`, `Dome rib ${k + 1}`, 'dome', [rib]);
}
{
  // Lantern: 19 m high, drum plus cap.
  const drumL = cyl(3.2, 3.4, 15.7, DCX, 110.3 + 7.85, DCZ, 16);
  const cap = new THREE.SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(DCX, 126, DCZ);
  addPart('dome-lantern', 'Dome lantern', 'dome', [drumL, cap]);
}
{
  const ball = new THREE.SphereGeometry(1.2, 14, 10);
  ball.translate(DCX, 130.5, DCZ);
  addPart('dome-ball', 'Dome ball', 'dome', [ball]);
}
addPart('dome-cross', 'Dome cross', 'dome', [
  box(DCX - 0.25, DCX + 0.25, 131.7, 136.6, DCZ - 0.25, DCZ + 0.25),
  box(DCX - 1.1, DCX + 1.1, 134.2, 134.7, DCZ - 0.25, DCZ + 0.25),
]);

// === BALDACHIN (system: baldachin) ===
// Bernini's bronze canopy under the dome at the crossing (0, -150),
// 28.5 m high with four 11 m helical columns.
const BCX = 0;
const BCZ = -150;
const BALD_COL = [
  [-4.5, -4.5], [4.5, -4.5], [4.5, 4.5], [-4.5, 4.5],
];
BALD_COL.forEach(([cx, cz], i) => {
  const n = i + 1;
  addPart(`baldachin-pedestal-${n}`, `Baldachin pedestal ${n}`, 'baldachin', [
    box(BCX + cx - 1.4, BCX + cx + 1.4, 0, 3, BCZ + cz - 1.4, BCZ + cz + 1.4),
  ]);
  // Helical column approximated by stacked offset tori (schematic).
  const rings = [];
  for (let s = 0; s < 12; s++) {
    const t = new THREE.TorusGeometry(0.7, 0.3, 8, 14);
    t.rotateX(Math.PI / 2);
    t.translate(
      BCX + cx + 0.3 * Math.cos(s * 0.9),
      3 + (s + 0.5) * (11 / 12),
      BCZ + cz + 0.3 * Math.sin(s * 0.9),
    );
    rings.push(t);
  }
  addPart(`baldachin-spiral-column-${n}`, `Baldachin spiral column ${n}`, 'baldachin', rings);
});
addPart('baldachin-entablature', 'Baldachin entablature', 'baldachin', [
  box(BCX - 6, BCX + 6, 14, 16, BCZ - 6, BCZ + 6),
]);
BALD_COL.forEach(([cx, cz], i) => {
  const n = i + 1;
  addPart(`baldachin-volute-${n}`, `Baldachin volute ${n}`, 'baldachin', [
    strut([BCX + cx, 16, BCZ + cz], [BCX + cx * 0.3, 23, BCZ + cz * 0.3], 1.1),
  ]);
});
{
  const orb = new THREE.SphereGeometry(1.3, 14, 10);
  orb.translate(BCX, 24.3, BCZ);
  addPart('baldachin-orb', 'Baldachin orb', 'baldachin', [orb]);
}
addPart('baldachin-cross', 'Baldachin cross', 'baldachin', [
  box(BCX - 0.2, BCX + 0.2, 25.6, 28.5, BCZ - 0.2, BCZ + 0.2),
  box(BCX - 0.9, BCX + 0.9, 26.9, 27.3, BCZ - 0.2, BCZ + 0.2),
]);

// === COLONNADE (system: colonnade) ===
// Bernini's elliptical colonnade: ellipse center (0, 140), semi-axes
// 100 (x) by 70 (z). North arm covers 150 to 210 degrees, south arm
// -30 to 30 degrees. Each arm holds ten bays of four columns.
const COL_CX = 0;
const COL_CZ = 140;
const COL_A = 100;
const COL_B = 70;
function colPoint(thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  return [COL_CX + COL_A * Math.cos(t), COL_CZ + COL_B * Math.sin(t)];
}
function colDir(p) {
  const dx = p[0] - COL_CX;
  const dz = p[1] - COL_CZ;
  const l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
}
const ARMS = [
  { key: 'north', name: 'North', start: 150 },
  { key: 'south', name: 'South', start: -30 },
];
for (const arm of ARMS) {
  // Ten bays, four columns each: 20 parts.
  for (let i = 0; i < 10; i++) {
    const p = colPoint(arm.start + (i + 0.5) * 6);
    const d = colDir(p);
    const cols = [];
    for (const k of [-7.125, -2.375, 2.375, 7.125]) {
      cols.push(cyl(0.7, 0.85, 14, p[0] + d[0] * k, 7, p[1] + d[1] * k, 10));
    }
    addPart(`${arm.key}-arm-bay-${i + 1}-columns`, `${arm.name} arm bay ${i + 1} columns`, 'colonnade', cols);
  }
  // Entablature in three segments per arm: 6 parts.
  for (let j = 0; j < 3; j++) {
    const p0 = colPoint(arm.start + j * 20);
    const p1 = colPoint(arm.start + (j + 1) * 20);
    addPart(
      `${arm.key}-arm-entablature-${j + 1}`,
      `${arm.name} arm entablature ${j + 1}`,
      'colonnade',
      [hbeam(p0[0], p0[1], p1[0], p1[1], 14, 16.5, 19)],
    );
  }
  // Attic band per arm, built from six chord segments: 2 parts.
  {
    const segs = [];
    for (let j = 0; j < 6; j++) {
      const p0 = colPoint(arm.start + j * 10);
      const p1 = colPoint(arm.start + (j + 1) * 10);
      segs.push(hbeam(p0[0], p0[1], p1[0], p1[1], 16.5, 18.5, 19));
    }
    addPart(`${arm.key}-arm-attic`, `${arm.name} arm attic`, 'colonnade', segs);
  }
  // Six statues on the attic per arm: 12 parts.
  for (let m = 0; m < 6; m++) {
    const p = colPoint(arm.start + 5 + m * 10);
    const body = box(p[0] - 0.5, p[0] + 0.5, 18.5, 21, p[1] - 0.5, p[1] + 0.5);
    const head = new THREE.SphereGeometry(0.35, 8, 6);
    head.translate(p[0], 21.2, p[1]);
    addPart(`${arm.key}-arm-statue-${m + 1}`, `${arm.name} arm statue ${m + 1}`, 'colonnade', [body, head]);
  }
  // Pilaster rows, merged per arm: 2 parts.
  {
    const pils = [];
    for (let i = 0; i < 10; i++) {
      const p = colPoint(arm.start + (i + 0.5) * 6);
      const d = colDir(p);
      for (const k of [-9.5, 9.5]) {
        pils.push(box(
          p[0] + d[0] * k - 0.5, p[0] + d[0] * k + 0.5, 0, 14,
          p[1] + d[1] * k - 0.5, p[1] + d[1] * k + 0.5,
        ));
      }
    }
    addPart(`${arm.key}-arm-pilasters`, `${arm.name} arm pilasters`, 'colonnade', pils);
  }
}
// Straight corridors linking the facade to the arms: 4 parts.
for (const side of [-1, 1]) {
  const key = side < 0 ? 'north' : 'south';
  const Name = side < 0 ? 'North' : 'South';
  const x0 = side * 57;
  const x1 = side * 86.6;
  const cols = [];
  for (let i = 0; i < 8; i++) {
    const t = 0.06 + (i * 0.88) / 7;
    const px = x0 + (x1 - x0) * t;
    const pz = 5 + (105 - 5) * t;
    const dx = x1 - x0;
    const dz = 100;
    const l = Math.hypot(dx, dz);
    const nx = -dz / l;
    const nz = dx / l;
    for (const k of [-3.5, 3.5]) {
      cols.push(cyl(0.6, 0.75, 12, px + nx * k, 6, pz + nz * k, 8));
    }
  }
  addPart(`${key}-corridor-columns`, `${Name} corridor columns`, 'colonnade', cols);
  addPart(`${key}-corridor-entablature`, `${Name} corridor entablature`, 'colonnade', [
    hbeam(x0, 5, x1, 105, 12, 14, 14),
  ]);
}

// === SQUARE AND OBELISK (system: square-obelisk) ===
// Vatican obelisk at the center of the piazza (0, 140).
addPart('obelisk-pedestal', 'Obelisk pedestal', 'square-obelisk', [
  box(-3, 3, 0, 8, 137, 143),
]);
{
  const shaft = new THREE.CylinderGeometry(1.0, 1.5, 25.5, 4, 1);
  shaft.rotateY(Math.PI / 4);
  shaft.translate(0, 8 + 12.75, 140);
  const pyr = new THREE.ConeGeometry(1.05, 1.8, 4);
  pyr.rotateY(Math.PI / 4);
  pyr.translate(0, 33.5 + 0.9, 140);
  addPart('obelisk-shaft', 'Obelisk shaft', 'square-obelisk', [shaft, pyr]);
}
addPart('obelisk-cross', 'Obelisk cross', 'square-obelisk', [
  box(-0.2, 0.2, 35.3, 39.9, 139.8, 140.2),
  box(-1, 1, 37.2, 37.6, 139.8, 140.2),
]);
// Two fountains at the foci of the colonnade ellipse.
for (const side of [-1, 1]) {
  const key = side < 0 ? 'north' : 'south';
  const Name = side < 0 ? 'North' : 'South';
  const fx = side * 71.4;
  addPart(`${key}-fountain-basin`, `${Name} fountain basin`, 'square-obelisk', [
    cyl(6, 6.5, 1.5, fx, 0.75, 140, 20),
  ]);
  addPart(`${key}-fountain-upper-tier`, `${Name} fountain upper tier`, 'square-obelisk', [
    cyl(0.8, 1.2, 4.5, fx, 3.75, 140, 12),
    cyl(3, 3.2, 1, fx, 6.5, 140, 16),
  ]);
}
addPart('square-paving', 'Square paving', 'square-obelisk', [
  box(-120, 120, -0.5, 0, 0, 260),
]);
addPart('square-paving-edge', 'Square paving edge', 'square-obelisk', [
  box(-120, 120, 0, 0.5, 260, 261),
  box(-120, 120, 0, 0.5, -1, 0),
  box(-121, -120, 0, 0.5, 0, 260),
  box(120, 121, 0, 0.5, 0, 260),
]);

// === CHAPELS AND TOWERS (system: chapels-towers) ===
function chapelWithDome(id, name, x0, x1, z0, z1) {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const dome = new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.translate(cx, 20, cz);
  addPart(id, name, 'chapels-towers', [
    box(x0, x1, 0, 20, z0, z1),
    dome,
  ]);
}
chapelWithDome('gregorian-chapel', 'Gregorian Chapel', -56, -44, -90, -60);
chapelWithDome('choir-chapel', 'Choir Chapel', -56, -44, -125, -95);
chapelWithDome('blessed-sacrament-chapel', 'Chapel of the Blessed Sacrament', 44, 56, -90, -60);
chapelWithDome('clementine-chapel', 'Clementine Chapel', 44, 56, -125, -95);
for (const side of [-1, 1]) {
  const key = side < 0 ? 'north' : 'south';
  const Name = side < 0 ? 'North' : 'South';
  const tx = side * 60;
  const face = new THREE.CylinderGeometry(2, 2, 0.4, 20);
  face.rotateX(Math.PI / 2);
  face.translate(tx, 34, 1.2);
  addPart(`${key}-clock-tower`, `${Name} clock tower`, 'chapels-towers', [
    box(tx - 3, tx + 3, 0, 40, -5, 1),
    face,
  ]);
}
addPart('sacristy-block', 'Sacristy block', 'chapels-towers', [
  box(25, 50, 0, 18, -215, -185),
]);

// ---------------------------------------------------------------- colors
// Schematic travertine palette; the dome keeps its lead-gray tone and the
// baldachin its bronze.
function colorFor(id) {
  if (id.startsWith('baldachin-spiral-column-')) return '#8a6b3f';
  if (id === 'baldachin-entablature' || id === 'baldachin-orb' || id === 'baldachin-cross') return '#7d5f36';
  if (id.startsWith('baldachin-volute-') || id.startsWith('baldachin-pedestal-')) return '#6e6e6e';
  if (id === 'dome-shell' || id.startsWith('dome-rib-')) return '#aeb6ba';
  if (id === 'dome-lantern' || id === 'dome-ball') return '#9aa2a6';
  if (id === 'dome-cross' || id === 'obelisk-cross') return '#8a7a4a';
  if (id.startsWith('dome-buttress-')) return '#c4bba6';
  if (id === 'dome-drum' || id === 'drum-cornice' || id === 'dome-plinth' || id === 'drum-windows') return '#d5ccb8';
  if (id.startsWith('attic-statue-')) return '#c9c2b2';
  if (id === 'holy-door' || id === 'central-bronze-door' || id === 'door-of-the-dead') return '#5a4a33';
  if (id === 'door-of-good-and-evil' || id === 'door-of-the-sacraments') return '#6b5a40';
  if (id.startsWith('pier-statue-')) return '#cfc8b8';
  if (id.includes('fountain')) return '#b9c4c6';
  if (id === 'obelisk-shaft' || id === 'obelisk-pedestal') return '#c9bfa5';
  if (id === 'square-paving') return '#a8a094';
  if (id === 'square-paving-edge') return '#8f887c';
  if (id.includes('floor') || id.includes('paving')) return '#9a938a';
  if (id.includes('vault') || id.includes('conch')) return '#c9c0ab';
  return '#d8cfc0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facade', name: 'Facade and vestibule', color: '#d8cfc0', description: "Carlo Maderno's 51 m high, 114 m wide facade with its giant order of columns, five portals and thirteen attic statues, and the 71 m wide vestibule behind it." },
  { id: 'nave-body', name: 'Nave and crossing', color: '#d5ccb8', description: 'The long nave in three bays with its barrel vault, the side aisles, and the four great piers carrying the dome.' },
  { id: 'transept-apse', name: 'Transept and apse', color: '#d5ccb8', description: 'The 150 m wide transept arms and the semicircular apse with its semi-dome conch at the west end.' },
  { id: 'dome', name: 'Dome', color: '#aeb6ba', description: "Michelangelo's dome: the 190 m circumference drum, the 42 m shell with sixteen ribs, and the lantern, ball and cross rising to 136.6 m." },
  { id: 'baldachin', name: 'Baldachin', color: '#8a6b3f', description: "Bernini's 28.5 m bronze canopy over the high altar, with four 11 m helical columns." },
  { id: 'colonnade', name: 'Colonnade', color: '#d8cfc0', description: "Bernini's elliptical colonnade: two 93 m arms of 284 columns, 88 pilasters and 140 statues embracing St Peter's Square." },
  { id: 'square-obelisk', name: 'Square and obelisk', color: '#a8a094', description: "St Peter's Square with the Vatican obelisk, 25.5 m of shaft rising to 40 m with base and cross, and the two fountains." },
  { id: 'chapels-towers', name: 'Chapels and towers', color: '#d8cfc0', description: 'The chapels off the aisles, the two clock towers flanking the facade, and the sacristy block.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'facade wall': 'The facade wall itself, 51 m high and 114 m wide, carrying the giant order, the attic and its thirteen statues. Exact wall thickness is schematic.',
  'facade entablature': 'The entablature running across the facade above the giant columns. Exact profile is schematic.',
  'facade attic': 'The attic storey above the facade entablature, carrying the thirteen colossal statues. Exact height is schematic.',
  'holy door': 'The Holy Door, the northernmost of the five portals. By tradition it is walled up with bricks and opened only for holy years such as a Jubilee; the present bronze door was designed by Vico Consorti in 1950. Exact recess depth is schematic.',
  'door of good and evil': 'The Door of Good and Evil, one of the five portals from the vestibule into the basilica. Its exact position among the five doors is schematic.',
  'central bronze door': 'The central portal with the Renaissance bronze door by Antonio Averulino, called Filarete, made in 1455 for the old basilica and enlarged to fit the new space. Exact recess depth is schematic.',
  'door of the sacraments': 'The Door of the Sacraments, one of the five portals from the vestibule into the basilica. Its exact position among the five doors is schematic.',
  'door of the dead': 'The Door of the Dead, the southernmost of the five portals, designed by the 20th century sculptor Giacomo Manzu. Exact recess depth is schematic.',
  'statue of st. peter (facade steps)': 'One of two 5.55 m statues of the first-century apostles to Rome standing on the steps before the facade: St Peter, holding the keys. Exact pose is schematic.',
  'statue of st. paul (facade steps)': 'One of two 5.55 m statues of the first-century apostles to Rome standing on the steps before the facade: St Paul, with the sword. Exact pose is schematic.',
  'vestibule floor': 'The floor of the vestibule (narthex), the 71 m wide entrance hall stretching across the building behind the facade. Exact paving is schematic.',
  'vestibule ceiling': 'The ceiling of the 28 m high vestibule. Exact vaulting is schematic.',
  "vestibule north end wall": "The north end wall of the vestibule. At the north end of the real narthex stands Bernini's equestrian statue of Constantine (1670). Exact wall detail is schematic.",
  "vestibule south end wall": "The south end wall of the vestibule. At the south end of the real narthex stands Cornacchini's equestrian statue of Charlemagne. Exact wall detail is schematic.",
  'nave north wall': 'The north wall of the nave, rising to the springing of the barrel vault. The nave is built in three bays. Exact wall thickness is schematic.',
  'nave south wall': 'The south wall of the nave, rising to the springing of the barrel vault. Exact wall thickness is schematic.',
  'nave barrel vault': 'The barrel vault over the nave, the highest church vault of its kind; the nave interior rises 46.2 m. Exact vault profile is schematic.',
  'north aisle block': 'The north aisle block flanking the nave, with chapels opening off it. Exact aisle width is schematic.',
  'south aisle block': 'The south aisle block flanking the nave, with chapels opening off it. Exact aisle width is schematic.',
  'north aisle roof': 'The roof over the north aisle. Exact roof buildup is schematic.',
  'south aisle roof': 'The roof over the south aisle. Exact roof buildup is schematic.',
  'nave floor': 'The floor of the nave and aisles. Markers in the real nave floor show the comparative lengths of other churches. Exact paving is schematic.',
  'crossing floor': 'The floor of the crossing beneath the dome, above the tomb of St Peter. Exact paving is schematic.',
  'north transept arm': 'The north arm of the transept, giving the church its full 150 m width. Exact arm depth is schematic.',
  'south transept arm': 'The south arm of the transept, giving the church its full 150 m width. Exact arm depth is schematic.',
  'north transept end wall': 'The end wall closing the north transept arm. Exact wall detail is schematic.',
  'south transept end wall': 'The end wall closing the south transept arm. Exact wall detail is schematic.',
  'transept roof': 'The roof spanning the transept. Exact roof buildup is schematic.',
  'transept floor': 'The floor of the transept. Exact paving is schematic.',
  'apse wall': "The semicircular wall of the apse at the west end, holding Bernini's sculptural ensemble with the Chair of St Peter. Exact radius is schematic.",
  'apse conch': 'The semi-dome (conch) crowning the apse. Exact profile is schematic.',
  'apse floor': 'The floor of the apse. Exact paving is schematic.',
  'choir block': 'The block behind the apse closing the west end of the church, reaching the full 218 m exterior length. Exact internal arrangement is schematic.',
  "dome plinth": "The plinth spreading the dome's weight onto the crossing and the four piers. Exact profile is schematic.",
  'dome drum': 'The drum of the dome: 190 m in circumference, 20 m high, rising to 73 m from the ground, pierced by sixteen tall windows. Exact wall thickness is schematic.',
  'drum cornice': 'The cornice crowning the drum, from which the dome shell springs. Exact profile is schematic.',
  'drum windows': 'The sixteen tall windows piercing the drum, flooding the crossing with light. Exact window tracery is schematic.',
  'dome shell': 'The dome shell itself: 42.0 m in outer diameter and 41.5 m inner, a double shell in the real building. It holds the title of tallest dome in the world. Exact shell profile is schematic.',
  'dome lantern': 'The lantern crowning the dome, 19 m high, with its little dome and colonnettes. Exact subdivision is schematic.',
  'dome ball': 'The gilded ball atop the lantern, 2.4 m in diameter. Exact surface detail is schematic.',
  'dome cross': 'The cross crowning the ball, 4.9 m high; from the pavement to its top the basilica measures 136.6 m. Exact cross detail is schematic.',
  'baldachin entablature': 'The entablature carried by the four spiral columns, with the Barberini bees and festoons of the real canopy suggested. Exact ornament is schematic.',
  'baldachin orb': 'The orb carried on the volutes at the top of the baldachin. Exact detail is schematic.',
  'baldachin cross': 'The cross crowning the baldachin, bringing its total height to 28.5 m. Exact detail is schematic.',
  'north arm attic': 'The attic band running along the top of the north colonnade arm, carrying its statues. Exact profile is schematic.',
  'south arm attic': 'The attic band running along the top of the south colonnade arm, carrying its statues. Exact profile is schematic.',
  "north arm pilasters": "The north arm's pilasters, part of the 88 pilasters of the colonnade, merged here into one part. Exact count and positions are schematic.",
  "south arm pilasters": "The south arm's pilasters, part of the 88 pilasters of the colonnade, merged here into one part. Exact count and positions are schematic.",
  'north corridor columns': 'The columns of the straight north corridor linking the facade to the north arm. Exact column count is schematic.',
  'north corridor entablature': 'The entablature of the straight north corridor. Exact profile is schematic.',
  'south corridor columns': 'The columns of the straight south corridor linking the facade to the south arm. Exact column count is schematic.',
  'south corridor entablature': 'The entablature of the straight south corridor. Exact profile is schematic.',
  'obelisk pedestal': 'The pedestal of the Vatican obelisk, with its lions and inscriptions in the real monument. Exact pedestal form is schematic.',
  "obelisk shaft": "The shaft of the Vatican obelisk, 25.5 m of red granite, with its pyramidion. It stood in the Circus of Nero and is revered as a witness to Peter's death; Sixtus V had Domenico Fontana move it to the square in 1586. Exact taper is schematic.",
  'obelisk cross': 'The bronze cross crowning the obelisk, bringing its total height to 40 m with base and cross. Exact cross detail is schematic.',
  'north fountain basin': "The basin of the north fountain of St Peter's Square. Exact basin profile is schematic.",
  'north fountain upper tier': 'The upper tier of the north fountain, with its column and smaller basin. Exact form is schematic.',
  'south fountain basin': "The basin of the south fountain of St Peter's Square. Exact basin profile is schematic.",
  'south fountain upper tier': 'The upper tier of the south fountain, with its column and smaller basin. Exact form is schematic.',
  'square paving': "The paving of St Peter's Square, shown here schematically; the real square is 340 m long and 240 m wide. Exact extent and pattern are schematic.",
  'square paving edge': 'The curb edging the schematic square paving. Exact edging is schematic.',
  'gregorian chapel': 'The Gregorian Chapel, one of the chapels off the aisles, shown as an exterior mass. Exact volume and position are schematic.',
  'choir chapel': 'The Choir Chapel, one of the larger chapels off the south aisle, shown as an exterior mass. Exact volume and position are schematic.',
  'chapel of the blessed sacrament': "The Chapel of the Blessed Sacrament, the large chapel off the aisle with Bernini's tabernacle, shown as an exterior mass. Exact volume and position are schematic.",
  'clementine chapel': 'The Clementine Chapel, one of the chapels surrounding the dome, shown as an exterior mass. Exact volume and position are schematic.',
  'north clock tower': "The north tower flanking the facade, holding one of the two facade clocks; the clocks replaced Bernini's bell towers, which had to come down for lack of support. Exact tower form is schematic.",
  'south clock tower': 'The south tower flanking the facade, holding one of the two facade clocks. Exact tower form is schematic.',
  'sacristy block': 'The sacristy block behind the church. Exact footprint is schematic.',
};
for (let n = 1; n <= 8; n++) {
  explanations[`facade column ${n} shaft`] =
    `One of eight giant columns of the facade's giant order, standing before the 114 m wide front. Exact diameter and height are schematic.`;
  explanations[`facade column ${n} capital`] =
    `The capital of facade column ${n}, carrying the entablature. Exact profile is schematic.`;
}
const ATTIC_SAINT_NOTES = {
  'St. Thadeus': 'Thaddeus, apostle, at the north end of the attic row.',
  'St. Matthew': 'Matthew, apostle and evangelist.',
  'St. Philip': 'Philip, apostle.',
  'St. Thomas': 'Thomas, apostle.',
  'St. James the Greater': 'James the Greater, apostle.',
  'St. John the Baptist': 'John the Baptist, the forerunner, beside the central figure.',
  'Christ the Redeemer': 'Christ the Redeemer at the center of the thirteen, holding the cross; St Peter himself is absent from the row, his relics lying below in the basilica.',
  'St. Andrew': 'Andrew, apostle, beside the central figure.',
  'St. John the Evangelist': 'John the Evangelist, apostle.',
  'St. James the Lesser': 'James the Lesser, apostle.',
  'St. Bartholomew': 'Bartholomew, apostle.',
  'St. Simeon': 'Simeon, apostle, at the south end of the row.',
  'St. Matthias': 'Matthias, apostle, at the south end of the attic row.',
};
for (const [saint, note] of Object.entries(ATTIC_SAINT_NOTES)) {
  explanations[`attic statue: ${saint.toLowerCase()}`] =
    `One of the thirteen colossal attic statues: ${note} Exact figure and drapery are schematic.`;
}
for (let i = 1; i <= 4; i++) {
  explanations[`vestibule pilaster ${i}`] =
    `One of the 28 m tall internal pilasters of the vestibule. Exact count and positions are schematic.`;
}
const PIER_NOTES = {
  1: 'north-east',
  2: 'south-east',
  3: 'south-west',
  4: 'north-west',
};
for (let n = 1; n <= 4; n++) {
  explanations[`crossing pier ${n} (${PIER_NOTES[n]})`] =
    `One of the four gargantuan piers carrying the dome, 73 m in circumference, at the ${PIER_NOTES[n]} corner of the crossing. Its niche holds one of the four colossal statues guarding the major relics. Exact cross section is schematic.`;
}
Object.assign(explanations, {
  "pier statue: st. longinus": "St Longinus by Bernini (1639) in the north-east pier niche, holding the spear that pierced Christ's side; the Holy Lance is kept in the basilica. Exact pose is schematic.",
  'pier statue: st. helena': 'St Helena by Andrea Bolgi in the north-west pier niche, with the True Cross she found in Jerusalem. Exact pose is schematic.',
  'pier statue: st. veronica': "St Veronica by Francesco Mochi in the south-west pier niche, holding the veil with the image of Christ's face. Exact pose is schematic.",
  'pier statue: st. andrew': 'St Andrew by Francois Duquesnoy in the south-east pier niche, with the cross of his martyrdom. Exact pose is schematic.',
});
for (let k = 1; k <= 16; k++) {
  explanations[`dome buttress ${k}`] =
    `One of sixteen buttress fins carrying the thrust of the dome's sixteen ribs down into the drum. Exact shape is schematic.`;
  explanations[`dome rib ${k}`] =
    `One of the sixteen ribs of the dome, converging at the lantern. Exact cross section is schematic.`;
}
for (let n = 1; n <= 4; n++) {
  explanations[`baldachin pedestal ${n}`] =
    `One of the four marble pedestals of the baldachin, with the Barberini arms of Urban VIII in the real monument. Exact carving is schematic.`;
  explanations[`baldachin spiral column ${n}`] =
    `One of the four 11 m helical bronze columns of the baldachin, cast by Bernini's workshop; the twist is approximated here by stacked offset rings. Exact fluting and ornament are schematic.`;
  explanations[`baldachin volute ${n}`] =
    `One of the four great volutes rising from the entablature to carry the orb and cross. Exact curve is schematic.`;
}
for (const arm of ['north', 'south']) {
  const Arm = arm[0].toUpperCase() + arm.slice(1);
  for (let i = 1; i <= 10; i++) {
    explanations[`${arm} arm bay ${i} columns`] =
      `Four columns of the ${arm} colonnade arm, part of the 284 columns of Bernini's colonnade. The arms curve like embracing arms to welcome the faithful. Exact column count per bay is schematic.`;
  }
  for (let j = 1; j <= 3; j++) {
    explanations[`${arm} arm entablature ${j}`] =
      `One of three entablature segments over the ${arm} arm, shown as straight chords of the curve. Exact segmentation is schematic.`;
  }
  for (let m = 1; m <= 6; m++) {
    explanations[`${arm} arm statue ${m}`] =
      `One of the statues crowning the ${arm} arm, part of the 140 statues of saints above the colonnade. Exact figure is schematic.`;
  }
}

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
const binName = 'st-peters-basilica-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the st-peters-basilica directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: "St Peter's Basilica, Vatican City",
  title: "St Peter's Basilica",
  location: 'Vatican City',
  blurb: "The Papal Basilica of Saint Peter in the Vatican: 220 m long, with Michelangelo's 136.6 m dome, Maderno's 114 m facade, Bernini's bronze baldachin and his embracing colonnade around St Peter's Square.",
  sourceUrls: [
    { label: "Wikipedia: St. Peter's Basilica", url: "https://en.wikipedia.org/wiki/St._Peter%27s_Basilica" },
    { label: 'Opus Dei: 400 Years of the Basilica of Saint Peter', url: 'https://opusdei.org/en-za/article/basilica-saint-peter-four-hundredth-anniversary/pdf/' },
    { label: "Bluffton: St. Peter's Basilica and Its Art", url: "https://www.bluffton.edu/courses/humanities/art/brq/c-ref/speter's.htm" },
    { label: "RIBA: St Peter's Basilica plan and aerial perspective", url: "https://www.ribapix.com/st-peters-basilica-rome-plan-and-aerial-perspective_riba100939" },
    { label: "On This Day: St. Peter's Basilica", url: "https://onthisday.com/photos/st-peters-basilica" },
    { label: 'Wikipedia: Saint Longinus (Bernini)', url: 'https://en.wikipedia.org/wiki/Saint_Longinus_(Bernini)' },
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
  chunks: [{ url: '/models/st-peters-basilica/st-peters-basilica-0.bin', bytes: offset }],
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
