import { Gallery, GalleryItem } from '@patternfly/react-core';

import { StatCard } from '../components/common/StatCard';

type ScopedStats = {
  total: number;
  passed: number;
  failed: number;
  inProgress: number;
  totalTests: number;
  skippedTests: number;
  newFailures: number;
  untriaged: number;
};

type Deltas = {
  total?: number;
  passed?: number;
  failed?: number;
  inProgress?: number;
};

type DashboardStatCardsProps = {
  stats: ScopedStats;
  deltas: Deltas;
  statusFilter: string | null;
  onStatusFilter: (value: string | null) => void;
  onNavigateFailures: () => void;
};

export const DashboardStatCards = ({
  deltas,
  onNavigateFailures,
  onStatusFilter,
  stats,
  statusFilter,
}: DashboardStatCardsProps) => {
  const statCards = [
    {
      colorClass: undefined,
      delta: deltas.total,
      help: 'Total launches in this time range. Click to clear filters.',
      isActive: statusFilter === null,
      label: 'Total',
      onClick: () => onStatusFilter(null),
      value: stats.total,
    },
    {
      colorClass: 'app-text-success',
      delta: deltas.passed,
      help: 'Launches where all tests passed.',
      isActive: statusFilter === 'PASSED',
      label: 'Passed',
      onClick: () => onStatusFilter(statusFilter === 'PASSED' ? null : 'PASSED'),
      value: stats.passed,
    },
    {
      colorClass: 'app-text-danger',
      delta: deltas.failed,
      help: 'Launches with at least one failed test.',
      isActive: statusFilter === 'FAILED',
      label: 'Failed',
      onClick: () => onStatusFilter(statusFilter === 'FAILED' ? null : 'FAILED'),
      value: stats.failed,
    },
    {
      colorClass: 'app-text-warning',
      delta: deltas.inProgress,
      help: 'Launches still running.',
      isActive: statusFilter === 'IN_PROGRESS',
      label: 'In Progress',
      onClick: () => onStatusFilter(statusFilter === 'IN_PROGRESS' ? null : 'IN_PROGRESS'),
      value: stats.inProgress,
    },
    {
      colorClass: undefined,
      help: 'Total tests across latest launches.',
      label: 'Total Tests',
      value: stats.totalTests,
    },
    {
      colorClass: 'app-text-subtle',
      help: 'Tests skipped in latest launches. Excluded from pass rate.',
      label: 'Skipped',
      value: stats.skippedTests,
    },
    {
      colorClass: 'app-text-danger',
      help: 'Tests that failed now but not in the previous window.',
      label: 'New Failures',
      onClick: onNavigateFailures,
      value: stats.newFailures,
    },
    {
      colorClass: 'app-text-warning',
      help: 'Failed tests not yet classified.',
      label: 'Untriaged',
      onClick: onNavigateFailures,
      value: stats.untriaged,
    },
  ] as const;

  return (
    <Gallery hasGutter className="app-mb-xl" minWidths={{ default: '130px' }}>
      {statCards.map(card => (
        <GalleryItem key={card.label}>
          <StatCard {...card} />
        </GalleryItem>
      ))}
    </Gallery>
  );
};
