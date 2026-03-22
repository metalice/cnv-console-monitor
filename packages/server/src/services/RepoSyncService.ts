import matter from 'gray-matter';
import { logger } from '../logger';
import { createGitProvider, type GitTreeEntry } from '../clients/git-provider';
import { getSetting } from '../db/store';
import { getFilesByRepo, upsertRepoFile, updateFileCounterpart, clearRepoFiles } from '../db/store';
import { Repository } from '../db/entities/Repository';

const log = logger.child({ module: 'RepoSync' });

function matchGlob(filePath: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    .replace(/\./g, '\\.');
  return new RegExp(`^${regex}$`).test(filePath);
}

function matchesAnyGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => matchGlob(filePath, p));
}

function classifyFile(filePath: string, docPaths: string[], testPaths: string[]): 'doc' | 'test' | 'other' {
  if (matchesAnyGlob(filePath, docPaths)) return 'doc';
  if (matchesAnyGlob(filePath, testPaths)) return 'test';
  return 'other';
}

function getBaseName(filePath: string): string {
  const name = filePath.split('/').pop() || filePath;
  return name.replace(/\.(md|spec\.ts|spec\.js|test\.ts|test\.js|cy\.ts|cy\.js|e2e\.ts)$/i, '');
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

export const syncRepository = async (repo: Repository, branch?: string): Promise<SyncResult> => {
  const startTime = Date.now();
  const targetBranch = branch || (repo.branches as unknown as string[])[0] || 'main';
  const docPaths = repo.doc_paths as unknown as string[];
  const testPaths = repo.test_paths as unknown as string[];

  log.info({ repoId: repo.id, name: repo.name, branch: targetBranch }, 'Starting repo sync');

  const token = await getSetting(repo.global_token_key);
  if (!token) {
    throw new Error(`No token found for key: ${repo.global_token_key}`);
  }

  const provider = createGitProvider(repo.provider as 'gitlab' | 'github', repo.api_base_url, repo.project_id, token);
  const tree = await provider.fetchTree(targetBranch);

  const relevantFiles = tree.filter(
    (entry: GitTreeEntry) => entry.type === 'blob' && classifyFile(entry.path, docPaths, testPaths) !== 'other',
  );

  await clearRepoFiles(repo.id, targetBranch);

  const docFiles: Array<{ path: string; baseName: string; relPath: string; id?: string }> = [];
  const testFiles: Array<{ path: string; baseName: string; relPath: string; id?: string }> = [];

  for (const file of relevantFiles) {
    const fileType = classifyFile(file.path, docPaths, testPaths);
    const fileName = file.path.split('/').pop() || file.path;

    let frontmatterData: Record<string, unknown> | null = null;
    if (fileType === 'doc' && fileName.endsWith('.md')) {
      try {
        const content = await provider.fetchFileContent(file.path, targetBranch);
        const parsed = matter(content.content);
        if (Object.keys(parsed.data).length > 0) {
          frontmatterData = parsed.data;
        }
      } catch (err) {
        log.debug({ path: file.path, err }, 'Failed to parse frontmatter');
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
      docFiles.push({ path: file.path, baseName, relPath: getBaseName(relPath), id: saved.id });
    } else if (fileType === 'test') {
      testFiles.push({ path: file.path, baseName, relPath: getBaseName(relPath), id: saved.id });
    }
  }

  let matchedPairs = 0;
  const schema = repo.frontmatter_schema as Record<string, string> | null;
  const testFileField = schema?.testFileField || 'test_file';

  for (const doc of docFiles) {
    let matchedTest: typeof testFiles[0] | undefined;

    if (!matchedTest) {
      const docEntity = await (await import('../db/store')).getFileByPath(repo.id, targetBranch, doc.path);
      const fm = docEntity?.frontmatter as Record<string, unknown> | null;
      if (fm && fm[testFileField]) {
        matchedTest = testFiles.find(t => t.path === fm[testFileField] || t.path.endsWith(fm[testFileField] as string));
      }
    }

    if (!matchedTest) {
      matchedTest = testFiles.find(t => t.baseName === doc.baseName);
    }

    if (!matchedTest) {
      matchedTest = testFiles.find(t => t.relPath === doc.relPath && t.relPath !== doc.baseName);
    }

    if (matchedTest && doc.id && matchedTest.id) {
      await updateFileCounterpart(doc.id, matchedTest.id);
      await updateFileCounterpart(matchedTest.id, doc.id);
      matchedPairs++;
    }
  }

  const duration = Date.now() - startTime;
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

export const syncAllRepositories = async (): Promise<SyncResult[]> => {
  const { getEnabledRepositories } = await import('../db/store');
  const repos = await getEnabledRepositories();
  const results: SyncResult[] = [];

  for (const repo of repos) {
    try {
      const branches = repo.branches as unknown as string[];
      for (const branch of branches) {
        const result = await syncRepository(repo, branch);
        results.push(result);
      }
    } catch (err) {
      log.error({ err, repoId: repo.id, name: repo.name }, 'Failed to sync repository');
    }
  }

  return results;
};

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

    const folders = new Map<string, Array<Record<string, unknown>>>();

    for (const file of files) {
      const dir = file.file_path.split('/').slice(0, -1).join('/') || '/';
      if (!folders.has(dir)) folders.set(dir, []);

      const q = quarantineMap.get(file.rp_test_name || file.file_path);

      folders.get(dir)!.push({
        type: file.file_type,
        name: file.file_name,
        path: file.file_path,
        repoUrl: `${repo.url}/-/blob/${branch}/${file.file_path}`,
        repoId: repo.id,
        branch,
        hasCounterpart: !!file.counterpart_id,
        frontmatter: file.frontmatter,
        quarantine: q ? { id: q.id, status: q.status, since: q.quarantined_at.toISOString(), jiraKey: q.jira_key } : undefined,
      });
    }

    const repoNode: Record<string, unknown> = {
      type: 'repo',
      name: repo.name,
      repoId: repo.id,
      branch,
      children: Array.from(folders.entries()).map(([dir, children]) => ({
        type: 'folder',
        name: dir,
        path: dir,
        children,
        fileCount: children.length,
        gapCount: children.filter((c: Record<string, unknown>) => !c.hasCounterpart).length,
      })),
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
