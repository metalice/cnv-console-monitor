import React from 'react';

import {
  Button,
  MenuToggle,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';

type SearchableSelectToggleProps = {
  id: string;
  inputValue: string;
  filterValue: string;
  placeholder?: string;
  isOpen: boolean;
  isDisabled?: boolean;
  onInputChange: (value: string) => void;
  onClearFilter: () => void;
  onOpen: () => void;
  toggleRef: React.Ref<HTMLButtonElement>;
};

export const SearchableSelectToggle: React.FC<SearchableSelectToggleProps> = ({
  filterValue,
  id,
  inputValue,
  isDisabled,
  isOpen,
  onClearFilter,
  onInputChange,
  onOpen,
  placeholder,
  toggleRef,
}) => (
  <MenuToggle
    isFullWidth
    isDisabled={isDisabled}
    isExpanded={isOpen}
    ref={toggleRef}
    variant="typeahead"
    onClick={onOpen}
  >
    <TextInputGroup isDisabled={isDisabled}>
      <TextInputGroupMain
        aria-label={placeholder || 'Filter options'}
        id={`${id}-input`}
        placeholder={placeholder}
        value={inputValue}
        onChange={(_event, val) => onInputChange(val)}
        onClick={onOpen}
      />
      {isOpen && filterValue && (
        <TextInputGroupUtilities>
          <Button
            aria-label="Clear filter"
            icon={<TimesIcon />}
            variant="plain"
            onClick={onClearFilter}
          />
        </TextInputGroupUtilities>
      )}
    </TextInputGroup>
  </MenuToggle>
);
