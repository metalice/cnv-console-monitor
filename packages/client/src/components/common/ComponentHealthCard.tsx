import { Card, CardBody, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { EqualsIcon, TrendDownIcon, TrendUpIcon } from '@patternfly/react-icons';

import type { ComponentHealthSummary } from '../../api/componentHealth';

import { passRateColor, passRateLabelColor } from './healthCardHelpers';
import { HealthCardStats } from './HealthCardStats';

type ComponentHealthCardProps = {
  component: ComponentHealthSummary;
  onClick: () => void;
};

export const ComponentHealthCard = ({
  component: healthSummary,
  onClick,
}: ComponentHealthCardProps) => {
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

          <HealthCardStats summary={healthSummary} />
        </Flex>
      </CardBody>
    </Card>
  );
};
