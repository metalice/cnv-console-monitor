import React from 'react';

import { Tooltip } from '@patternfly/react-core';

type HealthStatus = 'green' | 'yellow' | 'red' | 'grey';

// eslint-disable-next-line react-refresh/only-export-components
export const computeHealth = (opts: {
  checklistDone: number;
  checklistTotal: number;
  passRate?: number;
  daysUntilNext: number | null;
}): { status: HealthStatus; reason: string } => {
  const { checklistDone, checklistTotal, daysUntilNext, passRate } = opts;
  const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 100;

  if (daysUntilNext !== null && daysUntilNext <= 3) {
    if (checklistPct < 80 || (passRate !== undefined && passRate < 80)) {
      return {
        reason: `${daysUntilNext}d until release, ${Math.round(checklistPct)}% checklist done`,
        status: 'red',
      };
    }
  }

  if (daysUntilNext !== null && daysUntilNext <= 7) {
    if (checklistPct < 60 || (passRate !== undefined && passRate < 70)) {
      return { reason: `${daysUntilNext}d until release, needs attention`, status: 'red' };
    }
    if (checklistPct < 90 || (passRate !== undefined && passRate < 85)) {
      return {
        reason: `${daysUntilNext}d until release, ${100 - Math.round(checklistPct)}% checklist remaining`,
        status: 'yellow',
      };
    }
  }

  if (passRate !== undefined && passRate < 70) {
    return { reason: `Pass rate ${passRate.toFixed(0)}%`, status: 'red' };
  }
  if (passRate !== undefined && passRate < 85) {
    return { reason: `Pass rate ${passRate.toFixed(0)}%`, status: 'yellow' };
  }
  if (checklistPct < 50) {
    return { reason: `${Math.round(checklistPct)}% checklist done`, status: 'yellow' };
  }

  return { reason: 'On track', status: 'green' };
};

const STATUS_COLORS: Record<HealthStatus, string> = {
  green: 'var(--pf-t--global--color--status--success--default)',
  grey: 'var(--pf-t--global--border--color--default)',
  red: 'var(--pf-t--global--color--status--danger--default)',
  yellow: 'var(--pf-t--global--color--status--warning--default)',
};

type TrafficLightProps = {
  status: HealthStatus;
  reason: string;
  size?: number;
};

export const TrafficLight: React.FC<TrafficLightProps> = ({ reason, size = 12, status }) => (
  <Tooltip content={reason}>
    <span
      className="app-traffic-light"
      style={{ background: STATUS_COLORS[status], height: size, width: size }}
    />
  </Tooltip>
);
