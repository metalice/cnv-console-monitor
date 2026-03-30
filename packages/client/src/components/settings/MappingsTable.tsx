import { Badge, Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { type SearchableSelectOption } from '../common/SearchableSelect';

import { MappingRow } from './MappingRow';
import { MappingsPreview } from './MappingsPreview';
import { NewMappingRow } from './NewMappingRow';

export type MappingDraft = { pattern: string; component: string; includeDeleted?: boolean };

type MappingsTableProps = {
  mappings: {
    pattern: string;
    component: string;
    type: string;
    matchCount: number;
    createdAt: string;
  }[];
  newDraft: MappingDraft | null;
  editingPattern: string | null;
  editDraft: MappingDraft;
  componentOptions: SearchableSelectOption[];
  isAdmin: boolean;
  previewResult: {
    matches: string[];
    totalCount: number;
    nameCount: number;
    conflicts?: { pattern: string; component: string }[];
  } | null;
  onNewDraftChange: (draft: MappingDraft | null) => void;
  onStartEdit: (pattern: string, component: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onSaveNew: () => void;
  onDelete: (pattern: string) => void;
  onEditDraftChange: (draft: MappingDraft) => void;
  upsertPending: boolean;
  totalMappedLaunches?: number;
};

export const MappingsTable = (props: MappingsTableProps) => (
  <div className="app-table-scroll">
    <Table isStickyHeader aria-label="Component mappings" variant="compact">
      <Thead>
        <Tr>
          <Th>
            Jenkins Team / Pattern{' '}
            <Tooltip content="Patterns use regex. Examples: 'CNV Network' matches exactly. 'network|ovn' matches names containing either word. Matching is case-insensitive.">
              <HelpIcon className="app-help-icon" />
            </Tooltip>
          </Th>
          <Th>Jira Component</Th>
          <Th width={10}>Launches</Th>
          <Th width={10}>Type</Th>
          {props.isAdmin && <Th width={10}>Actions</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {props.newDraft && (
          <NewMappingRow
            componentOptions={props.componentOptions}
            draft={props.newDraft}
            previewCount={props.previewResult?.totalCount ?? null}
            upsertPending={props.upsertPending}
            onDraftChange={props.onNewDraftChange}
            onSave={props.onSaveNew}
          />
        )}
        {props.mappings.map(mapping => (
          <MappingRow
            componentOptions={props.componentOptions}
            editComponent={props.editDraft.component}
            editPattern={props.editDraft.pattern}
            isAdmin={props.isAdmin}
            isEditing={props.editingPattern === mapping.pattern}
            key={mapping.pattern}
            mapping={mapping}
            onCancelEdit={props.onCancelEdit}
            onComponentChange={value =>
              props.onEditDraftChange({ ...props.editDraft, component: value })
            }
            onDelete={() => props.onDelete(mapping.pattern)}
            onPatternChange={value =>
              props.onEditDraftChange({ ...props.editDraft, pattern: value })
            }
            onSaveEdit={props.onSaveEdit}
            onStartEdit={() => props.onStartEdit(mapping.pattern, mapping.component)}
          />
        ))}
      </Tbody>
      {props.mappings.length > 0 && (
        <Tbody>
          <Tr>
            <Td>
              <strong>Total: {props.mappings.length} mappings</strong>
            </Td>
            <Td />
            <Td>
              {props.totalMappedLaunches != null && (
                <Badge>{props.totalMappedLaunches.toLocaleString()}</Badge>
              )}
            </Td>
            <Td />
            {props.isAdmin && <Td />}
          </Tr>
        </Tbody>
      )}
    </Table>
    {props.previewResult && (props.newDraft ?? props.editingPattern) && (
      <MappingsPreview previewResult={props.previewResult} />
    )}
  </div>
);
