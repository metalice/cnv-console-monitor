import { useState } from 'react';

import { type PersonReport } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  CardHeader,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Switch,
  TextArea,
} from '@patternfly/react-core';
import { CodeBranchIcon, CodeIcon, ExternalLinkAltIcon, TaskIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

type PersonCardProps = {
  editable?: boolean;
  onNotesChange?: (notes: string) => void;
  personReport: PersonReport;
};

export const PersonCard = ({ editable = false, onNotesChange, personReport }: PersonCardProps) => {
  const [prsExpanded, setPrsExpanded] = useState(false);
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [commitsExpanded, setCommitsExpanded] = useState(false);
  const { member, stats } = personReport;

  return (
    <Card
      className={`app-weekly-person${personReport.excluded ? ' app-weekly-person--excluded' : ''}`}
    >
      <CardHeader>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
          gap={{ default: 'gapMd' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              <FlexItem>
                <strong>{member.displayName}</strong>
              </FlexItem>
              <FlexItem>
                <Label isCompact color="green" icon={<CodeBranchIcon />}>
                  {stats.prsMerged} PRs
                </Label>
              </FlexItem>
              <FlexItem>
                <Label isCompact color="blue" icon={<TaskIcon />}>
                  {stats.ticketsDone} tickets
                </Label>
              </FlexItem>
              <FlexItem>
                <Label isCompact icon={<CodeIcon />} variant="outline">
                  {stats.commitCount} commits
                </Label>
              </FlexItem>
            </Flex>
          </FlexItem>

          {editable && (
            <FlexItem>
              <Switch
                isReversed
                id={`exclude-${personReport.memberId}`}
                isChecked={personReport.excluded}
                label="Exclude"
              />
            </FlexItem>
          )}
        </Flex>
      </CardHeader>

      <CardBody>
        {personReport.aiSummary && (
          <Content className="app-weekly-ai-summary" component="p">
            <em>{personReport.aiSummary}</em>
          </Content>
        )}

        {personReport.prs.length > 0 && (
          <ExpandableSection
            isExpanded={prsExpanded}
            toggleText={`Pull Requests (${personReport.prs.length})`}
            onToggle={(_event, expanded) => setPrsExpanded(expanded)}
          >
            <Table aria-label={`PRs by ${member.displayName}`} variant="compact">
              <Thead>
                <Tr>
                  <Th>PR</Th>
                  <Th>Title</Th>
                  <Th>State</Th>
                </Tr>
              </Thead>
              <Tbody>
                {personReport.prs.map(pr => (
                  <Tr key={`${pr.source}-${pr.number}`}>
                    <Td className="app-cell-nowrap">
                      <a href={pr.url} rel="noreferrer" target="_blank">
                        #{pr.number} <ExternalLinkAltIcon className="app-text-xs" />
                      </a>
                    </Td>
                    <Td>{pr.title}</Td>
                    <Td className="app-cell-nowrap">
                      <Label
                        isCompact
                        color={
                          pr.state === 'merged' ? 'purple' : pr.state === 'open' ? 'green' : 'grey'
                        }
                      >
                        {pr.state}
                      </Label>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ExpandableSection>
        )}

        {personReport.jiraTickets.length > 0 && (
          <ExpandableSection
            isExpanded={ticketsExpanded}
            toggleText={`Jira Tickets (${personReport.jiraTickets.length})`}
            onToggle={(_event, expanded) => setTicketsExpanded(expanded)}
          >
            <Table aria-label={`Tickets by ${member.displayName}`} variant="compact">
              <Thead>
                <Tr>
                  <Th>Key</Th>
                  <Th>Summary</Th>
                  <Th>Status</Th>
                  <Th>Points</Th>
                </Tr>
              </Thead>
              <Tbody>
                {personReport.jiraTickets.map(ticket => (
                  <Tr key={ticket.key}>
                    <Td className="app-cell-nowrap">
                      <a href={ticket.url} rel="noreferrer" target="_blank">
                        {ticket.key} <ExternalLinkAltIcon className="app-text-xs" />
                      </a>
                    </Td>
                    <Td>{ticket.summary}</Td>
                    <Td className="app-cell-nowrap">
                      <Label isCompact>{ticket.status}</Label>
                    </Td>
                    <Td>{ticket.storyPoints ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ExpandableSection>
        )}

        {personReport.commits.length > 0 && (
          <ExpandableSection
            isExpanded={commitsExpanded}
            toggleText={`Commits (${personReport.commits.length})`}
            onToggle={(_event, expanded) => setCommitsExpanded(expanded)}
          >
            <Table aria-label={`Commits by ${member.displayName}`} variant="compact">
              <Thead>
                <Tr>
                  <Th>SHA</Th>
                  <Th>Message</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {personReport.commits.map(commit => (
                  <Tr key={commit.sha}>
                    <Td className="app-cell-nowrap">
                      {commit.url ? (
                        <a href={commit.url} rel="noreferrer" target="_blank">
                          {commit.sha.slice(0, 7)}
                        </a>
                      ) : (
                        commit.sha.slice(0, 7)
                      )}
                    </Td>
                    <Td>{commit.message}</Td>
                    <Td className="app-cell-nowrap">
                      {new Date(commit.date).toLocaleDateString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ExpandableSection>
        )}

        {editable && (
          <div className="app-weekly-notes">
            <TextArea
              aria-label={`Manager notes for ${member.displayName}`}
              placeholder="Add manager notes..."
              value={personReport.managerNotes ?? ''}
              onChange={(_event, value) => onNotesChange?.(value)}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
};
