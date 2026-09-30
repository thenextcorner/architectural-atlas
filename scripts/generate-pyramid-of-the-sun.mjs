// Procedural Pyramid of the Sun (Teotihuacan) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Pyramid of the Sun in code and
// writes it in the atlas binary format:
//   public/models/pyramid-of-the-sun/atlas.json
//   public/models/pyramid-of-the-sun/pyramid-of-the-sun-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/pyramid-of-the-sun-attribution.md,
// opened 2026-09-30):
//   largest building in Teotihuacan, about 40 km northeast of Mexico City;
//   one of the largest structures in the pre-Columbian New World; third
//   largest ancient pyramid in the New World (after Cholula and La Danta);
//   Teotihuacan protected by UNESCO (World Heritage Committee); the name
//   comes from the Aztecs who found the city abandoned, the Teotihuacan
//   name is unknown; built about 200 AD in two phases, the second bringing
//   it to 225 m across and 75 m high with an altar on top that has not
//   survived; current height about 65 m (65.5 m infobox); base about
//   225 m per side (230 m infobox side, 223.48 m older survey, 219.4 x
//   231.6 m in the Teotihuacan article); volume 1,184,828.3 m3; slope
//   angle 32.494 degrees (assuming a perfect square base and smooth
//   faces); just over half the height of the Great Pyramid of Giza
//   (146 m); as reconstructed, five stepped tiers in talud-tablero
//   style; interior of cut tepetate blocks and adobe; surface faced with
//   volcanic tezontle slabs, then mortar and stucco; lime plaster from
//   surrounding areas painted with murals (jaguar heads and paws, stars,
//   snake rattles); a broad central staircase climbs the west face facing
//   the Avenue of the Dead; the summit temple was destroyed before
//   archaeological study, so no deity can be assigned; a four-level
//   adosada platform was later built over the original west facade,
//   decorated with sculpted feline heads and chalchihuites moldings,
//   stuccoed and painted; beneath the pyramid a cave six metres down
//   under the centre, reached by a man-made tunnel found in 1971 by
//   Ernesto Taboada in a seven-metre-deep pit at the foot of the main
//   staircase, ending in a cloverleaf chamber looted in antiquity, once
//   thought to be the natural lava tube of the mythical Chicomoztoc;
//   Rene Millon studied the tunnels in 1959, found sealed tunnels with
//   pottery and hearths, and concluded the builders were motivated
//   workers, not slaves; offerings include a green serpentine mask; child
//   burials at the pyramid corners were dedicatory sacrifices; the
//   Teotihuacan Ocelot found near the foot is in the British Museum;
//   built by hand with baskets of crushed bedrock and soil; aligned to
//   Cerro Gordo and to sunrises/sunsets on specific dates (sunset August
//   12 and April 29); the central city grid and the Avenue of the Dead
//   reproduce the pyramid's orientation, offset 15.5 degrees east of true
//   north; the Avenue of the Dead runs north-south for more than 2 miles
//   (3.2 km), 45 m wide, the pyramid on its east side between the Pyramid
//   of the Moon and the Ciudadela; abandoned about 750 AD.
// Schematic (not sourced, never stated as fact in the UI): tier heights
// (13 m each) and insets; the five tiers follow the visible reconstructed
// form, though the fourth platform's reconstruction by Batres is debated;
// talud and tablero proportions; staircase width, step count and slope;
// alfarda walls; summit platform and temple-remnant sizes and placement;
// the adosada's exact footprint and level heights; the Avenue of the Dead
// frontage segment and plaza platforms in outline at schematic positions;
// the tunnel route, chamber shape and offering placement; all facing
// stone, mortar and stucco detail.
//
// Granularity: 118 named parts across 11 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Model frame: x east, z south, y up, metres. The west face (staircase)
// faces the Avenue of the Dead. Atlas units: 500 m site frame maps to
// 7.2 units (3x the usual fit: keeps the exploded cloud, which lifts a
// fixed +1 world unit, inside the frame).
//
// Usage: node scripts/generate-pyramid-of-the-sun.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'pyramid-of-the-sun');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: 500 m site frame maps to 7.2 units.
const S = 7.2 / 500;

// Pyramid parameters (sourced: ~225 m base, ~65 m current height,
// five stepped tiers as reconstructed).
const W0 = 112.5;      // base half-width (m)
const H = 65;          // current height (m)
const TIERS = 5;
const TH = H / TIERS;  // 13 m per tier
const INSET = 17;      // half-width inset per tier
const TALUD_RUN = 10;  // talud slope run per tier (13 m rise, 10 m run)
const wb = (k) => W0 - INSET * k;        // tier k base half-width
const wt = (k) => wb(k) - TALUD_RUN;     // tier k talud top half-width
const y0 = (k) => TH * k;
const y1 = (k) => TH * (k + 1);
const ORD = ['one', 'two', 'three', 'four', 'five'];
const STAIR_HALF = 10; // half-width of the grand staircase

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
function box(x0, x1, y0v, y1v, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1v - y0v, z1 - z0);
  g.translate((x0 + x1) / 2, (y0v + y1v) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Quad slab from four corners with an outward normal; winding is flipped
// to match the normal. Rotate-before-translate is inherent (corners are
// computed in world metres directly).
function quadSlab(p0, p1, p2, p3, n, t) {
  const nn = new THREE.Vector3(...n).normalize();
  const off = nn.clone().multiplyScalar(t / 2);
  const P = [p0, p1, p2, p3].map((p) => new THREE.Vector3(...p));
  const f = P.map((p) => p.clone().add(off));
  const b = P.map((p) => p.clone().sub(off));
  const pos = new Float32Array([...f, ...b].flatMap((v) => [v.x, v.y, v.z]));
  let idx = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
  ];
  const e1 = new THREE.Vector3().subVectors(f[1], f[0]);
  const e2 = new THREE.Vector3().subVectors(f[2], f[0]);
  if (new THREE.Vector3().crossVectors(e1, e2).dot(nn) < 0) {
    const flipped = [];
    for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);
    idx = flipped;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
// One sloped talud face of a tier. face: W/E/N/S; (la, lb) is the lateral
// extent along the face (z for W/E, x for N/S) so the west face can be
// split around the staircase.
function taludFace(face, k, la, lb, t = 2.5) {
  const w0 = wb(k), w1 = wt(k), a0 = y0(k), a1 = y1(k);
  let p0, p1, p2, p3, n;
  if (face === 'W') {
    p0 = [-w0, a0, la]; p1 = [-w0, a0, lb]; p2 = [-w1, a1, lb]; p3 = [-w1, a1, la];
    n = [-0.79, 0.61, 0];
  } else if (face === 'E') {
    p0 = [w0, a0, lb]; p1 = [w0, a0, la]; p2 = [w1, a1, la]; p3 = [w1, a1, lb];
    n = [0.79, 0.61, 0];
  } else if (face === 'N') {
    p0 = [lb, a0, -w0]; p1 = [la, a0, -w0]; p2 = [la, a1, -w1]; p3 = [lb, a1, -w1];
    n = [0, 0.61, -0.79];
  } else {
    p0 = [la, a0, w0]; p1 = [lb, a0, w0]; p2 = [lb, a1, w1]; p3 = [la, a1, w1];
    n = [0, 0.61, 0.79];
  }
  return quadSlab(p0, p1, p2, p3, n, t);
}
// Vertical tablero panel on a tier face, protruding from the talud.
function tableroPanel(face, k, center, span) {
  const wm = wb(k) - TALUD_RUN / 2; // talud mid-plane half-width
  const surf = wm + 1.25;           // talud outer surface
  const t = 1.2, a0 = y0(k) + 3, a1 = y1(k) - 2;
  const c0 = center - span / 2, c1 = center + span / 2;
  if (face === 'W') return box(-(surf + t), -surf + 0.3, a0, a1, c0, c1);
  if (face === 'E') return box(surf - 0.3, surf + t, a0, a1, c0, c1);
  if (face === 'N') return box(c0, c1, a0, a1, -(surf + t), -surf + 0.3);
  return box(c0, c1, a0, a1, surf - 0.3, surf + t);
}
// Horizontal cornice molding crowning a tier face.
function corniceBand(face, k, la, lb) {
  const w = wt(k) + 1.25; // talud top outer surface
  const a0 = y1(k) - 2.2, a1 = y1(k) - 1;
  const p = 1.6; // protrusion
  if (face === 'W') return box(-(w + p), -w + 0.2, a0, a1, la, lb);
  if (face === 'E') return box(w - 0.2, w + p, a0, a1, la, lb);
  if (face === 'N') return box(la, lb, a0, a1, -(w + p), -w + 0.2);
  return box(la, lb, a0, a1, w - 0.2, w + p);
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Tier bodies: talud (sloping) faces, 5 tiers x (3 full + 2 west
// halves around the staircase): 25 parts.
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k], w = wb(k);
  addPart(`tier-${o}-talud-north`, `Tier ${o} north talud`, 'talud', [taludFace('N', k, -w, w)]);
  addPart(`tier-${o}-talud-south`, `Tier ${o} south talud`, 'talud', [taludFace('S', k, -w, w)]);
  addPart(`tier-${o}-talud-east`, `Tier ${o} east talud`, 'talud', [taludFace('E', k, -w, w)]);
  addPart(`tier-${o}-talud-west-north`, `Tier ${o} west talud north`, 'talud',
    [taludFace('W', k, STAIR_HALF, w)]);
  addPart(`tier-${o}-talud-west-south`, `Tier ${o} west talud south`, 'talud',
    [taludFace('W', k, -w, -STAIR_HALF)]);
}

// --- Tablero panels: vertical framed panels on each tier face; the west
// face carries two, flanking the staircase: 25 parts.
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k], w = wb(k);
  const spanFull = 0.55 * 2 * (w - TALUD_RUN / 2);
  addPart(`tier-${o}-tablero-north`, `Tier ${o} north tablero`, 'tablero',
    [tableroPanel('N', k, 0, spanFull)]);
  addPart(`tier-${o}-tablero-south`, `Tier ${o} south tablero`, 'tablero',
    [tableroPanel('S', k, 0, spanFull)]);
  addPart(`tier-${o}-tablero-east`, `Tier ${o} east tablero`, 'tablero',
    [tableroPanel('E', k, 0, spanFull)]);
  const flank = w - STAIR_HALF;
  const spanW = 0.55 * flank;
  const cN = STAIR_HALF + flank / 2, cS = -(STAIR_HALF + flank / 2);
  addPart(`tier-${o}-tablero-west-north`, `Tier ${o} west tablero north`, 'tablero',
    [tableroPanel('W', k, cN, spanW)]);
  addPart(`tier-${o}-tablero-west-south`, `Tier ${o} west tablero south`, 'tablero',
    [tableroPanel('W', k, cS, spanW)]);
}

// --- Cornices: horizontal moldings crowning each tier face: 25 parts.
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k], w = wb(k);
  addPart(`tier-${o}-cornice-north`, `Tier ${o} north cornice`, 'cornice',
    [corniceBand('N', k, -w, w)]);
  addPart(`tier-${o}-cornice-south`, `Tier ${o} south cornice`, 'cornice',
    [corniceBand('S', k, -w, w)]);
  addPart(`tier-${o}-cornice-east`, `Tier ${o} east cornice`, 'cornice',
    [corniceBand('E', k, -w, w)]);
  addPart(`tier-${o}-cornice-west-north`, `Tier ${o} west cornice north`, 'cornice',
    [corniceBand('W', k, STAIR_HALF, w)]);
  addPart(`tier-${o}-cornice-west-south`, `Tier ${o} west cornice south`, 'cornice',
    [corniceBand('W', k, -w, -STAIR_HALF)]);
}

// --- Tier treads: flat walkways between the tiers: 5 parts.
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k];
  const hw = k < TIERS - 1 ? wb(k + 1) + 7 : wt(k) + 1.5;
  addPart(`tier-${o}-tread`, `Tier ${o} tread`, 'treads',
    [box(-hw, hw, y1(k) - 0.6, y1(k), -hw, hw)]);
}

// --- Grand staircase: one flight per tier up the west face (sourced
// west-facing staircase; width, step count and slope schematic), plus
// flanking alfarda balustrade walls: 15 parts.
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k];
  const xTop = -wb(k + 1), xBot = -(wb(k) + 2);
  const a0 = y0(k), a1 = y1(k);
  const steps = 12, rise = (a1 - a0) / steps, run = (xTop - xBot) / steps;
  const geoms = [];
  for (let i = 0; i < steps; i++) {
    geoms.push(box(xBot + i * run, xTop + 0.5, a0, a0 + (i + 1) * rise, -STAIR_HALF, STAIR_HALF));
  }
  addPart(`stair-flight-${o}`, `Grand staircase flight ${o}`, 'staircase', geoms);
  for (const side of ['north', 'south']) {
    const z = side === 'north' ? STAIR_HALF + 1.2 : -(STAIR_HALF + 1.2);
    addPart(`stair-alfarda-${o}-${side}`, `Stair alfarda ${o} ${side}`, 'staircase', [
      strut([xBot + 1, a0 + 0.8, z], [xTop - 0.5, a1 + 0.8, z], 2.2, 2.2),
    ]);
  }
}

// --- Summit: platform slab, the base of the vanished temple, low wall
// stubs and a central altar (all schematic; the temple was destroyed
// before archaeological study): 7 parts.
{
  const plat = 29.5;
  addPart('summit-platform', 'Summit platform', 'summit',
    [box(-plat, plat, H, H + 0.8, -plat, plat)]);
  addPart('temple-platform', 'Summit temple platform', 'summit',
    [box(-12, 12, H + 0.8, H + 3.8, -12, 12)]);
  addPart('temple-wall-north', 'Summit temple wall north', 'summit',
    [box(-10, 10, H + 0.8, H + 3.8, -8, -6.5)]);
  addPart('temple-wall-south', 'Summit temple wall south', 'summit',
    [box(-10, 10, H + 0.8, H + 3.8, 6.5, 8)]);
  addPart('temple-wall-east', 'Summit temple wall east', 'summit',
    [box(8.5, 10, H + 0.8, H + 3.8, -6.5, 6.5)]);
  addPart('temple-wall-west', 'Summit temple wall west', 'summit',
    [box(-10, -8.5, H + 0.8, H + 3.8, -6.5, 6.5)]);
  addPart('summit-altar', 'Summit altar', 'summit',
    [box(-2, 2, H + 0.8, H + 2.8, -2, 2)]);
}

// --- Adosada platform: four stepped levels added later over the original
// west facade (sourced four-level adosada with feline-head sculpture and
// chalchihuites moldings; footprint and level heights schematic), plus two
// schematic feline heads: 6 parts.
for (let j = 0; j < 4; j++) {
  const o = ORD[j];
  const x0 = -160 + j * 6, x1 = -118, hz = 62 - 6 * j;
  addPart(`adosada-level-${o}`, `Adosada platform level ${o}`, 'adosada',
    [box(x0, x1, 0, 4 * (j + 1), -hz, hz)]);
}
for (const side of ['north', 'south']) {
  const z = side === 'north' ? 20 : -20;
  const head = box(-161.5, -159, 4, 7, z - 1.25, z + 1.25);
  const snout = box(-159, -157.5, 4.5, 6, z - 0.7, z + 0.7);
  addPart(`adosada-feline-${side}`, `Adosada feline head ${side}`, 'adosada', [head, snout]);
}

// --- Avenue of the Dead frontage: the 45 m wide north-south avenue runs
// along the west side; road slab, edge lines and the forecourt plaza in
// outline (avenue segment schematic): 4 parts.
addPart('avenue-road', 'Avenue of the Dead roadway', 'avenue',
  [box(-260, -215, 0, 0.5, -250, 250)]);
addPart('avenue-edge-west', 'Avenue of the Dead west edge', 'avenue',
  [box(-262, -260, 0, 1.2, -250, 250)]);
addPart('avenue-edge-east', 'Avenue of the Dead east edge', 'avenue',
  [box(-215, -213, 0, 1.2, -250, 250)]);
addPart('forecourt-plaza', 'Forecourt plaza', 'avenue',
  [box(-215, -162, 0, 0.4, -90, 90)]);

// --- Surrounding plaza: low platforms ringing the pyramid in outline
// (schematic positions): 5 parts.
addPart('plaza-platform-north', 'Plaza platform north', 'plaza',
  [box(-130, 130, 0, 3, -172, -144)]);
addPart('plaza-platform-south', 'Plaza platform south', 'plaza',
  [box(-130, 130, 0, 3, 144, 172)]);
addPart('plaza-platform-east', 'Plaza platform east', 'plaza',
  [box(144, 172, 0, 3, -130, 130)]);
{
  const nw1 = box(-152, -132, 0, 2, -172, -152);
  const nw2 = box(-148, -136, 2, 4, -168, -156);
  addPart('plaza-shrine-northwest', 'Plaza shrine northwest', 'plaza', [nw1, nw2]);
  const sw1 = box(-152, -132, 0, 2, 152, 172);
  const sw2 = box(-148, -136, 2, 4, 156, 168);
  addPart('plaza-shrine-southwest', 'Plaza shrine southwest', 'plaza', [sw1, sw2]);
}

// --- Sacred cave and tunnel: entrance pit at the foot of the main
// staircase (sourced seven-metre-deep pit found 1971 by Taboada), the
// man-made tunnel to beneath the centre, the cloverleaf chamber
// (schematic shape), and two offering caches (schematic placement): 5 parts.
addPart('cave-entrance-pit', 'Cave entrance pit', 'cave',
  [box(-156, -150, -7, 0.5, -3, 3)]);
addPart('cave-tunnel', 'Cave tunnel', 'cave',
  [box(-150, -4, -7.5, -4.5, -2, 2)]);
{
  const center = cyl(5, 5, 4, 0, -6, 0, 16);
  const lobes = [
    cyl(3.5, 3.5, 3.5, 7, -6.25, 0, 12),
    cyl(3.5, 3.5, 3.5, -7, -6.25, 0, 12),
    cyl(3.5, 3.5, 3.5, 0, -6.25, 7, 12),
    cyl(3.5, 3.5, 3.5, 0, -6.25, -7, 12),
  ];
  addPart('cave-cloverleaf-chamber', 'Cave cloverleaf chamber', 'cave', [center, ...lobes]);
}
{
  const cache = box(-40.75, -39.25, -7, -6, -0.75, 0.75);
  const mask = cyl(1, 1, 0.2, -40, -5.7, 0, 12);
  addPart('cave-mask-offering', 'Serpentine mask offering', 'cave', [cache, mask]);
}
{
  const p1 = cyl(0.8, 0.6, 1.2, -80, -6.4, -1, 10);
  const p2 = cyl(0.7, 0.5, 1.0, -78, -6.5, 0.8, 10);
  const p3 = cyl(0.9, 0.7, 1.4, -82, -6.3, 0.5, 10);
  addPart('cave-pottery-offering', 'Pottery offering cache', 'cave', [p1, p2, p3]);
}

// --- Site: ground plane of the 500 m frame: 1 part.
addPart('site-ground', 'Site ground', 'site',
  [box(-250, 250, -0.6, 0, -250, 250)]);

// ---------------------------------------------------------------- colors
// Schematic light stone-and-plaster palette (the Eiffel Tower is the only
// dark realistic model in the atlas).
function colorFor(id) {
  if (id.startsWith('tier-') && id.includes('-talud-')) return '#c4a982';
  if (id.startsWith('tier-') && id.includes('-tablero-')) return '#d9c8a8';
  if (id.startsWith('tier-') && id.includes('-cornice-')) return '#b39372';
  if (id.endsWith('-tread')) return '#bfa87f';
  if (id.startsWith('stair-flight-')) return '#b3a08c';
  if (id.startsWith('stair-alfarda-')) return '#a8906f';
  if (id === 'summit-altar') return '#8a6f52';
  if (id.startsWith('summit-') || id.startsWith('temple-')) return '#d3c4a4';
  if (id.startsWith('adosada-feline-')) return '#7a5f43';
  if (id.startsWith('adosada-')) return '#bb9c76';
  if (id === 'avenue-road') return '#ddd3bf';
  if (id.startsWith('avenue-edge-')) return '#c0b39a';
  if (id === 'forecourt-plaza') return '#d5cab2';
  if (id.startsWith('plaza-platform-')) return '#c8b28e';
  if (id.startsWith('plaza-shrine-')) return '#bfa87f';
  if (id === 'cave-mask-offering') return '#3f6b4f';
  if (id === 'cave-pottery-offering') return '#a05a3c';
  if (id.startsWith('cave-')) return '#8a7a66';
  return '#e8dfcb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'talud', name: 'Talud tiers', color: '#c4a982', description: 'The sloping faces of the five stepped tiers, built of cut tepetate blocks and adobe, faced with tezontle slabs, mortar and stucco.' },
  { id: 'tablero', name: 'Tablero panels', color: '#d9c8a8', description: 'Vertical framed panels set against the taluds, the signature talud-tablero style of Teotihuacan.' },
  { id: 'cornice', name: 'Cornices', color: '#b39372', description: 'Horizontal moldings crowning each tier face.' },
  { id: 'treads', name: 'Tier treads', color: '#bfa87f', description: 'The flat walkways between the tiers.' },
  { id: 'staircase', name: 'Grand staircase', color: '#b3a08c', description: 'The broad central staircase climbing the west face toward the Avenue of the Dead, flanked by alfarda balustrade walls.' },
  { id: 'summit', name: 'Summit and temple remnants', color: '#d3c4a4', description: 'The summit platform and the schematic remnants of the temple that was destroyed before archaeological study.' },
  { id: 'adosada', name: 'Adosada platform', color: '#bb9c76', description: 'The four-level platform built over the original west facade centuries after the pyramid was completed, decorated with sculpted feline heads.' },
  { id: 'avenue', name: 'Avenue of the Dead frontage', color: '#d5cab2', description: 'The 45 m wide north-south avenue running along the west side of the pyramid, shown as a frontage segment with the forecourt plaza.' },
  { id: 'plaza', name: 'Surrounding plaza', color: '#c8b28e', description: 'Low platforms ringing the pyramid, shown in outline.' },
  { id: 'cave', name: 'Sacred cave and tunnel', color: '#8a7a66', description: 'The man-made tunnel and cloverleaf chamber six metres beneath the pyramid, whose entrance was found in 1971.' },
  { id: 'site', name: 'Site', color: '#e8dfcb', description: 'The ground plane of the 500 m site frame.' },
];

// ---------------------------------------------------------------- explanations
// Built programmatically for the repeated tier patterns so the lookup keys
// (name.toLowerCase()) can never drift from the part names.
const explanations = {};
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k];
  const sides = [
    ['north talud', 'north'], ['south talud', 'south'], ['east talud', 'east'],
    ['west talud north', 'west, north of the staircase'],
    ['west talud south', 'west, south of the staircase'],
  ];
  for (const [suffix, where] of sides) {
    explanations[`tier ${o} ${suffix}`] =
      `The sloping talud face of tier ${o} on the ${where} side, part of the five stepped tiers as reconstructed in the early 20th century. Tier heights and slope profiles are schematic.`;
  }
  const panels = [
    ['north tablero', 'north'], ['south tablero', 'south'], ['east tablero', 'east'],
    ['west tablero north', 'west, north of the staircase'],
    ['west tablero south', 'west, south of the staircase'],
  ];
  for (const [suffix, where] of panels) {
    explanations[`tier ${o} ${suffix}`] =
      `The vertical tablero panel on tier ${o}, set against the sloping talud in the classic talud-tablero style of Teotihuacan. Panel size and placement are schematic.`;
  }
  const cornices = [
    ['north cornice', 'north face'], ['south cornice', 'south face'], ['east cornice', 'east face'],
    ['west cornice north', 'west face, north of the staircase'],
    ['west cornice south', 'west face, south of the staircase'],
  ];
  for (const [suffix, where] of cornices) {
    explanations[`tier ${o} ${suffix}`] =
      `The horizontal molding crowning the ${where} of tier ${o}. Molding profiles are schematic.`;
  }
  explanations[`tier ${o} tread`] =
    `The flat walkway between the tiers at the top of tier ${o}. Exact widths are schematic.`;
  explanations[`grand staircase flight ${o}`] =
    `Flight ${o} of the broad central staircase climbing the west face toward the Avenue of the Dead. Staircase width, step count and slope are schematic.`;
  explanations[`stair alfarda ${o} north`] =
    `The alfarda (balustrade) wall flanking the north side of flight ${o} of the grand staircase. Exact form is schematic.`;
  explanations[`stair alfarda ${o} south`] =
    `The alfarda (balustrade) wall flanking the south side of flight ${o} of the grand staircase. Exact form is schematic.`;
}
Object.assign(explanations, {
  'summit platform': 'The summit platform at 65 m, the pyramid\u2019s present top. Exact platform extent is schematic.',
  'summit temple platform': 'The base of the summit temple, destroyed by deliberate and natural forces before archaeological study, so the pyramid cannot be tied to any particular deity. Shown as a schematic remnant.',
  'summit temple wall north': 'Low remnant of the summit temple wall on the north side. The temple itself is entirely lost; the wall is schematic.',
  'summit temple wall south': 'Low remnant of the summit temple wall on the south side. The temple itself is entirely lost; the wall is schematic.',
  'summit temple wall east': 'Low remnant of the summit temple wall on the east side. The temple itself is entirely lost; the wall is schematic.',
  'summit temple wall west': 'Low remnant of the summit temple wall on the west side. The temple itself is entirely lost; the wall is schematic.',
  'summit altar': 'A schematic altar on the summit platform, evoking the second-phase altar added when the pyramid reached its completed size, which has not survived. Human sacrifice is thought to have taken place on the summit.',
  'adosada platform level one': 'Level one of the adosada platform, the four-level structure built over the original west facade a few centuries after the pyramid\u2019s completion. Exact footprint and level heights are schematic.',
  'adosada platform level two': 'Level two of the adosada platform, the four-level structure built over the original west facade a few centuries after the pyramid\u2019s completion. Exact footprint and level heights are schematic.',
  'adosada platform level three': 'Level three of the adosada platform, the four-level structure built over the original west facade a few centuries after the pyramid\u2019s completion. Exact footprint and level heights are schematic.',
  'adosada platform level four': 'Level four of the adosada platform, the four-level structure built over the original west facade a few centuries after the pyramid\u2019s completion. Exact footprint and level heights are schematic.',
  'adosada feline head north': 'A sculpted feline head set into the adosada platform, stuccoed and painted in multiple colors in antiquity. Exact sculpture is schematic.',
  'adosada feline head south': 'A sculpted feline head set into the adosada platform, stuccoed and painted in multiple colors in antiquity. Exact sculpture is schematic.',
  'avenue of the dead roadway': 'The Avenue of the Dead, the 45 m wide north-south avenue of Teotihuacan, shown as a frontage segment west of the pyramid. The pyramid stands on the avenue\u2019s east side. Segment extent is schematic.',
  'avenue of the dead west edge': 'The west edge line of the Avenue of the Dead frontage. Schematic.',
  'avenue of the dead east edge': 'The east edge line of the Avenue of the Dead frontage. Schematic.',
  'forecourt plaza': 'The forecourt plaza between the Avenue of the Dead and the adosada platform. Extent is schematic.',
  'plaza platform north': 'A low platform ringing the pyramid on the north side, shown in outline. Exact position is schematic.',
  'plaza platform south': 'A low platform ringing the pyramid on the south side, shown in outline. Exact position is schematic.',
  'plaza platform east': 'A low platform ringing the pyramid on the east side, shown in outline. Exact position is schematic.',
  'plaza shrine northwest': 'A small stepped shrine at the northwest corner of the surrounding plaza. Schematic.',
  'plaza shrine southwest': 'A small stepped shrine at the southwest corner of the surrounding plaza. Schematic.',
  'cave entrance pit': 'The seven-metre-deep pit at the foot of the main staircase where archaeologist Ernesto Taboada found the tunnel entrance in 1971, during work on a sound-and-light show.',
  'cave tunnel': 'The man-made tunnel running from the entrance pit to beneath the centre of the pyramid, six metres down. Rene Millon studied the tunnel system in 1959 and found sealed tunnels with pottery and hearths. The tunnel route is schematic.',
  'cave cloverleaf chamber': 'The cloverleaf (quatrefoil) chamber at the end of the tunnel, looted in antiquity. Once thought to be the natural lava tube of the mythical Chicomoztoc, it is now considered man-made, possibly a royal tomb. Chamber shape is schematic.',
  'serpentine mask offering': 'A cache with a green serpentine mask, like the offerings found in the tunnel. Placement is schematic.',
  'pottery offering cache': 'A cache of pottery vessels, like those Rene Millon\u2019s team found in the sealed tunnels. Placement is schematic.',
  'site ground': 'The ground plane of the 500 m site frame: the pyramid, its forecourt, the Avenue of the Dead frontage and the surrounding plaza in outline.',
});

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
const binName = 'pyramid-of-the-sun-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the pyramid-of-the-sun directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Pyramid of the Sun, Teotihuacan, Mexico (schematic)',
  title: 'Pyramid of the Sun',
  location: 'Teotihuacan, Mexico',
  blurb: 'The Pyramid of the Sun at Teotihuacan, Mexico, the largest building of the ancient city, built about 200 AD. Explore {parts} named components across {systems} systems, from the five stepped talud-tablero tiers and the grand west staircase to the summit temple remnants, the later Adosada platform, the Avenue of the Dead frontage, and the sacred cave tunnel beneath the pyramid.',
  sourceUrls: [
    { label: 'Pyramid of the Sun, Wikipedia', url: 'https://en.wikipedia.org/wiki/Pyramid_of_the_Sun' },
    { label: 'Teotihuacan, Wikipedia', url: 'https://en.wikipedia.org/wiki/Teotihuac%C3%A1n' },
    { label: 'Live Science: Teotihuacan, Ancient City of Pyramids', url: 'https://www.livescience.com/22545-teotihuacan.html&lang=en' },
    { label: 'Smarthistory: Pyramid of the Moon and Pyramid of the Sun', url: 'https://smarthistory.org/moon-and-sun-pyramid-teotihuacan' },
    { label: 'e-a-a.com: Pyramid of the Sun architecture', url: 'https://www.e-a-a.com/pyramid-of-the-sun-teotihuacan-mexico/' },
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
  chunks: [{ url: '/models/pyramid-of-the-sun/pyramid-of-the-sun-0.bin', bytes: offset }],
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
