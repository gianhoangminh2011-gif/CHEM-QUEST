# WP-FC-01 — Formula & Compound Foundation

## Scope

This package introduces the foundational domain layer for chemical
formula parsing and compound records.

It is limited to:

- Chemical formula parsing.
- Element symbol validation against periodic table data.
- Element composition extraction.
- Compound record validation.
- Draft/review/approved/rejected lifecycle states.
- Source and approval metadata requirements.
- Unit tests for parser and registry behavior.

## Files

- `src/game/elements/FormulaCompound.ts`
- `src/game/elements/FormulaCompound.test.ts`
- `src/game/elements/PeriodicTableData.ts`
  - Existing dependency; not modified by this work package.

## Formula Parser

The parser supports:

- Chemical element symbols.
- Positive integer subscripts.
- Nested round-bracket groups.
- Element validation using `PERIODIC_TABLE_DATA`.
- Safe integer overflow checks.
- Maximum formula length of 256 characters.
- Maximum nesting depth of 32 levels.

Examples:

- `H2O`
- `CO2`
- `NaCl`
- `Ca(OH)2`
- `Al2(SO4)3`
- `K4(ON(SO3)2)2`

The parser does not infer:

- Chemical bonds.
- Oxidation states.
- Molecular geometry.
- Physical properties.
- Reaction behavior.

## Compound Lifecycle

Supported compound statuses:

- `DRAFT`
- `REVIEW_REQUIRED`
- `APPROVED`
- `REJECTED`

Every compound requires a source reference.

An approved compound additionally requires:

- `approvedBy`
- `approvalReference`

Only approved records from a valid registry can be returned by
`getApprovedCompoundById`.

## Data Integrity

- Parse results and their nested composition and issue objects are immutable.
- Registry records, source metadata, and registry issues are immutable.
- Duplicate compound IDs are rejected.
- Invalid formulas and missing approval metadata prevent registry validation
  from passing.

## Validation

The following results were reported from local execution:

| Validation | Result |
|---|---|
| `npm test` | PASS — 309/309 tests |
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |

The production build reported a bundle-size warning.
This warning did not cause the build to fail.

These results are based on user-reported local execution and have not been
independently reproduced in this documentation review.

## Integration Status

**WP-FC-01 is reported merged into `main`.**

This work package provides a foundational parser and compound registry.
It does not include:

- Gameplay integration.
- An official compound dataset.
- Chemical reaction simulation.
- Bond or molecular geometry inference.

## Work Package Status

- Scope: Completed.
- Implementation: Completed.
- Local validation: Reported passing.
- Merge: Confirmed by user.
- Release and deployment: Not confirmed.