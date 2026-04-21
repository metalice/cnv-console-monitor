import {
  type JobInsightFailure,
  type JobInsightPeerDebate,
  type JobInsightResult,
} from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CodeIcon,
  ExclamationTriangleIcon,
  MagicIcon,
  RedoIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';

import { type JobInsightProgressEntry, useJobInsight } from '../../hooks/useJobInsight';

const PHASE_LABELS: Record<string, string> = {
  analyzing: 'Analyzing build...',
  analyzing_failures: 'Analyzing failures...',
  completed: 'Analysis complete',
  queued: 'Queued...',
  waiting_for_jenkins: 'Waiting for Jenkins...',
};

const getPhaseLabel = (phase: string): string => {
  if (PHASE_LABELS[phase]) {
    return PHASE_LABELS[phase];
  }
  return phase.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const classificationColor = (
  classification: string,
): 'red' | 'orange' | 'yellow' | 'blue' | 'grey' => {
  const lower = classification.toLowerCase();
  if (lower.includes('code') || lower.includes('product')) return 'red';
  if (lower.includes('infra') || lower.includes('system')) return 'orange';
  if (lower.includes('flaky')) return 'yellow';
  return 'blue';
};

const formatTimestamp = (epochSeconds: number): string => {
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const extractGroupProgress = (phase?: string): { current: number; total: number } | null => {
  if (!phase) return null;
  const match = /\(group (\d+)\/(\d+)\)/.exec(phase);
  if (!match) return null;
  return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
};

const ProgressIndicator = ({
  phase,
  progressLog,
}: {
  phase?: string;
  progressLog?: JobInsightProgressEntry[];
}) => {
  const groupProgress = extractGroupProgress(phase);
  const logLength = progressLog?.length ?? 0;
  const percent = groupProgress
    ? Math.max(10, Math.round((groupProgress.current / groupProgress.total) * 100))
    : Math.max(5, Math.min(90, logLength * 15));

  return (
    <Stack hasGutter>
      <StackItem>
        <Progress measureLocation={ProgressMeasureLocation.top} value={percent} />
      </StackItem>
      {progressLog && progressLog.length > 0 && (
        <StackItem>
          <div className="app-job-insight-log">
            <Stack>
              {progressLog.map(entry => {
                const phaseLabel = getPhaseLabel(entry.phase);
                const isCurrent = entry.phase === phase;
                return (
                  <StackItem key={`${entry.phase}-${entry.timestamp}`}>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                      <FlexItem>
                        {isCurrent ? (
                          <Spinner size="sm" />
                        ) : (
                          <CheckCircleIcon className="pf-v6-u-color-200" />
                        )}
                      </FlexItem>
                      <FlexItem>
                        <Content className={isCurrent ? '' : 'app-text-muted'} component="small">
                          {phaseLabel}
                        </Content>
                      </FlexItem>
                      <FlexItem>
                        <Content className="app-text-muted" component="small">
                          {formatTimestamp(entry.timestamp)}
                        </Content>
                      </FlexItem>
                    </Flex>
                  </StackItem>
                );
              })}
            </Stack>
          </div>
        </StackItem>
      )}
    </Stack>
  );
};

const CodeFixSection = ({
  codeFix,
}: {
  codeFix: { file: string; line: string; change: string };
}) => (
  <ExpandableSection isIndented toggleText="Suggested Code Fix">
    <DescriptionList isCompact isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>File</DescriptionListTerm>
        <DescriptionListDescription>
          <Label isCompact color="blue" icon={<CodeIcon />}>
            {codeFix.file}:{codeFix.line}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
    <pre className="app-text-xs app-ack-notes app-mt-sm">{codeFix.change}</pre>
  </ExpandableSection>
);

const PeerDebateSection = ({ debate }: { debate: JobInsightPeerDebate }) => (
  <ExpandableSection isIndented toggleText="Peer AI Review">
    <Flex className="app-mb-sm" gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Label
          isCompact
          color={debate.consensus_reached ? 'green' : 'orange'}
          icon={debate.consensus_reached ? <CheckCircleIcon /> : <ExclamationTriangleIcon />}
        >
          {debate.consensus_reached ? 'Consensus reached' : 'No consensus'}
        </Label>
      </FlexItem>
      <FlexItem>
        <Label isCompact color="grey">
          {debate.rounds_used}/{debate.max_rounds} rounds
        </Label>
      </FlexItem>
      <FlexItem>
        <Label isCompact color="grey">
          {debate.ai_configs.length} models
        </Label>
      </FlexItem>
    </Flex>
    {debate.rounds.map(round => (
      <ExpandableSection
        isIndented
        key={`${round.ai_provider}-${round.ai_model}-${round.round}-${round.role}`}
        toggleText={`${round.ai_provider}/${round.ai_model} (${round.role})`}
      >
        <Label isCompact className="app-mb-sm" color={classificationColor(round.classification)}>
          {round.classification}
        </Label>
        {round.agrees_with_orchestrator !== undefined && (
          <Label
            isCompact
            className="app-ml-sm"
            color={round.agrees_with_orchestrator ? 'green' : 'orange'}
          >
            {round.agrees_with_orchestrator ? 'Agrees' : 'Disagrees'}
          </Label>
        )}
        <Content className="app-text-xs app-mt-sm" component="p">
          {round.details}
        </Content>
      </ExpandableSection>
    ))}
  </ExpandableSection>
);

const FailureCard = ({ failure }: { failure: JobInsightFailure }) => {
  const shortName = failure.test_name.split('.').pop() ?? failure.test_name;

  return (
    <Card isCompact className="app-mb-md">
      <CardHeader>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h4">{shortName}</Content>
          </FlexItem>
          <FlexItem>
            <Label isCompact color={classificationColor(failure.analysis.classification)}>
              {failure.analysis.classification}
            </Label>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Label isCompact color="red">
              {failure.error}
            </Label>
          </StackItem>
          <StackItem>
            <ExpandableSection isIndented toggleText="Root Cause Analysis">
              <Content className="app-text-xs" component="p">
                {failure.analysis.details}
              </Content>
            </ExpandableSection>
          </StackItem>
          {failure.analysis.code_fix && (
            <StackItem>
              <CodeFixSection codeFix={failure.analysis.code_fix} />
            </StackItem>
          )}
          {failure.analysis.artifacts_evidence && (
            <StackItem>
              <ExpandableSection isIndented toggleText="Log Evidence">
                <pre className="app-text-xs app-ack-notes">
                  {failure.analysis.artifacts_evidence}
                </pre>
              </ExpandableSection>
            </StackItem>
          )}
          {failure.peer_debate && (
            <StackItem>
              <PeerDebateSection debate={failure.peer_debate} />
            </StackItem>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

const ResultsView = ({ result }: { result: JobInsightResult }) => (
  <Stack hasGutter>
    <StackItem>
      <Flex gap={{ default: 'gapSm' }}>
        <FlexItem>
          <Label isCompact color="blue">
            {result.ai_provider}/{result.ai_model}
          </Label>
        </FlexItem>
        <FlexItem>
          <Label isCompact color="grey">
            {result.summary}
          </Label>
        </FlexItem>
      </Flex>
    </StackItem>
    {result.failures.map(failure => (
      <StackItem key={failure.error_signature}>
        <FailureCard failure={failure} />
      </StackItem>
    ))}
  </Stack>
);

type JobInsightPanelProps = {
  launchRpId: number;
};

export const JobInsightPanel = ({ launchRpId }: JobInsightPanelProps) => {
  const insight = useJobInsight(launchRpId);

  const isRunning = insight.status === 'queued' || insight.status === 'running';
  const canAnalyze = insight.hasArtifactsUrl;

  return (
    <Card>
      <CardHeader>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <CardTitle>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <MagicIcon />
                </FlexItem>
                <FlexItem>AI Deep Analysis</FlexItem>
                {insight.status && (
                  <FlexItem>
                    <Label
                      isCompact
                      color={
                        insight.status === 'completed'
                          ? 'green'
                          : insight.status === 'failed'
                            ? 'red'
                            : 'blue'
                      }
                    >
                      {insight.status}
                    </Label>
                  </FlexItem>
                )}
              </Flex>
            </CardTitle>
          </FlexItem>
          <FlexItem>
            <Flex gap={{ default: 'gapSm' }}>
              {!insight.exists && !isRunning && (
                <FlexItem>
                  <Button
                    icon={<MagicIcon />}
                    isDisabled={!canAnalyze}
                    isLoading={insight.analyze.isPending}
                    size="sm"
                    variant="primary"
                    onClick={() => insight.analyze.mutate()}
                  >
                    Run Deep Analysis
                  </Button>
                </FlexItem>
              )}
              {insight.exists && !isRunning && (
                <FlexItem>
                  <Button
                    icon={<RedoIcon />}
                    isLoading={insight.regenerate.isPending}
                    size="sm"
                    variant="secondary"
                    onClick={() => insight.regenerate.mutate()}
                  >
                    Regenerate
                  </Button>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        {insight.isLoading && <Spinner size="md" />}

        {insight.analyze.isError && (
          <Alert isInline title="Failed to trigger analysis" variant="danger">
            {insight.analyze.error.message}
          </Alert>
        )}

        {insight.regenerate.isError && (
          <Alert isInline title="Failed to regenerate analysis" variant="danger">
            {insight.regenerate.error.message}
          </Alert>
        )}

        {isRunning && (
          <ProgressIndicator phase={insight.progressPhase} progressLog={insight.progressLog} />
        )}

        {insight.status === 'failed' && (
          <Alert isInline title="Analysis failed" variant="warning">
            The external analysis service returned an error. You can try regenerating.
          </Alert>
        )}

        {insight.result && <ResultsView result={insight.result} />}

        {!canAnalyze && !insight.exists && !insight.isLoading && (
          <Content className="app-text-muted" component="small">
            <SyncAltIcon className="app-mr-xs" />
            This launch has no Jenkins artifacts URL. Deep analysis requires a linked Jenkins build.
          </Content>
        )}

        {canAnalyze && !insight.exists && !isRunning && !insight.isLoading && (
          <Content className="app-text-muted" component="small">
            <SyncAltIcon className="app-mr-xs" />
            Run AI Deep Analysis to get root cause analysis, code fix suggestions, and multi-model
            peer review for failures in this launch.
          </Content>
        )}

        {insight.triggeredBy && insight.exists && (
          <Content className="app-text-muted app-mt-sm" component="small">
            Triggered by {insight.triggeredBy}
          </Content>
        )}
      </CardBody>
    </Card>
  );
};
