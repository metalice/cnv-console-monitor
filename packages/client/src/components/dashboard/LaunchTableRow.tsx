import { type LaunchGroup, type PublicConfig } from '@cnv-monitor/shared';

import { Label, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { LaunchProgress } from '../common/LaunchProgress';
import { PassRateBar } from '../common/PassRateBar';
import { StatusBadge } from '../common/StatusBadge';

import { fmtTime } from './launchTableHelpers';

type LaunchTableRowProps = {
  group: LaunchGroup;
  vis: (id: string) => boolean;
  showComponentCol: boolean;
  config: PublicConfig | undefined;
  onRowClick: () => void;
};

export const LaunchTableRow = ({
  config,
  group,
  onRowClick,
  showComponentCol,
  vis,
}: LaunchTableRowProps) => (
  <Tr
    isClickable
    key={`${group.cnvVersion}-${group.tier}-${group.component}`}
    onRowClick={onRowClick}
  >
    {vis('version') && (
      <Td className="app-cell-nowrap" dataLabel="Version">
        <strong>{group.cnvVersion}</strong>
      </Td>
    )}
    {vis('tier') && (
      <Td className="app-cell-nowrap" dataLabel="Tier">
        {group.tier}
      </Td>
    )}
    {showComponentCol && vis('component') && (
      <Td className="app-cell-nowrap" dataLabel="Component">
        <Label isCompact color="grey">
          {group.component || '--'}
        </Label>
      </Td>
    )}
    {vis('status') && (
      <Td className="app-cell-nowrap" dataLabel="Status">
        {group.latestLaunch.status === 'IN_PROGRESS' ? (
          <LaunchProgress launchRpId={group.latestLaunch.rp_id} />
        ) : (
          <StatusBadge
            rpStatus={group.latestLaunch.status}
            status={group.latestLaunch.jenkins_status ?? group.latestLaunch.status}
          />
        )}
      </Td>
    )}
    {vis('passRate') && (
      <Td className="app-cell-nowrap" dataLabel="Pass Rate">
        <PassRateBar
          failed={group.failedTests}
          launchCount={group.launchCount ?? group.launches?.length ?? 1}
          launchName={group.latestLaunch.name}
          passed={group.passedTests}
          rate={group.passRate}
          skipped={group.skippedTests}
          startTime={group.latestLaunch.start_time}
          total={group.totalTests}
        />
      </Td>
    )}
    {vis('tests') && (
      <Td className="app-cell-nowrap" dataLabel="Tests">
        {group.passedTests}/{group.totalTests}
      </Td>
    )}
    {vis('failed') && (
      <Td className="app-cell-nowrap" dataLabel="Failed">
        {group.failedTests}
      </Td>
    )}
    {vis('skipped') && (
      <Td className="app-cell-nowrap" dataLabel="Skipped">
        {group.skippedTests}
      </Td>
    )}
    {vis('lastRun') && (
      <Td className="app-cell-nowrap" dataLabel="Last Run">
        <Tooltip content={fmtTime(group.latestLaunch.start_time)}>
          <span className="app-cursor-help">{fmtTime(group.latestLaunch.start_time)}</span>
        </Tooltip>
      </Td>
    )}
    {vis('rp') && (
      <Td dataLabel="RP" onClick={e => e.stopPropagation()}>
        {config && (
          <a
            aria-label="Open in ReportPortal"
            href={`${config.rpLaunchBaseUrl}/${group.latestLaunch.rp_id}`}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLinkAltIcon />
          </a>
        )}
      </Td>
    )}
  </Tr>
);
