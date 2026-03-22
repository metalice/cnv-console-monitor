# Summary

Add a **Test Explorer** page to the CNV Console Monitor that provides a navigable tree view of test documentation and test code sourced from GitLab and GitHub repositories. The tree is rebuilt on every page refresh by fetching repository contents via API, with optional webhook-based sync for real-time updates.

On top of the tree, this feature adds:

- **AI gap analysis** that cross-references documentation files against actual test code files (and vice versa) to surface orphaned docs, untested features, and missing documentation.
- A full **quarantine system** that lets users quarantine flaky or broken tests — with duration tracking, Jira ticket creation, ReportPortal defect updates, and PR generation to add skip annotations in the test repo.
- **AI-assisted quarantine** that monitors quarantined tests for fix signals and suggests unquarantine, plus configurable time-limit alerts for stale quarantines.

The settings page gains a new **Repository Mapping** section where administrators map CNV Monitor components to one or more GitLab/GitHub repositories, with configurable naming, doc path patterns, test path patterns, and frontmatter schema.
