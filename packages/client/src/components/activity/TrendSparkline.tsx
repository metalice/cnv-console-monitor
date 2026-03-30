const SPARKLINE_DAYS = 30;

type TrendSparklineProps = {
  dates: string[];
};

export const TrendSparkline = ({ dates }: TrendSparklineProps) => {
  const set = new Set(dates);
  const today = new Date();
  const dots: boolean[] = [];
  for (let i = SPARKLINE_DAYS - 1; i >= 0; i--) {
    const dayDate = new Date(today);
    dayDate.setDate(dayDate.getDate() - i);
    dots.push(set.has(dayDate.toISOString().split('T')[0]));
  }
  return (
    <svg className="app-sparkline" height="12" viewBox="0 0 60 12" width="60">
      {dots.map((active, i) => (
        <circle
          cx={i * 2 + 1}
          cy={6}
          fill={
            active
              ? 'var(--pf-t--global--color--status--success--default)'
              : 'var(--pf-t--global--border--color--default)'
          }
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          r={0.8}
        />
      ))}
    </svg>
  );
};
