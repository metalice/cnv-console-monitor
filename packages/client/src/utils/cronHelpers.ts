export const DAYS = [
  { id: '1', label: 'Mon' },
  { id: '2', label: 'Tue' },
  { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' },
  { id: '5', label: 'Fri' },
  { id: '6', label: 'Sat' },
  { id: '0', label: 'Sun' },
];

export const WEEKDAY_IDS = new Set(['1', '2', '3', '4', '5']);
export const ALL_DAY_IDS = new Set(DAYS.map(day => day.id));

export type CronParsed = { hour: number; minute: number; days: Set<string> };

export const parseCron = (cron: string): CronParsed => {
  const parts = cron.split(' ');
  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 7;
  const daysPart = parts[4] || '*';
  if (daysPart === '*') return { hour, minute, days: new Set(ALL_DAY_IDS) };
  const dayIds = daysPart.split(',').flatMap(seg => {
    const match = seg.match(/^(\d)-(\d)$/);
    if (match) {
      const result: string[] = [];
      for (let i = parseInt(match[1]); i <= parseInt(match[2]); i++) result.push(String(i));
      return result;
    }
    return [seg];
  });
  return { hour, minute, days: new Set(dayIds) };
}

export const buildCron = (hour: number, minute: number, days: Set<string>): string => {
  const dayStr = days.size === 0 || days.size === 7
    ? '*'
    : [...days].sort((a, b) => parseInt(a) - parseInt(b)).join(',');
  return `${minute} ${hour} * * ${dayStr}`;
}

export const formatScheduleLabel = (cron: string): string => {
  const { hour, minute, days } = parseCron(cron);
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  if (days.size === 7) return `Daily at ${time}`;
  if (days.size === 5 && [...WEEKDAY_IDS].every(dayId => days.has(dayId)) && !days.has('0') && !days.has('6'))
    return `Weekdays at ${time}`;
  if (days.size === 2 && days.has('0') && days.has('6')) return `Weekends at ${time}`;
  const labels = DAYS.filter(day => days.has(day.id)).map(day => day.label);
  return `${labels.join(', ')} at ${time}`;
}

export type DayPreset = 'every-day' | 'weekdays' | 'custom';

export const getDayPreset = (days: Set<string>): DayPreset => {
  if (days.size === 7) return 'every-day';
  if (days.size === 5 && [...WEEKDAY_IDS].every(dayId => days.has(dayId)) && !days.has('0') && !days.has('6'))
    return 'weekdays';
  return 'custom';
}

export const TIMEZONE_LIST: string[] = (() => {
  const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  if (typeof supportedValuesOf === 'function') return supportedValuesOf('timeZone').slice().sort();
  return [
    'Asia/Jerusalem', 'UTC', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin',
    'Europe/Prague', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney',
  ];
})();
