CQ-OBS-03 — Dependency Audit Report

Document ID: CQ-OBS-03-DEPENDENCY-AUDIT-REPORT
Version: v0.2
Status: PD APPROVED — AUDIT RECORD
Audit Baseline: "e0d26be64607df9d1898d79c9c9d48f23927e276"
Repository: "gianhoangminh2011-gif/CHEM-QUEST"
Audit Scope: Dependency vulnerability assessment
Finding Status: OBS-03 OPEN

---

1. Executive Summary

This report records the dependency vulnerability audit conducted against the CHEM-QUEST repository at the specified audit baseline.

The recorded full dependency audit identified 6 vulnerable package entries:

Severity| Vulnerable entries
Critical| 2
High| 1
Moderate| 3
Low| 0
Info| 0
Total| 6

The production-only audit ("npm audit --omit=dev") reported 0 vulnerabilities.

These results indicate that the identified vulnerabilities were present in the full dependency tree, while the production-only audit did not report vulnerabilities under the audit conditions.

The findings do not establish that the project was exploited or compromised.

OBS-03 remains OPEN. This report records audit results and limitations only. It does not authorize dependency remediation or declare the repository security-certified.

2. Audit Objective

The objectives were to:

1. Assess reported vulnerabilities in the project's dependency tree.
2. Distinguish full dependency findings from production-only findings.
3. Record affected packages and available advisory information.
4. Document audit limitations and evidence availability.
5. Preserve the findings for subsequent PD-directed decisions.

3. Audit Baseline and Environment

Baseline commit:

"e0d26be64607df9d1898d79c9c9d48f23927e276"

At the recorded baseline, a committed "package-lock.json" was not present.

A temporary lockfile was generated in an isolated temporary workspace using:

npm install --package-lock-only --ignore-scripts --no-audit

The recorded audit setup environment was:

- Node.js: "20.20.2"
- npm: "10.8.2"

The temporary lockfile was used to resolve the dependency tree for the audit. It was not committed to the repository.

Important limitation: Because the audit used a generated temporary lockfile rather than a committed lockfile, the results describe the resolved dependency tree in that temporary audit workspace. They should not be interpreted as an immutable, lockfile-pinned representation of the repository's dependency state.

4. Audit Results

4.1 Full dependency audit

Command:

npm audit --json

Recorded result:

- Critical: 2
- High: 1
- Moderate: 3
- Low: 0
- Info: 0
- Total vulnerable package entries: 6

The affected package entries recorded in the audit were:

Package| Recorded severity
"@vitest/mocker"| Moderate
"esbuild"| Moderate
"tinypool"| Critical
"vite"| High
"vite-node"| Moderate
"vitest"| Critical

These are package-level audit entries. They should not automatically be interpreted as six independent vulnerabilities or six independently exploitable attack paths.

4.2 Production-only audit

Command:

npm audit --omit=dev --json

Recorded result:

0 vulnerabilities

This result applies only to the production dependency scope evaluated by the command. It does not establish that development, testing, build, or other non-production dependencies are free of vulnerabilities.

4.3 Recorded advisory information

One advisory was specifically recorded:

- Package: "vitest"
- Advisory: "GHSA-5xrq-8626-4rwp"
- Recorded CVSS score: "9.8"
- Recorded fix availability: "vitest 5.1.0"

The recorded project version was "vitest 2.1.9".

The suggested fix involves a major-version change. It is recorded as audit information only and is not authorization to upgrade Vitest.

The remaining advisory details require the original machine-readable audit output or a fresh authorized audit to independently verify their complete metadata.

5. Project Dependency Context

The recorded "package.json" dependency information included:

Dependency| Recorded version or range
Phaser| "^3.90.0"
React| "^18.3.1"
React DOM| "^18.3.1"
Vite| "^6.0.5"
Vitest| "2.1.9"

The CI workflows were recorded as using Node.js 20, with "npm install" used in the relevant workflow context.

This section records the dependency context available during the audit. It is not a complete dependency inventory.

6. Evidence and Reproducibility

The audit process generated the following machine-readable outputs in its temporary workspace:

- "audit-all.json"
- "audit-prod.json"
- Temporary "package-lock.json"

A subsequent repository inspection did not locate these raw JSON files in the checked GitHub branch trees.

The main branch audit directory was found to contain the following documents:

- "CQ-OBS-03-DEPENDENCY-AUDIT-PROPOSAL-v0.2.md"
- "CQ-QB-AUD-001.md"

The raw audit JSON files were not available in the checked repository locations at the time of report preparation.

Therefore:

1. The numerical findings in this report are retained as recorded historical audit results.
2. The original raw JSON evidence is not currently attached to this report.
3. The recorded results cannot be independently revalidated from those raw JSON files through the checked repository contents.
4. Historical checksum values are not treated as independently verified evidence in this report.
5. A fresh audit may produce different results if dependency resolution, registry metadata, package versions, or the audit environment have changed.

This evidence limitation must remain visible in any later review or interpretation of this report.

7. Limitations

This audit has the following limitations:

- The dependency tree was resolved using a temporary lockfile.
- The audit did not use a committed lockfile as an immutable dependency baseline.
- The original raw JSON outputs were not located in the checked GitHub branches.
- The report does not establish exploitability in the CHEM-QUEST application.
- The report does not establish that any vulnerability has been exploited.
- The production-only result does not cover the full development and testing dependency tree.
- No post-remediation audit was performed.
- No dependency remediation was performed under this audit authorization.

The results must not be represented as a security certification or proof that the application is secure.

8. Remediation Boundary

This report is an audit record.

The following actions are not authorized by this report:

- Upgrading or downgrading dependencies.
- Modifying "package.json".
- Creating or committing a production "package-lock.json".
- Changing dependency resolutions.
- Editing application source code to address the findings.
- Modifying CI or deployment workflows.
- Merging remediation changes.
- Declaring OBS-03 closed.
- Issuing a security certification.

Any remediation proposal must be separately documented, reviewed, and explicitly authorized by the PD before implementation.

9. Finding Status

OBS-03: OPEN

Reason:

The audit recorded six vulnerable package entries in the full dependency tree. Although the production-only audit reported zero vulnerabilities, the full dependency findings remain unresolved.

The absence of raw JSON evidence in the checked repository locations is also a documented evidence limitation.

No remediation or post-remediation validation has been recorded under this report.

OBS-03 must remain OPEN until the required follow-up work is separately authorized and completed, with appropriate evidence and validation.

10. Final Audit Conclusion

The recorded dependency audit identified six vulnerable package entries in the full dependency tree, including two Critical entries, one High entry, and three Moderate entries.

The production-only audit reported zero vulnerabilities under the recorded audit conditions.

The results are useful as a historical dependency-risk record, but their reproducibility is limited by the use of a temporary lockfile and the unavailability of the original raw JSON outputs in the checked GitHub branch trees.

This report is approved by the PD as an audit record, with the stated evidence limitations retained.

Final status:

- Report: PD APPROVED — AUDIT RECORD
- OBS-03: OPEN
- Dependency remediation: NOT AUTHORIZED
- CI/deployment modification: NOT AUTHORIZED
- Security certification: NOT ISSUED

---

End of Report