import type {
  AIPredictionAccuracy,
  ClusterReliability,
  DailyReport,
  DefectTypeTrend,
  ErrorPattern,
  HeatmapCell,
  HourlyFailure,
  TopFailingTest,
  TrendPoint,
  VersionTrendPoint,
} from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchReportForRange = (
  since: number,
  until: number,
  components?: string[],
): Promise<DailyReport> => {
  const params = new URLSearchParams({ since: String(since), until: String(until) });
  if (components && components.length > 0) {
    params.set('components', components.join(','));
  }
  return apiFetch(`/launches/report?${params}`);
};

const compParam = (component?: string): string =>
  component ? `&component=${encodeURIComponent(component)}` : '';

export const fetchTrends = (name = '', days = 30, component?: string): Promise<TrendPoint[]> =>
  apiFetch(`/launches/trends?name=${encodeURIComponent(name)}&days=${days}${compParam(component)}`);

export const fetchTrendsByVersion = (days = 30, component?: string): Promise<VersionTrendPoint[]> =>
  apiFetch(`/launches/trends/by-version?days=${days}${compParam(component)}`);

export const fetchHeatmap = (days = 14, limit = 20, component?: string): Promise<HeatmapCell[]> =>
  apiFetch(`/launches/trends/heatmap?days=${days}&limit=${limit}${compParam(component)}`);

export const fetchTopFailures = (
  days = 30,
  limit = 15,
  component?: string,
): Promise<TopFailingTest[]> =>
  apiFetch(`/launches/trends/top-failures?days=${days}&limit=${limit}${compParam(component)}`);

export const fetchAIAccuracy = (days = 30, component?: string): Promise<AIPredictionAccuracy[]> =>
  apiFetch(`/launches/trends/ai-accuracy?days=${days}${compParam(component)}`);

export const fetchClusterReliability = (
  days = 30,
  component?: string,
): Promise<ClusterReliability[]> =>
  apiFetch(`/launches/trends/clusters?days=${days}${compParam(component)}`);

export const fetchErrorPatterns = (
  days = 30,
  limit = 10,
  component?: string,
): Promise<ErrorPattern[]> =>
  apiFetch(`/launches/trends/error-patterns?days=${days}&limit=${limit}${compParam(component)}`);

export const fetchDefectTypesTrend = (days = 90, component?: string): Promise<DefectTypeTrend[]> =>
  apiFetch(`/launches/trends/defect-types?days=${days}${compParam(component)}`);

export const fetchFailuresByHour = (days = 30, component?: string): Promise<HourlyFailure[]> =>
  apiFetch(`/launches/trends/by-hour?days=${days}${compParam(component)}`);
