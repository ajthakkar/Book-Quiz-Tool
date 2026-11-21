/* Checks every question against the book before it can be used.
   The point: a question only gets into the bank if its answer is backed by
   text that is actually in the book, in the chapter it claims. */
import { gradeOf } from "./readability.ts";
import { findQuote, normalize } from "./text.ts";
import { SKILLS, type BankQuestion, type Book, type Evidence, type Question } from "./types.ts";

export type Check = {
  id: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Present when ok. */
  question?: BankQuestion;
};

const MIN_QUOTE = 20;
const BANNED_CHOICES = /\b(all|none|both|neither) of the (above|these)\b/i;

/** Absolute character offset of a quote in the whole book, or an error message. */
function locate(book: Book, ev: Evidence): { offset: number } | { error: string } {
  if (normalize(ev.quote).length < MIN_QUOTE) return { error: `evidence too short to check: "${ev.quote}"` };
  const chapter = book.chapters.find((c) => c.n === ev.chapter);
  if (!chapter) return { error: `chapter ${ev.chapter} doesn't exist` };
  const at = findQuote(chapter.text, ev.quote);
  if (at >= 0) {
    const before = book.chapters.filter((c) => c.n < ev.chapter).reduce((sum, c) => sum + normalize(c.text).length + 1, 0);
    return { offset: before + at };
  }
  const elsewhere = book.chapters.find((c) => findQuote(c.text, ev.quote) >= 0);
  if (elsewhere) return { error: `quote is in chapter ${elsewhere.n}, not ${ev.chapter}: "${ev.quote.slice(0, 60)}"` };
  return { error: `quote not found in the book: "${ev.quote.slice(0, 80)}"` };
}

function bookLength(book: Book): number {
  return book.chapters.reduce((sum, c) => sum + normalize(c.text).length + 1, 0);
}

export function checkQuestion(q: Question, book: Book): Check {
  const errors: string[] = [];
  const warnings: string[] = [];
  const total = bookLength(book);

  if (q.bookId !== book.id) errors.push(`bookId ${q.bookId} doesn't match ${book.id}`);
  if (!SKILLS.includes(q.skill)) errors.push(`unknown skill ${q.skill}`);
  if (![1, 2, 3].includes(q.level)) errors.push(`level must be 1, 2, or 3`);
  if (!book.chapters.some((c) => c.n === q.chapter)) errors.push(`chapter ${q.chapter} doesn't exist`);
  if (q.stem.trim().length < 10) errors.push("stem is too short");
  if (!q.explanation || q.explanation.trim().length < 10) errors.push("explanation is missing");

  // The question's reading level shouldn't be far above the book's audience.
  const grade = gradeOf(q.type === "choice" ? `${q.stem} ${q.choices.join(". ")}` : q.stem);
  if (grade > book.grades[1] + 3) warnings.push(`question reads at grade ${grade}, above the book's grades ${book.grades.join("-")}`);

  if (q.type === "choice") {
    if (q.choices.length < 3 || q.choices.length > 4) errors.push("needs 3 or 4 choices");
    const norm = q.choices.map((c) => normalize(c));
    if (new Set(norm).size !== norm.length) errors.push("two choices are the same");
    if (q.choices.some((c) => BANNED_CHOICES.test(c))) errors.push('no "all/none of the above"');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) errors.push("answer index out of range");
    else {
      // Test-wise students pick the longest choice. Make sure that doesn't work.
      const lengths = q.choices.map((c) => c.length);
      const others = lengths.filter((_, i) => i !== q.answer);
      const mean = others.reduce((a, b) => a + b, 0) / others.length;
      if (lengths[q.answer] > 1.6 * mean && lengths[q.answer] === Math.max(...lengths))
        errors.push("the correct choice is much longer than the others");
      if (normalize(q.stem).includes(norm[q.answer]) && norm[q.answer].length > 12) errors.push("the stem gives away the answer");
    }
    if (!q.evidence?.length) errors.push("no evidence");
    let first = Infinity;
    for (const ev of q.evidence ?? []) {
      if (ev.chapter > q.chapter) errors.push(`evidence from chapter ${ev.chapter} is past the question's chapter ${q.chapter}`);
      const r = locate(book, ev);
      if ("error" in r) errors.push(r.error);
      else first = Math.min(first, r.offset);
    }
    if (errors.length) return { id: q.id, ok: false, errors, warnings };
    return { id: q.id, ok: true, errors, warnings, question: { ...q, position: round(first / total) } };
  }

  // Order questions: the answer is wherever the quotes fall in the book, not what anyone claims.
  if (q.events.length < 3 || q.events.length > 5) errors.push("needs 3 to 5 events");
  const offsets: number[] = [];
  for (const e of q.events) {
    if (e.evidence.chapter > q.chapter) errors.push(`event from chapter ${e.evidence.chapter} is past the question's chapter ${q.chapter}`);
    const r = locate(book, e.evidence);
    if ("error" in r) errors.push(r.error);
    else offsets.push(r.offset);
  }
  if (errors.length) return { id: q.id, ok: false, errors, warnings };
  const order = offsets.map((_, i) => i).sort((a, b) => offsets[a] - offsets[b]);
  // Events that happen almost at once make the order a coin flip. Require a real gap.
  const sorted = [...offsets].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if ((sorted[i] - sorted[i - 1]) / total < 0.01) errors.push("two events are too close together in the book to order fairly");
  }
  if (errors.length) return { id: q.id, ok: false, errors, warnings };
  return { id: q.id, ok: true, errors, warnings, question: { ...q, order, position: round(sorted[0] / total) } };
}

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}
