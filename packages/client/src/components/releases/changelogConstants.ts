export const CATEGORY_LABELS: Record<
  string,
  { label: string; color: 'green' | 'blue' | 'purple' | 'orange' | 'grey' }
> = {
  bugFixes: { color: 'red' as 'orange', label: 'Bug Fixes' },
  documentation: { color: 'grey', label: 'Documentation' },
  features: { color: 'green', label: 'Features' },
  improvements: { color: 'blue', label: 'Improvements' },
  infrastructure: { color: 'purple', label: 'Infrastructure' },
};

export const CATEGORY_KEYS = [
  'features',
  'bugFixes',
  'improvements',
  'infrastructure',
  'documentation',
] as const;

export const isVersionReleased = (
  versionName: string,
  milestones: { name: string; date: string; isPast: boolean }[],
): boolean => {
  const ver = /(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/.exec(versionName)?.[1];
  if (!ver) {
    return false;
  }
  return milestones.some(milestone => {
    const mVer = /(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/.exec(milestone.name)?.[1];
    return mVer === ver && milestone.isPast;
  });
};
