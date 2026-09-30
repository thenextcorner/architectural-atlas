// Procedural Pentagon for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Pentagon in code and writes it
// in the atlas binary format:
//   public/models/pentagon/atlas.json
//   public/models/pentagon/pentagon-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/pentagon-attribution.md,
// opened 2026-09-30):
//   Headquarters of the US Department of Defense, Arlington County,
//   Virginia; chief architects George Edwin Bergstrom and David J.
//   Witmer (Bergstrom resigned April 1942, Witmer replaced him);
//   preliminary design and drafting took 34 days; construction began
//   11 September 1941 and finished 15 January 1943, about 16 months,
//   at a total cost of about $83 million; five-sided regular pentagon,
//   each outer wall 921 ft (921.6 ft in DoD and National Register
//   sources) long; about 77 ft tall; five stories above ground (floors
//   1 to 5) plus two levels below ground (B basement, M mezzanine);
//   five concentric pentagonal rings A (innermost) through E
//   (outermost), with F and G rings in the basement; ten radial
//   corridors per floor, numbered 1 to 10, connecting the A ring to the
//   E ring (corridor 1 begins at the Concourse's south end; the Mall
//   entrance sits between corridors 6 and 7); 17.5 miles of corridors;
//   about 6.5 million sq ft of floor space, among the world's largest
//   office buildings; Indiana limestone facade (marble was barred by
//   President Roosevelt); reinforced concrete structure saving about
//   43,000 tons of steel, with concrete ramps instead of elevators;
//   foundation on 41,492 concrete piles; five-acre central courtyard
//   nicknamed "ground zero"; building covers 29 acres, 34 with the
//   courtyard; five facade entrances clockwise from the north: Mall
//   Terrace, River Terrace, Concourse (Metro Station), South Parking,
//   Heliport; Mall entrance portico with a 600 ft ceremonial terrace;
//   River entrance portico projecting 20 ft with a stepped terrace to
//   the lagoon; main visitor entrance on the southeast side with the
//   Metro station, bus station and a second-floor concourse mall;
//   7,754 windows in the long-standing fact sheet; inner (A) and outer
//   (E) rings plus the ten connector corridors have crosshipped slate
//   roofs, rings B, C and D have flat roofs; rings separated by interior
//   light wells; Pentagon Army Heliport (KJPN): a single pentagon-shaped
//   100 by 100 ft concrete helipad on the northern side; 67 acres of
//   parking for 8,770 vehicles; 131 stairways and 19 escalators.
// Schematic (not sourced, never stated as fact in the UI): ring band and
// light-well widths (the 5-acre courtyard fixes the courtyard apothem;
// interior subdivisions are schematic); wall thicknesses; corridor
// widths; portico, terrace, lobby and pavilion shapes; window-strip
// placement; roof slopes; basement depth and pile grid; parking lot,
// road, lawn, lagoon, fence and memorial shapes; plant building shapes;
// tree and bench placement; exact heliport position on the north side;
// mechanical room contents.
//
// Granularity: 101 named parts across 10 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Model frame: x east, z south, y up, metres. Atlas scale S is computed
// as 2.4 / longestDimension from the finished geometry. The building is
// very wide and low, so the exploded view needs horizontal room; spread
// starts at 1.4.
//
// Usage: node scripts/generate-pentagon.mjs (run the simple generator
// first; the freshness gate below checks this model against it)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'pentagon');
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- helpers
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
function cone(r, h, x, y, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
const T36 = Math.tan(Math.PI / 5); // tan(36 deg), the pentagon miter factor
// Wall band for one edge of a regular pentagon, between apothems aIn and
// aOut, from y0 to y1. Edge 0 faces north, edges run clockwise.
function ringBand(aOut, aIn, y0, y1, edge) {
  const alpha = (edge * 2 * Math.PI) / 5;
  const cx = Math.sin(alpha), cz = -Math.cos(alpha);
  const depth = aOut - aIn;
  const half = (aOut + depth) * T36; // miter extension so corners meet
  const g = new THREE.BoxGeometry(2 * half, y1 - y0, depth);
  g.rotateY(-alpha);
  const amid = (aOut + aIn) / 2;
  g.translate(cx * amid, (y0 + y1) / 2, cz * amid);
  return g;
}
// Sloped roof band over one edge: outer apothem edge at yOut, inner at yIn.
function slopedBand(aOut, aIn, yOut, yIn, edge) {
  const alpha = (edge * 2 * Math.PI) / 5;
  const cx = Math.sin(alpha), cz = -Math.cos(alpha);
  const depth = aOut - aIn + 2.4; // small overhang past both faces
  const half = (aOut + (aOut - aIn)) * T36 + 1.2;
  const g = new THREE.BoxGeometry(2 * half, 0.5, depth);
  g.rotateX(Math.asin((yOut - yIn) / (aOut - aIn)));
  g.rotateY(-alpha);
  const amid = (aOut + aIn) / 2;
  g.translate(cx * amid, (yOut + yIn) / 2, cz * amid);
  return g;
}
// Solid pentagonal prism with edges facing N, NE, SE, SW, NW.
function pentSlab(apothem, y0, y1) {
  const R = apothem / Math.cos(Math.PI / 5);
  const g = new THREE.CylinderGeometry(R, R, y1 - y0, 5, 1, false, (Math.PI * 4) / 5);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Box along a radial corridor direction; deg is clockwise from north.
function corridorBox(a0, a1, w, y0, y1, deg) {
  const beta = (deg * Math.PI) / 180;
  const dx = Math.sin(beta), dz = -Math.cos(beta);
  const g = new THREE.BoxGeometry(a1 - a0, y1 - y0, w);
  g.rotateY(Math.PI / 2 - beta);
  const amid = (a0 + a1) / 2;
  g.translate(dx * amid, (y0 + y1) / 2, dz * amid);
  return g;
}
// Box aligned to a facade; edge 0 is the north (Mall Terrace) facade.
function facadeBox(edge, dist, w, d, y0, y1) {
  const alpha = (edge * 2 * Math.PI) / 5;
  const cx = Math.sin(alpha), cz = -Math.cos(alpha);
  const g = new THREE.BoxGeometry(w, y1 - y0, d);
  g.rotateY(-alpha);
  g.translate(cx * dist, (y0 + y1) / 2, cz * dist);
  return g;
}
function facadePoint(edge, dist, lateral = 0) {
  const alpha = (edge * 2 * Math.PI) / 5;
  const cx = Math.sin(alpha), cz = -Math.cos(alpha);
  const tx = Math.cos(alpha), tz = Math.sin(alpha);
  return [cx * dist + tx * lateral, cz * dist + tz * lateral];
}

// ---------------------------------------------------------------- layout constants (metres; sourced figures in comments)
const A_OUT = 193.2; // E ring outer apothem: 921 ft side -> (921/2)/tan36 deg in ft, to m
const H = 23.47; // about 77 ft tall
const ST = H / 5; // five stories above ground
const COURT_A = 74.64; // courtyard apothem sized for a 5-acre regular pentagon
const ROOF_RISE = 3.2; // schematic slate roof rise
// Ring apothem bands [inner, outer], from the outside in (schematic widths).
const AP = {
  E: [176.2, 193.2],
  D: [150.81, 167.81],
  C: [125.42, 142.42],
  B: [100.03, 117.03],
  A: [74.64, 91.64],
};
const WELLS = [
  [167.81, 176.2],
  [142.42, 150.81],
  [117.03, 125.42],
  [91.64, 100.03],
];
const FACADES = ['Mall Terrace', 'River Terrace', 'Concourse', 'South Parking', 'Heliport'];
const SIDES = ['north', 'northeast', 'southeast', 'southwest', 'northwest'];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Rings: five concentric pentagonal bands, A innermost to E outermost.
for (const L of ['E', 'D', 'C', 'B', 'A']) {
  const [aIn, aOut] = AP[L];
  const innerTop = L === 'E' || L === 'A' ? H + ROOF_RISE : H;
  const ow = [], iw = [];
  for (let e = 0; e < 5; e++) {
    ow.push(ringBand(aOut, aOut - 0.8, 0, H, e));
    iw.push(ringBand(aIn + 0.5, aIn, 0, innerTop, e));
  }
  addPart(`ring-${L.toLowerCase()}-outer-wall`, `Ring ${L} outer wall`, 'rings', ow);
  addPart(`ring-${L.toLowerCase()}-inner-wall`, `Ring ${L} inner wall`, 'rings', iw);
  const fl = [];
  for (let k = 1; k <= 5; k++) {
    for (let e = 0; e < 5; e++) fl.push(ringBand(aOut - 0.8, aIn + 0.5, k * ST - 0.25, k * ST + 0.25, e));
  }
  addPart(`ring-${L.toLowerCase()}-floor-plates`, `Ring ${L} floor plates`, 'rings', fl);
  const ws = [];
  for (let k = 0; k < 5; k++) {
    for (let e = 0; e < 5; e++) {
      const alpha = (e * 2 * Math.PI) / 5;
      const cx = Math.sin(alpha), cz = -Math.cos(alpha);
      const g = new THREE.BoxGeometry(2 * aOut * T36 - 6, 1.7, 0.35);
      g.rotateY(-alpha);
      g.translate(cx * (aOut + 0.15), k * ST + 2.4, cz * (aOut + 0.15));
      ws.push(g);
    }
  }
  addPart(`ring-${L.toLowerCase()}-window-strips`, `Ring ${L} window strips`, 'rings', ws);
}
for (const L of ['B', 'C', 'D']) {
  const [aIn, aOut] = AP[L];
  const g = [];
  for (let e = 0; e < 5; e++) g.push(ringBand(aOut, aOut - 0.8, H, H + 1.1, e));
  addPart(`ring-${L.toLowerCase()}-parapet`, `Ring ${L} parapet`, 'rings', g);
}
WELLS.forEach(([wIn, wOut], i) => {
  const g = [];
  for (let e = 0; e < 5; e++) g.push(ringBand(wOut, wIn, 0, 0.4, e));
  addPart(`light-well-${i + 1}-floor`, `Light well ${i + 1} floor`, 'rings', g);
});

// --- Radial corridors: ten per floor, numbered 1 to 10, A ring to E ring.
for (let j = 1; j <= 10; j++) {
  const beta = 162 + (j - 1) * 36; // corridor 1 at the Concourse's south end
  addPart(`radial-corridor-${j}`, `Radial corridor ${j}`, 'corridors', [
    corridorBox(COURT_A - 0.6, A_OUT + 1.3, 4, 0, H, beta),
  ]);
}
{
  // Pedestrian bridge from corridor 2 toward the Metro station, 2nd floor.
  const beta = 198;
  const g = [corridorBox(A_OUT + 1.3, A_OUT + 46, 5, ST, ST + 4, beta)];
  const [sx, sz] = [Math.sin((beta * Math.PI) / 180), -Math.cos((beta * Math.PI) / 180)];
  g.push(cyl(0.4, 0.4, ST, sx * (A_OUT + 20), ST / 2, sz * (A_OUT + 20), 8));
  g.push(cyl(0.4, 0.4, ST, sx * (A_OUT + 40), ST / 2, sz * (A_OUT + 40), 8));
  addPart('corridor-2-metro-bridge', 'Corridor 2 metro bridge', 'corridors', g);
}

// --- Central courtyard: five acres of open pentagon at the heart.
addPart('courtyard-lawn', 'Central courtyard lawn', 'courtyard', [pentSlab(COURT_A, 0, 0.3)]);
{
  const g = [
    box(-70, 70, 0.3, 0.5, -3, 3),
    box(-3, 3, 0.3, 0.5, -70, 70),
  ];
  addPart('courtyard-paths', 'Courtyard cross paths', 'courtyard', g);
}
{
  const g = [];
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + 0.26;
    const x = Math.cos(a) * 45, z = Math.sin(a) * 45;
    g.push(cyl(0.25, 0.35, 2.2, x, 1.4, z, 6));
    g.push(cone(2.4, 5.5, x, 5, z, 8));
  }
  addPart('courtyard-trees', 'Courtyard trees', 'courtyard', g);
}
{
  const g = [cyl(0.15, 0.22, 13, 0, 6.5, 0, 8), box(0.1, 2.4, 11.2, 12.6, -0.05, 0.05)];
  addPart('courtyard-flagpole', 'Courtyard flagpole', 'courtyard', g);
}
{
  const g = [];
  for (const [bx, bz] of [[-30, -20], [30, -20], [-30, 20], [30, 20]]) {
    g.push(box(bx - 8, bx + 8, 0.3, 0.9, bz - 4, bz + 4));
  }
  addPart('courtyard-garden-beds', 'Courtyard garden beds', 'courtyard', g);
}

// --- Facades: Indiana limestone skin and the five entrance porticoes.
const SLUGS = ['mall-terrace', 'river-terrace', 'concourse', 'south-parking', 'heliport'];
FACADES.forEach((fname, i) => {
  const g = [];
  // Six-column portico with entablature, steps and a shallow pediment.
  g.push(facadeBox(i, A_OUT + 4, 30, 8, 9, 10.5));
  for (let c = 0; c < 6; c++) {
    const [px, pz] = facadePoint(i, A_OUT + 6.5, -12.5 + c * 5);
    g.push(cyl(0.5, 0.6, 9, px, 4.5, pz, 10));
  }
  const ped = new THREE.CylinderGeometry(5.196, 5.196, 30, 3);
  ped.rotateZ(Math.PI / 2);
  ped.rotateX(-Math.PI / 2);
  ped.scale(1, 0.385, 1);
  ped.rotateY((-i * 2 * Math.PI) / 5);
  const [pedx, pedz] = facadePoint(i, A_OUT + 4);
  ped.translate(pedx, 11.5, pedz);
  g.push(ped);
  for (let s = 0; s < 3; s++) g.push(facadeBox(i, A_OUT + 4 + s * 1.6, 34 - s * 2, 2.2, -0.6 * (s + 1), -0.6 * s));
  addPart(`${SLUGS[i]}-entrance-portico`, `${fname} entrance portico`, 'facades', g);
  // Thin limestone cladding skin over the E ring outer wall, one part per facade.
  addPart(
    `${SLUGS[i]}-facade-limestone-cladding`,
    `${fname} facade limestone cladding`,
    'facades',
    [ringBand(A_OUT + 0.6, A_OUT, 0, H, i)],
  );
});
addPart('mall-terrace', 'Mall entrance terrace', 'facades', [
  box(-91.45, 91.45, 0, 1, -217.2, -193.2), // 600 ft ceremonial terrace, north side
  box(-91.45, 91.45, 1, 2, -217.2, -215.2),
]);
{
  // Stepped terrace from the River entrance down toward the lagoon.
  const g = [];
  for (let s = 0; s < 4; s++) g.push(facadeBox(1, A_OUT + 8 + s * 7, 44 - s * 6, 8, -1.2 * (s + 1), -1.2 * s));
  addPart('river-terrace', 'River entrance stepped terrace', 'facades', g);
}

// --- Entrances: the five entrance halls and the visitor plant.
FACADES.forEach((fname, i) => {
  addPart(`${SLUGS[i]}-entrance-lobby`, `${fname} entrance lobby`, 'entrances', [
    facadeBox(i, 184.7, 24, 14, 0, 8),
  ]);
  const [px, pz] = facadePoint(i, A_OUT + 14);
  addPart(`${SLUGS[i]}-security-pavilion`, `${fname} entrance security pavilion`, 'entrances', [
    facadeBox(i, A_OUT + 14, 8, 6, 0, 4),
  ]);
});
addPart('concourse-mall', 'Concourse shopping mall', 'entrances', [
  facadeBox(2, 184.7, 60, 12, ST, ST + 4), // second-floor mini mall, southeast side
]);
addPart('metro-hall', 'Metro station hall', 'entrances', [facadeBox(2, A_OUT + 24, 40, 20, 0, 6)]);

// --- Roofs: slate hips on the A and E rings, flat decks on B, C, D.
FACADES.forEach((fname, i) => {
  addPart(`e-roof-${SIDES[i]}`, `E ring slate roof, ${SIDES[i]} slope`, 'roofs', [
    slopedBand(AP.E[1], AP.E[0], H, H + ROOF_RISE, i),
  ]);
  addPart(`a-roof-${SIDES[i]}`, `A ring slate roof, ${SIDES[i]} slope`, 'roofs', [
    slopedBand(AP.A[1], AP.A[0], H + ROOF_RISE, H, i),
  ]);
});
for (const L of ['B', 'C', 'D']) {
  const [aIn, aOut] = AP[L];
  const g = [];
  for (let e = 0; e < 5; e++) g.push(ringBand(aOut, aIn, H, H + 0.5, e));
  addPart(`${L.toLowerCase()}-flat-roof`, `${L} ring flat roof`, 'roofs', g);
}
{
  // Little gabled caps over the ten connector corridors.
  const g = [];
  for (let j = 1; j <= 10; j++) {
    const beta = ((162 + (j - 1) * 36) * Math.PI) / 180;
    const dx = Math.sin(beta), dz = -Math.cos(beta);
    for (const s of [-1, 1]) {
      const cap = new THREE.BoxGeometry(12, 0.35, 3.2);
      cap.rotateX(s * 0.38);
      cap.rotateY(Math.PI / 2 - beta);
      cap.translate(dx * 134.25 + dz * s * 1.1, H + 1.5, dz * 134.25 - dx * s * 1.1);
      g.push(cap);
    }
  }
  addPart('corridor-hip-caps', 'Connector corridor hip roof caps', 'roofs', g);
}

// --- Basements: B and M levels below ground, piles and ramps.
addPart('basement-b', 'Basement level B', 'basements', [pentSlab(A_OUT, -7, -0.5)]);
addPart('mezzanine-m', 'Mezzanine level M', 'basements', [pentSlab(A_OUT, -3.75, -0.5)]);
{
  // A sample grid of the 41,492 concrete piles under the building.
  const g = [];
  for (let gx = -12; gx <= 12; gx++) {
    for (let gz = -12; gz <= 12; gz++) {
      const x = gx * 15, z = gz * 15;
      let ap = 0;
      for (let e = 0; e < 5; e++) {
        const alpha = (e * 2 * Math.PI) / 5;
        ap = Math.max(ap, x * Math.sin(alpha) - z * Math.cos(alpha));
      }
      if (ap < 188) g.push(cyl(0.45, 0.45, 8, x, -4, z, 8));
    }
  }
  addPart('foundation-piles', 'Foundation concrete piles', 'basements', g);
}
{
  const g = [
    box(40, 240, -6, 0, 96, 98), // two retaining walls for the sloping site
    box(-240, -40, -6, 0, -98, -96),
  ];
  addPart('retaining-walls', 'Basement retaining walls', 'basements', g);
}
{
  // Concrete ramps: wartime steel saving meant ramps, not elevators.
  const g = [];
  for (const s of [-1, 1]) {
    const r = new THREE.BoxGeometry(34, 0.6, 7);
    r.rotateZ(s * 0.21);
    r.translate(s * 120, -3.4, 150);
    g.push(r);
  }
  addPart('concrete-ramps', 'Concrete access ramps', 'basements', g);
}

// --- Grounds: parking, roads, lagoon, heliport and lawns (all schematic).
{
  const g = [];
  for (let e = 0; e < 5; e++) g.push(ringBand(260, 252, 0, 0.25, e));
  addPart('access-roadways', 'Access roadways', 'grounds', g);
}
addPart('south-parking', 'South parking lot', 'grounds', [facadeBox(3, 300, 240, 150, 0, 0.3)]);
addPart('north-parking', 'North parking lot', 'grounds', [facadeBox(1, 290, 200, 130, 0, 0.3)]);
{
  // Pentagon Army Heliport: pentagon-shaped pad on the northern side.
  const pad = new THREE.CylinderGeometry(17.4, 17.4, 0.6, 5, 1, false, (Math.PI * 4) / 5);
  pad.translate(0, 0.3, -248);
  addPart('heliport-pad', 'Heliport pad', 'grounds', [pad]);
}
addPart('river-lagoon', 'River entrance lagoon', 'grounds', [facadeBox(1, 380, 110, 55, -0.6, 0.1)]);
{
  const g = [
    box(-200, -80, 0, 0.25, -300, -220),
    box(80, 200, 0, 0.25, -300, -220),
  ];
  addPart('parade-lawns', 'Parade lawns', 'grounds', g);
}
{
  // Bus station canopy near the southeast visitor entrance.
  const [bx, bz] = facadePoint(2, A_OUT + 58);
  const g = [facadeBox(2, A_OUT + 58, 50, 12, 4.6, 5)];
  for (const [ox, oz] of [[-20, -4], [20, -4], [-20, 4], [20, 4]]) {
    const alpha = (2 * 2 * Math.PI) / 5;
    const rx = ox * Math.cos(alpha) + oz * Math.sin(alpha);
    const rz = -ox * Math.sin(alpha) + oz * Math.cos(alpha);
    g.push(cyl(0.25, 0.25, 4.6, bx + rx, 2.3, bz + rz, 8));
  }
  addPart('bus-canopy', 'Bus station canopy', 'grounds', g);
}
{
  const g = [];
  for (let e = 0; e < 5; e++) g.push(ringBand(250, 249.4, 0, 2.5, e));
  addPart('security-fence', 'Perimeter security fence', 'grounds', g);
}

// --- Building services: plants, cores and roof rooms (all schematic).
addPart('heating-plant', 'Heating plant', 'mechanical', [box(37.5, 82.5, 0, 12, 285, 315)]);
addPart('refrigeration-plant', 'Refrigeration plant', 'mechanical', [box(-60, -20, 0, 10, 291, 319)]);
{
  const g = [];
  for (let j = 1; j <= 10; j += 2) {
    g.push(corridorBox(131.25, 137.25, 6, 0, 26, 162 + (j - 1) * 36));
  }
  addPart('stair-lift-cores', 'Stair and lift cores', 'mechanical', g);
}
{
  const g = [];
  for (const L of ['B', 'C', 'D']) {
    const [aIn, aOut] = AP[L];
    for (let e = 0; e < 2; e++) {
      const [rx, rz] = facadePoint(e * 2, (aIn + aOut) / 2, 20);
      g.push(box(rx - 5, rx + 5, H + 0.5, H + 4, rz - 4, rz + 4));
    }
  }
  addPart('roof-plant-rooms', 'Roof plant rooms', 'mechanical', g);
}

// --- Pentagon memorial on the west side (all schematic).
{
  const alpha = (4 * 2 * Math.PI) / 5;
  const g = [facadeBox(4, A_OUT + 87, 70, 45, 0, 0.4)];
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 6; k++) {
      const [qx, qz] = facadePoint(4, A_OUT + 87, -25 + k * 10);
      const b = new THREE.BoxGeometry(3, 0.8, 1);
      b.rotateY(-alpha);
      const off = -12 + r * 8;
      b.translate(qx + Math.cos(alpha) * off, 0.8, qz + Math.sin(alpha) * off);
      g.push(b);
    }
  }
  addPart('memorial-plaza', 'Pentagon memorial plaza', 'memorial', [g[0]]);
  addPart('memorial-benches', 'Pentagon memorial benches', 'memorial', g.slice(1));
  addPart('memorial-gate', 'Memorial entrance gate', 'memorial', [
    facadeBox(4, A_OUT + 62, 12, 2, 0, 5),
  ]);
}

// ---------------------------------------------------------------- colors
// Schematic light palette: Indiana limestone cream, concrete greys, slate
// blue-grey roofs, green courtyard. The Eiffel Tower is the only dark
// realistic model in the atlas.
function colorFor(id) {
  if (id.endsWith('-outer-wall')) return '#ddd5bd';
  if (id.endsWith('-inner-wall')) return '#cfc7b0';
  if (id.endsWith('-floor-plates')) return '#c4bca6';
  if (id.endsWith('-window-strips')) return '#4a5560';
  if (id.endsWith('-parapet')) return '#d8d0ba';
  if (id.startsWith('light-well-')) return '#b9b3a4';
  if (id.startsWith('radial-corridor-')) return '#d5cdb4';
  if (id === 'corridor-2-metro-bridge') return '#c9c0a8';
  if (id === 'courtyard-lawn') return '#8fbf6f';
  if (id === 'courtyard-paths') return '#d9cfbb';
  if (id === 'courtyard-trees') return '#5d8a4a';
  if (id === 'courtyard-flagpole') return '#8a8f96';
  if (id === 'courtyard-garden-beds') return '#7aa45e';
  if (id.endsWith('-entrance-portico')) return '#efe8d2';
  if (id.endsWith('-facade-limestone-cladding')) return '#e8e0cc';
  if (id === 'mall-terrace') return '#d9cfbb';
  if (id === 'river-terrace') return '#cfc4a8';
  if (id.endsWith('-entrance-lobby')) return '#d9cfbb';
  if (id.endsWith('-security-pavilion') || id === 'concourse-mall' || id === 'metro-hall') return '#c9bfa0';
  if (id.startsWith('e-roof-') || id.startsWith('a-roof-')) return '#6b7a8a';
  if (id.endsWith('-flat-roof') || id === 'corridor-hip-caps') return '#b9b3a8';
  if (id === 'basement-b' || id === 'mezzanine-m') return '#a8a096';
  if (id === 'foundation-piles') return '#8a8478';
  if (id === 'retaining-walls' || id === 'concrete-ramps') return '#9d978b';
  if (id === 'access-roadways') return '#7a7a78';
  if (id === 'south-parking' || id === 'north-parking') return '#9a9a98';
  if (id === 'heliport-pad') return '#8a8f96';
  if (id === 'river-lagoon') return '#7fb3d5';
  if (id === 'parade-lawns') return '#93b96f';
  if (id === 'bus-canopy') return '#b0a898';
  if (id === 'security-fence') return '#6b6f75';
  if (id === 'heating-plant' || id === 'refrigeration-plant') return '#a89a80';
  if (id === 'stair-lift-cores') return '#b5ada0';
  if (id === 'roof-plant-rooms') return '#9d978b';
  if (id === 'memorial-plaza') return '#cfc8b8';
  if (id === 'memorial-benches') return '#e5ddc4';
  if (id === 'memorial-gate') return '#8a8478';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'rings', name: 'Concentric rings', color: '#ded3b8', description: 'The five concentric pentagonal rings, A (innermost) through E (outermost): their walls, floor plates, window strips, parapets and the light-well floors between them.' },
  { id: 'corridors', name: 'Radial corridors', color: '#c8bfa8', description: 'The ten radial corridors, numbered 1 to 10, that join the A ring to the E ring on every floor, plus the pedestrian bridge from corridor 2 toward the Metro.' },
  { id: 'courtyard', name: 'Central courtyard', color: '#8fbf6f', description: 'The five-acre pentagonal courtyard at the heart of the building, nicknamed "ground zero". Planting and paths are schematic.' },
  { id: 'facades', name: 'Limestone facades', color: '#e8e0cc', description: 'The Indiana limestone skin of the outer walls and the five entrance porticoes with their terraces. Portico and terrace shapes are schematic.' },
  { id: 'entrances', name: 'Entrance halls', color: '#d9cfbb', description: 'The five entrance lobbies, their security pavilions, the second-floor concourse mall and the Metro station hall. Interiors are schematic.' },
  { id: 'roofs', name: 'Roofs', color: '#6b7a8a', description: 'Crosshipped slate roofs over the inner (A) and outer (E) rings and the connector corridors; flat built-up decks over the three middle rings. Slopes are schematic.' },
  { id: 'basements', name: 'Basement levels', color: '#a8a096', description: 'The B and M levels below ground, a sample of the 41,492 concrete piles, retaining walls and the concrete access ramps. Depths are schematic.' },
  { id: 'grounds', name: 'Grounds and roads', color: '#9aa08f', description: 'The reservation around the building: parking lots, access roads, the lagoon, the heliport pad, lawns and the security fence. All schematic.' },
  { id: 'mechanical', name: 'Building services', color: '#7a8896', description: 'Heating and refrigeration plants, stair and lift cores and roof plant rooms. All schematic.' },
  { id: 'memorial', name: 'Pentagon memorial', color: '#cfc8b8', description: 'The September 11 memorial on the west side of the building. Layout is schematic.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (const L of ['E', 'D', 'C', 'B', 'A']) {
  const l = L.toLowerCase();
  const pos = L === 'E' ? 'outermost' : L === 'A' ? 'innermost' : 'middle';
  explanations[`ring ${l} outer wall`] = `Outer wall of ring ${L}, the ${pos} of the five concentric pentagonal rings (A innermost through E outermost). The building\u2019s five outer walls are each 921 ft long. Wall thickness is schematic.`;
  explanations[`ring ${l} inner wall`] = `Inner wall of ring ${L}, facing the light well toward the next ring in. The rings are separated by interior courts that serve as light wells. Wall height and thickness are schematic.`;
  explanations[`ring ${l} floor plates`] = `Floor plates of ring ${L}, one per story for the five above-ground floors. The building holds about 6.5 million sq ft of floor space. Slab positions are schematic.`;
  explanations[`ring ${l} window strips`] = `Window bands of ring ${L}, standing in for the ring\u2019s share of the building\u2019s 7,754 windows. Exact fenestration is schematic.`;
}
explanations['ring b parapet'] = 'Parapet capping the outer wall of ring B, which carries a flat built-up roof. Exact profile is schematic.';
explanations['ring c parapet'] = 'Parapet capping the outer wall of ring C, which carries a flat built-up roof. Exact profile is schematic.';
explanations['ring d parapet'] = 'Parapet capping the outer wall of ring D, which carries a flat built-up roof. Exact profile is schematic.';
for (let i = 1; i <= 4; i++) {
  explanations[`light well ${i} floor`] = `Floor of light well ${i}, the open court between two rings that brings daylight deep into the plan. The five rings are separated by these interior courts. Well width is schematic.`;
}
for (let j = 1; j <= 10; j++) {
  explanations[`radial corridor ${j}`] = `Radial corridor ${j} of ten, running from the A ring to the E ring on every floor. Together the corridors total 17.5 miles. Corridor width and alignment are schematic.`;
}
explanations['corridor 2 metro bridge'] = 'Pedestrian bridge from corridor 2 toward the Metro station on the southeast side, at second-floor level. Exact routing is schematic.';
explanations['central courtyard lawn'] = 'The five-acre central courtyard, the open pentagonal heart of the building nicknamed "ground zero". The courtyard apothem is sized so the model lawn covers five acres; planting detail is schematic.';
explanations['courtyard cross paths'] = 'Cross paths over the courtyard lawn. Layout is schematic.';
explanations['courtyard trees'] = 'Trees in the central courtyard. Number and placement are schematic.';
explanations['courtyard flagpole'] = 'Flagpole at the center of the courtyard. Position is schematic.';
explanations['courtyard garden beds'] = 'Garden beds in the courtyard. Layout is schematic.';
const ENTR = [
  ['mall terrace', 'Mall Terrace', 'On the north side, its portico leads to a 600 ft terrace used for ceremonies.'],
  ['river terrace', 'River Terrace', 'On the northeast side, its portico projects 20 ft and overlooks the lagoon facing Washington.'],
  ['concourse', 'Concourse', 'On the southeast side by the Metro station and bus station; the main visitor entrance.'],
  ['south parking', 'South Parking', 'On the southwest facade by the south parking lot.'],
  ['heliport', 'Heliport', 'On the west side of the building, facing Washington Boulevard.'],
];
for (const [slug, fname, note] of ENTR) {
  explanations[`${slug} entrance portico`] = `${fname} entrance portico, one of the building\u2019s five facade entrances (clockwise from the north: Mall Terrace, River Terrace, Concourse, South Parking, Heliport). ${note} Portico shape is schematic.`;
  explanations[`${slug} facade limestone cladding`] = `${fname} facade\u2019s Indiana limestone cladding. President Roosevelt barred marble from the building, so limestone faces the reinforced concrete structure. Cladding thickness is schematic.`;
  explanations[`${slug} entrance lobby`] = `${fname} entrance lobby inside the E ring. Interior layout is schematic.`;
  explanations[`${slug} entrance security pavilion`] = `${fname} entrance security pavilion outside the facade. Shape and position are schematic.`;
}
explanations['mall entrance terrace'] = 'The 600 ft long ceremonial terrace outside the Mall entrance on the north side. Length is sourced; detailing is schematic.';
explanations['river entrance stepped terrace'] = 'Stepped terrace leading down from the River entrance toward the lagoon. Steps are schematic.';
explanations['concourse shopping mall'] = 'The mini shopping mall on the second-floor concourse at the southeast side of the building. Interior layout is schematic.';
explanations['metro station hall'] = 'Hall serving the Pentagon Metro station on the Blue and Yellow lines, the main visitor arrival point on the southeast side. Shape is schematic.';
for (const [slug, side] of [['e', 'E'], ['a', 'A']]) {
  for (const s of SIDES) {
    explanations[`${slug} ring slate roof, ${s} slope`] = `${s[0].toUpperCase() + s.slice(1)} slope of the crosshipped slate roof over ring ${side.toUpperCase()}, the ${slug === 'e' ? 'outermost' : 'innermost'} ring. Roof pitch is schematic.`;
  }
}
explanations['b ring flat roof'] = 'Flat built-up roof deck over ring B, one of the three middle rings with flat roofs. Detailing is schematic.';
explanations['c ring flat roof'] = 'Flat built-up roof deck over ring C, one of the three middle rings with flat roofs. Detailing is schematic.';
explanations['d ring flat roof'] = 'Flat built-up roof deck over ring D, one of the three middle rings with flat roofs. Detailing is schematic.';
explanations['connector corridor hip roof caps'] = 'Gabled slate caps over the ten connector corridors, which share the crosshipped slate roofing of the A and E rings. Exact profiles are schematic.';
explanations['basement level b'] = 'Basement level B below ground; the building has two below-ground levels, B (basement) and M (mezzanine). Depth and extent are schematic.';
explanations['mezzanine level m'] = 'Mezzanine level M below ground, a partial level above the B basement. Depth and extent are schematic.';
explanations['foundation concrete piles'] = 'A sample grid of the 41,492 concrete piles carrying the building on the Potomac floodplain. Only a fraction of the piles are shown; spacing is schematic.';
explanations['basement retaining walls'] = 'Retaining walls compensating for the site\u2019s elevation changes, which range from 10 to 40 ft above sea level. Positions are schematic.';
explanations['concrete access ramps'] = 'Concrete ramps: to save steel for the war effort the building was designed with ramps rather than elevators. Positions are schematic.';
explanations['access roadways'] = 'Access roadways around the reservation; some 30 miles of highways with 21 overpasses and bridges were built for the project. Layout is schematic.';
explanations['south parking lot'] = 'South parking lot, part of the 67 acres of parking sized for 8,770 vehicles. Outline is schematic.';
explanations['north parking lot'] = 'North parking lot by the River Terrace facade. Outline is schematic.';
explanations['heliport pad'] = 'Pentagon Army Heliport: a single pentagon-shaped concrete helipad, 100 by 100 ft, on the northern side of the building, used to ferry VIPs by helicopter. Exact position is schematic.';
explanations['river entrance lagoon'] = 'The lagoon below the River entrance, which faces Washington across the water; a landing dock here ferried personnel until the late 1960s. Shape is schematic.';
explanations['parade lawns'] = 'Lawns flanking the Mall entrance terrace. Extent is schematic.';
explanations['bus station canopy'] = 'Canopy over the bus station by the southeast visitor entrance. Shape is schematic.';
explanations['perimeter security fence'] = 'Security fence around the building perimeter. Alignment is schematic.';
explanations['heating plant'] = 'Heating plant serving the building, one of the utility buildings on the reservation. Shape and position are schematic.';
explanations['refrigeration plant'] = 'Refrigeration plant serving the building. Shape and position are schematic.';
explanations['stair and lift cores'] = 'Stair and lift cores rising through the rings; the building counts 131 stairways and 19 escalators. Positions are schematic.';
explanations['roof plant rooms'] = 'Mechanical plant rooms on the flat roofs of the middle rings. Positions are schematic.';
explanations['pentagon memorial plaza'] = 'Plaza of the Pentagon memorial on the west side of the building, near where American Airlines Flight 77 struck on September 11, 2001. Layout is schematic.';
explanations['pentagon memorial benches'] = 'A sample of the memorial benches honoring those killed in the September 11, 2001 attack. Only a fraction are shown; arrangement is schematic.';
explanations['memorial entrance gate'] = 'Entrance gate to the memorial grounds. Position is schematic.';

// ---------------------------------------------------------------- serialize
// Atlas scale: the longest model dimension maps to 2.4 atlas units.
const gmin = [Infinity, Infinity, Infinity];
const gmax = [-Infinity, -Infinity, -Infinity];
for (const p of parts) {
  for (const g of p.geoms) {
    g.computeBoundingBox();
    const bb = g.boundingBox;
    for (let a = 0; a < 3; a++) {
      gmin[a] = Math.min(gmin[a], bb.min.getComponent(a));
      gmax[a] = Math.max(gmax[a], bb.max.getComponent(a));
    }
  }
}
const longestDimension = Math.max(gmax[0] - gmin[0], gmax[1] - gmin[1], gmax[2] - gmin[2]);
const S = 2.4 / longestDimension;
console.log(`Longest dimension ${longestDimension.toFixed(1)} m -> S = ${S.toExponential(3)}`);

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
const binName = 'pentagon-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the pentagon directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'The Pentagon, Arlington VA (detailed schematic)',
  title: 'The Pentagon',
  location: 'Arlington, Virginia, United States',
  blurb: 'Headquarters of the US Department of Defense: five concentric pentagonal rings, A to E, around a five-acre courtyard, joined by ten radial corridors. Built in about 16 months during 1941 to 1943, its Indiana limestone walls hold about 6.5 million sq ft of floor space, among the largest office buildings in the world.',
  sourceUrls: [
    { label: 'Wikipedia: Pentagon (United States)', url: 'https://en.wikipedia.org/wiki/Pentagon_(United_States)' },
    { label: 'DoD: Renovation of the Pentagon (1999)', url: 'https://www.esd.whs.mil/Portals/54/Documents/FOID/Reading%20Room/Acquisition_Budget_and_Financial_Matters/Renovation_1March1999.pdf?ver=2017-05-15-134520-047' },
    { label: 'Virginia DHR: Pentagon National Register nomination', url: 'https://dhr.am.virginia.gov/wp-content/uploads/2023/03/000-0072_The_Pentagon_Office_Complex_2023_Update_BI_NRHP_Final.pdf' },
    { label: 'GlobalSecurity.org: The Pentagon', url: 'http://www.globalsecurity.org/military/facility/pentagon.htm' },
    { label: 'Wikipedia: Pentagon Army Heliport', url: 'https://en.wikipedia.org/wiki/Pentagon_Army_Heliport' },
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
  chunks: [{ url: '/models/pentagon/pentagon-0.bin', bytes: offset }],
  triangles,
  // Wide and low: the exploded view needs horizontal room to read the five
  // rings and the radiating corridors.
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));

// Geometry freshness gate against the simple model: 0 shared part names
// and 0 identical bounds. The simple generator must run first.
const simplePath = path.join(outDir, '..', 'pentagon-simple', 'atlas.json');
if (fs.existsSync(simplePath)) {
  const simpleAtlas = JSON.parse(fs.readFileSync(simplePath, 'utf8'));
  const simpleNames = new Set(simpleAtlas.parts.map((p) => p.name));
  const simpleBounds = new Set(simpleAtlas.parts.map((p) => JSON.stringify(p.bounds)));
  const nameHits = [];
  const boundHits = [];
  for (const r of records) {
    if (simpleNames.has(r.part.name)) nameHits.push(r.part.name);
    if (simpleBounds.has(JSON.stringify(r.bounds))) boundHits.push(r.part.name);
  }
  console.log(`Freshness vs simple: ${nameHits.length} shared names, ${boundHits.length} identical bounds`);
  if (nameHits.length || boundHits.length) {
    console.error('SHARED NAMES:', nameHits);
    console.error('IDENTICAL BOUNDS:', boundHits);
    process.exit(1);
  }
} else {
  console.log('Freshness check skipped: pentagon-simple/atlas.json not built yet');
}
