import type { UserTokenInfo } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchUserTokens = (): Promise<UserTokenInfo[]> =>
  apiFetch('/user/tokens');

export const saveUserTokenApi = (provider: string, token: string): Promise<{ success: boolean; username?: string; email?: string }> =>
  apiFetch(`/user/tokens/${provider}`, { method: 'PUT', body: JSON.stringify({ token }) });

export const deleteUserTokenApi = (provider: string): Promise<{ success: boolean }> =>
  apiFetch(`/user/tokens/${provider}`, { method: 'DELETE' });

export const testUserTokenApi = (provider: string): Promise<{ success: boolean; username?: string; email?: string }> =>
  apiFetch(`/user/tokens/${provider}/test`, { method: 'POST' });
