import React from 'react';
import { Button, Label, Tooltip, Truncate } from '@patternfly/react-core';
import { Tr, Th, Td, type ThProps } from '@patternfly/react-table';
import { ExternalLinkAltIcon, EditAltIcon } from '@patternfly/react-icons';
import type { ChecklistTask } from '@cnv-monitor/shared';

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
    {isColumnVisible('version') && <Th sort={getSortParams(0)}>Version</Th>}
    {isColumnVisible('key') && <Th sort={getSortParams(1)}>Key</Th>}
    {isColumnVisible('summary') && <Th sort={getSortParams(2)}>Summary</Th>}
    {isColumnVisible('status') && <Th sort={getSortParams(3)}>Status</Th>}
    {showComponentCol && <Th sort={getSortParams(4)}>Component</Th>}
    {isColumnVisible('assignee') && <Th sort={getSortParams(5)}>Assignee</Th>}
    {isColumnVisible('priority') && <Th sort={getSortParams(6)}>Priority</Th>}
    {isColumnVisible('subtasks') && <Th sort={getSortParams(7)}>Subtasks</Th>}
    {isColumnVisible('updated') && <Th sort={getSortParams(8)}>Updated</Th>}
    {isColumnVisible('actions') && <Th>Actions</Th>}
  </Tr>
);

type ChecklistRowProps = ColumnVisibility & {
  task: ChecklistTask;
  onEdit: (key: string) => void;
};

export const ChecklistRow: React.FC<ChecklistRowProps> = ({ task, isColumnVisible, showComponentCol, onEdit }) => (
  <Tr>
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
