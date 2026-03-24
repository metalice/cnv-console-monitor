import React from 'react';

import { timeAgo } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExternalLinkAltIcon,
  PencilAltIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';

type EditActivityEntry = {
  id: string;
  actor: string;
  action: string;
  file_path: string;
  repo_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const actionLabel = (
  action: string,
): { text: string; color: 'blue' | 'green' | 'red' | 'orange' | 'grey'; icon: React.ReactNode } => {
  switch (action) {
    case 'draft_saved':
      return { color: 'blue', icon: <PencilAltIcon />, text: 'Draft saved' };
    case 'draft_discarded':
      return { color: 'orange', icon: <TrashIcon />, text: 'Draft discarded' };
    case 'pr_submitted':
      return { color: 'green', icon: <CheckCircleIcon />, text: 'PR submitted' };
    default:
      return { color: 'grey', icon: null, text: action };
  }
};

export const EditActivitySection: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);

  const { data, isLoading } = useQuery({
    enabled: expanded,
    queryFn: () =>
      apiFetch<{ items: EditActivityEntry[]; total: number }>(
        '/test-explorer/edit-activity?limit=30',
      ),
    queryKey: ['editActivity'],
    staleTime: 30_000,
  });

  return (
    <ExpandableSection
      isExpanded={expanded}
      toggleContent={
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <strong>Edit Activity</strong>
          </FlexItem>
          {data?.total ? (
            <FlexItem>
              <Label isCompact>{data.total} events</Label>
            </FlexItem>
          ) : null}
        </Flex>
      }
      onToggle={(_e, val) => setExpanded(val)}
    >
      <Card>
        <CardBody>
          {isLoading ? (
            <div className="app-page-spinner">
              <Spinner />
            </div>
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
                  const { color, icon, text } = actionLabel(entry.action);
                  const prUrl = entry.details?.prUrl as string | undefined;
                  return (
                    <Tr key={entry.id}>
                      <Td>
                        <Label isCompact color={color} icon={icon}>
                          {text}
                        </Label>
                      </Td>
                      <Td className="app-text-mono app-text-sm">
                        {entry.file_path.split('/').pop()}
                      </Td>
                      <Td>{entry.actor.split('@')[0]}</Td>
                      <Td>
                        <Content className="app-text-muted" component="small">
                          {timeAgo(new Date(entry.created_at).getTime())}
                        </Content>
                      </Td>
                      <Td>
                        {prUrl ? (
                          <a className="app-text-sm" href={prUrl} rel="noreferrer" target="_blank">
                            <ExternalLinkAltIcon /> PR
                          </a>
                        ) : (
                          '-'
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          ) : (
            <EmptyState variant="sm">
              <EmptyStateBody>
                No edit activity yet. Start editing docs or test files to see activity here.
              </EmptyStateBody>
            </EmptyState>
          )}
        </CardBody>
      </Card>
    </ExpandableSection>
  );
};
