import { useEffect, useMemo, useRef, useState } from 'react';

import type { DailyReport, LaunchGroup } from '@cnv-monitor/shared';

import { useComponentFilter } from '../context/ComponentFilterContext';
import { usePreferences } from '../context/PreferencesContext';

export type DashboardFilterActions = {
  setVersionFilter: (value: string) => void;
  setSelectedTiers: (value: Set<string>) => void;
  setStatusFilter: (value: string | null) => void;
  setTableSearch: (value: string) => void;
};

export type DashboardFilterState = {
  selectedComponents: Set<string>;
  versionFilter: string;
  selectedTiers: Set<string>;
  statusFilter: string | null;
  tableSearch: string;
  availableComponents: string[];
  versions: string[];
  availableTiers: string[];
  filteredGroups: LaunchGroup[];
  scopedStats: {
    total: number;
    passed: number;
    failed: number;
    inProgress: number;
    newFailures: number;
    untriaged: number;
  };
  scopedHealth: 'red' | 'yellow' | 'green';
};

export const useDashboardFilters = (
  report: DailyReport | undefined,
): DashboardFilterState & DashboardFilterActions => {
  const { loaded: prefsLoaded, preferences, setPreference } = usePreferences();
  const { selectedComponents } = useComponentFilter();
  const [versionFilter, setVersionFilterState] = useState('all');
  const [selectedTiers, setSelectedTiersState] = useState(new Set());
  const [statusFilter, setStatusFilterState] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (!prefsLoaded || prefsAppliedRef.current) {
      return;
    }
    prefsAppliedRef.current = true;

    const initialParams = new URLSearchParams(window.location.search);
    const urlVersion = initialParams.get('version');
    const urlTiers = initialParams.get('tiers');
    const urlStatus = initialParams.get('status');

    if (urlVersion && urlVersion !== 'all') {
      setVersionFilterState(urlVersion);
      setPreference('dashboardVersion', urlVersion);
    } else if (preferences.dashboardVersion) {
      setVersionFilterState(preferences.dashboardVersion);
    }
    if (urlTiers) {
      setSelectedTiersState(new Set(urlTiers.split(',').filter(Boolean)));
    }
    if (urlStatus) {
      setStatusFilterState(urlStatus);
    }
  }, [prefsLoaded, preferences.dashboardVersion, setPreference]);

  const filtersRef = useRef({ status: statusFilter, tiers: selectedTiers, version: versionFilter });
  useEffect(() => {
    filtersRef.current = { status: statusFilter, tiers: selectedTiers, version: versionFilter };
  });

  const syncUrl = () => {
    const { status, tiers, version } = filtersRef.current;
    const url = new URL(window.location.href);
    if (version !== 'all') {
      url.searchParams.set('version', version);
    } else {
      url.searchParams.delete('version');
    }
    if (tiers.size > 0) {
      url.searchParams.set('tiers', [...tiers].join(','));
    } else {
      url.searchParams.delete('tiers');
    }
    if (status) {
      url.searchParams.set('status', status);
    } else {
      url.searchParams.delete('status');
    }
    window.history.replaceState(null, '', url.pathname + (url.search || ''));
  };

  const setVersionFilter = (value: string) => {
    setVersionFilterState(value);
    setPreference('dashboardVersion', value);
    filtersRef.current.version = value;
    syncUrl();
  };
  const setSelectedTiers = (value: Set<string>) => {
    setSelectedTiersState(value);
    filtersRef.current.tiers = value;
    syncUrl();
  };
  const setStatusFilter = (value: string | null) => {
    setStatusFilterState(value);
    filtersRef.current.status = value;
    syncUrl();
  };

  const availableComponents = useMemo(() => report?.components ?? [], [report]);

  const componentFilteredGroups = useMemo(() => {
    if (!report) {
      return [];
    }
    if (selectedComponents.size === 0) {
      return report.groups;
    }
    return report.groups.filter(group => selectedComponents.has(group.component ?? ''));
  }, [report, selectedComponents]);

  const versions = useMemo(() => {
    if (!report) {
      return [];
    }
    const set = new Set(componentFilteredGroups.map(group => group.cnvVersion));
    const sorted = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
    return ['all', ...sorted];
  }, [report, componentFilteredGroups]);

  const availableTiers = useMemo(() => {
    if (!report) {
      return [];
    }
    return [...new Set(componentFilteredGroups.map(group => group.tier))].sort();
  }, [report, componentFilteredGroups]);

  const filteredGroups = useMemo(() => {
    let groups = componentFilteredGroups;
    if (selectedTiers.size > 0) {
      groups = groups.filter(group => selectedTiers.has(group.tier));
    }
    if (versionFilter !== 'all') {
      groups = groups.filter(group => group.cnvVersion === versionFilter);
    }
    if (statusFilter === 'PASSED') {
      groups = groups.filter(group => group.health === 'green');
    } else if (statusFilter === 'FAILED') {
      groups = groups.filter(group => group.health === 'red');
    } else if (statusFilter === 'IN_PROGRESS') {
      groups = groups.filter(group => group.latestLaunch?.status === 'IN_PROGRESS');
    }
    return groups;
  }, [componentFilteredGroups, selectedTiers, versionFilter, statusFilter]);

  const isFiltered =
    selectedComponents.size > 0 || selectedTiers.size > 0 || versionFilter !== 'all';

  const scopedStats = useMemo(() => {
    const newFailuresCount =
      typeof report?.newFailures === 'number'
        ? report.newFailures
        : Array.isArray(report?.newFailures)
          ? report.newFailures.length
          : 0;

    if (!isFiltered && report) {
      return {
        failed: report.failedLaunches,
        inProgress: report.inProgressLaunches,
        newFailures: newFailuresCount,
        passed: report.passedLaunches,
        total: report.totalLaunches,
        untriaged: report.untriagedCount ?? 0,
      };
    }

    const hasLaunchData = filteredGroups.length > 0 && Array.isArray(filteredGroups[0]?.launches);
    if (hasLaunchData) {
      const allLaunches = filteredGroups.flatMap(group => group.launches!);
      return {
        failed: allLaunches.filter(launch => launch.status === 'FAILED').length,
        inProgress: allLaunches.filter(launch => launch.status === 'IN_PROGRESS').length,
        newFailures: newFailuresCount,
        passed: allLaunches.filter(launch => launch.status === 'PASSED').length,
        total: allLaunches.length,
        untriaged: report?.untriagedCount ?? 0,
      };
    }

    const totalLaunches = filteredGroups.reduce((sum, g) => sum + (g.launchCount ?? 1), 0);
    const passedGroups = filteredGroups.filter(g => g.health === 'green');
    const failedGroups = filteredGroups.filter(g => g.health === 'red');
    const inProgressGroups = filteredGroups.filter(g => g.latestLaunch?.status === 'IN_PROGRESS');

    return {
      failed: failedGroups.reduce((sum, g) => sum + (g.launchCount ?? 1), 0),
      inProgress: inProgressGroups.reduce((sum, g) => sum + (g.launchCount ?? 1), 0),
      newFailures: newFailuresCount,
      passed: passedGroups.reduce((sum, g) => sum + (g.launchCount ?? 1), 0),
      total: totalLaunches,
      untriaged: report?.untriagedCount ?? 0,
    };
  }, [filteredGroups, report, isFiltered]);

  const scopedHealth: 'red' | 'yellow' | 'green' =
    scopedStats.failed > 0 ? 'red' : scopedStats.inProgress > 0 ? 'yellow' : 'green';

  return {
    availableComponents,
    availableTiers,
    filteredGroups,
    scopedHealth,
    scopedStats,
    selectedComponents,
    selectedTiers,
    setSelectedTiers,
    setStatusFilter,
    setTableSearch,
    setVersionFilter,
    statusFilter,
    tableSearch,
    versionFilter,
    versions,
  };
};
