import React from 'react';

import { Label, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon, InfoCircleIcon } from '@patternfly/react-icons';

type GapBadgeProps = {
  hasCounterpart?: boolean;
  type: string;
};

export const GapBadge: React.FC<GapBadgeProps> = ({ hasCounterpart, type }) => {
  if (hasCounterpart) {
    return (
      <Tooltip content="This file has a matching counterpart (doc ↔ test)">
        <Label isCompact color="green" icon={<CheckCircleIcon />}>
          Matched
        </Label>
      </Tooltip>
    );
  }

  if (type === 'doc') {
    return (
      <Tooltip content="This documentation file has no matching test file">
        <Label isCompact color="orange" icon={<ExclamationTriangleIcon />}>
          No test
        </Label>
      </Tooltip>
    );
  }

  if (type === 'test') {
    return (
      <Tooltip content="This test file has no matching documentation">
        <Label isCompact color="blue" icon={<InfoCircleIcon />}>
          No doc
        </Label>
      </Tooltip>
    );
  }

  return null;
};
