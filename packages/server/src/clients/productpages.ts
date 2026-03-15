import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';

const log = logger.child({ module: 'ProductPages' });

const SSO_URL = 'https://auth.redhat.com/auth/realms/EmployeeIDP/protocol/openid-connect/token';
const PP_API = 'https://productpages.redhat.com/api/v1';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const response = await withRetry(
    () => axios.post(SSO_URL, new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.productpages.clientId,
      client_secret: config.productpages.clientSecret,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }),
    'productpages.getToken',
    { maxRetries: 2 },
  );

  cachedToken = response.data.access_token;
  const expiresIn = (response.data.expires_in || 300) - 30;
  tokenExpiresAt = Date.now() + expiresIn * 1000;

  return cachedToken!;
}

export type PPRelease = {
  id: number;
  shortname: string;
  name: string;
  ga_date: string | null;
  phase_display: string;
  canceled: boolean;
  all_ga_tasks: Array<{
    main: boolean;
    name: string;
    slug: string;
    date_start: string;
    date_finish: string;
  }>;
};

export async function fetchCnvReleases(): Promise<PPRelease[]> {
  if (!config.productpages.enabled) {
    log.debug('Product Pages not configured, skipping');
    return [];
  }

  try {
    const token = await getToken();
    const response = await withRetry(
      () => axios.get(`${PP_API}/releases/`, {
        params: {
          'product__shortname': 'cnv',
          ordering: '-ga_date',
          fields: 'id,shortname,name,ga_date,phase_display,all_ga_tasks,canceled',
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }),
      'productpages.fetchReleases',
      { maxRetries: 2 },
    );

    return response.data as PPRelease[];
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Product Pages releases');
    return [];
  }
}
