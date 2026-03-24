import React from 'react';

import type { LaunchGroup } from '@cnv-monitor/shared';

import { Button } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';

type ExportButtonProps = {
  groups: LaunchGroup[];
  date: string;
};

const escapeCsvField = (value: string | number): string => {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const ExportButton: React.FC<ExportButtonProps> = ({ date, groups }) => {
  const handleExport = (): void => {
    const header = 'Version,Tier,Component,Status,Total,Passed,Failed,Skipped,PassRate,LastRun\n';
    const rows = groups
      .map(group => {
        const lastRun = new Date(group.latestLaunch.start_time).toISOString();
        return [
          group.cnvVersion,
          group.tier,
          group.component ?? '',
          group.latestLaunch.status,
          group.totalTests,
          group.passedTests,
          group.failedTests,
          group.skippedTests,
          `${group.passRate}%`,
          lastRun,
        ]
          .map(escapeCsvField)
          .join(',');
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cnv-console-report-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button icon={<DownloadIcon />} variant="secondary" onClick={handleExport}>
      Export CSV
    </Button>
  );
};
