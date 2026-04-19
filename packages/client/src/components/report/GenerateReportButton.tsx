import { useCallback, useMemo, useRef, useState } from 'react';

import { getWeekBoundaries, validateDateRange } from '@cnv-monitor/shared';

import {
  Button,
  DatePicker,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlayIcon } from '@patternfly/react-icons';

import { useComponentFilter } from '../../context/ComponentFilterContext';
import { useReportPollStatus } from '../../hooks/useReportPollStatus';

const toDateStr = (date: Date): string => date.toISOString().split('T')[0];

type GenerateReportButtonProps = {
  pollStatusOverride?: ReturnType<typeof useReportPollStatus>;
};

export const GenerateReportButton = ({ pollStatusOverride }: GenerateReportButtonProps) => {
  const { selectedComponents } = useComponentFilter();
  const ownPollStatus = useReportPollStatus({ silent: true });
  const pollStatus = pollStatusOverride ?? ownPollStatus;
  const isRunning = pollStatus.status.status === 'running' || pollStatus.isStarting;

  const defaultRange = useMemo(() => {
    const { end, start } = getWeekBoundaries();
    return { end: toDateStr(end), start: toDateStr(start) };
  }, []);

  const [since, setSince] = useState(defaultRange.start);
  const [until, setUntil] = useState(defaultRange.end);

  const rangeError = useMemo(() => validateDateRange(since, until), [since, until]);
  const components = useMemo(() => [...selectedComponents], [selectedComponents]);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleGenerate = useCallback(() => {
    if (rangeError) return;
    setPopoverOpen(false);
    pollStatus
      .trigger({
        components: components.length > 0 ? components : undefined,
        since,
        until,
      })
      .catch(Boolean);
  }, [components, pollStatus, rangeError, since, until]);

  const bodyContent = (
    <Stack hasGutter>
      <StackItem>
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <DatePicker
              aria-label="Start date"
              value={since}
              onChange={(_e, val) => setSince(val)}
            />
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>to</FlexItem>
          <FlexItem>
            <DatePicker aria-label="End date" value={until} onChange={(_e, val) => setUntil(val)} />
          </FlexItem>
        </Flex>
      </StackItem>
      {rangeError && (
        <StackItem>
          <HelperText>
            <HelperTextItem variant="error">{rangeError}</HelperTextItem>
          </HelperText>
        </StackItem>
      )}
      <StackItem>
        <HelperText>
          <HelperTextItem>
            {components.length > 0
              ? `Will generate ${components.length} report${components.length > 1 ? 's' : ''}: ${components.join(', ')}`
              : 'Will generate a report for all components'}
          </HelperTextItem>
        </HelperText>
      </StackItem>
      <StackItem>
        <Button
          isDisabled={Boolean(rangeError) || isRunning}
          isLoading={isRunning}
          variant="primary"
          onClick={handleGenerate}
        >
          Generate
        </Button>
      </StackItem>
    </Stack>
  );

  return (
    <Popover
      bodyContent={bodyContent}
      headerContent="Generate Team Report"
      isVisible={popoverOpen}
      position="bottom"
      shouldClose={() => setPopoverOpen(false)}
      triggerRef={triggerRef}
    >
      <Button
        icon={<PlayIcon />}
        isLoading={isRunning}
        ref={triggerRef}
        variant="primary"
        onClick={() => setPopoverOpen(prev => !prev)}
      >
        Generate Report
      </Button>
    </Popover>
  );
};
