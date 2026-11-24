
# Reaction Content Specification

- Work package: CQ-REACTION-02 / WP-02A
- Status: Draft — pending validation and PD acceptance
- Scope: Reaction content domain and data-governance rules
- Depends on: Formula & Compound Foundation (WP-FC-01)

## 1. Purpose

Define how CHEM QUEST represents, verifies, approves, and uses
chemical reaction content.

The system MUST distinguish educational chemistry reactions from
gameplay recipes that consume and produce inventory resources.

These are separate domain concepts. One MUST NOT be converted into
the other merely by matching names, formulas, or quantities.

## 2. Domain Separation

### 2.1 Educational Reaction

An educational reaction represents a scientifically described
chemical transformation.

Its conceptual data includes:

- Stable reaction identifier.
- Reactant and product chemical species.
- Chemical formulas validated against the element catalog.
- Stoichiometric coefficients.
- Reaction conditions, when supported by a source.
- Reaction classification, when supported by a source.
- Source references for the reaction and its claims.
- Review and approval metadata.

Educational reaction data MUST NOT require `crystal-*` inventory IDs.

### 2.2 Gameplay Recipe

A gameplay recipe represents an approved game action that consumes
and produces inventory resources.

Its conceptual data includes:

- Stable recipe identifier.
- Input and output resource identifiers.
- Positive integer game quantities.
- Gameplay-specific conditions, if defined by approved design.
- Source and approval metadata.
- Explicit mapping to educational chemistry content, if applicable.

A gameplay recipe MUST NOT claim to reproduce real chemical
stoichiometry unless that relationship has been explicitly reviewed,
verified, and approved.

### 2.3 Mapping Between Domains

A mapping between an educational reaction and a gameplay recipe
is optional and explicit.

A mapping MUST identify:

- The educational reaction identifier.
- The gameplay recipe identifier.
- The mapping rationale.
- The source or design reference.
- Approval metadata.

No implicit mapping by display name, formula, or resource ID
is permitted.

## 3. Chemistry Validation Requirements

Before educational reaction content can be approved:

1. Every chemical formula MUST parse successfully.
2. Every element symbol MUST exist in the approved element catalog.
3. Stoichiometric coefficients MUST be positive integers.
4. Reactant and product composition MUST be checked for atom balance.
5. Charge balance MUST be checked when the data model represents
   ionic charge.
6. Conditions and reaction classification MUST be supported by
   reliable source material.
7. Any unsupported or ambiguous claim MUST remain unapproved.

A successful formula parse alone does not prove that a reaction
is chemically valid.

The system MUST NOT infer reaction behavior, products, conditions,
or physical properties from a formula alone.

## 4. Source and Approval Lifecycle

Reaction content uses the following lifecycle:

- DRAFT: content is being prepared.
- REVIEW_REQUIRED: content is awaiting scientific review.
- APPROVED: content has passed review and has complete approval data.
- REJECTED: content has failed review or has been withdrawn.

Every entry MUST include a non-empty source reference.

An APPROVED entry MUST additionally include:

- approvedBy
- approvalReference

Only APPROVED entries from a validated registry may be exposed
through production lookup.

Test fixtures MUST NOT be treated as production chemistry data.

## 5. Resource Identity Restrictions

The existing `crystal-*` resources are unidentified game resources.
Their identifiers do not establish chemical identity.

Therefore:

- No `crystal-*` resource may be described as a real chemical
  substance without an approved identity record.
- No educational reaction may consume or produce these resources
  by assumption.
- No chemical formula may be inferred from a resource name.
- No production reaction data may be populated with invented
  resource mappings.
- A future resource-identity work package must establish and approve
  any required mapping before gameplay integration.

## 6. Registry Boundaries

The current gameplay `ReactionRegistry` is inventory-oriented:
its material entries use `crystal-*` resource identifiers.

It MUST NOT be repurposed as the sole registry for educational
chemical reactions.

The implementation design must preserve separate validation
boundaries for:

- Educational reaction definitions and scientific evidence.
- Gameplay recipes and inventory transaction rules.
- Explicit, reviewed mappings between the two domains.

The existing approval gate and empty production registry remain
in force until verified content is approved.

## 7. Required Negative Cases

Validation and regression tests must cover:

- Unknown element symbols.
- Invalid or unparsable formulas.
- Zero, negative, fractional, or unsafe coefficients.
- Atom imbalance.
- Charge imbalance when charge data is available.
- Missing source references.
- APPROVED entries without approval metadata.
- Duplicate reaction identifiers.
- Unsupported conditions or claims.
- Implicit mapping from an educational reaction to a game resource.
- Attempted production lookup of DRAFT, REVIEW_REQUIRED, or REJECTED
  entries.

Invalid or unverified content MUST NOT enter production lookup.

## 8. Out of Scope

This specification does not authorize or define:

- A production reaction dataset.
- New chemical identities for existing `crystal-*` resources.
- Gameplay recipe quantities or economy values.
- Reaction challenge rules or rewards.
- Combat, DPS, or multiplayer behavior.
- Changes to the inventory transaction model.
- Release or deployment.

These require their own verified requirements and approved scope.

## 9. WP-02A Acceptance Criteria

WP-02A is ready for review when:

- Educational reactions and gameplay recipes are explicitly separated.
- Their data and validation responsibilities are documented.
- Source and approval requirements are unambiguous.
- Chemistry validation requirements are documented.
- Unidentified game resources cannot be treated as real substances.
- Required negative cases are specified.
- No unverified production reaction data is introduced.

## 10. Downstream Implementation Rule

WP-02B must use verified educational reaction content with traceable
sources. If a gameplay resource mapping is not independently approved,
the educational reaction remains independent of inventory execution.

WP-02C and WP-02D must preserve the approval boundary and atomic
inventory transaction guarantees.

This document is a specification draft, not scientific approval
of any particular reaction.
