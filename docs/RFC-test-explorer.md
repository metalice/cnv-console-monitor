# RFC: Test Explorer — Documentation Tree, Quarantine System, and AI-Powered Test Intelligence

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| **Authors** | Matan Schatzman                            |
| **Status**  | Draft                                      |
| **Created** | 2026-03-22                                 |
| **Project** | CNV Console Monitor                        |
| **Labels**  | feature, ai, test-management, quarantine   |

---

## Table of Contents

1. [Summary](#1-summary)
2. [Motivation](#2-motivation)
3. [Glossary](#3-glossary)
4. [Architecture Overview](#4-architecture-overview)
5. [Feature Specifications](#5-feature-specifications)
   - 5.1 [Repository Registry](#51-repository-registry)
   - 5.2 [Test Documentation Tree](#52-test-documentation-tree)
   - 5.3 [AI-Powered Gap Analysis](#53-ai-powered-gap-analysis)
   - 5.4 [Quarantine System](#54-quarantine-system)
   - 5.5 [Test Explorer Page (UI)](#55-test-explorer-page-ui)
   - 5.6 [Settings: Repository Mapping](#56-settings-repository-mapping)
6. [Data Model](#6-data-model)
7. [API Endpoints](#7-api-endpoints)
8. [AI Prompt Specifications](#8-ai-prompt-specifications)
9. [Webhook Integration](#9-webhook-integration)
10. [Security Considerations](#10-security-considerations)
11. [Additional Ideas and Future Enhancements](#11-additional-ideas-and-future-enhancements)
    - Category A: Core Feature Enhancements (11.1 -- 11.10)
    - Category B: Intelligence and Analytics (11.11 -- 11.21)
    - Category C: CI/CD and Pipeline Integration (11.22 -- 11.25)
    - Category D: Cross-System Orchestration (11.26 -- 11.29)
    - Category E: Data Integrity and Operations (11.30 -- 11.33)
    - Category F: Collaboration and Social (11.34 -- 11.37)
    - Category G: Advanced UX (11.38 -- 11.50)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Decisions](#13-decisions-formerly-open-questions)

---

## 1. Summary

Add a **Test Explorer** page to the CNV Console Monitor that provides a navigable tree view of test documentation and test code sourced from GitLab and GitHub repositories. The tree is rebuilt on every page refresh by fetching repository contents via API, with optional webhook-based sync for real-time updates.

On top of the tree, this feature adds:

- **AI gap analysis** that cross-references documentation files against actual test code files (and vice versa) to surface orphaned docs, untested features, and missing documentation.
- A full **quarantine system** that lets users quarantine flaky or broken tests — with duration tracking, Jira ticket creation, ReportPortal defect updates, and PR generation to add skip annotations in the test repo.
- **AI-assisted quarantine** that monitors quarantined tests for fix signals and suggests unquarantine, plus configurable time-limit alerts for stale quarantines.

The settings page gains a new **Repository Mapping** section where administrators map CNV Monitor components to one or more GitLab/GitHub repositories, with configurable naming, doc path patterns, test path patterns, and frontmatter schema.

---

## 2. Motivation

### Current Pain Points

1. **No visibility into test documentation**: QE engineers maintain markdown docs in Git repos (e.g., `playwright/docs/`) but the CNV Monitor has no awareness of them. Engineers must context-switch between the monitor dashboard and Git UIs to understand what a test covers.

2. **Jira-to-code mapping is manual and fragile**: The connection between Jira tickets, documentation files, and test code files exists only in engineers' heads or scattered frontmatter fields. There is no centralized view.

3. **Quarantine is informal**: When a test is flaky or broken, there is no formal process. Tests linger in "To Investigate" forever. There is no tracking of how long a test has been quarantined, no alerts for stale quarantines, and no automated skip-annotation PRs.

4. **Gap discovery is reactive**: Teams only notice missing documentation or orphaned test files when something breaks. There is no proactive analysis.

### What This Enables

- A single pane of glass for test documentation, code, Jira mapping, and quarantine status.
- AI-driven discovery of coverage gaps and documentation drift.
- Formal quarantine lifecycle with duration tracking, SLAs, and automated actions.
- Reduced triage time: engineers can see doc context, Jira tickets, and quarantine history without leaving the dashboard.

---

## 3. Glossary

| Term                 | Definition                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Test Explorer**    | The new page in the CNV Monitor sidebar that shows the documentation tree and quarantine dashboard.         |
| **Repository**       | A GitLab or GitHub repo registered in the system, mapped to one or more components.                         |
| **Doc File**         | A markdown file in a repo's documentation path (e.g., `playwright/docs/networking/nic-hot-plug.md`).       |
| **Test File**        | A test code file in a repo's test path (e.g., `tests/networking/nic-hot-plug.spec.ts`).                    |
| **Frontmatter**      | YAML metadata at the top of a markdown doc file (fields are configurable per repository).                   |
| **Gap**              | A mismatch: a doc file with no corresponding test file, or a test file with no corresponding doc.           |
| **Quarantine**       | A formal state marking a test as temporarily disabled, with tracked duration and required Jira ticket.      |
| **Quarantine SLA**   | Configurable maximum duration a test may remain quarantined before alerting.                                 |
| **Skip Annotation**  | A framework-specific marker in test code that causes the test runner to skip the test (e.g., `test.skip`).  |

---

## 4. Architecture Overview

```
                                        +---------------------+
                                        |   GitLab / GitHub   |
                                        |   Repositories      |
                                        +----------+----------+
                                                   |
                              +--------------------+--------------------+
                              |                                         |
                     API fetch (on demand)                   Webhook (push events)
                              |                                         |
                              v                                         v
                   +----------+----------+                 +------------+-----------+
                   | RepoSyncService     |                 | POST /api/webhooks/    |
                   | - fetchTree()       |                 |   git-push             |
                   | - fetchDocFiles()   |                 | - validates signature  |
                   | - fetchTestFiles()  |                 | - triggers sync        |
                   | - parseMarkdown()   +<----------------+ - invalidates cache    |
                   +----------+----------+                 +------------------------+
                              |
                              v
                   +----------+----------+
                   |  PostgreSQL          |
                   |  - repositories      |
                   |  - repo_files        |
                   |  - doc_metadata      |
                   |  - quarantines       |
                   |  - quarantine_log    |
                   +----------+----------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
   +----------+----------+        +-----------+-----------+
   |  AI Analysis         |       | REST API               |
   |  - gap-analysis      |       | GET  /api/test-explorer|
   |  - quarantine-suggest|       | POST /api/quarantine   |
   |  - doc-quality       |       | POST /api/webhooks     |
   |  - coverage-map      |       +----------+-------------+
   +-----------+----------+                  |
               |                             v
               +-------------> React SPA (Test Explorer Page)
                                - Tree view (Component > Repo > Folders)
                                - Gap indicators
                                - Quarantine dashboard
                                - AI suggestions panel
```

### Data Flow: Page Refresh

```
User navigates to /test-explorer
        |
        v
React calls GET /api/test-explorer/tree?component=...
        |
        v
Server checks cache freshness (TTL per repo, default 5 min)
        |
   [cache fresh] --> return cached tree
        |
   [cache stale] --> fetch repo tree from GitLab/GitHub API
        |              parse doc frontmatter
        |              diff against test files
        |              store in DB, update cache timestamp
        |              return tree
        v
React renders tree with gap indicators and quarantine badges
```

### Data Flow: Quarantine Lifecycle

```
Engineer clicks "Quarantine" on a test
        |
        v
POST /api/quarantine/create
        |
        +---> Insert quarantine record (DB)
        +---> Create Jira ticket (if enabled)
        +---> Update ReportPortal defect type to "No Defect" or custom
        +---> Open PR to add skip annotation (if enabled)
        +---> Broadcast via WebSocket
        v
Quarantine is active
        |
        +---> Daily cron checks SLA (configurable, e.g., 14 days)
        |       |
        |       +--> SLA exceeded? --> Notify via Slack/email, mark "overdue"
        |
        +---> AI monitors test results
                |
                +--> Test passing in recent runs? --> Suggest unquarantine
                +--> Underlying Jira resolved?    --> Suggest unquarantine
        |
        v
Engineer clicks "Unquarantine"
        |
        +---> Close/update Jira ticket
        +---> Revert skip annotation PR (or open new PR)
        +---> Update ReportPortal defect type back
        +---> Log duration in quarantine_log
```

---

## 5. Feature Specifications

### 5.1 Repository Registry

A repository is a GitLab or GitHub repo registered in the system. Each repository belongs to one or more components and has configurable paths and parsing rules.

#### Repository Configuration Fields

| Field                | Type       | Required | Description                                                                       |
| -------------------- | ---------- | -------- | --------------------------------------------------------------------------------- |
| `id`                 | UUID       | auto     | Primary key                                                                       |
| `name`               | string     | yes      | Human-readable display name (e.g., "KubeVirt UI Tests")                           |
| `provider`           | enum       | yes      | `gitlab` or `github`                                                              |
| `url`                | string     | yes      | Full repo URL                                                                     |
| `apiBaseUrl`         | string     | yes      | API base (e.g., `https://gitlab.cee.redhat.com/api/v4` or `https://api.github.com`) |
| `projectId`          | string     | yes      | GitLab project ID or GitHub `owner/repo`                                          |
| `branches`           | string[]   | yes      | Branches to track (e.g., `["main", "release-4.16"]`). First entry is the default. |
| `globalTokenKey`     | string     | yes      | Reference to a setting key storing the global read-only token (for tree sync)      |
| `docPaths`           | string[]   | yes      | Glob patterns for doc files (e.g., `["playwright/docs/**/*.md"]`)                 |
| `testPaths`          | string[]   | yes      | Glob patterns for test files (e.g., `["tests/**/*.spec.ts"]`)                     |
| `frontmatterSchema`  | object     | no       | Configurable frontmatter field mapping (see below)                                |
| `components`         | string[]   | yes      | Which CNV Monitor components this repo maps to                                    |
| `cacheTtlMinutes`    | number     | no       | How long to cache tree data before re-fetching (default: 5)                       |
| `webhookSecret`      | string     | no       | Secret for validating webhook payloads                                            |
| `skipAnnotations`    | object[]   | no       | Array of framework-specific skip configs, each with a file glob (see 5.4)         |
| `enabled`            | boolean    | yes      | Whether this repo is actively synced                                              |

#### Frontmatter Schema (Configurable Per Repo)

Since different repos may use different frontmatter fields, the schema is configurable. The admin maps semantic fields to actual frontmatter keys:

```json
{
  "jiraField": "jira",
  "testFileField": "test_file",
  "polarionField": "polarion_id",
  "componentField": "component",
  "ownerField": "owner",
  "tagsField": "tags",
  "customFields": ["priority", "area", "feature"]
}
```

This way, a repo using `ticket:` for Jira IDs works just as well as one using `jira_id:`.

#### Token Model (Global vs. Personal)

Integration tokens use a **two-tier model** -- global tokens for read-only system operations, personal tokens for actions that should be attributed to the individual engineer.

| Token Type                 | Scope         | Stored In                     | Used For                                              |
| -------------------------- | ------------- | ----------------------------- | ----------------------------------------------------- |
| **Global GitLab token**    | Read-only     | `settings` table (admin)      | Tree sync, file content fetch, webhook validation     |
| **Global GitHub token**    | Read-only     | `settings` table (admin)      | Tree sync, file content fetch, webhook validation     |
| **Global Jira token**      | Read + Search | `settings` table (admin)      | Jira search, read issues, fetch metadata              |
| **Personal GitLab token**  | Read + Write  | `user_tokens` table           | PR/MR creation (quarantine skip), branch creation     |
| **Personal GitHub token**  | Read + Write  | `user_tokens` table           | PR creation (quarantine skip), branch creation        |
| **Personal Jira token**    | Write         | `user_tokens` table           | Create Jira tickets, add comments, transition issues  |

**Global tokens** are configured by an admin in the settings page. They power all read-only and background operations:
- GitLab/GitHub: tree sync, file content fetching. Minimal scope (`read_repository` / `repo:read`).
- Jira: search, issue metadata. The existing global Jira token already serves this role. It continues to be used for all read operations (search, triage, linking).

**Personal tokens** are configured per user in their personal settings. Each user provides their own tokens for the providers they need. These are used exclusively for write operations attributed to the user:
- GitLab/GitHub PAT with write scope (`api` / `repo`): creating branches, committing skip annotations, opening PRs/MRs.
- Jira PAT: creating quarantine tickets, adding comments, transitioning issues. The ticket reporter/assignee will be the actual engineer, not a shared bot account.

**Quarantine requires personal tokens**: When a user quarantines a test, two write operations happen under their identity:
1. **Jira ticket** -- created using the user's personal Jira token. Reporter = the engineer.
2. **Skip PR** -- created using the user's personal GitLab/GitHub token. PR author = the engineer.

**Fallback behavior**:
- If a user tries to quarantine but is missing required personal tokens, the UI shows inline prompts indicating which tokens need to be configured, with a direct link to their token settings.
- The quarantine record is still created in the DB and RP defect is updated (these use global tokens/system operations), but the Jira ticket and PR steps are skipped with notes on the quarantine record: "Jira ticket not created -- no personal Jira token" / "Skip PR not created -- no personal GitLab token."
- The user can retry the skipped actions later after configuring their tokens (via "Retry" buttons on the quarantine detail view).

**Token validation**:
- When a user saves a personal token, the server validates it by calling the provider's "current user" endpoint:
  - GitLab: `GET /api/v4/user`
  - GitHub: `GET /user`
  - Jira: `GET /rest/api/2/myself`
- The response confirms the token is valid and returns the authenticated username/email.

---

### 5.2 Test Documentation Tree

The tree is the core UI element. It presents a hierarchical view organized as:

```
Component (e.g., "Networking")
└── Repo (e.g., "kubevirt-ui / playwright")
    └── Folder (e.g., "docs/networking/")
        ├── nic-hot-plug.md          [DOC] [Jira: CNV-1234] [Test: ✓]
        ├── nic-hot-unplug.md        [DOC] [Jira: CNV-1235] [Test: ✗ MISSING]
        └── bridge-binding.md        [DOC] [Jira: CNV-1236] [Test: ✓] [QUARANTINED 5d]
    └── Folder (e.g., "tests/networking/")
        ├── nic-hot-plug.spec.ts     [TEST] [Doc: ✓] [Last Run: PASSED]
        ├── bridge-binding.spec.ts   [TEST] [Doc: ✓] [Last Run: FAILED] [QUARANTINED]
        └── sriov-migration.spec.ts  [TEST] [Doc: ✗ MISSING] [Last Run: PASSED]
```

#### Tree Node Properties

Each node in the tree carries metadata:

| Property          | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `type`            | `component`, `repo`, `folder`, `doc`, `test`, `other`              |
| `name`            | File or folder name                                                |
| `path`            | Full path within the repo                                          |
| `repoUrl`         | Direct link to the file in GitLab/GitHub                           |
| `hasCounterpart`  | Whether a doc has a matching test (or vice versa)                  |
| `counterpartPath` | Path of the matched file (if any)                                  |
| `jiraKeys`        | Jira ticket keys extracted from frontmatter                        |
| `polarionId`      | Polarion test case ID (if present)                                 |
| `quarantine`      | Quarantine info (if quarantined): status, since, Jira key, SLA     |
| `lastRunStatus`   | Latest ReportPortal run result for this test (if matchable)        |
| `lastRunDate`     | When the test last ran                                             |
| `owner`           | Owner from frontmatter or CODEOWNERS                               |
| `tags`            | Tags/labels from frontmatter                                       |

#### Matching Logic (Doc <-> Test)

The system matches doc files to test files using multiple strategies (in priority order):

1. **Explicit frontmatter**: Doc's `test_file` frontmatter field points directly to the test file path.
2. **Naming convention**: `docs/networking/nic-hot-plug.md` matches `tests/networking/nic-hot-plug.spec.ts` (strip extensions, compare base names and relative paths).
3. **Folder structure**: Doc folder hierarchy mirrors test folder hierarchy.
4. **AI fuzzy matching**: For remaining unmatched files, AI suggests likely pairings based on file names, content similarity, and Jira context.

#### RP Test Matching

To show `lastRunStatus`, the system attempts to match tree test files to ReportPortal test items using:

1. Unique ID matching (if the RP test item's `uniqueId` contains the file path or test name).
2. Name matching (test item name vs. `describe`/`it` block names extracted from the test file).
3. Polarion ID matching (if both the doc frontmatter and RP test item share a Polarion ID).

---

### 5.3 AI-Powered Gap Analysis

When the tree is built, the AI layer runs analysis to detect issues. Results are shown as badges, banners, and a dedicated "AI Insights" panel.

#### Gap Types Detected

| Gap Type                    | Description                                                                 | Severity |
| --------------------------- | --------------------------------------------------------------------------- | -------- |
| **Orphaned Doc**            | A doc file exists but no matching test file was found.                       | Warning  |
| **Undocumented Test**       | A test file exists but no matching doc file was found.                       | Info     |
| **Stale Doc**               | Doc references a Jira ticket that is closed/resolved but test is missing.    | Warning  |
| **Dead Test**               | Test file exists in repo but never appears in ReportPortal runs.             | Error    |
| **Phantom Test**            | Test runs in ReportPortal but no corresponding test file exists in any repo. | Error    |
| **Quarantine Overdue**      | Test has been quarantined longer than the configured SLA.                    | Warning  |
| **Quarantine Fix Detected** | AI detects the underlying issue may be resolved.                             | Info     |
| **Doc Drift**               | Doc content does not reflect recent test changes (based on git diff dates). | Info     |

#### AI Analysis API

The AI analysis runs server-side and produces a structured report:

```typescript
type GapAnalysisReport = {
  summary: string;
  totalDocs: number;
  totalTests: number;
  matchedPairs: number;
  gaps: Array<{
    type: GapType;
    severity: 'error' | 'warning' | 'info';
    filePath: string;
    repoName: string;
    component: string;
    suggestion: string;
    relatedJira?: string;
    confidence: number;
  }>;
  stats: {
    docCoverage: number;      // % of tests that have docs
    testCoverage: number;     // % of docs that have tests
    quarantined: number;
    quarantineOverdue: number;
    deadTests: number;
    phantomTests: number;
  };
};
```

---

### 5.4 Quarantine System

The quarantine system is a first-class feature with its own lifecycle, tracking, and integrations.

#### Quarantine States

```
  PROPOSED --> ACTIVE --> RESOLVED
                 |
                 +--> OVERDUE --> RESOLVED
                 |
                 +--> EXPIRED (auto-closed after max duration)
```

- **PROPOSED**: AI suggested quarantine; awaiting human approval.
- **ACTIVE**: Test is quarantined. Skip annotation PR may be open/merged.
- **OVERDUE**: Active but past the SLA deadline. Alerts are sent.
- **EXPIRED**: Auto-transitioned after a configurable max duration (e.g., 30 days). Requires re-evaluation.
- **RESOLVED**: Manually unquarantined. Skip annotation reverted.

#### Quarantine Record Fields

| Field              | Type     | Description                                                     |
| ------------------ | -------- | --------------------------------------------------------------- |
| `id`               | UUID     | Primary key                                                     |
| `testName`         | string   | Full test name (RP unique ID or file path)                      |
| `testFilePath`     | string   | Path in the repo (if known)                                     |
| `repoId`           | UUID     | Repository reference                                            |
| `component`        | string   | Component this test belongs to                                  |
| `status`           | enum     | `proposed`, `active`, `overdue`, `expired`, `resolved`          |
| `reason`           | string   | Why the test was quarantined (free text)                        |
| `quarantinedBy`    | string   | Who initiated the quarantine                                    |
| `quarantinedAt`    | datetime | When quarantine started                                         |
| `resolvedAt`       | datetime | When quarantine ended (null if still active)                    |
| `resolvedBy`       | string   | Who resolved it                                                 |
| `slaDays`          | number   | SLA for this quarantine (default from settings)                 |
| `slaDeadline`      | datetime | Computed: `quarantinedAt + slaDays`                             |
| `jiraKey`          | string   | Linked Jira ticket for the quarantine                           |
| `rpDefectUpdated`  | boolean  | Whether RP defect type was updated                              |
| `skipPrUrl`        | string   | URL of the PR adding the skip annotation                        |
| `skipPrStatus`     | enum     | `pending`, `merged`, `closed`                                   |
| `revertPrUrl`      | string   | URL of the PR reverting the skip (on unquarantine)              |
| `aiSuggested`      | boolean  | Whether AI proposed this quarantine                             |
| `aiFixDetectedAt`  | datetime | When AI detected the fix (if applicable)                        |

#### Quarantine Actions

When a test is quarantined, the following actions execute (each configurable on/off):

1. **Jira Ticket Creation**
   - **Uses the requesting user's personal Jira token.** The ticket reporter will be the actual engineer, not a shared bot account.
   - Creates a bug in the configured Jira project.
   - Summary: `[Quarantine] {testName}`.
   - Description includes: reason, component, recent failure history, RP links.
   - Labels: `quarantine`, `cnv-monitor`.
   - Links to the doc file and test file in the repo.
   - If the user has no personal Jira token, the quarantine proceeds without creating a ticket and logs a note: "Jira ticket not created -- no personal Jira token configured."

2. **ReportPortal Defect Update**
   - Updates the latest failed test item's defect type to a configurable category (e.g., "No Defect" sub-type "Quarantined" or a custom defect sub-type).
   - Adds a comment linking to the quarantine record and Jira ticket.

3. **Skip Annotation PR**
   - Uses the GitLab/GitHub API to create a branch and commit.
   - The skip annotation format is configurable per repo. Multiple frameworks are supported, matched by file glob:

   ```json
   [
     {
       "fileGlob": "**/*.spec.ts",
       "framework": "playwright",
       "pattern": "test.skip",
       "template": "test.skip('Quarantined: {{jiraKey}} - {{reason}}');",
       "insertBefore": "test\\("
     },
     {
       "fileGlob": "**/*.cy.ts",
       "framework": "cypress",
       "pattern": "it.skip",
       "template": "it.skip('Quarantined: {{jiraKey}} - {{reason}}',",
       "insertBefore": "it\\("
     }
   ]
   ```

   - Opens a PR/MR with title `[quarantine] Skip {testName} ({jiraKey})`.
   - PR body includes links to the quarantine dashboard, Jira ticket, and failure history.
   - **Uses the requesting user's personal access token** (not the global read-only token). The PR author will be the actual engineer, providing clear accountability.
   - If the user has no personal token configured for the relevant provider, the UI shows an inline prompt: "Configure your {provider} personal access token in Settings to create skip PRs." The quarantine proceeds without the PR step, and logs a note on the quarantine record.

#### Quarantine Duration Tracking

- Every quarantine record stores `quarantinedAt` and computes duration in real time.
- The quarantine dashboard shows: current duration, SLA deadline, days remaining/overdue.
- A daily cron job checks all active quarantines:
  - If `now > slaDeadline`: transition to `OVERDUE`, send Slack/email alert.
  - If `now > quarantinedAt + maxDuration`: transition to `EXPIRED`.

#### AI Unquarantine Suggestions

The AI monitors quarantined tests by checking:

1. **Recent RP Results**: If the test has passed in N consecutive recent runs (configurable, default 3), suggest unquarantine.
2. **Jira Status**: If the linked Jira ticket is `Resolved` or `Closed`, suggest unquarantine.
3. **Code Changes**: If the test file or related source files have been modified since quarantine (detected via git commits or webhook pushes), flag for review.
4. **Flaky Analysis Cross-Reference**: If the test is also in the flaky tests list and its flaky score has dropped below threshold, suggest unquarantine.

---

### 5.5 Test Explorer Page (UI)

The Test Explorer is a new route at `/test-explorer`, added to the sidebar navigation.

#### Page Layout

```
+------------------------------------------------------------------+
| Test Explorer                                    [Refresh] [AI Insights] |
|------------------------------------------------------------------|
| Filter: [Component ▼] [Repo ▼] [Status ▼] [Search...         ] |
| View:   [Tree | Flat] [Show: Docs | Tests | Both]               |
|------------------------------------------------------------------|
|                          |                                       |
|  TREE PANEL (left 40%)   |  DETAIL PANEL (right 60%)             |
|                          |                                       |
|  ▼ Networking            |  nic-hot-plug.md                      |
|    ▼ kubevirt-ui          |  ─────────────────────                |
|      ▼ docs/networking/   |  Jira: CNV-1234  [Open in Jira ↗]    |
|        ● nic-hot-plug.md  |  Test: tests/net/nic-hot-plug.spec.ts |
|        ○ nic-unplug.md    |  Polarion: CNV-9876                   |
|        ◉ bridge.md [Q]    |  Last Run: PASSED (2h ago)            |
|      ▼ tests/networking/  |  Owner: @matan                        |
|        ● nic-hot-plug...  |  Status: Documented, Tested           |
|        ● bridge.spec.ts   |                                       |
|        ◆ sriov.spec.ts    |  --- Rendered Markdown Content ---     |
|    ▼ other-repo           |                                       |
|      ...                  |  [Quarantine] [Triage] [View in Repo] |
|  ▼ Storage                |                                       |
|    ...                   |                                       |
+------------------------------------------------------------------+
| QUARANTINE DASHBOARD (collapsible bottom panel)                  |
|                                                                  |
| Active: 5  |  Overdue: 2  |  Proposed: 3  |  Resolved (30d): 12 |
|                                                                  |
| Test Name         | Component | Since    | SLA     | Jira  | PR  |
| bridge-binding    | Network   | 5d ago   | 9d left | CNV-X | ✓   |
| sriov-migration   | Network   | 18d ago  | OVERDUE | CNV-Y | ✓   |
+------------------------------------------------------------------+
```

#### Tree Node Icons

| Icon | Meaning                          |
| ---- | -------------------------------- |
| `●`  | Matched (has counterpart)        |
| `○`  | Orphaned doc (no test)           |
| `◆`  | Undocumented test (no doc)       |
| `◉`  | Quarantined                      |
| `✗`  | Dead test (never runs in RP)     |

#### Detail Panel

Clicking a node opens the detail panel showing:

- **For doc files**: rendered markdown content, frontmatter fields as metadata cards, linked test file, Jira link, Polarion link, last RP run status, quarantine status.
- **For test files**: file path with repo link, matched doc file, last RP run results (last 10 runs sparkline), quarantine controls, triage actions.
- **For folders**: summary stats (X docs, Y tests, Z gaps, W quarantined).

#### AI Insights Panel (Drawer)

A slide-out drawer triggered by the "AI Insights" button:

- Gap analysis summary with stats (doc coverage %, test coverage %, gaps by type).
- List of all detected gaps with severity, file, and suggested action.
- Quarantine suggestions (tests AI recommends quarantining or unquarantining).
- Doc quality notes (stale docs, docs referencing closed Jira tickets).
- "Apply Suggestion" buttons for actionable items.

---

### 5.6 Settings: Repository Mapping

A new section in the Settings page (`/settings`), positioned after the existing "Component Mappings" section.

#### UI: Repository Mapping Section

```
+------------------------------------------------------------------+
| Repository Mapping                                                |
|------------------------------------------------------------------|
| Map components to source code repositories for test documentation |
| and quarantine management.                                       |
|                                                                  |
| +--------------------------------------------------------------+ |
| | kubevirt-ui / playwright                          [Edit] [×]  | |
| | Provider: GitLab  |  Branch: main                            | |
| | Components: Networking, Storage, Compute                      | |
| | Docs: playwright/docs/**/*.md                                 | |
| | Tests: tests/**/*.spec.ts                                     | |
| | Status: ✓ Synced 2m ago  |  Files: 142 docs, 89 tests        | |
| +--------------------------------------------------------------+ |
|                                                                  |
| +--------------------------------------------------------------+ |
| | cnv-e2e-tests                                     [Edit] [×]  | |
| | Provider: GitHub  |  Branch: main                             | |
| | Components: Compute, Migration                                | |
| | Docs: docs/**/*.md                                            | |
| | Tests: test/**/*.spec.ts                                      | |
| | Status: ⚠ Webhook not configured                              | |
| +--------------------------------------------------------------+ |
|                                                                  |
| [+ Add Repository]                                              |
|                                                                  |
| Global Git Tokens (Admin)                                        |
| These read-only tokens are used to sync repository trees.        |
| ├─ GitLab Token:     [••••••••••••]  [Test] ✓ Valid (bot-user)   |
| └─ GitHub Token:     [••••••••••••]  [Test] ✓ Valid (cnv-bot)    |
|                                                                  |
| Your Personal Tokens                                             |
| Used for creating PRs and Jira tickets when quarantining tests.  |
| Write access required. Actions are attributed to you.            |
| ├─ GitLab PAT:       [••••••••••••]  [Test] ✓ matan@redhat.com  |
| ├─ GitHub PAT:       [••••••••••••]  [Test] ⚠ Not configured    |
| └─ Jira PAT:         [••••••••••••]  [Test] ✓ mschatzman        |
|                                                                  |
| Quarantine Settings                                              |
| ├─ Default SLA (days):        [14    ]                           |
| ├─ Max quarantine (days):     [30    ]                           |
| ├─ Auto-create Jira:          [✓]                                |
| ├─ Auto-update RP defect:     [✓]                                |
| ├─ Auto-create skip PR:       [✓]                                |
| ├─ RP quarantine defect type: [No Defect ▼]                     |
| └─ Alert on overdue:          [Slack ✓] [Email ✓]               |
+------------------------------------------------------------------+
```

#### Add/Edit Repository Modal

Fields: name, provider (GitLab/GitHub), URL, API base URL, project ID, branches (multi-input), global token reference (dropdown of configured global tokens), doc paths (multi-input), test paths (multi-input), components (multi-select from existing components), frontmatter schema builder, cache TTL, skip annotation configs (multi-entry with file glob per framework), webhook secret.

Includes a "Test Connection" button that validates the global token and fetches the repo tree to confirm read access. Personal tokens are managed separately in the user's own settings section.

---

## 6. Data Model

### New Database Tables

#### `repositories`

```sql
CREATE TABLE repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    provider        VARCHAR(10) NOT NULL CHECK (provider IN ('gitlab', 'github')),
    url             VARCHAR(512) NOT NULL,
    api_base_url    VARCHAR(512) NOT NULL,
    project_id      VARCHAR(255) NOT NULL,
    branches        JSONB NOT NULL DEFAULT '["main"]',
    global_token_key VARCHAR(100) NOT NULL,
    doc_paths       JSONB NOT NULL DEFAULT '[]',
    test_paths      JSONB NOT NULL DEFAULT '[]',
    frontmatter_schema JSONB,
    components      JSONB NOT NULL DEFAULT '[]',
    cache_ttl_min   INT NOT NULL DEFAULT 5,
    webhook_secret  VARCHAR(255),
    skip_annotations JSONB DEFAULT '[]',
    enabled         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(provider, project_id)
);
```

#### `repo_files`

```sql
CREATE TABLE repo_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id         UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    branch          VARCHAR(100) NOT NULL DEFAULT 'main',
    file_path       VARCHAR(1024) NOT NULL,
    file_type       VARCHAR(10) NOT NULL CHECK (file_type IN ('doc', 'test', 'other')),
    file_name       VARCHAR(255) NOT NULL,
    content_hash    VARCHAR(64),
    frontmatter     JSONB,
    counterpart_id  UUID REFERENCES repo_files(id),
    rp_test_name    VARCHAR(1024),
    last_synced_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(repo_id, branch, file_path)
);

CREATE INDEX idx_repo_files_repo ON repo_files(repo_id);
CREATE INDEX idx_repo_files_type ON repo_files(file_type);
CREATE INDEX idx_repo_files_counterpart ON repo_files(counterpart_id);
```

#### `quarantines`

```sql
CREATE TABLE quarantines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name       VARCHAR(1024) NOT NULL,
    test_file_path  VARCHAR(1024),
    repo_id         UUID REFERENCES repositories(id),
    component       VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('proposed', 'active', 'overdue', 'expired', 'resolved')),
    reason          TEXT NOT NULL,
    quarantined_by  VARCHAR(255) NOT NULL,
    quarantined_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMP,
    resolved_by     VARCHAR(255),
    sla_days        INT NOT NULL DEFAULT 14,
    sla_deadline    TIMESTAMP NOT NULL,
    jira_key        VARCHAR(50),
    rp_defect_updated BOOLEAN NOT NULL DEFAULT false,
    skip_pr_url     VARCHAR(512),
    skip_pr_status  VARCHAR(20) CHECK (skip_pr_status IN ('pending', 'merged', 'closed')),
    revert_pr_url   VARCHAR(512),
    ai_suggested    BOOLEAN NOT NULL DEFAULT false,
    ai_fix_detected_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quarantines_status ON quarantines(status);
CREATE INDEX idx_quarantines_component ON quarantines(component);
CREATE INDEX idx_quarantines_test ON quarantines(test_name);
CREATE INDEX idx_quarantines_sla ON quarantines(sla_deadline) WHERE status = 'active';
```

#### `user_tokens`

```sql
CREATE TABLE user_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email      VARCHAR(255) NOT NULL,
    provider        VARCHAR(10) NOT NULL CHECK (provider IN ('gitlab', 'github', 'jira')),
    encrypted_token TEXT NOT NULL,
    provider_username VARCHAR(255),
    provider_email  VARCHAR(255),
    validated_at    TIMESTAMP,
    is_valid        BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_email, provider)
);

CREATE INDEX idx_user_tokens_user ON user_tokens(user_email);
CREATE INDEX idx_user_tokens_provider ON user_tokens(provider);
```

**Notes:**
- `encrypted_token` is encrypted at rest using a server-side key (same approach as other secrets in the `settings` table).
- `provider_username` and `provider_email` are populated after token validation (from the provider's "current user" API response).
- `validated_at` tracks when the token was last verified. Tokens are re-validated on every write operation attempt. If validation fails, `is_valid` is set to `false` and the user is notified.
- The `jira` provider stores a Jira PAT (or API token) used for creating quarantine tickets under the user's identity.

#### `quarantine_log`

```sql
CREATE TABLE quarantine_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarantine_id   UUID NOT NULL REFERENCES quarantines(id) ON DELETE CASCADE,
    action          VARCHAR(50) NOT NULL,
    actor           VARCHAR(255),
    details         JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quarantine_log_qid ON quarantine_log(quarantine_id);
```

---

## 7. API Endpoints

### Test Explorer

| Method | Path                                        | Description                                     |
| ------ | ------------------------------------------- | ----------------------------------------------- |
| GET    | `/api/test-explorer/tree`                   | Full tree (filterable by component, repo, type)  |
| GET    | `/api/test-explorer/file/:repoId/:filePath` | File detail (content, frontmatter, RP match)     |
| GET    | `/api/test-explorer/gaps`                   | Gap analysis results                             |
| POST   | `/api/test-explorer/sync/:repoId`           | Force re-sync a specific repo                    |
| POST   | `/api/test-explorer/sync`                   | Force re-sync all repos                          |
| GET    | `/api/test-explorer/stats`                  | Summary stats (docs, tests, gaps, quarantined)   |

### Repositories

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| GET    | `/api/repositories`                    | List all registered repos                  |
| POST   | `/api/repositories`                    | Register a new repo                        |
| PUT    | `/api/repositories/:id`               | Update repo config                         |
| DELETE | `/api/repositories/:id`               | Remove a repo                              |
| POST   | `/api/repositories/:id/test`          | Test repo connection and access            |

### Quarantine

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| GET    | `/api/quarantine`                      | List quarantines (filterable by status, component) |
| GET    | `/api/quarantine/:id`                  | Quarantine detail                          |
| POST   | `/api/quarantine`                      | Create quarantine                          |
| PUT    | `/api/quarantine/:id`                  | Update quarantine (status, reason)         |
| POST   | `/api/quarantine/:id/resolve`          | Resolve/unquarantine                       |
| GET    | `/api/quarantine/stats`                | Quarantine stats (active, overdue, etc.)   |
| GET    | `/api/quarantine/history`              | Quarantine history (resolved in last N days) |
| POST   | `/api/quarantine/:id/approve`          | Approve an AI-proposed quarantine          |
| POST   | `/api/quarantine/:id/reject`           | Reject an AI-proposed quarantine           |

### User Personal Tokens

| Method | Path                                   | Description                                      |
| ------ | -------------------------------------- | ------------------------------------------------ |
| GET    | `/api/user/tokens`                     | List current user's tokens (provider + username + status, no secret) |
| PUT    | `/api/user/tokens/:provider`           | Save/update personal token for a provider (`gitlab`, `github`, or `jira`) |
| DELETE | `/api/user/tokens/:provider`           | Remove personal token for a provider             |
| POST   | `/api/user/tokens/:provider/test`      | Validate token and return provider username/email |

**Notes:**
- GET never returns the token value -- only `provider`, `providerUsername`, `providerEmail`, `validatedAt`, `isValid`, and `isConfigured: boolean`.
- PUT accepts `{ token: string }` and immediately validates against the provider API (GitLab `/api/v4/user`, GitHub `/user`, Jira `/rest/api/2/myself`).
- All endpoints are scoped to the authenticated user (extracted from request context). Users cannot see or modify other users' tokens.
- Provider values: `gitlab`, `github`, `jira`.

### AI (New Prompts)

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| POST   | `/api/ai/gap-analysis`                 | Run AI gap analysis on tree data           |
| POST   | `/api/ai/quarantine-suggest`           | AI quarantine suggestions for a test       |
| POST   | `/api/ai/doc-quality`                  | AI assessment of doc quality and staleness |
| POST   | `/api/ai/match-files`                  | AI fuzzy matching for unmatched doc/test pairs |

### Webhooks

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| POST   | `/api/webhooks/git-push`               | Receive git push events (GitLab/GitHub)    |

---

## 8. AI Prompt Specifications

### 8.1 Gap Analysis Prompt

**File**: `packages/server/src/ai/prompts/gap-analysis.md`

**Input**: List of doc files (with frontmatter), list of test files, list of RP test items, list of quarantined tests.

**Output**: Structured JSON with gap types, severity, suggestions, and confidence scores.

**Key instructions for the AI**:
- Cross-reference doc filenames and paths against test filenames and paths.
- Check if doc frontmatter `test_file` fields point to existing test files.
- Identify tests that appear in RP but not in any repo (phantom tests).
- Identify test files that never appear in RP (dead tests).
- Flag docs whose linked Jira tickets are resolved but the test is still failing or missing.
- Provide confidence scores (0-1) for each gap detection.

### 8.2 Quarantine Suggestion Prompt

**File**: `packages/server/src/ai/prompts/quarantine-suggest.md`

**Input**: Test name, failure history (last 30 runs), flaky score, linked Jira status, component, similar failures, quarantine history.

**Output**: JSON with recommendation (`quarantine | unquarantine | monitor | investigate`), confidence, reason, and suggested SLA.

### 8.3 Doc Quality Prompt

**File**: `packages/server/src/ai/prompts/doc-quality.md`

**Input**: Doc content, frontmatter, test file content (if matched), last modified dates, Jira ticket status.

**Output**: JSON with quality score, staleness indicators, and improvement suggestions.

### 8.4 File Matching Prompt

**File**: `packages/server/src/ai/prompts/file-matching.md`

**Input**: List of unmatched doc files, list of unmatched test files.

**Output**: JSON array of suggested pairings with confidence scores and reasoning.

---

## 9. Webhook Integration

### GitLab Webhook

- Event: `Push Hook`
- URL: `https://<monitor-host>/api/webhooks/git-push`
- Secret Token: stored in `repositories.webhook_secret`
- Validation: `X-Gitlab-Token` header matches stored secret

### GitHub Webhook

- Event: `push`
- URL: `https://<monitor-host>/api/webhooks/git-push`
- Secret: stored in `repositories.webhook_secret`
- Validation: HMAC-SHA256 of payload using `X-Hub-Signature-256` header

### Webhook Handler Logic

1. Parse provider from payload structure (GitLab vs GitHub).
2. Extract repo identifier (project ID or owner/repo).
3. Look up registered repository.
4. Check if any modified files match `docPaths` or `testPaths` globs.
5. If yes: trigger incremental sync for affected files only.
6. Broadcast `tree-updated` via WebSocket.

---

## 10. Security Considerations

| Area                    | Mitigation                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Global git tokens**   | Read-only tokens stored in the `settings` table (encrypted at rest, admin-only). Never exposed to client. Used only server-side for tree sync. |
| **Personal tokens**     | Per-user write tokens (GitLab, GitHub, Jira) stored in `user_tokens` (encrypted at rest). Never exposed to other users. Only the owning user can read/update/delete their own tokens. Used only server-side for PR creation and Jira ticket creation. Token values are never returned to the client after save -- only provider username, email, and validation status are returned. |
| **Webhook secrets**     | Validated on every webhook request. Stored hashed in DB. Reject unverified payloads with 401. |
| **File content**        | Doc markdown is rendered client-side with a sanitizing renderer (no raw HTML). Test file content is displayed as syntax-highlighted code, never executed. |
| **API access**          | All `/api/quarantine` write endpoints require authenticated user. Admin-only for repo management and force sync. |
| **PR creation**         | PRs are created using the requesting user's personal token (never the global read-only token). The PR author is the actual user, providing accountability. Branch names are sanitized. Commit messages are templated (no user-injected content in git commands). If the user has no personal token, the PR step is skipped gracefully. |
| **Rate limiting**       | Git API calls respect provider rate limits. Cache TTL prevents excessive re-fetching. Webhook handler debounces rapid consecutive pushes. |
| **SQL injection**       | All queries use TypeORM parameterized queries. Input validated with Zod schemas. |

---

## 11. Additional Ideas and Future Enhancements

These are ideas beyond the core feature that can be added incrementally. Each item includes a UI specification where applicable, following the existing PatternFly 6 patterns and `app-*` utility class conventions used throughout the project.

---

### Category A: Core Feature Enhancements

#### 11.1 Test Ownership Dashboard

- Extract `owner` from doc frontmatter or CODEOWNERS files.
- Show ownership matrix: which engineer owns which test areas.
- Track "orphaned ownership" (owner left the team, tests have no active owner).
- Integrate with notification subscriptions so owners get alerts for their test failures.

**UI:** New tab "Ownership" within the Test Explorer page, positioned after the tree/detail split view. Layout uses a PatternFly `Card` grid (`Gallery` with `minWidths: 300px`). Each card shows an owner avatar (initials `Label` with `--pf-t--global--color--brand`), their name, component assignments, and test counts (owned / orphaned / quarantined). An `EmptyState` with `UserIcon` when no ownership data exists. Orphaned tests use a `Banner` variant `warning` at the top: "X tests have no assigned owner."

#### 11.2 Coverage Heatmap

- Visual heatmap showing doc coverage density across components/folders.
- Hot spots (red) = areas with many tests but no docs. Cool spots (blue) = well-documented.
- Click a cell to drill into the tree at that folder.

**UI:** Available as a toggle view in the Test Explorer toolbar: `[Tree] [Flat] [Heatmap]`. The heatmap renders as a grid of rectangular cells using CSS Grid, with rows = components and columns = top-level folders. Cell colors use PatternFly design tokens: `--pf-t--global--color--status--danger--default` (no docs), `--pf-t--global--color--status--warning--default` (partial), `--pf-t--global--color--status--success--default` (fully documented). Each cell shows the coverage percentage on hover via PatternFly `Tooltip`. Clicking a cell navigates the tree view to that folder with filters applied.

#### 11.3 Doc-Driven Test Generation

- AI reads a doc file and suggests a test skeleton based on the documented behavior.
- Opens a PR with the generated test file.
- Uses the existing skip annotation config to determine framework and file structure.

**UI:** In the file detail panel for doc files, add an action button with `MagicIcon` labeled "Generate Test". Clicking opens a `Modal` (`ModalVariant.large`) with two panels: left shows the doc content (read-only), right shows the AI-generated test code in a syntax-highlighted `CodeBlock` (PatternFly). Below the code: "Target path" text input (pre-filled from naming convention), framework label, and a diff preview. Footer: "Open PR" (primary, uses personal token), "Copy Code" (secondary), "Close" (link). Loading state shows `Spinner` in `Bullseye`, consistent with `AIActionButton`.

#### 11.4 Quarantine Burndown Chart

- Trends page showing quarantine count over time.
- Goal line showing target "zero quarantined tests".
- Average quarantine duration metric.
- Component breakdown: which components quarantine the most.

**UI:** New section on the existing Trends page (`/trends`) titled "Quarantine Trends", or alternatively a tab within the Test Explorer page. Uses PatternFly Charts (`ChartLine` from `@patternfly/react-charts`). Two charts side by side in a `Flex`:
- **Left chart**: Line chart -- X axis = days (30d), Y axis = quarantine count. Two lines: "Active" (red/danger) and "Resolved" (green/success). A dashed horizontal goal line at zero.
- **Right chart**: Stacked bar chart -- X axis = components, Y axis = quarantine count, stacked by status (active/overdue/resolved). Colors follow the status pattern used in `StatusBadge`.
- Above the charts: `StatCard` row showing: "Active" (count), "Avg Duration" (days), "Overdue" (count with danger color), "Resolved This Month" (count with success color).

#### 11.5 Cross-Repo Dependency Graph

- Some tests depend on shared utilities or fixtures across repos.
- Visualize which test files import from where (via static analysis or AI).
- Flag tests that depend on a quarantined utility.

**UI:** Accessible from the file detail panel via a "Dependencies" tab. Renders a directed graph using a lightweight graph library (e.g., `reactflow` or `elkjs` for layout). Nodes are files, edges are imports. Quarantined nodes have a red border and a `BanIcon` overlay. Clicking a node navigates to that file in the tree. For files with no dependencies, show `EmptyState` with `CubesIcon`: "No cross-repo dependencies detected." The graph container has a mini-map in the bottom-right corner and zoom controls.

#### 11.6 Automated Doc Generation

- When a new test file is pushed (detected via webhook) with no matching doc, AI generates a draft doc file and opens a PR in the repo.
- The draft includes: inferred Jira ticket (from commit message or branch name), test description extracted from `describe`/`it` blocks, component assignment.

**UI:** When webhook detects an undocumented test, a notification appears in the Test Explorer page as a `Banner` variant `info`: "New undocumented test detected: `sriov-migration.spec.ts`. [Generate Doc PR]". The link opens a `Modal` showing the AI-generated markdown with live preview (split view: raw markdown left, rendered right). Frontmatter fields are editable `FormGroup` inputs at the top. Footer: "Open Doc PR" (primary), "Edit" (secondary, switches to full edit mode), "Dismiss" (link).

#### 11.7 Slack Bot Commands

- `/quarantine <test-name> <reason>` -- quarantine from Slack.
- `/unquarantine <test-name>` -- resolve from Slack.
- `/test-status <test-name>` -- quick status check from Slack.

**UI:** No in-app UI needed. The Slack bot responses use Block Kit formatting consistent with the existing Slack notifier (`slack-blocks.ts`). Quarantine confirmation in Slack shows: test name, component, reason, SLA deadline, and a "View in Dashboard" link button that deep-links to the quarantine detail.

#### 11.8 Quarantine Approval Workflow

- Quarantine requests can require approval from a test owner or lead before activation.
- Integrates with the existing acknowledgment system.

**UI:** When approval is required, the quarantine modal shows an additional `FormGroup`: "Approver" with a `SearchableSelect` (reusing the existing pattern) listing team members. After submission, the quarantine appears in a "Pending Approval" tab on the quarantine dashboard. The approver sees a `Banner` variant `info` on the Test Explorer page: "You have X quarantine requests awaiting your approval." Each pending item shows: test name, requester, reason, and "Approve" (primary) / "Reject" (danger) buttons. Approved quarantines transition to `active` and execute the Jira/PR steps.

#### 11.9 Smart Search Across Docs and Tests

- Natural language search: "which tests cover NIC hot plug on OCP 4.16?"
- AI translates to structured filters and searches across docs, tests, RP items, and Jira tickets.
- Reuses the existing `nl-search` AI prompt pattern.

**UI:** The Test Explorer search input (`TextInput` with `SearchIcon`) supports both exact text filtering and natural language. When the user types a question (detected by `?` or natural language heuristics), a `MagicIcon` indicator appears in the input. On Enter, the query is sent to the AI endpoint. Results replace the tree with a flat list of matching items, each showing: file name, repo, match reason (AI-generated), relevance score as a `ProgressStepper` dots, and links to doc/test/Jira. A `Label` at the top: "AI Search -- X results" with a "Clear" button to return to tree view.

#### 11.10 Periodic Full Sync Job

- Beyond the cache TTL and webhooks, run a full sync nightly to catch any drift.
- Compare hashes to detect silent changes (force-pushes, rebases).
- Generate a "sync report" showing what changed since last full sync.

**UI:** Sync reports appear in the settings page under "Repository Mapping" as an expandable `ExpandableSection` per repo: "Last full sync: 2h ago -- 3 files changed." Clicking expands to show a `Table` (`variant="compact"`) with columns: File, Change Type (added/modified/deleted as `Label` with color), Previous Hash, New Hash. A manual "Run Full Sync" button (secondary) triggers the job with a `Spinner` inline.

---

### Category B: Intelligence and Analytics

#### 11.11 Quarantine Impact Score

- Before quarantining, compute and display an impact score: how many versions/tiers the test runs in, frequency, whether it's a gating test, and coverage reduction.

**UI:** Shown in the quarantine modal as a `Card` at the top with a colored left border (green = low impact, yellow = medium, red = high). Inside: a `DescriptionList` (`isHorizontal`, `isCompact`) with: "Runs in" (X tiers, Y versions), "Frequency" (daily/weekly), "Coverage Impact" (-X% for component), "Gating" (yes/no `Label`). If high impact, an `Alert` variant `warning` below: "This is a high-impact test. Quarantining it will reduce Networking coverage from 94% to 87%. Consider investigating before quarantining."

#### 11.12 Test Correlation Engine

- Find tests that statistically co-fail. Warn when quarantining one test in a correlated group.

**UI:** In the file detail panel for test files, a "Correlated Tests" section below the run history. Shows a compact `Table` of co-failing tests sorted by correlation strength: columns are Test Name, Correlation (percentage as `PassRateBar` reuse), Last Co-failure (relative time via `TimeAgo`). Clicking a row navigates to that test. When quarantining, if correlated tests exist, the quarantine modal shows an `Alert` variant `info`: "This test co-fails 90% of the time with `bridge-binding.spec.ts`. Consider quarantining both or investigating the shared root cause."

#### 11.13 Quarantine Budget per Component

- Configurable maximum percentage of tests that can be quarantined per component. Warn at threshold, block at limit.

**UI:** Configured in the quarantine settings section (new `FormGroup`: "Max quarantine %" with `NumberInput`, per-component overrides via a `Table`). On the quarantine dashboard, each component row shows a mini progress bar (`PassRateBar` pattern): "Networking: 3/45 quarantined (7%)" -- green if under budget, yellow if approaching (>80% of limit), red if at/over limit. When at limit, the "Quarantine" button in the modal is disabled with a `Tooltip`: "Quarantine budget exceeded for Networking (10%). Resolve existing quarantines or request admin override."

#### 11.14 Git Blame Integration for Doc Staleness

- Use `git blame` data to compute a "freshness score" based on modification velocity delta between doc and test files.

**UI:** In the file detail panel for doc files, a "Freshness" indicator next to the file name: a `Label` with one of three states -- "Fresh" (green, `CheckCircleIcon`), "Aging" (yellow, `ExclamationTriangleIcon`), "Stale" (red, `ExclamationCircleIcon`). Below the metadata section, a `DescriptionList` row: "Doc last modified: 6 months ago | Test last modified: 2 days ago | 15 test commits since last doc update." The freshness score also appears as a column in the tree flat view, sortable.

#### 11.15 PR/MR Status Tracking for Quarantines

- Track the full PR lifecycle: created -> review -> approved -> merged -> deployed. Only mark quarantine as "active in CI" once the PR is merged.

**UI:** On the quarantine detail view and dashboard table, the "PR" column shows a multi-step `ProgressStepper` (PatternFly) with steps: Created, Reviewed, Merged. Current step is highlighted with brand color. Clicking the stepper opens the PR in a new tab. The quarantine status shows a sub-status: "Active (PR pending merge)" vs "Active (skip effective)". When the PR is merged, a WebSocket event updates the UI in real time.

#### 11.16 Test Health Score

- Composite score per test: pass rate + flaky score + quarantine history + doc quality + code freshness.

**UI:** Shown in the tree view as a colored dot next to each test node (reusing the `--pf-t--global--color--status--*` tokens). In the flat view, a sortable "Health" column with a numeric score (0-100) rendered as a small `PassRateBar`. In the file detail panel, a "Health Score" `Card` with a donut chart (`ChartDonut` from PatternFly Charts) showing the breakdown: pass rate (40%), stability (20%), documentation (15%), freshness (15%), quarantine history (10%). Each segment is clickable to show details.

#### 11.17 Quarantine Velocity Metrics

- Track mean-time-to-quarantine, mean-time-to-fix, recurrence rate, quarantine-to-fix ratio.

**UI:** New "Metrics" tab on the quarantine dashboard (alongside Active/Overdue/History). Layout: four `StatCard` components in a `Gallery` row at the top. Below: a `Table` breakdown by component with columns: Component, MTTQ, MTTF, Recurrence Rate, Fix Ratio. Sortable columns. Each metric cell uses color coding: green if within healthy range, yellow if borderline, red if concerning. A `HelpLabel` (reusing existing pattern) on each column header explains the metric.

#### 11.18 Component Risk Radar

- Spider/radar chart per component showing multiple health dimensions.

**UI:** Accessible from the Component Health page as a toggle: `[Cards] [Radar]`. The radar view shows a PatternFly Chart (`ChartArea` in polar mode, or a custom SVG radar). Each axis represents a dimension: Doc Coverage, Pass Rate, Quarantine Count (inverted), Flaky Score (inverted), Avg Fix Time (inverted), Code Churn. Multiple components can be overlaid for comparison (up to 3, selected via `Select` multi-dropdown). The chart sits inside a `Card` with a legend below mapping colors to components.

#### 11.19 Failure Pattern Library

- Searchable knowledge base of known failure patterns with root causes and recommended fixes.

**UI:** New page at `/patterns` (or a tab within Test Explorer). Header with `SearchIcon` `TextInput` for filtering. Content: PatternFly `DataList` (not Table, since items are variable-height). Each item is an `DataListItem` showing: error signature (monospace, truncated), root cause category (`Label` with color), affected components (`LabelGroup`), hit count, last seen (`TimeAgo`), and a recommended fix (collapsed, expandable). Clicking "View" opens a `Drawer` from the right with the full pattern detail, related test items, and an "Apply Fix" `AIActionButton`.

#### 11.20 Test Lifecycle Timeline

- Full visual biography of a test: creation, first doc, first run, failures, quarantines, fixes.

**UI:** In the file detail panel for test files, a "Lifecycle" tab. Uses a vertical `Timeline` pattern (CSS, since PatternFly doesn't have a native timeline): a vertical line with event dots. Each event shows: icon (color-coded by type), date, description, and optional link. Event types: `CodeBranchIcon` (created), `FileIcon` (doc added), `PlayIcon` (first RP run), `ExclamationCircleIcon` (first failure), `BanIcon` (quarantined), `CheckCircleIcon` (resolved), `WrenchIcon` (code modified). The timeline scrolls vertically and supports date range filtering.

#### 11.21 Unused Doc Detection

- Detect docs with matching tests but no updates while the test has been modified repeatedly.

**UI:** In the AI Insights drawer, a dedicated section "Zombie Docs" with a `Table` (`variant="compact"`): Doc File, Test File, Doc Last Updated, Test Commits Since, Freshness Score. Each row has actions: "Archive" (opens a PR to move the doc to an `archive/` folder), "Refresh" (opens the inline doc editor pre-filled with AI-suggested updates). A `Banner` variant `info` at the top of the section: "X docs may be outdated and no longer maintained."

---

### Category C: CI/CD and Pipeline Integration

#### 11.22 Quarantine-Aware Test Filtering in CI

- Expose `GET /api/quarantine/skip-list` for CI pipelines to fetch quarantined tests in a consumable format.

**UI:** In quarantine settings, a `ClipboardCopy` (PatternFly) block showing the curl command / CI integration snippet:
```
curl -H "Authorization: Bearer $TOKEN" \
  https://monitor.example.com/api/quarantine/skip-list?component=networking&format=grep
```
A `Select` dropdown to preview the format (`grep`, `json`, `playwright-config`, `junit-exclude`). Below: a live preview of the current skip list in a `CodeBlock`. This makes it easy for engineers to integrate without reading API docs.

#### 11.23 PR Impact Preview

- When a skip-annotation PR is opened, add a comment showing coverage impact.

**UI:** No in-app UI needed. The PR comment is rendered on GitLab/GitHub using markdown. It includes: a summary table (test name, component, tiers, last status), a coverage impact bar (before/after as a text-based progress bar), links to the quarantine dashboard and Jira ticket, and a footer with the CNV Monitor logo/name.

#### 11.24 Auto-Quarantine on Consecutive Failures

- Configurable rule: N consecutive failures with the same error -> auto-propose quarantine.

**UI:** Configured in quarantine settings: `FormGroup` "Auto-propose after N consecutive failures" with `NumberInput` (default: 5). When triggered, the proposed quarantine appears in the quarantine dashboard's "Proposed" tab with an `AIIndicator` label "Auto-detected". The test also gets a pulsing `MagicIcon` badge in the tree view. A `Banner` variant `info` on the Test Explorer page: "AI detected X tests with consecutive failures. [Review proposals]" linking to the Proposed tab.

#### 11.25 Webhook-Triggered Re-evaluation

- When a quarantined test's file is modified (push webhook), automatically check if the fix is in and suggest unquarantine.

**UI:** When re-evaluation detects a potential fix, a `NotificationBadge` appears on the quarantine dashboard's "Active" tab. The quarantine row gets a `Label` variant `info` with `MagicIcon`: "Fix detected." The quarantine detail view shows: "Code change detected in commit `abc123` by @engineer. Recent RP runs: 3/3 passing. [Unquarantine]" with the resolve button highlighted with a subtle pulse animation (`app-pulse` CSS class using `@keyframes`).

---

### Category D: Cross-System Orchestration

#### 11.26 Polarion Sync

- Sync quarantine status to Polarion test cases (Blocked when quarantined, revert on resolve).

**UI:** In quarantine settings, a toggle: "Sync quarantine status to Polarion" with a `Switch` (PatternFly). When enabled, the quarantine modal shows the matched Polarion ID (extracted from doc frontmatter) and a preview: "Polarion CNV-9876 will be set to Blocked." On the quarantine detail view, a `DescriptionList` row: "Polarion Status: Blocked (synced 2m ago)" with a status `Label`.

#### 11.27 Errata/Advisory Integration

- Link quarantined tests to Red Hat errata/advisories on the Readiness page.

**UI:** On the Readiness page (`/readiness/:version`), a new section "Quarantine Blockers" rendered as an `Alert` variant `danger` if any quarantined tests block advisories: "Advisory RHSA-2026-XXXX is blocked by 2 quarantined tests in Networking." Below: a `Table` listing affected tests with columns: Test, Component, Quarantined Since, Advisory, Blocker Status. Each row links to the quarantine detail.

#### 11.28 GitLab/GitHub Issue Backlink

- Automatically add cross-reference comments on Jira tickets and PRs linking everything together.

**UI:** No dedicated in-app UI. On the quarantine detail view, a "Cross-references" `DescriptionList` section showing all created links: Jira ticket (link), Skip PR (link), Jira comment (timestamp), PR comment (timestamp). Each shows a `CheckCircleIcon` (green) if the comment was posted successfully, or `ExclamationCircleIcon` (red) if it failed with a "Retry" link button.

#### 11.29 Test Results Feedback Loop

- After skip PR is merged, monitor next N runs to confirm the test is actually being skipped in RP.

**UI:** On the quarantine detail view, a "Skip Verification" section that appears after the PR is merged. Shows a progress indicator: "Verifying skip effectiveness -- monitoring next 3 runs." Below: a mini `Table` of recent runs with columns: Run ID, Date, Test Present, Status. If the test is still appearing and failing, an `Alert` variant `danger`: "Skip annotation may not be effective -- test ran in 2 recent runs after PR merge. [Investigate]".

---

### Category E: Data Integrity and Operations

#### 11.30 Repo File Versioning

- Store the git commit SHA per synced file. Show sync status and allow "re-sync to latest."

**UI:** In the file detail panel, below the file path, a muted text line: "Synced from commit `abc123` (3 days ago)." If behind, a `Label` variant `warning`: "2 commits behind latest." A small "Sync to latest" `Button` (variant `plain`, `SyncAltIcon`) next to it. In the tree view (flat mode), a "Sync Status" column showing `CheckCircleIcon` (up to date) or `SyncAltIcon` with count behind.

#### 11.31 Quarantine Export and Reporting

- Export quarantine data as CSV, Jira bulk format, or formatted email digest.

**UI:** On the quarantine dashboard, an `ExportButton` (reusing the existing `ExportButton` component pattern) in the toolbar. Clicking opens a `Menu` (PatternFly dropdown) with options: "Export CSV", "Export Jira Bulk", "Email Weekly Digest". CSV and Jira download immediately. Email opens a `Modal` with recipient field and preview of the digest. The weekly digest can also be configured in notification subscriptions settings.

#### 11.32 Dry-Run Mode for Quarantine

- Preview quarantine actions without executing them.

**UI:** In the quarantine modal, a `Switch` toggle in the footer area: "Dry Run". When enabled, the primary button changes from "Quarantine" to "Preview" (secondary variant). Clicking "Preview" replaces the modal body with a read-only preview `Card` stack: Jira ticket preview (summary, description, labels), skip annotation diff (`CodeBlock` with green/red diff highlighting), RP defect update preview, impact score. A `Banner` at the top: "Dry run -- no actions will be taken." Footer changes to "Execute" (primary, applies everything) and "Cancel" (link).

#### 11.33 Multi-Tenant Token Vault

- Support HashiCorp Vault or Kubernetes Secrets as an alternative to DB-stored tokens.

**UI:** In the global tokens settings section, a `Select` dropdown: "Token Source" with options "Database" (default) and "Vault". When "Vault" is selected, additional `FormGroup` inputs appear: Vault URL, Vault Path, Auth Method. A "Test Vault Connection" button. Personal tokens section shows a note when vault is active: "Personal tokens are stored in the configured vault." No visual change to the token input flow -- the backend handles the storage abstraction.

---

### Category F: Collaboration and Social

#### 11.34 Quarantine Comments Thread

- Discussion thread on each quarantine for collaboration and context sharing.

**UI:** On the quarantine detail view (which opens as a `Drawer` from the quarantine dashboard), a "Comments" section at the bottom. Uses the same pattern as Jira comments: a vertical list of comment cards, each showing avatar (initials `Label`), author, timestamp (`TimeAgo`), and content. A `TextArea` with "Add Comment" `Button` at the bottom. Comments that were synced to Jira show a small `ExternalLinkAltIcon` badge. Markdown rendering for comment content with `react-markdown`.

#### 11.35 Weekly Quarantine Standup Report

- Auto-generated weekly summary of quarantine activity, sent via Slack/email.

**UI:** Configurable in notification subscriptions: a new subscription type "Quarantine Weekly Digest" with schedule (default: Monday 9 AM). Preview in settings via an `AIActionButton` labeled "Preview Weekly Digest" that generates and shows the report in a `Modal`. The report itself (Slack/email) follows existing `slack-blocks.ts` and `email-template.ts` patterns with sections: New Quarantines, Resolved, Overdue, AI Suggestions, Metrics Summary.

#### 11.36 Gamification / Accountability

- Per-engineer stats and optional leaderboard for quarantine fix velocity.

**UI:** On the "My Work" page (`/my-work`), a new `Card` section "Your Test Health Stats" with a `DescriptionList`: Tests Quarantined (count), Tests Fixed (count), Avg Fix Time (days), Docs Contributed (count). Below: a sparkline chart showing fix velocity over time. The leaderboard is opt-in (toggle in user preferences). When enabled, a `Table` on the Test Explorer page's "Metrics" tab: Rank, Engineer, Quarantines Fixed, Avg Fix Time, Health Contributions. Top 3 get a subtle `TrophyIcon` `Label`. The table uses `variant="compact"` and is sorted by fix count descending.

#### 11.37 "Watch" a Test

- Subscribe to individual tests for direct notifications on failures, quarantines, or doc updates.

**UI:** In the file detail panel (both docs and tests), a `ToggleGroup` button in the top-right: `EyeIcon` "Watch". Clicking toggles the watch state (filled eye = watching). When watching, the button shows "Watching" with a `CheckIcon`. The user's watched tests are listed on their "My Work" page in a "Watched Tests" `Card` with a compact `Table`: Test Name, Component, Status, Last Event. Notification delivery follows the user's existing notification preferences (Slack/email). A badge on the tree node when the user is watching it: small `EyeIcon` in muted color.

---

### Category G: Advanced UX

#### 11.38 Inline Doc Editor

- Edit markdown docs directly in the browser, commit changes, and open a PR.

**UI:** In the file detail panel for doc files, an "Edit" `Button` (secondary, `PencilAltIcon`) in the toolbar. Clicking switches the rendered markdown view to a split-pane editor: left = raw markdown in a `TextArea` with monospace font (`app-text-mono`), right = live rendered preview. The frontmatter fields appear as editable `FormGroup` inputs above the editor (Jira ID, test file path, owner, tags). Toolbar above the editor: "Save & Open PR" (primary), "Reset" (secondary), "Cancel" (link). The save action commits to a new branch and opens a PR with title "[docs] Update {filename}".

#### 11.39 Test Explorer Deep Links

- Every tree node gets a shareable URL that preserves the full navigation state.

**UI:** No dedicated component. URL updates via React Router `useSearchParams` as the user navigates: `/test-explorer?repo=kubevirt-ui&branch=main&path=docs/networking/nic-hot-plug.md&view=tree`. A "Copy Link" `Button` (variant `plain`, `LinkIcon`) in the file detail panel toolbar copies the deep link to clipboard with a `Tooltip` confirmation: "Link copied." When the page loads with query params, the tree auto-expands to the specified node and selects it.

#### 11.40 Keyboard Navigation and Command Palette

- Arrow keys for tree navigation, shortcuts for common actions, Cmd+K command palette.

**UI:** The tree view is keyboard-accessible via PatternFly TreeView's built-in ARIA. Additional shortcuts overlay accessible via `?` key: a `Modal` listing shortcuts in a two-column `DescriptionList`: "Navigate tree" = Arrow keys, "Expand/Collapse" = Enter, "Search" = `/`, "Quarantine" = `Q`, "Triage" = `T`, "Open in Repo" = `O`, "Copy Link" = `L`, "Command Palette" = `Cmd+K`. The command palette is a `Modal` with a `TextInput` at the top (auto-focused), showing filtered results below as a `Menu` with keyboard selection. Results include: files, tests, quarantines, actions ("Quarantine selected", "Sync repos", "Open settings").

#### 11.41 Bulk Operations

- Select multiple tests/docs and perform bulk actions.

**UI:** A "Select" toggle `Button` (variant `control`) in the Test Explorer toolbar. When active, each tree node and flat-view row gets a `Checkbox`. A floating action bar appears at the bottom of the page (PatternFly `Toolbar` with sticky positioning): "X selected" count, "Bulk Quarantine" (primary), "Bulk Tag" (secondary), "Bulk Assign Owner" (secondary), "Clear Selection" (link). Clicking "Bulk Quarantine" opens a single `QuarantineModal` that lists all selected tests and applies the same reason/SLA to all, creating individual quarantine records and a single Jira epic with sub-tasks.

#### 11.42 Quarantine Handoff on Resolve

- Require a structured handoff note when unquarantining: what was fixed, which commit, verification link.

**UI:** The resolve quarantine modal (triggered by "Unquarantine" button) adds required fields: "Fix Description" (`TextArea`), "Fix Commit/PR" (`TextInput` with URL validation and `ExternalLinkAltIcon`), "Verification Run" (`TextInput` -- RP launch URL). An optional "Lessons Learned" `TextArea`. All fields are required before the "Resolve" button enables. The handoff note is stored in `quarantine_log` and displayed on the quarantine detail view's timeline and in the activity feed.

#### 11.43 Quarantine Post-Mortem Template

- Auto-generate structured post-mortem on quarantine resolution.

**UI:** After resolving a quarantine with handoff notes (11.42), an `AIActionButton` "Generate Post-Mortem" appears on the quarantine detail view. Clicking runs AI analysis and opens a `Modal` (`ModalVariant.large`) with the generated report: Root Cause Category (selectable `Label` group), Timeline (visual, reusing the timeline pattern from 11.20), Metrics (time-to-detect, time-to-quarantine, time-to-fix as `DescriptionList`), Lessons Learned, and Recommendations. Footer: "Save" (stores in DB), "Export PDF" (secondary), "Share via Slack" (secondary, posts to configured channel). Aggregate post-mortems are viewable from the quarantine metrics tab as a searchable `DataList`.

#### 11.44 Release Gate Integration

- Tie quarantine status to readiness scoring. Block release sign-off if quarantine count exceeds threshold.

**UI:** On the Readiness page (`/readiness/:version`), the existing readiness checklist gains a new automated check: "Quarantine Threshold" showing "X tests quarantined (threshold: Y)". Status: `CheckCircleIcon` green if under, `ExclamationCircleIcon` red if over. Clicking the row expands to show the quarantined tests for that version with links to each quarantine. The AI risk assessment prompt receives quarantine data as input, factoring it into the Ship/Hold/Needs Attention recommendation. If the threshold is exceeded, the "Sign Off" button is disabled with a `Tooltip` explaining the blocker.

#### 11.45 Sync Health Dashboard

- Monitor repo sync health: timing, errors, rate limits, cache hit rates.

**UI:** In the settings page under "Repository Mapping", a collapsible `ExpandableSection` "Sync Health" (default collapsed). Inside: a `Table` with one row per repo and columns: Repo Name, Last Sync (`TimeAgo`), Duration (ms), Status (`StatusBadge` -- success/error), API Rate Limit Remaining (progress bar), Cache Hits (%), Files Synced. A `Banner` variant `danger` at the top if any repo hasn't synced in > 1 hour: "Repository {name} has not synced successfully in 3 hours." An auto-refresh interval (30s) using `useQuery` with `refetchInterval`.

#### 11.46 Tree Diff View (Branch Comparison)

- Compare file trees between two branches to see what tests/docs are branch-specific.

**UI:** In the Test Explorer toolbar, a "Compare Branches" `Button` (secondary, `CodeBranchIcon`). Clicking opens a `Toolbar` row below with two `Select` dropdowns: "Base branch" and "Compare branch" and a "Compare" button. The tree view transforms into a diff view: files present in both branches show as normal, files only in base show with a red `MinusCircleIcon`, files only in compare show with a green `PlusCircleIcon`. A summary `Banner` at the top: "12 files only in main, 3 files only in release-4.16, 45 files in both." The flat view gains a "Diff Status" column: Both, Base Only, Compare Only (as colored `Label` components).

#### 11.47 Predictive Quarantine

- AI predicts which tests are likely to need quarantining in the next release based on historical patterns.

**UI:** In the AI Insights drawer, a "Predictions" section. Shows a `Table` of predicted-at-risk tests: Test Name, Component, Risk Score (0-100 as a colored `PassRateBar`), Risk Factors (truncated, expandable), Suggested Action. Each row has a "Pre-quarantine" action button that opens the quarantine modal pre-filled with AI-generated reason. A `Banner` at the top: "Based on historical patterns, these X tests have a >70% probability of failure in CNV 4.18." The predictions are refreshed when new trend data is available.

#### 11.48 Cross-Version Test Matrix

- Matrix showing test pass/fail across all tracked branches and CNV versions.

**UI:** Accessible as a new view in the Test Explorer: toolbar toggle `[Tree] [Flat] [Heatmap] [Matrix]`. The matrix renders as a `Table` where rows = test names (grouped by component, collapsible) and columns = branches/versions. Each cell shows a `StatusBadge` (PASSED/FAILED/SKIPPED/QUARANTINED/NOT_RUN). Column headers are rotated 45 degrees for space efficiency. A `Select` filter for component and a `TextInput` for test name search. Cells are clickable, navigating to the specific test run in the Launch Detail page. A summary row at the bottom shows pass rate per branch.

#### 11.49 Metric Export (Prometheus/OpenMetrics)

- Expose quarantine and sync metrics at `/metrics` for Prometheus scraping.

**UI:** In settings, an "Integrations" section gains a "Prometheus Metrics" toggle with `Switch`. When enabled, shows the metrics endpoint URL in a `ClipboardCopy` block. Below: a live preview of current metric values in a `CodeBlock` (monospace, read-only). Metrics include: `quarantine_active_total`, `quarantine_overdue_total`, `quarantine_resolved_total`, `quarantine_avg_duration_seconds`, `repo_sync_duration_seconds`, `repo_sync_errors_total`, `tree_files_total{type="doc|test"}`, `tree_gaps_total{type="orphaned|undocumented|dead|phantom"}`.

#### 11.50 AI Test Rewrite Suggestions

- For repeatedly quarantined tests, AI suggests targeted code changes to improve resilience.

**UI:** In the file detail panel for test files with quarantine count > 2, a `Banner` variant `info` with `MagicIcon`: "This test has been quarantined X times. AI can suggest improvements." A "Suggest Improvements" `AIActionButton`. The result modal shows: a list of suggestions, each with: description, confidence, and a code diff (`CodeBlock` with green/red line highlighting). Suggestions are categorized: "Add explicit wait", "Use stable selector", "Improve error handling", "Add retry logic." Each suggestion has an "Apply & Open PR" button that commits the change via the user's personal token.

---

## 12. Implementation Roadmap

Since the feature ships as a single release, the implementation order follows dependency chains:

### Step 1: Data Foundation (Server)

1. Create TypeORM entities: `Repository`, `RepoFile`, `Quarantine`, `QuarantineLog`, `UserToken`.
2. Create migration (migration #24).
3. Create store modules: `repositories.ts`, `repoFiles.ts`, `quarantines.ts`, `userTokens.ts`.
4. Add Zod schemas in `packages/shared`: `repository.ts`, `repoFile.ts`, `quarantine.ts`, `userToken.ts`.

### Step 2: Git Provider Clients (Server)

1. Create `packages/server/src/clients/git-provider.ts` -- abstract interface.
2. Implement `gitlab.ts` (GitLab API v4: tree, file content, create branch, create MR).
3. Implement `github-repo.ts` (GitHub API: tree, file content, create branch, create PR).
4. Create `RepoSyncService` with: `syncRepo()`, `fetchTree()`, `parseDocFrontmatter()`, `matchFiles()`.
5. Add markdown parsing with frontmatter extraction (use `gray-matter` package).

### Step 3: API Routes (Server)

1. `routes/repositories.ts` -- CRUD for repos.
2. `routes/test-explorer.ts` -- tree, file detail, gaps, stats, sync.
3. `routes/quarantine.ts` -- full quarantine lifecycle.
4. `routes/webhooks.ts` -- git push handler.
5. `routes/user-tokens.ts` -- personal token CRUD and validation (GitLab, GitHub, Jira).
6. All routes use Zod validation middleware.

### Step 4: Quarantine Engine (Server)

1. `QuarantineService` -- create, resolve, check SLA, log actions.
2. Jira integration: create quarantine tickets using the user's personal Jira token (extend existing Jira client to accept per-request token override).
3. RP integration: update defect type (extend existing RP client).
4. PR integration: create skip annotation branches/PRs via git provider clients, using the user's personal GitLab/GitHub token from `user_tokens`.
5. Cron job: SLA checker (add to `serve-cron.ts`).

### Step 5: AI Prompts (Server)

1. Create prompt files: `gap-analysis.md`, `quarantine-suggest.md`, `doc-quality.md`, `file-matching.md`.
2. Add AI route handlers in `routes/ai.ts` (extend existing).
3. Integrate AI quarantine monitoring into the SLA cron job.

### Step 6: Client API Layer

1. `packages/client/src/api/repositories.ts`
2. `packages/client/src/api/testExplorer.ts`
3. `packages/client/src/api/quarantine.ts`
4. `packages/client/src/api/userTokens.ts`
5. Extend `packages/client/src/api/ai.ts` with new endpoints.

### Step 7: UI Components (Client)

1. `components/test-explorer/FileTree.tsx` -- recursive tree with PatternFly TreeView.
2. `components/test-explorer/FileDetail.tsx` -- detail panel with tabs.
3. `components/test-explorer/GapBadge.tsx` -- gap type indicators.
4. `components/test-explorer/QuarantineDashboard.tsx` -- bottom panel table.
5. `components/test-explorer/QuarantineModal.tsx` -- create/resolve modals.
6. `components/test-explorer/AIInsightsDrawer.tsx` -- AI analysis drawer.
7. `components/settings/RepositoryMappingSection.tsx` -- settings section.
8. `components/settings/RepositoryModal.tsx` -- add/edit repo modal.
9. `components/settings/GitTokensSection.tsx` -- global tokens (admin) + personal tokens (GitLab, GitHub, Jira per user).

### Step 8: Pages and Navigation (Client)

1. Create `pages/TestExplorerPage.tsx`.
2. Add route in `App.tsx`: `/test-explorer`.
3. Add sidebar nav item in `AppLayout.tsx`.
4. Add quarantine settings and git token sections to `SettingsPage.tsx`.
5. Wire up WebSocket for `tree-updated` events.

### Step 9: Webhook and Cron Integration (Server)

1. Register webhook route in Express app.
2. Add quarantine SLA cron to `serve-cron.ts`.
3. Add quarantine stats to notification dispatch (Slack/email).

### Step 10: Testing

1. Unit tests for: file matching logic, frontmatter parsing, quarantine state machine, SLA computation.
2. Route tests for: repository CRUD, quarantine lifecycle, webhook validation.
3. Integration test for: tree sync end-to-end with mock git provider.

---

## 13. Decisions (Formerly Open Questions)

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

