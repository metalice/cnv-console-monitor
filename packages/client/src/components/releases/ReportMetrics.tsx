import { Progress, ProgressMeasureLocation, ProgressSize } from '@patternfly/react-core';

type ReportMetricsProps = {
  checklistPct: number;
  passRate: number | null;
  daysUntilNext: number | null;
  openItemCount: number;
};

export const ReportMetrics = ({
  checklistPct,
  daysUntilNext,
  openItemCount,
  passRate,
}: ReportMetricsProps) => (
  <div className="app-report-metrics app-mb-md">
    <div className="app-report-metric">
      <span className="app-report-metric-value">{checklistPct}%</span>
      <span className="app-text-xs app-text-muted">Checklist</span>
      <Progress
        className="app-mt-xs"
        measureLocation={ProgressMeasureLocation.none}
        size={ProgressSize.sm}
        value={checklistPct}
      />
    </div>
    <div className="app-report-metric">
      <span className="app-report-metric-value">{passRate !== null ? `${passRate}%` : '--'}</span>
      <span className="app-text-xs app-text-muted">Pass Rate</span>
      {passRate !== null && (
        <Progress
          className="app-mt-xs"
          measureLocation={ProgressMeasureLocation.none}
          size={ProgressSize.sm}
          value={passRate}
        />
      )}
    </div>
    <div className="app-report-metric">
      <span className="app-report-metric-value">{daysUntilNext ?? '--'}</span>
      <span className="app-text-xs app-text-muted">Days Left</span>
    </div>
    <div className="app-report-metric">
      <span className="app-report-metric-value">{openItemCount}</span>
      <span className="app-text-xs app-text-muted">Open Items</span>
    </div>
  </div>
);
