# Settings: Repository Mapping

A new section in the Settings page (`/settings`), positioned after the existing "Component Mappings" section.

## UI: Repository Mapping Section

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

## Add/Edit Repository Modal

Fields: name, provider (GitLab/GitHub), URL, API base URL, project ID, branches (multi-input), global token reference (dropdown of configured global tokens), doc paths (multi-input), test paths (multi-input), components (multi-select from existing components), frontmatter schema builder, cache TTL, skip annotation configs (multi-entry with file glob per framework), webhook secret.

Includes a "Test Connection" button that validates the global token and fetches the repo tree to confirm read access. Personal tokens are managed separately in the user's own settings section.
