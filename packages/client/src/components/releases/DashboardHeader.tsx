import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';

import type { VersionReadiness } from '../../api/releases';
import { HelpLabel } from '../common/HelpLabel';

import { TrafficLight } from './TrafficLight';

const DAYS_CRITICAL = 3;
const DAYS_WARNING = 7;

type DashboardHeaderProps = {
  shortname: string;
  phase: string;
  health: { status: 'green' | 'yellow' | 'red' | 'grey'; reason: string };
  onClose?: () => void;
};

export const DashboardHeader = ({ health, onClose, phase, shortname }: DashboardHeaderProps) => {
  const phaseColor = phase.includes('Maintenance')
    ? 'green'
    : phase.includes('Development')
      ? 'blue'
      : 'purple';

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <TrafficLight reason={health.reason} size={16} status={health.status} />
          </FlexItem>
          <FlexItem>{shortname.replace('cnv-', 'CNV ')} Dashboard</FlexItem>
          <FlexItem>
            <Label isCompact color={phaseColor}>
              {phase}
            </Label>
          </FlexItem>
        </Flex>
      </FlexItem>
      {onClose && (
        <FlexItem>
          <Button aria-label="Close dashboard" variant="plain" onClick={onClose}>
            &times;
          </Button>
        </FlexItem>
      )}
    </Flex>
  );
};

type ReadinessDetailsProps = {
  checklistDone: number;
  checklistTotal: number;
  readinessLoading: boolean;
  readiness?: VersionReadiness | null;
  daysUntilNext: number | null;
};

export const ReadinessDetails = ({
  checklistDone,
  checklistTotal,
  daysUntilNext,
  readiness,
  readinessLoading,
}: ReadinessDetailsProps) => (
  <DescriptionList isCompact isHorizontal>
    <DescriptionListGroup>
      <DescriptionListTerm>
        <HelpLabel
          help="Jira release checklist tasks. Shows completed vs total."
          label="Checklist"
        />
      </DescriptionListTerm>
      <DescriptionListDescription>
        {checklistDone}/{checklistTotal} done
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>
        <HelpLabel
          help="Test pass rate from ReportPortal launches matching this CNV version in the last 14 days."
          label="Pass Rate"
        />
      </DescriptionListTerm>
      <DescriptionListDescription>
        {readinessLoading ? (
          <Spinner size="sm" />
        ) : readiness?.passRate !== null ? (
          `${readiness?.passRate}%`
        ) : (
          '--'
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>
        <HelpLabel
          help="Days until the next scheduled batch or GA release for this version."
          label="Next Release"
        />
      </DescriptionListTerm>
      <DescriptionListDescription>
        {daysUntilNext !== null ? (
          <Label
            isCompact
            color={
              daysUntilNext <= DAYS_CRITICAL
                ? 'red'
                : daysUntilNext <= DAYS_WARNING
                  ? 'orange'
                  : 'green'
            }
          >
            {daysUntilNext}d
          </Label>
        ) : (
          '--'
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>
        <HelpLabel
          help="Number of test launches from ReportPortal for this version in the last 14 days."
          label="Launches"
        />
      </DescriptionListTerm>
      <DescriptionListDescription>{readiness?.totalLaunches ?? '--'}</DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);
