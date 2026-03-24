import React, { useEffect, useMemo } from 'react';

import type { TopFailingTest } from '@cnv-monitor/shared';

import {
  Button,
  Content,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Grid,
  GridItem,
  PageSection,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import {
  fetchAIAccuracy,
  fetchClusterReliability,
  fetchDefectTypesTrend,
  fetchErrorPatterns,
  fetchFailuresByHour,
  fetchHeatmap,
  fetchTopFailures,
  fetchTrends,
  fetchTrendsByVersion,
} from '../api/launches';
import { StatCard } from '../components/common/StatCard';
import { AIAccuracyTable } from '../components/trends/AIAccuracyTable';
import { ClusterReliabilityTable } from '../components/trends/ClusterReliabilityTable';
import { DefectTypeTrendChart } from '../components/trends/DefectTypeTrendChart';
import { ErrorPatternsTable } from '../components/trends/ErrorPatternsTable';
import { HeatmapTable } from '../components/trends/HeatmapTable';
import { HourlyFailuresChart } from '../components/trends/HourlyFailuresChart';
import { TopFailuresTable } from '../components/trends/TopFailuresTable';
import {
  buildAIMatrix,
  buildHeatmap,
  buildVersionGroups,
  computeSummaryStats,
  computeVersionHealth,
} from '../components/trends/trendUtils';
import { VersionTrendChart } from '../components/trends/VersionTrendChart';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { exportCsv } from '../utils/csvExport';

export const TrendsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Trends | CNV Console Monitor';
  }, []);

  const { selectedComponent } = useComponentFilter();

  const { data: trends } = useQuery({
    queryFn: () => fetchTrends('', 30, selectedComponent),
    queryKey: ['trends', selectedComponent],
  });
  const { data: versionTrends, isLoading: versionLoading } = useQuery({
    queryFn: () => fetchTrendsByVersion(30, selectedComponent),
    queryKey: ['trendsByVersion', selectedComponent],
  });
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryFn: () => fetchHeatmap(14, 20, selectedComponent),
    queryKey: ['heatmap', selectedComponent],
  });
  const { data: topFailures, isLoading: topLoading } = useQuery({
    queryFn: () => fetchTopFailures(30, 15, selectedComponent),
    queryKey: ['topFailures', selectedComponent],
  });
  const { data: aiAccuracy } = useQuery({
    queryFn: () => fetchAIAccuracy(90, selectedComponent),
    queryKey: ['aiAccuracy', selectedComponent],
  });
  const { data: clusterData } = useQuery({
    queryFn: () => fetchClusterReliability(30, selectedComponent),
    queryKey: ['clusterReliability', selectedComponent],
  });
  const { data: errorPatterns } = useQuery({
    queryFn: () => fetchErrorPatterns(30, 10, selectedComponent),
    queryKey: ['errorPatterns', selectedComponent],
  });
  const { data: defectTrend } = useQuery({
    queryFn: () => fetchDefectTypesTrend(90, selectedComponent),
    queryKey: ['defectTypesTrend', selectedComponent],
  });
  const { data: hourlyData } = useQuery({
    queryFn: () => fetchFailuresByHour(30, selectedComponent),
    queryKey: ['failuresByHour', selectedComponent],
  });

  const summaryStats = useMemo(() => computeSummaryStats(trends), [trends]);
  const versionGroups = useMemo(() => buildVersionGroups(versionTrends), [versionTrends]);
  const heatmap = useMemo(() => buildHeatmap(heatmapData), [heatmapData]);
  const aiMatrix = useMemo(() => buildAIMatrix(aiAccuracy), [aiAccuracy]);
  const versionHealth = useMemo(() => computeVersionHealth(versionTrends), [versionTrends]);

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Trends</Content>
            <Content component="small">Test health analytics over the last 30 days</Content>
          </FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <Button
                  icon={<DownloadIcon />}
                  isDisabled={!topFailures?.length}
                  variant="secondary"
                  onClick={() => {
                    if (!topFailures) {
                      return;
                    }
                    exportCsv(
                      'top-failures.csv',
                      ['Test Name', 'Failures', 'Total Runs', 'Failure Rate', 'Trend'],
                      topFailures.map(test => [
                        test.name,
                        test.fail_count,
                        test.total_runs,
                        `${test.failure_rate}%`,
                        test.recent_trend,
                      ]),
                    );
                  }}
                >
                  Export
                </Button>
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
                color={
                  summaryStats.overallRate >= 95
                    ? 'var(--pf-t--global--color--status--success--default)'
                    : summaryStats.overallRate >= 80
                      ? 'var(--pf-t--global--color--status--warning--default)'
                      : 'var(--pf-t--global--color--status--danger--default)'
                }
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
                    topFailures.filter((test: TopFailingTest) => test.recent_trend === 'worsening')
                      .length
                  }
                />
              </GalleryItem>
            )}
          </Gallery>
        </PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem md={6} span={12}>
            <VersionTrendChart isLoading={versionLoading} versionGroups={versionGroups} />
          </GridItem>
          <GridItem md={6} span={12}>
            <HeatmapTable heatmap={heatmap} isLoading={heatmapLoading} />
          </GridItem>
          <GridItem span={12}>
            <TopFailuresTable isLoading={topLoading} topFailures={topFailures} />
          </GridItem>
          {aiMatrix && (
            <GridItem span={6}>
              <AIAccuracyTable aiMatrix={aiMatrix} />
            </GridItem>
          )}
          {hourlyData && hourlyData.length > 0 && (
            <GridItem span={6}>
              <HourlyFailuresChart hourlyData={hourlyData} />
            </GridItem>
          )}
          {clusterData && clusterData.length > 0 && (
            <GridItem span={12}>
              <ClusterReliabilityTable clusterData={clusterData} />
            </GridItem>
          )}
          {defectTrend && defectTrend.length > 0 && (
            <GridItem span={12}>
              <DefectTypeTrendChart defectTrend={defectTrend} />
            </GridItem>
          )}
          {errorPatterns && errorPatterns.length > 0 && (
            <GridItem span={12}>
              <ErrorPatternsTable errorPatterns={errorPatterns} />
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
};
