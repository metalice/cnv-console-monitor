import React from 'react';
import { Card, CardBody, Content } from '@patternfly/react-core';
import {
  Chart,
  ChartAxis,
  ChartStack,
  ChartArea,
} from '@patternfly/react-charts/victory';
import type { DefectTypeTrend } from '@cnv-monitor/shared';

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

const SERIES: Array<{ key: keyof DefectTypeTrend; fill: string }> = [
  { key: 'productBug', fill: '#C9190B' },
  { key: 'automationBug', fill: '#F0AB00' },
  { key: 'systemIssue', fill: '#0066CC' },
  { key: 'noDefect', fill: '#3E8635' },
  { key: 'toInvestigate', fill: '#B8BBBE' },
];

export const DefectTypeTrendChart: React.FC<DefectTypeTrendChartProps> = ({ defectTrend }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">Defect Classification Trend (last 90 days)</Content>
      <Content component="small" className="app-section-subheading">Weekly breakdown of how failures are classified</Content>
      <div className="app-chart-container">
        <Chart
          height={300}
          padding={{ bottom: 80, left: 60, right: 30, top: 20 }}
          legendData={LEGEND_DATA}
          legendPosition="bottom"
        >
          <ChartAxis
            tickValues={defectTrend.filter((_, i) => i % Math.max(1, Math.floor(defectTrend.length / 8)) === 0).map(d => d.week.slice(5))}
            style={{ tickLabels: { angle: -45, textAnchor: 'end', fontSize: 10 } }}
          />
          <ChartAxis dependentAxis />
          <ChartStack>
            {SERIES.map(({ key, fill }) => (
              <ChartArea
                key={key}
                data={defectTrend.map(d => ({ x: d.week.slice(5), y: d[key] as number }))}
                style={{ data: { fill, fillOpacity: 0.7 } }}
              />
            ))}
          </ChartStack>
        </Chart>
      </div>
    </CardBody>
  </Card>
);
