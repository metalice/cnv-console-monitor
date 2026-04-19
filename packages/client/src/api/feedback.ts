import type {
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  Feedback,
  FeedbackListResponse,
  FeedbackResponseEntry,
  FeedbackStats,
  UpdateFeedbackRequest,
} from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

export const submitFeedback = (data: CreateFeedbackRequest): Promise<Feedback> =>
  apiPost('/feedback', data);

export const fetchFeedbackList = (params?: {
  category?: string;
  limit?: number;
  page?: number;
  priority?: string;
  sort?: string;
  status?: string;
}): Promise<FeedbackListResponse> => {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.status) search.set('status', params.status);
  if (params?.priority) search.set('priority', params.priority);
  if (params?.sort) search.set('sort', params.sort);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return apiFetch(`/feedback${query ? `?${query}` : ''}`);
};

export const fetchFeedbackById = (id: number): Promise<Feedback> => apiFetch(`/feedback/${id}`);

export const fetchFeedbackStats = (): Promise<FeedbackStats> => apiFetch('/feedback/stats');

export const updateFeedbackItem = (id: number, data: UpdateFeedbackRequest): Promise<Feedback> =>
  apiFetch(`/feedback/${id}`, { body: JSON.stringify(data), method: 'PATCH' });

export const voteFeedback = (id: number): Promise<{ success: boolean; voteCount: number }> =>
  apiPost(`/feedback/${id}/vote`, {});

export const unvoteFeedback = (id: number): Promise<{ success: boolean; voteCount: number }> =>
  apiFetch(`/feedback/${id}/vote`, { method: 'DELETE' });

export const respondToFeedback = (
  id: number,
  data: CreateFeedbackResponse,
): Promise<FeedbackResponseEntry> => apiPost(`/feedback/${id}/respond`, data);

export const searchSimilarFeedback = (query: string, category?: string): Promise<Feedback[]> => {
  const search = new URLSearchParams({ q: query });
  if (category) search.set('category', category);
  return apiFetch(`/feedback/search-similar?${search.toString()}`);
};

export const exportFeedbackCsv = async (): Promise<void> => {
  const res = await fetch('/api/feedback/export');
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'feedback-export.csv';
  link.click();
  URL.revokeObjectURL(downloadUrl);
};
