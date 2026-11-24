
import assert from "node:assert/strict";

import {
  QDA_FIELD_NAMES,
  getQdaFieldInventory,
  inspectQdaCandidateFields,
  isQdaFieldName,
} from "../src/chemistry/questions/QdaCoreDataContract";

let checks = 0;

function check(name: string, assertion: () => void): void {
  assertion();
  checks += 1;
  console.log(`PASS ${name}`);
}

// TDR-01: Exact 20-field inventory
check("TDR-01: exactly 20 QDA fields", () => {
  assert.equal(QDA_FIELD_NAMES.length, 20);
  assert.equal(new Set(QDA_FIELD_NAMES).size, 20);
});

// TDR-02: Grade Level is field 4
check("TDR-02: Grade Level is field 4", () => {
  assert.equal(QDA_FIELD_NAMES[3], "Grade Level");
});

// TDR-03: Exact case-sensitive field membership
check("TDR-03: exact field-name matching", () => {
  assert.equal(isQdaFieldName("Grade Level"), true);
  assert.equal(isQdaFieldName("grade level"), false);
  assert.equal(isQdaFieldName("GradeLevel"), false);
  assert.equal(isQdaFieldName("Unknown Field"), false);
});

// TDR-04: Inventory matches canonical list
check("TDR-04: inventory matches canonical field list", () => {
  const inventory = getQdaFieldInventory();

  assert.deepEqual(inventory, QDA_FIELD_NAMES);
  assert.equal(inventory.length, 20);
});

// TDR-05: Valid candidate fields accepted
check("TDR-05: valid candidate fields are accepted", () => {
  const result = inspectQdaCandidateFields([
    { fieldName: "Question ID", value: "Q-001" },
    { fieldName: "Template ID", value: "TPL-001" },
    { fieldName: "Grade Level", value: 10 },
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
  assert.equal(result.entries.length, 3);
});

// TDR-06: Unknown candidate fields rejected
check("TDR-06: unknown candidate fields are rejected", () => {
  const result = inspectQdaCandidateFields([
    { fieldName: "Question ID", value: "Q-001" },
    { fieldName: "Unknown Field", value: "x" },
  ]);

  assert.equal(result.valid, false);
  assert.equal(result.issues[0]?.code, "UNKNOWN_FIELD");
});

console.log(`\nTDR-01..06 runtime checks: ${checks}/${checks} PASS`);
