import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import { PageSection } from '@patternfly/react-core';

import { AckBanner } from '../components/common/AckBanner';
import { HealthBanner } from '../components/common/HealthBanner';
import { AcknowledgeModal } from '../components/modals/AcknowledgeModal';
import { usePreferences } from '../context/PreferencesContext';
import { useDashboardFilters } from '../hooks/useDashboardFilters';

import { DashboardHeader } from './DashboardHeader';
import { computeDeltas, type DashboardView, VALID_VIEWS } from './dashboardHelpers';
import { DashboardStatCards } from './DashboardStatCards';
import { DashboardEmpty, DashboardError, DashboardSkeleton } from './DashboardStates';
import { DashboardViewTabs } from './DashboardViewTabs';
import { UpcomingReleasesAlert } from './UpcomingReleasesAlert';
import { useDashboardQueries } from './useDashboardQueries';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { preferences, setPreference } = usePreferences();
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const queries = useDashboardQueries();

  const urlView = searchParams.get('view');
  const initialView: DashboardView =
    urlView && VALID_VIEWS.has(urlView)
      ? (urlView as DashboardView)
      : ((preferences.dashboardView as DashboardView | undefined) ?? 'table');
  const [viewMode, setViewMode] = useState<DashboardView>(initialView);

  const handleViewChange = (_event: unknown, key: string | number) => {
    const next = key as DashboardView;
    setViewMode(next);
    setPreference('dashboardView', next);
    setSearchParams(
      prev => {
        const updated = new URLSearchParams(prev);
        if (next === 'table') {
          updated.delete('view');
        } else {
          updated.set('view', next);
        }
        return updated;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    document.title = 'Dashboard | CNV Console Monitor';
  }, []);

  const filters = useDashboardFilters(queries.report);
  const deltas = useMemo(
    () => computeDeltas(filters.scopedStats, queries.priorReport),
    [filters.scopedStats, queries.priorReport],
  );
  const upcomingReleases = useMemo(() => {
    if (!queries.releases) {
      return [];
    }
    return queries.releases
      .filter(
        (release: ReleaseInfo) => release.daysUntilNext !== null && release.daysUntilNext <= 7,
      )
      .sort(
        (releaseA: ReleaseInfo, releaseB: ReleaseInfo) =>
          (releaseA.daysUntilNext ?? Infinity) - (releaseB.daysUntilNext ?? Infinity),
      );
  }, [queries.releases]);

  if (queries.reportError) {
    return (
      <DashboardError
        error={queries.reportError}
        onRetry={() => {
          void queries.refetch();
        }}
      />
    );
  }
  if (queries.isLoading || !queries.report) {
    return <DashboardSkeleton />;
  }
  if (queries.report.groups.length === 0) {
    return <DashboardEmpty displayLabel={queries.displayLabel} />;
  }

  const selectedComponent =
    filters.selectedComponents.size === 1 ? [...filters.selectedComponents][0] : undefined;
  const versionOptions = filters.versions.map(version => ({
    label: version === 'all' ? 'All Versions' : `CNV ${version}`,
    value: version,
  }));

  return (
    <>
      <DashboardHeader
        displayLabel={queries.displayLabel}
        filteredGroups={filters.filteredGroups}
        lastPollAt={queries.pollStatus?.lastPollAt}
      />
      <PageSection>
        <AckBanner component={selectedComponent} onAcknowledge={() => setAckModalOpen(true)} />
        <UpcomingReleasesAlert
          releases={upcomingReleases}
          onNavigate={() => navigate('/releases')}
        />
        <HealthBanner
          failed={filters.scopedStats.failed}
          health={filters.scopedHealth}
          inProgress={filters.scopedStats.inProgress}
          passed={filters.scopedStats.passed}
        />
        <DashboardStatCards
          deltas={deltas}
          stats={filters.scopedStats}
          statusFilter={filters.statusFilter}
          onNavigateFailures={() => navigate('/failures')}
          onStatusFilter={filters.setStatusFilter}
        />
        <DashboardViewTabs
          availableComponents={filters.availableComponents}
          availableTiers={filters.availableTiers}
          config={queries.config}
          groups={filters.filteredGroups}
          selectedTiers={filters.selectedTiers}
          tableSearch={filters.tableSearch}
          versionFilter={filters.versionFilter}
          versionOptions={versionOptions}
          viewMode={viewMode}
          onSearchChange={filters.setTableSearch}
          onTiersChange={filters.setSelectedTiers}
          onVersionChange={filters.setVersionFilter}
          onViewChange={handleViewChange}
        />
      </PageSection>
      <AcknowledgeModal
        component={selectedComponent}
        groups={filters.filteredGroups}
        isOpen={ackModalOpen}
        onClose={() => setAckModalOpen(false)}
      />
    </>
  );
};
