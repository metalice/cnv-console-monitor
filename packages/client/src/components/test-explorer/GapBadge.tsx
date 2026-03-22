import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon, InfoCircleIcon } from '@patternfly/react-icons';

interface GapBadgeProps {
  hasCounterpart?: boolean;
  type: 'doc' | 'test' | string;
}

export const GapBadge: React.FC<GapBadgeProps> = ({ hasCounterpart, type }) => {
  if (hasCounterpart) {
    return (
      <Tooltip content="This file has a matching counterpart (doc ↔ test)">
        <Label color="green" icon={<CheckCircleIcon />} isCompact>Matched</Label>
      </Tooltip>
    );
  }

  if (type === 'doc') {
    return (
      <Tooltip content="This documentation file has no matching test file">
        <Label color="orange" icon={<ExclamationTriangleIcon />} isCompact>No test</Label>
      </Tooltip>
    );
  }

  if (type === 'test') {
    return (
      <Tooltip content="This test file has no matching documentation">
        <Label color="blue" icon={<InfoCircleIcon />} isCompact>No doc</Label>
      </Tooltip>
    );
  }

  return null;
};
