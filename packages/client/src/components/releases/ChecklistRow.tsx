import React from 'react';

import type { ChecklistTask } from '@cnv-monitor/shared';

import { Button, Label, Tooltip, Truncate } from '@patternfly/react-core';
import { EditAltIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Td, type ThProps, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

const toMajorMinor = (ver: string): string => {
  const stripped = ver
    .replace(/^cnv[\s\-_]*v?/i, '')
    .trim()
    .toLowerCase();
  const match = /(\d{1,20}\.\d{1,20})/.exec(stripped);
  return match ? match[1] : stripped;
};

const getDueDateForTask = (task: ChecklistTask, dueDateMap: Map<string, string>): string | null => {
  for (const fixVersion of task.fixVersions) {
    const majorMinor = toMajorMinor(fixVersion);
    const date = dueDateMap.get(majorMinor);
    if (date) {
      return date;
    }
  }
  return null;
};

const formatDueDate = (dateStr: string): { label: string; daysLeft: number } => {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = due.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return { daysLeft, label };
};

const dueDateBadge = (dateStr: string | null): React.ReactNode => {
  if (!dateStr) {
    return <span className="app-text-muted">--</span>;
  }
  const { daysLeft, label } = formatDueDate(dateStr);
  const color =
    daysLeft < 0
      ? 'red'
      : daysLeft <= 3
        ? 'red'
        : daysLeft <= 7
          ? 'orange'
          : daysLeft <= 14
            ? 'yellow'
            : 'green';
  const suffix =
    daysLeft < 0
      ? `${Math.abs(daysLeft)}d overdue`
      : daysLeft === 0
        ? 'today'
        : `${daysLeft}d left`;
  return (
    <Tooltip content={suffix}>
      <Label isCompact color={color}>
        {label}
      </Label>
    </Tooltip>
  );
};

const statusBadge = (status: string): React.ReactNode => {
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

const progressBar = (done: number, total: number): React.ReactNode => {
  if (total === 0) {
    return null;
  }
  const percentage = Math.round((done / total) * 100);
  return (
    <Tooltip content={`${done}/${total} done`}>
      <div className="app-checklist-bar-track">
        <div
          style={{
            background:
              percentage === 100
                ? 'var(--pf-t--global--color--status--success--default)'
                : 'var(--pf-t--global--color--brand--default)',
            borderRadius: 4,
            height: '100%',
            width: `${percentage}%`,
          }}
        />
      </div>
    </Tooltip>
  );
};

type ColumnVisibility = {
  isColumnVisible: (id: string) => boolean;
  showComponentCol: boolean;
};

type ChecklistHeaderProps = ColumnVisibility & {
  getSortParams: (index: number) => ThProps['sort'];
};

export const ChecklistHeader: React.FC<ChecklistHeaderProps> = ({
  getSortParams,
  isColumnVisible,
  showComponentCol,
}) => (
  <Tr>
    {isColumnVisible('dueDate') && (
      <ThWithHelp
        help="Computed from the next release date for this version. Color-coded by urgency."
        label="Due Date"
        sort={getSortParams(0)}
      />
    )}
    {isColumnVisible('version') && (
      <ThWithHelp
        help="The CNV fix version this task targets."
        label="Version"
        sort={getSortParams(1)}
      />
    )}
    {isColumnVisible('key') && (
      <ThWithHelp
        help="Jira issue key. Click to open in Jira."
        label="Key"
        sort={getSortParams(2)}
      />
    )}
    {isColumnVisible('summary') && (
      <ThWithHelp help="Jira issue title." label="Summary" sort={getSortParams(3)} />
    )}
    {isColumnVisible('status') && (
      <ThWithHelp help="Current Jira workflow status." label="Status" sort={getSortParams(4)} />
    )}
    {showComponentCol && (
      <ThWithHelp
        help="Jira component this task belongs to."
        label="Component"
        sort={getSortParams(5)}
      />
    )}
    {isColumnVisible('assignee') && (
      <ThWithHelp
        help="Person responsible for this task."
        label="Assignee"
        sort={getSortParams(6)}
      />
    )}
    {isColumnVisible('priority') && (
      <ThWithHelp help="Jira priority level." label="Priority" sort={getSortParams(7)} />
    )}
    {isColumnVisible('subtasks') && (
      <ThWithHelp
        help="Progress of sub-tasks. Green bar when all done."
        label="Subtasks"
        sort={getSortParams(8)}
      />
    )}
    {isColumnVisible('updated') && (
      <ThWithHelp
        help="When this issue was last modified in Jira."
        label="Updated"
        sort={getSortParams(9)}
      />
    )}
    {isColumnVisible('actions') && (
      <ThWithHelp help="Update status, add comments, or reassign." label="Actions" />
    )}
  </Tr>
);

type ChecklistRowProps = ColumnVisibility & {
  task: ChecklistTask;
  onEdit: (key: string) => void;
  dueDateMap: Map<string, string>;
};

export const ChecklistRow: React.FC<ChecklistRowProps> = ({
  dueDateMap,
  isColumnVisible,
  onEdit,
  showComponentCol,
  task,
}) => (
  <Tr>
    {isColumnVisible('dueDate') && (
      <Td className="app-cell-nowrap">{dueDateBadge(getDueDateForTask(task, dueDateMap))}</Td>
    )}
    {isColumnVisible('version') && (
      <Td className="app-cell-nowrap">
        <Label isCompact color="blue">
          {task.fixVersions[0] || '--'}
        </Label>
      </Td>
    )}
    {isColumnVisible('key') && (
      <Td className="app-cell-nowrap">
        <a
          aria-label="Open in Jira"
          href={`https://issues.redhat.com/browse/${task.key}`}
          rel="noreferrer"
          target="_blank"
        >
          {task.key} <ExternalLinkAltIcon className="app-text-xs" />
        </a>
      </Td>
    )}
    {isColumnVisible('summary') && (
      <Td className="app-max-w-350">
        <Tooltip content={task.summary}>
          <Truncate content={task.summary} trailingNumChars={0} />
        </Tooltip>
      </Td>
    )}
    {isColumnVisible('status') && <Td className="app-cell-nowrap">{statusBadge(task.status)}</Td>}
    {showComponentCol && (
      <Td className="app-cell-nowrap">
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
        {task.components?.[0] || <span className="app-text-muted">--</span>}
      </Td>
    )}
    {isColumnVisible('assignee') && (
      <Td className="app-cell-nowrap">
        {task.assignee || <span className="app-text-muted">Unassigned</span>}
      </Td>
    )}
    {isColumnVisible('priority') && <Td className="app-cell-nowrap">{task.priority}</Td>}
    {isColumnVisible('subtasks') && (
      <Td className="app-cell-nowrap">
        {progressBar(task.subtasksDone, task.subtaskCount)} {task.subtasksDone}/{task.subtaskCount}
      </Td>
    )}
    {isColumnVisible('updated') && (
      <Td className="app-cell-nowrap">
        <Tooltip content={new Date(task.updated).toLocaleString()}>
          <span>{new Date(task.updated).toLocaleDateString()}</span>
        </Tooltip>
      </Td>
    )}
    {isColumnVisible('actions') && (
      <Td>
        <Button
          aria-label="Update"
          icon={<EditAltIcon />}
          size="sm"
          variant="plain"
          onClick={() => onEdit(task.key)}
        />
      </Td>
    )}
  </Tr>
);
