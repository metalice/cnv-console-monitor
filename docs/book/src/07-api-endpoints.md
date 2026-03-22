# API Endpoints

## Test Explorer

| Method | Path                                        | Description                                     |
| ------ | ------------------------------------------- | ----------------------------------------------- |
| GET    | `/api/test-explorer/tree`                   | Full tree (filterable by component, repo, type)  |
| GET    | `/api/test-explorer/file/:repoId/:filePath` | File detail (content, frontmatter, RP match)     |
| GET    | `/api/test-explorer/gaps`                   | Gap analysis results                             |
| POST   | `/api/test-explorer/sync/:repoId`           | Force re-sync a specific repo                    |
| POST   | `/api/test-explorer/sync`                   | Force re-sync all repos                          |
| GET    | `/api/test-explorer/stats`                  | Summary stats (docs, tests, gaps, quarantined)   |

## Repositories

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| GET    | `/api/repositories`                    | List all registered repos                  |
| POST   | `/api/repositories`                    | Register a new repo                        |
| PUT    | `/api/repositories/:id`               | Update repo config                         |
| DELETE | `/api/repositories/:id`               | Remove a repo                              |
| POST   | `/api/repositories/:id/test`          | Test repo connection and access            |

## Quarantine

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

## User Personal Tokens

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

## AI (New Prompts)

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| POST   | `/api/ai/gap-analysis`                 | Run AI gap analysis on tree data           |
| POST   | `/api/ai/quarantine-suggest`           | AI quarantine suggestions for a test       |
| POST   | `/api/ai/doc-quality`                  | AI assessment of doc quality and staleness |
| POST   | `/api/ai/match-files`                  | AI fuzzy matching for unmatched doc/test pairs |

## Webhooks

| Method | Path                                   | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| POST   | `/api/webhooks/git-push`               | Receive git push events (GitLab/GitHub)    |
