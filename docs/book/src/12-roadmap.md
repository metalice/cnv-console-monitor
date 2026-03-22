# Implementation Roadmap

Since the feature ships as a single release, the implementation order follows dependency chains:

## Step 1: Data Foundation (Server)

1. Create TypeORM entities: `Repository`, `RepoFile`, `Quarantine`, `QuarantineLog`, `UserToken`.
2. Create migration (migration #24).
3. Create store modules: `repositories.ts`, `repoFiles.ts`, `quarantines.ts`, `userTokens.ts`.
4. Add Zod schemas in `packages/shared`: `repository.ts`, `repoFile.ts`, `quarantine.ts`, `userToken.ts`.

## Step 2: Git Provider Clients (Server)

1. Create `packages/server/src/clients/git-provider.ts` -- abstract interface.
2. Implement `gitlab.ts` (GitLab API v4: tree, file content, create branch, create MR).
3. Implement `github-repo.ts` (GitHub API: tree, file content, create branch, create PR).
4. Create `RepoSyncService` with: `syncRepo()`, `fetchTree()`, `parseDocFrontmatter()`, `matchFiles()`.
5. Add markdown parsing with frontmatter extraction (use `gray-matter` package).

## Step 3: API Routes (Server)

1. `routes/repositories.ts` -- CRUD for repos.
2. `routes/test-explorer.ts` -- tree, file detail, gaps, stats, sync.
3. `routes/quarantine.ts` -- full quarantine lifecycle.
4. `routes/webhooks.ts` -- git push handler.
5. `routes/user-tokens.ts` -- personal token CRUD and validation (GitLab, GitHub, Jira).
6. All routes use Zod validation middleware.

## Step 4: Quarantine Engine (Server)

1. `QuarantineService` -- create, resolve, check SLA, log actions.
2. Jira integration: create quarantine tickets using the user's personal Jira token (extend existing Jira client to accept per-request token override).
3. RP integration: update defect type (extend existing RP client).
4. PR integration: create skip annotation branches/PRs via git provider clients, using the user's personal GitLab/GitHub token from `user_tokens`.
5. Cron job: SLA checker (add to `serve-cron.ts`).

## Step 5: AI Prompts (Server)

1. Create prompt files: `gap-analysis.md`, `quarantine-suggest.md`, `doc-quality.md`, `file-matching.md`.
2. Add AI route handlers in `routes/ai.ts` (extend existing).
3. Integrate AI quarantine monitoring into the SLA cron job.

## Step 6: Client API Layer

1. `packages/client/src/api/repositories.ts`
2. `packages/client/src/api/testExplorer.ts`
3. `packages/client/src/api/quarantine.ts`
4. `packages/client/src/api/userTokens.ts`
5. Extend `packages/client/src/api/ai.ts` with new endpoints.

## Step 7: UI Components (Client)

1. `components/test-explorer/FileTree.tsx` -- recursive tree with PatternFly TreeView.
2. `components/test-explorer/FileDetail.tsx` -- detail panel with tabs.
3. `components/test-explorer/GapBadge.tsx` -- gap type indicators.
4. `components/test-explorer/QuarantineDashboard.tsx` -- bottom panel table.
5. `components/test-explorer/QuarantineModal.tsx` -- create/resolve modals.
6. `components/test-explorer/AIInsightsDrawer.tsx` -- AI analysis drawer.
7. `components/settings/RepositoryMappingSection.tsx` -- settings section.
8. `components/settings/RepositoryModal.tsx` -- add/edit repo modal.
9. `components/settings/GitTokensSection.tsx` -- global tokens (admin) + personal tokens (GitLab, GitHub, Jira per user).

## Step 8: Pages and Navigation (Client)

1. Create `pages/TestExplorerPage.tsx`.
2. Add route in `App.tsx`: `/test-explorer`.
3. Add sidebar nav item in `AppLayout.tsx`.
4. Add quarantine settings and git token sections to `SettingsPage.tsx`.
5. Wire up WebSocket for `tree-updated` events.

## Step 9: Webhook and Cron Integration (Server)

1. Register webhook route in Express app.
2. Add quarantine SLA cron to `serve-cron.ts`.
3. Add quarantine stats to notification dispatch (Slack/email).

## Step 10: Testing

1. Unit tests for: file matching logic, frontmatter parsing, quarantine state machine, SLA computation.
2. Route tests for: repository CRUD, quarantine lifecycle, webhook validation.
3. Integration test for: tree sync end-to-end with mock git provider.
