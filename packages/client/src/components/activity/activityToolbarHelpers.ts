import { type ActivityEntry } from '@cnv-monitor/shared';

export const ACTION_OPTIONS: { value: string; label: string }[] = [
  { label: 'Classified', value: 'classify_defect' },
  { label: 'Bulk Classified', value: 'bulk_classify_defect' },
  { label: 'Comment', value: 'add_comment' },
  { label: 'Jira Created', value: 'create_jira' },
  { label: 'Jira Linked', value: 'link_jira' },
  { label: 'Acknowledged', value: 'acknowledge' },
];

export type LocalFilters = { action?: string; user?: string; search?: string };

const escapeCsvField = (value: string | number | null | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportActivityCsv = (entries: ActivityEntry[]): void => {
  if (!entries.length) {
    return;
  }
  const header = 'Time,Action,Component,Test,Old Value,New Value,By\n';
  const rows = entries
    .map(entry =>
      [
        new Date(entry.performed_at).toISOString(),
        entry.action,
        entry.component ?? '',
        entry.test_name ?? '',
        entry.old_value ?? '',
        entry.new_value ?? '',
        entry.performed_by ?? '',
      ]
        .map(escapeCsvField)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `activity-${new Date().toISOString().split('T')[0]}.csv`;
  downloadLink.click();
  URL.revokeObjectURL(url);
};
