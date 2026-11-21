import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProgress, mastery, pickQuiz, record, defaultBand } from "../src/lib/adaptive.ts";
import { readability, syllables } from "../src/lib/readability.ts";
import { findQuote, normalize } from "../src/lib/text.ts";
import type { BankQuestion, Book, ChoiceQuestion, OrderQuestion } from "../src/lib/types.ts";
import { checkQuestion } from "../src/lib/validate.ts";
import { splitChapters, stripGutenberg, unwrap } from "../pipeline/prepare.ts";

const book: Book = {
  id: "test",
  title: "Test Book",
  author: "A. Writer",
  year: 1900,
  gutenbergId: 0,
  grades: [6, 8],
  stats: readability("A cat sat."),
  chapters: [
    { n: 1, title: "One", words: 0, text: "Mary found a brass key under the loose stone by the garden wall. “It must open something,” she said." + " Filler sentence about the weather.".repeat(40) },
    { n: 2, title: "Two", words: 0, text: "The robin showed her the door hidden behind the ivy, and she turned the key with both hands." + " More filler about the moor.".repeat(40) },
    { n: 3, title: "Three", words: 0, text: "Colin stood up from his wheelchair for the first time and walked across the grass." + " Even more filler text here.".repeat(40) },
  ],
};

const choice = (over: Partial<ChoiceQuestion> = {}): ChoiceQuestion => ({
  id: "q1",
  bookId: "test",
  type: "choice",
  skill: "detail",
  level: 1,
  chapter: 1,
  stem: "Where did Mary find the key?",
  choices: ["Under a stone by the wall", "In a drawer upstairs", "Inside the robin's nest", "Behind a painting"],
  answer: 0,
  evidence: [{ chapter: 1, quote: "Mary found a brass key under the loose stone by the garden wall." }],
  explanation: "The book says she found it under a loose stone by the wall.",
  source: "test",
  ...over,
});

test("normalize ignores curly quotes, dashes, italics, and spacing", () => {
  assert.equal(normalize("“It’s _here_”—he  said"), normalize('"It\'s here" - he said'));
  assert.ok(findQuote(book.chapters[0].text, '"It must open something," she said.') >= 0);
});

test("syllables and Flesch-Kincaid behave sensibly", () => {
  assert.equal(syllables("cat"), 1);
  assert.equal(syllables("garden"), 2);
  assert.equal(syllables("wonderful"), 3);
  const easy = readability("The cat sat. The dog ran. We had fun.");
  const hard = readability("Notwithstanding considerable institutional resistance, administrators implemented comprehensive organizational restructuring.");
  assert.ok(hard.fkGrade > easy.fkGrade + 8);
});

test("a question with real evidence passes", () => {
  const c = checkQuestion(choice(), book);
  assert.deepEqual(c.errors, []);
  assert.ok(c.ok && c.question && c.question.position < 0.34);
});

test("made-up evidence is rejected", () => {
  const c = checkQuestion(choice({ evidence: [{ chapter: 1, quote: "Mary found a golden key inside the old clock tower." }] }), book);
  assert.ok(!c.ok);
  assert.match(c.errors[0], /not found/);
});

test("evidence from the wrong chapter is caught", () => {
  const c = checkQuestion(choice({ chapter: 2, evidence: [{ chapter: 2, quote: "Mary found a brass key under the loose stone by the garden wall." }] }), book);
  assert.ok(!c.ok);
  assert.match(c.errors.join(), /in chapter 1, not 2/);
});

test("a spoiler is caught: evidence after the question's chapter", () => {
  const c = checkQuestion(choice({ chapter: 1, evidence: [{ chapter: 3, quote: "Colin stood up from his wheelchair for the first time" }] }), book);
  assert.ok(!c.ok);
});

test("a correct answer that is much longer than the others is rejected", () => {
  const c = checkQuestion(
    choice({ choices: ["Under the loose stone right by the old garden wall, where she was digging", "Upstairs", "A nest", "A frame"] }),
    book,
  );
  assert.ok(!c.ok);
  assert.match(c.errors.join(), /much longer/);
});

test("'all of the above' and duplicate choices are rejected", () => {
  assert.ok(!checkQuestion(choice({ choices: ["Under a stone by the wall", "In a drawer", "In a nest", "All of the above"] }), book).ok);
  assert.ok(!checkQuestion(choice({ choices: ["Under a stone", "under a stone", "In a nest", "Behind a painting"] }), book).ok);
});

test("order questions are graded by where the quotes fall, not by the order given", () => {
  const q: OrderQuestion = {
    id: "o1",
    bookId: "test",
    type: "order",
    skill: "sequence",
    level: 1,
    chapter: 3,
    stem: "Put these in order.",
    explanation: "In book order.",
    source: "test",
    events: [
      { text: "Colin walks", evidence: { chapter: 3, quote: "Colin stood up from his wheelchair for the first time" } },
      { text: "Mary finds the key", evidence: { chapter: 1, quote: "Mary found a brass key under the loose stone" } },
      { text: "The robin shows the door", evidence: { chapter: 2, quote: "The robin showed her the door hidden behind the ivy" } },
    ],
  };
  const c = checkQuestion(q, book);
  assert.ok(c.ok, c.errors.join());
  assert.deepEqual((c.question as OrderQuestion & { order: number[] }).order, [1, 2, 0]);
});

test("Gutenberg header and footer are stripped and lines are unwrapped", () => {
  const raw = "License stuff\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\nHello\nworld.\n\nNext para.\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nMore license";
  const body = stripGutenberg(raw);
  assert.ok(!body.includes("License"));
  assert.equal(unwrap(body), "Hello world.\n\nNext para.");
});

test("chapters split on headings, and 'the end' mid-sentence is kept", () => {
  const body = "Chapter I. Start\nIt was all but\nthe end of the trail.\n\nChapter II. Finish\nDone.\n\nTHE END\n\nAppendix";
  const chapters = splitChapters(body, {
    id: "x",
    gutenbergId: 0,
    title: "X",
    author: "Y",
    year: 1,
    grades: [1, 2],
    chapterHeading: /^Chapter [IVX]+\. .+$/,
  });
  assert.equal(chapters.length, 2);
  assert.match(chapters[0].text, /the end of the trail/);
  assert.equal(chapters[1].text, "Done.");
});

const bankQ = (id: string, skill: BankQuestion["skill"], level: 1 | 2 | 3, chapter: number): BankQuestion => ({
  ...choice({ id, skill, level, chapter }),
  position: chapter / 10,
});

test("quizzes never include chapters the reader hasn't finished", () => {
  const bank = [bankQ("a", "detail", 1, 1), bankQ("b", "cause", 2, 2), bankQ("c", "theme", 3, 5), bankQ("d", "vocab", 1, 6)];
  const quiz = pickQuiz(bank, { chaptersRead: 2, band: "on-level", length: 10, progress: emptyProgress(), seed: 1 });
  assert.deepEqual(quiz.map((q) => q.id).sort(), ["a", "b"]);
});

test("weak skills come up more often", () => {
  const skills = ["detail", "sequence", "cause", "character", "vocab", "inference", "theme"] as const;
  const bank = Array.from({ length: 70 }, (_, i) => bankQ(`q${i}`, skills[i % 7], 1, 1));
  let progress = emptyProgress();
  for (const s of skills) {
    const correct = s !== "vocab";
    progress = record(progress, Array.from({ length: 10 }, (_, i) => ({ id: `${s}${i}`, skill: s, correct })));
  }
  let vocab = 0;
  const runs = 300;
  for (let seed = 1; seed <= runs; seed++) {
    const quiz = pickQuiz(bank, { chaptersRead: 1, band: "on-level", length: 6, progress, seed });
    assert.equal(quiz.length, 6);
    vocab += quiz.filter((q) => q.skill === "vocab").length;
  }
  // With equal weights vocab would average 6/7 = 0.86 questions per quiz.
  assert.ok(vocab / runs > 1.5, `vocab per quiz was ${vocab / runs}`);
  assert.ok(mastery(progress.skills.detail) > 0.9 && mastery(progress.skills.vocab) < 0.1);
});

test("starting difficulty follows the reader's grade", () => {
  assert.equal(defaultBand(4, [6, 8]), "easier");
  assert.equal(defaultBand(7, [6, 8]), "on-level");
  assert.equal(defaultBand(11, [6, 8]), "challenge");
});
