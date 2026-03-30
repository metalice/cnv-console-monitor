import { useState } from 'react';

import {
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  ToggleGroup,
  ToggleGroupItem,
  ToolbarItem,
} from '@patternfly/react-core';

type ChecklistVersionFilterProps = {
  checklistStatus: 'open' | 'all';
  onStatusChange: (status: 'open' | 'all') => void;
  availableVersions: string[];
  selectedVersions: Set<string>;
  onToggleVersion: (ver: string) => void;
};

export const ChecklistVersionFilter = ({
  availableVersions,
  checklistStatus,
  onStatusChange,
  onToggleVersion,
  selectedVersions,
}: ChecklistVersionFilterProps) => {
  const [open, setOpen] = useState(false);

  const label =
    selectedVersions.size === 0
      ? 'All Versions'
      : selectedVersions.size === 1
        ? [...selectedVersions][0]
        : `${selectedVersions.size} versions`;

  return (
    <>
      <ToolbarItem>
        <ToggleGroup>
          <ToggleGroupItem
            isSelected={checklistStatus === 'open'}
            text="Open"
            onChange={() => onStatusChange('open')}
          />
          <ToggleGroupItem
            isSelected={checklistStatus === 'all'}
            text="All"
            onChange={() => onStatusChange('all')}
          />
        </ToggleGroup>
      </ToolbarItem>
      {availableVersions.length > 0 && (
        <ToolbarItem>
          <Select
            isOpen={open}
            role="menu"
            // eslint-disable-next-line react/no-unstable-nested-components
            toggle={ref => (
              <MenuToggle isExpanded={open} ref={ref} onClick={() => setOpen(!open)}>
                {label}
              </MenuToggle>
            )}
            onOpenChange={setOpen}
            onSelect={(_e, val) => onToggleVersion(val as string)}
          >
            <SelectList>
              {availableVersions.map(ver => (
                <SelectOption
                  hasCheckbox
                  isSelected={selectedVersions.has(ver)}
                  key={ver}
                  value={ver}
                >
                  {ver}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </ToolbarItem>
      )}
    </>
  );
};
