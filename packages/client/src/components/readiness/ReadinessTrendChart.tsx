import { useMemo } from 'react';

import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Card, CardBody, Content, PageSection } from '@patternfly/react-core';

type TrendPoint = { date: string; rate: number };

type ReadinessTrendChartProps = {
  trend: TrendPoint[];
};

export const ReadinessTrendChart = ({ trend }: ReadinessTrendChartProps) => {
  const trendData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
    if (!trend?.length) {
      return [];
    }
    return trend.map(point => ({ x: point.date.slice(5), y: point.rate }));
  }, [trend]);

  if (trendData.length <= 1) {
    return null;
  }

  return (
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
              <ChartAxis
                dependentAxis
                domain={[0, 100]}
                tickFormat={(percentValue: number) => `${percentValue}%`}
              />
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
  );
};
