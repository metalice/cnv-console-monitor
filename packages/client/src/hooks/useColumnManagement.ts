import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';

export type ColumnDef = {
  id: string;
  title: string;
  isDefault?: boolean;
};

export const useColumnManagement = (tableId: string, allColumns: ColumnDef[]) => {
  const { preferences, loaded, setPreference } = usePreferences();

  const defaultIds = useMemo(
    () => allColumns.filter(c => c.isDefault !== false).map(c => c.id),
    [allColumns],
  );

  const [visibleIds, setVisibleIds] = useState<string[]>(defaultIds);

  useEffect(() => {
    if (loaded) {
      const saved = preferences.tableColumns?.[tableId];
      if (saved?.length) {
        setVisibleIds(saved.filter(id => allColumns.some(c => c.id === id)));
      }
    }
  }, [loaded, preferences.tableColumns, tableId, allColumns]);

  const persist = useCallback((ids: string[]) => {
    const current = preferences.tableColumns ?? {};
    setPreference('tableColumns', { ...current, [tableId]: ids });
  }, [preferences.tableColumns, setPreference, tableId]);

  const isColumnVisible = useCallback((id: string) => visibleIds.includes(id), [visibleIds]);

  const toggleColumn = useCallback((id: string) => {
    setVisibleIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      if (next.length === 0) return prev;
      persist(next);
      return next;
    });
  }, [persist]);

  const setColumns = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setVisibleIds(ids);
    persist(ids);
  }, [persist]);

  const resetColumns = useCallback(() => {
    setVisibleIds(defaultIds);
    persist(defaultIds);
  }, [defaultIds, persist]);

  const visibleColumns = useMemo(
    () => allColumns.filter(c => visibleIds.includes(c.id)),
    [allColumns, visibleIds],
  );

  return { allColumns, visibleColumns, visibleIds, isColumnVisible, toggleColumn, setColumns, resetColumns };
}
