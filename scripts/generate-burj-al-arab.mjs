// Procedural Burj Al Arab for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Burj Al Arab in code and
// writes it in the atlas binary format:
//   public/models/burj-al-arab/atlas.json
//   public/models/burj-al-arab/burj-al-arab-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/burj-al-arab-attribution.md,
// opened 2026-09-30):
//   Jumeirah Burj Al Arab, luxury hotel in Dubai, UAE, developed and managed
//   by Jumeirah; sail-shaped like a dhow, built as Dubai's symbolic icon;
//   321 m (1,053 ft) tall, top floor 197.5 m; 39% of height non-occupiable;
//   56 floors (3 below ground), 18 lifts, 202 all-duplex suites; smallest
//   suite 170 sq m, Royal Suite 780 sq m; designed by Tom Wright of the
//   British consultancy Atkins (structural engineering also Atkins),
//   interiors by Khuan Chew of KCA; contractors Murray and Roberts / Concor
//   and Al Habtoor Engineering; island work began 1994, completed 1999,
//   opened 1 December 1999, cost about US$1 billion; artificial island 280 m
//   offshore of Jumeirah Beach, private curving bridge to the mainland;
//   island about 150 m per side, rising about 7.5 m above the waves, in
//   about 7.5 m of water; 230 concrete piles about 40 m long (skin friction
//   in sand and silt, no bedrock); boulder surface layer wrapped in a
//   concrete honeycomb wave-protection pattern; two wings spread in a V to
//   form a vast mast, the space between enclosed as the atrium; steel
//   exoskeleton (outer V) wrapped around a reinforced-concrete inner tower;
//   biggest truss 85 m long weighing 165 tonnes; 5-tonne hanging weights as
//   tuned dampers, maximum sway 300 mm at the top of the accommodation;
//   sail facade of double-skinned Teflon-coated woven glass-fibre fabric,
//   about 54 m by 180 m, two layers with a 50 cm air gap, twelve
//   individually tensioned vertical panels; mast about 60 m long,
//   accommodation topping out about 190 m above the island; atrium about
//   180 m tall with a volume of about 285,000 cu m, inclined white-marble
//   columns arranged in a V; 70,000 cu m of concrete (33,000 island,
//   36,000 superstructure) and 9,000 tonnes of steel; 1,790 sq ft of
//   24-carat gold leaf; helipad at 210 m above ground on a cantilevered
//   steel truss, rated for a 7.5-tonne helicopter; Al Muntaha restaurant
//   200 m above the sea on the 27th floor, cantilevered 27 m on a 1.7 m
//   deep truss, about 1,000 sq m, with the Skyview Bar alongside; Al Mahara
//   seafood restaurant around a 990,000-litre aquarium behind 18 cm acrylic
//   glass, reached through a simulated submarine voyage; 28 double-height
//   suite floors at 7 m floor to floor; North Deck island extension of
//   328 ft into the Gulf added in 2016 with terrace, pools and restaurant.
// Schematic (not sourced, never stated as fact in the UI): exact island
// outline and breakwater profile; bridge stub length and curve; wing
// lengths, angles, taper and heights; column, truss, brace and tie
// placement; sail panel segmentation and the billow curve; mast sectioning
// and leg positions; atrium column positions; suite floor and balcony
// layout; Royal Suite position; restaurant room shapes, aquarium placement
// and submarine voyage routing; helipad truss and stilt geometry; lift,
// plant, chiller, tank and generator placements; North Deck outline; all
// interior fitting and furnishing.
//
// Granularity: 109 named parts across 10 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-burj-al-arab.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'burj-al-arab');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (321 m mast height) maps to 2.4 units.
const S = 2.4 / 321;

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
// Triangle with both windings (renders from either side) and an index, so it
// merges cleanly with indexed primitive geometries.
function tri2(a, b, c) {
  const out = [];
  for (const [p, q, r] of [[a, b, c], [a, c, b]]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...q, ...r], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    g.setIndex([0, 1, 2]);
    g.computeVertexNormals();
    out.push(g);
  }
  return out;
}
// Flat-topped prism from a 2D footprint (array of [x, z]).
function prism(pts, y0, y1) {
  const geoms = [];
  const P = (i, y) => [pts[i][0], y, pts[i][1]];
  for (let i = 1; i < pts.length - 1; i++) geoms.push(...tri2(P(0, y1), P(i, y1), P(i + 1, y1)));
  for (let i = 1; i < pts.length - 1; i++) geoms.push(...tri2(P(0, y0), P(i, y0), P(i + 1, y0)));
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    geoms.push(...tri2(P(i, y0), P(j, y0), P(j, y1)));
    geoms.push(...tri2(P(i, y0), P(j, y1), P(i, y1)));
  }
  return geoms;
}
// Wing bar: a box of width w running from (x0,z0) to (x1,z1), y0 to y1.
// Rotation is applied before translation.
function wingBar(x0, z0, x1, z1, w, y0, y1) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(len, y1 - y0, w);
  g.rotateY(Math.atan2(-dz, dx));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
// Point on a wing at fraction t (0 at root, 1 at tip).
function wingPt(x0, z0, x1, z1, t) {
  return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
}

// ---------------------------------------------------------------- layout constants (meters, sourced where noted)
const ISLAND_TOP = 7.5; // island rises about 7.5 m above the waves
const ACCOM_TOP = 190; // top of accommodation about 190 m above the island
const MAST_TOP = 321; // mast top, the 321 m architectural height
const HELI_Y = 210; // helipad 210 m above ground
const ATRIUM_TOP = 180; // atrium about 180 m tall
// Wing plan geometry (schematic): V opening toward the sea (-x).
const WRX = 30, WRZ = 12; // wing roots at the concrete spine
const WTX = -46; // wing tips toward the sea
const WTZ = 52; // wing tip spread
const WING_W = 16; // wing width

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Island and foundations: 150 m artificial island, 230 piles (sourced).
addPart('island-platform', 'Island platform', 'island', [
  ...prism([[-75, -75], [75, -75], [75, 75], [-75, 75]], -ISLAND_TOP, ISLAND_TOP),
]);
{
  const g = [];
  const B = 84;
  g.push(box(-B, B, -5, 4, -B - 8, -B));
  g.push(box(-B, B, -5, 4, B, B + 8));
  g.push(box(-B - 8, -B, -5, 4, -B, B));
  g.push(box(B, B + 8, -5, 4, -B, B));
  for (const [bx, bz] of [[-B, -B], [B, -B], [-B, B], [B, B]]) {
    const rock = new THREE.SphereGeometry(5, 7, 5);
    rock.translate(bx, 0, bz);
    g.push(rock);
  }
  addPart('island-breakwater', 'Island breakwater boulders', 'island', g);
}
{
  const g = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 16; i++) {
      const bx = -88 - row * 5;
      const bz = -60 + i * 8;
      const u = box(bx - 2, bx + 2, 0, 3, bz - 2, bz + 2);
      if (row) { u.translate(-bx, 0, -bz); u.rotateY(0.5); u.translate(bx, 0, bz); }
      g.push(u);
    }
  }
  addPart('island-armor', 'Island honeycomb armor', 'island', g);
}
{
  const g = [];
  for (let c = 0; c < 23; c++) {
    for (let r = 0; r < 10; r++) {
      const px = -55 + c * (95 / 22);
      const pz = -58 + r * (116 / 9);
      g.push(cyl(1, 1, 40, px, -20, pz, 8));
    }
  }
  addPart('island-piles', 'Island pile field', 'island', g);
}
addPart('island-plug', 'Island plug slab', 'island', [
  box(-60, 45, 0, 2, -62, 62),
]);
{
  const g = [
    box(-60, 45, 2, ISLAND_TOP, -62, -60),
    box(-60, 45, 2, ISLAND_TOP, 60, 62),
    box(-60, -58, 2, ISLAND_TOP, -60, 60),
    box(43, 45, 2, ISLAND_TOP, -60, 60),
  ];
  addPart('island-retaining-wall', 'Island retaining wall', 'island', g);
}
addPart('island-plaza', 'Island top plaza', 'island', [
  box(-75, 75, ISLAND_TOP, 8.2, -75, 75),
  box(38, 62, 8.2, 8.6, -22, 22),
]);
{
  const g = [];
  let px = 75, pz = 0, ang = 0;
  for (let i = 0; i < 6; i++) {
    const segLen = 17;
    const nx = px + Math.cos(ang) * segLen;
    const nz = pz + Math.sin(ang) * segLen;
    const seg = new THREE.BoxGeometry(segLen + 1, 1.6, 10);
    seg.rotateY(-ang);
    seg.translate((px + nx) / 2, 6.4, (pz + nz) / 2);
    g.push(seg);
    px = nx; pz = nz; ang += 0.09;
  }
  addPart('bridge-deck', 'Private bridge deck', 'island', g);
}
{
  const g = [];
  for (const bx of [100, 134, 168]) {
    for (const bz of [-4, 4]) {
      g.push(cyl(1.6, 2, 12, bx, 0, bz + (bx - 100) * 0.09 * 8, 8));
    }
  }
  addPart('bridge-piers', 'Private bridge piers', 'island', g);
}
addPart('bridge-gatehouse', 'Bridge gatehouse', 'island', [
  box(88, 96, 7.2, 11, -8, 8),
  box(88, 96, 11, 11.8, -8, 8),
]);
addPart('gulf-water', 'Gulf water', 'island', [
  box(-450, 450, -0.6, 0.2, -450, 450),
]);

// --- Sail facade: double-skinned Teflon-coated glass-fibre (sourced).
const SAIL_N = 12;
const sailX = (t) => WTX - 2 - 18 * Math.sin(Math.PI * t);
const sailTop = (t) => 175 + 30 * Math.sin(Math.PI * t);
for (let i = 0; i < SAIL_N; i++) {
  const t = (i + 0.5) / SAIL_N;
  const zc = -WTZ + 2 * WTZ * t;
  const wdt = (2 * WTZ / SAIL_N) - 0.5;
  const top = sailTop(t);
  const g = new THREE.BoxGeometry(0.6, top - ISLAND_TOP, wdt);
  const dxdt = -18 * Math.PI * Math.cos(Math.PI * t);
  const dzdt = 2 * WTZ;
  g.rotateY(Math.atan2(dxdt, dzdt));
  g.translate(sailX(t), (ISLAND_TOP + top) / 2, zc);
  addPart(`sail-panel-${String(i + 1).padStart(2, '0')}`, `Sail fabric panel ${String(i + 1).padStart(2, '0')}`, 'facade', [g]);
}
{
  const g = [];
  for (let i = 0; i < SAIL_N; i++) {
    const t = (i + 0.5) / SAIL_N;
    const zc = -WTZ + 2 * WTZ * t;
    const wdt = (2 * WTZ / SAIL_N) - 0.5;
    const top = sailTop(t);
    const p = new THREE.BoxGeometry(0.35, top - ISLAND_TOP, wdt);
    const dxdt = -18 * Math.PI * Math.cos(Math.PI * t);
    const dzdt = 2 * WTZ;
    p.rotateY(Math.atan2(dxdt, dzdt));
    p.translate(sailX(t) + 1.1, (ISLAND_TOP + top) / 2, zc);
    g.push(p);
  }
  addPart('sail-inner-skin', 'Sail inner skin', 'facade', g);
}
{
  const g = [];
  for (const by of [70, 125, 172]) {
    let prev = null;
    for (let i = 0; i <= SAIL_N; i++) {
      const t = i / SAIL_N;
      const p = [sailX(t), Math.min(by, sailTop(t) - 2), -WTZ + 2 * WTZ * t];
      if (prev) g.push(strut(prev, p, 1.1));
      prev = p;
    }
  }
  addPart('sail-beams', 'Sail horizontal beams', 'facade', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const q = [sailX(t), ISLAND_TOP + ((sailTop(t) - ISLAND_TOP) * i) / 10, s * WTZ];
      if (prev) g.push(strut(prev, q, 0.45));
      prev = q;
    }
  }
  addPart('sail-edge-cables', 'Sail edge cables', 'facade', g);
}
{
  const g = [];
  for (let i = 0; i < SAIL_N; i++) {
    const t = (i + 0.5) / SAIL_N;
    const zc = -WTZ + 2 * WTZ * t;
    const wdt = (2 * WTZ / SAIL_N) + 0.6;
    const p = new THREE.BoxGeometry(1.6, 2.2, wdt);
    const dxdt = -18 * Math.PI * Math.cos(Math.PI * t);
    const dzdt = 2 * WTZ;
    p.rotateY(Math.atan2(dxdt, dzdt));
    p.translate(sailX(t), sailTop(t) + 0.4, zc);
    g.push(p);
  }
  addPart('sail-top-fairing', 'Sail top fairing', 'facade', g);
}
{
  const g = [];
  let prev = null;
  for (let i = 0; i <= SAIL_N; i++) {
    const t = i / SAIL_N;
    const p = [sailX(t), ISLAND_TOP + 1, -WTZ + 2 * WTZ * t];
    if (prev) g.push(strut(prev, p, 1.4));
    prev = p;
  }
  addPart('sail-base-track', 'Sail base track', 'facade', g);
}
{
  const g = [];
  for (let i = 1; i < SAIL_N; i++) {
    const t = i / SAIL_N;
    const zc = -WTZ + 2 * WTZ * t;
    const top = sailTop(t);
    const s = new THREE.BoxGeometry(0.75, top - ISLAND_TOP, 0.28);
    s.translate(sailX(t), (ISLAND_TOP + top) / 2, zc);
    g.push(s);
  }
  addPart('sail-seams', 'Sail panel seams', 'facade', g);
}

// --- Mast: the V continues up as a steel mast to 321 m (sourced height).
const MAST_BASE_Y = 188;
for (const s of [-1, 1]) {
  const side = s < 0 ? 'port' : 'starboard';
  addPart(`mast-leg-${side}`, `Mast leg ${side}`, 'mast', [
    strut([-40, MAST_BASE_Y, s * 38], [-12, MAST_TOP, 0], 3.5),
  ]);
}
{
  const g = [];
  for (const by of [220, 250, 280, 305]) {
    const t = (by - MAST_BASE_Y) / (MAST_TOP - MAST_BASE_Y);
    const z = 38 * (1 - t);
    g.push(strut([-40 + 28 * t, by, -z], [-40 + 28 * t, by, z], 1.6));
    g.push(strut([-40 + 28 * t, by - 8, -z * 1.06], [-40 + 28 * t, by + 8, z * 1.06], 0.9));
  }
  addPart('mast-braces', 'Mast cross braces', 'mast', g);
}
addPart('mast-crown', 'Mast crown', 'mast', [
  box(-16, -8, MAST_TOP - 4, MAST_TOP + 2, -4, 4),
]);
addPart('mast-tip', 'Mast tip', 'mast', [
  cyl(0.8, 1.6, 8, -12, MAST_TOP + 6, 0, 8),
]);
{
  const lamp = new THREE.SphereGeometry(1.1, 10, 8);
  lamp.translate(-12, MAST_TOP + 10.6, 0);
  addPart('mast-beacon', 'Mast aviation light', 'mast', [lamp]);
}

// --- Atrium: about 180 m tall between the wings (sourced height).
addPart('atrium-floor', 'Atrium floor', 'atrium', [
  ...prism([[WRX, -WRZ], [WTX, -WTZ + 2], [WTX, WTZ - 2], [WRX, WRZ]], ISLAND_TOP, ISLAND_TOP + 1.6),
]);
{
  const cols = [
    [[12, -16], [22, 150, -6]],
    [[12, 16], [22, 150, 6]],
    [[-8, -26], [2, 150, -10]],
    [[-8, 26], [2, 150, 10]],
    [[-28, -36], [-18, 150, -14]],
    [[-28, 36], [-18, 150, 14]],
  ];
  cols.forEach(([base, top], i) => {
    addPart(`atrium-column-${String(i + 1).padStart(2, '0')}`, `Atrium marble column ${String(i + 1).padStart(2, '0')}`, 'atrium', [
      strut([base[0], ISLAND_TOP + 1.6, base[1]], top, 2.2),
    ]);
  });
}
{
  const g = [];
  for (let i = 0; i < 5; i++) {
    const wx = -20 + i * 10;
    g.push(cyl(0.5, 0.9, 40, wx, ISLAND_TOP + 21, 0, 8));
    const plume = new THREE.SphereGeometry(1.6, 8, 6);
    plume.translate(wx, ISLAND_TOP + 41.5, 0);
    g.push(plume);
  }
  addPart('atrium-spiels', 'Atrium water spiels', 'atrium', g);
}
addPart('sahn-eddare', 'Sahn Eddar lounge', 'atrium', [
  box(18, 30, ISLAND_TOP + 1.6, ISLAND_TOP + 5, -12, 12),
  box(20, 28, ISLAND_TOP + 5, ISLAND_TOP + 5.8, -10, 10),
]);
{
  const g = [];
  for (let i = 0; i < 3; i++) {
    const ex = 8 - i * 8;
    const esc = new THREE.BoxGeometry(2.4, 0.5, 26);
    esc.rotateX(0.42);
    esc.translate(ex, ISLAND_TOP + 9 + i * 0.2, 0);
    g.push(esc);
  }
  addPart('atrium-escalators', 'Atrium escalators', 'atrium', g);
}
addPart('atrium-gallery-low', 'Atrium gallery lower', 'atrium', [
  box(8, 14, 58, 60, -20, 20),
]);
addPart('atrium-gallery-high', 'Atrium gallery upper', 'atrium', [
  box(2, 8, 118, 120, -24, 24),
]);
addPart('atrium-link-low', 'Atrium link bridge low', 'atrium', [
  box(-14, 14, 88, 90.5, -3, 3),
]);
addPart('atrium-link-high', 'Atrium link bridge high', 'atrium', [
  box(-20, 8, 148, 150.5, -3, 3),
]);

// --- Suites: 202 duplex suites in the two wings and the spine (sourced).
for (const s of [-1, 1]) {
  const side = s < 0 ? 'port' : 'starboard';
  const Side = s < 0 ? 'Port' : 'Starboard';
  const z0 = s * WRZ, z1 = s * WTZ;
  const bands = [
    ['lower', ISLAND_TOP, 70],
    ['mid', 70, 130],
    ['upper', 130, ACCOM_TOP],
  ];
  for (const [bname, y0, y1] of bands) {
    addPart(`${side}-suites-${bname}`, `${Side} ${bname} suites`, 'suites', [
      wingBar(WRX, z0, WTX, z1, WING_W, y0, y1),
    ]);
  }
  const balc = [];
  const inX = -40, inZ = -s * 76; // inner normal (toward the atrium)
  const inLen = Math.hypot(inX, inZ);
  const nx = inX / inLen, nz = inZ / inLen;
  const ang = Math.atan2(-(z1 - z0), WTX - WRX);
  for (let i = 0; i < 8; i++) {
    const t = 0.12 + (i / 7) * 0.76;
    const [wx, wz] = wingPt(WRX, z0, WTX, z1, t);
    for (const by of [40, 100, 160]) {
      const b = new THREE.BoxGeometry(6, 1.4, 3.2);
      b.rotateY(ang);
      b.translate(wx + nx * (WING_W / 2 + 1.6), by, wz + nz * (WING_W / 2 + 1.6));
      balc.push(b);
    }
  }
  addPart(`${side}-balconies`, `${Side} suite balconies`, 'suites', balc);
}
addPart('royal-suite', 'Royal Suite', 'suites', [
  box(24, 38, 168, ACCOM_TOP, -14, 14),
  box(24, 38, ACCOM_TOP, ACCOM_TOP + 3, -10, 10),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    const cap = wingBar(WTX - 2, s * (WTZ - 2), WTX + 3, s * (WTZ + 1), WING_W + 1.5, ISLAND_TOP, ACCOM_TOP);
    g.push(cap);
  }
  addPart('wing-end-caps', 'Wing end caps', 'suites', g);
}
addPart('spine-suites-low', 'Spine suite band lower', 'suites', [
  box(36, 40, 20, 95, -14, 14),
]);
addPart('spine-suites-high', 'Spine suite band upper', 'suites', [
  box(36, 40, 95, 168, -14, 14),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    const [tx, tz] = wingPt(WRX, s * WRZ, WTX, s * WTZ, 0.45);
    g.push(box(tx - 8, tx + 8, ACCOM_TOP, ACCOM_TOP + 1.2, tz - 6, tz + 6));
    g.push(box(tx - 8, tx + 8, ACCOM_TOP + 1.2, ACCOM_TOP + 2.4, tz - 6, tz - 5.4));
    g.push(box(tx - 8, tx + 8, ACCOM_TOP + 1.2, ACCOM_TOP + 2.4, tz + 5.4, tz + 6));
  }
  addPart('crown-terraces', 'Crown terraces', 'suites', g);
}

// --- Restaurants and bars: Al Muntaha, Al Mahara and the rest (sourced).
addPart('al-muntaha', 'Al Muntaha restaurant', 'dining', [
  box(-66, -44, 196, 204, -9, 9),
  box(-66, -44, 204, 205.5, -9, 9),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(strut([-44, ACCOM_TOP, s * 9], [-66, 200, s * 9], 1.7));
    g.push(strut([-44, ACCOM_TOP, s * 9], [-55, 196, s * 9], 1.2));
    g.push(strut([-55, 196, s * 9], [-66, 200, s * 9], 1.2));
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      g.push(strut(
        [-44 - 22 * t, ACCOM_TOP - (ACCOM_TOP - 200) * t, s * 9],
        [-44 - 22 * t, 196 + 4 * t, s * 9],
        0.5,
      ));
    }
  }
  addPart('al-muntaha-truss', 'Al Muntaha cantilever truss', 'dining', g);
}
addPart('skyview-bar', 'Skyview Bar', 'dining', [
  box(-44, -34, 196, 203, 11, 19),
  box(-44, -34, 203, 204, 11, 19),
]);
addPart('al-mahara', 'Al Mahara restaurant', 'dining', [
  box(-22, 2, ISLAND_TOP, ISLAND_TOP + 9, -15, 15),
  box(-22, 2, ISLAND_TOP + 9, ISLAND_TOP + 10, -15, 15),
]);
addPart('al-mahara-tank', 'Al Mahara aquarium', 'dining', [
  cyl(7, 7, 8, -10, ISLAND_TOP + 4.5, 0, 16),
]);
addPart('al-mahara-acrylic', 'Al Mahara acrylic wall', 'dining', [
  box(-17.6, -17, ISLAND_TOP + 1, ISLAND_TOP + 8, -8, 8),
]);
addPart('submarine-voyage', 'Submarine voyage corridor', 'dining', [
  box(2, 26, ISLAND_TOP + 0.5, ISLAND_TOP + 4, -3.5, 3.5),
  box(24, 27, ISLAND_TOP + 0.5, ISLAND_TOP + 8, -3.5, 3.5),
]);
addPart('junsui', 'Junsui restaurant', 'dining', [
  box(40, 56, ISLAND_TOP, ISLAND_TOP + 7, -14, 14),
]);
addPart('bab-al-yam', 'Bab Al Yam', 'dining', [
  box(-30, -10, ISLAND_TOP, ISLAND_TOP + 6, 58, 72),
  box(-30, -10, ISLAND_TOP + 6, ISLAND_TOP + 6.8, 58, 72),
]);
addPart('al-iwan', 'Al Iwan', 'dining', [
  box(-22, 2, ISLAND_TOP + 10.5, ISLAND_TOP + 17, -15, 15),
]);
addPart('scape', 'Scape restaurant', 'dining', [
  box(-70, -52, ISLAND_TOP, ISLAND_TOP + 5, 20, 36),
  box(-70, -52, ISLAND_TOP + 5, ISLAND_TOP + 5.7, 20, 36),
]);
addPart('north-deck', 'North Deck terrace', 'dining', [
  box(-112, -76, ISLAND_TOP, ISLAND_TOP + 1.4, 8, 62),
]);
addPart('north-deck-pool', 'North Deck pool', 'dining', [
  box(-106, -84, ISLAND_TOP + 1.4, ISLAND_TOP + 2.6, 16, 34),
]);
addPart('sal-pavilion', 'SAL pavilion', 'dining', [
  box(-104, -88, ISLAND_TOP + 1.4, ISLAND_TOP + 6, 40, 56),
  box(-104, -88, ISLAND_TOP + 6, ISLAND_TOP + 6.8, 40, 56),
]);

// --- Structure: concrete spine inside a steel V exoskeleton (sourced).
addPart('concrete-spine', 'Concrete spine', 'structure', [
  box(24, 38, 20, 200, -14, 14),
]);
addPart('service-core', 'Service core', 'structure', [
  box(26, 34, 20, 205, -6, 6),
]);
for (const s of [-1, 1]) {
  const side = s < 0 ? 'port' : 'starboard';
  const Side = s < 0 ? 'Port' : 'Starboard';
  const g = [];
  const outX = 40, outZ = s * -76; // outer normal (away from the atrium)
  const outLen = Math.hypot(outX, outZ);
  const nx = outX / outLen, nz = outZ / outLen;
  const [rx, rz] = [WRX, s * WRZ], [tx, tz] = [WTX, s * WTZ];
  for (const e of [-1, 1]) {
    const [ax, az] = wingPt(rx, rz, tx, tz, e < 0 ? 0 : 0.04);
    const [bx, bz] = wingPt(rx, rz, tx, tz, e < 0 ? 0.96 : 1);
    g.push(strut(
      [ax + nx * (WING_W / 2 + 1), ISLAND_TOP, az + nz * (WING_W / 2 + 1)],
      [bx + nx * (WING_W / 2 + 1), ACCOM_TOP, bz + nz * (WING_W / 2 + 1)],
      2.4,
    ));
  }
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const [wx, wz] = wingPt(rx, rz, tx, tz, t);
    const by = ISLAND_TOP + (ACCOM_TOP - ISLAND_TOP) * t;
    g.push(strut(
      [wx + nx * (WING_W / 2 + 1), by, wz + nz * (WING_W / 2 + 1)],
      [wx - nx * (WING_W / 2 + 1), by, wz - nz * (WING_W / 2 + 1)],
      1.2,
    ));
  }
  addPart(`exoskeleton-${side}`, `${Side} exoskeleton frame`, 'structure', g);
}
{
  // The 85 m, 165-tonne truss: diagonal truss along the port wing outer face.
  const g = [];
  const s = -1;
  const [rx, rz] = [WRX, s * WRZ], [tx, tz] = [WTX, s * WTZ];
  const outX = 40, outZ = 76, outLen = Math.hypot(outX, outZ);
  const nx = outX / outLen, nz = outZ / outLen;
  const off = WING_W / 2 + 2.5;
  const A = (t, y) => { const [wx, wz] = wingPt(rx, rz, tx, tz, t); return [wx + nx * off, y, wz + nz * off]; };
  g.push(strut(A(0.02, ISLAND_TOP + 4), A(0.98, ACCOM_TOP - 4), 2));
  g.push(strut(A(0.02, ISLAND_TOP + 12), A(0.98, ACCOM_TOP + 4), 2));
  for (let i = 0; i < 12; i++) {
    const t0 = 0.02 + (i / 12) * 0.96, t1 = 0.02 + ((i + 1) / 12) * 0.96;
    const y0 = ISLAND_TOP + 4 + (t0 - 0.02) / 0.96 * (ACCOM_TOP - 8);
    const y1 = ISLAND_TOP + 4 + (t1 - 0.02) / 0.96 * (ACCOM_TOP - 8);
    g.push(strut(A(t0, y0), A(t1, y1 + 8), 0.8));
  }
  addPart('biggest-truss', 'Biggest truss', 'structure', g);
}
{
  const g = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.push(box(-44 + sx * 6 - 1, -44 + sx * 6 + 1, 180, 196, sz * 30 - 1, sz * 30 + 1));
  }
  g.push(box(-50, -38, 194, 196, -31, 31));
  addPart('mast-base-frame', 'Mast base frame', 'structure', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(box(26, 32, 182, 187, s * 8 - 2.5, s * 8 + 2.5));
    g.push(cyl(0.4, 0.4, 6, 29, 184.5, s * 8, 8));
  }
  addPart('mass-dampers', 'Tuned mass dampers', 'structure', g);
}
addPart('basement-raft', 'Basement raft', 'structure', [
  box(-58, 43, 2, ISLAND_TOP, -60, 60),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    const [tx, tz] = wingPt(WRX, s * WRZ, WTX, s * WTZ, 0.98);
    const ang = Math.atan2(-(s * WTZ - s * WRZ), WTX - WRX);
    const r = new THREE.BoxGeometry(20, 2, WING_W + 2);
    r.rotateY(ang);
    r.translate(tx, ACCOM_TOP + 1, tz);
    g.push(r);
  }
  addPart('accommodation-roof', 'Accommodation roof', 'structure', g);
}
{
  const g = [];
  for (const oy of [100, 150]) {
    for (const s of [-1, 1]) {
      const [wx, wz] = wingPt(WRX, s * WRZ, WTX, s * WTZ, 0.08);
      g.push(strut([24, oy, s * 10], [wx, oy, wz], 2.2));
    }
  }
  addPart('core-outriggers', 'Core outriggers', 'structure', g);
}
addPart('transfer-slab', 'Transfer slab', 'structure', [
  box(20, 42, ISLAND_TOP, ISLAND_TOP + 2.5, -16, 16),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    const ang = Math.atan2(-(s * WTZ - s * WRZ), WTX - WRX);
    for (const by of [12, 18]) {
      const b = new THREE.BoxGeometry(26, 3.5, 5);
      b.rotateY(ang);
      const [wx, wz] = wingPt(WRX, s * WRZ, WTX, s * WTZ, 0.1);
      b.translate(wx, by, wz);
      g.push(b);
    }
  }
  addPart('wing-root-beams', 'Wing root beams', 'structure', g);
}

// --- Podium and entrance.
addPart('arrival-court', 'Arrival court', 'podium', [
  box(38, 62, ISLAND_TOP, ISLAND_TOP + 1, -22, 22),
]);
{
  const g = [box(34, 48, 12, 13, -10, 10)];
  for (const [cx, cz] of [[36, -8], [46, -8], [36, 8], [46, 8]]) {
    g.push(cyl(0.5, 0.5, 12 - ISLAND_TOP, cx, (ISLAND_TOP + 12) / 2, cz, 8));
  }
  addPart('entrance-canopy', 'Entrance canopy', 'podium', g);
}
addPart('lobby-volume', 'Lobby volume', 'podium', [
  box(22, 40, ISLAND_TOP, 20, -16, 16),
]);
addPart('podium-west', 'Podium floor west', 'podium', [
  box(-24, 22, ISLAND_TOP, ISLAND_TOP + 6.5, -18, 18),
]);
addPart('podium-east', 'Podium floor east', 'podium', [
  box(40, 58, ISLAND_TOP, ISLAND_TOP + 6.5, -18, 18),
]);
addPart('parking-entry', 'Parking entry', 'podium', [
  box(46, 62, 4, ISLAND_TOP, 8, 16),
]);
{
  const g = [];
  for (let i = 0; i < 5; i++) {
    g.push(box(-78 - i * 2.4, -75.6 - i * 2.4, ISLAND_TOP - (i + 1) * 1.7, ISLAND_TOP - i * 1.7 + 0.1, -14, 14));
  }
  addPart('beach-stairs', 'Beach stairs', 'podium', g);
}

// --- Helipad: cantilevered pad at 210 m (sourced height).
addPart('helipad-deck', 'Helipad deck', 'helipad', [
  cyl(11, 11, 1.6, -62, HELI_Y, 0, 8),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    for (const e of [-1, 1]) {
      g.push(strut([-44, 196, s * (14 + e * 8)], [-62 + e * 7, HELI_Y - 0.8, s * 8], 1.4));
    }
  }
  g.push(strut([-44, 196, 0], [-62, HELI_Y - 0.8, 0], 1.8));
  addPart('helipad-truss', 'Helipad cantilever truss', 'helipad', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(cyl(0.9, 1.1, 14, -56, HELI_Y - 8, s * 9, 8));
  }
  addPart('helipad-stilts', 'Helipad support stilts', 'helipad', g);
}
{
  const g = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const a1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const mx = -62 + Math.cos((a0 + a1) / 2) * 10.4;
    const mz = Math.sin((a0 + a1) / 2) * 10.4;
    const seg = new THREE.BoxGeometry(8.2, 1.2, 0.25);
    seg.rotateY(-(a0 + a1) / 2 + Math.PI / 2);
    seg.translate(mx, HELI_Y + 1.4, mz);
    g.push(seg);
  }
  addPart('helipad-rim', 'Helipad safety rim', 'helipad', g);
}
addPart('helipad-marking', 'Helipad touchdown marking', 'helipad', [
  cyl(4, 4, 0.15, -62, HELI_Y + 0.85, 0, 24),
]);

// --- Services: lifts, plant and the bridge services spine.
for (const s of [-1, 1]) {
  const side = s < 0 ? 'port' : 'starboard';
  const Side = s < 0 ? 'Port' : 'Starboard';
  const [lx, lz] = wingPt(WRX, s * WRZ, WTX, s * WTZ, 0.06);
  addPart(`lift-core-${side}`, `${Side} lift core`, 'services', [
    box(lx - 2.5, lx + 2.5, ISLAND_TOP, ACCOM_TOP, lz - 2.5, lz + 2.5),
  ]);
}
{
  const g = [];
  let px = 75, pz = 0, ang = 0;
  for (let i = 0; i < 6; i++) {
    const segLen = 17;
    const nx = px + Math.cos(ang) * segLen;
    const nz = pz + Math.sin(ang) * segLen;
    const seg = new THREE.BoxGeometry(segLen + 1, 1, 2.4);
    seg.rotateY(-ang);
    seg.translate((px + nx) / 2, 5.2, (pz + nz) / 2);
    g.push(seg);
    px = nx; pz = nz; ang += 0.09;
  }
  addPart('bridge-services', 'Bridge service duct', 'services', g);
}
addPart('chiller-plant', 'Chiller plant', 'services', [
  box(44, 54, ISLAND_TOP, ISLAND_TOP + 5, -40, -28),
  box(44, 54, ISLAND_TOP, ISLAND_TOP + 4, -26, -16),
  cyl(1.2, 1.2, 6, 49, ISLAND_TOP + 7, -28, 8),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(cyl(3, 3, 7, 50, ISLAND_TOP + 3.5, s * 34, 12));
  }
  addPart('water-tanks', 'Water tanks', 'services', g);
}
addPart('generator-rooms', 'Generator rooms', 'services', [
  box(44, 56, ISLAND_TOP, ISLAND_TOP + 4.5, 28, 40),
  box(58, 66, ISLAND_TOP, ISLAND_TOP + 4.5, 28, 40),
]);
{
  const g = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const fx = -30 + t * 40;
    const fz = -58 - t * 6;
    const head = new THREE.BoxGeometry(1.6, 0.8, 1.6);
    head.rotateX(-0.7);
    head.translate(fx, ISLAND_TOP + 3.4, fz);
    g.push(head);
    g.push(cyl(0.25, 0.35, 3.4, fx, ISLAND_TOP + 1.7, fz, 6));
  }
  addPart('facade-floodlights', 'Facade floodlights', 'services', g);
}
{
  const g = [];
  let px = 75, pz = 0, ang = 0;
  for (let i = 0; i < 6; i++) {
    const segLen = 17;
    const nx = px + Math.cos(ang) * segLen;
    const nz = pz + Math.sin(ang) * segLen;
    const mx = (px + nx) / 2, mz = (pz + nz) / 2;
    g.push(cyl(0.18, 0.24, 7, mx, 10.7, mz + 4.6, 6));
    g.push(box(mx - 0.7, mx + 0.7, 14, 14.4, mz + 4.6 - 0.25, mz + 4.6 + 0.25));
    px = nx; pz = nz; ang += 0.09;
  }
  addPart('bridge-lamps', 'Bridge lamp columns', 'services', g);
}
addPart('service-yard', 'Service yard', 'services', [
  box(44, 68, ISLAND_TOP, ISLAND_TOP + 0.8, -58, -44),
  box(48, 58, ISLAND_TOP + 0.8, ISLAND_TOP + 3.4, -56, -50),
  box(60, 66, ISLAND_TOP + 0.8, ISLAND_TOP + 3.4, -56, -50),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette: white PTFE sail, pale steel, warm concrete,
// Gulf blue water. The Eiffel Tower is the only dark realistic model.
function colorFor(id) {
  if (id === 'gulf-water') return '#7fb3d5';
  if (id === 'north-deck-pool') return '#4aa3d8';
  if (id.startsWith('sail-panel-')) return '#f4f6f8';
  if (id === 'sail-inner-skin') return '#e8edf1';
  if (id === 'sail-seams') return '#d5dbe1';
  if (id === 'sail-top-fairing' || id === 'sail-base-track') return '#c8cfd6';
  if (id === 'sail-beams' || id === 'sail-edge-cables') return '#aeb6bf';
  if (id.startsWith('mast-leg-')) return '#cdd3d9';
  if (id === 'mast-braces' || id === 'mast-base-frame') return '#9aa3ad';
  if (id === 'mast-crown' || id === 'mast-tip') return '#dfe4e9';
  if (id === 'mast-beacon') return '#e05252';
  if (id === 'island-platform' || id === 'island-plug' || id === 'island-plaza') return '#d9cfbb';
  if (id === 'island-breakwater') return '#8f8a7e';
  if (id === 'island-armor') return '#a8a29a';
  if (id === 'island-piles' || id === 'island-retaining-wall') return '#9d978b';
  if (id === 'bridge-deck') return '#cfc9ba';
  if (id === 'bridge-piers' || id === 'bridge-services') return '#8a8478';
  if (id === 'bridge-gatehouse') return '#e3dcc9';
  if (id === 'atrium-floor') return '#e8e2d2';
  if (id.startsWith('atrium-column-')) return '#f0ece0';
  if (id === 'atrium-spiels') return '#7fb3d5';
  if (id === 'sahn-eddare') return '#d9cfae';
  if (id === 'atrium-escalators') return '#b9c0c7';
  if (id === 'atrium-gallery-low' || id === 'atrium-gallery-high') return '#dfe4e8';
  if (id === 'atrium-link-low' || id === 'atrium-link-high') return '#cdd3d9';
  if (id.endsWith('-suites-lower') || id.endsWith('-suites-mid') || id.endsWith('-suites-upper')) return '#e9e4d6';
  if (id === 'royal-suite') return '#d9b96a';
  if (id.endsWith('-balconies')) return '#cfc6ae';
  if (id === 'wing-end-caps') return '#d5cdb8';
  if (id === 'spine-suites-low' || id === 'spine-suites-high') return '#ded7c2';
  if (id === 'crown-terraces') return '#c9bfa4';
  if (id === 'al-muntaha') return '#e8ddc0';
  if (id === 'al-muntaha-truss') return '#8a94a0';
  if (id === 'skyview-bar') return '#d9cfbb';
  if (id === 'al-mahara') return '#ddd5bd';
  if (id === 'al-mahara-tank') return '#3f7fae';
  if (id === 'al-mahara-acrylic') return '#a8d8e8';
  if (id === 'submarine-voyage') return '#6b7a8a';
  if (id === 'junsui' || id === 'al-iwan') return '#e3dcc9';
  if (id === 'bab-al-yam' || id === 'scape') return '#e8e0cb';
  if (id === 'north-deck') return '#d9cfbb';
  if (id === 'sal-pavilion') return '#e3dcc9';
  if (id === 'concrete-spine' || id === 'service-core') return '#b5ada0';
  if (id.startsWith('exoskeleton-')) return '#c2c9d1';
  if (id === 'biggest-truss') return '#8a94a0';
  if (id === 'mass-dampers') return '#5b6a7a';
  if (id === 'basement-raft' || id === 'transfer-slab') return '#a8a096';
  if (id === 'accommodation-roof' || id === 'wing-root-beams' || id === 'core-outriggers') return '#9d978b';
  if (id === 'arrival-court') return '#ddd5c0';
  if (id === 'entrance-canopy') return '#f0ece0';
  if (id === 'lobby-volume') return '#cfe0e8';
  if (id === 'podium-west' || id === 'podium-east') return '#e0d8c0';
  if (id === 'parking-entry') return '#8a8478';
  if (id === 'beach-stairs') return '#cfc4a8';
  if (id === 'helipad-deck') return '#5b6670';
  if (id === 'helipad-truss' || id === 'helipad-stilts') return '#7a8590';
  if (id === 'helipad-rim') return '#d9d2bd';
  if (id === 'helipad-marking') return '#f4f6f8';
  if (id.startsWith('lift-core-')) return '#c9c2ae';
  if (id === 'chiller-plant' || id === 'generator-rooms') return '#8a94a0';
  if (id === 'water-tanks') return '#b9c0c7';
  if (id === 'facade-floodlights' || id === 'bridge-lamps') return '#4a5560';
  if (id === 'service-yard') return '#a8a096';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'island', name: 'Island and foundations', color: '#cfc4a8', description: 'The artificial island 280 m offshore, its breakwater boulders and honeycomb armor, the 230 concrete piles, and the private curving bridge to the mainland.' },
  { id: 'facade', name: 'Sail facade', color: '#f4f6f8', description: 'The double-skinned Teflon-coated woven glass-fibre sail closing the front of the building: twelve tensioned vertical panels, an inner skin, horizontal beams and edge cables.' },
  { id: 'mast', name: 'Mast', color: '#cdd3d9', description: 'The steel V of the wings continuing upward as a mast to the full 321 m height, with cross braces, crown, tip and aviation light.' },
  { id: 'atrium', name: 'Atrium', color: '#e8e2d2', description: 'The 180 m tall atrium between the wings, with inclined marble columns, water spiels, the Sahn Eddar lounge, escalators, galleries and link bridges.' },
  { id: 'suites', name: 'Suites', color: '#e9e4d6', description: 'The 202 all-duplex suites stacked in the two wings and the spine, with balconies, the 780 sq m Royal Suite and crown terraces.' },
  { id: 'dining', name: 'Restaurants and bars', color: '#e3dcc9', description: 'Al Muntaha cantilevered 200 m above the sea, the Skyview Bar, the Al Mahara aquarium restaurant with its submarine voyage, and the other venues including the 2016 North Deck.' },
  { id: 'structure', name: 'Structure', color: '#b5ada0', description: 'The reinforced-concrete inner tower and spine wrapped in the steel exoskeleton V, the 85 m biggest truss, outriggers, mass dampers and foundations.' },
  { id: 'podium', name: 'Podium and entrance', color: '#e0d8c0', description: 'Arrival court, entrance canopy, lobby volume and podium floors at the island level, with parking entry and beach stairs.' },
  { id: 'helipad', name: 'Helipad', color: '#5b6670', description: 'The cantilevered helipad at 210 m above ground, carried on a steel truss with support stilts, safety rim and touchdown marking.' },
  { id: 'services', name: 'Services', color: '#8a94a0', description: 'Lift cores, the services spine inside the bridge belly, chiller plant, water tanks, generators, floodlights and the service yard.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'island platform': 'The artificial island the hotel stands on, about 150 m per side and rising about 7.5 m above the waves in about 7.5 m of water. Building it offshore kept the sail from shadowing Jumeirah Beach. Exact outline is schematic.',
  'island breakwater boulders': 'Rock bunds around the island absorbing wave energy before it reaches the reclaimed fill. The island was built up between permanent rock bunds with hydraulic fill displacing the seawater. Exact profile is schematic.',
  'island honeycomb armor': 'Concrete armor units in a honeycomb pattern wrapping the boulder layer to protect the island from erosion; nobody in the Gulf had used such blocks before. Exact unit shapes are schematic.',
  'island pile field': '230 concrete piles driven about 40 m into the sand and silt beneath the island. The foundation never reaches bedrock, so the building stands on skin friction along the piles. Pile grid is schematic.',
  'island plug slab': 'A thick concrete plug slab sealing the base of the excavated island interior before the basement floors were built. Exact thickness is schematic.',
  'island retaining wall': 'Reinforced-concrete retaining wall around the excavated basement inside the island. Exact layout is schematic.',
  'island top plaza': 'The island surface around the building: arrival roadways, landscaping and service aprons. Exact layout is schematic.',
  'private bridge deck': 'The private curving bridge connecting the island to the mainland, the hotel\u2019s only link to land. Building services run through the bridge\u2019s undercarriage and its floodlights light the sail. Length and curve are schematic.',
  'private bridge piers': 'Piers carrying the private bridge over the shallow Gulf water. Exact pier positions are schematic.',
  'bridge gatehouse': 'Security gatehouse where the private bridge meets the island, controlling the only vehicle access to the hotel. Exact position is schematic.',
  'gulf water': 'The Arabian Gulf around the island, about 280 m from Jumeirah Beach at the island\u2019s nearest point. Water level and extent are schematic.',
  'sail inner skin': 'The second, inner layer of the sail: the facade is double-skinned, with a 50 cm air gap between the two Teflon-coated glass-fibre layers for insulation and translucency. Exact offset is schematic.',
  'sail horizontal beams': 'The massive horizontal beams the twelve fabric panels are tensioned between, spanning the front of the building. Exact beam positions are schematic.',
  'sail edge cables': 'Tension cables along the vertical edges of the sail where the fabric meets the wing tips. Exact cable routing is schematic.',
  'sail top fairing': 'The capping along the top edge of the sail where the fabric sweeps up toward the mast. Exact profile is schematic.',
  'sail base track': 'The base track anchoring the bottom edge of the fabric wall at island level. Exact detail is schematic.',
  'sail panel seams': 'The vertical seams between the twelve individually tensioned fabric panels. Exact seam detail is schematic.',
  'mast leg port': 'The port leg of the V-shaped steel mast, continuing the line of the port wing upward past the accommodation to the full 321 m height. Exact leg section is schematic.',
  'mast leg starboard': 'The starboard leg of the V-shaped steel mast, continuing the line of the starboard wing upward past the accommodation to the full 321 m height. Exact leg section is schematic.',
  'mast cross braces': 'Cross bracing tying the two mast legs together against wind loads at the top of the building. Exact bracing pattern is schematic.',
  'mast crown': 'The crown where the mast legs meet at the top of the V, closing the sail silhouette. Exact shape is schematic.',
  'mast tip': 'The slender tip finishing the mast at 321 m, the architectural top of the building. Exact profile is schematic.',
  'mast aviation light': 'Aviation warning light on the mast tip, required on a 321 m structure in the flight paths serving Dubai. Exact fitting is schematic.',
  'atrium floor': 'The floor of the atrium at island level, the public base of the 180 m tall void between the wings. Exact outline is schematic.',
  'atrium water spiels': 'Water jets in the atrium shooting up to 40 m into the air each hour, the animated centrepiece of the Sahn Eddar lounge. Exact jet layout is schematic.',
  'sahn eddar lounge': 'Sahn Eddar, the lounge at the base of the atrium where guests take coffee and afternoon tea beneath the water spiels. Exact furnishing is schematic.',
  'atrium escalators': 'Escalators rising through the lower atrium, part of the guest circulation between lobby, lounges and restaurants. Exact routing is schematic.',
  'atrium gallery lower': 'A gallery deck overlooking the atrium from the lower suite floors. Exact position is schematic.',
  'atrium gallery upper': 'A gallery deck overlooking the atrium from the upper suite floors. Exact position is schematic.',
  'atrium link bridge low': 'A link bridge crossing the atrium low down, connecting the two wings. Exact position is schematic.',
  'atrium link bridge high': 'A link bridge crossing the atrium high up, connecting the two wings. Exact position is schematic.',
  'port lower suites': 'The lower band of duplex suites in the port wing. The hotel holds 202 duplex suites, arranged as 28 double-height floors at 7 m floor to floor. Exact floor layout is schematic.',
  'port mid suites': 'The middle band of duplex suites in the port wing, each suite spanning two floors. Exact floor layout is schematic.',
  'port upper suites': 'The upper band of duplex suites in the port wing, below the crown terraces. Exact floor layout is schematic.',
  'starboard lower suites': 'The lower band of duplex suites in the starboard wing. Exact floor layout is schematic.',
  'starboard mid suites': 'The middle band of duplex suites in the starboard wing. Exact floor layout is schematic.',
  'starboard upper suites': 'The upper band of duplex suites in the starboard wing, below the crown terraces. Exact floor layout is schematic.',
  'royal suite': 'The Royal Suite, the hotel\u2019s largest at 780 sq m, with gold and marble finishes, a private elevator and panoramic views of the Gulf. Exact position is schematic.',
  'port suite balconies': 'Balconies on the atrium side of the port wing, giving suites outlooks over the atrium void. Exact balcony rhythm is schematic.',
  'starboard suite balconies': 'Balconies on the atrium side of the starboard wing, giving suites outlooks over the atrium void. Exact balcony rhythm is schematic.',
  'wing end caps': 'The seaward end caps of the two wings where the suite floors meet the sail. Exact capping is schematic.',
  'spine suite band lower': 'Suites in the lower part of the concrete spine facing the mainland. Exact floor layout is schematic.',
  'spine suite band upper': 'Suites in the upper part of the concrete spine facing the mainland, below the Royal Suite. Exact floor layout is schematic.',
  'crown terraces': 'Private terraces crowning the suite wings at the top of the accommodation. Exact layout is schematic.',
  'al muntaha restaurant': 'Al Muntaha, the restaurant cantilevered 200 m above the sea on the 27th floor, serving contemporary European cuisine with views over the Gulf. Room shape is schematic.',
  'al muntaha cantilever truss': 'The truss cantilevering Al Muntaha 27 m out from the structure, 1.7 m deep. Exact truss geometry is schematic.',
  'skyview bar': 'The Skyview Bar alongside Al Muntaha, for cocktails and afternoon tea 200 m above the Gulf. Room shape is schematic.',
  'al mahara restaurant': 'Al Mahara, the seafood restaurant built around a giant seawater aquarium, reached through a simulated submarine voyage. Room shape is schematic.',
  'al mahara aquarium': 'The Al Mahara aquarium holding about 990,000 litres of seawater, the centrepiece the restaurant tables circle. Exact tank shape is schematic.',
  'al mahara acrylic wall': 'The 18 cm thick acrylic glass wall holding back the aquarium\u2019s water pressure. Exact panel layout is schematic.',
  'submarine voyage corridor': 'The simulated submarine voyage carrying guests from the lobby down to the Al Mahara restaurant. Exact routing is schematic.',
  'junsui restaurant': 'Junsui, the hotel\u2019s Asian buffet restaurant. Exact position is schematic.',
  'bab al yam': 'Bab Al Yam, the beachside restaurant serving Mediterranean dishes and breakfast. Exact position is schematic.',
  'al iwan': 'Al Iwan, serving Middle Eastern and international cuisine in the podium. Exact position is schematic.',
  'scape restaurant': 'Scape, the beachside restaurant and lounge with an open-air terrace. Exact position is schematic.',
  'north deck terrace': 'The North Deck terrace, added in 2016 when the island was extended 328 ft into the Gulf for more outdoor space. Exact outline is schematic.',
  'north deck pool': 'One of the North Deck pools on the 2016 island extension. Exact shape is schematic.',
  'sal pavilion': 'The SAL restaurant pavilion on the North Deck. Exact shape is schematic.',
  'concrete spine': 'The reinforced-concrete inner tower forming the back of the V, carrying the suite floors and the service core. Exact section is schematic.',
  'service core': 'The service core at the point of the V, transmitting gravity loads from the wings down to the foundations. Exact layout is schematic.',
  'port exoskeleton frame': 'The port half of the steel exoskeleton V wrapped around the concrete tower, the structural expressionism of the design. Exact member sizes are schematic.',
  'starboard exoskeleton frame': 'The starboard half of the steel exoskeleton V wrapped around the concrete tower. Exact member sizes are schematic.',
  'biggest truss': 'The biggest truss in the building, 85 m long and weighing 165 tonnes. Exact position is schematic.',
  'mast base frame': 'The frame at the top of the accommodation where the mast legs land on the structure. Exact arrangement is schematic.',
  'tuned mass dampers': 'Hanging 5-tonne weights that swing to damp wind-induced vibration, keeping the sway at the top of the accommodation within 300 mm. Exact positions are schematic.',
  'basement raft': 'The basement raft spreading the tower loads onto the pile field inside the island. Exact extent is schematic.',
  'accommodation roof': 'The roof over the top suite floors at about 190 m above the island. Exact build-up is schematic.',
  'core outriggers': 'Outrigger beams tying the concrete spine to the wings, stiffening the V against wind. Exact positions are schematic.',
  'transfer slab': 'The transfer slab at island level distributing the tower columns onto the basement structure. Exact depth is schematic.',
  'wing root beams': 'Deep beams connecting the wing roots into the concrete spine. Exact sections are schematic.',
  'arrival court': 'The arrival court where cars reach the hotel off the private bridge. Exact layout is schematic.',
  'entrance canopy': 'The canopy over the main entrance. Exact shape is schematic.',
  'lobby volume': 'The double-height lobby volume at the base of the atrium. Exact glazing is schematic.',
  'podium floor west': 'Podium floors on the seaward side housing restaurants and back of house. Exact layout is schematic.',
  'podium floor east': 'Podium floors on the landward side housing restaurants and services. Exact layout is schematic.',
  'parking entry': 'The entry ramp to basement parking inside the island. Exact routing is schematic.',
  'beach stairs': 'Stairs from the island down to the water on the seaward side. Exact layout is schematic.',
  'helipad deck': 'The helipad deck at 210 m above ground, an octagonal platform famous for sporting stunts. Exact deck detail is schematic.',
  'helipad cantilever truss': 'The massive steel truss cantilevering the helipad out from the structure. Exact truss geometry is schematic.',
  'helipad support stilts': 'Support stilts bracing the helipad deck from below. Exact positions are schematic.',
  'helipad safety rim': 'The safety rim around the helipad deck edge. Exact detail is schematic.',
  'helipad touchdown marking': 'The touchdown marking on the helipad deck. Exact marking is schematic.',
  'port lift core': 'The port lift core, one of 18 lifts serving the 56 floors. Exact shaft layout is schematic.',
  'starboard lift core': 'The starboard lift core, one of 18 lifts serving the 56 floors. Exact shaft layout is schematic.',
  'bridge service duct': 'The services spine running through the belly of the private bridge: power, water, cooling and communications for the island. Exact routing is schematic.',
  'chiller plant': 'The chiller plant cooling the building against the Dubai heat; the atrium alone had to be cooled at less than one degree per day during construction. Exact plant layout is schematic.',
  'water tanks': 'Water storage tanks on the island. Exact capacity is schematic.',
  'generator rooms': 'Emergency generator rooms on the island. Exact layout is schematic.',
  'facade floodlights': 'Floodlights on the island aimed at the sail, turning the fabric into an illuminated screen at night. Exact positions are schematic.',
  'bridge lamp columns': 'Lamp columns along the private bridge. Exact positions are schematic.',
  'service yard': 'The service yard on the island for deliveries and plant, reached only via the private bridge. Exact layout is schematic.',
};
for (let i = 1; i <= 12; i++) {
  const n = String(i).padStart(2, '0');
  explanations[`sail fabric panel ${n}`] = `One of the twelve individually tensioned vertical panels of the double-skinned Teflon-coated woven glass-fibre sail, translucent by day and lit as a projection screen at night. Exact panel dimensions are schematic.`;
}
for (let i = 1; i <= 6; i++) {
  const n = String(i).padStart(2, '0');
  explanations[`atrium marble column ${n}`] = `One of the inclined white-marble-clad columns inside the atrium, arranged in a V echoing the sail. Exact column position is schematic.`;
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
const binName = 'burj-al-arab-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the burj-al-arab directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Burj Al Arab, Dubai (detailed schematic)',
  title: 'Burj Al Arab',
  location: 'Dubai, United Arab Emirates',
  blurb: 'Dubai\u2019s sail-shaped luxury hotel on an artificial island 280 m offshore: 321 m tall, 202 duplex suites around a 180 m atrium, closed by a Teflon-coated fiberglass sail and crowned by a V-shaped steel mast.',
  sourceUrls: [
    { label: 'Wikipedia: Burj Al Arab', url: 'https://en.wikipedia.org/wiki/Burj_Al_Arab' },
    { label: 'MEED: Burj al-Arab', url: 'https://www.meed.com/burj-al-arab/' },
    { label: 'Building: Fantasy island', url: 'https://www.building.co.uk/fantasy-island/1374.article' },
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
  chunks: [{ url: '/models/burj-al-arab/burj-al-arab-0.bin', bytes: offset }],
  triangles,
  // Tall, narrow massing like the other towers: 1.4 keeps the exploded
  // cloud inside the frame (same value as Tower Bridge detailed).
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
