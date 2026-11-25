import { useEffect, useMemo, useState } from 'react';

import {
  createQuestionRepository,
} from './questions/QuestionRepository';

import {
  createPracticeSessionFromRepository,
} from './questions/QuestionPracticeSession';

import {
  loadPublishedPracticeQuestions,
} from './questions/QuestionPublicationGate';

import type {
  PublishedQuestionSource,
} from './questions/QuestionPublicationGate';

import {
  createChemistryPracticeSession,
  getChemistrySessionSummary,
  submitChemistryAnswer,
} from '../chemistry/practice/ChemistryPracticeAdapter';

import {
  resolveAnswerKey,
} from '../chemistry/answer-keys/AnswerKeyRegistry';

import type {
  ChemistryQuestionSnapshot,
} from '../chemistry/answer-keys/AnswerKeyRegistry';

import type {
  AnswerKeyIntakeRecord,
} from '../chemistry/answer-keys/AnswerKeyIntake';

import type {
  QuestionPresentationData,
} from '../chemistry/practice/QuestionPresentation';

import type {
  ChemistryPracticeSession,
} from '../chemistry/practice/ChemistryPracticeAdapter';

export interface PublishedPracticeQuestion {
  readonly presentation: QuestionPresentationData;
  readonly snapshot: ChemistryQuestionSnapshot;
  readonly answerKey: AnswerKeyIntakeRecord;
}

interface PracticePanelProps {
  /**
   * Only pass records from the project's approved question-publication
   * source. Do not pass synthetic test fixtures or draft questions.
   */
  publishedQuestions?: readonly PublishedPracticeQuestion[];

  /**
   * Runtime source connected to the approved publication dataset.
   * The source is structurally checked by QuestionPublicationGate.
   */
  publishedQuestionSource?: PublishedQuestionSource;
}

interface ActivePractice {
  readonly session: ChemistryPracticeSession;
  readonly questionsById: ReadonlyMap<
    string,
    PublishedPracticeQuestion
  >;
  readonly answerKeys: readonly AnswerKeyIntakeRecord[];
}

type SourceStatus = 'loading' | 'ready' | 'unavailable';

const EMPTY_PUBLISHED_QUESTIONS:
  readonly PublishedPracticeQuestion[] = [];

function isUsablePublishedQuestion(
  question: PublishedPracticeQuestion,
): boolean {
  if (
    !question ||
    !question.presentation ||
    !question.snapshot ||
    !question.answerKey
  ) {
    return false;
  }

  const { presentation, snapshot, answerKey } = question;

  if (
    presentation.questionId !== snapshot.questionId ||
    !presentation.prompt.trim() ||
    !Array.isArray(presentation.choices) ||
    !Array.isArray(snapshot.choiceIds) ||
    presentation.choices.length < 2
  ) {
    return false;
  }

  const presentationChoiceIds =
    presentation.choices.map((choice) => choice.id);

  if (
    presentationChoiceIds.some(
      (id) => typeof id !== 'string' || !id.trim(),
    ) ||
    new Set(presentationChoiceIds).size !==
      presentationChoiceIds.length
  ) {
    return false;
  }

  if (
    snapshot.choiceIds.length !== presentationChoiceIds.length ||
    !snapshot.choiceIds.every(
      (id) => presentationChoiceIds.includes(id),
    )
  ) {
    return false;
  }

  // Synthetic test fixtures must never enter the production UI.
  if (
    answerKey.sources.some(
      (source) =>
        source.sourceType === 'test_fixture' ||
        source.locator.startsWith('synthetic://'),
    )
  ) {
    return false;
  }

  // The exact question snapshot must have one eligible key.
  return (
    resolveAnswerKey([answerKey], snapshot).status === 'eligible'
  );
}

function PracticePanel({
  publishedQuestions = EMPTY_PUBLISHED_QUESTIONS,
  publishedQuestionSource,
}: PracticePanelProps) {
  const [loadedQuestions, setLoadedQuestions] =
    useState<readonly PublishedPracticeQuestion[]>(
      publishedQuestionSource
        ? EMPTY_PUBLISHED_QUESTIONS
        : publishedQuestions,
    );

  const [sourceStatus, setSourceStatus] =
    useState<SourceStatus>(
      publishedQuestionSource
        ? 'loading'
        : publishedQuestions.length > 0
          ? 'ready'
          : 'unavailable',
    );

  const [activePractice, setActivePractice] =
    useState<ActivePractice | null>(null);

  const [selectedChoice, setSelectedChoice] = useState('');
  const [feedback, setFeedback] = useState('');
  const [waitingForNext, setWaitingForNext] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!publishedQuestionSource) {
      setLoadedQuestions(publishedQuestions);
      setSourceStatus(
        publishedQuestions.length > 0
          ? 'ready'
          : 'unavailable',
      );
      return () => {
        cancelled = true;
      };
    }

    setLoadedQuestions(EMPTY_PUBLISHED_QUESTIONS);
    setSourceStatus('loading');

    void loadPublishedPracticeQuestions(
      publishedQuestionSource,
    )
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.status === 'ready') {
          setLoadedQuestions(result.questions);
          setSourceStatus('ready');
        } else {
          setLoadedQuestions(EMPTY_PUBLISHED_QUESTIONS);
          setSourceStatus('unavailable');
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setLoadedQuestions(EMPTY_PUBLISHED_QUESTIONS);
        setSourceStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [publishedQuestionSource, publishedQuestions]);

  const eligibleQuestions = useMemo(() => {
    const seenQuestionIds = new Set<string>();

    return loadedQuestions.filter((question) => {
      if (!isUsablePublishedQuestion(question)) {
        return false;
      }

      const questionId = question.snapshot.questionId;

      if (seenQuestionIds.has(questionId)) {
        return false;
      }

      seenQuestionIds.add(questionId);
      return true;
    });
  }, [loadedQuestions]);

  const startPractice = () => {
    if (
      sourceStatus !== 'ready' ||
      eligibleQuestions.length === 0
    ) {
      setFeedback(
        'No verified and approved questions are available.',
      );
      return;
    }

    const repository =
      createQuestionRepository<PublishedPracticeQuestion>();

    for (const question of eligibleQuestions) {
      const result = repository.add(
        question.snapshot.questionId,
        question,
      );

      if (result.status !== 'added') {
        setFeedback(
          'The question repository rejected a duplicate or invalid record.',
        );
        return;
      }
    }

    const questionIds = eligibleQuestions.map(
      (question) => question.snapshot.questionId,
    );

    const baseResult = createPracticeSessionFromRepository(
      repository,
      {
        sessionId: `practice-${Date.now()}`,
        questionIds,
      },
    );

    if (baseResult.status !== 'created') {
      setFeedback(
        'Unable to create a practice session. Please check the question records.',
      );
      return;
    }

    const answerKeys = eligibleQuestions.map(
      (question) => question.answerKey,
    );

    const session = createChemistryPracticeSession({
      baseSession: baseResult.session,
      questionSnapshots: eligibleQuestions.map(
        (question) => question.snapshot,
      ),
      answerKeys,
    });

    const allKeysPinned = questionIds.every(
      (questionId) =>
        session.answerKeyPins[questionId]?.status === 'pinned',
    );

    if (!allKeysPinned) {
      setFeedback(
        'At least one answer key could not be pinned. The session was not started.',
      );
      return;
    }

    setActivePractice({
      session,
      questionsById: new Map(
        eligibleQuestions.map((question) => [
          question.snapshot.questionId,
          question,
        ]),
      ),
      answerKeys,
    });

    setSelectedChoice('');
    setFeedback('');
    setWaitingForNext(false);
  };

  const submitAnswer = (answer: string | null) => {
    if (!activePractice) {
      return;
    }

    const questionId =
      activePractice.session.baseSession.questionIds[
        activePractice.session.baseSession.currentQuestionIndex
      ];

    if (!questionId) {
      return;
    }

    const result = submitChemistryAnswer(
      activePractice.session,
      questionId,
      answer,
      activePractice.answerKeys,
    );

    if (result.status !== 'accepted') {
      setFeedback(
        result.feedback?.message ??
          (
            result.status === 'evaluation_unavailable'
              ? 'Evaluation unavailable. This answer was not recorded.'
              : `Submission rejected: ${result.status}.`
          ),
      );
      return;
    }

    setActivePractice({
      ...activePractice,
      session: result.session,
    });

    setFeedback(
      result.feedback?.message ?? 'Answer recorded.',
    );

    setSelectedChoice('');
    setWaitingForNext(true);
  };

  const endPractice = () => {
    setActivePractice(null);
    setSelectedChoice('');
    setFeedback('');
    setWaitingForNext(false);
  };

  const isCompleted =
    activePractice?.session.baseSession.status === 'completed';

  const summary =
    activePractice && isCompleted
      ? getChemistrySessionSummary(
          activePractice.session,
          activePractice.answerKeys,
        )
      : null;

  const currentQuestionId = activePractice
    ? activePractice.session.baseSession.questionIds[
        activePractice.session.baseSession.currentQuestionIndex
      ]
    : null;

  const currentQuestion =
    activePractice && currentQuestionId
      ? activePractice.questionsById.get(currentQuestionId)
      : undefined;

  const totalQuestions =
    activePractice?.session.baseSession.questionIds.length ?? 0;

  const currentNumber = activePractice
    ? Math.min(
        activePractice.session.baseSession.currentQuestionIndex + 1,
        totalQuestions,
      )
    : 0;

  return (
    <section style={{ padding: '22px', color: '#f4ead5' }}>
      <div className="quest-icon">✎</div>

      <p className="eyebrow">LEARNING CENTER</p>
      <h2 style={{ marginTop: 0 }}>Chemistry Practice</h2>

      <p className="info-description">
        Practice with published chemistry questions and receive
        feedback from approved answer keys.
      </p>

      {!activePractice && (
        <div className="quest-objective">
          <span>QUESTION BANK</span>

          <p>
            Eligible questions: {eligibleQuestions.length}
          </p>

          {sourceStatus === 'loading' ? (
            <p role="status">
              Loading approved practice questions...
            </p>
          ) : sourceStatus === 'unavailable' ? (
            <p role="status">
              No published questions are connected yet.
              Practice is locked until verified question records
              and approved answer keys are supplied.
            </p>
          ) : eligibleQuestions.length === 0 ? (
            <p role="status">
              No eligible questions are available. Unverified,
              mismatched or synthetic records are excluded.
            </p>
          ) : (
            <>
              <p>
                {loadedQuestions.length - eligibleQuestions.length}
                {' '}record(s) excluded because they did not pass
                eligibility checks.
              </p>

              <button
                type="button"
                className="nav-item active"
                onClick={startPractice}
                style={{ width: '100%', marginTop: '14px' }}
              >
                START PRACTICE
              </button>
            </>
          )}

          {feedback && (
            <p role="status">{feedback}</p>
          )}
        </div>
      )}

      {activePractice && summary && (
        <div className="quest-objective">
          <span>SESSION COMPLETE</span>

          <h3>Practice Summary</h3>

          <p>Total questions: {summary.totalQuestions}</p>
          <p>Correct: {summary.correctAnswers}</p>
          <p>Incorrect: {summary.incorrectAnswers}</p>
          <p>Unanswered: {summary.unansweredQuestions}</p>
          <p>
            Evaluation unavailable: {summary.evaluationUnavailable}
          </p>

          <button
            type="button"
            className="nav-item active"
            onClick={endPractice}
            style={{ width: '100%', marginTop: '14px' }}
          >
            CLOSE SESSION
          </button>
        </div>
      )}

      {activePractice && !isCompleted && currentQuestion && (
        <div className="quest-objective">
          <span>
            QUESTION {currentNumber} / {totalQuestions}
          </span>

          {!waitingForNext && (
            <>
              <h3 style={{ lineHeight: 1.5 }}>
                {currentQuestion.presentation.prompt}
              </h3>

              <div style={{ display: 'grid', gap: '9px' }}>
                {currentQuestion.presentation.choices.map(
                  (choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className={
                        selectedChoice === choice.id
                          ? 'nav-item active'
                          : 'nav-item'
                      }
                      onClick={() => {
                        setSelectedChoice(choice.id);
                        setFeedback('');
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid rgba(213, 184, 120, 0.3)',
                      }}
                    >
                      <strong>{choice.id}.</strong>
                      {' '}{choice.text}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="nav-item active"
                disabled={!selectedChoice}
                onClick={() => submitAnswer(selectedChoice)}
                style={{
                  width: '100%',
                  marginTop: '14px',
                  opacity: selectedChoice ? 1 : 0.5,
                }}
              >
                SUBMIT ANSWER
              </button>

              <button
                type="button"
                className="nav-item"
                onClick={() => submitAnswer(null)}
                style={{ width: '100%' }}
              >
                SKIP QUESTION
              </button>
            </>
          )}

          {waitingForNext && (
            <>
              <p role="status">{feedback}</p>

              <button
                type="button"
                className="nav-item active"
                onClick={() => {
                  setWaitingForNext(false);
                  setFeedback('');
                }}
                style={{ width: '100%', marginTop: '14px' }}
              >
                CONTINUE
              </button>
            </>
          )}

          {!waitingForNext && feedback && (
            <p role="status">{feedback}</p>
          )}

          <button
            type="button"
            className="nav-item"
            onClick={endPractice}
            style={{ width: '100%', marginTop: '12px' }}
          >
            END SESSION
          </button>
        </div>
      )}
    </section>
  );
}

export default PracticePanel;