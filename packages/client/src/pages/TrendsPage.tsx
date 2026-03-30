import { useEffect } from 'react';

import {
  Button,
  Content,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageSection,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';

import { AIAccuracyTable } from '../components/trends/AIAccuracyTable';
import { ClusterReliabilityTable } from '../components/trends/ClusterReliabilityTable';
import { DefectTypeTrendChart } from '../components/trends/DefectTypeTrendChart';
import { ErrorPatternsTable } from '../components/trends/ErrorPatternsTable';
import { HeatmapTable } from '../components/trends/HeatmapTable';
import { HourlyFailuresChart } from '../components/trends/HourlyFailuresChart';
import { TopFailuresTable } from '../components/trends/TopFailuresTable';
import { VersionTrendChart } from '../components/trends/VersionTrendChart';
import { exportCsv } from '../utils/csvExport';

import { TrendsSummaryStats } from './TrendsSummaryStats';
import { useTrendsQueries } from './useTrendsQueries';

export const TrendsPage = () => {
  useEffect(() => {
    document.title = 'Trends | CNV Console Monitor';
  }, []);

  const data = useTrendsQueries();

  const handleExport = () => {
    if (!data.topFailures) return;
    exportCsv(
      'top-failures.csv',
      ['Test Name', 'Failures', 'Total Runs', 'Failure Rate', 'Trend'],
      data.topFailures.map(test => [
        test.name,
        test.fail_count,
        test.total_runs,
        `${test.failure_rate}%`,
        test.recent_trend,
      ]),
    );
  };

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
            <Button
              icon={<DownloadIcon />}
              isDisabled={!data.topFailures?.length}
              variant="secondary"
              onClick={handleExport}
            >
              Export
            </Button>
          </FlexItem>
        </Flex>
      </PageSection>

      {data.summaryStats && (
        <TrendsSummaryStats
          summaryStats={data.summaryStats}
          topFailures={data.topFailures}
          versionHealth={data.versionHealth}
        />
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem md={6} span={12}>
            <VersionTrendChart isLoading={data.versionLoading} versionGroups={data.versionGroups} />
          </GridItem>
          <GridItem md={6} span={12}>
            <HeatmapTable heatmap={data.heatmap} isLoading={data.heatmapLoading} />
          </GridItem>
          <GridItem span={12}>
            <TopFailuresTable isLoading={data.topLoading} topFailures={data.topFailures} />
          </GridItem>
          {data.aiMatrix && (
            <GridItem span={6}>
              <AIAccuracyTable aiMatrix={data.aiMatrix} />
            </GridItem>
          )}
          {data.hourlyData && data.hourlyData.length > 0 && (
            <GridItem span={6}>
              <HourlyFailuresChart hourlyData={data.hourlyData} />
            </GridItem>
          )}
          {data.clusterData && data.clusterData.length > 0 && (
            <GridItem span={12}>
              <ClusterReliabilityTable clusterData={data.clusterData} />
            </GridItem>
          )}
          {data.defectTrend && data.defectTrend.length > 0 && (
            <GridItem span={12}>
              <DefectTypeTrendChart defectTrend={data.defectTrend} />
            </GridItem>
          )}
          {data.errorPatterns && data.errorPatterns.length > 0 && (
            <GridItem span={12}>
              <ErrorPatternsTable errorPatterns={data.errorPatterns} />
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
};
