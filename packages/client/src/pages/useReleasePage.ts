import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

import { fetchChecklist, fetchReleases } from '../api/releases';
import { useComponentFilter } from '../context/ComponentFilterContext';

type ViewMode = 'gantt' | 'calendar' | 'table';

const STALE_RELEASES_MS = 5 * 60 * 1000;
const STALE_CHECKLIST_MS = 60 * 1000;

export const useReleasePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const viewParam = searchParams.get('view');
    return viewParam === 'gantt' || viewParam === 'calendar' || viewParam === 'table'
      ? viewParam
      : 'gantt';
  });
  const [selectedVersion, setSelectedVersionRaw] = useState<string | null>(() =>
    searchParams.get('version'),
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (viewMode !== 'gantt') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }
    if (selectedVersion) {
      params.set('version', selectedVersion);
    } else {
      params.delete('version');
    }
    setSearchParams(params, { replace: true });
  }, [viewMode, selectedVersion, searchParams, setSearchParams]);

  const toggleVersion = (shortname: string) =>
    setSelectedVersionRaw(prev => (prev === shortname ? null : shortname));

  useEffect(() => {
    document.title = 'Releases | CNV Console Monitor';
  }, []);

  const { data: releases, isLoading: relLoading } = useQuery({
    queryFn: fetchReleases,
    queryKey: ['releases'],
    staleTime: STALE_RELEASES_MS,
  });

  const { selectedComponent: checklistComponent } = useComponentFilter();
  const [checklistStatus, setChecklistStatus] = useState<'open' | 'all'>('open');

  const checklistVersion = useMemo(
    () => (selectedVersion ? selectedVersion.replace('cnv-', '') : undefined),
    [selectedVersion],
  );

  const {
    data: checklist,
    error: clError,
    isFetching: clFetching,
    isLoading: clLoading,
  } = useQuery({
    queryFn: () => fetchChecklist(checklistComponent, checklistStatus, checklistVersion),
    queryKey: ['checklist', checklistComponent, checklistStatus, checklistVersion],
    retry: 1,
    staleTime: STALE_CHECKLIST_MS,
  });

  const selectedRelease = useMemo(() => {
    if (!selectedVersion || !releases) {
      return null;
    }
    return releases.find(release => release.shortname === selectedVersion) ?? null;
  }, [selectedVersion, releases]);

  return {
    checklist,
    checklistStatus,
    clError,
    clFetching,
    clLoading,
    releases,
    relLoading,
    selectedRelease,
    selectedVersion,
    setChecklistStatus,
    setSelectedVersionRaw,
    setViewMode,
    toggleVersion,
    viewMode,
  };
};
