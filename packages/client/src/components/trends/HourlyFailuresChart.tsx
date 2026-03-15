import React from 'react';
import { Card, CardBody, Content } from '@patternfly/react-core';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import type { HourlyFailure } from '@cnv-monitor/shared';

type HourlyFailuresChartProps = {
  hourlyData: HourlyFailure[];
};

export const HourlyFailuresChart: React.FC<HourlyFailuresChartProps> = ({ hourlyData }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">Failure Rate by Hour</Content>
      <Content component="small" className="app-section-subheading">When do failures happen most? (last 30 days)</Content>
      <div className="app-chart-container-sm">
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
            data={hourlyData.map(h => ({ x: `${String(h.hour).padStart(2, '0')}:00`, y: h.failRate }))}
            style={{ data: { fill: '#0066CC' } }}
          />
        </Chart>
      </div>
    </CardBody>
  </Card>
);
