import { Flex, FlexItem, Tooltip } from '@patternfly/react-core';

import type { ComponentHealthSummary } from '../../api/componentHealth';

const Stat = ({
  color,
  help,
  label,
  value,
}: {
  value: number;
  label: string;
  color?: string;
  help: string;
}) => (
  <Tooltip content={help}>
    <div className="app-stat-wrapper">
      <div className="app-health-stat-value" style={{ color: color ?? 'inherit' }}>
        {value}
      </div>
      <div className="app-text-muted app-health-stat-label">{label}</div>
    </div>
  </Tooltip>
);

const DANGER_COLOR = 'var(--pf-t--global--color--status--danger--default)';
const WARNING_COLOR = 'var(--pf-t--global--color--status--warning--default)';

type HealthCardStatsProps = {
  summary: ComponentHealthSummary;
};

export const HealthCardStats = ({ summary }: HealthCardStatsProps) => (
  <Flex
    alignItems={{ default: 'alignItemsCenter' }}
    flex={{ default: 'flex_1' }}
    justifyContent={{ default: 'justifyContentSpaceEvenly' }}
  >
    <FlexItem>
      <Stat
        help="Total number of test launches (runs) for this component in the selected time period."
        label="Launches"
        value={summary.totalLaunches}
      />
    </FlexItem>
    <FlexItem>
      <Stat
        color={summary.failedLaunches > 0 ? DANGER_COLOR : undefined}
        help="Number of launches with FAILED status. A launch is failed if any test in it failed."
        label="Failed"
        value={summary.failedLaunches}
      />
    </FlexItem>
    <FlexItem>
      <Stat
        color={summary.untriagedCount > 0 ? WARNING_COLOR : undefined}
        help="Number of unique failing tests that have not been classified yet (no defect type assigned). Each test is counted once regardless of how many launches it failed in."
        label="Untriaged"
        value={summary.untriagedCount}
      />
    </FlexItem>
    <FlexItem>
      <Stat
        color={summary.flakyCount > 0 ? WARNING_COLOR : undefined}
        help="Number of unique tests that flipped between PASSED and FAILED across launches in the selected period. Flaky tests are unreliable and need investigation."
        label="Flaky"
        value={summary.flakyCount}
      />
    </FlexItem>
    <FlexItem>
      <Stat
        color={summary.worseningCount > 0 ? DANGER_COLOR : undefined}
        help="Number of failing tests whose failure rate increased in the second half of the period compared to the first half. These tests are getting worse over time."
        label="Worsening"
        value={summary.worseningCount}
      />
    </FlexItem>
  </Flex>
);
