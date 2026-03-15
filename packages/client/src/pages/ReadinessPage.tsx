import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Banner,
  Button,
  EmptyState,
  EmptyStateBody,
  Gallery,
  GalleryItem,
  Spinner,
  Flex,
  FlexItem,
  Label,
  Tooltip,
  Bullseye,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationTriangleIcon, BanIcon, TrendUpIcon, TrendDownIcon, EqualsIcon } from '@patternfly/react-icons';
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartGroup,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { fetchReadiness, fetchReadinessVersions } from '../api/readiness';
import type { ReadinessAssessment, BlockingFailure } from '../api/readiness';
import { StatCard } from '../components/common/StatCard';

const RECOMMENDATION_CONFIG = {
  ready: { color: 'green' as const, icon: CheckCircleIcon, label: 'Ready to Ship', description: 'Pass rate ≥ 95% with no untriaged failures' },
  at_risk: { color: 'yellow' as const, icon: ExclamationTriangleIcon, label: 'At Risk', description: 'Some untriaged failures or moderate pass rate' },
  blocked: { color: 'red' as const, icon: BanIcon, label: 'Blocked', description: 'Pass rate < 80% or > 10 untriaged failures' },
};

const TREND_ICONS: Record<BlockingFailure['recent_trend'], React.ReactNode> = {
  worsening: <TrendUpIcon color="var(--pf-t--global--color--status--danger--default)" />,
  improving: <TrendDownIcon color="var(--pf-t--global--color--status--success--default)" />,
  stable: <EqualsIcon color="var(--pf-t--global--color--status--info--default)" />,
};

const VersionPicker: React.FC = () => {
  const navigate = useNavigate();

  const { data: versions, isLoading } = useQuery({
    queryKey: ['readinessVersions'],
    queryFn: fetchReadinessVersions,
  });

  if (isLoading) {
    return (
      <Bullseye style={{ minHeight: 300 }}>
        <Spinner aria-label="Loading versions" />
      </Bullseye>
    );
  }

  if (!versions?.length) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="No versions found">
          <EmptyStateBody>No CNV versions have been tracked yet.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">Version Readiness</Content>
        <Content component="small">Select a CNV version to assess ship-readiness</Content>
      </PageSection>
      <PageSection>
        <Gallery hasGutter minWidths={{ default: '250px' }}>
          {versions.map((v) => (
            <GalleryItem key={v}>
              <Card isClickable isSelectable onClick={() => navigate(`/readiness/${v}`)}>
                <CardBody>
                  <Content component="h3" style={{ textAlign: 'center' }}>{v}</Content>
                </CardBody>
              </Card>
            </GalleryItem>
          ))}
        </Gallery>
      </PageSection>
    </>
  );
};

const ReadinessDetail: React.FC<{ version: string }> = ({ version }) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Readiness: ${version} | CNV Console Monitor`;
  }, [version]);

  const { data: versions } = useQuery({
    queryKey: ['readinessVersions'],
    queryFn: fetchReadinessVersions,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['readiness', version],
    queryFn: () => fetchReadiness(version),
    enabled: !!version,
  });

  const trendData = useMemo(() => {
    if (!data?.trend?.length) return [];
    return data.trend.map((t) => ({ x: t.date.slice(5), y: t.rate }));
  }, [data]);

  if (isLoading) {
    return (
      <Bullseye style={{ minHeight: 300 }}>
        <Spinner aria-label="Loading readiness" />
      </Bullseye>
    );
  }

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
              <FlexItem>
                <Content component="h1">Readiness: {version}</Content>
              </FlexItem>
              {(versions?.length ?? 0) > 1 && (
                <FlexItem>
                  {versions!.filter((v) => v !== version).slice(0, 3).map((v) => (
                    <Button key={v} variant="link" size="sm" onClick={() => navigate(`/readiness/${v}`)} style={{ marginRight: 8 }}>
                      {v}
                    </Button>
                  ))}
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection style={{ paddingTop: 0, paddingBottom: 0 }}>
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
            <StatCard
              value={`${data.passRate}%`}
              label="Pass Rate"
              help="Percentage of tests passing across all launches for this version"
              color={data.passRate >= 95 ? 'var(--pf-t--global--color--status--success--default)' : data.passRate >= 80 ? 'var(--pf-t--global--color--status--warning--default)' : 'var(--pf-t--global--color--status--danger--default)'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard value={data.totalLaunches} label="Total Launches" help="Number of launches for this version in the lookback period" />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={data.failedLaunches}
              label="Failed Launches"
              help="Launches with FAILED or INTERRUPTED status"
              color={data.failedLaunches > 0 ? 'var(--pf-t--global--color--status--danger--default)' : undefined}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={data.untriagedCount}
              label="Untriaged"
              help="Failed test items not yet classified"
              color={data.untriagedCount > 0 ? 'var(--pf-t--global--color--status--warning--default)' : 'var(--pf-t--global--color--status--success--default)'}
            />
          </GalleryItem>
        </Gallery>
      </PageSection>

      {trendData.length > 1 && (
        <PageSection>
          <Card>
            <CardBody>
              <Content component="h3" style={{ marginBottom: 16 }}>Pass Rate Trend</Content>
              <div style={{ height: 300, width: '100%' }}>
                <Chart
                  containerComponent={
                    <ChartVoronoiContainer
                      labels={({ datum }: { datum: { x: string; y: number } }) => `${datum.x}: ${datum.y}%`}
                    />
                  }
                  height={250}
                  padding={{ bottom: 50, left: 60, right: 30, top: 20 }}
                >
                  <ChartAxis
                    tickValues={trendData.filter((_, i) => i % Math.max(1, Math.floor(trendData.length / 10)) === 0).map((d) => d.x)}
                    style={{ tickLabels: { angle: -45, textAnchor: 'end', fontSize: 10 } }}
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
        <Card>
          <CardBody>
            <Content component="h3" style={{ marginBottom: 16 }}>Blocking Failures</Content>
            {data.blockingFailures.length === 0 ? (
              <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="No blocking failures">
                <EmptyStateBody>All tests are passing for this version.</EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label="Blocking failures" variant="compact" isStickyHeader>
                <Thead>
                  <Tr>
                    <Th>Test Name</Th>
                    <Th>Fail Count</Th>
                    <Th>Total Runs</Th>
                    <Th>Failure Rate</Th>
                    <Th>Trend</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.blockingFailures.map((f) => {
                    const shortName = f.name.split('.').pop() || f.name;
                    return (
                      <Tr key={f.unique_id}>
                        <Td dataLabel="Test Name" className="app-cell-truncate">
                          <Tooltip content={f.name}>
                            <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(f.unique_id)}`)}>
                              {shortName}
                            </Button>
                          </Tooltip>
                        </Td>
                        <Td dataLabel="Fail Count" className="app-cell-nowrap">
                          <strong>{f.fail_count}</strong>
                        </Td>
                        <Td dataLabel="Total Runs" className="app-cell-nowrap">{f.total_runs}</Td>
                        <Td dataLabel="Failure Rate" className="app-cell-nowrap">
                          <Label color={f.failure_rate >= 50 ? 'red' : f.failure_rate >= 20 ? 'yellow' : 'blue'}>
                            {f.failure_rate}%
                          </Label>
                        </Td>
                        <Td dataLabel="Trend" className="app-cell-nowrap">
                          <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>{TREND_ICONS[f.recent_trend]}</FlexItem>
                            <FlexItem>{f.recent_trend}</FlexItem>
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};

export const ReadinessPage: React.FC = () => {
  const { version } = useParams<{ version?: string }>();

  useEffect(() => {
    if (!version) {
      document.title = 'Version Readiness | CNV Console Monitor';
    }
  }, [version]);

  if (!version) return <VersionPicker />;
  return <ReadinessDetail version={version} />;
};
