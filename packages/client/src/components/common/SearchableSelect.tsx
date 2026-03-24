import React, { useEffect, useMemo, useState } from 'react';

import { Select, SelectList, SelectOption } from '@patternfly/react-core';

import { SearchableSelectToggle } from './SearchableSelectToggle';

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
  isDisabled,
  noResultsText,
  onChange,
  options,
  placeholder,
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const normalizedOptions = useMemo(() => {
    const list = [...options];
    if (value && !list.some(opt => opt.value === value)) {
      list.unshift({ label: value, value });
    }
    return list;
  }, [options, value]);

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption?.label || value || '');
    }
  }, [isOpen, selectedOption, value]);

  const filteredOptions = useMemo(() => {
    const search = filterValue.trim().toLowerCase();
    if (!search) {
      return normalizedOptions;
    }
    return normalizedOptions.filter(
      opt => opt.label.toLowerCase().includes(search) || opt.value.toLowerCase().includes(search),
    );
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

  const handleInputChange = (val: string): void => {
    setInputValue(val);
    setFilterValue(val);
    openMenu();
  };

  return (
    <Select
      isScrollable
      id={id}
      isOpen={isOpen}
      maxMenuHeight={`${MENU_MAX_HEIGHT}px`}
      selected={value}
      shouldFocusFirstItemOnOpen={false}
      // eslint-disable-next-line react/no-unstable-nested-components
      toggle={toggleRef => (
        <SearchableSelectToggle
          filterValue={filterValue}
          id={id}
          inputValue={inputValue}
          isDisabled={isDisabled}
          isOpen={isOpen}
          placeholder={placeholder}
          toggleRef={toggleRef}
          onClearFilter={() => setFilterValue('')}
          onInputChange={handleInputChange}
          onOpen={openMenu}
        />
      )}
      variant="typeahead"
      onOpenChange={nextOpen => {
        if (nextOpen) {
          openMenu();
        } else {
          closeMenu();
        }
      }}
      onSelect={(_event, selection) => {
        const selected = String(selection || '');
        if (!selected || selected === NO_RESULTS_VALUE) {
          return;
        }
        onChange(selected);
        setInputValue(normalizedOptions.find(opt => opt.value === selected)?.label || selected);
        closeMenu();
      }}
    >
      <SelectList>
        {filteredOptions.length === 0 ? (
          <SelectOption isDisabled value={NO_RESULTS_VALUE}>
            {noResultsText || 'No results'}
          </SelectOption>
        ) : (
          filteredOptions.map(opt => (
            <SelectOption isDisabled={opt.isDisabled} key={opt.value} value={opt.value}>
              {opt.label}
            </SelectOption>
          ))
        )}
      </SelectList>
    </Select>
  );
};
