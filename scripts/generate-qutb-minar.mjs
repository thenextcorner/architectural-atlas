// Procedural Qutb Minar for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Qutb Minar in code and writes
// it in the atlas binary format:
//   public/models/qutb-minar/atlas.json
//   public/models/qutb-minar/qutb-minar-0.bin
//
// Sourced dimensions and facts (verified via web search, opened 2026-10-10):
//   Qutb Minar, Mehrauli, Delhi, India; minaret and victory tower of the
//   Quwwat-ul-Islam mosque; begun 1199 by Qutb-ud-din Aibak (founder of
//   the Mamluk dynasty of the Delhi Sultanate), who completed the first
//   storey; three more storeys added by his successor Shams-ud-din
//   Iltutmish (r. 1211-1236); damaged by lightning; the top storey
//   replaced by two storeys under Firoz Shah Tughlaq (r. 1351-1388);
//   restored by Sikandar Lodi (r. 1489-1517); UNESCO World Heritage 1993.
//   72.5 m (238 ft) high; tapers from 14.32 m diameter at the base to 2.75
//   m at the top; five successive storeys separated by projecting
//   balconies with decorated pendentives; bands of richly carved Quranic
//   inscriptions in Arabic and Nagari scripts on each storey; lowest three
//   storeys of alternating red and buff sandstone, the fourth and fifth of
//   marble and sandstone; the lowest storey has alternating angular and
//   rounded flutings, the second rounded flutings alone, the third angular
//   flutings alone; a Nagari inscription calls it a victory monument
//   (Vijayastambha); originally surmounted by a cupola that fell in an
//   earthquake, replaced by a Mughal-style cupola in the early 19th
//   century, removed in 1848 as incongruous and now standing on the lawns
//   southeast of the minaret.
//   The Iron Pillar in the mosque courtyard: 7.02 m long, 0.93 m below
//   ground, wrought iron, famed for its lack of corrosion; deep cavity at
//   the top may once have held a Garuda image.
//   Quwwat-ul-Islam mosque: built by Aibak with material from 27 demolished
//   Hindu and Jain temples (per the eastern gate inscription); rectangular
//   courtyard with cloisters; high arched prayer-hall screen added in the
//   14th century. Alai Darwaza (1311) by Alauddin Khalji. Tomb of Iltutmish
//   (d. 1235): square plan, arched openings on three sides, mihrab on the
//   fourth, profusely carved.
//   Cultural: the song "Dil Ka Bhanwar Kare Pukar" from Tere Ghar Ke Samne
//   (1963), with Dev Anand and Nutan, shot inside the monument, in all
//   likelihood the first and last song filmed inside before public access
//   to the stairs closed; Aamir Khan as a Delhi tour guide dances in the
//   complex in "Chand Sifarish" from Fanaa (2006); a romantic song from
//   Jannat 2 shot at the monument; the colonial-era travelogue "Delhi"
//   shows the 238-foot tower of victory.
// Schematic (not sourced, never stated as fact in the UI): the division of
// the 72.5 m into storey heights; balcony projection depths and muqarnas
// profiles; inscription band heights and positions; flute counts and
// depths; entrance, plinth and moulding details; Iron Pillar capital form;
// mosque screen arch profiles and cloister layout; Alai Darwaza and tomb
// dimensions; courtyard extent; interior stair (not modeled).
//
// Coordinate frame: x = lateral, z = depth, y = up. All dimensions in
// meters. Radius tapers linearly from 7.16 m at y=0 to 1.375 m at y=72.5.
//
// Granularity: 101 named parts across 8 systems.
//
// Usage: node scripts/generate-qutb-minar.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'qutb-minar');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (72.5 m) maps to 2.4 units.
const S = 2.4 / 72.5;
const H = 72.5;
const R_BASE = 14.32 / 2, R_TOP = 2.75 / 2;
const radiusAt = (y) => R_BASE - ((R_BASE - R_TOP) * y) / H;

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
// Fluted shaft section: cylinder with radial flute modulation between
// y0 and y1. `flutes` = count, `depth` = radial depth, `angular` selects
// triangular (angular) vs sinusoidal (rounded) flutes.
function flutedShaft(y0, y1, flutes, depth, angular) {
  const segs = flutes * 8;
  const g = new THREE.CylinderGeometry(radiusAt(y1), radiusAt(y0), y1 - y0, segs, 4, true);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const f = ((ang / (Math.PI * 2)) * flutes) % 1;
    const m = angular ? Math.abs(f - 0.5) * 2 : (0.5 - 0.5 * Math.cos(f * Math.PI * 2));
    const r = Math.hypot(x, z);
    const nr = r - depth * m;
    pos.setX(i, (x / r) * nr);
    pos.setZ(i, (z / r) * nr);
  }
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Storeys: [name, y0, y1, fluting, material note]
const STOREYS = [
  ['First', 2.5, 22, 'alternating', 'red and buff sandstone'],
  ['Second', 22, 38, 'rounded', 'red and buff sandstone'],
  ['Third', 38, 52, 'angular', 'red and buff sandstone'],
  ['Fourth', 52, 63, 'plain', 'marble and sandstone'],
  ['Fifth', 63, 70.5, 'plain', 'marble and sandstone'],
];
const FLUTE_CONF = {
  alternating: { flutes: 24, depth: 0.28, angular: false },
  rounded: { flutes: 20, depth: 0.24, angular: false },
  angular: { flutes: 20, depth: 0.24, angular: true },
  plain: { flutes: 16, depth: 0.1, angular: false },
};

STOREYS.forEach(([sN, y0, y1], si) => {
  const sn = sN.toLowerCase();
  const fc = FLUTE_CONF[STOREYS[si][3]];
  // Shaft core (inner, plain).
  addPart(`storey-${si + 1}-shaft`, `${sN} storey shaft`, 'storeys', [
    cyl(radiusAt(y1) - 0.3, radiusAt(y0) - 0.3, y1 - y0, 0, (y0 + y1) / 2, 0, 20),
  ]);
  // Fluted outer skin.
  addPart(`storey-${si + 1}-fluting`, `${sN} storey ${STOREYS[si][3]} fluting`, 'fluting', [
    flutedShaft(y0, y1, fc.flutes, fc.depth, fc.angular),
  ]);
  // Facing panels (alternating red/buff on 1-3, marble/sandstone on 4-5).
  addPart(`storey-${si + 1}-facing`, `${sN} storey facing`, 'storeys', [
    cyl(radiusAt(y1) - 0.12, radiusAt(y0) - 0.12, (y1 - y0) * 0.96, 0, (y0 + y1) / 2, 0, 20),
  ]);
  // Inscription bands: Arabic (Quranic) and Nagari.
  const rMid = radiusAt((y0 + y1) / 2);
  addPart(`storey-${si + 1}-arabic-band`, `${sN} storey Arabic inscription band`, 'inscriptions', [
    cyl(rMid + 0.22, rMid + 0.22, 1.6, 0, y0 + (y1 - y0) * 0.68, 0, 24),
  ]);
  addPart(`storey-${si + 1}-nagari-band`, `${sN} storey Nagari inscription band`, 'inscriptions', [
    cyl(rMid + 0.2, rMid + 0.2, 1.1, 0, y0 + (y1 - y0) * 0.3, 0, 24),
  ]);
  // Projecting balcony with muqarnas brackets and railing.
  const by = y1;
  const br = radiusAt(by);
  const balc = [cyl(br + 1.9, br + 1.9, 1.1, 0, by + 0.55, 0, 28)];
  const brackets = [];
  for (let bi = 0; bi < 20; bi++) {
    const ang = (bi / 20) * Math.PI * 2;
    brackets.push(box(
      Math.cos(ang) * (br + 0.4) - 0.35, Math.cos(ang) * (br + 0.4) + 0.35,
      by - 1.6, by + 0.2,
      Math.sin(ang) * (br + 0.4) - 0.35, Math.sin(ang) * (br + 0.4) + 0.35,
    ));
  }
  addPart(`storey-${si + 1}-balcony`, `${sN} storey balcony`, 'balconies', balc);
  addPart(`storey-${si + 1}-balcony-brackets`, `${sN} storey balcony brackets`, 'balconies', brackets);
  addPart(`storey-${si + 1}-balcony-railing`, `${sN} storey balcony railing`, 'balconies', [
    cyl(br + 1.9, br + 1.9, 0.9, 0, by + 1.55, 0, 28),
  ]);
  // Balcony soffit (underside) and mid-storey string course.
  addPart(`storey-${si + 1}-balcony-soffit`, `${sN} storey balcony soffit`, 'balconies', [
    cyl(br + 1.9, br + 0.6, 0.8, 0, by - 0.4, 0, 28),
  ]);
  const my = (y0 + y1) / 2;
  const mr = radiusAt(my);
  addPart(`storey-${si + 1}-string-course`, `${sN} storey string course`, 'storeys', [
    cyl(mr + 0.35, mr + 0.35, 0.7, 0, my, 0, 24),
  ]);
  addPart(`storey-${si + 1}-fluting-cap`, `${sN} storey fluting cap`, 'fluting', [
    cyl(radiusAt(y1) + 0.15, radiusAt(y1) + 0.15, 0.6, 0, y1 - 0.3, 0, 24),
  ]);
});

// --- Base: plinth, mouldings, entrance, steps.
addPart('base-plinth', 'Base plinth', 'base', [
  cyl(R_BASE + 1.2, R_BASE + 2, 2.5, 0, 1.25, 0, 28),
]);
addPart('base-moulding-lower', 'Base lower moulding', 'base', [
  cyl(R_BASE + 0.5, R_BASE + 0.9, 1, 0, 3, 0, 28),
]);
addPart('base-moulding-upper', 'Base upper moulding', 'base', [
  cyl(R_BASE + 0.2, R_BASE + 0.5, 0.8, 0, 3.9, 0, 28),
]);
addPart('entrance-door', 'Entrance door', 'base', [
  box(-1.4, 1.4, 2.5, 7.5, R_BASE - 1.6, R_BASE + 0.4),
]);
addPart('entrance-arch', 'Entrance arch', 'base', [
  cyl(1.7, 1.7, 1.2, 0, 7.8, R_BASE - 0.6, 12, false, 0, Math.PI),
]);
addPart('entrance-steps', 'Entrance steps', 'base', [
  box(-2.5, 2.5, 0, 2.5, R_BASE + 0.4, R_BASE + 4),
]);
addPart('base-foundation-ring', 'Base foundation ring', 'base', [
  cyl(R_BASE + 2.6, R_BASE + 3.2, 1.2, 0, 0.6, 0, 28),
]);

// --- Crown: top pavilion ring, parapet, cupola plinth.
addPart('crown-pavilion-ring', 'Crown pavilion ring', 'crown', [
  cyl(R_TOP + 1.4, R_TOP + 1.4, 1.6, 0, 71.3, 0, 20),
]);
addPart('crown-parapet', 'Crown parapet', 'crown', [
  cyl(R_TOP + 1.4, R_TOP + 1.4, 1, 0, 72.6, 0, 20),
]);
addPart('cupola-plinth', 'Cupola plinth', 'crown', [
  cyl(R_TOP * 0.7, R_TOP + 0.6, 1.2, 0, 71.9, 0, 16),
]);
addPart('summit-flagpole-base', 'Summit flagpole base', 'crown', [
  cyl(0.3, 0.45, 1.5, 0, 73.2, 0, 8),
]);
// The removed 19th-century cupola, now on the lawns southeast.
addPart('cupola-on-lawns', 'Removed cupola on the lawns', 'crown', [
  cyl(1.8, 2.4, 2.2, 28, 1.1, -24, 12),
  new THREE.SphereGeometry(1.9, 12, 8).translate(28, 2.6, -24),
]);

// --- Iron Pillar (7.02 m, 0.93 m below ground).
addPart('iron-pillar-shaft', 'Iron Pillar shaft', 'iron-pillar', [
  cyl(0.21, 0.24, 6.09, -18, 3.5, 20, 12),
]);
addPart('iron-pillar-capital', 'Iron Pillar capital', 'iron-pillar', [
  cyl(0.35, 0.22, 0.8, -18, 6.8, 20, 12),
]);
addPart('iron-pillar-base', 'Iron Pillar base', 'iron-pillar', [
  cyl(0.5, 0.6, 0.9, -18, 0.45, 20, 12),
]);
addPart('iron-pillar-platform', 'Iron Pillar platform', 'iron-pillar', [
  box(-20.5, -15.5, 0, 0.5, 17.5, 22.5),
]);
addPart('iron-pillar-garuda-cavity', 'Iron Pillar Garuda cavity', 'iron-pillar', [
  cyl(0.18, 0.18, 0.5, -18, 7.3, 20, 8),
]);

// --- Quwwat-ul-Islam prayer-hall screen: five arches (forms schematic).
for (let ai = 0; ai < 5; ai++) {
  const ax = -24 + ai * 12;
  addPart(`screen-arch-${ai + 1}`, `Prayer-hall screen arch ${ai + 1}`, 'complex', [
    box(ax - 4.5, ax + 4.5, 0, 14, 30, 32),
    box(ax - 2.2, ax + 2.2, 0, 10, 29.6, 32.4),
  ]);
}
addPart('screen-cornice', 'Prayer-hall screen cornice', 'complex', [
  box(-30, 30, 14, 15.2, 30, 32),
]);
addPart('screen-mihrab', 'Prayer-hall screen mihrab', 'complex', [
  box(-2.5, 2.5, 2, 8, 29.4, 30.6),
]);
addPart('screen-foundation', 'Prayer-hall screen foundation', 'complex', [
  box(-31, 31, -1.2, 0, 29, 33),
]);
addPart('screen-side-wall-east', 'Prayer-hall screen east return', 'complex', [
  box(30, 32, 0, 14, 28, 32),
]);
addPart('screen-side-wall-west', 'Prayer-hall screen west return', 'complex', [
  box(-32, -30, 0, 14, 28, 32),
]);
// Cloister colonnades (schematic).
for (const [cn, cz] of [['north', 44], ['south', 16]]) {
  const cols = [];
  for (let ci = 0; ci < 10; ci++) {
    cols.push(cyl(0.4, 0.5, 4, -27 + ci * 6, 2, cz, 8));
  }
  cols.push(box(-30, 30, 4, 5, cz - 1, cz + 1));
  addPart(`cloister-colonnade-${cn}`, `Cloister colonnade ${cn}`, 'complex', cols);
}
addPart('mosque-courtyard-platform', 'Mosque courtyard platform', 'complex', [
  box(-32, 32, 0, 0.6, 12, 48),
]);

// --- Alai Darwaza (1311): dome, walls, arches (dimensions schematic).
addPart('alai-darwaza-dome', 'Alai Darwaza dome', 'complex', [
  new THREE.SphereGeometry(5.5, 16, 10).translate(44, 12, 20),
  cyl(5.8, 6.2, 2, 44, 10.5, 20, 4),
]);
for (const [dn, dx, dz] of [['north', 0, 1], ['south', 0, -1], ['east', 1, 0], ['west', -1, 0]]) {
  addPart(`alai-darwaza-wall-${dn}`, `Alai Darwaza ${dn} wall`, 'complex', [
    box(44 + (dx !== 0 ? (dx > 0 ? 0 : -8) : -4), 44 + (dx !== 0 ? (dx > 0 ? 8 : 0) : 4), 0, 11.5,
      20 + (dz !== 0 ? (dz > 0 ? 0 : -8) : -4), 20 + (dz !== 0 ? (dz > 0 ? 8 : 0) : 4)),
  ]);
  addPart(`alai-darwaza-arch-${dn}`, `Alai Darwaza ${dn} arch`, 'complex', [
    box(44 - 1.8, 44 + 1.8, 0, 7, 20 - 1 + (dz > 0 ? 8 : dz < 0 ? -8 : 0), 20 + 1 + (dz > 0 ? 8 : dz < 0 ? -8 : 0)),
  ]);
}

// --- Tomb of Iltutmish (d. 1235): square, arches on three sides, mihrab.
addPart('iltutmish-tomb-platform', 'Iltutmish tomb platform', 'complex', [
  box(-52, -38, 0, 1, -34, -20),
]);
for (const [dn, dx, dz] of [['north', 0, 1], ['east', 1, 0], ['west', -1, 0]]) {
  addPart(`iltutmish-tomb-wall-${dn}`, `Iltutmish tomb ${dn} wall`, 'complex', [
    box(-52 + (dx > 0 ? 12.4 : 0), -38 - (dx < 0 ? 12.4 : 0) + (dx === 0 ? 0 : 0), 1, 7,
      -34 + (dz > 0 ? 12.4 : 0), -20 - (dz < 0 ? 12.4 : 0) + (dz === 0 ? 0 : 0)),
  ]);
}
addPart('iltutmish-tomb-mihrab-wall', 'Iltutmish tomb mihrab wall', 'complex', [
  box(-52, -38, 1, 7, -34.6, -33.4),
  box(-46.5, -43.5, 2, 5.5, -34.6, -33),
]);
addPart('iltutmish-tomb-carvings', 'Iltutmish tomb carving band', 'complex', [
  box(-52, -38, 5.5, 6.5, -34, -20),
]);
addPart('iltutmish-tomb-cenotaph', 'Iltutmish tomb cenotaph', 'complex', [
  box(-47, -43, 1, 2.2, -29, -25),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('nagari-band') || id.includes('arabic-band')) return '#5a3a26';
  if (id.includes('fluting') || id.includes('shaft') || id.includes('facing')) {
    if (id.startsWith('storey-4') || id.startsWith('storey-5')) return '#ddd8c8';
    return '#a5502e';
  }
  if (id.includes('balcony')) return '#8a4526';
  if (id.includes('base-') || id.includes('entrance')) return '#93492a';
  if (id.includes('crown') || id.includes('cupola') || id.includes('plinth')) return '#c9bfa8';
  if (id.startsWith('iron-pillar')) return '#4a4a4e';
  if (id.includes('screen-') || id.includes('cloister-') || id.includes('courtyard')) return '#b08a5e';
  if (id.includes('alai-darwaza')) return '#9c5a34';
  if (id.includes('iltutmish')) return '#a06844';
  return '#a5502e';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'storeys', name: 'Tower storeys', color: '#a5502e', description: 'The five tapering storeys: shafts and facing, red and buff sandstone below, marble and sandstone above.' },
  { id: 'fluting', name: 'Fluted skins', color: '#a5502e', description: 'The fluted outer skins: alternating on the first storey, rounded on the second, angular on the third.' },
  { id: 'inscriptions', name: 'Inscription bands', color: '#5a3a26', description: 'Bands of carved Quranic inscriptions in Arabic and Nagari scripts on each storey.' },
  { id: 'balconies', name: 'Balconies', color: '#8a4526', description: 'The five projecting balconies with decorated brackets and railings separating the storeys.' },
  { id: 'base', name: 'Base and entrance', color: '#93492a', description: 'Plinth, mouldings, entrance door, arch and steps.' },
  { id: 'crown', name: 'Crown', color: '#c9bfa8', description: 'The crown pavilion ring, parapet, cupola plinth, and the removed 19th-century cupola on the lawns.' },
  { id: 'iron-pillar', name: 'Iron Pillar', color: '#4a4a4e', description: 'The 7.02 m wrought-iron pillar famed for resisting corrosion.' },
  { id: 'complex', name: 'Qutb complex', color: '#b08a5e', description: 'The Quwwat-ul-Islam prayer-hall screen, cloisters, Alai Darwaza and the tomb of Iltutmish.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
const E = (name, text) => { explanations[name.toLowerCase()] = text; };
const SCHEM = 'Exact form and position are schematic.';
const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
const FLUT = ['alternating angular and rounded', 'rounded', 'angular', 'plain', 'plain'];
const MAT = ['red and buff sandstone', 'red and buff sandstone', 'red and buff sandstone', 'marble and sandstone', 'marble and sandstone'];
for (let si = 0; si < 5; si++) {
  const sN = ORD[si];
  const fk = ['alternating', 'rounded', 'angular', 'plain', 'plain'][si];
  E(`${sN} storey shaft`, `${sN} storey inner shaft of ${MAT[si]}. Storey heights are schematic.`);
  E(`${sN} storey ${fk} fluting`, `${sN} storey outer skin with ${FLUT[si]} fluting. Flute count and depth are schematic.`);
  E(`${sN} storey facing`, `${sN} storey facing panels. ${SCHEM}`);
  E(`${sN} storey Arabic inscription band`, `${sN} storey band of carved Quranic inscriptions in Arabic. Band height is schematic.`);
  E(`${sN} storey Nagari inscription band`, `${sN} storey inscription band in Nagari script, the script that calls the tower a victory monument. Band height is schematic.`);
  E(`${sN} storey balcony`, `Projecting balcony separating the ${sN.toLowerCase()} storey from the next, a defining rhythm of the tower. Projection is schematic.`);
  E(`${sN} storey balcony brackets`, `Decorated brackets (pendentives) carrying the ${sN.toLowerCase()}-storey balcony. ${SCHEM}`);
  E(`${sN} storey balcony railing`, `Railing of the ${sN.toLowerCase()}-storey balcony. ${SCHEM}`);
  E(`${sN} storey balcony soffit`, `Soffit (underside) of the ${sN.toLowerCase()}-storey balcony. ${SCHEM}`);
  E(`${sN} storey string course`, `String course ringing the ${sN.toLowerCase()} storey at mid-height. Position is schematic.`);
  E(`${sN} storey fluting cap`, `Cap where the ${sN.toLowerCase()}-storey fluting meets the balcony. ${SCHEM}`);
}
E('Base plinth', 'The plinth the 72.5 m tower rises from. Exact profile is schematic.');
E('Base lower moulding', 'Lower base moulding. Exact profile is schematic.');
E('Base upper moulding', 'Upper base moulding. Exact profile is schematic.');
E('Entrance door', 'The entrance door at the tower base. Position is schematic.');
E('Entrance arch', 'Arch over the entrance. Form is schematic.');
E('Entrance steps', 'Steps to the entrance. Exact form is schematic.');
E('Base foundation ring', 'Foundation ring under the plinth. Exact form is schematic.');
E('Crown pavilion ring', 'The ring at the 72.5 m summit where the cupola once stood. Exact form is schematic.');
E('Crown parapet', 'Parapet at the summit. Exact form is schematic.');
E('Cupola plinth', 'Plinth that carried the cupola before it fell in an earthquake. Exact form is schematic.');
E('Summit flagpole base', 'Base of the summit flagpole. Exact form is schematic.');
E('Removed cupola on the lawns', 'The early-19th-century Mughal-style replacement cupola, removed in 1848 as incongruous; it stands on the lawns southeast of the minaret. Form is schematic.');
E('Iron Pillar shaft', 'The 7.02 m wrought-iron shaft, 0.93 m of it below ground, famed for barely corroding in 1,600 years.');
E('Iron Pillar capital', 'The pillar capital; its deep cavity may once have held a Garuda image. Form is schematic.');
E('Iron Pillar base', 'The pillar base. Form is schematic.');
E('Iron Pillar platform', 'The platform around the Iron Pillar. Extent is schematic.');
E('Iron Pillar Garuda cavity', 'The deep cavity at the pillar top that may once have held a Garuda image.');
for (let ai = 0; ai < 5; ai++) {
  E(`Prayer-hall screen arch ${ai + 1}`, `Arch ${ai + 1} of the high 14th-century prayer-hall screen. Arch profiles are schematic.`);
}
E('Prayer-hall screen cornice', 'Cornice of the prayer-hall screen. Exact form is schematic.');
E('Prayer-hall screen mihrab', 'The mihrab (prayer niche) of the prayer-hall screen. Exact form is schematic.');
E('Prayer-hall screen foundation', 'Foundation of the prayer-hall screen. Exact form is schematic.');
E('Prayer-hall screen east return', 'East return wall of the screen. Exact form is schematic.');
E('Prayer-hall screen west return', 'West return wall of the screen. Exact form is schematic.');
E('Cloister colonnade north', 'North cloister colonnade of the mosque courtyard, built with pillars from demolished temples. Layout is schematic.');
E('Cloister colonnade south', 'South cloister colonnade of the mosque courtyard. Layout is schematic.');
E('Mosque courtyard platform', 'The mosque courtyard platform. Extent is schematic.');
E('Alai Darwaza dome', 'Dome of the Alai Darwaza gateway (1311). Dimensions are schematic.');
for (const dn of ['north', 'south', 'east', 'west']) {
  const dN = dn[0].toUpperCase() + dn.slice(1);
  E(`Alai Darwaza ${dn} wall`, `${dN} wall of the Alai Darwaza. Dimensions are schematic.`);
  E(`Alai Darwaza ${dn} arch`, `${dN} arch of the Alai Darwaza. Form is schematic.`);
}
E('Iltutmish tomb platform', 'Platform of Iltutmish\'s tomb (d. 1235). Footprint is schematic.');
for (const dn of ['north', 'east', 'west']) {
  const dN = dn[0].toUpperCase() + dn.slice(1);
  E(`Iltutmish tomb ${dn} wall`, `${dN} wall of the tomb with its arched opening. ${SCHEM}`);
}
E('Iltutmish tomb mihrab wall', 'The mihrab (prayer-niche) wall of the tomb. Exact form is schematic.');
E('Iltutmish tomb carving band', 'Band of carved inscriptions and arabesques inside the tomb. Extent is schematic.');
E('Iltutmish tomb cenotaph', 'The cenotaph of Iltutmish. Form is schematic.');

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
const binName = 'qutb-minar-0.bin';
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
  scope: 'Qutb Minar, Delhi',
  title: 'Qutb Minar',
  location: 'Delhi, India',
  blurb: 'The 72.5 m victory tower of the Delhi Sultanate, begun 1199: five fluted storeys of red sandstone and marble with Quranic inscription bands, ringed by the Qutb complex.',
  sourceUrls: [
    { label: 'Wikipedia: Qutb Minar', url: 'https://en.wikipedia.org/wiki/Qutb_Minar' },
    { label: 'Britannica: Qutb Minar', url: 'https://www.britannica.com/topic/qutb-minar' },
    { label: 'UNESCO: Qutb Minar and its Monuments', url: 'https://whc.unesco.org/en/list/233' },
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
  chunks: [{ url: '/models/qutb-minar/qutb-minar-0.bin', bytes: offset }],
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
