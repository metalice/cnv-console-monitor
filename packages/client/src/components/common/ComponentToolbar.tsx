import React from 'react';
import { Divider, ToolbarItem } from '@patternfly/react-core';
import { useComponentFilter } from '../../context/ComponentFilterContext';
import { ComponentMultiSelect } from './ComponentMultiSelect';

export const ComponentToolbar: React.FC = () => {
  const { selectedComponents, setSelectedComponents, availableComponents } = useComponentFilter();

  if (availableComponents.length === 0) return null;

  return (
    <>
      <ToolbarItem>
        <Divider orientation={{ default: 'vertical' }} className="app-divider-vertical" />
      </ToolbarItem>
      <ToolbarItem>
        <ComponentMultiSelect
          id="global-component-filter"
          selected={selectedComponents}
          options={availableComponents}
          onChange={setSelectedComponents}
          isCompact
        />
      </ToolbarItem>
    </>
  );
};
