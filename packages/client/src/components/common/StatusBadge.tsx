import React from 'react';

import { Label } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';

type StatusBadgeProps = {
  status: string;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'PASSED':
      return (
        <Label color="green" icon={<CheckCircleIcon />}>
          Passed
        </Label>
      );
    case 'FAILED':
      return (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
    case 'IN_PROGRESS':
      return (
        <Label color="blue" icon={<InProgressIcon />}>
          In Progress
        </Label>
      );
    default:
      return (
        <Label color="grey" icon={<BanIcon />}>
          {status}
        </Label>
      );
  }
};
