import React from 'react';
import { Label } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

interface GapBadgeProps {
  hasCounterpart?: boolean;
  type: 'doc' | 'test' | string;
}

export const GapBadge: React.FC<GapBadgeProps> = ({ hasCounterpart, type }) => {
  if (hasCounterpart) {
    return <Label color="green" icon={<CheckCircleIcon />} isCompact>Matched</Label>;
  }

  if (type === 'doc') {
    return <Label color="orange" icon={<ExclamationTriangleIcon />} isCompact>No test</Label>;
  }

  if (type === 'test') {
    return <Label color="blue" icon={<ExclamationTriangleIcon />} isCompact>No doc</Label>;
  }

  return null;
};
