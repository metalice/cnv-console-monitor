import React from 'react';

import {
  CodeBlock,
  CodeBlockCode,
  Content,
  EmptyState,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchTestItemLogs } from '../../api/testItems';

type LogViewerProps = {
  itemId: number;
};

export const LogViewer: React.FC<LogViewerProps> = ({ itemId }) => {
  const { data, error, isLoading } = useQuery({
    queryFn: () => fetchTestItemLogs(itemId, 'ERROR'),
    queryKey: ['logs', itemId],
  });

  if (isLoading) {
    return <Spinner size="lg" />;
  }

  if (error) {
    return (
      <EmptyState>
        <EmptyStateBody>Failed to load logs: {error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
  if (!data?.content?.length) {
    return (
      <EmptyState>
        <EmptyStateBody>No error logs found for this test item.</EmptyStateBody>
      </EmptyState>
    );
  }

  const logText = data.content
    .map(log => {
      const time = new Date(log.time).toISOString();
      return `[${time}] [${log.level}] ${log.message}`;
    })
    .join('\n');

  return (
    <div>
      <Content className="app-mb-sm" component="h4">
        Error Logs ({data.page.totalElements} entries)
      </Content>
      <CodeBlock>
        <CodeBlockCode>{logText}</CodeBlockCode>
      </CodeBlock>
    </div>
  );
};
