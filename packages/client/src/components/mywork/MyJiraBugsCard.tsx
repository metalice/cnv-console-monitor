import React from 'react';
import {
  Card,
  CardTitle,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import type { MyWorkJiraBug } from '../../api/myWork';
import { shortTestName } from './myWorkHelpers';

type MyJiraBugsCardProps = {
  bugs: MyWorkJiraBug[];
  jiraUrl: string | undefined;
};

export const MyJiraBugsCard: React.FC<MyJiraBugsCardProps> = ({ bugs, jiraUrl }) => (
  <Card isFullHeight>
    <CardTitle>My Jira Bugs</CardTitle>
    <CardBody>
      {bugs.length === 0 ? (
        <EmptyState headingLevel="h4" titleText="No Jira bugs">
          <EmptyStateBody>Jira issues you create will appear here.</EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="My Jira bugs" variant="compact">
          <Thead>
            <Tr>
              <Th>Jira Key</Th>
              <Th>Test</Th>
              <Th width={20}>Created</Th>
            </Tr>
          </Thead>
          <Tbody>
            {bugs.map((bug, i) => (
              <Tr key={i}>
                <Td dataLabel="Jira Key" className="app-cell-nowrap">
                  {jiraUrl ? (
                    <a href={`${jiraUrl}/browse/${bug.jira_key}`} target="_blank" rel="noreferrer">
                      {bug.jira_key} <ExternalLinkAltIcon className="app-text-xs" />
                    </a>
                  ) : (
                    bug.jira_key
                  )}
                </Td>
                <Td dataLabel="Test" className="app-cell-truncate">
                  <Tooltip content={bug.test_name || '—'}>
                    <span>{shortTestName(bug.test_name)}</span>
                  </Tooltip>
                </Td>
                <Td dataLabel="Created" className="app-cell-nowrap">{new Date(bug.created_at).toLocaleDateString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </CardBody>
  </Card>
);
