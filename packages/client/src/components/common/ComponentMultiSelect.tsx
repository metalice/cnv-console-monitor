import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  Divider,
} from '@patternfly/react-core';

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
  selected,
  options,
  onChange,
  placeholder = 'All Components',
  itemLabel = 'components',
  isDisabled,
  isCompact,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const label = useMemo(() => {
    if (selected.size === 0) return placeholder;
    if (isCompact) {
      if (selected.size === 1) return [...selected][0];
      return itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);
    }
    if (selected.size === 1) return [...selected][0];
    return `${selected.size} ${itemLabel}`;
  }, [selected, placeholder, itemLabel, isCompact]);

  const allSelected = options.length > 0 && selected.size === options.length;

  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option); else next.add(option);
    onChange(next);
  };

  const toggleAll = () => {
    onChange(allSelected ? new Set() : new Set(options));
  };

  return (
    <Select
      role="menu"
      id={id}
      isOpen={isOpen}
      isScrollable
      maxMenuHeight="280px"
      onOpenChange={setIsOpen}
      onSelect={(_e, val) => toggle(val as string)}
      toggle={(ref) => (
        <MenuToggle
          ref={ref}
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={isDisabled}
          variant={isCompact ? 'plainText' : 'default'}
          className={isCompact ? 'app-masthead-select' : 'app-min-w-200'}
        >
          {isCompact && selected.size > 0 && <span className="app-masthead-badge">{selected.size}</span>}
          {label}
        </MenuToggle>
      )}
    >
      <div className="app-select-all-row">
        <button type="button" className="app-select-all-toggle" onClick={toggleAll}>
          {allSelected ? 'Clear selection' : 'Select all'}
        </button>
        {selected.size > 0 && !allSelected && (
          <span className="app-select-count">{selected.size} selected</span>
        )}
      </div>
      <Divider />
      <SelectList>
        {options.map(opt => (
          <SelectOption key={opt} value={opt} hasCheckbox isSelected={selected.has(opt)}>
            {opt}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
