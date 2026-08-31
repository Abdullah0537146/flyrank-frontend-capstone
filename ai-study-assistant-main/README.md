# AI Study Assistant (MVP)

A full-stack AI study helper that turns your notes into **explanations**, **quizzes**, or **practice problems**. Supports **.txt and PDF import**, **Markdown-formatted output**, and **history** so you can revisit past runs.

## ✨ Features
- **3 modes**: Explain / Quiz / Practice
- **Real AI generation** via backend API route (`/api/study`)
- **Readable output**: Markdown rendering (headings, bullets, code blocks, tables)
- **Import notes**:
  - `.txt` import (fast)
  - `.pdf` import with PDF.js text extraction + local worker
- **History**: saves past runs locally (localStorage), click to restore
- **Focus Output mode**: expands the output area and hides input

## 🧱 Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Next.js API Route (`src/app/api/study/route.ts`)
- **LLM Provider**: Groq (OpenAI-compatible API)
- **PDF parsing**: `pdfjs-dist` (worker served from `/public`)
- **Markdown**: `react-markdown` + `remark-gfm`

## 🧠 Architecture (High-level)
Browser UI → `fetch("/api/study")` → Next.js API Route → Gemini LLM → JSON response → UI renders Markdown

## 🚀 Getting Started (Local)
1) Install Node.js (LTS recommended)
2) Clone repo and install deps:

```bash
npm install
