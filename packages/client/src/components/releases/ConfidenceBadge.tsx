import { Label, Tooltip } from '@patternfly/react-core';

const HIGH_CONFIDENCE = 90;
const LOW_CONFIDENCE = 70;

type ConfidenceBadgeProps = {
  confidence?: number;
  reason?: string;
};

export const ConfidenceBadge = ({ confidence, reason }: ConfidenceBadgeProps) => {
  if (confidence == null) {
    return null;
  }
  const pct = Math.round(confidence * 100);
  const color = pct >= HIGH_CONFIDENCE ? 'green' : pct >= LOW_CONFIDENCE ? 'grey' : 'orange';
  return (
    <Tooltip content={reason || `Confidence: ${pct}%`}>
      <Label isCompact className="app-ml-xs" color={color}>
        {pct}%{pct < LOW_CONFIDENCE ? ' ⚠' : ''}
      </Label>
    </Tooltip>
  );
};
