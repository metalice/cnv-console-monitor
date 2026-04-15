import { type NextFunction, type Request, type Response, Router } from 'express';

import { SaveUserTokenSchema, TokenProviderEnum } from '@cnv-monitor/shared';

import { validateToken } from '../../clients/token-validator';
import { deleteUserToken, getUserTokens, saveUserToken } from '../../db/store';
import { logger } from '../../logger';

const log = logger.child({ module: 'UserTokens' });
const router = Router();

const extractUpstreamDetail = (upstream: unknown): string => {
  if (typeof upstream !== 'object' || upstream === null) return '';
  const obj = upstream as Record<string, unknown>;
  const msg = obj.message ?? obj.errorMessage ?? obj.error;
  if (typeof msg === 'string' && msg.length > 0) return ` Server: "${msg}"`;
  return '';
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const tokens = await getUserTokens(email);
    const allProviders = TokenProviderEnum.options;
    const result = allProviders.map(provider => {
      const existing = tokens.find(tok => tok.provider === provider);
      return (
        existing ?? {
          isConfigured: false,
          isValid: false,
          provider,
          providerEmail: null,
          providerUsername: null,
          validatedAt: null,
        }
      );
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// TODO: Refactor to reduce cognitive complexity
// eslint-disable-next-line sonarjs/cognitive-complexity
router.put('/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const provider = req.params.provider as string;
    const parseResult = TokenProviderEnum.safeParse(provider);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid provider. Must be gitlab, github, or jira' });
      return;
    }

    const parsed = SaveUserTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const apiBaseUrl = (req.body as { apiBaseUrl?: string }).apiBaseUrl;
    let providerInfo: { username?: string; email?: string } = {};

    try {
      providerInfo = await validateToken(provider, parsed.data.token, apiBaseUrl);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: unknown };
        code?: string;
        message?: string;
      };
      const status = axiosErr.response?.status;
      const { code } = axiosErr;
      const upstream = axiosErr.response?.data;
      const detail =
        typeof upstream === 'object' && upstream !== null
          ? (upstream as Record<string, unknown>).message ||
            (upstream as Record<string, unknown>).error ||
            JSON.stringify(upstream)
          : axiosErr.message || 'Unknown error';

      log.warn({ code, detail, provider, status }, 'Token validation failed');

      let hint: string;
      if (status === 401) {
        hint =
          provider === 'jira'
            ? 'The token is invalid, expired, or the email/token combination is incorrect. Generate a new API token at https://id.atlassian.com/manage-profile/security/api-tokens.'
            : 'The token is invalid or expired.';
      } else if (status === 403) {
        const serverDetail = extractUpstreamDetail(upstream);
        hint =
          provider === 'jira'
            ? `Jira permission denied. Required: "Browse Projects" and "Create Issues" project permissions. Verify the API token is not restricted to specific IPs or apps.${serverDetail}`
            : provider === 'gitlab'
              ? `GitLab permission denied. Required scopes: api (or read_api + write_repository).${serverDetail}`
              : `GitHub permission denied. Required scope: repo.${serverDetail}`;
      } else if (status === 404) {
        hint = 'The API endpoint was not found. Check that the provider URL is correct.';
      } else if (code === 'ECONNREFUSED') {
        hint = 'Connection refused. The provider server is not reachable from this machine.';
      } else if (code === 'ENOTFOUND') {
        hint = 'DNS lookup failed. The provider hostname could not be resolved.';
      } else if (
        code === 'CERT_HAS_EXPIRED' ||
        code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
      ) {
        hint = 'TLS certificate error. The provider uses a self-signed or expired certificate.';
      } else if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        hint = 'Connection timed out. The provider server did not respond within 10 seconds.';
      } else {
        hint = `${axiosErr.message || 'Request failed'}${code ? ` (${code})` : ''}`;
      }

      const detailMessage =
        typeof detail === 'string'
          ? detail
          : typeof detail === 'number' || typeof detail === 'boolean' || typeof detail === 'bigint'
            ? String(detail)
            : JSON.stringify(detail);

      res.status(400).json({ detail: detailMessage, error: `Token validation failed: ${hint}` });
      return;
    }

    await saveUserToken(email, provider, parsed.data.token, providerInfo);
    res.json({ provider, success: true, ...providerInfo });
  } catch (err) {
    next(err);
  }
});

router.delete('/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const deleted = await deleteUserToken(email, req.params.provider as string);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});

router.post('/:provider/test', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { getDecryptedToken } = await import('../../db/store');
    const provider = req.params.provider as string;
    const token = await getDecryptedToken(email, provider);
    if (!token) {
      res.status(404).json({ error: 'No token configured for this provider' });
      return;
    }

    const providerInfo = await validateToken(provider, token);
    res.json({ success: true, ...providerInfo });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
    const status = axiosErr.response?.status;
    const upstream = axiosErr.response?.data;
    const prov = req.params.provider as string;
    const serverDetail = extractUpstreamDetail(upstream);
    let hint = err instanceof Error ? err.message : 'Validation failed';
    if (status === 401) {
      hint =
        prov === 'jira'
          ? `Token is invalid, expired, or email/token mismatch. Generate a new API token at https://id.atlassian.com/manage-profile/security/api-tokens.${serverDetail}`
          : `Token is invalid or expired. Generate a new token from your provider settings.${serverDetail}`;
    } else if (status === 403) {
      hint =
        prov === 'jira'
          ? `Jira permission denied. Required: "Browse Projects" and "Create Issues" project permissions.${serverDetail}`
          : prov === 'gitlab'
            ? `GitLab permission denied. Required scopes: api (or read_api + write_repository).${serverDetail}`
            : `GitHub permission denied. Required scope: repo.${serverDetail}`;
    }
    res.status(status === 401 || status === 403 ? 401 : 502).json({ error: hint, success: false });
  }
});

export default router;
