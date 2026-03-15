import React from 'react';
import {
  Card,
  CardTitle,
  CardBody,
  Label,
  EmptyState,
  EmptyStateBody,
  Tooltip,
  Flex,
  FlexItem,
  Content,
} from '@patternfly/react-core';
import type { MyWorkActivity } from '../../api/myWork';
import { formatAction, actionColor, shortTestName } from './myWorkHelpers';

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
            const timeAgo = new Date(entry.performed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const noteLines = entry.new_value ? entry.new_value.split('\n').filter((line: string) => line.trim()) : [];

            return (
              <div key={index} className="app-activity-item">
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <Label isCompact color={actionColor(entry.action)}>{formatAction(entry.action)}</Label>
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
                    <Content component="small" className="app-text-muted">{timeAgo}</Content>
                  </FlexItem>
                </Flex>
                {isAck && noteLines.length > 0 && (
                  <div className="app-activity-notes">
                    {noteLines.map((line: string, lineIdx: number) => (
                      <div key={lineIdx} className="app-activity-note-line">{line}</div>
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
