import { ExpandableSection } from '@patternfly/react-core';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';

import { type UnmappedEntry } from '../../api/componentMappings';

import { UnmappedLaunchRow } from './UnmappedLaunchRow';

type UnmappedSectionProps = {
  activeLaunches: UnmappedEntry[];
  deletedLaunches: UnmappedEntry[];
  isAdmin: boolean;
  unmappedExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  onMap: (prefill: string) => void;
};

const UnmappedTable = ({
  entries,
  isAdmin,
  label,
  onMap,
}: {
  entries: UnmappedEntry[];
  isAdmin: boolean;
  label: string;
  onMap: (prefill: string) => void;
}) => (
  <div className="app-table-scroll">
    <Table aria-label={label} variant="compact">
      <Thead>
        <Tr>
          <Th>Launch Name</Th>
          <Th width={10}>Runs</Th>
          {isAdmin && <Th width={10} />}
        </Tr>
      </Thead>
      <Tbody>
        {entries.map(entry => (
          <UnmappedLaunchRow entry={entry} isAdmin={isAdmin} key={entry.name} onMap={onMap} />
        ))}
      </Tbody>
    </Table>
  </div>
);

export const UnmappedSection = ({
  activeLaunches,
  deletedLaunches,
  isAdmin,
  onMap,
  onToggleExpanded,
  unmappedExpanded,
}: UnmappedSectionProps) => (
  <>
    {activeLaunches.length > 0 && (
      <ExpandableSection
        className="app-mt-md"
        isExpanded={unmappedExpanded}
        toggleText={`${activeLaunches.length} unmapped launches (${activeLaunches.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} runs) — need manual mapping`}
        onToggle={(_event, expanded) => onToggleExpanded(expanded)}
      >
        <UnmappedTable
          entries={activeLaunches}
          isAdmin={isAdmin}
          label="Unmapped launches"
          onMap={onMap}
        />
      </ExpandableSection>
    )}
    {deletedLaunches.length > 0 && (
      <ExpandableSection
        className="app-mt-sm"
        toggleText={`${deletedLaunches.length} deleted Jenkins jobs (${deletedLaunches.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} runs) — job removed from Jenkins`}
      >
        <UnmappedTable
          entries={deletedLaunches}
          isAdmin={isAdmin}
          label="Deleted launches"
          onMap={onMap}
        />
      </ExpandableSection>
    )}
  </>
);
