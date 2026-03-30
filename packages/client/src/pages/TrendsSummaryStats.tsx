import { type TopFailingTest } from '@cnv-monitor/shared';

import { Gallery, GalleryItem, PageSection } from '@patternfly/react-core';

import { StatCard } from '../components/common/StatCard';

type SummaryStats = {
  overallRate: number;
  totalLaunches: number;
};

type VersionHealth = {
  best: { version: string; rate: number } | null;
  worst: { version: string; rate: number } | null;
};

type TrendsSummaryStatsProps = {
  summaryStats: SummaryStats;
  versionHealth: VersionHealth;
  topFailures?: TopFailingTest[];
};

const passRateColor = (rate: number): string => {
  if (rate >= 95) return 'var(--pf-t--global--color--status--success--default)';
  if (rate >= 80) return 'var(--pf-t--global--color--status--warning--default)';
  return 'var(--pf-t--global--color--status--danger--default)';
};

export const TrendsSummaryStats = ({
  summaryStats,
  topFailures,
  versionHealth,
}: TrendsSummaryStatsProps) => (
  <PageSection>
    <Gallery hasGutter minWidths={{ default: '150px' }}>
      <GalleryItem>
        <StatCard
          color={passRateColor(summaryStats.overallRate)}
          help="Average pass rate across all launches in the last 30 days"
          label="Overall Pass Rate"
          value={`${summaryStats.overallRate}%`}
        />
      </GalleryItem>
      <GalleryItem>
        <StatCard
          help="Number of test launches in the last 30 days"
          label="Total Launches"
          value={summaryStats.totalLaunches}
        />
      </GalleryItem>
      {versionHealth.best && (
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--success--default)"
            help="CNV version with the highest average pass rate"
            label={`Healthiest (${versionHealth.best.rate}%)`}
            value={versionHealth.best.version}
          />
        </GalleryItem>
      )}
      {versionHealth.worst && versionHealth.worst.version !== versionHealth.best?.version && (
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--danger--default)"
            help="CNV version with the lowest average pass rate"
            label={`Needs Attention (${versionHealth.worst.rate}%)`}
            value={versionHealth.worst.version}
          />
        </GalleryItem>
      )}
      {topFailures && (
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--danger--default)"
            help="Tests where failure rate increased in the second half of the period"
            label="Getting Worse"
            value={
              topFailures.filter((test: TopFailingTest) => test.recent_trend === 'worsening').length
            }
          />
        </GalleryItem>
      )}
    </Gallery>
  </PageSection>
);
