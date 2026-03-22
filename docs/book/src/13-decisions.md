# Decisions

All open questions have been resolved. Decisions are recorded here for reference.

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | **Frontmatter parsing library** | **Use `gray-matter`** | Standard library (28M weekly downloads), handles YAML/JSON/TOML frontmatter. Used server-side to extract the `---` YAML block from `.md` doc files. |
| 2 | **Tree rendering performance** | **Full tree upfront** | Fetch the complete tree structure in a single API call, cache aggressively (respecting `cacheTtlMinutes`). Simpler implementation, fewer network round-trips. |
| 3 | **Skip annotation format** | **Multiple configs per repo, matched by file path pattern** | A single repo may contain Playwright and Cypress tests. Skip annotation config supports an array of entries, each with a file path glob (e.g., `*.spec.ts` -> Playwright `test.skip`, `*.cy.ts` -> Cypress `it.skip`). |
| 4 | **Quarantine notifications** | **Both: Activity feed + quarantine-specific timeline** | Quarantine events (create, resolve, overdue, AI suggestions) appear in the main Activity feed for unified visibility, AND on a dedicated timeline within the Test Explorer page's quarantine dashboard. |
| 5 | **Permissions** | **Any authenticated user** | Any authenticated user can create and resolve quarantines. No admin restriction. This keeps the workflow lightweight and encourages adoption. |
| 6 | **Phantom test threshold** | **Any unmatched RP test item** | Any RP test item that does not match a file in any registered repository is flagged as a phantom test immediately. No minimum run threshold -- if the repos are registered and synced, any unmatched test is notable. |
| 7 | **Multi-branch support** | **Support multiple branches per repo** | Repos can track multiple branches (e.g., `main` + `release-4.16`). The `defaultBranch` field becomes `branches: string[]`. Tree view shows branch selector. This is important for release-specific test tracking. |

---

*This document is ready for team review. All design decisions have been made.*
