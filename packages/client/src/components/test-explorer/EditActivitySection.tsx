import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  Flex,
  FlexItem,
  Label,
  Spinner,
  ExpandableSection,
  Content,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { PencilAltIcon, CheckCircleIcon, TimesCircleIcon, ExternalLinkAltIcon, TrashIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { apiFetch } from '../../api/client';
import { timeAgo } from '@cnv-monitor/shared';

interface EditActivityEntry {
  id: string;
  actor: string;
  action: string;
  file_path: string;
  repo_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const actionLabel = (action: string): { text: string; color: 'blue' | 'green' | 'red' | 'orange' | 'grey'; icon: React.ReactNode } => {
  switch (action) {
    case 'draft_saved': return { text: 'Draft saved', color: 'blue', icon: <PencilAltIcon /> };
    case 'draft_discarded': return { text: 'Draft discarded', color: 'orange', icon: <TrashIcon /> };
    case 'pr_submitted': return { text: 'PR submitted', color: 'green', icon: <CheckCircleIcon /> };
    default: return { text: action, color: 'grey', icon: null };
  }
};

export const EditActivitySection: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['editActivity'],
    queryFn: () => apiFetch<{ items: EditActivityEntry[]; total: number }>('/test-explorer/edit-activity?limit=30'),
    staleTime: 30_000,
    enabled: expanded,
  });

  return (
    <ExpandableSection
      toggleContent={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem><strong>Edit Activity</strong></FlexItem>
          {data?.total ? <FlexItem><Label isCompact>{data.total} events</Label></FlexItem> : null}
        </Flex>
      }
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
    >
      <Card>
        <CardBody>
          {isLoading ? (
            <div className="app-page-spinner"><Spinner /></div>
          ) : data?.items && data.items.length > 0 ? (
            <Table variant="compact">
              <Thead>
                <Tr>
                  <Th width={20}>Action</Th>
                  <Th width={25}>File</Th>
                  <Th width={20}>User</Th>
                  <Th width={15}>When</Th>
                  <Th width={20}>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.items.map((entry: EditActivityEntry) => {
                  const { text, color, icon } = actionLabel(entry.action);
                  const prUrl = entry.details?.prUrl as string | undefined;
                  return (
                    <Tr key={entry.id}>
                      <Td><Label color={color} icon={icon} isCompact>{text}</Label></Td>
                      <Td className="app-text-mono app-text-sm">{entry.file_path.split('/').pop()}</Td>
                      <Td>{entry.actor.split('@')[0]}</Td>
                      <Td><Content component="small" className="app-text-muted">{timeAgo(new Date(entry.created_at).getTime())}</Content></Td>
                      <Td>
                        {prUrl ? (
                          <a href={prUrl} target="_blank" rel="noreferrer" className="app-text-sm">
                            <ExternalLinkAltIcon /> PR
                          </a>
                        ) : '-'}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          ) : (
            <EmptyState variant="sm">
              <EmptyStateBody>No edit activity yet. Start editing docs or test files to see activity here.</EmptyStateBody>
            </EmptyState>
          )}
        </CardBody>
      </Card>
    </ExpandableSection>
  );
};
