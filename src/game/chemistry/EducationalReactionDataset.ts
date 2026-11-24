import {
  buildEducationalReactionRegistry,
  type EducationalReaction,
} from "./EducationalReaction";

const OPENSTAX_METHANE_SOURCE = {
  title: "Chemistry 2e, Section 4.1: Writing and Balancing Chemical Equations",
  publisher: "OpenStax",
  url: "https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations",
  locator:
    "Section 4.1, opening methane example: Figure 4.2 and the balanced equation CH4 + 2O2 -> CO2 + 2H2O",
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
    "Section 4.1, balancing equations example: decomposition of water and final balanced equation 2H2O -> 2H2 + O2",
  accessedAt: "2026-11-24",
  supports: [
    "REACTANTS_PRODUCTS",
    "STOICHIOMETRY",
  ],
} as const;

/**
 * These are educational candidate records.
 * They deliberately remain REVIEW_REQUIRED until scientific
 * review and PD approval are recorded.
 *
 * Source claims are limited to the evidence explicitly identified
 * by each source locator. Reaction classification is not claimed
 * as source-supported by this dataset.
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