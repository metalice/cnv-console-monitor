import type { DailyReport, TrendPoint, VersionTrendPoint, HeatmapCell, TopFailingTest, AIPredictionAccuracy, ClusterReliability, ErrorPattern, DefectTypeTrend, HourlyFailure } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchReport(hours = 24): Promise<DailyReport> {
  return apiFetch(`/launches/report?hours=${hours}`);
}

export function fetchReportForDate(dateStr: string): Promise<DailyReport> {
  const since = new Date(dateStr + 'T00:00:00').getTime();
  const endOfDay = since + 24 * 60 * 60 * 1000;
  const until = Math.min(endOfDay, Date.now());
  return apiFetch(`/launches/report?since=${since}&until=${until}`);
}

export function fetchReportForRange(since: number, until: number): Promise<DailyReport> {
  return apiFetch(`/launches/report?since=${since}&until=${until}`);
}

function compParam(component?: string): string {
  return component ? `&component=${encodeURIComponent(component)}` : '';
}

export function fetchTrends(name = '', days = 30, component?: string): Promise<TrendPoint[]> {
  return apiFetch(`/launches/trends?name=${encodeURIComponent(name)}&days=${days}${compParam(component)}`);
}

export function fetchTrendsByVersion(days = 30, component?: string): Promise<VersionTrendPoint[]> {
  return apiFetch(`/launches/trends/by-version?days=${days}${compParam(component)}`);
}

export function fetchHeatmap(days = 14, limit = 20, component?: string): Promise<HeatmapCell[]> {
  return apiFetch(`/launches/trends/heatmap?days=${days}&limit=${limit}${compParam(component)}`);
}

export function fetchTopFailures(days = 30, limit = 15, component?: string): Promise<TopFailingTest[]> {
  return apiFetch(`/launches/trends/top-failures?days=${days}&limit=${limit}${compParam(component)}`);
}

export function fetchAIAccuracy(days = 30, component?: string): Promise<AIPredictionAccuracy[]> {
  return apiFetch(`/launches/trends/ai-accuracy?days=${days}${compParam(component)}`);
}

export function fetchClusterReliability(days = 30, component?: string): Promise<ClusterReliability[]> {
  return apiFetch(`/launches/trends/clusters?days=${days}${compParam(component)}`);
}

export function fetchErrorPatterns(days = 30, limit = 10, component?: string): Promise<ErrorPattern[]> {
  return apiFetch(`/launches/trends/error-patterns?days=${days}&limit=${limit}${compParam(component)}`);
}

export function fetchDefectTypesTrend(days = 90, component?: string): Promise<DefectTypeTrend[]> {
  return apiFetch(`/launches/trends/defect-types?days=${days}${compParam(component)}`);
}

export function fetchFailuresByHour(days = 30, component?: string): Promise<HourlyFailure[]> {
  return apiFetch(`/launches/trends/by-hour?days=${days}${compParam(component)}`);
}
