/* Generate draft questions from the actual text of each book.
   Run: npm run generate -- [book-id ...] [--per-chapter 4]
   Writes data/drafts/<id>.generated.json. Then run `npm run validate` to check them. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Book, ChoiceQuestion, OrderQuestion, Question } from "../src/lib/types.ts";
import { catalog } from "./catalog.ts";
import { ask, cost, MODEL } from "./claude.ts";
import { ChapterQuestions, chapterPrompt, eventsPrompt, KeyEvents, SYSTEM } from "./prompt.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const perChapter = flag("--per-chapter", 4);
const ids = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const books = catalog.filter((b) => ids.length === 0 || ids.includes(b.id));
const source = `${MODEL} via pipeline/generate.ts`;

mkdirSync("data/drafts", { recursive: true });

for (const entry of books) {
  const book: Book = JSON.parse(readFileSync(`data/books/${entry.id}.json`, "utf8"));
  const band = `${book.grades[0]}-${book.grades[1]}`;
  const drafts: Question[] = [];

  for (const chapter of book.chapters) {
    // Short chapters get fewer questions.
    const count = Math.max(2, Math.min(perChapter, Math.round(chapter.words / 700)));
    const prompt = chapterPrompt(book, chapter, { count, gradeBand: band });
    const out = await ask({ system: SYSTEM, prompt, schema: ChapterQuestions });
    out.questions.forEach((g, i) => {
      const q: ChoiceQuestion = {
        id: `${book.id}-c${chapter.n}-g${i + 1}`,
        bookId: book.id,
        type: "choice",
        skill: g.skill,
        level: g.level,
        chapter: chapter.n,
        stem: g.stem,
        choices: g.choices,
        answer: g.answer,
        evidence: g.evidence.map((quote) => ({ chapter: chapter.n, quote })),
        explanation: g.explanation,
        source,
      };
      drafts.push(q);
    });
    console.log(`${book.id} ch ${chapter.n}: ${out.questions.length} questions`);
  }

  // Order-of-events questions. The model lists key events with quotes; the order
  // used for grading comes from where those quotes sit in the book, not from the model.
  const { events } = await ask({ system: SYSTEM, ...eventsPrompt(book, { count: 12 }), schema: KeyEvents });
  const sorted = [...events].sort((a, b) => a.chapter - b.chapter);
  // Each question uses 4 events spread out across the part of the book read so far.
  for (let end = 4; end <= sorted.length; end += 3) {
    const window = sorted.slice(0, end);
    const pick = [0, Math.floor(window.length / 3), Math.floor((2 * window.length) / 3), window.length - 1].map((i) => window[i]);
    const q: OrderQuestion = {
      id: `${book.id}-order-${end}`,
      bookId: book.id,
      type: "order",
      skill: "sequence",
      level: end <= 4 ? 1 : 2,
      chapter: Math.max(...pick.map((e) => e.chapter)),
      stem: "Put these events in the order they happen.",
      events: pick.map((e) => ({ text: e.event, evidence: { chapter: e.chapter, quote: e.quote } })),
      explanation: "Each event is placed where it happens in the book.",
      source,
    };
    drafts.push(q);
  }

  writeFileSync(`data/drafts/${book.id}.generated.json`, JSON.stringify(drafts, null, 1));
  console.log(`${book.id}: ${drafts.length} drafts written. Spent so far: $${cost().toFixed(2)}`);
}
