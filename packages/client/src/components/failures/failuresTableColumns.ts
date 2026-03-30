import { type ColumnDef } from '../../hooks/useColumnManagement';
import { type AggregatedItem } from '../../utils/aggregation';

export const COLUMNS: ColumnDef[] = [
  { id: 'select', title: 'Select' },
  { id: 'testName', title: 'Test Name' },
  { id: 'occurrences', title: 'Occurrences' },
  { id: 'status', title: 'Status' },
  { id: 'error', title: 'Error' },
  { id: 'polarion', title: 'Polarion' },
  { id: 'aiPrediction', title: 'AI Prediction' },
  { id: 'jira', title: 'Jira' },
  { id: 'actions', title: 'Actions' },
];

export const SORT_ACCESSORS: Record<
  number,
  (item: AggregatedItem) => string | number | null | undefined
> = {
  1: item => item.representative.name.split('.').pop() || item.representative.name,
  2: item => item.occurrences,
  3: item => item.representative.status,
  4: item => item.representative.error_message,
  5: item => item.representative.polarion_id,
  6: item => item.representative.ai_prediction,
  7: item => item.representative.jira_key,
};
