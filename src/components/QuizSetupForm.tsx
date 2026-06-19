"use client";

import { useState } from "react";
import { GradeLevel, GenerateQuizRequest } from "@/lib/types";
import {
  Sparkles,
  BookOpen,
  User,
  Layers,
  Target,
  Hash,
  ChevronDown,
} from "lucide-react";

const GRADE_OPTIONS: { value: GradeLevel; label: string; description: string }[] = [
  {
    value: "K-2",
    label: "Grades K-2",
    description: "Ages 5-8 -- Foundational comprehension",
  },
  {
    value: "3-5",
    label: "Grades 3-5",
    description: "Ages 8-11 -- Building inference skills",
  },
  {
    value: "6-8",
    label: "Grades 6-8",
    description: "Ages 11-14 -- Analytical comprehension",
  },
  {
    value: "9-12",
    label: "Grades 9-12",
    description: "Ages 14-18 -- Critical analysis",
  },
  {
    value: "college",
    label: "College / Advanced",
    description: "Ages 18+ -- Literary criticism",
  },
];

interface Props {
  onSubmit: (request: GenerateQuizRequest) => void;
  isLoading: boolean;
}

export default function QuizSetupForm({ onSubmit, isLoading }: Props) {
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>("3-5");
  const [chapters, setChapters] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      bookTitle: bookTitle.trim(),
      author: author.trim() || undefined,
      gradeLevel,
      chapters: chapters.trim() || undefined,
      focusAreas: focusAreas.trim() || undefined,
      questionCount: questionCount > 0 ? questionCount : undefined,
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Generate a Comprehension Test
        </h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          Enter any book and your child&apos;s reading level. We&apos;ll create a
          rigorous, skill-targeted test with questions that measure real
          understanding — not trivia.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Book Title
              <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g., Charlotte's Web, The Giver, To Kill a Mockingbird"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <User className="w-4 h-4 text-primary" />
              Author
              <span className="text-text-muted text-xs font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., E.B. White"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Layers className="w-4 h-4 text-primary" />
              Reading Level
              <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GRADE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGradeLevel(option.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    gradeLevel === option.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary-light hover:bg-surface-hover"
                  }`}
                >
                  <div className="font-semibold text-sm text-foreground">
                    {option.label}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
          Advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Target className="w-4 h-4 text-primary" />
                Chapters / Sections
                <span className="text-text-muted text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={chapters}
                onChange={(e) => setChapters(e.target.value)}
                placeholder="e.g., Chapters 1-5, or 'the first half'"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Focus Areas
                <span className="text-text-muted text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="e.g., character motivation, theme analysis, vocabulary"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Hash className="w-4 h-4 text-primary" />
                Number of Questions
                <span className="text-text-muted text-xs font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min={3}
                max={25}
                value={questionCount || ""}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                placeholder="Auto (based on grade level)"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!bookTitle.trim() || isLoading}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating your test...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Comprehension Test
            </>
          )}
        </button>
      </form>
    </div>
  );
}
