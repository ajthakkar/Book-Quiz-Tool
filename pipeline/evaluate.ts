/* Measure whether the questions actually need the book.
   Run: npm run evaluate -- [book-id ...] [--baseline]

   Two tests for every multiple-choice question in the bank:
   - Open book: the model gets the chapter and answers. It should get nearly all of
     them right; a miss means the answer key or the question is off.
   - Closed book: the model gets only the title and author. A question it can answer
     anyway could be answered from summaries, which is the v1 problem.

   --baseline also generates questions the v1 way (title only, pipeline/v1-prompt.ts)
   and runs the closed-book test on those, for comparison. Results go to
   data/reports/evaluation.json. */
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { BankFile, Book, ChoiceQuestion } from "../src/lib/types.ts";
import { catalog } from "./catalog.ts";
import { ask, cost } from "./claude.ts";
import { buildQuizGenerationPrompt } from "./v1-prompt.ts";

const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith("--"));
const baseline = args.includes("--baseline");
const books = catalog.filter((b) => ids.length === 0 || ids.includes(b.id));

const Answer = z.object({ answer: z.enum(["A", "B", "C", "D"]) });
const LETTERS = ["A", "B", "C", "D"] as const;
const SOLVER = "You are taking a reading quiz. Answer with the letter of the best choice.";

function asQuiz(stem: string, choices: string[]) {
  return `${stem}\n\n${choices.map((c, i) => `${LETTERS[i]}. ${c}`).join("\n")}`;
}

async function solve(question: string, context?: string) {
  const { answer } = await ask({ system: SOLVER, context, prompt: question, schema: Answer, effort: "low", maxTokens: 4000 });
  return LETTERS.indexOf(answer);
}

type Tally = { right: number; total: number };
const rate = (t: Tally) => (t.total ? Math.round((1000 * t.right) / t.total) / 10 : null);

const results: Record<string, unknown> = {};
const overall = { open: { right: 0, total: 0 }, closed: { right: 0, total: 0 }, v1Closed: { right: 0, total: 0 } };

for (const entry of books) {
  const bank: BankFile = JSON.parse(readFileSync(`data/bank/${entry.id}.json`, "utf8"));
  const book: Book = JSON.parse(readFileSync(`data/books/${entry.id}.json`, "utf8"));
  const questions = bank.questions.filter((q): q is ChoiceQuestion & { position: number } => q.type === "choice" && q.choices.length === 4);
  const open: Tally = { right: 0, total: 0 };
  const closed: Tally = { right: 0, total: 0 };
  const bySkill: Record<string, { open: Tally; closed: Tally }> = {};
  const misses: string[] = [];

  for (const q of questions) {
    const chapter = book.chapters.find((c) => c.n === q.chapter)!;
    const quiz = asQuiz(q.stem, q.choices);
    const context = `${book.title} by ${book.author}, ${chapter.title}\n\n<chapter>\n${chapter.text}\n</chapter>`;
    const o = (await solve(quiz, context)) === q.answer;
    const c = (await solve(`This question is about ${book.title} by ${book.author}.\n\n${quiz}`)) === q.answer;
    open.total++;
    closed.total++;
    if (o) open.right++;
    else misses.push(q.id);
    if (c) closed.right++;
    const s = (bySkill[q.skill] ??= { open: { right: 0, total: 0 }, closed: { right: 0, total: 0 } });
    s.open.total++;
    s.closed.total++;
    if (o) s.open.right++;
    if (c) s.closed.right++;
  }

  let v1: Tally | null = null;
  if (baseline) {
    // v1: questions written from the title alone, then the same closed-book test.
    const V1Quiz = z.object({
      questions: z.array(z.object({ stem: z.string(), choices: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })).optional() })),
    });
    const grade = book.grades[1] <= 5 ? "3-5" : book.grades[1] <= 8 ? "6-8" : "9-12";
    const generated = await ask({ system: "Follow the instructions exactly.", prompt: buildQuizGenerationPrompt(book.title, grade, book.author), schema: V1Quiz });
    v1 = { right: 0, total: 0 };
    for (const g of generated.questions) {
      if (!g.choices || g.choices.length !== 4) continue;
      const key = g.choices.findIndex((c) => c.isCorrect);
      if (key < 0) continue;
      const picked = await solve(`This question is about ${book.title} by ${book.author}.\n\n${asQuiz(g.stem, g.choices.map((c) => c.text))}`);
      v1.total++;
      if (picked === key) v1.right++;
    }
    overall.v1Closed.right += v1.right;
    overall.v1Closed.total += v1.total;
  }

  overall.open.right += open.right;
  overall.open.total += open.total;
  overall.closed.right += closed.right;
  overall.closed.total += closed.total;
  results[entry.id] = {
    questions: questions.length,
    openBook: rate(open),
    closedBook: rate(closed),
    v1ClosedBook: v1 ? rate(v1) : undefined,
    bySkill: Object.fromEntries(Object.entries(bySkill).map(([k, v]) => [k, { openBook: rate(v.open), closedBook: rate(v.closed), n: v.open.total }])),
    openBookMisses: misses,
  };
  console.log(
    `${entry.id.padEnd(18)} open book ${rate(open)}%   closed book ${rate(closed)}%${v1 ? `   v1 closed book ${rate(v1)}%` : ""}   ($${cost().toFixed(2)} so far)`,
  );
}

const summary = {
  openBook: rate(overall.open),
  closedBook: rate(overall.closed),
  v1ClosedBook: baseline ? rate(overall.v1Closed) : undefined,
  chance: 25,
  cost: Math.round(cost() * 100) / 100,
  books: results,
};
writeFileSync("data/reports/evaluation.json", JSON.stringify(summary, null, 1));
console.log(`\nOpen book ${summary.openBook}%, closed book ${summary.closedBook}% (chance is 25%). Cost $${summary.cost}.`);
