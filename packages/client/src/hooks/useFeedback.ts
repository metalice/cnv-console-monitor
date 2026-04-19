import type {
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  UpdateFeedbackRequest,
} from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchFeedbackById,
  fetchFeedbackList,
  respondToFeedback,
  submitFeedback,
  unvoteFeedback,
  updateFeedbackItem,
  voteFeedback,
} from '../api/feedback';

const ONE_MINUTE_MS = 60 * 1000;

type FeedbackFilters = {
  category?: string;
  limit?: number;
  page?: number;
  priority?: string;
  sort?: string;
  status?: string;
};

export const useFeedbackList = (filters: FeedbackFilters = {}) =>
  useQuery({
    queryFn: () => fetchFeedbackList(filters),
    queryKey: ['feedback', 'list', filters],
    staleTime: ONE_MINUTE_MS,
  });

export const useFeedbackDetail = (id: number | undefined) =>
  useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchFeedbackById(id ?? 0),
    queryKey: ['feedback', 'detail', id],
  });

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => submitFeedback(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
};

export const useUpdateFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { data: UpdateFeedbackRequest; id: number }) =>
      updateFeedbackItem(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
};

export const useVoteFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remove }: { id: number; remove?: boolean }) =>
      remove ? unvoteFeedback(id) : voteFeedback(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
};

export const useRespondToFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { data: CreateFeedbackResponse; id: number }) =>
      respondToFeedback(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
};
