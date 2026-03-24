import type {
  CreateSubscriptionRequest,
  Subscription,
  UpdateSubscriptionRequest,
} from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchSubscriptions = (): Promise<Subscription[]> => apiFetch('/subscriptions');

export const createSubscriptionApi = (data: CreateSubscriptionRequest): Promise<Subscription> =>
  apiFetch('/subscriptions', { body: JSON.stringify(data), method: 'POST' });

export const updateSubscriptionApi = (
  id: number,
  data: UpdateSubscriptionRequest,
): Promise<Subscription> =>
  apiFetch(`/subscriptions/${id}`, { body: JSON.stringify(data), method: 'PUT' });

export const deleteSubscriptionApi = (id: number): Promise<{ success: boolean }> =>
  apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });

export const testSubscriptionApi = (id: number): Promise<{ success: boolean; message: string }> =>
  apiFetch(`/subscriptions/${id}/test`, { method: 'POST' });
