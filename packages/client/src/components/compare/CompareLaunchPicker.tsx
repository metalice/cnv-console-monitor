import { useMemo, useState } from 'react';

import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Spinner,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { LaunchGroup } from '../../api/compare';
import { StatusBadge } from '../common/StatusBadge';

type CompareLaunchPickerProps = {
  launchGroups: LaunchGroup[] | undefined;
  isLoading: boolean;
  onSelectLaunch: (name: string) => void;
};

export const CompareLaunchPicker = ({
  isLoading,
  launchGroups,
  onSelectLaunch,
}: CompareLaunchPickerProps) => {
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
};
