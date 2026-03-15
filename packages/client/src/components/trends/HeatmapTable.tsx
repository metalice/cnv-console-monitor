import React from 'react';
import { Card, CardBody, Content, Spinner, Tooltip } from '@patternfly/react-core';
import { heatmapCellColor, heatmapCellLabel, type HeatmapData } from './trendUtils';

type HeatmapTableProps = {
  isLoading: boolean;
  heatmap: HeatmapData | null;
};


export const HeatmapTable: React.FC<HeatmapTableProps> = ({ isLoading, heatmap }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">Failure Heatmap (last 14 days)</Content>
      <Content component="small" className="app-section-subheading">Top failing tests vs dates. Red = failed that day, green = passed.</Content>
      {isLoading ? (
        <Spinner size="md" />
      ) : heatmap && heatmap.tests.length > 0 ? (
        <div className="app-overflow-x-auto">
          <table className="app-heatmap-table">
            <thead>
              <tr>
                <th className="app-heatmap-th-test app-heatmap-sticky">Test</th>
                {heatmap.dates.map(d => (
                  <th key={d} className="app-heatmap-th-date">
                    {d.slice(5)}
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
                      <td key={date} className="app-heatmap-td-cell">
                        <Tooltip content={`${date}: ${heatmapCellLabel(status)}`}>
                          <span className="app-heatmap-dot" style={{ background: heatmapCellColor(status) }} />
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
