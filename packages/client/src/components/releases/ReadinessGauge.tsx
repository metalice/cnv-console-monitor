import { Tooltip } from '@patternfly/react-core';

const SCORE_THRESHOLD_HIGH = 80;
const SCORE_THRESHOLD_MID = 50;

const getScoreColor = (score: number): string => {
  if (score >= SCORE_THRESHOLD_HIGH) {
    return 'var(--pf-t--global--color--status--success--default)';
  }
  return score >= SCORE_THRESHOLD_MID
    ? 'var(--pf-t--global--color--status--warning--default)'
    : 'var(--pf-t--global--color--status--danger--default)';
};

const ARC_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

type ReadinessGaugeProps = {
  score: number;
};

export const ReadinessGauge = ({ score }: ReadinessGaugeProps) => {
  const color = getScoreColor(score);
  return (
    <Tooltip content={`Readiness score: ${score}%`}>
      <div className="app-readiness-gauge">
        <svg height="64" viewBox="0 0 36 36" width="64">
          <path
            d={ARC_PATH}
            fill="none"
            stroke="var(--pf-t--global--border--color--default)"
            strokeWidth="3"
          />
          <path
            d={ARC_PATH}
            fill="none"
            stroke={color}
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
            strokeWidth="3"
          />
          <text fill={color} fontSize="9" fontWeight="700" textAnchor="middle" x="18" y="21">
            {score}%
          </text>
        </svg>
      </div>
    </Tooltip>
  );
};
