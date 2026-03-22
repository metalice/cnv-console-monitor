# AI-Powered Gap Analysis

When the tree is built, the AI layer runs analysis to detect issues. Results are shown as badges, banners, and a dedicated "AI Insights" panel.

## Gap Types Detected

| Gap Type                    | Description                                                                 | Severity |
| --------------------------- | --------------------------------------------------------------------------- | -------- |
| **Orphaned Doc**            | A doc file exists but no matching test file was found.                       | Warning  |
| **Undocumented Test**       | A test file exists but no matching doc file was found.                       | Info     |
| **Stale Doc**               | Doc references a Jira ticket that is closed/resolved but test is missing.    | Warning  |
| **Dead Test**               | Test file exists in repo but never appears in ReportPortal runs.             | Error    |
| **Phantom Test**            | Test runs in ReportPortal but no corresponding test file exists in any repo. | Error    |
| **Quarantine Overdue**      | Test has been quarantined longer than the configured SLA.                    | Warning  |
| **Quarantine Fix Detected** | AI detects the underlying issue may be resolved.                             | Info     |
| **Doc Drift**               | Doc content does not reflect recent test changes (based on git diff dates). | Info     |

## AI Analysis API

The AI analysis runs server-side and produces a structured report:

```typescript
type GapAnalysisReport = {
  summary: string;
  totalDocs: number;
  totalTests: number;
  matchedPairs: number;
  gaps: Array<{
    type: GapType;
    severity: 'error' | 'warning' | 'info';
    filePath: string;
    repoName: string;
    component: string;
    suggestion: string;
    relatedJira?: string;
    confidence: number;
  }>;
  stats: {
    docCoverage: number;      // % of tests that have docs
    testCoverage: number;     // % of docs that have tests
    quarantined: number;
    quarantineOverdue: number;
    deadTests: number;
    phantomTests: number;
  };
};
```
