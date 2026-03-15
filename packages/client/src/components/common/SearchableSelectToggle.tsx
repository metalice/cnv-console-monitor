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
  id, inputValue, filterValue, placeholder, isOpen, isDisabled,
  onInputChange, onClearFilter, onOpen, toggleRef,
}) => (
  <MenuToggle ref={toggleRef} variant="typeahead" onClick={onOpen} isExpanded={isOpen} isDisabled={isDisabled} isFullWidth>
    <TextInputGroup isDisabled={isDisabled}>
      <TextInputGroupMain
        id={`${id}-input`}
        value={inputValue}
        placeholder={placeholder}
        aria-label={placeholder || 'Filter options'}
        onChange={(_event, val) => onInputChange(val)}
        onClick={onOpen}
      />
      {isOpen && filterValue && (
        <TextInputGroupUtilities>
          <Button variant="plain" aria-label="Clear filter" icon={<TimesIcon />} onClick={onClearFilter} />
        </TextInputGroupUtilities>
      )}
    </TextInputGroup>
  </MenuToggle>
);
