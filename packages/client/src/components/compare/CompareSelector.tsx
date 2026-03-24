import React, { useMemo, useState } from 'react';

import {
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Spinner,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { LaunchGroup, LaunchRun } from '../../api/compare';
import { StatusBadge } from '../common/StatusBadge';

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
  new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });

export const CompareSelector: React.FC<CompareSelectorProps> = ({
  isComparing,
  isLoading,
  launchGroups,
  onClearLaunch,
  onCompare,
  onSelectLaunch,
  onSelectRunA,
  onSelectRunB,
  selectedGroup,
  selectedRunA,
  selectedRunB,
}) => {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    if (!launchGroups) {
      return [];
    }
    const term = search.toLowerCase();
    return launchGroups
      .filter(group => group.runCount >= 2)
      .filter(
        group =>
          !term ||
          group.name.toLowerCase().includes(term) ||
          (group.cnvVersion ?? '').toLowerCase().includes(term) ||
          (group.component ?? '').toLowerCase().includes(term),
      );
  }, [launchGroups, search]);

  const handleRunClick = (run: LaunchRun) => {
    if (selectedRunA === run.rp_id) {
      onSelectRunA(null);
      return;
    }
    if (selectedRunB === run.rp_id) {
      onSelectRunB(null);
      return;
    }
    if (!selectedRunA) {
      onSelectRunA(run.rp_id);
      return;
    }
    if (!selectedRunB) {
      onSelectRunB(run.rp_id);
      return;
    }
    onSelectRunB(run.rp_id);
  };

  if (!selectedGroup) {
    return (
      <Card>
        <CardTitle>Step 1: Select a Launch</CardTitle>
        <CardBody>
          <TextInput
            aria-label="Search launches"
            className="app-mb-md"
            placeholder="Filter by name, version, or component..."
            value={search}
            onChange={(_e, inputValue) => setSearch(inputValue)}
          />
          {isLoading ? (
            <Bullseye className="app-min-h-100">
              <Spinner aria-label="Loading launches" />
            </Bullseye>
          ) : filteredGroups.length === 0 ? (
            <EmptyState headingLevel="h4" titleText="No launches with multiple runs">
              <EmptyStateBody>
                Only launches with 2+ runs in the last 60 days can be compared.
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <div className="app-max-h-400">
              <Table aria-label="Select launch" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Launch Name</Th>
                    <Th>Version</Th>
                    <Th>Tier</Th>
                    <Th>Component</Th>
                    <Th>Runs</Th>
                    <Th>Latest</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredGroups.map(group => (
                    <Tr
                      isClickable
                      className="app-cursor-pointer"
                      key={group.name}
                      onRowClick={() => onSelectLaunch(group.name)}
                    >
                      <Td className="app-cell-truncate" dataLabel="Name">
                        <Tooltip content={group.name}>
                          <span>{group.name}</span>
                        </Tooltip>
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Version">
                        {group.cnvVersion ?? '—'}
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Tier">
                        {group.tier ?? '—'}
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Component">
                        {group.component ?? '—'}
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Runs">
                        <strong>{group.runCount}</strong>
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Latest">
                        <StatusBadge status={group.latestStatus} />
                      </Td>
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
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            Step 2: Select two runs of{' '}
            <strong>
              {selectedGroup.cnvVersion} {selectedGroup.tier}
            </strong>
          </FlexItem>
          <FlexItem>
            <Button size="sm" variant="link" onClick={onClearLaunch}>
              Change launch
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content className="app-mb-sm app-text-muted" component="small">
          Click a row to set it as Run A (baseline), click another for Run B (compare). Then press
          Compare.
        </Content>
        <Table aria-label="Select runs" variant="compact">
          <Thead>
            <Tr>
              <Th>Role</Th>
              <Th>Run #</Th>
              <Th>Status</Th>
              <Th>Passed</Th>
              <Th>Failed</Th>
              <Th>Cluster</Th>
              <Th>Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {selectedGroup.runs.map(run => {
              const isA = selectedRunA === run.rp_id;
              const isB = selectedRunB === run.rp_id;
              return (
                <Tr
                  isClickable
                  className="app-cursor-pointer"
                  isRowSelected={isA || isB}
                  key={run.rp_id}
                  onRowClick={() => handleRunClick(run)}
                >
                  <Td className="app-cell-nowrap">
                    {isA && (
                      <Label isCompact color="blue">
                        A (baseline)
                      </Label>
                    )}
                    {isB && (
                      <Label isCompact color="orange">
                        B (compare)
                      </Label>
                    )}
                  </Td>
                  <Td className="app-cell-nowrap">
                    <strong>#{run.number}</strong>
                  </Td>
                  <Td className="app-cell-nowrap">
                    <StatusBadge status={run.status} />
                  </Td>
                  <Td className="app-cell-nowrap">
                    {run.passed}/{run.total}
                  </Td>
                  <Td className="app-cell-nowrap">
                    {run.failed > 0 ? (
                      <Label isCompact color="red">
                        {run.failed}
                      </Label>
                    ) : (
                      '0'
                    )}
                  </Td>
                  <Td className="app-cell-truncate">
                    <Tooltip content={run.cluster_name ?? '—'}>
                      <span>{run.cluster_name ?? '—'}</span>
                    </Tooltip>
                  </Td>
                  <Td className="app-cell-nowrap">{formatDate(run.start_time)}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          className="app-mt-md"
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <Button
              isDisabled={!selectedRunA || !selectedRunB || selectedRunA === selectedRunB}
              isLoading={isComparing}
              variant="primary"
              onClick={onCompare}
            >
              Compare
            </Button>
          </FlexItem>
          {selectedRunA && selectedRunB && selectedRunA === selectedRunB && (
            <FlexItem>
              <Content className="app-text-danger" component="small">
                Select two different runs.
              </Content>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};
