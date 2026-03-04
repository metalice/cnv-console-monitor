import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Label,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { fetchActivity } from '../api/activity';

const actionLabel = (action: string) => {
  switch (action) {
    case 'classify_defect': return <Label color="purple" isCompact>Classified</Label>;
    case 'bulk_classify_defect': return <Label color="purple" isCompact>Bulk Classified</Label>;
    case 'add_comment': return <Label color="blue" isCompact>Comment</Label>;
    case 'create_jira': return <Label color="red" isCompact>Jira Created</Label>;
    case 'link_jira': return <Label color="orange" isCompact>Jira Linked</Label>;
    default: return <Label isCompact>{action}</Label>;
  }
};

export const ActivityPage: React.FC = () => {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => fetchActivity(100),
    refetchInterval: 30000,
  });

  return (
    <>
      <PageSection>
        <Content component="h1">Activity Feed</Content>
        <Content component="small">Recent triage, Jira, and acknowledgment actions</Content>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            {isLoading ? (
              <Content>Loading...</Content>
            ) : !entries?.length ? (
              <EmptyState>
                <EmptyStateBody>No activity recorded yet.</EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label="Activity feed">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Action</Th>
                    <Th>Test</Th>
                    <Th>Details</Th>
                    <Th>By</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {entries.map((entry) => {
                    const shortName = entry.test_name?.split('.').pop() || entry.test_name || '—';
                    return (
                      <Tr key={entry.id}>
                        <Td dataLabel="Time">{new Date(entry.performed_at).toLocaleString()}</Td>
                        <Td dataLabel="Action">{actionLabel(entry.action)}</Td>
                        <Td dataLabel="Test">{shortName}</Td>
                        <Td dataLabel="Details">
                          {entry.old_value && entry.new_value
                            ? `${entry.old_value} → ${entry.new_value}`
                            : entry.new_value || '—'}
                        </Td>
                        <Td dataLabel="By">{entry.performed_by || '—'}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};
