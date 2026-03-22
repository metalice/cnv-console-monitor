# Category B: Intelligence and Analytics

## 11.11 Quarantine Impact Score

- Before quarantining, compute and display an impact score: how many versions/tiers the test runs in, frequency, whether it's a gating test, and coverage reduction.

**UI:** Shown in the quarantine modal as a `Card` at the top with a colored left border (green = low impact, yellow = medium, red = high). Inside: a `DescriptionList` (`isHorizontal`, `isCompact`) with: "Runs in" (X tiers, Y versions), "Frequency" (daily/weekly), "Coverage Impact" (-X% for component), "Gating" (yes/no `Label`). If high impact, an `Alert` variant `warning` below: "This is a high-impact test. Quarantining it will reduce Networking coverage from 94% to 87%. Consider investigating before quarantining."

## 11.12 Test Correlation Engine

- Find tests that statistically co-fail. Warn when quarantining one test in a correlated group.

**UI:** In the file detail panel for test files, a "Correlated Tests" section below the run history. Shows a compact `Table` of co-failing tests sorted by correlation strength: columns are Test Name, Correlation (percentage as `PassRateBar` reuse), Last Co-failure (relative time via `TimeAgo`). Clicking a row navigates to that test. When quarantining, if correlated tests exist, the quarantine modal shows an `Alert` variant `info`: "This test co-fails 90% of the time with `bridge-binding.spec.ts`. Consider quarantining both or investigating the shared root cause."

## 11.13 Quarantine Budget per Component

- Configurable maximum percentage of tests that can be quarantined per component. Warn at threshold, block at limit.

**UI:** Configured in the quarantine settings section (new `FormGroup`: "Max quarantine %" with `NumberInput`, per-component overrides via a `Table`). On the quarantine dashboard, each component row shows a mini progress bar (`PassRateBar` pattern): "Networking: 3/45 quarantined (7%)" -- green if under budget, yellow if approaching (>80% of limit), red if at/over limit. When at limit, the "Quarantine" button in the modal is disabled with a `Tooltip`: "Quarantine budget exceeded for Networking (10%). Resolve existing quarantines or request admin override."

## 11.14 Git Blame Integration for Doc Staleness

- Use `git blame` data to compute a "freshness score" based on modification velocity delta between doc and test files.

**UI:** In the file detail panel for doc files, a "Freshness" indicator next to the file name: a `Label` with one of three states -- "Fresh" (green, `CheckCircleIcon`), "Aging" (yellow, `ExclamationTriangleIcon`), "Stale" (red, `ExclamationCircleIcon`). Below the metadata section, a `DescriptionList` row: "Doc last modified: 6 months ago | Test last modified: 2 days ago | 15 test commits since last doc update." The freshness score also appears as a column in the tree flat view, sortable.

## 11.15 PR/MR Status Tracking for Quarantines

- Track the full PR lifecycle: created -> review -> approved -> merged -> deployed. Only mark quarantine as "active in CI" once the PR is merged.

**UI:** On the quarantine detail view and dashboard table, the "PR" column shows a multi-step `ProgressStepper` (PatternFly) with steps: Created, Reviewed, Merged. Current step is highlighted with brand color. Clicking the stepper opens the PR in a new tab. The quarantine status shows a sub-status: "Active (PR pending merge)" vs "Active (skip effective)". When the PR is merged, a WebSocket event updates the UI in real time.

## 11.16 Test Health Score

- Composite score per test: pass rate + flaky score + quarantine history + doc quality + code freshness.

**UI:** Shown in the tree view as a colored dot next to each test node (reusing the `--pf-t--global--color--status--*` tokens). In the flat view, a sortable "Health" column with a numeric score (0-100) rendered as a small `PassRateBar`. In the file detail panel, a "Health Score" `Card` with a donut chart (`ChartDonut` from PatternFly Charts) showing the breakdown: pass rate (40%), stability (20%), documentation (15%), freshness (15%), quarantine history (10%). Each segment is clickable to show details.

## 11.17 Quarantine Velocity Metrics

- Track mean-time-to-quarantine, mean-time-to-fix, recurrence rate, quarantine-to-fix ratio.

**UI:** New "Metrics" tab on the quarantine dashboard (alongside Active/Overdue/History). Layout: four `StatCard` components in a `Gallery` row at the top. Below: a `Table` breakdown by component with columns: Component, MTTQ, MTTF, Recurrence Rate, Fix Ratio. Sortable columns. Each metric cell uses color coding: green if within healthy range, yellow if borderline, red if concerning. A `HelpLabel` (reusing existing pattern) on each column header explains the metric.

## 11.18 Component Risk Radar

- Spider/radar chart per component showing multiple health dimensions.

**UI:** Accessible from the Component Health page as a toggle: `[Cards] [Radar]`. The radar view shows a PatternFly Chart (`ChartArea` in polar mode, or a custom SVG radar). Each axis represents a dimension: Doc Coverage, Pass Rate, Quarantine Count (inverted), Flaky Score (inverted), Avg Fix Time (inverted), Code Churn. Multiple components can be overlaid for comparison (up to 3, selected via `Select` multi-dropdown). The chart sits inside a `Card` with a legend below mapping colors to components.

## 11.19 Failure Pattern Library

- Searchable knowledge base of known failure patterns with root causes and recommended fixes.

**UI:** New page at `/patterns` (or a tab within Test Explorer). Header with `SearchIcon` `TextInput` for filtering. Content: PatternFly `DataList` (not Table, since items are variable-height). Each item is an `DataListItem` showing: error signature (monospace, truncated), root cause category (`Label` with color), affected components (`LabelGroup`), hit count, last seen (`TimeAgo`), and a recommended fix (collapsed, expandable). Clicking "View" opens a `Drawer` from the right with the full pattern detail, related test items, and an "Apply Fix" `AIActionButton`.

## 11.20 Test Lifecycle Timeline

- Full visual biography of a test: creation, first doc, first run, failures, quarantines, fixes.

**UI:** In the file detail panel for test files, a "Lifecycle" tab. Uses a vertical `Timeline` pattern (CSS, since PatternFly doesn't have a native timeline): a vertical line with event dots. Each event shows: icon (color-coded by type), date, description, and optional link. Event types: `CodeBranchIcon` (created), `FileIcon` (doc added), `PlayIcon` (first RP run), `ExclamationCircleIcon` (first failure), `BanIcon` (quarantined), `CheckCircleIcon` (resolved), `WrenchIcon` (code modified). The timeline scrolls vertically and supports date range filtering.

## 11.21 Unused Doc Detection

- Detect docs with matching tests but no updates while the test has been modified repeatedly.

**UI:** In the AI Insights drawer, a dedicated section "Zombie Docs" with a `Table` (`variant="compact"`): Doc File, Test File, Doc Last Updated, Test Commits Since, Freshness Score. Each row has actions: "Archive" (opens a PR to move the doc to an `archive/` folder), "Refresh" (opens the inline doc editor pre-filled with AI-suggested updates). A `Banner` variant `info` at the top of the section: "X docs may be outdated and no longer maintained."
