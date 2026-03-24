import https from 'https';

import { type NextFunction, type Request, type Response, Router } from 'express';

import { CreateRepositorySchema, UpdateRepositorySchema } from '@cnv-monitor/shared';

import {
  createRepository,
  deleteRepository,
  getAllRepositories,
  getRepositoryById,
  updateRepository,
} from '../../db/store';
import { logger } from '../../logger';
import { requireAdmin } from '../middleware/auth';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const log = logger.child({ module: 'Repositories' });
const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const repos = await getAllRepositories();
    res.json(repos);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = await getRepositoryById(req.params.id as string);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    res.json(repo);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateRepositorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ details: parsed.error.issues, error: 'Validation failed' });
      return;
    }

    const inlineToken = (req.body as Record<string, unknown>).token as string | undefined;
    const tokenKey = parsed.data.globalTokenKey || `${parsed.data.provider}.token`;

    if (inlineToken) {
      const { setSetting } = await import('../../db/store');
      await setSetting(tokenKey, inlineToken, req.user?.email || 'system');
      log.info({ tokenKey }, 'Saved inline token to settings during repo creation');
    }

    const repo = await createRepository({
      api_base_url: parsed.data.apiBaseUrl,
      branches: parsed.data.branches as unknown as string,
      cache_ttl_min: parsed.data.cacheTtlMin ?? 5,
      components: parsed.data.components as unknown as string,
      doc_paths: parsed.data.docPaths as unknown as string,
      enabled: parsed.data.enabled ?? true,
      frontmatter_schema: (parsed.data.frontmatterSchema || null) as unknown as string,
      global_token_key: tokenKey,
      name: parsed.data.name,
      project_id: parsed.data.projectId,
      provider: parsed.data.provider,
      skip_annotations: (parsed.data.skipAnnotations || []) as unknown as string,
      test_paths: parsed.data.testPaths as unknown as string,
      url: parsed.data.url,
      webhook_secret: parsed.data.webhookSecret || null,
    });

    const { applySettingsOverrides } = await import('../../config');
    const { getAllSettings } = await import('../../db/store');
    const dbSettings = await getAllSettings();
    applySettingsOverrides(dbSettings);

    if (repo.enabled) {
      const { syncRepository } = await import('../../services/RepoSyncService');
      const { broadcast } = await import('../../ws');
      syncRepository(repo)
        .then(() => broadcast('data-updated'))
        .catch(err => log.error({ err, repoId: repo.id }, 'Auto-sync after repo creation failed'));
    }

    res.status(201).json(repo);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateRepositorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ details: parsed.error.issues, error: 'Validation failed' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }
    if (parsed.data.provider !== undefined) {
      updates.provider = parsed.data.provider;
    }
    if (parsed.data.url !== undefined) {
      updates.url = parsed.data.url;
    }
    if (parsed.data.apiBaseUrl !== undefined) {
      updates.api_base_url = parsed.data.apiBaseUrl;
    }
    if (parsed.data.projectId !== undefined) {
      updates.project_id = parsed.data.projectId;
    }
    if (parsed.data.branches !== undefined) {
      updates.branches = parsed.data.branches;
    }
    if (parsed.data.globalTokenKey !== undefined) {
      updates.global_token_key = parsed.data.globalTokenKey;
    }
    if (parsed.data.docPaths !== undefined) {
      updates.doc_paths = parsed.data.docPaths;
    }
    if (parsed.data.testPaths !== undefined) {
      updates.test_paths = parsed.data.testPaths;
    }
    if (parsed.data.frontmatterSchema !== undefined) {
      updates.frontmatter_schema = parsed.data.frontmatterSchema;
    }
    if (parsed.data.components !== undefined) {
      updates.components = parsed.data.components;
    }
    if (parsed.data.cacheTtlMin !== undefined) {
      updates.cache_ttl_min = parsed.data.cacheTtlMin;
    }
    if (parsed.data.webhookSecret !== undefined) {
      updates.webhook_secret = parsed.data.webhookSecret;
    }
    if (parsed.data.skipAnnotations !== undefined) {
      updates.skip_annotations = parsed.data.skipAnnotations;
    }
    if (parsed.data.enabled !== undefined) {
      updates.enabled = parsed.data.enabled;
    }

    const updated = await updateRepository(req.params.id as string, updates);
    if (!updated) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteRepository(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/test', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = await getRepositoryById(req.params.id as string);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    const { getSetting } = await import('../../db/store');
    const token = await getSetting(repo.global_token_key);
    if (!token) {
      res.status(400).json({ error: `Token not configured: ${repo.global_token_key}` });
      return;
    }

    const { createGitProvider } = await import('../../clients/git-provider');
    const provider = createGitProvider(
      repo.provider as 'gitlab' | 'github',
      repo.api_base_url,
      repo.project_id,
      token,
    );
    const branch = (repo.branches as unknown as string[])[0] || 'main';
    const tree = await provider.fetchTree(branch);

    res.json({ branch, fileCount: tree.length, success: true });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/resolve-project',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { apiBaseUrl, provider, repoUrl, token } = req.body as {
        repoUrl: string;
        apiBaseUrl: string;
        provider: string;
        token?: string;
      };
      if (!repoUrl || !apiBaseUrl || provider !== 'gitlab') {
        res.status(400).json({ error: 'repoUrl, apiBaseUrl, and provider=gitlab are required' });
        return;
      }

      const resolvedToken =
        token ||
        (await (async () => {
          const { getSetting } = await import('../../db/store');
          return getSetting('gitlab.token');
        })());

      if (!resolvedToken) {
        res
          .status(400)
          .json({ error: 'No GitLab token available. Configure gitlab.token in settings first.' });
        return;
      }

      let cleanUrl = repoUrl;
      const sepIdx = cleanUrl.indexOf('/-/');
      if (sepIdx !== -1) {
        cleanUrl = cleanUrl.slice(0, sepIdx);
      }
      const parsed = new URL(cleanUrl);
      const pathEncoded = encodeURIComponent(
        parsed.pathname.replace(/^\//, '').replace(/\.git$/, ''),
      );

      const axios = (await import('axios')).default;
      const apiRes = await axios.get(`${apiBaseUrl}/projects/${pathEncoded}`, {
        headers: { 'Private-Token': resolvedToken },
        httpsAgent,
        timeout: 10000,
      });

      const project = apiRes.data as {
        id: number;
        name: string;
        path_with_namespace: string;
        default_branch: string;
      };
      res.json({
        defaultBranch: project.default_branch || 'main',
        name: project.path_with_namespace,
        projectId: String(project.id),
      });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        res
          .status(404)
          .json({ error: 'Repository not found. Check the URL and ensure the token has access.' });
      } else {
        next(err);
      }
    }
  },
);

router.post(
  '/resolve-branches',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        apiBaseUrl,
        projectId,
        provider,
        token: bodyToken,
      } = req.body as { apiBaseUrl: string; projectId: string; provider: string; token?: string };
      if (!apiBaseUrl || !projectId || !provider) {
        res.status(400).json({ error: 'apiBaseUrl, projectId, and provider are required' });
        return;
      }

      const { getSetting } = await import('../../db/store');
      const token = bodyToken || (await getSetting(`${provider}.token`));
      if (!token) {
        res
          .status(400)
          .json({ error: `No ${provider} access token available. Provide one in the form below.` });
        return;
      }

      const axios = (await import('axios')).default;
      const branches: string[] = [];

      if (provider === 'gitlab') {
        const encodedId = encodeURIComponent(projectId);
        let page = 1;
        while (true) {
          const apiRes = await axios.get(
            `${apiBaseUrl}/projects/${encodedId}/repository/branches`,
            {
              headers: { 'Private-Token': token },
              httpsAgent,
              params: { page, per_page: 100 },
              timeout: 10000,
            },
          );
          const items = apiRes.data as { name: string }[];
          if (items.length === 0) {
            break;
          }
          branches.push(...items.map(b => b.name));
          if (items.length < 100) {
            break;
          }
          page++;
        }
      } else if (provider === 'github') {
        const [owner, repo] = projectId.split('/');
        let page = 1;
        while (true) {
          const apiRes = await axios.get(`${apiBaseUrl}/repos/${owner}/${repo}/branches`, {
            headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${token}` },
            params: { page, per_page: 100 },
            timeout: 10000,
          });
          const items = apiRes.data as { name: string }[];
          if (items.length === 0) {
            break;
          }
          branches.push(...items.map(b => b.name));
          if (items.length < 100) {
            break;
          }
          page++;
        }
      }

      res.json({ branches });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
