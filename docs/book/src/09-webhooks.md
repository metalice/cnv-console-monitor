# Webhook Integration

## GitLab Webhook

- Event: `Push Hook`
- URL: `https://<monitor-host>/api/webhooks/git-push`
- Secret Token: stored in `repositories.webhook_secret`
- Validation: `X-Gitlab-Token` header matches stored secret

## GitHub Webhook

- Event: `push`
- URL: `https://<monitor-host>/api/webhooks/git-push`
- Secret: stored in `repositories.webhook_secret`
- Validation: HMAC-SHA256 of payload using `X-Hub-Signature-256` header

## Webhook Handler Logic

1. Parse provider from payload structure (GitLab vs GitHub).
2. Extract repo identifier (project ID or owner/repo).
3. Look up registered repository.
4. Check if any modified files match `docPaths` or `testPaths` globs.
5. If yes: trigger incremental sync for affected files only.
6. Broadcast `tree-updated` via WebSocket.
