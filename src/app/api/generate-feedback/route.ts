import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { buildFeedbackPrompt } from "@/lib/prompts";
import { GradeLevel, FeedbackReport } from "@/lib/types";

interface FeedbackRequest {
  bookTitle: string;
  gradeLevel: GradeLevel;
  results: {
    stem: string;
    correctAnswer: string;
    studentAnswer: string;
    isCorrect: boolean;
    skillTag: string;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: FeedbackRequest = await req.json();
    const { bookTitle, gradeLevel, results } = body;

    if (!bookTitle || !gradeLevel || !results?.length) {
      return NextResponse.json(
        { error: "Book title, grade level, and results are required." },
        { status: 400 },
      );
    }

    const prompt = buildFeedbackPrompt(bookTitle, gradeLevel, results);

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      maxOutputTokens: 4096,
      temperature: 0.4,
    });

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const feedback: FeedbackReport = JSON.parse(cleaned);

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Feedback generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
