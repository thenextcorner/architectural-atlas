// Procedural One World Trade Center for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned One World Trade Center in code
// and writes it in the atlas binary format:
//   public/models/one-world-trade-center/atlas.json
//   public/models/one-world-trade-center/one-world-trade-center-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/one-world-trade-center-attribution.md,
// opened 2026-09-30):
//   One World Trade Center (1 WTC), 285 Fulton Street, Lower Manhattan, New
//   York City; main building of the rebuilt World Trade Center complex;
//   1,776 ft (541.3 m) architectural height including the spire, a deliberate
//   reference to 1776; tip 1,792 ft (546.2 m); roof 1,368 ft (417.0 m),
//   identical to the original North Tower roof; top floor 1,268 ft (386.5 m);
//   tallest building in the United States and the Western Hemisphere since the
//   2013 CTBUH ruling that the 408 ft structure is a spire, not an antenna;
//   northwest corner of the 16-acre World Trade Center site, on the site of
//   the original 6 World Trade Center; bounded by West Street (west), Vesey
//   Street (north), Fulton Street (south), Washington Street (east); 9/11
//   Memorial fountains just south of the tower; architect David Childs of
//   Skidmore, Owings and Merrill (SOM); spire designed with artist Kenneth
//   Snelson; developer Port Authority of New York and New Jersey (Durst
//   Organization co-developer from 2010); structural engineer WSP Cantor
//   Seinuk; MEP Jaros, Baum and Bolles; main contractor Tishman Construction;
//   construction started 27 April 2006; steel topped out 30 August 2012;
//   spire completed 10 May 2013; opened 3 November 2014; One World Observatory
//   opened 29 May 2015; cost US$3.9 billion (Architectural Record lists $3.19
//   billion construction cost); 94 floors (+5 below ground), 28 mechanical,
//   top floor numbered 104, floors 94-99 skipped, 71 office floors,
//   colloquially 104 stories; floor area 3,501,274 sq ft; 73 elevators;
//   200 ft (61 m) square footprint, about 40,000 sq ft floor plates, nearly
//   identical to the original Twin Towers; 185 ft (56 m) windowless concrete
//   base with 28-inch-thick walls (Architectural Record measures 186 ft);
//   original 2,000-pane prismatic glass base scheme scrapped 2011 as
//   unworkable; built base clad in angled glass fins over stainless steel
//   slats, LED lit at night, with four monumental entrances and a 55 ft lobby;
//   from the 20th floor up the square corners chamfer back into eight tall
//   isosceles triangles (an elongated square antiprism), a perfect octagon at
//   midheight, culminating in a glass parapet whose plan is a square 150 ft on
//   a side rotated 45 degrees from the base; chamfered corners carry slotted
//   stainless steel detailing; prismatic glass curtain wall by Benson
//   Industries with Viracon glass, panels 13.33 ft tall floor to floor, up to
//   2,720 kg each, 5 ft module, 13 ft 4 in slab to slab, about 1 million sq ft
//   of glazing; cable-net glass facade panels by Schlaich Bergermann Partner;
//   redundant steel moment frame at the perimeter paired with a reinforced
//   concrete core shear wall (14,000 psi concrete, 110 ft square, walls 4.5 ft
//   at the base slimming to 2 ft) against progressive collapse; core encloses
//   extra-wide pressurized egress stairs, a first-responder stair, and a
//   fireman's lift; 800-ton 408 ft (124 m) sculpted spire (Wikipedia infobox
//   lists 407.9 ft) on a circular support ring with broadcast and maintenance
//   equipment, cable-stayed, RF-transparent cylindrical enclosure,
//   communications ring at its base, beacon light at 1,776 ft echoing the
//   Statue of Liberty's torch, projecting a beam over 1,000 ft above the
//   tower at night; One World Observatory on floors 100-102 at 1,268 ft,
//   125,000 sq ft: main viewing on floor 100 (City Pulse, 14 ft Sky Portal
//   disc), restaurants on floor 101, See Forever Theater and event space on
//   floor 102, five Sky Pod elevators reaching the 102nd floor in under 60
//   seconds; designed for LEED Gold.
// Schematic (not sourced, never stated as fact in the UI): exact chamfer
// profiles, facet subdivision, fin angles and spacing, slot patterns,
// spandrel band positions, column sizes and positions, outrigger layout,
// core taper above the base, stair and lift shaft positions, mechanical floor
// ranges and louver patterns, observatory interior fit-out, spire taper and
// cable-stay layout, radome and ring equipment arrangement, plaza extent,
// memorial pool and tree placement, street widths, bollard positions, and
// below-grade concourse and tunnel routing.
//
// Granularity: 117 named parts across 10 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-one-world-trade-center.mjs
// (Run generate-one-world-trade-center-simple.mjs first: the freshness gate
// below reads its atlas.json.)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'one-world-trade-center');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (schematic beacon beam tip, 612 m) maps to 2.4 units.
const SPIRE_TOP = 1776 * 0.3048; // 541.33 m
const BEAM_TOP = 612;
const S = 2.4 / BEAM_TOP;

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
function cyl(rt, rb, h, x, y, z, seg = 12, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  g.translate(x, y, z);
  return g;
}
// Square frustum centered on the y axis, faces toward the cardinals.
function taperedSquare(y0, y1, s0, s1) {
  const g = new THREE.CylinderGeometry(s1 * Math.SQRT2, s0 * Math.SQRT2, y1 - y0, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

// ---------------------------------------------------------------- massing
// Plan: x east, z south, y up, metres. The tower cross-section is an octagon
// whose 8 vertices alternate between cardinal directions (face centers at
// the base, corners of the rotated crown square at the top) and diagonal
// directions (base corners shrinking to crown face centers).
const FT = 0.3048;
const BASE_HALF = 100 * FT; // 30.48, half of the 200 ft square base
const BASE_H = 185 * FT; // 56.39, top of the fortified podium
const PARAPET_Y = 1368 * FT; // 416.97, glass parapet top
const CROWN_HALF = 75 * FT; // 22.86, half side of the 150 ft rotated crown square
const CROWN_CORNER = 75 * Math.SQRT2 * FT; // 32.33
const BASE_CORNER = 100 * Math.SQRT2 * FT; // 43.10
function ringAt(t) {
  const rc = BASE_HALF * (1 - t) + CROWN_CORNER * t;
  const rd = BASE_CORNER * (1 - t) + CROWN_HALF * t;
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4; // 0 east, 2 south, 4 west, 6 north
    const r = k % 2 === 0 ? rc : rd;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}
const yAt = (t) => BASE_H + t * (PARAPET_Y - BASE_H);
const tOf = (y) => (y - BASE_H) / (PARAPET_Y - BASE_H);
// Quad strip over the octagon rings between the given t levels, using the
// given ring vertex columns. Winding is outward for every face.
function panelStrip(ts, cols, out = 0, shrink = 1) {
  const pos = [];
  const idx = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const rA = ringAt(ts[i]);
    const rB = ringAt(ts[i + 1]);
    const yA = yAt(ts[i]);
    const yB = yAt(ts[i + 1]);
    for (let j = 0; j < cols.length - 1; j++) {
      const c0 = cols[j];
      const c1 = cols[j + 1];
      const P = (r, c, y) => {
        let [x, z] = r[c];
        x *= shrink;
        z *= shrink;
        if (out) {
          const l = Math.hypot(x, z) || 1;
          x = (x / l) * (l + out);
          z = (z / l) * (l + out);
        }
        return [x, y, z];
      };
      const a0 = P(rA, c0, yA);
      const a1 = P(rA, c1, yA);
      const b1 = P(rB, c1, yB);
      const b0 = P(rB, c0, yB);
      const v = pos.length / 3;
      pos.push(...a0, ...a1, ...b1, ...b0);
      idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
// Thin octagonal band at height yAt(t)+dy, half thickness `half`, pushed
// outward by `out`. Side plus top annulus cap.
function octBand(t, dy, half, out) {
  const geoms = [];
  const r = ringAt(t);
  const y = yAt(t) + dy;
  const off = (p) => {
    const l = Math.hypot(p[0], p[1]) || 1;
    return [(p[0] / l) * (l + out), (p[1] / l) * (l + out)];
  };
  const ro = r.map(off);
  const side = [];
  const sidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = side.length / 3;
    const [ax, az] = ro[k];
    const [bx, bz] = ro[k2];
    side.push(ax, y - half, az, bx, y - half, bz, bx, y + half, bz, ax, y + half, az);
    sidx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(side, 3));
  sg.setIndex(sidx);
  geoms.push(sg);
  const top = [];
  const tidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = top.length / 3;
    const [ax, az] = r[k];
    const [bx, bz] = r[k2];
    const [cx, cz] = ro[k];
    const [dx, dz] = ro[k2];
    top.push(ax, y + half, az, bx, y + half, bz, dx, y + half, dz, cx, y + half, cz);
    tidx.push(v, v + 1, v + 2, v, v + 2, v + 3);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(top, 3));
  tg.setIndex(tidx);
  geoms.push(tg);
  return geoms;
}
// Solid octagonal slab at height yAt(t)+dy.
function octSlab(t, dy, half, shrink = 1) {
  const r = ringAt(t).map(([x, z]) => [x * shrink, z * shrink]);
  const y = yAt(t) + dy;
  const geoms = [];
  const side = [];
  const sidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = side.length / 3;
    const [ax, az] = r[k];
    const [bx, bz] = r[k2];
    side.push(ax, y - half, az, bx, y - half, bz, bx, y + half, bz, ax, y + half, az);
    sidx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(side, 3));
  sg.setIndex(sidx);
  geoms.push(sg);
  for (const sgn of [1, -1]) {
    const cap = [];
    const cidx = [];
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const v = cap.length / 3;
      const [ax, az] = r[k];
      const [bx, bz] = r[k2];
      cap.push(0, y + sgn * half, 0, ax, y + sgn * half, az, bx, y + sgn * half, bz);
      if (sgn > 0) cidx.push(v, v + 2, v + 1);
      else cidx.push(v, v + 1, v + 2);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
    cg.setIndex(cidx);
    geoms.push(cg);
  }
  return geoms;
}

// Face column sets: [name, cols]. Cardinals are face centers, odds are chamfers.
const FACES = [
  ['south', [1, 2, 3]],
  ['west', [3, 4, 5]],
  ['north', [5, 6, 7]],
  ['east', [7, 0, 1]],
];
const CHAMFERS = [
  ['southeast', [0, 1, 2], 1],
  ['southwest', [2, 3, 4], 3],
  ['northwest', [4, 5, 6], 5],
  ['northeast', [6, 7, 0], 7],
];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Fortified base and podium: 200 ft square, 185 ft tall, 28 in walls.
addPart('base-body', 'Base concrete body', 'base', [
  box(-BASE_HALF, BASE_HALF, 0, BASE_H, -BASE_HALF, BASE_HALF),
]);
{
  const w = 28 * 0.0254; // 28 in walls
  addPart('base-blast-walls', 'Base blast walls', 'base', [
    box(-BASE_HALF, BASE_HALF, 0, BASE_H, -BASE_HALF, -BASE_HALF + w),
    box(-BASE_HALF, BASE_HALF, 0, BASE_H, BASE_HALF - w, BASE_HALF),
    box(-BASE_HALF, -BASE_HALF + w, 0, BASE_H, -BASE_HALF, BASE_HALF),
    box(BASE_HALF - w, BASE_HALF, 0, BASE_H, -BASE_HALF, BASE_HALF),
  ]);
}
{
  // Stainless steel slats behind the fins: three strips per face.
  const g = [];
  for (const y of [10, 28, 46]) {
    g.push(box(-BASE_HALF - 0.4, BASE_HALF + 0.4, y - 0.5, y + 0.5, -BASE_HALF - 0.5, -BASE_HALF));
    g.push(box(-BASE_HALF - 0.4, BASE_HALF + 0.4, y - 0.5, y + 0.5, BASE_HALF, BASE_HALF + 0.5));
    g.push(box(-BASE_HALF - 0.5, -BASE_HALF, y - 0.5, y + 0.5, -BASE_HALF - 0.4, BASE_HALF + 0.4));
    g.push(box(BASE_HALF, BASE_HALF + 0.5, y - 0.5, y + 0.5, -BASE_HALF - 0.4, BASE_HALF + 0.4));
  }
  addPart('base-slats', 'Base stainless steel slats', 'base', g);
}
for (const [fname, fz, horiz] of [
  ['north', -1, true],
  ['south', 1, true],
  ['east', 1, false],
  ['west', -1, false],
]) {
  const g = [];
  for (let i = -14; i <= 14; i++) {
    const c = i * 2;
    if (horiz) g.push(box(c - 0.09, c + 0.09, 2, BASE_H, fz * (BASE_HALF + 0.6), fz * (BASE_HALF + 1.1)));
    else g.push(box(fz * (BASE_HALF + 0.6), fz * (BASE_HALF + 1.1), 2, BASE_H, c - 0.09, c + 0.09));
  }
  addPart(`base-fins-${fname}`, `Base glass fins ${fname}`, 'base', g);
}
for (const [fname, fz, horiz] of [
  ['north', -1, true],
  ['south', 1, true],
  ['east', 1, false],
  ['west', -1, false],
]) {
  const g = [];
  if (horiz) {
    g.push(box(-6, 6, 0, 12, fz * (BASE_HALF - 0.5), fz * (BASE_HALF + 0.6)));
    g.push(box(-8, 8, 11.6, 12.4, fz * (BASE_HALF - 2), fz * (BASE_HALF + 3.4)));
    g.push(box(-7.4, -6.4, 0, 13, fz * (BASE_HALF - 0.5), fz * (BASE_HALF + 1.4)));
    g.push(box(6.4, 7.4, 0, 13, fz * (BASE_HALF - 0.5), fz * (BASE_HALF + 1.4)));
  } else {
    g.push(box(fz * (BASE_HALF - 0.5), fz * (BASE_HALF + 0.6), 0, 12, -6, 6));
    g.push(box(fz * (BASE_HALF - 2), fz * (BASE_HALF + 3.4), 11.6, 12.4, -8, 8));
    g.push(box(fz * (BASE_HALF - 0.5), fz * (BASE_HALF + 1.4), 0, 13, -7.4, -6.4));
    g.push(box(fz * (BASE_HALF - 0.5), fz * (BASE_HALF + 1.4), 0, 13, 6.4, 7.4));
  }
  addPart(`base-entrance-${fname}`, `Base entrance ${fname}`, 'base', g);
}
addPart('lobby', 'Lobby interior', 'base', [box(-28, 28, 0, 55 * FT, -28, 28)]);
{
  const g = [box(-26, 26, 55 * FT, BASE_H, -26, 26)];
  for (const y of [24, 36, 48]) {
    g.push(box(-BASE_HALF - 0.3, BASE_HALF + 0.3, y - 0.8, y + 0.8, -BASE_HALF - 0.4, -BASE_HALF));
    g.push(box(-BASE_HALF - 0.3, BASE_HALF + 0.3, y - 0.8, y + 0.8, BASE_HALF, BASE_HALF + 0.4));
  }
  addPart('lower-mechanical', 'Lower mechanical floors', 'base', g);
}

// --- Glass facade facets: four tapering faces in three tiers each.
const TIERS = [
  ['lower', [0, 1 / 6, 1 / 3]],
  ['middle', [1 / 3, 1 / 2, 2 / 3]],
  ['upper', [2 / 3, 5 / 6, 1]],
];
for (const [fname, cols] of FACES) {
  for (const [tname, ts] of TIERS) {
    addPart(`face-${fname}-${tname}`, `${fname[0].toUpperCase() + fname.slice(1)} glass face, ${tname} tier`, 'facade', [
      panelStrip(ts, cols),
    ]);
  }
}
for (const [i, t] of [0.12, 0.27, 0.42, 0.57, 0.72, 0.84].entries()) {
  addPart(`spandrel-${i}`, `Spandrel band ${'ABCDEF'[i]}`, 'facade', octBand(t, 0, 0.55, 0.55));
}
addPart('glass-parapet', 'Glass parapet', 'facade', [panelStrip([tOf(405), 1], [0, 1, 2, 3, 4, 5, 6, 7])]);
addPart('parapet-coping', 'Parapet coping', 'facade', octBand(1, -0.3, 0.3, 0.4));

// --- Chamfered corners: four chamfers in two segments, plus slot screens.
for (const [cname, cols, diag] of CHAMFERS) {
  addPart(`chamfer-${cname}-lower`, `${cname[0].toUpperCase() + cname.slice(1)} chamfer, lower panel`, 'corners', [
    panelStrip([0, 0.25, 0.5], cols),
  ]);
  addPart(`chamfer-${cname}-upper`, `${cname[0].toUpperCase() + cname.slice(1)} chamfer, upper panel`, 'corners', [
    panelStrip([0.5, 0.75, 1], cols),
  ]);
  for (const [sname, t0, t1] of [['lower', 0, 0.5], ['upper', 0.5, 1]]) {
    const rA = ringAt(t0)[diag];
    const rB = ringAt(t1)[diag];
    addPart(`chamfer-${cname}-slots-${sname}`, `${cname[0].toUpperCase() + cname.slice(1)} corner slots, ${sname}`, 'corners', [
      strut([rA[0] * 1.015, yAt(t0), rA[1] * 1.015], [rB[0] * 1.015, yAt(t1), rB[1] * 1.015], 1.5, 0.7),
    ]);
  }
}

// --- Concrete core: 110 ft square shear wall core.
addPart('core-lower', 'Concrete core, lower tube', 'core', [taperedSquare(0, 200, 110 * FT / 2, 13.5)]);
addPart('core-upper', 'Concrete core, upper tube', 'core', [taperedSquare(200, PARAPET_Y, 13.5, 10)]);
addPart('core-blast-base', 'Core blast wall base', 'core', [taperedSquare(0, BASE_H, 19, 16.76)]);
addPart('core-transfer', 'Core transfer slab', 'core', [box(-17, 17, BASE_H - 1, BASE_H + 1, -17, 17)]);
for (const [sname, sx] of [['a', -8], ['b', 8]]) {
  const g = [box(sx - 1.4, sx + 1.4, 0, PARAPET_Y - 24, -11, 11)];
  for (let y = 30; y < PARAPET_Y - 30; y += 40) g.push(box(sx - 2.6, sx + 2.6, y, y + 1, -11, 11));
  addPart(`core-stair-${sname}`, `Core stair ${sname.toUpperCase()}`, 'core', g);
}
addPart('fireman-lift', 'Fireman\u2019s lift shaft', 'core', [box(11.5, 14.5, 0, PARAPET_Y - 24, -4, 4)]);
addPart('core-chase', 'Core mechanical chase', 'core', [box(-14.5, -11.5, 0, 393, -4, 4)]);

// --- Structural frame: perimeter moment frame columns and outriggers.
for (const [fname, cols] of FACES) {
  const c = cols[1];
  const rA = ringAt(0)[c].map((v) => v * 0.94);
  const rB = ringAt(1)[c].map((v) => v * 0.94);
  const g = [];
  for (let i = 0; i < 5; i++) {
    const f = i / 4 - 0.5;
    const off = 6 * f;
    g.push(strut([rA[0] + off, BASE_H, rA[1]], [rB[0] + off * 0.7, PARAPET_Y, rB[1]], 1.6));
  }
  addPart(`columns-${fname}`, `Perimeter columns, ${fname} face`, 'structure', g);
}
for (const [cname, , diag] of CHAMFERS) {
  const rA = ringAt(0)[diag].map((v) => v * 0.94);
  const rB = ringAt(1)[diag].map((v) => v * 0.94);
  addPart(`columns-${cname}`, `Perimeter columns, ${cname} chamfer`, 'structure', [
    strut([rA[0], BASE_H, rA[1]], [rB[0], PARAPET_Y, rB[1]], 1.8),
    strut([rA[0] * 0.97, BASE_H, rA[1] * 0.97], [rB[0] * 0.97, PARAPET_Y, rB[1] * 0.97], 1.2),
  ]);
}
for (const [oname, y] of [['lower', 200], ['upper', 399]]) {
  addPart(`outriggers-${oname}`, `Outrigger trusses, ${oname}`, 'structure', [
    box(-34, 34, y - 1.2, y + 1.2, -1.6, 1.6),
    box(-1.6, 1.6, y - 1.2, y + 1.2, -34, 34),
  ]);
}

// --- Mechanical floors.
{
  const g = octBand(tOf(399), 0, 6, 1.1);
  for (let k = 0; k < 8; k++) {
    const r = ringAt(tOf(399))[k];
    const l = Math.hypot(r[0], r[1]) || 1;
    for (const dy of [-3.5, 0, 3.5]) {
      g.push(box(
        (r[0] / l) * (l + 0.7) - 0.5, (r[0] / l) * (l + 0.7) + 0.5,
        399 + dy - 0.35, 399 + dy + 0.35,
        (r[1] / l) * (l + 0.7) - 0.5, (r[1] / l) * (l + 0.7) + 0.5,
      ));
    }
  }
  addPart('mech-upper', 'Upper mechanical floor band', 'mechanical', g);
}
addPart('sky-lobby', 'Sky lobby', 'mechanical', [box(-24, 24, 358, 366.5, -24, 24)]);
addPart('mech-penthouse', 'Rooftop mechanical penthouse', 'mechanical', [
  box(-14, 14, 405, 412, -14, 14),
  box(-9, 9, 412, 414, -9, 9),
]);
addPart('cooling-plant', 'Cooling plant', 'mechanical', [
  box(-22, -12, 405, 409, -8, 8),
  box(12, 22, 405, 409, -8, 8),
  box(-6, 6, 405, 408.5, 12, 20),
]);
for (const [fname, cols] of FACES) {
  addPart(`vent-${fname}`, `Ventilation louvers ${fname}`, 'mechanical', [
    panelStrip([tOf(393), tOf(405)], cols, 0.9),
  ]);
}

// --- Observatory: floors 100 to 102 at about 1,268 ft.
addPart('obs-slab-100', 'Observatory floor 100 slab', 'observatory', octSlab(tOf(378), 0, 0.6, 0.96));
for (const [fname, cols] of FACES) {
  addPart(`obs-glass-${fname}`, `Observatory glass wall ${fname}`, 'observatory', [
    panelStrip([tOf(381), tOf(393)], cols, 0, 0.965),
  ]);
}
{
  const ring = new THREE.TorusGeometry(18, 0.8, 8, 48);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 383, 0);
  addPart('city-pulse', 'City Pulse ring', 'observatory', [ring]);
}
addPart('sky-portal', 'Sky Portal disc', 'observatory', [cyl(14 * FT / 2, 14 * FT / 2, 0.3, 0, 381.6, 0, 24)]);
{
  const g = octSlab(tOf(385), 0, 0.5, 0.94);
  g.push(box(-16, 16, 385.5, 388.6, -16, 16));
  g.push(box(-16, -10, 385.5, 388, -6, 6));
  g.push(box(10, 16, 385.5, 388, -6, 6));
  addPart('dining-101', 'Floor 101 dining level', 'observatory', g);
}
{
  const g = octSlab(tOf(389), 0, 0.5, 0.94);
  for (let i = 0; i < 4; i++) g.push(box(-14 + i * 1.2, 14 - i * 1.2, 389.5 + i * 0.9, 390.4 + i * 0.9, -10, 2));
  g.push(box(-13, 13, 389.5, 394, -14.5, -13.5));
  addPart('theater-102', 'Floor 102 theater level', 'observatory', g);
}
addPart('theater-screen', 'See Forever theater screen', 'observatory', [
  box(-12, 12, 390, 394.5, -15.5, -14.6),
]);
addPart('skypod-lobby', 'Sky Pod arrival lobby', 'observatory', [
  box(-15, 15, 389.5, 393, -12, 12),
  box(-4, 4, 389.5, 392, -14, -12),
]);
addPart('crown-lighting', 'Observatory crown lighting', 'observatory', octBand(1, -0.9, 0.25, 0.35));

// --- Spire and broadcast ring: 408 ft sculpted mast.
{
  const ring = new THREE.TorusGeometry(7, 1.3, 10, 32);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 419, 0);
  const g = [ring];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    g.push(box(7 * Math.cos(a) - 1.4, 7 * Math.cos(a) + 1.4, 418, 421.5, 7 * Math.sin(a) - 1.4, 7 * Math.sin(a) + 1.4));
  }
  addPart('spire-ring', 'Spire support ring', 'spire', g);
}
addPart('spire-platform', 'Spire base platform', 'spire', [cyl(10, 10, 1.2, 0, PARAPET_Y + 0.6, 0, 24)]);
addPart('spire-transition', 'Spire transition cone', 'spire', [cyl(6, 15, 8, 0, PARAPET_Y + 4, 0, 12)]);
addPart('mast-lower', 'Spire mast, lower section', 'spire', [cyl(1.9, 2.6, 43, 0, (PARAPET_Y + 460) / 2, 0, 12)]);
addPart('mast-middle', 'Spire mast, middle section', 'spire', [cyl(1.3, 1.9, 40, 0, 480, 0, 12)]);
addPart('mast-upper', 'Spire mast, upper section', 'spire', [cyl(0.15, 1.3, SPIRE_TOP - 500, 0, (500 + SPIRE_TOP) / 2, 0, 12)]);
addPart('spire-radome', 'Spire radome enclosure', 'spire', [cyl(3.1, 3.1, 70, 0, 460, 0, 16, true)]);
{
  const g = [cyl(0.35, 0.5, 2, 0, SPIRE_TOP + 1, 0, 8)];
  const orb = new THREE.SphereGeometry(0.6, 10, 8);
  orb.translate(0, SPIRE_TOP + 2.4, 0);
  g.push(orb);
  addPart('beacon', 'Beacon light', 'spire', g);
}
addPart('beacon-beam', 'Beacon light beam', 'spire', [cyl(0.5, 0.9, BEAM_TOP - SPIRE_TOP, 0, (SPIRE_TOP + BEAM_TOP) / 2, 0, 8, true)]);
{
  const ring = new THREE.TorusGeometry(4.5, 0.8, 8, 24);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 430, 0);
  addPart('comms-ring', 'Communications ring', 'spire', [ring]);
}
{
  const g = [];
  const crown = ringAt(1);
  for (let k = 0; k < 8; k++) g.push(strut([0, 518, 0], [crown[k][0], PARAPET_Y, crown[k][1]], 0.28));
  addPart('spire-stays', 'Spire cable stays', 'spire', g);
}
{
  const g = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    g.push(box(7 * Math.cos(a) - 0.8, 7 * Math.cos(a) + 0.8, 416, 419.5, 7 * Math.sin(a) - 0.8, 7 * Math.sin(a) + 0.8));
  }
  addPart('wash-rigs', 'Window washing rigs', 'spire', g);
}
addPart('spire-platform-mid', 'Spire maintenance platform', 'spire', [cyl(5, 5, 0.5, 0, 425, 0, 16)]);
{
  const g = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    g.push(box(7 * Math.cos(a) - 1, 7 * Math.cos(a) + 1, 419.6, 422, 7 * Math.sin(a) - 1, 7 * Math.sin(a) + 1));
  }
  addPart('broadcast-cabinets', 'Broadcast equipment cabinets', 'spire', g);
}

// --- Vertical transportation.
addPart('skypod-shafts', 'Sky Pod elevator shafts', 'transit', [
  box(-10.5, -7.5, 0, 393, -12, 12),
  box(7.5, 10.5, 0, 393, -12, 12),
]);
{
  const g = [];
  for (let i = 0; i < 6; i++) g.push(box(-16 + i * 2.4, -14.6 + i * 2.4, 0, 378, -9, 9));
  addPart('dispatch-elevators', 'Destination dispatch elevators', 'transit', g);
}
addPart('service-elevators', 'Service elevators', 'transit', [
  box(-4, -1.5, 0, 378, -9, 9),
  box(1.5, 4, 0, 378, -9, 9),
]);
{
  const g = [];
  for (const [ex, ez] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) {
    g.push(strut([ex, 0, ez], [ex * 0.6, 9, ez * 0.6], 1.4));
  }
  addPart('lobby-escalators', 'Lobby escalators', 'transit', g);
}
addPart('elevator-machine', 'Elevator machine room', 'transit', [box(-12, 12, 393, 399, -12, 12)]);
addPart('freight-elevator', 'Freight elevator', 'transit', [box(-20, -17, 0, 378, -9, 9)]);

// --- Plaza and memorial context (south is +z).
addPart('plaza', 'World Trade Center plaza', 'plaza', [box(-90, 90, -0.5, 0, -90, 90)]);
addPart('pool-north', 'Memorial pool north', 'plaza', [box(-35, -15, -0.4, 0.1, 40, 65)]);
addPart('pool-south', 'Memorial pool south', 'plaza', [box(15, 35, -0.4, 0.1, 40, 65)]);
{
  const g = [];
  for (let ix = -4; ix <= 4; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      const x = ix * 9 + (iz % 2) * 4;
      const z = 32 + iz * 22;
      if (Math.abs(x) < 38 && z > 36 && z < 72) continue; // keep pools clear
      g.push(cyl(0.25, 0.35, 2.2, x, 1.1, z, 6));
      const crown = new THREE.ConeGeometry(1.8, 3.4, 7);
      crown.translate(x, 3.9, z);
      g.push(crown);
    }
  }
  addPart('tree-grove', 'Memorial tree grove', 'plaza', g);
}
{
  const g = [];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    g.push(cyl(0.16, 0.16, 1.1, 48 * Math.cos(a), 0.55, 48 * Math.sin(a), 6));
  }
  addPart('bollards', 'Security bollard ring', 'plaza', g);
}
addPart('west-street', 'West Street', 'plaza', [box(-105, -92, -0.4, 0.05, -90, 90)]);
addPart('vesey-street', 'Vesey Street', 'plaza', [box(-90, 90, -0.4, 0.05, -105, -92)]);
addPart('fulton-street', 'Fulton Street', 'plaza', [box(-90, 90, -0.4, 0.05, 92, 105)]);
addPart('concourse', 'Underground concourse', 'plaza', [box(-60, 60, -8, -1, -60, 60)]);
addPart('path-tunnel', 'PATH connection tunnel', 'plaza', [box(-8, 8, -7, -2, 60, 130)]);

// ---------------------------------------------------------------- colors
// Schematic light palette: pale blue prismatic glass, warm concrete, pale
// stainless steel. The Eiffel Tower is the only dark realistic model in the atlas.
function colorFor(id) {
  if (id === 'base-body') return '#cfc9bd';
  if (id === 'base-blast-walls') return '#b9b0a0';
  if (id === 'base-slats') return '#b9bec5';
  if (id.startsWith('base-fins-')) return '#d9e8f2';
  if (id.startsWith('base-entrance-')) return '#3d4a55';
  if (id === 'lobby') return '#e8e2d4';
  if (id === 'lower-mechanical') return '#a8a196';
  if (id.startsWith('face-')) return '#bcd7e8';
  if (id.startsWith('spandrel-')) return '#9fc0d4';
  if (id === 'glass-parapet') return '#c8e0ef';
  if (id === 'parapet-coping') return '#a9b6c0';
  if (id.startsWith('chamfer-') && id.includes('-slots-')) return '#c8ccd2';
  if (id.startsWith('chamfer-')) return '#a9c9de';
  if (id.startsWith('core-')) return '#b3aa97';
  if (id === 'fireman-lift') return '#c46a4a';
  if (id.startsWith('columns-')) return '#8fa3b5';
  if (id.startsWith('outriggers-')) return '#7d90a3';
  if (id === 'mech-upper') return '#9aa5ad';
  if (id === 'sky-lobby') return '#ded5c2';
  if (id === 'mech-penthouse' || id === 'cooling-plant' || id === 'elevator-machine') return '#8f9aa3';
  if (id.startsWith('vent-')) return '#aeb8c0';
  if (id === 'obs-slab-100' || id === 'dining-101' || id === 'theater-102') return '#d5dbe0';
  if (id.startsWith('obs-glass-')) return '#cfe8f5';
  if (id === 'city-pulse') return '#5b8ab5';
  if (id === 'sky-portal') return '#7fb3d5';
  if (id === 'theater-screen') return '#2e3a44';
  if (id === 'skypod-lobby') return '#e3d9c6';
  if (id === 'crown-lighting') return '#ffe9a8';
  if (id === 'spire-ring' || id === 'comms-ring') return '#c2c8cf';
  if (id === 'spire-platform' || id === 'spire-platform-mid') return '#b4bcc4';
  if (id === 'spire-transition') return '#ccd2d9';
  if (id.startsWith('mast-')) return '#d5d9de';
  if (id === 'spire-radome') return '#e8eef2';
  if (id === 'beacon') return '#ffd76a';
  if (id === 'beacon-beam') return '#fff3c4';
  if (id === 'spire-stays') return '#9aa2ab';
  if (id === 'wash-rigs' || id === 'broadcast-cabinets') return '#8f9aa3';
  if (id === 'skypod-shafts') return '#a8b3bd';
  if (id === 'dispatch-elevators') return '#b6c0c9';
  if (id === 'service-elevators' || id === 'freight-elevator') return '#98a3ad';
  if (id === 'lobby-escalators') return '#c9bfa8';
  if (id === 'plaza') return '#d8d2c4';
  if (id === 'pool-north' || id === 'pool-south') return '#2e4a5a';
  if (id === 'tree-grove') return '#7fa86b';
  if (id === 'bollards') return '#6b7076';
  if (id.endsWith('-street')) return '#8a8d90';
  if (id === 'concourse' || id === 'path-tunnel') return '#a39c8c';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Fortified base and podium', color: '#c9c2b2', description: 'The 185 ft windowless concrete podium with 28 inch thick blast walls, glass fin cladding, four monumental entrances and the 55 ft lobby.' },
  { id: 'facade', name: 'Glass facade facets', color: '#bcd7e8', description: 'The four tapering glass faces of the chamfered tower, eight elongated isosceles triangles of prismatic curtain wall rising to the rotated crown.' },
  { id: 'corners', name: 'Chamfered corners', color: '#9fb8cc', description: 'The four chamfered corners with their slotted stainless steel detailing, growing from the square base to the crown square rotated 45 degrees.' },
  { id: 'core', name: 'Concrete core', color: '#b3aa97', description: 'The reinforced concrete shear wall core, 110 ft square with walls up to 4.5 ft thick, enclosing stairs, lifts and life safety systems.' },
  { id: 'structure', name: 'Structural frame', color: '#8fa3b5', description: 'The redundant steel moment frame at the perimeter, paired with the concrete core to resist progressive collapse.' },
  { id: 'mechanical', name: 'Mechanical floors', color: '#9aa5ad', description: 'Lower plant floors in the podium, the double height sky lobby, and the louvered upper mechanical levels below the observatory.' },
  { id: 'observatory', name: 'Observatory', color: '#cfe8f5', description: 'One World Observatory on floors 100 to 102: the main viewing level, dining on 101, and the See Forever Theater on 102.' },
  { id: 'spire', name: 'Spire and broadcast ring', color: '#d5d9de', description: 'The 408 ft sculpted spire on its circular support ring, with radome, communications ring, cable stays and the beacon at 1,776 ft.' },
  { id: 'transit', name: 'Vertical transportation', color: '#a8b3bd', description: 'Sky Pod elevators, destination dispatch banks, service and freight lifts, and the lobby escalators.' },
  { id: 'plaza', name: 'Plaza and memorial context', color: '#d8d2c4', description: 'The World Trade Center plaza, the 9/11 Memorial pools and tree grove, surrounding streets, and below grade transit links.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'base concrete body': 'The 200 ft square, 185 ft tall windowless concrete podium that anchors the tower, designed as a fortified base against truck bombs and ground level attack. Exact wall buildup is schematic.',
  'base blast walls': 'The podium\u2019s 28 inch thick reinforced concrete walls, the building\u2019s first line of blast protection. Wall layering is schematic.',
  'base stainless steel slats': 'Horizontal stainless steel slats behind the glass fins, the inner ply of the podium\u2019s two ply skirt. Exact slat spacing is schematic.',
  'base glass fins north': 'Angled glass fins on the north face of the podium, lit by LEDs at night; they replaced the unworkable 2,000 pane prismatic glass scheme scrapped in 2011. Fin angles are schematic.',
  'base glass fins south': 'Angled glass fins on the south face of the podium, lit by LEDs at night; they replaced the unworkable 2,000 pane prismatic glass scheme scrapped in 2011. Fin angles are schematic.',
  'base glass fins east': 'Angled glass fins on the east face of the podium, lit by LEDs at night; they replaced the unworkable 2,000 pane prismatic glass scheme scrapped in 2011. Fin angles are schematic.',
  'base glass fins west': 'Angled glass fins on the west face of the podium, lit by LEDs at night; they replaced the unworkable 2,000 pane prismatic glass scheme scrapped in 2011. Fin angles are schematic.',
  'base entrance north': 'Monumental entrance on the Vesey Street side, one of four street level entrances punched through the podium. Exact portal design is schematic.',
  'base entrance south': 'Monumental entrance on the Fulton Street side, one of four street level entrances punched through the podium. Exact portal design is schematic.',
  'base entrance east': 'Monumental entrance on the Washington Street side, one of four street level entrances punched through the podium. Exact portal design is schematic.',
  'base entrance west': 'Monumental entrance on the West Street side, one of four street level entrances punched through the podium. Exact portal design is schematic.',
  'lobby interior': 'The 55 ft high main lobby inside the podium. Interior fit out is schematic.',
  'lower mechanical floors': 'Plant floors 2 to 19 stacked inside the podium above the lobby. Exact equipment layout is schematic.',
  'south glass face, lower tier': 'Prismatic glass curtain wall of the south face, lower third: floor to floor insulated units up to 2,720 kg each on a 5 ft module, made by Benson Industries with Viracon glass. Exact panel joints are schematic.',
  'south glass face, middle tier': 'Prismatic glass curtain wall of the south face, middle third, tapering as the chamfers deepen toward the midheight octagon. Exact panel joints are schematic.',
  'south glass face, upper tier': 'Prismatic glass curtain wall of the south face, upper third, narrowing toward the crown square rotated 45 degrees from the base. Exact panel joints are schematic.',
  'north glass face, lower tier': 'Prismatic glass curtain wall of the north face, lower third: floor to floor insulated units up to 2,720 kg each on a 5 ft module, made by Benson Industries with Viracon glass. Exact panel joints are schematic.',
  'north glass face, middle tier': 'Prismatic glass curtain wall of the north face, middle third, tapering as the chamfers deepen toward the midheight octagon. Exact panel joints are schematic.',
  'north glass face, upper tier': 'Prismatic glass curtain wall of the north face, upper third, narrowing toward the crown square rotated 45 degrees from the base. Exact panel joints are schematic.',
  'east glass face, lower tier': 'Prismatic glass curtain wall of the east face, lower third: floor to floor insulated units up to 2,720 kg each on a 5 ft module, made by Benson Industries with Viracon glass. Exact panel joints are schematic.',
  'east glass face, middle tier': 'Prismatic glass curtain wall of the east face, middle third, tapering as the chamfers deepen toward the midheight octagon. Exact panel joints are schematic.',
  'east glass face, upper tier': 'Prismatic glass curtain wall of the east face, upper third, narrowing toward the crown square rotated 45 degrees from the base. Exact panel joints are schematic.',
  'west glass face, lower tier': 'Prismatic glass curtain wall of the west face, lower third: floor to floor insulated units up to 2,720 kg each on a 5 ft module, made by Benson Industries with Viracon glass. Exact panel joints are schematic.',
  'west glass face, middle tier': 'Prismatic glass curtain wall of the west face, middle third, tapering as the chamfers deepen toward the midheight octagon. Exact panel joints are schematic.',
  'west glass face, upper tier': 'Prismatic glass curtain wall of the west face, upper third, narrowing toward the crown square rotated 45 degrees from the base. Exact panel joints are schematic.',
  'spandrel band a': 'Schematic spandrel band marking the floor structure behind the glass at this level.',
  'spandrel band b': 'Schematic spandrel band marking the floor structure behind the glass at this level.',
  'spandrel band c': 'Schematic spandrel band marking the floor structure behind the glass at this level.',
  'spandrel band d': 'Schematic spandrel band marking the floor structure behind the glass at this level.',
  'spandrel band e': 'Schematic spandrel band marking the floor structure behind the glass at this level.',
  'spandrel band f': 'Schematic spandrel band marking the floor structure behind the glass at this level.',
  'glass parapet': 'The glass parapet crowning the tower at 1,368 ft, the same height as the roof of the original North Tower, its plan a square rotated 45 degrees from the base.',
  'parapet coping': 'Coping capping the glass parapet. Exact profile is schematic.',
  'southeast chamfer, lower panel': 'One of the eight elongated isosceles triangles that shape the tower: the southeast chamfer, lower half, rising from the square base toward the midheight octagon. Exact facet subdivision is schematic.',
  'southeast chamfer, upper panel': 'One of the eight elongated isosceles triangles that shape the tower: the southeast chamfer, upper half, narrowing from the midheight octagon to the rotated crown square. Exact facet subdivision is schematic.',
  'southwest chamfer, lower panel': 'One of the eight elongated isosceles triangles that shape the tower: the southwest chamfer, lower half, rising from the square base toward the midheight octagon. Exact facet subdivision is schematic.',
  'southwest chamfer, upper panel': 'One of the eight elongated isosceles triangles that shape the tower: the southwest chamfer, upper half, narrowing from the midheight octagon to the rotated crown square. Exact facet subdivision is schematic.',
  'northeast chamfer, lower panel': 'One of the eight elongated isosceles triangles that shape the tower: the northeast chamfer, lower half, rising from the square base toward the midheight octagon. Exact facet subdivision is schematic.',
  'northeast chamfer, upper panel': 'One of the eight elongated isosceles triangles that shape the tower: the northeast chamfer, upper half, narrowing from the midheight octagon to the rotated crown square. Exact facet subdivision is schematic.',
  'northwest chamfer, lower panel': 'One of the eight elongated isosceles triangles that shape the tower: the northwest chamfer, lower half, rising from the square base toward the midheight octagon. Exact facet subdivision is schematic.',
  'northwest chamfer, upper panel': 'One of the eight elongated isosceles triangles that shape the tower: the northwest chamfer, upper half, narrowing from the midheight octagon to the rotated crown square. Exact facet subdivision is schematic.',
  'southeast corner slots, lower': 'Slotted stainless steel detailing on the southeast chamfer, lower half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'southeast corner slots, upper': 'Slotted stainless steel detailing on the southeast chamfer, upper half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'southwest corner slots, lower': 'Slotted stainless steel detailing on the southwest chamfer, lower half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'southwest corner slots, upper': 'Slotted stainless steel detailing on the southwest chamfer, upper half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'northeast corner slots, lower': 'Slotted stainless steel detailing on the northeast chamfer, lower half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'northeast corner slots, upper': 'Slotted stainless steel detailing on the northeast chamfer, upper half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'northwest corner slots, lower': 'Slotted stainless steel detailing on the northwest chamfer, lower half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'northwest corner slots, upper': 'Slotted stainless steel detailing on the northwest chamfer, upper half, the signature treatment of the tower\u2019s chamfered corners. Exact slot pattern is schematic.',
  'concrete core, lower tube': 'The lower half of the 110 ft square reinforced concrete core, walls 4.5 ft thick at the base, enclosing all egress stairs and lift shafts. Taper is schematic.',
  'concrete core, upper tube': 'The upper half of the concrete core, its walls slimming to 2 ft, carrying gravity, wind and seismic loads. Taper is schematic.',
  'core blast wall base': 'Thickened concrete walls at the core\u2019s base, part of the tower\u2019s blast and progressive collapse protection. Exact thickness is schematic.',
  'core transfer slab': 'Schematic transfer slab where the core meets the podium structure.',
  'core stair a': 'One of the extra wide pressurized egress stairs inside the core, more than 60 percent wider than code requires. Exact stair layout is schematic.',
  'core stair b': 'One of the extra wide pressurized egress stairs inside the core, more than 60 percent wider than code requires. Exact stair layout is schematic.',
  'fireman\u2019s lift shaft': 'Shaft for the fireman\u2019s lift, a service elevator with water resistant controls and a dedicated pressurized lobby for first responders. Exact position is schematic.',
  'core mechanical chase': 'Vertical chase carrying mechanical, electrical and plumbing risers through the core. Exact routing is schematic.',
  'perimeter columns, south face': 'Steel perimeter columns of the south face, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, north face': 'Steel perimeter columns of the north face, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, east face': 'Steel perimeter columns of the east face, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, west face': 'Steel perimeter columns of the west face, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, southeast chamfer': 'Steel perimeter columns following the southeast chamfer, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, southwest chamfer': 'Steel perimeter columns following the southwest chamfer, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, northeast chamfer': 'Steel perimeter columns following the northeast chamfer, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'perimeter columns, northwest chamfer': 'Steel perimeter columns following the northwest chamfer, part of the redundant moment frame that pairs with the concrete core. Exact column sizes and positions are schematic.',
  'outrigger trusses, lower': 'Schematic outrigger trusses tying the core to the perimeter frame at the lower mechanical levels.',
  'outrigger trusses, upper': 'Schematic outrigger trusses tying the core to the perimeter frame at the upper mechanical levels.',
  'upper mechanical floor band': 'Louvered upper mechanical levels below the observatory; the tower counts 28 mechanical spaces in total. Exact louver pattern is schematic.',
  'sky lobby': 'Double height sky lobby serving the upper office floors. Interior layout is schematic.',
  'rooftop mechanical penthouse': 'Mechanical penthouse on the roof behind the glass parapet. Exact equipment is schematic.',
  'cooling plant': 'Schematic rooftop cooling plant.',
  'ventilation louvers north': 'Ventilation louvers on the north face of the upper mechanical band. Exact pattern is schematic.',
  'ventilation louvers south': 'Ventilation louvers on the south face of the upper mechanical band. Exact pattern is schematic.',
  'ventilation louvers east': 'Ventilation louvers on the east face of the upper mechanical band. Exact pattern is schematic.',
  'ventilation louvers west': 'Ventilation louvers on the west face of the upper mechanical band. Exact pattern is schematic.',
  'observatory floor 100 slab': 'Structural slab of the main observatory level, floor 100, about 1,250 ft above the street.',
  'observatory glass wall north': 'Full height viewing glass on the north side of the main observatory, floor 100. Exact mullion layout is schematic.',
  'observatory glass wall south': 'Full height viewing glass on the south side of the main observatory, floor 100. Exact mullion layout is schematic.',
  'observatory glass wall east': 'Full height viewing glass on the east side of the main observatory, floor 100. Exact mullion layout is schematic.',
  'observatory glass wall west': 'Full height viewing glass on the west side of the main observatory, floor 100. Exact mullion layout is schematic.',
  'city pulse ring': 'The City Pulse installation: a ring of HD monitors where guides use gesture recognition to point out landmarks. Exact geometry is schematic.',
  'sky portal disc': 'The Sky Portal, a 14 ft wide circular disc visitors step onto to watch live high definition footage of the streets far below.',
  'floor 101 dining level': 'Floor 101, given over to three dining areas including the ONE Dine restaurant and bar. Interior fit out is schematic.',
  'floor 102 theater level': 'Floor 102 with the See Forever Theater and a 9,300 sq ft special event space. Interior fit out is schematic.',
  'see forever theater screen': 'Screen of the See Forever Theater, which presents a two minute three dimensional portrait of New York City. Exact screen shape is schematic.',
  'sky pod arrival lobby': 'Arrival lobby where the five Sky Pod elevators discharge visitors onto floor 102 after their sub 60 second ascent. Interior layout is schematic.',
  'observatory crown lighting': 'Schematic crown lighting at the parapet, part of the tower\u2019s night time identity.',
  'spire support ring': 'The circular support ring at the spire\u2019s base, carrying broadcasting and maintenance equipment.',
  'spire base platform': 'Schematic platform transitioning the square crown to the circular spire base.',
  'spire transition cone': 'Tapered transition from the crown to the mast. Exact profile is schematic.',
  'spire mast, lower section': 'Lower section of the 408 ft sculpted spire, an 800 ton steel mast designed with artist Kenneth Snelson. Exact taper is schematic.',
  'spire mast, middle section': 'Middle section of the 408 ft sculpted spire, an 800 ton steel mast designed with artist Kenneth Snelson. Exact taper is schematic.',
  'spire mast, upper section': 'Upper section of the 408 ft sculpted spire, an 800 ton steel mast designed with artist Kenneth Snelson. Exact taper is schematic.',
  'spire radome enclosure': 'Radio frequency transparent cylindrical enclosure protecting the mast\u2019s broadcast equipment.',
  'beacon light': 'The beacon light at 1,776 ft, echoing the torch of the Statue of Liberty across the harbor.',
  'beacon light beam': 'Schematic beam of the intense light projected from the spire at night, reported to shine over 1,000 ft above the tower.',
  'communications ring': 'Communications ring at the mast\u2019s base for additional equipment, lighting, and window washing rigs.',
  'spire cable stays': 'Cable stays securing the mast to the crown. Exact cable layout is schematic.',
  'window washing rigs': 'Window washing rigs parked at the communications ring. Exact rig shapes are schematic.',
  'spire maintenance platform': 'Schematic maintenance platform partway up the mast.',
  'broadcast equipment cabinets': 'Cabinets housing broadcast equipment on the support ring. Exact arrangement is schematic.',
  'sky pod elevator shafts': 'Shafts of the five Sky Pod elevators, among the fastest in the world, with floor to ceiling LED time lapse of the skyline. Exact shaft positions are schematic.',
  'destination dispatch elevators': 'Bank of high speed destination dispatch elevators serving the office floors. Exact car count is schematic.',
  'service elevators': 'Service elevators serving all office floors. Exact positions are schematic.',
  'lobby escalators': 'Escalators connecting the lobby to the concourse and upper levels. Exact layout is schematic.',
  'elevator machine room': 'Schematic machine room for the elevator banks.',
  'freight elevator': 'Freight elevator serving the tower. Exact position is schematic.',
  'world trade center plaza': 'Schematic plaza slab of the 16 acre World Trade Center site around the tower.',
  'memorial pool north': 'One of the two 9/11 Memorial reflecting pools just south of the tower, shown schematically.',
  'memorial pool south': 'One of the two 9/11 Memorial reflecting pools just south of the tower, shown schematically.',
  'memorial tree grove': 'Schematic grove of memorial trees around the pools.',
  'security bollard ring': 'Schematic ring of security bollards and barriers protecting the site perimeter.',
  'west street': 'West Street along the tower\u2019s west side. Width and alignment are schematic.',
  'vesey street': 'Vesey Street along the north side. Width and alignment are schematic.',
  'fulton street': 'Fulton Street along the south side; the tower\u2019s address is 285 Fulton Street. Width and alignment are schematic.',
  'underground concourse': 'Below grade concourse with retail, building services, and connections to the transit network. Exact layout is schematic.',
  'path connection tunnel': 'Schematic tunnel linking the tower to the World Trade Center Transportation Hub (the Oculus) and its PATH station.',
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
      g.deleteAttribute('normal'); // custom panel/band geoms carry no normals; recomputed below
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
const binName = 'one-world-trade-center-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the one-world-trade-center directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

// Geometry freshness check against the simple model: no part may share
// a name or identical bounds with the simple variant.
const simpleAtlas = JSON.parse(
  fs.readFileSync(path.join(outDir, '..', 'one-world-trade-center-simple', 'atlas.json'), 'utf8'),
);
const simpleNames = new Set(simpleAtlas.parts.map((p) => p.name));
const simpleBounds = new Set(simpleAtlas.parts.map((p) => JSON.stringify(p.bounds)));
let nameHits = 0;
let boundHits = 0;
for (const r of records) {
  if (simpleNames.has(r.part.name)) nameHits++;
  if (simpleBounds.has(JSON.stringify(r.bounds))) boundHits++;
}
console.log(`Freshness vs simple: ${nameHits} name matches (limit 0), ${boundHits} identical bounds (limit 0)`);
if (nameHits > 0 || boundHits > 0) process.exit(1);

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'One World Trade Center, New York (detailed schematic)',
  title: 'One World Trade Center',
  location: 'New York City, United States',
  blurb: 'The 1,776 ft tower by David Childs of SOM, tallest in the Western Hemisphere, opened in 2014. Eight isosceles triangles of prismatic glass rise from a 185 ft fortified base to a crown square rotated 45 degrees, topped by a 408 ft spire with its beacon at the symbolic height.',
  sourceUrls: [
    { label: 'Wikipedia: One World Trade Center', url: 'https://en.wikipedia.org/wiki/One_World_Trade_Center' },
    { label: 'Wikipedia: One World Observatory', url: 'https://en.wikipedia.org/wiki/One_World_Observatory' },
    { label: 'Architectural Record: One World Trade Center (2012)', url: 'https://www.architecturalrecord.com/articles/7870-one-world-trade-center' },
    { label: 'Architectural Record: One World Trade Center (2015)', url: 'https://www.architecturalrecord.com/articles/7991-one-world-trade-center' },
    { label: 'Dezeen: CTBUH height ruling', url: 'https://www.dezeen.com/2013/11/13/one-world-trade-center-named-tallest-skyscraper-in-western-hemisphere/amp/' },
    { label: '6sqft: Observatory opening', url: 'https://www.6sqft.com/?p=145321' },
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
  chunks: [{ url: '/models/one-world-trade-center/one-world-trade-center-0.bin', bytes: offset }],
  triangles,
  // Tall thin model: the exploded cloud lifts +1 above the assembled centre
  // while the camera targets the model centre. 1.4 keeps the spire and the
  // beam in frame (tuned for this tower's proportions).
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
