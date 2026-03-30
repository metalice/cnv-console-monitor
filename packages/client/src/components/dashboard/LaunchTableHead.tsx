import { type ThProps } from '@patternfly/react-table';
import { Thead, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

type LaunchTableHeadProps = {
  vis: (id: string) => boolean;
  showComponentCol: boolean;
  getSortParams: (index: number) => ThProps['sort'];
};

export const LaunchTableHead = ({ getSortParams, showComponentCol, vis }: LaunchTableHeadProps) => (
  <Thead>
    <Tr>
      {vis('version') && <ThWithHelp help="CNV version" label="Version" sort={getSortParams(0)} />}
      {vis('tier') && (
        <ThWithHelp help="Test tier and variant" label="Tier" sort={getSortParams(1)} />
      )}
      {showComponentCol && vis('component') && (
        <ThWithHelp
          help="Jira component mapped from Jenkins team"
          label="Component"
          sort={getSortParams(2)}
        />
      )}
      {vis('status') && <ThWithHelp help="Launch status" label="Status" sort={getSortParams(3)} />}
      {vis('passRate') && (
        <ThWithHelp
          help="Aggregated pass rate (skipped tests excluded from denominator)"
          label="Pass Rate"
          sort={getSortParams(4)}
        />
      )}
      {vis('tests') && <ThWithHelp help="Passed / Total" label="Tests" sort={getSortParams(5)} />}
      {vis('failed') && (
        <ThWithHelp help="Failed test count" label="Failed" sort={getSortParams(6)} />
      )}
      {vis('skipped') && (
        <ThWithHelp
          help="Skipped test count (excluded from pass rate)"
          label="Skipped"
          sort={getSortParams(7)}
        />
      )}
      {vis('lastRun') && (
        <ThWithHelp
          help="Start time of the latest launch"
          label="Last Run"
          sort={getSortParams(8)}
        />
      )}
      {vis('rp') && <ThWithHelp help="Link to ReportPortal" label="RP" />}
    </Tr>
  </Thead>
);
