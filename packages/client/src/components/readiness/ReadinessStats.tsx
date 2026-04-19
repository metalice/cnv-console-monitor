import { Banner, Flex, FlexItem, Gallery, GalleryItem, PageSection } from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

import { StatCard } from '../common/StatCard';

const PASS_RATE_GREEN = 95;
const PASS_RATE_YELLOW = 80;

const RECOMMENDATION_CONFIG = {
  at_risk: {
    color: 'yellow' as const,
    description: 'Moderate pass rate or some untriaged failures remain',
    icon: ExclamationTriangleIcon,
    label: 'At Risk',
  },
  blocked: {
    color: 'red' as const,
    description: 'Pass rate below 80% or more than 10 untriaged failures',
    icon: BanIcon,
    label: 'Blocked',
  },
  ready: {
    color: 'green' as const,
    description: 'Pass rate at or above 95% with zero untriaged failures',
    icon: CheckCircleIcon,
    label: 'Ready to Ship',
  },
};

type ReadinessData = {
  recommendation: keyof typeof RECOMMENDATION_CONFIG;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
};

type ReadinessStatsSectionProps = {
  data: ReadinessData;
};

const getPassRateColor = (rate: number): string => {
  if (rate >= PASS_RATE_GREEN) return 'var(--pf-t--global--color--status--success--default)';
  if (rate >= PASS_RATE_YELLOW) return 'var(--pf-t--global--color--status--warning--default)';
  return 'var(--pf-t--global--color--status--danger--default)';
};

export const ReadinessBanner = ({ data }: ReadinessStatsSectionProps) => {
  const cfg = RECOMMENDATION_CONFIG[data.recommendation];
  const Icon = cfg.icon;

  return (
    <PageSection padding={{ default: 'noPadding' }}>
      <Banner color={cfg.color} screenReaderText={cfg.label}>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Icon />
          </FlexItem>
          <FlexItem>
            <strong>{cfg.label}</strong> — {cfg.description}
          </FlexItem>
        </Flex>
      </Banner>
    </PageSection>
  );
};

export const ReadinessStatsGallery = ({ data }: ReadinessStatsSectionProps) => (
  <PageSection>
    <Gallery hasGutter minWidths={{ default: '160px' }}>
      <GalleryItem>
        <StatCard
          color={getPassRateColor(data.passRate)}
          help="Percentage of tests passing across all launches for this version"
          label="Pass Rate"
          value={`${data.passRate}%`}
        />
      </GalleryItem>
      <GalleryItem>
        <StatCard
          help="Number of launches for this version in the lookback period"
          label="Total Launches"
          value={data.totalLaunches}
        />
      </GalleryItem>
      <GalleryItem>
        <StatCard
          color={
            data.failedLaunches > 0
              ? 'var(--pf-t--global--color--status--danger--default)'
              : undefined
          }
          help="Launches with FAILED or INTERRUPTED status"
          label="Failed Launches"
          value={data.failedLaunches}
        />
      </GalleryItem>
      <GalleryItem>
        <StatCard
          color={
            data.untriagedCount > 0
              ? 'var(--pf-t--global--color--status--warning--default)'
              : 'var(--pf-t--global--color--status--success--default)'
          }
          help="Failed test items not yet classified"
          label="Untriaged"
          value={data.untriagedCount}
        />
      </GalleryItem>
    </Gallery>
  </PageSection>
);
