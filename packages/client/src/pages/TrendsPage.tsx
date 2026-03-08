import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Grid,
  GridItem,
  Label,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TrendUpIcon, TrendDownIcon, EqualsIcon } from '@patternfly/react-icons';
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartGroup,
  ChartLegend,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { fetchTrends, fetchTrendsByVersion, fetchHeatmap, fetchTopFailures } from '../api/launches';
import { StatCard } from '../components/common/StatCard';
import type { VersionTrendPoint, HeatmapCell, TopFailingTest } from '@cnv-monitor/shared';

const VERSION_COLORS = ['#0066CC', '#C9190B', '#F0AB00', '#3E8635', '#6753AC', '#009596', '#EC7A08', '#B8BBBE'];

export const TrendsPage: React.FC = () => {
  useEffect(() => { document.title = 'Trends | CNV Console Monitor'; }, []);

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => fetchTrends('test-kubevirt-console', 30),
  });

  const { data: versionTrends, isLoading: versionLoading } = useQuery({
    queryKey: ['trendsByVersion'],
    queryFn: () => fetchTrendsByVersion(30),
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => fetchHeatmap(14, 20),
  });

  const { data: topFailures, isLoading: topLoading } = useQuery({
    queryKey: ['topFailures'],
    queryFn: () => fetchTopFailures(30, 15),
  });

  const summaryStats = useMemo(() => {
    if (!trends || trends.length === 0) return null;
    const totalLaunches = trends.reduce((s, t) => s + t.total, 0);
    const totalPassed = trends.reduce((s, t) => s + t.passed, 0);
    const overallRate = totalLaunches > 0 ? Math.round((totalPassed / totalLaunches) * 1000) / 10 : 0;
    return { overallRate, totalLaunches, totalTests: totalPassed };
  }, [trends]);

  const versionGroups = useMemo(() => {
    if (!versionTrends) return { versions: [] as string[], dates: [] as string[], byVersion: new Map<string, Map<string, number>>() };
    const versions = [...new Set(versionTrends.map((v: VersionTrendPoint) => v.version))].sort();
    const dates = [...new Set(versionTrends.map((v: VersionTrendPoint) => v.date))].sort();
    const byVersion = new Map<string, Map<string, number>>();
    for (const v of versions) byVersion.set(v, new Map());
    for (const point of versionTrends) {
      byVersion.get(point.version)?.set(point.date, point.rate);
    }
    return { versions, dates, byVersion };
  }, [versionTrends]);

  const heatmap = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return null;
    const tests: Array<{ unique_id: string; name: string; fail_count: number }> = [];
    const seen = new Set<string>();
    const dates = [...new Set(heatmapData.map((c: HeatmapCell) => c.date))].sort();
    const cellMap = new Map<string, string>();

    for (const cell of heatmapData) {
      if (!seen.has(cell.unique_id)) {
        seen.add(cell.unique_id);
        tests.push({ unique_id: cell.unique_id, name: cell.name, fail_count: cell.fail_count });
      }
      cellMap.set(`${cell.unique_id}|${cell.date}`, cell.status);
    }

    return { tests, dates, cellMap };
  }, [heatmapData]);

  const versionHealth = useMemo(() => {
    if (!versionTrends || versionTrends.length === 0) return { best: null, worst: null };
    const versionRates = new Map<string, number[]>();
    for (const p of versionTrends) {
      if (!versionRates.has(p.version)) versionRates.set(p.version, []);
      versionRates.get(p.version)!.push(p.rate);
    }
    let best: { version: string; rate: number } | null = null;
    let worst: { version: string; rate: number } | null = null;
    for (const [version, rates] of versionRates) {
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      if (!best || avg > best.rate) best = { version, rate: Math.round(avg * 10) / 10 };
      if (!worst || avg < worst.rate) worst = { version, rate: Math.round(avg * 10) / 10 };
    }
    return { best, worst };
  }, [versionTrends]);

  return (
    <>
      <PageSection>
        <Content component="h1">Trends</Content>
        <Content component="small">Test health analytics over the last 30 days</Content>
      </PageSection>

      {summaryStats && (
        <PageSection>
          <Gallery hasGutter minWidths={{ default: '150px' }}>
            <GalleryItem>
              <StatCard
                value={`${summaryStats.overallRate}%`}
                label="Overall Pass Rate"
                help="Average pass rate across all launches in the last 30 days"
                color={summaryStats.overallRate >= 95 ? 'var(--pf-t--global--color--status--success--default)' : summaryStats.overallRate >= 80 ? 'var(--pf-t--global--color--status--warning--default)' : 'var(--pf-t--global--color--status--danger--default)'}
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard value={summaryStats.totalLaunches} label="Total Launches" help="Number of test launches in the last 30 days" />
            </GalleryItem>
            {versionHealth.best && (
              <GalleryItem>
                <StatCard
                  value={`${versionHealth.best.version}`}
                  label={`Healthiest (${versionHealth.best.rate}%)`}
                  help="CNV version with the highest average pass rate"
                  color="var(--pf-t--global--color--status--success--default)"
                />
              </GalleryItem>
            )}
            {versionHealth.worst && versionHealth.worst.version !== versionHealth.best?.version && (
              <GalleryItem>
                <StatCard
                  value={`${versionHealth.worst.version}`}
                  label={`Needs Attention (${versionHealth.worst.rate}%)`}
                  help="CNV version with the lowest average pass rate"
                  color="var(--pf-t--global--color--status--danger--default)"
                />
              </GalleryItem>
            )}
            {topFailures && (
              <GalleryItem>
                <StatCard
                  value={topFailures.filter((t: TopFailingTest) => t.recent_trend === 'worsening').length}
                  label="Getting Worse"
                  help="Tests where failure rate increased in the second half of the period"
                  color="var(--pf-t--global--color--status--danger--default)"
                />
              </GalleryItem>
            )}
          </Gallery>
        </PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem span={12}>
            <Card>
              <CardBody>
                <Content component="h3" style={{ marginBottom: 16 }}>Pass Rate by Version</Content>
                {versionLoading ? (
                  <Spinner size="md" />
                ) : versionGroups.versions.length > 0 ? (
                  <div style={{ height: 350, width: '100%' }}>
                    <Chart
                      containerComponent={
                        <ChartVoronoiContainer
                          labels={({ datum }: { datum: { x: string; y: number; childName: string } }) => {
                            const version = datum.childName?.replace('chart-line-', '') || '';
                            return `${version}: ${datum.y}%`;
                          }}
                        />
                      }
                      height={300}
                      padding={{ bottom: 80, left: 60, right: 30, top: 20 }}
                      legendData={versionGroups.versions.map((v, i) => ({ name: v, symbol: { fill: VERSION_COLORS[i % VERSION_COLORS.length] } }))}
                      legendPosition="bottom"
                    >
                      <ChartAxis
                        tickValues={versionGroups.dates.filter((_, i) => i % Math.max(1, Math.floor(versionGroups.dates.length / 10)) === 0).map(d => d.slice(5))}
                        style={{ tickLabels: { angle: -45, textAnchor: 'end', fontSize: 10 } }}
                      />
                      <ChartAxis dependentAxis domain={[0, 100]} tickFormat={(t: number) => `${t}%`} />
                      <ChartGroup>
                        {versionGroups.versions.map((version, idx) => {
                          const versionData = versionGroups.byVersion.get(version)!;
                          return (
                            <ChartLine
                              key={version}
                              name={version}
                              data={versionGroups.dates.map(d => ({ x: d.slice(5), y: versionData.get(d) ?? null })).filter(d => d.y !== null)}
                              style={{ data: { stroke: VERSION_COLORS[idx % VERSION_COLORS.length], strokeWidth: 2 } }}
                            />
                          );
                        })}
                      </ChartGroup>
                    </Chart>
                  </div>
                ) : (
                  <Content>No version trend data available.</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={12}>
            <Card>
              <CardBody>
                <Content component="h3" style={{ marginBottom: 16 }}>Failure Heatmap (last 14 days)</Content>
                <Content component="small" style={{ marginBottom: 12 }}>Top failing tests vs dates. Red = failed that day, green = passed.</Content>
                {heatmapLoading ? (
                  <Spinner size="md" />
                ) : heatmap && heatmap.tests.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '4px 8px', minWidth: 200, position: 'sticky', left: 0, background: 'var(--pf-t--global--background--color--primary--default)' }}>Test</th>
                          {heatmap.dates.map(d => (
                            <th key={d} style={{ padding: '4px 2px', textAlign: 'center', fontSize: 10, whiteSpace: 'nowrap' }}>
                              {d.slice(5)}
                            </th>
                          ))}
                          <th style={{ padding: '4px 8px', textAlign: 'center' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmap.tests.map(test => (
                          <tr key={test.unique_id}>
                            <td style={{ padding: '3px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 250, position: 'sticky', left: 0, background: 'var(--pf-t--global--background--color--primary--default)' }}>
                              <Tooltip content={test.name}>
                                <span>{test.name.split('.').pop()}</span>
                              </Tooltip>
                            </td>
                            {heatmap.dates.map(date => {
                              const status = heatmap.cellMap.get(`${test.unique_id}|${date}`);
                              const color = status === 'FAILED' ? '#e74c3c' : '#2ecc71';
                              return (
                                <td key={date} style={{ padding: '3px 2px', textAlign: 'center' }}>
                                  <Tooltip content={`${date}: ${status === 'FAILED' ? 'Failed' : 'Passed'}`}>
                                    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 2, background: color, cursor: 'default' }} />
                                  </Tooltip>
                                </td>
                              );
                            })}
                            <td style={{ padding: '3px 8px', textAlign: 'center', fontWeight: 600 }}>{test.fail_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Content>No heatmap data available.</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={12}>
            <Card>
              <CardBody>
                <Content component="h3" style={{ marginBottom: 16 }}>Top Failing Tests (last 30 days)</Content>
                {topLoading ? (
                  <Spinner size="md" />
                ) : topFailures && topFailures.length > 0 ? (
                  <Table aria-label="Top failing tests" variant="compact">
                    <Thead>
                      <Tr>
                        <Th width={10}>#</Th>
                        <Th width={30}>Test</Th>
                        <Th width={10}>Failures</Th>
                        <Th width={10}>Runs</Th>
                        <Th width={20}>Failure Rate</Th>
                        <Th width={20}>Trend</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {topFailures.map((test: TopFailingTest, i: number) => {
                        const shortName = test.name.split('.').pop() || test.name;
                        const rateColor = test.failure_rate > 70 ? 'red' : test.failure_rate > 30 ? 'orange' : 'grey';
                        return (
                          <Tr key={test.unique_id}>
                            <Td dataLabel="#">{i + 1}</Td>
                            <Td dataLabel="Test">
                              <Tooltip content={test.name}><span>{shortName}</span></Tooltip>
                            </Td>
                            <Td dataLabel="Failures"><strong>{test.fail_count}</strong></Td>
                            <Td dataLabel="Runs">{test.total_runs}</Td>
                            <Td dataLabel="Failure Rate">
                              <Label color={rateColor} isCompact>{test.failure_rate}%</Label>
                            </Td>
                            <Td dataLabel="Trend">
                              {test.recent_trend === 'worsening' && (
                                <Tooltip content="Failing more in the second half of the period">
                                  <Label color="red" isCompact icon={<TrendUpIcon />}>Worse</Label>
                                </Tooltip>
                              )}
                              {test.recent_trend === 'improving' && (
                                <Tooltip content="Failing less in the second half of the period">
                                  <Label color="green" isCompact icon={<TrendDownIcon />}>Better</Label>
                                </Tooltip>
                              )}
                              {test.recent_trend === 'stable' && (
                                <Label color="grey" isCompact icon={<EqualsIcon />}>Stable</Label>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                ) : (
                  <Content>No failure data available.</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
