import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Th, type ThProps } from '@patternfly/react-table';

type ThWithHelpProps = {
  label: string;
  help: string;
  sort?: ThProps['sort'];
  width?: ThProps['width'];
};

export const ThWithHelp: React.FC<ThWithHelpProps> = ({ label, help, sort, width }) => (
  <Th sort={sort} width={width}>
    {label}{' '}
    <Tooltip content={help}>
      <OutlinedQuestionCircleIcon className="app-help-icon" />
    </Tooltip>
  </Th>
);
