
export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'reactive-nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanoid'
  | 'actinoid'
  | 'unknown';

export interface ChemicalElement {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicWeight: string;
  group: number | null;
  period: number;
  category: ElementCategory;
}
