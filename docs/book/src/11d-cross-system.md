# Category D: Cross-System Orchestration

## 11.26 Polarion Sync

- Sync quarantine status to Polarion test cases (Blocked when quarantined, revert on resolve).

**UI:** In quarantine settings, a toggle: "Sync quarantine status to Polarion" with a `Switch` (PatternFly). When enabled, the quarantine modal shows the matched Polarion ID (extracted from doc frontmatter) and a preview: "Polarion CNV-9876 will be set to Blocked." On the quarantine detail view, a `DescriptionList` row: "Polarion Status: Blocked (synced 2m ago)" with a status `Label`.

## 11.27 Errata/Advisory Integration

- Link quarantined tests to Red Hat errata/advisories on the Readiness page.

**UI:** On the Readiness page (`/readiness/:version`), a new section "Quarantine Blockers" rendered as an `Alert` variant `danger` if any quarantined tests block advisories: "Advisory RHSA-2026-XXXX is blocked by 2 quarantined tests in Networking." Below: a `Table` listing affected tests with columns: Test, Component, Quarantined Since, Advisory, Blocker Status. Each row links to the quarantine detail.

## 11.28 GitLab/GitHub Issue Backlink

- Automatically add cross-reference comments on Jira tickets and PRs linking everything together.

**UI:** No dedicated in-app UI. On the quarantine detail view, a "Cross-references" `DescriptionList` section showing all created links: Jira ticket (link), Skip PR (link), Jira comment (timestamp), PR comment (timestamp). Each shows a `CheckCircleIcon` (green) if the comment was posted successfully, or `ExclamationCircleIcon` (red) if it failed with a "Retry" link button.

## 11.29 Test Results Feedback Loop

- After skip PR is merged, monitor next N runs to confirm the test is actually being skipped in RP.

**UI:** On the quarantine detail view, a "Skip Verification" section that appears after the PR is merged. Shows a progress indicator: "Verifying skip effectiveness -- monitoring next 3 runs." Below: a mini `Table` of recent runs with columns: Run ID, Date, Test Present, Status. If the test is still appearing and failing, an `Alert` variant `danger`: "Skip annotation may not be effective -- test ran in 2 recent runs after PR merge. [Investigate]".
