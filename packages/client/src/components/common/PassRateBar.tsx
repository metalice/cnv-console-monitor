import React from 'react';
import { Progress, ProgressMeasureLocation } from '@patternfly/react-core';

interface PassRateBarProps {
  rate: number;
}

export const PassRateBar: React.FC<PassRateBarProps> = ({ rate }) => {
  const variant = rate >= 95 ? 'success' as const : rate >= 80 ? 'warning' as const : 'danger' as const;

  return (
    <Progress
      value={rate}
      title={`${rate}%`}
      variant={variant}
      measureLocation={ProgressMeasureLocation.outside}
      style={{ minWidth: 120 }}
    />
  );
};
