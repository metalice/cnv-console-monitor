import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection, Content, Card, CardBody, Banner, Button,
  EmptyState, EmptyStateBody, Gallery, GalleryItem,
  Spinner, Flex, FlexItem, Bullseye,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon, BanIcon } from '@patternfly/react-icons';
import {
  Chart, ChartAxis, ChartLine, ChartGroup, ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { fetchReadiness, fetchReadinessVersions } from '../../api/readiness';
import { StatCard } from '../common/StatCard';
import { ReadinessBlocking } from './ReadinessBlocking';

const RECOMMENDATION_CONFIG = {
  ready: { color: 'green' as const, icon: CheckCircleIcon, label: 'Ready to Ship', description: 'Pass rate ≥ 95% with no untriaged failures' },
  at_risk: { color: 'yellow' as const, icon: ExclamationTriangleIcon, label: 'At Risk', description: 'Some untriaged failures or moderate pass rate' },
  blocked: { color: 'red' as const, icon: BanIcon, label: 'Blocked', description: 'Pass rate < 80% or > 10 untriaged failures' },
};

export const ReadinessDetails: React.FC<{ version: string }> = ({ version }) => {
  const navigate = useNavigate();

  useEffect(() => { document.title = `Readiness: ${version} | CNV Console Monitor`; }, [version]);

  const { data: versions } = useQuery({ queryKey: ['readinessVersions'], queryFn: fetchReadinessVersions, staleTime: 5 * 60 * 1000 });
  const { data, isLoading, error } = useQuery({ queryKey: ['readiness', version], queryFn: () => fetchReadiness(version), enabled: !!version });

  const trendData = useMemo(() => {
    if (!data?.trend?.length) return [];
    return data.trend.map((point) => ({ x: point.date.slice(5), y: point.rate }));
  }, [data]);

  if (isLoading) return <Bullseye className="app-min-h-300"><Spinner aria-label="Loading readiness" /></Bullseye>;

  if (error) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="Error loading readiness data">
          <EmptyStateBody>{(error as Error).message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!data) return null;

  const cfg = RECOMMENDATION_CONFIG[data.recommendation];
  const Icon = cfg.icon;

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem><Content component="h1">Readiness: {version}</Content></FlexItem>
              {(versions?.length ?? 0) > 1 && (
                <FlexItem>
                  {versions!.filter((ver) => ver !== version).slice(0, 3).map((ver) => (
                    <Button key={ver} variant="link" size="sm" onClick={() => navigate(`/readiness/${ver}`)} className="app-mr-sm">{ver}</Button>
                  ))}
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Banner color={cfg.color} screenReaderText={cfg.label}>
          <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem><Icon /></FlexItem>
            <FlexItem><strong>{cfg.label}</strong> — {cfg.description}</FlexItem>
          </Flex>
        </Banner>
      </PageSection>

      <PageSection>
        <Gallery hasGutter minWidths={{ default: '160px' }}>
          <GalleryItem>
            <StatCard value={`${data.passRate}%`} label="Pass Rate" help="Percentage of tests passing across all launches for this version"
              color={data.passRate >= 95 ? 'var(--pf-t--global--color--status--success--default)' : data.passRate >= 80 ? 'var(--pf-t--global--color--status--warning--default)' : 'var(--pf-t--global--color--status--danger--default)'} />
          </GalleryItem>
          <GalleryItem><StatCard value={data.totalLaunches} label="Total Launches" help="Number of launches for this version in the lookback period" /></GalleryItem>
          <GalleryItem>
            <StatCard value={data.failedLaunches} label="Failed Launches" help="Launches with FAILED or INTERRUPTED status"
              color={data.failedLaunches > 0 ? 'var(--pf-t--global--color--status--danger--default)' : undefined} />
          </GalleryItem>
          <GalleryItem>
            <StatCard value={data.untriagedCount} label="Untriaged" help="Failed test items not yet classified"
              color={data.untriagedCount > 0 ? 'var(--pf-t--global--color--status--warning--default)' : 'var(--pf-t--global--color--status--success--default)'} />
          </GalleryItem>
        </Gallery>
      </PageSection>

      {trendData.length > 1 && (
        <PageSection>
          <Card>
            <CardBody>
              <Content component="h3" className="app-section-heading">Pass Rate Trend</Content>
              <div className="app-chart-container-sm">
                <Chart
                  containerComponent={<ChartVoronoiContainer labels={({ datum }: { datum: { x: string; y: number } }) => `${datum.x}: ${datum.y}%`} />}
                  height={250} padding={{ bottom: 50, left: 60, right: 30, top: 20 }}
                >
                  <ChartAxis
                    tickValues={trendData.filter((_, index) => index % Math.max(1, Math.floor(trendData.length / 10)) === 0).map((point) => point.x)}
                    style={{ tickLabels: { angle: -45, textAnchor: 'end', fontSize: 10 } }}
                  />
                  <ChartAxis dependentAxis domain={[0, 100]} tickFormat={(t: number) => `${t}%`} />
                  <ChartGroup><ChartLine data={trendData} style={{ data: { stroke: '#0066CC', strokeWidth: 2 } }} /></ChartGroup>
                </Chart>
              </div>
            </CardBody>
          </Card>
        </PageSection>
      )}

      <PageSection><ReadinessBlocking failures={data.blockingFailures} /></PageSection>
    </>
  );
};
