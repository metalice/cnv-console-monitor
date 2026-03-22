# Category G: Advanced UX

## 11.38 Inline Doc Editor

- Edit markdown docs directly in the browser, commit changes, and open a PR.

**UI:** In the file detail panel for doc files, an "Edit" `Button` (secondary, `PencilAltIcon`) in the toolbar. Clicking switches the rendered markdown view to a split-pane editor: left = raw markdown in a `TextArea` with monospace font (`app-text-mono`), right = live rendered preview. The frontmatter fields appear as editable `FormGroup` inputs above the editor (Jira ID, test file path, owner, tags). Toolbar above the editor: "Save & Open PR" (primary), "Reset" (secondary), "Cancel" (link). The save action commits to a new branch and opens a PR with title "[docs] Update {filename}".

## 11.39 Test Explorer Deep Links

- Every tree node gets a shareable URL that preserves the full navigation state.

**UI:** No dedicated component. URL updates via React Router `useSearchParams` as the user navigates: `/test-explorer?repo=kubevirt-ui&branch=main&path=docs/networking/nic-hot-plug.md&view=tree`. A "Copy Link" `Button` (variant `plain`, `LinkIcon`) in the file detail panel toolbar copies the deep link to clipboard with a `Tooltip` confirmation: "Link copied." When the page loads with query params, the tree auto-expands to the specified node and selects it.

## 11.40 Keyboard Navigation and Command Palette

- Arrow keys for tree navigation, shortcuts for common actions, Cmd+K command palette.

**UI:** The tree view is keyboard-accessible via PatternFly TreeView's built-in ARIA. Additional shortcuts overlay accessible via `?` key: a `Modal` listing shortcuts in a two-column `DescriptionList`: "Navigate tree" = Arrow keys, "Expand/Collapse" = Enter, "Search" = `/`, "Quarantine" = `Q`, "Triage" = `T`, "Open in Repo" = `O`, "Copy Link" = `L`, "Command Palette" = `Cmd+K`. The command palette is a `Modal` with a `TextInput` at the top (auto-focused), showing filtered results below as a `Menu` with keyboard selection. Results include: files, tests, quarantines, actions ("Quarantine selected", "Sync repos", "Open settings").

## 11.41 Bulk Operations

- Select multiple tests/docs and perform bulk actions.

**UI:** A "Select" toggle `Button` (variant `control`) in the Test Explorer toolbar. When active, each tree node and flat-view row gets a `Checkbox`. A floating action bar appears at the bottom of the page (PatternFly `Toolbar` with sticky positioning): "X selected" count, "Bulk Quarantine" (primary), "Bulk Tag" (secondary), "Bulk Assign Owner" (secondary), "Clear Selection" (link). Clicking "Bulk Quarantine" opens a single `QuarantineModal` that lists all selected tests and applies the same reason/SLA to all, creating individual quarantine records and a single Jira epic with sub-tasks.

## 11.42 Quarantine Handoff on Resolve

- Require a structured handoff note when unquarantining: what was fixed, which commit, verification link.

**UI:** The resolve quarantine modal (triggered by "Unquarantine" button) adds required fields: "Fix Description" (`TextArea`), "Fix Commit/PR" (`TextInput` with URL validation and `ExternalLinkAltIcon`), "Verification Run" (`TextInput` -- RP launch URL). An optional "Lessons Learned" `TextArea`. All fields are required before the "Resolve" button enables. The handoff note is stored in `quarantine_log` and displayed on the quarantine detail view's timeline and in the activity feed.

## 11.43 Quarantine Post-Mortem Template

- Auto-generate structured post-mortem on quarantine resolution.

**UI:** After resolving a quarantine with handoff notes (11.42), an `AIActionButton` "Generate Post-Mortem" appears on the quarantine detail view. Clicking runs AI analysis and opens a `Modal` (`ModalVariant.large`) with the generated report: Root Cause Category (selectable `Label` group), Timeline (visual, reusing the timeline pattern from 11.20), Metrics (time-to-detect, time-to-quarantine, time-to-fix as `DescriptionList`), Lessons Learned, and Recommendations. Footer: "Save" (stores in DB), "Export PDF" (secondary), "Share via Slack" (secondary, posts to configured channel). Aggregate post-mortems are viewable from the quarantine metrics tab as a searchable `DataList`.

## 11.44 Release Gate Integration

- Tie quarantine status to readiness scoring. Block release sign-off if quarantine count exceeds threshold.

**UI:** On the Readiness page (`/readiness/:version`), the existing readiness checklist gains a new automated check: "Quarantine Threshold" showing "X tests quarantined (threshold: Y)". Status: `CheckCircleIcon` green if under, `ExclamationCircleIcon` red if over. Clicking the row expands to show the quarantined tests for that version with links to each quarantine. The AI risk assessment prompt receives quarantine data as input, factoring it into the Ship/Hold/Needs Attention recommendation. If the threshold is exceeded, the "Sign Off" button is disabled with a `Tooltip` explaining the blocker.

## 11.45 Sync Health Dashboard

- Monitor repo sync health: timing, errors, rate limits, cache hit rates.

**UI:** In the settings page under "Repository Mapping", a collapsible `ExpandableSection` "Sync Health" (default collapsed). Inside: a `Table` with one row per repo and columns: Repo Name, Last Sync (`TimeAgo`), Duration (ms), Status (`StatusBadge` -- success/error), API Rate Limit Remaining (progress bar), Cache Hits (%), Files Synced. A `Banner` variant `danger` at the top if any repo hasn't synced in > 1 hour: "Repository {name} has not synced successfully in 3 hours." An auto-refresh interval (30s) using `useQuery` with `refetchInterval`.

## 11.46 Tree Diff View (Branch Comparison)

- Compare file trees between two branches to see what tests/docs are branch-specific.

**UI:** In the Test Explorer toolbar, a "Compare Branches" `Button` (secondary, `CodeBranchIcon`). Clicking opens a `Toolbar` row below with two `Select` dropdowns: "Base branch" and "Compare branch" and a "Compare" button. The tree view transforms into a diff view: files present in both branches show as normal, files only in base show with a red `MinusCircleIcon`, files only in compare show with a green `PlusCircleIcon`. A summary `Banner` at the top: "12 files only in main, 3 files only in release-4.16, 45 files in both." The flat view gains a "Diff Status" column: Both, Base Only, Compare Only (as colored `Label` components).

## 11.47 Predictive Quarantine

- AI predicts which tests are likely to need quarantining in the next release based on historical patterns.

**UI:** In the AI Insights drawer, a "Predictions" section. Shows a `Table` of predicted-at-risk tests: Test Name, Component, Risk Score (0-100 as a colored `PassRateBar`), Risk Factors (truncated, expandable), Suggested Action. Each row has a "Pre-quarantine" action button that opens the quarantine modal pre-filled with AI-generated reason. A `Banner` at the top: "Based on historical patterns, these X tests have a >70% probability of failure in CNV 4.18." The predictions are refreshed when new trend data is available.

## 11.48 Cross-Version Test Matrix

- Matrix showing test pass/fail across all tracked branches and CNV versions.

**UI:** Accessible as a new view in the Test Explorer: toolbar toggle `[Tree] [Flat] [Heatmap] [Matrix]`. The matrix renders as a `Table` where rows = test names (grouped by component, collapsible) and columns = branches/versions. Each cell shows a `StatusBadge` (PASSED/FAILED/SKIPPED/QUARANTINED/NOT_RUN). Column headers are rotated 45 degrees for space efficiency. A `Select` filter for component and a `TextInput` for test name search. Cells are clickable, navigating to the specific test run in the Launch Detail page. A summary row at the bottom shows pass rate per branch.

## 11.49 Metric Export (Prometheus/OpenMetrics)

- Expose quarantine and sync metrics at `/metrics` for Prometheus scraping.

**UI:** In settings, an "Integrations" section gains a "Prometheus Metrics" toggle with `Switch`. When enabled, shows the metrics endpoint URL in a `ClipboardCopy` block. Below: a live preview of current metric values in a `CodeBlock` (monospace, read-only). Metrics include: `quarantine_active_total`, `quarantine_overdue_total`, `quarantine_resolved_total`, `quarantine_avg_duration_seconds`, `repo_sync_duration_seconds`, `repo_sync_errors_total`, `tree_files_total{type="doc|test"}`, `tree_gaps_total{type="orphaned|undocumented|dead|phantom"}`.

## 11.50 AI Test Rewrite Suggestions

- For repeatedly quarantined tests, AI suggests targeted code changes to improve resilience.

**UI:** In the file detail panel for test files with quarantine count > 2, a `Banner` variant `info` with `MagicIcon`: "This test has been quarantined X times. AI can suggest improvements." A "Suggest Improvements" `AIActionButton`. The result modal shows: a list of suggestions, each with: description, confidence, and a code diff (`CodeBlock` with green/red line highlighting). Suggestions are categorized: "Add explicit wait", "Use stable selector", "Improve error handling", "Add retry logic." Each suggestion has an "Apply & Open PR" button that commits the change via the user's personal token.
