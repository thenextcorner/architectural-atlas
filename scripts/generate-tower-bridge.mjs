// Procedural Tower Bridge for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Tower Bridge in code and
// writes it in the atlas binary format:
//   public/models/tower-bridge/atlas.json
//   public/models/tower-bridge/tower-bridge-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/tower-bridge-attribution.md,
// opened 2026-09-30):
//   Grade I listed combined bascule and suspension bridge over the Thames,
//   London; built 1886-1894 (construction started 22 April 1886, foundation
//   stone 21 June 1886, opened 30 June 1894 by the Prince and Princess of
//   Wales); designed by Sir Horace Jones, engineered by Sir John Wolfe Barry
//   with Henry Marc Brunel; Jones died 1887, George Stevenson replaced the
//   brick facade with Victorian Gothic in Cornish granite and Portland stone;
//   940 ft (290 m) total including abutments; approaches 1,260 ft north and
//   780 ft south; width 60 ft between parapets, 49 ft across the opening
//   span; two towers each 213 ft (65 m) high on piers; central span 200 ft
//   (61 m); side spans 270 ft (82 m) each; piers 185 ft long and 70 ft wide;
//   act required 200 ft clear opening, 135 ft above Trinity high water when
//   open, 29 ft when closed; towers are a steel skeleton faced with granite
//   and Portland stone backed with brickwork, with an octagonal steel column
//   119 ft 6 in long at each corner of each tower; smaller abutment towers
//   generally similar on a smaller scale; roadway passes through each tower,
//   low-level footways pass around the outside of the towers; bascules about
//   1,070 tons each including ballast and paving, counterbalanced, raised in
//   five minutes, arc of rotation 82 degrees, pivot 13 ft 3 in inside the
//   pier face and 5 ft 7 in below the roadway; each leaf four parallel
//   girders 13 ft 6 in apart and about 160 ft long, pivot a 25-ton solid
//   shaft 1 ft 9 in in diameter and 48 ft long passing through the girders
//   50 ft from their shore ends; quadrants with toothed racks on the outside
//   girders, two racks per quadrant; pinions on two shafts across the
//   bridge, one above the other, geared 6 to 1; hydraulic engines in
//   chambers at the ends of the piers, one end driving one bascule and the
//   other in reserve; walkways 143 ft (44 m) above high water, designed as
//   55 ft cantilevers from each tower with girders bridging the 120 ft
//   between, converted to suspension bridges in 1960, accessed by lifts and
//   stairs, closed 1910, reopened 1982 as the Tower Bridge Exhibition, glass
//   floors fitted 2014; suspension side spans with rods anchored at the
//   abutments and through rods contained within the upper walkways; original
//   hydraulics: six accumulators at 750 psi (5.2 MPa) fed by a pair of
//   stationary steam engines, 20-inch rams under very heavy weights, two
//   pairs of engines per pier (8 1/2 in and 7 1/2 in, three cylinders each)
//   for redundancy, designed by Hamilton Owen Rendel for Armstrong, Mitchell
//   and Company; 1974 electro-hydraulic drive by BHA Cromwell House with oil
//   in place of water, only the final pinions surviving; 1942 Vickers 150 hp
//   reserve engine; chimney on the bridge painted to look like a lamppost,
//   serving a guardroom fireplace in one pier; original signalling by red
//   semaphore signals on control cabins at each pier end by day and red and
//   green lights by night, with a gong in fog; piers hold over 70,000 long
//   tons of concrete; over 11,000 long tons of steel in towers and walkways;
//   total cost 1,184,000 pounds; about 40,000 crossings a day; 20 mph limit
//   and 18-tonne weight limit with camera enforcement; bascules raised about
//   a thousand times a year; colours: originally brown, red white and blue
//   for the 1977 Silver Jubilee, stripped to bare metal and repainted blue
//   and white in the 2008-2012 facelift.
// Schematic (not sourced, never stated as fact in the UI): exact pier,
// tower, abutment and approach outlines; tower leg and portal geometry;
// pinnacle, arch, window, frieze, crest and urn profiles; chain curves and
// suspender spacing; counterweight, girder and rack shapes; walkway tube and
// roof profiles; hydraulic pipe routing and engine placement; guardroom and
// chamber interiors; lamp, cabin, camera and signal positions; approach stub
// length and abutment tower heights.
//
// Granularity: 101 named parts across 9 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-tower-bridge.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'tower-bridge');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (940 ft = 286.5 m) maps to 2.4 units.
const S = 2.4 / 286.51;

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
// Pointed Gothic arch across a portal: two struts meeting at a point.
function gothicArch(x, ySpring, zHalf, rise, w) {
  return [
    strut([x, ySpring, -zHalf], [x, ySpring + rise, 0], w),
    strut([x, ySpring, zHalf], [x, ySpring + rise, 0], w),
  ];
}
// Suspension chain along a parabola from (x0,y0) to (x1,y1) with mid dip.
function chain(x0, y0, x1, y1, dip, z, n = 14, w = 0.55) {
  const geoms = [];
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * Math.pow(t, 2.2) - dip * Math.sin(Math.PI * t);
    if (prev) geoms.push(strut([prev[0], prev[1], z], [x, y, z], w));
    prev = [x, y];
  }
  return geoms;
}
function chainY(x0, y0, x1, y1, dip, x) {
  const t = (x - x0) / (x1 - x0);
  return y0 + (y1 - y0) * Math.pow(t, 2.2) - dip * Math.sin(Math.PI * t);
}
// Gothic pinnacle: square base, spire cone, finial ball.
function pinnacle(x, z, y0, s = 1) {
  const g = [];
  g.push(box(x - 1.3 * s, x + 1.3 * s, y0, y0 + 5 * s, z - 1.3 * s, z + 1.3 * s));
  g.push(cone(1.9 * s, 6 * s, x, y0 + 8 * s, z, 8));
  const ball = new THREE.SphereGeometry(0.45 * s, 8, 6);
  ball.translate(x, y0 + 11.4 * s, z);
  g.push(ball);
  return g;
}

// ---------------------------------------------------------------- layout constants (meters, sourced where noted)
const TC = 30.48; // tower centers: 200 ft apart
const ABUT = 112.78; // abutment faces: 270 ft side spans from tower centers
const ABUT_END = 143.26; // abutments run to the 940 ft overall length
const WALKY = 34.75; // walkways 143 ft above high water, 29 ft clearance datum

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Piers: 185 ft by 70 ft concrete masses in the Thames (sourced dims).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const cx = s * TC;
  addPart(`${p}-pier-body`, `${p[0].toUpperCase() + p.slice(1)} pier body`, 'piers', [
    box(cx - 10.67, cx + 10.67, -12, -1, -28.19, 28.19),
  ]);
  const st = [];
  for (const zs of [-1, 1]) {
    st.push(box(cx - 10.67, cx + 10.67, -9, -3, zs * 28.19, zs * (28.19 + 5)));
    const cap = new THREE.CylinderGeometry(0.1, 4.5, 5, 4, 1);
    cap.rotateY(Math.PI / 4);
    cap.scale(21.34 / 9, 1, 5 / 9);
    cap.translate(cx, -0.5, zs * (28.19 + 5));
    st.push(cap);
  }
  addPart(`${p}-pier-starlings`, `${p[0].toUpperCase() + p.slice(1)} pier starlings`, 'piers', st);
  const cl = [];
  for (const [x0, x1, z0, z1] of [
    [cx - 11.07, cx - 10.67, -28.59, 28.59],
    [cx + 10.67, cx + 11.07, -28.59, 28.59],
    [cx - 10.67, cx + 10.67, -28.59, -28.19],
    [cx - 10.67, cx + 10.67, 28.19, 28.59],
  ]) cl.push(box(x0, x1, -7, -1, z0, z1));
  addPart(`${p}-pier-masonry`, `${p[0].toUpperCase() + p.slice(1)} pier masonry cladding`, 'piers', cl);
  const ch = [box(cx - 10, cx + 10, -10, -2, -8, 8)];
  for (let i = 0; i < 8; i++) {
    const gx = cx - 9 + i * (18 / 7);
    ch.push(box(gx - 0.35, gx + 0.35, -4.2, -3.4, -9, 9));
  }
  addPart(`${p}-bascule-chamber`, `${p[0].toUpperCase() + p.slice(1)} bascule chamber`, 'piers', ch);
}
{
  const g = [
    box(-37, -33, -8, -5, 18, 22),
    box(-36.4, -35.2, -7.4, -5.6, 21.6, 22),
  ];
  g.push(cyl(0.32, 0.32, 9.5, -35, -0.5, 8.5, 8));
  g.push(cyl(0.5, 0.5, 0.5, -35, 4.4, 8.5, 8));
  addPart('north-pier-guardroom', 'North pier guardroom', 'piers', g);
}
addPart('thames-water', 'River Thames', 'piers', [box(-150, 150, -9.34, -8.84, -45, 45)]);

// --- Towers: steel skeleton in granite and Portland stone (sourced).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const cx = s * TC;
  addPart(`${p}-tower-base`, `${P} tower base`, 'towers', [
    box(cx - 14, cx + 14, -4, 3, -10, 10),
  ]);
  addPart(`${p}-tower-legs`, `${P} tower legs`, 'towers', [
    box(cx - 10, cx + 10, 3, 20, -10, -3.5),
    box(cx - 10, cx + 10, 3, 20, 3.5, 10),
  ]);
  const arch = [box(cx - 10, cx + 10, 24, 26, -10, 10)];
  for (const fx of [cx - 10, cx + 10]) arch.push(...gothicArch(fx, 20, 3.5, 4, 1.4));
  addPart(`${p}-portal-arch`, `${P} portal arch`, 'towers', arch);
  const cols = [];
  for (const dx of [-6.5, 6.5]) for (const dz of [-7.5, 7.5]) {
    cols.push(cyl(1.1, 1.1, 36.4, cx + dx, 18.2, dz, 8));
  }
  addPart(`${p}-tower-columns`, `${P} tower steel columns`, 'towers', cols);
  addPart(`${p}-tower-upper`, `${P} tower upper stage`, 'towers', [
    box(cx - 8, cx + 8, 26, 50, -8, 8),
  ]);
  const lan = [];
  for (const [lx, lz, ry] of [
    [cx - 8.15, -4, 0], [cx - 8.15, 4, 0], [cx + 8.15, -4, 0], [cx + 8.15, 4, 0],
    [cx - 4, -8.15, 1], [cx + 4, -8.15, 1], [cx - 4, 8.15, 1], [cx + 4, 8.15, 1],
  ]) {
    const w = box(-0.7, 0.7, 32, 40, -0.25, 0.25);
    if (ry) w.rotateY(Math.PI / 2);
    w.translate(lx, 0, lz);
    lan.push(w);
  }
  addPart(`${p}-tower-lancets`, `${P} tower lancet windows`, 'towers', lan);
  const pin = [];
  for (const dx of [-6.5, 6.5]) for (const dz of [-6.5, 6.5]) pin.push(...pinnacle(cx + dx, dz, 50));
  addPart(`${p}-tower-pinnacles`, `${P} tower pinnacles`, 'towers', pin);
  const mf = [box(cx - 12, cx + 12, -3, 2, -9, 9)];
  for (const dz of [-6.17, 6.17]) {
    const sh = new THREE.CylinderGeometry(0.4, 0.4, 16, 8);
    sh.rotateX(Math.PI / 2);
    sh.translate(cx, 0.3, dz);
    mf.push(sh);
  }
  addPart(`${p}-tower-machinery-floor`, `${P} tower machinery floor`, 'towers', mf);
  addPart(`${p}-tower-staircase`, `${P} tower staircase`, 'towers', [
    box(cx - 6.5, cx - 4.5, 0, 35, -1.25, 1.25),
  ]);
  addPart(`${p}-tower-lift-shaft`, `${P} tower lift shaft`, 'towers', [
    box(cx + 4, cx + 6.5, 0, 35, -1.25, 1.25),
  ]);
}

// --- Bascules: two 1,070-ton leaves (sourced weights and pivot data).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const tail = s * 45.72, tip = 0, piv = s * TC;
  const girders = [];
  for (const gz of [-6.17, -2.06, 2.06, 6.17]) {
    const x0 = Math.min(tail, tip), x1 = Math.max(tail, tip);
    girders.push(box(x0, x1, -3, -0.5, gz - 0.45, gz + 0.45));
  }
  for (let i = 0; i < 6; i++) {
    const gx = tail + (i + 0.5) * ((tip - tail) / 6);
    girders.push(box(gx - 0.3, gx + 0.3, -3, -0.5, -6.6, 6.6));
  }
  addPart(`${p}-leaf-girders`, `${P} bascule girders`, 'bascules', girders);
  {
    const x0 = Math.min(tail, tip), x1 = Math.max(tail, tip);
    addPart(`${p}-leaf-deck`, `${P} bascule deck`, 'bascules', [box(x0, x1, -0.5, 0.05, -7.45, 7.45)]);
  }
  {
    const x0 = Math.min(tail, piv), x1 = Math.max(tail, piv);
    addPart(`${p}-leaf-counterweight`, `${P} bascule counterweight`, 'bascules', [
      box(x0, x1, -8, -2, -6, 6),
      box(x0, x1, -8, -6.5, -6.6, 6.6),
    ]);
  }
  {
    const shaft = cyl(0.27, 0.27, 14.63, 0, 0, 0, 10);
    shaft.rotateX(Math.PI / 2);
    shaft.translate(piv, -1.7, 0);
    addPart(`${p}-leaf-pivot`, `${P} bascule pivot`, 'bascules', [shaft]);
  }
  const racks = [];
  for (const gz of [-6.17, 6.17]) {
    const arc = new THREE.TorusGeometry(4, 0.5, 8, 12, Math.PI / 2.4);
    arc.translate(piv, -1.7, gz);
    racks.push(arc);
  }
  addPart(`${p}-leaf-racks`, `${P} bascule racks`, 'bascules', racks);
  {
    const x0 = Math.min(tail, tip), x1 = Math.max(tail, tip);
    addPart(`${p}-leaf-footway`, `${P} bascule footway`, 'bascules', [
      box(x0, x1, 0.05, 0.2, -9.5, -7.45),
      box(x0, x1, 0.05, 0.2, 7.45, 9.5),
    ]);
  }
  {
    const x0 = Math.min(tail, tip), x1 = Math.max(tail, tip);
    addPart(`${p}-leaf-railing`, `${P} bascule railing`, 'bascules', [
      box(x0, x1, 0.2, 1.3, -9.7, -9.5),
      box(x0, x1, 0.2, 1.3, 9.5, 9.7),
    ]);
  }
}

// --- High-level walkways: 143 ft above high water (sourced height).
for (const [id, name, zc] of [
  ['west-walkway', 'West high-level walkway', -9],
  ['east-walkway', 'East high-level walkway', 9],
]) {
  addPart(id, name, 'walkways', [box(-TC, TC, WALKY - 2.5, WALKY + 2.5, zc - 2, zc + 2)]);
}
for (const [id, name, zc] of [
  ['west-walkway-glass', 'West walkway glass floor', -9],
  ['east-walkway-glass', 'East walkway glass floor', 9],
]) {
  const panels = [];
  for (let i = 0; i < 8; i++) {
    const x0 = -TC + 4 + i * ((2 * TC - 8) / 8);
    panels.push(box(x0, x0 + (2 * TC - 8) / 8 - 0.8, WALKY - 2.5, WALKY - 2.15, zc - 1.6, zc + 1.6));
  }
  addPart(id, name, 'walkways', panels);
}
for (const [id, name, zc] of [
  ['west-walkway-roof', 'West walkway roof', -9],
  ['east-walkway-roof', 'East walkway roof', 9],
]) {
  addPart(id, name, 'walkways', [box(-TC, TC, WALKY + 2.5, WALKY + 3.1, zc - 2.2, zc + 2.2)]);
}
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const stubs = [];
  for (const zc of [-9, 9]) {
    const x0 = Math.min(s * TC, s * (TC - 16.76)), x1 = Math.max(s * TC, s * (TC - 16.76));
    stubs.push(box(x0, x1, WALKY - 2.5, WALKY + 2.5, zc - 2, zc + 2));
  }
  addPart(`${p}-walkway-stubs`, `${P} walkway cantilever stubs`, 'walkways', stubs);
}
{
  const g = [];
  for (const zc of [-9, 9]) g.push(box(-18.29, 18.29, WALKY - 2.5, WALKY + 2.5, zc - 2, zc + 2));
  addPart('walkway-centre-girder', 'Walkway centre girder', 'walkways', g);
}
{
  const g = [];
  for (const zc of [-9, 9]) {
    const rod = new THREE.CylinderGeometry(0.15, 0.15, 2 * TC, 8);
    rod.rotateZ(Math.PI / 2);
    rod.translate(0, WALKY, zc);
    g.push(rod);
  }
  addPart('walkway-through-rods', 'Walkway through rods', 'walkways', g);
}

// --- Suspension side spans: 270 ft each (sourced length).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const x0 = Math.min(s * TC, s * ABUT), x1 = Math.max(s * TC, s * ABUT);
  addPart(`${p}-suspension-deck`, `${P} suspension deck`, 'suspension', [
    box(x0, x1, 0, 0.8, -9.14, 9.14),
  ]);
  const chains = [];
  for (const zc of [-8, 8]) chains.push(...chain(s * ABUT, 6, s * TC, 40, 12, zc));
  addPart(`${p}-suspension-chains`, `${P} suspension chains`, 'suspension', chains);
  const susp = [];
  for (let i = 1; i < 12; i++) {
    const x = s * ABUT + (i / 12) * (s * TC - s * ABUT);
    for (const zc of [-8, 8]) {
      const cy = chainY(s * ABUT, 6, s * TC, 40, 12, x);
      if (cy > 1.2) susp.push(strut([x, 0.8, zc], [x, cy, zc], 0.3));
    }
  }
  addPart(`${p}-suspension-suspenders`, `${P} suspension suspenders`, 'suspension', susp);
  addPart(`${p}-chain-anchorage`, `${P} chain anchorage`, 'suspension', [
    box(s * ABUT - s * 3, s * ABUT + s * 1, 0, 6, -10, -6),
    box(s * ABUT - s * 3, s * ABUT + s * 1, 0, 6, 6, 10),
  ]);
  const tr = [box(x0, x1, -3, -2.2, -8.6, -7.8), box(x0, x1, -3, -2.2, 7.8, 8.6)];
  for (let i = 0; i <= 10; i++) {
    const x = x0 + (i / 10) * (x1 - x0);
    for (const zc of [-8.2, 8.2]) tr.push(strut([x, -3, zc - 0.4], [x, 0, zc + 0.4], 0.35));
  }
  addPart(`${p}-deck-stiffening`, `${P} deck stiffening truss`, 'suspension', tr);
}

// --- Deck: roadway, footways, parapets, furniture.
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const x0 = Math.min(s * TC, s * ABUT_END), x1 = Math.max(s * TC, s * ABUT_END);
  addPart(`roadway-${p}`, `${P} roadway`, 'deck', [box(x0, x1, 0.05, 0.35, -7.45, 7.45)]);
  addPart(`parapet-${p}`, `${P} parapet`, 'deck', [
    box(x0, x1, 0.35, 1.4, -9.34, -9.14),
    box(x0, x1, 0.35, 1.4, 9.14, 9.34),
  ]);
}
for (const [id, name, zs] of [
  ['footway-east', 'East low-level footway', 1],
  ['footway-west', 'West low-level footway', -1],
]) {
  const g = [
    box(-ABUT_END, -TC - 14, 0.05, 0.2, zs * 7.45, zs * 9.14),
    box(TC + 14, ABUT_END, 0.05, 0.2, zs * 7.45, zs * 9.14),
    box(-TC - 14, TC + 14, 0.05, 0.2, zs * 7.45, zs * 9.14),
    box(-TC - 14, -TC + 14, 0.05, 0.2, zs * 10, zs * 12.5),
    box(TC - 14, TC + 14, 0.05, 0.2, zs * 10, zs * 12.5),
  ];
  addPart(id, name, 'deck', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const x0 = Math.min(s * TC, s * ABUT_END), x1 = Math.max(s * TC, s * ABUT_END);
    for (const zs of [-1, 1]) g.push(box(x0, x1, 0.35, 1.2, zs * 7.45 - 0.1, zs * 7.45 + 0.1));
  }
  addPart('roadway-fences', 'Roadway fences', 'deck', g);
}
{
  const g = [];
  for (let x = -140; x <= 140; x += 20) {
    for (const zs of [-1, 1]) {
      g.push(cyl(0.12, 0.16, 5, x, 2.5, zs * 8.5, 6));
      g.push(box(x - 0.5, x + 0.5, 4.9, 5.5, zs * 8.5 - 0.3, zs * 8.5 + 0.3));
    }
  }
  addPart('lamp-standards', 'Lamp standards', 'deck', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    for (const e of [-1, 1]) {
      const cx = s * TC + e * 10.67;
      g.push(box(cx - 1.2, cx + 1.2, 0, 2.5, -1.2, 1.2));
    }
  }
  addPart('control-cabins', 'Control cabins', 'deck', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    for (const e of [-1, 1]) {
      const cx = s * TC + e * 10.67;
      g.push(cyl(0.08, 0.08, 4, cx, 4.5, 0, 6));
      g.push(box(cx - 1.4, cx + 1.4, 6.2, 6.7, -0.15, 0.15));
    }
  }
  addPart('semaphore-signals', 'Semaphore signals', 'deck', g);
}
{
  const g = [];
  for (const s of [-1, 1]) for (const zs of [-1, 1]) {
    g.push(cyl(0.1, 0.1, 4.5, s * 60, 2.25, zs * 8, 6));
    g.push(box(s * 60 - 0.4, s * 60 + 0.4, 4.4, 5, zs * 8 - 0.3, zs * 8 + 0.3));
  }
  addPart('speed-cameras', 'Speed cameras', 'deck', g);
}
{
  const g = [];
  for (const x of [-TC, TC, -ABUT, ABUT]) g.push(box(x - 0.3, x + 0.3, 0.35, 0.45, -7.45, 7.45));
  addPart('expansion-joints', 'Expansion joints', 'deck', g);
}

// --- Hydraulic machinery: steam-driven originals and the 1974 drive.
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const cx = s * TC;
  const acc = [];
  for (const dz of [-15, 0, 15]) {
    acc.push(cyl(1.2, 1.2, 5, cx - 7, -5.5, dz, 10));
    acc.push(box(cx - 8.4, cx - 5.6, -3.2, -2.2, dz - 1.4, dz + 1.4));
  }
  addPart(`accumulators-${p}`, `${P} accumulators`, 'hydraulics', acc);
  const eng = [];
  for (const dz of [-12, 12]) {
    eng.push(box(cx - 3, cx + 3, -8, -5.5, dz - 2, dz + 2));
    eng.push(cyl(0.9, 0.9, 3.4, cx - 1.5, -4.9, dz, 8));
    eng.push(cyl(0.9, 0.9, 3.4, cx + 1.5, -4.9, dz, 8));
  }
  addPart(`steam-engines-${p}`, `${P} steam engines`, 'hydraulics', eng);
  const pin = [];
  for (const dy of [-3.7, 0.3]) {
    const shaft = new THREE.CylinderGeometry(0.4, 0.4, 16, 8);
    shaft.rotateX(Math.PI / 2);
    shaft.translate(cx, dy, 0);
    pin.push(shaft);
    for (const dz of [-6.17, 6.17]) {
      const disc = new THREE.CylinderGeometry(1.1, 1.1, 0.5, 12);
      disc.rotateX(Math.PI / 2);
      disc.translate(cx, dy, dz);
      pin.push(disc);
    }
  }
  addPart(`pinion-shafts-${p}`, `${P} pinion shafts`, 'hydraulics', pin);
}
{
  const g = [];
  for (const zs of [-1, 1]) {
    const main = new THREE.CylinderGeometry(0.25, 0.25, 220, 8);
    main.rotateZ(Math.PI / 2);
    main.translate(0, -1, zs * 9.5);
    g.push(main);
  }
  addPart('hydraulic-mains', 'Hydraulic mains', 'hydraulics', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(box(s * TC - 2.5, s * TC + 2.5, -4, -2, -8, -6));
    g.push(box(s * TC - 2.5, s * TC + 2.5, -4, -2, 6, 8));
  }
  addPart('electro-hydraulic-drive', 'Electro-hydraulic drive', 'hydraulics', g);
}
addPart('wartime-engine', 'Wartime reserve engine', 'hydraulics', [
  box(TC - 2, TC + 2, -8, -5.2, -17, -13),
  cyl(0.8, 0.8, 3, TC, -4.7, -15, 8),
]);
{
  const g = [box(118, 132, 0, 8, 12, 24), box(120, 130, 8, 9.5, 14, 22)];
  g.push(cyl(0.9, 1.2, 18, 125, 9, 18, 10));
  addPart('engine-room-south', 'Victorian engine room', 'hydraulics', g);
}
{
  const g = [];
  for (const bx of [121, 127]) {
    const b = new THREE.CylinderGeometry(1.5, 1.5, 6, 10);
    b.rotateZ(Math.PI / 2);
    b.translate(bx, 2, 18);
    g.push(b);
  }
  addPart('steam-boilers', 'Steam boilers', 'hydraulics', g);
}

// --- Abutments and approaches.
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const x0 = Math.min(s * ABUT, s * ABUT_END), x1 = Math.max(s * ABUT, s * ABUT_END);
  addPart(`${p}-abutment`, `${P} abutment`, 'abutments', [box(x0, x1, -4, 0, -12, 12)]);
  const tx = s * 128;
  const tw = [];
  tw.push(box(tx - 4, tx + 4, 0, 18, -12, -4));
  tw.push(box(tx - 4, tx + 4, 0, 18, 4, 12));
  tw.push(...pinnacle(tx, -8, 18, 0.8));
  tw.push(...pinnacle(tx, 8, 18, 0.8));
  addPart(`${p}-abutment-tower`, `${P} abutment tower`, 'abutments', tw);
  const sx0 = Math.min(s * ABUT_END, s * (ABUT_END + 30)), sx1 = Math.max(s * ABUT_END, s * (ABUT_END + 30));
  addPart(`${p}-approach-stub`, `${P} approach stub`, 'abutments', [
    box(sx0, sx1, -0.5, 0.05, -9.14, 9.14),
  ]);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const sx0 = Math.min(s * ABUT_END, s * (ABUT_END + 30)), sx1 = Math.max(s * ABUT_END, s * (ABUT_END + 30));
    g.push(box(sx0, sx1, 0.05, 1.1, -9.34, -9.14));
    g.push(box(sx0, sx1, 0.05, 1.1, 9.14, 9.34));
  }
  addPart('approach-parapets', 'Approach parapets', 'abutments', g);
}

// --- Ornament: Victorian Gothic dressing.
{
  const g = [];
  for (const s of [-1, 1]) {
    const cx = s * TC;
    for (const [fx, fz, ry] of [
      [cx - 8.15, 0, 0], [cx + 8.15, 0, 0], [cx, -8.15, 1], [cx, 8.15, 1],
    ]) {
      const sh = box(-0.7, 0.7, 30.5, 32.3, -0.2, 0.2);
      if (ry) sh.rotateY(Math.PI / 2);
      sh.translate(fx, 0, fz);
      g.push(sh);
      const tip = cone(0.5, 0.8, 0, 0, 0, 6);
      if (ry) tip.rotateY(Math.PI / 2);
      tip.translate(fx, 32.7, fz);
      g.push(tip);
    }
  }
  addPart('tower-crests', 'Tower crests', 'ornament', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const cx = s * TC;
    g.push(box(cx - 8.3, cx + 8.3, 44, 45.5, -8.3, -8));
    g.push(box(cx - 8.3, cx + 8.3, 44, 45.5, 8, 8.3));
    g.push(box(cx - 8.3, cx - 8, 44, 45.5, -8, 8));
    g.push(box(cx + 8, cx + 8.3, 44, 45.5, -8, 8));
  }
  addPart('gothic-frieze', 'Gothic frieze', 'ornament', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const cx = s * TC;
    for (const dx of [-6.5, 6.5]) for (const dz of [-6.5, 6.5]) {
      for (const [ox, oz] of [[-1.3, 0], [1.3, 0], [0, -1.3], [0, 1.3]]) {
        g.push(cone(0.35, 1.6, cx + dx + ox, 53.8, dz + oz, 6));
      }
    }
  }
  addPart('pinnacle-crockets', 'Pinnacle crockets', 'ornament', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const tx = s * 128;
    for (const [ux, uz] of [[-4, -12], [4, -12], [-4, -4], [4, -4], [-4, 4], [4, 4], [-4, 12], [4, 12]]) {
      g.push(cyl(0.5, 0.3, 1.2, tx + ux, 18.6, uz, 8));
      const orb = new THREE.SphereGeometry(0.35, 8, 6);
      orb.translate(tx + ux, 19.5, uz);
      g.push(orb);
    }
  }
  addPart('abutment-urns', 'Abutment urns', 'ornament', g);
}
{
  const g = [];
  for (const zc of [-9, 9]) {
    for (let x = -30; x <= 30; x += 15) {
      g.push(cyl(0.08, 0.1, 2.2, x, WALKY + 4.2, zc, 6));
      g.push(box(x - 0.35, x + 0.35, WALKY + 5.1, WALKY + 5.8, zc - 0.35, zc + 0.35));
    }
  }
  addPart('walkway-lanterns', 'Walkway lanterns', 'ornament', g);
}
addPart('foundation-stone', 'Foundation stone', 'ornament', [
  box(-132.3, -131.9, 2, 3.4, -8.2, -7.8),
]);
addPart('opening-plaque', 'Opening plaque', 'ornament', [
  box(TC - 14.2, TC - 13.8, 1, 2.2, -2, 2),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette: pale blue painted steel, Portland stone cream,
// Cornish granite grey, asphalt deck. The Eiffel Tower is the only dark
// realistic model in the atlas.
function colorFor(id) {
  if (id.endsWith('-pier-body')) return '#b9b3a8';
  if (id.endsWith('-pier-starlings')) return '#9d978b';
  if (id.endsWith('-pier-masonry')) return '#a8a096';
  if (id.endsWith('-bascule-chamber')) return '#8a8478';
  if (id === 'north-pier-guardroom') return '#a89a80';
  if (id === 'thames-water') return '#7fb3d5';
  if (id.endsWith('-tower-base')) return '#b5ada0';
  if (id.endsWith('-tower-legs')) return '#e0d6bd';
  if (id.endsWith('-portal-arch')) return '#e8dfc9';
  if (id.endsWith('-tower-columns')) return '#7fa8c9';
  if (id.endsWith('-tower-upper')) return '#e8dfc9';
  if (id.endsWith('-tower-lancets')) return '#4a5560';
  if (id.endsWith('-tower-pinnacles')) return '#e0d6bd';
  if (id.endsWith('-tower-machinery-floor')) return '#6b7a8a';
  if (id.endsWith('-tower-staircase') || id.endsWith('-tower-lift-shaft')) return '#c9bfa8';
  if (id.endsWith('-leaf-girders')) return '#5b8ab5';
  if (id.endsWith('-leaf-deck')) return '#62666a';
  if (id.endsWith('-leaf-counterweight')) return '#7a8896';
  if (id.endsWith('-leaf-pivot')) return '#4a5a6a';
  if (id.endsWith('-leaf-racks')) return '#3f4a55';
  if (id.endsWith('-leaf-footway')) return '#cfc6b4';
  if (id.endsWith('-leaf-railing')) return '#8fb3d1';
  if (id === 'west-walkway' || id === 'east-walkway') return '#dfe4e8';
  if (id.endsWith('-walkway-glass')) return '#a8d8e8';
  if (id.endsWith('-walkway-roof')) return '#8fb3d1';
  if (id.endsWith('-walkway-stubs') || id === 'walkway-centre-girder') return '#d5dae0';
  if (id === 'walkway-through-rods') return '#6b7a8a';
  if (id.endsWith('-suspension-deck')) return '#62666a';
  if (id.endsWith('-suspension-chains')) return '#5b8ab5';
  if (id.endsWith('-suspension-suspenders')) return '#7fa8c9';
  if (id.endsWith('-chain-anchorage')) return '#a8a096';
  if (id.endsWith('-deck-stiffening')) return '#5b8ab5';
  if (id.startsWith('roadway-')) return '#62666a';
  if (id.startsWith('footway-')) return '#cfc6b4';
  if (id.startsWith('parapet-')) return '#dfe4e8';
  if (id === 'roadway-fences') return '#8fb3d1';
  if (id === 'lamp-standards' || id === 'speed-cameras' || id === 'walkway-lanterns') return '#3f4a55';
  if (id === 'control-cabins') return '#b9b3a8';
  if (id === 'semaphore-signals') return '#b04a3a';
  if (id === 'expansion-joints') return '#3a3d40';
  if (id.startsWith('accumulators-')) return '#4a5a6a';
  if (id.startsWith('steam-engines-') || id === 'wartime-engine') return '#3f4a55';
  if (id === 'steam-boilers') return '#4a5a6a';
  if (id === 'hydraulic-mains') return '#7a8896';
  if (id.startsWith('pinion-shafts-')) return '#4a5a6a';
  if (id === 'electro-hydraulic-drive') return '#5b6a7a';
  if (id === 'engine-room-south') return '#d9cfbb';
  if (id.endsWith('-abutment')) return '#cfc4a8';
  if (id.endsWith('-abutment-tower')) return '#e0d6bd';
  if (id.endsWith('-approach-stub')) return '#62666a';
  if (id === 'approach-parapets') return '#dfe4e8';
  if (id === 'tower-crests') return '#c9a227';
  if (id === 'gothic-frieze') return '#cbbf9e';
  if (id === 'pinnacle-crockets') return '#e0d6bd';
  if (id === 'abutment-urns') return '#d9cfbb';
  if (id === 'foundation-stone' || id === 'opening-plaque') return '#b9a86a';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'piers', name: 'Piers and foundations', color: '#b0a898', description: 'The two 185 ft by 70 ft concrete piers sunk into the Thames, with their starlings, masonry cladding, bascule chambers and the guardroom.' },
  { id: 'towers', name: 'Towers', color: '#ded3b8', description: 'The two 213 ft steel-framed towers in Cornish granite and Portland stone, with octagonal corner columns, lancet windows and Gothic pinnacles.' },
  { id: 'bascules', name: 'Bascules', color: '#5b8ab5', description: 'The two counterbalanced leaves of the 200 ft opening span, each about 1,070 tons, with girders, racks, pivot and counterweight.' },
  { id: 'walkways', name: 'High-level walkways', color: '#dfe4e8', description: 'The pedestrian walkways 143 ft above high water, carried on cantilevers from the towers, with glass floors fitted in 2014.' },
  { id: 'suspension', name: 'Suspension side spans', color: '#7fa8c9', description: 'The two 270 ft suspension side spans: chains, suspenders, stiffening trusses and abutment anchorages.' },
  { id: 'deck', name: 'Roadway and footways', color: '#c8c2b2', description: 'The low-level deck: roadway, footways passing around the towers, parapets, lamps, signal cabins and cameras.' },
  { id: 'hydraulics', name: 'Hydraulic machinery', color: '#6b7a8a', description: 'The steam-driven hydraulic plant that raises the bascules, and its 1974 electro-hydraulic successor.' },
  { id: 'abutments', name: 'Abutments and approaches', color: '#cfc4a8', description: 'The shore abutments with their smaller towers, and schematic approach stubs.' },
  { id: 'ornament', name: 'Ornament', color: '#cbbf9e', description: 'Victorian Gothic dressing: crests, friezes, crockets, urns, lanterns and commemorative stones.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'north pier body': 'One of two piers sunk into the Thames riverbed to carry the bridge, each stipulated by the 1885 act to be 185 ft long and 70 ft wide. The two piers together hold over 70,000 long tons of concrete. Exact outline is schematic.',
  'south pier body': 'One of two piers sunk into the Thames riverbed to carry the bridge, each stipulated by the 1885 act to be 185 ft long and 70 ft wide. The two piers together hold over 70,000 long tons of concrete. Exact outline is schematic.',
  'north pier starlings': 'Pointed cutwaters shielding the north pier from the river current and debris. Exact profile is schematic.',
  'south pier starlings': 'Pointed cutwaters shielding the south pier from the river current and debris. Exact profile is schematic.',
  'north pier masonry cladding': 'Stone facing protecting the north pier concrete above the waterline. Exact coursing is schematic.',
  'south pier masonry cladding': 'Stone facing protecting the south pier concrete above the waterline. Exact coursing is schematic.',
  'north bascule chamber': 'The chamber inside the north pier housing the bascule counterweight and the roller-bearing girders that carry the pivot. The piers are far more complicated than ordinary bridge piers because they house the counterpoise and the operating machinery. Interior layout is schematic.',
  'south bascule chamber': 'The chamber inside the south pier housing the bascule counterweight and the roller-bearing girders that carry the pivot. The piers are far more complicated than ordinary bridge piers because they house the counterpoise and the operating machinery. Interior layout is schematic.',
  'north pier guardroom': 'A guardroom inside the north pier with a fireplace whose chimney rises through the bridge disguised as a lamppost. Exact position is schematic.',
  'river thames': 'The River Thames at the Pool of London, between the Tower of London and London Bridge. The bridge was built here to serve the East End while keeping the Pool open to tall ships. Water level and extent are schematic.',
  'north tower base': 'Granite plinth of the north tower, spreading its load onto the pier. The towers are faced in Cornish granite below and Portland stone above. Exact outline is schematic.',
  'south tower base': 'Granite plinth of the south tower, spreading its load onto the pier. The towers are faced in Cornish granite below and Portland stone above. Exact outline is schematic.',
  'north tower legs': 'The masonry legs of the north tower, split east and west so the roadway passes through the tower. Exact leg geometry is schematic.',
  'south tower legs': 'The masonry legs of the south tower, split east and west so the roadway passes through the tower. Exact leg geometry is schematic.',
  'north portal arch': 'Pointed Gothic arch over the north tower roadway portal, part of the Victorian Gothic dressing chosen to harmonise with the Tower of London. Exact arch profile is schematic.',
  'south portal arch': 'Pointed Gothic arch over the south tower roadway portal, part of the Victorian Gothic dressing chosen to harmonise with the Tower of London. Exact arch profile is schematic.',
  'north tower steel columns': 'Four octagonal steel columns, each 119 ft 6 in long, one at each corner of the north tower: the structural skeleton inside the stone facing. Positions are schematic.',
  'south tower steel columns': 'Four octagonal steel columns, each 119 ft 6 in long, one at each corner of the south tower: the structural skeleton inside the stone facing. Positions are schematic.',
  'north tower upper stage': 'The upper stage of the north tower in Portland stone, rising past the walkway level toward the 213 ft summit. Exact massing is schematic.',
  'south tower upper stage': 'The upper stage of the south tower in Portland stone, rising past the walkway level toward the 213 ft summit. Exact massing is schematic.',
  'north tower lancet windows': 'Gothic lancet windows lighting the north tower interior, part of the ornate Victorian Gothic style George Stevenson gave the bridge. Exact window layout is schematic.',
  'south tower lancet windows': 'Gothic lancet windows lighting the south tower interior, part of the ornate Victorian Gothic style George Stevenson gave the bridge. Exact window layout is schematic.',
  'north tower pinnacles': 'Four Gothic pinnacles crowning the north tower, the signature silhouette that makes the bridge read as a medieval gatehouse. Exact pinnacle profiles are schematic.',
  'south tower pinnacles': 'Four Gothic pinnacles crowning the south tower, the signature silhouette that makes the bridge read as a medieval gatehouse. Exact pinnacle profiles are schematic.',
  'north tower machinery floor': 'The bascule pivots and operating machinery are housed in the base of each tower, driven by the hydraulic engines in the pier chambers. Interior arrangement is schematic.',
  'south tower machinery floor': 'The bascule pivots and operating machinery are housed in the base of each tower, driven by the hydraulic engines in the pier chambers. Interior arrangement is schematic.',
  'north tower staircase': 'Staircase inside the north tower giving access to the high-level walkways. The walkways were originally reached only by stairs, which is why regular pedestrians seldom used them. Exact layout is schematic.',
  'south tower staircase': 'Staircase inside the south tower giving access to the high-level walkways. The walkways were originally reached only by stairs, which is why regular pedestrians seldom used them. Exact layout is schematic.',
  'north tower lift shaft': 'Lift shaft inside the north tower carrying visitors up to the walkways, part of the Tower Bridge Exhibition route. Exact position is schematic.',
  'south tower lift shaft': 'Lift shaft inside the south tower carrying visitors up to the walkways, part of the Tower Bridge Exhibition route. Exact position is schematic.',
  'north bascule girders': 'Four parallel steel girders, 13 ft 6 in apart and about 160 ft long, forming the structure of the north leaf. Exact girder depth is schematic.',
  'south bascule girders': 'Four parallel steel girders, 13 ft 6 in apart and about 160 ft long, forming the structure of the south leaf. Exact girder depth is schematic.',
  'north bascule deck': 'The roadway plate of the north leaf, spanning half of the 200 ft opening when lowered. Exact plate thickness is schematic.',
  'south bascule deck': 'The roadway plate of the south leaf, spanning half of the 200 ft opening when lowered. Exact plate thickness is schematic.',
  'north bascule counterweight': 'The ballasted tail of the north leaf, extending back into the pier to counterbalance the 100 ft projecting section so the leaf can be raised with little force. Exact shape is schematic.',
  'south bascule counterweight': 'The ballasted tail of the south leaf, extending back into the pier to counterbalance the 100 ft projecting section so the leaf can be raised with little force. Exact shape is schematic.',
  'north bascule pivot': 'The 25-ton solid steel pivot of the north leaf, 1 ft 9 in in diameter and 48 ft long, passing through the girders 50 ft from their shore ends and turning on roller bearings. Exact position is schematic.',
  'south bascule pivot': 'The 25-ton solid steel pivot of the south leaf, 1 ft 9 in in diameter and 48 ft long, passing through the girders 50 ft from their shore ends and turning on roller bearings. Exact position is schematic.',
  'north bascule racks': 'Toothed quadrant racks bolted to the outside girders of the north leaf, two racks per quadrant, engaged by the final pinions of the hydraulic drive. Exact tooth geometry is schematic.',
  'south bascule racks': 'Toothed quadrant racks bolted to the outside girders of the south leaf, two racks per quadrant, engaged by the final pinions of the hydraulic drive. Exact tooth geometry is schematic.',
  'north bascule footway': 'Pedestrian strip beside the roadway on the north leaf, part of the low-level crossing used when the bridge is closed to shipping. Exact width is schematic.',
  'south bascule footway': 'Pedestrian strip beside the roadway on the south leaf, part of the low-level crossing used when the bridge is closed to shipping. Exact width is schematic.',
  'north bascule railing': 'Railing along the north leaf footway. Exact railing pattern is schematic.',
  'south bascule railing': 'Railing along the south leaf footway. Exact railing pattern is schematic.',
  'west high-level walkway': 'The west pedestrian walkway 143 ft above high water, spanning the 200 ft between the towers so foot traffic could continue while the bascules were raised. Closed in 1910 and reopened in 1982 as exhibition space. Exact tube profile is schematic.',
  'east high-level walkway': 'The east pedestrian walkway 143 ft above high water, spanning the 200 ft between the towers so foot traffic could continue while the bascules were raised. Closed in 1910 and reopened in 1982 as exhibition space. Exact tube profile is schematic.',
  'west walkway glass floor': 'Glass floor panels fitted in the west walkway in 2014, letting visitors look straight down at the road and the Thames 143 ft below. Exact panel layout is schematic.',
  'east walkway glass floor': 'Glass floor panels fitted in the east walkway in 2014, letting visitors look straight down at the road and the Thames 143 ft below. Exact panel layout is schematic.',
  'west walkway roof': 'Roof of the west walkway tube. Exact profile is schematic.',
  'east walkway roof': 'Roof of the east walkway tube. Exact profile is schematic.',
  'north walkway cantilever stubs': 'Cantilever arms reaching 55 ft out from the north tower toward midspan, part of the original cantilever design of the walkways before their 1960 conversion to suspension bridges. Exact girder shapes are schematic.',
  'south walkway cantilever stubs': 'Cantilever arms reaching 55 ft out from the south tower toward midspan, part of the original cantilever design of the walkways before their 1960 conversion to suspension bridges. Exact girder shapes are schematic.',
  'walkway centre girder': 'Girders bridging the 120 ft between the ends of the tower cantilevers, completing each walkway span. Exact girder shape is schematic.',
  'walkway through rods': 'Steel through rods contained within the upper walkways, anchoring the suspension rods of the side spans and tying the two towers together against their horizontal pull. Exact routing is schematic.',
  'north suspension deck': 'The deck of the north 270 ft suspension side span, carrying roadway and footways from the abutment to the north tower. Exact deck depth is schematic.',
  'south suspension deck': 'The deck of the south 270 ft suspension side span, carrying roadway and footways from the abutment to the south tower. Exact deck depth is schematic.',
  'north suspension chains': 'The suspension chains of the north side span, anchored at the abutment and rising to the north tower. Exact chain curve is schematic.',
  'south suspension chains': 'The suspension chains of the south side span, anchored at the abutment and rising to the south tower. Exact chain curve is schematic.',
  'north suspension suspenders': 'Vertical suspender rods hanging the north side-span deck from its chains. Exact spacing is schematic.',
  'south suspension suspenders': 'Vertical suspender rods hanging the south side-span deck from its chains. Exact spacing is schematic.',
  'north chain anchorage': 'Anchorage block at the north abutment where the suspension rods are made fast. The side-span rods are anchored both at the abutments and through the walkway rods. Exact block shape is schematic.',
  'south chain anchorage': 'Anchorage block at the south abutment where the suspension rods are made fast. The side-span rods are anchored both at the abutments and through the walkway rods. Exact block shape is schematic.',
  'north deck stiffening truss': 'Stiffening truss beneath the north side-span deck, keeping the slender suspension span rigid under traffic. Exact truss pattern is schematic.',
  'south deck stiffening truss': 'Stiffening truss beneath the south side-span deck, keeping the slender suspension span rigid under traffic. Exact truss pattern is schematic.',
  'north roadway': 'The north section of the A100 roadway across the bridge, part of the London Inner Ring Road carrying about 40,000 crossings a day. Exact surfacing is schematic.',
  'south roadway': 'The south section of the A100 roadway across the bridge, part of the London Inner Ring Road carrying about 40,000 crossings a day. Exact surfacing is schematic.',
  'east low-level footway': 'The east low-level pedestrian footway, passing around the outside of the towers while the roadway passes through them. Exact alignment is schematic.',
  'west low-level footway': 'The west low-level pedestrian footway, passing around the outside of the towers while the roadway passes through them. Exact alignment is schematic.',
  'north parapet': 'Parapet along the north section of the deck, 60 ft apart between parapets across the side spans. Exact railing pattern is schematic.',
  'south parapet': 'Parapet along the south section of the deck, 60 ft apart between parapets across the side spans. Exact railing pattern is schematic.',
  'roadway fences': 'Fences separating the low-level footways from the roadway. Exact fence pattern is schematic.',
  'lamp standards': 'Lamp standards lighting the deck, one of which disguises the guardroom chimney as a lamppost. Exact positions are schematic.',
  'control cabins': 'Small control cabins at the ends of both piers, carrying the red semaphore signals that governed river traffic by day. Exact cabin shapes are schematic.',
  'semaphore signals': 'Red semaphore signals and red and green lights that told vessels whether the bridge was open, with a gong sounded in fog. Exact signal geometry is schematic.',
  'speed cameras': 'Camera enforcement for the 20 mph speed restriction and 18-tonne weight limit that protect the structure. Exact camera positions are schematic.',
  'expansion joints': 'Expansion joints in the deck accommodating thermal movement of the steelwork. Exact joint positions are schematic.',
  'north accumulators': 'Three of the six hydraulic accumulators, storing pressurised water at 750 psi under very heavy weights on 20-inch rams to power the north bascule. Exact placement is schematic.',
  'south accumulators': 'Three of the six hydraulic accumulators, storing pressurised water at 750 psi under very heavy weights on 20-inch rams to power the south bascule. Exact placement is schematic.',
  'north steam engines': 'A pair of stationary steam engines driving the force pumps for the north pier accumulators: a larger 8 1/2 in engine and a smaller 7 1/2 in engine, each with three cylinders, one pair in reserve. Exact engine shapes are schematic.',
  'south steam engines': 'A pair of stationary steam engines driving the force pumps for the south pier accumulators: a larger 8 1/2 in engine and a smaller 7 1/2 in engine, each with three cylinders, one pair in reserve. Exact engine shapes are schematic.',
  'steam boilers': 'Boilers raising steam for the pumping engines. Exact boiler shapes are schematic.',
  'hydraulic mains': 'High-pressure water mains distributing accumulator pressure along the bridge to the bascule engines. Exact routing is schematic.',
  'north pinion shafts': 'The two surviving pinion shafts across the north tower, one above the other, whose final pinions engage the toothed racks on the bascule. Exact gearing is schematic.',
  'south pinion shafts': 'The two surviving pinion shafts across the south tower, one above the other, whose final pinions engage the toothed racks on the bascule. Exact gearing is schematic.',
  'electro-hydraulic drive': 'The 1974 electro-hydraulic drive by BHA Cromwell House that replaced the Victorian mechanism, using oil in place of water and hydraulic motors with gearing. Exact unit shapes are schematic.',
  'wartime reserve engine': 'A 150 hp horizontal cross-compound engine built by Vickers Armstrong at Elswick and installed in 1942 in case bombing damaged the existing engines. Exact position is schematic.',
  'victorian engine room': 'The Victorian engine rooms in a separate building near the south end of the bridge, housing the original steam engines as part of the Tower Bridge Exhibition. Exact building shape is schematic.',
  'north abutment': 'The north shore abutment anchoring the bridge at Tower Hill. The bridge is 940 ft long including the abutments. Exact outline is schematic.',
  'south abutment': 'The south shore abutment anchoring the bridge at Bermondsey. The bridge is 940 ft long including the abutments. Exact outline is schematic.',
  'north abutment tower': 'The smaller north abutment tower, generally similar to the main towers though on a smaller scale. Exact height is schematic.',
  'south abutment tower': 'The smaller south abutment tower, generally similar to the main towers though on a smaller scale. Exact height is schematic.',
  'north approach stub': 'Schematic stub of the north approach viaduct, which runs 1,260 ft back from the abutment. Length and profile are schematic.',
  'south approach stub': 'Schematic stub of the south approach viaduct, which runs 780 ft back from the abutment. Length and profile are schematic.',
  'approach parapets': 'Parapets along the approach stubs. Exact pattern is schematic.',
  'tower crests': 'Gilded crests and shields on the tower faces, part of the Victorian Gothic dressing. Exact heraldry is schematic.',
  'gothic frieze': 'Decorative Gothic frieze banding the towers below the pinnacles. Exact carving is schematic.',
  'pinnacle crockets': 'Crocketed finials dressing the tower pinnacles. Exact carving is schematic.',
  'abutment urns': 'Stone urns crowning the abutment towers. Exact profiles are schematic.',
  'walkway lanterns': 'Lanterns lighting the walkways; the original gas lighting was installed by William Sugg and Company, first with open-flame burners, later incandescent. Exact lantern shapes are schematic.',
  'foundation stone': 'Commemorative stone marking the foundation stone laid by the Prince of Wales on 21 June 1886. Exact inscription is schematic.',
  'opening plaque': 'Plaque commemorating the opening of the bridge on 30 June 1894 by the Prince and Princess of Wales. Exact inscription is schematic.',
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
const binName = 'tower-bridge-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the tower-bridge directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Tower Bridge, London (detailed schematic)',
  title: 'Tower Bridge',
  location: 'London, United Kingdom',
  blurb: 'London\u2019s Grade I listed combined bascule and suspension bridge over the Thames, opened in 1894. Its 213 ft towers frame two 1,070-ton bascules, high-level walkways and 270 ft suspension side spans, raised by steam-driven hydraulics.',
  sourceUrls: [
    { label: 'Wikipedia: Tower Bridge', url: 'http://en.wikipedia.org/wiki/Tower_Bridge' },
    { label: 'RIBA Pix: Tower Bridge', url: 'https://www.ribapix.com/tower-bridge' },
    { label: 'London Wiki: Tower Bridge', url: 'https://london.fandom.com/wiki/Tower_Bridge' },
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
  chunks: [{ url: '/models/tower-bridge/tower-bridge-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so compact packings clip at the top of the
  // frame. 1.4 restores full framing (same value as Sagrada Familia detailed).
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
