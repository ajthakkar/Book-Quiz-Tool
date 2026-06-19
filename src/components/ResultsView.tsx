"use client";

import { useState } from "react";
import { GeneratedQuiz, QuizResult, FeedbackReport, Question } from "@/lib/types";
import {
  Trophy,
  Target,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronDown,
  RotateCcw,
  BookOpen,
  Users,
} from "lucide-react";

interface Props {
  quiz: GeneratedQuiz;
  results: QuizResult[];
  feedback: FeedbackReport | null;
  feedbackLoading: boolean;
  onNewTest: () => void;
}

function ScoreRing({
  score,
  total,
}: {
  score: number;
  total: number;
}) {
  const percentage = Math.round((score / total) * 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  let color = "text-danger";
  if (percentage >= 80) color = "text-success";
  else if (percentage >= 60) color = "text-warning";
  else if (percentage >= 40) color = "text-orange-500";

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="8"
          fill="none"
          className="stroke-border"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          className={`${color.replace("text-", "stroke-")} transition-all duration-1000`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{percentage}%</span>
        <span className="text-xs text-text-muted">
          {score}/{total}
        </span>
      </div>
    </div>
  );
}

function SkillBar({
  label,
  correct,
  total,
}: {
  label: string;
  correct: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  let barColor = "bg-danger";
  if (pct >= 80) barColor = "bg-success";
  else if (pct >= 60) barColor = "bg-warning";
  else if (pct >= 40) barColor = "bg-orange-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-text-secondary">
          {correct}/{total}
        </span>
      </div>
      <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ResultsView({
  quiz,
  results,
  feedback,
  feedbackLoading,
  onNewTest,
}: Props) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showParentReport, setShowParentReport] = useState(false);

  const mcResults = results.filter((r) => {
    const q = quiz.questions.find((q: Question) => q.id === r.questionId);
    return q?.questionType === "multiple_choice";
  });
  const correctCount = mcResults.filter((r) => r.isCorrect).length;
  const totalMC = mcResults.length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Score header */}
      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          Test Complete!
        </h2>
        <p className="text-text-secondary mb-6">
          {quiz.bookTitle} -- {quiz.gradeLevel} level
        </p>

        <div className="flex justify-center mb-6">
          <ScoreRing score={correctCount} total={totalMC} />
        </div>

        {feedback && (
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {feedback.strengths.slice(0, 2).map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-success/10 text-success rounded-xl px-4 py-2 max-w-xs text-left"
              >
                <Trophy className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {feedbackLoading && (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary">
            Analyzing responses and generating personalized feedback...
          </p>
        </div>
      )}

      {feedback && (
        <>
          {/* Skill Breakdown */}
          {feedback.skillBreakdown.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Skill Breakdown
              </h3>
              <div className="space-y-4">
                {feedback.skillBreakdown.map((s, i) => (
                  <SkillBar
                    key={i}
                    label={s.label}
                    correct={s.correct}
                    total={s.total}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Question-by-question review */}
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Question Review
            </h3>
            <div className="space-y-3">
              {quiz.questions.map((q: Question, i: number) => {
                const result = results.find((r) => r.questionId === q.id);
                const qFeedback = feedback.questionFeedback.find(
                  (f) => f.questionId === q.id,
                );
                const isExpanded = expandedQuestion === q.id;
                const isCorrect = result?.isCorrect;

                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border transition-all ${
                      isCorrect
                        ? "border-success/30 bg-success/5"
                        : "border-danger/30 bg-danger/5"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedQuestion(isExpanded ? null : q.id)
                      }
                      className="w-full text-left p-4 flex items-start gap-3"
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground line-clamp-2">
                          Q{i + 1}: {q.stem}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 animate-fade-in">
                        {result && (
                          <div className="text-sm">
                            <p className="text-text-secondary">
                              <span className="font-medium">Your answer:</span>{" "}
                              {result.selectedAnswer || "(no answer)"}
                            </p>
                            {!isCorrect && (
                              <p className="text-success mt-1">
                                <span className="font-medium">
                                  Correct answer:
                                </span>{" "}
                                {q.correctAnswer}
                              </p>
                            )}
                          </div>
                        )}
                        {qFeedback && (
                          <div className="text-sm bg-surface rounded-lg p-3 border border-border">
                            {qFeedback.feedback}
                          </div>
                        )}
                        <div className="text-xs text-text-muted">
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Growth areas & next steps */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-surface rounded-2xl border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-warning" />
                Areas to Grow
              </h3>
              <ul className="space-y-2">
                {feedback.growthAreas.map((area, i) => (
                  <li
                    key={i}
                    className="text-sm text-text-secondary flex items-start gap-2"
                  >
                    <ArrowRight className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Recommended Next Steps
              </h3>
              <ul className="space-y-2">
                {feedback.nextSteps.map((step, i) => (
                  <li
                    key={i}
                    className="text-sm text-text-secondary flex items-start gap-2"
                  >
                    <ArrowRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Parent report */}
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowParentReport(!showParentReport)}
              className="w-full text-left p-6 flex items-center justify-between hover:bg-surface-hover transition"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-foreground">
                  Parent Report
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-text-muted transition-transform ${
                  showParentReport ? "rotate-180" : ""
                }`}
              />
            </button>
            {showParentReport && (
              <div className="px-6 pb-6 animate-fade-in">
                <p className="text-text-secondary leading-relaxed">
                  {feedback.parentSummary}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-center">
        <button
          onClick={onNewTest}
          className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold transition flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Generate Another Test
        </button>
      </div>
    </div>
  );
}
