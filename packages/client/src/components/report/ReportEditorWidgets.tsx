import { type AggregateStats, type ReportState } from '@cnv-monitor/shared';

import {
  Alert,
  AlertGroup,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  ProgressStep,
  ProgressStepper,
} from '@patternfly/react-core';

import { formatTimestamp, STAT_ITEMS } from './reportEditorUtils';

const STEP_ORDER: ReportState[] = ['DRAFT', 'FINALIZED', 'SENT'];

const STEP_LABELS: Record<ReportState, string> = {
  DRAFT: 'Draft',
  FINALIZED: 'Finalized',
  SENT: 'Sent',
};

const getStepVariant = (step: ReportState, current: ReportState) => {
  const currentIdx = STEP_ORDER.indexOf(current);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return 'success' as const;
  if (stepIdx === currentIdx) return current === 'SENT' ? ('success' as const) : ('info' as const);
  return 'pending' as const;
};

export const ReportProgressStepper = ({ state }: { state: ReportState }) => (
  <ProgressStepper>
    {STEP_ORDER.map(step => (
      <ProgressStep
        id={step}
        isCurrent={step === state}
        key={step}
        titleId={step}
        variant={getStepVariant(step, state)}
      >
        {STEP_LABELS[step]}
      </ProgressStep>
    ))}
  </ProgressStepper>
);

const SPARKLINE_W = 80;
const SPARKLINE_H = 24;

const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const step = SPARKLINE_W / (data.length - 1);
  const points = data
    .map((val, idx) => `${idx * step},${SPARKLINE_H - (val / max) * SPARKLINE_H}`)
    .join(' ');
  return (
    <svg
      className="app-sparkline"
      height={SPARKLINE_H}
      viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
      width={SPARKLINE_W}
    >
      <polyline
        fill="none"
        points={points}
        stroke="var(--pf-t--global--color--brand--default)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

const formatDelta = (delta: number) => {
  if (delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'app-text-success' : 'app-text-danger';
  return (
    <span className={`app-text-xs ${color}`}>
      {sign}
      {delta}
    </span>
  );
};

type ReportAggregateStatsProps = {
  previousStats?: AggregateStats | null;
  sparklineData?: Map<keyof AggregateStats, number[]>;
  stats: AggregateStats;
};

export const ReportAggregateStats = ({
  previousStats,
  sparklineData,
  stats,
}: ReportAggregateStatsProps) => (
  <Flex spaceItems={{ default: 'spaceItemsLg' }}>
    {STAT_ITEMS.map(({ key, label }) => {
      const delta = previousStats ? stats[key] - previousStats[key] : null;
      const trend = sparklineData?.get(key);
      return (
        <FlexItem key={key}>
          <Card isCompact isPlain>
            <CardBody className="app-text-center">
              <Content component="p">
                <strong>{stats[key]}</strong>
                {delta !== null && delta !== 0 && <> {formatDelta(delta)}</>}
              </Content>
              <Content className="app-text-muted" component="small">
                {label}
              </Content>
              {trend && trend.length >= 2 && (
                <div className="app-mt-xs">
                  <Sparkline data={trend} />
                </div>
              )}
            </CardBody>
          </Card>
        </FlexItem>
      );
    })}
  </Flex>
);

export const ReportWarnings = ({ warnings }: { warnings: string[] }) => {
  if (warnings.length === 0) return null;
  return (
    <AlertGroup>
      {warnings.map(warning => (
        <Alert isInline isPlain key={warning} title={warning} variant="warning" />
      ))}
    </AlertGroup>
  );
};

type ReportAuditTrailProps = {
  createdAt: string | null | undefined;
  sentAt: string | null | undefined;
  state: ReportState;
  updatedAt: string | null | undefined;
};

export const ReportAuditTrail = ({
  createdAt,
  sentAt,
  state,
  updatedAt,
}: ReportAuditTrailProps) => (
  <ExpandableSection toggleText="Report History">
    <DescriptionList isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>Generated</DescriptionListTerm>
        <DescriptionListDescription>{formatTimestamp(createdAt)}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Last Updated</DescriptionListTerm>
        <DescriptionListDescription>{formatTimestamp(updatedAt)}</DescriptionListDescription>
      </DescriptionListGroup>
      {(state === 'FINALIZED' || state === 'SENT') && (
        <DescriptionListGroup>
          <DescriptionListTerm>Finalized</DescriptionListTerm>
          <DescriptionListDescription>{formatTimestamp(updatedAt)}</DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {state === 'SENT' && (
        <DescriptionListGroup>
          <DescriptionListTerm>Sent</DescriptionListTerm>
          <DescriptionListDescription>{formatTimestamp(sentAt)}</DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  </ExpandableSection>
);
