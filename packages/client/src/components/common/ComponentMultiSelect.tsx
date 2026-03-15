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
};

export const ComponentMultiSelect: React.FC<ComponentMultiSelectProps> = ({
  id,
  selected,
  options,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const label = useMemo(() => {
    if (selected.size === 0) return 'All Components';
    if (selected.size === 1) return [...selected][0];
    return `${selected.size} components`;
  }, [selected]);

  const toggle = (val: string) => {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val); else next.add(val);
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
      onSelect={(_e, val) => toggle(val as string)}
      toggle={(ref) => (
        <MenuToggle ref={ref} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
          {label}
        </MenuToggle>
      )}
    >
      <SelectList>
        {options.map(comp => (
          <SelectOption key={comp} value={comp} hasCheckbox isSelected={selected.has(comp)}>
            {comp}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
