export type GradeLevel =
  | "K-2"
  | "3-5"
  | "6-8"
  | "9-12"
  | "college";

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export type ComprehensionSkill =
  | "literal-explicit"
  | "literal-sequence"
  | "literal-character-traits"
  | "inferential-conclusions"
  | "inferential-motivation"
  | "inferential-prediction"
  | "inferential-cause-effect"
  | "evaluative-purpose"
  | "evaluative-decisions"
  | "evaluative-perspectives"
  | "analytical-devices"
  | "analytical-structure"
  | "analytical-word-choice"
  | "analytical-theme"
  | "applied-connections"
  | "applied-synthesis";

export type QuestionType =
  | "multiple_choice"
  | "short_response"
  | "extended_response";

export interface AnswerChoice {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  bloomLevel: BloomLevel;
  comprehensionSkill: ComprehensionSkill;
  questionType: QuestionType;
  stem: string;
  choices?: AnswerChoice[];
  correctAnswer: string;
  explanation: string;
  textReference: string;
  difficulty: number;
  skillTag: string;
}

export interface QuizResult {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent?: number;
}

export interface SkillBreakdown {
  skill: string;
  correct: number;
  total: number;
  label: string;
}

export interface FeedbackReport {
  overallScore: number;
  totalQuestions: number;
  strengths: string[];
  growthAreas: string[];
  questionFeedback: {
    questionId: string;
    wasCorrect: boolean;
    feedback: string;
  }[];
  parentSummary: string;
  skillBreakdown: SkillBreakdown[];
  nextSteps: string[];
}

export interface GenerateQuizRequest {
  bookTitle: string;
  author?: string;
  gradeLevel: GradeLevel;
  chapters?: string;
  focusAreas?: string;
  questionCount?: number;
}

export interface GeneratedQuiz {
  bookTitle: string;
  author: string;
  gradeLevel: GradeLevel;
  questions: Question[];
  bookSummaryContext: string;
}
