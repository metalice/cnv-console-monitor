import React from 'react';

import { Card, CardBody, Content, Spinner, Tooltip } from '@patternfly/react-core';

import { heatmapCellColor, heatmapCellLabel, type HeatmapData } from './trendUtils';

type HeatmapTableProps = {
  isLoading: boolean;
  heatmap: HeatmapData | null;
};

export const HeatmapTable: React.FC<HeatmapTableProps> = ({ heatmap, isLoading }) => (
  <Card>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        Failure Heatmap (last 14 days)
      </Content>
      <Content className="app-section-subheading" component="small">
        Top failing tests vs dates. Red = failed that day, green = passed.
      </Content>
      {isLoading ? (
        <Spinner size="md" />
      ) : heatmap && heatmap.tests.length > 0 ? (
        <div className="app-overflow-x-auto">
          <table className="app-heatmap-table">
            <thead>
              <tr>
                <th className="app-heatmap-th-test app-heatmap-sticky">Test</th>
                {heatmap.dates.map(dateStr => (
                  <th className="app-heatmap-th-date" key={dateStr}>
                    {dateStr.slice(5)}
                  </th>
                ))}
                <th className="app-heatmap-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {heatmap.tests.map(test => (
                <tr key={test.unique_id}>
                  <td className="app-heatmap-td-name app-heatmap-sticky">
                    <Tooltip content={test.name}>
                      <span>{test.name.split('.').pop()}</span>
                    </Tooltip>
                  </td>
                  {heatmap.dates.map(date => {
                    const status = heatmap.cellMap.get(`${test.unique_id}|${date}`);
                    return (
                      <td className="app-heatmap-td-cell" key={date}>
                        <Tooltip content={`${date}: ${heatmapCellLabel(status)}`}>
                          <span
                            className="app-heatmap-dot"
                            style={{ background: heatmapCellColor(status) }}
                          />
                        </Tooltip>
                      </td>
                    );
                  })}
                  <td className="app-heatmap-td-total">{test.fail_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Content>No heatmap data available.</Content>
      )}
    </CardBody>
  </Card>
);
