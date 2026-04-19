# AGENTS.md

Persistent memory for AI agents working on this project. Updated as corrections and preferences are learned.

---

## Project Identity

- **Name**: CNV Console Monitor
- **Purpose**: Daily monitoring dashboard for CNV (Container-Native Virtualization) Console test runs from ReportPortal
- **Stack**: TypeScript monorepo (shared/server/client), React 18, Express 5, PatternFly 6, TanStack Query, TypeORM, Zod
- **Owner**: Matan Schatzman

---

## Coding Preferences (learned)

- Always use arrow functions (`const fn = () => {}`), never `function` declarations
- Do NOT use `React.FC` -- use typed props directly: `const Component = ({ title }: Props) => ...`
- Prefer `type` over `interface` (enforced by ESLint)
- Use inline type imports: `import { type Launch } from '...'`
- No inline styles in JSX -- all custom CSS goes in `app.css` using PatternFly tokens
- Named constants for magic values: `const FIVE_MINUTES_MS = 5 * 60 * 1000`
- Maximum 300 lines per file -- extract into sub-components or modules
- Use `??` over `||` for non-primitive fallbacks (ESLint enforced)
- Use `unknown` + type narrowing instead of `any`

---

## Git Workflow

- **NEVER push directly to `main`** -- all changes go through a feature branch + PR, no exceptions
- Branch naming: `feat/...`, `fix/...`, `refactor/...`, `chore/...`
- Always rebase on main before opening PR
- Before creating a PR, check if one already exists for the branch (`gh pr view`). If it exists and is OPEN, just push -- the PR auto-updates. Never create duplicate PRs.
- Use the PR workflow in `.cursor/rules/workflows/pr.mdc`

---

## Quality Gates

- ESLint: `--max-warnings 0` (zero tolerance for warnings)
- Prettier: enforced via lint-staged on commit
- Knip: blocking in pre-commit and CI (no unused files, deps, or exports)
- Husky pre-commit: lint-staged + format:check + knip
- CI: lint -> format:check -> build shared -> knip -> typecheck -> build -> test
- **BEFORE EVERY PR**: must run `npx eslint . --max-warnings 0 --fix` then `npx eslint . --max-warnings 0` and verify zero errors. Run against the ENTIRE repo (`.`), not just changed files — CI lints everything. Also run `npx knip` to catch unused exports. Never push without both passing.

---

## Persona Protocol

Every code-change prompt runs 6 personas via `orchestrator.mdc`:

1. System Architect (first responder, scope, questions)
2. Senior Developer (code quality, patterns)
3. Senior QE (edge cases, failures)
4. UX Expert (PatternFly, a11y, dark mode)
5. Security Reviewer (validation, tokens, OWASP)
6. Monitoring Expert (RP, pipeline, K8s)

Output format: summary table first, then details per persona, then ask to proceed.

---

## Monorepo Rules

- `shared` -> no runtime deps beyond zod, exports Zod schemas + inferred types
- `server` -> can import shared, NEVER import client
- `client` -> can import shared, NEVER import client from server
- Build order: shared -> server -> client
- Boundaries enforced by `eslint-plugin-boundaries`

---

## External Dependencies (dynamically loaded)

- `pino-pretty`: loaded by pino via string reference, NOT a static import. Knip `ignoreDependencies` entry required.

---

## Mandatory Regression Tests

### Report Table Visibility (recurring bug)

After ANY change to the following files, you MUST run the weekly report regression test:

```bash
npx vitest run packages/server/src/api/routes/reports.test.ts
```

**Affected files** (any modification triggers mandatory test run):
- `packages/client/src/pages/ReportEditorPage.tsx`
- `packages/client/src/pages/ReportDashboardPage.tsx`
- `packages/client/src/hooks/useReports.ts`
- `packages/client/src/hooks/useReportPollStatus.ts`
- `packages/client/src/api/reports.ts`
- `packages/client/src/components/report/**`
- `packages/server/src/api/routes/reports.ts`
- `packages/server/src/db/store/reports.ts`
- `packages/server/src/db/mappers/report.ts`
- `packages/server/src/report/aggregator.ts`

**Root cause context:** Generated reports not appearing in the dashboard table. The bug stems from component filter mismatches (`component=''` vs `undefined` vs specific string), cache key inconsistencies between the list query and invalidation, and entity-to-DTO mapping of the `component` field (empty string → `null`). The test file guards these invariants.

---

## Common Mistakes to Avoid

- Don't install Zod 4 in server -- shared uses Zod 3, they must match
- Don't remove `pino-pretty` from deps -- crashes server at runtime (dynamic import by pino)
- Don't use `eslint-plugin-import` -- conflicts with ESLint 9+, not compatible
- `@types/uuid` is unnecessary -- `uuid` ships its own types
- `new Set()` without generic type param infers `Set<unknown>` -- always write `new Set<string>()`
- ESLint `func-style: expression` means arrow functions everywhere, not `function` declarations
