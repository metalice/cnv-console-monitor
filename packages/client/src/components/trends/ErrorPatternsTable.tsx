import React from 'react';
import { Card, CardBody, Content, Tooltip } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { ErrorPattern } from '@cnv-monitor/shared';

type ErrorPatternsTableProps = {
  errorPatterns: ErrorPattern[];
};

export const ErrorPatternsTable: React.FC<ErrorPatternsTableProps> = ({ errorPatterns }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">Top Error Patterns (last 30 days)</Content>
      <Content component="small" className="app-section-subheading">Most common error messages across all failures. High counts indicate systemic issues.</Content>
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
                <Td dataLabel="Error" className="app-cell-truncate">
                  <Tooltip content={e.pattern}>
                    <span className="app-mono-sm">
                      {e.pattern}
                    </span>
                  </Tooltip>
                </Td>
                <Td dataLabel="Occurrences"><strong>{e.count}</strong></Td>
                <Td dataLabel="Tests">{e.uniqueTests}</Td>
                <Td dataLabel="First" className="app-cell-nowrap">{e.firstSeen}</Td>
                <Td dataLabel="Last" className="app-cell-nowrap">{e.lastSeen}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);
