import React from 'react';

import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';

type Subtask = { key: string; status: string; summary: string };

type IssueDetailSectionProps = {
  summary: string;
  status: string;
  assignee: string | null;
  fixVersions: string[];
  subtasks: Subtask[];
  subtasksDone: number;
  subtaskCount: number;
};

const statusColor = (s: string): 'blue' | 'green' | 'orange' | 'grey' => {
  if (s === 'Closed') {
    return 'green';
  }
  if (s === 'In Progress' || s === 'Testing') {
    return 'blue';
  }
  if (s === 'To Do' || s === 'New') {
    return 'orange';
  }
  return 'grey';
};

export const IssueDetailSection: React.FC<IssueDetailSectionProps> = ({
  assignee,
  fixVersions,
  status,
  subtaskCount,
  subtasks,
  subtasksDone,
  summary,
}) => (
  <DescriptionList isHorizontal className="app-section-heading">
    <DescriptionListGroup>
      <DescriptionListTerm>Summary</DescriptionListTerm>
      <DescriptionListDescription>{summary}</DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Status</DescriptionListTerm>
      <DescriptionListDescription>
        <Label color={statusColor(status)}>{status}</Label>
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Assignee</DescriptionListTerm>
      <DescriptionListDescription>{assignee || 'Unassigned'}</DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Fix Version</DescriptionListTerm>
      <DescriptionListDescription>{fixVersions.join(', ') || 'None'}</DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Subtasks</DescriptionListTerm>
      <DescriptionListDescription>
        {subtasksDone}/{subtaskCount} done
        {subtasks.length > 0 && (
          <Flex
            className="app-mt-sm"
            direction={{ default: 'column' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            {subtasks.map(st => (
              <FlexItem key={st.key}>
                <Label isCompact color={st.status === 'Closed' ? 'green' : 'grey'}>
                  {st.key}
                </Label>{' '}
                <span className="app-font-13">{st.summary.substring(0, 80)}</span>
              </FlexItem>
            ))}
          </Flex>
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);
