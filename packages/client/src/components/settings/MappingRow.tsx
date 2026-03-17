import React from 'react';
import { Button, Label, Flex, FlexItem, TextInput, Badge } from '@patternfly/react-core';
import { PencilAltIcon, TrashIcon, CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { Tr, Td } from '@patternfly/react-table';
import { SearchableSelect } from '../common/SearchableSelect';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import type { ComponentMappingRecord } from '../../api/componentMappings';

type MappingRowProps = {
  mapping: ComponentMappingRecord;
  isEditing: boolean;
  editPattern: string;
  editComponent: string;
  componentOptions: SearchableSelectOption[];
  isAdmin: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onPatternChange: (value: string) => void;
  onComponentChange: (value: string) => void;
};

const TYPE_COLORS: Record<string, 'blue' | 'green' | 'grey'> = { auto: 'blue', manual: 'green' };

export const MappingRow: React.FC<MappingRowProps> = ({
  mapping, isEditing, editPattern, editComponent,
  componentOptions, isAdmin,
  onStartEdit, onCancelEdit, onSaveEdit, onDelete,
  onPatternChange, onComponentChange,
}) => (
  <Tr>
    <Td>
      {isEditing ? (
        <TextInput value={editPattern} onChange={(_event, value) => onPatternChange(value)}
          aria-label="Pattern" placeholder="e.g. network|ovn|sriov" />
      ) : (
        <code className="app-text-xs">{mapping.pattern}</code>
      )}
    </Td>
    <Td>
      {isEditing ? (
        <SearchableSelect id={`edit-comp-${mapping.pattern}`} value={editComponent}
          options={componentOptions} onChange={onComponentChange} placeholder="Select component" />
      ) : (
        <strong>{mapping.component}</strong>
      )}
    </Td>
    <Td><Badge isRead>{mapping.matchCount}</Badge></Td>
    <Td><Label color={TYPE_COLORS[mapping.type] ?? 'grey'} isCompact>{mapping.type}</Label></Td>
    <Td>
      {isAdmin && (
        <Flex spaceItems={{ default: 'spaceItemsXs' }} flexWrap={{ default: 'nowrap' }}>
          {isEditing ? (
            <>
              <FlexItem><Button variant="plain" size="sm" icon={<CheckIcon />} aria-label="Save"
                onClick={onSaveEdit} isDisabled={!editPattern.trim() || !editComponent.trim()} /></FlexItem>
              <FlexItem><Button variant="plain" size="sm" icon={<TimesIcon />} aria-label="Cancel"
                onClick={onCancelEdit} /></FlexItem>
            </>
          ) : (
            <>
              <FlexItem><Button variant="plain" size="sm" icon={<PencilAltIcon />} aria-label="Edit"
                onClick={onStartEdit} /></FlexItem>
              <FlexItem><Button variant="plain" size="sm" icon={<TrashIcon />} aria-label="Delete"
                isDanger onClick={onDelete} /></FlexItem>
            </>
          )}
        </Flex>
      )}
    </Td>
  </Tr>
);
