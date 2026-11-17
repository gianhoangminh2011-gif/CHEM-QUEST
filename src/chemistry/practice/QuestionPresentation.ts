
export type QuestionChoice = {
  id: string;
  text: string;
};

export type QuestionPresentationData = {
  questionId: string;
  prompt: string;
  choices: QuestionChoice[];
};

export function createQuestionPresentation(
  questionId: string,
  prompt: string,
  choices: QuestionChoice[]
): QuestionPresentationData {
  if (typeof questionId !== "string" || !questionId.trim()) {
    throw new Error("Question ID is required.");
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Question prompt is required.");
  }

  if (!Array.isArray(choices) || choices.length < 2) {
    throw new Error("A question must have at least two choices.");
  }

  const choiceIds = new Set<string>();

  for (const choice of choices) {
    if (
      !choice ||
      typeof choice.id !== "string" ||
      !choice.id.trim()
    ) {
      throw new Error("Every choice must have a valid ID.");
    }

    if (
      typeof choice.text !== "string" ||
      !choice.text.trim()
    ) {
      throw new Error("Every choice must have valid text.");
    }

    const normalizedId = choice.id.trim();

    if (choiceIds.has(normalizedId)) {
      throw new Error("Choice IDs must be unique.");
    }

    choiceIds.add(normalizedId);
  }

  return {
    questionId: questionId.trim(),
    prompt: prompt.trim(),
    choices: choices.map((choice) => ({
      id: choice.id.trim(),
      text: choice.text.trim(),
    })),
  };
}
