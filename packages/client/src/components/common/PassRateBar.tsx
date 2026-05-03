import React from 'react';

import { Flex, FlexItem, Progress, ProgressMeasureLocation, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';

type PassRateBarProps = {
  rate: number;
  passed?: number;
  total?: number;
  failed?: number;
  skipped?: number;
  launchName?: string;
  startTime?: number;
  launchCount?: number;
  lastLaunchPassed?: boolean;
};

export const PassRateBar: React.FC<PassRateBarProps> = ({
  failed,
  lastLaunchPassed,
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
  if (lastLaunchPassed !== undefined) {
    tooltipLines.push(`Latest launch: ${lastLaunchPassed ? 'PASSED' : 'FAILED'}`);
  }
  if (launchName) {
    tooltipLines.push('');
    tooltipLines.push(`Latest: ${launchName}`);
  }
  if (startTime) {
    tooltipLines.push(`Last ran: ${new Date(startTime).toLocaleString()}`);
  }

  const bar = (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
      gap={{ default: 'gapSm' }}
    >
      {lastLaunchPassed !== undefined && (
        <FlexItem>
          {lastLaunchPassed ? (
            <CheckCircleIcon className="pf-v6-u-success-color-100" />
          ) : (
            <TimesCircleIcon className="pf-v6-u-danger-color-100" />
          )}
        </FlexItem>
      )}
      <FlexItem grow={{ default: 'grow' }}>
        <Progress
          className="app-min-w-120"
          measureLocation={ProgressMeasureLocation.outside}
          value={rate}
          variant={variant}
        />
      </FlexItem>
    </Flex>
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
