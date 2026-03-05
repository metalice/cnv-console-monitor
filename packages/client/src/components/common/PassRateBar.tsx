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
  rate,
  passed,
  total,
  failed,
  skipped,
  launchName,
  startTime,
  launchCount,
}) => {
  const variant = rate >= 95 ? 'success' as const : rate >= 80 ? 'warning' as const : 'danger' as const;

  const hasDetails = total !== undefined;
  const isAggregate = launchCount !== undefined && launchCount > 1;

  const tooltipLines: string[] = [];
  if (isAggregate) {
    tooltipLines.push(`Aggregated across ${launchCount} launches`);
  }
  if (hasDetails) {
    tooltipLines.push(`Passed: ${passed} / ${total}`);
    if (failed !== undefined) tooltipLines.push(`Failed: ${failed}`);
    if (skipped !== undefined) tooltipLines.push(`Skipped: ${skipped}`);
    tooltipLines.push(`Pass rate: ${rate}%`);
  }
  if (launchName) {
    tooltipLines.push('');
    tooltipLines.push(`Latest: ${launchName}`);
  }
  if (startTime) tooltipLines.push(`Last ran: ${new Date(startTime).toLocaleString()}`);

  const bar = (
    <Progress
      value={rate}
      title={`${rate}%`}
      variant={variant}
      measureLocation={ProgressMeasureLocation.outside}
      style={{ minWidth: 120 }}
    />
  );

  if (!hasDetails) return bar;

  return (
    <Tooltip
      content={
        <div style={{ textAlign: 'left', whiteSpace: 'pre-line' }}>
          {tooltipLines.join('\n')}
        </div>
      }
    >
      <div>{bar}</div>
    </Tooltip>
  );
};
