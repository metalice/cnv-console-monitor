import { useMemo } from 'react';

import type { ChecklistTask } from '@cnv-monitor/shared';

import { Content } from '@patternfly/react-core';

const MAX_ASSIGNEES = 8;
const MIN_BAR_PCT = 2;

type WorkloadChartProps = {
  tasks: ChecklistTask[];
};

export const WorkloadChart = ({ tasks }: WorkloadChartProps) => {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (task.status === 'Closed') {
        continue;
      }
      const assignee = task.assignee || 'Unassigned';
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((entryA, entryB) => entryB[1] - entryA[1])
      .slice(0, MAX_ASSIGNEES);
  }, [tasks]);

  if (data.length === 0) {
    return (
      <Content className="app-text-muted" component="p">
        No open items
      </Content>
    );
  }
  const max = data[0][1];

  return (
    <div className="app-comp-chart">
      {data.map(([name, count]) => (
        <div className="app-comp-row" key={name}>
          <span className="app-comp-label app-text-xs">{name.split('@')[0]}</span>
          <div className="app-comp-bar-track">
            <div
              className="app-comp-bar"
              style={{ width: `${Math.max(MIN_BAR_PCT, (count / max) * 100)}%` }}
            />
          </div>
          <span className="app-comp-count app-text-xs app-text-muted">{count}</span>
        </div>
      ))}
    </div>
  );
};
