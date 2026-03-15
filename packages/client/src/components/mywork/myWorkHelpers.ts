export const formatAction = (action: string): string =>
  action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const actionColor = (action: string): 'purple' | 'blue' | 'red' | 'orange' | 'green' | 'grey' => {
  switch (action) {
    case 'classify_defect':
    case 'bulk_classify_defect': return 'purple';
    case 'add_comment': return 'blue';
    case 'create_jira': return 'red';
    case 'link_jira': return 'orange';
    case 'acknowledge': return 'green';
    default: return 'grey';
  }
};

export const shortTestName = (name: string | null): string => {
  if (!name) return '—';
  return name.split('.').pop() || name;
};
