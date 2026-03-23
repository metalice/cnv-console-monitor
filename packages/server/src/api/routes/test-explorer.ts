import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getRepositoryById, getRepoFileStats } from '../../db/store';
import { logger } from '../../logger';

const log = logger.child({ module: 'TestExplorer' });
const router = Router();

router.get('/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const component = (req.query.component as string) || undefined;
    const { buildTreeResponse } = await import('../../services/RepoSyncService');
    const tree = await buildTreeResponse(component);
    res.json(tree);
  } catch (err) { next(err); }
});

router.get('/file/:repoId/{*filePath}', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repoId = req.params.repoId as string;
    const rawFilePath = req.params.filePath;
    const filePath = (Array.isArray(rawFilePath) ? rawFilePath.join('/') : rawFilePath || '') as string;
    const branch = (req.query.branch as string) || 'main';

    log.debug({ repoId, filePath, branch, rawParams: req.params }, 'File detail request');

    const { getFileByPath } = await import('../../db/store');
    const file = await getFileByPath(repoId, branch, filePath);
    if (!file) { res.status(404).json({ error: 'File not found', repoId, branch, filePath }); return; }

    const repo = await getRepositoryById(repoId);
    let content: string | null = null;
    if (repo) {
      try {
        const { getSetting } = await import('../../db/store');
        const token = await getSetting(repo.global_token_key);
        if (token) {
          const { createGitProvider } = await import('../../clients/git-provider');
          const provider = createGitProvider(repo.provider as 'gitlab' | 'github', repo.api_base_url, repo.project_id, token);
          const fileContent = await provider.fetchFileContent(filePath, branch);
          content = fileContent.content;
        }
      } catch {
        log.debug({ repoId, filePath }, 'Failed to fetch file content');
      }
    }

    let counterpartTestBlocks: Array<{ name: string; line: number; type: string }> | null = null;
    if (file.file_type === 'doc' && file.counterpart_id) {
      const { getFileByPath: getFile } = await import('../../db/store');
      const { AppDataSource } = await import('../../db/data-source');
      const counterpartRows = await AppDataSource.query(
        `SELECT frontmatter FROM repo_files WHERE id = $1`,
        [file.counterpart_id],
      );
      if (counterpartRows.length > 0) {
        const cfm = counterpartRows[0].frontmatter as Record<string, unknown> | null;
        if (cfm?.testBlocks) {
          counterpartTestBlocks = cfm.testBlocks as Array<{ name: string; line: number; type: string }>;
        }
      }
    }

    const testBlocks = (file.frontmatter as unknown as Record<string, unknown>)?.testBlocks as Array<{ name: string; line: number; type: string }> | undefined;

    let testCaseLinks: Array<{ caseId: string; caseTitle: string; testName: string; line: number }> | null = null;
    if (content && file.file_type === 'doc' && counterpartTestBlocks && counterpartTestBlocks.length > 0) {
      try {
        const caseHeadings: Array<{ id: string; title: string }> = [];
        const headingRegex = /###\s+`?(\d{3}[a-z]?)`?\s*[:：]\s*(.+)/gi;
        let hm;
        while ((hm = headingRegex.exec(content)) !== null) {
          caseHeadings.push({ id: hm[1], title: hm[2].trim() });
        }

        if (caseHeadings.length > 0) {
          const { getAIService } = await import('../../ai');
          const ai = getAIService();

          if (ai.isEnabled()) {
            const prompt = `Map each test case from the documentation to the matching test function in the test file.

Documentation test cases:
${caseHeadings.map(h => `- Case ${h.id}: "${h.title}"`).join('\n')}

Test functions in the spec file:
${counterpartTestBlocks.filter(b => b.type === 'test' || b.type === 'it').map(b => `- Line ${b.line}: "${b.name}"`).join('\n')}

Return a JSON array mapping each doc case to its test. Only include cases that have a clear match.
Output ONLY valid JSON, no markdown:
[{"caseId": "001", "caseTitle": "...", "testName": "...", "line": 18}]`;

            const response = await ai.chat(
              [{ role: 'user', content: prompt }],
              { json: true, maxTokens: 1000, cacheTtlMs: 24 * 60 * 60 * 1000 },
            );

            try {
              let cleaned = response.content.trim();
              cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
              testCaseLinks = JSON.parse(cleaned);
            } catch {
              log.debug('Failed to parse AI test case mapping response');
            }
          }
        }
      } catch (err) {
        log.debug({ err }, 'AI test case linking failed, falling back to regex');
      }
    }

    res.json({ ...file, content, testBlocks: testBlocks || null, counterpartTestBlocks, testCaseLinks });
  } catch (err) { next(err); }
});

router.get('/gaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const component = (req.query.component as string) || undefined;
    const { getEnabledRepositories, getOrphanedDocs, getUndocumentedTests } = await import('../../db/store');

    const repos = component
      ? (await getEnabledRepositories()).filter(r => (r.components as unknown as string[]).includes(component))
      : await getEnabledRepositories();

    const gaps: Array<Record<string, unknown>> = [];
    for (const repo of repos) {
      const branch = (repo.branches as unknown as string[])[0] || 'main';
      const [orphaned, undocumented] = await Promise.all([
        getOrphanedDocs(repo.id, branch),
        getUndocumentedTests(repo.id, branch),
      ]);

      for (const doc of orphaned) {
        gaps.push({ type: 'orphaned_doc', severity: 'warning', filePath: doc.file_path, repoName: repo.name, component: (repo.components as unknown as string[])[0] || '' });
      }
      for (const test of undocumented) {
        gaps.push({ type: 'undocumented_test', severity: 'info', filePath: test.file_path, repoName: repo.name, component: (repo.components as unknown as string[])[0] || '' });
      }
    }

    res.json({ gaps, total: gaps.length });
  } catch (err) { next(err); }
});

router.post('/sync/:repoId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = await getRepositoryById(req.params.repoId as string);
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    const { syncRepository } = await import('../../services/RepoSyncService');
    const branch = (req.query.branch as string) || undefined;
    const result = await syncRepository(repo, branch);

    res.json(result);
  } catch (err) { next(err); }
});

router.post('/sync', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { syncAllRepositories } = await import('../../services/RepoSyncService');
    const results = await syncAllRepositories();
    res.json({ results, total: results.length });
  } catch (err) { next(err); }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getEnabledRepositories } = await import('../../db/store');
    const component = (req.query.component as string) || undefined;
    const repos = component
      ? (await getEnabledRepositories()).filter(r => (r.components as unknown as string[]).includes(component))
      : await getEnabledRepositories();

    let totalDocs = 0, totalTests = 0, totalMatched = 0;
    for (const repo of repos) {
      const branch = (repo.branches as unknown as string[])[0] || 'main';
      const stats = await getRepoFileStats(repo.id, branch);
      totalDocs += stats.docs;
      totalTests += stats.tests;
      totalMatched += stats.matched;
    }

    const { getQuarantineStats } = await import('../../db/store');
    const quarantineStats = await getQuarantineStats();

    res.json({
      repositories: repos.length,
      docs: totalDocs,
      tests: totalTests,
      matched: totalMatched,
      docCoverage: totalTests > 0 ? Math.round((totalMatched / totalTests) * 100) : 0,
      testCoverage: totalDocs > 0 ? Math.round((totalMatched / totalDocs) * 100) : 0,
      quarantine: quarantineStats,
    });
  } catch (err) { next(err); }
});

export default router;
