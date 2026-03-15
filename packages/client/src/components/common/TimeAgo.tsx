import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { timeAgo } from '@cnv-monitor/shared';

type TimeAgoProps = {
  timestamp: number;
};

export const TimeAgo: React.FC<TimeAgoProps> = ({ timestamp }) => {
  const fullDate = new Date(timestamp).toLocaleString();

  return (
    <Tooltip content={fullDate}>
      <span className="app-cursor-help">{timeAgo(timestamp)}</span>
    </Tooltip>
  );
};
