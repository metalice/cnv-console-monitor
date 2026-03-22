# Category E: Data Integrity and Operations

## 11.30 Repo File Versioning

- Store the git commit SHA per synced file. Show sync status and allow "re-sync to latest."

**UI:** In the file detail panel, below the file path, a muted text line: "Synced from commit `abc123` (3 days ago)." If behind, a `Label` variant `warning`: "2 commits behind latest." A small "Sync to latest" `Button` (variant `plain`, `SyncAltIcon`) next to it. In the tree view (flat mode), a "Sync Status" column showing `CheckCircleIcon` (up to date) or `SyncAltIcon` with count behind.

## 11.31 Quarantine Export and Reporting

- Export quarantine data as CSV, Jira bulk format, or formatted email digest.

**UI:** On the quarantine dashboard, an `ExportButton` (reusing the existing `ExportButton` component pattern) in the toolbar. Clicking opens a `Menu` (PatternFly dropdown) with options: "Export CSV", "Export Jira Bulk", "Email Weekly Digest". CSV and Jira download immediately. Email opens a `Modal` with recipient field and preview of the digest. The weekly digest can also be configured in notification subscriptions settings.

## 11.32 Dry-Run Mode for Quarantine

- Preview quarantine actions without executing them.

**UI:** In the quarantine modal, a `Switch` toggle in the footer area: "Dry Run". When enabled, the primary button changes from "Quarantine" to "Preview" (secondary variant). Clicking "Preview" replaces the modal body with a read-only preview `Card` stack: Jira ticket preview (summary, description, labels), skip annotation diff (`CodeBlock` with green/red diff highlighting), RP defect update preview, impact score. A `Banner` at the top: "Dry run -- no actions will be taken." Footer changes to "Execute" (primary, applies everything) and "Cancel" (link).

## 11.33 Multi-Tenant Token Vault

- Support HashiCorp Vault or Kubernetes Secrets as an alternative to DB-stored tokens.

**UI:** In the global tokens settings section, a `Select` dropdown: "Token Source" with options "Database" (default) and "Vault". When "Vault" is selected, additional `FormGroup` inputs appear: Vault URL, Vault Path, Auth Method. A "Test Vault Connection" button. Personal tokens section shows a note when vault is active: "Personal tokens are stored in the configured vault." No visual change to the token input flow -- the backend handles the storage abstraction.
