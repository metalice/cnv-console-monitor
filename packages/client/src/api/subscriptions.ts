import type { Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchSubscriptions = (): Promise<Subscription[]> =>
  apiFetch('/subscriptions');

export const createSubscriptionApi = (data: CreateSubscriptionRequest): Promise<Subscription> =>
  apiFetch('/subscriptions', { method: 'POST', body: JSON.stringify(data) });

export const updateSubscriptionApi = (id: number, data: UpdateSubscriptionRequest): Promise<Subscription> =>
  apiFetch(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSubscriptionApi = (id: number): Promise<{ success: boolean }> =>
  apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });

export const testSubscriptionApi = (id: number): Promise<{ success: boolean; message: string }> =>
  apiFetch(`/subscriptions/${id}/test`, { method: 'POST' });
