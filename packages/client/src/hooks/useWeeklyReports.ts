import { type UpdateReportRequest, type WeeklyReport } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  aiEnhanceReport,
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
  });
};

export const useWeeklyReport = (weekId: string | undefined, component?: string) =>
  useQuery({
    enabled: Boolean(weekId),
    queryFn: () => fetchWeeklyReport(weekId ?? '', component),
    queryKey: ['weeklyReports', 'detail', weekId, component],
    staleTime: TWO_MINUTES_MS,
  });

export const useUpdateWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      component,
      data,
      weekId,
    }: {
      component?: string;
      data: UpdateReportRequest;
      weekId: string;
    }) => updateWeeklyReport(weekId, data, component),
    onSuccess: (updated: WeeklyReport) => {
      queryClient.setQueryData(
        ['weeklyReports', 'detail', updated.weekId, updated.component],
        updated,
      );
      void queryClient.invalidateQueries({ queryKey: ['weeklyReports', 'list'] });
    },
  });
};

export const useFinalizeWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ component, weekId }: { component?: string; weekId: string }) =>
      finalizeWeeklyReport(weekId, component),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
    },
  });
};

export const useSendWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ component, weekId }: { component?: string; weekId: string }) =>
      sendWeeklyReport(weekId, component),
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
