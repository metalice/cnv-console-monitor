import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Grid,
  GridItem,
  Spinner,
} from '@patternfly/react-core';
import { Chart, ChartAxis, ChartLine, ChartThemeColor, ChartVoronoiContainer } from '@patternfly/react-charts/victory';
import { fetchTrends } from '../api/launches';

export const TrendsPage: React.FC = () => {
  useEffect(() => { document.title = 'Trends | CNV Console Monitor'; }, []);

  const { data: trends, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => fetchTrends('test-kubevirt-console', 30),
  });

  return (
    <>
      <PageSection>
        <Content component="h1">Trends</Content>
        <Content component="small">Pass rate and test metrics over the last 30 days</Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          <GridItem span={12}>
            <Card>
              <CardBody>
                <Content component="h3" style={{ marginBottom: 16 }}>Pass Rate Trend</Content>
                {isLoading ? (
                  <Spinner aria-label="Loading trends" />
                ) : trends && trends.length > 0 ? (
                  <div style={{ height: 350, width: '100%' }}>
                    <Chart
                      containerComponent={
                        <ChartVoronoiContainer
                          labels={({ datum }: { datum: { x: string; y: number } }) => `${datum.x}: ${datum.y}%`}
                        />
                      }
                      height={300}
                      padding={{ bottom: 60, left: 60, right: 30, top: 20 }}
                      themeColor={ChartThemeColor.blue}
                    >
                      <ChartAxis
                        tickValues={trends.filter((_, i) => i % Math.max(1, Math.floor(trends.length / 10)) === 0).map((t) => t.date.slice(5))}
                        style={{ tickLabels: { angle: -45, textAnchor: 'end' } }}
                      />
                      <ChartAxis dependentAxis domain={[0, 100]} tickFormat={(t: number) => `${t}%`} />
                      <ChartLine
                        data={trends.map((t) => ({ x: t.date.slice(5), y: t.rate }))}
                        style={{ data: { strokeWidth: 2 } }}
                      />
                    </Chart>
                  </div>
                ) : (
                  <Content>No trend data available.</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card>
              <CardBody>
                <Content component="h3">Test Volume</Content>
                {trends && trends.length > 0 ? (
                  <div style={{ height: 250, width: '100%' }}>
                    <Chart
                      height={200}
                      padding={{ bottom: 50, left: 60, right: 30, top: 20 }}
                      themeColor={ChartThemeColor.green}
                    >
                      <ChartAxis tickValues={trends.filter((_, i) => i % Math.max(1, Math.floor(trends.length / 5)) === 0).map((t) => t.date.slice(5))} />
                      <ChartAxis dependentAxis />
                      <ChartLine data={trends.map((t) => ({ x: t.date.slice(5), y: t.total }))} />
                    </Chart>
                  </div>
                ) : (
                  <Content>No data</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card>
              <CardBody>
                <Content component="h3">Passed Tests</Content>
                {trends && trends.length > 0 ? (
                  <div style={{ height: 250, width: '100%' }}>
                    <Chart
                      height={200}
                      padding={{ bottom: 50, left: 60, right: 30, top: 20 }}
                      themeColor={ChartThemeColor.green}
                    >
                      <ChartAxis tickValues={trends.filter((_, i) => i % Math.max(1, Math.floor(trends.length / 5)) === 0).map((t) => t.date.slice(5))} />
                      <ChartAxis dependentAxis />
                      <ChartLine data={trends.map((t) => ({ x: t.date.slice(5), y: t.passed }))} />
                    </Chart>
                  </div>
                ) : (
                  <Content>No data</Content>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
