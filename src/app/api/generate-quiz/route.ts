import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { buildQuizGenerationPrompt } from "@/lib/prompts";
import { GenerateQuizRequest, GeneratedQuiz } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateQuizRequest = await req.json();
    const { bookTitle, author, gradeLevel, chapters, focusAreas, questionCount } = body;

    if (!bookTitle || !gradeLevel) {
      return NextResponse.json(
        { error: "Book title and grade level are required." },
        { status: 400 },
      );
    }

    const prompt = buildQuizGenerationPrompt(
      bookTitle,
      gradeLevel,
      author,
      chapters,
      focusAreas,
      questionCount,
    );

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      maxOutputTokens: 8192,
      temperature: 0.3,
    });

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const quiz: GeneratedQuiz = JSON.parse(cleaned);

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Quiz generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
