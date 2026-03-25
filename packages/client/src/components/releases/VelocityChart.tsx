import React from 'react';

import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  Content,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchVelocity } from '../../api/releases';

export const VelocityChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryFn: fetchVelocity,
    queryKey: ['releaseVelocity'],
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <Bullseye className="app-card-spinner">
            <Spinner />
          </Bullseye>
        </CardBody>
      </Card>
    );
  }
  if (!data || data.length === 0) {
    return null;
  }

  const withAvg = data.filter(entry => entry.avgDaysBetweenReleases !== null).slice(0, 10);
  if (withAvg.length === 0) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const max = Math.max(...withAvg.map(entry => entry.avgDaysBetweenReleases!));

  return (
    <Card>
      <CardTitle>
        Release Velocity{' '}
        <Tooltip content="Shows the average number of days between batch releases for each CNV version. Shorter bars mean faster release cadence.">
          <OutlinedQuestionCircleIcon className="app-help-icon" />
        </Tooltip>
      </CardTitle>
      <CardBody>
        <Content className="app-text-muted app-mb-sm" component="small">
          Average days between batch releases per version
        </Content>
        <div className="app-comp-chart">
          {withAvg.map(entry => (
            <div className="app-comp-row" key={entry.version}>
              <span className="app-comp-label app-text-xs">
                {entry.version.replace('cnv-', '')}
              </span>
              <div className="app-comp-bar-track">
                <Tooltip
                  content={`${entry.avgDaysBetweenReleases}d avg across ${entry.totalReleases} releases`}
                >
                  <div
                    className="app-comp-bar"
                    style={{
                      width: `${Math.max(2, ((entry.avgDaysBetweenReleases ?? 0) / max) * 100)}%`,
                    }}
                  />
                </Tooltip>
              </div>
              <span className="app-comp-count app-text-xs app-text-muted">
                {entry.avgDaysBetweenReleases}d
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
