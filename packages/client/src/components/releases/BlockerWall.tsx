import React from 'react';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Thead, Tr } from '@patternfly/react-table';
import { useQuery } from '@tanstack/react-query';

import { fetchBlockers } from '../../api/releases';
import { ThWithHelp } from '../common/ThWithHelp';

type BlockerWallProps = {
  version: string;
};

export const BlockerWall: React.FC<BlockerWallProps> = ({ version }) => {
  const { data: blockers, isLoading } = useQuery({
    queryFn: () => fetchBlockers(version),
    queryKey: ['blockers', version],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Bullseye className="app-card-spinner">
        <Spinner size="lg" />
      </Bullseye>
    );
  }
  if (!blockers || blockers.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>No open blockers or critical bugs for this version.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="app-table-scroll">
      <Table aria-label="Blockers" variant="compact">
        <Thead>
          <Tr>
            <ThWithHelp help="Jira issue key. Click to open in Jira." label="Key" />
            <ThWithHelp help="Issue title from Jira." label="Summary" />
            <ThWithHelp help="Blocker or Critical priority level." label="Priority" />
            <ThWithHelp help="Person assigned to fix this issue." label="Assignee" />
            <ThWithHelp help="Current Jira workflow status." label="Status" />
            <ThWithHelp
              help="Days since the issue was created. Red if open more than 7 days."
              label="Age"
            />
          </Tr>
        </Thead>
        <Tbody>
          {blockers.map(b => (
            <Tr className={b.ageDays > 7 ? 'app-blocker-old' : undefined} key={b.key}>
              <Td className="app-cell-nowrap">
                <a
                  href={`https://issues.redhat.com/browse/${b.key}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {b.key} <ExternalLinkAltIcon className="app-text-xs" />
                </a>
              </Td>
              <Td>
                <Tooltip content={b.summary}>
                  <span className="app-text-ellipsis">{b.summary}</span>
                </Tooltip>
              </Td>
              <Td className="app-cell-nowrap">
                <Label isCompact color={b.priority === 'Blocker' ? 'red' : 'orange'}>
                  {b.priority}
                </Label>
              </Td>
              <Td className="app-cell-nowrap">
                {b.assignee || <span className="app-text-muted">Unassigned</span>}
              </Td>
              <Td className="app-cell-nowrap">
                <Label isCompact>{b.status}</Label>
              </Td>
              <Td className="app-cell-nowrap">
                <Tooltip content={`Created ${new Date(b.created).toLocaleDateString()}`}>
                  <span className={b.ageDays > 7 ? 'app-text-danger' : ''}>{b.ageDays}d</span>
                </Tooltip>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
