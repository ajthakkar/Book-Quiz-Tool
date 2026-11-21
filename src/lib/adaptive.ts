/* Picks the next quiz so it leans toward the skills a reader is weakest at,
   without spoiling chapters they haven't read. */
import { SKILLS, type BankQuestion, type Level, type Skill } from "./types.ts";

export type SkillRecord = { right: number; total: number };
export type Progress = { skills: Record<Skill, SkillRecord>; seen: string[] };

export const emptyProgress = (): Progress => ({
  skills: Object.fromEntries(SKILLS.map((s) => [s, { right: 0, total: 0 }])) as Record<Skill, SkillRecord>,
  seen: [],
});

/**
 * Estimated chance of getting a question of this skill right.
 * Starts at 50% and moves with each answer (a Beta(1, 1) prior), so one lucky
 * answer doesn't make a skill look mastered.
 */
export function mastery(r: SkillRecord): number {
  return (r.right + 1) / (r.total + 2);
}

export type Band = "easier" | "on-level" | "challenge";
export const bandLevels: Record<Band, Level[]> = { easier: [1, 2], "on-level": [1, 2, 3], challenge: [2, 3] };

/** Pick a starting difficulty from the reader's grade and the grades the book is usually taught in. */
export function defaultBand(grade: number, bookGrades: [number, number]): Band {
  if (grade < bookGrades[0]) return "easier";
  if (grade > bookGrades[1]) return "challenge";
  return "on-level";
}

/** Small seeded random number generator, so a quiz can be reproduced in tests. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type QuizOptions = {
  chaptersRead: number;
  band: Band;
  length: number;
  /** Practice one skill only. */
  focus?: Skill;
  progress: Progress;
  seed: number;
};

/** How much a question's skill should be favored: weak skills come up more. */
export function skillWeight(skill: Skill, progress: Progress, focus?: Skill): number {
  if (focus) return skill === focus ? 1 : 0;
  return 0.35 + (1 - mastery(progress.skills[skill]));
}

export function pickQuiz(bank: BankQuestion[], o: QuizOptions): BankQuestion[] {
  const levels = bandLevels[o.band];
  const pool = bank.filter((q) => q.chapter <= o.chaptersRead && levels.includes(q.level));
  const random = rng(o.seed);
  const seen = new Set(o.progress.seen);
  const perSkill: Partial<Record<Skill, number>> = {};
  const cap = o.focus ? o.length : Math.max(1, Math.ceil(o.length / 3));
  const chosen: BankQuestion[] = [];
  const left = [...pool];

  while (chosen.length < o.length && left.length) {
    const weights = left.map((q) => {
      const count = perSkill[q.skill] ?? 0;
      if (count >= cap) return 0;
      return skillWeight(q.skill, o.progress, o.focus) * (seen.has(q.id) ? 0.25 : 1);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) break;
    // Weighted draw: walk the list until the random number falls inside a question's weight.
    let r = random() * sum;
    let i = 0;
    for (; i < left.length; i++) {
      r -= weights[i];
      if (r <= 0 && weights[i] > 0) break;
    }
    if (i >= left.length) i = weights.findLastIndex((w) => w > 0);
    const q = left.splice(i, 1)[0];
    perSkill[q.skill] = (perSkill[q.skill] ?? 0) + 1;
    chosen.push(q);
  }
  // Ask in the order things happen in the book, so the quiz follows the story.
  return chosen.sort((a, b) => a.position - b.position);
}

/** Update progress after a quiz. */
export function record(progress: Progress, results: { id: string; skill: Skill; correct: boolean }[]): Progress {
  const skills = structuredClone(progress.skills);
  for (const r of results) {
    skills[r.skill].total += 1;
    if (r.correct) skills[r.skill].right += 1;
  }
  const seen = [...new Set([...progress.seen, ...results.map((r) => r.id)])].slice(-400);
  return { skills, seen };
}

/** Skills sorted weakest first, among those with at least one answer. */
export function weakest(progress: Progress): Skill[] {
  return SKILLS.filter((s) => progress.skills[s].total > 0).sort((a, b) => mastery(progress.skills[a]) - mastery(progress.skills[b]));
}
