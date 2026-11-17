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
  if (!questionId.trim()) {
    throw new Error("Question ID is required.");
  }

  if (!prompt.trim()) {
    throw new Error("Question prompt is required.");
  }

  if (choices.length < 2) {
    throw new Error("A question must have at least two choices.");
  }

  return {
    questionId,
    prompt,
    choices: choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
    })),
  };
}