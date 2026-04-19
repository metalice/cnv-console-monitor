import { type ReportState } from '../schemas/teamReport';
import { type WorkItemStatus } from '../schemas/workItem';

const REPORT_STATE_LABELS: Record<ReportState, string> = {
  DRAFT: 'Draft',
  FINALIZED: 'Finalized',
  SENT: 'Sent',
};

const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  BLOCKED: 'Blocked',
  DONE: 'Done',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  STUCK: 'Stuck',
};

export const reportStateLabel = (state: ReportState): string => REPORT_STATE_LABELS[state];

export const workItemStatusLabel = (status: WorkItemStatus): string =>
  WORK_ITEM_STATUS_LABELS[status];

export const formatPersonName = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

export const pluralize = (count: number, singular: string, plural?: string): string =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
