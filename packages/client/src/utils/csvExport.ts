const escapeCsvField = (value: string | number | null | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportCsv = (
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void => {
  const header = `${headers.map(escapeCsvField).join(',')}\n`;
  const body = rows.map(row => row.map(escapeCsvField).join(',')).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
