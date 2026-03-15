import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
} from '@patternfly/react-core';

type ComponentMultiSelectProps = {
  id: string;
  selected: Set<string>;
  options: string[];
  onChange: (selected: Set<string>) => void;
  placeholder?: string;
  itemLabel?: string;
  isDisabled?: boolean;
};

export const ComponentMultiSelect: React.FC<ComponentMultiSelectProps> = ({
  id,
  selected,
  options,
  onChange,
  placeholder = 'All Components',
  itemLabel = 'components',
  isDisabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const label = useMemo(() => {
    if (selected.size === 0) return placeholder;
    if (selected.size === 1) return [...selected][0];
    return `${selected.size} ${itemLabel}`;
  }, [selected, placeholder, itemLabel]);

  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option); else next.add(option);
    onChange(next);
  };

  return (
    <Select
      role="menu"
      id={id}
      isOpen={isOpen}
      isScrollable
      maxMenuHeight="240px"
      onOpenChange={setIsOpen}
      onSelect={(_e, selected) => toggle(selected as string)}
      toggle={(ref) => (
        <MenuToggle ref={ref} onClick={() => !isDisabled && setIsOpen(!isOpen)} isExpanded={isOpen} isDisabled={isDisabled} className="app-min-w-200">
          {label}
        </MenuToggle>
      )}
    >
      <SelectList>
        {options.map(component => (
          <SelectOption key={component} value={component} hasCheckbox isSelected={selected.has(component)}>
            {component}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
