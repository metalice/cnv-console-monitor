import React from 'react';
import {
  Card,
  CardBody,
  Label,
  Flex,
  FlexItem,
  Tooltip,
} from '@patternfly/react-core';
import { TrendUpIcon, TrendDownIcon, EqualsIcon } from '@patternfly/react-icons';
import type { ComponentHealthSummary } from '../../api/componentHealth';

const passRateColor = (rate: number): string => {
  if (rate >= 95) return 'var(--pf-t--global--color--status--success--default)';
  if (rate >= 80) return 'var(--pf-t--global--color--status--warning--default)';
  return 'var(--pf-t--global--color--status--danger--default)';
};

const passRateLabelColor = (rate: number): 'green' | 'yellow' | 'red' => {
  if (rate >= 95) return 'green';
  if (rate >= 80) return 'yellow';
  return 'red';
};

const Stat = ({ value, label, color, help }: { value: number; label: string; color?: string; help: string }) => (
  <Tooltip content={help}>
    <div className="app-stat-wrapper">
      <div className="app-health-stat-value" style={{ color: color ?? 'inherit' }}>{value}</div>
      <div className="app-text-muted app-health-stat-label">{label}</div>
    </div>
  </Tooltip>
);

type ComponentHealthCardProps = {
  component: ComponentHealthSummary;
  onClick: () => void;
};

export const ComponentHealthCard: React.FC<ComponentHealthCardProps> = ({ component: c, onClick }) => {
  const barColor = passRateColor(c.passRate);
  const labelColor = passRateLabelColor(c.passRate);

  return (
    <Card
      isClickable
      isSelectable
      onClick={onClick}
      className="app-health-card"
    >
      <CardBody>
        <Flex alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
          <FlexItem className="app-health-name-col">
            <div className="app-health-component-name">{c.component}</div>
            <div className="app-mb-xs">
              <Tooltip content={`Trend compares the pass rate in the selected period (${c.passRate}%) against the previous equivalent period. Improving = current is 3%+ higher, Worsening = current is 3%+ lower.`}>
                <span>
                  {c.trend === 'improving' && <Label color="green" isCompact icon={<TrendUpIcon />}>Improving</Label>}
                  {c.trend === 'worsening' && <Label color="red" isCompact icon={<TrendDownIcon />}>Worsening</Label>}
                  {c.trend === 'stable' && <Label color="grey" isCompact icon={<EqualsIcon />}>Stable</Label>}
                </span>
              </Tooltip>
            </div>
          </FlexItem>

          <FlexItem className="app-health-rate-col">
            <Tooltip content={`Pass rate = number of launches with PASSED status / total launches for this component in the selected period. ${c.totalLaunches - c.failedLaunches} passed out of ${c.totalLaunches} total.`}>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }} className="app-cursor-help">
                <FlexItem>
                  <Label color={labelColor} className="app-health-label-big">{c.passRate}%</Label>
                </FlexItem>
                <FlexItem className="app-flex-1 app-max-w-120">
                  <div className="app-progress-track app-health-progress-track">
                    <div className="app-progress-fill--brand" style={{ width: `${c.passRate}%`, background: barColor }} />
                  </div>
                </FlexItem>
              </Flex>
            </Tooltip>
          </FlexItem>

          <Flex flex={{ default: 'flex_1' }} justifyContent={{ default: 'justifyContentSpaceEvenly' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Stat value={c.totalLaunches} label="Launches" help="Total number of test launches (runs) for this component in the selected time period." />
            </FlexItem>
            <FlexItem>
              <Stat value={c.failedLaunches} label="Failed" color={c.failedLaunches > 0 ? 'var(--pf-t--global--color--status--danger--default)' : undefined}
                help="Number of launches with FAILED status. A launch is failed if any test in it failed." />
            </FlexItem>
            <FlexItem>
              <Stat value={c.untriagedCount} label="Untriaged" color={c.untriagedCount > 0 ? 'var(--pf-t--global--color--status--warning--default)' : undefined}
                help="Number of unique failing tests that have not been classified yet (no defect type assigned). Each test is counted once regardless of how many launches it failed in." />
            </FlexItem>
            <FlexItem>
              <Stat value={c.flakyCount} label="Flaky" color={c.flakyCount > 0 ? 'var(--pf-t--global--color--status--warning--default)' : undefined}
                help="Number of unique tests that flipped between PASSED and FAILED across launches in the selected period. Flaky tests are unreliable and need investigation." />
            </FlexItem>
            <FlexItem>
              <Stat value={c.worseningCount} label="Worsening" color={c.worseningCount > 0 ? 'var(--pf-t--global--color--status--danger--default)' : undefined}
                help="Number of failing tests whose failure rate increased in the second half of the period compared to the first half. These tests are getting worse over time." />
            </FlexItem>
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
};
