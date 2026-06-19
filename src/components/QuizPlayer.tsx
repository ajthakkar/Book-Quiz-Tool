"use client";

import { useState } from "react";
import { GeneratedQuiz, Question, QuizResult } from "@/lib/types";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Send,
  BookOpen,
  BarChart3,
} from "lucide-react";

interface Props {
  quiz: GeneratedQuiz;
  onComplete: (results: QuizResult[]) => void;
  onBack: () => void;
}

function BloomBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    remember: "bg-blue-100 text-blue-700",
    understand: "bg-green-100 text-green-700",
    apply: "bg-yellow-100 text-yellow-800",
    analyze: "bg-orange-100 text-orange-700",
    evaluate: "bg-red-100 text-red-700",
    create: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[level] || "bg-gray-100 text-gray-600"}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function SkillBadge({ skill }: { skill: string }) {
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
      {skill}
    </span>
  );
}

export default function QuizPlayer({ quiz, onComplete, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  const question = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length + Object.keys(textAnswers).length;
  const allAnswered = answeredCount === totalQuestions;
  const progress = (answeredCount / totalQuestions) * 100;

  const isCurrentAnswered = question.questionType === "multiple_choice"
    ? !!answers[question.id]
    : !!textAnswers[question.id]?.trim();

  const handleMCSelect = (choiceLabel: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: choiceLabel }));
  };

  const handleTextChange = (value: string) => {
    setTextAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleSubmit = () => {
    const results: QuizResult[] = quiz.questions.map((q: Question) => {
      if (q.questionType === "multiple_choice") {
        const selectedLabel = answers[q.id];
        const selectedChoice = q.choices?.find((c) => c.label === selectedLabel);
        return {
          questionId: q.id,
          selectedAnswer: selectedChoice?.text || "",
          isCorrect: selectedChoice?.isCorrect || false,
        };
      } else {
        return {
          questionId: q.id,
          selectedAnswer: textAnswers[q.id] || "",
          isCorrect: false,
        };
      }
    });
    onComplete(results);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-sm text-text-secondary hover:text-foreground transition flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          New test
        </button>
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {quiz.bookTitle}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-text-secondary">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-6 animate-slide-up"
        key={question.id}
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <BloomBadge level={question.bloomLevel} />
          <SkillBadge skill={question.skillTag} />
          {question.textReference && (
            <span className="text-xs text-text-muted">
              {question.textReference}
            </span>
          )}
        </div>

        <p className="text-lg font-medium text-foreground mb-6 leading-relaxed">
          {question.stem}
        </p>

        {question.questionType === "multiple_choice" && question.choices ? (
          <div className="space-y-3">
            {question.choices.map((choice) => {
              const isSelected = answers[question.id] === choice.label;
              return (
                <button
                  key={choice.label}
                  onClick={() => handleMCSelect(choice.label)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary-light hover:bg-surface-hover"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-background text-text-secondary"
                    }`}
                  >
                    {choice.label}
                  </span>
                  <span className="text-foreground pt-1">{choice.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <textarea
              value={textAnswers[question.id] || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                question.questionType === "extended_response"
                  ? "Write a detailed response using evidence from the text..."
                  : "Write your answer here..."
              }
              rows={question.questionType === "extended_response" ? 6 : 3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
            <p className="text-xs text-text-muted mt-2">
              {question.questionType === "extended_response"
                ? "Use specific evidence from the text to support your response."
                : "Answer in 1-3 complete sentences."}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl border border-border text-text-secondary hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-1.5">
          {quiz.questions.map((q: Question, i: number) => {
            const answered = q.questionType === "multiple_choice"
              ? !!answers[q.id]
              : !!textAnswers[q.id]?.trim();
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentIndex
                    ? "bg-primary scale-125"
                    : answered
                      ? "bg-success"
                      : "bg-border"
                }`}
              />
            );
          })}
        </div>

        {currentIndex < totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
              isCurrentAnswered
                ? "bg-primary text-white hover:bg-primary-dark"
                : "border border-border text-text-secondary hover:text-foreground hover:bg-surface"
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="px-5 py-2.5 rounded-xl bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition flex items-center gap-2"
          >
            {allAnswered ? (
              <>
                <Send className="w-4 h-4" />
                Submit Test
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                {answeredCount}/{totalQuestions} done
              </>
            )}
          </button>
        )}
      </div>

      {!allAnswered && currentIndex === totalQuestions - 1 && (
        <p className="text-center text-sm text-text-muted mt-4">
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Answer all questions to submit the test.
        </p>
      )}
    </div>
  );
}
