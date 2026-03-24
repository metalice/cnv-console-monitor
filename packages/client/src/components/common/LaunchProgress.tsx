import React from 'react';

import { Label, Progress, Tooltip } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';

type ProgressData = {
  available: boolean;
  building?: boolean;
  result?: string;
  progress?: number;
  elapsedMinutes?: number;
  estimatedMinutes?: number;
  remainingMinutes?: number;
  currentStage?: string | null;
  jenkinsUrl?: string;
};

type LaunchProgressProps = {
  launchRpId: number;
};

export const LaunchProgress: React.FC<LaunchProgressProps> = ({ launchRpId }) => {
  const { data } = useQuery({
    queryFn: () => apiFetch<ProgressData>(`/launches/progress/${launchRpId}`),
    queryKey: ['launchProgress', launchRpId],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (!data?.available) {
    return (
      <Label isCompact color="blue" icon={<InProgressIcon />}>
        In Progress
      </Label>
    );
  }

  if (!data.building && data.result) {
    const color =
      data.result === 'SUCCESS' ? 'green' : data.result === 'UNSTABLE' ? 'orange' : 'red';
    return (
      <Tooltip content={`Jenkins: ${data.result} (RP still shows IN_PROGRESS)`}>
        <Label isCompact color={color}>
          {data.result}
        </Label>
      </Tooltip>
    );
  }

  const percentage = data.progress ?? 0;
  const remaining = data.remainingMinutes ?? 0;
  const stage = data.currentStage;
  const tooltipText = [
    `${data.elapsedMinutes}m elapsed / ${data.estimatedMinutes}m estimated`,
    remaining > 0 ? `~${remaining}m remaining` : null,
    stage ? `Stage: ${stage}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Tooltip content={tooltipText}>
      <div className="app-inline-flex-center">
        <Progress aria-label="Build progress" className="app-w-60" size="sm" value={percentage} />
        <span className="app-text-xs app-text-muted app-cell-nowrap">
          {percentage}%{remaining > 0 ? ` (~${remaining}m)` : ''}
        </span>
      </div>
    </Tooltip>
  );
};
