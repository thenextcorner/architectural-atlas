import type {Part} from './atlas';
import {COLOSSEUM_LAYERS, COLOSSEUM_TOUR, colosseumLayer, FLOOR_GAP} from './colosseum-pilot';
import {EMPIRE_STATE_LAYERS, EMPIRE_STATE_TOUR, empireStateLayer, EMPIRE_STATE_FLOOR_GAP, EMPIRE_STATE_LAYER_TOPS, empireStateConcealedSystems, empireStateConcealedParts} from './empire-state-pilot';

/** A building with Floors and Tour modes. The Colosseum was the first
 * pilot; the Empire State Building is the second. Every other building
 * has no pilot and keeps Explode only. */
export interface PilotLayer {
  name: string;
  label: string;
  hotspotPart: string;
}

export interface Pilot {
  slug: string;
  layers: PilotLayer[];
  tour: string[];
  floorGap: number;
  layerOf(p: Part): number;
  /** Systems that are not a floor and stay hidden in Floors mode. */
  floorsHiddenSystems: string[];
  /** Systems hidden for a tour stop, so an interior subject reads. */
  concealedSystems(stopPart: string): string[];
  /** Named parts hidden for a tour stop. */
  concealedParts(stopPart: string): string[];
  /** Optional explicit layer tops (model units, one per layer, lowest to
   * highest). When present the scene uses these for the floor-label
   * anchors and the contact-disc receivers instead of the max part top
   * per layer. Needed when tall spine parts span several layers: the
   * Empire State's central utility core and high-zone elevator bank are
   * centred in the Mid-floors band but top out at 2.063, so the computed
   * Mid top would sit above the Upper top and the labels would swap.
   * The Colosseum has no spanning parts and omits this. */
  layerTops?: number[];
  /** Optional Floors-mode aim offset override (world units): the base
   * offset and the extra offset at full separation. Defaults to the
   * Colosseum values (0.28 base, 0.38 slope). The Empire State stack is
   * taller and the camera farther, so the same offset lifts it fewer
   * pixels and the Foundations label lands on the caption pill. */
  floorsAim?: {base: number; slope: number};
  /** Optional Floors-mode bottom reserve override (pixels, desktop).
   * Defaults to 430. The Empire State stack is a tall thin needle, so
   * fitting it into the Colosseum reserve leaves it small; 320 gives
   * the stack about a third more height while the aim offset keeps the
   * Foundations label clear of the caption pill. */
  floorsReservedH?: number;
  /** Optional Floors-mode camera pull-back curve: maps the separation
   * amount (0 to 1) to the fit extent (0 to 1) that lerps the camera
   * from the assembled distance to the full-stack distance. Defaults to
   * the Colosseum curve, (amount - 0.3) / 0.7, which only starts pulling
   * back at 0.3. The Empire State stack is tall, so at mid separation
   * the camera has barely pulled back while the stack has already grown
   * most of its height: the Spire label clips off the top and the
   * Foundations label lands on the caption pill. The square root pulls
   * back from the start, so the stack fits at every separation. The
   * Colosseum omits this and keeps its curve. */
  floorsExtent?: (amount: number) => number;
}

const COLOSSEUM_PILOT: Pilot = {
  slug: 'colosseum',
  layers: COLOSSEUM_LAYERS,
  tour: COLOSSEUM_TOUR,
  floorGap: FLOOR_GAP,
  layerOf: colosseumLayer,
  floorsHiddenSystems: ['ruin', 'materials'],
  concealedSystems: () => [],
  concealedParts: () => [],
};

const EMPIRE_STATE_PILOT: Pilot = {
  slug: 'empire-state',
  layers: EMPIRE_STATE_LAYERS,
  tour: EMPIRE_STATE_TOUR,
  floorGap: EMPIRE_STATE_FLOOR_GAP,
  layerOf: empireStateLayer,
  floorsHiddenSystems: [],
  concealedSystems: empireStateConcealedSystems,
  concealedParts: empireStateConcealedParts,
  layerTops: EMPIRE_STATE_LAYER_TOPS,
  floorsAim: {base: 0.28, slope: 0.7},
  floorsReservedH: 320,
  floorsExtent: (a) => Math.sqrt(Math.max(0, Math.min(1, a))),
};

const PILOTS: Record<string, Pilot> = {
  colosseum: COLOSSEUM_PILOT,
  'empire-state': EMPIRE_STATE_PILOT,
};

export function getPilot(slug: string): Pilot | null {
  return PILOTS[slug] ?? null;
}
