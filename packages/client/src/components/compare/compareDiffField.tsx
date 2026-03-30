import { type ReactNode } from 'react';

import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

export const compareDiffField = (
  valA: string | null,
  valB: string | null,
  label: string,
): ReactNode | null => {
  if (valA === valB) {
    return null;
  }
  return (
    <DescriptionListGroup key={label}>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>
        <span className="app-text-muted app-text-line-through">{valA ?? '—'}</span>
        {' → '}
        <strong>{valB ?? '—'}</strong>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};
