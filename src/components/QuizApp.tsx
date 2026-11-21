"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, Check, RotateCcw, X } from "lucide-react";
import {
  bandLevels,
  defaultBand,
  emptyProgress,
  mastery,
  pickQuiz,
  record,
  rng,
  weakest,
  type Band,
  type Progress,
} from "@/lib/adaptive";
import { levelName, SKILLS, skillInfo, type BankFile, type BankQuestion, type Evidence, type Skill } from "@/lib/types";

const STORE = "book-quiz-progress";
const GRADES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LENGTHS = [5, 8, 12];
const bandLabel: Record<Band, string> = { easier: "Easier", "on-level": "On level", challenge: "Challenge" };

type Answer = { q: BankQuestion; correct: boolean; picked: number | number[] };

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch {
    /* private mode or blocked storage: start fresh */
  }
  return emptyProgress();
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {
    /* progress just won't persist */
  }
}

/** Shuffle with a seed, so a question's choices stay in the same order while it's on screen. */
function shuffled<T>(items: T[], seed: number): T[] {
  const r = rng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export default function QuizApp({ banks }: { banks: BankFile[] }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [grade, setGrade] = useState<number | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [chaptersRead, setChaptersRead] = useState(0);
  const [band, setBand] = useState<Band>("on-level");
  const [length, setLength] = useState(8);
  const [focus, setFocus] = useState<Skill | "">("");
  const [quiz, setQuiz] = useState<BankQuestion[] | null>(null);
  const [seed, setSeed] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => setProgress(loadProgress()), []);

  const bank = banks.find((b) => b.book.id === bookId) ?? null;

  function chooseBook(id: string) {
    const b = banks.find((x) => x.book.id === id)!;
    setBookId(id);
    setChaptersRead(b.book.chapters.length);
    if (grade) setBand(defaultBand(grade, b.book.grades));
  }

  const available = useMemo(() => {
    if (!bank) return 0;
    return bank.questions.filter(
      (q) => q.chapter <= chaptersRead && bandLevels[band].includes(q.level) && (!focus || q.skill === focus),
    ).length;
  }, [bank, chaptersRead, band, focus]);

  function start(focusSkill: Skill | "" = focus) {
    if (!bank) return;
    const s = Math.floor(Math.random() * 1e9);
    setSeed(s);
    setAnswers([]);
    setFocus(focusSkill);
    setQuiz(pickQuiz(bank.questions, { chaptersRead, band, length, focus: focusSkill || undefined, progress, seed: s }));
    window.scrollTo({ top: 0 });
  }

  function finish(all: Answer[]) {
    const next = record(
      progress,
      all.map((a) => ({ id: a.q.id, skill: a.q.skill, correct: a.correct })),
    );
    setProgress(next);
    saveProgress(next);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <button
          type="button"
          onClick={() => {
            setQuiz(null);
            setAnswers([]);
          }}
          className="text-left"
        >
          <span className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            <BookOpen aria-hidden="true" className="h-6 w-6 text-accent" />
            Book Quiz
          </span>
          <span className="mt-1 block text-sm text-muted">Questions written from the book itself, and checked against it.</span>
        </button>
      </header>

      {!quiz && (
        <Setup
          banks={banks}
          grade={grade}
          setGrade={(g) => {
            setGrade(g);
            if (bank) setBand(defaultBand(g, bank.book.grades));
          }}
          bank={bank}
          chooseBook={chooseBook}
          chaptersRead={chaptersRead}
          setChaptersRead={setChaptersRead}
          band={band}
          setBand={setBand}
          length={length}
          setLength={setLength}
          focus={focus}
          setFocus={setFocus}
          available={available}
          start={() => start()}
          progress={progress}
          resetProgress={() => {
            const fresh = emptyProgress();
            setProgress(fresh);
            saveProgress(fresh);
          }}
        />
      )}

      {quiz && bank && answers.length < quiz.length && (
        <QuestionView
          key={quiz[answers.length].id}
          q={quiz[answers.length]}
          index={answers.length}
          total={quiz.length}
          seed={seed}
          bank={bank}
          onDone={(a) => {
            const all = [...answers, a];
            setAnswers(all);
            if (all.length === quiz.length) finish(all);
          }}
        />
      )}

      {quiz && bank && quiz.length > 0 && answers.length === quiz.length && (
        <Results
          answers={answers}
          bank={bank}
          progress={progress}
          again={() => start("")}
          practice={(s) => start(s)}
          change={() => {
            setQuiz(null);
            setAnswers([]);
          }}
        />
      )}

      {quiz && quiz.length === 0 && (
        <p className="pt-10 text-copy">
          No questions match those settings. Try more chapters or a different difficulty.{" "}
          <button type="button" className="font-medium text-accent underline" onClick={() => setQuiz(null)}>
            Go back
          </button>
        </p>
      )}

      <footer className="mt-16 border-t border-line pt-5 text-xs leading-relaxed text-muted">
        Books are public domain, from Project Gutenberg. Every answer is backed by a passage that was checked word for word
        against the book. Your progress is saved only in this browser.
      </footer>
    </main>
  );
}

/* ───────────── Setup ───────────── */

function Label({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-serif text-xl font-semibold text-ink">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-sans font-semibold text-paper">{n}</span>
      {children}
    </h2>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active ? "border-accent bg-accent text-paper" : "border-line bg-card text-copy hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function fit(grade: number | null, grades: [number, number]) {
  if (grade === null) return null;
  if (grade < grades[0]) return { label: "Stretch", tone: "text-gold" };
  if (grade > grades[1]) return { label: "Easier read", tone: "text-muted" };
  return { label: "Good fit", tone: "text-good" };
}

function Setup(p: {
  banks: BankFile[];
  grade: number | null;
  setGrade: (g: number) => void;
  bank: BankFile | null;
  chooseBook: (id: string) => void;
  chaptersRead: number;
  setChaptersRead: (n: number) => void;
  band: Band;
  setBand: (b: Band) => void;
  length: number;
  setLength: (n: number) => void;
  focus: Skill | "";
  setFocus: (s: Skill | "") => void;
  available: number;
  start: () => void;
  progress: Progress;
  resetProgress: () => void;
}) {
  const answered = SKILLS.reduce((n, s) => n + p.progress.skills[s].total, 0);
  return (
    <div className="space-y-10 pt-8">
      <section className="space-y-3">
        <Label n={1}>What grade are you in?</Label>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <Chip key={g} active={p.grade === g} onClick={() => p.setGrade(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Label n={2}>Pick a book</Label>
        <ul className="grid gap-3 sm:grid-cols-2">
          {p.banks.map(({ book, questions }) => {
            const f = fit(p.grade, book.grades);
            const active = p.bank?.book.id === book.id;
            return (
              <li key={book.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => p.chooseBook(book.id)}
                  className={`h-full w-full rounded-xl border bg-card p-4 text-left transition-colors ${
                    active ? "border-accent ring-2 ring-accent/30" : "border-line hover:border-accent"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-serif text-lg font-semibold leading-snug text-ink">{book.title}</span>
                    {f && <span className={`shrink-0 pt-1 text-xs font-semibold ${f.tone}`}>{f.label}</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {book.author}, {book.year}
                  </span>
                  <span className="mt-3 grid grid-cols-3 gap-2 text-xs text-copy">
                    <span>
                      <span className="block text-muted">Taught in</span>
                      grades {book.grades[0]}–{book.grades[1]}
                    </span>
                    <span title="Flesch–Kincaid grade level, from sentence length and syllables per word">
                      <span className="block text-muted">Reading level</span>
                      grade {book.stats.fkGrade}
                    </span>
                    <span>
                      <span className="block text-muted">Questions</span>
                      {questions.length}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs leading-relaxed text-muted">
          Reading level measures sentence length and word length. It isn&apos;t the same as how mature a book is: The Great
          Gatsby has short sentences but is taught in high school.
        </p>
      </section>

      {p.bank && (
        <section className="rise space-y-6">
          <Label n={3}>Set up your quiz</Label>
          <div className="space-y-2">
            <label htmlFor="chapters" className="block text-sm font-medium text-ink">
              I&apos;ve read through
            </label>
            <select
              id="chapters"
              value={p.chaptersRead}
              onChange={(e) => p.setChaptersRead(Number(e.target.value))}
              className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink"
            >
              {p.bank.book.chapters.map((c) => (
                <option key={c.n} value={c.n}>
                  {c.title}
                  {c.n === p.bank!.book.chapters.length ? " (the whole book)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">No questions about later chapters, so nothing gets spoiled.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(bandLabel) as Band[]).map((b) => (
                <Chip key={b} active={p.band === b} onClick={() => p.setBand(b)}>
                  {bandLabel[b]}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted">
              {bandLevels[p.band].map((l) => levelName[l]).join(", ")} questions. Stated answers are in the text; connected ones
              take two parts of the book; interpreted ones ask what it means.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Questions</p>
              <div className="flex gap-2">
                {LENGTHS.map((n) => (
                  <Chip key={n} active={p.length === n} onClick={() => p.setLength(n)}>
                    {n}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="focus" className="block text-sm font-medium text-ink">
                Focus
              </label>
              <select
                id="focus"
                value={p.focus}
                onChange={(e) => p.setFocus(e.target.value as Skill | "")}
                className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink"
              >
                <option value="">A mix, weighted toward what I miss</option>
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {skillInfo[s].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={p.start}
              disabled={p.available === 0}
              className="min-h-11 rounded-full bg-accent px-6 py-2.5 font-semibold text-paper transition-opacity disabled:opacity-40"
            >
              Start quiz
            </button>
            <span className="text-sm text-muted">
              {p.available === 0
                ? "No questions match. Try more chapters or another difficulty."
                : p.available < p.length
                  ? `Only ${p.available} questions match, so the quiz will be shorter.`
                  : `${p.available} questions to draw from.`}
            </span>
          </div>
        </section>
      )}

      {answered > 0 && (
        <section className="space-y-3 rounded-xl border border-line bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-ink">Your skills so far</h2>
            <button type="button" onClick={p.resetProgress} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
              <RotateCcw aria-hidden="true" className="h-3 w-3" />
              Reset
            </button>
          </div>
          <SkillBars progress={p.progress} />
        </section>
      )}
    </div>
  );
}

/* ───────────── Questions ───────────── */

function Quote({ evidence, bank }: { evidence: Evidence; bank: BankFile }) {
  const title = bank.book.chapters.find((c) => c.n === evidence.chapter)?.title ?? `Chapter ${evidence.chapter}`;
  // Passages that are dialogue already start with a quotation mark; don't double it.
  const text = evidence.quote.replace(/^["“]/, "").replace(/["”]$/, "");
  return (
    <figure className="border-l-2 border-accent pl-3">
      <blockquote className="font-serif text-[15px] italic leading-relaxed text-copy">&ldquo;{text}&rdquo;</blockquote>
      <figcaption className="mt-1 text-xs text-muted">{title}</figcaption>
    </figure>
  );
}

function QuestionView(p: { q: BankQuestion; index: number; total: number; seed: number; bank: BankFile; onDone: (a: Answer) => void }) {
  const { q } = p;
  return (
    <section className="rise space-y-5 pt-8" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          Question {p.index + 1} of {p.total}
        </span>
        <span className="flex gap-2">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">{skillInfo[q.skill].name}</span>
          <span className="rounded-full border border-line px-2.5 py-1">{levelName[q.level]}</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-accent transition-all" style={{ width: `${(p.index / p.total) * 100}%` }} />
      </div>
      {q.type === "choice" ? <ChoiceView {...p} q={q} /> : <OrderView {...p} q={q} />}
    </section>
  );
}

function NextButton({ last, onClick }: { last: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-full bg-accent px-6 py-2.5 font-semibold text-paper" autoFocus>
      {last ? "See results" : "Next question"}
    </button>
  );
}

function ChoiceView(p: { q: Extract<BankQuestion, { type: "choice" }>; index: number; total: number; seed: number; bank: BankFile; onDone: (a: Answer) => void }) {
  const { q } = p;
  const order = useMemo(() => shuffled(q.choices.map((_, i) => i), p.seed ^ hash(q.id)), [q, p.seed]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === q.answer;

  return (
    <div className="space-y-5">
      <h3 className="font-serif text-xl font-semibold leading-snug text-ink sm:text-2xl">{q.stem}</h3>
      <ul className="space-y-2.5">
        {order.map((i) => {
          const isAnswer = i === q.answer;
          const state = !answered ? "" : isAnswer ? "border-good bg-good-soft" : i === picked ? "border-bad bg-bad-soft" : "opacity-60";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setPicked(i)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left text-[15px] text-ink transition-colors enabled:hover:border-accent ${state}`}
              >
                {q.choices[i]}
                {answered && isAnswer && <Check aria-label="Correct answer" className="h-5 w-5 shrink-0 text-good" />}
                {answered && i === picked && !isAnswer && <X aria-label="Your answer" className="h-5 w-5 shrink-0 text-bad" />}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="rise space-y-4 rounded-xl border border-line bg-card p-4">
          <p className={`font-semibold ${correct ? "text-good" : "text-bad"}`}>{correct ? "Right." : "Not quite."}</p>
          <p className="text-[15px] leading-relaxed text-copy">{q.explanation}</p>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Where it is in the book</p>
            {q.evidence.map((e) => (
              <Quote key={e.quote} evidence={e} bank={p.bank} />
            ))}
          </div>
          <NextButton last={p.index + 1 === p.total} onClick={() => p.onDone({ q, correct, picked: picked! })} />
        </div>
      )}
    </div>
  );
}

function OrderView(p: { q: Extract<BankQuestion, { type: "order" }>; index: number; total: number; seed: number; bank: BankFile; onDone: (a: Answer) => void }) {
  const { q } = p;
  const [items, setItems] = useState(() => {
    let s = shuffled(q.events.map((_, i) => i), p.seed ^ hash(q.id));
    // Never start in the right order.
    if (s.every((v, i) => v === q.order[i])) s = [...s.slice(1), s[0]];
    return s;
  });
  const [checked, setChecked] = useState(false);
  const correct = items.every((v, i) => v === q.order[i]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    setItems(next);
  };

  return (
    <div className="space-y-5">
      <h3 className="font-serif text-xl font-semibold leading-snug text-ink sm:text-2xl">{q.stem}</h3>
      <p className="text-sm text-muted">Use the arrows to put the first event at the top.</p>
      <ol className="space-y-2.5">
        {items.map((ev, pos) => {
          const ok = checked && ev === q.order[pos];
          return (
            <li
              key={ev}
              className={`flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 ${
                !checked ? "border-line" : ok ? "border-good bg-good-soft" : "border-bad bg-bad-soft"
              }`}
            >
              <span className="w-5 text-center font-serif text-lg font-semibold text-muted">{pos + 1}</span>
              <span className="flex-1 text-[15px] text-ink">{q.events[ev].text}</span>
              {!checked && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Move "${q.events[ev].text}" up`}
                    disabled={pos === 0}
                    onClick={() => move(pos, pos - 1)}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-line text-copy enabled:hover:border-accent disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move "${q.events[ev].text}" down`}
                    disabled={pos === items.length - 1}
                    onClick={() => move(pos, pos + 1)}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-line text-copy enabled:hover:border-accent disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!checked ? (
        <button type="button" onClick={() => setChecked(true)} className="min-h-11 rounded-full bg-accent px-6 py-2.5 font-semibold text-paper">
          Check my order
        </button>
      ) : (
        <div className="rise space-y-4 rounded-xl border border-line bg-card p-4">
          <p className={`font-semibold ${correct ? "text-good" : "text-bad"}`}>{correct ? "Right order." : "Here's the order in the book:"}</p>
          <ol className="space-y-3">
            {q.order.map((ev, i) => (
              <li key={ev} className="space-y-1.5">
                <p className="text-sm font-medium text-ink">
                  {i + 1}. {q.events[ev].text}
                </p>
                <Quote evidence={q.events[ev].evidence} bank={p.bank} />
              </li>
            ))}
          </ol>
          <NextButton last={p.index + 1 === p.total} onClick={() => p.onDone({ q, correct, picked: items })} />
        </div>
      )}
    </div>
  );
}

/* ───────────── Results ───────────── */

function SkillBars({ progress, only }: { progress: Progress; only?: Skill[] }) {
  const skills = (only ?? SKILLS).filter((s) => progress.skills[s].total > 0);
  return (
    <ul className="space-y-3">
      {skills.map((s) => {
        const r = progress.skills[s];
        const m = mastery(r);
        const status = r.total < 3 ? "Too early to tell" : m >= 0.75 ? "Strong" : m >= 0.5 ? "Getting there" : "Worth practicing";
        return (
          <li key={s} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{skillInfo[s].name}</span>
              <span className="text-xs text-muted">
                {r.right}/{r.total} right · {status}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${skillInfo[s].name}: about ${Math.round(m * 100)}%`}>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(m * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Results(p: { answers: Answer[]; bank: BankFile; progress: Progress; again: () => void; practice: (s: Skill) => void; change: () => void }) {
  const right = p.answers.filter((a) => a.correct).length;
  const quizSkills = [...new Set(p.answers.map((a) => a.q.skill))];
  const weak = weakest(p.progress)[0];
  const missedHere = SKILLS.filter((s) => p.answers.some((a) => a.q.skill === s && !a.correct));

  return (
    <section className="rise space-y-8 pt-8">
      <div>
        <p className="text-sm text-muted">{p.bank.book.title}</p>
        <h2 className="mt-1 font-serif text-4xl font-semibold text-ink">
          {right} of {p.answers.length} right
        </h2>
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-card p-4 sm:p-5">
        <h3 className="font-serif text-lg font-semibold text-ink">Skills, counting every quiz you&apos;ve taken</h3>
        <SkillBars progress={p.progress} only={quizSkills} />
        <p className="text-xs leading-relaxed text-muted">
          Each bar starts at 50% and moves with every answer, so one lucky guess doesn&apos;t make a skill look mastered.
        </p>
      </div>

      {weak && (
        <div className="space-y-2 rounded-xl bg-accent-soft p-4 sm:p-5">
          <h3 className="font-serif text-lg font-semibold text-ink">Next: {skillInfo[weak].name}</h3>
          <p className="text-[15px] leading-relaxed text-copy">{skillInfo[weak].tip}</p>
          <p className="text-sm text-muted">Your next mixed quiz will include more of these. Or practice just this skill:</p>
          <button type="button" onClick={() => p.practice(weak)} className="mt-1 min-h-11 rounded-full bg-accent px-5 py-2 font-semibold text-paper">
            Practice {skillInfo[weak].name.toLowerCase()}
          </button>
        </div>
      )}

      {missedHere.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-semibold text-ink">Review what you missed</h3>
          <ul className="space-y-4">
            {p.answers
              .filter((a) => !a.correct)
              .map((a) => (
                <li key={a.q.id} className="space-y-2 rounded-xl border border-line bg-card p-4">
                  <p className="text-xs font-medium text-accent">{skillInfo[a.q.skill].name}</p>
                  <p className="font-medium text-ink">{a.q.stem}</p>
                  {a.q.type === "choice" ? (
                    <>
                      <p className="text-sm text-copy">
                        Answer: <span className="font-medium text-good">{a.q.choices[a.q.answer]}</span>
                        <span className="text-muted"> · You picked: {a.q.choices[a.picked as number]}</span>
                      </p>
                      <Quote evidence={a.q.evidence[0]} bank={p.bank} />
                    </>
                  ) : (
                    <ol className="list-decimal pl-5 text-sm text-copy">
                      {a.q.order.map((ev) => (
                        <li key={ev}>{a.q.type === "order" ? a.q.events[ev].text : ""}</li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={p.again} className="min-h-11 rounded-full bg-accent px-6 py-2.5 font-semibold text-paper">
          Another quiz
        </button>
        <button type="button" onClick={p.change} className="min-h-11 rounded-full border border-line px-6 py-2.5 font-semibold text-ink hover:border-accent">
          Change book or settings
        </button>
      </div>
    </section>
  );
}
