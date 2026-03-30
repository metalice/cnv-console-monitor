import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import {
  Alert,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
} from '@patternfly/react-core';

import type { VersionReadiness } from '../../api/releases';

import { ReportMetrics } from './ReportMetrics';
import { ReportOpenItems } from './ReportOpenItems';
import type { ReportData } from './useReleaseReport';

type ReportVisualTabProps = Pick<
  ReportData,
  | 'byAssignee'
  | 'byPriority'
  | 'checklistPct'
  | 'closedItems'
  | 'isHealthy'
  | 'openItems'
  | 'passRate'
  | 'totalItems'
  | 'version'
> & {
  release: ReleaseInfo;
  readiness?: VersionReadiness | null;
};

export const ReportVisualTab = forwardRef(
  (
    {
      byAssignee,
      byPriority,
      checklistPct,
      closedItems,
      isHealthy,
      openItems,
      passRate,
      readiness,
      release,
      totalItems,
      version,
    }: ReportVisualTabProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => (
    <div className="app-report app-mt-md" ref={ref}>
      <Alert
        isInline
        className="app-mb-md"
        title={isHealthy ? 'Release is on track' : 'Release needs attention'}
        variant={isHealthy ? 'success' : 'warning'}
      />
      <ReportMetrics
        checklistPct={checklistPct}
        daysUntilNext={release.daysUntilNext}
        openItemCount={openItems.length}
        passRate={passRate}
      />
      <DescriptionList isCompact isHorizontal className="app-mb-md">
        <DescriptionListGroup>
          <DescriptionListTerm>Version</DescriptionListTerm>
          <DescriptionListDescription>{version}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Phase</DescriptionListTerm>
          <DescriptionListDescription>
            <Label isCompact>{release.phase}</Label>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {release.nextRelease && (
          <DescriptionListGroup>
            <DescriptionListTerm>Next Release</DescriptionListTerm>
            <DescriptionListDescription>
              {release.nextRelease.name} — {new Date(release.nextRelease.date).toLocaleDateString()}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        <DescriptionListGroup>
          <DescriptionListTerm>Checklist Progress</DescriptionListTerm>
          <DescriptionListDescription>
            {closedItems.length} / {totalItems} completed
          </DescriptionListDescription>
        </DescriptionListGroup>
        {readiness && (
          <DescriptionListGroup>
            <DescriptionListTerm>Test Launches</DescriptionListTerm>
            <DescriptionListDescription>
              {readiness.totalLaunches} (last 14 days)
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
      {openItems.length > 0 && (
        <ReportOpenItems
          byAssignee={byAssignee}
          byPriority={byPriority}
          openItemCount={openItems.length}
        />
      )}
    </div>
  ),
);

ReportVisualTab.displayName = 'ReportVisualTab';
