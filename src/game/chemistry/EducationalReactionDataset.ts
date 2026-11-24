
import {
  buildEducationalReactionRegistry,
  type EducationalReaction,
} from "./EducationalReaction";

const OPENSTAX_METHANE_SOURCE = {
  title: "Chemistry 2e, Section 4.1: Writing and Balancing Chemical Equations",
  publisher: "OpenStax",
  url: "https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations",
  locator:
    "Opening example: methane and oxygen produce carbon dioxide and water; equation CH4 + 2O2 -> CO2 + 2H2O",
  accessedAt: "2026-11-24",
  supports: [
    "REACTANTS_PRODUCTS",
    "STOICHIOMETRY",
  ],
} as const;

const OPENSTAX_WATER_SOURCE = {
  title: "Chemistry 2e, Section 4.1: Writing and Balancing Chemical Equations",
  publisher: "OpenStax",
  url: "https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations",
  locator:
    "Water decomposition example: equations 4.3–4.5, 2H2O -> 2H2 + O2",
  accessedAt: "2026-11-24",
  supports: [
    "REACTANTS_PRODUCTS",
    "STOICHIOMETRY",
  ],
} as const;

/**
 * Educational candidates remain REVIEW_REQUIRED.
 * Source metadata records the specific section or example
 * supporting the reaction and its stoichiometry.
 */
export const EDUCATIONAL_REACTION_CANDIDATES: readonly EducationalReaction[] =
  Object.freeze([
    {
      id: "methane-combustion",
      name: "Combustion of methane",
      reactants: [
        { formula: "CH4", coefficient: 1 },
        { formula: "O2", coefficient: 2 },
      ],
      products: [
        { formula: "CO2", coefficient: 1 },
        { formula: "H2O", coefficient: 2 },
      ],
      sources: [OPENSTAX_METHANE_SOURCE],
      status: "REVIEW_REQUIRED",
    },
    {
      id: "water-decomposition",
      name: "Decomposition of water",
      reactants: [
        { formula: "H2O", coefficient: 2 },
      ],
      products: [
        { formula: "H2", coefficient: 2 },
        { formula: "O2", coefficient: 1 },
      ],
      sources: [OPENSTAX_WATER_SOURCE],
      status: "REVIEW_REQUIRED",
    },
  ]);

export const EDUCATIONAL_REACTION_REGISTRY =
  buildEducationalReactionRegistry(EDUCATIONAL_REACTION_CANDIDATES);
