import type { ChecklistTask } from '@cnv-monitor/shared';

import { Button, Label, Tooltip, Truncate } from '@patternfly/react-core';
import { EditAltIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { DueDateBadge, StatusBadge, SubtaskProgress } from './ChecklistCellBadges';
import { getDueDate } from './checklistHelpers';

type ColumnVisibility = {
  isColumnVisible: (id: string) => boolean;
  showComponentCol: boolean;
};

type ChecklistRowProps = ColumnVisibility & {
  task: ChecklistTask;
  onEdit: (key: string) => void;
  dueDateMap: Map<string, string>;
};

export const ChecklistRow = ({
  dueDateMap,
  isColumnVisible,
  onEdit,
  showComponentCol,
  task,
}: ChecklistRowProps) => (
  <Tr>
    {isColumnVisible('dueDate') && (
      <Td className="app-cell-nowrap">
        <DueDateBadge dateStr={getDueDate(task, dueDateMap)} />
      </Td>
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
    {isColumnVisible('status') && (
      <Td className="app-cell-nowrap">
        <StatusBadge status={task.status} />
      </Td>
    )}
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
        <SubtaskProgress done={task.subtasksDone} total={task.subtaskCount} /> {task.subtasksDone}/
        {task.subtaskCount}
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
