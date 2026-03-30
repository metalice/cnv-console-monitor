import { useState } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import { Alert, Button, Content, Flex, FlexItem, Label } from '@patternfly/react-core';
import { useMutation } from '@tanstack/react-query';

import { assessRisk, type RiskAssessment } from '../../api/ai';

const MAX_OPEN_ITEMS = 20;
const TREND_DAYS = 7;

const verdictColor = (verdict?: string) =>
  verdict === 'Ship' ? 'green' : verdict === 'Hold' ? 'red' : 'orange';

const riskColor = (risk?: string) =>
  risk === 'Low' ? 'green' : risk === 'High' || risk === 'Critical' ? 'red' : 'orange';

type RiskTabProps = {
  version: string;
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
  readiness?: {
    passRate: number | null;
    totalLaunches: number;
    trend: { day: string; passRate: number | null }[];
  } | null;
};

export const RiskTab = ({ checklist, readiness, release, version }: RiskTabProps) => {
  const [result, setResult] = useState<RiskAssessment | null>(null);
  const openItems = (checklist ?? []).filter(task => task.status !== 'Closed');
  const closedItems = (checklist ?? []).filter(task => task.status === 'Closed');
  const total = (checklist ?? []).length;

  const mutation = useMutation({
    mutationFn: () =>
      assessRisk({
        checklistDone: closedItems.length,
        checklistPct: total > 0 ? Math.round((closedItems.length / total) * 100) : 100,
        checklistTotal: total,
        daysUntilRelease: release.daysUntilNext,
        openBlockers: 0,
        openItems: openItems.slice(0, MAX_OPEN_ITEMS).map(task => ({
          assignee: task.assignee,
          key: task.key,
          priority: task.priority,
          summary: task.summary,
        })),
        passRate: readiness?.passRate ?? 0,
        totalLaunches: readiness?.totalLaunches ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
        trend: readiness?.trend?.slice(-TREND_DAYS) ?? [],
        version: version.replace('cnv-', ''),
      }),
    onSuccess: setResult,
  });

  if (!result) {
    return (
      <div className="app-mt-md app-text-block-center app-p-lg">
        <Content className="app-text-muted app-mb-md" component="p">
          AI will analyze checklist progress, pass rates, open blockers, and trends to assess
          release readiness.
        </Content>
        <Button isLoading={mutation.isPending} variant="primary" onClick={() => mutation.mutate()}>
          Assess Release Risk
        </Button>
        {mutation.isError && (
          <Alert
            isInline
            className="app-mt-md"
            title={mutation.error instanceof Error ? mutation.error.message : 'Failed'}
            variant="danger"
          />
        )}
      </div>
    );
  }

  const { assessment } = result;
  return (
    <div className="app-mt-md">
      <Flex className="app-mb-md" justifyContent={{ default: 'justifyContentSpaceBetween' }}>
        <FlexItem>
          <Label className="app-mr-sm" color={verdictColor(assessment.verdict)}>
            {assessment.verdict || 'Unknown'}
          </Label>
          <Label isCompact color={riskColor(assessment.overallRisk)}>
            Risk: {assessment.overallRisk}
          </Label>
          <span className="app-text-xs app-text-muted app-ml-sm">
            {result.model}
            {result.cached ? ' (cached)' : ''}
          </span>
        </FlexItem>
        <FlexItem>
          <Button
            size="sm"
            variant="link"
            onClick={() => {
              setResult(null);
              mutation.mutate();
            }}
          >
            Re-assess
          </Button>
        </FlexItem>
      </Flex>
      {assessment.summary && (
        <Content className="app-mb-md" component="p">
          {assessment.summary}
        </Content>
      )}
      {assessment.concerns && assessment.concerns.length > 0 && (
        <div className="app-mb-md">
          <Content component="h5">Concerns</Content>
          {assessment.concerns.map(concern => (
            <Alert
              isInline
              isPlain
              className="app-mb-xs"
              key={concern.area}
              title={`${concern.area}: ${concern.detail}`}
              variant={concern.severity === 'high' ? 'danger' : 'warning'}
            />
          ))}
        </div>
      )}
      {assessment.recommendations && assessment.recommendations.length > 0 && (
        <div>
          <Content component="h5">Recommendations</Content>
          <ul className="app-text-xs">
            {assessment.recommendations.map((rec, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
      {assessment.raw && !assessment.verdict && (
        <pre className="app-ack-notes">{assessment.raw}</pre>
      )}
    </div>
  );
};
