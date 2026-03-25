/* eslint-disable max-lines */
import matter from 'gray-matter';

import { createGitProvider, type GitTreeEntry } from '../clients/git-provider';
import { type Repository } from '../db/entities/Repository';
import { getSetting } from '../db/store';
import { clearRepoFiles, updateFileCounterpart, upsertRepoFile } from '../db/store';
import { logger } from '../logger';

const log = logger.child({ module: 'RepoSync' });

const matchGlob = (filePath: string, pattern: string): boolean => {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*\//g, '(.+/)?')
    .replace(/\*/g, '[^/]*');
  // eslint-disable-next-line security/detect-non-literal-regexp -- pattern from validated config, not user input
  return new RegExp(`^${regex}$`).test(filePath);
};

const matchesAnyGlob = (filePath: string, patterns: string[]): boolean => {
  return patterns.some(p => matchGlob(filePath, p));
};

const TEST_EXTENSIONS = /\.(?:spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i;

const isTestFile = (filePath: string): boolean => {
  return TEST_EXTENSIONS.test(filePath);
};

const getBaseName = (filePath: string): string => {
  const name = filePath.split('/').pop() || filePath;
  return name.replace(/\.(?:md|spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i, '');
};

const classifyFile = (
  filePath: string,
  docPaths: string[],
  testPaths: string[],
): 'doc' | 'test' | 'other' | 'maybe-doc' => {
  if (docPaths.length > 0 && matchesAnyGlob(filePath, docPaths)) {
    return 'doc';
  }
  if (testPaths.length > 0 && matchesAnyGlob(filePath, testPaths)) {
    return 'test';
  }
  if (testPaths.length === 0 && isTestFile(filePath)) {
    return 'test';
  }
  if (docPaths.length === 0 && filePath.endsWith('.md')) {
    return 'maybe-doc';
  }
  return 'other';
};

const classifyMdFilesWithAI = async (
  mdFiles: { path: string; snippet: string }[],
): Promise<Set<string>> => {
  const testDocPaths = new Set<string>();

  try {
    const { getAIService } = await import('../ai');
    const ai = getAIService();
    if (!ai.isEnabled()) {
      return new Set(mdFiles.map(f => f.path));
    }

    const batchSize = 40;
    for (let i = 0; i < mdFiles.length; i += batchSize) {
      const batch = mdFiles.slice(i, i + batchSize);
      const fileList = batch.map((f, idx) => `${idx + 1}. ${f.path}\n   ${f.snippet}`).join('\n\n');

      const prompt = `Classify markdown files as TEST_DOC or NOT_TEST_DOC.

A file IS a TEST_DOC if it has at least 2 of:
- Numbered test case headings (### 001, ### TC-001)
- Step/Action/Expected result tables
- Requirements Traceability Matrix (RTM)
- References to .spec.ts / .cy.ts / .test.ts files as test subjects
- Title containing "STD", "Test Description", "Test Plan", "Test Cases"

A file is NOT_TEST_DOC if it is:
- A README, CONTRIBUTING, CHANGELOG, or LICENSE
- A setup/install/architecture guide
- A template or boilerplate
- A general project document that mentions testing but doesn't define test cases

Files:
${fileList}

Return ONLY a JSON array of file numbers that are TEST_DOC. Example: [1, 3, 5]
If none: []`;

      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const response = await ai.chat([{ content: prompt, role: 'user' }], {
        cacheTtlMs: 24 * 60 * 60 * 1000,
        json: true,
        maxTokens: 200,
      });

      try {
        const jsonStr = extractJsonFromText(response.content);
        const parsed: unknown = JSON.parse(jsonStr);
        let indices: unknown[];
        if (Array.isArray(parsed)) {
          indices = parsed;
        } else if (parsed !== null && typeof parsed === 'object') {
          const arrayVal = Object.values(parsed as Record<string, unknown>).find(v =>
            Array.isArray(v),
          );
          indices = Array.isArray(arrayVal) ? arrayVal : [];
        } else {
          indices = [];
        }

        for (const idx of indices) {
          if (typeof idx !== 'number') {
            continue;
          }
          const file = batch[idx - 1];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: AI JSON may reference out-of-range indices
          if (file) {
            testDocPaths.add(file.path);
          }
        }
      } catch {
        for (const f of batch) {
          testDocPaths.add(f.path);
        }
      }
    }
  } catch {
    return new Set(mdFiles.map(f => f.path));
  }

  return testDocPaths;
};

const TEST_FILE_LINK_SUFFIX = /\.(?:spec|test|cy|e2e)\.(?:ts|js)$/i;

/** Scan for `](url)` where url ends with a test file extension — avoids ReDoS-prone markdown regexes. */
const collectMarkdownLinksToTestFiles = (
  content: string,
  refs: string[],
  maxUrlLen = 2000,
): void => {
  let pos = 0;
  while (pos < content.length) {
    const open = content.indexOf('](', pos);
    if (open === -1) {
      break;
    }
    const urlStart = open + 2;
    const window = content.slice(urlStart, urlStart + maxUrlLen + 1);
    const closeRel = window.indexOf(')');
    if (closeRel === -1) {
      pos = urlStart;
      continue;
    }
    const url = window.slice(0, closeRel);
    if (TEST_FILE_LINK_SUFFIX.test(url)) {
      refs.push(url.replace(/^\.\//, ''));
    }
    pos = urlStart + closeRel + 1;
  }
};

const QUOTE_CHARS = new Set(['"', "'", '`']);

/** First quoted string on a line (after optional whitespace), for multiline test/describe/it names. */
const extractQuotedNameFromLine = (line: string, maxLen = 8000): string | null => {
  let i = 0;
  while (i < line.length && /\s/.test(line[i])) {
    i++;
  }
  if (i >= line.length) {
    return null;
  }
  const q = line[i];
  if (!QUOTE_CHARS.has(q)) {
    return null;
  }
  i++;
  const start = i;
  while (i < line.length && i - start < maxLen) {
    const ch = line[i];
    if (ch === '\\' && i + 1 < line.length) {
      i += 2;
      continue;
    }
    if (ch === q) {
      return line.slice(start, i);
    }
    i++;
  }
  return null;
};

const extractTestReferences = (content: string): string[] => {
  const refs: string[] = [];

  collectMarkdownLinksToTestFiles(content, refs);

  const pathPattern =
    /(?:^|[\s'"`])([\w./-]{1,500}\.(?:spec|test|cy|e2e)\.(?:ts|js))(?:['"`\s]|$)/gm;
  let match;
  while ((match = pathPattern.exec(content)) !== null) {
    const ref = match[1].replace(/^\.\//, '');
    if (!refs.includes(ref)) {
      refs.push(ref);
    }
  }

  return refs;
};

type DocSignals = {
  title: string;
  featureArea: string;
  testRefs: string[];
  rtmEntries: string[];
  headings: string[];
};

const extractDocSignals = (content: string, filePath: string): DocSignals => {
  const lines = content.split('\n');

  let title = '';
  for (const line of lines) {
    const h1 = /^#\s+(.+)/.exec(line);
    if (h1) {
      title = h1[1].trim();
      break;
    }
  }

  const pathParts = filePath.split('/').filter(p => !STRIP_PREFIXES.has(p.toLowerCase()));
  const featureArea = pathParts.slice(0, -1).join('/') || '';

  const testRefs = extractTestReferences(content);

  const rtmEntries: string[] = [];
  const rtmSection =
    /(?:traceability|RTM|requirements.*matrix)[^\n]*\n([\s\S]*?)(?=\n##|\n---|$)/i.exec(content);
  if (rtmSection) {
    const tableRows = rtmSection[1].match(/\|[^|]+\|[^|]+\|[^|]+\|/g) ?? [];
    for (const row of tableRows) {
      if (/\.(?:spec|test|cy|e2e)\.(?:ts|js)/i.exec(row)) {
        rtmEntries.push(row.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim());
      }
    }
  }

  const headings: string[] = [];
  for (const line of lines) {
    const h = /^#{2,3}\s+(.+)/.exec(line);
    if (h && headings.length < 10) {
      headings.push(h[1].trim());
    }
  }

  return { featureArea, headings, rtmEntries, testRefs, title };
};

type TestBlock = {
  name: string;
  line: number;
  type: 'test' | 'describe' | 'it';
  skipped?: boolean;
  endLine?: number;
};

// TODO: Refactor to reduce cognitive complexity
// eslint-disable-next-line sonarjs/cognitive-complexity
const extractTestBlocks = (content: string): TestBlock[] => {
  const blocks: TestBlock[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const testInline = /\btest(?:\.(skip|fixme))?\s*\(\s*(['"`])((?:(?!\2).){0,8000})\2/.exec(line);
    if (testInline) {
      blocks.push({
        line: i + 1,
        name: testInline[3],
        skipped: testInline[1] === 'skip' || testInline[1] === 'fixme',
        type: 'test',
      });
      continue;
    }

    const testMultiline = /\btest(?:\.(skip|fixme))?\s*\(\s*$/.exec(line);
    if (testMultiline) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const name = extractQuotedNameFromLine(lines[j]);
        if (name !== null) {
          blocks.push({
            line: i + 1,
            name,
            skipped: testMultiline[1] === 'skip' || testMultiline[1] === 'fixme',
            type: 'test',
          });
          break;
        }
      }
      continue;
    }

    const describeInline = /\btest\.describe\s*\(\s*(['"`])((?:(?!\1).){0,8000})\1/.exec(line);
    if (describeInline) {
      blocks.push({ line: i + 1, name: describeInline[2], type: 'describe' });
      continue;
    }

    const describeMultiline = /\btest\.describe\s*\(\s*$/.exec(line);
    if (describeMultiline) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const name = extractQuotedNameFromLine(lines[j]);
        if (name !== null) {
          blocks.push({ line: i + 1, name, type: 'describe' });
          break;
        }
      }
      continue;
    }

    const itInline = /\bit\s*\(\s*(['"`])((?:(?!\1).){0,8000})\1/.exec(line);
    if (itInline) {
      blocks.push({ line: i + 1, name: itInline[2], type: 'it' });
      continue;
    }

    const skipInline = /\btest\.skip\s*\(\s*true\b/.exec(line);
    if (skipInline) {
      const parentTest = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      if (parentTest?.type === 'test' && !parentTest.skipped) {
        parentTest.skipped = true;
      }
      continue;
    }

    const itMultiline = /\bit\s*\(\s*$/.exec(line);
    if (itMultiline) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const name = extractQuotedNameFromLine(lines[j]);
        if (name !== null) {
          blocks.push({ line: i + 1, name, type: 'it' });
          break;
        }
      }
    }
  }

  return blocks;
};

const getRelativePath = (filePath: string, prefixPatterns: string[]): string => {
  for (const pattern of prefixPatterns) {
    const prefix = pattern.split('*')[0].replace(/\/$/, '');
    if (filePath.startsWith(prefix)) {
      return filePath.slice(prefix.length + 1);
    }
  }
  return filePath;
};

type SyncResult = {
  repoId: string;
  branch: string;
  totalFiles: number;
  docs: number;
  tests: number;
  matchedPairs: number;
  duration: number;
};

type SyncProgressCallback = (info: {
  phase: string;
  repoName: string;
  current: number;
  total: number;
  message: string;
}) => void;

type DocFileEntry = {
  path: string;
  baseName: string;
  relPath: string;
  id?: string;
  testRefs?: string[];
  signals?: DocSignals;
};
type TestFileEntry = { path: string; baseName: string; relPath: string; id?: string };

const extractJsonFromText = (text: string): string => {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\n?```\s*$/, '')
    .trim();

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // Not pure JSON -- extract the first JSON array or object from the text
  }

  const arrayStart = trimmed.indexOf('[');
  const objectStart = trimmed.indexOf('{');
  const start =
    arrayStart === -1
      ? objectStart
      : objectStart === -1
        ? arrayStart
        : Math.min(arrayStart, objectStart);
  if (start === -1) {
    return trimmed;
  }

  const openChar = trimmed[start];
  const closeChar = openChar === '[' ? ']' : '}';
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === openChar) {
      depth++;
    } else if (trimmed[i] === closeChar) {
      depth--;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }

  return trimmed.slice(start);
};

const parseAIMatchResponse = (content: string): number[][] => {
  const jsonStr = extractJsonFromText(content);
  const parsed: unknown = JSON.parse(jsonStr);

  let pairs: unknown[];
  if (Array.isArray(parsed)) {
    pairs = parsed;
  } else if (parsed !== null && typeof parsed === 'object') {
    const values = Object.values(parsed as Record<string, unknown>);
    const arrayVal = values.find(v => Array.isArray(v));
    if (!arrayVal) {
      log.warn(
        { keys: Object.keys(parsed as Record<string, unknown>) },
        'AI response is object with no array property',
      );
      return [];
    }
    pairs = arrayVal as unknown[];
  } else {
    return [];
  }

  return pairs.filter(
    (p): p is [number, number] =>
      Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number',
  );
};

const applyMatchPairs = async (
  rawPairs: number[][],
  allDocs: DocFileEntry[],
  allTests: TestFileEntry[],
  usedTests: Set<number>,
): Promise<number> => {
  let applied = 0;
  let skippedUsed = 0;
  let skippedOutOfRange = 0;

  for (const [dIdx, tIdx] of rawPairs) {
    if (usedTests.has(tIdx)) {
      skippedUsed++;
      continue;
    }
    const doc = allDocs[dIdx - 1] as DocFileEntry | undefined;
    const test = allTests[tIdx - 1] as TestFileEntry | undefined;
    if (!doc?.id || !test?.id) {
      skippedOutOfRange++;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await updateFileCounterpart(doc.id, test.id);
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await updateFileCounterpart(test.id, doc.id);
    applied++;
    usedTests.add(tIdx);
  }

  if (skippedUsed > 0 || skippedOutOfRange > 0) {
    log.debug(
      { applied, rawPairsCount: rawPairs.length, skippedOutOfRange, skippedUsed },
      'Match pair application details',
    );
  }

  return applied;
};

type AIChatFn = (
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[],
  options?: Record<string, unknown>,
) => Promise<{ content: string; provider: string; model: string }>;

const runAIMatchingBatches = async (
  ai: { chat: AIChatFn },
  docFiles: DocFileEntry[],
  testFiles: TestFileEntry[],
  progress: (phase: string, current: number, total: number, message: string) => void,
): Promise<number> => {
  const testList = testFiles.map((t, i) => `T${i + 1}: ${t.path}`).join('\n');
  const usedTests = new Set<number>();
  const BATCH_SIZE = 15;
  let matchedPairs = 0;

  for (let batchStart = 0; batchStart < docFiles.length; batchStart += BATCH_SIZE) {
    const batch = docFiles.slice(batchStart, batchStart + BATCH_SIZE);
    const batchDocList = batch
      .map((d, i) => {
        const globalIdx = batchStart + i + 1;
        const s = d.signals;
        let entry = `D${globalIdx}: ${d.path}`;
        if (s?.title) {
          entry += `\n  Title: ${s.title}`;
        }
        if (s?.featureArea) {
          entry += `\n  Feature: ${s.featureArea}`;
        }
        if (s?.testRefs && s.testRefs.length > 0) {
          entry += `\n  References test files: ${s.testRefs.join(', ')}`;
        }
        if (s?.rtmEntries && s.rtmEntries.length > 0) {
          entry += `\n  RTM mappings: ${s.rtmEntries.slice(0, 5).join(' | ')}`;
        }
        return entry;
      })
      .join('\n\n');

    const prompt = `Match each documentation file to its corresponding test code file.

MATCHING RULES (strongest signal first):
1. EXPLICIT REFERENCES: If doc says "References test files: X.spec.ts", match to that exact test file.
2. RTM TABLE: If doc's RTM mentions a spec filename, that is a definitive match.
3. DIRECTORY + FEATURE: tier1/bootable-volumes.md matches tier1/*/bootable-volumes.spec.ts (same tier AND same feature).
4. NAMING VARIATIONS: These are equivalent names — match them:
   - kebab-case vs camelCase: "instance-types" = "instanceTypes"
   - singular vs plural: "template" = "templates"
   - abbreviations: "vm" = "virtualmachines", "acm" = "fleet-virtualization-acm"
   - with/without suffixes: "catalog" = "catalog-it-filter"
5. FEATURE CONTEXT: If a doc's title mentions "Bootable Volumes" and a test path contains "bootable-volumes", they match.

CONSTRAINTS:
- Each doc matches AT MOST one test. Each test matches AT MOST one doc.
- Prefer matches within the same tier/directory over cross-tier matches.
- When a doc explicitly references a test file, that ALWAYS wins.
- Skip tests already used: ${usedTests.size > 0 ? `T${[...usedTests].join(', T')} are taken` : 'none taken yet'}.

DOCUMENTATION FILES:
${batchDocList}

TEST FILES:
${testList}

Return ONLY a JSON array. Each element: [docNumber, testNumber].
Example: [[1,3],[2,5]]
If no matches: []`;

    // eslint-disable-next-line no-await-in-loop -- sequential: batches must run in order to track usedTests
    const response = await ai.chat([{ content: prompt, role: 'user' }], {
      cacheTtlMs: 24 * 60 * 60 * 1000,
      json: true,
      maxTokens: 4096,
    });

    log.info(
      {
        batch: `${batchStart + 1}-${batchStart + batch.length}`,
        responseLength: response.content.length,
      },
      'AI matching batch response received',
    );

    try {
      const matches = parseAIMatchResponse(response.content);
      if (matches.length === 0) {
        log.warn(
          { preview: response.content.slice(0, 300), provider: response.provider },
          'AI returned 0 match pairs',
        );
      } else {
        log.info({ matches: matches.length }, 'AI matching batch parsed');
      }

      // eslint-disable-next-line no-await-in-loop -- sequential: batches must run in order
      const applied = await applyMatchPairs(matches, docFiles, testFiles, usedTests);
      matchedPairs += applied;
    } catch (parseErr) {
      log.warn(
        { err: parseErr, preview: response.content.slice(0, 500) },
        'Failed to parse AI matching response',
      );
    }

    progress(
      'matching',
      Math.min(batchStart + BATCH_SIZE, docFiles.length),
      docFiles.length,
      `Matched ${matchedPairs} pairs so far (batch ${Math.floor(batchStart / BATCH_SIZE) + 1})`,
    );
  }

  return matchedPairs;
};

export const syncRepository = async (
  repo: Repository,
  branch?: string,
  onProgress?: SyncProgressCallback,
  // TODO: Refactor to reduce cognitive complexity
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<SyncResult> => {
  const startTime = Date.now();
  const targetBranch = branch || (repo.branches as unknown as string[])[0] || 'main';
  const docPaths = repo.doc_paths as unknown as string[];
  const testPaths = repo.test_paths as unknown as string[];

  log.info({ branch: targetBranch, name: repo.name, repoId: repo.id }, 'Starting repo sync');

  let token = await getSetting(repo.global_token_key);
  if (!token) {
    const altKeys = [`${repo.provider}.token`, `${repo.provider}Token`];
    for (const key of altKeys) {
      if (key !== repo.global_token_key) {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        token = await getSetting(key);
        if (token) {
          break;
        }
      }
    }
  }
  if (!token) {
    const { AppDataSource } = await import('../db/data-source');
    const { decryptValue } = await import('../db/crypto');
    const rows: { encrypted_token: string }[] = await AppDataSource.query(
      `SELECT encrypted_token FROM user_tokens WHERE provider = $1 AND is_valid = true LIMIT 1`,
      [repo.provider],
    );
    if (rows.length > 0) {
      token = decryptValue(rows[0].encrypted_token);
    }
  }
  if (!token) {
    throw new Error(
      `No ${repo.provider} access token found. Save one in Settings (key: ${repo.global_token_key}) or configure a personal ${repo.provider} token.`,
    );
  }

  const repoName = repo.name;
  const progress = (phase: string, current: number, total: number, message: string) => {
    onProgress?.({ current, message, phase, repoName, total });
  };

  progress('connecting', 0, 0, `Connecting to ${repo.provider}...`);
  const provider = await createGitProvider(
    repo.provider as 'gitlab' | 'github',
    repo.api_base_url,
    repo.project_id,
    token,
  );

  progress('fetching-tree', 0, 0, `Fetching file tree from ${targetBranch}...`);
  const tree = await provider.fetchTree(targetBranch);

  const classified = tree
    .filter((e: GitTreeEntry) => e.type === 'blob')
    .map(entry => ({
      ...entry,
      classification: classifyFile(entry.path, docPaths, testPaths),
    }));

  const definiteFiles = classified.filter(
    f => f.classification === 'doc' || f.classification === 'test',
  );
  const maybeDocs = classified.filter(f => f.classification === 'maybe-doc');

  let confirmedDocPaths = new Set<string>();
  if (maybeDocs.length > 0) {
    progress(
      'classifying',
      0,
      maybeDocs.length,
      `AI classifying ${maybeDocs.length} markdown files...`,
    );
    const snippets: { path: string; snippet: string }[] = [];
    for (const md of maybeDocs) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        const content = await provider.fetchFileContent(md.path, targetBranch);
        const raw = content.content;
        const titleMatch = /^#\s+(.+)/m.exec(raw);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const headings = (raw.match(/^#{2,3}\s+.+/gm) ?? [])
          .slice(0, 6)
          .map(h => h.replace(/^#+\s+/, ''));
        const hasTable = /\|\s*Step\s*\||\|\s*Action\s*\||\|\s*Expected/i.test(raw);
        const hasTestCases = /###\s+`?\d{3}/.test(raw);
        const hasRTM = /traceability|RTM/i.test(raw);
        const refsTestFiles = /\.(?:spec|test|cy|e2e)\.(?:ts|js)/i.test(raw);

        const summary = [
          `Title: ${title || '(none)'}`,
          `Headings: ${headings.join(', ') || '(none)'}`,
          hasTable ? 'Has step/action/expected tables' : '',
          hasTestCases ? 'Has numbered test cases (### 001)' : '',
          hasRTM ? 'Has Requirements Traceability Matrix' : '',
          refsTestFiles ? 'References test files (.spec.ts/.cy.ts)' : '',
        ]
          .filter(Boolean)
          .join(' | ');

        snippets.push({ path: md.path, snippet: summary });
      } catch {
        snippets.push({ path: md.path, snippet: '(could not read)' });
      }
    }
    confirmedDocPaths = await classifyMdFilesWithAI(snippets);
    progress(
      'classifying',
      maybeDocs.length,
      maybeDocs.length,
      `AI classified: ${confirmedDocPaths.size} test docs out of ${maybeDocs.length} markdown files`,
    );
  }

  const relevantFiles = [
    ...definiteFiles,
    ...maybeDocs
      .filter(f => confirmedDocPaths.has(f.path))
      .map(f => ({ ...f, classification: 'doc' as const })),
  ];

  progress(
    'processing',
    0,
    relevantFiles.length,
    `Found ${relevantFiles.length} files to process (${tree.length} total in repo)`,
  );

  await clearRepoFiles(repo.id, targetBranch);

  const docFiles: DocFileEntry[] = [];
  const testFiles: TestFileEntry[] = [];

  let fileIndex = 0;
  for (const file of relevantFiles) {
    fileIndex++;
    if (fileIndex % 5 === 1 || fileIndex === relevantFiles.length) {
      progress(
        'processing',
        fileIndex,
        relevantFiles.length,
        `Processing ${file.path.split('/').pop()} (${fileIndex}/${relevantFiles.length})`,
      );
    }
    const fileType = (file as unknown as { classification: string }).classification as
      | 'doc'
      | 'test';
    const fileName = file.path.split('/').pop() || file.path;

    let frontmatterData: Record<string, unknown> | null = null;
    let docContent = '';

    if (fileType === 'doc' && fileName.endsWith('.md')) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        const content = await provider.fetchFileContent(file.path, targetBranch);
        docContent = content.content;
        const parsed = matter(docContent);
        if (Object.keys(parsed.data).length > 0) {
          frontmatterData = parsed.data;
        }
      } catch (err) {
        log.debug({ err, path: file.path }, 'Failed to parse frontmatter');
      }
    }

    if (fileType === 'test') {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        const content = await provider.fetchFileContent(file.path, targetBranch);
        const testBlocks = extractTestBlocks(content.content);
        if (testBlocks.length > 0) {
          frontmatterData = { testBlocks };
        }
      } catch (err) {
        log.debug({ err, path: file.path }, 'Failed to extract test blocks');
      }
    }

    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const saved = await upsertRepoFile({
      branch: targetBranch,
      file_name: fileName,
      file_path: file.path,
      file_type: fileType,
      frontmatter: frontmatterData as unknown as string,
      repo_id: repo.id,
    });

    const baseName = getBaseName(file.path);
    const relPath = getRelativePath(file.path, fileType === 'doc' ? docPaths : testPaths);

    if (fileType === 'doc') {
      const testRefs = extractTestReferences(docContent);
      const signals = docContent ? extractDocSignals(docContent, file.path) : undefined;
      docFiles.push({
        baseName,
        id: saved.id,
        path: file.path,
        relPath: getBaseName(relPath),
        signals,
        testRefs,
      });
    } else {
      testFiles.push({ baseName, id: saved.id, path: file.path, relPath: getBaseName(relPath) });
    }
  }

  let matchedPairs = 0;

  try {
    const { getAIService } = await import('../ai');
    const ai = getAIService();

    if (ai.isEnabled() && docFiles.length > 0 && testFiles.length > 0) {
      progress('ai-check', 0, 0, 'Verifying AI provider connection...');

      let aiReady = false;
      try {
        const probe = await ai.chat([{ content: 'Say hello', role: 'user' }], {
          maxTokens: 32,
          useCache: false,
        });
        const probeText = probe.content.trim().slice(0, 80);
        aiReady = probeText.length > 0;
        progress(
          'ai-check',
          1,
          1,
          `AI connected: ${probe.provider} / ${probe.model} (${probe.durationMs}ms) — "${probeText}"`,
        );
        log.info(
          {
            durationMs: probe.durationMs,
            model: probe.model,
            provider: probe.provider,
            response: probeText,
          },
          'AI health check passed',
        );
      } catch (probeErr) {
        const errMsg = probeErr instanceof Error ? probeErr.message : 'Unknown error';
        progress('ai-check', 0, 1, `AI connection failed: ${errMsg}`);
        log.error({ err: probeErr }, 'AI health check failed');
      }

      if (!aiReady) {
        progress(
          'matching',
          docFiles.length,
          docFiles.length,
          `Skipping AI matching — provider not reachable`,
        );
      }

      if (aiReady) {
        progress(
          'matching',
          0,
          docFiles.length,
          `AI matching ${docFiles.length} docs to ${testFiles.length} tests...`,
        );

        matchedPairs = await runAIMatchingBatches(ai, docFiles, testFiles, progress);
      }
    }
  } catch (err) {
    log.error({ err }, 'AI matching failed');
  }

  progress(
    'matching',
    docFiles.length,
    docFiles.length,
    `Matched ${matchedPairs} doc-test pairs via AI`,
  );

  const duration = Date.now() - startTime;
  progress(
    'complete',
    relevantFiles.length,
    relevantFiles.length,
    `Sync complete: ${docFiles.length} docs, ${testFiles.length} tests, ${matchedPairs} matched (${Math.round(duration / 1000)}s)`,
  );

  log.info(
    {
      branch: targetBranch,
      docs: docFiles.length,
      duration,
      matchedPairs,
      repoId: repo.id,
      tests: testFiles.length,
    },
    'Repo sync complete',
  );

  return {
    branch: targetBranch,
    docs: docFiles.length,
    duration,
    matchedPairs,
    repoId: repo.id,
    tests: testFiles.length,
    totalFiles: docFiles.length + testFiles.length,
  };
};

export const syncAllRepositories = async (
  onProgress?: SyncProgressCallback,
): Promise<SyncResult[]> => {
  const { getEnabledRepositories } = await import('../db/store');
  const repos = await getEnabledRepositories();
  const results: SyncResult[] = [];

  for (const repo of repos) {
    try {
      const branches = repo.branches as unknown as string[];
      for (const branch of branches) {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        const result = await syncRepository(repo, branch, onProgress);
        results.push(result);
      }
    } catch (err) {
      log.error({ err, name: repo.name, repoId: repo.id }, 'Failed to sync repository');
      onProgress?.({
        current: 0,
        message: `Failed to sync ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        phase: 'error',
        repoName: repo.name,
        total: 0,
      });
    }
  }

  return results;
};

const STRIP_PREFIXES = new Set([
  'docs',
  'playwright',
  'doc',
  'documentation',
  'tests',
  'cypress',
  'e2e',
  'test',
]);

const getLogicalPath = (filePath: string): string[] => {
  const parts = filePath.split('/');
  const fileName = parts.pop() || '';
  const baseName = fileName.replace(
    /\.(?:md|spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i,
    '',
  );
  const segments = parts.filter(p => !STRIP_PREFIXES.has(p.toLowerCase()));
  if (segments.length > 0 && segments[segments.length - 1] === baseName) {
    return segments;
  }
  return [...segments, baseName];
};

type FileNode = Record<string, unknown>;
type FolderMap = Map<string, { files: FileNode[]; children: FolderMap }>;

const insertIntoTree = (root: FolderMap, segments: string[], fileNode: FileNode): void => {
  if (segments.length === 0) {
    return;
  }

  if (segments.length === 1) {
    const leaf = segments[0];
    if (!root.has(leaf)) {
      root.set(leaf, { children: new Map(), files: [] });
    }
    root.get(leaf)?.files.push(fileNode);
    return;
  }

  const [head, ...rest] = segments;
  if (!root.has(head)) {
    root.set(head, { children: new Map(), files: [] });
  }
  const headNode = root.get(head);
  if (headNode) {
    insertIntoTree(headNode.children, rest, fileNode);
  }
};

const countFiles = (nodes: Record<string, unknown>[]): number => {
  let count = 0;
  for (const n of nodes) {
    if (n.type === 'doc' || n.type === 'test') {
      count++;
    }
    if (Array.isArray(n.children)) {
      count += countFiles(n.children as Record<string, unknown>[]);
    }
  }
  return count;
};

const countGaps = (nodes: Record<string, unknown>[]): number => {
  let count = 0;
  for (const n of nodes) {
    if ((n.type === 'doc' || n.type === 'test') && !n.hasCounterpart) {
      count++;
    }
    if (Array.isArray(n.children)) {
      count += countGaps(n.children as Record<string, unknown>[]);
    }
  }
  return count;
};

const folderMapToNodes = (map: FolderMap, parentPath: string): Record<string, unknown>[] => {
  const result: Record<string, unknown>[] = [];

  for (const [name, { children, files }] of [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const path = parentPath ? `${parentPath}/${name}` : name;
    const childNodes = folderMapToNodes(children, path);
    const allChildren = [...files, ...childNodes];

    if (files.length === 0 && childNodes.length === 1 && childNodes[0].type === 'folder') {
      const merged = childNodes[0];
      result.push({
        ...merged,
        name: `${name} / ${String(merged.name)}`,
      });
    } else if (allChildren.length > 0) {
      result.push({
        children: allChildren,
        fileCount: countFiles(allChildren),
        gapCount: countGaps(allChildren),
        name,
        path,
        type: 'folder',
      });
    }
  }

  return result;
};

// TODO: Refactor to reduce cognitive complexity
// eslint-disable-next-line sonarjs/cognitive-complexity
export const buildTreeResponse = async (component?: string): Promise<Record<string, unknown>[]> => {
  const { getActiveQuarantines, getEnabledRepositories, getFilesByRepo } =
    await import('../db/store');

  const repos = component
    ? (await getEnabledRepositories()).filter(r =>
        (r.components as unknown as string[]).includes(component),
      )
    : await getEnabledRepositories();

  const quarantines = await getActiveQuarantines();
  const quarantineMap = new Map(quarantines.map(q => [q.test_name, q]));

  const tree: Record<string, unknown>[] = [];

  for (const repo of repos) {
    const branches = repo.branches as unknown as string[];
    const branch = branches[0] || 'main';
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const files = await getFilesByRepo(repo.id, branch);

    const fileIdToPath = new Map<string, string>();
    for (const file of files) {
      fileIdToPath.set(file.id, file.file_path);
    }

    const root: FolderMap = new Map();

    const counterpartDocPath = new Map<string, string>();
    for (const file of files) {
      if (file.file_type === 'test' && file.counterpart_id) {
        const docPath = fileIdToPath.get(file.counterpart_id);
        if (docPath) {
          counterpartDocPath.set(file.id, docPath);
        }
      }
    }

    for (const file of files) {
      const q = quarantineMap.get(file.rp_test_name || file.file_path);
      const counterpartPath = file.counterpart_id
        ? fileIdToPath.get(file.counterpart_id)
        : undefined;

      const fileNode: FileNode = {
        branch,
        counterpartPath,
        frontmatter: file.frontmatter,
        hasCounterpart: Boolean(file.counterpart_id),
        name: file.file_name,
        path: file.file_path,
        quarantine: q
          ? {
              id: q.id,
              jiraKey: q.jira_key,
              since: q.quarantined_at.toISOString(),
              status: q.status,
            }
          : undefined,
        repoId: repo.id,
        repoUrl: `${repo.url}/-/blob/${branch}/${file.file_path}`,
        type: file.file_type,
      };

      const pathForTree =
        file.file_type === 'test' && counterpartDocPath.has(file.id)
          ? (counterpartDocPath.get(file.id) ?? file.file_path)
          : file.file_path;
      const segments = getLogicalPath(pathForTree);
      insertIntoTree(root, segments, fileNode);
    }

    const repoChildren = folderMapToNodes(root, '');

    const repoNode: Record<string, unknown> = {
      branch,
      children: repoChildren,
      fileCount: files.length,
      gapCount: files.filter(f => !f.counterpart_id).length,
      name: repo.name,
      repoId: repo.id,
      type: 'repo',
    };

    const components = repo.components as unknown as string[];
    for (const comp of components) {
      if (component && comp !== component) {
        continue;
      }
      let compNode = tree.find(n => n.name === comp);
      if (!compNode) {
        compNode = { children: [], name: comp, type: 'component' };
        tree.push(compNode);
      }
      (compNode.children as Record<string, unknown>[]).push(repoNode);
    }
  }

  return tree;
};
