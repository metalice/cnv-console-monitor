import type { DailyReport, TrendPoint, VersionTrendPoint, HeatmapCell, TopFailingTest, AIPredictionAccuracy, ClusterReliability, ErrorPattern, DefectTypeTrend, HourlyFailure } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchReport = (hours = 24): Promise<DailyReport> =>
  apiFetch(`/launches/report?hours=${hours}`);

export const fetchReportForDate = (dateStr: string): Promise<DailyReport> => {
  const since = new Date(dateStr + 'T00:00:00').getTime();
  const endOfDay = since + 24 * 60 * 60 * 1000;
  const until = Math.min(endOfDay, Date.now());
  return apiFetch(`/launches/report?since=${since}&until=${until}`);
};

export const fetchReportForRange = (since: number, until: number): Promise<DailyReport> =>
  apiFetch(`/launches/report?since=${since}&until=${until}`);

const compParam = (component?: string): string =>
  component ? `&component=${encodeURIComponent(component)}` : '';

export const fetchTrends = (name = '', days = 30, component?: string): Promise<TrendPoint[]> =>
  apiFetch(`/launches/trends?name=${encodeURIComponent(name)}&days=${days}${compParam(component)}`);

export const fetchTrendsByVersion = (days = 30, component?: string): Promise<VersionTrendPoint[]> =>
  apiFetch(`/launches/trends/by-version?days=${days}${compParam(component)}`);

export const fetchHeatmap = (days = 14, limit = 20, component?: string): Promise<HeatmapCell[]> =>
  apiFetch(`/launches/trends/heatmap?days=${days}&limit=${limit}${compParam(component)}`);

export const fetchTopFailures = (days = 30, limit = 15, component?: string): Promise<TopFailingTest[]> =>
  apiFetch(`/launches/trends/top-failures?days=${days}&limit=${limit}${compParam(component)}`);

export const fetchAIAccuracy = (days = 30, component?: string): Promise<AIPredictionAccuracy[]> =>
  apiFetch(`/launches/trends/ai-accuracy?days=${days}${compParam(component)}`);

export const fetchClusterReliability = (days = 30, component?: string): Promise<ClusterReliability[]> =>
  apiFetch(`/launches/trends/clusters?days=${days}${compParam(component)}`);

export const fetchErrorPatterns = (days = 30, limit = 10, component?: string): Promise<ErrorPattern[]> =>
  apiFetch(`/launches/trends/error-patterns?days=${days}&limit=${limit}${compParam(component)}`);

export const fetchDefectTypesTrend = (days = 90, component?: string): Promise<DefectTypeTrend[]> =>
  apiFetch(`/launches/trends/defect-types?days=${days}${compParam(component)}`);

export const fetchFailuresByHour = (days = 30, component?: string): Promise<HourlyFailure[]> =>
  apiFetch(`/launches/trends/by-hour?days=${days}${compParam(component)}`);
