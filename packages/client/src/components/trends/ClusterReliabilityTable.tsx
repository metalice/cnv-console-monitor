import React from 'react';

import type { ClusterReliability } from '@cnv-monitor/shared';

import { Card, CardBody, Content, Label } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { rateColor } from './trendUtils';

type ClusterReliabilityTableProps = {
  clusterData: ClusterReliability[];
};

const barColors: Record<ReturnType<typeof rateColor>, string> = {
  green: '#3E8635',
  orange: '#F0AB00',
  red: '#C9190B',
};

export const ClusterReliabilityTable: React.FC<ClusterReliabilityTableProps> = ({
  clusterData,
}) => (
  <Card>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        Cluster Reliability (last 30 days)
      </Content>
      <div className="app-table-scroll">
        <Table aria-label="Cluster reliability" variant="compact">
          <Thead>
            <Tr>
              <Th>Cluster</Th>
              <Th>Launches</Th>
              <Th>Passed</Th>
              <Th>Failed</Th>
              <Th>Pass Rate</Th>
            </Tr>
          </Thead>
          <Tbody>
            {clusterData.map(c => {
              const color = rateColor(c.passRate);
              return (
                <Tr key={c.cluster}>
                  <Td className="app-cell-nowrap">
                    <strong>{c.cluster}</strong>
                  </Td>
                  <Td>{c.total}</Td>
                  <Td>{c.passed}</Td>
                  <Td>{c.failed}</Td>
                  <Td>
                    <Label isCompact color={color}>
                      {c.passRate}%
                    </Label>
                    <div className="app-cluster-bar-track">
                      <div
                        style={{
                          background: barColors[color],
                          borderRadius: 3,
                          height: '100%',
                          width: `${c.passRate}%`,
                        }}
                      />
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);
