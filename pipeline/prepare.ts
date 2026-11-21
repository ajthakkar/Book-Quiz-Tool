/* Turn each downloaded Gutenberg text into data/books/<id>.json: clean chapters
   plus reading-level stats. Run: npm run books:prepare */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readability } from "../src/lib/readability.ts";
import { wordCount } from "../src/lib/text.ts";
import type { Book, Chapter } from "../src/lib/types.ts";
import { catalog, type CatalogBook } from "./catalog.ts";

/** Cut the Project Gutenberg license header and footer. */
export function stripGutenberg(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n");
  const start = text.search(/^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*$/m);
  const end = text.search(/^\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*$/m);
  const body = text.slice(start >= 0 ? text.indexOf("\n", start) + 1 : 0, end >= 0 ? end : undefined);
  return body;
}

/** Gutenberg wraps lines at ~70 characters. Join each paragraph back into one line. */
export function unwrap(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function splitChapters(body: string, book: CatalogBook): Chapter[] {
  const lines = body.split("\n");
  const starts: { line: number; heading: string }[] = [];
  lines.forEach((l, i) => {
    if (book.chapterHeading.test(l.trimEnd())) starts.push({ line: i, heading: l.trim() });
  });
  if (starts.length === 0) throw new Error(`${book.id}: no chapter headings matched`);

  return starts.map((s, k) => {
    const endLine = k + 1 < starts.length ? starts[k + 1].line : lines.length;
    let chunk = lines.slice(s.line + 1, endLine).join("\n");
    let title = s.heading;
    // Oz and Gatsby put the chapter name (if any) on the next non-empty line.
    if (/^Chapter [IVXL]+\.?$/.test(s.heading)) {
      const m = chunk.match(/^\s*(.+)\n/);
      if (m) {
        title = `${s.heading}: ${m[1].trim()}`;
        chunk = chunk.slice(chunk.indexOf(m[0]) + m[0].length);
      }
    }
    // Drop end-of-book matter some editions keep after the last chapter.
    // Only a line that is exactly "THE END" counts: "the end" also shows up mid-sentence.
    chunk = chunk.replace(/\n[ \t]*THE END\.?[ \t]*(\n[\s\S]*)?$/, "\n");
    const text = unwrap(chunk);
    return { n: k + 1, title: tidyTitle(title), text, words: wordCount(text) };
  });
}

function tidyTitle(t: string): string {
  const s = t.replace(/\s+/g, " ").trim();
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX)$/.test(s)) return `Chapter ${s}`;
  const stave = s.match(/^STAVE ([IV]+):\s*(.+)$/);
  if (stave) return `Stave ${stave[1]}: ${titleCase(stave[2])}`;
  if (/^[A-Z][A-Z .’']+$/.test(s)) return titleCase(s);
  return s;
}

const SMALL = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"]);

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function prepare(book: CatalogBook, raw: string): Book {
  const chapters = splitChapters(stripGutenberg(raw), book);
  const all = chapters.map((c) => c.text).join("\n\n");
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    gutenbergId: book.gutenbergId,
    grades: book.grades,
    stats: readability(all),
    chapters,
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("prepare.ts")) {
  mkdirSync("data/books", { recursive: true });
  for (const entry of catalog) {
    const book = prepare(entry, readFileSync(`books/raw/${entry.id}.txt`, "utf8"));
    writeFileSync(`data/books/${book.id}.json`, JSON.stringify(book, null, 1));
    const s = book.stats;
    console.log(
      `${book.id.padEnd(18)} ${String(book.chapters.length).padStart(2)} chapters  ${String(s.words).padStart(6)} words  FK grade ${s.fkGrade}  (taught ${book.grades.join("-")})`,
    );
  }
}
