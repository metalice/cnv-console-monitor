import React from 'react';
import { Button, Label, Flex, FlexItem, TextInput, Badge, Content, Alert, Tooltip, Switch } from '@patternfly/react-core';
import { CheckIcon, TimesIcon, HelpIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';
import { MappingRow } from './MappingRow';

export type MappingDraft = { pattern: string; component: string; includeDeleted?: boolean };

type MappingsTableProps = {
  mappings: Array<{ pattern: string; component: string; type: string; matchCount: number; createdAt: string }>;
  newDraft: MappingDraft | null;
  editingPattern: string | null;
  editDraft: MappingDraft;
  componentOptions: SearchableSelectOption[];
  isAdmin: boolean;
  previewResult: { matches: string[]; totalCount: number; nameCount: number; conflicts?: Array<{ pattern: string; component: string }> } | null;
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

export const MappingsTable: React.FC<MappingsTableProps> = (props) => {

  return (
    <div className="app-table-scroll">
      <Table aria-label="Component mappings" variant="compact" isStickyHeader>
        <Thead>
          <Tr>
            <Th>
              Jenkins Team / Pattern{' '}
              <Tooltip content="Patterns use regex. Examples: 'CNV Network' matches exactly. 'network|ovn' matches names containing either word. Matching is case-insensitive.">
                <HelpIcon className="app-help-icon" />
              </Tooltip>
            </Th>
            <Th>Jira Component</Th>
            <Th width={10}>Launches</Th><Th width={10}>Type</Th>
            {props.isAdmin && <Th width={10}>Actions</Th>}
          </Tr>
        </Thead>
        <Tbody>
          {props.newDraft && (
            <Tr>
              <Td><TextInput value={props.newDraft.pattern} onChange={(_ev, value) => props.onNewDraftChange({ ...props.newDraft!, pattern: value })} placeholder="Jenkins team or pattern" aria-label="New pattern" /></Td>
              <Td><SearchableSelect id="new-mapping-comp" value={props.newDraft.component} options={props.componentOptions} onChange={(value) => props.onNewDraftChange({ ...props.newDraft!, component: value })} placeholder="Select Jira component" /></Td>
              <Td>
                <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
                  <FlexItem>{props.previewResult ? <Badge isRead>{props.previewResult.totalCount}</Badge> : '—'}</FlexItem>
                  <FlexItem>
                    <Tooltip content="Include launches from deleted Jenkins jobs in the match">
                      <Switch id="include-deleted" label="+ deleted" hasCheckIcon isChecked={props.newDraft.includeDeleted ?? false} isReversed
                        onChange={(_ev, checked) => props.onNewDraftChange({ ...props.newDraft!, includeDeleted: checked })} />
                    </Tooltip>
                  </FlexItem>
                </Flex>
              </Td>
              <Td><Label color="green" isCompact>manual</Label></Td>
              <Td>
                <Flex spaceItems={{ default: 'spaceItemsXs' }} flexWrap={{ default: 'nowrap' }}>
                  <FlexItem><Button variant="plain" size="sm" icon={<CheckIcon />} aria-label="Save" onClick={props.onSaveNew} isDisabled={!props.newDraft.pattern.trim() || !props.newDraft.component.trim()} isLoading={props.upsertPending} /></FlexItem>
                  <FlexItem><Button variant="plain" size="sm" icon={<TimesIcon />} aria-label="Cancel" onClick={() => props.onNewDraftChange(null)} /></FlexItem>
                </Flex>
              </Td>
            </Tr>
          )}
          {props.mappings.map((mapping) => (
            <MappingRow key={mapping.pattern} mapping={mapping} isEditing={props.editingPattern === mapping.pattern}
              editPattern={props.editDraft.pattern} editComponent={props.editDraft.component} componentOptions={props.componentOptions} isAdmin={props.isAdmin}
              onStartEdit={() => props.onStartEdit(mapping.pattern, mapping.component)} onCancelEdit={props.onCancelEdit}
              onSaveEdit={props.onSaveEdit} onDelete={() => props.onDelete(mapping.pattern)}
              onPatternChange={(value) => props.onEditDraftChange({ ...props.editDraft, pattern: value })}
              onComponentChange={(value) => props.onEditDraftChange({ ...props.editDraft, component: value })} />
          ))}
        </Tbody>
        {props.mappings.length > 0 && (
          <Tbody>
            <Tr>
              <Td><strong>Total: {props.mappings.length} mappings</strong></Td>
              <Td />
              <Td>{props.totalMappedLaunches != null && <Badge>{props.totalMappedLaunches.toLocaleString()}</Badge>}</Td>
              <Td />
              {props.isAdmin && <Td />}
            </Tr>
          </Tbody>
        )}
      </Table>
      {props.previewResult && (props.newDraft || props.editingPattern) && (
        <div className="app-mt-sm">
          {props.previewResult.conflicts && props.previewResult.conflicts.length > 0 && (
            <Alert variant="warning" isInline isPlain className="app-mb-sm"
              title={`Conflicts with ${props.previewResult.conflicts.length} existing mapping(s): ${props.previewResult.conflicts.map((conflict) => `"${conflict.pattern}" → ${conflict.component}`).join(', ')}`} />
          )}
          <Content component="small" className="app-text-muted">
            {props.previewResult.nameCount} unmapped launch names ({props.previewResult.totalCount} runs)
          </Content>
          {props.previewResult.matches.length > 0 && (
            <div className="app-preview-list">
              {props.previewResult.matches.map((name) => <code key={name} className="app-preview-item">{name}</code>)}
              {props.previewResult.nameCount > props.previewResult.matches.length && (
                <Content component="small" className="app-text-muted">...and {props.previewResult.nameCount - props.previewResult.matches.length} more</Content>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
