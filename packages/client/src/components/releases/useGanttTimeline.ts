import { useMemo } from 'react';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import {
  DAY_MS,
  HEADER_HEIGHT,
  ROW_HEIGHT,
  toDay,
  ZOOM_DAYS,
  type ZoomLevel,
} from './ganttConstants';

const PAST_RATIO = 0.3;
const MIN_WIDTH = 1200;

type Marker = { x: number; label: string };

type GanttTimeline = {
  pxPerDay: number;
  timelineStart: number;
  todayPos: number;
  totalWidth: number;
  monthMarkers: Marker[];
  dayMarkers: Marker[];
  svgHeight: number;
  posX: (dateStr: string) => number;
};

const formatMonth = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

const WEEKLY = 7;
const BIWEEKLY = 14;
const MONTHLY = 28;
const HALF_YEAR = 180;

export const useGanttTimeline = (zoom: ZoomLevel, activeReleases: ReleaseInfo[]): GanttTimeline => {
  const { dayMarkers, monthMarkers, pxPerDay, timelineStart, todayPos, totalWidth } =
    useMemo(() => {
      const today = toDay(new Date());
      const zoomDays = ZOOM_DAYS[zoom];
      const start = today - Math.floor(zoomDays * PAST_RATIO) * DAY_MS;
      const end = today + Math.ceil(zoomDays * (1 - PAST_RATIO)) * DAY_MS;
      const pixelPerDay = MIN_WIDTH / zoomDays;
      const width = Math.max(MIN_WIDTH, zoomDays * pixelPerDay);

      const months: Marker[] = [];
      const cursor = new Date(start);
      cursor.setDate(1);
      cursor.setMonth(cursor.getMonth() + 1);
      while (cursor.getTime() < end) {
        months.push({
          label: formatMonth(cursor.getTime()),
          x: ((cursor.getTime() - start) / DAY_MS) * pixelPerDay,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const dayInterval = zoomDays <= 90 ? WEEKLY : zoomDays <= HALF_YEAR ? BIWEEKLY : MONTHLY;
      const days: Marker[] = [];
      const dayStart = new Date(start);
      const dayOfWeek = dayStart.getDay();
      dayStart.setDate(dayStart.getDate() + (dayOfWeek === 0 ? 1 : 8 - dayOfWeek));
      while (dayStart.getTime() < end) {
        const dayNum = dayStart.getDate();
        if (dayInterval <= WEEKLY || dayNum === 1 || dayNum === 15) {
          days.push({
            label: `${dayStart.getDate()}`,
            x: ((dayStart.getTime() - start) / DAY_MS) * pixelPerDay,
          });
        }
        dayStart.setDate(dayStart.getDate() + dayInterval);
      }

      return {
        dayMarkers: days,
        monthMarkers: months,
        pxPerDay: pixelPerDay,
        timelineStart: start,
        todayPos: ((today - start) / DAY_MS) * pixelPerDay,
        totalWidth: width,
      };
    }, [zoom]);

  const EXTRA_PADDING = 10;
  const svgHeight = HEADER_HEIGHT + activeReleases.length * ROW_HEIGHT + EXTRA_PADDING;

  const posX = (dateStr: string): number => {
    const day = toDay(dateStr);
    return ((day - timelineStart) / DAY_MS) * pxPerDay;
  };

  return {
    dayMarkers,
    monthMarkers,
    posX,
    pxPerDay,
    svgHeight,
    timelineStart,
    todayPos,
    totalWidth,
  };
};
