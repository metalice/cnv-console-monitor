import { type TaskSummary } from '@cnv-monitor/shared';

import { Alert, Content, Stack, StackItem, Title } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

import { InitiativeCard } from './InitiativeCard';

type TaskSummaryViewProps = {
  taskSummary: TaskSummary;
};

export const TaskSummaryView = ({ taskSummary }: TaskSummaryViewProps) => (
  <Stack hasGutter>
    {taskSummary.weekHighlights && (
      <StackItem>
        <Content className="app-weekly-highlights" component="p">
          {taskSummary.weekHighlights}
        </Content>
      </StackItem>
    )}

    {taskSummary.blockers.length > 0 && (
      <StackItem>
        <Title headingLevel="h3">Blockers</Title>
        <Stack hasGutter>
          {taskSummary.blockers.map(blocker => (
            <StackItem key={`blocker-${blocker.description}`}>
              <Alert
                title={blocker.description}
                variant={blocker.severity === 'high' ? 'danger' : 'warning'}
              >
                {blocker.suggestedAction && (
                  <Content component="p">
                    <strong>Suggested action:</strong> {blocker.suggestedAction}
                  </Content>
                )}
                {blocker.tickets.length > 0 && (
                  <Content component="p">
                    {blocker.tickets.map(ticketKey => (
                      <a
                        className="app-weekly-blocker-ticket"
                        href={`https://issues.redhat.com/browse/${ticketKey}`}
                        key={ticketKey}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {ticketKey} <ExternalLinkAltIcon className="app-text-xs" />
                      </a>
                    ))}
                  </Content>
                )}
              </Alert>
            </StackItem>
          ))}
        </Stack>
      </StackItem>
    )}

    {taskSummary.initiatives.length > 0 && (
      <StackItem>
        <Title headingLevel="h3">Initiatives</Title>
        <Stack hasGutter>
          {taskSummary.initiatives.map(initiative => (
            <StackItem key={initiative.name}>
              <InitiativeCard initiative={initiative} />
            </StackItem>
          ))}
        </Stack>
      </StackItem>
    )}
  </Stack>
);
