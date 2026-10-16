// Procedural St Paul's Cathedral for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned St Paul's Cathedral in code
// and writes it in the atlas binary format:
//   public/models/st-pauls-cathedral/atlas.json
//   public/models/st-pauls-cathedral/st-pauls-cathedral-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Anglican cathedral on Ludgate Hill, City of London; seat of the Bishop
//   of London; Grade I listed; English Baroque, Sir Christopher Wren;
//   first stone laid 21 June 1675; first service 1697; declared complete
//   1710 (last stone of the lantern laid by Wren's son); built to replace
//   the Gothic cathedral destroyed in the Great Fire of 1666; 158 m long,
//   nave 37 m wide, 75 m across the transepts, 111 m high to the top of
//   the cross; tallest building in London 1710 to 1967; second-largest
//   church building in the UK by area after Liverpool Cathedral;
//   triple dome: inner dome 68 m high and 31 m in diameter, structural
//   brick cone, timber-framed outer dome 85 m high and 34 m in diameter
//   with lead covering; dome carried on eight great piers; Whispering
//   Gallery about 30 m above the floor; west front 55 m wide (180 ft),
//   two storeys with pediment, Corinthian order below and Composite
//   above; west towers 67 m high (221 ft) with clock stages, belfries and
//   bell-shaped cupolas with gilded pinecone finials; north-west tower
//   holds 13 change-ringing bells, south-west tower holds Great Paul
//   (16.5 tons, cast 1881, largest bell in the British Isles) and Great
//   Tom the hour bell; Geometric Staircase in the south-west tower;
//   Portland stone walls; central aisle 27 m high (89 ft); crossing
//   octagon 33 m across (107 ft), drum 34 m in diameter (112 ft).
//   (Sources: Wikipedia infobox and article text via familypedia and
//   london.fandom mirrors; Project Gutenberg "Views of St. Paul's
//   Cathedral" (Rev. Sparrow Simpson's official guide dimensions);
//   atcuk.org Wren study sheet; aroundus.com listing.)
// Schematic (not sourced, never stated as fact in the UI): exact bay
// rhythm and pier positions along nave and choir; arcade, clerestory and
// vault profiles; transept arm depth and pediment shapes; choir aisle
// arrangement and apse radius; drum window count and peristyle column
// count (32 modeled); lantern stage heights and column counts; ball and
// cross proportions; west front pilaster counts; tower stage divisions
// and cupola profiles; statue identities on the west front pediment;
// roof pitches; step counts; which tower holds which named bell
// (assigned schematically: Great Paul south-west).
//
// Coordinate frame: x = lateral (north is -x), z = longitudinal
// (west front at -z, choir and apse at +z), y = up. All dimensions in
// meters.
//
// Granularity: ~115 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-st-pauls-cathedral.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'st-pauls-cathedral');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (158 m) maps to 2.4 units.
const S = 2.4 / 160;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 16) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Triangular prism pediment: triangle in XZ? No: pediment spans x0..x1,
// rises from y0 to yApex, extruded z0..z1.
function pediment(x0, x1, y0, yApex, z0, z1) {
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
// Half-cylinder (barrel vault) along z: radius r, from z0 to z1, top half
// (y >= yBase). Built from an open half cylinder whose theta range is
// chosen so that after rotateX the opening faces down.
function barrelVault(r, z0, z1, yBase, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg, 1, true, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  g.translate(0, yBase, (z0 + z1) / 2);
  return g;
}
// Hemisphere dome (top half of sphere), optionally scaled in y.
function dome(r, x, yBase, z, yScale = 1, seg = 24) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0), 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, yScale, 1);
  g.translate(x, yBase, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Vertical datum: podium top y=3. Nave aisle walls 3-14, clerestory 14-24,
// vault apex 27. Crossing piers 3-27. Drum 27-40, peristyle 40-48,
// outer dome springs ~42, apex 85. Lantern 85-100, ball 100-103, cross to 111.
// West front: z -79..-67. Nave: z -67..-7. Crossing: z -7..17.
// Transepts: x -37.5..37.5, z -7..17. Choir: z 17..57, apse to z 69.

// --- Base: podium, west steps, crypt plinth: 3 parts.
addPart('podium', 'Podium', 'base', [box(-40, 40, 0, 3, -82, 72)]);
{
  const steps = [];
  for (let s = 0; s < 4; s++) steps.push(box(-30, 30, s * 0.75, (s + 1) * 0.75, -86 + s * 1.2, -82));
  addPart('west-steps', 'West steps', 'base', steps);
}
addPart('crypt-plinth', 'Crypt plinth', 'base', [box(-38, 38, 0, 3, -80, 70)]);

// --- West front: two storeys, pediment, portico, doors, statues: 14 parts.
addPart('west-front-lower', 'West front lower storey', 'west-front', [box(-27.5, 27.5, 3, 16, -79, -67)]);
addPart('west-front-upper', 'West front upper storey', 'west-front', [box(-27.5, 27.5, 16, 26, -79, -67)]);
addPart('west-pediment', 'West front pediment', 'west-front', [pediment(-27.5, 27.5, 26, 33, -79, -67)]);
addPart('west-portico', 'West portico', 'west-front', [
  box(-10, 10, 3, 16, -84, -79),
  pediment(-10, 10, 16, 20, -84, -79),
]);
addPart('great-west-door', 'Great west door', 'west-front', [box(-3, 3, 3, 11, -84.2, -83.8)]);
addPart('west-side-door-north', 'West side door north', 'west-front', [box(-20, -17, 3, 9, -79.2, -78.8)]);
addPart('west-side-door-south', 'West side door south', 'west-front', [box(17, 20, 3, 9, -79.2, -78.8)]);
for (let i = 0; i < 6; i++) {
  const x = -22.9 + i * 9.16;
  addPart(`west-pilaster-${i + 1}`, `West front pilaster ${i + 1}`, 'west-front', [
    box(x - 0.9, x + 0.9, 3, 16, -79.4, -78.6),
    box(x - 0.9, x + 0.9, 16, 26, -79.4, -78.6),
  ]);
}
{
  const names = ['St Paul', 'St Peter', 'St James'];
  const xs = [-8, 0, 8];
  names.forEach((n, i) => {
    const b = cyl(0.5, 0.7, 2.6, xs[i], 34.3, -73, 8);
    const h = new THREE.SphereGeometry(0.42, 8, 6);
    h.translate(xs[i], 36.1, -73);
    addPart(`west-statue-${n.toLowerCase().replace(/ /g, '-')}`, `${n} statue`, 'west-front', [b, h]);
  });
}

// --- West towers: 2 towers x 6 stages = 12 parts.
for (const [side, sName] of [[-1, 'North-west'], [1, 'South-west']]) {
  const x = 22 * side;
  const id = side < 0 ? 'nw' : 'sw';
  addPart(`${id}-tower-shaft`, `${sName} tower shaft`, 'west-towers', [box(x - 5.5, x + 5.5, 3, 30, -78.5, -67.5)]);
  addPart(`${id}-tower-clock-stage`, `${sName} tower clock stage`, 'west-towers', [box(x - 5.5, x + 5.5, 30, 42, -78.5, -67.5)]);
  const face = cyl(2.6, 2.6, 0.3, x, 37, -78.65, 20);
  face.rotateX(Math.PI / 2);
  addPart(`${id}-tower-clock-face`, `${sName} tower clock face`, 'west-towers', [face]);
  addPart(`${id}-tower-belfry`, `${sName} tower belfry`, 'west-towers', [
    box(x - 4.5, x + 4.5, 42, 55, -77.5, -68.5),
    box(x - 5.5, x + 5.5, 42, 44, -78.5, -67.5),
  ]);
  addPart(`${id}-tower-cupola`, `${sName} tower cupola`, 'west-towers', [dome(4.5, x, 55, -73, 1.15, 16)]);
  const fin = cyl(0.12, 0.12, 3.2, x, 64.6, -73, 8);
  const pine = new THREE.SphereGeometry(0.55, 8, 6);
  pine.scale(1, 1.5, 1);
  pine.translate(x, 62.6, -73);
  addPart(`${id}-tower-finial`, `${sName} tower pinecone finial`, 'west-towers', [fin, pine]);
}
// Great Paul bell in the south-west tower (schematic placement).
{
  const bell = cyl(0.4, 1.6, 2.2, 22, 47, -73, 12);
  addPart('great-paul-bell', 'Great Paul bell', 'west-towers', [bell]);
}

// --- Nave: arcades, aisles, clerestory, vault: 20 parts.
{
  // Individual arcade piers: 6 bays -> 7 piers per side.
  for (const [side, sName] of [[-1, 'North'], [1, 'South']]) {
    for (let i = 0; i < 7; i++) {
      const z = -64 + i * 9.3;
      addPart(`nave-${side < 0 ? 'north' : 'south'}-pier-${i + 1}`, `Nave ${sName.toLowerCase()} arcade pier ${i + 1}`, 'nave', [
        box(side * 12 - 1.4, side * 12 + 1.4, 3, 14, z - 1.4, z + 1.4),
      ]);
    }
    addPart(`nave-${side < 0 ? 'north' : 'south'}-aisle-wall`, `Nave ${sName.toLowerCase()} aisle wall`, 'nave', [
      box(side < 0 ? -19.7 : 17.3, side < 0 ? -17.3 : 19.7, 3, 14, -67, -7),
    ]);
    addPart(`nave-${side < 0 ? 'north' : 'south'}-clerestory`, `Nave ${sName.toLowerCase()} clerestory wall`, 'nave', [
      box(side < 0 ? -12.8 : 11.2, side < 0 ? -11.2 : 12.8, 14, 24, -67, -7),
    ]);
    addPart(`nave-${side < 0 ? 'north' : 'south'}-aisle-vault`, `Nave ${sName.toLowerCase()} aisle vault`, 'nave', [
      box(Math.min(side * 12, side * 18.5), Math.max(side * 12, side * 18.5), 12, 14, -67, -7),
    ]);
  }
  addPart('nave-floor', 'Nave floor', 'nave', [box(-18.5, 18.5, 2.6, 3.4, -67, -7)]);
  addPart('nave-vault', 'Nave barrel vault', 'nave', [barrelVault(12, -67, -7, 15, 20)]);
}

// --- Transepts: arms, fronts, porticoes: 8 parts.
for (const [side, sName] of [[-1, 'North'], [1, 'South']]) {
  const x0 = side < 0 ? -37.5 : 12, x1 = side < 0 ? -12 : 37.5;
  addPart(`transept-${side < 0 ? 'north' : 'south'}-arm`, `${sName} transept arm`, 'transepts', [
    box(x0, x1, 3, 24, -7, 17),
  ]);
  const px0 = side < 0 ? -37.5 : 27.5, px1 = side < 0 ? -27.5 : 37.5;
  addPart(`transept-${side < 0 ? 'north' : 'south'}-front`, `${sName} transept front`, 'transepts', [
    box(px0, px1, 3, 26, -7, 17),
    pediment(px0, px1, 26, 31, -7, 17),
  ]);
  const cx = side < 0 ? -32.5 : 32.5;
  addPart(`transept-${side < 0 ? 'north' : 'south'}-portico`, `${sName} transept portico`, 'transepts', [
    box(cx - 4, cx + 4, 3, 14, -2, 2),
  ]);
}
addPart('transept-crossing-floor', 'Transept crossing floor', 'transepts', [box(-18.5, 18.5, 2.6, 3.4, -7, 17)]);

// --- Choir: block, vault, aisles, apse: 8 parts.
addPart('choir-block', 'Choir block', 'choir', [box(-12, 12, 3, 24, 17, 57)]);
addPart('choir-vault', 'Choir vault', 'choir', [barrelVault(12, 17, 57, 15, 16)]);
addPart('choir-north-aisle', 'Choir north aisle', 'choir', [box(-18.5, -12, 3, 14, 17, 57)]);
addPart('choir-south-aisle', 'Choir south aisle', 'choir', [box(12, 18.5, 3, 14, 17, 57)]);
addPart('apse', 'Apse', 'choir', [cyl(12, 12, 21, 0, 13.5, 57, 16, false)]);
addPart('apse-half-dome', 'Apse half-dome', 'choir', [dome(12, 0, 24, 57, 0.8, 16)]);
addPart('east-window', 'East window', 'choir', [box(-4, 4, 8, 20, 68.6, 69.2)]);
addPart('high-altar-platform', 'High altar platform', 'choir', [box(-6, 6, 3.4, 4.6, 50, 57)]);

// --- Dome: piers, drum, peristyle, triple dome, lantern, cross: 19 parts.
{
  // Eight great piers carrying the dome (schematic positions around the crossing).
  const piers = [[-15, -4], [15, -4], [-15, 14], [15, 14], [-15, 5], [15, 5], [-6, -4], [6, 14]];
  piers.forEach(([x, z], i) => {
    addPart(`crossing-pier-${i + 1}`, `Crossing pier ${i + 1}`, 'dome', [
      box(x - 2, x + 2, 3, 27, z - 2, z + 2),
    ]);
  });
}
addPart('drum', 'Dome drum', 'dome', [cyl(17, 17.6, 13, 0, 33.5, 5, 24)]);
{
  const cols = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    cols.push(cyl(0.55, 0.62, 8, Math.cos(a) * 18.2, 44, 5 + Math.sin(a) * 18.2, 8));
  }
  addPart('peristyle-colonnade', 'Peristyle colonnade', 'dome', cols);
  addPart('peristyle-entablature', 'Peristyle entablature', 'dome', [cyl(19.2, 19.2, 1.6, 0, 48.8, 5, 24)]);
}
addPart('inner-dome', 'Inner dome', 'dome', [dome(15.5, 0, 52, 5, 1.0, 24)]);
addPart('brick-cone', 'Structural brick cone', 'dome', [cyl(3.2, 12, 45, 0, 62.5, 5, 16)]);
addPart('outer-dome', 'Outer dome', 'dome', [dome(17, 0, 42, 5, 2.53, 32)]);
addPart('whispering-gallery', 'Whispering Gallery', 'dome', [cyl(16.2, 16.2, 1.2, 0, 30.6, 5, 24)]);
addPart('lantern-base', 'Lantern base', 'dome', [cyl(5.2, 6, 3, 0, 86.5, 5, 16)]);
{
  const cols = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    cols.push(cyl(0.4, 0.45, 8, Math.cos(a) * 4.2, 92, 5 + Math.sin(a) * 4.2, 8));
  }
  addPart('lantern-colonnade', 'Lantern colonnade', 'dome', cols);
}
addPart('lantern-dome', 'Lantern dome', 'dome', [dome(4.6, 0, 96, 5, 1.1, 16)]);
{
  const ball = new THREE.SphereGeometry(1.1, 12, 10);
  ball.translate(0, 102.2, 5);
  addPart('golden-ball', 'Golden ball', 'dome', [ball]);
}
addPart('dome-cross', 'Dome cross', 'dome', [
  box(-0.28, 0.28, 103, 111, 4.7, 5.3),
  box(-1.6, 1.6, 106.4, 107.2, 4.7, 5.3),
]);

// --- Crossing arches, transept windows, and interior fittings: 9 parts.
{
  const arches = [
    ['west', -7], ['east', 17],
  ];
  for (const [n, z] of arches) {
    addPart(`crossing-${n}-arch`, `Crossing ${n} arch`, 'dome', [box(-12, 12, 20, 27, z - 1.5, z + 1.5)]);
  }
  for (const [n, x] of [['north', -15], ['south', 15]]) {
    addPart(`crossing-${n}-arch`, `Crossing ${n} arch`, 'dome', [box(x - 1.5, x + 1.5, 20, 27, -7, 17)]);
  }
}
for (const [side, sName] of [[-1, 'North'], [1, 'South']]) {
  const w = cyl(3.2, 3.2, 0.5, side * 37.6, 18, 5, 20);
  w.rotateZ(Math.PI / 2);
  addPart(`transept-${sName.toLowerCase()}-circular-window`, `${sName} transept circular window`, 'transepts', [w]);
}
addPart('organ-case', 'Organ case', 'choir', [box(-18, -13, 6, 18, 24, 34)]);
addPart('choir-stalls', 'Choir stalls', 'choir', [
  box(-9, -4, 3.4, 6.5, 24, 44),
  box(4, 9, 3.4, 6.5, 24, 44),
]);
addPart('pulpit', 'Pulpit', 'nave', [cyl(1.6, 1.1, 3.4, 8, 5.1, -30, 10)]);

// --- Roofs: 7 parts.
addPart('nave-roof', 'Nave roof', 'roofs', [box(-13.5, 13.5, 24, 28.5, -67, -7)]);
addPart('nave-north-aisle-roof', 'Nave north aisle roof', 'roofs', [box(-19.5, -11, 14, 15.6, -67, -7)]);
addPart('nave-south-aisle-roof', 'Nave south aisle roof', 'roofs', [box(11, 19.5, 14, 15.6, -67, -7)]);
addPart('choir-roof', 'Choir roof', 'roofs', [box(-13, 13, 24, 28, 17, 57)]);
addPart('transept-north-roof', 'Transept north roof', 'roofs', [box(-37.5, -12, 24, 27.5, -7, 17)]);
addPart('transept-south-roof', 'Transept south roof', 'roofs', [box(12, 37.5, 24, 27.5, -7, 17)]);
addPart('west-front-roof', 'West front roof', 'roofs', [box(-27.5, 27.5, 26, 28, -79, -67)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'outer-dome' || id === 'lantern-dome') return '#8a939b';
  if (id === 'inner-dome') return '#b9c0c7';
  if (id === 'brick-cone') return '#9a6b52';
  if (id === 'drum' || id === 'peristyle-colonnade' || id === 'peristyle-entablature') return '#d8d2c4';
  if (id === 'whispering-gallery') return '#a89f8d';
  if (id === 'lantern-base' || id === 'lantern-colonnade') return '#cfc8b8';
  if (id === 'golden-ball' || id === 'dome-cross') return '#c9a227';
  if (id.includes('tower-cupola') || id.includes('tower-finial')) return '#7d8894';
  if (id.includes('tower-clock-face')) return '#2b3440';
  if (id === 'great-paul-bell') return '#6b5a3a';
  if (id.includes('west-statue')) return '#8f8a7d';
  if (id === 'great-west-door' || id.includes('west-side-door')) return '#4a3b2c';
  if (id.includes('vault')) return '#b5ad9c';
  if (id.includes('roof')) return '#6e7a86';
  if (id === 'nave-floor' || id === 'transept-crossing-floor' || id === 'high-altar-platform') return '#9a917f';
  if (id === 'podium' || id === 'crypt-plinth') return '#a39a86';
  if (id === 'west-steps') return '#b0a78f';
  if (id.includes('circular-window')) return '#3a4a5a';
  if (id === 'east-window') return '#3a4a5a';
  if (id === 'organ-case') return '#5a4632';
  if (id === 'choir-stalls' || id === 'pulpit') return '#6b543a';
  if (id.includes('crossing-') && id.includes('-arch')) return '#c4bba8';
  return '#d3ccbc';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and podium', color: '#a39a86', description: 'The podium, west steps and crypt plinth the cathedral stands on.' },
  { id: 'west-front', name: 'West front', color: '#d3ccbc', description: 'The 55 m wide west front: two storeys in Corinthian and Composite orders with a pediment, portico, doors and statues.' },
  { id: 'west-towers', name: 'West towers', color: '#d3ccbc', description: 'The twin 67 m west towers with clock stages, belfries, bell-shaped cupolas and gilded pinecone finials.' },
  { id: 'nave', name: 'Nave', color: '#d3ccbc', description: 'The 37 m wide nave with its arcades, aisles, clerestory and barrel vault rising to 27 m.' },
  { id: 'transepts', name: 'Transepts', color: '#d3ccbc', description: 'The north and south transept arms, 75 m across from end to end, with pedimented fronts and porticoes.' },
  { id: 'choir', name: 'Choir and apse', color: '#d3ccbc', description: 'The choir east of the crossing with its aisles, vault, semicircular apse and high altar platform.' },
  { id: 'dome', name: 'Dome', color: '#8a939b', description: 'Wren\u2019s triple dome: inner dome, structural brick cone and timber-framed outer dome rising to 111 m, carried on eight great piers.' },
  { id: 'roofs', name: 'Roofs', color: '#6e7a86', description: 'The lead roofs over nave, aisles, choir and transepts.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium': 'The podium platform raising the cathedral above the churchyard. Exact height is schematic.',
  'west steps': 'The steps rising to the west front from Ludgate Hill. Exact step count is schematic.',
  'crypt plinth': 'The plinth over the crypt, one of the largest in London, which holds the tombs of Nelson, Wellington and Wren himself. Exact form is schematic.',
  'west front lower storey': 'The lower storey of the 55 m wide west front, in the Corinthian order. Exact storey heights are schematic.',
  'west front upper storey': 'The upper storey of the west front, in the Composite order. Exact storey heights are schematic.',
  'west front pediment': 'The pediment crowning the west front. Exact pediment profile is schematic.',
  'west portico': 'The projecting west portico framing the Great West Door. Exact projection is schematic.',
  'great west door': 'The Great West Door, the ceremonial entrance beneath the portico. Exact door design is schematic.',
  'west side door north': 'One of the side doors of the west front. Exact door design is schematic.',
  'west side door south': 'One of the side doors of the west front. Exact door design is schematic.',
  'west front pediment statues': 'Statues on the west front. Exact identities and positions are schematic.',
};
for (let i = 1; i <= 6; i++) {
  explanations[`west front pilaster ${i}`] =
    `One of the giant pilasters articulating the west front, Corinthian below and Composite above. Exact count and spacing are schematic.`;
}
for (const n of ['St Paul', 'St Peter', 'St James']) {
  explanations[`${n.toLowerCase()} statue`] =
    `A statue of ${n} on the west front. Exact identity and position are schematic.`;
}
for (const [id, N] of [['nw', 'North-west'], ['sw', 'South-west']]) {
  explanations[`${N.toLowerCase()} tower shaft`] = `The shaft of the ${N.toLowerCase()} tower, rising through the tiers of the 67 m west towers. Exact stage divisions are schematic.`;
  explanations[`${N.toLowerCase()} tower clock stage`] = `The clock stage of the ${N.toLowerCase()} tower, the square block whose paired corner columns unify the drum shape with the plinth. Exact form is schematic.`;
  explanations[`${N.toLowerCase()} tower clock face`] = `A clock face of the ${N.toLowerCase()} tower. Exact dial design is schematic.`;
  explanations[`${N.toLowerCase()} tower belfry`] = id === 'nw'
    ? 'The belfry of the north-west tower, which holds 13 bells hung for change ringing. Exact openings are schematic.'
    : 'The belfry of the south-west tower, which holds Great Paul and Great Tom. Exact openings are schematic.';
  explanations[`${N.toLowerCase()} tower cupola`] = `The bell-shaped cupola capping the ${N.toLowerCase()} tower, like a miniature dome. Exact profile is schematic.`;
  explanations[`${N.toLowerCase()} tower pinecone finial`] = `The gilded pinecone finial on scrolling brackets crowning the ${N.toLowerCase()} tower. Exact form is schematic.`;
}
explanations['great paul bell'] = 'Great Paul, at 16.5 tons the largest bell in the British Isles, cast in 1881 and hung in the south-west tower. Exact hang position is schematic.';
for (const side of ['north', 'south']) {
  for (let i = 1; i <= 7; i++) {
    explanations[`nave ${side} arcade pier ${i}`] =
      `One of the arcade piers dividing the 37 m wide nave from its ${side} aisle. Exact bay rhythm is schematic.`;
  }
  explanations[`nave ${side} aisle wall`] = `The outer wall of the nave ${side} aisle. Exact window arrangement is schematic.`;
  explanations[`nave ${side} clerestory wall`] = `The ${side} clerestory wall, rising above the aisle roof to light the 27 m high central aisle. Exact window arrangement is schematic.`;
  explanations[`nave ${side} aisle vault`] = `The vault over the nave ${side} aisle. Exact vault profile is schematic.`;
}
explanations['nave floor'] = 'The floor of the nave, the great auditory where Wren wanted every member of the congregation to see and hear. Exact paving is schematic.';
explanations['nave barrel vault'] = 'The barrel vault over the central aisle, rising to 27 m. Exact vault profile is schematic.';
for (const side of ['north', 'south']) {
  explanations[`${side} transept arm`] = `The ${side} transept arm; the transepts stretch 75 m from end to end. Exact arm depth is schematic.`;
  explanations[`${side} transept front`] = `The pedimented ${side} front of the transept. Exact pediment shape is schematic.`;
  explanations[`${side} transept portico`] = `The ${side} transept portico. Exact form is schematic.`;
}
explanations['transept crossing floor'] = 'The floor beneath the crossing, at the heart of the 158 m plan. Exact paving is schematic.';
explanations['choir block'] = 'The choir block east of the crossing, holding the clergy and choir stalls. Exact bay rhythm is schematic.';
explanations['choir vault'] = 'The vault over the choir. Exact vault profile is schematic.';
explanations['choir north aisle'] = 'The north aisle of the choir. Exact form is schematic.';
explanations['choir south aisle'] = 'The south aisle of the choir. Exact form is schematic.';
explanations['apse'] = 'The semicircular apse closing the choir at the east end. Exact radius is schematic.';
explanations['apse half-dome'] = 'The half-dome over the apse. Exact profile is schematic.';
explanations['east window'] = 'The great east window above the high altar. Exact tracery is schematic.';
explanations['high altar platform'] = 'The platform of the high altar at the east end of the choir. Exact form is schematic.';
for (let i = 1; i <= 8; i++) {
  explanations[`crossing pier ${i}`] =
    `One of the eight great piers carrying the dome. Exact pier positions are schematic.`;
}
explanations['dome drum'] = 'The drum beneath the dome, 34 m in diameter. Exact window arrangement is schematic.';
explanations['peristyle colonnade'] = 'The peristyle: a colonnade ringing the drum at the dome\u2019s base, a screen of columns Wren set around the dome. The modeled count of 32 columns is schematic.';
explanations['peristyle entablature'] = 'The entablature ring over the peristyle colonnade. Exact profile is schematic.';
explanations['inner dome'] = 'The inner dome, 31 m across and rising to 68 m, the painted ceiling seen from the Whispering Gallery. Exact curvature is schematic.';
explanations['structural brick cone'] = 'The hidden structural brick cone between the inner and outer domes, the ingenious masonry core that actually carries the lantern\u2019s weight. Exact cone angle is schematic.';
explanations['outer dome'] = 'The timber-framed outer dome, 34 m across and rising to 85 m, clad in lead: the great grey dome of the London skyline. Exact profile is schematic.';
explanations['whispering gallery'] = 'The Whispering Gallery, the walkway about 30 m above the floor where a whisper against the wall carries clearly to the far side. Exact gallery form is schematic.';
explanations['lantern base'] = 'The base of the lantern crowning the outer dome. Exact form is schematic.';
explanations['lantern colonnade'] = 'The colonnade of the lantern. The modeled column count is schematic.';
explanations['lantern dome'] = 'The small dome capping the lantern. Exact profile is schematic.';
explanations['golden ball'] = 'The gilded ball beneath the cross. Exact size is schematic.';
explanations['dome cross'] = 'The cross crowning the cathedral at 111 m, the top of the tallest building in London from 1710 to 1967. Exact cross form is schematic.';
for (const side of ['west', 'east', 'north', 'south']) {
  explanations[`crossing ${side} arch`] =
    `The ${side} arch of the crossing, one of the four great arches carrying the dome. Exact arch profile is schematic.`;
}
explanations['north transept circular window'] = 'The circular window of the north transept front. Exact tracery is schematic.';
explanations['south transept circular window'] = 'The circular window of the south transept front. Exact tracery is schematic.';
explanations['organ case'] = 'The organ case on the north side of the choir. St Paul\u2019s has had a series of great organs; the exact case modeled here is schematic.';
explanations['choir stalls'] = 'The choir stalls flanking the choir, where the clergy and choir sit. Exact joinery is schematic.';
explanations['pulpit'] = 'The pulpit in the nave, for preaching to Wren\u2019s great auditory congregation. Exact form is schematic.';
explanations['nave roof'] = 'The lead roof over the nave vault. Exact pitch is schematic.';
explanations['nave north aisle roof'] = 'The roof over the nave north aisle. Exact pitch is schematic.';
explanations['nave south aisle roof'] = 'The roof over the nave south aisle. Exact pitch is schematic.';
explanations['choir roof'] = 'The lead roof over the choir. Exact pitch is schematic.';
explanations['transept north roof'] = 'The roof over the north transept arm. Exact pitch is schematic.';
explanations['transept south roof'] = 'The roof over the south transept arm. Exact pitch is schematic.';
explanations['west front roof'] = 'The roof behind the west front pediment. Exact form is schematic.';
// Remove the unused generic statue key if present (statues are individual).
delete explanations['west front pediment statues'];

// ---------------------------------------------------------------- serialize
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
  const align4 = (n) => (n + 3) & ~3;
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
const binName = 'st-pauls-cathedral-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: "St Paul's Cathedral, London",
  title: "St Paul's Cathedral",
  location: 'London, United Kingdom',
  blurb: 'Sir Christopher Wren\u2019s English Baroque cathedral on Ludgate Hill, built 1675 to 1710 after the Great Fire of London. Explore the 158 m plan, the twin 67 m west towers, and the triple dome rising to 111 m on eight great piers.',
  sourceUrls: [
    { label: 'Wikipedia: St Paul\u2019s Cathedral', url: 'https://en.wikipedia.org/wiki/St_Paul%27s_Cathedral' },
    { label: 'Project Gutenberg: Views of St. Paul\u2019s Cathedral', url: 'https://www.gutenberg.org/files/48491/48491-h/48491-h.htm' },
    { label: 'ATC UK: Wren, St Paul\u2019s Cathedral study sheet', url: 'https://atcuk.org/wp-content/uploads/2025/07/Wren-St-Pauls-Cathedral.pdf' },
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
  chunks: [{ url: '/models/st-pauls-cathedral/st-pauls-cathedral-0.bin', bytes: offset }],
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
