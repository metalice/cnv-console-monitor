import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Icon,
  Label,
  PageSection,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  CubesIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchReadinessVersions, type VersionSummary } from '../api/readiness';
import { ReadinessDetails } from '../components/readiness/ReadinessDetails';
import { useComponentFilter } from '../context/ComponentFilterContext';

const RECOMMENDATION_DISPLAY = {
  at_risk: {
    color: 'yellow' as const,
    icon: ExclamationTriangleIcon,
    label: 'At Risk',
    pfColor: 'var(--pf-t--global--color--status--warning--default)',
  },
  blocked: {
    color: 'red' as const,
    icon: BanIcon,
    label: 'Blocked',
    pfColor: 'var(--pf-t--global--color--status--danger--default)',
  },
  ready: {
    color: 'green' as const,
    icon: CheckCircleIcon,
    label: 'Ready',
    pfColor: 'var(--pf-t--global--color--status--success--default)',
  },
};

const formatTimeAgo = (isoDate: string | null): string => {
  if (!isoDate) return 'No runs';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const VersionCard = ({ onClick, summary }: { summary: VersionSummary; onClick: () => void }) => {
  const cfg = RECOMMENDATION_DISPLAY[summary.recommendation];
  const StatusIcon = cfg.icon;

  return (
    <Card isClickable isCompact isSelectable className="app-readiness-card" onClick={onClick}>
      <CardBody>
        <Split hasGutter>
          <SplitItem>
            <Icon
              size="lg"
              status={
                summary.recommendation === 'ready'
                  ? 'success'
                  : summary.recommendation === 'blocked'
                    ? 'danger'
                    : 'warning'
              }
            >
              <StatusIcon />
            </Icon>
          </SplitItem>
          <SplitItem isFilled>
            <Content component="h3">{summary.version}</Content>
            <Flex className="app-mt-xs" spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <Content className="app-readiness-stat" component="small">
                  <strong className="app-readiness-stat-value" style={{ color: cfg.pfColor }}>
                    {summary.passRate}%
                  </strong>{' '}
                  pass rate
                </Content>
              </FlexItem>
              <FlexItem>
                <Content className="app-readiness-stat" component="small">
                  <strong className="app-readiness-stat-value">{summary.totalLaunches}</strong>{' '}
                  launches
                </Content>
              </FlexItem>
            </Flex>
          </SplitItem>
          <SplitItem>
            <Flex alignItems={{ default: 'alignItemsFlexEnd' }} direction={{ default: 'column' }}>
              <FlexItem>
                <Label isCompact color={cfg.color} icon={<StatusIcon />}>
                  {cfg.label}
                </Label>
              </FlexItem>
              <FlexItem>
                <Content className="app-text-subtle app-mt-xs" component="small">
                  {formatTimeAgo(summary.lastRun)}
                </Content>
              </FlexItem>
            </Flex>
          </SplitItem>
        </Split>
      </CardBody>
    </Card>
  );
};

const VersionPicker = () => {
  const navigate = useNavigate();
  const { selectedComponents } = useComponentFilter();
  const components = useMemo(() => [...selectedComponents], [selectedComponents]);

  const { data: versions, isLoading } = useQuery({
    queryFn: () => fetchReadinessVersions(components.length > 0 ? components : undefined),
    queryKey: ['readinessVersions', components],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageSection isFilled>
        <div className="app-page-spinner">
          <Spinner aria-label="Loading versions" />
        </div>
      </PageSection>
    );
  }

  if (!versions?.length) {
    return (
      <PageSection isFilled>
        <EmptyState headingLevel="h4" icon={CubesIcon} titleText="No versions found">
          <EmptyStateBody>
            No CNV versions have been tracked yet. Run a poll cycle to fetch launch data from
            ReportPortal.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">Version Readiness</Content>
        <Content component="p">
          Assess ship-readiness for each CNV version based on pass rates, untriaged failures, and
          test trends.
        </Content>
      </PageSection>
      <PageSection>
        <Gallery hasGutter minWidths={{ default: '380px' }}>
          {versions.map(summary => (
            <GalleryItem key={summary.version}>
              <VersionCard
                summary={summary}
                onClick={() => navigate(`/readiness/${summary.version}`)}
              />
            </GalleryItem>
          ))}
        </Gallery>
      </PageSection>
    </>
  );
};

export const ReadinessPage = () => {
  const { version } = useParams<{ version?: string }>();

  useEffect(() => {
    document.title = version
      ? `Readiness: ${version} | CNV Console Monitor`
      : 'Version Readiness | CNV Console Monitor';
  }, [version]);

  if (!version) {
    return <VersionPicker />;
  }
  return <ReadinessDetails version={version} />;
};
