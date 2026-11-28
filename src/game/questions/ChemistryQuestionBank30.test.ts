
import { describe, it, expect } from 'vitest';

import {
  CHEMISTRY_QUESTION_BANK_30,
  QDA_FIELD_ORDER,
  getQuestionById,
  getQuestionsByDifficulty,
  getQuestionsByTopic,
} from './ChemistryQuestionBank30';

describe('ChemistryQuestionBank30', () => {
  describe('Dataset integrity', () => {
    it('contains exactly 30 new questions', () => {
      expect(CHEMISTRY_QUESTION_BANK_30).toHaveLength(30);
    });

    it('has unique question IDs', () => {
      const ids = CHEMISTRY_QUESTION_BANK_30.map(
        (question) => question.id,
      );

      expect(new Set(ids).size).toBe(30);
    });

    it('uses the CQ-CHEM-Q001 to CQ-CHEM-Q030 ID range', () => {
      const expectedIds = Array.from(
        { length: 30 },
        (_, index) =>
          `CQ-CHEM-Q${String(index + 1).padStart(3, '0')}`,
      );

      const actualIds = CHEMISTRY_QUESTION_BANK_30.map(
        (question) => question.id,
      );

      expect(actualIds).toEqual(expectedIds);
    });
  });

  describe('Question structure', () => {
    it('gives every question a non-empty prompt', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.prompt.trim().length).toBeGreaterThan(0);
      }
    });

    it('provides exactly four choices per question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.choices).toHaveLength(4);
      }
    });

    it('uses A, B, C, D exactly once for every question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        const ids = question.choices.map((choice) => choice.id);

        expect(ids.sort()).toEqual(['A', 'B', 'C', 'D']);
      }
    });

    it('gives every choice non-empty text', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        for (const choice of question.choices) {
          expect(choice.text.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('provides an explanation for every question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.explanation.trim().length).toBeGreaterThan(0);
      }
    });

    it('provides an answer-key reference for every question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.answerKeyId.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('QDA schema', () => {
    it('defines exactly 20 QDA fields', () => {
      expect(QDA_FIELD_ORDER).toHaveLength(20);
    });

    it('contains all 20 fields in the declared order', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(Object.keys(question.qda)).toEqual(QDA_FIELD_ORDER);
      }
    });

    it('marks scientific verification as pending', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.qda['Scientific Verification']).toBeNull();
      }
    });

    it('does not claim questions are already verified', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.qda.Status).toBe('Draft');
      }
    });

    it('does not hardcode the correct answer into the QDA record', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.qda['Correct Answer']).toBeNull();
      }
    });
  });

  describe('Difficulty classification', () => {
    it('uses only D1 through D5', () => {
      const validDifficulties = ['D1', 'D2', 'D3', 'D4', 'D5'];

      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(validDifficulties).toContain(
          question.qda.Difficulty,
        );
      }
    });

    it('returns only matching questions for each difficulty', () => {
      for (const difficulty of ['D1', 'D2', 'D3', 'D4', 'D5'] as const) {
        const result = getQuestionsByDifficulty(difficulty);

        for (const question of result) {
          expect(question.qda.Difficulty).toBe(difficulty);
        }
      }
    });

    it('accounts for all 30 questions across difficulty groups', () => {
      const groupedQuestions = (
        ['D1', 'D2', 'D3', 'D4', 'D5'] as const
      ).flatMap((difficulty) =>
        getQuestionsByDifficulty(difficulty),
      );

      expect(groupedQuestions).toHaveLength(30);

      const groupedIds = groupedQuestions.map(
        (question) => question.id,
      );

      expect(new Set(groupedIds).size).toBe(30);
    });
  });

  describe('Lookup functions', () => {
    it('finds an existing question by ID', () => {
      const question = getQuestionById('CQ-CHEM-Q001');

      expect(question).toBeDefined();
      expect(question?.id).toBe('CQ-CHEM-Q001');
    });

    it('returns undefined for an unknown question ID', () => {
      expect(getQuestionById('CQ-CHEM-Q999')).toBeUndefined();
    });

    it('returns questions belonging to the requested topic', () => {
      const firstQuestion = CHEMISTRY_QUESTION_BANK_30[0];
      const topic = firstQuestion.qda.Topic;

      expect(typeof topic).toBe('string');

      const result = getQuestionsByTopic(topic);

      expect(result.length).toBeGreaterThan(0);

      for (const question of result) {
        expect(question.qda.Topic).toBe(topic);
      }
    });
  });

  describe('Dataset independence', () => {
    it('does not contain duplicate question objects', () => {
      const references = new Set(CHEMISTRY_QUESTION_BANK_30);

      expect(references.size).toBe(30);
    });

    it('does not contain empty or placeholder question IDs', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.id).toMatch(/^CQ-CHEM-Q\d{3}$/);
      }
    });
  });
});
