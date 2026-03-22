# Quarantine System

The quarantine system is a first-class feature with its own lifecycle, tracking, and integrations.

## Quarantine States

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

## Quarantine Record Fields

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

## Quarantine Actions

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

## Quarantine Duration Tracking

- Every quarantine record stores `quarantinedAt` and computes duration in real time.
- The quarantine dashboard shows: current duration, SLA deadline, days remaining/overdue.
- A daily cron job checks all active quarantines:
  - If `now > slaDeadline`: transition to `OVERDUE`, send Slack/email alert.
  - If `now > quarantinedAt + maxDuration`: transition to `EXPIRED`.

## AI Unquarantine Suggestions

The AI monitors quarantined tests by checking:

1. **Recent RP Results**: If the test has passed in N consecutive recent runs (configurable, default 3), suggest unquarantine.
2. **Jira Status**: If the linked Jira ticket is `Resolved` or `Closed`, suggest unquarantine.
3. **Code Changes**: If the test file or related source files have been modified since quarantine (detected via git commits or webhook pushes), flag for review.
4. **Flaky Analysis Cross-Reference**: If the test is also in the flaky tests list and its flaky score has dropped below threshold, suggest unquarantine.
