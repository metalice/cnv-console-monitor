import React from 'react';

import {
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';

import type { MyWorkActivity } from '../../api/myWork';

import { actionColor, formatAction, shortTestName } from './myWorkHelpers';

type MyRecentActivityCardProps = {
  activities: MyWorkActivity[];
};

export const MyRecentActivityCard: React.FC<MyRecentActivityCardProps> = ({ activities }) => (
  <Card isFullHeight>
    <CardTitle>My Recent Activity</CardTitle>
    <CardBody>
      {activities.length === 0 ? (
        <EmptyState headingLevel="h4" titleText="No activity yet">
          <EmptyStateBody>Your triage and acknowledgment actions will appear here.</EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="app-max-h-420">
          {activities.map((entry, index) => {
            const isAck = entry.action === 'acknowledge';
            const timeAgo = new Date(entry.performed_at).toLocaleDateString('en-US', {
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
            });
            const noteLines = entry.new_value
              ? entry.new_value.split('\n').filter((line: string) => line.trim())
              : [];

            return (
              // eslint-disable-next-line react/no-array-index-key
              <div className="app-activity-item" key={index}>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <Label isCompact color={actionColor(entry.action)}>
                      {formatAction(entry.action)}
                    </Label>
                  </FlexItem>
                  <FlexItem flex={{ default: 'flex_1' }}>
                    <Content component="small">
                      {isAck ? (
                        'Acknowledged daily report'
                      ) : (
                        <>
                          <Tooltip content={entry.test_name || '—'}>
                            <strong>{shortTestName(entry.test_name)}</strong>
                          </Tooltip>
                          {entry.new_value && (
                            <span className="app-text-muted"> → {entry.new_value}</span>
                          )}
                        </>
                      )}
                    </Content>
                  </FlexItem>
                  <FlexItem>
                    <Content className="app-text-muted" component="small">
                      {timeAgo}
                    </Content>
                  </FlexItem>
                </Flex>
                {isAck && noteLines.length > 0 && (
                  <div className="app-activity-notes">
                    {noteLines.map((line: string, lineIdx: number) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div className="app-activity-note-line" key={lineIdx}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardBody>
  </Card>
);
