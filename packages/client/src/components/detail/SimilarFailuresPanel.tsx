import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Content,
  Label,
} from '@patternfly/react-core';
import { fetchTestItemHistory } from '../../api/testItems';
import { TimeAgo } from '../common/TimeAgo';

type SimilarFailuresPanelProps = {
  uniqueId: string;
};

export const SimilarFailuresPanel: React.FC<SimilarFailuresPanelProps> = ({ uniqueId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['history', uniqueId],
    queryFn: () => fetchTestItemHistory(uniqueId, 10),
    enabled: !!uniqueId,
  });

  if (isLoading) return <Spinner size="md" />;

  if (!data?.length) {
    return (
      <EmptyState>
        <EmptyStateBody>No historical data found.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div>
      <Content component="h4" style={{ marginBottom: 8 }}>
        Recent History ({data.length} runs)
      </Content>
      <DescriptionList isHorizontal>
        {data.map((item) => (
          <DescriptionListGroup key={item.rp_id}>
            <DescriptionListTerm>
              {item.start_time ? <TimeAgo timestamp={item.start_time} /> : 'Unknown'}
            </DescriptionListTerm>
            <DescriptionListDescription>
              <Label color={item.status === 'PASSED' ? 'green' : item.status === 'FAILED' ? 'red' : 'grey'} isCompact>
                {item.status}
              </Label>
              {item.defect_type && item.defect_type !== 'ti001' && (
                <Label isCompact style={{ marginLeft: 8 }}>{item.defect_type}</Label>
              )}
              {item.jira_key && (
                <Label color="blue" isCompact style={{ marginLeft: 8 }}>{item.jira_key}</Label>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </DescriptionList>
    </div>
  );
};
