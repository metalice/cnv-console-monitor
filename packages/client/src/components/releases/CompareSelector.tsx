import React from 'react';

import {
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Tooltip,
} from '@patternfly/react-core';

type SubVersion = { name: string; released: boolean };

type CompareSelectorProps = {
  compareEnabled: boolean;
  compareFrom: string;
  targetVer: string;
  subVersions: SubVersion[];
  onCompareToggle: (enabled: boolean) => void;
  onCompareFromChange: (ver: string) => void;
  onClearResult: () => void;
};

export const CompareSelector = ({
  compareEnabled,
  compareFrom,
  onClearResult,
  onCompareFromChange,
  onCompareToggle,
  subVersions,
  targetVer,
}: CompareSelectorProps) => {
  const [compareOpen, setCompareOpen] = React.useState(false);

  return (
    <FlexItem>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        className="app-mb-xs"
        spaceItems={{ default: 'spaceItemsSm' }}
      >
        <FlexItem>
          <input
            checked={compareEnabled}
            id="compare-enable"
            type="checkbox"
            onChange={evt => onCompareToggle(evt.target.checked)}
          />
        </FlexItem>
        <FlexItem>
          <Tooltip content="Enable to compare changes between two sub-versions.">
            <label className="app-text-xs app-cursor-pointer" htmlFor="compare-enable">
              Compare with previous version
            </label>
          </Tooltip>
        </FlexItem>
      </Flex>
      {compareEnabled && (
        <Select
          isOpen={compareOpen}
          // eslint-disable-next-line react/no-unstable-nested-components
          toggle={(ref: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              className="app-max-w-250"
              isExpanded={compareOpen}
              ref={ref}
              onClick={() => setCompareOpen(prev => !prev)}
            >
              {compareFrom || 'Select base version'}
            </MenuToggle>
          )}
          onOpenChange={setCompareOpen}
          onSelect={(_e, val) => {
            onCompareFromChange(val as string);
            setCompareOpen(false);
            onClearResult();
          }}
        >
          <SelectList>
            {subVersions
              .filter(sub => sub.name !== targetVer)
              .map(sub => (
                <SelectOption key={sub.name} value={sub.name}>
                  {sub.name}
                </SelectOption>
              ))}
          </SelectList>
        </Select>
      )}
    </FlexItem>
  );
};
