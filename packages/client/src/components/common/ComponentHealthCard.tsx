import React from 'react';

import { Card, CardBody, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { EqualsIcon, TrendDownIcon, TrendUpIcon } from '@patternfly/react-icons';

import type { ComponentHealthSummary } from '../../api/componentHealth';

const passRateColor = (rate: number): string => {
  if (rate >= 95) {
    return 'var(--pf-t--global--color--status--success--default)';
  }
  if (rate >= 80) {
    return 'var(--pf-t--global--color--status--warning--default)';
  }
  return 'var(--pf-t--global--color--status--danger--default)';
};

const passRateLabelColor = (rate: number): 'green' | 'yellow' | 'red' => {
  if (rate >= 95) {
    return 'green';
  }
  if (rate >= 80) {
    return 'yellow';
  }
  return 'red';
};

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

type ComponentHealthCardProps = {
  component: ComponentHealthSummary;
  onClick: () => void;
};

export const ComponentHealthCard: React.FC<ComponentHealthCardProps> = ({
  component: healthSummary,
  onClick,
}) => {
  const barColor = passRateColor(healthSummary.passRate);
  const labelColor = passRateLabelColor(healthSummary.passRate);

  return (
    <Card isClickable isSelectable className="app-health-card" onClick={onClick}>
      <CardBody>
        <Flex alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
          <FlexItem className="app-health-name-col">
            <div className="app-health-component-name">{healthSummary.component}</div>
            <div className="app-mb-xs">
              <Tooltip
                content={`Trend compares the pass rate in the selected period (${healthSummary.passRate}%) against the previous equivalent period. Improving = current is 3%+ higher, Worsening = current is 3%+ lower.`}
              >
                <span>
                  {healthSummary.trend === 'improving' && (
                    <Label isCompact color="green" icon={<TrendUpIcon />}>
                      Improving
                    </Label>
                  )}
                  {healthSummary.trend === 'worsening' && (
                    <Label isCompact color="red" icon={<TrendDownIcon />}>
                      Worsening
                    </Label>
                  )}
                  {healthSummary.trend === 'stable' && (
                    <Label isCompact color="grey" icon={<EqualsIcon />}>
                      Stable
                    </Label>
                  )}
                </span>
              </Tooltip>
            </div>
          </FlexItem>

          <FlexItem className="app-health-rate-col">
            <Tooltip
              content={`Pass rate = number of launches with PASSED status / total launches for this component in the selected period. ${healthSummary.totalLaunches - healthSummary.failedLaunches} passed out of ${healthSummary.totalLaunches} total.`}
            >
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                className="app-cursor-help"
                spaceItems={{ default: 'spaceItemsMd' }}
              >
                <FlexItem>
                  <Label className="app-health-label-big" color={labelColor}>
                    {healthSummary.passRate}%
                  </Label>
                </FlexItem>
                <FlexItem className="app-flex-1 app-max-w-120">
                  <div className="app-progress-track app-health-progress-track">
                    <div
                      className="app-progress-fill--brand"
                      style={{ background: barColor, width: `${healthSummary.passRate}%` }}
                    />
                  </div>
                </FlexItem>
              </Flex>
            </Tooltip>
          </FlexItem>

          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            flex={{ default: 'flex_1' }}
            justifyContent={{ default: 'justifyContentSpaceEvenly' }}
          >
            <FlexItem>
              <Stat
                help="Total number of test launches (runs) for this component in the selected time period."
                label="Launches"
                value={healthSummary.totalLaunches}
              />
            </FlexItem>
            <FlexItem>
              <Stat
                color={
                  healthSummary.failedLaunches > 0
                    ? 'var(--pf-t--global--color--status--danger--default)'
                    : undefined
                }
                help="Number of launches with FAILED status. A launch is failed if any test in it failed."
                label="Failed"
                value={healthSummary.failedLaunches}
              />
            </FlexItem>
            <FlexItem>
              <Stat
                color={
                  healthSummary.untriagedCount > 0
                    ? 'var(--pf-t--global--color--status--warning--default)'
                    : undefined
                }
                help="Number of unique failing tests that have not been classified yet (no defect type assigned). Each test is counted once regardless of how many launches it failed in."
                label="Untriaged"
                value={healthSummary.untriagedCount}
              />
            </FlexItem>
            <FlexItem>
              <Stat
                color={
                  healthSummary.flakyCount > 0
                    ? 'var(--pf-t--global--color--status--warning--default)'
                    : undefined
                }
                help="Number of unique tests that flipped between PASSED and FAILED across launches in the selected period. Flaky tests are unreliable and need investigation."
                label="Flaky"
                value={healthSummary.flakyCount}
              />
            </FlexItem>
            <FlexItem>
              <Stat
                color={
                  healthSummary.worseningCount > 0
                    ? 'var(--pf-t--global--color--status--danger--default)'
                    : undefined
                }
                help="Number of failing tests whose failure rate increased in the second half of the period compared to the first half. These tests are getting worse over time."
                label="Worsening"
                value={healthSummary.worseningCount}
              />
            </FlexItem>
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
};
