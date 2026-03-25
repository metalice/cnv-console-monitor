import { useCallback, useMemo, useRef, useState } from 'react';

import { usePreferences } from '../context/PreferencesContext';

export type ColumnDef = {
  id: string;
  title: string;
  isDefault?: boolean;
};

export const useColumnManagement = (tableId: string, allColumns: ColumnDef[]) => {
  const { loaded, preferences, setPreference } = usePreferences();

  const defaultIds = useMemo(
    () => allColumns.filter(column => column.isDefault !== false).map(column => column.id),
    [allColumns],
  );

  const initializedRef = useRef(false);
  const initialIds = useMemo(() => {
    if (initializedRef.current || !loaded) {
      return defaultIds;
    }
    initializedRef.current = true;
    const saved = preferences.tableColumns?.[tableId];
    if (saved?.length) {
      return saved.filter((id: string) => allColumns.some(column => column.id === id));
    }
    return defaultIds;
  }, [loaded, defaultIds, tableId, allColumns, preferences.tableColumns]);

  const [visibleIds, setVisibleIds] = useState(initialIds);

  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const persist = useCallback(
    (ids: string[]) => {
      const current = prefsRef.current.tableColumns ?? {};
      setPreference('tableColumns', { ...current, [tableId]: ids });
    },
    [setPreference, tableId],
  );

  const isColumnVisible = useCallback((id: string) => visibleIds.includes(id), [visibleIds]);

  const toggleColumn = useCallback(
    (id: string) => {
      setVisibleIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        if (next.length === 0) {
          return prev;
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setColumns = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }
      setVisibleIds(ids);
      persist(ids);
    },
    [persist],
  );

  const resetColumns = useCallback(() => {
    setVisibleIds(defaultIds);
    persist(defaultIds);
  }, [defaultIds, persist]);

  const visibleColumns = useMemo(
    () => allColumns.filter(column => visibleIds.includes(column.id)),
    [allColumns, visibleIds],
  );

  return {
    allColumns,
    isColumnVisible,
    resetColumns,
    setColumns,
    toggleColumn,
    visibleColumns,
    visibleIds,
  };
};
