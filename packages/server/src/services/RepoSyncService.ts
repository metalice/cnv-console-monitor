import matter from 'gray-matter';
import { logger } from '../logger';
import { createGitProvider, type GitTreeEntry } from '../clients/git-provider';
import { getSetting } from '../db/store';
import { getFilesByRepo, upsertRepoFile, updateFileCounterpart, clearRepoFiles } from '../db/store';
import { Repository } from '../db/entities/Repository';

const log = logger.child({ module: 'RepoSync' });

function matchGlob(filePath: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*\//g, '(.+/)?')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${regex}$`).test(filePath);
}

function matchesAnyGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => matchGlob(filePath, p));
}

function classifyFile(filePath: string, docPaths: string[], testPaths: string[]): 'doc' | 'test' | 'other' | 'maybe-doc' {
  if (docPaths.length > 0 && matchesAnyGlob(filePath, docPaths)) return 'doc';
  if (testPaths.length > 0 && matchesAnyGlob(filePath, testPaths)) return 'test';
  if (testPaths.length === 0 && isTestFile(filePath)) return 'test';
  if (docPaths.length === 0 && filePath.endsWith('.md')) return 'maybe-doc';
  return 'other';
}

async function classifyMdFilesWithAI(mdFiles: Array<{ path: string; snippet: string }>): Promise<Set<string>> {
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

      const response = await ai.chat(
        [{ role: 'user', content: prompt }],
        { json: true, maxTokens: 200, cacheTtlMs: 24 * 60 * 60 * 1000 },
      );

      try {
        let cleaned = response.content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const indices = JSON.parse(cleaned) as number[];
        for (const idx of indices) {
          const file = batch[idx - 1];
          if (file) testDocPaths.add(file.path);
        }
      } catch {
        for (const f of batch) testDocPaths.add(f.path);
      }
    }
  } catch {
    return new Set(mdFiles.map(f => f.path));
  }

  return testDocPaths;
}

const TEST_EXTENSIONS = /\.(spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i;

function isTestFile(filePath: string): boolean {
  return TEST_EXTENSIONS.test(filePath);
}

function getBaseName(filePath: string): string {
  const name = filePath.split('/').pop() || filePath;
  return name.replace(/\.(md|spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i, '');
}

function extractTestReferences(content: string): string[] {
  const refs: string[] = [];

  const linkPattern = /\[.*?\]\(([^)]+\.(?:spec|test|cy|e2e)\.(?:ts|js))\)/gi;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    refs.push(match[1].replace(/^\.\//, ''));
  }

  const pathPattern = /(?:^|\s|['"`])([a-zA-Z0-9_./-]+\.(?:spec|test|cy|e2e)\.(?:ts|js))(?:['"`]|\s|$)/gm;
  while ((match = pathPattern.exec(content)) !== null) {
    const ref = match[1].replace(/^\.\//, '');
    if (!refs.includes(ref)) refs.push(ref);
  }

  return refs;
}

interface DocSignals {
  title: string;
  featureArea: string;
  testRefs: string[];
  rtmEntries: string[];
  headings: string[];
}

function extractDocSignals(content: string, filePath: string): DocSignals {
  const lines = content.split('\n');

  let title = '';
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) { title = h1[1].trim(); break; }
  }

  const pathParts = filePath.split('/').filter(p => !STRIP_PREFIXES.has(p.toLowerCase()));
  const featureArea = pathParts.slice(0, -1).join('/') || '';

  const testRefs = extractTestReferences(content);

  const rtmEntries: string[] = [];
  const rtmSection = content.match(/(?:traceability|RTM|requirements.*matrix)[^\n]*\n([\s\S]*?)(?=\n##|\n---|\z)/i);
  if (rtmSection) {
    const tableRows = rtmSection[1].match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
    for (const row of tableRows) {
      if (row.match(/\.(spec|test|cy|e2e)\.(ts|js)/i)) {
        rtmEntries.push(row.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim());
      }
    }
  }

  const headings: string[] = [];
  for (const line of lines) {
    const h = line.match(/^#{2,3}\s+(.+)/);
    if (h && headings.length < 10) headings.push(h[1].trim());
  }

  return { title, featureArea, testRefs, rtmEntries, headings };
}

export interface TestBlock {
  name: string;
  line: number;
  type: 'test' | 'describe' | 'it';
  skipped?: boolean;
  endLine?: number;
}

function extractTestBlocks(content: string): TestBlock[] {
  const blocks: TestBlock[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const testInline = line.match(/\btest(?:\.(skip|fixme))?\s*\(\s*(['"`])(.*?)\2/);
    if (testInline) {
      blocks.push({ name: testInline[3], line: i + 1, type: 'test', skipped: testInline[1] === 'skip' || testInline[1] === 'fixme' });
      continue;
    }

    const testMultiline = line.match(/\btest(?:\.(skip|fixme))?\s*\(\s*$/);
    if (testMultiline) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nameMatch = lines[j].match(/\s*(['"`])(.*?)\1/);
        if (nameMatch) {
          blocks.push({ name: nameMatch[2], line: i + 1, type: 'test', skipped: testMultiline[1] === 'skip' || testMultiline[1] === 'fixme' });
          break;
        }
      }
      continue;
    }

    const describeInline = line.match(/\btest\.describe\s*\(\s*(['"`])(.*?)\1/);
    if (describeInline) {
      blocks.push({ name: describeInline[2], line: i + 1, type: 'describe' });
      continue;
    }

    const describeMultiline = line.match(/\btest\.describe\s*\(\s*$/);
    if (describeMultiline) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nameMatch = lines[j].match(/\s*(['"`])(.*?)\1/);
        if (nameMatch) {
          blocks.push({ name: nameMatch[2], line: i + 1, type: 'describe' });
          break;
        }
      }
      continue;
    }

    const itInline = line.match(/\bit\s*\(\s*(['"`])(.*?)\1/);
    if (itInline) {
      blocks.push({ name: itInline[2], line: i + 1, type: 'it' });
      continue;
    }

    const skipInline = line.match(/\btest\.skip\s*\(\s*true\b/);
    if (skipInline) {
      const parentTest = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      if (parentTest && parentTest.type === 'test' && !parentTest.skipped) {
        parentTest.skipped = true;
      }
      continue;
    }

    const itMultiline = line.match(/\bit\s*\(\s*$/);
    if (itMultiline) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nameMatch = lines[j].match(/\s*(['"`])(.*?)\1/);
        if (nameMatch) {
          blocks.push({ name: nameMatch[2], line: i + 1, type: 'it' });
          break;
        }
      }
    }
  }

  return blocks;
}

function getRelativePath(filePath: string, prefixPatterns: string[]): string {
  for (const pattern of prefixPatterns) {
    const prefix = pattern.split('*')[0].replace(/\/$/, '');
    if (filePath.startsWith(prefix)) {
      return filePath.slice(prefix.length + 1);
    }
  }
  return filePath;
}

export interface SyncResult {
  repoId: string;
  branch: string;
  totalFiles: number;
  docs: number;
  tests: number;
  matchedPairs: number;
  duration: number;
}

export type SyncProgressCallback = (info: { phase: string; repoName: string; current: number; total: number; message: string }) => void;

export const syncRepository = async (repo: Repository, branch?: string, onProgress?: SyncProgressCallback): Promise<SyncResult> => {
  const startTime = Date.now();
  const targetBranch = branch || (repo.branches as unknown as string[])[0] || 'main';
  const docPaths = repo.doc_paths as unknown as string[];
  const testPaths = repo.test_paths as unknown as string[];

  log.info({ repoId: repo.id, name: repo.name, branch: targetBranch }, 'Starting repo sync');

  let token = await getSetting(repo.global_token_key);
  if (!token) {
    const altKeys = [`${repo.provider}.token`, `${repo.provider}Token`];
    for (const key of altKeys) {
      if (key !== repo.global_token_key) {
        token = await getSetting(key);
        if (token) break;
      }
    }
  }
  if (!token) {
    const { AppDataSource } = await import('../db/data-source');
    const { decryptValue } = await import('../db/crypto');
    const rows = await AppDataSource.query(
      `SELECT encrypted_token FROM user_tokens WHERE provider = $1 AND is_valid = true LIMIT 1`,
      [repo.provider],
    );
    if (rows.length > 0) {
      token = decryptValue(rows[0].encrypted_token);
    }
  }
  if (!token) {
    throw new Error(`No ${repo.provider} access token found. Save one in Settings (key: ${repo.global_token_key}) or configure a personal ${repo.provider} token.`);
  }

  const repoName = repo.name;
  const progress = (phase: string, current: number, total: number, message: string) => {
    onProgress?.({ phase, repoName, current, total, message });
  };

  progress('connecting', 0, 0, `Connecting to ${repo.provider}...`);
  const provider = createGitProvider(repo.provider as 'gitlab' | 'github', repo.api_base_url, repo.project_id, token);

  progress('fetching-tree', 0, 0, `Fetching file tree from ${targetBranch}...`);
  const tree = await provider.fetchTree(targetBranch);

  const classified = tree.filter((e: GitTreeEntry) => e.type === 'blob').map(entry => ({
    ...entry,
    classification: classifyFile(entry.path, docPaths, testPaths),
  }));

  const definiteFiles = classified.filter(f => f.classification === 'doc' || f.classification === 'test');
  const maybeDocs = classified.filter(f => f.classification === 'maybe-doc');

  let confirmedDocPaths = new Set<string>();
  if (maybeDocs.length > 0) {
    progress('classifying', 0, maybeDocs.length, `AI classifying ${maybeDocs.length} markdown files...`);
    const snippets: Array<{ path: string; snippet: string }> = [];
    for (const md of maybeDocs) {
      try {
        const content = await provider.fetchFileContent(md.path, targetBranch);
        const raw = content.content;
        const titleMatch = raw.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const headings = (raw.match(/^#{2,3}\s+.+/gm) || []).slice(0, 6).map(h => h.replace(/^#+\s+/, ''));
        const hasTable = /\|\s*Step\s*\||\|\s*Action\s*\||\|\s*Expected/i.test(raw);
        const hasTestCases = /###\s+`?\d{3}/.test(raw);
        const hasRTM = /traceability|RTM/i.test(raw);
        const refsTestFiles = /\.(spec|test|cy|e2e)\.(ts|js)/i.test(raw);

        const summary = [
          `Title: ${title || '(none)'}`,
          `Headings: ${headings.join(', ') || '(none)'}`,
          hasTable ? 'Has step/action/expected tables' : '',
          hasTestCases ? 'Has numbered test cases (### 001)' : '',
          hasRTM ? 'Has Requirements Traceability Matrix' : '',
          refsTestFiles ? 'References test files (.spec.ts/.cy.ts)' : '',
        ].filter(Boolean).join(' | ');

        snippets.push({ path: md.path, snippet: summary });
      } catch {
        snippets.push({ path: md.path, snippet: '(could not read)' });
      }
    }
    confirmedDocPaths = await classifyMdFilesWithAI(snippets);
    progress('classifying', maybeDocs.length, maybeDocs.length, `AI classified: ${confirmedDocPaths.size} test docs out of ${maybeDocs.length} markdown files`);
  }

  const relevantFiles = [
    ...definiteFiles,
    ...maybeDocs.filter(f => confirmedDocPaths.has(f.path)).map(f => ({ ...f, classification: 'doc' as const })),
  ];

  progress('processing', 0, relevantFiles.length, `Found ${relevantFiles.length} files to process (${tree.length} total in repo)`);

  await clearRepoFiles(repo.id, targetBranch);

  const docFiles: Array<{ path: string; baseName: string; relPath: string; id?: string; testRefs?: string[]; signals?: DocSignals }> = [];
  const testFiles: Array<{ path: string; baseName: string; relPath: string; id?: string }> = [];

  let fileIndex = 0;
  for (const file of relevantFiles) {
    fileIndex++;
    if (fileIndex % 5 === 1 || fileIndex === relevantFiles.length) {
      progress('processing', fileIndex, relevantFiles.length, `Processing ${file.path.split('/').pop()} (${fileIndex}/${relevantFiles.length})`);
    }
    const fileType = (file as unknown as { classification: string }).classification as 'doc' | 'test';
    const fileName = file.path.split('/').pop() || file.path;

    let frontmatterData: Record<string, unknown> | null = null;
    let docContent = '';

    if (fileType === 'doc' && fileName.endsWith('.md')) {
      try {
        const content = await provider.fetchFileContent(file.path, targetBranch);
        docContent = content.content;
        const parsed = matter(docContent);
        if (Object.keys(parsed.data).length > 0) {
          frontmatterData = parsed.data;
        }
      } catch (err) {
        log.debug({ path: file.path, err }, 'Failed to parse frontmatter');
      }
    }

    if (fileType === 'test') {
      try {
        const content = await provider.fetchFileContent(file.path, targetBranch);
        const testBlocks = extractTestBlocks(content.content);
        if (testBlocks.length > 0) {
          frontmatterData = { testBlocks };
        }
      } catch (err) {
        log.debug({ path: file.path, err }, 'Failed to extract test blocks');
      }
    }

    const saved = await upsertRepoFile({
      repo_id: repo.id,
      branch: targetBranch,
      file_path: file.path,
      file_type: fileType,
      file_name: fileName,
      frontmatter: frontmatterData as unknown as string,
    });

    const baseName = getBaseName(file.path);
    const relPath = getRelativePath(file.path, fileType === 'doc' ? docPaths : testPaths);

    if (fileType === 'doc') {
      const testRefs = extractTestReferences(docContent);
      const signals = docContent ? extractDocSignals(docContent, file.path) : undefined;
      docFiles.push({ path: file.path, baseName, relPath: getBaseName(relPath), id: saved.id, testRefs, signals });
    } else if (fileType === 'test') {
      testFiles.push({ path: file.path, baseName, relPath: getBaseName(relPath), id: saved.id });
    }
  }

  progress('matching', 0, docFiles.length, `AI matching ${docFiles.length} docs to ${testFiles.length} tests...`);

  let matchedPairs = 0;

  try {
    const { getAIService } = await import('../ai');
    const ai = getAIService();

    if (ai.isEnabled() && docFiles.length > 0 && testFiles.length > 0) {
      const docList = docFiles.map((d, i) => {
        const s = d.signals;
        let entry = `D${i + 1}: ${d.path}`;
        if (s?.title) entry += `\n  Title: ${s.title}`;
        if (s?.featureArea) entry += `\n  Feature: ${s.featureArea}`;
        if (s?.testRefs && s.testRefs.length > 0) entry += `\n  References test files: ${s.testRefs.join(', ')}`;
        if (s?.rtmEntries && s.rtmEntries.length > 0) entry += `\n  RTM mappings: ${s.rtmEntries.slice(0, 5).join(' | ')}`;
        return entry;
      }).join('\n\n');
      const testList = testFiles.map((t, i) => `T${i + 1}: ${t.path}`).join('\n');

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

DOCUMENTATION FILES:
${docList}

TEST FILES:
${testList}

Return ONLY a JSON array. Each element: [docNumber, testNumber].
Example: [[1,3],[2,5]]
If no matches: []`;

      const response = await ai.chat(
        [{ role: 'user', content: prompt }],
        { json: true, maxTokens: 2000, cacheTtlMs: 24 * 60 * 60 * 1000 },
      );

      try {
        let cleaned = response.content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const matches = JSON.parse(cleaned) as number[][];
        const usedDocs = new Set<number>();
        const usedTests = new Set<number>();

        for (const [dIdx, tIdx] of matches) {
          if (usedDocs.has(dIdx) || usedTests.has(tIdx)) continue;
          const doc = docFiles[dIdx - 1];
          const test = testFiles[tIdx - 1];
          if (doc?.id && test?.id) {
            await updateFileCounterpart(doc.id, test.id);
            await updateFileCounterpart(test.id, doc.id);
            matchedPairs++;
            usedDocs.add(dIdx);
            usedTests.add(tIdx);
          }
        }
      } catch {
        log.debug('Failed to parse AI matching response');
      }
    }
  } catch (err) {
    log.debug({ err }, 'AI matching failed');
  }

  progress('matching', docFiles.length, docFiles.length, `Matched ${matchedPairs} doc-test pairs via AI`);

  const duration = Date.now() - startTime;
  progress('complete', relevantFiles.length, relevantFiles.length, `Sync complete: ${docFiles.length} docs, ${testFiles.length} tests, ${matchedPairs} matched (${Math.round(duration / 1000)}s)`);

  log.info({
    repoId: repo.id,
    branch: targetBranch,
    docs: docFiles.length,
    tests: testFiles.length,
    matchedPairs,
    duration,
  }, 'Repo sync complete');

  return {
    repoId: repo.id,
    branch: targetBranch,
    totalFiles: docFiles.length + testFiles.length,
    docs: docFiles.length,
    tests: testFiles.length,
    matchedPairs,
    duration,
  };
};

export const syncAllRepositories = async (onProgress?: SyncProgressCallback): Promise<SyncResult[]> => {
  const { getEnabledRepositories } = await import('../db/store');
  const repos = await getEnabledRepositories();
  const results: SyncResult[] = [];

  for (const repo of repos) {
    try {
      const branches = repo.branches as unknown as string[];
      for (const branch of branches) {
        const result = await syncRepository(repo, branch, onProgress);
        results.push(result);
      }
    } catch (err) {
      log.error({ err, repoId: repo.id, name: repo.name }, 'Failed to sync repository');
      onProgress?.({ phase: 'error', repoName: repo.name, current: 0, total: 0, message: `Failed to sync ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  }

  return results;
};

const STRIP_PREFIXES = new Set(['docs', 'playwright', 'doc', 'documentation', 'tests', 'cypress', 'e2e', 'test']);

function getLogicalPath(filePath: string): string[] {
  const parts = filePath.split('/');
  const fileName = parts.pop() || '';
  const baseName = fileName.replace(/\.(md|spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i, '');
  const segments = parts.filter(p => !STRIP_PREFIXES.has(p.toLowerCase()));
  if (segments.length > 0 && segments[segments.length - 1] === baseName) {
    return segments;
  }
  return [...segments, baseName];
}

type FileNode = Record<string, unknown>;
type FolderMap = Map<string, { files: FileNode[]; children: FolderMap }>;

function insertIntoTree(root: FolderMap, segments: string[], fileNode: FileNode): void {
  if (segments.length === 0) return;

  if (segments.length === 1) {
    const leaf = segments[0];
    if (!root.has(leaf)) root.set(leaf, { files: [], children: new Map() });
    root.get(leaf)!.files.push(fileNode);
    return;
  }

  const [head, ...rest] = segments;
  if (!root.has(head)) root.set(head, { files: [], children: new Map() });
  insertIntoTree(root.get(head)!.children, rest, fileNode);
}

function folderMapToNodes(map: FolderMap, parentPath: string): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];

  for (const [name, { files, children }] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const path = parentPath ? `${parentPath}/${name}` : name;
    const childNodes = folderMapToNodes(children, path);
    const allChildren = [...files, ...childNodes];

    const countFiles = (nodes: Array<Record<string, unknown>>): number => {
      let count = 0;
      for (const n of nodes) {
        if (n.type === 'doc' || n.type === 'test') count++;
        if (Array.isArray(n.children)) count += countFiles(n.children as Array<Record<string, unknown>>);
      }
      return count;
    };

    const countGaps = (nodes: Array<Record<string, unknown>>): number => {
      let count = 0;
      for (const n of nodes) {
        if ((n.type === 'doc' || n.type === 'test') && !n.hasCounterpart) count++;
        if (Array.isArray(n.children)) count += countGaps(n.children as Array<Record<string, unknown>>);
      }
      return count;
    };

    if (files.length === 0 && childNodes.length === 1 && (childNodes[0].type === 'folder')) {
      const merged = childNodes[0];
      result.push({
        ...merged,
        name: `${name} / ${merged.name}`,
      });
    } else if (allChildren.length > 0) {
      result.push({
        type: 'folder',
        name,
        path,
        children: allChildren,
        fileCount: countFiles(allChildren),
        gapCount: countGaps(allChildren),
      });
    }
  }

  return result;
}

export const buildTreeResponse = async (component?: string): Promise<Record<string, unknown>[]> => {
  const { getEnabledRepositories, getFilesByRepo, getActiveQuarantines } = await import('../db/store');

  const repos = component
    ? (await getEnabledRepositories()).filter(r => (r.components as unknown as string[]).includes(component))
    : await getEnabledRepositories();

  const quarantines = await getActiveQuarantines();
  const quarantineMap = new Map(quarantines.map(q => [q.test_name, q]));

  const tree: Record<string, unknown>[] = [];

  for (const repo of repos) {
    const branches = repo.branches as unknown as string[];
    const branch = branches[0] || 'main';
    const files = await getFilesByRepo(repo.id, branch);

    const fileIdToPath = new Map<string, string>();
    for (const file of files) fileIdToPath.set(file.id, file.file_path);

    const root: FolderMap = new Map();

    const counterpartDocPath = new Map<string, string>();
    for (const file of files) {
      if (file.file_type === 'test' && file.counterpart_id) {
        const docPath = fileIdToPath.get(file.counterpart_id);
        if (docPath) counterpartDocPath.set(file.id, docPath);
      }
    }

    for (const file of files) {
      const q = quarantineMap.get(file.rp_test_name || file.file_path);
      const counterpartPath = file.counterpart_id ? fileIdToPath.get(file.counterpart_id) : undefined;

      const fileNode: FileNode = {
        type: file.file_type,
        name: file.file_name,
        path: file.file_path,
        repoUrl: `${repo.url}/-/blob/${branch}/${file.file_path}`,
        repoId: repo.id,
        branch,
        hasCounterpart: !!file.counterpart_id,
        counterpartPath,
        frontmatter: file.frontmatter,
        quarantine: q ? { id: q.id, status: q.status, since: q.quarantined_at.toISOString(), jiraKey: q.jira_key } : undefined,
      };

      const pathForTree = file.file_type === 'test' && counterpartDocPath.has(file.id)
        ? counterpartDocPath.get(file.id)!
        : file.file_path;
      const segments = getLogicalPath(pathForTree);
      insertIntoTree(root, segments, fileNode);
    }

    const repoChildren = folderMapToNodes(root, '');

    const repoNode: Record<string, unknown> = {
      type: 'repo',
      name: repo.name,
      repoId: repo.id,
      branch,
      children: repoChildren,
      fileCount: files.length,
      gapCount: files.filter(f => !f.counterpart_id).length,
    };

    const components = repo.components as unknown as string[];
    for (const comp of components) {
      if (component && comp !== component) continue;
      let compNode = tree.find(n => (n as Record<string, unknown>).name === comp);
      if (!compNode) {
        compNode = { type: 'component', name: comp, children: [] };
        tree.push(compNode);
      }
      (compNode.children as Array<Record<string, unknown>>).push(repoNode);
    }
  }

  return tree;
};
