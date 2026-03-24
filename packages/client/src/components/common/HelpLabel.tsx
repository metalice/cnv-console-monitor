import React from 'react';

import { Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type HelpLabelProps = {
  label: string;
  help: string;
};

export const HelpLabel: React.FC<HelpLabelProps> = ({ help, label }) => (
  <span className="app-help-label">
    {label}
    <Popover bodyContent={help}>
      <button aria-label={`More info: ${label}`} className="app-help-label-btn" type="button">
        <HelpIcon />
      </button>
    </Popover>
  </span>
);
