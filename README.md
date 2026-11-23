CHEM QUEST

A Chemistry Learning Adventure

CHEM QUEST is an educational chemistry game designed to make learning chemistry more engaging through interactive gameplay, challenges, and progression.

---

Project Overview

CHEM QUEST combines chemistry knowledge with game mechanics to create an interactive learning experience.

The project's core development areas include:

- Periodic table and element data.
- Chemical formula parsing.
- Compound records and validation.
- Inventory and crafting systems.
- Quests, challenges, and progression.
- Interactive learning experiences.

Core Features

1. Periodic Table

Provides structured element data for use throughout the game.

2. Formula Parsing

Supports chemical formula parsing, element validation, and element composition extraction.

Supported examples:

- "H2O"
- "CO2"
- "NaCl"
- "Ca(OH)2"
- "Al2(SO4)3"

3. Compound Registry

Manages compound records and their validation lifecycle.

Supported statuses:

- "DRAFT"
- "REVIEW_REQUIRED"
- "APPROVED"
- "REJECTED"

Each compound requires a source reference. Approved compounds additionally require approval metadata.

4. Gameplay Systems

The project also includes development work on inventory, crafting, quests, and other gameplay systems.

Feature availability depends on the current implementation status.

---

WP-FC-01 — Formula & Compound Foundation

Status: Implementation completed; merge into "main" confirmed by the project owner.

This work package establishes the foundational domain layer for chemical formula parsing and compound records.

Scope

- Chemical formula parsing.
- Element symbol validation against periodic table data.
- Element composition extraction.
- Compound record validation.
- Draft, review, approved, and rejected lifecycle states.
- Source and approval metadata requirements.
- Unit tests for parser and registry behavior.

Files

File| Description
"src/game/elements/FormulaCompound.ts"| Formula parsing and compound domain logic
"src/game/elements/FormulaCompound.test.ts"| Parser and registry tests
"src/game/elements/PeriodicTableData.ts"| Existing dependency; not modified

Parser Capabilities

The parser supports:

- Chemical element symbols.
- Positive integer subscripts.
- Nested round-bracket groups.
- Element validation using "PERIODIC_TABLE_DATA".
- Safe integer overflow checks.

Parser limits:

Constraint| Limit
Maximum formula length| 256 characters
Maximum nesting depth| 32 levels

The parser does not infer:

- Chemical bonds.
- Oxidation states.
- Molecular geometry.
- Physical properties.
- Reaction behavior.

Compound Lifecycle

The compound registry supports four statuses:

Status| Meaning
"DRAFT"| Initial compound record
"REVIEW_REQUIRED"| Waiting for review
"APPROVED"| Approved compound record
"REJECTED"| Rejected compound record

Every compound requires a source reference.

Approved compounds additionally require:

- "approvedBy"
- "approvalReference"

Only approved records from a valid registry can be returned by "getApprovedCompoundById".

Data Integrity

- Parse results and nested composition and issue objects are immutable.
- Registry records, source metadata, and registry issues are immutable.
- Duplicate compound IDs are rejected.
- Invalid formulas and missing approval metadata prevent registry validation from passing.

Validation Results

The following results were reported from local execution:

Validation| Result
"npm test"| PASS — 309/309 tests
"npm run build"| PASS
"npx tsc --noEmit"| PASS
"git diff --check"| PASS

The production build reported a bundle-size warning. This warning did not cause the build to fail.

These results are user-reported and have not been independently reproduced in this documentation review.

---

Development Principles

CHEM QUEST follows these development principles:

1. Keep chemistry data structured and consistent.
2. Validate data before it enters trusted registries.
3. Separate domain logic from gameplay presentation.
4. Maintain test coverage for core systems.
5. Make incremental changes through scoped work packages.

Project Status

CHEM QUEST is under active development.

Completed work packages and reported validation results should be distinguished from features that are still planned or in progress.

Development Area| Status
Formula & Compound Foundation (WP-FC-01)| Completed
Periodic Table Foundation| Existing dependency
Inventory and Crafting| Ongoing development
Quest and Progression Systems| Ongoing development
Release and Deployment| Not confirmed

---

Contributing

Development should follow the project's scoped work-package process.

Changes should be reviewed and validated before integration into "main".

Disclaimer

CHEM QUEST is an educational project. Its chemistry data and explanations are intended for learning purposes and should not replace authoritative scientific references.

---

<p align="center">CHEM QUEST — Learn Chemistry Through Play.

</p>