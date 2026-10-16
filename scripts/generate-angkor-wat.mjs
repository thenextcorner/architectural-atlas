// Procedural Angkor Wat for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Angkor Wat temple-mountain in
// code and writes it in the atlas binary format:
//   public/models/angkor-wat/atlas.json
//   public/models/angkor-wat/angkor-wat-0.bin
//
// Sourced dimensions and facts (verified via web search 2026-10-10):
//   largest religious monument in the world by land area, 162.6 hectares
//   (401.75 acres); built early 12th century by King Suryavarman II
//   (reigned c. 1113 to 1150) as his state temple, originally dedicated to
//   the Hindu god Vishnu and later converted to Buddhism; combines the
//   Khmer temple-mountain plan with the later galleried-temple plan,
//   designed to represent Mount Meru, home of the gods; central quincunx
//   of five towers (four surrounding a central spire) symbolizing Meru's
//   five peaks, the central tower rising 65 m (213 ft) above the ground;
//   three rectangular galleries, each raised above the next; outer wall
//   3.6 km long; moat more than 5 km long, 190 m wide and about 4 m deep,
//   stabilizing the temple's foundation; oriented to the west (unlike
//   most Khmer temples), entered across a stone causeway with guardian
//   lions; long colonnades connect the towers at each stepped level;
//   walls lined with extensive bas-reliefs and devatas (celestial
//   dancers); the central tower is entered by a steep staircase; the
//   towers are lotus-bud shaped prasats; the famous "Churning of the
//   Ocean of Milk" bas-relief runs along the east gallery; on the
//   Cambodian national flag; Tomb Raider (2001) filmed at Angkor in
//   November 2000 (the tree-root jungle scenes were shot at nearby Ta
//   Prohm, not the main temple); Wong Kar-wai's In the Mood for Love
//   (2000) closes with its final scene shot at Angkor Wat.
// Schematic (not sourced, never stated as fact in the UI): the moat is
// shown at reduced scale (real: 190 m wide, 5 km perimeter) as a
// schematic ring; exact footprints, heights and positions of the three
// gallery platforms, walls, corner towers, porches, libraries, pyramid
// tiers, satellite towers and shrines; naga balustrade and lion counts
// and positions; number and placement of bas-relief panels beyond the
// Churning of the Ocean of Milk; devata count and positions; stair
// counts, widths and step dimensions; all prasat profiles and the
// satellite tower heights (modeled shorter than the 65 m central tower).
//
// Coordinate frame: x = east-west (west entrance at -x), z =
// north-south, y = up. All dimensions in meters.
//
// Granularity: 104 named parts across 9 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-angkor-wat.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'angkor-wat');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~380 m with schematic moat) maps to 2.4 units.
const S = 2.4 / 380;

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
// Triangular prism: triangle in XY (base x0..x1 at y0, apex at mid x, yApex),
// extruded from z0 to z1. Indexed, normals computed.
function prism(x0, x1, y0, yApex, z0, z1) {
  const xm = (x0 + x1) / 2;
  const v = new Float32Array([
    x0, y0, z0, x1, y0, z0, xm, yApex, z0,
    x0, y0, z1, x1, y0, z1, xm, yApex, z1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  return g;
}
// Lotus-bud prasat tower: receding cylinder tiers plus a cone bud and a
// small finial sphere. Returns an array of geometries.
function prasat(x, z, baseY, h, r) {
  const g = [];
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers, t1 = (i + 1) / tiers;
    const r0 = r * (1 - 0.5 * t0), r1 = r * (1 - 0.5 * t1);
    const y0 = baseY + h * 0.72 * t0, y1 = baseY + h * 0.72 * t1;
    g.push(cyl(r1, r0, y1 - y0, x, (y0 + y1) / 2, z, 12));
  }
  const budY = baseY + h * 0.72;
  const bud = new THREE.ConeGeometry(r * 0.45, h * 0.22, 12);
  bud.translate(x, budY + h * 0.11, z);
  g.push(bud);
  const tip = new THREE.SphereGeometry(r * 0.12, 8, 6);
  tip.translate(x, budY + h * 0.22 + r * 0.1, z);
  g.push(tip);
  return g;
}
// Stepped stair run along +x from x0 to x1, rising y0 to y1, width z0..z1.
function stairX(x0, x1, y0, y1, z0, z1, steps = 6) {
  const g = [];
  for (let s = 0; s < steps; s++) {
    const sx0 = x0 + ((x1 - x0) * s) / steps;
    const sx1 = x0 + ((x1 - x0) * (s + 1)) / steps;
    const sy1 = y0 + ((y1 - y0) * (s + 1)) / steps;
    g.push(box(sx0, sx1, y0, sy1, z0, z1));
  }
  return g;
}
// Stepped stair run along +z from z0 to z1, rising y0 to y1, width x0..x1.
function stairZ(z0, z1, y0, y1, x0, x1, steps = 6) {
  const g = [];
  for (let s = 0; s < steps; s++) {
    const sz0 = z0 + ((z1 - z0) * s) / steps;
    const sz1 = z0 + ((z1 - z0) * (s + 1)) / steps;
    const sy1 = y0 + ((y1 - y0) * (s + 1)) / steps;
    g.push(box(x0, x1, y0, sy1, sz0, sz1));
  }
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Moat and causeways: schematic ring (real moat is 190 m wide with a
// 5 km perimeter), west causeway deck, naga balustrades, guardian lions,
// east causeway: 12 parts.
addPart('moat-north', 'Moat north', 'moat-causeway', [box(-186, 186, -2, 0, 120, 156)]);
addPart('moat-south', 'Moat south', 'moat-causeway', [box(-186, 186, -2, 0, -156, -120)]);
addPart('moat-west', 'Moat west', 'moat-causeway', [box(-186, -150, -2, 0, -120, 120)]);
addPart('moat-east', 'Moat east', 'moat-causeway', [box(150, 186, -2, 0, -120, 120)]);
addPart('west-causeway-deck', 'West causeway deck', 'moat-causeway', [box(-186, -148, 0, 1, -6, 6)]);
for (const [side, sName] of [[1, 'north'], [-1, 'south']]) {
  const rail = [box(-186, -148, 1, 2.1, side * 7.5 - 0.5, side * 7.5 + 0.5)];
  for (let p = 0; p < 6; p++) {
    rail.push(box(-184 + p * 7, -183 + p * 7, 0, 2.6, side * 7.5 - 0.4, side * 7.5 + 0.4));
  }
  addPart(`west-naga-balustrade-${sName}`, `West naga balustrade ${sName}`, 'moat-causeway', rail);
}
[[-172, 10], [-172, -10], [-158, 10], [-158, -10]].forEach(([lx, lz], i) => {
  const body = box(lx - 1, lx + 1, 1, 3, lz - 1.5, lz + 1.5);
  const head = new THREE.SphereGeometry(0.9, 10, 8);
  head.translate(lx, 3.6, lz);
  addPart(`west-guardian-lion-${i + 1}`, `West guardian lion ${i + 1}`, 'moat-causeway', [body, head]);
});
addPart('east-causeway-deck', 'East causeway deck', 'moat-causeway', [box(148, 186, 0, 1, -6, 6)]);

// --- Outer enclosure: walls (the real outer wall is 3.6 km long), corner
// pavilions, west and east gopuras: 11 parts.
addPart('outer-wall-north', 'Outer wall north', 'outer-enclosure', [box(-105, 105, 0, 4, 89, 91)]);
addPart('outer-wall-south', 'Outer wall south', 'outer-enclosure', [box(-105, 105, 0, 4, -91, -89)]);
addPart('outer-wall-east', 'Outer wall east', 'outer-enclosure', [box(104, 106, 0, 4, -90, 90)]);
addPart('outer-wall-west', 'Outer wall west', 'outer-enclosure', [box(-106, -104, 0, 4, -90, 90)]);
for (const [cx, cz, cn] of [[-105, 90, 'northwest'], [105, 90, 'northeast'], [-105, -90, 'southwest'], [105, -90, 'southeast']]) {
  addPart(`corner-pavilion-${cn}`, `Corner pavilion ${cn}`, 'outer-enclosure', [
    box(cx - 4, cx + 4, 0, 6, cz - 4, cz + 4),
    ...prasat(cx, cz, 6, 10, 3.5),
  ]);
}
addPart('west-gopura-base', 'West gopura base', 'outer-enclosure', [box(-112, -98, 0, 8, -10, 10)]);
addPart('west-gopura-tower', 'West gopura tower', 'outer-enclosure', prasat(-105, 0, 8, 18, 5));
addPart('east-gopura', 'East gopura', 'outer-enclosure', [
  box(98, 112, 0, 6, -8, 8),
  ...prasat(105, 0, 6, 12, 4),
]);

// --- First gallery: raised platform, eight wall segments, four corner
// tower bases and towers, four entrance porches: 21 parts.
addPart('first-gallery-platform', 'First gallery platform', 'first-gallery', [box(-75, 75, 0, 4, -65, 65)]);
const FGW = [
  ['n1', -75, 0, 64.25, 65.75], ['n2', 0, 75, 64.25, 65.75],
  ['s1', -75, 0, -65.75, -64.25], ['s2', 0, 75, -65.75, -64.25],
];
for (const [wn, x0, x1, z0, z1] of FGW) {
  addPart(`first-gallery-wall-${wn}`, `First gallery wall ${wn}`, 'first-gallery', [box(x0, x1, 4, 7, z0, z1)]);
}
addPart('first-gallery-wall-e1', 'First gallery wall e1', 'first-gallery', [box(74.25, 75.75, 4, 7, 0, 65)]);
addPart('first-gallery-wall-e2', 'First gallery wall e2', 'first-gallery', [box(74.25, 75.75, 4, 7, -65, 0)]);
addPart('first-gallery-wall-w1', 'First gallery wall w1', 'first-gallery', [box(-75.75, -74.25, 4, 7, 0, 65)]);
addPart('first-gallery-wall-w2', 'First gallery wall w2', 'first-gallery', [box(-75.75, -74.25, 4, 7, -65, 0)]);
for (const [cx, cz, cn] of [[-72, 62, 'northwest'], [72, 62, 'northeast'], [-72, -62, 'southwest'], [72, -62, 'southeast']]) {
  addPart(`first-gallery-corner-tower-base-${cn}`, `First gallery corner tower base ${cn}`, 'first-gallery', [
    box(cx - 3, cx + 3, 4, 8, cz - 3, cz + 3),
  ]);
  addPart(`first-gallery-corner-tower-${cn}`, `First gallery corner tower ${cn}`, 'first-gallery',
    prasat(cx, cz, 8, 12, 3));
}
for (const [px, pz, pn, horiz] of [[-75, 0, 'west', false], [75, 0, 'east', false], [0, 65, 'north', true], [0, -65, 'south', true]]) {
  const geoms = horiz
    ? [box(px - 5, px + 5, 4, 9, pz - 2, pz + 2), prism(px - 5, px + 5, 9, 11, pz - 2, pz + 2)]
    : [box(px - 2, px + 2, 4, 9, pz - 5, pz + 5)];
  if (!horiz) {
    const pr = prism(pz - 5, pz + 5, 9, 11, px - 2, px + 2);
    pr.rotateY(Math.PI / 2);
    geoms.push(pr);
  }
  addPart(`entrance-porch-${pn}`, `Entrance porch ${pn}`, 'first-gallery', geoms);
}

// --- Second gallery: platform, eight wall segments, four corner towers,
// the two libraries: 15 parts.
addPart('second-gallery-platform', 'Second gallery platform', 'second-gallery', [box(-55, 55, 4, 8, -48, 48)]);
for (const [wn, x0, x1, z0, z1] of [
  ['n1', -55, 0, 47.25, 48.75], ['n2', 0, 55, 47.25, 48.75],
  ['s1', -55, 0, -48.75, -47.25], ['s2', 0, 55, -48.75, -47.25],
]) {
  addPart(`second-gallery-wall-${wn}`, `Second gallery wall ${wn}`, 'second-gallery', [box(x0, x1, 8, 11, z0, z1)]);
}
addPart('second-gallery-wall-e1', 'Second gallery wall e1', 'second-gallery', [box(54.25, 55.75, 8, 11, 0, 48)]);
addPart('second-gallery-wall-e2', 'Second gallery wall e2', 'second-gallery', [box(54.25, 55.75, 8, 11, -48, 0)]);
addPart('second-gallery-wall-w1', 'Second gallery wall w1', 'second-gallery', [box(-55.75, -54.25, 8, 11, 0, 48)]);
addPart('second-gallery-wall-w2', 'Second gallery wall w2', 'second-gallery', [box(-55.75, -54.25, 8, 11, -48, 0)]);
for (const [cx, cz, cn] of [[-52, 45, 'northwest'], [52, 45, 'northeast'], [-52, -45, 'southwest'], [52, -45, 'southeast']]) {
  addPart(`second-gallery-corner-tower-${cn}`, `Second gallery corner tower ${cn}`, 'second-gallery',
    prasat(cx, cz, 11, 10, 2.5));
}
for (const [lz, ln] of [[32, 'north'], [-32, 'south']]) {
  addPart(`library-${ln}`, `Library ${ln}`, 'second-gallery', [
    box(-21, -9, 4, 10, lz - 4, lz + 4),
    prism(-21, -9, 10, 12.5, lz - 4, lz + 4),
  ]);
}

// --- Upper terrace: platform, three pyramid tiers, four corner shrines,
// axial walkway: 9 parts.
addPart('upper-terrace-platform', 'Upper terrace platform', 'upper-terrace', [box(-35, 35, 8, 12, -30, 30)]);
addPart('pyramid-tier-1', 'Pyramid tier 1', 'upper-terrace', [box(-28, 28, 12, 15, -24, 24)]);
addPart('pyramid-tier-2', 'Pyramid tier 2', 'upper-terrace', [box(-20, 20, 15, 18, -17, 17)]);
addPart('pyramid-tier-3', 'Pyramid tier 3', 'upper-terrace', [box(-13, 13, 18, 21, -11, 11)]);
for (const [cx, cz, cn] of [[-32, 27, 'northwest'], [32, 27, 'northeast'], [-32, -27, 'southwest'], [32, -27, 'southeast']]) {
  addPart(`upper-corner-shrine-${cn}`, `Upper corner shrine ${cn}`, 'upper-terrace',
    prasat(cx, cz, 12, 8, 2.5));
}
addPart('axial-walkway', 'Axial walkway', 'upper-terrace', [
  box(-35, 35, 12, 12.6, -2, 2),
  box(-2, 2, 12, 12.6, -30, 30),
]);

// --- Central quincunx: the 65 m central tower (base, two shaft stages,
// lotus bud) and four satellite towers with buds: 12 parts.
addPart('central-tower-base', 'Central tower base', 'central-quincunx', [box(-8, 8, 21, 24, -8, 8)]);
addPart('central-tower-lower-shaft', 'Central tower lower shaft', 'central-quincunx', [
  cyl(6, 8, 14, 0, 31, 0, 16),
]);
addPart('central-tower-upper-shaft', 'Central tower upper shaft', 'central-quincunx', [
  cyl(4.5, 6, 14, 0, 45, 0, 16),
]);
{
  const bud = new THREE.ConeGeometry(4.5, 9, 16);
  bud.translate(0, 56.5, 0);
  const orb = new THREE.SphereGeometry(1.5, 12, 8);
  orb.translate(0, 62, 0);
  const fin = cyl(0.3, 0.3, 3, 0, 63.5, 0, 8);
  addPart('central-lotus-bud', 'Central lotus bud', 'central-quincunx', [bud, orb, fin]);
}
for (const [cx, cz, cn] of [[-16, 14, 'northwest'], [16, 14, 'northeast'], [-16, -14, 'southwest'], [16, -14, 'southeast']]) {
  addPart(`satellite-tower-${cn}`, `Satellite tower ${cn}`, 'central-quincunx', [
    box(cx - 3, cx + 3, 18, 20, cz - 3, cz + 3),
    cyl(2.5, 3.5, 12, cx, 26, cz, 12),
  ]);
  const bud = new THREE.ConeGeometry(2.5, 6, 12);
  bud.translate(cx, 35, cz);
  const tip = new THREE.SphereGeometry(0.7, 8, 6);
  tip.translate(cx, 38.4, cz);
  addPart(`satellite-lotus-bud-${cn}`, `Satellite lotus bud ${cn}`, 'central-quincunx', [bud, tip]);
}

// --- Bas-reliefs: the Churning of the Ocean of Milk plus seven further
// panels on the first gallery walls: 8 parts.
addPart('churning-of-the-ocean-of-milk', 'Churning of the Ocean of Milk', 'bas-reliefs', [
  box(20, 60, 4.6, 6.8, 63.9, 64.25),
]);
const RELIEF_SPOTS = [
  ['2', -60, -20, 63.9, 64.25, true], ['3', -20, 20, 63.9, 64.25, true],
  ['4', -60, -20, -64.25, -63.9, true], ['5', -60, -20, -64.25, -63.9, false],
  ['6', 20, 60, -64.25, -63.9, true], ['7', 73.9, 74.25, 10, 50, false],
  ['8', -74.25, -73.9, -50, -10, false],
];
for (const [rn, a0, a1, b0, b1, horiz] of RELIEF_SPOTS) {
  const g = horiz ? box(a0, a1, 4.6, 6.8, b0, b1) : box(b0, b1, 4.6, 6.8, a0, a1);
  addPart(`bas-relief-panel-${rn}`, `Bas-relief panel ${rn}`, 'bas-reliefs', [g]);
}

// --- Stairways: west grand stair, stairs to the second gallery and the
// upper terrace, and the steep central tower stair: 8 parts.
addPart('west-grand-stair', 'West grand stair', 'stairways', stairX(-95, -75, 0, 4, -8, 8, 6));
addPart('stair-to-second-gallery-west', 'Stair to second gallery west', 'stairways', stairX(-65, -55, 4, 8, -6, 6, 5));
addPart('stair-to-second-gallery-east', 'Stair to second gallery east', 'stairways', stairX(55, 65, 4, 8, -6, 6, 5));
addPart('stair-to-upper-terrace-north', 'Stair to upper terrace north', 'stairways', stairZ(30, 24, 8, 12, -5, 5, 5));
addPart('stair-to-upper-terrace-south', 'Stair to upper terrace south', 'stairways', stairZ(-30, -24, 8, 12, -5, 5, 5));
addPart('stair-to-upper-terrace-east', 'Stair to upper terrace east', 'stairways', stairX(35, 28, 8, 12, -5, 5, 5));
addPart('stair-to-upper-terrace-west', 'Stair to upper terrace west', 'stairways', stairX(-35, -28, 8, 12, -5, 5, 5));
addPart('central-tower-stair', 'Central tower stair', 'stairways', stairX(-14, -8, 21, 38, -2.5, 2.5, 10));

// --- Devatas: celestial dancers adorning the walls: 8 parts.
const DEVATA_SPOTS = [
  [-40, 63.5, 0], [-10, 63.5, 0], [30, 63.5, 0], [60, 63.5, 0],
  [-40, -63.5, 1], [10, -63.5, 1], [73.5, 20, 2], [-73.5, -20, 3],
];
DEVATA_SPOTS.forEach(([dx, dz, kind], i) => {
  const body = cyl(0.5, 0.7, 2.2, dx, 5.6, dz, 8);
  const head = new THREE.SphereGeometry(0.35, 8, 6);
  head.translate(dx, 7, dz);
  addPart(`devata-${i + 1}`, `Devata ${i + 1}`, 'devatas', [body, head]);
});

// ---------------------------------------------------------------- colors
// Warm Khmer sandstone palette; water for the schematic moat.
function colorFor(id) {
  if (id.startsWith('moat-')) return '#5f7f8f';
  if (id.includes('causeway')) return '#a8906c';
  if (id.includes('naga')) return '#8a7a5e';
  if (id.includes('lion')) return '#9a8a6e';
  if (id.includes('gopura')) return '#c4ad88';
  if (id.includes('corner-pavilion')) return '#c4ad88';
  if (id.includes('corner-tower') || id.includes('corner-shrine')) return '#cbb691';
  if (id.includes('satellite')) return '#cbb691';
  if (id.startsWith('central-')) return '#d3bd97';
  if (id.startsWith('pyramid-tier')) return '#bfa67f';
  if (id.includes('platform') || id.includes('terrace')) return '#b39a7d';
  if (id.includes('wall')) return '#c8b295';
  if (id.includes('relief') || id.includes('churning')) return '#bfa77f';
  if (id.includes('stair')) return '#a8906c';
  if (id.includes('devata')) return '#8f8578';
  if (id.includes('library')) return '#c0a983';
  if (id.includes('porch') || id.includes('walkway')) return '#bfa67f';
  return '#c8b295';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'moat-causeway', name: 'Moat and causeways', color: '#5f7f8f', description: 'The schematic moat ring (the real moat is 190 m wide with a 5 km perimeter), the west causeway with naga balustrades and guardian lions, and the east causeway.' },
  { id: 'outer-enclosure', name: 'Outer enclosure', color: '#c8b295', description: 'The outer wall (3.6 km in reality), corner pavilions, and the west and east gopura entrance towers.' },
  { id: 'first-gallery', name: 'First gallery', color: '#c8b295', description: 'The lowest of the three raised rectangular galleries, with its colonnade walls, corner towers and entrance porches.' },
  { id: 'second-gallery', name: 'Second gallery', color: '#c0a983', description: 'The middle raised gallery with its walls, corner towers and the two libraries.' },
  { id: 'upper-terrace', name: 'Upper terrace and pyramid', color: '#bfa67f', description: 'The uppermost terrace with the three-tiered pyramid, corner shrines and axial walkway.' },
  { id: 'central-quincunx', name: 'Central quincunx', color: '#d3bd97', description: 'The five lotus-bud towers in quincunx: the 65 m central spire and its four satellites, the five peaks of Mount Meru.' },
  { id: 'bas-reliefs', name: 'Bas-reliefs', color: '#bfa77f', description: 'The extensive bas-relief panels lining the gallery walls, including the Churning of the Ocean of Milk.' },
  { id: 'stairways', name: 'Stairways', color: '#a8906c', description: 'The grand stairs between levels and the famously steep stair to the central tower.' },
  { id: 'devatas', name: 'Devatas', color: '#8f8578', description: 'Celestial dancer figures adorning the temple walls.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'moat north': 'The schematic north stretch of the moat. The real moat is 190 m wide, about 4 m deep and more than 5 km around; it stabilizes the temple foundations by regulating groundwater. Shown here at reduced scale.',
  'moat south': 'The schematic south stretch of the moat, shown at reduced scale; the real moat is 190 m wide.',
  'moat west': 'The schematic west stretch of the moat, crossed by the west causeway at the main entrance.',
  'moat east': 'The schematic east stretch of the moat, crossed by the east causeway.',
  'west causeway deck': 'The stone causeway crossing the moat from the west, the main entrance axis of the temple, which unlike most Khmer temples faces west. Exact width is schematic.',
  'west naga balustrade north': 'Schematic naga (serpent) balustrade lining the north side of the west causeway. Exact form and count are schematic.',
  'west naga balustrade south': 'Schematic naga balustrade lining the south side of the west causeway.',
  'east causeway deck': 'The schematic east causeway, the secondary entrance across the moat.',
  'outer wall north': 'Schematic north stretch of the outer enclosure wall; the real wall is 3.6 km long. Exact height is schematic.',
  'outer wall south': 'Schematic south stretch of the outer enclosure wall.',
  'outer wall east': 'Schematic east stretch of the outer enclosure wall.',
  'outer wall west': 'Schematic west stretch of the outer enclosure wall, pierced by the west gopura.',
  'west gopura base': 'The base of the west gopura, the monumental entrance tower on the main west axis. Exact size is schematic.',
  'west gopura tower': 'The lotus-bud tower crowning the west gopura. Exact height is schematic.',
  'east gopura': 'The east entrance tower, smaller than the west gopura. Exact size is schematic.',
  'first gallery platform': 'The raised platform of the first (lowest) of the three rectangular galleries, each raised above the next. Exact height is schematic.',
  'second gallery platform': 'The raised platform of the second gallery. Exact height is schematic.',
  'upper terrace platform': 'The uppermost terrace platform carrying the central pyramid. Exact height is schematic.',
  'pyramid tier 1': 'The lowest tier of the three-tiered central pyramid, the temple-mountain proper. Exact dimensions are schematic.',
  'pyramid tier 2': 'The middle tier of the central pyramid. Exact dimensions are schematic.',
  'pyramid tier 3': 'The top tier of the central pyramid, carrying the central tower. Exact dimensions are schematic.',
  'axial walkway': 'Schematic cross-shaped walkway on the upper terrace linking the four stairways. Exact layout is schematic.',
  'central tower base': 'The base of the central tower on the top pyramid tier. The tower rises 65 m (213 ft) above the ground.',
  'central tower lower shaft': 'The lower stage of the central lotus-bud spire. Exact profile is schematic.',
  'central tower upper shaft': 'The upper stage of the central spire, receding toward the bud. Exact profile is schematic.',
  'central lotus bud': 'The lotus-bud crown of the central tower, completing the 65 m height. The tower is entered by a steep staircase and once held a statue of Vishnu. Exact bud profile is schematic.',
  'churning of the ocean of milk': 'The famous bas-relief of the Churning of the Ocean of Milk along the east gallery wall, one of the most extensive narrative reliefs in the temple. Exact panel extent is schematic.',
  'west grand stair': 'The grand west stair rising to the first gallery platform. Exact step count is schematic.',
  'stair to second gallery west': 'Schematic stair from the first to the second gallery on the west side.',
  'stair to second gallery east': 'Schematic stair from the first to the second gallery on the east side.',
  'central tower stair': 'The famously steep stair climbing the pyramid to the central tower, entered by way of this ascent. Exact steepness is schematic.',
};
for (const cn of ['northwest', 'northeast', 'southwest', 'southeast']) {
  explanations[`corner pavilion ${cn}`] = `Schematic corner pavilion of the outer enclosure at the ${cn} corner. Exact form is schematic.`;
  explanations[`first gallery corner tower base ${cn}`] = `Base of the ${cn} corner tower of the first gallery. Exact size is schematic.`;
  explanations[`first gallery corner tower ${cn}`] = `Lotus-bud corner tower of the first gallery at the ${cn} corner. Exact height is schematic.`;
  explanations[`second gallery corner tower ${cn}`] = `Lotus-bud corner tower of the second gallery at the ${cn} corner. Exact height is schematic.`;
  explanations[`upper corner shrine ${cn}`] = `Small shrine at the ${cn} corner of the upper terrace. Exact form is schematic.`;
  explanations[`satellite tower ${cn}`] = `The ${cn} satellite tower of the central quincunx, one of the four towers surrounding the central spire; together the five symbolize the peaks of Mount Meru. Exact height is schematic (modeled shorter than the 65 m central tower).`;
  explanations[`satellite lotus bud ${cn}`] = `The lotus-bud crown of the ${cn} satellite tower. Exact profile is schematic.`;
}
for (let i = 1; i <= 4; i++) {
  explanations[`west guardian lion ${i}`] = `One of the guardian lions marking the west entrance across the causeway. Exact count and pose are schematic.`;
}
for (const wn of ['n1', 'n2', 's1', 's2', 'e1', 'e2', 'w1', 'w2']) {
  const dir = wn[0] === 'n' ? 'north' : wn[0] === 's' ? 'south' : wn[0] === 'e' ? 'east' : 'west';
  explanations[`first gallery wall ${wn}`] = `Schematic ${dir} colonnade wall segment of the first gallery, whose walls are lined with sculpture and relief carvings. Exact segmentation is schematic.`;
  explanations[`second gallery wall ${wn}`] = `Schematic ${dir} colonnade wall segment of the second gallery. Exact segmentation is schematic.`;
}
for (const pn of ['west', 'east', 'north', 'south']) {
  explanations[`entrance porch ${pn}`] = `The ${pn} entrance porch through the first gallery wall. Exact form is schematic.`;
}
for (const ln of ['north', 'south']) {
  explanations[`library ${ln}`] = `The ${ln} library, one of two free-standing buildings in the courtyard between the galleries. Exact form is schematic.`;
}
for (let r = 2; r <= 8; r++) {
  explanations[`bas-relief panel ${r}`] = `One of the extensive bas-relief panels lining the gallery walls, part of the temple's celebrated narrative sculpture program. Exact subject and extent are schematic.`;
}
for (const sn of ['north', 'south', 'east', 'west']) {
  explanations[`stair to upper terrace ${sn}`] = `Schematic ${sn} stair from the upper terrace platform to the pyramid tiers.`;
}
for (let d = 1; d <= 8; d++) {
  explanations[`devata ${d}`] = `A devata, one of the numerous celestial dancers adorning the temple walls. Exact count and placement are schematic.`;
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
const binName = 'angkor-wat-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the angkor-wat directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Angkor Wat, Siem Reap, Cambodia',
  title: 'Angkor Wat',
  location: 'Siem Reap, Cambodia',
  blurb: 'The largest religious monument in the world: Suryavarman II\u2019s early-12th-century temple-mountain to Vishnu, 162.6 hectares ringed by a moat, with three raised galleries and a quincunx of five lotus-bud towers, the central spire rising 65 m.',
  sourceUrls: [
    { label: 'Wikipedia: Angkor Wat', url: 'https://en.wikipedia.org/wiki/Angkor_Wat' },
    { label: 'Live Science: Angkor Wat history', url: 'https://www.livescience.com/23841-angkor-wat.html' },
    { label: 'Archaeology Magazine: Tomb Raider review (2001 Angkor filming)', url: 'https://archive.archaeology.org/online/reviews/tombraider/movie.html' },
    { label: 'Criterion: In the Mood for Love (final scene at Angkor Wat)', url: 'https://www.criterion.com/current/posts/197-in-the-mood-for-love' },
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
  chunks: [{ url: '/models/angkor-wat/angkor-wat-0.bin', bytes: offset }],
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
