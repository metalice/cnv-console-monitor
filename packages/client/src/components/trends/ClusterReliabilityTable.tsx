import React from 'react';
import { Card, CardBody, Content, Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { ClusterReliability } from '@cnv-monitor/shared';
import { rateColor } from './trendUtils';

type ClusterReliabilityTableProps = {
  clusterData: ClusterReliability[];
};

const barColors: Record<ReturnType<typeof rateColor>, string> = {
  green: '#3E8635',
  orange: '#F0AB00',
  red: '#C9190B',
};

export const ClusterReliabilityTable: React.FC<ClusterReliabilityTableProps> = ({ clusterData }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">Cluster Reliability (last 30 days)</Content>
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
                  <Td className="app-cell-nowrap"><strong>{c.cluster}</strong></Td>
                  <Td>{c.total}</Td>
                  <Td>{c.passed}</Td>
                  <Td>{c.failed}</Td>
                  <Td>
                    <Label color={color} isCompact>{c.passRate}%</Label>
                    <div className="app-cluster-bar-track">
                      <div style={{ width: `${c.passRate}%`, height: '100%', background: barColors[color], borderRadius: 3 }} />
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
