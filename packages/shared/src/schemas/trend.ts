import { z } from 'zod';

export const TrendPointSchema = z.object({
  date: z.string(),
  passed: z.number(),
  rate: z.number(),
  total: z.number(),
});

export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const VersionTrendPointSchema = z.object({
  date: z.string(),
  passed: z.number(),
  rate: z.number(),
  total: z.number(),
  version: z.string(),
});

export type VersionTrendPoint = z.infer<typeof VersionTrendPointSchema>;

export const HeatmapCellSchema = z.object({
  date: z.string(),
  fail_count: z.number(),
  name: z.string(),
  status: z.string(),
  unique_id: z.string(),
});

export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const TopFailingTestSchema = z.object({
  fail_count: z.number(),
  failure_rate: z.number(),
  name: z.string(),
  recent_trend: z.enum(['worsening', 'improving', 'stable']),
  total_runs: z.number(),
  unique_id: z.string(),
});

export type TopFailingTest = z.infer<typeof TopFailingTestSchema>;

export type AIPredictionAccuracy = { prediction: string; actual: string; count: number };
export type ClusterReliability = {
  cluster: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
};
export type ErrorPattern = {
  pattern: string;
  count: number;
  uniqueTests: number;
  firstSeen: string;
  lastSeen: string;
};
export type DefectTypeTrend = {
  week: string;
  productBug: number;
  automationBug: number;
  systemIssue: number;
  noDefect: number;
  toInvestigate: number;
};
export type HourlyFailure = { hour: number; total: number; failed: number; failRate: number };
