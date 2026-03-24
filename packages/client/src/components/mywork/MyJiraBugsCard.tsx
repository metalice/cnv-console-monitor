import React from 'react';

import {
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

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
                <Td className="app-cell-nowrap" dataLabel="Jira Key">
                  {jiraUrl ? (
                    <a href={`${jiraUrl}/browse/${bug.jira_key}`} rel="noreferrer" target="_blank">
                      {bug.jira_key} <ExternalLinkAltIcon className="app-text-xs" />
                    </a>
                  ) : (
                    bug.jira_key
                  )}
                </Td>
                <Td className="app-cell-truncate" dataLabel="Test">
                  <Tooltip content={bug.test_name || '—'}>
                    <span>{shortTestName(bug.test_name)}</span>
                  </Tooltip>
                </Td>
                <Td className="app-cell-nowrap" dataLabel="Created">
                  {new Date(bug.created_at).toLocaleDateString()}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </CardBody>
  </Card>
);
