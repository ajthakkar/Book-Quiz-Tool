/* Reading-level measures computed from the text itself.
   Lexile scores are proprietary, so the tool reports Flesch–Kincaid grade level,
   a public formula built from sentence length and syllables per word. */
import type { BookStats } from "./types.ts";

/** Syllables in one English word, by counting vowel groups with the usual corrections. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])["'”’)]*\s+(?=["'“‘(]*[A-Z])/)
    .filter((s) => /[A-Za-z]/.test(s));
}

export function readability(text: string): BookStats {
  const words = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? [];
  const sentenceCount = Math.max(1, sentences(text).length);
  let syl = 0;
  let long = 0;
  for (const w of words) {
    const s = syllables(w);
    syl += s;
    if (s >= 3) long++;
  }
  const n = Math.max(1, words.length);
  const wps = n / sentenceCount;
  const spw = syl / n;
  const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    words: words.length,
    sentences: sentenceCount,
    fkGrade: round(0.39 * wps + 11.8 * spw - 15.59),
    wordsPerSentence: round(wps),
    syllablesPerWord: round(spw, 2),
    longWords: round(long / n, 3),
  };
}

/** Flesch–Kincaid grade of a short piece of text, such as a question and its choices. */
export function gradeOf(text: string): number {
  return readability(text).fkGrade;
}
