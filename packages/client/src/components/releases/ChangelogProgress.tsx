import {
  Content,
  Flex,
  FlexItem,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
} from '@patternfly/react-core';

import type { ChangelogStatus } from '../../api/ai';

const SUMMARIZING_PROGRESS = 95;
const BASE_PROGRESS = 5;
const BATCH_PROGRESS_SCALE = 90;

type ChangelogProgressProps = {
  jobStatus: ChangelogStatus;
};

export const ChangelogProgress = ({ jobStatus }: ChangelogProgressProps) => (
  <div className="app-changelog-progress app-mb-md">
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      className="app-mb-xs"
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem>
        <Content component="small">
          <strong>{jobStatus.progress}</strong>
        </Content>
      </FlexItem>
      <FlexItem>
        <Content className="app-text-muted" component="small">
          {jobStatus.totalIssues ? `${jobStatus.totalIssues.toLocaleString()} issues` : ''}
          {jobStatus.totalBatches
            ? ` · ${jobStatus.currentBatch}/${jobStatus.totalBatches} batches`
            : ''}
          {jobStatus.elapsedSeconds ? ` · ${jobStatus.elapsedSeconds}s` : ''}
        </Content>
      </FlexItem>
    </Flex>
    {jobStatus.totalBatches && jobStatus.totalBatches > 0 ? (
      <Progress
        aria-label="Changelog generation progress"
        measureLocation={ProgressMeasureLocation.outside}
        size={ProgressSize.sm}
        value={
          jobStatus.step === 'summarizing'
            ? SUMMARIZING_PROGRESS
            : jobStatus.currentBatch && jobStatus.totalBatches
              ? Math.round((jobStatus.currentBatch / jobStatus.totalBatches) * BATCH_PROGRESS_SCALE)
              : BASE_PROGRESS
        }
      />
    ) : (
      <Progress aria-label="Loading" size={ProgressSize.sm} value={undefined} />
    )}
    {jobStatus.log && jobStatus.log.length > 0 && (
      <div
        className="app-changelog-log app-mt-sm"
        ref={element => {
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }}
      >
        {jobStatus.log.map((entry, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div className={`app-changelog-log-entry app-changelog-log-${entry.type}`} key={i}>
            <span className="app-changelog-log-time">
              {new Date(entry.time).toLocaleTimeString()}
            </span>
            <span>{entry.message}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);
