import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bullseye, Content, EmptyState, EmptyStateBody,
  Label, Spinner, Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fetchBlockers } from '../../api/releases';
import { ThWithHelp } from '../common/ThWithHelp';

type BlockerWallProps = {
  version: string;
};

export const BlockerWall: React.FC<BlockerWallProps> = ({ version }) => {
  const { data: blockers, isLoading } = useQuery({
    queryKey: ['blockers', version],
    queryFn: () => fetchBlockers(version),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Bullseye className="app-card-spinner"><Spinner size="lg" /></Bullseye>;
  if (!blockers || blockers.length === 0) {
    return <EmptyState><EmptyStateBody>No open blockers or critical bugs for this version.</EmptyStateBody></EmptyState>;
  }

  return (
    <div className="app-table-scroll">
      <Table aria-label="Blockers" variant="compact">
        <Thead>
          <Tr>
            <ThWithHelp label="Key" help="Jira issue key. Click to open in Jira." />
            <ThWithHelp label="Summary" help="Issue title from Jira." />
            <ThWithHelp label="Priority" help="Blocker or Critical priority level." />
            <ThWithHelp label="Assignee" help="Person assigned to fix this issue." />
            <ThWithHelp label="Status" help="Current Jira workflow status." />
            <ThWithHelp label="Age" help="Days since the issue was created. Red if open more than 7 days." />
          </Tr>
        </Thead>
        <Tbody>
          {blockers.map(b => (
            <Tr key={b.key} className={b.ageDays > 7 ? 'app-blocker-old' : undefined}>
              <Td className="app-cell-nowrap">
                <a href={`https://issues.redhat.com/browse/${b.key}`} target="_blank" rel="noreferrer">
                  {b.key} <ExternalLinkAltIcon className="app-text-xs" />
                </a>
              </Td>
              <Td>
                <Tooltip content={b.summary}>
                  <span className="app-text-ellipsis">{b.summary}</span>
                </Tooltip>
              </Td>
              <Td className="app-cell-nowrap">
                <Label color={b.priority === 'Blocker' ? 'red' : 'orange'} isCompact>{b.priority}</Label>
              </Td>
              <Td className="app-cell-nowrap">{b.assignee || <span className="app-text-muted">Unassigned</span>}</Td>
              <Td className="app-cell-nowrap"><Label isCompact>{b.status}</Label></Td>
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
