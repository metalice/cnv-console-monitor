import React from 'react';

import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchTestItemHistory } from '../../api/testItems';
import { TimeAgo } from '../common/TimeAgo';

type SimilarFailuresPanelProps = {
  uniqueId: string;
};

export const SimilarFailuresPanel: React.FC<SimilarFailuresPanelProps> = ({ uniqueId }) => {
  const { data, isLoading } = useQuery({
    enabled: Boolean(uniqueId),
    queryFn: () => fetchTestItemHistory(uniqueId, 10),
    queryKey: ['history', uniqueId],
  });

  if (isLoading) {
    return <Spinner size="md" />;
  }

  if (!data?.length) {
    return (
      <EmptyState>
        <EmptyStateBody>No historical data found.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div>
      <Content className="app-mb-sm" component="h4">
        Recent History ({data.length} runs)
      </Content>
      <DescriptionList isHorizontal>
        {data.map(item => (
          <DescriptionListGroup key={item.rp_id}>
            <DescriptionListTerm>
              {item.start_time ? <TimeAgo timestamp={item.start_time} /> : 'Unknown'}
            </DescriptionListTerm>
            <DescriptionListDescription>
              <Label
                isCompact
                color={
                  item.status === 'PASSED' ? 'green' : item.status === 'FAILED' ? 'red' : 'grey'
                }
              >
                {item.status}
              </Label>
              {item.defect_type && item.defect_type !== 'ti001' && (
                <Label isCompact className="app-ml-sm">
                  {item.defect_type}
                </Label>
              )}
              {item.jira_key && (
                <Label isCompact className="app-ml-sm" color="blue">
                  {item.jira_key}
                </Label>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </DescriptionList>
    </div>
  );
};
