import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Gallery,
  GalleryItem,
  Grid,
  GridItem,
  Label,
  Spinner,
  Tooltip,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TrendUpIcon, TrendDownIcon, EqualsIcon, DownloadIcon } from '@patternfly/react-icons';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLine,
  ChartGroup,
  ChartStack,
  ChartArea,
  ChartLegend,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { fetchTrends, fetchTrendsByVersion, fetchHeatmap, fetchTopFailures, fetchAIAccuracy, fetchClusterReliability, fetchErrorPatterns, fetchDefectTypesTrend, fetchFailuresByHour } from '../api/launches';
import { apiFetch } from '../api/client';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { usePreferences } from '../context/PreferencesContext';
import { StatCard } from '../components/common/StatCard';
import { exportCsv } from '../utils/csvExport';
import type { VersionTrendPoint, HeatmapCell, TopFailingTest, AIPredictionAccuracy, ClusterReliability, DefectTypeTrend, HourlyFailure } from '@cnv-monitor/shared';

const VERSION_COLORS = ['#0066CC', '#C9190B', '#F0AB00', '#3E8635', '#6753AC', '#009596', '#EC7A08', '#B8BBBE'];

export const TrendsPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Trends | CNV Console Monitor'; }, []);

  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedComponentsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (val: Set<string>) => { setSelectedComponentsState(val); setPreference('dashboardComponents', [...val]); };
  const comp = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;

  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => apiFetch<string[]>('/launches/components'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', comp],
    queryFn: () => fetchTrends('', 30, comp),
  });

  const { data: versionTrends, isLoading: versionLoading } = useQuery({
    queryKey: ['trendsByVersion', comp],
    queryFn: () => fetchTrendsByVersion(30, comp),
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap', comp],
    queryFn: () => fetchHeatmap(14, 20, comp),
  });

  const { data: topFailures, isLoading: topLoading } = useQuery({
    queryKey: ['topFailures', comp],
    queryFn: () => fetchTopFailures(30, 15, comp),
  });

  const { data: aiAccuracy } = useQuery({
    queryKey: ['aiAccuracy', comp],
    queryFn: () => fetchAIAccuracy(90, comp),
  });

  const { data: clusterData } = useQuery({
    queryKey: ['clusterReliability', comp],
    queryFn: () => fetchClusterReliability(30, comp),
  });

  const { data: errorPatterns } = useQuery({
    queryKey: ['errorPatterns', comp],
    queryFn: () => fetchErrorPatterns(30, 10, comp),
  });

  const { data: defectTrend } = useQuery({
    queryKey: ['defectTypesTrend', comp],
    queryFn: () => fetchDefectTypesTrend(90, comp),
  });

  const { data: hourlyData } = useQuery({
    queryKey: ['failuresByHour', comp],
    queryFn: () => fetchFailuresByHour(30, comp),
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

  const aiMatrix = useMemo(() => {
    if (!aiAccuracy || aiAccuracy.length === 0) return null;
    const predictions = [...new Set(aiAccuracy.map((a: AIPredictionAccuracy) => a.prediction))];
    const actuals = [...new Set(aiAccuracy.map((a: AIPredictionAccuracy) => a.actual))];
    const matrix = new Map<string, Map<string, number>>();
    const totals = new Map<string, number>();
    for (const p of predictions) { matrix.set(p, new Map()); totals.set(p, 0); }
    for (const entry of aiAccuracy) {
      matrix.get(entry.prediction)?.set(entry.actual, entry.count);
      totals.set(entry.prediction, (totals.get(entry.prediction) || 0) + entry.count);
    }
    const accuracies = predictions.map(p => {
      const shortP = p.replace('Predicted ', '');
      const correct = matrix.get(p)?.get(shortP) || 0;
      const total = totals.get(p) || 1;
      return { prediction: p, accuracy: Math.round((correct / total) * 100) };
    });
    return { predictions, actuals, matrix, totals, accuracies };
  }, [aiAccuracy]);

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
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Trends</Content>
            <Content component="small">Test health analytics over the last 30 days</Content>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              {(availableComponents?.length ?? 0) > 0 && (
                <FlexItem>
                  <ComponentMultiSelect
                    id="trends-component"
                    selected={selectedComponents}
                    options={availableComponents ?? []}
                    onChange={setSelectedComponents}
                  />
                </FlexItem>
              )}
              <FlexItem>
                <Button variant="secondary" icon={<DownloadIcon />} isDisabled={!topFailures?.length} onClick={() => {
                  if (!topFailures) return;
                  exportCsv('top-failures.csv',
                    ['Test Name', 'Failures', 'Total Runs', 'Failure Rate', 'Trend'],
                    topFailures.map(t => [t.name, t.fail_count, t.total_runs, `${t.failure_rate}%`, t.recent_trend]),
                  );
                }}>Export</Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
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
          <GridItem span={12} md={6}>
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

          <GridItem span={12} md={6}>
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
                              const color = status === 'FAILED' ? '#e74c3c' : status === 'PASSED' ? '#2ecc71' : '#d2d2d2';
                              const label = status === 'FAILED' ? 'Failed' : status === 'PASSED' ? 'Passed' : 'No run';
                              return (
                                <td key={date} style={{ padding: '3px 2px', textAlign: 'center' }}>
                                  <Tooltip content={`${date}: ${label}`}>
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
                  <div className="app-table-scroll">
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
                            <Td dataLabel="#" className="app-cell-nowrap">{i + 1}</Td>
                            <Td dataLabel="Test" className="app-cell-truncate">
                              <Tooltip content={test.name}>
                                <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(test.unique_id)}`)}>
                                  {shortName}
                                </Button>
                              </Tooltip>
                            </Td>
                            <Td dataLabel="Failures" className="app-cell-nowrap"><strong>{test.fail_count}</strong></Td>
                            <Td dataLabel="Runs" className="app-cell-nowrap">{test.total_runs}</Td>
                            <Td dataLabel="Failure Rate" className="app-cell-nowrap">
                              <Label color={rateColor} isCompact>{test.failure_rate}%</Label>
                            </Td>
                            <Td dataLabel="Trend" className="app-cell-nowrap">
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
                  </div>
                ) : (
                  <Content>No failure data available.</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>
          {/* AI Prediction Accuracy */}
          {aiMatrix && (
            <GridItem span={6}>
              <Card>
                <CardBody>
                  <Content component="h3" style={{ marginBottom: 16 }}>AI Prediction Accuracy</Content>
                  <Content component="small" style={{ marginBottom: 12 }}>How often RP's AI prediction matches the actual triage classification (last 90 days)</Content>
                  <div className="app-table-scroll">
                  <Table aria-label="AI accuracy" variant="compact">
                    <Thead>
                      <Tr>
                        <Th className="app-cell-nowrap">AI Predicted</Th>
                        <Th>Accuracy</Th>
                        {aiMatrix.actuals.map(a => <Th key={a} className="app-cell-nowrap">{a}</Th>)}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {aiMatrix.predictions.map(p => {
                        const acc = aiMatrix.accuracies.find(a => a.prediction === p);
                        const accColor = (acc?.accuracy || 0) > 60 ? 'green' : (acc?.accuracy || 0) > 30 ? 'orange' : 'red';
                        return (
                          <Tr key={p}>
                            <Td className="app-cell-nowrap"><strong>{p.replace('Predicted ', '')}</strong></Td>
                            <Td><Label color={accColor} isCompact>{acc?.accuracy || 0}%</Label></Td>
                            {aiMatrix.actuals.map(a => {
                              const val = aiMatrix.matrix.get(p)?.get(a) || 0;
                              return <Td key={a}>{val || '-'}</Td>;
                            })}
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Failure Rate by Hour */}
          {hourlyData && hourlyData.length > 0 && (
            <GridItem span={6}>
              <Card>
                <CardBody>
                  <Content component="h3" style={{ marginBottom: 16 }}>Failure Rate by Hour</Content>
                  <Content component="small" style={{ marginBottom: 12 }}>When do failures happen most? (last 30 days)</Content>
                  <div style={{ height: 300, width: '100%' }}>
                    <Chart
                      height={250}
                      padding={{ bottom: 60, left: 60, right: 20, top: 20 }}
                      containerComponent={
                        <ChartVoronoiContainer
                          labels={({ datum }: { datum: { x: string; y: number } }) => `${datum.x}: ${datum.y}%`}
                        />
                      }
                    >
                      <ChartAxis
                        style={{ tickLabels: { fontSize: 9, angle: -45, textAnchor: 'end' } }}
                      />
                      <ChartAxis dependentAxis tickFormat={(t: number) => `${t}%`} />
                      <ChartBar
                        data={hourlyData.map((h: HourlyFailure) => ({ x: `${String(h.hour).padStart(2, '0')}:00`, y: h.failRate }))}
                        style={{ data: { fill: '#0066CC' } }}
                      />
                    </Chart>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Cluster Reliability */}
          {clusterData && clusterData.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardBody>
                  <Content component="h3" style={{ marginBottom: 16 }}>Cluster Reliability (last 30 days)</Content>
                  <div className="app-table-scroll">
                  <Table aria-label="Cluster reliability" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Cluster</Th>
                        <Th>Launches</Th>
                        <Th>Passed</Th>
                        <Th>Failed</Th>
                        <Th>Pass Rate</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {clusterData.map((c: ClusterReliability) => {
                        const rateColor = c.passRate > 80 ? 'green' : c.passRate > 50 ? 'orange' : 'red';
                        return (
                          <Tr key={c.cluster}>
                            <Td className="app-cell-nowrap"><strong>{c.cluster}</strong></Td>
                            <Td>{c.total}</Td>
                            <Td>{c.passed}</Td>
                            <Td>{c.failed}</Td>
                            <Td>
                              <Label color={rateColor} isCompact>{c.passRate}%</Label>
                              <div style={{ width: '100%', maxWidth: 150, height: 6, background: 'var(--pf-t--global--border--color--default)', borderRadius: 3, marginTop: 4 }}>
                                <div style={{ width: `${c.passRate}%`, height: '100%', background: rateColor === 'green' ? '#3E8635' : rateColor === 'orange' ? '#F0AB00' : '#C9190B', borderRadius: 3 }} />
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Defect Type Breakdown Over Time */}
          {defectTrend && defectTrend.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardBody>
                  <Content component="h3" style={{ marginBottom: 16 }}>Defect Classification Trend (last 90 days)</Content>
                  <Content component="small" style={{ marginBottom: 12 }}>Weekly breakdown of how failures are classified</Content>
                  <div style={{ height: 350, width: '100%' }}>
                    <Chart
                      height={300}
                      padding={{ bottom: 80, left: 60, right: 30, top: 20 }}
                      legendData={[
                        { name: 'Product Bug', symbol: { fill: '#C9190B' } },
                        { name: 'Automation Bug', symbol: { fill: '#F0AB00' } },
                        { name: 'System Issue', symbol: { fill: '#0066CC' } },
                        { name: 'No Defect', symbol: { fill: '#3E8635' } },
                        { name: 'To Investigate', symbol: { fill: '#B8BBBE' } },
                      ]}
                      legendPosition="bottom"
                    >
                      <ChartAxis
                        tickValues={defectTrend.filter((_: DefectTypeTrend, i: number) => i % Math.max(1, Math.floor(defectTrend.length / 8)) === 0).map((d: DefectTypeTrend) => d.week.slice(5))}
                        style={{ tickLabels: { angle: -45, textAnchor: 'end', fontSize: 10 } }}
                      />
                      <ChartAxis dependentAxis />
                      <ChartStack>
                        <ChartArea data={defectTrend.map((d: DefectTypeTrend) => ({ x: d.week.slice(5), y: d.productBug }))} style={{ data: { fill: '#C9190B', fillOpacity: 0.7 } }} />
                        <ChartArea data={defectTrend.map((d: DefectTypeTrend) => ({ x: d.week.slice(5), y: d.automationBug }))} style={{ data: { fill: '#F0AB00', fillOpacity: 0.7 } }} />
                        <ChartArea data={defectTrend.map((d: DefectTypeTrend) => ({ x: d.week.slice(5), y: d.systemIssue }))} style={{ data: { fill: '#0066CC', fillOpacity: 0.7 } }} />
                        <ChartArea data={defectTrend.map((d: DefectTypeTrend) => ({ x: d.week.slice(5), y: d.noDefect }))} style={{ data: { fill: '#3E8635', fillOpacity: 0.7 } }} />
                        <ChartArea data={defectTrend.map((d: DefectTypeTrend) => ({ x: d.week.slice(5), y: d.toInvestigate }))} style={{ data: { fill: '#B8BBBE', fillOpacity: 0.7 } }} />
                      </ChartStack>
                    </Chart>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Error Pattern Analysis */}
          {errorPatterns && errorPatterns.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardBody>
                  <Content component="h3" style={{ marginBottom: 16 }}>Top Error Patterns (last 30 days)</Content>
                  <Content component="small" style={{ marginBottom: 12 }}>Most common error messages across all failures. High counts indicate systemic issues.</Content>
                  <div className="app-table-scroll">
                  <Table aria-label="Error patterns" variant="compact">
                    <Thead>
                      <Tr>
                        <Th width={50}>Error Pattern</Th>
                        <Th width={10}>Occurrences</Th>
                        <Th width={10}>Unique Tests</Th>
                        <Th width={15}>First Seen</Th>
                        <Th width={15}>Last Seen</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {errorPatterns.map((e, i) => (
                        <Tr key={i}>
                          <Td dataLabel="Error" className="app-cell-truncate">
                            <Tooltip content={e.pattern}>
                              <span style={{ fontFamily: 'var(--pf-t--global--font--family--mono)', fontSize: 'var(--pf-t--global--font--size--xs)' }}>
                                {e.pattern}
                              </span>
                            </Tooltip>
                          </Td>
                          <Td dataLabel="Occurrences"><strong>{e.count}</strong></Td>
                          <Td dataLabel="Tests">{e.uniqueTests}</Td>
                          <Td dataLabel="First" className="app-cell-nowrap">{e.firstSeen}</Td>
                          <Td dataLabel="Last" className="app-cell-nowrap">{e.lastSeen}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
};
