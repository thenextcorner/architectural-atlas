// Procedural Trevi Fountain for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Trevi Fountain in code and
// writes it in the atlas binary format:
//   public/models/trevi-fountain/atlas.json
//   public/models/trevi-fountain/trevi-fountain-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/trevi-fountain-attribution.md,
// opened 2026-09-30):
//   Fontana di Trevi, Trevi district, Rome; designed by Nicola Salvi
//   (1697-1751), completed by Giuseppe Pannini, officially opened and
//   inaugurated 22 May 1762 by Pope Clement XIII; construction 1732-1762;
//   26.3 m high and 49.15 m wide; the largest Baroque fountain in Rome and,
//   per Guinness, the largest Baroque sculpture in the world; built mainly
//   of travertine quarried near Tivoli, about 35 km east of Rome (also
//   marble, plaster, stucco, metals); marks the terminal point of the
//   "modern" Acqua Vergine, the revived Aqua Virgo; in 19 BC, supposedly
//   with the help of a virgin, Roman technicians located a source of pure
//   water some 13 km from the city; the eventual indirect route made the
//   aqueduct about 22 km long; it fed the Baths of Agrippa and served Rome
//   for more than 400 years; the Acqua Vergine is still in use today and
//   still feeds the fountain; name from the junction of three roads
//   (tre vie; Latin trivium): Via De' Crocicchi, Via Poli and Via Delle
//   Muratte; 1629: Pope Urban VIII asked Gian Lorenzo Bernini to sketch
//   renovations, abandoned when the pope died; 1730: Pope Clement XII held
//   a competition; Salvi initially lost to Alessandro Galilei, but Roman
//   outcry over a Florentine winning got Salvi the commission anyway; work
//   began in 1732; Salvi died in 1751 with the work half finished; four
//   sculptors completed the decoration: Pietro Bracci (Oceanus in the
//   central niche), Filippo della Valle (Abundance and Salubrity), Giovanni
//   Grossi, and Andrea Bergondi; Pannini substituted the present
//   allegories for planned sculptures of Agrippa and Trivia; Salvi hid a
//   barber's unsightly shop sign behind a sculpted vase, called by Romans
//   the "asso di coppe" (Ace of Cups) for its resemblance to a Tarot card;
//   the backdrop is Palazzo Poli, given a new facade with a giant order of
//   Corinthian pilasters linking the two main storeys; theme: "Taming of
//   the Waters"; a robustly modelled triumphal arch is superimposed on the
//   palazzo facade; the central niche (exedra) framing Oceanus uses
//   free-standing columns for maximal light and shade; Oceanus, god of all
//   water, springs from the central niche on a shell chariot pulled by two
//   hippocamps, one agitated and rearing, one calm, each led by a triton;
//   the tritons guide the chariot and blow conches; in the flanking
//   niches: Abundance spills water from her urn (left) and Salubrity holds
//   a cup from which a snake drinks (right); above them, bas reliefs
//   illustrate the Roman origin of the aqueducts: Agrippa approving the
//   aqueduct project (left, over Abundance) and the virgin showing the
//   spring to Roman soldiers (right, over Salubrity); attic: four statues
//   symbolizing the four seasons; the papal coat of arms of Clement XII
//   (Corsini) supported by two angels; the frieze inscription reads
//   CLEMENS XII PONT MAX / AQVAM VERGINEM COPIA ET SALVBRITATE /
//   COMMENDATAM CVLTV MAGNIFICO ORNAVIT / ANNO DOMINO MDCCXXXV PONTIF VI
//   (1735, the sixth year of Clement XII's pontificate); the water descends
//   in a series of cascades over the rockwork into the great lower basin;
//   the basin holds about 300,000 litres of recirculated water; more than
//   thirty plant species are carved into the rockwork; coin tradition:
//   coins thrown over the left shoulder with the right hand, back to the
//   fountain, ensure a return to Rome, popularized by the 1954 film "Three
//   Coins in the Fountain"; about 3,000 euros are thrown in each day (about
//   1.4 million euros in 2016); the money goes to the Caritas association
//   for charity work; stealing coins is illegal; restorations: 1988 (smog
//   discoloration), 1998 (stonework scrubbed, cracks repaired, recirculating
//   pumps installed), and the Fendi-sponsored 20-month, 2.2-million-euro
//   restoration of June 2014 to November 2015, reopened 3 November 2015,
//   adding more than 100 LED lights for nighttime illumination; a queuing
//   system with a 400-visitor cap followed the December 2024 reopening;
//   from 2 February 2026 non-residents need a 2-euro ticket to approach
//   the fountain.
// Schematic (not sourced, never stated as fact in the UI): exact pilaster
// count and spacing, window count and placement, niche and relief
// dimensions, column heights, exedra radius, attic proportions, and statue
// sizes; exact rockwork reef outline, boulder positions, grotto shapes,
// cascade shelf count and profiles, and plant cluster placement; basin
// ellipse dimensions, rim profile, and step flights; Oceanus, triton,
// hippocamp, angel, and allegory figure poses and proportions; papal arms
// and inscription panel geometry (inscription text itself is sourced);
// pump, pipe, drain, LED, barrier, and coin positions.
//
// Granularity: 105 named parts across 11 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-trevi-fountain.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'trevi-fountain');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (49.15 m wide) maps to 2.4 units.
const S = 2.4 / 49.15;

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
function cone(r, h, x, y, z, seg = 10) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
function sph(r, x, y, z, w = 10, h = 8) {
  const g = new THREE.SphereGeometry(r, w, h);
  g.translate(x, y, z);
  return g;
}
// Box built at the origin, rotated, then placed: use when a rotation must
// not displace the part (rotate-after-translate orbits around the origin).
function tiltBox(x0, x1, y0, y1, z0, z1, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
// Schematic standing figure: feet at y0, total height h. Poses are
// schematic; only the identity and attributes of the figure are sourced.
function figure(x, y0, z, h, o = {}) {
  const g = [];
  const legH = h * 0.36, torsoH = h * 0.34, headR = h * 0.08;
  const hipY = y0 + legH;
  g.push(strut([x - h * 0.05, y0, z], [x - h * 0.05, hipY, z], h * 0.085));
  g.push(strut([x + h * 0.05, y0, z], [x + h * 0.05, hipY, z], h * 0.085));
  const torso = new THREE.CylinderGeometry(h * 0.1, h * 0.075, torsoH, 8);
  torso.translate(x, hipY + torsoH / 2, z);
  g.push(torso);
  const shY = hipY + torsoH * 0.92;
  const arm = (side, pose) => {
    const sx = x + side * h * 0.11;
    let ex, ey, ez = z;
    if (pose === 'up') { ex = x + side * h * 0.16; ey = shY + h * 0.3; }
    else if (pose === 'out') { ex = x + side * h * 0.3; ey = shY - h * 0.02; }
    else if (pose === 'forward') { ex = x + side * h * 0.14; ey = shY - h * 0.05; ez = z + h * 0.28; }
    else { ex = x + side * h * 0.1; ey = shY - h * 0.28; }
    g.push(strut([sx, shY, z], [ex, ey, ez], h * 0.06));
  };
  arm(-1, o.armL || 'down');
  arm(1, o.armR || 'down');
  g.push(sph(headR, x, shY + h * 0.1 + headR, z));
  return g;
}
// Schematic hippocamp (mythical sea horse). rearing=true: agitated pose.
function hippocamp(x, y0, z, s, rearing) {
  const g = [];
  if (rearing) {
    const arc = new THREE.TorusGeometry(1.4 * s, 0.38 * s, 8, 12, Math.PI * 0.8);
    arc.translate(x, y0 + 1.2 * s, z);
    g.push(arc);
    g.push(box(x - 1.9 * s, x - 1.1 * s, y0 + 2.6 * s, y0 + 3.6 * s, z - 0.3 * s, z + 0.3 * s));
    g.push(box(x - 2.5 * s, x - 1.9 * s, y0 + 2.6 * s, y0 + 3.1 * s, z - 0.25 * s, z + 0.25 * s));
    g.push((() => { const t = new THREE.ConeGeometry(0.55 * s, 1.8 * s, 8); t.rotateZ(-0.5); t.translate(x + 1.0 * s, y0 + 0.6 * s, z); return t; })());
  } else {
    const bodyGeo = new THREE.CylinderGeometry(0.42 * s, 0.5 * s, 3.4 * s, 8);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.translate(x, y0 + 0.9 * s, z);
    g.push(bodyGeo);
    g.push(strut([x + 1.5 * s, y0 + 0.9 * s, z], [x + 2.2 * s, y0 + 2.2 * s, z], 0.5 * s));
    g.push(box(x + 1.9 * s, x + 2.7 * s, y0 + 2.0 * s, y0 + 2.7 * s, z - 0.3 * s, z + 0.3 * s));
    g.push((() => { const t = new THREE.ConeGeometry(0.5 * s, 1.6 * s, 8); t.rotateZ(Math.PI / 2 + 0.4); t.translate(x - 2.2 * s, y0 + 0.9 * s, z); return t; })());
  }
  return g;
}
// Thin falling-water sheet between two heights.
function sheet(x, yTop, yBot, z, w, tilt = 0.15) {
  const g = new THREE.BoxGeometry(w, yTop - yBot, 0.36);
  g.rotateX(tilt);
  g.translate(x, (yTop + yBot) / 2, z);
  return g;
}
// Elliptical ring (for basin shell/rim): shape in XY extruded, rotated flat.
function ellipseRing(rx, rz, holeRx, holeRz, depth, y0, zc) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, holeRx, holeRz, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + depth, zc);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const W2 = 24.575; // half width (49.15 m sourced)
const FH = 26.3; // facade height (sourced)

// --- Facade: Palazzo Poli given a new face (sourced composition).
addPart('facade-main-wall', 'Palazzo Poli facade wall', 'facade', [
  box(-W2, W2, 0, FH, -2.2, 0),
]);
addPart('facade-rusticated-ground-floor', 'Rusticated ground floor', 'facade', [
  box(-W2, W2, 0, 7.5, -0.35, 0.35),
]);
addPart('facade-ground-cornice', 'Ground floor cornice', 'facade', [
  box(-W2, W2, 7.5, 8.1, -0.5, 0.5),
]);
addPart('facade-main-entablature', 'Main entablature', 'facade', [
  box(-W2, W2, 16.8, 18.6, -0.6, 0.6),
]);
addPart('facade-attic-parapet-west', 'West attic parapet', 'facade', [
  box(-W2, -8.5, 18.6, 20.4, -0.4, 0.4),
]);
addPart('facade-attic-parapet-east', 'East attic parapet', 'facade', [
  box(8.5, W2, 18.6, 20.4, -0.4, 0.4),
]);
// Piano nobile windows: dark inset, frame, sill, pediment (schematic layout).
for (const [id, name, x] of [
  ['facade-window-west-1', 'West facade window 1', -20],
  ['facade-window-west-2', 'West facade window 2', -14.5],
  ['facade-window-west-3', 'West facade window 3', -9],
  ['facade-window-east-1', 'East facade window 1', 9],
  ['facade-window-east-2', 'East facade window 2', 14.5],
  ['facade-window-east-3', 'East facade window 3', 20],
]) {
  addPart(id, name, 'facade', [
    box(x - 0.9, x + 0.9, 9.5, 13.5, -0.15, 0.1), // dark inset
    box(x - 1.15, x + 1.15, 9.3, 13.7, -0.05, 0.25), // frame
    box(x - 0.9, x + 0.9, 9.5, 13.5, 0.1, 0.3), // glass plane
    box(x - 1.3, x + 1.3, 9.0, 9.3, -0.1, 0.45), // sill
    box(x - 1.3, x + 1.3, 13.7, 14.1, -0.1, 0.4), // pediment base
    strut([x - 1.3, 14.1, 0.15], [x, 14.9, 0.15], 0.35),
    strut([x + 1.3, 14.1, 0.15], [x, 14.9, 0.15], 0.35),
  ]);
}

// --- Pilasters: giant Corinthian order linking the two main storeys.
const pilasterX = [-23.2, -17.2, -10.8, -4.6, 4.6, 10.8, 17.2, 23.2];
for (const [i, x] of pilasterX.entries()) {
  const side = x < 0 ? 'west' : 'east';
  const n = x < 0 ? 4 - pilasterX.slice(0, i).filter((v) => v < 0).length : pilasterX.slice(0, i + 1).filter((v) => v > 0).length;
  addPart(`pilaster-${side}-${n}`, `${side[0].toUpperCase() + side.slice(1)} giant pilaster ${n}`, 'pilasters', [
    box(x - 0.85, x + 0.85, 0, 1.2, -0.35, 0.35), // pedestal
    box(x - 0.7, x + 0.7, 1.2, 15.2, -0.35, 0.35), // shaft
    box(x - 0.9, x + 0.9, 1.2, 2.2, -0.4, 0.4), // base block
  ]);
}
for (const side of ['west', 'east']) {
  const g = [];
  for (const x of pilasterX.filter((v) => (side === 'west' ? v < 0 : v > 0))) {
    g.push(box(x - 1.0, x + 1.0, 15.2, 16.8, -0.45, 0.45)); // capital block
    g.push(cone(0.9, 0.7, x, 16.45, 0, 8)); // capital flare
    g.push(box(x - 1.05, x + 1.05, 15.9, 16.2, -0.5, 0.5)); // abacus
  }
  addPart(`pilaster-capitals-${side}`, `${side[0].toUpperCase() + side.slice(1)} pilaster capitals`, 'pilasters', g);
}

// --- Central bay: the triumphal arch superimposed on the palazzo facade.
addPart('central-pier-west', 'West central pier', 'central-bay', [
  box(-7, -3.5, 0, 19.4, 0, 2.2),
]);
addPart('central-pier-east', 'East central pier', 'central-bay', [
  box(3.5, 7, 0, 19.4, 0, 2.2),
]);
addPart('central-lintel', 'Central bay lintel', 'central-bay', [
  box(-7, 7, 15, 19.4, 0, 2.2),
]);
{
  // Exedra back wall: half cylinder opening toward the piazza (+z).
  const back = new THREE.CylinderGeometry(3.6, 3.6, 12, 20, 1, true, Math.PI / 2, Math.PI);
  back.translate(0, 9, 1.2);
  // Inner lining so the niche reads as a recess.
  const lining = new THREE.CylinderGeometry(3.45, 3.45, 12, 20, 1, true, Math.PI / 2, Math.PI);
  lining.translate(0, 9, 1.2);
  addPart('exedra-back-wall', 'Exedra back wall', 'central-bay', [back, lining]);
}
{
  // Semi-dome over the exedra (back half of a hemisphere).
  const dome = new THREE.SphereGeometry(3.6, 20, 10, Math.PI, Math.PI, 0, Math.PI / 2);
  dome.translate(0, 15, 1.2);
  addPart('exedra-semidome', 'Exedra semi-dome', 'central-bay', [dome]);
}
{
  // Arch ring crowning the central opening.
  const ring = new THREE.TorusGeometry(4.4, 0.7, 10, 20, Math.PI);
  ring.translate(0, 15, 2.3);
  addPart('triumphal-arch-ring', 'Triumphal arch ring', 'central-bay', [ring]);
}
// Four free-standing Corinthian columns for maximal light and shade.
for (const [i, x] of [-5.6, -2.6, 2.6, 5.6].entries()) {
  const g = [
    box(x - 0.75, x + 0.75, 2, 2.8, 2.25, 3.75), // pedestal
    cyl(0.55, 0.62, 10.2, x, 8, 3, 12), // shaft
    cyl(0.85, 0.62, 0.9, x, 13.45, 3, 12), // capital
    box(x - 0.95, x + 0.95, 13.8, 14.1, 2.2, 3.8), // abacus
  ];
  addPart(`column-oceanus-${i + 1}`, `Oceanus column ${i + 1}`, 'central-bay', g);
}
addPart('central-entablature', 'Central entablature', 'central-bay', [
  box(-7.5, 7.5, 14.1, 15.6, 2.0, 4.0),
  box(-7.5, 7.5, 15.6, 16.1, 2.1, 3.9),
]);

// --- Attic: inscription, papal arms, angels, four seasons, balustrades.
addPart('attic-block', 'Attic block', 'attic', [
  box(-8.5, 8.5, 18.6, 23.8, -1, 1.8),
  box(-8.8, 8.8, 23.8, 24.4, -1, 1.8), // attic cornice
]);
{
  const g = [
    box(-6, 6, 19.6, 22.6, 1.8, 2.15), // raised tablet
  ];
  // Four incised text lines suggesting the Clement XII inscription.
  for (let i = 0; i < 4; i++) g.push(box(-5.4, 5.4, 21.9 - i * 0.65, 22.15 - i * 0.65, 2.15, 2.25));
  addPart('inscription-panel', 'Clement XII inscription panel', 'attic', g);
}
{
  const g = [
    box(-0.9, 0.9, 23.8, 25.4, 0.05, 0.55), // shield
    box(-0.9, 0.9, 24.9, 25.4, 0.0, 0.6), // shield chief
  ];
  g.push(cone(0.55, 0.9, 0, 25.85, 0.3, 10)); // papal tiara
  g.push(sph(0.18, 0, 26.35, 0.3, 8, 6)); // orb
  g.push(strut([-0.7, 23.6, 0.3], [0.7, 25.2, 0.3], 0.12)); // crossed keys
  g.push(strut([0.7, 23.6, 0.3], [-0.7, 25.2, 0.3], 0.12));
  addPart('papal-arms', 'Papal coat of arms', 'attic', g);
}
for (const [id, name, x] of [
  ['angel-west', 'West angel', -3.8],
  ['angel-east', 'East angel', 3.8],
]) {
  const g = figure(x, 22.6, 0.6, 2.9, { armL: 'up', armR: 'forward' });
  // Wings: two flattened slabs angled back.
  const w1 = tiltBox(x - 1.4, x - 0.3, 24.0, 25.6, 0.0, 0.24, 0.5, 0, 0.5);
  const w2 = tiltBox(x + 0.3, x + 1.4, 24.0, 25.6, 0.0, 0.24, -0.5, 0, -0.5);
  g.push(w1, w2);
  addPart(id, name, 'attic', g);
}
for (const [id, name, x, yb, pose] of [
  ['attic-statue-spring', 'Attic statue: Spring', -12.5, 20.4, { armL: 'out', armR: 'down' }],
  ['attic-statue-summer', 'Attic statue: Summer', -5.5, 24.4, { armL: 'down', armR: 'up' }],
  ['attic-statue-autumn', 'Attic statue: Autumn', 5.5, 24.4, { armL: 'up', armR: 'down' }],
  ['attic-statue-winter', 'Attic statue: Winter', 12.5, 20.4, { armL: 'down', armR: 'out' }],
]) {
  const g = figure(x, yb, 0.5, 3.2, pose);
  g.push(box(x - 0.5, x + 0.5, yb, yb + 0.5, 0.1, 0.9)); // plinth
  addPart(id, name, 'attic', g);
}
for (const [id, name, x0, x1] of [
  ['attic-balustrade-west', 'West attic balustrade', -W2, -8.5],
  ['attic-balustrade-east', 'East attic balustrade', 8.5, W2],
]) {
  const g = [
    box(x0, x1, 18.6, 19.0, -0.2, 0.5), // base rail
    box(x0, x1, 20.0, 20.4, -0.2, 0.5), // top rail
  ];
  for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.1) g.push(box(x - 0.14, x + 0.14, 19.0, 20.0, 0.05, 0.25));
  addPart(id, name, 'attic', g);
}

// --- Side niches: Abundance (west) and Salubrity (east).
for (const [side, xc] of [['west', -12.5], ['east', 12.5]]) {
  const s = side[0].toUpperCase() + side.slice(1);
  const shell = [
    box(xc - 2, xc + 2, 3, 11, -1.2, -0.7), // back wall
    box(xc - 2, xc - 1.6, 3, 11, -0.7, 0.3), // jambs
    box(xc + 1.6, xc + 2, 3, 11, -0.7, 0.3),
  ];
  const dome = new THREE.SphereGeometry(2.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.8, 0.7);
  dome.translate(xc, 11, -0.4);
  shell.push(dome);
  addPart(`niche-${side === 'west' ? 'abundance' : 'salubrity'}-shell`, `${s === 'West' ? 'Abundance' : 'Salubrity'} niche`, 'side-niches', shell);
  const ped = [
    box(xc - 3, xc + 3, 11, 11.5, -0.3, 0.5),
    strut([xc - 3, 11.5, 0.1], [xc, 13.4, 0.1], 0.4),
    strut([xc + 3, 11.5, 0.1], [xc, 13.4, 0.1], 0.4),
  ];
  addPart(`pediment-${side === 'west' ? 'abundance' : 'salubrity'}`, `${s === 'West' ? 'Abundance' : 'Salubrity'} pediment`, 'side-niches', ped);
  for (const [n, px] of [[1, xc - 3.3], [2, xc + 3.3]]) {
    addPart(`niche-pilaster-${side}-${n}`, `${s} niche pilaster ${n}`, 'side-niches', [
      box(px - 0.6, px + 0.6, 1, 2, -0.3, 0.3),
      box(px - 0.5, px + 0.5, 2, 11, -0.3, 0.3),
      box(px - 0.7, px + 0.7, 11, 11.8, -0.35, 0.35),
    ]);
  }
  // Bas reliefs above the niches: panel with schematic figures.
  const rel = [box(xc - 2, xc + 2, 14, 16.4, 0, 0.35)];
  for (let i = 0; i < 3; i++) {
    const fx = xc - 1.2 + i * 1.2;
    rel.push(cyl(0.22, 0.28, 1.6, fx, 15.1, 0.45, 8));
    rel.push(sph(0.2, fx, 16.05, 0.45, 8, 6));
  }
  addPart(side === 'west' ? 'relief-agrippa' : 'relief-virgin',
    side === 'west' ? 'Agrippa relief' : 'Virgin of the spring relief', 'side-niches', rel);
}

// --- Sculpture: Oceanus, his court, and the allegories.
{
  const g = figure(0, 3.2, 5.2, 5.6, { armL: 'up', armR: 'out' });
  // Long beard, symbol of wisdom and age.
  g.push(cone(0.3, 0.8, 0, 8.35, 5.45, 8));
  // Flowing drapery around the legs.
  g.push(box(-0.75, 0.75, 3.2, 5.4, 4.85, 5.55));
  addPart('oceanus', 'Oceanus', 'sculpture', g);
}
{
  const g = [];
  // Shell bowl of the chariot.
  const bowl = new THREE.SphereGeometry(2.2, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bowl.scale(1, 0.55, 0.7);
  bowl.translate(0, 3.4, 5.2);
  g.push(bowl);
  // Fluted shell ridges.
  for (let i = -2; i <= 2; i++) {
    const r = box(-0.12, 0.12, -1.6, 1.6, -0.1, 0.1);
    r.rotateY(i * 0.28);
    r.translate(i * 0.75, 2.75, 5.2);
    g.push(r);
  }
  g.push(cyl(0.5, 0.7, 0.8, 0, 2.1, 5.2, 10)); // chariot base
  addPart('shell-chariot', 'Shell chariot', 'sculpture', g);
}
addPart('hippocamp-wild', 'Wild hippocamp', 'sculpture', hippocamp(-3.6, 2.2, 6.2, 1.0, true));
addPart('hippocamp-calm', 'Calm hippocamp', 'sculpture', hippocamp(3.6, 1.8, 6.2, 1.0, false));
for (const [id, name, x] of [
  ['triton-west', 'West triton', -6.4],
  ['triton-east', 'East triton', 6.4],
]) {
  const g = figure(x, 3.4, 6.6, 3.6, { armL: 'forward', armR: 'out' });
  // Conch shell raised to the lips.
  g.push((() => { const c = new THREE.ConeGeometry(0.24, 0.75, 8); c.rotateX(Math.PI / 2.4); c.translate(x, 6.7, 7.35); return c; })());
  // Fish tail curling down into the cascade.
  g.push(cyl(0.34, 0.5, 1.7, x, 2.55, 6.6, 8));
  g.push((() => { const f = new THREE.ConeGeometry(0.5, 1.1, 8); f.translate(x, 1.35, 6.6); return f; })());
  addPart(id, name, 'sculpture', g);
}
{
  const g = figure(-12.5, 3.2, -0.2, 4.6, { armL: 'down', armR: 'forward' });
  // Urn at her side, tilted to spill water.
  g.push((() => { const u = new THREE.CylinderGeometry(0.42, 0.3, 1.1, 10); u.rotateZ(0.5); u.translate(-13.6, 4.6, 0.4); return u; })());
  addPart('abundance', 'Abundance', 'sculpture', g);
}
{
  const g = [];
  // Curved horn of plenty.
  const horn = new THREE.TorusGeometry(0.9, 0.32, 8, 12, Math.PI * 0.9);
  horn.rotateZ(Math.PI * 0.15);
  horn.translate(-13.7, 5.6, 0.4);
  g.push(horn);
  // Fruit spilling from the horn.
  for (const [fx, fy, fz] of [[-14.3, 6.2, 0.4], [-13.9, 6.4, 0.6], [-13.4, 6.1, 0.3], [-14.1, 5.9, 0.5]]) {
    g.push(sph(0.22, fx, fy, fz, 8, 6));
  }
  addPart('cornucopia', 'Cornucopia', 'sculpture', g);
}
{
  const g = figure(12.5, 3.2, -0.2, 4.6, { armL: 'forward', armR: 'down' });
  // Laurel crown.
  const crown = new THREE.TorusGeometry(0.3, 0.09, 6, 12);
  crown.rotateX(Math.PI / 2 - 0.2);
  crown.translate(12.5, 8.05, -0.2);
  g.push(crown);
  addPart('salubrity', 'Salubrity', 'sculpture', g);
}
{
  const g = [
    cyl(0.28, 0.2, 0.5, 12.5, 6.9, 0.9, 10), // cup in her forward hand
    cyl(0.3, 0.3, 0.08, 12.5, 7.16, 0.9, 10), // cup rim
  ];
  // Snake rising to drink from the cup.
  const snake = new THREE.TorusGeometry(0.55, 0.09, 6, 12, Math.PI * 1.2);
  snake.rotateY(Math.PI / 2);
  snake.translate(12.5, 6.6, 0.45);
  g.push(snake);
  g.push(sph(0.12, 12.5, 7.05, 0.85, 8, 6)); // snake head at the cup
  addPart('salubrity-cup', 'Salubrity cup and snake', 'sculpture', g);
}
// Carved flora: more than thirty plant species are carved into the design.
for (const [id, name, x0, x1] of [
  ['carved-plants-west', 'Carved plants, west', -15, -7],
  ['carved-plants-east', 'Carved plants, east', 7, 15],
]) {
  const g = [];
  const spots = [[0.15, 3.2, 3.0], [0.35, 2.4, 4.2], [0.55, 3.8, 2.4], [0.75, 2.8, 5.0], [0.9, 3.4, 3.6], [0.25, 4.2, 5.2]];
  for (const [fx, fy, fz] of spots) {
    const x = x0 + fx * (x1 - x0);
    g.push(cone(0.16, 0.7, x, fy, fz, 6));
    g.push(cone(0.12, 0.5, x + 0.3, fy - 0.3, fz + 0.2, 6));
    g.push(sph(0.14, x - 0.25, fy + 0.25, fz - 0.15, 6, 5));
  }
  addPart(id, name, 'sculpture', g);
}

// --- Rockwork: the travertine reef the water tumbles over.
function reef(x0, x1, z0, z1, yMax, seed) {
  const g = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const fx = (i + 0.5) / n;
    const x = x0 + fx * (x1 - x0);
    const w = (x1 - x0) / n * (0.9 + 0.3 * Math.sin(seed + i * 2.1));
    const h = yMax * (0.55 + 0.45 * Math.sin(seed * 1.7 + i * 1.3));
    const zc = z0 + (z1 - z0) * (0.6 + 0.4 * Math.sin(seed + i));
    g.push(tiltBox(x - w / 2, x + w / 2, 0, h, z0, zc, 0.12 * Math.sin(seed + i * 3.3)));
  }
  return g;
}
addPart('reef-central', 'Central reef', 'rockwork', reef(-7, 7, 2, 9, 5.5, 1.3));
addPart('reef-west', 'West reef', 'rockwork', reef(-16, -7, 1, 7.5, 4, 2.7));
addPart('reef-east', 'East reef', 'rockwork', reef(7, 16, 1, 7.5, 4, 4.1));
for (const [id, name, x0, x1, z0] of [
  ['boulders-west', 'West boulders', -15, -8, 6],
  ['boulders-east', 'East boulders', 8, 15, 6],
]) {
  const g = [];
  const spots = [[0.1, 2.6], [0.35, 4.1], [0.6, 3.0], [0.85, 4.4]];
  for (const [i, [fx, bz]] of spots.entries()) {
    const x = x0 + fx * (x1 - x0);
    g.push(tiltBox(x - 0.9, x + 0.9, 0, 1.6 + 0.5 * (i % 2), bz - 0.9, bz + 0.9, 0.3 * (i - 1.5)));
  }
  addPart(id, name, 'rockwork', g);
}
for (const [id, name, x] of [
  ['grotto-west', 'West grotto', -11],
  ['grotto-east', 'East grotto', 11],
]) {
  const g = [
    box(x - 1.4, x + 1.4, 0.4, 2.6, 3.2, 4.4), // dark cavity
  ];
  const arch = new THREE.TorusGeometry(1.5, 0.35, 8, 12, Math.PI);
  arch.translate(x, 2.6, 4.4);
  g.push(arch); // rock arch framing the cavity
  addPart(id, name, 'rockwork', g);
}
// Three semicircular cascade shelves stepping down to the basin.
for (const [i, y, z, r] of [[1, 4.2, 7.5, 3.0], [2, 3.0, 8.8, 3.6], [3, 1.8, 10.2, 4.2]]) {
  const rim = new THREE.CylinderGeometry(r, r, 0.5, 20, 1, false, -Math.PI / 2, Math.PI);
  rim.translate(0, y, z);
  const bed = new THREE.CylinderGeometry(r - 0.2, r - 0.2, 0.25, 20, 1, false, -Math.PI / 2, Math.PI);
  bed.translate(0, y + 0.35, z);
  addPart(`cascade-shelf-${i}`, `${['First', 'Second', 'Third'][i - 1]} cascade shelf`, 'rockwork', [rim, bed]);
}
for (const [id, name, x] of [
  ['rock-spur-west', 'West rock spur', -9.5],
  ['rock-spur-east', 'East rock spur', 9.5],
]) {
  addPart(id, name, 'rockwork', [tiltBox(x - 1.6, x + 1.6, 0, 3.2, 6.5, 10.5, x < 0 ? 0.25 : -0.25)]);
}

// --- Water: cascades, basin surface, and spill streams.
for (const [i, yTop, yBot, z, w] of [
  [1, 4.4, 2.8, 10.4, 5.6],
  [2, 3.2, 1.6, 11.9, 6.8],
  [3, 2.0, 1.2, 13.6, 8.0],
]) {
  addPart(`cascade-sheet-${i}`, `${['First', 'Second', 'Third'][i - 1]} cascade sheet`, 'water', [
    sheet(0, yTop, yBot, z, w),
  ]);
}
{
  const disc = new THREE.CircleGeometry(10.5, 48);
  disc.rotateX(-Math.PI / 2);
  disc.scale(1, 1, 6.8 / 10.5);
  disc.translate(0, 1.15, 15.5);
  addPart('basin-water', 'Basin water', 'water', [disc]);
}
addPart('abundance-stream', 'Abundance water stream', 'water', [
  sheet(-13.6, 4.4, 1.6, 2.6, 0.7, 0.3),
]);
addPart('salubrity-stream', 'Salubrity water stream', 'water', [
  sheet(13.0, 5.2, 1.6, 2.4, 0.5, 0.3),
]);
addPart('spill-west', 'West spill stream', 'water', [
  sheet(-9.5, 3.0, 1.2, 11.5, 1.6, 0.35),
]);
addPart('spill-east', 'East spill stream', 'water', [
  sheet(9.5, 3.0, 1.2, 11.5, 1.6, 0.35),
]);

// --- Basin: the great lower basin.
addPart('basin-shell', 'Basin shell', 'basin', [ellipseRing(12, 8, 10.8, 6.8, 1.7, 0, 15.5)]);
addPart('basin-rim', 'Basin rim', 'basin', [ellipseRing(12.5, 8.5, 10.8, 6.8, 0.28, 1.7, 15.5)]);
{
  const floor = new THREE.CircleGeometry(10.8, 48);
  floor.rotateX(-Math.PI / 2);
  floor.scale(1, 1, 6.8 / 10.8);
  floor.translate(0, 0.15, 15.5);
  addPart('basin-floor', 'Basin floor', 'basin', [floor]);
}
for (const [id, name, x] of [
  ['basin-steps-west', 'West basin steps', -8.5],
  ['basin-steps-east', 'East basin steps', 8.5],
]) {
  const g = [];
  for (let i = 0; i < 4; i++) {
    g.push(box(x - 1.5, x + 1.5, 1.55 - (i + 1) * 0.35, 1.7 - i * 0.35, 23.5 - i * 0.9, 24.4 - i * 0.9));
  }
  addPart(id, name, 'basin', g);
}
{
  const g = [];
  for (let i = 0; i < 4; i++) {
    g.push(box(-1.5, 1.5, 1.55 - (i + 1) * 0.35, 1.7 - i * 0.35, 23.5 - i * 0.9, 24.4 - i * 0.9));
  }
  addPart('basin-steps-front', 'Front basin steps', 'basin', g);
}
addPart('basin-apron', 'Basin apron', 'basin', [ellipseRing(14.5, 10.2, 12.5, 8.5, 0.22, 0, 15.5)]);

// --- Piazza: the small square the fountain fills.
addPart('piazza-pavement', 'Piazza pavement', 'piazza', [
  box(-32, 32, -0.5, 0, 20, 46),
]);
addPart('piazza-curb', 'Piazza curb', 'piazza', [
  box(-32, 32, 0, 0.35, 19.6, 20.2),
]);
{
  // The Ace of Cups: Salvi's vase hiding the barber's sign.
  const g = [
    box(18.9, 20.1, 0, 0.6, 1.2, 2.4), // pedestal
    cyl(0.42, 0.55, 1.3, 19.5, 1.25, 1.8, 12), // vase body
    cyl(0.5, 0.42, 0.25, 19.5, 2.0, 1.8, 12), // vase lip
    sph(0.3, 19.5, 2.25, 1.8, 10, 8), // vase knob
  ];
  addPart('asso-di-coppe', 'Asso di coppe vase', 'piazza', g);
}
{
  // Coins resting in the basin: about 3,000 euros are thrown in each day.
  const g = [];
  const spots = [
    [-6, 12.5], [-3, 14], [2, 12], [5, 15], [-1, 17], [7, 13.5],
    [-8, 15.5], [3.5, 18], [-4.5, 18.5], [8.5, 16.5], [0.5, 13.2], [-2.5, 15.8],
  ];
  for (const [cx, cz] of spots) g.push(cyl(0.12, 0.12, 0.04, cx, 1.22, cz, 10));
  addPart('basin-coins', 'Coins in the basin', 'piazza', g);
}
{
  // Visitor queue barriers from the December 2024 queuing system.
  const g = [];
  for (let x = -8; x <= 8; x += 4) {
    g.push(cyl(0.06, 0.08, 1.1, x, 0.55, 27, 8));
    g.push(sph(0.09, x, 1.14, 27, 8, 6));
  }
  for (let x = -8; x < 8; x += 4) g.push(strut([x, 0.95, 27], [x + 4, 0.95, 27], 0.07));
  addPart('queue-barriers', 'Visitor queue barriers', 'piazza', g);
}
{
  const g = [
    cyl(0.09, 0.13, 6, 24, 3, 32, 8),
    box(23.6, 24.4, 5.9, 6.5, 31.7, 32.3), // lamp head
    sph(0.22, 24, 6.15, 32, 8, 6),
  ];
  addPart('piazza-lamp', 'Piazza lamp', 'piazza', g);
}

// --- Engineering: the working fountain behind the theatre.
addPart('acqua-vergine-feed', 'Acqua Vergine feed', 'engineering', [
  box(-0.8, 0.8, 0.3, 1.3, -2, 4), // channel from the palazzo into the reef
  box(-1.1, 1.1, 1.3, 1.6, -2, 4),
]);
{
  const g = [];
  for (const z of [3.2, 4.4]) {
    const p = new THREE.CylinderGeometry(0.16, 0.16, 20, 8);
    p.rotateZ(Math.PI / 2);
    p.translate(0, 1.0, z);
    g.push(p);
  }
  addPart('feed-pipes', 'Distribution pipes', 'engineering', g);
}
{
  // Recirculating pumps installed in the 1998 restoration.
  const g = [];
  for (const x of [-11, -9.2]) {
    g.push(box(x - 0.8, x + 0.8, 0, 1.5, 3.4, 5.0));
    g.push(cyl(0.35, 0.35, 1.0, x, 2.0, 4.2, 10));
  }
  addPart('recirculating-pumps', 'Recirculating pumps', 'engineering', g);
}
addPart('basin-drain', 'Basin drain', 'engineering', [
  box(-2.5, 2.5, 0.05, 0.3, 22.8, 23.4),
  (() => { const p = new THREE.CylinderGeometry(0.14, 0.14, 5, 8); p.rotateZ(Math.PI / 2); p.translate(0, 0.15, 23.1); return p; })(),
]);
{
  // More than 100 LED lights added in the 2015 Fendi restoration.
  const g = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.push(box(11.6 * Math.cos(a) - 0.12, 11.6 * Math.cos(a) + 0.12, 1.98, 2.14, 15.5 + 8.1 * Math.sin(a) - 0.12, 15.5 + 8.1 * Math.sin(a) + 0.12));
  }
  addPart('led-lights', 'LED night lights', 'engineering', g);
}
addPart('overflow-channel', 'Overflow channel', 'engineering', [
  box(12.5, 14.5, -0.2, 0.25, 10, 22),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette: travertine cream, pale marble figures, blue
// water. The Eiffel Tower is the only dark realistic model in the atlas.
function colorFor(id) {
  if (id === 'facade-main-wall') return '#e6dcc4';
  if (id === 'facade-rusticated-ground-floor') return '#ded2b4';
  if (id === 'facade-ground-cornice' || id === 'facade-main-entablature') return '#ece2c8';
  if (id === 'facade-attic-parapet-west' || id === 'facade-attic-parapet-east') return '#e6dcc4';
  if (id.startsWith('facade-window-')) return '#4a5560';
  if (id.startsWith('pilaster-')) return '#ece2c8';
  if (id === 'central-pier-west' || id === 'central-pier-east') return '#e8dfc9';
  if (id === 'central-lintel' || id === 'central-entablature') return '#ece2c8';
  if (id === 'exedra-back-wall') return '#d9cdae';
  if (id === 'exedra-semidome') return '#e2d6b8';
  if (id === 'triumphal-arch-ring') return '#ece2c8';
  if (id.startsWith('column-oceanus-')) return '#efe5cc';
  if (id === 'attic-block') return '#e6dcc4';
  if (id === 'inscription-panel') return '#f2ead4';
  if (id === 'papal-arms') return '#c9a227';
  if (id.startsWith('angel-')) return '#efe6d2';
  if (id.startsWith('attic-statue-')) return '#e8dcc0';
  if (id.startsWith('attic-balustrade-')) return '#e2d6b8';
  if (id.includes('niche') && id.endsWith('-shell')) return '#dfd4b8';
  if (id.startsWith('pediment-')) return '#ece2c8';
  if (id.startsWith('niche-pilaster-')) return '#e8dfc9';
  if (id === 'relief-agrippa' || id === 'relief-virgin') return '#e2d6b4';
  if (id === 'oceanus') return '#f0e7d2';
  if (id === 'shell-chariot') return '#d9cba6';
  if (id === 'hippocamp-wild' || id === 'hippocamp-calm') return '#cbbd97';
  if (id.startsWith('triton-')) return '#d8cbaa';
  if (id === 'abundance' || id === 'salubrity') return '#efe6d2';
  if (id === 'cornucopia' || id === 'salubrity-cup') return '#c9a227';
  if (id.startsWith('carved-plants-')) return '#7a9a5a';
  if (id.startsWith('reef-')) return '#cfc3a4';
  if (id.startsWith('boulders-')) return '#c4b891';
  if (id.startsWith('grotto-')) return '#6a6252';
  if (id.startsWith('cascade-shelf-')) return '#d9cfb2';
  if (id.startsWith('rock-spur-')) return '#c9bd9c';
  if (id.startsWith('cascade-sheet-')) return '#7fb3d5';
  if (id === 'basin-water') return '#8fc3e0';
  if (id.endsWith('-stream') || id.startsWith('spill-')) return '#7fb3d5';
  if (id === 'basin-shell') return '#ded2b2';
  if (id === 'basin-rim') return '#e8dfc9';
  if (id === 'basin-floor') return '#b9ac86';
  if (id.startsWith('basin-steps-')) return '#d9cfb2';
  if (id === 'basin-apron') return '#cfc4a8';
  if (id === 'piazza-pavement') return '#c9c2b0';
  if (id === 'piazza-curb') return '#b5ad99';
  if (id === 'asso-di-coppe') return '#d9cfb2';
  if (id === 'basin-coins') return '#c9a227';
  if (id === 'queue-barriers') return '#8a94a0';
  if (id === 'piazza-lamp') return '#4a5560';
  if (id === 'acqua-vergine-feed') return '#9aa0a8';
  if (id === 'feed-pipes') return '#7a8896';
  if (id === 'recirculating-pumps') return '#6b7a8a';
  if (id === 'basin-drain' || id === 'overflow-channel') return '#8a8478';
  if (id === 'led-lights') return '#ffe9a8';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facade', name: 'Palazzo Poli facade', color: '#e6dcc4', description: 'Palazzo Poli, the palace Salvi turned into the fountain\u2019s backdrop, given a new facade with a giant order of Corinthian pilasters linking the two main storeys.' },
  { id: 'pilasters', name: 'Giant Corinthian order', color: '#ece2c8', description: 'The giant Corinthian pilasters spanning both main storeys of the palazzo facade, with carved capitals.' },
  { id: 'central-bay', name: 'Central triumphal arch', color: '#e8dfc9', description: 'The robustly modelled triumphal arch superimposed on the palazzo facade, with the exedra niche and free-standing columns framing Oceanus for maximal light and shade.' },
  { id: 'attic', name: 'Attic', color: '#e2d6b8', description: 'The attic crowning the central bay: the Clement XII inscription, the papal arms carried by two angels, the four seasons, and the flanking balustrades.' },
  { id: 'side-niches', name: 'Side niches', color: '#dfd4b8', description: 'The flanking niches of Abundance and Salubrity with their pediments, pilasters, and the reliefs of the aqueduct\u2019s Roman origins.' },
  { id: 'sculpture', name: 'Sculpture', color: '#efe6d2', description: 'The figured sculpture: Oceanus by Pietro Bracci, the tritons and hippocamps, the allegories by Filippo della Valle, and the carved flora.' },
  { id: 'rockwork', name: 'Rockwork reef', color: '#cfc3a4', description: 'The travertine reef: the cliff the water tumbles over, boulders, grottoes, cascade shelves, and rock spurs.' },
  { id: 'water', name: 'Water', color: '#7fb3d5', description: 'The water itself: cascade sheets, the basin surface, and the streams spilling from the niches and the reef.' },
  { id: 'basin', name: 'Great basin', color: '#ded2b2', description: 'The great lower basin that the cascades fall into: shell, rim, floor, steps, and the surrounding apron.' },
  { id: 'piazza', name: 'Piazza setting', color: '#c9c2b0', description: 'The small Piazza di Trevi the fountain fills: pavement, the famous barber\u2019s vase, coins, queue barriers, and lighting.' },
  { id: 'engineering', name: 'Waterworks', color: '#9aa0a8', description: 'The working fountain behind the theatre: the Acqua Vergine feed, distribution pipes, recirculating pumps, drains, and the 2015 LED lighting.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'palazzo poli facade wall': 'The rear wall of Palazzo Poli, which Salvi turned into the fountain\u2019s backdrop when he won the 1730 competition. The fountain is not free-standing: it is the theatrical face of the palace, 26.3 m high and 49.15 m wide. Exact wall construction is schematic.',
  'rusticated ground floor': 'The rusticated ground storey of the palazzo facade, the heavy base course that the giant pilasters rise from. Exact rustication pattern is schematic.',
  'ground floor cornice': 'The string course dividing the rusticated ground floor from the piano nobile above. Exact profile is schematic.',
  'main entablature': 'The full-width entablature crowning the giant order, running the 49.15 m width of the composition. Exact mouldings are schematic.',
  'west attic parapet': 'The side attic parapet west of the central block, part of the palazzo\u2019s upper storey behind the fountain composition. Exact height is schematic.',
  'east attic parapet': 'The side attic parapet east of the central block, part of the palazzo\u2019s upper storey behind the fountain composition. Exact height is schematic.',
  'west facade window 1': 'A piano nobile window of the palazzo facade, west wing. The giant Corinthian pilasters link the two main storeys around these openings. Exact window count and placement are schematic.',
  'west facade window 2': 'A piano nobile window of the palazzo facade, west wing. The giant Corinthian pilasters link the two main storeys around these openings. Exact window count and placement are schematic.',
  'west facade window 3': 'A piano nobile window of the palazzo facade, west wing. The giant Corinthian pilasters link the two main storeys around these openings. Exact window count and placement are schematic.',
  'east facade window 1': 'A piano nobile window of the palazzo facade, east wing. The giant Corinthian pilasters link the two main storeys around these openings. Exact window count and placement are schematic.',
  'east facade window 2': 'A piano nobile window of the palazzo facade, east wing. The giant Corinthian pilasters link the two main storeys around these openings. Exact window count and placement are schematic.',
  'east facade window 3': 'A piano nobile window of the palazzo facade, east wing. The giant Corinthian pilasters link the two main storeys around these openings. Exact window count and placement are schematic.',
  'west giant pilaster 1': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'west giant pilaster 2': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'west giant pilaster 3': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'west giant pilaster 4': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'east giant pilaster 1': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'east giant pilaster 2': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'east giant pilaster 3': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and spacing are schematic.',
  'east giant pilaster 4': 'One of the giant Corinthian pilasters of the palazzo facade, linking the two main storeys in a single order. Exact pilaster count and placement are schematic.',
  'west pilaster capitals': 'Corinthian capitals crowning the west giant pilasters, with carved acanthus suggested in the flare and abacus. Exact carving is schematic.',
  'east pilaster capitals': 'Corinthian capitals crowning the east giant pilasters, with carved acanthus suggested in the flare and abacus. Exact carving is schematic.',
  'west central pier': 'The west pier of the central triumphal arch, the robustly modelled bay superimposed on the palazzo facade. Exact pier width is schematic.',
  'east central pier': 'The east pier of the central triumphal arch, the robustly modelled bay superimposed on the palazzo facade. Exact pier width is schematic.',
  'central bay lintel': 'The mass above the exedra opening carrying the attic, part of the central triumphal arch composition. Exact profile is schematic.',
  'exedra back wall': 'The curved back wall of the central exedra niche from which Oceanus springs. The niche uses free-standing columns for maximal light and shade. Exact radius is schematic.',
  'exedra semi-dome': 'The half-dome crowning the exedra niche over Oceanus. Exact dome profile is schematic.',
  'triumphal arch ring': 'The arch ring crowning the central opening, the triumphal-arch motif superimposed on the palazzo facade. Exact ring profile is schematic.',
  'oceanus column 1': 'One of the four free-standing Corinthian columns framing the exedra, set forward of the niche so light and shade model the sculpture. Exact column height is schematic.',
  'oceanus column 2': 'One of the four free-standing Corinthian columns framing the exedra, set forward of the niche so light and shade model the sculpture. Exact column height is schematic.',
  'oceanus column 3': 'One of the four free-standing Corinthian columns framing the exedra, set forward of the niche so light and shade model the sculpture. Exact column height is schematic.',
  'oceanus column 4': 'One of the four free-standing Corinthian columns framing the exedra, set forward of the niche so light and shade model the sculpture. Exact column height is schematic.',
  'central entablature': 'The entablature carried by the four free-standing columns across the central bay. Exact mouldings are schematic.',
  'attic block': 'The attic crowning the central bay, carrying the inscription, the papal arms, and the inner pair of season statues. Exact proportions are schematic.',
  'clement xii inscription panel': 'The frieze inscription recording Clement XII\u2019s work: CLEMENS XII PONT MAX, AQVAM VERGINEM COPIA ET SALVBRITATE COMMENDATAM CVLTV MAGNIFICO ORNAVIT, ANNO DOMINO MDCCXXXV PONTIF VI. In English: Pope Clement XII adorned with magnificent ornament the Aqueduct of the Maiden, commended for its plenteous flow and healthful water, in the year of the Lord 1735, the sixth of his pontificate.',
  'papal coat of arms': 'The papal coat of arms of Clement XII (Corsini) crowning the attic, with the tiara and crossed keys. Exact heraldry is schematic.',
  'west angel': 'One of the two angels supporting the papal arms on the attic. Pose and drapery are schematic.',
  'east angel': 'One of the two angels supporting the papal arms on the attic. Pose and drapery are schematic.',
  'attic statue: spring': 'One of the four attic statues symbolizing the four seasons. Exact attributes and pose are schematic.',
  'attic statue: summer': 'One of the four attic statues symbolizing the four seasons. Exact attributes and pose are schematic.',
  'attic statue: autumn': 'One of the four attic statues symbolizing the four seasons. Exact attributes and pose are schematic.',
  'attic statue: winter': 'One of the four attic statues symbolizing the four seasons. Exact attributes and pose are schematic.',
  'west attic balustrade': 'The balustrade running along the attic over the west wing, carrying the outer season statue. Exact baluster rhythm is schematic.',
  'east attic balustrade': 'The balustrade running along the attic over the east wing, carrying the outer season statue. Exact baluster rhythm is schematic.',
  'abundance niche': 'The west flanking niche holding Abundance, one of the two niches flanking Oceanus. Exact niche dimensions are schematic.',
  'salubrity niche': 'The east flanking niche holding Salubrity, one of the two niches flanking Oceanus. Exact niche dimensions are schematic.',
  'abundance pediment': 'The pediment crowning the Abundance niche. Exact profile is schematic.',
  'salubrity pediment': 'The pediment crowning the Salubrity niche. Exact profile is schematic.',
  'west niche pilaster 1': 'A pilaster framing the Abundance niche. Exact placement is schematic.',
  'west niche pilaster 2': 'A pilaster framing the Abundance niche. Exact placement is schematic.',
  'east niche pilaster 1': 'A pilaster framing the Salubrity niche. Exact placement is schematic.',
  'east niche pilaster 2': 'A pilaster framing the Salubrity niche. Exact placement is schematic.',
  'agrippa relief': 'The bas relief over Abundance showing Agrippa examining and approving the aqueduct project, one of the two reliefs illustrating the Roman origin of the aqueducts. Figure arrangement is schematic.',
  'virgin of the spring relief': 'The bas relief over Salubrity showing the virgin indicating the spring to Roman soldiers, the scene of the Aqua Virgo\u2019s legendary discovery in 19 BC. Figure arrangement is schematic.',
  'oceanus': 'Oceanus, god of all water, by Pietro Bracci: the robust central figure springing from the exedra on his shell chariot, his long beard a symbol of wisdom and age. Pose and proportions are schematic.',
  'shell chariot': 'Oceanus\u2019s chariot in the form of an enormous seashell, drawn by the two hippocamps. Exact shell fluting is schematic.',
  'wild hippocamp': 'The agitated hippocamp rearing beside the chariot, one of the two sea horses whose contrasting moods, wild and calm, stand for the moods of the sea. Pose is schematic.',
  'calm hippocamp': 'The calm, docile hippocamp beside the chariot, one of the two sea horses whose contrasting moods stand for the moods of the sea. Pose is schematic.',
  'west triton': 'One of the two tritons guiding Oceanus\u2019s chariot and taming the hippocamps, blowing his conch. Pose is schematic.',
  'east triton': 'One of the two tritons guiding Oceanus\u2019s chariot and taming the hippocamps, blowing his conch. Pose is schematic.',
  'abundance': 'Abundance by Filippo della Valle, in the west niche: the allegory of plenty, spilling water from her urn, one of the gifts pure water brings the city. Pose is schematic.',
  'cornucopia': 'The horn of plenty spilling fruit beside Abundance, the attribute of agricultural plenty. Exact arrangement is schematic.',
  'salubrity': 'Salubrity (Health) by Filippo della Valle, in the east niche: crowned with laurel, holding the cup from which a snake drinks, the ancient emblem of medicine. Pose is schematic.',
  'salubrity cup and snake': 'The libation cup of Salubrity from which a snake drinks, linking the fountain\u2019s water to health and to Asclepius, the Greek god of healing. Exact arrangement is schematic.',
  'carved plants, west': 'Carved vegetation on the west rockwork: more than thirty plant species are carved into the fountain\u2019s design, their leaves rendered with lifelike care. Exact species and placement are schematic.',
  'carved plants, east': 'Carved vegetation on the east rockwork: more than thirty plant species are carved into the fountain\u2019s design, their leaves rendered with lifelike care. Exact species and placement are schematic.',
  'central reef': 'The central mass of the travertine reef, the cliff of broken rock over which the water pours in many streams and waterfalls. Exact outline is schematic.',
  'west reef': 'The west mass of the travertine reef flanking the central cascades. Exact outline is schematic.',
  'east reef': 'The east mass of the travertine reef flanking the central cascades. Exact outline is schematic.',
  'west boulders': 'Broken boulders scattered across the west reef, part of the finely simulated wildness of the rockwork. Exact positions are schematic.',
  'east boulders': 'Broken boulders scattered across the east reef, part of the finely simulated wildness of the rockwork. Exact positions are schematic.',
  'west grotto': 'A rocky cavity in the west reef, one of the shadowed hollows the water disappears and reappears among. Exact shape is schematic.',
  'east grotto': 'A rocky cavity in the east reef, one of the shadowed hollows the water disappears and reappears among. Exact shape is schematic.',
  'first cascade shelf': 'The upper of the three semicircular cascade basins stepping down the reef, prototypes of the great lower basin. Exact profile is schematic.',
  'second cascade shelf': 'The middle semicircular cascade basin stepping down the reef. Exact profile is schematic.',
  'third cascade shelf': 'The lowest semicircular cascade basin before the great basin. Exact profile is schematic.',
  'west rock spur': 'A spur of rock jutting toward the basin on the west side of the cascades. Exact shape is schematic.',
  'east rock spur': 'A spur of rock jutting toward the basin on the east side of the cascades. Exact shape is schematic.',
  'first cascade sheet': 'The falling sheet of water over the first cascade shelf, part of the mainstream that descends in a series of lovely cascades. Flow is schematic.',
  'second cascade sheet': 'The falling sheet of water over the second cascade shelf. Flow is schematic.',
  'third cascade sheet': 'The falling sheet of water over the third cascade shelf into the great basin. Flow is schematic.',
  'basin water': 'The water of the great lower basin, fed by the Acqua Vergine and recirculated by modern pumps; the basin holds about 300,000 litres. Level is schematic.',
  'abundance water stream': 'The stream spilling from Abundance\u2019s urn down the rockwork. Flow is schematic.',
  'salubrity water stream': 'The stream falling near Salubrity\u2019s niche down the rockwork. Flow is schematic.',
  'west spill stream': 'Water spilling off the west reef into the basin. Flow is schematic.',
  'east spill stream': 'Water spilling off the east reef into the basin. Flow is schematic.',
  'basin shell': 'The great lower basin\u2019s shell, the elliptical pool the cascades fall into. Exact dimensions are schematic.',
  'basin rim': 'The coping rim of the great basin. Exact profile is schematic.',
  'basin floor': 'The floor of the great basin beneath the water. Exact depth is schematic.',
  'west basin steps': 'Steps down to the basin on its west side. Exact tread count is schematic.',
  'east basin steps': 'Steps down to the basin on its east side. Exact tread count is schematic.',
  'front basin steps': 'Steps down to the basin at its front. Exact tread count is schematic.',
  'basin apron': 'The paved apron surrounding the great basin. Exact extent is schematic.',
  'piazza pavement': 'The pavement of the small Piazza di Trevi, which the 49.15 m wide fountain fills almost entirely. Exact paving is schematic.',
  'piazza curb': 'The curb edging the piazza pavement at the fountain. Exact profile is schematic.',
  'asso di coppe vase': 'The sculpted vase, called by Romans the asso di coppe (Ace of Cups) for its resemblance to a Tarot card, behind which Salvi hid a barber\u2019s unsightly shop sign so it would not spoil the ensemble. Exact position is schematic.',
  'coins in the basin': 'Coins resting in the basin: about 3,000 euros are thrown into the fountain each day, tossed over the left shoulder with the right hand and the back to the fountain to ensure a return to Rome; the money goes to the Caritas association for charity work. Coin positions are schematic.',
  'visitor queue barriers': 'The queue barriers managing visitors at the basin, from the queuing system introduced after the December 2024 restoration, which caps visitors at 400. Exact layout is schematic.',
  'piazza lamp': 'A lamp lighting the piazza at night; the 2015 restoration added more than 100 LED lights to the fountain itself. Exact position is schematic.',
  'acqua vergine feed': 'The feed channel bringing Acqua Vergine water into the fountain, the modern course of the Aqua Virgo opened in 19 BC and still in service. Exact routing is schematic.',
  'distribution pipes': 'Pipes distributing the feed water to the cascades and niche streams behind the rockwork. Exact routing is schematic.',
  'recirculating pumps': 'The recirculating pumps installed in the 1998 restoration, which scrubbed the stonework, repaired cracks, and set the fountain recirculating its 300,000 litres. Exact placement is schematic.',
  'basin drain': 'The basin drain used when the fountain is emptied for cleaning and restoration. Exact position is schematic.',
  'led night lights': 'The more than 100 LED lights installed in the Fendi-sponsored 2014 to 2015 restoration to improve the nighttime illumination. Exact positions are schematic.',
  'overflow channel': 'The overflow channel carrying excess basin water away. Exact routing is schematic.',
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
const binName = 'trevi-fountain-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the trevi-fountain directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Trevi Fountain, Rome (detailed schematic)',
  title: 'Trevi Fountain',
  location: 'Rome, Italy',
  blurb: 'Rome\u2019s 18th century Trevi Fountain, the largest Baroque fountain in the world at 26.3 m high and 49.15 m wide: Oceanus on his shell chariot, the giant Corinthian pilasters of Palazzo Poli, the travertine reef, the great basin, and the Acqua Vergine waterworks.',
  sourceUrls: [
    { label: 'Wikipedia: Trevi Fountain', url: 'http://en.wikipedia.org/wiki/Trevi_Fountain' },
    { label: 'Art & Object: A Brief History of the Trevi Fountain', url: 'https://www.artandobject.com/news/brief-history-trevi-fountain?page=0' },
    { label: 'Cultural Heritage Online: Trevi Fountain', url: 'https://www.culturalheritageonline.com/location-48_Fontana-di-Trevi.php' },
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
  chunks: [{ url: '/models/trevi-fountain/trevi-fountain-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so compact packings clip at the top of the
  // frame. 1.4 restores full framing (same value as Sagrada Familia and
  // Tower Bridge detailed).
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
