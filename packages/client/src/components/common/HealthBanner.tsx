import React from 'react';

import type { HealthStatus } from '@cnv-monitor/shared';

import { Banner } from '@patternfly/react-core';

type HealthBannerProps = {
  health: HealthStatus;
  passed: number;
  failed: number;
  inProgress: number;
};

export const HealthBanner: React.FC<HealthBannerProps> = ({
  failed,
  health,
  inProgress,
  passed,
}) => {
  const color =
    health === 'green'
      ? ('green' as const)
      : health === 'red'
        ? ('red' as const)
        : ('yellow' as const);
  const message =
    health === 'green'
      ? `All ${passed} launches passed`
      : `${failed} failed / ${passed} passed${inProgress > 0 ? ` / ${inProgress} in progress` : ''}`;

  return (
    <Banner className="app-mb-md" color={color}>
      {message}
    </Banner>
  );
};
