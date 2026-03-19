import React, { useState } from 'react';
import {
  Toolbar, ToolbarContent, ToolbarItem, ToolbarGroup, ToolbarToggleGroup,
  Button, SearchInput, TextInput, Popover,
  Select, SelectOption, SelectList, MenuToggle, type MenuToggleElement,
  Label, LabelGroup,
} from '@patternfly/react-core';
import { FilterIcon, DownloadIcon, UserIcon, SaveIcon, BookmarkIcon, TimesIcon } from '@patternfly/react-icons';
import type { ActivityEntry, ActivityFilterPreset } from '@cnv-monitor/shared';

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'classify_defect', label: 'Classified' },
  { value: 'bulk_classify_defect', label: 'Bulk Classified' },
  { value: 'add_comment', label: 'Comment' },
  { value: 'create_jira', label: 'Jira Created' },
  { value: 'link_jira', label: 'Jira Linked' },
  { value: 'acknowledge', label: 'Acknowledged' },
];

const escapeCsvField = (value: string | number | null | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
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
  filters, onFiltersChange, onClearAll, hasActiveFilters,
  users, currentUser, entries,
  presets, onSavePreset, onLoadPreset,
}) => {
  const [actionSelectOpen, setActionSelectOpen] = useState(false);
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [presetSelectOpen, setPresetSelectOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const selectedActions = filters.action ? filters.action.split(',') : [];
  const isMyActivity = !!(currentUser && filters.user === currentUser);

  const updateFilter = (key: keyof LocalFilters, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleAction = (action: string) => {
    const current = new Set(selectedActions);
    if (current.has(action)) current.delete(action); else current.add(action);
    updateFilter('action', current.size > 0 ? [...current].join(',') : undefined);
  };

  const handleExport = () => {
    if (!entries?.length) return;
    const header = 'Time,Action,Component,Test,Old Value,New Value,By\n';
    const rows = entries.map(e => [
      new Date(e.performed_at).toISOString(),
      e.action, e.component ?? '', e.test_name ?? '',
      e.old_value ?? '', e.new_value ?? '', e.performed_by ?? '',
    ].map(escapeCsvField).join(',')).join('\n');
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
        <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="lg">
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <Select
                aria-label="Action filter"
                isOpen={actionSelectOpen}
                onOpenChange={setActionSelectOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setActionSelectOpen(o => !o)} isExpanded={actionSelectOpen}>
                    Action {selectedActions.length > 0 && `(${selectedActions.length})`}
                  </MenuToggle>
                )}
                onSelect={(_e, val) => toggleAction(val as string)}
              >
                <SelectList>
                  {ACTION_OPTIONS.map(opt => (
                    <SelectOption key={opt.value} value={opt.value} hasCheckbox isSelected={selectedActions.includes(opt.value)}>
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
                onOpenChange={setUserSelectOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setUserSelectOpen(o => !o)} isExpanded={userSelectOpen}>
                    {filters.user || 'User'}
                  </MenuToggle>
                )}
                onSelect={(_e, val) => { updateFilter('user', val as string); setUserSelectOpen(false); }}
              >
                <SelectList>
                  {users.map(u => (
                    <SelectOption key={u} value={u} isSelected={filters.user === u}>{u}</SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>

            <ToolbarItem>
              <SearchInput
                placeholder="Search tests, Jira, notes..."
                value={filters.search ?? ''}
                onChange={(_e, val) => updateFilter('search', val || undefined)}
                onClear={() => updateFilter('search', undefined)}
                aria-label="Search activity"
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarToggleGroup>

        <ToolbarGroup variant="action-group-plain">
          {currentUser && (
            <ToolbarItem>
              <Button
                variant={isMyActivity ? 'primary' : 'secondary'}
                icon={<UserIcon />}
                onClick={() => updateFilter('user', isMyActivity ? undefined : currentUser)}
                size="sm"
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
                onOpenChange={setPresetSelectOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setPresetSelectOpen(o => !o)} isExpanded={presetSelectOpen} variant="plain">
                    <BookmarkIcon />
                  </MenuToggle>
                )}
                onSelect={(_e, val) => {
                  const preset = presets.find(p => p.name === val);
                  if (preset) onLoadPreset(preset);
                  setPresetSelectOpen(false);
                }}
              >
                <SelectList>
                  {presets.map(p => (
                    <SelectOption key={p.name} value={p.name}>{p.name}</SelectOption>
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
                      value={presetName}
                      onChange={(_e, val) => setPresetName(val)}
                      placeholder="Preset name"
                      aria-label="Preset name"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      className="app-mt-sm"
                      isDisabled={!presetName.trim()}
                      onClick={() => { onSavePreset(presetName.trim()); setPresetName(''); }}
                    >
                      Save
                    </Button>
                  </div>
                }
                headerContent="Save Filter Preset"
              >
                <Button variant="plain" icon={<SaveIcon />} aria-label="Save filter preset" />
              </Popover>
            </ToolbarItem>
          )}
          <ToolbarItem>
            <Button variant="plain" icon={<DownloadIcon />} onClick={handleExport} isDisabled={!entries?.length} aria-label="Export CSV" />
          </ToolbarItem>
          {hasActiveFilters && (
            <ToolbarItem>
              <Button variant="plain" icon={<TimesIcon />} onClick={onClearAll} aria-label="Clear all filters" />
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
              {filters.user && <Label onClose={() => updateFilter('user', undefined)}>{filters.user}</Label>}
              {filters.search && <Label onClose={() => updateFilter('search', undefined)}>"{filters.search}"</Label>}
            </LabelGroup>
          </ToolbarItem>
        )}
      </ToolbarContent>
    </Toolbar>
  );
};
