import { useEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import type { DailyReport, LaunchGroup } from '@cnv-monitor/shared';

export type DashboardFilterActions = {
  setSelectedComponents: (value: Set<string>) => void;
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
  scopedStats: { total: number; passed: number; failed: number; inProgress: number; newFailures: number; untriaged: number };
  scopedHealth: 'red' | 'yellow' | 'green';
};

export const useDashboardFilters = (report: DailyReport | undefined): DashboardFilterState & DashboardFilterActions => {
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());
  const [versionFilter, setVersionFilterState] = useState<string>('all');
  const [selectedTiers, setSelectedTiersState] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilterState] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (!prefsLoaded || prefsAppliedRef.current) return;
    prefsAppliedRef.current = true;

    const initialParams = new URLSearchParams(window.location.search);
    const urlComponents = initialParams.get('components');
    const urlVersion = initialParams.get('version');
    const urlTiers = initialParams.get('tiers');
    const urlStatus = initialParams.get('status');
    const hasUrlParams = urlComponents !== null || urlVersion !== null || urlTiers !== null || urlStatus !== null;

    if (hasUrlParams) {
      if (urlComponents) {
        const comps = urlComponents.split(',').filter(Boolean);
        setSelectedComponentsState(new Set(comps));
        setPreference('dashboardComponents', comps);
      }
      if (urlVersion && urlVersion !== 'all') {
        setVersionFilterState(urlVersion);
        setPreference('dashboardVersion', urlVersion);
      }
      if (urlTiers) setSelectedTiersState(new Set(urlTiers.split(',').filter(Boolean)));
      if (urlStatus) setStatusFilterState(urlStatus);
    } else {
      if (preferences.dashboardComponents?.length) setSelectedComponentsState(new Set(preferences.dashboardComponents));
      if (preferences.dashboardVersion) setVersionFilterState(preferences.dashboardVersion);
    }
  }, [prefsLoaded, preferences.dashboardComponents, preferences.dashboardVersion, setPreference]);

  const filtersRef = useRef({ components: selectedComponents, version: versionFilter, tiers: selectedTiers, status: statusFilter });
  useEffect(() => {
    filtersRef.current = { components: selectedComponents, version: versionFilter, tiers: selectedTiers, status: statusFilter };
  });

  const syncUrl = () => {
    const { components, version, tiers, status } = filtersRef.current;
    const params = new URLSearchParams();
    if (components.size > 0) params.set('components', [...components].join(','));
    if (version !== 'all') params.set('version', version);
    if (tiers.size > 0) params.set('tiers', [...tiers].join(','));
    if (status) params.set('status', status);
    const queryString = params.toString();
    window.history.replaceState(null, '', queryString ? `/?${queryString}` : '/');
  };

  const setSelectedComponents = (value: Set<string>) => { setSelectedComponentsState(value); setPreference('dashboardComponents', [...value]); filtersRef.current.components = value; syncUrl(); };
  const setVersionFilter = (value: string) => { setVersionFilterState(value); setPreference('dashboardVersion', value); filtersRef.current.version = value; syncUrl(); };
  const setSelectedTiers = (value: Set<string>) => { setSelectedTiersState(value); filtersRef.current.tiers = value; syncUrl(); };
  const setStatusFilter = (value: string | null) => { setStatusFilterState(value); filtersRef.current.status = value; syncUrl(); };

  const availableComponents = useMemo(() => report?.components ?? [], [report]);

  const componentFilteredGroups = useMemo(() => {
    if (!report) return [];
    if (selectedComponents.size === 0) return report.groups;
    return report.groups.filter((group) => selectedComponents.has(group.component ?? ''));
  }, [report, selectedComponents]);

  const versions = useMemo(() => {
    if (!report) return [];
    const set = new Set(componentFilteredGroups.map((group) => group.cnvVersion));
    return ['all', ...Array.from(set).sort()];
  }, [report, componentFilteredGroups]);

  const availableTiers = useMemo(() => {
    if (!report) return [];
    return [...new Set(componentFilteredGroups.map((group) => group.tier))].sort();
  }, [report, componentFilteredGroups]);

  const filteredGroups = useMemo(() => {
    let groups = componentFilteredGroups;
    if (selectedTiers.size > 0) groups = groups.filter((group) => selectedTiers.has(group.tier));
    if (versionFilter !== 'all') groups = groups.filter((group) => group.cnvVersion === versionFilter);
    if (statusFilter) groups = groups.filter((group) => group.latestLaunch.status === statusFilter);
    return groups;
  }, [componentFilteredGroups, selectedTiers, versionFilter, statusFilter]);

  const scopedStats = useMemo(() => {
    const allLaunches = filteredGroups.flatMap((group) => group.launches);
    return {
      total: allLaunches.length,
      passed: allLaunches.filter((launch) => launch.status === 'PASSED').length,
      failed: allLaunches.filter((launch) => launch.status === 'FAILED').length,
      inProgress: allLaunches.filter((launch) => launch.status === 'IN_PROGRESS').length,
      newFailures: report?.newFailures.filter((failure) => {
        if (selectedComponents.size === 0) return true;
        return filteredGroups.some((group) => group.failedItems.some((item) => item.rp_id === failure.rp_id));
      }).length ?? 0,
      untriaged: selectedComponents.size === 0
        ? (report?.untriagedCount ?? 0)
        : filteredGroups.flatMap(g => g.failedItems).filter(i => !i.defect_type || i.defect_type === 'ti001' || i.defect_type?.startsWith('ti_')).length,
    };
  }, [filteredGroups, report, selectedComponents]);

  const scopedHealth: 'red' | 'yellow' | 'green' = scopedStats.failed > 0 ? 'red' : scopedStats.inProgress > 0 ? 'yellow' : 'green';

  return {
    selectedComponents, versionFilter, selectedTiers, statusFilter, tableSearch,
    setSelectedComponents, setVersionFilter, setSelectedTiers, setStatusFilter, setTableSearch,
    availableComponents, versions, availableTiers, filteredGroups, scopedStats, scopedHealth,
  };
}
