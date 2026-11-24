
import { describe, expect, it } from "vitest";

import {
  getQdaFieldInventory,
  inspectQdaCandidateFields,
  isQdaFieldName,
} from "./QdaCoreDataContract";

describe(
  "QDA Core Data Contract — TDR-01 through TDR-06",
  () => {
    it("preserves exactly 20 fields in the correct order", () => {
      const fields = getQdaFieldInventory();

      expect(fields).toHaveLength(20);
      expect(fields[0]).toBe("Question ID");
      expect(fields[3]).toBe("Grade Level");
      expect(fields[19]).toBe("Source");
    });

    it("recognizes exact field labels", () => {
      expect(isQdaFieldName("Grade Level")).toBe(true);
      expect(isQdaFieldName("gradeLevel")).toBe(false);
      expect(isQdaFieldName("Grade")).toBe(false);
      expect(isQdaFieldName("Subject")).toBe(false);
    });

    it("accepts an empty candidate", () => {
      const result = inspectQdaCandidateFields([]);

      expect(result.valid).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.issues).toHaveLength(0);
    });

    it("accepts partial candidate entries", () => {
      const result = inspectQdaCandidateFields([
        {
          fieldName: "Question ID",
          value: "Q-001",
        },
      ]);

      expect(result.valid).toBe(true);
      expect(result.entries).toEqual([
        {
          fieldName: "Question ID",
          value: "Q-001",
        },
      ]);
    });

    it("keeps values opaque", () => {
      const opaqueValue = {
        arbitrary: [1, null, "value"],
      };

      const result = inspectQdaCandidateFields([
        {
          fieldName: "Question ID",
          value: opaqueValue,
        },
        {
          fieldName: "Grade Level",
          value: 10,
        },
        {
          fieldName: "Source",
          value: null,
        },
      ]);

      expect(result.valid).toBe(true);
      expect(result.entries[0]?.value).toBe(opaqueValue);
      expect(result.entries[1]?.value).toBe(10);
      expect(result.entries[2]?.value).toBeNull();
    });

    it("allows explicitly present undefined values", () => {
      const result = inspectQdaCandidateFields([
        {
          fieldName: "Template ID",
          value: undefined,
        },
      ]);

      expect(result.valid).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.value).toBeUndefined();
    });

    it("rejects a 21st field", () => {
      const result = inspectQdaCandidateFields([
        {
          fieldName: "Question ID",
          value: "Q-001",
        },
        {
          fieldName: "Subject" as never,
          value: "Chemistry",
        },
      ]);

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "UNKNOWN_FIELD",
            fieldName: "Subject",
          }),
        ]),
      );
    });

    it("rejects duplicate field names", () => {
      const result = inspectQdaCandidateFields([
        {
          fieldName: "Topic",
          value: "Chemical reactions",
        },
        {
          fieldName: "Topic",
          value: "Acids",
        },
      ]);

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "DUPLICATE_FIELD",
            fieldName: "Topic",
          }),
        ]),
      );
    });

    it("rejects malformed entries", () => {
      const result = inspectQdaCandidateFields([
        null,
        { fieldName: "Topic" },
        {
          fieldName: "Topic",
          value: "Acids",
          confidence: 1,
        },
      ]);

      expect(result.valid).toBe(false);

      expect(
        result.issues.filter(
          (issue) => issue.code === "INVALID_ENTRY",
        ),
      ).toHaveLength(3);
    });

    it("rejects non-array input", () => {
      const result = inspectQdaCandidateFields({
        "Question ID": "Q-001",
      });

      expect(result.valid).toBe(false);
      expect(result.issues[0]?.code).toBe(
        "INVALID_CONTAINER",
      );
    });

    it("returns immutable inspection results", () => {
      const result = inspectQdaCandidateFields([
        {
          fieldName: "Unknown" as never,
          value: "x",
        },
      ]);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.entries)).toBe(true);
      expect(Object.isFrozen(result.issues)).toBe(true);
      expect(Object.isFrozen(result.issues[0])).toBe(true);
    });
  },
);
