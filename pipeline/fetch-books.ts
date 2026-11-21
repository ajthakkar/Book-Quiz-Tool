/* Download each catalog book's plain text from Project Gutenberg into books/raw/.
   Run: npm run books:fetch  (skips books already downloaded) */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { catalog } from "./catalog.ts";

const dir = "books/raw";
mkdirSync(dir, { recursive: true });

for (const book of catalog) {
  const file = `${dir}/${book.id}.txt`;
  if (existsSync(file)) {
    console.log(`have   ${book.id}`);
    continue;
  }
  // Gutenberg asks automated downloads to use a mirror; fall back to the main site.
  const urls = [
    `https://gutenberg.pglaf.org/cache/epub/${book.gutenbergId}/pg${book.gutenbergId}.txt`,
    `https://www.gutenberg.org/cache/epub/${book.gutenbergId}/pg${book.gutenbergId}.txt`,
  ];
  let text = "";
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      text = await res.text();
      console.log(`got    ${book.id} from ${url}`);
      break;
    }
  }
  if (!text) throw new Error(`Could not download Gutenberg #${book.gutenbergId}`);
  writeFileSync(file, text);
  await new Promise((r) => setTimeout(r, 1500)); // be polite to Gutenberg
}
