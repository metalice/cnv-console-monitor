# Category C: CI/CD and Pipeline Integration

## 11.22 Quarantine-Aware Test Filtering in CI

- Expose `GET /api/quarantine/skip-list` for CI pipelines to fetch quarantined tests in a consumable format.

**UI:** In quarantine settings, a `ClipboardCopy` (PatternFly) block showing the curl command / CI integration snippet:
```
curl -H "Authorization: Bearer $TOKEN" \
  https://monitor.example.com/api/quarantine/skip-list?component=networking&format=grep
```
A `Select` dropdown to preview the format (`grep`, `json`, `playwright-config`, `junit-exclude`). Below: a live preview of the current skip list in a `CodeBlock`. This makes it easy for engineers to integrate without reading API docs.

## 11.23 PR Impact Preview

- When a skip-annotation PR is opened, add a comment showing coverage impact.

**UI:** No in-app UI needed. The PR comment is rendered on GitLab/GitHub using markdown. It includes: a summary table (test name, component, tiers, last status), a coverage impact bar (before/after as a text-based progress bar), links to the quarantine dashboard and Jira ticket, and a footer with the CNV Monitor logo/name.

## 11.24 Auto-Quarantine on Consecutive Failures

- Configurable rule: N consecutive failures with the same error -> auto-propose quarantine.

**UI:** Configured in quarantine settings: `FormGroup` "Auto-propose after N consecutive failures" with `NumberInput` (default: 5). When triggered, the proposed quarantine appears in the quarantine dashboard's "Proposed" tab with an `AIIndicator` label "Auto-detected". The test also gets a pulsing `MagicIcon` badge in the tree view. A `Banner` variant `info` on the Test Explorer page: "AI detected X tests with consecutive failures. [Review proposals]" linking to the Proposed tab.

## 11.25 Webhook-Triggered Re-evaluation

- When a quarantined test's file is modified (push webhook), automatically check if the fix is in and suggest unquarantine.

