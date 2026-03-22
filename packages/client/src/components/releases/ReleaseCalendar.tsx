import React, { useMemo, useState } from 'react';
import { Card, CardBody, CardTitle, Flex, FlexItem, Button, Tooltip, Label } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { ReleaseInfo } from '@cnv-monitor/shared';

const VERSION_COLORS = ['#2b9af3', '#3e8635', '#ec7a08', '#6753ac', '#c9190b', '#009596', '#f0ab00', '#8a8d90'];
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

type CalendarEvent = { version: string; shortname: string; milestone: string; color: string };

type ReleaseCalendarProps = {
  releases: ReleaseInfo[];
  onSelectVersion?: (shortname: string) => void;
};

export const ReleaseCalendar: React.FC<ReleaseCalendarProps> = ({ releases, onSelectVersion }) => {
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, weeks, events, monthLabel } = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const y = target.getFullYear();
    const m = target.getMonth();
    const label = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const evtMap = new Map<string, CalendarEvent[]>();
    const versionColors = new Map<string, string>();
    releases.forEach((r, i) => {
      const color = VERSION_COLORS[i % VERSION_COLORS.length];
      versionColors.set(r.shortname, color);
      for (const ms of r.milestones) {
        const key = ms.date;
        if (!evtMap.has(key)) evtMap.set(key, []);
        evtMap.get(key)!.push({
          version: r.shortname.replace('cnv-', ''),
          shortname: r.shortname,
          milestone: ms.name.replace(/^Batch\s+/, '').replace(/GA Stable Release|GA Release/g, 'GA').trim(),
          color,
        });
      }
    });

    const firstDay = new Date(y, m, 1);
    const startCol = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const wks: Array<Array<{ day: number; dateStr: string } | null>> = [];
    let week: Array<{ day: number; dateStr: string } | null> = new Array(7).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const col = (startCol + d - 1) % 7;
      if (col === 0 && d > 1) { wks.push(week); week = new Array(7).fill(null); }
      const dt = new Date(y, m, d);
      week[col] = { day: d, dateStr: toDateStr(dt) };
    }
    wks.push(week);

    return { year: y, month: m, weeks: wks, events: evtMap, monthLabel: label };
  }, [releases, monthOffset]);

  const todayStr = toDateStr(new Date());

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            Release Calendar{' '}
            <Tooltip content="Month view showing all release milestones across CNV versions. Color-coded by version. Hover over events for details.">
              <OutlinedQuestionCircleIcon className="app-help-icon" />
            </Tooltip>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem><Button variant="plain" size="sm" icon={<AngleLeftIcon />} onClick={() => setMonthOffset(o => o - 1)} aria-label="Previous month" /></FlexItem>
              <FlexItem><strong>{monthLabel}</strong></FlexItem>
              <FlexItem><Button variant="plain" size="sm" icon={<AngleRightIcon />} onClick={() => setMonthOffset(o => o + 1)} aria-label="Next month" /></FlexItem>
              {monthOffset !== 0 && <FlexItem><Button variant="link" size="sm" onClick={() => setMonthOffset(0)}>Today</Button></FlexItem>}
            </Flex>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <div className="app-rel-cal">
          <div className="app-rel-cal-header">
            {DAY_HEADERS.map(d => <div key={d} className="app-rel-cal-hcell">{d}</div>)}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="app-rel-cal-row">
              {week.map((cell, ci) => {
                if (!cell) return <div key={ci} className="app-rel-cal-cell app-rel-cal-empty" />;
                const dayEvents = events.get(cell.dateStr) ?? [];
                const isToday = cell.dateStr === todayStr;
                return (
                  <div key={ci} className={`app-rel-cal-cell ${isToday ? 'app-rel-cal-today' : ''}`}>
                    <span className="app-rel-cal-day">{cell.day}</span>
                    {dayEvents.slice(0, 3).map((evt, ei) => (
                      <Tooltip key={ei} content={`${evt.version}: ${evt.milestone}`}>
                        <div
                          className={`app-rel-cal-event ${onSelectVersion ? 'app-rel-cal-event-clickable' : ''}`}
                          style={{ borderLeftColor: evt.color }}
                          onClick={(e) => { e.stopPropagation(); if (onSelectVersion) onSelectVersion(evt.shortname); }}
                        >
                          <span className="app-text-xs">{evt.version} {evt.milestone.substring(0, 12)}</span>
                        </div>
                      </Tooltip>
                    ))}
                    {dayEvents.length > 3 && <span className="app-text-xs app-text-muted">+{dayEvents.length - 3}</span>}
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
