import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, Label, Progress } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
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
    queryKey: ['launchProgress', launchRpId],
    queryFn: () => apiFetch<ProgressData>(`/launches/progress/${launchRpId}`),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (!data?.available) {
    return <Label color="blue" isCompact icon={<InProgressIcon />}>In Progress</Label>;
  }

  if (!data.building && data.result) {
    const color = data.result === 'SUCCESS' ? 'green' : data.result === 'UNSTABLE' ? 'orange' : 'red';
    return (
      <Tooltip content={`Jenkins: ${data.result} (RP still shows IN_PROGRESS)`}>
        <Label color={color} isCompact>{data.result}</Label>
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
  ].filter(Boolean).join('\n');

  return (
    <Tooltip content={tooltipText}>
      <div className="app-inline-flex-center">
        <Progress value={percentage} size="sm" className="app-w-60" aria-label="Build progress" />
        <span className="app-text-xs app-text-muted app-cell-nowrap">
          {percentage}%{remaining > 0 ? ` (~${remaining}m)` : ''}
        </span>
      </div>
    </Tooltip>
  );
};
