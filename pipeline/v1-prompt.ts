/* The v1 prompt, kept unchanged so the evaluation can compare against it.
   v1 sent only the book's title: the model never saw the text. */
export type GradeLevel = "K-2" | "3-5" | "6-8" | "9-12" | "college";

function getLevelConfig(grade: GradeLevel) {
  switch (grade) {
    case "K-2":
      return {
        bloomFocus: "Remember (40%), Understand (40%), Apply (20%)",
        questionTypes: "multiple choice only, with 3 answer choices instead of 4",
        maxQuestions: 8,
        style:
          "Use simple, short sentences. Use familiar words. Questions should feel warm and encouraging. Start with 'Who', 'What', 'Where', 'When' stems.",
        depth:
          "Focus on explicitly stated information, basic sequencing, and identifying characters and settings.",
        answerLength: "Answers should be 1 short sentence maximum.",
      };
    case "3-5":
      return {
        bloomFocus:
          "Remember (20%), Understand (30%), Apply (25%), Analyze (25%)",
        questionTypes:
          "60% multiple choice (4 choices), 40% short response (1-2 sentences)",
        maxQuestions: 12,
        style:
          "Clear, direct language. Begin introducing inferential questions like 'Why do you think...?' and 'What evidence shows...?'. Include 1-2 vocabulary-in-context questions.",
        depth:
          "Test main idea, cause-effect, character motivation, and basic inference. Require students to point to text evidence.",
        answerLength:
          "MC: single best answer. Short response: 1-3 sentences with text evidence.",
      };
    case "6-8":
      return {
        bloomFocus:
          "Understand (15%), Apply (25%), Analyze (35%), Evaluate (25%)",
        questionTypes:
          "40% multiple choice, 35% short response (2-4 sentences), 25% extended response (paragraph)",
        maxQuestions: 15,
        style:
          "Use academic language appropriate for middle school. Include questions about author's craft, literary devices, and theme development. Require text evidence for all responses.",
        depth:
          "Test inference, author's purpose, figurative language analysis, theme tracing, and comparing perspectives. Ask 'How does the author use ___ to develop ___?'",
        answerLength:
          "MC: single best answer. Short response: 2-4 sentences with quotes. Extended: full paragraph with embedded evidence.",
      };
    case "9-12":
      return {
        bloomFocus:
          "Apply (15%), Analyze (30%), Evaluate (35%), Create (20%)",
        questionTypes:
          "30% multiple choice, 30% short response, 30% extended response, 10% essay-style",
        maxQuestions: 20,
        style:
          "Sophisticated academic language. Questions should require synthesis, critical evaluation, and connection to broader themes. Include cross-chapter analysis.",
        depth:
          "Test thematic analysis, rhetorical strategies, narrative technique, unreliable narration, symbolism, and author's craft at an advanced level. Ask students to evaluate and synthesize.",
        answerLength:
          "MC: nuanced answers where distractors are partially correct. Short response: 3-5 sentences. Extended: multi-paragraph with thesis and evidence.",
      };
    case "college":
      return {
        bloomFocus: "Analyze (25%), Evaluate (40%), Create (35%)",
        questionTypes:
          "20% multiple choice (highly nuanced), 30% short response, 50% extended response and essay",
        maxQuestions: 25,
        style:
          "Assume literary sophistication. Questions may invoke theoretical lenses (formalist, historicist, reader-response). Require original argumentation.",
        depth:
          "Test critical literary analysis, thematic synthesis across the full work, evaluation of authorial choices, and original interpretive arguments.",
        answerLength:
          "All responses require sustained analytical writing with embedded textual evidence and interpretive claims.",
      };
  }
}

export function buildQuizGenerationPrompt(
  bookTitle: string,
  gradeLevel: GradeLevel,
  author?: string,
  chapters?: string,
  focusAreas?: string,
  questionCount?: number,
): string {
  const config = getLevelConfig(gradeLevel);
  const count = Math.min(questionCount || config.maxQuestions, config.maxQuestions);

  return `You are a master reading comprehension test designer with 15+ years of experience writing assessment items for standardized tests (NAEP, SBAC, PARCC, SAT, AP Literature). You produce fair, rigorous, text-dependent questions that genuinely measure comprehension skills — never trivia.

## YOUR TASK
Generate a reading comprehension test for the book "${bookTitle}"${author ? ` by ${author}` : ""}.
${chapters ? `Focus on: ${chapters}` : "Cover the full book."}
${focusAreas ? `The student/parent wants to focus on: ${focusAreas}` : ""}

## STUDENT LEVEL: ${gradeLevel}
- **Bloom's Taxonomy distribution**: ${config.bloomFocus}
- **Question format mix**: ${config.questionTypes}
- **Question count**: Generate exactly ${count} questions
- **Language and style**: ${config.style}
- **Depth of comprehension**: ${config.depth}
- **Answer expectations**: ${config.answerLength}

## HARD RULES — NEVER VIOLATE
1. Every question MUST be answerable from the book's text — no outside knowledge required
2. NO trick questions — challenge should be comprehension, not decoding confusing wording
3. For multiple choice: distractors must be PLAUSIBLE but CLEARLY wrong upon careful reading — they should reflect common misreadings, not absurd options
4. NEVER ask trivial detail questions ("What color was X's hat?") unless the detail is thematically significant
5. Each question must target exactly ONE comprehension skill from this list:
   - Literal: explicit info, sequencing, stated character traits
   - Inferential: conclusions, motivation, prediction, cause-effect
   - Evaluative: author's purpose, character decisions, perspectives
   - Analytical: literary devices, text structure, word choice, theme development
   - Applied: real-world connections, synthesis across sections
6. No "all of the above" or "none of the above"
7. MC answer choices should be similar in length — correct answer should NOT be noticeably longer
8. Questions must progress from easier to harder within the test

## CHAIN-OF-THOUGHT: For each question, internally verify:
- Is this answerable from the text alone?
- Does this test real comprehension, not trivia?
- Is the reading level appropriate for ${gradeLevel}?
- Would a student who truly understood get this right?
- Would a student who skimmed carelessly get this wrong?

## OUTPUT FORMAT
Respond with ONLY a valid JSON object (no markdown fencing, no extra text) matching this schema:

{
  "bookTitle": "string",
  "author": "string",
  "gradeLevel": "${gradeLevel}",
  "bookSummaryContext": "A 2-3 sentence summary of what the book is about, used to orient the student",
  "questions": [
    {
      "id": "q1",
      "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
      "comprehensionSkill": "literal-explicit|literal-sequence|literal-character-traits|inferential-conclusions|inferential-motivation|inferential-prediction|inferential-cause-effect|evaluative-purpose|evaluative-decisions|evaluative-perspectives|analytical-devices|analytical-structure|analytical-word-choice|analytical-theme|applied-connections|applied-synthesis",
      "questionType": "multiple_choice|short_response|extended_response",
      "stem": "The question text",
      "choices": [
        {"label": "A", "text": "First option", "isCorrect": false},
        {"label": "B", "text": "Second option", "isCorrect": true},
        {"label": "C", "text": "Third option", "isCorrect": false},
        {"label": "D", "text": "Fourth option", "isCorrect": false}
      ],
      "correctAnswer": "The correct answer text",
      "explanation": "Why this answer is correct, referencing the text. This will be shown to the student after answering, so make it educational and encouraging.",
      "textReference": "Chapter X / specific scene or passage reference",
      "difficulty": 1-5,
      "skillTag": "A short human-readable skill label like 'Character Motivation' or 'Theme Analysis'"
    }
  ]
}

For short_response and extended_response questions, omit the "choices" field and provide the correctAnswer as a model response the student's answer will be compared against.

Generate exactly ${count} questions now.`;
}

export function buildFeedbackPrompt(
  bookTitle: string,
  gradeLevel: GradeLevel,
  results: { stem: string; correctAnswer: string; studentAnswer: string; isCorrect: boolean; skillTag: string }[],
): string {
  const resultsText = results
    .map(
      (r, i) =>
        `Q${i + 1}: "${r.stem}"
   Student answered: "${r.studentAnswer}"
   Correct answer: "${r.correctAnswer}"
   Result: ${r.isCorrect ? "CORRECT" : "INCORRECT"}
   Skill: ${r.skillTag}`,
    )
    .join("\n\n");

  return `You are a warm, encouraging reading coach who gives specific, actionable feedback. A ${gradeLevel} student just completed a comprehension test on "${bookTitle}".

## RESULTS
${resultsText}

## FEEDBACK RULES
1. For CORRECT answers: Brief positive reinforcement. Be specific ("Your understanding of character motivation is strong — you correctly identified WHY Marcus acted that way, not just WHAT he did.")
2. For INCORRECT answers:
   - NEVER say "wrong" — use "Let's look at this more closely"
   - Explain WHY the correct answer works using the text
   - Explain the common misunderstanding that led to their answer
   - Give a specific strategy for similar questions
3. Frame EVERYTHING as learnable skills, not fixed ability
4. Identify patterns: "You're strong at ___ but could practice ___"

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown fencing):

{
  "overallScore": <number correct>,
  "totalQuestions": <total>,
  "strengths": ["Specific strength 1 with example", "Specific strength 2"],
  "growthAreas": ["Specific area 1 with practice suggestion", "Specific area 2"],
  "questionFeedback": [
    {
      "questionId": "q1",
      "wasCorrect": true/false,
      "feedback": "Specific feedback for this question"
    }
  ],
  "parentSummary": "A 3-4 sentence parent-friendly summary: what the score means in context, what the student does well, what to practice, and a suggested next step. Be honest but encouraging.",
  "skillBreakdown": [
    {"skill": "inferential-motivation", "correct": 2, "total": 3, "label": "Character Motivation"}
  ],
  "nextSteps": ["Specific actionable recommendation 1", "Specific recommendation 2", "Specific recommendation 3"]
}`;
}
