import type { ColumnDef } from '../../hooks/useColumnManagement';
import type { AggregatedItem } from '../../utils/aggregation';

export const LAUNCH_COLUMNS: ColumnDef[] = [
  { id: 'testName', title: 'Test Name' },
  { id: 'status', title: 'Status' },
  { id: 'error', title: 'Error' },
  { id: 'polarion', title: 'Polarion' },
  { id: 'defect', title: 'AI Prediction' },
  { id: 'jira', title: 'Jira' },
  { id: 'actions', title: 'Actions' },
];

type Accessor = (item: AggregatedItem) => string | number | null | undefined;

export const SINGLE_ACCESSORS: Record<number, Accessor> = {
  1: item => item.representative.name.split('.').pop() || item.representative.name,
  2: item => item.representative.status,
  3: item => item.representative.error_message,
  4: item => item.representative.polarion_id,
  5: item => item.representative.ai_prediction,
  6: item => item.representative.jira_key,
};

export const GROUP_ACCESSORS: Record<number, Accessor> = {
  1: item => item.representative.name.split('.').pop() || item.representative.name,
  2: item => item.occurrences,
  3: item => item.representative.status,
  4: item => item.representative.error_message,
  5: item => item.representative.polarion_id,
  6: item => item.representative.ai_prediction,
  7: item => item.representative.jira_key,
};
