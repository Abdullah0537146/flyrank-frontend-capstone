# AI Workflow Comparison & Analysis: Vague vs. Precise Prompting

## 1. Overview
This audit evaluates the difference in code correctness, accessibility, and engineering effort when building a User Settings Form component using a vague single-shot prompt (`vague-prompt` branch) versus a constrained, specs-driven prompt loop (`precise-prompt` branch).

---

## 2. Technical Diff & Comparison

### Round 1: Vague Prompt (`vague-prompt` branch)
- **Validation & Correctness:** Relied on basic browser-native HTML5 `required` attributes and unvalidated `useState` variables. Allowed whitespace-only strings for names and invalid email structures.
- **Accessibility:** Missing key ARIA roles (`aria-invalid`, `aria-describedby`). Screen readers would not announce inline validation errors.
- **Error Handling & State:** No loading state or API error boundary during submission.

### Round 2: Precise Prompt (`precise-prompt` branch)
- **Validation & Correctness:** Implemented type-safe schema validation using `zod` and `react-hook-form`. Prevented submission of invalid email strings or blank entries.
- **Accessibility:** Fully mapped input elements with dynamic `aria-invalid` flags and linked error message spans using `aria-describedby`.
- **Verification:** Automatically generated unit tests (`SettingsForm.test.tsx`) verifying both successful submit handlers and validation state renders.

---

## 3. Caught AI Mistake
In Round 1, the AI implemented state using multiple independent `useState` hooks without resetting form values upon submission, causing stale data to persist after submit. Round 2 resolved this by utilizing `react-hook-form`'s native `reset()` function upon successful mock submission.

---

## 4. Time & Review Effort
While Round 2 required ~3 minutes upfront to write out technical constraints, it required **zero manual refactoring** or bug fixing. Round 1 generated code in seconds, but required ~15 minutes of manual review to add validation, accessibility, and tests. Round 2 was significantly faster end-to-end.