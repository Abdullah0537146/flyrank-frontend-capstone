import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type Mode = "explain" | "quiz" | "practice";

function buildPrompt(notes: string, mode: Mode) {
  const system = `
You are an AI Study Assistant. Output must be clean, readable Markdown.

Formatting rules:
- Start with a clear title as an H1 (# Title).
- Use H2 (##) section headers for major sections.
- Use bullet points and short paragraphs (2–4 lines max each).
- Add blank lines between sections.
- If the user pasted code, include a "## Code Walkthrough" section.
- If the mode is Quiz: include "## Quiz" then numbered questions, then "## Answer Key" at the bottom.
- If the mode is Practice: include "## Practice Problems" then problems, then "## Worked Solutions".
- If the mode is Explain: include "## Key Ideas", "## Step-by-Step", and "## Quick Summary".
Keep it student-friendly and structured.
`.trim();

  let user = "";

  if (mode === "explain") {
    user = `Explain these notes step-by-step. Then give 3 example questions with worked solutions.\n\nNOTES:\n${notes}`;
  } else if (mode === "quiz") {
    user = `Create a quiz from these notes: 8 multiple choice and 3 short answer. Include an answer key.\n\nNOTES:\n${notes}`;
  } else if (mode === "practice") {
    user = `Generate 5 practice problems based on these notes (easy → harder). Provide worked solutions for each.\n\nNOTES:\n${notes}`;
  }

  return { system, user };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notes, mode } = body as { notes?: string; mode?: Mode };

    // Validate inputs
    if (!notes || typeof notes !== "string" || notes.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide at least 10 characters of notes." },
        { status: 400 }
      );
    }

    if (!mode || !["explain", "quiz", "practice"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const { system, user } = buildPrompt(notes, mode);

  // src/app/api/study/route.ts

// src/app/api/study/route.ts

const response = await ai.models.generateContent({
  model: "gemini-3.6-flash", // <-- Use this exact model ID
  contents: user,
  config: {
    systemInstruction: system,
    temperature: 0.3,
  },
});

    const result = response.text ?? "No response generated.";

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("GEMINI API ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error while contacting Gemini." },
      { status: 500 }
    );
  }
}