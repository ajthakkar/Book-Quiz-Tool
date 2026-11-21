/* Text helpers for matching a quoted passage against the book. */

/**
 * Normalize text so a quote matches the book regardless of typography:
 * curly vs straight quotes, em dashes vs double hyphens, Gutenberg's _italics_,
 * line breaks, and runs of spaces.
 */
export function normalize(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*(—|–|--)\s*/g, " - ")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Strip a leading/trailing ellipsis or quote mark that a writer may add around a quotation. */
function trimQuote(quote: string): string {
  return quote
    .trim()
    .replace(/^(\.\.\.|…|["'“”‘’])+\s*/, "")
    .replace(/\s*(\.\.\.|…|["'“”‘’])+$/, "");
}

/** Position of `quote` in `text` after normalizing both, or -1 if it isn't there. */
export function findQuote(text: string, quote: string): number {
  const q = normalize(trimQuote(quote));
  if (q.length === 0) return -1;
  return normalize(text).indexOf(q);
}

export function wordCount(text: string): number {
  return (text.match(/[A-Za-z0-9'’]+/g) ?? []).length;
}
