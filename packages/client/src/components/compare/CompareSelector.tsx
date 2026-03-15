import React, { useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { StatusBadge } from '../common/StatusBadge';
import type { LaunchGroup, LaunchRun } from '../../api/compare';

type CompareSelectorProps = {
  launchGroups: LaunchGroup[] | undefined;
  isLoading: boolean;
  selectedGroup: LaunchGroup | null;
  onSelectLaunch: (name: string) => void;
  onClearLaunch: () => void;
  selectedRunA: number | null;
  selectedRunB: number | null;
  onSelectRunA: (id: number | null) => void;
  onSelectRunB: (id: number | null) => void;
  onCompare: () => void;
  isComparing: boolean;
};

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const CompareSelector: React.FC<CompareSelectorProps> = ({
  launchGroups, isLoading, selectedGroup, onSelectLaunch, onClearLaunch,
  selectedRunA, selectedRunB, onSelectRunA, onSelectRunB, onCompare, isComparing,
}) => {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    if (!launchGroups) return [];
    const term = search.toLowerCase();
    return launchGroups
      .filter((group) => group.runCount >= 2)
      .filter((group) => !term || group.name.toLowerCase().includes(term) || (group.cnvVersion ?? '').toLowerCase().includes(term) || (group.component ?? '').toLowerCase().includes(term));
  }, [launchGroups, search]);

  const handleRunClick = (run: LaunchRun) => {
    if (selectedRunA === run.rp_id) { onSelectRunA(null); return; }
    if (selectedRunB === run.rp_id) { onSelectRunB(null); return; }
    if (!selectedRunA) { onSelectRunA(run.rp_id); return; }
    if (!selectedRunB) { onSelectRunB(run.rp_id); return; }
    onSelectRunB(run.rp_id);
  };

  if (!selectedGroup) {
    return (
      <Card>
        <CardTitle>Step 1: Select a Launch</CardTitle>
        <CardBody>
          <TextInput aria-label="Search launches" placeholder="Filter by name, version, or component..." value={search} onChange={(_e, inputValue) => setSearch(inputValue)} className="app-mb-md" />
          {isLoading ? (
            <Bullseye className="app-min-h-100"><Spinner aria-label="Loading launches" /></Bullseye>
          ) : filteredGroups.length === 0 ? (
            <EmptyState headingLevel="h4" titleText="No launches with multiple runs">
              <EmptyStateBody>Only launches with 2+ runs in the last 60 days can be compared.</EmptyStateBody>
            </EmptyState>
          ) : (
            <div className="app-max-h-400">
              <Table aria-label="Select launch" variant="compact">
                <Thead><Tr><Th>Launch Name</Th><Th>Version</Th><Th>Tier</Th><Th>Component</Th><Th>Runs</Th><Th>Latest</Th></Tr></Thead>
                <Tbody>
                  {filteredGroups.map((group) => (
                    <Tr key={group.name} isClickable onRowClick={() => onSelectLaunch(group.name)} className="app-cursor-pointer">
                      <Td dataLabel="Name" className="app-cell-truncate"><Tooltip content={group.name}><span>{group.name}</span></Tooltip></Td>
                      <Td dataLabel="Version" className="app-cell-nowrap">{group.cnvVersion ?? '—'}</Td>
                      <Td dataLabel="Tier" className="app-cell-nowrap">{group.tier ?? '—'}</Td>
                      <Td dataLabel="Component" className="app-cell-nowrap">{group.component ?? '—'}</Td>
                      <Td dataLabel="Runs" className="app-cell-nowrap"><strong>{group.runCount}</strong></Td>
                      <Td dataLabel="Latest" className="app-cell-nowrap"><StatusBadge status={group.latestStatus} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Step 2: Select two runs of <strong>{selectedGroup.cnvVersion} {selectedGroup.tier}</strong></FlexItem>
          <FlexItem><Button variant="link" size="sm" onClick={onClearLaunch}>Change launch</Button></FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content component="small" className="app-mb-sm app-text-muted">
          Click a row to set it as Run A (baseline), click another for Run B (compare). Then press Compare.
        </Content>
        <Table aria-label="Select runs" variant="compact">
          <Thead><Tr><Th>Role</Th><Th>Run #</Th><Th>Status</Th><Th>Passed</Th><Th>Failed</Th><Th>Cluster</Th><Th>Date</Th></Tr></Thead>
          <Tbody>
            {selectedGroup.runs.map((run) => {
              const isA = selectedRunA === run.rp_id;
              const isB = selectedRunB === run.rp_id;
              return (
                <Tr key={run.rp_id} isClickable isRowSelected={isA || isB} onRowClick={() => handleRunClick(run)} className="app-cursor-pointer">
                  <Td className="app-cell-nowrap">
                    {isA && <Label color="blue" isCompact>A (baseline)</Label>}
                    {isB && <Label color="orange" isCompact>B (compare)</Label>}
                  </Td>
                  <Td className="app-cell-nowrap"><strong>#{run.number}</strong></Td>
                  <Td className="app-cell-nowrap"><StatusBadge status={run.status} /></Td>
                  <Td className="app-cell-nowrap">{run.passed}/{run.total}</Td>
                  <Td className="app-cell-nowrap">{run.failed > 0 ? <Label color="red" isCompact>{run.failed}</Label> : '0'}</Td>
                  <Td className="app-cell-truncate"><Tooltip content={run.cluster_name ?? '—'}><span>{run.cluster_name ?? '—'}</span></Tooltip></Td>
                  <Td className="app-cell-nowrap">{formatDate(run.start_time)}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        <Flex className="app-mt-md" gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Button variant="primary" onClick={onCompare} isDisabled={!selectedRunA || !selectedRunB || selectedRunA === selectedRunB} isLoading={isComparing}>
              Compare
            </Button>
          </FlexItem>
          {selectedRunA && selectedRunB && selectedRunA === selectedRunB && (
            <FlexItem>
              <Content component="small" className="app-text-danger">Select two different runs.</Content>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};
