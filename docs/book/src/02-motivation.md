# Motivation

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
