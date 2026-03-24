import React, { useMemo, useState } from 'react';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Button, Card, CardBody, CardTitle, Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

const VERSION_COLORS = [
  '#2b9af3',
  '#3e8635',
  '#ec7a08',
  '#6753ac',
  '#c9190b',
  '#009596',
  '#f0ab00',
  '#8a8d90',
];
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

type CalendarEvent = { version: string; shortname: string; milestone: string; color: string };

type ReleaseCalendarProps = {
  releases: ReleaseInfo[];
  onSelectVersion?: (shortname: string) => void;
};

export const ReleaseCalendar: React.FC<ReleaseCalendarProps> = ({ onSelectVersion, releases }) => {
  const [monthOffset, setMonthOffset] = useState(0);

  const { events, monthLabel, weeks } = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const y = target.getFullYear();
    const m = target.getMonth();
    const label = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const evtMap = new Map<string, CalendarEvent[]>();
    releases.forEach((r, i) => {
      const color = VERSION_COLORS[i % VERSION_COLORS.length];
      for (const ms of r.milestones) {
        const key = ms.date;
        if (!evtMap.has(key)) {
          evtMap.set(key, []);
        }
        evtMap.get(key)?.push({
          color,
          milestone: ms.name
            .replace(/^Batch\s+/, '')
            .replace(/GA Stable Release|GA Release/g, 'GA')
            .trim(),
          shortname: r.shortname,
          version: r.shortname.replace('cnv-', ''),
        });
      }
    });

    const firstDay = new Date(y, m, 1);
    const startCol = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    type DayEntry = { day: number; dateStr: string };
    const wks: (DayEntry | null)[][] = [];
    let week: (DayEntry | null)[] = Array.from<DayEntry | null>({ length: 7 }).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const col = (startCol + d - 1) % 7;
      if (col === 0 && d > 1) {
        wks.push(week);
        week = Array.from<DayEntry | null>({ length: 7 }).fill(null);
      }
      const dt = new Date(y, m, d);
      week[col] = { dateStr: toDateStr(dt), day: d };
    }
    wks.push(week);

    return { events: evtMap, month: m, monthLabel: label, weeks: wks, year: y };
  }, [releases, monthOffset]);

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
                  onClick={() => setMonthOffset(o => o - 1)}
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
                  onClick={() => setMonthOffset(o => o + 1)}
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
        <div className="app-rel-cal">
          <div className="app-rel-cal-header">
            {DAY_HEADERS.map(d => (
              <div className="app-rel-cal-hcell" key={d}>
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="app-rel-cal-row" key={wi}>
              {week.map((cell, ci) => {
                if (!cell) {
                  // eslint-disable-next-line react/no-array-index-key
                  return <div className="app-rel-cal-cell app-rel-cal-empty" key={ci} />;
                }
                const dayEvents = events.get(cell.dateStr) ?? [];
                const isToday = cell.dateStr === todayStr;
                return (
                  <div
                    className={`app-rel-cal-cell ${isToday ? 'app-rel-cal-today' : ''}`}
                    // eslint-disable-next-line react/no-array-index-key
                    key={ci}
                  >
                    <span className="app-rel-cal-day">{cell.day}</span>
                    {dayEvents.slice(0, 3).map((evt, ei) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Tooltip content={`${evt.version}: ${evt.milestone}`} key={ei}>
                        <div
                          className={`app-rel-cal-event ${onSelectVersion ? 'app-rel-cal-event-clickable' : ''}`}
                          style={{ borderLeftColor: evt.color }}
                          {...(onSelectVersion
                            ? {
                                onClick: (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onSelectVersion(evt.shortname);
                                },
                                onKeyDown: (e: React.KeyboardEvent) => {
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
                    {dayEvents.length > 3 && (
                      <span className="app-text-xs app-text-muted">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
