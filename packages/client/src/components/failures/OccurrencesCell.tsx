import { Label, Tooltip } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';

import { type StreakInfo } from '../../api/testItems';

type OccurrencesCellProps = {
  occurrences: number;
  streak: StreakInfo | undefined;
};

export const OccurrencesCell = ({ occurrences, streak }: OccurrencesCellProps) => (
  <Td className="app-cell-nowrap" dataLabel="Occurrences">
    {occurrences > 1 && (
      <Tooltip content={`Failed in ${occurrences} launches.`}>
        <Label isCompact color="orange">
          {occurrences}x
        </Label>
      </Tooltip>
    )}
    {streak && streak.consecutiveFailures > 0 && (
      <>
        {' '}
        <Tooltip
          content={`Failed in last ${streak.consecutiveFailures} of ${streak.totalRuns} runs`}
        >
          <Label isCompact color="red">
            {streak.consecutiveFailures}/{streak.totalRuns} failing
          </Label>
        </Tooltip>
        {streak.lastPassDate && (
          <span className="app-text-xs app-text-muted app-ml-xs">
            Last pass:{' '}
            {new Date(streak.lastPassDate).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        )}
      </>
    )}
  </Td>
);
