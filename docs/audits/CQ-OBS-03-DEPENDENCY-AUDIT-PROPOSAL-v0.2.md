# CQ-OBS-03 Dependency Security Audit Proposal

**Document ID:** CQ-OBS-03-DEPENDENCY-AUDIT-PROPOSAL  
**Version:** 0.2  
**Status:** Proposed — Pending PD Approval  
**Related Observation:** OBS-03  
**Repository:** CHEM QUEST

## 1. Purpose

This proposal defines a controlled procedure to investigate OBS-03, which records six dependency vulnerabilities reported during a historical CI installation.

The audit will determine the current dependency vulnerability status without modifying project dependencies or application source code.

## 2. Background

The historical CI output reported:

- 3 moderate vulnerabilities
- 1 high vulnerability
- 2 critical vulnerabilities

These historical results do not establish that the same vulnerabilities remain present on the current `main` branch.

The repository currently has no committed `package-lock.json`. Dependency resolution may therefore vary over time.

## 3. Audit Objectives

1. Reconstruct the dependency tree for the exact audited commit.
2. Identify current npm security advisories.
3. Record affected packages, versions and dependency paths.
4. Determine severity and fix availability.
5. Assess whether available fixes are compatible with declared dependency ranges.
6. Produce an evidence-based disposition for OBS-03.

## 4. Audit Scope

In scope:

- Dependencies declared in `package.json`.
- Resolved dependency tree.
- npm audit findings.
- Production dependency audit using `--omit=dev`.
- Advisory metadata and remediation availability.

Out of scope:

- Application source-code security review.
- Automatic dependency upgrades.
- Application behavior changes.
- CI workflow changes.
- Vulnerability remediation implementation.
- Production security certification.

## 5. Audit Environment

The audit must use an isolated workspace based on the exact `main` commit:

`e0d26be64607df9d1898d79c9c9d48f23927e276`

Record:

- Operating system and architecture.
- Node.js version.
- npm version.
- npm registry.
- Relevant npm configuration.
- Audit timestamp.
- Source commit SHA.

The environment should use the Node.js major version specified by the project's CI workflow.

## 6. Audit Procedure

### 6.1 Dependency Resolution

Generate a temporary lockfile in the isolated workspace using:

`npm install --package-lock-only --ignore-scripts --no-audit`

Preserve the generated lockfile and calculate its SHA-256 checksum.

This temporary lockfile must not be committed to the repository.

### 6.2 Full Dependency Audit

Execute:

`npm audit --json`

Preserve:

- Raw JSON output.
- Exit code.
- Execution timestamp.
- Registry information.

### 6.3 Production Dependency Audit

Execute:

`npm audit --omit=dev --json`

Preserve the same evidence as the full audit.

### 6.4 Finding Classification

For each advisory, record:

- Advisory ID.
- Package name.
- Installed version.
- Affected version range.
- Severity.
- Direct or transitive dependency.
- Dependency path.
- Vulnerability category.
- Fix availability.
- Whether the proposed fix is compatible with declared dependency ranges.

### 6.5 Evidence Review

Compare the current results with the historical six-vulnerability report.

Do not assume that historical findings remain present or have been resolved without supporting evidence.

## 7. Audit Coverage and Limitations

- npm audit evaluates dependency information represented in the resolved dependency tree and submitted to the configured registry.
- Peer dependencies may be represented in the resolved dependency tree. Their presence and treatment depend on the actual dependency resolution.
- npm audit does not constitute a complete application security assessment and does not prove the absence of all software vulnerabilities.
- Results depend on the registry advisory data and the dependency tree resolved at audit time.
- A successful build does not establish that dependencies are free of vulnerabilities.

## 8. Change Control and Restrictions

This proposal authorizes no implementation or remediation.

The audit must not:

- Modify application source code.
- Upgrade or downgrade dependencies.
- Commit a lockfile.
- Modify CI workflows.
- Merge remediation changes.
- Close OBS-03.
- Declare the project security-certified.

Any remediation requires a separate proposal and explicit PD authorization.

## 9. Deliverables

The audit report must include:

1. Audit environment record.
2. Audited commit SHA.
3. Temporary lockfile and checksum.
4. Full npm audit output.
5. Production npm audit output.
6. Classified findings table.
7. Historical comparison.
8. Limitations and recommended next actions.
9. Proposed OBS-03 disposition.

## 10. Approval

**Current status:** PENDING PD APPROVAL.

Approval of this proposal authorizes only the defined audit procedure. It does not authorize dependency remediation, finding closure, or production security certification.