import React from 'react';
import { Tooltip } from '@patternfly/react-core';

export type HealthStatus = 'green' | 'yellow' | 'red' | 'grey';

export const computeHealth = (opts: {
  checklistDone: number;
  checklistTotal: number;
  passRate?: number;
  daysUntilNext: number | null;
}): { status: HealthStatus; reason: string } => {
  const { checklistDone, checklistTotal, passRate, daysUntilNext } = opts;
  const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 100;

  if (daysUntilNext !== null && daysUntilNext <= 3) {
    if (checklistPct < 80 || (passRate !== undefined && passRate < 80))
      return { status: 'red', reason: `${daysUntilNext}d until release, ${Math.round(checklistPct)}% checklist done` };
  }

  if (daysUntilNext !== null && daysUntilNext <= 7) {
    if (checklistPct < 60 || (passRate !== undefined && passRate < 70))
      return { status: 'red', reason: `${daysUntilNext}d until release, needs attention` };
    if (checklistPct < 90 || (passRate !== undefined && passRate < 85))
      return { status: 'yellow', reason: `${daysUntilNext}d until release, ${100 - Math.round(checklistPct)}% checklist remaining` };
  }

  if (passRate !== undefined && passRate < 70) return { status: 'red', reason: `Pass rate ${passRate.toFixed(0)}%` };
  if (passRate !== undefined && passRate < 85) return { status: 'yellow', reason: `Pass rate ${passRate.toFixed(0)}%` };
  if (checklistPct < 50) return { status: 'yellow', reason: `${Math.round(checklistPct)}% checklist done` };

  return { status: 'green', reason: 'On track' };
};

const STATUS_COLORS: Record<HealthStatus, string> = {
  green: 'var(--pf-t--global--color--status--success--default)',
  yellow: 'var(--pf-t--global--color--status--warning--default)',
  red: 'var(--pf-t--global--color--status--danger--default)',
  grey: 'var(--pf-t--global--border--color--default)',
};

type TrafficLightProps = {
  status: HealthStatus;
  reason: string;
  size?: number;
};

export const TrafficLight: React.FC<TrafficLightProps> = ({ status, reason, size = 12 }) => (
  <Tooltip content={reason}>
    <span
      className="app-traffic-light"
      style={{ width: size, height: size, background: STATUS_COLORS[status] }}
    />
  </Tooltip>
);
