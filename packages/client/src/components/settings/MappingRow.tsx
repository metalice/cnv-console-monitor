import React from 'react';

import { Badge, Button, Flex, FlexItem, Label, TextInput } from '@patternfly/react-core';
import { CheckIcon, PencilAltIcon, TimesIcon, TrashIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import type { ComponentMappingRecord } from '../../api/componentMappings';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import { SearchableSelect } from '../common/SearchableSelect';

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
  componentOptions,
  editComponent,
  editPattern,
  isAdmin,
  isEditing,
  mapping,
  onCancelEdit,
  onComponentChange,
  onDelete,
  onPatternChange,
  onSaveEdit,
  onStartEdit,
}) => (
  <Tr>
    <Td>
      {isEditing ? (
        <TextInput
          aria-label="Pattern"
          placeholder="e.g. network|ovn|sriov"
          value={editPattern}
          onChange={(_event, value) => onPatternChange(value)}
        />
      ) : (
        <code className="app-text-xs">{mapping.pattern}</code>
      )}
    </Td>
    <Td>
      {isEditing ? (
        <SearchableSelect
          id={`edit-comp-${mapping.pattern}`}
          options={componentOptions}
          placeholder="Select component"
          value={editComponent}
          onChange={onComponentChange}
        />
      ) : (
        <strong>{mapping.component}</strong>
      )}
    </Td>
    <Td>
      <Badge isRead>{mapping.matchCount}</Badge>
    </Td>
    <Td>
      <Label isCompact color={TYPE_COLORS[mapping.type] ?? 'grey'}>
        {mapping.type}
      </Label>
    </Td>
    <Td>
      {isAdmin && (
        <Flex flexWrap={{ default: 'nowrap' }} spaceItems={{ default: 'spaceItemsXs' }}>
          {isEditing ? (
            <>
              <FlexItem>
                <Button
                  aria-label="Save"
                  icon={<CheckIcon />}
                  isDisabled={!editPattern.trim() || !editComponent.trim()}
                  size="sm"
                  variant="plain"
                  onClick={onSaveEdit}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  aria-label="Cancel"
                  icon={<TimesIcon />}
                  size="sm"
                  variant="plain"
                  onClick={onCancelEdit}
                />
              </FlexItem>
            </>
          ) : (
            <>
              <FlexItem>
                <Button
                  aria-label="Edit"
                  icon={<PencilAltIcon />}
                  size="sm"
                  variant="plain"
                  onClick={onStartEdit}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  isDanger
                  aria-label="Delete"
                  icon={<TrashIcon />}
                  size="sm"
                  variant="plain"
                  onClick={onDelete}
                />
              </FlexItem>
            </>
          )}
        </Flex>
      )}
    </Td>
  </Tr>
);
