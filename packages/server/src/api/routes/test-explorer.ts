import { type NextFunction, type Request, type Response, Router } from 'express';

import { getRepoFileStats, getRepositoryById } from '../../db/store';
import { logger } from '../../logger';
import { requireAdmin } from '../middleware/auth';

const log = logger.child({ module: 'TestExplorer' });
const router = Router();

router.get('/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const component = (req.query.component as string) || undefined;
    const { buildTreeResponse } = await import('../../services/RepoSyncService');
    const tree = await buildTreeResponse(component);
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

router.get('/file/:repoId/{*filePath}', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repoId = req.params.repoId as string;
    const rawFilePath = req.params.filePath;
    const filePath = Array.isArray(rawFilePath) ? rawFilePath.join('/') : rawFilePath || '';
    const branch = (req.query.branch as string) || 'main';

    log.debug({ branch, filePath, rawParams: req.params, repoId }, 'File detail request');

    const { getFileByPath } = await import('../../db/store');
    const file = await getFileByPath(repoId, branch, filePath);
    if (!file) {
      res.status(404).json({ branch, error: 'File not found', filePath, repoId });
      return;
    }

    const repo = await getRepositoryById(repoId);
    let content: string | null = null;
    let contentError: string | null = null;
    let baseCommitSha: string | null = null;
    if (repo) {
      try {
        const { getSetting } = await import('../../db/store');
        let token = await getSetting(repo.global_token_key);
        if (!token) {
          const altKeys = [`${repo.provider}.token`, `${repo.provider}Token`];
          for (const key of altKeys) {
            if (key !== repo.global_token_key) {
              token = await getSetting(key);
              if (token) {
                break;
              }
            }
          }
        }
        if (!token) {
          const { AppDataSource } = await import('../../db/data-source');
          const { decryptValue } = await import('../../db/crypto');
          const rows = await AppDataSource.query(
            `SELECT encrypted_token FROM user_tokens WHERE provider = $1 AND is_valid = true LIMIT 1`,
            [repo.provider],
          );
          if (rows.length > 0) {
            token = decryptValue(rows[0].encrypted_token);
          }
        }
        if (!token) {
          contentError = `No ${repo.provider} access token configured. Add one in Settings > Integrations > Git.`;
        } else {
          const { createGitProvider } = await import('../../clients/git-provider');
          const provider = createGitProvider(
            repo.provider as 'gitlab' | 'github',
            repo.api_base_url,
            repo.project_id,
            token,
          );
          const fileContent = await provider.fetchFileContent(filePath, branch);
          content = fileContent.content;
          baseCommitSha = fileContent.sha;
        }
      } catch (err) {
        const axErr = err as { response?: { status?: number }; message?: string };
        const status = axErr.response?.status;
        if (status === 401) {
          contentError =
            'Access token is invalid or expired. Update it in Settings > Integrations > Git.';
        } else if (status === 403) {
          contentError = 'Access token lacks permission to read this file.';
        } else if (status === 404) {
          contentError = 'File not found in the repository. It may have been deleted or moved.';
        } else {
          contentError = axErr.message || 'Failed to fetch file content from the repository.';
        }
        log.debug({ err: axErr.message, filePath, repoId, status }, 'Failed to fetch file content');
      }
    }

    let counterpartTestBlocks: { name: string; line: number; type: string }[] | null = null;
    if (file.file_type === 'doc' && file.counterpart_id) {
      const { AppDataSource } = await import('../../db/data-source');
      const counterpartRows = await AppDataSource.query(
        `SELECT frontmatter FROM repo_files WHERE id = $1`,
        [file.counterpart_id],
      );
      if (counterpartRows.length > 0) {
        const cfm = counterpartRows[0].frontmatter as Record<string, unknown> | null;
        if (cfm?.testBlocks) {
          counterpartTestBlocks = cfm.testBlocks as { name: string; line: number; type: string }[];
        }
      }
    }

    const testBlocks = (file.frontmatter as unknown as Record<string, unknown>)?.testBlocks as
      | { name: string; line: number; type: string }[]
      | undefined;

    let testCaseLinks:
      | { caseId: string; caseTitle: string; testName: string; line: number }[]
      | null = null;
    if (
      content &&
      file.file_type === 'doc' &&
      counterpartTestBlocks &&
      counterpartTestBlocks.length > 0
    ) {
      try {
        const { getAIService } = await import('../../ai');
        const ai = getAIService();

        if (ai.isEnabled()) {
          const docSummary =
            content.length > 6000 ? `${content.substring(0, 6000)}\n...(truncated)` : content;
          const testList = counterpartTestBlocks
            .filter(b => b.type === 'test' || b.type === 'it')
            .map(b => `Line ${b.line}: ${b.name}`)
            .join('\n');

          const prompt = `You are mapping test documentation to actual test code. The documentation is a Software Test Description (STD) with numbered test cases (### 001, ### 002, etc.) and a Requirements Traceability Matrix table.

DOCUMENTATION CONTENT:
${docSummary}

TEST FUNCTIONS (from the spec file):
${testList}

TASK: For EVERY test case heading (### 001, ### 002, ### 003, etc.) in the documentation, find the best matching test function from the list above. Use these matching strategies:
1. The Requirements Traceability Matrix table explicitly maps cases to test names in quotes
2. Test names may contain ID(CNV-xxxxx) prefixes that match Jira IDs in the doc
3. The test case title describes the same action/feature as the test function name
4. Even partial matches count -- "Filter volume by OS" matches "Filter bootable volumes by Cluster" if they test the same feature area

Return a JSON array with ALL possible mappings. Include the case even if confidence is low.
Output ONLY valid JSON, no markdown fences:
[{"caseId":"001","caseTitle":"short title","testName":"exact test name from list","line":18}]`;

          const response = await ai.chat([{ content: prompt, role: 'user' }], {
            cacheTtlMs: 24 * 60 * 60 * 1000,
            json: true,
            maxTokens: 2000,
          });

          try {
            let cleaned = response.content.trim();
            cleaned = cleaned
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\n?```\s*$/, '')
              .trim();
            testCaseLinks = JSON.parse(cleaned);
          } catch {
            log.debug('Failed to parse AI test case mapping response');
          }
        }
      } catch (err) {
        log.debug({ err }, 'AI test case linking failed');
      }
    }

    res.json({
      // eslint-disable-next-line @typescript-eslint/no-misused-spread -- TypeORM entity spread is safe here for JSON serialization
      ...file,
      baseCommitSha,
      content,
      contentError,
      counterpartTestBlocks,
      testBlocks: testBlocks || null,
      testCaseLinks,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/gaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const component = (req.query.component as string) || undefined;
    const { getEnabledRepositories, getOrphanedDocs, getUndocumentedTests } =
      await import('../../db/store');

    const repos = component
      ? (await getEnabledRepositories()).filter(r =>
          (r.components as unknown as string[]).includes(component),
        )
      : await getEnabledRepositories();

    const gaps: Record<string, unknown>[] = [];
    for (const repo of repos) {
      const branch = (repo.branches as unknown as string[])[0] || 'main';
      const [orphaned, undocumented] = await Promise.all([
        getOrphanedDocs(repo.id, branch),
        getUndocumentedTests(repo.id, branch),
      ]);

      for (const doc of orphaned) {
        gaps.push({
          component: (repo.components as unknown as string[])[0] || '',
          filePath: doc.file_path,
          repoName: repo.name,
          severity: 'warning',
          type: 'orphaned_doc',
        });
      }
      for (const test of undocumented) {
        gaps.push({
          component: (repo.components as unknown as string[])[0] || '',
          filePath: test.file_path,
          repoName: repo.name,
          severity: 'info',
          type: 'undocumented_test',
        });
      }
    }

    res.json({ gaps, total: gaps.length });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sync/:repoId',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = await getRepositoryById(req.params.repoId as string);
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      res.json({ message: 'Sync started in background', success: true });

      const { syncRepository } = await import('../../services/RepoSyncService');
      const { broadcast } = await import('../../ws');
      const branch = (req.query.branch as string) || undefined;
      const onProgress = (info: Record<string, unknown>) => broadcast('sync-progress', info);
      syncRepository(repo, branch, onProgress)
        .then(() => broadcast('data-updated'))
        .catch(err => log.error({ err, repoId: repo.id }, 'Background sync failed'));
    } catch (err) {
      next(err);
    }
  },
);

router.post('/sync', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { getEnabledRepositories } = await import('../../db/store');
    const repos = await getEnabledRepositories();

    if (repos.length === 0) {
      res.json({ errors: ['No repositories configured.'], results: [], total: 0 });
      return;
    }

    res.json({
      message: `Syncing ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'} in background...`,
      success: true,
    });

    const { syncAllRepositories } = await import('../../services/RepoSyncService');
    const { broadcast } = await import('../../ws');
    const onProgress = (info: Record<string, unknown>) => broadcast('sync-progress', info);
    syncAllRepositories(onProgress)
      .then(results => {
        log.info({ count: results.length }, 'Background sync complete');
        broadcast('data-updated');
        return undefined;
      })
      .catch(err => log.error({ err }, 'Background sync-all failed'));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getEnabledRepositories } = await import('../../db/store');
    const component = (req.query.component as string) || undefined;
    const repos = component
      ? (await getEnabledRepositories()).filter(r =>
          (r.components as unknown as string[]).includes(component),
        )
      : await getEnabledRepositories();

    let totalDocs = 0,
      totalMatched = 0,
      totalTests = 0;
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
      docCoverage: totalTests > 0 ? Math.round((totalMatched / totalTests) * 100) : 0,
      docs: totalDocs,
      matched: totalMatched,
      quarantine: quarantineStats,
      repositories: repos.length,
      testCoverage: totalDocs > 0 ? Math.round((totalMatched / totalDocs) * 100) : 0,
      tests: totalTests,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/drafts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { getUserDrafts } = await import('../../db/store');
    const items = await getUserDrafts(email);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/draft-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.json({ count: 0 });
      return;
    }
    const { getUserDraftCount } = await import('../../db/store');
    const count = await getUserDraftCount(email);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.get('/draft-paths', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.json([]);
      return;
    }
    const { getUserDraftPaths } = await import('../../db/store');
    const paths = await getUserDraftPaths(email);
    res.json(paths);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/draft/:repoId/{*filePath}',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.user?.email;
      if (!email) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const repoId = req.params.repoId as string;
      const rawPath = req.params.filePath;
      const filePath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath || '';
      const branch = (req.body.branch || 'main') as string;
      const { baseCommitSha, draftContent, originalContent } = req.body as {
        originalContent: string;
        draftContent: string;
        baseCommitSha: string;
      };

      if (!draftContent || !baseCommitSha) {
        res.status(400).json({ error: 'draftContent and baseCommitSha are required' });
        return;
      }

      if (draftContent.length > 1_000_000) {
        res.status(400).json({ error: 'Draft content exceeds 1MB limit' });
        return;
      }

      const { logEditActivity, saveDraft } = await import('../../db/store');
      const draft = await saveDraft({
        baseCommitSha,
        branch,
        draftContent,
        filePath,
        originalContent: originalContent || '',
        repoId,
        userEmail: email,
      });
      logEditActivity({
        action: 'draft_saved',
        actor: email,
        details: { draftId: draft.id },
        filePath,
        repoId,
      }).catch(() => {
        // no-op
      });
      res.json({ id: draft.id, status: draft.status, updatedAt: draft.updated_at });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/draft/:repoId/{*filePath}',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.user?.email;
      if (!email) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const repoId = req.params.repoId as string;
      const rawPath = req.params.filePath;
      const filePath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath || '';
      const branch = (req.query.branch as string) || 'main';

      const { deleteDraftByPath, logEditActivity } = await import('../../db/store');
      const deleted = await deleteDraftByPath(email, repoId, branch, filePath);
      if (deleted) {
        logEditActivity({ action: 'draft_discarded', actor: email, filePath, repoId }).catch(() => {
          // no-op
        });
      }
      res.json({ success: deleted });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/submit-drafts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { draftIds, prDescription, prTitle } = req.body as {
      draftIds: string[];
      prTitle: string;
      prDescription?: string;
    };
    if (!draftIds || draftIds.length === 0 || !prTitle) {
      res.status(400).json({ error: 'draftIds and prTitle are required' });
      return;
    }

    const {
      deleteDraftsById,
      getRepositoryById: fetchRepoById,
      getUserDrafts,
      markDraftsPending,
      markDraftsSubmitting,
    } = await import('../../db/store');
    const allDrafts = await getUserDrafts(email);
    const selectedDrafts = allDrafts.filter(d => draftIds.includes(d.id));

    if (selectedDrafts.length === 0) {
      res.status(400).json({ error: 'No valid drafts found' });
      return;
    }

    const repoId = selectedDrafts[0].repo_id;
    const { branch } = selectedDrafts[0];
    const repo = await fetchRepoById(repoId);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    const providerType = repo.provider as 'gitlab' | 'github';
    const { getDecryptedToken } = await import('../../db/store');
    let token = await (await import('../../db/store')).getSetting(repo.global_token_key);
    if (!token) {
      const altKeys = [`${providerType}.token`];
      for (const key of altKeys) {
        token = await (await import('../../db/store')).getSetting(key);
        if (token) {
          break;
        }
      }
    }
    if (!token) {
      const personalToken = await getDecryptedToken(email, providerType);
      if (personalToken) {
        token = personalToken;
      }
    }
    if (!token) {
      res.status(400).json({ error: `No ${providerType} access token available` });
      return;
    }

    await markDraftsSubmitting(email, draftIds);

    try {
      const { createGitProvider } = await import('../../clients/git-provider');
      const provider = createGitProvider(providerType, repo.api_base_url, repo.project_id, token);

      const branchName = `docs/${prTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50)}-${Date.now().toString(36)}`;
      await provider.createBranch(branchName, branch);

      for (const draft of selectedDrafts) {
        await provider.commitFile(
          branchName,
          draft.file_path,
          draft.draft_content,
          `docs: update ${draft.file_path.split('/').pop()}`,
        );
      }

      const pr = await provider.createPR({
        description:
          prDescription ||
          `Documentation updates by ${email}\n\nFiles changed:\n${selectedDrafts.map(d => `- ${d.file_path}`).join('\n')}`,
        sourceBranch: branchName,
        targetBranch: branch,
        title: prTitle,
      });

      await deleteDraftsById(email, draftIds);

      const { logEditActivity } = await import('../../db/store');
      for (const draft of selectedDrafts) {
        logEditActivity({
          action: 'pr_submitted',
          actor: email,
          details: { prNumber: pr.number, prUrl: pr.url },
          filePath: draft.file_path,
          repoId,
        }).catch(() => {
          // no-op
        });
      }

      res.json({
        filesCommitted: selectedDrafts.length,
        prNumber: pr.number,
        prUrl: pr.url,
        success: true,
      });
    } catch (err) {
      await markDraftsPending(email, draftIds);
      const msg = err instanceof Error ? err.message : 'PR creation failed';
      log.error({ email, err }, 'Submit drafts failed');
      res.status(502).json({ error: msg });
    }
  } catch (err) {
    next(err);
  }
});

router.get('/edit-activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getEditActivities } = await import('../../db/store');
    const actor = (req.query.actor as string) || undefined;
    const action = (req.query.action as string) || undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await getEditActivities({ action, actor, limit, offset });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
