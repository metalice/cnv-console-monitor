import { ArrowDownIcon, ArrowUpIcon } from '@patternfly/react-icons';

type DeltaStatProps = {
  label: string;
  prev?: number;
  value: number;
};

export const DeltaStat = ({ label, prev, value }: DeltaStatProps) => {
  const diff = prev != null ? value - prev : 0;
  return (
    <div className="app-digest-stat">
      <span className="app-digest-value">{value.toLocaleString()}</span>
      <span className="app-text-xs app-text-muted">{label}</span>
      {prev != null && diff !== 0 && (
        <span className={`app-text-xs ${diff > 0 ? 'app-text-success' : 'app-text-danger'}`}>
          {diff > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />} {Math.abs(diff)}
        </span>
      )}
    </div>
  );
};
