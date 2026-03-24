import React from 'react';

import {
  Alert,
  Badge,
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  Switch,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { CheckIcon, HelpIcon, TimesIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';

import { MappingRow } from './MappingRow';

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

export const MappingsTable: React.FC<MappingsTableProps> = props => (
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
          <Tr>
            <Td>
              <TextInput
                aria-label="New pattern"
                placeholder="Jenkins team or pattern"
                value={props.newDraft.pattern}
                onChange={(_ev, value) =>
                  props.newDraft && props.onNewDraftChange({ ...props.newDraft, pattern: value })
                }
              />
            </Td>
            <Td>
              <SearchableSelect
                id="new-mapping-comp"
                options={props.componentOptions}
                placeholder="Select Jira component"
                value={props.newDraft.component}
                onChange={value =>
                  props.newDraft && props.onNewDraftChange({ ...props.newDraft, component: value })
                }
              />
            </Td>
            <Td>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                flexWrap={{ default: 'nowrap' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem>
                  {props.previewResult ? (
                    <Badge isRead>{props.previewResult.totalCount}</Badge>
                  ) : (
                    '—'
                  )}
                </FlexItem>
                <FlexItem>
                  <Tooltip content="Include launches from deleted Jenkins jobs in the match">
                    <Switch
                      hasCheckIcon
                      isReversed
                      id="include-deleted"
                      isChecked={props.newDraft.includeDeleted ?? false}
                      label="+ deleted"
                      onChange={(_ev, checked) =>
                        props.newDraft &&
                        props.onNewDraftChange({ ...props.newDraft, includeDeleted: checked })
                      }
                    />
                  </Tooltip>
                </FlexItem>
              </Flex>
            </Td>
            <Td>
              <Label isCompact color="green">
                manual
              </Label>
            </Td>
            <Td>
              <Flex flexWrap={{ default: 'nowrap' }} spaceItems={{ default: 'spaceItemsXs' }}>
                <FlexItem>
                  <Button
                    aria-label="Save"
                    icon={<CheckIcon />}
                    isDisabled={!props.newDraft.pattern.trim() || !props.newDraft.component.trim()}
                    isLoading={props.upsertPending}
                    size="sm"
                    variant="plain"
                    onClick={props.onSaveNew}
                  />
                </FlexItem>
                <FlexItem>
                  <Button
                    aria-label="Cancel"
                    icon={<TimesIcon />}
                    size="sm"
                    variant="plain"
                    onClick={() => props.onNewDraftChange(null)}
                  />
                </FlexItem>
              </Flex>
            </Td>
          </Tr>
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
      <div className="app-mt-sm">
        {props.previewResult.conflicts && props.previewResult.conflicts.length > 0 && (
          <Alert
            isInline
            isPlain
            className="app-mb-sm"
            title={`Conflicts with ${props.previewResult.conflicts.length} existing mapping(s): ${props.previewResult.conflicts.map(conflict => `"${conflict.pattern}" → ${conflict.component}`).join(', ')}`}
            variant="warning"
          />
        )}
        <Content className="app-text-muted" component="small">
          {props.previewResult.nameCount} unmapped launch names ({props.previewResult.totalCount}{' '}
          runs)
        </Content>
        {props.previewResult.matches.length > 0 && (
          <div className="app-preview-list">
            {props.previewResult.matches.map(name => (
              <code className="app-preview-item" key={name}>
                {name}
              </code>
            ))}
            {props.previewResult.nameCount > props.previewResult.matches.length && (
              <Content className="app-text-muted" component="small">
                ...and {props.previewResult.nameCount - props.previewResult.matches.length} more
              </Content>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);
