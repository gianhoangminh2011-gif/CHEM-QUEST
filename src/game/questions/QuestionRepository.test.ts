import { describe, expect, it } from 'vitest';
import { createQuestionRepository } from './QuestionRepository';

describe('QuestionRepository', () => {
  it('starts empty', () => {
    const repository =
      createQuestionRepository<{ prompt: string }>();

    expect(repository.size).toBe(0);
    expect(repository.list()).toEqual([]);
  });

  it('stores and retrieves an opaque fixed-question payload', () => {
    const repository =
      createQuestionRepository<{ prompt: string }>();

    const payload = {
      prompt: 'Sample prompt',
    };

    const result = repository.add('Q-001', payload);

    expect(result.status).toBe('added');

    expect(repository.getById('Q-001')).toEqual({
      questionId: 'Q-001',
      payload,
    });

    expect(repository.has('Q-001')).toBe(true);
    expect(repository.size).toBe(1);
  });

  it('rejects blank IDs without changing the repository', () => {
    const repository =
      createQuestionRepository<unknown>();

    expect(repository.add('', {})).toEqual({
      status: 'invalid_id',
    });

    expect(repository.add('   ', {})).toEqual({
      status: 'invalid_id',
    });

    expect(repository.size).toBe(0);
  });

  it('rejects duplicate IDs and preserves the original record', () => {
    const repository =
      createQuestionRepository<{ version: number }>();

    repository.add('Q-001', { version: 1 });

    const duplicate = repository.add(
      'Q-001',
      { version: 2 },
    );

    expect(duplicate.status).toBe('duplicate');

    expect(
      repository.getById('Q-001')?.payload,
    ).toEqual({ version: 1 });

    expect(repository.size).toBe(1);
  });

  it('preserves IDs exactly instead of silently normalizing them', () => {
    const repository =
      createQuestionRepository<string>();

    const result = repository.add(
      ' Q-001 ',
      'opaque',
    );

    expect(result.status).toBe('added');
    expect(repository.has(' Q-001 ')).toBe(true);
    expect(repository.has('Q-001')).toBe(false);
  });

  it('returns an immutable list snapshot in insertion order', () => {
    const repository =
      createQuestionRepository<number>();

    repository.add('Q-002', 2);
    repository.add('Q-001', 1);

    const snapshot = repository.list();

    expect(
      snapshot.map((item) => item.questionId),
    ).toEqual(['Q-002', 'Q-001']);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
  });

  it('does not expose a missing record', () => {
    const repository =
      createQuestionRepository<unknown>();

    expect(repository.getById('missing')).toBeNull();
    expect(repository.has('missing')).toBe(false);
  });
});