import React from 'react';
import { Button, Label, Tooltip, Truncate } from '@patternfly/react-core';
import { Tr, Td, type ThProps } from '@patternfly/react-table';
import { ExternalLinkAltIcon, EditAltIcon } from '@patternfly/react-icons';
import type { ChecklistTask } from '@cnv-monitor/shared';
import { ThWithHelp } from '../common/ThWithHelp';

const toMajorMinor = (v: string): string => {
  const stripped = v.replace(/^cnv[\s\-_]*v?/i, '').trim().toLowerCase();
  const match = stripped.match(/(\d+\.\d+)/);
  return match ? match[1] : stripped;
};

const getDueDateForTask = (task: ChecklistTask, dueDateMap: Map<string, string>): string | null => {
  for (const fv of task.fixVersions) {
    const mm = toMajorMinor(fv);
    const date = dueDateMap.get(mm);
    if (date) return date;
  }
  return null;
};

const formatDueDate = (dateStr: string): { label: string; daysLeft: number } => {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return { label, daysLeft };
};

const dueDateBadge = (dateStr: string | null): React.ReactNode => {
  if (!dateStr) return <span className="app-text-muted">--</span>;
  const { label, daysLeft } = formatDueDate(dateStr);
  const color = daysLeft < 0 ? 'red' : daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'orange' : daysLeft <= 14 ? 'yellow' : 'green';
  const suffix = daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'today' : `${daysLeft}d left`;
  return (
    <Tooltip content={suffix}>
      <Label color={color} isCompact>{label}</Label>
    </Tooltip>
  );
};

const statusBadge = (status: string): React.ReactNode => {
  const color = status === 'Closed' ? 'green'
    : status === 'In Progress' || status === 'Testing' ? 'blue'
    : status === 'To Do' || status === 'New' ? 'orange'
    : 'grey';
  return <Label color={color} isCompact>{status}</Label>;
};

const progressBar = (done: number, total: number): React.ReactNode => {
  if (total === 0) return null;
  const percentage = Math.round((done / total) * 100);
  return (
    <Tooltip content={`${done}/${total} done`}>
      <div className="app-checklist-bar-track">
        <div style={{ width: `${percentage}%`, height: '100%', background: percentage === 100 ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--color--brand--default)', borderRadius: 4 }} />
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

export const ChecklistHeader: React.FC<ChecklistHeaderProps> = ({ isColumnVisible, showComponentCol, getSortParams }) => (
  <Tr>
    {isColumnVisible('dueDate') && <ThWithHelp label="Due Date" help="Computed from the next release date for this version. Color-coded by urgency." sort={getSortParams(0)} />}
    {isColumnVisible('version') && <ThWithHelp label="Version" help="The CNV fix version this task targets." sort={getSortParams(1)} />}
    {isColumnVisible('key') && <ThWithHelp label="Key" help="Jira issue key. Click to open in Jira." sort={getSortParams(2)} />}
    {isColumnVisible('summary') && <ThWithHelp label="Summary" help="Jira issue title." sort={getSortParams(3)} />}
    {isColumnVisible('status') && <ThWithHelp label="Status" help="Current Jira workflow status." sort={getSortParams(4)} />}
    {showComponentCol && <ThWithHelp label="Component" help="Jira component this task belongs to." sort={getSortParams(5)} />}
    {isColumnVisible('assignee') && <ThWithHelp label="Assignee" help="Person responsible for this task." sort={getSortParams(6)} />}
    {isColumnVisible('priority') && <ThWithHelp label="Priority" help="Jira priority level." sort={getSortParams(7)} />}
    {isColumnVisible('subtasks') && <ThWithHelp label="Subtasks" help="Progress of sub-tasks. Green bar when all done." sort={getSortParams(8)} />}
    {isColumnVisible('updated') && <ThWithHelp label="Updated" help="When this issue was last modified in Jira." sort={getSortParams(9)} />}
    {isColumnVisible('actions') && <ThWithHelp label="Actions" help="Update status, add comments, or reassign." />}
  </Tr>
);

type ChecklistRowProps = ColumnVisibility & {
  task: ChecklistTask;
  onEdit: (key: string) => void;
  dueDateMap: Map<string, string>;
};

export const ChecklistRow: React.FC<ChecklistRowProps> = ({ task, isColumnVisible, showComponentCol, onEdit, dueDateMap }) => (
  <Tr>
    {isColumnVisible('dueDate') && <Td className="app-cell-nowrap">{dueDateBadge(getDueDateForTask(task, dueDateMap))}</Td>}
    {isColumnVisible('version') && <Td className="app-cell-nowrap"><Label color="blue" isCompact>{task.fixVersions[0] || '--'}</Label></Td>}
    {isColumnVisible('key') && (
      <Td className="app-cell-nowrap">
        <a href={`https://issues.redhat.com/browse/${task.key}`} target="_blank" rel="noreferrer" aria-label="Open in Jira">
          {task.key} <ExternalLinkAltIcon className="app-text-xs" />
        </a>
      </Td>
    )}
    {isColumnVisible('summary') && <Td className="app-max-w-350"><Tooltip content={task.summary}><Truncate content={task.summary} trailingNumChars={0} /></Tooltip></Td>}
    {isColumnVisible('status') && <Td className="app-cell-nowrap">{statusBadge(task.status)}</Td>}
    {showComponentCol && <Td className="app-cell-nowrap">{task.components?.[0] || <span className="app-text-muted">--</span>}</Td>}
    {isColumnVisible('assignee') && <Td className="app-cell-nowrap">{task.assignee || <span className="app-text-muted">Unassigned</span>}</Td>}
    {isColumnVisible('priority') && <Td className="app-cell-nowrap">{task.priority}</Td>}
    {isColumnVisible('subtasks') && <Td className="app-cell-nowrap">{progressBar(task.subtasksDone, task.subtaskCount)} {task.subtasksDone}/{task.subtaskCount}</Td>}
    {isColumnVisible('updated') && (
      <Td className="app-cell-nowrap">
        <Tooltip content={new Date(task.updated).toLocaleString()}><span>{new Date(task.updated).toLocaleDateString()}</span></Tooltip>
      </Td>
    )}
    {isColumnVisible('actions') && (
      <Td><Button variant="plain" size="sm" icon={<EditAltIcon />} onClick={() => onEdit(task.key)} aria-label="Update" /></Td>
    )}
  </Tr>
);
