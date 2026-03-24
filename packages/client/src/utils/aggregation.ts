import type { TestItem } from '@cnv-monitor/shared';

export type AggregatedItem = {
  representative: TestItem;
  allRpIds: number[];
  occurrences: number;
};

export const aggregateTestItems = (items: TestItem[]): AggregatedItem[] => {
  const groups = new Map<string, TestItem[]>();
  const noUniqueId: TestItem[] = [];

  for (const item of items) {
    if (item.unique_id) {
      const existing = groups.get(item.unique_id);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(item.unique_id, [item]);
      }
    } else {
      noUniqueId.push(item);
    }
  }

  const result: AggregatedItem[] = [];

  for (const groupItems of groups.values()) {
    const sorted = [...groupItems].sort((a, b) => (b.start_time ?? 0) - (a.start_time ?? 0));
    result.push({
      allRpIds: sorted.map(item => item.rp_id),
      occurrences: sorted.length,
      representative: sorted[0],
    });
  }

  for (const item of noUniqueId) {
    result.push({ allRpIds: [item.rp_id], occurrences: 1, representative: item });
  }

  return result;
};
