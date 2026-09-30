// Procedural Sagrada Familia for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Sagrada Familia in code and
// writes it in the atlas binary format:
//   public/models/sagrada-familia/atlas.json
//   public/models/sagrada-familia/sagrada-familia-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/sagrada-familia-attribution.md,
// opened 2026-09-30):
//   90 m long, 60 m wide, nave 45 m wide; Latin cross plan with five aisles;
//   capacity 9,000; 7.5 m planning module (90 = 7.5x12, 60 = 7.5x8);
//   vault heights: central nave 45 m, side aisles 30 m, transept 60 m,
//   apse hyperboloid 75 m, choir 15 m; 18 spires planned: 12 apostles at
//   100 m (Nativity: Barnabas, Simon, Thaddeus, Matthias; Passion: James
//   the Less, Bartholomew, Thomas, Philip; Glory: Andrew, Peter, Paul,
//   James the Greater), 4 evangelists at 135 m (ox Luke, angel Matthew,
//   lion Mark, eagle John), Virgin Mary 138 m (twelve-pointed crown and
//   morning star, inaugurated December 2021), Jesus Christ 172.5 m
//   (tallest church in the world, exterior completed 20 February 2026,
//   inauguration 10 June 2026, centenary of Gaudi's death); Jesus tower of
//   12 intersecting paraboloids, Mary of 14, evangelists of 8; tensioned
//   stone panels; tower base diameters about 18 m; cross 17 m tall and
//   13.5 m wide, built in Germany in 2025; inscription "Tu solus Sanctus,
//   tu solus Dominus, tu solus Altissimus" on a 29 m pinnacle element;
//   tower rests on four monumental porphyry columns at the crossing,
//   evangelists connected by bridges, Mary linked internally; as of 2026
//   14 of 18 spires stand, the 4 Glory apostle spires remain;
//   branching tree-like columns, no flying buttresses; heavy columns of
//   porphyry and basalt, lighter of granite and Montjuic sandstone;
//   crossing great hyperboloid ringed by two rings of twelve hyperboloids;
//   gaps in the apse floor open to the crypt; Nativity Facade (northeast,
//   sunrise) with portals of Charity (center), Hope (right), Faith (left);
//   Passion Facade (southwest, sunset) with six inward-slanting bone-like
//   columns, three bronze portals, magic square summing to 33, sculptures
//   by Subirachs, finished 1989; Glory Facade (south, Carrer de Mallorca,
//   faces the sea) under construction with great narthex, seven bronze
//   doors for the seven corporal works of mercy, street-side tower halves
//   starting about 30 m up on eight columns for the eight beatitudes;
//   cloister layout original in Christian architecture, surrounding the
//   church; Chapel of the Assumption in the apse cloister section; apse
//   with seven chapels and ambulatory; apostle statues at about one third
//   of tower height with names embossed; colorful Venetian mosaic
//   pinnacles; tubular bells to be installed last; consecrated 7 November
//   2010 by Benedict XVI; UNESCO World Heritage (Nativity Facade and crypt
//   1984, extension 2005); funded entirely by private donations.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement and facade orientations; per-spire shaft profiles and pinnacle
// shapes; evangelist symbol sculptures; column positions beyond the 7.5 m
// grid idea; branch crown geometry; vault profiles and thicknesses;
// stained glass bay divisions; crypt layout; bronze door panel divisions;
// Glory Facade modeled as designed while under construction.
//
// Granularity: 134 named parts across 12 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-sagrada-familia.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sagrada-familia');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (172.5 m) maps to 2.4 units.
const S = 2.4 / 172.5;

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
// Paraboloid spire shaft via lathe: base radius rb at y0 tapering to rt at y1.
function spireShaft(x, z, y0, y1, rb, rt, seg = 14) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector2(rt + (rb - rt) * Math.pow(1 - t, 1.6), y0 + (y1 - y0) * t));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(x, 0, z);
  return g;
}
// Barrel vault with axis along Z, opening downward, apex at springY + r.
function vaultZ(r, len, cx, springY, cz) {
  const g = new THREE.CylinderGeometry(r, r, len, 20, 1, true, 0, Math.PI);
  g.rotateX(Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.translate(cx, springY, cz);
  return g;
}
// Barrel vault with axis along X, opening downward, apex at springY + r.
function vaultX(r, len, cx, springY, cz) {
  const g = new THREE.CylinderGeometry(r, r, len, 20, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  g.translate(cx, springY, cz);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Apostle spires: 12 spires at 100 m, one per apostle (sourced names and
// heights). Each becomes a shaft and a mosaic pinnacle: 24 parts.
const MOSAIC = ['#c0392b', '#2471a3', '#b7950b', '#1e8449', '#8e44ad', '#ca6f1e'];
const APOSTLES = [
  { name: 'Barnabas', facade: 'nativity', x: 28, z: 13 },
  { name: 'Simon', facade: 'nativity', x: 28, z: 19 },
  { name: 'Thaddeus', facade: 'nativity', x: 28, z: 25 },
  { name: 'Matthias', facade: 'nativity', x: 28, z: 31 },
  { name: 'James the Less', facade: 'passion', x: -28, z: 13 },
  { name: 'Bartholomew', facade: 'passion', x: -28, z: 19 },
  { name: 'Thomas', facade: 'passion', x: -28, z: 25 },
  { name: 'Philip', facade: 'passion', x: -28, z: 31 },
  { name: 'Andrew', facade: 'glory', x: -22.5, z: -48 },
  { name: 'Peter', facade: 'glory', x: -7.5, z: -48 },
  { name: 'Paul', facade: 'glory', x: 7.5, z: -48 },
  { name: 'James the Greater', facade: 'glory', x: 22.5, z: -48 },
];
APOSTLES.forEach((a, i) => {
  // Glory spires rise from about 30 m on the street side; the others from
  // the facade base (sourced Glory arrangement, schematic bases).
  const y0 = a.facade === 'glory' ? 30 : 12;
  const id = `apostle-${a.name.toLowerCase().replace(/ /g, '-')}`;
  addPart(`${id}-shaft`, `${a.name} spire shaft`, 'spires-apostles', [
    spireShaft(a.x, a.z, y0, 100, 4.5, 1.1),
  ]);
  const color = MOSAIC[i % MOSAIC.length];
  const cone = new THREE.ConeGeometry(2.0, 7, 12);
  cone.translate(a.x, 103.5, a.z);
  const tip = new THREE.SphereGeometry(0.9, 10, 8);
  tip.translate(a.x, 107.6, a.z);
  addPart(`${id}-pinnacle`, `${a.name} spire pinnacle`, 'spires-apostles', [cone, tip]);
});

// --- Evangelist spires: 4 spires at 135 m, each with shaft, symbol and
// pinnacle (sourced heights and symbols): 12 parts.
const EVANGELISTS = [
  { name: 'Matthew', symbol: 'angel', x: 13, z: 35.5 },
  { name: 'Mark', symbol: 'lion', x: -13, z: 35.5 },
  { name: 'Luke', symbol: 'ox', x: 13, z: 9.5 },
  { name: 'John', symbol: 'eagle', x: -13, z: 9.5 },
];
function evangelistSymbol(kind, x, y, z) {
  const g = [];
  if (kind === 'angel') {
    const body = new THREE.ConeGeometry(1.6, 5, 8);
    body.translate(x, y + 2.5, z);
    const w1 = box(x - 4.4, x - 0.8, y + 3, y + 5.4, z - 0.7, z + 0.7);
    const w2 = box(x + 0.8, x + 4.4, y + 3, y + 5.4, z - 0.7, z + 0.7);
    g.push(body, w1, w2);
  } else if (kind === 'lion') {
    const body = box(x - 2.6, x + 2.6, y, y + 2.6, z - 1.3, z + 1.3);
    const head = new THREE.SphereGeometry(1.7, 10, 8);
    head.translate(x + 3.4, y + 2.2, z);
    g.push(body, head);
  } else if (kind === 'ox') {
    const body = new THREE.CylinderGeometry(1.5, 1.5, 5.4, 10);
    body.rotateZ(Math.PI / 2);
    body.translate(x, y + 1.6, z);
    const h1 = new THREE.ConeGeometry(0.5, 2.6, 8);
    h1.rotateZ(0.7);
    h1.translate(x + 3.4, y + 3.4, z);
    const h2 = new THREE.ConeGeometry(0.5, 2.6, 8);
    h2.rotateZ(-0.7);
    h2.translate(x - 3.4, y + 3.4, z);
    g.push(body, h1, h2);
  } else {
    const body = new THREE.ConeGeometry(1.5, 4.6, 8);
    body.scale(1, 1, 0.55);
    body.translate(x, y + 2.3, z);
    const w1 = box(x - 4.6, x - 0.6, y + 2.6, y + 3.6, z - 1.4, z + 1.4);
    const w2 = box(x + 0.6, x + 4.6, y + 2.6, y + 3.6, z - 1.4, z + 1.4);
    g.push(body, w1, w2);
  }
  return g;
}
for (const e of EVANGELISTS) {
  const id = `evangelist-${e.name.toLowerCase()}`;
  addPart(`${id}-shaft`, `${e.name} spire shaft`, 'spires-evangelists', [
    spireShaft(e.x, e.z, 55, 135, 5, 1.5),
  ]);
  addPart(`${id}-symbol`, `${e.name} symbol (${e.symbol})`, 'spires-evangelists',
    evangelistSymbol(e.symbol, e.x, 128, e.z));
  const pin = new THREE.ConeGeometry(1.8, 5, 10);
  pin.translate(e.x, 137.5, e.z);
  addPart(`${id}-pinnacle`, `${e.name} spire pinnacle`, 'spires-evangelists', [pin]);
}

// --- Central spires: Jesus (172.5 m) and Mary (138 m) with bridges: 7 parts.
addPart('jesus-shaft', 'Jesus Christ spire shaft', 'spires-central', [
  spireShaft(0, 22.5, 60, 142.5, 9, 3, 20),
]);
{
  const drum = cyl(3.4, 3.4, 13.5, 0, 149.25, 22.5, 20);
  const band = new THREE.TorusGeometry(3.5, 0.45, 8, 24);
  band.rotateX(Math.PI / 2);
  band.translate(0, 152, 22.5);
  addPart('jesus-inscription-drum', 'Jesus spire inscription drum', 'spires-central', [drum, band]);
}
{
  const beam = box(-0.8, 0.8, 155.5, 172.5, 21.7, 23.3);
  const arm1 = box(-4, 4, 163, 164.2, 21.9, 23.1);
  const arm2 = box(-3, 3, 168.5, 169.5, 22, 23);
  addPart('jesus-cross', 'Jesus spire four-armed cross', 'spires-central', [beam, arm1, arm2]);
}
addPart('mary-shaft', 'Virgin Mary spire shaft', 'spires-central', [
  spireShaft(0, 38, 60, 138, 7, 2.5, 18),
]);
{
  const crown = new THREE.CylinderGeometry(4.2, 4.2, 3, 12);
  crown.translate(0, 139.5, 38);
  addPart('mary-crown', 'Virgin Mary twelve-pointed crown', 'spires-central', [crown]);
}
{
  const star = new THREE.OctahedronGeometry(2);
  star.scale(1, 1.6, 1);
  star.translate(0, 144, 38);
  addPart('mary-star', 'Virgin Mary morning star', 'spires-central', [star]);
}
{
  const bridges = [];
  for (const e of EVANGELISTS) {
    bridges.push(box(Math.min(0, e.x) - 1, Math.max(0, e.x) + 1, 118, 120, 21.5, 23.5));
  }
  addPart('jesus-bridges', 'Jesus spire bridges', 'spires-central', bridges);
}

// --- Nativity Facade (east, sunrise, built under Gaudi): 7 parts.
{
  const wall = box(28, 31, 0, 35, 8, 37);
  addPart('nativity-wall', 'Nativity Facade wall', 'facade-nativity', [wall]);
  const portals = [
    { name: 'Charity', z: 22.5 },
    { name: 'Hope', z: 28.5 },
    { name: 'Faith', z: 16.5 },
  ];
  for (const p of portals) {
    const frame = box(29.2, 31.6, 0, 14, p.z - 3.2, p.z + 3.2);
    const arch = new THREE.CylinderGeometry(3.2, 3.2, 2.4, 14, 1, false, 0, Math.PI);
    arch.rotateZ(Math.PI / 2);
    arch.rotateY(Math.PI / 2);
    arch.translate(30.4, 14, p.z);
    const door = box(30.6, 31.2, 0, 11, p.z - 2.4, p.z + 2.4);
    addPart(`nativity-portal-${p.name.toLowerCase()}`, `Nativity ${p.name} portal`, 'facade-nativity', [frame, arch, door]);
  }
  const trunk = cyl(0.8, 1.2, 10, 30.5, 40, 22.5, 10);
  const fol1 = new THREE.SphereGeometry(3, 10, 8); fol1.translate(30.5, 47, 22.5);
  const fol2 = new THREE.SphereGeometry(2.2, 10, 8); fol2.translate(28.5, 44.5, 20.5);
  const fol3 = new THREE.SphereGeometry(2.2, 10, 8); fol3.translate(32.5, 44.5, 24.5);
  addPart('nativity-tree-of-life', 'Nativity Tree of Life', 'facade-nativity', [trunk, fol1, fol2, fol3]);
  const roseRing = new THREE.TorusGeometry(4, 0.5, 8, 24);
  roseRing.rotateY(Math.PI / 2);
  roseRing.translate(31.2, 28, 22.5);
  const roseDisc = new THREE.CylinderGeometry(3.8, 3.8, 0.6, 20);
  roseDisc.rotateZ(Math.PI / 2);
  roseDisc.translate(30.9, 28, 22.5);
  addPart('nativity-rose-window', 'Nativity rose window', 'facade-nativity', [roseRing, roseDisc]);
  const t1 = cyl(2.5, 3, 40, 29, 20, 10, 12);
  const t2 = cyl(2.5, 3, 40, 29, 20, 35, 12);
  addPart('nativity-stair-turrets', 'Nativity flanking stair turrets', 'facade-nativity', [t1, t2]);
}

// --- Passion Facade (west, sunset, Subirachs, finished 1989): 12 parts.
{
  const zs = [13, 17.4, 21.8, 26.2, 30.6, 35];
  zs.forEach((z, i) => {
    addPart(`passion-column-${i + 1}`, `Passion inclined column ${i + 1}`, 'facade-passion', [
      strut([-34, 0, z], [-29.5, 30, z], 2.2),
    ]);
  });
  const portals = [
    { name: 'Faith', z: 16 },
    { name: 'Charity', z: 22.5 },
    { name: 'Hope', z: 29 },
  ];
  for (const p of portals) {
    const door = box(-31.5, -29.5, 0, 12, p.z - 2.5, p.z + 2.5);
    addPart(`passion-portal-${p.name.toLowerCase()}`, `Passion ${p.name} bronze portal`, 'facade-passion', [door]);
  }
  addPart('passion-pediment', 'Passion Facade pediment', 'facade-passion', [
    box(-32, -28, 30, 42, 10, 35),
  ]);
  addPart('passion-magic-square', 'Passion magic square panel', 'facade-passion', [
    box(-28.2, -27.9, 32, 38, 20, 25),
  ]);
  const t1 = box(-31.5, -28.5, 42, 46, 14, 18);
  const t2 = box(-31, -29, 42, 49, 24, 28);
  addPart('passion-tomb-group', 'Passion tomb sculpture group', 'facade-passion', [t1, t2]);
}

// --- Glory Facade (south, main entrance, under construction, modeled as
// designed): 12 parts.
{
  addPart('glory-narthex', 'Glory Facade narthex', 'facade-glory', [
    box(-30, 30, 0, 30, -52.5, -50),
  ]);
  for (let i = 0; i < 7; i++) {
    const x = -21 + i * 7;
    addPart(`glory-door-${i + 1}`, `Glory bronze door ${i + 1}`, 'facade-glory', [
      box(x - 2, x + 2, 0, 10, -53, -52.4),
    ]);
  }
  const xs = [-24.5, -17.5, -10.5, -3.5, 3.5, 10.5, 17.5, 24.5];
  for (let p = 0; p < 4; p++) {
    const c1 = cyl(1.5, 1.8, 30, xs[2 * p], 15, -56, 10);
    const c2 = cyl(1.5, 1.8, 30, xs[2 * p + 1], 15, -56, 10);
    addPart(`glory-beatitude-columns-${p + 1}`, `Glory Beatitude columns pair ${p + 1}`, 'facade-glory', [c1, c2]);
  }
}

// --- Nave columns: branching tree columns on the 7.5 m grid, four
// monumental porphyry crossing columns (sourced): 28 parts.
{
  const mainZ = [-33.75, -18.75, -3.75, 11.25];
  for (const sx of [-7.5, 7.5]) {
    mainZ.forEach((z, i) => {
      const row = sx < 0 ? 'west' : 'east';
      const shaft = cyl(1.2, 1.7, 32, sx, 16, z, 10);
      addPart(`nave-column-${row}-${i + 1}-shaft`, `Nave ${row} column ${i + 1} shaft`, 'nave', [shaft]);
      const crown = [];
      for (let b = 0; b < 6; b++) {
        const a = (b / 6) * Math.PI * 2;
        crown.push(strut(
          [sx, 30, z],
          [sx + Math.cos(a) * 5.5, 44, z + Math.sin(a) * 5.5],
          0.8,
        ));
      }
      addPart(`nave-column-${row}-${i + 1}-crown`, `Nave ${row} column ${i + 1} branch crown`, 'nave', crown);
    });
  }
  for (const sx of [-15, 15]) {
    mainZ.forEach((z, i) => {
      const row = sx < 0 ? 'west' : 'east';
      addPart(`aisle-column-${row}-${i + 1}`, `Side aisle ${row} column ${i + 1}`, 'nave', [
        cyl(1.1, 1.4, 30, sx, 15, z, 10),
      ]);
    });
  }
  const cross = [[7.5, 15], [7.5, 30], [-7.5, 15], [-7.5, 30]];
  cross.forEach(([x, z], i) => {
    addPart(`crossing-porphyry-column-${i + 1}`, `Crossing porphyry column ${i + 1}`, 'nave', [
      cyl(2, 2.4, 60, x, 30, z, 12),
    ]);
  });
}

// --- Vaults and roofs (sourced heights): 7 parts.
addPart('vault-nave', 'Central nave vault', 'vaults', [vaultZ(7.5, 60, 0, 37.5, -15)]);
addPart('vault-aisle-west', 'West side aisle vault', 'vaults', [vaultZ(7.5, 60, -15, 22.5, -15)]);
addPart('vault-aisle-east', 'East side aisle vault', 'vaults', [vaultZ(7.5, 60, 15, 22.5, -15)]);
addPart('nave-wall-west', 'Nave west wall', 'nave', [box(-22.9, -22.3, 0, 32, -45, 15)]);
addPart('nave-wall-east', 'Nave east wall', 'nave', [box(22.3, 22.9, 0, 32, -45, 15)]);
addPart('vault-transept', 'Transept vault', 'vaults', [vaultX(11.25, 60, 0, 48.75, 22.5)]);
{
  const great = new THREE.CylinderGeometry(12, 8, 15, 24, 1, true);
  great.translate(0, 67.5, 22.5);
  addPart('crossing-hyperboloid', 'Crossing great hyperboloid', 'vaults', [great]);
}
{
  const inner = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const c = new THREE.ConeGeometry(1.5, 6, 8);
    c.translate(Math.cos(a) * 10, 75, 22.5 + Math.sin(a) * 10);
    inner.push(c);
  }
  addPart('crossing-hyperboloid-ring-inner', 'Crossing inner hyperboloid ring', 'vaults', inner);
  const outer = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const c = new THREE.ConeGeometry(1.5, 6, 8);
    c.translate(Math.cos(a) * 13, 69, 22.5 + Math.sin(a) * 13);
    outer.push(c);
  }
  addPart('crossing-hyperboloid-ring-outer', 'Crossing outer hyperboloid ring', 'vaults', outer);
}

// --- Apse (seven chapels, ambulatory, 75 m hyperboloid vault): 10 parts.
{
  const wall = new THREE.CylinderGeometry(15, 15, 40, 24, 1, true, -Math.PI / 2, Math.PI);
  wall.translate(0, 20, 30);
  addPart('apse-wall', 'Apse outer wall', 'apse', [wall]);
  for (let i = 0; i < 7; i++) {
    const a = (-60 + i * 20) * Math.PI / 180;
    const g = box(-2.5, 2.5, 0, 12, -2, 2);
    g.rotateY(-a);
    g.translate(Math.sin(a) * 17, 0, 30 + Math.cos(a) * 17);
    addPart(`apse-chapel-${i + 1}`, `Apse chapel ${i + 1}`, 'apse', [g]);
  }
  const amb = new THREE.CylinderGeometry(10, 10, 8, 24, 1, true, -Math.PI / 2, Math.PI);
  amb.translate(0, 4, 30);
  addPart('apse-ambulatory', 'Apse ambulatory', 'apse', [amb]);
  const vault = new THREE.CylinderGeometry(2, 12, 35, 24, 1, true);
  vault.translate(0, 57.5, 30);
  addPart('apse-vault', 'Apse hyperboloid vault', 'apse', [vault]);
}

// --- Cloister (original layout surrounding the church): 5 parts.
addPart('cloister-north', 'Cloister north gallery', 'cloister', [box(-38, 38, 0, 8, 46, 52)]);
addPart('cloister-south', 'Cloister south gallery', 'cloister', [box(-38, 38, 0, 8, -62, -56)]);
addPart('cloister-east', 'Cloister east gallery', 'cloister', [box(32, 38, 0, 8, -56, 46)]);
addPart('cloister-west', 'Cloister west gallery', 'cloister', [box(-38, -32, 0, 8, -56, 46)]);
addPart('cloister-assumption-chapel', 'Chapel of the Assumption', 'cloister', [box(-8, 8, 0, 14, 46, 54)]);

// --- Crypt (del Villar foundations, gaps in the apse floor open to it): 3.
addPart('crypt-slab', 'Crypt floor slab', 'crypt', [box(-30, 30, -6, -5, -45, 45)]);
{
  const v = new THREE.CylinderGeometry(7, 7, 40, 16, 1, true, 0, Math.PI);
  v.rotateX(Math.PI / 2);
  v.rotateZ(Math.PI / 2);
  v.translate(0, -12, 0);
  addPart('crypt-vault', 'Crypt barrel vault', 'crypt', [v]);
}
{
  const w1 = box(-30, 30, -6, 0, -46, -45);
  const w2 = box(-30, 30, -6, 0, 45, 46);
  const w3 = box(-31, -30, -6, 0, -45, 45);
  const w4 = box(30, 31, -6, 0, -45, 45);
  addPart('crypt-foundation-walls', 'Crypt foundation walls', 'crypt', [w1, w2, w3, w4]);
}

// --- Stained glass (sourced: extensive stained glass): 5 parts.
addPart('glass-clerestory-north', 'North clerestory glass', 'glass', [box(22.4, 22.6, 32, 42, -45, 15)]);
addPart('glass-clerestory-south', 'South clerestory glass', 'glass', [box(-22.6, -22.4, 32, 42, -45, 15)]);
{
  const g = new THREE.CylinderGeometry(14.8, 14.8, 12, 24, 1, true, -Math.PI / 2, Math.PI);
  g.translate(0, 26, 30);
  addPart('glass-apse', 'Apse stained glass', 'glass', [g]);
}
addPart('glass-transept-east', 'East transept window', 'glass', [box(29.8, 30.2, 35, 50, 15, 30)]);
addPart('glass-transept-west', 'West transept window', 'glass', [box(-30.2, -29.8, 35, 50, 15, 30)]);

// ---------------------------------------------------------------- colors
const APOSTLE_COLOR = {};
APOSTLES.forEach((a, i) => { APOSTLE_COLOR[a.name.toLowerCase()] = MOSAIC[i % MOSAIC.length]; });
function colorFor(id) {
  if (id.startsWith('apostle-')) {
    if (id.endsWith('-pinnacle')) {
      const key = id.slice(8, -9).replace(/-/g, ' ');
      return APOSTLE_COLOR[key] || '#c0392b';
    }
    return '#d9cfbb';
  }
  if (id.startsWith('evangelist-')) {
    if (id.includes('-symbol')) return '#c9a227';
    return '#d9cfbb';
  }
  if (id === 'jesus-shaft' || id === 'mary-shaft') return '#e6ddc9';
  if (id === 'jesus-inscription-drum') return '#efe9d8';
  if (id === 'jesus-cross' || id === 'mary-star') return '#f5f2e8';
  if (id === 'mary-crown') return '#c9a227';
  if (id === 'jesus-bridges') return '#d9cfbb';
  if (id.startsWith('nativity-portal-')) return '#4a3728';
  if (id === 'nativity-tree-of-life') return '#2f6b3a';
  if (id === 'nativity-rose-window') return '#2f5f8f';
  if (id.startsWith('nativity-')) return '#e0d3b8';
  if (id.startsWith('passion-portal-')) return '#4a3728';
  if (id === 'passion-magic-square') return '#2b2b2b';
  if (id.startsWith('passion-')) return '#c9c4b8';
  if (id.startsWith('glory-door-')) return '#4a3728';
  if (id.startsWith('glory-')) return '#d9cfbb';
  if (id.startsWith('nave-wall-')) return '#d9cfbb';
  if (id.startsWith('nave-column-west')) return '#9aa0a3';
  if (id.startsWith('nave-column-east')) return '#d9cfbb';
  if (id.startsWith('aisle-column-')) return '#3f4448';
  if (id.startsWith('crossing-porphyry-column-')) return '#6b3a34';
  if (id.startsWith('vault-') || id.startsWith('crossing-hyperboloid')) return '#e8e2d4';
  if (id === 'apse-ambulatory') return '#8a8478';
  if (id.startsWith('apse-')) return '#d9cfbb';
  if (id.startsWith('cloister-')) return '#d9cfbb';
  if (id.startsWith('crypt-')) return '#6e6a60';
  if (id === 'glass-clerestory-north') return '#2f5f8f';
  if (id === 'glass-clerestory-south') return '#8f2f2f';
  if (id === 'glass-apse') return '#2f6b3a';
  if (id === 'glass-transept-east') return '#c98a2f';
  return '#2f5f8f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'spires-apostles', name: 'Apostle towers', color: '#d9cfbb', description: 'Twelve spires, one per apostle, each rising 100 m, with four on each facade.' },
  { id: 'spires-evangelists', name: 'Evangelist towers', color: '#d9cfbb', description: 'Four spires at 135 m around the crossing, each crowned by its evangelist symbol.' },
  { id: 'spires-central', name: 'Jesus and Mary towers', color: '#e6ddc9', description: 'The 172.5 m Tower of Jesus Christ and the 138 m Tower of the Virgin Mary.' },
  { id: 'facade-nativity', name: 'Nativity Facade', color: '#e0d3b8', description: 'The sunrise facade on the northeast, built under Gaudi, celebrating the birth of Christ.' },
  { id: 'facade-passion', name: 'Passion Facade', color: '#c9c4b8', description: 'The sunset facade on the southwest, with Subirachs austere sculptures of the final days of Christ.' },
  { id: 'facade-glory', name: 'Glory Facade', color: '#d9cfbb', description: 'The main southern entrance, under construction, shown here as designed.' },
  { id: 'nave', name: 'Nave and branching columns', color: '#a89a80', description: 'The forest of tree-like columns on a 7.5 m grid that carries the vaults without flying buttresses.' },
  { id: 'vaults', name: 'Roofs and vaults', color: '#e8e2d4', description: 'Hyperboloid and barrel vaults from 30 m in the aisles to 75 m in the apse.' },
  { id: 'apse', name: 'Apse and ambulatory', color: '#d9cfbb', description: 'Seven chapels ringing the apse behind the ambulatory.' },
  { id: 'cloister', name: 'Cloister and chapels', color: '#cfc8b4', description: 'The cloister surrounding the church, a layout original in Christian architecture.' },
  { id: 'crypt', name: 'Crypt and foundations', color: '#6e6a60', description: 'The crypt and foundations begun under Francisco de Paula del Villar.' },
  { id: 'glass', name: 'Stained glass', color: '#4a7ba6', description: 'Colored glass flooding the interior with light.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (const a of APOSTLES) {
  const facadeName = { nativity: 'Nativity', passion: 'Passion', glory: 'Glory' }[a.facade];
  explanations[`${a.name} spire shaft`.toLowerCase()] =
    `One of twelve apostle spires, each rising to 100 m. The ${a.name} spire stands on the ${facadeName} Facade; every apostle is honored with a large statue at about one third of the tower height, with the name embossed on both sides. Exact shaft profile is schematic.`;
  explanations[`${a.name} spire pinnacle`.toLowerCase()] =
    `Colorful Venetian mosaic pinnacle crowning the ${a.name} spire. Gaudi studied tubular bells for the towers for years; they are to be installed last. Exact pinnacle shape is schematic.`;
}
for (const e of EVANGELISTS) {
  explanations[`${e.name} spire shaft`.toLowerCase()] =
    `One of four evangelist spires, each 135 m tall and built from eight intersecting paraboloids of tensioned stone panels preassembled off site. Exact profile is schematic.`;
  explanations[`${e.name} symbol (${e.symbol})`.toLowerCase()] =
    `The ${e.symbol} of ${e.name}, crowning the ${e.name} spire. Exact sculpture is schematic.`;
  explanations[`${e.name} spire pinnacle`.toLowerCase()] =
    `Pinnacle beneath the ${e.symbol} of ${e.name}. Exact shape is schematic.`;
}
Object.assign(explanations, {
  'jesus christ spire shaft': 'The Tower of Jesus Christ rises to 172.5 m, the tallest church tower in the world since its exterior was completed on 20 February 2026, passing Ulm Minster at 162 m. Built from twelve intersecting paraboloids of tensioned stone panels, it rests on four monumental porphyry columns at the crossing. Exact profile is schematic.',
  'jesus spire inscription drum': 'The inscription drum below the cross carries the words Tu solus Sanctus, tu solus Dominus, tu solus Altissimus on a 29 m pinnacle element begun in May 2025. Exact lettering is schematic.',
  'jesus spire four-armed cross': 'The four-armed cross crowning the basilica, 17 m tall and 13.5 m wide, built in Germany in 2025 and clad in glass and white enameled ceramic from Catalonia.',
  'virgin mary spire shaft': 'The Tower of the Virgin Mary rises to 138 m, built from fourteen intersecting paraboloids, and was inaugurated in December 2021. Exact profile is schematic.',
  'virgin mary twelve-pointed crown': 'The twelve-pointed crown of the Virgin Mary tower. Exact geometry is schematic.',
  'virgin mary morning star': 'The morning star topping the Virgin Mary tower. Exact geometry is schematic.',
  'jesus spire bridges': 'Bridges connecting the four evangelist towers to the Tower of Jesus, which they surround. Exact bridge geometry is schematic.',
  'nativity facade wall': 'The Nativity Facade wall on the northeast side, facing the sunrise, built under Gaudi direct supervision. Exact massing is schematic.',
  'nativity charity portal': 'The Charity portal at the center of the Nativity Facade, one of three portals representing the theological virtues, flanked by Hope and Faith. Exact portal layout is schematic.',
  'nativity hope portal': 'The Hope portal of the Nativity Facade, one of three portals representing the theological virtues. Exact portal layout is schematic.',
  'nativity faith portal': 'The Faith portal of the Nativity Facade, one of three portals representing the theological virtues. Exact portal layout is schematic.',
  'nativity tree of life': 'The Tree of Life above the Charity portal, symbolizing the life of Christ. Exact sculpture is schematic.',
  'nativity rose window': 'Rose window of the Nativity Facade. Exact tracery is schematic.',
  'nativity flanking stair turrets': 'Flanking stair turrets of the Nativity Facade. Exact placement is schematic.',
  'passion facade pediment': 'The pediment above the Passion portals, carrying the austere sculptural program of the final days of Christ. Exact sculpture is schematic.',
  'passion magic square panel': 'The magic square panel on the Passion Facade, whose rows, columns and diagonals all sum to 33, the age of Christ at his death.',
  'passion tomb sculpture group': 'Schematic sculptural group above the pediment evoking the tomb of the Passion narrative. Exact sculpture is schematic.',
  'glory facade narthex': 'The great narthex of the Glory Facade, the main entrance on Carrer de Mallorca facing the sea. The facade is under construction and is shown here as designed.',
  'central nave vault': 'The central nave vault, rising to 45 m over the five-aisled nave. Exact profile is schematic.',
  'west side aisle vault': 'The west side aisle vault at 30 m. Exact profile is schematic.',
  'east side aisle vault': 'The east side aisle vault at 30 m. Exact profile is schematic.',
  'transept vault': 'The transept vault at 60 m over the three-aisled crossing arms. Exact profile is schematic.',
  'crossing great hyperboloid': 'The great hyperboloid at the crossing, surrounded by two rings of twelve hyperboloids. Exact geometry is schematic.',
  'crossing inner hyperboloid ring': 'The inner ring of twelve hyperboloids around the great crossing hyperboloid. Exact geometry is schematic.',
  'crossing outer hyperboloid ring': 'The outer ring of twelve hyperboloids around the great crossing hyperboloid. Exact geometry is schematic.',
  'apse outer wall': 'The apse outer wall. Exact massing is schematic.',
  'apse ambulatory': 'The ambulatory ringing the apse behind the chapels. Exact layout is schematic.',
  'apse hyperboloid vault': 'The apse hyperboloid vault rising to 75 m, the tallest interior vault of the church. Exact profile is schematic.',
  'cloister north gallery': 'Part of the cloister, whose layout surrounding the church is completely original in Christian architecture, isolating the church from the outside. Exact segment lengths are schematic.',
  'cloister south gallery': 'Part of the cloister, whose layout surrounding the church is completely original in Christian architecture, isolating the church from the outside. Exact segment lengths are schematic.',
  'cloister east gallery': 'Part of the cloister, whose layout surrounding the church is completely original in Christian architecture, isolating the church from the outside. Exact segment lengths are schematic.',
  'cloister west gallery': 'Part of the cloister, whose layout surrounding the church is completely original in Christian architecture, isolating the church from the outside. Exact segment lengths are schematic.',
  'chapel of the assumption': 'The Chapel of the Assumption in the apse section of the cloister; the sacristy beside it served as the model for the central lanterns. Exact placement is schematic.',
  'crypt floor slab': 'The crypt floor slab; gaps in the apse floor above open down to the crypt. Exact layout is schematic.',
  'crypt barrel vault': 'The crypt barrel vault, part of the foundations inherited from Francisco de Paula del Villar. Exact layout is schematic.',
  'crypt foundation walls': 'Foundation walls of the crypt, begun under Francisco de Paula del Villar before Gaudi took over in 1883. Exact layout is schematic.',
  'north clerestory glass': 'Clerestory stained glass of the nave; the interior glows with colored light from extensive stained glass. Exact bay divisions are schematic.',
  'south clerestory glass': 'Clerestory stained glass of the nave; the interior glows with colored light from extensive stained glass. Exact bay divisions are schematic.',
  'apse stained glass': 'Stained glass of the apse chapels. Exact bay divisions are schematic.',
  'east transept window': 'Stained glass window of the east transept end. Exact divisions are schematic.',
  'west transept window': 'Stained glass window of the west transept end. Exact divisions are schematic.',
  'nave west wall': 'The west outer wall of the nave, carrying the clerestory glass above the side aisles. Exact wall articulation is schematic.',
  'nave east wall': 'The east outer wall of the nave, carrying the clerestory glass above the side aisles. Exact wall articulation is schematic.',
});
for (let i = 1; i <= 6; i++) {
  explanations[`passion inclined column ${i}`] =
    `One of six inward-slanting, bone-like columns of the Passion Facade, which faces the sunset. Exact angle is schematic.`;
}
for (const p of ['faith', 'charity', 'hope']) {
  explanations[`passion ${p} bronze portal`] =
    `One of three bronze portals of the Passion Facade, with double-leaf doors by Josep Maria Subirachs carrying 10,000 letters of the Passion narrative. Exact panel divisions are schematic.`;
}
for (let i = 1; i <= 7; i++) {
  explanations[`glory bronze door ${i}`] =
    `One of seven bronze doors of the Glory Facade, representing the seven corporal works of mercy. The facade is under construction and is shown here as designed.`;
}
for (let i = 1; i <= 4; i++) {
  explanations[`glory beatitude columns pair ${i}`] =
    `Two of the eight columns for the eight beatitudes, on which the street-side halves of the Glory towers begin about 30 m up. Under construction and shown as designed.`;
}
for (const row of ['west', 'east']) {
  for (let i = 1; i <= 4; i++) {
    explanations[`nave ${row} column ${i} shaft`] =
      `A branching tree-like column of the nave, part of the forest of columns that carries the vaults without flying buttresses. Columns stand on a 7.5 m grid; heavy columns are porphyry and basalt, lighter ones granite and Montjuic sandstone. Exact branch geometry is schematic.`;
    explanations[`nave ${row} column ${i} branch crown`] =
      `The branching crown of a nave column, spreading like tree limbs to carry the vault. Exact branch geometry is schematic.`;
    explanations[`side aisle ${row} column ${i}`] =
      `A side aisle column rising to the 30 m side vaults. Exact position is schematic.`;
  }
}
for (let i = 1; i <= 4; i++) {
  explanations[`crossing porphyry column ${i}`] =
    `One of four monumental porphyry columns at the crossing, carrying the Tower of Jesus Christ. Exact position is schematic.`;
}
for (let i = 1; i <= 7; i++) {
  explanations[`apse chapel ${i}`] =
    `One of seven chapels of the apse, dedicated to the seven sorrows and beatitudes of Saint Joseph, opening onto the ambulatory. Exact chapel widths are schematic.`;
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
const binName = 'sagrada-familia-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the sagrada-familia directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Sagrada Familia, Barcelona',
  title: 'Sagrada Familia',
  location: 'Barcelona, Spain',
  blurb: 'Antoni Gaudi\u2019s unfinished basilica in Barcelona. Its forest of branching columns carries hyperboloid vaults up to 75 m, and its planned 18 spires rise to 172.5 m, the tallest church tower in the world since February 2026.',
  sourceUrls: [
    { label: 'Sagrada Familia official booklet 10: Towers', url: 'https://sagradafamilia.org/documents/20142/1205286/SF_Booklet_10_20240415_digital_AF.pdf/504e0081-e3b7-43ff-be2c-0efb05e2ebaf' },
    { label: 'Sagrada Familia official booklet 7: Passion Facade', url: 'https://sagradafamilia.org/documents/20142/1000561/Booklet_07.pdf/1d9c8f31-1c73-d9bd-4eee-024a935ecac4' },
    { label: 'Sagrada Familia official booklet 8: Glory Facade', url: 'https://sagradafamilia.org/documents/20142/1000561/Booklet_08.pdf' },
    { label: 'Wikipedia: Sagrada Familia', url: 'http://en.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia' },
    { label: 'Popular Science: Tower of Jesus completed February 2026', url: 'https://www.popsci.com/technology/sagrada-familia-church-construction/' },
    { label: 'AZoBuild: Building La Sagrada Familia', url: 'https://www.azobuild.com/article.aspx?ArticleID=8127' },
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
  chunks: [{ url: '/models/sagrada-familia/sagrada-familia-0.bin', bytes: offset }],
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
