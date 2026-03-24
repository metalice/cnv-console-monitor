import React from 'react';

import type { ErrorPattern } from '@cnv-monitor/shared';

import { Card, CardBody, Content, Tooltip } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

type ErrorPatternsTableProps = {
  errorPatterns: ErrorPattern[];
};

export const ErrorPatternsTable: React.FC<ErrorPatternsTableProps> = ({ errorPatterns }) => (
  <Card>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        Top Error Patterns (last 30 days)
      </Content>
      <Content className="app-section-subheading" component="small">
        Most common error messages across all failures. High counts indicate systemic issues.
      </Content>
      <div className="app-table-scroll">
        <Table aria-label="Error patterns" variant="compact">
          <Thead>
            <Tr>
              <Th width={50}>Error Pattern</Th>
              <Th width={10}>Occurrences</Th>
              <Th width={10}>Unique Tests</Th>
              <Th width={15}>First Seen</Th>
              <Th width={15}>Last Seen</Th>
            </Tr>
          </Thead>
          <Tbody>
            {errorPatterns.map((e, i) => (
              <Tr key={i}>
                <Td className="app-cell-truncate" dataLabel="Error">
                  <Tooltip content={e.pattern}>
                    <span className="app-mono-sm">{e.pattern}</span>
                  </Tooltip>
                </Td>
                <Td dataLabel="Occurrences">
                  <strong>{e.count}</strong>
                </Td>
                <Td dataLabel="Tests">{e.uniqueTests}</Td>
                <Td className="app-cell-nowrap" dataLabel="First">
                  {e.firstSeen}
                </Td>
                <Td className="app-cell-nowrap" dataLabel="Last">
                  {e.lastSeen}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);
