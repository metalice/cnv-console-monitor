# Security Considerations

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
