import { type ReactNode } from 'react';

import { type TaskSummary } from '@cnv-monitor/shared';

import {
  Alert,
  Content,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, MagicIcon } from '@patternfly/react-icons';

import { InitiativeCard } from './InitiativeCard';

type TaskSummaryViewProps = {
  taskSummary: TaskSummary;
};

const JIRA_KEY_PATTERN = /\bCNV-\d+\b/g;
const PR_NUMBER_PATTERN = /#\d+/g;

const formatHighlights = (text: string): ReactNode[] => {
  const parts = text.split(/(\bCNV-\d+\b|#\d+)/);
  let keyCounter = 0;
  return parts.map(part => {
    if (JIRA_KEY_PATTERN.test(part)) {
      JIRA_KEY_PATTERN.lastIndex = 0;
      keyCounter += 1;
      return (
        <a
          href={`https://issues.redhat.com/browse/${part}`}
          key={`jira-${part}-${keyCounter}`}
          rel="noreferrer"
          target="_blank"
        >
          {part}
        </a>
      );
    }
    if (PR_NUMBER_PATTERN.test(part)) {
      PR_NUMBER_PATTERN.lastIndex = 0;
      keyCounter += 1;
      return <strong key={`pr-${part}-${keyCounter}`}>{part}</strong>;
    }
    return part;
  });
};

export const TaskSummaryView = ({ taskSummary }: TaskSummaryViewProps) => (
  <Stack hasGutter>
    {taskSummary.weekHighlights && (
      <StackItem>
        <div className="app-report-highlights-panel">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <Title headingLevel="h3">Week Highlights</Title>
            </FlexItem>
            <FlexItem>
              <Label isCompact color="grey" icon={<MagicIcon />}>
                AI generated
              </Label>
            </FlexItem>
          </Flex>
          <Content className="app-report-highlights" component="p">
            {formatHighlights(taskSummary.weekHighlights)}
          </Content>
        </div>
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
                        className="app-report-blocker-ticket"
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
