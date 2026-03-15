import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageSection, Content, Gallery, GalleryItem,
  Flex, FlexItem, Button, Toolbar, ToolbarContent, ToolbarItem,
  Spinner, Tooltip, Alert, Label,
} from '@patternfly/react-core';
import { RedoIcon } from '@patternfly/react-icons';
import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { fetchReleases } from '../api/releases';
import { triggerPollNow } from '../api/poll';
import type { PublicConfig, ReleaseInfo } from '@cnv-monitor/shared';
import { useDate } from '../context/DateContext';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { HealthBanner } from '../components/common/HealthBanner';
import { AckBanner } from '../components/common/AckBanner';
import { ExportButton } from '../components/common/ExportButton';
import { StatCard } from '../components/common/StatCard';
import { AcknowledgeModal } from '../components/modals/AcknowledgeModal';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { LaunchTable } from '../components/dashboard/LaunchTable';

const STATUS_SUCCESS = 'var(--pf-t--global--color--status--success--default)';
const STATUS_DANGER = 'var(--pf-t--global--color--status--danger--default)';
const STATUS_WARNING = 'var(--pf-t--global--color--status--warning--default)';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lookbackMode, since, until, displayLabel } = useDate();
  const [ackModalOpen, setAckModalOpen] = useState(false);

  useEffect(() => { document.title = 'Dashboard | CNV Console Monitor'; }, []);

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => apiFetch<PublicConfig>('/config'), staleTime: Infinity });
  const { data: report, isLoading } = useQuery({ queryKey: ['report', lookbackMode, since, until], queryFn: () => fetchReportForRange(since, until) });
  const pollNow = useMutation({ mutationFn: triggerPollNow, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report'] }) });
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
                {filters.availableComponents.length > 0 && (
                  <ToolbarItem>
                    <ComponentMultiSelect id="component-filter" selected={filters.selectedComponents} options={filters.availableComponents} onChange={(selected) => { filters.setSelectedComponents(selected); filters.setVersionFilter('all'); }} />
                  </ToolbarItem>
                )}
                {filters.availableTiers.length > 0 && (
                  <ToolbarItem>
                    <ComponentMultiSelect id="tier-filter" selected={filters.selectedTiers} options={filters.availableTiers} onChange={filters.setSelectedTiers} placeholder="All Tiers" itemLabel="tiers" isDisabled={filters.availableTiers.length <= 1} />
                  </ToolbarItem>
                )}
                {filters.versions.length > 2 && (
                  <ToolbarItem>
                    <SearchableSelect id="version-filter" value={filters.versionFilter} options={filters.versions.map((version) => ({ value: version, label: version === 'all' ? 'All Versions' : `CNV ${version}` }))} onChange={(selected) => filters.setVersionFilter(selected)} placeholder="All Versions" />
                  </ToolbarItem>
                )}
                <ToolbarItem><ExportButton groups={filters.filteredGroups} date={displayLabel} /></ToolbarItem>
                <ToolbarItem>
                  <Tooltip content="Triggers a full sync with ReportPortal — fetches new launches and test items, then stores them locally. This may take 10–30 seconds.">
                    <Button variant="secondary" icon={<RedoIcon />} onClick={() => pollNow.mutate()} isLoading={pollNow.isPending}>Poll Now</Button>
                  </Tooltip>
                </ToolbarItem>
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

        <LaunchTable groups={filters.filteredGroups} availableComponents={filters.availableComponents} tableSearch={filters.tableSearch} onSearchChange={filters.setTableSearch} config={config} />
      </PageSection>

      <AcknowledgeModal isOpen={ackModalOpen} onClose={() => setAckModalOpen(false)} groups={filters.filteredGroups} component={filters.selectedComponents.size === 1 ? [...filters.selectedComponents][0] : undefined} />
    </>
  );
};
