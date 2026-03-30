import { HelpLabel } from '../common/HelpLabel';

const PASS_RATE_THRESHOLD = 85;

type TrendPoint = {
  day: string;
  passRate: number | null;
};

type PassRateTrendProps = {
  trend: TrendPoint[];
};

export const PassRateTrend = ({ trend }: PassRateTrendProps) => {
  if (trend.length === 0) {
    return null;
  }
  const maxIdx = Math.max(trend.length - 1, 1);

  return (
    <div>
      <HelpLabel
        help="Daily test pass rate for this version. Green dots are ≥85%, yellow dots are below."
        label="Pass rate trend (14 days)"
      />
      <svg className="app-trend-chart" viewBox="0 0 200 40">
        {trend.map((point, idx) => {
          const x = (idx / maxIdx) * 196 + 2;
          const y = point.passRate !== null ? 38 - (point.passRate / 100) * 36 : 38;
          const color =
            point.passRate !== null && point.passRate >= PASS_RATE_THRESHOLD
              ? 'var(--pf-t--global--color--status--success--default)'
              : 'var(--pf-t--global--color--status--warning--default)';
          // eslint-disable-next-line react/no-array-index-key
          return <circle cx={x} cy={y} fill={color} key={idx} r={2.5} />;
        })}
        <polyline
          fill="none"
          opacity="0.5"
          points={trend
            .map((point, idx) => {
              const x = (idx / maxIdx) * 196 + 2;
              const y = point.passRate !== null ? 38 - (point.passRate / 100) * 36 : 38;
              return `${x},${y}`;
            })
            .join(' ')}
          stroke="var(--pf-t--global--color--brand--default)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};
