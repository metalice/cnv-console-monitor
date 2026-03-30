import { type DailyReport } from '@cnv-monitor/shared';

export type DashboardView = 'table' | 'matrix';

export const VALID_VIEWS = new Set<string>(['table', 'matrix']);

export const computePriorRange = (since: number, until: number) => {
  const span = until - since;
  return { priorSince: since - span, priorUntil: since };
};

export const computeDeltas = (
  current: {
    total: number;
    passed: number;
    failed: number;
    inProgress: number;
    newFailures: number;
    untriaged: number;
  },
  prior: DailyReport | undefined,
) => {
  if (!prior) {
    return {};
  }
  return {
    failed: current.failed - prior.failedLaunches,
    inProgress: current.inProgress - prior.inProgressLaunches,
    passed: current.passed - prior.passedLaunches,
    total: current.total - prior.totalLaunches,
  };
};
