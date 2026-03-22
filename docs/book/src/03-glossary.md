# Glossary

| Term                 | Definition                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Test Explorer**    | The new page in the CNV Monitor sidebar that shows the documentation tree and quarantine dashboard.         |
| **Repository**       | A GitLab or GitHub repo registered in the system, mapped to one or more components.                         |
| **Doc File**         | A markdown file in a repo's documentation path (e.g., `playwright/docs/networking/nic-hot-plug.md`).       |
| **Test File**        | A test code file in a repo's test path (e.g., `tests/networking/nic-hot-plug.spec.ts`).                    |
| **Frontmatter**      | YAML metadata at the top of a markdown doc file (fields are configurable per repository).                   |
| **Gap**              | A mismatch: a doc file with no corresponding test file, or a test file with no corresponding doc.           |
| **Quarantine**       | A formal state marking a test as temporarily disabled, with tracked duration and required Jira ticket.      |
| **Quarantine SLA**   | Configurable maximum duration a test may remain quarantined before alerting.                                 |
| **Skip Annotation**  | A framework-specific marker in test code that causes the test runner to skip the test (e.g., `test.skip`).  |
