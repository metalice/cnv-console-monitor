import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { PublicConfig, ReleaseInfo } from '@cnv-monitor/shared';

import {
  Alert,
  Content,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  PageSection,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { fetchReleases } from '../api/releases';
import { AckBanner } from '../components/common/AckBanner';
import { ExportButton } from '../components/common/ExportButton';
import { HealthBanner } from '../components/common/HealthBanner';
import { StatCard } from '../components/common/StatCard';
import { LaunchTable } from '../components/dashboard/LaunchTable';
import { AcknowledgeModal } from '../components/modals/AcknowledgeModal';
import { useDate } from '../context/DateContext';
import { useDashboardFilters } from '../hooks/useDashboardFilters';

const STATUS_SUCCESS = 'var(--pf-t--global--color--status--success--default)';
const STATUS_DANGER = 'var(--pf-t--global--color--status--danger--default)';
const STATUS_WARNING = 'var(--pf-t--global--color--status--warning--default)';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayLabel, lookbackMode, since, until } = useDate();
  const [ackModalOpen, setAckModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard | CNV Console Monitor';
  }, []);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });
  const { data: report, isLoading } = useQuery({
    queryFn: () => fetchReportForRange(since, until),
    queryKey: ['report', lookbackMode, since, until],
  });
  const { data: releases } = useQuery({
    queryFn: fetchReleases,
    queryKey: ['releases'],
    staleTime: 10 * 60 * 1000,
  });

  const filters = useDashboardFilters(report);

  const upcomingReleases = useMemo(() => {
    if (!releases) {
      return [];
    }
    return releases
      .filter(
        (release: ReleaseInfo) => release.daysUntilNext !== null && release.daysUntilNext <= 7,
      )
      .sort(
        (releaseA: ReleaseInfo, releaseB: ReleaseInfo) =>
          (releaseA.daysUntilNext ?? Infinity) - (releaseB.daysUntilNext ?? Infinity),
      );
  }, [releases]);

  if (isLoading || !report) {
    return (
      <PageSection isFilled>
        <div className="app-page-spinner">
          <Spinner aria-label="Loading dashboard" />
        </div>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Dashboard</Content>
          </FlexItem>
          <FlexItem>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <ExportButton date={displayLabel} groups={filters.filteredGroups} />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {filters.selectedComponents.size === 1 && (
          <AckBanner
            component={[...filters.selectedComponents][0]}
            onAcknowledge={() => setAckModalOpen(true)}
          />
        )}
        {upcomingReleases.length > 0 && (
          <Alert isInline className="app-mb-md" title="Upcoming Releases" variant="warning">
            {upcomingReleases.map(release => (
              <Label
                className="app-mr-sm app-cursor-pointer"
                color={(release.daysUntilNext ?? 0) <= 3 ? 'red' : 'orange'}
                key={release.shortname}
                onClick={() => navigate('/releases')}
              >
                {release.shortname.replace('cnv-', 'CNV ')} &mdash; {release.nextRelease?.date} (
                {release.daysUntilNext}d)
              </Label>
            ))}
          </Alert>
        )}
        <HealthBanner
          failed={filters.scopedStats.failed}
          health={filters.scopedHealth}
          inProgress={filters.scopedStats.inProgress}
          passed={filters.scopedStats.passed}
        />

        <Gallery hasGutter className="app-mb-xl" minWidths={{ default: '130px' }}>
          {(
            [
              {
                help: 'Total launches in this time range. Click to clear filters.',
                isActive: filters.statusFilter === null,
                label: 'Total',
                onClick: () => filters.setStatusFilter(null),
                value: filters.scopedStats.total,
              },
              {
                color: STATUS_SUCCESS,
                help: 'Launches where all tests passed.',
                isActive: filters.statusFilter === 'PASSED',
                label: 'Passed',
                onClick: () =>
                  filters.setStatusFilter(filters.statusFilter === 'PASSED' ? null : 'PASSED'),
                value: filters.scopedStats.passed,
              },
              {
                color: STATUS_DANGER,
                help: 'Launches with at least one failed test.',
                isActive: filters.statusFilter === 'FAILED',
                label: 'Failed',
                onClick: () =>
                  filters.setStatusFilter(filters.statusFilter === 'FAILED' ? null : 'FAILED'),
                value: filters.scopedStats.failed,
              },
              {
                color: STATUS_WARNING,
                help: 'Launches still running.',
                isActive: filters.statusFilter === 'IN_PROGRESS',
                label: 'In Progress',
                onClick: () =>
                  filters.setStatusFilter(
                    filters.statusFilter === 'IN_PROGRESS' ? null : 'IN_PROGRESS',
                  ),
                value: filters.scopedStats.inProgress,
              },
              {
                color: STATUS_DANGER,
                help: 'Tests that failed now but not in the previous window.',
                label: 'New Failures',
                onClick: () => navigate('/failures'),
                value: filters.scopedStats.newFailures,
              },
              {
                color: STATUS_WARNING,
                help: 'Failed tests not yet classified.',
                label: 'Untriaged',
                onClick: () => navigate('/failures'),
                value: filters.scopedStats.untriaged,
              },
            ] as const
          ).map(card => (
            <GalleryItem key={card.label}>
              <StatCard {...card} />
            </GalleryItem>
          ))}
        </Gallery>

        <LaunchTable
          availableComponents={filters.availableComponents}
          availableTiers={filters.availableTiers}
          config={config}
          groups={filters.filteredGroups}
          selectedTiers={filters.selectedTiers}
          tableSearch={filters.tableSearch}
          versionFilter={filters.versionFilter}
          versionOptions={filters.versions.map(v => ({
            label: v === 'all' ? 'All Versions' : `CNV ${v}`,
            value: v,
          }))}
          onSearchChange={filters.setTableSearch}
          onTiersChange={filters.setSelectedTiers}
          onVersionChange={filters.setVersionFilter}
        />
      </PageSection>

      <AcknowledgeModal
        component={
          filters.selectedComponents.size === 1 ? [...filters.selectedComponents][0] : undefined
        }
        groups={filters.filteredGroups}
        isOpen={ackModalOpen}
        onClose={() => setAckModalOpen(false)}
      />
    </>
  );
};
