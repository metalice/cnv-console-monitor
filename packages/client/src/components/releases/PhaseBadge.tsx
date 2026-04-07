import { Label } from '@patternfly/react-core';

import { phaseColor } from './phaseUtils';

type PhaseBadgeProps = {
  phase: string;
  isCompact?: boolean;
};

export const PhaseBadge = ({ isCompact = true, phase }: PhaseBadgeProps) => (
  <Label color={phaseColor(phase)} isCompact={isCompact}>
    {phase}
  </Label>
);
