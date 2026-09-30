// Simplified schematic Tower Bridge for the Architectural Atlas.
//
// The "simple" variant of Tower Bridge: same footprint, massing and
// proportions as the detailed model (see scripts/generate-tower-bridge.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 32 named parts across 7 systems instead of 101 across 9. Piers, chambers
// and starlings merge into single pier parts; tower legs, upper stage,
// arches and windows merge into single tower bodies; bascule girders, deck,
// footways and railings merge into single leaves; walkway stubs, rods and
// centre girder merge into the walkway tubes; chains, suspenders and
// anchorages stay separate but coarser; deck furniture, hydraulics and
// ornament are reduced to their headline parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-tower-bridge.mjs for the full attribution):
//   940 ft (290 m) overall including abutments; 213 ft (65 m) towers;
//   central span 200 ft with two 1,070-ton bascules; side spans 270 ft;
//   piers 185 ft by 70 ft with over 70,000 long tons of concrete; octagonal
//   steel columns 119 ft 6 in at each tower corner; bascule pivot 13 ft 3 in
//   inside the pier face and 5 ft 7 in below the roadway; walkways 143 ft
//   above high water on 55 ft cantilevers; six accumulators at 750 psi fed by
//   steam engines; suspension rods anchored at the abutments and through rods
//   in the walkways; roadway through the towers, footways around them;
//   opened 30 June 1894; blue and white paint from the 2008-2012 facelift.
// Schematic (not sourced, never stated as fact in the UI): exact pier,
// tower, abutment and approach outlines; merged group geometry; simplified
// chain curves, pinnacle and arch profiles.
//
// Writes:
//   public/models/tower-bridge-simple/atlas.json
//   public/models/tower-bridge-simple/tower-bridge-simple-0.bin
//
// Usage: node scripts/generate-tower-bridge-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'tower-bridge-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (940 ft = 286.5 m) maps to 2.4 units (same as detailed).
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
function pinnacle(x, z, y0, s = 1) {
  const g = [];
  g.push(box(x - 1.3 * s, x + 1.3 * s, y0, y0 + 5 * s, z - 1.3 * s, z + 1.3 * s));
  g.push(cone(1.9 * s, 6 * s, x, y0 + 8 * s, z, 8));
  return g;
}
function chain(x0, y0, x1, y1, dip, z, n = 10, w = 0.6) {
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

// ---------------------------------------------------------------- layout constants (meters, sourced; see detailed header)
const TC = 30.48; // tower centers, 200 ft apart
const ABUT = 112.78; // abutment faces, 270 ft side spans
const ABUT_END = 143.26; // 940 ft overall
const WALKY = 34.75; // walkways 143 ft above high water

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Substructure: piers and abutments merged (sourced pier dims).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const cx = s * TC;
  addPart(`${p}-pier`, `${P} pier`, 'substructure', [
    box(cx - 10.67, cx + 10.67, -12, -1, -28.19, 28.19),
    box(cx - 10.67, cx + 10.67, -9, -3, -33.19, -28.19),
    box(cx - 10.67, cx + 10.67, -9, -3, 28.19, 33.19),
  ]);
  const x0 = Math.min(s * ABUT, s * ABUT_END), x1 = Math.max(s * ABUT, s * ABUT_END);
  const tx = s * 128;
  addPart(`${p}-abutment`, `${P} abutment`, 'substructure', [
    box(x0, x1, -4, 0, -12, 12),
    box(tx - 4, tx + 4, 0, 16, -12, -4),
    box(tx - 4, tx + 4, 0, 16, 4, 12),
    ...pinnacle(tx, -8, 16, 0.8),
    ...pinnacle(tx, 8, 16, 0.8),
  ]);
}

// --- Towers: base, legs, upper stage and arches merged (sourced 213 ft).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const cx = s * TC;
  addPart(`${p}-tower`, `${P} tower`, 'towers', [
    box(cx - 14, cx + 14, -4, 3, -10, 10),
    box(cx - 10, cx + 10, 3, 20, -10, -3.5),
    box(cx - 10, cx + 10, 3, 20, 3.5, 10),
    box(cx - 10, cx + 10, 20, 26, -10, 10),
    box(cx - 8, cx + 8, 26, 50, -8, 8),
  ]);
  const pin = [];
  for (const dx of [-6.5, 6.5]) for (const dz of [-6.5, 6.5]) pin.push(...pinnacle(cx + dx, dz, 50));
  addPart(`${p}-tower-pinnacles`, `${P} tower pinnacles`, 'towers', pin);
  const cols = [];
  for (const dx of [-6.5, 6.5]) for (const dz of [-7.5, 7.5]) {
    cols.push(cyl(1.1, 1.1, 36.4, cx + dx, 18.2, dz, 8));
  }
  addPart(`${p}-tower-columns`, `${P} tower steel columns`, 'towers', cols);
}

// --- Bascules: leaves, counterweights and pivots (sourced weights).
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const tail = s * 45.72, piv = s * TC;
  const x0 = Math.min(tail, 0), x1 = Math.max(tail, 0);
  const leaf = [box(x0, x1, -0.5, 0.05, -7.45, 7.45)];
  for (const gz of [-6.17, -2.06, 2.06, 6.17]) leaf.push(box(x0, x1, -3, -0.5, gz - 0.45, gz + 0.45));
  leaf.push(box(x0, x1, 0.05, 0.2, -9.5, -7.45));
  leaf.push(box(x0, x1, 0.05, 0.2, 7.45, 9.5));
  leaf.push(box(x0, x1, 0.2, 1.3, -9.7, -9.5));
  leaf.push(box(x0, x1, 0.2, 1.3, 9.5, 9.7));
  addPart(`${p}-leaf`, `${P} bascule leaf`, 'bascules', leaf);
  const cx0 = Math.min(tail, piv), cx1 = Math.max(tail, piv);
  addPart(`${p}-counterweight`, `${P} bascule counterweight`, 'bascules', [
    box(cx0, cx1, -8, -2, -6, 6),
  ]);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const shaft = new THREE.CylinderGeometry(0.27, 0.27, 14.63, 8);
    shaft.rotateX(Math.PI / 2);
    shaft.translate(s * TC, -1.7, 0);
    g.push(shaft);
  }
  addPart('bascule-pivots', 'Bascule pivots', 'bascules', g);
}

// --- Walkways: tubes with merged stubs, rods and glass floors.
for (const [id, name, zc] of [
  ['west-walkway', 'West high-level walkway', -9],
  ['east-walkway', 'East high-level walkway', 9],
]) {
  const g = [box(-TC, TC, WALKY - 2.5, WALKY + 2.5, zc - 2, zc + 2)];
  const rod = new THREE.CylinderGeometry(0.15, 0.15, 2 * TC, 6);
  rod.rotateZ(Math.PI / 2);
  rod.translate(0, WALKY, zc);
  g.push(rod);
  addPart(id, name, 'walkways', g);
}
{
  const g = [];
  for (const zc of [-9, 9]) {
    for (let i = 0; i < 6; i++) {
      const x0 = -TC + 4 + i * ((2 * TC - 8) / 6);
      g.push(box(x0, x0 + (2 * TC - 8) / 6 - 0.8, WALKY - 2.5, WALKY - 2.15, zc - 1.6, zc + 1.6));
    }
  }
  addPart('glass-floors', 'Walkway glass floors', 'walkways', g);
}
{
  const g = [];
  for (const zc of [-9, 9]) g.push(box(-TC, TC, WALKY + 2.5, WALKY + 3.1, zc - 2.2, zc + 2.2));
  addPart('walkway-roofs', 'Walkway roofs', 'walkways', g);
}

// --- Suspension side spans: decks, chains, suspenders, anchorages.
for (const s of [-1, 1]) {
  const p = s < 0 ? 'north' : 'south';
  const P = p[0].toUpperCase() + p.slice(1);
  const x0 = Math.min(s * TC, s * ABUT), x1 = Math.max(s * TC, s * ABUT);
  addPart(`${p}-side-deck`, `${P} suspension side deck`, 'suspension', [
    box(x0, x1, 0, 0.8, -9.14, 9.14),
    box(x0, x1, -3, -2.2, -8.6, -7.8),
    box(x0, x1, -3, -2.2, 7.8, 8.6),
  ]);
  const chains = [];
  for (const zc of [-8, 8]) chains.push(...chain(s * ABUT, 6, s * TC, 40, 12, zc));
  addPart(`${p}-chains`, `${P} suspension chains`, 'suspension', chains);
  const susp = [];
  for (let i = 1; i < 10; i++) {
    const x = s * ABUT + (i / 10) * (s * TC - s * ABUT);
    for (const zc of [-8, 8]) susp.push(strut([x, 0.8, zc], [x, 8, zc], 0.35));
  }
  addPart(`${p}-suspenders`, `${P} suspension suspenders`, 'suspension', susp);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(box(s * ABUT - s * 3, s * ABUT + s * 1, 0, 6, -10, -6));
    g.push(box(s * ABUT - s * 3, s * ABUT + s * 1, 0, 6, 6, 10));
  }
  addPart('chain-anchorages', 'Chain anchorages', 'suspension', g);
}

// --- Deck: roadway, footways, parapets merged.
{
  const g = [];
  for (const s of [-1, 1]) {
    const x0 = Math.min(s * TC, s * ABUT_END), x1 = Math.max(s * TC, s * ABUT_END);
    g.push(box(x0, x1, 0.05, 0.35, -7.45, 7.45));
  }
  addPart('roadway', 'Roadway', 'deck', g);
}
{
  const g = [];
  for (const zs of [-1, 1]) {
    g.push(box(-ABUT_END, ABUT_END, 0.05, 0.2, zs * 7.45, zs * 9.14));
    g.push(box(-TC - 14, -TC + 14, 0.05, 0.2, zs * 10, zs * 12.5));
    g.push(box(TC - 14, TC + 14, 0.05, 0.2, zs * 10, zs * 12.5));
  }
  addPart('low-footways', 'Low-level footways', 'deck', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const x0 = Math.min(s * TC, s * (ABUT_END + 30)), x1 = Math.max(s * TC, s * (ABUT_END + 30));
    g.push(box(x0, x1, 0.35, 1.4, -9.34, -9.14));
    g.push(box(x0, x1, 0.35, 1.4, 9.14, 9.34));
  }
  addPart('parapets', 'Parapets', 'deck', g);
}

// --- Hydraulics: headline parts only.
{
  const g = [];
  for (const s of [-1, 1]) {
    const cx = s * TC;
    for (const dz of [-15, 0, 15]) {
      g.push(cyl(1.2, 1.2, 5, cx - 7, -5.5, dz, 8));
      g.push(box(cx - 8.4, cx - 5.6, -3.2, -2.2, dz - 1.4, dz + 1.4));
    }
  }
  addPart('accumulators', 'Hydraulic accumulators', 'hydraulics', g);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const cx = s * TC;
    for (const dz of [-12, 12]) {
      g.push(box(cx - 3, cx + 3, -8, -5.5, dz - 2, dz + 2));
      g.push(cyl(0.9, 0.9, 3.4, cx - 1.5, -4.9, dz, 8));
      g.push(cyl(0.9, 0.9, 3.4, cx + 1.5, -4.9, dz, 8));
    }
  }
  addPart('steam-engines', 'Steam pumping engines', 'hydraulics', g);
}
addPart('engine-room', 'Victorian engine room', 'hydraulics', [
  box(118, 132, 0, 8, 12, 24),
  cyl(0.9, 1.2, 18, 125, 9, 18, 8),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette (same family as the detailed model;
// the Eiffel Tower is the only dark realistic model in the atlas).
function colorFor(id) {
  if (id.endsWith('-pier')) return '#b9b3a8';
  if (id.endsWith('-abutment')) return '#cfc4a8';
  if (id.endsWith('-tower')) return '#e4d9bf';
  if (id.endsWith('-tower-pinnacles')) return '#e0d6bd';
  if (id.endsWith('-tower-columns')) return '#7fa8c9';
  if (id.endsWith('-leaf')) return '#5b8ab5';
  if (id.endsWith('-counterweight')) return '#7a8896';
  if (id === 'bascule-pivots') return '#4a5a6a';
  if (id === 'west-walkway' || id === 'east-walkway') return '#dfe4e8';
  if (id === 'glass-floors') return '#a8d8e8';
  if (id === 'walkway-roofs') return '#8fb3d1';
  if (id.endsWith('-side-deck')) return '#62666a';
  if (id.endsWith('-chains')) return '#5b8ab5';
  if (id.endsWith('-suspenders')) return '#7fa8c9';
  if (id === 'chain-anchorages') return '#a8a096';
  if (id === 'roadway') return '#62666a';
  if (id === 'low-footways') return '#cfc6b4';
  if (id === 'parapets') return '#dfe4e8';
  if (id === 'accumulators') return '#4a5a6a';
  if (id === 'steam-engines') return '#3f4a55';
  if (id === 'engine-room') return '#d9cfbb';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'substructure', name: 'Substructure', color: '#b0a898', description: 'The two 185 ft by 70 ft concrete piers in the Thames and the shore abutments with their smaller towers.' },
  { id: 'towers', name: 'Towers', color: '#ded3b8', description: 'The two 213 ft steel-framed towers in Cornish granite and Portland stone, crowned with Gothic pinnacles.' },
  { id: 'bascules', name: 'Bascules', color: '#5b8ab5', description: 'The two counterbalanced leaves of the 200 ft opening span, each about 1,070 tons, with counterweights and pivots.' },
  { id: 'walkways', name: 'High-level walkways', color: '#dfe4e8', description: 'The pedestrian walkways 143 ft above high water, with glass floors fitted in 2014.' },
  { id: 'suspension', name: 'Suspension side spans', color: '#7fa8c9', description: 'The two 270 ft suspension side spans: decks, chains, suspenders and abutment anchorages.' },
  { id: 'deck', name: 'Roadway and footways', color: '#c8c2b2', description: 'The low-level deck: roadway, footways passing around the towers, and parapets.' },
  { id: 'hydraulics', name: 'Hydraulic machinery', color: '#6b7a8a', description: 'The steam-driven hydraulic plant that raises the bascules, and the Victorian engine room.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'north pier': 'One of two piers sunk into the Thames riverbed to carry the bridge, each stipulated by the 1885 act to be 185 ft long and 70 ft wide. Together the piers hold over 70,000 long tons of concrete. Exact outline is schematic.',
  'south pier': 'One of two piers sunk into the Thames riverbed to carry the bridge, each stipulated by the 1885 act to be 185 ft long and 70 ft wide. Together the piers hold over 70,000 long tons of concrete. Exact outline is schematic.',
  'north abutment': 'The north shore abutment at Tower Hill, with its smaller tower, anchoring the suspension chains. The bridge is 940 ft long including the abutments. Exact outline is schematic.',
  'south abutment': 'The south shore abutment at Bermondsey, with its smaller tower, anchoring the suspension chains. The bridge is 940 ft long including the abutments. Exact outline is schematic.',
  'north tower': 'The north tower: a steel skeleton faced in Cornish granite and Portland stone in Victorian Gothic style, rising 213 ft. The roadway passes through it while the footways pass around it. Exact massing is schematic.',
  'south tower': 'The south tower: a steel skeleton faced in Cornish granite and Portland stone in Victorian Gothic style, rising 213 ft. The roadway passes through it while the footways pass around it. Exact massing is schematic.',
  'north tower pinnacles': 'Four Gothic pinnacles crowning the north tower, the signature silhouette that makes the bridge read as a medieval gatehouse. Exact profiles are schematic.',
  'south tower pinnacles': 'Four Gothic pinnacles crowning the south tower, the signature silhouette that makes the bridge read as a medieval gatehouse. Exact profiles are schematic.',
  'north tower steel columns': 'Four octagonal steel columns, each 119 ft 6 in long, one at each corner of the north tower: the structural skeleton inside the stone facing. Positions are schematic.',
  'south tower steel columns': 'Four octagonal steel columns, each 119 ft 6 in long, one at each corner of the south tower: the structural skeleton inside the stone facing. Positions are schematic.',
  'north bascule leaf': 'The north leaf of the opening span: four steel girders carrying the roadway plate, projecting 100 ft toward the opposite tower when lowered. Each leaf weighs about 1,070 tons including ballast and paving. Exact girder shapes are schematic.',
  'south bascule leaf': 'The south leaf of the opening span: four steel girders carrying the roadway plate, projecting 100 ft toward the opposite tower when lowered. Each leaf weighs about 1,070 tons including ballast and paving. Exact girder shapes are schematic.',
  'north bascule counterweight': 'The ballasted tail of the north leaf, extending back into the pier to counterbalance the projecting section so the leaf can be raised with little force. Exact shape is schematic.',
  'south bascule counterweight': 'The ballasted tail of the south leaf, extending back into the pier to counterbalance the projecting section so the leaf can be raised with little force. Exact shape is schematic.',
  'bascule pivots': 'The 25-ton solid steel pivots on which the leaves turn, each 1 ft 9 in in diameter and 48 ft long, set 13 ft 3 in inside the pier faces and 5 ft 7 in below the roadway. Exact positions are schematic.',
  'west high-level walkway': 'The west pedestrian walkway 143 ft above high water, spanning the 200 ft between the towers so foot traffic could continue while the bascules were raised. Closed in 1910, reopened in 1982 as exhibition space. Exact tube profile is schematic.',
  'east high-level walkway': 'The east pedestrian walkway 143 ft above high water, spanning the 200 ft between the towers so foot traffic could continue while the bascules were raised. Closed in 1910, reopened in 1982 as exhibition space. Exact tube profile is schematic.',
  'walkway glass floors': 'Glass floor panels fitted in both walkways in 2014, letting visitors look straight down at the road and the Thames 143 ft below. Exact panel layout is schematic.',
  'walkway roofs': 'The roofs of the two walkway tubes. Exact profiles are schematic.',
  'north suspension side deck': 'The deck of the north 270 ft suspension side span, from the abutment to the north tower. Exact deck depth is schematic.',
  'south suspension side deck': 'The deck of the south 270 ft suspension side span, from the abutment to the south tower. Exact deck depth is schematic.',
  'north suspension chains': 'The suspension chains of the north side span, anchored at the abutment and rising to the north tower. Exact chain curve is schematic.',
  'south suspension chains': 'The suspension chains of the south side span, anchored at the abutment and rising to the south tower. Exact chain curve is schematic.',
  'north suspension suspenders': 'Vertical suspender rods hanging the north side-span deck from its chains. Exact spacing is schematic.',
  'south suspension suspenders': 'Vertical suspender rods hanging the south side-span deck from its chains. Exact spacing is schematic.',
  'chain anchorages': 'Anchorage blocks at both abutments where the suspension rods are made fast, tied back through rods contained within the upper walkways. Exact block shapes are schematic.',
  'roadway': 'The A100 roadway across the bridge, part of the London Inner Ring Road carrying about 40,000 crossings a day. Exact surfacing is schematic.',
  'low-level footways': 'The low-level pedestrian footways, passing around the outside of the towers while the roadway passes through them, and jogging outward at each tower. Exact alignment is schematic.',
  'parapets': 'Parapets along the deck and approach stubs, 60 ft apart between parapets across the side spans. Exact railing pattern is schematic.',
  'hydraulic accumulators': 'The six hydraulic accumulators storing pressurised water at 750 psi under very heavy weights on 20-inch rams, the stored energy that raises the bascules. Exact placement is schematic.',
  'steam pumping engines': 'The stationary steam engines driving the force pumps for the accumulators: pairs of larger 8 1/2 in and smaller 7 1/2 in three-cylinder engines, with redundancy built in. Exact engine shapes are schematic.',
  'victorian engine room': 'The Victorian engine rooms in a separate building near the south end of the bridge, housing the original steam engines as part of the Tower Bridge Exhibition. Exact building shape is schematic.',
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
const binName = 'tower-bridge-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the tower-bridge-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Tower Bridge, London (simplified schematic)',
  title: 'Tower Bridge',
  location: 'London, United Kingdom',
  blurb: 'London\u2019s Grade I listed combined bascule and suspension bridge over the Thames, in simplified schematic form: two 213 ft towers, two 1,070-ton bascules, high-level walkways and 270 ft suspension side spans.',
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
  chunks: [{ url: '/models/tower-bridge-simple/tower-bridge-simple-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so this compact 32-part packing clips its
  // tallest cards (the towers) at the top of the frame below ~2.3.
  spread: 2.3,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
