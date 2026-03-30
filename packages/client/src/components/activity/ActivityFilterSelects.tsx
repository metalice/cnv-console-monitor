import React, { useState } from 'react';

import {
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';

import { ACTION_OPTIONS, type LocalFilters } from './activityToolbarHelpers';

type ActivityFilterSelectsProps = {
  filters: LocalFilters;
  selectedActions: string[];
  users: string[];
  onToggleAction: (action: string) => void;
  onUpdateFilter: (key: keyof LocalFilters, value: string | undefined) => void;
};

export const ActivityFilterSelects = ({
  filters,
  onToggleAction,
  onUpdateFilter,
  selectedActions,
  users,
}: ActivityFilterSelectsProps) => {
  const [actionSelectOpen, setActionSelectOpen] = useState(false);
  const [userSelectOpen, setUserSelectOpen] = useState(false);

  return (
    <ToolbarToggleGroup breakpoint="lg" toggleIcon={<FilterIcon />}>
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <Select
            aria-label="Action filter"
            isOpen={actionSelectOpen}
            // eslint-disable-next-line react/no-unstable-nested-components
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                isExpanded={actionSelectOpen}
                ref={toggleRef}
                onClick={() => setActionSelectOpen(prev => !prev)}
              >
                Action {selectedActions.length > 0 && `(${selectedActions.length})`}
              </MenuToggle>
            )}
            onOpenChange={setActionSelectOpen}
            onSelect={(_e, val) => onToggleAction(val as string)}
          >
            <SelectList>
              {ACTION_OPTIONS.map(opt => (
                <SelectOption
                  hasCheckbox
                  isSelected={selectedActions.includes(opt.value)}
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </ToolbarItem>

        <ToolbarItem>
          <Select
            aria-label="User filter"
            isOpen={userSelectOpen}
            // eslint-disable-next-line react/no-unstable-nested-components
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                isExpanded={userSelectOpen}
                ref={toggleRef}
                onClick={() => setUserSelectOpen(prev => !prev)}
              >
                {filters.user || 'User'}
              </MenuToggle>
            )}
            onOpenChange={setUserSelectOpen}
            onSelect={(_e, val) => {
              onUpdateFilter('user', val as string);
              setUserSelectOpen(false);
            }}
          >
            <SelectList>
              {users.map(username => (
                <SelectOption
                  isSelected={filters.user === username}
                  key={username}
                  value={username}
                >
                  {username}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </ToolbarItem>

        <ToolbarItem>
          <SearchInput
            aria-label="Search activity"
            placeholder="Search tests, Jira, notes..."
            value={filters.search ?? ''}
            onChange={(_e, val) => onUpdateFilter('search', val || undefined)}
            onClear={() => onUpdateFilter('search', undefined)}
          />
        </ToolbarItem>
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};
