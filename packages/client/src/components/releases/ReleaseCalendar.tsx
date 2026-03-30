import { useState } from 'react';

import { Button, Card, CardBody, CardTitle, Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

import { CalendarGrid } from './CalendarGrid';
import { type ReleaseCalendarProps, toDateStr } from './calendarHelpers';
import { useCalendarData } from './useCalendarData';

export const ReleaseCalendar = ({ onSelectVersion, releases }: ReleaseCalendarProps) => {
  const [monthOffset, setMonthOffset] = useState(0);
  const { events, monthLabel, weeks } = useCalendarData(releases, monthOffset);
  const todayStr = toDateStr(new Date());

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            Release Calendar{' '}
            <Tooltip content="Month view showing all release milestones across CNV versions. Color-coded by version. Hover over events for details.">
              <OutlinedQuestionCircleIcon className="app-help-icon" />
            </Tooltip>
          </FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <Button
                  aria-label="Previous month"
                  icon={<AngleLeftIcon />}
                  size="sm"
                  variant="plain"
                  onClick={() => setMonthOffset(offset => offset - 1)}
                />
              </FlexItem>
              <FlexItem>
                <strong>{monthLabel}</strong>
              </FlexItem>
              <FlexItem>
                <Button
                  aria-label="Next month"
                  icon={<AngleRightIcon />}
                  size="sm"
                  variant="plain"
                  onClick={() => setMonthOffset(offset => offset + 1)}
                />
              </FlexItem>
              {monthOffset !== 0 && (
                <FlexItem>
                  <Button size="sm" variant="link" onClick={() => setMonthOffset(0)}>
                    Today
                  </Button>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <CalendarGrid
          events={events}
          todayStr={todayStr}
          weeks={weeks}
          onSelectVersion={onSelectVersion}
        />
      </CardBody>
    </Card>
  );
};
