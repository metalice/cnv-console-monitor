import { useState } from 'react';

import { type Initiative, type InitiativeStatus } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  CardTitle,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

const STATUS_LABEL_MAP: Record<
  InitiativeStatus,
  { color: 'green' | 'blue' | 'red' | 'orange'; text: string }
> = {
  'at-risk': { color: 'orange', text: 'At Risk' },
  blocked: { color: 'red', text: 'Blocked' },
  done: { color: 'green', text: 'Done' },
  'in-progress': { color: 'blue', text: 'In Progress' },
};

type InitiativeCardProps = {
  initiative: Initiative;
};

export const InitiativeCard = ({ initiative }: InitiativeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { color, text } = STATUS_LABEL_MAP[initiative.status];
  const hasPRs = initiative.relatedPRs.length > 0;
  const hasTickets = initiative.relatedTickets.length > 0;

  return (
    <Card className={`app-weekly-initiative app-weekly-initiative--${initiative.status}`}>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <FlexItem>{initiative.name}</FlexItem>
          <FlexItem>
            <Label isCompact color={color}>
              {text}
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content component="p">{initiative.summary}</Content>

        {initiative.contributors.length > 0 && (
          <Content className="app-weekly-contributors" component="small">
            Contributors: {initiative.contributors.join(', ')}
          </Content>
        )}

        {(hasPRs || hasTickets) && (
          <ExpandableSection
            isExpanded={isExpanded}
            toggleText={isExpanded ? 'Hide details' : 'Show details'}
            onToggle={(_event, expanded) => setIsExpanded(expanded)}
          >
            {hasPRs && (
              <Flex
                className="app-weekly-pills"
                flexWrap={{ default: 'wrap' }}
                gap={{ default: 'gapSm' }}
              >
                {initiative.relatedPRs.map(prNum => (
                  <FlexItem key={prNum}>
                    <Label isCompact variant="outline">
                      PR #{prNum}
                    </Label>
                  </FlexItem>
                ))}
              </Flex>
            )}

            {hasTickets && (
              <Flex
                className="app-weekly-pills"
                flexWrap={{ default: 'wrap' }}
                gap={{ default: 'gapSm' }}
              >
                {initiative.relatedTickets.map(ticketKey => (
                  <FlexItem key={ticketKey}>
                    <a
                      href={`https://issues.redhat.com/browse/${ticketKey}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Label isCompact color="blue">
                        {ticketKey} <ExternalLinkAltIcon className="app-text-xs" />
                      </Label>
                    </a>
                  </FlexItem>
                ))}
              </Flex>
            )}
          </ExpandableSection>
        )}
      </CardBody>
    </Card>
  );
};
