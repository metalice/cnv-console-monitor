import type { KeyboardEvent, MouseEvent } from 'react';

import { Tooltip } from '@patternfly/react-core';

import {
  type CalendarEvent,
  DAY_HEADERS,
  type DayEntry,
  MAX_VISIBLE_EVENTS,
} from './calendarHelpers';

type CalendarGridProps = {
  weeks: (DayEntry | null)[][];
  events: Map<string, CalendarEvent[]>;
  todayStr: string;
  onSelectVersion?: (shortname: string) => void;
};

export const CalendarGrid = ({ events, onSelectVersion, todayStr, weeks }: CalendarGridProps) => (
  <div className="app-rel-cal">
    <div className="app-rel-cal-header">
      {DAY_HEADERS.map(dayHeader => (
        <div className="app-rel-cal-hcell" key={dayHeader}>
          {dayHeader}
        </div>
      ))}
    </div>
    {weeks.map((week, weekIdx) => (
      // eslint-disable-next-line react/no-array-index-key
      <div className="app-rel-cal-row" key={weekIdx}>
        {week.map((cell, cellIdx) => {
          if (!cell) {
            // eslint-disable-next-line react/no-array-index-key
            return <div className="app-rel-cal-cell app-rel-cal-empty" key={cellIdx} />;
          }
          const dayEvents = events.get(cell.dateStr) ?? [];
          const isToday = cell.dateStr === todayStr;
          return (
            <div
              className={`app-rel-cal-cell ${isToday ? 'app-rel-cal-today' : ''}`}
              // eslint-disable-next-line react/no-array-index-key
              key={cellIdx}
            >
              <span className="app-rel-cal-day">{cell.day}</span>
              {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((evt, evtIdx) => (
                // eslint-disable-next-line react/no-array-index-key
                <Tooltip content={`${evt.version}: ${evt.milestone}`} key={evtIdx}>
                  <div
                    className={`app-rel-cal-event ${onSelectVersion ? 'app-rel-cal-event-clickable' : ''}`}
                    style={{ borderLeftColor: evt.color }}
                    {...(onSelectVersion
                      ? {
                          onClick: (e: MouseEvent) => {
                            e.stopPropagation();
                            onSelectVersion(evt.shortname);
                          },
                          onKeyDown: (e: KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelectVersion(evt.shortname);
                            }
                          },
                          role: 'button' as const,
                          tabIndex: 0,
                        }
                      : {})}
                  >
                    <span className="app-text-xs">
                      {evt.version} {evt.milestone.substring(0, 12)}
                    </span>
                  </div>
                </Tooltip>
              ))}
              {dayEvents.length > MAX_VISIBLE_EVENTS && (
                <span className="app-text-xs app-text-muted">
                  +{dayEvents.length - MAX_VISIBLE_EVENTS}
                </span>
              )}
            </div>
          );
        })}
      </div>
    ))}
  </div>
);
