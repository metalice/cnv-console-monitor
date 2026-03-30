import { type ApproverStat } from '@cnv-monitor/shared';

export type EnrichedApprover = ApproverStat & {
  coverage: number;
  current: number;
  longest: number;
};

export const REVIEWER_ACCESSORS: Record<
  number,
  (approver: EnrichedApprover) => string | number | null
> = {
  0: approver => approver.reviewer,
  1: approver => approver.totalReviews,
  2: approver => approver.coverage,
  3: approver => approver.current,
  4: approver => approver.lastReviewDate,
};

export const computeReviewerStreak = (
  dates: string[],
  totalDays: number,
): { coverage: number; current: number; longest: number } => {
  if (dates.length === 0) {
    return { coverage: 0, current: 0, longest: 0 };
  }
  const set = new Set(dates);
  const today = new Date();
  const toStr = (date: Date) => date.toISOString().split('T')[0];

  let current = 0;
  const cursorDate = new Date(today);
  if (!set.has(toStr(cursorDate))) {
    cursorDate.setDate(cursorDate.getDate() - 1);
  }
  while (set.has(toStr(cursorDate))) {
    current++;
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  let longest = 0;
  let streak = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (set.has(toStr(check))) {
      streak++;
      if (streak > longest) {
        longest = streak;
      }
    } else {
      streak = 0;
    }
  }

  let weekdays = 0;
  for (let i = 0; i < totalDays; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (check.getDay() !== 0 && check.getDay() !== 6) {
      weekdays++;
    }
  }

  return {
    coverage: weekdays > 0 ? Math.round((dates.length / weekdays) * 100) : 0,
    current,
    longest,
  };
};
