import { type WeeklyPollStatus } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Progress,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, PlayIcon, RedoIcon } from '@patternfly/react-icons';

const STEP_LABELS: Record<string, string> = {
  'ai-mapping': 'Mapping identities with AI',
  'ai-summary': 'Generating AI summaries',
  github: 'Fetching GitHub data',
  gitlab: 'Fetching GitLab data',
  idle: 'Idle',
  jira: 'Fetching Jira tickets',
  saving: 'Saving report',
  sheets: 'Fetching spreadsheet data',
};

type PollProgressProps = {
  isStarting?: boolean;
  onTrigger: () => void;
  status: WeeklyPollStatus;
};

export const PollProgress = ({ isStarting = false, onTrigger, status }: PollProgressProps) => {
  const isRunning = status.status === 'running';
  const isFailed = status.status === 'failed';
  const isCompleted = status.status === 'completed';
  const stepLabel = STEP_LABELS[status.currentStep] ?? status.currentStep;
  const hasLogs = status.logs.length > 0;

  return (
    <Stack hasGutter>
      {isFailed && status.error && (
        <StackItem>
          <Alert isInline title="Report generation failed" variant="danger">
            {status.error}
          </Alert>
        </StackItem>
      )}

      {(isRunning || isStarting) && (
        <StackItem>
          <Progress
            aria-label="Weekly report generation progress"
            className="app-weekly-progress"
            title={stepLabel}
            value={status.progress}
          />
          <Content className="app-text-muted" component="small">
            {stepLabel}
          </Content>
        </StackItem>
      )}

      {(isRunning || isCompleted || isFailed) && hasLogs && (
        <StackItem>
          <ExpandableSection toggleText={`Activity log (${status.logs.length} entries)`}>
            <div className="app-weekly-log">
              {status.logs.map(entry => (
                <div className="app-weekly-log-entry" key={`${entry.timestamp}-${entry.message}`}>
                  <Content className="app-text-muted" component="small">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Content>{' '}
                  <Content component="small">{entry.message}</Content>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </StackItem>
      )}

      {!isRunning && (
        <StackItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
            {isCompleted && (
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <CheckCircleIcon className="app-weekly-check" />
                  </FlexItem>
                  <FlexItem>
                    <Content component="small">Report generated</Content>
                  </FlexItem>
                </Flex>
              </FlexItem>
            )}
            <FlexItem>
              <Button
                icon={isCompleted ? <RedoIcon /> : <PlayIcon />}
                isDisabled={isStarting}
                isLoading={isStarting}
                size="sm"
                variant={isCompleted ? 'secondary' : 'primary'}
                onClick={onTrigger}
              >
                {isCompleted ? 'Regenerate' : 'Generate Report'}
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>
      )}
    </Stack>
  );
};
