# Repository Registry

A repository is a GitLab or GitHub repo registered in the system. Each repository belongs to one or more components and has configurable paths and parsing rules.

## Repository Configuration Fields

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

## Frontmatter Schema (Configurable Per Repo)

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

## Token Model (Global vs. Personal)

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
