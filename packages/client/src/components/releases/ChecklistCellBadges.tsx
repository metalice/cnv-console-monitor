import { Label, Tooltip } from '@patternfly/react-core';

const DAY_MS = 1000 * 60 * 60 * 24;

const COUNTDOWN_THRESHOLDS = { caution: 14, critical: 3, warning: 7 } as const;

const formatDueDate = (dateStr: string): { label: string; daysLeft: number } => {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due.getTime() - today.getTime()) / DAY_MS);
  const label = due.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return { daysLeft, label };
};

const dueDateColor = (daysLeft: number): 'green' | 'orange' | 'red' | 'yellow' => {
  if (daysLeft <= COUNTDOWN_THRESHOLDS.critical) return 'red';
  if (daysLeft <= COUNTDOWN_THRESHOLDS.warning) return 'orange';
  if (daysLeft <= COUNTDOWN_THRESHOLDS.caution) return 'yellow';
  return 'green';
};

const dueDateSuffix = (daysLeft: number): string => {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'today';
  return `${daysLeft}d left`;
};

export const DueDateBadge = ({ dateStr }: { dateStr: string | null }) => {
  if (!dateStr) return <span className="app-text-muted">--</span>;
  const { daysLeft, label } = formatDueDate(dateStr);
  return (
    <Tooltip content={dueDateSuffix(daysLeft)}>
      <Label isCompact color={dueDateColor(daysLeft)}>
        {label}
      </Label>
    </Tooltip>
  );
};

export const StatusBadge = ({ status }: { status: string }) => {
  const color =
    status === 'Closed'
      ? 'green'
      : status === 'In Progress' || status === 'Testing'
        ? 'blue'
        : status === 'To Do' || status === 'New'
          ? 'orange'
          : 'grey';
  return (
    <Label isCompact color={color}>
      {status}
    </Label>
  );
};

export const SubtaskProgress = ({ done, total }: { done: number; total: number }) => {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <Tooltip content={`${done}/${total} done`}>
      <div className="app-checklist-bar-track">
        <div
          className="app-checklist-bar-fill"
          style={{
            background:
              pct === 100
                ? 'var(--pf-t--global--color--status--success--default)'
                : 'var(--pf-t--global--color--brand--default)',
            width: `${pct}%`,
          }}
        />
      </div>
    </Tooltip>
  );
};
