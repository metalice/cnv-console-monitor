import React, { useMemo } from 'react';

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

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const MIN_DAYS = 30;

const toDateStr = (date: Date): string => date.toISOString().split('T')[0];

const computeStreak = (
  reviewedSet: Set<string>,
  totalDays: number,
): { current: number; longest: number } => {
  const today = new Date();
  let current = 0;
  const cursorDate = new Date(today);
  if (!reviewedSet.has(toDateStr(cursorDate))) {
    cursorDate.setDate(cursorDate.getDate() - 1);
  }
  while (reviewedSet.has(toDateStr(cursorDate))) {
    current++;
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  let longest = 0,
    streak = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (reviewedSet.has(toDateStr(check))) {
      streak++;
      if (streak > longest) {
        longest = streak;
      }
    } else {
      streak = 0;
    }
  }
  return { current, longest };
};

type DayCell = { date: string; reviewers: string[]; dayOfWeek: number; month: number };

type ReviewCalendarProps = {
  history: AckHistoryEntry[];
  days: number;
};

export const ReviewCalendar: React.FC<ReviewCalendarProps> = ({ days: rawDays, history }) => {
  const days = Math.max(rawDays, MIN_DAYS);

  const { monthLabels, stats, todayDate, weeks } = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of history) {
      map.set(entry.date, entry.reviewers);
    }
    const revSet = new Set(map.keys());

    const today = new Date();
    const todayS = toDateStr(today);
    const allDays: DayCell[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayDate = new Date(today);
      dayDate.setDate(dayDate.getDate() - i);
      const dateStr = toDateStr(dayDate);
      allDays.push({
        date: dateStr,
        dayOfWeek: dayDate.getDay(),
        month: dayDate.getMonth(),
        reviewers: map.get(dateStr) ?? [],
      });
    }

    const wks: (DayCell | null)[][] = [];
    let currentWeek: (DayCell | null)[] = Array.from<DayCell | null>({ length: 7 }).fill(null);
    for (const day of allDays) {
      const col = day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1;
      currentWeek[col] = day;
      if (col === 6) {
        wks.push(currentWeek);
        currentWeek = Array.from<DayCell | null>({ length: 7 }).fill(null);
      }
    }
    if (currentWeek.some(cell => cell !== null)) {
      wks.push(currentWeek);
    }

    const mLabels: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;
    for (let weekIndex = 0; weekIndex < wks.length; weekIndex++) {
      const firstDay = wks[weekIndex].find(dayCell => dayCell !== null);
      if (firstDay && firstDay.month !== lastMonth) {
        mLabels.push({ label: MONTH_NAMES[firstDay.month], weekIdx: weekIndex });
        lastMonth = firstDay.month;
      }
    }

    const weekdaysOnly = allDays.filter(
      dayCell => dayCell.dayOfWeek !== 0 && dayCell.dayOfWeek !== 6,
    );
    const weekdaysReviewed = weekdaysOnly.filter(dayCell => dayCell.reviewers.length > 0).length;
    const { current, longest } = computeStreak(revSet, days);

    return {
      monthLabels: mLabels,
      stats: { current, longest, weekdaysReviewed, weekdaysTotal: weekdaysOnly.length },
      todayDate: todayS,
      weeks: wks,
    };
  }, [history, days]);

  const getCellClass = (day: DayCell): string => {
    const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
    const isToday = day.date === todayDate;
    let cls = 'app-cal-cell';
    if (isToday) {
      cls += ' app-cal-today';
    }
    if (day.reviewers.length === 0) {
      cls += isWeekend ? ' app-cal-weekend' : ' app-cal-empty';
    } else if (day.reviewers.length === 1) {
      cls += ' app-cal-l1';
    } else if (day.reviewers.length === 2) {
      cls += ' app-cal-l2';
    } else {
      cls += ' app-cal-l3';
    }
    return cls;
  };

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
        <div className="app-cal-container">
          <div className="app-cal-months">
            <div className="app-cal-month-spacer" />
            {weeks.map((_weekRow, weekIndex) => {
              const monthLabel = monthLabels.find(entry => entry.weekIdx === weekIndex);
              return (
                // eslint-disable-next-line react/no-array-index-key
                <div className="app-cal-month-label" key={weekIndex}>
                  {monthLabel ? monthLabel.label : ''}
                </div>
              );
            })}
          </div>
          <div className="app-cal-grid">
            <div className="app-cal-labels">
              {DAY_LABELS.map((label, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div className="app-cal-label" key={i}>
                  {label}
                </div>
              ))}
            </div>
            <div className="app-cal-weeks">
              {weeks.map((week, weekIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <div className="app-cal-week" key={weekIndex}>
                  {week.map((day, dayIndex) =>
                    day ? (
                      <Tooltip
                        content={
                          day.reviewers.length > 0
                            ? `${day.date}: ${day.reviewers.join(', ')}`
                            : `${day.date}: Not reviewed`
                        }
                        key={day.date}
                      >
                        <div className={getCellClass(day)} />
                      </Tooltip>
                    ) : (
                      <div
                        className="app-cal-cell app-cal-none"
                        key={`e-${weekIndex}-${dayIndex}`} // eslint-disable-line react/no-array-index-key -- empty grid slot
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          className="app-mt-sm"
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          <FlexItem>
            <span className="app-text-xs app-text-muted">Less</span>
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-weekend app-cal-legend" />
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-empty app-cal-legend" />
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-l1 app-cal-legend" />
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-l2 app-cal-legend" />
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-l3 app-cal-legend" />
          </FlexItem>
          <FlexItem>
            <span className="app-text-xs app-text-muted">More</span>
          </FlexItem>
          <FlexItem>
            <span className="app-text-xs app-text-muted">|</span>
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-weekend app-cal-legend" />
            <span className="app-text-xs app-text-muted app-ml-xs">Weekend</span>
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-empty app-cal-legend" />
            <span className="app-text-xs app-text-muted app-ml-xs">Not reviewed</span>
          </FlexItem>
          <FlexItem>
            <div className="app-cal-cell app-cal-today app-cal-empty app-cal-legend" />
            <span className="app-text-xs app-text-muted app-ml-xs">Today</span>
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};
