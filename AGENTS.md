# Repository Guidelines

## Project Structure & Module Organization
- `app/` – Next.js App Router. Pages (`page.tsx`, `layout.tsx`), global styles (`globals.css`), and API routes under `app/api/*` (e.g., `app/api/chat/route.ts`).
- `components/` – Feature and UI components. Reusable primitives live in `components/ui` (shadcn-style).
- `hooks/` – Custom React hooks (e.g., `use-workflow.ts`).
- `lib/` – Utilities and core logic (e.g., `workflow-engine.ts`, `utils.ts`).
- `styles/` – Global Tailwind CSS.
- `public/` – Static assets.

## Build, Test, and Development Commands
- `pnpm dev` – Run the local dev server.
- `pnpm build` – Production build (`.next/`).
- `pnpm start` – Start built app.
- `pnpm lint` – ESLint via Next.js rules.
Notes: Use Node 18+. Install deps with `pnpm i`.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; prefer small, focused components.
- Filenames: kebab-case (`agent-manifest-editor.tsx`, `use-workflow.ts`). Hooks start with `use*`.
- Imports: use alias `@/*` (see `tsconfig.json`).
- Styling: Tailwind CSS; keep class lists readable; prefer extracting to components when complex.
- Linting: fix issues reported by `pnpm lint` before committing.

## Testing Guidelines
- No test runner is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Place tests alongside sources as `*.test.ts(x)` or under `__tests__/`.
- Aim for smoke tests on components and unit tests for `lib/` utilities.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix:`, `chore:`). The history uses `feat:`/`fix:`.
- PRs must include: clear description, linked issues, test plan, and screenshots/GIFs for UI changes.
- Keep PRs scoped and reviewable; include migration notes if changing APIs or data contracts.

## Security & Configuration
- Secrets: never commit `.env*`. Configure locally in `.env.local`.
- Required envs: `OPENAI_API_KEY` for `app/api/chat/route.ts` streaming. Example:
  ```env
  OPENAI_API_KEY=sk-...
  ```
- Server-only secrets must NOT be prefixed with `NEXT_PUBLIC_`.
- When changing streaming or API payloads, keep the server/client protocol in sync (client expects `0:{...}` text-delta lines).

