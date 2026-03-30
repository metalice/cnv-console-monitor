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

export const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
export const MIN_DAYS = 30;

export type DayCell = { date: string; reviewers: string[]; dayOfWeek: number; month: number };

export type CalendarStats = {
  current: number;
  longest: number;
  weekdaysReviewed: number;
  weekdaysTotal: number;
};

export type MonthLabel = { weekIdx: number; label: string };

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

export const buildCalendarData = (
  history: { date: string; reviewers: string[] }[],
  days: number,
): {
  weeks: (DayCell | null)[][];
  monthLabels: MonthLabel[];
  stats: CalendarStats;
  todayDate: string;
} => {
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

  const mLabels: MonthLabel[] = [];
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
};

export const getCellClass = (day: DayCell, todayDate: string): string => {
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
