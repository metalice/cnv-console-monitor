import React from 'react';
import { Button } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import type { LaunchGroup } from '@cnv-monitor/shared';

interface ExportButtonProps {
  groups: LaunchGroup[];
  date: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ groups, date }) => {
  const handleExport = () => {
    const header = 'Version,Tier,Status,Total,Passed,Failed,Skipped,PassRate,LastRun\n';
    const rows = groups
      .map((g) => {
        const lastRun = new Date(g.latestLaunch.start_time).toISOString();
        return `${g.cnvVersion},${g.tier},${g.latestLaunch.status},${g.totalTests},${g.passedTests},${g.failedTests},${g.skippedTests},${g.passRate}%,${lastRun}`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cnv-console-report-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" icon={<DownloadIcon />} onClick={handleExport}>
      Export CSV
    </Button>
  );
};
