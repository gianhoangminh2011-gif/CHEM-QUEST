/**
 * CHEM QUEST — Question Repository foundation
 *
 * Stores opaque, fixed-question payloads by Question ID.
 *
 * Governance boundary:
 * - Does not define or validate the 20-field QDA schema.
 * - Does not decide Field 14 scientific verification or Field 17 status.
 * - Does not determine curriculum eligibility, difficulty, OVR, or safety clearance.
 * - Does not evaluate answers or generate template-based questions.
 *
 * Payload validation and eligibility must be added only against an
 * authenticated, PD-approved QDA specification and reviewer decisions.
 */

export type QuestionId = string;

export interface StoredQuestion<TPayload> {
  readonly questionId: QuestionId;
  readonly payload: TPayload;
}

export type AddQuestionResult<TPayload> =
  | {
      readonly status: 'added';
      readonly question: StoredQuestion<TPayload>;
    }
  | {
      readonly status: 'invalid_id';
    }
  | {
      readonly status: 'duplicate';
      readonly question: StoredQuestion<TPayload>;
    };

export interface QuestionRepository<TPayload> {
  add(
    questionId: QuestionId,
    payload: TPayload,
  ): AddQuestionResult<TPayload>;

  getById(questionId: QuestionId): StoredQuestion<TPayload> | null;

  has(questionId: QuestionId): boolean;

  list(): readonly StoredQuestion<TPayload>[];

  readonly size: number;
}

/**
 * Creates an in-memory repository for fixed-question records.
 *
 * Only repository-level identity checks are performed.
 * The Question ID must be non-empty; its value is preserved exactly.
 * Payload remains opaque until QDA types and validation rules
 * are authoritatively established.
 */
export function createQuestionRepository<TPayload>(): QuestionRepository<TPayload> {
  const records = new Map<QuestionId, StoredQuestion<TPayload>>();

  return {
    add(questionId, payload) {
      if (
        typeof questionId !== 'string' ||
        questionId.trim().length === 0
      ) {
        return { status: 'invalid_id' };
      }

      const existing = records.get(questionId);

      if (existing) {
        return {
          status: 'duplicate',
          question: existing,
        };
      }

      const question = Object.freeze({
        questionId,
        payload,
      });

      records.set(questionId, question);

      return {
        status: 'added',
        question,
      };
    },

    getById(questionId) {
      return records.get(questionId) ?? null;
    },

    has(questionId) {
      return records.has(questionId);
    },

    list() {
      return Object.freeze(
        Array.from(records.values()),
      );
    },

    get size() {
      return records.size;
    },
  };
}