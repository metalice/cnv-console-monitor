# Test Explorer Page (UI)

The Test Explorer is a new route at `/test-explorer`, added to the sidebar navigation.

## Page Layout

```
+------------------------------------------------------------------+
| Test Explorer                                    [Refresh] [AI Insights] |
|------------------------------------------------------------------|
| Filter: [Component ▼] [Repo ▼] [Status ▼] [Search...         ] |
| View:   [Tree | Flat] [Show: Docs | Tests | Both]               |
|------------------------------------------------------------------|
|                          |                                       |
|  TREE PANEL (left 40%)   |  DETAIL PANEL (right 60%)             |
|                          |                                       |
|  ▼ Networking            |  nic-hot-plug.md                      |
|    ▼ kubevirt-ui          |  ─────────────────────                |
|      ▼ docs/networking/   |  Jira: CNV-1234  [Open in Jira ↗]    |
|        ● nic-hot-plug.md  |  Test: tests/net/nic-hot-plug.spec.ts |
|        ○ nic-unplug.md    |  Polarion: CNV-9876                   |
|        ◉ bridge.md [Q]    |  Last Run: PASSED (2h ago)            |
|      ▼ tests/networking/  |  Owner: @matan                        |
|        ● nic-hot-plug...  |  Status: Documented, Tested           |
|        ● bridge.spec.ts   |                                       |
|        ◆ sriov.spec.ts    |  --- Rendered Markdown Content ---     |
|    ▼ other-repo           |                                       |
|      ...                  |  [Quarantine] [Triage] [View in Repo] |
|  ▼ Storage                |                                       |
|    ...                   |                                       |
+------------------------------------------------------------------+
| QUARANTINE DASHBOARD (collapsible bottom panel)                  |
|                                                                  |
| Active: 5  |  Overdue: 2  |  Proposed: 3  |  Resolved (30d): 12 |
|                                                                  |
| Test Name         | Component | Since    | SLA     | Jira  | PR  |
| bridge-binding    | Network   | 5d ago   | 9d left | CNV-X | ✓   |
| sriov-migration   | Network   | 18d ago  | OVERDUE | CNV-Y | ✓   |
+------------------------------------------------------------------+
```

## Tree Node Icons

| Icon | Meaning                          |
| ---- | -------------------------------- |
| `●`  | Matched (has counterpart)        |
| `○`  | Orphaned doc (no test)           |
| `◆`  | Undocumented test (no doc)       |
| `◉`  | Quarantined                      |
| `✗`  | Dead test (never runs in RP)     |

## Detail Panel

Clicking a node opens the detail panel showing:

- **For doc files**: rendered markdown content, frontmatter fields as metadata cards, linked test file, Jira link, Polarion link, last RP run status, quarantine status.
- **For test files**: file path with repo link, matched doc file, last RP run results (last 10 runs sparkline), quarantine controls, triage actions.
- **For folders**: summary stats (X docs, Y tests, Z gaps, W quarantined).

## AI Insights Panel (Drawer)

A slide-out drawer triggered by the "AI Insights" button:

- Gap analysis summary with stats (doc coverage %, test coverage %, gaps by type).
- List of all detected gaps with severity, file, and suggested action.
- Quarantine suggestions (tests AI recommends quarantining or unquarantining).
- Doc quality notes (stale docs, docs referencing closed Jira tickets).
- "Apply Suggestion" buttons for actionable items.
