import { type ColumnDef } from '../../hooks/useColumnManagement';

export type FlakyRow = {
  name: string;
  unique_id: string;
  flip_count: number;
  total_runs: number;
  flipRate: number;
};

export const FLAKY_COLUMNS: ColumnDef[] = [
  { id: 'testName', title: 'Test Name' },
  { id: 'flips', title: 'Flips' },
  { id: 'totalRuns', title: 'Total Runs' },
  { id: 'flipRate', title: 'Flip Rate' },
];

export const SORT_ACCESSORS: Record<number, (r: FlakyRow) => string | number | null> = {
  0: row => row.name.split('.').pop() || row.name,
  1: row => row.flip_count,
  2: row => row.total_runs,
  3: row => row.flipRate,
};
