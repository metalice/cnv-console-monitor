import { useCallback, useMemo, useState } from 'react';

import { SortByDirection } from '@patternfly/react-table';

type SortConfig = {
  index: number;
  direction: SortByDirection;
};

type ColumnAccessor<T> = (item: T) => string | number | null | undefined;

export const useTableSort = <T>(
  items: T[],
  accessors: Record<number, ColumnAccessor<T>>,
  defaultSort?: SortConfig,
) => {
  const [sortBy, setSortBy] = useState(defaultSort ?? { direction: SortByDirection.asc, index: 0 });

  const onSort = useCallback(
    (_event: React.MouseEvent, index: number, direction: SortByDirection) => {
      setSortBy({ direction, index });
    },
    [],
  );

  const sorted = useMemo(() => {
    const accessor = accessors[sortBy.index];

    return [...items].sort((a, b) => {
      const valA = accessor(a);
      const valB = accessor(b);

      if (valA == null && valB == null) {
        return 0;
      }
      if (valA == null) {
        return 1;
      }
      if (valB == null) {
        return -1;
      }

      let cmp: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return sortBy.direction === SortByDirection.desc ? -cmp : cmp;
    });
  }, [items, accessors, sortBy]);

  const getSortParams = (columnIndex: number) => ({
    columnIndex,
    onSort,
    sortBy: {
      defaultDirection: SortByDirection.asc,
      direction: sortBy.direction,
      index: sortBy.index,
    },
  });

  return { getSortParams, sortBy, sorted };
};
