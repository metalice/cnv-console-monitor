import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import {
  Banner,
  Bullseye,
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchReadiness, fetchReadinessVersions } from '../../api/readiness';
import { StatCard } from '../common/StatCard';

import { ReadinessBlocking } from './ReadinessBlocking';

const RECOMMENDATION_CONFIG = {
  at_risk: {
    color: 'yellow' as const,
    description: 'Some untriaged failures or moderate pass rate',
    icon: ExclamationTriangleIcon,
    label: 'At Risk',
  },
  blocked: {
    color: 'red' as const,
    description: 'Pass rate < 80% or > 10 untriaged failures',
    icon: BanIcon,
    label: 'Blocked',
  },
  ready: {
    color: 'green' as const,
    description: 'Pass rate ≥ 95% with no untriaged failures',
    icon: CheckCircleIcon,
    label: 'Ready to Ship',
  },
};

export const ReadinessDetails: React.FC<{ version: string }> = ({ version }) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Readiness: ${version} | CNV Console Monitor`;
  }, [version]);

  const { data: versions } = useQuery({
    queryFn: fetchReadinessVersions,
    queryKey: ['readinessVersions'],
    staleTime: 5 * 60 * 1000,
  });
  const { data, error, isLoading } = useQuery({
    enabled: Boolean(version),
    queryFn: () => fetchReadiness(version),
    queryKey: ['readiness', version],
  });

  const trendData = useMemo(() => {
    if (!data?.trend?.length) {
      return [];
    }
    return data.trend.map(point => ({ x: point.date.slice(5), y: point.rate }));
  }, [data]);

  if (isLoading) {
    return (
      <Bullseye className="app-min-h-300">
        <Spinner aria-label="Loading readiness" />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="Error loading readiness data">
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!data) {
    return null;
  }

  const cfg = RECOMMENDATION_CONFIG[data.recommendation];
  const Icon = cfg.icon;

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              <FlexItem>
                <Content component="h1">Readiness: {version}</Content>
              </FlexItem>
              {(versions?.length ?? 0) > 1 && (
                <FlexItem>
                  {versions!
                    .filter(ver => ver !== version)
                    .slice(0, 3)
                    .map(ver => (
                      <Button
                        className="app-mr-sm"
                        key={ver}
                        size="sm"
                        variant="link"
                        onClick={() => navigate(`/readiness/${ver}`)}
                      >
                        {ver}
                      </Button>
                    ))}
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Banner color={cfg.color} screenReaderText={cfg.label}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Icon />
            </FlexItem>
            <FlexItem>
              <strong>{cfg.label}</strong> — {cfg.description}
            </FlexItem>
          </Flex>
        </Banner>
      </PageSection>

      <PageSection>
        <Gallery hasGutter minWidths={{ default: '160px' }}>
          <GalleryItem>
            <StatCard
              color={
                data.passRate >= 95
                  ? 'var(--pf-t--global--color--status--success--default)'
                  : data.passRate >= 80
                    ? 'var(--pf-t--global--color--status--warning--default)'
                    : 'var(--pf-t--global--color--status--danger--default)'
              }
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

      {trendData.length > 1 && (
        <PageSection>
          <Card>
            <CardBody>
              <Content className="app-section-heading" component="h3">
                Pass Rate Trend
              </Content>
              <div className="app-chart-container-sm">
                <Chart
                  containerComponent={
                    <ChartVoronoiContainer
                      labels={({ datum }: { datum: { x: string; y: number } }) =>
                        `${datum.x}: ${datum.y}%`
                      }
                    />
                  }
                  height={250}
                  padding={{ bottom: 50, left: 60, right: 30, top: 20 }}
                >
                  <ChartAxis
                    style={{ tickLabels: { angle: -45, fontSize: 10, textAnchor: 'end' } }}
                    tickValues={trendData
                      .filter(
                        (_, index) => index % Math.max(1, Math.floor(trendData.length / 10)) === 0,
                      )
                      .map(point => point.x)}
                  />
                  <ChartAxis dependentAxis domain={[0, 100]} tickFormat={(t: number) => `${t}%`} />
                  <ChartGroup>
                    <ChartLine
                      data={trendData}
                      style={{ data: { stroke: '#0066CC', strokeWidth: 2 } }}
                    />
                  </ChartGroup>
                </Chart>
              </div>
            </CardBody>
          </Card>
        </PageSection>
      )}

      <PageSection>
        <ReadinessBlocking failures={data.blockingFailures} />
      </PageSection>
    </>
  );
};
