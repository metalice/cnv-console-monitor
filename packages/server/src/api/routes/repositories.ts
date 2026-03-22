import { Router, Request, Response, NextFunction } from 'express';
import { CreateRepositorySchema, UpdateRepositorySchema } from '@cnv-monitor/shared';
import { getAllRepositories, getRepositoryById, createRepository, updateRepository, deleteRepository } from '../../db/store';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';

const log = logger.child({ module: 'Repositories' });
const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const repos = await getAllRepositories();
    res.json(repos);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = await getRepositoryById(req.params.id as string);
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }
    res.json(repo);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateRepositorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.issues }); return; }

    const repo = await createRepository({
      name: parsed.data.name,
      provider: parsed.data.provider,
      url: parsed.data.url,
      api_base_url: parsed.data.apiBaseUrl,
      project_id: parsed.data.projectId,
      branches: parsed.data.branches as unknown as string,
      global_token_key: parsed.data.globalTokenKey,
      doc_paths: parsed.data.docPaths as unknown as string,
      test_paths: parsed.data.testPaths as unknown as string,
      frontmatter_schema: (parsed.data.frontmatterSchema || null) as unknown as string,
      components: parsed.data.components as unknown as string,
      cache_ttl_min: parsed.data.cacheTtlMin ?? 5,
      webhook_secret: parsed.data.webhookSecret || null,
      skip_annotations: (parsed.data.skipAnnotations || []) as unknown as string,
      enabled: parsed.data.enabled ?? true,
    });
    res.status(201).json(repo);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateRepositorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.issues }); return; }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.provider !== undefined) updates.provider = parsed.data.provider;
    if (parsed.data.url !== undefined) updates.url = parsed.data.url;
    if (parsed.data.apiBaseUrl !== undefined) updates.api_base_url = parsed.data.apiBaseUrl;
    if (parsed.data.projectId !== undefined) updates.project_id = parsed.data.projectId;
    if (parsed.data.branches !== undefined) updates.branches = parsed.data.branches;
    if (parsed.data.globalTokenKey !== undefined) updates.global_token_key = parsed.data.globalTokenKey;
    if (parsed.data.docPaths !== undefined) updates.doc_paths = parsed.data.docPaths;
    if (parsed.data.testPaths !== undefined) updates.test_paths = parsed.data.testPaths;
    if (parsed.data.frontmatterSchema !== undefined) updates.frontmatter_schema = parsed.data.frontmatterSchema;
    if (parsed.data.components !== undefined) updates.components = parsed.data.components;
    if (parsed.data.cacheTtlMin !== undefined) updates.cache_ttl_min = parsed.data.cacheTtlMin;
    if (parsed.data.webhookSecret !== undefined) updates.webhook_secret = parsed.data.webhookSecret;
    if (parsed.data.skipAnnotations !== undefined) updates.skip_annotations = parsed.data.skipAnnotations;
    if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;

    const updated = await updateRepository(req.params.id as string, updates);
    if (!updated) { res.status(404).json({ error: 'Repository not found' }); return; }
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteRepository(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: 'Repository not found' }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/test', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = await getRepositoryById(req.params.id as string);
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    const { getSetting } = await import('../../db/store');
    const token = await getSetting(repo.global_token_key);
    if (!token) { res.status(400).json({ error: `Token not configured: ${repo.global_token_key}` }); return; }

    const { createGitProvider } = await import('../../clients/git-provider');
    const provider = createGitProvider(repo.provider as 'gitlab' | 'github', repo.api_base_url, repo.project_id, token);
    const branch = (repo.branches as unknown as string[])[0] || 'main';
    const tree = await provider.fetchTree(branch);

    res.json({ success: true, branch, fileCount: tree.length });
  } catch (err) { next(err); }
});

export default router;
