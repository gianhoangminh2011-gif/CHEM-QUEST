import {
  buildEducationalReactionRegistry,
  type EducationalReaction,
} from "./EducationalReaction";

const OPENSTAX_SOURCE = {
  title: "Chemistry 2e, Section 4.1: Writing and Balancing Chemical Equations",
  publisher: "OpenStax",
  url: "https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations",
  locator: "Section 4.1: examples of balancing chemical equations",
  accessedAt: "2026-11-24",
  supports: [
    "REACTANTS_PRODUCTS",
    "STOICHIOMETRY",
    "CLASSIFICATION",
  ],
} as const;

/**
 * These are educational candidate records.
 * They deliberately remain REVIEW_REQUIRED until scientific
 * review and PD approval are recorded.
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
      classification: "Combustion",
      sources: [OPENSTAX_SOURCE],
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
      classification: "Decomposition",
      sources: [OPENSTAX_SOURCE],
      status: "REVIEW_REQUIRED",
    },
  ]);

export const EDUCATIONAL_REACTION_REGISTRY =
  buildEducationalReactionRegistry(EDUCATIONAL_REACTION_CANDIDATES);