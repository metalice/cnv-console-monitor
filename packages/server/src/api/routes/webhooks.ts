import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../../logger';

const log = logger.child({ module: 'Webhooks' });
const router = Router();

router.post('/git-push', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gitlabToken = req.headers['x-gitlab-token'] as string | undefined;
    const githubSignature = req.headers['x-hub-signature-256'] as string | undefined;

    const { getAllRepositories } = await import('../../db/store');
    const repos = await getAllRepositories();

    let matchedRepo = null;

    if (gitlabToken) {
      matchedRepo = repos.find(r => r.provider === 'gitlab' && r.webhook_secret === gitlabToken);
    } else if (githubSignature) {
      const body = JSON.stringify(req.body);
      matchedRepo = repos.find(r => {
        if (r.provider !== 'github' || !r.webhook_secret) return false;
        const expected = 'sha256=' + crypto.createHmac('sha256', r.webhook_secret).update(body).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(githubSignature));
      });
    }

    if (!matchedRepo) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    log.info({ repoId: matchedRepo.id, name: matchedRepo.name }, 'Webhook received');

    const { syncRepository } = await import('../../services/RepoSyncService');
    const { broadcast } = await import('../../ws');

    syncRepository(matchedRepo)
      .then(() => broadcast('tree-updated'))
      .catch(err => log.error({ err, repoId: matchedRepo!.id }, 'Webhook-triggered sync failed'));

    res.json({ success: true, repo: matchedRepo.name });
  } catch (err) { next(err); }
});

export default router;
