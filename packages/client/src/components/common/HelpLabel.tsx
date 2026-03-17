import React from 'react';
import { Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type HelpLabelProps = {
  label: string;
  help: string;
};

export const HelpLabel: React.FC<HelpLabelProps> = ({ label, help }) => (
  <span className="app-help-label">
    {label}
    <Popover bodyContent={help}>
      <button type="button" className="app-help-label-btn" aria-label={`More info: ${label}`}>
        <HelpIcon />
      </button>
    </Popover>
  </span>
);
