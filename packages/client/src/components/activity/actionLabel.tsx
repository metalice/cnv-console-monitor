import type { ReactNode } from 'react';

import { Label } from '@patternfly/react-core';

export const actionLabel = (action: string): ReactNode => {
  switch (action) {
    case 'classify_defect':
      return (
        <Label isCompact color="purple">
          Classified
        </Label>
      );
    case 'bulk_classify_defect':
      return (
        <Label isCompact color="purple">
          Bulk Classified
        </Label>
      );
    case 'add_comment':
      return (
        <Label isCompact color="blue">
          Comment
        </Label>
      );
    case 'create_jira':
      return (
        <Label isCompact color="red">
          Jira Created
        </Label>
      );
    case 'link_jira':
      return (
        <Label isCompact color="orange">
          Jira Linked
        </Label>
      );
    case 'acknowledge':
      return (
        <Label isCompact color="green">
          Acknowledged
        </Label>
      );
    default:
      return <Label isCompact>{action}</Label>;
  }
};
