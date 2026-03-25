import { type GitProvider, type GitTreeEntry } from '../clients/git-provider';
import { type Repository } from '../db/entities/Repository';
import { logger } from '../logger';

import { initRepoContexts, runWithConcurrency } from './docGenHelpers';

const log = logger.child({ module: 'DocGeneration' });

type TemplateResult = {
  source: 'repo' | 'default';
  path?: string;
  content?: string;
};

type TestBlock = {
  name: string;
  line: number;
  type: string;
};

export type GenerateInput = {
  repoId: string;
  filePath: string;
  branch: string;
  userEmail: string;
};

type GenerateResult = {
  generated: { filePath: string; draftId: string; docPath: string }[];
  failed: { filePath: string; error: string }[];
  templateSource: { source: string; path?: string };
};

type ProgressInfo = {
  phase: string;
  current: number;
  total: number;
  message: string;
};

type RunPromptFn = (
  name: string,
  vars: Record<string, unknown>,
  opts?: Record<string, unknown>,
) => Promise<{ content: string }>;

type ChatFn = (
  msgs: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts?: Record<string, unknown>,
) => Promise<{ content: string }>;

export type RepoContext = {
  repo: Repository;
  provider: GitProvider;
  tree: GitTreeEntry[];
};

const TEMPLATE_PATTERN = /template/i;
const STD_PATTERN = /std|test-doc/i;
const CONCURRENCY_LIMIT = 5;

const templateCache = new Map<string, TemplateResult>();

const cacheResult = (cacheKey: string | undefined, result: TemplateResult): void => {
  if (cacheKey) {
    templateCache.set(cacheKey, result);
  }
};

export const discoverStdTemplate = async (
  provider: GitProvider,
  tree: GitTreeEntry[],
  branch: string,
  cacheKey?: string,
): Promise<TemplateResult> => {
  const cached = cacheKey ? templateCache.get(cacheKey) : undefined;
  if (cached) {
    return cached;
  }

  const blobs = tree.filter(entry => entry.type === 'blob');

  const candidate = blobs.find(entry => {
    const fileName = entry.path.split('/').pop()?.toLowerCase() ?? '';
    if (TEMPLATE_PATTERN.test(fileName) && STD_PATTERN.test(fileName)) {
      return true;
    }
    const parts = entry.path.toLowerCase().split('/');
    const inTemplatesDir = parts.some(part => part === 'templates');
    return inTemplatesDir && fileName.endsWith('.md');
  });

  if (!candidate) {
    const result: TemplateResult = { source: 'default' };
    cacheResult(cacheKey, result);
    return result;
  }

  try {
    const file = await provider.fetchFileContent(candidate.path, branch);
    const result: TemplateResult = {
      content: file.content,
      path: candidate.path,
      source: 'repo',
    };
    cacheResult(cacheKey, result);
    return result;
  } catch (err) {
    log.warn({ err, path: candidate.path }, 'Failed to fetch template file');
    const result: TemplateResult = { source: 'default' };
    cacheResult(cacheKey, result);
    return result;
  }
};

const inferDocPath = (
  testPath: string,
  existingDocPaths: string[],
  repoDocGlobs: string[],
): string => {
  const testFileName = testPath.split('/').pop() ?? testPath;
  const baseName = testFileName.replace(
    /\.(?:spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i,
    '',
  );

  let docRoot = 'docs';

  if (repoDocGlobs.length > 0) {
    const firstGlob = repoDocGlobs[0];
    const prefix = firstGlob.split('*')[0].replace(/\/$/, '');
    if (prefix) {
      docRoot = prefix;
    }
  } else if (existingDocPaths.length > 0) {
    const prefixCounts = new Map<string, number>();
    for (const docPath of existingDocPaths) {
      const parts = docPath.split('/');
      if (parts.length > 1) {
        const prefix = parts[0];
        prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
      }
    }
    let maxCount = 0;
    for (const [prefix, count] of prefixCounts) {
      if (count > maxCount) {
        maxCount = count;
        docRoot = prefix;
      }
    }
  }

  const testParts = testPath.split('/');
  const STRIP_DIRS = new Set([
    'cypress',
    'e2e',
    'tests',
    'test',
    'playwright',
    'specs',
    'src',
    '__tests__',
  ]);
  const midSegments = testParts.slice(0, -1).filter(part => !STRIP_DIRS.has(part.toLowerCase()));

  return `${docRoot}/${[...midSegments, `${baseName}.md`].join('/')}`;
};

type GenerateStdParams = {
  ai: { runPrompt: RunPromptFn };
  testContent: string;
  testBlocks: TestBlock[];
  testFilePath: string;
  docFilePath: string;
  template?: string;
};

const generateStdDoc = async (params: GenerateStdParams): Promise<string> => {
  const { ai, docFilePath, template, testBlocks, testContent, testFilePath } = params;
  const response = await ai.runPrompt(
    'generate-std',
    { docFilePath, template, testBlocks, testContent, testFilePath },
    { maxTokens: 8192, useCache: false },
  );
  return response.content;
};

export const generateDocsForTests = async (
  tests: GenerateInput[],
  onProgress: (info: ProgressInfo) => void,
): Promise<GenerateResult> => {
  const generated: GenerateResult['generated'] = [];
  const failed: GenerateResult['failed'] = [];

  const { getAIService } = await import('../ai');
  const ai = getAIService();
  if (!ai.isEnabled()) {
    throw new Error('AI service is not enabled');
  }

  const repoGroups = new Map<string, GenerateInput[]>();
  for (const test of tests) {
    const key = `${test.repoId}:${test.branch}`;
    const existing = repoGroups.get(key) ?? [];
    existing.push(test);
    repoGroups.set(key, existing);
  }

  onProgress({
    current: 0,
    message: 'Initializing repositories...',
    phase: 'init',
    total: tests.length,
  });

  const repoCache = await initRepoContexts(repoGroups, failed);

  const validTests = tests.filter(entry => repoCache.has(`${entry.repoId}:${entry.branch}`));
  onProgress({
    current: 0,
    message: `Generating docs for ${validTests.length} test files...`,
    phase: 'generating',
    total: validTests.length,
  });

  let completed = 0;

  const tasks = validTests.map(test => async () => {
    const key = `${test.repoId}:${test.branch}`;
    const ctx = repoCache.get(key);
    if (!ctx) {
      throw new Error(`Missing repo context for ${key}`);
    }
    const { provider, repo } = ctx;

    const fileContent = await provider.fetchFileContent(test.filePath, test.branch);
    const { getFileByPath } = await import('../db/store/repoFiles');
    const dbFile = await getFileByPath(test.repoId, test.branch, test.filePath);
    const frontmatter = dbFile?.frontmatter as unknown as Record<string, unknown> | null;
    const testBlocks = (frontmatter?.testBlocks ?? []) as TestBlock[];

    const docPaths = repo.doc_paths as unknown as string[];
    const existingDocs = ctx.tree
      .filter(entry => entry.type === 'blob' && entry.path.endsWith('.md'))
      .map(entry => entry.path);
    const docPath = inferDocPath(test.filePath, existingDocs, docPaths);

    const tmplResult = templateCache.get(`${test.repoId}:${test.branch}`);
    const template = tmplResult?.content;

    const markdown = await generateStdDoc({
      ai,
      docFilePath: docPath,
      template,
      testBlocks,
      testContent: fileContent.content,
      testFilePath: test.filePath,
    });

    const { saveDraft } = await import('../db/store/fileDrafts');
    const draft = await saveDraft({
      baseCommitSha: fileContent.sha,
      branch: test.branch,
      draftContent: markdown,
      filePath: docPath,
      originalContent: '',
      repoId: test.repoId,
      userEmail: test.userEmail,
    });

    completed++;
    onProgress({
      current: completed,
      message: `Generated ${docPath}`,
      phase: 'generating',
      total: validTests.length,
    });

    return { docPath, draftId: draft.id, filePath: test.filePath };
  });

  const settled = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

  for (let idx = 0; idx < settled.length; idx++) {
    const result = settled[idx];
    if (result.status === 'fulfilled') {
      generated.push(result.value);
    } else {
      const testEntry = validTests[idx];
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failed.push({ error: reason, filePath: testEntry.filePath });
      log.warn({ error: reason, filePath: testEntry.filePath }, 'Doc generation failed for file');
    }
  }

  onProgress({
    current: tests.length,
    message: `Complete: ${generated.length} generated, ${failed.length} failed`,
    phase: 'complete',
    total: tests.length,
  });

  const lastKey = [...repoGroups.keys()].pop();
  const lastTemplate = lastKey ? templateCache.get(lastKey) : undefined;
  const templateSource: GenerateResult['templateSource'] = {
    path: lastTemplate?.path,
    source: lastTemplate?.source ?? 'default',
  };

  return { failed, generated, templateSource };
};

export const improveDoc = async (
  ai: { chat: ChatFn },
  currentContent: string,
  instructions: string,
  testContent?: string,
): Promise<string> => {
  const messages: { role: 'system' | 'user'; content: string }[] = [
    {
      content:
        'You are a QE documentation specialist for CNV (OpenShift Virtualization). You improve STD (Software Test Description) documents based on user instructions. Output ONLY the improved markdown, no explanations or code fences.',
      role: 'system',
    },
    {
      content: [
        '## Current Document\n',
        currentContent,
        testContent ? `\n\n## Original Test File\n\n\`\`\`\n${testContent}\n\`\`\`` : '',
        `\n\n## Instructions\n\n${instructions}`,
      ].join(''),
      role: 'user',
    },
  ];

  const response = await ai.chat(messages, { maxTokens: 8192, useCache: false });
  return response.content;
};
