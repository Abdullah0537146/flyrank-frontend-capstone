# FlyRank Capstone Development Rules

## Tech Stack
- Frontend: React / Next.js
- Styling: Tailwind CSS
- Language: TypeScript / JavaScript

## Code Style & Conventions
- Use clean, modular, functional components.
- Prioritize semantic HTML and accessible UI design.
- Keep components small and specialized.
- Follow Conventional Commits for all repository update.    
- Ensure all component files use PascalCase.

## Testable Project Rules (From Workflow Drill)
1. Forms must always use `react-hook-form` paired with `zod` validation schemas—never uncontrolled inputs or raw `useState` form hooks.
2. All inputs displaying inline validation errors must include `aria-invalid` and `aria-describedby` attributes linked to the error message container ID.
3. Every interactive UI component must be accompanied by a corresponding unit test verifying interaction and error states before merging.