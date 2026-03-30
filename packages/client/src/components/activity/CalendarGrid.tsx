import { Flex, FlexItem, Tooltip } from '@patternfly/react-core';

import {
  type CalendarStats,
  DAY_LABELS,
  type DayCell,
  getCellClass,
  type MonthLabel,
} from './calendarHelpers';

type CalendarGridProps = {
  weeks: (DayCell | null)[][];
  monthLabels: MonthLabel[];
  todayDate: string;
};

export const CalendarGrid = ({ monthLabels, todayDate, weeks }: CalendarGridProps) => (
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
                  <div className={getCellClass(day, todayDate)} />
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
);

type CalendarLegendProps = {
  stats: CalendarStats;
};

export const CalendarLegend = ({ stats }: CalendarLegendProps) => {
  const pct =
    stats.weekdaysTotal > 0 ? Math.round((stats.weekdaysReviewed / stats.weekdaysTotal) * 100) : 0;

  return (
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
        <span className="app-text-xs app-text-muted app-ml-xs">Not reviewed ({pct}%)</span>
      </FlexItem>
      <FlexItem>
        <div className="app-cal-cell app-cal-today app-cal-empty app-cal-legend" />
        <span className="app-text-xs app-text-muted app-ml-xs">Today</span>
      </FlexItem>
    </Flex>
  );
};
