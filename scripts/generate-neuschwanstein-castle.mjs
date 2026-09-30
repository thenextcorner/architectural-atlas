// Procedural Neuschwanstein Castle for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Neuschwanstein Castle in code
// and writes it in the atlas binary format:
//   public/models/neuschwanstein-castle/atlas.json
//   public/models/neuschwanstein-castle/neuschwanstein-castle-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/neuschwanstein-castle-attribution.md,
// opened 2026-09-30):
//   Romanesque Revival historicist palace at Hohenschwangau, Bavaria, above
//   the Poellat Gorge between the Alpsee and Schwansee; commissioned by King
//   Ludwig II of Bavaria as a private refuge and temple of friendship for
//   Richard Wagner; design drafted by stage designer Christian Jank and
//   realized by architect Eduard Riedel (civil works: Riedel 1869-1874,
//   Georg von Dollmann 1874-1884, Julius Hofmann 1884-1886); the king
//   personally approved every draft; foundation stone 5 September 1869;
//   gatehouse finished first; Palas topping-out 1880; Ludwig moved into the
//   Palas in 1884; lived there only 172 days; died 13 June 1886; opened to
//   paying visitors within six weeks by Prince-Regent Luitpold; UNESCO World
//   Heritage since 12 July 2025 ("The Palaces of King Ludwig II of Bavaria");
//   65 m (213 ft) northern stair tower: tallest castle in the world
//   (Guinness); ensemble of individual structures over 150 m on a cliff
//   ridge; more than 200 rooms planned, no more than about 15 finished;
//   nearly 6,000 m2 of floor space; cost 6.2 million German gold marks;
//   465 t of marble, 1,550 t of sandstone, 400,000 bricks; Gatehouse:
//   symmetrical, flanked by two stair towers, red brick exterior walls,
//   yellow limestone court fronts, pinnacled roof cornice, crow-stepped
//   gable, Ludwig's first lodging on the upper floor, stables below, royal
//   Bavarian coat of arms over the passage; courtyard on two levels, the
//   lower one bounded by the Gatehouse, the Rectangular Tower foundations
//   and the gallery building, the western end a bricked embankment whose
//   polygonal bulge marks the choir of the projected chapel, base of the
//   planned 90 m keep that was never built; upper courtyard with the
//   45 m Rectangular Tower and its viewing platform, the three-storey
//   Knights' House joined by a continuous blind-arcade gallery to the
//   tower and the Gatehouse, and the Bower (Kemenate) with the balcony of
//   Elsa von Brabant; Palas: colossal five-storey main building of two huge
//   cuboids joined at a flat angle with two adjacent high gable roofs,
//   northern stair tower 65 m with polymorphic roofs recalling the Chateau
//   de Pierrefonds, two-storey western balcony over the Alpsee, low chair
//   tower and conservatory to the north, Lueftlmalerei frescoes (Patrona
//   Bavariae, Saint George) on the court front, copper lion on the
//   court-side gable, knight on the western gable, bi- and triforia windows;
//   Throne Hall 20 by 12 m and 13 m high in the west wing across the third
//   and fourth floors, arcades on three sides, apse for the never-completed
//   throne, paintings of Jesus, the Twelve Apostles and six canonized kings,
//   murals by Wilhelm Hauschild, floor mosaic finished after the king's
//   death, chandelier after a Byzantine crown; Hall of the Singers 27 by
//   10 m, the largest room, in the east wing on the fourth floor, an
//   amalgam of the Wartburg's Hall of the Singers and Ballroom with
//   Lohengrin and Parzival themes, gallery with tribune, the arcaded
//   Saengerlaube stage, first performance 1933; royal lodging on the third
//   floor (drawing room, artificial grotto with waterfall and rainbow
//   machine between drawing room and study, study, dining room with service
//   lift to the kitchen three storeys below, neo-Gothic bedroom with carved
//   bed canopy, house chapel of Saint Louis); kitchen with Rumford oven,
//   calorifere central heating, servant bells, telephone lines, running warm
//   water, flush toilets; servants' rooms in the basement; Marienbruecke
//   named for Marie of Prussia, rebuilt in steel 1886.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement, orientation and spacing of every structure, including the flat
// angle between the Palas wings; wall heights beyond the sourced totals;
// tower, turret, chimney, pinnacle and gable profiles; gate passage profile;
// court pavement patterns; keep foundation and chapel floor-plan outlines;
// interior room volumes and placement inside the Palas; grotto rockwork,
// waterfall, furniture and ornament shapes; Marienbruecke span and pylon
// geometry; gorge and rock terrace profiles; fresco, coat of arms, copper
// lion and knight figure details; stair turret, chair tower and south stair
// tower heights.
//
// Granularity: 101 named parts across 10 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-neuschwanstein-castle.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'neuschwanstein-castle');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (164 m terrace) maps to 2.4 units.
const S = 2.4 / 164;

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
// Triangular gable prism over [x0,x1] x [zc-halfW,zc+halfW], eaves at yEave,
// ridge at yRidge. Built in the ZY plane and extruded along X.
function prismRoof(x0, x1, zc, halfW, yEave, yRidge) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, yEave);
  shape.lineTo(halfW, yEave);
  shape.lineTo(0, yRidge);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
  g.rotateY(Math.PI / 2); // (x,y,z) -> (z,y,-x): shape-x becomes -z, extrusion becomes +x
  g.translate(x0, 0, zc);
  return g;
}
// Half cylinder shell with axis along Y, radius r, height h, covering the
// half where x <= 0 (thetaStart PI). Used for the throne apse and the
// chapel choir bulge.
function halfCylXNeg(r, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false, Math.PI, Math.PI);
  g.translate(x, y, z);
  return g;
}
// The posterior (west) Palas wing joins the anterior wing at a flat angle.
// Build its geometry in wing-local coordinates, rotate FIRST, then translate
// to the joint (rotate-before-translate; the reverse flings parts off site).
const POST_A = (12 * Math.PI) / 180;
const POST_J = [-52, 0, 0];
function posterior(geoms) {
  for (const g of geoms) {
    g.rotateY(POST_A);
    g.translate(POST_J[0], POST_J[1], POST_J[2]);
  }
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Gatehouse: symmetrical entrance block flanked by two stair towers
// (sourced arrangement and materials): 14 parts.
addPart('gate-passage-walls', 'Gate passage walls', 'gatehouse', [
  box(55, 69, 0, 14, -10, -3),
  box(55, 69, 0, 14, 3, 10),
  box(55, 69, 10, 14, -3, 3),
]);
{
  const vault = new THREE.CylinderGeometry(3, 3, 14, 16, 1, true, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  vault.translate(62, 7, 0);
  addPart('gate-passage-vault', 'Gate passage vault', 'gatehouse', [vault]);
}
addPart('gate-doors', 'Gate doors', 'gatehouse', [
  box(60.8, 61.2, 0, 6.5, -2.8, 0),
  box(60.8, 61.2, 0, 6.5, 0, 2.8),
]);
addPart('gatehouse-east-facade', 'Gatehouse red brick east facade', 'gatehouse', [
  box(68.7, 69.06, 0, 14, -10, -3),
  box(68.7, 69.06, 0, 14, 3, 10),
  box(68.7, 69.06, 10, 14, -3, 3),
]);
addPart('gatehouse-court-facade', 'Gatehouse yellow limestone court facade', 'gatehouse', [
  box(54.94, 55.3, 0, 14, -10, -3),
  box(54.94, 55.3, 0, 14, 3, 10),
  box(54.94, 55.3, 10, 14, -3, 3),
]);
addPart('gatehouse-crowstepped-gable', 'Gatehouse crow-stepped gable', 'gatehouse', [
  box(58, 66, 14, 15.3, -4, 4),
  box(59, 65, 15.3, 16.6, -4, 4),
  box(60, 64, 16.6, 17.9, -4, 4),
  box(61, 63, 17.9, 19.2, -4, 4),
]);
{
  const geoms = [];
  for (const [x, z] of [[56, -9], [56, 9], [68, -9], [68, 9]]) {
    const c = new THREE.ConeGeometry(1, 2.5, 8);
    c.translate(x, 15.2, z);
    geoms.push(c);
  }
  addPart('gatehouse-cornice-pinnacles', 'Gatehouse cornice pinnacles', 'gatehouse', geoms);
}
addPart('gatehouse-north-turret', 'Gatehouse north stair turret', 'gatehouse', [
  cyl(3.5, 4, 24, 62, 12, -13.5, 12),
]);
addPart('gatehouse-south-turret', 'Gatehouse south stair turret', 'gatehouse', [
  cyl(3.5, 4, 24, 62, 12, 13.5, 12),
]);
{
  const cap = new THREE.ConeGeometry(4.2, 6, 12);
  cap.translate(62, 27, -13.5);
  const fin = new THREE.SphereGeometry(0.8, 10, 8);
  fin.translate(62, 30.4, -13.5);
  addPart('gatehouse-north-turret-cap', 'Gatehouse north turret cap', 'gatehouse', [cap, fin]);
}
{
  const cap = new THREE.ConeGeometry(4.2, 6, 12);
  cap.translate(62, 27, 13.5);
  const fin = new THREE.SphereGeometry(0.8, 10, 8);
  fin.translate(62, 30.4, 13.5);
  addPart('gatehouse-south-turret-cap', 'Gatehouse south turret cap', 'gatehouse', [cap, fin]);
}
addPart('gatehouse-coat-of-arms', 'Royal Bavarian coat of arms', 'gatehouse', [
  box(68.8, 69.3, 9, 12, -2, 2),
]);
addPart('gatehouse-first-lodging', 'Ludwig\u2019s first lodging', 'gatehouse', [
  box(56, 68, 7, 13.5, -9, 9),
]);
addPart('gatehouse-stables', 'Gatehouse stables', 'gatehouse', [
  box(56, 68, 0, 6.5, -9, -3.5),
  box(56, 68, 0, 6.5, 3.5, 9),
]);

// --- Lower courtyard (base y 0; sourced two-level arrangement): 8 parts.
addPart('lower-court-pavement', 'Lower courtyard pavement', 'lower-court', [
  box(28, 55, 0, 0.5, -14, 14),
]);
addPart('gallery-building', 'Lower courtyard gallery building', 'lower-court', [
  box(28, 55, 0, 10, -20, -14),
]);
{
  const geoms = [];
  for (let i = 0; i < 8; i++) {
    const x = 30.5 + i * 3;
    geoms.push(box(x - 1, x - 0.6, 2, 6.5, -14.36, -14));
    geoms.push(box(x + 0.6, x + 1, 2, 6.5, -14.36, -14));
    geoms.push(box(x - 1, x + 1, 6.5, 7.2, -14.36, -14));
  }
  addPart('gallery-blind-arcade', 'Gallery building blind arcade', 'lower-court', geoms);
}
addPart('rectangular-tower-foundations', 'Rectangular Tower foundations', 'lower-court', [
  box(30, 44, 0, 2, -28, -27),
  box(30, 44, 0, 2, -23, -22),
  box(30, 31, 0, 2, -28, -22),
  box(43, 44, 0, 2, -28, -22),
]);
addPart('west-embankment', 'Lower courtyard west embankment', 'lower-court', [
  box(26, 30, 0, 4, -14, 14),
]);
addPart('chapel-choir-bulge', 'Projected chapel choir bulge', 'lower-court', [
  halfCylXNeg(5, 4, 28, 2, 0, 10),
]);
addPart('south-parapet', 'Lower courtyard south parapet', 'lower-court', [
  box(28, 55, 0, 1.5, 13.2, 14),
]);
{
  const geoms = [];
  for (let i = 0; i < 8; i++) {
    geoms.push(box(24 + i * 0.5, 24 + (i + 1) * 0.5, 0, (8 - i) * 0.5, -2, 2));
  }
  addPart('steps-to-upper-court', 'Steps to the upper courtyard', 'lower-court', geoms);
}

// --- Palas: colossal five-storey main building of two cuboids joined at a
// flat angle (sourced massing): 13 parts.
addPart('palas-anterior-wing', 'Palas anterior wing', 'palas', [
  box(-52, -20, 0, 30, -20, 20),
]);
addPart('palas-posterior-wing', 'Palas posterior wing', 'palas',
  posterior([box(-36, 0, 0, 30, -16, 16)]));
addPart('palas-anterior-roof', 'Palas anterior gable roof', 'palas', [
  prismRoof(-52, -20, 0, 20, 30, 38),
]);
addPart('palas-posterior-roof', 'Palas posterior gable roof', 'palas',
  posterior([prismRoof(-36, 0, 0, 16, 30, 38)]));
addPart('palas-west-balcony', 'Palas two-storey west balcony', 'palas',
  posterior([
    box(-40.06, -35.94, 18, 19, -8, 8),
    box(-40.06, -35.94, 19, 20.2, -8, -7.6),
    box(-40.06, -35.94, 19, 20.2, 7.6, 8),
    box(-40.06, -39.66, 19, 20.2, -8, 8),
    box(-40.06, -35.94, 24, 25, -8, 8),
    box(-40.06, -35.94, 25, 26.2, -8, -7.6),
    box(-40.06, -35.94, 25, 26.2, 7.6, 8),
    box(-40.06, -39.66, 25, 26.2, -8, 8),
  ]));
{
  const body = box(-21.5, -20.5, 38, 39.5, -1, 1);
  const head = box(-21.3, -20.7, 39.5, 40.5, -0.7, 0.7);
  addPart('palas-copper-lion', 'Copper lion of the court gable', 'palas', [body, head]);
}
addPart('palas-knight-figure', 'Knight of the western gable', 'palas',
  posterior([
    box(-36.5, -35.5, 38, 39.5, -1, 1),
    box(-36.3, -35.7, 39.5, 40.3, -0.6, 0.6),
  ]));
addPart('palas-patrona-bavariae', 'Patrona Bavariae fresco', 'palas', [
  box(-20.1, -19.7, 16, 24, -6, 6),
]);
addPart('palas-saint-george', 'Saint George fresco', 'palas', [
  box(-20.1, -19.7, 16, 24, 8, 18),
]);
{
  const geoms = [];
  for (const z0 of [-16, -11, -6, -1, 4, 9, 14]) {
    geoms.push(box(-20.36, -19.94, 20, 26, z0, z0 + 0.5));
    geoms.push(box(-20.36, -19.94, 20, 26, z0 + 0.9, z0 + 1.4));
  }
  addPart('palas-biforia-windows', 'Palas biforia windows', 'palas', geoms);
}
{
  const geoms = [];
  for (const z0 of [-12, -7, -2, 3, 8]) {
    geoms.push(box(-36.36, -35.94, 20, 27, z0, z0 + 0.5));
    geoms.push(box(-36.36, -35.94, 20, 27, z0 + 0.9, z0 + 1.4));
    geoms.push(box(-36.36, -35.94, 20, 27, z0 + 1.8, z0 + 2.3));
  }
  addPart('palas-triforia-windows', 'Palas triforia windows', 'palas', posterior(geoms));
}
{
  const shaft = box(-52, -46, 0, 12, -26, -19.94);
  const cap = new THREE.ConeGeometry(4.5, 5, 4);
  cap.rotateY(Math.PI / 4);
  cap.translate(-49, 14.5, -23);
  addPart('palas-chair-tower', 'Palas chair tower', 'palas', [shaft, cap]);
}
addPart('palas-conservatory', 'Palas conservatory', 'palas', [
  box(-45, -25, 0, 8, -30, -19.94),
  box(-45, -25, 8, 8.8, -30, -20),
]);

// --- Towers: the 65 m north stair tower (sourced), the south stair tower
// (schematic height), the 45 m Rectangular Tower (sourced), and the Palas
// corner turrets: 8 parts.
addPart('north-stair-tower', 'North stair tower', 'towers',
  posterior([cyl(5, 5.5, 65, -2, 32.5, -19, 14)]));
{
  const cone = new THREE.ConeGeometry(6, 8, 14);
  cone.translate(-2, 69, -19);
  const fin = new THREE.SphereGeometry(1, 10, 8);
  fin.translate(-2, 73.8, -19);
  addPart('north-stair-tower-cap', 'North stair tower cap', 'towers', posterior([cone, fin]));
}
addPart('south-stair-tower', 'South stair tower', 'towers',
  posterior([cyl(4.5, 5, 48, -2, 24, 19, 14)]));
{
  const cone = new THREE.ConeGeometry(5.2, 6, 14);
  cone.translate(-2, 51, 19);
  const fin = new THREE.SphereGeometry(0.9, 10, 8);
  fin.translate(-2, 54.4, 19);
  addPart('south-stair-tower-cap', 'South stair tower cap', 'towers', posterior([cone, fin]));
}
addPart('rectangular-tower', 'Rectangular Tower', 'towers', [
  box(-21, -11, 4, 49, -37, -27),
]);
{
  const geoms = [box(-21.5, -10.5, 49, 50, -37.5, -26.5)];
  for (let i = 0; i < 5; i++) {
    const x = -21 + i * 2;
    geoms.push(box(x, x + 1, 50, 51.2, -37.5, -36.9));
    geoms.push(box(x, x + 1, 50, 51.2, -27.1, -26.5));
  }
  for (let i = 0; i < 5; i++) {
    const z = -36 + i * 2;
    geoms.push(box(-21.5, -20.9, 50, 51.2, z, z + 1));
    geoms.push(box(-11.1, -10.5, 50, 51.2, z, z + 1));
  }
  addPart('rectangular-tower-platform', 'Rectangular Tower viewing platform', 'towers', geoms);
}
{
  const geoms = [];
  for (const [x, z] of [[-50, -18], [-22, -18]]) {
    geoms.push(cyl(2, 2.3, 34, x, 17, z, 10));
    const c = new THREE.ConeGeometry(2.6, 4, 10);
    c.translate(x, 36, z);
    geoms.push(c);
  }
  addPart('palas-corner-turrets-north', 'Palas north corner turrets', 'towers', geoms);
}
{
  const geoms = [];
  for (const [x, z] of [[-50, 18], [-22, 18]]) {
    geoms.push(cyl(2, 2.3, 34, x, 17, z, 10));
    const c = new THREE.ConeGeometry(2.6, 4, 10);
    c.translate(x, 36, z);
    geoms.push(c);
  }
  addPart('palas-corner-turrets-south', 'Palas south corner turrets', 'towers', geoms);
}

// --- Upper courtyard (base y 4; sourced arrangement): 10 parts.
addPart('upper-court-pavement', 'Upper courtyard pavement', 'upper-court', [
  box(-20, 28, 4, 4.5, -26, 26),
]);
addPart('knights-house', 'Knights\u2019 House', 'upper-court', [
  box(-10, 25, 4, 16, -38, -26),
]);
addPart('knights-house-roof', 'Knights\u2019 House roof', 'upper-court', [
  prismRoof(-10, 25, -32, 6, 16, 21),
]);
{
  const geoms = [box(-18, 56, 4, 9, -25, -23)];
  for (let i = 0; i < 18; i++) {
    const x = -16 + i * 4;
    geoms.push(box(x - 0.8, x - 0.4, 5, 8, -23.36, -23));
    geoms.push(box(x + 0.4, x + 0.8, 5, 8, -23.36, -23));
    geoms.push(box(x - 0.8, x + 0.8, 8, 8.6, -23.36, -23));
  }
  addPart('blind-arcade-gallery', 'Blind arcade gallery', 'upper-court', geoms);
}
addPart('knights-house-service-rooms', 'Knights\u2019 House service rooms', 'upper-court', [
  box(-8, 23, 5, 15, -36, -28),
]);
addPart('bower', 'Bower (Kemenate)', 'upper-court', [
  box(-10, 25, 4, 16, 26, 38),
]);
addPart('bower-roof', 'Bower roof', 'upper-court', [
  prismRoof(-10, 25, 32, 6, 16, 21),
]);
addPart('elsa-von-brabant-balcony', 'Elsa von Brabant balcony', 'upper-court', [
  box(2, 12, 10, 11, 23.94, 26),
  box(2, 12, 11, 12.2, 23.94, 24.4),
]);
addPart('keep-foundation-outline', 'Unbuilt keep foundation outline', 'upper-court', [
  box(-3, 11, 4, 5.5, -7, -6),
  box(-3, 11, 4, 5.5, 6, 7),
  box(-3, -2, 4, 5.5, -7, 7),
  box(10, 11, 4, 5.5, -7, 7),
]);
{
  const disc = new THREE.CylinderGeometry(3, 3, 0.2, 12, 1, false, 0, Math.PI);
  disc.translate(10, 4.6, 0);
  addPart('chapel-floor-plan', 'Projected chapel floor plan', 'upper-court', [
    box(0, 10, 4.5, 4.7, -4, -3.6),
    box(0, 10, 4.5, 4.7, 3.6, 4),
    box(0, 0.4, 4.5, 4.7, -4, 4),
    box(9.6, 10, 4.5, 4.7, -4, 4),
    disc,
  ]);
}

// --- Roofs and chimneys (sourced: the Palas is spangled with decorative
// chimneys): 9 parts.
const CHIMNEYS = [
  { id: 1, x: -46, z: -8, post: false },
  { id: 2, x: -40, z: 6, post: false },
  { id: 3, x: -30, z: -4, post: false },
  { id: 4, x: -12, z: 5, post: true },
  { id: 5, x: -24, z: -6, post: true },
];
for (const c of CHIMNEYS) {
  const geoms = [
    box(c.x - 0.75, c.x + 0.75, 33, 41, c.z - 0.75, c.z + 0.75),
    box(c.x - 1.1, c.x + 1.1, 41, 41.8, c.z - 1.1, c.z + 1.1),
  ];
  addPart(`palas-chimney-${c.id}`, `Palas decorative chimney ${c.id}`, 'roofs',
    c.post ? posterior(geoms) : geoms);
}
addPart('gatehouse-roof', 'Gatehouse roof', 'roofs', [
  box(55, 69, 14, 14.8, -10, 10),
]);
addPart('gallery-building-roof', 'Gallery building roof', 'roofs', [
  box(28, 55, 10, 10.8, -20, -14),
]);
addPart('knights-house-chimney', 'Knights\u2019 House chimney', 'roofs', [
  box(4, 5.5, 16, 22, -33, -31.5),
  box(3.7, 5.8, 22, 22.8, -33.3, -31.2),
]);
addPart('bower-chimney', 'Bower chimney', 'roofs', [
  box(14, 15.5, 16, 22, 31, 32.5),
  box(13.7, 15.8, 22, 22.8, 30.7, 32.8),
]);

// --- Throne Hall: 20 by 12 m, 13 m high, west wing, third and fourth
// floors (sourced dimensions). Wing-local coordinates, rotated with the
// posterior wing: 12 parts.
addPart('throne-hall', 'Throne Hall', 'throne-hall',
  posterior([box(-30, -10, 18, 31, -6, 6)]));
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    geoms.push(cyl(0.5, 0.6, 8, -28 + i * 4, 22, -5.4, 8));
  }
  geoms.push(box(-30, -10, 26, 27.5, -5.8, -5));
  addPart('throne-hall-north-arcade', 'Throne Hall north arcade', 'throne-hall', posterior(geoms));
}
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    geoms.push(cyl(0.5, 0.6, 8, -28 + i * 4, 22, 5.4, 8));
  }
  geoms.push(box(-30, -10, 26, 27.5, 5, 5.8));
  addPart('throne-hall-south-arcade', 'Throne Hall south arcade', 'throne-hall', posterior(geoms));
}
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    geoms.push(cyl(0.5, 0.6, 8, -10.6, 22, -5 + i * 2.5, 8));
  }
  geoms.push(box(-11, -10.2, 26, 27.5, -6, 6));
  addPart('throne-hall-east-arcade', 'Throne Hall east arcade', 'throne-hall', posterior(geoms));
}
addPart('throne-hall-apse', 'Throne Hall apse', 'throne-hall',
  posterior([halfCylXNeg(6, 13, -30, 24.5, 0, 14)]));
addPart('throne-dais', 'Throne dais', 'throne-hall',
  posterior([box(-33, -29, 18, 19.2, -3, 3)]));
addPart('throne-setting-empty', 'Unfinished throne setting', 'throne-hall',
  posterior([
    box(-33.2, -32.6, 19.2, 23, -1.5, 1.5),
    box(-32.8, -31.4, 19.2, 20, -1.2, 1.2),
  ]));
{
  const geoms = [];
  const ring = new THREE.TorusGeometry(3, 0.35, 8, 24);
  ring.rotateX(Math.PI / 2);
  ring.translate(-20, 25, 0);
  geoms.push(ring);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    geoms.push(cyl(0.12, 0.12, 1.2, -20 + Math.cos(a) * 3, 25.8, Math.sin(a) * 3, 6));
  }
  geoms.push(strut([-20, 31, -2.5], [-20, 25.6, -2.9], 0.12));
  geoms.push(strut([-20 + 2.2, 31, 1.2], [-20 + 2.5, 25.6, 1.4], 0.12));
  geoms.push(strut([-20 - 2.2, 31, 1.2], [-20 - 2.5, 25.6, 1.4], 0.12));
  addPart('throne-chandelier', 'Throne Hall Byzantine crown chandelier', 'throne-hall', posterior(geoms));
}
addPart('throne-floor-mosaic', 'Throne Hall floor mosaic', 'throne-hall',
  posterior([box(-30, -10, 18.05, 18.3, -6, 6)]));
addPart('throne-hauschild-murals', 'Throne Hall Hauschild murals', 'throne-hall',
  posterior([
    box(-28, -20, 22, 29, -5.9, -5.5),
    box(-18, -12, 22, 29, -5.9, -5.5),
  ]));
{
  const geoms = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + ((i + 0.5) * Math.PI) / 6;
    const px = -30 + Math.cos(a) * 5.4;
    const pz = Math.sin(a) * 5.4;
    geoms.push(box(px - 0.8, px + 0.8, 24, 27, pz - 0.3, pz + 0.3));
  }
  addPart('throne-six-kings', 'Throne Hall six canonized kings', 'throne-hall', posterior(geoms));
}
addPart('throne-jesus-apostles', 'Throne Hall Jesus and Apostles paintings', 'throne-hall',
  posterior([
    box(-28, -22, 22, 29, 5.5, 5.9),
    box(-20, -14, 22, 29, 5.5, 5.9),
  ]));

// --- Hall of the Singers: 27 by 10 m, the largest room, east wing fourth
// floor (sourced dimensions): 7 parts.
addPart('singers-hall', 'Hall of the Singers', 'singers-hall', [
  box(-47, -20, 24, 34, -5, 5),
]);
addPart('singers-gallery', 'Singers\u2019 Hall gallery', 'singers-hall', [
  box(-45, -22, 28, 28.8, -5, -3.5),
  box(-45, -22, 28.8, 30, -3.9, -3.5),
]);
addPart('singers-tribune', 'Singers\u2019 Hall tribune', 'singers-hall', [
  box(-36, -30, 28.8, 32, -5, -3),
  prismRoof(-36, -30, -4, 1, 32, 34),
]);
addPart('singers-saengerlaube', 'S\u00e4ngerlaube stage', 'singers-hall', [
  box(-24, -20, 24, 25, -4, 4),
  box(-21, -20, 25, 31, -4, 4),
]);
{
  const geoms = [];
  for (const z0 of [-3, 0, 3]) {
    geoms.push(box(-21.46, -21, 25, 29, z0 - 0.7, z0 - 0.3));
    geoms.push(box(-21.46, -21, 25, 29, z0 + 0.3, z0 + 0.7));
    geoms.push(box(-21.46, -21, 29, 29.8, z0 - 0.7, z0 + 0.7));
  }
  addPart('singers-stage-arcades', 'S\u00e4ngerlaube arcades', 'singers-hall', geoms);
}
addPart('singers-lohengrin-murals', 'Singers\u2019 Hall Lohengrin murals', 'singers-hall', [
  box(-44, -34, 26, 32, -4.9, -4.5),
  box(-32, -24, 26, 32, -4.9, -4.5),
]);
addPart('singers-parzival-murals', 'Singers\u2019 Hall Parzival murals', 'singers-hall', [
  box(-44, -34, 26, 32, 4.5, 4.9),
  box(-32, -24, 26, 32, 4.5, 4.9),
]);

// --- Royal lodging: third floor of the east wing (sourced room sequence),
// with the kitchen three storeys below and the servants' rooms in the
// basement: 14 parts.
addPart('lodging-drawing-room', 'Drawing room', 'royal-lodging', [
  box(-36, -30, 14, 21, -8, 6),
]);
{
  const r1 = new THREE.SphereGeometry(2.5, 8, 6);
  r1.translate(-28, 17, -4);
  const r2 = new THREE.SphereGeometry(2.5, 8, 6);
  r2.translate(-27, 16.5, 3);
  addPart('lodging-grotto', 'Artificial grotto', 'royal-lodging', [
    box(-30, -26, 14, 20, -8, 6), r1, r2,
  ]);
}
addPart('lodging-waterfall', 'Grotto artificial waterfall', 'royal-lodging', [
  box(-28.2, -27.4, 14, 19, -2, 2),
]);
addPart('lodging-study', 'Study', 'royal-lodging', [
  box(-26, -20, 14, 21, -8, 6),
]);
addPart('lodging-dining-room', 'Dining room', 'royal-lodging', [
  box(-52, -46, 14, 21, -8, 6),
]);
addPart('lodging-kitchen', 'Kitchen', 'royal-lodging', [
  box(-52, -46, 2, 8, -8, 6),
]);
addPart('lodging-rumford-oven', 'Rumford oven', 'royal-lodging', [
  box(-51, -49, 2, 5, -6, 6),
]);
addPart('lodging-service-lift', 'Kitchen service lift', 'royal-lodging', [
  box(-47, -46, 2, 21, 4, 5),
]);
addPart('lodging-bedroom', 'Bedroom', 'royal-lodging', [
  box(-46, -40, 14, 21, -8, 6),
]);
{
  const geoms = [box(-45.5, -40.5, 19.5, 20.5, -6, 4)];
  for (const [x, z] of [[-45.3, -5.8], [-45.3, 3.8], [-40.7, -5.8], [-40.7, 3.8]]) {
    geoms.push(box(x, x + 0.4, 14, 20, z, z + 0.4));
  }
  addPart('lodging-bed-canopy', 'Carved bed canopy', 'royal-lodging', geoms);
}
addPart('lodging-house-chapel', 'House chapel of Saint Louis', 'royal-lodging', [
  box(-40, -36, 14, 21, -8, 6),
]);
addPart('lodging-corridor', 'Lodging corridor', 'royal-lodging', [
  box(-52, -20, 14, 20, 6, 8),
]);
addPart('lodging-servants-rooms', 'Servants\u2019 rooms', 'royal-lodging', [
  box(-36, -30, 2, 7, -8, -2),
  box(-36, -30, 2, 7, 0, 6),
  box(-28, -22, 2, 7, -8, 6),
]);
{
  const geoms = [];
  for (let i = 0; i < 8; i++) {
    geoms.push(box(-34 + i * 0.25, -31.75 + i * 0.25, 2, 3.5 + i * 1.5, -8, -6));
  }
  addPart('lodging-servants-stairs', 'Servants\u2019 stairs', 'royal-lodging', geoms);
}

// --- Rock terrace and gorge (sourced siting above the Poellat Gorge):
// 6 parts.
addPart('rock-terrace', 'Rock terrace', 'terrain', [
  box(-92, 72, -20, 0, -52, 48),
]);
addPart('south-rock-strip', 'South rock strip', 'terrain', [
  box(-92, 72, -20, 0, 58, 68),
]);
addPart('pollat-gorge-walls', 'P\u00f6llat Gorge walls', 'terrain', [
  box(-92, 72, -14, 2, 44, 48),
  box(-92, 72, -14, 2, 58, 62),
]);
addPart('pollat-stream', 'P\u00f6llat stream', 'terrain', [
  box(-92, 72, -12, -11.5, 48, 58),
]);
addPart('marienbrucke-deck', 'Marienbr\u00fccke deck', 'terrain', [
  box(-24, -16, 9, 10, 44, 62),
  box(-24, -16, 10, 11.2, 44, 44.6),
  box(-24, -16, 10, 11.2, 61.4, 62),
]);
addPart('marienbrucke-pylons', 'Marienbr\u00fccke pylons', 'terrain', [
  box(-24, -16, -14, 9, 44, 48),
  box(-24, -16, -14, 9, 58, 62),
]);

// ---------------------------------------------------------------- colors
// Schematic light stone palette (the Eiffel Tower is the only dark
// realistic model in the atlas).
function colorFor(id) {
  if (id === 'gatehouse-east-facade' || id === 'west-embankment' || id === 'chapel-choir-bulge') return '#a8563f';
  if (id === 'gatehouse-court-facade') return '#d9c48f';
  if (id === 'gate-doors' || id === 'lodging-rumford-oven') return '#3f4448';
  if (id === 'gatehouse-coat-of-arms' || id === 'throne-dais' || id === 'throne-setting-empty' || id === 'throne-chandelier') return '#c9a227';
  if (id === 'palas-copper-lion') return '#b87333';
  if (id === 'palas-knight-figure') return '#8a8a8a';
  if (id === 'palas-patrona-bavariae' || id === 'palas-saint-george') return '#c4a06a';
  if (id === 'palas-anterior-roof' || id === 'palas-posterior-roof' || id === 'knights-house-roof' || id === 'bower-roof' || id === 'gatehouse-roof' || id === 'gallery-building-roof') return '#7a8a99';
  if (id === 'north-stair-tower-cap' || id === 'south-stair-tower-cap' || id === 'gatehouse-north-turret-cap' || id === 'gatehouse-south-turret-cap') return '#5b6b7a';
  if (id.endsWith('-biforia-windows') || id.endsWith('-triforia-windows')) return '#2f5f8f';
  if (id === 'palas-conservatory') return '#9fc3d8';
  if (id === 'palas-chair-tower') return '#e8e2d4';
  if (id === 'throne-floor-mosaic') return '#b59a6a';
  if (id === 'throne-hauschild-murals' || id === 'singers-lohengrin-murals' || id === 'singers-parzival-murals') return '#a89a80';
  if (id === 'throne-six-kings' || id === 'throne-jesus-apostles') return '#8a6b4a';
  if (id === 'singers-gallery' || id === 'singers-tribune') return '#8a6b4a';
  if (id === 'singers-saengerlaube' || id === 'singers-stage-arcades') return '#e8e2d4';
  if (id === 'lodging-grotto') return '#7a746c';
  if (id === 'lodging-waterfall') return '#bcd6e8';
  if (id === 'lodging-kitchen' || id === 'gatehouse-stables' || id === 'lodging-servants-rooms' || id === 'knights-house-service-rooms') return '#b9b2a0';
  if (id === 'lodging-service-lift' || id === 'chapel-floor-plan' || id === 'pollat-gorge-walls') return '#8a8378';
  if (id === 'lodging-bedroom' || id === 'lodging-drawing-room' || id === 'lodging-study' || id === 'lodging-dining-room') return '#d9cfbb';
  if (id === 'lodging-bed-canopy') return '#5a4632';
  if (id === 'lodging-house-chapel' || id === 'throne-hall-north-arcade' || id === 'throne-hall-south-arcade' || id === 'throne-hall-east-arcade') return '#e8e2d4';
  if (id === 'lodging-corridor' || id === 'lower-court-pavement' || id === 'upper-court-pavement' || id === 'steps-to-upper-court') return '#cfc8b4';
  if (id === 'lodging-servants-stairs' || id === 'rectangular-tower-foundations' || id === 'keep-foundation-outline') return '#a89a80';
  if (id === 'rock-terrace' || id === 'south-rock-strip') return '#9a938a';
  if (id === 'pollat-stream') return '#4a7ba6';
  if (id === 'marienbrucke-deck') return '#5b6b7a';
  if (id === 'marienbrucke-pylons') return '#6e7a88';
  if (id === 'gate-passage-vault') return '#8a8378';
  if (id === 'gatehouse-first-lodging') return '#cfc8b4';
  if (id === 'south-parapet' || id === 'rectangular-tower-platform') return '#d9cfbb';
  if (id.startsWith('palas-chimney-') || id === 'knights-house-chimney' || id === 'bower-chimney') return '#b9b2a0';
  return '#e8e2d4';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'gatehouse', name: 'Gatehouse', color: '#d9c48f', description: 'The symmetrical entrance block flanked by two stair towers, with red brick outer walls, yellow limestone court fronts, a crow-stepped gable and the king\u2019s first lodging.' },
  { id: 'lower-court', name: 'Lower courtyard', color: '#cfc8b4', description: 'The lower court level with the gallery building, the Rectangular Tower foundations and the embankment marking the choir of the projected chapel.' },
  { id: 'palas', name: 'Palas', color: '#e8e2d4', description: 'The colossal five-storey main building: two huge cuboids joined at a flat angle under two adjacent high gable roofs, with frescoes, balconies and turrets.' },
  { id: 'towers', name: 'Towers', color: '#e8e2d4', description: 'The 65 m north stair tower, the tallest castle tower in the world, the south stair tower, the 45 m Rectangular Tower and the Palas corner turrets.' },
  { id: 'upper-court', name: 'Upper courtyard', color: '#cfc8b4', description: 'The upper court level with the Knights\u2019 House, the Bower, the blind arcade gallery and the foundations of the unbuilt 90 m keep.' },
  { id: 'roofs', name: 'Roofs and chimneys', color: '#7a8a99', description: 'Gable roof slabs and the numerous decorative chimneys spangling the roofs.' },
  { id: 'throne-hall', name: 'Throne Hall', color: '#c9a227', description: 'The 20 by 12 m hall in the west wing, 13 m high across two floors, with arcades on three sides and an apse for the never-completed throne.' },
  { id: 'singers-hall', name: 'Hall of the Singers', color: '#8a6b4a', description: 'The 27 by 10 m hall in the east wing, the largest room of the palace, with its gallery, tribune and the arcaded S\u00e4ngerlaube stage.' },
  { id: 'royal-lodging', name: 'King\u2019s rooms', color: '#d9cfbb', description: 'The third-floor lodging: drawing room, artificial grotto, study, dining room, bedroom and house chapel, with the kitchen and servants\u2019 rooms below.' },
  { id: 'terrain', name: 'Rock terrace and gorge', color: '#9a938a', description: 'The cliff-ridge terrace carrying the 150 m ensemble, the gorge of the P\u00f6llat stream and the steel Marienbr\u00fccke.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'gate passage walls': 'The walls flanking the gate passage through the symmetrical Gatehouse, the only entrance to the palace complex. Exact passage profile is schematic.',
  'gate passage vault': 'The vaulted ceiling of the gate passage. Exact vault profile is schematic.',
  'gate doors': 'The iron gate doors of the passage. Exact door design is schematic.',
  'gatehouse red brick east facade': 'The eastward-pointing outer face of the Gatehouse, cased with red bricks in high contrast to the rest of the palace. Exact brickwork is schematic.',
  'gatehouse yellow limestone court facade': 'The court-facing front of the Gatehouse, cased with yellow limestone. Exact stonework is schematic.',
  'gatehouse crow-stepped gable': 'The crow-stepped gable surmounting the upper floor of the Gatehouse. Exact step profile is schematic.',
  'gatehouse cornice pinnacles': 'Pinnacles surrounding the roof cornice of the Gatehouse. Exact pinnacle shapes are schematic.',
  'gatehouse north stair turret': 'One of two stair towers flanking the symmetrical Gatehouse. Exact height is schematic.',
  'gatehouse south stair turret': 'One of two stair towers flanking the symmetrical Gatehouse. Exact height is schematic.',
  'gatehouse north turret cap': 'The cap of the north stair turret. Exact cap profile is schematic.',
  'gatehouse south turret cap': 'The cap of the south stair turret. Exact cap profile is schematic.',
  'royal bavarian coat of arms': 'The royal coat of arms of Bavaria crowning the passage through the Gatehouse. Exact heraldry is schematic.',
  'ludwig\u2019s first lodging': 'The upper floor of the Gatehouse held King Ludwig II\u2019s first lodging at Neuschwanstein, from which he occasionally observed the building work before the Palas was completed. Exact room layout is schematic.',
  'gatehouse stables': 'The ground floors of the Gatehouse were intended to accommodate the stables. Exact stall layout is schematic.',
  'lower courtyard pavement': 'The paving of the lower of the two courtyard levels. Exact paving pattern is schematic.',
  'lower courtyard gallery building': 'The gallery building defining the lower courtyard to the north. Exact massing is schematic.',
  'gallery building blind arcade': 'Blind arcade on the gallery building facing the courtyard. Exact arch profiles are schematic.',
  'rectangular tower foundations': 'Foundations of the so-called Rectangular Tower, defining the lower courtyard to the north. Exact outline is schematic.',
  'lower courtyard west embankment': 'The bricked embankment delimiting the lower courtyard at its western end. Exact profile is schematic.',
  'projected chapel choir bulge': 'The polygonally protracting bulge of the embankment marks the choir of the originally projected chapel, a three-nave church that was never built. Exact outline is schematic.',
  'lower courtyard south parapet': 'The low parapet on the open southern end of the lower courtyard, imparting a view of the surrounding mountain scenery. Exact profile is schematic.',
  'steps to the upper courtyard': 'The flight of steps at the side giving access to the upper courtyard level. Exact step count is schematic.',
  'palas anterior wing': 'The court-side, eastern cuboid of the five-storey Palas, containing the king\u2019s lodging and the Hall of the Singers. Exact wall articulation is schematic.',
  'palas posterior wing': 'The west-facing cuboid of the Palas, joined to the anterior wing at a flat angle and holding the Throne Hall. Exact angle and articulation are schematic.',
  'palas anterior gable roof': 'One of two adjacent high gable roofs covering the Palas. Exact roof profile is schematic.',
  'palas posterior gable roof': 'One of two adjacent high gable roofs covering the Palas. Exact roof profile is schematic.',
  'palas two-storey west balcony': 'The two-storey balcony on the western front of the Palas, with a view of the Alpsee. Exact balustrade design is schematic.',
  'copper lion of the court gable': 'The court-side gable of the Palas is crowned with a copper lion. Exact figure is schematic.',
  'knight of the western gable': 'The western, outward gable of the Palas carries the likeness of a knight. Exact figure is schematic.',
  'patrona bavariae fresco': 'The Patrona Bavariae depicted on the court face of the Palas in the L\u00fcftlmalerei fresco style of Allg\u00e4u farmhouses. Exact painting is schematic.',
  'saint george fresco': 'Saint George depicted on the court face of the Palas in the L\u00fcftlmalerei fresco style. Exact painting is schematic.',
  'palas biforia windows': 'Paired biforia window openings of the Palas, in the Romanesque manner. Exact window tracery is schematic.',
  'palas triforia windows': 'Triple triforia window openings of the Palas, in the Romanesque manner. Exact window tracery is schematic.',
  'palas chair tower': 'The low chair tower protruding north from the Palas. Exact massing is schematic.',
  'palas conservatory': 'The conservatory, or winter garden, protruding north from the main structure of the Palas. Exact glazing divisions are schematic.',
  'north stair tower': 'The northern of the two stair towers in the angles of the Palas, rising 65 m (213 ft) and surmounting the palace roof by several storeys, which makes Neuschwanstein the tallest castle in the world. Exact shaft profile is schematic.',
  'north stair tower cap': 'The polymorphic cap of the 65 m north stair tower, its varied roofs recalling the Ch\u00e2teau de Pierrefonds. Exact cap profile is schematic.',
  'south stair tower': 'The southern stair tower in the angles of the Palas. Its height is schematic.',
  'south stair tower cap': 'The cap of the south stair tower. Exact cap profile is schematic.',
  'rectangular tower': 'The Rectangular Tower, 45 m high, the most striking structure of the upper court level; like most court buildings it mostly serves a decorative purpose. Exact massing is schematic.',
  'rectangular tower viewing platform': 'The viewing platform of the Rectangular Tower, providing a vast view over the Alpine foothills to the north. Exact crenellation is schematic.',
  'palas north corner turrets': 'Ornamental turrets at the northern corners of the Palas. Exact turret profiles are schematic.',
  'palas south corner turrets': 'Ornamental turrets at the southern corners of the Palas. Exact turret profiles are schematic.',
  'upper courtyard pavement': 'The paving of the upper courtyard level, in which the foundation plan of the planned chapel-keep is marked out. Exact paving pattern is schematic.',
  'knights\u2019 house': 'The three-storey Knights\u2019 House defining the northern end of the upper courtyard; estate and service rooms were envisioned here. Exact massing is schematic.',
  'knights\u2019 house roof': 'The gable roof of the Knights\u2019 House. Exact roof profile is schematic.',
  'blind arcade gallery': 'The continuous gallery fashioned with a blind arcade, connecting the Knights\u2019 House to the Rectangular Tower and the Gatehouse. Exact arch profiles are schematic.',
  'knights\u2019 house service rooms': 'The estate and service rooms envisioned inside the Knights\u2019 House. Exact room layout is schematic.',
  'bower (kemenate)': 'The Bower, or Kemenate, defining the south side of the upper courtyard; the ladies\u2019 house of the ensemble, completed in simplified form without the planned figures of female saints. Exact massing is schematic.',
  'bower roof': 'The gable roof of the Bower. Exact roof profile is schematic.',
  'elsa von brabant balcony': 'The balcony of Elsa von Brabant on the Bower, facing the courtyard as in Wagner\u2019s stage directions for Antwerp Castle in Lohengrin. Exact balustrade is schematic.',
  'unbuilt keep foundation outline': 'The foundation outline of the planned 90 m keep in the upper courtyard, the intended centrepiece of the ensemble, which was never built. Exact outline is schematic.',
  'projected chapel floor plan': 'The floor plan of the projected three-nave chapel, marked out in the upper-courtyard pavement; the church was never built. Exact outline is schematic.',
  'palas decorative chimney 1': 'One of the numerous decorative chimneys spangling the Palas roofs. Exact chimney profile is schematic.',
  'palas decorative chimney 2': 'One of the numerous decorative chimneys spangling the Palas roofs. Exact chimney profile is schematic.',
  'palas decorative chimney 3': 'One of the numerous decorative chimneys spangling the Palas roofs. Exact chimney profile is schematic.',
  'palas decorative chimney 4': 'One of the numerous decorative chimneys spangling the Palas roofs. Exact chimney profile is schematic.',
  'palas decorative chimney 5': 'One of the numerous decorative chimneys spangling the Palas roofs. Exact chimney profile is schematic.',
  'gatehouse roof': 'The roof slab of the Gatehouse beneath the crow-stepped gable. Exact construction is schematic.',
  'gallery building roof': 'The roof of the lower courtyard gallery building. Exact profile is schematic.',
  'knights\u2019 house chimney': 'A chimney of the Knights\u2019 House. Exact profile is schematic.',
  'bower chimney': 'A chimney of the Bower. Exact profile is schematic.',
  'throne hall': 'The Throne Hall, 20 by 12 m and 13 m high, in the west wing of the Palas across the third and fourth floors. Julius Hofmann modelled it after the Allerheiligen-Hofkirche in the Munich Residenz. Exact interior volumes are schematic.',
  'throne hall north arcade': 'One of the colorful arcades surrounding the Throne Hall on three sides. Exact arcade detail is schematic.',
  'throne hall south arcade': 'One of the colorful arcades surrounding the Throne Hall on three sides. Exact arcade detail is schematic.',
  'throne hall east arcade': 'One of the colorful arcades surrounding the Throne Hall on three sides. Exact arcade detail is schematic.',
  'throne hall apse': 'The apse of the Throne Hall, intended to hold King Ludwig\u2019s throne, which was never completed. Exact apse profile is schematic.',
  'throne dais': 'The throne dais in the apse, surrounded by paintings of Jesus, the Twelve Apostles and six canonized kings. Exact dais design is schematic.',
  'unfinished throne setting': 'The empty setting for the throne that was never completed; the hall amalgamates the Grail Hall from Parzival with a symbol of the divine right of kings. Exact design is schematic.',
  'throne hall byzantine crown chandelier': 'The chandelier fashioned after a Byzantine crown, hanging in the Throne Hall. Exact chandelier design is schematic.',
  'throne hall floor mosaic': 'The floor mosaic of the Throne Hall, completed after the king\u2019s death. Exact mosaic pattern is schematic.',
  'throne hall hauschild murals': 'The mural paintings of the Throne Hall, created by Wilhelm Hauschild. Exact murals are schematic.',
  'throne hall six canonized kings': 'Portraits of six canonized kings in the apse: Saint Louis of France, Saint Stephen of Hungary, Saint Edward the Confessor of England, Saint Wenceslaus of Bohemia, Saint Olaf of Norway and Saint Henry. Exact portraits are schematic.',
  'throne hall jesus and apostles paintings': 'Paintings of Jesus and the Twelve Apostles surrounding the throne dais. Exact paintings are schematic.',
  'hall of the singers': 'The Hall of the Singers, 27 by 10 m, the largest room of the palace, in the eastern court-side wing of the Palas on the fourth floor above the king\u2019s lodgings. Exact interior volume is schematic.',
  'singers\u2019 hall gallery': 'The gallery terminating the longer side of the Hall of the Singers. Exact gallery detail is schematic.',
  'singers\u2019 hall tribune': 'The tribune crowning the gallery of the Hall of the Singers, modelled after the Wartburg. Exact tribune design is schematic.',
  's\u00e4ngerlaube stage': 'The stage on the eastern narrow side of the Hall of the Singers, known as the S\u00e4ngerlaube. Exact stage design is schematic.',
  's\u00e4ngerlaube arcades': 'The arcades structuring the S\u00e4ngerlaube stage. Exact arcade detail is schematic.',
  'singers\u2019 hall lohengrin murals': 'Wall decoration of the Hall of the Singers with themes from Lohengrin. Exact murals are schematic.',
  'singers\u2019 hall parzival murals': 'Wall decoration of the Hall of the Singers with themes from Parzival. Exact murals are schematic.',
  'drawing room': 'The eastward drawing room of the royal lodging, adorned with themes from the Lohengrin legend. Exact furnishing is schematic.',
  'artificial grotto': 'The little artificial grotto between the drawing room and the study, depicting the H\u00f6rselberg grotto from Wagner\u2019s Tannh\u00e4user; it was originally equipped with an artificial waterfall and a rainbow machine. Exact rockwork is schematic.',
  'grotto artificial waterfall': 'The artificial waterfall of the grotto, part of its original Tannh\u00e4user staging. Exact design is schematic.',
  'study': 'The study of the royal lodging, its d\u00e9cor relating to Wagner\u2019s Tannh\u00e4user like the adjacent grotto. Exact furnishing is schematic.',
  'dining room': 'The dining room of the royal lodging, adorned with themes of courtly love. Exact furnishing is schematic.',
  'kitchen': 'The kitchen of the palace, situated three storeys below the dining room. Exact layout is schematic.',
  'rumford oven': 'The Rumford oven of the kitchen, which turned the skewer with its heat and so automatically adjusted the turning speed. Exact oven design is schematic.',
  'kitchen service lift': 'The service lift connecting the dining room with the kitchen three storeys below. Exact mechanism is schematic.',
  'bedroom': 'The king\u2019s bedroom in neo-Gothic style, dominated by a huge bed adorned with carvings; Ludwig was arrested in this room on the night of 11 to 12 June 1886. Exact furnishing is schematic.',
  'carved bed canopy': 'The carved bed canopy of the king\u2019s bedroom; fourteen carvers worked more than four years on the canopy with its numerous pinnacles and on the oaken panellings. Exact carving is schematic.',
  'house chapel of saint louis': 'The little house chapel adjacent to the bedroom, consecrated to Saint Louis, after whom the king was named; with the bedroom, the only room remaining in neo-Gothic style. Exact interior is schematic.',
  'lodging corridor': 'A corridor of the royal lodging; the lobbies and corridors were painted in a simpler style by 1888. Exact layout is schematic.',
  'servants\u2019 rooms': 'The servants\u2019 rooms in the basement of the Palas, scantily equipped with massive oak furniture and 1.80 m beds. Exact room layout is schematic.',
  'servants\u2019 stairs': 'The narrow, steep servants\u2019 stairs; the servants were not allowed to use the main stairs. Exact stair design is schematic.',
  'rock terrace': 'The rock terrace of the cliff ridge carrying the 150 m ensemble of individual structures. Exact terrace profile is schematic.',
  'south rock strip': 'The rock beyond the P\u00f6llat Gorge, south of the castle. Exact profile is schematic.',
  'p\u00f6llat gorge walls': 'The walls of the narrow gorge of the P\u00f6llat stream, above which the castle stands. Exact gorge profile is schematic.',
  'p\u00f6llat stream': 'The P\u00f6llat stream in its gorge below the castle. Exact watercourse is schematic.',
  'marienbr\u00fccke deck': 'The deck of the Marienbr\u00fccke, named after Ludwig\u2019s mother Marie of Prussia; the first wooden bridge was replaced with a steel construction in 1886. Exact deck design is schematic.',
  'marienbr\u00fccke pylons': 'The pylons carrying the steel Marienbr\u00fccke over the P\u00f6llat Gorge. Exact pylon design is schematic.',
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
  const cleaned = p.geoms.map((g) => {
    g.deleteAttribute('uv');
    return g;
  });
  // ExtrudeGeometry prisms are non-indexed; when mixed with indexed boxes
  // the merge would fail, so convert everything to non-indexed in that case.
  const normalized =
    cleaned.some((g) => !g.index) && cleaned.some((g) => g.index)
      ? cleaned.map((g) => (g.index ? g.toNonIndexed() : g))
      : cleaned;
  const merged = mergeGeometries(normalized, false);
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
const binName = 'neuschwanstein-castle-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the neuschwanstein-castle directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Neuschwanstein Castle, Bavaria (detailed schematic)',
  title: 'Neuschwanstein Castle',
  location: 'Hohenschwangau, Bavaria, Germany',
  blurb: 'King Ludwig II of Bavaria\u2019s Romanesque Revival palace above the P\u00f6llat Gorge, built from 1869 as an inhabitable stage set for Wagner\u2019s operas. At 65 m it is the tallest castle in the world, while its planned 90 m keep was never built.',
  sourceUrls: [
    { label: 'Wikipedia: Neuschwanstein Castle', url: 'https://en.wikipedia.org/wiki/Neuschwanstein_Castle' },
    { label: 'German Federal Foreign Office: UNESCO inscription 2025', url: 'https://unesco.diplo.de/unesco-en/inscription-of-the-castles-of-king-ludwig-ii-of-bavaria-to-the-list-of-unesco-world-heritage-sites-2727496' },
    { label: 'TravelPulse: Bavaria\u2019s palaces added to UNESCO list', url: 'https://www.travelpulse.ca/news/destinations/bavaria-s-fairy-tale-palaces-added-to-unesco-world-heritage-list' },
    { label: 'History Tools: The Fantastical History of Neuschwanstein Castle', url: 'https://www.historytools.org/stories/the-fantastical-history-of-neuschwanstein-castle' },
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
  chunks: [{ url: '/models/neuschwanstein-castle/neuschwanstein-castle-0.bin', bytes: offset }],
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
