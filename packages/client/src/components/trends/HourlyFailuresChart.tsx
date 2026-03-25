import React from 'react';

import type { HourlyFailure } from '@cnv-monitor/shared';

import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Card, CardBody, Content } from '@patternfly/react-core';

type HourlyFailuresChartProps = {
  hourlyData: HourlyFailure[];
};

export const HourlyFailuresChart: React.FC<HourlyFailuresChartProps> = ({ hourlyData }) => (
  <Card>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        Failure Rate by Hour
      </Content>
      <Content className="app-section-subheading" component="small">
        When do failures happen most? (last 30 days)
      </Content>
      <div className="app-chart-container-sm">
        <Chart
          containerComponent={
            <ChartVoronoiContainer
              labels={({ datum }: { datum: { x: string; y: number } }) => `${datum.x}: ${datum.y}%`}
            />
          }
          height={250}
          padding={{ bottom: 60, left: 60, right: 20, top: 20 }}
        >
          <ChartAxis style={{ tickLabels: { angle: -45, fontSize: 9, textAnchor: 'end' } }} />
          <ChartAxis dependentAxis tickFormat={(tickPercent: number) => `${tickPercent}%`} />
          <ChartBar
            data={hourlyData.map(hourRow => ({
              x: `${String(hourRow.hour).padStart(2, '0')}:00`,
              y: hourRow.failRate,
            }))}
            style={{ data: { fill: '#0066CC' } }}
          />
        </Chart>
      </div>
    </CardBody>
  </Card>
);
