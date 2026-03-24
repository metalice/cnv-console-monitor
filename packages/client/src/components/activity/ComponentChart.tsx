import React from 'react';

import { Card, CardBody, CardTitle, Tooltip } from '@patternfly/react-core';

type ComponentChartProps = {
  data: [string, number][];
  onComponentClick?: (component: string) => void;
};

export const ComponentChart: React.FC<ComponentChartProps> = ({ data, onComponentClick }) => {
  if (data.length === 0) {
    return null;
  }

  const max = data[0][1];

  return (
    <Card>
      <CardTitle>Activity by Component</CardTitle>
      <CardBody>
        <div className="app-comp-chart">
          {data.slice(0, 6).map(([comp, count]) => (
            <div
              className={`app-comp-row ${onComponentClick ? 'app-comp-clickable' : ''}`}
              key={comp}
              onClick={onComponentClick ? () => onComponentClick(comp) : undefined}
            >
              <span className="app-comp-label app-text-xs">{comp}</span>
              <div className="app-comp-bar-track">
                <Tooltip content={`${count} actions`}>
                  <div
                    className="app-comp-bar"
                    style={{ width: `${Math.max(2, (count / max) * 100)}%` }}
                  />
                </Tooltip>
              </div>
              <span className="app-comp-count app-text-xs app-text-muted">{count}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
