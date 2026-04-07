import { useMemo } from 'react';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import { type CalendarEvent, type DayEntry, toDateStr, VERSION_COLORS } from './calendarHelpers';

export const useCalendarData = (releases: ReleaseInfo[], monthOffset: number) =>
  useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const label = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const evtMap = new Map<string, CalendarEvent[]>();
    releases.forEach((rel, idx) => {
      const color = VERSION_COLORS[idx % VERSION_COLORS.length];
      for (const milestone of rel.milestones) {
        const key = milestone.date;
        if (!evtMap.has(key)) {
          evtMap.set(key, []);
        }
        evtMap.get(key)?.push({
          color,
          milestone: milestone.name
            .replace(/^Batch\s+/, '')
            .replace(/GA Stable Release|GA Release/g, 'GA')
            .trim(),
          milestoneType: milestone.type,
          shortname: rel.shortname,
          version: rel.shortname.replace('cnv-', ''),
        });
      }
    });

    const firstDay = new Date(year, month, 1);
    const startCol = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const wks: (DayEntry | null)[][] = [];
    let week: (DayEntry | null)[] = Array.from<DayEntry | null>({ length: 7 }).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const col = (startCol + day - 1) % 7;
      if (col === 0 && day > 1) {
        wks.push(week);
        week = Array.from<DayEntry | null>({ length: 7 }).fill(null);
      }
      const dateObj = new Date(year, month, day);
      week[col] = { dateStr: toDateStr(dateObj), day };
    }
    wks.push(week);

    return { events: evtMap, monthLabel: label, weeks: wks };
  }, [releases, monthOffset]);
