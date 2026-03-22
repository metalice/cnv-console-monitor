# Architecture Overview

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
