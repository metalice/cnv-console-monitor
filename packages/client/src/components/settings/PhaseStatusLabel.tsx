import { Button, Flex, FlexItem, Label } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ClockIcon,
  RedoIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';

import { type PhaseState } from '../../api/poll';

type PhaseStatusLabelProps = {
  state: PhaseState;
  onRetry?: () => void;
  retrying?: boolean;
};

export const PhaseStatusLabel = ({ onRetry, retrying, state }: PhaseStatusLabelProps) => {
  if (state.status === 'idle' && !onRetry) {
    return (
      <Label isCompact color="grey" icon={<ClockIcon />}>
        Waiting
      </Label>
    );
  }
  if (state.status === 'running') {
    return (
      <Label isCompact color="blue">
        Fetching
      </Label>
    );
  }
  if (state.status === 'retrying') {
    const retryableCount = state.errors.filter(err => !err.permanent).length;
    return (
      <Label isCompact color="orange" icon={<SyncAltIcon />}>
        Retrying {retryableCount} (round {state.retryRound})
      </Label>
    );
  }
  if (state.status === 'skipped') {
    return (
      <Label isCompact color="grey">
        Skipped
      </Label>
    );
  }

  const retryButton = onRetry && (
    <FlexItem>
      <Button
        icon={<RedoIcon />}
        isDisabled={retrying}
        isLoading={retrying}
        size="sm"
        variant="link"
        onClick={onRetry}
      >
        {state.status === 'idle' ? 'Run' : 'Retry'}
      </Button>
    </FlexItem>
  );

  if (state.status === 'complete') {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Label isCompact color="green" icon={<CheckCircleIcon />}>
            {state.succeeded.toLocaleString()}
          </Label>
        </FlexItem>
        {retryButton}
      </Flex>
    );
  }
  if (state.status === 'cancelled') {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Label isCompact color="grey" icon={<BanIcon />}>
            Cancelled
          </Label>
        </FlexItem>
        {retryButton}
      </Flex>
    );
  }
  return retryButton ?? null;
};
