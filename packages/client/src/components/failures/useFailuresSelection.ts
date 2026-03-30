import React from 'react';

import { type AggregatedItem } from '../../utils/aggregation';

export const useFailuresSelection = (searchFiltered: AggregatedItem[]) => {
  const [selectedIds, setSelectedIds] = React.useState(new Set<number>());

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(searchFiltered.flatMap(group => group.allRpIds)) : new Set());

  const handleSelect = (rpIds: number[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const rpId of rpIds) {
        if (checked) {
          next.add(rpId);
        } else {
          next.delete(rpId);
        }
      }
      return next;
    });
  };

  const isGroupSelected = (rpIds: number[]) => rpIds.every(rpId => selectedIds.has(rpId));

  const allSelected =
    searchFiltered.length > 0 && searchFiltered.every(group => isGroupSelected(group.allRpIds));

  const clearSelection = () => setSelectedIds(new Set());

  return {
    allSelected,
    clearSelection,
    handleSelect,
    handleSelectAll,
    isGroupSelected,
    selectedIds,
  };
};
