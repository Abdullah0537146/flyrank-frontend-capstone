"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "explain" | "quiz" | "practice";

type HistoryItem = {
  id: string;
  createdAt: number;
  mode: Mode;
  notes: string;
  output: string;
};

const MODES: { id: Mode; label: string; desc: string; icon: string }[] = [
  { id: "explain", label: "Explain", desc: "Step-by-step breakdown & key concepts", icon: "💡" },
  { id: "quiz", label: "Quiz", desc: "MCQs, short questions & answer keys", icon: "📝" },
  { id: "practice", label: "Practice", desc: "5 progressive problems & solutions", icon: "⚡" },
];

export default function Home() {
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("explain");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const HISTORY_KEY = "ai_study_assistant_history_v1";
  const [focusOutput, setFocusOutput] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const charCount = notes.length;

  const placeholder = useMemo(() => {
    if (mode === "explain") return "Paste your study notes or concept outline here… (e.g., calculus rules, chemical kinetics, system architecture)";
    if (mode === "quiz") return "Paste notes… We'll transform them into an interactive test with answer keys.";
    return "Paste notes… We'll generate practice challenges categorized from easy to advanced.";
  }, [mode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  async function extractTextFromPdf(file: File) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const strings = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .filter(Boolean);

      fullText += strings.join(" ") + "\n\n";
    }

    return fullText.trim();
  }

  async function ocrPdfToText(file: File) {
    const pdfjsLib = await import("pdfjs-dist");
    const { createWorker } = await import("tesseract.js");

    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const worker = await createWorker("eng");
    let fullText = "";

    try {
      const totalPages = pdf.numPages;
      setScanProgress(0);

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setScanStatus(`Scanning document page ${pageNum} of ${totalPages}…`);
        setScanProgress(Math.round(((pageNum - 1) / totalPages) * 100));

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        const dataUrl = canvas.toDataURL("image/png");
        const result = await worker.recognize(dataUrl);

        fullText += (result.data.text || "") + "\n\n";
      }

      setScanProgress(100);
      setScanStatus("Document scan complete.");
    } finally {
      await worker.terminate();
    }

    return fullText.trim();
  }

  async function getPdfPageCount(file: File) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    return pdf.numPages;
  }

  async function handleFileUpload(file: File) {
    setError("");
    const name = file.name.toLowerCase();

    if (name.endsWith(".txt")) {
      const text = await file.text();
      setNotes(text);
      return;
    }

    if (name.endsWith(".pdf")) {
      setLoading(true);
      setOutput("");
      setError("");
      setScanStatus("");
      setScanProgress(0);

      try {
        const text = await extractTextFromPdf(file);

        if (!text || text.length < 50) {
          const pages = await getPdfPageCount(file);
          const estSeconds = pages * 8 + 10;
          const estMinutes = Math.max(1, Math.round(estSeconds / 60));

          setScanStatus(
            `Scanned PDF detected — starting OCR processing (~${estMinutes} min)…`
          );

          const scannedText = await ocrPdfToText(file);
          setNotes(scannedText);
          return;
        }

        setNotes(text);
        return;
      } catch (e: any) {
        setError(e?.message || "Failed to read PDF.");
        return;
      } finally {
        setLoading(false);
        setScanStatus("");
        setScanProgress(0);
      }
    }

    setError("Please upload a supported .txt or .pdf file.");
  }

  async function handleRun() {
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Something went wrong.");
        return;
      }

      setOutput(data.result);

      const item: HistoryItem = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        mode,
        notes,
        output: data.result,
      };

      setHistory((prev) => [item, ...prev].slice(0, 20));
    } catch (e: any) {
      setError(e?.message || "Network connection error.");
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-indigo-600/15 blur-[128px]" />
        <div className="absolute top-1/3 right-10 h-96 w-96 rounded-full bg-violet-600/10 blur-[128px]" />
        <div className="absolute bottom-10 left-1/3 h-96 w-96 rounded-full bg-sky-600/10 blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              AI Study Workspace
            </div>

            <h1 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-white via-slate-100 to-indigo-300">
              AI Study Assistant
            </h1>
            <p className="mt-1 text-sm md:text-base font-medium text-indigo-400">
              Developed by Abdullah Munawar
            </p>
          </div>

          <p className="text-sm text-slate-400 max-w-md">
            Transform notes into structured explanations, targeted quizzes, and solved practice problems in seconds.
          </p>
        </header>

        {/* Main Grid Layout */}
        <div className={focusOutput ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-12 gap-6"}>
          
          {/* Left Column: Input Panel */}
          <section className={`lg:col-span-5 flex flex-col gap-6 ${focusOutput ? "hidden lg:hidden" : ""}`}>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-200">Study Mode</h2>
                <span className="text-xs text-slate-400">Select output style</span>
              </div>

              {/* Mode Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {MODES.map((m) => {
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`relative flex flex-col justify-between rounded-xl p-3 text-left transition-all duration-200 border ${
                        isSelected
                          ? "border-indigo-500/80 bg-indigo-950/40 shadow-lg shadow-indigo-950/50"
                          : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base">{m.icon}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                      </div>
                      <div className="mt-2">
                        <div className={`text-xs font-bold ${isSelected ? "text-indigo-200" : "text-slate-200"}`}>
                          {m.label}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Notes Input Area */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Your Notes</label>
                  <span className="text-xs text-slate-400">{charCount} characters</span>
                </div>

                <textarea
                  className="w-full h-56 resize-none rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition"
                  placeholder={placeholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {scanStatus && (
                  <div className="mt-3 rounded-xl border border-indigo-900/40 bg-indigo-950/30 p-3 text-xs text-indigo-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>{scanStatus}</span>
                      <span className="font-semibold">{scanProgress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload and Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-900 transition cursor-pointer">
                  <span>📎 Import .txt / .pdf</span>
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNotes("");
                      setOutput("");
                      setError("");
                    }}
                    className="rounded-xl border border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleRun}
                    disabled={loading || notes.trim().length < 10}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full" />
                        Generating…
                      </>
                    ) : (
                      "Generate Result"
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}
            </div>

            {/* History Card */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Recent Sessions</h3>
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-slate-400 hover:text-rose-400 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No previous runs saved yet.</p>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="group flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:border-indigo-500/40 hover:bg-slate-900/80 transition p-2.5"
                    >
                      <button
                        onClick={() => {
                          setMode(h.mode);
                          setNotes(h.notes);
                          setOutput(h.output);
                          setError("");
                        }}
                        className="text-left flex-1 min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            {h.mode}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(h.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-1">
                          {h.notes || "(Empty notes)"}
                        </p>
                      </button>

                      <button
                        onClick={() => setHistory((prev) => prev.filter((x) => x.id !== h.id))}
                        className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-rose-400 p-1 transition"
                        title="Delete entry"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Right Column: Output Panel */}
          <section className={`${focusOutput ? "w-full" : "lg:col-span-7"}`}>
            <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="p-4 md:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/80">
                <div>
                  <h2 className="text-base font-semibold text-slate-200">Generated Output</h2>
                  <p className="text-xs text-slate-400">AI-synthesized learning materials</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFocusOutput((v) => !v)}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-800/50 transition"
                  >
                    {focusOutput ? "Exit Fullscreen" : "Expand"}
                  </button>

                  <button
                    onClick={copyOutput}
                    disabled={!output}
                    className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {copied ? "Copied!" : "Copy Output"}
                  </button>
                </div>
              </div>

              <div className="p-5 md:p-6 flex-1 overflow-auto min-h-120">
                {loading && !output ? (
                  <div className="space-y-4 py-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-5 w-1/3 bg-slate-800 rounded-lg" />
                      <div className="h-4 w-full bg-slate-800/70 rounded-lg" />
                      <div className="h-4 w-5/6 bg-slate-800/70 rounded-lg" />
                      <div className="h-4 w-2/3 bg-slate-800/70 rounded-lg" />
                      <div className="h-20 w-full bg-slate-800/40 rounded-xl mt-4" />
                    </div>
                    <p className="text-xs font-medium text-indigo-400 text-center animate-pulse pt-4">
                      Structuring and organizing knowledge base…
                    </p>
                  </div>
                ) : output ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 mt-2 pb-2 border-b border-slate-800">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-indigo-200 mt-6 mb-3">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-slate-200 mt-5 mb-2">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-sm leading-relaxed text-slate-300 my-2.5">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 my-3 space-y-1.5 text-sm text-slate-300">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 my-3 space-y-1.5 text-sm text-slate-300">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-indigo-500 bg-indigo-950/20 px-4 py-3 rounded-r-xl my-4 text-slate-300 italic">
                            {children}
                          </blockquote>
                        ),
                        code: ({ className, children, ...props }) => {
                          const isBlock = typeof className === "string" && className.includes("language-");
                          if (!isBlock) {
                            return (
                              <code
                                className="px-1.5 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-900/50 text-indigo-300 text-xs font-mono"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }
                          return (
                            <code className="text-xs font-mono text-slate-200" {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-xs font-mono text-slate-200">
                            {children}
                          </pre>
                        ),
                        hr: () => <hr className="my-6 border-slate-800" />,
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto">
                            <table className="w-full text-xs text-left border border-slate-800 rounded-xl overflow-hidden">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-slate-800/60 text-slate-200 uppercase font-semibold">{children}</thead>
                        ),
                        th: ({ children }) => (
                          <th className="px-3.5 py-2.5 border-b border-slate-800">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3.5 py-2.5 border-b border-slate-900/60 text-slate-300">{children}</td>
                        ),
                      }}
                    >
                      {output}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500">
                    <div className="h-12 w-12 rounded-2xl border border-slate-800 bg-slate-950/50 flex items-center justify-center text-2xl mb-4">
                      💡
                    </div>
                    <h4 className="text-sm font-semibold text-slate-300">Ready to study</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Paste your notes, select an output mode on the left, and click <span className="text-indigo-400">Generate Result</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}