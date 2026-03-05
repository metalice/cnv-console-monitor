import { useState, useMemo, useCallback } from 'react';
import type { SortByDirection } from '@patternfly/react-table';

type SortConfig = {
  index: number;
  direction: SortByDirection;
};

type ColumnAccessor<T> = (item: T) => string | number | null | undefined;

export function useTableSort<T>(
  items: T[],
  accessors: Record<number, ColumnAccessor<T>>,
  defaultSort?: SortConfig,
) {
  const [sortBy, setSortBy] = useState<SortConfig>(defaultSort ?? { index: 0, direction: 'asc' });

  const onSort = useCallback((_event: React.MouseEvent, index: number, direction: SortByDirection) => {
    setSortBy({ index, direction });
  }, []);

  const sorted = useMemo(() => {
    const accessor = accessors[sortBy.index];
    if (!accessor) return items;

    return [...items].sort((a, b) => {
      const valA = accessor(a);
      const valB = accessor(b);

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      let cmp: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return sortBy.direction === 'desc' ? -cmp : cmp;
    });
  }, [items, accessors, sortBy]);

  const getSortParams = (columnIndex: number) => ({
    sortBy: { index: sortBy.index, direction: sortBy.direction, defaultDirection: 'asc' as const },
    onSort,
    columnIndex,
  });

  return { sorted, sortBy, getSortParams };
}
