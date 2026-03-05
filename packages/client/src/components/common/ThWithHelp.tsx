import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Th, type ThProps } from '@patternfly/react-table';

type ThWithHelpProps = {
  label: string;
  help: string;
  sort?: ThProps['sort'];
};

export const ThWithHelp: React.FC<ThWithHelpProps> = ({ label, help, sort }) => (
  <Th sort={sort}>
    {label}{' '}
    <Tooltip content={help}>
      <OutlinedQuestionCircleIcon style={{ cursor: 'help', opacity: 0.5, fontSize: 12 }} />
    </Tooltip>
  </Th>
);
