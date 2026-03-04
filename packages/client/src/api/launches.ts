import type { DailyReport, TrendPoint } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchReport(hours = 24): Promise<DailyReport> {
  return apiFetch(`/launches/report?hours=${hours}`);
}

export function fetchTrends(name = 'test-kubevirt-console', days = 30): Promise<TrendPoint[]> {
  return apiFetch(`/launches/trends?name=${encodeURIComponent(name)}&days=${days}`);
}
