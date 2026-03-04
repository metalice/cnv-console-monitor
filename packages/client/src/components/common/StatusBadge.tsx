import React from 'react';
import { Label } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  BanIcon,
} from '@patternfly/react-icons';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'PASSED':
      return <Label color="green" icon={<CheckCircleIcon />}>Passed</Label>;
    case 'FAILED':
      return <Label color="red" icon={<ExclamationCircleIcon />}>Failed</Label>;
    case 'IN_PROGRESS':
      return <Label color="blue" icon={<InProgressIcon />}>In Progress</Label>;
    default:
      return <Label color="grey" icon={<BanIcon />}>{status}</Label>;
  }
};
