"use client";

import { useState } from "react";
import Header from "@/components/Header";
import QuizSetupForm from "@/components/QuizSetupForm";
import QuizPlayer from "@/components/QuizPlayer";
import ResultsView from "@/components/ResultsView";
import {
  GenerateQuizRequest,
  GeneratedQuiz,
  QuizResult,
  FeedbackReport,
  Question,
} from "@/lib/types";
import { BookOpen, Lightbulb, BarChart3, Sparkles } from "lucide-react";

type AppState = "setup" | "playing" | "results";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 hover:border-primary-light transition">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("setup");
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQuiz = async (request: GenerateQuizRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate quiz");
      }
      const data: GeneratedQuiz = await res.json();
      setQuiz(data);
      setAppState("playing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (quizResults: QuizResult[]) => {
    setResults(quizResults);
    setAppState("results");
    setFeedbackLoading(true);

    if (!quiz) return;

    try {
      const feedbackPayload = quiz.questions.map((q: Question) => {
        const result = quizResults.find((r) => r.questionId === q.id);
        return {
          stem: q.stem,
          correctAnswer: q.correctAnswer,
          studentAnswer: result?.selectedAnswer || "",
          isCorrect: result?.isCorrect || false,
          skillTag: q.skillTag,
        };
      });

      const res = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: quiz.bookTitle,
          gradeLevel: quiz.gradeLevel,
          results: feedbackPayload,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate feedback");
      }

      const data: FeedbackReport = await res.json();
      setFeedback(data);
    } catch {
      setFeedback(null);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleNewTest = () => {
    setAppState("setup");
    setQuiz(null);
    setResults([]);
    setFeedback(null);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm animate-fade-in">
            <strong>Error:</strong> {error}
          </div>
        )}

        {appState === "setup" && (
          <>
            <QuizSetupForm onSubmit={handleGenerateQuiz} isLoading={loading} />

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={BookOpen}
                title="Any Book"
                description="Works with any book at any reading level, from picture books to college literature."
              />
              <FeatureCard
                icon={Lightbulb}
                title="Skill-Targeted"
                description="Every question targets a specific comprehension skill using Bloom's Taxonomy."
              />
              <FeatureCard
                icon={BarChart3}
                title="Real Feedback"
                description="Detailed skill breakdowns and actionable growth areas — not just a score."
              />
              <FeatureCard
                icon={Sparkles}
                title="Parent Reports"
                description="Clear summaries parents can actually use to support their child's growth."
              />
            </div>
          </>
        )}

        {appState === "playing" && quiz && (
          <QuizPlayer
            quiz={quiz}
            onComplete={handleQuizComplete}
            onBack={handleNewTest}
          />
        )}

        {appState === "results" && quiz && (
          <ResultsView
            quiz={quiz}
            results={results}
            feedback={feedback}
            feedbackLoading={feedbackLoading}
            onNewTest={handleNewTest}
          />
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-text-muted">
        BookQuiz -- Comprehension tests that actually work.
      </footer>
    </div>
  );
}
