import React, { useState } from 'react';
import {
  Card, CardBody, CardTitle,
  Content, EmptyState, EmptyStateBody,
  Label, Pagination, Spinner, Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import type { ActivityEntry } from '@cnv-monitor/shared';
import { ThWithHelp } from '../common/ThWithHelp';

const actionLabel = (action: string): React.ReactNode => {
  switch (action) {
    case 'classify_defect': return <Label color="purple" isCompact>Classified</Label>;
    case 'bulk_classify_defect': return <Label color="purple" isCompact>Bulk Classified</Label>;
    case 'add_comment': return <Label color="blue" isCompact>Comment</Label>;
    case 'create_jira': return <Label color="red" isCompact>Jira Created</Label>;
    case 'link_jira': return <Label color="orange" isCompact>Jira Linked</Label>;
    case 'acknowledge': return <Label color="green" isCompact>Acknowledged</Label>;
    default: return <Label isCompact>{action}</Label>;
  }
};

type ActivityTableProps = {
  entries: ActivityEntry[] | undefined;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export const ActivityTable: React.FC<ActivityTableProps> = ({
  entries, isLoading, page, pageSize, onPageChange,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <Card>
      <CardTitle>Activity</CardTitle>
      <CardBody>
        {isLoading ? (
          <Spinner aria-label="Loading activity" />
        ) : !entries?.length ? (
          <EmptyState><EmptyStateBody>No activity recorded yet.</EmptyStateBody></EmptyState>
        ) : (
          <>
            <div className="app-table-scroll">
            <Table aria-label="Activity feed" variant="compact" isStickyHeader>
              <Thead>
                <Tr>
                  <ThWithHelp label="Time" help="When the action was performed." />
                  <ThWithHelp label="Action" help="Type of action performed." />
                  <ThWithHelp label="Component" help="Component this action relates to." />
                  <ThWithHelp label="Test / Target" help="Test item or acknowledgment target." />
                  <ThWithHelp label="Details" help="Additional context." />
                  <ThWithHelp label="By" help="The user who performed this action." />
                </Tr>
              </Thead>
              <Tbody>
                {entries.map((entry) => {
                  const isAck = entry.action === 'acknowledge';
                  const shortName = isAck ? '--' : (entry.test_name?.split('.').pop() || entry.test_name || '--');
                  const hasNotes = isAck && entry.notes;
                  const isExpanded = expandedId === entry.id;

                  return (
                    <React.Fragment key={entry.id}>
                      <Tr isClickable={!!hasNotes} onRowClick={hasNotes ? () => setExpandedId(isExpanded ? null : entry.id) : undefined}>
                        <Td dataLabel="Time">{new Date(entry.performed_at).toLocaleString()}</Td>
                        <Td dataLabel="Action">{actionLabel(entry.action)}</Td>
                        <Td dataLabel="Component">{entry.component ? <Label color="grey" isCompact>{entry.component}</Label> : '--'}</Td>
                        <Td dataLabel="Test / Target">
                          {isAck
                            ? <span>{entry.component || 'Report'} acknowledged</span>
                            : <Tooltip content={entry.test_name || shortName}><span>{shortName}</span></Tooltip>}
                        </Td>
                        <Td dataLabel="Details">
                          {isAck ? (
                            hasNotes ? <Label color="blue" isCompact>View notes</Label> : '--'
                          ) : (
                            <Tooltip content={entry.old_value && entry.new_value ? `${entry.old_value} \u2192 ${entry.new_value}` : entry.new_value || '--'}>
                              <span>{entry.old_value && entry.new_value ? `${entry.old_value} \u2192 ${entry.new_value}` : entry.new_value || '--'}</span>
                            </Tooltip>
                          )}
                        </Td>
                        <Td dataLabel="By">{entry.performed_by || '--'}</Td>
                      </Tr>
                      {isExpanded && hasNotes && (
                        <Tr>
                          <Td colSpan={6} className="app-expanded-row">
                            <Content component="small" className="app-text-muted app-mb-sm">Acknowledgment notes by {entry.performed_by}:</Content>
                            <pre className="app-ack-notes">
                              {entry.notes}
                            </pre>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>
            </div>
            <Pagination
              itemCount={(page - 1) * pageSize + (entries?.length ?? 0)}
              perPage={pageSize}
              page={page}
              onSetPage={(_e, p) => onPageChange(p)}
              isCompact
              className="app-mt-md"
            />
          </>
        )}
      </CardBody>
    </Card>
  );
};
