import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

import { type PipelineRunRecord } from '../../api/poll';

const formatDuration = (millis: number | null): string => {
  if (!millis) return '';
  const seconds = Math.round(millis / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 > 0 ? `${minutes}m ${seconds % 60}s` : `${minutes}m`;
};

type PollRunRowProps = {
  run: PipelineRunRecord;
};

export const PollRunRow = ({ run }: PollRunRowProps) => {
  const date = new Date(run.started_at);
  const hasErrors = Object.values(run.phases).some(phase => phase.failed > 0);

  return (
    <div className="app-poll-summary-row">
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem className="app-text-sm">
              {date.toLocaleDateString()}{' '}
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </FlexItem>
            <FlexItem>
              <Label isCompact color={run.trigger === 'backfill' ? 'blue' : 'grey'}>
                {run.trigger === 'backfill'
                  ? 'Full'
                  : run.trigger === 'scheduled'
                    ? 'Auto'
                    : 'Manual'}
              </Label>
            </FlexItem>
            {run.duration_ms && (
              <FlexItem className="app-text-xs app-text-muted">
                {formatDuration(run.duration_ms)}
              </FlexItem>
            )}
          </Flex>
        </FlexItem>
        <FlexItem>
          {run.cancelled ? (
            <Label isCompact color="grey" icon={<BanIcon />}>
              Cancelled
            </Label>
          ) : hasErrors ? (
            <Label isCompact color="orange" icon={<ExclamationTriangleIcon />}>
              Errors
            </Label>
          ) : (
            <Label isCompact color="green" icon={<CheckCircleIcon />}>
              Complete
            </Label>
          )}
        </FlexItem>
      </Flex>
      {run.summary && <div className="app-text-xs app-text-muted app-mt-xs">{run.summary}</div>}
    </div>
  );
};
