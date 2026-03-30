import type { ChecklistTask } from '@cnv-monitor/shared';

import {
  Content,
  Divider,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
} from '@patternfly/react-core';

type ReportOpenItemsProps = {
  byPriority: [string, ChecklistTask[]][];
  byAssignee: [string, number][];
  openItemCount: number;
};

const priorityColor = (priority: string): 'grey' | 'orange' | 'red' =>
  priority === 'Blocker' || priority === 'Critical'
    ? 'red'
    : priority === 'Major'
      ? 'orange'
      : 'grey';

export const ReportOpenItems = ({
  byAssignee,
  byPriority,
  openItemCount,
}: ReportOpenItemsProps) => (
  <>
    <Divider className="app-mb-md" />
    <Content className="app-mb-sm" component="h4">
      Open Items by Priority
    </Content>
    {byPriority.map(([priority, items]) => (
      <div className="app-mb-sm" key={priority}>
        <Content className="app-mb-xs" component="h5">
          <Label isCompact color={priorityColor(priority)}>
            {priority}
          </Label>
          <span className="app-text-xs app-text-muted app-ml-sm">({items.length})</span>
        </Content>
        {items.map(task => (
          <div className="app-report-item" key={task.key}>
            <a
              className="app-report-key"
              href={`https://issues.redhat.com/browse/${task.key}`}
              rel="noreferrer"
              target="_blank"
            >
              {task.key}
            </a>
            <span className="app-report-title">{task.summary}</span>
            <span className="app-text-xs app-text-muted">{task.assignee || 'Unassigned'}</span>
          </div>
        ))}
      </div>
    ))}
    <Divider className="app-mb-md app-mt-md" />
    <Content className="app-mb-sm" component="h4">
      Workload Distribution
    </Content>
    <div className="app-report-workload">
      {byAssignee.map(([name, count]) => (
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          className="app-mb-xs"
          key={name}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem className="app-report-assignee-name">
            <span className="app-text-xs">{name}</span>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Progress
              measureLocation={ProgressMeasureLocation.none}
              size={ProgressSize.sm}
              value={(count / openItemCount) * 100}
            />
          </FlexItem>
          <FlexItem>
            <span className="app-text-xs app-text-muted">{count}</span>
          </FlexItem>
        </Flex>
      ))}
    </div>
  </>
);
