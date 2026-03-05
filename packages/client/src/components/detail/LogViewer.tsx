import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CodeBlock,
  CodeBlockCode,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Content,
} from '@patternfly/react-core';
import { fetchTestItemLogs } from '../../api/testItems';

type LogViewerProps = {
  itemId: number;
};

export const LogViewer: React.FC<LogViewerProps> = ({ itemId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', itemId],
    queryFn: () => fetchTestItemLogs(itemId, 'ERROR'),
  });

  if (isLoading) return <Spinner size="lg" />;

  if (error) {
    return (
      <EmptyState>
        <EmptyStateBody>Failed to load logs: {(error as Error).message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!data?.content?.length) {
    return (
      <EmptyState>
        <EmptyStateBody>No error logs found for this test item.</EmptyStateBody>
      </EmptyState>
    );
  }

  const logText = data.content
    .map((log) => {
      const time = new Date(log.time).toISOString();
      return `[${time}] [${log.level}] ${log.message}`;
    })
    .join('\n');

  return (
    <div>
      <Content component="h4" style={{ marginBottom: 8 }}>
        Error Logs ({data.page.totalElements} entries)
      </Content>
      <CodeBlock>
        <CodeBlockCode>{logText}</CodeBlockCode>
      </CodeBlock>
    </div>
  );
};
