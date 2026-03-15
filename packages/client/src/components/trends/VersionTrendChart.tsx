import React from 'react';
import { Card, CardBody, Content, Spinner } from '@patternfly/react-core';
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartGroup,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { VERSION_COLORS, type VersionGroups } from './trendUtils';

type VersionTrendChartProps = {
  isLoading: boolean;
  versionGroups: VersionGroups;
};

export const VersionTrendChart: React.FC<VersionTrendChartProps> = ({ isLoading, versionGroups }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">Pass Rate by Version</Content>
      {isLoading ? (
        <Spinner size="md" />
      ) : versionGroups.versions.length > 0 ? (
        <div className="app-chart-container">
          <Chart
            containerComponent={
              <ChartVoronoiContainer
                labels={({ datum }: { datum: { x: string; y: number; childName: string } }) => {
                  const version = datum.childName?.replace('chart-line-', '') || '';
                  return `${version}: ${datum.y}%`;
                }}
              />
            }
            height={300}
            padding={{ bottom: 80, left: 60, right: 30, top: 20 }}
            legendData={versionGroups.versions.map((v, i) => ({ name: v, symbol: { fill: VERSION_COLORS[i % VERSION_COLORS.length] } }))}
            legendPosition="bottom"
          >
            <ChartAxis
              tickValues={versionGroups.dates.filter((_, i) => i % Math.max(1, Math.floor(versionGroups.dates.length / 10)) === 0).map(d => d.slice(5))}
              style={{ tickLabels: { angle: -45, textAnchor: 'end', fontSize: 10 } }}
            />
            <ChartAxis dependentAxis domain={[0, 100]} tickFormat={(t: number) => `${t}%`} />
            <ChartGroup>
              {versionGroups.versions.map((version, idx) => {
                const versionData = versionGroups.byVersion.get(version)!;
                return (
                  <ChartLine
                    key={version}
                    name={version}
                    data={versionGroups.dates.map(d => ({ x: d.slice(5), y: versionData.get(d) ?? null })).filter(d => d.y !== null)}
                    style={{ data: { stroke: VERSION_COLORS[idx % VERSION_COLORS.length], strokeWidth: 2 } }}
                  />
                );
              })}
            </ChartGroup>
          </Chart>
        </div>
      ) : (
        <Content>No version trend data available.</Content>
      )}
    </CardBody>
  </Card>
);
