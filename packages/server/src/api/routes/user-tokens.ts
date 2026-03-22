import { Router, Request, Response, NextFunction } from 'express';
import { SaveUserTokenSchema, TokenProviderEnum } from '@cnv-monitor/shared';
import { getUserTokens, saveUserToken, deleteUserToken } from '../../db/store';
import { logger } from '../../logger';
import axios from 'axios';

const log = logger.child({ module: 'UserTokens' });
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const tokens = await getUserTokens(email);
    const allProviders = TokenProviderEnum.options;
    const result = allProviders.map(provider => {
      const existing = tokens.find(t => t.provider === provider);
      return existing || { provider, isConfigured: false, isValid: false, providerUsername: null, providerEmail: null, validatedAt: null };
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const provider = req.params.provider as string;
    const parseResult = TokenProviderEnum.safeParse(provider);
    if (!parseResult.success) { res.status(400).json({ error: 'Invalid provider. Must be gitlab, github, or jira' }); return; }

    const parsed = SaveUserTokenSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Token is required' }); return; }

    let providerInfo: { username?: string; email?: string } = {};

    try {
      if (provider === 'gitlab') {
        const res = await axios.get('/api/v4/user', { headers: { 'Private-Token': parsed.data.token }, timeout: 10000 });
        providerInfo = { username: res.data.username, email: res.data.email };
      } else if (provider === 'github') {
        const res = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${parsed.data.token}` }, timeout: 10000 });
        providerInfo = { username: res.data.login, email: res.data.email };
      } else if (provider === 'jira') {
        const { config } = await import('../../config');
        const res = await axios.get(`${config.jira.url}/rest/api/2/myself`, { headers: { Authorization: `Bearer ${parsed.data.token}` }, timeout: 10000 });
        providerInfo = { username: res.data.name, email: res.data.emailAddress };
      }
    } catch (err) {
      log.warn({ err, provider }, 'Token validation failed');
      res.status(400).json({ error: 'Token validation failed. Check that the token is valid and has the required permissions.' });
      return;
    }

    await saveUserToken(email, provider, parsed.data.token, providerInfo);
    res.json({ success: true, provider, ...providerInfo });
  } catch (err) { next(err); }
});

router.delete('/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const deleted = await deleteUserToken(email, req.params.provider as string);
    res.json({ success: deleted });
  } catch (err) { next(err); }
});

router.post('/:provider/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { getDecryptedToken } = await import('../../db/store');
    const provider = req.params.provider as string;
    const token = await getDecryptedToken(email, provider);
    if (!token) { res.status(404).json({ error: 'No token configured for this provider' }); return; }

    let providerInfo: Record<string, unknown> = {};

    if (provider === 'gitlab') {
      const res = await axios.get('/api/v4/user', { headers: { 'Private-Token': token }, timeout: 10000 });
      providerInfo = { username: res.data.username, email: res.data.email };
    } else if (provider === 'github') {
      const res = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      providerInfo = { username: res.data.login, email: res.data.email };
    } else if (provider === 'jira') {
      const { config } = await import('../../config');
      const res = await axios.get(`${config.jira.url}/rest/api/2/myself`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      providerInfo = { username: res.data.name, email: res.data.emailAddress };
    }

    res.json({ success: true, ...providerInfo });
  } catch (err) {
    res.json({ success: false, error: err instanceof Error ? err.message : 'Validation failed' });
  }
});

export default router;
