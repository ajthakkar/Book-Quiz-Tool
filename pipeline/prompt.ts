/* The v2 prompt. The big change from v1: the model gets the chapter's full text,
   and every answer has to come with words copied from it, which the validator checks. */
import { z } from "zod";
import { SKILLS, skillInfo, type Book, type Chapter } from "../src/lib/types.ts";

export const GeneratedQuestion = z.object({
  skill: z.enum(SKILLS),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: z.string(),
  choices: z.array(z.string()),
  answer: z.number().int(),
  evidence: z.array(z.string()),
  explanation: z.string(),
});
export const ChapterQuestions = z.object({ questions: z.array(GeneratedQuestion) });

export const KeyEvent = z.object({ event: z.string(), chapter: z.number().int(), quote: z.string() });
export const KeyEvents = z.object({ events: z.array(KeyEvent) });

export const SYSTEM = `You write reading-comprehension questions for students, the kind a good English teacher would write after reading the chapter closely.

You only ever use the chapter text you are given. Do not rely on what you remember about the book, its summaries, study guides, or film versions: those are exactly what a student who skipped the reading would know. A good question is easy for someone who read the chapter carefully and hard for someone who only knows the plot from elsewhere.`;

const levelGuide = `Levels:
1 = the answer is stated directly in the text.
2 = the reader has to connect two or more parts of the text.
3 = the reader has to interpret: a motive, a theme, a symbol, or why the author made a choice.`;

export function chapterPrompt(book: Book, chapter: Chapter, opts: { count: number; gradeBand: string }) {
  const skills = SKILLS.filter((s) => s !== "sequence")
    .map((s) => `- ${s}: ${skillInfo[s].what}`)
    .join("\n");
  return `Book: ${book.title} by ${book.author} (${book.year})
Students: grades ${opts.gradeBand}
Chapter ${chapter.n} of ${book.chapters.length}: ${chapter.title}

<chapter>
${chapter.text}
</chapter>

Write ${opts.count} multiple-choice questions about this chapter.

Skills (use a mix; at least one detail question and one vocab question when the chapter allows):
${skills}

${levelGuide}
Use roughly a third of each level. Write the questions in language a student in grades ${opts.gradeBand} can read easily, even when the book's language is harder.

Rules for every question:
- Exactly 4 choices and one correct answer. "answer" is the index (0-3) of the correct choice.
- The wrong choices must be plausible to someone who skimmed: use real names, places, and events from the book where you can. Keep all four choices about the same length. Never use "all of the above" or "none of the above".
- Ask about specific moments and details from this chapter, not about the book's famous plot points or general reputation.
- "evidence": 1 or 2 passages copied word for word from the chapter above (8 to 40 words each) that prove the answer. Copy them exactly, including punctuation. They will be checked against the text automatically, and any question whose evidence isn't found is thrown away.
- For vocab questions, pick a word a student in grades ${opts.gradeBand} might not know, ask what it means as used in the sentence, and quote that sentence as evidence.
- "explanation": one or two sentences to the student, after they answer, saying why the answer is right and pointing to the passage.`;
}

/** The whole book goes in `context` (cached); the instructions go in `prompt`. */
export function eventsPrompt(book: Book, opts: { count: number }) {
  const text = book.chapters.map((c) => `<chapter n="${c.n}" title="${c.title}">\n${c.text}\n</chapter>`).join("\n\n");
  const context = `Book: ${book.title} by ${book.author}\n\n${text}`;
  const prompt = `List ${opts.count} key events from the whole book, spread across its chapters, in the order they happen in the text.

For each event:
- "event": one short sentence a student would recognize, in plain words (no quotes).
- "chapter": the chapter number where it happens.
- "quote": 10 to 30 words copied word for word from that chapter where the event happens. It will be checked against the text automatically.

Choose events a careful reader would remember, including some that are not in the book's usual summaries.`;
  return { context, prompt };
}
