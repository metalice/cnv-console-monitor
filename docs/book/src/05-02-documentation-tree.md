# Test Documentation Tree

The tree is the core UI element. It presents a hierarchical view organized as:

```
Component (e.g., "Networking")
└── Repo (e.g., "kubevirt-ui / playwright")
    └── Folder (e.g., "docs/networking/")
        ├── nic-hot-plug.md          [DOC] [Jira: CNV-1234] [Test: ✓]
        ├── nic-hot-unplug.md        [DOC] [Jira: CNV-1235] [Test: ✗ MISSING]
        └── bridge-binding.md        [DOC] [Jira: CNV-1236] [Test: ✓] [QUARANTINED 5d]
    └── Folder (e.g., "tests/networking/")
        ├── nic-hot-plug.spec.ts     [TEST] [Doc: ✓] [Last Run: PASSED]
        ├── bridge-binding.spec.ts   [TEST] [Doc: ✓] [Last Run: FAILED] [QUARANTINED]
        └── sriov-migration.spec.ts  [TEST] [Doc: ✗ MISSING] [Last Run: PASSED]
```

## Tree Node Properties

Each node in the tree carries metadata:

| Property          | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `type`            | `component`, `repo`, `folder`, `doc`, `test`, `other`              |
| `name`            | File or folder name                                                |
| `path`            | Full path within the repo                                          |
| `repoUrl`         | Direct link to the file in GitLab/GitHub                           |
| `hasCounterpart`  | Whether a doc has a matching test (or vice versa)                  |
| `counterpartPath` | Path of the matched file (if any)                                  |
| `jiraKeys`        | Jira ticket keys extracted from frontmatter                        |
| `polarionId`      | Polarion test case ID (if present)                                 |
| `quarantine`      | Quarantine info (if quarantined): status, since, Jira key, SLA     |
| `lastRunStatus`   | Latest ReportPortal run result for this test (if matchable)        |
| `lastRunDate`     | When the test last ran                                             |
| `owner`           | Owner from frontmatter or CODEOWNERS                               |
| `tags`            | Tags/labels from frontmatter                                       |

## Matching Logic (Doc <-> Test)

The system matches doc files to test files using multiple strategies (in priority order):

1. **Explicit frontmatter**: Doc's `test_file` frontmatter field points directly to the test file path.
2. **Naming convention**: `docs/networking/nic-hot-plug.md` matches `tests/networking/nic-hot-plug.spec.ts` (strip extensions, compare base names and relative paths).
3. **Folder structure**: Doc folder hierarchy mirrors test folder hierarchy.
4. **AI fuzzy matching**: For remaining unmatched files, AI suggests likely pairings based on file names, content similarity, and Jira context.

## RP Test Matching

To show `lastRunStatus`, the system attempts to match tree test files to ReportPortal test items using:

1. Unique ID matching (if the RP test item's `uniqueId` contains the file path or test name).
2. Name matching (test item name vs. `describe`/`it` block names extracted from the test file).
3. Polarion ID matching (if both the doc frontmatter and RP test item share a Polarion ID).
