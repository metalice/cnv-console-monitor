import { z } from 'zod';

export const TrendPointSchema = z.object({
  date: z.string(),
  total: z.number(),
  passed: z.number(),
  rate: z.number(),
});

export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const VersionTrendPointSchema = z.object({
  date: z.string(),
  version: z.string(),
  total: z.number(),
  passed: z.number(),
  rate: z.number(),
});

export type VersionTrendPoint = z.infer<typeof VersionTrendPointSchema>;

export const HeatmapCellSchema = z.object({
  unique_id: z.string(),
  name: z.string(),
  fail_count: z.number(),
  date: z.string(),
  status: z.string(),
});

export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const TopFailingTestSchema = z.object({
  name: z.string(),
  unique_id: z.string(),
  fail_count: z.number(),
  total_runs: z.number(),
  failure_rate: z.number(),
  recent_trend: z.enum(['worsening', 'improving', 'stable']),
});

export type TopFailingTest = z.infer<typeof TopFailingTestSchema>;
