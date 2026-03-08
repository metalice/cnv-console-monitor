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

export function fetchTrends(name = 'test-kubevirt-console', days = 30): Promise<TrendPoint[]> {
  return apiFetch(`/launches/trends?name=${encodeURIComponent(name)}&days=${days}`);
}

export function fetchTrendsByVersion(days = 30): Promise<VersionTrendPoint[]> {
  return apiFetch(`/launches/trends/by-version?days=${days}`);
}

export function fetchHeatmap(days = 14, limit = 20): Promise<HeatmapCell[]> {
  return apiFetch(`/launches/trends/heatmap?days=${days}&limit=${limit}`);
}

export function fetchTopFailures(days = 30, limit = 15): Promise<TopFailingTest[]> {
  return apiFetch(`/launches/trends/top-failures?days=${days}&limit=${limit}`);
}

export function fetchAIAccuracy(days = 30): Promise<AIPredictionAccuracy[]> {
  return apiFetch(`/launches/trends/ai-accuracy?days=${days}`);
}

export function fetchClusterReliability(days = 30): Promise<ClusterReliability[]> {
  return apiFetch(`/launches/trends/clusters?days=${days}`);
}

export function fetchErrorPatterns(days = 30, limit = 10): Promise<ErrorPattern[]> {
  return apiFetch(`/launches/trends/error-patterns?days=${days}&limit=${limit}`);
}

export function fetchDefectTypesTrend(days = 90): Promise<DefectTypeTrend[]> {
  return apiFetch(`/launches/trends/defect-types?days=${days}`);
}

export function fetchFailuresByHour(days = 30): Promise<HourlyFailure[]> {
  return apiFetch(`/launches/trends/by-hour?days=${days}`);
}
