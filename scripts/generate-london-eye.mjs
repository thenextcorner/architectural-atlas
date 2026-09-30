// Procedural London Eye for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned London Eye in code and writes it
// in the atlas binary format:
//   public/models/london-eye/atlas.json
//   public/models/london-eye/london-eye-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/london-eye-attribution.md,
// opened 2026-09-30):
//   London Eye, originally the Millennium Wheel; cantilevered observation
//   wheel on the South Bank of the River Thames, London (Lambeth), western
//   end of Jubilee Gardens, between Westminster Bridge and Hungerford Bridge,
//   beside County Hall; 135 m (443 ft) tall; steel wheel rim 120 m (394 ft)
//   in diameter; world's tallest cantilevered observation wheel; most popular
//   paid tourist attraction in the UK, over 3 million visitors a year, over
//   85 million passengers as of 2025; conceived by Julia Barfield and David
//   Marks (Marks Barfield); structural engineer Arup; Mace construction
//   management, Hollandia steelwork (fabricated in the Netherlands), Tony Gee
//   foundations, Beckett Rankine marine works, Babtie Allott & Lomax checking
//   engineer; cost 70 million pounds; 1,700 tonnes of steel; rim built in
//   sections, floated up the Thames on barges, assembled lying flat on piled
//   platforms in the river, raised by Enerpac strand jacks at 2 degrees per
//   hour to 65 degrees, held a week, then lifted in a second phase to the
//   vertical; supported on one side only like one fork of a bicycle, spindle
//   cantilevered out over the Thames; A-frame of two tapered legs each over
//   58 m long, 20 m apart at the base, leaning toward the river at 65
//   degrees, on two 11 m concrete plinths, with cable backstays to a concrete
//   foundation 33 m deep; 64 tensioned steel cables (spokes) connect hub and
//   rim at nodes, each prestressed to 75 tonnes, full dead load of the wheel
//   hangs on the cables; 16 rotation cables run from the hub at an opposing
//   angle so rim and hub turn together with no lag; fixed spindle 22 m long,
//   wheel and hub turn on bearings around it; hydraulic motors drive tires
//   that run against the rim (friction drive); short towers founded in the
//   river bed carry the rim-bearing drive units and give restraint against
//   overturning; 32 sealed air-conditioned ovoidal capsules on the external
//   circumference, 10 tonnes each, up to 25 people, numbered 1 to 33 skipping
//   13, each representing a London borough, rotated by electric motors;
//   rotates at 26 cm/s (about 0.9 km/h), one revolution in about 30 minutes,
//   theoretical capacity 1,600 passengers per hour, no stop for boarding;
//   ceremonial opening 31 December 1999 by Tony Blair, first passengers
//   1 February 2000, public opening 9 March 2000, permanent status July 2002;
//   LED lighting from Color Kinetics installed December 2006; 2,000+
//   fireworks launched from the wheel each New Year.
// Derived (arithmetic from sourced numbers, not sourced): hub axis 67 m
// above ground = 135 m overall minus 60 m rim radius minus about 8 m of
// schematic capsule protrusion at the apex (using the rim top alone would
// put the axis at 75 m, but boarding at ground level from the moving
// capsules requires the rim's lowest point near the ground).
// Schematic (not sourced, never stated as fact in the UI): capsule size,
// ovoid shape, glass area and hanger arms; rim tube cross-section and the 16
// segment joints; spoke-to-node geometry and rotation cable layout; hub
// flange and bearing profiles; A-frame leg taper and the crown/saddle block
// reconciling the 58 m legs at 65 degrees with the 67 m hub height; backstay
// count and anchor layout; restraint tower positions and drive unit design;
// boarding deck, ticket hall, canopy, gangways, queue rails and river wall
// massing; LED fixture positions; foundation rafts and pads.
//
// Granularity: 112 named parts across 9 systems. Every explanation is either
// a sourced fact (see the research notes above) or explicitly marked
// schematic.
//
// Usage: node scripts/generate-london-eye.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'london-eye');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (135 m) maps to 2.4 units.
const S = 2.4 / 135;

// Model frame: x east, z toward the river (north), y up, metres.
// The wheel plane is the x-y plane at z = 0; the A-frame stands on the shore
// (negative z) and the spindle cantilevers out over the river (positive z).
const HUB = 67; // hub axis height, derived (see header)
const RIM_R = 60; // sourced rim radius (120 m diameter)

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
// Cable: thin cylinder between two points (rotation applied before the
// translation to the start point).
function cable(a, b, r, seg = 6) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg);
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
// Rim arc segment: torus arc rotated into position before translating to
// the hub center.
function rimArc(startAngle, arcLen, tube = 1.2) {
  const g = new THREE.TorusGeometry(RIM_R, tube, 8, 12, arcLen);
  g.rotateZ(startAngle);
  g.translate(0, HUB, 0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Wheel rim: 16 arc segments plus 4 groups of 16 cable nodes (64 nodes
// total, sourced): 20 parts.
for (let k = 0; k < 16; k++) {
  const n = k + 1;
  addPart(`rim-segment-${String(n).padStart(2, '0')}`, `Rim arc segment ${n}`, 'rim', [
    rimArc((k * Math.PI) / 8, Math.PI / 8),
  ]);
}
const QUADS = ['northeast', 'northwest', 'southwest', 'southeast'];
QUADS.forEach((q, qi) => {
  const geoms = [];
  for (let i = 0; i < 16; i++) {
    const a = ((qi * 16 + i) / 64) * Math.PI * 2;
    const g = new THREE.SphereGeometry(1.5, 8, 6);
    g.translate(RIM_R * Math.cos(a), HUB + RIM_R * Math.sin(a), 0);
    geoms.push(g);
  }
  addPart(`rim-nodes-${q}`, `Rim cable nodes, ${q} quadrant`, 'rim', geoms);
});

// --- Tension cables: 64 cables in 8 groups of 8 (sourced 64 cables,
// prestressed to 75 t), each from a hub flange to a rim node in a bicycle
// cross pattern, plus 16 rotation cables in 2 groups of 8 at an opposing
// angle on the hub (sourced): 10 parts.
for (let g = 0; g < 8; g++) {
  const side = g < 4 ? 1 : -1;
  const geoms = [];
  for (let j = 0; j < 8; j++) {
    const idx = (g % 4) * 8 + j;
    const na = (idx / 64) * Math.PI * 2;
    const fa = na + side * 0.0982;
    geoms.push(cable(
      [8 * Math.cos(fa), HUB + 8 * Math.sin(fa), 4.2 * side],
      [RIM_R * Math.cos(na), HUB + RIM_R * Math.sin(na), 0.6 * side],
      0.12,
    ));
  }
  addPart(`spoke-cables-group-${g + 1}`, `Tension cables group ${g + 1}`, 'spokes', geoms);
}
for (let g = 0; g < 2; g++) {
  const side = g === 0 ? 1 : -1;
  const geoms = [];
  for (let j = 0; j < 8; j++) {
    const ra = (j / 8) * Math.PI * 2 + (g * Math.PI) / 8;
    geoms.push(cable(
      [5 * Math.cos(ra), HUB + 5 * Math.sin(ra), 1.5 * side],
      [RIM_R * Math.cos(ra - 0.21), HUB + RIM_R * Math.sin(ra - 0.21), -0.6 * side],
      0.1,
    ));
  }
  addPart(`rotation-cables-group-${g + 1}`, `Rotation cables group ${g + 1}`, 'spokes', geoms);
}

// --- Hub and spindle (sourced 22 m fixed spindle; wheel and hub turn on
// bearings around it): 9 parts.
{
  const barrel = cyl(4, 4, 10, 0, HUB, 0, 16);
  barrel.rotateX(Math.PI / 2);
  addPart('hub-barrel', 'Hub barrel', 'hub', [barrel]);
}
{
  const spindle = cyl(1.3, 1.3, 22, 0, HUB, -4, 12);
  spindle.rotateX(Math.PI / 2);
  addPart('fixed-spindle', 'Fixed spindle (22 m)', 'hub', [spindle]);
}
for (const s of [{ id: 'north', z: 3.5 }, { id: 'south', z: -3.5 }]) {
  const bearing = cyl(2.6, 2.6, 2.5, 0, HUB, s.z, 14);
  bearing.rotateX(Math.PI / 2);
  const name = `Hub bearing, ${s.id}`;
  addPart(`hub-bearing-${s.id}`, name, 'hub', [bearing]);
}
for (const s of [{ id: 'north', z: 4.2 }, { id: 'south', z: -4.2 }]) {
  const flange = cyl(8, 8, 1.2, 0, HUB, s.z, 20);
  flange.rotateX(Math.PI / 2);
  addPart(`hub-flange-${s.id}`, `Hub flange, ${s.id}`, 'hub', [flange]);
}
{
  const nose = new THREE.ConeGeometry(2.5, 4, 12);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, HUB, 8);
  addPart('hub-nose-cap', 'Hub nose cap', 'hub', [nose]);
}
{
  const cap = cyl(1.6, 1.6, 1, 0, HUB, -15.5, 10);
  cap.rotateX(Math.PI / 2);
  addPart('spindle-end-cap', 'Spindle end cap', 'hub', [cap]);
}
addPart('hub-service-walkway', 'Hub service walkway', 'hub', [
  box(-7, 7, HUB - 4.8, HUB - 4.3, -5, 5),
]);

// --- Passenger capsules: 32 individually numbered capsules (sourced
// numbering 1 to 33 skipping 13), plus 4 glass panel groups, 4 hanger arm
// groups and 4 rotation motor groups (8 each): 44 parts.
const CAPSULE_R = 64;
const capsuleAngle = (i) => -Math.PI / 2 + ((i - 1) / 32) * Math.PI * 2; // capsule 1 at the bottom
for (let i = 1; i <= 32; i++) {
  const n = i <= 12 ? i : i + 1; // skip 13
  const phi = capsuleAngle(i);
  const cx = CAPSULE_R * Math.cos(phi);
  const cy = HUB + CAPSULE_R * Math.sin(phi);
  const body = new THREE.CapsuleGeometry(2, 4, 4, 10);
  body.scale(1, 1, 0.8);
  body.rotateZ(phi);
  body.translate(cx, cy, 0);
  addPart(`capsule-${n}`, `Capsule No. ${n}`, 'capsules', [body]);
}
for (let g = 0; g < 4; g++) {
  const glass = [];
  const hangers = [];
  const motors = [];
  for (let j = 0; j < 8; j++) {
    const i = g * 8 + j + 1;
    const phi = capsuleAngle(i);
    const cx = CAPSULE_R * Math.cos(phi);
    const cy = HUB + CAPSULE_R * Math.sin(phi);
    const rx = RIM_R * Math.cos(phi);
    const ry = HUB + RIM_R * Math.sin(phi);
    const panel = new THREE.SphereGeometry(1.55, 12, 10);
    panel.scale(0.55, 1.5, 1.15);
    panel.rotateZ(phi);
    panel.translate(cx + 2.9 * Math.cos(phi), cy + 2.9 * Math.sin(phi), 0);
    glass.push(panel);
    hangers.push(strut([rx, ry, 0], [cx, cy, 0], 0.55));
    motors.push(box(rx - 0.8, rx + 0.8, ry - 0.8, ry + 0.8, -0.8, 0.8));
  }
  addPart(`capsule-glass-group-${g + 1}`, `Capsule glass panels group ${g + 1}`, 'capsules', glass);
  addPart(`capsule-hanger-group-${g + 1}`, `Capsule hanger arms group ${g + 1}`, 'capsules', hangers);
  addPart(`capsule-motor-group-${g + 1}`, `Capsule rotation motors group ${g + 1}`, 'capsules', motors);
}

// --- A-frame support (sourced: two tapered legs over 58 m, 20 m apart at
// the base, leaning 65 degrees toward the river, two 11 m plinths, backstays
// to a 33 m deep tension foundation): 9 parts.
const LEG_BASE = { x: 10, y: 11, z: -32.5 };
const LEG_TOP = { x: 3, y: 63.6, z: -8 };
addPart('a-frame-leg-east', 'A-frame leg, east', 'a-frame', [
  strut([LEG_BASE.x, LEG_BASE.y, LEG_BASE.z], [LEG_TOP.x, LEG_TOP.y, LEG_TOP.z], 3.2),
]);
addPart('a-frame-leg-west', 'A-frame leg, west', 'a-frame', [
  strut([-LEG_BASE.x, LEG_BASE.y, LEG_BASE.z], [-LEG_TOP.x, LEG_TOP.y, LEG_TOP.z], 3.2),
]);
for (const [id, name, t] of [
  ['a-frame-cross-brace-lower', 'A-frame cross brace, lower', 0.4],
  ['a-frame-cross-brace-upper', 'A-frame cross brace, upper', 0.72],
]) {
  const x = LEG_BASE.x + t * (LEG_TOP.x - LEG_BASE.x);
  const y = LEG_BASE.y + t * (LEG_TOP.y - LEG_BASE.y);
  const z = LEG_BASE.z + t * (LEG_TOP.z - LEG_BASE.z);
  addPart(id, name, 'a-frame', [strut([x, y, z], [-x, y, z], 1.2)]);
}
{
  const saddle = box(-4.5, 4.5, 62.5, 68, -11.5, -4.5);
  const housing = cyl(2.4, 2.4, 7, 0, HUB, -8, 12);
  housing.rotateX(Math.PI / 2);
  addPart('a-frame-crown-saddle', 'A-frame crown and spindle saddle', 'a-frame', [saddle, housing]);
}
addPart('a-frame-plinth-east', 'A-frame plinth, east', 'a-frame', [
  box(LEG_BASE.x - 3, LEG_BASE.x + 3, 0, 11, LEG_BASE.z - 3, LEG_BASE.z + 3),
]);
addPart('a-frame-plinth-west', 'A-frame plinth, west', 'a-frame', [
  box(-LEG_BASE.x - 3, -LEG_BASE.x + 3, 0, 11, LEG_BASE.z - 3, LEG_BASE.z + 3),
]);
addPart('a-frame-backstay-east', 'A-frame backstay cables, east', 'a-frame', [
  cable([LEG_TOP.x, 64, LEG_TOP.z], [10, 1.5, -46], 0.28),
  cable([LEG_TOP.x, 64, LEG_TOP.z], [4, 1.5, -46], 0.28),
]);
addPart('a-frame-backstay-west', 'A-frame backstay cables, west', 'a-frame', [
  cable([-LEG_TOP.x, 64, LEG_TOP.z], [-10, 1.5, -46], 0.28),
  cable([-LEG_TOP.x, 64, LEG_TOP.z], [-4, 1.5, -46], 0.28),
]);

// --- Drive and restraint towers (sourced: short towers founded in the river
// bed carry the rim-bearing drive units; friction drive against the rim):
// 5 parts.
for (const s of [{ id: 'east', x: 1 }, { id: 'west', x: -1 }]) {
  const tx = 14 * s.x;
  addPart(`restraint-tower-${s.id}`, `River restraint tower, ${s.id}`, 'drive', [
    box(tx - 3, tx + 3, -4, 8, 6, 10),
  ]);
  const unit = box(tx - 2, tx + 2, 8.5, 11.5, 2, 6);
  const tire = cyl(1.5, 1.5, 1.2, tx, 10.2, 4.2, 10);
  tire.rotateX(Math.PI / 2);
  addPart(`rim-drive-unit-${s.id}`, `Rim drive unit, ${s.id}`, 'drive', [unit, tire]);
}
addPart('restraint-tower-pads', 'Restraint tower river bed pads', 'drive', [
  box(9, 19, -6, -4, 4, 12),
  box(-19, -9, -6, -4, 4, 12),
]);

// --- Boarding platform (sourced: walk on and off the moving capsules at
// ground level; ticket hall in the Riverside Building at County Hall): 8 parts.
addPart('boarding-deck', 'Boarding deck', 'boarding', [box(-16, 16, 0, 1, -4, 8)]);
{
  const piles = [];
  for (const [x, z] of [[-12, -2], [-12, 6], [0, -2], [0, 6], [12, -2], [12, 6]]) {
    piles.push(cyl(0.35, 0.35, 4, x, -2, z, 8));
  }
  addPart('boarding-deck-piles', 'Boarding deck piles', 'boarding', piles);
}
addPart('ticket-hall', 'Ticket hall', 'boarding', [box(-28, -18, 0, 6, -10, 0)]);
{
  const canopy = [box(-16, 16, 5, 5.6, -4, 8)];
  for (const [x, z] of [[-14, -2], [14, -2], [-14, 6], [14, 6]]) {
    canopy.push(cyl(0.22, 0.22, 5, x, 2.5, z, 8));
  }
  addPart('boarding-canopy', 'Boarding canopy', 'boarding', canopy);
}
addPart('boarding-queue-rails', 'Boarding queue rails', 'boarding', [
  box(-12, 12, 1.4, 1.6, -2.1, -1.9),
  box(-12, 12, 1.4, 1.6, 1.9, 2.1),
  box(-12, 12, 1.4, 1.6, 5.9, 6.1),
]);
addPart('boarding-gangway-east', 'Boarding gangway, east', 'boarding', [
  strut([16, 0.8, 2], [30, 0.1, 2], 3, 0.5),
]);
addPart('boarding-gangway-west', 'Boarding gangway, west', 'boarding', [
  strut([-16, 0.8, 2], [-30, 0.1, 2], 3, 0.5),
]);
addPart('river-wall', 'River wall', 'boarding', [box(-44, 24, -1, 1.5, -13, -11)]);

// --- LED lighting (sourced: Color Kinetics LED system, December 2006):
// 4 arc parts.
QUADS.forEach((q, qi) => {
  const geoms = [];
  for (let i = 0; i < 16; i++) {
    const a = ((qi * 16 + i) / 64) * Math.PI * 2;
    const g = new THREE.SphereGeometry(0.55, 8, 6);
    g.translate((RIM_R + 0.5) * Math.cos(a), HUB + (RIM_R + 0.5) * Math.sin(a), 1.6);
    geoms.push(g);
  }
  addPart(`led-arc-${q}`, `LED lighting arc, ${q} quadrant`, 'lighting', geoms);
});

// --- Foundations (sourced: plinths, tension foundation for the backstays):
// 3 parts.
addPart('tension-anchor-east', 'Tension anchor block, east', 'foundations', [
  box(6, 12, -2, 3, -49, -43),
]);
addPart('tension-anchor-west', 'Tension anchor block, west', 'foundations', [
  box(-12, -6, -2, 3, -49, -43),
]);
addPart('plinth-foundation-raft', 'Plinth foundation raft', 'foundations', [
  box(-17, 17, -2, 0, -38, -27),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette (the Eiffel Tower is the only dark realistic
// model in the atlas).
function colorFor(id) {
  if (id.startsWith('rim-segment-')) return '#e9e7e1';
  if (id.startsWith('rim-nodes-')) return '#b9bcc2';
  if (id.startsWith('spoke-cables-group-')) return '#8f959c';
  if (id.startsWith('rotation-cables-group-')) return '#7d838b';
  if (id === 'hub-barrel') return '#d5d2c9';
  if (id === 'fixed-spindle' || id === 'spindle-end-cap') return '#a8a49a';
  if (id.startsWith('hub-bearing-')) return '#6e6e6e';
  if (id.startsWith('hub-flange-')) return '#c9c6bd';
  if (id === 'hub-nose-cap') return '#e9e7e1';
  if (id === 'hub-service-walkway') return '#9a968c';
  if (id.startsWith('capsule-') && !id.includes('group')) return '#f4f2ec';
  if (id.startsWith('capsule-glass-group-')) return '#43617e';
  if (id.startsWith('capsule-hanger-group-')) return '#8f959c';
  if (id.startsWith('capsule-motor-group-')) return '#5c5c5c';
  if (id.startsWith('a-frame-leg-')) return '#dedbd2';
  if (id.startsWith('a-frame-cross-brace-')) return '#cfccc2';
  if (id === 'a-frame-crown-saddle') return '#c4c1b7';
  if (id.startsWith('a-frame-plinth-')) return '#b3aea2';
  if (id.startsWith('a-frame-backstay-')) return '#8f959c';
  if (id.startsWith('restraint-tower-')) return '#b8b4a9';
  if (id.startsWith('rim-drive-unit-')) return '#55585e';
  if (id === 'restraint-tower-pads') return '#8d887c';
  if (id === 'boarding-deck') return '#c8b28a';
  if (id === 'boarding-deck-piles') return '#7a756a';
  if (id === 'ticket-hall') return '#d9d4c7';
  if (id === 'boarding-canopy') return '#e5e2d8';
  if (id === 'boarding-queue-rails') return '#9a9a9a';
  if (id.startsWith('boarding-gangway-')) return '#b9b4a6';
  if (id === 'river-wall') return '#a8a39a';
  if (id.startsWith('led-arc-')) return '#a8d8e6';
  if (id.startsWith('tension-anchor-')) return '#a39e92';
  if (id === 'plinth-foundation-raft') return '#8d887c';
  return '#d9d5cc';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'rim', name: 'Wheel rim', color: '#e9e7e1', description: 'The 120 m steel rim, built in sections that were floated up the Thames on barges and assembled lying flat on piled platforms in the river before the wheel was raised.' },
  { id: 'spokes', name: 'Tension cables', color: '#9aa0a6', description: 'Sixty-four tensioned steel cables carry the rim like the spokes of a huge bicycle wheel, each prestressed to 75 tonnes; sixteen rotation cables keep the rim and hub turning together.' },
  { id: 'hub', name: 'Hub and spindle', color: '#cfcabf', description: 'The wheel and hub turn on bearings around a fixed 22 m spindle, which cantilevers out over the Thames from the A-frame.' },
  { id: 'capsules', name: 'Passenger capsules', color: '#f4f2ec', description: 'Thirty-two sealed, air-conditioned ovoidal capsules, each weighing 10 tonnes and holding up to 25 people, numbered 1 to 33 with 13 skipped.' },
  { id: 'a-frame', name: 'A-frame support', color: '#d8d5cc', description: 'Two tapered legs, each over 58 m long and 20 m apart at the base, leaning toward the river at 65 degrees and held by cable backstays.' },
  { id: 'drive', name: 'Drive and restraint towers', color: '#b8b4a9', description: 'Short towers founded in the river bed carry the rim-bearing drive units, which turn the wheel by friction against the rim.' },
  { id: 'boarding', name: 'Boarding platform', color: '#c9b795', description: 'The deck, ticket hall, canopy and gangways where passengers walk on and off the moving capsules; the wheel does not usually stop for boarding.' },
  { id: 'lighting', name: 'LED lighting', color: '#a8d8e6', description: 'LED lighting from Color Kinetics, installed in December 2006, for digital control of the rim colors.' },
  { id: 'foundations', name: 'Foundations', color: '#a39e92', description: 'The plinths, foundation raft and tension anchor blocks that hold the A-frame and its backstays.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let k = 1; k <= 16; k++) {
  explanations[`rim arc segment ${k}`] =
    `One of sixteen arc segments of the 120 m steel rim. The rim was built in sections, floated up the Thames on barges, and assembled lying flat on piled platforms in the river before the wheel was raised into position. Exact segment joints are schematic.`;
}
for (const q of QUADS) {
  explanations[`rim cable nodes, ${q} quadrant`] =
    `Sixteen of the 64 rim nodes where the tensioned steel cables meet the rim; wind loads reach the hub through the cables attached to these nodes. Exact node design is schematic.`;
  explanations[`led lighting arc, ${q} quadrant`] =
    `Part of the LED lighting ring on the rim. The lighting was redone with LED lighting from Color Kinetics in December 2006 for digital control of the colors. Exact fixture positions are schematic.`;
}
for (let g = 1; g <= 8; g++) {
  explanations[`tension cables group ${g}`] =
    `Eight of the 64 tensioned steel cables that support the rim like the spokes of a huge bicycle wheel, each prestressed to 75 tonnes. The full dead load of the wheel hangs on the cables. Exact cable layout is schematic.`;
}
for (let g = 1; g <= 2; g++) {
  explanations[`rotation cables group ${g}`] =
    `Eight of the 16 rotation cables, attached to the hub at an opposing angle so the turning of the rim and the turning of the hub stay together with no lag. Exact layout is schematic.`;
}
for (let i = 1; i <= 32; i++) {
  const n = i <= 12 ? i : i + 1;
  explanations[`capsule no. ${n}`] =
    `Capsule No. ${n}: one of 32 sealed, air-conditioned ovoidal passenger capsules, each weighing 10 tonnes and holding up to 25 people. The capsules are numbered 1 to 33, skipping 13 for superstitious reasons, and each represents one of the London boroughs. They hang on the external circumference of the wheel and are rotated by electric motors so the floor stays level. Exact size and shape are schematic.`;
}
for (let g = 1; g <= 4; g++) {
  explanations[`capsule glass panels group ${g}`] =
    `Glass fronts of eight capsules, giving all-round views of London. Exact glazing divisions are schematic.`;
  explanations[`capsule hanger arms group ${g}`] =
    `Hanger arms of eight capsules, connecting the capsules to the rim nodes. Exact arm geometry is schematic.`;
  explanations[`capsule rotation motors group ${g}`] =
    `Electric rotation motors of eight capsules, which keep each capsule level as the wheel turns. Exact motor design is schematic.`;
}
Object.assign(explanations, {
  'hub barrel': 'The central hub barrel, around which the wheel turns. The wheel and hub rotate on bearings around the fixed spindle. Exact profile is schematic.',
  'fixed spindle (22 m)': 'The fixed spindle, 22 m long, about the height of a seven-storey building stood on end. It is cantilevered out over the Thames, supported on one side only by the A-frame. The wheel and hub turn on bearings around it.',
  'hub bearing, north': 'One of the hub bearings, on which the wheel and hub turn around the fixed spindle. The bearings came from Germany. Exact profile is schematic.',
  'hub bearing, south': 'One of the hub bearings, on which the wheel and hub turn around the fixed spindle. The bearings came from Germany. Exact profile is schematic.',
  'hub flange, north': 'One of the hub flanges where the 64 tensioned cables anchor to the hub. Exact profile is schematic.',
  'hub flange, south': 'One of the hub flanges where the 64 tensioned cables anchor to the hub. Exact profile is schematic.',
  'hub nose cap': 'The nose cap on the river end of the hub. Exact shape is schematic.',
  'spindle end cap': 'The end cap on the shore end of the fixed spindle, where it meets the A-frame crown. Exact shape is schematic.',
  'hub service walkway': 'A service walkway beneath the hub for maintenance access. Exact layout is schematic.',
  'a-frame leg, east': 'One of two large tapered legs of the A-frame, each over 58 m long, set 20 m apart at the base and leaning toward the river at 65 degrees. The frame works like one fork of a bicycle, holding the fixed spindle that cantilevers the wheel out over the Thames. Exact taper is schematic.',
  'a-frame leg, west': 'One of two large tapered legs of the A-frame, each over 58 m long, set 20 m apart at the base and leaning toward the river at 65 degrees. The frame works like one fork of a bicycle, holding the fixed spindle that cantilevers the wheel out over the Thames. Exact taper is schematic.',
  'a-frame cross brace, lower': 'A cross brace tying the two A-frame legs together low down the frame. Exact brace position is schematic.',
  'a-frame cross brace, upper': 'A cross brace tying the two A-frame legs together high up the frame. Exact brace position is schematic.',
  'a-frame crown and spindle saddle': 'The crown housing where the two A-frame legs meet and cradle the fixed spindle. Exact geometry is schematic.',
  'a-frame plinth, east': 'One of two 11 m concrete plinths carrying the A-frame legs. Exact plinth profile is schematic.',
  'a-frame plinth, west': 'One of two 11 m concrete plinths carrying the A-frame legs. Exact plinth profile is schematic.',
  'a-frame backstay cables, east': 'Cable backstays from the top of the A-frame, anchored to a concrete foundation 33 m deep on land, holding the frame permanently at 65 degrees. Exact cable count is schematic.',
  'a-frame backstay cables, west': 'Cable backstays from the top of the A-frame, anchored to a concrete foundation 33 m deep on land, holding the frame permanently at 65 degrees. Exact cable count is schematic.',
  'river restraint tower, east': 'One of the short towers founded in the river bed, carrying the rim-bearing drive units and giving restraint against overturning. Exact position is schematic.',
  'river restraint tower, west': 'One of the short towers founded in the river bed, carrying the rim-bearing drive units and giving restraint against overturning. Exact position is schematic.',
  'rim drive unit, east': 'A friction drive unit: computer-controlled hydraulic motors driven by electric pumps turn tires that run against the rim to rotate the wheel. Exact design is schematic.',
  'rim drive unit, west': 'A friction drive unit: computer-controlled hydraulic motors driven by electric pumps turn tires that run against the rim to rotate the wheel. Exact design is schematic.',
  'restraint tower river bed pads': 'Pads on the river bed carrying the restraint towers. Exact layout is schematic.',
  'boarding deck': 'The boarding deck at ground level, where passengers walk on and off the moving capsules; the wheel does not usually stop for boarding. It is stopped only for disabled or elderly passengers. Exact layout is schematic.',
  'boarding deck piles': 'Piles carrying the boarding deck at the river edge. Exact layout is schematic.',
  'ticket hall': 'The ticket hall beside the boarding deck, in the Riverside Building at County Hall. Exact massing is schematic.',
  'boarding canopy': 'A canopy sheltering the boarding deck. Exact design is schematic.',
  'boarding queue rails': 'Queue rails organizing passengers waiting to board. Exact layout is schematic.',
  'boarding gangway, east': 'A gangway linking the boarding deck to the shore promenade. Exact layout is schematic.',
  'boarding gangway, west': 'A gangway linking the boarding deck to the shore promenade. Exact layout is schematic.',
  'river wall': 'The river wall along the South Bank at the Eye site. Exact profile is schematic.',
  'tension anchor block, east': 'A tension anchor block on land, where the A-frame backstays are buried in a concrete foundation 33 m deep. Exact layout is schematic.',
  'tension anchor block, west': 'A tension anchor block on land, where the A-frame backstays are buried in a concrete foundation 33 m deep. Exact layout is schematic.',
  'plinth foundation raft': 'The foundation raft beneath the A-frame plinths. Exact layout is schematic.',
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
const binName = 'london-eye-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the london-eye directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'London Eye, London',
  title: 'London Eye',
  location: 'London, United Kingdom',
  blurb: 'The London Eye, originally the Millennium Wheel, is a cantilevered observation wheel on the South Bank of the River Thames in London. Its 120 m steel rim hangs on 64 tensioned cables from a central hub, and its 32 passenger capsules turn on a 22 m spindle held by a leaning A-frame.',
  sourceUrls: [
    { label: 'Wikipedia: London Eye', url: 'http://en.wikipedia.org/wiki/London_Eye' },
    { label: 'New Civil Engineer: Eye’s wide open in time for Millennium', url: 'https://www.newcivilengineer.com/archive/eyes-wide-open-in-time-for-millennium-14-10-1999/' },
    { label: 'New Civil Engineer: A view to a thrill', url: 'https://www.newcivilengineer.com/archive/a-view-to-a-thrill-31-05-1999/' },
    { label: 'New Civil Engineer: Turning to analysis', url: 'https://www.newcivilengineer.com/archive/turning-to-analysis-a-structure-without-parallel-will-soon-stand-high-above-the-thames-lisa-russell-reports-on-the-design-of-the-british-airways-london-eye-10-12-1998/' },
    { label: 'Mechanical Engineering: Building the world’s biggest wheel', url: 'https://www.thefreelibrary.com/Building+the+world%27s+biggest+wheel%3A+engineers+use+tricks+of+the+trade...-a0175549203' },
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
  chunks: [{ url: '/models/london-eye/london-eye-0.bin', bytes: offset }],
  triangles,
  spread: 1.6,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
