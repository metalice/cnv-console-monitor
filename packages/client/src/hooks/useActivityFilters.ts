import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ActivityFilters } from '../api/activity';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { useDate } from '../context/DateContext';

type LocalFilters = {
  action?: string;
  user?: string;
  search?: string;
};

const URL_KEYS: (keyof LocalFilters)[] = ['action', 'user', 'search'];

export const useActivityFilters = () => {
  const { since, until } = useDate();
  const { selectedComponent } = useComponentFilter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [localFilters, setLocalFiltersRaw] = useState<LocalFilters>(() => {
    const initial: LocalFilters = {};
    for (const key of URL_KEYS) {
      const val = searchParams.get(key);
      if (val) {
        initial[key] = val;
      }
    }
    return initial;
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;
    for (const key of URL_KEYS) {
      const val = localFilters[key];
      if (val) {
        if (params.get(key) !== val) {
          params.set(key, val);
          changed = true;
        }
      } else if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [localFilters, searchParams, setSearchParams]);

  const setLocalFilters = useCallback(
    (update: LocalFilters | ((prev: LocalFilters) => LocalFilters)) => {
      setLocalFiltersRaw(update);
    },
    [],
  );

  const component = selectedComponent || undefined;

  const tableFilters: ActivityFilters = useMemo(
    () => ({
      component,
      ...localFilters,
    }),
    [component, localFilters],
  );

  const statsFilters: ActivityFilters = useMemo(
    () => ({
      component,
      since: new Date(since).toISOString(),
      until: new Date(until).toISOString(),
    }),
    [since, until, component],
  );

  const clearAll = useCallback(() => {
    setLocalFiltersRaw({});
  }, []);

  const hasActiveLocalFilters = Boolean(
    localFilters.action || localFilters.user || localFilters.search,
  );

  return {
    clearAll,
    hasActiveLocalFilters,
    localFilters,
    setLocalFilters,
    statsFilters,
    tableFilters,
  };
};
