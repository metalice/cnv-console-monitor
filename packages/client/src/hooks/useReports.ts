import { type TeamReport, type UpdateReportRequest } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteReportApi,
  fetchReport,
  fetchReportList,
  finalizeReport,
  sendReport,
  updateReport,
} from '../api/reports';

const TWO_MINUTES_MS = 2 * 60 * 1000;

export const useReportList = () =>
  useQuery({
    queryFn: () => fetchReportList(),
    queryKey: ['reports', 'list'],
  });

export const useReport = (weekId: string | undefined, component?: string) =>
  useQuery({
    enabled: Boolean(weekId),
    queryFn: () => fetchReport(weekId ?? '', component),
    queryKey: ['reports', 'detail', weekId, component],
    staleTime: TWO_MINUTES_MS,
  });

export const useUpdateReport = () => {
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
    }) => updateReport(weekId, data, component),
    onSuccess: (updated: TeamReport) => {
      queryClient.setQueryData(['reports', 'detail', updated.weekId, updated.component], updated);
      void queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    },
  });
};

export const useFinalizeReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ component, weekId }: { component?: string; weekId: string }) =>
      finalizeReport(weekId, component),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useSendReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ component, weekId }: { component?: string; weekId: string }) =>
      sendReport(weekId, component),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReportApi(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
