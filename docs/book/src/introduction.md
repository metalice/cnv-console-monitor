# RFC: Test Explorer

**Documentation Tree, Quarantine System, and AI-Powered Test Intelligence**

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| **Authors** | Matan Schatzman                            |
| **Status**  | Draft                                      |
| **Created** | 2026-03-22                                 |
| **Project** | CNV Console Monitor                        |
| **Labels**  | feature, ai, test-management, quarantine   |

---

This RFC proposes a **Test Explorer** feature for the CNV Console Monitor -- a navigable tree view of test documentation and test code sourced from GitLab and GitHub repositories, with AI-powered gap analysis, a full quarantine lifecycle, and deep integrations with Jira, ReportPortal, and CI pipelines.

Use the sidebar to navigate between sections. The RFC is organized as follows:

- **Core Design** -- Summary, motivation, glossary, and architecture.
- **Feature Specifications** -- Detailed specs for each sub-feature: repository registry, documentation tree, gap analysis, quarantine system, UI, and settings.
- **Technical Reference** -- Data model (PostgreSQL), API endpoints, AI prompts, webhooks, and security.
- **Future Enhancements** -- 50 additional feature ideas organized by category, each with UI specifications following PatternFly 6 conventions.
- **Appendix** -- Implementation roadmap and resolved design decisions.
