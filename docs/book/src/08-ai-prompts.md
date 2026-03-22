# AI Prompt Specifications

## 8.1 Gap Analysis Prompt

**File**: `packages/server/src/ai/prompts/gap-analysis.md`

**Input**: List of doc files (with frontmatter), list of test files, list of RP test items, list of quarantined tests.

**Output**: Structured JSON with gap types, severity, suggestions, and confidence scores.

**Key instructions for the AI**:
- Cross-reference doc filenames and paths against test filenames and paths.
- Check if doc frontmatter `test_file` fields point to existing test files.
- Identify tests that appear in RP but not in any repo (phantom tests).
- Identify test files that never appear in RP (dead tests).
- Flag docs whose linked Jira tickets are resolved but the test is still failing or missing.
- Provide confidence scores (0-1) for each gap detection.

## 8.2 Quarantine Suggestion Prompt

**File**: `packages/server/src/ai/prompts/quarantine-suggest.md`

**Input**: Test name, failure history (last 30 runs), flaky score, linked Jira status, component, similar failures, quarantine history.

**Output**: JSON with recommendation (`quarantine | unquarantine | monitor | investigate`), confidence, reason, and suggested SLA.

## 8.3 Doc Quality Prompt

**File**: `packages/server/src/ai/prompts/doc-quality.md`

**Input**: Doc content, frontmatter, test file content (if matched), last modified dates, Jira ticket status.

**Output**: JSON with quality score, staleness indicators, and improvement suggestions.

## 8.4 File Matching Prompt

**File**: `packages/server/src/ai/prompts/file-matching.md`

**Input**: List of unmatched doc files, list of unmatched test files.

**Output**: JSON array of suggested pairings with confidence scores and reasoning.
