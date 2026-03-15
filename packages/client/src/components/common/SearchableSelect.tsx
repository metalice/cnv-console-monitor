import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';

export type SearchableSelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type SearchableSelectProps = {
  id: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  noResultsText?: string;
};

const NO_RESULTS_VALUE = '__no_results__';
const MENU_MAX_HEIGHT = 240;

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder,
  isDisabled,
  noResultsText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const normalizedOptions = useMemo(() => {
    const list = [...options];
    if (value && !list.some((opt) => opt.value === value)) {
      list.unshift({ value, label: value });
    }
    return list;
  }, [options, value]);

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption?.label || value || '');
    }
  }, [isOpen, selectedOption, value]);

  const renderOptions = (items: SearchableSelectOption[]) =>
    items.map((opt) => (
      <SelectOption key={opt.value} value={opt.value} isDisabled={opt.isDisabled}>
        {opt.label}
      </SelectOption>
    ));

  const filteredOptions = useMemo(() => {
    const search = filterValue.trim().toLowerCase();
    if (!search) return normalizedOptions;
    return normalizedOptions.filter((opt) => (
      opt.label.toLowerCase().includes(search) || opt.value.toLowerCase().includes(search)
    ));
  }, [filterValue, normalizedOptions]);

  const openMenu = (): void => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const closeMenu = (): void => {
    setIsOpen(false);
    setFilterValue('');
  };

  return (
    <Select
      id={id}
      variant="typeahead"
      isOpen={isOpen}
      selected={value}
      isDisabled={isDisabled}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          openMenu();
        } else {
          closeMenu();
        }
      }}
      onSelect={(_event, selection) => {
        const selected = String(selection || '');
        if (!selected || selected === NO_RESULTS_VALUE) return;
        onChange(selected);
        setInputValue(
          normalizedOptions.find((opt) => opt.value === selected)?.label || selected,
        );
        closeMenu();
      }}
      isScrollable
      maxMenuHeight={`${MENU_MAX_HEIGHT}px`}
      shouldFocusFirstItemOnOpen={false}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          variant="typeahead"
          onClick={openMenu}
          isExpanded={isOpen}
          isDisabled={isDisabled}
          isFullWidth
        >
          <TextInputGroup isDisabled={isDisabled}>
            <TextInputGroupMain
              id={`${id}-input`}
              value={inputValue}
              placeholder={placeholder}
              aria-label={placeholder || 'Filter options'}
              onChange={(_event, val) => {
                setInputValue(val);
                setFilterValue(val);
                openMenu();
              }}
              onClick={openMenu}
            />
            {isOpen && filterValue && (
              <TextInputGroupUtilities>
                <Button
                  variant="plain"
                  aria-label="Clear filter"
                  icon={<TimesIcon />}
                  onClick={() => setFilterValue('')}
                />
              </TextInputGroupUtilities>
            )}
          </TextInputGroup>
        </MenuToggle>
      )}
    >
      <SelectList>
        {filteredOptions.length === 0 ? (
          <SelectOption value={NO_RESULTS_VALUE} isDisabled>
            {noResultsText || 'No results'}
          </SelectOption>
        ) : (
          renderOptions(filteredOptions)
        )}
      </SelectList>
    </Select>
  );
};
