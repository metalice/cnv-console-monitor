import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection, Content, Gallery, GalleryItem,
  Flex, FlexItem, Toolbar, ToolbarContent, ToolbarItem,
  Spinner, Alert, Label,
} from '@patternfly/react-core';
import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { fetchReleases } from '../api/releases';
import type { PublicConfig, ReleaseInfo } from '@cnv-monitor/shared';
import { useDate } from '../context/DateContext';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { HealthBanner } from '../components/common/HealthBanner';
import { AckBanner } from '../components/common/AckBanner';
import { ExportButton } from '../components/common/ExportButton';
import { StatCard } from '../components/common/StatCard';
import { AcknowledgeModal } from '../components/modals/AcknowledgeModal';
import { LaunchTable } from '../components/dashboard/LaunchTable';

const STATUS_SUCCESS = 'var(--pf-t--global--color--status--success--default)';
const STATUS_DANGER = 'var(--pf-t--global--color--status--danger--default)';
const STATUS_WARNING = 'var(--pf-t--global--color--status--warning--default)';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { lookbackMode, since, until, displayLabel } = useDate();
  const [ackModalOpen, setAckModalOpen] = useState(false);

  useEffect(() => { document.title = 'Dashboard | CNV Console Monitor'; }, []);

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => apiFetch<PublicConfig>('/config'), staleTime: Infinity });
  const { data: report, isLoading } = useQuery({ queryKey: ['report', lookbackMode, since, until], queryFn: () => fetchReportForRange(since, until) });
  const { data: releases } = useQuery({ queryKey: ['releases'], queryFn: fetchReleases, staleTime: 10 * 60 * 1000 });

  const filters = useDashboardFilters(report);

  const upcomingReleases = useMemo(() => {
    if (!releases) return [];
    return releases
      .filter((release: ReleaseInfo) => release.daysUntilNext !== null && release.daysUntilNext <= 7)
      .sort((releaseA: ReleaseInfo, releaseB: ReleaseInfo) => (releaseA.daysUntilNext ?? Infinity) - (releaseB.daysUntilNext ?? Infinity));
  }, [releases]);

  if (isLoading || !report) {
    return <PageSection isFilled><div className="app-page-spinner"><Spinner aria-label="Loading dashboard" /></div></PageSection>;
  }

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem><Content component="h1">Dashboard</Content></FlexItem>
          <FlexItem>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem><ExportButton groups={filters.filteredGroups} date={displayLabel} /></ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {filters.selectedComponents.size === 1 && <AckBanner onAcknowledge={() => setAckModalOpen(true)} component={[...filters.selectedComponents][0]} />}
        {upcomingReleases.length > 0 && (
          <Alert variant="warning" isInline title="Upcoming Releases" className="app-mb-md">
            {upcomingReleases.map(release => (
              <Label key={release.shortname} color={release.daysUntilNext! <= 3 ? 'red' : 'orange'} className="app-mr-sm app-cursor-pointer" onClick={() => navigate('/releases')}>
                {release.shortname.replace('cnv-', 'CNV ')} &mdash; {release.nextRelease?.date} ({release.daysUntilNext}d)
              </Label>
            ))}
          </Alert>
        )}
        <HealthBanner health={filters.scopedHealth} passed={filters.scopedStats.passed} failed={filters.scopedStats.failed} inProgress={filters.scopedStats.inProgress} />

        <Gallery hasGutter minWidths={{ default: '130px' }} className="app-mb-xl">
          {([
            { value: filters.scopedStats.total, label: 'Total', help: 'Total launches in this time range. Click to clear filters.', onClick: () => filters.setStatusFilter(null), isActive: filters.statusFilter === null },
            { value: filters.scopedStats.passed, label: 'Passed', help: 'Launches where all tests passed.', color: STATUS_SUCCESS, onClick: () => filters.setStatusFilter(filters.statusFilter === 'PASSED' ? null : 'PASSED'), isActive: filters.statusFilter === 'PASSED' },
            { value: filters.scopedStats.failed, label: 'Failed', help: 'Launches with at least one failed test.', color: STATUS_DANGER, onClick: () => filters.setStatusFilter(filters.statusFilter === 'FAILED' ? null : 'FAILED'), isActive: filters.statusFilter === 'FAILED' },
            { value: filters.scopedStats.inProgress, label: 'In Progress', help: 'Launches still running.', color: STATUS_WARNING, onClick: () => filters.setStatusFilter(filters.statusFilter === 'IN_PROGRESS' ? null : 'IN_PROGRESS'), isActive: filters.statusFilter === 'IN_PROGRESS' },
            { value: filters.scopedStats.newFailures, label: 'New Failures', help: 'Tests that failed now but not in the previous window.', color: STATUS_DANGER, onClick: () => navigate('/failures') },
            { value: filters.scopedStats.untriaged, label: 'Untriaged', help: 'Failed tests not yet classified.', color: STATUS_WARNING, onClick: () => navigate('/failures') },
          ] as const).map(card => (
            <GalleryItem key={card.label}><StatCard {...card} /></GalleryItem>
          ))}
        </Gallery>

        <LaunchTable
          groups={filters.filteredGroups} availableComponents={filters.availableComponents}
          tableSearch={filters.tableSearch} onSearchChange={filters.setTableSearch} config={config}
          selectedTiers={filters.selectedTiers} availableTiers={filters.availableTiers} onTiersChange={filters.setSelectedTiers}
          versionFilter={filters.versionFilter} versionOptions={filters.versions.map((v) => ({ value: v, label: v === 'all' ? 'All Versions' : `CNV ${v}` }))} onVersionChange={filters.setVersionFilter}
        />
      </PageSection>

      <AcknowledgeModal isOpen={ackModalOpen} onClose={() => setAckModalOpen(false)} groups={filters.filteredGroups} component={filters.selectedComponents.size === 1 ? [...filters.selectedComponents][0] : undefined} />
    </>
  );
};
