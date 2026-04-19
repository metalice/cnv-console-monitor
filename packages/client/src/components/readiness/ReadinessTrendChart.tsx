import { useMemo } from 'react';

import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartThreshold,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Card, CardBody, Content, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { TrendUpIcon } from '@patternfly/react-icons';

type TrendPoint = { date: string; rate: number };

type ReadinessTrendChartProps = {
  trend: TrendPoint[];
};

const READY_THRESHOLD = 95;

export const ReadinessTrendChart = ({ trend }: ReadinessTrendChartProps) => {
  const trendData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
    if (!trend?.length) return [];
    return trend.map(point => ({ x: point.date.slice(5), y: point.rate }));
  }, [trend]);

  const thresholdData = useMemo(
    () => trendData.map(point => ({ x: point.x, y: READY_THRESHOLD })),
    [trendData],
  );

  if (trendData.length <= 1) {
    return (
      <Card isFullHeight>
        <CardBody>
          <Content className="app-section-heading" component="h3">
            Pass Rate Trend
          </Content>
          <EmptyState headingLevel="h4" icon={TrendUpIcon} titleText="Not enough data">
            <EmptyStateBody>
              At least 2 days of launch data are needed to show a trend.
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card isFullHeight>
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
                .filter((_, index) => index % Math.max(1, Math.floor(trendData.length / 10)) === 0)
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
                style={{
                  data: {
                    stroke: 'var(--pf-t--global--color--status--info--default)',
                    strokeWidth: 2,
                  },
                }}
              />
            </ChartGroup>
            <ChartThreshold
              data={thresholdData}
              style={{
                data: {
                  stroke: 'var(--pf-t--global--color--status--success--default)',
                  strokeDasharray: '6,4',
                  strokeWidth: 1,
                },
              }}
            />
          </Chart>
        </div>
      </CardBody>
    </Card>
  );
};
