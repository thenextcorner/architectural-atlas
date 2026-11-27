import type {Part} from './atlas';

/** Empire State Building pilot: Floors and Tour modes, mirroring the
 * Colosseum pilot (app/colosseum-pilot.ts).
 *
 * Layer names and tour stops use only facts already in
 * stories/empire-state.json. The poster's layer list (Foundation, Lobby,
 * Lower / Mid / Upper floors, Observation decks, Spire and antenna, plus
 * the structural core) is the brief for what the layers should be, not a
 * source of facts: the poster says 22 elevators where the building has
 * 73, so no poster figure enters the Atlas.
 *
 * Layers are vertical strata. The assignment is by system first, then by
 * the part's centre height, so it holds on both variants (Detailed has a
 * crown system; Simple folds the crown into the shaft).
 * Layer 0, Foundations: everything below ground.
 * Layer 1, Lobby and base: the five-story base and the lobby inside it.
 * Layer 2, Lower floors: shaft stages 1 to 3, up to the 0.587 setback.
 * Layer 3, Mid floors: the long stage 4, 0.587 to 1.45.
 * Layer 4, Upper floors: stages 5 to 7, 1.45 to 1.72.
 * Layer 5, Observation decks and crown: the 86th deck, the crown, and
 * the 102nd observatory, 1.72 to 2.063.
 * Layer 6, Spire and mast: the mooring mast and antenna, above 2.063.
 * The tall internal parts (steel frame, elevator banks, utility core)
 * are assigned by centre height like everything else. They read as the
 * structural spine through the gaps when the slices separate: the core
 * tops out at 2.663 at full separation, just below the lifted crown
 * (2.74), so nothing pokes through the layer above it. */
export interface PilotLayer {
  name: string;
  label: string;
  hotspotPart: string;
}

export const EMPIRE_STATE_LAYERS: PilotLayer[] = [
  {name: 'Foundations', label: 'FOUNDATIONS', hotspotPart: ''},
  {name: 'Lobby and base', label: 'LOBBY AND BASE', hotspotPart: 'Bronze narrative motifs'},
  {name: 'Lower floors', label: 'LOWER FLOORS', hotspotPart: 'Tier 1 setback terrace'},
  {name: 'Mid floors', label: 'MID FLOORS', hotspotPart: 'Express elevator bank'},
  {name: 'Upper floors', label: 'UPPER FLOORS', hotspotPart: ''},
  {name: 'Observation decks and crown', label: 'OBSERVATION DECKS', hotspotPart: '86th floor open deck railing'},
  {name: 'Spire and mast', label: 'SPIRE AND MAST', hotspotPart: 'Mooring mast tier one'},
];

/** Tour stops in narrative order: arrive at the Fifth Avenue entry, step
 * into the lobby, ride the express elevators up, read the setback
 * silhouette, stand on the 86th-floor deck, then climb to the mooring
 * mast. Each name matches a hotspot in stories/empire-state.json, so the
 * stop text is the hotspot text. The 103rd-floor balcony and the LED
 * fixture ring stay as hotspot dots in Explode mode; they are not stops. */
export const EMPIRE_STATE_TOUR: string[] = [
  'Concrete entry eagles',
  'Bronze narrative motifs',
  'Aluminum building relief',
  'Express elevator bank',
  'Tier 1 setback terrace',
  '86th floor open deck railing',
  'Mooring mast tier one',
];

export const EMPIRE_STATE_FLOOR_GAP = 0.2;

/** Layer tops for the floor-label anchors and the contact-disc receivers.
 * The bulk top of each layer, measured from the Detailed model: the max
 * top of the layer's parts EXCLUDING the two spine parts that span
 * several layers (Central utility core and High zone local elevators,
 * both centred in the Mid-floors band but topping out at 2.063). With
 * them included the Mid top (2.063) sits above the Upper top (1.74)
 * and the Mid label renders above the Upper label. The other layers'
 * tops are their parts' max tops: Lower 0.607, Upper 1.74, Observation
 * 2.081, Spire 2.4, Lobby and base 0.101, Foundations 0. */
export const EMPIRE_STATE_LAYER_TOPS = [0, 0.101, 0.607, 1.702, 1.74, 2.081, 2.4];

export function empireStateLayer(p: Part): number {
  if (p.system === 'foundations') return 0;
  if (p.system === 'lobby' || p.system === 'base') return 1;
  if (p.system === 'crown') return 5;
  if (p.system === 'mast') return 6;
  const cy = (p.bounds[0][1] + p.bounds[1][1]) / 2;
  if (cy < 0) return 0;
  if (cy < 0.101) return 1;
  if (cy < 0.587) return 2;
  if (cy < 1.45) return 3;
  if (cy < 1.72) return 4;
  if (cy < 2.063) return 5;
  return 6;
}

/** Systems hidden for a tour stop, so an interior subject reads. The
 * lobby stops hide the base (facades, entry, portico), which encloses
 * the lobby shell, AND the steel frame: the low-rise column grid stands
 * in front of the motifs and the relief and hides them behind its
 * columns. The elevator stop hides the whole tower envelope (shaft,
 * terraces, crown, mast, observatories, lighting), leaving the steel
 * frame and elevator banks standing on the base, so the express bank
 * reads as the subject instead of hiding inside the shaft. */
export function empireStateConcealedSystems(stopPart: string): string[] {
  const lower = stopPart.toLowerCase();
  if (lower === 'bronze narrative motifs' || lower === 'aluminum building relief') return ['base', 'steel-frame'];
  if (lower === 'express elevator bank') return ['shaft', 'terraces', 'crown', 'mast', 'observatories', 'lighting'];
  return [];
}

/** Named parts hidden for a tour stop. The lobby shell (floor, ceiling
 * and walls as one part) hides the finishes from any outside angle, so
 * the lobby stops hide it. The motifs stop also hides the upper marble
 * walls: the south wall of that part stands between a camera south of
 * the lobby and the motifs on the north wall. The relief stop keeps the
 * walls (its camera comes through the open east end) but hides the west
 * end escalators, which stand in front of the relief's lower half. */
export function empireStateConcealedParts(stopPart: string): string[] {
  const lower = stopPart.toLowerCase();
  if (lower === 'bronze narrative motifs') return ['Lobby interior volume', 'Light marble upper walls'];
  if (lower === 'aluminum building relief') return ['Lobby interior volume', 'West end escalators'];
  return [];
}
