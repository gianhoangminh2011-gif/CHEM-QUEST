
const assert = require("node:assert/strict");

const contract = require(
  "../dist/QdaCoreDataContract.js",
);

const checks = [];

function check(name, fn) {
  fn();
  checks.push(name);
}

check("exactly 20 labels", () => {
  assert.equal(contract.QDA_FIELD_NAMES.length, 20);
});

check("Field 4 remains Grade Level", () => {
  assert.equal(
    contract.QDA_FIELD_NAMES[3],
    "Grade Level",
  );
});

check("Field 20 remains Source", () => {
  assert.equal(
    contract.QDA_FIELD_NAMES[19],
    "Source",
  );
});

check("accepts empty candidate", () => {
  assert.equal(
    contract.inspectQdaCandidateFields([]).valid,
    true,
  );
});

check("accepts partial candidate", () => {
  assert.equal(
    contract.inspectQdaCandidateFields([
      {
        fieldName: "Question ID",
        value: "Q-1",
      },
    ]).valid,
    true,
  );
});

check("preserves opaque object values", () => {
  const opaque = { deep: [1, null] };

  const result =
    contract.inspectQdaCandidateFields([
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
    contract.inspectQdaCandidateFields([
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
    contract.inspectQdaCandidateFields([
      {
        fieldName: "Source",
        value: undefined,
      },
    ]).valid,
    true,
  );
});

check("rejects an extra 21st field", () => {
  const result =
    contract.inspectQdaCandidateFields([
      {
        fieldName: "Subject",
        value: "Chemistry",
      },
    ]);

  assert.equal(
    result.issues[0].code,
    "UNKNOWN_FIELD",
  );
});

check("rejects duplicate field names", () => {
  const result =
    contract.inspectQdaCandidateFields([
      {
        fieldName: "Topic",
        value: "A",
      },
      {
        fieldName: "Topic",
        value: "B",
      },
    ]);

  assert.equal(
    result.issues[0].code,
    "DUPLICATE_FIELD",
  );
});

check("rejects wrong casing", () => {
  assert.equal(
    contract.isQdaFieldName("grade level"),
    false,
  );
});

check("rejects malformed entries", () => {
  const result =
    contract.inspectQdaCandidateFields([null]);

  assert.equal(
    result.issues[0].code,
    "INVALID_ENTRY",
  );
});

check("rejects malformed container", () => {
  const result =
    contract.inspectQdaCandidateFields({});

  assert.equal(
    result.issues[0].code,
    "INVALID_CONTAINER",
  );
});

check("inspection result is immutable", () => {
  const result =
    contract.inspectQdaCandidateFields([]);

  assert.equal(Object.isFrozen(result), true);
});

console.log(
  `TDR-01..06 runtime checks: ${checks.length}/${checks.length} PASS`,
);

for (const name of checks) {
  console.log(`PASS ${name}`);
}
