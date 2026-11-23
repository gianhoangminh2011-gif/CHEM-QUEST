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

- `src/game/chemistry/FormulaCompound.ts`
- `src/game/chemistry/FormulaCompound.test.ts`

## Formula parser

The parser supports:

- Element symbols.
- Positive integer subscripts.
- Nested round-bracket groups.
- Element validation using `PERIODIC_TABLE_DATA`.
- Safe integer overflow checks.

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

## Compound lifecycle

Compound statuses:

- `DRAFT`
- `REVIEW_REQUIRED`
- `APPROVED`
- `REJECTED`

Every compound requires a source reference.

An approved compound additionally requires:

- `approvedBy`
- `approvalReference`

Only approved records can be returned by
`getApprovedCompoundById`.

## Validation

The standalone source was checked with strict TypeScript settings.

Runtime smoke tests were executed against a temporary periodic-table
fixture.

Vitest, full repository typecheck, and production build have not yet
been executed in the target repository environment.

## Integration notes

This package has not been merged into the target repository.

No commit, push, merge, release, or deployment was performed.

No official compound dataset is included.