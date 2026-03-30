import { useEffect, useMemo, useState } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import { buildDueDateMap, buildSortAccessors } from './checklistHelpers';

export const useChecklistFilters = (
  checklist: ChecklistTask[] | undefined,
  releases: ReleaseInfo[] | undefined,
  activeVersion: string | null | undefined,
) => {
  const [search, setSearch] = useState('');
  const [selectedVersions, setSelectedVersions] = useState(new Set<string>());
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!activeVersion || !checklist) {
      setSelectedVersions(new Set());
      return;
    }
    const ver = activeVersion.replace('cnv-', '');
    const matching = checklist
      .flatMap(task => task.fixVersions)
      .filter(fixVer => fixVer.toLowerCase().includes(ver.toLowerCase()));
    setSelectedVersions(new Set(matching));
  }, [activeVersion, checklist]);

  const availableVersions = useMemo(() => {
    if (!checklist) return [];
    const set = new Set<string>();
    for (const task of checklist) {
      const version = task.fixVersions[0];
      if (version) set.add(version);
    }
    return [...set].sort((verA, verB) => verB.localeCompare(verA, undefined, { numeric: true }));
  }, [checklist]);

  const toggleVersion = (ver: string) => {
    setSelectedVersions(prev => {
      const next = new Set(prev);
      if (next.has(ver)) next.delete(ver);
      else next.add(ver);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!checklist) return [];
    let result = checklist;
    if (selectedVersions.size > 0) {
      result = result.filter(task =>
        task.fixVersions.some(version => selectedVersions.has(version)),
      );
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        task =>
          task.key.toLowerCase().includes(term) ||
          task.summary.toLowerCase().includes(term) ||
          task.assignee?.toLowerCase().includes(term) ||
          task.fixVersions.some(version => version.toLowerCase().includes(term)),
      );
    }
    setPage(1);
    return result;
  }, [checklist, selectedVersions, search]);

  const dueDateMap = useMemo(() => buildDueDateMap(releases), [releases]);
  const sortAccessors = useMemo(() => buildSortAccessors(dueDateMap), [dueDateMap]);

  return {
    availableVersions,
    dueDateMap,
    filtered,
    page,
    search,
    selectedVersions,
    setPage,
    setSearch,
    sortAccessors,
    toggleVersion,
  };
};
