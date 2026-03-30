import type { ThProps } from '@patternfly/react-table';
import { Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

type ChecklistHeaderProps = {
  isColumnVisible: (id: string) => boolean;
  showComponentCol: boolean;
  getSortParams: (index: number) => ThProps['sort'];
};

export const ChecklistHeader = ({
  getSortParams,
  isColumnVisible,
  showComponentCol,
}: ChecklistHeaderProps) => (
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
