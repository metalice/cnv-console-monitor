import React, { useState } from 'react';

import { type ActivityFilterPreset } from '@cnv-monitor/shared';

import {
  Button,
  MenuToggle,
  type MenuToggleElement,
  Popover,
  Select,
  SelectList,
  SelectOption,
  TextInput,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { BookmarkIcon, DownloadIcon, SaveIcon, TimesIcon, UserIcon } from '@patternfly/react-icons';

type ActivityToolbarActionsProps = {
  currentUser?: string;
  isMyActivity: boolean;
  hasActiveFilters: boolean;
  hasEntries: boolean;
  presets?: ActivityFilterPreset[];
  onToggleMyActivity: () => void;
  onLoadPreset?: (preset: ActivityFilterPreset) => void;
  onSavePreset?: (name: string) => void;
  onExport: () => void;
  onClearAll: () => void;
};

export const ActivityToolbarActions = ({
  currentUser,
  hasActiveFilters,
  hasEntries,
  isMyActivity,
  onClearAll,
  onExport,
  onLoadPreset,
  onSavePreset,
  onToggleMyActivity,
  presets,
}: ActivityToolbarActionsProps) => {
  const [presetSelectOpen, setPresetSelectOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  return (
    <ToolbarGroup variant="action-group-plain">
      {currentUser && (
        <ToolbarItem>
          <Button
            icon={<UserIcon />}
            size="sm"
            variant={isMyActivity ? 'primary' : 'secondary'}
            onClick={onToggleMyActivity}
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
                onClick={() => setPresetSelectOpen(prev => !prev)}
              >
                <BookmarkIcon />
              </MenuToggle>
            )}
            onOpenChange={setPresetSelectOpen}
            onSelect={(_e, val) => {
              const preset = presets.find(entry => entry.name === val);
              if (preset) {
                onLoadPreset(preset);
              }
              setPresetSelectOpen(false);
            }}
          >
            <SelectList>
              {presets.map(preset => (
                <SelectOption key={preset.name} value={preset.name}>
                  {preset.name}
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
          isDisabled={!hasEntries}
          variant="plain"
          onClick={onExport}
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
  );
};
