import { useMemo } from 'react';

import type { AckHistoryEntry } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Tooltip,
} from '@patternfly/react-core';

import { CalendarGrid, CalendarLegend } from './CalendarGrid';
import { buildCalendarData, MIN_DAYS } from './calendarHelpers';

type ReviewCalendarProps = {
  history: AckHistoryEntry[];
  days: number;
};

export const ReviewCalendar = ({ days: rawDays, history }: ReviewCalendarProps) => {
  const days = Math.max(rawDays, MIN_DAYS);

  const { monthLabels, stats, todayDate, weeks } = useMemo(
    () => buildCalendarData(history, days),
    [history, days],
  );

  const pct =
    stats.weekdaysTotal > 0 ? Math.round((stats.weekdaysReviewed / stats.weekdaysTotal) * 100) : 0;

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            Review Calendar
            <Content
              className="app-text-muted app-ml-sm"
              component="small"
              style={{ display: 'inline' }}
            >
              Daily report acknowledgment tracking
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <Tooltip content="How many weekdays had at least one person acknowledge the daily report.">
                  <span className="app-text-xs app-text-muted app-cursor-help">
                    {stats.weekdaysReviewed}/{stats.weekdaysTotal} weekdays ({pct}%)
                  </span>
                </Tooltip>
              </FlexItem>
              <FlexItem>
                <Tooltip content="Number of consecutive days (ending today or yesterday) where the report was acknowledged.">
                  <span className="app-text-xs app-text-muted app-cursor-help">
                    {stats.current}d streak
                  </span>
                </Tooltip>
              </FlexItem>
              {stats.longest > stats.current && (
                <FlexItem>
                  <Tooltip content="Longest consecutive streak of acknowledged days in this period.">
                    <span className="app-text-xs app-text-muted app-cursor-help">
                      {stats.longest}d best
                    </span>
                  </Tooltip>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <CalendarGrid monthLabels={monthLabels} todayDate={todayDate} weeks={weeks} />
        <CalendarLegend stats={stats} />
      </CardBody>
    </Card>
  );
};
