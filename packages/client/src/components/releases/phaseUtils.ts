const PHASE_COLORS: Record<
  string,
  'blue' | 'green' | 'grey' | 'orange' | 'purple' | 'red' | 'teal'
> = {
  'Blockers Only': 'red',
  'Code Freeze': 'purple',
  Development: 'blue',
  'Feature Freeze': 'orange',
  GA: 'green',
  Maintenance: 'teal',
  Planning: 'grey',
};

export const phaseColor = (phase: string) => {
  if (phase === 'GA') {
    return 'green' as const;
  }
  return PHASE_COLORS[phase] ?? 'grey';
};
