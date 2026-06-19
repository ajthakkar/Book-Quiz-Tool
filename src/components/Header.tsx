"use client";

import { BookOpen } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              BookQuiz
            </h1>
            <p className="text-xs text-text-muted">
              Comprehension tests that actually work
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
