import React from 'react';

import type { DefectTypeTrend } from '@cnv-monitor/shared';

import { Chart, ChartArea, ChartAxis, ChartStack } from '@patternfly/react-charts/victory';
import { Card, CardBody, Content } from '@patternfly/react-core';

type DefectTypeTrendChartProps = {
  defectTrend: DefectTypeTrend[];
};

const LEGEND_DATA = [
  { name: 'Product Bug', symbol: { fill: '#C9190B' } },
  { name: 'Automation Bug', symbol: { fill: '#F0AB00' } },
  { name: 'System Issue', symbol: { fill: '#0066CC' } },
  { name: 'No Defect', symbol: { fill: '#3E8635' } },
  { name: 'To Investigate', symbol: { fill: '#B8BBBE' } },
];

const SERIES: { key: keyof DefectTypeTrend; fill: string }[] = [
  { fill: '#C9190B', key: 'productBug' },
  { fill: '#F0AB00', key: 'automationBug' },
  { fill: '#0066CC', key: 'systemIssue' },
  { fill: '#3E8635', key: 'noDefect' },
  { fill: '#B8BBBE', key: 'toInvestigate' },
];

export const DefectTypeTrendChart: React.FC<DefectTypeTrendChartProps> = ({ defectTrend }) => (
  <Card>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        Defect Classification Trend (last 90 days)
      </Content>
      <Content className="app-section-subheading" component="small">
        Weekly breakdown of how failures are classified
      </Content>
      <div className="app-chart-container">
        <Chart
          height={300}
          legendData={LEGEND_DATA}
          legendPosition="bottom"
          padding={{ bottom: 80, left: 60, right: 30, top: 20 }}
        >
          <ChartAxis
            style={{ tickLabels: { angle: -45, fontSize: 10, textAnchor: 'end' } }}
            tickValues={defectTrend
              .filter((_, i) => i % Math.max(1, Math.floor(defectTrend.length / 8)) === 0)
              .map(trendPoint => trendPoint.week.slice(5))}
          />
          <ChartAxis dependentAxis />
          <ChartStack>
            {SERIES.map(({ fill, key }) => (
              <ChartArea
                data={defectTrend.map(trendPoint => ({
                  x: trendPoint.week.slice(5),
                  y: trendPoint[key] as number,
                }))}
                key={key}
                style={{ data: { fill, fillOpacity: 0.7 } }}
              />
            ))}
          </ChartStack>
        </Chart>
      </div>
    </CardBody>
  </Card>
);
