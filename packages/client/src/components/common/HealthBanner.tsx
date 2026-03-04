import React from 'react';
import { Banner } from '@patternfly/react-core';
import type { HealthStatus } from '@cnv-monitor/shared';

interface HealthBannerProps {
  health: HealthStatus;
  passed: number;
  failed: number;
  inProgress: number;
}

export const HealthBanner: React.FC<HealthBannerProps> = ({ health, passed, failed, inProgress }) => {
  const color = health === 'green' ? 'green' as const : health === 'red' ? 'red' as const : 'yellow' as const;
  const message =
    health === 'green'
      ? `All ${passed} launches passed`
      : `${failed} failed / ${passed} passed${inProgress > 0 ? ` / ${inProgress} in progress` : ''}`;

  return (
    <Banner color={color} style={{ marginBottom: 16 }}>
      {message}
    </Banner>
  );
};
