export const passRateColor = (rate: number): string => {
  if (rate >= 95) {
    return 'var(--pf-t--global--color--status--success--default)';
  }
  if (rate >= 80) {
    return 'var(--pf-t--global--color--status--warning--default)';
  }
  return 'var(--pf-t--global--color--status--danger--default)';
};

export const passRateLabelColor = (rate: number): 'green' | 'yellow' | 'red' => {
  if (rate >= 95) {
    return 'green';
  }
  if (rate >= 80) {
    return 'yellow';
  }
  return 'red';
};
