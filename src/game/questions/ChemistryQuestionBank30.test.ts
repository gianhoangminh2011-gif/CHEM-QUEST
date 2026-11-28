
import { describe, it, expect } from 'vitest';

import {
  CHEMISTRY_QUESTION_BANK_30,
  CHEMISTRY_ANSWER_KEY_30,
  QDA_FIELD_ORDER,
  validateQuestionBank,
  getQuestionById,
  getAnswerKey,
  getQuestionsByDifficulty,
  getQuestionsByTopic,
} from './ChemistryQuestionBank30';

describe('ChemistryQuestionBank30', () => {
  describe('Dataset integrity', () => {
    it('contains exactly 30 questions', () => {
      expect(CHEMISTRY_QUESTION_BANK_30).toHaveLength(30);
    });

    it('has unique question IDs', () => {
      const ids = CHEMISTRY_QUESTION_BANK_30.map(
        (question) => question.id,
      );

      expect(new Set(ids).size).toBe(30);
    });

    it('uses sequential IDs from Q001 to Q030', () => {
      const expectedIds = Array.from(
        { length: 30 },
        (_, index) =>
          `CQ-CHEM-Q${String(index + 1).padStart(3, '0')}`,
      );

      expect(
        CHEMISTRY_QUESTION_BANK_30.map((question) => question.id),
      ).toEqual(expectedIds);
    });

    it('passes the built-in dataset validator', () => {
      expect(validateQuestionBank()).toEqual([]);
    });
  });

  describe('Question structure', () => {
    it('provides a non-empty prompt for every question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.prompt.trim().length).toBeGreaterThan(0);
      }
    });

    it('provides exactly four choices per question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.choices).toHaveLength(4);
      }
    });

    it('uses A, B, C, D exactly once per question', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        const ids = question.choices.map((choice) => choice.id);

        expect([...ids].sort()).toEqual(['A', 'B', 'C', 'D']);
      }
    });

    it('provides non-empty choice text', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        for (const choice of question.choices) {
          expect(choice.text.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('provides explanations and answer-key references', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.explanation.trim().length).toBeGreaterThan(0);
        expect(question.answerKeyId).toBe(question.id);
      }
    });
  });

  describe('Answer key integrity', () => {
    it('contains exactly 30 answer keys', () => {
      expect(CHEMISTRY_ANSWER_KEY_30).toHaveLength(30);
    });

    it('has one answer key for every question', () => {
      const keyIds = CHEMISTRY_ANSWER_KEY_30.map(
        (key) => key.questionId,
      );

      expect(new Set(keyIds).size).toBe(30);

      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(keyIds).toContain(question.id);
      }
    });

    it('points every answer key to an existing choice', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        const answerKey = getAnswerKey(question.id);

        expect(answerKey).toBeDefined();
        expect(
          question.choices.some(
            (choice) => choice.id === answerKey?.correctChoiceId,
          ),
        ).toBe(true);
      }
    });

    it('returns undefined for an unknown answer key', () => {
      expect(getAnswerKey('CQ-CHEM-Q999')).toBeUndefined();
    });
  });

  describe('QDA schema', () => {
    it('defines exactly 20 QDA fields', () => {
      expect(QDA_FIELD_ORDER).toHaveLength(20);
    });

    it('preserves the declared QDA field order', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(Object.keys(question.qda)).toEqual(QDA_FIELD_ORDER);
      }
    });

    it('keeps scientific verification pending', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.qda['Scientific Verification']).toBeNull();
      }
    });

    it('keeps all records in Draft status', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.qda.Status).toBe('Draft');
      }
    });

    it('does not populate Correct Answer prematurely', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.qda['Correct Answer']).toBeNull();
      }
    });
  });

  describe('Difficulty classification', () => {
    const difficulties = ['D1', 'D2', 'D3', 'D4', 'D5'] as const;

    it('uses only D1 through D5', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(difficulties).toContain(question.qda.Difficulty);
      }
    });

    it('returns only questions matching the requested difficulty', () => {
      for (const difficulty of difficulties) {
        const result = getQuestionsByDifficulty(difficulty);

        for (const question of result) {
          expect(question.qda.Difficulty).toBe(difficulty);
        }
      }
    });

    it('accounts for all 30 questions across difficulty groups', () => {
      const grouped = difficulties.flatMap((difficulty) =>
        getQuestionsByDifficulty(difficulty),
      );

      expect(grouped).toHaveLength(30);
      expect(
        new Set(grouped.map((question) => question.id)).size,
      ).toBe(30);
    });
  });

  describe('Lookup functions', () => {
    it('finds an existing question by ID', () => {
      expect(getQuestionById('CQ-CHEM-Q001')?.id).toBe(
        'CQ-CHEM-Q001',
      );
    });

    it('returns undefined for an unknown question ID', () => {
      expect(getQuestionById('CQ-CHEM-Q999')).toBeUndefined();
    });

    it('returns questions belonging to the requested topic', () => {
      const firstQuestion = CHEMISTRY_QUESTION_BANK_30[0];
      const topic = firstQuestion.qda.Topic;

      expect(typeof topic).toBe('string');

      if (typeof topic !== 'string') {
        throw new Error('Question topic must be a string');
      }

      const result = getQuestionsByTopic(topic);

      expect(result.length).toBeGreaterThan(0);

      for (const question of result) {
        expect(question.qda.Topic).toBe(topic);
      }
    });

    it('returns an empty array for an unknown topic', () => {
      expect(getQuestionsByTopic('Unknown Topic')).toEqual([]);
    });
  });

  describe('Dataset independence', () => {
    it('contains 30 distinct question object references', () => {
      expect(
        new Set(CHEMISTRY_QUESTION_BANK_30).size,
      ).toBe(30);
    });

    it('uses the expected question ID format', () => {
      for (const question of CHEMISTRY_QUESTION_BANK_30) {
        expect(question.id).toMatch(/^CQ-CHEM-Q\d{3}$/);
      }
    });
  });
});
