import type { DailyReport, TrendPoint, VersionTrendPoint, HeatmapCell, TopFailingTest } from '@cnv-monitor/shared';
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
