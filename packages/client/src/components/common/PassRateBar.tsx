import React from 'react';

import { Progress, ProgressMeasureLocation, Tooltip } from '@patternfly/react-core';

type PassRateBarProps = {
  rate: number;
  passed?: number;
  total?: number;
  failed?: number;
  skipped?: number;
  launchName?: string;
  startTime?: number;
  launchCount?: number;
};

export const PassRateBar: React.FC<PassRateBarProps> = ({
  failed,
  launchCount,
  launchName,
  passed,
  rate,
  skipped,
  startTime,
  total,
}) => {
  const variant =
    rate >= 95 ? ('success' as const) : rate >= 80 ? ('warning' as const) : ('danger' as const);

  const hasDetails = total !== undefined;
  const isAggregate = launchCount !== undefined && launchCount > 1;

  const tooltipLines: string[] = [];
  if (isAggregate) {
    tooltipLines.push(`Aggregated across ${launchCount} launches`);
  }
  if (hasDetails) {
    tooltipLines.push(`Passed: ${passed} / ${total}`);
    if (failed !== undefined) {
      tooltipLines.push(`Failed: ${failed}`);
    }
    if (skipped !== undefined) {
      tooltipLines.push(`Skipped: ${skipped}`);
    }
    tooltipLines.push(`Pass rate: ${rate}%`);
  }
  if (launchName) {
    tooltipLines.push('');
    tooltipLines.push(`Latest: ${launchName}`);
  }
  if (startTime) {
    tooltipLines.push(`Last ran: ${new Date(startTime).toLocaleString()}`);
  }

  const bar = (
    <Progress
      className="app-min-w-120"
      measureLocation={ProgressMeasureLocation.outside}
      value={rate}
      variant={variant}
    />
  );

  if (!hasDetails) {
    return bar;
  }

  return (
    <Tooltip content={<div className="app-tooltip-pre">{tooltipLines.join('\n')}</div>}>
      <div>{bar}</div>
    </Tooltip>
  );
};
