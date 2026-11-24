
import assert from "node:assert/strict";

import {
  QDA_FIELD_NAMES,
  getQdaFieldInventory,
  inspectQdaCandidateFields,
  isQdaFieldName,
} from "../src/chemistry/questions/QdaCoreDataContract.ts";

const checks = [];

function check(name, fn) {
  fn();
  checks.push(name);
}

check("exactly 20 labels", () => {
  assert.equal(QDA_FIELD_NAMES.length, 20);
  assert.equal(getQdaFieldInventory().length, 20);
});

check("Field 4 remains Grade Level", () => {
  assert.equal(QDA_FIELD_NAMES[3], "Grade Level");
});

check("Field 20 remains Source", () => {
  assert.equal(QDA_FIELD_NAMES[19], "Source");
});

check("accepts empty candidate", () => {
  assert.equal(
    inspectQdaCandidateFields([]).valid,
    true,
  );
});

check("accepts partial candidate", () => {
  const result = inspectQdaCandidateFields([
    {
      fieldName: "Question ID",
      value: "Q-1",
    },
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.entries.length, 1);
});

check("preserves opaque object values", () => {
  const opaque = { deep: [1, null] };

  const result = inspectQdaCandidateFields([
    {
      fieldName: "Source",
      value: opaque,
    },
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.entries[0].value, opaque);
});

check("does not reject null values", () => {
  assert.equal(
    inspectQdaCandidateFields([
      {
        fieldName: "Source",
        value: null,
      },
    ]).valid,
    true,
  );
});

check("does not reject undefined values", () => {
  assert.equal(
    inspectQdaCandidateFields([
      {
        fieldName: "Source",
        value: undefined,
      },
    ]).valid,
    true,
  );
});

check("rejects an extra 21st field", () => {
  const result = inspectQdaCandidateFields([
    {
      fieldName: "Subject",
      value: "Chemistry",
    },
  ]);

  assert.equal(result.valid, false);
  assert.equal(
    result.issues[0].code,
    "UNKNOWN_FIELD",
  );
});

check("rejects duplicate field names", () => {
  const result = inspectQdaCandidateFields([
    {
      fieldName: "Topic",
      value: "A",
    },
    {
      fieldName: "Topic",
      value: "B",
    },
  ]);

  assert.equal(result.valid, false);
  assert.equal(
    result.issues[0].code,
    "DUPLICATE_FIELD",
  );
});

check("rejects wrong casing", () => {
  assert.equal(isQdaFieldName("grade level"), false);
  assert.equal(isQdaFieldName("gradeLevel"), false);
});

check("rejects malformed entries", () => {
  const result = inspectQdaCandidateFields([null]);

  assert.equal(result.valid, false);
  assert.equal(
    result.issues[0].code,
    "INVALID_ENTRY",
  );
});

check("rejects malformed container", () => {
  const result = inspectQdaCandidateFields({});

  assert.equal(result.valid, false);
  assert.equal(
    result.issues[0].code,
    "INVALID_CONTAINER",
  );
});

check("inspection result is immutable", () => {
  const result = inspectQdaCandidateFields([]);

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.entries), true);
  assert.equal(Object.isFrozen(result.issues), true);
});

console.log(
  `TDR-01..06 runtime checks: ${checks.length}/${checks.length} PASS`,
);

for (const name of checks) {
  console.log(`PASS ${name}`);
}
