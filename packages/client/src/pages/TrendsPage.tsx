import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageSection, Content, Button, Gallery, GalleryItem, Grid, GridItem, Flex, FlexItem } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { fetchTrends, fetchTrendsByVersion, fetchHeatmap, fetchTopFailures, fetchAIAccuracy, fetchClusterReliability, fetchErrorPatterns, fetchDefectTypesTrend, fetchFailuresByHour } from '../api/launches';
import { apiFetch } from '../api/client';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { usePreferences } from '../context/PreferencesContext';
import { StatCard } from '../components/common/StatCard';
import { exportCsv } from '../utils/csvExport';
import { buildVersionGroups, buildHeatmap, buildAIMatrix, computeVersionHealth, computeSummaryStats } from '../components/trends/trendUtils';
import { VersionTrendChart } from '../components/trends/VersionTrendChart';
import { HeatmapTable } from '../components/trends/HeatmapTable';
import { TopFailuresTable } from '../components/trends/TopFailuresTable';
import { AIAccuracyTable } from '../components/trends/AIAccuracyTable';
import { HourlyFailuresChart } from '../components/trends/HourlyFailuresChart';
import { ClusterReliabilityTable } from '../components/trends/ClusterReliabilityTable';
import { DefectTypeTrendChart } from '../components/trends/DefectTypeTrendChart';
import { ErrorPatternsTable } from '../components/trends/ErrorPatternsTable';
import type { TopFailingTest } from '@cnv-monitor/shared';

export const TrendsPage: React.FC = () => {
  useEffect(() => { document.title = 'Trends | CNV Console Monitor'; }, []);

  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedComponentsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (value: Set<string>) => { setSelectedComponentsState(value); setPreference('dashboardComponents', [...value]); };
  const selectedComponent = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;

  const { data: availableComponents } = useQuery({ queryKey: ['availableComponents'], queryFn: () => apiFetch<string[]>('/launches/components'), staleTime: 5 * 60 * 1000 });
  const { data: trends } = useQuery({ queryKey: ['trends', selectedComponent], queryFn: () => fetchTrends('', 30, selectedComponent) });
  const { data: versionTrends, isLoading: versionLoading } = useQuery({ queryKey: ['trendsByVersion', selectedComponent], queryFn: () => fetchTrendsByVersion(30, selectedComponent) });
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({ queryKey: ['heatmap', selectedComponent], queryFn: () => fetchHeatmap(14, 20, selectedComponent) });
  const { data: topFailures, isLoading: topLoading } = useQuery({ queryKey: ['topFailures', selectedComponent], queryFn: () => fetchTopFailures(30, 15, selectedComponent) });
  const { data: aiAccuracy } = useQuery({ queryKey: ['aiAccuracy', selectedComponent], queryFn: () => fetchAIAccuracy(90, selectedComponent) });
  const { data: clusterData } = useQuery({ queryKey: ['clusterReliability', selectedComponent], queryFn: () => fetchClusterReliability(30, selectedComponent) });
  const { data: errorPatterns } = useQuery({ queryKey: ['errorPatterns', selectedComponent], queryFn: () => fetchErrorPatterns(30, 10, selectedComponent) });
  const { data: defectTrend } = useQuery({ queryKey: ['defectTypesTrend', selectedComponent], queryFn: () => fetchDefectTypesTrend(90, selectedComponent) });
  const { data: hourlyData } = useQuery({ queryKey: ['failuresByHour', selectedComponent], queryFn: () => fetchFailuresByHour(30, selectedComponent) });

  const summaryStats = useMemo(() => computeSummaryStats(trends), [trends]);
  const versionGroups = useMemo(() => buildVersionGroups(versionTrends), [versionTrends]);
  const heatmap = useMemo(() => buildHeatmap(heatmapData), [heatmapData]);
  const aiMatrix = useMemo(() => buildAIMatrix(aiAccuracy), [aiAccuracy]);
  const versionHealth = useMemo(() => computeVersionHealth(versionTrends), [versionTrends]);

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
                  <ComponentMultiSelect id="trends-component" selected={selectedComponents} options={availableComponents ?? []} onChange={setSelectedComponents} />
                </FlexItem>
              )}
              <FlexItem>
                <Button variant="secondary" icon={<DownloadIcon />} isDisabled={!topFailures?.length} onClick={() => {
                  if (!topFailures) return;
                  exportCsv('top-failures.csv', ['Test Name', 'Failures', 'Total Runs', 'Failure Rate', 'Trend'], topFailures.map(test => [test.name, test.fail_count, test.total_runs, `${test.failure_rate}%`, test.recent_trend]));
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
                value={`${summaryStats.overallRate}%`} label="Overall Pass Rate" help="Average pass rate across all launches in the last 30 days"
                color={summaryStats.overallRate >= 95 ? 'var(--pf-t--global--color--status--success--default)' : summaryStats.overallRate >= 80 ? 'var(--pf-t--global--color--status--warning--default)' : 'var(--pf-t--global--color--status--danger--default)'}
              />
            </GalleryItem>
            <GalleryItem><StatCard value={summaryStats.totalLaunches} label="Total Launches" help="Number of test launches in the last 30 days" /></GalleryItem>
            {versionHealth.best && (
              <GalleryItem><StatCard value={versionHealth.best.version} label={`Healthiest (${versionHealth.best.rate}%)`} help="CNV version with the highest average pass rate" color="var(--pf-t--global--color--status--success--default)" /></GalleryItem>
            )}
            {versionHealth.worst && versionHealth.worst.version !== versionHealth.best?.version && (
              <GalleryItem><StatCard value={versionHealth.worst.version} label={`Needs Attention (${versionHealth.worst.rate}%)`} help="CNV version with the lowest average pass rate" color="var(--pf-t--global--color--status--danger--default)" /></GalleryItem>
            )}
            {topFailures && (
              <GalleryItem><StatCard value={topFailures.filter((test: TopFailingTest) => test.recent_trend === 'worsening').length} label="Getting Worse" help="Tests where failure rate increased in the second half of the period" color="var(--pf-t--global--color--status--danger--default)" /></GalleryItem>
            )}
          </Gallery>
        </PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem span={12} md={6}><VersionTrendChart isLoading={versionLoading} versionGroups={versionGroups} /></GridItem>
          <GridItem span={12} md={6}><HeatmapTable isLoading={heatmapLoading} heatmap={heatmap} /></GridItem>
          <GridItem span={12}><TopFailuresTable isLoading={topLoading} topFailures={topFailures} /></GridItem>
          {aiMatrix && <GridItem span={6}><AIAccuracyTable aiMatrix={aiMatrix} /></GridItem>}
          {hourlyData && hourlyData.length > 0 && <GridItem span={6}><HourlyFailuresChart hourlyData={hourlyData} /></GridItem>}
          {clusterData && clusterData.length > 0 && <GridItem span={12}><ClusterReliabilityTable clusterData={clusterData} /></GridItem>}
          {defectTrend && defectTrend.length > 0 && <GridItem span={12}><DefectTypeTrendChart defectTrend={defectTrend} /></GridItem>}
          {errorPatterns && errorPatterns.length > 0 && <GridItem span={12}><ErrorPatternsTable errorPatterns={errorPatterns} /></GridItem>}
        </Grid>
      </PageSection>
    </>
  );
};
