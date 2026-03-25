import React from 'react';

import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Card, CardBody, Content, Spinner } from '@patternfly/react-core';

import { VERSION_COLORS, type VersionGroups } from './trendUtils';

type VersionTrendChartProps = {
  isLoading: boolean;
  versionGroups: VersionGroups;
};

export const VersionTrendChart: React.FC<VersionTrendChartProps> = ({
  isLoading,
  versionGroups,
}) => (
  <Card>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        Pass Rate by Version
      </Content>
      {isLoading ? (
        <Spinner size="md" />
      ) : versionGroups.versions.length > 0 ? (
        <div className="app-chart-container">
          <Chart
            containerComponent={
              <ChartVoronoiContainer
                labels={({ datum }: { datum: { x: string; y: number; childName: string } }) => {
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
                  const version = datum.childName?.replace('chart-line-', '') || '';
                  return `${version}: ${datum.y}%`;
                }}
              />
            }
            height={300}
            legendData={versionGroups.versions.map((version, colorIndex) => ({
              name: version,
              symbol: { fill: VERSION_COLORS[colorIndex % VERSION_COLORS.length] },
            }))}
            legendPosition="bottom"
            padding={{ bottom: 80, left: 60, right: 30, top: 20 }}
          >
            <ChartAxis
              style={{ tickLabels: { angle: -45, fontSize: 10, textAnchor: 'end' } }}
              tickValues={versionGroups.dates
                .filter(
                  (_, i) => i % Math.max(1, Math.floor(versionGroups.dates.length / 10)) === 0,
                )
                .map(dateStr => dateStr.slice(5))}
            />
            <ChartAxis
              dependentAxis
              domain={[0, 100]}
              tickFormat={(tickPercent: number) => `${tickPercent}%`}
            />
            <ChartGroup>
              {versionGroups.versions.map((version, idx) => {
                const versionData =
                  versionGroups.byVersion.get(version) ?? new Map<string, number>();
                return (
                  <ChartLine
                    data={versionGroups.dates
                      .map(dateStr => ({
                        x: dateStr.slice(5),
                        y: versionData.get(dateStr) ?? null,
                      }))
                      .filter(linePoint => linePoint.y !== null)}
                    key={version}
                    name={version}
                    style={{
                      data: { stroke: VERSION_COLORS[idx % VERSION_COLORS.length], strokeWidth: 2 },
                    }}
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
