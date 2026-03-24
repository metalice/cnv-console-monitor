import React, { useMemo, useState } from 'react';

import { Divider, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';

type ComponentMultiSelectProps = {
  id: string;
  selected: Set<string>;
  options: string[];
  onChange: (selected: Set<string>) => void;
  placeholder?: string;
  itemLabel?: string;
  isDisabled?: boolean;
  isCompact?: boolean;
};

export const ComponentMultiSelect: React.FC<ComponentMultiSelectProps> = ({
  id,
  isCompact,
  isDisabled,
  itemLabel = 'components',
  onChange,
  options,
  placeholder = 'All Components',
  selected,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const label = useMemo(() => {
    if (selected.size === 0) {
      return placeholder;
    }
    if (isCompact) {
      if (selected.size === 1) {
        return [...selected][0];
      }
      return itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);
    }
    if (selected.size === 1) {
      return [...selected][0];
    }
    return `${selected.size} ${itemLabel}`;
  }, [selected, placeholder, itemLabel, isCompact]);

  const allSelected = options.length > 0 && selected.size === options.length;

  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange(next);
  };

  const toggleAll = () => {
    onChange(allSelected ? new Set() : new Set(options));
  };

  return (
    <Select
      isScrollable
      id={id}
      isOpen={isOpen}
      maxMenuHeight="280px"
      role="menu"
      // eslint-disable-next-line react/no-unstable-nested-components
      toggle={ref => (
        <MenuToggle
          className={isCompact ? 'app-masthead-select' : 'app-min-w-200'}
          isDisabled={isDisabled}
          isExpanded={isOpen}
          ref={ref}
          variant={isCompact ? 'plainText' : 'default'}
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
        >
          {isCompact && selected.size > 0 && (
            <span className="app-masthead-badge">{selected.size}</span>
          )}
          {label}
        </MenuToggle>
      )}
      onOpenChange={open => setIsOpen(open)}
      onSelect={(_e, val) => {
        toggle(val as string);
        setIsOpen(true);
      }}
    >
      <div className="app-select-all-row">
        <button className="app-select-all-toggle" type="button" onClick={toggleAll}>
          {allSelected ? 'Clear selection' : 'Select all'}
        </button>
        {selected.size > 0 && !allSelected && (
          <span className="app-select-count">{selected.size} selected</span>
        )}
      </div>
      <Divider />
      <SelectList>
        {options.map(opt => (
          <SelectOption hasCheckbox isSelected={selected.has(opt)} key={opt} value={opt}>
            {opt}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
