/* Check every draft question against its book. Only questions that pass go into
   data/bank/, which is what the app serves. Run: npm run validate */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkQuestion, type Check } from "../src/lib/validate.ts";
import { SKILLS, type BankFile, type Book, type Question } from "../src/lib/types.ts";
import { catalog } from "./catalog.ts";

mkdirSync("data/bank", { recursive: true });
mkdirSync("data/reports", { recursive: true });

const report: Record<string, unknown> = {};
let allPassed = 0;
let allDrafts = 0;

for (const entry of catalog) {
  const book: Book = JSON.parse(readFileSync(`data/books/${entry.id}.json`, "utf8"));
  const drafts: Question[] = [];
  for (const f of existsSync("data/drafts") ? readdirSync("data/drafts") : []) {
    if (f.startsWith(`${book.id}.`) && f.endsWith(".json")) drafts.push(...JSON.parse(readFileSync(`data/drafts/${f}`, "utf8")));
  }
  if (drafts.length === 0) continue;

  const ids = new Set<string>();
  const checks: Check[] = drafts.map((q) => {
    const c = checkQuestion(q, book);
    if (ids.has(q.id)) {
      c.ok = false;
      c.errors.push("duplicate id");
    }
    ids.add(q.id);
    return c;
  });
  const passed = checks.filter((c) => c.ok && c.question).map((c) => c.question!);
  const failed = checks.filter((c) => !c.ok);

  const bank: BankFile = {
    book: { ...book, chapters: book.chapters.map((c) => ({ n: c.n, title: c.title })) },
    questions: passed,
  };
  writeFileSync(`data/bank/${book.id}.json`, JSON.stringify(bank, null, 1));

  // Where in the book the questions come from, in tenths. Questions written from
  // summaries pile up on a few famous scenes; text-based ones should spread out.
  const deciles = Array(10).fill(0);
  for (const q of passed) deciles[Math.min(9, Math.floor(q.position * 10))]++;
  const bySkill = Object.fromEntries(SKILLS.map((s) => [s, passed.filter((q) => q.skill === s).length]));
  const byLevel = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  for (const q of passed) byLevel[q.level]++;

  report[book.id] = {
    drafts: drafts.length,
    passed: passed.length,
    failed: failed.map((c) => ({ id: c.id, errors: c.errors })),
    warnings: checks.filter((c) => c.warnings.length).map((c) => ({ id: c.id, warnings: c.warnings })),
    bySkill,
    byLevel,
    deciles,
    stats: book.stats,
  };
  allPassed += passed.length;
  allDrafts += drafts.length;

  console.log(
    `${book.id.padEnd(18)} ${passed.length}/${drafts.length} passed   coverage by tenth: ${deciles.join(" ")}   levels 1/2/3: ${byLevel[1]}/${byLevel[2]}/${byLevel[3]}`,
  );
  for (const c of failed) console.log(`   ✗ ${c.id}: ${c.errors.join("; ")}`);
  for (const c of checks.filter((x) => x.warnings.length)) console.log(`   ! ${c.id}: ${c.warnings.join("; ")}`);
}

writeFileSync("data/reports/validation.json", JSON.stringify({ passed: allPassed, drafts: allDrafts, books: report }, null, 1));
console.log(`\n${allPassed}/${allDrafts} questions passed. Report: data/reports/validation.json`);
if (process.argv.includes("--strict") && allPassed < allDrafts) process.exit(1);
