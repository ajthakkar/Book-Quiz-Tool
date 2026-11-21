# Chapter & Verse

*To cite chapter and verse: to point to the exact source.*

Reading-comprehension quizzes written from the **full text** of a book, where every answer has to point to the passage it came from, and a checker confirms that passage is really in the book before the question can be used.

**Try it:** [ajthakkar.github.io/chapter-and-verse](https://ajthakkar.github.io/chapter-and-verse/). Pick your grade, a book, and how far you've read.

## The problem with version 1

The first version (June 2026, then called Book Quiz Tool, still in the git history) asked Claude for a quiz given only a book's **title**. The model never saw the book. So the questions came from what's written *about* the book (summaries, study guides, the movie) and skewed to the same few famous scenes. There was also no way to check an answer key, and a student who had only read a summary could pass.

## What version 2 does

| | v1 | v2 |
|---|---|---|
| What the model sees | The title | The full chapter text |
| Books | Any title you type | Public-domain books from Project Gutenberg, so the text is free to use |
| Proof for each answer | None | 1–2 passages copied word for word from the chapter |
| Checking | None | Every passage is searched for in the book. If it isn't there, in that chapter, the question is thrown out |
| Spoilers | Whole book | "I've read through chapter N": nothing past it |
| Difficulty | Grade band only | Book reading level, plus question level: stated, connected, or interpreted |
| Practice | One score | Seven skills tracked over time; the next quiz leans toward the weakest |

Question types: key details, order of events (put four events in order), cause and effect, characters, words in context, reading between the lines, and big ideas (themes and symbols).

## How it works

```
Project Gutenberg ── fetch-books.ts ── prepare.ts ──► data/books/<id>.json   (chapters + reading level)
                                                         │
                       generate.ts (Claude, needs a key) ┤  or hand-written drafts
                                                         ▼
                                            data/drafts/<id>.*.json
                                                         │
                                      validate.ts ───────┤  checks every question against the text
                                                         ▼
                                            data/bank/<id>.json ──► the web app (static, no server)
                                                         │
                                      evaluate.ts (Claude, needs a key): does the question need the book?
```

### The checker (`src/lib/validate.ts`)

A question only reaches the app if:

- every evidence passage is found in the book, in the chapter it claims (ignoring curly vs. straight quotes, dash style, and line breaks), and no passage comes from a later chapter than the question is about (no spoilers);
- it has 3–4 distinct choices, no "all/none of the above", and a valid answer key;
- the right answer isn't much longer than the others (test-wise students pick the longest choice) and isn't given away by the question itself;
- for order-of-events questions, the correct order is **computed from where each passage sits in the book**, never taken from the model, and events are far enough apart to order fairly.

It also warns when a question reads well above the book's grade level, and reports how questions spread across the book. 14 tests cover it and the rest of the pipeline (`npm test`).

### Reading level

Lexile is proprietary, so each book gets a Flesch–Kincaid grade computed from its own text. It measures sentence length and syllables per word, not maturity, which is why the app shows both:

| Book | Usually taught | Flesch–Kincaid grade | Words per sentence |
|---|---|---:|---:|
| The Wonderful Wizard of Oz | 3–5 | 6.7 | 19.1 |
| A Christmas Carol | 6–8 | 6.0 | 16.0 |
| The Call of the Wild | 6–8 | 7.3 | 19.2 |
| Strange Case of Dr Jekyll and Mr Hyde | 9–12 | 8.1 | 20.2 |
| The Great Gatsby | 10–12 | 6.1 | 14.4 |

The Great Gatsby scores lower than Oz. Readability formulas can't see theme, irony, or what a book assumes you know.

### Adaptive practice (`src/lib/adaptive.ts`)

Each skill's estimate starts at 50% and moves with every answer, (right + 1) / (answered + 2), so one lucky guess doesn't mark a skill as mastered. A mixed quiz draws questions with weight 0.35 + (1 − estimate), caps any one skill at a third of the quiz, avoids recently seen questions, and never goes past the chapter you've read. A test checks that a weak skill shows up about twice as often as it would by chance.

## Where the demo questions came from

**Read this before quoting any numbers.** The 73 questions in the live demo were not produced by `generate.ts`. There was no Anthropic API key set up while v2 was being built, so they were written with Claude in Claude Code, following the same rules as the generation prompt (`pipeline/prompt.ts`). Each evidence passage was copied from the downloaded text using `npm run find`, and every question then went through the same checker as generated questions. Each one is marked `"source": "seed"`; generated ones are marked with the model's name.

On the first pass the checker rejected 5 of the 73 drafts, all for the same flaw: the right answer was noticeably longer than the wrong ones. Those were rewritten, and all 73 now pass.

| Book | Questions | Spread across the book, by tenth |
|---|---:|---|
| The Wonderful Wizard of Oz | 15 | 5 0 1 1 3 0 1 3 0 1 |
| A Christmas Carol | 16 | 4 2 1 3 0 1 0 2 0 3 |
| The Call of the Wild | 13 | 4 1 1 1 0 2 1 1 0 2 |
| Strange Case of Dr Jekyll and Mr Hyde | 14 | 6 2 1 2 0 1 0 1 0 1 |
| The Great Gatsby | 15 | 2 3 1 0 2 2 2 1 0 2 |

## The evaluation (ready, not run yet)

`npm run evaluate -- --baseline` measures what actually matters, using Claude Opus 5.5:

- **Open book.** The model answers each question with the chapter in front of it. Close to 100% means the answer keys are right; misses are listed for review.
- **Closed book.** The model answers with only the title and author. A question it gets right anyway could be answered from summaries, which is exactly the v1 problem. Lower is better; chance is 25%.
- **The v1 baseline.** `--baseline` also writes a quiz the v1 way (`pipeline/v1-prompt.ts`, unchanged) and runs the same closed-book test on it.

The claim to test: v2 questions are much harder to answer without reading the book than v1 questions. Until it runs, this README makes no claim about the result. It needs `ANTHROPIC_API_KEY`; for the five demo books it should cost a few dollars (`claude.ts` prints a running total).

## Run it

```bash
npm install
npm run dev                    # the app, at localhost:3000
npm test                       # 14 tests: matching, readability, checker, adaptive picker, chapter splitting
npm run validate               # check drafts and rebuild data/bank

npm run books:fetch            # download the catalog from a Project Gutenberg mirror
npm run books:prepare          # split chapters, compute reading level
npm run generate -- great-gatsby --per-chapter 4   # needs ANTHROPIC_API_KEY
npm run evaluate -- --baseline                     # needs ANTHROPIC_API_KEY
npm run find -- wizard-of-oz "silver shoes"        # search a book while writing questions by hand
```

To add a book, add it to `pipeline/catalog.ts` with its Gutenberg ID, grade range, and a pattern for its chapter headings.

## Limits

- **Public domain only.** The tool needs the full text, so it can't quiz on most books assigned today. A school with licensed e-texts could plug them into `prepare.ts`.
- **The checker proves the passage exists, not that it proves the answer.** That's what the open-book evaluation is for, plus a teacher's review.
- **Multiple choice and ordering only.** Written answers would need a grader, which is a project of its own.
- **Progress lives in one browser.** There are no accounts.

## Stack

Next.js (static export), TypeScript, Tailwind CSS, the Anthropic TypeScript SDK with structured outputs, Zod, and Node's built-in test runner. The pipeline scripts run directly with Node 24, no build step.
