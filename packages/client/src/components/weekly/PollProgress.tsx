import { type WeeklyPollStatus } from '@cnv-monitor/shared';

import {
  Alert,
  Content,
  ExpandableSection,
  Progress,
  Stack,
  StackItem,
} from '@patternfly/react-core';

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
  status: WeeklyPollStatus;
};

export const PollProgress = ({ status }: PollProgressProps) => {
  const isRunning = status.status === 'running';
  const isFailed = status.status === 'failed';
  const stepLabel = STEP_LABELS[status.currentStep] ?? status.currentStep;

  if (!isRunning && !isFailed) return null;

  return (
    <Stack hasGutter>
      {isFailed && status.error && (
        <StackItem>
          <Alert isInline title="Report generation failed" variant="danger">
            {status.error}
          </Alert>
        </StackItem>
      )}

      {isRunning && (
        <StackItem>
          <Progress
            aria-label="Report generation progress"
            className="app-weekly-progress"
            title={stepLabel}
            value={status.progress}
          />
        </StackItem>
      )}

      {isRunning && status.logs.length > 0 && (
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
    </Stack>
  );
};
