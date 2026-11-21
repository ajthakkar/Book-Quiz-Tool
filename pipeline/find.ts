/* Search a book for a phrase, to copy exact evidence while writing questions by hand.
   Run: npm run find -- <book-id> "<phrase>" */
import { readFileSync } from "node:fs";
import { normalize } from "../src/lib/text.ts";
import type { Book } from "../src/lib/types.ts";

const [id, ...rest] = process.argv.slice(2);
const phrase = normalize(rest.join(" "));
const book: Book = JSON.parse(readFileSync(`data/books/${id}.json`, "utf8"));
let hits = 0;
for (const c of book.chapters) {
  const text = c.text.replace(/\s+/g, " ");
  const norm = normalize(text);
  let at = norm.indexOf(phrase);
  while (at >= 0 && hits < 20) {
    hits++;
    console.log(`ch ${c.n} (${c.title}): …${text.slice(Math.max(0, at - 160), at + phrase.length + 160)}…\n`);
    at = norm.indexOf(phrase, at + 1);
  }
}
if (!hits) console.log("not found");
