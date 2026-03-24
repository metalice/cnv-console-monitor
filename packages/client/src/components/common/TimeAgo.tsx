import React from 'react';

import { timeAgo } from '@cnv-monitor/shared';

import { Tooltip } from '@patternfly/react-core';

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
