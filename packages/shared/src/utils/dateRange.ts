const MONDAY = 1;
const DAYS_IN_WEEK = 7;

export const getWeekBoundaries = (date: Date = new Date()): { end: Date; start: Date } => {
  const dayOfWeek = date.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : MONDAY) - dayOfWeek;

  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + DAYS_IN_WEEK - 1);
  end.setHours(23, 59, 59, 999);

  return { end, start };
};

export const getWeekId = (date: Date = new Date()): string => {
  const { start } = getWeekBoundaries(date);
  const year = start.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const daysSinceJan1 = Math.floor((start.getTime() - oneJan.getTime()) / 86_400_000);
  const weekNumber = Math.ceil((daysSinceJan1 + oneJan.getDay() + 1) / DAYS_IN_WEEK);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

export const formatDateRange = (start: Date, end: Date): string => {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} - ${endStr}`;
};

export const getReportId = (since: string, until: string): string => {
  const start = new Date(since);
  const end = new Date(until);
  const { end: weekEnd, start: weekStart } = getWeekBoundaries(start);
  const isWeekAligned =
    start.toDateString() === weekStart.toDateString() &&
    end.toDateString() === weekEnd.toDateString();
  return isWeekAligned ? getWeekId(start) : `${since.split('T')[0]}_${until.split('T')[0]}`;
};

const MAX_REPORT_RANGE_DAYS = 30;

export const validateDateRange = (since: string, until: string): string | null => {
  const start = new Date(since);
  const end = new Date(until);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid date format.';
  if (start >= end) return 'Start date must be before end date.';
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  if (daysDiff > MAX_REPORT_RANGE_DAYS)
    return `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`;
  return null;
};
