import React, { useState } from 'react';

import type { ActivityEntry, ActivityFilterPreset } from '@cnv-monitor/shared';

import {
  Button,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  Popover,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import {
  BookmarkIcon,
  DownloadIcon,
  FilterIcon,
  SaveIcon,
  TimesIcon,
  UserIcon,
} from '@patternfly/react-icons';

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { label: 'Classified', value: 'classify_defect' },
  { label: 'Bulk Classified', value: 'bulk_classify_defect' },
  { label: 'Comment', value: 'add_comment' },
  { label: 'Jira Created', value: 'create_jira' },
  { label: 'Jira Linked', value: 'link_jira' },
  { label: 'Acknowledged', value: 'acknowledge' },
];

const escapeCsvField = (value: string | number | null | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

type LocalFilters = { action?: string; user?: string; search?: string };

type ActivityToolbarProps = {
  filters: LocalFilters;
  onFiltersChange: (filters: LocalFilters) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  users: string[];
  currentUser?: string;
  entries?: ActivityEntry[];
  presets?: ActivityFilterPreset[];
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (preset: ActivityFilterPreset) => void;
};

export const ActivityToolbar: React.FC<ActivityToolbarProps> = ({
  currentUser,
  entries,
  filters,
  hasActiveFilters,
  onClearAll,
  onFiltersChange,
  onLoadPreset,
  onSavePreset,
  presets,
  users,
}) => {
  const [actionSelectOpen, setActionSelectOpen] = useState(false);
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [presetSelectOpen, setPresetSelectOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const selectedActions = filters.action ? filters.action.split(',') : [];
  const isMyActivity = Boolean(currentUser && filters.user === currentUser);

  const updateFilter = (key: keyof LocalFilters, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleAction = (action: string) => {
    const current = new Set(selectedActions);
    if (current.has(action)) {
      current.delete(action);
    } else {
      current.add(action);
    }
    updateFilter('action', current.size > 0 ? [...current].join(',') : undefined);
  };

  const handleExport = () => {
    if (!entries?.length) {
      return;
    }
    const header = 'Time,Action,Component,Test,Old Value,New Value,By\n';
    const rows = entries
      .map(e =>
        [
          new Date(e.performed_at).toISOString(),
          e.action,
          e.component ?? '',
          e.test_name ?? '',
          e.old_value ?? '',
          e.new_value ?? '',
          e.performed_by ?? '',
        ]
          .map(escapeCsvField)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Toolbar clearAllFilters={onClearAll}>
      <ToolbarContent>
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
                    onClick={() => setActionSelectOpen(o => !o)}
                  >
                    Action {selectedActions.length > 0 && `(${selectedActions.length})`}
                  </MenuToggle>
                )}
                onOpenChange={setActionSelectOpen}
                onSelect={(_e, val) => toggleAction(val as string)}
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
                    onClick={() => setUserSelectOpen(o => !o)}
                  >
                    {filters.user || 'User'}
                  </MenuToggle>
                )}
                onOpenChange={setUserSelectOpen}
                onSelect={(_e, val) => {
                  updateFilter('user', val as string);
                  setUserSelectOpen(false);
                }}
              >
                <SelectList>
                  {users.map(u => (
                    <SelectOption isSelected={filters.user === u} key={u} value={u}>
                      {u}
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
                onChange={(_e, val) => updateFilter('search', val || undefined)}
                onClear={() => updateFilter('search', undefined)}
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarToggleGroup>

        <ToolbarGroup variant="action-group-plain">
          {currentUser && (
            <ToolbarItem>
              <Button
                icon={<UserIcon />}
                size="sm"
                variant={isMyActivity ? 'primary' : 'secondary'}
                onClick={() => updateFilter('user', isMyActivity ? undefined : currentUser)}
              >
                My Activity
              </Button>
            </ToolbarItem>
          )}
          {presets && presets.length > 0 && onLoadPreset && (
            <ToolbarItem>
              <Select
                aria-label="Load saved filter"
                isOpen={presetSelectOpen}
                // eslint-disable-next-line react/no-unstable-nested-components
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    isExpanded={presetSelectOpen}
                    ref={toggleRef}
                    variant="plain"
                    onClick={() => setPresetSelectOpen(o => !o)}
                  >
                    <BookmarkIcon />
                  </MenuToggle>
                )}
                onOpenChange={setPresetSelectOpen}
                onSelect={(_e, val) => {
                  const preset = presets.find(p => p.name === val);
                  if (preset) {
                    onLoadPreset(preset);
                  }
                  setPresetSelectOpen(false);
                }}
              >
                <SelectList>
                  {presets.map(p => (
                    <SelectOption key={p.name} value={p.name}>
                      {p.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
          )}
          {onSavePreset && hasActiveFilters && (
            <ToolbarItem>
              <Popover
                bodyContent={
                  <div>
                    <TextInput
                      aria-label="Preset name"
                      placeholder="Preset name"
                      value={presetName}
                      onChange={(_e, val) => setPresetName(val)}
                    />
                    <Button
                      className="app-mt-sm"
                      isDisabled={!presetName.trim()}
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onSavePreset(presetName.trim());
                        setPresetName('');
                      }}
                    >
                      Save
                    </Button>
                  </div>
                }
                headerContent="Save Filter Preset"
              >
                <Button aria-label="Save filter preset" icon={<SaveIcon />} variant="plain" />
              </Popover>
            </ToolbarItem>
          )}
          <ToolbarItem>
            <Button
              aria-label="Export CSV"
              icon={<DownloadIcon />}
              isDisabled={!entries?.length}
              variant="plain"
              onClick={handleExport}
            />
          </ToolbarItem>
          {hasActiveFilters && (
            <ToolbarItem>
              <Button
                aria-label="Clear all filters"
                icon={<TimesIcon />}
                variant="plain"
                onClick={onClearAll}
              />
            </ToolbarItem>
          )}
        </ToolbarGroup>

        {hasActiveFilters && (
          <ToolbarItem>
            <LabelGroup numLabels={5}>
              {selectedActions.map(a => (
                <Label key={a} onClose={() => toggleAction(a)}>
                  {ACTION_OPTIONS.find(o => o.value === a)?.label ?? a}
                </Label>
              ))}
              {filters.user && (
                <Label onClose={() => updateFilter('user', undefined)}>{filters.user}</Label>
              )}
              {filters.search && (
                <Label onClose={() => updateFilter('search', undefined)}>"{filters.search}"</Label>
              )}
            </LabelGroup>
          </ToolbarItem>
        )}
      </ToolbarContent>
    </Toolbar>
  );
};
