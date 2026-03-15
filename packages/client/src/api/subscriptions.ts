import type { Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchSubscriptions(): Promise<Subscription[]> {
  return apiFetch('/subscriptions');
}

export function createSubscriptionApi(data: CreateSubscriptionRequest): Promise<Subscription> {
  return apiFetch('/subscriptions', { method: 'POST', body: JSON.stringify(data) });
}

export function updateSubscriptionApi(id: number, data: UpdateSubscriptionRequest): Promise<Subscription> {
  return apiFetch(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteSubscriptionApi(id: number): Promise<{ success: boolean }> {
  return apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
}

export function testSubscriptionApi(id: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/subscriptions/${id}/test`, { method: 'POST' });
}
