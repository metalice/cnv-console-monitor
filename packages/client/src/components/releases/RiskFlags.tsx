import React, { useMemo } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import { Alert } from '@patternfly/react-core';

import type { VersionReadiness } from '../../api/releases';

type RiskFlag = { message: string; severity: 'danger' | 'warning' };

const detectRisks = (
  release: ReleaseInfo,
  checklist?: ChecklistTask[],
  readiness?: VersionReadiness | null,
): RiskFlag[] => {
  const flags: RiskFlag[] = [];
  const openItems = (checklist ?? []).filter(t => t.status !== 'Closed');

  if (release.daysUntilNext !== null && release.daysUntilNext <= 7 && openItems.length > 5) {
    flags.push({
      message: `${openItems.length} checklist items still open with only ${release.daysUntilNext} days until release`,
      severity: 'danger',
    });
  }

  if (
    readiness?.passRate !== null &&
    readiness?.passRate !== undefined &&
    readiness.passRate < 80
  ) {
    flags.push({
      message: `Pass rate is ${readiness.passRate.toFixed(1)}% — below 80% threshold`,
      severity: 'danger',
    });
  } else if (
    readiness?.passRate !== null &&
    readiness?.passRate !== undefined &&
    readiness.passRate < 90
  ) {
    flags.push({
      message: `Pass rate is ${readiness.passRate.toFixed(1)}% — below 90% target`,
      severity: 'warning',
    });
  }

  if (readiness?.trend && readiness.trend.length >= 2) {
    const recent = readiness.trend.slice(-3).filter(t => t.passRate !== null);
    const earlier = readiness.trend.slice(0, -3).filter(t => t.passRate !== null);
    if (recent.length > 0 && earlier.length > 0) {
      const recentAvg = recent.reduce((s, t) => s + (t.passRate ?? 0), 0) / recent.length;
      const earlierAvg = earlier.reduce((s, t) => s + (t.passRate ?? 0), 0) / earlier.length;
      if (recentAvg < earlierAvg - 3) {
        flags.push({
          message: `Pass rate dropped ${(earlierAvg - recentAvg).toFixed(1)}% in the last 3 days`,
          severity: 'warning',
        });
      }
    }
  }

  const staleItems = openItems.filter(t => {
    const updated = new Date(t.updated).getTime();
    return Date.now() - updated > 7 * 24 * 60 * 60 * 1000;
  });
  if (staleItems.length > 0) {
    flags.push({
      message: `${staleItems.length} checklist items haven't been updated in over 7 days`,
      severity: 'warning',
    });
  }

  return flags;
};

type RiskFlagsProps = {
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
  readiness?: VersionReadiness | null;
};

export const RiskFlags: React.FC<RiskFlagsProps> = ({ checklist, readiness, release }) => {
  const flags = useMemo(
    () => detectRisks(release, checklist, readiness),
    [release, checklist, readiness],
  );

  if (flags.length === 0) {
    return null;
  }

  return (
    <div className="app-mb-md">
      {flags.map((flag, i) => (
        <Alert
          isInline
          isPlain
          className="app-mb-xs"
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          title={flag.message}
          variant={flag.severity}
        />
      ))}
    </div>
  );
};
