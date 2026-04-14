import { type UpdateReportRequest, type WeeklyReport } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  aiEnhanceReport,
  fetchCurrentWeeklyReport,
  fetchWeeklyReport,
  fetchWeeklyReportList,
  finalizeWeeklyReport,
  sendWeeklyReport,
  updateWeeklyReport,
} from '../api/weeklyReports';
import { useComponentFilter } from '../context/ComponentFilterContext';

const TWO_MINUTES_MS = 2 * 60 * 1000;

export const useWeeklyReportList = () => {
  const { selectedComponent } = useComponentFilter();
  return useQuery({
    queryFn: () => fetchWeeklyReportList(selectedComponent),
    queryKey: ['weeklyReports', 'list', selectedComponent],
    staleTime: TWO_MINUTES_MS,
  });
};

export const useCurrentWeeklyReport = () => {
  const { selectedComponent } = useComponentFilter();
  return useQuery({
    queryFn: () => fetchCurrentWeeklyReport(selectedComponent),
    queryKey: ['weeklyReports', 'current', selectedComponent],
    staleTime: TWO_MINUTES_MS,
  });
};

export const useWeeklyReport = (weekId: string | undefined) => {
  return useQuery({
    enabled: Boolean(weekId),
    queryFn: () => fetchWeeklyReport(weekId!),
    queryKey: ['weeklyReports', 'detail', weekId],
    staleTime: TWO_MINUTES_MS,
  });
};

export const useUpdateWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, weekId }: { data: UpdateReportRequest; weekId: string }) =>
      updateWeeklyReport(weekId, data),
    onSuccess: (updated: WeeklyReport) => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
      queryClient.setQueryData(['weeklyReports', 'detail', updated.weekId], updated);
    },
  });
};

export const useFinalizeWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekId: string) => finalizeWeeklyReport(weekId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
    },
  });
};

export const useSendWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekId: string) => sendWeeklyReport(weekId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
    },
  });
};

export const useAIEnhanceReport = () => {
  const queryClient = useQueryClient();
  const { selectedComponent } = useComponentFilter();
  return useMutation({
    mutationFn: (weekId: string) => aiEnhanceReport(weekId, selectedComponent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
    },
  });
};
