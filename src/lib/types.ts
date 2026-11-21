/* Shared by the pipeline (pipeline/*.ts, run with Node) and the web app. */

export const SKILLS = ["detail", "sequence", "cause", "character", "vocab", "inference", "theme"] as const;
export type Skill = (typeof SKILLS)[number];

export const skillInfo: Record<Skill, { name: string; what: string; tip: string }> = {
  detail: {
    name: "Key details",
    what: "Remembering specific facts the book states outright.",
    tip: "When something surprises you, slow down and picture it. Surprising details are the ones worth remembering.",
  },
  sequence: {
    name: "Order of events",
    what: "Keeping track of what happened when.",
    tip: "After each chapter, sum it up in one sentence. A list of those sentences is the whole plot in order.",
  },
  cause: {
    name: "Cause and effect",
    what: "Explaining why something happened and what it led to.",
    tip: "When a character makes a choice, ask what made them do it, and what changed because of it.",
  },
  character: {
    name: "Characters",
    what: "Understanding what characters feel, want, and are like.",
    tip: "Notice what characters do, not just what they say. Actions show what they really want.",
  },
  vocab: {
    name: "Words in context",
    what: "Working out what a word means from the sentence around it.",
    tip: "When a word is new, reread the whole sentence and guess before you look it up. Then check your guess.",
  },
  inference: {
    name: "Reading between the lines",
    what: "Figuring out what the book suggests but doesn't say.",
    tip: "Ask why the author included a detail. If it seems small, it's probably there for a reason.",
  },
  theme: {
    name: "Big ideas",
    what: "Seeing what the book is really about: themes, symbols, and the author's point.",
    tip: "Look for things that come back again and again: an object, a phrase, a kind of choice. Repeats usually carry the meaning.",
  },
};

/** 1 = stated in the text, 2 = put together from the text, 3 = interpret or analyze. */
export type Level = 1 | 2 | 3;

export const levelName: Record<Level, string> = { 1: "Stated", 2: "Connected", 3: "Interpreted" };

export type Evidence = { chapter: number; quote: string };

type QuestionBase = {
  id: string;
  bookId: string;
  skill: Skill;
  level: Level;
  /** The latest chapter a reader needs to have finished. Used to avoid spoilers. */
  chapter: number;
  stem: string;
  explanation: string;
  /** Who wrote the question. See README: "Where the demo questions came from". */
  source: string;
};

export type ChoiceQuestion = QuestionBase & {
  type: "choice";
  choices: string[];
  /** Index into `choices` of the correct answer. The app shuffles choices before showing them. */
  answer: number;
  /** Verbatim passages that support the answer. The validator checks each one against the book. */
  evidence: Evidence[];
};

export type OrderEvent = { text: string; evidence: Evidence };

export type OrderQuestion = QuestionBase & {
  type: "order";
  /** Events in any order. The correct order is computed from where each quote appears in the book. */
  events: OrderEvent[];
};

export type Question = ChoiceQuestion | OrderQuestion;

export type BookStats = {
  words: number;
  sentences: number;
  /** Flesch–Kincaid grade level of the full text. */
  fkGrade: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
  /** Share of words with three or more syllables. */
  longWords: number;
};

export type Chapter = { n: number; title: string; text: string; words: number };

export type Book = {
  id: string;
  title: string;
  author: string;
  year: number;
  gutenbergId: number;
  grades: [number, number];
  stats: BookStats;
  chapters: Chapter[];
};

/** A validated question as the app stores it: order questions carry their computed answer. */
export type BankQuestion = (ChoiceQuestion | (OrderQuestion & { order: number[] })) & {
  /** Where the evidence sits in the book, 0 to 1. Used for the coverage report. */
  position: number;
};

/** One book's file in data/bank/, which the web app loads. Everything except the full text. */
export type BankFile = {
  book: Omit<Book, "chapters"> & { chapters: { n: number; title: string }[] };
  questions: BankQuestion[];
};
