import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  GridItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { TestProfile } from '../../api/testProfile';
import { StatusBadge } from '../common/StatusBadge';

type HistoryItem = TestProfile['history'][number];
type AffectedLaunch = TestProfile['affectedLaunches'][number];
type TriageEntry = TestProfile['triageHistory'][number];

const SimpleTable: React.FC<{
  label: string;
  headers: string[];
  items: unknown[];
  renderRow: (item: never, i: number) => React.ReactNode;
  emptyText: string;
}> = ({ emptyText, headers, items, label, renderRow }) => (
  <Card>
    <CardTitle>
      {label} ({items.length})
    </CardTitle>
    <CardBody>
      {items.length === 0 ? (
        <EmptyState>
          <EmptyStateBody>{emptyText}</EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="app-table-scroll">
          <Table aria-label={label} variant="compact">
            <Thead>
              <Tr>
                {headers.map(h => (
                  <Th key={h}>{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{items.map((item, i) => renderRow(item as never, i))}</Tbody>
          </Table>
        </div>
      )}
    </CardBody>
  </Card>
);

export const TestProfileTables: React.FC<{
  history: HistoryItem[];
  affectedLaunches: AffectedLaunch[];
  triageHistory: TriageEntry[];
}> = ({ affectedLaunches, history, triageHistory }) => {
  const navigate = useNavigate();

  return (
    <>
      <GridItem span={12}>
        <SimpleTable
          emptyText="No run history available."
          headers={['Date', 'Status', 'Defect Type', 'Error', 'Launch']}
          items={history}
          label="Run History"
          renderRow={(item: HistoryItem) => (
            <Tr key={item.rp_id}>
              <Td className="app-cell-nowrap">
                {item.start_time ? new Date(item.start_time).toLocaleString() : '--'}
              </Td>
              <Td className="app-cell-nowrap">
                <StatusBadge status={item.status} />
              </Td>
              <Td className="app-cell-nowrap">
                {item.defect_type ? <Label isCompact>{item.defect_type}</Label> : '--'}
              </Td>
              <Td className="app-cell-truncate">
                {item.error_message ? (
                  <Tooltip content={item.error_message}>
                    <span>{item.error_message.split('\n')[0]}</span>
                  </Tooltip>
                ) : (
                  '--'
                )}
              </Td>
              <Td className="app-cell-nowrap">
                <Button
                  isInline
                  size="sm"
                  variant="link"
                  onClick={() => navigate(`/launch/${item.launch_rp_id}`)}
                >
                  #{item.launch_rp_id}
                </Button>
              </Td>
            </Tr>
          )}
        />
      </GridItem>

      <GridItem md={6} span={12}>
        <SimpleTable
          emptyText="No launches found."
          headers={['Version', 'Tier', 'Cluster', 'Date', 'Link']}
          items={affectedLaunches}
          label="Affected Launches"
          renderRow={(l: AffectedLaunch) => (
            <Tr key={l.rp_id}>
              <Td className="app-cell-nowrap">{l.cnv_version ?? '--'}</Td>
              <Td className="app-cell-nowrap">{l.tier ?? '--'}</Td>
              <Td className="app-cell-truncate">
                <Tooltip content={l.cluster_name || '--'}>
                  <span>{l.cluster_name ?? '--'}</span>
                </Tooltip>
              </Td>
              <Td className="app-cell-nowrap">{new Date(l.start_time).toLocaleDateString()}</Td>
              <Td className="app-cell-nowrap">
                <Button
                  isInline
                  size="sm"
                  variant="link"
                  onClick={() => navigate(`/launch/${l.rp_id}`)}
                >
                  View
                </Button>
              </Td>
            </Tr>
          )}
        />
      </GridItem>

      <GridItem md={6} span={12}>
        <SimpleTable
          emptyText="No triage actions recorded."
          headers={['Date', 'Action', 'Change', 'By']}
          items={triageHistory}
          label="Triage History"
          renderRow={(t: TriageEntry, i: number) => (
            <Tr key={i}>
              <Td className="app-cell-nowrap">{new Date(t.performed_at).toLocaleString()}</Td>
              <Td className="app-cell-nowrap">
                <Label isCompact>{t.action}</Label>
              </Td>
              <Td className="app-cell-truncate">
                <Tooltip
                  content={
                    t.old_value && t.new_value
                      ? `${t.old_value} → ${t.new_value}`
                      : t.new_value || '--'
                  }
                >
                  <span>
                    {t.old_value && t.new_value
                      ? `${t.old_value} → ${t.new_value}`
                      : t.new_value || '--'}
                  </span>
                </Tooltip>
              </Td>
              <Td className="app-cell-nowrap">{t.performed_by ?? '--'}</Td>
            </Tr>
          )}
        />
      </GridItem>
    </>
  );
};
