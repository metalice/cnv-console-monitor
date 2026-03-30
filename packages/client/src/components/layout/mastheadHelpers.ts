export const formatTimeAgo = (epochMs: number): string => {
  const diffMs = Date.now() - epochMs;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
};

export const formatTimeUntil = (epochMs: number): string => {
  const diffMs = epochMs - Date.now();
  if (diffMs <= 0) {
    return 'soon';
  }
  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) {
    return `in ${mins}m`;
  }
  return `in ${Math.floor(mins / 60)}h`;
};
