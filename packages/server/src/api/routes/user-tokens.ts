import { Router, Request, Response, NextFunction } from 'express';
import https from 'https';
import { SaveUserTokenSchema, TokenProviderEnum } from '@cnv-monitor/shared';
import { getUserTokens, saveUserToken, deleteUserToken } from '../../db/store';
import { logger } from '../../logger';
import axios from 'axios';

const log = logger.child({ module: 'UserTokens' });
const router = Router();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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
        const { getAllRepositories } = await import('../../db/store');
        const repos = await getAllRepositories();
        const gitlabRepo = repos.find(r => r.provider === 'gitlab');
        const baseUrl = req.body.apiBaseUrl || gitlabRepo?.api_base_url;
        if (!baseUrl) {
          res.status(400).json({ error: 'No GitLab API URL configured. Either add a GitLab repository first, or include apiBaseUrl in the request body (e.g., "https://gitlab.example.com/api/v4").' });
          return;
        }
        log.info({ baseUrl }, 'Validating GitLab token');
        const apiRes = await axios.get(`${baseUrl}/user`, { headers: { 'Private-Token': parsed.data.token }, timeout: 10000, httpsAgent });
        providerInfo = { username: apiRes.data.username, email: apiRes.data.email };
      } else if (provider === 'github') {
        const apiRes = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${parsed.data.token}` }, timeout: 10000 });
        providerInfo = { username: apiRes.data.login, email: apiRes.data.email };
      } else if (provider === 'jira') {
        const { config } = await import('../../config');
        if (!config.jira.url) {
          res.status(400).json({ error: 'Jira URL is not configured in the server settings.' });
          return;
        }
        const apiRes = await axios.get(`${config.jira.url}/rest/api/2/myself`, { headers: { Authorization: `Bearer ${parsed.data.token}` }, timeout: 10000 });
        providerInfo = { username: apiRes.data.name, email: apiRes.data.emailAddress };
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: unknown }; code?: string; message?: string };
      const status = axiosErr.response?.status;
      const code = axiosErr.code;
      const upstream = axiosErr.response?.data;
      const detail = typeof upstream === 'object' && upstream !== null
        ? (upstream as Record<string, unknown>).message || (upstream as Record<string, unknown>).error || JSON.stringify(upstream)
        : axiosErr.message || 'Unknown error';

      log.warn({ provider, status, code, detail }, 'Token validation failed');

      let hint: string;
      if (status === 401) hint = 'The token is invalid or expired.';
      else if (status === 403) hint = 'The token lacks required permissions. GitLab needs at least read_api scope; GitHub needs repo scope.';
      else if (status === 404) hint = 'The API endpoint was not found. Check that the provider URL is correct.';
      else if (code === 'ECONNREFUSED') hint = 'Connection refused. The provider server is not reachable from this machine.';
      else if (code === 'ENOTFOUND') hint = 'DNS lookup failed. The provider hostname could not be resolved.';
      else if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') hint = 'TLS certificate error. The provider uses a self-signed or expired certificate.';
      else if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') hint = 'Connection timed out. The provider server did not respond within 10 seconds.';
      else hint = `${axiosErr.message || 'Request failed'}${code ? ` (${code})` : ''}`;

      res.status(400).json({ error: `Token validation failed: ${hint}`, detail: String(detail) });
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
      const { getAllRepositories } = await import('../../db/store');
      const repos = await getAllRepositories();
      const gitlabRepo = repos.find(r => r.provider === 'gitlab');
      const baseUrl = gitlabRepo?.api_base_url || '';
      const apiRes = await axios.get(`${baseUrl}/user`, { headers: { 'Private-Token': token }, timeout: 10000, httpsAgent });
      providerInfo = { username: apiRes.data.username, email: apiRes.data.email };
    } else if (provider === 'github') {
      const apiRes = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      providerInfo = { username: apiRes.data.login, email: apiRes.data.email };
    } else if (provider === 'jira') {
      const { config } = await import('../../config');
      const apiRes = await axios.get(`${config.jira.url}/rest/api/2/myself`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      providerInfo = { username: apiRes.data.name, email: apiRes.data.emailAddress };
    }

    res.json({ success: true, ...providerInfo });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
    const status = axiosErr.response?.status;
    let hint = err instanceof Error ? err.message : 'Validation failed';
    if (status === 401) hint = 'Token is invalid or expired';
    else if (status === 403) hint = 'Token lacks required permissions';
    res.json({ success: false, error: hint });
  }
});

export default router;
