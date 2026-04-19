import {
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  Progress,
  ProgressMeasureLocation,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

import type { ComponentBreakdownEntry } from '../../api/readiness';

const PASS_RATE_SUCCESS = 95;
const PASS_RATE_WARNING = 80;

const getVariant = (rate: number): 'success' | 'warning' | 'danger' => {
  if (rate >= PASS_RATE_SUCCESS) return 'success';
  if (rate >= PASS_RATE_WARNING) return 'warning';
  return 'danger';
};

export const ReadinessComponentBreakdown = ({
  breakdown,
}: {
  breakdown: ComponentBreakdownEntry[];
}) => (
  <Card isFullHeight>
    <CardBody>
      <Content className="app-section-heading" component="h3">
        By Component
      </Content>
      {breakdown.length === 0 ? (
        <EmptyState headingLevel="h4" icon={CubesIcon} titleText="No component data">
          <EmptyStateBody>No launches have component mappings for this version.</EmptyStateBody>
        </EmptyState>
      ) : (
        <Stack hasGutter>
          {breakdown.map(entry => (
            <StackItem key={entry.component}>
              <Content className="app-mb-xs" component="small">
                <strong>{entry.component}</strong>
                <Label
                  isCompact
                  className="app-ml-sm"
                  color={entry.failedLaunches > 0 ? 'red' : 'grey'}
                >
                  {entry.totalLaunches} launches
                </Label>
              </Content>
              <Progress
                aria-label={`${entry.component} pass rate`}
                measureLocation={ProgressMeasureLocation.outside}
                value={entry.passRate}
                variant={getVariant(entry.passRate)}
              />
            </StackItem>
          ))}
        </Stack>
      )}
    </CardBody>
  </Card>
);
