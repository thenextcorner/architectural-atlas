// Procedural Wat Arun for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Wat Arun (Temple of Dawn) in
// code and writes it in the atlas binary format:
//   public/models/wat-arun/atlas.json
//   public/models/wat-arun/wat-arun-0.bin
//
// Sourced dimensions and facts (verified via web search, opened 2026-10-10):
//   Wat Arun Ratchawararam Ratchawaramahawihan, Buddhist temple on the
//   Thonburi west bank of the Chao Phraya River, Bangkok Yai district,
//   Bangkok, directly across from the Grand Palace and Wat Pho; named for
//   Aruna, the Hindu god of the dawn; locally Wat Chaeng.
//   The temple dates to the Ayutthaya period as Wat Makok; King Taksin
//   renamed it Wat Chaeng when Thonburi was capital (1767-1782) and it
//   briefly housed the Emerald Buddha, moved to Wat Phra Kaew in 1784.
//   The distinctive central prang was built in the early 19th century:
//   begun under Rama II, who renamed the temple Wat Arunratchatharam and
//   enlarged the prang, and finished under Rama III (renovation completed
//   1851); Rama IV gave the present name Wat Arunratchawararam.
//   Central prang: Khmer-style tower, height reported between 66.8 m and
//   86 m across sources (modeled here at 80 m); stands on a high base,
//   flanked by four smaller satellite prangs at the corners; two terraces
//   reached by steep steps; topped with a seven-pronged trident, the
//   Trident of Shiva; encrusted with colorful porcelain mosaics made from
//   broken Chinese porcelain once used as ballast in trading ships, plus
//   Mauritia mauritiana shells; symbolizes Mount Meru, center of the
//   universe, with the five prangs evoking the thirty-three heavens.
//   Around the base: figures of ancient Chinese soldiers and animals. Over
//   the second terrace: four statues of Indra riding Erawan (the
//   three-headed royal elephant). At the riverside: six Chinese-style
//   pavilions of green granite with landing bridges. The Ordination Hall
//   holds the Niramitr Buddha image, said to have been designed by Rama II
//   himself; its ashes rest in the image's base. Two demon guardian
//   figures stand before the hall. Murals inside date from Rama V.
//   Cultural: fight sequence on the steep stairs in Mortal Kombat (2021);
//   sunset silhouette as romantic backdrop in the K-drama King the Land
//   (2023); one of Bangkok's most filmed landmarks.
// Schematic (not sourced, never stated as fact in the UI): the exact 80 m
// figure within the reported 66.8-86 m range; satellite prang heights and
// footprints; terrace heights and step counts; niche, mosaic-band and
// floral-panel placement; statue poses, counts beyond the sourced four
// Indra figures and two demons, and positions; ordination hall footprint
// and roof profile; pavilion footprints; courtyard wall and gate layout;
// chedi forms.
//
// Coordinate frame: x = lateral (river is -x), z = depth, y = up. The
// Chao Phraya flows along -x. All dimensions in meters.
//
// Granularity: 102 named parts across 8 systems.
//
// Usage: node scripts/generate-wat-arun.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'wat-arun');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (80 m prang) maps to 2.4 units.
const S = 2.4 / 80;

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
// Stepped prang tier: square frustum approximated by a tapered box via
// CylinderGeometry with 4 radial segments, rotated 45 degrees.
function tier(wTop, wBot, h, x, y, z) {
  const g = new THREE.CylinderGeometry(wTop / Math.SQRT2, wBot / Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Central prang base: three stepped tiers, 0-8 m (schematic stepping).
addPart('prang-base-tier-1', 'Prang base tier 1', 'central-prang', [
  tier(30, 34, 3, 0, 1.5, 0),
]);
addPart('prang-base-tier-2', 'Prang base tier 2', 'central-prang', [
  tier(26, 30, 2.5, 0, 4.25, 0),
]);
addPart('prang-base-tier-3', 'Prang base tier 3', 'central-prang', [
  tier(22, 26, 2.5, 0, 6.75, 0),
]);

// --- Two terraces at 8 m and 14 m with steep stairs on four sides.
addPart('lower-terrace-deck', 'Lower terrace deck', 'terraces', [
  box(-13, 13, 8, 8.8, -13, 13),
]);
addPart('upper-terrace-deck', 'Upper terrace deck', 'terraces', [
  box(-10, 10, 14, 14.8, -10, 10),
]);
for (const [dn, dx, dz] of [['north', 0, 1], ['south', 0, -1], ['east', 1, 0], ['west', -1, 0]]) {
  const steps = [];
  for (let s = 0; s < 6; s++) {
    const t = s / 6;
    steps.push(box(
      dx !== 0 ? (dx > 0 ? 13 + s * 1.1 : -13 - (s + 1) * 1.1) : -1.6,
      dx !== 0 ? (dx > 0 ? 13 + (s + 1) * 1.1 : -13 - s * 1.1) : 1.6,
      8 - (s + 1) * 1.35, 8 - s * 1.35,
      dz !== 0 ? (dz > 0 ? 13 + s * 1.1 : -13 - (s + 1) * 1.1) : -1.6,
      dz !== 0 ? (dz > 0 ? 13 + (s + 1) * 1.1 : -13 - s * 1.1) : 1.6,
    ));
  }
  addPart(`lower-terrace-stair-${dn}`, `Lower terrace ${dn} stair`, 'terraces', steps);
}
for (const [dn, dx, dz] of [['north', 0, 1], ['south', 0, -1], ['east', 1, 0], ['west', -1, 0]]) {
  const steps = [];
  for (let s = 0; s < 5; s++) {
    steps.push(box(
      dx !== 0 ? (dx > 0 ? 10 + s * 0.9 : -10 - (s + 1) * 0.9) : -1.4,
      dx !== 0 ? (dx > 0 ? 10 + (s + 1) * 0.9 : -10 - s * 0.9) : 1.4,
      14 - (s + 1) * 1.25, 14 - s * 1.25,
      dz !== 0 ? (dz > 0 ? 10 + s * 0.9 : -10 - (s + 1) * 0.9) : -1.4,
      dz !== 0 ? (dz > 0 ? 10 + (s + 1) * 0.9 : -10 - s * 0.9) : 1.4,
    ));
  }
  addPart(`upper-terrace-stair-${dn}`, `Upper terrace ${dn} stair`, 'terraces', steps);
}
// Terrace balustrades (schematic).
for (const [tn, ty, tw] of [['lower', 8.8, 13], ['upper', 14.8, 10]]) {
  for (const [dn, dx, dz] of [['north', 0, 1], ['south', 0, -1], ['east', 1, 0], ['west', -1, 0]]) {
    addPart(`${tn}-terrace-balustrade-${dn}`, `${tn === 'lower' ? 'Lower' : 'Upper'} terrace ${dn} balustrade`, 'terraces', [
      box(
        dx !== 0 ? (dx > 0 ? tw - 0.5 : -tw) : -tw,
        dx !== 0 ? (dx > 0 ? tw : -tw + 0.5) : tw,
        ty, ty + 1.1,
        dz !== 0 ? (dz > 0 ? tw - 0.5 : -tw) : -tw,
        dz !== 0 ? (dz > 0 ? tw : -tw + 0.5) : tw,
      ),
    ]);
  }
}

// --- Central tower: six receding Khmer tiers, 14.8-72 m (schematic profile).
const TIER_W = [19, 16.5, 14, 11.5, 9, 6.5];
for (let ti = 0; ti < 6; ti++) {
  const y0 = 14.8 + ti * 9.5;
  addPart(`prang-tower-tier-${ti + 1}`, `Prang tower tier ${ti + 1}`, 'central-prang', [
    tier(TIER_W[ti] * 0.82, TIER_W[ti], 9.5, 0, y0 + 4.75, 0),
  ]);
}
// Niches on four faces (schematic placement).
for (const [dn, dx, dz] of [['north', 0, 1], ['south', 0, -1], ['east', 1, 0], ['west', -1, 0]]) {
  addPart(`prang-niche-${dn}`, `Prang ${dn} niche`, 'central-prang', [
    box(
      dx !== 0 ? (dx > 0 ? 7.2 : -8.2) : -1.5,
      dx !== 0 ? (dx > 0 ? 8.2 : -7.2) : 1.5,
      30, 38,
      dz !== 0 ? (dz > 0 ? 7.2 : -8.2) : -1.5,
      dz !== 0 ? (dz > 0 ? 8.2 : -7.2) : 1.5,
    ),
  ]);
}
// Lotus-bud crown and seven-pronged trident.
addPart('prang-lotus-crown', 'Prang lotus-bud crown', 'central-prang', [
  tier(1.2, 6.5, 5, 0, 74.3, 0),
  new THREE.SphereGeometry(1.4, 10, 8).translate(0, 77.2, 0),
]);
{
  const shaft = cyl(0.35, 0.5, 4, 0, 79, 0, 8);
  const prongs = [shaft];
  for (let pi = 0; pi < 7; pi++) {
    const ang = (pi / 7) * Math.PI * 2;
    const prong = cyl(0.12, 0.2, 3.2, Math.cos(ang) * 0.9, 82, Math.sin(ang) * 0.9, 6);
    prongs.push(prong);
  }
  addPart('trident-of-shiva', 'Trident of Shiva', 'central-prang', prongs);
}
addPart('prang-entrance-door', 'Prang entrance door', 'central-prang', [
  box(-1.8, 1.8, 8.8, 14, 10.8, 11.6),
]);

// --- Four satellite prangs at the corners (heights schematic).
const SAT_NAMES = { northeast: 'Northeast', northwest: 'Northwest', southeast: 'Southeast', southwest: 'Southwest' };
for (const [sn, sx, sz] of [['northeast', 24, 24], ['northwest', -24, 24], ['southeast', 24, -24], ['southwest', -24, -24]]) {
  const sN = SAT_NAMES[sn];
  addPart(`${sn}-satellite-base`, `${sN} satellite base`, 'satellite-prangs', [
    tier(9, 11, 3, sx, 1.5, sz),
  ]);
  addPart(`${sn}-satellite-tower`, `${sN} satellite tower`, 'satellite-prangs', [
    tier(3.5, 8, 11, sx, 8.5, sz),
  ]);
  addPart(`${sn}-satellite-crown`, `${sN} satellite crown`, 'satellite-prangs', [
    tier(0.8, 3.5, 3, sx, 15.5, sz),
  ]);
  addPart(`${sn}-satellite-finial`, `${sN} satellite finial`, 'satellite-prangs', [
    cyl(0.15, 0.3, 2.5, sx, 18, sz, 8),
  ]);
  addPart(`${sn}-satellite-niche`, `${sN} satellite niche`, 'satellite-prangs', [
    box(sx - 1, sx + 1, 5, 9, sz + 3.8, sz + 4.4),
  ]);
}

// --- Statues: four Indra-on-Erawan over the upper terrace (sourced count),
// Chinese figures at the base, two demon guardians at the hall.
for (let ii = 0; ii < 4; ii++) {
  const ang = (ii / 4) * Math.PI * 2 + Math.PI / 4;
  const ix = Math.cos(ang) * 8.5, iz = Math.sin(ang) * 8.5;
  const body = box(ix - 1.6, ix + 1.6, 14.8, 17.2, iz - 1, iz + 1);
  const heads = [];
  for (const hx of [-0.9, 0, 0.9]) {
    const h = new THREE.SphereGeometry(0.55, 8, 6);
    h.translate(ix + hx, 17.9, iz);
    heads.push(h);
  }
  const rider = cyl(0.4, 0.6, 1.8, ix, 18.6, iz, 8);
  addPart(`indra-erawan-${ii + 1}`, `Indra on Erawan ${ii + 1}`, 'statues', [body, ...heads, rider]);
}
for (let ci = 0; ci < 4; ci++) {
  const ang = (ci / 4) * Math.PI * 2;
  const cx = Math.cos(ang) * 15, cz = Math.sin(ang) * 15;
  addPart(`chinese-figure-${ci + 1}`, `Chinese stone figure ${ci + 1}`, 'statues', [
    cyl(0.5, 0.7, 2.6, cx, 1.3, cz, 8),
    new THREE.SphereGeometry(0.45, 8, 6).translate(cx, 3, cz),
  ]);
}
for (const [dn, dx] of [['east', 1], ['west', -1]]) {
  addPart(`demon-guardian-${dn}`, `${dn === 'east' ? 'East' : 'West'} demon guardian`, 'statues', [
    box(dx * 8 - 1, dx * 8 + 1, 0, 4.5, 34, 36),
    new THREE.SphereGeometry(0.9, 8, 6).translate(dx * 8, 5.2, 35),
  ]);
}
addPart('niramitr-buddha', 'Niramitr Buddha', 'statues', [
  cyl(1.2, 1.6, 0.8, 0, 0.4, 44, 12),
  cyl(0.9, 1.1, 2.2, 0, 1.9, 44, 10),
  new THREE.SphereGeometry(0.7, 10, 8).translate(0, 3.4, 44),
]);

// --- Porcelain mosaic bands and floral panels (placement schematic).
for (let mi = 0; mi < 5; mi++) {
  const y0 = 16 + mi * 11;
  addPart(`mosaic-band-${mi + 1}`, `Porcelain mosaic band ${mi + 1}`, 'mosaics', [
    tier(TIER_W[mi] * 0.84 + 0.3, TIER_W[mi] + 0.3, 2.2, 0, y0, 0),
  ]);
}
for (const [dn, dx, dz] of [['north', 0, 1], ['south', 0, -1], ['east', 1, 0], ['west', -1, 0]]) {
  addPart(`mosaic-floral-panel-${dn}`, `Floral mosaic panel ${dn}`, 'mosaics', [
    box(
      dx !== 0 ? (dx > 0 ? 4.4 : -5.2) : -2.5,
      dx !== 0 ? (dx > 0 ? 5.2 : -4.4) : 2.5,
      18, 26,
      dz !== 0 ? (dz > 0 ? 4.4 : -5.2) : -2.5,
      dz !== 0 ? (dz > 0 ? 5.2 : -4.4) : 2.5,
    ),
  ]);
}

// --- Ordination Hall (bot): base, walls, two roof tiers, spire, door.
addPart('bot-platform', 'Ordination hall platform', 'ordination-hall', [
  box(-14, 14, 0, 1.5, 36, 58),
]);
addPart('bot-walls', 'Ordination hall walls', 'ordination-hall', [
  box(-11, 11, 1.5, 7.5, 38, 56),
]);
addPart('bot-roof-tier-1', 'Ordination hall lower roof', 'ordination-hall', [
  tier(13, 15, 3, 0, 9, 47),
]);
addPart('bot-roof-tier-2', 'Ordination hall upper roof', 'ordination-hall', [
  tier(7, 12, 3, 0, 12, 47),
]);
addPart('bot-spire', 'Ordination hall spire', 'ordination-hall', [
  tier(0.5, 6, 4, 0, 15.5, 47),
  cyl(0.15, 0.3, 2, 0, 18.5, 47, 8),
]);
addPart('bot-door', 'Ordination hall door', 'ordination-hall', [
  box(-2, 2, 1.5, 5.5, 55.6, 56.4),
]);
addPart('bot-ceramic-trim', 'Ordination hall ceramic trim', 'ordination-hall', [
  box(-11.4, 11.4, 6.8, 7.6, 37.6, 56.4),
]);

// --- Six riverside pavilions, Chinese style, green granite (forms schematic).
for (let pi = 0; pi < 6; pi++) {
  const px = -50 + pi * 20;
  addPart(`riverside-pavilion-${pi + 1}-base`, `Riverside pavilion ${pi + 1} base`, 'pavilions', [
    box(px - 3, px + 3, 0, 3.5, -46, -40),
  ]);
  addPart(`riverside-pavilion-${pi + 1}-roof`, `Riverside pavilion ${pi + 1} roof`, 'pavilions', [
    tier(0.8, 8, 2.5, px, 4.75, -43),
  ]);
}

// --- Courtyard walls, gates and two chedis (layout schematic).
addPart('courtyard-wall-north', 'Courtyard wall north', 'courtyard', [
  box(-60, 60, 0, 3, 62, 63),
]);
addPart('courtyard-wall-south', 'Courtyard wall south', 'courtyard', [
  box(-60, 60, 0, 3, -64, -63),
]);
addPart('courtyard-wall-east', 'Courtyard wall east', 'courtyard', [
  box(60, 61, 0, 3, -63, 62),
]);
addPart('courtyard-wall-west', 'Courtyard wall west', 'courtyard', [
  box(-61, -60, 0, 3, -63, 62),
]);
addPart('courtyard-gate-east', 'Courtyard east gate', 'courtyard', [
  box(59, 62, 0, 5, -2, 2),
  tier(0.5, 3.5, 2, 60.5, 6, 0),
]);
addPart('courtyard-gate-west', 'Courtyard west gate', 'courtyard', [
  box(-62, -59, 0, 5, -2, 2),
  tier(0.5, 3.5, 2, -60.5, 6, 0),
]);
for (const [cn, cx] of [[1, -40], [2, 40]]) {
  addPart(`courtyard-chedi-${cn}`, `Courtyard chedi ${cn}`, 'courtyard', [
    tier(4, 6, 2, cx, 1, 30),
    tier(1.5, 4, 5, cx, 4.5, 30),
    cyl(0.1, 0.25, 2.5, cx, 8, 30, 8),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('mosaic-')) return '#7fb3c8';
  if (id === 'trident-of-shiva') return '#b8963e';
  if (id.includes('lotus-crown')) return '#d9cfae';
  if (id.startsWith('indra-')) return '#c9bfa0';
  if (id.startsWith('chinese-figure')) return '#8a938a';
  if (id.startsWith('demon-guardian')) return '#5d6e7a';
  if (id === 'niramitr-buddha') return '#c9a227';
  if (id.startsWith('bot-')) return '#b0714f';
  if (id === 'bot-ceramic-trim' || id === 'bot-spire') return '#7fb3c8';
  if (id.startsWith('riverside-pavilion')) return '#6f8f7a';
  if (id.startsWith('courtyard-chedi')) return '#d9cfae';
  if (id.startsWith('prang-') || id.startsWith('northeast-satellite') || id.startsWith('northwest-satellite') || id.startsWith('southeast-satellite') || id.startsWith('southwest-satellite')) return '#e3d9bd';
  return '#ded3b8';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'central-prang', name: 'Central prang', color: '#e3d9bd', description: 'The Khmer-style central tower: stepped base, six receding tiers, niches, lotus-bud crown and the seven-pronged Trident of Shiva.' },
  { id: 'satellite-prangs', name: 'Satellite prangs', color: '#e3d9bd', description: 'The four smaller prangs at the corners of the central tower.' },
  { id: 'terraces', name: 'Terraces and stairs', color: '#d5c9a8', description: 'The two terraces with their steep stairs and balustrades.' },
  { id: 'statues', name: 'Statues and figures', color: '#c9bfa0', description: 'Indra on Erawan, Chinese stone figures, demon guardians and the Niramitr Buddha.' },
  { id: 'mosaics', name: 'Porcelain mosaics', color: '#7fb3c8', description: 'Bands and floral panels standing in for the Chinese porcelain mosaic skin.' },
  { id: 'ordination-hall', name: 'Ordination Hall', color: '#b0714f', description: 'The bot with the Niramitr Buddha: platform, walls, roof tiers, spire and ceramic trim.' },
  { id: 'pavilions', name: 'Riverside pavilions', color: '#6f8f7a', description: 'The six Chinese-style green-granite pavilions at the riverside.' },
  { id: 'courtyard', name: 'Courtyard', color: '#ded3b8', description: 'Courtyard walls, gates and chedis.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
const E = (name, text) => { explanations[name.toLowerCase()] = text; };
const SCHEM = 'Exact form and position are schematic.';
E('Prang base tier 1', 'Lowest stepped tier of the prang base. Stepping is schematic.');
E('Prang base tier 2', 'Middle stepped tier of the prang base. Stepping is schematic.');
E('Prang base tier 3', 'Upper stepped tier of the prang base. Stepping is schematic.');
E('Lower terrace deck', 'The lower terrace at the prang base, reached by steep stairs. Height is schematic.');
E('Upper terrace deck', 'The upper terrace below the tower proper. Height is schematic.');
for (const dn of ['north', 'south', 'east', 'west']) {
  const dN = dn[0].toUpperCase() + dn.slice(1);
  E(`Lower terrace ${dn} stair`, `Steep ${dn} stair to the lower terrace, the kind used for the Mortal Kombat (2021) fight sequence. Step count is schematic.`);
  E(`Upper terrace ${dn} stair`, `Steep ${dn} stair to the upper terrace. Step count is schematic.`);
  E(`Lower terrace ${dn} balustrade`, `${dN} balustrade of the lower terrace. ${SCHEM}`);
  E(`Upper terrace ${dn} balustrade`, `${dN} balustrade of the upper terrace. ${SCHEM}`);
  E(`Prang ${dn} niche`, `${dN} niche in the prang tower. Placement is schematic.`);
  E(`Floral mosaic panel ${dn}`, `${dN} floral panel standing in for the porcelain mosaic skin made from Chinese ballast porcelain. Placement is schematic.`);
}
for (let ti = 0; ti < 6; ti++) {
  E(`Prang tower tier ${ti + 1}`, `Receding Khmer tier ${ti + 1} of the central tower. The profile is schematic; sources report the prang between 66.8 m and 86 m high.`);
}
E('Prang lotus-bud crown', 'The lotus-bud crown closing the tower. Exact form is schematic.');
E('Trident of Shiva', 'The seven-pronged trident crowning the prang, the Trident of Shiva. Prong arrangement is schematic.');
E('Prang entrance door', 'Entrance door at the prang base. Position is schematic.');
const SATN = { northeast: 'Northeast', northwest: 'Northwest', southeast: 'Southeast', southwest: 'Southwest' };
for (const sN of ['Northeast', 'Northwest', 'Southeast', 'Southwest']) {
  E(`${sN} satellite base`, `${sN} satellite prang base. Height is schematic.`);
  E(`${sN} satellite tower`, `${sN} satellite prang tower. Height is schematic.`);
  E(`${sN} satellite crown`, `${sN} satellite prang crown. ${SCHEM}`);
  E(`${sN} satellite finial`, `${sN} satellite prang finial. ${SCHEM}`);
  E(`${sN} satellite niche`, `${sN} satellite prang niche. Placement is schematic.`);
}
for (let ii = 0; ii < 4; ii++) {
  E(`Indra on Erawan ${ii + 1}`, `Indra, god of lightning and cloud, riding the three-headed royal elephant Erawan above the upper terrace. Pose is schematic.`);
}
for (let ci = 0; ci < 4; ci++) {
  E(`Chinese stone figure ${ci + 1}`, `One of the ancient Chinese soldier and animal figures around the prang base. Count and poses are schematic.`);
}
E('East demon guardian', 'Demon temple guardian before the Ordination Hall. Pose is schematic.');
E('West demon guardian', 'Demon temple guardian before the Ordination Hall. Pose is schematic.');
E('Niramitr Buddha', 'The Niramitr Buddha of the Ordination Hall, said to have been designed by Rama II himself; his ashes rest in the image\'s base. Figure is schematic.');
for (let mi = 0; mi < 5; mi++) {
  E(`Porcelain mosaic band ${mi + 1}`, `Mosaic band ${mi + 1} standing in for the porcelain skin of Chinese ballast porcelain and shells. Placement is schematic.`);
}
E('Ordination hall platform', 'Platform of the Ordination Hall. Footprint is schematic.');
E('Ordination hall walls', 'Walls of the Ordination Hall. Footprint is schematic.');
E('Ordination hall lower roof', 'Lower tiled roof tier of the hall. Profile is schematic.');
E('Ordination hall upper roof', 'Upper tiled roof tier of the hall. Profile is schematic.');
E('Ordination hall spire', 'Central spire of the hall roof. Form is schematic.');
E('Ordination hall door', 'Entrance door of the hall. Position is schematic.');
E('Ordination hall ceramic trim', 'Colored ceramic and stucco trim of the hall. Extent is schematic.');
for (let pi = 0; pi < 6; pi++) {
  E(`Riverside pavilion ${pi + 1} base`, `Green-granite base of riverside pavilion ${pi + 1}. Form is schematic.`);
  E(`Riverside pavilion ${pi + 1} roof`, `Roof of riverside pavilion ${pi + 1}. Form is schematic.`);
}
E('Courtyard wall north', 'North courtyard wall. Layout is schematic.');
E('Courtyard wall south', 'South courtyard wall. Layout is schematic.');
E('Courtyard wall east', 'East courtyard wall. Layout is schematic.');
E('Courtyard wall west', 'West courtyard wall. Layout is schematic.');
E('Courtyard east gate', 'East courtyard gate. Form is schematic.');
E('Courtyard west gate', 'West courtyard gate. Form is schematic.');
E('Courtyard chedi 1', 'A courtyard chedi. Form is schematic.');
E('Courtyard chedi 2', 'A courtyard chedi. Form is schematic.');

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
const binName = 'wat-arun-0.bin';
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
  scope: 'Wat Arun, Bangkok',
  title: 'Wat Arun',
  location: 'Bangkok, Thailand',
  blurb: 'The Temple of Dawn on the Chao Phraya: an 80 m Khmer-style central prang skinned in Chinese porcelain mosaics, ringed by four satellite prangs, terraces, and riverside pavilions.',
  sourceUrls: [
    { label: 'Wikipedia: Wat Arun', url: 'https://en.wikipedia.org/wiki/Wat_Arun' },
    { label: 'Tourism Authority of Thailand: Wat Arun', url: 'https://www.tourismthailand.org/Attraction/wat-arun-temple-of-dawn' },
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
  chunks: [{ url: '/models/wat-arun/wat-arun-0.bin', bytes: offset }],
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
