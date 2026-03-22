# Category A: Core Feature Enhancements

## 11.1 Test Ownership Dashboard

- Extract `owner` from doc frontmatter or CODEOWNERS files.
- Show ownership matrix: which engineer owns which test areas.
- Track "orphaned ownership" (owner left the team, tests have no active owner).
- Integrate with notification subscriptions so owners get alerts for their test failures.

**UI:** New tab "Ownership" within the Test Explorer page, positioned after the tree/detail split view. Layout uses a PatternFly `Card` grid (`Gallery` with `minWidths: 300px`). Each card shows an owner avatar (initials `Label` with `--pf-t--global--color--brand`), their name, component assignments, and test counts (owned / orphaned / quarantined). An `EmptyState` with `UserIcon` when no ownership data exists. Orphaned tests use a `Banner` variant `warning` at the top: "X tests have no assigned owner."

## 11.2 Coverage Heatmap

- Visual heatmap showing doc coverage density across components/folders.
- Hot spots (red) = areas with many tests but no docs. Cool spots (blue) = well-documented.
- Click a cell to drill into the tree at that folder.

**UI:** Available as a toggle view in the Test Explorer toolbar: `[Tree] [Flat] [Heatmap]`. The heatmap renders as a grid of rectangular cells using CSS Grid, with rows = components and columns = top-level folders. Cell colors use PatternFly design tokens: `--pf-t--global--color--status--danger--default` (no docs), `--pf-t--global--color--status--warning--default` (partial), `--pf-t--global--color--status--success--default` (fully documented). Each cell shows the coverage percentage on hover via PatternFly `Tooltip`. Clicking a cell navigates the tree view to that folder with filters applied.

## 11.3 Doc-Driven Test Generation

- AI reads a doc file and suggests a test skeleton based on the documented behavior.
- Opens a PR with the generated test file.
- Uses the existing skip annotation config to determine framework and file structure.

**UI:** In the file detail panel for doc files, add an action button with `MagicIcon` labeled "Generate Test". Clicking opens a `Modal` (`ModalVariant.large`) with two panels: left shows the doc content (read-only), right shows the AI-generated test code in a syntax-highlighted `CodeBlock` (PatternFly). Below the code: "Target path" text input (pre-filled from naming convention), framework label, and a diff preview. Footer: "Open PR" (primary, uses personal token), "Copy Code" (secondary), "Close" (link). Loading state shows `Spinner` in `Bullseye`, consistent with `AIActionButton`.

## 11.4 Quarantine Burndown Chart

- Trends page showing quarantine count over time.
- Goal line showing target "zero quarantined tests".
- Average quarantine duration metric.
- Component breakdown: which components quarantine the most.

**UI:** New section on the existing Trends page (`/trends`) titled "Quarantine Trends", or alternatively a tab within the Test Explorer page. Uses PatternFly Charts (`ChartLine` from `@patternfly/react-charts`). Two charts side by side in a `Flex`:
- **Left chart**: Line chart -- X axis = days (30d), Y axis = quarantine count. Two lines: "Active" (red/danger) and "Resolved" (green/success). A dashed horizontal goal line at zero.
- **Right chart**: Stacked bar chart -- X axis = components, Y axis = quarantine count, stacked by status (active/overdue/resolved). Colors follow the status pattern used in `StatusBadge`.
- Above the charts: `StatCard` row showing: "Active" (count), "Avg Duration" (days), "Overdue" (count with danger color), "Resolved This Month" (count with success color).

## 11.5 Cross-Repo Dependency Graph

- Some tests depend on shared utilities or fixtures across repos.
- Visualize which test files import from where (via static analysis or AI).
- Flag tests that depend on a quarantined utility.

**UI:** Accessible from the file detail panel via a "Dependencies" tab. Renders a directed graph using a lightweight graph library (e.g., `reactflow` or `elkjs` for layout). Nodes are files, edges are imports. Quarantined nodes have a red border and a `BanIcon` overlay. Clicking a node navigates to that file in the tree. For files with no dependencies, show `EmptyState` with `CubesIcon`: "No cross-repo dependencies detected." The graph container has a mini-map in the bottom-right corner and zoom controls.

## 11.6 Automated Doc Generation

- When a new test file is pushed (detected via webhook) with no matching doc, AI generates a draft doc file and opens a PR in the repo.
- The draft includes: inferred Jira ticket (from commit message or branch name), test description extracted from `describe`/`it` blocks, component assignment.

**UI:** When webhook detects an undocumented test, a notification appears in the Test Explorer page as a `Banner` variant `info`: "New undocumented test detected: `sriov-migration.spec.ts`. [Generate Doc PR]". The link opens a `Modal` showing the AI-generated markdown with live preview (split view: raw markdown left, rendered right). Frontmatter fields are editable `FormGroup` inputs at the top. Footer: "Open Doc PR" (primary), "Edit" (secondary, switches to full edit mode), "Dismiss" (link).

## 11.7 Slack Bot Commands

- `/quarantine <test-name> <reason>` -- quarantine from Slack.
- `/unquarantine <test-name>` -- resolve from Slack.
- `/test-status <test-name>` -- quick status check from Slack.

**UI:** No in-app UI needed. The Slack bot responses use Block Kit formatting consistent with the existing Slack notifier (`slack-blocks.ts`). Quarantine confirmation in Slack shows: test name, component, reason, SLA deadline, and a "View in Dashboard" link button that deep-links to the quarantine detail.

## 11.8 Quarantine Approval Workflow

- Quarantine requests can require approval from a test owner or lead before activation.
- Integrates with the existing acknowledgment system.

**UI:** When approval is required, the quarantine modal shows an additional `FormGroup`: "Approver" with a `SearchableSelect` (reusing the existing pattern) listing team members. After submission, the quarantine appears in a "Pending Approval" tab on the quarantine dashboard. The approver sees a `Banner` variant `info` on the Test Explorer page: "You have X quarantine requests awaiting your approval." Each pending item shows: test name, requester, reason, and "Approve" (primary) / "Reject" (danger) buttons. Approved quarantines transition to `active` and execute the Jira/PR steps.

## 11.9 Smart Search Across Docs and Tests

- Natural language search: "which tests cover NIC hot plug on OCP 4.16?"
- AI translates to structured filters and searches across docs, tests, RP items, and Jira tickets.
- Reuses the existing `nl-search` AI prompt pattern.

**UI:** The Test Explorer search input (`TextInput` with `SearchIcon`) supports both exact text filtering and natural language. When the user types a question (detected by `?` or natural language heuristics), a `MagicIcon` indicator appears in the input. On Enter, the query is sent to the AI endpoint. Results replace the tree with a flat list of matching items, each showing: file name, repo, match reason (AI-generated), relevance score as a `ProgressStepper` dots, and links to doc/test/Jira. A `Label` at the top: "AI Search -- X results" with a "Clear" button to return to tree view.

## 11.10 Periodic Full Sync Job

- Beyond the cache TTL and webhooks, run a full sync nightly to catch any drift.
- Compare hashes to detect silent changes (force-pushes, rebases).
- Generate a "sync report" showing what changed since last full sync.

**UI:** Sync reports appear in the settings page under "Repository Mapping" as an expandable `ExpandableSection` per repo: "Last full sync: 2h ago -- 3 files changed." Clicking expands to show a `Table` (`variant="compact"`) with columns: File, Change Type (added/modified/deleted as `Label` with color), Previous Hash, New Hash. A manual "Run Full Sync" button (secondary) triggers the job with a `Spinner` inline.
