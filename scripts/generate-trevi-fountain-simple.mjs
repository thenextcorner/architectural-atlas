// Simplified schematic Trevi Fountain for the Architectural Atlas.
//
// The "simple" variant of the Trevi Fountain: same footprint, massing and
// proportions as the detailed model (see scripts/generate-trevi-fountain.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 36 named parts across 6 systems instead of 105 across 11. Facade wall,
// rustication, windows and side parapets merge into single wall parts;
// pilasters, columns, niches, pediments and reliefs merge into grouped
// parts; attic block, inscription, arms, angels and statues merge;
// Oceanus keeps his own part while tritons, hippocamps, allegories and
// plants merge; reef masses, boulders, shelves and grottoes merge;
// cascades, streams and basin water merge; basin shell, rim, floor, steps
// and apron merge; piazza, vase, coins, barriers and waterworks merge into
// the setting.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-trevi-fountain.mjs for the full attribution):
//   26.3 m high, 49.15 m wide; largest Baroque fountain in Rome (Guinness:
//   largest Baroque sculpture in the world); designed by Nicola Salvi,
//   completed by Giuseppe Pannini, inaugurated 22 May 1762 by Pope Clement
//   XIII; construction 1732-1762; travertine from Tivoli (~35 km east of
//   Rome); terminal point of the Acqua Vergine (revived Aqua Virgo, 19 BC,
//   source 13 km away, 22 km route, fed the Baths of Agrippa, still in use);
//   name from tre vie (Via De' Crocicchi, Via Poli, Via Delle Muratte);
//   1730 competition: Salvi lost to Alessandro Galilei but won the
//   commission after Roman outcry; Salvi died 1751; decoration by Pietro
//   Bracci (Oceanus), Filippo della Valle (Abundance, Salubrity), Giovanni
//   Grossi, Andrea Bergondi; the "asso di coppe" vase hid a barber's sign;
//   Palazzo Poli backdrop with a giant order of Corinthian pilasters
//   linking the two main storeys; theme "Taming of the Waters"; triumphal
//   arch superimposed on the palazzo facade; central exedra with
//   free-standing columns for maximal light and shade; Oceanus on a shell
//   chariot pulled by two hippocamps (one agitated, one calm), each led by
//   a triton; Abundance spills water from her urn (west niche), Salubrity
//   holds a cup from which a snake drinks (east niche); reliefs of Agrippa
//   and the virgin of the spring; attic with four season statues, the
//   Clement XII papal arms carried by two angels, and the 1735 inscription;
//   water descends in cascades into the great lower basin (~300,000 litres,
//   recirculated since 1998); 30+ plant species carved; coin tradition
//   (~3,000 euros a day to Caritas); Fendi restoration 2014-2015 with 100+
//   LED lights; 400-visitor queuing system from December 2024.
// Schematic (not sourced, never stated as fact in the UI): exact merged
// group geometry; figure poses; rockwork outline; basin dimensions.
//
// Writes:
//   public/models/trevi-fountain-simple/atlas.json
//   public/models/trevi-fountain-simple/trevi-fountain-simple-0.bin
//
// Usage: node scripts/generate-trevi-fountain-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'trevi-fountain-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (49.15 m wide) maps to 2.4 units (same as detailed).
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
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function cone(r, h, x, y, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
function sph(r, x, y, z, w = 8, h = 6) {
  const g = new THREE.SphereGeometry(r, w, h);
  g.translate(x, y, z);
  return g;
}
// Schematic standing figure (coarser than the detailed variant).
function figure(x, y0, z, h, o = {}) {
  const g = [];
  const legH = h * 0.36, torsoH = h * 0.34, headR = h * 0.08;
  const hipY = y0 + legH;
  g.push(strut([x - h * 0.05, y0, z], [x - h * 0.05, hipY, z], h * 0.085));
  g.push(strut([x + h * 0.05, y0, z], [x + h * 0.05, hipY, z], h * 0.085));
  const torso = new THREE.CylinderGeometry(h * 0.1, h * 0.075, torsoH, 6);
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
function sheet(x, yTop, yBot, z, w, tilt = 0.15) {
  const g = new THREE.BoxGeometry(w, yTop - yBot, 0.36);
  g.rotateX(tilt);
  g.translate(x, (yTop + yBot) / 2, z);
  return g;
}
function ellipseRing(rx, rz, holeRx, holeRz, depth, y0, zc) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, holeRx, holeRz, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + depth, zc);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const W2 = 24.575;
const FH = 26.3;

// --- Facade (8 parts): wall, pilasters, central bay, exedra, attic, arms, statues, niches.
addPart('facade-wall', 'Palazzo Poli facade wall', 'facade', [
  box(-W2, W2, 0, FH, -2.2, 0),
  box(-W2, W2, 0, 7.5, -0.35, 0.35),
  box(-W2, W2, 7.5, 8.1, -0.5, 0.5),
  box(-W2, W2, 16.8, 18.6, -0.6, 0.6),
  box(-W2, -8.5, 18.6, 20.4, -0.4, 0.4),
  box(8.5, W2, 18.6, 20.4, -0.4, 0.4),
]);
{
  // Six piano nobile windows merged into one part.
  const g = [];
  for (const x of [-20, -14.5, -9, 9, 14.5, 20]) {
    g.push(box(x - 0.9, x + 0.9, 9.5, 13.5, -0.15, 0.1));
    g.push(box(x - 1.15, x + 1.15, 9.3, 13.7, -0.05, 0.25));
    g.push(box(x - 1.3, x + 1.3, 9.0, 9.3, -0.1, 0.45));
  }
  addPart('facade-windows', 'Palazzo Poli windows', 'facade', g);
}
{
  // Eight giant pilasters with capitals merged.
  const g = [];
  for (const x of [-23.2, -17.2, -10.8, -4.6, 4.6, 10.8, 17.2, 23.2]) {
    g.push(box(x - 0.85, x + 0.85, 0, 1.2, -0.35, 0.35));
    g.push(box(x - 0.7, x + 0.7, 1.2, 15.2, -0.35, 0.35));
    g.push(box(x - 1.0, x + 1.0, 15.2, 16.8, -0.45, 0.45));
  }
  addPart('giant-pilasters', 'Giant Corinthian pilasters', 'facade', g);
}
addPart('central-bay', 'Central triumphal arch', 'facade', [
  box(-7, -3.5, 0, 19.4, 0, 2.2),
  box(3.5, 7, 0, 19.4, 0, 2.2),
  box(-7, 7, 15, 19.4, 0, 2.2),
  (() => { const r = new THREE.TorusGeometry(4.4, 0.7, 8, 14, Math.PI); r.translate(0, 15, 2.3); return r; })(),
]);
{
  // Exedra niche, semi-dome, four columns and entablature merged.
  const back = new THREE.CylinderGeometry(3.6, 3.6, 12, 14, 1, true, Math.PI / 2, Math.PI);
  back.translate(0, 9, 1.2);
  const dome = new THREE.SphereGeometry(3.6, 14, 8, Math.PI, Math.PI, 0, Math.PI / 2);
  dome.translate(0, 15, 1.2);
  const g = [back, dome, box(-7.5, 7.5, 14.1, 16.1, 2.0, 4.0)];
  for (const x of [-5.6, -2.6, 2.6, 5.6]) {
    g.push(box(x - 0.75, x + 0.75, 2, 2.8, 2.25, 3.75));
    g.push(cyl(0.55, 0.62, 10.2, x, 8, 3, 10));
    g.push(cyl(0.85, 0.62, 0.9, x, 13.45, 3, 10));
  }
  addPart('exedra-and-columns', 'Exedra and columns', 'facade', g);
}
{
  // Attic block, inscription tablet, and balustrades merged.
  const g = [
    box(-8.5, 8.5, 18.6, 23.8, -1, 1.8),
    box(-8.8, 8.8, 23.8, 24.4, -1, 1.8),
    box(-6, 6, 19.6, 22.6, 1.8, 2.15),
    box(-W2, -8.5, 18.6, 20.4, -0.2, 0.5),
    box(8.5, W2, 18.6, 20.4, -0.2, 0.5),
  ];
  for (let i = 0; i < 4; i++) g.push(box(-5.4, 5.4, 21.9 - i * 0.65, 22.15 - i * 0.65, 2.15, 2.25));
  addPart('attic-block', 'Attic with Clement XII inscription', 'facade', g);
}
{
  // Papal arms with supporting angels merged.
  const g = [
    box(-0.9, 0.9, 23.8, 25.4, 0.05, 0.55),
    cone(0.55, 0.9, 0, 25.85, 0.3, 8),
    strut([-0.7, 23.6, 0.3], [0.7, 25.2, 0.3], 0.12),
    strut([0.7, 23.6, 0.3], [-0.7, 25.2, 0.3], 0.12),
  ];
  for (const x of [-3.8, 3.8]) {
    g.push(...figure(x, 22.6, 0.6, 2.9, { armL: 'up', armR: 'forward' }));
    const w = new THREE.BoxGeometry(1.1, 1.6, 0.24);
    w.translate(x < 0 ? x - 0.6 : x + 0.6, 24.6, 0.2);
    g.push(w);
  }
  addPart('papal-arms-and-angels', 'Papal arms and angels', 'facade', g);
}
{
  // Four season statues merged.
  const g = [];
  for (const [x, yb] of [[-12.5, 20.4], [-5.5, 24.4], [5.5, 24.4], [12.5, 20.4]]) {
    g.push(...figure(x, yb, 0.5, 3.2));
    g.push(box(x - 0.5, x + 0.5, yb, yb + 0.5, 0.1, 0.9));
  }
  addPart('attic-statues', 'Four season statues', 'facade', g);
}
{
  // Both side niches with pediments, pilasters and reliefs merged.
  const g = [];
  for (const xc of [-12.5, 12.5]) {
    g.push(box(xc - 2, xc + 2, 3, 11, -1.2, -0.7));
    g.push(box(xc - 2, xc - 1.6, 3, 11, -0.7, 0.3));
    g.push(box(xc + 1.6, xc + 2, 3, 11, -0.7, 0.3));
    const dome = new THREE.SphereGeometry(2.0, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.8, 0.7);
    dome.translate(xc, 11, -0.4);
    g.push(dome);
    g.push(box(xc - 3, xc + 3, 11, 11.5, -0.3, 0.5));
    g.push(strut([xc - 3, 11.5, 0.1], [xc, 13.4, 0.1], 0.4));
    g.push(strut([xc + 3, 11.5, 0.1], [xc, 13.4, 0.1], 0.4));
    g.push(box(xc - 3.9, xc - 2.7, 2, 11, -0.3, 0.3));
    g.push(box(xc + 2.7, xc + 3.9, 2, 11, -0.3, 0.3));
    g.push(box(xc - 2, xc + 2, 14, 16.4, 0, 0.35)); // relief panel
  }
  addPart('side-niches', 'Abundance and Salubrity niches', 'facade', g);
}

// --- Sculpture (8 parts).
{
  const g = figure(0, 3.2, 5.2, 5.6, { armL: 'up', armR: 'out' });
  g.push(cone(0.3, 0.8, 0, 8.35, 5.45, 6));
  g.push(box(-0.75, 0.75, 3.2, 5.4, 4.85, 5.55));
  addPart('oceanus', 'Oceanus', 'sculpture', g);
}
{
  const g = [];
  const bowl = new THREE.SphereGeometry(2.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bowl.scale(1, 0.55, 0.7);
  bowl.translate(0, 3.4, 5.2);
  g.push(bowl);
  g.push(cyl(0.5, 0.7, 0.8, 0, 2.1, 5.2, 8));
  addPart('shell-chariot', 'Shell chariot', 'sculpture', g);
}
{
  // Both tritons merged: upper bodies, conches, fish tails.
  const g = [];
  for (const x of [-6.4, 6.4]) {
    g.push(...figure(x, 3.4, 6.6, 3.6, { armL: 'forward', armR: 'out' }));
    g.push((() => { const c = new THREE.ConeGeometry(0.24, 0.75, 6); c.rotateX(Math.PI / 2.4); c.translate(x, 6.7, 7.35); return c; })());
    g.push(cyl(0.34, 0.5, 1.7, x, 2.55, 6.6, 6));
    g.push(cone(0.5, 1.1, x, 1.35, 6.6, 6));
  }
  addPart('tritons', 'Tritons', 'sculpture', g);
}
{
  // Both hippocamps merged: one rearing, one calm.
  const g = [];
  const arc = new THREE.TorusGeometry(1.4, 0.38, 6, 10, Math.PI * 0.8);
  arc.translate(-3.6, 3.4, 6.2);
  g.push(arc);
  g.push(box(-5.5, -4.7, 4.8, 5.8, 5.9, 6.5));
  g.push(box(-6.1, -5.5, 4.8, 5.3, 5.95, 6.45));
  g.push(cone(0.55, 1.8, -2.6, 2.8, 6.2, 6));
  const bodyGeo = new THREE.CylinderGeometry(0.42, 0.5, 3.4, 6);
  bodyGeo.rotateZ(Math.PI / 2);
  bodyGeo.translate(3.6, 2.7, 6.2);
  g.push(bodyGeo);
  g.push(strut([5.1, 2.7, 6.2], [5.8, 4.0, 6.2], 0.5));
  g.push(box(5.5, 6.3, 3.8, 4.5, 5.9, 6.5));
  g.push(cone(0.5, 1.6, 1.4, 2.7, 6.2, 6));
  addPart('hippocamps', 'Hippocamps', 'sculpture', g);
}
{
  // Abundance with her urn and cornucopia merged.
  const g = figure(-12.5, 3.2, -0.2, 4.6, { armL: 'down', armR: 'forward' });
  g.push((() => { const u = new THREE.CylinderGeometry(0.42, 0.3, 1.1, 8); u.rotateZ(0.5); u.translate(-13.6, 4.6, 0.4); return u; })());
  const horn = new THREE.TorusGeometry(0.9, 0.32, 6, 10, Math.PI * 0.9);
  horn.rotateZ(Math.PI * 0.15);
  horn.translate(-13.7, 5.6, 0.4);
  g.push(horn);
  g.push(sph(0.22, -14.3, 6.2, 0.4), sph(0.22, -13.9, 6.4, 0.6), sph(0.22, -13.4, 6.1, 0.3));
  addPart('abundance', 'Abundance with cornucopia', 'sculpture', g);
}
{
  // Salubrity with laurel crown, cup and snake merged.
  const g = figure(12.5, 3.2, -0.2, 4.6, { armL: 'forward', armR: 'down' });
  const crown = new THREE.TorusGeometry(0.3, 0.09, 6, 10);
  crown.rotateX(Math.PI / 2 - 0.2);
  crown.translate(12.5, 8.05, -0.2);
  g.push(crown);
  g.push(cyl(0.28, 0.2, 0.5, 12.5, 6.9, 0.9, 8));
  const snake = new THREE.TorusGeometry(0.55, 0.09, 6, 10, Math.PI * 1.2);
  snake.rotateY(Math.PI / 2);
  snake.translate(12.5, 6.6, 0.45);
  g.push(snake);
  addPart('salubrity', 'Salubrity with cup and snake', 'sculpture', g);
}
{
  // Carved flora merged into one part.
  const g = [];
  for (const [x0, x1] of [[-15, -7], [7, 15]]) {
    for (const [fx, fy, fz] of [[0.15, 3.2, 3.0], [0.45, 2.6, 4.4], [0.75, 3.4, 3.2]]) {
      const x = x0 + fx * (x1 - x0);
      g.push(cone(0.16, 0.7, x, fy, fz, 5));
      g.push(sph(0.14, x - 0.25, fy + 0.25, fz - 0.15, 5, 4));
    }
  }
  addPart('carved-plants', 'Carved plants', 'sculpture', g);
}
addPart('asso-di-coppe', 'Asso di coppe vase', 'sculpture', [
  box(18.9, 20.1, 0, 0.6, 1.2, 2.4),
  cyl(0.42, 0.55, 1.3, 19.5, 1.25, 1.8, 10),
  cyl(0.5, 0.42, 0.25, 19.5, 2.0, 1.8, 10),
]);

// --- Rockwork (6 parts).
{
  const g = [];
  for (const [x0, x1, z0, z1, yMax, seed] of [
    [-7, 7, 2, 9, 5.5, 1.3], [-16, -7, 1, 7.5, 4, 2.7], [7, 16, 1, 7.5, 4, 4.1],
  ]) {
    for (let i = 0; i < 6; i++) {
      const x = x0 + ((i + 0.5) / 6) * (x1 - x0);
      const w = ((x1 - x0) / 6) * (0.9 + 0.3 * Math.sin(seed + i * 2.1));
      const h = yMax * (0.55 + 0.45 * Math.sin(seed * 1.7 + i * 1.3));
      const b = new THREE.BoxGeometry(w, h, (z1 - z0) * 0.8);
      b.rotateY(0.12 * Math.sin(seed + i * 3.3));
      b.translate(x, h / 2, z0 + (z1 - z0) * 0.45);
      g.push(b);
    }
  }
  addPart('reef', 'Travertine reef', 'rockwork', g);
}
{
  const g = [];
  for (const [x0, x1] of [[-15, -8], [8, 15]]) {
    for (const [fx, bz, i] of [[0.15, 6.5, 0], [0.5, 7.5, 1], [0.8, 6.2, 2]]) {
      const x = x0 + fx * (x1 - x0);
      const b = new THREE.BoxGeometry(1.8, 1.6 + 0.5 * (i % 2), 1.8);
      b.rotateY(0.3 * (i - 1));
      b.translate(x, 0.8, bz);
      g.push(b);
    }
  }
  addPart('boulders', 'Reef boulders', 'rockwork', g);
}
{
  const g = [];
  for (const [i, y, z, r] of [[1, 4.2, 7.5, 3.0], [2, 3.0, 8.8, 3.6], [3, 1.8, 10.2, 4.2]]) {
    const rim = new THREE.CylinderGeometry(r, r, 0.5, 16, 1, false, -Math.PI / 2, Math.PI);
    rim.translate(0, y, z);
    g.push(rim);
  }
  addPart('cascade-shelves', 'Cascade shelves', 'rockwork', g);
}
{
  const g = [];
  for (const x of [-11, 11]) {
    g.push(box(x - 1.4, x + 1.4, 0.4, 2.6, 3.2, 4.4));
    const arch = new THREE.TorusGeometry(1.5, 0.35, 6, 10, Math.PI);
    arch.translate(x, 2.6, 4.4);
    g.push(arch);
  }
  addPart('grottoes', 'Rock grottoes', 'rockwork', g);
}
{
  const g = [];
  for (const x of [-9.5, 9.5]) {
    const b = new THREE.BoxGeometry(3.2, 3.2, 4);
    b.rotateY(x < 0 ? 0.25 : -0.25);
    b.translate(x, 1.6, 8.5);
    g.push(b);
  }
  addPart('rock-spurs', 'Rock spurs', 'rockwork', g);
}
addPart('reef-plants', 'Reef plants', 'rockwork', [
  cone(0.16, 0.7, -11, 3.4, 4.0, 5),
  cone(0.16, 0.7, 11, 3.4, 4.0, 5),
]);

// --- Water (4 parts).
{
  const g = [];
  for (const [yTop, yBot, z, w] of [[4.4, 2.8, 10.4, 5.6], [3.2, 1.6, 11.9, 6.8], [2.0, 1.2, 13.6, 8.0]]) {
    g.push(sheet(0, yTop, yBot, z, w));
  }
  addPart('cascade-sheets', 'Cascade sheets', 'water', g);
}
{
  const disc = new THREE.CircleGeometry(10.5, 40);
  disc.rotateX(-Math.PI / 2);
  disc.scale(1, 1, 6.8 / 10.5);
  disc.translate(0, 1.15, 15.5);
  addPart('basin-water', 'Basin water', 'water', [disc]);
}
addPart('niche-streams', 'Niche water streams', 'water', [
  sheet(-13.6, 4.4, 1.6, 2.6, 0.7, 0.3),
  sheet(13.0, 5.2, 1.6, 2.4, 0.5, 0.3),
]);
addPart('reef-spills', 'Reef spill streams', 'water', [
  sheet(-9.5, 3.0, 1.2, 11.5, 1.6, 0.35),
  sheet(9.5, 3.0, 1.2, 11.5, 1.6, 0.35),
]);

// --- Basin (5 parts).
addPart('basin-shell', 'Great basin', 'basin', [
  ellipseRing(12, 8, 10.8, 6.8, 1.7, 0, 15.5),
  ellipseRing(12.5, 8.5, 10.8, 6.8, 0.28, 1.7, 15.5),
  ellipseRing(14.5, 10.2, 12.5, 8.5, 0.22, 0, 15.5),
]);
{
  const floor = new THREE.CircleGeometry(10.8, 40);
  floor.rotateX(-Math.PI / 2);
  floor.scale(1, 1, 6.8 / 10.8);
  floor.translate(0, 0.15, 15.5);
  addPart('basin-floor', 'Basin floor', 'basin', [floor]);
}
{
  const g = [];
  for (const x of [-8.5, 8.5, 0]) {
    for (let i = 0; i < 4; i++) {
      g.push(box(x - 1.5, x + 1.5, 1.55 - (i + 1) * 0.35, 1.7 - i * 0.35, 23.5 - i * 0.9, 24.4 - i * 0.9));
    }
  }
  addPart('basin-steps', 'Basin steps', 'basin', g);
}
{
  const g = [];
  for (const [cx, cz] of [[-6, 12.5], [-3, 14], [2, 12], [5, 15], [-1, 17], [7, 13.5], [-8, 15.5], [3.5, 18]]) {
    g.push(cyl(0.12, 0.12, 0.04, cx, 1.22, cz, 8));
  }
  addPart('basin-coins', 'Coins in the basin', 'basin', g);
}
{
  const g = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.push(box(11.6 * Math.cos(a) - 0.12, 11.6 * Math.cos(a) + 0.12, 1.98, 2.14, 15.5 + 8.1 * Math.sin(a) - 0.12, 15.5 + 8.1 * Math.sin(a) + 0.12));
  }
  addPart('basin-lights', 'Basin lights', 'basin', g);
}

// --- Setting (5 parts): piazza, barriers, waterworks.
addPart('piazza-pavement', 'Piazza pavement', 'setting', [
  box(-32, 32, -0.5, 0, 20, 46),
  box(-32, 32, 0, 0.35, 19.6, 20.2),
]);
{
  const g = [];
  for (let x = -8; x <= 8; x += 4) {
    g.push(cyl(0.06, 0.08, 1.1, x, 0.55, 27, 6));
    g.push(sph(0.09, x, 1.14, 27, 6, 5));
  }
  for (let x = -8; x < 8; x += 4) g.push(strut([x, 0.95, 27], [x + 4, 0.95, 27], 0.07));
  addPart('queue-barriers', 'Visitor queue barriers', 'setting', g);
}
addPart('piazza-lamp', 'Piazza lamp', 'setting', [
  cyl(0.09, 0.13, 6, 24, 3, 32, 6),
  box(23.6, 24.4, 5.9, 6.5, 31.7, 32.3),
]);
addPart('acqua-vergine-feed', 'Acqua Vergine feed', 'setting', [
  box(-0.8, 0.8, 0.3, 1.3, -2, 4),
  box(-1.1, 1.1, 1.3, 1.6, -2, 4),
  (() => { const p = new THREE.CylinderGeometry(0.16, 0.16, 20, 6); p.rotateZ(Math.PI / 2); p.translate(0, 1.0, 3.8); return p; })(),
]);
addPart('recirculating-pumps', 'Recirculating pumps', 'setting', [
  box(-11.8, -11.0, 0, 1.5, 3.4, 5.0),
  box(-10.0, -9.2, 0, 1.5, 3.4, 5.0),
  cyl(0.35, 0.35, 1.0, -11.4, 2.0, 4.2, 8),
  cyl(0.35, 0.35, 1.0, -9.6, 2.0, 4.2, 8),
]);

// ---------------------------------------------------------------- systems & colors
// System colors follow the same scheme as the detailed variant: travertine
// cream for the architecture, pale marble for sculpture, warm tan for
// rockwork, blue for water.
const systems = [
  { id: 'facade', name: 'Palazzo Poli facade', color: '#e8ddc8' },
  { id: 'sculpture', name: 'Sculpture', color: '#f0ece2' },
  { id: 'rockwork', name: 'Rockwork reef', color: '#c9bda6' },
  { id: 'water', name: 'Water', color: '#4fa3c7' },
  { id: 'basin', name: 'Great basin', color: '#d9cfae' },
  { id: 'setting', name: 'Setting', color: '#b8b2a6' },
];
const systemColors = Object.fromEntries(systems.map((s) => [s.id, s.color]));
function colorFor(partId) {
  const gold = '#c9a227';
  const glow = '#ffe9a8';
  const terra = '#b56a3f';
  const aqua = '#6db8d8';
  const leaf = '#6a8f5f';
  const dark = '#5a6470';
  const p = parts.find((x) => x.id === partId);
  switch (partId) {
    case 'facade-windows':
      return dark;
    case 'papal-arms-and-angels':
      return '#b8a06a';
    case 'basin-water':
      return '#57add3';
    case 'cascade-sheets':
    case 'niche-streams':
    case 'reef-spills':
      return aqua;
    case 'basin-coins':
      return gold;
    case 'basin-lights':
      return glow;
    case 'asso-di-coppe':
      return terra;
    case 'carved-plants':
    case 'reef-plants':
      return leaf;
    case 'queue-barriers':
      return '#4a4a4a';
    case 'piazza-lamp':
      return '#3a3a3a';
    default:
      return systemColors[p.system];
  }
}

// ---------------------------------------------------------------- explanations
const explanations = {
  'palazzo poli facade wall':
    'The screen wall of Palazzo Poli, the palace Nicola Salvi turned into the backdrop of the fountain. Its lower storey is rusticated and carries a balustrade that the side wings of the facade extend.',
  'palazzo poli windows':
    'The six piano nobile windows of Palazzo Poli with their frames, sills and balusters, set behind the giant pilasters.',
  'giant corinthian pilasters':
    'The giant order of Corinthian pilasters that links the two main storeys of the facade, the element that unifies the palace screen and the triumphal arch.',
  'central triumphal arch':
    'The triumphal arch superimposed on the palace facade: two projecting bays carry the arch ring and frame the central exedra.',
  'exedra and columns':
    'The central exedra, a deep semicircular niche with a semi-dome and four free-standing columns that create strong light and shade around Oceanus.',
  'attic with clement xii inscription':
    'The attic storey over the central bay, carrying the 1735 inscription tablet that records Clement XII honoring the Acqua Vergine with a magnificent adornment.',
  'papal arms and angels':
    'The coat of arms of Clement XII set on the attic, held aloft by two angels against the Roman sky.',
  'four season statues':
    'The four allegorical statues of the seasons set across the attic and balustrades, crowning the composition.',
  'abundance and salubrity niches':
    'The two side niches of the facade, each with a domed recess, flanking pilasters, a pediment and a relief panel above.',
  oceanus:
    'Oceanus, god of all water, standing tall on the shell chariot. Pietro Bracci carved him larger than the other figures to mark his rank.',
  'shell chariot':
    'The shell-shaped chariot on which Oceanus stands, pulled by the two hippocamps he guides.',
  tritons:
    'The two tritons who lead the hippocamps and blow their conch shells, one on each side of Oceanus.',
  hippocamps:
    'The two seahorses of Oceanus: one agitated and rearing, one calm, the pair expressing the fountain theme of taming the waters.',
  'abundance with cornucopia':
    'Abundance in the west niche, pouring water from her urn and holding the cornucopia, the horn of plenty.',
  'salubrity with cup and snake':
    'Salubrity in the east niche, crowned with laurel and holding a cup from which a snake drinks, the Roman symbol of health.',
  'carved plants':
    'The carved plants and foliage that grow from the rockwork, over thirty species rendered in stone around the reef.',
  'asso di coppe vase':
    'The large vase on the eastern balustrade nicknamed the asso di coppe, the ace of cups, which Salvi is said to have placed to hide a barber shop sign.',
  'travertine reef':
    'The travertine reef, the rocky mound of Tivoli stone from which the water cascades, representing the rugged water sources.',
  'reef boulders':
    'The loose boulders scattered across the reef, giving the mound its rugged profile against the palace screen.',
  'cascade shelves':
    'The stepped cascade shelves carved into the reef, which break the falling water into the white foaming sheets seen in the fountain.',
  'rock grottoes':
    'The rock grottoes set into the reef, shadowed recesses that add depth to the mound.',
  'rock spurs':
    'The rock spurs projecting from the reef toward the basin, framing the streams that fall into the pool.',
  'reef plants':
    'The plants and grasses carved along the reef edges, softening the travertine stonework.',
  'cascade sheets':
    'The falling sheets of water that cascade down the reef in three foaming curtains toward the basin.',
  'basin water':
    'The surface of the great basin, the pool that receives all the cascading water.',
  'niche water streams':
    'The streams pouring from the side niches: from the urn of Abundance in the west and beneath the cup of Salubrity in the east.',
  'reef spill streams':
    'The spill streams running off the reef spurs into the basin, the last fall before the pool.',
  'great basin':
    'The great lower basin of the fountain, the broad pool that gathers every stream and holds the fountain coin tradition.',
  'basin floor':
    'The floor of the great basin beneath the water surface, where coins and sediment settle.',
  'basin steps':
    'The steps descending into the basin from the rim, the flights on which visitors stand closest to the water.',
  'coins in the basin': 'The coins thrown into the basin by visitors, the tradition said to guarantee a return to Rome, collected for charity.',
  'basin lights':
    'The lights set around the basin rim, part of the 100-plus LED installation added in the 2014 to 2015 restoration, which bathes the fountain at night.',
  'piazza pavement':
    'The pavement of Piazza di Trevi, the small square that opens out before the fountain.',
  'visitor queue barriers':
    'The queue barriers that manage the flow of visitors, part of the ticketing and queuing system introduced in 2024.',
  'piazza lamp':
    'One of the street lamps of the piazza, lighting the square around the fountain after dark.',
  'acqua vergine feed':
    'The Acqua Vergine feed, the conduit that brings the ancient aqueduct water behind the palace wall to the fountain.',
  'recirculating pumps':
    'The recirculating pumps housed below the reef, which have returned the fountain water to the basin since 1998.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract: per part, 4-byte aligned Float32 positions, Int16
// normals and Uint32 indices in one binary chunk; atlas.json carries byte
// offsets, bounds, explanations, concepts and triangles.
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
const binName = 'trevi-fountain-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the trevi-fountain-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Trevi Fountain, Rome (simple schematic)',
  title: 'Trevi Fountain',
  location: 'Rome, Italy',
  blurb: 'Rome\u2019s Trevi Fountain, the largest Baroque fountain in the world, in simplified schematic form: Oceanus and his tritons, the Palazzo Poli facade, the rockwork reef, and the great basin.',
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
  chunks: [{ url: '/models/trevi-fountain-simple/trevi-fountain-simple-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so compact packings clip at the top of the
  // frame. 2.0 restores full framing (same value as Tower Bridge simple).
  spread: 2.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
