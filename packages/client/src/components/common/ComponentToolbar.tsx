import React from 'react';

import { Divider, ToolbarItem } from '@patternfly/react-core';

import { useComponentFilter } from '../../context/ComponentFilterContext';

import { ComponentMultiSelect } from './ComponentMultiSelect';

export const ComponentToolbar: React.FC = () => {
  const { availableComponents, selectedComponents, setSelectedComponents } = useComponentFilter();

  if (availableComponents.length === 0) {
    return null;
  }

  return (
    <>
      <ToolbarItem>
        <Divider className="app-divider-vertical" orientation={{ default: 'vertical' }} />
      </ToolbarItem>
      <ToolbarItem>
        <ComponentMultiSelect
          isCompact
          id="global-component-filter"
          options={availableComponents}
          selected={selectedComponents}
          onChange={setSelectedComponents}
        />
      </ToolbarItem>
    </>
  );
};
